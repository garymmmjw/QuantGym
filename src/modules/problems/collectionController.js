import {
  buildProblemProgressItems as buildProblemProgressItemsView,
  getProblemCollectionClickResult,
  getProblemCollectionEntries as getProblemCollectionEntriesView,
  getProblemThemeEntries as getProblemThemeEntriesView,
  renderProblemCollectionGrid as renderProblemCollectionGridView,
  renderProblemDifficultyFilter as renderProblemDifficultyFilterView,
  renderProblemThemeFilter as renderProblemThemeFilterView,
  renderProgressGroup as renderProgressGroupView
} from './collections.js';

export function createProblemCollectionController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const getFilters = () => deps.getFilterState?.() || {};
  const isEnglish = () => deps.getLanguage?.() === "en";
  const getDefaultProblems = () => deps.getCatalogProblems?.() || [];
  const getCatalogSourceProblems = () => {
    const state = getState();
    const isCatalogProblem = deps.isCatalogProblem || (() => true);
    return (Array.isArray(state.problems) ? state.problems : []).filter(isCatalogProblem);
  };

  function getProblemThemeEntries(problems = getDefaultProblems()) {
    return getProblemThemeEntriesView(problems, {
      skillDefs: deps.skillDefs,
      normalizeCategory: deps.normalizeCategory
    });
  }

  function renderProblemThemeFilter(problems = getDefaultProblems()) {
    const filters = getFilters();
    renderProblemThemeFilterView({
      elements: getElements(),
      problems,
      themeEntries: getProblemThemeEntries(problems),
      activeTheme: filters.theme,
      isEnglish: isEnglish()
    });
  }

  function renderProblemDifficultyFilter(problems = getDefaultProblems()) {
    const filters = getFilters();
    renderProblemDifficultyFilterView({
      elements: getElements(),
      problems,
      activeTheme: filters.theme,
      activeDifficulty: filters.difficulty,
      normalizeCategory: deps.normalizeCategory,
      isEnglish: isEnglish(),
      t: deps.t
    });
  }

  function buildProblemProgressItems(problems = getDefaultProblems()) {
    const filters = getFilters();
    return buildProblemProgressItemsView({
      problems,
      activeTheme: filters.theme,
      isEnglish: isEnglish(),
      normalizeCategory: deps.normalizeCategory,
      formatCategory: deps.formatCategoryLabel,
      getCompletionCount: deps.getCompletionCount,
      getHotStats: deps.getLeetcodeHotCompletionStats,
      themeEntries: getProblemThemeEntries(problems)
    });
  }

  function renderProgressGroup(container, items) {
    renderProgressGroupView(container, items);
  }

  function renderProblemCompletionDashboard(problems = getDefaultProblems()) {
    renderProgressGroup(getElements().problemCompletionProgress, buildProblemProgressItems(problems).slice(0, 8));
  }

  function getProblemCollectionEntries(problems = getDefaultProblems()) {
    return getProblemCollectionEntriesView({
      problems,
      isEnglish: isEnglish(),
      normalizeCategory: deps.normalizeCategory,
      matchesSource: deps.matchesSource,
      getCompletionCount: deps.getCompletionCount,
      getHotStats: deps.getLeetcodeHotCompletionStats
    });
  }

  function renderProblemCollectionGrid() {
    const filters = getFilters();
    renderProblemCollectionGridView({
      container: getElements().problemCollectionGrid,
      entries: getProblemCollectionEntries(getCatalogSourceProblems()),
      leetcodeExpanded: deps.isLeetcodeExpanded?.(),
      activeSource: filters.source,
      activeTheme: filters.theme,
      isEnglish: isEnglish()
    });
  }

  function handleProblemCollectionClick(event) {
    const button = event.target.closest("[data-problem-collection]");
    if (!button) return;
    const result = getProblemCollectionClickResult(
      button.dataset.problemCollection,
      getProblemCollectionEntries(getCatalogSourceProblems()),
      { leetcodeExpanded: deps.isLeetcodeExpanded?.() }
    );
    if (!result.ok) return;
    if (result.mode === "leetcode") {
      deps.setLeetcodeExpanded?.(result.leetcodeExpanded);
      deps.renderLeetcodeHot100?.();
      return;
    }
    deps.applyNavigationFilters?.(result.filters);
    deps.resetPagination?.();
    if (getElements().problemSearch) getElements().problemSearch.value = "";
    deps.renderProblems?.();
    deps.documentRef?.querySelector(".problem-browser-toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return {
    getProblemThemeEntries,
    renderProblemThemeFilter,
    renderProblemDifficultyFilter,
    buildProblemProgressItems,
    renderProgressGroup,
    renderProblemCompletionDashboard,
    getProblemCollectionEntries,
    renderProblemCollectionGrid,
    handleProblemCollectionClick
  };
}
