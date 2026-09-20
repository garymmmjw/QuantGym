import { migrateVerifiedCareerOwner } from './careerOwnerMigration.js';

export function createCloudSessionController(deps = {}) {
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;

  function apply(payload = {}, options = {}) {
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    const account = payload.account ? deps.normalizeAccount?.({ ...payload.account, cloudLinked: true }) : null;
    if (!account) return;
    const link = options.careerOwnerLink;
    if (link) {
      if (link.targetOwnerId !== account.id || !['password', 'google'].includes(link.method)
        || typeof payload.token !== 'string' || !payload.token.trim()) {
        const error = new Error('投递记录账号关联未通过本次登录验证，原始记录已保留。');
        error.code = 'CAREER_OWNER_MIGRATION_FAILED';
        throw error;
      }
      let storage;
      try { storage = deps.storage || globalThis.localStorage; } catch { storage = null; }
      (deps.migrateVerifiedCareerOwner || migrateVerifiedCareerOwner)({
        sourceOwnerId: link.sourceOwnerId, targetOwnerId: account.id, verified: true,
        storage, eventTarget: deps.eventTarget || globalThis.window,
      });
    }
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
