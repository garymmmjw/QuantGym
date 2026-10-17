#!/usr/bin/env python3
"""Real account-cloud HTTP tests; --postgres uses a fresh disposable cluster.

The database URL in the caller's environment is never used. PostgreSQL mode
requires psycopg and initdb/pg_ctl (or QUANTGYM_TEST_POSTGRES_BIN).
"""
import copy
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")


class LearningStateApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="qg-learning-state-", dir="/tmp")
        cls.directory = Path(cls.temp.name)
        cls.database = cls.directory / "test.sqlite3"
        cls.pg_started = False
        cls.counter = 0
        cls.log = (cls.directory / "server.log").open("ab")
        catalog = cls.directory / "empty.json"
        catalog.write_text("[]")
        problems = cls.directory / "synthetic-problems.json"
        problems.write_text(json.dumps([{"id": f"quantvault-{display}", "source": "quantvault", "visibility": "private",
            "titleEn": "Synthetic projection fixture", "promptEn": "Synthetic test question", "answer": "Synthetic answer",
            "quantvault": {"id": internal, "displayId": display}}
            for internal, display in ((900, 14), (42, 142))]))
        cls.port = cls.free_port()
        cls.environment = {
            **{key: value for key, value in os.environ.items() if not key.startswith("QUANTGYM_") and key != "DATABASE_URL"},
            "PYTHONDONTWRITEBYTECODE": "1", "PORT": str(cls.port), "QUANTGYM_HOST": "127.0.0.1",
            "QUANTGYM_DB": str(cls.database), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_DATABASE_URL": "", "QUANTGYM_POSTGRES_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(problems), "QUANTGYM_JOBS_CATALOG": str(catalog),
            "QUANTGYM_JOBS_SOURCE_URL": "", "QUANTGYM_PRIVATE_WORKSPACES": "0",
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "", "QUANTGYM_ADMIN_EMAILS": "",
            "QUANTGYM_SMTP_HOST": "", "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": "",
            "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
        }
        # Generate a real browser-domain profile, not an approximation of it.
        fixture = subprocess.check_output(["node", "--input-type=module", "-e", """
          import { completeLocalLesson } from './src/features/learning/lessonProgress.mjs';
          import { createTrainingProfile, submitTrainingAttempt } from './src/features/learning/scoring/training-system.mjs';
          const now = 1792080000000;
          const learn = completeLocalLesson({}, 'lec-q-prob-slides-03', 0, now).progress;
          learn.renderer = {'slide:lec-q-prob-slides-03': 2};
          learn.notes = [{lessonId:'lec-q-prob-slides-03', text:'云端笔记'}];
          const training = submitTrainingAttempt(createTrainingProfile({now,id:'profile-fixture'}),
            {eventId:'weng-fixture',problemId:900,x:1,h:true,reveal:false,now:now+1},
            {problemsIndex:[{id:900,di:14,c:'probability',d:'easy',co:[],t:[]}]}).profile;
          console.log(JSON.stringify({learn,training}));
        """], cwd=ROOT, text=True)
        cls.fixture = json.loads(fixture)
        try:
            if USE_POSTGRES:
                cls.start_postgres()
            cls.start_server()
        except Exception:
            cls.tearDownClass()
            raise

    @staticmethod
    def free_port():
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            return probe.getsockname()[1]

    @classmethod
    def start_postgres(cls):
        import psycopg
        cls.psycopg = psycopg
        bindir = Path(os.environ.get("QUANTGYM_TEST_POSTGRES_BIN", "/opt/homebrew/bin"))
        initdb = shutil.which("initdb") or str(bindir / "initdb")
        cls.pg_ctl = shutil.which("pg_ctl") or str(bindir / "pg_ctl")
        cls.pg_data = cls.directory / "postgres"
        port = cls.free_port()
        subprocess.run([initdb, "-D", str(cls.pg_data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, stdout=cls.log, stderr=cls.log)
        subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-l", str(cls.directory / "postgres.log"), "-w", "-o", f"-h 127.0.0.1 -p {port} -k {cls.directory}", "start"], check=True, stdout=cls.log, stderr=cls.log)
        cls.pg_started = True
        cls.pg_dsn = f"postgresql://fixture_admin@127.0.0.1:{port}/postgres"
        cls.environment.update(QUANTGYM_DB_BACKEND="postgres", QUANTGYM_POSTGRES_DATABASE_URL=cls.pg_dsn)

    @classmethod
    def connect_database(cls):
        return cls.psycopg.connect(cls.pg_dsn) if USE_POSTGRES else sqlite3.connect(cls.database)

    @staticmethod
    def sql(query):
        return query.replace("?", "%s") if USE_POSTGRES else query

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen([sys.executable, str(ROOT / "api-server/server.py")], cwd=ROOT,
                                       env=cls.environment, stdout=cls.log, stderr=cls.log)
        for _ in range(150):
            if cls.process.poll() is not None:
                break
            try:
                if cls.request("GET", "/api/health")[0] == 200:
                    return
            except (OSError, http.client.HTTPException):
                pass
            time.sleep(0.05)
        raise RuntimeError((cls.directory / "server.log").read_text())

    @classmethod
    def stop_server(cls):
        if getattr(cls, "process", None) and cls.process.poll() is None:
            cls.process.terminate()
            cls.process.wait(timeout=10)

    @classmethod
    def tearDownClass(cls):
        cls.stop_server()
        if cls.pg_started:
            subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=cls.log, stderr=cls.log)
            cls.pg_started = False
        cls.log.close()
        cls.temp.cleanup()

    @classmethod
    def request(cls, method, path="/api/learning/state", token="", payload=None, raw=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=15)
        actual_headers = {"Content-Type": "application/json", **(headers or {})}
        if token:
            actual_headers["Authorization"] = f"Bearer {token}"
        body = raw if raw is not None else json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
        try:
            connection.request(method, path, body=body, headers=actual_headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read()), dict(response.getheaders())
        finally:
            connection.close()

    def new_user(self):
        type(self).counter += 1
        status, data, _ = self.request("POST", "/api/auth/register", payload={
            "password": "CloudFixture1234", "account": {"email": f"learning-{self.counter}@example.invalid", "name": "Learning fixture", "provider": "local"}})
        self.assertEqual(status, 201, data)
        return data["token"], data["account"]["id"]

    def put(self, token, data=None, revision=0, **extra):
        return self.request("PUT", token=token, payload={"version": 1, "baseRevision": revision,
                            "data": copy.deepcopy(self.fixture) if data is None else data, **extra})

    def assert_private(self, headers):
        self.assertEqual(headers.get("Cache-Control"), "private, no-store")
        self.assertEqual(headers.get("Pragma"), "no-cache")
        self.assertIn("Authorization", headers.get("Vary", ""))

    def test_login_required_for_reads_and_writes(self):
        for token in ("", "invalid-session"):
            for method in ("GET", "PUT"):
                status, _, headers = self.request(method, token=token)
                self.assertEqual(status, 401)
                self.assert_private(headers)

    def test_new_browser_restores_complete_profile_without_vip(self):
        token, _ = self.new_user()
        status, initial, headers = self.request("GET", token=token)
        self.assertEqual((status, initial), (200, {"version": 1, "revision": 0, "data": None, "updatedAt": None}))
        self.assert_private(headers)
        status, saved, headers = self.put(token)
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(saved["data"], self.fixture)
        self.assertIsInstance(saved["updatedAt"], str)
        self.assert_private(headers)
        # A second login has its own session and no in-memory client state.
        status, login, _ = self.request("POST", "/api/auth/login", payload={
            "email": f"learning-{self.counter}@example.invalid", "password": "CloudFixture1234"})
        self.assertEqual(status, 200)
        self.assertNotEqual(login["token"], token)
        self.assertEqual(self.request("GET", token=login["token"])[1], saved)

    def test_account_scope_cannot_be_selected_by_body_or_query(self):
        owner_token, owner = self.new_user()
        other_token, _ = self.new_user()
        self.assertEqual(self.put(owner_token)[0], 200)
        for query in (f"?userId={owner}", f"?user_id={owner}"):
            self.assertIsNone(self.request("GET", "/api/learning/state" + query, token=other_token)[1]["data"])
        self.assertEqual(self.put(other_token, userId=owner)[0], 400)
        other = copy.deepcopy(self.fixture)
        other["learn"]["notes"] = ["Another account"]
        self.assertEqual(self.put(other_token, other)[0], 200)
        self.assertEqual(self.request("GET", token=owner_token)[1]["data"], self.fixture)
        for path in ("/api/community", "/api/leaderboard", "/api/problems", "/api/state"):
            status, public, _ = self.request("GET", path, token=other_token if path == "/api/state" else "")
            self.assertEqual(status, 200, public)
            text = json.dumps(public, ensure_ascii=False)
            self.assertNotIn("云端笔记", text)
            self.assertNotIn("Another account", text)
            self.assertNotIn("user_learning_states", text)

    def test_stale_revision_returns_current_snapshot_and_can_rebase(self):
        token, _ = self.new_user()
        saved = self.put(token)[1]
        stale = copy.deepcopy(self.fixture)
        stale["learn"]["renderer"]["slide:lec-q-prob-slides-03"] = 3
        status, conflict, headers = self.put(token, stale)
        self.assertEqual(status, 409)
        self.assertEqual({key: conflict[key] for key in saved}, saved)
        self.assert_private(headers)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        status, second, _ = self.put(token, stale, revision=conflict["revision"])
        self.assertEqual((status, second["revision"]), (200, 2))
        self.assertEqual(second["data"], stale)
        # A lost response followed by an identical retry cannot create revision 3.
        self.assertEqual(self.put(token, stale, revision=1)[0], 409)

    def test_concurrent_first_and_existing_writes_have_one_winner(self):
        token, _ = self.new_user()
        for base in (0, 1):
            barrier = threading.Barrier(2)
            def write(marker):
                data = copy.deepcopy(self.fixture)
                data["learn"]["notes"] = [marker]
                barrier.wait(timeout=5)
                return self.put(token, data, revision=base)
            with ThreadPoolExecutor(max_workers=2) as executor:
                replies = list(executor.map(write, ("Device A", "Device B")))
            self.assertEqual(sorted(reply[0] for reply in replies), [200, 409], replies)
            winner = next(reply[1] for reply in replies if reply[0] == 200)
            loser = next(reply[1] for reply in replies if reply[0] == 409)
            self.assertEqual(winner["revision"], base + 1)
            self.assertEqual(loser["data"], winner["data"])
            self.assertEqual(self.request("GET", token=token)[1], winner)

    def test_nullable_sections_are_supported(self):
        token, _ = self.new_user()
        for revision, data in enumerate(({"learn": None, "training": None}, {"learn": self.fixture["learn"], "training": None}, {"learn": None, "training": self.fixture["training"]})):
            status, saved, _ = self.put(token, data, revision)
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"], data)

    def test_problem_notes_favorites_and_practice_restore_for_a_second_login_only(self):
        token, owner = self.new_user()
        email = f"learning-{self.counter}@example.invalid"
        other, _ = self.new_user()
        at = "2026-10-16T12:00:00.123Z"
        personal = {"problemId": "quantvault-14", "updatedAt": at,
                    "favorite": True, "favoriteUpdatedAt": at, "note": "仅本账号的题目笔记", "noteUpdatedAt": at,
                    "freePracticeAttempts": [{"id": "history", "startedAt": at, "recordedAt": at, "updatedAt": at,
                        "elapsedSeconds": 32, "outcome": "correct", "hintViewed": True, "answerViewed": False}]}
        status, result, headers = self.request("PUT", "/api/problem-states", token=token, payload={"problemState": personal})
        self.assertEqual(status, 200, result)
        self.assert_private(headers)
        self.assertEqual(result["problemStates"], [personal])
        status, login, _ = self.request("POST", "/api/auth/login", payload={"email": email, "password": "CloudFixture1234"})
        self.assertEqual(status, 200, login)
        self.assertEqual(self.request("GET", "/api/problem-states", token=login["token"])[1]["problemStates"], [personal])
        self.assert_private(self.request("GET", "/api/problem-states", token=login["token"])[2])
        self.assertEqual(self.request("GET", f"/api/problem-states?userId={owner}", token=other)[1]["problemStates"], [])
        for method in ("GET", "PUT"):
            status, _, headers = self.request(method, "/api/problem-states", payload={"problemState": personal})
            self.assertEqual(status, 401)
            self.assert_private(headers)

    def test_sync_is_private_and_does_not_acknowledge_a_failed_commit(self):
        token, _ = self.new_user()
        at = "2026-10-16T12:00:00.123Z"
        body = {"problemStates": [{"problemId": "quantvault-14", "updatedAt": at,
                                 "note": "must commit before acknowledgment", "noteUpdatedAt": at}]}
        status, _, headers = self.request("POST", "/api/sync", payload=body)
        self.assertEqual(status, 401)
        self.assert_private(headers)
        with self.connect_database() as conn:
            conn.execute("CREATE TABLE fixture_commit_failure (owner_id TEXT REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED)")
            if USE_POSTGRES:
                conn.execute("CREATE FUNCTION fixture_fail_sync_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fixture_commit_failure (owner_id) VALUES ('missing-owner'); RETURN NEW; END $$")
                conn.execute("CREATE TRIGGER fixture_fail_sync_commit AFTER INSERT ON user_problem_states FOR EACH ROW EXECUTE FUNCTION fixture_fail_sync_commit()")
            else:
                conn.execute("CREATE TRIGGER fixture_fail_sync_commit AFTER INSERT ON user_problem_states BEGIN INSERT INTO fixture_commit_failure (owner_id) VALUES ('missing-owner'); END")
        try:
            # The write itself succeeds; the deferred FK fails only at COMMIT.
            status, reply, headers = self.request("POST", "/api/sync", token=token, payload=body)
            self.assertEqual(status, 500, reply)
            self.assert_private(headers)
            self.assertEqual(self.request("GET", "/api/problem-states", token=token)[1]["problemStates"], [])
        finally:
            with self.connect_database() as conn:
                conn.execute("DROP TRIGGER fixture_fail_sync_commit ON user_problem_states" if USE_POSTGRES else "DROP TRIGGER fixture_fail_sync_commit")
                if USE_POSTGRES:
                    conn.execute("DROP FUNCTION fixture_fail_sync_commit()")
                conn.execute("DROP TABLE fixture_commit_failure")
        status, reply, headers = self.request("POST", "/api/sync", token=token, payload=body)
        self.assertEqual(status, 200, reply)
        self.assert_private(headers)
        self.assertEqual(reply["problemStates"][0]["note"], body["problemStates"][0]["note"])

    def test_stale_and_concurrent_problem_snapshots_preserve_independent_edits_and_deletions(self):
        token, _ = self.new_user()
        def write(state):
            return self.request("PUT", "/api/problem-states", token=token, payload={"problemState": state})
        base = {"problemId": "quantvault-14", "updatedAt": "2026-10-16T12:00:00.123Z",
                "favorite": True, "favoriteUpdatedAt": "2026-10-16T12:00:00.123Z",
                "note": "old", "noteUpdatedAt": "2026-10-16T12:00:00.123Z"}
        self.assertEqual(write(base)[0], 200)
        note_edit = {**base, "note": "new", "noteUpdatedAt": "2026-10-16T12:00:01.123Z", "updatedAt": "2026-10-16T12:00:01.123Z"}
        unfavorite = {**base, "favorite": False, "favoriteUpdatedAt": "2026-10-16T12:00:02.123Z", "updatedAt": "2026-10-16T12:00:02.123Z"}
        barrier = threading.Barrier(2)
        def simultaneous(state):
            barrier.wait(timeout=5)
            return write(state)
        with ThreadPoolExecutor(max_workers=2) as executor:
            replies = list(executor.map(simultaneous, (note_edit, unfavorite)))
        self.assertEqual([reply[0] for reply in replies], [200, 200], replies)
        saved = self.request("GET", "/api/problem-states", token=token)[1]["problemStates"][0]
        self.assertEqual(saved["note"], "new")
        self.assertFalse(saved["favorite"])
        self.assertEqual(write({**base, "note": "", "noteUpdatedAt": "2026-10-16T12:00:03.123Z"})[0], 200)
        for legacy in (base, {"problemId": "quantvault-14", "updatedAt": "2026-10-17T12:00:00Z", "note": "old", "favorite": True},
                       {"problemId": "quantvault-14", "updatedAt": "2026-10-18T12:00:00Z"}):
            status, reply, _ = write(legacy)
            self.assertEqual(status, 200, reply)
            self.assertEqual(reply["problemStates"][0]["note"], "")
            self.assertFalse(reply["problemStates"][0]["favorite"])
        for invalid in ({"note": "x" * 20001}, {"note": "x", "noteUpdatedAt": "invalid"}, {"note": []}):
            self.assertEqual(write({"problemId": "quantvault-14", **invalid})[0], 400)
        self.assertEqual(self.request("GET", "/api/problem-states", token=token)[1]["problemStates"][0]["note"], "")

    def test_scoring_atomically_projects_practice_and_read_repairs_older_missing_rows(self):
        token, owner = self.new_user()
        event = self.fixture["training"]["events"][0]
        at = event["at"]
        from datetime import datetime, timezone
        iso = lambda value: datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        personal = {"problemId": "quantvault-14", "updatedAt": iso(at - 1000), "favorite": True,
                    "favoriteUpdatedAt": iso(at - 2000), "note": "保留我的笔记", "noteUpdatedAt": iso(at - 2000),
                    "freePracticeSession": {"id": "fixture", "startedAt": iso(at - 30000), "elapsedMs": 7000,
                        "timerStartedAt": iso(at - 2000), "answerViewed": False, "hintViewed": False}}
        self.assertEqual(self.request("PUT", "/api/problem-states", token=token, payload={"problemState": personal})[0], 200)
        saved = self.put(token)
        self.assertEqual(saved[0], 200, saved)
        record = self.request("GET", "/api/problem-states", token=token)[1]["problemStates"][0]
        self.assertEqual(record["problemId"], "quantvault-14")
        self.assertEqual((record["note"], record["favorite"]), ("保留我的笔记", True))
        self.assertIsNone(record["freePracticeSession"])
        attempt = record["freePracticeAttempts"][0]
        self.assertEqual((attempt["id"], attempt["outcome"], attempt["elapsedSeconds"]), ("fixture", "correct", 9))
        self.assertEqual(attempt["recordedAt"], iso(at))
        self.assertTrue(attempt["hintViewed"])
        stale = copy.deepcopy(self.fixture)
        stale["training"]["events"][0].update(id="weng-loser", problemId="15")
        self.assertEqual(self.put(token, stale)[0], 409)
        self.assertEqual(len(self.request("GET", "/api/problem-states", token=token)[1]["problemStates"]), 1)
        # Simulate a historical successful score whose separate practice write was lost.
        with self.connect_database() as conn:
            conn.execute(self.sql("DELETE FROM user_problem_states WHERE user_id = ?"), (owner,))
        self.assertEqual(self.request("GET", token=token)[1], saved[1])
        repaired = self.request("GET", "/api/problem-states", token=token)[1]["problemStates"]
        self.assertEqual(len(repaired), 1)
        self.assertEqual(repaired[0]["freePracticeAttempts"][0]["id"], "fixture")
        # No timer survives the historical loss, so elapsed time is unknown (0), never fabricated.
        self.assertEqual(repaired[0]["freePracticeAttempts"][0]["elapsedSeconds"], 0)
        self.request("GET", token=token)
        self.assertEqual(self.request("GET", "/api/problem-states", token=token)[1]["problemStates"], repaired)

    def test_failed_practice_projection_rolls_back_the_scoring_snapshot(self):
        token, _ = self.new_user()
        with self.connect_database() as conn:
            if USE_POSTGRES:
                conn.execute("CREATE FUNCTION fixture_reject_practice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture projection failure'; END $$")
                conn.execute("CREATE TRIGGER fixture_reject_practice BEFORE INSERT ON user_problem_states FOR EACH ROW EXECUTE FUNCTION fixture_reject_practice()")
            else:
                conn.execute("CREATE TRIGGER fixture_reject_practice BEFORE INSERT ON user_problem_states BEGIN SELECT RAISE(ABORT, 'fixture projection failure'); END")
        try:
            self.assertEqual(self.put(token)[0], 500)
            self.assertEqual(self.request("GET", token=token)[1]["revision"], 0)
            self.assertEqual(self.request("GET", "/api/problem-states", token=token)[1]["problemStates"], [])
        finally:
            with self.connect_database() as conn:
                conn.execute("DROP TRIGGER fixture_reject_practice ON user_problem_states" if USE_POSTGRES else "DROP TRIGGER fixture_reject_practice")
                if USE_POSTGRES:
                    conn.execute("DROP FUNCTION fixture_reject_practice()")
        self.assertEqual(self.put(token)[0], 200)

    def test_real_javascript_cloud_sync_and_transport_across_devices(self):
        token, owner = self.new_user()
        status, second_login, _ = self.request("POST", "/api/auth/login", payload={
            "email": f"learning-{self.counter}@example.invalid", "password": "CloudFixture1234"})
        self.assertEqual(status, 200)
        other_token, other = self.new_user()
        fixture = {"endpoint": f"http://127.0.0.1:{self.port}/api", "userId": owner,
                   "tokenA": token, "tokenB": second_login["token"], "otherUserId": other, "otherToken": other_token}
        result = subprocess.run(["node", str(ROOT / "scripts/test-learning-cloud-http.mjs")], cwd=ROOT,
                                env={**os.environ, "QUANTGYM_LEARNING_HTTP_FIXTURE": json.dumps(fixture)},
                                capture_output=True, text=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Real HTTP learning sync passed", result.stdout)

    def test_malformed_payloads_never_replace_saved_progress(self):
        token, _ = self.new_user()
        saved = self.put(token)[1]
        base = {"version": 1, "baseRevision": 1, "data": self.fixture}
        invalid = [None, [], {}, {**base, "version": True}, {**base, "version": 2},
                   {**base, "baseRevision": True}, {**base, "baseRevision": -1}, {**base, "baseRevision": 1.5},
                   {**base, "baseRevision": 2147483647}, {**base, "data": None},
                   {**base, "data": {"learn": None}}, {**base, "owner": "someone"}]
        for section, field, bad in (("learn", "xp", 40), ("learn", "renderer", []), ("learn", "days", ["2026-02-30"]),
                                    ("training", "events", [{}]), ("training", "prefs", {}), ("training", "schemaVersion", True)):
            item = copy.deepcopy(base)
            item["data"][section][field] = bad
            invalid.append(item)
        unsafe = copy.deepcopy(base)
        unsafe["data"]["learn"]["notes"] = [{"__proto__": {"polluted": True}}]
        invalid.append(unsafe)
        deep = copy.deepcopy(base)
        nested = {}
        for _ in range(20):
            nested = {"next": nested}
        deep["data"]["learn"]["renderer"] = nested
        invalid.append(deep)
        for item in invalid:
            status, _, headers = self.request("PUT", token=token, payload=item, raw="null" if item is None else None)
            self.assertEqual(status, 400, item)
            self.assert_private(headers)
        for raw in ("{", '{"version":1,"baseRevision":1,"data":{"learn":NaN,"training":null}}',
                    '{"version":1,"baseRevision":1,"data":{"learn":' + "1" * 400 + ',"training":null}}'):
            self.assertEqual(self.request("PUT", token=token, raw=raw)[0], 400)
        self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_oversized_request_is_rejected_before_parsing(self):
        token, _ = self.new_user()
        status, _, headers = self.request("PUT", token=token, raw="{}", headers={"Content-Length": str(10 * 1024 * 1024 + 1)})
        self.assertEqual(status, 413)
        self.assert_private(headers)
        self.assertEqual(self.request("GET", token=token)[1]["revision"], 0)

    def test_restart_preserves_records_and_user_delete_cascades(self):
        token, owner = self.new_user()
        other_token, other = self.new_user()
        saved = self.put(token)[1]
        self.assertEqual(self.put(other_token)[0], 200)
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request("GET", token=token)[1], saved)
        with self.connect_database() as conn:
            if not USE_POSTGRES:
                conn.execute("PRAGMA foreign_keys = ON")
            conn.execute(self.sql("DELETE FROM users WHERE id = ?"), (owner,))
            self.assertEqual(conn.execute(self.sql("SELECT count(*) FROM user_learning_states WHERE user_id = ?"), (owner,)).fetchone()[0], 0)
            self.assertEqual(conn.execute(self.sql("SELECT count(*) FROM user_learning_states WHERE user_id = ?"), (other,)).fetchone()[0], 1)
        self.assertEqual(self.request("GET", token=token)[0], 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)
