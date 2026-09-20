import {
  getCurrentUser,
  loadAuth,
  saveAuth,
  upsertAuthAccount
} from './auth.js';

export function createAuthStateRuntime(deps = {}) {
  const storageKey = deps.storageKey || "";
  const getAuth = () => deps.getAuth?.() || {};

  function load() {
    return loadAuth(storageKey, {
      defaultGoogleClientId: deps.defaultGoogleClientId || "",
      normalizeAccount: deps.normalizeAccount
    });
  }

  function save() {
    return saveAuth(storageKey, getAuth());
  }

  function currentUser() {
    const user = getCurrentUser(getAuth());
    if (!user) return null;
    const config = deps.getCloudConfig?.() || {};
    // Old device-only identities remain available for verified migration, but
    // cannot authorize a session. Cached verified accounts keep offline access.
    return user.cloudLinked === true || (config.token && config.userId === user.id) ? user : null;
  }

  function upsertLocalAccount(account, localFields = {}) {
    upsertAuthAccount(getAuth(), account, {
      localFields,
      normalizeAccount: deps.normalizeAccount
    });
    save();
    const current = currentUser();
    deps.setCurrentUser?.(current);
    return current;
  }

  return {
    currentUser,
    load,
    save,
    upsertLocalAccount
  };
}
