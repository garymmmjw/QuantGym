import test from 'node:test';
import assert from 'node:assert/strict';
import { describeAccountSession, getCloudSessionStatus, reportCloudSessionResponse, verifyCloudSession } from '../src/state/cloudSessionStatus.js';
import { beginCloudReauthentication, clearCloudReauthentication, getCloudReauthentication, safeReturnPath } from '../src/state/cloudReauthentication.js';

const config = (token, userId = 'test-user') => ({ endpoint: 'https://api.example.test/api', userId, token });

test('expired credentials cannot mark a new account or session as expired', () => {
  const previous = config('old');
  const current = config('new');
  reportCloudSessionResponse(current, 200);
  reportCloudSessionResponse(previous, 401);
  assert.equal(getCloudSessionStatus(current).phase, 'connected');
  assert.equal(getCloudSessionStatus(previous).phase, 'expired');
  assert.equal(getCloudSessionStatus(config('old', 'another-user')).phase, 'unknown');
});

test('a late success cannot erase an invalidated session, and 403 is not expiry', () => {
  const rejected = config('rejected');
  reportCloudSessionResponse(rejected, 401);
  reportCloudSessionResponse(rejected, 200);
  assert.equal(getCloudSessionStatus(rejected).phase, 'expired');
  const restricted = config('restricted');
  reportCloudSessionResponse(restricted, 200);
  reportCloudSessionResponse(restricted, 403);
  assert.equal(getCloudSessionStatus(restricted).phase, 'connected');
  reportCloudSessionResponse({}, 401);
  assert.equal(getCloudSessionStatus({}).phase, 'signed-out');
});

test('verification is shared and does not retry invalid credentials', async () => {
  const current = config('verify');
  let calls = 0;
  let finish;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.example.test/api/account');
    assert.equal(options.headers.Authorization, 'Bearer verify');
    return await new Promise(resolve => { finish = resolve; });
  };
  const first = verifyCloudSession(current, { fetchImpl });
  const second = verifyCloudSession(current, { fetchImpl });
  finish({ ok: false, status: 401 });
  await Promise.all([first, second]);
  await verifyCloudSession(current, { fetchImpl });
  assert.equal(calls, 1);
  assert.equal(getCloudSessionStatus(current).phase, 'expired');
});

test('temporary network failures do not claim the account has expired', async () => {
  const current = config('offline');
  await verifyCloudSession(current, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(getCloudSessionStatus(current).phase, 'offline');
});

test('credentials alone cannot present a signed-in identity after logout or account switch', () => {
  const current = config('identity-isolation');
  reportCloudSessionResponse(current, 200);
  assert.equal(getCloudSessionStatus(current, null).phase, 'signed-out');
  const anotherUser = { id: 'another-user', cloudLinked: true };
  assert.equal(getCloudSessionStatus(current, anotherUser).phase, 'expired');
  const presentation = describeAccountSession(null, current);
  assert.equal(presentation.identity, 'signed-out');
  assert.equal(presentation.label, '未登录');
  assert.equal(presentation.canManageAccount, false);
});

test('missing credentials distinguish verified identities from legacy records without inventing another account type', () => {
  const legacy = { id: 'legacy-user', provider: 'local' };
  const pending = describeAccountSession(legacy, {});
  assert.equal(pending.phase, 'verification-required');
  assert.equal(pending.label, '需要完成账号验证');
  assert.equal(pending.needsVerification, true);
  assert.equal(pending.canManageAccount, false);
  const verified = { ...legacy, cloudLinked: true };
  const expired = describeAccountSession(verified, {});
  assert.equal(expired.identity, 'verified');
  assert.equal(expired.phase, 'expired');
  assert.equal(expired.label, '登录已过期');
  assert.equal(expired.needsVerification, false);
  assert.equal(expired.canManageAccount, false);
});

test('email provider remains the same verified identity while offline and only a confirmed connection enables security changes', async () => {
  const user = { id: 'test-user', provider: 'local' };
  const current = config('verified-email');
  let view = describeAccountSession(user, current);
  assert.equal(view.identity, 'verified');
  assert.equal(view.label, '已登录');
  assert.equal(view.canManageAccount, false);
  reportCloudSessionResponse(current, 200);
  view = describeAccountSession(user, current);
  assert.equal(view.canManageAccount, true);
  const browserOffline = describeAccountSession(user, current, undefined, { online: false });
  assert.equal(browserOffline.identity, 'verified');
  assert.equal(browserOffline.label, '离线待同步');
  assert.equal(browserOffline.canManageAccount, false);
  await verifyCloudSession(current, { force: true, fetchImpl: async () => { throw new Error('offline'); } });
  view = describeAccountSession(user, current);
  assert.equal(view.identity, 'verified');
  assert.equal(view.phase, 'offline');
  assert.equal(view.needsVerification, false);
});

test('connection return can immediately retry a cached network failure but cannot bypass an expired session', async () => {
  const current = config('online-retry');
  let calls = 0;
  await verifyCloudSession(current, { now: () => 1000, fetchImpl: async () => { calls++; throw new Error('offline'); } });
  await verifyCloudSession(current, { now: () => 1100, fetchImpl: async () => { calls++; return { ok: true, status: 200 }; } });
  assert.equal(calls, 1);
  await verifyCloudSession(current, { force: true, now: () => 1200, fetchImpl: async () => { calls++; return { ok: true, status: 200 }; } });
  assert.equal(calls, 2);
  assert.equal(getCloudSessionStatus(current).phase, 'connected');
  reportCloudSessionResponse(current, 401);
  await verifyCloudSession(current, { force: true, fetchImpl: async () => { calls++; return { ok: true, status: 200 }; } });
  assert.equal(calls, 2);
  const expired = describeAccountSession({ id: 'test-user', cloudLinked: true }, current, undefined, { online: false, en: true });
  assert.equal(expired.label, 'Session expired');
  assert.equal(expired.canManageAccount, false);
});

test('an endpoint permission denial does not revoke identity or allow security changes', async () => {
  const current = config('account-restricted');
  await verifyCloudSession(current, { fetchImpl: async () => ({ ok: false, status: 403 }) });
  const view = describeAccountSession({ id: 'test-user', cloudLinked: true }, current);
  assert.equal(view.phase, 'restricted');
  assert.equal(view.identity, 'verified');
  assert.equal(view.label, '已登录');
  assert.equal(view.canManageAccount, false);
});

test('recovery retains only account identity and a safe return destination', () => {
  for (const path of ['//evil.example', 'https://evil.example', '/\\evil.example', '/login', '/login?next=/leetcode']) {
    assert.equal(safeReturnPath(path), '/account');
  }
  const record = beginCloudReauthentication({ ownerId: 'test-user', email: 'test@example.test', returnTo: '/leetcode?review=1#history' });
  assert.deepEqual(getCloudReauthentication(), record);
  assert.equal(record.returnTo, '/leetcode?review=1#history');
  clearCloudReauthentication();
  assert.equal(getCloudReauthentication(), null);
});
