import { EMPTY_LEETCODE } from "./leetcodeModel.js";
import { reportCloudSessionResponse } from "../../state/cloudSessionStatus.js";

export function createLeetCodeClient({ endpoint, token, userId, fetchImpl = globalThis.fetch, now = Date.now }) {
  const base = String(endpoint || "").replace(/\/+$/, "");
  let snapshot = { data: EMPTY_LEETCODE, phase: "idle", error: null };
  const listeners = new Set();
  let running = null;
  let loadedAt = 0;
  const publish = (patch) => { snapshot = { ...snapshot, ...patch }; listeners.forEach((fn) => fn()); };

  async function request(path, method, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetchImpl(`${base}/leetcode${path}`, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      reportCloudSessionResponse({ endpoint, token, userId }, response.status);
      if (!response.ok) throw Object.assign(new Error(payload.error || "request_failed"), { status: response.status });
      if (!Object.hasOwn(payload, "connection") || !Array.isArray(payload.problems) || !Array.isArray(payload.submissions)) throw new Error("invalid_response");
      if (payload.syncedSubmissions !== undefined && !Array.isArray(payload.syncedSubmissions)) throw new Error("invalid_response");
      if (path === "/review" && (payload.connection?.username !== body?.username
        || payload.connection?.linkedAt !== body?.linkedAt
        || !(payload.problems.find((problem) => problem.slug === body?.problemSlug)?.review?.version > body?.expectedVersion))) {
        throw new Error("invalid_review_response");
      }
      // Older API deployments have no verified source list. Imported history
      // must never become a substitute for account-synced completion records.
      return { ...payload, syncedSubmissions: payload.connection ? payload.syncedSubmissions || [] : [] };
    } finally { clearTimeout(timeout); }
  }

  function perform(path, method, body, phase, onError) {
    if (running) return running.then(() => perform(path, method, body, phase, onError));
    publish({ phase, error: null });
    running = (async () => {
      try {
        const data = await request(path, method, body);
        loadedAt = now();
        publish({ data, phase: "ready", error: null });
        return data;
      } catch (error) {
        onError?.(error);
        publish({ phase: "error", error });
        return null;
      } finally { running = null; }
    })();
    return running;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    reload: () => running || perform("", "GET", undefined, "loading"),
    async wake() {
      if (snapshot.error?.status === 401) return;
      if (running || now() - loadedAt < 30000) return;
      const data = await perform("", "GET", undefined, "loading");
      if (data?.connection && now() - new Date(data.connection.lastSyncedAt || 0).getTime() > 300000) await perform("/sync", "POST", {}, "syncing");
    },
    connect: (username) => perform("/connect", "POST", { username }, "connecting"),
    sync: () => perform("/sync", "POST", {}, "syncing"),
    disconnect: () => perform("", "DELETE", undefined, "disconnecting"),
    importRecords: (payload) => perform("/import", "POST", payload, "importing"),
    async recordReview(payload) {
      let operationError = null;
      const data = await perform("/review", "POST", payload, "reviewing", (error) => { operationError = error; });
      return { data, error: operationError };
    },
  };
}
