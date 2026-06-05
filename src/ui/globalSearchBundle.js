import { createGlobalSearchProvider } from './globalSearchProvider.js';
import { createGlobalSearchRuntime } from './globalSearchRuntime.js';

export function createGlobalSearchBundle(deps = {}) {
  const provider = createGlobalSearchProvider({
    getState: deps.getState,
    t: deps.t,
    getLanguage: deps.getLanguage,
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

  const runtime = createGlobalSearchRuntime({
    elements: deps.elements,
    documentRef: deps.documentRef,
    windowRef: deps.windowRef,
    buildResults: provider.buildResults,
    emptyLabel: deps.emptyLabel,
    switchModule: deps.switchModule,
    openProblem: deps.openProblem,
    setCompanyTier: deps.setCompanyTier,
    setRadarHover: deps.setRadarHover,
    focusNews: deps.focusNews
  });

  return {
    clear: runtime.clear,
    handleKeydown: runtime.handleKeydown,
    hide: runtime.hide,
    provider,
    render: runtime.render,
    runtime,
    schedule: runtime.schedule,
    setComposing: runtime.setComposing
  };
}
