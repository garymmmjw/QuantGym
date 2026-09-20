import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalCloudSync, personalFingerprint } from '../src/features/personal/personalCloud.js';
import { createPersonalStore, createPersonalState } from '../src/features/personal/personalStore.js';
import { createTrial } from '../src/features/personal/mental/mentalEngine.js';
import { createReasoningTrial, transitionReasoningTrial, persistReasoningTransition, cancelTrialPreparation } from '../src/features/personal/mental/reasoningEngine.js';
import { createDailySession, updateDailyAnswer } from '../src/features/personal/daily/dailyEngine.js';

const iso = '2026-09-09T12:00:00.000Z';
const clone = value => structuredClone(value);
const controllers = new Set();
afterEach(async () => { await Promise.all([...controllers].map(cloud => cloud.stop())); controllers.clear(); });
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
const activity = id => ({ id, kind: 'quant', count: 1, completedAt: iso });
const add = id => state => ({ ...state, activities: [...state.activities, activity(id)] });
const ids = data => data.activities.map(item => item.id).sort();
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const response = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });

/** A revision-checked API, with controllable request boundaries and no real network. */
function memoryServer(initial = null, initialRevision = 0) {
  let data = clone(initial), revision = initialRevision;
  const calls = [];
  const api = {
    calls,
    get data() { return clone(data); },
    get revision() { return revision; },
    beforeGet: null,
    beforePut: null,
    afterPut: null,
    transformPut: null,
    change(next) { data = clone(next); revision += 1; },
    replace(next, nextRevision) { data = clone(next); revision = nextRevision; },
    async fetch(url, options) {
      const request = { url, method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : null };
      calls.push(request);
      const envelope = () => ({ version: 1, revision, data: clone(data), updatedAt: data === null ? null : iso });
      if (options.method === 'GET') {
        await api.beforeGet?.(request);
        return response(200, envelope());
      }
      await api.beforePut?.(request);
      if (request.body.baseRevision !== revision) return response(409, { ...envelope(), error: 'Training changed on another device.' });
      assert.equal(request.body.version, 1);
      data = clone(api.transformPut ? api.transformPut(request.body.data) : request.body.data);
      revision += 1;
      const saved = envelope();
      await api.afterPut?.(request);
      return response(200, saved);
    },
  };
  return api;
}

function device(server, { ownerId = 'alice', storage = memoryStorage(), token = 'test-only-token', userId = ownerId, fetchImpl, debounceMs = 60000 } = {}) {
  const store = createPersonalStore({ ownerId, storage });
  const statuses = [];
  const cloud = createPersonalCloudSync({ store, ownerId, storage, config: { endpoint: 'https://api.example.test/api', token, userId },
    fetchImpl: fetchImpl || server.fetch.bind(server), onStatus: state => statuses.push(state), debounceMs });
  controllers.add(cloud);
  return { store, cloud, storage, statuses };
}

const trackerOp = (id, clock = 1) => ({ id, clock, kind: 'application', applicationId: 'private-application', fields: { company: id } });
test('metadata fast paths cannot clear immutable Tracker operations on either side', async () => {
  const operation = trackerOp('keep-me');
  const server = memoryServer();
  const first = device(server);
  first.store.update(data => ({ ...data, careerTrackerOperations: [operation] }));
  await first.cloud.sync();
  server.change({ ...server.data, careerTrackerOperations: [], activities: [activity('legacy-client')] });
  await first.cloud.sync();
  assert.deepEqual(first.store.getSnapshot().data.careerTrackerOperations, [operation]);
  assert.deepEqual(server.data.careerTrackerOperations, [operation]);
  assert.deepEqual(ids(first.store.getSnapshot().data), ['legacy-client']);
  first.store.update(data => ({ ...data, careerTrackerOperations: [], activities: [...data.activities, activity('local-client')] }));
  await first.cloud.sync();
  assert.deepEqual(first.store.getSnapshot().data.careerTrackerOperations, [operation]);
  assert.deepEqual(server.data.careerTrackerOperations, [operation]);
  assert.deepEqual(ids(server.data), ['legacy-client', 'local-client']);
});

