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

test('explicit device account changes only its device password with an accurate success label', async () => {
  const h = harness({ cloud: false });
  const state = h.userState.value;
  const result = await h.api.changePassword(fields);
  assert.equal(result.ok, true);
  assert.equal(result.scope, 'local');
  assert.match(result.message, /本机密码/);
  assert.equal(h.appState.currentUser.passwordHash, hash(email, fields.newPassword));
  assert.equal(h.userState.value, state);
  assert.deepEqual(h.calls, ['save-auth', 'sync-stores']);
});

test('incorrect device password cannot change credentials', async () => {
  const h = harness({ cloud: false });
  const before = stored(h);
  assert.equal((await h.api.changePassword({ ...fields, currentPassword: 'Wrong123' })).code, 'wrongPassword');
  assert.equal(stored(h), before);
});

test('profile save requires current password for email changes without mutating records', async () => {
  const h = harness();
  const before = stored(h);
  const result = await h.api.save({ name: 'Updated', email: 'different@example.test' });
  assert.equal(result.code, 'passwordRequired');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('activation code first verifies the device password and checks cloud existence', async () => {
  const h = harness({ cloud: false });
  const before = stored(h);
  assert.equal((await h.api.sendCloudActivationCode({ password: 'Wrong123' })).code, 'wrongPassword');
  assert.deepEqual(h.calls, []);
  assert.equal((await h.api.sendCloudActivationCode({ password: fields.currentPassword })).ok, true);
  assert.deepEqual(h.calls, [
    { path: `/auth/account-status?email=${encodeURIComponent(email)}`, options: { auth: false } },
    { path: '/auth/verification-code', options: { method: 'POST', auth: false, body: { email, purpose: 'register' } } }
  ]);
  assert.equal(stored(h), before);
});

test('existing cloud account cannot receive a new registration verification code', async () => {
  const h = harness({ cloud: false });
  h.deps.cloudApi = async (path) => { h.calls.push(path); return { exists: true }; };
  assert.equal((await h.api.sendCloudActivationCode({ password: fields.currentPassword })).code, 'cloudAccountExists');
  assert.equal(h.calls.length, 1);
});

test('activation syncs the original owner and personal records without publishing shared community', async () => {
  const h = harness({ cloud: false });
  const owner = h.appState.currentUser;
  const state = h.userState.value;
  const community = { posts: [{ id: 'device-community-snapshot' }] };
  h.appState.community = community;
  const result = await h.api.activateCloudAccount({ password: fields.currentPassword, verificationCode: 'fixture-code' });
  assert.equal(result.ok, true);
  const request = h.calls[0];
  assert.equal(request.path, '/auth/register');
  assert.equal(request.options.auth, false);
  assert.equal(request.options.body.account.id, owner.id);
  assert.equal(request.options.body.account.passwordHash, undefined);
  assert.equal(request.options.body.community, undefined);
  assert.equal(request.options.body.password, fields.currentPassword);
  assert.equal(request.options.body.verificationCode, 'fixture-code');
  assert.equal(h.appState.currentUser, owner);
  assert.equal(h.appState.auth.currentUserId, owner.id);
  assert.equal(h.userState.value, state);
  assert.equal(h.appState.community, community);
  assert.deepEqual(community, { posts: [{ id: 'device-community-snapshot' }] });
  assert.equal(h.appState.cloudConfig.userId, owner.id);
  assert.equal(h.appState.cloudConfig.token, 'fixture-new-token');
  assert.deepEqual(h.calls.slice(1), ['save-cloud', 'sync-stores', 'queue:state', 'queue:account']);
});

test('activation cannot call register with an incorrect password or missing code', async () => {
  const h = harness({ cloud: false });
  const before = stored(h);
  assert.equal((await h.api.activateCloudAccount({ password: 'Wrong123', verificationCode: 'fixture-code' })).code, 'wrongPassword');
  assert.equal((await h.api.activateCloudAccount({ password: fields.currentPassword })).code, 'missingCode');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('failed or wrong-owner activation leaves records and cloud configuration unchanged', async () => {
  for (const response of ['conflict', 'unavailable', 'wrong-owner']) {
    const h = harness({ cloud: false });
    const before = stored(h);
    h.deps.cloudApi = async () => {
      if (response === 'conflict') throw Object.assign(new Error('Fixture conflict'), { status: 409 });
      if (response === 'unavailable') throw Object.assign(new Error('Fixture unavailable'), { status: 503 });
      return { token: 'fixture-token', account: { id: 'different-owner', email } };
    };
    assert.equal((await h.api.activateCloudAccount({ password: fields.currentPassword, verificationCode: 'fixture-code' })).ok, false);
    assert.equal(stored(h), before);
    assert.deepEqual(h.calls, []);
  }
});

test('account APIs forward explicit device login and recovery cancellation options', () => {
  const h = harness();
  h.deps.loginLocal = options => { h.calls.push(['login', options]); return true; };
  h.deps.logout = options => { h.calls.push(['logout', options]); return true; };
  assert.equal(h.api.loginDeviceAccount(), true);
  assert.equal(h.api.cancelCloudRecovery(), true);
  assert.deepEqual(h.calls, [['login', { deviceOnly: true }], ['logout', { cancelRecovery: true }]]);
});

test('activation response cannot overwrite an account switched during registration', async () => {
  const h = harness({ cloud: false });
  const pending = deferred();
  const started = deferred();
  h.deps.cloudApi = () => { started.resolve(); return pending.promise; };
  const operation = h.api.activateCloudAccount({ password: fields.currentPassword, verificationCode: 'fixture-code' });
  await started.promise;
  const other = { ...account(), id: 'local:other' };
  h.appState.currentUser = other;
  h.appState.auth.currentUserId = other.id;
  const before = stored(h);
  pending.resolve({ token: 'fixture-new-token', account: { id: 'local:fixture', email } });
  assert.equal((await operation).code, 'sessionChanged');
  assert.equal(stored(h), before);
  assert.deepEqual(h.calls, []);
});

test('persistence failure after server success accurately reports that the cloud password changed', async () => {
  const h = harness();
  h.deps.saveCloudConfig = () => { throw new Error('Fixture storage failure'); };
  const result = await h.api.changePassword(fields);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'sessionSaveFailed');
  assert.match(result.message, /云端密码已修改/);
});

test('persistence failure after registration accurately reports that the cloud account exists', async () => {
  const h = harness({ cloud: false });
  h.deps.saveCloudConfig = () => { throw new Error('Fixture storage failure'); };
  const state = h.userState.value;
  const result = await h.api.activateCloudAccount({ password: fields.currentPassword, verificationCode: 'fixture-code' });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'sessionSaveFailed');
  assert.match(result.message, /云端账户已启用/);
  assert.equal(h.userState.value, state);
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
