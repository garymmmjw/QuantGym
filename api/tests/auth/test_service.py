from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from pydantic import SecretStr

import api.app.auth.service as service_module
from api.app.auth.challenge_limits import PreAuthChallengeRateLimiter
from api.app.auth.csrf import CsrfRequestProof, generate_csrf_token
from api.app.auth.google import GoogleIdentity
from api.app.auth.models import SessionIssue, SessionRecord
from api.app.auth.service import (
    LAST_SEEN_UPDATE_INTERVAL,
    AuthService,
    ChallengeConsumeStatus,
    LoginRateLimiter,
    NullPasswordResetSender,
    SessionMaterial,
    SqlAlchemyAuthRepository,
    _insert_session_row,
)
from api.app.errors import ApiError
from api.app.users.models import PreferencesRecord, UserRecord


NOW = datetime(2026, 7, 22, 8, 0, tzinfo=UTC)
PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"
SESSION_SECRET = SecretStr("session_" + "s" * 48)
CSRF_SECRET = SecretStr("csrf_" + "c" * 48)


def _proof() -> CsrfRequestProof:
    token = generate_csrf_token().get_secret_value()
    return CsrfRequestProof.from_values(
        origin=PREVIEW_ORIGIN,
        cookie_token=token,
        header_token=token,
    )


def _user(user_id: UUID, *, password_hash: str | None = "stored-hash") -> UserRecord:
    return UserRecord(
        id=user_id,
        email="gary@example.com",
        normalized_email="gary@example.com",
        password_hash=password_hash,
        display_name="Gary",
        status="active",
        email_verified_at=None,
        created_at=NOW,
        updated_at=NOW,
    )


def _preferences(user_id: UUID) -> PreferencesRecord:
    return PreferencesRecord(
        user_id=user_id,
        theme="system",
        language="zh-CN",
        version=1,
        updated_at=NOW,
    )


def _session_record(material: SessionMaterial, user_id: UUID) -> SessionRecord:
    return SessionRecord(
        id=material.id,
        user_id=user_id,
        token_hash=material.token_hash,
        csrf_hash=material.csrf_hash,
        expires_at=material.expires_at,
        last_seen_at=material.created_at,
        revoked_at=None,
        created_at=material.created_at,
    )


class FakeAuthRepository:
    def __init__(self, *, login_succeeds: bool = True) -> None:
        self.login_succeeds = login_succeeds
        self.register_call: dict[str, Any] | None = None
        self.login_call: dict[str, Any] | None = None
        self.google_call: dict[str, Any] | None = None
        self.created_session: tuple[UUID, SessionMaterial] | None = None
        self.pre_auth_creates = 0

    def create_pre_auth_challenge(self, **_values: Any) -> bool:
        self.pre_auth_creates += 1
        return True

    def consume_pre_auth_challenge(
        self,
        *,
        token_hash: str,
        consumed_at: datetime,
    ) -> ChallengeConsumeStatus:
        assert re.fullmatch(r"[0-9a-f]{64}", token_hash)
        assert consumed_at == NOW
        return ChallengeConsumeStatus.CONSUMED

    def register_local_with_session(self, **values: Any) -> Any:
        self.register_call = values
        user_id = values["user_id"]
        material = values["session"]
        return _user(user_id), _preferences(user_id), _session_record(material, user_id)

    def login_with_session(self, **values: Any) -> Any:
        self.login_call = values
        if not self.login_succeeds:
            return None
        user_id = UUID("d38419e0-c3f2-4fba-aaeb-764867bf7e53")
        material = values["session"]
        return _user(user_id), _preferences(user_id), _session_record(material, user_id)

    def create_session(self, *, user_id: UUID, session: SessionMaterial) -> SessionRecord:
        self.created_session = (user_id, session)
        return _session_record(session, user_id)

    def complete_google_login_with_session(self, **values: Any) -> Any:
        self.google_call = values
        user_id = UUID("dc3aa414-2c40-4bc0-a82c-e0cadab32a6c")
        material = values["session"]
        return (
            _user(user_id, password_hash=None),
            _preferences(user_id),
            _session_record(material, user_id),
        )


def _service(repository: Any) -> AuthService:
    return AuthService(
        repository=repository,
        session_secret=SESSION_SECRET,
        csrf_signing_secret=CSRF_SECRET,
        preview_origin=PREVIEW_ORIGIN,
        clock=lambda: NOW,
        monotonic=lambda: 0.0,
        reset_sender=NullPasswordResetSender(),
    )


