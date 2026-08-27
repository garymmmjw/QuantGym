"""PostgreSQL engine construction and read-only migration-head verification."""

from __future__ import annotations

import ipaddress
import re
from pathlib import Path
from typing import Any, Protocol, runtime_checkable
from urllib.parse import parse_qsl, unquote, urlsplit, urlunsplit


ALEMBIC_INI_PATH = Path(__file__).resolve().parents[1] / "alembic.ini"
_POSTGRES_SCHEMES = frozenset({"postgresql", "postgresql+psycopg"})
_REQUIRED_SSL_MODES = frozenset({"require", "verify-ca", "verify-full"})


class DatabaseConfigurationError(ValueError):
    """Raised when a database URL violates the Preview safety contract."""


class DatabaseSchemaMismatchError(RuntimeError):
    """Raised when the connected database is not at the sole Alembic head."""


@runtime_checkable
class _SecretValue(Protocol):
    def get_secret_value(self) -> str: ...


def _read_database_url(value: str | _SecretValue) -> str:
    if isinstance(value, str):
        raw_url = value
    elif isinstance(value, _SecretValue):
        raw_url = value.get_secret_value()
    else:
        raise DatabaseConfigurationError("database URL must be a string or secret value")
    if not isinstance(raw_url, str) or not raw_url or raw_url != raw_url.strip():
        raise DatabaseConfigurationError("database URL is missing or malformed")
    return raw_url


def _is_safe_url_credential(value: str | None) -> bool:
    if value is None:
        return False
    if re.search(r"%(?![0-9A-Fa-f]{2})", value):
        return False
    try:
        decoded = unquote(value, errors="strict")
    except UnicodeError:
        return False
    return bool(decoded) and len(decoded) <= 512 and not any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in decoded
    )


def validate_database_url(value: str | _SecretValue) -> str:
    """Return a psycopg URL after enforcing PostgreSQL and transport TLS.

    Error messages deliberately describe only the violated rule. They never include
    the input URL because it normally contains the Preview database password.
    """

    raw_url = _read_database_url(value)
    try:
        parsed = urlsplit(raw_url)
        query_items = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
        hostname = parsed.hostname
        port = parsed.port
    except (TypeError, ValueError):
        raise DatabaseConfigurationError("database URL is malformed") from None

    if parsed.scheme not in _POSTGRES_SCHEMES:
        raise DatabaseConfigurationError("database must use PostgreSQL with the psycopg driver")
    decoded_path = unquote(parsed.path)
    if (
        not hostname
        or not _is_safe_url_credential(parsed.username)
        or not _is_safe_url_credential(parsed.password)
        or parsed.fragment
        or port not in {None, 5432}
        or not decoded_path.startswith("/")
        or decoded_path.count("/") != 1
        or len(decoded_path) == 1
    ):
        raise DatabaseConfigurationError("database URL must include a host and database name")
    host = hostname.lower().rstrip(".")
    if host == "localhost" or host.endswith(".localhost"):
        raise DatabaseConfigurationError("database URL target is invalid")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise DatabaseConfigurationError("database URL target is invalid")
    if any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in decoded_path[1:]
    ):
        raise DatabaseConfigurationError("database URL database name is invalid")
    database_name = decoded_path[1:].lower()
    target_tokens = {
        token
        for token in re.split(r"[^a-z0-9]+", f"{host} {database_name}")
        if token
    }
    if (
        "quantgym" not in database_name
        or "preview" not in database_name
        or target_tokens.intersection({"prod", "production"})
    ):
        raise DatabaseConfigurationError("database URL must target the isolated Preview database")

    query: dict[str, list[str]] = {}
    for key, item in query_items:
        query.setdefault(key.lower(), []).append(item)
    if set(query) != {"sslmode"}:
        raise DatabaseConfigurationError("database URL contains an unsafe connection override")
    sslmodes = query["sslmode"]
    if len(sslmodes) != 1 or sslmodes[0] not in _REQUIRED_SSL_MODES:
        raise DatabaseConfigurationError("database TLS requires sslmode=require, verify-ca, or verify-full")

    if parsed.scheme == "postgresql":
        parsed = parsed._replace(scheme="postgresql+psycopg")
    return urlunsplit(parsed)


def create_database_engine(database_url: str | _SecretValue, **engine_options: Any) -> Any:
    """Create the runtime SQLAlchemy engine without connecting or migrating."""

    from sqlalchemy import create_engine

    options: dict[str, Any] = {"pool_pre_ping": True}
    options.update(engine_options)
    return create_engine(validate_database_url(database_url), **options)


def _expected_alembic_heads(alembic_ini_path: Path) -> tuple[str, ...]:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(Config(str(alembic_ini_path)))
    return tuple(script.get_heads())


def _migration_context_type() -> Any:
    from alembic.migration import MigrationContext

    return MigrationContext


def assert_database_at_alembic_head(
    engine: Any,
    alembic_ini_path: str | Path = ALEMBIC_INI_PATH,
) -> None:
    """Read the database revision and reject startup unless it is the sole head.

    This function intentionally has no migration path. Schema changes remain an
    explicit deployment operation and are never performed by application startup.
    """

    expected_heads = _expected_alembic_heads(Path(alembic_ini_path))
    if len(expected_heads) != 1:
        raise DatabaseSchemaMismatchError("migration tree must have exactly one Alembic head")

    try:
        with engine.connect() as connection:
            current_heads = tuple(_migration_context_type().configure(connection).get_current_heads())
    except DatabaseSchemaMismatchError:
        raise
    except Exception:
        raise DatabaseSchemaMismatchError(
            "database schema revision could not be verified"
        ) from None

    if current_heads != expected_heads:
        raise DatabaseSchemaMismatchError("database schema is not at the required Alembic head")
