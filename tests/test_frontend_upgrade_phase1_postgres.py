from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import unittest
import uuid
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/check-frontend-upgrade-phase1-postgres.py"
SPEC = importlib.util.spec_from_file_location(
    "check_frontend_upgrade_phase1_postgres",
    SCRIPT,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)

NOW = datetime(2026, 7, 23, 3, 0, tzinfo=timezone.utc)
HOST = "preview-postgres.example.render.com"
DATABASE = "quantgym_v2_preview"
ROLE = "quantgym_v2_preview_role"
PASSWORD = "phase1-postgres-secret-never-output"
DSN = (
    f"postgresql+psycopg://preview:{PASSWORD}@{HOST}/{DATABASE}"
    "?sslmode=require"
)
COMMIT = "1234567890abcdef1234567890abcdef12345678"
PRE_AUTH_CHALLENGE_HASH = "a" * 64
GOOGLE_OAUTH_CHALLENGE_HASH = "b" * 64
UNRELATED_CHALLENGE_HASH = "c" * 64
CLEANUP_TARGETS = (
    ("pre_auth_csrf", PRE_AUTH_CHALLENGE_HASH, True),
    ("google_oauth", GOOGLE_OAUTH_CHALLENGE_HASH, True),
)


def audit_challenges() -> list[tuple[uuid.UUID, str, str, datetime | None]]:
    return [
        (
            uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
            "pre_auth_csrf",
            PRE_AUTH_CHALLENGE_HASH,
            NOW,
        ),
        (
            uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
            "google_oauth",
            GOOGLE_OAUTH_CHALLENGE_HASH,
            NOW,
        ),
    ]


def sha256(value: str | bytes) -> str:
    source = value if isinstance(value, bytes) else value.encode("utf-8")
    return hashlib.sha256(source).hexdigest()


def valid_evidence() -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "capturedAt": "2026-07-22T03:00:00.000Z",
        "expiresAt": "2026-07-24T03:00:00.000Z",
        "environment": "preview",
        "branch": "codex/frontend-v2-preview",
        "applicationCommit": COMMIT,
        "postgresMajor": 18,
        "resourceFingerprints": {
            "postgres": sha256("preview-postgres-id"),
            "postgresRole": sha256(ROLE),
            "productionPostgres": sha256("production-postgres-id"),
        },
        "bindings": {
            "postgres": {"status": "ready", "isolated": True},
        },
    }


def contract() -> dict[str, Any]:
    return json.loads(
        (ROOT / "docs/frontend-upgrade/phase-1-schema-contract.json").read_text(
            encoding="utf-8"
        )
    )


def raw_default(column: dict[str, Any]) -> str:
    if "default" not in column:
        return ""
    value = column["default"]
    if value == "now()":
        return "now()"
    if column["type"] == "jsonb":
        return "'{}'::jsonb"
    if isinstance(value, str):
        return f"'{value}'::character varying"
    return str(value)


def fixture_rows() -> dict[str, Any]:
    frozen = contract()
    tables = sorted(
        [frozen["metadataTable"], *[table["name"] for table in frozen["applicationTables"]]]
    )
    columns: list[tuple[Any, ...]] = [
        ("alembic_version", "version_num", "character varying(32)", False, "", True)
    ]
    constraints: list[tuple[str, str, str, str]] = [
        (
            "alembic_version",
            "alembic_version_pkc",
            "p",
            "PRIMARY KEY (version_num)",
        )
    ]
    indexes: list[tuple[str, str, str]] = []
    for table in sorted(frozen["applicationTables"], key=lambda item: item["name"]):
        table_name = table["name"]
        for column in table["columns"]:
            columns.append(
                (
                    table_name,
                    column["name"],
                    column["type"],
                    column["nullable"],
                    raw_default(column),
                    column.get("primaryKey", False),
                )
            )
        primary = [
            column["name"]
            for column in table["columns"]
            if column.get("primaryKey", False)
        ]
        if primary:
            constraints.append(
                (
                    table_name,
                    f"{table_name}_pkey",
                    "p",
                    f"PRIMARY KEY ({', '.join(primary)})",
                )
            )
        for column in table["columns"]:
            if "references" in column:
                constraints.append(
                    (
                        table_name,
                        f"fk_{table_name}_{column['name']}",
                        "f",
                        (
                            f"FOREIGN KEY ({column['name']}) "
                            f"REFERENCES {column['references']} "
                            f"ON DELETE {column.get('onDelete', 'restrict').upper()}"
                        ),
                    )
                )
        for unique in table.get("unique", []):
            constraints.append(
                (
                    table_name,
                    "_".join(("uq", table_name, *unique)),
                    "u",
                    f"UNIQUE ({', '.join(unique)})",
                )
            )
        for ordinal, expression in enumerate(table.get("checks", []), start=1):
            constraints.append(
                (
                    table_name,
                    f"ck_{table_name}_{ordinal}",
                    "c",
                    f"CHECK ({expression})",
                )
            )
        for index in table.get("indexes", []):
            unique = "UNIQUE " if index["unique"] else ""
            predicate = f" WHERE {index['where']}" if index.get("where") else ""
            indexes.append(
                (
                    table_name,
                    index["name"],
                    (
                        f"CREATE {unique}INDEX {index['name']} ON public.{table_name} "
                        f"USING btree ({', '.join(index['columns'])}){predicate}"
                    ),
                )
            )
    return {
        "tables": [(name,) for name in tables],
        "columns": columns,
        "constraints": sorted(constraints, key=lambda row: (row[0], row[1])),
        "indexes": sorted(indexes, key=lambda row: (row[0], row[1])),
    }