def test_disabled_password_reset_fails_before_account_lookup() -> None:
    service = _service(FakeAuthRepository())

    with pytest.raises(ApiError) as raised:
        service.forgot_password(email="gary@example.com", proof=_proof())

    assert raised.value.status_code == 503
    assert raised.value.code == "PASSWORD_RESET_UNAVAILABLE"
    assert raised.value.retryable is True


def test_pre_auth_issue_rate_limit_prevents_more_database_challenges() -> None:
    repository = FakeAuthRepository()
    limiter = PreAuthChallengeRateLimiter(
        signing_secret=SESSION_SECRET,
        browser_max_starts=1,
        ip_max_starts=2,
        window_seconds=60,
        monotonic=lambda: 0,
    )
    service = AuthService(
        repository=repository,
        session_secret=SESSION_SECRET,
        csrf_signing_secret=CSRF_SECRET,
        preview_origin=PREVIEW_ORIGIN,
        clock=lambda: NOW,
        monotonic=lambda: 0,
        reset_sender=NullPasswordResetSender(),
        pre_auth_rate_limiter=limiter,
    )
    browser = "B" * 43

    service.issue_pre_auth_csrf(
        client_ip="203.0.113.1", browser_binding=browser
    )
    with pytest.raises(ApiError) as raised:
        service.issue_pre_auth_csrf(
            client_ip="203.0.113.2", browser_binding=browser
        )

    assert raised.value.status_code == 429
    assert raised.value.code == "AUTH_CHALLENGE_RATE_LIMITED"
    assert raised.value.headers == {"Retry-After": "60"}
    assert repository.pre_auth_creates == 1


def test_register_hands_account_identity_preferences_and_session_to_one_repository_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repository = FakeAuthRepository()
    monkeypatch.setattr(service_module, "hash_password", lambda _password: "argon-hash")

    result = _service(repository).register(
        email="  Gary@EXAMPLE.com ",
        password=SecretStr("correct horse battery staple"),
        display_name="Gary",
        proof=_proof(),
    )

    assert repository.register_call is not None
    call = repository.register_call
    material = call["session"]
    assert call["email"] == call["normalized_email"] == "gary@example.com"
    assert call["password_hash"] == "argon-hash"
    assert call["user_id"] == result.user.id
    assert material.issue is result.session_issue
    assert material.created_at == NOW
    assert material.expires_at == result.session_issue.expires_at
    assert re.fullmatch(r"[0-9a-f]{64}", material.token_hash)
    assert re.fullmatch(r"[0-9a-f]{64}", material.csrf_hash)
    assert repository.created_session is None


def test_login_verification_and_session_creation_use_only_atomic_repository_method() -> None:
    repository = FakeAuthRepository()
    password = SecretStr("correct horse battery staple")

    result = _service(repository).login(
        email="Gary@example.com",
        password=password,
        proof=_proof(),
        client_ip="203.0.113.7",
    )

    assert repository.login_call is not None
    call = repository.login_call
    assert call["normalized_email"] == "gary@example.com"
    assert call["password"] is password
    assert call["session"].issue is result.session_issue
    assert call["now"] == NOW
    assert repository.created_session is None


def test_failed_login_has_one_fixed_secret_safe_error() -> None:
    repository = FakeAuthRepository(login_succeeds=False)
    secret_password = "this-must-never-escape"

    with pytest.raises(ApiError) as raised:
        _service(repository).login(
            email="gary@example.com",
            password=SecretStr(secret_password),
            proof=_proof(),
            client_ip="203.0.113.8",
        )

    assert raised.value.status_code == 401
    assert raised.value.code == "INVALID_CREDENTIALS"
    assert raised.value.message == "邮箱或密码不正确"
    assert secret_password not in repr(raised.value)


def test_google_login_accepts_only_verified_email_and_uses_one_atomic_call() -> None:
    repository = FakeAuthRepository()
    identity = GoogleIdentity(
        subject="google-subject-123",
        email="Gary@Example.com",
        email_verified=True,
        name="G" * 140,
        picture=None,
        redirect_path="/dashboard",
    )

    result = _service(repository).complete_google_login(identity)

    assert repository.google_call is not None
    call = repository.google_call
    assert call["subject"] == "google-subject-123"
    assert call["email"] == call["normalized_email"] == "gary@example.com"
    assert call["display_name"] == "G" * 120
    assert call["session"].issue is result.session_issue
    assert call["now"] == NOW


