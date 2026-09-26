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
sys.path.insert(0, str(ROOT / "api-server"))
from technical_practice import load_technical_questions, normalize_technical_questions
from technical_reading_list import load_technical_supplements, normalize_technical_supplements
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
        "practiceSessions": [],
        "behavioralAnswers": [],
        "behavioralQuestions": [],
        "careerTrackerOperations": [],
    }


def tracker_operations():
    event = {"id": "event-oa", "type": "oa_received", "date": "2026-09-19", "dueDate": "2026-09-23", "dueTime": "14:30", "year": 2026}
    return [
        {"id": "tracker-stage", "clock": 0, "kind": "stage", "stageId": "stage-one", "fields": {"label": "Stage 1", "description": "云端阶段", "recordedDate": "2026-08-21", "createdAt": "2026-08-21T12:00:00.000Z", "capturedAt": None, "updatedAt": None}, "aliases": ["old-stage"]},
        {"id": "tracker-application", "clock": 1, "kind": "application", "applicationId": "application-one", "fields": {"company": "Private Tracker company", "role": "Quant researcher", "prepPhase": "stage-one", "season": "2027"}},
        {"id": "tracker-submission", "clock": 2, "kind": "event", "applicationId": "application-one", "eventId": "event-submitted", "fields": {"type": "submitted", "date": "8/21", "year": None, "dueDate": "", "dueTime": ""}, "order": ["event-submitted"]},
        {"id": "tracker-oa", "clock": 3, "kind": "event", "applicationId": "application-one", "eventId": event["id"], "fields": {key: value for key, value in event.items() if key != "id"}, "order": ["event-submitted", event["id"]]},
        {"id": "tracker-delete", "clock": 4, "kind": "delete", "applicationId": "application-one", "eventId": event["id"], "deleteId": "delete-one", "event": event, "order": ["event-submitted", event["id"]]},
        {"id": "tracker-restore", "clock": 5, "kind": "restore", "applicationId": "application-one", "eventId": event["id"], "deleteId": "delete-one"},
    ]


