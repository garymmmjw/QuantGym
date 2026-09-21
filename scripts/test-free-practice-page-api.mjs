import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createProblemsPageApi } from '../src/app/services/problemsPageApi.js';
import { createProblemProvider } from '../src/modules/problems/provider.js';
import { createProblemPersonalStateController } from '../src/modules/problems/personalStateController.js';
import { FREE_PRACTICE_WINDOW_MS as DAY, getFreePracticeStatus } from '../src/modules/problems/freePracticeAttempts.js';

const T = Date.parse('2026-09-20T12:00:00Z');
const date = time => new Date(time).toISOString();
const problem = { id: 'practice-question', source: 'question-bank', bookSlug: 'question-bank', visibility: 'private', titleZh: '测试题' };

function fixture(t, { withUpdater = true, catalogFallback = false } = {}) {
  let now = T;
  t.mock.method(Date, 'now', () => now);
  const original = {
    problemId: problem.id, completed: true, completedAt: date(T - DAY), interviewCount: 7,
    favorite: true, scoreHistory: [{ id: 'old-score', score: 81 }], updatedAt: date(T - 5000)
  };
  const state = { problems: catalogFallback ? [] : [problem], problemStates: [structuredClone(original), { problemId: 'other-question', interviewCount: 2 }] };
  const calls = { updates: [], saves: [], reveals: [], refreshes: 0, rebinds: 0 };
  const deps = {
    getState: () => state,
    getCatalogProblems: () => [problem],
    saveState: () => { calls.saves.push(structuredClone(state.problemStates)); },
    revealProblemDetailBlock: (...args) => { calls.reveals.push(args); },
    refreshIcons: () => { calls.refreshes++; },
    rebindElements: () => { calls.rebinds++; }
  };
  if (withUpdater) deps.updateProblemState = (problemId, patch) => {
    calls.updates.push({ problemId, patch: structuredClone(patch) });
    const index = state.problemStates.findIndex(item => item.problemId === problemId);
    const next = { ...(state.problemStates[index] || {}), ...patch, problemId, updatedAt: date(now) };
    if (index < 0) state.problemStates.push(next);
    else state.problemStates[index] = next;
  };
  const api = createProblemsPageApi(deps);
  return { api, state, calls, original, at: time => { now = time; },
    personal: () => state.problemStates.find(item => item.problemId === problem.id) };
}

function unchangedLegacy(f) {
  for (const key of ['completed', 'completedAt', 'interviewCount', 'favorite', 'scoreHistory']) {
    assert.deepEqual(f.personal()[key], f.original[key], `Free practice must not change legacy ${key}.`);
  }
  assert.deepEqual(f.state.problemStates.find(item => item.problemId === 'other-question'), { problemId: 'other-question', interviewCount: 2 });
}

test('page API starts once and repeated opens retain the timer without additional saves', t => {
  const f = fixture(t);
  const first = f.api.startPractice(problem.id);
  assert.equal(first.attemptCount, 0);
  assert.equal(first.selectedOutcome, null);
  assert.equal(first.isRunning, true);
  assert.equal(f.calls.updates.length, 1);
  assert.equal(f.calls.saves.length, 1);
  assert.deepEqual(Object.keys(f.calls.updates[0].patch).sort(), ['freePracticeAttempts', 'freePracticeSession']);
  const session = structuredClone(f.personal().freePracticeSession);
  f.at(T + 12500);
  const reopened = f.api.startPractice(problem.id);
  assert.equal(reopened.sessionId, session.id);
  assert.equal(reopened.elapsedSeconds, 12);
  assert.equal(f.personal().freePracticeSession.startedAt, date(T));
  assert.equal(f.calls.updates.length, 1);
  assert.equal(f.calls.saves.length, 1);
  unchangedLegacy(f);
});

