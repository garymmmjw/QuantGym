import {
  buildGlobalSearchResults,
  getModuleSearchDefs
} from './globalSearchData.js';

export function createGlobalSearchProvider(deps = {}) {
  function buildResults(query) {
    return buildGlobalSearchResults(query, {
      state: deps.getState?.() || {},
      t: deps.t,
      getLanguage: deps.getLanguage,
      getModuleSearchDefs: () => getModuleSearchDefs(deps.t),
      isCatalogProblem: deps.isCatalogProblem,
      createProblemSearchRecord: deps.createProblemSearchRecord,
      getProblemSearchOptions: deps.getProblemSearchOptions,
      formatCategoryLabel: deps.formatCategoryLabel,
      scoreProblemSearchRecord: deps.scoreProblemSearchRecord,
      quantCompanyDefs: deps.quantCompanyDefs,
      getCompanyProblemStats: deps.getCompanyProblemStats,
      normalizeJobs: deps.normalizeJobs,
      normalizeCourses: deps.normalizeCourses,
      skillDefs: deps.skillDefs,
      sortNews: deps.sortNews,
      inferSource: deps.inferSource,
      formatNewsDate: deps.formatNewsDate
    });
  }

  return {
    buildResults,
    getModuleSearchDefs: () => getModuleSearchDefs(deps.t)
  };
}
