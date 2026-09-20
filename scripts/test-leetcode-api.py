#!/usr/bin/env python3
"""Real HTTP/account-isolation tests with deterministic upstream fixtures.

Use --postgres with psycopg and local initdb/pg_ctl to run the same cases on a
fresh disposable database. No account credentials or live LeetCode data are used.
"""
import copy
import http.client
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from uuid import uuid4
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")
sys.path.insert(0, str(ROOT / "api-server"))
import leetcode_sync as lc


def upstream(username="fixture-a"):
    return {"username": username, "displayName": "Fixture profile", "stats": {"solved": 2, "totalSubmissions": 9, "easy": 1, "medium": 1, "hard": 0}, "submissions": [record("101", "two-sum"), record("102", "two-sum"), record("103", "valid-parentheses", when="2026-09-09T00:15:00Z")], "calendar": [{"date": "2026-09-08", "submissions": 6}, {"date": "2026-09-09", "submissions": 3}], "calendarYear": 2026}


def record(identity, slug, status="AC", when="2026-09-08T23:45:00Z"):
    return lc.submission({"id": identity, "problemSlug": slug, "title": slug, "titleEn": "", "frontendId": "1", "difficulty": None, "submittedAt": when, "status": status})


def full_history(records=None, captured_at="2026-09-10T12:00:00Z"):
    records = records if records is not None else [*upstream()["submissions"], record("history-1", "binary-search", when="2026-08-01T09:00:00Z")]
    return {"username": "fixture-a", "submissions": records,
            "problems": [{"slug": slug} for slug in sorted({row["problemSlug"] for row in records})],
            "capturedAt": captured_at, "coverage": {"problemsComplete": True, "submissionsComplete": True,
            "complete": True, "skippedRecords": 0, "reason": ""}}


class LeetCodeApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="quantgym-leetcode-test-", dir="/tmp")
        cls.directory = Path(cls.temp.name)
        cls.pg_started = False
        cls.environment = patch.dict(os.environ, {
            "QUANTGYM_DB": str(cls.directory / "test.sqlite3"), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_POSTGRES_DATABASE_URL": "", "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(cls.directory / "empty.json"),
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"), "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "", "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
            "QUANTGYM_ALERT_WEBHOOK_URL": "",
        })
        cls.environment.start()
        (cls.directory / "empty.json").write_text('{"problems":[]}')
        if USE_POSTGRES:
            cls.start_postgres()
        spec = importlib.util.spec_from_file_location("leetcode_test_server", ROOT / "api-server/server.py")
        cls.api = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.api)
        class QuietHandler(cls.api.QuantGymHandler):
            def log_message(self, *args):
                if args and "Unhandled" in str(args[0]):
                    print(args, file=sys.stderr)
        cls.server = cls.api.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.user_count = 0

    @classmethod
    def start_postgres(cls):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        pg_bin = Path(os.environ.get("QUANTGYM_TEST_POSTGRES_BIN", "/opt/homebrew/bin"))
        cls.pg_ctl = shutil.which("pg_ctl") or str(pg_bin / "pg_ctl")
        initdb = shutil.which("initdb") or str(pg_bin / "initdb")
        cls.pg_data = cls.directory / "postgres"
        subprocess.run([initdb, "-D", str(cls.pg_data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, stdout=subprocess.DEVNULL)
        subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-l", str(cls.directory / "postgres.log"), "-w", "-o", f"-h 127.0.0.1 -p {port} -k {cls.directory}", "start"], check=True, stdout=subprocess.DEVNULL)
        cls.pg_started = True
        os.environ["QUANTGYM_DB_BACKEND"] = "postgres"
        os.environ["QUANTGYM_POSTGRES_DATABASE_URL"] = f"postgresql://fixture_admin@127.0.0.1:{port}/postgres"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)
        if cls.pg_started:
            subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=subprocess.DEVNULL)
        cls.environment.stop()
        cls.temp.cleanup()

    def setUp(self):
        self.api.rate_limiter._hits.clear()
        self.fetch = patch.object(lc, "fetch_profile", side_effect=lambda username: upstream(username))
        self.mock_fetch = self.fetch.start()
        self.addCleanup(self.fetch.stop)

    def request(self, method, path="/api/leetcode", token=None, payload=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            connection.request(method, path, body=json.dumps(payload).encode() if payload is not None else None, headers=headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read()), dict(response.getheaders())
        finally:
            connection.close()

    def user(self):
        type(self).user_count += 1
        identity = f"lc-fixture-{self.user_count}"
        status, data, _ = self.request("POST", "/api/auth/register", payload={"password": "fixture-only-password", "account": {"id": identity, "provider": "local", "email": f"{identity}@example.com", "name": identity}})
        self.assertEqual(status, 201, data)
        return data["token"], data["account"]["id"]

    def connect(self, token, username="fixture-a"):
        return self.request("POST", "/api/leetcode/connect", token, {"profileUrl": f"https://leetcode.cn/u/{username}/"})

    def review_payload(self, snapshot, slug="two-sum", rating="good"):
        problem = next(row for row in snapshot["problems"] if row["slug"] == slug)
        return {"username": snapshot["connection"]["username"], "linkedAt": snapshot["connection"]["linkedAt"],
                "problemSlug": slug, "rating": rating, "eventId": str(uuid4()), "expectedVersion": problem["review"]["version"]}

    def assert_snapshot_equal(self, left, right):
        left, right = copy.deepcopy(left), copy.deepcopy(right)
        for snapshot in (left, right):
            snapshot.get("reviewPolicy", {}).pop("generatedAt", None)
        self.assertEqual(left, right)

    def test_authentication_required_and_responses_are_private(self):
        for method, path in (("GET", "/api/leetcode"), ("DELETE", "/api/leetcode"), ("POST", "/api/leetcode/connect"), ("POST", "/api/leetcode/sync"), ("POST", "/api/leetcode/import"), ("POST", "/api/leetcode/review")):
            status, body, headers = self.request(method, path)
            self.assertEqual(status, 401, body)
            self.assertIn("private", headers.get("Cache-Control", ""))
            self.assertIn("no-store", headers.get("Cache-Control", ""))
        self.mock_fetch.assert_not_called()

    def test_account_isolation_disconnect_and_no_internal_fields(self):
        token_a, _ = self.user()
        token_b, _ = self.user()
        self.assertIsNone(self.request("GET", token=token_b)[1]["connection"])
        status, data, _ = self.connect(token_a)
        self.assertEqual(status, 200, data)
        self.assertEqual(data["stats"]["totalSubmissions"], 9)
        self.assertEqual(len(data["submissions"]), 3)
        self.assertEqual(len(data["problems"]), 2)
        self.assertFalse(any(key.startswith("_") for key in data))
        self.assertIsNone(self.request("GET", token=token_b)[1]["connection"])
        status, data, _ = self.request("DELETE", token=token_a)
        self.assertEqual(status, 200, data)
        self.assertEqual(data["problems"], [])
        self.assertIsNone(self.request("GET", token=token_a)[1]["connection"])

    def test_cache_preserves_data_and_dedupes_on_later_sync(self):
        token, owner = self.user()
        self.connect(token)
        for _ in range(2):
            self.assertEqual(self.request("POST", "/api/leetcode/sync", token, {})[0], 200)
            self.request("GET", token=token)
        self.assertEqual(self.mock_fetch.call_count, 1)
        self.age_snapshot(owner)
        status, data, _ = self.request("POST", "/api/leetcode/sync", token, {})
        self.assertEqual(status, 200, data)
        self.assertEqual(self.mock_fetch.call_count, 2)
        self.assertEqual(len(data["submissions"]), 3)
        self.assertEqual(len(data["problems"]), 2)

    def age_snapshot(self, owner):
        with self.api.db.connect() as conn:
            revision, data = lc.get_record(conn, owner)
            data["connection"]["lastSyncedAt"] = "2020-01-01T00:00:00Z"
            lc.save_snapshot(conn, owner, revision, data)

    def test_upstream_failure_does_not_replace_existing_connection(self):
        token, owner = self.user()
        self.connect(token)
        self.age_snapshot(owner)
        saved = self.request("GET", token=token)[1]
        self.mock_fetch.side_effect = lc.LeetCodeError("Temporary upstream failure", 502)
        for path, body in (("/api/leetcode/sync", {}), ("/api/leetcode/connect", {"username": "different-user"})):
            status, _, _ = self.request("POST", path, token, body)
            self.assertEqual(status, 502)
            self.assert_snapshot_equal(self.request("GET", token=token)[1], saved)

    def test_credentials_urls_and_owner_injection_rejected_without_fetch(self):
        token, _ = self.user()
        for payload in ({"username": "valid", "cookie": "secret"}, {"username": "valid", "userId": "other"}, {"profileUrl": "http://localhost/u/test/"}, {"profileUrl": "https://leetcode.cn.evil.test/u/test/"}, {"profileUrl": "https://leetcode.cn@evil.test/u/test/"}, {"profileUrl": "https://leetcode.cn:443/u/test/"}):
            status, body, _ = self.request("POST", "/api/leetcode/connect", token, payload)
            self.assertEqual(status, 400, body)
        self.mock_fetch.assert_not_called()

    def test_import_all_statuses_distinct_pool_and_problem_only_metadata(self):
        token, _ = self.user()
        self.connect(token)
        payload = {"username": "fixture-a", "submissions": [record("103", "valid-parentheses", when="2026-09-09T00:15:00Z"), record("104", "three-sum", "WA"), record("105", "three-sum", "AC")], "problems": [{"slug": "binary-search", "title": "二分查找", "difficulty": "easy"}]}
        for _ in range(2):
            status, data, _ = self.request("POST", "/api/leetcode/import", token, payload)
            self.assertEqual(status, 200, data)
            self.assertEqual(data["stats"]["solved"], 2)
            self.assertEqual(data["stats"]["totalSubmissions"], 9)
            self.assertEqual(len(data["submissions"]), 4)
            self.assertEqual(len(data["problems"]), 4)
            self.assertEqual(data["coverage"]["importedSubmissionCount"], 3)
            self.assertFalse(data["coverage"]["historyComplete"])
            self.assertTrue(all(row["status"] == "AC" for row in data["submissions"]))
        unknown_date = next(row for row in data["problems"] if row["slug"] == "binary-search")
        self.assertIsNone(unknown_date["lastAcceptedAt"])
        self.assertEqual(data["calendar"], upstream()["calendar"])

    def test_import_invalid_or_other_username_is_atomic(self):
        token, _ = self.user()
        self.connect(token)
        before = self.request("GET", token=token)[1]
        invalid = [{"username": "other", "submissions": [record("104", "a")]}, {"username": "fixture-a", "submissions": [{**record("104", "a"), "code": "private code"}]}, {"username": "fixture-a", "submissions": [record("101", "different-problem")]}, {"username": "fixture-a", "problems": [{"slug": "../bad"}]}]
        for payload in invalid:
            status, body, _ = self.request("POST", "/api/leetcode/import", token, payload)
            self.assertEqual(status, 400, body)
            self.assert_snapshot_equal(self.request("GET", token=token)[1], before)

    def test_imported_history_is_a_private_bound_source_and_reimport_is_idempotent(self):
        token, owner = self.user()
        other, _ = self.user()
        _, before, _ = self.connect(token)
        payload = full_history()
        for _ in range(2):
            status, saved, _ = self.request("POST", "/api/leetcode/import", token, payload)
            self.assertEqual(status, 200, saved)
            self.assertEqual([row["id"] for row in saved["importedSubmissions"]], ["history-1"])
            self.assertEqual(saved["syncedSubmissions"], before["syncedSubmissions"])
            self.assertEqual(saved["syncedLifetimeSolvedCount"], 2)
            self.assertEqual(saved["stats"], before["stats"])
            self.assertEqual(saved["coverage"]["personalHistoryCompleteThrough"], "2026-09-10T12:00:00.000Z")
            self.assertTrue(saved["coverage"]["personalHistoryComplete"])
            self.assertFalse(saved["coverage"]["historyComplete"])
            self.assertEqual(saved["coverage"]["personalHistorySource"], "user_import")
            self.assertEqual(saved["coverage"]["importedAcceptedSubmissions"], 1)
            self.assertEqual(saved["coverage"]["knownAcceptedSubmissions"], 4)
            self.assertFalse(any(key.startswith("_") for key in saved))
        self.assertEqual(self.request("GET", token=other)[1]["importedSubmissions"], [])
        # Once the same genuine ID appears publicly, only the public ledger emits
        # it, without double counting or trusting the remainder of the import.
        self.age_snapshot(owner)
        incoming = upstream()
        incoming["submissions"].append(payload["submissions"][-1])
        self.mock_fetch.side_effect = lambda username: {**incoming, "username": username}
        status, synced, _ = self.request("POST", "/api/leetcode/sync", token, {})
        self.assertEqual(status, 200, synced)
        self.assertEqual(synced["importedSubmissions"], [])
        self.assertEqual(len(synced["syncedSubmissions"]), 4)
        self.assertTrue(synced["coverage"]["personalHistoryComplete"])
        switched = self.connect(token, "fixture-b")[1]
        self.assertEqual(switched["importedSubmissions"], [])
        self.assertFalse(switched["coverage"]["personalHistoryComplete"])
        cleared = self.request("DELETE", token=token)[1]
        self.assertEqual(cleared["importedSubmissions"], [])
        self.assertIsNone(cleared["coverage"]["personalHistoryCompleteThrough"])

    def test_complete_import_does_not_supply_guardian_progress(self):
        token, _ = self.user()
        self.connect(token)
        access = self.request("GET", "/api/guardian/access", token)[1]
        guardian = self.request("POST", "/api/guardian/session", payload={"code": access["code"]})[1]["token"]
        status, created, _ = self.request("POST", "/api/guardian/goals", guardian, {
            "title": "Public accepted history only", "targetCount": 3, "startDate": "2026-09-08",
            "endDate": "2026-09-09", "timeZone": "UTC", "reward": "Fixture reward",
        })
        self.assertEqual(status, 201, created)
        payload = full_history([*upstream()["submissions"], record("imported-goal", "third-question")])
        status, imported, _ = self.request("POST", "/api/leetcode/import", token, payload)
        self.assertEqual(status, 200, imported)
        self.assertTrue(imported["coverage"]["personalHistoryComplete"])
        self.assertEqual(len(imported["importedSubmissions"]), 1)
        with self.api.db.connect() as conn:
            goal = conn.execute("SELECT status, completion_count FROM guardian_goals WHERE id = ?", (created["goal"]["id"],)).fetchone()
        self.assertNotEqual(goal["status"], "completed")
        status, dashboard, _ = self.request("GET", "/api/guardian/dashboard?date=2026-09-09&timeZone=UTC", guardian)
        self.assertEqual(status, 200, dashboard)
        self.assertEqual(next(row["progress"] for row in dashboard["goals"] if row["id"] == created["goal"]["id"]), 2)

    def test_official_history_timestamp_skew_imports_and_reimports_without_changing_public_data(self):
        token, _ = self.user()
        _, before, _ = self.connect(token)
        payload = full_history()
        payload["submissions"][0]["submittedAt"] = "2026-09-08T23:44:52.000Z"
        payload["submissions"][1]["submittedAt"] = "2026-09-08T23:44:59.000Z"
        for _ in range(2):
            status, saved, _ = self.request("POST", "/api/leetcode/import", token, payload)
            self.assertEqual(status, 200, saved)
            self.assertEqual(saved["syncedSubmissions"], before["syncedSubmissions"])
            self.assertEqual(saved["syncedLifetimeSolvedCount"], before["syncedLifetimeSolvedCount"])
            self.assertEqual([row["id"] for row in saved["importedSubmissions"]], ["history-1"])
            self.assertTrue(saved["coverage"]["personalHistoryComplete"])
            self.assertEqual(next(row["submittedAt"] for row in saved["submissions"] if row["id"] == "101"), "2026-09-08T23:45:00.000Z")
        conflict = copy.deepcopy(payload)
        conflict["submissions"][0]["submittedAt"] = "2026-09-08T23:44:49.999Z"
        self.assertEqual(self.request("POST", "/api/leetcode/import", token, conflict)[0], 400)
        self.assert_snapshot_equal(self.request("GET", token=token)[1], saved)

    def test_cas_rejects_sync_started_before_disconnect(self):
        token, owner = self.user()
        self.connect(token)
        with self.api.db.connect() as conn:
            revision, saved = lc.get_record(conn, owner)
        self.request("DELETE", token=token)
        with self.api.db.connect() as conn:
            with self.assertRaises(lc.LeetCodeError) as context:
                lc.save_snapshot(conn, owner, revision, saved)
        self.assertEqual(context.exception.status, 409)
        self.assertIsNone(self.request("GET", token=token)[1]["connection"])

    def test_sync_rate_limit_caps_upstream_attempts(self):
        token, _ = self.user()
        self.connect(token)
        for _ in range(5):
            self.assertEqual(self.request("POST", "/api/leetcode/sync", token, {})[0], 200)
        self.assertEqual(self.request("POST", "/api/leetcode/sync", token, {})[0], 429)
        self.assertEqual(self.mock_fetch.call_count, 1)

    def test_switching_profile_drops_previous_history(self):
        token, _ = self.user()
        self.connect(token)
        self.request("POST", "/api/leetcode/import", token, {"username": "fixture-a", "problems": [{"slug": "imported-only"}]})
        status, data, _ = self.connect(token, "fixture-b")
        self.assertEqual(status, 200, data)
        self.assertEqual(data["connection"]["username"], "fixture-b")
        self.assertNotIn("imported-only", [row["slug"] for row in data["problems"]])

    def test_synced_provenance_excludes_imports_and_resets_on_switch_disconnect_and_relink(self):
        token, owner = self.user()
        self.assertEqual(self.request("GET", token=token)[1]["syncedSubmissions"], [])
        status, snapshot, _ = self.connect(token)
        self.assertEqual(status, 200, snapshot)
        self.assertEqual({row["id"] for row in snapshot["syncedSubmissions"]}, {"101", "102", "103"})
        self.assertFalse(any(key.startswith("_") for key in snapshot))
        status, imported, _ = self.request("POST", "/api/leetcode/import", token, {
            "username": "fixture-a", "submissions": [record("imported", "fabricated-accepted")],
        })
        self.assertEqual(status, 200, imported)
        self.assertIn("imported", {row["id"] for row in imported["submissions"]})
        self.assertNotIn("imported", {row["id"] for row in imported["syncedSubmissions"]})
        for private_field in ("syncedSubmissions", "_syncedAcceptedSubmissions", "_syncedAcceptedConnection"):
            status, data, _ = self.request("POST", "/api/leetcode/import", token, {
                "username": "fixture-a", "submissions": [record("injected", "fake")], private_field: [],
            })
            self.assertEqual(status, 400, data)
        self.age_snapshot(owner)
        incoming = upstream()
        incoming["submissions"] = [record("new-public", "newly-accepted")]
        self.mock_fetch.side_effect = lambda username: {**incoming, "username": username}
        status, resynced, _ = self.request("POST", "/api/leetcode/sync", token, {})
        self.assertEqual(status, 200, resynced)
        self.assertEqual({row["id"] for row in resynced["syncedSubmissions"]}, {"101", "102", "103", "new-public"})
        status, switched, _ = self.connect(token, "fixture-b")
        self.assertEqual(status, 200, switched)
        self.assertEqual({row["id"] for row in switched["syncedSubmissions"]}, {"new-public"})
        self.assertEqual(self.request("DELETE", token=token)[1]["syncedSubmissions"], [])
        status, relinked, _ = self.connect(token)
        self.assertEqual(status, 200, relinked)
        self.assertEqual({row["id"] for row in relinked["syncedSubmissions"]}, {"new-public"})

    def test_lifetime_solved_count_uses_profile_history_and_rejects_import_overrides(self):
        token, owner = self.user()
        self.assertIsNone(self.request("GET", token=token)[1]["syncedLifetimeSolvedCount"])
        incoming = upstream()
        incoming["stats"] = {"solved": 56, "easy": 20, "medium": 30, "hard": 6, "totalSubmissions": 100}
        self.mock_fetch.side_effect = lambda username: {**incoming, "username": username}
        status, snapshot, _ = self.connect(token)
        self.assertEqual(status, 200, snapshot)
        self.assertEqual(snapshot["syncedLifetimeSolvedCount"], 56)
        self.assertEqual(len(snapshot["syncedSubmissions"]), 3)
        status, imported, _ = self.request("POST", "/api/leetcode/import", token, {
            "username": "fixture-a", "submissions": [record("imported-history", "unverified-history")],
        })
        self.assertEqual(status, 200, imported)
        self.assertEqual(imported["syncedLifetimeSolvedCount"], 56)
        for field in ("stats", "syncedLifetimeSolvedCount", "_syncedProfileStats"):
            self.assertEqual(self.request("POST", "/api/leetcode/import", token, {
                "username": "fixture-a", "submissions": [record("fake-history", "fake")], field: 999,
            })[0], 400)
        self.mock_fetch.side_effect = lambda username: upstream(username)
        self.assertEqual(self.connect(token, "fixture-b")[1]["syncedLifetimeSolvedCount"], 2)
        self.assertIsNone(self.request("DELETE", token=token)[1]["syncedLifetimeSolvedCount"])

    def test_legacy_snapshot_gains_countable_provenance_only_after_real_sync(self):
        token, owner = self.user()
        self.connect(token)
        with self.api.db.connect() as conn:
            revision, saved = lc.get_record(conn, owner)
            saved.pop("_syncedAcceptedSubmissions", None)
            saved.pop("_syncedAcceptedConnection", None)
            lc.save_snapshot(conn, owner, revision, saved)
        self.assertEqual(self.request("GET", token=token)[1]["syncedSubmissions"], [])
        self.age_snapshot(owner)
        status, resynced, _ = self.request("POST", "/api/leetcode/sync", token, {})
        self.assertEqual(status, 200, resynced)
        self.assertEqual(len(resynced["syncedSubmissions"]), 3)

    def test_successful_leetcode_sync_reconciles_guardian_goal_in_same_transaction(self):
        token, owner = self.user()
        status, access, _ = self.request("GET", "/api/guardian/access", token)
        self.assertEqual(status, 200, access)
        status, session, _ = self.request("POST", "/api/guardian/session", payload={"code": access["code"]})
        self.assertEqual(status, 200, session)
        status, created, _ = self.request("POST", "/api/guardian/goals", session["token"], {
            "title": "Synced accepted questions", "targetCount": 2, "startDate": "2026-09-08",
            "endDate": "2026-09-09", "timeZone": "UTC", "reward": "Fixture reward",
        })
        self.assertEqual(status, 201, created)
        self.assertNotEqual(created["goal"]["status"], "completed")
        self.assertEqual(self.connect(token)[0], 200)
        # This test server has no background guardian worker. Inspect the DB
        # before any dashboard read to prove the sync write itself reconciled it.
        with self.api.db.connect() as conn:
            goal = conn.execute("SELECT status, completion_count FROM guardian_goals WHERE id = ?", (created["goal"]["id"],)).fetchone()
            queued = conn.execute("SELECT COUNT(*) FROM guardian_notifications WHERE goal_id = ?", (created["goal"]["id"],)).fetchone()[0]
        self.assertEqual(goal["status"], "completed")
        self.assertEqual(goal["completion_count"], 2)
        self.assertEqual(queued, 1)

    def test_review_persists_without_changing_submissions_or_upstream_stats(self):
        token, owner = self.user()
        _, before, _ = self.connect(token)
        payload = self.review_payload(before)
        with patch.object(lc, "now_iso", return_value="2026-09-12T13:24:30.123Z"):
            status, saved, headers = self.request("POST", "/api/leetcode/review", token, payload)
        self.assertEqual(status, 200, saved)
        self.assertIn("no-store", headers["Cache-Control"])
        state = next(row["review"] for row in saved["problems"] if row["slug"] == "two-sum")
        self.assertEqual(state["nextReviewAt"], "2026-09-18T13:24:30.123Z")
        self.assertEqual(state["reviewCount"], 1)
        self.assertEqual(state["version"], 1)
        self.assertEqual(state["source"], "review")
        self.assertEqual(state["status"], "upcoming")
        for key in ("stats", "submissions", "calendar", "coverage"):
            self.assertEqual(saved[key], before[key])
        self.assertFalse(any(key.startswith("_") for key in saved))
        self.age_snapshot(owner)
        newer = upstream()
        newer["submissions"].append(record("200", "two-sum", when="2026-09-10T12:30:00Z"))
        self.mock_fetch.return_value = newer
        self.mock_fetch.side_effect = None
        with patch.object(lc, "now_iso", return_value="2026-09-12T13:25:00.000Z"):
            self.assertEqual(self.request("POST", "/api/leetcode/sync", token, {})[0], 200)
            self.assertEqual(self.request("POST", "/api/leetcode/import", token, {"username": "fixture-a", "problems": [{"slug": "two-sum", "title": "Enriched title"}]})[0], 200)
            restored = self.request("GET", token=token)[1]
        self.assertEqual(next(row["review"] for row in restored["problems"] if row["slug"] == "two-sum"), state)

    def test_review_idempotency_stale_version_and_action_conflict(self):
        token, owner = self.user()
        _, before, _ = self.connect(token)
        payload = self.review_payload(before)
        status, saved, _ = self.request("POST", "/api/leetcode/review", token, payload)
        self.assertEqual(status, 200, saved)
        with self.api.db.connect() as conn:
            revision = lc.get_record(conn, owner)[0]
        status, replayed, _ = self.request("POST", "/api/leetcode/review", token, payload)
        self.assertEqual(status, 200, replayed)
        self.assert_snapshot_equal(replayed, saved)
        with self.api.db.connect() as conn:
            self.assertEqual(lc.get_record(conn, owner)[0], revision)
        for changed in ({**payload, "rating": "easy"}, {**payload, "eventId": str(uuid4())}):
            self.assertEqual(self.request("POST", "/api/leetcode/review", token, changed)[0], 409)

    def test_review_account_isolation_disconnect_relink_and_switch(self):
        token, _ = self.user()
        other, _ = self.user()
        with patch.object(lc, "now_iso", return_value="2026-09-12T12:00:00.000Z"):
            _, before, _ = self.connect(token)
        payload = self.review_payload(before)
        self.assertEqual(self.request("POST", "/api/leetcode/review", other, payload)[0], 409)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, payload)[0], 200)
        self.request("DELETE", token=token)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, payload)[0], 409)
        with patch.object(lc, "now_iso", return_value="2026-09-12T12:01:00.000Z"):
            _, relinked, _ = self.connect(token)
        self.assertEqual(next(row["review"]["version"] for row in relinked["problems"] if row["slug"] == "two-sum"), 0)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, payload)[0], 409)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, self.review_payload(relinked))[0], 200)
        _, switched, _ = self.connect(token, "fixture-b")
        self.assertEqual(next(row["review"]["version"] for row in switched["problems"] if row["slug"] == "two-sum"), 0)

    def test_review_rejects_invalid_fields_unknown_problems_and_private_injection(self):
        token, _ = self.user()
        _, before, _ = self.connect(token)
        payload = self.review_payload(before)
        invalid = [
            {**payload, "rating": "perfect"}, {**payload, "rating": 5}, {**payload, "expectedVersion": True},
            {**payload, "expectedVersion": -1}, {**payload, "eventId": "not-a-uuid"},
            {**payload, "userId": "another-owner"}, {**payload, "nextReviewAt": "2099-01-01T00:00:00Z"},
            {**payload, "reviewedAt": "2026-09-01T00:00:00Z"}, {**payload, "problemSlug": "../bad"},
        ]
        for bad in invalid:
            status, body, _ = self.request("POST", "/api/leetcode/review", token, bad)
            self.assertEqual(status, 400, body)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, {**payload, "problemSlug": "unknown-problem"})[0], 404)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, {**payload, "username": "another-account"})[0], 409)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, {**payload, "ignored": "x" * 4096})[0], 413)
        self.assert_snapshot_equal(self.request("GET", token=token)[1], before)
        self.assertEqual(self.mock_fetch.call_count, 1)

    def test_review_and_sync_cas_preserve_winning_state(self):
        token, owner = self.user()
        _, before, _ = self.connect(token)
        with self.api.db.connect() as conn:
            old_revision, old = lc.get_record(conn, owner)
        payload = self.review_payload(before)
        self.assertEqual(self.request("POST", "/api/leetcode/review", token, payload)[0], 200)
        with self.api.db.connect() as conn:
            with self.assertRaises(lc.LeetCodeError) as caught:
                lc.save_snapshot(conn, owner, old_revision, lc.fresh_snapshot(old, upstream()))
        self.assertEqual(caught.exception.status, 409)
        self.assertEqual(next(row["review"]["version"] for row in self.request("GET", token=token)[1]["problems"] if row["slug"] == "two-sum"), 1)

    def test_review_simultaneous_replay_is_one_event(self):
        token, owner = self.user()
        _, before, _ = self.connect(token)
        payload = self.review_payload(before)
        original_save = lc.save_snapshot
        barrier = threading.Barrier(2)
        def concurrent_save(*args, **kwargs):
            barrier.wait(timeout=5)
            return original_save(*args, **kwargs)
        responses = []
        with patch.object(lc, "save_snapshot", side_effect=concurrent_save):
            threads = [threading.Thread(target=lambda: responses.append(self.request("POST", "/api/leetcode/review", token, payload))) for _ in range(2)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=10)
        self.assertEqual([response[0] for response in responses], [200, 200])
        with self.api.db.connect() as conn:
            _, stored = lc.get_record(conn, owner)
        self.assertEqual(len(stored["_reviewEvents"]), 1)
        self.assertEqual(stored["_reviewStates"]["two-sum"]["reviewCount"], 1)

    def test_review_wins_over_an_older_in_flight_upstream_sync(self):
        token, owner = self.user()
        _, before, _ = self.connect(token)
        self.age_snapshot(owner)
        fetch_started = threading.Event()
        release_fetch = threading.Event()
        def delayed_fetch(username):
            fetch_started.set()
            if not release_fetch.wait(timeout=5):
                raise RuntimeError("Test did not release upstream response")
            incoming = upstream(username)
            incoming["submissions"].append(record("201", "two-sum", when="2026-09-10T12:30:00Z"))
            return incoming
        self.mock_fetch.side_effect = delayed_fetch
        responses = []
        thread = threading.Thread(target=lambda: responses.append(self.request("POST", "/api/leetcode/sync", token, {})))
        thread.start()
        try:
            self.assertTrue(fetch_started.wait(timeout=5))
            status, saved, _ = self.request("POST", "/api/leetcode/review", token, self.review_payload(before))
            self.assertEqual(status, 200, saved)
        finally:
            release_fetch.set()
            thread.join(timeout=10)
        self.assertEqual(responses[0][0], 409, responses)
        self.assert_snapshot_equal(self.request("GET", token=token)[1], saved)


