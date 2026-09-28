import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createPersonalState, createPersonalStore, mergePersonalData, personalStorageKey,
} from '../src/features/personal/personalStore.js';
import { createPersonalCloudSync, personalFingerprint } from '../src/features/personal/personalCloud.js';
import { createTrial, persistTrialTransition, transitionTrial } from '../src/features/personal/mental/mentalEngine.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const ownerId = 'mental-edit-fixture';
const endpoint = 'https://mental-edit.example.test/api';
const iso = '2026-09-28T12:00:00.000Z';
const start = Date.parse(iso);
const clone = value => structuredClone(value);
const clouds = new Set();
afterEach(async () => {
  await Promise.all([...clouds].map(cloud => cloud.stop()));
  clouds.clear();
});

function memoryStorage() {
  const values = new Map();
  let writes = 0;
  return {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, value); writes += 1; },
    get writes() { return writes; },
  };
}

function memoryEvents() {
  const handlers = new Map();
  return {
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(handler);
    },
    removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
    dispatch(type, event) { for (const handler of handlers.get(type) || []) handler(event); },
  };
}

function trialState(draft = '1', id = 'edited-trial') {
  const trial = createTrial({ durationSeconds: 120, operations: ['add'],
    ranges: { add: { minA: 2, maxA: 2, minB: 10, maxB: 12 } } },
  { now: start, id, rng: () => 0 });
  return { ...createPersonalState(), activeTrial: { ...trial, currentAnswer: draft } };
}

const activity = id => ({ id, kind: 'quant', count: 1, completedAt: iso });
const trackerOp = id => ({ id, clock: 1, kind: 'application', applicationId: 'fixture-application', fields: { company: id } });
const dataOf = store => store.getSnapshot().data;

function editor(initial = trialState(), storage = memoryStorage()) {
  const events = memoryEvents();
  const store = createPersonalStore({ ownerId, storage, eventTarget: events, now: () => iso });
  assert.equal(store.update(() => clone(initial)).ok, true);
  const unsubscribe = store.subscribe(() => {});
  const release = store.beginTrialEdit(initial.activeTrial.id);
  return { store, storage, events, release, unsubscribe };
}

function writeFromOtherTab(storage, data) {
  const other = createPersonalStore({ ownerId, storage, now: () => iso });
  assert.equal(other.update(() => clone(data)).ok, true);
}

function storageEvent(target) {
  target.events.dispatch('storage', { key: personalStorageKey(ownerId) });
}

function input(store, value, questionId = dataOf(store).activeTrial.currentQuestion.id, at = start + 100) {
  return store.update(state => persistTrialTransition(state,
    transitionTrial(state.activeTrial, { type: 'input', value, questionId }, at, () => 0)));
}

test('a storage event retains the live trial while accepting other preparation records without echoing storage', () => {
  const fixture = editor();
  const localTrial = clone(dataOf(fixture.store).activeTrial);
  const remote = { ...trialState(''), activities: [activity('other-tab-quant')],
    behavioralAnswers: [{ id: 'other-tab-answer', text: 'Retained answer', updatedAt: iso }],
    careerTrackerOperations: [trackerOp('other-tab-tracker')] };
  writeFromOtherTab(fixture.storage, remote);
  const raw = fixture.storage.getItem(personalStorageKey(ownerId));
  const writes = fixture.storage.writes;
  storageEvent(fixture);
  storageEvent(fixture);
  assert.deepEqual(dataOf(fixture.store).activeTrial, localTrial);
  assert.deepEqual(dataOf(fixture.store).activities, remote.activities);
  assert.deepEqual(dataOf(fixture.store).behavioralAnswers, remote.behavioralAnswers);
  assert.deepEqual(dataOf(fixture.store).careerTrackerOperations, remote.careerTrackerOperations);
  assert.equal(fixture.storage.writes, writes, 'an event must not bounce a protected draft back to another editor');
  assert.equal(fixture.storage.getItem(personalStorageKey(ownerId)), raw);
  assert.equal(fixture.store.getSnapshot().dirty, false);
  fixture.release();
  fixture.unsubscribe();
});

