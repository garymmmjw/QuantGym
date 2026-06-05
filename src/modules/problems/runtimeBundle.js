import { requestProblemCatalog } from './catalogApi.js';
import { createProblemsRuntime } from './runtime.js';

export function createProblemsRuntimeBundle(deps = {}) {
  const runtime = createProblemsRuntime({
    windowRef: deps.windowRef,
    getState: deps.getState,
    requestCatalog: () => requestProblemCatalog(deps.cloudApi, {
      isCatalogProblem: deps.isCatalogProblem,
      isDisabledProblemSource: deps.isDisabledProblemSource
    }),
    getUserCatalogProblems: deps.getUserCatalogProblems,
    mergeProblems: deps.mergeProblems,
    isDisabledProblemId: deps.isDisabledProblemId,
    clearProblemLookupCaches: deps.clearProblemLookupCaches,
    saveState: deps.saveState,
    renderProblems: deps.renderProblems,
    renderInterviewSetup: deps.renderInterviewSetup,
    searchDebounceMs: deps.searchDebounceMs,
    getSearchQuery: deps.getSearchQuery,
    getViewMode: deps.getViewMode,
    setViewMode: deps.setViewMode,
    clearDetail: deps.clearDetail,
    resetPagination: deps.resetPagination,
    renderSearchResults: deps.renderSearchResults,
    getMatches: deps.getMatches,
    openProblem: deps.openProblem,
    getSocial: deps.getSocial,
    setSocial: deps.setSocial,
    getSelectedProblemDetailId: deps.getSelectedProblemDetailId,
    getProblemById: deps.getProblemById,
    requestSocial: deps.requestSocial,
    setNotice: deps.setNotice,
    t: deps.t
  });

  return {
    cancelSearchRender: runtime.cancelSearch,
    handleSearchInput: runtime.handleSearchInput,
    handleSearchKeydown: runtime.handleSearchKeydown,
    refreshCatalog: runtime.refreshCatalog,
    refreshSocial: runtime.refreshSocial,
    runtime,
    scheduleSearchRender: runtime.scheduleSearch,
    setSearchComposing: runtime.setSearchComposing
  };
}
