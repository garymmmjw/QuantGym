import { migrateVerifiedCareerOwner } from './careerOwnerMigration.js';

export function createCloudSessionController(deps = {}) {
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;

  function apply(payload = {}, options = {}) {
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    const account = payload.account ? deps.normalizeAccount?.({ ...payload.account, cloudLinked: true }) : null;
    if (!account) return;
    const invalidLinks = options.careerOwnerLinks != null && !Array.isArray(options.careerOwnerLinks);
    const links = [...(options.careerOwnerLink ? [options.careerOwnerLink] : []), ...(Array.isArray(options.careerOwnerLinks) ? options.careerOwnerLinks : [])];
    if (links.length || invalidLinks) {
      // Validate every verified identity link before any migration is written.
      // A matching email alone is never sufficient to join private records.
      if (invalidLinks || links.some(link => !link || typeof link.sourceOwnerId !== 'string' || !link.sourceOwnerId.trim()
        || link.sourceOwnerId.length > 300 || link.sourceOwnerId === 'guest'
        || link.targetOwnerId !== account.id || !['password', 'google'].includes(link.method))
        || typeof payload.token !== 'string' || !payload.token.trim()) {
        const error = new Error('投递记录账号关联未通过本次登录验证，原始记录已保留。');
        error.code = 'CAREER_OWNER_MIGRATION_FAILED';
        throw error;
      }
      let storage;
      try { storage = deps.storage || globalThis.localStorage; } catch { storage = null; }
      for (const sourceOwnerId of new Set(links.map(link => link.sourceOwnerId))) {
        (deps.migrateVerifiedCareerOwner || migrateVerifiedCareerOwner)({
          sourceOwnerId, targetOwnerId: account.id, verified: true,
          storage, eventTarget: deps.eventTarget || globalThis.window,
        });
      }
    }
    const sessionState = deps.buildCloudSessionState?.(payload, {
      localState: options.localState || deps.loadStateForUser?.(account.id),
      merge: options.merge,
      mergeProblemStates: deps.mergeProblemStates,
      mergeCloudState: deps.mergeCloudState,
      normalizeState: deps.normalizeState
    });
    const saved = deps.writeUserState?.(account.id, sessionState.nextState, {
      serializeState: deps.localStatePayload,
      userStateKey: deps.userStateKey
    });
    if (saved === false) {
      const error = new Error('账号记录未能保存，原始记录已保留。请检查浏览器存储空间后重新登录。');
      error.code = 'CAREER_OWNER_MIGRATION_FAILED';
      throw error;
    }
    const localFields = options.passwordHash ? { passwordHash: options.passwordHash } : {};
    deps.upsertLocalAccount?.(account, localFields);
    appState.cloudConfig = deps.applyCloudSessionConfig?.(appState.cloudConfig, payload, account);
    deps.saveCloudConfig?.();
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