test('two pages editing the same trial keep their own drafts when the shared storage key changes', () => {
  const first = editor();
  const second = editor(trialState('8'), first.storage);
  storageEvent(first);
  assert.equal(dataOf(first.store).activeTrial.currentAnswer, '1');
  assert.equal(dataOf(second.store).activeTrial.currentAnswer, '8');
  input(first.store, '11');
  const writes = first.storage.writes;
  storageEvent(second);
  assert.equal(dataOf(second.store).activeTrial.currentAnswer, '8');
  assert.equal(first.storage.writes, writes);
  first.release(); second.release();
  first.unsubscribe(); second.unsubscribe();
});

test('leaving or returning to the editor checkpoints a protected draft once and keeps newer unrelated records', () => {
  for (const receivedEvent of [true, false]) for (const event of ['pagehide', 'beforeunload', 'blur', 'focus', 'release']) {
    const fixture = editor();
    writeFromOtherTab(fixture.storage, trialState(''));
    if (receivedEvent) storageEvent(fixture);
    // Another write can land before its storage event reaches this page.
    writeFromOtherTab(fixture.storage, { ...trialState(''), activities: [activity('newer-record')] });
    const writes = fixture.storage.writes;
    if (event === 'release') fixture.release();
    else fixture.events.dispatch(event);
    const restored = createPersonalStore({ ownerId, storage: fixture.storage });
    assert.equal(dataOf(restored).activeTrial.currentAnswer, '1', event);
    assert.equal(dataOf(restored).activities[0].id, 'newer-record', event);
    assert.equal(fixture.storage.writes, writes + 1, event);
    fixture.events.dispatch(event);
    fixture.release();
    assert.equal(fixture.storage.writes, writes + 1, 'unchanged boundaries must not write again');
    fixture.unsubscribe();
  }
});

test('reading another tab before an input update cannot move the question or silently reject the captured input', () => {
  const fixture = editor();
  const originalQuestionId = dataOf(fixture.store).activeTrial.currentQuestion.id;
  const remote = trialState();
  remote.activeTrial = transitionTrial(remote.activeTrial,
    { type: 'input', value: '12', questionId: originalQuestionId }, start + 100, () => 0);
  remote.activities = [activity('raw-storage-record')];
  writeFromOtherTab(fixture.storage, remote);
  // No storage event: update itself must reconcile the changed durable copy.
  assert.equal(input(fixture.store, '11', originalQuestionId, start + 200).ok, true);
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, originalQuestionId);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '11');
  assert.equal(dataOf(fixture.store).activeTrial.correct, 0);
  assert.equal(dataOf(fixture.store).activities[0].id, 'raw-storage-record');
  fixture.release(); fixture.unsubscribe();
});

test('a deliberate answer clear survives a storage event and a cloud merge containing the previous nonempty draft', () => {
  const fixture = editor();
  const previous = clone(dataOf(fixture.store));
  assert.equal(input(fixture.store, '').ok, true);
  writeFromOtherTab(fixture.storage, previous);
  storageEvent(fixture);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '');
  assert.equal(fixture.store.mergeFromCloud(previous).ok, true);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '');
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, 'q1');
  assert.equal(dataOf(fixture.store).activeTrial.correct, 0);
  fixture.release(); fixture.unsubscribe();
});

test('external nonempty drafts and extra mistakes do not replace the current page draft', () => {
  const fixture = editor();
  const expected = clone(dataOf(fixture.store).activeTrial);
  const remote = trialState('999999');
  remote.activeTrial = transitionTrial(remote.activeTrial,
    { type: 'submit', value: '999999', questionId: 'q1' }, start + 200, () => 0);
  assert.equal(mergePersonalData(dataOf(fixture.store), remote).activeTrial.currentAnswer, '999999',
    'this fixture exercises a merge that would otherwise select the remote trial');
  assert.equal(fixture.store.mergeFromCloud(remote).ok, true);
  assert.deepEqual(dataOf(fixture.store).activeTrial, expected);
  fixture.release(); fixture.unsubscribe();
});

