"""Private, versioned personal preparation storage shared by SQLite/Postgres.

This table is intentionally separate from user_states and community. No public
catalog, profile, or leaderboard query should join or serialize its contents.
"""

from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timezone
from urllib.parse import urlsplit
from technical_metadata import validate_technical_provenance

PERSONAL_PREP_VERSION = 1
MAX_PERSONAL_PREP_BYTES = 8 * 1024 * 1024
MAX_PERSONAL_PREP_RECORDS = 100_000
PERSONAL_PREP_FIELDS = {
    "mentalSettings", "activeTrial", "trials", "dailySettings", "dailySessions", "activities"
}
OPTIONAL_PERSONAL_FIELDS = {"removedActivityIds", "applicationEvents", "reviewEvents", "practiceSessions", "behavioralAnswers", "careerTrackerOperations"}
APPLICATION_FIELDS = {"company", "role", "location", "url", "status", "deadline", "nextAction", "nextActionDate", "notes", "archived"}
APPLICATION_STATUSES = {"wishlist", "applied", "oa", "interview", "offer", "rejected", "withdrawn"}
APPLICATION_LIMITS = {"company": 200, "role": 300, "location": 300, "url": 2048, "nextAction": 2000, "notes": 20000}


class PersonalPrepValidationError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def validate_personal_prep_request(payload: dict) -> tuple[int, str]:
    if not isinstance(payload, dict) or set(payload) != {"version", "baseRevision", "data"}:
        raise PersonalPrepValidationError("Expected version, baseRevision and personal data only.")
    if type(payload["version"]) is not int or payload["version"] != PERSONAL_PREP_VERSION:
        raise PersonalPrepValidationError("Unsupported personal preparation version.")
    revision = payload["baseRevision"]
    if type(revision) is not int or not 0 <= revision < 2_147_483_647:
        raise PersonalPrepValidationError("baseRevision must be a nonnegative integer.")
    data = payload["data"]
    if not isinstance(data, dict) or not PERSONAL_PREP_FIELDS.issubset(data) or set(data) - PERSONAL_PREP_FIELDS - OPTIONAL_PERSONAL_FIELDS:
        raise PersonalPrepValidationError("A complete personal preparation state is required.")
    data = {**data, **{field: data.get(field, []) for field in OPTIONAL_PERSONAL_FIELDS}}
    data["careerTrackerOperations"] = validate_tracker_operations(data["careerTrackerOperations"])
    removed = data["removedActivityIds"]
    if not isinstance(removed, list) or len(removed) > MAX_PERSONAL_PREP_RECORDS or any(not valid_record_id(item) for item in removed) or len(set(removed)) != len(removed):
        raise PersonalPrepValidationError("Invalid removedActivityIds.")
    for field in ("mentalSettings", "dailySettings"):
        if data[field] is not None and not isinstance(data[field], dict):
            raise PersonalPrepValidationError(f"Invalid {field}.")
    active = data["activeTrial"]
    if active is not None and (not isinstance(active, dict) or not valid_record_id(active.get("id"))):
        raise PersonalPrepValidationError("Invalid activeTrial.")
    for field in ("trials", "dailySessions", "activities", "applicationEvents", "reviewEvents", "practiceSessions", "behavioralAnswers"):
        rows = data[field]
        if not isinstance(rows, list) or len(rows) > (10000 if field == "behavioralAnswers" else MAX_PERSONAL_PREP_RECORDS):
            raise PersonalPrepValidationError(f"Invalid {field} collection.")
        ids = set()
        for row in rows:
            if not isinstance(row, dict) or not valid_record_id(row.get("id")) or row["id"] in ids:
                raise PersonalPrepValidationError(f"Invalid or duplicate record in {field}.")
            ids.add(row["id"])
            if field == "applicationEvents":
                validate_application_event(row)
            elif field == "reviewEvents":
                validate_review_event(row)
            elif field == "behavioralAnswers":
                if set(row) != {"id", "text", "updatedAt"} or not isinstance(row["text"], str) or len(row["text"]) > 20000 or not valid_event_timestamp(row["updatedAt"]):
                    raise PersonalPrepValidationError("Invalid behavioral answer.")
            elif field == "practiceSessions":
                validate_practice_session(row)
        if field in {"applicationEvents", "reviewEvents"}:
            time_field = "createdAt" if field == "applicationEvents" else "reviewedAt"
            data[field] = sorted(rows, key=lambda event: event_order(event, time_field))
    try:
        encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        size = len(encoded.encode("utf-8"))
    except (ValueError, TypeError, RecursionError, UnicodeError):
        raise PersonalPrepValidationError("Personal preparation data must be valid finite JSON.")
    if size > MAX_PERSONAL_PREP_BYTES:
        raise PersonalPrepValidationError("Personal preparation data exceeds the 8 MiB limit.", 413)
    return revision, encoded


