import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createTrainingProfile, updateTrainingPreferences, submitTrainingAttempt,
  buildTrainingReport, validateTrainingProfile, TrainingValidationError,
} from './training-system.mjs';
import { createScoringModel, TOPICS, ELO_COOLDOWN_MS, CAPTURED_AT } from './scoring-model.mjs';

const now = CAPTURED_AT;
const problemsIndex = Array.from({ length: 51 }, (_, i) => ({ id: i + 1, di: i + 101, t: `Problem ${i + 1}`,
  c: TOPICS[i % TOPICS.length], d: ['easy', 'medium', 'hard'][i % 3], co: i % 2 ? ['Firm A'] : ['Firm B'], tg: [] }));
const difficultyV1 = { b: Object.fromEntries(problemsIndex.map(problem => [problem.di, -0.3])) };
const difficultyV2 = { b: Object.fromEntries(problemsIndex.map(problem => [problem.di, 0.4])),
  c: Object.fromEntries(problemsIndex.map(problem => [problem.di, 0.25])), _meta: { hintCredit: 0.6 } };
const options = { problemsIndex, difficultyV1, difficultyV2 };
const fresh = () => createTrainingProfile({ now, id: 'test-profile' });
const answer = (profile, problemId, x, overrides = {}, opts = options) => submitTrainingAttempt(profile,
  { problemId, x, now: profile.updatedAt + 1, eventId: `event-${profile.events.length + 1}`, ...overrides }, opts);
const deepFreeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };

test('new profiles contain no fabricated attempts or calibration and round-trip through JSON', () => {
  const profile = fresh();
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.prefs.role, 'unsure');
  assert.equal(profile.prefs.level, 'undergrad');
  assert.deepEqual(profile.prefs.calibration, []);
  assert.deepEqual(profile.attempts, {});
  assert.deepEqual(profile.events, []);
  const restored = validateTrainingProfile(JSON.parse(JSON.stringify(profile)), options);
  assert.deepEqual(restored, profile);
  assert.notEqual(restored, profile);
  const report = buildTrainingReport(profile, { ...options, now });
  assert.equal(report.bar.readiness, 2);
  assert.ok(report.bar.topics.every(topic => topic.evidence === 0 && !topic.assessed));
  assert.equal(report.problemXp, 0);
  assert.equal(report.streak.current, 0);
});

test('first correct answers award 10/25/50 once; immutable duplicate event is idempotent', () => {
  let profile = fresh();
  for (const id of [1, 2, 3]) {
    const frozen = deepFreeze(profile), before = JSON.stringify(frozen);
    const result = answer(frozen, id, 1, { h: id === 2 });
    assert.equal(result.result.deltaXp, [10, 25, 50][id - 1]);
    assert.equal(result.result.progressAfter, 'solved');
    assert.equal(result.result.outcome, 'recorded');
    assert.equal(JSON.stringify(frozen), before);
    profile = result.profile;
  }
  assert.equal(buildTrainingReport(profile, { ...options, now: profile.updatedAt }).problemXp, 85);
  const saved = JSON.stringify(profile);
  const duplicate = answer(profile, 3, 1, { eventId: 'event-3', now: profile.updatedAt + 999 });
  assert.equal(duplicate.result.outcome, 'duplicate');
  assert.equal(duplicate.result.deltaXp, 0);
  assert.equal(duplicate.profile.events.length, 3);
  assert.equal(JSON.stringify(duplicate.profile), saved);
  assert.throws(() => answer(profile, 3, 0, { eventId: 'event-3' }), TrainingValidationError);
  assert.deepEqual(validateTrainingProfile(JSON.parse(JSON.stringify(profile)), options), profile);
});

test('frozen graded failure can later complete and earn XP, but never farms XP on repeats', () => {
  const wrong = answer(fresh(), 1, 0);
  const fixed = answer(wrong.profile, 1, 1);
  assert.equal(fixed.result.outcome, 'frozen');
  assert.equal(fixed.result.abilityFrozen, true);
  assert.equal(fixed.profile.attempts[1].x, 0);
  assert.equal(fixed.profile.progress[1], 'solved');
  assert.equal(fixed.result.deltaXp, 10);
  assert.deepEqual(fixed.result.barBefore.state, fixed.result.barAfter.state);
  const missedAgain = answer(fixed.profile, 1, 0);
  assert.equal(missedAgain.profile.progress[1], 'solved');
  assert.equal(missedAgain.result.deltaXp, 0);
  const afterWindow = answer(missedAgain.profile, 1, 1, { now: wrong.profile.attempts[1].at + ELO_COOLDOWN_MS });
  assert.equal(afterWindow.result.outcome, 're-evaluated');
  assert.equal(afterWindow.profile.attempts[1].x, 1);
  assert.equal(afterWindow.result.deltaXp, 0);
  assert.equal(afterWindow.result.barAfter.state.nObs.probability, 1);
  assert.equal(afterWindow.profile.events.length, 4);
  assert.deepEqual(validateTrainingProfile(afterWindow.profile, options), afterWindow.profile);
});

