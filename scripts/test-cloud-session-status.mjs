import test from 'node:test';
import assert from 'node:assert/strict';
import { getCloudSessionStatus, reportCloudSessionResponse, verifyCloudSession } from '../src/state/cloudSessionStatus.js';
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
  assert.equal(getCloudSessionStatus({}).phase, 'local');
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