class FakeCursor:
    def __init__(
        self,
        *,
        rows: dict[str, Any] | None = None,
        version: Any = ("180001",),
        identity: Any = (DATABASE, ROLE),
        head: Any = [(MODULE.EXPECTED_ALEMBIC_HEAD,)],
        row_count: int = 0,
        synthetic_users: list[tuple[Any, str]] | None = None,
        anonymous_challenges: (
            list[tuple[uuid.UUID, str, str, datetime | None]] | None
        ) = None,
        fail_on: str = "",
    ) -> None:
        self.rows = rows or fixture_rows()
        self.version = version
        self.identity = identity
        self.head = head
        self.row_count = row_count
        self.synthetic_users = list(synthetic_users or [])
        self.anonymous_challenges = list(anonymous_challenges or [])
        self.fail_on = fail_on
        self.current = ""
        self.current_target: tuple[str, str] | None = None
        self.rowcount = -1
        self.executions: list[tuple[str, Any]] = []
        self.exited = False

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, _type: Any, _value: Any, _traceback: Any) -> None:
        self.exited = True

    def execute(self, sql: str, params: Any = None) -> None:
        normalized = " ".join(sql.split())
        self.rowcount = -1
        if normalized == "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE":
            key = "transaction"
        elif normalized == "SELECT 1":
            key = "select_one"
        elif normalized == "SHOW server_version_num":
            key = "version"
        elif "pg_backend_pid" in normalized:
            key = "pid"
        elif "pg_stat_ssl" in normalized:
            key = "ssl"
        elif "current_database" in normalized:
            key = "identity"
        elif "alembic_version" in normalized and "version_num" in normalized:
            key = "head"
        elif "pg_catalog.format_type" in normalized:
            key = "columns"
        elif "pg_get_constraintdef" in normalized:
            key = "constraints"
        elif "pg_get_indexdef" in normalized:
            key = "indexes"
        elif "c.relkind IN ('r', 'p')" in normalized:
            key = "tables"
        elif normalized.startswith('SELECT count(*) FROM public."'):
            key = "row_count"
        elif normalized.startswith("SELECT id, normalized_email FROM public.users"):
            key = "synthetic_users"
        elif normalized.startswith(
            "SELECT id, kind, token_hash, consumed_at FROM public.auth_challenges"
        ):
            key = "challenge_target"
        elif normalized.startswith("DELETE FROM public.auth_challenges"):
            key = "challenge_delete"
        elif normalized.startswith("DELETE FROM public."):
            key = "synthetic_delete"
        else:
            raise AssertionError(f"unexpected SQL: {normalized}")
        self.current = key
        self.executions.append((normalized, params))
        if self.fail_on == key:
            raise RuntimeError(f"query failed with {DSN}")
        if key == "synthetic_delete" and normalized.startswith(
            "DELETE FROM public.users"
        ):
            self.synthetic_users = []
            self.row_count = max(0, self.row_count - 1)
        if key == "challenge_target":
            self.current_target = params
        if key == "challenge_delete":
            identifier, kind, token_hash = params
            before = len(self.anonymous_challenges)
            self.anonymous_challenges = [
                challenge
                for challenge in self.anonymous_challenges
                if challenge[:3] != (identifier, kind, token_hash)
            ]
            self.rowcount = before - len(self.anonymous_challenges)
            self.row_count = max(0, self.row_count - self.rowcount)

    def fetchone(self) -> Any:
        values = {
            "select_one": (1,),
            "version": self.version,
            "pid": (424242,),
            "ssl": (True,),
            "identity": self.identity,
            "row_count": (self.row_count,),
        }
        return values[self.current]

    def fetchall(self) -> Any:
        if self.current == "head":
            return self.head
        if self.current == "synthetic_users":
            return list(self.synthetic_users)
        if self.current == "challenge_target":
            assert self.current_target is not None
            kind, token_hash = self.current_target
            return [
                challenge
                for challenge in self.anonymous_challenges
                if challenge[1:3] == (kind, token_hash)
            ]
        if self.current == "synthetic_delete":
            return []
        return self.rows[self.current]


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.fake_cursor = cursor
        self.exited = False
        self.commit_calls = 0
        self.rollback_calls = 0
        self._snapshot = (
            list(cursor.synthetic_users),
            list(cursor.anonymous_challenges),
            cursor.row_count,
        )

    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, _type: Any, _value: Any, _traceback: Any) -> None:
        self.exited = True

    def cursor(self) -> FakeCursor:
        return self.fake_cursor

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1
        users, challenges, row_count = self._snapshot
        self.fake_cursor.synthetic_users = list(users)
        self.fake_cursor.anonymous_challenges = list(challenges)
        self.fake_cursor.row_count = row_count

    def close(self) -> None:
        self.exited = True


