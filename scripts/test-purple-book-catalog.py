#!/usr/bin/env python3
"""Check a locally supplied private bundle, including its API projection.

Set QUANTGYM_TECHNICAL_BUNDLE_PATH to the private release JSON before running.
The real source stays outside Git; public CI uses synthetic loader fixtures.
"""
import json
import os
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api-server"))
from technical_practice import load_technical_questions
from technical_reading_list import load_technical_supplements
from technical_source import load_technical_bundle
from personal_prep import validate_practice_session


@unittest.skipUnless(os.environ.get("QUANTGYM_TECHNICAL_BUNDLE_PATH"), "Private bundle fixture not configured")
class PurpleBookCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = load_technical_bundle()
        cls.rows = cls.bundle["problems"]
        cls.questions = load_technical_questions()
        cls.supplements = load_technical_supplements()
        cls.by_number = {q["provenance"]["originalNumber"]: q for q in cls.questions}

    def test_every_source_question_reaches_the_private_api(self):
        self.assertEqual(len(self.rows), 140)
        self.assertEqual(len(self.questions), 140)
        self.assertEqual(sum(len(group["questions"]) for group in self.supplements["readingList"]), 31)
        self.assertEqual(self.supplements["sourceMetadata"]["pdfPageCount"], 162)
        self.assertEqual({q["id"] for q in self.rows}, {q["id"] for q in self.questions})
        for question in self.questions:
            session = {"id": "catalog-check-" + question["id"], "kind": "tech", "status": "active",
                       "startedAt": "2026-09-13T12:00:00Z", "updatedAt": "2026-09-13T12:00:00Z",
                       "completedAt": None, "question": {**question, "url": ""}, "text": "",
                       "codeLanguage": "python", "selfAssessment": "", "elapsedSeconds": 0,
                       "timerStartedAt": None, "reviewed": False}
            validate_practice_session(session)
            session.update(status="completed", completedAt="2026-09-13T12:00:00Z", text="Fixture reasoning",
                           selfAssessment="review", reviewed=True)
            validate_practice_session(session)

    def test_original_numbering_is_complete_without_positional_renumbering(self):
        sizes = {"1.1": 18, "1.2": 10, "1.3": 5, "1.4": 5, "1.5": 6, "1.6": 3,
                 "2.1": 5, "2.2": 9, "2.3": 5, "2.4": 5, "3.1": 3, "3.2": 1,
                 "4.1": 6, "4.2": 2, "5.0": 7, "6.1": 17, "6.2": 7, "6.3": 4}
        expected = {f"{section}.{n}" for section, count in sizes.items() for n in range(1, count + 1)}
        expected |= {f"A.{n}" for n in range(1, 23)}
        self.assertEqual(set(self.by_number), expected)
        self.assertEqual(len(self.by_number), 140)
        old_ids = {f"catalog-problem-{n:03d}" for n in range(1, 107)}
        old_ids |= {f"catalog-exercise-{n:03d}" for n in range(1, 23)}
        self.assertTrue(old_ids <= {q["id"] for q in self.questions})
        self.assertEqual(self.by_number["1.2.1"]["id"], "catalog-problem-015")
        self.assertEqual(self.by_number["1.1.15"]["id"], "catalog-problem-107")
        self.assertEqual(self.by_number["3.2.1"]["id"], "catalog-problem-070")

    def test_answers_and_provenance_are_complete_and_honest(self):
        debris = re.compile(r"Actually re-read|Let me trust|Skip that replacement|Run xelatex|\\begin\{tikzpicture\}|\bTBD\b", re.I)
        for question in self.questions:
            source = question["provenance"]
            self.assertTrue(question["prompt"].strip())
            self.assertTrue(question["reference"].strip())
            self.assertTrue(source["chapter"] and source["section"])
            self.assertTrue(11 <= source["pdfPage"] <= 160)
            self.assertFalse(debris.search(question["reference"]))
            if source["originalNumber"].startswith("A."):
                self.assertEqual(source["answerStatus"], "supplemented")
                self.assertEqual(source["sourceReference"], "")
                self.assertIn("原书未附答案", source["reviewNotes"])
            elif source["answerStatus"] == "corrected":
                self.assertTrue(source["sourceReference"] and source["reviewNotes"])

    def test_known_edition_changes_are_not_lost(self):
        self.assertIn("HT", self.by_number["A.8"]["prompt"])
        self.assertNotIn("HTT", self.by_number["A.8"]["prompt"])
        self.assertIn("47.5572746565", self.by_number["1.1.13"]["reference"])
        self.assertIn("48.05", self.by_number["1.1.13"]["provenance"]["sourceReference"])
        self.assertIn("联合正态", self.by_number["1.1.8"]["reference"])
        self.assertEqual(self.by_number["1.6.3"]["provenance"]["answerStatus"], "corrected")
        self.assertNotIn("Lasso", self.by_number["5.0.1"]["provenance"]["section"])
        for n in range(1, 5):
            self.assertIn("```python", self.by_number[f"6.3.{n}"]["reference"])

    def test_private_book_is_not_enabled_in_the_public_catalog(self):
        manifest = json.loads((ROOT / "data/question-banks/catalog-manifest.json").read_text())
        source = next(s for s in manifest["sources"] if s["slug"] == "question-bank")
        self.assertTrue(source["disabled"])
        self.assertEqual(self.bundle["metadata"]["problemCount"], 140)
        self.assertTrue(all(q["visibility"] == "private" for q in self.rows))


if __name__ == "__main__":
    unittest.main(verbosity=2)
