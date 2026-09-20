import { createTrackerStore, trackerStorageKey } from './trackerStore.js';
import { createCareerStageStore, stageStorageKey } from '../careerStages/stageStore.js';
import { diffTrackerOperations, mergeTrackerOperations, migrateTrackerOperations, projectTrackerOperations } from './trackerSyncModel.js';

// The personal journal is authoritative after migration. The original stores
// remain validated UI caches, and every new mutation commits its journal first.
// A crash between the two writes can therefore replay, rather than lose, work.
export function createTrackerSyncBridge({ ownerId, personalStore, storage, eventTarget }) {
  const trackerKey = trackerStorageKey(ownerId);
  const stageKey = stageStorageKey(ownerId);
  const migrationKey = `quantgym.tracker-cloud-migrated.v1:${encodeURIComponent(ownerId)}`;
  const listeners = new Set();
  let status = { error: '' };
  let active = false, applying = false, committing = false, unsubscribe = null, scheduled = false;
  const cacheReads = new Map();
  let mutationBaseline = null;
  const setError = error => {
    const message = error?.message || '';
    if (status.error === message) return;
    status = { error: message };
    for (const listener of listeners) listener();
  };
  const operations = () => personalStore.getSnapshot().data.careerTrackerOperations || [];
  const local = () => ({ ...trackerStore.readSyncState(), stages: stageStore.readSyncState() });
  function commit(nextOperations) {
    const current = personalStore.getSnapshot();
    if (current.error || current.conflict) throw new Error('同步存储暂时无法写入，原记录已保留，请刷新后重试。');
    committing = true;
    try {
      const result = personalStore.update(data => {
        const merged = mergeTrackerOperations(data.careerTrackerOperations || [], nextOperations);
        return JSON.stringify(merged) === JSON.stringify(data.careerTrackerOperations || [])
          ? data : { ...data, careerTrackerOperations: merged };
      });
      if (!result.ok) throw new Error('同步记录未能保存，请检查浏览器存储空间后重试。');
    } finally { committing = false; }
  }
  function apply() {
    if (!active || committing) return;
    const snapshot = personalStore.getSnapshot();
    if (snapshot.error || snapshot.conflict || snapshot.dirty) {
      setError(new Error('同步存储暂时不可用，原记录已保留。'));
      return;
    }
    applying = true;
    try {
      const projected = projectTrackerOperations(operations());
      trackerStore.replaceSyncState(projected);
      stageStore.replaceSyncState(projected.stages);
      setError(null);
    } catch (error) { setError(error); }
    finally { applying = false; }
  }
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; apply(); });
  }
  const cacheStorage = {
    getItem(key) {
      if (mutationBaseline?.has(key)) return mutationBaseline.get(key);
      const raw = storage?.getItem(key);
      if (!applying && !mutationBaseline) cacheReads.set(key, raw);
      return raw;
    },
    setItem(key, raw) {
      if (applying) { storage.setItem(key, raw); return; }
      if (!active) throw new Error('投递记录正在初始化，请稍后重试。');
      const originalRaw = cacheReads.get(key);
      // Refresh the shared journal before assigning a Lamport revision when a
      // second browser tab has saved but its storage event has not fired yet.
      committing = true;
      try { personalStore.update(data => data); } finally { committing = false; }
      // Another tab can update its cache during the journal refresh above.
      // Diff against the snapshot this mutation actually read, or unchanged
      // fields from its older copy would become fresh edits over that tab.
      let before;
      mutationBaseline = new Map([[key, originalRaw]]);
      try { before = local(); } finally { mutationBaseline = null; }
      const envelope = JSON.parse(raw);
      const after = key === trackerKey ? { ...before, applications: envelope.applications, deletedEvents: envelope.deletedEvents }
        : key === stageKey ? { ...before, stages: envelope.stages } : null;
      if (!after) throw new Error('无法识别投递记录存储空间。');
      commit(diffTrackerOperations(before, after, operations()));
      // Queue before writing the cache: even a cache quota failure is recoverable
      // from the journal already committed above.
      scheduleApply();
      storage.setItem(key, raw);
    },
  };
  const trackerStore = createTrackerStore({ ownerId, storage: cacheStorage, eventTarget });
  const stageStore = createCareerStageStore({ ownerId, storage: cacheStorage, eventTarget });
  return {
    trackerStore, stageStore,
    getSnapshot: () => status,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start() {
      if (active) return;
      try {
        if (!storage?.getItem || !personalStore) throw new Error('此浏览器暂时无法同步投递记录。');
        const original = local();
        // A pre-sync tab can remain open after the first migration and add
        // more records to the cache. Import missing records on every start;
        // migration never overwrites fields already present in the journal.
        for (const key of [trackerKey, stageKey]) {
          const raw = storage.getItem(key);
          if (raw !== null && storage.getItem(`${key}:before-cloud-sync`) === null) storage.setItem(`${key}:before-cloud-sync`, raw);
        }
        commit(migrateTrackerOperations(original, operations()));
        if (storage.getItem(migrationKey) !== '1') storage.setItem(migrationKey, '1');
        active = true;
        unsubscribe = personalStore.subscribe(() => { if (!committing) apply(); });
        apply();
      } catch (error) { setError(error); }
    },
    stop() { active = false; unsubscribe?.(); unsubscribe = null; },
  };
}

const workspaces = new WeakMap();
export function getTrackerWorkspace({ ownerId, namespace = '', personalStore, storage, eventTarget }) {
  if (namespace || !personalStore || ownerId === 'guest') {
    const trackerStore = ownerId !== 'guest' ? createTrackerStore({ ownerId, namespace, storage, eventTarget }) : null;
    const stageStore = createCareerStageStore({ ownerId, namespace, storage, eventTarget });
    const snapshot = { error: '' };
    return { trackerStore, stageStore, getSnapshot: () => snapshot, subscribe: () => () => {},
      retain: () => () => {} };
  }
  if (workspaces.has(personalStore)) return workspaces.get(personalStore);
  const bridge = createTrackerSyncBridge({ ownerId, personalStore, storage, eventTarget });
  let references = 0, generation = 0;
  const workspace = { ...bridge, retain() {
    references += 1; generation += 1;
    if (references === 1) bridge.start();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      references -= 1;
      const current = ++generation;
      queueMicrotask(() => { if (!references && current === generation) bridge.stop(); });
    };
  } };
  workspaces.set(personalStore, workspace);
  return workspace;
}