test('server-retained Tracker operations become the confirmed local journal without redundant uploads', async () => {
  const server = memoryServer();
  const retained = trackerOp('server-retained', 2);
  server.transformPut = data => ({ ...data, careerTrackerOperations: [...data.careerTrackerOperations.filter(op => op.id !== retained.id), retained] });
  const first = device(server);
  first.store.update(data => ({ ...data, careerTrackerOperations: [trackerOp('local', 1)] }));
  await first.cloud.sync();
  assert.deepEqual(first.store.getSnapshot().data.careerTrackerOperations, [trackerOp('local', 1), retained]);
  const meta = JSON.parse(first.storage.getItem('quantgym.personal-sync.v1:alice:https%3A%2F%2Fapi.example.test%2Fapi'));
  assert.equal(meta.fingerprint, await personalFingerprint(server.data));
  await first.cloud.sync();
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 1);
});

test('server-retained data is applied immediately and its confirmed fingerprint is the next sync baseline', async () => {
  const server = memoryServer();
  const retained = activity('server-retained');
  server.transformPut = data => ({ ...data, activities: [...data.activities.filter(row => row.id !== retained.id), retained] });
  const first = device(server);
  first.store.update(add('local'));
  await first.cloud.sync();
  assert.deepEqual(ids(first.store.getSnapshot().data), ['local', 'server-retained']);
  assert.deepEqual(ids(createPersonalStore({ ownerId: 'alice', storage: first.storage }).getSnapshot().data), ['local', 'server-retained']);
  const meta = JSON.parse(first.storage.getItem('quantgym.personal-sync.v1:alice:https%3A%2F%2Fapi.example.test%2Fapi'));
  assert.equal(meta.fingerprint, await personalFingerprint(server.data));
  assert.equal(meta.revision, 1);
  await first.cloud.sync();
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 1);
  assert.equal(first.statuses.at(-1).phase, 'synced');
});

test('server-retained records and local edits during acknowledgement both survive and drain to cloud', async () => {
  const server = memoryServer();
  const retained = activity('server-retained');
  server.transformPut = data => ({ ...data, activities: [...data.activities.filter(row => row.id !== retained.id), retained] });
  const first = device(server);
  first.store.update(add('before-request'));
  const entered = deferred(), release = deferred();
  server.afterPut = async () => { server.afterPut = null; entered.resolve(); await release.promise; };
  const syncing = first.cloud.sync();
  await entered.promise;
  first.store.update(add('while-saving'));
  release.resolve();
  await syncing;
  assert.deepEqual(ids(server.data), ['before-request', 'server-retained', 'while-saving']);
  assert.deepEqual(ids(first.store.getSnapshot().data), ids(server.data));
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 2);
  assert.equal(first.statuses.at(-1).phase, 'synced');
});

test('a PUT acknowledgement without saved data cannot mark local work synced', async () => {
  const server = memoryServer();
  const first = device(server, { fetchImpl: async (url, options) => options.method === 'PUT'
    ? response(200, { version: 1, revision: 1, data: null, updatedAt: iso }) : server.fetch(url, options) });
  first.store.update(add('keep-local'));
  await first.cloud.sync();
  assert.deepEqual(ids(first.store.getSnapshot().data), ['keep-local']);
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.match(first.statuses.at(-1).message, /saved data/);
  assert.equal(first.storage.getItem('quantgym.personal-sync.v1:alice:https%3A%2F%2Fapi.example.test%2Fapi'), null);
});

