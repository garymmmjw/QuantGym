import { createPersonalState, mergePersonalData, validatePersonalData } from './personalStore.js';
import { mergeTrackerOperations } from '../tracker/trackerSyncModel.js';
import { reportCloudSessionResponse } from '../../state/cloudSessionStatus.js';
import { retainExplicitCompletionActivities } from './completionActivities.js';
import { retainBehavioralData } from './behavioral/questions.js';

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
  let stopped = false, running = null, requested = false, timer = null, pollTimer = null, unsubscribe = null;
  let applyingRemote = false, flushOnStop = false;
  let authRejected = false;
  let failures = 0, retryAt = 0, pendingWrite = false;
  // Keep only the existing local object's identity, not a second full cloud copy.
  // A new controller always reads the server before trusting persisted metadata.
  let confirmed = null;
  const page = eventTarget?.document || globalThis.document;
  const visible = () => page?.visibilityState !== 'hidden';
  const status = (value) => { if (!stopped) onStatus(value); };
  async function request(method, body, etag) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(`${base}/personal-prep`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(etag ? { 'If-None-Match': etag } : {}) },
        body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: controller.signal,
      });
      reportCloudSessionResponse({ endpoint: base, token, userId: ownerId }, response.status);
      if (response.status === 304) {
        if (method !== 'GET' || !etag) throw new Error('Unexpected cloud cache response.');
        // The private revision endpoint authenticates conditional reads too.
        reportCloudSessionResponse({ endpoint: base, token, userId: ownerId }, 200);
        return { notModified: true };
      }
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) authRejected = true;
      if (!response.ok) throw Object.assign(new Error(payload.error || `HTTP ${response.status}`), { status: response.status });
      if (payload.version !== 1 || !Number.isInteger(payload.revision) || payload.revision < 0) throw new Error('Invalid cloud revision.');
      if (payload.data !== null) payload.data = validatePersonalData(payload.data);
      payload.etag = response.headers.get('ETag');
      return payload;
    } finally { clearTimeout(timeout); }
  }
  function remember(fingerprint, envelope, localData) {
    meta = { fingerprint, revision: envelope.revision, syncedAt: envelope.updatedAt || new Date().toISOString() };
    confirmed = envelope.etag && localData ? { data: localData, etag: envelope.etag } : null;
    try { storage?.setItem(metaKey, JSON.stringify(meta)); } catch { /* The next sync will conservatively merge. */ }
  }
  async function perform() {
    if (!enabled) { status({ phase: 'local' }); return; }
    status({ phase: 'syncing' });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const snapshot = store.getSnapshot();
      if (snapshot.conflict || snapshot.error?.startsWith('read:')) throw new Error('Resolve local storage recovery before syncing.');
      if (confirmed?.data !== snapshot.data) confirmed = null;
      const baseline = confirmed?.data === snapshot.data ? confirmed : null;
      let remote = await request('GET', undefined, baseline?.etag);
      if (remote.notModified) {
        const latest = store.getSnapshot();
        if (latest.conflict || latest.error?.startsWith('read:')) throw new Error('Resolve local storage recovery before syncing.');
        if (latest.data === baseline.data) {
          status({ phase: 'synced', syncedAt: meta.syncedAt });
          return;
        }
        // A keystroke or another tab can change local data during the 304. Read
        // the complete revision before merging/uploading that newly pending work.
        remote = await request('GET');
      }
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
      // Tracker deletions and restores are immutable operations. Even a known
      // unchanged side cannot acknowledge another client's missing journal.
      const careerTrackerOperations = mergeTrackerOperations(local.careerTrackerOperations, remoteData.careerTrackerOperations);
      if (JSON.stringify(next.careerTrackerOperations) !== JSON.stringify(careerTrackerOperations)) next = { ...next, careerTrackerOperations };
      next = retainBehavioralData(next, local, remoteData);
      next = retainExplicitCompletionActivities(next, local, remoteData);
      // Inputs typed during the request always participate in the saved snapshot.
      if (next !== local || store.getSnapshot().data !== local) {
        applyingRemote = true;
        try {
          store.applyExternal(latest => {
            const candidate = latest === local ? next : mergePersonalData(latest, next);
            return candidate;
          });
        } finally { applyingRemote = false; }
      }
      const outgoing = store.getSnapshot().data;
      const outgoingHash = await personalFingerprint(outgoing);
      if (remote.data !== null && outgoingHash === remoteHash) {
        remember(outgoingHash, remote, outgoing);
        requested = store.getSnapshot().data !== outgoing;
        status(requested ? { phase: 'pending' } : { phase: 'synced', syncedAt: meta.syncedAt });
        return;
      }
      try {
        const saved = await request('PUT', { version: 1, baseRevision: remote.revision, data: outgoing });
        if (saved.revision <= remote.revision) throw new Error('Cloud write did not advance its revision.');
        if (saved.data === null) throw new Error('Cloud write did not return the saved data.');
        // The server may retain immutable records omitted by an older client.
        // Its acknowledged snapshot, not our outgoing body, is the sync baseline.
        const confirmedHash = await personalFingerprint(saved.data);
        applyingRemote = true;
        try {
          store.applyExternal(latest => {
            const candidate = latest === outgoing
              ? retainBehavioralData({ ...saved.data, careerTrackerOperations: mergeTrackerOperations(outgoing.careerTrackerOperations, saved.data.careerTrackerOperations) }, outgoing)
              : mergePersonalData(latest, saved.data);
            return candidate;
          });
        } finally { applyingRemote = false; }
        const acknowledgedLocal = store.getSnapshot().data;
        const matches = await personalFingerprint(acknowledgedLocal) === confirmedHash;
        remember(confirmedHash, saved, matches ? acknowledgedLocal : null);
        requested = !matches || store.getSnapshot().data !== acknowledgedLocal;
        status(requested ? { phase: 'pending' } : { phase: 'synced', syncedAt: meta.syncedAt });
        return;
      } catch (error) {
        if (error.status !== 409 || attempt === 2) throw error;
      }
    }
  }
  function sync() {
    if (authRejected) { status({ phase: 'auth' }); return Promise.resolve(); }
    if (stopped && !flushOnStop) return Promise.resolve();
    // Only store changes request another pass. Repeated focus/manual/poll reads
    // join the current request without queuing another full reconciliation.
    if (running) return running;
    clearTimeout(timer);
    clearTimeout(pollTimer);
    timer = null;
    pollTimer = null;
    running = (async () => {
      do {
        requested = false;
        try {
          await perform();
          failures = 0;
          retryAt = 0;
          pendingWrite = requested;
        } catch (error) {
          failures += 1;
          retryAt = Date.now() + Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4));
          status({ phase: error.status === 401 ? 'auth' : 'error', message: error.message });
          // Edits made during a failed request remain durable and retry later;
          // they must not turn an outage into an immediate request loop.
          break;
        }
      } while (requested && !authRejected && (!stopped || flushOnStop));
    })().finally(() => {
      running = null;
      flushOnStop = false;
      schedulePoll();
    });
    return running;
  }
  function schedule() {
    if (!enabled || stopped || applyingRemote) return;
    if (authRejected) { status({ phase: 'auth' }); return; }
    if (confirmed?.data !== store.getSnapshot().data) confirmed = null;
    pendingWrite = true;
    status({ phase: 'pending' });
    if (running) { requested = true; return; }
    if (!visible()) return;
    clearTimeout(timer);
    timer = setTimeout(sync, Math.max(debounceMs, retryAt - Date.now()));
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = null;
    if (!enabled || stopped || !unsubscribe || authRejected || !visible()) return;
    pollTimer = setTimeout(wake, retryAt ? Math.max(0, retryAt - Date.now()) : 30000);
  }
  const wake = () => {
    if (stopped || !visible()) return Promise.resolve();
    if (Date.now() < retryAt) { schedulePoll(); return Promise.resolve(); }
    return sync();
  };
  const visibilityChanged = () => {
    if (visible()) wake();
    else { clearTimeout(pollTimer); pollTimer = null; }
  };
  return {
    enabled, sync,
    start() {
      stopped = false;
      if (enabled && !unsubscribe) {
        unsubscribe = store.subscribe(schedule);
        eventTarget?.addEventListener('online', wake);
        eventTarget?.addEventListener('focus', wake);
        page?.addEventListener('visibilitychange', visibilityChanged);
      }
      return wake();
    },
    stop() {
      // Route navigation flushes drafts; the local copy remains available offline.
      const pending = Boolean(timer || running || requested || pendingWrite);
      stopped = true;
      clearTimeout(timer); clearTimeout(pollTimer); unsubscribe?.();
      timer = null; pollTimer = null; unsubscribe = null;
      eventTarget?.removeEventListener('online', wake);
      eventTarget?.removeEventListener('focus', wake);
      page?.removeEventListener('visibilitychange', visibilityChanged);
      if (enabled && pending) { flushOnStop = true; return sync(); }
      return Promise.resolve();
    },
  };
}
