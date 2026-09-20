import { createTrackerStore, trackerStorageKey } from '../features/tracker/trackerStore.js';
import { createCareerStageStore, stageStorageKey } from '../features/careerStages/stageStore.js';
import { createPersonalState, personalStorageKey, validatePersonalData } from '../features/personal/personalStore.js';
import { mergeTrackerOperations, migrateTrackerOperations, projectTrackerOperations, validateTrackerOperations } from '../features/tracker/trackerSyncModel.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validOwner = value => typeof value === 'string' && value.trim() && value.length <= 300 && value !== 'guest';

export function careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId) {
  return `quantgym.career-owner-migration.v1:${encodeURIComponent(sourceOwnerId)}:${encodeURIComponent(targetOwnerId)}`;
}

function failure(error) {
  const result = new Error(`投递记录账号迁移未完成，原始记录已保留。请解决存储或数据冲突后重新登录。${error?.message ? `（${error.message}）` : ''}`);
  result.code = 'CAREER_OWNER_MIGRATION_FAILED';
  return result;
}

function readOwner(storage, ownerId) {
  const keys = { tracker: trackerStorageKey(ownerId), stages: stageStorageKey(ownerId), personal: personalStorageKey(ownerId) };
  const raw = Object.fromEntries(Object.entries(keys).map(([kind, key]) => [kind, storage.getItem(key)]));
  const readStorage = { getItem: key => raw[Object.keys(keys).find(kind => keys[kind] === key)] ?? null, setItem() { throw new Error('Migration validation must be read-only.'); } };
  const tracker = createTrackerStore({ ownerId, storage: readStorage, eventTarget: null });
  const stages = createCareerStageStore({ ownerId, storage: readStorage, eventTarget: null });
  const trackerSnapshot = tracker.getSnapshot();
  const stageSnapshot = stages.getSnapshot();
  if (trackerSnapshot.error || stageSnapshot.error) throw new Error(trackerSnapshot.error || stageSnapshot.error);
  const trackerEnvelope = raw.tracker === null ? null : JSON.parse(raw.tracker);
  let personal = null;
  if (raw.personal !== null) {
    personal = JSON.parse(raw.personal);
    if (!object(personal) || personal.version !== 1 || personal.ownerId !== ownerId || !object(personal.data)) {
      throw new Error('Personal record owner or version does not match.');
    }
  }
  return {
    keys, raw, personal,
    operations: validateTrackerOperations(personal?.data.careerTrackerOperations === undefined ? [] : personal.data.careerTrackerOperations),
    snapshot: {
      applications: trackerSnapshot.applications,
      deletedEvents: trackerEnvelope?.version === 3 ? trackerEnvelope.deletedEvents : [],
      stages: stageSnapshot.stages,
    },
  };
}

// This function never identifies an account by email or searches storage keys.
// Its caller supplies an explicit pair only after the current authentication
// proves both the device identity and the server identity belong to that login.
export function migrateVerifiedCareerOwner({ sourceOwnerId, targetOwnerId, verified = false, storage, eventTarget, now = () => new Date().toISOString() } = {}) {
  if (!verified || sourceOwnerId === targetOwnerId) return { migrated: false };
  try {
    if (!validOwner(sourceOwnerId) || !validOwner(targetOwnerId)) throw new Error('Invalid migration owner.');
    if (!storage?.getItem || !storage?.setItem) throw new Error('Browser storage is unavailable.');
    const source = readOwner(storage, sourceOwnerId);
    if (!source.operations.length && !source.snapshot.applications.length && !source.snapshot.stages.length) return { migrated: false };
    const target = readOwner(storage, targetOwnerId);
    // Target fields win against an old snapshot. Journal operations preserve
    // their original IDs/clocks; duplicate IDs with different content fail.
    const targetOperations = migrateTrackerOperations(target.snapshot, target.operations);
    const withSourceJournal = mergeTrackerOperations(targetOperations, source.operations);
    const operations = migrateTrackerOperations(source.snapshot, withSourceJournal);
    projectTrackerOperations(operations);
    const data = validatePersonalData({ ...(target.personal?.data || createPersonalState()), careerTrackerOperations: operations });
    if (JSON.stringify(operations) === JSON.stringify(target.operations)) return { migrated: false };

    const backupKey = careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId);
    const savedBackup = storage.getItem(backupKey);
    if (savedBackup !== null) {
      const backup = JSON.parse(savedBackup);
      if (!object(backup) || backup.version !== 1 || backup.sourceOwnerId !== sourceOwnerId || backup.targetOwnerId !== targetOwnerId) {
        throw new Error('Migration backup owner or version does not match.');
      }
    } else {
      storage.setItem(backupKey, JSON.stringify({ version: 1, sourceOwnerId, targetOwnerId, createdAt: now(), source: source.raw, target: target.raw }));
    }
    // Do not overwrite a concurrent tab's update between reading and committing.
    for (const owner of [source, target]) {
      for (const [kind, key] of Object.entries(owner.keys)) {
        if (storage.getItem(key) !== owner.raw[kind]) throw new Error('Account records changed in another tab.');
      }
    }
    const raw = JSON.stringify({ ...(target.personal || {}), version: 1, ownerId: targetOwnerId, updatedAt: now(), data });
    storage.setItem(target.keys.personal, raw);
    // Source storage and both local UI caches stay intact. The shared bridge
    // projects the merged journal after the authenticated owner is exposed.
    try {
      const EventClass = eventTarget?.StorageEvent || globalThis.StorageEvent;
      if (EventClass) eventTarget?.dispatchEvent?.(new EventClass('storage', { key: target.keys.personal, oldValue: target.raw.personal, newValue: raw }));
    } catch { /* The durable commit already succeeded; event delivery is optional. */ }
    return { migrated: true, backupKey, operationCount: operations.length };
  } catch (error) { throw failure(error); }
}
