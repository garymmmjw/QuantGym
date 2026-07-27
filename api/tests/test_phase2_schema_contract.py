from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = REPO_ROOT / "docs" / "frontend-upgrade" / "phase-2-schema-contract.json"
REVISION_PATH = (
    REPO_ROOT / "api" / "migrations" / "versions" / "0002_phase2_daily_training.py"
)
PHASE1_REVISION_PATH = (
    REPO_ROOT / "api" / "migrations" / "versions" / "0001_phase1_foundation.py"
)
PHASE1_REVISION_SHA256 = "f58996d20853b4b20ff0a032d0b24305819739c19793fdd99671bd5e2b5c502c"


def _contract() -> dict[str, Any]:
    return json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


def _revision_ast() -> ast.Module:
    return ast.parse(REVISION_PATH.read_text(encoding="utf-8"), filename=str(REVISION_PATH))


def _literal_assignment(name: str) -> object:
    for node in _revision_ast().body:
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(isinstance(target, ast.Name) and target.id == name for target in targets):
                return ast.literal_eval(node.value)
    raise AssertionError(f"missing literal assignment: {name}")


def _dependencies_available() -> bool:
    try:
        import alembic  # noqa: F401
        import sqlalchemy  # noqa: F401
    except ImportError:
        return False
    return True


