import { shouldAutoRefresh } from '../../lib/refresh.js';

export function createJobsSyncController(deps = {}) {
  let inFlight = false;
  const getState = () => deps.getState?.() || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  const refresh = async (showStatus = false) => {
    if (inFlight) return { skipped: true };
    const state = getState();
    inFlight = true;
    state.jobsFetchAttemptAt = nowIso();
    if (showStatus) deps.setStatusText?.(deps.getSyncingLabel?.() || "");

    try {
      const items = await deps.requestJobs?.() || [];
      if (items.length) deps.upsertJobs?.(items, { checkIn: false });
      state.jobsFetchedAt = nowIso();
      state.jobsSyncError = "";
      deps.saveState?.({ checkIn: false });
      deps.renderJobs?.();
      return { skipped: false, ok: true, count: items.length };
    } catch (error) {
      state.jobsSyncError = error?.message || "Jobs API failed";
      deps.saveState?.({ checkIn: false });
      if (showStatus) deps.setStatusText?.(deps.getUnavailableLabel?.() || "");
      return { skipped: false, ok: false, error };
    } finally {
      inFlight = false;
      deps.refreshIcons?.();
    }
  };

  const maybeRefresh = () => {
    const state = getState();
    const shouldRefresh = shouldAutoRefreshJobs({
      currentUser: getCurrentUser(),
      inFlight,
      jobsFetchedAt: state.jobsFetchedAt,
      jobsFetchAttemptAt: state.jobsFetchAttemptAt,
      autoRefreshMs: deps.autoRefreshMs,
      retryMs: deps.retryMs
    });
    if (!shouldRefresh) return false;
    refresh(false);
    return true;
  };

  return {
    isInFlight: () => inFlight,
    maybeRefresh,
    refresh
  };
}

export function shouldAutoRefreshJobs(options = {}) {
  return shouldAutoRefresh({
    enabled: Boolean(options.currentUser),
    inFlight: options.inFlight,
    lastFetchAt: options.jobsFetchedAt,
    lastAttemptAt: options.jobsFetchAttemptAt,
    now: options.now,
    autoRefreshMs: options.autoRefreshMs,
    retryMs: options.retryMs
  });
}
