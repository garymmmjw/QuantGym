import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createAppStore } from '../src/state/appStore.js';
import { createAuthStore } from '../src/state/authStore.js';
import { membershipConnection } from '../src/features/membership/membershipApi.js';
import { createLearningStateApi } from '../src/features/learning/learningStateApi.mjs';
import { createLearningCloudSync } from '../src/features/learning/learningCloudSync.mjs';
import { createTrainingProfile, buildTrainingReport, submitTrainingAttempt } from '../src/features/learning/scoring/training-system.mjs';
import { normalizeProgress, completeLocalLesson } from '../src/features/learning/lessonProgress.mjs';
import { learningStorageKey } from '../src/features/learning/learningStore.mjs';

const now = Date.UTC(2026, 9, 16);
const endpoint = 'https://learning-hook.example.invalid/api';
const sources = {
  library: { lessons: [{ id: 'lec-probability-one' }, { id: 'lec-probability-two' }] },
  problemsIndex: [{ id: 900, di: 14, c: 'expectation', d: 'medium', t: 'Three rolls', tg: [], co: [] }],
  difficultyV1: { b: { 14: -0.1 } }, difficultyV2: { _meta: { hintCredit: 0.6 }, b: { 14: -0.2 }, c: {} },
  modules: { roleOrder: {}, modules: [{ id: 'expectation', title: 'Expectation', problems: [{ id: 900, di: 14 }] }] },
  downloadedProblemIds: [900], records: [],
};
const problem = { id: 'quantvault-14', source: 'quantvault', quantvault: { id: 900, displayId: 14 } };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = value => structuredClone(value);
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), values };
}
function dataFor(owner, { lessons = 0, answer = false } = {}) {
  let learn = normalizeProgress(), training = createTrainingProfile({ now, id: `cloud-${owner}` });
  for (const lesson of sources.library.lessons.slice(0, lessons)) learn = completeLocalLesson(learn, lesson.id, 0, now).progress;
  if (answer) training = submitTrainingAttempt(training, { problemId: 900, eventId: `${owner}-answer`, x: 1, now }, sources).profile;
  return { learn, training };
}
function server(records = {}) {
  const users = new Map(Object.entries(records).map(([userId, data]) => [userId, { version: 1, revision: 1, updatedAt: new Date(now).toISOString(), data: clone(data) }]));
  const calls = [], tokens = new Map();
  const api = { calls, users, tokens, beforeGet: null, beforePut: null,
    set(userId, data) {
      const previous = users.get(userId);
      users.set(userId, { version: 1, revision: (previous?.revision || 0) + 1, updatedAt: new Date(now + 1).toISOString(), data: clone(data) });
    },
    async fetch(url, options) {
      assert.equal(url, `${endpoint}/learning/state`);
      assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit');
      const userId = tokens.get(options.headers.Authorization);
      const call = { userId, ...options, body: options.body ? JSON.parse(options.body) : null };
      calls.push(call);
      const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (!userId) return response(401, { error: 'expired' });
      const read = () => clone(users.get(userId) || { version: 1, revision: 0, updatedAt: null, data: null });
      if (options.method === 'GET') { await api.beforeGet?.(call); return response(200, read()); }
      await api.beforePut?.(call);
      const current = read();
      if (call.body.baseRevision !== current.revision) return response(409, { ...current, error: 'Changed elsewhere' });
      const next = { version: 1, revision: current.revision + 1, updatedAt: new Date(now + 1).toISOString(), data: clone(call.body.data) };
      users.set(userId, next); return response(200, next);
    },
  };
  return api;
}

/** Execute the actual hook against real app/auth stores, cloud coordinator,
 * transport and domain model. Only React's scheduling and the HTTP boundary are
 * controlled; no invented application service or fake cloud controller exists. */
