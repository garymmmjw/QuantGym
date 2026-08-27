"""Transactional session authentication for the isolated V2 API."""

from __future__ import annotations

import hashlib
import hmac
import math
import re
import secrets
import threading
from collections import OrderedDict, deque
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, Protocol
from uuid import UUID, uuid4

from email_validator import EmailNotValidError, validate_email
from pydantic import SecretStr
from sqlalchemy import text

from ..errors import ApiError
from ..users.models import PreferencesRecord, UserRecord, to_me_response
from .challenge_limits import PreAuthChallengeRateLimiter
from .csrf import (
    CsrfDigest,
    CsrfFailureCode,
    CsrfRequestProof,
    CsrfToken,
    PreAuthCsrfState,
    SessionCsrfState,
    digest_pre_auth_csrf,
    digest_session_csrf,
    generate_csrf_token,
    validate_pre_auth_csrf,
    validate_session_csrf,
)
from .models import AuthChallengeRecord, AuthenticatedPrincipal, SessionIssue, SessionRecord
from .google import GoogleIdentity
from .passwords import hash_password, verify_password_and_rehash


SESSION_COOKIE_NAME = "__Host-qg_session"
CSRF_COOKIE_NAME = "__Host-qg_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"

PRE_AUTH_TTL = timedelta(minutes=10)
SESSION_TTL = timedelta(days=7)
PASSWORD_RESET_TTL = timedelta(minutes=30)
OAUTH_TTL = timedelta(minutes=10)
LAST_SEEN_UPDATE_INTERVAL = timedelta(minutes=5)
PRE_AUTH_ACTIVE_CAPACITY = 10_000

# PostgreSQL advisory transaction locks are scoped to one database.  A fixed,
# application-owned key lets every API instance serialize the cleanup/count/
# insert sequence without adding mutable coordination state to the schema.
_PRE_AUTH_CAPACITY_LOCK_KEY = 0x5155474353524601

_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")
_SESSION_DOMAIN = b"quantgym:v2:session:v1"
_PASSWORD_RESET_DOMAIN = b"quantgym:v2:password-reset:v1"
_LOGIN_EMAIL_DOMAIN = b"quantgym:v2:login-limit:email:v1"
_LOGIN_IP_DOMAIN = b"quantgym:v2:login-limit:ip:v1"


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalize_email(value: str) -> str:
    """Return the one canonical email key shared by every identity path."""

    if not isinstance(value, str):
        raise ValueError("email is invalid")
    try:
        candidate = value.strip()
        normalized = validate_email(
            candidate,
            check_deliverability=False,
        ).normalized.casefold()
    except (EmailNotValidError, TypeError, UnicodeError):
        raise ValueError("email is invalid") from None
    if not normalized or len(normalized) > 320:
        raise ValueError("email is invalid")
    if any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in normalized
    ):
        raise ValueError("email is invalid")
    return normalized


def _secret_text(value: SecretStr | str) -> str:
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    if isinstance(value, str):
        return value
    raise ValueError("secret value is invalid")


def _token_text(value: SecretStr | str) -> str:
    raw = _secret_text(value)
    if _TOKEN_PATTERN.fullmatch(raw) is None:
        raise ValueError("token is invalid")
    return raw


def _hmac_hex(value: str, secret: SecretStr | str, domain: bytes) -> str:
    key = _secret_text(secret).encode("utf-8")
    if len(key) < 32:
        raise ValueError("signing secret is invalid")
    return hmac.new(key, domain + b"\x00" + value.encode("ascii"), hashlib.sha256).hexdigest()


def hash_session_token(value: SecretStr | str, secret: SecretStr | str) -> str:
    return _hmac_hex(_token_text(value), secret, _SESSION_DOMAIN)


def hash_password_reset_token(value: SecretStr | str, secret: SecretStr | str) -> str:
    return _hmac_hex(_token_text(value), secret, _PASSWORD_RESET_DOMAIN)


class ChallengeConsumeStatus(StrEnum):
    CONSUMED = "consumed"
    MISSING = "missing"
    STALE = "stale"
    ALREADY_CONSUMED = "already_consumed"


@dataclass(frozen=True, slots=True, repr=False)
class SessionContext:
    session: SessionRecord
    user: UserRecord
    preferences: PreferencesRecord


@dataclass(frozen=True, slots=True, repr=False)
class PreAuthIssue:
    csrf_token: CsrfToken
    expires_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class AuthResult:
    session_issue: SessionIssue
    user: UserRecord
    preferences: PreferencesRecord

    def response(self) -> Any:
        return to_me_response(self.user, self.preferences)


@dataclass(frozen=True, slots=True, repr=False)
class SessionMaterial:
    id: UUID
    token_hash: str
    csrf_hash: str
    created_at: datetime
    expires_at: datetime
    issue: SessionIssue
    revoke_token_hash: str | None = None


@dataclass(frozen=True, slots=True, repr=False)
class PasswordResetDelivery:
    email: str
    reset_url: SecretStr
    expires_at: datetime


class PasswordResetSender(Protocol):
    def send_password_reset(self, delivery: PasswordResetDelivery) -> None: ...


class NullPasswordResetSender:
    """Preview-safe placeholder that deliberately records and logs nothing."""

    def send_password_reset(self, _delivery: PasswordResetDelivery) -> None:
        return None


class PasswordWorkLimiter:
    """Bound Argon2 concurrency so login bursts cannot multiply memory without limit."""

    def __init__(self, capacity: int = 2) -> None:
        if not 1 <= capacity <= 8:
            raise ValueError("password worker capacity is invalid")
        self._semaphore = threading.BoundedSemaphore(capacity)

    def run(self, operation: Callable[[], Any]) -> Any:
        if not self._semaphore.acquire(blocking=False):
            raise ApiError(
                status_code=429,
                code="AUTH_CAPACITY_LIMITED",
                message="登录请求较多，请稍后重试",
                retryable=True,
                headers={"Retry-After": "1"},
            )
        try:
            return operation()
        finally:
            self._semaphore.release()


