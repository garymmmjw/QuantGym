import { createPersonalState, mergePersonalData, validatePersonalData } from './personalStore.js';

export async function personalFingerprint(data) {
  // Postgres jsonb can return object keys in a different order than the browser.
  // Object order is not an edit; array order remains part of the saved content.
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(data)));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

// Private API only: never send preparation answers through the community snapshot.
// A revision check on every write protects work saved from another device.
export function createPersonalCloudSync({ store, ownerId, config = {}, storage, fetchImpl = globalThis.fetch, eventTarget, onStatus = () => {}, debounceMs = 1200 }) {
  const base = String(config.endpoint || '').replace(/\/+$/, '');
  const enabled = Boolean(base && config.token && config.userId === ownerId);
  const token = config.token;
  const metaKey = `quantgym.personal-sync.v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(base)}`;
  let meta = null;
  try { meta = JSON.parse(storage?.getItem(metaKey) || 'null'); } catch { /* Reconcile safely without metadata. */ }
  let stopped = false, running = null, requested = false, timer = null, interval = null, unsubscribe = null;
  let applyingRemote = false, flushOnStop = false;
  const status = (value) => { if (!stopped) onStatus(value); };
  async function request(method, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(`${base}/personal-prep`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(payload.error || `HTTP ${response.status}`), { status: response.status });
      if (payload.version !== 1 || !Number.isInteger(payload.revision) || payload.revision < 0) throw new Error('Invalid cloud revision.');
      if (payload.data !== null) payload.data = validatePersonalData(payload.data);
      return payload;
    } finally { clearTimeout(timeout); }
  }
  function remember(fingerprint, envelope) {
    meta = { fingerprint, revision: envelope.revision, syncedAt: envelope.updatedAt || new Date().toISOString() };
    try { storage?.setItem(metaKey, JSON.stringify(meta)); } catch { /* The next sync will conservatively merge. */ }
  }
  async function perform() {
    if (!enabled) { status({ phase: 'local' }); return; }
    status({ phase: 'syncing' });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const remote = await request('GET');
      if (remote.data === null && meta?.revision > 0) throw new Error('Previously saved cloud records are unavailable.');
      if (meta?.revision > remote.revision) throw new Error('Cloud revision moved backwards. Local records were kept.');
      if (store.getSnapshot().conflict || store.getSnapshot().error?.startsWith('read:')) throw new Error('Resolve local storage recovery before syncing.');
      const local = store.getSnapshot().data;
      const remoteData = remote.data || createPersonalState();
      const [localHash, remoteHash] = await Promise.all([personalFingerprint(local), personalFingerprint(remoteData)]);
      const hasReasoningActive = [local.activeTrial, remoteData.activeTrial]
        .some(trial => ['sequence', 'pattern'].includes(trial?.settings?.trainer));
      let next;
      if (localHash === remoteHash) next = local;
      // New modules share one active slot. Reconcile divergent trials rather than
      // replacing one through the metadata fast path. A known unchanged side
      // still acknowledges the other side's explicit preparation cancellation.
      else if (hasReasoningActive && meta?.fingerprint !== remoteHash
        && !(meta?.fingerprint === localHash && remoteData.activeTrial == null)) next = mergePersonalData(local, remoteData);
      else if (meta?.fingerprint === localHash) next = remoteData;
      else if (remote.data === null || meta?.fingerprint === remoteHash) next = local;
      else next = mergePersonalData(local, remoteData);
      // Inputs typed during the request always participate in the saved snapshot.
      if (next !== local || store.getSnapshot().data !== local) {
        applyingRemote = true;
        try {
          store.update(latest => {
            const candidate = latest === local ? next : mergePersonalData(latest, next);
            return JSON.stringify(candidate) === JSON.stringify(latest) ? latest : candidate;
          });
        } finally { applyingRemote = false; }
      }
      const outgoing = store.getSnapshot().data;
      const outgoingHash = await personalFingerprint(outgoing);
      if (remote.data !== null && outgoingHash === remoteHash) {
        remember(outgoingHash, remote);
        if (store.getSnapshot().data !== outgoing) requested = true;
        status(requested ? { phase: 'pending' } : { phase: 'synced', syncedAt: meta.syncedAt });
        return;
      }
      try {
        const saved = await request('PUT', { version: 1, baseRevision: remote.revision, data: outgoing });
        if (saved.revision <= remote.revision) throw new Error('Cloud write did not advance its revision.');
        remember(outgoingHash, saved);
        if (store.getSnapshot().data !== outgoing) requested = true;
        status(requested ? { phase: 'pending' } : { phase: 'synced', syncedAt: meta.syncedAt });
        return;
      } catch (error) {
        if (error.status !== 409 || attempt === 2) throw error;
      }
    }
  }
  function sync() {
    if (stopped && !flushOnStop) return Promise.resolve();
    if (running) { requested = true; return running; }
    clearTimeout(timer);
    timer = null;
    running = (async () => {
      do {
        requested = false;
        await perform().catch(error => {
          status({ phase: error.status === 401 ? 'auth' : 'error', message: error.message });
        });
      } while (requested && (!stopped || flushOnStop));
    })().finally(() => {
      running = null;
      flushOnStop = false;
    });
    return running;
  }
  function schedule() {
    if (!enabled || stopped || applyingRemote) return;
    status({ phase: 'pending' });
    if (running) { requested = true; return; }
    clearTimeout(timer);
    timer = setTimeout(sync, debounceMs);
  }
  const wake = () => { if (!stopped) sync(); };
  return {
    enabled, sync,
    start() {
      stopped = false;
      if (enabled && !unsubscribe) {
        unsubscribe = store.subscribe(schedule);
        interval = setInterval(wake, 30000);
        eventTarget?.addEventListener('online', wake);
        eventTarget?.addEventListener('focus', wake);
      }
      return sync();
    },
    stop() {
      // Route navigation flushes drafts; the local copy remains available offline.
      const pending = Boolean(timer || running || requested);
      stopped = true;
      clearTimeout(timer); clearInterval(interval); unsubscribe?.();
      timer = null; interval = null; unsubscribe = null;
      eventTarget?.removeEventListener('online', wake);
      eventTarget?.removeEventListener('focus', wake);
      if (enabled && pending) { flushOnStop = true; return sync(); }
      return Promise.resolve();
    },
  };
}
