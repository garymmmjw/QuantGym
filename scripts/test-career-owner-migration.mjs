import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateVerifiedCareerOwner, careerOwnerMigrationBackupKey } from '../src/state/careerOwnerMigration.js';
import { createCloudSessionController } from '../src/state/cloudSessionController.js';
import { trackerStorageKey } from '../src/features/tracker/trackerStore.js';
import { stageStorageKey } from '../src/features/careerStages/stageStore.js';
import { createPersonalState, createPersonalStore, personalStorageKey } from '../src/features/personal/personalStore.js';
import { migrateTrackerOperations, projectTrackerOperations } from '../src/features/tracker/trackerSyncModel.js';
import { createTrial } from '../src/features/personal/mental/mentalEngine.js';
import { createDailySession } from '../src/features/personal/daily/dailyEngine.js';
import { createPracticeSession } from '../src/features/personal/practice/practiceModel.js';

const sourceOwnerId = 'device:verified-student';
const targetOwnerId = 'cloud:verified-student';
const now = () => '2026-09-19T12:00:00.000Z';
const app = (id, company = id) => ({ id, company, role: 'Quant Intern', prepPhase: 'stage-1', season: '', events: [{ id: `${id}-submitted`, type: 'submitted', date: '2026-09-16', dueDate: '', dueTime: '' }] });
const stage = (description = 'Ready') => ({ id: 'stage-1', label: 'Stage 1', description, recordedDate: '2026-09-13' });
const snapshot = (applications = [], stages = [], deletedEvents = []) => ({ applications, stages, deletedEvents });
function memoryStorage() {
  const values = new Map();
  const writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null, setItem(key, value) { writes.push(key); values.set(key, value); } };
}
function seed(storage, ownerId, value, operations = null) {
  storage.values.set(trackerStorageKey(ownerId), JSON.stringify({ version: 3, ownerId, applications: value.applications, deletedEvents: value.deletedEvents }));
  storage.values.set(stageStorageKey(ownerId), JSON.stringify({ version: 1, ownerId, stages: value.stages }));
  if (operations) storage.values.set(personalStorageKey(ownerId), JSON.stringify({ version: 1, ownerId, data: { ...createPersonalState(), careerTrackerOperations: operations } }));
}
const migrate = (storage, overrides = {}) => migrateVerifiedCareerOwner({ sourceOwnerId, targetOwnerId, verified: true, storage, now, ...overrides });
const readTarget = storage => JSON.parse(storage.getItem(personalStorageKey(targetOwnerId)));
function seedPersonal(storage, ownerId, data) {
  storage.values.set(personalStorageKey(ownerId), JSON.stringify({ version: 1, ownerId, data }));
}

test('a verified owner migrates personal-only training, drafts and tombstones with no Tracker records', () => {
  const storage = memoryStorage();
  const trial = { ...createTrial({}, { id: 'local-trial', now: Date.parse(now()) }), currentAnswer: '42' };
  const daily = createDailySession({ mentalEnabled: false, techCount: 2, codingCount: 0, behavioralCount: 0 }, { id: 'local-daily', startedAt: now() });
  const practice = { ...createPracticeSession('tech', { id: 'question', source: 'question-bank', title: 'Question', prompt: 'Explain', reference: 'Solution' }, { id: 'local-practice', now: now() }), text: 'Unfinished explanation' };
  const data = { ...createPersonalState(), activeTrial: trial, dailySessions: [daily], practiceSessions: [practice],
    activities: [{ id: 'local-activity', kind: 'quant', count: 1, completedAt: now() }],
    removedActivityIds: ['removed-activity'], behavioralAnswers: [{ id: 'question', text: 'My local answer', updatedAt: now() }] };
  seedPersonal(storage, sourceOwnerId, data);
  const sourceRaw = storage.getItem(personalStorageKey(sourceOwnerId));
  assert.equal(migrate(storage).migrated, true);
  assert.deepEqual(readTarget(storage).data, data);
  assert.equal(storage.getItem(personalStorageKey(sourceOwnerId)), sourceRaw);
  assert.equal(JSON.parse(storage.getItem(careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId))).source.personal, sourceRaw);
  const beforeRetry = new Map(storage.values);
  storage.writes.length = 0;
  assert.equal(migrate(storage).migrated, false);
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(storage.values, beforeRetry);
});

