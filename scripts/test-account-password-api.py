#!/usr/bin/env python3
"""Password/profile API regression tests against disposable SQLite or --postgres.

Reuses the existing isolated HTTP harness; never contacts a deployed API,
reads a user's credentials or sends verification email.
"""
import importlib.util
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("account_auth_http_harness", ROOT / "scripts/test-leetcode-api.py")
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
base = harness.LeetCodeApiTests


class AccountPasswordApiTests(unittest.TestCase):
    setUpClass = base.__dict__["setUpClass"]
    tearDownClass = base.__dict__["tearDownClass"]
    start_postgres = base.__dict__["start_postgres"]
    request = base.request
    user = base.user

    def setUp(self):
        self.api.rate_limiter._hits.clear()

    def change(self, token, current="fixture-only-password", new="New-fixture-password-123", **extra):
        return self.request("POST", "/api/auth/change-password", token, {"currentPassword": current, "newPassword": new, **extra})

    def login(self, owner, password="fixture-only-password"):
        return self.request("POST", "/api/auth/login", payload={"email": owner + "@example.com", "password": password})

    def test_requires_valid_session_and_private_response(self):
        for token in (None, "synthetic-invalid-token"):
            status, data, headers = self.change(token)
            self.assertEqual(status, 401, data)
            self.assertIn("private", headers.get("Cache-Control", ""))
            self.assertIn("no-store", headers.get("Cache-Control", ""))

    def test_change_updates_cloud_password_and_revokes_only_owners_sessions(self):
        token, owner = self.user()
        other_token, _ = self.user()
        login_status, additional, _ = self.login(owner)
        self.assertEqual(login_status, 200, additional)
        second_token = additional["token"]
        self.assertEqual(self.request("GET", "/api/account", token)[0], 200)
        status, data, _ = self.change(token)
        self.assertEqual(status, 200, data)
        self.assertEqual(set(data), {"token", "account", "state", "problemStates", "community"})
        self.assertEqual(data["account"]["id"], owner)
        self.assertEqual(data["account"]["email"], owner + "@example.com")
        self.assertNotEqual(data["token"], token)
        self.assertNotIn("passwordHash", data["account"])
        self.assertNotIn("password_hash", data["account"])
        self.assertEqual(self.request("GET", "/api/account", data["token"])[0], 200)
        for previous in (token, second_token):
            self.assertEqual(self.request("GET", "/api/account", previous)[0], 401)
        self.assertEqual(self.request("GET", "/api/account", other_token)[0], 200)
        self.assertEqual(self.login(owner)[0], 401)
        self.assertEqual(self.login(owner, "New-fixture-password-123")[0], 200)

    def test_wrong_current_password_does_not_expire_valid_session(self):
        token, owner = self.user()
        status, data, _ = self.change(token, current="wrong-fixture-password")
        self.assertEqual(status, 400, data)
        self.assertEqual(data["error"], "Current password is incorrect")
        self.assertEqual(self.request("GET", "/api/account", token)[0], 200)
        self.assertEqual(self.login(owner)[0], 200)

    def test_validation_preserves_account(self):
        token, _ = self.user()
        for value in ("short1", "onlyletters", "123456789", None, 12345678, "A1" * 2049):
            self.assertEqual(self.change(token, new=value)[0], 400)
        self.assertEqual(self.change(token, userId="different-owner")[0], 400)
        self.assertEqual(self.change(token, current="")[0], 400)
        self.assertEqual(self.request("GET", "/api/account", token)[0], 200)

    def test_google_accounts_cannot_set_password_through_this_route(self):
        token, owner = self.user()
        with self.api.db.connect() as conn:
            conn.execute("UPDATE users SET provider = 'google' WHERE id = ?", (owner,))
        status, data, _ = self.change(token)
        self.assertEqual(status, 400, data)
        self.assertIn("Google", data["error"])
        self.assertEqual(self.request("GET", "/api/account", token)[0], 200)

    def test_rate_limit_applies_without_revoking_session(self):
        token, _ = self.user()
        for _ in range(10):
            self.assertEqual(self.change(token, current="wrong-fixture-password")[0], 400)
        self.assertEqual(self.change(token)[0], 429)
        self.assertEqual(self.request("GET", "/api/account", token)[0], 200)

    def test_profile_writes_keep_login_identity_and_password_intact(self):
        for method, path, field in (("PATCH", "/api/account", "updates"), ("POST", "/api/sync", "account")):
            token, owner = self.user()
            renamed = owner + "-renamed@example.com"
            updates = {"id": "different-user", "provider": "google", "email": renamed, "name": "Updated display name", "passwordHash": "untrusted-client-hash"}
            status, data, _ = self.request(method, path, token, {field: updates})
            if method == "PATCH":
                self.assertEqual(status, 403, data)
                account = self.request("GET", "/api/account", token)[1]["account"]
            else:
                self.assertEqual(status, 200, data)
                account = data["account"]
                self.assertEqual(account["name"], "Updated display name")
            self.assertEqual(account["id"], owner)
            self.assertEqual(account["provider"], "local")
            self.assertEqual(account["email"], owner + "@example.com")
            self.assertEqual(self.login(owner)[0], 200)
            self.assertFalse(self.request("GET", "/api/auth/account-status?email=" + renamed)[1]["exists"])

    def test_profile_sync_after_password_change_does_not_restore_old_password(self):
        token, owner = self.user()
        status, changed, _ = self.change(token)
        self.assertEqual(status, 200, changed)
        status, _, _ = self.request("POST", "/api/sync", changed["token"], {"account": {"email": owner + "@example.com", "passwordHash": "stale-local-hash"}})
        self.assertEqual(status, 200)
        self.assertEqual(self.login(owner)[0], 401)
        self.assertEqual(self.login(owner, "New-fixture-password-123")[0], 200)

    def test_graduation_term_survives_registration_profile_sync_and_login(self):
        owner = "graduation-term-fixture"
        private_fields = {key: "fixture-private-value" for key in (
            "password", "passwordHash", "password_hash", "password_salt", "token", "refreshToken"
        )}
        status, registered, _ = self.request("POST", "/api/auth/register", payload={
            "password": "fixture-only-password",
            "account": {"id": owner, "provider": "local", "email": owner + "@example.com",
                        "name": "Graduation fixture", "graduationTerm": "2027-09", **private_fields},
        })
        self.assertEqual(status, 201, registered)
        token = registered["token"]

        def assert_profile(account, term):
            self.assertEqual(account["id"], owner)
            self.assertEqual(account["graduationTerm"], term)
            for field in private_fields:
                self.assertNotIn(field, account)

        assert_profile(registered["account"], "2027-09")
        for method, path, field, changes, expected in (
            ("PATCH", "/api/account", "updates", {"name": "Renamed fixture"}, "2027-09"),
            ("PATCH", "/api/account", "updates", {"graduationTerm": "2028-06"}, "2028-06"),
            ("POST", "/api/sync", "account", {"graduationTerm": " 2029-09 "}, "2029-09"),
        ):
            status, result, _ = self.request(method, path, token, {field: {**changes, **private_fields}})
            self.assertEqual(status, 200, result)
            assert_profile(result["account"], expected)
            status, account, _ = self.request("GET", "/api/account", token)
            self.assertEqual(status, 200, account)
            assert_profile(account["account"], expected)
            status, signed_in, _ = self.login(owner)
            self.assertEqual(status, 200, signed_in)
            assert_profile(signed_in["account"], expected)

    def test_graduation_term_sanitization_keeps_older_profiles_compatible(self):
        self.assertNotIn("graduationTerm", self.api.sanitize_account({"id": "old-profile"}))
        for value in (None, "", "2027-00", "2027-13", "2027-9", "<script>", 202709, {"year": 2027}):
            with self.subTest(value=value):
                account = self.api.sanitize_account({"id": "invalid-term", "graduationTerm": value})
                self.assertNotIn("graduationTerm", account)

    def test_two_changes_using_same_old_password_have_only_one_winner(self):
        token, owner = self.user()
        verify = self.api.verify_password
        barrier = threading.Barrier(2)
        def synchronized_verify(*args):
            result = verify(*args)
            barrier.wait(timeout=5)
            return result
        with patch.object(self.api, "verify_password", side_effect=synchronized_verify):
            with ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(self.change, token, new=f"New-password-choice-{index}") for index in (1, 2)]
                results = [future.result(timeout=10) for future in futures]
        self.assertEqual(sorted(result[0] for result in results), [200, 409])
        winner = next(result[1] for result in results if result[0] == 200)
        self.assertEqual(self.request("GET", "/api/account", winner["token"])[0], 200)
        self.assertEqual(self.request("GET", "/api/account", token)[0], 401)


del base

if __name__ == "__main__":
    unittest.main()
