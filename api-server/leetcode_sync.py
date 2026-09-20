"""Account-private LeetCode CN public snapshots and user-provided metadata.

Only fixed public GraphQL endpoints are used. Passwords, cookies, source code,
third-party URLs and ownership assertions are deliberately outside this format.
"""
from __future__ import annotations

import copy
import json
import math
import re
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_IMPORT_BYTES = 5 * 1024 * 1024
MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024
MAX_RECORDS = 20_000
MAX_REVIEW_EVENTS = 20_000
MAX_REVIEW_INTERVAL_DAYS = 36_500
REVIEW_RATINGS = {"again": 1, "hard": 3, "good": 4, "easy": 5}
MIN_SYNC_SECONDS = 60
FETCH_TIMEOUT_SECONDS = 10
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
# CN's authenticated history reports submission start time; public recent AC
# can report acceptance a few seconds later. Only the same AC ID and problem
# may use this bounded compatibility, always choosing the public timestamp.
MAX_SOURCE_TIMESTAMP_SKEW_SECONDS = 10
SLUG = re.compile(r"[a-zA-Z0-9_-]{1,100}\Z")
PROBLEM_SLUG = re.compile(r"[a-zA-Z0-9_-]{1,200}\Z")
STATUSES = {"AC", "WA", "TLE", "MLE", "RE", "CE", "OLE", "IE", "UNKNOWN"}
STATUS_CODES = {10: "AC", 11: "WA", 12: "MLE", 13: "OLE", 14: "TLE", 15: "RE", 16: "IE", 20: "CE"}
PROFILE_QUERY = """query QuantGymProfile($userSlug: String!) {
  userProfilePublicProfile(userSlug: $userSlug) { username profile { userSlug realName } submissionProgress { totalSubmissions acTotal } }
  userProfileUserQuestionProgress(userSlug: $userSlug) { numAcceptedQuestions { difficulty count } }
}"""
ACTIVITY_QUERY = """query QuantGymActivity($userSlug: String!, $year: Int!) {
  recentACSubmissions(userSlug: $userSlug) { submissionId submitTime question { translatedTitle titleSlug questionFrontendId } }
  userCalendar(userSlug: $userSlug, year: $year) { submissionCalendar }
}"""


