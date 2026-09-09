import { createStore } from './store.js';
import { clearLocalRecovery, rememberLocalRecovery } from './localRecovery.js';

export function createUserStateRuntime(initialState = {}, deps = {}) {
  let value = typeof initialState === "function" ? initialState() : initialState;
  const state = {};
  const store = createStore(value);
  const unsavedByOwner = new Map();

  Object.defineProperty(state, "value", {
    get() {
      return value;
    },
    set(nextValue) {
      setValue(nextValue);
    },
    enumerable: true
  });

  function setValue(nextStateValue) {
    const nextValue = nextStateValue || {};
    value = nextValue;
    store.setState(nextValue, { replace: true });
    return nextValue;
  }

  function loadForUser(userId) {
    if (unsavedByOwner.has(String(userId))) return unsavedByOwner.get(String(userId));
    return deps.loadUserState?.(userId, {
      createBaseState: deps.createBaseState,
      normalizeState: deps.normalizeState,
      userStateKey: deps.userStateKey
    }) || deps.createBaseState?.() || {};
  }

  function loadCurrent() {
    const currentUser = deps.getCurrentUser?.();
    return setValue(currentUser ? loadForUser(currentUser.id) : deps.createBaseState?.() || {});
  }

  function save(options = {}) {
    const currentUser = deps.getCurrentUser?.();
    if (!currentUser) return false;
    const activityHooks = deps.getActivityHooks?.() || {};
    const checkInResult = options.checkIn === false ? null : activityHooks.markActivity?.();
    state.value.updatedAt = deps.nowIso?.() || new Date().toISOString();
    const saved = deps.writeUserState?.(currentUser.id, state.value, {
      serializeState: deps.serializeState,
      userStateKey: deps.userStateKey
    });
    if (saved === false) {
      const ownerId = String(currentUser.id);
      unsavedByOwner.set(ownerId, state.value);
      rememberLocalRecovery(ownerId, 'user-state', { backup: deps.serializeState?.(state.value) || state.value, retry: () => {
        if (String(deps.getCurrentUser?.()?.id || '') === ownerId) return save({ checkIn: false });
        return false;
      } });
    } else {
      unsavedByOwner.delete(String(currentUser.id));
      clearLocalRecovery(currentUser.id, 'user-state');
    }
    if (options.sync !== false) deps.queueCloudSync?.("state");
    store.setState(state.value);
    if (saved !== false) activityHooks.queueCelebration?.(checkInResult);
    return saved !== false;
  }

  function clearForUser(userId) {
    deps.clearUserState?.(userId, {
      userStateKey: deps.userStateKey
    });
    unsavedByOwner.delete(String(userId));
    clearLocalRecovery(userId, 'user-state');
  }

  function migrateLegacy(userId) {
    return deps.migrateLegacyState?.(userId, {
      legacyKey: deps.legacyKey,
      normalizeState: deps.normalizeState,
      serializeState: deps.serializeState,
      userStateKey: deps.userStateKey
    });
  }

  return {
    clearForUser,
    loadCurrent,
    loadForUser,
    migrateLegacy,
    save,
    setValue,
    store,
    subscribe: store.subscribe,
    state
  };
}
