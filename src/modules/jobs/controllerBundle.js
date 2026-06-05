import { createJobsProvider } from './provider.js';
import { createJobsRuntime } from './runtime.js';

export function createJobsControllerBundle(deps = {}) {
  const provider = createJobsProvider({
    getState: deps.getState,
    getEndpointBase: deps.getEndpointBase,
    seedJobs: deps.seedJobs,
    parseTags: deps.parseTags,
    stableId: deps.stableId,
    makeId: deps.makeId,
    normalizeJobs: deps.normalizeJobs,
    isValidUrl: deps.isValidUrl,
    saveState: deps.saveState
  });

  const runtime = createJobsRuntime({
    getState: deps.getState,
    getCurrentUser: deps.getCurrentUser,
    autoRefreshMs: deps.autoRefreshMs,
    retryMs: deps.retryMs,
    requestJobs: provider.requestFromApi,
    upsertJobs: provider.upsert,
    saveState: deps.saveState,
    renderJobs: deps.renderJobs,
    refreshIcons: deps.refreshIcons,
    setStatusText: deps.setStatusText,
    getSyncingLabel: deps.getSyncingLabel,
    getUnavailableLabel: deps.getUnavailableLabel
  });

  return {
    provider,
    runtime
  };
}
