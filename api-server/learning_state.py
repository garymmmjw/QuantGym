"""Private account learning snapshots with atomic optimistic concurrency.

This is personal progress, not an authoritative examination result. The browser
validates/replays the scoring domain; this boundary validates its storage shape,
size and JSON safety. Never join these snapshots into public profiles/catalogs.
"""

from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timezone

LEARNING_STATE_VERSION = 1
MAX_LEARNING_STATE_BYTES = 10 * 1024 * 1024
MAX_RECORDS = 10000
FORBIDDEN_KEYS = {
    "__proto__", "prototype", "constructor", "__defineGetter__", "__defineSetter__",
    "hasOwnProperty", "__lookupGetter__", "__lookupSetter__", "isPrototypeOf",
    "propertyIsEnumerable", "toString", "valueOf", "toLocaleString",
}
TRAINING_FIELDS = {
    "schemaVersion", "id", "createdAt", "updatedAt", "prefs", "progress",
    "attempts", "solvedHistory", "events",
}
EVENT_FIELDS = {
    "id", "problemId", "x", "h", "reveal", "at", "outcome", "abilityFrozen",
    "deltaXp", "progressBefore", "progressAfter", "readinessBefore",
    "readinessAfter", "effectiveModel",
}


class LearningStateValidationError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def require(condition, message):
    if not condition:
        raise LearningStateValidationError(message)


def integer(value, lo=0, hi=8640000000000000):
    return type(value) is int and lo <= value <= hi


def identifier(value):
    return (isinstance(value, str) and len(value) <= 128 and value not in FORBIDDEN_KEYS
            and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]*", value)))


def shape(value, required, optional=()):
    return isinstance(value, dict) and set(required).issubset(value) and not set(value) - set(required) - set(optional)


def safe_json(value, depth=0, budget=None):
    if budget is None:
        budget = [0]
    budget[0] += 1
    require(depth <= 14 and budget[0] <= 500000, "Learning state exceeds the supported size or depth.")
    if value is None or isinstance(value, (str, bool)):
        return
    if type(value) in (int, float):
        try:
            finite = math.isfinite(value)
        except OverflowError:
            finite = False
        require(finite, "Learning state must contain finite JSON numbers.")
        return
    require(isinstance(value, (list, dict)), "Learning state must contain JSON values only.")
    values = value
    if isinstance(value, dict):
        require(not any(key in FORBIDDEN_KEYS for key in value), "Learning state contains an unsafe field.")
        values = value.values()
    for item in values:
        safe_json(item, depth + 1, budget)


def validate_learn(value):
    if value is None:
        return
    require(shape(value, {"completed", "xp", "days", "notes"}, {"awards", "renderer"}), "Invalid Learn progress fields.")
    valid_id = lambda key: isinstance(key, str) and bool(re.fullmatch(r"lec-[a-z0-9][a-z0-9-]{2,48}", key))
    completed = value["completed"]
    require(isinstance(completed, list) and len(completed) <= 1000
            and all(valid_id(key) for key in completed) and len(set(completed)) == len(completed), "Invalid completed lessons.")
    require(integer(value["xp"], 0, 120000), "Invalid Learn XP.")
    awards = value.get("awards", {})
    require(isinstance(awards, dict) and len(awards) <= 1000, "Invalid Learn awards.")
    total, migrated = 0, len(set(completed) - set(awards))
    for key, award in awards.items():
        require(valid_id(key) and isinstance(award, dict), "Invalid Learn award.")
        if award.get("migrated") is True and award.get("xpAwarded") is None:
            require(set(award) == {"migrated", "xpAwarded"}, "Invalid legacy Learn award.")
            migrated += 1
        else:
            require(shape(award, {"completedAt", "xpAwarded"}) and isinstance(award["completedAt"], str)
                    and len(award["completedAt"]) <= 128 and integer(award["xpAwarded"], 20, 120), "Invalid Learn award.")
            total += award["xpAwarded"]
    require(total <= value["xp"] <= total + 120 * migrated, "Learn XP does not match its award ledger.")
    days = value["days"]
    require(isinstance(days, list) and len(days) <= MAX_RECORDS, "Invalid learning days.")
    for day in days:
        try:
            valid = isinstance(day, str) and len(day) == 10 and date.fromisoformat(day).isoformat() == day
        except ValueError:
            valid = False
        require(valid, "Invalid learning day.")
    require(isinstance(value["notes"], list) and len(value["notes"]) <= MAX_RECORDS
            and len(json.dumps(value["notes"], ensure_ascii=False, separators=(",", ":"))) <= 2000000, "Invalid Learn notes.")
    renderer = value.get("renderer", {})
    require(isinstance(renderer, dict) and len(renderer) <= MAX_RECORDS
            and len(json.dumps(renderer, ensure_ascii=False, separators=(",", ":"))) <= 4000000, "Invalid lesson interaction state.")


