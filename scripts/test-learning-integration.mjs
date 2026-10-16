import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  learningStorageKey, readLearnProgress, saveLearnProgress, completeLearnLesson, uncompleteLearnLesson,
  readTrainingProfile, submitWengAttempt, resolveWengProblem, readLearningReport,
} from '../src/features/learning/learningStore.mjs';
import { recordFreePracticeOutcome } from '../src/modules/problems/freePracticeAttempts.js';
import { getProblemAnswerParts } from '../src/modules/problems/format.js';

const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }; };
const now = Date.UTC(2026, 9, 16);
const problem = { id: 'quantvault-14', source: 'quantvault', quantvault: { id: 900, displayId: 14 } };
const sources = { problemsIndex: [{ id: 900, di: 14, c: 'expectation', d: 'medium', t: 'Three rolls', tg: [], co: [] }],
  difficultyV1: { b: { 14: -0.1 } }, difficultyV2: { _meta: { hintCredit: 0.6 }, b: { 14: -0.2 }, c: {} },
  modules: { roleOrder: {}, modules: [{ id: 'expectation', title: 'Expectation', problems: [{ id: 900, di: 14 }] }] }, downloadedProblemIds: [900] };

test('learning and ability records are scoped by account and ignore old standalone storage', () => {
  const storage = memory(); storage.setItem('qvl-progress-v1', '{"xp":9999}'); storage.setItem('qvl-training-personal-v1', 'old-private-data');
  completeLearnLesson('alice', 'lec-example-one', 0, { storage, now });
  submitWengAttempt('alice', problem, { x: 1, eventId: 'attempt-a' }, sources, { storage, now });
  assert.equal(readLearnProgress('alice', { storage }).xp, 20);
  assert.equal(readLearnProgress('bob', { storage }).xp, 0);
  assert.equal(readTrainingProfile('bob', sources, { storage, now }).events.length, 0);
  assert.equal(readTrainingProfile('alice', sources, { storage }).events.length, 1);
  assert.notEqual(learningStorageKey('alice'), learningStorageKey('bob'));
  assert.throws(() => readLearnProgress('', { storage }), /登录/);
});

test('a graded problem updates readiness evidence, module completion and one-time problem XP', () => {
  const storage = memory();
  const result = submitWengAttempt('alice', problem, { x: 1, h: false, eventId: 'attempt-1' }, sources, { storage, now });
  let ordinary = recordFreePracticeOutcome({ problemId: problem.id }, 'correct', now, 'ordinary-1');
  assert.equal(ordinary.freePracticeAttempts.length, 1);
  assert.equal(result.deltaXp, 25);
  const report = readLearningReport('alice', sources, { storage, now }).report;
  assert.equal(report.bar.topics.find(t => t.topic === 'expectation').evidence, 1);
  assert.equal(report.moduleProgress[0].pct, 100);
  assert.equal(report.problemXp, 25);
  assert.equal(report.eventCount, 1);
  assert.equal(report.bar.topics.find(t => t.topic === 'probability').assessed, false);
  assert.equal(report.bar.topics.find(t => t.topic === 'expectation').evidenced, false);
});

test('idempotent same submission and 30-day repeated attempts do not duplicate ability or XP', () => {
  const storage = memory(), options = { storage, now };
  submitWengAttempt('alice', problem, { x: 1, eventId: 'first' }, sources, options);
  assert.equal(submitWengAttempt('alice', problem, { x: 1, eventId: 'first' }, sources, options).duplicate, true);
  const second = submitWengAttempt('alice', problem, { x: 0, eventId: 'second' }, sources, { storage, now: now + 86400000 });
  assert.equal(second.abilityFrozen, true); assert.equal(second.deltaXp, 0);
  assert.equal(readTrainingProfile('alice', sources, { storage }).attempts['900'].x, 1);
  const third = submitWengAttempt('alice', problem, { x: 0, eventId: 'third' }, sources, { storage, now: now + 30 * 86400000 });
  assert.equal(third.outcome, 're-evaluated');
  assert.equal(readTrainingProfile('alice', sources, { storage }).attempts['900'].x, 0);
  assert.equal(third.progressAfter, 'solved'); assert.equal(third.deltaXp, 0);
});