test('page API reveals before or after a result without adding attempts', t => {
  const f = fixture(t);
  f.api.revealBlock(problem.id, 'answer');
  assert.equal(f.personal().freePracticeAttempts.length, 0);
  assert.equal(f.personal().freePracticeSession.answerViewed, true);
  assert.deepEqual(f.calls.reveals, [[problem.id, 'answer']]);
  f.at(T + 2000);
  f.api.revealBlock(problem.id, 'hint');
  assert.equal(f.personal().freePracticeAttempts.length, 0);
  assert.equal(f.personal().freePracticeSession.hintViewed, true);
  f.at(T + 11000);
  const recorded = f.api.recordPracticeOutcome(problem.id, 'idea_wrong');
  assert.equal(recorded.attemptCount, 1);
  assert.equal(recorded.elapsedSeconds, 11);
  assert.equal(recorded.answerViewed, true);
  assert.equal(recorded.hintViewed, true);
  const savedCount = f.calls.saves.length;
  f.at(T + 20000);
  f.api.revealBlock(problem.id, 'answer');
  assert.equal(f.personal().freePracticeAttempts.length, 1);
  assert.equal(f.personal().freePracticeAttempts[0].recordedAt, date(T + 11000));
  assert.equal(f.calls.saves.length, savedCount, 'Revealing an already-viewed answer needs no extra state write.');
  unchangedLegacy(f);
});

test('page API edits the same record throughout its fixed 24-hour window', t => {
  const f = fixture(t);
  f.api.startPractice(problem.id);
  const sessionId = f.personal().freePracticeSession.id;
  const recordedAt = T + 7000;
  f.at(recordedAt);
  const first = f.api.recordPracticeOutcome(problem.id, 'wrong');
  assert.equal(first.attemptCount, 1);
  assert.equal(first.isRunning, false);
  assert.equal(f.personal().freePracticeSession, null);
  assert.equal(f.personal().freePracticeAttempts[0].id, sessionId);
  f.at(recordedAt + 600000);
  assert.equal(f.api.recordPracticeOutcome(problem.id, 'idea_wrong').selectedOutcome, 'idea_wrong');
  f.at(recordedAt + DAY - 1);
  const edited = f.api.recordPracticeOutcome(problem.id, 'correct');
  assert.equal(edited.attemptCount, 1);
  assert.equal(edited.selectedOutcome, 'correct');
  assert.equal(edited.elapsedSeconds, 7);
  assert.equal(edited.windowExpiresAtMs, recordedAt + DAY);
  assert.equal(f.personal().freePracticeAttempts[0].recordedAt, date(recordedAt));
  assert.equal(f.personal().freePracticeAttempts[0].updatedAt, date(recordedAt + DAY - 1));
  assert.equal(f.personal().freePracticeAttempts[0].id, sessionId);
  unchangedLegacy(f);
});

test('page API clears the default at exactly 24 hours and records a second timed attempt', t => {
  const f = fixture(t);
  f.api.startPractice(problem.id);
  f.at(T + 9000);
  f.api.recordPracticeOutcome(problem.id, 'correct');
  const oldAttempt = structuredClone(f.personal().freePracticeAttempts[0]);
  const expiry = T + 9000 + DAY;
  f.at(expiry);
  const reopened = f.api.startPractice(problem.id);
  assert.equal(reopened.selectedOutcome, null);
  assert.equal(reopened.canRevise, false);
  assert.equal(reopened.attemptCount, 1);
  assert.equal(reopened.isRunning, true);
  assert.equal(reopened.elapsedSeconds, 0);
  f.at(expiry + 14000);
  const second = f.api.recordPracticeOutcome(problem.id, 'wrong');
  assert.equal(second.attemptCount, 2);
  assert.equal(second.elapsedSeconds, 14);
  assert.equal(second.selectedOutcome, 'wrong');
  assert.deepEqual(f.personal().freePracticeAttempts[0], oldAttempt);
  assert.notEqual(f.personal().freePracticeAttempts[1].id, oldAttempt.id);
  unchangedLegacy(f);
});

test('unknown question IDs have no state, persistence, reveal, or render side effects', t => {
  const f = fixture(t);
  const before = structuredClone(f.state);
  assert.equal(f.api.startPractice('not-a-question'), null);
  assert.equal(f.api.recordPracticeOutcome('not-a-question', 'correct'), null);
  f.api.revealBlock('not-a-question', 'answer');
  assert.deepEqual(f.state, before);
  assert.deepEqual(f.calls, { updates: [], saves: [], reveals: [], refreshes: 0, rebinds: 0 });
});

