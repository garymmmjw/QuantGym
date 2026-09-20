import { EMPTY_LEETCODE, problemUrl } from "./leetcodeModel.js";
import { reportCloudSessionResponse } from "../../state/cloudSessionStatus.js";

function boundInstant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
  const instant = Date.parse(value);
  const civil = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(instant) && Number.isFinite(civil.getTime()) && civil.toISOString().slice(0, 10) === value.slice(0, 10)
    ? instant : null;
}

function validBackpack(entries) {
  if (!Array.isArray(entries) || entries.length > 20000) return false;
  const seen = new Set();
  return entries.every(entry => {
    if (!entry || !problemUrl(entry.problemSlug) || seen.has(entry.problemSlug)
      || boundInstant(entry.drawnAt) === null || (entry.baselineCompletedAt !== null
        && (boundInstant(entry.baselineCompletedAt) === null || boundInstant(entry.baselineCompletedAt) > boundInstant(entry.drawnAt)))) return false;
    seen.add(entry.problemSlug);
    return true;
  });
}

export function createLeetCodeClient({ endpoint, token, userId, fetchImpl = globalThis.fetch, now = Date.now,
  eventTarget = globalThis.window, visibilityTarget = globalThis.document }) {
  const base = String(endpoint || "").replace(/\/+$/, "");
  let snapshot = { data: EMPTY_LEETCODE, phase: "idle", error: null };
  const listeners = new Set();
  let running = null;
  let syncing = null;
  let waking = null;
  let loadedAt = -Infinity;
  let checkedAt = -Infinity;
  let failedPath = null;
  let retainCount = 0;
  let stopRefresh = null;
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
      if (payload.importedSubmissions !== undefined && !Array.isArray(payload.importedSubmissions)) throw new Error("invalid_response");
      if (payload.reviewBackpack !== undefined && !validBackpack(payload.reviewBackpack)) throw new Error("invalid_response");
      if (payload.personalFirstSolveBounds !== undefined && (!Array.isArray(payload.personalFirstSolveBounds)
        || payload.personalFirstSolveBounds.some(bound => !bound || !problemUrl(bound.problemSlug)
          || boundInstant(bound.after) === null || boundInstant(bound.by) === null
          || boundInstant(bound.after) >= boundInstant(bound.by)))) throw new Error("invalid_response");
      if (path === "/review" && (payload.connection?.username !== body?.username
        || payload.connection?.linkedAt !== body?.linkedAt
        || !(payload.problems.find((problem) => problem.slug === body?.problemSlug)?.review?.version > body?.expectedVersion))) {
        throw new Error("invalid_review_response");
      }
      // Legacy servers may omit the optional read field, but a draw is saved
      // only when the backpack endpoint acknowledges the exact connection.
      // A replay can legitimately return an empty backpack after completion.
      if (path === "/backpack" && (!Array.isArray(payload.reviewBackpack)
        || payload.connection?.username !== body?.username || payload.connection?.linkedAt !== body?.linkedAt)) {
        throw new Error("invalid_backpack_response");
      }
      // Keep public sync and user-imported history separate. Older API versions
      // cannot supply imported counting records by falling back to submissions.
      return { ...payload, syncedSubmissions: payload.connection ? payload.syncedSubmissions || [] : [],
        importedSubmissions: payload.connection ? payload.importedSubmissions || [] : [],
        personalFirstSolveBounds: payload.connection ? payload.personalFirstSolveBounds || [] : [],
        reviewBackpack: payload.connection ? (payload.reviewBackpack || []).map(({ problemSlug, drawnAt, baselineCompletedAt }) => ({ problemSlug, drawnAt, baselineCompletedAt })) : [] };
    } finally { clearTimeout(timeout); }
  }

  function perform(path, method, body, phase, onError) {
    if (running) return running.then(() => perform(path, method, body, phase, onError));
    publish({ phase, error: null });
    running = (async () => {
      try {
        const data = await request(path, method, body);
        loadedAt = now();
        failedPath = null;
        publish({ data, phase: "ready", error: null });
        return data;
      } catch (error) {
        failedPath = path;
        onError?.(error);
        publish({ phase: "error", error });
        return null;
      } finally { running = null; }
    })();
    return running;
  }

  function sync() {
    if (!syncing) syncing = perform("/sync", "POST", {}, "syncing").finally(() => { syncing = null; });
    return syncing;
  }

  function wake() {
    if (waking) return waking;
    if (snapshot.error?.status === 401) return Promise.resolve(null);
    if (running) return running;
    if (now() - Math.max(loadedAt, checkedAt) < 30000) return Promise.resolve(snapshot.data);
    checkedAt = now();
    waking = (async () => {
      const data = await perform("", "GET", undefined, "loading");
      if (!data?.connection) return data;
      const syncedAt = typeof data.connection.lastSyncedAt === "string" ? Date.parse(data.connection.lastSyncedAt) : NaN;
      if (!Number.isFinite(syncedAt) || now() - syncedAt >= 300000) return sync();
      return data;
    })().finally(() => { waking = null; });
    return waking;
  }

  // Multiple pages/hooks share one client and one visible-page refresh lifecycle.
  function retain() {
    retainCount += 1;
    if (retainCount === 1) {
      const refresh = () => { if (visibilityTarget?.visibilityState !== "hidden") void wake(); };
      for (const event of ["focus", "online", "pageshow"]) eventTarget?.addEventListener(event, refresh);
      visibilityTarget?.addEventListener("visibilitychange", refresh);
      const timer = eventTarget?.setInterval(refresh, 60000);
      stopRefresh = () => {
        for (const event of ["focus", "online", "pageshow"]) eventTarget?.removeEventListener(event, refresh);
        visibilityTarget?.removeEventListener("visibilitychange", refresh);
        if (timer !== undefined) eventTarget?.clearInterval(timer);
      };
      refresh();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      retainCount -= 1;
      if (!retainCount) { stopRefresh?.(); stopRefresh = null; }
    };
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    reload: () => running || perform("", "GET", undefined, "loading"),
    retry: () => failedPath === "/sync" && snapshot.data.connection ? sync() : running || perform("", "GET", undefined, "loading"),
    wake,
    retain,
    connect: (username) => perform("/connect", "POST", { username }, "connecting"),
    sync,
    disconnect: () => perform("", "DELETE", undefined, "disconnecting"),
    importRecords: (payload) => perform("/import", "POST", payload, "importing"),
    async recordReview(payload) {
      let operationError = null;
      const data = await perform("/review", "POST", payload, "reviewing", (error) => { operationError = error; });
      return { data, error: operationError };
    },
    async addReviewCard(payload) {
      let operationError = null;
      const data = await perform("/backpack", "POST", payload, "backpacking", (error) => { operationError = error; });
      return { data, error: operationError };
    },
  };
}
