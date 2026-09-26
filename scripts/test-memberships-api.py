#!/usr/bin/env python3
"""Membership integration checks against isolated storage and HTTP sessions."""
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
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


class MembershipApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="qg-membership-test-")
        cls.directory = Path(cls.tmp.name)
        cls.database = cls.directory / "test.sqlite"
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.catalog = [
            {"id": "member-problem", "source": "question-bank", "visibility": "private", "titleZh": "Member fixture", "promptZh": "Private question fixture", "answer": "Member solution"},
            {"id": "public-member-problem", "source": "question-bank", "visibility": "public", "titleZh": "Public membership fixture", "promptZh": "Must still require membership"},
            {"id": "public-problem", "source": "quantguide", "visibility": "public", "titleZh": "Public fixture", "promptZh": "Public question fixture"},
            {"id": "private-free-problem", "source": "interview-xiaohongshu", "visibility": "private", "titleZh": "Signed-in fixture", "promptZh": "Other banks remain available"},
        ]
        catalog_file = cls.directory / "catalog.json"
        catalog_file.write_text(json.dumps(cls.catalog))
        bundle_file = cls.directory / "technical-bundle.json"
        bundle_file.write_text(json.dumps({"version": 1, "source": "question-bank", "problems": [cls.catalog[0]],
                                          "supplements": {}, "metadata": {"problemCount": 1}}))
        cls.environment = {**os.environ, "QUANTGYM_HOST": "127.0.0.1", "PORT": str(cls.port),
            "QUANTGYM_DB": str(cls.database), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_POSTGRES_DATABASE_URL": "", "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(catalog_file), "QUANTGYM_JOBS_CATALOG": str(catalog_file),
            "QUANTGYM_TECHNICAL_BUNDLE_PATH": str(bundle_file), "QUANTGYM_PRIVATE_WORKSPACES": "0",
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "", "QUANTGYM_ADMIN_EMAILS": "admin@example.invalid",
            "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500", "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX": "500",
            "QUANTGYM_SMTP_HOST": "", "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": ""}
        cls.log = (cls.directory / "server.log").open("w+")
        cls.start_server()
        cls.admin = cls.register("admin@example.invalid")

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen([sys.executable, str(ROOT / "api-server/server.py")], env=cls.environment,
                                       cwd=ROOT, stdout=cls.log, stderr=cls.log)
        for _ in range(150):
            try:
                if cls.request("GET", "/health")[0] == 200: return
            except OSError: pass
            if cls.process.poll() is not None: break
            time.sleep(.1)
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
        if token: headers["Authorization"] = f"Bearer {token}"
        try:
            conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally: conn.close()

    @classmethod
    def register(cls, email, **extra):
        status, payload = cls.request("POST", "/api/auth/register", {"password": "MemberFixture1234", "account": {
            "email": email, "name": "Member fixture", "provider": "local", **extra}})
        if status != 201: raise RuntimeError(payload)
        return payload

    def setUp(self):
        self.email = self._testMethodName + "@example.invalid"
        self.session = self.register(self.email)
        self.token = self.session["token"]

    def grant(self, email=None):
        result = self.request("POST", "/api/admin/memberships", {"email": email or self.email}, self.admin["token"])
        self.assertEqual(result[0], 200, result)
        return result[1]

    def revoke(self):
        result = self.request("DELETE", "/api/admin/memberships/" + quote(self.email, safe=""), token=self.admin["token"])
        self.assertEqual(result[0], 200, result)

    def problem_ids(self, token):
        status, result = self.request("GET", "/api/problems", token=token)
        self.assertEqual(status, 200, result)
        return {item["id"] for item in result["problems"]}

    def test_admin_authentication_and_invalid_email(self):
        for token, expected in [("", 401), (self.token, 403)]:
            for method, path, body in [("GET", "/api/admin/memberships", None),
                                       ("POST", "/api/admin/memberships", {"email": self.email}),
                                       ("DELETE", "/api/admin/memberships/" + quote(self.email), None)]:
                self.assertEqual(self.request(method, path, body, token)[0], expected)
        self.assertEqual(self.request("GET", "/api/membership")[0], 401)
        for email in ["", "invalid", "two@example.invalid extra@example.invalid", "a" * 250 + "@example.invalid"]:
            self.assertEqual(self.request("POST", "/api/admin/memberships", {"email": email}, self.admin["token"])[0], 400)
        self.assertEqual(self.request("GET", "/api/membership", token=self.admin["token"]), (200, {"isMember": True}))

    def test_catalog_grant_and_immediate_revoke_preserve_other_banks(self):
        self.assertEqual(self.problem_ids(""), {"public-problem"})
        self.assertEqual(self.problem_ids(self.token), {"public-problem", "private-free-problem"})
        self.assertEqual(self.request("GET", "/api/membership", token=self.token), (200, {"isMember": False}))
        self.grant("  " + self.email.upper() + "  ")
        self.grant()
        self.assertEqual(self.request("GET", "/api/membership", token=self.token), (200, {"isMember": True}))
        self.assertEqual(len(self.problem_ids(self.token)), 4)
        memberships = self.request("GET", "/api/admin/memberships", token=self.admin["token"])[1]["memberships"]
        self.assertEqual(sum(member["email"] == self.email for member in memberships), 1)
        self.revoke()
        self.assertEqual(self.request("GET", "/api/membership", token=self.token), (200, {"isMember": False}))
        self.assertEqual(self.problem_ids(self.token), {"public-problem", "private-free-problem"})
        self.grant()
        self.assertEqual(len(self.problem_ids(self.token)), 4)

    def test_social_routes_cannot_bypass_access(self):
        self.grant()
        self.assertEqual(self.request("POST", "/api/problem-social/member-problem/comments", {"text": "Private solution discussion"}, self.token)[0], 201)
        self.revoke()
        for method, suffix, body in [("GET", "", None), ("POST", "/like", {}), ("POST", "/comments", {"text": "not allowed"})]:
            self.assertEqual(self.request(method, "/api/problem-social/member-problem" + suffix, body, self.token)[0], 403)
        self.assertNotIn("member-problem", {item["problemId"] for item in self.request("GET", "/api/problem-social", token=self.token)[1]["problemSocial"]})

    def test_legacy_technical_endpoint_requires_membership(self):
        path = "/api/practice/technical/questions"
        self.assertEqual(self.request("GET", path)[0], 401)
        self.assertEqual(self.request("GET", path, token=self.token)[0], 403)
        self.grant()
        status, payload = self.request("GET", path, token=self.token)
        self.assertEqual(status, 200, payload)
        self.assertEqual(len(payload["questions"]), 1)
        self.revoke()
        self.assertEqual(self.request("GET", path, token=self.token)[0], 403)

    def test_embedded_state_sync_and_login_filter_revoked_catalog_keep_progress(self):
        self.grant()
        state = {"problems": self.catalog, "problemStates": [{"problemId": "member-problem", "favorite": True}]}
        self.assertEqual(self.request("PUT", "/api/state", {"state": state}, self.token)[0], 200)
        self.revoke()
        status, result = self.request("GET", "/api/state", token=self.token)
        self.assertEqual(status, 200)
        self.assertTrue(all(item["source"] != "question-bank" for item in result["state"]["problems"]))
        self.assertEqual(result["state"]["problemStates"], state["problemStates"])
        for method, path, body in [("POST", "/api/sync", {"state": state}), ("PUT", "/api/state", {"state": state})]:
            status, result = self.request(method, path, body, self.token)
            self.assertEqual(status, 200, result)
            self.assertTrue(all(item["source"] != "question-bank" for item in result["state"]["problems"]))
        status, login = self.request("POST", "/api/auth/login", {"email": self.email, "password": "MemberFixture1234"})
        self.assertEqual(status, 200, login)
        self.assertTrue(all(item["source"] != "question-bank" for item in login["state"]["problems"]))

    def test_grant_before_registration_and_persistence(self):
        email = "future-member@example.invalid"
        self.grant(email)
        future = self.register(email)
        self.assertEqual(self.request("GET", "/api/membership", token=future["token"]), (200, {"isMember": True}))
        self.stop_server()
        self.start_server()
        self.assertEqual(self.request("GET", "/api/membership", token=future["token"]), (200, {"isMember": True}))
        with sqlite3.connect(self.database) as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM registration_invitations").fetchone()[0], 0)

    def test_client_cannot_self_grant(self):
        spoof = self.register("spoof@example.invalid", isMember=True, isAdmin=True, subscriptionTier="admin")
        self.assertEqual(self.request("GET", "/api/membership", token=spoof["token"]), (200, {"isMember": False}))
        self.assertEqual(self.request("PATCH", "/api/account", {"updates": {"isMember": True, "isAdmin": True, "subscriptionTier": "admin"}}, self.token)[0], 200)
        self.assertEqual(self.request("GET", "/api/membership", token=self.token), (200, {"isMember": False}))


if __name__ == "__main__":
    unittest.main(verbosity=2)
