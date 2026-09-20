import { createPersonalStore } from './personalStore.js';
import { createPersonalCloudSync } from './personalCloud.js';

// A page can use the workspace and a LeetCode picker at the same time. They
// share one store and one cloud writer for the current account credentials.
export function createPersonalDataRegistry({
  getStorage = () => globalThis.localStorage,
  eventTarget = globalThis.window,
  createStore = createPersonalStore,
  createCloudSync = createPersonalCloudSync,
} = {}) {
  const stores = new Map();
  const connections = new Map();
  const storage = () => { try { return getStorage(); } catch { return undefined; } };

  function getStore(ownerId) {
    if (!ownerId) return null;
    if (!stores.has(ownerId)) stores.set(ownerId, createStore({ ownerId, storage: storage(), eventTarget }));
    return stores.get(ownerId);
  }

  function getConnection(ownerId, config = {}) {
    if (!ownerId) return null;
    const normalized = { endpoint: String(config.endpoint || '').replace(/\/+$/, ''), token: config.token || '', userId: config.userId || '' };
    const key = JSON.stringify([ownerId, normalized.endpoint, normalized.token, normalized.userId]);
    if (connections.has(key)) return connections.get(key);
    const listeners = new Set();
    let cloud = { phase: 'local' };
    let instance = null;
    let references = 0;
    let started = false;
    let releaseGeneration = 0;
    const connection = {
      getSnapshot: () => cloud,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      sync: () => instance?.sync() || Promise.resolve(),
      retain() {
        references += 1;
        releaseGeneration += 1;
        if (!started) {
          started = true;
          instance ||= createCloudSync({ store: getStore(ownerId), ownerId, config: normalized, storage: storage(), eventTarget,
            onStatus(value) { cloud = value; for (const listener of listeners) listener(); } });
          instance.start();
        }
        let released = false;
        return () => {
          if (released) return;
          released = true;
          references -= 1;
          if (references) return;
          const generation = ++releaseGeneration;
          // Keep React's route handoff / StrictMode remount in the same writer.
          queueMicrotask(() => {
            if (references || generation !== releaseGeneration) return;
            started = false;
            Promise.resolve(instance.stop()).finally(() => {
              if (!references && !started && connections.get(key) === connection) connections.delete(key);
            });
          });
        };
      },
    };
    connections.set(key, connection);
    return connection;
  }

  async function syncOwner(ownerId, config = {}) {
    const connection = getConnection(ownerId, config);
    if (!connection) return { phase: 'local' };
    const release = connection.retain();
    try {
      await connection.sync();
      const cloud = connection.getSnapshot();
      const snapshot = getStore(ownerId).getSnapshot?.();
      if (cloud.phase === 'synced' && (snapshot?.error || snapshot?.dirty || snapshot?.conflict)) {
        return { phase: 'error', message: snapshot.error || 'Local records still need recovery before sync can be confirmed.' };
      }
      return cloud;
    } finally { release(); }
  }

  return { getStore, getExistingStore: ownerId => stores.get(ownerId) || null, getConnection, syncOwner };
}

// Hooks and imperative account actions share this registry, including drafts
// migrated before React has mounted a preparation or Tracker page.
export const personalDataRegistry = createPersonalDataRegistry();