test('partial and revealed answers track attempts without solving or XP; hint does not reduce full-answer XP', () => {
  const partial = answer(fresh(), 2, 0, { pc: 0.5, h: true });
  assert.equal(partial.result.deltaXp, 0);
  assert.equal(partial.profile.progress[2], 'attempted');
  assert.deepEqual(partial.profile.attempts[2], { x: 0, at: now + 1, h: 1, pc: 0.5 });
  const revealed = answer(partial.profile, 3, 0, { reveal: true });
  assert.equal(revealed.result.deltaXp, 0);
  assert.equal(revealed.profile.attempts[3].r, 'reveal');
  assert.equal(revealed.profile.progress[3], 'attempted');
  const fullHint = answer(revealed.profile, 2, 1, { pc: 1, h: true });
  assert.equal(fullHint.result.outcome, 'frozen');
  assert.equal(fullHint.result.deltaXp, 25);
  assert.equal(fullHint.profile.progress[2], 'solved');
  assert.equal(fullHint.profile.attempts[2].pc, 0.5, 'frozen grade retains its original partial credit');
  assert.equal(fullHint.profile.events.at(-1).pc, 1, 'event records the newer complete submission');
  assert.deepEqual(validateTrainingProfile(fullHint.profile, options), fullHint.profile);
});

test('partial credit is rounded in the attempt ledger before applying the V2 hint multiplier', () => {
  const recorded = answer(fresh(), 1, 0, { pc: 1 / 3, h: true });
  assert.equal(recorded.profile.events[0].pc, 1 / 3, 'the event retains the submitted input');
  assert.equal(recorded.profile.attempts[1].pc, 0.333, 'Auth stores three decimal places');
  assert.equal(recorded.profile.attempts[1].h, 1);
  const effectiveScore = 0.333 * 0.6;
  const expectedProbability = 0.25 + 0.75 / (1 + Math.exp(0.4));
  const expectedTheta = 0.9 * (effectiveScore - expectedProbability);
  assert.ok(Math.abs(recorded.result.barAfter.state.theta.probability - expectedTheta) < 1e-12);
  assert.notEqual(recorded.result.barAfter.state.theta.probability, 0.9 * (0.2 - expectedProbability),
    'rounding after the hint multiplication would incorrectly use 0.2');
  assert.equal(recorded.result.barAfter.state.nObs.probability, 1);
  assert.equal(recorded.result.deltaXp, 0);
  assert.deepEqual(validateTrainingProfile(recorded.profile, options), recorded.profile);
});

test('stable V2 is date-independent; missing parameters use explicit fallback rather than rollout', () => {
  const profile = answer(fresh(), 1, 1, { h: true }).profile;
  const early = buildTrainingReport(profile, { ...options, now: Date.UTC(2026, 8, 1) });
  const late = buildTrainingReport(profile, { ...options, now: Date.UTC(2027, 8, 1) });
  assert.deepEqual(early.bar.state, late.bar.state);
  assert.equal(early.bar.readiness, late.bar.readiness);
  assert.equal(early.modelInfo.effectiveModel, 'v2');
  assert.equal(early.modelInfo.datedRollout, false);
  assert.equal('blendWeight' in early.modelInfo, false);
  const native = createScoringModel({ difficultyV1, difficultyV2 });
  assert.deepEqual(early.bar.state, native.buildState({ ...profile, problemsIndex, model: 'v2' }));
  const fallback = buildTrainingReport(profile, { problemsIndex, difficultyV1, now });
  assert.equal(fallback.modelInfo.requested, 'v2');
  assert.equal(fallback.modelInfo.effectiveModel, 'v1');
  assert.match(fallback.modelInfo.fallbackReason, /unavailable/);
  assert.notDeepEqual(fallback.bar.state.theta, early.bar.state.theta);
});

