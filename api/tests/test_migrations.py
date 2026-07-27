from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any, Iterator

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = REPO_ROOT / "api"
CONTRACT_PATH = REPO_ROOT / "docs" / "frontend-upgrade" / "phase-1-schema-contract.json"
PHASE2_CONTRACT_PATH = REPO_ROOT / "docs" / "frontend-upgrade" / "phase-2-schema-contract.json"
REVISION_PATH = API_ROOT / "migrations" / "versions" / "0001_phase1_foundation.py"
EXPECTED_REVISION = "0001_phase1_foundation"
EXPECTED_HEAD_REVISION = "0002_phase2_daily_training"
DATABASE_ENVIRONMENT_KEYS = (
    "QUANTGYM_POSTGRES_DATABASE_URL",
    "QUANTGYM_PREVIEW_POSTGRES_URL",
    "QUANTGYM_V2_DATABASE_URL",
    "DATABASE_URL",
)


def _contract() -> dict[str, Any]:
    return json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


def _phase2_contract() -> dict[str, Any]:
    return json.loads(PHASE2_CONTRACT_PATH.read_text(encoding="utf-8"))


def _revision_ast() -> ast.Module:
    return ast.parse(REVISION_PATH.read_text(encoding="utf-8"), filename=str(REVISION_PATH))


def _literal_assignment(name: str) -> object:
    for node in _revision_ast().body:
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(isinstance(target, ast.Name) and target.id == name for target in targets):
                return ast.literal_eval(node.value)
    raise AssertionError(f"missing literal assignment: {name}")


def test_schema_contract_freezes_postgres18_and_exact_phase1_tables() -> None:
    contract = _contract()

    assert contract["postgresMajor"] == 18
    assert contract["metadataTable"] == "alembic_version"
    assert [table["name"] for table in contract["applicationTables"]] == [
        "users",
        "user_identities",
        "sessions",
        "auth_challenges",
        "preferences",
        "notifications",
        "plan_tasks",
        "audit_events",
        "media_objects",
    ]


def test_first_revision_is_bound_to_the_frozen_schema_contract() -> None:
    source = REVISION_PATH.read_text(encoding="utf-8")
    snapshot_json = _literal_assignment("SCHEMA_CONTRACT_JSON")

    assert _literal_assignment("revision") == EXPECTED_REVISION
    assert _literal_assignment("down_revision") is None
    assert _literal_assignment("SCHEMA_CONTRACT_RELATIVE_PATH") == (
        "docs/frontend-upgrade/phase-1-schema-contract.json"
    )
    assert isinstance(snapshot_json, str)
    assert json.loads(snapshot_json) == _contract()
    assert hashlib.sha256(snapshot_json.encode("utf-8")).hexdigest() == _literal_assignment(
        "SCHEMA_CONTRACT_SHA256"
    )
    assert "applicationTables" in source
    assert "forbiddenTables" in source
    assert "op.create_table" in source
    assert "op.create_index" in source
    assert "op.drop_table" in source


def test_first_revision_is_self_contained_and_creates_no_legacy_schema() -> None:
    source = REVISION_PATH.read_text(encoding="utf-8")
    snapshot = json.loads(_literal_assignment("SCHEMA_CONTRACT_JSON"))
    application_tables = {table["name"] for table in snapshot["applicationTables"]}
    application_columns = {
        column["name"]
        for table in snapshot["applicationTables"]
        for column in table["columns"]
    }

    assert application_tables.isdisjoint(snapshot["forbiddenTables"])
    assert application_columns.isdisjoint(snapshot["forbiddenColumns"])
    assert "Path(" not in source
    assert ".read_text(" not in source
    assert "api-server/postgres/schema.sql" not in source


def test_alembic_configuration_declares_one_local_migration_tree_and_no_url() -> None:
    ini = (API_ROOT / "alembic.ini").read_text(encoding="utf-8")

    assert "script_location = %(here)s/migrations" in ini
    assert "sqlalchemy.url =" in ini
    assert "sqlite" not in ini.lower()
    assert "postgresql://" not in ini
    assert "password" not in ini.lower()


