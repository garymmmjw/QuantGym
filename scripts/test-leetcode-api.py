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

    def test_authentication_required_and_responses_are_private(self):
        for method, path in (("GET", "/api/leetcode"), ("DELETE", "/api/leetcode"), ("POST", "/api/leetcode/connect"), ("POST", "/api/leetcode/sync"), ("POST", "/api/leetcode/import")):
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
            self.assertEqual(self.request("GET", token=token)[1], saved)

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
            self.assertEqual(self.request("GET", token=token)[1], before)

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
