from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Barrier, Lock
from typing import Any, Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine, text

import api.app.auth.service as service_module
from api.app.auth.csrf import CsrfRequestProof
from api.app.auth.google import (
    GoogleIdentity,
    GoogleOAuthChallengeForPersistence,
    PkceVerifierDeletion,
)
from api.app.auth.google_store import SqlAlchemyGoogleOAuthChallengeStore
from api.app.auth.service import (
    AuthService,
    NullPasswordResetSender,
    SqlAlchemyAuthRepository,
    hash_password_reset_token,
)
from api.app.config import Settings
from api.app.errors import ApiError
from api.app.main import create_app


REPO_ROOT = Path(__file__).resolve().parents[3]
NOW = datetime(2026, 7, 22, 12, 0, tzinfo=UTC)
PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"
EDGE_SECRET = "edge_" + "e" * 48
SESSION_SECRET = SecretStr("session_" + "s" * 48)
CSRF_SECRET = SecretStr("csrf_" + "c" * 48)
PASSWORD = "correct horse battery staple"
NEW_PASSWORD = "new correct horse battery staple"
_APPLICATION_TABLES = (
    "media_objects",
    "audit_events",
    "plan_tasks",
    "notifications",
    "auth_challenges",
    "sessions",
    "user_identities",
    "preferences",
    "users",
)


def _postgres_dependencies_available() -> bool:
    try:
        import alembic  # noqa: F401
        import psycopg  # noqa: F401
        import testcontainers.postgres  # noqa: F401
    except ImportError:
        return False
    return True