def validate_training(value):
    if value is None:
        return
    require(shape(value, TRAINING_FIELDS) and integer(value["schemaVersion"], 1, 1), "Invalid training profile fields or version.")
    require(identifier(value["id"]) and integer(value["createdAt"]) and integer(value["updatedAt"])
            and value["createdAt"] <= value["updatedAt"], "Invalid training profile identity or timestamps.")
    prefs = value["prefs"]
    require(shape(prefs, {"role", "level", "rate", "targets", "targetFirms", "calibration"}), "Invalid training preferences.")
    require(all(isinstance(prefs[key], str) and 0 < len(prefs[key]) <= 128 for key in ("role", "level"))
            and isinstance(prefs["rate"], dict) and len(prefs["rate"]) <= 100, "Invalid training preferences.")
    for key, limit in (("targets", 100), ("targetFirms", 100), ("calibration", 1000)):
        require(isinstance(prefs[key], list) and len(prefs[key]) <= limit, "Invalid training preference collection.")
    for field in ("progress", "attempts", "solvedHistory"):
        records = value[field]
        require(isinstance(records, dict) and len(records) <= MAX_RECORDS
                and all(identifier(key) for key in records), "Invalid training records.")
    require(all(item in ("solved", "attempted") for item in value["progress"].values()), "Invalid problem progress.")
    for attempt in value["attempts"].values():
        require(shape(attempt, {"x", "at"}, {"h", "pc", "r"}) and integer(attempt["x"], 0, 1)
                and integer(attempt["at"]), "Invalid training attempt.")
    for award in value["solvedHistory"].values():
        require(shape(award, {"firstSolvedAt", "xpAwarded", "category", "diff"})
                and integer(award["firstSolvedAt"]) and integer(award["xpAwarded"], 0, 50)
                and isinstance(award["category"], str) and isinstance(award["diff"], str), "Invalid training award.")
    events = value["events"]
    require(isinstance(events, list) and len(events) <= MAX_RECORDS, "Invalid training events.")
    ids = set()
    for event in events:
        require(shape(event, EVENT_FIELDS, {"pc"}) and identifier(event["id"]) and event["id"] not in ids
                and identifier(event["problemId"]) and integer(event["at"]) and integer(event["x"], 0, 1)
                and type(event["h"]) is bool and type(event["reveal"]) is bool, "Invalid or duplicate training event.")
        ids.add(event["id"])


def validate_learning_state_request(payload):
    require(shape(payload, {"version", "baseRevision", "data"}), "Expected version, baseRevision and learning data only.")
    require(integer(payload["version"], 1, 1), "Unsupported learning state version.")
    require(integer(payload["baseRevision"], 0, 2147483646), "baseRevision must be a nonnegative integer.")
    data = payload["data"]
    require(shape(data, {"learn", "training"}), "Expected Learn progress and training profile only.")
    safe_json(data)
    try:
        encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        size = len(encoded.encode("utf-8"))
    except (TypeError, ValueError, RecursionError, UnicodeError):
        raise LearningStateValidationError("Learning state must contain finite JSON values.")
    if size > MAX_LEARNING_STATE_BYTES:
        raise LearningStateValidationError("Learning state exceeds the 10 MiB limit.", 413)
    validate_learn(data["learn"])
    validate_training(data["training"])
    return payload["baseRevision"], encoded


def get_learning_state(conn, user_id):
    row = conn.execute("SELECT data_json, revision, updated_at FROM user_learning_states WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return {"version": LEARNING_STATE_VERSION, "revision": 0, "data": None, "updatedAt": None}
    updated_at = row["updated_at"]
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat().replace("+00:00", "Z")
    data = json.loads(row["data_json"]) if isinstance(row["data_json"], str) else row["data_json"]
    return {"version": LEARNING_STATE_VERSION, "revision": int(row["revision"]), "data": data, "updatedAt": updated_at}


def save_learning_state(conn, user_id, base_revision, data_json):
    """One atomic write wins; a stale writer gets the current account snapshot.

    Do not read before writing: SQLite deferred transactions must acquire their
    write lock before a competing initial insert. PostgreSQL's unique owner key
    and revision predicate provide the same compare-and-swap semantics.
    """
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if base_revision == 0:
        cursor = conn.execute(
            "INSERT INTO user_learning_states (user_id, data_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING",
            (user_id, data_json, now),
        )
    else:
        cursor = conn.execute(
            "UPDATE user_learning_states SET data_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?",
            (data_json, now, user_id, base_revision),
        )
    return cursor.rowcount == 1, get_learning_state(conn, user_id)
