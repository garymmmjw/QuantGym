import {
  requestCloudLeaderboard,
  shouldRefreshCloudLeaderboard
} from "../api/leaderboard.js";

export function normalizeCloudLeaderboardRows(rows = [], deps = {}) {
  const normalizeAccount = deps.normalizeAccount || ((value) => value || {});
  const normalizeSkills = deps.normalizeSkills || ((value) => value || {});
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const account = normalizeAccount({
        id: row.id,
        name: row.name,
        country: row.country,
        region: row.region,
        picture: row.picture
      });
      return {
        id: String(account.id || "").trim(),
        name: String(account.name || "Quant").trim() || "Quant",
        country: account.country,
        region: account.region,
        picture: String(account.picture || ""),
        skills: normalizeSkills(row.skills || {}),
        updatedAt: String(row.updatedAt || "")
      };
    })
    .filter((row) => row.id);
}

export function createLeaderboardCloudController(deps = {}) {
  let rows = [];
  let loadedAt = "";
  let loading = false;
  let error = "";
  let refreshPromise = null;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();
  const getSnapshot = () => ({ rows, loadedAt, loading, error, rowCount: rows.length });
  const dispatchUpdate = (status = "settled") => {
    const windowRef = deps.windowRef || globalThis.window;
    const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
    if (!windowRef?.dispatchEvent || !CustomEventCtor) return;
    windowRef.dispatchEvent(new CustomEventCtor("quantgym:leaderboard-updated", {
      detail: { status, snapshot: getSnapshot() }
    }));
  };

  const refresh = async (force = false) => {
    if (loading) return refreshPromise || Promise.resolve(rows);
    if (!shouldRefreshCloudLeaderboard({ force, loadedAt, refreshMs: deps.refreshMs })) {
      return rows;
    }

    loading = true;
    error = "";
    deps.renderLoading?.(getSnapshot());
    dispatchUpdate("loading");
    refreshPromise = requestCloudLeaderboard({
      cloudApi: deps.cloudApi,
      normalizeRows: deps.normalizeRows,
      nowIso
    })
      .then((result) => {
        rows = result.rows;
        loadedAt = result.loadedAt;
        error = "";
        return rows;
      })
      .catch((requestError) => {
        loadedAt = nowIso();
        error = requestError?.message || "Leaderboard unavailable";
        return rows;
      })
      .finally(() => {
        loading = false;
        refreshPromise = null;
        deps.onSettled?.(getSnapshot());
        dispatchUpdate("settled");
      });

    return refreshPromise;
  };

  const invalidate = (options = {}) => {
    loadedAt = "";
    error = "";
    if (options.clear) rows = [];
    dispatchUpdate("invalidated");
    if (options.refresh) void refresh(true);
  };

  return { getRows: () => rows, getSnapshot, invalidate, refresh };
}