test('owner migration combines source training with current target training and retains explicit removals', () => {
  const storage = memoryStorage();
  seed(storage, sourceOwnerId, snapshot([app('source')], [stage()]));
  seedPersonal(storage, sourceOwnerId, { ...createPersonalState(),
    activities: [{ id: 'source-activity', kind: 'quant', count: 1, completedAt: now() }, { id: 'removed', kind: 'quant', count: 1, completedAt: now() }],
    behavioralAnswers: [{ id: 'same-answer', text: 'Older source', updatedAt: '2026-09-18T12:00:00Z' }] });
  seedPersonal(storage, targetOwnerId, { ...createPersonalState(),
    activities: [{ id: 'target-activity', kind: 'quant', count: 2, completedAt: now() }], removedActivityIds: ['removed'],
    behavioralAnswers: [{ id: 'same-answer', text: 'Latest target', updatedAt: now() }] });
  assert.equal(migrate(storage).migrated, true);
  const data = readTarget(storage).data;
  assert.deepEqual(data.activities.map(row => row.id), ['source-activity', 'target-activity']);
  assert.equal(data.behavioralAnswers[0].text, 'Latest target');
  assert.deepEqual(data.removedActivityIds, ['removed']);
  assert.equal(projectTrackerOperations(data.careerTrackerOperations).applications[0].id, 'source');
});

