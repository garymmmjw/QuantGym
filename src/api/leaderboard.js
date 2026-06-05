export function shouldRefreshCloudLeaderboard(options = {}) {
  const {
    force = false,
    loadedAt = "",
    nowMs = Date.now(),
    refreshMs = 45_000
  } = options;
  if (force) return true;
  const lastAttemptAt = loadedAt ? new Date(loadedAt).getTime() : 0;
  return !(lastAttemptAt && nowMs - lastAttemptAt < refreshMs);
}

export function getCloudLeaderboardRows(data = {}) {
  if (Array.isArray(data.leaderboard)) return data.leaderboard;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

export async function requestCloudLeaderboard(options = {}) {
  const {
    cloudApi = async () => ({}),
    normalizeRows = (rows) => rows,
    nowIso = () => new Date().toISOString()
  } = options;
  const data = await cloudApi("/leaderboard", { auth: false });
  return {
    rows: normalizeRows(getCloudLeaderboardRows(data)),
    loadedAt: data.updatedAt || nowIso()
  };
}