@pytest.mark.parametrize(
    ("email", "verified"),
    [(None, True), ("gary@example.com", False)],
)
def test_google_login_missing_or_unverified_email_has_one_fixed_error(
    email: str | None,
    verified: bool,
) -> None:
    repository = FakeAuthRepository()
    identity = GoogleIdentity(
        subject="google-subject-123",
        email=email,
        email_verified=verified,
        name="Gary",
        picture=None,
        redirect_path="/",
    )

    with pytest.raises(ApiError) as raised:
        _service(repository).complete_google_login(identity)

    assert raised.value.status_code == 400
    assert raised.value.code == "GOOGLE_OAUTH_FAILED"
    assert raised.value.message == "Google 登录未能完成"
    assert repository.google_call is None


def test_rotation_passes_hashed_old_cookie_and_new_material_in_one_call() -> None:
    repository = FakeAuthRepository()
    service = _service(repository)
    user_id = uuid4()
    old_cookie = SecretStr("o" * 43)

    issue = service._issue_session(
        user_id=user_id,
        existing_session_token=old_cookie,
        now=NOW,
    )

    assert repository.created_session is not None
    stored_user_id, material = repository.created_session
    assert stored_user_id == user_id
    assert material.issue is issue
    assert material.revoke_token_hash == service_module.hash_session_token(
        old_cookie,
        SESSION_SECRET,
    )
    assert old_cookie.get_secret_value() not in repr(material)


def test_login_rate_limits_email_and_ip_as_independent_hmac_buckets() -> None:
    email_limiter = LoginRateLimiter(
        signing_secret=SESSION_SECRET,
        email_max_attempts=2,
        ip_max_attempts=3,
        window_seconds=300,
        capacity=100,
        monotonic=lambda: 0.0,
    )
    email_limiter.record_failure("gary@example.com", "203.0.113.1")
    email_limiter.record_failure("gary@example.com", "203.0.113.2")
    assert email_limiter.retry_after("gary@example.com", "203.0.113.99") == 300
    assert email_limiter.retry_after("other@example.com", "203.0.113.99") is None

    ip_limiter = LoginRateLimiter(
        signing_secret=SESSION_SECRET,
        email_max_attempts=2,
        ip_max_attempts=3,
        window_seconds=300,
        capacity=100,
        monotonic=lambda: 0.0,
    )
    for index in range(3):
        ip_limiter.record_failure(f"person-{index}@example.com", "203.0.113.5")
    assert ip_limiter.retry_after("fresh@example.com", "203.0.113.5") == 300
    assert ip_limiter.retry_after("fresh@example.com", "203.0.113.6") is None


def test_success_clears_email_history_but_not_shared_ip_history() -> None:
    limiter = LoginRateLimiter(
        signing_secret=SESSION_SECRET,
        email_max_attempts=2,
        ip_max_attempts=2,
        window_seconds=300,
        capacity=100,
        monotonic=lambda: 0.0,
    )
    limiter.record_failure("gary@example.com", "203.0.113.5")
    limiter.record_failure("gary@example.com", "203.0.113.5")
    limiter.reset("gary@example.com", "203.0.113.5")

    assert limiter.retry_after("gary@example.com", "203.0.113.5") == 300
    assert limiter.retry_after("gary@example.com", "203.0.113.6") is None


class FakeResult:
    def __init__(
        self,
        *,
        row: dict[str, Any] | None = None,
        rowcount: int = 0,
    ) -> None:
        self._row = row
        self.rowcount = rowcount

    def mappings(self) -> FakeResult:
        return self

    def one(self) -> dict[str, Any]:
        assert self._row is not None
        return self._row

    def first(self) -> dict[str, Any] | None:
        return self._row


class RecordingConnection:
    def __init__(self, *, select_row: dict[str, Any] | None = None, touch: int = 0) -> None:
        self.select_row = select_row
        self.touch = touch
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def execute(self, statement: Any, parameters: dict[str, Any]) -> FakeResult:
        sql = str(statement)
        self.calls.append((sql, parameters))
        if "INSERT INTO sessions" in sql:
            row = {
                "id": parameters["id"],
                "user_id": parameters["user_id"],
                "token_hash": parameters["token_hash"],
                "csrf_hash": parameters["csrf_hash"],
                "expires_at": parameters["expires_at"],
                "last_seen_at": parameters["created_at"],
                "revoked_at": None,
                "created_at": parameters["created_at"],
            }
            return FakeResult(row=row, rowcount=1)
        if "FROM sessions s" in sql:
            return FakeResult(row=self.select_row)
        if "SET last_seen_at" in sql:
            return FakeResult(rowcount=self.touch)
        return FakeResult(rowcount=1)


