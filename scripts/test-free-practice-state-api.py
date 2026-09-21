#!/usr/bin/env python3
"""Isolated free-practice tests: no API startup or database connections."""

import ast
import copy
from datetime import datetime, timezone
import itertools
import json
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
from free_practice_attempts import merge_free_practice_attempts, merge_free_practice_state

BASE = 1789905600000
DAY = 86400000


def iso(value):
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def attempt(identity, recorded=BASE, **extra):
    return {"id": identity, "startedAt": iso(recorded - 10000), "recordedAt": iso(recorded), "updatedAt": iso(recorded),
            "outcome": "wrong", "elapsedSeconds": 10, "answerViewed": False, "hintViewed": False, **extra}


def state(**fields):
    return {"problemId": "q", "updatedAt": iso(BASE), **fields}


def session(identity="active"):
    return {"id": identity, "startedAt": iso(BASE), "answerViewed": False, "hintViewed": False}


class FreePracticeMergeTests(unittest.TestCase):
    def test_stale_or_missing_client_fields_do_not_erase_history_or_change_legacy_write_rules(self):
        existing = state(freePracticeAttempts=[attempt("old", BASE - DAY), attempt("recent")], freePracticeSession=None,
                         favorite=True, interviewCount=9, privateNote="existing")
        incoming = state(favorite=False, interviewCount=1)
        original = copy.deepcopy([existing, incoming])
        merged = merge_free_practice_state(existing, incoming)
        self.assertEqual(merged["freePracticeAttempts"], existing["freePracticeAttempts"])
        self.assertIsNone(merged["freePracticeSession"])
        self.assertFalse(merged["favorite"])
        self.assertEqual(merged["interviewCount"], 1)
        self.assertNotIn("privateNote", merged)
        self.assertEqual([existing, incoming], original)
        self.assertEqual(merge_free_practice_state({}, incoming), incoming)

    def test_same_id_edits_keep_original_window_and_duration(self):
        first = attempt("a")
        changed = attempt("a", BASE + 5000, outcome="correct", elapsedSeconds=99, answerViewed=True)
        merged = merge_free_practice_attempts([[first], [changed]])
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["recordedAt"], first["recordedAt"])
        self.assertEqual(merged[0]["elapsedSeconds"], first["elapsedSeconds"])
        self.assertEqual(merged[0]["outcome"], "correct")
        self.assertTrue(merged[0]["answerViewed"])
        self.assertEqual(merged, merge_free_practice_attempts([[changed], [first]]))

    def test_concurrent_ids_use_fixed_windows_and_retain_incremental_evidence(self):
        records = [attempt("a"), attempt("b", BASE + 23 * 3600000, outcome="correct"),
                   attempt("c", BASE + 25 * 3600000, outcome="idea_wrong")]
        expected = merge_free_practice_attempts([records])
        self.assertEqual([item["id"] for item in expected], ["a", "c"])
        self.assertEqual(expected[0]["outcome"], "correct")
        self.assertEqual([item["id"] for item in expected[0]["syncRecords"]], ["a", "b"])
        for order in itertools.permutations(records):
            merged = []
            for item in order:
                merged = merge_free_practice_attempts([merged, [item]])
            self.assertEqual(merged, expected)
        boundary = merge_free_practice_attempts([[attempt("start"), attempt("edge", BASE + DAY)]])
        self.assertEqual(len(boundary), 2)

    def test_null_tombstone_and_missing_session_fields_are_distinct(self):
        active = state(freePracticeSession=session())
        empty = state(updatedAt=iso(BASE + 1000), freePracticeSession=None)
        for first, second in [(active, empty), (empty, active)]:
            self.assertIsNone(merge_free_practice_state(first, second)["freePracticeSession"])
        for first, second in [(active, state(freePracticeSession=None)), (state(freePracticeSession=None), active)]:
            self.assertIsNone(merge_free_practice_state(first, second)["freePracticeSession"])
        self.assertEqual(merge_free_practice_state(active, state(updatedAt=iso(BASE + 1000)))["freePracticeSession"], session())

    def test_completed_session_alias_cannot_revive_with_a_newer_cloud_timestamp(self):
        completed = state(freePracticeAttempts=[attempt("a"), attempt("b", BASE + 1000)], freePracticeSession=None)
        for identity in ["a", "b"]:
            stale = state(updatedAt=iso(BASE + 2000), freePracticeSession=session(identity))
            self.assertIsNone(merge_free_practice_state(completed, stale)["freePracticeSession"])

    def test_invalid_records_are_filtered_without_truncating_history(self):
        records = [attempt(f"day-{index}", BASE + index * DAY) for index in range(120)]
        invalid = [None, {}, attempt("bad", outcome=[]), attempt("date", startedAt="bad")]
        self.assertEqual(merge_free_practice_attempts([records, invalid]), records)

    def test_python_and_browser_merges_have_matching_normalization_and_collision_semantics(self):
        cases = [
            [[attempt("same")], [attempt("same", BASE + 5000, outcome="correct", elapsedSeconds=15, hintViewed=True)]],
            [[attempt("b", BASE + 23 * 3600000), attempt("c", BASE + 25 * 3600000)], [attempt("a")]],
            [[attempt("tie", outcome="correct")], [attempt("tie", outcome="wrong", elapsedSeconds=4)]],
            [[attempt("a"), attempt("at-boundary", BASE + DAY)]],
            [[attempt("numeric", startedAt=BASE - 1000, recordedAt=BASE, updatedAt=BASE, elapsedSeconds="2.8")]],
            [[attempt("offset", startedAt="2026-09-20T12:00:00+02:00", recordedAt="2026-09-20T12:01:00+02:00", updatedAt=None)]],
            [[None, {}, attempt("bad", outcome=[]), attempt("bad-time", startedAt="invalid")]],
        ]
        grouped = merge_free_practice_attempts(cases[1])
        cases.extend([[grouped, [attempt("d", BASE + 24 * 3600000)]], [grouped, grouped]])
        script = "import fs from 'node:fs'; import { mergeFreePracticeAttempts as merge } from './src/modules/problems/freePracticeAttempts.js'; console.log(JSON.stringify(JSON.parse(fs.readFileSync(0, 'utf8')).map(merge)));"
        result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, input=json.dumps(cases),
                                capture_output=True, text=True, check=True)
        self.assertEqual([merge_free_practice_attempts(case) for case in cases], json.loads(result.stdout))