test('two different unfinished math trials block migration rather than silently dropping either answer', () => {
  const storage = memoryStorage();
  for (const owner of [sourceOwnerId, targetOwnerId]) seedPersonal(storage, owner, { ...createPersonalState(), activeTrial: { ...createTrial({}, { id: owner, now: Date.parse(now()) }), currentAnswer: owner } });
  const before = new Map(storage.values);
  assert.throws(() => migrate(storage), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.deepEqual(storage.values, before);
});

test('a live unsaved answer blocks owner migration before the old owner can become inaccessible', () => {
  const storage = memoryStorage();
  seedPersonal(storage, sourceOwnerId, createPersonalState());
  const live = createPersonalStore({ ownerId: sourceOwnerId, storage });
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  live.update(data => ({ ...data, behavioralAnswers: [{ id: 'question', text: 'Still only in memory', updatedAt: now() }] }));
  storage.setItem = write;
  const before = new Map(storage.values);
  assert.throws(() => migrate(storage, { getPersonalStore: owner => owner === sourceOwnerId ? live : null }), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.deepEqual(storage.values, before);
  assert.equal(live.getSnapshot().data.behavioralAnswers[0].text, 'Still only in memory');
  assert.equal(live.retry().ok, true);
  assert.equal(migrate(storage, { getPersonalStore: owner => owner === sourceOwnerId ? live : null }).migrated, true);
  assert.equal(readTarget(storage).data.behavioralAnswers[0].text, 'Still only in memory');
});

test('retired private event arrays survive verified owner consolidation and reject conflicting identities', () => {
  const storage = memoryStorage();
  const first = { id: 'legacy-source', applicationId: 'application', createdAt: now(), changes: { company: 'Old private event' } };
  const second = { ...first, id: 'legacy-target' };
  seedPersonal(storage, sourceOwnerId, { ...createPersonalState(), applicationEvents: [first] });
  seedPersonal(storage, targetOwnerId, { ...createPersonalState(), applicationEvents: [second] });
  migrate(storage);
  assert.deepEqual(readTarget(storage).data.applicationEvents, [first, second]);
  seedPersonal(storage, sourceOwnerId, { ...createPersonalState(), applicationEvents: [{ ...first, changes: { company: 'Conflicting replacement' } }] });
  const before = new Map(storage.values);
  assert.throws(() => migrate(storage), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.deepEqual(storage.values, before);
});

test('verified owner migration retains originals and backups while combining disjoint records without overwriting target fields', () => {
  const storage = memoryStorage();
  seed(storage, sourceOwnerId, snapshot([app('source'), app('shared', 'Old local company')], [stage('Old local description')]));
  seed(storage, targetOwnerId, snapshot([app('target'), app('shared', 'Current target company')], [stage('Current target description')]));
  const before = new Map(storage.values);
  const result = migrate(storage);
  assert.equal(result.migrated, true);
  const projected = projectTrackerOperations(readTarget(storage).data.careerTrackerOperations);
  assert.deepEqual(projected.applications.map(row => row.id).sort(), ['shared', 'source', 'target']);
  assert.equal(projected.applications.find(row => row.id === 'shared').company, 'Current target company');
  assert.equal(projected.stages[0].description, 'Current target description');
  for (const [key, raw] of before) assert.equal(storage.getItem(key), raw);
  const backup = JSON.parse(storage.getItem(careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId)));
  assert.equal(backup.source.tracker, before.get(trackerStorageKey(sourceOwnerId)));
  assert.equal(backup.target.tracker, before.get(trackerStorageKey(targetOwnerId)));
  const after = new Map(storage.values);
  storage.writes.length = 0;
  assert.equal(migrate(storage).migrated, false);
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(storage.values, after);
});

test('existing source journal migrates with tombstones and target personal data is preserved', () => {
  const storage = memoryStorage();
  const original = app('source');
  const deleted = { id: 'delete-token', applicationId: original.id, event: { id: 'oa-event', type: 'oa_received', date: '2026-09-18', dueDate: '2026-09-22', dueTime: '' }, order: ['source-submitted', 'oa-event'] };
  const oldSnapshot = snapshot([original], [stage()], [deleted]);
  const sourceOperations = migrateTrackerOperations(oldSnapshot);
  seed(storage, sourceOwnerId, oldSnapshot, sourceOperations);
  const targetData = { ...createPersonalState(), behavioralAnswers: [{ id: 'answer', text: 'Keep this answer', updatedAt: now() }] };
  storage.values.set(personalStorageKey(targetOwnerId), JSON.stringify({ version: 1, ownerId: targetOwnerId, data: targetData }));
  const sourceBefore = storage.getItem(personalStorageKey(sourceOwnerId));
  migrate(storage);
  const target = readTarget(storage);
  assert.deepEqual(target.data.behavioralAnswers, targetData.behavioralAnswers);
  assert.equal(storage.getItem(personalStorageKey(sourceOwnerId)), sourceBefore);
  const projected = projectTrackerOperations(target.data.careerTrackerOperations);
  assert.deepEqual(projected.applications[0].events.map(event => event.id), ['source-submitted']);
  assert.equal(projected.deletedEvents.length, 1);
});

test('unverified, same-owner and empty migrations never change storage', () => {
  const storage = memoryStorage();
  seed(storage, sourceOwnerId, snapshot([app('source')], [stage()]));
  const before = new Map(storage.values);
  assert.equal(migrate(storage, { verified: false }).migrated, false);
  assert.equal(migrate(storage, { targetOwnerId: sourceOwnerId }).migrated, false);
  assert.equal(migrate(storage, { sourceOwnerId: 'other-empty-owner' }).migrated, false);
  assert.deepEqual(storage.values, before);
  assert.equal(storage.writes.length, 0);
});

test('corrupt or mismatched owner storage is explicit and leaves every original unchanged', () => {
  for (const [kind, ownerId, invalid] of [
    ['tracker', sourceOwnerId, '{broken'],
    ['stages', targetOwnerId, JSON.stringify({ version: 1, ownerId: 'someone-else', stages: [] })],
    ['personal', sourceOwnerId, JSON.stringify({ version: 1, ownerId: sourceOwnerId, data: { careerTrackerOperations: 'invalid' } })],
    ['personal', sourceOwnerId, JSON.stringify({ version: 1, ownerId: sourceOwnerId, data: { careerTrackerOperations: null } })],
    ['personal', targetOwnerId, JSON.stringify({ version: 1, ownerId: targetOwnerId, data: {} })],
  ]) {
    const storage = memoryStorage();
    seed(storage, sourceOwnerId, snapshot([app('source')], [stage()]));
    const key = { tracker: trackerStorageKey, stages: stageStorageKey, personal: personalStorageKey }[kind](ownerId);
    storage.values.set(key, invalid);
    const before = new Map(storage.values);
    assert.throws(() => migrate(storage), error => error.code === 'CAREER_OWNER_MIGRATION_FAILED' && /原始记录已保留/.test(error.message));
    assert.deepEqual(storage.values, before);
  }
});

test('the same journal operation ID with different content cannot overwrite either owner', () => {
  const storage = memoryStorage();
  const value = snapshot([app('source')], [stage()]);
  const operations = migrateTrackerOperations(value);
  const conflicting = structuredClone(operations);
  conflicting.find(operation => operation.kind === 'application').fields.company = 'Conflicting company';
  seed(storage, sourceOwnerId, value, operations);
  seed(storage, targetOwnerId, value, conflicting);
  const before = new Map(storage.values);
  assert.throws(() => migrate(storage), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.deepEqual(storage.values, before);
  assert.equal(storage.writes.length, 0);
});

test('backup/write quota failures preserve source and target and allow a safe retry', () => {
  for (const blockedKey of [careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId), personalStorageKey(targetOwnerId)]) {
    const storage = memoryStorage();
    seed(storage, sourceOwnerId, snapshot([app('source')], [stage()]));
    const sourceBefore = storage.getItem(trackerStorageKey(sourceOwnerId));
    const write = storage.setItem;
    storage.setItem = (key, value) => { if (key === blockedKey) throw new Error('Quota exceeded'); write.call(storage, key, value); };
    assert.throws(() => migrate(storage), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
    assert.equal(storage.getItem(trackerStorageKey(sourceOwnerId)), sourceBefore);
    assert.equal(storage.getItem(personalStorageKey(targetOwnerId)), null);
    storage.setItem = write;
    assert.equal(migrate(storage).migrated, true);
  }
});

test('concurrent target changes are detected instead of overwritten', () => {
  const storage = memoryStorage();
  seed(storage, sourceOwnerId, snapshot([app('source')], [stage()]));
  const write = storage.setItem;
  const concurrent = JSON.stringify({ version: 1, ownerId: targetOwnerId, data: createPersonalState(), updatedAt: 'concurrent' });
  storage.setItem = (key, value) => {
    write.call(storage, key, value);
    if (key === careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId)) storage.values.set(personalStorageKey(targetOwnerId), concurrent);
  };
  assert.throws(() => migrate(storage), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.equal(storage.getItem(personalStorageKey(targetOwnerId)), concurrent);
});

test('cloud session migration completes before exposing the canonical owner, and failures never switch identity', () => {
  for (const fail of [false, true]) {
    const calls = [];
    const controller = createCloudSessionController({
      getAppState: () => ({}), normalizeAccount: value => value,
      migrateVerifiedCareerOwner: options => {
        assert.equal(options.verified, true);
        assert.equal(options.sourceOwnerId, sourceOwnerId);
        calls.push('migrate');
        if (fail) throw Object.assign(new Error('migration conflict'), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
      },
      upsertLocalAccount: () => calls.push('expose-owner'),
      buildCloudSessionState: () => ({ nextState: {} }),
    });
    const apply = () => controller.apply({ token: 'verified-session', account: { id: targetOwnerId } }, { careerOwnerLink: { sourceOwnerId, targetOwnerId, method: 'password' } });
    if (fail) assert.throws(apply, { code: 'CAREER_OWNER_MIGRATION_FAILED' });
    else apply();
    assert.deepEqual(calls, fail ? ['migrate'] : ['migrate', 'expose-owner']);
  }
});

test('cloud session rejects a stale or unverified target link before calling migration', () => {
  for (const [token, linkedTarget, method] of [['', targetOwnerId, 'password'], ['token', 'other-owner', 'password'], ['token', targetOwnerId, 'email']]) {
    let migrated = false;
    const controller = createCloudSessionController({ normalizeAccount: value => value, migrateVerifiedCareerOwner: () => { migrated = true; } });
    assert.throws(() => controller.apply({ token, account: { id: targetOwnerId } }, { careerOwnerLink: { sourceOwnerId, targetOwnerId: linkedTarget, method } }), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
    assert.equal(migrated, false);
  }
});

test('a failed canonical training write cannot expose identity or complete an owner migration', () => {
  const appState = { cloudConfig: { token: 'previous-token', userId: sourceOwnerId } };
  const previous = structuredClone(appState);
  const userState = { value: { entries: [{ id: 'old-record' }] } };
  let exposed = false;
  const controller = createCloudSessionController({
    getAppState: () => appState, getUserStateStore: () => userState, normalizeAccount: value => value,
    migrateVerifiedCareerOwner() {}, buildCloudSessionState: () => ({ nextState: { entries: [{ id: 'merged' }] } }),
    writeUserState: () => false, upsertLocalAccount: () => { exposed = true; },
  });
  assert.throws(() => controller.apply({ token: 'new-token', account: { id: targetOwnerId } }, {
    careerOwnerLinks: [{ sourceOwnerId, targetOwnerId, method: 'password' }],
  }), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.equal(exposed, false);
  assert.deepEqual(appState, previous);
  assert.deepEqual(userState.value.entries, [{ id: 'old-record' }]);
});

test('all verified legacy owners migrate once before the canonical identity is exposed', () => {
  const calls = [];
  const controller = createCloudSessionController({
    getAppState: () => ({}), normalizeAccount: value => value,
    migrateVerifiedCareerOwner: options => calls.push(options.sourceOwnerId),
    upsertLocalAccount: () => calls.push('expose-owner'), buildCloudSessionState: () => ({ nextState: {} }),
  });
  const first = { sourceOwnerId, targetOwnerId, method: 'password' };
  const second = { ...first, sourceOwnerId: 'second-verified-legacy-owner' };
  controller.apply({ token: 'verified-session', account: { id: targetOwnerId } }, { careerOwnerLink: first, careerOwnerLinks: [first, second] });
  assert.deepEqual(calls, [sourceOwnerId, second.sourceOwnerId, 'expose-owner']);
  calls.length = 0;
  assert.throws(() => controller.apply({ token: 'verified-session', account: { id: targetOwnerId } }, { careerOwnerLinks: [first, { ...second, targetOwnerId: 'wrong-owner' }] }), { code: 'CAREER_OWNER_MIGRATION_FAILED' });
  assert.deepEqual(calls, []);
});
