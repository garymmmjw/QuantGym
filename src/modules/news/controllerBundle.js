import { createNewsProvider } from './provider.js';
import { createNewsRuntime } from './runtime.js';

export function createNewsControllerBundle(deps = {}) {
  const provider = createNewsProvider({
    elements: deps.elements,
    documentRef: deps.documentRef,
    windowRef: deps.windowRef,
    getState: deps.getState,
    getEndpointBase: deps.getEndpointBase,
    getFilters: deps.getFilters,
    topicPacks: deps.topicPacks,
    normalizeTopic: deps.normalizeTopic,
    parseTags: deps.parseTags,
    normalizeNewsSkills: deps.normalizeNewsSkills,
    stableId: deps.stableId,
    makeId: deps.makeId,
    inferSource: deps.inferSource,
    skillDefs: deps.skillDefs,
    switchModule: deps.switchModule,
    t: deps.t,
    saveState: deps.saveState,
    renderAll: deps.renderAll
  });

  const runtime = createNewsRuntime({
    getState: deps.getState,
    getCurrentUser: deps.getCurrentUser,
    autoRefreshMs: deps.autoRefreshMs,
    retryMs: deps.retryMs,
    requestNews: provider.requestFromApi,
    upsertNews: provider.upsert,
    saveState: deps.saveState,
    renderNews: deps.renderNews,
    refreshIcons: deps.refreshIcons,
    setStatusText: deps.setStatusText,
    getSyncingLabel: deps.getSyncingLabel
  });

  return {
    addFromForm: provider.addFromForm,
    focusItem: provider.focusItem,
    getSourceTypeLabel: provider.getSourceTypeLabel,
    getVerificationLabel: provider.getVerificationLabel,
    markRead: provider.markRead,
    provider,
    runtime,
    upsert: provider.upsert
  };
}
