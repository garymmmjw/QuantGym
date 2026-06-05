import { createLibraryControllerBundle } from '../modules/library/controllerBundle.js';
import { createGlobalSearchBundle } from '../ui/globalSearchBundle.js';

export function createLibrarySearchBundles(deps = {}) {
  const {
    applyProblemNavigationFilters,
    canUseCloud,
    catalog,
    cloudApi,
    companyTierFilterState,
    createProblemSearchRecord,
    documentRef: document,
    elements: els,
    escapeHtml,
    focusNewsItem,
    formatCategoryLabel,
    formatNewsDate,
    getCloudApiBase,
    getCompanyProblemStats,
    getLanguage,
    getProblemSearchOptions,
    inferSource,
    isCatalogProblem,
    libraryFilterState,
    normalizeCourses,
    normalizeJobs,
    openProblemFromSearch,
    quantCompanyDefs,
    refreshIcons,
    renderProblems,
    resetProblemPagination,
    scoreProblemSearchRecord,
    setRadarHover,
    skillDefs,
    sortNews,
    switchModule,
    t,
    userState,
    windowRef: window
  } = deps;

  const libraryControllerBundle = createLibraryControllerBundle({
    elements: els,
    catalog,
    getLanguage,
    getFilterState: () => libraryFilterState.getState(),
    getSearchValue: () => els.librarySearch?.value || "",
    getProblems: () => userState.value.problems,
    isCatalogProblem,
    applyProblemNavigationFilters,
    resetProblemPagination,
    clearProblemSearch() {
      if (els.problemSearch) els.problemSearch.value = "";
    },
    switchModule,
    renderProblems,
    getCloudApiBase,
    canUseCloud,
    cloudApi,
    refreshIcons,
    escapeHtml
  });

  const globalSearchBundle = createGlobalSearchBundle({
    elements: els,
    documentRef: document,
    windowRef: window,
    getState: () => userState.value,
    t,
    getLanguage,
    isCatalogProblem,
    createProblemSearchRecord,
    getProblemSearchOptions,
    formatCategoryLabel,
    scoreProblemSearchRecord,
    quantCompanyDefs,
    getCompanyProblemStats,
    normalizeJobs,
    normalizeCourses,
    skillDefs,
    sortNews,
    inferSource,
    formatNewsDate,
    emptyLabel: () => t("searchEmpty"),
    switchModule,
    openProblem: openProblemFromSearch,
    setCompanyTier(value) {
      companyTierFilterState.setTier(value);
    },
    setRadarHover,
    focusNews: focusNewsItem
  });

  return {
    openLibraryReader: libraryControllerBundle.openReader,
    closeLibraryReader: libraryControllerBundle.closeReader,
    getLibraryEntries: libraryControllerBundle.getEntries,
    getLibraryTitle: libraryControllerBundle.getTitle,
    getLibrarySubtitle: libraryControllerBundle.getSubtitle,
    getLibrarySearchText: libraryControllerBundle.getSearchText,
    getVisibleLibraryEntries: libraryControllerBundle.getVisibleEntries,
    getLibrarySourceLabel: libraryControllerBundle.getSourceLabel,
    openLibraryPractice: libraryControllerBundle.openPractice,
    renderGlobalSearchResults: globalSearchBundle.render,
    scheduleGlobalSearchResults: globalSearchBundle.schedule,
    hideGlobalSearchResults: globalSearchBundle.hide,
    clearGlobalSearch: globalSearchBundle.clear,
    handleGlobalSearchKeydown: globalSearchBundle.handleKeydown,
    setGlobalSearchComposing: globalSearchBundle.setComposing
  };
}
