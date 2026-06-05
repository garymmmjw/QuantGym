import { createCommunityControllerBundle } from '../modules/community/controllerBundle.js';

export function createAppCommunityControllerBundle(deps = {}) {
  const {
    appState,
    communityFilterState,
    elements: els,
    formatSharedExperienceText,
    getModuleLifecycle,
    loadCommunity,
    makeId,
    messageSelectionState,
    normalizeCountry,
    normalizeInterviewExperience,
    normalizeRegionForCountry,
    saveCommunity,
    saveState,
    switchModule,
    t,
    userState
  } = deps;

  return createCommunityControllerBundle({
    elements: els,
    getCommunity: () => appState.community,
    setCommunity(store) {
      appState.community = store;
    },
    reloadCommunity() {
      appState.community = loadCommunity();
    },
    saveCommunity,
    getCurrentUser: () => appState.currentUser,
    makeId,
    normalizeExperience: normalizeInterviewExperience,
    normalizeCountry,
    normalizeRegionForCountry,
    getIntroText: () => t("networkConnectMessage"),
    selectThread: (threadId) => messageSelectionState.setSelected(threadId),
    switchModule,
    renderMessages: () => getModuleLifecycle("messages")?.render?.(),
    getExperienceRecords: () => userState.value.interviewExperiences,
    setRecords(records) {
      userState.value.interviewExperiences = records;
    },
    saveState,
    setCommunityFilter(value) {
      communityFilterState.setFilter(value);
    },
    renderExperiences: () => getModuleLifecycle("experiences")?.render?.(),
    renderCommunity: () => getModuleLifecycle("community")?.render?.(),
    formatExperienceText: formatSharedExperienceText,
    now: () => new Date().toISOString()
  });
}
