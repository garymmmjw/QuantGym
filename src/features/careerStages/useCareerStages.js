import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePersonalData } from '../personal/usePersonalData.js';
import { getTrackerWorkspace } from '../tracker/trackerSyncBridge.js';

const EMPTY_DEFAULTS = [];

export function useCareerStages({ ownerId, namespace = '', defaults = EMPTY_DEFAULTS }) {
  const personal = usePersonalData({ enabled: !namespace && ownerId !== 'guest' });
  const workspace = useMemo(() => {
    let storage;
    try { storage = window.localStorage; } catch { /* The store reports unavailable storage. */ }
    return getTrackerWorkspace({ ownerId, namespace, storage, eventTarget: window,
      personalStore: personal.ownerId === ownerId ? personal.store : null });
  }, [ownerId, namespace, personal.store, personal.ownerId]);
  const store = workspace.stageStore;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const syncState = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot, workspace.getSnapshot);

  useEffect(() => workspace.retain(), [workspace]);
  useEffect(() => {
    if (defaults.length) {
      try { store.ensureStages(defaults); } catch { /* The store exposes persistence errors. */ }
    }
  }, [store, defaults]);
  return { store, snapshot, ownerId, trackerStore: workspace.trackerStore,
    cloud: personal.cloud, sync: personal.sync, syncError: syncState.error };
}