@pytest.mark.parametrize("environment_key", DATABASE_ENVIRONMENT_KEYS)
def test_offline_migrations_accept_each_supported_preview_database_alias(
    environment_key: str,
) -> None:
    secret = f"migration-secret-{environment_key.lower()}"
    database_url = (
        f"postgresql+psycopg://preview:{secret}@preview-postgres.internal/"
        "quantgym_v2_preview?sslmode=require"
    )
    environment = {
        name: value
        for name, value in os.environ.items()
        if name not in DATABASE_ENVIRONMENT_KEYS
    }
    environment[environment_key] = database_url
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            "api/alembic.ini",
            "upgrade",
            "head",
            "--sql",
        ],
        cwd=REPO_ROOT,
        env=environment,
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE users" in result.stdout
    assert secret not in result.stdout
    assert secret not in result.stderr


def test_offline_migrations_reject_conflicting_database_aliases_without_leaking() -> None:
    first_secret = "first-migration-secret"
    second_secret = "second-migration-secret"
    environment = {
        name: value
        for name, value in os.environ.items()
        if name not in DATABASE_ENVIRONMENT_KEYS
    }
    environment["QUANTGYM_PREVIEW_POSTGRES_URL"] = (
        f"postgresql+psycopg://preview:{first_secret}@preview-postgres.internal/"
        "quantgym_v2_preview?sslmode=require"
    )
    environment["QUANTGYM_V2_DATABASE_URL"] = (
        f"postgresql+psycopg://preview:{second_secret}@preview-postgres.internal/"
        "quantgym_v2_preview?sslmode=require"
    )
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            "api/alembic.ini",
            "upgrade",
            "head",
            "--sql",
        ],
        cwd=REPO_ROOT,
        env=environment,
        capture_output=True,
        check=False,
        text=True,
    )

    rendered = f"{result.stdout}\n{result.stderr}"
    assert result.returncode != 0
    assert "conflicting database URL settings" in rendered
    assert first_secret not in rendered
    assert second_secret not in rendered


def _alembic_dependencies_available() -> bool:
    try:
        import alembic  # noqa: F401
        import sqlalchemy  # noqa: F401
    except ImportError:
        return False
    return True


def _postgres_test_dependencies_available() -> bool:
    if not _alembic_dependencies_available():
        return False
    try:
        import psycopg  # noqa: F401
        import testcontainers.postgres  # noqa: F401
    except ImportError:
        return False
    return True


