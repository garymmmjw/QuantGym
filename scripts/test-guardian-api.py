#!/usr/bin/env python3
"""Isolated real-HTTP guardian tests with a loopback-only fake SMTP server.

Run with Python's standard library for SQLite. Optional --postgres starts and
removes its own disposable cluster; it never uses an existing DATABASE_URL.
No test contacts an external SMTP server or sends email to a real recipient.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email import policy
from email.parser import BytesParser
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import socketserver
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")


def empty_state():
    return {"mentalSettings": None, "activeTrial": None, "trials": [],
            "dailySettings": None, "dailySessions": [], "activities": [],
            "removedActivityIds": [], "applicationEvents": [], "reviewEvents": []}


def activity(identity, completed_at, count=1, kind="quant", **extra):
    return {"id": identity, "kind": kind, "count": count,
            "completedAt": completed_at, "title": f"Fixture {identity}", **extra}


class SMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.request.settimeout(10)
        recipients = []
        self.wfile.write(b"220 fixture.local ESMTP\r\n")
        while True:
            line = self.rfile.readline(65536)
            if not line:
                return
            command = line.decode("utf-8", "replace").strip()
            verb = command.split(" ", 1)[0].upper()
            if verb in {"EHLO", "HELO"}:
                self.wfile.write(b"250 fixture.local\r\n")
            elif verb == "MAIL":
                recipients = []
                self.wfile.write(b"250 Sender accepted\r\n")
            elif verb == "RCPT":
                recipients.append(command.split(":", 1)[1].strip().strip("<>"))
                self.wfile.write(b"250 Recipient accepted\r\n")
            elif verb == "DATA":
                if self.server.reject_delivery:
                    self.wfile.write(b"451 Temporary local fixture failure\r\n")
                    continue
                self.wfile.write(b"354 End with a dot\r\n")
                chunks = []
                while True:
                    chunk = self.rfile.readline(65536)
                    if chunk in {b".\r\n", b".\n", b""}:
                        break
                    chunks.append(chunk[1:] if chunk.startswith(b"..") else chunk)
                message = BytesParser(policy=policy.default).parsebytes(b"".join(chunks))
                with self.server.message_lock:
                    self.server.messages.append({"recipients": recipients[:], "message": message})
                self.wfile.write(b"250 Stored only in local fixture memory\r\n")
            elif verb == "QUIT":
                self.wfile.write(b"221 Bye\r\n")
                return
            elif verb in {"RSET", "NOOP"}:
                self.wfile.write(b"250 OK\r\n")
            else:
                self.wfile.write(b"502 Unsupported fixture command\r\n")


class FakeSMTP(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self):
        self.messages = []
        self.reject_delivery = False
        self.message_lock = threading.Lock()
        super().__init__(("127.0.0.1", 0), SMTPHandler)

    def messages_for(self, email):
        with self.message_lock:
            return [item for item in self.messages if email in item["recipients"]]


class GuardianApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="quantgym-guardian-api-", dir="/tmp")
        cls.directory = Path(cls.temp.name)
        cls.database = cls.directory / "fixture.sqlite3"
        cls.log = (cls.directory / "server.log").open("ab")
        cls.user_counter = 0
        cls.postgres_started = False
        cls.smtp = FakeSMTP()
        cls.smtp_thread = threading.Thread(target=cls.smtp.serve_forever, daemon=True)
        cls.smtp_thread.start()
        catalog = cls.directory / "catalog.json"
        catalog.write_text('{"problems": []}', encoding="utf-8")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.environment = {
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "QUANTGYM_HOST": "127.0.0.1", "PORT": str(cls.port),
            "QUANTGYM_DB": str(cls.database), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_POSTGRES_DATABASE_URL": "", "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(catalog),
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_BETA_EMAIL_ALLOWLIST": "",
            "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
            "QUANTGYM_GUARDIAN_POLL_SECONDS": "0.1",
            "QUANTGYM_SMTP_HOST": "127.0.0.1", "QUANTGYM_SMTP_PORT": str(cls.smtp.server_address[1]),
            "QUANTGYM_SMTP_SSL": "0", "QUANTGYM_SMTP_STARTTLS": "0",
            "QUANTGYM_SMTP_USERNAME": "", "QUANTGYM_SMTP_PASSWORD": "",
            "QUANTGYM_SMTP_FROM": "Guardian Fixture <fixture@example.invalid>",
            "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": "",
        }
        try:
            if USE_POSTGRES:
                cls.start_postgres()
            cls.start_server()
        except Exception:
            cls.tearDownClass()
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
        cls.environment.update(QUANTGYM_DB_BACKEND="postgres", QUANTGYM_POSTGRES_DATABASE_URL=cls.postgres_dsn)

    @classmethod
    def connect_database(cls):
        return cls.psycopg.connect(cls.postgres_dsn) if USE_POSTGRES else sqlite3.connect(cls.database)

    @staticmethod
    def sql(query):
        return query.replace("?", "%s") if USE_POSTGRES else query

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen([sys.executable, str(ROOT / "api-server/server.py")], cwd=ROOT,
                                       env=cls.environment, stdout=cls.log, stderr=cls.log)
        for _ in range(150):
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
        if getattr(cls, "process", None) and cls.process.poll() is None:
            cls.process.terminate()
            try:
                cls.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.process.kill()
                cls.process.wait(timeout=5)

    @classmethod
    def restart_server(cls, **environment):
        cls.stop_server()
        cls.environment.update(environment)
        cls.start_server()

    @classmethod
    def tearDownClass(cls):
        try:
            cls.stop_server()
        finally:
            try:
                if cls.postgres_started:
                    subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=cls.log, stderr=cls.log)
                    cls.postgres_started = False
            finally:
                cls.smtp.shutdown()
                cls.smtp.server_close()
                cls.smtp_thread.join(timeout=2)
                cls.log.close()
                cls.temp.cleanup()

    def setUp(self):
        # Each test has its own rate-limit window in this disposable database.
        with self.connect_database() as connection:
            connection.execute("DELETE FROM guardian_rate_limits")

    def tearDown(self):
        result = self._outcome.result
        if any(case is self for case, _ in result.errors + result.failures):
            print((self.directory / "server.log").read_text(encoding="utf-8")[-6000:], file=sys.stderr)

    @classmethod
    def request(cls, method, path, token=None, payload=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        connection = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=15)
        try:
            for attempt in range(3):
                try:
                    connection.connect()
                    break
                except OSError as error:
                    connection.close()
                    if error.errno != 22 or attempt == 2:
                        raise
                    time.sleep(0.025)
            connection.request(method, path, body=body, headers=headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read()), dict(response.getheaders())
        finally:
            connection.close()

    def new_user(self):
        type(self).user_counter += 1
        identity = f"guardian-fixture-{type(self).user_counter}"
        email = f"{identity}@example.invalid"
        status, data, _ = self.request("POST", "/api/auth/register", payload={
            "password": "fixture-only-password",
            "account": {"id": identity, "provider": "local", "email": email, "name": identity},
        })
        self.assertEqual(status, 201, data)
        return {"token": data["token"], "id": data["account"]["id"], "email": email, "name": identity}

    def access(self, user):
        status, data, headers = self.request("GET", "/api/guardian/access", user["token"])
        self.assertEqual(status, 200, data)
        self.assert_private(headers)
        return data

    def guardian(self, user):
        code = self.access(user)["code"]
        status, data, headers = self.request("POST", "/api/guardian/session", payload={"code": code})
        self.assertEqual(status, 200, data)
        self.assert_private(headers)
        self.assertEqual(data["student"], {"name": user["name"]})
        return data["token"]

    def dashboard(self, guardian, date=None, time_zone="UTC", **query):
        query.update(timeZone=time_zone)
        if date:
            query["date"] = date
        status, data, headers = self.request("GET", "/api/guardian/dashboard?" + urlencode(query), guardian)
        self.assertEqual(status, 200, data)
        self.assert_private(headers)
        return data

    def put_personal(self, user, state, revision=0):
        status, data, _ = self.request("PUT", "/api/personal-prep", user["token"], {
            "version": 1, "baseRevision": revision, "data": state,
        })
        self.assertEqual(status, 200, data)
        return data["revision"]

    def goal_payload(self, **extra):
        today = datetime.now(timezone.utc).date()
        return {"title": "Finish practice", "targetCount": 2, "startDate": str(today),
                "endDate": str(today + timedelta(days=2)), "timeZone": "UTC", "reward": "A book together", **extra}

    def create_goal(self, guardian, **extra):
        status, data, _ = self.request("POST", "/api/guardian/goals", guardian, self.goal_payload(**extra))
        self.assertIn(status, (200, 201), data)
        return data["goal"]

    def wait_until(self, function, timeout=12):
        deadline = time.monotonic() + timeout
        result = None
        while time.monotonic() < deadline:
            result = function()
            if result:
                return result
            time.sleep(0.1)
        self.fail(f"Timed out waiting for fixture condition; last value: {result!r}")

    def assert_private(self, headers):
        self.assertIn("no-store", headers.get("Cache-Control", ""))

    def test_code_login_and_authentication_scopes_are_separate(self):
        user = self.new_user()
        access = self.access(user)
        self.assertTrue(access["enabled"])
        self.assertGreaterEqual(len(access["code"].replace("-", "")), 16)
        self.assertEqual(self.access(user)["code"], access["code"])
        for code in ("", "invalid", "X" * 512):
            status, data, _ = self.request("POST", "/api/guardian/session", payload={"code": code})
            self.assertIn(status, (400, 401), data)
            self.assertNotIn("token", data)
        guardian = self.guardian(user)
        self.assertNotEqual(guardian, user["token"])
        for path in ("/api/account", "/api/state", "/api/personal-prep", "/api/guardian/access"):
            status, data, _ = self.request("GET", path, guardian)
            self.assertEqual(status, 401, (path, data))
        for token in (None, "bad-token", user["token"]):
            for method, path, payload in (("GET", "/api/guardian/dashboard", None),
                                          ("POST", "/api/guardian/goals", self.goal_payload()),
                                          ("POST", "/api/guardian/reminders", {"message": "Practice"})):
                status, data, headers = self.request(method, path, token, payload)
                self.assertEqual(status, 401, (path, data))
                self.assert_private(headers)
        status, data, _ = self.request("PUT", "/api/state", guardian, {"state": {"notes": "forbidden"}})
        self.assertEqual(status, 401, data)

    def test_owner_rotation_revocation_and_guardian_logout_invalidate_sessions(self):
        user = self.new_user()
        old_code = self.access(user)["code"]
        guardian = self.guardian(user)
        another_session = self.guardian(user)
        status, access, _ = self.request("POST", "/api/guardian/access/rotate", user["token"], {})
        self.assertEqual(status, 200, access)
        self.assertNotEqual(access["code"], old_code)
        for token in (guardian, another_session):
            self.assertEqual(self.request("GET", "/api/guardian/dashboard", token)[0], 401)
        self.assertEqual(self.request("POST", "/api/guardian/session", payload={"code": old_code})[0], 401)
        guardian = self.guardian(user)
        status, access, _ = self.request("POST", "/api/guardian/access/revoke", user["token"], {})
        self.assertEqual(status, 200, access)
        self.assertFalse(access["enabled"])
        self.assertIsNone(access["code"])
        self.assertEqual(self.request("GET", "/api/guardian/dashboard", guardian)[0], 401)
        self.assertFalse(self.access(user)["enabled"])
        status, access, _ = self.request("POST", "/api/guardian/access/rotate", user["token"], {})
        self.assertEqual(status, 200, access)
        self.assertTrue(access["enabled"])
        guardian = self.guardian(user)
        self.assertEqual(self.request("DELETE", "/api/guardian/session", guardian)[0], 200)
        self.assertEqual(self.request("GET", "/api/guardian/dashboard", guardian)[0], 401)

    def test_dashboard_is_account_scoped_and_only_exposes_basic_practice_information(self):
        first, second = self.new_user(), self.new_user()
        first_guardian, second_guardian = self.guardian(first), self.guardian(second)
        state = empty_state()
        state["activities"] = [activity("private-question", "2026-09-14T12:00:00Z", note="SECRET PRIVATE NOTE", answer="SECRET ANSWER")]
        state["dailySettings"] = {"secret": "SECRET DAILY SETTINGS"}
        state["applicationEvents"] = [{"id": "application-one", "applicationId": "job-one", "createdAt": "2026-09-14T12:00:00Z", "changes": {"notes": "SECRET JOB NOTE"}}]
        self.put_personal(first, state)
        self.assertEqual(self.request("GET", "/api/guardian/dashboard?" + urlencode({"userId": second["id"]}), first_guardian)[0], 400)
        first_dashboard = self.dashboard(first_guardian, "2026-09-14")
        self.assertEqual(first_dashboard["student"], {"name": first["name"]})
        self.assertEqual(first_dashboard["summary"]["todayCount"], 1)
        self.assertEqual(self.dashboard(second_guardian, "2026-09-14")["summary"]["todayCount"], 0)
        encoded = json.dumps(first_dashboard)
        for private in (first["email"], first["token"], "SECRET", "password", "applicationEvents", "dailySettings"):
            self.assertNotIn(private, encoded)
        for question in first_dashboard["questions"]:
            self.assertLessEqual(set(question), {"id", "title", "titleEn", "kind", "count", "completedAt", "source"})
        goal = self.create_goal(first_guardian)
        status, data, _ = self.request("DELETE", f'/api/guardian/goals/{goal["id"]}', second_guardian)
        self.assertEqual(status, 404, data)
        self.assertEqual(self.dashboard(first_guardian)["goals"][0]["status"], "active")

    def test_dashboard_counts_local_days_deduplicates_trials_and_excludes_daily_rollups(self):
        user = self.new_user()
        guardian = self.guardian(user)
        state = empty_state()
        state["activities"] = [
            activity("previous-local-day", "2026-09-14T02:00:00Z", count=3),
            activity("today-question", "2026-09-14T07:00:00Z"),
            activity("mental:trial-one", "2026-09-14T08:00:00Z", kind="mental", count=4, trialId="trial-one"),
            activity("daily:daily-one:complete", "2026-09-14T09:00:00Z", kind="daily", sessionId="daily-one"),
        ]
        state["trials"] = [{"id": "trial-one", "settings": {"trainer": "math"}, "status": "completed", "correct": 4, "completedAt": "2026-09-14T08:00:00Z"}]
        state["dailySessions"] = [{"id": "daily-one", "status": "completed", "questions": [], "answers": {}, "completedAt": "2026-09-14T09:00:00Z"}]
        self.put_personal(user, state)
        chicago = self.dashboard(guardian, "2026-09-14", "America/Chicago")
        utc = self.dashboard(guardian, "2026-09-14", "UTC")
        self.assertEqual(chicago["summary"]["todayCount"], 5, chicago)
        self.assertEqual(utc["summary"]["todayCount"], 8, utc)
        self.assertEqual(chicago["summary"]["totalCount"], 8)
        self.assertEqual(chicago["summary"]["activeDays"], 2)
        self.assertEqual(sum(row["count"] for row in chicago["questions"]), 5)
        for query in ({"date": "2026-02-30"}, {"date": "2026-9-14"}, {"timeZone": "not/a-zone"}):
            status, data, _ = self.request("GET", "/api/guardian/dashboard?" + urlencode(query), guardian)
            self.assertEqual(status, 400, data)

    def test_detailed_attempts_include_wrong_answers_and_deduplicate_daily_and_legacy_records(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["activities"] = [
            activity("mental:attempted-trial", when, kind="mental", count=1, trialId="attempted-trial"),
            activity("daily:daily-answers:q1", when, kind="coding", sessionId="daily-answers", questionId="q1"),
            activity("problem-explicit", when, problemId="problem-one"),
        ]
        state["trials"] = [{"id": "attempted-trial", "settings": {"trainer": "math"}, "status": "completed", "correct": 1,
                            "completedAt": when, "questions": [
                                {"id": "correct", "outcome": "correct", "completedAt": when, "a": 2, "b": 3, "operator": "add", "submittedAnswer": "PRIVATE ANSWER"},
                                {"id": "wrong", "outcome": "wrong", "completedAt": when, "a": 3, "b": 4, "operator": "add", "submittedAnswer": "PRIVATE ANSWER"},
                                {"id": "skipped", "outcome": "skipped", "completedAt": when},
                                {"id": "timeout", "outcome": "timeout", "completedAt": when},
                                {"id": "aborted", "outcome": "aborted", "completedAt": when},
                            ]}]
        # Older sync payloads may omit the questions field entirely.
        state["trials"].append({"id": "aggregate-no-questions", "settings": {"trainer": "math"},
                                "status": "completed", "correct": 3, "completedAt": when})
        state["activeTrial"] = {"id": "active-trial", "settings": {"trainer": "pattern"}, "status": "active", "questions": [
            {"id": "active-answered", "outcome": "wrong", "completedAt": when, "index": 1},
        ]}
        state["dailySessions"] = [{"id": "daily-answers", "status": "completed", "completedAt": when,
                                  "questions": [{"id": "q1", "kind": "coding", "title": "Coding question"}, {"id": "q2", "kind": "tech", "title": "Technical question"}],
                                  "answers": {"q1": {"text": "PRIVATE DAILY ANSWER", "completedAt": when}, "q2": {"text": "PRIVATE DAILY ANSWER", "completedAt": when}}}]
        self.put_personal(user, state)
        legacy = {
            "problemStates": [{"problemId": "problem-one", "completed": True, "completedAt": when}],
            "mentalMathRecords": [{"id": "attempted-trial", "correct": 1, "createdAt": when}, {"id": "legacy-trial", "correct": 2, "createdAt": when}],
            "entries": [{"id": "interview-one", "problemId": "interview-question", "date": when, "interviewEvaluation": "PRIVATE EVALUATION"}],
            "notes": "PRIVATE LEGACY NOTE",
        }
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": legacy})
        self.assertEqual(status, 200, data)
        status, data, _ = self.request("PUT", "/api/problem-states", user["token"], {"problemStates": legacy["problemStates"]})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        # 2 attempted trial questions + 1 active answer + 2 daily answers +
        # 1 deduplicated problem + 2 old mental records + 3 aggregate fallback
        # questions without a detail array + 1 interview question.
        self.assertEqual(dashboard["summary"]["todayCount"], 12, dashboard)
        self.assertEqual(len(dashboard["questions"]), 9)
        self.assertNotIn("PRIVATE", json.dumps(dashboard))
        self.assertNotIn("submittedAnswer", json.dumps(dashboard))
        self.assertEqual(sum(row["count"] for row in dashboard["questions"] if row["kind"] == "mental"), 7)

    def test_invalid_future_deleted_and_undated_records_do_not_inflate_progress(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["activities"] = [
            activity("manual-valid", when, count=3, source="manual", note="PRIVATE MANUAL NOTE"),
            activity("future", (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(), count=100),
            activity("bad-date", "2026-02-30T12:00:00Z", count=100),
            activity("undated", "", count=100),
            activity("negative", when, count=-100),
            activity("boolean", when, count=True),
            activity("unknown-kind", when, count=100, kind="application"),
            activity("deleted", when, count=100),
        ]
        state["removedActivityIds"] = ["deleted"]
        self.put_personal(user, state)
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": {
            "problemStates": [{"problemId": "undated-legacy", "completed": True}],
            "mentalMathRecords": [{"id": "undated-old", "correct": 100}],
        }})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["todayCount"], 3, dashboard)
        self.assertEqual(dashboard["summary"]["totalCount"], 3)
        self.assertEqual(len(dashboard["questions"]), 1)
        self.assertEqual(dashboard["questions"][0]["source"], "manual")

    def test_expired_sessions_and_persistent_code_attempt_rate_limit(self):
        user = self.new_user()
        guardian = self.guardian(user)
        with self.connect_database() as connection:
            connection.execute(self.sql("UPDATE guardian_sessions SET expires_at = ? WHERE user_id = ?"),
                               ("2001-01-01T00:00:00.000000Z", user["id"]))
        self.assertEqual(self.request("GET", "/api/guardian/dashboard", guardian)[0], 401)
        # The successful login above counts as the first exchange attempt.
        for _ in range(19):
            status, data, _ = self.request("POST", "/api/guardian/session", payload={"code": "invalid"})
            self.assertEqual(status, 401, data)
        self.assertEqual(self.request("POST", "/api/guardian/session", payload={"code": "invalid"})[0], 429)
        self.restart_server()
        self.assertEqual(self.request("POST", "/api/guardian/session", payload={"code": self.access(user)["code"]})[0], 429)

    def test_cancelled_goal_never_sends_an_achievement_email(self):
        user = self.new_user()
        guardian = self.guardian(user)
        goal = self.create_goal(guardian, targetCount=1)
        status, data, _ = self.request("DELETE", f'/api/guardian/goals/{goal["id"]}', guardian)
        self.assertEqual(status, 200, data)
        state = empty_state()
        state["activities"] = [activity("cancelled-goal-question", datetime.now(timezone.utc).isoformat())]
        self.put_personal(user, state)
        self.assertEqual(self.dashboard(guardian)["goals"][0]["status"], "cancelled")
        with self.connect_database() as connection:
            count = connection.execute(self.sql("SELECT COUNT(*) FROM guardian_notifications WHERE user_id = ?"), (user["id"],)).fetchone()[0]
        self.assertEqual(count, 0)
        self.assertEqual(self.smtp.messages_for(user["email"]), [])

    def test_temporary_smtp_failure_is_reported_and_queued_for_retry(self):
        user = self.new_user()
        guardian = self.guardian(user)
        self.smtp.reject_delivery = True
        try:
            status, data, _ = self.request("POST", "/api/guardian/reminders", guardian, {"message": "Retry this fixture reminder"})
            self.assertEqual(status, 202, data)
            self.wait_until(lambda: self.dashboard(guardian)["reminder"]["status"] == "retry")
            self.assertEqual(self.smtp.messages_for(user["email"]), [])
            with self.connect_database() as connection:
                stored = connection.execute(self.sql("SELECT status, attempts, sent_at FROM guardian_notifications WHERE id = ?"), (data["notification"]["id"],)).fetchone()
            self.assertEqual(tuple(stored), ("retry", 1, None))
        finally:
            self.smtp.reject_delivery = False
        with self.connect_database() as connection:
            connection.execute(self.sql("UPDATE guardian_notifications SET next_attempt_at = ? WHERE id = ?"),
                               ("2001-01-01T00:00:00.000000Z", data["notification"]["id"]))
        self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        self.wait_until(lambda: self.dashboard(guardian)["reminder"]["status"] == "sent")
        self.assertEqual(len(self.smtp.messages_for(user["email"])), 1)

    def test_catalog_titles_are_visible_only_for_public_or_linked_student_owned_problems(self):
        owner, linked = self.new_user(), self.new_user()
        guardian = self.guardian(linked)
        prefix = f"catalog-isolation-{owner['id']}"
        cases = [
            (f"{prefix}-other-user", owner, "user", "SECRET OTHER USER TITLE"),
            (f"{prefix}-own", linked, "user", "Linked student's own title"),
            (f"{prefix}-public", owner, "public", "Public practice title"),
        ]
        when = "2026-09-14T12:00:00Z"
        for identity, user, visibility, title in cases:
            status, data, _ = self.request("PUT", "/api/problems", user["token"], {"problem": {
                "id": identity, "titleEn": title, "titleZh": title,
                "promptEn": "Private catalog prompt", "answer": "Private catalog answer",
            }})
            self.assertEqual(status, 200, data)
            self.assertEqual(data["problems"][0]["ownerUserId"], user["id"])
            if visibility != "user":
                # Production catalog imports contain public rows. Preserve an
                # owner on the fixture to exercise both sides of the lookup.
                with self.connect_database() as connection:
                    connection.execute(self.sql("UPDATE problems SET visibility = ? WHERE id = ?"), (visibility, identity))
        guessed_states = [{"problemId": identity, "completed": True, "completedAt": when}
                          for identity, _, _, _ in cases]
        status, data, _ = self.request("PUT", "/api/problem-states", linked["token"], {"problemStates": guessed_states})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["todayCount"], 3)
        by_id = {question["id"]: question for question in dashboard["questions"]}
        for identity, _, visibility, title in cases:
            question = by_id[f"legacy:problem:{identity}"]
            if visibility == "public" or identity.endswith("-own"):
                self.assertEqual(question["title"], title)
                self.assertEqual(question["titleEn"], title)
            else:
                self.assertEqual(question["title"], "量化题")
                self.assertEqual(question["titleEn"], "")
                self.assertNotIn(title, json.dumps(dashboard, ensure_ascii=False))
        self.assertNotIn("Private catalog prompt", json.dumps(dashboard))
        self.assertNotIn("Private catalog answer", json.dumps(dashboard))

    def test_standalone_technical_and_coding_completions_count_once_without_private_answers(self):
        user = self.new_user()
        guardian = self.guardian(user)
        self.create_goal(guardian, targetCount=2)
        when = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
        state = empty_state()
        state["practiceSessions"] = []
        for kind in ("tech", "coding"):
            question = {
                "id": "technical-guardian-fixture", "source": "question-bank",
                "title": "Technical practice question", "titleEn": "Technical practice question",
                "prompt": "PRIVATE TECHNICAL PROMPT", "promptEn": "",
                "reference": "PRIVATE TECHNICAL REFERENCE", "referenceEn": "", "url": "",
            }
            if kind == "coding":
                question.update(id="two-sum", source="leetcode", title="Two Sum", titleEn="Two Sum",
                                prompt="", reference="", url="https://leetcode.cn/problems/two-sum/",
                                slug="two-sum", username="private-linked-profile", linkedAt=when)
            state["practiceSessions"].append({
                "id": f"standalone-{kind}", "kind": kind, "status": "completed",
                "startedAt": when, "updatedAt": when, "completedAt": when,
                "question": question, "text": "PRIVATE STANDALONE ANSWER", "codeLanguage": "python",
                "selfAssessment": "independent", "elapsedSeconds": 60, "timerStartedAt": None, "reviewed": False,
            })
        revision = self.put_personal(user, state)
        dashboard = self.dashboard(guardian)
        self.assertEqual(dashboard["summary"]["totalCount"], 2)
        self.assertEqual({row["id"] for row in dashboard["questions"]}, {"practice:standalone-tech", "practice:standalone-coding"})
        self.assertEqual({row["kind"] for row in dashboard["questions"]}, {"tech", "coding"})
        self.assertEqual(dashboard["goals"][0]["status"], "completed")
        for private in ("PRIVATE STANDALONE ANSWER", "PRIVATE TECHNICAL PROMPT", "PRIVATE TECHNICAL REFERENCE", "private-linked-profile", "leetcode.cn"):
            self.assertNotIn(private, json.dumps(dashboard))
        # Historical snapshots may have completed sessions without restored
        # canonical activities. Exercise the collector's session fallback.
        with self.connect_database() as connection:
            placeholder = "CAST(? AS jsonb)" if USE_POSTGRES else "?"
            connection.execute(self.sql(f"UPDATE user_personal_prep SET data_json = {placeholder} WHERE user_id = ?"),
                               (json.dumps(state), user["id"]))
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 2)
        revision = self.put_personal(user, state, revision)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 2)
        state["removedActivityIds"] = ["practice:standalone-tech"]
        self.put_personal(user, state, revision)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 1)
        self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        self.assertEqual(len(self.smtp.messages_for(user["email"])), 1)

    @unittest.skipIf(USE_POSTGRES, "The SQLite export command accepts SQLite databases only")
    def test_default_sqlite_export_redacts_guardian_credentials_and_private_message_content(self):
        user = self.new_user()
        guardian = self.guardian(user)
        code = self.access(user)["code"]
        title, reward = "SECRET_EXPORT_GOAL_TITLE", "SECRET_EXPORT_GOAL_REWARD"
        goal = self.create_goal(guardian, title=title, reward=reward)
        message = "SECRET_EXPORT_REMINDER_MESSAGE"
        status, data, _ = self.request("POST", "/api/guardian/reminders", guardian, {"message": message})
        self.assertEqual(status, 202, data)
        notification_id = data["notification"]["id"]
        self.wait_until(lambda: self.dashboard(guardian)["reminder"]["status"] == "sent")
        lease_secret, error_secret = "SECRET_EXPORT_DELIVERY_LEASE", "SECRET_EXPORT_PROVIDER_ERROR"
        self.stop_server()
        try:
            with self.connect_database() as connection:
                connection.execute("UPDATE guardian_notifications SET lease_token = ?, last_error = ? WHERE id = ?",
                                   (lease_secret, error_secret, notification_id))
                code_hash = connection.execute("SELECT code_hash FROM guardian_access WHERE user_id = ?", (user["id"],)).fetchone()[0]
                token_hash = connection.execute("SELECT token_hash FROM guardian_sessions WHERE user_id = ?", (user["id"],)).fetchone()[0]
            output = self.directory / "guardian-default-export.json"
            result = subprocess.run([sys.executable, str(ROOT / "scripts/export-api-sqlite.py"), "--db", str(self.database), "--out", str(output)],
                                    cwd=ROOT, env=self.environment, capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            exported = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(exported["status"], "pass")
            self.assertFalse(exported["includeSensitive"])
            self.assertFalse(exported["summaryOnly"])
            tables = exported["tables"]
            access = next(row for row in tables["guardian_access"]["rows"] if row["user_id"] == user["id"])
            session = next(row for row in tables["guardian_sessions"]["rows"] if row["user_id"] == user["id"])
            stored_goal = next(row for row in tables["guardian_goals"]["rows"] if row["id"] == goal["id"])
            notification = next(row for row in tables["guardian_notifications"]["rows"] if row["id"] == notification_id)
            for row, fields, label in ((access, ("code_hash", "code_value"), "secret"),
                                       (session, ("token_hash",), "secret"),
                                       (notification, ("lease_token",), "secret"),
                                       (stored_goal, ("title", "reward"), "text"),
                                       (notification, ("subject", "body", "last_error"), "text")):
                for field in fields:
                    self.assertIsInstance(row[field], dict, field)
                    self.assertEqual(row[field]["redacted"], label, field)
                    self.assertGreater(row[field]["bytes"], 0, field)
            encoded = json.dumps(exported, ensure_ascii=False)
            for secret in (code, code_hash, guardian, token_hash, lease_secret, error_secret, title, reward, message):
                self.assertNotIn(secret, encoded)
        finally:
            self.start_server()

    def test_goal_validation_and_cancellation(self):
        user = self.new_user()
        guardian = self.guardian(user)
        today = datetime.now(timezone.utc).date()
        for change in ({"title": ""}, {"title": " "}, {"targetCount": 0}, {"targetCount": -1},
                       {"targetCount": True}, {"targetCount": 1.5}, {"targetCount": "2"},
                       {"startDate": "2026-02-30"}, {"endDate": str(today - timedelta(days=1))},
                       {"timeZone": "invalid"}, {"reward": "x" * 5001}, {"userId": "another-user"}):
            status, data, _ = self.request("POST", "/api/guardian/goals", guardian, self.goal_payload(**change))
            self.assertEqual(status, 400, (change, data))
        self.assertEqual(self.dashboard(guardian)["goals"], [])
        goal = self.create_goal(guardian)
        self.assertEqual(goal["status"], "active")
        status, data, _ = self.request("DELETE", f'/api/guardian/goals/{goal["id"]}', guardian)
        self.assertEqual(status, 200, data)
        self.assertEqual(data["goal"]["status"], "cancelled")
        self.assertEqual(self.dashboard(guardian)["goals"][0]["status"], "cancelled")

    def test_goal_completion_automatically_emails_once_and_survives_restart(self):
        user = self.new_user()
        guardian = self.guardian(user)
        goal = self.create_goal(guardian, targetCount=2, reward="Fixture achievement reward")
        state = empty_state()
        state["activities"] = [activity("goal-question-one", datetime.now(timezone.utc).isoformat(), count=2)]
        revision = self.put_personal(user, state)
        # No guardian read between syncing answers and mail delivery: completion
        # must run automatically even when the guardian is no longer present.
        self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        completed = self.dashboard(guardian)["goals"][0]
        self.assertEqual(completed["id"], goal["id"])
        self.assertEqual(completed["status"], "completed")
        self.assertEqual(completed["progress"], 2)
        self.assertTrue(completed["completedAt"])
        messages = self.smtp.messages_for(user["email"])
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["recipients"], [user["email"]])
        self.assertIn("Fixture achievement reward", messages[0]["message"].get_body(preferencelist=("plain",)).get_content())
        for _ in range(3):
            revision = self.put_personal(user, state, revision)
            self.dashboard(guardian)
        self.restart_server()
        restored = self.dashboard(guardian)["goals"][0]
        self.assertEqual(restored["status"], "completed")
        self.assertEqual(restored["completedAt"], completed["completedAt"])
        time.sleep(1.2)
        self.assertEqual(len(self.smtp.messages_for(user["email"])), 1)

    def test_manual_reminders_only_target_linked_student_and_enforce_cooldown(self):
        user = self.new_user()
        guardian = self.guardian(user)
        for extra in ({"email": "other@example.invalid"}, {"to": "other@example.invalid"}, {"userId": "another-user"}):
            status, data, _ = self.request("POST", "/api/guardian/reminders", guardian, {"message": "Practice today", **extra})
            self.assertEqual(status, 400, data)
        self.assertEqual(self.smtp.messages_for(user["email"]), [])
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda _: self.request("POST", "/api/guardian/reminders", guardian, {"message": "Fixture reminder: practice today."}), range(2)))
        self.assertEqual(sum(status in (200, 201, 202) for status, _, _ in responses), 1, responses)
        self.assertEqual(sum(status == 429 for status, _, _ in responses), 1, responses)
        success = next(data for status, data, _ in responses if status in (200, 201, 202))
        self.assertIn(success["notification"]["status"], ("pending", "sent"))
        self.assertTrue(success["nextAllowedAt"])
        messages = self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["recipients"], [user["email"]])
        self.assertIn("Fixture reminder: practice today.", messages[0]["message"].get_body(preferencelist=("plain",)).get_content())
        self.wait_until(lambda: self.dashboard(guardian)["reminder"]["lastSentAt"])
        dashboard = self.dashboard(guardian)
        self.assertTrue(dashboard["reminder"]["lastSentAt"])
        self.assertTrue(dashboard["reminder"]["nextAllowedAt"])

    def test_smtp_unconfigured_reports_disabled_and_achievement_resumes_after_restart(self):
        self.restart_server(QUANTGYM_SMTP_HOST="")
        try:
            user = self.new_user()
            guardian = self.guardian(user)
            self.assertFalse(self.access(user)["emailConfigured"])
            self.assertFalse(self.dashboard(guardian)["emailConfigured"])
            status, data, _ = self.request("POST", "/api/guardian/reminders", guardian, {"message": "Must not pretend to send"})
            self.assertEqual(status, 503, data)
            self.assertNotEqual(data.get("notification", {}).get("status"), "sent")
            self.create_goal(guardian, targetCount=1)
            state = empty_state()
            state["activities"] = [activity("offline-smtp-question", datetime.now(timezone.utc).isoformat())]
            self.put_personal(user, state)
            goal = self.wait_until(lambda: next((goal for goal in self.dashboard(guardian)["goals"] if goal["status"] == "completed"), None))
            self.assertEqual(goal["notificationStatus"], "disabled")
            self.assertEqual(self.smtp.messages_for(user["email"]), [])
        finally:
            self.restart_server(QUANTGYM_SMTP_HOST="127.0.0.1")
        self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        self.assertEqual(len(self.smtp.messages_for(user["email"])), 1)
        self.wait_until(lambda: self.dashboard(guardian)["goals"][0]["notificationStatus"] == "sent")


if __name__ == "__main__":
    unittest.main(verbosity=2)
