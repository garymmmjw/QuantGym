#!/usr/bin/env python3
"""Pure question-bank counting checks; no database, email or external services."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import unittest
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'api-server'))
from guardian import collect_practice, counted_practice

AT = datetime(2026, 9, 20, 12, tzinfo=timezone.utc)


def stamp(value):
    return value.isoformat().replace('+00:00', 'Z')


def attempt(identity, when=AT, outcome='wrong', **extra):
    return {'id': identity, 'startedAt': stamp(when - timedelta(minutes=2)),
            'recordedAt': stamp(when), 'updatedAt': stamp(when), 'outcome': outcome, **extra}


def projected(states, personal=None, legacy=None, catalog=None, zone='UTC'):
    return counted_practice(collect_practice(personal or {}, legacy or {}, states,
                            catalog=catalog, at=AT + timedelta(days=3)), ZoneInfo(zone))


class QuestionPracticeCountingTests(unittest.TestCase):
    def test_all_submitted_outcomes_count_without_completed_flag(self):
        states = [{'problemId': value, 'freePracticeAttempts': [attempt(value, outcome=value)]}
                  for value in ('wrong', 'idea_wrong', 'correct')]
        rows = projected(states)
        self.assertEqual(sum(row['count'] for row in rows), 3)
        self.assertTrue(all(row['kind'] == 'tech' for row in rows))
        self.assertFalse(any(field.startswith('_') for row in rows for field in row))
        self.assertFalse(any(field in row for row in rows for field in ('outcome', 'answerViewed', 'elapsedSeconds')))

    def test_revisions_and_duplicate_devices_keep_original_day(self):
        first = attempt('first')
        revision = {**first, 'outcome': 'correct', 'updatedAt': stamp(AT + timedelta(hours=1))}
        states = [{'problemId': 'q1', 'freePracticeAttempts': [revision]}]
        legacy = {'problemStates': [{'problemId': 'q1', 'freePracticeAttempts': [first, attempt('second', AT + timedelta(seconds=1))]}]}
        rows = projected(states, legacy=legacy)
        self.assertEqual(len(rows), 1)
        self.assertEqual(datetime.fromisoformat(rows[0]['completedAt'].replace('Z', '+00:00')), AT)

    def test_cross_day_attempts_remain_separate(self):
        rows = projected([{'problemId': 'q1', 'freePracticeAttempts': [attempt('first'), attempt('again', AT + timedelta(days=1))]}])
        self.assertEqual(len(rows), 2)

    def test_no_credit_for_open_invalid_future_leetcode_or_trainers(self):
        states = [{'problemId': 'draft', 'freePracticeSession': {'id': 'active', 'startedAt': stamp(AT)}},
                  {'problemId': 'invalid', 'freePracticeAttempts': [attempt('invalid', outcome='unknown')]},
                  {'problemId': 'future', 'freePracticeAttempts': [attempt('future', AT + timedelta(days=4))]},
                  {'problemId': 'leetcode-two-sum', 'freePracticeAttempts': [attempt('leetcode')]},
                  {'problemId': 'mental', 'freePracticeAttempts': [attempt('mental')]}]
        self.assertEqual(projected(states, catalog={'mental': {'id': 'mental', 'category': 'mental'}}), [])

    def test_legacy_mirrors_and_sessions_do_not_duplicate_same_day(self):
        when = AT + timedelta(seconds=4)
        states = [{'problemId': 'q1', 'freePracticeAttempts': [attempt('first')], 'completed': True, 'completedAt': stamp(when)}]
        personal = {'activities': [{'id': 'old', 'kind': 'tech', 'problemId': 'q1', 'completedAt': stamp(when), 'count': 1}],
                    'practiceSessions': [{'id': 'standalone', 'kind': 'tech', 'status': 'completed', 'question': {'id': 'alias', 'sourceProblemId': 'q1'},
                                          'completedAt': stamp(when), 'text': 'PRIVATE answer'}],
                    'dailySessions': [{'id': 'daily', 'questions': [{'id': 'alias', 'sourceProblemId': 'q1', 'kind': 'tech'}],
                                       'answers': {'alias': {'text': 'PRIVATE answer', 'completedAt': stamp(when)}}}]}
        self.assertEqual(len(projected(states, personal)), 1)
        # Distinct civil days stay historical activity, even less than 24h apart.
        personal['activities'][0]['completedAt'] = stamp(AT - timedelta(hours=8))
        self.assertEqual(len(projected(states, personal, zone='America/Los_Angeles')), 2)


if __name__ == '__main__':
    unittest.main()
