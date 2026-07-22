"""Secret-safe records shared by the authentication service and repositories."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from pydantic import SecretStr


@dataclass(frozen=True, slots=True, repr=False)
class SessionRecord:
    id: UUID
    user_id: UUID
    token_hash: str
    csrf_hash: str
    expires_at: datetime
    last_seen_at: datetime
    revoked_at: datetime | None
    created_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class AuthChallengeRecord:
    id: UUID
    user_id: UUID | None
    kind: str
    token_hash: str
    state_hash: str | None
    nonce_hash: str | None
    pkce_verifier_ciphertext: bytes | None
    pkce_key_id: str | None
    redirect_path: str | None
    expires_at: datetime
    consumed_at: datetime | None
    created_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class IdentityRecord:
    id: UUID
    user_id: UUID
    provider: str
    subject: str
    linked_email: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class SessionIssue:
    """Raw cookie values that must exist only until the HTTP response is built."""

    session_token: SecretStr
    csrf_token: SecretStr
    expires_at: datetime

    def __repr__(self) -> str:
        return "SessionIssue(session_token=SecretStr('**********'), csrf_token=SecretStr('**********'))"


@dataclass(frozen=True, slots=True, repr=False)
class AuthenticatedPrincipal:
    session: SessionRecord
    user_id: UUID
