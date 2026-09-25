import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MENTAL_SETTINGS, normalizeMentalSettings, mentalSettingsKey,
  generateMentalQuestion, createTrial, remainingTrialMs, transitionTrial,
  summarizeTrial, getPersonalBests, persistTrialTransition,
} from '../src/features/personal/mental/mentalEngine.js';

const start = Date.parse('2026-09-08T23:59:00.000Z');
const constantSettings = { durationSeconds: 10, operations: ['add'], ranges: { add: { minA: 2, maxA: 2, minB: 3, maxB: 3 } } };
const make = (options = {}) => createTrial(constantSettings, { now: start, id: 'test', ...options });

test('normalization bounds settings and canonicalizes selected operation order', () => {
  const settings = normalizeMentalSettings({ durationSeconds: 999999, operations: ['divide', 'add', 'add', 'unknown'], ranges: { divide: { minA: 0, maxA: 0, minB: 8, maxB: 2 } } });
  assert.equal(settings.durationSeconds, 3600);
  assert.deepEqual(settings.operations, ['add', 'divide']);
  assert.deepEqual(settings.ranges.divide, { minA: 1, maxA: 1, minB: 2, maxB: 8 });
  assert.deepEqual(normalizeMentalSettings({ operations: [] }).operations, DEFAULT_MENTAL_SETTINGS.operations);
  assert.equal(normalizeMentalSettings({ durationSeconds: NaN }).durationSeconds, 120);
  assert.equal(normalizeMentalSettings({ durationSeconds: 0 }).durationSeconds, 10);
  assert.deepEqual(normalizeMentalSettings(null), DEFAULT_MENTAL_SETTINGS);
});

test('all operations respect their configured inclusive ranges and arithmetic', () => {
  for (const operator of ['add', 'subtract', 'multiply', 'divide']) {
    for (const random of [0, .2, .5, .999999, 1]) {
      const settings = { operations: [operator], ranges: { [operator]: { minA: 3, maxA: 8, minB: 2, maxB: 9 } } };
      const q = generateMentalQuestion(settings, 1, start, () => random);
      assert.equal(q.operator, operator);
      assert.ok(Number.isInteger(q.answer));
      if (operator === 'divide') {
        assert.ok(q.b >= 3 && q.b <= 8);
        assert.ok(q.answer >= 2 && q.answer <= 9);
        assert.equal(q.a / q.b, q.answer);
        assert.notEqual(q.b, 0);
      } else {
        assert.ok(q.a >= 3 && q.a <= 8);
        assert.ok(q.b >= 2 && q.b <= 9);
        assert.equal(q.answer, operator === 'add' ? q.a + q.b : operator === 'subtract' ? q.a - q.b : q.a * q.b);
      }
    }
  }
});

test('division permits zero integer quotient and never zero divisor', () => {
  const q = generateMentalQuestion({ operations: ['divide'], ranges: { divide: { minA: 0, maxA: 0, minB: 0, maxB: 0 } } }, 1, start);
  assert.equal(q.a, 0);
  assert.equal(q.b, 1);
  assert.equal(q.answer, 0);
});

test('subtraction can yield a negative integer without changing operand ranges', () => {
  const trial = createTrial({ operations: ['subtract'], ranges: { subtract: { minA: 2, maxA: 2, minB: 5, maxB: 5 } } }, { now: start, id: 'negative' });
  let next = transitionTrial(trial, { type: 'input', value: '-' }, start + 10);
  assert.equal(next.correct, 0);
  next = transitionTrial(next, { type: 'input', value: '-3' }, start + 1000);
  assert.equal(next.correct, 1);
  assert.equal(next.questions[0].elapsedMs, 1000);
});

test('only explicit incorrect submissions count as mistakes, cumulative timing survives correction', () => {
  let trial = make();
  trial = transitionTrial(trial, { type: 'input', value: '4' }, start + 1000);
  assert.equal(trial.currentQuestion.mistakes.length, 0);
  trial = transitionTrial(trial, { type: 'submit' }, start + 1200);
  assert.equal(trial.currentQuestion.mistakes.length, 1);
  assert.deepEqual(trial.currentQuestion.mistakes[0], { value: '4', submittedAt: new Date(start + 1200).toISOString(), elapsedMs: 1200 });
  trial = transitionTrial(trial, { type: 'input', value: '5' }, start + 2200);
  assert.equal(trial.correct, 1);
  assert.equal(trial.questions[0].elapsedMs, 2200);
  assert.equal(trial.questions[0].mistakes.length, 1);
  assert.equal(trial.currentQuestion.startedAt, new Date(start + 2200).toISOString());
  assert.equal(trial.currentAnswer, '');
});

test('empty or malformed input does not advance or add a wrong submission', () => {
  const trial = make();
  for (const value of ['', ' ', '5.0', '5e0', 'Infinity', '5abc', '1234567890123']) {
    const next = transitionTrial(trial, { type: 'submit', value }, start + 100);
    assert.equal(next.correct, 0);
    assert.equal(next.currentQuestion.mistakes.length, 0);
  }
});

