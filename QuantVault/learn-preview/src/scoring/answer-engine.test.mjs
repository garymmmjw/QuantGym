import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TOPICS, ROLE_REL, CAPTURED_AT, ELO_COOLDOWN_MS } from './scoring-model.mjs';
import { traceAnswerUpdate, resolveProblemObservation, simulateRecordedAnswer, roleWeightBreakdown } from './answer-engine.mjs';

// The captured recommender is executed alone, without window, Auth, storage or
// a network implementation. No captured authentication code is executed.
const captures = new URL('../../../captures/learn-2026-10-15/scoring/', import.meta.url);
const referenceSource = fs.readFileSync(new URL('recommender.js', captures), 'utf8');
const actualV1 = JSON.parse(fs.readFileSync(new URL('item-difficulty.json', captures), 'utf8'));
const actualV2 = JSON.parse(fs.readFileSync(new URL('item-difficulty-v2.json', captures), 'utf8'));
function reference(v1, v2) {
  const context = { module: { exports: {} }, fetch() { throw new Error('Unexpected network access'); } };
  vm.runInNewContext(referenceSource, context, { timeout: 1000 });
  const api = context.module.exports;
  if (v1) api.setItemDifficulty(v1);
  if (v2) api.setItemDifficultyV2(v2);
  return api;
}
function close(actual, expected, where = '') {
  if (typeof actual === 'number' && typeof expected === 'number') {
    assert.ok(Math.abs(actual - expected) < 1e-12, `${where}: ${actual} vs ${expected}`);
  } else if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    assert.deepEqual(Object.keys(actual), Object.keys(expected), where);
    for (const key of Object.keys(actual)) close(actual[key], expected[key], `${where}.${key}`);
  } else assert.equal(actual, expected, where);
}
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function assertReports(result, original, now, beforeInput) {
  for (const phase of ['before', 'after']) for (const model of ['v1', 'v2', 'rollout']) {
    const input = phase === 'before' ? beforeInput : result.updatedInput;
    const opts = { ...input, now, model };
    delete opts.state;
    const report = result[phase][model];
    close(report.state, original.buildState(opts), `${phase}/${model}/state`);
    close(report.priorities, original.priorities(opts), `${phase}/${model}/priorities`);
    assert.equal(report.readiness, original.readiness(opts), `${phase}/${model}/readiness`);
    assert.equal(report.modelInfo.externalStateUsedForReadiness, false);
    assert.equal(report.target, 75);
    for (const row of report.topics) close(row.relevance, original.relevance(opts)[row.topic]);
  }
}
const problem = { id: 42, di: 7, c: 'probability', d: 'easy', tg: ['bayes-theorem', 'expected-value', 'bayes-theorem'], co: ['A', 'B'] };
const first = { b: { 7: -0.35 } };
const second = { b: { 7: 0.65 }, c: { 7: 0.25 }, _meta: { hintCredit: 0.6 } };

test('one-observation trace matches native updates across difficulty, evidence, outcome, source and guessing', () => {
  const native = reference();
  for (const theta of [-1.4, 0, 0.8]) for (const nObs of [0, 0.25, 3, 8]) {
    for (const b of [-0.5, -0.1, 0.5]) for (const c of [0, 0.25]) for (const x of [0, 0.3, 1]) {
      for (const source of ['solve', 'onboarding', 'mcq', 'selfrate', 'status', 'unknown']) {
        const weight = source === 'mcq' ? 0.125 : 1;
        const trace = traceAnswerUpdate({ theta, nObs, b, c, x, source, weight });
        const state = native.newState();
        state.theta.probability = theta; state.nObs.probability = nObs;
        native.observe(state, { topic: 'probability', b, c, x, source, weight });
        close(trace.after.theta, state.theta.probability);
        close(trace.after.nObs, state.nObs.probability);
        close(trace.p, c + (1 - c) * native.sigmoid(theta - b));
        close(trace.after.theta - trace.before.theta, trace.deltaTheta);
        assert.equal(trace.K, trace.k);
        assert.equal(trace.after.evidence, trace.after.nObs);
        assert.equal(trace.after.rating, Math.round(1200 + 300 * native.calibrate(state.theta.probability)));
        close(trace.after.mastery, Math.max(0, Math.min(1, (state.theta.probability + 1.15) / 2.1)));
      }
    }
  }
  assert.ok(traceAnswerUpdate({ theta: 0, nObs: 0, b: 0.5, x: 1 }).deltaTheta > traceAnswerUpdate({ theta: 0, nObs: 0, b: -0.5, x: 1 }).deltaTheta);
  assert.throws(() => traceAnswerUpdate({ theta: 0, nObs: -1, b: 0, x: 1 }), RangeError);
  assert.throws(() => traceAnswerUpdate({ theta: NaN, nObs: 0, b: 0, x: 1 }), TypeError);
});

