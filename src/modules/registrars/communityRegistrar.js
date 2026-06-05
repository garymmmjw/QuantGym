import { registerModule } from '../registry.js';
import { createCommunityModule } from '../community/index.js';

export function registerCommunityModule(deps = {}) {
  const communityModule = createCommunityModule({
    elements: deps.elements,
    getCurrentUser: deps.getCurrentUser,
    getFilter: deps.getCommunityFilter,
    setFilter: deps.setCommunityFilter,
    loadCommunity: deps.loadCommunity,
    setCommunity: deps.setCommunity,
    saveCommunity: deps.saveCommunity,
    normalizePost: deps.normalizeCommunityPost,
    normalizeComment: deps.normalizeCommunityComment,
    getLanguage: deps.getLanguage,
    getInitials: deps.getInitials,
    formatPostDetail: deps.formatCommunityPostDetail,
    startDirectMessage: deps.startDirectMessage,
    clearExperiencePost: deps.clearExperiencePost,
    labels: deps.communityLabels,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons
  });
  registerModule("community", communityModule);
  return communityModule;
}
