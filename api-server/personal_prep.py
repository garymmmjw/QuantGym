"""Private, versioned personal preparation storage shared by SQLite/Postgres.

This table is intentionally separate from user_states and community. No public
catalog, profile, or leaderboard query should join or serialize its contents.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

PERSONAL_PREP_VERSION = 1
MAX_PERSONAL_PREP_BYTES = 8 * 1024 * 1024
MAX_PERSONAL_PREP_RECORDS = 100_000
PERSONAL_PREP_FIELDS = {
    "mentalSettings", "activeTrial", "trials", "dailySettings", "dailySessions", "activities"
}


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
    if not isinstance(data, dict) or not PERSONAL_PREP_FIELDS.issubset(data) or set(data) - PERSONAL_PREP_FIELDS - {"removedActivityIds"}:
        raise PersonalPrepValidationError("A complete personal preparation state is required.")
    data = {**data, "removedActivityIds": data.get("removedActivityIds", [])}
    removed = data["removedActivityIds"]
    if not isinstance(removed, list) or len(removed) > MAX_PERSONAL_PREP_RECORDS or any(not valid_record_id(item) for item in removed) or len(set(removed)) != len(removed):
        raise PersonalPrepValidationError("Invalid removedActivityIds.")
    for field in ("mentalSettings", "dailySettings"):
        if data[field] is not None and not isinstance(data[field], dict):
            raise PersonalPrepValidationError(f"Invalid {field}.")
    active = data["activeTrial"]
    if active is not None and (not isinstance(active, dict) or not valid_record_id(active.get("id"))):
        raise PersonalPrepValidationError("Invalid activeTrial.")
    for field in ("trials", "dailySessions", "activities"):
        rows = data[field]
        if not isinstance(rows, list) or len(rows) > MAX_PERSONAL_PREP_RECORDS:
            raise PersonalPrepValidationError(f"Invalid {field} collection.")
        ids = set()
        for row in rows:
            if not isinstance(row, dict) or not valid_record_id(row.get("id")) or row["id"] in ids:
                raise PersonalPrepValidationError(f"Invalid or duplicate record in {field}.")
            ids.add(row["id"])
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
    return {
        "version": PERSONAL_PREP_VERSION,
        "revision": int(row["revision"]),
        "data": json.loads(stored) if isinstance(stored, str) else stored,
        "updatedAt": updated_at,
    }


def save_personal_prep(conn, user_id: str, base_revision: int, data_json: str) -> tuple[bool, dict]:
    """Atomically compare-and-swap, returning the current row on a stale write.

    No check-then-insert race: the unique owner key chooses the first writer.
    Existing rows update only when their revision still matches the client.
    The caller must commit before acknowledging success over HTTP.
    """
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