test('resolved hint, partial credit, guessing and cross-credit replay exactly match native V1/V2', () => {
  const native = reference(first, second);
  const attempts = [{ x: 1 }, { x: 0 }, { x: 1, h: 1 }, { x: 0, h: 1 },
    { x: 0, pc: 0.5, h: 1, r: 'reveal' }, { x: 1, pc: 0 }, { x: 0, pc: 2 }, { x: 1, pc: -0.2 }];
  for (const modelVersion of ['v1', 'v2']) for (const attempt of attempts) {
    const resolved = resolveProblemObservation({ problem, attempt, modelVersion, difficultyV1: first, difficultyV2: second });
    const expected = native.buildState({ problemsIndex: [problem], attempts: { 42: attempt }, model: modelVersion });
    assert.equal(resolved.eligible, true);
    for (const observation of [resolved.observation, ...resolved.secondaryObservations]) {
      const trace = traceAnswerUpdate({ theta: 0, nObs: 0, ...observation });
      close(trace.after.theta, expected.theta[observation.topic]);
      close(trace.after.nObs, expected.nObs[observation.topic]);
    }
    assert.equal(resolved.secondaryObservations.length, 2, 'unique secondary topics');
    assert.equal(resolved.secondaryObservations.reduce((sum, row) => sum + row.weight, 0), 0.25);
    assert.ok(resolved.secondaryObservations.every(row => row.c === 0 && row.source === 'solve'));
    assert.equal(resolved.bSource, modelVersion === 'v1' ? 'fitted-v1' : 'fitted-v2');
    if (modelVersion === 'v1') {
      assert.equal(resolved.effectiveX, attempt.x);
      assert.equal(resolved.c, 0);
      assert.equal(resolved.applications.partialCredit.applied, false);
      assert.equal(resolved.applications.hint.applied, false);
    }
  }
  const partial = resolveProblemObservation({ problem, attempt: { x: 0, h: 1, pc: 0.5 }, modelVersion: 'v2', difficultyV2: second });
  assert.equal(partial.effectiveX, 0.3, 'partial credit is chosen before hint adjustment, even with binary x=0');
  assert.equal(partial.applications.partialCredit.valueBeforeHint, 0.5);
  const noReveal = resolveProblemObservation({ problem, attempt: { x: 1 }, modelVersion: 'v2', difficultyV2: second });
  const reveal = resolveProblemObservation({ problem, attempt: { x: 1, r: 'reveal' }, modelVersion: 'v2', difficultyV2: second });
  assert.deepEqual(reveal.observation, noReveal.observation, 'r marker itself does not change scoring');
});

test('resolver labels actual fitted/label fallbacks and refuses invented graded evidence', () => {
  for (const [difficultyV1, difficultyV2, bSource, b] of [
    [first, null, 'fitted-v1', -0.35], [first, { b: {} }, 'fitted-v1', -0.35],
    [null, { b: {} }, 'authored-label', -0.5],
  ]) {
    const result = resolveProblemObservation({ problem, attempt: { x: 1, pc: 0.5, h: 1 }, modelVersion: 'v2', difficultyV1, difficultyV2 });
    assert.equal(result.bSource, bSource); assert.equal(result.b, b);
    assert.equal(result.modelVersion, difficultyV2 ? 'v2' : 'v1');
    assert.equal(result.effectiveX, difficultyV2 ? 0.3 : 1);
  }
  assert.equal(resolveProblemObservation({ problem: { ...problem, d: 'mystery' }, attempt: { x: 0 } }).bSource, 'unknown-label-zero');
  const customHint = resolveProblemObservation({ problem, attempt: { x: 1, h: 1 }, modelVersion: 'v2', difficultyV2: { b: {}, _meta: { hintCredit: 0.4 } } });
  assert.equal(customHint.effectiveX, 0.4);
  for (const attempt of [undefined, {}, { x: 0.5 }, { x: '1', pc: 1 }]) {
    const result = resolveProblemObservation({ problem, attempt });
    assert.equal(result.eligible, false); assert.equal(result.observation, null);
    assert.equal(result.secondaryObservations.length, 0);
  }
  assert.equal(resolveProblemObservation({ problem: { ...problem, c: 'unknown' }, attempt: { x: 1 } }).eligible, false);
  assert.throws(() => resolveProblemObservation({ problem, attempt: { x: 1 }, modelVersion: 'rollout' }), RangeError);
});

