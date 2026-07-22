from __future__ import annotations

from typing import Any

import pytest
from pydantic import SecretStr, ValidationError

from api.app.config import GOOGLE_REDIRECT_URI, Settings


EDGE_SECRET = "edge_" + "e" * 48
SESSION_SECRET = "session_" + "n" * 48
CSRF_SECRET = "csrf_" + "c" * 48
GOOGLE_CLIENT_SECRET = "google_secret_" + "g" * 32
PKCE_KEY = "a2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2s="
PKCE_KEYS = '{"preview-2026-07":"' + PKCE_KEY + '"}'
R2_ACCESS_KEY = "r2_access_" + "a" * 24
R2_SECRET_KEY = "r2_secret_" + "s" * 40
DATABASE_PASSWORD = "database-password-that-must-stay-redacted"
DATABASE_URL = (
    "postgresql+psycopg://quantgym_preview:"
    f"{DATABASE_PASSWORD}@preview-postgres.internal/quantgym_v2_preview?sslmode=require"
)
R2_ENDPOINT = f"https://{'a' * 32}.r2.cloudflarestorage.com"
PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"


def valid_settings_data() -> dict[str, Any]:
    return {
        "environment": "preview",
        "database_url": DATABASE_URL,
        "allowed_origins": (PREVIEW_ORIGIN,),
        "edge_shared_secret": EDGE_SECRET,
        "session_secret": SESSION_SECRET,
        "csrf_signing_secret": CSRF_SECRET,
        "pkce_active_key_id": "preview-2026-07",
        "pkce_encryption_keys": PKCE_KEYS,
        "google_client_id": "123456-preview.apps.googleusercontent.com",
        "google_client_secret": GOOGLE_CLIENT_SECRET,
        "pages_project": "quantgym-v2-preview",
        "api_service": "quantgym-v2-preview-api",
        "llm_service": "quantgym-v2-preview-llm",
        "postgres_resource": "quantgym-v2-preview-postgres",
        "r2_endpoint": R2_ENDPOINT,
        "r2_access_key_id": R2_ACCESS_KEY,
        "r2_secret_access_key": R2_SECRET_KEY,
        "r2_bucket": "quantgym-v2-preview-media",
    }


def test_complete_preview_settings_are_typed_and_secret_safe() -> None:
    settings = Settings.model_validate(valid_settings_data())

    assert settings.environment == "preview"
    assert settings.allowed_origins == (PREVIEW_ORIGIN,)
    assert settings.database_url.get_secret_value() == DATABASE_URL
    assert settings.edge_shared_secret.get_secret_value() == EDGE_SECRET
    assert settings.session_secret.get_secret_value() == SESSION_SECRET
    assert settings.csrf_signing_secret.get_secret_value() == CSRF_SECRET
    assert settings.google_redirect_uri == GOOGLE_REDIRECT_URI
    assert settings.password_reset_delivery_mode == "disabled"
    assert settings.r2_access_key_id.get_secret_value() == R2_ACCESS_KEY
    assert settings.r2_secret_access_key.get_secret_value() == R2_SECRET_KEY
    assert settings.r2_max_bytes == 5 * 1024 * 1024
    assert settings.r2_timeout_seconds == 5.0
    assert settings.r2_workers == 4
    assert DATABASE_PASSWORD not in repr(settings)
    assert R2_ENDPOINT not in repr(settings)
    assert R2_SECRET_KEY not in repr(settings)
    assert SESSION_SECRET not in repr(settings)
    assert CSRF_SECRET not in repr(settings)
    assert GOOGLE_CLIENT_SECRET not in repr(settings)
    assert PKCE_KEY not in repr(settings)


def test_database_accepts_the_standard_postgres_tls_port() -> None:
    data = valid_settings_data()
    data["database_url"] = (
        "postgresql+psycopg://preview:secret@preview-postgres.internal:5432/"
        "quantgym_v2_preview?sslmode=verify-full"
    )

    settings = Settings.model_validate(data)

    assert ":5432/" in settings.database_url.get_secret_value()


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("environment", "production"),
        ("pages_project", "quantgym"),
        ("pages_project", "quantgym-v2-preview.attacker"),
        ("api_service", "quantgym-api"),
        ("llm_service", "quantgym-llm"),
        ("postgres_resource", "quantgym-postgres"),
        ("r2_bucket", "quantgym-media"),
        ("production_resources_allowed", True),
        ("preview_synthetic_data_only", False),
    ],
)
def test_preview_rejects_non_preview_or_production_resource_configuration(
    field: str,
    value: object,
) -> None:
    data = valid_settings_data()
    data[field] = value

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


