export function initDomainSliceImpl(shared, ctx) {
  const deps = { ...shared, ...ctx };
  const sliceRefs = ctx.__sliceRefs || {};
  let {
  CLOUD_SYNC_DEBOUNCE_MS,
  DEFAULT_CLOUD_API_ENDPOINT,
  DEFAULT_GRADUATION_TERM,
  DEFAULT_LLM_ENDPOINT,
  DEFAULT_LLM_MODEL,
  GOOGLE_LOGIN_ENABLED,
  JOBS_AUTO_REFRESH_MS,
  JOBS_RETRY_MS,
  LEADERBOARD_CLOUD_REFRESH_MS,
  LLM_CONFIG_KEY,
  LLM_DEFAULTS_VERSION,
  LLM_MODEL_OPTIONS,
  NEWS_AUTO_REFRESH_MS,
  NEWS_RETRY_MS,
  NEWS_TOPIC_QUERY_PACKS,
  PROBLEM_PAGE_SIZE,
  PROBLEM_SEARCH_DEBOUNCE_MS,
  addLocalAccount,
  addLocalAccountValue,
  appState,
  appendInterviewMessage,
  applyCloudSessionConfig,
  applyCloudSessionConfigValue,
  applyGoogleAccount,
  applyGoogleAccountValue,
  applyLanguage,
  applySidebarState,
  args,
  authStateRuntime,
  buildCloudSessionCommunity,
  buildCloudSessionCommunityValue,
  buildCloudSessionState,
  buildCloudSessionStateValue,
  buildGoogleAccountFromPayload,
  buildGoogleAccountFromPayloadValue,
  buildLocalAccount,
  buildLocalAccountValue,
  canUseCloud,
  catalog,
  clampNumber,
  clearProblemLookupCaches,
  cloudApi,
  cloudStatePayload,
  cloudSyncController,
  companies,
  companyDefs,
  companyTierFilterState,
  consumeIncomingCapture,
  createAccountAuthBundle,
  createAppProblemControllerBundles,
  createAppSkillsControllerBundle,
  createBaseState,
  createContentControllerBundles,
  createHeroCoachController,
  createLibrarySearchBundles,
  createLlmConfigRuntime,
  createOverviewActivityBundle,
  createPokerRuntime,
  createProblemNavigationBundle,
  createProblemSearchRecord,
  createSyncSettingsBundle,
  defaultEndpoint,
  defaultModel,
  defaultsVersion,
  documentRef,
  domainStores,
  elements,
  els,
  emptyBlock,
  escapeHtml,
  flushCloudSync,
  focusNewsItem,
  formatCategoryLabel,
  formatDate,
  formatNewsDate,
  formatProblemTag,
  get,
  getAuthErrorMessage,
  getAuthReadyMessage,
  getCatalogProblems,
  getCloudApiBase,
  getCurrentUser,
  getGoogleClientId,
  getGoogleClientIdValue,
  getInitials,
  getLanguage,
  getLeaderboardRows,
  getLeetcodeHotCompletionStats,
  getLlmRequestHeaders,
  getLocale,
  getModuleLifecycle,
  getPage,
  getProblemBrowserMatches,
  getProblemCompletionCount,
  getProblemDisplayTitle,
  getProblemExcerptText,
  getProblemMediaMarkdown,
  getProblemPage,
  getProblemPersonalState,
  getProblemSearchOptions,
  getProblemSocial,
  getSkillPracticeStats,
  getSkillScore,
  getState,
  getUserCatalogProblems,
  getVerificationErrorMessage,
  hashPassword,
  heroCoachController,
  hideProblemPagination,
  importLeetcodeHotItems,
  inferSource,
  invalidateLeaderboardCloud,
  isCatalogProblem,
  isDisabledProblemId,
  isDisabledProblemSource,
  isHiddenProblemTag,
  isLeetcodeHotExpanded,
  jobsRuntime,
  leaderboard,
  leaderboardCloudController,
  leetcodeHot100,
  leetcodeHotController,
  libraryCatalog,
  libraryFilterState,
  loadState,
  loadStateForUser,
  loading,
  localDateKey,
  localStatePayload,
  makeId,
  mergeCloudCommunity,
  mergeCloudState,
  mergeProblemStates,
  mergeProblems,
  migrateLegacyState,
  model,
  modelOptions,
  newsFilterState,
  newsProvider,
  newsRuntime,
  normalizeAccount,
  normalizeCategory,
  normalizeCloudLeaderboardRows,
  normalizeCommunityStore,
  normalizeCountry,
  normalizeCourses,
  normalizeEmail,
  normalizeGameRecords,
  normalizeGraduationTerm,
  normalizeJobs,
  normalizeLanguage,
  normalizeLeaderboardSettings,
  normalizeLeetcodeHot100Done,
  normalizeModel,
  normalizeNewsSkills,
  normalizeNewsTopicFilter,
  normalizePrepPlan,
  normalizeRegionForCountry,
  normalizeState,
  normalizeStudyPlan,
  openProblemFromSearch,
  page,
  pageSize,
  parseJwt,
  parseJwtValue,
  parseTags,
  problemBrowserController,
  problemCompanyCache,
  problemDetailState,
  problemPaginationController,
  problemSearchRecordCache,
  problemSocialState,
  problemTagLabels,
  problemsRuntime,
  pruneProblemCatalog,
  quantCompanyDefs,
  queueCloudSync,
  refreshIcons,
  refreshProblemCatalog,
  refreshProblemSocial,
  renderAll,
  renderInterviewSetup,
  renderLeaderboard,
  renderLeaderboardLoading,
  renderLeaderboardScopeSummary,
  renderLeaderboardSettled,
  renderLeetcodeHot100,
  renderProblemPagination,
  renderProblems,
  renderRegionRank,
  renderRichText,
  renderSummary,
  renderTodoDock,
  requestProblemSocial,
  requestProblemSocialValue,
  requestResumeReviewValue,
  resetProblemPagination,
  restoreRouteModule,
  safeExternalUrl,
  sampleEntries,
  save,
  saveAppPrefs,
  saveAuth,
  saveCloudConfig,
  saveCommunity,
  saveState,
  scheduleMathTypeset,
  scoreProblemSearchRecord,
  searchDebounceMs,
  seedJobs,
  selectProblemForInterview,
  setCurrentUserId,
  setCurrentUserIdValue,
  setGoogleClientId,
  setGoogleClientIdValue,
  setHover,
  setLeetcodeHotExpanded,
  setPage,
  setProblemPage,
  setRadarHover,
  showAuthMessage,
  skillDefs,
  sortNews,
  stableNewsId,
  stableProblemId,
  state,
  storageKey,
  switchModule,
  syncAuthStore,
  syncLanguageToUrl,
  t,
  toggleProblemCompleted,
  toggleProblemSaved,
  upsertLocalAccount,
  userState,
  userStateKey,
  value,
  windowRef,
  wrapAuthMutations,
  writeUserState,
  writeUserStateValue
  } = deps;





  const pokerRuntime = createPokerRuntime();
  const pokerState = pokerRuntime.state;
  const llmConfigRuntime = createLlmConfigRuntime({
    storageKey: LLM_CONFIG_KEY,
    defaultEndpoint: DEFAULT_LLM_ENDPOINT,
    defaultModel: DEFAULT_LLM_MODEL,
    defaultsVersion: LLM_DEFAULTS_VERSION,
    modelOptions: LLM_MODEL_OPTIONS
  });
  const saveLlmConfigToStorage = () => llmConfigRuntime.save();
  const getLlmConfig = () => llmConfigRuntime.get();
  const normalizeLlmModel = (model) => llmConfigRuntime.normalizeModel(model);
  sliceRefs.getLlmConfig = getLlmConfig;
  sliceRefs.normalizeLlmModel = normalizeLlmModel;
  const accountAuthBundle = createAccountAuthBundle({
    addLocalAccount: addLocalAccountValue,
    appState,
    applyCloudSessionConfig: applyCloudSessionConfigValue,
    applyGoogleAccount: applyGoogleAccountValue,
    applyLanguage,
    applySidebarState,
    buildCloudSessionCommunity: buildCloudSessionCommunityValue,
    buildCloudSessionState: buildCloudSessionStateValue,
    buildGoogleAccountFromPayload: buildGoogleAccountFromPayloadValue,
    buildLocalAccount: buildLocalAccountValue,
    clearProblemLookupCaches,
    cloudApi,
    cloudStatePayload,
    consumeIncomingCapture,
    createBaseState,
    DEFAULT_GRADUATION_TERM,
    documentRef: document,
    elements: els,
    getAuthErrorMessage,
    getAuthReadyMessage,
    getCurrentUser,
    getGoogleClientId: getGoogleClientIdValue,
    getModuleLifecycle,
    getUserCatalogProblems,
    getVerificationErrorMessage,
    GOOGLE_LOGIN_ENABLED,
    hashPassword,
    invalidateLeaderboardCloud,
    loadState,
    loadStateForUser,
    localStatePayload,
    makeId,
    mergeCloudCommunity,
    mergeCloudState,
    mergeProblemStates,
    migrateLegacyState,
    normalizeAccount,
    normalizeCommunityStore,
    normalizeCountry,
    normalizeEmail,
    normalizeGraduationTerm,
    normalizeLeaderboardSettings,
    normalizeRegionForCountry,
    normalizeState,
    parseJwt: parseJwtValue,
    problemSocialState,
    pruneProblemCatalog,
    queueCloudSync,
    refreshProblemCatalog,
    refreshProblemSocial,
    renderAll,
    restoreRouteModule,
    saveAuth,
    saveCloudConfig,
    saveCommunity,
    saveState,
    setCurrentUserId: setCurrentUserIdValue,
    setGoogleClientId: setGoogleClientIdValue,
    showAuthMessage,
    switchModule,
    t,
    upsertLocalAccount,
    userState,
    userStateKey,
    windowRef: window,
    writeUserState: writeUserStateValue
  });
  const renderSession = accountAuthBundle.renderSession;
  const renderUserChip = accountAuthBundle.renderUserChip;
  const switchAuthTab = accountAuthBundle.switchAuthTab;
  const sendRegisterVerificationCode = accountAuthBundle.sendRegisterVerificationCode;
  const resetEmailAuthFlow = accountAuthBundle.resetEmailAuthFlow;
  const authMutations = wrapAuthMutations({
    loginLocal: accountAuthBundle.loginLocal,
    logout: accountAuthBundle.logout,
    registerLocal: accountAuthBundle.registerLocal,
    saveAccount: accountAuthBundle.saveAccount,
    saveAuth: authStateRuntime.save,
    submitEmailAuth: accountAuthBundle.submitEmailAuth,
    upsertLocalAccount: authStateRuntime.upsertLocalAccount
  }, domainStores.syncAuthStore);
  const loginLocal = authMutations.loginLocal;
  const logout = authMutations.logout;
  const registerLocal = authMutations.registerLocal;
  const saveAccount = authMutations.saveAccount;
  const submitEmailAuth = authMutations.submitEmailAuth;
  authStateRuntime.save = authMutations.saveAuth;
  authStateRuntime.upsertLocalAccount = authMutations.upsertLocalAccount;
  const saveGoogleClientId = accountAuthBundle.saveGoogleClientId;
  const renderGoogleClientInput = accountAuthBundle.renderGoogleClientInput;
  const renderGooglePlaceholder = accountAuthBundle.renderGooglePlaceholder;
  sliceRefs.renderGooglePlaceholder = renderGooglePlaceholder;
  const initGoogleLogin = accountAuthBundle.initGoogleLogin;
  const problemNavigationBundle = createProblemNavigationBundle({
    canUseCloud,
    cloudApi,
    companyDefs: quantCompanyDefs,
    documentRef: document,
    elements: els,
    emptyBlock,
    formatCategoryLabel,
    formatDate,
    formatProblemTag,
    getCatalogProblems,
    getLanguage,
    getLocale,
    getProblemBrowserMatches,
    getProblemCompletionCount,
    getProblemDisplayTitle,
    getProblemExcerptText,
    getProblemMediaMarkdown,
    getProblemPersonalState,
    getProblemSocial,
    getState: () => userState.value,
    isCatalogProblem,
    normalizeCategory,
    normalizeJobs,
    parseTags,
    problemCompanyCache,
    problemDetailState,
    problemSocialState,
    refreshIcons,
    refreshProblemSocial,
    renderProblems,
    renderRichText,
    resetProblemPagination,
    scheduleMathTypeset,
    selectProblemForInterview,
    switchModule,
    t,
    toggleProblemCompleted,
    toggleProblemSaved,
    windowRef: window
  });
  const companyKey = problemNavigationBundle.companyKey;
  const getCompanyAliases = problemNavigationBundle.getCompanyAliases;
  const getCompanyDef = problemNavigationBundle.getCompanyDef;
  const getProblemCompanies = problemNavigationBundle.getProblemCompanies;
  const problemMatchesCompany = problemNavigationBundle.problemMatchesCompany;
  const getCompanyProblemStats = problemNavigationBundle.getCompanyProblemStats;
  const companyTierWeight = problemNavigationBundle.companyTierWeight;
  const getCompanyJobs = problemNavigationBundle.getCompanyJobs;
  const getProblemFilterState = problemNavigationBundle.getProblemFilterState;
  const getProblemFilterValue = problemNavigationBundle.getProblemFilterValue;
  const setProblemFilterState = problemNavigationBundle.setProblemFilterState;
  const applyProblemFilterAction = problemNavigationBundle.applyProblemFilterAction;
  const applyProblemNavigationFilters = problemNavigationBundle.applyProblemNavigationFilters;
  const showCompanyProblems = problemNavigationBundle.showCompanyProblems;
  const problemMatchesTheme = problemNavigationBundle.problemMatchesTheme;
  const problemMatchesDifficulty = problemNavigationBundle.problemMatchesDifficulty;
  const problemMatchesSource = problemNavigationBundle.problemMatchesSource;
  const getProblemNavigationSequence = problemNavigationBundle.getProblemNavigationSequence;
  const getProblemDetailNavigation = problemNavigationBundle.getProblemDetailNavigation;
  const createProblemDetailNavigation = problemNavigationBundle.createProblemDetailNavigation;
  const resetProblemDetailReveals = problemNavigationBundle.resetProblemDetailReveals;
  const isProblemDetailBlockRevealed = problemNavigationBundle.isProblemDetailBlockRevealed;
  const revealProblemDetailBlock = problemNavigationBundle.revealProblemDetailBlock;
  const openProblemDetail = problemNavigationBundle.openProblemDetail;
  const returnToProblemList = problemNavigationBundle.returnToProblemList;
  const renderProblemDetail = problemNavigationBundle.renderProblemDetail;
  const toggleProblemLike = problemNavigationBundle.toggleProblemLike;
  const postProblemComment = problemNavigationBundle.postProblemComment;
  const deleteProblemComment = problemNavigationBundle.deleteProblemComment;
  heroCoachController = createHeroCoachController({
    documentRef: document,
    windowRef: window,
    elements: els
  });
  sliceRefs.heroCoachController = heroCoachController;
  const librarySearchBundles = createLibrarySearchBundles({
    applyProblemNavigationFilters,
    canUseCloud,
    catalog: libraryCatalog,
    cloudApi,
    companyTierFilterState,
    createProblemSearchRecord,
    documentRef: document,
    elements: els,
    escapeHtml,
    focusNewsItem,
    formatCategoryLabel,
    formatNewsDate,
    getCloudApiBase,
    getCompanyProblemStats,
    getLanguage,
    getProblemSearchOptions,
    inferSource,
    isCatalogProblem,
    libraryFilterState,
    normalizeCourses,
    normalizeJobs,
    openProblemFromSearch,
    quantCompanyDefs,
    refreshIcons,
    renderProblems,
    resetProblemPagination,
    scoreProblemSearchRecord,
    setRadarHover: (...args) => skillRadarRuntime.setHover(...args),
    skillDefs,
    sortNews,
    switchModule,
    t,
    userState,
    windowRef: window
  });
  const openLibraryReader = librarySearchBundles.openLibraryReader;
  const closeLibraryReader = librarySearchBundles.closeLibraryReader;
  const getLibraryEntries = librarySearchBundles.getLibraryEntries;
  const getLibraryTitle = librarySearchBundles.getLibraryTitle;
  const getLibrarySubtitle = librarySearchBundles.getLibrarySubtitle;
  const getLibrarySearchText = librarySearchBundles.getLibrarySearchText;
  const getVisibleLibraryEntries = librarySearchBundles.getVisibleLibraryEntries;
  const getLibrarySourceLabel = librarySearchBundles.getLibrarySourceLabel;
  const openLibraryPractice = librarySearchBundles.openLibraryPractice;
  const renderGlobalSearchResults = librarySearchBundles.renderGlobalSearchResults;
  const scheduleGlobalSearchResults = librarySearchBundles.scheduleGlobalSearchResults;
  const hideGlobalSearchResults = librarySearchBundles.hideGlobalSearchResults;
  const clearGlobalSearch = librarySearchBundles.clearGlobalSearch;
  const handleGlobalSearchKeydown = librarySearchBundles.handleGlobalSearchKeydown;
  const setGlobalSearchComposing = librarySearchBundles.setGlobalSearchComposing;
  const overviewActivityBundle = createOverviewActivityBundle({
    appState,
    DEFAULT_GRADUATION_TERM,
    documentRef: document,
    elements: els,
    formatCategoryLabel,
    getLanguage,
    getLocale,
    getSkillScore,
    localDateKey,
    makeId,
    normalizeLeetcodeHot100Done,
    normalizePrepPlan,
    normalizeStudyPlan,
    refreshIcons,
    renderTodoDock,
    saveState,
    switchModule,
    t,
    userState,
    windowRef: window
  });
  let {
    buildLegacyTodayStudyPlan,
    buildMonthlyContributionHeatmap,
    buildRecentContributionHeatmap,
    buildTodayStudyPlan,
    generateTodayStudyPlan,
    getContributionSeries,
    getContributionStatsByDay,
    getDailyXpSeries,
    renderTodayPlan
  } = overviewActivityBundle;
  sliceRefs.buildTodayStudyPlan = buildTodayStudyPlan;
  sliceRefs.generateTodayStudyPlan = generateTodayStudyPlan;
  sliceRefs.renderTodayPlan = renderTodayPlan;
  const syncSettingsBundle = createSyncSettingsBundle({
    appState,
    appendInterviewMessage,
    canUseCloud,
    CLOUD_SYNC_DEBOUNCE_MS,
    cloudApi,
    cloudStatePayload,
    DEFAULT_CLOUD_API_ENDPOINT,
    DEFAULT_LLM_ENDPOINT,
    elements: els,
    flushCloudSync,
    formatDate,
    getCurrentUser,
    getUserCatalogProblems,
    invalidateLeaderboardCloud,
    LEADERBOARD_CLOUD_REFRESH_MS,
    llmConfigRuntime,
    normalizeCloudLeaderboardRows,
    normalizeCountry,
    normalizeLanguage,
    normalizeLeaderboardSettings,
    normalizeLlmModel,
    normalizeRegionForCountry,
    queueCloudSync,
    renderAll,
    renderGoogleClientInput,
    renderLeaderboardLoading: () => sliceRefs.renderLeaderboardScopeSummary?.(
      normalizeLeaderboardSettings(userState.value.leaderboard),
      sliceRefs.getLeaderboardRows?.(),
      "loading"
    ),
    renderLeaderboardSettled: () => {
      sliceRefs.renderLeaderboard?.();
      sliceRefs.renderRegionRank?.();
      refreshIcons();
    },
    saveAppPrefs,
    saveAuth,
    saveCloudConfig,
    saveLlmConfigToStorage,
    saveState,
    switchModule,
    syncStores: () => domainStores.syncAll(),
    syncLanguageToUrl,
    t,
    userState,
    windowRef: window
  });
  leaderboardCloudController = syncSettingsBundle.leaderboardCloudController;
  sliceRefs.leaderboardCloudController = leaderboardCloudController;
  cloudSyncController = syncSettingsBundle.cloudSyncController;
  sliceRefs.cloudSyncController = cloudSyncController;
  const saveLlmConfig = syncSettingsBundle.saveLlmConfig;
  const updateLlmConfigFromControls = syncSettingsBundle.updateLlmConfigFromControls;
  sliceRefs.updateLlmConfigFromControls = updateLlmConfigFromControls;
  const syncCloudNow = syncSettingsBundle.syncCloudNow;
  const renderCloudStatus = syncSettingsBundle.renderCloudStatus;
  const getCloudStatusText = syncSettingsBundle.getCloudStatusText;
  const saveSettings = syncSettingsBundle.saveSettings;
  const saveSettingsFromValues = syncSettingsBundle.saveSettingsFromValues;
  const skillsControllerBundle = createAppSkillsControllerBundle({
    clampNumber,
    documentRef: document,
    elements: els,
    escapeHtml,
    getLlmConfig,
    getLlmRequestHeaders,
    getSkillPracticeStats,
    getSkillScore,
    makeId,
    normalizeCategory,
    normalizeGameRecords,
    normalizeLlmModel,
    renderAll,
    renderSummary,
    sampleEntries,
    saveState,
    skillDefs,
    t,
    userState,
    windowRef: window
  });
  let {
    addEntry,
    fillSampleEntry,
    updatePreview,
    scheduleClassificationPreview,
    undoLatestEntry,
    recordGameResult,
    skillRadarRuntime
  } = skillsControllerBundle;
  sliceRefs.updatePreview = updatePreview;
  const contentControllerBundles = createContentControllerBundles({
    appState,
    DEFAULT_GRADUATION_TERM,
    DEFAULT_LLM_ENDPOINT,
    documentRef: document,
    elements: els,
    getLanguage,
    getLlmConfig,
    getLlmRequestHeaders,
    getModuleLifecycle,
    inferSource,
    JOBS_AUTO_REFRESH_MS,
    JOBS_RETRY_MS,
    llmConfigRuntime,
    makeId,
    NEWS_AUTO_REFRESH_MS,
    NEWS_RETRY_MS,
    NEWS_TOPIC_QUERY_PACKS,
    newsFilterState,
    normalizeJobs,
    normalizeLlmModel,
    normalizeNewsSkills,
    normalizeNewsTopicFilter,
    parseTags,
    refreshIcons,
    renderAll,
    requestResumeReviewValue,
    safeExternalUrl,
    saveLlmConfigToStorage,
    saveState,
    seedJobs,
    skillDefs,
    stableNewsId,
    stableProblemId,
    switchModule,
    t,
    userState,
    windowRef: window
  });
  const handleAccountResumeFile = contentControllerBundles.handleAccountResumeFile;
  const renderAccountResumeMeta = contentControllerBundles.renderAccountResumeMeta;
  const requestResumeReviewFromApi = contentControllerBundles.requestResumeReviewFromApi;
  const localResumeReview = contentControllerBundles.localResumeReview;
  jobsRuntime = contentControllerBundles.jobsRuntime;
  sliceRefs.jobsRuntime = jobsRuntime;
  newsProvider = contentControllerBundles.newsProvider;
  sliceRefs.newsProvider = newsProvider;
  newsRuntime = contentControllerBundles.newsRuntime;
  sliceRefs.newsRuntime = newsRuntime;
  const appProblemControllerBundles = createAppProblemControllerBundles({
    applyProblemNavigationFilters,
    clearProblemLookupCaches,
    cloudApi,
    companies: quantCompanyDefs,
    companyTierWeight,
    documentRef: document,
    elements: els,
    emptyBlock,
    formatCategoryLabel,
    formatProblemTag,
    getCatalogProblems,
    getCompanyAliases,
    getCompanyProblemStats,
    getInitials,
    getLanguage,
    getLeetcodeHotCompletionStats,
    getLibrarySourceLabel,
    getLocale,
    getModuleLifecycle,
    getProblemBrowserMatches,
    getProblemCompanies,
    getProblemCompletionCount,
    getProblemDisplayTitle,
    getProblemExcerptText,
    getProblemFilterState,
    getProblemFilterValue,
    getProblemPersonalState,
    getProblemSocial,
    getUserCatalogProblems,
    hideProblemPagination,
    importLeetcodeHotItems: leetcodeHot100,
    isCatalogProblem,
    isDisabledProblemId,
    isDisabledProblemSource,
    isHiddenProblemTag,
    isLeetcodeHotExpanded,
    mergeProblems,
    normalizeCategory,
    normalizeLeetcodeHot100Done,
    openProblemDetail,
    pageSize: PROBLEM_PAGE_SIZE,
    problemDetailState,
    problemMatchesCompany,
    problemMatchesDifficulty,
    problemMatchesSource,
    problemMatchesTheme,
    problemSearchRecordCache,
    problemSocialState,
    problemTagLabels,
    refreshIcons,
    renderInterviewSetup,
    renderLeetcodeHot100,
    renderProblemDetail,
    renderProblemPagination,
    renderProblems,
    renderSummary,
    requestProblemSocial: requestProblemSocialValue,
    resetProblemPagination,
    saveState,
    searchDebounceMs: PROBLEM_SEARCH_DEBOUNCE_MS,
    setLeetcodeHotExpanded,
    setProblemFilterState,
    getProblemPage: () => problemPaginationController.getPage(),
    setProblemPage: (page) => problemPaginationController.setPage(page),
    skillDefs,
    t,
    toggleProblemCompleted,
    toggleProblemSaved,
    userState,
    windowRef: window
  });
  problemBrowserController = appProblemControllerBundles.problemBrowserController;
  sliceRefs.problemBrowserController = problemBrowserController;
  leetcodeHotController = appProblemControllerBundles.leetcodeHotController;
  sliceRefs.leetcodeHotController = leetcodeHotController;
  problemsRuntime = appProblemControllerBundles.problemsRuntime;
  sliceRefs.problemsRuntime = problemsRuntime;
  const handleProblemSearchInput = appProblemControllerBundles.handleProblemSearchInput;
  const handleProblemSearchKeydown = appProblemControllerBundles.handleProblemSearchKeydown;
  const scheduleProblemSearchRender = appProblemControllerBundles.scheduleProblemSearchRender;
  const cancelProblemSearchRender = appProblemControllerBundles.cancelProblemSearchRender;
  let {
    getProblemThemeEntries,
    renderProblemThemeFilter,
    renderProblemDifficultyFilter,
    buildProblemProgressItems,
    renderProgressGroup,
    renderProblemCompletionDashboard,
    getProblemCollectionEntries,
    renderProblemCollectionGrid,
    handleProblemCollectionClick
  } = appProblemControllerBundles;
  return { accountAuthBundle, appProblemControllerBundles, applyProblemFilterAction, applyProblemNavigationFilters, authMutations, buildLegacyTodayStudyPlan, buildMonthlyContributionHeatmap, buildRecentContributionHeatmap, buildTodayStudyPlan, cancelProblemSearchRender, clearGlobalSearch, closeLibraryReader, cloudSyncController, companyKey, companyTierWeight, contentControllerBundles, createProblemDetailNavigation, deleteProblemComment, generateTodayStudyPlan, getCloudStatusText, getCompanyAliases, getCompanyDef, getCompanyJobs, getCompanyProblemStats, getContributionSeries, getContributionStatsByDay, getDailyXpSeries, getLibraryEntries, getLibrarySearchText, getLibrarySourceLabel, getLibrarySubtitle, getLibraryTitle, getLlmConfig, getProblemCompanies, getProblemDetailNavigation, getProblemFilterState, getProblemFilterValue, getProblemNavigationSequence, getVisibleLibraryEntries, handleAccountResumeFile, handleGlobalSearchKeydown, handleProblemSearchInput, handleProblemSearchKeydown, heroCoachController, hideGlobalSearchResults, initGoogleLogin, isProblemDetailBlockRevealed, jobsRuntime, leaderboardCloudController, leetcodeHotController, librarySearchBundles, llmConfigRuntime, localResumeReview, loginLocal, logout, newsProvider, newsRuntime, normalizeLlmModel, openLibraryPractice, openLibraryReader, openProblemDetail, overviewActivityBundle, pokerRuntime, pokerState, postProblemComment, problemBrowserController, problemMatchesCompany, problemMatchesDifficulty, problemMatchesSource, problemMatchesTheme, problemNavigationBundle, problemsRuntime, registerLocal, renderAccountResumeMeta, renderCloudStatus, renderGlobalSearchResults, renderGoogleClientInput, renderGooglePlaceholder, renderProblemDetail, renderSession, renderTodayPlan, renderUserChip, requestResumeReviewFromApi, resetEmailAuthFlow, resetProblemDetailReveals, returnToProblemList, revealProblemDetailBlock, saveAccount, saveGoogleClientId, saveLlmConfig, saveLlmConfigToStorage, saveSettings, saveSettingsFromValues, scheduleGlobalSearchResults, scheduleProblemSearchRender, sendRegisterVerificationCode, setGlobalSearchComposing, setProblemFilterState, showCompanyProblems, skillsControllerBundle, submitEmailAuth, switchAuthTab, syncCloudNow, syncSettingsBundle, toggleProblemLike, updateLlmConfigFromControls };

}
