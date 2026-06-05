import { registerModule } from '../registry.js';
import { createNewsModule } from '../news/index.js';
import { createOverviewModule } from '../overview/index.js';

export function registerDashboardModules(deps = {}) {
  const newsModule = createNewsModule({
    elements: deps.elements,
    getNews: deps.getNews,
    getTopicFilter: deps.getNewsTopicFilter,
    setTopicFilter: deps.setNewsTopicFilter,
    getSourceFilter: deps.getNewsSourceFilter,
    setSourceFilter: deps.setNewsSourceFilter,
    getFetchedAt: deps.getNewsFetchedAt,
    getSyncError: deps.getNewsSyncError,
    skillDefs: deps.skillDefs,
    sortNews: deps.sortNews,
    normalizeTopicFilter: deps.normalizeNewsTopicFilter,
    normalizeSourceFilter: deps.normalizeNewsSourceFilter,
    matchesTopic: deps.newsMatchesTopic,
    matchesSourceFilter: deps.newsMatchesSourceFilter,
    normalizeSourceType: deps.normalizeNewsSourceType,
    inferSourceType: deps.inferNewsSourceType,
    inferSource: deps.inferSource,
    getSourceTypeLabel: deps.getNewsSourceTypeLabel,
    getVerificationLabel: deps.getNewsVerificationLabel,
    isSocialSource: deps.isSocialNewsType,
    normalizeSkills: deps.normalizeNewsSkills,
    addTag: deps.addTag,
    safeExternalUrl: deps.safeExternalUrl,
    formatNewsDate: deps.formatNewsDate,
    formatTimeOnly: deps.formatTimeOnly,
    focusItem: deps.focusNewsItem,
    markRead: deps.markNewsRead,
    renderSummary: deps.renderSummary,
    renderLeaderboard: deps.renderLeaderboard,
    refresh: deps.refreshNews,
    addFromForm: deps.addNewsFromForm,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons,
    getLanguage: deps.getLanguage,
  });
  registerModule("news", newsModule);

  registerModule("overview", createOverviewModule({
    elements: deps.elements,
    renderTicker: newsModule.renderTicker,
    renderSummary: deps.renderSummary,
    renderLeaderboard: deps.renderLeaderboard,
    renderTodayPlan: deps.renderTodayPlan,
    renderCommunity: deps.renderCommunity,
    getCatalogProblems: deps.getCatalogProblems,
    buildProblemProgressItems: deps.buildProblemProgressItems,
    renderProgressGroup: deps.renderProgressGroup,
    getDailyXpSeries: deps.getDailyXpSeries,
    buildRecentContributionHeatmap: deps.buildRecentContributionHeatmap,
    dayKey: deps.dayKey,
    formatDate: deps.formatOverviewDate,
    t: deps.t,
    escapeHtml: deps.escapeHtml,
    openCommunity: deps.openCommunity,
    addCommunityPost: deps.addCommunityPost,
    handleCommunityMedia: deps.handleCommunityMedia,
    refreshLeaderboard: deps.refreshLeaderboard,
    updateLeaderboardSettings: deps.updateLeaderboardSettings
  }));
}
