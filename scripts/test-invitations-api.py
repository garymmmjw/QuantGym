#!/usr/bin/env python3
"""Invitation registration integration tests with disposable local-only storage.

Google identity verification is replaced only in the isolated child process;
Google HTTP account creation, linking, sessions and invitation checks remain real.
SMTP and webhooks are disabled, and development verification codes stay local.
Pass --postgres with psycopg and local initdb/pg_ctl available to exercise a
temporary PostgreSQL cluster instead of SQLite; no supplied database URL is used.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "InvitationFixture1234"
MISSING = "Invitation code is required"
INVALID = "Invalid or unavailable invitation code"
USE_POSTGRES = "--postgres" in sys.argv
if USE_POSTGRES:
    sys.argv.remove("--postgres")


class InvitationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="qg-invitations-test-")
        cls.directory = Path(cls.tmp.name)
        cls.database = cls.directory / "test.sqlite"
        cls.process = None
        cls.postgres_started = False
        cls.log = (cls.directory / "server.log").open("w+")
        catalog = cls.directory / "catalog.json"
        catalog.write_text("[]", encoding="utf-8")
        cls.bootstrap = cls.directory / "server-fixture.py"
        cls.bootstrap.write_text(
            "import json, sys\n"
            f"sys.path.insert(0, {str(ROOT / 'api-server')!r})\n"
            "import server\n"
            "def verified_fixture(credential, requested_account):\n"
            "    identity = json.loads(credential)\n"
            "    return server.sanitize_account({\n"
            "        'id': 'google:' + identity['sub'], 'provider': 'google',\n"
            "        'email': identity['email'], 'name': 'Google fixture'})\n"
            "server.verified_google_account = verified_fixture\n"
            "server.main()\n",
            encoding="utf-8",
        )
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            cls.port = probe.getsockname()[1]
        cls.environment = {
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "QUANTGYM_HOST": "127.0.0.1", "PORT": str(cls.port),
            "QUANTGYM_DB": str(cls.database), "QUANTGYM_DB_BACKEND": "sqlite",
            "QUANTGYM_POSTGRES_DATABASE_URL": "", "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PROBLEM_CATALOG": str(catalog), "QUANTGYM_JOBS_CATALOG": str(catalog),
            "QUANTGYM_MEDIA_ROOT": str(cls.directory / "media"),
            "QUANTGYM_REQUIRE_EMAIL_VERIFICATION": "0", "QUANTGYM_REQUIRE_INVITE_CODE": "0",
            "QUANTGYM_BETA_EMAIL_ALLOWLIST": "", "QUANTGYM_ADMIN_EMAILS": "admin@example.invalid",
            "QUANTGYM_EMAIL_DEV_CODE_RESPONSE": "1", "QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS": "0",
            "QUANTGYM_AUTH_RATE_LIMIT_MAX": "500", "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX": "500",
            "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX": "500", "QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX": "500",
            "QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX": "500", "QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX": "500",
            "QUANTGYM_SMTP_HOST": "", "QUANTGYM_SMTP_USERNAME": "", "QUANTGYM_SMTP_PASSWORD": "",
            "QUANTGYM_ALERT_WEBHOOK_URL": "", "QUANTGYM_ALERT_WEBHOOK_TOKEN": "",
        }
        try:
            if USE_POSTGRES:
                cls.start_postgres()
            cls.start_server()
            cls.admin = cls.seed_local("admin@example.invalid")
            cls.existing = cls.seed_local("existing@example.invalid")
            cls.reset_existing = cls.seed_local("reset-existing@example.invalid")
            status, cls.google_existing = cls.google("existing-google@example.invalid", "existing-google")
            if status != 200:
                raise RuntimeError(f"Cannot create existing Google fixture: {cls.google_existing}")
            cls.stop_server()
            # Omit the flag to verify the production default, and leave a stale
            # whitelist in place to prove invite mode replaces the old gate.
            cls.environment.pop("QUANTGYM_REQUIRE_INVITE_CODE", None)
            cls.environment["QUANTGYM_REQUIRE_EMAIL_VERIFICATION"] = "1"
            cls.environment["QUANTGYM_BETA_EMAIL_ALLOWLIST"] = "obsolete@example.invalid"
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
            port = probe.getsockname()[1]
        subprocess.run([initdb, "-D", str(cls.pg_data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"], check=True, stdout=cls.log, stderr=cls.log)
        subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-l", str(cls.directory / "postgres.log"), "-w", "-o", f"-h 127.0.0.1 -p {port} -k {cls.directory}", "start"], check=True, stdout=cls.log, stderr=cls.log)
        cls.postgres_started = True
        cls.postgres_dsn = f"postgresql://fixture_admin@127.0.0.1:{port}/postgres"
        cls.environment.update(QUANTGYM_DB_BACKEND="postgres", QUANTGYM_POSTGRES_DATABASE_URL=cls.postgres_dsn)

    @classmethod
    def connect_database(cls):
        return cls.psycopg.connect(cls.postgres_dsn) if USE_POSTGRES else sqlite3.connect(cls.database)

    @staticmethod
    def sql(query):
        return query.replace("?", "%s") if USE_POSTGRES else query

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen(
            [sys.executable, str(cls.bootstrap)], env=cls.environment, cwd=ROOT,
            stdout=cls.log, stderr=cls.log,
        )
        for _ in range(150):
            try:
                if cls.request("GET", "/health")[0] == 200:
                    return
            except OSError:
                pass
            if cls.process.poll() is not None:
                break
            time.sleep(.1)
        cls.log.seek(0)
        raise RuntimeError(cls.log.read())

    @classmethod
    def stop_server(cls):
        if cls.process is not None and cls.process.poll() is None:
            cls.process.terminate()
            cls.process.wait(timeout=10)
        cls.process = None

    @classmethod
    def tearDownClass(cls):
        cls.stop_server()
        if cls.postgres_started:
            subprocess.run([cls.pg_ctl, "-D", str(cls.pg_data), "-m", "fast", "-w", "stop"], check=True, stdout=cls.log, stderr=cls.log)
            cls.postgres_started = False
        cls.log.close()
        cls.tmp.cleanup()

    @classmethod
    def request(cls, method, path, body=None, token=""):
        conn = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=15)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally:
            conn.close()

    @classmethod
    def register(cls, email, invite=None, verification=None, **account):
        body = {"password": PASSWORD, "account": {"email": email, "name": "Invitation fixture", "provider": "local", **account}}
        if invite is not None:
            body["inviteCode"] = invite
        if verification is not None:
            body["verificationCode"] = verification
        return cls.request("POST", "/api/auth/register", body)

    @classmethod
    def seed_local(cls, email):
        status, result = cls.register(email)
        if status != 201:
            raise RuntimeError(f"Cannot create existing local fixture: {result}")
        return result

    @classmethod
    def google(cls, verified_email, subject, invite=None, **account):
        body = {"credential": json.dumps({"email": verified_email, "sub": subject}), "account": account}
        if invite is not None:
            body["inviteCode"] = invite
        return cls.request("POST", "/api/auth/google", body)

    def email(self, suffix=""):
        return f"{self._testMethodName}{suffix}@example.invalid"

    def create_invite(self, **options):
        status, result = self.request("POST", "/api/admin/invitations", options, self.admin["token"])
        self.assertEqual(status, 201, result)
        return result["invitations"][0]

    def issue_verification(self, email, invite=None, purpose="register"):
        body = {"email": email, "purpose": purpose}
        if invite is not None:
            body["inviteCode"] = invite
        return self.request("POST", "/api/auth/verification-code", body)

    def verification(self, email, invite=None):
        status, result = self.issue_verification(email, invite)
        self.assertEqual(status, 200, result)
        self.assertEqual(result["delivery"], "dev")
        return result["devCode"]

    def invitation_row(self, invitation):
        with self.connect_database() as conn:
            cursor = conn.execute(self.sql("SELECT * FROM registration_invitations WHERE id = ?"), (invitation["id"],))
            return dict(zip([item[0] for item in cursor.description], cursor.fetchone()))

    def assert_error(self, response, message):
        self.assertEqual(response, (400, {"error": message}))

    def test_default_gate_rejects_missing_and_invalid_before_sending_email(self):
        self.assertEqual(self.request("GET", "/api/auth/config"), (200, {"inviteRequired": True}))
        self.assertTrue(self.request("GET", f"/api/auth/account-status?email={self.email()}")[1]["inviteRequired"])
        self.assertFalse(self.request("GET", "/api/auth/account-status?email=existing@example.invalid")[1]["inviteRequired"])
        for code, error in [(None, MISSING), ("", MISSING), ("unissued-code", INVALID)]:
            with self.subTest(code=code):
                self.assert_error(self.issue_verification(self.email(), code), error)
                self.assert_error(self.register(self.email(), code), error)
        with self.connect_database() as conn:
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM email_verification_codes WHERE email_norm = ?"), (self.email(),)).fetchone()[0], 0)
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM users WHERE email_norm = ?"), (self.email(),)).fetchone()[0], 0)

    def test_admin_access_validation_and_secret_storage(self):
        invitation = self.create_invite(label="Integration fixture")
        for token, expected in [("", 401), (self.existing["token"], 403)]:
            for method, path, body in [
                ("GET", "/api/admin/invitations", None),
                ("POST", "/api/admin/invitations", {}),
                ("POST", f"/api/admin/invitations/{invitation['id']}/revoke", {}),
            ]:
                with self.subTest(method=method, expected=expected):
                    self.assertEqual(self.request(method, path, body, token)[0], expected)
        for body in [{"count": 0}, {"count": 51}, {"maxUses": 0}, {"expiresInDays": 0}, {"expiresInDays": 366}, {"email": "invalid"}]:
            self.assertEqual(self.request("POST", "/api/admin/invitations", body, self.admin["token"])[0], 400, body)
        self.assertEqual(invitation["maxUses"], 1)
        self.assertEqual(invitation["uses"], 0)
        self.assertEqual(invitation["label"], "Integration fixture")
        expiry = datetime.fromisoformat(invitation["expiresAt"].replace("Z", "+00:00"))
        self.assertTrue(6.9 < (expiry - datetime.now(timezone.utc)).total_seconds() / 86400 <= 7)
        status, listing = self.request("GET", "/api/admin/invitations", token=self.admin["token"])
        self.assertEqual(status, 200, listing)
        listed = next(item for item in listing["invitations"] if item["id"] == invitation["id"])
        self.assertNotIn("code", listed)
        self.assertNotIn("codeHash", listed)
        self.assertNotIn("code_hash", listed)
        with self.connect_database() as conn:
            if USE_POSTGRES:
                tables = conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").fetchall()
                dump = json.dumps([conn.execute(f'SELECT row_to_json(t) FROM "{table}" t').fetchall() for (table,) in tables], default=str)
            else:
                dump = "\n".join(conn.iterdump())
        self.assertNotIn(invitation["code"], dump)
        self.log.flush()
        self.assertNotIn(invitation["code"], (self.directory / "server.log").read_text())
        status, batch = self.request("POST", "/api/admin/invitations", {"count": 3}, self.admin["token"])
        self.assertEqual(status, 201, batch)
        self.assertEqual(len({item["code"] for item in batch["invitations"]}), 3)

    def test_revoked_expired_and_email_bound_invitations_reject_both_steps(self):
        for condition in ["revoked", "expired", "email_bound"]:
            with self.subTest(condition=condition):
                invitation = self.create_invite(email="bound@example.invalid" if condition == "email_bound" else "")
                if condition == "revoked":
                    status, result = self.request("POST", f"/api/admin/invitations/{invitation['id']}/revoke", {}, self.admin["token"])
                    self.assertEqual(status, 200, result)
                if condition == "expired":
                    with self.connect_database() as conn:
                        conn.execute(self.sql("UPDATE registration_invitations SET expires_at = ? WHERE id = ?"), ("2000-01-01T00:00:00Z", invitation["id"]))
                self.assert_error(self.issue_verification(self.email(condition), invitation["code"]), INVALID)
                self.assert_error(self.register(self.email(condition), invitation["code"]), INVALID)
                self.assertEqual(self.invitation_row(invitation)["uses"], 0)

    def test_verification_failure_preserves_invite_and_success_consumes_once(self):
        invitation = self.create_invite()
        code = self.verification(self.email(), invitation["code"])
        self.assertEqual(self.invitation_row(invitation)["uses"], 0)
        self.assert_error(self.register(self.email(), invitation["code"]), "Email verification code is required")
        self.assert_error(self.register(self.email(), invitation["code"], "not-a-valid-code"), "Invalid or expired email verification code")
        self.assertEqual(self.invitation_row(invitation)["uses"], 0)
        status, session = self.register(self.email(), invitation["code"], code)
        self.assertEqual(status, 201, session)
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)
        self.assertEqual(self.request("GET", "/api/account", token=session["token"])[0], 200)
        self.assert_error(self.issue_verification(self.email("reuse"), invitation["code"]), INVALID)
        self.assert_error(self.register(self.email("reuse"), invitation["code"], code), INVALID)
        with self.connect_database() as conn:
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM invitation_redemptions WHERE invitation_id = ?"), (invitation["id"],)).fetchone()[0], 1)

    def test_email_binding_accepts_matching_normalized_address(self):
        invitation = self.create_invite(email=self.email().upper())
        code = self.verification(self.email(), invitation["code"])
        status, session = self.register(self.email().upper(), invitation["code"], code)
        self.assertEqual(status, 201, session)
        self.assertEqual(session["account"]["email"], self.email())
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)

    def test_multi_use_invitation_stops_at_configured_limit(self):
        invitation = self.create_invite(maxUses=2)
        for index in range(2):
            email = self.email(str(index))
            code = self.verification(email, invitation["code"])
            status, result = self.register(email, invitation["code"], code)
            self.assertEqual(status, 201, result)
        self.assertEqual(self.invitation_row(invitation)["uses"], 2)
        self.assert_error(self.issue_verification(self.email("extra"), invitation["code"]), INVALID)

    def test_transaction_failure_restores_invite_and_email_verification(self):
        invitation = self.create_invite()
        code = self.verification(self.email(), invitation["code"])
        with self.connect_database() as conn:
            if USE_POSTGRES:
                conn.execute("CREATE FUNCTION invitation_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'invitation test insert failure'; END $$")
                conn.execute("CREATE TRIGGER invitation_test_insert_failure BEFORE INSERT ON invitation_redemptions FOR EACH ROW EXECUTE FUNCTION invitation_test_fail()")
            else:
                conn.execute("CREATE TRIGGER invitation_test_insert_failure BEFORE INSERT ON invitation_redemptions BEGIN SELECT RAISE(ABORT, 'invitation test insert failure'); END")
        try:
            status, result = self.register(self.email(), invitation["code"], code)
            self.assertEqual(status, 500, result)
        finally:
            with self.connect_database() as conn:
                conn.execute("DROP TRIGGER invitation_test_insert_failure ON invitation_redemptions" if USE_POSTGRES else "DROP TRIGGER invitation_test_insert_failure")
                if USE_POSTGRES:
                    conn.execute("DROP FUNCTION invitation_test_fail()")
        self.assertEqual(self.invitation_row(invitation)["uses"], 0)
        with self.connect_database() as conn:
            self.assertIsNone(conn.execute(self.sql("SELECT consumed_at FROM email_verification_codes WHERE email_norm = ?"), (self.email(),)).fetchone()[0])
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM users WHERE email_norm = ?"), (self.email(),)).fetchone()[0], 0)
        status, result = self.register(self.email(), invitation["code"], code)
        self.assertEqual(status, 201, result)
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)

    def test_concurrent_registration_cannot_redeem_single_use_twice(self):
        invitation = self.create_invite()
        emails = [self.email(str(index)) for index in range(2)]
        codes = [self.verification(email, invitation["code"]) for email in emails]
        barrier = threading.Barrier(2)

        def register_concurrently(index):
            barrier.wait(timeout=10)
            return self.register(emails[index], invitation["code"], codes[index])

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(register_concurrently, range(2)))
        self.assertEqual(sorted(status for status, _ in results), [201, 400], results)
        failure = next(result for result in results if result[0] == 400)
        self.assert_error(failure, INVALID)
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)
        with self.connect_database() as conn:
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM users WHERE email_norm IN (?, ?)"), emails).fetchone()[0], 1)
            self.assertEqual(conn.execute(self.sql("SELECT COUNT(*) FROM invitation_redemptions WHERE invitation_id = ?"), (invitation["id"],)).fetchone()[0], 1)

    def test_existing_accounts_login_sessions_and_reset_ignore_stale_whitelist(self):
        self.assertEqual(self.request("GET", "/api/account", token=self.existing["token"])[0], 200)
        status, login = self.request("POST", "/api/auth/login", {"email": "existing@example.invalid", "password": PASSWORD})
        self.assertEqual(status, 200, login)
        self.assertEqual(login["account"]["id"], self.existing["account"]["id"])
        status, sent = self.issue_verification("reset-existing@example.invalid", purpose="password_reset")
        self.assertEqual(status, 200, sent)
        status, reset = self.request("POST", "/api/auth/reset-password", {"email": "reset-existing@example.invalid", "password": "ChangedFixture5678", "verificationCode": sent["devCode"]})
        self.assertEqual(status, 200, reset)
        self.assertEqual(self.request("POST", "/api/auth/login", {"email": "reset-existing@example.invalid", "password": "ChangedFixture5678"})[0], 200)

    def test_google_creation_requires_invite_existing_login_and_link_do_not(self):
        self.assert_error(self.google(self.email(), "new-without-code"), MISSING)
        self.assert_error(self.google(self.email(), "new-with-bad-code", "unissued"), INVALID)
        invitation = self.create_invite(email=self.email())
        self.assert_error(self.google(self.email("wrong"), "wrong-bound-email", invitation["code"], email=self.email()), INVALID)
        status, new_google = self.google(self.email(), "new-with-code", invitation["code"])
        self.assertEqual(status, 200, new_google)
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)
        status, again = self.google(self.email(), "new-with-code")
        self.assertEqual(status, 200, again)
        self.assertEqual(again["account"]["id"], new_google["account"]["id"])
        self.assertEqual(self.google("existing-google@example.invalid", "existing-google")[0], 200)
        status, linked = self.google("existing@example.invalid", "linked-existing-local")
        self.assertEqual(status, 200, linked)
        self.assertEqual(linked["account"]["id"], self.existing["account"]["id"])
        self.assertEqual(self.invitation_row(invitation)["uses"], 1)

    def test_disabled_gate_allows_legacy_registration(self):
        cls = type(self)
        cls.stop_server()
        cls.environment["QUANTGYM_REQUIRE_INVITE_CODE"] = "0"
        cls.environment["QUANTGYM_BETA_EMAIL_ALLOWLIST"] = ""
        try:
            cls.start_server()
            self.assertEqual(self.request("GET", "/api/auth/config"), (200, {"inviteRequired": False}))
            code = self.verification(self.email())
            status, result = self.register(self.email(), verification=code)
            self.assertEqual(status, 201, result)
        finally:
            cls.stop_server()
            cls.environment.pop("QUANTGYM_REQUIRE_INVITE_CODE", None)
            cls.environment["QUANTGYM_BETA_EMAIL_ALLOWLIST"] = "obsolete@example.invalid"
            cls.start_server()

    def test_invite_mode_still_requires_email_verification_when_legacy_flag_is_off(self):
        cls = type(self)
        cls.stop_server()
        cls.environment["QUANTGYM_REQUIRE_EMAIL_VERIFICATION"] = "0"
        try:
            cls.start_server()
            invitation = self.create_invite()
            self.assert_error(self.register(self.email(), invitation["code"]), "Email verification code is required")
            self.assertEqual(self.invitation_row(invitation)["uses"], 0)
            code = self.verification(self.email(), invitation["code"])
            status, result = self.register(self.email(), invitation["code"], code)
            self.assertEqual(status, 201, result)
        finally:
            cls.stop_server()
            cls.environment["QUANTGYM_REQUIRE_EMAIL_VERIFICATION"] = "1"
            cls.start_server()


if __name__ == "__main__":
    unittest.main(verbosity=2)
