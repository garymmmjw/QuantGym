import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthCloudClient } from '../src/api/authCloudClient.js';
import { createAccountAuthController } from '../src/modules/account/authController.js';
import { getAuthErrorMessage, getVerificationErrorMessage } from '../src/state/auth.js';

const invitation = 'QG-Fixture_abC9-InvITe';
const email = 'invited@example.invalid';
const account = { id: 'local:fixture', provider: 'local', email, name: 'Fixture', passwordHash: 'fixture-hash' };
const session = { account, token: 'fixture-token' };
const failure = (message, status) => Object.assign(new Error(message), status ? { status } : {});

function element(value = '') {
  const classes = new Set();
  return {
    value, dataset: {}, focused: false,
    classList: { toggle: (key, force) => force ? classes.add(key) : classes.delete(key), remove: key => classes.delete(key), contains: key => classes.has(key) },
    focus() { this.focused = true; }, reset() {}
  };
}

function fixture(overrides = {}) {
  const elements = Object.fromEntries([
    'loginForm', 'loginEmail', 'loginPassword', 'registerForm', 'registerInviteCode',
    'registerName', 'registerEmail', 'registerPassword', 'registerVerificationCode',
    'resetPasswordForm', 'resetPasswordEmail', 'resetPasswordNewPassword', 'resetPasswordVerificationCode'
  ].map(id => [id, element()]));
  Object.assign(elements.registerInviteCode, { value: invitation });
  elements.registerName.value = account.name;
  elements.registerEmail.value = email;
  elements.registerPassword.value = 'fixture-password';
  elements.registerVerificationCode.value = '123456';
  const appState = { auth: { accounts: [] }, community: {}, cloudConfig: {} };
  const calls = { sent: [], registered: [], google: [], saved: 0, rendered: 0, applied: [], messages: [], tabs: [] };
  const deps = {
    elements, getAppState: () => appState,
    t: key => key,
    normalizeAccount: value => value,
    mergeCloudState: (left, right) => ({ ...left, ...right }),
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    getCloudAuthConfig: async () => ({ inviteRequired: true }),
    showAuthMessage: (...args) => calls.messages.push(args),
    sendCloudVerificationCode: async (...args) => { calls.sent.push(args); return { ok: true, delivery: 'email' }; },
    registerCloudAccount: async (...args) => { calls.registered.push(args); return session; },
    loginCloudGoogle: async (...args) => { calls.google.push(args); return session; },
    buildLocalAccount: async () => ({ ...account }),
    parseJwt: () => ({ aud: 'client', sub: 'google-user', email, name: 'Google Fixture' }),
    getGoogleClientId: () => 'client',
    buildGoogleAccountFromPayload: payload => ({ id: `google:${payload.sub}`, email: payload.email, provider: 'google' }),
    loadStateForUser: () => ({ problemStates: [] }), createBaseState: () => ({}),
    applyCloudSession: (...args) => { calls.applied.push(args); appState.auth.accounts = [args[0].account]; },
    addLocalAccount: () => { throw new Error('Must never create a local signup fallback'); },
    applyGoogleAccount: () => { throw new Error('Google must never authenticate before the API'); },
    saveAuth: () => { calls.saved++; },
    renderSession: () => { calls.rendered++; },
    switchAuthTab: tab => calls.tabs.push(tab),
    getVerificationErrorMessage, getAuthErrorMessage,
    ...overrides
  };
  return { controller: createAccountAuthController(deps), elements, appState, calls };
}

test('invitation travels in signup request bodies only, never account/state or reset/login payloads', async () => {
  const requests = [];
  const client = createAuthCloudClient({ cloudApi: async (path, options) => { requests.push({ path, ...options }); return {}; } });
  const state = { problemStates: [], problems: [] };
  await client.authConfig();
  await client.sendVerificationCode(email, 'register', invitation);
  await client.registerAccount(account, 'password', state, {}, '123456', invitation);
  await client.loginGoogle(account, 'credential', state, {}, invitation);
  await client.sendVerificationCode(email, 'password_reset', invitation);
  await client.loginAccount(email, 'password');
  await client.resetPassword(email, 'password', '123456');
  assert.deepEqual(requests[0], { path: '/auth/config', auth: false });
  for (const request of requests.slice(1, 4)) {
    assert.equal(request.body.inviteCode, invitation);
    assert.equal(request.auth, false);
    assert.equal(JSON.stringify(request.body.account || {}).includes(invitation), false);
    assert.equal(JSON.stringify(request.body.state || {}).includes(invitation), false);
  }
  for (const request of requests.slice(4)) assert.equal('inviteCode' in request.body, false);
  assert.equal(JSON.stringify({ account, state }).includes(invitation), false);
});

