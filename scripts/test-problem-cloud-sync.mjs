import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSyncController } from '../src/api/cloudSync.js';
import { createSyncSettingsBundle } from '../src/app/syncSettingsBundle.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function memoryStorage() { const data = new Map(); return { data, getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) }; }
function fixture(options = {}) {
  const eventTarget = new EventTarget(); eventTarget.document = new EventTarget();
  const timers = new Map(); let nextTimer = 0;
  const scheduler = { setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id) };
  const storage = options.storage || memoryStorage();
  const state = { user: { id: 'alice' }, config: { endpoint: 'https://api.example.invalid/api', userId: 'alice', token: 'private-token' }, calls: [], statuses: [], successes: [], body: { problemStates: [] } };
  const controller = createCloudSyncController({ storage, eventTarget, scheduler, getCurrentUser: () => state.user, getConfig: () => state.config,
    canUseCloud: () => Boolean(state.user && state.config.token), buildBody: () => structuredClone(state.body),
    onStatus: value => state.statuses.push(value), onSuccess: (...args) => state.successes.push(args),
    cloudApi: async (path, request) => { state.calls.push({ path, ...request }); return options.request ? options.request(path, request) : { problemStates: [], syncedAt: '2026-10-17T00:00:00Z' }; },
  });
  return { controller, storage, state, timers, eventTarget, scheduler };
}

test('initial, focus and online refreshes use an authenticated small read without a full state upload', async () => {
  const f = fixture(); await f.controller.start();
  assert.equal(f.controller.getStatus().initialPulled, true);
  f.eventTarget.dispatchEvent(new Event('focus')); await settle();
  f.eventTarget.dispatchEvent(new Event('online')); await settle();
  assert.deepEqual(f.state.calls.map(call => [call.path, call.method]), Array(3).fill(['/problem-states', 'GET']));
  assert(f.state.calls.every(call => call.cache === 'no-store'));
  assert.equal(f.controller.getStatus().phase, 'synced'); f.controller.stop();
});

test('failed and interrupted writes remain durable through reload and are scoped by account and endpoint', async () => {
  const storage = memoryStorage(); const first = fixture({ storage, request: async () => { throw new Error('offline'); } });
  first.controller.queue('state'); assert.equal((await first.controller.flush()).ok, false);
  assert.equal(first.controller.getStatus().phase, 'error'); first.controller.stop();
  const persisted = [...storage.data.values()].join('');
  assert(!persisted.includes('private-token')); assert(!persisted.includes('problemStates'));
  const other = fixture({ storage }); other.state.user = { id: 'bob' }; other.state.config.userId = 'bob';
  await other.controller.start(); assert.equal(other.state.calls.length, 1); other.controller.stop();
  const differentHost = fixture({ storage }); differentHost.state.config.endpoint = 'https://other.example.invalid/api';
  await differentHost.controller.start(); assert.equal(differentHost.state.calls.length, 1); differentHost.controller.stop();
  const restored = fixture({ storage }); await restored.controller.start();
  assert.deepEqual(restored.state.calls.map(call => call.path), ['/problem-states', '/sync']);
  assert.equal(restored.controller.getDirty().state, false); assert.equal(restored.controller.getStatus().initialPulled, true); restored.controller.stop();
});

test('an edit during a request stays pending until a second acknowledgement', async () => {
  const wait = deferred(); let count = 0;
  const f = fixture({ request: async () => ++count === 1 ? wait.promise : { problemStates: [] } });
  f.controller.queue('state'); const saving = f.controller.flush(); await settle();
  f.controller.queue('state'); wait.resolve({ problemStates: [] }); await saving;
  assert(f.state.statuses.some(status => status.phase === 'pending'));
  await f.controller.flush(); assert.equal(f.controller.getDirty().state, false); assert.equal(count, 2); f.controller.stop();
});

for (const changed of ['logout', 'account', 'token', 'endpoint']) {
  test(`late read/write responses cannot alter the active session after ${changed}`, async () => {
    for (const method of ['read', 'write']) {
      const wait = deferred(); const f = fixture({ request: () => wait.promise });
      if (method === 'write') f.controller.queue('state');
      const saving = method === 'write' ? f.controller.flush() : f.controller.refresh(); await settle();
      if (changed === 'logout') f.state.user = null;
      if (changed === 'account') { f.state.user = { id: 'bob' }; f.state.config.userId = 'bob'; }
      if (changed === 'token') f.state.config.token = 'replacement';
      if (changed === 'endpoint') f.state.config.endpoint = 'https://new.example.invalid/api';
      wait.resolve({ problemStates: [{ problemId: 'quantvault-14', favorite: true }] });
      assert.equal((await saving).ok, false); assert.equal(f.state.successes.length, 0);
      if (method === 'write') assert([...f.storage.data.values()].some(value => JSON.parse(value).state));
      f.controller.stop();
    }
  });
}

