import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountPageApi } from '../src/app/services/accountPageApi.js';
import { createAccountAuthController } from '../src/modules/account/authController.js';
import { upsertAuthAccount } from '../src/state/auth.js';
import { mergeCloudState } from '../src/state/data.js';
import { USER_STATE_PREFIX } from '../src/constants.js';
import { createTrackerStore, trackerStorageKey } from '../src/features/tracker/trackerStore.js';
import { personalStorageKey } from '../src/features/personal/personalStore.js';
import { projectTrackerOperations } from '../src/features/tracker/trackerSyncModel.js';

const email = 'owner@example.test';
const key = id => `${USER_STATE_PREFIX}.${id}`;
const hash = (address, password) => `${address}:${password}`;
const owner = { id: 'server-owner', email, provider: 'local', passwordHash: hash(email, 'new-password'), cloudLinked: true };
const legacy = { id: 'legacy-owner', email, provider: 'local', passwordHash: hash(email, 'old-password') };
function fixture() {
  const values = new Map();
  const storage = { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) };
  const appState = { currentUser: structuredClone(owner), auth: { accounts: [structuredClone(owner)], legacyAccounts: [structuredClone(legacy)], currentUserId: owner.id }, cloudConfig: { endpoint: 'https://fixture.invalid/api', userId: owner.id, token: 'current-token' } };
  const userState = { value: { entries: [{ id: 'current-entry' }] } };
  storage.setItem(key(owner.id), JSON.stringify(userState.value));
  storage.setItem(key(legacy.id), JSON.stringify({ entries: [{ id: 'old-entry' }] }));
  const tracker = createTrackerStore({ ownerId: legacy.id, storage });
  tracker.addApplication({ id: 'old-application', company: 'Original Co', role: 'Quant', prepPhase: '', season: '', events: [{ id: 'old-submitted', type: 'submitted', date: '2026-09-19', dueDate: '', dueTime: '' }] });
  const calls = [];
  const deps = { appState, userState, storage, userStateKey: key, mergeCloudState, localStatePayload: value => value,
    hashPassword: async (...args) => hash(...args),
    cloudApi: async path => { calls.push(path); return { account: structuredClone(owner) }; },
    saveAuth: () => { calls.push('save-auth'); return true; },
    syncAccountStores: () => calls.push('refresh'), queueCloudSync: () => calls.push('sync'),
  };
  return { deps, api: createAccountPageApi(deps), values, storage, appState, userState, calls };
}
const snapshot = values => [...values].sort(([a], [b]) => a.localeCompare(b));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('verified recovery merges old Tracker and training into the current owner without changing identity or password', async () => {
  const h = fixture();
  const sourceTracker = h.storage.getItem(trackerStorageKey(legacy.id));
  const sourceTraining = h.storage.getItem(key(legacy.id));
  const config = structuredClone(h.appState.cloudConfig);
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  const result = await h.api.restoreDeviceRecords({ password: 'old-password' });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.restored, 1);
  assert.deepEqual(h.appState.currentUser, owner);
  assert.deepEqual(h.appState.cloudConfig, config);
  assert.equal(h.appState.auth.currentUserId, owner.id);
  assert.equal(h.appState.auth.accounts[0].passwordHash, hash(email, 'new-password'));
  assert.equal(h.appState.auth.legacyAccounts[0].passwordHash, hash(email, 'old-password'));
  assert.deepEqual(h.userState.value.entries.map(item => item.id).sort(), ['current-entry', 'old-entry']);
  const personal = JSON.parse(h.storage.getItem(personalStorageKey(owner.id)));
  assert.equal(projectTrackerOperations(personal.data.careerTrackerOperations).applications[0].id, 'old-application');
  assert.equal(h.storage.getItem(trackerStorageKey(legacy.id)), sourceTracker);
  assert.equal(h.storage.getItem(key(legacy.id)), sourceTraining);
  assert.equal(h.api.getDeviceRecordRecovery().count, 0);
  assert.deepEqual(h.calls, ['/account', 'save-auth', 'refresh', 'sync']);
});

