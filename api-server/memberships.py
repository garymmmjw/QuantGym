"""Administrator-managed membership, separate from registration admission."""

import re
from datetime import datetime, timezone


MEMBERSHIP_SCHEMA = """
CREATE TABLE IF NOT EXISTS memberships (
  email_norm TEXT PRIMARY KEY,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT
);
"""


class MembershipError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def normalized_member_email(value):
    email = str(value or "").strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise MembershipError(400, "Valid membership email is required")
    return email


def timestamp(value=None):
    return (value or datetime.now(timezone.utc)).isoformat(timespec="seconds").replace("+00:00", "Z")


def membership_payload(row):
    return {"email": row["email_norm"], "addedBy": row["added_by"],
            "createdAt": timestamp(row["created_at"]) if isinstance(row["created_at"], datetime) else row["created_at"],
            "updatedAt": timestamp(row["updated_at"]) if isinstance(row["updated_at"], datetime) else row["updated_at"]}


def has_membership(conn, email):
    return bool(conn.execute("SELECT 1 FROM memberships WHERE email_norm = ? AND revoked_at IS NULL",
                             (str(email or "").strip().lower(),)).fetchone())


def list_memberships(conn):
    rows = conn.execute("SELECT * FROM memberships WHERE revoked_at IS NULL ORDER BY updated_at DESC, email_norm").fetchall()
    return [membership_payload(row) for row in rows]


def add_membership(conn, email, actor_id):
    email = normalized_member_email(email)
    now = timestamp()
    conn.execute("""
        INSERT INTO memberships (email_norm, added_by, created_at, updated_at, revoked_at)
        VALUES (?, ?, ?, ?, NULL)
        ON CONFLICT(email_norm) DO UPDATE SET added_by = excluded.added_by,
          updated_at = excluded.updated_at, revoked_at = NULL
        """, (email, actor_id, now, now))
    return membership_payload(conn.execute("SELECT * FROM memberships WHERE email_norm = ?", (email,)).fetchone())


def remove_membership(conn, email):
    email = normalized_member_email(email)
    now = timestamp()
    conn.execute("UPDATE memberships SET revoked_at = ?, updated_at = ? WHERE email_norm = ? AND revoked_at IS NULL",
                 (now, now, email))
    return email
