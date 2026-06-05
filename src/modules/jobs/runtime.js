import { createJobsSyncController } from './sync.js';

export function createJobsRuntime(deps = {}) {
  let syncController = null;

  function getSyncController() {
    if (!syncController) {
      syncController = createJobsSyncController({
        getState: deps.getState,
        getCurrentUser: deps.getCurrentUser,
        autoRefreshMs: deps.autoRefreshMs,
        retryMs: deps.retryMs,
        requestJobs: deps.requestJobs,
        upsertJobs: deps.upsertJobs,
        saveState: deps.saveState,
        renderJobs: deps.renderJobs,
        refreshIcons: deps.refreshIcons,
        setStatusText: deps.setStatusText,
        getSyncingLabel: deps.getSyncingLabel,
        getUnavailableLabel: deps.getUnavailableLabel
      });
    }
    return syncController;
  }

  function maybeRefresh() {
    return getSyncController().maybeRefresh();
  }

  function refresh(showStatus = false) {
    return getSyncController().refresh(showStatus);
  }

  return {
    getSyncController,
    maybeRefresh,
    refresh
  };
}