test('invalid credentials stop automatic retries while keeping subsequent local edits', async () => {
  const server = memoryServer();
  let calls = 0;
  const first = device(server, { token: 'expired-recovery-test', fetchImpl: async () => {
    calls++;
    return response(401, { error: 'Invalid or expired token' });
  } });
  first.store.update(add('before-expiry'));
  await first.cloud.start();
  first.store.update(add('after-expiry'));
  await first.cloud.sync();
  assert.equal(calls, 1);
  assert.equal(first.statuses.at(-1).phase, 'auth');
  assert.deepEqual(ids(first.store.getSnapshot().data), ['after-expiry', 'before-expiry']);
  await first.cloud.stop();
  const recovered = device(server, { storage: first.storage, token: 'fresh-recovery-test' });
  await recovered.cloud.start();
  assert.equal(recovered.statuses.at(-1).phase, 'synced');
  assert.deepEqual(ids(server.data), ['after-expiry', 'before-expiry']);
});

test('first upload saves the complete private snapshot and revision metadata', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(state => ({ ...add('first')(state), activeTrial: { ...createTrial({}, { now: Date.parse(iso), id: 'trial-1' }), currentAnswer: '42' } }));
  await first.cloud.sync();
  assert.equal(server.revision, 1);
  assert.deepEqual(server.data, first.store.getSnapshot().data);
  assert.equal(server.data.activeTrial.currentAnswer, '42');
  assert.equal(first.statuses.at(-1).phase, 'synced');
  assert.deepEqual(server.calls.map(call => call.method), ['GET', 'PUT']);
  assert.ok(server.calls.every(call => call.url === 'https://api.example.test/api/personal-prep'));
  assert.ok([...first.storage.values.keys()].some(key => key.startsWith('quantgym.personal-sync.v1:alice:')));
  await first.cloud.stop();
});

test('a new device loads saved trials and answers without overwriting or uploading empty data', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('first'));
  await first.cloud.sync();
  const second = device(server);
  await second.cloud.sync();
  assert.deepEqual(ids(second.store.getSnapshot().data), ['first']);
  assert.equal(server.revision, 1);
  assert.equal(server.calls.at(-1).method, 'GET');
  await Promise.all([first.cloud.stop(), second.cloud.stop()]);
});

test('offline edits on two devices merge before uploading to the latest revision', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  first.store.update(add('shared'));
  await first.cloud.sync();
  await second.cloud.sync();
  first.store.update(add('from-first'));
  second.store.update(add('from-second'));
  await first.cloud.sync();
  await second.cloud.sync();
  await first.cloud.sync();
  assert.deepEqual(ids(server.data), ['from-first', 'from-second', 'shared']);
  assert.deepEqual(ids(first.store.getSnapshot().data), ids(server.data));
  assert.deepEqual(ids(second.store.getSnapshot().data), ids(server.data));
  await Promise.all([first.cloud.stop(), second.cloud.stop()]);
});

test('a 409 re-fetches and merges the concurrent write instead of replacing it', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('local'));
  server.beforePut = () => {
    server.beforePut = null;
    server.change({ ...createPersonalState(), activities: [activity('racing-device')] });
  };
  await first.cloud.sync();
  assert.deepEqual(server.calls.filter(call => call.method === 'PUT').map(call => call.body.baseRevision), [0, 1]);
  assert.equal(server.revision, 2);
  assert.deepEqual(ids(server.data), ['local', 'racing-device']);
  assert.equal(first.statuses.at(-1).phase, 'synced');
  await first.cloud.stop();
});

test('continuous 409 conflicts stop after three attempts and preserve all local work', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('local'));
  let race = 0;
  server.beforePut = () => server.change({ ...server.data || createPersonalState(), activities: [activity(`race-${++race}`)] });
  await first.cloud.sync();
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 3);
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.ok(ids(first.store.getSnapshot().data).includes('local'));
  await first.cloud.stop();
});

test('typing while GET is in flight participates in the first outgoing snapshot', async () => {
  const server = memoryServer();
  const first = device(server);
  const entered = deferred(), release = deferred();
  server.beforeGet = async () => { entered.resolve(); await release.promise; };
  const syncing = first.cloud.sync();
  await entered.promise;
  first.store.update(add('typed-during-get'));
  release.resolve();
  await syncing;
  assert.deepEqual(ids(server.data), ['typed-during-get']);
  await first.cloud.stop();
});

