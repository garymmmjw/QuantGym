from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import os
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check-frontend-upgrade-preview-postgres.py"
SPEC = importlib.util.spec_from_file_location("check_frontend_upgrade_preview_postgres", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)

SOURCE = "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation"
HOST = "preview-postgres.example.render.com"
DATABASE = "quantgym_v2_preview"
ROLE = "quantgym_v2_preview_role"
PASSWORD = "postgres-secret-value-that-must-never-appear"
DSN = f"postgresql://decoy:{PASSWORD}@{HOST}/decoy_database?sslmode=require"


def sha256(value: str | bytes) -> str:
    source = value if isinstance(value, bytes) else value.encode("utf-8")
    return hashlib.sha256(source).hexdigest()


def valid_evidence() -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "authenticatedSource": SOURCE,
        "render": {
            "postgres": {
                "resourceIdHash": sha256("preview-postgres-resource-id"),
                "hostHash": sha256(HOST),
                "databaseHash": sha256(DATABASE),
                "roleHash": sha256(ROLE),
            },
            "productionPostgresResourceIdHash": sha256("production-postgres-resource-id"),
        },
    }


def valid_env(dsn: str = DSN) -> dict[str, str]:
    return {"QUANTGYM_PREVIEW_POSTGRES_URL": dsn}


class FakeCursor:
    def __init__(self, values: dict[str, Any] | None = None, fail_on: str = "") -> None:
        self.values = {
            "select_one": (1,),
            "backend_pid": (424242,),
            "ssl": (True,),
            "identity": (DATABASE, ROLE),
            "table_count": (0,),
            **(values or {}),
        }
        self.fail_on = fail_on
        self.executions: list[tuple[str, Any]] = []
        self.current = ""
        self.exited = False

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, _type: Any, _value: Any, _traceback: Any) -> None:
        self.exited = True

    def execute(self, sql: str, params: Any = None) -> None:
        normalized = " ".join(sql.split())
        assert normalized.upper().startswith("SELECT ")
        if "pg_stat_ssl" in normalized:
            key = "ssl"
        elif "pg_backend_pid" in normalized:
            key = "backend_pid"
        elif "current_database" in normalized:
            key = "identity"
        elif "pg_catalog.pg_class" in normalized:
            key = "table_count"
        else:
            key = "select_one"
        self.current = key
        self.executions.append((normalized, params))
        if self.fail_on == f"execute:{key}":
            raise RuntimeError(f"database exploded with {DSN}")

    def fetchone(self) -> Any:
        if self.fail_on == f"fetch:{self.current}":
            raise RuntimeError(f"fetch exploded with {DSN}")
        return self.values[self.current]


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.fake_cursor = cursor
        self.exited = False

    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, _type: Any, _value: Any, _traceback: Any) -> None:
        self.exited = True

    def cursor(self) -> FakeCursor:
        return self.fake_cursor


class FakeConnector:
    def __init__(
        self,
        values: dict[str, Any] | None = None,
        fail_on: str = "",
    ) -> None:
        self.cursor = FakeCursor(values, fail_on)
        self.connection = FakeConnection(self.cursor)
        self.fail_on = fail_on
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def __call__(self, dsn: str, **kwargs: Any) -> FakeConnection:
        self.calls.append((dsn, kwargs))
        if self.fail_on == "connect":
            raise RuntimeError(f"connection exploded with {DSN}")
        return self.connection