test('offline failures retry with backoff, online recovers, and permission errors do not spin', async () => {
  let unavailable = true;
  const f = fixture({ request: async () => { if (unavailable) throw new Error('offline'); return { problemStates: [] }; } });
  await f.controller.start(); assert.equal([...f.timers.values()][0].delay, 5000);
  const [key, timer] = [...f.timers][0]; f.timers.delete(key); timer.fn(); await settle();
  assert.equal(f.state.calls[1].method, 'GET', 'A failed initial read must retry as a read even without edits.');
  assert.equal([...f.timers.values()][0].delay, 10000);
  unavailable = false; f.eventTarget.dispatchEvent(new Event('online')); await settle();
  assert.equal(f.controller.getStatus().phase, 'synced'); assert.equal(f.controller.getStatus().initialPulled, true); f.controller.stop();
  const denied = fixture({ request: async () => { throw Object.assign(new Error('login expired'), { status: 401 }); } });
  await denied.controller.start(); assert.equal(denied.timers.size, 0); denied.controller.stop();
});

test('a session replacement refreshes independently while an old request is still pending', async () => {
  const wait = deferred(); let call = 0;
  const f = fixture({ request: async () => ++call === 1 ? wait.promise : { problemStates: [] } });
  const first = f.controller.start(); await settle();
  f.state.user = { id: 'bob' }; f.state.config = { ...f.state.config, userId: 'bob', token: 'bob-token' };
  f.controller.sessionChanged(); await settle();
  assert.equal(f.controller.getStatus().ownerId, 'bob'); assert.equal(f.controller.getStatus().initialPulled, true);
  wait.resolve({ problemStates: [] }); await first;
  assert.equal(f.state.successes.length, 1); f.controller.stop();
});

test('page close flushes pending edits immediately and stopped controllers remove lifecycle listeners', async () => {
  const f = fixture(); await f.controller.start(); f.controller.queue('state', 700);
  f.eventTarget.dispatchEvent(new Event('pagehide')); await settle();
  assert.equal(f.state.calls.at(-1).path, '/sync'); assert.equal(f.controller.getDirty().state, false);
  f.controller.stop(); const count = f.state.calls.length; f.eventTarget.dispatchEvent(new Event('online')); await settle();
  assert.equal(f.state.calls.length, count);
});

test('real settings bundle applies server records, preserves in-flight records, and saves without activity or upload loops', async () => {
  const wait = deferred(), storage = memoryStorage();
  const date = index => `2026-10-1${index}T12:00:00.000Z`;
  const attempt = (id, day) => ({ id, startedAt: date(day), recordedAt: date(day), updatedAt: date(day), outcome: 'correct', elapsedSeconds: 5 });
  const local = { problemId: 'quantvault-14', updatedAt: date(1), freePracticeAttempts: [attempt('local', 1)] };
  const remote = { problemId: 'quantvault-14', updatedAt: date(2), freePracticeAttempts: [attempt('remote', 2)] };
  const appState = { currentUser: { id: 'alice' }, cloudConfig: { userId: 'alice', token: 'fixture', endpoint: 'https://api.example.invalid' } };
  const userState = { value: { problemStates: [local] } }; let disk = structuredClone(userState.value); const saves = [];
  const bundle = createSyncSettingsBundle({ appState, userState, storage, canUseCloud: () => true,
    cloudApi: async () => wait.promise, cloudStatePayload: value => value, getUserCatalogProblems: () => [],
    loadStateForUser: () => disk, saveState: options => { saves.push(options); disk = structuredClone(userState.value); },
    saveCloudConfig() {}, syncStores() {}, t: value => value, formatDate: value => value, normalizeLeaderboardSettings: value => value,
  });
  await settle();
  assert.equal(appState.cloudConfig.problemSyncStatus.initialPulled, false);
  userState.value.problemStates = [...userState.value.problemStates, { problemId: 'quantvault-15', favorite: true, updatedAt: date(3) }];
  wait.resolve({ problemStates: [remote] }); await bundle.cloudSyncController.refresh();
  assert.equal(appState.cloudConfig.problemSyncStatus.initialPulled, true);
  assert.equal(userState.value.problemStates.length, 2);
  assert.deepEqual(userState.value.problemStates.find(row => row.problemId === 'quantvault-14').freePracticeAttempts.map(row => row.id), ['local', 'remote']);
  assert(saves.every(options => options.sync === false && options.checkIn === false));
  assert.equal(bundle.cloudSyncController.getDirty().state, false); bundle.dispose();
});

test('refresh requested during a write performs a later GET and sees the committed assessment projection', async () => {
  const wait = deferred(); let projection = false;
  const f = fixture({ request: async (path) => path === '/sync' ? wait.promise : { problemStates: projection ? [{ problemId: 'quantvault-14' }] : [] } });
  f.controller.queue('state'); const writing = f.controller.flush(); await settle();
  projection = true; const refreshed = f.controller.refresh(); wait.resolve({ problemStates: [] });
  await writing; await refreshed;
  assert.deepEqual(f.state.calls.map(call => call.path), ['/sync', '/problem-states']);
  assert.deepEqual(f.state.successes.at(-1)[0].problemStates, [{ problemId: 'quantvault-14' }]);
  assert.equal(f.controller.getStatus().initialPulled, true); f.controller.stop();
});

