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
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
import leetcode_sync as lc
import guardian as guardian_module
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

    def save_leetcode_fixture(self, user, snapshot):
        with self.connect_database() as connection:
            placeholder = "CAST(? AS jsonb)" if USE_POSTGRES else "?"
            connection.execute(self.sql(
                "INSERT INTO user_leetcode (user_id, data_json, revision, updated_at) "
                f"VALUES (?, {placeholder}, 1, ?) ON CONFLICT(user_id) DO UPDATE SET "
                "data_json = excluded.data_json, revision = user_leetcode.revision + 1, updated_at = excluded.updated_at"),
                (user["id"], json.dumps(snapshot), datetime.now(timezone.utc).isoformat()))

    def synced_snapshot(self, records, username="private-synced-profile", lifetime_solved=None):
        return lc.fresh_snapshot(lc.empty_snapshot(), {
            "username": username, "displayName": "Private connected profile",
            "stats": {"solved": len({row["problemSlug"] for row in records if row["status"] == "AC"}) if lifetime_solved is None else lifetime_solved},
            "submissions": records, "calendar": [{"date": "2026-09-14", "submissions": 9999}], "calendarYear": 2026,
        })

    def accepted(self, identity, slug, when):
        return lc.submission({"id": identity, "problemSlug": slug, "submittedAt": when, "status": "AC", "title": slug})

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
            self.assertLessEqual(set(question), {"id", "title", "titleEn", "kind", "count", "completedAt", "source", "problemNumber", "isSummary", "completedCount"})
        goal = self.create_goal(first_guardian)
        status, data, _ = self.request("DELETE", f'/api/guardian/goals/{goal["id"]}', second_guardian)
        self.assertEqual(status, 404, data)
        self.assertEqual(self.dashboard(first_guardian)["goals"][0]["status"], "active")

    def test_dashboard_counts_local_days_and_deduplicates_trainer_and_daily_rollups(self):
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
        self.assertEqual(chicago["summary"]["todayCount"], 2, chicago)
        self.assertEqual(utc["summary"]["todayCount"], 5, utc)
        self.assertEqual(chicago["summary"]["totalCount"], 5)
        self.assertEqual(chicago["summary"]["activeDays"], 2)
        self.assertEqual(sum(row["count"] for row in chicago["questions"]), 2)
        for query in ({"date": "2026-02-30"}, {"date": "2026-9-14"}, {"timeZone": "not/a-zone"}):
            status, data, _ = self.request("GET", "/api/guardian/dashboard?" + urlencode(query), guardian)
            self.assertEqual(status, 400, data)

    def test_trainer_details_count_once_and_inferred_interview_completions_are_excluded(self):
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
        # Four trainer sessions, two daily answers and one explicit catalog done.
        # Trainer detail counts remain available only within summary rows.
        self.assertEqual(dashboard["summary"]["todayCount"], 7, dashboard)
        self.assertEqual(len(dashboard["questions"]), 7)
        self.assertNotIn("PRIVATE", json.dumps(dashboard))
        self.assertNotIn("submittedAnswer", json.dumps(dashboard))
        self.assertEqual(sum(row["completedCount"] for row in dashboard["questions"] if row["kind"] == "mental"), 7)

    def test_manual_and_historical_trainer_counts_are_summary_rows_and_complete_goals(self):
        user = self.new_user()
        guardian = self.guardian(user)
        goal = self.create_goal(guardian, targetCount=1)
        when = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
        state = empty_state()
        state["activities"] = [activity(f"manual-{kind}", when, count=100, kind=kind, source="manual")
                               for kind in ("mental", "sequence", "pattern")]
        state["activities"].append(activity("category-math-activity", when, count=100, kind="quant", category="mentalMath"))
        state["dailySessions"] = [{"id": "daily-mental", "questions": [{"id": "q", "kind": "mental", "title": "Math"},
                                                                         {"id": "categorized", "kind": "tech", "category": "mentalMath", "title": "Math"}],
                                    "answers": {"q": {"text": "42", "completedAt": when}, "categorized": {"text": "42", "completedAt": when}}}]
        self.put_personal(user, state)
        self.request("PUT", "/api/state", user["token"], {"state": {
            "mentalMathRecords": [{"id": "old-math", "correct": 100, "createdAt": when}],
            "problems": [{"id": "category-math", "category": "mentalMath", "titleEn": "Math"}],
            "problemStates": [{"problemId": "category-math", "completed": True, "completedAt": when},
                              {"problemId": "raw-category-math", "category": "mentalMath", "completed": True, "completedAt": when}],
        }})
        dashboard = self.dashboard(guardian)
        self.assertEqual(dashboard["summary"]["totalCount"], 8)
        self.assertEqual(sum(row["completedCount"] for row in dashboard["questions"]), 504)
        self.assertTrue(all(row["isSummary"] for row in dashboard["questions"]))
        self.assertEqual(sum(row["completedCount"] for row in dashboard["questions"] if row["source"] == "manual"), 300)
        self.assertEqual(dashboard["goals"][0]["id"], goal["id"])
        self.assertEqual(dashboard["goals"][0]["status"], "completed")
        self.assertGreaterEqual(dashboard["goals"][0]["progress"], 4)
        self.wait_until(lambda: self.smtp.messages_for(user["email"]))
        self.assertEqual(len(self.smtp.messages_for(user["email"])), 1)
        status, restored, _ = self.request("GET", "/api/personal-prep", user["token"])
        self.assertEqual(status, 200)
        self.assertEqual(len(restored["data"]["activities"]), 4)
        self.assertEqual(restored["data"]["dailySessions"], state["dailySessions"])

    def test_fifty_eight_trainer_completions_and_real_technical_leetcode_numbers(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["trials"] = [{"id": "math-58", "settings": {"trainer": "math"}, "status": "completed",
                            "correct": 58, "completedAt": when, "questions": [
                                {"id": f"math-{i}", "outcome": "correct", "completedAt": when,
                                 "expression": "PRIVATE EXPRESSION", "submittedAnswer": "PRIVATE ANSWER",
                                 "mistakes": [{"answer": "PRIVATE MISTAKE"}] if i == 0 else []}
                                for i in range(58)]}]
        state["activities"] = [activity("mental:math-58", when, count=58, kind="mental", trialId="math-58")]
        state["practiceSessions"] = [{
            "id": "tech-numbered", "kind": "tech", "status": "completed", "startedAt": when,
            "updatedAt": when, "completedAt": when, "text": "PRIVATE TECHNICAL ANSWER", "selfAssessment": "independent",
            "elapsedSeconds": 60, "timerStartedAt": None, "reviewed": False, "codeLanguage": "python",
            "question": {"id": "catalog-problem-015", "source": "question-bank", "title": "Technical fixture",
                         "titleEn": "Technical fixture", "prompt": "PRIVATE PROMPT", "promptEn": "",
                         "reference": "PRIVATE REFERENCE", "referenceEn": "", "url": "",
                         "provenance": {"version": 1, "originalNumber": "4.2", "sourceReference": "PRIVATE SOURCE"}},
        }]
        self.put_personal(user, state)
        status, restored, _ = self.request("GET", "/api/personal-prep", user["token"])
        self.assertEqual(status, 200)
        self.assertIn("practice:tech-numbered", {row["id"] for row in restored["data"]["activities"]})
        accepted = {**self.accepted("submission-900001", "two-sum", when), "frontendId": "1"}
        self.save_leetcode_fixture(user, self.synced_snapshot([accepted]))
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": {
            "mentalMathRecords": [{"id": "math-58", "correct": 58, "createdAt": when}],
        }})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["todayCount"], 3)
        self.assertEqual(len(dashboard["questions"]), 3)
        by_kind = {row["kind"]: row for row in dashboard["questions"]}
        self.assertEqual(by_kind["mental"]["count"], 1)
        self.assertEqual(by_kind["mental"]["completedCount"], 58)
        self.assertTrue(by_kind["mental"]["isSummary"])
        self.assertEqual(by_kind["mental"]["problemNumber"], "")
        self.assertEqual(by_kind["tech"]["problemNumber"], "4.2")
        self.assertEqual(by_kind["coding"]["problemNumber"], "1")
        self.assertFalse(by_kind["coding"]["isSummary"])
        for private in ("PRIVATE", "mistakes", "expression", "submittedAnswer", "provenance", "_trainerKey"):
            self.assertNotIn(private, json.dumps(dashboard))

    def test_trainer_session_cross_midnight_counts_once_on_latest_completion_day(self):
        user = self.new_user()
        guardian = self.guardian(user)
        state = empty_state()
        first, second = "2026-09-14T01:00:00Z", "2026-09-14T08:00:00Z"
        state["activeTrial"] = {
            "id": "cross-midnight", "settings": {"trainer": "sequence"}, "status": "active", "correct": 1,
            "questions": [{"id": "closed-1", "outcome": "correct", "completedAt": first},
                          {"id": "closed-2", "outcome": "wrong", "completedAt": second},
                          {"id": "closed-2", "outcome": "wrong", "completedAt": second},
                          {"id": "skip", "outcome": "skipped", "completedAt": second},
                          {"id": "timeout", "outcome": "timeout", "completedAt": second},
                          {"id": "abort", "outcome": "aborted", "completedAt": second},
                          {"id": "undated", "outcome": "correct"}],
            "currentQuestion": {"id": "unfinished", "mistakes": [{"answer": "PRIVATE WRONG INPUT"}]},
        }
        state["activities"] = [activity("sequence:cross-midnight", second, count=99, kind="sequence", trialId="cross-midnight")]
        self.put_personal(user, state)
        utc = self.dashboard(guardian, "2026-09-14")
        chicago = self.dashboard(guardian, "2026-09-14", "America/Chicago")
        previous = self.dashboard(guardian, "2026-09-13", "America/Chicago")
        self.assertEqual(utc["summary"]["totalCount"], 1)
        self.assertEqual(len(utc["questions"]), 1)
        self.assertEqual(utc["questions"][0]["count"], 1)
        self.assertEqual(utc["questions"][0]["completedCount"], 2)
        self.assertEqual(chicago["summary"]["totalCount"], 1)
        self.assertEqual(chicago["summary"]["activeDays"], 1)
        self.assertEqual([row["count"] for row in chicago["questions"]], [1])
        self.assertEqual(previous["questions"], [])
        self.assertEqual(chicago["questions"][0]["id"], utc["questions"][0]["id"])
        utc_goal = self.create_goal(guardian, targetCount=1, startDate="2026-09-14", endDate="2026-09-14", timeZone="UTC")
        chicago_goal = self.create_goal(guardian, targetCount=1, startDate="2026-09-13", endDate="2026-09-13", timeZone="America/Chicago")
        two_session_goal = self.create_goal(guardian, targetCount=2, startDate="2026-09-14", endDate="2026-09-14", timeZone="UTC")
        self.assertEqual(utc_goal["status"], "completed")
        self.assertEqual(utc_goal["progress"], 1)
        self.assertNotEqual(chicago_goal["status"], "completed")
        self.assertEqual(chicago_goal["progress"], 0)
        self.assertNotEqual(two_session_goal["status"], "completed")
        self.assertEqual(two_session_goal["progress"], 1)

    def test_trainer_empty_details_and_tombstones_suppress_aggregate_fallbacks(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["trials"] = [
            {"id": "empty", "settings": {"trainer": "math"}, "status": "completed", "correct": 88,
             "completedAt": when, "questions": []},
            {"id": "deleted", "settings": {"trainer": "math"}, "status": "completed", "correct": 1,
             "completedAt": when, "questions": [{"id": "q", "outcome": "correct", "completedAt": when}]},
        ]
        state["activities"] = [activity("manual-copy", when, count=88, kind="mental", trialId="empty", source="manual"),
                               activity("deleted-copy", when, count=1, kind="mental", trialId="deleted")]
        state["removedActivityIds"] = ["deleted-copy"]
        self.put_personal(user, state)
        self.request("PUT", "/api/state", user["token"], {"state": {"mentalMathRecords": [
            {"id": "empty", "correct": 88, "createdAt": when}, {"id": "deleted", "correct": 1, "createdAt": when}]}})
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)

    def test_technical_number_recovery_is_exact_preserves_snapshot_and_fails_gracefully(self):
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["practiceSessions"] = [
            {"id": identity, "kind": "tech", "status": "completed", "text": "PRIVATE ANSWER", "completedAt": when,
             "question": {"id": question_id, "source": "question-bank", "title": "PRIVATE QUESTION TITLE", **metadata}}
            for identity, question_id, metadata in [
                ("known", "catalog-problem-015", {}),
                ("snapshot", "catalog-problem-107", {"provenance": {"originalNumber": "A.22"}}),
                ("unknown", "catalog-problem-999", {}),
            ]]
        state["activities"] = [activity("practice:" + session["id"], when, kind="tech") for session in state["practiceSessions"]]

        def collect():
            conn = MagicMock()
            cursors = [MagicMock(), MagicMock(), MagicMock(), MagicMock()]
            cursors[0].fetchone.return_value = {"data_json": state, "updated_at": when}
            cursors[1].fetchone.return_value = None
            cursors[2].fetchone.return_value = None
            cursors[3].fetchall.return_value = []
            conn.execute.side_effect = cursors
            return guardian_module.GuardianService.practice(None, conn, "fixture-user")[0]

        with patch.object(guardian_module, "load_technical_questions", return_value=[
            {"id": "catalog-problem-015", "provenance": {"originalNumber": "1.2.1"}, "prompt": "PRIVATE BUNDLE PROMPT"},
            {"id": "catalog-problem-107", "provenance": {"originalNumber": "1.1.15"}},
        ]) as loader:
            rows = collect()
            loader.assert_called_once()
        self.assertEqual({row["id"]: row["problemNumber"] for row in rows}, {
            "practice:known": "1.2.1", "practice:snapshot": "A.22", "practice:unknown": "",
        })
        self.assertNotIn("PRIVATE BUNDLE", json.dumps(rows))
        for error in (ValueError("bad bundle"), OSError("missing bundle")):
            with patch.object(guardian_module, "load_technical_questions", side_effect=error):
                recovered = {row["id"]: row["problemNumber"] for row in collect()}
                self.assertEqual(recovered["practice:known"], "")
                self.assertEqual(recovered["practice:snapshot"], "A.22")
        for number in ("1.2.1", "A.22", "LCR 001", "面试题 01.01"):
            self.assertEqual(guardian_module.problem_number({"problemNumber": number}), number)
        for number in ("<b>4</b>", "1\n2", "no number", "9" * 101):
            self.assertEqual(guardian_module.problem_number({"problemNumber": number}), "")
        self.assertEqual(guardian_module.problem_number({"id": "problem-015", "title": "Question 42"}), "")

    def test_draw_only_and_draft_records_do_not_count_but_explicit_done_does(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["activities"] = [activity("random-draw", when, kind="tech", source="draw"),
                               activity("draft-activity", when, kind="tech", status="active")]
        state["dailySessions"] = [{"id": "drawn-daily", "questions": [{"id": "q", "kind": "tech", "title": "Drawn question"}],
                                    "answers": {"q": {"text": "A draft only"}}}]
        self.put_personal(user, state)
        self.request("PUT", "/api/state", user["token"], {"state": {
            "entries": [{"id": "scored", "problemId": "drawn", "date": when, "interviewScore": 88}],
            "problemStates": [{"problemId": "drawn", "lastPracticedAt": when, "lastScore": 88}],
        }})
        self.assertEqual(self.dashboard(guardian, "2026-09-14")["summary"]["totalCount"], 0)
        status, data, _ = self.request("PUT", "/api/problem-states", user["token"], {"problemState": {
            "problemId": "drawn", "completed": True, "completedAt": when,
        }})
        self.assertEqual(status, 200, data)
        self.assertEqual(self.dashboard(guardian, "2026-09-14")["summary"]["todayCount"], 1)

    def test_legacy_leetcode_identifiers_are_excluded_and_catalog_trainers_are_summarized(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        status, data, _ = self.request("PUT", "/api/problems", user["token"], {"problem": {
            "id": "catalog-trainer", "category": "quant", "source": "trainer",
            "titleEn": "Stored trainer", "promptEn": "Training only",
        }})
        self.assertEqual(status, 200, data)
        state = empty_state()
        state["activities"] = [
            activity("leetcode:old-activity", when),
            activity("linked-old-id", when, problemId="LeetCode-old-missing-catalog"),
            activity("source-cn", when, source="LeetCode-CN"),
            activity("source-com", when, sourceType="leetcode_com"),
            activity("direct-trainer", when, source=" Trainer "),
            activity("catalog-trainer-activity", when, problemId="catalog-trainer"),
        ]
        state["dailySessions"] = [{"id": "trainer-daily", "questions": [{"id": "q", "kind": "coding", "source": "trainer"}],
                                    "answers": {"q": {"text": "training answer", "completedAt": when}}}]
        self.put_personal(user, state)
        status, data, _ = self.request("PUT", "/api/problem-states", user["token"], {"problemStates": [
            {"problemId": "leetcode:missing-metadata", "completed": True, "completedAt": when},
            {"problemId": "source-only", "sourceType": "LeetCode com", "completed": True, "completedAt": when},
            {"problemId": "raw-trainer", "source": "trainer", "completed": True, "completedAt": when},
            {"problemId": "catalog-trainer", "completed": True, "completedAt": when},
            {"problemId": "onsite-coding", "category": "coding", "source": "onsite", "completed": True, "completedAt": when},
        ]})
        self.assertEqual(status, 200, data)
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": {
            "entries": [{"id": "legacy-done", "problemId": "leetcode-old-entry", "completed": True, "completedAt": when}],
        }})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["totalCount"], 5)
        self.assertEqual([row["id"] for row in dashboard["questions"] if not row["isSummary"]], ["legacy:problem:onsite-coding"])
        self.assertEqual(sum(row["count"] for row in dashboard["questions"] if row["isSummary"]), 4)

    def test_leetcode_uses_current_connection_synced_ac_and_three_hour_repeats(self):
        user, other = self.new_user(), self.new_user()
        guardian = self.guardian(user)
        rows = [self.accepted("ac1", "two-sum", "2026-09-14T01:00:00Z"),
                self.accepted("ac2", "two-sum", "2026-09-14T08:00:00Z"),
                self.accepted("ac3", "two-sum", "2026-09-14T08:05:00Z"),
                self.accepted("ac4", "three-sum", "2026-09-14T09:00:00Z")]
        snapshot = self.synced_snapshot(rows)
        snapshot = lc.import_metadata(snapshot, {"username": snapshot["connection"]["username"],
                                                 "submissions": [self.accepted("imported", "not-publicly-synced", "2026-09-14T09:30:00Z")]})
        self.save_leetcode_fixture(user, snapshot)
        utc = self.dashboard(guardian, "2026-09-14")
        chicago = self.dashboard(guardian, "2026-09-14", "America/Chicago")
        self.assertEqual(utc["summary"]["todayCount"], 3)
        self.assertEqual(utc["summary"]["totalCount"], 3)
        self.assertEqual(chicago["summary"]["todayCount"], 2)
        self.assertEqual(chicago["summary"]["totalCount"], 3)
        self.assertEqual(chicago["summary"]["activeDays"], 2)
        self.assertEqual({row["source"] for row in utc["questions"]}, {"leetcode"})
        self.assertNotIn("private-synced-profile", json.dumps(utc))
        self.assertNotIn("not-publicly-synced", json.dumps(utc))
        self.assertEqual(self.dashboard(self.guardian(other))["summary"]["totalCount"], 0)
        utc_goal = self.create_goal(guardian, targetCount=3, startDate="2026-09-13", endDate="2026-09-14", timeZone="UTC")
        chicago_goal = self.create_goal(guardian, targetCount=3, startDate="2026-09-13", endDate="2026-09-14", timeZone="America/Chicago")
        self.assertEqual(utc_goal["progress"], 3)
        self.assertEqual(utc_goal["status"], "completed")
        self.assertEqual(chicago_goal["progress"], 3)
        self.assertEqual(chicago_goal["status"], "completed")
        snapshot["connection"]["username"] = "different-linked-account"
        self.save_leetcode_fixture(user, snapshot)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)
        self.save_leetcode_fixture(user, self.synced_snapshot([rows[3]], "next-account"))
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 1)
        self.assertEqual(self.request("DELETE", "/api/leetcode", user["token"])[0], 200)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)

    def test_leetcode_three_hour_boundary_anchors_to_last_counted_ac_across_midnight(self):
        user = self.new_user()
        guardian = self.guardian(user)
        times = ["2026-09-13T23:00:00Z", "2026-09-14T00:00:00Z", "2026-09-14T02:00:00Z",
                 "2026-09-14T04:59:59Z", "2026-09-14T05:00:00Z"]
        records = [self.accepted(f"same-{i}", "same-problem", when) for i, when in enumerate(times)]
        records.append(self.accepted("other", "other-problem", "2026-09-14T00:00:00Z"))
        # Imported order and timezone must not affect which acceptances count.
        self.save_leetcode_fixture(user, self.synced_snapshot(list(reversed(records))))
        utc = self.dashboard(guardian, "2026-09-14")
        chicago = self.dashboard(guardian, "2026-09-14", "America/Chicago")
        yesterday = self.dashboard(guardian, "2026-09-13")
        self.assertEqual(utc["summary"]["totalCount"], 4)
        self.assertEqual(chicago["summary"]["totalCount"], 4)
        self.assertEqual(utc["summary"]["todayCount"], 3)
        self.assertEqual(chicago["summary"]["todayCount"], 1)
        self.assertEqual(yesterday["summary"]["todayCount"], 1)
        self.assertEqual({row["id"] for row in utc["questions"]}, {
            "leetcode:same-problem:same-2", "leetcode:same-problem:same-4", "leetcode:other-problem:other",
        })
        goal = self.create_goal(guardian, targetCount=4, startDate="2026-09-14", endDate="2026-09-14")
        self.assertEqual(goal["progress"], 3)
        self.assertNotEqual(goal["status"], "completed")
        self.assertEqual(self.smtp.messages_for(user["email"]), [])
        self.restart_server()
        self.assertEqual(self.dashboard(guardian, "2026-09-14")["summary"]["totalCount"], 4)

    def test_lifetime_leetcode_fills_undated_history_without_today_or_goal_credit(self):
        user, other = self.new_user(), self.new_user()
        guardian = self.guardian(user)
        self.save_leetcode_fixture(user, self.synced_snapshot([], lifetime_solved=50))
        history_only = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(history_only["summary"]["totalCount"], 50)
        self.assertEqual(history_only["summary"]["datedCount"], 0)
        self.assertEqual(history_only["summary"]["undatedLeetcodeCount"], 50)
        self.assertEqual(history_only["summary"]["leetcodeLifetimeSolvedCount"], 50)
        self.assertEqual(history_only["summary"]["todayCount"], 0)
        self.assertEqual(history_only["summary"]["activeDays"], 0)
        self.assertEqual(history_only["questions"], [])
        goal = self.create_goal(guardian, targetCount=6, startDate="2026-09-14", endDate="2026-09-14")
        self.assertEqual(goal["progress"], 0)
        self.assertNotEqual(goal["status"], "completed")
        self.assertEqual(self.dashboard(self.guardian(other))["summary"]["totalCount"], 0)
        records = [self.accepted("first", "two-sum", "2026-09-14T09:00:00Z"),
                   self.accepted("first-repeat", "two-sum", "2026-09-14T12:00:00Z"),
                   self.accepted("second", "three-sum", "2026-09-14T10:00:00Z"),
                   self.accepted("second-repeat", "three-sum", "2026-09-14T13:00:00Z")]
        snapshot = self.synced_snapshot(records, lifetime_solved=50)
        self.save_leetcode_fixture(user, snapshot)
        state = empty_state()
        state["activities"] = [activity("manual-math", "2026-09-14T12:00:00Z", count=58, kind="mental", source="manual")]
        self.put_personal(user, state)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["totalCount"], 53)
        self.assertEqual(dashboard["summary"]["datedCount"], 5)
        self.assertEqual(dashboard["summary"]["undatedLeetcodeCount"], 48)
        self.assertEqual(dashboard["summary"]["todayCount"], 5)
        self.assertEqual(dashboard["summary"]["activeDays"], 1)
        self.assertEqual(len(dashboard["questions"]), 5)
        self.assertEqual(dashboard["goals"][0]["progress"], 5)
        self.assertNotEqual(dashboard["goals"][0]["status"], "completed")
        self.assertEqual(self.smtp.messages_for(user["email"]), [])
        self.assertNotIn("private-synced-profile", json.dumps(dashboard))
        # A lower profile count never subtracts known dated completions.
        snapshot["stats"]["solved"] = 1
        self.save_leetcode_fixture(user, snapshot)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 5)
        # Relinking or deleting a connection removes its historical floor too.
        snapshot["connection"]["username"] = "different-profile"
        self.save_leetcode_fixture(user, snapshot)
        relinked = self.dashboard(guardian)
        self.assertEqual(relinked["summary"]["totalCount"], 1)
        self.assertIsNone(relinked["summary"]["leetcodeLifetimeSolvedCount"])
        self.save_leetcode_fixture(user, self.synced_snapshot([], "different-profile", lifetime_solved=2))
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 3)
        self.assertEqual(self.request("DELETE", "/api/leetcode", user["token"])[0], 200)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 1)

    def test_older_public_leetcode_records_restore_dates_but_imported_history_stays_excluded(self):
        user = self.new_user()
        guardian = self.guardian(user)
        current = self.accepted("current", "two-sum", "2026-09-14T12:00:00Z")
        snapshot = self.synced_snapshot([current], lifetime_solved=50)
        snapshot = lc.import_metadata(snapshot, {"username": snapshot["connection"]["username"], "submissions": [
            self.accepted("imported-old", "imported-only", "2026-09-12T12:00:00Z"),
        ]})
        snapshot["_records"].append(self.accepted("public-old", "three-sum", "2026-09-12T12:00:00Z"))
        # A later metadata copy must not replace the explicit synced ledger row.
        snapshot["_records"].append({**current, "problemSlug": "conflicting-metadata"})
        self.save_leetcode_fixture(user, snapshot)
        dashboard = self.dashboard(guardian, "2026-09-14")
        older = self.dashboard(guardian, "2026-09-12")
        self.assertEqual(dashboard["summary"]["totalCount"], 50)
        self.assertEqual(dashboard["summary"]["datedCount"], 2)
        self.assertEqual(dashboard["summary"]["undatedLeetcodeCount"], 48)
        self.assertEqual(dashboard["summary"]["activeDays"], 2)
        self.assertEqual(dashboard["summary"]["todayCount"], 1)
        self.assertEqual([row["id"] for row in older["questions"]], ["leetcode:three-sum:public-old"])
        self.assertEqual([row["id"] for row in dashboard["questions"]], ["leetcode:two-sum:current"])
        for private in ("imported-only", "conflicting-metadata", "_records", "_importedSubmissionIds"):
            self.assertNotIn(private, json.dumps([dashboard, older]))
        goal = self.create_goal(guardian, targetCount=2, startDate="2026-09-14", endDate="2026-09-14")
        self.assertEqual(goal["progress"], 1)
        self.assertNotEqual(goal["status"], "completed")
        for malformed in (None, [123]):
            snapshot["_importedSubmissionIds"] = malformed
            self.save_leetcode_fixture(user, snapshot)
            guarded = self.dashboard(guardian, "2026-09-12")
            self.assertEqual(guarded["summary"]["datedCount"], 1)
            self.assertEqual(guarded["summary"]["totalCount"], 50)
            self.assertEqual(guarded["questions"], [])
        snapshot.pop("_importedSubmissionIds")
        self.save_leetcode_fixture(user, snapshot)
        self.assertEqual(self.dashboard(guardian)["summary"]["datedCount"], 1)
        self.assertEqual(self.smtp.messages_for(user["email"]), [])

    def test_dashboard_does_not_mix_dated_history_with_a_concurrently_relinked_profile_total(self):
        original = self.synced_snapshot([self.accepted("first", "two-sum", "2026-09-14T12:00:00Z")], lifetime_solved=50)
        replacement = self.synced_snapshot([], "replacement-profile", lifetime_solved=2)
        leetcode_reads = []
        conn = MagicMock()

        def execute(query, params=()):
            cursor = MagicMock()
            cursor.fetchone.return_value = None
            cursor.fetchall.return_value = []
            if "FROM user_leetcode" in query:
                snapshot = original if not leetcode_reads else replacement
                leetcode_reads.append(snapshot)
                cursor.fetchone.return_value = {"data_json": snapshot, "updated_at": "2026-09-14T12:00:00Z"}
            elif "COUNT(*) FROM guardian_goals" in query:
                cursor.fetchone.return_value = [0]
            return cursor

        conn.execute.side_effect = execute
        service = MagicMock()
        service.db.connect.return_value.__enter__.return_value = conn
        service.zone.return_value = ZoneInfo("UTC")
        service.require_guardian.return_value = {"id": "fixture-user", "account_json": {"name": "Fixture"}}
        service.goals.return_value = []
        service.email_configured.return_value = False
        service.reminder_status.return_value = {}
        service.practice.side_effect = lambda connection, user_id, **kwargs: guardian_module.GuardianService.practice(service, connection, user_id, **kwargs)
        dashboard = guardian_module.GuardianService.dashboard(service, "guardian-fixture", {"date": "2026-09-14", "timeZone": "UTC"})
        self.assertEqual(dashboard["summary"]["datedCount"], 1)
        self.assertEqual(dashboard["summary"]["leetcodeLifetimeSolvedCount"], 50)
        self.assertEqual(dashboard["summary"]["totalCount"], 50)
        self.assertEqual(len(leetcode_reads), 1)

    def test_legacy_trainer_aliases_recover_zero_and_stale_counts_without_duplicates(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        state = empty_state()
        state["activities"] = [
            activity("zero-alias", when, kind="mental", count=0, source="legacy", legacyId="wrong-only"),
            activity("duplicate-alias", when, kind="mental", count=0, source="legacy", sourceId="wrong-only"),
            activity("legacy:mental:mixed", when, kind="mental", count=2, source="legacy"),
            activity("modern-alias", when, kind="mental", count=0, source="legacy", legacyId="modern"),
            activity("removed-alias", when, kind="mental", count=0, source="legacy", sourceId="removed"),
            activity("empty-alias", when, kind="mental", count=0, source="legacy", legacyId="empty-modern"),
        ]
        state["trials"] = [
            {"id": "modern", "settings": {"trainer": "math"}, "status": "completed", "correct": 1,
             "completedAt": when, "questions": [{"id": "q", "outcome": "correct", "completedAt": when}]},
            {"id": "empty-modern", "settings": {"trainer": "math"}, "status": "completed", "correct": 0,
             "completedAt": when, "questions": []},
        ]
        state["removedActivityIds"] = ["removed-alias"]
        self.put_personal(user, state)
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": {"mentalMathRecords": [
            {"id": "wrong-only", "correct": 0, "incorrect": 3, "createdAt": when},
            {"id": "mixed", "correct": 2, "incorrect": 3, "createdAt": when},
            {"id": "modern", "correct": 0, "incorrect": 99, "createdAt": when},
            {"id": "removed", "correct": 0, "incorrect": 99, "createdAt": when},
            {"id": "empty-modern", "correct": 0, "incorrect": 99, "createdAt": when},
        ]}})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["totalCount"], 3)
        self.assertEqual(sorted(row["completedCount"] for row in dashboard["questions"]), [1, 3, 5])
        self.assertEqual(len(dashboard["questions"]), 3)
        self.assertEqual(len({row["id"] for row in dashboard["questions"]}), 3)

    def test_legacy_wrong_answers_are_finished_questions_but_skips_and_configured_total_are_not(self):
        user = self.new_user()
        guardian = self.guardian(user)
        when = "2026-09-14T12:00:00Z"
        status, data, _ = self.request("PUT", "/api/state", user["token"], {"state": {"mentalMathRecords": [
            {"id": "wrong-only", "correct": 0, "incorrect": 3, "skipped": 2, "total": 20, "createdAt": when},
            {"id": "mixed", "correct": 2, "incorrect": 3, "skipped": 1, "total": 20, "createdAt": when},
            {"id": "old-correct-only", "correct": 4, "createdAt": when},
            {"id": "skipped-only", "correct": 0, "incorrect": 0, "skipped": 20, "total": 20, "createdAt": when},
            {"id": "unfinished", "total": 20, "createdAt": when},
        ]}})
        self.assertEqual(status, 200, data)
        dashboard = self.dashboard(guardian, "2026-09-14")
        self.assertEqual(dashboard["summary"]["totalCount"], 3)
        self.assertEqual(sorted(row["completedCount"] for row in dashboard["questions"]), [3, 4, 5])
        self.assertTrue(all(row["count"] == 1 and row["isSummary"] for row in dashboard["questions"]))

    def test_leetcode_without_server_provenance_and_failed_or_future_submissions_never_count(self):
        user = self.new_user()
        guardian = self.guardian(user)
        accepted = self.accepted("accepted", "two-sum", "2026-09-14T08:00:00Z")
        snapshot = self.synced_snapshot([accepted])
        snapshot.pop("_syncedAcceptedSubmissions")
        snapshot.pop("_syncedAcceptedConnection")
        self.save_leetcode_fixture(user, snapshot)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)
        snapshot = self.synced_snapshot([])
        snapshot["_syncedAcceptedSubmissions"] = [{**accepted, "status": "WA"},
                                                   {**accepted, "id": "future", "submittedAt": "2099-01-01T00:00:00Z"}]
        self.save_leetcode_fixture(user, snapshot)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)

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

    def test_explicit_technical_completion_counts_but_manual_leetcode_practice_does_not(self):
        user = self.new_user()
        guardian = self.guardian(user)
        self.create_goal(guardian, targetCount=1)
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
        self.assertEqual(dashboard["summary"]["totalCount"], 1)
        self.assertEqual({row["id"] for row in dashboard["questions"]}, {"practice:standalone-tech"})
        self.assertEqual({row["kind"] for row in dashboard["questions"]}, {"tech"})
        self.assertEqual(dashboard["goals"][0]["status"], "completed")
        for private in ("PRIVATE STANDALONE ANSWER", "PRIVATE TECHNICAL PROMPT", "PRIVATE TECHNICAL REFERENCE", "private-linked-profile", "leetcode.cn"):
            self.assertNotIn(private, json.dumps(dashboard))
        # Historical snapshots may have completed sessions without restored
        # canonical activities. Exercise the collector's session fallback.
        with self.connect_database() as connection:
            placeholder = "CAST(? AS jsonb)" if USE_POSTGRES else "?"
            connection.execute(self.sql(f"UPDATE user_personal_prep SET data_json = {placeholder} WHERE user_id = ?"),
                               (json.dumps(state), user["id"]))
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 1)
        revision = self.put_personal(user, state, revision)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 1)
        state["removedActivityIds"] = ["practice:standalone-tech"]
        self.put_personal(user, state, revision)
        self.assertEqual(self.dashboard(guardian)["summary"]["totalCount"], 0)
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
