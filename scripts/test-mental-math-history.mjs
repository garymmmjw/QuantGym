import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGameRecords, normalizeMentalMathRecords } from '../src/modules/tools/data.js';
import { buildCloudSessionState, cloudStatePayload, mergeCloudState, normalizeState } from '../src/state/data.js';
import { createCloudSessionController } from '../src/state/cloudSessionController.js';
import { createAccountAuthController } from '../src/modules/account/authController.js';
import { normalizeLeetcodeHot100Done } from '../src/modules/problems/data.js';
import { upsertAuthAccount } from '../src/state/auth.js';

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

const gameRecord = (id, day = 1) => ({ id, game: 'market', score: 3, detail: id, createdAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z` });
const historyDeps = { normalizeMentalMathRecords, normalizeGameRecords,
  createBaseState: () => ({ createdAt: '2026-09-01T00:00:00Z' }),
  normalizeLeetcodeHot100Done: values => normalizeLeetcodeHot100Done(values, ['source-one', 'source-two', 'target', 'cloud'].map(id => ({ id }))) };
const mergeHistory = (remote, local) => mergeCloudState(remote, local, historyDeps);

test('game history and Hot 100 completions survive a fresh device and repeated state merges', () => {
  const remote = { gameRecords: [gameRecord('cloud')], leetcodeHot100Done: ['cloud'] };
  const local = { gameRecords: [gameRecord('target', 2)], leetcodeHot100Done: ['target'] };
  const downloaded = mergeHistory(remote, {});
  assert.deepEqual(downloaded.gameRecords.map(row => row.id), ['cloud']);
  assert.deepEqual(downloaded.leetcodeHot100Done, ['cloud']);
  const combined = mergeHistory(remote, local);
  assert.deepEqual(combined.gameRecords.map(row => row.id), ['cloud', 'target']);
  assert.deepEqual(new Set(combined.leetcodeHot100Done), new Set(['cloud', 'target']));
  assert.deepEqual(mergeHistory(remote, combined), combined);
});

test('normalization, cloud round trips and appending retain game sessions beyond the old 80 record cap', () => {
  const history = Array.from({ length: 81 }, (_, index) => gameRecord(`game-${index}`));
  const normalized = normalizeState({ gameRecords: history }, historyDeps);
  assert.equal(normalized.gameRecords.length, 81);
  const restored = mergeHistory(JSON.parse(JSON.stringify(cloudStatePayload(normalized))), {});
  assert.deepEqual(new Set(restored.gameRecords.map(row => row.id)), new Set(history.map(row => row.id)));
  assert.equal(normalizeGameRecords([...restored.gameRecords, gameRecord('new-game')]).length, 82);
});

test('real verified multi-owner login merges all game histories and completions without duplicating a later login', async () => {
  const email = 'verified@example.test', targetId = 'cloud-owner';
  const profiles = ['source-one', 'source-two'].map(id => ({ id, provider: 'local', email, passwordHash: 'verified-old-hash' }));
  const states = new Map([...profiles.map(profile => [profile.id, { gameRecords: [gameRecord(profile.id)], leetcodeHot100Done: [profile.id] }]),
    [targetId, { gameRecords: [gameRecord('target', 2)], leetcodeHot100Done: ['target'] }]]);
  const appState = { auth: { accounts: profiles, currentUserId: '' }, community: {}, cloudConfig: {} };
  const cloudSession = { token: 'verified-token', account: { id: targetId, provider: 'local', email }, state: { gameRecords: [gameRecord('cloud', 3)], leetcodeHot100Done: ['cloud'] } };
  const session = createCloudSessionController({
    getAppState: () => appState, normalizeAccount: value => value,
    upsertLocalAccount: (account, localFields) => upsertAuthAccount(appState.auth, account, { localFields }),
    migrateVerifiedCareerOwner: () => ({ migrated: false }),
    buildCloudSessionState, mergeCloudState: mergeHistory,
    normalizeState: value => normalizeState(value, historyDeps),
    writeUserState: (owner, value) => states.set(owner, value),
  });
  const controller = createAccountAuthController({
    getAppState: () => appState, elements: { loginEmail: { value: email }, loginPassword: { value: 'verified-password' }, loginForm: { reset() {} } },
    normalizeEmail: value => String(value || '').trim().toLowerCase(), normalizeAccount: value => value,
    loginCloudAccount: async () => cloudSession, hashPassword: async () => 'verified-old-hash',
    loadStateForUser: owner => normalizeState(states.get(owner) || {}, historyDeps), mergeCloudState: mergeHistory,
    applyCloudSession: session.apply,
  });
  const expected = new Set(['source-one', 'source-two', 'target', 'cloud']);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await controller.loginLocal();
    assert.equal(appState.auth.currentUserId, targetId);
    assert.deepEqual(new Set(states.get(targetId).gameRecords.map(row => row.id)), expected);
    assert.equal(states.get(targetId).gameRecords.length, 4);
    assert.deepEqual(new Set(states.get(targetId).leetcodeHot100Done), expected);
  }
  assert.deepEqual(states.get('source-one').gameRecords, [gameRecord('source-one')]);
  assert.deepEqual(states.get('source-two').gameRecords, [gameRecord('source-two')]);
});
