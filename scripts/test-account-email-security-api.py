#!/usr/bin/env python3
"""Email-change security checks with real HTTP and disposable local storage.

Mail is captured by a deterministic in-process SMTP substitute; these tests never
send messages or contact a deployed API. --postgres creates and stops a private
local cluster instead of accepting a supplied database URL.
"""
from concurrent.futures import ThreadPoolExecutor
import http.client
import importlib.util
from itertools import count
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
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "OriginalFixture1234"
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")


class AccountEmailSecurityApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="qg-email-security-", dir="/tmp")
        cls.directory = Path(cls.tmp.name)
        cls.pg_started = False
        cls.server = None
        cls.log = (cls.directory / "postgres.log").open("w+")
        catalog = cls.directory / "catalog.json"
        catalog.write_text("[]", encoding="utf-8")
        environment = {key: value for key, value in os.environ.items()
                       if not key.startswith("QUANTGYM_") and key not in {"DATABASE_URL", "PORT", "HOST"}}
        environment.update({
            "QUANTGYM_HOST": "127.0.0.1", "QUANTGYM_DB": str(cls.directory / "test.sqlite"),
            "QUANTGYM_DB_BACKEND": "sqlite", "QUANTGYM_PROBLEM_CATALOG": str(catalog),
            "QUANTGYM_JOBS_CATALOG": str(catalog), "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0",
            "QUANTGYM_ADMIN_EMAILS": "unclaimed-admin@example.invalid", "QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS": "0",
            "QUANTGYM_EMAIL_DEV_CODE_RESPONSE": "1", "QUANTGYM_ACCOUNT_EMAIL_CHANGE_DEV_CODES": "0",
            "QUANTGYM_SMTP_HOST": "smtp-fixture.example.invalid", "QUANTGYM_PBKDF2_ROUNDS": "1000",
            "QUANTGYM_AUTH_RATE_LIMIT_MAX": "1000", "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "1000",
            "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX": "1000", "QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX": "1000",
            "QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX": "1000", "PYTHONDONTWRITEBYTECODE": "1",
        })
        cls.environment = patch.dict(os.environ, environment, clear=True)
        cls.environment.start()
        try:
            if USE_POSTGRES:
                cls.start_postgres()
            sys.path.insert(0, str(ROOT / "api-server"))
            spec = importlib.util.spec_from_file_location("email_security_test_server", ROOT / "api-server/server.py")
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
        except Exception:
            cls.tearDownClass()
            raise

    @classmethod
    def start_postgres(cls):
        bindir = Path("/opt/homebrew/bin")
        initdb = shutil.which("initdb") or str(bindir / "initdb")
        cls.pg_ctl = shutil.which("pg_ctl") or str(bindir / "pg_ctl")
        cls.pg_data = cls.directory / "postgres"
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        subprocess.run([initdb, "-D", str(cls.pg_data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, stdout=cls.log, stderr=cls.log)
        subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-l", str(cls.directory / "postgres-server.log"), "-w", "-o", f"-h 127.0.0.1 -p {port} -k {cls.directory}", "start"], check=True, stdout=cls.log, stderr=cls.log)
        cls.pg_started = True
        os.environ.update(QUANTGYM_DB_BACKEND="postgres", QUANTGYM_POSTGRES_DATABASE_URL=f"postgresql://fixture_admin@127.0.0.1:{port}/postgres")

    @classmethod
    def tearDownClass(cls):
        if cls.server is not None:
            cls.server.shutdown()
            cls.server.server_close()
            cls.thread.join(timeout=5)
        if cls.pg_started:
            subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=cls.log, stderr=cls.log)
        cls.environment.stop()
        cls.log.close()
        cls.tmp.cleanup()

    def setUp(self):
        self.api.rate_limiter._hits.clear()
        self.mail = []
        sequence = count(100000)
        self.generated_codes = patch.object(self.api, "generate_email_code", side_effect=lambda: f"{next(sequence):06d}")
        self.generated_codes.start()
        self.addCleanup(self.generated_codes.stop)

        def capture_mail(email, code, purpose):
            self.mail.append({"email": email, "code": code, "purpose": purpose})
            return "smtp"

        self.delivery = patch.object(self.api, "send_email_verification_code", side_effect=capture_mail)
        self.delivery_mock = self.delivery.start()
        self.addCleanup(self.delivery.stop)
        self.email = self.address()
        self.session = self.register(self.email)
        self.token = self.session["token"]
        self.owner = self.session["account"]["id"]

    def address(self):
        return "email-fixture-" + uuid4().hex + "@example.invalid"

    def request(self, method, path, body=None, token="", extra_headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=15)
        headers = {"Content-Type": "application/json"}
        headers.update(extra_headers or {})
        if token:
            headers["Authorization"] = "Bearer " + token
        try:
            connection.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read()), dict(response.getheaders())
        finally:
            connection.close()

    def register(self, email, **account):
        status, data, _ = self.request("POST", "/api/auth/register", {"password": PASSWORD, "account": {"email": email, "provider": "local", "name": "Security fixture", **account}})
        self.assertEqual(status, 201, data)
        return data

    def login(self, email=None, password=PASSWORD):
        return self.request("POST", "/api/auth/login", {"email": email or self.email, "password": password})

    def send_code(self, email, token=None, password=PASSWORD):
        return self.request("POST", "/api/account/email-verification-code", {"email": email, "currentPassword": password}, self.token if token is None else token)

    def code(self, email, token=None, password=PASSWORD):
        status, response, headers = self.send_code(email, token, password)
        self.assertEqual(status, 200, response)
        self.assertNotIn("devCode", response)
        self.assertNotIn("code", response)
        self.assertIn("no-store", headers.get("Cache-Control", ""))
        self.assertEqual(self.mail[-1]["email"], email.lower().strip())
        return self.mail[-1]["code"]

    def change(self, email, code=None, token=None, password=PASSWORD, **updates):
        body = {"updates": {"email": email, **updates}, "currentPassword": password}
        if code is not None:
            body["verificationCode"] = code
        return self.request("PATCH", "/api/account", body, self.token if token is None else token)

    def account(self, token=None):
        status, data, _ = self.request("GET", "/api/account", token=self.token if token is None else token)
        self.assertEqual(status, 200, data)
        return data["account"]

    def assert_identity_unchanged(self):
        self.assertEqual(self.account()["email"], self.email)
        self.assertFalse(self.account()["isAdmin"])
        self.assertEqual(self.login()[0], 200)

    def expire_pending(self):
        with self.api.db.connect() as conn:
            conn.execute("UPDATE account_email_change_codes SET expires_at = ? WHERE user_id = ?", ("2000-01-01T00:00:00Z", self.owner))

    def grant_member(self, email):
        now = self.api.utc_now()
        with self.api.db.connect() as conn:
            conn.execute("INSERT INTO memberships (email_norm, added_by, created_at, updated_at) VALUES (?, ?, ?, ?)", (email, self.owner, now, now))

    def test_missing_code_blocks_unclaimed_admin_and_member_emails(self):
        member = self.address()
        self.grant_member(member)
        for target in ("unclaimed-admin@example.invalid", member):
            status, data, _ = self.change(target)
            self.assertEqual(status, 400, data)
            self.assert_identity_unchanged()
            self.assertEqual(self.request("GET", "/api/membership", token=self.token)[1], {"isMember": False})
            self.assertEqual(self.request("GET", "/api/admin/memberships", token=self.token)[0], 403)

    def test_request_requires_session_current_password_and_valid_target(self):
        target = self.address()
        for token in ("", "invalid-session"):
            self.assertEqual(self.send_code(target, token=token)[0], 401)
        self.assertEqual(self.send_code(target, password="wrong")[0], 403)
        self.assertEqual(self.send_code(target, password="")[0], 403)
        self.assertEqual(self.send_code("invalid-email")[0], 400)
        self.assertEqual(self.send_code(self.email)[0], 400)
        self.delivery_mock.assert_not_called()
        self.assert_identity_unchanged()

    def test_issuing_code_does_not_change_identity_or_permissions(self):
        target = self.address()
        self.grant_member(target)
        self.code(target)
        self.assert_identity_unchanged()
        self.assertEqual(self.login(target)[0], 401)
        self.assertEqual(self.request("GET", "/api/membership", token=self.token)[1], {"isMember": False})

    def test_valid_email_change_preserves_profile_password_and_revokes_other_sessions(self):
        second = self.login()[1]["token"]
        unrelated = self.register(self.address())["token"]
        state = {"notes": [{"id": "saved-note", "text": "Private fixture"}]}
        self.assertEqual(self.request("PUT", "/api/state", {"state": state}, self.token)[0], 200)
        target = self.address()
        code = self.code(target)
        status, data, _ = self.change(target.upper(), code, name="Renamed fixture", goal="Preserved goal")
        self.assertEqual(status, 200, data)
        self.assertEqual(data["account"]["id"], self.owner)
        self.assertEqual(data["account"]["email"], target)
        self.assertEqual(data["account"]["name"], "Renamed fixture")
        self.assertEqual(data["account"]["goal"], "Preserved goal")
        self.assertNotIn("passwordHash", data["account"])
        self.assertEqual(self.login()[0], 401)
        self.assertEqual(self.login(target)[0], 200)
        self.assertEqual(self.request("GET", "/api/account", token=second)[0], 401)
        self.assertEqual(self.request("GET", "/api/account", token=unrelated)[0], 200)
        self.assertEqual(self.account()["email"], target)
        self.assertEqual(self.request("GET", "/api/state", token=self.token)[1]["state"]["notes"], state["notes"])

    def test_wrong_code_attempts_are_persistent_and_cannot_be_bruteforced(self):
        target = self.address()
        code = self.code(target)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(self.api.EMAIL_CODE_MAX_ATTEMPTS):
            self.assertEqual(self.change(target, wrong)[0], 400)
        self.assertIn(self.change(target, code)[0], (400, 429))
        self.assert_identity_unchanged()

    def test_wrong_password_expired_and_wrong_target_codes_fail_without_partial_profile(self):
        target = self.address()
        code = self.code(target)
        self.assertEqual(self.change(target, code, password="wrong")[0], 403)
        self.assertEqual(self.change(self.address(), code)[0], 400)
        self.expire_pending()
        self.assertEqual(self.change(target, code, name="Must not save")[0], 400)
        self.assert_identity_unchanged()
        self.assertEqual(self.account()["name"], "Security fixture")

    def test_cross_account_and_register_reset_codes_cannot_change_email(self):
        target = self.address()
        other = self.register(self.address())
        code = self.code(target)
        self.assertEqual(self.change(target, code, token=other["token"])[0], 400)
        status, data, _ = self.request("POST", "/api/auth/verification-code", {"email": target, "purpose": "register"})
        self.assertEqual(status, 200, data)
        register_code = self.mail[-1]["code"]
        self.assertEqual(self.change(target, register_code)[0], 400)
        status, data, _ = self.request("POST", "/api/auth/verification-code", {"email": self.email, "purpose": "password_reset"})
        self.assertEqual(status, 200, data)
        reset_code = self.mail[-1]["code"]
        self.assertEqual(self.change(target, reset_code)[0], 400)
        self.assert_identity_unchanged()
        self.assertEqual(self.change(target, code)[0], 200)

    def test_resend_replaces_previous_code_and_success_consumes_pending(self):
        target = self.address()
        with patch.object(self.api, "generate_email_code", side_effect=["123456", "654321"]):
            old_code = self.code(target)
            code = self.code(target)
        self.assertEqual(self.change(target, old_code)[0], 400)
        self.assertEqual(self.change(target, code)[0], 200)
        with self.api.db.connect() as conn:
            row = conn.execute("SELECT consumed_at FROM account_email_change_codes WHERE user_id = ?", (self.owner,)).fetchone()
        self.assertTrue(row is None or row["consumed_at"])
        self.assertEqual(self.change(target, code)[0], 409)
        self.assertEqual(self.change(self.email, code)[0], 400)
        self.assertEqual(self.account()["email"], target)

    def test_password_change_invalidates_pending_even_with_new_password(self):
        target = self.address()
        code = self.code(target)
        new_password = "ChangedFixture5678"
        status, data, _ = self.request("POST", "/api/auth/change-password", {"currentPassword": PASSWORD, "newPassword": new_password}, self.token)
        self.assertEqual(status, 200, data)
        self.token = data["token"]
        self.assertEqual(self.change(target, code, password=new_password)[0], 400)
        self.assertEqual(self.account()["email"], self.email)
        fresh = self.code(target, password=new_password)
        self.assertEqual(self.change(target, fresh, password=new_password)[0], 200)
        self.assertEqual(self.login(target, new_password)[0], 200)

    def test_password_reset_invalidates_pending_email_code(self):
        target = self.address()
        code = self.code(target)
        status, data, _ = self.request("POST", "/api/auth/verification-code", {"email": self.email, "purpose": "password_reset"})
        self.assertEqual(status, 200, data)
        reset_code = self.mail[-1]["code"]
        password = "ResetFixture5678"
        status, data, _ = self.request("POST", "/api/auth/reset-password", {"email": self.email, "password": password, "verificationCode": reset_code})
        self.assertEqual(status, 200, data)
        self.token = data["token"]
        self.assertEqual(self.change(target, code, password=password)[0], 400)
        self.assertEqual(self.account()["email"], self.email)

    def test_existing_email_collision_checked_before_send_and_after_issue(self):
        taken = self.address()
        self.register(taken)
        self.assertEqual(self.send_code(taken)[0], 409)
        self.delivery_mock.assert_not_called()
        target = self.address()
        code = self.code(target)
        self.register(target)
        self.assertEqual(self.change(target, code)[0], 409)
        self.assert_identity_unchanged()

    def test_profile_sync_and_registration_cannot_supply_privileged_fields(self):
        spoof = {"isAdmin": True, "isMember": True, "subscriptionTier": "admin", "plan": "admin", "admin_granted_at": "2026-01-01T00:00:00Z", "adminGrantedAt": "2026-01-01T00:00:00Z"}
        new_account = self.register(self.address(), **spoof)
        self.assertFalse(new_account["account"]["isAdmin"])
        self.assertEqual(self.request("GET", "/api/membership", token=new_account["token"])[1], {"isMember": False})
        for method, path, field in (("PATCH", "/api/account", "updates"), ("POST", "/api/sync", "account")):
            status, data, _ = self.request(method, path, {field: {**spoof, "name": "Normal profile change"}}, self.token)
            self.assertEqual(status, 200, data)
            self.assertFalse(self.account()["isAdmin"])
            self.assertEqual(self.account()["name"], "Normal profile change")
            self.assertEqual(self.request("GET", "/api/admin/memberships", token=self.token)[0], 403)
        status, data, _ = self.request("POST", "/api/sync", {"account": {"email": "unclaimed-admin@example.invalid", **spoof}}, self.token)
        self.assertEqual(status, 200, data)
        self.assert_identity_unchanged()

    def test_changing_to_configured_admin_email_never_grants_admin(self):
        target = "unclaimed-admin@example.invalid"
        code = self.code(target)
        status, data, _ = self.change(target, code)
        self.assertEqual(status, 200, data)
        self.assertFalse(data["account"]["isAdmin"])
        self.assertEqual(self.request("GET", "/api/admin/memberships", token=self.token)[0], 403)
        # Release the fixture address for other tests without granting any role.
        self.assertEqual(self.change(self.email, self.code(self.email))[0], 200)

    def test_delivery_failure_and_missing_smtp_do_not_enable_account_changes(self):
        target = self.address()
        with patch.object(self.api, "SMTP_HOST", ""), patch.object(self.api, "ACCOUNT_EMAIL_CHANGE_DEV_CODES", False):
            status, data, _ = self.send_code(target)
            self.assertEqual(status, 503, data)
        self.delivery_mock.assert_not_called()
        with patch.object(self.api, "send_email_verification_code", side_effect=OSError("SMTP fixture unavailable")):
            self.assertEqual(self.send_code(target)[0], 502)
        self.assert_identity_unchanged()
        self.assertEqual(self.change(target, "123456")[0], 400)

    def test_development_code_response_requires_explicit_loopback_mode(self):
        target = self.address()
        with patch.object(self.api, "SMTP_HOST", ""), patch.object(self.api, "ACCOUNT_EMAIL_CHANGE_DEV_CODES", True), patch.object(self.api, "send_email_verification_code", return_value="dev"):
            status, data, _ = self.send_code(target)
            self.assertEqual(status, 200, data)
            self.assertRegex(data["devCode"], r"^\d{6}$")
            self.assertEqual(data["delivery"], "dev")
            for extra_headers in ({"X-Forwarded-For": "127.0.0.1"}, {"Origin": "https://outside.example.invalid"}):
                status, payload, _ = self.request("POST", "/api/account/email-verification-code", {"email": self.address(), "currentPassword": PASSWORD}, self.token, extra_headers)
                self.assertEqual(status, 503, payload)
            with patch.object(self.api, "HOST", "0.0.0.0"):
                self.assertEqual(self.send_code(self.address())[0], 503)
            self.assertEqual(self.change(target, data["devCode"])[0], 200)

    def test_google_provider_and_linked_accounts_cannot_request_or_change_email(self):
        target = self.address()
        code = self.code(target)
        with self.api.db.connect() as conn:
            account = self.account()
            account["googleId"] = "google:fixture"
            conn.execute("UPDATE users SET account_json = ? WHERE id = ?", (json.dumps(account), self.owner))
        self.assertEqual(self.send_code(target)[0], 400)
        self.assertEqual(self.change(target, code)[0], 400)
        with self.api.db.connect() as conn:
            account.pop("googleId")
            conn.execute("UPDATE users SET provider = 'google', account_json = ? WHERE id = ?", (json.dumps(account), self.owner))
        self.assertEqual(self.send_code(target)[0], 400)
        self.assertEqual(self.change(target, code)[0], 400)

    def test_legacy_admin_migration_binds_identity_and_never_regrants_mailbox(self):
        original_email = self.email
        with patch.object(self.api, "ADMIN_EMAILS", {original_email}):
            # Recreate the actual pre-upgrade users schema in disposable storage.
            with self.api.db.connect() as conn:
                conn.execute("DELETE FROM schema_migrations WHERE name = ?", ("bind_legacy_admin_emails_to_user_ids_v1",))
                conn.execute("ALTER TABLE users DROP COLUMN admin_granted_at")
            self.api.db.init_schema()
            self.assertTrue(self.account()["isAdmin"])
            target = self.address()
            status, data, _ = self.change(target, self.code(target))
            self.assertEqual(status, 200, data)
            self.assertTrue(data["account"]["isAdmin"])
            self.assertEqual(self.request("GET", "/api/admin/memberships", token=self.token)[0], 200)
            replacement = self.register(original_email)
            self.assertFalse(replacement["account"]["isAdmin"])
            # Schema initialization is the startup migration path; repeated restarts
            # must not attach the old role to a new owner of the original address.
            self.api.db.init_schema()
            self.api.db.init_schema()
            self.assertTrue(self.account()["isAdmin"])
            self.assertFalse(self.account(replacement["token"])["isAdmin"])
            self.assertEqual(self.request("GET", "/api/admin/memberships", token=replacement["token"])[0], 403)

    def test_new_registration_at_unclaimed_admin_email_is_not_an_admin_after_restart(self):
        configured = self.address()
        with patch.object(self.api, "ADMIN_EMAILS", {configured}):
            session = self.register(configured)
            self.assertFalse(session["account"]["isAdmin"])
            self.api.db.init_schema()
            self.assertFalse(self.account(session["token"])["isAdmin"])
            self.assertEqual(self.request("GET", "/api/admin/memberships", token=session["token"])[0], 403)

    def test_challenge_cooldown_and_rate_limit_apply_across_target_emails(self):
        with patch.object(self.api, "EMAIL_CODE_COOLDOWN_SECONDS", 60):
            self.code(self.address())
            self.assertEqual(self.send_code(self.address())[0], 429)
        self.api.rate_limiter._hits.clear()
        with patch.object(self.api, "AUTH_VERIFICATION_RATE_LIMIT_MAX", 2):
            self.code(self.address())
            self.code(self.address())
            self.assertEqual(self.send_code(self.address())[0], 429)
        self.assert_identity_unchanged()

    def test_google_link_appearing_during_confirmation_cannot_be_overwritten(self):
        target = self.address()
        code = self.code(target)
        verified = threading.Event()
        resume = threading.Event()
        original = self.api.verify_password

        def pause_verified_password(*args, **kwargs):
            valid = original(*args, **kwargs)
            if valid:
                verified.set()
                if not resume.wait(timeout=10):
                    raise RuntimeError("Concurrent fixture did not resume")
            return valid

        with patch.object(self.api, "verify_password", side_effect=pause_verified_password):
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.change, target, code)
                try:
                    self.assertTrue(verified.wait(timeout=10))
                    account = self.account()
                    account["googleId"] = "google:concurrent-fixture"
                    with self.api.db.connect() as conn:
                        conn.execute("UPDATE users SET account_json = ? WHERE id = ?", (json.dumps(account), self.owner))
                finally:
                    resume.set()
                status, response, _ = future.result(timeout=15)
        self.assertEqual(status, 400, response)
        self.assertEqual(self.account()["email"], self.email)
        self.assertEqual(self.account()["googleId"], "google:concurrent-fixture")
        with self.api.db.connect() as conn:
            pending = conn.execute("SELECT consumed_at FROM account_email_change_codes WHERE user_id = ?", (self.owner,)).fetchone()
        self.assertIsNone(pending["consumed_at"])

    def test_stale_google_login_cannot_restore_email_after_confirmed_change(self):
        target = self.address()
        code = self.code(target)
        selected = threading.Event()
        resume = threading.Event()
        original = self.api.QuantGymHandler.lock_account_identity_snapshot
        google_account = self.api.sanitize_account({"id": "google:" + uuid4().hex,
            "email": self.email, "provider": "google", "name": "Verified Google fixture"})

        def pause_google_snapshot(handler, conn, user):
            if handler.path == "/api/auth/google":
                selected.set()
                if not resume.wait(timeout=10):
                    raise RuntimeError("Google fixture did not resume")
            return original(handler, conn, user)

        with patch.object(self.api, "verified_google_account", return_value=google_account), patch.object(self.api.QuantGymHandler, "lock_account_identity_snapshot", new=pause_google_snapshot):
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.request, "POST", "/api/auth/google", {"credential": "isolated-google-fixture"})
                try:
                    self.assertTrue(selected.wait(timeout=10))
                    status, response, _ = self.change(target, code)
                    self.assertEqual(status, 200, response)
                finally:
                    resume.set()
                stale_status, stale_response, _ = future.result(timeout=15)
        self.assertEqual(stale_status, 409, stale_response)
        account = self.account()
        self.assertEqual(account["email"], target)
        self.assertEqual(account["provider"], "local")
        self.assertNotIn("googleId", account)
        self.assertEqual(self.login()[0], 401)
        self.assertEqual(self.login(target)[0], 200)

    def test_stale_password_reset_cannot_overwrite_changed_email_credentials(self):
        target = self.address()
        code = self.code(target)
        status, response, _ = self.request("POST", "/api/auth/verification-code", {"email": self.email, "purpose": "password_reset"})
        self.assertEqual(status, 200, response)
        reset_code = self.mail[-1]["code"]
        selected = threading.Event()
        resume = threading.Event()
        original = self.api.QuantGymHandler.lock_account_identity_snapshot
        reset_password = "ConcurrentResetFixture5678"

        def pause_reset_snapshot(handler, conn, user):
            if handler.path == "/api/auth/reset-password":
                selected.set()
                if not resume.wait(timeout=10):
                    raise RuntimeError("Password reset fixture did not resume")
            return original(handler, conn, user)

        with patch.object(self.api.QuantGymHandler, "lock_account_identity_snapshot", new=pause_reset_snapshot):
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.request, "POST", "/api/auth/reset-password", {"email": self.email,
                    "password": reset_password, "verificationCode": reset_code})
                try:
                    self.assertTrue(selected.wait(timeout=10))
                    status, response, _ = self.change(target, code)
                    self.assertEqual(status, 200, response)
                finally:
                    resume.set()
                stale_status, stale_response, _ = future.result(timeout=15)
        self.assertEqual(stale_status, 409, stale_response)
        self.assertEqual(self.account()["email"], target)
        self.assertEqual(self.login(target)[0], 200)
        self.assertEqual(self.login(target, reset_password)[0], 401)
        with self.api.db.connect() as conn:
            pending = conn.execute("SELECT consumed_at FROM email_verification_codes WHERE email_norm = ? AND purpose = 'password_reset'", (self.email,)).fetchone()
        self.assertIsNone(pending["consumed_at"])

    def test_concurrent_accounts_claiming_same_target_leave_loser_code_unconsumed(self):
        other = self.register(self.address())
        target = self.address()
        first_code = self.code(target)
        second_code = self.code(target, token=other["token"])
        gate = threading.Barrier(2)
        original = self.api.verify_password

        def concurrent_password_check(*args, **kwargs):
            valid = original(*args, **kwargs)
            if valid:
                gate.wait(timeout=10)
            return valid

        arguments = [(self.token, first_code, self.owner), (other["token"], second_code, other["account"]["id"])]
        with patch.object(self.api, "verify_password", side_effect=concurrent_password_check):
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda item: self.change(target, item[1], token=item[0]), arguments))
        self.assertEqual(sorted(status for status, _, _ in results), [200, 409], results)
        loser_index = next(index for index, result in enumerate(results) if result[0] == 409)
        loser = arguments[loser_index]
        with self.api.db.connect() as conn:
            pending = conn.execute("SELECT consumed_at FROM account_email_change_codes WHERE user_id = ?", (loser[2],)).fetchone()
        self.assertIsNone(pending["consumed_at"])
        self.assertNotEqual(self.account(loser[0])["email"], target)
        self.assertEqual(self.login(target)[0], 200)

    @unittest.skipIf(USE_POSTGRES, "SQLite export tool applies only to SQLite fixtures")
    def test_default_database_export_redacts_pending_email_credentials(self):
        target = self.address()
        self.code(target)
        with self.api.db.connect() as conn:
            pending = dict(conn.execute("SELECT * FROM account_email_change_codes WHERE user_id = ?", (self.owner,)).fetchone())
        destination = self.directory / ("redacted-export-" + uuid4().hex + ".json")
        result = subprocess.run([sys.executable, str(ROOT / "scripts/export-api-sqlite.py"),
                                 "--db", str(self.api.db.path), "--out", str(destination)],
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        exported_text = destination.read_text(encoding="utf-8")
        exported = json.loads(exported_text)
        row = next(item for item in exported["tables"]["account_email_change_codes"]["rows"] if item["user_id"] == self.owner)
        self.assertNotEqual(row["email_norm"], target)
        self.assertNotIn(target, exported_text)
        for field in ("credential_fingerprint", "code_hash", "code_salt"):
            self.assertEqual(row[field]["redacted"], "secret")
            self.assertNotIn(pending[field], exported_text)

    def test_concurrent_use_of_same_code_has_at_most_one_success(self):
        target = self.address()
        code = self.code(target)
        gate = threading.Barrier(2)
        original = self.api.verify_password

        def concurrent_password_check(*args, **kwargs):
            valid = original(*args, **kwargs)
            if valid:
                gate.wait(timeout=10)
            return valid

        with patch.object(self.api, "verify_password", side_effect=concurrent_password_check):
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda _: self.change(target, code), range(2)))
        self.assertEqual(sum(status == 200 for status, _, _ in results), 1, results)
        self.assertTrue(all(status in (200, 400, 401, 409) for status, _, _ in results), results)
        self.assertEqual(self.account()["email"], target)
        self.assertEqual(self.login(target)[0], 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)
