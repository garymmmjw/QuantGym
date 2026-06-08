import { normalizeEmail } from "../lib/text.js";

export function normalizeAuth(raw = {}, options = {}) {
  const defaultGoogleClientId = options.defaultGoogleClientId || "";
  const normalizeAccount = options.normalizeAccount || ((account) => account || {});
  return {
    accounts: Array.isArray(raw.accounts) ? raw.accounts.map(normalizeAccount) : [],
    currentUserId: raw.currentUserId || "",
    googleClientId: raw.googleClientId || defaultGoogleClientId
  };
}

export function loadAuth(key, options = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalizeAuth(JSON.parse(raw), options) : normalizeAuth({}, options);
  } catch {
    return normalizeAuth({}, options);
  }
}

export function saveAuth(key, auth) {
  localStorage.setItem(key, JSON.stringify(auth));
}

export function getCurrentUser(auth = {}) {
  return (Array.isArray(auth.accounts) ? auth.accounts : [])
    .find((account) => account.id === auth.currentUserId) || null;
}

export function setCurrentUserId(auth = {}, userId = "") {
  auth.currentUserId = userId || "";
  return getCurrentUser(auth);
}

export function getGoogleClientId(auth = {}) {
  return auth.googleClientId || "";
}

export function setGoogleClientId(auth = {}, value = "") {
  auth.googleClientId = String(value || "").trim();
  return auth.googleClientId;
}

export function addLocalAccount(auth = {}, account = {}) {
  const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
  auth.accounts = [...accounts, account];
  setCurrentUserId(auth, account.id);
  return account;
}

export function upsertAuthAccount(auth = {}, account = {}, options = {}) {
  const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
  const normalizeAccount = options.normalizeAccount || ((value) => value || {});
  const normalized = normalizeAccount(account);
  const existing = accounts.find((item) => item.id === normalized.id);
  const merged = { ...(existing || {}), ...normalized, ...(options.localFields || {}) };
  const normalizedEmail = normalizeEmail(normalized.email);
  auth.accounts = [
    ...accounts.filter((item) => item.id !== normalized.id && normalizeEmail(item.email) !== normalizedEmail),
    merged
  ];
  setCurrentUserId(auth, normalized.id);
  return merged;
}

export function userStateKey(prefix, userId) {
  return `${prefix}.${userId}`;
}

export function parseJwt(token) {
  const part = token.split(".")[1];
  const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
  const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent([...json].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
}

export function buildGoogleAccountFromPayload(payload = {}, options = {}) {
  const existing = options.existing || null;
  return {
    ...(existing || {}),
    id: `google:${payload.sub}`,
    provider: "google",
    name: payload.name || payload.email || "Google User",
    email: payload.email || "",
    country: existing?.country || options.defaultCountry || "china",
    region: existing?.region || options.defaultRegion || "上海",
    graduationTerm: existing?.graduationTerm || options.defaultGraduationTerm || "",
    picture: payload.picture || "",
    updatedAt: options.nowIso || new Date().toISOString()
  };
}

export function applyGoogleAccount(auth = {}, account = {}, options = {}) {
  const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
  const exists = accounts.some((item) => item.id === account.id);
  auth.accounts = exists
    ? accounts.map((item) => (item.id === account.id ? account : item))
    : [...accounts, { ...account, createdAt: options.nowIso || new Date().toISOString() }];
  setCurrentUserId(auth, account.id);
  return {
    account,
    created: !exists
  };
}

export async function buildLocalAccount(options = {}) {
  const email = normalizeEmail(options.email);
  const nowIso = options.nowIso || new Date().toISOString();
  return {
    id: options.id || "",
    provider: "local",
    name: String(options.name || "").trim(),
    email,
    country: options.defaultCountry || "china",
    region: options.defaultRegion || "上海",
    graduationTerm: options.defaultGraduationTerm || "",
    passwordHash: await options.hashPassword?.(email, options.password || ""),
    createdAt: nowIso
  };
}

export async function hashPassword(email, password) {
  const value = `${normalizeEmail(email)}:${password}`;
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `fallback-${fallbackHash(value)}`;
}

export function fallbackHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function resolveText(options = {}) {
  return typeof options.text === "function" ? options.text : (key) => key;
}

export function getAuthReadyMessage(options = {}) {
  const text = resolveText(options);
  const protocol = options.protocol ?? globalThis.location?.protocol ?? "";
  return protocol === "file:"
    ? text("authReadyFile")
    : text(options.googleLoginEnabled ? "authReadyCloud" : "authReadyLocal");
}

export function getVerificationErrorMessage(error, options = {}) {
  const text = resolveText(options);
  const raw = String(error?.message || "");
  if (error?.status === 409) return text("authDuplicateEmail");
  if (error?.status === 403) return text("verificationForbidden");
  if (error?.status === 429) return raw.includes("wait") ? text("verificationTooSoon") : text("verificationTooMany");
  if (error?.status === 502) return text("verificationEmailDown");
  if (/verification|code/i.test(raw)) return text("verificationInvalid");
  return text("verificationFailed");
}

export function getAuthErrorMessage(error, options = {}) {
  const text = resolveText(options);
  const protocol = options.protocol ?? globalThis.location?.protocol ?? "";
  const raw = String(error?.message || "");
  if (error?.status === 403 || /allowlist/i.test(raw)) {
    return text("verificationForbidden");
  }
  if (error?.status === 401) {
    return text("authCloudLoginFailed");
  }
  if (error?.status === 409) {
    return text("authDuplicateEmail");
  }
  if (error?.status === 429) {
    return text("verificationTooMany");
  }
  if (protocol === "file:") {
    return text("authStorageFileBlocked");
  }
  if (/quota|storage|localStorage|SecurityError/i.test(`${error?.name || ""} ${raw}`)) {
    return text("authStorageBlocked");
  }
  return text("authOperationFailed");
}
