#!/usr/bin/env python3
"""Local Learn content access checks using real HTTP and isolated storage."""
from contextlib import contextmanager
import http.client
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = {
    "library": ("library.json", {"tracks": [{"id": "fixture", "title": "Local course"}]}),
    "practice": ("practice.json", {"lists": [{"ids": [14]}]}),
    "modules": ("scoring/modules.json", {"modules": [{"id": "probability"}]}),
    "problems-index": ("scoring/problems-index.json", [{"id": 14, "title": "Metadata only"}]),
    "item-difficulty": ("scoring/item-difficulty.json", {"b": {"14": 1.2}}),
    "item-difficulty-v2": ("scoring/item-difficulty-v2.json", {"b": {"14": 1.2}, "c": {"14": 0.5}}),
}


class LearningContentApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="qg-learn-api-")
        cls.directory = Path(cls.tmp.name)
        cls.database = cls.directory / "test.sqlite"
        cls.content_root = cls.directory / "private"
        (cls.content_root / "scoring").mkdir(parents=True)
        for filename, payload in RESOURCES.values():
            (cls.content_root / filename).write_text(json.dumps(payload), encoding="utf-8")
        (cls.content_root / "problems.json").write_text(json.dumps({"secret": "Question body is not this API"}))
        catalog = cls.directory / "empty.json"
        catalog.write_text("[]")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.environment = {
            **{key: value for key, value in os.environ.items() if not key.startswith("QUANTGYM_") and key != "DATABASE_URL"},
            "QUANTGYM_HOST": "127.0.0.1", "PORT": str(cls.port),
            "QUANTGYM_DB": str(cls.database), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_DATABASE_URL": "", "QUANTGYM_POSTGRES_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(catalog), "QUANTGYM_JOBS_CATALOG": str(catalog),
            "QUANTGYM_JOBS_SOURCE_URL": "", "QUANTGYM_PRIVATE_WORKSPACES": "0",
            "QUANTGYM_ENABLE_LOCAL_QUANTVAULT": "1", "QUANTGYM_LOCAL_LEARN_ROOT": str(cls.content_root),
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "", "QUANTGYM_ADMIN_EMAILS": "",
            "QUANTGYM_SMTP_HOST": "", "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": "",
        }
        cls.log = (cls.directory / "server.log").open("w+")
        cls.start_server()
        cls.reader = cls.register("reader@example.invalid")
        cls.member = cls.register("member@example.invalid")
        with sqlite3.connect(cls.database) as conn:
            conn.execute("INSERT INTO memberships(email_norm, created_at, updated_at) VALUES (?, ?, ?)",
                         ("member@example.invalid", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen([sys.executable, str(ROOT / "api-server/server.py")],
                                       cwd=ROOT, env=cls.environment, stdout=cls.log, stderr=cls.log)
        for _ in range(150):
            try:
                if cls.request("GET", "/health")[0] == 200:
                    return
            except OSError:
                pass
            if cls.process.poll() is not None:
                break
            time.sleep(0.1)
        cls.log.seek(0)
        raise RuntimeError(cls.log.read())

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        cls.process.wait(timeout=10)

    @classmethod
    def tearDownClass(cls):
        cls.stop_server()
        cls.log.close()
        cls.tmp.cleanup()

    @classmethod
    def request(cls, method, path, body=None, token=""):
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read()), dict(response.getheaders())
        finally:
            conn.close()

    @classmethod
    def register(cls, email):
        status, payload, _ = cls.request("POST", "/api/auth/register", {
            "password": "LearningFixture1234", "account": {"email": email, "name": "Learning fixture", "provider": "local"}})
        if status != 201:
            raise RuntimeError(payload)
        return payload["token"]

    @contextmanager
    def configured(self, key, value):
        old = self.environment.get(key)
        self.stop_server()
        if value is None:
            self.environment.pop(key, None)
        else:
            self.environment[key] = value
        try:
            self.start_server()
            yield
        finally:
            self.stop_server()
            if old is None:
                self.environment.pop(key, None)
            else:
                self.environment[key] = old
            self.start_server()

    def read(self, resource, token=None):
        return self.request("GET", f"/api/learning/content/{resource}", token=self.member if token is None else token)

    def assert_private(self, headers):
        self.assertEqual(headers.get("Cache-Control"), "private, no-store")
        self.assertEqual(headers.get("Pragma"), "no-cache")
        self.assertIn("Authorization", headers.get("Vary", ""))

    def test_all_resources_require_live_authenticated_membership(self):
        for resource in RESOURCES:
            for token, expected in [("", 401), ("invalid-session", 401), (self.reader, 403), (self.member, 200)]:
                with self.subTest(resource=resource, expected=expected):
                    status, payload, headers = self.read(resource, token)
                    self.assertEqual(status, expected, payload)
                    self.assert_private(headers)

    def test_original_json_shapes_and_values_have_no_wrapper(self):
        for resource, (_, expected) in RESOURCES.items():
            status, payload, headers = self.read(resource)
            self.assertEqual(status, 200)
            self.assertEqual(payload, expected)
            self.assertTrue(headers["Content-Type"].startswith("application/json"))

    def test_revoking_membership_blocks_an_existing_session_immediately(self):
        with sqlite3.connect(self.database) as conn:
            conn.execute("UPDATE memberships SET revoked_at = ? WHERE email_norm = ?",
                         ("2026-01-02T00:00:00Z", "member@example.invalid"))
        try:
            self.assertEqual(self.read("library")[0], 403)
        finally:
            with sqlite3.connect(self.database) as conn:
                conn.execute("UPDATE memberships SET revoked_at = NULL WHERE email_norm = ?", ("member@example.invalid",))
        self.assertEqual(self.read("library")[0], 200)

    def test_local_opt_in_is_required_even_for_members(self):
        with self.configured("QUANTGYM_ENABLE_LOCAL_QUANTVAULT", None):
            status, _, headers = self.read("library")
            self.assertEqual(status, 404)
            self.assert_private(headers)

    def test_network_facing_host_cannot_enable_content(self):
        with self.configured("QUANTGYM_HOST", "0.0.0.0"):
            self.assertEqual(self.read("library")[0], 404)

    def test_unconfigured_or_missing_root_returns_clear_unavailable_status(self):
        for value in (None, str(self.directory / "missing")):
            with self.configured("QUANTGYM_LOCAL_LEARN_ROOT", value):
                status, payload, headers = self.read("library")
                self.assertEqual(status, 503)
                self.assertEqual(payload["error"], "Learning content is not configured")
                self.assert_private(headers)

    def test_production_flag_and_private_root_support_network_host_with_vip_only(self):
        with self.configured("QUANTGYM_HOST", "0.0.0.0"):
            with self.configured("QUANTGYM_ENABLE_QUANTVAULT", "1"):
                with self.configured("QUANTGYM_LEARN_ROOT", str(self.content_root)):
                    for resource in RESOURCES:
                        for token, expected in [("", 401), (self.reader, 403), (self.member, 200)]:
                            status, payload, headers = self.read(resource, token)
                            self.assertEqual(status, expected, payload)
                            self.assert_private(headers)
                    self.test_revoking_membership_blocks_an_existing_session_immediately()
                    self.test_allowlist_prevents_question_bodies_and_path_traversal()
                    self.test_symlink_cannot_escape_content_root()

    def test_production_does_not_fall_back_to_developer_root(self):
        with self.configured("QUANTGYM_HOST", "0.0.0.0"):
            with self.configured("QUANTGYM_ENABLE_QUANTVAULT", "1"):
                self.assertEqual(self.read("library")[0], 503)
                with self.configured("QUANTGYM_LEARN_ROOT", ""):
                    self.assertEqual(self.read("library")[0], 503)

    def test_missing_or_invalid_resource_files_fail_closed(self):
        path = self.content_root / "library.json"
        original = path.read_bytes()
        try:
            path.unlink()
            self.assertEqual(self.read("library")[0], 404)
            path.write_bytes(b"not json")
            self.assertEqual(self.read("library")[0], 503)
        finally:
            path.write_bytes(original)

    def test_allowlist_prevents_question_bodies_and_path_traversal(self):
        for resource in ("problems", "problems.json", "library.json", "../problems", "%2e%2e%2fproblems",
                         "scoring/modules", "library%00", "%6cibrary"):
            status, payload, headers = self.read(resource)
            self.assertEqual(status, 404, (resource, payload))
            self.assertNotIn("secret", payload)
            self.assert_private(headers)

    def test_symlink_cannot_escape_content_root(self):
        outside = self.directory / "outside.json"
        outside.write_text(json.dumps({"secret": "outside root"}))
        path = self.content_root / "library.json"
        original = path.read_bytes()
        try:
            path.unlink()
            path.symlink_to(outside)
            self.assertEqual(self.read("library")[0], 404)
        finally:
            path.unlink()
            path.write_bytes(original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