class ReviewAlgorithmTests(unittest.TestCase):
    def snapshot(self, known=True):
        result = lc.fresh_snapshot(lc.empty_snapshot(), upstream())
        if not known:
            result = lc.import_metadata(result, {"username": "fixture-a", "problems": [{"slug": "unknown-date"}]})
        return result

    def grade(self, snapshot, rating, slug="two-sum", when="2026-09-12T15:30:45.123Z"):
        state = lc.problem_review(snapshot, next(row for row in snapshot["problems"] if row["slug"] == slug), when)
        payload = {"username": "fixture-a", "linkedAt": snapshot["connection"]["linkedAt"], "problemSlug": slug,
                   "rating": rating, "eventId": str(uuid4()), "expectedVersion": state["version"]}
        with patch.object(lc, "now_iso", return_value=when):
            return lc.apply_review(snapshot, payload)

    def test_initial_accepted_and_unknown_dates_and_read_only_due_projection(self):
        snapshot = self.snapshot(known=False)
        before = copy.deepcopy(snapshot)
        problem = next(row for row in snapshot["problems"] if row["slug"] == "two-sum")
        state = lc.problem_review(snapshot, problem, "2026-09-09T23:44:59.999Z")
        self.assertEqual(state["nextReviewAt"], "2026-09-09T23:45:00.000Z")
        self.assertEqual((state["source"], state["repetitions"], state["intervalDays"], state["easeFactor"]), ("accepted", 1, 1, 2.5))
        self.assertEqual(state["status"], "upcoming")
        self.assertEqual(lc.problem_review(snapshot, problem, state["nextReviewAt"])["status"], "due")
        unknown = next(row for row in snapshot["problems"] if row["slug"] == "unknown-date")
        state = lc.problem_review(snapshot, unknown)
        self.assertEqual((state["source"], state["status"], state["repetitions"], state["intervalDays"]), ("unknown", "uninitialized", 0, 0))
        self.assertIsNone(state["nextReviewAt"])
        self.assertEqual(snapshot, before)

    def test_exact_rating_outputs_known_seed_and_old_ease_multiplier(self):
        for rating, reps, interval, ease, lapses in (("again", 0, 1, 1.96, 1), ("hard", 2, 6, 2.36, 0), ("good", 2, 6, 2.5, 0), ("easy", 2, 6, 2.6, 0)):
            saved = self.grade(self.snapshot(), rating)
            state = saved["_reviewStates"]["two-sum"]
            self.assertEqual((state["repetitions"], state["intervalDays"], state["easeFactor"], state["lapses"]), (reps, interval, ease, lapses))
            self.assertEqual((state["source"], state["reviewCount"], state["version"]), ("review", 1, 1))
            self.assertEqual(state["nextReviewAt"], f"2026-09-{12 + interval:02d}T15:30:45.123Z")
        saved = self.grade(self.grade(self.snapshot(), "good"), "easy")
        self.assertEqual(saved["_reviewStates"]["two-sum"]["intervalDays"], 15)  # ceil(6 * old EF 2.5), not 16 from new EF 2.6.
        self.assertEqual(saved["_reviewStates"]["two-sum"]["easeFactor"], 2.6)

    def test_unknown_seed_failure_recovery_ease_floor_and_cap(self):
        saved = self.grade(self.snapshot(known=False), "good", "unknown-date")
        state = saved["_reviewStates"]["unknown-date"]
        self.assertEqual((state["intervalDays"], state["repetitions"]), (1, 1))
        self.assertEqual(state["anchorAt"], state["lastReviewedAt"])
        for _ in range(5):
            saved = self.grade(saved, "again", "unknown-date")
        state = saved["_reviewStates"]["unknown-date"]
        self.assertEqual((state["easeFactor"], state["lapses"], state["repetitions"]), (1.3, 5, 0))
        saved = self.grade(saved, "good", "unknown-date")
        self.assertEqual(saved["_reviewStates"]["unknown-date"]["intervalDays"], 1)
        state = saved["_reviewStates"]["unknown-date"]
        state.update({"repetitions": 10, "intervalDays": 36000, "easeFactor": 2.5})
        saved = self.grade(saved, "easy", "unknown-date")
        self.assertEqual(saved["_reviewStates"]["unknown-date"]["intervalDays"], 36500)

    def test_event_bound_is_atomic(self):
        snapshot = self.snapshot()
        with patch.object(lc, "MAX_REVIEW_EVENTS", 1):
            saved = self.grade(snapshot, "good")
            before = copy.deepcopy(saved)
            with self.assertRaises(lc.LeetCodeError) as caught:
                self.grade(saved, "good")
        self.assertEqual(caught.exception.status, 413)
        self.assertEqual(saved, before)


