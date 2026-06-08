import {
  applyProblemFilterPatch,
  createProblemFilterState,
  getProblemFilterActionState
} from './filterState.js';
import {
  problemMatchesDifficulty,
  problemMatchesSource,
  problemMatchesTheme
} from './filters.js';

export function createProblemFilterController(deps) {
  const {
    getDetailId,
    setDetailId,
    normalizeCategory,
    getCompanyDef,
    getCompanyNavigation,
    resetPagination,
    returnToList,
    clearProblemSearch,
    switchModule,
    renderProblems,
    spotlightCompany
  } = deps;
  const state = createProblemFilterState();

  function getState() {
    return {
      ...state.getState(),
      detailId: getDetailId()
    };
  }

  function getValue(key) {
    return getState()[key];
  }

  function patch(nextState = {}) {
    state.patch(nextState);
    if ("detailId" in nextState) setDetailId(nextState.detailId);
    return getState();
  }

  function applyAction(action = {}) {
    const result = getProblemFilterActionState(getState(), action);
    patch(result.state);
    if (result.resetPagination) resetPagination();
    if (result.returnToList) returnToList();
    return result;
  }

  function applyNavigationFilters(filters = {}) {
    patch(applyProblemFilterPatch(getState(), filters));
  }

  function showCompanyProblems(companySlug) {
    const company = getCompanyDef(companySlug);
    if (!company) return;
    const route = getCompanyNavigation(company);
    if (!route.ok) return;
    applyNavigationFilters(route.filters);
    resetPagination();
    clearProblemSearch();
    switchModule("problems");
    renderProblems?.();
    spotlightCompany(company);
  }

  return {
    getState,
    getValue,
    patch,
    applyAction,
    applyNavigationFilters,
    showCompanyProblems,
    matchesTheme(problem, theme = getValue("theme")) {
      return problemMatchesTheme(problem, theme, {
        normalizeCategory
      });
    },
    matchesDifficulty(problem, difficulty = getValue("difficulty")) {
      return problemMatchesDifficulty(problem, difficulty);
    },
    matchesSource(problem, sourceSlug = getValue("source")) {
      return problemMatchesSource(problem, sourceSlug);
    }
  };
}