def _load_revision() -> Any:
    spec = importlib.util.spec_from_file_location("phase1_foundation_revision", REVISION_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("could not load the Phase 1 Alembic revision")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.skipif(
    not _alembic_dependencies_available(),
    reason="exact migration compiler contract requires the locked SQLAlchemy and Alembic dependencies",
)
def test_migration_compiler_emits_every_frozen_contract_element() -> None:
    import sqlalchemy as sa
    from sqlalchemy.dialects import postgresql

    revision_module = _load_revision()
    created_tables: list[tuple[str, tuple[Any, ...]]] = []
    created_indexes: list[tuple[str, str, tuple[str, ...], bool, str]] = []

    class RecordingOperations:
        @staticmethod
        def create_table(name: str, *elements: Any) -> None:
            created_tables.append((name, elements))

        @staticmethod
        def create_index(
            name: str,
            table_name: str,
            columns: list[str],
            *,
            unique: bool,
            **options: Any,
        ) -> None:
            where_clause = options.get("postgresql_where")
            created_indexes.append(
                (
                    name,
                    table_name,
                    tuple(columns),
                    unique,
                    "" if where_clause is None else str(where_clause),
                )
            )

    revision_module.op = RecordingOperations
    revision_module.upgrade()

    contract_tables = _contract()["applicationTables"]
    assert [name for name, _elements in created_tables] == [
        table["name"] for table in contract_tables
    ]

    for table, (actual_name, elements) in zip(contract_tables, created_tables, strict=True):
        assert actual_name == table["name"]
        actual_columns = [element for element in elements if isinstance(element, sa.Column)]
        assert [column.name for column in actual_columns] == [
            column["name"] for column in table["columns"]
        ]
        for expected, actual in zip(table["columns"], actual_columns, strict=True):
            compiled_type = actual.type.compile(dialect=postgresql.dialect())
            assert _normalize_type(str(compiled_type)) == expected["type"]
            assert actual.nullable == expected["nullable"]
            assert actual.primary_key == expected.get("primaryKey", False)
            actual_default = None if actual.server_default is None else str(actual.server_default.arg)
            if "default" not in expected:
                expected_default = None
            elif expected["default"] == "now()":
                expected_default = "now()"
            elif expected["type"] == "jsonb":
                expected_default = "'{}'::jsonb"
            elif isinstance(expected["default"], str):
                expected_default = "'" + expected["default"].replace("'", "''") + "'"
            else:
                expected_default = str(expected["default"])
            assert actual_default == expected_default

        actual_foreign_keys = sorted(
            (
                tuple(constraint.column_keys),
                tuple(element.target_fullname for element in constraint.elements),
                (constraint.ondelete or "").lower(),
            )
            for constraint in elements
            if isinstance(constraint, sa.ForeignKeyConstraint)
        )
        expected_foreign_keys = sorted(
            (
                (column["name"],),
                (column["references"],),
                column.get("onDelete", "restrict"),
            )
            for column in table["columns"]
            if "references" in column
        )
        assert actual_foreign_keys == expected_foreign_keys

        actual_unique = sorted(
            tuple(
                column.name if isinstance(column, sa.Column) else str(column)
                for column in constraint._pending_colargs
            )
            for constraint in elements
            if isinstance(constraint, sa.UniqueConstraint)
        )
        assert actual_unique == sorted(tuple(columns) for columns in table["unique"])

        actual_checks = [
            str(constraint.sqltext)
            for constraint in elements
            if isinstance(constraint, sa.CheckConstraint)
        ]
        assert actual_checks == table["checks"]

    expected_indexes = [
        (
            index["name"],
            table["name"],
            tuple(index["columns"]),
            index["unique"],
            index.get("where", ""),
        )
        for table in contract_tables
        for index in table["indexes"]
    ]
    assert created_indexes == expected_indexes


def _postgres_container() -> Iterator[Any]:
    from testcontainers.postgres import PostgresContainer

    try:
        container = PostgresContainer("postgres:18", driver="psycopg")
        container.start()
    except Exception as error:  # Docker can be intentionally absent on a developer machine.
        pytest.skip(f"ephemeral PostgreSQL 18 unavailable: {type(error).__name__}: {error}")
    try:
        yield container
    finally:
        container.stop()


def _alembic_config(connection: Any) -> Any:
    from alembic.config import Config

    config = Config(str(API_ROOT / "alembic.ini"))
    config.attributes["connection"] = connection
    return config


def _normalize_type(type_name: str) -> str:
    normalized = " ".join(type_name.lower().split())
    aliases = {
        "timestamp with time zone": "timestamptz",
        "character varying": "varchar",
        "character": "char",
        "uuid": "uuid",
        "bytea": "bytea",
        "jsonb": "jsonb",
        "text": "text",
        "integer": "integer",
        "bigint": "bigint",
    }
    for prefix, replacement in aliases.items():
        if normalized == prefix:
            return replacement
        if normalized.startswith(prefix + "("):
            return replacement + normalized[len(prefix) :]
    return normalized


def _database_fingerprint(connection: Any) -> dict[str, Any]:
    from sqlalchemy import inspect
    from sqlalchemy.dialects import postgresql

    def index_fingerprint(index: dict[str, Any]) -> tuple[str, tuple[str, ...], bool, str]:
        where_clause = (index.get("dialect_options") or {}).get("postgresql_where")
        return (
            index["name"],
            tuple(index["column_names"]),
            bool(index["unique"]),
            "" if where_clause is None else str(where_clause),
        )

    inspector = inspect(connection)
    tables = sorted(
        name
        for name in inspector.get_table_names(schema="public")
        if name != "alembic_version"
    )
    fingerprint: dict[str, Any] = {"tables": tables, "definitions": {}}
    for table_name in tables:
        columns = []
        for column in inspector.get_columns(table_name, schema="public"):
            compiled_type = column["type"].compile(dialect=postgresql.dialect())
            columns.append(
                {
                    "name": column["name"],
                    "type": _normalize_type(str(compiled_type)),
                    "nullable": column["nullable"],
                    "primaryKey": column["name"]
                    in inspector.get_pk_constraint(table_name, schema="public")["constrained_columns"],
                }
            )
        fingerprint["definitions"][table_name] = {
            "columns": columns,
            "foreignKeys": sorted(
                (
                    tuple(foreign_key["constrained_columns"]),
                    foreign_key["referred_table"],
                    tuple(foreign_key["referred_columns"]),
                    (foreign_key.get("options") or {}).get("ondelete", "").lower(),
                )
                for foreign_key in inspector.get_foreign_keys(table_name, schema="public")
            ),
            "checks": sorted(
                check["sqltext"]
                for check in inspector.get_check_constraints(table_name, schema="public")
            ),
            "indexes": sorted(
                index_fingerprint(index)
                for index in inspector.get_indexes(table_name, schema="public")
            ),
            "unique": sorted(
                tuple(unique["column_names"])
                for unique in inspector.get_unique_constraints(table_name, schema="public")
            ),
        }
    return fingerprint


def _assert_columns_match_contract(fingerprint: dict[str, Any]) -> None:
    contract = _contract()
    assert fingerprint["tables"] == sorted(
        table["name"] for table in contract["applicationTables"]
    )
    for table in contract["applicationTables"]:
        actual_columns = fingerprint["definitions"][table["name"]]["columns"]
        expected_columns = [
            {
                "name": column["name"],
                "type": column["type"],
                "nullable": column["nullable"],
                "primaryKey": column.get("primaryKey", False),
            }
            for column in table["columns"]
        ]
        assert actual_columns == expected_columns


@pytest.mark.skipif(
    not _postgres_test_dependencies_available(),
    reason="ephemeral PostgreSQL 18 migration test requires Alembic, psycopg, SQLAlchemy and testcontainers",
)
def test_postgres18_upgrade_downgrade_upgrade_round_trip() -> None:
    from alembic import command
    from sqlalchemy import create_engine, inspect

    for container in _postgres_container():
        engine = create_engine(container.get_connection_url())
        try:
            with engine.connect() as connection:
                server_version_num = int(
                    connection.exec_driver_sql("SHOW server_version_num").scalar_one()
                )
                assert server_version_num // 10_000 == _contract()["postgresMajor"]

                config = _alembic_config(connection)
                command.upgrade(config, EXPECTED_REVISION)
                all_tables = inspect(connection).get_table_names(schema="public")
                assert sorted(all_tables) == sorted(
                    [
                        _contract()["metadataTable"],
                        *[table["name"] for table in _contract()["applicationTables"]],
                    ]
                )
                first = _database_fingerprint(connection)
                _assert_columns_match_contract(first)

                command.downgrade(config, "base")
                remaining = inspect(connection).get_table_names(schema="public")
                assert [name for name in remaining if name != "alembic_version"] == []

                command.upgrade(config, EXPECTED_REVISION)
                second = _database_fingerprint(connection)
                assert second == first
        finally:
            engine.dispose()


def _assert_phase2_columns_match_contract(fingerprint: dict[str, Any]) -> None:
    phase1 = _contract()
    phase2 = _phase2_contract()
    assert fingerprint["tables"] == sorted(phase2["applicationTables"])
    phase1_by_name = {table["name"]: table for table in phase1["applicationTables"]}
    altered_by_name = {table["name"]: table for table in phase2["alteredTables"]}
    new_by_name = {table["name"]: table for table in phase2["newTables"]}
    for table_name in phase2["applicationTables"]:
        if table_name in new_by_name:
            expected_columns = new_by_name[table_name]["columns"]
        else:
            expected_columns = [*phase1_by_name[table_name]["columns"]]
            if table_name in altered_by_name:
                expected_columns.extend(altered_by_name[table_name]["addColumns"])
        assert fingerprint["definitions"][table_name]["columns"] == [
            {
                "name": column["name"],
                "type": column["type"],
                "nullable": column["nullable"],
                "primaryKey": column.get("primaryKey", False),
            }
            for column in expected_columns
        ]


def _assert_phase1_fixture_rows_preserved(connection: Any) -> None:
    assert connection.exec_driver_sql(
        """
        SELECT email, normalized_email, password_hash, display_name, status, email_verified_at
        FROM users
        WHERE id = '10000000-0000-4000-8000-000000000001'
        """
    ).one() == (
        "phase1-row@example.com",
        "phase1-row@example.com",
        None,
        "Phase 1 row",
        "active",
        None,
    )
    assert connection.exec_driver_sql(
        """
        SELECT user_id::text, title, status, sort_order, version, completed_at
        FROM plan_tasks
        WHERE id = '20000000-0000-4000-8000-000000000001'
        """
    ).one() == (
        "10000000-0000-4000-8000-000000000001",
        "Existing Phase 1 task",
        "open",
        0,
        1,
        None,
    )
    assert connection.exec_driver_sql(
        """
        SELECT user_id::text, kind, title, body, read_at
        FROM notifications
        WHERE id = '30000000-0000-4000-8000-000000000001'
        """
    ).one() == (
        "10000000-0000-4000-8000-000000000001",
        "phase1",
        "Existing notification",
        "Existing Phase 1 notification body",
        None,
    )


@pytest.mark.skipif(
    not _postgres_test_dependencies_available(),
    reason="ephemeral PostgreSQL 18 Phase 2 round trip requires the locked dependencies",
)
def test_postgres18_phase2_upgrade_downgrade_upgrade_normalized_fingerprint() -> None:
    from alembic import command
    from sqlalchemy import create_engine, inspect

    for container in _postgres_container():
        engine = create_engine(container.get_connection_url())
        try:
            with engine.connect() as connection:
                server_version_num = int(
                    connection.exec_driver_sql("SHOW server_version_num").scalar_one()
                )
                assert server_version_num // 10_000 == _phase2_contract()["postgresMajor"]
                config = _alembic_config(connection)

                command.upgrade(config, EXPECTED_REVISION)
                phase1_fingerprint = _database_fingerprint(connection)
                _assert_columns_match_contract(phase1_fingerprint)
                connection.exec_driver_sql(
                    """
                    INSERT INTO users (id, email, normalized_email, display_name)
                    VALUES (
                      '10000000-0000-4000-8000-000000000001',
                      'phase1-row@example.com',
                      'phase1-row@example.com',
                      'Phase 1 row'
                    )
                    """
                )
                connection.exec_driver_sql(
                    """
                    INSERT INTO plan_tasks (id, user_id, title)
                    VALUES (
                      '20000000-0000-4000-8000-000000000001',
                      '10000000-0000-4000-8000-000000000001',
                      'Existing Phase 1 task'
                    )
                    """
                )
                connection.exec_driver_sql(
                    """
                    INSERT INTO notifications (id, user_id, kind, title, body)
                    VALUES (
                      '30000000-0000-4000-8000-000000000001',
                      '10000000-0000-4000-8000-000000000001',
                      'phase1',
                      'Existing notification',
                      'Existing Phase 1 notification body'
                    )
                    """
                )
                connection.commit()
                _assert_phase1_fixture_rows_preserved(connection)

                command.upgrade(config, EXPECTED_HEAD_REVISION)
                first_phase2_fingerprint = _database_fingerprint(connection)
                _assert_phase2_columns_match_contract(first_phase2_fingerprint)
                _assert_phase1_fixture_rows_preserved(connection)
                assert sorted(inspect(connection).get_table_names(schema="public")) == sorted(
                    [_phase2_contract()["metadataTable"], *_phase2_contract()["applicationTables"]]
                )
                assert connection.exec_driver_sql(
                    """
                    SELECT plan_id, recommendation_id, target_problem_id, detail, scheduled_for,
                           estimated_minutes, action_target, skill_key
                    FROM plan_tasks
                    WHERE id = '20000000-0000-4000-8000-000000000001'
                    """
                ).one() == (None, None, None, None, None, None, None, None)
                assert connection.exec_driver_sql(
                    """
                    SELECT action_target, action_resource_id, dedupe_key
                    FROM notifications
                    WHERE id = '30000000-0000-4000-8000-000000000001'
                    """
                ).one() == (None, None, None)

                command.downgrade(config, EXPECTED_REVISION)
                restored_phase1_fingerprint = _database_fingerprint(connection)
                assert restored_phase1_fingerprint == phase1_fingerprint
                _assert_phase1_fixture_rows_preserved(connection)

                command.upgrade(config, EXPECTED_HEAD_REVISION)
                second_phase2_fingerprint = _database_fingerprint(connection)
                assert second_phase2_fingerprint == first_phase2_fingerprint
                _assert_phase1_fixture_rows_preserved(connection)
        finally:
            engine.dispose()


@pytest.mark.skipif(
    not _alembic_dependencies_available(),
    reason="Alembic head check requires Alembic and SQLAlchemy",
)
def test_alembic_has_exactly_one_head() -> None:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(Config(str(API_ROOT / "alembic.ini")))

    assert script.get_heads() == [EXPECTED_HEAD_REVISION]