class FakeConnector:
    def __init__(self, cursor: FakeCursor | None = None, fail: bool = False) -> None:
        self.cursor = cursor or FakeCursor()
        self.connection = FakeConnection(self.cursor)
        self.fail = fail
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def __call__(self, dsn: str, **kwargs: Any) -> FakeConnection:
        self.calls.append((dsn, kwargs))
        if self.fail:
            raise RuntimeError(f"connection failure {DSN}")
        return self.connection


def snapshot_from_rows(rows: dict[str, Any]) -> dict[str, Any]:
    cursor = FakeCursor(rows=rows)
    cursor.current = "tables"
    return {
        "tables": [row[0] for row in rows["tables"]],
        "columns": [
            {
                "table": row[0],
                "name": row[1],
                "type": MODULE.normalize_type(row[2]),
                "nullable": row[3],
                "default": MODULE.normalize_default(row[4]),
                "primaryKey": row[5],
            }
            for row in rows["columns"]
        ],
        "constraints": [
            {
                "table": row[0],
                "name": row[1],
                "kind": row[2],
                "definition": MODULE.normalized_sql(row[3]),
            }
            for row in rows["constraints"]
        ],
        "indexes": [
            {
                "table": row[0],
                "name": row[1],
                "definition": MODULE.normalized_sql(row[2]),
            }
            for row in rows["indexes"]
        ],
    }


def valid_probe(rows: dict[str, Any] | None = None) -> dict[str, Any]:
    schema_sha = MODULE.fingerprint(snapshot_from_rows(rows or fixture_rows()))
    return {
        "image": "postgres:18",
        "major": 18,
        "firstSchemaSha256": schema_sha,
        "secondSchemaSha256": schema_sha,
        "applicationTablesEmptyAfterDowngrade": True,
    }


