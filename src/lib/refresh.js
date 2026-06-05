export function shouldAutoRefresh(options = {}) {
  const {
    enabled = true,
    inFlight = false,
    lastFetchAt = "",
    lastAttemptAt = "",
    now = Date.now(),
    autoRefreshMs = 0,
    retryMs = 0
  } = options;
  if (!enabled || inFlight) return false;
  const lastFetch = new Date(lastFetchAt || 0).getTime();
  const lastAttempt = new Date(lastAttemptAt || 0).getTime();
  const fetchDue = !lastFetch || now - lastFetch > autoRefreshMs;
  const retryDue = !lastAttempt || now - lastAttempt > retryMs;
  return fetchDue && retryDue;
}
