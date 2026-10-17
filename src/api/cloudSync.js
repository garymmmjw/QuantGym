const scopes = ['state', 'community', 'account', 'problemStates'];
const hasPending = value => scopes.some(scope => Boolean(value?.[scope]));
const emptyDirty = () => Object.fromEntries(scopes.map(scope => [scope, false]));
const endpointOf = config => String(config?.endpoint || '').trim().replace(/\/+$/, '');
const marker = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

/** Account-scoped outbox. Local state is durable before queue() is called. */
export function createCloudSyncController(options = {}) {
  const {
    defaultDelay = 0, scheduler = globalThis.window || globalThis,
    eventTarget = globalThis.window, getCurrentUser = () => null, getConfig = () => ({}),
    canUseCloud = () => false, buildBody = () => ({}), beforeSync = () => {},
    cloudApi = async () => ({}), onSuccess = () => {}, onError = () => {}, onStatus = () => {},
  } = options;
  let storage;
  try { storage = options.storage === undefined ? globalThis.localStorage : options.storage; } catch { storage = null; }
  const entries = new Map();
  let active = null, started = false, stopped = false;

  function session() {
    const user = getCurrentUser(), config = getConfig();
    if (!user?.id || !config?.token || config.userId !== user.id || !canUseCloud()) return null;
    const key = JSON.stringify([endpointOf(config), user.id, config.token]);
    let entry = entries.get(key);
    if (!entry) {
      entry = { key, ownerId: user.id, storageKey: `quantgym.cloud-outbox.v1:${encodeURIComponent(endpointOf(config))}:${encodeURIComponent(user.id)}`,
        dirty: {}, stored: {}, refreshing: null, requestedPull: false, timer: null, retry: 0, task: null, phase: 'loading', error: '', initialPulled: false };
      entries.set(key, entry);
    }
    return entry;
  }
  const current = entry => !stopped && session() === entry;
  function readDirty(entry) {
    if (!storage) return entry.dirty;
    try {
      const saved = JSON.parse(storage.getItem(entry.storageKey) || '{}');
      for (const scope of scopes) {
        if (typeof saved?.[scope] === 'string') entry.dirty[scope] = saved[scope];
        else if (entry.dirty[scope] === entry.stored[scope]) delete entry.dirty[scope];
      }
      entry.stored = { ...saved };
    } catch { /* Unsynced data remains in the account's local state. */ }
    return entry.dirty;
  }
  function persist(entry) {
    if (!storage) return;
    try {
      storage.setItem(entry.storageKey, JSON.stringify(entry.dirty));
      entry.stored = { ...entry.dirty };
    } catch { /* Current-session retries still work. */ }
  }
  function status(entry, phase, error = '') {
    entry.phase = phase; entry.error = error;
    if (current(entry)) onStatus({ phase, error, ownerId: entry.ownerId, initialPulled: entry.initialPulled });
  }
  function clearTimer(entry) {
    if (entry?.timer != null) scheduler.clearTimeout?.(entry.timer);
    if (entry) entry.timer = null;
  }
  function schedule(entry, delay, pull = false) {
    clearTimer(entry);
    if (!current(entry)) return;
    entry.timer = scheduler.setTimeout?.(() => { entry.timer = null; if (current(entry)) void (pull ? refresh() : flush()); }, delay) ?? null;
    entry.timer?.unref?.();
  }
  function queue(scope, delay = defaultDelay) {
    if (!scopes.includes(scope)) return;
    const entry = session();
    if (!entry || stopped) return;
    readDirty(entry); entry.dirty[scope] = marker(); persist(entry);
    status(entry, entry.task ? 'syncing' : 'pending');
    schedule(entry, delay);
  }
  function markAllDirty() {
    const entry = session();
    if (!entry || stopped) return;
    readDirty(entry);
    for (const scope of scopes) entry.dirty[scope] = marker();
    persist(entry); status(entry, entry.task ? 'syncing' : 'pending');
  }
  function run(entry, pull) {
    clearTimer(entry);
    const task = Promise.resolve().then(async () => {
      if (!current(entry)) return { ok: false };
      let dirty = emptyDirty();
      try {
        beforeSync();
        if (!current(entry)) return { ok: false };
        const captured = { ...readDirty(entry) };
        dirty = Object.fromEntries(scopes.map(scope => [scope, Boolean(captured[scope])]));
        if (!pull && !hasPending(dirty)) return { ok: true };
        status(entry, 'syncing');
        const result = pull
          ? await cloudApi('/problem-states', { method: 'GET', cache: 'no-store' })
          : await cloudApi('/sync', { method: 'POST', body: buildBody(dirty) });
        if (!current(entry)) return { ok: false };
        onSuccess(result, pull ? emptyDirty() : dirty, { pull });
        if (pull) entry.initialPulled = true;
        if (!pull) {
          // An edit during the request has a new marker and cannot be acknowledged
          // by the older response, including an edit from another browser tab.
          readDirty(entry);
          for (const scope of scopes) if (entry.dirty[scope] === captured[scope]) delete entry.dirty[scope];
          persist(entry);
        }
        entry.retry = 0;
        status(entry, hasPending(entry.dirty) ? 'pending' : 'synced');
        return { ok: true, result };
      } catch (error) {
        if (current(entry)) {
          onError(error, dirty);
          status(entry, 'error', error?.message || 'Cloud sync failed');
          // Credentials need an explicit login; transient outages retry with backoff.
          if (![401, 403].includes(error?.status)) {
            entry.retry = Math.min(entry.retry + 1, 5);
            schedule(entry, Math.min(60000, 5000 * 2 ** (entry.retry - 1)), pull);
          }
        }
        return { ok: false, error };
      }
    }).finally(() => { if (entry.task === task) entry.task = null; });
    entry.task = task;
    return task;
  }
  function flush() {
    const entry = session();
    if (!entry || stopped) return Promise.resolve({ ok: false });
    if (entry.task) return entry.task.then(result => result?.ok && current(entry) && hasPending(readDirty(entry)) ? flush() : result);
    if (!hasPending(readDirty(entry))) { clearTimer(entry); return Promise.resolve({ ok: true }); }
    return run(entry, false).then(result => result?.ok && current(entry) && hasPending(readDirty(entry)) ? flush() : result);
  }
  function refresh() {
    const entry = session();
    if (!entry || stopped) return Promise.resolve({ ok: false });
    // A refresh requested during a write must run its GET afterwards. A newer
    // request during a read also gets one trailing read, coalescing repeated events.
    entry.requestedPull = true;
    if (entry.refreshing) return entry.refreshing;
    const refreshing = (async () => {
      if (entry.task) await entry.task;
      let result = { ok: false };
      while (current(entry) && entry.requestedPull) {
        entry.requestedPull = false;
        if (entry.task) await entry.task;
        if (!current(entry)) return { ok: false };
        result = await run(entry, true);
        if (!result?.ok || !current(entry)) return result;
        result = await flush();
        if (!result?.ok) return result;
      }
      return result;
    })().finally(() => { if (entry.refreshing === refreshing) entry.refreshing = null; });
    entry.refreshing = refreshing;
    return refreshing;
  }
  function sessionChanged() {
    const next = session();
    if (next === active) return;
    clearTimer(active); active = next;
    if (next) status(next, next.initialPulled ? (hasPending(readDirty(next)) ? 'pending' : 'synced') : 'loading');
    else onStatus({ phase: 'disconnected', ownerId: '', error: '', initialPulled: false });
    if (started && next) void refresh();
  }
  const onVisible = () => {
    if (eventTarget?.document?.hidden) return;
    sessionChanged();
    void refresh();
  };
  // Start the request now rather than waiting for a debounce during page close.
  // If the browser terminates it, the durable marker survives for next login.
  const onHide = () => { void flush(); };
  function start() {
    if (started) return refresh();
    started = true; stopped = false; active = session();
    if (active) status(active, 'loading');
    eventTarget?.addEventListener?.('focus', onVisible);
    eventTarget?.addEventListener?.('online', onVisible);
    eventTarget?.addEventListener?.('pageshow', onVisible);
    eventTarget?.addEventListener?.('pagehide', onHide);
    eventTarget?.document?.addEventListener?.('visibilitychange', onVisibility);
    return refresh();
  }
  function onVisibility() { if (eventTarget?.document?.hidden) onHide(); else onVisible(); }
  function stop() {
    stopped = true; started = false;
    for (const entry of entries.values()) clearTimer(entry);
    eventTarget?.removeEventListener?.('focus', onVisible);
    eventTarget?.removeEventListener?.('online', onVisible);
    eventTarget?.removeEventListener?.('pageshow', onVisible);
    eventTarget?.removeEventListener?.('pagehide', onHide);
    eventTarget?.document?.removeEventListener?.('visibilitychange', onVisibility);
  }
  return {
    queue, flush, refresh, start, stop, sessionChanged, markAllDirty,
    isInFlight: () => Boolean(session()?.task),
    getDirty: () => { const entry = session(); const dirty = entry ? readDirty(entry) : {}; return Object.fromEntries(scopes.map(scope => [scope, Boolean(dirty[scope])])); },
    getStatus: () => { const entry = session(); return entry ? { phase: entry.phase, error: entry.error, ownerId: entry.ownerId, initialPulled: entry.initialPulled } : { phase: 'disconnected', error: '', ownerId: '', initialPulled: false }; },
  };
}

export function buildCloudSyncBody(dirty = {}, deps = {}) {
  const {
    state = {},
    community = {},
    currentUser = null,
    cloudStatePayload = (value) => value,
    getUserCatalogProblems = (problems) => problems || [],
    sanitizeAccount = (account) => account
  } = deps;
  const body = {};
  if (dirty.state) {
    body.state = cloudStatePayload(state);
    body.problemStates = state.problemStates || [];
    body.problems = getUserCatalogProblems(state.problems);
  }
  if (dirty.problemStates && !dirty.state) body.problemStates = state.problemStates || [];
  if (dirty.community) body.community = community;
  if (dirty.account) body.account = sanitizeAccount(currentUser);
  return body;
}
