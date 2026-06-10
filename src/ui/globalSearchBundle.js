import { createGlobalSearchProvider } from './globalSearchProvider.js';
import { createGlobalSearchRuntime } from './globalSearchRuntime.js';

export function createGlobalSearchBundle(deps = {}) {
  const provider = createGlobalSearchProvider({
    getState: deps.getState,
    windowRef: deps.windowRef,
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
  let prewarmTimer = 0;
  let prewarmIndex = 0;
  const windowRef = deps.windowRef || globalThis.window;
  const schedulePrewarm = (delay = 160) => {
    if (!windowRef?.setTimeout) return;
    prewarmTimer = windowRef.setTimeout(() => {
      prewarmTimer = 0;
      const result = provider.prewarmProblemRecords({
        startIndex: prewarmIndex,
        budgetMs: 5,
        maxItems: 220
      });
      if (!result || result.done) return;
      prewarmIndex = result.nextIndex;
      schedulePrewarm(36);
    }, delay);
  };
  schedulePrewarm();

  return {
    clear: runtime.clear,
    handleKeydown: runtime.handleKeydown,
    hide: runtime.hide,
    provider,
    render: runtime.render,
    runtime,
    schedule: runtime.schedule,
    cancelPrewarm() {
      if (!prewarmTimer) return;
      windowRef?.clearTimeout?.(prewarmTimer);
      prewarmTimer = 0;
    },
    setComposing: runtime.setComposing
  };
}