test('role/company/focus preferences change relevance, self-rate changes theta without manufacturing evidence', () => {
  const profile = answer(fresh(), 1, 1).profile;
  const base = buildTrainingReport(profile, { ...options, now: profile.updatedAt });
  const tailored = updateTrainingPreferences(deepFreeze(profile), { role: 'qd', targets: ['statistics'], targetFirms: ['Firm A'] }, { now: profile.updatedAt + 1 });
  const tailoredReport = buildTrainingReport(tailored, { ...options, now: tailored.updatedAt });
  assert.deepEqual(base.bar.state, tailoredReport.bar.state);
  assert.notDeepEqual(base.roleWeights.relevance, tailoredReport.roleWeights.relevance);
  assert.equal(tailoredReport.roleWeights.firmMixApplied, true);
  const rated = updateTrainingPreferences(tailored, { rate: { prob: 'strong', la: 'shaky' } }, { now: tailored.updatedAt + 1 });
  const ratedReport = buildTrainingReport(rated, { ...options, now: rated.updatedAt });
  assert.notDeepEqual(ratedReport.bar.state.theta, tailoredReport.bar.state.theta);
  assert.deepEqual(ratedReport.bar.state.nObs, tailoredReport.bar.state.nObs);
  assert.deepEqual(rated.prefs.calibration, []);
  const cleared = updateTrainingPreferences(rated, { rate: {} }, { now: rated.updatedAt + 1 });
  assert.deepEqual(buildTrainingReport(cleared, { ...options, now: cleared.updatedAt }).bar.state, tailoredReport.bar.state);
});

test('background level changes recommendation gaps and priorities without changing ability or readiness', () => {
  let profile = fresh();
  for (const id of [1, 18, 35]) profile = answer(profile, id, 1).profile;
  for (const id of [2, 19, 36]) profile = answer(profile, id, 0).profile;
  const baseline = buildTrainingReport(profile, { ...options, now: profile.updatedAt });
  const reports = {};
  for (const [level, target] of Object.entries({ beginner: -0.3, undergrad: 0.3, graduate: 0.8, phd: 1.1 })) {
    const updated = updateTrainingPreferences(deepFreeze(profile), { level }, { now: profile.updatedAt + 1 });
    const report = buildTrainingReport(updated, { ...options, now: updated.updatedAt });
    reports[level] = report;
    assert.deepEqual(report.bar.state, baseline.bar.state, `${level}: ability is unchanged`);
    assert.equal(report.bar.readiness, baseline.bar.readiness, `${level}: readiness is unchanged`);
    assert.deepEqual(report.roleWeights, baseline.roleWeights, `${level}: relevance is unchanged`);
    assert.deepEqual(updated.attempts, profile.attempts);
    assert.deepEqual(updated.events, profile.events);
    for (const row of report.priorities) {
      assert.equal(row.gap, Math.max(0, target - baseline.bar.state.theta[row.topic]));
    }
  }
  assert.notDeepEqual(reports.beginner.priorities.map(row => row.need), reports.phd.priorities.map(row => row.need));
  assert.notDeepEqual(reports.beginner.priorities.map(row => row.topic), reports.phd.priorities.map(row => row.topic));
});

