from __future__ import annotations

from pathlib import Path
from unittest.mock import ANY

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = REPO_ROOT / "api" / "alembic.ini"


class _SecretValue:
    def __init__(self, value: str) -> None:
        self._value = value

    def get_secret_value(self) -> str:
        return self._value

    def __str__(self) -> str:  # pragma: no cover - a safety tripwire
        raise AssertionError("database secrets must not be coerced with str()")


@pytest.mark.parametrize(
    "sslmode",
    ["require", "verify-ca", "verify-full"],
)
def test_database_url_accepts_only_tls_postgres_modes(sslmode: str) -> None:
    from api.app.db import validate_database_url

    raw_url = (
        "postgresql+psycopg://preview:secret@db.example/"
        f"quantgym_v2_preview?sslmode={sslmode}"
    )

    assert validate_database_url(raw_url) == raw_url


def test_database_url_reads_secretstr_without_stringifying_it() -> None:
    from api.app.db import validate_database_url

    raw_url = (
        "postgresql+psycopg://preview:secret@db.example/"
        "quantgym_v2_preview?sslmode=require"
    )

    assert validate_database_url(_SecretValue(raw_url)) == raw_url


@pytest.mark.parametrize(
    "raw_url",
    [
        "sqlite:///quantgym.db",
        "mysql://preview:secret@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+asyncpg://preview:secret@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=disable",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=prefer",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&sslmode=verify-full",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=REQUIRE",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&dbname=production",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&port=6543",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&user=other",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&password=other",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require&options=-csearch_path%3Dproduction",
        "postgresql+psycopg://preview@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://:@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://%20preview:secret@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret%0A@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview%ZZ:secret@db.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@db.example:6543/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@db.example/a/b?sslmode=require",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview%0A?sslmode=require",
        "postgresql+psycopg://preview:secret@db.example/quantgym_v2_preview?sslmode=require#fragment",
        "postgresql+psycopg://preview:secret@production.example/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@localhost/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@127.0.0.1/quantgym_v2_preview?sslmode=require",
        "postgresql+psycopg://preview:secret@[invalid/quantgym_v2_preview?sslmode=require",
    ],
)
def test_database_url_rejects_non_postgres_or_non_tls_connections(raw_url: str) -> None:
    from api.app.db import DatabaseConfigurationError, validate_database_url

    with pytest.raises(DatabaseConfigurationError) as error:
        validate_database_url(_SecretValue(raw_url))

    message = str(error.value)
    assert "secret" not in message
    assert raw_url not in message
    assert error.value.__cause__ is None


def test_plain_postgresql_scheme_is_canonicalized_to_psycopg() -> None:
    from api.app.db import validate_database_url

    raw_url = (
        "postgresql://preview:secret@db.example/"
        "quantgym_v2_preview?sslmode=require"
    )

    assert validate_database_url(raw_url).startswith("postgresql+psycopg://")


def test_head_check_is_read_only_and_rejects_mismatch(monkeypatch: pytest.MonkeyPatch) -> None:
    from api.app import db

    calls: list[object] = []

    class FakeConnection:
        def __enter__(self) -> "FakeConnection":
            calls.append("enter")
            return self

        def __exit__(self, *_args: object) -> None:
            calls.append("exit")

    class FakeEngine:
        def connect(self) -> FakeConnection:
            calls.append("connect")
            return FakeConnection()

    class FakeMigrationContext:
        @classmethod
        def configure(cls, connection: FakeConnection) -> "FakeMigrationContext":
            calls.append(("configure", connection))
            return cls()

        def get_current_heads(self) -> tuple[str, ...]:
            calls.append("get_current_heads")
            return ("stale_revision",)

    monkeypatch.setattr(db, "_expected_alembic_heads", lambda _path: ("0001_phase1_foundation",))
    monkeypatch.setattr(db, "_migration_context_type", lambda: FakeMigrationContext)

    with pytest.raises(db.DatabaseSchemaMismatchError) as error:
        db.assert_database_at_alembic_head(FakeEngine(), ALEMBIC_INI)

    assert str(error.value) == "database schema is not at the required Alembic head"
    assert calls == [
        "connect",
        "enter",
        ("configure", ANY),
        "get_current_heads",
        "exit",
    ]


def test_head_check_accepts_the_single_exact_head(monkeypatch: pytest.MonkeyPatch) -> None:
    from api.app import db

    class FakeConnection:
        def __enter__(self) -> "FakeConnection":
            return self

        def __exit__(self, *_args: object) -> None:
            return None

    class FakeEngine:
        def connect(self) -> FakeConnection:
            return FakeConnection()

    class FakeMigrationContext:
        @classmethod
        def configure(cls, _connection: FakeConnection) -> "FakeMigrationContext":
            return cls()

        def get_current_heads(self) -> tuple[str, ...]:
            return ("0001_phase1_foundation",)

    monkeypatch.setattr(db, "_expected_alembic_heads", lambda _path: ("0001_phase1_foundation",))
    monkeypatch.setattr(db, "_migration_context_type", lambda: FakeMigrationContext)

    db.assert_database_at_alembic_head(FakeEngine(), ALEMBIC_INI)


def test_database_module_cannot_auto_migrate() -> None:
    source = (REPO_ROOT / "api" / "app" / "db.py").read_text(encoding="utf-8")

    assert "alembic.command" not in source
    assert "command.upgrade" not in source
    assert "create_all" not in source