test('missing invitation blocks both sending mail and creating the account', async () => {
  const { controller, elements, calls } = fixture();
  elements.registerInviteCode.value = '  ';
  await controller.sendRegisterVerificationCode();
  await controller.registerLocal();
  assert.equal(calls.sent.length, 0);
  assert.equal(calls.registered.length, 0);
  assert.equal(calls.saved, 0);
  assert.equal(elements.registerInviteCode.focused, true);
  assert.deepEqual(calls.messages.at(-1), ['authNeedInviteCode', true]);
});

for (const config of [undefined, {}, { inviteRequired: 'false' }, failure('Offline')]) {
  test(`unavailable or malformed config requires invitation: ${JSON.stringify(config)}`, async () => {
    const { controller, elements, calls } = fixture({ getCloudAuthConfig: async () => { if (config instanceof Error) throw config; return config; } });
    elements.registerInviteCode.value = '';
    await controller.sendRegisterVerificationCode();
    assert.equal(elements.registerForm.dataset.inviteRequired, 'true');
    assert.equal(calls.sent.length, 0);
  });
}

test('explicit server development config allows signup without an invitation but still verifies email', async () => {
  const { controller, elements, calls } = fixture({ getCloudAuthConfig: async () => ({ inviteRequired: false }) });
  elements.registerInviteCode.value = '';
  await controller.sendRegisterVerificationCode();
  assert.deepEqual(calls.sent, [[email, 'register', '']]);
  elements.registerVerificationCode.value = '';
  await controller.registerLocal();
  assert.equal(calls.registered.length, 0);
  assert.deepEqual(calls.messages.at(-1), ['authNeedVerificationCode', true]);
});

test('delivery is reported only after mail API succeeds and invitation is forwarded', async () => {
  let accept;
  const { controller, elements } = fixture({ sendCloudVerificationCode: (...args) => {
    assert.deepEqual(args, [email, 'register', invitation]);
    return new Promise(resolve => { accept = resolve; });
  } });
  const pending = controller.sendRegisterVerificationCode();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(elements.registerForm.dataset.verificationStatus, 'sending');
  assert.equal(elements.registerForm.dataset.verificationEmail, undefined);
  accept({ ok: true, delivery: 'email', cooldownSeconds: 60 });
  await pending;
  assert.equal(elements.registerForm.dataset.verificationStatus, 'sent');
  assert.equal(elements.registerForm.dataset.verificationEmail, email);
  assert.equal(JSON.stringify(elements.registerForm.dataset).includes(invitation), false);
});

for (const error of [failure('Offline'), failure('Invalid or unavailable invitation code', 403), failure('Email delivery failed', 502)]) {
  test(`mail failure never enables local signup fallback: ${error.message}`, async () => {
    const { controller, elements, appState, calls } = fixture({ sendCloudVerificationCode: async () => { throw error; } });
    await controller.sendRegisterVerificationCode();
    assert.notEqual(elements.registerForm.dataset.verificationStatus, 'sent');
    assert.notEqual(elements.registerForm.dataset.verificationOptional, 'true');
    assert.equal(calls.saved, 0);
    assert.deepEqual(appState.auth.accounts, []);
  });
}

for (const error of [failure('Offline'), failure('Invalid or unavailable invitation code', 403)]) {
  test(`registration failure never creates a local account: ${error.message}`, async () => {
    const { controller, elements, appState, calls } = fixture({ registerCloudAccount: async () => { throw error; } });
    elements.registerForm.dataset.verificationOptional = 'true';
    await controller.registerLocal();
    assert.equal(calls.saved, 0);
    assert.equal(calls.rendered, 0);
    assert.equal(calls.applied.length, 0);
    assert.deepEqual(appState.auth.accounts, []);
  });
}

test('successful signup authenticates once after API approval without persisting invitation', async () => {
  const { controller, calls, appState } = fixture();
  await controller.registerLocal();
  assert.equal(calls.registered[0][5], invitation);
  assert.equal(calls.registered[0][4], '123456');
  assert.equal(calls.saved, 1);
  assert.equal(calls.rendered, 1);
  assert.equal(JSON.stringify(appState).includes(invitation), false);
});