@pytest.fixture(scope="module")
def postgres_engine() -> Iterator[Any]:
    if not _postgres_dependencies_available():
        pytest.skip("locked PostgreSQL integration dependencies are unavailable")

    from alembic import command
    from alembic.config import Config
    from testcontainers.postgres import PostgresContainer

    container = PostgresContainer("postgres:18", driver="psycopg")
    try:
        container.start()
    except Exception as error:
        pytest.skip(
            "ephemeral PostgreSQL 18 unavailable: "
            f"{type(error).__name__}: {error}"
        )

    engine = create_engine(container.get_connection_url(), pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            config = Config(str(REPO_ROOT / "api" / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
            server_major = int(
                connection.exec_driver_sql("SHOW server_version_num").scalar_one()
            ) // 10_000
            assert server_major == 18
        yield engine
    finally:
        engine.dispose()
        with suppress(Exception):
            container.stop()


@pytest.fixture(autouse=True)
def clean_database(postgres_engine: Any) -> Iterator[None]:
    quoted = ", ".join(f'"{table}"' for table in _APPLICATION_TABLES)
    with postgres_engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {quoted} CASCADE"))
    yield


def _service(engine: Any) -> AuthService:
    return AuthService(
        repository=SqlAlchemyAuthRepository(engine),
        session_secret=SESSION_SECRET,
        csrf_signing_secret=CSRF_SECRET,
        preview_origin=PREVIEW_ORIGIN,
        clock=lambda: NOW,
        monotonic=lambda: 0.0,
        reset_sender=NullPasswordResetSender(),
    )


def _pre_auth_proof(service: AuthService) -> CsrfRequestProof:
    token = service.issue_pre_auth_csrf().csrf_token.get_secret_value()
    return CsrfRequestProof.from_values(
        origin=PREVIEW_ORIGIN,
        cookie_token=token,
        header_token=token,
    )


def _session_proof(csrf_token: SecretStr) -> CsrfRequestProof:
    raw = csrf_token.get_secret_value()
    return CsrfRequestProof.from_values(
        origin=PREVIEW_ORIGIN,
        cookie_token=raw,
        header_token=raw,
    )


def _register(
    service: AuthService,
    *,
    email: str,
    display_name: str,
    existing_session_token: SecretStr | None = None,
) -> Any:
    return service.register(
        email=email,
        password=SecretStr(PASSWORD),
        display_name=display_name,
        proof=_pre_auth_proof(service),
        existing_session_token=existing_session_token,
    )


def test_local_account_session_logout_and_password_reset_are_transactional(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    registered = _register(
        service,
        email="Gary@Example.com",
        display_name="Gary",
    )
    raw_session = registered.session_issue.session_token.get_secret_value()
    raw_csrf = registered.session_issue.csrf_token.get_secret_value()

    with postgres_engine.connect() as connection:
        user_row = connection.execute(
            text("SELECT normalized_email, password_hash FROM users")
        ).mappings().one()
        session_row = connection.execute(
            text("SELECT token_hash, csrf_hash, revoked_at FROM sessions")
        ).mappings().one()
        assert user_row["normalized_email"] == "gary@example.com"
        assert str(user_row["password_hash"]).startswith("$argon2id$")
        assert raw_session not in str(session_row)
        assert raw_csrf not in str(session_row)
        assert len(session_row["token_hash"]) == 64
        assert len(session_row["csrf_hash"]) == 64

    assert service.me(registered.session_issue.session_token).email == "gary@example.com"
    service.logout(
        session_token=registered.session_issue.session_token,
        proof=_session_proof(registered.session_issue.csrf_token),
    )
    with pytest.raises(ApiError, match="请先登录"):
        service.me(registered.session_issue.session_token)

    logged_in = service.login(
        email="gary@example.com",
        password=SecretStr(PASSWORD),
        proof=_pre_auth_proof(service),
        client_ip="203.0.113.10",
    )

    deliveries: list[Any] = []
    service._reset_sender = type(
        "CaptureResetSender",
        (),
        {"send_password_reset": lambda _self, delivery: deliveries.append(delivery)},
    )()
    service.forgot_password(
        email="gary@example.com",
        proof=_pre_auth_proof(service),
    )
    assert len(deliveries) == 1
    reset_url = deliveries[0].reset_url.get_secret_value()
    reset_token = reset_url.split("#", 1)[1]
    assert reset_token not in repr(deliveries[0])

    service.reset_password(
        token=SecretStr(reset_token),
        new_password=SecretStr(NEW_PASSWORD),
        proof=_pre_auth_proof(service),
    )
    with pytest.raises(ApiError, match="请先登录"):
        service.me(logged_in.session_issue.session_token)
    with pytest.raises(ApiError) as replay:
        service.reset_password(
            token=SecretStr(reset_token),
            new_password=SecretStr(NEW_PASSWORD),
            proof=_pre_auth_proof(service),
        )
    assert replay.value.code == "PASSWORD_RESET_INVALID"

    with pytest.raises(ApiError) as old_password:
        service.login(
            email="gary@example.com",
            password=SecretStr(PASSWORD),
            proof=_pre_auth_proof(service),
            client_ip="203.0.113.11",
        )
    assert old_password.value.code == "INVALID_CREDENTIALS"
    assert service.login(
        email="gary@example.com",
        password=SecretStr(NEW_PASSWORD),
        proof=_pre_auth_proof(service),
        client_ip="203.0.113.12",
    ).user.id == registered.user.id


def test_concurrent_forgot_keeps_one_valid_token_and_reset_consumes_all_siblings(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    registered = _register(
        service,
        email="reset-race@example.com",
        display_name="Reset Race",
    )
    deliveries: list[Any] = []
    delivery_lock = Lock()

    class CaptureResetSender:
        def send_password_reset(self, delivery: Any) -> None:
            with delivery_lock:
                deliveries.append(delivery)

    service._reset_sender = CaptureResetSender()
    proofs = [_pre_auth_proof(service), _pre_auth_proof(service)]
    barrier = Barrier(2)

    def request_reset(index: int) -> None:
        barrier.wait(timeout=10)
        service.forgot_password(
            email="reset-race@example.com",
            proof=proofs[index],
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(request_reset, (0, 1)))

    assert len(deliveries) == 2
    delivered_tokens = [
        delivery.reset_url.get_secret_value().split("#", 1)[1]
        for delivery in deliveries
    ]
    delivered_by_hash = {
        hash_password_reset_token(SecretStr(token), SESSION_SECRET): token
        for token in delivered_tokens
    }
    with postgres_engine.connect() as connection:
        active_rows = connection.execute(
            text(
                """
                SELECT token_hash
                FROM auth_challenges
                WHERE kind = 'password_reset'
                  AND user_id = :user_id
                  AND consumed_at IS NULL
                  AND expires_at > :now
                """
            ),
            {"user_id": registered.user.id, "now": NOW},
        ).scalars().all()
    assert len(active_rows) == 1
    active_token = delivered_by_hash[active_rows[0]]
    superseded_token = next(
        token for token in delivered_tokens if token != active_token
    )

    with pytest.raises(ApiError) as superseded:
        service.reset_password(
            token=SecretStr(superseded_token),
            new_password=SecretStr(NEW_PASSWORD),
            proof=_pre_auth_proof(service),
        )
    assert superseded.value.code == "PASSWORD_RESET_INVALID"

    # Recreate a legacy/racing sibling row to prove a successful reset
    # invalidates every outstanding token for the user, not only its target.
    superseded_hash = hash_password_reset_token(
        SecretStr(superseded_token),
        SESSION_SECRET,
    )
    with postgres_engine.begin() as connection:
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
                "user_id": registered.user.id,
                "token_hash": superseded_hash,
                "expires_at": NOW + timedelta(minutes=20),
                "created_at": NOW - timedelta(minutes=1),
            },
        )

    service.reset_password(
        token=SecretStr(active_token),
        new_password=SecretStr(NEW_PASSWORD),
        proof=_pre_auth_proof(service),
    )
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM auth_challenges
                WHERE kind = 'password_reset'
                  AND user_id = :user_id
                  AND consumed_at IS NULL
                """
            ),
            {"user_id": registered.user.id},
        ).scalar_one() == 0

    for token in (active_token, superseded_token):
        with pytest.raises(ApiError) as replay:
            service.reset_password(
                token=SecretStr(token),
                new_password=SecretStr(NEW_PASSWORD),
                proof=_pre_auth_proof(service),
            )
        assert replay.value.code == "PASSWORD_RESET_INVALID"


def test_pre_auth_capacity_is_atomic_and_stale_rows_are_cleaned(
    postgres_engine: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(service_module, "PRE_AUTH_ACTIVE_CAPACITY", 2)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO auth_challenges
                    (id, user_id, kind, token_hash, state_hash, nonce_hash,
                     pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                     expires_at, consumed_at, created_at)
                VALUES
                    (:expired_id, NULL, 'pre_auth_csrf', :expired_hash, NULL, NULL,
                     NULL, NULL, NULL, :expired_at, NULL, :created_at),
                    (:consumed_id, NULL, 'pre_auth_csrf', :consumed_hash, NULL, NULL,
                     NULL, NULL, NULL, :future_at, :consumed_at, :created_at)
                """
            ),
            {
                "expired_id": uuid4(),
                "expired_hash": "a" * 64,
                "expired_at": NOW,
                "consumed_id": uuid4(),
                "consumed_hash": "b" * 64,
                "future_at": NOW + timedelta(minutes=5),
                "consumed_at": NOW,
                "created_at": NOW - timedelta(minutes=10),
            },
        )

    services = (_service(postgres_engine), _service(postgres_engine))
    barrier = Barrier(2)

    def issue(index: int) -> Any:
        barrier.wait(timeout=10)
        try:
            return services[index].issue_pre_auth_csrf()
        except ApiError as error:
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(issue, (0, 1)))

    successes = [item for item in outcomes if not isinstance(item, ApiError)]
    failures = [item for item in outcomes if isinstance(item, ApiError)]
    assert len(successes) == 1
    assert len(failures) == 1
    assert failures[0].status_code == 503
    assert failures[0].code == "AUTH_CHALLENGE_CAPACITY_LIMITED"
    assert failures[0].headers == {"Retry-After": "30"}
    with postgres_engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT consumed_at, expires_at
                FROM auth_challenges
                WHERE kind = 'pre_auth_csrf'
                """
            )
        ).mappings().all()
    assert len(rows) == 2
    assert sum(row["consumed_at"] is None for row in rows) == 1
    assert sum(row["consumed_at"] is not None for row in rows) == 1
    assert all(row["expires_at"] > NOW for row in rows)


def test_new_pre_auth_issue_preserves_consumed_proof_error_until_expiry(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    service._reset_sender = type(
        "CaptureResetSender",
        (),
        {"send_password_reset": lambda self, **kwargs: None},
    )()
    consumed_token = service.issue_pre_auth_csrf().csrf_token.get_secret_value()
    consumed_proof = CsrfRequestProof.from_values(
        origin=PREVIEW_ORIGIN,
        cookie_token=consumed_token,
        header_token=consumed_token,
    )
    service.forgot_password(
        email="unknown@example.com",
        proof=consumed_proof,
    )

    service.issue_pre_auth_csrf()

    with pytest.raises(ApiError) as replay:
        service.forgot_password(
            email="unknown@example.com",
            proof=consumed_proof,
        )
    assert replay.value.code == "CSRF_PROOF_CONSUMED"


def test_password_reset_creation_cleans_stale_rows_and_revalidates_locked_user(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    target = _register(
        service,
        email="reset-cleanup@example.com",
        display_name="Reset Cleanup",
    )
    other = _register(
        service,
        email="reset-stale@example.com",
        display_name="Reset Stale",
    )
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO auth_challenges
                    (id, user_id, kind, token_hash, state_hash, nonce_hash,
                     pkce_verifier_ciphertext, pkce_key_id, redirect_path,
                     expires_at, consumed_at, created_at)
                VALUES
                    (:expired_id, :user_id, 'password_reset', :expired_hash,
                     NULL, NULL, NULL, NULL, NULL, :expired_at, NULL, :created_at),
                    (:consumed_id, :user_id, 'password_reset', :consumed_hash,
                     NULL, NULL, NULL, NULL, NULL, :future_at, :consumed_at,
                     :created_at)
                """
            ),
            {
                "expired_id": uuid4(),
                "consumed_id": uuid4(),
                "user_id": other.user.id,
                "expired_hash": "c" * 64,
                "consumed_hash": "d" * 64,
                "expired_at": NOW,
                "future_at": NOW + timedelta(minutes=10),
                "consumed_at": NOW,
                "created_at": NOW - timedelta(minutes=30),
            },
        )

    deliveries: list[Any] = []
    service._reset_sender = type(
        "CaptureResetSender",
        (),
        {"send_password_reset": lambda _self, delivery: deliveries.append(delivery)},
    )()
    service.forgot_password(
        email="reset-cleanup@example.com",
        proof=_pre_auth_proof(service),
    )
    assert len(deliveries) == 1
    with postgres_engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT user_id, consumed_at
                FROM auth_challenges
                WHERE kind = 'password_reset'
                """
            )
        ).mappings().all()
    assert rows == [{"user_id": target.user.id, "consumed_at": None}]

    with postgres_engine.begin() as connection:
        connection.execute(
            text("UPDATE users SET status = 'disabled' WHERE id = :user_id"),
            {"user_id": target.user.id},
        )
    assert service.repository.create_password_reset(
        user_id=target.user.id,
        token_hash="e" * 64,
        created_at=NOW + timedelta(seconds=1),
        expires_at=NOW + timedelta(minutes=30),
    ) is None
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM auth_challenges
                WHERE kind = 'password_reset' AND token_hash = :token_hash
                """
            ),
            {"token_hash": "e" * 64},
        ).scalar_one() == 0


