import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserStateRuntime } from '../src/state/userStateRuntime.js';
import { loadUserState } from '../src/state/persistence.js';
import { mergeProblemStates, problemStatesFromFavorites } from '../src/modules/problems/data.js';
import { isDisabledProblemId } from '../src/modules/problems/format.js';
import { normalizeState, mergeRecordsById } from '../src/state/data.js';
import { createSyncSettingsBundle } from '../src/app/syncSettingsBundle.js';

const key = owner => `test.user-state:${owner}`;
const merge = (...lists) => mergeProblemStates(lists, { mergeRecordsById: (...values) => mergeRecordsById(values) });
const settle = () => new Promise(resolve => setImmediate(resolve));

function withStorage(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  const storage = { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  const restore = () => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  };
  try {
    const result = run(storage);
    if (result?.then) return result.finally(restore);
    restore();
    return result;
  } catch (error) { restore(); throw error; }
}

function runtime() {
  return createUserStateRuntime({}, {
    loadUserState, userStateKey: key, mergeProblemStates: merge,
    problemStatesFromFavorites, isDisabledProblemId,
    createBaseState() { assert.fail('A personal-record read must not construct the full catalog.'); },
    normalizeState() { assert.fail('A personal-record read must not normalize unrelated domains.'); }
  });
}

test('personal cache reads preserve legacy favorites, field tombstones and attempt records without loading the catalog', () => withStorage(storage => {
  const saved = {
    problems: [{ id: 'irrelevant-catalog-row', prompt: 'Unrelated question content' }],
    interviewFavorites: [
      { id: 'legacy-favorite', problemId: 'catalog-legacy', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'unrelated-interview' }
    ],
    problemStates: [
      { problemId: 'catalog-current', note: '', noteUpdatedAt: '2026-10-02T00:00:00Z', favorite: false,
        favoriteUpdatedAt: '2026-10-02T00:00:00Z', freePracticeSession: null,
        freePracticeAttempts: [{ id: 'done', startedAt: '2026-10-01T00:00:00Z', recordedAt: '2026-10-01T00:01:00Z', outcome: 'correct', elapsedSeconds: 60 }] },
      { problemId: 'purple-book-problem-001', favorite: true }
    ]
  };
  storage.setItem(key('alice'), JSON.stringify(saved));
  const expected = normalizeState(saved, { createBaseState: () => ({}), mergeProblemStates: merge, problemStatesFromFavorites, isDisabledProblemId }).problemStates;
  const actual = runtime().loadProblemStatesForUser('alice');
  assert.deepEqual(actual, expected);
  assert.equal(actual.find(row => row.problemId === 'catalog-current').freePracticeSession, null);
  assert.equal(actual.find(row => row.problemId === 'catalog-legacy').favorite, true);
  assert.equal(actual.some(row => isDisabledProblemId(row.problemId)), false);
}));

test('personal cache reads see fresh cross-tab changes and remain isolated by owner', () => withStorage(storage => {
  const reader = runtime();
  storage.setItem(key('alice'), JSON.stringify({ problemStates: [{ problemId: 'alice-only', note: 'first' }] }));
  storage.setItem(key('bob'), JSON.stringify({ problemStates: [{ problemId: 'bob-only', note: 'private' }] }));
  assert.equal(reader.loadProblemStatesForUser('alice')[0].note, 'first');
  storage.setItem(key('alice'), JSON.stringify({ problemStates: [{ problemId: 'alice-only', note: 'updated in another tab' }] }));
  assert.equal(reader.loadProblemStatesForUser('alice')[0].note, 'updated in another tab');
  assert.deepEqual(reader.loadProblemStatesForUser('bob').map(row => row.problemId), ['bob-only']);
  assert.deepEqual(reader.loadProblemStatesForUser('missing'), []);
  assert.deepEqual(reader.loadProblemStatesForUser(null), []);
  storage.setItem(key('broken'), '{invalid');
  assert.deepEqual(reader.loadProblemStatesForUser('broken'), []);
  storage.setItem(key('wrong-shape'), JSON.stringify({ problemStates: {}, interviewFavorites: null }));
  assert.deepEqual(reader.loadProblemStatesForUser('wrong-shape'), []);
}));

test('cloud reconciliation uses the small cache read before and after a response, retaining edits from another tab', () => withStorage(async storage => {
  const reader = runtime();
  const current = { problemId: 'catalog-current', favorite: true, favoriteUpdatedAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z' };
  const userState = { value: { problemStates: merge([current]) } };
  storage.setItem(key('alice'), JSON.stringify(userState.value));
  const appState = { currentUser: { id: 'alice' }, cloudConfig: { userId: 'alice', token: 'fixture', endpoint: 'https://fixture.invalid/api' } };
  let resolveRead;
  const pending = new Promise(resolve => { resolveRead = resolve; });
  const reads = [];
  const bundle = createSyncSettingsBundle({
    appState, userState, storage, windowRef: null, canUseCloud: () => true,
    loadProblemStatesForUser: owner => { reads.push(owner); return reader.loadProblemStatesForUser(owner); },
    loadStateForUser() { assert.fail('Sync must not reload the full user workspace.'); },
    cloudApi: async (_path, request) => request.method === 'GET' ? pending : { problemStates: request.body.problemStates },
    cloudStatePayload: value => value, getUserCatalogProblems: () => [],
    saveState: () => storage.setItem(key('alice'), JSON.stringify(userState.value)),
    saveCloudConfig() {}, syncStores() {}, t: value => value, formatDate: value => value, normalizeLeaderboardSettings: value => value
  });
  try {
    await settle();
    assert.deepEqual(reads, ['alice']);
    storage.setItem(key('alice'), JSON.stringify({ problemStates: [{ ...current, note: 'Saved from another tab while waiting', noteUpdatedAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z' }] }));
    resolveRead({ problemStates: [current] });
    await settle();
    await bundle.cloudSyncController.flush();
    assert(reads.length >= 2);
    assert(reads.every(owner => owner === 'alice'));
    assert.equal(userState.value.problemStates[0].note, 'Saved from another tab while waiting');
    assert.equal(userState.value.problemStates[0].favorite, true);
    assert.equal(bundle.cloudSyncController.getDirty().state, false);
    assert.equal(bundle.cloudSyncController.getDirty().problemStates, false);
  } finally { bundle.dispose(); }
}));
