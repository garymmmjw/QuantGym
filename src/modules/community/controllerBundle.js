import { createExperienceShareController } from '../experiences/shareController.js';
import { createCommunityProvider } from './provider.js';

export function createCommunityControllerBundle(deps = {}) {
  const communityProvider = createCommunityProvider({
    elements: deps.elements,
    getCommunity: deps.getCommunity,
    setCommunity: deps.setCommunity,
    reloadCommunity: deps.reloadCommunity,
    saveCommunity: deps.saveCommunity,
    getCurrentUser: deps.getCurrentUser,
    makeId: deps.makeId,
    normalizeExperience: deps.normalizeExperience,
    normalizeCountry: deps.normalizeCountry,
    normalizeRegionForCountry: deps.normalizeRegionForCountry,
    getIntroText: deps.getIntroText,
    selectThread: deps.selectThread,
    switchModule: deps.switchModule,
    renderMessages: deps.renderMessages
  });

  const experienceShareController = createExperienceShareController({
    getRecords: deps.getExperienceRecords,
    setRecords: deps.setExperienceRecords,
    loadCommunity: deps.loadCommunity,
    getCommunity: deps.getCommunity,
    setCommunity: deps.setCommunity,
    getCurrentUser: deps.getCurrentUser,
    makeId: deps.makeId,
    normalizePost: communityProvider.normalizePost,
    normalizeExperience: deps.normalizeExperience,
    formatText: deps.formatExperienceText,
    saveCommunity: deps.saveCommunity,
    saveState: deps.saveState,
    setCommunityFilter: deps.setCommunityFilter,
    renderExperiences: deps.renderExperiences,
    switchModule: deps.switchModule,
    renderCommunity: deps.renderCommunity,
    now: deps.now
  });

  return {
    experienceShareController,
    getUserMessageThreads: communityProvider.getThreads,
    getUnreadMessageCount: communityProvider.getUnreadCount,
    normalizeCommunityPost: communityProvider.normalizePost,
    normalizeCommunityComment: communityProvider.normalizeComment,
    normalizeMessageParticipant: communityProvider.normalizeParticipant,
    normalizeMessageThread: communityProvider.normalizeThread,
    updateUnreadMessageBadge: communityProvider.updateUnreadBadge,
    startDirectMessageWithUser: communityProvider.startDirectMessage
  };
}