def test_concurrent_registration_has_one_account_and_one_session(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    proofs = [_pre_auth_proof(service), _pre_auth_proof(service)]
    barrier = Barrier(2)

    def attempt(index: int) -> Any:
        barrier.wait(timeout=10)
        try:
            return service.register(
                email="race@example.com",
                password=SecretStr(PASSWORD),
                display_name=f"Racer {index}",
                proof=proofs[index],
            )
        except ApiError as error:
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(attempt, (0, 1)))

    successes = [item for item in outcomes if not isinstance(item, ApiError)]
    failures = [item for item in outcomes if isinstance(item, ApiError)]
    assert len(successes) == 1
    assert [error.code for error in failures] == ["ACCOUNT_REQUEST_INVALID"]
    with postgres_engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM users")).scalar_one() == 1
        assert (
            connection.execute(text("SELECT count(*) FROM user_identities")).scalar_one()
            == 1
        )
        assert connection.execute(text("SELECT count(*) FROM preferences")).scalar_one() == 1
        assert connection.execute(text("SELECT count(*) FROM sessions")).scalar_one() == 1


def test_new_account_rotation_revokes_the_previous_cross_account_cookie(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    first = _register(service, email="first@example.com", display_name="First")
    second = _register(
        service,
        email="second@example.com",
        display_name="Second",
        existing_session_token=first.session_issue.session_token,
    )

    with pytest.raises(ApiError, match="请先登录"):
        service.me(first.session_issue.session_token)
    assert service.me(second.session_issue.session_token).email == "second@example.com"
    with postgres_engine.connect() as connection:
        revoked = connection.execute(
            text("SELECT count(*) FROM sessions WHERE revoked_at IS NOT NULL")
        ).scalar_one()
        assert revoked == 1


def test_verified_google_identity_links_local_account_and_rotates_session(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    local = _register(service, email="gary@example.com", display_name="Gary")
    google = service.complete_google_login(
        GoogleIdentity(
            subject="google-gary-001",
            email="Gary@Example.com",
            email_verified=True,
            name="Provider Name Must Not Replace Existing Name",
            picture=None,
            redirect_path="/overview",
        ),
        existing_session_token=local.session_issue.session_token,
    )

    assert google.user.id == local.user.id
    assert google.user.display_name == "Gary"
    assert google.user.email_verified_at == NOW
    with pytest.raises(ApiError, match="请先登录"):
        service.me(local.session_issue.session_token)
    assert service.me(google.session_issue.session_token).email == "gary@example.com"
    with postgres_engine.connect() as connection:
        providers = connection.execute(
            text("SELECT provider FROM user_identities ORDER BY provider")
        ).scalars().all()
        assert providers == ["google", "local"]


def test_concurrent_google_callbacks_keep_one_identity_and_no_orphan_user(
    postgres_engine: Any,
) -> None:
    service = _service(postgres_engine)
    barrier = Barrier(2)
    identities = (
        GoogleIdentity(
            subject="shared-google-subject",
            email="first-google@example.com",
            email_verified=True,
            name="First Google",
            picture=None,
            redirect_path="/overview",
        ),
        GoogleIdentity(
            subject="shared-google-subject",
            email="second-google@example.com",
            email_verified=True,
            name="Second Google",
            picture=None,
            redirect_path="/overview",
        ),
    )

    def complete(identity: GoogleIdentity) -> Any:
        barrier.wait(timeout=10)
        return service.complete_google_login(identity)

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(complete, identities))

    assert results[0].user.id == results[1].user.id
    with postgres_engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM users")).scalar_one() == 1
        assert (
            connection.execute(text("SELECT count(*) FROM user_identities")).scalar_one()
            == 1
        )
        assert connection.execute(text("SELECT count(*) FROM preferences")).scalar_one() == 1
        assert connection.execute(text("SELECT count(*) FROM sessions")).scalar_one() == 2


@pytest.mark.asyncio
async def test_google_challenge_sql_matches_the_real_frozen_schema(
    postgres_engine: Any,
) -> None:
    store = SqlAlchemyGoogleOAuthChallengeStore(postgres_engine)
    challenge = GoogleOAuthChallengeForPersistence(
        token_hash="a" * 64,
        state_hash="a" * 64,
        nonce_hash="b" * 64,
        pkce_verifier_ciphertext=b"encrypted-pkce-verifier" + b"x" * 64,
        pkce_key_id="preview-2026-07",
        redirect_path="/overview",
        expires_at=NOW + timedelta(minutes=10),
        created_at=NOW,
    )
    await store.create(challenge)
    claimed_at = NOW + timedelta(minutes=1)
    claimed = await store.claim_and_delete_verifier(
        state_hash=challenge.state_hash,
        claimed_at=claimed_at,
        verifier_deletion=PkceVerifierDeletion(consumed_at=claimed_at),
    )

    assert claimed is not None
    assert claimed.pkce_verifier_ciphertext == challenge.pkce_verifier_ciphertext
    assert await store.claim_and_delete_verifier(
        state_hash=challenge.state_hash,
        claimed_at=claimed_at,
        verifier_deletion=PkceVerifierDeletion(consumed_at=claimed_at),
    ) is None
    with postgres_engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT consumed_at, pkce_verifier_ciphertext, pkce_key_id "
                "FROM auth_challenges WHERE state_hash = :state_hash"
            ),
            {"state_hash": challenge.state_hash},
        ).mappings().one()
        assert row["consumed_at"] == claimed_at
        assert row["pkce_verifier_ciphertext"] is None
        assert row["pkce_key_id"] is None