def behavioral_question(identity="my-behavioral-question", title="My private question\n私人题干"):
    return {
        "id": identity, "title": title, "createdAt": "2026-09-20T12:00:00.000Z",
        "updatedAt": "2026-09-20T12:00:00.000Z", "deletedAt": None,
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


def practice_session(kind="tech", completed=False):
    question = {
        "id": "catalog-practice-fixture", "source": "question-bank", "title": "Fixture technical question", "titleEn": "Fixture technical question",
        "prompt": "Explain your reasoning for this synthetic fixture.", "promptEn": "Explain your reasoning for this synthetic fixture.",
        "reference": "A synthetic solution for a private fixture.", "referenceEn": "A synthetic solution for a private fixture.", "url": "",
    }
    if kind == "coding":
        question.update(id="two-sum", source="leetcode", prompt="", promptEn="", reference="", referenceEn="", url="https://leetcode.cn/problems/two-sum/", slug="two-sum", username="fixture-user", linkedAt="2026-09-01T12:00:00.000Z")
    return {
        "id": f"fixture-practice-{kind}", "kind": kind, "status": "completed" if completed else "active",
        "startedAt": "2026-09-13T12:00:00.000Z", "updatedAt": "2026-09-13T12:05:00.000Z", "completedAt": "2026-09-13T12:05:00.000Z" if completed else None,
        "question": question, "text": "My private fixture solution" if completed else "", "codeLanguage": "python", "selfAssessment": "independent" if completed else "",
        "elapsedSeconds": 300 if completed else 0, "timerStartedAt": None, "reviewed": False,
    }


def provenance_fixture():
    return {
        "version": 1, "originalNumber": "2.7", "chapter": "2. Probability", "section": "Conditional probability",
        "sourcePage": "19", "pdfPage": 23, "edition": "Synthetic fixture edition",
        "sourceHashSHA256": "a" * 64, "sourceUrl": "https://drive.google.com/file/d/fixture-source/view?ts=fixture",
        "answerStatus": "corrected", "sourceReference": "Original fixture answer.", "sourceReferenceEn": "Original fixture answer.",
        "reviewNotes": "The displayed fixture reasoning explains the correction.", "reviewNotesEn": "Fixture editorial note.",
    }


class PersonalPrepApiTests(unittest.TestCase):
    def test_health_identifies_tracker_sync_capability_without_authentication(self):
        status, health, _ = self.request("GET", "/api/health")
        self.assertEqual(status, 200, health)
        self.assertTrue(health["ok"])
        self.assertEqual(health["capabilities"]["careerTrackerSync"], 1)

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
            "QUANTGYM_REQUIRE_INVITE_CODE": "0",
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

    def grant_membership(self, user_id):
        with self.connect_database() as conn:
            conn.execute(self.sql("INSERT INTO memberships (email_norm, added_by, created_at, updated_at) SELECT email_norm, id, ?, ? FROM users WHERE id = ?"),
                         ("2026-09-20T12:00:00Z", "2026-09-20T12:00:00Z", user_id))

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

    def test_private_technical_source_requires_auth_and_stays_out_of_public_catalog(self):
        path = "/api/practice/technical/questions"
        for token in (None, "invalid-fixture-token"):
            status, data, headers = self.request("GET", path, token=token)
            self.assertEqual(status, 401, data)
            self.assertNotIn("questions", data)
            self.assert_private(headers)
        token, user_id = self.new_user()
        self.assertEqual(self.request("GET", path, token=token)[0], 403)
        self.grant_membership(user_id)
        status, data, headers = self.request("GET", path, token=token)
        self.assertEqual(status, 200, data)
        self.assert_private(headers)
        self.assertEqual(set(data), {"source", "questions", "readingList", "sourceMetadata"})
        self.assertEqual(data["source"], "question-bank")
        self.assertGreater(len(data["questions"]), 50)
        self.assertEqual(data["questions"], load_technical_questions())
        self.assertEqual(data["readingList"], load_technical_supplements()["readingList"])
        reading_rows = [question for group in data["readingList"] for question in group["questions"]]
        self.assertTrue(all(row["url"] == f"https://leetcode.cn/problems/{row['slug']}/" for row in reading_rows))
        self.assertTrue(all(not {"prompt", "answer", "reference", "sourceDifficulty"} & set(row) for row in reading_rows))
        self.assertEqual(data["sourceMetadata"], load_technical_supplements()["sourceMetadata"])
        if data["sourceMetadata"] is not None:
            self.assertIsInstance(data["sourceMetadata"]["pdfPageCount"], int)
            self.assertTrue(data["sourceMetadata"]["author"])
        self.assertTrue(all(row["id"] not in {entry["frontendId"] for entry in reading_rows} for row in data["questions"]))
        expected_fields = {"id", "title", "titleEn", "prompt", "promptEn", "reference", "referenceEn", "source", "sourceLabel"}
        self.assertTrue(all(expected_fields.issubset(question) and not set(question) - expected_fields - {"provenance"}
                            and question["source"] == "question-bank" for question in data["questions"]))
        public = self.request("GET", "/api/problems")[1]
        self.assertEqual(public.get("problems"), [])
        self.assertEqual(self.request("GET", token=token)[1]["data"], None)

    def test_private_reading_list_projects_links_only_and_rejects_invalid_source_metadata(self):
        row = {"frontendId": "32", "titleZh": "Fixture title", "slug": "longest-valid-parentheses", "sourcePage": "161", "pdfPage": 161,
               "url": "https://attacker.invalid/", "prompt": "Never project this field.", "sourceDifficulty": "Hard"}
        payload = {"groups": [{"id": "fixture", "label": "Fixture group", "questions": [row, row,
                   {**row, "frontendId": "42", "slug": "../../unsafe"}, {**row, "frontendId": "53", "pdfPage": True}]}],
                   "sourceMetadata": {"title": "Fixture book", "author": "Fixture author", "edition": "Fixture edition", "pdfPageCount": 162,
                                      "sourceUrl": "https://attacker.invalid/file/d/fixture/view"}}
        projected = normalize_technical_supplements(payload)
        self.assertIsNone(projected["sourceMetadata"])
        self.assertEqual(len(projected["readingList"]), 1)
        self.assertEqual(projected["readingList"][0]["questions"], [{
            "frontendId": "32", "titleZh": "Fixture title", "slug": "longest-valid-parentheses",
            "url": "https://leetcode.cn/problems/longest-valid-parentheses/", "sourcePage": "161", "pdfPage": 161,
        }])
        self.assertEqual(normalize_technical_supplements(None), {"readingList": [], "sourceMetadata": None})

    def test_technical_source_projection_rejects_other_sources_missing_answers_and_embedded_media(self):
        eligible = {"id": "fixture-purple-one", "source": "question-bank", "titleZh": "Fixture", "category": "statistics", "promptZh": "Show that $E[X] = 0$.", "explanation": "Use symmetry and linearity."}
        rows = [eligible, copy.deepcopy(eligible)]
        for index, patch in enumerate([
            {"source": "green-book"}, {"category": "leetcode"}, {"explanation": ""},
            {"promptZh": "![Diagram](secret.png)"}, {"explanation": "<script>alert(1)</script>"},
            {"promptZh": "Read \\includegraphics{diagram}"}, {"promptEn": "<img src=x>"},
        ]):
            rows.append({**eligible, "id": f"fixture-rejected-{index}", **patch})
        projected = normalize_technical_questions(rows)
        self.assertEqual(len(projected), 1)
        self.assertEqual(projected[0]["id"], eligible["id"])
        self.assertEqual(projected[0]["promptEn"], projected[0]["prompt"])
        self.assertEqual(len(normalize_technical_questions([{**eligible, "promptZh": "For $X<p$ and $Y>p$, compare the two expectations."}])), 1)

    def test_systematic_source_preserves_numbering_and_distinguishes_original_answer(self):
        row = {"id": "stable-legacy-id", "source": "question-bank", "category": "programming", "titleZh": "Synthetic programming question",
               "promptZh": "Explain this synthetic algorithm.", "explanation": "Reviewed fixture reasoning.", "provenance": provenance_fixture()}
        original = copy.deepcopy(row)
        projected = normalize_technical_questions([row])
        self.assertEqual(len(projected), 1)
        self.assertEqual(projected[0]["id"], "stable-legacy-id")
        self.assertEqual(projected[0]["reference"], "Reviewed fixture reasoning.")
        self.assertEqual(projected[0]["provenance"], row["provenance"])
        self.assertNotEqual(projected[0]["reference"], projected[0]["provenance"]["sourceReference"])
        self.assertEqual(row, original)
        # Older unverified archive rows keep their existing eligibility rules.
        row.pop("provenance")
        self.assertEqual(normalize_technical_questions([row]), [])

    def test_systematic_source_keeps_explicitly_missing_answers_without_inventing_text(self):
        row = {"id": "fixture-unanswered-exercise", "source": "question-bank", "category": "statistics",
               "promptZh": "Prove the synthetic exercise.", "provenance": {"version": 1, "answerStatus": "missing", "originalNumber": "练习 3.1"}}
        projected = normalize_technical_questions([row])
        self.assertEqual(len(projected), 1)
        self.assertEqual(projected[0]["reference"], "")
        self.assertEqual(projected[0]["referenceEn"], "")
        for status in ("source", "reviewed", "corrected", "supplemented"):
            self.assertEqual(normalize_technical_questions([{**row, "provenance": {"version": 1, "answerStatus": status}}]), [])
        self.assertEqual(normalize_technical_questions([{**row, "provenance": {"version": 1}}]), [])

    def test_systematic_source_rejects_invalid_metadata_and_unsafe_embedded_source_media(self):
        row = {"id": "fixture-question", "source": "question-bank", "promptZh": "A synthetic question.", "explanation": "A synthetic answer."}
        invalid = [None, [], {}, {"version": True}, {"version": 2}, {"version": 1, "unexpected": "text"},
                   {"version": 1, "pdfPage": 0}, {"version": 1, "sourcePage": 2}, {"version": 1, "sourceHashSHA256": "not-a-hash"},
                   {"version": 1, "answerStatus": []}, {"version": 1, "sourceReference": "![Diagram](private.png)"},
                   {"version": 1, "sourceUrl": "https://drive.google.com.attacker.invalid/file/d/fixture/view"}]
        for provenance in invalid:
            with self.subTest(provenance=provenance):
                self.assertEqual(normalize_technical_questions([{**row, "provenance": provenance}]), [])

    def test_practice_provenance_roundtrip_preserves_old_and_new_source_snapshots(self):
        token, _ = self.new_user()
        old = practice_session(completed=True)
        state = empty_state()
        state["practiceSessions"] = [old]
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        new = practice_session()
        new["id"] = "new-edition-practice"
        new["question"].update(provenance=provenance_fixture(), reference="New edition fixture reasoning.")
        state["practiceSessions"] = [old, new]
        status, saved, _ = self.put(token, state, saved["revision"])
        self.assertEqual(status, 200, saved)
        by_id = {row["id"]: row for row in saved["data"]["practiceSessions"]}
        self.assertEqual(by_id[old["id"]], old)
        self.assertEqual(by_id[new["id"]], new)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        # An older device without the new attempt cannot erase its metadata.
        stale = empty_state()
        stale["practiceSessions"] = [old]
        status, merged, _ = self.put(token, stale, saved["revision"])
        self.assertEqual(status, 200, merged)
        self.assertEqual({row["id"]: row for row in merged["data"]["practiceSessions"]}, by_id)

    def test_practice_missing_reference_is_allowed_only_for_explicit_missing_source_answer(self):
        token, _ = self.new_user()
        state = empty_state()
        session = practice_session()
        session["question"].update(reference="", referenceEn="")
        state["practiceSessions"] = [session]
        self.assertEqual(self.put(token, state)[0], 400)
        for status in ("source", "reviewed", "corrected", "supplemented"):
            session["question"]["provenance"] = {"version": 1, "answerStatus": status}
            self.assertEqual(self.put(token, state)[0], 400)
        session["question"]["provenance"] = {"version": 1, "answerStatus": "missing", "originalNumber": "练习 3.1"}
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["practiceSessions"], [session])

    def test_practice_provenance_validates_version_types_limits_and_source_links(self):
        token, _ = self.new_user()
        state = empty_state()
        state["practiceSessions"] = [practice_session()]
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        invalid = [None, [], {}, {"version": True}, {"version": 2}, {"version": 1, "unexpected": "field"},
                   {"version": 1, "pdfPage": True}, {"version": 1, "pdfPage": 0}, {"version": 1, "pdfPage": 1.5},
                   {"version": 1, "pdfPage": 100001}, {"version": 1, "sourcePage": 19},
                   {"version": 1, "originalNumber": "x" * 101}, {"version": 1, "chapter": "🌊" * 251},
                   {"version": 1, "reviewNotes": "x" * 80001}, {"version": 1, "sourceHashSHA256": "a" * 63},
                   {"version": 1, "sourceHashSHA256": "x" * 64}, {"version": 1, "answerStatus": []},
                   {"version": 1, "answerStatus": "authoritative"}]
        for source_url in ("javascript:alert(1)", "http://drive.google.com/file/d/fixture/view",
                           "https://attacker.invalid/file/d/fixture/view", "https://drive.google.com.attacker.invalid/file/d/fixture/view",
                           "https://user:pass@drive.google.com/file/d/fixture/view", "https://drive.google.com:444/file/d/fixture/view",
                           "https://drive.google.com/redirect?url=https://attacker.invalid", " https://drive.google.com/file/d/fixture/view"):
            invalid.append({"version": 1, "sourceUrl": source_url})
        for metadata in invalid:
            candidate = copy.deepcopy(state)
            candidate["practiceSessions"][0]["question"]["provenance"] = metadata
            self.assertEqual(self.put(token, candidate, saved["revision"])[0], 400)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        coding = empty_state()
        coding["practiceSessions"] = [practice_session("coding")]
        coding["practiceSessions"][0]["question"]["provenance"] = provenance_fixture()
        self.assertEqual(self.put(token, coding, saved["revision"])[0], 400)

    def test_standalone_practice_roundtrip_preserves_daily_history_and_records_only_completion(self):
        token, _ = self.new_user()
        state = empty_state()
        state["dailySessions"] = [{"id": "legacy-daily-history", "marker": "preserved"}]
        state["activities"] = [{"id": "legacy-daily-activity", "kind": "daily", "count": 1, "completedAt": "2026-09-12T12:00:00.000Z"}]
        state["practiceSessions"] = [practice_session("tech"), practice_session("coding")]
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"], state)
        completed = copy.deepcopy(state)
        completed["practiceSessions"] = [practice_session("tech", True), practice_session("coding", True)]
        status, saved, _ = self.put(token, completed, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["dailySessions"], state["dailySessions"])
        self.assertEqual(len(saved["data"]["activities"]), 3)
        standalone = [row for row in saved["data"]["activities"] if row.get("source") == "standalone"]
        self.assertEqual({row["id"] for row in standalone}, {"practice:fixture-practice-tech", "practice:fixture-practice-coding"})
        self.assertTrue(all(row["count"] == 1 and "sessionId" not in row and "dailySessionId" not in row for row in standalone))
        self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_old_client_cannot_erase_practice_sessions_or_their_calendar_activities(self):
        token, _ = self.new_user()
        state = empty_state()
        state["practiceSessions"] = [practice_session("tech", True), practice_session("coding")]
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        for omitted in (True, False):
            incoming = empty_state("old-client")
            if omitted:
                del incoming["practiceSessions"]
            status, saved, _ = self.put(token, incoming, saved["revision"])
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["practiceSessions"], state["practiceSessions"])
            self.assertEqual(len(saved["data"]["activities"]), 1)
            self.assertEqual(saved["data"]["activities"][0]["id"], "practice:fixture-practice-tech")

    def test_practice_merge_keeps_latest_draft_and_never_reopens_completed_work(self):
        token, _ = self.new_user()
        state = empty_state()
        state["practiceSessions"] = [practice_session()]
        state["practiceSessions"][0]["text"] = "latest draft"
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        stale = copy.deepcopy(state)
        stale["practiceSessions"][0].update(text="old draft", updatedAt="2026-09-13T12:01:00.000Z")
        status, saved, _ = self.put(token, stale, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["practiceSessions"][0]["text"], "latest draft")
        completed = copy.deepcopy(state)
        completed["practiceSessions"] = [practice_session(completed=True)]
        status, saved, _ = self.put(token, completed, saved["revision"])
        self.assertEqual(status, 200, saved)
        stale["practiceSessions"][0]["updatedAt"] = "2026-09-13T13:00:00.000Z"
        status, saved, _ = self.put(token, stale, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["practiceSessions"][0], completed["practiceSessions"][0])

    def test_old_client_cannot_revive_removed_practice_calendar_activity(self):
        token, _ = self.new_user()
        state = empty_state()
        state["practiceSessions"] = [practice_session("tech", True), practice_session("coding", True)]
        status, original, _ = self.put(token, state)
        self.assertEqual(status, 200, original)
        removed = "practice:fixture-practice-tech"
        changed = copy.deepcopy(original["data"])
        changed["removedActivityIds"] = [removed]
        changed["activities"] = [activity for activity in changed["activities"] if activity["id"] != removed]
        status, saved, _ = self.put(token, changed, original["revision"])
        self.assertEqual(status, 200, saved)
        for omitted in (True, False):
            # An old snapshot still carries the deleted activity and lacks
            # practice sessions and either the marker field or its contents.
            incoming = copy.deepcopy(original["data"])
            del incoming["practiceSessions"]
            if omitted:
                del incoming["removedActivityIds"]
            status, saved, _ = self.put(token, incoming, saved["revision"])
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["removedActivityIds"], [removed])
            self.assertEqual(saved["data"]["practiceSessions"], state["practiceSessions"])
            self.assertEqual([activity["id"] for activity in saved["data"]["activities"]], ["practice:fixture-practice-coding"])
            self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_practice_identity_conflict_rejects_whole_snapshot(self):
        token, _ = self.new_user()
        original = empty_state()
        original["practiceSessions"] = [practice_session("coding")]
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        for key, value in (("id", "different-question"), ("username", "other-account"), ("linkedAt", "2026-09-02T12:00:00.000Z")):
            changed = copy.deepcopy(original)
            changed["practiceSessions"][0]["question"][key] = value
            changed["practiceSessions"][0]["updatedAt"] = "2026-09-13T14:00:00.000Z"
            status, _, _ = self.put(token, changed, saved["revision"])
            self.assertEqual(status, 400, key)
            self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_practice_validation_and_account_isolation(self):
        token, _ = self.new_user()
        other, _ = self.new_user()
        original = empty_state()
        original["practiceSessions"] = [practice_session()]
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        self.assertIsNone(self.request("GET", token=other)[1]["data"])
        patches = [{"kind": "daily"}, {"kind": []}, {"status": []}, {"codeLanguage": []}, {"selfAssessment": []}, {"elapsedSeconds": -1}, {"elapsedSeconds": True}, {"elapsedSeconds": 10 ** 1000}, {"text": "x" * 80001}, {"text": "🌊" * 40001}, {"timerStartedAt": "invalid"}, {"status": "completed"}, {"completedAt": "2026-09-13T12:05:00.000Z"}]
        for patch in patches:
            changed = copy.deepcopy(original)
            changed["practiceSessions"][0].update(patch)
            status, _, _ = self.put(token, changed, saved["revision"])
            self.assertEqual(status, 400, str(list(patch)))
        bad_link = empty_state()
        bad_link["practiceSessions"] = [practice_session("coding")]
        bad_link["practiceSessions"][0]["question"]["url"] = "https://attacker.invalid/problems/two-sum/"
        self.assertEqual(self.put(token, bad_link, saved["revision"])[0], 400)
        self.assertEqual(self.request("GET", token=token)[1], saved)

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

    def test_explicit_completions_roundtrip_on_existing_activity_contract(self):
        token, _ = self.new_user()
        state = empty_state()
        state["activities"] = [
            {"id": "behavioral:explicit:general-introduction:2026-09-19", "kind": "behavioral", "source": "explicit", "sourceId": "general-introduction", "questionId": "general-introduction", "count": 1, "completedAt": "2026-09-19T12:00:00.000Z", "dateKey": "2026-09-19"},
            {"id": "experience-read:fixture-experience", "kind": "experience-read", "source": "explicit", "sourceId": "fixture-experience", "count": 1, "completedAt": "2026-09-19T12:00:00.000Z", "dateKey": "2026-09-19"},
        ]
        status, saved, headers = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assert_private(headers)
        self.assertEqual(self.request("GET", token=token)[1]["data"]["activities"], state["activities"])
        status, retried, _ = self.put(token, state, saved["revision"])
        self.assertEqual(status, 200, retried)
        self.assertEqual(retried["data"]["activities"], state["activities"],
                         "The server must preserve the frontend's mixed explicit-event order to avoid perpetual sync writes")
        other, _ = self.new_user()
        self.assertIsNone(self.request("GET", token=other)[1]["data"])

    def test_independent_behavioral_edits_keep_legacy_events_and_survive_retries_and_old_snapshots(self):
        token, _ = self.new_user()
        question = "behavioral:team / 中文"
        encoded_question = "behavioral%3Ateam%20%2F%20%E4%B8%AD%E6%96%87"
        legacy = {"id": f"behavioral:explicit:{encoded_question}:2026-09-18", "kind": "behavioral",
                  "source": "explicit", "sourceId": question, "questionId": question, "count": 1,
                  "completedAt": "2026-09-18T12:00:00.000Z", "dateKey": "2026-09-18"}
        first = {**legacy, "id": f"behavioral:edit:{encoded_question}:11111111-1111-4111-8111-111111111111",
                 "source": "answer-edit", "completedAt": "2026-09-19T12:00:00.000Z", "dateKey": "2026-09-19"}
        second = {**first, "id": f"behavioral:edit:{encoded_question}:22222222-2222-4222-8222-222222222222",
                  "completedAt": "2026-09-19T13:00:00.000Z"}
        state = empty_state()
        state["activities"] = [legacy, first, second]
        state["behavioralAnswers"] = [{"id": question, "text": "Most recently saved answer", "updatedAt": second["completedAt"]}]
        status, saved, headers = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assert_private(headers)
        self.assertEqual(saved["data"]["activities"], state["activities"])
        self.assertTrue(all(set(row) == set(first) for row in saved["data"]["activities"]))

        # A lost acknowledgement followed by an identical stale PUT must not
        # append another completion; the conflict carries the committed data.
        status, conflict, _ = self.put(token, state, 0)
        self.assertEqual(status, 409, conflict)
        self.assertEqual(conflict["data"], saved["data"])
        retried = copy.deepcopy(state)
        retried["activities"] = [{**first, "completedAt": "2026-09-19T14:00:00.000Z"}]
        status, saved, _ = self.put(token, retried, conflict["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual({row["id"]: row for row in saved["data"]["activities"]},
                         {row["id"]: row for row in state["activities"]})

        # Older clients can know the newest revision but still omit these new
        # activity IDs. The server, not another online device, retains them.
        older = empty_state()
        del older["behavioralAnswers"]
        status, saved, _ = self.put(token, older, saved["revision"])
        self.assertEqual(status, 200, saved)
        read = self.request("GET", token=token)[1]
        self.assertEqual({row["id"]: row for row in read["data"]["activities"]},
                         {row["id"]: row for row in state["activities"]})
        self.assertEqual(read["data"]["behavioralAnswers"], state["behavioralAnswers"])
        other, _ = self.new_user()
        self.assertIsNone(self.request("GET", token=other)[1]["data"])
        other_state = empty_state()
        other_state["activities"] = [{**first, "completedAt": "2026-09-19T15:00:00.000Z"}]
        self.assertEqual(self.put(other, other_state)[0], 200)
        self.assertEqual(self.request("GET", token=other)[1]["data"]["activities"], other_state["activities"])
        self.assertEqual(self.request("GET", token=token)[1], read)

    def test_behavioral_edit_and_legacy_tombstones_survive_stale_uploads_without_suppressing_later_edits(self):
        token, _ = self.new_user()
        first = {"id": "behavioral:edit:behavioral-fixture:33333333-3333-4333-8333-333333333333",
                 "kind": "behavioral", "source": "answer-edit", "sourceId": "behavioral-fixture",
                 "questionId": "behavioral-fixture", "count": 1, "completedAt": "2026-09-19T12:00:00.000Z", "dateKey": "2026-09-19"}
        second = {**first, "id": "behavioral:edit:behavioral-fixture:44444444-4444-4444-8444-444444444444",
                  "completedAt": "2026-09-19T13:00:00.000Z"}
        legacy = {**first, "id": "behavioral:explicit:behavioral-fixture:2026-09-18",
                  "source": "explicit", "completedAt": "2026-09-18T12:00:00.000Z", "dateKey": "2026-09-18"}
        original = {**empty_state(), "activities": [legacy, first, second]}
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        removed = {**empty_state(), "activities": [second], "removedActivityIds": [first["id"], legacy["id"]]}
        status, saved, _ = self.put(token, removed, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["activities"], [second])
        for stale in (original, {**original, "removedActivityIds": []}):
            status, saved, _ = self.put(token, stale, saved["revision"])
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["activities"], [second])
            self.assertEqual(set(saved["data"]["removedActivityIds"]), set(removed["removedActivityIds"]))
        third = {**first, "id": "behavioral:edit:behavioral-fixture:55555555-5555-4555-8555-555555555555",
                 "completedAt": "2026-09-19T14:00:00.000Z"}
        status, saved, _ = self.put(token, {**empty_state(), "activities": [third]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual({row["id"] for row in saved["data"]["activities"]}, {second["id"], third["id"]})

    def test_behavioral_edit_source_aliases_preserve_one_event_and_the_earliest_date(self):
        token, _ = self.new_user()
        prior = {"id": "behavioral:edit:behavioral-fixture:66666666-6666-4666-8666-666666666666",
                 "kind": "behavioral", "source": "explicit", "sourceId": "behavioral-fixture",
                 "questionId": "behavioral-fixture", "count": 1, "completedAt": "2026-09-19T12:00:00.000Z", "dateKey": "2026-09-19"}
        status, saved, _ = self.put(token, {**empty_state(), "activities": [prior]})
        self.assertEqual(status, 200, saved)
        current = {**prior, "source": "answer-edit", "completedAt": "2026-09-19T13:00:00.000Z"}
        status, saved, _ = self.put(token, {**empty_state(), "activities": [current]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["activities"], [prior])
        status, saved, _ = self.put(token, empty_state(), saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["activities"], [prior], "Compatibility edit IDs remain durable across old clients")

    def test_behavioral_answers_round_trip_legacy_writes_and_explicit_clear(self):
        token, _ = self.new_user()
        state = empty_state()
        answer = {"id": "bofa-why", "text": "My answer with a real project example.", "updatedAt": "2026-09-19T12:00:00.000Z"}
        state["behavioralAnswers"] = [answer]
        status, saved, headers = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assert_private(headers)
        self.assertEqual(self.request("GET", token=token)[1]["data"]["behavioralAnswers"], [answer])
        legacy = empty_state()
        del legacy["behavioralAnswers"]
        status, saved, _ = self.put(token, legacy, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["behavioralAnswers"], [answer])
        cleared = {**answer, "text": "", "updatedAt": "2026-09-19T13:00:00.000Z"}
        state["behavioralAnswers"] = [cleared]
        status, saved, _ = self.put(token, state, saved["revision"])
        self.assertEqual(status, 200, saved)
        state["behavioralAnswers"] = [answer]
        status, saved, _ = self.put(token, state, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["behavioralAnswers"], [cleared])
        other_token, _ = self.new_user()
        self.assertIsNone(self.request("GET", token=other_token)[1]["data"])

    def test_invalid_behavioral_answers_never_replace_a_saved_draft(self):
        token, _ = self.new_user()
        answer = {"id": "bofa-why", "text": "Saved draft", "updatedAt": "2026-09-19T12:00:00.000Z"}
        state = {**empty_state(), "behavioralAnswers": [answer]}
        _, saved, _ = self.put(token, state)
        for invalid in [None, {}, [{**answer, "text": 42}], [{**answer, "text": "x" * 20001}], [{**answer, "updatedAt": "invalid"}], [answer, answer]]:
            with self.subTest(invalid=type(invalid).__name__):
                self.assertEqual(self.put(token, {**state, "behavioralAnswers": invalid}, saved["revision"])[0], 400)
                self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_private_behavioral_questions_and_answers_round_trip_without_cross_account_or_public_leaks(self):
        token, owner = self.new_user()
        other_token, other_owner = self.new_user()
        question = behavioral_question(title="PRIVATE-BEHAVIORAL-TITLE-ONE\nMy own interview prompt")
        answer = {"id": question["id"], "text": "PRIVATE-BEHAVIORAL-ANSWER-ONE", "updatedAt": question["updatedAt"]}
        original = {**empty_state(), "behavioralQuestions": [question], "behavioralAnswers": [answer]}
        status, saved, headers = self.put(token, original)
        self.assertEqual(status, 200, saved)
        self.assert_private(headers)
        self.assertEqual(saved["data"], original)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        self.assertIsNone(self.request("GET", token=other_token)[1]["data"], "A fresh account must receive no default or other owner's Behavioral questions")
        other_question = {**question, "title": "PRIVATE-BEHAVIORAL-TITLE-TWO"}
        other_answer = {**answer, "text": "PRIVATE-BEHAVIORAL-ANSWER-TWO"}
        other_state = {**empty_state(), "behavioralQuestions": [other_question], "behavioralAnswers": [other_answer]}
        self.assertEqual(self.put(other_token, other_state)[0], 200)
        self.assertEqual(self.request("GET", f"/api/personal-prep?userId={other_owner}", token=token)[1], saved)
        self.assertEqual(self.request("GET", f"/api/personal-prep?ownerId={owner}", token=other_token)[1]["data"], other_state)
        with self.connect_database() as conn:
            stored = conn.execute(self.sql("SELECT data_json FROM user_personal_prep WHERE user_id = ?"), (owner,)).fetchone()[0]
            self.assertEqual(json.loads(stored) if isinstance(stored, str) else stored, original)
        for path in ("/api/community", "/api/leaderboard", "/api/problems", "/api/state"):
            status, response, _ = self.request("GET", path, token=other_token if path == "/api/state" else None)
            self.assertEqual(status, 200, (path, response))
            public = json.dumps(response)
            for private_text in (question["title"].splitlines()[0], answer["text"], other_question["title"], other_answer["text"]):
                self.assertNotIn(private_text, public)
        for field in ("userId", "ownerId", "user_id"):
            self.assertEqual(self.put(token, other_state, saved["revision"], **{field: other_owner})[0], 400)
        self.assertEqual(self.request("GET", token=token)[1], saved)

    def test_old_clients_cannot_erase_private_behavioral_questions_or_answers(self):
        token, _ = self.new_user()
        question = behavioral_question()
        answer = {"id": question["id"], "text": "Keep my existing answer", "updatedAt": question["updatedAt"]}
        state = {**empty_state(), "behavioralQuestions": [question], "behavioralAnswers": [answer]}
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        for omitted in (True, False):
            legacy = empty_state("other state can still change")
            if omitted:
                del legacy["behavioralQuestions"]
                del legacy["behavioralAnswers"]
            status, saved, _ = self.put(token, legacy, saved["revision"])
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["behavioralQuestions"], [question])
            self.assertEqual(saved["data"]["behavioralAnswers"], [answer])
        # Changing an answer does not require a title rewrite; changing a title
        # does not erase its separately versioned answer.
        latest_answer = {**answer, "text": "My revised answer", "updatedAt": "2026-09-20T13:00:00.000Z"}
        status, saved, _ = self.put(token, {**empty_state(), "behavioralAnswers": [latest_answer]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        renamed = {**question, "title": "My revised prompt", "updatedAt": "2026-09-20T14:00:00.000Z"}
        status, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [renamed]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["behavioralQuestions"], [renamed])
        self.assertEqual(saved["data"]["behavioralAnswers"], [latest_answer])

    def test_behavioral_question_merge_is_deterministic_across_write_order_and_conflict_retries(self):
        first = behavioral_question(title="\U0001f600")
        second = {**first, "title": "\uffff"}
        # UTF-16 ordering selects U+FFFF above the astral character, matching
        # JavaScript rather than Python's Unicode code-point ordering.
        for candidates in ((first, second), (second, first)):
            token, _ = self.new_user()
            revision = 0
            for candidate in candidates:
                status, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [candidate]}, revision)
                self.assertEqual(status, 200, saved)
                revision = saved["revision"]
            self.assertEqual(saved["data"]["behavioralQuestions"], [second])
            latest = {**first, "title": "A later timestamp wins", "updatedAt": "2026-09-20T09:00:00.000-04:00"}
            status, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [latest]}, revision)
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["behavioralQuestions"], [latest])
        token, _ = self.new_user()
        barrier = threading.Barrier(2)
        def write(candidate):
            barrier.wait(timeout=5)
            return self.put(token, {**empty_state(), "behavioralQuestions": [candidate]})
        with ThreadPoolExecutor(max_workers=2) as workers:
            responses = list(workers.map(write, (first, second)))
        self.assertEqual(sorted(status for status, _, _ in responses), [200, 409])
        for candidate, (status, conflict, _) in zip((first, second), responses):
            if status == 409:
                self.assertEqual(self.put(token, {**empty_state(), "behavioralQuestions": [candidate]}, conflict["revision"])[0], 200)
        self.assertEqual(self.request("GET", token=token)[1]["data"]["behavioralQuestions"], [second])

    def test_behavioral_question_deletion_survives_newer_stale_edits_and_legacy_snapshots(self):
        token, _ = self.new_user()
        active = behavioral_question()
        deleted = {**active, "deletedAt": "2026-09-20T13:00:00.000Z", "updatedAt": "2026-09-20T13:00:00.000Z"}
        later_stale = {**active, "title": "Edited offline after deletion", "updatedAt": "2026-09-21T12:00:00.000Z"}
        answer = {"id": active["id"], "text": "Keep this private historical answer", "updatedAt": active["updatedAt"]}
        _, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [active], "behavioralAnswers": [answer]})
        for candidate in (deleted, later_stale, active):
            status, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [candidate]}, saved["revision"])
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["data"]["behavioralQuestions"], [deleted])
            self.assertEqual(saved["data"]["behavioralAnswers"], [answer])
        legacy = empty_state()
        del legacy["behavioralQuestions"]
        status, saved, _ = self.put(token, legacy, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["behavioralQuestions"], [deleted])
        replacement = behavioral_question("new-question-id", active["title"])
        status, saved, _ = self.put(token, {**empty_state(), "behavioralQuestions": [replacement]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual({question["id"]: question for question in saved["data"]["behavioralQuestions"]}, {deleted["id"]: deleted, replacement["id"]: replacement})
        # Reverse arrival order must converge to the same deletion.
        other, _ = self.new_user()
        _, other_saved, _ = self.put(other, {**empty_state(), "behavioralQuestions": [later_stale]})
        _, other_saved, _ = self.put(other, {**empty_state(), "behavioralQuestions": [deleted]}, other_saved["revision"])
        self.assertEqual(other_saved["data"]["behavioralQuestions"], [deleted])

    def test_invalid_private_behavioral_questions_never_partially_replace_saved_data(self):
        token, other_owner = self.new_user()
        question = behavioral_question()
        state = {**empty_state(), "behavioralQuestions": [question]}
        _, saved, _ = self.put(token, state)
        invalid = [None, {}, [question, question], [None],
                   [{field: value for field, value in question.items() if field != "deletedAt"}],
                   [behavioral_question(str(index)) for index in range(10001)]]
        for patch in (
            {"id": ""}, {"id": " "}, {"id": " padded "}, {"id": "x" * 201}, {"id": "🌊" * 101}, {"id": 42},
            {"title": "\n\t"}, {"title": None}, {"title": "x" * 4001}, {"title": "🌊" * 2001},
            {"ownerId": other_owner}, {"userId": other_owner}, {"answer": "nested answers are invalid"},
            {"createdAt": None}, {"updatedAt": "2026-09-19T12:00:00.000Z"},
            {"deletedAt": "2026-09-19T12:00:00.000Z"}, {"deletedAt": "2026-09-21T12:00:00.000Z"},
        ):
            invalid.append([{**question, **patch}])
        for invalid_date in ("not-a-date", "2026-02-30T12:00:00.000Z", "0000-01-01T12:00:00.000Z",
                             "2026-09-20T24:00:00.000Z", "2026-09-20T12:00:60.000Z", "2026-09-20T12:00:00",
                             "2026-09-20T12:00:00.000+03:99", "2026-09-20T12:00:00.000+24:00",
                             "2026-09-20T12:00:00.1234567Z"):
            invalid.append([{**question, "updatedAt": invalid_date}])
        for index, questions in enumerate(invalid):
            with self.subTest(case=index):
                self.assertEqual(self.put(token, {**state, "dailySettings": {"marker": "must-not-save"}, "behavioralQuestions": questions}, saved["revision"])[0], 400)
                self.assertEqual(self.request("GET", token=token)[1], saved)
        boundary = behavioral_question("x" * 200, "🌊" * 2000)
        status, updated, _ = self.put(token, {**empty_state(), "behavioralQuestions": [boundary]}, saved["revision"])
        self.assertEqual(status, 200, updated)
        self.assertIn(boundary, updated["data"]["behavioralQuestions"])

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

    def test_tracker_operations_round_trip_retain_old_client_data_and_isolate_accounts(self):
        token, _ = self.new_user()
        other, _ = self.new_user()
        original = {**empty_state(), "careerTrackerOperations": tracker_operations()}
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"], original)
        self.assertIsNone(self.request("GET", token=other)[1]["data"])
        for omit in (True, False):
            legacy = empty_state("old client can still save practice")
            if omit:
                del legacy["careerTrackerOperations"]
            status, updated, _ = self.put(token, legacy, saved["revision"])
            self.assertEqual(status, 200, updated)
            self.assertEqual(updated["data"]["careerTrackerOperations"], original["careerTrackerOperations"])
            self.assertEqual(updated["data"]["dailySettings"], legacy["dailySettings"])
            saved = updated
        remote_edit = {"id": "tracker-phone", "clock": 6, "kind": "event", "applicationId": "application-one", "eventId": "event-oa", "fields": {"dueTime": "18:00"}}
        status, saved, _ = self.put(token, {**empty_state(), "careerTrackerOperations": [remote_edit]}, saved["revision"])
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"]["careerTrackerOperations"], [*original["careerTrackerOperations"], remote_edit])
        self.assertEqual(self.request("GET", token=token)[1], saved)
        for path in ("/api/community", "/api/leaderboard", "/api/state"):
            status, public, _ = self.request("GET", path, token=other if path == "/api/state" else None)
            self.assertEqual(status, 200, public)
            self.assertNotIn("Private Tracker company", json.dumps(public))

    def test_tracker_operation_identity_conflict_cannot_partially_save(self):
        token, _ = self.new_user()
        original = {**empty_state(), "careerTrackerOperations": tracker_operations()}
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        changed = copy.deepcopy(original)
        changed["careerTrackerOperations"][1]["fields"]["company"] = "must not overwrite"
        changed["dailySettings"] = {"marker": "must not save"}
        status, rejected, _ = self.put(token, changed, saved["revision"])
        self.assertEqual(status, 400, rejected)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        duplicate = copy.deepcopy(original)
        duplicate["careerTrackerOperations"].append(copy.deepcopy(duplicate["careerTrackerOperations"][1]))
        status, accepted, _ = self.put(token, duplicate, saved["revision"])
        self.assertEqual(status, 200, accepted)
        self.assertEqual(accepted["data"], original)

    def test_real_javascript_migration_edit_delete_and_restore_operations_round_trip(self):
        fixture = json.loads((ROOT / "scripts/fixtures/tracker-operations-v1.json").read_text(encoding="utf-8"))
        operations = fixture["operations"]
        self.assertEqual({operation["kind"] for operation in operations}, {"application", "event", "stage", "delete", "restore"})
        token, _ = self.new_user()
        state = {**empty_state(), "careerTrackerOperations": operations}
        status, saved, _ = self.put(token, state)
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["data"], state)
        self.assertEqual(self.request("GET", token=token)[1], saved)
        reversed_state = {**empty_state(), "careerTrackerOperations": list(reversed(operations))}
        status, updated, _ = self.put(token, reversed_state, saved["revision"])
        self.assertEqual(status, 200, updated)
        self.assertEqual(updated["data"], state)

    def test_tracker_operations_reject_malformed_and_owner_injected_records(self):
        token, _ = self.new_user()
        original = {**empty_state(), "careerTrackerOperations": tracker_operations()}
        status, saved, _ = self.put(token, original)
        self.assertEqual(status, 200, saved)
        malformed = []
        for changes in ({"clock": True}, {"clock": -1}, {"clock": 9_007_199_254_740_992}, {"kind": "unknown"}, {"ownerId": "someone-else"}, {"id": "x" * 201}, {"stageId": ""}, {"fields": {"label": " "}}, {"fields": {"label": "😀" * 21}}, {"aliases": ["stage-one"]}, {"fields": {"recordedDate": "2026-02-30"}}):
            malformed.append({**tracker_operations()[0], **changes})
        for changes in ({"fields": {"type": "constructor"}}, {"fields": {"date": "2/30"}}, {"fields": {"year": True}}, {"fields": {"dueTime": "24:00"}}, {"order": ["other-event"]}, {"fields": {"company": "not an event field"}}):
            malformed.append({**tracker_operations()[3], **changes})
        malformed.append({**tracker_operations()[4], "event": {**tracker_operations()[4]["event"], "type": "submitted"}})
        malformed.append({**tracker_operations()[4], "order": ["event-oa", "event-submitted"]})
        malformed.append({**tracker_operations()[5], "fields": {}})
        for operation in malformed:
            with self.subTest(operation=operation):
                invalid = {**empty_state(), "careerTrackerOperations": [operation]}
                status, rejected, _ = self.put(token, invalid, saved["revision"])
                self.assertEqual(status, 400, rejected)
                self.assertEqual(self.request("GET", token=token)[1], saved)

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
