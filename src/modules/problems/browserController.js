import { getProblemFilterScopes } from './filters.js';
import { renderProblemCompanyPanel as renderProblemCompanyPanelView } from './companiesPanel.js';
import { renderProblemList as renderProblemListView } from './list.js';
import { getProblemSearchNavigation } from './navigation.js';
import { renderProblemRanking as renderProblemRankingView } from './ranking.js';
import { getProblemBrowserMatches as getProblemBrowserMatchesForState } from './search.js';
import { getProblemBrowserViewState } from './viewState.js';
import { renderProblemViewTabs as renderProblemViewTabsView } from './viewTabs.js';

export function createProblemBrowserController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const getFilters = () => deps.getFilterState?.() || {};
  const isEnglish = () => deps.getLanguage?.() === "en";
  const getPageSize = () => Math.max(1, Number(deps.pageSize || 24));
  const windowRef = deps.windowRef || globalThis.window;
  const documentRef = deps.documentRef || globalThis.document;

  function getSearchOptions() {
    return {
      cache: deps.searchRecordCache,
      tagLabels: deps.tagLabels,
      getCompanies: deps.getCompanies,
      getCompanyAliases: deps.getCompanyAliases,
      getDisplayTitle: deps.getDisplayTitle
    };
  }

  function getMatches(options = {}) {
    const filters = getFilters();
    return getProblemBrowserMatchesForState({
      problems: getState().problems,
      query: deps.getSearchQuery?.() || "",
      forceAllView: Boolean(options.forceAllView),
      viewMode: filters.viewMode,
      filters: {
        source: filters.source,
        company: filters.company,
        theme: filters.theme,
        difficulty: filters.difficulty
      },
      predicates: {
        isCatalogProblem: deps.isCatalogProblem,
        matchesSource: deps.matchesSource,
        matchesCompany: deps.matchesCompany,
        matchesTheme: deps.matchesTheme,
        matchesDifficulty: deps.matchesDifficulty
      },
      getPersonalState: deps.getPersonalState,
      isEnglish: isEnglish(),
      locale: deps.getLocale?.(),
      searchOptions: getSearchOptions()
    });
  }

  function openFromSearch(problemId) {
    const route = getProblemSearchNavigation(problemId);
    if (!route.ok) return route;
    deps.applyNavigationFilters?.(route.filters);
    deps.resetPagination?.();
    const elements = getElements();
    if (elements.problemSearch) elements.problemSearch.value = "";
    render();
    windowRef.setTimeout?.(() => deps.openProblemDetail?.(problemId), 40);
    return route;
  }

  function render(options = {}) {
    deps.cancelSearchRender?.();
    const elements = getElements();
    const state = getState();
    const filters = getFilters();
    const resultsOnly = Boolean(options.resultsOnly);
    renderViewTabs();

    if (!resultsOnly) {
      deps.renderLeetcodeHot100?.();
      const scopes = getProblemFilterScopes(state.problems, {
        source: filters.source,
        company: filters.company
      }, {
        isCatalogProblem: deps.isCatalogProblem,
        matchesSource: deps.matchesSource,
        matchesCompany: deps.matchesCompany
      });
      renderCompanyPanel(scopes.sourceProblems);
      deps.renderProblemThemeFilter?.(scopes.companyProblems);
      deps.renderProblemDifficultyFilter?.(scopes.companyProblems);
      deps.renderProblemCompletionDashboard?.(scopes.companyProblems);
    }

    const viewState = getProblemBrowserViewState({
      selectedDetailId: deps.getSelectedDetailId?.(),
      problems: state.problems,
      viewMode: filters.viewMode,
      isCatalogProblem: deps.isCatalogProblem
    });
    deps.setSelectedDetailId?.(viewState.selectedDetailId);

    if (viewState.mode === "detail") {
      elements.problemList?.classList.add("hidden");
      deps.hidePagination?.();
      elements.problemRanking?.classList.add("hidden");
      elements.problemDetail?.classList.remove("hidden");
      deps.renderProblemDetail?.(viewState.selected);
      return;
    }

    elements.problemDetail?.classList.add("hidden");
    const problems = getMatches();

    if (viewState.mode === "ranking") {
      elements.problemList?.classList.add("hidden");
      deps.hidePagination?.();
      elements.problemRanking?.classList.remove("hidden");
      renderRanking(problems);
      return;
    }

    elements.problemRanking?.classList.add("hidden");
    elements.problemList?.classList.remove("hidden");
    const listPage = renderProblemListView(elements.problemList, problems, {
      viewMode: filters.viewMode,
      page: deps.getPage?.(),
      pageSize: getPageSize(),
      isEnglish: isEnglish(),
      getPersonalState: deps.getPersonalState,
      getTitle: deps.getDisplayTitle,
      getPromptText: deps.getPromptText,
      getSocial: deps.getSocial,
      getCompanies: deps.getCompanies,
      formatCategory: deps.formatCategory,
      formatTag: deps.formatTag,
      isHiddenTag: deps.isHiddenTag,
      openProblem: deps.openProblemDetail,
      toggleCompleted: deps.toggleCompleted,
      toggleSaved: deps.toggleSaved,
      t: deps.t,
      emptyBlock: deps.emptyBlock
    });
    deps.setPage?.(listPage.page);
    if (!listPage.totalProblems) {
      deps.hidePagination?.();
      return;
    }
    deps.renderPagination?.(listPage.totalProblems);
    deps.refreshIcons?.();
  }

  function renderCompanyPanel(problems = deps.getCatalogProblems?.() || []) {
    renderProblemCompanyPanelView({
      elements: getElements(),
      companies: deps.companies,
      activeCompany: deps.getCompanyFilter?.() || "all",
      isEnglish: isEnglish(),
      getStats: (company) => deps.getCompanyProblemStats?.(company, problems),
      tierWeight: deps.companyTierWeight,
      createMark: deps.createCompanyMark,
      t: deps.t
    });
    deps.refreshIcons?.();
  }

  function renderViewTabs() {
    const filters = getFilters();
    renderProblemViewTabsView({
      root: documentRef,
      elements: getElements(),
      viewMode: filters.viewMode,
      sourceFilter: filters.source,
      socialNotice: deps.getSocialNotice?.() || "",
      isEnglish: isEnglish(),
      getSourceLabel: deps.getSourceLabel
    });
  }

  function renderRanking(problems = []) {
    renderProblemRankingView({
      container: getElements().problemRankingList,
      problems,
      getSocial: deps.getSocial,
      getTitle: deps.getDisplayTitle,
      formatCategory: deps.formatCategory,
      openProblem: deps.openProblemDetail,
      emptyBlock: deps.emptyBlock,
      locale: deps.getLocale?.(),
      t: deps.t,
      limit: 50
    });
    deps.refreshIcons?.();
  }

  return {
    getMatches,
    getSearchOptions,
    openFromSearch,
    render,
    renderCompanyPanel,
    renderRanking,
    renderViewTabs
  };
}