@pytest.mark.asyncio
async def test_google_challenge_capacity_is_atomic_and_cleans_expired_rows(
    postgres_engine: Any,
) -> None:
    stores = (
        SqlAlchemyGoogleOAuthChallengeStore(postgres_engine, capacity=1),
        SqlAlchemyGoogleOAuthChallengeStore(postgres_engine, capacity=1),
    )

    def challenge(
        state_hash: str,
        *,
        created_at: datetime,
        expires_at: datetime,
    ) -> GoogleOAuthChallengeForPersistence:
        return GoogleOAuthChallengeForPersistence(
            token_hash=state_hash,
            state_hash=state_hash,
            nonce_hash="f" * 64,
            pkce_verifier_ciphertext=b"encrypted-pkce-verifier" + b"x" * 64,
            pkce_key_id="preview-2026-07",
            redirect_path="/overview",
            expires_at=expires_at,
            created_at=created_at,
        )

    expired = challenge(
        "a" * 64,
        created_at=NOW - timedelta(minutes=20),
        expires_at=NOW - timedelta(minutes=10),
    )
    assert await stores[0].create(expired)

    results = await asyncio.gather(
        stores[0].create(
            challenge(
                "b" * 64,
                created_at=NOW,
                expires_at=NOW + timedelta(minutes=10),
            )
        ),
        stores[1].create(
            challenge(
                "c" * 64,
                created_at=NOW,
                expires_at=NOW + timedelta(minutes=10),
            )
        ),
    )

    assert sorted(results) == [False, True]
    with postgres_engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT state_hash FROM auth_challenges "
                "WHERE kind = 'google_oauth'"
            )
        ).scalars().all()
    assert len(rows) == 1
    assert rows[0] in {"b" * 64, "c" * 64}


