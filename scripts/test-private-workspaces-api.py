#!/usr/bin/env python3
"""Private-by-default HTTP checks in disposable SQLite or --postgres fixtures.

Never contacts production, uses real credentials, or sends external messages.
Legacy rows are synthetic fixtures that must remain inaccessible and unchanged.
"""
import ast
import base64
import http.client
import http.server
import importlib.util
import json
import subprocess
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("private_workspaces_harness", ROOT / "scripts/test-personal-prep-api.py")
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
base = harness.PersonalPrepApiTests


class PrivateWorkspacesApiTests(unittest.TestCase):
    setUpClass = base.__dict__["setUpClass"]
    tearDownClass = base.__dict__["tearDownClass"]
    tearDown = base.__dict__["tearDown"]
    start_postgres = base.__dict__["start_postgres"]
    stop_postgres = base.__dict__["stop_postgres"]
    connect_database = base.__dict__["connect_database"]
    stop_server = base.__dict__["stop_server"]
    request = base.__dict__["request"]
    sql = base.__dict__["sql"]
    new_user = base.__dict__["new_user"]
    grant_membership = base.__dict__["grant_membership"]
    put = base.__dict__["put"]
    assert_private = base.__dict__["assert_private"]

    @classmethod
    def start_server(cls):
        cls.environment.update(QUANTGYM_PRIVATE_WORKSPACES="1", QUANTGYM_SMTP_HOST="",
                               QUANTGYM_MEDIA_STORAGE="local", QUANTGYM_MEDIA_PUBLIC_BASE_URL="https://cdn.example.invalid/media")
        base.__dict__["start_server"].__func__(cls)

    def stored_community(self):
        with self.connect_database() as conn:
            raw = conn.execute("SELECT community_json FROM community WHERE id = 1").fetchone()[0]
            return json.loads(raw) if isinstance(raw, str) else raw

    def test_private_policy_defaults_on_and_requires_explicit_legacy_opt_out(self):
        environment = {**harness.os.environ}
        environment.pop("QUANTGYM_PRIVATE_WORKSPACES", None)
        for value, expected in ((None, "True"), ("", "True"), ("unexpected", "True"), ("0", "False")):
            if value is not None:
                environment["QUANTGYM_PRIVATE_WORKSPACES"] = value
            result = subprocess.run([sys.executable, "-c", "from privacy_policy import PRIVATE_WORKSPACES; print(PRIVATE_WORKSPACES)"],
                                    cwd=ROOT / "api-server", env=environment, check=True, capture_output=True, text=True)
            self.assertEqual(result.stdout.strip(), expected)

    def test_old_signup_login_and_sync_neither_publish_nor_erase_historical_shares(self):
        historic = {"posts": [{"id": "historic-post", "author": "PRIVATE-HISTORIC-AUTHOR", "text": "PRIVATE-HISTORIC-ANSWER"}]}
        with self.connect_database() as conn:
            conn.execute(self.sql("INSERT INTO community (id, community_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET community_json = excluded.community_json"),
                         (json.dumps(historic), "2026-09-20T12:00:00Z"))
        type(self).user_counter += 1
        owner = f"private-signup-user-{self.user_counter}"
        payload = {"password": "fixture-only-password", "account": {"id": owner, "provider": "local", "email": owner + "@example.com", "name": "PRIVATE-NEW-NAME"},
                   "community": {"posts": [{"id": "attempted-new-post", "text": "PRIVATE-NEW-ANSWER"}]}, "state": {"skills": {"technical": 87}}}
        status, registered, headers = self.request("POST", "/api/auth/register", payload=payload)
        self.assertEqual(status, 201, registered)
        self.assert_private(headers)
        self.assertEqual(registered["community"], {"posts": []})
        token = registered["token"]
        status, logged_in, headers = self.request("POST", "/api/auth/login", payload={"email": owner + "@example.com", "password": payload["password"]})
        self.assertEqual(status, 200, logged_in)
        self.assert_private(headers)
        self.assertEqual(logged_in["community"], {"posts": []})
        status, synced, headers = self.request("POST", "/api/sync", token, {"community": payload["community"], "state": {"myPrivateNote": "PRIVATE-SYNC-NOTE"}})
        self.assertEqual(status, 200, synced)
        self.assert_private(headers)
        self.assertEqual(synced["community"], {"posts": []})
        self.assertEqual(synced["state"]["myPrivateNote"], "PRIVATE-SYNC-NOTE")
        self.assertEqual(self.stored_community(), historic)
        other, _ = self.new_user()
        for reader in (None, token, other):
            status, data, headers = self.request("GET", "/api/community", reader)
            self.assertEqual((status, data), (200, {"community": {"posts": []}}))
            self.assert_private(headers)
            status, data, _ = self.request("GET", "/api/leaderboard", reader)
            self.assertEqual(status, 200, data)
            self.assertEqual(data["leaderboard"], [])
        self.assertNotIn("PRIVATE-SYNC-NOTE", json.dumps(self.request("GET", "/api/state", other)[1]))

    def test_sharing_mutations_guardian_and_multiplayer_routes_are_blocked(self):
        token, _ = self.new_user()
        endpoints = [("PUT", "/api/community"), ("POST", "/api/problem-social/test/like"),
                     ("POST", "/api/problem-social/test/comments"), ("DELETE", "/api/problem-social/test/comments/comment"),
                     ("GET", "/api/guardian/access"), ("POST", "/api/guardian/access/rotate"),
                     ("POST", "/api/guardian/session"), ("GET", "/api/guardian/dashboard"),
                     ("POST", "/api/guardian/goals"), ("DELETE", "/api/guardian/goals/old-goal"),
                     ("POST", "/api/guardian/reminders"), ("GET", "/api/poker/rooms"), ("POST", "/api/poker/rooms"),
                     ("GET", "/api/poker/rooms/oldroom"), ("POST", "/api/poker/rooms/oldroom/join"),
                     ("POST", "/api/poker/rooms/oldroom/commands"), ("GET", "/api/poker/ws/oldroom?token=stale")]
        for reader in (None, token, "qg_guardian_" + "a" * 43):
            for method, path in endpoints:
                with self.subTest(method=method, path=path, authenticated=bool(reader)):
                    status, data, headers = self.request(method, path, reader, {"text": "Never publish this"} if method in {"POST", "PUT"} else None)
                    self.assertEqual(status, 403, data)
                    self.assert_private(headers)

    def test_historical_social_activity_is_hidden_and_user_questions_stay_owned(self):
        token, owner = self.new_user()
        other, _ = self.new_user()
        problem = {"id": "private-problem-" + owner, "titleEn": "PRIVATE-UPLOADED-TITLE", "promptEn": "PRIVATE-UPLOADED-PROMPT", "answer": "PRIVATE-UPLOADED-ANSWER", "visibility": "public", "ownerUserId": "injected-other-owner"}
        status, saved, _ = self.request("PUT", "/api/problems", token, {"problem": problem})
        self.assertEqual(status, 200, saved)
        self.assertEqual(saved["problems"][0]["ownerUserId"], owner)
        self.assertEqual(saved["problems"][0]["visibility"], "user")
        with self.connect_database() as conn:
            conn.execute(self.sql("INSERT INTO problem_likes (problem_id, user_id, created_at) VALUES (?, ?, ?)"), (problem["id"], owner, "2026-09-20T12:00:00Z"))
            conn.execute(self.sql("INSERT INTO problem_comments (id, problem_id, user_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"),
                         ("comment-" + owner, problem["id"], owner, "PRIVATE-HISTORIC-COMMENT", "2026-09-20T12:00:00Z", "2026-09-20T12:00:00Z"))
        for reader in (None, token, other):
            self.assertEqual(self.request("GET", "/api/problem-social", reader)[1], {"problemSocial": []})
            detail = self.request("GET", "/api/problem-social/" + problem["id"], reader)[1]["social"]
            self.assertEqual(detail, {"problemId": problem["id"], "likeCount": 0, "commentCount": 0, "liked": False, "comments": []})
        for reader in (None, other):
            self.assertNotIn(problem["id"], json.dumps(self.request("GET", "/api/problems", reader)[1]))
        self.assertIn(problem["id"], json.dumps(self.request("GET", "/api/problems", token)[1]))

    def test_shared_technical_catalog_remains_available_without_private_progress(self):
        token, owner = self.new_user()
        other, other_owner = self.new_user()
        self.assertEqual(self.request("GET", "/api/practice/technical/questions")[0], 401)
        self.assertEqual(self.request("GET", "/api/practice/technical/questions", token)[0], 403)
        self.grant_membership(owner)
        self.grant_membership(other_owner)
        first = self.request("GET", "/api/practice/technical/questions", token)
        second = self.request("GET", "/api/practice/technical/questions", other)
        self.assertEqual(first[0], 200, first[1])
        self.assertEqual(first[1], second[1])
        self.assertGreater(len(first[1]["questions"]), 50)
        state = {**harness.empty_state(), "behavioralQuestions": [harness.behavioral_question(title="PRIVATE-BEHAVIORAL-QUESTION")],
                 "behavioralAnswers": [{"id": "my-behavioral-question", "text": "PRIVATE-BEHAVIORAL-ANSWER", "updatedAt": "2026-09-20T12:00:00Z"}],
                 "careerTrackerOperations": harness.tracker_operations(), "practiceSessions": [harness.practice_session(completed=True)]}
        self.assertEqual(self.put(token, state)[0], 200)
        self.assertIsNone(self.request("GET", token=other)[1]["data"])
        self.assertEqual(self.request("GET", "/api/practice/technical/questions", other)[1], first[1])

    def test_media_requires_owner_even_when_a_public_storage_base_is_configured(self):
        token, _ = self.new_user()
        other, _ = self.new_user()
        content = b"synthetic private avatar bytes"
        status, uploaded, headers = self.request("POST", "/api/media", token, {"dataUrl": "data:image/png;base64," + base64.b64encode(content).decode(), "name": "private-avatar.png", "context": "avatar"})
        self.assertEqual(status, 201, uploaded)
        self.assert_private(headers)
        media = uploaded["media"]
        self.assertNotIn("cdn.example.invalid", media["url"])
        self.assertTrue(media["url"].endswith(media["path"]))
        for reader, expected in ((None, 401), (other, 404), ("invalid-token", 401)):
            status, data, headers = self.request("GET", media["path"], reader)
            self.assertEqual(status, expected, data)
            self.assert_private(headers)
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=15)
        try:
            connection.request("GET", media["path"], headers={"Authorization": "Bearer " + token})
            response = connection.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(), content)
            self.assert_private(dict(response.getheaders()))
            self.assertIsNone(response.getheader("Location"))
        finally:
            connection.close()

    def test_private_s3_media_is_proxied_after_owner_check_without_public_redirect(self):
        tree = ast.parse((ROOT / "api-server/server.py").read_text())
        handler = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "QuantGymHandler")
        method = next(node for node in handler.body if isinstance(node, ast.FunctionDef) and node.name == "get_media")
        media = {"ownerUserId": "owner", "storagePath": "s3:private-fixture.png", "contentType": "image/png", "filename": "private.png"}
        database = MagicMock()
        database.get_media_object.return_value = media
        public_url = MagicMock(side_effect=AssertionError("Private media must never resolve a public URL"))
        namespace = {"PRIVATE_WORKSPACES": True, "db": database, "HttpError": RuntimeError, "quote": quote,
                     "media_public_url": public_url, "read_s3_media_object": lambda path: b"private-fixture"}
        exec(compile(ast.Module(body=[method], type_ignores=[]), "private-media-method", "exec"), namespace)
        receiver = MagicMock()
        receiver.require_user.return_value = {"id": "owner"}
        namespace["get_media"](receiver, "fixture")
        receiver.send_response.assert_called_once_with(200)
        receiver.wfile.write.assert_called_once_with(b"private-fixture")
        public_url.assert_not_called()

    def test_private_object_upload_refuses_public_configuration_before_sending_any_bytes(self):
        token, owner = self.new_user()
        class StorageFixture(http.server.BaseHTTPRequestHandler):
            def do_PUT(self):
                length = int(self.headers.get("Content-Length", "0"))
                self.rfile.read(length)
                self.server.put_sizes.append(length)
                self.send_response(200)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, *_):
                pass

        upstream = http.server.ThreadingHTTPServer(("127.0.0.1", 0), StorageFixture)
        upstream.put_sizes = []
        worker = threading.Thread(target=upstream.serve_forever, daemon=True)
        worker.start()
        original_environment = dict(self.environment)
        payload = {"dataUrl": "data:image/png;base64," + base64.b64encode(b"synthetic private image").decode(), "name": "private-image.png"}
        try:
            self.stop_server()
            self.environment.update(QUANTGYM_MEDIA_STORAGE="r2", QUANTGYM_MEDIA_S3_ENDPOINT=f"http://127.0.0.1:{upstream.server_port}",
                                    QUANTGYM_MEDIA_S3_BUCKET="private-fixture", QUANTGYM_MEDIA_S3_REGION="auto",
                                    QUANTGYM_MEDIA_S3_ACCESS_KEY_ID="fixture-only-access", QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY="fixture-only-secret")
            # Keep the configured public base from the normal private fixture.
            base.__dict__["start_server"].__func__(type(self))
            status, response, _ = self.request("POST", "/api/media", token, payload)
            self.assertEqual(status, 503, response)
            self.assertIn("public media access", response["error"])
            self.assertEqual(upstream.put_sizes, [], "No private bytes may reach publicly configured object storage")
            with self.connect_database() as conn:
                self.assertEqual(conn.execute(self.sql("SELECT count(*) FROM media_objects WHERE owner_user_id = ?"), (owner,)).fetchone()[0], 0)
            # Private object stores remain usable after the operator removes
            # public access and its public URL setting. This only contacts the
            # loopback fixture, never a real bucket or external service.
            self.stop_server()
            self.environment["QUANTGYM_MEDIA_PUBLIC_BASE_URL"] = ""
            base.__dict__["start_server"].__func__(type(self))
            status, response, _ = self.request("POST", "/api/media", token, payload)
            self.assertEqual(status, 201, response)
            self.assertEqual(upstream.put_sizes, [len(b"synthetic private image")])
            self.assertTrue(response["media"]["url"].endswith(response["media"]["path"]))
        finally:
            self.stop_server()
            self.environment.clear()
            self.environment.update(original_environment)
            self.start_server()
            upstream.shutdown()
            upstream.server_close()
            worker.join(timeout=5)

    def test_private_guardian_start_evaluation_and_delivery_do_not_touch_queued_work(self):
        import guardian
        import privacy_policy
        database, mailer = MagicMock(), MagicMock()
        service = guardian.GuardianService(database, RuntimeError, mailer, lambda: True)
        with patch.object(privacy_policy, "PRIVATE_WORKSPACES", True):
            service.start()
            self.assertIsNone(service._worker)
            service.evaluate(MagicMock(), "fixture-owner")
            service.evaluate_all()
            service.deliver_pending()
            database.connect.assert_not_called()
            mailer.assert_not_called()
            with self.assertRaisesRegex(RuntimeError, "Sharing is disabled"):
                service.handle(MagicMock(), "/api/guardian/dashboard")
        token, owner = self.new_user()
        notification = "private-notification-" + owner
        with self.connect_database() as conn:
            conn.execute(self.sql("INSERT INTO guardian_notifications (id, user_id, kind, subject, body, status, next_attempt_at, created_at) VALUES (?, ?, 'reminder', 'PRIVATE-SUBJECT', 'PRIVATE-BODY', 'pending', ?, ?)"),
                         (notification, owner, "2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"))
        self.stop_server()
        self.start_server()
        self.assertEqual(self.put(token, harness.empty_state())[0], 200)
        with self.connect_database() as conn:
            row = conn.execute(self.sql("SELECT status, attempts, sent_at FROM guardian_notifications WHERE id = ?"), (notification,)).fetchone()
            self.assertEqual(tuple(row), ("pending", 0, None))

def load_tests(loader, tests, pattern):
    # The imported harness is reused for lifecycle/helpers, not rediscovered.
    return loader.loadTestsFromTestCase(PrivateWorkspacesApiTests)


if __name__ == "__main__":
    unittest.main(verbosity=2)
