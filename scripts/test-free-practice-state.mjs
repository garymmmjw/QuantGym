import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProblemState, mergeProblemStates } from '../src/modules/problems/data.js';
import {
  normalizeState, mergeCloudState, buildCloudSessionState, localStatePayload, cloudStatePayload
} from '../src/state/data.js';
import { buildCloudSyncBody } from '../src/api/cloudSync.js';

const early = '2026-09-18T10:00:00.000Z';
const recent = '2026-09-20T10:00:00.000Z';
const later = '2026-09-20T11:00:00.000Z';
const attempt = (id, recordedAt = recent, overrides = {}) => ({
  id, startedAt: new Date(Date.parse(recordedAt) - 120_000).toISOString(),
  recordedAt, updatedAt: recordedAt, outcome: 'wrong', elapsedSeconds: 120,
  answerViewed: false, hintViewed: false, ...overrides
});
const session = (id = 'session-new', startedAt = later) => ({
  id, startedAt, answerViewed: false, hintViewed: false
});
const state = overrides => ({ problemId: 'catalog-problem-001', updatedAt: recent, ...overrides });
const merge = (...lists) => mergeProblemStates(lists);
const deps = { mergeProblemStates: merge };
const roundTrip = value => JSON.parse(JSON.stringify(value));

test('legacy state and an explicit cleared session remain distinct after normalization', () => {
  const legacy = normalizeProblemState(state({ freePracticeAttempts: 'invalid', favorite: true }));
  assert.deepEqual(legacy.freePracticeAttempts, []);
  assert.equal(Object.hasOwn(legacy, 'freePracticeSession'), false);
  assert.equal(legacy.favorite, true);
  assert.equal(normalizeProblemState(state({ freePracticeSession: null })).freePracticeSession, null);
});

test('state normalization filters invalid attempts without changing unrelated practice fields', () => {
  const source = state({
    interviewCount: 7, completed: true, notes: 'keep my notes',
    freePracticeAttempts: [attempt('valid'), null, attempt('bad-outcome', recent, { outcome: 'unknown' })],
    freePracticeSession: session()
  });
  const original = roundTrip(source);
  const normalized = normalizeProblemState(source);
  assert.deepEqual(source, original);
  assert.deepEqual(normalized.freePracticeAttempts, [attempt('valid')]);
  assert.deepEqual(normalized.freePracticeSession, session());
  assert.equal(normalized.interviewCount, 7);
  assert.equal(normalized.completed, true);
  assert.equal(normalized.notes, 'keep my notes');
});

test('cloud merging keeps older history and applies the latest same-ID judgment once', () => {
  const remote = state({ freePracticeAttempts: [attempt('old', early), attempt('recent')] });
  const local = state({
    updatedAt: later,
    freePracticeAttempts: [attempt('recent', recent, { updatedAt: later, outcome: 'correct', hintViewed: true })]
  });
  for (const sources of [[remote, local], [local, remote]]) {
    const [merged] = merge(...sources.map(item => [item]));
    assert.equal(merged.freePracticeAttempts.length, 2);
    assert.deepEqual(merged.freePracticeAttempts[0], attempt('old', early));
    assert.equal(merged.freePracticeAttempts[1].id, 'recent');
    assert.equal(merged.freePracticeAttempts[1].outcome, 'correct');
    assert.equal(merged.freePracticeAttempts[1].hintViewed, true);
    assert.equal(merged.freePracticeAttempts[1].recordedAt, recent);
    assert.equal(merged.freePracticeAttempts[1].elapsedSeconds, 120);
  }
});

test('a newer explicit null wins against stale active sessions in either merge order', () => {
  const active = state({ freePracticeSession: session('unfinished', early) });
  const cleared = state({ updatedAt: later, freePracticeSession: null });
  for (const sources of [[active, cleared], [cleared, active]]) {
    assert.equal(merge(...sources.map(item => [item]))[0].freePracticeSession, null);
  }
  const tie = state({ freePracticeSession: null });
  for (const sources of [[active, tie], [tie, active]]) {
    assert.equal(merge(...sources.map(item => [item]))[0].freePracticeSession, null);
  }
});

test('missing session fields preserve current sessions while newer explicit sessions replace them', () => {
  const active = state({ freePracticeSession: session('older', early) });
  const legacy = state({ updatedAt: later, favorite: true });
  assert.deepEqual(merge([active], [legacy])[0].freePracticeSession, active.freePracticeSession);
  assert.deepEqual(merge([legacy], [active])[0].freePracticeSession, active.freePracticeSession);
  const fresh = state({ updatedAt: later, freePracticeSession: session('fresh', later) });
  assert.deepEqual(merge([fresh], [active])[0].freePracticeSession, fresh.freePracticeSession);
});

