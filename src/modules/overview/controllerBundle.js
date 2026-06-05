import { createLeaderboardController } from './leaderboardController.js';
import { createOverviewSummaryController } from './summaryController.js';

export function createOverviewControllerBundle(deps = {}) {
  const leaderboardController = createLeaderboardController({
    elements: deps.elements,
    getRawSettings: deps.getRawSettings,
    setRawSettings: deps.setRawSettings,
    normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings,
    getCurrentUser: deps.getCurrentUser,
    getAccounts: deps.getAccounts,
    loadStateForUser: deps.loadStateForUser,
    getCloudRows: deps.getCloudRows,
    getCloudSnapshot: deps.getCloudSnapshot,
    refreshCloud: deps.refreshCloud,
    normalizeAccount: deps.normalizeAccount,
    normalizeSkills: deps.normalizeSkills,
    calculateQuantScore: deps.calculateQuantScore,
    getSkillScore: deps.getSkillScore,
    getCountryLabel: deps.getCountryLabel,
    getRegionLabel: deps.getRegionLabel,
    getRank: deps.getRank,
    getDefaultRegion: deps.getDefaultRegion,
    normalizeCountry: deps.normalizeCountry,
    normalizeRegionForCountry: deps.normalizeRegionForCountry,
    skillDefs: deps.skillDefs,
    t: deps.t,
    getLanguage: deps.getLanguage,
    renderCountryOptions: deps.renderCountryOptions,
    renderRegionOptions: deps.renderRegionOptions,
    hashStringToHue: deps.hashStringToHue,
    getInitials: deps.getInitials,
    formatScore: deps.formatScore,
    emptyBlock: deps.emptyBlock,
    refreshIcons: deps.refreshIcons,
    saveState: deps.saveState
  });

  const summaryController = createOverviewSummaryController({
    elements: deps.elements,
    getQuantScore: deps.getQuantScore,
    getStreak: deps.getStreak,
    getRank: deps.getRank,
    getEntryCount: deps.getEntryCount,
    getWeeklyXp: deps.getWeeklyXp,
    getLocale: deps.getLocale,
    formatScore: deps.formatScore,
    updateUnreadMessageBadge: deps.updateUnreadMessageBadge,
    updateCheckInPill: deps.updateCheckInPill,
    renderRegionRank: leaderboardController.renderRegion,
    now: deps.now
  });

  return {
    leaderboardController,
    summaryController,
    buildLeaderboardTrend: leaderboardController.buildTrend,
    compareLeaderboardRows: leaderboardController.compareRows,
    computeLeaderboardRankChanges: leaderboardController.computeRankChanges,
    filterLeaderboardRows: leaderboardController.filterRows,
    getLeaderboardMetricOptions: leaderboardController.getMetricOptions,
    getLeaderboardRows: leaderboardController.getRows,
    getLeaderboardRowsForSettings: leaderboardController.getRowsForSettings,
    getAllLeaderboardRows: leaderboardController.getAllRows,
    getLocalLeaderboardRows: leaderboardController.getLocalRows,
    getLeaderboardScore: leaderboardController.getScore,
    getLeaderboardMetricLabel: leaderboardController.getMetricLabel,
    getLeaderboardScopeText: leaderboardController.getScopeText,
    getLeaderboardSourceText: leaderboardController.getSourceText,
    keepCurrentLeaderboardRow: leaderboardController.keepCurrentRow,
    leaderboardSnapshotKey: leaderboardController.leaderboardSnapshotKey,
    makeLeaderboardRow: leaderboardController.makeRow,
    mergeLeaderboardRows: leaderboardController.mergeRows,
    renderLeaderboard: leaderboardController.render,
    renderLeaderboardControls: leaderboardController.renderControls,
    renderRegionRank: leaderboardController.renderRegion,
    renderLeaderboardScopeSummary: leaderboardController.renderScopeSummary,
    updateLeaderboardSettings: leaderboardController.updateSettings
  };
}