def _settings() -> Settings:
    return Settings.model_validate(
        {
            "environment": "preview",
            "database_url": (
                "postgresql+psycopg://preview:secret@preview-postgres.internal/"
                "quantgym_v2_preview?sslmode=require"
            ),
            "allowed_origins": (PREVIEW_ORIGIN,),
            "edge_shared_secret": EDGE_SECRET,
            "session_secret": SESSION_SECRET,
            "csrf_signing_secret": CSRF_SECRET,
            "pkce_active_key_id": "preview-2026-07",
            "pkce_encryption_keys": (
                '{"preview-2026-07":'
                '"a2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2s="}'
            ),
            "google_client_id": "123456-preview.apps.googleusercontent.com",
            "google_client_secret": "google_secret_" + "g" * 32,
            "r2_endpoint": f"https://{'a' * 32}.r2.cloudflarestorage.com",
            "r2_access_key_id": "r2_access_" + "a" * 24,
            "r2_secret_access_key": "r2_secret_" + "s" * 40,
        }
    )


def test_real_http_routes_complete_cookie_session_journey(postgres_engine: Any) -> None:
    application = create_app(
        _settings(),
        engine_factory=lambda _database_url: postgres_engine,
        head_checker=lambda _engine: None,
    )
    headers = {
        "Origin": PREVIEW_ORIGIN,
        "X-QuantGym-Edge-Token": EDGE_SECRET,
    }

    with TestClient(application, base_url=PREVIEW_ORIGIN) as client:
        csrf_response = client.get(
            "/api/v2/auth/csrf",
            headers={"X-QuantGym-Edge-Token": EDGE_SECRET},
        )
        assert csrf_response.status_code == 200
        csrf_token = csrf_response.json()["csrfToken"]
        registered = client.post(
            "/api/v2/auth/register",
            headers={**headers, "X-CSRF-Token": csrf_token},
            json={
                "email": "route@example.com",
                "password": PASSWORD,
                "displayName": "Route User",
            },
        )
        assert registered.status_code == 201
        assert registered.json()["user"]["displayName"] == "Route User"
        session_cookie = client.cookies.get("__Host-qg_session")
        session_csrf = client.cookies.get("__Host-qg_csrf")
        assert session_cookie and session_csrf and session_csrf != csrf_token

        me = client.get("/api/v2/me", headers={"X-QuantGym-Edge-Token": EDGE_SECRET})
        assert me.status_code == 200
        assert me.json()["email"] == "route@example.com"

        logged_out = client.post(
            "/api/v2/auth/logout",
            headers={**headers, "X-CSRF-Token": session_csrf},
        )
        assert logged_out.status_code == 200
        assert client.get(
            "/api/v2/me",
            headers={"X-QuantGym-Edge-Token": EDGE_SECRET},
        ).status_code == 401
