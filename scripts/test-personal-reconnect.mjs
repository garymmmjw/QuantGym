import test from 'node:test';
import assert from 'node:assert/strict';
import { reconnectPersonalAccount } from '../src/features/personal/reconnectAccount.js';
import { assemblePageApiSliceImpl } from '../src/app/createAppContext/slices/impl/assemblePageApiSlice.impl.js';

const account = () => ({ id: 'alice', email: 'Alice@Example.com', name: 'Alice' });
const config = () => ({ endpoint: 'https://api.example.test/api', token: 'expired-fixture', userId: 'alice', lastError: 'Session expired', lastSyncAt: '2026-09-01T12:00:00Z' });
const response = () => ({ account: { id: 'alice', email: 'alice@example.com', name: 'Remote profile' }, token: 'fresh-fixture', state: { entries: ['must not replace local work'] }, community: { posts: ['must not import'] } });
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('reconnect accepts the same owner and case-insensitive email, updating only session config', async () => {
  const user = account(), originalConfig = config(), payload = response(), requests = [], saved = [];
  const originalUser = structuredClone(user);
  const originalResponse = structuredClone(payload);
  const result = await reconnectPersonalAccount({ user, config: originalConfig, password: ' exact password ',
    request: async (...args) => { requests.push(args); return payload; }, getCurrentOwnerId: () => 'alice', saveConfig: next => saved.push(next) });
  assert.equal(result, true);
  assert.deepEqual(requests, [['/auth/login', { method: 'POST', auth: false, body: { email: 'Alice@Example.com', password: ' exact password ' } }]]);
  assert.deepEqual(saved, [{ ...originalConfig, token: 'fresh-fixture', userId: 'alice', lastError: '' }]);
  assert.deepEqual(user, originalUser);
  assert.deepEqual(payload, originalResponse);
  assert.equal(originalConfig.token, 'expired-fixture');
});

test('missing credentials do not send a login request', async () => {
  for (const [user, password] of [[null, 'password'], [{ id: 'alice' }, 'password'], [account(), ''], [account(), '   ']]) {
    let called = false;
    await assert.rejects(reconnectPersonalAccount({ user, config: config(), password, request: async () => { called = true; }, getCurrentOwnerId: () => 'alice', saveConfig: () => { called = true; } }), /missing_credentials/);
    assert.equal(called, false);
  }
});

test('another owner or another email never receives this account session config', async () => {
  for (const remoteAccount of [{ id: 'bob', email: 'alice@example.com' }, { id: 'alice', email: 'bob@example.com' }, { id: 'alice', email: '' }]) {
    const saved = [];
    await assert.rejects(reconnectPersonalAccount({ user: account(), config: config(), password: 'password', request: async () => ({ ...response(), account: remoteAccount }), getCurrentOwnerId: () => 'alice', saveConfig: next => saved.push(next) }), /account_mismatch/);
    assert.equal(saved.length, 0);
  }
});

test('switching or signing out while login is pending prevents any session write', async () => {
  for (const ownerAfter of ['bob', null]) {
    const wait = deferred();
    let owner = 'alice', saved = false;
    const reconnecting = reconnectPersonalAccount({ user: account(), config: config(), password: 'password', request: () => wait.promise, getCurrentOwnerId: () => owner, saveConfig: () => { saved = true; } });
    owner = ownerAfter;
    wait.resolve(response());
    await assert.rejects(reconnecting, /account_changed/);
    assert.equal(saved, false);
  }
});

test('missing or nontext tokens and request failures never report a successful reconnect', async () => {
  for (const token of ['', null, 42]) {
    await assert.rejects(reconnectPersonalAccount({ user: account(), config: config(), password: 'password', request: async () => ({ ...response(), token }), getCurrentOwnerId: () => 'alice', saveConfig: () => { throw new Error('must not save'); } }), /invalid_session/);
  }
  await assert.rejects(reconnectPersonalAccount({ user: account(), config: config(), password: 'password', request: async () => { throw new Error('Network unavailable'); }, getCurrentOwnerId: () => 'alice', saveConfig: () => { throw new Error('must not save'); } }), /Network unavailable/);
});

test('persistence failure propagates instead of claiming the refreshed session was saved', async () => {
  const original = config();
  await assert.rejects(reconnectPersonalAccount({ user: account(), config: original, password: 'password', request: async () => response(), getCurrentOwnerId: () => 'alice', saveConfig: async () => { throw new Error('QuotaExceededError'); } }), /QuotaExceededError/);
  assert.deepEqual(original, config());
});

function assemble({ request = async () => response(), failStorage = false } = {}) {
  const appState = { currentUser: account(), cloudConfig: config(), community: { posts: [{ id: 'local-community' }] } };
  const userState = { value: { entries: [{ id: 'local-training' }], interviewDraft: 'keep this answer' } };
  const calls = [];
  const deps = { appState, userState, cloudApi: request,
    createPageApi: () => ({}), authStateRuntime: { save() { calls.push('auth-save'); } },
    options: { documentRef: {}, windowRef: {} }, pageLifecycleRef: { current: {} },
    domainStores: { appStore: { actions: { setCloudConfig(next) { calls.push({ type: 'store', next }); } } } },
    appRuntime: { notify() { calls.push('notify'); } },
    saveCloudConfig() { if (failStorage) throw new Error('QuotaExceededError'); calls.push({ type: 'persist', next: structuredClone(appState.cloudConfig) }); },
  };
  return { appState, userState, calls, api: assemblePageApiSliceImpl(deps, {}) };
}

test('real assembly reconnect publishes new config without replacing profile, training or community', async () => {
  const fixture = assemble();
  const user = fixture.appState.currentUser, training = fixture.userState.value, community = fixture.appState.community;
  const before = JSON.stringify({ user, training, community });
  await fixture.api.reconnectPersonalAccount('password');
  assert.equal(fixture.appState.cloudConfig.token, 'fresh-fixture');
  assert.equal(fixture.appState.currentUser, user);
  assert.equal(fixture.userState.value, training);
  assert.equal(fixture.appState.community, community);
  assert.equal(JSON.stringify({ user, training, community }), before);
  assert.deepEqual(fixture.calls.map(call => typeof call === 'string' ? call : call.type), ['persist', 'notify', 'store']);
  assert.equal(fixture.calls[2].next, fixture.appState.cloudConfig);
});

test('real assembly rolls session config back when local persistence fails and never publishes it', async () => {
  const fixture = assemble({ failStorage: true });
  const original = fixture.appState.cloudConfig, training = fixture.userState.value;
  await assert.rejects(fixture.api.reconnectPersonalAccount('password'), /QuotaExceededError/);
  assert.equal(fixture.appState.cloudConfig, original);
  assert.equal(fixture.userState.value, training);
  assert.deepEqual(fixture.calls, []);
});

test('real assembly rechecks the current account after the asynchronous login request', async () => {
  const wait = deferred();
  const fixture = assemble({ request: () => wait.promise });
  const original = fixture.appState.cloudConfig;
  const reconnecting = fixture.api.reconnectPersonalAccount('password');
  fixture.appState.currentUser = { id: 'bob', email: 'bob@example.com' };
  wait.resolve(response());
  await assert.rejects(reconnecting, /account_changed/);
  assert.equal(fixture.appState.cloudConfig, original);
  assert.deepEqual(fixture.calls, []);
});
