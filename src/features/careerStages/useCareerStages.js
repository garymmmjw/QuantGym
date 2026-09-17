import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCareerStageStore } from './stageStore.js';

const EMPTY_DEFAULTS = [];

export function useCareerStages({ ownerId, namespace = '', defaults = EMPTY_DEFAULTS }) {
  const store = useMemo(() => {
    let storage;
    try { storage = window.localStorage; } catch { /* The store reports unavailable storage. */ }
    return createCareerStageStore({ ownerId, namespace, storage, eventTarget: window });
  }, [ownerId, namespace]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    if (defaults.length) {
      try { store.ensureStages(defaults); } catch { /* The store exposes persistence errors. */ }
    }
  }, [store, defaults]);
  useEffect(() => () => store.dispose(), [store]);
  return { store, snapshot, ownerId };
}