def valid_record_id(value) -> bool:
    return isinstance(value, str) and 0 < len(value.strip()) <= 512


def event_order(event, time_field):
    parsed = datetime.fromisoformat(event[time_field].replace("Z", "+00:00"))
    milliseconds = round(parsed.replace(microsecond=parsed.microsecond // 1000 * 1000).timestamp() * 1000)
    return milliseconds, event["id"]


def valid_civil_date(value) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def valid_event_timestamp(value) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})", value):
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.tzinfo is not None
    except ValueError:
        return False


def valid_application_url(value) -> bool:
    if value == "":
        return True
    if not isinstance(value, str) or re.search(r"[\s\x00-\x1f\x7f]", value):
        return False
    try:
        parsed = urlsplit(value)
        parsed.port  # Reject malformed or out-of-range ports before saving links.
        return parsed.scheme in {"http", "https"} and bool(parsed.hostname) and parsed.username is None and parsed.password is None
    except ValueError:
        return False


def validate_application_event(event):
    if set(event) != {"id", "applicationId", "createdAt", "changes"} or not valid_record_id(event["applicationId"]) or not valid_event_timestamp(event["createdAt"]):
        raise PersonalPrepValidationError("Invalid application event.")
    changes = event["changes"]
    if not isinstance(changes, dict) or not changes or set(changes) - APPLICATION_FIELDS:
        raise PersonalPrepValidationError("Invalid application changes.")
    for field, value in changes.items():
        valid = True
        if field == "archived":
            valid = type(value) is bool
        elif field == "status":
            valid = isinstance(value, str) and value in APPLICATION_STATUSES
        elif field in {"deadline", "nextActionDate"}:
            valid = value == "" or valid_civil_date(value)
        else:
            valid = isinstance(value, str) and len(value) <= APPLICATION_LIMITS[field]
        if not valid or (field in {"company", "role"} and not value.strip()) or (field == "url" and not valid_application_url(value)):
            raise PersonalPrepValidationError(f"Invalid application {field}.")


def validate_review_event(event):
    if set(event) != {"id", "questionKey", "reviewedAt", "rating", "note"} or not valid_record_id(event["questionKey"]) or not valid_event_timestamp(event["reviewedAt"]) or not isinstance(event["rating"], str) or event["rating"] not in {"again", "good", "easy"} or not isinstance(event["note"], str) or len(event["note"]) > 20000:
        raise PersonalPrepValidationError("Invalid review event.")


def bounded_practice_text(value, maximum):
    if not isinstance(value, str):
        return False
    try:
        # Match JavaScript string limits, including non-BMP characters.
        return len(value.encode("utf-16-le")) // 2 <= maximum
    except UnicodeEncodeError:
        return False


TRACKER_STATUSES = {"submitted", "oa_received", "oa_completed", "interview", "offer", "rejected", "withdrawn"}
TRACKER_EVENT_FIELDS = {"type", "date", "year", "dueDate", "dueTime"}


def tracker_id(value):
    return bounded_practice_text(value, 200) and bool(value.strip())


