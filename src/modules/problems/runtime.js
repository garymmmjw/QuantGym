import { createProblemCatalogSyncController } from './catalogSync.js';
import { createProblemSearchController } from './searchController.js';
import { createProblemSocialSyncController } from './socialSync.js';

export function createProblemsRuntime(deps = {}) {
  let catalogSyncController = null;
  let searchController = null;
  let socialSyncController = null;

  function getCatalogSyncController() {
    if (!catalogSyncController) {
      catalogSyncController = createProblemCatalogSyncController({
        getState: deps.getState,
        requestCatalog: deps.requestCatalog,
        getUserCatalogProblems: deps.getUserCatalogProblems,
        mergeProblems: deps.mergeProblems,
        isDisabledProblemId: deps.isDisabledProblemId,
        clearProblemLookupCaches: deps.clearProblemLookupCaches,
        saveState: deps.saveState,
        renderProblems: deps.renderProblems,
        renderInterviewSetup: deps.renderInterviewSetup
      });
    }
    return catalogSyncController;
  }

  function getSearchController() {
    if (!searchController) {
      searchController = createProblemSearchController({
        debounceMs: deps.searchDebounceMs,
        windowRef: deps.windowRef,
        getQuery: deps.getSearchQuery,
        getViewMode: deps.getViewMode,
        setViewMode: deps.setViewMode,
        clearDetail: deps.clearDetail,
        resetPagination: deps.resetPagination,
        renderResults: deps.renderSearchResults,
        getMatches: deps.getMatches,
        openProblem: deps.openProblem
      });
    }
    return searchController;
  }

  function getSocialSyncController() {
    if (!socialSyncController) {
      socialSyncController = createProblemSocialSyncController({
        getSocial: deps.getSocial,
        setSocial: deps.setSocial,
        getSelectedProblemDetailId: deps.getSelectedProblemDetailId,
        getProblemById: deps.getProblemById,
        requestSocial: deps.requestSocial,
        setNotice: deps.setNotice,
        t: deps.t,
        renderProblemDetail: deps.renderProblemDetail,
        renderProblems: deps.renderProblems
      });
    }
    return socialSyncController;
  }

  return {
    cancelSearch() {
      getSearchController().cancel();
    },
    getCatalogSyncController,
    getSearchController,
    getSocialSyncController,
    handleSearchInput() {
      getSearchController().handleInput();
    },
    handleSearchKeydown(event) {
      getSearchController().handleKeydown(event);
    },
    refreshCatalog(force = false) {
      return getCatalogSyncController().refresh(force);
    },
    refreshSocial(problemId = "") {
      return getSocialSyncController().refresh(problemId);
    },
    scheduleSearch() {
      getSearchController().schedule();
    },
    setSearchComposing(value) {
      getSearchController().setComposing(value);
    }
  };
}
