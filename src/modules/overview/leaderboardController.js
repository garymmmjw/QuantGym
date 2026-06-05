import {
  buildLeaderboardTrend,
  compareLeaderboardRows,
  computeLeaderboardRankChanges,
  filterLeaderboardRows,
  getLeaderboardMetricOptions,
  getLeaderboardRowsForSettings,
  getLeaderboardScopeLabel,
  getLeaderboardScopeSummaryViewModel,
  getLeaderboardScore,
  getLeaderboardSourceLabelKey,
  getLeaderboardSourceStatus,
  getRegionRankViewModel,
  keepCurrentLeaderboardRow,
  leaderboardSnapshotKey,
  makeLeaderboardRow,
  mergeLeaderboardRows,
  readLeaderboardSettingsForm
} from './leaderboard.js';
import {
  renderLeaderboardControls,
  renderLeaderboardList,
  renderLeaderboardScopeSummary,
  renderRegionRank
} from './leaderboardView.js';

export function createLeaderboardController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const text = (key) => deps.t?.(key) || key;
  const getSettings = () => deps.normalizeLeaderboardSettings?.(deps.getRawSettings?.()) || deps.getRawSettings?.() || {};

  function renderRegion() {
    renderRegionRank(getElements(), getRegionRankViewModel({
      settings: getSettings(),
      currentUser: getCurrentUser(),
      defaultCountry: "china",
      getDefaultRegion: deps.getDefaultRegion,
      getRowsForSettings: getRowsForSettings,
      getLeaderboardMetricLabel: getMetricLabel,
      getCountryLabel: deps.getCountryLabel,
      getRegionLabel: deps.getRegionLabel
    }));
  }

  function getMetricOptions() {
    return getLeaderboardMetricOptions(deps.skillDefs, text);
  }

  function updateSettings() {
    deps.setRawSettings?.(readLeaderboardSettingsForm(getElements(), {
      currentUser: getCurrentUser(),
      normalizeCountry: deps.normalizeCountry,
      normalizeRegionForCountry: deps.normalizeRegionForCountry,
      normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings
    }));
    deps.saveState?.();
    render();
    renderRegion();
  }

  function getRows() {
    return getRowsForSettings(getSettings(), 10);
  }

  function getRowsForSettings(settings, limit = 10) {
    return getLeaderboardRowsForSettings(settings, {
      limit,
      normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings,
      getAllLeaderboardRows: getAllRows
    });
  }

  function getAllRows(metric = "overall") {
    const cloudRows = deps.getCloudRows?.().map((profile) => makeRow(profile, metric, "cloud")) || [];
    const localRows = getLocalRows(metric);
    return mergeRows(cloudRows, localRows).sort(compareLeaderboardRows);
  }

  function getLocalRows(metric = "overall") {
    return (deps.getAccounts?.() || []).map((account) => {
      const accountState = deps.loadStateForUser?.(account.id) || {};
      return makeRow({
        ...account,
        name: account.name || account.email || "Quant",
        skills: accountState.skills,
        source: "local"
      }, metric, "local");
    });
  }

  function makeRow(profile, metric = "overall", source = "cloud") {
    return makeLeaderboardRow(profile, metric, source, {
      normalizeAccount: deps.normalizeAccount,
      normalizeSkills: deps.normalizeSkills,
      calculateQuantScore: deps.calculateQuantScore,
      getSkillScore: deps.getSkillScore,
      getCountryLabel: deps.getCountryLabel,
      getRegionLabel: deps.getRegionLabel,
      getRank: deps.getRank,
      getLeaderboardMetricLabel: getMetricLabel,
      currentUserId: getCurrentUser()?.id || ""
    });
  }

  function getScore(skills, metric) {
    return getLeaderboardScore(skills, metric, {
      calculateQuantScore: deps.calculateQuantScore,
      getSkillScore: deps.getSkillScore
    });
  }

  function getMetricLabel(metric) {
    return metric === "overall" ? text("leaderboardOverall") : deps.skillDefs?.[metric]?.name || text("leaderboardOverall");
  }

  function mergeRows(...rowGroups) {
    return mergeLeaderboardRows(...rowGroups);
  }

  function renderScopeSummary(settings, rows, forcedStatus = "") {
    const cloudSnapshot = deps.getCloudSnapshot?.() || {};
    renderLeaderboardScopeSummary(getElements().leaderboardScopeSummary, getLeaderboardScopeSummaryViewModel({
      settings,
      rows,
      language: deps.getLanguage?.(),
      forcedStatus,
      loading: cloudSnapshot.loading,
      cloudRowCount: cloudSnapshot.rowCount,
      error: cloudSnapshot.error,
      text,
      getLeaderboardMetricLabel: getMetricLabel,
      getScopeLabel: getScopeText
    }));
  }

  function getSourceText(forcedStatus = "") {
    const cloudSnapshot = deps.getCloudSnapshot?.() || {};
    const status = getLeaderboardSourceStatus({
      forcedStatus,
      loading: cloudSnapshot.loading,
      cloudRowCount: cloudSnapshot.rowCount,
      error: cloudSnapshot.error
    });
    return text(getLeaderboardSourceLabelKey(status));
  }

  function getScopeText(settings) {
    return getLeaderboardScopeLabel(settings, {
      globalLabel: text("leaderboardGlobal"),
      getCountryLabel: deps.getCountryLabel,
      getRegionLabel: deps.getRegionLabel
    });
  }

  function renderControls() {
    renderLeaderboardControls(getElements(), {
      settings: getSettings(),
      metricOptions: getMetricOptions(),
      renderCountryOptions: deps.renderCountryOptions,
      renderRegionOptions: deps.renderRegionOptions
    });
  }

  function render() {
    renderControls();
    deps.refreshCloud?.(false);
    const settings = getSettings();
    const rows = getRowsForSettings(settings, 10);
    renderScopeSummary(settings, rows);
    const changes = computeLeaderboardRankChanges(rows, settings);
    renderLeaderboardList(getElements().leaderboardList, rows, {
      changes,
      createEmpty: () => deps.emptyBlock?.(text("leaderboardEmpty")),
      hashStringToHue: deps.hashStringToHue,
      getInitials: deps.getInitials,
      formatScore: deps.formatScore,
      buildTrend: buildLeaderboardTrend,
      currentUserLabel: text("leaderboardYou"),
      scoreUnitLabel: text("leaderboardScoreUnit"),
      refreshIcons: deps.refreshIcons
    });
  }

  return {
    buildTrend: buildLeaderboardTrend,
    compareRows: compareLeaderboardRows,
    computeRankChanges: computeLeaderboardRankChanges,
    filterRows: filterLeaderboardRows,
    getMetricOptions,
    getRows,
    getRowsForSettings,
    getAllRows,
    getLocalRows,
    getScore,
    getMetricLabel,
    getScopeText,
    getSourceText,
    keepCurrentRow: keepCurrentLeaderboardRow,
    leaderboardSnapshotKey,
    makeRow,
    mergeRows,
    render,
    renderControls,
    renderRegion,
    renderScopeSummary,
    updateSettings
  };
}
