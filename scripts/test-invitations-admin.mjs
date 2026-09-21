import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountPageApi } from '../src/app/services/accountPageApi.js';

function fixture(handler = async () => ({ invitations: [] })) {
  const appState = { currentUser: { id: 'admin' }, cloudConfig: { userId: 'admin', token: 'fixture-token' } };
  const calls = [];
  const api = createAccountPageApi({ appState, cloudApi: async (...args) => { calls.push(args); return handler(...args); } });
  return { api, appState, calls };
}

test('admin can create invitations and revoke a selected record through authenticated routes', async () => {
  const { api, calls } = fixture();
  assert.equal((await api.createInvitations({ email: ' Invitee@Example.com ' })).ok, true);
  assert.deepEqual(calls[0], ['/admin/invitations', { method: 'POST', body: { count: 1, maxUses: 1, expiresInDays: 7, email: 'invitee@example.com' } }]);
  await api.listInvitations();
  await api.revokeInvitation('invite/one');
  assert.equal(calls[1][0], '/admin/invitations');
  assert.equal(calls[2][0], '/admin/invitations/invite%2Fone/revoke');
});

test('disconnected sessions and out-of-bounds invitation creation never send requests', async () => {
  const { api, appState, calls } = fixture();
  for (const value of [{ count: 51 }, { count: 1.5 }, { maxUses: 0 }, { maxUses: 1001 }, { expiresInDays: 0 }, { expiresInDays: 366 }]) {
    assert.equal((await api.createInvitations(value)).ok, false);
  }
  appState.cloudConfig.token = '';
  assert.equal((await api.listInvitations()).ok, false);
  assert.equal((await api.createInvitations()).ok, false);
  assert.equal(calls.length, 0);
});

test('one-time codes from an old session cannot leak into a switched account', async () => {
  let finish;
  const { api, appState } = fixture(() => new Promise(resolve => { finish = resolve; }));
  const pending = api.createInvitations();
  appState.currentUser = { id: 'different-user' };
  finish({ invitations: [{ id: 'invite', code: 'secret-fixture-code' }] });
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.code, 'sessionChanged');
  assert.equal(result.invitations, undefined);
});

test('permission failure is actionable and does not expose server internals', async () => {
  const { api } = fixture(async () => { throw Object.assign(new Error('private server detail'), { status: 403 }); });
  const result = await api.createInvitations();
  assert.equal(result.code, 'forbidden');
  assert.match(result.message, /仅管理员/);
  assert.ok(!result.message.includes('private server detail'));
});