test('typing while PUT is in flight is preserved and drained to cloud before sync resolves', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('before-request'));
  const entered = deferred(), release = deferred();
  server.afterPut = async () => { server.afterPut = null; entered.resolve(); await release.promise; };
  const syncing = first.cloud.sync();
  await entered.promise;
  first.store.update(add('typed-during-put'));
  release.resolve();
  await syncing;
  assert.deepEqual(ids(first.store.getSnapshot().data), ['before-request', 'typed-during-put']);
  assert.deepEqual(ids(server.data), ['before-request', 'typed-during-put']);
  assert.equal(first.statuses.at(-1).phase, 'synced');
  await first.cloud.stop();
});

test('401 and network failures preserve the durable local copy', async () => {
  for (const fail of ['auth', 'network']) {
    const server = memoryServer();
    const first = device(server, { fetchImpl: async () => {
      if (fail === 'network') throw new TypeError('Failed to fetch');
      return response(401, { error: 'Session expired.' });
    } });
    first.store.update(add(`keep-${fail}`));
    const before = first.store.exportBackup();
    await first.cloud.sync();
    assert.equal(first.statuses.at(-1).phase, fail === 'auth' ? 'auth' : 'error');
    assert.deepEqual(ids(first.store.getSnapshot().data), [`keep-${fail}`]);
    assert.deepEqual(JSON.parse(first.store.exportBackup()).data, JSON.parse(before).data);
    assert.deepEqual(ids(createPersonalStore({ ownerId: 'alice', storage: first.storage }).getSnapshot().data), [`keep-${fail}`]);
    await first.cloud.stop();
  }
});

test('a cloud session for another account never sends a request', async () => {
  const server = memoryServer();
  const first = device(server, { ownerId: 'alice', userId: 'bob' });
  first.store.update(add('private-alice'));
  await first.cloud.start();
  await first.cloud.sync();
  await first.cloud.stop();
  assert.equal(first.cloud.enabled, false);
  assert.equal(server.calls.length, 0);
  assert.equal(first.statuses.at(-1).phase, 'local');
});

test('removed manual activity tombstones survive another device merging stale offline data', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  first.store.update(add('manual-delete-me'));
  await first.cloud.sync();
  await second.cloud.sync();
  first.store.update(state => ({ ...state, activities: [], removedActivityIds: ['manual-delete-me'] }));
  second.store.update(add('offline-new'));
  await first.cloud.sync();
  await second.cloud.sync();
  assert.deepEqual(ids(server.data), ['offline-new']);
  assert.deepEqual(server.data.removedActivityIds, ['manual-delete-me']);
  assert.deepEqual(ids(second.store.getSnapshot().data), ['offline-new']);
  await first.cloud.sync();
  assert.deepEqual(ids(first.store.getSnapshot().data), ['offline-new']);
  await Promise.all([first.cloud.stop(), second.cloud.stop()]);
});

test('fingerprints ignore object key order from Postgres jsonb without ignoring array order', async () => {
  assert.equal(await personalFingerprint({ a: 1, b: { x: 2, y: 3 }, c: [1, 2] }), await personalFingerprint({ c: [1, 2], b: { y: 3, x: 2 }, a: 1 }));
  assert.notEqual(await personalFingerprint({ c: [1, 2] }), await personalFingerprint({ c: [2, 1] }));
});

test('a regressed server revision cannot replace a newer local copy', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('first'));
  await first.cloud.sync();
  first.store.update(add('second'));
  await first.cloud.sync();
  server.replace({ ...createPersonalState(), activities: [activity('first')] }, 1);
  const puts = server.calls.filter(call => call.method === 'PUT').length;
  await first.cloud.sync();
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.deepEqual(ids(first.store.getSnapshot().data), ['first', 'second']);
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, puts);
  await first.cloud.stop();
});

