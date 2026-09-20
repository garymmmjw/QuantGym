import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateVerifiedCareerOwner, careerOwnerMigrationBackupKey } from '../src/state/careerOwnerMigration.js';
import { createCloudSessionController } from '../src/state/cloudSessionController.js';
import { trackerStorageKey } from '../src/features/tracker/trackerStore.js';
import { stageStorageKey } from '../src/features/careerStages/stageStore.js';
import { createPersonalState, personalStorageKey } from '../src/features/personal/personalStore.js';
import { migrateTrackerOperations, projectTrackerOperations } from '../src/features/tracker/trackerSyncModel.js';

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
