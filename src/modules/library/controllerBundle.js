import { createLibraryProvider } from './provider.js';
import { createLibraryReader } from './reader.js';

export function createLibraryControllerBundle(deps = {}) {
  let reader = null;
  const provider = createLibraryProvider({
    catalog: deps.catalog,
    getLanguage: deps.getLanguage,
    getFilterState: deps.getFilterState,
    getSearchValue: deps.getSearchValue,
    getProblems: deps.getProblems,
    isCatalogProblem: deps.isCatalogProblem,
    applyProblemNavigationFilters: deps.applyProblemNavigationFilters,
    resetProblemPagination: deps.resetProblemPagination,
    clearProblemSearch: deps.clearProblemSearch,
    closeReader: () => reader?.close?.(),
    switchModule: deps.switchModule,
    renderProblems: deps.renderProblems
  });

  reader = createLibraryReader({
    elements: deps.elements,
    getEntries: provider.getEntries,
    getLanguage: deps.getLanguage,
    getTitle: provider.getTitle,
    getCloudApiBase: deps.getCloudApiBase,
    canUseCloud: deps.canUseCloud,
    cloudApi: deps.cloudApi,
    openPractice: provider.openPractice,
    refreshIcons: deps.refreshIcons,
    escapeHtml: deps.escapeHtml
  });

  return {
    provider,
    reader,
    closeReader: reader.close,
    getEntries: provider.getEntries,
    getSearchText: provider.getSearchText,
    getSourceLabel: provider.getSourceLabel,
    getSubtitle: provider.getSubtitle,
    getTitle: provider.getTitle,
    getVisibleEntries: provider.getVisibleEntries,
    openPractice: provider.openPractice,
    openReader: reader.open
  };
}
