import { timestampOrZero } from './date.js';

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
  const current = timestampOrZero(now);
  const lastFetch = timestampOrZero(lastFetchAt);
  const lastAttempt = timestampOrZero(lastAttemptAt);
  const fetchDue = !lastFetch || current - lastFetch > autoRefreshMs;
  const retryDue = !lastAttempt || current - lastAttempt > retryMs;
  return fetchDue && retryDue;
}
