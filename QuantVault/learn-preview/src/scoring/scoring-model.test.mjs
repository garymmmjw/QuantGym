import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  createScoringModel, TOPICS, ROLE_REL, newState, observe, skillOf, thetaToRating, ratingToTheta,
  calculateLevel, lessonReward, problemReward, popQuizScore, creditLesson, recordAttempt,
  ELO_COOLDOWN_MS, CAPTURED_AT, updateStreak, activeDaysStreak, deriveStreak,
  moduleStats, orderModules, lessonCompletionStats, readinessZone, blendWeight,
} from './scoring-model.mjs';

const captures = new URL('../../../captures/learn-2026-10-15/scoring/', import.meta.url);
const referenceSource = fs.readFileSync(new URL('recommender.js', captures), 'utf8');
const actualV1 = JSON.parse(fs.readFileSync(new URL('item-difficulty.json', captures), 'utf8'));
const actualV2 = JSON.parse(fs.readFileSync(new URL('item-difficulty-v2.json', captures), 'utf8'));
const modules = JSON.parse(fs.readFileSync(new URL('modules.json', captures), 'utf8'));
function reference(v1, v2) {
  const context = { module: { exports: {} }, fetch: () => { throw new Error('No network allowed in parity test'); } };
  vm.runInNewContext(referenceSource, context, { timeout: 1000 });
  const api = context.module.exports;
  if (v1) api.setItemDifficulty(v1);
  if (v2) api.setItemDifficultyV2(v2);
  return api;
}
function close(a, b, where = '') {
  if (typeof a === 'number' && typeof b === 'number') {
    assert.ok(Math.abs(a - b) < 1e-12, `${where}: ${a} vs ${b}`); return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    assert.deepEqual(Object.keys(a), Object.keys(b), where);
    for (const key of Object.keys(a)) close(a[key], b[key], where + '.' + key);
    return;
  }
  assert.equal(a, b, where);
}
function fixtures() {
  const problemsIndex = [], progress = {}, solvedHistory = {}, attempts = {};
  for (let i = 0; i < 120; i++) {
    const id = i + 100, c = TOPICS[i % TOPICS.length], d = ['easy', 'medium', 'hard'][i % 3];
    problemsIndex.push({ id, di: i + 1, c, d, tg: ['bayes-theorem', 'expected-value', 'dynamic-programming'], co: i % 2 ? ['demo-firm'] : [], t: `Synthetic ${i}` });
    if (i % 5 !== 0) progress[id] = i % 3 ? 'solved' : 'attempted';
    if (i % 4 === 0) solvedHistory[id] = { category: c, diff: d };
    if (i % 6 !== 0) attempts[id] = { x: i % 3 ? 1 : 0, at: CAPTURED_AT, h: i % 7 === 0, pc: i % 4 === 0 ? 0.5 : i % 3 ? 1 : 0 };
  }
  return { problemsIndex, progress, solvedHistory, attempts };
}

test('offline port matches the captured public calculator across 192 model/role/time combinations', () => {
  const v1 = { b: Object.fromEntries(Array.from({ length: 120 }, (_, i) => [i + 1, (i % 13 - 6) / 5])) };
  for (const [first, second] of [[null, null], [v1, null], [v1, actualV2], [actualV1, actualV2]]) {
    const original = reference(first, second), local = createScoringModel({ difficultyV1: first, difficultyV2: second });
    for (const role of Object.keys(ROLE_REL)) for (const model of ['v1', 'v2', undefined]) {
      for (const now of [Date.UTC(2026, 8, 1), Date.UTC(2026, 8, 29), CAPTURED_AT, Date.UTC(2026, 10, 1)]) {
        const opts = { ...fixtures(), model, now, prefs: { role, level: 'graduate', targetFirms: ['demo-firm'], targets: ['statistics'], rate: { prob: 'strong', la: 'shaky', fin: 'ok' },
          calibration: TOPICS.map((topic, i) => ({ topic, x: i % 2, diff: ['easy', 'hard'][i % 2], c: 0.2 })) } };
        const before = JSON.stringify(opts);
        close(local.buildState(opts), original.buildState(opts), `state ${role}/${model}/${now}`);
        close(local.relevance(opts), original.relevance(opts), 'relevance');
        close(local.priorities(opts), original.priorities(opts), 'priorities');
        assert.equal(local.readiness(opts), original.readiness(opts), 'readiness');
        assert.equal(JSON.stringify(opts), before, 'inputs stay immutable');
      }
    }
  }
});

