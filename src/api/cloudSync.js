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

  async function flush() {
    if (!canUseCloud()) return;
    if (inFlight) {
      clearTimer();
      timer = scheduler.setTimeout?.(flush, defaultDelay) || null;
      return;
    }

    const pending = { ...dirty };
    if (!pending.state && !pending.community && !pending.account) return;
    dirty = createDirtyState();
    inFlight = true;

    try {
      const result = await cloudApi("/sync", {
        method: "POST",
        body: buildBody(pending)
      });
      onSuccess(result, pending);
    } catch (error) {
      dirty = {
        state: dirty.state || pending.state,
        community: dirty.community || pending.community,
        account: dirty.account || pending.account
      };
      onError(error, pending);
    } finally {
      inFlight = false;
    }
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
