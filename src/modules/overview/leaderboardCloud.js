import {
  requestCloudLeaderboard,
  shouldRefreshCloudLeaderboard
} from '../../api/leaderboard.js';

export function createLeaderboardCloudController(deps = {}) {
  let rows = [];
  let loadedAt = "";
  let loading = false;
  let error = "";
  let refreshPromise = null;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();
  const dispatchUpdate = (status = "settled") => {
    const windowRef = deps.windowRef || globalThis.window;
    const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
    if (!windowRef?.dispatchEvent || !CustomEventCtor) return;
    windowRef.dispatchEvent(new CustomEventCtor("quantgym:leaderboard-updated", {
      detail: { status, snapshot: getSnapshot() }
    }));
  };

  const getSnapshot = () => ({
    rows,
    loadedAt,
    loading,
    error,
    rowCount: rows.length
  });

  const refresh = async (force = false) => {
    if (loading) return refreshPromise || Promise.resolve(rows);
    if (!shouldRefreshCloudLeaderboard({
      force,
      loadedAt,
      refreshMs: deps.refreshMs
    })) {
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
    if (options.refresh) refresh(true);
  };

  return {
    getRows: () => rows,
    getSnapshot,
    invalidate,
    refresh
  };
}