test('second-only cloud timestamps do not override a later clear within the same second', () => {
  const active = state({ updatedAt: '2026-09-20T10:00:00Z', freePracticeSession: session() });
  const cleared = state({ updatedAt: '2026-09-20T10:00:00.500Z', freePracticeSession: null });
  for (const sources of [[active, cleared], [cleared, active]]) {
    const [merged] = merge(...sources.map(item => [item]));
    assert.equal(merged.freePracticeSession, null);
    assert.equal(merged.updatedAt, cleared.updatedAt);
  }
  const equalTimeClear = state({ updatedAt: '2026-09-20T10:00:00.000Z', freePracticeSession: null });
  assert.equal(merge([equalTimeClear], [active])[0].freePracticeSession, null);
});

test('a newer active session keeps its precise timestamp across incremental cloud merges', () => {
  const cleared = state({ updatedAt: '2026-09-20T10:00:00Z', freePracticeSession: null });
  const active = state({ updatedAt: '2026-09-20T10:00:00.500Z', freePracticeSession: session() });
  const middle = state({ updatedAt: '2026-09-20T10:00:00.250Z', freePracticeSession: null });
  for (const sources of [[cleared, active], [active, cleared]]) {
    const [merged] = merge(...sources.map(item => [item]));
    const [incremental] = merge([merged], [middle]);
    assert.deepEqual(incremental.freePracticeSession, active.freePracticeSession);
    assert.equal(incremental.updatedAt, active.updatedAt);
  }
});

test('a completed session cannot reappear even if a stale cloud copy receives a newer state timestamp', () => {
  const done = state({ freePracticeAttempts: [attempt('submitted')], freePracticeSession: null });
  const stale = state({ updatedAt: later, freePracticeSession: session('submitted', early) });
  for (const sources of [[done, stale], [stale, done]]) {
    assert.equal(merge(...sources.map(item => [item]))[0].freePracticeSession, null);
  }
  assert.equal(normalizeProblemState({ ...done, freePracticeSession: stale.freePracticeSession }).freePracticeSession, null);
});

test('completed session aliases within a merged 24-hour attempt are also cleared', () => {
  const done = state({ freePracticeAttempts: [attempt('first'), attempt('alias', later)] });
  const stale = state({ updatedAt: later, freePracticeSession: session('alias', recent) });
  const [merged] = merge([done], [stale]);
  assert.equal(merged.freePracticeAttempts.length, 1);
  assert.equal(merged.freePracticeSession, null);
  assert.equal(normalizeProblemState({ ...merged, freePracticeSession: stale.freePracticeSession }).freePracticeSession, null);
});

test('local refresh and cloud payload round trips retain all history beyond the editing window', () => {
  const freePracticeAttempts = Array.from({ length: 120 }, (_, index) => attempt(
    `history-${index}`, new Date(Date.UTC(2025, 0, index + 1, 10)).toISOString()
  ));
  const local = normalizeState({ problemStates: [state({ freePracticeAttempts, freePracticeSession: null })] }, deps);
  const refreshed = normalizeState(roundTrip(localStatePayload(local)), deps);
  assert.deepEqual(refreshed.problemStates[0].freePracticeAttempts, freePracticeAttempts);
  const body = roundTrip(buildCloudSyncBody({ state: true }, { state: refreshed, cloudStatePayload }));
  assert.equal(Object.hasOwn(body.state, 'problemStates'), false);
  assert.deepEqual(body.problemStates[0].freePracticeAttempts, freePracticeAttempts);
  assert.equal(body.problemStates[0].freePracticeSession, null);
});

test('the real cloud-session merge chain preserves independent local and remote attempts', () => {
  const localState = { problemStates: [state({ freePracticeAttempts: [attempt('local')] })] };
  const payload = {
    state: { problemStates: [state({ freePracticeAttempts: [attempt('legacy', '2026-09-16T10:00:00.000Z')] })] },
    problemStates: [state({ freePracticeAttempts: [attempt('remote', early)] })]
  };
  const result = buildCloudSessionState(roundTrip(payload), {
    localState: roundTrip(localState), mergeProblemStates: merge,
    normalizeState: value => normalizeState(value, deps),
    mergeCloudState: (remote, local) => mergeCloudState(remote, local, deps)
  });
  assert.deepEqual(result.nextState.problemStates[0].freePracticeAttempts.map(item => item.id), ['legacy', 'remote', 'local']);
  const [repeated] = merge(result.nextState.problemStates, result.nextState.problemStates);
  assert.deepEqual(repeated.freePracticeAttempts, result.nextState.problemStates[0].freePracticeAttempts);
});
