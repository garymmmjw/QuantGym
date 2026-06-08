export function initOverviewSliceImpl(shared, ctx) {
  const deps = { ...shared, ...ctx };
  const sliceRefs = ctx.__sliceRefs || {};
  let {
  Tier,
  addEntry,
  addTodoTask,
  appState,
  bindAppElements,
  bindShellEvents,
  calculateQuantScore,
  canUseCloud,
  careers,
  clearGlobalSearch,
  closeTodoDock,
  cloudApi,
  company,
  createAppOverviewControllerBundle,
  createEmptyBlockView,
  createPokerControllerBundle,
  documentRef,
  elements,
  els,
  en,
  entryCount,
  escapeHtml,
  fillSampleEntry,
  firms,
  formatDate,
  formatNewsDate,
  formatNumber,
  formatScore,
  getCloudApiBase,
  getCountryLabel,
  getDefaultRegion,
  getInitials,
  getLanguage,
  getLocale,
  getModuleLifecycle,
  getNews,
  getQuantScore,
  getRank,
  getRegionLabel,
  getSkillScore,
  getStreak,
  getWeeklyXp,
  handleGlobalSearchKeydown,
  handleTodoDockClick,
  handleTodoDockEdit,
  handlers,
  hashStringToHue,
  hideGlobalSearchResults,
  leaderboardCloudController,
  loadPagePartialsView,
  loadStateForUser,
  loginLocal,
  logout,
  makeId,
  news,
  newsFacade,
  newsTickerTrack,
  normalizeAccount,
  normalizeCountry,
  normalizeLeaderboardSettings,
  normalizeRegionForCountry,
  normalizeSkills,
  openExternalUrl,
  options,
  overviewSummaryController,
  pokerState,
  questionCount,
  questions,
  randomInt,
  recordGameResult,
  refreshIconsView,
  refreshLeaderboardFromCloud,
  registerAppFeatureModules,
  registerLocal,
  renderCountryOptions,
  renderGlobalSearchResults,
  renderNewsTickerView,
  renderRegionOptions,
  safeExternalUrl,
  saveGoogleClientId,
  saveSettings,
  saveState,
  scheduleClassificationPreview,
  scheduleGlobalSearchResults,
  sendRegisterVerificationCode,
  setGlobalSearchComposing,
  setLanguage,
  setStreakPanelOpen,
  skillDefs,
  summaryController,
  switchAuthTab,
  switchModule,
  t,
  tagged,
  text,
  tier,
  toggleSidebarNav,
  toggleStreakPanel,
  toggleTodoDock,
  topics,
  track,
  type,
  updateCheckInPill,
  updatePreview,
  updateUnreadMessageBadge,
  userState,
  value,
  windowRef
  } = deps;





  async function loadPagePartials() {
    return loadPagePartialsView(document);
  }

  function bindElements() {
    bindAppElements(els, document);
  }

  function registerFeatureModules() {
    registerAppFeatureModules();
  }

  function bindEvents() {
    bindShellEvents({
      documentRef: document,
      elements: els,
      handlers: {
        clearGlobalSearch,
        switchModule,
        toggleSidebarNav,
        switchAuthTab,
        loginLocal,
        registerLocal,
        sendRegisterVerificationCode,
        saveGoogleClientId,
        setLanguage,
        logout,
        toggleStreakPanel,
        setStreakPanelOpen,
        setGlobalSearchComposing,
        scheduleGlobalSearchResults,
        renderGlobalSearchResults,
        handleGlobalSearchKeydown,
        hideGlobalSearchResults,
        addEntry,
        scheduleClassificationPreview,
        updatePreview,
        fillSampleEntry,
        toggleTodoDock,
        closeTodoDock,
        handleTodoDockClick,
        handleTodoDockEdit,
        addTodoTask
      }
    });
  }

  const overviewControllerBundle = createAppOverviewControllerBundle({
    appState,
    calculateQuantScore,
    elements: els,
    emptyBlock,
    formatScore,
    getCountryLabel,
    getDefaultRegion,
    getInitials,
    getLanguage,
    getLocale,
    getQuantScore,
    getRank,
    getRegionLabel,
    getSkillScore,
    getStreak,
    getWeeklyXp,
    hashStringToHue,
    leaderboardCloudController,
    loadStateForUser,
    normalizeAccount,
    normalizeCountry,
    normalizeLeaderboardSettings,
    normalizeRegionForCountry,
    normalizeSkills,
    refreshIcons,
    refreshLeaderboardFromCloud,
    renderCountryOptions,
    renderRegionOptions,
    saveState,
    skillDefs,
    t,
    updateCheckInPill,
    updateUnreadMessageBadge,
    userState
  });
overviewSummaryController = overviewControllerBundle.summaryController;
sliceRefs.overviewSummaryController = overviewSummaryController;
  let {
    buildLeaderboardTrend,
    compareLeaderboardRows,
    computeLeaderboardRankChanges,
    filterLeaderboardRows,
    getLeaderboardMetricOptions,
    getLeaderboardRows,
    getLeaderboardRowsForSettings,
    getAllLeaderboardRows,
    getLocalLeaderboardRows,
    getLeaderboardScore,
    getLeaderboardMetricLabel,
    getLeaderboardScopeText,
    getLeaderboardSourceText,
    keepCurrentLeaderboardRow,
    leaderboardSnapshotKey,
    makeLeaderboardRow,
    mergeLeaderboardRows,
    renderLeaderboard,
    renderLeaderboardControls,
    renderRegionRank,
    renderLeaderboardScopeSummary,
    updateLeaderboardSettings
  } = overviewControllerBundle;
  sliceRefs.getLeaderboardRows = getLeaderboardRows;
  sliceRefs.renderLeaderboard = renderLeaderboard;
  sliceRefs.renderRegionRank = renderRegionRank;
  sliceRefs.renderLeaderboardScopeSummary = renderLeaderboardScopeSummary;

  const pokerControllerBundle = createPokerControllerBundle({
    appState,
    canUseCloud,
    cloudApi,
    documentRef: document,
    elements: els,
    escapeHtml,
    formatNumber,
    getCloudApiBase,
    getModuleLifecycle,
    makeId,
    pokerState,
    randomInt,
    recordGameResult,
    routingMode: options.routingMode,
    refreshIcons,
    windowRef: window
  });
  let {
    handlePokerDocumentClick,
    handlePokerDocumentSubmit,
    handlePokerPreflopMatrixClick,
    loadInitialPokerGame,
    makePokerGameRound,
    renderPokerGame,
    renderPokerPreflopChart,
    resetPokerTournament
  } = pokerControllerBundle;

  function emptyBlock(text) {
    return createEmptyBlockView(text, { documentRef: document });
  }

  function refreshIcons() {
    refreshIconsView({ windowRef: window });
  }

  function rebindElements() {
    bindElements(els, document);
  }

  const saveSettingsFromValues = deps.saveSettingsFromValues || saveSettings;

  function formatCompanySummary(entryCount, questionCount) {
    return getLanguage() === "en"
      ? `${entryCount} firms · ${questionCount} tagged questions · tier, topics, careers`
      : `${entryCount} 家公司 · ${questionCount} 道标注题 · tier、考点和官网入口`;
  }

  function formatCompanyMeta(company) {
    return `Tier ${company.tier} · ${company.type}`;
  }

  const renderNewsTickerForOverview = () => renderNewsTickerView({
    track: els.newsTickerTrack,
    items: userState.value.news || [],
    isEnglish: getLanguage() === "en",
    emptyLabel: t("newsTickerEmpty") || "暂无新闻",
    onSelect: (id) => {
      const targetId = String(id || "").trim();
      if (!targetId) return;
      const provider = sliceRefs.newsProvider;
      if (provider?.focusItem) {
        provider.focusItem(targetId, true);
        return;
      }
      windowRef.__quantgymPendingNewsFocusId = targetId;
      switchModule("news");
      const FocusEvent = windowRef.CustomEvent || CustomEvent;
      const dispatchFocus = () => windowRef.dispatchEvent?.(new FocusEvent("quantgym:news-focus", {
        detail: { id: targetId }
      }));
      windowRef.setTimeout?.(dispatchFocus, 180);
      windowRef.setTimeout?.(dispatchFocus, 700);
      windowRef.setTimeout?.(dispatchFocus, 1400);
    }
  });
  return {
    bindElements,
    bindEvents,
    buildLeaderboardTrend,
    compareLeaderboardRows,
    computeLeaderboardRankChanges,
    emptyBlock,
    filterLeaderboardRows,
    formatCompanyMeta,
    formatCompanySummary,
    getAllLeaderboardRows,
    getLeaderboardMetricLabel,
    getLeaderboardMetricOptions,
    getLeaderboardRows,
    getLeaderboardRowsForSettings,
    getLeaderboardScopeText,
    getLeaderboardScore,
    getLeaderboardSourceText,
    getLocalLeaderboardRows,
    keepCurrentLeaderboardRow,
    leaderboardSnapshotKey,
    makeLeaderboardRow,
    mergeLeaderboardRows,
    overviewControllerBundle,
    overviewSummaryController,
    pokerControllerBundle,
    ...pokerControllerBundle,
    rebindElements,
    refreshIcons,
    registerFeatureModules,
    renderLeaderboard,
    renderLeaderboardControls,
    renderLeaderboardScopeSummary,
    renderNewsTickerForOverview,
    renderRegionRank,
    saveSettingsFromValues
  };

}
