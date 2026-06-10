import {
  buildGlobalSearchResults,
  getModuleSearchDefs
} from './globalSearchData.js';

export function createGlobalSearchProvider(deps = {}) {
  function nowMs() {
    return deps.windowRef?.performance?.now?.()
      || globalThis.performance?.now?.()
      || Date.now();
  }

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

  function prewarmProblemRecords(options = {}) {
    const state = deps.getState?.() || {};
    const problems = Array.isArray(state.problems) ? state.problems : [];
    const total = problems.length;
    const budgetMs = Math.max(1, Number(options.budgetMs || 5));
    const maxItems = Math.max(1, Number(options.maxItems || 180));
    const startedAt = nowMs();
    let index = Math.max(0, Number(options.startIndex || 0));
    let processed = 0;

    while (index < total && processed < maxItems && nowMs() - startedAt < budgetMs) {
      const problem = problems[index];
      index += 1;
      if (deps.isCatalogProblem?.(problem) ?? true) {
        deps.createProblemSearchRecord?.(problem, deps.getProblemSearchOptions?.() || {});
      }
      processed += 1;
    }

    return {
      done: index >= total,
      nextIndex: index,
      processed,
      total
    };
  }

  return {
    buildResults,
    getModuleSearchDefs: () => getModuleSearchDefs(deps.t),
    prewarmProblemRecords
  };
}
