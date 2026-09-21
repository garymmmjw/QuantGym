#!/usr/bin/env python3
"""Real HTTP account regression tests using a disposable SQLite database."""
import http.client
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]

class AccountApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="qg-account-test-")
        directory = Path(cls.tmp.name)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        catalog = directory / "catalog.json"
        catalog.write_text("[]")
        env = {**os.environ, "QUANTGYM_HOST": "127.0.0.1", "PORT": str(cls.port),
               "QUANTGYM_DB": str(directory / "test.sqlite"), "QUANTGYM_DB_BACKEND": "sqlite",
               "QUANTGYM_POSTGRES_DATABASE_URL": "", "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
               "QUANTGYM_PROBLEM_CATALOG": str(catalog), "QUANTGYM_MEDIA_ROOT": str(directory / "media"),
               "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0", "QUANTGYM_BETA_EMAIL_ALLOWLIST": "",
               "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500", "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX": "500",
               "QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX": "500", "QUANTGYM_SMTP_HOST": "",
               "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": ""}
        cls.log = (directory / "server.log").open("w+")
        cls.process = subprocess.Popen([os.environ.get("PYTHON", "python3"), str(ROOT / "api-server/server.py")], env=env, cwd=ROOT, stdout=cls.log, stderr=cls.log)
        for _ in range(150):
            try:
                if cls.request("GET", "/health")[0] == 200: return
            except OSError: pass
            if cls.process.poll() is not None: break
            time.sleep(.1)
        cls.log.seek(0)
        raise RuntimeError(cls.log.read())

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=10)
        cls.log.close()
        cls.tmp.cleanup()

    @classmethod
    def request(cls, method, path, body=None, token=""):
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if token: headers["Authorization"] = f"Bearer {token}"
        conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        response = conn.getresponse()
        payload = json.loads(response.read())
        conn.close()
        return response.status, payload

    def setUp(self):
        self.email = f"{self._testMethodName}@example.invalid"
        code, self.session = self.request("POST", "/api/auth/register", {"password": "Original1234", "account": {"email": self.email, "name": "Account fixture", "provider": "local"}})
        self.assertEqual(code, 201, self.session)
        self.token = self.session["token"]

    def test_profile_preferences_connection_roundtrip(self):
        update = {"name": "Updated", "graduationTerm": "2028-06", "country": "unitedStates", "region": "California", "goal": "Quant research", "preferences": {"language": "en", "theme": "dark"}, "integrations": {"leetcode": {"site": "leetcode.cn", "username": "fixture_user"}}}
        code, response = self.request("PATCH", "/api/account", {"updates": update}, self.token)
        self.assertEqual(code, 200, response)
        code, login = self.request("POST", "/api/auth/login", {"email": self.email, "password": "Original1234"})
        self.assertEqual(code, 200)
        for key, value in update.items(): self.assertEqual(login["account"][key], value)
        self.assertNotIn("passwordHash", login["account"])
        self.assertEqual(self.request("PATCH", "/api/account", {"updates": {"integrations": {"leetcode": {"site": "evil.invalid", "username": "bad"}}}}, self.token)[0], 400)
        self.assertEqual(self.request("PATCH", "/api/account", {"updates": {"integrations": {"leetcode": None}}}, self.token)[0], 200)
        self.assertIsNone(self.request("GET", "/api/account", token=self.token)[1]["account"]["integrations"]["leetcode"])

    def test_password_rejects_wrong_current_and_revokes_other_sessions(self):
        other = self.request("POST", "/api/auth/login", {"email": self.email, "password": "Original1234"})[1]["token"]
        self.assertEqual(self.request("POST", "/api/auth/change-password", {"currentPassword": "wrong", "newPassword": "Updated5678"}, self.token)[0], 400)
        self.assertEqual(self.request("POST", "/api/auth/change-password", {"currentPassword": "Original1234", "newPassword": "short"}, self.token)[0], 400)
        code, result = self.request("POST", "/api/auth/change-password", {"currentPassword": "Original1234", "newPassword": "Updated5678"}, self.token)
        self.assertEqual(code, 200, result)
        self.assertEqual(self.request("GET", "/api/account", token=other)[0], 401)
        self.assertEqual(self.request("GET", "/api/account", token=self.token)[0], 401)
        self.assertEqual(self.request("GET", "/api/account", token=result["token"])[0], 200)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": self.email, "password": "Original1234"})[0], 401)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": self.email, "password": "Updated5678"})[0], 200)

    def test_email_change_rehashes_password_and_sync_cannot_override_identity(self):
        new_email = "changed@example.invalid"
        self.assertEqual(self.request("PATCH", "/api/account", {"updates": {"email": new_email}, "currentPassword": "wrong"}, self.token)[0], 403)
        code, result = self.request("PATCH", "/api/account", {"updates": {"email": new_email}, "currentPassword": "Original1234"}, self.token)
        self.assertEqual(code, 200, result)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": self.email, "password": "Original1234"})[0], 401)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": new_email, "password": "Original1234"})[0], 200)
        code, result = self.request("POST", "/api/sync", {"account": {"email": self.email, "provider": "google", "id": "other"}}, self.token)
        self.assertEqual(code, 200, result)
        account = self.request("GET", "/api/account", token=self.token)[1]["account"]
        self.assertEqual(account["email"], new_email)
        self.assertEqual(account["provider"], "local")
        self.assertEqual(account["id"], self.session["account"]["id"])

    def test_other_user_and_privileged_fields_are_not_writable(self):
        code, result = self.request("PATCH", "/api/account", {"updates": {"id": "other", "isAdmin": True, "subscriptionTier": "admin", "plan": "admin", "passwordHash": "bad"}}, self.token)
        self.assertEqual(code, 200, result)
        self.assertEqual(result["account"]["id"], self.session["account"]["id"])
        self.assertFalse(result["account"]["isAdmin"])
        self.assertNotIn("subscriptionTier", result["account"])
        self.assertEqual(self.request("POST", "/api/auth/change-password", {"newPassword": "Other1234"})[0], 401)

    def test_profile_and_sync_preserve_server_managed_links_and_subscription(self):
        account = {**self.session["account"], "googleId": "google-fixture", "googleLinkedAt": "2026-09-18", "subscriptionTier": "pro"}
        with sqlite3.connect(Path(self.tmp.name) / "test.sqlite") as db:
            db.execute("UPDATE users SET account_json = ? WHERE id = ?", (json.dumps(account), account["id"]))
        for path, method, body in [("/api/account", "PATCH", {"updates": {"name": "Changed", "googleId": "attacker", "subscriptionTier": "admin"}}), ("/api/sync", "POST", {"account": {"goal": "Updated goal", "googleId": "attacker", "subscriptionTier": "admin"}})]:
            self.assertEqual(self.request(method, path, body, self.token)[0], 200)
            saved = self.request("GET", "/api/account", token=self.token)[1]["account"]
            self.assertEqual(saved["googleId"], "google-fixture")
            self.assertEqual(saved["subscriptionTier"], "pro")
        self.assertEqual(self.request("PATCH", "/api/account", {"updates": {"email": "different@example.invalid"}, "currentPassword": "Original1234"}, self.token)[0], 400)

if __name__ == "__main__": unittest.main(verbosity=2)
