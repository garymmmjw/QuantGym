"""Invite-only admission, with hashed credentials and transactional redemption."""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone


INVITATION_SCHEMA = """
CREATE TABLE IF NOT EXISTS registration_invitations (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  email_norm TEXT,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 1000),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0 AND uses <= max_uses),
  expires_at TEXT,
  revoked_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registration_invitations_created
ON registration_invitations (created_at DESC);
CREATE TABLE IF NOT EXISTS invitation_redemptions (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES registration_invitations(id),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email_norm TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  UNIQUE (invitation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_invitation
ON invitation_redemptions (invitation_id, redeemed_at);
"""


class InvitationError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def stamp(value=None):
    if value is None:
        value = datetime.now(timezone.utc)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return str(value)


def unavailable():
    return InvitationError(400, "Invalid or unavailable invitation code")


def code_hash(code):
    value = str(code or "").strip()
    if not value:
        raise InvitationError(400, "Invitation code is required")
    if len(value) > 128:
        raise unavailable()
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def validate_invitation(conn, code, email):
    """Preflight only: requesting an email must never use up an invitation."""
    row = conn.execute(
        """
        SELECT id FROM registration_invitations
        WHERE code_hash = ? AND revoked_at IS NULL AND uses < max_uses
          AND (expires_at IS NULL OR expires_at > ?)
          AND (email_norm IS NULL OR email_norm = ?)
        """,
        (code_hash(code), stamp(), str(email or "").strip().lower()),
    ).fetchone()
    if not row:
        raise unavailable()
    return row["id"]


def redeem_invitation(conn, invitation_id, user_id, email):
    """Call after verification and user INSERT, inside the same transaction.

    The conditional UPDATE serializes concurrent redeemers in SQLite and
    Postgres. A later registration error rolls back both usage and its log.
    """
    now = stamp()
    email_norm = str(email or "").strip().lower()
    result = conn.execute(
        """
        UPDATE registration_invitations SET uses = uses + 1
        WHERE id = ? AND revoked_at IS NULL AND uses < max_uses
          AND (expires_at IS NULL OR expires_at > ?)
          AND (email_norm IS NULL OR email_norm = ?)
        """,
        (invitation_id, now, email_norm),
    )
    if result.rowcount != 1:
        raise unavailable()
    conn.execute(
        """
        INSERT INTO invitation_redemptions (id, invitation_id, user_id, email_norm, redeemed_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (secrets.token_urlsafe(16), invitation_id, user_id, email_norm, now),
    )


def invitation_metadata(row):
    invitation = dict(row)
    expires_at = stamp(invitation["expires_at"]) if invitation["expires_at"] else None
    revoked_at = stamp(invitation["revoked_at"]) if invitation["revoked_at"] else None
    uses, max_uses = int(invitation["uses"]), int(invitation["max_uses"])
    status = "active"
    if revoked_at:
        status = "revoked"
    elif expires_at and expires_at <= stamp():
        status = "expired"
    elif uses >= max_uses:
        status = "exhausted"
    return {
        "id": invitation["id"], "label": invitation["label"],
        "email": invitation["email_norm"] or "", "maxUses": max_uses, "uses": uses,
        "expiresAt": expires_at, "revokedAt": revoked_at,
        "createdBy": invitation["created_by"], "createdAt": stamp(invitation["created_at"]),
        "status": status,
    }


METADATA_COLUMNS = "id, label, email_norm, max_uses, uses, expires_at, revoked_at, created_by, created_at"


def list_invitations(conn, limit=200):
    rows = conn.execute(
        f"SELECT {METADATA_COLUMNS} FROM registration_invitations ORDER BY created_at DESC, id DESC LIMIT ?",
        (max(1, min(200, limit)),),
    ).fetchall()
    return [invitation_metadata(row) for row in rows]


def bounded_integer(data, name, default, maximum):
    value = data.get(name, default)
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= maximum:
        raise InvitationError(400, f"{name} must be an integer between 1 and {maximum}")
    return value


def create_invitations(conn, data, actor_user_id):
    count = bounded_integer(data, "count", 1, 50)
    max_uses = bounded_integer(data, "maxUses", 1, 1000)
    days = bounded_integer(data, "expiresInDays", 7, 365)
    now = datetime.now(timezone.utc)
    expires_at = stamp(now + timedelta(days=days))
    if "expiresAt" in data:
        if data["expiresAt"] is None:
            expires_at = None
        else:
            try:
                expiry = datetime.fromisoformat(str(data["expiresAt"]).replace("Z", "+00:00"))
                if expiry.tzinfo is None or not now < expiry <= now + timedelta(days=365):
                    raise ValueError()
                expires_at = stamp(expiry)
            except (ValueError, TypeError):
                raise InvitationError(400, "expiresAt must be a future timestamp within 365 days")
    email = str(data.get("email") or "").strip().lower()
    if email and (len(email) > 320 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)):
        raise InvitationError(400, "Valid email is required")
    label = str(data.get("label") or "").strip()
    if len(label) > 100:
        raise InvitationError(400, "Invitation label must be at most 100 characters")
    result = []
    for _ in range(count):
        invitation_id = secrets.token_urlsafe(16)
        # 192 bits of entropy; plaintext exists only in this creation response.
        code = "QG-" + secrets.token_urlsafe(24)
        conn.execute(
            """
            INSERT INTO registration_invitations
              (id, code_hash, label, email_norm, max_uses, uses, expires_at, revoked_at, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)
            """,
            (invitation_id, code_hash(code), label or f"Invitation {invitation_id[:6]}",
             email or None, max_uses, expires_at, actor_user_id, stamp(now)),
        )
        row = conn.execute(
            f"SELECT {METADATA_COLUMNS} FROM registration_invitations WHERE id = ?", (invitation_id,),
        ).fetchone()
        result.append({**invitation_metadata(row), "code": code})
    return result


def revoke_invitation(conn, invitation_id):
    result = conn.execute(
        "UPDATE registration_invitations SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?",
        (stamp(), invitation_id),
    )
    if result.rowcount != 1:
        raise InvitationError(404, "Invitation not found")
    row = conn.execute(
        f"SELECT {METADATA_COLUMNS} FROM registration_invitations WHERE id = ?", (invitation_id,),
    ).fetchone()
    return invitation_metadata(row)