test('calibration replaces or clears onboarding evidence and its engagement baseline without practice or XP side effects', () => {
  const profile = answer(fresh(), 2, 1).profile;
  const baseline = buildTrainingReport(profile, { ...options, now: profile.updatedAt });
  const calibration = Array.from({ length: 3 }, () => ({ topic: 'probability', x: 1, b: 0, c: 0 }));
  const calibrated = updateTrainingPreferences(deepFreeze(profile), { calibration }, { now: profile.updatedAt + 1 });
  const report = buildTrainingReport(calibrated, { ...options, now: calibrated.updatedAt });
  let expectedTheta = 0;
  for (let i = 0; i < 3; i++) expectedTheta += 0.9 / Math.sqrt(1 + i) * (1 - 1 / (1 + Math.exp(-expectedTheta)));
  assert.ok(Math.abs(report.bar.state.theta.probability - expectedTheta) < 1e-12);
  assert.equal(report.bar.state.nObs.probability, 3, 'onboarding adds effective evidence');
  assert.equal(report.bar.state.theta.expectation, baseline.bar.state.theta.expectation);
  assert.equal(report.bar.diagnostics.assessmentCount, 3);
  assert.equal(report.bar.diagnostics.progressCount, 1, 'calibration is not ordinary problem progress');
  const expectedEngagement = 0.432 + (1 - 0.432) / 131;
  assert.equal(report.bar.diagnostics.engagement, expectedEngagement);
  assert.equal(report.bar.readiness, Math.round((expectedTheta + 1.15) / 2.1 * expectedEngagement * 100));

  const replacement = [{ topic: 'coding', x: 1, b: 0, c: 0.25 }];
  const replaced = updateTrainingPreferences(calibrated, { calibration: replacement }, { now: calibrated.updatedAt + 1 });
  const replacedReport = buildTrainingReport(replaced, { ...options, now: replaced.updatedAt });
  assert.equal(replacedReport.bar.state.nObs.probability, 0, 'old calibration is replaced, not appended');
  assert.equal(replacedReport.bar.state.theta.probability, 0);
  assert.equal(replacedReport.bar.state.nObs.coding, 1);
  assert.equal(replacedReport.bar.state.theta.coding, 0.9 * (1 - 0.625));
  assert.equal(replacedReport.bar.diagnostics.assessmentCount, 1);
  assert.equal(replacedReport.bar.diagnostics.engagement, 0.24 + (1 - 0.24) / 131);

  const cleared = updateTrainingPreferences(replaced, { calibration: [] }, { now: replaced.updatedAt + 1 });
  const clearedReport = buildTrainingReport(cleared, { ...options, now: cleared.updatedAt });
  assert.deepEqual(clearedReport.bar.state, baseline.bar.state);
  assert.deepEqual(clearedReport.bar.diagnostics, baseline.bar.diagnostics);
  for (const item of [calibrated, replaced, cleared]) {
    for (const field of ['attempts', 'progress', 'solvedHistory', 'events']) assert.deepEqual(item[field], profile[field]);
    const current = buildTrainingReport(item, { ...options, now: item.updatedAt });
    assert.equal(current.problemXp, baseline.problemXp);
    assert.equal(current.totalXp, baseline.totalXp);
    assert.equal(current.eventCount, baseline.eventCount);
    assert.deepEqual(validateTrainingProfile(item, options), item);
  }
  assert.deepEqual(profile.prefs.calibration, [], 'updating preferences does not mutate the previous profile');
});

test('training modules follow all four captured role orders and preserve array compatibility and stale-order fallback', () => {
  const modules = deepFreeze(JSON.parse(readFileSync(new URL('../../../captures/learn-2026-10-15/scoring/modules.json', import.meta.url), 'utf8')));
  for (const role of ['qt', 'qr', 'qd', 'unsure']) {
    const profile = updateTrainingPreferences(fresh(), { role }, { now });
    const report = buildTrainingReport(profile, { ...options, modules, now });
    assert.deepEqual(report.moduleProgress.map(module => module.id), modules.roleOrder[role], role);
    assert.equal(report.moduleProgress.reduce((sum, module) => sum + module.total, 0), 554);
    assert.ok(report.moduleProgress.every(module => module.done === 0 && module.pct === 0));
  }
  const developer = updateTrainingPreferences(fresh(), { role: 'qd' }, { now });
  const arrayReport = buildTrainingReport(developer, { ...options, modules: modules.modules, now });
  assert.deepEqual(arrayReport.moduleProgress.map(module => module.id), modules.modules.map(module => module.id));
  const staleDoc = { modules: modules.modules, roleOrder: { qd: ['coding', 'removed-module'] } };
  const repairedOrder = buildTrainingReport(developer, { ...options, modules: staleDoc, now });
  assert.deepEqual(repairedOrder.moduleProgress.map(module => module.id),
    ['coding', ...modules.modules.filter(module => module.id !== 'coding').map(module => module.id)]);
});

test('module progress, downloaded recommendations and Learn XP are separate from ability', () => {
  const profile = answer(fresh(), 1, 1).profile;
  const modules = { modules: [{ id: 'intro', title: 'Foundations', problems: [problemsIndex[0], problemsIndex[1]] }] };
  const plain = buildTrainingReport(profile, { ...options, modules, now: profile.updatedAt });
  const withLearn = buildTrainingReport(profile, { ...options, modules, now: profile.updatedAt, learnXp: 990, learnCompleted: 20,
    downloadedProblemIds: [1, 2, 3, 4, 5] });
  assert.equal(withLearn.problemXp, 10);
  assert.equal(withLearn.totalXp, 1000);
  assert.equal(withLearn.level.level, 11);
  assert.equal(withLearn.learnCompleted, 20);
  assert.deepEqual(withLearn.bar.state, plain.bar.state);
  assert.equal(withLearn.bar.readiness, plain.bar.readiness);
  assert.equal(withLearn.solvedCount, 1);
  assert.equal(withLearn.attemptedCount, 1);
  assert.equal(withLearn.needsReviewCount, 0);
  assert.equal(withLearn.moduleProgress[0].pct, 50);
  assert.equal(withLearn.moduleProgress[0].next.id, 2);
  assert.ok(withLearn.recommendations.length > 0);
  assert.ok(withLearn.recommendations.every(item => [2, 3, 4, 5].includes(item.id)));
  assert.equal(buildTrainingReport(profile, { ...options, now, downloadedProblemIds: [] }).recommendations.length, 0);
  assert.equal(withLearn.problemXp, Object.values(profile.solvedHistory).reduce((sum, item) => sum + item.xpAwarded, 0));
});

