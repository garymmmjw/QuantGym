import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountPageApi } from '../src/app/services/accountPageApi.js';
import { buildAccountSaveResult } from '../src/modules/account/save.js';
import { buildSettingsSaveResult } from '../src/modules/settings/save.js';
import { buildGlobalSearchResults, getModuleSearchDefs } from '../src/ui/globalSearchData.js';
import { normalizeLeetcodeConnection } from '../src/features/account/accountCenterData.js';

function fixture({ connected = true, cloudApi = async () => ({ account: { id: 'owner' } }) } = {}) {
  const account = { id: 'owner', name: 'Fixture', email: 'fixture@example.invalid', provider: 'local', passwordHash: 'hash:fixture@example.invalid:Original123', country: 'china', region: '上海', graduationTerm: '2027-09', goal: 'Original' };
  const appState = { currentUser: account, auth: { accounts: [account] }, cloudConfig: connected ? { userId: 'owner', token: 'fixture-only' } : {} };
  let saved = 0;
  const deps = { appState, userState: { value: {} }, getCurrentUser: () => appState.auth.accounts.find(a => a.id === appState.currentUser.id), hashPassword: async (email, password) => `hash:${email}:${password}`, cloudApi, saveAuth: () => saved++, saveState: () => {}, queueCloudSync: () => {} };
  return { appState, api: createAccountPageApi(deps), saves: () => saved };
}

test('failed cloud save leaves all local profile and credential data untouched', async () => {
  const { appState, api, saves } = fixture({ cloudApi: async () => { throw new Error('Offline'); } });
  const before = structuredClone(appState);
  assert.equal((await api.save({ name: 'Changed' })).ok, false);
  assert.equal((await api.changePassword({ currentPassword: 'Original123', newPassword: 'Updated456', confirmPassword: 'Updated456' })).ok, false);
  assert.deepEqual(appState, before);
  assert.equal(saves(), 0);
});
test('saving independent sections preserves the other profile values and server authority', async () => {
  const calls = [];
  const { appState, api } = fixture({ cloudApi: async (path, options) => { calls.push({ path, ...options }); return { account: { id: 'owner', ...options.body.updates } }; } });
  assert.equal((await api.save({ preferences: { language: 'en', theme: 'dark' } })).ok, true);
  assert.equal(appState.currentUser.goal, 'Original');
  assert.equal((await api.save({ email: 'changed@example.invalid', currentPassword: 'Original123' })).ok, true);
  assert.equal(appState.currentUser.passwordHash, 'hash:changed@example.invalid:Original123');
  assert.equal(calls[1].body.currentPassword, 'Original123');
  assert.equal(calls[1].body.updates.passwordHash, undefined);
});
test('account switching while saving cannot write into the next user account', async () => {
  let resolve;
  const { appState, api } = fixture({ cloudApi: () => new Promise(done => { resolve = done; }) });
  const pending = api.save({ name: 'Changed' });
  await new Promise(done => setImmediate(done));
  appState.currentUser = { id: 'second' };
  resolve({ account: { id: 'owner', name: 'Changed' } });
  assert.equal((await pending).ok, false);
  assert.equal(appState.auth.accounts[0].name, 'Fixture');
});
test('legacy and expired identities cannot edit profile or passwords without server authorization', async () => {
  const { appState, api, saves } = fixture({ connected: false });
  for (const cloudLinked of [false, true]) {
    appState.currentUser.cloudLinked = cloudLinked;
    const before = structuredClone(appState);
    assert.equal((await api.changePassword({ currentPassword: 'Original123', newPassword: 'Updated456' })).code, 'reauthRequired');
    assert.equal((await api.save({ name: 'New name' })).code, 'reauthRequired');
    assert.deepEqual(appState, before);
  }
  assert.equal(saves(), 0);
});
test('switching endpoint clears credentials rather than forwarding them to another service', () => {
  const result = buildSettingsSaveResult({ cloudConfig: { endpoint: 'https://one.invalid/api', token: 'private', userId: 'owner', lastSyncAt: 'yesterday' }, currentUser: { country: 'unitedStates', region: 'California' }, values: { cloudEndpoint: 'https://two.invalid/api' } });
  assert.equal(result.cloudConfig.token, '');
  assert.equal(result.cloudConfig.userId, '');
  assert.equal(result.country, 'unitedStates');
  assert.equal(result.region, 'California');
});
test('settings search finds deep destinations and avoids duplicate settings modules', () => {
  for (const [query, destination] of [['修改密码','security'], ['language','preferences'], ['监护人','guardian'], ['leetcode','connections'], ['备份','data']]) {
    const results = buildGlobalSearchResults(query);
    assert.equal(results[0].type, 'setting');
    assert.equal(results[0].id, destination);
  }
  assert.equal(getModuleSearchDefs().filter(item => ['account','settings'].includes(item.module)).length, 1);
});
test('connections accept only constrained public usernames and the supported hosts', () => {
  assert.throws(() => normalizeLeetcodeConnection({ site: 'evil.invalid', username: 'abc' }));
  assert.throws(() => normalizeLeetcodeConnection({ site: 'leetcode.cn', username: '../x' }));
  assert.equal(normalizeLeetcodeConnection(null), null);
});
test('Google identity email cannot be edited and invalid email is rejected', async () => {
  const currentUser = { id: 'google', provider: 'google', email: 'a@example.invalid' };
  assert.equal((await buildAccountSaveResult({ currentUser, values: { name: 'a', email: 'b@example.invalid' } })).code, 'providerEmail');
  assert.equal((await buildAccountSaveResult({ currentUser, values: { name: 'a', email: 'broken' } })).ok, false);
});

