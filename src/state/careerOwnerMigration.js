import { createTrackerStore, trackerStorageKey } from '../features/tracker/trackerStore.js';
import { createCareerStageStore, stageStorageKey } from '../features/careerStages/stageStore.js';
import { createPersonalState, personalStorageKey, validatePersonalData, mergePersonalData } from '../features/personal/personalStore.js';
import { mergeTrackerOperations, migrateTrackerOperations, projectTrackerOperations, validateTrackerOperations } from '../features/tracker/trackerSyncModel.js';
import { personalDataRegistry } from '../features/personal/personalDataRegistry.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validOwner = value => typeof value === 'string' && value.trim() && value.length <= 300 && value !== 'guest';
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sameData = (first, second) => JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));

export function careerOwnerMigrationBackupKey(sourceOwnerId, targetOwnerId) {
  return `quantgym.career-owner-migration.v1:${encodeURIComponent(sourceOwnerId)}:${encodeURIComponent(targetOwnerId)}`;
}

function failure(error) {
  const result = new Error(`账号数据迁移未完成，原始记录已保留。请解决存储或数据冲突后重新登录。${error?.message ? `（${error.message}）` : ''}`);
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
  const data = personal ? validatePersonalData(personal.data) : createPersonalState();
  return {
    keys, raw, personal, data,
    operations: validateTrackerOperations(data.careerTrackerOperations),
    snapshot: {
      applications: trackerSnapshot.applications,
      deletedEvents: trackerEnvelope?.version === 3 ? trackerEnvelope.deletedEvents : [],
      stages: stageSnapshot.stages,
    },
  };
}

function mergeOwnerPersonalData(target, source) {
  const data = mergePersonalData(target, source);
  // A single active slot cannot hold different unfinished math trials. The
  // ordinary merge prefers its current slot; an account migration must surface
  // that conflict before making the source owner inaccessible after login.
  for (const trial of [target.activeTrial, source.activeTrial].filter(Boolean)) {
    if (trial.id === data.activeTrial?.id) continue;
    const remaining = mergePersonalData({ ...data, activeTrial: null }, { ...createPersonalState(), activeTrial: trial }).activeTrial;
    if (remaining) throw new Error('两个账号各有未完成的试次，暂时无法合并；两份答题内容均已保留。');
  }
  // Retired modules can still exist in older personal backups. Keep their
  // immutable events as well instead of retaining only today's visible fields.
  for (const field of ['applicationEvents', 'reviewEvents']) {
    if (!(field in target) && !(field in source)) continue;
    const records = new Map();
    for (const rows of [target[field] ?? [], source[field] ?? []]) {
      if (!Array.isArray(rows)) throw new Error(`Invalid ${field}.`);
      for (const row of rows) {
        if (!object(row) || typeof row.id !== 'string' || !row.id.trim()) throw new Error(`Invalid ${field} record.`);
        if (records.has(row.id) && !sameData(records.get(row.id), row)) throw new Error(`Conflicting ${field} record.`);
        records.set(row.id, row);
      }
    }
    const timeField = field === 'applicationEvents' ? 'createdAt' : 'reviewedAt';
    data[field] = [...records.values()].sort((a, b) => Date.parse(a[timeField]) - Date.parse(b[timeField]) || a.id.localeCompare(b.id));
  }
  return data;
}

// This function never identifies an account by email or searches storage keys.
// Its caller supplies an explicit pair only after the current authentication
// proves both the device identity and the server identity belong to that login.
export function migrateVerifiedCareerOwner({ sourceOwnerId, targetOwnerId, verified = false, storage, eventTarget,
  getPersonalStore = ownerId => personalDataRegistry.getExistingStore(ownerId), now = () => new Date().toISOString() } = {}) {
  if (!verified || sourceOwnerId === targetOwnerId) return { migrated: false };
  try {
    if (!validOwner(sourceOwnerId) || !validOwner(targetOwnerId)) throw new Error('Invalid migration owner.');
    if (!storage?.getItem || !storage?.setItem) throw new Error('Browser storage is unavailable.');
    for (const ownerId of [sourceOwnerId, targetOwnerId]) {
      const live = getPersonalStore(ownerId)?.getSnapshot();
      if (live?.dirty || live?.conflict || live?.error) throw new Error('本机还有未能保存的答题内容，请先重试保存；当前草稿已保留。');
    }
    const source = readOwner(storage, sourceOwnerId);
    if (source.raw.personal === null && !source.snapshot.applications.length && !source.snapshot.stages.length) return { migrated: false };
    const target = readOwner(storage, targetOwnerId);
    // Target fields win against an old snapshot. Journal operations preserve
    // their original IDs/clocks; duplicate IDs with different content fail.
    const targetOperations = migrateTrackerOperations(target.snapshot, target.operations);
    const withSourceJournal = mergeTrackerOperations(targetOperations, source.operations);
    const operations = migrateTrackerOperations(source.snapshot, withSourceJournal);
    projectTrackerOperations(operations);
    const data = validatePersonalData({ ...mergeOwnerPersonalData(target.data, source.data), careerTrackerOperations: operations });
    if (sameData(data, target.data)) return { migrated: false };

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
