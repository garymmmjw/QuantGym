import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountAuthController } from '../src/modules/account/authController.js';
import { applyGoogleAccount, buildGoogleAccountFromPayload, buildLocalAccount, getCurrentUser, normalizeAuth, upsertAuthAccount } from '../src/state/auth.js';
import { beginCloudReauthentication, cancelCloudReauthentication, clearCloudReauthentication, clearPendingAuthReturnPath, getCloudReauthentication, getPendingAuthReturnPath } from '../src/state/cloudReauthentication.js';

const localAccount = { id: 'local:fixture', provider: 'local', email: 'fixture@example.test', name: 'Fixture', passwordHash: 'fixture-hash' };
const googleAccount = { id: 'google:fixture', provider: 'google', email: 'fixture@example.test', name: 'Fixture Google' };
const cloudError = (status) => Object.assign(new Error(status ? `cloud-${status}` : 'offline'), status ? { status } : {});

function setup({ recovery = false, provider = 'local', failure, session } = {}) {
  const account = structuredClone(provider === 'google' ? googleAccount : localAccount);
  const records = { activities: [{ id: 'preserved-training', count: 3 }], trials: [{ id: 'preserved-trial', correct: 7 }] };
  const userState = { value: records };
  const appState = { auth: { accounts: [account], currentUserId: '', lastAuthenticatedAt: '' }, currentUser: null, community: {}, cloudConfig: { endpoint: 'https://fixture.example.test/api', token: 'expired-fixture-token', userId: account.id, lastSyncAt: '2026-09-01T00:00:00Z', lastError: '' } };
  const messages = [], calls = [], savedTokens = [], appliedOptions = [];
  let cloudCalls = 0;
  const deps = {
    getAppState: () => appState,
    getUserStateStore: () => userState,
    getCloudAuthConfig: async () => ({ inviteRequired: true }),
    getCloudReauthentication: () => recovery ? { ownerId: account.id, email: account.email, returnTo: '/leetcode' } : null,
    cancelCloudReauthentication: () => { recovery = false; calls.push('cancel-recovery'); },
    elements: { loginEmail: { value: account.email }, loginPassword: { value: 'fixture-password' }, loginForm: { dataset: {}, reset: () => calls.push('reset-form') }, resetPasswordEmail: { value: account.email }, resetPasswordNewPassword: { value: 'fixture-new-password' }, resetPasswordVerificationCode: { value: '123456' }, resetPasswordForm: { reset: () => calls.push('reset-password-form') } },
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    normalizeAccount: value => value,
    hashPassword: async () => 'fixture-hash',
    buildLocalAccount,
    makeId: () => 'registration-request-id',
    addLocalAccount: () => { throw new Error('Local account authorization is forbidden.'); },
    loadStateForUser: () => records,
    mergeCloudState: (first, second) => ({ ...first, ...second }),
    createBaseState: () => ({}),
    setCurrentUserId: (auth, id) => { auth.currentUserId = id; },
    saveAuth: () => { calls.push('save-auth'); savedTokens.push(appState.cloudConfig.token); },
    saveCloudConfig: () => calls.push('save-cloud'),
    migrateLegacyState: () => calls.push('migrate'),
    showAuthMessage: (message, error = false) => messages.push({ message, error }),
    getAuthErrorMessage: error => error?.message || 'unknown-auth-error',
    getVerificationErrorMessage: error => error?.message || 'unknown-verification-error',
    renderSession: () => { calls.push('render'); appState.currentUser = appState.auth.accounts.find(item => item.id === appState.auth.currentUserId) || null; },
    applyCloudSession: (payload, options) => {
      calls.push('apply-cloud');
      appliedOptions.push(options);
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
  deps.registerCloudAccount = login;
  deps.elements.registerInviteCode = { value: 'QG-ReAuth-Fixture' };
  deps.elements.registerName = { value: 'Fixture New' };
  deps.elements.registerEmail = { value: account.email };
  deps.elements.registerPassword = { value: 'fixture-password' };
  deps.elements.registerVerificationCode = { value: '123456' };
  deps.elements.registerForm = { dataset: {}, reset: () => calls.push('reset-register-form') };
  const controller = createAccountAuthController(deps);
  return { controller, deps, appState, records, userState, messages, calls, savedTokens, appliedOptions, get cloudCalls() { return cloudCalls; } };
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
  compatibility: { dependency: 'loginCloudAccount', run: harness => harness.controller.loginDeviceAccount() },
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

test('the former device-only entry requires a server session and uses its canonical identity', async () => {
  for (const run of [h => h.controller.loginDeviceAccount(), h => h.controller.loginLocal({ deviceOnly: true })]) {
    const remote = { ...localAccount, id: 'canonical-server-owner' };
    const harness = setup({ recovery: true, session: { token: 'verified-token', account: remote } });
    const savedRecords = structuredClone(harness.records);
    await run(harness);
    assert.equal(harness.cloudCalls, 1);
    assert.equal(harness.appState.currentUser.id, remote.id);
    assert.equal(harness.appState.cloudConfig.token, 'verified-token');
    assert.equal(harness.appState.cloudConfig.userId, remote.id);
    assert.equal(harness.calls.includes('cancel-recovery'), false);
    assert.equal(harness.calls.includes('save-cloud'), false);
    assert.equal(harness.calls.includes('apply-cloud'), true);
    assert.deepEqual(harness.records, savedRecords);
  }
});

test('the former device-only entry cannot authorize offline or clear saved session credentials', async () => {
  for (const run of [h => h.controller.loginDeviceAccount(), h => h.controller.loginLocal({ deviceOnly: true })]) {
    for (const status of [undefined, 401, 500]) {
      const harness = setup({ recovery: true, failure: cloudError(status) });
      const before = structuredClone(harness.appState);
      await run(harness);
      assert.deepEqual(harness.appState, before);
      assert.equal(harness.cloudCalls, 1);
      assert.equal(harness.calls.includes('save-auth'), false);
      assert.equal(harness.calls.includes('save-cloud'), false);
      assert.equal(harness.calls.includes('cancel-recovery'), false);
      assert.equal(harness.calls.includes('render'), false);
      assert.equal(harness.messages.at(-1).error, true);
    }
  }
});

test('a missing server account remains unauthenticated through the former device entry', async () => {
  const harness = setup({ recovery: true, failure: cloudError(401) });
  harness.deps.checkCloudAccountStatus = async () => ({ exists: false });
  await harness.controller.loginLocal();
  await harness.controller.loginDeviceAccount();
  assert.equal(harness.appState.currentUser, null);
  assert.equal(harness.messages.at(-1).message, 'authCloudAccountMissing');
  assert.equal(harness.appState.cloudConfig.token, 'expired-fixture-token');
  assert.equal(harness.cloudCalls, 2);
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

test('owner migration is bound to this successful cloud login and matching device password', async () => {
  const remote = { ...localAccount, id: 'server-owner' };
  const harness = setup({ session: { token: 'verified-server-token', account: remote } });
  await harness.controller.loginLocal();
  assert.deepEqual(harness.appliedOptions[0].careerOwnerLink, {
    sourceOwnerId: 'local:fixture', targetOwnerId: 'server-owner', method: 'password',
  });
  assert.equal(harness.appState.currentUser.id, 'server-owner');
});

test('same email without the matching device password cannot migrate a different owner', async () => {
  const harness = setup({ session: { token: 'verified-server-token', account: { ...localAccount, id: 'server-owner' } } });
  harness.appState.auth.accounts[0].passwordHash = 'different-device-password';
  await harness.controller.loginLocal();
  assert.equal(harness.appliedOptions[0].careerOwnerLink, undefined);
});

test('a cloud identity with an unexpected email cannot link a cached owner', async () => {
  const harness = setup({ session: { token: 'verified-server-token', account: { ...localAccount, id: 'server-owner', email: 'another@example.test' } } });
  await harness.controller.loginLocal();
  assert.equal(harness.appliedOptions.length, 0);
  assert.equal(harness.appState.currentUser, null);
});

test('verified Google credentials link the exact subject owner, not another cached email owner', async () => {
  const harness = setup({ provider: 'google', session: { token: 'verified-google-token', account: { ...googleAccount, id: 'server-google-owner' } } });
  harness.appState.auth.accounts.push({ ...localAccount, id: 'unrelated-local-owner' });
  await harness.controller.handleGoogleCredential({ credential: 'fixture-credential' });
  assert.deepEqual(harness.appliedOptions[0].careerOwnerLink, {
    sourceOwnerId: 'google:fixture', targetOwnerId: 'server-google-owner', method: 'google',
  });
});

test('password reset never guesses an old device owner from email alone', async () => {
  const harness = setup({ session: { token: 'verified-reset-token', account: { ...localAccount, id: 'server-owner' } } });
  await harness.controller.resetPassword();
  assert.equal(harness.appliedOptions[0].careerOwnerLink, undefined);
});

test('a migration conflict is explicit and never silently finishes authentication', async () => {
  for (const provider of ['local', 'google']) {
    const harness = setup({ provider });
    harness.deps.applyCloudSession = () => { throw Object.assign(new Error('原始记录已保留，请解决投递记录冲突。'), { code: 'CAREER_OWNER_MIGRATION_FAILED' }); };
    await (provider === 'local' ? harness.controller.loginLocal() : harness.controller.handleGoogleCredential({ credential: 'fixture-credential' }));
    assert.equal(harness.messages.at(-1).message, '原始记录已保留，请解决投递记录冲突。');
    assert.equal(harness.messages.at(-1).error, true);
    assert.equal(harness.appState.currentUser, null);
    assert.equal(harness.calls.includes('render'), false);
  }
});

test('registration failures never create a device account or change saved records and credentials', async () => {
  for (const status of [undefined, 400, 401, 409, 429, 500]) {
    const harness = setup({ failure: cloudError(status) });
    const before = structuredClone(harness.appState);
    await harness.controller.registerLocal();
    assert.deepEqual(harness.appState, before);
    assert.equal(harness.cloudCalls, 1);
    assert.equal(harness.calls.includes('migrate'), false);
    assert.equal(harness.calls.includes('save-auth'), false);
    assert.equal(harness.calls.includes('render'), false);
    assert.equal(harness.messages.at(-1).error, true);
    assert.equal(harness.userState.value, harness.records);
  }
});

test('registration rejects malformed or mismatched server sessions', async () => {
  for (const session of [null, {}, { token: '', account: localAccount }, { token: 'token', account: { id: '' } }, { token: 'token', account: { ...localAccount, email: 'wrong@example.test' } }]) {
    const harness = setup({ session });
    const before = structuredClone(harness.appState);
    await harness.controller.registerLocal();
    assert.deepEqual(harness.appState, before);
    assert.equal(harness.calls.includes('apply-cloud'), false);
    assert.equal(harness.messages.at(-1).error, true);
  }
});

test('a stale verificationOptional flag never bypasses required registration verification', async () => {
  const harness = setup();
  harness.deps.elements.registerForm.dataset.verificationOptional = 'true';
  harness.deps.elements.registerVerificationCode.value = '';
  await harness.controller.registerLocal();
  assert.equal(harness.cloudCalls, 0);
  assert.equal(harness.calls.includes('save-auth'), false);
  assert.equal(harness.messages.at(-1).message, 'authNeedVerificationCode');
});

test('verification service failure disables no checks and retains the old local profile', async () => {
  const harness = setup();
  const before = structuredClone(harness.appState);
  harness.deps.elements.registerForm.dataset.verificationOptional = 'true';
  let sends = 0;
  harness.deps.sendCloudVerificationCode = async (email, purpose) => {
    sends += 1;
    assert.equal(email, localAccount.email);
    assert.equal(purpose, 'register');
    throw cloudError();
  };
  await harness.controller.sendRegisterVerificationCode();
  assert.equal(sends, 1, 'the cached email must not block a server verification request');
  assert.equal(harness.deps.elements.registerForm.dataset.verificationOptional, undefined);
  assert.deepEqual(harness.appState, before);
  assert.equal(harness.messages.at(-1).message, 'authCloudVerificationUnavailable');
});

test('server account existence, not cached profiles, decides the email flow', async () => {
  for (const exists of [true, false]) {
    const harness = setup();
    harness.deps.elements.loginPassword.value = '';
    let queries = 0;
    harness.deps.checkCloudAccountStatus = async () => { queries += 1; return { exists }; };
    await harness.controller.submitEmailAuth();
    assert.equal(queries, 1);
    assert.equal(harness.deps.elements.loginForm.dataset.authStep, exists ? 'password' : 'email');
    if (!exists) assert.equal(harness.deps.elements.registerEmail.value, localAccount.email);
    assert.equal(harness.appState.currentUser, null);
  }
});

test('successful registration uses the server ID and recovers all proven old owner IDs', async () => {
  const remote = { ...localAccount, id: 'registered-server-owner' };
  const harness = setup({ session: { token: 'registered-session', account: remote } });
  harness.appState.auth.legacyAccounts = [
    { ...localAccount, id: 'older-proven-owner' },
    { ...localAccount, id: 'unproved-owner', passwordHash: 'other-password' },
    { ...localAccount, id: 'wrong-email-owner', email: 'other@example.test' },
  ];
  await harness.controller.registerLocal();
  assert.equal(harness.appState.currentUser.id, remote.id);
  assert.equal(harness.appState.cloudConfig.token, 'registered-session');
  assert.deepEqual(harness.appliedOptions[0].careerOwnerLinks.map(link => link.sourceOwnerId).sort(), ['local:fixture', 'older-proven-owner']);
  assert.ok(harness.appliedOptions[0].careerOwnerLinks.every(link => link.targetOwnerId === remote.id && link.method === 'password'));
  assert.equal(harness.calls.includes('migrate'), false);
  assert.equal(harness.messages.at(-1).message, 'authCreatedSynced');
  assert.equal(harness.appState.auth.accounts.some(account => account.id === 'registration-request-id'), false);
  assert.equal(harness.appState.auth.legacyAccounts.some(account => account.id === 'unproved-owner'), true);
});

test('registration migration failure leaves identity unmodified and never falls back locally', async () => {
  const harness = setup();
  const before = structuredClone(harness.appState);
  harness.deps.applyCloudSession = () => { throw Object.assign(new Error('原始记录已保留。'), { code: 'CAREER_OWNER_MIGRATION_FAILED' }); };
  await harness.controller.registerLocal();
  assert.deepEqual(harness.appState, before);
  assert.equal(harness.calls.includes('render'), false);
  assert.equal(harness.calls.includes('save-auth'), false);
  assert.equal(harness.messages.at(-1).message, '原始记录已保留。');
});

test('a pending registration cannot replace a later login or mutate records after logout', async () => {
  for (const next of ['login', 'logout']) {
    const harness = setup();
    const pending = deferred();
    let registrationRequested = false;
    harness.deps.registerCloudAccount = () => { registrationRequested = true; return pending.promise; };
    const registration = harness.controller.registerLocal();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(registrationRequested, true);
    if (next === 'login') await harness.controller.loginLocal();
    else harness.controller.logout();
    const before = structuredClone(harness.appState);
    const calls = [...harness.calls];
    pending.resolve({ token: 'late-register-token', account: { ...localAccount, id: 'late-new-owner' } });
    await registration;
    assert.deepEqual(harness.appState, before);
    assert.deepEqual(harness.calls, calls);
  }
});

test('unproved same-email state is not merged by login, registration, or password reset', async () => {
  for (const method of ['loginLocal', 'registerLocal', 'resetPassword']) {
    const remote = { ...localAccount, id: 'canonical-server-owner' };
    const harness = setup({ session: { token: 'verified-server-session', account: remote } });
    harness.appState.auth.accounts[0].passwordHash = 'unproved-password';
    const loaded = [];
    harness.deps.loadStateForUser = id => { loaded.push(id); return harness.records; };
    await harness.controller[method]();
    assert.deepEqual(loaded, [remote.id], method);
    assert.equal(harness.appliedOptions[0].careerOwnerLink, undefined);
    assert.equal(harness.appState.auth.legacyAccounts[0].passwordHash, 'unproved-password');
  }
});

test('legacy profile recovery metadata survives normalization but never resolves as the current user', () => {
  const auth = { accounts: [localAccount], legacyAccounts: [{ ...localAccount, id: 'older' }], currentUserId: localAccount.id };
  const server = { ...localAccount, id: 'server', cloudLinked: true };
  upsertAuthAccount(auth, server, { localFields: { passwordHash: 'server-password' } });
  assert.deepEqual(auth.accounts.map(account => account.id), ['server']);
  assert.deepEqual(auth.legacyAccounts.map(account => account.id), ['older', localAccount.id]);
  assert.equal(auth.legacyAccounts[1].passwordHash, 'fixture-hash');
  const saved = normalizeAuth(JSON.parse(JSON.stringify(auth)));
  assert.deepEqual(saved.legacyAccounts, auth.legacyAccounts);
  assert.equal(getCurrentUser(saved).id, 'server');
  saved.currentUserId = localAccount.id;
  assert.equal(getCurrentUser(saved), null);
  upsertAuthAccount(auth, server);
  assert.equal(auth.legacyAccounts.length, 2, 'repeated login must not duplicate recovery entries');
});
