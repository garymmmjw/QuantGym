import { createCommunityControllerBundle } from '../modules/community/controllerBundle.js';

export function createAppCommunityControllerBundle(deps = {}) {
  const {
    appState,
    communityFilterState,
    elements: els,
    formatSharedExperienceText,
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
    userState,
    userStateRuntime
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
    renderMessages: () => {},
    getExperienceRecords: () => userState.value.interviewExperiences,
    setExperienceRecords(records) {
      const nextState = {
        ...(userState.value || {}),
        interviewExperiences: records
      };
      if (userStateRuntime?.setValue) {
        userStateRuntime.setValue(nextState);
      } else {
        userState.value = nextState;
      }
    },
    saveState,
    setCommunityFilter(value) {
      communityFilterState.setFilter(value);
    },
    renderExperiences: () => {},
    renderCommunity: () => {},
    formatExperienceText: formatSharedExperienceText,
    now: () => new Date().toISOString()
  });
}