test('new source records after recovery make the preserved profile recoverable again', async () => {
  const h = fixture();
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, true);
  h.storage.setItem(key(legacy.id), JSON.stringify({ entries: [{ id: 'old-entry' }, { id: 'later-entry' }] }));
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, true);
  assert.deepEqual(h.userState.value.entries.map(item => item.id).sort(), ['current-entry', 'later-entry', 'old-entry']);
  assert.equal(h.api.getDeviceRecordRecovery().count, 0);
});

test('newer target records saved by another tab join live drafts and restored records', async () => {
  const h = fixture();
  h.storage.setItem(key(owner.id), JSON.stringify({ entries: [{ id: 'target-new-from-other-tab' }] }));
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, true);
  assert.deepEqual(h.userState.value.entries.map(item => item.id).sort(), ['current-entry', 'old-entry', 'target-new-from-other-tab']);
});

test('corrupt target storage cannot be replaced by a stale in-memory copy', async () => {
  const h = fixture();
  h.storage.setItem(key(owner.id), '{broken');
  const before = snapshot(h.values);
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
  assert.deepEqual(snapshot(h.values), before);
});

test('unarchived same-email old profiles are recoverable, while other owners and emails are excluded', async () => {
  const h = fixture();
  h.appState.auth.accounts.push(h.appState.auth.legacyAccounts.pop());
  h.appState.auth.legacyAccounts.push({ ...legacy, id: 'other', email: 'other@example.test' });
  h.storage.setItem(key('other'), JSON.stringify({ entries: [{ id: 'other-entry' }] }));
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, true);
  assert.equal(h.userState.value.entries.some(item => item.id === 'other-entry'), false);
});

test('wrong original passwords cannot request verification, modify storage, or authenticate an old profile', async () => {
  const h = fixture();
  const before = snapshot(h.values), auth = structuredClone(h.appState);
  assert.equal((await h.api.restoreDeviceRecords({ password: 'wrong' })).code, 'wrongPassword');
  assert.deepEqual(h.calls, []);
  assert.deepEqual(snapshot(h.values), before);
  assert.deepEqual(h.appState, auth);
});

test('a canonical server session is required even with a correct original password', async () => {
  for (const state of ['no-user', 'no-token', 'wrong-owner']) {
    const h = fixture();
    if (state === 'no-user') h.appState.currentUser = null;
    if (state === 'no-token') h.appState.cloudConfig.token = '';
    if (state === 'wrong-owner') h.appState.cloudConfig.userId = 'another';
    const before = snapshot(h.values);
    assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).code, 'reauthRequired');
    assert.deepEqual(snapshot(h.values), before);
    assert.deepEqual(h.calls, []);
  }
});

test('fresh server verification rejects expired, offline, wrong-owner, and wrong-email sessions without writes', async () => {
  for (const kind of ['expired', 'offline', 'wrong-owner', 'wrong-email']) {
    const h = fixture(), before = snapshot(h.values);
    h.deps.cloudApi = async () => {
      if (kind === 'expired' || kind === 'offline') throw Object.assign(new Error(kind), kind === 'expired' ? { status: 401 } : {});
      return { account: { ...owner, ...(kind === 'wrong-owner' ? { id: 'another' } : { email: 'other@example.test' }) } };
    };
    assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
    assert.deepEqual(snapshot(h.values), before, kind);
    assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  }
});

test('switching account during hashing or verification aborts recovery before writes', async () => {
  for (const phase of ['hash', 'server']) {
    const h = fixture(), before = snapshot(h.values), pending = deferred();
    if (phase === 'hash') h.deps.hashPassword = () => pending.promise;
    else h.deps.cloudApi = () => pending.promise;
    const recovery = h.api.restoreDeviceRecords({ password: 'old-password' });
    await Promise.resolve();
    h.appState.currentUser = { ...owner, id: 'switched' };
    pending.resolve(phase === 'hash' ? hash(email, 'old-password') : { account: owner });
    assert.equal((await recovery).code, 'sessionChanged');
    assert.deepEqual(snapshot(h.values), before);
  }
});

test('corrupt legacy training is explicit and never overwritten or marked recovered', async () => {
  const h = fixture();
  h.storage.setItem(key(legacy.id), '{broken');
  const before = snapshot(h.values);
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
  assert.deepEqual(snapshot(h.values), before);
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
});