class LeetCodeError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_profile(payload):
    if not isinstance(payload, dict) or set(payload) - {"username", "profileUrl"} or not payload:
        raise LeetCodeError("Provide a LeetCode CN username or profileUrl only.")
    username = payload.get("username")
    if username is not None and (not isinstance(username, str) or not SLUG.fullmatch(username.strip())):
        raise LeetCodeError("Invalid LeetCode CN username.")
    username = username.strip() if username is not None else None
    if "profileUrl" in payload:
        value = payload["profileUrl"]
        if not isinstance(value, str) or len(value) > 300 or re.search(r"[\s\x00-\x1f\x7f]", value):
            raise LeetCodeError("Use a profile link such as https://leetcode.cn/u/your-name/.")
        try:
            url = urlsplit(value)
            valid = url.scheme == "https" and url.hostname == "leetcode.cn" and url.port is None and not url.username and not url.password and not url.query and not url.fragment
        except ValueError:
            valid = False
        match = re.fullmatch(r"/u/([a-zA-Z0-9_-]{1,100})/?", url.path) if valid else None
        if not match or (username is not None and username != match.group(1)):
            raise LeetCodeError("Use a matching https://leetcode.cn/u/username/ profile link.")
        username = match.group(1)
    if not username:
        raise LeetCodeError("A LeetCode CN username is required.")
    return username


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def graphql(query, variables, *, activity=False):
    # These constants, rather than user input, determine every network request.
    endpoint = "https://leetcode.cn/graphql/noj-go/" if activity else "https://leetcode.cn/graphql/"
    request = Request(endpoint, data=json.dumps({"query": query, "variables": variables}).encode(), headers={
        "Content-Type": "application/json", "Accept": "application/json",
        "User-Agent": "QuantGym/1.0 (public profile synchronization)",
        "Referer": "https://leetcode.cn/",
    }, method="POST")
    try:
        with build_opener(NoRedirect()).open(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise LeetCodeError("LeetCode returned too much data. Please try again later.", 502)
        result = json.loads(raw)
        if not isinstance(result, dict) or result.get("errors") or not isinstance(result.get("data"), dict):
            raise LeetCodeError("LeetCode data is temporarily unavailable. Your saved records are unchanged.", 502)
        return result["data"]
    except HTTPError as error:
        raise LeetCodeError("LeetCode is temporarily limiting requests. Please try again later." if error.code == 429 else "Unable to read this public LeetCode profile right now.", 429 if error.code == 429 else 502) from None
    except (URLError, TimeoutError, OSError, ValueError, UnicodeError) as error:
        if isinstance(error, LeetCodeError):
            raise
        raise LeetCodeError("LeetCode could not be reached. Your saved records are unchanged.", 502) from None


def nonnegative(value):
    if type(value) is not int or value < 0 or value > 100_000_000:
        raise LeetCodeError("LeetCode returned invalid statistics.", 502)
    return value


def timestamp(value, *, nullable=False):
    if value is None and nullable:
        return None
    try:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            parsed = datetime.fromtimestamp(value, timezone.utc)
        elif isinstance(value, str) and value.isdigit():
            parsed = datetime.fromtimestamp(int(value), timezone.utc)
        elif isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                raise ValueError()
            parsed = parsed.astimezone(timezone.utc)
        else:
            raise ValueError()
        if parsed.year < 2000 or parsed.timestamp() > time.time() + 86400:
            raise ValueError()
        return parsed.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    except (ValueError, OverflowError, OSError):
        raise LeetCodeError("Invalid submission timestamp.") from None


def metadata(row, *, slug_field="slug"):
    slug = row.get(slug_field)
    if not isinstance(slug, str) or not PROBLEM_SLUG.fullmatch(slug):
        raise LeetCodeError("Invalid problem slug.")
    result = {"slug": slug}
    for name, limit in (("title", 500), ("titleEn", 500), ("frontendId", 100)):
        value = row.get(name, "")
        if value is None:
            value = ""
        if not isinstance(value, (str, int)) or isinstance(value, bool) or len(str(value)) > limit:
            raise LeetCodeError(f"Invalid problem {name}.")
        result[name] = str(value).strip()
    difficulty = row.get("difficulty")
    difficulty = {"easy": 1, "medium": 2, "hard": 3}.get(difficulty.lower(), difficulty) if isinstance(difficulty, str) else difficulty
    if difficulty is not None and (type(difficulty) is not int or difficulty not in (1, 2, 3)):
        raise LeetCodeError("Invalid problem difficulty.")
    result["difficulty"] = difficulty
    return result


def submission(row):
    fields = {"id", "problemSlug", "title", "titleEn", "frontendId", "difficulty", "submittedAt", "status"}
    if not isinstance(row, dict) or set(row) - fields:
        raise LeetCodeError("Submission imports may contain metadata only.")
    identity = row.get("id")
    if not isinstance(identity, (str, int)) or isinstance(identity, bool) or not re.fullmatch(r"[a-zA-Z0-9_-]{1,100}", str(identity)):
        raise LeetCodeError("Invalid submission id.")
    meta = metadata(row, slug_field="problemSlug")
    status = row.get("status")
    if type(status) is int:
        status = STATUS_CODES.get(status)
    if not isinstance(status, str) or status not in STATUSES:
        raise LeetCodeError("Invalid submission status.")
    return {"id": str(identity), "problemSlug": meta.pop("slug"), **meta, "submittedAt": timestamp(row.get("submittedAt")), "status": status}


def fetch_profile(username):
    # A solved-set checkpoint must precede the profile observation. The later
    # recent-AC response is not evidence that every intervening AC was returned.
    profile_observed_after = now_iso()
    profile_data = graphql(PROFILE_QUERY, {"userSlug": username})
    profile = profile_data.get("userProfilePublicProfile")
    if profile is None:
        raise LeetCodeError("This public LeetCode CN profile was not found.", 404)
    try:
        progress = profile["submissionProgress"]
        counts = {row["difficulty"].upper(): nonnegative(row["count"]) for row in profile_data["userProfileUserQuestionProgress"]["numAcceptedQuestions"]}
        stats = {"solved": nonnegative(progress["acTotal"]), "totalSubmissions": nonnegative(progress["totalSubmissions"]), "easy": counts.get("EASY", 0), "medium": counts.get("MEDIUM", 0), "hard": counts.get("HARD", 0)}
        if sum(stats[key] for key in ("easy", "medium", "hard")) != stats["solved"]:
            raise ValueError("Inconsistent profile data")
    except (KeyError, TypeError, AttributeError, ValueError):
        raise LeetCodeError("LeetCode returned incomplete profile statistics.", 502) from None
    year = datetime.now(timezone.utc).year
    activity = graphql(ACTIVITY_QUERY, {"userSlug": username, "year": year}, activity=True)
    try:
        rows = activity["recentACSubmissions"]
        if not isinstance(rows, list) or len(rows) > MAX_RECORDS:
            raise ValueError()
        records = []
        for item in rows:
            question = item["question"]
            records.append(submission({"id": item["submissionId"], "problemSlug": question["titleSlug"], "title": question.get("translatedTitle") or question["titleSlug"], "titleEn": "", "frontendId": question["questionFrontendId"], "difficulty": None, "submittedAt": item["submitTime"], "status": "AC"}))
        raw_calendar = activity["userCalendar"]["submissionCalendar"]
        calendar_data = json.loads(raw_calendar) if isinstance(raw_calendar, str) else raw_calendar
        if not isinstance(calendar_data, dict) or len(calendar_data) > 366:
            raise ValueError()
        calendar = []
        for key, value in calendar_data.items():
            day = datetime.fromtimestamp(int(key), timezone.utc).date()
            if day.year != year:
                raise ValueError()
            calendar.append({"date": day.isoformat(), "submissions": nonnegative(value)})
    except (KeyError, TypeError, ValueError, OverflowError, OSError):
        raise LeetCodeError("LeetCode returned incomplete activity data. Your saved records are unchanged.", 502) from None
    return {"username": username, "displayName": (profile.get("profile") or {}).get("realName") or profile.get("username") or username, "stats": stats, "submissions": records, "calendar": sorted(calendar, key=lambda row: row["date"]), "calendarYear": year, "profileObservedAfter": profile_observed_after}


def empty_snapshot():
    return {"connection": None, "stats": None, "submissions": [], "problems": [], "calendar": [], "coverage": {"historyComplete": False, "problemPoolComplete": False, "knownAcceptedSubmissions": 0, "knownSolvedProblems": 0, "importedSubmissionCount": 0, "calendarMetric": "submissions", "calendarTimeZone": "UTC", "calendarYears": [], "historySource": "public_recent", "earliestKnownAcceptedAt": None, "latestKnownAcceptedAt": None, "note": "Public records include recent accepted submissions only; calendar counts are submissions, not distinct solved problems."}, "warning": None}


def get_record(conn, user_id):
    row = conn.execute("SELECT data_json, revision FROM user_leetcode WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return 0, empty_snapshot()
    data = row["data_json"]
    return int(row["revision"]), json.loads(data) if isinstance(data, str) else data


def public_snapshot(snapshot):
    # Due state is a projection of server time. Reading a schedule never writes
    # or advances it, and the generated fields never enter imported metadata.
    generated_at = now_iso()
    result = copy.deepcopy({key: value for key, value in snapshot.items() if not key.startswith("_")})
    # Keep user-provided history separate from the public-source ledger. Private
    # calendars may combine both, while Guardian continues to use only sync.
    result["syncedSubmissions"] = synced_accepted_submissions(snapshot)
    result["importedSubmissions"] = imported_accepted_submissions(snapshot, result["syncedSubmissions"])
    result["syncedLifetimeSolvedCount"] = synced_lifetime_solved_count(snapshot)
    result.setdefault("coverage", {}).update(personal_history_coverage(snapshot, result["importedSubmissions"]))
    state = personal_solved_set(snapshot)
    result["personalFirstSolveBounds"] = state["bounds"] if state else []
    result["problems"] = [{**problem, "review": problem_review(snapshot, problem, generated_at)} for problem in result.get("problems", [])]
    result["reviewPolicy"] = {"algorithm": "sm2", "version": 1, "generatedAt": generated_at}
    return result


def synced_lifetime_solved_count(snapshot):
    """Return the current profile's server-observed all-time distinct solves.

    Stats are written only by fresh_snapshot after the fixed public-profile
    fetch; import_metadata does not accept them. Require the same account binding
    as accepted records so legacy, disconnected, or mismatched snapshots cannot
    supply history. This number has no individual completion dates.
    """
    if not isinstance(snapshot, dict):
        return None
    connection, binding, stats = snapshot.get("connection"), snapshot.get("_syncedAcceptedConnection"), snapshot.get("stats")
    if not isinstance(connection, dict) or connection.get("site") != "cn" or not isinstance(stats, dict):
        return None
    if not connection.get("username") or not connection.get("linkedAt") or binding != {"username": connection["username"], "linkedAt": connection["linkedAt"]}:
        return None
    try:
        linked = timestamp(connection["linkedAt"])
        synced = timestamp(connection.get("lastSyncedAt"))
        if synced < linked or synced > now_iso():
            return None
        return nonnegative(stats.get("solved"))
    except LeetCodeError:
        return None


def synced_accepted_submissions(snapshot):
    connection = snapshot.get("connection") if isinstance(snapshot, dict) else None
    binding = snapshot.get("_syncedAcceptedConnection") if isinstance(snapshot, dict) else None
    if not isinstance(connection, dict) or connection.get("site") != "cn" or not isinstance(binding, dict):
        return []
    if not connection.get("username") or not connection.get("linkedAt") or binding != {"username": connection["username"], "linkedAt": connection["linkedAt"]}:
        return []
    result, seen = [], set()
    records = snapshot.get("_syncedAcceptedSubmissions", [])
    records = list(records) if isinstance(records, list) else []
    # Before the dedicated sync ledger existed, public submissions were already
    # saved in _records. Every version of the importer marked submission IDs;
    # recover only untouched public history, with the explicit ledger winning.
    imported = snapshot.get("_importedSubmissionIds", [])
    coverage = snapshot.get("coverage")
    import_count = coverage.get("importedSubmissionCount", 0) if isinstance(coverage, dict) else 0
    markers_valid = (isinstance(imported, list) and all(isinstance(value, str) for value in imported)
                     and type(import_count) is int and 0 <= import_count <= len(set(imported)))
    if markers_valid:
        imported_ids = set(imported)
        legacy = snapshot.get("_records", [])
        if isinstance(legacy, list):
            records.extend(row for row in legacy if isinstance(row, dict) and str(row.get("id")) not in imported_ids)
    for row in records:
        try:
            record = submission(row)
        except (LeetCodeError, TypeError, ValueError):
            continue
        if record["status"] == "AC" and record["id"] not in seen:
            result.append(record)
            seen.add(record["id"])
    return result


def imported_connection_matches(snapshot):
    connection = snapshot.get("connection") if isinstance(snapshot, dict) else None
    if not isinstance(connection, dict) or connection.get("site") != "cn" or not connection.get("username") or not connection.get("linkedAt"):
        return False
    # Older importers already checked the connected username and marked every
    # imported ID. Recover that history only with a matching public-sync binding;
    # an explicit new import binding always takes precedence, including mismatch.
    binding = snapshot.get("_importedAcceptedConnection", snapshot.get("_syncedAcceptedConnection"))
    return binding == {"username": connection["username"], "linkedAt": connection["linkedAt"]}


def imported_accepted_submissions(snapshot, synced=None):
    if not imported_connection_matches(snapshot):
        return []
    ids = imported_submission_ids(snapshot)
    if ids is None:
        return []
    seen = {row["id"] for row in (synced_accepted_submissions(snapshot) if synced is None else synced)}
    result = []
    records = snapshot.get("_records", [])
    for row in records if isinstance(records, list) else []:
        try:
            record = submission(row)
        except (LeetCodeError, TypeError, ValueError):
            continue
        if record["status"] == "AC" and record["id"] in ids and record["id"] not in seen:
            result.append(record)
            seen.add(record["id"])
    return sorted(result, key=lambda row: (row["submittedAt"], row["id"]), reverse=True)


def imported_submission_ids(snapshot):
    markers, coverage = snapshot.get("_importedSubmissionIds"), snapshot.get("coverage", {})
    count = coverage.get("importedSubmissionCount") if isinstance(coverage, dict) else None
    if not isinstance(markers, list) or not all(isinstance(value, str) for value in markers) or type(count) is not int or not 0 <= count <= len(set(markers)):
        return None
    return set(markers)


def personal_history_coverage(snapshot, imported):
    # This is a user's bounded completeness declaration, never proof of source
    # ownership and never the trusted coverage.historyComplete flag.
    through = None
    saved = snapshot.get("_importedHistoryCoverage")
    if imported_connection_matches(snapshot) and imported_submission_ids(snapshot) is not None and isinstance(saved, dict) and saved.get("complete") is True:
        try:
            value = timestamp(saved.get("capturedAt"))
            if value <= now_iso():
                through = value
        except LeetCodeError:
            pass
    return {"personalHistoryComplete": through is not None, "personalHistoryCompleteThrough": through,
            "personalHistorySource": "user_import" if through is not None or imported else "public_recent",
            "importedAcceptedSubmissions": len(imported)}


def personal_solved_set(snapshot, *, state=None, use_saved=True):
    """Private first-solve intervals, separate from complete submission history.

    Absence from an exhaustive solved set at A and an AC at B proves only that
    the first solve lies in (A, B]. Recent-feed overlap never proves every AC.
    The raw state is not importable and is scoped to this exact CN connection.
    """
    connection = snapshot.get("connection")
    if not isinstance(connection, dict) or connection.get("site") != "cn" or not connection.get("username") or not connection.get("linkedAt"):
        return None
    binding = {"username": connection["username"], "linkedAt": connection["linkedAt"]}
    public = synced_accepted_submissions(snapshot)
    records = [*public, *imported_accepted_submissions(snapshot, public)]
    current_time = now_iso()
    firsts = {}
    for row in records:
        if row["submittedAt"] > current_time:
            continue
        firsts[row["problemSlug"]] = min(firsts.get(row["problemSlug"], row["submittedAt"]), row["submittedAt"])
    if use_saved and "_personalSolvedSet" in snapshot:
        state = snapshot["_personalSolvedSet"]
    if state is None and (not use_saved or "_personalSolvedSet" not in snapshot):
        through = personal_history_coverage(snapshot, [])["personalHistoryCompleteThrough"]
        if not through:
            return None
        slugs = sorted(slug for slug, first in firsts.items() if first <= through)
        count = synced_lifetime_solved_count(snapshot)
        synced_at = connection.get("lastSyncedAt", "")
        if count is not None and synced_at <= through and count > len(slugs):
            return None
        state = {"binding": binding, "through": through, "slugs": slugs, "bounds": []}
    if not isinstance(state, dict) or state.get("binding") != binding:
        return None
    try:
        through = timestamp(state.get("through"))
        slugs = state.get("slugs")
        bounds = state.get("bounds")
        if through > current_time or not isinstance(slugs, list) or len(slugs) > MAX_RECORDS or any(not isinstance(slug, str) or not PROBLEM_SLUG.fullmatch(slug) for slug in slugs) or not isinstance(bounds, list) or len(bounds) > MAX_RECORDS:
            return None
        known = set(slugs)
        # A late-arriving older new problem disproves this checkpoint. Do not
        # reuse any intervals derived from an incomplete set.
        if known != {slug for slug, first in firsts.items() if first <= through}:
            return None
        validated = {}
        for bound in bounds:
            if not isinstance(bound, dict) or set(bound) != {"problemSlug", "after", "by"}:
                return None
            slug, after, by = bound["problemSlug"], timestamp(bound["after"]), timestamp(bound["by"])
            first = firsts.get(slug)
            if not first or not after < by <= current_time or not after < first or after > through:
                return None
            validated[slug] = {"problemSlug": slug, "after": after, "by": first}
        for slug, first in firsts.items():
            if slug not in known:
                validated[slug] = {"problemSlug": slug, "after": through, "by": first}
        return {"binding": binding, "through": through, "slugs": sorted(known),
                "bounds": sorted(validated.values(), key=lambda row: row["problemSlug"])}
    except (LeetCodeError, TypeError, ValueError):
        return None


def update_personal_solved_set(snapshot, *, prior=None, profile_observed_after=None, seed_import=False):
    # Imports can start a new, explicitly declared personal history checkpoint.
    # Otherwise use only the previous checkpoint, validated against the union.
    state = personal_solved_set(snapshot, state=prior, use_saved=False) if prior else None
    if seed_import:
        seeded = personal_solved_set({key: value for key, value in snapshot.items() if key != "_personalSolvedSet"})
        if seeded and (not state or seeded["through"] > state["through"]):
            state = seeded
    snapshot["_personalSolvedSet"] = state
    if profile_observed_after is None:
        return snapshot
    try:
        observed = timestamp(profile_observed_after)
        if observed > now_iso() or state and observed <= state["through"]:
            return snapshot
        count = synced_lifetime_solved_count(snapshot)
        public = synced_accepted_submissions(snapshot)
        records = [*public, *imported_accepted_submissions(snapshot, public)]
        slugs = sorted({row["problemSlug"] for row in records if row["submittedAt"] <= observed})
        if count is None or len(slugs) != count:
            return snapshot
        snapshot["_personalSolvedSet"] = {"binding": {"username": snapshot["connection"]["username"], "linkedAt": snapshot["connection"]["linkedAt"]},
            "through": observed, "slugs": slugs, "bounds": state["bounds"] if state else []}
        # Records newer than the profile request remain bounded by that request,
        # but cannot contribute to proving its solved set was exhaustive.
        snapshot["_personalSolvedSet"] = personal_solved_set(snapshot)
    except (LeetCodeError, TypeError, ValueError):
        pass
    return snapshot


def import_history_coverage(previous, payload, records, problems):
    if "capturedAt" not in payload and "coverage" not in payload:
        return None
    value = payload.get("coverage")
    fields = {"problemsComplete", "submissionsComplete", "complete", "skippedRecords", "reason"}
    if not isinstance(value, dict) or set(value) != fields or any(type(value.get(key)) is not bool for key in ("problemsComplete", "submissionsComplete", "complete")):
        raise LeetCodeError("Import coverage must contain the collector's completeness flags, skippedRecords and reason.")
    if type(value["skippedRecords"]) is not int or not 0 <= value["skippedRecords"] <= MAX_RECORDS or not isinstance(value["reason"], str) or len(value["reason"]) > 1000:
        raise LeetCodeError("Invalid import coverage details.")
    captured = timestamp(payload.get("capturedAt"))
    if captured > now_iso() or any(row["submittedAt"] > captured for row in records) or any(row.get("lastAcceptedAt") and row["lastAcceptedAt"] > captured for row in problems):
        raise LeetCodeError("Imported history must not extend beyond its capture time.")
    if value["complete"] != (value["problemsComplete"] and value["submissionsComplete"]):
        raise LeetCodeError("Import completeness flags disagree.")
    if value["complete"]:
        if value["skippedRecords"] or value["reason"].strip() or any(row["status"] != "AC" for row in records):
            raise LeetCodeError("Complete accepted history cannot contain skipped, failed or incomplete records.")
        if {row["problemSlug"] for row in records} != {row["slug"] for row in problems}:
            raise LeetCodeError("Complete history must contain accepted submissions for every imported solved problem.")
        incoming_ids = {row["id"] for row in records}
        if any(row["status"] == "AC" and row["submittedAt"] <= captured and row["id"] not in incoming_ids for row in previous.get("_records", [])):
            raise LeetCodeError("Complete history is missing previously saved accepted submissions.")
    return {"complete": value["complete"], "capturedAt": captured}


def problem_review(snapshot, problem, generated_at=None):
    generated_at = generated_at or now_iso()
    stored = snapshot.get("_reviewStates", {}).get(problem["slug"])
    if stored is not None:
        state = copy.deepcopy(stored)
    else:
        anchor = problem.get("lastAcceptedAt")
        state = {"version": 0, "source": "accepted" if anchor else "unknown", "anchorAt": anchor,
                 "lastReviewedAt": None, "nextReviewAt": add_review_days(anchor, 1) if anchor else None,
                 "reviewCount": 0, "intervalDays": 1 if anchor else 0,
                 "repetitions": 1 if anchor else 0, "easeFactor": 2.5, "lapses": 0, "lastRating": None}
    due = state.get("nextReviewAt")
    state["status"] = "uninitialized" if due is None else "due" if due <= generated_at else "upcoming"
    return state


def add_review_days(value, days):
    return (datetime.fromisoformat(value.replace("Z", "+00:00")) + timedelta(days=days)).astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def validate_review(snapshot, payload):
    fields = {"username", "linkedAt", "problemSlug", "rating", "eventId", "expectedVersion"}
    if not isinstance(payload, dict) or set(payload) != fields:
        raise LeetCodeError("Provide the linked account, problem, rating and review version only.")
    connection = snapshot.get("connection")
    if not connection or payload["username"] != connection.get("username") or payload["linkedAt"] != connection.get("linkedAt"):
        raise LeetCodeError("Your LeetCode connection changed. Reload before recording a review.", 409)
    slug = payload["problemSlug"]
    if not isinstance(slug, str) or not PROBLEM_SLUG.fullmatch(slug):
        raise LeetCodeError("Invalid review problem slug.")
    if not isinstance(payload["rating"], str) or payload["rating"] not in REVIEW_RATINGS:
        raise LeetCodeError("Choose again, hard, good or easy for this review.")
    if type(payload["expectedVersion"]) is not int or payload["expectedVersion"] < 0 or payload["expectedVersion"] > MAX_REVIEW_EVENTS:
        raise LeetCodeError("Invalid review version.")
    try:
        if not isinstance(payload["eventId"], str) or str(UUID(payload["eventId"])) != payload["eventId"]:
            raise ValueError()
    except (ValueError, AttributeError):
        raise LeetCodeError("A canonical UUID is required for this review event.") from None
    return next((problem for problem in snapshot.get("problems", []) if problem["slug"] == slug), None)


def review_is_replay(snapshot, payload):
    """A receipt is valid only in this connection, including after a CAS race."""
    problem = validate_review(snapshot, payload)
    if problem is None:
        raise LeetCodeError("This problem is not in your completed LeetCode collection.", 404)
    previous = snapshot.get("_reviewEvents", {}).get(payload["eventId"])
    if previous is None:
        return False
    if any(previous.get(key) != value for key, value in payload.items()):
        raise LeetCodeError("This review event was already used for a different action.", 409)
    return True


def apply_review(previous, payload):
    if review_is_replay(previous, payload):
        return previous
    problem = next(problem for problem in previous["problems"] if problem["slug"] == payload["problemSlug"])
    reviewed_at = now_iso()
    state = problem_review(previous, problem, reviewed_at)
    if payload["expectedVersion"] != state["version"]:
        raise LeetCodeError("This review changed in another session. Reload and try again.", 409)
    if len(previous.get("_reviewEvents", {})) >= MAX_REVIEW_EVENTS:
        raise LeetCodeError("The saved review history has reached its 20,000 event limit.", 413)
    quality = REVIEW_RATINGS[payload["rating"]]
    old_ease = state["easeFactor"]
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        repetitions = state["repetitions"] + 1
        interval = 1 if repetitions == 1 else 6 if repetitions == 2 else min(MAX_REVIEW_INTERVAL_DAYS, math.ceil(state["intervalDays"] * old_ease))
    ease = round(max(1.3, old_ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)), 8)
    updated = {"version": state["version"] + 1, "source": "review", "anchorAt": state["anchorAt"] or reviewed_at,
               "lastReviewedAt": reviewed_at, "nextReviewAt": add_review_days(reviewed_at, interval),
               "reviewCount": state["reviewCount"] + 1, "intervalDays": interval, "repetitions": repetitions,
               "easeFactor": ease, "lapses": state["lapses"] + (quality < 3), "lastRating": payload["rating"]}
    snapshot = copy.deepcopy(previous)
    snapshot.setdefault("_reviewStates", {})[problem["slug"]] = updated
    snapshot.setdefault("_reviewEvents", {})[payload["eventId"]] = {**payload, "reviewedAt": reviewed_at, "resultVersion": updated["version"]}
    return snapshot


def get_snapshot(conn, user_id):
    return public_snapshot(get_record(conn, user_id)[1])


def save_snapshot(conn, user_id, revision, snapshot):
    data = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    if len(data.encode("utf-8")) > MAX_SNAPSHOT_BYTES:
        raise LeetCodeError("Saved LeetCode metadata exceeds the 16 MiB limit.", 413)
    if revision == 0:
        cursor = conn.execute("INSERT INTO user_leetcode (user_id, data_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING", (user_id, data, now_iso()))
    else:
        cursor = conn.execute("UPDATE user_leetcode SET data_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?", (data, now_iso(), user_id, revision))
    if cursor.rowcount != 1:
        raise LeetCodeError("Your LeetCode connection changed. Reload and try again.", 409)
    return public_snapshot(snapshot)


def merge_metadata(previous, current):
    result = {**current, **previous, **{key: value for key, value in current.items() if value is not None and value != ""}}
    if previous.get("lastAcceptedAt") and current.get("lastAcceptedAt"):
        result["lastAcceptedAt"] = max(previous["lastAcceptedAt"], current["lastAcceptedAt"])
    return result


def derive(snapshot):
    records = snapshot.get("_records", [])
    accepted = sorted((row for row in records if row["status"] == "AC"), key=lambda row: (row["submittedAt"], row["id"]), reverse=True)
    problems = {row["slug"]: row for row in snapshot.get("_importedProblems", [])}
    for record in reversed(accepted):
        problem = {"slug": record["problemSlug"], **{key: record[key] for key in ("title", "titleEn", "frontendId", "difficulty")}, "lastAcceptedAt": record["submittedAt"]}
        problems[problem["slug"]] = merge_metadata(problems.get(problem["slug"], {}), problem)
    snapshot["submissions"] = accepted
    snapshot["problems"] = sorted(problems.values(), key=lambda row: (row.get("lastAcceptedAt") or "", row["slug"]), reverse=True)
    snapshot["coverage"].update({"knownAcceptedSubmissions": len(accepted), "knownSolvedProblems": len(problems), "earliestKnownAcceptedAt": accepted[-1]["submittedAt"] if accepted else None, "latestKnownAcceptedAt": accepted[0]["submittedAt"] if accepted else None})
    return snapshot


def merge_records(snapshot, incoming):
    records = {row["id"]: row for row in snapshot.get("_records", [])}
    for row in incoming:
        previous = records.get(row["id"])
        if previous and (previous["problemSlug"] != row["problemSlug"] or previous["submittedAt"] != row["submittedAt"]):
            raise LeetCodeError("An imported submission id conflicts with an existing record.")
        coverage = snapshot.get("_importedHistoryCoverage", {})
        if coverage.get("complete") and row["status"] == "AC" and (not previous or previous["status"] != "AC") and row["submittedAt"] <= coverage.get("capturedAt", ""):
            # A newly discovered older AC disproves that the earlier export was
            # complete. This applies to both subsequent imports and public sync.
            snapshot.pop("_importedHistoryCoverage", None)
        # Metadata enrichment is allowed; public accepted status must not regress.
        merged = merge_metadata(previous or {}, row)
        if previous and previous["status"] == "AC":
            merged["status"] = "AC"
        records[row["id"]] = merged
    if len(records) > MAX_RECORDS:
        raise LeetCodeError("The saved submission collection exceeds the 20,000 record limit.", 413)
    snapshot["_records"] = list(records.values())
    return derive(snapshot)


def canonical_import_record(record, public):
    if not public or record["status"] != "AC" or public["status"] != "AC":
        return record
    skew = abs(datetime.fromisoformat(record["submittedAt"].replace("Z", "+00:00")) - datetime.fromisoformat(public["submittedAt"].replace("Z", "+00:00")))
    if record["id"] != public["id"] or record["problemSlug"] != public["problemSlug"] or skew > timedelta(seconds=MAX_SOURCE_TIMESTAMP_SKEW_SECONDS):
        raise LeetCodeError("An imported submission id conflicts with an existing record.")
    return {**record, "submittedAt": public["submittedAt"]}


def fresh_snapshot(previous, incoming):
    username = incoming["username"]
    same_user = previous.get("connection") and previous["connection"]["username"] == username
    prior_solved = personal_solved_set(previous) if same_user else None
    snapshot = copy.deepcopy(previous) if same_user else empty_snapshot()
    now = now_iso()
    snapshot["connection"] = {"site": "cn", "username": username, "displayName": incoming["displayName"], "profileUrl": f"https://leetcode.cn/u/{username}/", "linkedAt": snapshot.get("connection", {}).get("linkedAt", now) if same_user else now, "lastSyncedAt": now}
    synced = {row["id"]: row for row in synced_accepted_submissions(snapshot)}
    imported_ids = imported_submission_ids(snapshot) if imported_connection_matches(snapshot) else None
    records = {row["id"]: row for row in snapshot.get("_records", [])}
    incoming_records = [submission(row) for row in incoming["submissions"]]
    for record in incoming_records:
        if record["status"] == "AC":
            if imported_ids and record["id"] in imported_ids and record["id"] not in synced and record["id"] in records:
                # The first public observation may canonicalize an existing
                # imported AC. Keep its identity/status so complete history is
                # not invalidated as though this were a newly discovered AC.
                records[record["id"]] = canonical_import_record(records[record["id"]], record)
            synced[record["id"]] = record
    snapshot["_records"] = list(records.values())
    if len(synced) > MAX_RECORDS:
        raise LeetCodeError("The synced submission collection exceeds the 20,000 record limit.", 413)
    snapshot["_syncedAcceptedConnection"] = {"username": username, "linkedAt": snapshot["connection"]["linkedAt"]}
    snapshot["_syncedAcceptedSubmissions"] = list(synced.values())
    snapshot["stats"] = incoming["stats"]
    year = incoming["calendarYear"]
    calendar = {row["date"]: row for row in snapshot["calendar"] if not row["date"].startswith(f"{year}-")}
    calendar.update({row["date"]: row for row in incoming["calendar"]})
    snapshot["calendar"] = sorted(calendar.values(), key=lambda row: row["date"])
    snapshot["coverage"]["calendarYears"] = sorted(set([*snapshot["coverage"].get("calendarYears", []), year]))
    snapshot["warning"] = None
    merge_records(snapshot, incoming_records)
    return update_personal_solved_set(snapshot, prior=prior_solved, profile_observed_after=incoming.get("profileObservedAfter"))


def sync_is_recent(snapshot):
    last_synced = (snapshot.get("connection") or {}).get("lastSyncedAt")
    return bool(last_synced and time.time() - datetime.fromisoformat(last_synced.replace("Z", "+00:00")).timestamp() < MIN_SYNC_SECONDS)


def import_metadata(previous, payload):
    if not isinstance(payload, dict) or set(payload) - {"username", "submissions", "problems", "capturedAt", "coverage"}:
        raise LeetCodeError("Import username, submissions, problem metadata and optional history coverage only.")
    connection = previous.get("connection")
    if not connection:
        raise LeetCodeError("Connect your LeetCode profile before importing records.", 409)
    if payload.get("username") != connection["username"]:
        raise LeetCodeError("The imported username must match your connected LeetCode profile.")
    records, problems = payload.get("submissions", []), payload.get("problems", [])
    if not isinstance(records, list) or not isinstance(problems, list) or len(records) + len(problems) > MAX_RECORDS or not (records or problems):
        raise LeetCodeError("Import between 1 and 20,000 metadata records.")
    public = {row["id"]: row for row in synced_accepted_submissions(previous)}
    validated_records = []
    for row in records:
        record = submission(row)
        validated_records.append(canonical_import_record(record, public.get(record["id"])))
    validated_problems = []
    for row in problems:
        if not isinstance(row, dict) or set(row) - {"slug", "title", "titleEn", "frontendId", "difficulty", "lastAcceptedAt"}:
            raise LeetCodeError("Problem imports may contain metadata only.")
        validated_problems.append({**metadata(row), "lastAcceptedAt": timestamp(row.get("lastAcceptedAt"), nullable=True)})
    history_coverage = import_history_coverage(previous, payload, validated_records, validated_problems)
    snapshot = copy.deepcopy(previous)
    imported = {row["slug"]: row for row in snapshot.get("_importedProblems", [])}
    for row in validated_problems:
        imported[row["slug"]] = merge_metadata(imported.get(row["slug"], {}), row)
    if len(imported) > MAX_RECORDS:
        raise LeetCodeError("The saved problem collection exceeds the 20,000 record limit.", 413)
    snapshot["_importedProblems"] = list(imported.values())
    ids = set(snapshot.get("_importedSubmissionIds", [])) | {row["id"] for row in validated_records}
    snapshot["_importedSubmissionIds"] = sorted(ids)
    snapshot["_importedAcceptedConnection"] = {"username": connection["username"], "linkedAt": connection["linkedAt"]}
    snapshot["coverage"].update({"historySource": "public_recent_and_import", "importedSubmissionCount": len(ids), "lastImportedAt": now_iso()})
    merge_records(snapshot, validated_records)
    # Union imports are idempotent. A later partial export cannot erase a prior
    # complete cutoff, and an older complete export cannot move it backwards.
    prior_coverage = snapshot.get("_importedHistoryCoverage", {})
    if history_coverage and history_coverage["complete"] and (not prior_coverage.get("complete") or history_coverage["capturedAt"] > prior_coverage.get("capturedAt", "")):
        snapshot["_importedHistoryCoverage"] = history_coverage
    return update_personal_solved_set(snapshot, prior=personal_solved_set(previous), seed_import=True)