test('refresh intent during an older read runs one trailing read and returns the newer data', async () => {
  const wait = deferred(); let reads = 0;
  const f = fixture({ request: async () => ++reads === 1 ? wait.promise : { problemStates: [{ problemId: 'new-cloud-record' }] } });
  const started = f.controller.start(); await settle();
  const refreshed = f.controller.refresh(); f.controller.refresh(); f.controller.refresh();
  wait.resolve({ problemStates: [] }); await started; await refreshed;
  assert.equal(reads, 2); assert.equal(f.state.successes.at(-1)[0].problemStates[0].problemId, 'new-cloud-record'); f.controller.stop();
});

test('another tab acknowledging the same marker cannot resurrect an endless upload', async () => {
  const storage = memoryStorage(); const first = fixture({ storage }); const second = fixture({ storage });
  first.controller.queue('state'); assert.equal(second.controller.getDirty().state, true);
  await first.controller.flush(); assert.equal(second.controller.getDirty().state, false);
  await second.controller.flush(); assert.equal(second.state.calls.length, 0); first.controller.stop(); second.controller.stop();
});

test('preparation errors are reported honestly and retain durable pending work', async () => {
  const storage = memoryStorage(); const statuses = [];
  const controller = createCloudSyncController({ storage, getCurrentUser: () => ({ id: 'alice' }), getConfig: () => ({ userId: 'alice', token: 'fixture' }), canUseCloud: () => true,
    beforeSync() { throw new Error('local merge failed'); }, onStatus: status => statuses.push(status), cloudApi: () => assert.fail('must not upload an invalid local snapshot') });
  controller.queue('state'); const result = await controller.flush();
  assert.equal(result.ok, false); assert.equal(statuses.at(-1).phase, 'error'); assert.equal(controller.getDirty().state, true); controller.stop();
});

test('legacy local-only personal records are reconciled by a small upload once and idle pulls stay read-only', async () => {
  const storage = memoryStorage(), calls = [];
  const appState = { currentUser: { id: 'alice' }, cloudConfig: { userId: 'alice', token: 'fixture', endpoint: 'https://api.example.invalid' } };
  const local = { problemId: 'quantvault-14', favorite: true, updatedAt: '2026-10-17T00:00:00Z' };
  const userState = { value: { problemStates: [local], entries: [{ id: 'unrelated-private-data' }] } }; let disk = structuredClone(userState.value), remote = [];
  const bundle = createSyncSettingsBundle({ appState, userState, storage, canUseCloud: () => true,
    cloudApi: async (path, request) => {
      calls.push({ path, ...request });
      if (request.method === 'POST') remote = structuredClone(request.body.problemStates);
      return { problemStates: structuredClone(remote) };
    }, cloudStatePayload: value => value, getUserCatalogProblems: () => [], loadStateForUser: () => disk,
    saveState: () => { disk = structuredClone(userState.value); }, saveCloudConfig() {}, syncStores() {}, t: value => value, formatDate: value => value, normalizeLeaderboardSettings: value => value,
  });
  await settle(); await bundle.cloudSyncController.refresh(); await bundle.cloudSyncController.refresh();
  const uploads = calls.filter(call => call.method === 'POST'); assert.equal(uploads.length, 1);
  assert.deepEqual(Object.keys(uploads[0].body), ['problemStates']); assert.equal(remote[0].favorite, true);
  assert.equal(appState.cloudConfig.problemSyncStatus.phase, 'synced'); bundle.dispose();
});

test('the real user state persistence preserves a different tab note while saving a favorite', async () => {
  const { createUserStateRuntime } = await import('../src/state/userStateRuntime.js');
  const { mergeProblemStates } = await import('../src/modules/problems/data.js');
  const date = index => `2026-10-17T0${index}:00:00.000Z`;
  let disk = { problemStates: [{ problemId: 'quantvault-14', note: 'A note written in another tab', noteUpdatedAt: date(2), favorite: false, favoriteUpdatedAt: date(1), updatedAt: date(2) }] };
  const runtime = createUserStateRuntime({ problemStates: [{ problemId: 'quantvault-14', note: '', noteUpdatedAt: date(1), favorite: true, favoriteUpdatedAt: date(3), updatedAt: date(3) }] }, {
    getCurrentUser: () => ({ id: 'alice' }), loadUserState: () => structuredClone(disk), writeUserState: (owner, state) => { disk = structuredClone(state); },
    mergeProblemStates: (...lists) => mergeProblemStates(lists),
  });
  runtime.save({ checkIn: false });
  assert.equal(disk.problemStates[0].note, 'A note written in another tab'); assert.equal(disk.problemStates[0].favorite, true);
});