test('Google invitation error opens registration; retry sends entered invitation and only then authenticates', async () => {
  let tries = 0;
  const { controller, elements, calls, appState } = fixture({ loginCloudGoogle: async (...args) => {
    if (!tries++) throw failure('Invitation code is required', 403);
    assert.equal(args[4], invitation);
    return session;
  } });
  elements.registerInviteCode.value = '';
  await controller.handleGoogleCredential({ credential: 'fixture' });
  assert.deepEqual(calls.tabs, ['register']);
  assert.equal(elements.registerInviteCode.focused, true);
  assert.equal(elements.registerForm.dataset.verificationStatus, 'invite-required');
  assert.equal(calls.saved, 0);
  assert.deepEqual(appState.auth.accounts, []);
  elements.registerInviteCode.value = invitation;
  await controller.handleGoogleCredential({ credential: 'fixture' });
  assert.equal(calls.saved, 1);
  assert.equal(calls.rendered, 1);
  assert.equal(JSON.stringify(appState).includes(invitation), false);
});

for (const error of [failure('Offline'), failure('Invalid or unavailable invitation code', 403)]) {
  test(`Google signup cannot bypass cloud rejection: ${error.message}`, async () => {
    const { controller, calls, appState } = fixture({ loginCloudGoogle: async () => { throw error; } });
    await controller.handleGoogleCredential({ credential: 'fixture' });
    assert.equal(calls.saved, 0);
    assert.equal(calls.rendered, 0);
    assert.deepEqual(appState.auth.accounts, []);
  });
}

test('existing Google login needs no invitation and lets server identify the account', async () => {
  const { controller, elements, calls } = fixture();
  elements.registerInviteCode.value = '';
  await controller.handleGoogleCredential({ credential: 'fixture' });
  assert.equal(calls.google[0][4], '');
  assert.equal(calls.saved, 1);
});

test('Google invitation errors do not redirect an existing-account recovery into registration', async () => {
  const { controller, calls } = fixture({
    getCloudReauthentication: () => ({ ownerId: account.id, email }),
    loginCloudGoogle: async () => { throw failure('Invitation code is required', 403); }
  });
  await controller.handleGoogleCredential({ credential: 'fixture' });
  assert.deepEqual(calls.tabs, []);
  assert.equal(calls.saved, 0);
  assert.equal(calls.rendered, 0);
});

test('a stale Google invitation rejection cannot replace a newer successful email login', async () => {
  let rejectGoogle;
  const { controller, elements, calls, appState } = fixture({
    loginCloudGoogle: () => new Promise((resolve, reject) => { rejectGoogle = reject; }),
    loginCloudAccount: async () => session,
    hashPassword: async () => account.passwordHash
  });
  const google = controller.handleGoogleCredential({ credential: 'fixture' });
  await new Promise(resolve => setImmediate(resolve));
  elements.loginEmail.value = email;
  elements.loginPassword.value = 'fixture-password';
  await controller.loginLocal();
  const before = structuredClone(appState);
  const messages = [...calls.messages];
  rejectGoogle(failure('Invitation code is required', 403));
  await google;
  assert.deepEqual(appState, before);
  assert.deepEqual(calls.messages, messages);
  assert.deepEqual(calls.tabs, []);
  assert.equal(calls.saved, 1);
});

test('password reset and existing local login never consult invitation config', async () => {
  const { controller, elements, appState, calls } = fixture({
    getCloudAuthConfig: async () => { throw new Error('Must not call registration config'); },
    loginCloudAccount: async () => session,
    hashPassword: async () => account.passwordHash,
    setCurrentUserId: (auth, id) => { auth.currentUserId = id; }
  });
  appState.auth.accounts = [{ ...account }];
  elements.registerInviteCode.value = '';
  elements.loginEmail.value = email;
  elements.loginPassword.value = 'fixture-password';
  elements.resetPasswordEmail.value = email;
  await controller.sendPasswordResetCode();
  await controller.loginLocal();
  assert.deepEqual(calls.sent, [[email, 'password_reset']]);
  assert.equal(calls.applied[0][0].account.id, account.id);
  assert.equal(calls.saved, 1);
});

test('invitation errors have distinct messages from email verification and allowlist failures', () => {
  for (const format of [getAuthErrorMessage, getVerificationErrorMessage]) {
    assert.equal(format(failure('Invitation code is required', 403)), 'authNeedInviteCode');
    assert.equal(format(failure('Invalid or unavailable invitation code', 403)), 'authInvalidInviteCode');
    assert.equal(format(failure('Email is not on the beta allowlist', 403)), 'verificationForbidden');
  }
});