class Phase1PostgresCheckTests(unittest.TestCase):
    evidence_bytes = b'{"redacted":"provider-evidence"}\n'

    def run_check(
        self,
        *,
        evidence: dict[str, Any] | None = None,
        env: dict[str, str] | None = None,
        cursor: FakeCursor | None = None,
        connector: FakeConnector | None = None,
        probe: dict[str, Any] | None = None,
        cleanup_targets: tuple[tuple[str, str, bool], ...] | None = None,
    ) -> tuple[int, dict[str, Any], FakeConnector]:
        fake = connector or FakeConnector(cursor)
        status, summary = MODULE.run_check(
            environ=env or {"QUANTGYM_PREVIEW_POSTGRES_URL": DSN},
            connect_fn=fake,
            migration_probe_fn=lambda: probe or valid_probe(
                fake.cursor.rows
            ),
            evidence=evidence or valid_evidence(),
            evidence_bytes=self.evidence_bytes,
            now=NOW,
            cleanup_targets=cleanup_targets,
        )
        return status, summary, fake

    def assert_redacted(self, summary: dict[str, Any]) -> None:
        rendered = json.dumps(summary, sort_keys=True)
        for forbidden in (
            DSN,
            PASSWORD,
            HOST,
            DATABASE,
            ROLE,
            "424242",
        ):
            self.assertNotIn(forbidden, rendered)

    def test_exact_python_patch_is_required_before_any_external_action(self) -> None:
        self.assertEqual(
            MODULE.require_locked_python_runtime(),
            MODULE.EXPECTED_PYTHON_VERSION,
        )
        for version in (
            (3, 13, 13),
            (3, 13, 15),
            (3, 12, 14),
            (3, 14, 0),
        ):
            connector = FakeConnector()
            migration_probe_called = False

            def migration_probe() -> dict[str, Any]:
                nonlocal migration_probe_called
                migration_probe_called = True
                return valid_probe()

            stdout = io.StringIO()
            with (
                self.subTest(version=version),
                mock.patch.object(MODULE.sys, "version_info", version),
                mock.patch.object(
                    MODULE,
                    "load_provider_evidence",
                    side_effect=AssertionError("provider evidence must not be read"),
                ),
                redirect_stdout(stdout),
            ):
                status = MODULE.main(
                    argv=[],
                    environ={
                        "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                        "QUANTGYM_PYTHON_313": "/arbitrary/python3.13",
                    },
                    connect_fn=connector,
                    migration_probe_fn=migration_probe,
                )
            self.assertEqual(status, 1)
            self.assertEqual(
                json.loads(stdout.getvalue())["failureCodes"],
                ["python_runtime_mismatch"],
            )
            self.assertFalse(migration_probe_called)
            self.assertEqual(connector.calls, [])

    def test_success_checks_pg18_head_schema_round_trip_and_empty_data(self) -> None:
        status, summary, fake = self.run_check()
        self.assertEqual(status, 0)
        self.assertEqual(summary["status"], "pass")
        self.assertEqual(summary["commit"], COMMIT)
        self.assertEqual(summary["counts"], {
            "postgresMajor": 18,
            "applicationTables": 9,
            "metadataTables": 1,
            "applicationRows": 0,
            "syntheticUsersDeleted": 0,
        })
        self.assertFalse(summary["checks"]["syntheticCleanupExplicitlyAuthorized"])
        self.assertTrue(all(
            value
            for key, value in summary["checks"].items()
            if key != "syntheticCleanupExplicitlyAuthorized"
        ))
        self.assertEqual(
            summary["hashes"]["schemaSha256"],
            summary["hashes"]["migrationRoundTripSha256"],
        )
        self.assertEqual(len(fake.calls), 1)
        self.assertFalse(fake.calls[0][1]["autocommit"])
        self.assertEqual(fake.connection.commit_calls, 1)
        self.assertEqual(fake.connection.rollback_calls, 0)
        self.assertTrue(fake.cursor.exited)
        self.assertTrue(fake.connection.exited)
        self.assertEqual(
            sum(
                sql.startswith('SELECT count(*) FROM public."')
                for sql, _params in fake.cursor.executions
            ),
            9,
        )
        self.assert_redacted(summary)

    def test_provider_evidence_must_be_current_isolated_and_pg18(self) -> None:
        mutations = (
            (lambda item: item.update(postgresMajor=17), "provider_evidence_invalid"),
            (
                lambda item: item.update(expiresAt="2026-07-22T00:00:00.000Z"),
                "provider_evidence_stale",
            ),
            (
                lambda item: item["bindings"].update(
                    postgres={"status": "ready", "isolated": False}
                ),
                "postgres_binding_not_isolated",
            ),
            (
                lambda item: item["resourceFingerprints"].update(
                    productionPostgres=item["resourceFingerprints"]["postgres"]
                ),
                "resource_identity_reused",
            ),
        )
        for mutate, code in mutations:
            evidence = valid_evidence()
            mutate(evidence)
            with self.subTest(code=code):
                status, summary, fake = self.run_check(evidence=evidence)
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], [code])
                self.assertEqual(fake.calls, [])
                self.assert_redacted(summary)

    def test_invalid_dsn_and_digest_fail_before_connect(self) -> None:
        for dsn in (
            "",
            f"postgresql://preview:{PASSWORD}@localhost/{DATABASE}?sslmode=require",
            f"postgresql://preview:{PASSWORD}@{HOST}/quantgym_prod?sslmode=require",
            f"postgresql://preview:{PASSWORD}@{HOST}/{DATABASE}?sslmode=disable",
            f"postgresql://preview:{PASSWORD}@{HOST}/{DATABASE}?sslmode=require&host=evil",
        ):
            with self.subTest(dsn=dsn[:24]):
                status, summary, fake = self.run_check(
                    env={"QUANTGYM_PREVIEW_POSTGRES_URL": dsn}
                )
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], ["dsn_invalid"])
                self.assertEqual(fake.calls, [])
        status, summary, fake = self.run_check(
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                "QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256": sha256("wrong"),
            }
        )
        self.assertEqual(status, 1)
        self.assertEqual(summary["failureCodes"], ["provider_evidence_digest_mismatch"])
        self.assertEqual(fake.calls, [])

    def test_major_role_head_schema_and_cleanup_are_strict(self) -> None:
        cases: list[tuple[FakeCursor, str, dict[str, Any] | None]] = [
            (FakeCursor(version=("170006",)), "postgres_major_mismatch", None),
            (
                FakeCursor(identity=(DATABASE, "unexpected_role")),
                "role_identity_mismatch",
                None,
            ),
            (FakeCursor(head=[("other_head",)]), "alembic_head_mismatch", None),
            (FakeCursor(row_count=1), "synthetic_data_cleanup_incomplete", None),
        ]
        changed_rows = fixture_rows()
        changed_rows["columns"] = list(changed_rows["columns"])
        changed_rows["columns"][1] = (
            *changed_rows["columns"][1][:2],
            "text",
            *changed_rows["columns"][1][3:],
        )
        cases.append(
            (
                FakeCursor(rows=changed_rows),
                "schema_contract_mismatch",
                valid_probe(fixture_rows()),
            )
        )
        for cursor, code, probe in cases:
            with self.subTest(code=code):
                status, summary, _fake = self.run_check(cursor=cursor, probe=probe)
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], [code])
                self.assert_redacted(summary)

    def test_explicit_cleanup_removes_only_synthetic_audit_users(self) -> None:
        identifier = uuid.UUID("12345678-1234-4123-8123-123456789abc")
        cursor = FakeCursor(
            row_count=3,
            synthetic_users=[
                (identifier, "phase1-audit-0123abcd@example.invalid"),
            ],
            anonymous_challenges=audit_challenges(),
        )
        status, summary, fake = self.run_check(
            cursor=cursor,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 0)
        self.assertTrue(summary["checks"]["syntheticCleanupExplicitlyAuthorized"])
        self.assertEqual(summary["counts"]["syntheticUsersDeleted"], 1)
        delete_statements = [
            sql
            for sql, _params in fake.cursor.executions
            if sql.startswith("DELETE FROM public.")
        ]
        self.assertEqual(
            sum(sql.startswith("DELETE FROM public.auth_challenges") for sql in delete_statements),
            2,
        )
        self.assertTrue(
            any(sql.startswith("DELETE FROM public.users") for sql in delete_statements)
        )
        self.assertFalse(
            any("kind = ANY(%s)" in sql for sql in delete_statements)
        )
        locked_user_queries = [
            sql
            for sql, _params in fake.cursor.executions
            if sql.startswith("SELECT id, normalized_email FROM public.users")
        ]
        self.assertEqual(len(locked_user_queries), 2)
        self.assertTrue(all(sql.endswith("FOR UPDATE") for sql in locked_user_queries))
        self.assertEqual(fake.connection.commit_calls, 1)
        self.assertEqual(fake.connection.rollback_calls, 0)
        self.assert_redacted(summary)

    def test_cleanup_confirmation_and_scope_fail_closed(self) -> None:
        status, summary, fake = self.run_check(
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: "yes",
            }
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["synthetic_cleanup_confirmation_invalid"],
        )
        self.assertEqual(fake.calls, [])

        status, summary, fake = self.run_check(
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["synthetic_cleanup_targets_invalid"],
        )
        self.assertEqual(fake.calls, [])

        malformed = FakeCursor(
            synthetic_users=[
                (
                    uuid.UUID("12345678-1234-4123-8123-123456789abc"),
                    "gary@example.com",
                )
            ]
        )
        status, summary, _fake = self.run_check(
            cursor=malformed,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["synthetic_cleanup_scope_invalid"],
        )

    def test_explicit_cleanup_removes_anonymous_one_time_audit_challenges(self) -> None:
        cursor = FakeCursor(
            row_count=2,
            anonymous_challenges=audit_challenges(),
        )
        status, summary, fake = self.run_check(
            cursor=cursor,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 0)
        self.assertEqual(summary["counts"]["syntheticUsersDeleted"], 0)
        delete_statements = [
            (sql, params)
            for sql, params in fake.cursor.executions
            if sql.startswith("DELETE FROM public.")
        ]
        self.assertEqual(len(delete_statements), 2)
        self.assertEqual(
            [params[1:] for _sql, params in delete_statements],
            [(kind, token_hash) for kind, token_hash, _expected in CLEANUP_TARGETS],
        )
        self.assertEqual(fake.cursor.anonymous_challenges, [])
        self.assertEqual(fake.connection.commit_calls, 1)
        self.assertEqual(fake.connection.rollback_calls, 0)
        self.assert_redacted(summary)

    def test_google_oauth_cleanup_requires_the_first_callback_to_have_consumed_state(
        self,
    ) -> None:
        challenges = audit_challenges()
        challenges[1] = (*challenges[1][:3], None)
        cursor = FakeCursor(
            row_count=2,
            anonymous_challenges=challenges,
        )
        status, summary, fake = self.run_check(
            cursor=cursor,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["synthetic_cleanup_target_not_consumed"],
        )
        self.assertEqual(fake.connection.commit_calls, 0)
        self.assertEqual(fake.connection.rollback_calls, 1)
        self.assertEqual(fake.cursor.anonymous_challenges, challenges)
        self.assert_redacted(summary)

    def test_unrelated_anonymous_challenge_is_never_deleted(self) -> None:
        unrelated = (
            uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
            "pre_auth_csrf",
            UNRELATED_CHALLENGE_HASH,
            None,
        )
        challenges = [*audit_challenges(), unrelated]
        cursor = FakeCursor(
            row_count=3,
            anonymous_challenges=challenges,
        )
        status, summary, fake = self.run_check(
            cursor=cursor,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["synthetic_data_cleanup_incomplete"],
        )
        self.assertEqual(fake.connection.commit_calls, 0)
        self.assertEqual(fake.connection.rollback_calls, 1)
        self.assertEqual(fake.cursor.anonymous_challenges, challenges)
        challenge_deletes = [
            (sql, params)
            for sql, params in fake.cursor.executions
            if sql.startswith("DELETE FROM public.auth_challenges")
        ]
        self.assertEqual(
            [params[1:] for _sql, params in challenge_deletes],
            [(kind, token_hash) for kind, token_hash, _expected in CLEANUP_TARGETS],
        )
        self.assertTrue(
            all(params[2] != UNRELATED_CHALLENGE_HASH for _sql, params in challenge_deletes)
        )
        self.assert_redacted(summary)

    def test_mid_cleanup_failure_rolls_back_without_commit(self) -> None:
        identifier = uuid.UUID("12345678-1234-4123-8123-123456789abc")
        users = [(identifier, "phase1-audit-rollback@example.invalid")]
        challenges = audit_challenges()
        cursor = FakeCursor(
            row_count=3,
            synthetic_users=users,
            anonymous_challenges=challenges,
            fail_on="challenge_delete",
        )
        status, summary, fake = self.run_check(
            cursor=cursor,
            env={
                "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
            },
            cleanup_targets=CLEANUP_TARGETS,
        )
        self.assertEqual(status, 1)
        self.assertEqual(
            summary["failureCodes"],
            ["connection_or_query_failed"],
        )
        self.assertEqual(fake.connection.commit_calls, 0)
        self.assertEqual(fake.connection.rollback_calls, 1)
        self.assertEqual(fake.cursor.synthetic_users, users)
        self.assertEqual(fake.cursor.anonymous_challenges, challenges)
        self.assertEqual(fake.cursor.row_count, 3)
        self.assert_redacted(summary)

    def test_migration_probe_requires_exact_pinned_deterministic_pg18_result(self) -> None:
        base = valid_probe()
        mutations = (
            lambda item: item.update(image="postgres:latest"),
            lambda item: item.update(major=17),
            lambda item: item.update(secondSchemaSha256=sha256("different")),
            lambda item: item.update(applicationTablesEmptyAfterDowngrade=False),
        )
        for mutate in mutations:
            probe = dict(base)
            mutate(probe)
            with self.subTest(probe=probe):
                status, summary, fake = self.run_check(probe=probe)
                self.assertEqual(status, 1)
                self.assertEqual(
                    summary["failureCodes"],
                    ["migration_round_trip_failed"],
                )
                self.assertEqual(fake.calls, [])

    def test_connection_and_query_exceptions_are_sanitized(self) -> None:
        for connector in (
            FakeConnector(fail=True),
            FakeConnector(FakeCursor(fail_on="constraints")),
        ):
            with self.subTest(connector=connector):
                status, summary, _fake = self.run_check(connector=connector)
                self.assertEqual(status, 1)
                self.assertEqual(
                    summary["failureCodes"],
                    ["connection_or_query_failed"],
                )
                self.assert_redacted(summary)

    def test_main_emits_one_json_document_and_rejects_secret_arguments(self) -> None:
        fake = FakeConnector()
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            status = MODULE.main(
                argv=[],
                environ={"QUANTGYM_PREVIEW_POSTGRES_URL": DSN},
                connect_fn=fake,
                migration_probe_fn=lambda: valid_probe(),
                evidence=valid_evidence(),
                evidence_bytes=self.evidence_bytes,
                now=NOW,
            )
        self.assertEqual(status, 0)
        self.assertEqual(json.loads(stdout.getvalue())["status"], "pass")
        self.assertEqual(stderr.getvalue(), "")
        self.assert_redacted(json.loads(stdout.getvalue()))

        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            status = MODULE.main(argv=[f"--dsn={DSN}"], environ={})
        self.assertEqual(status, 2)
        self.assertEqual(
            json.loads(stdout.getvalue())["failureCodes"],
            ["unsupported_arguments"],
        )
        self.assertNotIn(PASSWORD, stdout.getvalue() + stderr.getvalue())
        self.assertNotIn("Traceback", stdout.getvalue() + stderr.getvalue())

    def test_main_accepts_cleanup_targets_only_over_bounded_stdin(self) -> None:
        cursor = FakeCursor(
            row_count=2,
            anonymous_challenges=audit_challenges(),
        )
        fake = FakeConnector(cursor)
        cleanup_input = json.dumps(
            {
                "schemaVersion": 1,
                "anonymousChallengeTargets": [
                    {
                        "kind": kind,
                        "tokenHash": token_hash,
                        "expectedConsumed": expected_consumed,
                    }
                    for kind, token_hash, expected_consumed in CLEANUP_TARGETS
                ],
            }
        ).encode("utf-8")
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            status = MODULE.main(
                argv=[],
                environ={
                    "QUANTGYM_PREVIEW_POSTGRES_URL": DSN,
                    MODULE.CLEANUP_CONFIRMATION_ENV: MODULE.CLEANUP_CONFIRMATION_VALUE,
                },
                connect_fn=fake,
                migration_probe_fn=lambda: valid_probe(),
                evidence=valid_evidence(),
                evidence_bytes=self.evidence_bytes,
                now=NOW,
                input_stream=io.BytesIO(cleanup_input),
            )
        self.assertEqual(status, 0)
        summary = json.loads(stdout.getvalue())
        self.assertEqual(summary["status"], "pass")
        self.assertEqual(fake.connection.commit_calls, 1)
        self.assertEqual(fake.connection.rollback_calls, 0)
        rendered = json.dumps(summary, sort_keys=True)
        for _kind, token_hash, _expected_consumed in CLEANUP_TARGETS:
            self.assertNotIn(token_hash, rendered)
        self.assert_redacted(summary)


if __name__ == "__main__":
    unittest.main()
