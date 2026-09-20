// A response belongs to the credentials used when its request began. Keeping
// separate entries prevents a late 401 from invalidating a newly signed-in user.
const entries = new Map();
const listeners = new Set();
const snapshots = Object.fromEntries(["signed-out", "verification-required", "unknown", "connected", "expired", "restricted", "offline"].map(phase => [phase, Object.freeze({ phase })]));
const unknown = snapshots.unknown;

function keyFor(config = {}) {
  return config.endpoint && config.userId && config.token
    ? JSON.stringify([String(config.endpoint).trim().replace(/\/+$/, ""), config.userId, config.token]) : "";
}

function entryFor(config) {
  const key = keyFor(config);
  if (!key) return null;
  if (!entries.has(key)) entries.set(key, { snapshot: unknown, checkedAt: 0, pending: null });
  return entries.get(key);
}

function publish(entry, phase) {
  if (entry.snapshot.phase === phase) return;
  entry.snapshot = Object.freeze({ phase });
  listeners.forEach(listener => listener());
}

export function getCloudSessionStatus(config = {}, user) {
  // Callers that only report credentials can omit user. UI callers always pass
  // the current identity, so credentials left by another account cannot leak.
  if (user === null || (user !== undefined && !user?.id)) return snapshots["signed-out"];
  const matching = user === undefined || config.userId === user.id;
  const entry = matching ? entryFor(config) : null;
  if (entry) return entry.snapshot;
  if (!user) return snapshots["signed-out"];
  return snapshots[user.cloudLinked === true ? "expired" : "verification-required"];
}

export function describeAccountSession(user, config = {}, status = getCloudSessionStatus(config, user), { en = false, online = true } = {}) {
  const verified = Boolean(user?.id && (user.cloudLinked === true || (config.userId === user.id && keyFor(config))));
  const identity = !user?.id ? "signed-out" : verified ? "verified" : "verification-required";
  const phase = identity === "signed-out" ? "signed-out" : identity === "verification-required" ? "verification-required"
    : !online && status.phase !== "expired" ? "offline" : status.phase;
  const label = ({
    "signed-out": en ? "Not signed in" : "未登录",
    "verification-required": en ? "Account verification required" : "需要完成账号验证",
    unknown: en ? "Signed in" : "已登录",
    connected: en ? "Signed in" : "已登录",
    restricted: en ? "Signed in" : "已登录",
    offline: en ? "Offline · waiting to sync" : "离线待同步",
    expired: en ? "Session expired" : "登录已过期",
  })[phase];
  return { ...status, phase, identity, label, needsVerification: identity === "verification-required", canManageAccount: phase === "connected" };
}

export function subscribeCloudSessionStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportCloudSessionResponse(config, status) {
  const entry = entryFor(config);
  if (!entry) return;
  if (status === 401) {
    entry.checkedAt = Date.now();
    publish(entry, "expired");
  } else if (status >= 200 && status < 300 && entry.snapshot.phase !== "expired") {
    entry.checkedAt = Date.now();
    publish(entry, "connected");
  }
  // 403 may be an endpoint-specific permission denial, not an invalid session.
}

export function verifyCloudSession(config, { fetchImpl = globalThis.fetch, now = Date.now, force = false } = {}) {
  const captured = { ...config };
  const entry = entryFor(captured);
  if (!entry || entry.snapshot.phase === "expired") return Promise.resolve();
  if (entry.pending) return entry.pending;
  if (!force && entry.checkedAt && now() - entry.checkedAt < 300000) return Promise.resolve();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  entry.pending = (async () => {
    try {
      const response = await fetchImpl(`${String(captured.endpoint).trim().replace(/\/+$/, "")}/account`, {
        headers: { Authorization: `Bearer ${captured.token}` }, cache: "no-store", signal: controller.signal,
      });
      reportCloudSessionResponse(captured, response.status);
      if (response.status === 403 && entry.snapshot.phase !== "expired") publish(entry, "restricted");
      else if (!response.ok && response.status !== 401 && entry.snapshot.phase !== "expired") publish(entry, "offline");
    } catch {
      if (entry.snapshot.phase !== "expired") publish(entry, "offline");
    } finally {
      clearTimeout(timer);
      entry.checkedAt = now();
      entry.pending = null;
    }
  })();
  return entry.pending;
}
