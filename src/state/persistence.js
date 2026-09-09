export function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadUserState(userId, options = {}) {
  const createBaseState = options.createBaseState || (() => ({}));
  if (!userId || typeof options.userStateKey !== "function") return createBaseState();
  try {
    const raw = localStorage.getItem(options.userStateKey(userId));
    if (!raw) return createBaseState();
    return typeof options.normalizeState === "function"
      ? options.normalizeState(JSON.parse(raw))
      : JSON.parse(raw);
  } catch {
    return createBaseState();
  }
}

export function writeUserState(userId, rawState, options = {}) {
  if (!userId || typeof options.userStateKey !== "function") return;
  const serializeState = options.serializeState || ((state) => state);
  try {
    localStorage.setItem(options.userStateKey(userId), JSON.stringify(serializeState(rawState)));
    return true;
  } catch {
    return false;
  }
}

export function clearUserState(userId, options = {}) {
  if (!userId || typeof options.userStateKey !== "function") return;
  try {
    localStorage.removeItem(options.userStateKey(userId));
  } catch {
    /* storage unavailable */
  }
}

export function migrateLegacyState(userId, options = {}) {
  const {
    legacyKey,
    userStateKey,
    normalizeState = (state) => state,
    serializeState = (state) => state
  } = options;
  if (!legacyKey || !userId || typeof userStateKey !== "function") return;
  const nextKey = userStateKey(userId);
  let raw = "";
  try {
    raw = localStorage.getItem(legacyKey);
    if (!raw || localStorage.getItem(nextKey)) return;
  } catch {
    return;
  }
  try {
    const legacy = normalizeState(JSON.parse(raw));
    localStorage.setItem(nextKey, JSON.stringify(serializeState(legacy)));
    localStorage.removeItem(legacyKey);
  } catch {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      /* storage unavailable */
    }
  }
}