class ImportedHistoryTests(unittest.TestCase):
    def snapshot(self):
        return lc.fresh_snapshot(lc.empty_snapshot(), upstream())

    def test_legacy_imports_recover_as_partial_and_public_metadata_wins(self):
        saved = lc.import_metadata(self.snapshot(), {"username": "fixture-a", "submissions": [
            record("old-import", "older-question"), record("failed", "failed-question", "WA"),
            {**upstream()["submissions"][0], "title": "Imported title"},
        ]})
        saved.pop("_importedAcceptedConnection")
        result = lc.public_snapshot(saved)
        self.assertEqual([row["id"] for row in result["importedSubmissions"]], ["old-import"])
        self.assertEqual(next(row["title"] for row in result["syncedSubmissions"] if row["id"] == "101"), "two-sum")
        self.assertFalse(result["coverage"]["personalHistoryComplete"])
        self.assertIsNone(result["coverage"]["personalHistoryCompleteThrough"])
        self.assertEqual(result["coverage"]["personalHistorySource"], "user_import")

    def test_binding_mismatch_and_invalid_legacy_markers_fail_closed(self):
        saved = lc.import_metadata(self.snapshot(), full_history())
        for update in ({"username": "other", "linkedAt": saved["connection"]["linkedAt"]},
                       {"username": "fixture-a", "linkedAt": "2020-01-01T00:00:00Z"}, None):
            broken = copy.deepcopy(saved)
            broken["_importedAcceptedConnection"] = update
            result = lc.public_snapshot(broken)
            self.assertEqual(result["importedSubmissions"], [])
            self.assertFalse(result["coverage"]["personalHistoryComplete"])
        for markers in (None, {}, [123]):
            broken = copy.deepcopy(saved)
            broken["_importedSubmissionIds"] = markers
            result = lc.public_snapshot(broken)
            self.assertEqual(result["importedSubmissions"], [])
            self.assertFalse(result["coverage"]["personalHistoryComplete"])

    def test_full_coverage_requires_explicit_consistent_collection_not_equal_counts(self):
        # Public distinct total equals the two known slugs, but recent records
        # are still not proof of full submission history.
        result = lc.public_snapshot(lc.import_metadata(self.snapshot(), {
            "username": "fixture-a", "submissions": upstream()["submissions"],
        }))
        self.assertEqual(result["syncedLifetimeSolvedCount"], 2)
        self.assertFalse(result["coverage"]["personalHistoryComplete"])
        base = full_history()
        invalid = [
            {**base, "coverage": {**base["coverage"], "complete": "true"}},
            {**base, "coverage": {**base["coverage"], "skippedRecords": True}},
            {**base, "coverage": {**base["coverage"], "skippedRecords": 1}},
            {**base, "coverage": {**base["coverage"], "reason": "page limit"}},
            {**base, "coverage": {**base["coverage"], "submissionsComplete": False}},
            {**base, "coverage": {**base["coverage"], "trusted": True}},
            {**base, "coverage": None},
            {**base, "capturedAt": "2099-01-01T00:00:00Z"},
            {**base, "capturedAt": "2026-09-08T00:00:00Z"},
            {**base, "problems": [{"slug": "missing-history"}]},
            {**base, "submissions": base["submissions"][1:]},
            {**base, "submissions": [*base["submissions"], record("failed", "binary-search", "WA")]},
        ]
        for field in ("capturedAt", "coverage"):
            missing = copy.deepcopy(base)
            missing.pop(field)
            invalid.append(missing)
        original = self.snapshot()
        before = copy.deepcopy(original)
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(lc.LeetCodeError):
                lc.import_metadata(original, payload)
            self.assertEqual(original, before)

    def test_partial_and_older_reimports_preserve_cutoff_and_new_complete_advances_it(self):
        saved = lc.import_metadata(self.snapshot(), full_history())
        later = full_history(captured_at="2026-09-11T12:00:00Z")
        saved = lc.import_metadata(saved, later)
        saved = lc.import_metadata(saved, full_history())
        partial = full_history()
        partial["coverage"] = {"problemsComplete": True, "submissionsComplete": False,
                               "complete": False, "skippedRecords": 0, "reason": "page timeout"}
        partial["submissions"] = partial["submissions"][-1:]
        saved = lc.import_metadata(saved, partial)
        result = lc.public_snapshot(saved)
        self.assertEqual(result["coverage"]["personalHistoryCompleteThrough"], "2026-09-11T12:00:00.000Z")
        self.assertEqual(len(result["importedSubmissions"]), 1)

    def test_new_older_ac_disproves_prior_complete_import_but_newer_ac_does_not(self):
        original = lc.import_metadata(self.snapshot(), full_history())
        for public in (False, True):
            for when, complete in (("2026-09-01T00:00:00Z", False), ("2026-09-12T00:00:00Z", True)):
                added = record("newly-discovered", "another-question", when=when)
                if public:
                    incoming = upstream()
                    incoming["submissions"].append(added)
                    saved = lc.fresh_snapshot(original, incoming)
                else:
                    saved = lc.import_metadata(original, {"username": "fixture-a", "submissions": [added]})
                with self.subTest(public=public, when=when):
                    self.assertEqual(lc.public_snapshot(saved)["coverage"]["personalHistoryComplete"], complete)
        added = record("newly-discovered", "another-question", when="2026-09-01T00:00:00Z")
        incomplete = lc.import_metadata(original, {"username": "fixture-a", "submissions": [added]})
        repaired = lc.import_metadata(incomplete, full_history([*full_history()["submissions"], added], captured_at="2026-09-13T00:00:00Z"))
        self.assertEqual(lc.public_snapshot(repaired)["coverage"]["personalHistoryCompleteThrough"], "2026-09-13T00:00:00.000Z")

    def test_same_id_conflicts_fail_atomically_for_prior_and_duplicate_imports(self):
        original = lc.import_metadata(self.snapshot(), full_history())
        before = copy.deepcopy(original)
        for rows in ([record("history-1", "different-question", when="2026-08-01T09:00:00Z")],
                     [record("history-1", "binary-search", when="2026-08-02T09:00:00Z")],
                     [record("duplicate", "first-question"), record("duplicate", "other-question")]):
            with self.assertRaises(lc.LeetCodeError):
                lc.import_metadata(original, {"username": "fixture-a", "submissions": rows})
            self.assertEqual(original, before)

    def test_public_timestamp_canonicalization_includes_ten_seconds_and_crosses_midnight(self):
        incoming = upstream()
        incoming["submissions"][2] = record("103", "valid-parentheses", when="2026-09-09T00:00:03Z")
        original = lc.fresh_snapshot(lc.empty_snapshot(), incoming)
        rows = [record("101", "two-sum", when="2026-09-08T23:44:50Z"),
                record("102", "two-sum", when="2026-09-08T23:45:10Z"),
                record("103", "valid-parentheses", when="2026-09-08T23:59:55Z")]
        saved = lc.import_metadata(original, full_history(rows))
        canonical = {row["id"]: row["submittedAt"] for row in saved["_records"]}
        self.assertEqual(canonical, {row["id"]: row["submittedAt"] for row in incoming["submissions"]})
        self.assertEqual(saved["_syncedAcceptedSubmissions"], original["_syncedAcceptedSubmissions"])
        self.assertTrue(lc.public_snapshot(saved)["coverage"]["personalHistoryComplete"])

    def test_timestamp_compatibility_requires_bound_public_ac_and_exact_problem_identity(self):
        original = self.snapshot()
        before = copy.deepcopy(original)
        invalid = [record("101", "two-sum", when="2026-09-08T23:44:49.999Z"),
                   record("101", "two-sum", when="2026-09-08T23:45:10.001Z"),
                   record("101", "other-question", when="2026-09-08T23:44:52Z"),
                   record("101", "two-sum", "WA", when="2026-09-08T23:44:52Z")]
        for row in invalid:
            with self.subTest(row=row), self.assertRaises(lc.LeetCodeError):
                lc.import_metadata(original, {"username": "fixture-a", "submissions": [row]})
            self.assertEqual(original, before)
        for binding in (None, {"username": "other", "linkedAt": original["connection"]["linkedAt"]}):
            unbound = copy.deepcopy(original)
            unbound["_syncedAcceptedConnection"] = binding
            with self.assertRaises(lc.LeetCodeError):
                lc.import_metadata(unbound, {"username": "fixture-a", "submissions": [record("101", "two-sum", when="2026-09-08T23:44:52Z")]})
        # Untrusted imports do not authorize timestamp changes between themselves,
        # and the shared merge function retains its exact timestamp comparison.
        saved = lc.import_metadata(original, {"username": "fixture-a", "submissions": [record("private-ac", "binary-search")]})
        with self.assertRaises(lc.LeetCodeError):
            lc.import_metadata(saved, {"username": "fixture-a", "submissions": [record("private-ac", "binary-search", when="2026-09-08T23:44:52Z")]})
        with self.assertRaises(lc.LeetCodeError):
            lc.merge_records(copy.deepcopy(original), [record("101", "two-sum", when="2026-09-08T23:44:52Z")])

    def test_first_public_observation_canonicalizes_existing_import_without_erasing_cutoff(self):
        payload = full_history()
        original = lc.import_metadata(self.snapshot(), payload)
        public = record("history-1", "binary-search", when="2026-08-01T09:00:08Z")
        incoming = {**upstream(), "submissions": [public]}
        saved = lc.fresh_snapshot(original, incoming)
        self.assertEqual(next(row["submittedAt"] for row in saved["_records"] if row["id"] == "history-1"), public["submittedAt"])
        self.assertEqual(lc.public_snapshot(saved)["importedSubmissions"], [])
        self.assertEqual(saved["_importedHistoryCoverage"], original["_importedHistoryCoverage"])
        self.assertIn(public, saved["_syncedAcceptedSubmissions"])
        # Re-uploading the original start timestamps after public sync is stable.
        repeated = lc.import_metadata(saved, payload)
        self.assertEqual(repeated["_records"], saved["_records"])
        self.assertEqual(repeated["_syncedAcceptedSubmissions"], saved["_syncedAcceptedSubmissions"])
        self.assertEqual(repeated["_importedHistoryCoverage"], saved["_importedHistoryCoverage"])
        # Once public, a later upstream timestamp change is not import compatibility.
        changed_public = {**public, "submittedAt": "2026-08-01T09:00:09.000Z"}
        with self.assertRaises(lc.LeetCodeError):
            lc.fresh_snapshot(saved, {**incoming, "submissions": [changed_public]})

    def test_first_public_timestamp_conflicts_remain_atomic_and_binding_scoped(self):
        original = lc.import_metadata(self.snapshot(), full_history())
        before = copy.deepcopy(original)
        for public in (record("history-1", "binary-search", when="2026-08-01T09:00:10.001Z"),
                       record("history-1", "other-question", when="2026-08-01T09:00:08Z")):
            with self.assertRaises(lc.LeetCodeError):
                lc.fresh_snapshot(original, {**upstream(), "submissions": [public]})
            self.assertEqual(original, before)
        unbound = copy.deepcopy(original)
        unbound["_importedAcceptedConnection"]["linkedAt"] = "2020-01-01T00:00:00Z"
        public = record("history-1", "binary-search", when="2026-08-01T09:00:08Z")
        with self.assertRaises(lc.LeetCodeError):
            lc.fresh_snapshot(unbound, {**upstream(), "submissions": [public]})


