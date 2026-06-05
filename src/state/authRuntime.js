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
    saveAuth(storageKey, getAuth());
  }

  function currentUser() {
    return getCurrentUser(getAuth());
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
