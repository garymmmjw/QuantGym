import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountPageApi } from '../src/app/services/accountPageApi.js';

const email = 'fixture@example.test';
const hash = (value, password) => `fixture-hash:${value}:${password}`;
const account = () => ({ id: 'local:fixture', provider: 'local', email, name: 'Fixture', passwordHash: hash(email, 'Original123'), country: 'china' });
const fields = { currentPassword: 'Original123', newPassword: 'Replacement456' };

function harness({ cloud = true } = {}) {
  const owner = account();
  const calls = [];
  const appState = {
    currentUser: owner,
    auth: { currentUserId: owner.id, accounts: [owner] },
    cloudConfig: { endpoint: 'https://fixture.example.test/api', userId: cloud ? owner.id : '', token: cloud ? 'fixture-old-token' : '', lastError: '' }
  };
  const userState = { value: { entries: [{ id: 'preserved-entry' }], problemStates: [{ problemId: 'preserved-problem', completed: true }] } };
  const deps = {
    appState, userState, hashPassword: async (...args) => hash(...args),
    saveAuth: () => calls.push('save-auth'),
    saveCloudConfig: () => calls.push('save-cloud'),
    syncAccountStores: () => calls.push('sync-stores'),
    queueCloudSync: (part) => calls.push(`queue:${part}`),
    getCurrentUser: () => appState.auth.accounts.find(item => item.id === appState.auth.currentUserId),
    cloudApi: async (path, options) => {
      calls.push({ path, options });
      if (path.startsWith('/auth/account-status')) return { exists: false };
      if (path === '/auth/verification-code') return { ok: true, retryAfter: 60 };
      return { token: 'fixture-new-token', account: { ...owner, passwordHash: undefined }, state: { entries: [] } };
    }
  };
  const api = createAccountPageApi(deps);
  return { api, deps, appState, userState, calls };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function stored(h) {
  return JSON.stringify({ auth: h.appState.auth, config: h.appState.cloudConfig, state: h.userState.value });
}

test('cloud password uses the server before local mutation and preserves records', async () => {
  const h = harness();
  const state = h.userState.value;
  const oldHash = h.appState.currentUser.passwordHash;
  h.deps.cloudApi = async (path, options) => {
    assert.equal(path, '/auth/change-password');
    assert.deepEqual(options, { method: 'POST', body: fields });
    assert.equal(h.appState.currentUser.passwordHash, oldHash);
    assert.equal(h.appState.cloudConfig.token, 'fixture-old-token');
    assert.deepEqual(h.calls, []);
    return { token: 'fixture-new-token', account: { id: 'local:fixture', email }, state: { entries: [] } };
  };
  const result = await h.api.changePassword(fields);
  assert.equal(result.ok, true);
  assert.equal(result.scope, 'cloud');
  assert.equal(h.appState.currentUser.passwordHash, hash(email, fields.newPassword));
  assert.equal(h.appState.auth.currentUserId, 'local:fixture');
  assert.equal(h.appState.cloudConfig.token, 'fixture-new-token');
  assert.equal(h.userState.value, state);
  assert.deepEqual(h.calls, ['save-cloud', 'save-auth', 'sync-stores']);
});

test('cloud password does not trust a stale locally cached password hash', async () => {
  const h = harness();
  h.appState.currentUser.passwordHash = 'stale-fixture-hash';
  assert.equal((await h.api.changePassword(fields)).ok, true);
  assert.equal(h.appState.currentUser.passwordHash, hash(email, fields.newPassword));
});

for (const status of [400, 401, 409, 429, 503]) {
  test(`cloud error ${status} leaves local password, session, and records untouched`, async () => {
    const h = harness();
    const before = stored(h);
    h.deps.cloudApi = async () => { throw Object.assign(new Error('Fixture rejection'), { status }); };
    const result = await h.api.changePassword(fields);
    assert.equal(result.ok, false);
    assert.equal(stored(h), before);
    assert.deepEqual(h.calls, []);
  });
}

test('malformed or wrong-owner cloud responses cannot replace local credentials', async () => {
  for (const payload of [{}, { token: 'fixture-new-token', account: { id: 'another-owner', email } }, { token: 'fixture-new-token', account: { id: 'local:fixture', email: '  ' } }]) {
    const h = harness();
    const before = stored(h);
    h.deps.cloudApi = async () => payload;
    assert.equal((await h.api.changePassword(fields)).code, 'invalidResponse');
    assert.equal(stored(h), before);
  }
});

test('password response cannot overwrite a session switched while awaiting the server', async () => {
  const h = harness();
  const pending = deferred();
  const started = deferred();
  h.deps.cloudApi = () => { started.resolve(); return pending.promise; };
  const operation = h.api.changePassword(fields);
  await started.promise;
  const other = { ...account(), id: 'local:other' };
  h.appState.currentUser = other;
  h.appState.auth.currentUserId = other.id;
  h.appState.cloudConfig = { ...h.appState.cloudConfig, userId: other.id, token: 'fixture-other-token' };
  const before = stored(h);
  pending.resolve({ token: 'fixture-new-token', account: { id: 'local:fixture', email } });
  assert.equal((await operation).code, 'sessionChanged');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('duplicate password change is rejected while the first request is pending', async () => {
  const h = harness();
  const pending = deferred();
  h.deps.cloudApi = () => pending.promise;
  const operation = h.api.changePassword(fields);
  assert.equal((await h.api.changePassword(fields)).code, 'busy');
  pending.resolve({ token: 'fixture-new-token', account: { id: 'local:fixture', email } });
  assert.equal((await operation).ok, true);
});

test('an account with a missing cloud token cannot fall back to a local password change', async () => {
  const h = harness();
  h.appState.cloudConfig.token = '';
  const before = stored(h);
  assert.equal((await h.api.changePassword(fields)).code, 'reauthRequired');
  assert.equal(stored(h), before);
});

test('legacy device credentials cannot authorize a password change', async () => {
  const h = harness({ cloud: false });
  const before = stored(h);
  for (const currentPassword of ['Wrong123', fields.currentPassword]) {
    assert.equal((await h.api.changePassword({ ...fields, currentPassword })).code, 'reauthRequired');
    assert.equal(stored(h), before);
    assert.deepEqual(h.calls, []);
  }
});

test('profile save requires current password for email changes without mutating records', async () => {
  const h = harness();
  const before = stored(h);
  const result = await h.api.save({ name: 'Updated', email: 'different@example.test' });
  assert.equal(result.code, 'passwordRequired');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('old activation entry points cannot register another identity or mutate saved data', async () => {
  const h = harness({ cloud: false });
  const before = stored(h);
  assert.equal((await h.api.sendCloudActivationCode({ password: fields.currentPassword })).code, 'reauthRequired');
  assert.equal((await h.api.activateCloudAccount({ password: fields.currentPassword, verificationCode: 'fixture-code' })).code, 'reauthRequired');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('legacy device login forwards into the standard login flow', () => {
  const h = harness();
  h.deps.loginLocal = options => { h.calls.push(['login', options]); return true; };
  h.deps.logout = options => { h.calls.push(['logout', options]); return true; };
  assert.equal(h.api.loginDeviceAccount(), true);
  assert.equal(h.api.cancelCloudRecovery(), true);
  assert.deepEqual(h.calls, [['login', undefined], ['logout', { cancelRecovery: true }]]);
});

test('persistence failure after server success accurately reports that the cloud password changed', async () => {
  const h = harness();
  h.deps.saveCloudConfig = () => { throw new Error('Fixture storage failure'); };
  const result = await h.api.changePassword(fields);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'sessionSaveFailed');
  assert.match(result.message, /登录密码已修改/);
});

test('cloud password restores the authoritative email without losing the new token or records', async () => {
  const h = harness();
  const state = h.userState.value;
  h.appState.currentUser.email = 'device-only-edit@example.test';
  h.appState.currentUser.passwordHash = hash(h.appState.currentUser.email, fields.currentPassword);
  const hashes = [];
  h.deps.hashPassword = async (address, password) => {
    hashes.push([address, password]);
    return hash(address, password);
  };
  h.deps.cloudApi = async () => ({
    token: 'fixture-new-token',
    account: { id: 'local:fixture', email: ' Fixture@Example.Test ' },
    state: { entries: [] }
  });
  const result = await h.api.changePassword(fields);
  assert.equal(result.ok, true);
  assert.equal(h.appState.currentUser.email, email);
  assert.equal(h.appState.auth.accounts[0].email, email);
  assert.equal(h.appState.currentUser.passwordHash, hash(email, fields.newPassword));
  assert.equal(h.appState.cloudConfig.token, 'fixture-new-token');
  assert.equal(h.appState.auth.currentUserId, 'local:fixture');
  assert.equal(h.userState.value, state);
  assert.deepEqual(hashes, [[email, fields.newPassword]]);
});