class LifetimeCountTests(unittest.TestCase):
    def test_old_public_history_is_recovered_but_imports_cannot_gain_provenance(self):
        snapshot = lc.fresh_snapshot(lc.empty_snapshot(), upstream())
        old = record("old-public", "oldly-accepted", when="2026-01-01T12:00:00Z")
        imported = record("import-only", "imported-problem", when="2026-01-02T12:00:00Z")
        snapshot["_records"].extend([old, imported])
        snapshot["_importedSubmissionIds"] = ["import-only"]
        snapshot["coverage"]["importedSubmissionCount"] = 1
        ids = {row["id"] for row in lc.synced_accepted_submissions(snapshot)}
        self.assertEqual(ids, {"101", "102", "103", "old-public"})
        snapshot["_importedSubmissionIds"].append("101")
        self.assertIn("101", {row["id"] for row in lc.synced_accepted_submissions(snapshot)}, "explicit public ledger has priority")
        snapshot["_syncedAcceptedConnection"]["username"] = "different-profile"
        self.assertEqual(lc.synced_accepted_submissions(snapshot), [])

    def test_missing_or_malformed_import_markers_fail_closed_for_old_history(self):
        snapshot = lc.fresh_snapshot(lc.empty_snapshot(), upstream())
        snapshot["_records"].append(record("old-public", "oldly-accepted"))
        self.assertIn("old-public", {row["id"] for row in lc.synced_accepted_submissions(snapshot)})
        for marker in (None, {}, [123]):
            invalid = copy.deepcopy(snapshot)
            invalid["_importedSubmissionIds"] = marker
            self.assertNotIn("old-public", {row["id"] for row in lc.synced_accepted_submissions(invalid)})
        snapshot["coverage"]["importedSubmissionCount"] = 1
        snapshot.pop("_importedSubmissionIds", None)
        self.assertNotIn("old-public", {row["id"] for row in lc.synced_accepted_submissions(snapshot)})
        snapshot["_importedSubmissionIds"] = []
        self.assertNotIn("old-public", {row["id"] for row in lc.synced_accepted_submissions(snapshot)})
        for value in (-1, True, "1", None):
            snapshot["coverage"]["importedSubmissionCount"] = value
            self.assertNotIn("old-public", {row["id"] for row in lc.synced_accepted_submissions(snapshot)})

    def test_lifetime_count_requires_current_sync_binding_and_valid_server_statistics(self):
        snapshot = lc.fresh_snapshot(lc.empty_snapshot(), upstream())
        self.assertEqual(lc.synced_lifetime_solved_count(snapshot), 2)
        for field, value in (("connection", None), ("_syncedAcceptedConnection", {}), ("stats", None)):
            invalid = copy.deepcopy(snapshot)
            invalid[field] = value
            self.assertIsNone(lc.synced_lifetime_solved_count(invalid))
        for value in (-1, True, "56", None, 100_000_001):
            invalid = copy.deepcopy(snapshot)
            invalid["stats"]["solved"] = value
            self.assertIsNone(lc.synced_lifetime_solved_count(invalid))
        for value in (None, "invalid", "2099-01-01T00:00:00Z", "2020-01-01T00:00:00Z"):
            invalid = copy.deepcopy(snapshot)
            invalid["connection"]["lastSyncedAt"] = value
            self.assertIsNone(lc.synced_lifetime_solved_count(invalid))
        invalid = copy.deepcopy(snapshot)
        invalid["connection"]["username"] = "different-profile"
        self.assertIsNone(lc.synced_lifetime_solved_count(invalid))


