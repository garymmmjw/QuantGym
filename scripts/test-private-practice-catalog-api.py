#!/usr/bin/env python3
"""Synthetic fixtures only: no deployed API or user database is opened."""

import ast
import copy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
from types import MethodType, SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
from private_practice_catalog import (
    import_private_catalog, is_curated_private_problem, is_retired_private_problem,
    lock_problem_catalog, validate_private_catalog,
)

NOW = "2026-09-20T12:00:00Z"


def question(identity="q1", source="quantguide", **extra):
    return {"id": identity, "source": source, "visibility": "private", "titleEn": "Synthetic fixture",
            "promptEn": "What is one plus one?", "explanation": "Two.",
            "review": {key: {"status": "approved_manual"} for key in ("prompt", "classification", "answer")},
            "quantguide": {"topic": "probability"}, "provenance": {"edition": "fixture"},
            "interviewEvidence": {"company": "Synthetic company"}, **extra}


def isolated_database():
    # In-memory SQL verifies the actual FK and rollback behavior while never
    # importing server.py's module-level live-database initialization.
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE problems (
            id TEXT PRIMARY KEY, visibility TEXT NOT NULL, owner_user_id TEXT,
            title_en TEXT, title_zh TEXT, category TEXT, difficulty TEXT, tags_json TEXT,
            source TEXT, source_url TEXT, prompt_en TEXT, prompt_zh TEXT,
            answer TEXT, explanation TEXT, problem_json TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE user_problem_states (user_id TEXT, problem_id TEXT, state_json TEXT);
        CREATE TABLE problem_comments (id TEXT PRIMARY KEY, problem_id TEXT REFERENCES problems(id) ON DELETE CASCADE, text TEXT);
        CREATE TABLE problem_likes (problem_id TEXT REFERENCES problems(id) ON DELETE CASCADE, user_id TEXT);
    """)
    tree = ast.parse((ROOT / "api-server/server.py").read_text())
    database = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Database")
    names = {"get_problems", "upsert_problems", "import_problem_catalog"}
    methods = [node for node in database.body if isinstance(node, ast.FunctionDef) and node.name in names]
    helper_names = {"sanitize_problem", "normalize_tags", "parse_json", "api_timestamp", "is_valid_timestamp"}
    helpers = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in helper_names]
    namespace = {"sqlite3": sqlite3, "Path": Path, "json": json, "datetime": datetime, "timezone": timezone,
                 "utc_now": lambda: NOW, "HttpError": RuntimeError, "compact_json": json.dumps,
                 "is_curated_private_problem": is_curated_private_problem, "is_retired_private_problem": is_retired_private_problem,
                 "lock_problem_catalog": lock_problem_catalog}
    exec(compile(ast.Module(body=[*helpers, *methods], type_ignores=[]), "isolated-catalog-methods", "exec"), namespace)
    # Catalog import tests use a member owner; HTTP membership enforcement is
    # covered by test-memberships-api.py, without coupling this SQL fixture to accounts.
    result = SimpleNamespace(backend="sqlite", connect=lambda: conn, conn=conn, user_is_member=lambda conn, user_id: bool(user_id))
    for name in names:
        setattr(result, name, MethodType(namespace[name], result))
    return result


class PrivateCatalogTests(unittest.TestCase):
    def setUp(self):
        self.db = isolated_database()
        self.addCleanup(self.db.conn.close)

    def seed(self, rows, **options):
        with self.db.connect() as conn:
            return self.db.upsert_problems(conn, rows, preserve_problem_visibility=True, **options)

    def test_validation_accepts_both_envelopes_and_keeps_all_original_metadata(self):
        row = question()
        original = copy.deepcopy(row)
        for payload in [[row], {"problems": [row]}]:
            validated, digest = validate_private_catalog(payload, "quantguide", 1)
            self.assertEqual(validated, [original])
            self.assertEqual(len(digest), 64)
        result = import_private_catalog(self.db, [row], "quantguide", 1, NOW)
        self.assertEqual((result["problemCount"], result["retiredCount"]), (1, 0))
        saved = self.db.get_problems(self.db.conn, "owner")[0]
        for key in ("review", "quantguide", "provenance", "interviewEvidence"):
            self.assertEqual(saved[key], original[key])
        self.assertTrue(is_curated_private_problem(saved))
        self.assertEqual(row, original)

    def test_invalid_count_ids_visibility_source_and_review_are_rejected_before_writing(self):
        variants = [([question()], "quantguide", 2), ([question(), question()], "quantguide", 2),
                    ([question(visibility="public")], "quantguide", 1), ([question()], "other", 1),
                    ([question(source="interview-glassdoor")], "quantguide", 1),
                    ([question(id=" ")], "quantguide", 1), ([question(review={})], "quantguide", 1)]
        for payload, source, count in variants:
            with self.subTest(source=source, count=count), self.assertRaises(ValueError):
                import_private_catalog(self.db, payload, source, count, NOW)
        self.assertEqual(self.db.conn.execute("SELECT COUNT(*) FROM problems").fetchone()[0], 0)

    def test_purple_book_requires_complete_taxonomy_and_preserves_it(self):
        taxonomy = {"chapterId": "c1", "sectionId": "c1-s1", "chapterZh": "章节", "chapterEn": "Chapter",
                    "sectionZh": "小节", "sectionEn": "Section", "chapterOrder": 1, "sectionOrder": 0, "questionOrder": 1}
        row = question(source="question-bank", practiceTaxonomy=taxonomy)
        import_private_catalog(self.db, [row], "question-bank", 1, NOW)
        self.assertEqual(self.db.get_problems(self.db.conn, "owner")[0]["practiceTaxonomy"], taxonomy)
        with self.assertRaises(ValueError):
            validate_private_catalog([question(source="question-bank")], "question-bank", 1)

    def test_retirement_keeps_states_comments_and_likes_but_hides_removed_questions(self):
        self.seed([question("keep", visibility="public"), question("old", visibility="public"), question("unrelated", source="other", visibility="public")])
        with self.db.connect() as conn:
            conn.execute("INSERT INTO user_problem_states VALUES ('owner','old','{\"favorite\":true}')")
            conn.execute("INSERT INTO problem_comments VALUES ('comment','old','private note')")
            conn.execute("INSERT INTO problem_likes VALUES ('old','owner')")
        result = import_private_catalog(self.db, [question("keep")], "quantguide", 1, NOW)
        self.assertEqual(result["retiredCount"], 1)
        self.assertEqual({q["id"] for q in self.db.get_problems(self.db.conn)}, {"unrelated"})
        self.assertEqual({q["id"] for q in self.db.get_problems(self.db.conn, "owner")}, {"keep", "unrelated"})
        for table in ("user_problem_states", "problem_comments", "problem_likes"):
            self.assertEqual(self.db.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0], 1)
        retired = json.loads(self.db.conn.execute("SELECT problem_json FROM problems WHERE id='old'").fetchone()[0])
        self.assertTrue(is_retired_private_problem(retired))

    def test_redeploy_does_not_restore_or_overwrite_old_catalog_questions(self):
        self.seed([question("keep"), question("obsolete")])
        import_private_catalog(self.db, [question("keep", titleEn="Reviewed edition")], "quantguide", 1, NOW)
        with tempfile.TemporaryDirectory() as directory:
            catalog = Path(directory) / "public-catalog.json"
            catalog.write_text(json.dumps({"problems": [question("keep", titleEn="Old edition"), question("obsolete"), question("public", source="other", visibility="public")]}))
            self.db.import_problem_catalog(catalog)
        visible = {q["id"]: q for q in self.db.get_problems(self.db.conn, "owner")}
        self.assertEqual(set(visible), {"keep", "public"})
        self.assertEqual(visible["keep"]["titleEn"], "Reviewed edition")
        self.assertEqual(self.db.conn.execute("SELECT COUNT(*) FROM problems").fetchone()[0], 3)

    def test_initial_runtime_catalog_import_preserves_private_visibility(self):
        with tempfile.TemporaryDirectory() as directory:
            catalog = Path(directory) / "mixed.json"
            catalog.write_text(json.dumps({"problems": [question(), question("public", source="other", visibility="public")]}))
            self.db.import_problem_catalog(catalog)
        self.assertEqual({q["id"] for q in self.db.get_problems(self.db.conn)}, {"public"})
        self.assertEqual({q["id"] for q in self.db.get_problems(self.db.conn, "owner")}, {"public", "q1"})

    def test_user_owned_or_other_source_id_conflicts_roll_back(self):
        self.seed([question("owned")], visibility="user", owner_user_id="owner")
        self.seed([question("foreign", source="other")])
        for identity in ("owned", "foreign"):
            with self.assertRaises(ValueError):
                import_private_catalog(self.db, [question("new"), question(identity)], "quantguide", 2, NOW)
        self.assertEqual({row[0] for row in self.db.conn.execute("SELECT id FROM problems")}, {"owned", "foreign"})

    def test_a_failed_upsert_does_not_partially_replace_a_source(self):
        self.seed([question("before")])
        original = self.db.upsert_problems
        def fail_after_write(conn, rows, **options):
            original(conn, rows, **options)
            raise ValueError("synthetic failure")
        self.db.upsert_problems = fail_after_write
        with self.assertRaises(ValueError):
            import_private_catalog(self.db, [question("after")], "quantguide", 1, NOW)
        self.assertEqual({row[0] for row in self.db.conn.execute("SELECT id FROM problems")}, {"before"})

    def test_postgres_catalog_lock_uses_the_same_lock_for_startup_and_operator_import(self):
        calls = []
        lock_problem_catalog(SimpleNamespace(execute=lambda query: calls.append(query)), "postgres")
        self.assertEqual(calls, ["LOCK TABLE problems IN SHARE ROW EXCLUSIVE MODE"])

    def test_cli_can_validate_stdin_and_reject_invalid_data_without_opening_a_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "must-not-exist.sqlite3"
            env = {**os.environ, "QUANTGYM_DB": str(path), "QUANTGYM_DB_BACKEND": "sqlite"}
            command = [sys.executable, str(ROOT / "api-server/import_private_practice.py"), "--source", "quantguide", "--expected-count", "1", "--stdin", "--validate-only"]
            result = subprocess.run(command, input=json.dumps({"problems": [question()]}), capture_output=True, text=True, env=env)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["problemCount"], 1)
            self.assertNotIn("Synthetic fixture", result.stdout)
            self.assertFalse(path.exists())
            failed = subprocess.run(command[:-1], input='{"private text":', capture_output=True, text=True, env=env)
            self.assertEqual(failed.returncode, 2)
            self.assertNotIn("private text", failed.stderr)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