def _load_revision() -> Any:
    spec = importlib.util.spec_from_file_location("phase2_daily_training_revision", REVISION_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("could not load the Phase 2 Alembic revision")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _normalize_type(type_name: str) -> str:
    normalized = " ".join(type_name.lower().split())
    aliases = {
        "timestamp with time zone": "timestamptz",
        "character varying": "varchar",
        "character": "char",
        "uuid": "uuid",
        "jsonb": "jsonb",
        "text": "text",
        "integer": "integer",
        "bigint": "bigint",
        "boolean": "boolean",
        "date": "date",
    }
    for prefix, replacement in aliases.items():
        if normalized == prefix:
            return replacement
        if normalized.startswith(prefix + "("):
            return replacement + normalized[len(prefix) :]
    return normalized


def _expected_default(column: dict[str, Any]) -> str | None:
    if "default" not in column:
        return None
    default = column["default"]
    if default == "now()":
        return "now()"
    if column["type"] == "jsonb":
        return "'" + default.replace("'", "''") + "'::jsonb"
    if isinstance(default, bool):
        return "true" if default else "false"
    if isinstance(default, (int, float)):
        return str(default)
    return "'" + default.replace("'", "''") + "'"


def test_phase1_revision_remains_byte_immutable() -> None:
    assert hashlib.sha256(PHASE1_REVISION_PATH.read_bytes()).hexdigest() == PHASE1_REVISION_SHA256


def test_second_revision_embeds_the_exact_phase2_contract() -> None:
    source = REVISION_PATH.read_text(encoding="utf-8")
    snapshot_json = _literal_assignment("SCHEMA_CONTRACT_JSON")
    contract_bytes = CONTRACT_PATH.read_bytes()

    assert _literal_assignment("revision") == "0002_phase2_daily_training"
    assert _literal_assignment("down_revision") == "0001_phase1_foundation"
    assert _literal_assignment("SCHEMA_CONTRACT_RELATIVE_PATH") == (
        "docs/frontend-upgrade/phase-2-schema-contract.json"
    )
    assert isinstance(snapshot_json, str)
    snapshot_bytes = snapshot_json.encode("utf-8")
    assert snapshot_bytes == contract_bytes
    assert json.loads(snapshot_json) == _contract()
    assert hashlib.sha256(contract_bytes).hexdigest() == _literal_assignment(
        "SCHEMA_CONTRACT_SHA256"
    )
    assert "Path(" not in source
    assert ".read_text(" not in source


@pytest.mark.skipif(
    not _dependencies_available(),
    reason="exact Phase 2 compiler test requires Alembic and SQLAlchemy",
)
def test_phase2_compiler_emits_every_table_constraint_index_and_additive_change() -> None:
    import sqlalchemy as sa
    from sqlalchemy.dialects import postgresql

    revision_module = _load_revision()
    created_tables: list[tuple[str, tuple[Any, ...]]] = []
    created_indexes: list[tuple[str, str, tuple[str, ...], bool, str]] = []
    added_columns: list[tuple[str, Any]] = []
    created_foreign_keys: list[tuple[str, str, str, tuple[str, ...], tuple[str, ...], str]] = []
    created_checks: list[tuple[str, str, str]] = []

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

        @staticmethod
        def add_column(table_name: str, column: Any) -> None:
            added_columns.append((table_name, column))

        @staticmethod
        def create_foreign_key(
            name: str,
            source_table: str,
            referent_table: str,
            local_columns: list[str],
            remote_columns: list[str],
            *,
            ondelete: str,
        ) -> None:
            created_foreign_keys.append(
                (
                    name,
                    source_table,
                    referent_table,
                    tuple(local_columns),
                    tuple(remote_columns),
                    ondelete.lower(),
                )
            )

        @staticmethod
        def create_check_constraint(name: str, table_name: str, expression: Any) -> None:
            created_checks.append((name, table_name, str(expression)))

    revision_module.op = RecordingOperations
    revision_module.upgrade()
    contract = _contract()

    assert [name for name, _elements in created_tables] == [
        table["name"] for table in contract["newTables"]
    ]
    for table, (actual_name, elements) in zip(
        contract["newTables"], created_tables, strict=True
    ):
        assert actual_name == table["name"]
        columns = [element for element in elements if isinstance(element, sa.Column)]
        assert [column.name for column in columns] == [
            column["name"] for column in table["columns"]
        ]
        for expected, actual in zip(table["columns"], columns, strict=True):
            assert _normalize_type(actual.type.compile(dialect=postgresql.dialect())) == expected[
                "type"
            ]
            assert actual.nullable == expected["nullable"]
            assert actual.primary_key == expected.get("primaryKey", False)
            actual_default = None if actual.server_default is None else str(actual.server_default.arg)
            assert actual_default == _expected_default(expected)

        foreign_keys = [
            constraint for constraint in elements if isinstance(constraint, sa.ForeignKeyConstraint)
        ]
        assert [constraint.name for constraint in foreign_keys] == [
            f"fk_{table['name']}_{column['name']}"
            for column in table["columns"]
            if "references" in column
        ]
        assert [
            (
                tuple(constraint.column_keys),
                tuple(element.target_fullname for element in constraint.elements),
                (constraint.ondelete or "").lower(),
            )
            for constraint in foreign_keys
        ] == [
            ((column["name"],), (column["references"],), column.get("onDelete", "restrict"))
            for column in table["columns"]
            if "references" in column
        ]
        unique_constraints = [
            constraint for constraint in elements if isinstance(constraint, sa.UniqueConstraint)
        ]
        assert [constraint.name for constraint in unique_constraints] == [
            "_".join(("uq", table["name"], *columns)) for columns in table["unique"]
        ]
        check_constraints = [
            constraint for constraint in elements if isinstance(constraint, sa.CheckConstraint)
        ]
        assert [str(constraint.sqltext) for constraint in check_constraints] == table["checks"]
        assert [constraint.name for constraint in check_constraints] == [
            f"ck_{table['name']}_{ordinal}"
            for ordinal in range(1, len(table["checks"]) + 1)
        ]

    expected_new_indexes = [
        (
            index["name"],
            table["name"],
            tuple(index["columns"]),
            index["unique"],
            index.get("where", ""),
        )
        for table in contract["newTables"]
        for index in table["indexes"]
    ]
    expected_altered_indexes = [
        (
            index["name"],
            table["name"],
            tuple(index["columns"]),
            index["unique"],
            index.get("where", ""),
        )
        for table in contract["alteredTables"]
        for index in table["addIndexes"]
    ]
    assert created_indexes == [*expected_new_indexes, *expected_altered_indexes]

    assert [(table_name, column.name) for table_name, column in added_columns] == [
        (table["name"], column["name"])
        for table in contract["alteredTables"]
        for column in table["addColumns"]
    ]
    for table in contract["alteredTables"]:
        for column in table["addColumns"]:
            actual = next(
                actual
                for table_name, actual in added_columns
                if table_name == table["name"] and actual.name == column["name"]
            )
            assert _normalize_type(actual.type.compile(dialect=postgresql.dialect())) == column[
                "type"
            ]
            assert actual.nullable == column["nullable"]

    assert created_foreign_keys == [
        (
            f"fk_{table['name']}_{column['name']}",
            table["name"],
            column["references"].partition(".")[0],
            (column["name"],),
            (column["references"].partition(".")[2],),
            column.get("onDelete", "restrict"),
        )
        for table in contract["alteredTables"]
        for column in table["addColumns"]
        if "references" in column
    ]
    assert created_checks == [
        (
            f"ck_{table['name']}_{offset + ordinal}",
            table["name"],
            expression,
        )
        for table in contract["alteredTables"]
        for offset in [3 if table["name"] == "plan_tasks" else 0]
        for ordinal, expression in enumerate(table["addChecks"], start=1)
    ]


@pytest.mark.skipif(
    not _dependencies_available(),
    reason="exact Phase 2 downgrade compiler test requires Alembic and SQLAlchemy",
)
def test_phase2_downgrade_exactly_reverses_additive_changes_then_drops_new_tables() -> None:
    revision_module = _load_revision()
    operations: list[tuple[Any, ...]] = []

    class RecordingOperations:
        @staticmethod
        def drop_constraint(name: str, table_name: str, *, type_: str) -> None:
            operations.append(("drop_constraint", name, table_name, type_))

        @staticmethod
        def drop_index(name: str, *, table_name: str) -> None:
            operations.append(("drop_index", name, table_name))

        @staticmethod
        def drop_column(table_name: str, column_name: str) -> None:
            operations.append(("drop_column", table_name, column_name))

        @staticmethod
        def drop_table(table_name: str) -> None:
            operations.append(("drop_table", table_name))

    revision_module.op = RecordingOperations
    revision_module.downgrade()
    contract = _contract()
    expected: list[tuple[Any, ...]] = []
    for table in reversed(contract["alteredTables"]):
        for index in reversed(table["addIndexes"]):
            expected.append(("drop_index", index["name"], table["name"]))
        offset = 3 if table["name"] == "plan_tasks" else 0
        for ordinal in reversed(range(1, len(table["addChecks"]) + 1)):
            expected.append(
                ("drop_constraint", f"ck_{table['name']}_{offset + ordinal}", table["name"], "check")
            )
        for column in reversed(table["addColumns"]):
            if "references" in column:
                expected.append(
                    (
                        "drop_constraint",
                        f"fk_{table['name']}_{column['name']}",
                        table["name"],
                        "foreignkey",
                    )
                )
        for column in reversed(table["addColumns"]):
            expected.append(("drop_column", table["name"], column["name"]))
    expected.extend(
        ("drop_table", table["name"]) for table in reversed(contract["newTables"])
    )
    assert operations == expected


def test_idempotency_and_append_only_ledger_contracts_are_compiled_not_raw_key_storage() -> None:
    contract = _contract()
    tables = {table["name"]: table for table in contract["newTables"]}
    idempotency = tables["idempotency_records"]
    ledger = tables["xp_ledger"]
    events = tables["training_events"]

    assert contract["idempotencyPolicy"]["rawKeyStored"] is False
    assert idempotency["unique"] == [["user_id", "operation", "key_hash"]]
    assert "key_hash ~ '^[0-9a-f]{64}$'" in idempotency["checks"]
    assert "request_hash ~ '^[0-9a-f]{64}$'" in idempotency["checks"]
    assert "raw_idempotency_key" not in {column["name"] for column in idempotency["columns"]}
    assert ledger["unique"] == [["training_event_id"]]
    assert "amount > 0" in ledger["checks"]
    assert "reason = 'problem_completion'" in ledger["checks"]
    assert events["unique"] == [["training_session_id", "sequence"]]
    assert contract["appendOnlyPolicy"]["tables"] == ["training_events", "xp_ledger"]
    assert contract["appendOnlyPolicy"]["allowedServiceOperations"] == ["insert", "select"]