test('hint reduces ability credit; partial and revealed outcomes do not award completion XP', () => {
  const storage = memory();
  const plain = submitWengAttempt('plain', problem, { x: 1, eventId: 'one' }, sources, { storage, now });
  const hinted = submitWengAttempt('hint', problem, { x: 1, h: true, eventId: 'one' }, sources, { storage, now });
  assert.ok(plain.barAfter.state.theta.expectation > hinted.barAfter.state.theta.expectation);
  assert.equal(hinted.deltaXp, 25);
  const partial = submitWengAttempt('partial', problem, { x: 0, pc: 0.5, eventId: 'one' }, sources, { storage, now });
  const revealed = submitWengAttempt('reveal', problem, { x: 0, reveal: true, eventId: 'one' }, sources, { storage, now });
  for (const result of [partial, revealed]) { assert.equal(result.deltaXp, 0); assert.equal(result.progressAfter, 'attempted'); }
  assert.throws(() => submitWengAttempt('invalid', problem, { x: 1, reveal: true, eventId: 'one' }, sources, { storage, now }), /revealing/);
});

test('Learn XP and renderer state never inflate ability or Offer Bar, and rewards remain one time', () => {
  const storage = memory();
  submitWengAttempt('alice', problem, { x: 1, eventId: 'one' }, sources, { storage, now });
  const before = readLearningReport('alice', sources, { storage, now }).report;
  completeLearnLesson('alice', 'lec-example-one', 100, { storage, now });
  const p = readLearnProgress('alice', { storage }); p.renderer = { 'sv-progress-lec-example-one': { slide: 4, solved: [1, 2] } };
  saveLearnProgress('alice', p, { storage });
  uncompleteLearnLesson('alice', 'lec-example-one', { storage });
  const repeated = completeLearnLesson('alice', 'lec-example-one', 100, { storage, now: now + 1 });
  assert.equal(repeated.result.total, 0);
  const after = readLearningReport('alice', sources, { storage, now: now + 1 }).report;
  assert.equal(after.learnXp, 120); assert.equal(after.totalXp, 145);
  assert.deepEqual(after.bar.state, before.bar.state); assert.equal(after.bar.readiness, before.bar.readiness);
  assert.deepEqual(readLearnProgress('alice', { storage }).renderer, p.renderer);
});

test('source internal ID mapping rejects display-ID collisions and never falls back', () => {
  assert.equal(resolveWengProblem(problem, sources.problemsIndex).id, 900);
  assert.throws(() => resolveWengProblem({ ...problem, quantvault: { id: 14, displayId: 14 } }, sources.problemsIndex), /映射/);
  assert.throws(() => resolveWengProblem({ ...problem, id: 'quantvault-900' }, sources.problemsIndex), /映射/);
  assert.throws(() => resolveWengProblem({ ...problem, quantvault: { id: 900, displayId: 900 } }, sources.problemsIndex), /映射/);
});

test('corrupt archives are preserved and rejected, not silently replaced with another account', () => {
  const storage = memory(), key = learningStorageKey('alice'); storage.setItem(key, '{broken');
  assert.throws(() => readLearnProgress('alice', { storage }), /JSON/);
  assert.equal(storage.getItem(key), '{broken');
  assert.equal(readLearnProgress('bob', { storage }).xp, 0);
});

test('the integrated core is byte-identical to the previously audited model', () => {
  for (const file of ['scoring-model.mjs', 'scoring-constants.mjs', 'answer-engine.mjs', 'training-system.mjs']) {
    assert.equal(readFileSync(new URL(`../src/features/learning/scoring/${file}`, import.meta.url), 'utf8'), readFileSync(new URL(`../QuantVault/learn-preview/src/scoring/${file}`, import.meta.url), 'utf8'));
  }
});

test('Weng full solutions appear once while distinct answers, media and other banks stay intact', () => {
  const solution = '**Solution**\n\nA complete derivation with $x = 1$.';
  const question = { source: 'quantvault', answer: solution, explanation: solution };
  assert.deepEqual(getProblemAnswerParts(question, false, '![diagram](image.png)'), [solution, '![diagram](image.png)']);
  assert.deepEqual(getProblemAnswerParts({ ...question, answer: '1' }), ['1', solution]);
  assert.deepEqual(getProblemAnswerParts({ ...question, source: 'quantguide' }), [solution, solution]);
  assert.deepEqual(getProblemAnswerParts({ ...question, answerZh: '答案', explanationZh: '推导' }), ['答案', '推导']);
});
