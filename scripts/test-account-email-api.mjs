import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountPageApi } from '../src/app/services/accountPageApi.js';

const target = 'new@example.test';
const fields = { email: target, currentPassword: 'Original123', verificationCode: '123456' };
function fixture() {
  const owner = { id: 'owner', email: 'original@example.test', provider: 'local', name: 'Fixture', passwordHash: 'old-hash', country: 'china' };
  const appState = { currentUser: owner, auth: { accounts: [owner] }, cloudConfig: { userId: owner.id, token: 'test-only', endpoint: 'https://fixture.invalid/api' } };
  const userState = { value: { entries: [{ id: 'preserved' }] } };
  const calls = [];
  let saved = 0;
  const deps = {
    appState, userState, hashPassword: async (email, password) => `hash:${email}:${password}`,
    getCurrentUser: () => appState.auth.accounts.find(account => account.id === appState.currentUser.id),
    saveAuth: () => { saved += 1; }, saveState: () => { saved += 1; },
    cloudApi: async (path, options) => {
      calls.push({ path, options });
      return path.endsWith('email-verification-code')
        ? { ok: true, email: target, expiresInSeconds: 600, cooldownSeconds: 60, delivery: 'email' }
        : { account: { ...owner, email: target, passwordHash: undefined, isAdmin: false, subscriptionTier: 'free' } };
    }
  };
  return { appState, userState, deps, calls, api: createAccountPageApi(deps), saves: () => saved, stored: () => JSON.stringify({ appState, userState }) };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('sending an email code authenticates the request without changing identity or saved records', async () => {
  const h = fixture();
  const before = h.stored();
  const result = await h.api.sendEmailChangeCode({ email: '  New@Example.Test ', currentPassword: fields.currentPassword });
  assert.equal(result.ok, true);
  assert.equal(result.email, target);
  assert.deepEqual(h.calls, [{ path: '/account/email-verification-code', options: { method: 'POST', body: { email: target, currentPassword: fields.currentPassword } } }]);
  assert.equal(h.stored(), before);
  assert.equal(h.saves(), 0);
});

test('missing, expired or mismatched session makes no email request or local credential change', async () => {
  for (const config of [{}, { userId: 'owner', token: '' }, { userId: 'another', token: 'other' }]) {
    const h = fixture(); h.appState.cloudConfig = config;
    const before = h.stored();
    assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'reauthRequired');
    assert.equal((await h.api.save(fields)).code, 'reauthRequired');
    assert.equal(h.stored(), before);
    assert.equal(h.calls.length, 0);
  }
});

test('orphaned cloud token without an account cannot initiate an email request', async () => {
  const h = fixture(); h.appState.currentUser = null; h.appState.cloudConfig = { token: 'orphaned' };
  assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'reauthRequired');
  assert.equal(h.calls.length, 0);
});

test('Google and Google-linked accounts cannot request or locally apply an email change', async () => {
  for (const identity of [{ provider: 'google' }, { googleId: 'google-id' }]) {
    const h = fixture(); Object.assign(h.appState.currentUser, identity);
    const before = h.stored();
    assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'providerEmail');
    assert.equal((await h.api.save(fields)).code, 'providerEmail');
    assert.equal(h.stored(), before);
    assert.equal(h.calls.length, 0);
  }
});

test('code requests require a changed valid address and current password', async () => {
  const h = fixture();
  for (const email of ['', 'broken', h.appState.currentUser.email]) assert.equal((await h.api.sendEmailChangeCode({ ...fields, email })).code, 'invalidEmail');
  assert.equal((await h.api.sendEmailChangeCode({ email: target })).code, 'passwordRequired');
  assert.equal(h.calls.length, 0);
});

test('an email change cannot be sent without a six-digit verification code', async () => {
  const h = fixture(); const before = h.stored();
  for (const verificationCode of ['', '12345', 'abcdef', '1234567']) assert.equal((await h.api.save({ ...fields, verificationCode })).code, 'verificationRequired');
  assert.equal(h.stored(), before);
  assert.equal(h.calls.length, 0);
});

test('verified email save forwards the code and only adopts server-confirmed identity and privileges', async () => {
  const h = fixture();
  const before = h.stored();
  const wait = deferred();
  h.deps.cloudApi = async (path, options) => { h.calls.push({ path, options }); return wait.promise; };
  const pending = h.api.save({ ...fields, verificationCode: ' 123456 ' });
  await new Promise(done => setImmediate(done));
  assert.equal(h.stored(), before);
  assert.equal(h.saves(), 0);
  assert.deepEqual(h.calls, [{ path: '/account', options: { method: 'PATCH', body: { updates: { email: target }, currentPassword: fields.currentPassword, verificationCode: '123456' } } }]);
  wait.resolve({ account: { id: 'owner', email: target, isAdmin: false, subscriptionTier: 'free' } });
  assert.equal((await pending).ok, true);
  assert.equal(h.appState.currentUser.email, target);
  assert.equal(h.appState.currentUser.passwordHash, `hash:${target}:${fields.currentPassword}`);
  assert.equal(h.appState.currentUser.isAdmin, false);
  assert.equal(h.appState.currentUser.subscriptionTier, 'free');
  assert.deepEqual(h.userState.value.entries, [{ id: 'preserved' }]);
});

