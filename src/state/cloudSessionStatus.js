// A response belongs to the credentials used when its request began. Keeping
// separate entries prevents a late 401 from invalidating a newly signed-in user.
const entries = new Map();
const listeners = new Set();
const local = Object.freeze({ phase: "local" });
const unknown = Object.freeze({ phase: "unknown" });

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

export function getCloudSessionStatus(config) {
  return entryFor(config)?.snapshot || local;
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

export function verifyCloudSession(config, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const captured = { ...config };
  const entry = entryFor(captured);
  if (!entry || entry.snapshot.phase === "expired") return Promise.resolve();
  if (entry.pending) return entry.pending;
  if (entry.checkedAt && now() - entry.checkedAt < 300000) return Promise.resolve();
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