test('strict validation rejects non-JSON, unsafe keys, impossible ranges, unknown ids and inconsistent ledgers', () => {
  const profile = answer(fresh(), 1, 1).profile;
  const mutations = [
    p => { p.schemaVersion = 2; }, p => { p.state = {}; }, p => { p.prefs.role = 'invalid'; },
    p => { p.createdAt = Infinity; }, p => { p.updatedAt = p.createdAt - 1; }, p => { p.prefs.targets = ['statistics', 'statistics']; },
    p => { p.attempts[1].pc = -0.5; }, p => { p.attempts[1].x = 0.5; }, p => { p.progress[1] = { solved: true }; },
    p => { p.progress[99999] = 'solved'; }, p => { p.solvedHistory[1].xpAwarded = 50000; },
    p => { p.events[0].deltaXp = 0; }, p => { p.events[0].outcome = 'frozen'; p.events[0].abilityFrozen = true; },
    p => { p.events[0].progressAfter = 'attempted'; }, p => { p.attempts[1].x = 0; },
    p => { p.events.push({ ...p.events[0] }); }, p => { p.events = []; },
    p => { p.prefs.calibration = [{ topic: 'probability', x: NaN }]; },
  ];
  for (const mutate of mutations) { const value = structuredClone(profile); mutate(value); assert.throws(() => validateTrainingProfile(value, options), TrainingValidationError); }
  const injected = JSON.parse(JSON.stringify(profile));
  injected.progress = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => validateTrainingProfile(injected), /not allowed/);
  assert.equal({}.polluted, undefined);
  const accessor = structuredClone(profile); Object.defineProperty(accessor.prefs, 'extra', { enumerable: true, get() { throw new Error('must not evaluate'); } });
  assert.throws(() => validateTrainingProfile(accessor), /accessor/);
  const oversized = fresh(); oversized.events = Array.from({ length: 10001 }, () => ({}));
  assert.throws(() => validateTrainingProfile(oversized), /at most 10000/);
});

test('submission and preference APIs reject invalid inputs without changing the source profile', () => {
  const profile = deepFreeze(fresh()), saved = JSON.stringify(profile);
  for (const payload of [
    { x: 0.5 }, { x: 1, pc: 0.5 }, { x: 0, pc: 1 }, { x: 1, reveal: true }, { x: 0, reveal: true, pc: 0.5 },
    { x: 0, pc: NaN }, { x: 0, h: 'yes' }, { x: 1, problemId: 100000 }, { x: 1, eventId: '__proto__' }, { x: 1, eventId: 'toString' }, { x: 1, now: now - 1 },
  ]) assert.throws(() => answer(profile, 1, payload.x, payload), TrainingValidationError);
  for (const patch of [{ role: 'CEO' }, { rate: { prob: 'excellent' } }, { level: 'expert' }, { targets: ['fake'] }, { arbitrary: 1 },
    { calibration: [{ topic: 'coding', x: 1, c: 2 }] }]) assert.throws(() => updateTrainingPreferences(profile, patch, { now }), TrainingValidationError);
  assert.equal(JSON.stringify(profile), saved);
});

test('streak uses submission days, including frozen practice, and report snapshots are detached', () => {
  let profile = answer(fresh(), 1, 0, { now }).profile;
  profile = answer(profile, 1, 0, { now: now + 86400000 }).profile;
  profile = answer(profile, 1, 0, { now: now + 2 * 86400000 }).profile;
  const report = buildTrainingReport(profile, { ...options, now: now + 3 * 86400000 });
  assert.equal(report.streak.current, 3);
  assert.equal(report.streak.longest, 3);
  assert.equal(report.streak.activeDays, 3);
  assert.equal(report.recentEvents[0].outcome, 'frozen');
  report.recentEvents[0].x = 1;
  assert.equal(profile.events.at(-1).x, 0);
  assert.equal(buildTrainingReport(profile, { ...options, now: now + 4 * 86400000 }).streak.current, 0);
});
