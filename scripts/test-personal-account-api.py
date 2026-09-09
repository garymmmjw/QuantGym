#!/usr/bin/env python3
"""Account profile HTTP regressions against a disposable SQLite API only."""

from concurrent.futures import ThreadPoolExecutor
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
PASSWORD = "fixture-only-password"
ADMIN_EMAIL = "reserved-admin@example.test"


class AccountProfileApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="quantgym-account-api-", dir="/tmp")
        cls.directory = Path(cls.temp.name)
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
            "QUANTGYM_ADMIN_EMAILS": ADMIN_EMAIL,
            "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
            "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX": "500",
            "QUANTGYM_ALERT_WEBHOOK_URL": "",
            "QUANTGYM_JOBS_SOURCE_URL": "disabled",
        }
        cls.log = (cls.directory / "server.log").open("ab")
        cls.user_counter = 0
        try:
            cls.start_server()
        except Exception:
            cls.tearDownClass()
            raise

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
            except (OSError, http.client.HTTPException):
                pass
            time.sleep(0.05)
        raise RuntimeError("Isolated account API failed to start")

    @classmethod
    def stop_server(cls):
        if getattr(cls, "process", None) and cls.process.poll() is None:
            cls.process.kill()
            cls.process.wait(timeout=5)

    @classmethod
    def tearDownClass(cls):
        cls.stop_server()
        cls.log.close()
        cls.temp.cleanup()

    @classmethod
    def request(cls, method, path, token=None, payload=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        try:
            for attempt in range(3):
                try:
                    conn.connect()
                    break
                except OSError as error:
                    conn.close()
                    if error.errno != 22 or attempt == 2:
                        raise
                    time.sleep(0.025)
            conn.request(method, path, body=body, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally:
            conn.close()

    def new_user(self):
        type(self).user_counter += 1
        identity = f"account-fixture-{self.user_counter}"
        status, data = self.request("POST", "/api/auth/register", payload={
            "password": PASSWORD,
            "account": {"id": identity, "provider": "local", "name": identity, "email": f"{identity}@example.test"},
        })
        self.assertEqual(status, 201, data)
        # This read also waits for the older registration handler's transaction.
        self.assertEqual(self.request("GET", "/api/account", data["token"])[0], 200)
        return data

    def setUp(self):
        self.a = self.new_user()
        self.b = self.new_user()
        # Seed server-owned metadata directly in this disposable DB, simulating
        # billing and a verified Google identity already attached to a local user.
        self.metadata = {
            "subscriptionTier": "pro", "plan": "pro", "googleId": "verified-google-subject",
            "googleLinkedAt": "2025-01-01T00:00:00Z", "roles": ["subscriber"],
            "subscription": {"customerId": "fixture-customer", "status": "active", "renewAt": "2027-01-01"},
            "serverMetadata": {"billingRevision": 7},
        }
        with sqlite3.connect(self.database) as conn:
            row = conn.execute("SELECT account_json FROM users WHERE id = ?", (self.a["account"]["id"],)).fetchone()
            account = {**json.loads(row[0]), **self.metadata}
            conn.execute("UPDATE users SET account_json = ? WHERE id = ?", (json.dumps(account), account["id"]))
        self.a_before = self.user_row(self.a)
        self.b_before = self.user_row(self.b)

    def user_row(self, user):
        with sqlite3.connect(self.database) as conn:
            conn.row_factory = sqlite3.Row
            return dict(conn.execute("SELECT * FROM users WHERE id = ?", (user["account"]["id"],)).fetchone())

    def update_profile(self, route, updates, **sync_fields):
        method, path, key = route
        return self.request(method, path, self.a["token"], {key: updates, **sync_fields})

    ROUTES = (("PATCH", "/api/account", "updates"), ("POST", "/api/sync", "account"))

    def assert_auth_unchanged(self):
        row = self.user_row(self.a)
        for field in ("id", "provider", "email_norm", "password_salt", "password_hash"):
            self.assertEqual(row[field], self.a_before[field], field)
        status, data = self.request("POST", "/api/auth/login", payload={
            "email": self.a["account"]["email"], "password": PASSWORD,
        })
        self.assertEqual(status, 200, data)
        self.assertEqual(data["account"]["id"], self.a["account"]["id"])
        self.assertFalse(data["account"]["isAdmin"])
        self.assertEqual(self.user_row(self.b), self.b_before)

    def test_email_escalation_and_other_email_changes_are_rejected(self):
        for route in self.ROUTES:
            for email in (ADMIN_EMAIL, self.b["account"]["email"], "different@example.test", "", None):
                with self.subTest(route=route[1], email=email):
                    status, data = self.update_profile(route, {"email": email, "name": "must not persist"})
                    self.assertEqual(status, 400, data)
                    self.assertEqual(self.user_row(self.a), self.a_before)
                    self.assertEqual(self.request("GET", "/api/admin/metrics", self.a["token"])[0], 403)
        self.assertEqual(self.request("POST", "/api/auth/login", payload={"email": ADMIN_EMAIL, "password": PASSWORD})[0], 401)
        self.assert_auth_unchanged()

    def test_readonly_and_nested_privilege_fields_never_replace_server_data(self):
        attack = {
            "id": self.b["account"]["id"], "provider": "google", "googleId": "attacker-google-subject",
            "roles": ["admin"], "isAdmin": True, "subscriptionTier": "admin", "plan": "admin",
            "subscription": {"tier": "admin"}, "serverMetadata": {"isAdmin": True},
            "profile": {"email": ADMIN_EMAIL, "roles": ["admin"]},
            "permissions": {"isAdmin": True}, "passwordHash": "client-supplied",
            "createdAt": "1900-01-01T00:00:00Z", "updatedAt": "1900-01-01T00:00:00Z",
            "name": "Allowed profile name",
        }
        for route in self.ROUTES:
            with self.subTest(route=route[1]):
                status, data = self.update_profile(route, attack)
                self.assertEqual(status, 200, data)
                account = data["account"]
                self.assertFalse(account["isAdmin"])
                self.assertEqual(account["id"], self.a["account"]["id"])
                self.assertEqual(account["name"], attack["name"])
                for field, expected in self.metadata.items():
                    self.assertEqual(account[field], expected, field)
                stored = json.loads(self.user_row(self.a)["account_json"])
                for field in ("isAdmin", "profile", "permissions", "passwordHash"):
                    self.assertNotIn(field, stored)
                self.assertEqual(account["createdAt"], self.a["account"]["createdAt"])
                self.assertNotEqual(account["updatedAt"], attack["updatedAt"])
                self.assertEqual(self.request("GET", "/api/admin/metrics", self.a["token"])[0], 403)
        self.assert_auth_unchanged()

    def test_normal_full_profile_roundtrip_retains_metadata_and_login(self):
        for route in self.ROUTES:
            with self.subTest(route=route[1]):
                updates = {
                    **self.a["account"], "name": "Quant Candidate", "country": "us", "region": "Illinois",
                    "email": f" {self.a['account']['email'].upper()} ", "graduationTerm": "2027-spring", "picture": "",
                }
                status, data = self.update_profile(route, updates)
                self.assertEqual(status, 200, data)
                for field, expected in self.metadata.items():
                    self.assertEqual(data["account"][field], expected, field)
                for field in ("name", "country", "region", "graduationTerm", "picture"):
                    self.assertEqual(data["account"][field], updates[field], field)
                self.assertEqual(data["account"]["email"], self.a["account"]["email"])
                self.assert_auth_unchanged()

    def test_malformed_profiles_and_nested_editable_values_fail_without_changes(self):
        invalid = [None, [], "profile", 3, {"name": ""}, {"name": {"isAdmin": True}},
                   {"country": ["us"]}, {"region": False}, {"picture": {"roles": ["admin"]}},
                   {"graduationTerm": {"plan": "admin"}}]
        for route in self.ROUTES:
            for updates in invalid:
                with self.subTest(route=route[1], updates=updates):
                    status, data = self.update_profile(route, updates)
                    self.assertEqual(status, 400, data)
                    self.assertEqual(self.user_row(self.a), self.a_before)
        self.assert_auth_unchanged()

    def test_rejected_sync_account_does_not_partially_apply_state(self):
        status, before = self.request("GET", "/api/state", self.a["token"])
        self.assertEqual(status, 200, before)
        status, data = self.update_profile(self.ROUTES[1], {"email": ADMIN_EMAIL}, state={"fixtureMarker": "must not persist"})
        self.assertEqual(status, 400, data)
        self.assertEqual(self.request("GET", "/api/state", self.a["token"])[1], before)
        self.assertEqual(self.user_row(self.a), self.a_before)
        self.assertEqual(self.user_row(self.b), self.b_before)

    def test_success_waits_for_commit_and_survives_immediate_process_loss(self):
        for route in self.ROUTES:
            with self.subTest(route=route[1]):
                name = f"Committed via {route[0]}"
                # A SQLite reader allows the update but blocks COMMIT. Returning
                # HTTP 200 before releasing this reader would acknowledge data
                # that the process could still lose. This is deterministic, unlike
                # racing a fast commit with a process kill alone.
                with ThreadPoolExecutor(max_workers=1) as executor:
                    reader = sqlite3.connect(self.database)
                    try:
                        reader.execute("BEGIN")
                        reader.execute("SELECT account_json FROM users WHERE id = ?", (self.a["account"]["id"],)).fetchone()
                        future = executor.submit(self.update_profile, route, {"name": name})
                        journal = Path(str(self.database) + "-journal")
                        deadline = time.monotonic() + 3
                        while not journal.exists() and not future.done() and time.monotonic() < deadline:
                            time.sleep(0.01)
                        self.assertTrue(journal.exists(), "API did not reach the write transaction")
                        time.sleep(0.15)
                        self.assertFalse(future.done(), "HTTP response was sent before the blocked commit")
                    finally:
                        reader.rollback()
                        reader.close()
                    status, data = future.result(timeout=5)
                    self.assertEqual(status, 200, data)
                self.stop_server()
                self.start_server()
                status, data = self.request("GET", "/api/account", self.a["token"])
                self.assertEqual(status, 200, data)
                self.assertEqual(data["account"]["name"], name)
                for field, expected in self.metadata.items():
                    self.assertEqual(data["account"][field], expected, field)
                self.assert_auth_unchanged()


if __name__ == "__main__":
    unittest.main(verbosity=2)