@pytest.mark.parametrize(
    "origins",
    [
        ("*",),
        ("https://beta.quantgym.app",),
        ("http://quantgym-v2-preview.pages.dev",),
        ("https://user:password@quantgym-v2-preview.pages.dev",),
        ("https://quantgym-v2-preview.pages.dev", "https://attacker.invalid"),
        (),
    ],
)
def test_preview_cors_accepts_only_the_exact_preview_origin(
    origins: tuple[str, ...],
) -> None:
    data = valid_settings_data()
    data["allowed_origins"] = origins

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


def test_preview_forbids_credentialed_cors() -> None:
    data = valid_settings_data()
    data["cors_allow_credentials"] = True

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


@pytest.mark.parametrize(
    "database_url",
    [
        "sqlite:///quantgym.db",
        "postgres://user:secret@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://:@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://%20preview:secret@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret%0A@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview%ZZ:secret@preview-postgres.internal/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@preview-postgres.internal/quantgym_v2_preview%0A?sslmode=require",
        "postgresql://user:secret@localhost/quantgym?sslmode=require",
        "postgresql://user:secret@127.0.0.1/quantgym?sslmode=require",
        "postgresql://user:secret@preview-postgres.internal/quantgym",
        "postgresql://user:secret@preview-postgres.internal/quantgym?sslmode=disable",
        "postgresql://user:secret@production-postgres.internal/quantgym?sslmode=require",
        "postgresql://user:secret@preview-postgres.internal/quantgym_production?sslmode=require",
        "postgresql://user:secret@preview-postgres.internal/a/b?sslmode=require",
        (
            "postgresql://user:secret@preview-postgres.internal/quantgym"
            "?host=attacker.invalid&sslmode=require"
        ),
        (
            "postgresql://user:secret@preview-postgres.internal/quantgym_v2_preview"
            "?sslmode=require&dbname=production"
        ),
        (
            "postgresql://user:secret@preview-postgres.internal/quantgym_v2_preview"
            "?sslmode=require&port=6543"
        ),
        (
            "postgresql://user:secret@preview-postgres.internal/quantgym_v2_preview"
            "?sslmode=require&user=production_admin&password=othersecret"
        ),
        (
            "postgresql://user:secret@preview-postgres.internal/quantgym_v2_preview"
            "?sslmode=require&options=-csearch_path%3Dproduction"
        ),
    ],
)
def test_database_requires_a_remote_postgres_target_and_tls(database_url: str) -> None:
    data = valid_settings_data()
    data["database_url"] = database_url

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


@pytest.mark.parametrize(
    "endpoint",
    [
        f"http://{'a' * 32}.r2.cloudflarestorage.com",
        f"https://user:secret@{'a' * 32}.r2.cloudflarestorage.com",
        f"https://{'a' * 32}.eu.r2.cloudflarestorage.com",
        "https://localhost",
        f"https://{'a' * 32}.r2.cloudflarestorage.com/path",
        f"https://{'a' * 32}.r2.cloudflarestorage.com?token=secret",
    ],
)
def test_r2_endpoint_is_an_uncredentialed_cloudflare_account_origin(
    endpoint: str,
) -> None:
    data = valid_settings_data()
    data["r2_endpoint"] = endpoint

    with pytest.raises(ValidationError) as error:
        Settings.model_validate(data)

    assert "user:secret" not in str(error.value)
    assert "token=secret" not in str(error.value)


def test_database_validation_errors_never_echo_the_dsn_password() -> None:
    data = valid_settings_data()
    data["database_url"] = (
        "postgresql://user:database-secret-value@production-postgres.internal/"
        "quantgym?sslmode=disable"
    )

    with pytest.raises(ValidationError) as error:
        Settings.model_validate(data)

    assert "database-secret-value" not in str(error.value)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("edge_shared_secret", "short"),
        ("edge_shared_secret", "x" * 40 + "\n"),
        ("session_secret", "short"),
        ("csrf_signing_secret", "short"),
        ("google_client_secret", "short"),
        ("pkce_active_key_id", "../unsafe"),
        ("pkce_encryption_keys", "{}"),
        ("google_client_id", "not-a-google-client"),
        ("r2_access_key_id", "short"),
        ("r2_secret_access_key", "short"),
        ("r2_max_bytes", 0),
        ("r2_max_bytes", 11 * 1024 * 1024),
        ("r2_timeout_seconds", 0),
        ("r2_timeout_seconds", 61),
        ("r2_workers", 0),
        ("r2_workers", 33),
    ],
)
def test_secret_and_r2_operational_limits_fail_closed(field: str, value: object) -> None:
    data = valid_settings_data()
    data[field] = value

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