test('external completion cannot close an edited trial or add its terminal activity, while unrelated history still merges', () => {
  const fixture = editor();
  const expected = clone(dataOf(fixture.store).activeTrial);
  const finished = transitionTrial(expected, { type: 'tick' }, start + 120000, () => 0);
  let remote = persistTrialTransition(trialState(), finished);
  const other = transitionTrial(trialState('', 'other-trial').activeTrial,
    { type: 'abort' }, start + 500, () => 0);
  remote = { ...remote, trials: [...remote.trials, other],
    activities: [...remote.activities, { id: `mental:${other.id}`, kind: 'mental', count: 0,
      trialId: other.id, completedAt: other.completedAt }, activity('unrelated-history')] };
  assert.equal(fixture.store.mergeFromCloud(remote).ok, true);
  assert.deepEqual(dataOf(fixture.store).activeTrial, expected);
  assert.deepEqual(dataOf(fixture.store).trials.map(row => row.id), ['other-trial']);
  assert.equal(dataOf(fixture.store).activities.some(row => row.trialId === expected.id || row.id === `mental:${expected.id}`), false);
  assert.equal(dataOf(fixture.store).activities.some(row => row.id === 'mental:other-trial'), true);
  assert.equal(dataOf(fixture.store).activities.some(row => row.id === 'unrelated-history'), true);
  fixture.release(); fixture.unsubscribe();
});

test('only local answer events advance the live question and delayed events for its predecessor cannot duplicate the score', () => {
  const fixture = editor();
  const stale = clone(dataOf(fixture.store));
  input(fixture.store, '12', 'q1', start + 100);
  assert.equal(dataOf(fixture.store).activeTrial.correct, 1);
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, 'q2');
  assert.equal(fixture.store.applyExternal(() => stale).ok, true);
  for (const type of ['input', 'submit', 'skip']) {
    fixture.store.update(state => persistTrialTransition(state,
      transitionTrial(state.activeTrial, { type, questionId: 'q1', value: '13' }, start + 200, () => 0)));
  }
  assert.equal(dataOf(fixture.store).activeTrial.correct, 1);
  assert.equal(dataOf(fixture.store).activeTrial.questions.length, 1);
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, 'q2');
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '');
  input(fixture.store, '13', 'q2', start + 300);
  assert.equal(dataOf(fixture.store).activeTrial.correct, 2);
  assert.equal(dataOf(fixture.store).activeTrial.questions.length, 2);
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, 'q3');
  fixture.release(); fixture.unsubscribe();
});

test('local completion is allowed while editing and an older external active snapshot cannot revive it', () => {
  const fixture = editor();
  const stale = clone(dataOf(fixture.store));
  fixture.store.update(state => persistTrialTransition(state,
    transitionTrial(state.activeTrial, { type: 'tick' }, start + 120000, () => 0)));
  assert.equal(dataOf(fixture.store).activeTrial, null);
  assert.equal(dataOf(fixture.store).trials.length, 1);
  assert.equal(fixture.store.mergeFromCloud(stale).ok, true);
  assert.equal(dataOf(fixture.store).activeTrial, null);
  assert.equal(dataOf(fixture.store).trials.length, 1);
  assert.equal(dataOf(fixture.store).activities.filter(row => row.id === 'mental:edited-trial').length, 1);
  fixture.release(); fixture.unsubscribe();
});

test('editing remains protected until the final owner releases, then external updates are accepted normally', () => {
  const fixture = editor();
  const releaseSecond = fixture.store.beginTrialEdit('edited-trial');
  fixture.release();
  fixture.release();
  const remote = trialState('9');
  fixture.store.applyExternal(() => remote);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '1');
  releaseSecond();
  fixture.store.applyExternal(() => remote);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '9');
  writeFromOtherTab(fixture.storage, trialState('7'));
  storageEvent(fixture);
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '7');
  fixture.unsubscribe();
});

