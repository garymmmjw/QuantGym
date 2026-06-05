import { shouldAutoRefresh } from '../../lib/refresh.js';

export function createNewsSyncController(deps = {}) {
  let inFlight = false;
  const getState = () => deps.getState?.() || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  const refresh = async (showStatus = false) => {
    if (inFlight) return { skipped: true };
    const state = getState();
    inFlight = true;
    state.newsFetchAttemptAt = nowIso();
    if (showStatus) deps.setStatusText?.(deps.getSyncingLabel?.() || "");

    try {
      const items = await deps.requestNews?.() || [];
      if (items.length) deps.upsertNews?.(items, { checkIn: false });
      state.newsFetchedAt = nowIso();
      state.newsSyncError = "";
      deps.saveState?.({ checkIn: false });
      deps.renderNews?.();
      return { skipped: false, ok: true, count: items.length };
    } catch (error) {
      state.newsSyncError = error?.message || "News API failed";
      deps.saveState?.({ checkIn: false });
      if (showStatus) deps.renderNews?.();
      return { skipped: false, ok: false, error };
    } finally {
      inFlight = false;
      deps.refreshIcons?.();
    }
  };

  const maybeRefresh = () => {
    const state = getState();
    const shouldRefresh = shouldAutoRefreshNews({
      currentUser: getCurrentUser(),
      inFlight,
      newsFetchedAt: state.newsFetchedAt,
      newsFetchAttemptAt: state.newsFetchAttemptAt,
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

export function shouldAutoRefreshNews(options = {}) {
  return shouldAutoRefresh({
    enabled: Boolean(options.currentUser),
    inFlight: options.inFlight,
    lastFetchAt: options.newsFetchedAt,
    lastAttemptAt: options.newsFetchAttemptAt,
    now: options.now,
    autoRefreshMs: options.autoRefreshMs,
    retryMs: options.retryMs
  });
}

export function getNewsQueriesForTopic(topic, options = {}) {
  const topicPacks = options.topicPacks || {};
  const normalizeTopic = options.normalizeTopic || ((value) => value || "all");
  return topicPacks[normalizeTopic(topic)] || topicPacks.all || [];
}
