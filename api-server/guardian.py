"""Scoped guardian access, practice summaries, goals, and durable email delivery.

Guardian credentials never enter the normal account/session tables. All reads are
explicit projections: private answers, notes, job applications and email addresses
are deliberately absent from guardian responses.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import threading
from datetime import date, datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from leetcode_sync import synced_accepted_submissions, synced_lifetime_solved_count
from technical_practice import load_technical_questions


GUARDIAN_SCHEMA = """
CREATE TABLE IF NOT EXISTS guardian_access (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT UNIQUE,
  code_value TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  generation INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS guardian_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_user ON guardian_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_expiry ON guardian_sessions (expires_at);
CREATE TABLE IF NOT EXISTS guardian_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count BETWEEN 1 AND 100000),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  reward TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  completion_count INTEGER,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guardian_goals_user ON guardian_goals (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guardian_goals_status ON guardian_goals (status, user_id);
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id TEXT UNIQUE REFERENCES guardian_goals(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('goal_completed', 'reminder')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'disabled', 'retry', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_due ON guardian_notifications (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_user ON guardian_notifications (user_id, created_at);
CREATE TABLE IF NOT EXISTS guardian_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL
);
"""

TRAINER_KINDS = {"mental", "sequence", "pattern"}
KINDS = {"quant", "tech", "coding", "behavioral", *TRAINER_KINDS}
LABELS = {"quant": "量化题", "mental": "心算", "sequence": "数列推理", "pattern": "图形推理",
          "tech": "技术面试题", "coding": "编程题", "behavioral": "行为面试题"}
TRAINER_LABELS_EN = {"mental": "Mental Math", "sequence": "Sequence reasoning", "pattern": "Pattern reasoning"}
COUNTING_NOTE = (
    "仅统计已同步的完成记录：非 LeetCode 题需主动标记「我做完了」，抽题、查看、草稿和面试评分不计数；"
    "Mental Math（心算、数列、图形）每次有已完成题的训练在总数和目标中计 1 次，列表展示该次完成题数；答对和答错均算完成，跳过、超时和未完成不算；"
    "监护列表每次训练仅显示一行，按最后一道完成题的时间归属日期，不显示逐题内容。旧训练仅有汇总时采用原有记录题数。LeetCode 按当前关联账号公开同步的 AC 记录计数，"
    "同一题距离上次计入的 AC 至少 3 小时可再次计数，跨日不重置间隔。可信资料页累计用于补齐缺少日期的历史题数，仅计入累计，不计入今天、活跃天数或目标；导入记录不计入。手动补记单独标注；每日套题汇总不重复计数。"
)


def now_utc():
    return datetime.now(timezone.utc)


def stamp(value=None):
    return (value or now_utc()).astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def timestamp(value):
    try:
        parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return None
        return parsed.astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return None


def wire_time(value):
    parsed = timestamp(value)
    return stamp(parsed) if parsed else None


def obj(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (ValueError, TypeError, RecursionError):
            return {}
    return value if isinstance(value, dict) else {}


def rows(value):
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def clean_text(value, limit=240):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value).strip()[:limit] if isinstance(value, str) else ""


def key(value):
    return clean_text(value, 512)


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def safe_count(value):
    return value if type(value) is int and 0 < value <= 100000 else 0


def student_name(user):
    name = clean_text(obj(user.get("account_json")).get("name"), 80)
    # Existing accounts may use their email as the display name. Do not expose it.
    return name if name and "@" not in name else "QuantGym 学员"


def problem_kind(problem, interview=False):
    category = key(problem.get("category")).lower()
    normalized = re.sub(r"[\s_-]", "", category)
    if normalized in {"sequence", "pattern"}:
        return normalized
    if normalized in {"mental", "mentalmath"} or key(problem.get("source")).lower() == "trainer":
        return "mental"
    if category in {"leetcode", "coding", "programming", "algorithms"}:
        return "coding"
    if category in {"behavioral", "behavioural"}:
        return "behavioral"
    return "tech" if interview else "quant"


def problem_number(problem):
    """Return an explicit source number; never guess from a title or record ID."""
    problem = obj(problem)
    candidates = [obj(problem.get("provenance")).get("originalNumber")]
    candidates.extend(problem.get(field) for field in ("frontendId", "questionFrontendId", "problemNumber", "originalNumber", "questionNumber", "number"))
    for value in candidates:
        if type(value) is int and 0 <= value <= 1_000_000_000:
            return str(value)
        if isinstance(value, str) and value.strip() and len(value.strip()) <= 100 and re.search(r"\d", value) and not re.search(r"[<>\x00-\x1f\x7f]", value):
            return re.sub(r"\s+", " ", value.strip())
    return ""


def is_leetcode_question(record):
    if not isinstance(record, dict):
        return False
    if key(record.get("category")).lower() == "leetcode" or any(re.match(r"leetcode[-:]", key(record.get(field)), re.IGNORECASE) for field in ("id", "problemId")):
        return True
    if any(re.fullmatch(r"leetcode(?:[-_ ](?:cn|com))?", key(record.get(field)), re.IGNORECASE) for field in ("source", "sourceType")):
        return True
    for field in ("url", "sourceUrl", "source_url", "problemUrl"):
        try:
            url = urlparse(key(record.get(field)))
            if url.scheme in {"http", "https"} and (url.hostname or "").lower() in {"leetcode.cn", "www.leetcode.cn", "leetcode.com", "www.leetcode.com"} and url.path.startswith("/problems/"):
                return True
        except ValueError:
            continue
    return False


def counted_practice(practice, zone):
    """Count each trainer session once and LeetCode retries at least 3h apart."""
    result, last_counted, trainers = [], {}, {}
    # Ascending order makes the cooldown anchor the last counted AC, including
    # records before the selected day or goal period. Civil midnight never resets it.
    for item in sorted(practice, key=lambda row: (row["completedAt"], row["id"])):
        if item["kind"] in TRAINER_KINDS:
            identity = (item["kind"], item["_trainerKey"])
            if identity not in trainers:
                trainers[identity] = {
                    "id": f"trainer:{item['kind']}:{digest(item['_trainerKey'])[:20]}",
                    "kind": item["kind"], "title": LABELS[item["kind"]], "titleEn": TRAINER_LABELS_EN[item["kind"]],
                    "count": 1, "completedCount": 0, "completedAt": item["completedAt"], "source": item["source"],
                    "problemNumber": "", "isSummary": True,
                }
            trainers[identity]["completedCount"] += item["count"]
            trainers[identity]["completedAt"] = max(trainers[identity]["completedAt"], item["completedAt"])
            continue
        if item["source"] == "leetcode":
            # These IDs are generated below from validated slugs, never user
            # activity IDs. Neither the connected profile nor raw state escapes.
            slug = item["id"].split(":", 2)[1]
            when = timestamp(item["completedAt"])
            previous = last_counted.get(slug)
            if previous is not None and when - previous < timedelta(hours=3):
                continue
            last_counted[slug] = when
        result.append(item)
    return sorted([*result, *trainers.values()], key=lambda item: (item["completedAt"], item["id"]), reverse=True)


def collect_practice(personal, legacy, problem_states, catalog=None, at=None, leetcode=None, technical_numbers=None):
    """Project recorded practice into deduplicated, minimal display rows.

    Explicit completions take priority over legacy fallbacks. Trainer details
    retain only completion timestamps internally, then collapse into session rows.
    No answers, evaluations, prompts or application data are serialized.
    """
    at = at or now_utc()
    personal, legacy = obj(personal), obj(legacy)
    catalog = catalog or {}
    technical_numbers = technical_numbers or {}
    removed = {key(value) for value in personal.get("removedActivityIds", []) if isinstance(value, str)} if isinstance(personal.get("removedActivityIds"), list) else set()
    events, identities = {}, set()
    problem_times, legacy_ids, daily_questions, trainer_sessions = set(), set(), set(), set()

    def question_number(question):
        explicit = problem_number(question)
        if explicit:
            return explicit
        if key(question.get("source")) in {"question-bank", "library"}:
            identity = key(question.get("sourceProblemId")) or key(question.get("id"))
            return technical_numbers.get(identity, "")
        return ""

    def add(raw, identity=None):
        event_id = key(raw.get("id"))
        when = timestamp(raw.get("completedAt"))
        kind = key(raw.get("kind"))
        count = safe_count(raw.get("count"))
        if (not event_id or event_id in removed or event_id in events or kind not in KINDS
                or not count or when is None or when > at or when.year < 2000):
            return False
        if identity and identity in identities:
            return False
        events[event_id] = {
            "id": event_id, "title": LABELS[kind] if kind in TRAINER_KINDS else clean_text(raw.get("title")) or LABELS[kind],
            "titleEn": TRAINER_LABELS_EN[kind] if kind in TRAINER_KINDS else clean_text(raw.get("titleEn")), "kind": kind, "count": count,
            "completedAt": stamp(when),
            "source": key(raw.get("source")) if key(raw.get("source")) in {"manual", "legacy", "leetcode"} else "automatic",
            "problemNumber": "" if kind in TRAINER_KINDS else problem_number(raw), "isSummary": kind in TRAINER_KINDS,
        }
        if kind in TRAINER_KINDS:
            events[event_id]["_trainerKey"] = key(raw.get("_trainerKey")) or event_id
        if identity:
            identities.add(identity)
        if key(raw.get("problemId")):
            problem_times.add((key(raw["problemId"]), stamp(when)))
        for field in ("legacyId", "sourceId"):
            if key(raw.get(field)):
                legacy_ids.add(key(raw[field]))
        return True

    standalone = {key(session.get("id")): session for session in rows(personal.get("practiceSessions"))}
    daily = {key(session.get("id")): session for session in rows(personal.get("dailySessions"))}

    activities = rows(personal.get("activities"))
    trials = {}
    for trial in rows(personal.get("trials")) + ([personal["activeTrial"]] if isinstance(personal.get("activeTrial"), dict) else []):
        tid = key(trial.get("id"))
        kind = key(obj(trial.get("settings")).get("trainer")) or "math"
        kind = "mental" if kind == "math" else kind
        if not tid or kind not in TRAINER_KINDS:
            continue
        previous = trials.get((kind, tid))
        if previous is None or len(rows(trial.get("questions"))) >= len(rows(previous.get("questions"))):
            trials[(kind, tid)] = trial
    legacy_mental = {key(record.get("id")): record for record in rows(legacy.get("mentalMathRecords"))
                     if key(record.get("id")) and timestamp(record.get("createdAt")) is not None}
    enriched_activities = []
    for activity in activities:
        # Older aliases stored only the correct count, sometimes zero even when
        # the original drill had finished wrong answers. Recover only exact
        # references to that original record; modern trial details still win.
        aid = key(activity.get("id"))
        tid = key(activity.get("trialId")) or (aid[len("mental:"):] if aid.startswith("mental:") else "")
        if (key(activity.get("kind")) == "mental" and ("mental", tid) not in trials
                and (key(activity.get("source")) == "legacy" or key(activity.get("legacyId")) or key(activity.get("sourceId")))):
            refs = [activity.get("legacyId"), activity.get("sourceId"), activity.get("trialId"), re.sub(r"^(?:legacy:)?mental:", "", aid)]
            rid = next((key(ref) for ref in refs if key(ref) in legacy_mental), None)
            if rid:
                record = legacy_mental[rid]
                activity = {**activity, "trialId": rid, "completedAt": record["createdAt"],
                            "count": sum(safe_count(record.get(field)) for field in ("correct", "incorrect"))}
        enriched_activities.append(activity)
    activities = enriched_activities
    removed_trials = {(kind, tid) for kind, tid in trials if f"{kind}:{tid}" in removed}
    for activity in activities:
        aid, kind = key(activity.get("id")), key(activity.get("kind"))
        tid = key(activity.get("trialId")) or (aid[len(kind) + 1:] if kind in TRAINER_KINDS and aid.startswith(kind + ":") else "")
        if tid and kind in TRAINER_KINDS and aid in removed:
            removed_trials.add((kind, tid))
        if aid not in removed:
            legacy_ids.update(key(activity.get(field)) for field in ("legacyId", "sourceId") if key(activity.get(field)))
    for (kind, tid), trial in trials.items():
        trainer_sessions.add((kind, tid))
        if (kind, tid) in removed_trials:
            continue
        if isinstance(trial.get("questions"), list):
            for question in rows(trial["questions"]):
                qid = key(question.get("id"))
                if not qid or key(question.get("outcome")) not in {"correct", "wrong"}:
                    continue
                add({"id": f"trainer-detail:{kind}:{digest(tid + chr(0) + qid)}", "kind": kind, "count": 1,
                     "completedAt": question.get("completedAt"), "_trainerKey": f"trial:{tid}"}, ("trainer-question", kind, tid, qid))
        elif key(trial.get("status")) in {"completed", "aborted"}:
            add({"id": f"{kind}:{tid}", "kind": kind, "count": trial.get("correct"),
                 "completedAt": trial.get("completedAt"), "source": "legacy", "_trainerKey": f"trial:{tid}"}, ("trainer", kind, tid))

    for activity in activities:
        aid, kind = key(activity.get("id")), key(activity.get("kind"))
        classified = problem_kind(activity)
        kind = classified if classified in TRAINER_KINDS else kind
        if not aid or aid in removed or kind not in KINDS:
            continue
        if is_leetcode_question(activity) or key(activity.get("source")) in {"random", "draw", "selection"} or key(activity.get("status")) in {"active", "draft", "drawn", "selected"}:
            continue
        linked_question = {}
        if aid.startswith("practice:"):
            session = standalone.get(aid[len("practice:"):])
            if not session or session.get("status") != "completed" or is_leetcode_question(obj(session.get("question"))):
                continue
            linked_question = obj(session.get("question"))
        tid = key(activity.get("trialId")) or (aid[len(kind) + 1:] if kind in TRAINER_KINDS and aid.startswith(kind + ":") else "")
        if kind in TRAINER_KINDS and tid:
            if (kind, tid) in trainer_sessions or (kind, tid) in removed_trials:
                continue
            identity = ("trainer", kind, tid)
        elif key(activity.get("sessionId")) and key(activity.get("questionId")):
            session = daily.get(key(activity["sessionId"]))
            if session:
                question = next((q for q in rows(session.get("questions")) if key(q.get("id")) == key(activity["questionId"])), {})
                answer = obj(obj(session.get("answers")).get(key(activity["questionId"])))
                if not timestamp(answer.get("completedAt")) or is_leetcode_question(question):
                    continue
                linked_question = question
                if problem_kind(question) in TRAINER_KINDS:
                    kind = problem_kind(question)
            identity = ("daily", key(activity["sessionId"]), key(activity["questionId"]))
        elif key(activity.get("problemId")) and timestamp(activity.get("completedAt")):
            identity = ("problem", key(activity["problemId"]), stamp(timestamp(activity["completedAt"])))
        else:
            identity = ("activity", aid)
        raw = {**activity, "kind": kind, "problemNumber": question_number(linked_question) or problem_number(activity)}
        if kind in TRAINER_KINDS:
            raw["_trainerKey"] = f"trial:{tid}" if tid else f"daily:{key(activity['sessionId'])}" if key(activity.get("sessionId")) else f"activity:{aid}"
        if key(activity.get("problemId")):
            problem = catalog.get(key(activity["problemId"]), {})
            if is_leetcode_question(problem):
                continue
            if problem_kind(problem) in TRAINER_KINDS:
                raw["kind"] = problem_kind(problem)
                raw["_trainerKey"] = f"problem:{key(activity['problemId'])}"
            raw["title"] = raw.get("title") or problem.get("titleZh") or problem.get("titleEn")
            raw["titleEn"] = raw.get("titleEn") or problem.get("titleEn")
            raw["problemNumber"] = question_number(problem) or raw["problemNumber"]
        if add(raw, identity):
            if kind in TRAINER_KINDS and tid:
                trainer_sessions.add((kind, tid))
            if identity[0] == "daily":
                daily_questions.add(identity[1:])

    for index, record in enumerate(rows(legacy.get("mentalMathRecords"))):
        rid = key(record.get("id"))
        if rid and (("mental", rid) in trainer_sessions or ("mental", rid) in removed_trials or rid in legacy_ids):
            continue
        rid = rid or digest(str(record.get("createdAt")) + ":" + str(record.get("correct")))
        # The legacy tools engine closes both correct and incorrect answers;
        # unlike modern arithmetic mistakes, incorrect is not a retry counter.
        # Configured total/skipped cannot prove how many questions were finished.
        completed = sum(safe_count(record.get(field)) for field in ("correct", "incorrect"))
        add({"id": f"legacy:mental:{rid}", "kind": "mental", "count": completed,
             "completedAt": record.get("createdAt"), "source": "legacy", "_trainerKey": f"trial:{rid}"}, ("trainer", "mental", rid))

    for session in rows(personal.get("dailySessions")):
        sid, answers = key(session.get("id")), obj(session.get("answers"))
        for question in rows(session.get("questions")):
            qid = key(question.get("id"))
            if not sid or not qid or (sid, qid) in daily_questions or is_leetcode_question(question):
                continue
            answer = obj(answers.get(qid))
            if not clean_text(answer.get("text"), 1):
                continue
            kind = problem_kind(question) if problem_kind(question) in TRAINER_KINDS else question.get("kind")
            add({"id": f"daily:{sid}:{qid}", "kind": kind, "count": 1,
                 "title": question.get("title"), "titleEn": question.get("titleEn"),
                 "completedAt": answer.get("completedAt"), "problemNumber": question_number(question),
                 "_trainerKey": f"daily:{sid}"}, ("daily", sid, qid))

    # Current standalone technical/coding sessions normally have a canonical
    # practice:<id> activity restored by personal_prep. Older snapshots may not;
    # the same ID makes this fallback and that activity one recorded question.
    for session in rows(personal.get("practiceSessions")):
        sid, kind = key(session.get("id")), key(session.get("kind"))
        if not sid or kind not in {"tech", "coding"} or session.get("status") != "completed" or not clean_text(session.get("text"), 1):
            continue
        question = obj(session.get("question"))
        if is_leetcode_question(question):
            continue
        kind = problem_kind(question) if problem_kind(question) in TRAINER_KINDS else kind
        add({"id": f"practice:{sid}", "kind": kind, "count": 1,
             "title": question.get("title"), "titleEn": question.get("titleEn"),
             "completedAt": session.get("completedAt"), "problemNumber": question_number(question),
             "_trainerKey": f"practice:{sid}"}, ("activity", f"practice:{sid}"))

    for record in rows(problem_states) + rows(legacy.get("problemStates")):
        pid, when = key(record.get("problemId")), timestamp(record.get("completedAt"))
        if record.get("completed") is not True or not pid or when is None or pid in legacy_ids or (pid, stamp(when)) in problem_times:
            continue
        problem = catalog.get(pid, {})
        if is_leetcode_question(problem) or is_leetcode_question(record):
            continue
        kind = problem_kind(record) if problem_kind(record) in TRAINER_KINDS else problem_kind(problem)
        add({"id": f"legacy:problem:{pid}", "kind": kind, "count": 1,
             "completedAt": record.get("completedAt"), "problemId": pid,
             "title": problem.get("titleZh") or problem.get("titleEn"), "titleEn": problem.get("titleEn"),
             "source": "legacy", "problemNumber": question_number(problem) or problem_number(record),
             "_trainerKey": f"problem:{pid}"}, ("problem", pid, stamp(when)))

    for index, entry in enumerate(rows(legacy.get("entries"))):
        pid, when, eid = key(entry.get("problemId")), timestamp(entry.get("completedAt")), key(entry.get("id"))
        if not pid or when is None or entry.get("completed") is not True or eid in legacy_ids or (pid, stamp(when)) in problem_times:
            continue
        problem = catalog.get(pid, {})
        if is_leetcode_question(problem) or is_leetcode_question(entry):
            continue
        kind = problem_kind(entry) if problem_kind(entry) in TRAINER_KINDS else problem_kind(problem, True)
        add({"id": f"legacy:interview:{eid or str(index)}", "kind": kind, "count": 1,
             "completedAt": entry.get("completedAt"), "problemId": pid,
             "title": problem.get("titleZh") or problem.get("titleEn"), "titleEn": problem.get("titleEn"),
             "source": "legacy", "problemNumber": question_number(problem) or problem_number(entry),
             "_trainerKey": f"problem:{pid}"}, ("problem", pid, stamp(when)))
    for submission in synced_accepted_submissions(obj(leetcode)):
        add({"id": f"leetcode:{submission['problemSlug']}:{submission['id']}", "kind": "coding", "count": 1,
             "title": submission.get("title") or submission["problemSlug"], "titleEn": submission.get("titleEn"),
             "completedAt": submission["submittedAt"], "source": "leetcode", "problemNumber": submission.get("frontendId")}, ("leetcode", submission["id"]))
    return sorted(events.values(), key=lambda event: (event["completedAt"], event["id"]), reverse=True)


class GuardianService:
    def __init__(self, db, error_class, send_email, email_configured):
        self.db, self.error = db, error_class
        self.send_email, self.email_configured = send_email, email_configured
        self.session_hours = max(1, min(24, int(os.environ.get("QUANTGYM_GUARDIAN_SESSION_HOURS", "8"))))
        self.poll_seconds = max(0.1, float(os.environ.get("QUANTGYM_GUARDIAN_POLL_SECONDS", "15")))
        self.reminder_cooldown = max(60, int(os.environ.get("QUANTGYM_GUARDIAN_REMINDER_COOLDOWN_SECONDS", "3600")))
        self.reminder_daily_max = max(1, min(10, int(os.environ.get("QUANTGYM_GUARDIAN_REMINDER_DAILY_MAX", "3"))))
        self._wake, self._stop = threading.Event(), threading.Event()
        self._worker = None

    def start(self):
        from privacy_policy import PRIVATE_WORKSPACES
        if PRIVATE_WORKSPACES:
            return
        if self._worker is None:
            self._worker = threading.Thread(target=self._run, name="guardian-mail-worker", daemon=True)
            self._worker.start()

    def wake(self):
        self._wake.set()

    def _run(self):
        while not self._stop.is_set():
            try:
                self.evaluate_all()
                self.deliver_pending()
            except Exception as error:
                # Error classes suffice operationally; message strings can contain PII.
                print(f"[QuantGym guardian worker] {type(error).__name__}; retrying", flush=True)
            self._wake.wait(self.poll_seconds)
            self._wake.clear()

    def zone(self, value):
        if not isinstance(value, str) or not value or len(value) > 100:
            raise self.error(400, "A valid IANA timeZone is required")
        try:
            return ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise self.error(400, "A valid IANA timeZone is required")

    def require_fields(self, payload, allowed, required=()):
        if not isinstance(payload, dict) or set(payload) - set(allowed) or set(required) - set(payload):
            raise self.error(400, "Unexpected or missing request fields")

    def ensure_access(self, conn, user_id):
        code, when = "QG-" + secrets.token_urlsafe(24), stamp()
        conn.execute(
            """INSERT INTO guardian_access (user_id, code_hash, code_value, enabled, generation, created_at, updated_at)
               VALUES (?, ?, ?, 1, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING""",
            (user_id, digest(code), code, when, when),
        )
        return conn.execute("SELECT * FROM guardian_access WHERE user_id = ?", (user_id,)).fetchone()

    def lock_access(self, conn, user_id):
        # A write lock serializes rotation, goal changes and reminder cooldowns in
        # SQLite and Postgres, including across multiple API worker processes.
        conn.execute("UPDATE guardian_access SET generation = generation WHERE user_id = ?", (user_id,))

    def require_guardian(self, conn, token, *, lock=True):
        if not isinstance(token, str) or not re.fullmatch(r"qg_guardian_[A-Za-z0-9_-]{43}", token):
            raise self.error(401, "Invalid or expired guardian session")
        row = conn.execute(
            """SELECT s.user_id FROM guardian_sessions s JOIN guardian_access a ON a.user_id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ? AND a.enabled = 1 AND s.generation = a.generation""",
            (digest(token), stamp()),
        ).fetchone()
        if row is None:
            raise self.error(401, "Invalid or expired guardian session")
        if lock:
            self.lock_access(conn, row["user_id"])
        # Check again after obtaining the lock: a concurrent rotation may have
        # completed while this request waited.
        user = conn.execute(
            """SELECT u.* FROM users u JOIN guardian_sessions s ON s.user_id = u.id
               JOIN guardian_access a ON a.user_id = u.id
               WHERE s.token_hash = ? AND s.expires_at > ? AND a.enabled = 1 AND s.generation = a.generation""",
            (digest(token), stamp()),
        ).fetchone()
        if user is None:
            raise self.error(401, "Invalid or expired guardian session")
        return dict(user)

    def check_exchange_rate(self, ip):
        # Persistent fixed window; code failures cannot reset the limit by restarting.
        when = now_utc()
        bucket = "exchange:" + digest(str(ip or "unknown"))
        with self.db.connect() as conn:
            conn.execute(
                """INSERT INTO guardian_rate_limits (bucket_key, window_started_at, request_count)
                   VALUES (?, ?, 1) ON CONFLICT(bucket_key) DO UPDATE SET
                   request_count = CASE WHEN guardian_rate_limits.window_started_at <= ? THEN 1 ELSE guardian_rate_limits.request_count + 1 END,
                   window_started_at = CASE WHEN guardian_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE guardian_rate_limits.window_started_at END""",
                (bucket, stamp(when), stamp(when - timedelta(minutes=15)), stamp(when - timedelta(minutes=15))),
            )
            hits = conn.execute("SELECT request_count FROM guardian_rate_limits WHERE bucket_key = ?", (bucket,)).fetchone()[0]
            conn.execute("DELETE FROM guardian_rate_limits WHERE window_started_at < ?", (stamp(when - timedelta(days=1)),))
        if hits > 20:
            raise self.error(429, "Too many guardian code attempts. Try again in 15 minutes.")

    def exchange(self, payload, ip):
        self.check_exchange_rate(ip)
        self.require_fields(payload, {"code"}, {"code"})
        code = payload.get("code")
        if not isinstance(code, str) or not re.fullmatch(r"QG-[A-Za-z0-9_-]{32}", code.strip()):
            raise self.error(401, "Invalid guardian code")
        with self.db.connect() as conn:
            access = conn.execute("SELECT * FROM guardian_access WHERE code_hash = ? AND enabled = 1", (digest(code.strip()),)).fetchone()
            if access is None:
                raise self.error(401, "Invalid guardian code")
            self.lock_access(conn, access["user_id"])
            access = conn.execute("SELECT * FROM guardian_access WHERE code_hash = ? AND enabled = 1", (digest(code.strip()),)).fetchone()
            if access is None:
                raise self.error(401, "Invalid guardian code")
            user = dict(conn.execute("SELECT * FROM users WHERE id = ?", (access["user_id"],)).fetchone())
            token, when = "qg_guardian_" + secrets.token_urlsafe(32), now_utc()
            expires_at = stamp(when + timedelta(hours=self.session_hours))
            conn.execute("DELETE FROM guardian_sessions WHERE expires_at <= ?", (stamp(when),))
            count = conn.execute("SELECT COUNT(*) FROM guardian_sessions WHERE user_id = ?", (user["id"],)).fetchone()[0]
            if count >= 20:
                conn.execute("DELETE FROM guardian_sessions WHERE token_hash IN (SELECT token_hash FROM guardian_sessions WHERE user_id = ? ORDER BY created_at LIMIT 1)", (user["id"],))
            conn.execute("INSERT INTO guardian_sessions (token_hash, user_id, generation, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
                         (digest(token), user["id"], access["generation"], stamp(when), expires_at))
        return {"token": token, "expiresAt": expires_at, "student": {"name": student_name(user)}}

    def practice(self, conn, user_id, *, summary_metadata=None):
        personal_row = conn.execute("SELECT data_json, updated_at FROM user_personal_prep WHERE user_id = ?", (user_id,)).fetchone()
        leetcode_row = conn.execute("SELECT data_json, updated_at FROM user_leetcode WHERE user_id = ?", (user_id,)).fetchone()
        legacy_row = conn.execute("SELECT state_json, updated_at FROM user_states WHERE user_id = ?", (user_id,)).fetchone()
        state_rows = conn.execute("SELECT state_json, updated_at FROM user_problem_states WHERE user_id = ?", (user_id,)).fetchall()
        personal = obj(personal_row["data_json"]) if personal_row else {}
        legacy = obj(legacy_row["state_json"]) if legacy_row else {}
        states = [obj(row["state_json"]) for row in state_rows]
        pids = {key(row.get("problemId")) for row in states + rows(legacy.get("problemStates")) + rows(legacy.get("entries")) + rows(personal.get("activities"))} - {""}
        catalog = {key(p.get("id")): p for p in rows(legacy.get("problems"))}
        pids = sorted(pids)
        for offset in range(0, len(pids), 200):
            batch = pids[offset:offset + 200]
            found = conn.execute("SELECT id, title_en, title_zh, category, source, source_url, problem_json FROM problems WHERE id IN (" + ",".join("?" for _ in batch) + ") AND (visibility = 'public' OR owner_user_id = ?)", (*batch, user_id)).fetchall()
            catalog.update({p["id"]: {"id": p["id"], "titleEn": p["title_en"], "titleZh": p["title_zh"], "category": p["category"],
                                     "source": p["source"], "sourceUrl": p["source_url"], "sourceType": obj(p["problem_json"]).get("sourceType"),
                                     "problemNumber": problem_number(obj(p["problem_json"]))} for p in found})
        updated = [timestamp(row["updated_at"]) for row in ([personal_row, legacy_row, leetcode_row] + list(state_rows)) if row is not None]
        updated = [value for value in updated if value is not None]
        leetcode = obj(leetcode_row["data_json"]) if leetcode_row else {}
        if summary_metadata is not None:
            # Share this exact snapshot with the dashboard's historical total.
            # A concurrent sync/relink must not mix one account's dated records
            # with another snapshot's lifetime count under READ COMMITTED.
            summary_metadata["leetcodeLifetimeSolvedCount"] = synced_lifetime_solved_count(leetcode)
        technical_numbers = {}
        questions = [obj(session.get("question")) for session in rows(personal.get("practiceSessions"))]
        questions.extend(question for session in rows(personal.get("dailySessions")) for question in rows(session.get("questions")))
        questions.extend(catalog.values())
        if any(key(question.get("source")) in {"question-bank", "library"} and not problem_number(question) for question in questions):
            try:
                # The underlying loader is cached. Only explicit source numbers
                # are projected, matched by exact persisted question identity.
                technical_numbers = {key(question.get("id")): problem_number(question) for question in load_technical_questions()}
            except (OSError, ValueError, TypeError):
                technical_numbers = {}
        return collect_practice(personal, legacy, states, catalog, leetcode=leetcode, technical_numbers=technical_numbers), stamp(max(updated)) if updated else None

    def goal_progress(self, goal, practice):
        zone = self.zone(goal["time_zone"])
        return sum(item["count"] for item in counted_practice(practice, zone) if goal["start_date"] <= timestamp(item["completedAt"]).astimezone(zone).date().isoformat() <= goal["end_date"])

    def evaluate(self, conn, user_id, practice=None):
        from privacy_policy import PRIVATE_WORKSPACES
        if PRIVATE_WORKSPACES:
            return
        goals = conn.execute("SELECT * FROM guardian_goals WHERE user_id = ? AND status = 'active'", (user_id,)).fetchall()
        if not goals:
            return
        practice = self.practice(conn, user_id)[0] if practice is None else practice
        for goal in goals:
            count = self.goal_progress(goal, practice)
            if count < goal["target_count"]:
                continue
            when = stamp()
            changed = conn.execute("UPDATE guardian_goals SET status = 'completed', completion_count = ?, completed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'", (count, when, when, goal["id"]))
            if changed.rowcount != 1:
                continue
            body = (f"恭喜！你已完成监护人设置的目标「{goal['title']}」。\n\n"
                    f"目标：{goal['start_date']} 至 {goal['end_date']}（{goal['time_zone']}），完成 {goal['target_count']} 题。\n"
                    f"当前已记录：{count} 题。\n奖励约定：{goal['reward'] or '监护人未填写奖励'}\n\n"
                    "奖励由你和监护人自行兑现；QuantGym 负责记录和通知。\n你可以在账户的监护人设置中关闭监护访问。")
            self.enqueue(conn, user_id, "goal_completed", "QuantGym · 目标已达成", body, goal_id=goal["id"])

    def evaluate_all(self):
        from privacy_policy import PRIVATE_WORKSPACES
        if PRIVATE_WORKSPACES:
            return
        with self.db.connect() as conn:
            users = conn.execute("SELECT DISTINCT user_id FROM guardian_goals WHERE status = 'active'").fetchall()
        for user in users:
            with self.db.connect() as conn:
                self.lock_access(conn, user["user_id"])
                self.evaluate(conn, user["user_id"])

    def goals(self, conn, user_id, practice=None):
        practice = self.practice(conn, user_id)[0] if practice is None else practice
        goals = conn.execute("SELECT g.*, n.status AS notification_status FROM guardian_goals g LEFT JOIN guardian_notifications n ON n.goal_id = g.id WHERE g.user_id = ? ORDER BY g.created_at DESC LIMIT 200", (user_id,)).fetchall()
        result = []
        for goal in goals:
            status = goal["status"]
            if status == "active" and now_utc().astimezone(self.zone(goal["time_zone"])).date().isoformat() > goal["end_date"]:
                status = "expired"
            result.append({"id": goal["id"], "title": goal["title"], "targetCount": goal["target_count"],
                           "startDate": goal["start_date"], "endDate": goal["end_date"], "timeZone": goal["time_zone"],
                           "reward": goal["reward"], "status": status,
                           "progress": goal["completion_count"] if goal["status"] == "completed" else self.goal_progress(goal, practice),
                           "completedAt": wire_time(goal["completed_at"]), "createdAt": wire_time(goal["created_at"]),
                           "notificationStatus": goal["notification_status"]})
        return result

    def owner_access(self, user, action=None):
        with self.db.connect() as conn:
            self.ensure_access(conn, user["id"])
            self.lock_access(conn, user["id"])
            if action:
                code = "QG-" + secrets.token_urlsafe(24) if action == "rotate" else None
                conn.execute("UPDATE guardian_access SET code_hash = ?, code_value = ?, enabled = ?, generation = generation + 1, updated_at = ? WHERE user_id = ?", (digest(code) if code else None, code, 1 if code else 0, stamp(), user["id"]))
                conn.execute("DELETE FROM guardian_sessions WHERE user_id = ?", (user["id"],))
                if action == "revoke":
                    conn.execute("UPDATE guardian_goals SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'", (stamp(), user["id"]))
                    conn.execute("UPDATE guardian_notifications SET status = 'cancelled', lease_token = NULL, lease_until = NULL WHERE user_id = ? AND status IN ('pending', 'retry', 'disabled')", (user["id"],))
            access = conn.execute("SELECT * FROM guardian_access WHERE user_id = ?", (user["id"],)).fetchone()
            practice, _ = self.practice(conn, user["id"])
            self.evaluate(conn, user["id"], practice)
            result = {"code": access["code_value"] if access["enabled"] else None, "enabled": bool(access["enabled"]),
                      "updatedAt": wire_time(access["updated_at"]), "goals": self.goals(conn, user["id"], practice), "emailConfigured": bool(self.email_configured())}
        self.wake()
        return result

    def reminder_status(self, conn, user_id):
        latest = conn.execute("SELECT created_at, sent_at, status FROM guardian_notifications WHERE user_id = ? AND kind = 'reminder' ORDER BY created_at DESC LIMIT 1", (user_id,)).fetchone()
        cutoff = now_utc() - timedelta(days=1)
        recent = conn.execute("SELECT created_at FROM guardian_notifications WHERE user_id = ? AND kind = 'reminder' AND created_at > ? AND status != 'cancelled' ORDER BY created_at", (user_id, stamp(cutoff))).fetchall()
        allowed = timestamp(latest["created_at"]) + timedelta(seconds=self.reminder_cooldown) if latest else None
        if len(recent) >= self.reminder_daily_max:
            daily_allowed = timestamp(recent[-self.reminder_daily_max]["created_at"]) + timedelta(days=1)
            allowed = max(allowed, daily_allowed) if allowed else daily_allowed
        return {"lastSentAt": wire_time(latest["sent_at"]) if latest else None,
                "lastRequestedAt": wire_time(latest["created_at"]) if latest else None,
                "status": latest["status"] if latest else None,
                "nextAllowedAt": stamp(allowed) if allowed else None}

    def dashboard(self, token, query):
        self.require_fields(query, {"date", "timeZone"})
        zone_name = query.get("timeZone", "UTC")
        zone = self.zone(zone_name)
        day = query.get("date") or now_utc().astimezone(zone).date().isoformat()
        if valid_date(day) is None:
            raise self.error(400, "date must be YYYY-MM-DD")
        with self.db.connect() as conn:
            user = self.require_guardian(conn, token)
            summary_metadata = {}
            practice, synced_at = self.practice(conn, user["id"], summary_metadata=summary_metadata)
            self.evaluate(conn, user["id"], practice)
            goals = self.goals(conn, user["id"], practice)
            practice = counted_practice(practice, zone)
            today = [item for item in practice if timestamp(item["completedAt"]).astimezone(zone).date().isoformat() == day]
            lifetime_solved = summary_metadata["leetcodeLifetimeSolvedCount"]
            known_problems = {item["id"].split(":", 2)[1] for item in practice if item["source"] == "leetcode"}
            undated_leetcode = max(0, (lifetime_solved or 0) - len(known_problems))
            dated_count = sum(item["count"] for item in practice)
            result = {"student": {"name": student_name(user)}, "date": day, "timeZone": zone_name,
                      "summary": {"todayCount": sum(item["count"] for item in today), "totalCount": dated_count + undated_leetcode,
                                  "datedCount": dated_count, "undatedLeetcodeCount": undated_leetcode, "leetcodeLifetimeSolvedCount": lifetime_solved,
                                  "activeDays": len({timestamp(item["completedAt"]).astimezone(zone).date().isoformat() for item in practice}),
                                  "completedGoals": conn.execute("SELECT COUNT(*) FROM guardian_goals WHERE user_id = ? AND status = 'completed'", (user["id"],)).fetchone()[0]},
                      "questions": today[:200], "questionsTruncated": len(today) > 200, "goals": goals,
                      "emailConfigured": bool(self.email_configured()), "reminder": self.reminder_status(conn, user["id"]),
                      "syncedAt": synced_at, "countingNote": COUNTING_NOTE}
        self.wake()
        return result

    def create_goal(self, token, payload):
        self.require_fields(payload, {"title", "targetCount", "startDate", "endDate", "timeZone", "reward"}, {"title", "targetCount", "startDate", "endDate", "timeZone"})
        title, reward = payload.get("title"), payload.get("reward", "")
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 120 or re.search(r"[\r\n\x00-\x1f]", title):
            raise self.error(400, "Goal title must be 1–120 characters on one line")
        if not isinstance(reward, str) or len(reward) > 1000 or "\x00" in reward:
            raise self.error(400, "Reward must be at most 1000 characters")
        count = safe_count(payload.get("targetCount"))
        if not count:
            raise self.error(400, "targetCount must be an integer from 1 to 100000")
        start, end = valid_date(payload.get("startDate")), valid_date(payload.get("endDate"))
        if start is None or end is None or not 0 <= (end - start).days <= 365:
            raise self.error(400, "Goal dates must form an inclusive period of at most 366 days")
        self.zone(payload["timeZone"])
        with self.db.connect() as conn:
            user = self.require_guardian(conn, token)
            recent = conn.execute("SELECT COUNT(*) FROM guardian_goals WHERE user_id = ? AND created_at > ?", (user["id"], stamp(now_utc() - timedelta(days=1)))).fetchone()[0]
            if recent >= 20:
                raise self.error(429, "Up to 20 goals can be created in 24 hours. Try again tomorrow.")
            open_goals = conn.execute("SELECT end_date, time_zone FROM guardian_goals WHERE user_id = ? AND status = 'active'", (user["id"],)).fetchall()
            active = sum(goal["end_date"] >= now_utc().astimezone(self.zone(goal["time_zone"])).date().isoformat() for goal in open_goals)
            if active >= 30:
                raise self.error(429, "Up to 30 active goals are allowed. Cancel an active goal before adding more.")
            gid, when = secrets.token_urlsafe(16), stamp()
            conn.execute("INSERT INTO guardian_goals (id, user_id, title, target_count, start_date, end_date, time_zone, reward, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)",
                         (gid, user["id"], title.strip(), count, start.isoformat(), end.isoformat(), payload["timeZone"], reward.strip(), when, when))
            practice, _ = self.practice(conn, user["id"])
            self.evaluate(conn, user["id"], practice)
            result = next(goal for goal in self.goals(conn, user["id"], practice) if goal["id"] == gid)
        self.wake()
        return {"goal": result}

    def cancel_goal(self, token, goal_id):
        with self.db.connect() as conn:
            user = self.require_guardian(conn, token)
            goal = conn.execute("SELECT * FROM guardian_goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])).fetchone()
            if goal is None:
                raise self.error(404, "Goal not found")
            if goal["status"] == "completed":
                raise self.error(409, "Completed goals cannot be cancelled")
            conn.execute("UPDATE guardian_goals SET status = 'cancelled', updated_at = ? WHERE id = ? AND user_id = ?", (stamp(), goal_id, user["id"]))
            result = next(goal for goal in self.goals(conn, user["id"]) if goal["id"] == goal_id)
        return {"goal": result}

    def enqueue(self, conn, user_id, kind, subject, body, goal_id=None):
        nid, when = secrets.token_urlsafe(16), stamp()
        status = "pending" if self.email_configured() else "disabled"
        conn.execute("INSERT INTO guardian_notifications (id, user_id, goal_id, kind, subject, body, status, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(goal_id) DO NOTHING", (nid, user_id, goal_id, kind, subject, body, status, when, when))
        return {"id": nid, "status": status, "createdAt": when}

    def remind(self, token, payload):
        self.require_fields(payload, {"message"})
        message = payload.get("message", "")
        if not isinstance(message, str) or len(message) > 1000 or "\x00" in message:
            raise self.error(400, "Reminder message must be at most 1000 characters")
        with self.db.connect() as conn:
            user = self.require_guardian(conn, token)
            if not self.email_configured():
                raise self.error(503, "Email delivery is not configured. No reminder has been sent.")
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", str(user.get("email_norm") or "")):
                raise self.error(409, "The student does not have a valid registered email")
            status = self.reminder_status(conn, user["id"])
            if status["nextAllowedAt"] and timestamp(status["nextAllowedAt"]) > now_utc():
                raise self.error(429, "Reminder limit reached. Try again after " + status["nextAllowedAt"])
            body = "你的监护人给你发来一条练习提醒：\n\n" + (message.strip() or "今天也为自己留一点练习时间吧。完成一小步，也是在向目标前进。")
            body += "\n\n这封邮件由 QuantGym 监护人功能发送。你可以在账户的监护人设置中关闭监护访问。"
            notification = self.enqueue(conn, user["id"], "reminder", "QuantGym · 练习提醒", body)
            status = self.reminder_status(conn, user["id"])
        self.wake()
        return {"notification": notification, "nextAllowedAt": status["nextAllowedAt"]}

    def logout(self, token):
        with self.db.connect() as conn:
            self.require_guardian(conn, token)
            conn.execute("DELETE FROM guardian_sessions WHERE token_hash = ?", (digest(token),))
        return {"ok": True}

    def deliver_pending(self, limit=20):
        from privacy_policy import PRIVATE_WORKSPACES
        if PRIVATE_WORKSPACES:
            return
        if not self.email_configured():
            return
        for _ in range(limit):
            when, lease = now_utc(), secrets.token_urlsafe(18)
            with self.db.connect() as conn:
                row = conn.execute("SELECT id FROM guardian_notifications WHERE (status IN ('pending', 'retry', 'disabled') AND next_attempt_at <= ?) OR (status = 'sending' AND lease_until <= ?) ORDER BY created_at LIMIT 1", (stamp(when), stamp(when))).fetchone()
                if row is None:
                    return
                claimed = conn.execute("UPDATE guardian_notifications SET status = 'sending', attempts = attempts + 1, lease_token = ?, lease_until = ? WHERE id = ? AND ((status IN ('pending', 'retry', 'disabled') AND next_attempt_at <= ?) OR (status = 'sending' AND lease_until <= ?))", (lease, stamp(when + timedelta(minutes=5)), row["id"], stamp(when), stamp(when)))
                if claimed.rowcount != 1:
                    continue
                notification = dict(conn.execute("SELECT n.*, u.email_norm, a.enabled FROM guardian_notifications n JOIN users u ON u.id = n.user_id JOIN guardian_access a ON a.user_id = n.user_id WHERE n.id = ?", (row["id"],)).fetchone())
            if not notification["enabled"]:
                with self.db.connect() as conn:
                    conn.execute("UPDATE guardian_notifications SET status = 'cancelled', lease_token = NULL, lease_until = NULL WHERE id = ? AND lease_token = ?", (notification["id"], lease))
                continue
            try:
                recipient = str(notification["email_norm"] or "")
                if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", recipient):
                    raise ValueError("Invalid registered email")
                # Stable Message-ID helps providers recognize retries; SMTP itself
                # cannot guarantee exactly-once delivery across a process crash.
                self.send_email(recipient, notification["subject"], notification["body"], notification["id"])
            except Exception as error:
                attempts = notification["attempts"]
                delay = min(3600, 30 * (2 ** min(attempts - 1, 7)))
                with self.db.connect() as conn:
                    conn.execute("UPDATE guardian_notifications SET status = ?, next_attempt_at = ?, last_error = ?, lease_token = NULL, lease_until = NULL WHERE id = ? AND lease_token = ?", ("failed" if attempts >= 8 else "retry", stamp(now_utc() + timedelta(seconds=delay)), type(error).__name__, notification["id"], lease))
            else:
                with self.db.connect() as conn:
                    conn.execute("UPDATE guardian_notifications SET status = 'sent', sent_at = ?, last_error = NULL, lease_token = NULL, lease_until = NULL WHERE id = ? AND lease_token = ?", (stamp(), notification["id"], lease))

    def handle(self, handler, path):
        from privacy_policy import PRIVATE_WORKSPACES
        if PRIVATE_WORKSPACES:
            raise self.error(403, "Sharing is disabled. Personal data is private to its account.")
        method = handler.command
        if method in {"POST", "PUT", "PATCH"}:
            try:
                length = int(handler.headers.get("Content-Length", "0"))
            except ValueError:
                raise self.error(400, "Invalid Content-Length")
            if length < 0:
                raise self.error(400, "Invalid Content-Length")
            if length > 16384:
                raise self.error(413, "Guardian request must be at most 16 KiB")
        if path == "/api/guardian/session" and method == "POST":
            handler.send_json(200, self.exchange(handler.read_json(), handler.client_rate_key()))
            return
        if path.startswith("/api/guardian/access"):
            user = handler.require_user()
            if path == "/api/guardian/access" and method == "GET":
                handler.send_json(200, self.owner_access(user))
                return
            match = re.fullmatch(r"/api/guardian/access/(rotate|revoke)", path)
            if match and method == "POST":
                self.require_fields(handler.read_json(), set())
                result = self.owner_access(user, match.group(1))
                handler.audit_event("guardian.access." + match.group(1), user=user)
                handler.send_json(200, result)
                return
            raise self.error(404, "Guardian endpoint not found")
        header = handler.headers.get("Authorization", "")
        token = header[len("Bearer "):].strip() if header.startswith("Bearer ") else ""
        if path == "/api/guardian/dashboard" and method == "GET":
            query = parse_qs(urlparse(handler.path).query, keep_blank_values=True)
            if any(len(value) != 1 for value in query.values()):
                raise self.error(400, "Duplicate query parameters")
            handler.send_json(200, self.dashboard(token, {name: value[0] for name, value in query.items()}))
        elif path == "/api/guardian/goals" and method == "POST":
            handler.send_json(201, self.create_goal(token, handler.read_json()))
        elif re.fullmatch(r"/api/guardian/goals/[A-Za-z0-9_-]{1,100}", path) and method == "DELETE":
            handler.send_json(200, self.cancel_goal(token, path.rsplit("/", 1)[1]))
        elif path == "/api/guardian/reminders" and method == "POST":
            handler.send_json(202, self.remind(token, handler.read_json()))
        elif path == "/api/guardian/session" and method == "DELETE":
            handler.send_json(200, self.logout(token))
        else:
            raise self.error(404, "Guardian endpoint not found")