test('immutable answer recording sanitizes evidence, rebuilds raw maps and discards external state', () => {
  const input = deepFreeze({ problemsIndex: [problem], prefs: { role: 'qr', rate: { prob: 'strong' }, calibration: [{ topic: 'probability', x: 1, b: 0.2 }] },
    progress: {}, attempts: {}, solvedHistory: {}, xp: 320, state: { theta: { probability: 999 }, nObs: { probability: 99 } } });
  const snapshot = JSON.stringify(input);
  const result = simulateRecordedAnswer({ input, problemId: 42, x: 0, extra: { h: true, pc: 0.333333, r: 'reveal', ignored: true },
    now: CAPTURED_AT, difficultyV1: first, difficultyV2: second });
  assert.equal(result.outcome, 'recorded');
  assert.deepEqual(result.attemptAfter, { x: 0, at: CAPTURED_AT, h: 1, pc: 0.333, r: 'reveal' });
  assert.equal(result.progressAfter, 'attempted');
  assert.equal(result.progressKeyAdded, true);
  assert.equal(result.discardedExternalState, true);
  assert.equal(Object.hasOwn(result.updatedInput, 'state'), false);
  assert.equal(result.updatedInput.xp, 320);
  assert.equal(JSON.stringify(input), snapshot);
  assertReports(result, reference(first, second), CAPTURED_AT, input);
  close(result.resolved.v2.effectiveX, 0.333 * 0.6);
});

test('30-day boundary replaces the old attempt, without appending evidence or confusing progress with grading', () => {
  const initial = { problemsIndex: [problem], attempts: { 42: { x: 0, at: CAPTURED_AT, h: 1 } }, progress: { 42: 'attempted' } };
  const native = reference(first, second);
  const frozen = simulateRecordedAnswer({ input: initial, problemId: 42, x: 1, now: CAPTURED_AT + ELO_COOLDOWN_MS - 1,
    difficultyV1: first, difficultyV2: second });
  assert.equal(frozen.outcome, 'frozen');
  assert.equal(frozen.attemptChanged, false);
  assert.equal(frozen.progressChanged, true);
  assert.equal(frozen.progressAfter, 'solved');
  assert.equal(frozen.attemptAfter.x, 0, 'graded ledger wins over solved status');
  assert.equal(frozen.resolved.v2.rawX, 0, 'trace uses stored outcome, not the rejected submission');
  assert.equal(frozen.cooldown.remainingMs, 1);
  assertReports(frozen, native, CAPTURED_AT + ELO_COOLDOWN_MS - 1, initial);
  for (const version of ['v1', 'v2', 'rollout']) assert.equal(frozen.changes[version].abilityChanged, false);
  const next = simulateRecordedAnswer({ input: frozen.updatedInput, problemId: 42, x: 1, now: CAPTURED_AT + ELO_COOLDOWN_MS,
    difficultyV1: first, difficultyV2: second });
  assert.equal(next.outcome, 're-evaluated');
  assert.deepEqual(next.attemptAfter, { x: 1, at: CAPTURED_AT + ELO_COOLDOWN_MS });
  assert.equal(next.cooldown.remainingMs, 0);
  assert.equal(Object.keys(next.updatedInput.attempts).length, 1);
  for (const version of ['v1', 'v2', 'rollout']) {
    assert.equal(next.before[version].state.nObs.probability, 1);
    assert.equal(next.after[version].state.nObs.probability, 1);
    assert.equal(next.changes[version].abilityChanged, true);
  }
  assertReports(next, native, CAPTURED_AT + ELO_COOLDOWN_MS, frozen.updatedInput);
});