class PreviewPostgresCheckTests(unittest.TestCase):
    evidence_bytes = b"redacted-provider-evidence\n"
    evidence_sha = sha256(evidence_bytes)

    def run_check(
        self,
        *,
        env: dict[str, str] | None = None,
        evidence: dict[str, Any] | None = None,
        connector: FakeConnector | None = None,
    ) -> tuple[int, dict[str, Any], FakeConnector]:
        fake = connector or FakeConnector()
        status, summary = MODULE.run_check(
            environ=env if env is not None else valid_env(),
            connect_fn=fake,
            evidence=evidence if evidence is not None else valid_evidence(),
            evidence_bytes=self.evidence_bytes,
        )
        return status, summary, fake

    def assert_redacted(self, summary: dict[str, Any]) -> None:
        serialized = json.dumps(summary, sort_keys=True)
        for forbidden in (
            DSN,
            PASSWORD,
            HOST,
            DATABASE,
            ROLE,
            "424242",
            "decoy_database",
            "decoy",
        ):
            self.assertNotIn(forbidden, serialized)

    def test_success_verifies_ssl_runtime_identity_and_empty_schema(self) -> None:
        status, summary, fake = self.run_check()
        self.assertEqual(status, 0)
        self.assertEqual(
            summary,
            {
                "schemaVersion": 1,
                "check": "frontend-v2-preview-postgres",
                "status": "pass",
                "evidenceSha256": self.evidence_sha,
                "hashes": {
                    "resourceIdHash": sha256("preview-postgres-resource-id"),
                    "hostHash": sha256(HOST),
                    "databaseHash": sha256(DATABASE),
                    "roleHash": sha256(ROLE),
                },
                "checks": {
                    "selectOne": True,
                    "sslForCurrentBackend": True,
                    "hostMatchesProviderEvidence": True,
                    "databaseMatchesProviderEvidence": True,
                    "roleMatchesProviderEvidence": True,
                    "resourceDistinctFromProduction": True,
                    "publicSchemaEmpty": True,
                },
                "publicBaseTableCount": 0,
                "failureCodes": [],
            },
        )
        self.assertEqual(fake.calls, [(DSN, {
            "autocommit": True,
            "connect_timeout": 15,
            "sslmode": "require",
        })])
        self.assertEqual(len(fake.cursor.executions), 5)
        self.assertEqual(fake.cursor.executions[2][1], (424242,))
        table_query = fake.cursor.executions[4][0]
        self.assertIn("pg_catalog.pg_class", table_query)
        self.assertIn("pg_catalog.pg_namespace", table_query)
        self.assertIn("relkind IN ('r', 'p')", table_query)
        self.assertNotIn("information_schema.tables", table_query)
        self.assertTrue(fake.cursor.exited)
        self.assertTrue(fake.connection.exited)
        self.assert_redacted(summary)

    def test_both_postgres_uri_schemes_and_uppercase_host_are_supported(self) -> None:
        for scheme in ("postgres", "postgresql"):
            with self.subTest(scheme=scheme):
                dsn = f"{scheme}://user:{PASSWORD}@PREVIEW-POSTGRES.EXAMPLE.RENDER.COM/db?sslmode=require"
                status, summary, fake = self.run_check(env=valid_env(dsn))
                self.assertEqual(status, 0)
                self.assertEqual(len(fake.calls), 1)
                self.assert_redacted(summary)

    def test_database_and_role_hashes_come_from_queries_not_dsn(self) -> None:
        status, summary, _fake = self.run_check()
        self.assertEqual(status, 0)
        self.assertEqual(summary["hashes"]["databaseHash"], sha256(DATABASE))
        self.assertEqual(summary["hashes"]["roleHash"], sha256(ROLE))
        self.assertNotEqual(summary["hashes"]["databaseHash"], sha256("decoy_database"))
        self.assertNotEqual(summary["hashes"]["roleHash"], sha256("decoy"))

    def test_invalid_dsn_targets_fail_before_connect(self) -> None:
        invalid = (
            "",
            "host=preview-postgres.example.render.com password=secret",
            "mysql://user:secret@preview-postgres.example.render.com/db",
            "postgresql:///db?sslmode=require",
            "postgresql://user:secret@localhost/db?sslmode=require",
            "postgresql://user:secret@127.0.0.1/db?sslmode=require",
            "postgresql://user:secret@[::1]/db?sslmode=require",
            "postgresql://user:secret@preview-postgres.example.render.com/a/b?sslmode=require",
            "postgresql://user:secret@preview-postgres.example.render.com/db?host=attacker.invalid&sslmode=require",
            "postgresql://user:secret@preview-postgres.example.render.com/db?passfile=/tmp/pass&sslmode=require",
            "postgresql://user:secret@preview-postgres.example.render.com/db?sslmode=disable",
            "postgresql://user:secret@preview-postgres.example.render.com:99999/db?sslmode=require",
            "postgresql://user:secret@preview-postgres.example.render.com/db?sslmode=require#fragment",
        )
        for dsn in invalid:
            with self.subTest(dsn=dsn[:24]):
                status, summary, fake = self.run_check(env=valid_env(dsn))
                self.assertEqual(status, 1)
                self.assertEqual(fake.calls, [])
                self.assertEqual(summary["failureCodes"], ["dsn_invalid"])
                self.assert_redacted(summary)

    def test_host_mismatch_fails_before_connect(self) -> None:
        evidence = valid_evidence()
        evidence["render"]["postgres"]["hostHash"] = sha256("other.render.com")
        status, summary, fake = self.run_check(evidence=evidence)
        self.assertEqual(status, 1)
        self.assertEqual(fake.calls, [])
        self.assertEqual(summary["failureCodes"], ["host_identity_mismatch"])
        self.assert_redacted(summary)

    def test_preview_resource_must_differ_from_production(self) -> None:
        evidence = valid_evidence()
        evidence["render"]["productionPostgresResourceIdHash"] = evidence["render"]["postgres"]["resourceIdHash"]
        status, summary, fake = self.run_check(evidence=evidence)
        self.assertEqual(status, 1)
        self.assertEqual(fake.calls, [])
        self.assertEqual(summary["failureCodes"], ["resource_identity_reused"])

    def test_expected_evidence_digest_must_match_before_connect(self) -> None:
        env = valid_env()
        env["QUANTGYM_PREVIEW_EXPECTED_PROVIDER_EVIDENCE_SHA256"] = sha256(b"different")
        status, summary, fake = self.run_check(env=env)
        self.assertEqual(status, 1)
        self.assertEqual(fake.calls, [])
        self.assertEqual(summary["failureCodes"], ["provider_evidence_digest_mismatch"])
        self.assert_redacted(summary)

    def test_provider_evidence_shape_and_hashes_are_strict(self) -> None:
        mutations = (
            lambda evidence: evidence.update(schemaVersion=2),
            lambda evidence: evidence.update(authenticatedSource="operator-form"),
            lambda evidence: evidence["render"]["postgres"].pop("hostHash"),
            lambda evidence: evidence["render"]["postgres"].update(hostHash="A" * 64),
            lambda evidence: evidence["render"].update(productionPostgresResourceIdHash="short"),
        )
        for mutate in mutations:
            evidence = valid_evidence()
            mutate(evidence)
            with self.subTest(evidence=evidence):
                status, summary, fake = self.run_check(evidence=evidence)
                self.assertEqual(status, 1)
                self.assertEqual(fake.calls, [])
                self.assertEqual(summary["failureCodes"], ["provider_evidence_invalid"])
                self.assert_redacted(summary)

    def test_select_one_backend_pid_and_ssl_are_strict(self) -> None:
        fixtures = (
            ({"select_one": (0,)}, "select_one_failed"),
            ({"select_one": None}, "select_one_failed"),
            ({"backend_pid": None}, "backend_pid_invalid"),
            ({"backend_pid": (True,)}, "backend_pid_invalid"),
            ({"backend_pid": (0,)}, "backend_pid_invalid"),
            ({"ssl": None}, "ssl_not_active"),
            ({"ssl": (False,)}, "ssl_not_active"),
            ({"ssl": (1,)}, "ssl_not_active"),
        )
        for values, code in fixtures:
            with self.subTest(code=code, values=values):
                status, summary, fake = self.run_check(connector=FakeConnector(values))
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], [code])
                self.assertTrue(fake.cursor.exited)
                self.assertTrue(fake.connection.exited)
                self.assert_redacted(summary)

    def test_runtime_database_and_role_must_match_provider_evidence(self) -> None:
        for values, code in (
            ({"identity": ("wrong_database", ROLE)}, "database_identity_mismatch"),
            ({"identity": (DATABASE, "wrong_role")}, "role_identity_mismatch"),
            ({"identity": None}, "runtime_identity_invalid"),
        ):
            with self.subTest(code=code):
                status, summary, fake = self.run_check(connector=FakeConnector(values))
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], [code])
                self.assertTrue(fake.cursor.exited)
                self.assertTrue(fake.connection.exited)
                self.assert_redacted(summary)

    def test_public_schema_table_count_must_be_integer_zero(self) -> None:
        for value in ((1,), (-1,), (True,), ("0",), None):
            with self.subTest(value=value):
                status, summary, fake = self.run_check(
                    connector=FakeConnector({"table_count": value}),
                )
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], ["public_schema_not_empty"])
                self.assertTrue(fake.cursor.exited)
                self.assertTrue(fake.connection.exited)
                self.assert_redacted(summary)

    def test_connection_execute_and_fetch_errors_are_sanitized_and_close_contexts(self) -> None:
        for fail_on in (
            "connect",
            "execute:select_one",
            "fetch:backend_pid",
            "execute:ssl",
            "fetch:identity",
            "execute:table_count",
        ):
            with self.subTest(fail_on=fail_on):
                fake = FakeConnector(fail_on=fail_on)
                status, summary, fake = self.run_check(connector=fake)
                self.assertEqual(status, 1)
                self.assertEqual(summary["failureCodes"], ["connection_or_query_failed"])
                if fail_on != "connect":
                    self.assertTrue(fake.cursor.exited)
                    self.assertTrue(fake.connection.exited)
                self.assert_redacted(summary)

    def test_missing_dsn_is_sanitized(self) -> None:
        status, summary, fake = self.run_check(env={})
        self.assertEqual(status, 1)
        self.assertEqual(fake.calls, [])
        self.assertEqual(summary["failureCodes"], ["dsn_invalid"])
        self.assert_redacted(summary)

    def test_main_outputs_one_json_document_and_never_tracebacks(self) -> None:
        connector = FakeConnector()
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            status = MODULE.main(
                argv=[],
                environ=valid_env(),
                connect_fn=connector,
                evidence=valid_evidence(),
                evidence_bytes=self.evidence_bytes,
            )
        self.assertEqual(status, 0)
        summary = json.loads(stdout.getvalue())
        self.assertEqual(summary["status"], "pass")
        self.assertEqual(stderr.getvalue(), "")
        self.assert_redacted(summary)

    def test_main_rejects_arguments_without_echoing_them(self) -> None:
        secret_argument = f"--dsn={DSN}"
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            status = MODULE.main(argv=[secret_argument], environ={})
        self.assertEqual(status, 2)
        summary = json.loads(stdout.getvalue())
        self.assertEqual(summary["failureCodes"], ["unsupported_arguments"])
        self.assertNotIn(secret_argument, stdout.getvalue())
        self.assertNotIn(secret_argument, stderr.getvalue())
        self.assertNotIn("Traceback", stdout.getvalue() + stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