test('page API fallback persistence and catalog fallback retain legacy fields', t => {
  const f = fixture(t, { withUpdater: false, catalogFallback: true });
  f.api.startPractice(problem.id);
  f.at(T + 13000);
  const saved = f.api.recordPracticeOutcome(problem.id, 'idea_wrong');
  assert.equal(saved.attemptCount, 1);
  assert.equal(saved.elapsedSeconds, 13);
  assert.equal(f.calls.updates.length, 0);
  assert.equal(f.calls.saves.length, 2);
  assert.equal(f.personal().updatedAt, date(T + 13000));
  const restored = JSON.parse(JSON.stringify(f.personal()));
  assert.equal(getFreePracticeStatus(restored, T + 14000).selectedOutcome, 'idea_wrong');
  unchangedLegacy(f);
});

test('real provider and personal-state controller update one row across start, reveal, and result revisions', t => {
  let now = T;
  t.mock.method(Date, 'now', () => now);
  const state = { problems: [problem], problemStates: [] };
  const provider = createProblemProvider({ getState: () => state });
  const controller = createProblemPersonalStateController({
    getState: () => state,
    normalizeProblemState: provider.normalizeProblemState,
    mergeProblemStates: provider.mergeProblemStates,
    nowIso: () => date(now)
  });
  const saved = [];
  const api = createProblemsPageApi({
    getState: () => state,
    updateProblemState: controller.update,
    saveState: () => saved.push(structuredClone(state.problemStates))
  });
  const personal = () => {
    const matching = state.problemStates.filter(row => row.problemId === problem.id);
    assert.equal(matching.length, 1, 'A detail .find() and a directory Map must see the same unique personal-state row.');
    return matching[0];
  };
  api.startPractice(problem.id);
  const sessionId = personal().freePracticeSession.id;
  now += 1000;
  api.revealBlock(problem.id, 'answer');
  assert.equal(personal().freePracticeSession.answerViewed, true);
  now += 1000;
  api.startPractice(problem.id);
  assert.equal(personal().freePracticeSession.id, sessionId);
  assert.equal(personal().freePracticeAttempts.length, 0);
  now += 5000;
  api.recordPracticeOutcome(problem.id, 'correct');
  const anchor = now;
  assert.equal(personal().freePracticeAttempts.length, 1);
  assert.equal(personal().freePracticeSession, null);
  assert.equal(getFreePracticeStatus(personal(), now).isRunning, false);
  assert.equal(getFreePracticeStatus(personal(), now).selectedOutcome, 'correct');
  now += 1000;
  api.recordPracticeOutcome(problem.id, 'idea_wrong');
  now += 1000;
  api.recordPracticeOutcome(problem.id, 'wrong');
  assert.equal(personal().freePracticeAttempts.length, 1);
  assert.equal(personal().freePracticeAttempts[0].recordedAt, date(anchor));
  assert.equal(personal().freePracticeAttempts[0].outcome, 'wrong');
  assert.equal(controller.getPersonalState(problem.id).freePracticeAttempts[0].outcome, 'wrong');
  assert.equal(getFreePracticeStatus(personal(), now).elapsedSeconds, 7);
  assert(saved.every(rows => rows.filter(row => row.problemId === problem.id).length === 1));
  assert.equal(personal().interviewCount, 0);
  assert.equal(personal().completed, false);
});

test('runtime slice exposes the normalization and merge dependencies consumed by the personal-state controller', () => {
  const source = fs.readFileSync(new URL('../src/app/createAppContext/slices/impl/initRuntimeSlice.impl.js', import.meta.url), 'utf8');
  const finalReturn = source.slice(source.lastIndexOf('return {'));
  const exposed = new Set(finalReturn.slice(finalReturn.indexOf('{') + 1, finalReturn.indexOf('};')).split(',').map(value => value.trim()));
  assert(exposed.has('normalizeProblemState'), 'Runtime must export normalizeProblemState; otherwise the real controller silently uses identity normalization.');
  assert(exposed.has('mergeProblemStates'), 'Runtime must export mergeProblemStates; otherwise the real controller appends duplicate rows on every update.');
});
