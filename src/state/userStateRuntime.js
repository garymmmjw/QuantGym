import { createStore } from './store.js';

export function createUserStateRuntime(initialState = {}, deps = {}) {
  let value = typeof initialState === "function" ? initialState() : initialState;
  const state = {};
  const store = createStore(value);

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
    if (!currentUser) return;
    const activityHooks = deps.getActivityHooks?.() || {};
    const checkInResult = options.checkIn === false ? null : activityHooks.markActivity?.();
    state.value.updatedAt = deps.nowIso?.() || new Date().toISOString();
    deps.writeUserState?.(currentUser.id, state.value, {
      serializeState: deps.serializeState,
      userStateKey: deps.userStateKey
    });
    if (options.sync !== false) deps.queueCloudSync?.("state");
    store.setState(state.value);
    activityHooks.queueCelebration?.(checkInResult);
  }

  function clearForUser(userId) {
    deps.clearUserState?.(userId, {
      userStateKey: deps.userStateKey
    });
  }

  function migrateLegacy(userId) {
    deps.migrateLegacyState?.(userId, {
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
