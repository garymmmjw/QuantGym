"""Merge only free-practice fields; keep the legacy problem-state write rules."""

from datetime import datetime, timezone
import math


WINDOW_MS = 24 * 60 * 60 * 1000
OUTCOMES = {"correct", "idea_wrong", "wrong"}


def _timestamp(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return None
    try:
        if isinstance(value, str):
            if not value.strip():
                return None
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            result = parsed.timestamp() * 1000
        else:
            result = float(value)
        if not math.isfinite(result):
            return None
        # API clients send canonical ISO timestamps. Bound numbers to dates
        # representable by this server before constructing their ISO form.
        datetime.fromtimestamp(result / 1000, timezone.utc)
        return result
    except (ValueError, TypeError, OverflowError, OSError):
        return None


def _iso(value):
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _id(value):
    return value.strip() if isinstance(value, str) and 0 < len(value.strip()) <= 512 else ""


def _seconds(value):
    try:
        number = float(0 if value is None or value == "" else value)
        return max(0, math.floor(number)) if math.isfinite(number) else 0
    except (TypeError, ValueError, OverflowError):
        return 0


def _normalize_attempt(value):
    if not isinstance(value, dict) or not _id(value.get("id")) or not isinstance(value.get("outcome"), str) or value["outcome"] not in OUTCOMES:
        return None
    started, recorded = _timestamp(value.get("startedAt")), _timestamp(value.get("recordedAt"))
    if started is None or recorded is None or started > recorded:
        return None
    updated = _timestamp(value.get("updatedAt"))
    return {
        "id": _id(value["id"]), "startedAt": _iso(started), "recordedAt": _iso(recorded),
        "updatedAt": _iso(max(recorded, updated) if updated is not None else recorded),
        "outcome": value["outcome"],
        "elapsedSeconds": _seconds(value["elapsedSeconds"] if "elapsedSeconds" in value else (recorded - started) / 1000),
        "answerViewed": value.get("answerViewed") is True,
        "hintViewed": value.get("hintViewed") is True,
    }


def normalize_free_practice_session(value):
    if not isinstance(value, dict) or not _id(value.get("id")):
        return None
    started = _timestamp(value.get("startedAt"))
    if started is None:
        return None
    return {
        "id": _id(value["id"]), "startedAt": _iso(started),
        "answerViewed": value.get("answerViewed") is True,
        "hintViewed": value.get("hintViewed") is True,
    }


def _leaf_records(value):
    parent = _normalize_attempt(value)
    if parent is None:
        return []
    raw_leaves = value.get("syncRecords")
    leaves = [item for raw in raw_leaves if (item := _normalize_attempt(raw))] if isinstance(raw_leaves, list) else []
    # A group's leaves, rather than its derived parent, preserve the original
    # 24-hour anchors when an older device syncs records in a different order.
    return leaves if any(leaf["id"] == parent["id"] for leaf in leaves) else [parent]


def _latest(left, right):
    return max((left, right), key=lambda item: (_timestamp(item["updatedAt"]), item["outcome"]))


def _same_id(left, right):
    earliest = min((left, right), key=lambda item: (_timestamp(item["recordedAt"]), item["elapsedSeconds"]))
    return {
        **_latest(left, right), "id": left["id"],
        "startedAt": _iso(min(_timestamp(left["startedAt"]), _timestamp(right["startedAt"]))),
        "recordedAt": earliest["recordedAt"], "elapsedSeconds": earliest["elapsedSeconds"],
        "answerViewed": left["answerViewed"] or right["answerViewed"],
        "hintViewed": left["hintViewed"] or right["hintViewed"],
    }


def _collapse_group(records):
    latest = max(records, key=lambda item: (_timestamp(item["updatedAt"]), item["outcome"]))
    result = {
        **records[0], "outcome": latest["outcome"], "updatedAt": latest["updatedAt"],
        "startedAt": _iso(min(_timestamp(item["startedAt"]) for item in records)),
        "answerViewed": any(item["answerViewed"] for item in records),
        "hintViewed": any(item["hintViewed"] for item in records),
    }
    if len(records) > 1:
        result["syncRecords"] = [dict(item) for item in records]
    return result


def merge_free_practice_attempts(lists):
    by_id = {}
    for rows in lists if isinstance(lists, list) else []:
        for raw in rows if isinstance(rows, list) else [rows]:
            for record in _leaf_records(raw):
                previous = by_id.get(record["id"])
                by_id[record["id"]] = _same_id(previous, record) if previous else record
    ordered = sorted(by_id.values(), key=lambda item: (_timestamp(item["recordedAt"]), item["id"]))
    groups, current = [], []
    for record in ordered:
        if current and _timestamp(record["recordedAt"]) >= _timestamp(current[0]["recordedAt"]) + WINDOW_MS:
            groups.append(_collapse_group(current))
            current = []
        current.append(record)
    if current:
        groups.append(_collapse_group(current))
    return groups


def merge_free_practice_state(existing, incoming):
    """Preserve new history against stale/older clients without merging old fields."""
    existing = existing if isinstance(existing, dict) else {}
    incoming = incoming if isinstance(incoming, dict) else {}
    result = dict(incoming)
    attempts = merge_free_practice_attempts([existing.get("freePracticeAttempts", []), incoming.get("freePracticeAttempts", [])])
    if "freePracticeAttempts" in existing or "freePracticeAttempts" in incoming:
        result["freePracticeAttempts"] = attempts
    previous_has_session = "freePracticeSession" in existing
    next_has_session = "freePracticeSession" in incoming
    if previous_has_session or next_has_session:
        previous = normalize_free_practice_session(existing.get("freePracticeSession"))
        next_session = normalize_free_practice_session(incoming.get("freePracticeSession"))
        source = next_session if next_has_session else previous
        if previous_has_session and next_has_session:
            old_time, new_time = _timestamp(existing.get("updatedAt")) or 0, _timestamp(incoming.get("updatedAt")) or 0
            if old_time > new_time or (old_time == new_time and previous is None):
                source = previous
        recorded_ids = {record["id"] for item in attempts for record in [item, *item.get("syncRecords", [])]}
        result["freePracticeSession"] = None if source and source["id"] in recorded_ids else source
    return result
