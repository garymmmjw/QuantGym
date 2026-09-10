#!/usr/bin/env python3
"""Real HTTP tests with isolated SQLite, or a disposable Postgres via --postgres.

Postgres mode requires the declared api-server requirements in the active Python
environment plus initdb/pg_ctl on PATH or QUANTGYM_TEST_POSTGRES_BIN. It never uses
an existing DATABASE_URL and shuts down its temporary cluster after the tests.
"""

import copy
import ast
import http.client
import json
import os
from pathlib import Path
import socket
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from datetime import date, datetime, timezone
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")


def empty_state(marker=None):
    return {
        "mentalSettings": None,
        "activeTrial": None,
        "trials": [],
        "dailySettings": {"marker": marker} if marker else None,
        "dailySessions": [],
        "activities": [],
        "removedActivityIds": [],
        "applicationEvents": [],
        "reviewEvents": [],
    }


def archived_event_state():
    """Synthetic records written by the newer release before the UI rollback."""
    return {
        **empty_state(),
        "applicationEvents": [{
            "id": "application-event-one", "applicationId": "application-one",
            "createdAt": "2026-09-09T12:00:00.000Z",
            "changes": {"company": "Fixture company", "role": "Quant researcher", "notes": "保留申请记录"},
        }],
        "reviewEvents": [{
            "id": "review-event-one", "questionKey": "quant:fixture-question",
            "reviewedAt": "2026-09-09T12:00:00.000Z", "rating": "good", "note": "保留复习记录",
        }],
    }