test('ordinary profile saves do not require or forward email verification credentials', async () => {
  const h = fixture();
  h.deps.cloudApi = async (path, options) => { h.calls.push({ path, options }); return { account: { ...h.appState.currentUser, ...options.body.updates } }; };
  assert.equal((await h.api.save({ name: 'Updated' })).ok, true);
  assert.equal(h.appState.currentUser.email, 'original@example.test');
  assert.equal(Object.hasOwn(h.calls[0].options.body, 'verificationCode'), false);
  assert.equal(h.appState.currentUser.name, 'Updated');
});

for (const status of [400, 401, 409, 429, 503]) {
  test(`email request or confirmation error ${status} preserves local identity and records`, async () => {
    const h = fixture(); const before = h.stored();
    h.deps.cloudApi = async () => { throw Object.assign(new Error('Verification rejected'), { status }); };
    assert.equal((await h.api.sendEmailChangeCode(fields)).ok, false);
    assert.equal((await h.api.save(fields)).ok, false);
    assert.equal(h.stored(), before);
    assert.equal(h.saves(), 0);
  });
}

test('unverified or mismatched server email cannot cause optimistic local identity changes', async () => {
  for (const account of [{ id: 'owner' }, { id: 'owner', email: 'original@example.test' }, { id: 'another', email: target }]) {
    const h = fixture(); const before = h.stored(); h.deps.cloudApi = async () => ({ account });
    assert.equal((await h.api.save(fields)).ok, false);
    assert.equal(h.stored(), before);
    assert.equal(h.saves(), 0);
  }
});

test('code response is rejected if server did not confirm the exact target email', async () => {
  for (const payload of [{}, { ok: false, email: target }, { ok: true, email: 'other@example.test' }]) {
    const h = fixture(); h.deps.cloudApi = async () => payload;
    assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'invalidResponse');
    assert.equal(h.saves(), 0);
  }
});

for (const operation of ['sendEmailChangeCode', 'save']) {
  for (const changed of ['account', 'token', 'endpoint', 'email']) {
    test(`${operation} ignores response after the ${changed} changed while waiting`, async () => {
      const h = fixture(); const wait = deferred(); h.deps.cloudApi = () => wait.promise;
      const pending = h.api[operation](fields);
      await new Promise(done => setImmediate(done));
      if (changed === 'account') h.appState.currentUser = { id: 'other', email: 'other@example.test' };
      else if (changed === 'email') h.appState.currentUser.email = 'elsewhere@example.test';
      else h.appState.cloudConfig[changed] = 'changed';
      const before = h.stored();
      wait.resolve({ ok: true, email: target, account: { id: 'owner', email: target } });
      assert.equal((await pending).code, 'sessionChanged');
      assert.equal(h.stored(), before);
      assert.equal(h.saves(), 0);
    });
  }
}

test('duplicate code request is held while the first request is pending, then released', async () => {
  const h = fixture(); const wait = deferred(); h.deps.cloudApi = () => wait.promise;
  const pending = h.api.sendEmailChangeCode(fields);
  assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'busy');
  wait.resolve({ ok: true, email: target });
  assert.equal((await pending).ok, true);
  assert.equal((await h.api.sendEmailChangeCode(fields)).ok, true);
});

test('rate-limited sends expose the server wait duration for an actionable resend countdown', async () => {
  for (const [message, data, expected] of [['Please wait 37 seconds before requesting another code', {}, 37], ['Too many requests', { retryAfter: 12 }, 12], ['Too many requests', {}, 60]]) {
    const h = fixture(); const before = h.stored();
    h.deps.cloudApi = async () => { throw Object.assign(new Error(message), { status: 429, data }); };
    const result = await h.api.sendEmailChangeCode(fields);
    assert.equal(result.code, 'rateLimited');
    assert.equal(result.retryAfter, expected);
    assert.match(result.message, new RegExp(`${expected} 秒`));
    assert.equal(h.stored(), before);
  }
});

test('locked verification asks for a new code, while wrong password remains retryable', async () => {
  const h = fixture(); const before = h.stored();
  h.deps.cloudApi = async () => { throw Object.assign(new Error('Too many email verification attempts'), { status: 429 }); };
  assert.equal((await h.api.save(fields)).code, 'verificationLocked');
  h.deps.cloudApi = async () => { throw Object.assign(new Error('Incorrect current password'), { status: 403 }); };
  assert.equal((await h.api.sendEmailChangeCode(fields)).code, 'wrongPassword');
  assert.equal(h.stored(), before);
});