test('observation updates primary evidence only for graded sources and never mutates input', () => {
  const original = reference(), initial = newState();
  for (const source of ['solve', 'onboarding', 'mcq', 'selfrate', 'status', 'other']) {
    const obs = { topic: 'probability', b: 0.3, c: 0.2, x: 1, weight: 0.25, source };
    close(observe(initial, obs), original.observe(original.newState(), obs));
  }
  assert.equal(initial.theta.probability, 0);
  assert.equal(initial.nObs.probability, 0);
});

test('captures cross-topic status-credit quirk rather than silently changing it', () => {
  const model = createScoringModel();
  const state = model.buildState({ problemsIndex: [{ id: 42, di: 1, c: 'probability', d: 'easy', tg: ['bayes-theorem', 'expected-value'] }], progress: { 42: 'solved' } });
  assert.equal(state.nObs.probability, 0);
  assert.equal(state.nObs.statistics, 0.125);
  assert.equal(state.nObs.expectation, 0.125);
});

test('readiness evidence gate is 3, skill-card confidence threshold is 4; target is 75', () => {
  const model = createScoringModel(), state = newState();
  state.theta.probability = 0.8; state.nObs.probability = 2.99;
  const opts = { model: 'v1', state, prefs: { role: 'qt', calibration: [{ x: 1 }, { x: 1 }] }, progress: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [i, 'solved'])) };
  assert.equal(model.readiness(opts), 2);
  state.nObs.probability = 3;
  const report = model.computeOfferBar(opts), row = report.topics.find(r => r.topic === 'probability');
  assert.ok(report.readiness > 60);
  assert.equal(report.target, 75);
  assert.equal(row.band.displayLabel, 'Few solved');
  assert.equal(row.band.label, 'Strong');
  assert.equal(row.evidenced, true);
  state.nObs.probability = 4;
  assert.equal(model.computeOfferBar(opts).topics.find(r => r.topic === 'probability').band.displayLabel, 'Strong');
  assert.equal(skillOf(state.theta, null, null), 0, 'preserve documented null-evidence implementation quirk');
});

test('warmup/engagement and module completion are separate from lesson XP', () => {
  const model = createScoringModel(), opts = { ...fixtures(), model: 'v1' };
  assert.equal(model.readiness({ ...opts, xp: 1e6, completed: ['lec-demo'] }), model.readiness(opts));
  assert.equal(model.readiness({ state: newState(), model: 'v1' }), 2);
  assert.deepEqual(lessonCompletionStats(['a', 'b'], ['a', 'a']), { done: 1, total: 2, pct: 50 });
});

test('rating display and role-dependent priorities match known calibration boundaries', () => {
  assert.equal(thetaToRating(0.105), 1200);
  assert.equal(thetaToRating(0), 1136);
  for (const rating of [600, 1000, 1200, 1400, 1800]) assert.equal(thetaToRating(ratingToTheta(rating)), rating);
  assert.equal(readinessZone(80).word, 'Interview-sharp');
  assert.equal(readinessZone(65).word, 'Interview-ready');
  assert.equal(readinessZone(45).word, 'Getting there');
  assert.equal(readinessZone(25).word, 'Building up');
  assert.equal(readinessZone(24).word, 'Early days');
  assert.equal(blendWeight(Date.UTC(2026, 8, 28)), 0);
  assert.equal(blendWeight(Date.UTC(2026, 10, 2)), 1);
});

test('XP levels preserve the Level 10 → 11 threshold and clamp negative/corrupt values', () => {
  assert.deepEqual(calculateLevel(0), { level: 1, currentXP: 0, nextLevelXP: 100, percent: 0 });
  assert.deepEqual(calculateLevel(999), { level: 10, currentXP: 99, nextLevelXP: 100, percent: 99 });
  assert.deepEqual(calculateLevel(1000), { level: 11, currentXP: 0, nextLevelXP: 250, percent: 0 });
  assert.deepEqual(calculateLevel(1249), { level: 11, currentXP: 249, nextLevelXP: 250, percent: 99 });
  assert.equal(calculateLevel(1250).level, 12);
  assert.equal(calculateLevel(-10).level, 1);
  assert.equal(calculateLevel(Infinity).level, 1);
  assert.deepEqual(lessonReward('105.9'), { base: 20, bonus: 100, total: 120 });
  assert.deepEqual(lessonReward(-1), { base: 20, bonus: 0, total: 20 });
  assert.equal(problemReward('hard'), 50);
  assert.equal(problemReward('hard', { alreadyAwarded: true }), 0);
});

