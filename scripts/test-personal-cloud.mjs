import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalCloudSync, personalFingerprint } from '../src/features/personal/personalCloud.js';
import { createPersonalStore, createPersonalState } from '../src/features/personal/personalStore.js';
import { createTrial, transitionTrial, persistTrialTransition } from '../src/features/personal/mental/mentalEngine.js';
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
      data = clone(request.body.data);
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

test('two different active trials pause cloud sync without overwriting either device, then merge after finishing', async () => {
  const server = memoryServer();
  const first = device(server), second = device(server);
  const start = Date.parse(iso);
  for (const [index, current] of [first, second].entries()) {
    let trial = createTrial({ durationSeconds: 10 }, { id: `device-${index}`, now: start + index, rng: () => 0 });
    trial = transitionTrial(trial, { type: 'input', value: String(trial.currentQuestion.answer) }, start + 1000, () => 0);
    trial = transitionTrial(trial, { type: 'submit', value: '999' }, start + 2000);
    current.store.update(state => ({ ...state, activeTrial: trial }));
  }
  await first.cloud.sync();
  const remoteBefore = server.data, localBefore = clone(second.store.getSnapshot().data);
  await second.cloud.sync();
  assert.equal(second.statuses.at(-1).phase, 'training-conflict');
  assert.equal(second.statuses.at(-1).code, 'active_training_conflict');
  assert.deepEqual(server.data, remoteBefore);
  assert.deepEqual(second.store.getSnapshot().data, localBefore);
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 1);
  assert.deepEqual(JSON.parse(second.store.exportBackup()).data, localBefore);
  for (const current of [first, second]) current.store.update(state => persistTrialTransition(state, transitionTrial(state.activeTrial, { type: 'tick' }, start + 11000)));
  await first.cloud.sync();
  await second.cloud.sync();
  await first.cloud.sync();
  assert.equal(server.data.activeTrial, null);
  assert.equal(server.data.trials.length, 2);
  assert.ok(server.data.trials.every(trial => trial.correct === 1 && trial.questions.at(-1).submittedAnswer === '999'));
  assert.deepEqual(first.store.getSnapshot().data, server.data);
  assert.deepEqual(second.store.getSnapshot().data, server.data);
});

test('an unchanged synced active trial still rejects a stale lower-score cloud completion', async () => {
  const start = Date.parse(iso);
  const original = createTrial({ durationSeconds: 10 }, { id: 'shared-foreground', now: start, rng: () => 0 });
  const answered = transitionTrial(original, { type: 'input', value: String(original.currentQuestion.answer) }, start + 1000, () => 0);
  const server = memoryServer();
  const current = device(server);
  current.store.update(state => ({ ...state, activeTrial: answered }));
  await current.cloud.sync();
  server.change(persistTrialTransition(createPersonalState(), transitionTrial(original, { type: 'tick' }, start + 10000)));
  const remoteBefore = server.data;
  await current.cloud.sync();
  assert.equal(current.statuses.at(-1).phase, 'training-conflict');
  assert.equal(current.store.getSnapshot().data.activeTrial.correct, 1);
  assert.deepEqual(server.data, remoteBefore);
  assert.equal(server.calls.filter(call => call.method === 'PUT').length, 1);
  current.store.update(state => persistTrialTransition(state, transitionTrial(answered, { type: 'tick' }, start + 10000)));
  await current.cloud.sync();
  assert.equal(current.statuses.at(-1).phase, 'synced');
  assert.equal(server.data.trials[0].correct, 1);
  assert.equal(server.data.activities[0].count, 1);
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
