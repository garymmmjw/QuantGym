export function createCloudSyncController(options = {}) {
  const {
    defaultDelay = 0,
    scheduler = globalThis.window || globalThis,
    getCurrentUser = () => null,
    getConfig = () => ({}),
    canUseCloud = () => false,
    buildBody = () => ({}),
    cloudApi = async () => ({}),
    onSuccess = () => {},
    onError = () => {}
  } = options;
  let timer = null;
  let inFlight = false;
  let activeFlush = null;
  let dirty = createDirtyState();

  function clearTimer() {
    if (!timer) return;
    scheduler.clearTimeout?.(timer);
    timer = null;
  }

  function queue(scope, delay = defaultDelay) {
    const currentUser = getCurrentUser();
    const config = getConfig();
    if (!currentUser || !config.token || config.userId !== currentUser.id) return;
    dirty[scope] = true;
    clearTimer();
    timer = scheduler.setTimeout?.(flush, delay) || null;
  }

  function flush() {
    if (!canUseCloud()) return Promise.resolve({ ok: false });
    if (activeFlush) return activeFlush.then(result => {
      if (!result?.ok) return result;
      return (dirty.state || dirty.community || dirty.account) ? flush() : result;
    });
    clearTimer();
    const pending = { ...dirty };
    if (!pending.state && !pending.community && !pending.account) return Promise.resolve({ ok: true });
    const ownerId = getCurrentUser()?.id;
    const sessionToken = getConfig().token;
    const sameSession = () => getCurrentUser()?.id === ownerId && getConfig().token === sessionToken;
    dirty = createDirtyState();
    inFlight = true;
    activeFlush = Promise.resolve().then(async () => {
      try {
        if (!sameSession()) return { ok: false };
        const result = await cloudApi("/sync", { method: "POST", body: buildBody(pending) });
        if (sameSession()) onSuccess(result, pending);
        return { ok: sameSession(), result };
      } catch (error) {
        if (sameSession()) {
          dirty = { state: dirty.state || pending.state, community: dirty.community || pending.community, account: dirty.account || pending.account };
          onError(error, pending);
        }
        return { ok: false, error };
      } finally { inFlight = false; activeFlush = null; }
    });
    return activeFlush;
  }

  function markAllDirty() {
    dirty = { state: true, community: true, account: true };
  }

  return {
    queue,
    flush,
    markAllDirty,
    isInFlight() {
      return inFlight;
    },
    getDirty() {
      return { ...dirty };
    }
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
  if (dirty.community) body.community = community;
  if (dirty.account) body.account = sanitizeAccount(currentUser);
  return body;
}

function createDirtyState() {
  return { state: false, community: false, account: false };
}
