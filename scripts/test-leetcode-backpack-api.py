#!/usr/bin/env python3
"""Exercise private card backpacks through the real HTTP/account boundary.

Uses the existing API suite's disposable database and synthetic upstream only.
Pass --postgres to exercise the same contract on disposable local PostgreSQL.
"""
from concurrent.futures import ThreadPoolExecutor
import copy
import importlib.util
from pathlib import Path
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4


spec = importlib.util.spec_from_file_location(
    "backpack_api_harness", Path(__file__).with_name("test-leetcode-api.py")
)
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
lc = harness.lc
DRAW_AT = "2026-09-12T12:00:00.000Z"
BASELINE_AT = "2026-09-08T23:45:00.000Z"


class LeetCodeBackpackApiTests(unittest.TestCase):
    # Reuse the fixture server without inheriting/rerunning the unrelated suite.
    setUpClass = classmethod(harness.LeetCodeApiTests.setUpClass.__func__)
    tearDownClass = classmethod(harness.LeetCodeApiTests.tearDownClass.__func__)
    start_postgres = classmethod(harness.LeetCodeApiTests.start_postgres.__func__)
    request = harness.LeetCodeApiTests.request
    user = harness.LeetCodeApiTests.user
    connect = harness.LeetCodeApiTests.connect
    review_payload = harness.LeetCodeApiTests.review_payload

    def setUp(self):
        harness.LeetCodeApiTests.setUp(self)
        self.now = DRAW_AT
        clock = patch.object(lc, "now_iso", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)
        # The cache interval is covered by the existing API suite. Here each
        # requested refresh must consume the exact synthetic evidence supplied.
        cache = patch.object(lc, "sync_is_recent", return_value=False)
        cache.start()
        self.addCleanup(cache.stop)

    def connected_user(self):
        token, owner = self.user()
        status, snapshot, _ = self.connect(token)
        self.assertEqual(status, 200, snapshot)
        return token, owner, snapshot

    def payload(self, snapshot, slug="two-sum", event_id=None):
        return {"username": snapshot["connection"]["username"],
                "linkedAt": snapshot["connection"]["linkedAt"],
                "problemSlug": slug, "eventId": event_id or str(uuid4())}

    def draw(self, token, payload):
        status, snapshot, headers = self.request("POST", "/api/leetcode/backpack", token, payload)
        self.assertEqual(status, 200, snapshot)
        return snapshot, headers

    def sync_records(self, token, records):
        self.mock_fetch.side_effect = lambda username: {
            **harness.upstream(username), "submissions": copy.deepcopy(records)
        }
        status, snapshot, _ = self.request("POST", "/api/leetcode/sync", token, {})
        self.assertEqual(status, 200, snapshot)
        return snapshot

    def import_records(self, token, records=(), problems=()):
        status, snapshot, _ = self.request("POST", "/api/leetcode/import", token, {
            "username": "fixture-a", "submissions": list(records), "problems": list(problems)
        })
        self.assertEqual(status, 200, snapshot)
        return snapshot

    def stored(self, owner):
        with self.api.db.connect() as connection:
            return lc.get_record(connection, owner)

    def test_authenticated_private_shape_and_draw_preserves_trusted_evidence(self):
        status, error, headers = self.request("POST", "/api/leetcode/backpack", payload={})
        self.assertEqual(status, 401, error)
        self.assertIn("private", headers.get("Cache-Control", ""))
        self.assertIn("no-store", headers.get("Cache-Control", ""))
        token, owner, before = self.connected_user()
        self.assertEqual(before["reviewBackpack"], [])
        _, private_before = self.stored(owner)
        saved, headers = self.draw(token, self.payload(before))
        self.assertIn("private", headers.get("Cache-Control", ""))
        self.assertIn("no-store", headers.get("Cache-Control", ""))
        self.assertEqual(saved["reviewBackpack"], [{"problemSlug": "two-sum",
            "drawnAt": DRAW_AT, "baselineCompletedAt": BASELINE_AT}])
        self.assertFalse(any(key.startswith("_") for key in saved))
        for field in ("stats", "syncedLifetimeSolvedCount", "syncedSubmissions", "importedSubmissions", "submissions", "calendar", "coverage"):
            self.assertEqual(saved[field], before[field], field)
        _, private_after = self.stored(owner)
        for field in ("_syncedAcceptedSubmissions", "_syncedAcceptedConnection", "stats", "_records"):
            self.assertEqual(private_after[field], private_before[field], field)
        self.assertEqual(self.request("GET", token=token)[1]["reviewBackpack"], saved["reviewBackpack"])

    def test_invalid_binding_owner_and_event_reuse_are_atomic(self):
        token, owner, snapshot = self.connected_user()
        payload = self.payload(snapshot)
        saved, _ = self.draw(token, payload)
        revision, private = self.stored(owner)
        cases = [
            ({**payload, "userId": "other-account"}, 400),
            ({**payload, "drawnAt": "2000-01-01T00:00:00Z"}, 400),
            ({**payload, "baselineCompletedAt": None}, 400),
            ({**payload, "username": "different-profile"}, 409),
            ({**payload, "linkedAt": "2020-01-01T00:00:00.000Z"}, 409),
            ({**payload, "eventId": "invalid"}, 400),
            ({**payload, "problemSlug": "../two-sum"}, 400),
            ({**payload, "problemSlug": "unknown-problem"}, 404),
            ({**payload, "problemSlug": "valid-parentheses"}, 409),
        ]
        for candidate, expected in cases:
            with self.subTest(candidate=candidate):
                status, body, _ = self.request("POST", "/api/leetcode/backpack", token, candidate)
                self.assertEqual(status, expected, body)
                self.assertEqual(self.stored(owner), (revision, private))
                self.assertEqual(self.request("GET", token=token)[1]["reviewBackpack"], saved["reviewBackpack"])

    def test_retries_and_new_draws_of_pending_problem_do_not_reset_its_baseline(self):
        token, owner, snapshot = self.connected_user()
        payload = self.payload(snapshot)
        saved, _ = self.draw(token, payload)
        revision, _ = self.stored(owner)
        self.now = "2026-09-12T13:00:00.000Z"
        retry, _ = self.draw(token, payload)
        self.assertEqual(self.stored(owner)[0], revision, "Same event must be a no-write replay")
        pending, _ = self.draw(token, self.payload(snapshot))
        self.assertEqual(retry["reviewBackpack"], saved["reviewBackpack"])
        self.assertEqual(pending["reviewBackpack"], saved["reviewBackpack"])

    def test_old_import_metadata_wa_unrelated_ac_review_and_unchanged_sync_do_not_clear(self):
        token, _, snapshot = self.connected_user()
        saved, _ = self.draw(token, self.payload(snapshot))
        expected = saved["reviewBackpack"]
        self.now = "2026-09-12T13:00:00.000Z"
        evidence = self.import_records(token, [
            harness.record("old-import", "two-sum", when="2026-09-12T11:59:59.999Z"),
            harness.record("failed-after-draw", "two-sum", status="WA", when="2026-09-12T12:30:00Z"),
            harness.record("different-after-draw", "valid-parentheses", when="2026-09-12T12:30:00Z"),
        ], [{"slug": "two-sum", "lastAcceptedAt": "2026-09-12T12:45:00Z"}])
        self.assertEqual(evidence["reviewBackpack"], expected)
        status, rated, _ = self.request("POST", "/api/leetcode/review", token,
                                       self.review_payload(evidence))
        self.assertEqual(status, 200, rated)
        self.assertEqual(rated["reviewBackpack"], expected)
        refreshed = self.sync_records(token, harness.upstream()["submissions"])
        self.assertEqual(refreshed["reviewBackpack"], expected)

    def test_completion_at_draw_time_is_inclusive_but_baseline_is_strict(self):
        token, _, snapshot = self.connected_user()
        saved, _ = self.draw(token, self.payload(snapshot))
        before_draw = harness.record("before-draw", "two-sum", when="2026-09-12T11:59:59.999Z")
        same_instant = harness.record("at-draw", "two-sum", when=DRAW_AT)
        self.assertEqual(self.sync_records(token, [before_draw])["reviewBackpack"], saved["reviewBackpack"])
        self.assertEqual(self.sync_records(token, [same_instant])["reviewBackpack"], [])
        redrawn, _ = self.draw(token, self.payload(snapshot))
        self.assertEqual(redrawn["reviewBackpack"][0]["baselineCompletedAt"], DRAW_AT)
        duplicate_time = harness.record("second-at-draw", "two-sum", when=DRAW_AT)
        self.assertEqual(self.sync_records(token, [duplicate_time])["reviewBackpack"], redrawn["reviewBackpack"])
        self.now = "2026-09-12T12:00:00.001Z"
        later = harness.record("after-baseline", "two-sum", when=self.now)
        self.assertEqual(self.sync_records(token, [later])["reviewBackpack"], [])

    def test_future_ac_does_not_clear_until_that_completion_time(self):
        token, _, snapshot = self.connected_user()
        saved, _ = self.draw(token, self.payload(snapshot))
        self.now = "2026-09-12T12:10:00.000Z"
        future = harness.record("future", "two-sum", when="2026-09-13T12:00:00Z")
        refreshed = self.sync_records(token, [future])
        self.assertEqual(refreshed["reviewBackpack"], saved["reviewBackpack"])
        self.assertEqual(self.request("GET", token=token)[1]["reviewBackpack"], saved["reviewBackpack"])
        self.now = "2026-09-13T12:00:00.000Z"
        self.assertEqual(self.request("GET", token=token)[1]["reviewBackpack"], [])

    def test_completion_retry_and_redraw_keep_distinct_durable_event_receipts(self):
        token, owner, snapshot = self.connected_user()
        payload = self.payload(snapshot)
        self.draw(token, payload)
        self.now = "2026-09-12T13:00:00.000Z"
        accepted = harness.record("new-ac", "two-sum", when="2026-09-12T12:30:00Z")
        self.assertEqual(self.sync_records(token, [accepted])["reviewBackpack"], [])
        revision, _ = self.stored(owner)
        replayed, _ = self.draw(token, payload)
        self.assertEqual(replayed["reviewBackpack"], [])
        self.assertEqual(self.stored(owner)[0], revision)
        self.now = "2026-09-12T14:00:00.000Z"
        redrawn, _ = self.draw(token, self.payload(snapshot))
        self.assertEqual(redrawn["reviewBackpack"], [{"problemSlug": "two-sum", "drawnAt": self.now,
            "baselineCompletedAt": "2026-09-12T12:30:00.000Z"}])
        old_retry, _ = self.draw(token, payload)
        self.assertEqual(old_retry["reviewBackpack"], redrawn["reviewBackpack"])
        self.assertEqual(self.request("GET", token=token)[1]["reviewBackpack"], redrawn["reviewBackpack"])

    def test_new_imported_ac_can_complete_personal_card_without_trusted_stat_pollution(self):
        token, owner, before = self.connected_user()
        _, private_before = self.stored(owner)
        self.draw(token, self.payload(before))
        self.now = "2026-09-12T13:00:00.000Z"
        accepted = harness.record("import-after-draw", "two-sum", when="2026-09-12T12:30:00Z")
        for _ in range(2):
            imported = self.import_records(token, [accepted])
            self.assertEqual(imported["reviewBackpack"], [])
            self.assertEqual([row["id"] for row in imported["importedSubmissions"]], [accepted["id"]])
            for field in ("stats", "syncedLifetimeSolvedCount", "syncedSubmissions", "calendar"):
                self.assertEqual(imported[field], before[field], field)
        _, private_after = self.stored(owner)
        for field in ("_syncedAcceptedSubmissions", "_syncedAcceptedConnection", "stats"):
            self.assertEqual(private_after[field], private_before[field], field)

    def test_completed_card_stays_removed_after_historical_records_are_compacted(self):
        token, owner, snapshot = self.connected_user()
        original_draw = self.payload(snapshot)
        self.draw(token, original_draw)
        self.now = "2026-09-12T13:00:00.000Z"
        accepted = harness.record("later-compacted-ac", "two-sum", when="2026-09-12T12:30:00Z")
        self.assertEqual(self.sync_records(token, [accepted])["reviewBackpack"], [])
        # Model future retention/compaction of the completion ledger, while
        # keeping the historical card/event receipts and the problem itself.
        with self.api.db.connect() as connection:
            revision, saved = lc.get_record(connection, owner)
            for field in ("_records", "_syncedAcceptedSubmissions", "submissions"):
                saved[field] = [row for row in saved[field] if row["id"] != accepted["id"]]
            lc.save_snapshot(connection, owner, revision, saved)
        current = self.request("GET", token=token)[1]
        self.assertNotIn(accepted["id"], {row["id"] for row in current["syncedSubmissions"]})
        self.assertNotIn(accepted["id"], {row["id"] for row in current["importedSubmissions"]})
        self.assertEqual(current["reviewBackpack"], [])
        self.assertEqual(self.draw(token, original_draw)[0]["reviewBackpack"], [])
        self.now = "2026-09-12T14:00:00.000Z"
        redrawn, _ = self.draw(token, self.payload(current))
        self.assertEqual(redrawn["reviewBackpack"], [{"problemSlug": "two-sum", "drawnAt": self.now,
            "baselineCompletedAt": BASELINE_AT}])
        self.assertEqual(self.draw(token, original_draw)[0]["reviewBackpack"], redrawn["reviewBackpack"])

    def test_unknown_completion_date_uses_null_baseline_without_trusting_metadata(self):
        token, _, _ = self.connected_user()
        imported = self.import_records(token, problems=[{"slug": "binary-search", "title": "Binary search",
            "lastAcceptedAt": "2026-09-12T11:00:00Z"}])
        saved, _ = self.draw(token, self.payload(imported, "binary-search"))
        self.assertEqual(saved["reviewBackpack"], [{"problemSlug": "binary-search",
            "drawnAt": DRAW_AT, "baselineCompletedAt": None}])
        old_ac = harness.record("old-binary-search", "binary-search", when="2026-09-11T10:00:00Z")
        self.assertEqual(self.import_records(token, [old_ac])["reviewBackpack"], saved["reviewBackpack"])
        self.now = "2026-09-12T13:00:00.000Z"
        new_ac = harness.record("new-binary-search", "binary-search", when=self.now)
        self.assertEqual(self.import_records(token, [new_ac])["reviewBackpack"], [])

    def test_cloud_accounts_and_connection_lifetimes_are_isolated(self):
        token_a, _, original = self.connected_user()
        token_b, _, second = self.connected_user()
        payload = self.payload(original)
        saved_a, _ = self.draw(token_a, payload)
        self.assertEqual(self.request("GET", token=token_b)[1]["reviewBackpack"], [])
        self.draw(token_b, self.payload(second, "valid-parentheses"))
        self.assertEqual(self.request("GET", token=token_a)[1]["reviewBackpack"], saved_a["reviewBackpack"])
        self.now = "2026-09-12T13:00:00.000Z"
        status, switched, _ = self.connect(token_a, "fixture-b")
        self.assertEqual(status, 200, switched)
        self.assertEqual(switched["reviewBackpack"], [])
        self.assertEqual(self.request("POST", "/api/leetcode/backpack", token_a, payload)[0], 409)
        self.draw(token_a, self.payload(switched))
        self.assertEqual(self.request("DELETE", token=token_a)[1]["reviewBackpack"], [])
        self.now = "2026-09-12T14:00:00.000Z"
        status, relinked, _ = self.connect(token_a)
        self.assertEqual(status, 200, relinked)
        self.assertNotEqual(relinked["connection"]["linkedAt"], original["connection"]["linkedAt"])
        self.assertEqual(relinked["reviewBackpack"], [])
        self.assertEqual(self.request("POST", "/api/leetcode/backpack", token_a, payload)[0], 409)
        # An event UUID is private to its owner and binding, not globally spent.
        self.draw(token_a, self.payload(relinked, event_id=payload["eventId"]))
        self.assertEqual([row["problemSlug"] for row in self.request("GET", token=token_b)[1]["reviewBackpack"]], ["valid-parentheses"])

    def concurrent_draws(self, token, payloads):
        barrier = threading.Barrier(2)
        lock = threading.Lock()
        attempts = 0
        original_save = lc.save_snapshot

        def simultaneous_first_saves(*args, **kwargs):
            nonlocal attempts
            with lock:
                attempts += 1
                should_wait = attempts <= 2
            if should_wait:
                barrier.wait(timeout=5)
            return original_save(*args, **kwargs)

        with patch.object(lc, "save_snapshot", side_effect=simultaneous_first_saves):
            with ThreadPoolExecutor(max_workers=2) as pool:
                futures = [pool.submit(self.request, "POST", "/api/leetcode/backpack", token, payload)
                           for payload in payloads]
                results = [future.result(timeout=10) for future in futures]
        for status, body, _ in results:
            self.assertEqual(status, 200, body)
        return self.request("GET", token=token)[1]

    def test_concurrent_same_event_deliveries_create_one_card(self):
        token, owner, snapshot = self.connected_user()
        payload = self.payload(snapshot)
        revision, _ = self.stored(owner)
        saved = self.concurrent_draws(token, [payload, payload])
        self.assertEqual(len(saved["reviewBackpack"]), 1)
        self.assertEqual(self.stored(owner)[0], revision + 1)
        self.assertEqual(self.draw(token, payload)[0]["reviewBackpack"], saved["reviewBackpack"])

    def test_concurrent_different_cards_reapply_without_losing_either(self):
        token, _, snapshot = self.connected_user()
        saved = self.concurrent_draws(token, [self.payload(snapshot), self.payload(snapshot, "valid-parentheses")])
        self.assertEqual({row["problemSlug"] for row in saved["reviewBackpack"]}, {"two-sum", "valid-parentheses"})

    def test_disconnect_while_draw_is_in_flight_cannot_recreate_old_binding(self):
        token, _, snapshot = self.connected_user()
        payload = self.payload(snapshot)
        reached_save, release_save = threading.Event(), threading.Event()
        original_save = lc.save_snapshot

        def delayed_card_save(connection, owner, revision, pending):
            if pending.get("_reviewBackpackEvents", {}).get(payload["eventId"]):
                reached_save.set()
                if not release_save.wait(timeout=5):
                    raise RuntimeError("Test did not release pending draw")
            return original_save(connection, owner, revision, pending)

        with patch.object(lc, "save_snapshot", side_effect=delayed_card_save):
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(self.request, "POST", "/api/leetcode/backpack", token, payload)
                try:
                    self.assertTrue(reached_save.wait(timeout=5))
                    status, disconnected, _ = self.request("DELETE", token=token)
                    self.assertEqual(status, 200, disconnected)
                finally:
                    release_save.set()
                status, error, _ = future.result(timeout=10)
                self.assertEqual(status, 409, error)
        current = self.request("GET", token=token)[1]
        self.assertIsNone(current["connection"])
        self.assertEqual(current["reviewBackpack"], [])


if __name__ == "__main__":
    unittest.main()
