"""SQLAlchemy persistence for short-lived Google OAuth challenges."""

from __future__ import annotations

import asyncio
import hmac
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any, TypeVar
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from .google import (
    ClaimedGoogleOAuthChallenge,
    GoogleOAuthChallengeForPersistence,
    PkceVerifierDeletion,
)


_GOOGLE_OAUTH_KIND = "google_oauth"
_SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
_Result = TypeVar("_Result")
GOOGLE_OAUTH_ACTIVE_CAPACITY = 4_096
_GOOGLE_OAUTH_CAPACITY_LOCK_KEY = 0x5155474F41555448


class SqlAlchemyGoogleOAuthChallengeStore:
    """Persist one-time Google OAuth challenges in short SQL transactions.

    The application uses a synchronous SQLAlchemy engine.  Each public async
    operation therefore delegates one *complete* transaction to one worker
    thread.  A connection never crosses thread boundaries and all row locks are
    released before an awaiter receives a result.
    """

    def __init__(
        self,
        engine: Any,
        *,
        capacity: int = GOOGLE_OAUTH_ACTIVE_CAPACITY,
    ) -> None:
        if (
            engine is None
            or isinstance(engine, AsyncEngine)
            or not callable(getattr(engine, "begin", None))
        ):
            raise TypeError("a synchronous SQLAlchemy engine is required")
        if not isinstance(capacity, int) or not 1 <= capacity <= 100_000:
            raise ValueError("Google OAuth challenge capacity is invalid")
        self._engine = engine
        self._capacity = capacity

    def __repr__(self) -> str:
        return "SqlAlchemyGoogleOAuthChallengeStore(engine=<redacted>)"

    async def create(self, challenge: GoogleOAuthChallengeForPersistence) -> bool:
        if not isinstance(challenge, GoogleOAuthChallengeForPersistence):
            raise TypeError("a Google OAuth persistence challenge is required")
        return await self._in_worker(self._create_sync, challenge)

    async def claim_and_delete_verifier(
        self,
        *,
        state_hash: str,
        claimed_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> ClaimedGoogleOAuthChallenge | None:
        _require_hash(state_hash)
        claimed_at = _require_aware_datetime(claimed_at)
        _require_matching_deletion(verifier_deletion, expected_at=claimed_at)
        return await self._in_worker(
            self._claim_and_delete_verifier_sync,
            state_hash,
            claimed_at,
            verifier_deletion,
        )

    async def delete_expired_verifiers(
        self,
        *,
        expired_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> None:
        expired_at = _require_aware_datetime(expired_at)
        _require_matching_deletion(verifier_deletion, expected_at=expired_at)
        await self._in_worker(
            self._delete_expired_verifiers_sync,
            expired_at,
            verifier_deletion,
        )

    async def _in_worker(
        self,
        operation: Callable[..., _Result],
        *arguments: object,
    ) -> _Result:
        """Do not abandon a transaction mid-flight if its caller is cancelled."""

        task = asyncio.create_task(asyncio.to_thread(operation, *arguments))
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            try:
                await task
            except Exception:
                # Cancellation remains the public outcome. The important invariant
                # is that the worker transaction has already committed or rolled back.
                pass
            raise

    def _create_sync(self, challenge: GoogleOAuthChallengeForPersistence) -> bool:
        parameters = {
            "id": uuid4(),
            "kind": _GOOGLE_OAUTH_KIND,
            "token_hash": challenge.token_hash,
            "state_hash": challenge.state_hash,
            "nonce_hash": challenge.nonce_hash,
            "pkce_verifier_ciphertext": challenge.pkce_verifier_ciphertext,
            "pkce_key_id": challenge.pkce_key_id,
            "redirect_path": challenge.redirect_path,
            "expires_at": challenge.expires_at,
            "created_at": challenge.created_at,
        }
        with self._engine.begin() as connection:
            # Serialize cleanup/count/insert across every API instance without
            # changing the frozen schema. Count all unexpired rows, including
            # consumed rows, so rapid callbacks cannot turn into table growth.
            connection.execute(
                text("SELECT pg_advisory_xact_lock(:lock_key)"),
                {"lock_key": _GOOGLE_OAUTH_CAPACITY_LOCK_KEY},
            )
            connection.execute(
                text(
                    """
                    UPDATE auth_challenges
                    SET consumed_at = :created_at,
                        pkce_verifier_ciphertext = NULL,
                        pkce_key_id = NULL
                    WHERE kind = :kind
                      AND consumed_at IS NULL
                      AND expires_at <= :created_at
                    """
                ),
                {"kind": _GOOGLE_OAUTH_KIND, "created_at": challenge.created_at},
            )
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE kind = :kind
                      AND expires_at <= :created_at
                      AND consumed_at IS NOT NULL
                      AND pkce_verifier_ciphertext IS NULL
                      AND pkce_key_id IS NULL
                    """
                ),
                {"kind": _GOOGLE_OAUTH_KIND, "created_at": challenge.created_at},
            )
            active_count = connection.execute(
                text(
                    """
                    SELECT count(*)
                    FROM auth_challenges
                    WHERE kind = :kind
                      AND expires_at > :created_at
                    """
                ),
                {"kind": _GOOGLE_OAUTH_KIND, "created_at": challenge.created_at},
            ).scalar_one()
            if active_count >= self._capacity:
                return False
            connection.execute(
                text(
                    """
                    INSERT INTO auth_challenges
                        (id, user_id, kind, token_hash, state_hash, nonce_hash,
                         pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                         expires_at, consumed_at, created_at)
                    VALUES
                        (:id, NULL, :kind, :token_hash, :state_hash, :nonce_hash,
                         :pkce_verifier_ciphertext, :pkce_key_id, :redirect_path,
                         :expires_at, NULL, :created_at)
                    """
                ),
                parameters,
            )
        return True

    def _claim_and_delete_verifier_sync(
        self,
        state_hash: str,
        claimed_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> ClaimedGoogleOAuthChallenge | None:
        snapshot: dict[str, Any] | None = None
        with self._engine.begin() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT id, token_hash, state_hash, nonce_hash,
                           pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                           expires_at
                    FROM auth_challenges
                    WHERE kind = :kind
                      AND token_hash = :state_hash
                      AND state_hash = :state_hash
                      AND consumed_at IS NULL
                    FOR UPDATE
                    """
                ),
                {"kind": _GOOGLE_OAUTH_KIND, "state_hash": state_hash},
            ).mappings().first()
            if row is None:
                return None

            snapshot = dict(row)
            updated = connection.execute(
                text(
                    """
                    UPDATE auth_challenges
                    SET consumed_at = :consumed_at,
                        pkce_verifier_ciphertext = :pkce_verifier_ciphertext,
                        pkce_key_id = :pkce_key_id
                    WHERE id = :id
                      AND kind = :kind
                      AND token_hash = :state_hash
                      AND state_hash = :state_hash
                      AND consumed_at IS NULL
                    RETURNING id
                    """
                ),
                {
                    "id": snapshot["id"],
                    "kind": _GOOGLE_OAUTH_KIND,
                    "state_hash": state_hash,
                    "consumed_at": verifier_deletion.consumed_at,
                    "pkce_verifier_ciphertext": (
                        verifier_deletion.pkce_verifier_ciphertext
                    ),
                    "pkce_key_id": verifier_deletion.pkce_key_id,
                },
            ).first()
            if updated is None:
                raise RuntimeError("OAuth challenge could not be atomically claimed")

            # The frozen schema contract requires expired OAuth challenge rows to
            # be deleted.  This follows the scrub above, in the same transaction,
            # so even a failed callback cannot retain recoverable verifier bytes.
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE id = :id
                      AND kind = :kind
                      AND token_hash = :state_hash
                      AND state_hash = :state_hash
                      AND consumed_at = :consumed_at
                      AND expires_at <= :claimed_at
                      AND pkce_verifier_ciphertext IS NULL
                      AND pkce_key_id IS NULL
                    """
                ),
                {
                    "id": snapshot["id"],
                    "kind": _GOOGLE_OAUTH_KIND,
                    "state_hash": state_hash,
                    "consumed_at": verifier_deletion.consumed_at,
                    "claimed_at": claimed_at,
                },
            )

        # Construction happens after the transaction context has exited. This is
        # also a final data-integrity check over the pre-scrub snapshot.
        if snapshot is None:  # pragma: no cover - defensive type narrowing
            return None
        if not hmac.compare_digest(str(snapshot["token_hash"]), state_hash):
            raise RuntimeError("OAuth challenge state binding is invalid")
        if not hmac.compare_digest(str(snapshot["state_hash"]), state_hash):
            raise RuntimeError("OAuth challenge state binding is invalid")
        return ClaimedGoogleOAuthChallenge(
            state_hash=str(snapshot["state_hash"]),
            nonce_hash=str(snapshot["nonce_hash"]),
            pkce_verifier_ciphertext=bytes(snapshot["pkce_verifier_ciphertext"]),
            pkce_key_id=str(snapshot["pkce_key_id"]),
            redirect_path=str(snapshot["redirect_path"]),
            expires_at=snapshot["expires_at"],
        )

    def _delete_expired_verifiers_sync(
        self,
        expired_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> None:
        with self._engine.begin() as connection:
            connection.execute(
                text(
                    """
                    UPDATE auth_challenges
                    SET consumed_at = :consumed_at,
                        pkce_verifier_ciphertext = :pkce_verifier_ciphertext,
                        pkce_key_id = :pkce_key_id
                    WHERE kind = :kind
                      AND consumed_at IS NULL
                      AND expires_at <= :expired_at
                    """
                ),
                {
                    "kind": _GOOGLE_OAUTH_KIND,
                    "expired_at": expired_at,
                    "consumed_at": verifier_deletion.consumed_at,
                    "pkce_verifier_ciphertext": (
                        verifier_deletion.pkce_verifier_ciphertext
                    ),
                    "pkce_key_id": verifier_deletion.pkce_key_id,
                },
            )
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE kind = :kind
                      AND expires_at <= :expired_at
                      AND consumed_at IS NOT NULL
                      AND pkce_verifier_ciphertext IS NULL
                      AND pkce_key_id IS NULL
                    """
                ),
                {"kind": _GOOGLE_OAUTH_KIND, "expired_at": expired_at},
            )


def _require_hash(value: str) -> str:
    if not isinstance(value, str) or not _SHA256_PATTERN.fullmatch(value):
        raise ValueError("OAuth state hash is invalid")
    return value


def _require_aware_datetime(value: datetime) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("OAuth timestamp must be timezone-aware")
    return value


def _require_matching_deletion(
    value: PkceVerifierDeletion,
    *,
    expected_at: datetime,
) -> None:
    if not isinstance(value, PkceVerifierDeletion):
        raise TypeError("a PKCE verifier deletion is required")
    consumed_at = _require_aware_datetime(value.consumed_at)
    if consumed_at.astimezone(UTC) != expected_at.astimezone(UTC):
        raise ValueError("OAuth verifier deletion timestamp is inconsistent")
