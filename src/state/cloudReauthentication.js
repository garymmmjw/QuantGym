const STORAGE_KEY = "quantgym.cloud-reauth.v1";
const RETURN_KEY = "quantgym.auth-return.v1";
let inMemory;
let pendingReturnPath = null;
const listeners = new Set();

export function subscribeCloudReauthentication(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function safeReturnPath(value, fallback = "/account") {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x20]/.test(path) || /^\/login(?:[/?#]|$)/.test(path)) return fallback;
  return path;
}

function sessionStorage() {
  try { return globalThis.sessionStorage; } catch { return null; }
}

export function beginCloudReauthentication({ ownerId, email, returnTo }) {
  clearPendingAuthReturnPath();
  inMemory = { ownerId: String(ownerId || ""), email: String(email || ""), returnTo: safeReturnPath(returnTo) };
  try { sessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(inMemory)); } catch { /* The current tab still retains its recovery request. */ }
  listeners.forEach(listener => listener());
  return inMemory;
}

export function getCloudReauthentication() {
  if (inMemory !== undefined) return inMemory;
  inMemory = null;
  try {
    const saved = JSON.parse(sessionStorage()?.getItem(STORAGE_KEY) || "null");
    if (saved?.ownerId && typeof saved.email === "string") inMemory = { ...saved, returnTo: safeReturnPath(saved.returnTo) };
  } catch { /* Invalid recovery metadata cannot affect account data. */ }
  return inMemory;
}

export function clearCloudReauthentication() {
  inMemory = null;
  try { sessionStorage()?.removeItem(STORAGE_KEY); } catch { /* Only recovery metadata is removed. */ }
  listeners.forEach(listener => listener());
}

// Canceling the cloud-only flow does not authenticate anyone. Keep its safe
// destination separately so an explicit device login can still return there.
export function cancelCloudReauthentication() {
  const recovery = getCloudReauthentication();
  if (recovery) {
    pendingReturnPath = safeReturnPath(recovery.returnTo);
    try { sessionStorage()?.setItem(RETURN_KEY, pendingReturnPath); } catch { /* Retained in memory. */ }
  }
  clearCloudReauthentication();
}

export function getPendingAuthReturnPath() {
  if (pendingReturnPath !== null) return pendingReturnPath;
  pendingReturnPath = "";
  try { pendingReturnPath = safeReturnPath(sessionStorage()?.getItem(RETURN_KEY), ""); } catch { /* No pending destination. */ }
  return pendingReturnPath;
}

export function clearPendingAuthReturnPath() {
  pendingReturnPath = "";
  try { sessionStorage()?.removeItem(RETURN_KEY); } catch { /* Only navigation metadata is removed. */ }
}