class LoginRateLimiter:
    """Bounded single-instance Preview limiter keyed only by HMAC digests."""

    def __init__(
        self,
        *,
        signing_secret: SecretStr | str,
        email_max_attempts: int = 5,
        ip_max_attempts: int = 20,
        window_seconds: float = 300,
        capacity: int = 10_000,
        monotonic: Callable[[], float],
    ) -> None:
        if (
            not 1 <= email_max_attempts <= 20
            or not email_max_attempts <= ip_max_attempts <= 100
            or window_seconds <= 0
            or capacity <= 0
        ):
            raise ValueError("login limiter policy is invalid")
        self._secret = signing_secret
        self._email_max_attempts = email_max_attempts
        self._ip_max_attempts = ip_max_attempts
        self._window = float(window_seconds)
        self._capacity = capacity
        self._monotonic = monotonic
        self._entries: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def _key(self, value: str, domain: bytes) -> str:
        material = value.encode("utf-8")
        key = _secret_text(self._secret).encode("utf-8")
        return hmac.new(key, domain + b"\x00" + material, hashlib.sha256).hexdigest()

    def _email_key(self, normalized_email: str) -> str:
        return self._key(normalized_email, _LOGIN_EMAIL_DOMAIN)

    def _ip_key(self, client_ip: str) -> str:
        return self._key(client_ip, _LOGIN_IP_DOMAIN)

    def _retry_for_key(self, key: str, limit: int, now: float) -> int | None:
        attempts = self._entries.get(key)
        if attempts is None:
            return None
        while attempts and now - attempts[0] >= self._window:
            attempts.popleft()
        if not attempts:
            self._entries.pop(key, None)
            return None
        self._entries.move_to_end(key)
        if len(attempts) < limit:
            return None
        return max(1, math.ceil(self._window - (now - attempts[0])))

    def retry_after(self, normalized_email: str, client_ip: str) -> int | None:
        now = self._monotonic()
        with self._lock:
            retries = (
                self._retry_for_key(
                    self._email_key(normalized_email),
                    self._email_max_attempts,
                    now,
                ),
                self._retry_for_key(
                    self._ip_key(client_ip),
                    self._ip_max_attempts,
                    now,
                ),
            )
            active = [retry for retry in retries if retry is not None]
            return max(active) if active else None

    def record_failure(self, normalized_email: str, client_ip: str) -> None:
        now = self._monotonic()
        with self._lock:
            for key in (
                self._email_key(normalized_email),
                self._ip_key(client_ip),
            ):
                attempts = self._entries.setdefault(key, deque())
                while attempts and now - attempts[0] >= self._window:
                    attempts.popleft()
                attempts.append(now)
                self._entries.move_to_end(key)
            while len(self._entries) > self._capacity:
                self._entries.popitem(last=False)

    def reset(self, normalized_email: str, _client_ip: str) -> None:
        # A successful login proves the email credential, but it must not erase
        # the independent IP history accumulated by attempts against other users.
        key = self._email_key(normalized_email)
        with self._lock:
            self._entries.pop(key, None)


