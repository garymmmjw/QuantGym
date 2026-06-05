import { requestJson } from './client.js';

export function normalizeCloudConfig(raw = {}, defaultEndpoint = "") {
  return {
    endpoint: raw.endpoint || defaultEndpoint,
    token: raw.token || "",
    userId: raw.userId || "",
    lastSyncAt: raw.lastSyncAt || "",
    lastError: raw.lastError || ""
  };
}

export function loadCloudConfig(key, defaultEndpoint = "") {
  try {
    return normalizeCloudConfig(JSON.parse(localStorage.getItem(key) || "{}"), defaultEndpoint);
  } catch {
    return normalizeCloudConfig({}, defaultEndpoint);
  }
}

export function saveCloudConfig(key, config) {
  localStorage.setItem(key, JSON.stringify(config));
}

export function getCloudApiBase(config = {}, defaultEndpoint = "") {
  return (config.endpoint || defaultEndpoint).trim().replace(/\/+$/, "");
}

export function canUseCloud(config = {}, currentUser = null) {
  return Boolean(config.token && currentUser && config.userId === currentUser.id);
}

export function applyCloudSessionConfig(config = {}, payload = {}, account = {}, options = {}) {
  return {
    ...config,
    token: payload.token || config.token || "",
    userId: account.id || config.userId || "",
    lastSyncAt: options.nowIso || new Date().toISOString(),
    lastError: ""
  };
}

export function getLlmRequestHeaders(config = {}) {
  const headers = { "Content-Type": "application/json" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  return headers;
}

export async function cloudApi(path, options = {}) {
  const config = options.config || {};
  return requestJson(path, {
    baseUrl: getCloudApiBase(config, options.defaultEndpoint || ""),
    method: options.method || "GET",
    token: config.token,
    auth: options.auth !== false,
    body: options.body
  });
}

export function sanitizeAccountForCloud(account = {}) {
  const { passwordHash, ...publicAccount } = account || {};
  return publicAccount;
}

export function getCloudStatusText(config = {}, options = {}) {
  const {
    currentUser = null,
    inFlight = false,
    t = (key) => key,
    formatDate = (value) => value
  } = options;
  if (!config.token || config.userId !== currentUser?.id) return t("cloudDisconnected");
  if (config.lastError) return t("cloudFailed", { error: config.lastError });
  if (inFlight) return t("cloudSyncing");
  if (config.lastSyncAt) return t("cloudSynced", { date: formatDate(config.lastSyncAt) });
  return t("cloudConnected");
}