test('stopping during a PUT flushes the last draft before closing the sync controller', async () => {
  const server = memoryServer();
  const first = device(server);
  await first.cloud.start();
  first.store.update(add('before-stop'));
  const entered = deferred(), release = deferred();
  server.afterPut = async () => { server.afterPut = null; entered.resolve(); await release.promise; };
  const syncing = first.cloud.sync();
  await entered.promise;
  first.store.update(add('last-keystroke'));
  const stopped = first.cloud.stop();
  release.resolve();
  await Promise.all([syncing, stopped]);
  assert.deepEqual(ids(server.data), ['before-stop', 'last-keystroke']);
});

test('a cloud failure during PUT leaves an in-progress Daily Mock answer intact', async () => {
  const server = memoryServer();
  const first = device(server, { fetchImpl: async (url, options) => options.method === 'PUT' ? response(503, { error: 'Temporarily unavailable.' }) : server.fetch(url, options) });
  const session = createDailySession({ mentalEnabled: false, techSource: 'practice', techCount: 1, codingCount: 0, behavioralCount: 0 }, { now: iso, id: 'daily-draft' });
  const questionId = session.questions[0].id;
  first.store.update(state => updateDailyAnswer({ ...state, dailySessions: [session] }, session.id, questionId, { text: 'A private interview answer, still being edited.' }));
  await first.cloud.sync();
  assert.equal(first.store.getSnapshot().data.dailySessions[0].answers[questionId].text, 'A private interview answer, still being edited.');
  assert.equal(first.statuses.at(-1).phase, 'error');
  await first.cloud.stop();
});

test('offline Daily Mock edits on different questions survive two-device reconciliation', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  const session = createDailySession({ mentalEnabled: false, techSource: 'practice', techCount: 2, codingCount: 0, behavioralCount: 0 }, { now: iso, id: 'daily-shared' });
  first.store.update(state => ({ ...state, dailySessions: [session] }));
  await first.cloud.sync();
  await second.cloud.sync();
  first.store.update(state => updateDailyAnswer(state, session.id, session.questions[0].id, { text: 'Answer written on device one.' }));
  second.store.update(state => updateDailyAnswer(state, session.id, session.questions[1].id, { text: 'Answer written offline on device two.' }));
  await first.cloud.sync();
  await second.cloud.sync();
  await first.cloud.sync();
  const answers = server.data.dailySessions[0].answers;
  assert.equal(answers[session.questions[0].id].text, 'Answer written on device one.');
  assert.equal(answers[session.questions[1].id].text, 'Answer written offline on device two.');
  assert.deepEqual(first.store.getSnapshot().data.dailySessions[0].answers, answers);
  assert.deepEqual(second.store.getSnapshot().data.dailySessions[0].answers, answers);
});

test('JSONB object key reordering does not cause another cloud write or local replacement', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(state => ({ ...add('keep-order')(state), activeTrial: createTrial({}, { now: Date.parse(iso), id: 'jsonb-trial' }) }));
  await first.cloud.sync();
  const snapshot = first.store.getSnapshot().data;
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])])) : value;
  server.replace(reorder(server.data), server.revision);
  await first.cloud.sync();
  assert.equal(server.revision, 1);
  assert.equal(first.store.getSnapshot().data, snapshot);
  assert.equal(first.statuses.at(-1).phase, 'synced');
});

test('malformed cloud data and invalid revisions never replace valid local work', async () => {
  for (const payload of [
    { version: 1, revision: 1, data: {} },
    { version: 1, revision: -1, data: createPersonalState() },
    { version: 2, revision: 1, data: createPersonalState() },
    { version: 1, revision: 1 },
  ]) {
    const first = device(memoryServer(), { fetchImpl: async () => response(200, payload) });
    first.store.update(add('preserve-valid-data'));
    const before = first.store.getSnapshot().data;
    await first.cloud.sync();
    assert.equal(first.store.getSnapshot().data, before);
    assert.equal(first.statuses.at(-1).phase, 'error');
  }
});

