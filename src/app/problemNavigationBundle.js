import { cssEscape } from '../lib/dom.js';
import { createCompaniesProvider } from '../modules/companies/provider.js';
import { createProblemDetailController } from '../modules/problems/detailController.js';
import { createProblemFilterController } from '../modules/problems/filterController.js';
import { getCompanyProblemNavigation } from '../modules/problems/navigation.js';
import { compareProblemsByPopularity } from '../modules/problems/ranking.js';
import { spotlightElement } from '../ui/globalSearch.js';

export function createProblemNavigationBundle(deps = {}) {
  const {
    canUseCloud,
    cloudApi,
    companyDefs,
    documentRef: document,
    elements: els,
    emptyBlock,
    formatCategoryLabel,
    formatDate,
    formatProblemTag,
    getCatalogProblems,
    getLanguage,
    getLocale,
    getProblemBrowserMatches,
    getProblemCompletionCount,
    getProblemDisplayTitle,
    getProblemExcerptText,
    getProblemMediaMarkdown,
    getProblemPersonalState,
    getProblemSocial,
    getState,
    isCatalogProblem,
    normalizeCategory,
    normalizeJobs,
    parseTags,
    problemCompanyCache,
    problemDetailState,
    problemSocialState,
    refreshIcons,
    refreshProblemSocial,
    renderProblems,
    renderRichText,
    resetProblemPagination,
    scheduleMathTypeset,
    selectProblemForInterview,
    switchModule,
    t,
    toggleProblemCompleted,
    toggleProblemSaved,
    windowRef: window
  } = deps;

  let problemFilterController = null;
  let problemDetailController = null;

  const companiesProvider = createCompaniesProvider({
    companyDefs,
    parseTags,
    cache: problemCompanyCache,
    getCompanyFilter: () => problemFilterController?.getValue?.("company") || "all",
    getCatalogProblems,
    getCompletionCount: getProblemCompletionCount,
    getPersonalState: getProblemPersonalState,
    getJobs: () => getState().jobs,
    normalizeJobs
  });

  problemFilterController = createProblemFilterController({
    getDetailId: () => problemDetailState.getDetailId(),
    setDetailId: (detailId) => problemDetailState.setDetailId(detailId),
    normalizeCategory,
    getCompanyDef: companiesProvider.getDef,
    getCompanyNavigation: getCompanyProblemNavigation,
    resetPagination: resetProblemPagination,
    returnToList: () => problemDetailController?.returnToList?.(),
    clearProblemSearch() {
      if (els.problemSearch) els.problemSearch.value = "";
    },
    switchModule,
    renderProblems,
    spotlightCompany(company) {
      window.setTimeout(() => spotlightElement(`[data-problem-company="${cssEscape(company.slug)}"]`, {
        documentRef: document,
        windowRef: window
      }), 80);
    }
  });

  problemDetailController = createProblemDetailController({
    elements: els,
    documentRef: document,
    windowRef: window,
    detailState: problemDetailState,
    socialState: problemSocialState,
    getProblems: () => getState().problems,
    getFilteredProblems: getProblemBrowserMatches,
    getViewMode: () => problemFilterController.getValue("viewMode"),
    compareProblems: (left, right) => compareProblemsByPopularity(left, right, {
      getSocial: getProblemSocial,
      getTitle: getProblemDisplayTitle,
      locale: getLocale()
    }),
    isCatalogProblem,
    renderProblems,
    refreshSocial: refreshProblemSocial,
    canUseCloud,
    cloudApi,
    getLanguage,
    t,
    getDisplayTitle: getProblemDisplayTitle,
    formatCategory: formatCategoryLabel,
    formatTag: formatProblemTag,
    getMediaMarkdown: getProblemMediaMarkdown,
    getPersonalState: getProblemPersonalState,
    getSocial: getProblemSocial,
    selectForInterview: selectProblemForInterview,
    toggleCompleted: toggleProblemCompleted,
    toggleSaved: toggleProblemSaved,
    emptyBlock,
    formatDate,
    renderRichText,
    scheduleMathTypeset,
    refreshIcons
  });

  return {
    companyKey: companiesProvider.companyKey,
    getCompanyAliases: companiesProvider.getAliases,
    getCompanyDef: companiesProvider.getDef,
    getProblemCompanies: companiesProvider.getProblemCompanies,
    problemMatchesCompany: companiesProvider.matchesProblemCompany,
    getCompanyProblemStats: companiesProvider.getProblemStats,
    companyTierWeight: companiesProvider.companyTierWeight,
    getCompanyJobs: companiesProvider.getJobs,
    getProblemFilterState: problemFilterController.getState,
    getProblemFilterValue: problemFilterController.getValue,
    setProblemFilterState: problemFilterController.patch,
    applyProblemFilterAction: problemFilterController.applyAction,
    applyProblemNavigationFilters: problemFilterController.applyNavigationFilters,
    showCompanyProblems: problemFilterController.showCompanyProblems,
    problemMatchesTheme: problemFilterController.matchesTheme,
    problemMatchesDifficulty: problemFilterController.matchesDifficulty,
    problemMatchesSource: problemFilterController.matchesSource,
    getProblemNavigationSequence: problemDetailController.getNavigationSequence,
    getProblemDetailNavigation: problemDetailController.getDetailNavigation,
    createProblemDetailNavigation: problemDetailController.createNavigation,
    resetProblemDetailReveals: problemDetailController.resetReveals,
    isProblemDetailBlockRevealed: problemDetailController.isBlockRevealed,
    revealProblemDetailBlock: problemDetailController.revealBlock,
    openProblemDetail: problemDetailController.open,
    returnToProblemList: problemDetailController.returnToList,
    renderProblemDetail: problemDetailController.render,
    toggleProblemLike: problemDetailController.toggleLike,
    postProblemComment: problemDetailController.postComment,
    deleteProblemComment: problemDetailController.deleteComment
  };
}
