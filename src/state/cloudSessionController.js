export function createCloudSessionController(deps = {}) {
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;

  function apply(payload = {}, options = {}) {
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    const account = payload.account ? deps.normalizeAccount?.(payload.account) : null;
    if (!account) return;
    const localFields = options.passwordHash ? { passwordHash: options.passwordHash } : {};
    deps.upsertLocalAccount?.(account, localFields);

    appState.cloudConfig = deps.applyCloudSessionConfig?.(appState.cloudConfig, payload, account);
    deps.saveCloudConfig?.();

    const sessionState = deps.buildCloudSessionState?.(payload, {
      localState: options.localState || deps.loadStateForUser?.(account.id),
      merge: options.merge,
      mergeProblemStates: deps.mergeProblemStates,
      mergeCloudState: deps.mergeCloudState,
      normalizeState: deps.normalizeState
    });
    deps.writeUserState?.(account.id, sessionState.nextState, {
      serializeState: deps.localStatePayload,
      userStateKey: deps.userStateKey
    });
    if (userStateStore) userStateStore.value = sessionState.nextState;
    deps.clearProblemLookupCaches?.();

    appState.community = deps.buildCloudSessionCommunity?.(payload, {
      currentCommunity: appState.community,
      localCommunity: options.localCommunity || appState.community,
      merge: options.merge,
      normalizeCommunityStore: deps.normalizeCommunityStore,
      mergeCloudCommunity: deps.mergeCloudCommunity
    });
    deps.saveCommunity?.({ sync: false, checkIn: false });
    deps.queueCloudSync?.("state", 0);
    deps.queueCloudSync?.("community", 0);
    deps.queueCloudSync?.("account", 0);
    deps.invalidateLeaderboardCloud?.({ refresh: true });
  }

  return {
    apply
  };
}
