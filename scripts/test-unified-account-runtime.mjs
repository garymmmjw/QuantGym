import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStateRuntime } from '../src/state/authRuntime.js';
import { syncAccountData } from '../src/features/account/accountDataSync.js';
import { syncSettingsCloudNow } from '../src/modules/settings/cloudStatus.js';

function runtime(account, config = {}) {
  const auth = { accounts: [account], currentUserId: account.id };
  return { auth, config, instance: createAuthStateRuntime({ getAuth: () => auth, getCloudConfig: () => config }) };
}
test('legacy local identities cannot become signed-in sessions at startup; recovery index is untouched', () => {
  const h = runtime({ id: 'old', email: 'old@example.test', provider: 'local', passwordHash: 'retained' });
  const before = structuredClone(h.auth);
  assert.equal(h.instance.currentUser(), null);
  assert.deepEqual(h.auth, before);
});
test('verified email and Google identities keep their offline cache without becoming local accounts', () => {
  for (const provider of ['local', 'google']) {
    const account = { id: 'verified', provider, cloudLinked: true };
    const h = runtime(account);
    assert.equal(h.instance.currentUser(), account);
    h.auth.currentUserId = null;
    assert.equal(h.instance.currentUser(), null);
  }
});
test('matching existing session restores older verified accounts, unrelated credentials do not', () => {
  const account = { id: 'canonical', provider: 'local' };
  const h = runtime(account, { userId: 'canonical', token: 'fixture' });
  assert.equal(h.instance.currentUser(), account);
  h.config.userId = 'another';
  assert.equal(h.instance.currentUser(), null);
});

function syncHarness({ profile = { ok: true }, personal = { phase: 'synced' }, workspaceError = '', storeError = '' } = {}) {
  const calls = [];
  const session = { user: { id: 'owner' }, config: { endpoint: 'https://fixture.invalid/api', userId: 'owner', token: 'fixture' } };
  const storeSnapshot = { data: {}, error: storeError };
  const store = { getSnapshot: () => storeSnapshot };
  const args = {
    getSession: () => session, storage: null, eventTarget: null,
    syncProfile: async () => { calls.push('profile'); return profile; },
    registry: {
      getStore: owner => { assert.equal(owner, 'owner'); return store; },
      syncOwner: async (owner, config) => { assert.equal(owner, 'owner'); assert.deepEqual(config, session.config); calls.push('personal'); return personal; }
    },
    getWorkspace: ({ personalStore }) => {
      assert.equal(personalStore, store);
      return { retain() { calls.push('retain'); return () => calls.push('release'); }, getSnapshot: () => ({ error: workspaceError }) };
    }
  };
  return { args, calls, session, storeSnapshot };
}
test('unified sync migrates Tracker first, waits for both writers and releases workspace', async () => {
  const h = syncHarness();
  const result = await syncAccountData(h.args);
  assert.equal(result.ok, true);
  assert.deepEqual(h.calls, ['retain', 'profile', 'personal', 'release']);
});
for (const phase of ['local', 'pending', 'syncing', 'auth', 'error']) {
  test(`personal phase ${phase} cannot be reported as all data synced`, async () => {
    const h = syncHarness({ personal: { phase } });
    assert.equal((await syncAccountData(h.args)).ok, false);
    assert.equal(h.calls.at(-1), 'release');
  });
}
test('successful Tracker sync cannot hide a failure in the other account records', async () => {
  const h = syncHarness({ profile: { ok: false } });
  assert.equal((await syncAccountData(h.args)).ok, false);
});
test('Tracker migration failure prevents upload and retains originals', async () => {
  const h = syncHarness({ workspaceError: 'storage failure' });
  assert.equal((await syncAccountData(h.args)).ok, false);
  assert.deepEqual(h.calls, ['retain', 'release']);
});
test('local persistence error cannot be reported as success', async () => {
  const h = syncHarness({ storeError: 'quota exceeded' });
  assert.equal((await syncAccountData(h.args)).ok, false);
});
for (const field of ['token', 'endpoint', 'userId']) {
  test(`unified sync rejects completion after session ${field} changes`, async () => {
    const h = syncHarness();
    h.args.syncProfile = async () => { queueMicrotask(() => { h.session.config[field] = 'switched'; }); return { ok: true }; };
    assert.equal((await syncAccountData(h.args)).code, 'sessionChanged');
    assert.equal(h.calls.at(-1), 'release');
  });
}
test('missing credentials do not upload any workspace', async () => {
  const h = syncHarness(); h.session.config.token = '';
  assert.equal((await syncAccountData(h.args)).code, 'reauthRequired');
  assert.deepEqual(h.calls, []);
});
test('manual settings sync forwards actual failure rather than old status text', async () => {
  const config = { userId: 'owner', token: 'fixture', lastSyncAt: 'old-success' };
  let marked = 0;
  const result = await syncSettingsCloudNow({}, config, {
    currentUser: { id: 'owner' }, getSyncController: () => ({ markAllDirty: () => marked++ }),
    flushSync: async () => ({ ok: false }), getStatusText: () => 'Previously synced'
  });
  assert.equal(result.ok, false); assert.equal(marked, 1);
});

test('new Tracker edits while profile sync is still pending cannot reuse an earlier personal success', async () => {
  const h = syncHarness();
  let finishProfile;
  h.args.syncProfile = () => new Promise(resolve => { finishProfile = resolve; });
  const operation = syncAccountData(h.args);
  await new Promise(resolve => setImmediate(resolve));
  h.storeSnapshot.data = { newer: true };
  finishProfile({ ok: true });
  assert.equal((await operation).code, 'incomplete');
});

test('manual sync flushes edits made during the first request before reporting completion', async () => {
  let calls = 0;
  let dirty = true;
  const result = await syncSettingsCloudNow({}, { userId: 'owner', token: 'fixture' }, {
    currentUser: { id: 'owner' }, getSyncController: () => ({ markAllDirty() {}, getDirty: () => ({ state: dirty }) }),
    flushSync: async () => { calls++; if (calls === 2) dirty = false; return { ok: true }; }
  });
  assert.equal(calls, 2); assert.equal(result.ok, true);
});
test('continuous edits cannot produce a false manual sync success', async () => {
  let calls = 0;
  const result = await syncSettingsCloudNow({}, { userId: 'owner', token: 'fixture' }, {
    currentUser: { id: 'owner' }, getSyncController: () => ({ markAllDirty() {}, getDirty: () => ({ state: true }) }),
    flushSync: async () => { calls++; return { ok: true }; }
  });
  assert.equal(calls, 3); assert.equal(result.ok, false);
});

test('auth persistence reports failure to recovery callers', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { throw new Error('Storage full'); } } });
  try { assert.equal(runtime({ id: 'owner', cloudLinked: true }).instance.save(), false); }
  finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
});