class SqlAlchemyAuthRepository:
    """Short, explicit PostgreSQL transactions for authentication state."""

    def __init__(self, engine: Any) -> None:
        self._engine = engine

    def create_pre_auth_challenge(
        self,
        *,
        token_hash: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> bool:
        with self._engine.begin() as connection:
            connection.execute(
                text("SELECT pg_advisory_xact_lock(:lock_key)"),
                {"lock_key": _PRE_AUTH_CAPACITY_LOCK_KEY},
            )
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE kind = 'pre_auth_csrf'
                      AND expires_at <= :created_at
                    """
                ),
                {"created_at": created_at},
            )
            active_count = connection.execute(
                text(
                    """
                    SELECT count(*)
                    FROM auth_challenges
                    WHERE kind = 'pre_auth_csrf'
                      AND expires_at > :created_at
                    """
                ),
                {"created_at": created_at},
            ).scalar_one()
            if active_count >= PRE_AUTH_ACTIVE_CAPACITY:
                # Returning outside the transaction would also be safe, but
                # returning here deliberately commits the stale-row cleanup.
                return False
            connection.execute(
                text(
                    """
                    INSERT INTO auth_challenges
                        (id, user_id, kind, token_hash, state_hash, nonce_hash,
                         pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                         expires_at, consumed_at, created_at)
                    VALUES
                        (:id, NULL, 'pre_auth_csrf', :token_hash, NULL, NULL,
                         NULL, NULL, NULL, :expires_at, NULL, :created_at)
                    """
                ),
                {
                    "id": uuid4(),
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "created_at": created_at,
                },
            )
        return True

    def consume_pre_auth_challenge(
        self,
        *,
        token_hash: str,
        consumed_at: datetime,
    ) -> ChallengeConsumeStatus:
        with self._engine.begin() as connection:
            consumed = connection.execute(
                text(
                    """
                    UPDATE auth_challenges
                    SET consumed_at = :consumed_at
                    WHERE kind = 'pre_auth_csrf'
                      AND token_hash = :token_hash
                      AND consumed_at IS NULL
                      AND expires_at > :consumed_at
                    RETURNING id
                    """
                ),
                {"token_hash": token_hash, "consumed_at": consumed_at},
            ).first()
            if consumed is not None:
                return ChallengeConsumeStatus.CONSUMED
            row = connection.execute(
                text(
                    """
                    SELECT expires_at, consumed_at
                    FROM auth_challenges
                    WHERE kind = 'pre_auth_csrf' AND token_hash = :token_hash
                    """
                ),
                {"token_hash": token_hash},
            ).mappings().first()
        if row is None:
            return ChallengeConsumeStatus.MISSING
        if row["consumed_at"] is not None:
            return ChallengeConsumeStatus.ALREADY_CONSUMED
        return ChallengeConsumeStatus.STALE

    def find_user_by_normalized_email(self, normalized_email: str) -> UserRecord | None:
        with self._engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT id, email, normalized_email, password_hash, display_name,
                           status, email_verified_at, created_at, updated_at
                    FROM users
                    WHERE normalized_email = :normalized_email
                    """
                ),
                {"normalized_email": normalized_email},
            ).mappings().first()
        return _user_from_row(row) if row is not None else None

    def get_user_with_preferences(
        self,
        *,
        user_id: UUID,
    ) -> tuple[UserRecord, PreferencesRecord] | None:
        with self._engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        u.id, u.email, u.normalized_email, u.password_hash,
                        u.display_name, u.status, u.email_verified_at,
                        u.created_at, u.updated_at,
                        p.user_id AS preference_user_id, p.theme, p.language,
                        p.version, p.updated_at AS preference_updated_at
                    FROM users u
                    JOIN preferences p ON p.user_id = u.id
                    WHERE u.id = :user_id AND u.status = 'active'
                    """
                ),
                {"user_id": user_id},
            ).mappings().first()
        if row is None:
            return None
        return (
            _user_from_row(row),
            PreferencesRecord(
                user_id=row["preference_user_id"],
                theme=row["theme"],
                language=row["language"],
                version=row["version"],
                updated_at=row["preference_updated_at"],
            ),
        )

    def register_local_with_session(
        self,
        *,
        user_id: UUID,
        email: str,
        normalized_email: str,
        password_hash: str,
        display_name: str,
        now: datetime,
        session: SessionMaterial,
    ) -> tuple[UserRecord, PreferencesRecord, SessionRecord] | None:
        with self._engine.begin() as connection:
            user_row = connection.execute(
                text(
                    """
                    INSERT INTO users
                        (id, email, normalized_email, password_hash, display_name,
                         status, email_verified_at, created_at, updated_at)
                    VALUES
                        (:id, :email, :normalized_email, :password_hash, :display_name,
                         'active', NULL, :now, :now)
                    ON CONFLICT (normalized_email) DO NOTHING
                    RETURNING id, email, normalized_email, password_hash, display_name,
                              status, email_verified_at, created_at, updated_at
                    """
                ),
                {
                    "id": user_id,
                    "email": email,
                    "normalized_email": normalized_email,
                    "password_hash": password_hash,
                    "display_name": display_name,
                    "now": now,
                },
            ).mappings().first()
            if user_row is None:
                return None
            connection.execute(
                text(
                    """
                    INSERT INTO user_identities
                        (id, user_id, provider, subject, linked_email, created_at, updated_at)
                    VALUES (:id, :user_id, 'local', :subject, :email, :now, :now)
                    """
                ),
                {
                    "id": uuid4(),
                    "user_id": user_id,
                    "subject": str(user_id),
                    "email": email,
                    "now": now,
                },
            )
            preference_row = connection.execute(
                text(
                    """
                    INSERT INTO preferences (user_id, theme, language, version, updated_at)
                    VALUES (:user_id, 'system', 'zh-CN', 1, :now)
                    RETURNING user_id, theme, language, version, updated_at
                    """
                ),
                {"user_id": user_id, "now": now},
            ).mappings().one()
            session_row = _insert_session_row(
                connection,
                session=session,
                user_id=user_id,
            )
        return (
            _user_from_row(user_row),
            _preferences_from_row(preference_row),
            _session_from_row(session_row),
        )

    def login_with_session(
        self,
        *,
        normalized_email: str,
        password: SecretStr | str,
        session: SessionMaterial,
        now: datetime,
    ) -> tuple[UserRecord, PreferencesRecord, SessionRecord] | None:
        with self._engine.begin() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        u.id, u.email, u.normalized_email, u.password_hash,
                        u.display_name, u.status, u.email_verified_at,
                        u.created_at, u.updated_at,
                        p.user_id AS preference_user_id, p.theme, p.language,
                        p.version, p.updated_at AS preference_updated_at
                    FROM users u
                    LEFT JOIN preferences p ON p.user_id = u.id
                    WHERE u.normalized_email = :normalized_email
                    FOR UPDATE OF u
                    """
                ),
                {"normalized_email": normalized_email},
            ).mappings().first()
            stored_hash = (
                row["password_hash"]
                if row is not None
                and row["status"] == "active"
                and row["preference_user_id"] is not None
                else None
            )
            verification = verify_password_and_rehash(password, stored_hash)
            if row is None or stored_hash is None or not verification.verified:
                return None

            replacement_hash = verification.replacement_hash_value()
            row_values = dict(row)
            if replacement_hash is not None:
                updated = connection.execute(
                    text(
                        """
                        UPDATE users
                        SET password_hash = :replacement_hash, updated_at = :now
                        WHERE id = :user_id AND password_hash = :expected_hash
                        RETURNING id
                        """
                    ),
                    {
                        "replacement_hash": replacement_hash,
                        "now": now,
                        "user_id": row["id"],
                        "expected_hash": stored_hash,
                    },
                ).first()
                if updated is None:
                    return None
                row_values["password_hash"] = replacement_hash
                row_values["updated_at"] = now

            session_row = _insert_session_row(
                connection,
                session=session,
                user_id=row["id"],
            )
        return (
            _user_from_row(row_values),
            PreferencesRecord(
                user_id=row_values["preference_user_id"],
                theme=row_values["theme"],
                language=row_values["language"],
                version=row_values["version"],
                updated_at=row_values["preference_updated_at"],
            ),
            _session_from_row(session_row),
        )

    def complete_google_login_with_session(
        self,
        *,
        subject: str,
        email: str,
        normalized_email: str,
        display_name: str,
        session: SessionMaterial,
        now: datetime,
    ) -> tuple[UserRecord, PreferencesRecord, SessionRecord] | None:
        """Resolve or create a Google account and its session atomically.

        Provider verification and all provider HTTP calls must have completed
        before this method is entered.  The `(provider, subject)` identity is
        authoritative when it already exists.  Otherwise a verified normalized
        email may bind the identity to an existing account; concurrent callbacks
        are resolved by the database uniqueness constraints without leaving an
        orphan account behind.
        """

        with self._engine.begin() as connection:
            identity = connection.execute(
                text(
                    """
                    SELECT user_id
                    FROM user_identities
                    WHERE provider = 'google' AND subject = :subject
                    """
                ),
                {"subject": subject},
            ).mappings().first()
            if identity is not None:
                _mark_matching_email_verified(
                    connection,
                    user_id=identity["user_id"],
                    normalized_email=normalized_email,
                    verified_at=now,
                )
                account = _select_active_account(
                    connection,
                    user_id=identity["user_id"],
                )
                if account is None:
                    return None
                session_row = _insert_session_row(
                    connection,
                    session=session,
                    user_id=identity["user_id"],
                )
                user, preferences = account
                return user, preferences, _session_from_row(session_row)

            new_user_id = uuid4()
            inserted_user = connection.execute(
                text(
                    """
                    INSERT INTO users
                        (id, email, normalized_email, password_hash, display_name,
                         status, email_verified_at, created_at, updated_at)
                    VALUES
                        (:id, :email, :normalized_email, NULL, :display_name,
                         'active', :now, :now, :now)
                    ON CONFLICT (normalized_email) DO NOTHING
                    RETURNING id
                    """
                ),
                {
                    "id": new_user_id,
                    "email": email,
                    "normalized_email": normalized_email,
                    "display_name": display_name,
                    "now": now,
                },
            ).mappings().first()
            created_user = inserted_user is not None
            if created_user:
                candidate_user_id = inserted_user["id"]
                connection.execute(
                    text(
                        """
                        INSERT INTO preferences
                            (user_id, theme, language, version, updated_at)
                        VALUES (:user_id, 'system', 'zh-CN', 1, :now)
                        """
                    ),
                    {"user_id": candidate_user_id, "now": now},
                )
            else:
                existing_user = connection.execute(
                    text(
                        """
                        SELECT id
                        FROM users
                        WHERE normalized_email = :normalized_email
                        FOR UPDATE
                        """
                    ),
                    {"normalized_email": normalized_email},
                ).mappings().first()
                if existing_user is None:
                    return None
                candidate_user_id = existing_user["id"]
                if _select_active_account(
                    connection,
                    user_id=candidate_user_id,
                ) is None:
                    return None

            inserted_identity = connection.execute(
                text(
                    """
                    INSERT INTO user_identities
                        (id, user_id, provider, subject, linked_email,
                         created_at, updated_at)
                    VALUES
                        (:id, :user_id, 'google', :subject, :linked_email,
                         :now, :now)
                    ON CONFLICT (provider, subject) DO NOTHING
                    RETURNING user_id
                    """
                ),
                {
                    "id": uuid4(),
                    "user_id": candidate_user_id,
                    "subject": subject,
                    "linked_email": email,
                    "now": now,
                },
            ).mappings().first()
            if inserted_identity is not None:
                resolved_user_id = inserted_identity["user_id"]
            else:
                # ON CONFLICT waits for the winner.  Under READ COMMITTED this
                # following statement then observes the committed identity.
                winner = connection.execute(
                    text(
                        """
                        SELECT user_id
                        FROM user_identities
                        WHERE provider = 'google' AND subject = :subject
                        """
                    ),
                    {"subject": subject},
                ).mappings().first()
                if winner is None:
                    raise RuntimeError("Google identity conflict could not be resolved")
                resolved_user_id = winner["user_id"]
                if created_user and resolved_user_id != candidate_user_id:
                    connection.execute(
                        text("DELETE FROM users WHERE id = :user_id"),
                        {"user_id": candidate_user_id},
                    )

            _mark_matching_email_verified(
                connection,
                user_id=resolved_user_id,
                normalized_email=normalized_email,
                verified_at=now,
            )
            account = _select_active_account(
                connection,
                user_id=resolved_user_id,
            )
            if account is None:
                if created_user and resolved_user_id == candidate_user_id:
                    connection.execute(
                        text("DELETE FROM users WHERE id = :user_id"),
                        {"user_id": candidate_user_id},
                    )
                return None
            session_row = _insert_session_row(
                connection,
                session=session,
                user_id=resolved_user_id,
            )
        user, preferences = account
        return user, preferences, _session_from_row(session_row)

    def create_session(
        self,
        *,
        user_id: UUID,
        session: SessionMaterial,
    ) -> SessionRecord:
        with self._engine.begin() as connection:
            row = _insert_session_row(
                connection,
                session=session,
                user_id=user_id,
            )
        return _session_from_row(row)

    def get_session_context(self, *, token_hash: str, now: datetime) -> SessionContext | None:
        with self._engine.begin() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT
                        s.id AS session_id, s.user_id AS session_user_id,
                        s.token_hash, s.csrf_hash, s.expires_at, s.last_seen_at,
                        s.revoked_at, s.created_at AS session_created_at,
                        u.id AS user_id, u.email, u.normalized_email,
                        u.display_name, u.status, u.email_verified_at,
                        u.created_at AS user_created_at, u.updated_at AS user_updated_at,
                        p.user_id AS preference_user_id, p.theme, p.language,
                        p.version, p.updated_at AS preference_updated_at
                    FROM sessions s
                    JOIN users u ON u.id = s.user_id
                    JOIN preferences p ON p.user_id = u.id
                    WHERE s.token_hash = :token_hash
                      AND s.revoked_at IS NULL
                      AND s.expires_at > :now
                      AND u.status = 'active'
                    FOR UPDATE OF s
                    """
                ),
                {"token_hash": token_hash, "now": now},
            ).mappings().first()
            if row is None:
                return None
            last_seen_at = row["last_seen_at"]
            touched = connection.execute(
                text(
                    """
                    UPDATE sessions
                    SET last_seen_at = :now
                    WHERE id = :session_id
                      AND last_seen_at <= :touch_before
                      AND revoked_at IS NULL
                      AND expires_at > :now
                    """
                ),
                {
                    "now": now,
                    "session_id": row["session_id"],
                    "touch_before": now - LAST_SEEN_UPDATE_INTERVAL,
                },
            )
            if touched.rowcount == 1:
                last_seen_at = now
        return _session_context_from_row(row, last_seen_at=last_seen_at)

    def revoke_session(self, *, token_hash: str, revoked_at: datetime) -> bool:
        with self._engine.begin() as connection:
            row = connection.execute(
                text(
                    """
                    UPDATE sessions SET revoked_at = :revoked_at
                    WHERE token_hash = :token_hash AND revoked_at IS NULL
                    RETURNING id
                    """
                ),
                {"token_hash": token_hash, "revoked_at": revoked_at},
            ).first()
        return row is not None

    def create_password_reset(
        self,
        *,
        user_id: UUID,
        token_hash: str,
        created_at: datetime,
        expires_at: datetime,
    ) -> str | None:
        with self._engine.begin() as connection:
            locked_user = connection.execute(
                text(
                    """
                    SELECT email
                    FROM users
                    WHERE id = :user_id
                      AND status = 'active'
                      AND password_hash IS NOT NULL
                    FOR UPDATE
                    """
                ),
                {"user_id": user_id},
            ).mappings().first()
            if locked_user is None:
                return None

            # Password-reset rows are one-time authentication material, not an
            # audit log.  Remove globally stale rows opportunistically and all
            # prior rows for this locked user before installing the sole active
            # replacement.  The user-row lock serializes concurrent requests.
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE kind = 'password_reset'
                      AND (consumed_at IS NOT NULL OR expires_at <= :created_at)
                    """
                ),
                {"created_at": created_at},
            )
            connection.execute(
                text(
                    """
                    DELETE FROM auth_challenges
                    WHERE kind = 'password_reset' AND user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
            connection.execute(
                text(
                    """
                    INSERT INTO auth_challenges
                        (id, user_id, kind, token_hash, state_hash, nonce_hash,
                         pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                         expires_at, consumed_at, created_at)
                    VALUES
                        (:id, :user_id, 'password_reset', :token_hash, NULL, NULL,
                         NULL, NULL, NULL, :expires_at, NULL, :created_at)
                    """
                ),
                {
                    "id": uuid4(),
                    "user_id": user_id,
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "created_at": created_at,
                },
            )
        return str(locked_user["email"])

    def reset_password(
        self,
        *,
        token_hash: str,
        password_hash: str,
        consumed_at: datetime,
    ) -> bool:
        with self._engine.begin() as connection:
            candidate = connection.execute(
                text(
                    """
                    SELECT user_id
                    FROM auth_challenges
                    WHERE kind = 'password_reset'
                      AND token_hash = :token_hash
                    """
                ),
                {"token_hash": token_hash},
            ).mappings().first()
            if candidate is None or candidate["user_id"] is None:
                return False

            # Match create_password_reset's lock order: user first, challenge
            # second.  The target is re-read after the user lock so a token
            # deleted or superseded while waiting can never win a reset race.
            locked_user = connection.execute(
                text(
                    """
                    SELECT id
                    FROM users
                    WHERE id = :user_id AND status = 'active'
                    FOR UPDATE
                    """
                ),
                {"user_id": candidate["user_id"]},
            ).first()
            if locked_user is None:
                return False

            challenge = connection.execute(
                text(
                    """
                    SELECT id, user_id
                    FROM auth_challenges
                    WHERE kind = 'password_reset'
                      AND token_hash = :token_hash
                      AND user_id = :user_id
                      AND consumed_at IS NULL
                      AND expires_at > :consumed_at
                    FOR UPDATE
                    """
                ),
                {
                    "token_hash": token_hash,
                    "user_id": candidate["user_id"],
                    "consumed_at": consumed_at,
                },
            ).mappings().first()
            if challenge is None:
                return False

            connection.execute(
                text(
                    """
                    UPDATE auth_challenges
                    SET consumed_at = :consumed_at
                    WHERE kind = 'password_reset'
                      AND user_id = :user_id
                      AND consumed_at IS NULL
                    """
                ),
                {
                    "consumed_at": consumed_at,
                    "user_id": challenge["user_id"],
                },
            )
            updated = connection.execute(
                text(
                    """
                    UPDATE users
                    SET password_hash = :password_hash, updated_at = :consumed_at
                    WHERE id = :user_id AND status = 'active'
                    RETURNING id
                    """
                ),
                {
                    "password_hash": password_hash,
                    "consumed_at": consumed_at,
                    "user_id": challenge["user_id"],
                },
            ).first()
            if updated is None:
                return False
            connection.execute(
                text(
                    """
                    UPDATE sessions SET revoked_at = :consumed_at
                    WHERE user_id = :user_id AND revoked_at IS NULL
                    """
                ),
                {
                    "consumed_at": consumed_at,
                    "user_id": challenge["user_id"],
                },
            )
        return True


def _insert_session_row(
    connection: Any,
    *,
    session: SessionMaterial,
    user_id: UUID,
) -> Mapping[str, Any]:
    """Insert one session and rotate the old browser-cookie session, if present.

    This helper deliberately receives an existing transaction-owned connection.
    Registration, login, and rotation can therefore make account changes and the
    replacement session visible together, or roll them all back together.
    """

    if session.revoke_token_hash is not None:
        connection.execute(
            text(
                """
                UPDATE sessions
                SET revoked_at = :revoked_at
                WHERE token_hash = :token_hash
                  AND revoked_at IS NULL
                """
            ),
            {
                "revoked_at": session.created_at,
                "token_hash": session.revoke_token_hash,
            },
        )
    return connection.execute(
        text(
            """
            INSERT INTO sessions
                (id, user_id, token_hash, csrf_hash, expires_at,
                 last_seen_at, revoked_at, created_at)
            VALUES
                (:id, :user_id, :token_hash, :csrf_hash, :expires_at,
                 :created_at, NULL, :created_at)
            RETURNING id, user_id, token_hash, csrf_hash, expires_at,
                      last_seen_at, revoked_at, created_at
            """
        ),
        {
            "id": session.id,
            "user_id": user_id,
            "token_hash": session.token_hash,
            "csrf_hash": session.csrf_hash,
            "expires_at": session.expires_at,
            "created_at": session.created_at,
        },
    ).mappings().one()


def _select_active_account(
    connection: Any,
    *,
    user_id: UUID,
) -> tuple[UserRecord, PreferencesRecord] | None:
    row = connection.execute(
        text(
            """
            SELECT
                u.id, u.email, u.normalized_email, u.display_name,
                u.status, u.email_verified_at, u.created_at, u.updated_at,
                p.user_id AS preference_user_id, p.theme, p.language,
                p.version, p.updated_at AS preference_updated_at
            FROM users u
            JOIN preferences p ON p.user_id = u.id
            WHERE u.id = :user_id AND u.status = 'active'
            FOR UPDATE OF u
            """
        ),
        {"user_id": user_id},
    ).mappings().first()
    if row is None:
        return None
    return (
        UserRecord(
            id=row["id"],
            email=row["email"],
            normalized_email=row["normalized_email"],
            password_hash=None,
            display_name=row["display_name"],
            status=row["status"],
            email_verified_at=row["email_verified_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        ),
        PreferencesRecord(
            user_id=row["preference_user_id"],
            theme=row["theme"],
            language=row["language"],
            version=row["version"],
            updated_at=row["preference_updated_at"],
        ),
    )


def _mark_matching_email_verified(
    connection: Any,
    *,
    user_id: UUID,
    normalized_email: str,
    verified_at: datetime,
) -> None:
    connection.execute(
        text(
            """
            UPDATE users
            SET email_verified_at = :verified_at,
                updated_at = :verified_at
            WHERE id = :user_id
              AND normalized_email = :normalized_email
              AND status = 'active'
              AND email_verified_at IS NULL
            """
        ),
        {
            "user_id": user_id,
            "normalized_email": normalized_email,
            "verified_at": verified_at,
        },
    )


def _user_from_row(row: Mapping[str, Any]) -> UserRecord:
    return UserRecord(
        id=row["id"],
        email=row["email"],
        normalized_email=row["normalized_email"],
        password_hash=row["password_hash"],
        display_name=row["display_name"],
        status=row["status"],
        email_verified_at=row["email_verified_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _preferences_from_row(row: Mapping[str, Any]) -> PreferencesRecord:
    return PreferencesRecord(
        user_id=row["user_id"],
        theme=row["theme"],
        language=row["language"],
        version=row["version"],
        updated_at=row["updated_at"],
    )


def _session_from_row(row: Mapping[str, Any]) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        user_id=row["user_id"],
        token_hash=row["token_hash"],
        csrf_hash=row["csrf_hash"],
        expires_at=row["expires_at"],
        last_seen_at=row["last_seen_at"],
        revoked_at=row["revoked_at"],
        created_at=row["created_at"],
    )


def _session_context_from_row(
    row: Mapping[str, Any],
    *,
    last_seen_at: datetime,
) -> SessionContext:
    session = SessionRecord(
        id=row["session_id"],
        user_id=row["session_user_id"],
        token_hash=row["token_hash"],
        csrf_hash=row["csrf_hash"],
        expires_at=row["expires_at"],
        last_seen_at=last_seen_at,
        revoked_at=row["revoked_at"],
        created_at=row["session_created_at"],
    )
    user = UserRecord(
        id=row["user_id"],
        email=row["email"],
        normalized_email=row["normalized_email"],
        # Session reads never select password material.  A caller that only
        # needs the authenticated principal must not bring the hash into memory.
        password_hash=None,
        display_name=row["display_name"],
        status=row["status"],
        email_verified_at=row["email_verified_at"],
        created_at=row["user_created_at"],
        updated_at=row["user_updated_at"],
    )
    preferences = PreferencesRecord(
        user_id=row["preference_user_id"],
        theme=row["theme"],
        language=row["language"],
        version=row["version"],
        updated_at=row["preference_updated_at"],
    )
    return SessionContext(session=session, user=user, preferences=preferences)


class AuthService:
    """High-level account operations with fixed, secret-safe public outcomes."""

    def __init__(
        self,
        *,
        repository: SqlAlchemyAuthRepository,
        session_secret: SecretStr | str,
        csrf_signing_secret: SecretStr | str,
        preview_origin: str,
        clock: Callable[[], datetime] = utc_now,
        monotonic: Callable[[], float],
        reset_sender: PasswordResetSender,
        password_work_limiter: PasswordWorkLimiter | None = None,
        login_rate_limiter: LoginRateLimiter | None = None,
        pre_auth_rate_limiter: PreAuthChallengeRateLimiter | None = None,
    ) -> None:
        if not preview_origin.startswith("https://") or preview_origin.endswith("/"):
            raise ValueError("Preview origin is invalid")
        self.repository = repository
        self._session_secret = session_secret
        self._csrf_signing_secret = csrf_signing_secret
        self._preview_origin = preview_origin
        self._clock = clock
        if not callable(getattr(reset_sender, "send_password_reset", None)):
            raise TypeError("password reset sender is invalid")
        self._reset_sender = reset_sender
        self._password_work_limiter = password_work_limiter or PasswordWorkLimiter()
        self._login_rate_limiter = login_rate_limiter or LoginRateLimiter(
            signing_secret=session_secret,
            monotonic=monotonic,
        )
        self._pre_auth_rate_limiter = (
            pre_auth_rate_limiter
            or PreAuthChallengeRateLimiter(
                signing_secret=session_secret,
                monotonic=monotonic,
            )
        )

    @property
    def preview_origin(self) -> str:
        return self._preview_origin

    def issue_pre_auth_csrf(
        self,
        *,
        client_ip: str = "unknown",
        browser_binding: SecretStr | str | None = None,
    ) -> PreAuthIssue:
        retry_after = self._pre_auth_rate_limiter.check_and_record(
            client_ip=client_ip,
            browser_binding=browser_binding,
        )
        if retry_after is not None:
            raise self._challenge_rate_limit_error(retry_after)
        now = self._now()
        token = generate_csrf_token()
        expires_at = now + PRE_AUTH_TTL
        token_hash = digest_pre_auth_csrf(
            token,
            self._csrf_signing_secret,
        ).get_secret_value()
        created = self.repository.create_pre_auth_challenge(
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
        )
        if not created:
            raise self._challenge_capacity_error()
        return PreAuthIssue(csrf_token=token, expires_at=expires_at)

    def register(
        self,
        *,
        email: str,
        password: SecretStr | str,
        display_name: str,
        proof: CsrfRequestProof,
        existing_session_token: SecretStr | str | None = None,
    ) -> AuthResult:
        self._consume_pre_auth_proof(proof)
        try:
            normalized_email = normalize_email(email)
        except ValueError:
            raise self._account_request_error() from None
        encoded_password = self._password_work_limiter.run(
            lambda: hash_password(password)
        )
        now = self._now()
        user_id = uuid4()
        session = self._new_session_material(
            existing_session_token=existing_session_token,
            now=now,
        )
        account = self.repository.register_local_with_session(
            user_id=user_id,
            email=normalized_email,
            normalized_email=normalized_email,
            password_hash=encoded_password,
            display_name=display_name,
            now=now,
            session=session,
        )
        if account is None:
            raise self._account_request_error()
        user, preferences, _stored_session = account
        return AuthResult(
            session_issue=session.issue,
            user=user,
            preferences=preferences,
        )

    def login(
        self,
        *,
        email: str,
        password: SecretStr | str,
        proof: CsrfRequestProof,
        client_ip: str,
        existing_session_token: SecretStr | str | None = None,
    ) -> AuthResult:
        self._consume_pre_auth_proof(proof)
        try:
            normalized_email = normalize_email(email)
        except ValueError:
            raise self._invalid_credentials() from None
        retry_after = self._login_rate_limiter.retry_after(
            normalized_email,
            client_ip,
        )
        if retry_after is not None:
            raise ApiError(
                status_code=429,
                code="AUTH_RATE_LIMITED",
                message="登录尝试过多，请稍后重试",
                retryable=True,
                headers={"Retry-After": str(retry_after)},
            )

        now = self._now()
        session = self._new_session_material(
            existing_session_token=existing_session_token,
            now=now,
        )
        account = self._password_work_limiter.run(
            lambda: self.repository.login_with_session(
                normalized_email=normalized_email,
                password=password,
                session=session,
                now=now,
            )
        )
        if account is None:
            self._login_rate_limiter.record_failure(normalized_email, client_ip)
            raise self._invalid_credentials()

        self._login_rate_limiter.reset(normalized_email, client_ip)
        current_user, preferences, _stored_session = account
        return AuthResult(
            session_issue=session.issue,
            user=current_user,
            preferences=preferences,
        )

    def complete_google_login(
        self,
        identity: GoogleIdentity,
        *,
        existing_session_token: SecretStr | str | None = None,
    ) -> AuthResult:
        """Finish a provider-verified Google identity without provider I/O."""

        if (
            not isinstance(identity.subject, str)
            or not 1 <= len(identity.subject) <= 255
            or any(
                character.isspace()
                or ord(character) < 32
                or ord(character) == 127
                for character in identity.subject
            )
            or not isinstance(identity.email, str)
            or identity.email_verified is not True
        ):
            raise self._google_login_error()
        try:
            normalized_email = normalize_email(identity.email)
        except ValueError:
            raise self._google_login_error() from None

        display_name = self._google_display_name(
            name=identity.name,
            normalized_email=normalized_email,
        )
        now = self._now()
        session = self._new_session_material(
            existing_session_token=existing_session_token,
            now=now,
        )
        account = self.repository.complete_google_login_with_session(
            subject=identity.subject,
            email=normalized_email,
            normalized_email=normalized_email,
            display_name=display_name,
            session=session,
            now=now,
        )
        if account is None:
            raise self._google_login_error()
        user, preferences, _stored_session = account
        return AuthResult(
            session_issue=session.issue,
            user=user,
            preferences=preferences,
        )

    def forgot_password(
        self,
        *,
        email: str,
        proof: CsrfRequestProof,
    ) -> None:
        self._consume_pre_auth_proof(proof)
        if isinstance(self._reset_sender, NullPasswordResetSender):
            # Preview has no approved mail provider yet.  Fail uniformly before
            # any account lookup instead of creating an undeliverable token or
            # pretending that a message was sent.
            raise self._password_reset_unavailable()
        normalized_email = normalize_email(email)
        user = self.repository.find_user_by_normalized_email(normalized_email)
        raw_token = SecretStr(secrets.token_urlsafe(32))
        now = self._now()
        expires_at = now + PASSWORD_RESET_TTL
        if user is not None and user.status == "active" and user.password_hash is not None:
            token_hash = hash_password_reset_token(raw_token, self._session_secret)
            delivery_email = self.repository.create_password_reset(
                user_id=user.id,
                token_hash=token_hash,
                created_at=now,
                expires_at=expires_at,
            )
            if delivery_email is None:
                return
            delivery = PasswordResetDelivery(
                email=delivery_email,
                reset_url=SecretStr(
                    f"{self._preview_origin}/auth/reset#{raw_token.get_secret_value()}"
                ),
                expires_at=expires_at,
            )
            try:
                self._reset_sender.send_password_reset(delivery)
            except Exception:
                # The endpoint remains enumeration-resistant and never reveals sender details.
                pass

    def reset_password(
        self,
        *,
        token: SecretStr | str,
        new_password: SecretStr | str,
        proof: CsrfRequestProof,
    ) -> None:
        self._consume_pre_auth_proof(proof)
        try:
            token_hash = hash_password_reset_token(token, self._session_secret)
        except (UnicodeError, ValueError):
            raise self._password_reset_error() from None
        password_hash = self._password_work_limiter.run(
            lambda: hash_password(new_password)
        )
        if not self.repository.reset_password(
            token_hash=token_hash,
            password_hash=password_hash,
            consumed_at=self._now(),
        ):
            raise self._password_reset_error()

    def authenticate_session(
        self,
        session_token: SecretStr | str | None,
    ) -> SessionContext:
        if session_token is None:
            raise self._auth_required()
        try:
            token_hash = hash_session_token(session_token, self._session_secret)
        except (UnicodeError, ValueError):
            raise self._auth_required() from None
        context = self.repository.get_session_context(
            token_hash=token_hash,
            now=self._now(),
        )
        if context is None:
            raise self._auth_required()
        return context

    def require_session_csrf(
        self,
        *,
        session_token: SecretStr | str | None,
        proof: CsrfRequestProof,
    ) -> SessionContext:
        context = self.authenticate_session(session_token)
        validation = validate_session_csrf(
            proof,
            SessionCsrfState(
                session_binding=str(context.session.id),
                token_digest=CsrfDigest.from_value(context.session.csrf_hash),
            ),
            signing_secret=self._csrf_signing_secret,
            expected_origin=self._preview_origin,
        )
        if not validation:
            raise self._csrf_error(validation.failure_code)
        return context

    def logout(
        self,
        *,
        session_token: SecretStr | str | None,
        proof: CsrfRequestProof,
    ) -> None:
        context = self.require_session_csrf(
            session_token=session_token,
            proof=proof,
        )
        self.repository.revoke_session(
            token_hash=context.session.token_hash,
            revoked_at=self._now(),
        )

    def me(self, session_token: SecretStr | str | None) -> Any:
        context = self.authenticate_session(session_token)
        return to_me_response(context.user, context.preferences)

    def rotate_session(
        self,
        session_token: SecretStr | str,
    ) -> SessionIssue:
        context = self.authenticate_session(session_token)
        return self._issue_session(
            user_id=context.user.id,
            existing_session_token=session_token,
            now=self._now(),
        )

    def _issue_session(
        self,
        *,
        user_id: UUID,
        existing_session_token: SecretStr | str | None,
        now: datetime,
    ) -> SessionIssue:
        session = self._new_session_material(
            existing_session_token=existing_session_token,
            now=now,
        )
        self.repository.create_session(user_id=user_id, session=session)
        return session.issue

    def _new_session_material(
        self,
        *,
        existing_session_token: SecretStr | str | None,
        now: datetime,
    ) -> SessionMaterial:
        session_id = uuid4()
        session_token = SecretStr(secrets.token_urlsafe(32))
        csrf_token = generate_csrf_token()
        session_hash = hash_session_token(session_token, self._session_secret)
        csrf_hash = digest_session_csrf(
            csrf_token,
            str(session_id),
            self._csrf_signing_secret,
        ).get_secret_value()
        revoke_hash: str | None = None
        if existing_session_token is not None:
            try:
                revoke_hash = hash_session_token(
                    existing_session_token,
                    self._session_secret,
                )
            except (UnicodeError, ValueError):
                revoke_hash = None
        expires_at = now + SESSION_TTL
        issue = SessionIssue(
            session_token=session_token,
            csrf_token=SecretStr(csrf_token.get_secret_value()),
            expires_at=expires_at,
        )
        return SessionMaterial(
            id=session_id,
            token_hash=session_hash,
            csrf_hash=csrf_hash,
            created_at=now,
            expires_at=expires_at,
            issue=issue,
            revoke_token_hash=revoke_hash,
        )

    def _consume_pre_auth_proof(self, proof: CsrfRequestProof) -> None:
        now = self._now()
        if proof.cookie_token is None:
            raise self._csrf_error(CsrfFailureCode.PROOF_MISSING)
        try:
            token = CsrfToken.from_value(proof.cookie_token)
            token_digest = digest_pre_auth_csrf(token, self._csrf_signing_secret)
        except (UnicodeError, ValueError):
            raise self._csrf_error(CsrfFailureCode.PROOF_INVALID) from None
        structural = validate_pre_auth_csrf(
            proof,
            PreAuthCsrfState(
                token_digest=token_digest,
                expires_at=now + timedelta(seconds=1),
            ),
            signing_secret=self._csrf_signing_secret,
            expected_origin=self._preview_origin,
            now=now,
        )
        if not structural:
            raise self._csrf_error(structural.failure_code)
        status = self.repository.consume_pre_auth_challenge(
            token_hash=token_digest.get_secret_value(),
            consumed_at=now,
        )
        if status is ChallengeConsumeStatus.CONSUMED:
            return
        if status is ChallengeConsumeStatus.STALE:
            raise self._csrf_error(CsrfFailureCode.PROOF_STALE)
        if status is ChallengeConsumeStatus.ALREADY_CONSUMED:
            raise self._csrf_error(CsrfFailureCode.PROOF_CONSUMED)
        raise self._csrf_error(CsrfFailureCode.PROOF_INVALID)

    def _now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("authentication clock must be timezone-aware")
        return value

    @staticmethod
    def _google_display_name(*, name: str | None, normalized_email: str) -> str:
        if isinstance(name, str):
            candidate = name.strip()[:120].strip()
            if candidate and not any(
                ord(character) < 32 or ord(character) == 127
                for character in candidate
            ):
                return candidate
        local_part = normalized_email.partition("@")[0][:120].strip()
        return local_part or "QuantGym 用户"

    @staticmethod
    def _csrf_error(code: CsrfFailureCode | None) -> ApiError:
        resolved = code or CsrfFailureCode.PROOF_INVALID
        messages = {
            CsrfFailureCode.ORIGIN_INVALID: "请求来源验证失败",
            CsrfFailureCode.PROOF_MISSING: "缺少请求验证信息",
            CsrfFailureCode.PROOF_INVALID: "请求验证信息无效",
            CsrfFailureCode.PROOF_STALE: "请求验证信息已过期",
            CsrfFailureCode.PROOF_CONSUMED: "请求验证信息已使用",
        }
        return ApiError(
            status_code=403,
            code=resolved.value,
            message=messages[resolved],
            retryable=False,
        )

    @staticmethod
    def _auth_required() -> ApiError:
        return ApiError(
            status_code=401,
            code="AUTH_REQUIRED",
            message="请先登录",
            retryable=False,
        )

    @staticmethod
    def _password_reset_error() -> ApiError:
        return ApiError(
            status_code=400,
            code="PASSWORD_RESET_INVALID",
            message="重置链接无效或已过期",
            retryable=False,
        )

    @staticmethod
    def _password_reset_unavailable() -> ApiError:
        return ApiError(
            status_code=503,
            code="PASSWORD_RESET_UNAVAILABLE",
            message="密码重置邮件暂时不可用，请使用 Google 登录或稍后重试",
            retryable=True,
        )

    @staticmethod
    def _challenge_capacity_error() -> ApiError:
        return ApiError(
            status_code=503,
            code="AUTH_CHALLENGE_CAPACITY_LIMITED",
            message="身份验证服务暂时繁忙，请稍后重试",
            retryable=True,
            headers={"Retry-After": "30"},
        )

    @staticmethod
    def _challenge_rate_limit_error(retry_after: int) -> ApiError:
        return ApiError(
            status_code=429,
            code="AUTH_CHALLENGE_RATE_LIMITED",
            message="身份验证请求过多，请稍后重试",
            retryable=True,
            headers={"Retry-After": str(retry_after)},
        )

    @staticmethod
    def _account_request_error() -> ApiError:
        return ApiError(
            status_code=400,
            code="ACCOUNT_REQUEST_INVALID",
            message="账号请求无法完成",
            retryable=False,
        )

    @staticmethod
    def _invalid_credentials() -> ApiError:
        return ApiError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="邮箱或密码不正确",
            retryable=False,
        )

    @staticmethod
    def _google_login_error() -> ApiError:
        return ApiError(
            status_code=400,
            code="GOOGLE_OAUTH_FAILED",
            message="Google 登录未能完成",
            retryable=False,
        )