test('a read-corrupted local store blocks uploads instead of replacing cloud data with empty state', async () => {
  const server = memoryServer({ ...createPersonalState(), activities: [activity('cloud-safe')] }, 1);
  const storage = memoryStorage();
  storage.setItem('quantgym.personal-prep.v1:alice', '{broken');
  const first = device(server, { storage });
  await first.cloud.sync();
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 0);
  assert.deepEqual(ids(server.data), ['cloud-safe']);
  assert.equal(storage.getItem('quantgym.personal-prep.v1:alice'), '{broken');
});

test('live work can reach cloud when local storage quota fails without deleting the durable local copy', async () => {
  const server = memoryServer();
  const first = device(server);
  first.store.update(add('durable'));
  const durable = first.storage.getItem('quantgym.personal-prep.v1:alice');
  first.storage.setItem = () => { throw new Error('QuotaExceededError'); };
  first.store.update(add('in-memory'));
  assert.equal(first.store.getSnapshot().dirty, true);
  await first.cloud.sync();
  assert.deepEqual(ids(server.data), ['durable', 'in-memory']);
  assert.equal(first.storage.getItem('quantgym.personal-prep.v1:alice'), durable);
  assert.equal(first.store.getSnapshot().dirty, true);
});

test('stopping an idle controller does not trigger a redundant request', async () => {
  const server = memoryServer();
  const first = device(server);
  await first.cloud.start();
  const calls = server.calls.length;
  await first.cloud.stop();
  await first.cloud.sync();
  assert.equal(server.calls.length, calls);
});

const reasoningAt = Date.parse(iso);
function cloudReasoning(trainer, id) {
  return createReasoningTrial({ trainer, durationSeconds: 30, difficulty: 'medium', ...(trainer === 'sequence' ? { sequenceType: 'mixed' } : {}) },
    { now: reasoningAt, id, rng: () => 0.3, preparationSeconds: 0 });
}
function completedReasoning(trainer, id) {
  let trial = cloudReasoning(trainer, id);
  trial = transitionReasoningTrial(trial, { type: 'submit', value: trial.currentQuestion.answer }, reasoningAt + 1000);
  return transitionReasoningTrial(trial, { type: 'tick' }, reasoningAt + 30000);
}

test('new modules use the existing private cloud envelope and retain feedback when a second device reconnects', async () => {
  const server = memoryServer();
  const first = device(server);
  const pattern = cloudReasoning('pattern', 'private-pattern-feedback');
  const feedback = transitionReasoningTrial(pattern, { type: 'submit', value: pattern.currentQuestion.answer }, reasoningAt + 1000);
  first.store.update(state => ({ ...persistReasoningTransition(state, completedReasoning('sequence', 'private-sequence-history')), activeTrial: feedback }));
  await first.cloud.sync();
  assert.equal(server.data.activeTrial.currentQuestion, null);
  assert.equal(server.data.activeTrial.feedbackQuestionId, feedback.questions[0].id);
  assert.equal(server.data.trials[0].settings.trainer, 'sequence');
  assert.equal(server.data.activities[0].kind, 'sequence');
  const second = device(server);
  await second.cloud.sync();
  assert.deepEqual(second.store.getSnapshot().data.activeTrial, feedback);
  assert.equal(second.statuses.at(-1).phase, 'synced');
  assert.equal(server.revision, 1);
  assert.deepEqual(Object.keys(server.calls.find(call => call.method === 'PUT').body).sort(), ['baseRevision', 'data', 'version']);
});

test('offline sequence and pattern completions merge through cloud with distinct calendar events', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  first.store.update(state => persistReasoningTransition(state, completedReasoning('sequence', 'sequence-device-one')));
  second.store.update(state => persistReasoningTransition(state, completedReasoning('pattern', 'pattern-device-two')));
  await first.cloud.sync();
  await second.cloud.sync();
  await first.cloud.sync();
  assert.deepEqual(server.data.trials.map(trial => trial.settings.trainer).sort(), ['pattern', 'sequence']);
  assert.deepEqual(ids(server.data), ['pattern:pattern-device-two', 'sequence:sequence-device-one']);
  assert.deepEqual(second.store.getSnapshot().data.trials, first.store.getSnapshot().data.trials);
  assert.ok(server.data.activities.every(entry => entry.kind !== 'mental'));
});

