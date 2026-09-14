import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMentalMathRecords } from '../src/modules/tools/data.js';
import { buildCloudSessionState, cloudStatePayload, mergeCloudState, normalizeState } from '../src/state/data.js';
import { createCloudSessionController } from '../src/state/cloudSessionController.js';

const deps = { normalizeMentalMathRecords };
const record = (id, day = 1) => ({ id, mode: 'numberLogic', correct: 3, incorrect: 2,
  score: 1, total: 5, createdAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z` });
const merge = (remote, local) => mergeCloudState(remote, local, deps);
const normalize = (state) => normalizeState(state, deps);
const ids = (state) => state.mentalMathRecords.map((row) => row.id);

test('a fresh device retains cloud mental-math history through login and its queued state write', () => {
  const cloud = { mentalMathRecords: [record('remote-history')] };
  const before = structuredClone(cloud);
  const userStateStore = { value: null };
  const written = [], queued = [];
  const controller = createCloudSessionController({
    getAppState: () => ({}),
    getUserStateStore: () => userStateStore,
    normalizeAccount: (account) => account,
    loadStateForUser: () => normalize({}),
    buildCloudSessionState,
    mergeCloudState: merge,
    normalizeState: normalize,
    writeUserState: (userId, state) => written.push({ userId, state }),
    queueCloudSync: (slice) => queued.push({ slice, state: cloudStatePayload(userStateStore.value) }),
  });
  controller.apply({ account: { id: 'student' }, state: cloud });
  assert.deepEqual(ids(written[0].state), ['remote-history']);
  assert.deepEqual(ids(queued.find((row) => row.slice === 'state').state), ['remote-history']);
  assert.deepEqual(cloud, before);
});

test('disjoint device histories merge by stable ID and repeated synchronization does not duplicate records', () => {
  const shared = record('shared', 2);
  const remote = { mentalMathRecords: [record('cloud-only', 1), shared, shared] };
  const local = { mentalMathRecords: [shared, record('local-only', 3)] };
  const before = structuredClone({ remote, local });
  const merged = merge(remote, local);
  assert.deepEqual(ids(merged), ['cloud-only', 'shared', 'local-only']);
  assert.deepEqual(ids(merge(merged, local)), ids(merged));
  assert.deepEqual(ids(merge(remote, merged)), ids(merged));
  assert.deepEqual({ remote, local }, before);
});

test('normalization and cloud round trips retain all 81 historical sessions', () => {
  const history = Array.from({ length: 81 }, (_, index) => record(`history-${index}`));
  const state = normalize({ mentalMathRecords: history });
  assert.equal(state.mentalMathRecords.length, 81);
  assert.deepEqual(ids(state), history.map((row) => row.id));
  const restored = merge(JSON.parse(JSON.stringify(cloudStatePayload(state))), {});
  assert.equal(restored.mentalMathRecords.length, 81);
  assert.deepEqual(new Set(ids(restored)), new Set(ids(state)));
  const appended = normalizeMentalMathRecords([...restored.mentalMathRecords, record('new-session', 2)]);
  assert.equal(appended.length, 82);
  assert.equal(appended[0].id, 'history-0');
});

test('an explicit replacement still clears history instead of restoring prior local records', () => {
  const { nextState } = buildCloudSessionState({ state: { mentalMathRecords: [] } }, {
    localState: { mentalMathRecords: [record('before-reset')] },
    merge: false,
    mergeCloudState: merge,
    normalizeState: normalize,
  });
  assert.deepEqual(nextState.mentalMathRecords, []);
});