class BeginContext:
    def __init__(self, connection: RecordingConnection) -> None:
        self.connection = connection

    def __enter__(self) -> RecordingConnection:
        return self.connection

    def __exit__(self, *_args: object) -> None:
        return None


class FakeEngine:
    def __init__(self, connection: RecordingConnection) -> None:
        self.connection = connection

    def begin(self) -> BeginContext:
        return BeginContext(self.connection)


def _material(*, revoke_token_hash: str | None = None) -> SessionMaterial:
    issue = SessionIssue(
        session_token=SecretStr("s" * 43),
        csrf_token=SecretStr("c" * 43),
        expires_at=NOW + timedelta(days=7),
    )
    return SessionMaterial(
        id=uuid4(),
        token_hash="1" * 64,
        csrf_hash="2" * 64,
        created_at=NOW,
        expires_at=issue.expires_at,
        issue=issue,
        revoke_token_hash=revoke_token_hash,
    )


def test_session_insert_revokes_the_previous_browser_session_across_accounts() -> None:
    connection = RecordingConnection()
    user_id = uuid4()
    material = _material(revoke_token_hash="3" * 64)

    row = _insert_session_row(connection, session=material, user_id=user_id)

    revoke_sql, revoke_parameters = connection.calls[0]
    insert_sql, insert_parameters = connection.calls[1]
    assert "WHERE token_hash = :token_hash" in revoke_sql
    assert "user_id" not in revoke_parameters
    assert revoke_parameters["token_hash"] == "3" * 64
    assert "INSERT INTO sessions" in insert_sql
    assert insert_parameters["user_id"] == user_id
    assert row["id"] == material.id


class GoogleIdentityRaceConnection(RecordingConnection):
    def __init__(self, *, winner_user_id: UUID) -> None:
        super().__init__()
        self.winner_user_id = winner_user_id
        self.identity_reads = 0
        self.created_user_id: UUID | None = None

    def execute(self, statement: Any, parameters: dict[str, Any]) -> FakeResult:
        sql = str(statement)
        self.calls.append((sql, parameters))
        if "FROM user_identities" in sql:
            self.identity_reads += 1
            return FakeResult(
                row=(
                    None
                    if self.identity_reads == 1
                    else {"user_id": self.winner_user_id}
                )
            )
        if "INSERT INTO users" in sql:
            self.created_user_id = parameters["id"]
            return FakeResult(row={"id": self.created_user_id}, rowcount=1)
        if "INSERT INTO user_identities" in sql:
            # Simulate another callback winning the provider+subject unique key.
            return FakeResult(row=None, rowcount=0)
        if "FROM users u" in sql:
            return FakeResult(row=_active_account_row(self.winner_user_id))
        if "INSERT INTO sessions" in sql:
            row = {
                "id": parameters["id"],
                "user_id": parameters["user_id"],
                "token_hash": parameters["token_hash"],
                "csrf_hash": parameters["csrf_hash"],
                "expires_at": parameters["expires_at"],
                "last_seen_at": parameters["created_at"],
                "revoked_at": None,
                "created_at": parameters["created_at"],
            }
            return FakeResult(row=row, rowcount=1)
        return FakeResult(rowcount=1)


class GoogleExistingEmailConnection(RecordingConnection):
    def __init__(self, *, existing_user_id: UUID) -> None:
        super().__init__()
        self.existing_user_id = existing_user_id
        self.account_reads = 0

    def execute(self, statement: Any, parameters: dict[str, Any]) -> FakeResult:
        sql = str(statement)
        self.calls.append((sql, parameters))
        if "FROM user_identities" in sql:
            return FakeResult(row=None)
        if "INSERT INTO users" in sql:
            # A concurrent or pre-existing local account owns this email.
            return FakeResult(row=None, rowcount=0)
        if "SELECT id" in sql and "FROM users" in sql:
            return FakeResult(row={"id": self.existing_user_id})
        if "FROM users u" in sql:
            self.account_reads += 1
            row = _active_account_row(self.existing_user_id)
            row["email_verified_at"] = NOW if self.account_reads > 1 else None
            return FakeResult(row=row)
        if "INSERT INTO user_identities" in sql:
            return FakeResult(row={"user_id": self.existing_user_id}, rowcount=1)
        if "INSERT INTO sessions" in sql:
            row = {
                "id": parameters["id"],
                "user_id": parameters["user_id"],
                "token_hash": parameters["token_hash"],
                "csrf_hash": parameters["csrf_hash"],
                "expires_at": parameters["expires_at"],
                "last_seen_at": parameters["created_at"],
                "revoked_at": None,
                "created_at": parameters["created_at"],
            }
            return FakeResult(row=row, rowcount=1)
        return FakeResult(rowcount=1)