test('question-scoped events cannot score, overwrite or skip the next question', () => {
  const trial = make();
  const answer = { type: 'input', value: '5', questionId: trial.currentQuestion.id };
  const next = transitionTrial(trial, answer, start + 100);
  assert.equal(next.correct, 1);
  for (const action of [answer, { ...answer, type: 'submit' },
    { ...answer, value: '4' }, { ...answer, type: 'skip' }]) {
    assert.equal(transitionTrial(next, action, start + 200), next);
  }
  assert.equal(transitionTrial(next, { ...answer, questionId: next.currentQuestion.id }, start + 300).correct, 2);
  const finished = transitionTrial(next, answer, start + 10000);
  assert.equal(finished.status, 'completed');
  assert.equal(finished.correct, 1);
});

test('skip and timeout remain distinct and retain partial-question time', () => {
  let trial = make();
  trial = transitionTrial(trial, { type: 'skip' }, start + 2500);
  trial = transitionTrial(trial, { type: 'tick' }, start + 14000);
  assert.equal(trial.status, 'completed');
  assert.equal(trial.questions[0].outcome, 'skipped');
  assert.equal(trial.questions[0].elapsedMs, 2500);
  assert.equal(trial.questions[1].outcome, 'timeout');
  assert.equal(trial.questions[1].elapsedMs, 7500);
  assert.equal(trial.completedAt, new Date(start + 10000).toISOString());
  assert.equal(trial.currentQuestion, null);
  assert.deepEqual(summarizeTrial(trial), { correct: 0, skipped: 1, unfinished: 1, mistakes: 0, meanMs: null, fastestMs: null });
});

test('the exact deadline rejects a correct answer and counts it as timeout', () => {
  const trial = make();
  assert.equal(transitionTrial(trial, { type: 'input', value: '5' }, start + 9999).correct, 1);
  const atDeadline = transitionTrial(trial, { type: 'input', value: '5' }, start + 10000);
  assert.equal(atDeadline.correct, 0);
  assert.equal(atDeadline.status, 'completed');
  assert.equal(atDeadline.questions[0].outcome, 'timeout');
  assert.equal(transitionTrial(atDeadline, { type: 'skip' }, start + 11000), atDeadline);
});

test('restored trial uses absolute deadline, preserving typed answer and time', () => {
  const running = transitionTrial(make(), { type: 'input', value: '4' }, start + 1700);
  const restored = JSON.parse(JSON.stringify(running));
  assert.equal(restored.currentAnswer, '4');
  assert.equal(remainingTrialMs(restored, start + 9000), 1000);
  assert.equal(remainingTrialMs(restored, start + 15000), 0);
  const completed = transitionTrial(restored, { type: 'tick' }, start + 15000);
  assert.equal(completed.questions[0].elapsedMs, 10000);
  assert.equal(completed.completedAt, new Date(start + 10000).toISOString());
});

test('aborting preserves work but does not count as completed; expiry wins over abort', () => {
  let trial = transitionTrial(make(), { type: 'input', value: '5' }, start + 1000);
  trial = transitionTrial(trial, { type: 'abort' }, start + 1500);
  assert.equal(trial.status, 'aborted');
  assert.equal(trial.correct, 1);
  assert.equal(trial.questions[1].outcome, 'aborted');
  assert.equal(trial.questions[1].elapsedMs, 500);
  assert.equal(getPersonalBests([trial], constantSettings).trialCount, 0);
  assert.equal(transitionTrial(make(), { type: 'abort' }, start + 10000).status, 'completed');
});

test('personal best compares duration, selected operators and their ranges, excluding aborted trials', () => {
  let first = transitionTrial(make({ id: 'one' }), { type: 'input', value: '5' }, start + 500);
  first = transitionTrial(first, { type: 'tick' }, start + 10000);
  let second = transitionTrial(make({ id: 'two' }), { type: 'input', value: '5' }, start + 1000);
  second = transitionTrial(second, { type: 'input', value: '5' }, start + 2500);
  second = transitionTrial(second, { type: 'tick' }, start + 10000);
  const otherDuration = { ...first, id: 'other', correct: 100, settings: { ...first.settings, durationSeconds: 120 } };
  const aborted = { ...first, id: 'aborted', status: 'aborted', correct: 1000 };
  assert.deepEqual(getPersonalBests([first, second, otherDuration, aborted], constantSettings), { trialCount: 2, bestCorrect: 2, fastestMs: 500, bestMeanMs: 500 });
  assert.equal(mentalSettingsKey(constantSettings), mentalSettingsKey({ ...constantSettings, ranges: { ...constantSettings.ranges, multiply: { minA: 1, maxA: 1, minB: 1, maxB: 1 } } }));
  assert.notEqual(mentalSettingsKey(constantSettings), mentalSettingsKey({ ...constantSettings, ranges: { add: { minA: 2, maxA: 10, minB: 3, maxB: 3 } } }));
});

test('completion atomically records trial and activity without duplicating IDs', () => {
  const trial = transitionTrial(make({ dailySessionId: 'daily-1' }), { type: 'tick' }, start + 10000);
  const original = { activeTrial: make(), trials: [], activities: [{ id: 'other', kind: 'coding', count: 1 }] };
  const next = persistTrialTransition(original, trial);
  assert.equal(next.activeTrial, null);
  assert.equal(next.trials.length, 1);
  assert.equal(next.activities.length, 2);
  assert.equal(next.activities[1].dailySessionId, 'daily-1');
  assert.equal(next.activities[1].completedAt, trial.completedAt);
  const retry = persistTrialTransition(next, trial);
  assert.equal(retry.trials.length, 1);
  assert.equal(retry.activities.length, 2);
  assert.equal(original.trials.length, 0);
});
