import { createAppStore } from "../state/appStore.js";
import { createAuthStore } from "../state/authStore.js";
import { createUserStateStore } from "../state/userStateStore.js";
import { createPreferencesStore } from "../state/preferencesStore.js";
import { createCommunityStore } from "../state/communityStore.js";

export function createDomainStores({
  appState,
  appRuntime,
  userStateRuntime
} = {}) {
  const appStore = createAppStore({
    appPrefs: appState?.appPrefs,
    community: appState?.community,
    cloudConfig: appState?.cloudConfig
  });

  const authStore = createAuthStore({
    auth: appState?.auth,
    currentUser: appState?.currentUser
  });

  const userStateStore = createUserStateStore({
    value: userStateRuntime?.state?.value || {}
  });

  const preferencesStore = createPreferencesStore({
    language: appState?.appPrefs?.language,
    sidebarCollapsed: appState?.appPrefs?.sidebarCollapsed
  });

  const communityStore = createCommunityStore({
    value: appState?.community || {}
  });

  const syncAppStore = () => {
    appStore.actions.patch({
      appPrefs: appState.appPrefs,
      community: appState.community,
      cloudConfig: appState.cloudConfig
    });
    appRuntime?.notify?.();
  };

  const syncAuthStore = () => {
    authStore.actions.patchAuth(appState.auth || {});
    authStore.actions.setCurrentUser(appState.currentUser || null);
  };

  const syncUserStateStore = () => {
    userStateStore.actions.replace(userStateRuntime?.state?.value || {});
  };

  const syncPreferencesStore = () => {
    preferencesStore.actions.setLanguage(appState?.appPrefs?.language || "zh");
    preferencesStore.actions.setSidebarCollapsed(Boolean(appState?.appPrefs?.sidebarCollapsed));
  };

  const syncCommunityStore = () => {
    communityStore.actions.replace(appState?.community || {});
  };

  const syncAll = () => {
    syncAppStore();
    syncAuthStore();
    syncUserStateStore();
    syncPreferencesStore();
    syncCommunityStore();
  };

  syncAll();

  return {
    appStore,
    authStore,
    userStateStore,
    preferencesStore,
    communityStore,
    syncAppStore,
    syncAuthStore,
    syncUserStateStore,
    syncPreferencesStore,
    syncCommunityStore,
    syncAll
  };
}

export function wrapAuthMutations(handlers = {}, sync = () => {}) {
  const wrap = (fn) => (...args) => {
    const result = fn?.(...args);
    if (result && typeof result.then === "function") {
      return result.finally(sync);
    }
    sync();
    return result;
  };
  return {
    loginLocal: wrap(handlers.loginLocal),
    logout: wrap(handlers.logout),
    registerLocal: wrap(handlers.registerLocal),
    saveAccount: wrap(handlers.saveAccount),
    saveAuth: wrap(handlers.saveAuth),
    submitEmailAuth: wrap(handlers.submitEmailAuth),
    upsertLocalAccount: wrap(handlers.upsertLocalAccount)
  };
}

export function wrapUserStateMutations(userStateRuntime, syncUserStateStore) {
  if (!userStateRuntime) return;
  const originalSave = userStateRuntime.save?.bind(userStateRuntime);
  const originalSetValue = userStateRuntime.setValue?.bind(userStateRuntime);
  const originalLoadCurrent = userStateRuntime.loadCurrent?.bind(userStateRuntime);

  if (originalSave) {
    userStateRuntime.save = (...args) => {
      const result = originalSave(...args);
      syncUserStateStore();
      return result;
    };
  }
  if (originalSetValue) {
    userStateRuntime.setValue = (...args) => {
      const result = originalSetValue(...args);
      syncUserStateStore();
      return result;
    };
  }
  if (originalLoadCurrent) {
    userStateRuntime.loadCurrent = (...args) => {
      const result = originalLoadCurrent(...args);
      syncUserStateStore();
      return result;
    };
  }
}