test('Pop Quiz percentages, bonus rounding, and original zero-card edge case', () => {
  assert.deepEqual(popQuizScore(7, 10), { correct: 7, total: 10, percent: 70, bonus: 56, label: 'Solid.' });
  assert.equal(popQuizScore(10, 10).bonus, 100);
  assert.equal(popQuizScore(1, 3).bonus, 27);
  assert.equal(popQuizScore(0, 0).bonus, 20, 'matches original correct === total condition');
  assert.throws(() => popQuizScore(11, 10), RangeError);
});

test('lesson rewards are one-time ledger entries, with the captured 60-lesson guard', () => {
  const once = creditLesson({}, 'lec-example', 25, { now: CAPTURED_AT });
  assert.equal(once.result.total, 45);
  const again = creditLesson(once.learnProgress, 'lec-example', 100);
  assert.equal(again.result.total, 0);
  assert.equal(Object.keys(once.learnProgress).length, 1);
  assert.equal(creditLesson({}, 'bad', 0).result.error, 'rejected');
  const full = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`lec-test-${i}`, {}]));
  assert.equal(creditLesson(full, 'lec-example', 0).result.error, 'rejected');
  assert.equal(creditLesson(full, 'lec-test-0', 0).result.error, 'rejected', 'source cap check precedes duplicate check');
  assert.equal(creditLesson(full, 'lec-example', 0, { maxLessons: Infinity }).result.total, 20);
});

test('attempt ledger freezes repeat grading for 30 days and sanitizes optional evidence', () => {
  const first = recordAttempt({}, 1, 0, { now: CAPTURED_AT, extra: { h: true, pc: 0.3333333, r: 'reveal', secret: 'never stored' } });
  assert.equal(first.outcome, 'recorded');
  assert.deepEqual(first.attempts[1], { x: 0, at: CAPTURED_AT, h: 1, pc: 0.333, r: 'reveal' });
  assert.equal(recordAttempt(first.attempts, 1, 1, { now: CAPTURED_AT + ELO_COOLDOWN_MS - 1 }).outcome, 'frozen');
  const next = recordAttempt(first.attempts, 1, 1, { now: CAPTURED_AT + ELO_COOLDOWN_MS });
  assert.equal(next.outcome, 're-evaluated');
  assert.equal(first.attempts[1].x, 0);
  assert.equal(next.attempts[1].x, 1);
  assert.equal(recordAttempt({}, 1, 0.5).outcome, null);
});

test('streak write logic uses UTC and display helper accepts an explicit calendar date', () => {
  const prev = { current: 5, longest: 8, lastActivityDate: '2026-10-14' };
  const next = updateStreak(prev, CAPTURED_AT);
  assert.deepEqual(next, { current: 6, longest: 8, lastActivityDate: '2026-10-15' });
  assert.deepEqual(updateStreak(next, CAPTURED_AT + 1000), next);
  assert.equal(updateStreak(next, CAPTURED_AT + 2 * 86400000).current, 1);
  assert.equal(activeDaysStreak(['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-15'), 3);
  assert.equal(activeDaysStreak(['2026-10-12'], '2026-10-15'), 0);
  assert.equal(deriveStreak({ activeDays: ['2026-10-12'], streak: { current: 8 } }, { today: '2026-10-15' }), 8);
});

test('11 captured modules contain 554 distinct internal ids; progress is exact solved string only', () => {
  assert.equal(modules.modules.length, 11);
  assert.equal(modules.modules.reduce((sum, m) => sum + m.problems.length, 0), 554);
  assert.equal(new Set(modules.modules.flatMap(m => m.problems.map(p => p.id))).size, 554);
  const m = { problems: [{ id: 1 }, { id: 2 }, { id: 3 }] };
  assert.deepEqual(moduleStats(m, { 1: 'solved', 2: { solved: true }, 3: 'attempted' }), { done: 1, total: 3, next: m.problems[1], pct: 33 });
  assert.equal(orderModules(modules, 'qd')[0].id, 'coding');
  assert.equal(orderModules(modules, 'qt')[0].id, 'foundations');
});