class AdapterTests(unittest.TestCase):
    def test_public_query_parsing_and_count_semantics(self):
        profile = {"userProfilePublicProfile": {"username": "fixture", "profile": {"realName": "Demo"}, "submissionProgress": {"acTotal": 2, "totalSubmissions": 9}}, "userProfileUserQuestionProgress": {"numAcceptedQuestions": [{"difficulty": "EASY", "count": 1}, {"difficulty": "MEDIUM", "count": 1}, {"difficulty": "HARD", "count": 0}]}}
        activity = {"recentACSubmissions": [{"submissionId": 101, "submitTime": 1788911100, "question": {"translatedTitle": "两数之和", "titleSlug": "two-sum", "questionFrontendId": "1"}}], "userCalendar": {"submissionCalendar": '{"1788825600": 9}'}}
        with patch.object(lc, "graphql", side_effect=[profile, activity]) as graph:
            result = lc.fetch_profile("fixture")
        self.assertEqual(graph.call_args_list[0].kwargs, {})
        self.assertTrue(graph.call_args_list[1].kwargs["activity"])
        self.assertEqual(result["calendar"], [{"date": "2026-09-08", "submissions": 9}])
        self.assertEqual(result["stats"]["solved"], 2)
        self.assertEqual(result["stats"]["totalSubmissions"], 9)
        self.assertEqual(result["submissions"][0]["submittedAt"], "2026-09-08T23:45:00.000Z")
        self.assertIsNone(result["submissions"][0]["difficulty"])

    def test_missing_profile_and_malformed_stats_fail(self):
        with patch.object(lc, "graphql", return_value={"userProfilePublicProfile": None}):
            with self.assertRaises(lc.LeetCodeError) as caught:
                lc.fetch_profile("missing")
            self.assertEqual(caught.exception.status, 404)
        with patch.object(lc, "graphql", return_value={"userProfilePublicProfile": {"submissionProgress": {"acTotal": 2}}}):
            with self.assertRaises(lc.LeetCodeError) as caught:
                lc.fetch_profile("broken")
            self.assertEqual(caught.exception.status, 502)

    def test_no_redirect_or_user_selected_host(self):
        self.assertIsNone(lc.NoRedirect().redirect_request(None, None, 302, "", {}, "http://127.0.0.1/"))
        with patch.object(lc, "build_opener") as opener:
            opener.return_value.open.side_effect = TimeoutError()
            with self.assertRaises(lc.LeetCodeError):
                lc.graphql("query", {"userSlug": "fixture"})
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.full_url, "https://leetcode.cn/graphql/")
            self.assertNotIn("Cookie", request.headers)
            self.assertEqual(opener.return_value.open.call_args.kwargs["timeout"], 10)

    def test_problem_last_accepted_time_never_moves_backwards(self):
        snapshot = lc.fresh_snapshot(lc.empty_snapshot(), upstream())
        snapshot = lc.import_metadata(snapshot, {"username": "fixture-a", "problems": [{"slug": "two-sum", "lastAcceptedAt": "2026-09-10T00:00:00Z"}]})
        snapshot = lc.fresh_snapshot(snapshot, upstream())
        self.assertEqual(next(row for row in snapshot["problems"] if row["slug"] == "two-sum")["lastAcceptedAt"], "2026-09-10T00:00:00.000Z")

    def test_timezone_requires_explicit_offset_and_normalizes(self):
        self.assertEqual(lc.timestamp("2026-09-09T07:45:00+08:00"), "2026-09-08T23:45:00.000Z")
        for value in ("2026-09-08T23:45:00", True, "2099-01-01T00:00:00Z"):
            with self.assertRaises(lc.LeetCodeError):
                lc.timestamp(value)


if __name__ == "__main__":
    unittest.main()