class PersonalPrepApiTests(unittest.TestCase):
    def tearDown(self):
        result = self._outcome.result
        if any(case is self for case, _ in result.errors + result.failures):
            print((self.directory / "server.log").read_text(encoding="utf-8")[-6000:], file=sys.stderr)

    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="quantgym-personal-api-", dir="/tmp")
        cls.directory = Path(cls.temp.name)
        cls.postgres_started = False
        cls.database = cls.directory / "fixture.sqlite3"
        catalog = cls.directory / "catalog.json"
        catalog.write_text('{"problems": []}', encoding="utf-8")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.environment = {
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "QUANTGYM_HOST": "127.0.0.1",
            "PORT": str(cls.port),
            "QUANTGYM_DB": str(cls.database),
            "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_POSTGRES_DATABASE_URL": "",
            "QUANTGYM_DATABASE_URL": "",
            "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(catalog),
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "",
            "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
            "QUANTGYM_ALERT_WEBHOOK_URL": "",
        }
        cls.log = (cls.directory / "server.log").open("ab")
        cls.user_counter = 0
        try:
            if USE_POSTGRES:
                cls.start_postgres()
            cls.start_server()
        except Exception:
            if getattr(cls, "process", None) and cls.process.poll() is None:
                cls.stop_server()
            cls.stop_postgres()
            cls.log.close()
            cls.temp.cleanup()
            raise

    @classmethod
    def start_postgres(cls):
        import psycopg
        cls.psycopg = psycopg
        bindir = Path(os.environ.get("QUANTGYM_TEST_POSTGRES_BIN", "/opt/homebrew/bin"))
        initdb = shutil.which("initdb") or str(bindir / "initdb")
        cls.pg_ctl = shutil.which("pg_ctl") or str(bindir / "pg_ctl")
        cls.pg_data = cls.directory / "postgres"
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.pg_port = probe.getsockname()[1]
        subprocess.run([initdb, "-D", str(cls.pg_data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, stdout=cls.log, stderr=cls.log)
        subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-l", str(cls.directory / "postgres.log"), "-w", "-o", f"-h 127.0.0.1 -p {cls.pg_port} -k {cls.directory}", "start"], check=True, stdout=cls.log, stderr=cls.log)
        cls.postgres_started = True
        cls.postgres_dsn = f"postgresql://fixture_admin@127.0.0.1:{cls.pg_port}/postgres"
        cls.environment["QUANTGYM_DB_BACKEND"] = "postgres"
        cls.environment["QUANTGYM_POSTGRES_DATABASE_URL"] = cls.postgres_dsn

    @classmethod
    def stop_postgres(cls):
        if cls.postgres_started:
            subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=cls.log, stderr=cls.log)
            cls.postgres_started = False

    @classmethod
    def connect_database(cls):
        return cls.psycopg.connect(cls.postgres_dsn) if USE_POSTGRES else sqlite3.connect(cls.database)

    @staticmethod
    def sql(query):
        return query.replace("?", "%s") if USE_POSTGRES else query

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen(
            [sys.executable, str(ROOT / "api-server/server.py")],
            cwd=ROOT, env=cls.environment, stdout=cls.log, stderr=cls.log,
        )
        for _ in range(100):
            if cls.process.poll() is not None:
                raise RuntimeError((cls.directory / "server.log").read_text())
            try:
                if cls.request("GET", "/api/health")[0] == 200:
                    return
            except (ConnectionError, OSError, http.client.HTTPException):
                pass
            time.sleep(0.05)
        raise RuntimeError("Fixture API failed to start.")

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        try:
            cls.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.process.kill()
            cls.process.wait(timeout=5)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.stop_server()
        finally:
            try:
                cls.stop_postgres()
            finally:
                cls.log.close()
                cls.temp.cleanup()

    @classmethod
    def request(cls, method, path="/api/personal-prep", token=None, payload=None, raw=None, headers=None):
        actual_headers = {"Content-Type": "application/json", **(headers or {})}
        if token:
            actual_headers["Authorization"] = f"Bearer {token}"
        body = raw if raw is not None else json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        connection = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=15)
        try:
            # macOS can transiently reject TCP_NODELAY on a fresh loopback
            # socket. Retry only connection setup, before any request is sent.
            for attempt in range(3):
                try:
                    connection.connect()
                    break
                except OSError as error:
                    connection.close()
                    if error.errno != 22 or attempt == 2:
                        raise
                    time.sleep(0.025)
            connection.request(method, path, body=body, headers=actual_headers)
            response = connection.getresponse()
            result_headers = dict(response.getheaders())
            result = json.loads(response.read())
            return response.status, result, result_headers
        finally:
            connection.close()

    def new_user(self):
        type(self).user_counter += 1
        identity = f"personal-api-user-{type(self).user_counter}"
        status, data, _ = self.request("POST", "/api/auth/register", payload={
            "password": "fixture-only-password",
            "account": {"id": identity, "provider": "local", "email": f"{identity}@example.com", "name": identity},
        })
        self.assertEqual(status, 201, data)
        return data["token"], data["account"]["id"]

    def put(self, token, state, revision=0, **extra):
        return self.request("PUT", token=token, payload={"version": 1, "baseRevision": revision, "data": state, **extra})

    def assert_private(self, headers):
        self.assertIn("no-store", headers.get("Cache-Control", ""))
        self.assertIn("private", headers.get("Cache-Control", ""))

    def test_authentication_required_for_reads_and_writes(self):
        for method in ("GET", "PUT"):
            for token in (None, "invalid-fixture-token"):
                status, data, headers = self.request(method, token=token, payload={"version": 1, "baseRevision": 0, "data": empty_state()} if method == "PUT" else None)
                self.assertEqual(status, 401, data)
                self.assertNotIn("data", data)
                self.assert_private(headers)

    def test_json_response_dates_are_supported_but_other_types_still_fail(self):
        # Load only the pure formatters, avoiding server import side effects.
        tree = ast.parse((ROOT / "api-server/server.py").read_text())
        helpers = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in {"api_timestamp", "api_json_default"}]
        namespace = {"datetime": datetime, "date": date, "timezone": timezone}
        exec(compile(ast.Module(body=helpers, type_ignores=[]), "response-formatters", "exec"), namespace)
        encoder = namespace["api_json_default"]
        self.assertEqual(encoder(datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)), "2026-09-09T12:00:00Z")
        self.assertEqual(encoder(date(2026, 9, 9)), "2026-09-09")
        with self.assertRaises(TypeError):
            encoder({"unsupported-set"})

    def test_empty_read_create_update_and_clear_are_durable(self):
        token, owner = self.new_user()
        status, envelope, headers = self.request("GET", token=token)
        self.assertEqual((status, envelope), (200, {"version": 1, "revision": 0, "data": None, "updatedAt": None}))
        self.assert_private(headers)
        state = empty_state("private-note-中文")
        state["activities"] = [{"id": "daily:one:complete", "kind": "daily", "count": 1, "completedAt": "2026-09-09T12:00:00Z"}]
        status, created, _ = self.put(token, state)
        self.assertEqual(status, 200, created)
        self.assertEqual(created["revision"], 1)
        self.assertEqual(created["data"], state)
        self.assertTrue(created["updatedAt"])
        with self.connect_database() as conn:
            row = conn.execute(self.sql("SELECT data_json, revision FROM user_personal_prep WHERE user_id = ?"), (owner,)).fetchone()
            self.assertEqual(json.loads(row[0]) if isinstance(row[0], str) else row[0], state)
            self.assertEqual(row[1], 1)
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request("GET", token=token)[1], created)
        changed = copy.deepcopy(state)
        changed["removedActivityIds"] = ["manual:deleted"]
        status, updated, _ = self.put(token, changed, 1)
        self.assertEqual(status, 200, updated)
        self.assertEqual(updated["revision"], 2)
        self.assertEqual(updated["data"], changed)
        status, cleared, _ = self.put(token, empty_state(), 2)
        self.assertEqual(status, 200, cleared)
        self.assertEqual(cleared["revision"], 3)
        self.assertEqual(self.request("GET", token=token)[1]["data"], empty_state())

    def test_cross_account_isolation_and_no_client_selected_owner(self):
        first, first_id = self.new_user()
        second, second_id = self.new_user()
        first_state, second_state = empty_state("FIRST-PRIVATE-SECRET"), empty_state("SECOND-PRIVATE-SECRET")
        self.assertEqual(self.put(first, first_state)[0], 200)
        self.assertEqual(self.put(second, second_state)[0], 200)
        self.assertEqual(self.request("GET", f"/api/personal-prep?userId={second_id}", token=first)[1]["data"], first_state)
        for key in ("userId", "ownerId", "user_id"):
            self.assertEqual(self.put(first, second_state, 1, **{key: second_id})[0], 400)
        status, _, _ = self.request("PUT", f"/api/personal-prep?ownerId={first_id}", token=second, payload={"version": 1, "baseRevision": 1, "data": empty_state("second updated")})
        self.assertEqual(status, 200)
        self.assertEqual(self.request("GET", token=first)[1]["data"], first_state)
        for path in ("/api/community", "/api/leaderboard", "/api/problems", "/api/state"):
            status, public, _ = self.request("GET", path, token=second if path == "/api/state" else None)
            self.assertEqual(status, 200, (path, public))
            text = json.dumps(public)
            self.assertNotIn("FIRST-PRIVATE-SECRET", text)
            self.assertNotIn("second updated", text)
            self.assertNotIn("user_personal_prep", text)

    def test_stale_revisions_return_current_data_without_overwriting(self):
        token, _ = self.new_user()
        self.assertEqual(self.put(token, empty_state("saved"))[0], 200)
        for revision in (0, 2, 100):
            status, conflict, headers = self.put(token, empty_state("stale"), revision)
            self.assertEqual(status, 409, conflict)
            self.assertEqual(conflict["revision"], 1)
            self.assertEqual(conflict["data"], empty_state("saved"))
            self.assert_private(headers)
        fresh, _ = self.new_user()
        status, absent, _ = self.put(fresh, empty_state("future"), 1)
        self.assertEqual(status, 409, absent)
        self.assertEqual(absent["revision"], 0)
        self.assertIsNone(absent["data"])

    def test_rollback_compatibility_archived_events_round_trip_and_append(self):
        token, owner = self.new_user()
        original = archived_event_state()
        status, created, _ = self.put(token, original)
        self.assertEqual(status, 200, created)
        self.assertEqual(created["data"], original)
        self.assertEqual(self.request("GET", token=token)[1], created)

        changed = copy.deepcopy(original)
        changed["applicationEvents"].append({
            "id": "application-event-two", "applicationId": "application-one",
            "createdAt": "2026-09-09T13:00:00.000Z", "changes": {"status": "applied"},
        })
        changed["reviewEvents"].append({
            "id": "review-event-two", "questionKey": "quant:fixture-question",
            "reviewedAt": "2026-09-09T13:00:00.000Z", "rating": "easy", "note": "second review",
        })
        status, updated, _ = self.put(token, changed, created["revision"])
        self.assertEqual(status, 200, updated)
        self.assertEqual(updated["data"], changed)
        self.assertEqual(self.request("GET", token=token)[1], updated)
        with self.connect_database() as conn:
            stored = conn.execute(self.sql("SELECT data_json FROM user_personal_prep WHERE user_id = ?"), (owner,)).fetchone()[0]
        self.assertEqual(json.loads(stored) if isinstance(stored, str) else stored, changed)

    def test_rollback_compatibility_old_client_omission_and_empty_arrays_preserve_events(self):
        token, _ = self.new_user()
        original = archived_event_state()
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        for omit_fields in (True, False):
            with self.subTest(omit_fields=omit_fields):
                old_client = empty_state("old-client-omission" if omit_fields else "old-client-empty-arrays")
                if omit_fields:
                    del old_client["applicationEvents"]
                    del old_client["reviewEvents"]
                status, updated, _ = self.put(token, old_client, saved["revision"])
                self.assertEqual(status, 200, updated)
                self.assertEqual(updated["revision"], saved["revision"] + 1)
                self.assertEqual(updated["data"]["dailySettings"], old_client["dailySettings"])
                for field in ("applicationEvents", "reviewEvents"):
                    self.assertEqual(updated["data"][field], original[field])
                self.assertEqual(self.request("GET", token=token)[1], updated)
                saved = updated

    def test_rollback_compatibility_conflicting_event_is_rejected_without_partial_save(self):
        token, _ = self.new_user()
        original = archived_event_state()
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        for field in ("applicationEvents", "reviewEvents"):
            with self.subTest(field=field):
                conflicting = copy.deepcopy(original)
                conflicting["dailySettings"] = {"marker": "must-not-save"}
                other_field = "reviewEvents" if field == "applicationEvents" else "applicationEvents"
                additional = copy.deepcopy(conflicting[other_field][0])
                additional["id"] = "must-not-partially-append"
                conflicting[other_field].append(additional)
                if field == "applicationEvents":
                    conflicting[field][0]["changes"]["company"] = "must-not-overwrite"
                else:
                    conflicting[field][0]["note"] = "must-not-overwrite"
                status, rejected, headers = self.put(token, conflicting, saved["revision"])
                self.assertEqual(status, 400, rejected)
                self.assert_private(headers)
                self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_reasoning_trainers_round_trip_inside_existing_version_one_fields(self):
        token, owner = self.new_user()
        def trial(trainer, identity, feedback=False):
            settings = {"trainer": trainer, "durationSeconds": 30, "difficulty": "medium"}
            if trainer == "sequence":
                settings["sequenceType"] = "numbers"
            question = {
                "id": "q1", "index": 1, "kind": trainer, "family": "arithmetic" if trainer == "sequence" else "count",
                "difficulty": "medium", "answer": "12" if trainer == "sequence" else "B",
                "explanation": "有效的离线规则说明", "explanationEn": "A stored offline explanation.",
                "startedAt": "2026-09-10T12:00:05.000Z", "completedAt": None,
                "elapsedMs": None, "outcome": None, "submittedAnswer": None, "mistakes": [],
            }
            if trainer == "sequence":
                question["tokens"] = ["2", "4", "6", "8", "10"]
            else:
                cells = [{"shape": shape, "fill": fill, "rotation": 0, "positions": [4]}
                         for shape in ("circle", "square") for fill in ("outline", "solid", "striped")]
                question["grid"] = [copy.deepcopy(cells[index % 6]) for index in range(8)] + [None]
                question["options"] = [{"id": chr(65 + index), "cell": cell} for index, cell in enumerate(cells)]
            result = {
                "id": identity, "status": "active", "settings": settings, "dailySessionId": None,
                "startedAt": "2026-09-10T12:00:05.000Z", "deadlineAt": "2026-09-10T12:00:35.000Z",
                "completedAt": None, "correct": 0, "questions": [], "currentQuestion": question,
                "currentAnswer": "", "feedbackQuestionId": None,
            }
            if feedback:
                question.update({"completedAt": "2026-09-10T12:00:06.000Z", "elapsedMs": 1000,
                                 "outcome": "wrong", "submittedAnswer": "13" if trainer == "sequence" else "A"})
                result.update({"questions": [question], "currentQuestion": None, "feedbackQuestionId": "q1"})
            return result

        data = empty_state()
        data["trials"] = []
        for trainer in ("sequence", "pattern"):
            finished = trial(trainer, f"finished-{trainer}", feedback=True)
            finished.update({"status": "completed", "completedAt": finished["deadlineAt"], "feedbackQuestionId": None})
            data["trials"].append(finished)
            data["activities"].append({"id": f"{trainer}:{finished['id']}", "kind": trainer, "count": 0,
                                       "trialId": finished["id"], "completedAt": finished["completedAt"]})
        revision = 0
        for trainer, feedback in (("sequence", False), ("pattern", False), ("sequence", True), ("pattern", True)):
            with self.subTest(trainer=trainer, feedback=feedback):
                data["activeTrial"] = trial(trainer, f"active-{trainer}", feedback=feedback)
                status, saved, _ = self.put(token, data, revision)
                self.assertEqual(status, 200, saved)
                self.assertEqual(saved["data"], data)
                self.assertEqual(self.request("GET", token=token)[1], saved)
                revision = saved["revision"]
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request("GET", token=token)[1], saved)
        with self.connect_database() as conn:
            stored = conn.execute(self.sql("SELECT data_json FROM user_personal_prep WHERE user_id = ?"), (owner,)).fetchone()[0]
        self.assertEqual(json.loads(stored) if isinstance(stored, str) else stored, data)

    def test_concurrent_first_writes_and_updates_have_exactly_one_winner(self):
        token, _ = self.new_user()
        for revision in (0, 1):
            barrier = threading.Barrier(4)
            def write(index):
                barrier.wait(timeout=5)
                return self.put(token, empty_state(f"revision-{revision}-writer-{index}"), revision)
            with ThreadPoolExecutor(max_workers=4) as workers:
                try:
                    responses = list(workers.map(write, range(4)))
                except Exception:
                    self.log.flush()
                    print((self.directory / "server.log").read_text(encoding="utf-8")[-12000:], file=sys.stderr)
                    raise
            self.assertEqual(sorted(status for status, _, _ in responses), [200, 409, 409, 409])
            winner = next(envelope for status, envelope, _ in responses if status == 200)
            self.assertEqual(winner["revision"], revision + 1)
            for status, envelope, _ in responses:
                self.assertEqual(envelope["data"], winner["data"])
                self.assertEqual(envelope["revision"], winner["revision"])

    def test_schema_version_ids_and_finite_json_validation(self):
        token, _ = self.new_user()
        valid = {"version": 1, "baseRevision": 0, "data": empty_state()}
        invalid = [None, [], {}, {**valid, "version": 2}, {**valid, "version": True}, {**valid, "baseRevision": -1}, {**valid, "baseRevision": 1.5}, {**valid, "baseRevision": True}, {**valid, "data": {}}, {**valid, "data": None}]
        for bad_data in (
            {**empty_state(), "activities": [None]},
            {**empty_state(), "activities": [{"id": "x"}, {"id": "x"}]},
            {**empty_state(), "trials": [{"id": 42}]},
            {**empty_state(), "activeTrial": {"id": ""}},
            {**empty_state(), "dailySettings": []},
            {**empty_state(), "community": {}},
            {**empty_state(), "removedActivityIds": [42]},
            {**empty_state(), "removedActivityIds": ["x", "x"]},
            {**empty_state(), "mentalSettings": {"durationSeconds": float("nan")}},
        ):
            invalid.append({**valid, "data": bad_data})
        for payload in invalid:
            status, data, headers = self.request("PUT", token=token, raw=json.dumps(payload).encode("utf-8"))
            self.assertEqual(status, 400, (payload, data))
            self.assert_private(headers)
        self.assertEqual(self.request("PUT", token=token, raw=b"\xff")[0], 400)
        self.assertEqual(self.request("PUT", token=token, raw=b"{invalid")[0], 400)
        self.assertEqual(self.request("PUT", token=token, raw=b'{"version":' + b"1" * 5000 + b"}")[0], 400)
        self.assertEqual(self.request("GET", token=token)[1]["revision"], 0)
        old_state = empty_state()
        del old_state["removedActivityIds"]
        status, result, _ = self.put(token, old_state)
        self.assertEqual(status, 200, result)
        self.assertEqual(result["data"]["removedActivityIds"], [])

    def test_startup_adds_private_table_to_an_existing_database(self):
        token, owner = self.new_user()
        marker = {"existingUserProgress": "preserve-during-personal-schema-upgrade"}
        # Finish an authenticated round trip before terminating the fixture;
        # the legacy registration handler responds before its SQLite commit.
        self.assertEqual(self.request("GET", token=token)[0], 200)
        self.stop_server()
        with self.connect_database() as conn:
            # This is only the disposable fixture: emulate a pre-feature schema
            # with committed old progress, independent of the legacy state API.
            conn.execute(self.sql("""
                INSERT INTO user_states (user_id, state_json, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
            """), (owner, json.dumps(marker), "2026-09-09T12:00:00Z"))
            conn.execute("DROP TABLE user_personal_prep")
        self.start_server()
        self.assertEqual(self.request("GET", "/api/state", token=token)[1]["state"]["existingUserProgress"], marker["existingUserProgress"])
        self.assertEqual(self.request("GET", token=token)[1]["revision"], 0)
        self.assertEqual(self.put(token, empty_state("after-upgrade"))[0], 200)

    def test_body_length_limits_reject_before_reading_or_writing(self):
        token, _ = self.new_user()
        for length, expected in ((8 * 1024 * 1024 + 1, 413), (-1, 400)):
            status, result, headers = self.request("PUT", token=token, raw=b"", headers={"Content-Length": str(length)})
            self.assertEqual(status, expected, result)
            self.assert_private(headers)
        self.assertEqual(self.request("GET", token=token)[1]["revision"], 0)

    def test_owner_foreign_key_cascades_without_touching_other_records(self):
        token, owner = self.new_user()
        other_token, other_owner = self.new_user()
        self.put(token, empty_state("delete-me"))
        self.put(other_token, empty_state("keep-me"))
        with self.connect_database() as conn:
            if not USE_POSTGRES:
                conn.execute("PRAGMA foreign_keys = ON")
            conn.execute(self.sql("DELETE FROM users WHERE id = ?"), (owner,))
            self.assertEqual(conn.execute(self.sql("SELECT count(*) FROM user_personal_prep WHERE user_id = ?"), (owner,)).fetchone()[0], 0)
            self.assertEqual(conn.execute(self.sql("SELECT count(*) FROM user_personal_prep WHERE user_id = ?"), (other_owner,)).fetchone()[0], 1)
        self.assertEqual(self.request("GET", token=token)[0], 401)
        self.assertEqual(self.request("GET", token=other_token)[1]["data"], empty_state("keep-me"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