def _active_account_row(user_id: UUID) -> dict[str, Any]:
    return {
        "id": user_id,
        "email": "gary@example.com",
        "normalized_email": "gary@example.com",
        "display_name": "Gary",
        "status": "active",
        "email_verified_at": NOW,
        "created_at": NOW,
        "updated_at": NOW,
        "preference_user_id": user_id,
        "theme": "system",
        "language": "zh-CN",
        "version": 1,
        "preference_updated_at": NOW,
    }


def test_google_subject_unique_race_uses_winner_and_deletes_losing_new_account() -> None:
    winner_user_id = uuid4()
    connection = GoogleIdentityRaceConnection(winner_user_id=winner_user_id)
    repository = SqlAlchemyAuthRepository(FakeEngine(connection))

    result = repository.complete_google_login_with_session(
        subject="google-subject-123",
        email="gary@example.com",
        normalized_email="gary@example.com",
        display_name="Gary",
        session=_material(),
        now=NOW,
    )

    assert result is not None
    user, _preferences_record, session = result
    assert user.id == winner_user_id
    assert session.user_id == winner_user_id
    assert connection.created_user_id is not None
    delete_calls = [
        parameters
        for sql, parameters in connection.calls
        if "DELETE FROM users" in sql
    ]
    assert delete_calls == [{"user_id": connection.created_user_id}]
    session_calls = [
        parameters
        for sql, parameters in connection.calls
        if "INSERT INTO sessions" in sql
    ]
    assert session_calls[0]["user_id"] == winner_user_id


def test_google_verified_email_safely_binds_and_verifies_existing_local_account() -> None:
    existing_user_id = uuid4()
    connection = GoogleExistingEmailConnection(existing_user_id=existing_user_id)
    repository = SqlAlchemyAuthRepository(FakeEngine(connection))

    result = repository.complete_google_login_with_session(
        subject="google-subject-verified-email",
        email="gary@example.com",
        normalized_email="gary@example.com",
        display_name="Ignored for existing account",
        session=_material(),
        now=NOW,
    )

    assert result is not None
    user, _preferences_record, session = result
    assert user.id == existing_user_id
    assert user.email_verified_at == NOW
    assert session.user_id == existing_user_id
    identity_inserts = [
        parameters
        for sql, parameters in connection.calls
        if "INSERT INTO user_identities" in sql
    ]
    assert identity_inserts[0]["user_id"] == existing_user_id
    verification_updates = [
        parameters
        for sql, parameters in connection.calls
        if "SET email_verified_at" in sql
    ]
    assert verification_updates == [
        {
            "user_id": existing_user_id,
            "normalized_email": "gary@example.com",
            "verified_at": NOW,
        }
    ]


def _session_context_row(*, last_seen_at: datetime) -> dict[str, Any]:
    user_id = uuid4()
    return {
        "session_id": uuid4(),
        "session_user_id": user_id,
        "token_hash": "1" * 64,
        "csrf_hash": "2" * 64,
        "expires_at": NOW + timedelta(days=1),
        "last_seen_at": last_seen_at,
        "revoked_at": None,
        "session_created_at": NOW - timedelta(days=1),
        "user_id": user_id,
        "email": "gary@example.com",
        "normalized_email": "gary@example.com",
        "display_name": "Gary",
        "status": "active",
        "email_verified_at": None,
        "user_created_at": NOW - timedelta(days=2),
        "user_updated_at": NOW - timedelta(days=1),
        "preference_user_id": user_id,
        "theme": "system",
        "language": "zh-CN",
        "version": 1,
        "preference_updated_at": NOW,
    }


def test_session_reads_exclude_password_hash_and_throttle_last_seen_writes() -> None:
    previous_seen = NOW - LAST_SEEN_UPDATE_INTERVAL + timedelta(seconds=1)
    connection = RecordingConnection(
        select_row=_session_context_row(last_seen_at=previous_seen),
        touch=0,
    )
    repository = SqlAlchemyAuthRepository(FakeEngine(connection))

    context = repository.get_session_context(token_hash="1" * 64, now=NOW)

    assert context is not None
    select_sql, _select_parameters = connection.calls[0]
    _touch_sql, touch_parameters = connection.calls[1]
    assert "password_hash" not in select_sql
    assert "FOR UPDATE OF s" in select_sql
    assert context.user.password_hash is None
    assert context.session.last_seen_at == previous_seen
    assert touch_parameters["touch_before"] == NOW - LAST_SEEN_UPDATE_INTERVAL