test('a frozen attempt may still increase engagement/readiness when progress gains a key', () => {
  const input = { problemsIndex: [problem], prefs: { calibration: Array.from({ length: 3 }, () => ({ topic: 'probability', b: 0.5, x: 1 })) },
    progress: {}, attempts: { 42: { x: 1, at: CAPTURED_AT } } };
  const result = simulateRecordedAnswer({ input, problemId: 42, x: 0, now: CAPTURED_AT + 1, difficultyV1: first, difficultyV2: second });
  assert.equal(result.outcome, 'frozen');
  assert.equal(result.progressAfter, 'attempted');
  for (const version of ['v1', 'v2', 'rollout']) {
    assert.equal(result.changes[version].abilityChanged, false);
    assert.equal(result.changes[version].progressCountDelta, 1);
    assert.ok(result.after[version].diagnostics.engagement > result.before[version].diagnostics.engagement);
    assert.ok(result.changes[version].readinessDelta > 0);
  }
  assertReports(result, reference(first, second), CAPTURED_AT + 1, input);
  const onlyLedger = simulateRecordedAnswer({ input, problemId: 42, x: 0, now: CAPTURED_AT + 1, updateProgress: false });
  assert.equal(onlyLedger.progressChanged, false);
  assert.equal(onlyLedger.progressPolicy, 'unchanged');
  assert.deepEqual(onlyLedger.updatedInput.progress, {});
});

test('solve producer never downgrades solved/attempted and getStatus preserves raw legacy values', () => {
  for (const current of ['solved', 'attempted', { solved: true }, { attempted: true }]) {
    const input = { problemsIndex: [problem], attempts: { 42: { x: 1, at: CAPTURED_AT } }, progress: { 42: current } };
    const wrong = simulateRecordedAnswer({ input, problemId: 42, x: 0, now: CAPTURED_AT + 1 });
    assert.equal(wrong.outcome, 'frozen');
    assert.equal(wrong.progressChanged, false);
    assert.equal(wrong.statusAction, null);
    assert.deepEqual(wrong.progressAfter, current);
    assert.equal(wrong.progressPolicy, 'source-solve-result');
    const correct = simulateRecordedAnswer({ input, problemId: 42, x: 1, now: CAPTURED_AT + 1 });
    assert.equal(correct.statusAction, current === 'solved' ? null : 'solved');
    assert.equal(correct.progressAfter, 'solved', 'legacy object is not normalized to a string before producer comparison');
  }
  for (const current of ['solved', 'attempted']) {
    const input = { problemsIndex: [problem], progress: {}, localStatuses: { 42: current } };
    const wrong = simulateRecordedAnswer({ input, problemId: 42, x: 0 });
    assert.equal(wrong.statusBefore, current);
    assert.equal(wrong.progressChanged, false);
    assert.equal(wrong.progressKeyAdded, false);
    const correct = simulateRecordedAnswer({ input, problemId: 42, x: 1 });
    assert.equal(correct.progressAfter, current === 'solved' ? null : 'solved');
  }
  const historyOnly = simulateRecordedAnswer({ input: { problemsIndex: [problem], solvedHistory: { 42: {} } }, problemId: 42, x: 0 });
  assert.equal(historyOnly.statusAction, 'attempted', 'getStatus does not infer status from solvedHistory');
});

test('replay preserves numeric internal-id order, map fallback and source cross-credit quirks', () => {
  const problemsIndex = [10, 2, 1].map(id => ({ ...problem, id, d: id === 2 ? 'hard' : 'easy' }));
  const input = { problemsIndex, progress: { 10: 'solved', 2: 'solved' }, solvedHistory: { 1: { category: 'probability', diff: 'easy' } },
    attempts: { 10: { x: 0, at: 10 }, 2: { x: 1, at: 20 } } };
  const result = simulateRecordedAnswer({ input, problemId: 1, x: 0.5, now: CAPTURED_AT });
  assert.deepEqual(result.replayOrder.before, ['1', '2', '10']);
  assert.deepEqual(result.replayOrder.after, ['1', '2', '10']);
  assert.equal(result.outcome, null);
  assert.equal(result.progressChanged, false);
  assert.equal(result.after.v1.state.nObs.probability, 2, 'history-only primary status adds no graded evidence');
  assert.equal(result.after.v1.state.nObs.statistics, 0.375, 'source also gives secondary solve evidence to a status-only observation');
  assertReports(result, reference(), CAPTURED_AT, input);
  const byTime = reference(), temporal = byTime.newState();
  byTime.observe(temporal, { topic: 'probability', b: -0.5, c: 0, x: 1, source: 'status' });
  byTime.observe(temporal, { topic: 'probability', b: -0.5, c: 0, x: 0, source: 'solve' });
  byTime.observe(temporal, { topic: 'probability', b: 0.5, c: 0, x: 1, source: 'solve' });
  assert.notEqual(result.after.v1.state.theta.probability, temporal.theta.probability, 'timestamp sorting would change the result');
});

