export function initRuntimeSliceImpl(shared, ctx = {}) {
  const deps = { ...shared, ...ctx };
  const sliceRefs = ctx.__sliceRefs || {};
  let {
  APP_PREFS_KEY,
  AUTH_KEY,
  CLOUD_CONFIG_KEY,
  CLOUD_SYNC_DEBOUNCE_MS,
  COMMUNITY_KEY,
  DEFAULT_CLOUD_API_ENDPOINT,
  DEFAULT_GOOGLE_CLIENT_ID,
  DEFAULT_LANGUAGE,
  GOOGLE_LOGIN_ENABLED,
  NEWS_SOURCE_FILTERS,
  NEWS_TOPIC_QUERY_PACKS,
  SCORE_XP_PER_POINT,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  USER_STATE_PREFIX,
  addEventListener,
  all,
  appPrefs,
  applyLanguage,
  applySidebarState,
  args,
  auth,
  canUse,
  catalogProblems,
  clampNumber,
  clearForUser,
  clearProblemLookupCaches,
  clearUserState,
  clearUserStateValue,
  cloudConfig,
  community,
  companyDefs,
  createAccountDataAdapter,
  createAppRuntime,
  createAuthMessageAdapter,
  createAuthStateRuntime,
  createBackupController,
  createCloudRuntime,
  createCloudSyncFacade,
  createCommunityFilterState,
  createCommunityRuntime,
  createCompaniesDataAdapter,
  createCompanyTierFilterState,
  createCoursesDataAdapter,
  createDomainStores,
  createLibraryFilterState,
  createMathTypesetScheduler,
  createMessageSelectionState,
  createNewsDataAdapter,
  createNewsFacade,
  createNewsFilterState,
  createPreferencesRuntime,
  createProblemDetailState,
  createProblemProvider,
  createProblemProviderFacade,
  createProblemSocialState,
  createSkillsMetricsProvider,
  createStateDataRuntime,
  createUserStateRuntime,
  currentUser,
  dedupeKey,
  defaultEndpoint,
  defaultGoogleClientId,
  defaultLanguage,
  delay,
  disabledBookNames,
  disabledProblemBookNames,
  disabledProblemSources,
  disabledSources,
  email,
  exerciseTitleOverrides,
  fallbackLanguage,
  flush,
  getActivityHooks,
  getApiBase,
  getAuth,
  getConfig,
  getController,
  getPersonalState,
  getPrefs,
  getProblemPersonalState,
  getProblemSocialValue,
  getProtocol,
  getProvider,
  getRequestHeaders,
  getRuntimeCatalogProblems,
  getRuntime,
  getSocial,
  getState,
  getStore,
  googleLoginEnabled,
  hashPasswordValue,
  i18n,
  id,
  inferSource,
  interview,
  isArray,
  isDisabledProblemId,
  isSafeRichMediaUrlValue,
  isSocialNewsTypeValue,
  language,
  latestIsoValue,
  leetcodeHot100,
  legacyKey,
  load,
  loadConfig,
  loadCurrent,
  loadForUser,
  loadUserState,
  loadUserStateValue,
  localDateKey,
  makeId,
  manual,
  markActivity,
  matchesKeys,
  merge,
  mergeCloud,
  mergeDuplicate,
  migrateLegacy,
  migrateLegacyStateValue,
  newsMatchesSourceFilterValue,
  newsMatchesTopicValue,
  newsRuntime,
  normalizeCloudLeaderboardRowsValue,
  normalizeExperience,
  normalizeNetworkContact,
  normalizeNewsSourceFilterValue,
  normalizeNewsSourceTypeValue,
  normalizeNewsTopicFilterValue,
  normalizeStore,
  now,
  nowIso,
  once,
  parseTags,
  password,
  persistActivity,
  prefs,
  problemId,
  problemTagLabels,
  protocol,
  quantCompanyDefs,
  quantLibraryCatalog,
  quantgym,
  queue,
  queueCelebration,
  renderAll,
  request,
  resume,
  rows,
  safeExternalUrl,
  save,
  saveConfig,
  scope,
  scoreXpPerPoint,
  scrollRestoration,
  scrollTo,
  seedCourses,
  seedJobs,
  seedNews,
  serializeState,
  session,
  setCurrentUser,
  setPrefs,
  setState,
  skillDefs,
  sourceFilters,
  stableCourseId,
  stableId,
  stableNewsId,
  stableProblemId,
  state,
  storageKey,
  supportedLanguages,
  syncAppStore,
  syncPreferencesStore,
  syncUserStateStore,
  tagLabels,
  toISOString,
  toggleSidebar,
  topicPacks,
  user,
  userId,
  userStateKeyValue,
  v1,
  v2,
  value,
  windowRef,
  wrapUserStateMutations,
  writeUserState,
  writeUserStateValue,
  zh
  } = deps;





  const runtimeWindow = globalThis.window || {};
  const runtimeLibraryCatalog = globalThis.quantLibraryCatalog || runtimeWindow.quantLibraryCatalog;
  const libraryCatalog = Array.isArray(runtimeLibraryCatalog) ? runtimeLibraryCatalog : [];
  const normalizeNewsTopicFilter = (value) => normalizeNewsTopicFilterValue(value, NEWS_TOPIC_QUERY_PACKS);
  const normalizeNewsSourceFilter = (value) => normalizeNewsSourceFilterValue(value, NEWS_SOURCE_FILTERS);
  const newsMatchesTopic = newsMatchesTopicValue;
  const newsMatchesSourceFilter = newsMatchesSourceFilterValue;
  const normalizeNewsSourceType = normalizeNewsSourceTypeValue;
  const isSocialNewsType = isSocialNewsTypeValue;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("load", () => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
    window.setTimeout(() => window.scrollTo(0, 0), 80);
  }, { once: true });

  let problemProvider = null;
  const problemProviderFacade = createProblemProviderFacade({
    getProvider: () => problemProvider,
    getLanguage: () => getLanguage()
  });
  let {
    getDataDeps: getProblemDataDeps,
    getUserCatalogProblems,
    mergeProblems,
    normalizeLeetcodeHot100Done,
    normalizeProblemState,
    mergeProblemStates,
    problemStatesFromFavorites,
    getCatalogProblems,
    isProblemCompleted,
    getProblemCompletionCount,
    getLeetcodeHotCompletionStats,
    getProblemDisplayTitle,
    getProblemExcerptText,
    formatProblemTag,
    isHiddenProblemTag,
    isDisabledProblemSource,
    isCatalogProblem,
    normalizeProblem,
    isUserProblem,
    normalizeCategory,
    formatCategoryLabel,
    getProblemMediaMarkdown
  } = problemProviderFacade;

  const accountDataAdapter = createAccountDataAdapter({
    getLanguage: () => getLanguage(),
    getCurrentUser: () => appState.currentUser
  });
  const normalizeAccount = accountDataAdapter.normalizeAccount;
  const normalizeGraduationTerm = accountDataAdapter.normalizeGraduationTerm;
  const normalizeCountry = accountDataAdapter.normalizeCountry;
  const inferCountryFromRegion = accountDataAdapter.inferCountryFromRegion;
  const normalizeRegionForCountry = accountDataAdapter.normalizeRegionForCountry;
  const getDefaultRegion = accountDataAdapter.getDefaultRegion;
  const getCountryLabel = accountDataAdapter.getCountryLabel;
  const getRegionLabel = accountDataAdapter.getRegionLabel;
  const renderCountryOptions = accountDataAdapter.renderCountryOptions;
  const renderRegionOptions = accountDataAdapter.renderRegionOptions;
  const defaultLeaderboardSettings = accountDataAdapter.defaultLeaderboardSettings;
  const normalizeLeaderboardSettings = accountDataAdapter.normalizeLeaderboardSettings;
  const getInitials = accountDataAdapter.getInitials;
  const authMessageAdapter = createAuthMessageAdapter({
    googleLoginEnabled: GOOGLE_LOGIN_ENABLED,
    getProtocol: () => window.location?.protocol || "",
    t: (...args) => t(...args)
  });
  const getAuthReadyMessage = authMessageAdapter.getAuthReadyMessage;
  const getVerificationErrorMessage = authMessageAdapter.getVerificationErrorMessage;
  const getAuthErrorMessage = authMessageAdapter.getAuthErrorMessage;
  const hashPassword = (email, password) => hashPasswordValue(email, password);

  const companiesDataAdapter = createCompaniesDataAdapter({
    companyDefs: quantCompanyDefs,
    parseTags
  });
  const normalizeProblemCompanies = companiesDataAdapter.normalizeProblemCompanies;
  const coursesDataAdapter = createCoursesDataAdapter({
    stableId: stableCourseId,
    inferSource,
    safeExternalUrl
  });
  const normalizeContentSources = coursesDataAdapter.normalizeContentSources;

  sliceRefs.newsProvider = null;
  const newsDataAdapter = createNewsDataAdapter({
    parseTags,
    skillDefs,
    stableId: stableNewsId,
    makeId,
    inferSource,
    latestIso: latestIsoValue
  });
  const newsFacade = createNewsFacade({
    getProvider: () => sliceRefs.newsProvider,
    getRuntime: () => sliceRefs.newsRuntime
  });
  let {
    getSourceTypeLabel: getNewsSourceTypeLabel,
    getVerificationLabel: getNewsVerificationLabel,
    focusItem: focusNewsItem,
    addFromForm: addNewsFromForm,
    upsert: upsertNews,
    markRead: markNewsRead,
    maybeAutoRefresh: maybeAutoRefreshNews,
    refresh: refreshNewsFromApi
  } = newsFacade;
  const normalizeNewsSkills = newsDataAdapter.normalizeSkills;
  const mergeNews = newsDataAdapter.merge;
  const newsDedupeKey = newsDataAdapter.dedupeKey;
  const mergeDuplicateNews = newsDataAdapter.mergeDuplicate;
  sliceRefs.cloudSyncController = null;
  const cloudSyncFacade = createCloudSyncFacade({
    getController: () => sliceRefs.cloudSyncController
  });
  const queueCloudSync = (scope, delay = CLOUD_SYNC_DEBOUNCE_MS) => cloudSyncFacade.queue(scope, delay);
  const flushCloudSync = () => cloudSyncFacade.flush();

  const cloudRuntime = createCloudRuntime({
    storageKey: CLOUD_CONFIG_KEY,
    defaultEndpoint: DEFAULT_CLOUD_API_ENDPOINT,
    getConfig: () => appState.cloudConfig,
    getCurrentUser: () => appState.currentUser
  });
  const stateDataRuntime = createStateDataRuntime({
    skillDefs,
    seedJobs,
    seedCourses,
    seedNews,
    catalogProblems: getRuntimeCatalogProblems?.() || catalogProblems,
    makeId,
    parseTags,
    stableProblemId,
    stableCourseId,
    inferSource,
    safeExternalUrl,
    localDateKey,
    normalizeContentSources,
    normalizeNetworkContact,
    mergeProblemStates,
    problemStatesFromFavorites,
    isDisabledProblemId,
    normalizeLeetcodeHot100Done,
    normalizeLeaderboardSettings,
    mergeProblems,
    isCatalogProblem,
    isDisabledProblemSource,
    mergeNews,
    getUserCatalogProblems,
    defaultLeaderboardSettings,
    nowIso: () => new Date().toISOString()
  });
  const createBaseState = stateDataRuntime.createBaseState;
  const getStateDataDeps = stateDataRuntime.getStateDataDeps;
  const normalizeState = stateDataRuntime.normalizeState;
  const normalizeStudyPlan = stateDataRuntime.normalizeStudyPlan;
  const normalizePrepPlan = stateDataRuntime.normalizePrepPlan;
  const normalizeMentalMathRecords = stateDataRuntime.normalizeMentalMathRecords;
  const normalizeGameRecords = stateDataRuntime.normalizeGameRecords;
  const normalizeInterviewExperience = stateDataRuntime.normalizeInterviewExperience;
  const normalizeResumeState = stateDataRuntime.normalizeResumeState;
  const normalizeJobs = stateDataRuntime.normalizeJobs;
  const normalizeCourses = stateDataRuntime.normalizeCourses;
  const normalizeResources = stateDataRuntime.normalizeResources;
  const normalizeCourseStates = stateDataRuntime.normalizeCourseStates;
  const normalizeSkills = stateDataRuntime.normalizeSkills;
  const normalizeCloudLeaderboardRows = (rows = []) => normalizeCloudLeaderboardRowsValue(rows, {
    normalizeAccount,
    normalizeSkills
  });
  const localStatePayload = stateDataRuntime.localStatePayload;
  const cloudStatePayload = stateDataRuntime.cloudStatePayload;
  const mergeCloudState = stateDataRuntime.mergeCloudState;
  const mergeRecordsById = stateDataRuntime.mergeRecordsById;
  const mergeCourseStates = stateDataRuntime.mergeCourseStates;
  const mergeResumeState = stateDataRuntime.mergeResumeState;
  const mergeJobs = stateDataRuntime.mergeJobs;
  const mergeCourses = stateDataRuntime.mergeCourses;
  const latestIso = stateDataRuntime.latestIso;
  const isSafeRichMediaUrl = isSafeRichMediaUrlValue;
  problemProvider = createProblemProvider({
    getState: () => userState.value,
    getLanguage: () => getLanguage(),
    t: (...args) => t(...args),
    skillDefs,
    leetcodeHot100,
    tagLabels: problemTagLabels,
    disabledSources: disabledProblemSources,
    disabledBookNames: disabledProblemBookNames,
    makeId,
    stableId: stableProblemId,
    inferSource,
    parseTags,
    exerciseTitleOverrides,
    normalizeProblemCompanies,
    mergeRecordsById,
    latestIso,
    getPersonalState: (problemId) => getProblemPersonalState(problemId),
    isSafeRichMediaUrl
  });
  let communityActivityHooks = {
    persistActivity: () => {}
  };
  const communityRuntime = createCommunityRuntime({
    storageKey: COMMUNITY_KEY,
    getStore: () => appState.community,
    queueCloudSync,
    persistActivity: () => communityActivityHooks.persistActivity?.(),
    makeId,
    normalizeExperience: normalizeInterviewExperience,
    normalizeCountry,
    normalizeRegionForCountry,
    mergeRecordsById,
    latestIso
  });
  const authStateRuntime = createAuthStateRuntime({
    storageKey: AUTH_KEY,
    defaultGoogleClientId: DEFAULT_GOOGLE_CLIENT_ID,
    getAuth: () => appState.auth,
    normalizeAccount,
    setCurrentUser(user) {
      appState.currentUser = user;
    }
  });
  const preferencesRuntime = createPreferencesRuntime({
    storageKey: APP_PREFS_KEY,
    defaultLanguage: DEFAULT_LANGUAGE,
    supportedLanguages: SUPPORTED_LANGUAGES,
    fallbackLanguage: "zh",
    i18n,
    location: window.location,
    windowRef: window,
    getPrefs: () => appState.appPrefs,
    setPrefs(prefs) {
      appState.appPrefs = prefs;
    },
    applySidebarState: () => applySidebarState(),
    applyLanguage: () => applyLanguage(),
    renderAll: () => renderAll()
  });
  const appRuntime = createAppRuntime({
    appPrefs: preferencesRuntime.load(),
    auth: authStateRuntime.load(),
    community: communityRuntime.load(),
    cloudConfig: cloudRuntime.loadConfig()
  });
  const appState = appRuntime.state;
  appState.currentUser = authStateRuntime.currentUser();
  const saveAuth = authStateRuntime.save;
  const getCurrentUser = authStateRuntime.currentUser;
  const upsertLocalAccount = authStateRuntime.upsertLocalAccount;
  const userStateKey = (userId) => userStateKeyValue(USER_STATE_PREFIX, userId);
  let userStateActivityHooks = {
    markActivity: () => null,
    queueCelebration: () => {}
  };
  const userStateRuntime = createUserStateRuntime(() => (
    appState.currentUser
      ? loadUserStateValue(appState.currentUser.id, {
        createBaseState,
        normalizeState,
        userStateKey
      })
      : createBaseState()
  ), {
    getCurrentUser: () => appState.currentUser,
    createBaseState,
    loadUserState: loadUserStateValue,
    writeUserState: writeUserStateValue,
    clearUserState: clearUserStateValue,
    migrateLegacyState: migrateLegacyStateValue,
    normalizeState,
    serializeState: localStatePayload,
    userStateKey,
    legacyKey: STORAGE_KEY,
    queueCloudSync,
    getActivityHooks: () => userStateActivityHooks,
    nowIso: () => new Date().toISOString()
  });
  const userState = userStateRuntime.state;
  const domainStores = createDomainStores({ appState, appRuntime, userStateRuntime });
  wrapUserStateMutations(userStateRuntime, domainStores.syncUserStateStore);
  const loadState = userStateRuntime.loadCurrent;
  const loadStateForUser = userStateRuntime.loadForUser;
  const saveState = userStateRuntime.save;
  const migrateLegacyState = userStateRuntime.migrateLegacy;
  const clearStateForUser = userStateRuntime.clearForUser;
  const backupController = createBackupController({
    windowRef: window,
    getCurrentUser: () => appState.currentUser,
    getState: () => userState.value,
    setState(state) {
      userStateRuntime.setValue(state);
    },
    clearStateForUser,
    loadState,
    clearProblemLookupCaches: () => {
      const clearCaches = sliceRefs.clearProblemLookupCaches || clearProblemLookupCaches;
      if (typeof clearCaches === "function") clearCaches();
    },
    saveState,
    renderAll: () => {
      const render = sliceRefs.renderAll || renderAll;
      if (typeof render === "function") render();
    },
    serializeState: localStatePayload,
    normalizeMentalMathRecords,
    normalizeGameRecords,
    mergeProblemStates,
    problemStatesFromFavorites,
    defaultLeaderboardSettings,
    mergeProblems,
    mergeNews,
    normalizeState,
    now: () => new Date(),
    nowIso: () => new Date().toISOString()
  });
  const resetState = backupController.resetState;
  const exportState = backupController.exportState;
  const importState = backupController.importState;
  const saveCloudConfig = cloudRuntime.saveConfig;
  const getCloudApiBase = cloudRuntime.getApiBase;
  const canUseCloud = cloudRuntime.canUse;
  const getLlmRequestHeaders = cloudRuntime.getRequestHeaders;
  const cloudApi = cloudRuntime.request;
  const loadCommunity = communityRuntime.load;
  const saveCommunity = communityRuntime.save;
  const normalizeCommunityStore = communityRuntime.normalizeStore;
  const mergeCloudCommunity = communityRuntime.mergeCloud;
  const normalizeLanguage = preferencesRuntime.normalizeLanguage;
  const syncLanguageToUrl = preferencesRuntime.syncLanguageToUrl;
  const saveAppPrefs = preferencesRuntime.save;
  const getLanguage = preferencesRuntime.getLanguage;
  const getLocale = preferencesRuntime.getLocale;
  const t = preferencesRuntime.t;
  const textMatchesI18nKeys = preferencesRuntime.matchesKeys;
  const setLanguage = (language) => {
    const result = preferencesRuntime.setLanguage(language);
    domainStores.syncPreferencesStore();
    domainStores.syncAppStore();
    return result;
  };
  const toggleSidebarNav = preferencesRuntime.toggleSidebar;
  const LEADERBOARD_CLOUD_REFRESH_MS = 45_000;
  const messageSelectionState = createMessageSelectionState("");
  const problemDetailState = createProblemDetailState("");
  const newsFilterState = createNewsFilterState({}, {
    topicPacks: NEWS_TOPIC_QUERY_PACKS,
    sourceFilters: NEWS_SOURCE_FILTERS
  });
  const communityFilterState = createCommunityFilterState("all");
  const problemSocialState = createProblemSocialState();
  const getProblemSocial = (problemId) => getProblemSocialValue(problemSocialState.getSocial(), problemId);
  const companyTierFilterState = createCompanyTierFilterState("all");
  const libraryFilterState = createLibraryFilterState();
  const PROBLEM_PAGE_SIZE = 24;
  const PROBLEM_SEARCH_DEBOUNCE_MS = 140;
  const INTERVIEW_SESSION_STORAGE_KEY = "quantgym-interview-session-v2";
  const INTERVIEW_HISTORY_STORAGE_KEY = "quantgym-interview-history-v1";
  const INTERVIEW_RESUME_STORAGE_KEY = "quantgym-interview-resume-v1";
  const problemSearchRecordCache = new Map();
  const problemCompanyCache = new Map();
  const mathTypesetScheduler = createMathTypesetScheduler({ windowRef: window });
  const skillsMetricsProvider = createSkillsMetricsProvider({
    getState: () => userState.value,
    skillDefs,
    scoreXpPerPoint: SCORE_XP_PER_POINT,
    normalizeCategory,
    clampNumber
  });
  const getTotalXp = skillsMetricsProvider.getTotalXp;
  const getSkillScore = skillsMetricsProvider.getSkillScore;
  const getQuantScore = skillsMetricsProvider.getQuantScore;
  const calculateQuantScore = skillsMetricsProvider.calculateQuantScore;
  const getLevelInfo = skillsMetricsProvider.getLevelInfo;
  const getRank = skillsMetricsProvider.getRank;
  const getWeeklyXp = skillsMetricsProvider.getWeeklyXp;
  const getStreak = skillsMetricsProvider.getStreak;
  const getSkillPracticeStats = skillsMetricsProvider.getSkillPracticeStats;
  const getAllSkillPracticeStats = skillsMetricsProvider.getAllSkillPracticeStats;
  return { INTERVIEW_HISTORY_STORAGE_KEY, INTERVIEW_RESUME_STORAGE_KEY, INTERVIEW_SESSION_STORAGE_KEY, LEADERBOARD_CLOUD_REFRESH_MS, PROBLEM_PAGE_SIZE, PROBLEM_SEARCH_DEBOUNCE_MS, accountDataAdapter, appRuntime, appState, authMessageAdapter, authStateRuntime, backupController, calculateQuantScore, canUseCloud, clearStateForUser, cloudApi, cloudRuntime, cloudStatePayload, cloudSyncController: sliceRefs.cloudSyncController, cloudSyncFacade, communityActivityHooks, communityFilterState, communityRuntime, companiesDataAdapter, companyTierFilterState, coursesDataAdapter, createBaseState, defaultLeaderboardSettings, domainStores, exportState, flushCloudSync, getAllSkillPracticeStats, getAuthErrorMessage, getAuthReadyMessage, getCloudApiBase, getCountryLabel, getCurrentUser, getDefaultRegion, getInitials, getLanguage, getLevelInfo, getLlmRequestHeaders, getLocale, getProblemSocial, getQuantScore, getRank, getRegionLabel, getSkillPracticeStats, getSkillScore, getStateDataDeps, getStreak, getTotalXp, getVerificationErrorMessage, getWeeklyXp, hashPassword, importState, inferCountryFromRegion, isSafeRichMediaUrl, isSocialNewsType, latestIso, libraryCatalog, libraryFilterState, loadCommunity, loadState, loadStateForUser, localStatePayload, mathTypesetScheduler, mergeCloudCommunity, mergeCloudState, mergeCourseStates, mergeCourses, mergeDuplicateNews, mergeJobs, mergeNews, mergeRecordsById, mergeResumeState, messageSelectionState, migrateLegacyState, maybeAutoRefreshNews, newsDataAdapter, newsDedupeKey, newsFacade, newsFilterState, newsMatchesSourceFilter, newsMatchesTopic, newsProvider: sliceRefs.newsProvider, normalizeAccount, normalizeCloudLeaderboardRows, normalizeCommunityStore, normalizeContentSources, normalizeCountry, normalizeCourseStates, normalizeCourses, normalizeGameRecords, normalizeGraduationTerm, normalizeInterviewExperience, normalizeJobs, normalizeLanguage, normalizeLeaderboardSettings, normalizeMentalMathRecords, normalizeNewsSkills, normalizeNewsSourceFilter, normalizeNewsSourceType, normalizeNewsTopicFilter, normalizePrepPlan, normalizeProblemCompanies, normalizeRegionForCountry, normalizeResources, normalizeState, normalizeResumeState, normalizeSkills, normalizeStudyPlan, preferencesRuntime, problemCompanyCache, problemDetailState, problemProvider, problemProviderFacade, problemSearchRecordCache, problemSocialState, queueCloudSync, refreshNewsFromApi, renderCountryOptions, renderRegionOptions, resetState, saveAppPrefs, saveAuth, saveCloudConfig, saveCommunity, saveState, setLanguage, skillsMetricsProvider, stateDataRuntime, syncLanguageToUrl, t, textMatchesI18nKeys, toggleSidebarNav, upsertLocalAccount, userState, userStateActivityHooks, userStateKey, userStateRuntime };

}
