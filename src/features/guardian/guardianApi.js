import { DEFAULT_CLOUD_API_ENDPOINT } from "../../constants.js";

const SESSION_KEY = "quantgym.guardian.session.v1";
let memorySession = null;

export function getGuardianApiBaseUrl(appServices) {
  const config = appServices?.stores?.appStore?.getState?.()?.cloudConfig || appServices?.appState?.cloudConfig;
  return String(config?.endpoint || DEFAULT_CLOUD_API_ENDPOINT).trim().replace(/\/+$/, "");
}

export function readGuardianSession() {
  let session = memorySession;
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") || memorySession;
  } catch { /* Keep this page usable when browser storage is unavailable. */ }
  if (!session?.token || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) {
    clearGuardianSession();
    return null;
  }
  return session;
}

export function saveGuardianSession(session) {
  // Store only the short-lived guardian session, never the shared access code.
  const value = { token: session.token, expiresAt: session.expiresAt };
  memorySession = value;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch { /* Current page can still keep the session in memory. */ }
  return value;
}

export function clearGuardianSession() {
  memorySession = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
}

export async function guardianRequest(path, { method = "GET", body, token, baseUrl = DEFAULT_CLOUD_API_ENDPOINT, signal } = {}) {
  const base = String(baseUrl).replace(/\/+$/, "");
  const suffix = String(path).replace(/^\/api(?=\/)/, "");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(data?.error || data?.message || `请求失败（${response.status}）`), { status: response.status, data });
    if (!data || typeof data !== "object") throw new Error("服务返回了无效数据，请稍后重试。");
    return data;
  } catch (error) {
    if (error.name === "AbortError" && !signal?.aborted) throw new Error("请求超时，请检查网络后重试。");
    if (error instanceof TypeError) throw new Error("暂时连接不上服务，请检查网络后重试。");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