test('all three before/after models match captured VM with actual fitted data, roles and rollout endpoints', () => {
  const native = reference(actualV1, actualV2);
  const problemsIndex = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, di: i + 1, c: TOPICS[i % TOPICS.length],
    d: ['easy', 'medium', 'hard'][i % 3], tg: ['bayes-theorem', 'expected-value'], co: i % 2 ? ['A'] : ['B'] }));
  const base = { problemsIndex, progress: Object.fromEntries(problemsIndex.filter(p => p.id % 3).map(p => [p.id, 'solved'])),
    attempts: Object.fromEntries(problemsIndex.map(p => [p.id, { x: p.id % 3 ? 1 : 0, at: CAPTURED_AT - ELO_COOLDOWN_MS, h: p.id % 7 === 0, pc: p.id % 4 ? 1 : 0.5 }])),
    solvedHistory: { 50: { category: 'finance', diff: 'hard' } } };
  for (const now of [Date.UTC(2026, 8, 28), CAPTURED_AT, Date.UTC(2026, 10, 2)]) for (const role of Object.keys(ROLE_REL)) {
    const input = { ...base, prefs: { role, targetFirms: ['A'], targets: ['statistics'], rate: { prob: 'strong' },
      calibration: TOPICS.map(topic => ({ topic, x: 1, diff: 'medium', c: 0.2 })) } };
    const result = simulateRecordedAnswer({ input, problemId: 23, x: 0, extra: { pc: 0.3, h: 1 }, now, difficultyV1: actualV1, difficultyV2: actualV2 });
    assertReports(result, native, now, input);
    assert.equal(result.after.rollout.state.nObs.statistics, result.after.v2.state.nObs.statistics);
    assert.ok(result.after.rollout.readiness >= result.after.v1.readiness);
  }
});

test('role decomposition matches all 17 native weights with firm threshold, focus and unknown role fallback', () => {
  const native = reference();
  const allProblems = Array.from({ length: 14 }, (_, i) => ({ ...problem, id: i + 1, c: TOPICS[i % 5], co: ['A', 'B'] }));
  for (const role of [...Object.keys(ROLE_REL), 'unknown']) for (const count of [0, 9, 10, 14]) {
    for (const targets of [[], ['statistics'], ['statistics', 'statistics']]) {
      const opts = { prefs: { role, targetFirms: ['A', 'B'], targets }, problemsIndex: allProblems.slice(0, count) };
      const result = roleWeightBreakdown(opts);
      close(result.relevance, native.relevance(opts));
      assert.equal(result.topics.length, 17);
      assert.equal(result.firmMatchedCount, count, 'each problem counted once even when two firms match');
      assert.equal(result.firmMixApplied, count >= 10);
      for (const row of result.topics) {
        assert.equal(row.final, row.normalizedRel);
        close(row.unnormalized / result.normalization, row.final);
        assert.equal(row.targetBoost, targets.includes(row.topic) ? 0.5 : 0);
        assert.equal(row.floor, 0.05);
      }
      assert.equal(Math.max(...result.topics.map(row => row.final)), 1);
    }
  }
  const legacyFirms = { prefs: { firms: ['A'] }, problemsIndex: allProblems };
  close(roleWeightBreakdown(legacyFirms).relevance, native.relevance(legacyFirms));
  const emptyPreferred = { prefs: { targetFirms: [], firms: ['A'] }, problemsIndex: allProblems };
  assert.equal(roleWeightBreakdown(emptyPreferred).firmMixApplied, false, 'empty preferred list does not use legacy firms fallback');
});