function harness(api, { owner = 'alice', token = `${owner}-token`, storage = memory() } = {}) {
  const appStore = createAppStore({ cloudConfig: { userId: owner, token, endpoint } });
  const authStore = createAuthStore({ currentUser: { id: owner } });
  const services = { stores: { appStore, authStore } };
  api.tokens.set(`Bearer ${token}`, owner);
  const slots = [], effects = [], transports = [], windowListeners = new Map(), documentListeners = new Map();
  let cursor = 0, dirty = true, result, closed = false;
  const equal = (first, second) => first && second && first.length === second.length && first.every((item, i) => Object.is(item, second[i]));
  const surface = listeners => ({
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
  });
  const document = { ...surface(documentListeners), visibilityState: 'visible' };
  const context = vm.createContext({ AbortController, Date, document, window: surface(windowListeners), membershipConnection, buildTrainingReport,
    useAppServicesContext: () => services,
    useAuthStore: selector => selector(authStore.getState()),
    useAppStore: selector => selector(appStore.getState()),
    useRef(value) { const index = cursor++; return slots[index] ||= { current: value }; },
    useState(value) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value };
      return [slots[index].value, next => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next; dirty = true; }];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!slots[index] || !equal(slots[index].dependencies, dependencies)) slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || !equal(slots[index].dependencies, dependencies)) {
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
    createLearningStateApi: options => { transports.push(options); return createLearningStateApi({ ...options, fetchImpl: api.fetch }); },
    createLearningCloudSync: options => createLearningCloudSync({ ...options, storage, now: () => now + 100 }),
  });
  const runnable = readFileSync(new URL('../src/features/learning/useLearningState.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function useLearningState', 'function useLearningState');
  vm.runInContext(runnable, context);
  const render = () => {
    if (closed) return result;
    cursor = 0; dirty = false;
    result = context.useLearningState(sources);
    while (effects.length) effects.shift()();
    return result;
  };
  const waitFor = async predicate => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (dirty) render();
      if (predicate(result)) return result;
      await tick();
    }
    assert.fail(`Hook did not reach expected state: ${JSON.stringify({ userId: result.userId, error: result.error, syncing: result.syncing, hasProfile: !!result.profile })}`);
  };
  render();
  return {
    services, storage, render, waitFor, document, transports,
    get result() { if (dirty) render(); return result; },
    async ready() { return waitFor(value => Boolean(value.profile) && !value.syncing); },
    changeSession(userId, nextToken = `${userId}-token`) {
      if (userId) api.tokens.set(`Bearer ${nextToken}`, userId);
      appStore.actions.setCloudConfig({ userId: userId || '', token: userId ? nextToken : '' });
      authStore.actions.setCurrentUser(userId ? { id: userId } : null);
      return render();
    },
    dispatchWindow(type) { for (const listener of windowListeners.get(type) || []) listener(); },
    close() { if (closed) return; closed = true; for (const slot of slots) slot?.cleanup?.(); },
  };
}

test('first hydration hides the empty browser profile and restores the actual cloud report', async () => {
  const api = server({ alice: dataFor('alice', { lessons: 1, answer: true }) });
  const blocked = deferred(), started = deferred();
  api.beforeGet = async () => { started.resolve(); await blocked.promise; };
  const h = harness(api);
  try {
    await started.promise;
    assert.equal(h.result.profile, null); assert.equal(h.result.learnProgress, null); assert.equal(h.result.syncing, true);
    await assert.rejects(h.result.submitAttempt(problem, { eventId: 'premature', x: 1 }), /载入/);
    blocked.resolve(); await h.ready();
    assert.equal(h.result.profile.id, 'cloud-alice'); assert.equal(h.result.learnProgress.xp, 20);
    assert.equal(h.result.report.problemXp, 25); assert.equal(h.result.report.totalXp, 45);
    assert.equal(api.calls.filter(call => call.method === 'PUT').length, 0, 'An empty new browser does not replace a populated account');
    assert.equal(JSON.parse(h.storage.getItem(learningStorageKey('alice'))).xp, 20);
  } finally { blocked.resolve(); h.close(); }
});

test('manual refresh and focus read newer cloud revisions after initialization', async () => {
  const api = server({ alice: dataFor('alice') }), h = harness(api);
  try {
    await h.ready();
    const reads = api.calls.length;
    api.set('alice', dataFor('alice', { lessons: 1 }));
    await h.result.refresh(); await h.ready();
    assert.equal(h.result.learnProgress.xp, 20); assert.ok(api.calls.length > reads);
    api.set('alice', dataFor('alice', { lessons: 2 }));
    h.dispatchWindow('focus');
    await h.waitFor(value => value.learnProgress?.xp === 40 && !value.syncing);
    assert.equal(h.result.report.learnCompleted, 2);
  } finally { h.close(); }
});

test('answer submission stays pending until actual API acknowledgement and a second browser restores it', async () => {
  const api = server({ alice: dataFor('alice') }), h = harness(api);
  let second;
  const blocked = deferred(), started = deferred();
  try {
    await h.ready();
    api.beforePut = async () => { started.resolve(); await blocked.promise; };
    let settled = false;
    const submission = h.result.submitAttempt(problem, { eventId: 'independent-browser-answer', x: 1, h: true }).then(result => { settled = true; return result; });
    await started.promise;
    assert.equal(h.result.syncing, true); assert.equal(settled, false);
    assert.equal(h.result.profile.events.length, 0); assert.equal(api.users.get('alice').data.training.events.length, 0);
    blocked.resolve(); const result = await submission; await h.ready();
    assert.equal(result.deltaXp, 25); assert.equal(h.result.report.problemXp, 25);
    second = harness(api, { token: 'alice-second-browser' }); await second.ready();
    assert.equal(second.result.profile.events.length, 1); assert.equal(second.result.profile.events[0].h, true);
    assert.equal(second.result.report.problemXp, 25);
    assert.equal((await second.result.submitAttempt(problem, { eventId: 'independent-browser-answer', x: 1, h: true })).duplicate, true);
    assert.equal(api.users.get('alice').data.training.events.length, 1);
  } finally { blocked.resolve(); h.close(); second?.close(); }
});