@pytest.mark.parametrize(
    "pkce_keyring",
    [
        '{"preview-2026-07":"' + PKCE_KEY + '","preview-2026-07":"' + PKCE_KEY + '"}',
        '{"preview-2026-07":"not-a-key"}',
        '{"../unsafe":"' + PKCE_KEY + '"}',
        "[]",
    ],
)
def test_pkce_keyring_rejects_ambiguous_or_unsafe_values(pkce_keyring: str) -> None:
    data = valid_settings_data()
    data["pkce_encryption_keys"] = pkce_keyring

    with pytest.raises(ValidationError) as error:
        Settings.model_validate(data)

    assert PKCE_KEY not in str(error.value)


def test_pkce_active_key_must_exist_in_the_keyring() -> None:
    data = valid_settings_data()
    data["pkce_active_key_id"] = "missing-key"

    with pytest.raises(ValidationError, match="active key ID is unavailable"):
        Settings.model_validate(data)


@pytest.mark.parametrize(
    "field",
    ["session_secret", "csrf_signing_secret", "google_client_secret"],
)
def test_authentication_secrets_must_be_independent(field: str) -> None:
    data = valid_settings_data()
    data[field] = EDGE_SECRET

    with pytest.raises(ValidationError, match="authentication secrets must be independent"):
        Settings.model_validate(data)


def test_google_callback_uri_is_exact_and_cannot_be_redirected() -> None:
    data = valid_settings_data()
    data["google_redirect_uri"] = "https://attacker.invalid/callback"

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


def test_password_reset_delivery_cannot_enable_an_unapproved_provider() -> None:
    data = valid_settings_data()
    data["password_reset_delivery_mode"] = "smtp"

    with pytest.raises(ValidationError):
        Settings.model_validate(data)


def test_unknown_constructor_and_preview_environment_keys_are_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data = valid_settings_data()
    data["unexpected"] = "nope"
    with pytest.raises(ValidationError):
        Settings.model_validate(data)

    monkeypatch.setenv("QUANTGYM_V2_UNEXPECTED", "nope")
    with pytest.raises(ValidationError, match="QUANTGYM_V2_UNEXPECTED"):
        Settings.model_validate(valid_settings_data())


def test_environment_aliases_support_the_preview_provider_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    values = {
        "QUANTGYM_ENVIRONMENT": "preview",
        "QUANTGYM_POSTGRES_DATABASE_URL": DATABASE_URL,
        "QUANTGYM_ALLOWED_ORIGINS": PREVIEW_ORIGIN,
        "QUANTGYM_EDGE_SHARED_SECRET": EDGE_SECRET,
        "QUANTGYM_SESSION_SECRET": SESSION_SECRET,
        "QUANTGYM_CSRF_SIGNING_SECRET": CSRF_SECRET,
        "QUANTGYM_PKCE_ACTIVE_KEY_ID": "preview-2026-07",
        "QUANTGYM_PKCE_ENCRYPTION_KEYS": PKCE_KEYS,
        "QUANTGYM_GOOGLE_CLIENT_ID": "123456-preview.apps.googleusercontent.com",
        "QUANTGYM_GOOGLE_CLIENT_SECRET": GOOGLE_CLIENT_SECRET,
        "QUANTGYM_PREVIEW_R2_ENDPOINT": R2_ENDPOINT,
        "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID": R2_ACCESS_KEY,
        "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY": R2_SECRET_KEY,
        "QUANTGYM_PREVIEW_R2_BUCKET": "quantgym-v2-preview-media",
    }
    for name, value in values.items():
        monkeypatch.setenv(name, value)

    settings = Settings()

    assert settings.allowed_origins == (PREVIEW_ORIGIN,)
    assert isinstance(settings.database_url, SecretStr)
    assert settings.r2_endpoint == R2_ENDPOINT
