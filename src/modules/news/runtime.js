import { createNewsSyncController } from './sync.js';

export function createNewsRuntime(deps = {}) {
  let syncController = null;

  function getSyncController() {
    if (!syncController) {
      syncController = createNewsSyncController({
        getState: deps.getState,
        getCurrentUser: deps.getCurrentUser,
        autoRefreshMs: deps.autoRefreshMs,
        retryMs: deps.retryMs,
        requestNews: deps.requestNews,
        upsertNews: deps.upsertNews,
        saveState: deps.saveState,
        renderNews: deps.renderNews,
        refreshIcons: deps.refreshIcons,
        setStatusText: deps.setStatusText,
        getSyncingLabel: deps.getSyncingLabel
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