def tracker_date(value, partial=False):
    if partial and isinstance(value, str) and re.fullmatch(r"[0-9]{1,2}/[0-9]{1,2}", value):
        month, day = map(int, value.split("/"))
        return 1 <= month <= 12 and 1 <= day <= (31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[month - 1]
    return valid_civil_date(value)


def tracker_ids(values, maximum, minimum=0):
    return isinstance(values, list) and minimum <= len(values) <= maximum and all(tracker_id(value) for value in values) and len(set(values)) == len(values)


def validate_tracker_event_fields(fields):
    if not isinstance(fields, dict) or not fields or set(fields) - TRACKER_EVENT_FIELDS:
        raise PersonalPrepValidationError("Invalid Tracker event fields.")
    for field, value in fields.items():
        if field == "type":
            valid = isinstance(value, str) and value in TRACKER_STATUSES
        elif field == "date":
            valid = tracker_date(value, partial=True)
        elif field == "year":
            valid = value is None or (type(value) is int and 1 <= value <= 9999)
        elif field == "dueDate":
            valid = value == "" or tracker_date(value)
        else:
            valid = isinstance(value, str) and (value == "" or re.fullmatch(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]", value) is not None)
        if not valid:
            raise PersonalPrepValidationError(f"Invalid Tracker event {field}.")


def validate_tracker_operation(operation):
    if not isinstance(operation, dict) or not tracker_id(operation.get("id")) or type(operation.get("clock")) is not int or not 0 <= operation["clock"] <= 9_007_199_254_740_991:
        raise PersonalPrepValidationError("Invalid Tracker operation identity.")
    operation = {**operation}
    kind = operation.get("kind")
    fields_by_kind = {
        "application": {"applicationId", "fields"}, "event": {"applicationId", "eventId", "fields"},
        "delete": {"applicationId", "eventId", "deleteId", "event", "order"},
        "restore": {"applicationId", "eventId", "deleteId"}, "stage": {"stageId", "fields"},
    }
    if not isinstance(kind, str) or kind not in fields_by_kind:
        raise PersonalPrepValidationError("Invalid Tracker operation kind.")
    required = {"id", "clock", "kind"} | fields_by_kind[kind]
    optional = {"order"} if kind == "event" else {"aliases"} if kind == "stage" else set()
    if not required.issubset(operation) or set(operation) - required - optional:
        raise PersonalPrepValidationError("Invalid Tracker operation fields.")
    for field in ("applicationId", "eventId", "deleteId", "stageId"):
        if field in operation and not tracker_id(operation[field]):
            raise PersonalPrepValidationError(f"Invalid Tracker {field}.")
    if "order" in operation and (not tracker_ids(operation["order"], 11000, 2 if kind == "delete" else 1) or operation["eventId"] not in operation["order"] or (kind == "delete" and operation["order"].index(operation["eventId"]) < 1)):
        raise PersonalPrepValidationError("Invalid Tracker event order.")
    if kind == "delete":
        event = operation["event"]
        required_event = {"id", "type", "date"}
        if not isinstance(event, dict) or not required_event.issubset(event) or set(event) - required_event - {"year", "dueDate", "dueTime"} or event["id"] != operation["eventId"] or event["type"] == "submitted":
            raise PersonalPrepValidationError("Invalid Tracker deleted event.")
        event = {"dueDate": "", "dueTime": "", **event}
        operation["event"] = event
        validate_tracker_event_fields({field: value for field, value in event.items() if field != "id"})
        if event["dueTime"] and not event["dueDate"]:
            raise PersonalPrepValidationError("Invalid Tracker deleted event deadline.")
    elif kind == "event":
        validate_tracker_event_fields(operation["fields"])
    elif kind in {"application", "stage"}:
        fields = operation["fields"]
        allowed = {"company", "role", "prepPhase", "season"} if kind == "application" else {"label", "description", "recordedDate", "createdAt", "capturedAt", "updatedAt", "trackerImportDate"}
        if not isinstance(fields, dict) or not fields or set(fields) - allowed:
            raise PersonalPrepValidationError(f"Invalid Tracker {kind} fields.")
        limits = {"company": 120, "role": 400, "prepPhase": 200, "season": 20, "label": 40, "description": 200}
        for field, value in fields.items():
            if field in limits:
                valid = bounded_practice_text(value, limits[field]) and (field not in {"company", "role", "label"} or bool(value.strip()))
            elif field in {"recordedDate", "trackerImportDate"}:
                valid = value is None or tracker_date(value)
            else:
                valid = value is None or valid_event_timestamp(value)
            if not valid:
                raise PersonalPrepValidationError(f"Invalid Tracker {kind} {field}.")
        if "aliases" in operation and (not tracker_ids(operation["aliases"], 1000) or operation["stageId"] in operation["aliases"]):
            raise PersonalPrepValidationError("Invalid Tracker stage aliases.")
        if "aliases" in operation:
            operation["aliases"] = sorted(operation["aliases"], key=lambda value: value.encode("utf-16-be"))
    return operation


def validate_tracker_operations(operations, merging=False):
    if not isinstance(operations, list) or (not merging and len(operations) > MAX_PERSONAL_PREP_RECORDS):
        raise PersonalPrepValidationError("Invalid Tracker operation collection.")
    records = {}
    for operation in operations:
        operation = validate_tracker_operation(operation)
        previous = records.get(operation["id"])
        if previous is not None and previous != operation:
            raise PersonalPrepValidationError("Conflicting immutable Tracker operation.")
        records[operation["id"]] = operation
    if len(records) > MAX_PERSONAL_PREP_RECORDS:
        raise PersonalPrepValidationError("Invalid Tracker operation collection.")
    # Python compares Unicode code points; use UTF-16 units to match JavaScript.
    return sorted(records.values(), key=lambda operation: (operation["clock"], operation["id"].encode("utf-16-be")))


def validate_practice_session(session):
    fields = {"id", "kind", "status", "startedAt", "updatedAt", "completedAt", "question", "text", "codeLanguage", "selfAssessment", "elapsedSeconds", "timerStartedAt", "reviewed"}
    if set(session) != fields or not bounded_practice_text(session["id"], 512) or not isinstance(session.get("kind"), str) or session["kind"] not in {"tech", "coding"} or not isinstance(session.get("status"), str) or session["status"] not in {"active", "completed"}:
        raise PersonalPrepValidationError("Invalid practice session.")
    if not all(valid_event_timestamp(session.get(field)) for field in ("startedAt", "updatedAt")):
        raise PersonalPrepValidationError("Invalid practice session timestamps.")
    for field in ("completedAt", "timerStartedAt"):
        if session[field] is not None and not valid_event_timestamp(session[field]):
            raise PersonalPrepValidationError(f"Invalid practice {field}.")
    if not bounded_practice_text(session["text"], 80_000) or not isinstance(session["codeLanguage"], str) or session["codeLanguage"] not in {"python", "javascript", "cpp"} or not isinstance(session["selfAssessment"], str) or session["selfAssessment"] not in {"", "independent", "with-help", "review"} or type(session["reviewed"]) is not bool:
        raise PersonalPrepValidationError("Invalid practice answer.")
    elapsed = session["elapsedSeconds"]
    if type(elapsed) not in (int, float) or not 0 <= elapsed <= 1_000_000_000_000 or not math.isfinite(elapsed):
        raise PersonalPrepValidationError("Invalid practice elapsed time.")
    if session["status"] == "completed":
        if not session["text"].strip() or not session["selfAssessment"] or not session["completedAt"] or session["timerStartedAt"] is not None:
            raise PersonalPrepValidationError("Invalid completed practice answer.")
    elif session["completedAt"] is not None:
        raise PersonalPrepValidationError("Active practice cannot have a completion time.")
    question = session["question"]
    required = {"id", "source", "title", "titleEn", "prompt", "promptEn", "reference", "referenceEn", "url"}
    optional = {"slug", "username", "linkedAt", "sourceLabel", "provenance"}
    if not isinstance(question, dict) or not required.issubset(question) or set(question) - required - optional or not valid_record_id(question.get("id")) or not bounded_practice_text(question["id"], 512):
        raise PersonalPrepValidationError("Invalid practice question.")
    limits = {"title": 500, "titleEn": 500, "prompt": 80_000, "promptEn": 80_000, "reference": 80_000, "referenceEn": 80_000, "url": 2048, "sourceLabel": 500}
    if any(not bounded_practice_text(question[field], maximum) for field, maximum in limits.items() if field in question):
        raise PersonalPrepValidationError("Invalid practice question text.")
    if "provenance" in question:
        if session["kind"] != "tech":
            raise PersonalPrepValidationError("Only Purple Book practice supports provenance.")
        try:
            validate_technical_provenance(question["provenance"])
        except ValueError as exc:
            raise PersonalPrepValidationError(str(exc)) from exc
    if session["kind"] == "tech":
        missing_answer = question.get("provenance", {}).get("answerStatus") == "missing"
        if question["source"] != "question-bank" or question["url"] != "" or not question["prompt"].strip() or not (question["reference"].strip() or missing_answer) or any(question.get(field) for field in ("slug", "username", "linkedAt")):
            raise PersonalPrepValidationError("Technical practice requires a Purple Book question.")
    elif question["source"] != "leetcode" or not isinstance(question.get("slug"), str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,200}", question["slug"]) or question["id"] != question["slug"] or question["url"] != f"https://leetcode.cn/problems/{question['slug']}/" or not isinstance(question.get("username"), str) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", question["username"]) or not valid_event_timestamp(question.get("linkedAt")):
        raise PersonalPrepValidationError("Coding practice requires a linked LeetCode problem.")


def merge_practice_sessions(current, incoming):
    sessions = {session["id"]: session for session in current}
    for candidate in incoming:
        previous = sessions.get(candidate["id"])
        if previous:
            identity = lambda item: (item["kind"], *(item["question"].get(field) for field in ("id", "source", "slug", "username", "linkedAt")))
            if identity(previous) != identity(candidate):
                raise PersonalPrepValidationError("Conflicting practice question identity.")
            if previous["status"] == "completed" and candidate["status"] != "completed":
                continue
            if candidate["status"] == previous["status"] and event_order(candidate, "updatedAt") <= event_order(previous, "updatedAt"):
                continue
        sessions[candidate["id"]] = candidate
    return list(sessions.values())


def restore_practice_activities(data):
    removed = set(data["removedActivityIds"])
    activities = {activity["id"]: activity for activity in data["activities"]
                  if not (activity["id"].startswith("practice:") and activity["id"] in removed)}
    for session in data["practiceSessions"]:
        identity = f"practice:{session['id']}"
        if session["status"] != "completed" or identity in removed:
            continue
        activities[identity] = {
            "id": identity, "kind": session["kind"], "count": 1, "title": session["question"]["title"],
            "titleEn": session["question"]["titleEn"], "completedAt": session["completedAt"],
            "questionId": session["question"]["id"], "source": "standalone", "selfAssessment": session["selfAssessment"],
        }
    data["activities"] = list(activities.values())


def get_personal_prep(conn, user_id: str) -> dict:
    row = conn.execute(
        "SELECT data_json, revision, updated_at FROM user_personal_prep WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if row is None:
        return {"version": PERSONAL_PREP_VERSION, "revision": 0, "data": None, "updatedAt": None}
    stored = row["data_json"]
    updated_at = row["updated_at"]
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat().replace("+00:00", "Z")
    data = json.loads(stored) if isinstance(stored, str) else stored
    return {
        "version": PERSONAL_PREP_VERSION,
        "revision": int(row["revision"]),
        "data": {**data, **{field: data.get(field, []) for field in OPTIONAL_PERSONAL_FIELDS}},
        "updatedAt": updated_at,
    }


def save_personal_prep(conn, user_id: str, base_revision: int, data_json: str) -> tuple[bool, dict]:
    """Atomically compare-and-swap, returning the current row on a stale write.

    No check-then-insert race: the unique owner key chooses the first writer.
    Existing rows update only when their revision still matches the client.
    The caller must commit before acknowledging success over HTTP.
    """
    current = get_personal_prep(conn, user_id)
    if current["revision"] != base_revision:
        return False, current
    incoming = json.loads(data_json)
    if current["data"] is not None:
        incoming["careerTrackerOperations"] = validate_tracker_operations([
            *current["data"].get("careerTrackerOperations", []), *incoming["careerTrackerOperations"],
        ], merging=True)
        answers = {}
        for answer in [*current["data"].get("behavioralAnswers", []), *incoming.get("behavioralAnswers", [])]:
            previous = answers.get(answer["id"])
            if previous is None or (event_order(answer, "updatedAt"), answer["text"]) > (event_order(previous, "updatedAt"), previous["text"]):
                answers[answer["id"]] = answer
        incoming["behavioralAnswers"] = sorted(answers.values(), key=lambda answer: answer["id"])
        for field, time_field in (("applicationEvents", "createdAt"), ("reviewEvents", "reviewedAt")):
            events = {}
            for event in [*current["data"].get(field, []), *incoming.get(field, [])]:
                previous = events.get(event["id"])
                if previous is not None and previous != event:
                    raise PersonalPrepValidationError(f"Conflicting immutable event in {field}.")
                events[event["id"]] = event
            incoming[field] = sorted(events.values(), key=lambda event: event_order(event, time_field))
        incoming["practiceSessions"] = merge_practice_sessions(current["data"].get("practiceSessions", []), incoming.get("practiceSessions", []))
        # An older client can omit new sessions and their deletion markers.
        # Retain practice tombstones before reconstructing calendar activities.
        retained = {identity for identity in current["data"].get("removedActivityIds", []) if identity.startswith("practice:")}
        incoming["removedActivityIds"] = sorted(retained | set(incoming["removedActivityIds"]))
    restore_practice_activities(incoming)
    _, data_json = validate_personal_prep_request({"version": PERSONAL_PREP_VERSION, "baseRevision": base_revision, "data": incoming})
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if base_revision == 0:
        cursor = conn.execute(
            """
            INSERT INTO user_personal_prep (user_id, data_json, revision, updated_at)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(user_id) DO NOTHING
            """,
            (user_id, data_json, now),
        )
    else:
        cursor = conn.execute(
            """
            UPDATE user_personal_prep
            SET data_json = ?, revision = revision + 1, updated_at = ?
            WHERE user_id = ? AND revision = ?
            """,
            (data_json, now, user_id, base_revision),
        )
    return cursor.rowcount == 1, get_personal_prep(conn, user_id)