test('new-module active conflicts do not replace either device or cloud record', async () => {
  const remote = cloudReasoning('pattern', 'cloud-active-pattern');
  const server = memoryServer({ ...createPersonalState(), activeTrial: remote }, 1);
  const first = device(server);
  const local = cloudReasoning('sequence', 'local-active-sequence');
  first.store.update(state => ({ ...state, activeTrial: local }));
  await first.cloud.sync();
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.deepEqual(first.store.getSnapshot().data.activeTrial, local);
  assert.deepEqual(server.data.activeTrial, remote);
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 0);
});

test('sync metadata cannot bypass a new-module active conflict when local data has not changed', async () => {
  const server = memoryServer();
  const first = device(server);
  const local = cloudReasoning('sequence', 'previously-synced-active');
  first.store.update(state => ({ ...state, activeTrial: local }));
  await first.cloud.sync();
  const remote = cloudReasoning('pattern', 'another-device-active');
  server.change({ ...server.data, activeTrial: remote });
  const puts = server.calls.filter(call => call.method === 'PUT').length;
  await first.cloud.sync();
  assert.equal(first.statuses.at(-1).phase, 'error');
  assert.deepEqual(first.store.getSnapshot().data.activeTrial, local);
  assert.deepEqual(server.data.activeTrial, remote);
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, puts);
});

test('canceling preparation uploads the cleared slot and another synced device does not revive it', async () => {
  for (const trainer of ['sequence', 'pattern']) {
    const server = memoryServer();
    const first = device(server), second = device(server);
    const preparing = createReasoningTrial({ trainer, durationSeconds: 30, difficulty: 'easy', ...(trainer === 'sequence' ? { sequenceType: 'numbers' } : {}) },
      { id: `cancel-${trainer}`, now: reasoningAt, preparationSeconds: 5, rng: () => 0.2 });
    first.store.update(state => ({ ...state, activeTrial: preparing }));
    await first.cloud.sync();
    await second.cloud.sync();
    first.store.update(state => cancelTrialPreparation(state, preparing.id, reasoningAt + 1000));
    await first.cloud.sync();
    assert.equal(server.data.activeTrial, null);
    assert.equal(server.data.trials.length, 0);
    assert.equal(server.data.activities.length, 0);
    await second.cloud.sync();
    assert.equal(second.store.getSnapshot().data.activeTrial, null);
    assert.equal(second.statuses.at(-1).phase, 'synced');
    assert.equal(server.data.activeTrial, null);
    assert.equal(server.revision, 2);
  }
});

test('offline preparation cancellation survives unrelated edits on both devices and later stale backups', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  const preparing = createReasoningTrial({ trainer: 'sequence', durationSeconds: 30, difficulty: 'easy', sequenceType: 'numbers' },
    { id: 'offline-preparation-cancel', now: reasoningAt, preparationSeconds: 5, rng: () => 0.2 });
  first.store.update(state => ({ ...state, activeTrial: preparing }));
  await first.cloud.sync();
  await second.cloud.sync();
  const staleBackup = second.store.exportBackup();
  first.store.update(state => add('local-offline-work')(cancelTrialPreparation(state, preparing.id, reasoningAt + 1000)));
  second.store.update(add('remote-offline-work'));
  await second.cloud.sync();
  await first.cloud.sync();
  await second.cloud.sync();
  assert.equal(server.data.activeTrial, null);
  assert.equal(first.store.getSnapshot().data.activeTrial, null);
  assert.equal(second.store.getSnapshot().data.activeTrial, null);
  assert.deepEqual(ids(server.data), ['local-offline-work', 'remote-offline-work']);
  assert.ok(server.data.removedActivityIds.includes('cancel-preparation:offline-preparation-cancel'));
  second.store.restoreBackup(staleBackup);
  assert.equal(second.store.getSnapshot().data.activeTrial, null);
  assert.equal(second.store.getSnapshot().data.trials.length, 0);
});
