#!/usr/bin/env python3
"""Synthetic tests for runtime private question bundles; no book text required."""

import copy
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
import technical_source as source
import technical_practice as practice
import technical_reading_list as reading


def fixture(label="first"):
    return {
        "version": 1, "source": "question-bank",
        "problems": [{"id": "fixture-question", "source": "question-bank", "titleZh": label,
                      "category": "probabilityExpectation", "promptZh": "What is one plus one?",
                      "explanation": "Two."}],
        "supplements": {"groups": [{"id": "fixture-links", "label": label, "questions": [
            {"frontendId": "1", "slug": "two-sum", "titleZh": "Synthetic link fixture",
             "sourcePage": "Appendix", "pdfPage": 1}]}]},
        "metadata": {"problemCount": 1},
    }


class TechnicalSourceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.default = self.root / "default-private.json"
        self.env = patch.dict(os.environ)
        self.env.start()
        os.environ.pop("QUANTGYM_TECHNICAL_BUNDLE_PATH", None)
        self.default_patch = patch.object(source, "DEFAULT_BUNDLE_PATH", self.default)
        self.default_patch.start()
        self.clear_caches()

    @staticmethod
    def clear_caches():
        source.load_technical_bundle.cache_clear()
        practice.load_technical_questions.cache_clear()
        reading.load_technical_supplements.cache_clear()

    def tearDown(self):
        self.clear_caches()
        self.default_patch.stop()
        self.env.stop()
        self.temp.cleanup()

    def write(self, payload=None):
        self.default.write_text(json.dumps(fixture() if payload is None else payload), encoding="utf-8")
        return self.default

    def test_missing_default_uses_legacy_questions_and_empty_supplements(self):
        legacy = self.root / "legacy.json"
        legacy.write_text(json.dumps({"problems": fixture("legacy")["problems"]}))
        with patch.object(practice, "SOURCE_PATH", legacy), patch.object(reading, "SOURCE_PATH", self.root / "missing-links.json"):
            self.assertIsNone(source.load_technical_bundle())
            self.assertEqual(practice.load_technical_questions()[0]["title"], "legacy")
            self.assertEqual(reading.load_technical_supplements(), {"readingList": [], "sourceMetadata": None})

    def test_present_default_bundle_is_used(self):
        self.write()
        self.assertEqual(practice.load_technical_questions()[0]["title"], "first")
        self.assertEqual(reading.load_technical_supplements()["readingList"][0]["label"], "first")

    def test_explicit_bundle_can_override_default(self):
        selected = self.root / "selected.json"
        selected.write_text(json.dumps(fixture("selected")))
        self.write(fixture("default"))
        os.environ["QUANTGYM_TECHNICAL_BUNDLE_PATH"] = str(selected)
        self.assertEqual(practice.load_technical_questions()[0]["title"], "selected")

    def test_bundle_rejects_content_that_projection_would_filter(self):
        mutations = [
            lambda row: row.update(promptZh=""),
            lambda row: row.update(explanation=""),
            lambda row: row.update(provenance={"answerStatus": "invalid"}),
            lambda row: row.update(promptZh="![embedded media](https://example.com/image.png)"),
        ]
        for index, mutate in enumerate(mutations):
            with self.subTest(index=index):
                payload = fixture()
                mutate(payload["problems"][0])
                self.write(payload)
                with self.assertRaisesRegex(ValueError, "invalid question content"):
                    practice.load_technical_questions()
                self.clear_caches()

    def test_legacy_catalog_keeps_existing_filtering_behavior(self):
        rows = fixture("legacy")["problems"]
        rows.append({"id": "invalid-question", "source": "question-bank", "promptZh": ""})
        legacy = self.root / "legacy.json"
        legacy.write_text(json.dumps(rows))
        with patch.object(practice, "SOURCE_PATH", legacy):
            self.assertEqual(len(practice.load_technical_questions()), 1)

    def test_questions_and_supplements_share_one_cached_snapshot(self):
        self.write(fixture("before"))
        self.assertEqual(practice.load_technical_questions()[0]["title"], "before")
        self.write(fixture("after"))
        self.assertEqual(reading.load_technical_supplements()["readingList"][0]["label"], "before")
        self.clear_caches()
        self.assertEqual(reading.load_technical_supplements()["readingList"][0]["label"], "after")
        self.assertEqual(practice.load_technical_questions()[0]["title"], "after")

    def test_explicit_missing_path_does_not_fall_back(self):
        os.environ["QUANTGYM_TECHNICAL_BUNDLE_PATH"] = str(self.root / "missing.json")
        with self.assertRaises(FileNotFoundError):
            practice.load_technical_questions()

    def test_empty_explicit_path_is_configuration_error(self):
        os.environ["QUANTGYM_TECHNICAL_BUNDLE_PATH"] = "  "
        with self.assertRaises(ValueError):
            source.load_technical_bundle()

    def test_present_invalid_default_does_not_fall_back(self):
        for content in (b"not-json", b"\xff", b"[" * 2000):
            with self.subTest(content_kind=content[:8]):
                self.default.write_bytes(content)
                with self.assertRaises(ValueError):
                    source.load_technical_bundle()
                self.clear_caches()

    def test_broken_default_symlink_is_not_treated_as_unconfigured(self):
        self.default.symlink_to(self.root / "missing-target.json")
        with self.assertRaises(FileNotFoundError):
            source.load_technical_bundle()

    def test_size_limit_is_enforced_before_parsing(self):
        self.default.write_bytes(b" " * (source.MAX_BUNDLE_BYTES + 1))
        with self.assertRaisesRegex(ValueError, "too large"):
            source.load_technical_bundle()

    def test_invalid_shapes_and_counts_are_rejected(self):
        mutations = [
            lambda p: p.update(version=True),
            lambda p: p.update(version=2),
            lambda p: p.update(source="other"),
            lambda p: p.update(unexpected="field"),
            lambda p: p.update(problems=[]),
            lambda p: p.update(problems=["invalid"]),
            lambda p: p["problems"][0].update(id=""),
            lambda p: p["problems"][0].update(source="other"),
            lambda p: p["problems"].append(copy.deepcopy(p["problems"][0])),
            lambda p: p.update(supplements=[]),
            lambda p: p.update(metadata=[]),
            lambda p: p["metadata"].update(problemCount=2),
            lambda p: p["metadata"].update(problemCount=True),
        ]
        for index, mutate in enumerate(mutations):
            with self.subTest(index=index):
                payload = fixture()
                mutate(payload)
                self.write(payload)
                with self.assertRaises(ValueError):
                    source.load_technical_bundle()
                self.clear_caches()


if __name__ == "__main__":
    unittest.main(verbosity=2)
