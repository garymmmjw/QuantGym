const STORAGE_KEY = "quantgym.cloud-reauth.v1";
let inMemory = null;

export function safeReturnPath(value, fallback = "/account") {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x20]/.test(path) || /^\/login(?:[/?#]|$)/.test(path)) return fallback;
  return path;
}

function sessionStorage() {
  try { return globalThis.sessionStorage; } catch { return null; }
}

export function beginCloudReauthentication({ ownerId, email, returnTo }) {
  inMemory = { ownerId: String(ownerId || ""), email: String(email || ""), returnTo: safeReturnPath(returnTo) };
  try { sessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(inMemory)); } catch { /* The current tab still retains its recovery request. */ }
  return inMemory;
}

export function getCloudReauthentication() {
  if (inMemory) return inMemory;
  try {
    const saved = JSON.parse(sessionStorage()?.getItem(STORAGE_KEY) || "null");
    if (saved?.ownerId && typeof saved.email === "string") inMemory = { ...saved, returnTo: safeReturnPath(saved.returnTo) };
  } catch { /* Invalid recovery metadata cannot affect account data. */ }
  return inMemory;
}

export function clearCloudReauthentication() {
  inMemory = null;
  try { sessionStorage()?.removeItem(STORAGE_KEY); } catch { /* Only recovery metadata is removed. */ }
}
