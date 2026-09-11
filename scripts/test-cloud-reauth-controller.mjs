import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountAuthController } from '../src/modules/account/authController.js';
import { applyGoogleAccount, buildGoogleAccountFromPayload, upsertAuthAccount } from '../src/state/auth.js';
import { beginCloudReauthentication, cancelCloudReauthentication, clearCloudReauthentication, clearPendingAuthReturnPath, getCloudReauthentication, getPendingAuthReturnPath } from '../src/state/cloudReauthentication.js';

const localAccount = { id: 'local:fixture', provider: 'local', email: 'fixture@example.test', name: 'Fixture', passwordHash: 'fixture-hash' };
const googleAccount = { id: 'google:fixture', provider: 'google', email: 'fixture@example.test', name: 'Fixture Google' };
const cloudError = (status) => Object.assign(new Error(status ? `cloud-${status}` : 'offline'), status ? { status } : {});

function setup({ recovery = false, provider = 'local', failure, session } = {}) {
  const account = structuredClone(provider === 'google' ? googleAccount : localAccount);
  const records = { activities: [{ id: 'preserved-training', count: 3 }], trials: [{ id: 'preserved-trial', correct: 7 }] };
  const userState = { value: records };
  const appState = { auth: { accounts: [account], currentUserId: '', lastAuthenticatedAt: '' }, currentUser: null, community: {}, cloudConfig: { endpoint: 'https://fixture.example.test/api', token: 'expired-fixture-token', userId: account.id, lastSyncAt: '2026-09-01T00:00:00Z', lastError: '' } };
  const messages = [], calls = [], savedTokens = [];
  let cloudCalls = 0;
  const deps = {
    getAppState: () => appState,
    getUserStateStore: () => userState,
    getCloudReauthentication: () => recovery ? { ownerId: account.id, email: account.email, returnTo: '/leetcode' } : null,
    cancelCloudReauthentication: () => { recovery = false; calls.push('cancel-recovery'); },
    elements: { loginEmail: { value: account.email }, loginPassword: { value: 'fixture-password' }, loginForm: { dataset: {}, reset: () => calls.push('reset-form') }, resetPasswordEmail: { value: account.email }, resetPasswordNewPassword: { value: 'fixture-new-password' }, resetPasswordVerificationCode: { value: '123456' }, resetPasswordForm: { reset: () => calls.push('reset-password-form') } },
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    normalizeAccount: value => value,
    hashPassword: async () => 'fixture-hash',
    loadStateForUser: () => records,
    createBaseState: () => ({}),
    setCurrentUserId: (auth, id) => { auth.currentUserId = id; },
    saveAuth: () => { calls.push('save-auth'); savedTokens.push(appState.cloudConfig.token); },
    saveCloudConfig: () => calls.push('save-cloud'),
    migrateLegacyState: () => calls.push('migrate'),
    showAuthMessage: (message, error = false) => messages.push({ message, error }),
    getAuthErrorMessage: error => error?.message || 'unknown-auth-error',
    renderSession: () => { calls.push('render'); appState.currentUser = appState.auth.accounts.find(item => item.id === appState.auth.currentUserId) || null; },
    applyCloudSession: (payload, options) => {
      calls.push('apply-cloud');
      assert.equal(options.localState, records);
      upsertAuthAccount(appState.auth, payload.account, { localFields: options.passwordHash ? { passwordHash: options.passwordHash } : {} });
      appState.currentUser = payload.account;
      appState.cloudConfig = { ...appState.cloudConfig, token: payload.token, userId: payload.account.id, lastError: '' };
    },
    getGoogleClientId: () => 'fixture-client',
    parseJwt: () => ({ aud: 'fixture-client', sub: 'fixture', email: account.email, name: account.name }),
    buildGoogleAccountFromPayload,
    applyGoogleAccount: (...args) => { calls.push('apply-google-local'); return applyGoogleAccount(...args); },
    nowIso: () => '2026-09-11T12:00:00Z',
    t: key => key
  };
  const login = async () => {
    cloudCalls += 1;
    calls.push('request-cloud');
    assert.equal(appState.auth.currentUserId, '', 'cloud request must precede authentication changes');
    if (failure) throw failure;
    return session === undefined ? { token: 'new-fixture-token', account: { ...account } } : session;
  };
  deps.resetCloudPassword = login;
  deps.loginCloudAccount = login;
  deps.loginCloudGoogle = login;
  const controller = createAccountAuthController(deps);
  return { controller, deps, appState, records, userState, messages, calls, savedTokens, get cloudCalls() { return cloudCalls; } };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const authMethods = {
  email: { dependency: 'loginCloudAccount', run: harness => harness.controller.loginLocal() },
  google: { dependency: 'loginCloudGoogle', run: harness => harness.controller.handleGoogleCredential({ credential: 'fixture-credential' }) },
  reset: { dependency: 'resetCloudPassword', run: harness => harness.controller.resetPassword() },
};

for (const provider of ['local', 'google']) {
  const login = harness => provider === 'google' ? harness.controller.handleGoogleCredential({ credential: 'fixture-credential' }) : harness.controller.loginLocal();

  test(`${provider}: cloud recovery failure never authenticates locally or discards saved practice`, async () => {
    for (const status of [undefined, 401, 403, 500]) {
      const harness = setup({ provider, recovery: true, failure: cloudError(status) });
      const before = structuredClone(harness.appState.auth);
      const savedPractice = structuredClone(harness.records);
      await login(harness);
      assert.deepEqual(harness.appState.auth, before);
      assert.equal(harness.appState.currentUser, null);
      assert.deepEqual(harness.records, savedPractice);
      assert.equal(harness.userState.value, harness.records);
      assert.equal(harness.calls.includes('apply-cloud'), false);
      assert.equal(harness.calls.includes('apply-google-local'), false);
      assert.equal(harness.calls.includes('migrate'), false);
      assert.equal(harness.calls.includes('render'), false);
      assert.equal(harness.messages.at(-1).message, status ? `cloud-${status}` : 'offline');
      assert.equal(harness.messages.at(-1).error, true);
    }
  });

  test(`${provider}: recovery requires a nonempty token and account id`, async () => {
    for (const session of [null, {}, { token: '', account: { id: 'fixture' } }, { token: '   ', account: { id: 'fixture' } }, { token: 'new-token', account: {} }]) {
      const harness = setup({ provider, recovery: true, session });
      await login(harness);
      assert.equal(harness.appState.auth.currentUserId, '');
      assert.equal(harness.appState.currentUser, null);
      assert.equal(harness.calls.includes('apply-cloud'), false);
      assert.equal(harness.messages.at(-1).error, true);
    }
  });

  test(`${provider}: successful recovery applies the new cloud session and keeps local records`, async () => {
    const harness = setup({ provider, recovery: true });
    await login(harness);
    assert.equal(harness.appState.currentUser.id, provider === 'google' ? 'google:fixture' : 'local:fixture');
    assert.equal(harness.appState.cloudConfig.token, 'new-fixture-token');
    assert.equal(harness.appState.auth.lastAuthenticatedAt, '2026-09-11T12:00:00Z');
    assert.equal(harness.userState.value, harness.records);
    assert.equal(harness.calls.includes('apply-google-local'), false);
    assert.equal(harness.calls.indexOf('request-cloud') < harness.calls.indexOf('save-auth'), true);
    assert.equal(harness.calls.includes('render'), true);
  });

  test(`${provider}: ordinary cloud sign-in requires server success even when a device account exists`, async () => {
    const harness = setup({ provider, failure: cloudError() });
    const before = structuredClone(harness.appState);
    await login(harness);
    assert.deepEqual(harness.appState, before);
    assert.equal(harness.calls.includes('apply-google-local'), false);
    assert.deepEqual(harness.savedTokens, []);
    assert.equal(harness.messages.at(-1).error, true);
    assert.equal(harness.userState.value, harness.records);
    assert.equal(harness.cloudCalls, 1);
  });

  test(`${provider}: explicit HTTP rejection never falls back to the cached local identity`, async () => {
    for (const status of [401, 403, 429]) {
      const harness = setup({ provider, failure: cloudError(status) });
      await login(harness);
      assert.equal(harness.appState.auth.currentUserId, '');
      assert.equal(harness.appState.currentUser, null);
      assert.equal(harness.calls.includes('save-auth'), false);
      assert.equal(harness.calls.includes('apply-google-local'), false);
      assert.equal(harness.messages.at(-1).message, `cloud-${status}`);
      assert.equal(harness.messages.at(-1).error, true);
    }
  });
}

test('cloud recovery cannot create a local account through the registration branch', async () => {
  const harness = setup({ recovery: true });
  const before = structuredClone(harness.appState.auth);
  await harness.controller.registerLocal();
  assert.deepEqual(harness.appState.auth, before);
  assert.equal(harness.cloudCalls, 0);
  assert.equal(harness.calls.includes('save-auth'), false);
  assert.equal(harness.calls.includes('migrate'), false);
  assert.equal(harness.messages.at(-1).message, 'authRecoveryExistingAccount');
  assert.equal(harness.messages.at(-1).error, true);
  assert.equal(harness.userState.value, harness.records);
});


test('password reset recovery rejects malformed cloud sessions without changing identity or practice', async () => {
  const harness = setup({ recovery: true, session: { account: localAccount, token: '' } });
  const before = structuredClone(harness.appState.auth);
  await harness.controller.resetPassword();
  assert.deepEqual(harness.appState.auth, before);
  assert.equal(harness.appState.currentUser, null);
  assert.equal(harness.calls.includes('apply-cloud'), false);
  assert.equal(harness.calls.includes('save-auth'), false);
  assert.equal(harness.messages.at(-1).error, true);
  assert.equal(harness.userState.value, harness.records);
});

test('valid password reset restores the cloud session and preserves local practice', async () => {
  const harness = setup({ recovery: true });
  await harness.controller.resetPassword();
  assert.equal(harness.appState.currentUser.id, localAccount.id);
  assert.equal(harness.appState.cloudConfig.token, 'new-fixture-token');
  assert.equal(harness.calls.includes('apply-cloud'), true);
  assert.equal(harness.calls.includes('reset-password-form'), true);
  assert.equal(harness.calls.includes('render'), true);
  assert.equal(harness.userState.value, harness.records);
});

for (const [name, method] of Object.entries(authMethods)) {
  test(`${name}: stale success or failure cannot overwrite a newer successful sign-in`, async () => {
    for (const outcome of ['success', 'offline', '500']) {
      const harness = setup({ recovery: true });
      const earlier = deferred();
      harness.deps[method.dependency] = () => earlier.promise;
      const oldAttempt = method.run(harness);
      const newer = deferred();
      harness.deps.loginCloudAccount = () => newer.promise;
      const newAttempt = harness.controller.loginLocal();
      newer.resolve({ token: 'current-session', account: localAccount });
      await newAttempt;
      // AuthLayout clears recovery metadata when it returns to the original page.
      harness.deps.getCloudReauthentication = () => null;
      const stateAfterSuccess = structuredClone(harness.appState);
      const callsAfterSuccess = [...harness.calls];
      const messagesAfterSuccess = [...harness.messages];
      if (outcome === 'success') earlier.resolve({ token: 'stale-session', account: { ...localAccount, id: 'local:other', email: 'other@example.test' } });
      else earlier.reject(cloudError(outcome === '500' ? 500 : undefined));
      await oldAttempt;
      assert.deepEqual(harness.appState, stateAfterSuccess);
      assert.deepEqual(harness.calls, callsAfterSuccess);
      assert.deepEqual(harness.messages, messagesAfterSuccess);
      assert.equal(harness.userState.value, harness.records);
    }
  });

  test(`${name}: logout invalidates an outstanding successful authentication`, async () => {
    const harness = setup({ recovery: true });
    const pending = deferred();
    harness.deps[method.dependency] = () => pending.promise;
    const attempt = method.run(harness);
    harness.controller.logout();
    const stateAfterLogout = structuredClone(harness.appState);
    const callsAfterLogout = [...harness.calls];
    const localRecords = structuredClone(harness.records);
    pending.resolve({ token: 'too-late-session', account: localAccount });
    await attempt;
    assert.deepEqual(harness.appState, stateAfterLogout);
    assert.deepEqual(harness.calls, callsAfterLogout);
    assert.deepEqual(harness.records, localRecords);
    assert.equal(harness.appState.currentUser, null);
  });
}

for (const name of ['email', 'google']) {
  test(`${name}: recovery cannot become local fallback when metadata clears during its request`, async () => {
    const harness = setup({ recovery: true });
    const pending = deferred();
    const method = authMethods[name];
    harness.deps[method.dependency] = () => pending.promise;
    const attempt = method.run(harness);
    harness.deps.getCloudReauthentication = () => null;
    pending.reject(cloudError());
    await attempt;
    assert.equal(harness.appState.currentUser, null);
    assert.equal(harness.calls.includes('save-cloud'), false);
    assert.equal(harness.calls.includes('apply-cloud'), false);
    assert.equal(harness.calls.includes('apply-google-local'), false);
    assert.equal(harness.calls.includes('save-auth'), false);
    assert.equal(harness.messages.at(-1).error, true);
    assert.equal(harness.userState.value, harness.records);
  });
}

test('a newer sign-in supersedes an older password hash that is still resolving', async () => {
  const harness = setup({ recovery: true });
  const hashing = deferred();
  let hashCalls = 0;
  harness.deps.hashPassword = () => ++hashCalls === 1 ? hashing.promise : Promise.resolve('fixture-hash');
  const older = harness.controller.resetPassword();
  await Promise.resolve();
  const current = harness.controller.loginLocal();
  await current;
  const stateAfterSuccess = structuredClone(harness.appState);
  const callsAfterSuccess = [...harness.calls];
  hashing.resolve('obsolete-password-hash');
  await older;
  assert.deepEqual(harness.appState, stateAfterSuccess);
  assert.deepEqual(harness.calls, callsAfterSuccess);
  assert.equal(harness.appState.auth.accounts[0].passwordHash, 'fixture-hash');
});

test('explicit device login verifies its password, clears cloud credentials first and retains saved records', async () => {
  const harness = setup({ recovery: true });
  const savedRecords = structuredClone(harness.records);
  const result = await harness.controller.loginLocal({ deviceOnly: true });
  assert.deepEqual(result, { ok: true, mode: 'device' });
  assert.equal(harness.cloudCalls, 0);
  assert.equal(harness.appState.currentUser.id, localAccount.id);
  assert.equal(harness.appState.cloudConfig.token, '');
  assert.equal(harness.appState.cloudConfig.userId, '');
  assert.equal(harness.appState.cloudConfig.lastSyncAt, '');
  assert.equal(harness.appState.cloudConfig.lastError, 'authDeviceSession');
  assert.deepEqual(harness.savedTokens, ['']);
  assert.equal(harness.deps.getCloudReauthentication(), null);
  assert.equal(harness.calls.includes('migrate'), false);
  assert.equal(harness.calls.includes('apply-cloud'), false);
  assert.deepEqual(harness.records, savedRecords);
  assert.equal(harness.userState.value, harness.records);
  assert.equal(harness.messages.at(-1).message, 'authDeviceSession');
});

test('device login rejects missing, incorrect and unavailable device credentials without changing identity or data', async () => {
  for (const kind of ['empty-password', 'wrong-password', 'missing-account', 'google-account', 'missing-hash']) {
    const harness = setup({ recovery: true, provider: kind === 'google-account' ? 'google' : 'local' });
    if (kind === 'empty-password') harness.deps.elements.loginPassword.value = '';
    if (kind === 'wrong-password') harness.deps.hashPassword = async () => 'wrong-hash';
    if (kind === 'missing-account') harness.appState.auth.accounts = [];
    if (kind === 'missing-hash') delete harness.appState.auth.accounts[0].passwordHash;
    const before = structuredClone(harness.appState);
    const records = structuredClone(harness.records);
    const result = await harness.controller.loginDeviceAccount();
    assert.equal(result.ok, false, kind);
    assert.deepEqual(harness.appState, before, kind);
    assert.deepEqual(harness.records, records, kind);
    assert.equal(harness.cloudCalls, 0, kind);
    assert.equal(harness.calls.includes('save-auth'), false, kind);
    assert.equal(harness.calls.includes('cancel-recovery'), false, kind);
    assert.equal(harness.messages.at(-1).error, true, kind);
  }
});

test('a missing cloud account can still explicitly unlock its matching device history after a 401', async () => {
  const harness = setup({ recovery: true, failure: cloudError(401) });
  harness.deps.checkCloudAccountStatus = async () => ({ exists: false });
  await harness.controller.loginLocal();
  assert.equal(harness.appState.currentUser, null);
  assert.equal(harness.messages.at(-1).message, 'authCloudAccountMissing');
  assert.equal(harness.deps.getCloudReauthentication()?.ownerId, localAccount.id);
  await harness.controller.loginDeviceAccount();
  assert.equal(harness.appState.currentUser.id, localAccount.id);
  assert.equal(harness.appState.cloudConfig.token, '');
  assert.equal(harness.cloudCalls, 1);
  assert.equal(harness.userState.value, harness.records);
});

test('canceling cloud recovery releases the restriction without authenticating and invalidates pending requests', async () => {
  const harness = setup({ recovery: true });
  const pending = deferred();
  harness.deps.loginCloudAccount = () => pending.promise;
  const attempted = harness.controller.loginLocal();
  const before = structuredClone(harness.appState);
  harness.controller.logout({ cancelRecovery: true });
  assert.equal(harness.deps.getCloudReauthentication(), null);
  assert.deepEqual(harness.appState, before);
  pending.resolve({ token: 'cancelled-session', account: localAccount });
  await attempted;
  assert.deepEqual(harness.appState, before);
  assert.equal(harness.calls.includes('apply-cloud'), false);
  assert.equal(harness.messages.at(-1).message, 'authCloudRecoveryCancelled');
});

test('late cloud responses cannot replace an explicit device login', async () => {
  const harness = setup({ recovery: true });
  const pending = deferred();
  harness.deps.loginCloudAccount = () => pending.promise;
  const cloudAttempt = harness.controller.loginLocal();
  await harness.controller.loginDeviceAccount();
  const afterDeviceLogin = structuredClone(harness.appState);
  pending.resolve({ token: 'late-cloud-session', account: { ...localAccount, id: 'other-owner' } });
  await cloudAttempt;
  assert.deepEqual(harness.appState, afterDeviceLogin);
  assert.equal(harness.calls.includes('apply-cloud'), false);
});

test('a device password check cannot replace a newer successful cloud login', async () => {
  const harness = setup({ recovery: true });
  const hashing = deferred();
  let count = 0;
  harness.deps.hashPassword = () => ++count === 1 ? hashing.promise : Promise.resolve('new-verified-hash');
  const deviceAttempt = harness.controller.loginDeviceAccount();
  await harness.controller.loginLocal();
  const afterCloudLogin = structuredClone(harness.appState);
  hashing.resolve('fixture-hash');
  await deviceAttempt;
  assert.deepEqual(harness.appState, afterCloudLogin);
  assert.equal(harness.appState.auth.accounts[0].passwordHash, 'new-verified-hash');
  assert.equal(harness.calls.includes('cancel-recovery'), false);
});

test('device login uses the matched account owner and leaves another saved owner untouched', async () => {
  const harness = setup({ recovery: true });
  const other = { ...localAccount, id: 'local:other-owner', email: 'other@example.test', passwordHash: 'other-hash' };
  harness.appState.auth.accounts.push(other);
  harness.deps.elements.loginEmail.value = ' Other@Example.Test ';
  harness.deps.hashPassword = async (email, password) => {
    assert.equal(email, 'other@example.test');
    assert.equal(password, 'fixture-password');
    return 'other-hash';
  };
  const originalAccounts = structuredClone(harness.appState.auth.accounts);
  await harness.controller.loginDeviceAccount();
  assert.equal(harness.appState.currentUser.id, other.id);
  assert.deepEqual(harness.appState.auth.accounts, originalAccounts);
  assert.equal(harness.appState.cloudConfig.token, '');
});

test('cloud-only recovery never sends an unknown email into a blocked registration form', async () => {
  const harness = setup({ recovery: true });
  harness.deps.elements.loginEmail.value = 'new@example.test';
  harness.deps.elements.loginPassword.value = '';
  harness.deps.checkCloudAccountStatus = async () => ({ exists: false });
  await harness.controller.submitEmailAuth();
  assert.equal(harness.messages.at(-1).message, 'authCloudAccountMissing');
  assert.equal(harness.appState.currentUser, null);
  assert.equal(harness.deps.elements.loginForm.dataset.authStep, undefined);
});

test('canceling recovery preserves only a safe destination for the eventual successful login', () => {
  beginCloudReauthentication({ ownerId: 'fixture-owner', email: 'fixture@example.test', returnTo: '/tools?trainer=math#history' });
  cancelCloudReauthentication();
  assert.equal(getCloudReauthentication(), null);
  assert.equal(getPendingAuthReturnPath(), '/tools?trainer=math#history');
  clearPendingAuthReturnPath();
  assert.equal(getPendingAuthReturnPath(), '');
  beginCloudReauthentication({ ownerId: 'fixture-owner', email: 'fixture@example.test', returnTo: '//outside.example.test' });
  cancelCloudReauthentication();
  assert.equal(getPendingAuthReturnPath(), '/account');
  clearCloudReauthentication();
  clearPendingAuthReturnPath();
});