test('older backups cannot erase newer records omitted from the file', async () => {
  const { mergeImportedState } = await import('../src/state/backup.js');
  const current = { entries: [{id:'new',title:'Current'}], resources: [{id:'note'}], mentalMathRecords:[{id:'math'}] };
  const result = mergeImportedState(current, {entries:[{id:'old'},{id:'new',title:'Old'}]});
  assert.deepEqual(result.entries, [{id:'old'},{id:'new',title:'Current'}]);
  assert.deepEqual(result.resources, current.resources);
  assert.deepEqual(result.mentalMathRecords, current.mentalMathRecords);
});

test('manual sync waits for an active request and then flushes pending edits', async () => {
  const { createCloudSyncController } = await import('../src/api/cloudSync.js');
  let complete;
  let calls = 0;
  const controller = createCloudSyncController({ getCurrentUser: () => ({id:'owner'}), getConfig: () => ({token:'test', userId:'owner'}), canUseCloud: () => true, cloudApi: () => { calls++; return new Promise(resolve => { complete = resolve; }); } });
  controller.markAllDirty();
  const first = controller.flush();
  await new Promise(resolve => setImmediate(resolve));
  controller.markAllDirty();
  const manual = controller.flush();
  complete({syncedAt:'first'});
  await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2);
  complete({syncedAt:'second'});
  assert.equal((await manual).ok, true);
  assert.equal(controller.isInFlight(), false);
});
test('profile and preferences saves do not award training activity', async () => {
  let options;
  const user = {id:'local',provider:'local',email:'local@example.invalid',name:'Local'};
  const appState = {currentUser:user,auth:{accounts:[user]},cloudConfig:{userId:user.id,token:'fixture'}};
  const api = createAccountPageApi({appState,cloudApi:async()=>({account:{...user,name:"New name"}}),userState:{value:{}},saveState:value=>{options=value;}});
  await api.save({name:'New name'});
  assert.equal(options.checkIn, false);
});

test('a queued sync cannot send data after its owning session changes', async () => {
  const { createCloudSyncController } = await import('../src/api/cloudSync.js');
  let user = {id:'first'};
  let calls = 0;
  const controller = createCloudSyncController({ getCurrentUser: () => user, getConfig: () => ({token:'test', userId:user.id}), canUseCloud: () => true, cloudApi: async () => { calls++; } });
  controller.markAllDirty();
  const result = controller.flush();
  user = {id:'second'};
  assert.equal((await result).ok, false);
  assert.equal(calls, 0);
});

for (const change of ['token', 'userId', 'endpoint']) {
  test(`profile save ignores a response after ${change} changes`, async () => {
    let resolve;
    const { appState, api, saves } = fixture({ cloudApi: () => new Promise(done => { resolve = done; }) });
    const pending = api.save({ name: 'Changed' });
    await new Promise(done => setImmediate(done));
    appState.cloudConfig[change] = 'changed';
    resolve({ account: { id: 'owner', name: 'Changed' } });
    assert.equal((await pending).ok, false);
    assert.equal(appState.auth.accounts[0].name, 'Fixture');
    assert.equal(saves(), 0);
  });
}

test('wrong-owner profile response cannot replace the current account', async () => {
  const { appState, api, saves } = fixture({ cloudApi: async () => ({ account: { id: 'another', name: 'Changed' } }) });
  const before = structuredClone(appState);
  assert.equal((await api.save({ name: 'Changed' })).ok, false);
  assert.deepEqual(appState, before);
  assert.equal(saves(), 0);
});