test('a backup quota failure prevents migration and keeps every original record', async () => {
  const h = fixture(), before = snapshot(h.values);
  h.storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
  assert.deepEqual(snapshot(h.values), before);
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
});

test('a migration conflict cannot mark recovery complete or replace current training', async () => {
  const h = fixture();
  h.deps.migrateVerifiedCareerOwner = () => { throw new Error('Conflicting original records'); };
  const originalTraining = h.userState.value;
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
  assert.equal(h.userState.value, originalTraining);
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
});

test('failed recovery metadata persistence preserves the original password and leaves retry available', async () => {
  const h = fixture();
  h.deps.saveAuth = () => false;
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, false);
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  assert.equal(h.appState.auth.legacyAccounts[0].passwordHash, legacy.passwordHash);
  h.deps.saveAuth = () => true;
  assert.equal((await h.api.restoreDeviceRecords({ password: 'old-password' })).ok, true);
  assert.equal(h.api.getDeviceRecordRecovery().count, 0);
});

test('successful automatic login marks the proven source snapshot and prevents duplicate recovery prompts', async () => {
  const h = fixture();
  h.appState.auth.accounts.push({ ...legacy, passwordHash: hash(email, 'new-password') });
  const appliedLinks = [];
  const controller = createAccountAuthController({
    storage: h.storage, getAppState: () => h.appState,
    elements: { loginEmail: { value: email }, loginPassword: { value: 'new-password' }, loginForm: { reset() {} } },
    normalizeEmail: value => String(value || '').toLowerCase(), normalizeAccount: value => value,
    loginCloudAccount: async () => ({ token: 'fresh-token', account: owner }), hashPassword: async (...args) => hash(...args),
    loadStateForUser: id => JSON.parse(h.storage.getItem(key(id)) || '{}'), mergeCloudState,
    applyCloudSession: (_session, options) => {
      appliedLinks.push(options.careerOwnerLinks);
      upsertAuthAccount(h.appState.auth, owner);
    },
  });
  await controller.loginLocal();
  assert.equal(appliedLinks[0].length, 1);
  assert.equal(h.api.getDeviceRecordRecovery().count, 0);
  await controller.loginLocal();
  assert.equal(appliedLinks[1].length, 0, 'unchanged originals must not resurrect deleted records at the next login');
  h.storage.setItem(key(legacy.id), JSON.stringify({ entries: [{ id: 'new-from-old-tab' }] }));
  assert.equal(h.api.getDeviceRecordRecovery().count, 1);
  await controller.loginLocal();
  assert.equal(appliedLinks[2].length, 1);
});

test('an orphaned verified Google subject gets a recovery index and is not imported again unchanged', async () => {
  const h = fixture();
  const sourceId = 'google:verified-subject';
  h.appState.auth.legacyAccounts = [];
  h.storage.setItem(key(sourceId), JSON.stringify({ entries: [{ id: 'google-old-entry' }] }));
  const applied = [];
  const controller = createAccountAuthController({
    storage: h.storage, getAppState: () => h.appState,
    normalizeEmail: value => String(value || '').toLowerCase(),
    parseJwt: () => ({ aud: 'client', sub: 'verified-subject', email }), getGoogleClientId: () => 'client',
    buildGoogleAccountFromPayload: () => ({ id: sourceId, email, provider: 'google' }),
    loginCloudGoogle: async () => ({ token: 'verified-google-token', account: owner }),
    loadStateForUser: id => JSON.parse(h.storage.getItem(key(id)) || '{}'), mergeCloudState,
    applyCloudSession: (_session, options) => { applied.push(options); upsertAuthAccount(h.appState.auth, owner); },
  });
  await controller.handleGoogleCredential({ credential: 'signed-token' });
  assert.equal(applied[0].careerOwnerLinks[0].sourceOwnerId, sourceId);
  assert.equal(h.appState.auth.legacyAccounts[0].id, sourceId);
  assert.equal(h.appState.auth.legacyAccounts[0].recordRecovery.targetOwnerId, owner.id);
  h.storage.setItem(key(owner.id), JSON.stringify({ entries: [] }));
  await controller.handleGoogleCredential({ credential: 'signed-token' });
  assert.equal(applied[1].careerOwnerLinks.length, 0);
  assert.deepEqual(applied[1].localState.entries, []);
});