const response = payload => new Response(JSON.stringify(payload), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

function memoryServer(initial = null, initialRevision = 0) {
  let data = clone(initial), revision = initialRevision;
  const calls = [];
  const server = {
    calls,
    transformNextPut: null,
    afterNextPut: null,
    get data() { return clone(data); },
    get revision() { return revision; },
    change(next) { data = clone(next); revision += 1; },
    async fetch(url, options) {
      assert.equal(url, `${endpoint}/personal-prep`);
      calls.push(options.method);
      assert.ok(calls.length <= 12, 'the fixture must converge instead of retrying a permanently stale acknowledgement');
      if (options.method === 'PUT') {
        const body = JSON.parse(options.body);
        assert.equal(body.baseRevision, revision);
        assert.equal(body.version, 1);
        const transform = server.transformNextPut;
        server.transformNextPut = null;
        data = clone(transform ? transform(body.data) : body.data);
        revision += 1;
      }
      const saved = { version: 1, revision, data: clone(data), updatedAt: data === null ? null : iso };
      if (options.method === 'PUT') {
        const afterPut = server.afterNextPut;
        server.afterNextPut = null;
        await afterPut?.();
      }
      return response(saved);
    },
  };
  return server;
}

async function cloudEditor(server, initial = trialState(), knownBaseline = false) {
  const fixture = editor(initial);
  if (knownBaseline) {
    fixture.storage.setItem(`quantgym.personal-sync.v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(endpoint)}`,
      JSON.stringify({ fingerprint: await personalFingerprint(initial), revision: server.revision, syncedAt: iso }));
  }
  const statuses = [];
  const cloud = createPersonalCloudSync({ store: fixture.store, ownerId, storage: fixture.storage,
    config: { endpoint, token: 'fixture-only-token', userId: ownerId },
    fetchImpl: server.fetch.bind(server), onStatus: status => statuses.push(status), debounceMs: 60000 });
  clouds.add(cloud);
  return { ...fixture, cloud, statuses };
}

test('a known-local-fingerprint GET cannot retract the active draft but uploads the protected trial with other downloaded records', async () => {
  const initial = trialState();
  const server = memoryServer(initial, 1);
  const fixture = await cloudEditor(server, initial, true);
  server.change({ ...trialState(''), activities: [activity('downloaded-quant')],
    careerTrackerOperations: [trackerOp('downloaded-tracker')] });
  await fixture.cloud.sync();
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '1');
  assert.equal(server.data.activeTrial.currentAnswer, '1');
  assert.equal(dataOf(fixture.store).activities[0].id, 'downloaded-quant');
  assert.deepEqual(dataOf(fixture.store).careerTrackerOperations, [trackerOp('downloaded-tracker')]);
  assert.deepEqual(server.calls, ['GET', 'PUT']);
  assert.equal(fixture.statuses.at(-1).phase, 'synced');
  fixture.release(); fixture.unsubscribe();
});

test('an unchanged local snapshot ignores a stale PUT acknowledgement draft and retains server-added records', async () => {
  const server = memoryServer();
  const fixture = await cloudEditor(server);
  server.transformNextPut = outgoing => ({ ...outgoing,
    activeTrial: { ...outgoing.activeTrial, currentAnswer: '' },
    activities: [...outgoing.activities, activity('acknowledged-record')] });
  await fixture.cloud.sync();
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '1');
  assert.equal(server.data.activeTrial.currentAnswer, '1');
  assert.equal(dataOf(fixture.store).activeTrial.currentQuestion.id, 'q1');
  assert.equal(dataOf(fixture.store).activities[0].id, 'acknowledged-record');
  assert.deepEqual(server.calls, ['GET', 'PUT', 'GET', 'PUT']);
  assert.equal(fixture.statuses.at(-1).phase, 'synced');
  fixture.release(); fixture.unsubscribe();
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('clearing an answer while PUT is in flight survives its acknowledgement and is uploaded exactly once more', async () => {
  const server = memoryServer();
  const fixture = await cloudEditor(server);
  const entered = deferred(), resume = deferred();
  server.afterNextPut = async () => { entered.resolve(); await resume.promise; };
  const syncing = fixture.cloud.sync();
  await entered.promise;
  assert.equal(input(fixture.store, '').ok, true);
  resume.resolve();
  await syncing;
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '');
  assert.equal(server.data.activeTrial.currentAnswer, '');
  assert.equal(dataOf(fixture.store).activeTrial.correct, 0);
  assert.equal(dataOf(fixture.store).activeTrial.questions.length, 0);
  assert.deepEqual(server.calls, ['GET', 'PUT', 'GET', 'PUT']);
  assert.equal(fixture.statuses.at(-1).phase, 'synced');
  fixture.release(); fixture.unsubscribe();
});

test('a known-fingerprint cloud download accepts another device draft after the editor releases ownership', async () => {
  const initial = trialState();
  const server = memoryServer(initial, 1);
  const fixture = await cloudEditor(server, initial, true);
  fixture.release();
  server.change(trialState('9'));
  await fixture.cloud.sync();
  assert.equal(dataOf(fixture.store).activeTrial.currentAnswer, '9');
  assert.deepEqual(server.calls, ['GET']);
  assert.equal(fixture.statuses.at(-1).phase, 'synced');
  fixture.unsubscribe();
});