class StubConnection:
    """Records SQL sequencing and JSON payloads without opening a database."""
    def __init__(self, records=None, in_transaction=False):
        self.records = copy.deepcopy(records or {})
        self.in_transaction = in_transaction
        self.calls = []

    def execute(self, sql, params=()):
        self.calls.append((sql, params))
        if sql == "BEGIN IMMEDIATE":
            self.in_transaction = True
        if "SELECT created_at, state_json" in sql:
            row = self.records.get(params[1])
            return SimpleNamespace(fetchone=lambda: row)
        if "INSERT INTO user_problem_states" in sql:
            self.records[params[1]] = {"created_at": params[3], "state_json": params[2]}
        return SimpleNamespace(fetchone=lambda: {"id": "owner"})


class ProblemStateWriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse((ROOT / "api-server/server.py").read_text())
        database = next(item for item in tree.body if isinstance(item, ast.ClassDef) and item.name == "Database")
        method = next(item for item in database.body if isinstance(item, ast.FunctionDef) and item.name == "save_problem_states")
        functions = [item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name in {"sanitize_problem_state", "parse_json"}]
        namespace = {
            "sqlite3": SimpleNamespace(Connection=object), "json": json,
            "utc_now": lambda: "2026-09-20T13:00:00Z", "HttpError": RuntimeError,
            "merge_free_practice_state": merge_free_practice_state,
            "compact_json": json.dumps, "guardian": SimpleNamespace(evaluate=lambda *args: None),
        }
        exec(compile(ast.Module(body=[*functions, method], type_ignores=[]), "isolated-problem-state-write", "exec"), namespace)
        cls.save = staticmethod(namespace["save_problem_states"])

    @staticmethod
    def db(backend="sqlite"):
        return SimpleNamespace(backend=backend, get_problem_states=lambda conn, user: [json.loads(row["state_json"]) for row in conn.records.values()])

    def test_sqlite_write_locks_before_read_and_preserves_history_from_an_older_client(self):
        previous = state(freePracticeAttempts=[attempt("first")], freePracticeSession=None)
        conn = StubConnection({"q": {"created_at": "first-created", "state_json": json.dumps(previous)}})
        result = self.save(self.db(), conn, "owner", [state(favorite=True)])
        self.assertEqual(conn.calls[0][0], "BEGIN IMMEDIATE")
        self.assertIn("SELECT created_at, state_json", conn.calls[1][0])
        self.assertEqual(result[0]["freePracticeAttempts"], previous["freePracticeAttempts"])
        self.assertIsNone(result[0]["freePracticeSession"])
        self.assertTrue(result[0]["favorite"])
        self.assertEqual(result[0]["updatedAt"], "2026-09-20T13:00:00Z")
        self.assertEqual(conn.records["q"]["created_at"], "first-created")

    def test_an_existing_transaction_is_reused_without_a_nested_begin(self):
        conn = StubConnection(in_transaction=True)
        self.save(self.db(), conn, "owner", [state(freePracticeAttempts=[attempt("new")])])
        self.assertFalse(any(sql.startswith("BEGIN") for sql, _ in conn.calls))

    def test_postgres_serializes_on_the_user_row_even_before_a_first_problem_state_exists(self):
        conn = StubConnection()
        result = self.save(self.db("postgres"), conn, "owner", [state(freePracticeAttempts=[attempt("new")])])
        self.assertEqual(conn.calls[0], ("SELECT id FROM users WHERE id = ? FOR UPDATE", ("owner",)))
        self.assertIn("SELECT created_at, state_json", conn.calls[1][0])
        self.assertEqual(result[0]["freePracticeAttempts"][0]["id"], "new")


if __name__ == "__main__":
    unittest.main()
