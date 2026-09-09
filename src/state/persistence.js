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
    const existing = localStorage.getItem(options.userStateKey(userId));
    if (existing) {
      const parsed = JSON.parse(existing);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    }
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
  if (!legacyKey || !userId || typeof userStateKey !== "function") return { ok: false, code: 'invalid' };
  const nextKey = userStateKey(userId);
  let raw = "";
  try {
    raw = localStorage.getItem(legacyKey);
    if (!raw || localStorage.getItem(nextKey)) return { ok: true, code: 'unchanged' };
  } catch {
    return { ok: false, code: 'storage' };
  }
  try {
    const parsed = JSON.parse(raw);
    // An old global key is not evidence of ownership. Explicit recovery may
    // supply a verified legacyOwnerId; routine login never does so.
    if (String(options.legacyOwnerId || parsed?.ownerId || '') !== String(userId)) return { ok: false, code: 'owner-required' };
    const legacy = normalizeState(parsed);
    const nextRaw = JSON.stringify(serializeState(legacy));
    localStorage.setItem(nextKey, nextRaw);
    if (localStorage.getItem(nextKey) !== nextRaw) throw new Error('Migration write could not be verified');
    // Keep the exact original as a recovery source even after a valid migration.
    return { ok: true, code: 'migrated', originalPreserved: true };
  } catch {
    return { ok: false, code: 'recovery-required', originalPreserved: true };
  }
}