test('switching accounts disposes in-flight hydration and late data cannot enter the new account or cache', async () => {
  const api = server({ alice: dataFor('alice', { lessons: 1 }), bob: dataFor('bob', { lessons: 2 }) });
  const blocked = deferred(), started = deferred();
  api.beforeGet = async call => { if (call.userId === 'alice') { started.resolve(); await blocked.promise; } };
  const h = harness(api);
  try {
    await started.promise;
    const oldTransport = h.transports[0];
    h.changeSession('bob'); assert.equal(h.result.profile, null);
    await h.ready(); assert.equal(h.result.profile.id, 'cloud-bob');
    blocked.resolve(); await tick(); await tick();
    assert.equal(oldTransport.signal.aborted, true);
    assert.equal(h.result.userId, 'bob'); assert.equal(h.result.learnProgress.xp, 40);
    assert.equal(h.storage.getItem(learningStorageKey('alice')), null);
    assert.equal(JSON.parse(h.storage.getItem(learningStorageKey('bob'))).xp, 40);
  } finally { blocked.resolve(); h.close(); }
});

test('rotating credentials for the same account replaces and aborts the old transport', async () => {
  const api = server({ alice: dataFor('alice', { lessons: 1 }) }), blocked = deferred(), started = deferred();
  api.beforeGet = async call => { if (call.headers.Authorization === 'Bearer alice-token') { started.resolve(); await blocked.promise; } };
  const h = harness(api);
  try {
    await started.promise; const oldTransport = h.transports[0], oldKey = h.result.sessionKey;
    h.changeSession('alice', 'alice-refreshed-token');
    assert.notEqual(h.result.sessionKey, oldKey);
    await h.ready();
    blocked.resolve(); await tick(); await tick();
    assert.equal(oldTransport.signal.aborted, true);
    assert.equal(h.result.learnProgress.xp, 20);
    assert.ok(api.calls.slice(1).every(call => call.headers.Authorization === 'Bearer alice-refreshed-token'));
  } finally { blocked.resolve(); h.close(); }
});

test('imperative account changes stop a stale render from starting another write', async () => {
  const api = server({ alice: dataFor('alice') }), h = harness(api);
  try {
    await h.ready(); const oldRender = h.result, calls = api.calls.length;
    h.services.stores.authStore.actions.setCurrentUser(null);
    await assert.rejects(oldRender.updatePreferences({ role: 'qt' }), /切换|关闭/);
    assert.equal(api.calls.length, calls, 'isActive reads the actual stores before sending');
    h.changeSession(null); assert.equal(h.result.profile, null);
  } finally { h.close(); }
});

test('mismatched credential owner does not expose the previous cloud controller or profile', async () => {
  const api = server({ alice: dataFor('alice') }), h = harness(api);
  try {
    await h.ready();
    h.services.stores.appStore.actions.setCloudConfig({ userId: 'someone-else' }); h.render();
    assert.equal(h.result.profile, null); assert.equal(h.result.cloud, null);
  } finally { h.close(); }
});

test('route cleanup drains an already submitted save while refusing to report success to the old page', async () => {
  const api = server({ alice: dataFor('alice') }), h = harness(api), blocked = deferred(), started = deferred();
  try {
    await h.ready();
    api.beforePut = async () => { started.resolve(); await blocked.promise; };
    const operation = h.result.submitAttempt(problem, { eventId: 'leaving-page', x: 1 });
    const rejected = assert.rejects(operation, /页面已切换/);
    await started.promise;
    h.close(); blocked.resolve(); await rejected; await tick();
    assert.equal(api.users.get('alice').data.training.events[0].id, 'leaving-page');
    assert.equal(JSON.parse(h.storage.getItem(learningStorageKey('alice', 'training'))).events.length, 1);
    assert.equal(h.transports[0].signal.aborted, true);
  } finally { blocked.resolve(); h.close(); }
});

test('a save response from a previous account cannot report success or mutate the new account cache', async () => {
  const api = server({ alice: dataFor('alice'), bob: dataFor('bob') }), h = harness(api), blocked = deferred(), started = deferred();
  try {
    await h.ready();
    api.beforePut = async call => { if (call.userId === 'alice') { started.resolve(); await blocked.promise; } };
    const operation = h.result.submitAttempt(problem, { eventId: 'old-session-answer', x: 1 });
    const rejected = assert.rejects(operation, /切换|停止/);
    await started.promise;
    const previousCache = h.storage.getItem(learningStorageKey('alice', 'training'));
    h.changeSession('bob'); await h.ready(); blocked.resolve(); await rejected; await tick();
    assert.equal(h.result.profile.id, 'cloud-bob'); assert.equal(h.result.profile.events.length, 0);
    assert.equal(api.users.get('bob').data.training.events.length, 0);
    assert.equal(h.storage.getItem(learningStorageKey('alice', 'training')), previousCache);
    assert.equal(JSON.parse(h.storage.getItem(learningStorageKey('bob', 'training'))).events.length, 0);
  } finally { blocked.resolve(); h.close(); }
});
