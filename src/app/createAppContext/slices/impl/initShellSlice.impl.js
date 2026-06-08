export function initShellSliceImpl(shared, ctx) {
  const deps = { ...shared, ...ctx };
  const sliceRefs = ctx.__sliceRefs || {};
  let {
  DEFAULT_ROUTE_MODULE,
  PENDING_CAPTURE_KEY,
  PROBLEM_PAGE_SIZE,
  addFromForm,
  appState,
  args,
  authMessage,
  buildTodayStudyPlan,
  canUseCloud,
  clear,
  clearCompanyCache,
  clearLookupCaches,
  clearSearchCache,
  clearStateCache,
  cloudApi,
  communityActivityHooks,
  communityFilterState,
  createAppCommunityControllerBundle,
  createAppShellController,
  createInterviewFacade,
  createJobsFacade,
  createOverviewFacade,
  createPageLifecycle,
  createPlanningActivityBundle,
  createProblemCaptureController,
  createProblemCatalogMutationController,
  createProblemPaginationController,
  createProblemPersonalStateController,
  createProblemsFacade,
  current,
  currentUser,
  defaultRouteModule,
  documentRef,
  elements,
  escapeAttribute,
  escapeHtml,
  formatCategoryLabel,
  formatSharedExperienceText,
  getAnswerController,
  getAppState,
  getAuthReadyMessage,
  getBrowserController,
  getCaptureController,
  getCurrentUser,
  getHeroCoachController,
  getInterviewRuntimeState,
  getInterviewState,
  getLanguage,
  getLeaderboardController,
  getLeaderboardRows,
  getLeetcodeHotController,
  getLocale,
  getNetworkStatusLabelValue,
  getPersonalState,
  getRuntime,
  getSessionFlowController,
  getState,
  getStateCache,
  getStreak,
  getSummaryController,
  getUserState,
  handleChange,
  handleClick,
  handleKeydown,
  handleSubmit,
  hide,
  id,
  importJson,
  interviewRuntime,
  isCatalogProblem,
  isDisabledProblemId,
  isDisabledProblemSource,
  isUserProblem,
  label,
  loadCommunity,
  localDateKey,
  localStatePayload,
  makeId,
  maybeAutoRefreshNews,
  mergeProblemStates,
  message,
  messageSelectionState,
  name,
  names,
  normalizeCountry,
  normalizeInterviewExperience,
  normalizeLeaderboardSettings,
  normalizeProblem,
  normalizeProblemState,
  normalizeRegionForCountry,
  nowIso,
  openExternalUrlValue,
  openModule,
  options,
  pageSize,
  parseTags,
  problemCompanyCache,
  problemId,
  problemSearchRecordCache,
  pruneCatalog,
  publish,
  queueCloudSync,
  refreshIcons,
  renderGooglePlaceholder,
  renderInterviewSetup,
  renderLeaderboardScopeSummary,
  renderSkills,
  renderTodayPlan,
  saveCommunity,
  saveState,
  selectedProblemId,
  selector,
  setButtonLabelView,
  setSelectedProblemId,
  setTextView,
  setupButtonRipplesView,
  skillDefs,
  skills,
  state,
  status,
  storageKey,
  t,
  text,
  textContent,
  textMatchesI18nKeys,
  toISOString,
  toggleCompleted,
  toggleSaved,
  update,
  updatePreview,
  userState,
  userStateActivityHooks,
  userStateRuntime,
  userStateKey,
  value,
  windowRef,
  writeUserState,
  writeUserStateValue
  } = deps;





  const els = {};
  const showAuthMessage = (message) => {
    if (els.authMessage) els.authMessage.textContent = message;
  };
  const setButtonLabel = (selector, label) => setButtonLabelView(selector, label);
  const setText = (selector, text) => setTextView(selector, text);
  const openExternalUrl = (value) => openExternalUrlValue(value, { windowRef: window });
  const getNetworkStatusLabel = (status) => getNetworkStatusLabelValue(status, getLanguage());
  const setupButtonRipples = () => setupButtonRipplesView(document);
  let problemBrowserController = null;
  let problemCaptureController = null;
  let leetcodeHotController = null;
  let problemsRuntime = null;
  const problemsFacade = createProblemsFacade({
    getBrowserController: () => sliceRefs.problemBrowserController,
    getLeetcodeHotController: () => sliceRefs.leetcodeHotController,
    getCaptureController: () => problemCaptureController,
    getRuntime: () => sliceRefs.problemsRuntime
  });
  let {
    refreshCatalog: refreshProblemCatalog,
    refreshSocial: refreshProblemSocial,
    getBrowserMatches: getProblemBrowserMatches,
    getSearchOptions: getProblemSearchOptions,
    openFromSearch: openProblemFromSearch,
    render: renderProblems,
    renderCompanyPanel: renderProblemCompanyPanel,
    renderViewTabs: renderProblemViewTabs,
    renderRanking: renderProblemRanking,
    renderLeetcodeHot100,
    isLeetcodeHotExpanded,
    setLeetcodeHotExpanded,
    toggleLeetcodeHotPanel,
    consumeIncomingCapture,
    consumePendingCapture
  } = problemsFacade;
  let heroCoachController = null;
  let overviewSummaryController = null;
  let experienceShareController = null;
  let jobsRuntime = null;
  let newsRuntime = null;
  let leaderboardCloudController = null;
  const jobsFacade = createJobsFacade({
    getRuntime: () => sliceRefs.jobsRuntime
  });
  let {
    maybeAutoRefresh: maybeAutoRefreshJobs,
    refresh: refreshJobsFromApi
  } = jobsFacade;
  const overviewFacade = createOverviewFacade({
    getHeroCoachController: () => sliceRefs.heroCoachController,
    getSummaryController: () => sliceRefs.overviewSummaryController,
    getLeaderboardController: () => sliceRefs.leaderboardCloudController
  });
  let {
    startHeroTypewriter,
    renderSummary,
    invalidateLeaderboard: invalidateLeaderboardCloud,
    refreshLeaderboard: refreshLeaderboardFromCloud
  } = overviewFacade;
  let interviewSessionFlowController = null;
  let interviewAnswerController = null;
  const interviewFacade = createInterviewFacade({
    getSessionFlowController: () => sliceRefs.interviewSessionFlowController,
    getAnswerController: () => sliceRefs.interviewAnswerController
  });
  let {
    handleTranscriptAction: handleInterviewTranscriptAction,
    reset: resetInterview,
    finalizeOnboarding: finalizeInterviewOnboarding,
    showQuestion: showInterviewQuestion,
    submitAnswer: submitInterviewAnswer,
    requestHint: requestInterviewHint,
    restartWithSameConfig: restartInterviewWithSameConfig
  } = interviewFacade;
  const publishInterviewExperience = (id) => experienceShareController?.publish(id);

  const pageLifecycleRef = { current: createPageLifecycle({}) };
  const runModuleLifecycle = (name) => pageLifecycleRef.current.runModuleLifecycle(name);
  const renderModules = (names) => pageLifecycleRef.current.renderModules(names);
  const getModuleLifecycle = (name) => pageLifecycleRef.current.getModuleLifecycle(name);
  const appShellController = createAppShellController({
    documentRef: document,
    windowRef: window,
    elements: els,
    defaultRouteModule: DEFAULT_ROUTE_MODULE,
    routingMode: options.routingMode,
    getAppState: () => appState,
    getUserState: () => userState.value,
    getLanguage,
    t,
    textMatchesI18nKeys,
    getAuthReadyMessage,
    renderGooglePlaceholder: () => sliceRefs.renderGooglePlaceholder?.(),
    normalizeLeaderboardSettings,
    getLeaderboardRows: () => sliceRefs.getLeaderboardRows?.(),
    renderLeaderboardScopeSummary: (...args) => sliceRefs.renderLeaderboardScopeSummary?.(...args),
    getNetworkStatusLabel,
    updatePrepTaskIndicator: () => updatePrepTaskIndicator(),
    updateCheckInPill: () => updateCheckInPill(),
    startHeroTypewriter: () => startHeroTypewriter(),
    renderModules,
    runModuleLifecycle,
    consumePendingCapture: () => consumePendingCapture(),
    renderTodoDock: () => renderTodoDock(),
    maybeAutoRefreshNews: () => maybeAutoRefreshNews(),
    maybeAutoRefreshJobs: () => maybeAutoRefreshJobs(),
    updatePreview: () => sliceRefs.updatePreview?.(),
    refreshIcons
  });
  const applySidebarState = appShellController.applySidebarState;
  const applyLanguage = appShellController.applyLanguage;
  const updateGlobalSearchPlaceholder = appShellController.updateGlobalSearchPlaceholder;
  const handleRouteChange = appShellController.handleRouteChange;
  const restoreRouteModule = appShellController.restoreRouteModule;
  const switchModule = appShellController.switchModule;
  const renderAll = appShellController.renderAll;
  sliceRefs.renderAll = renderAll;
  const problemPaginationController = createProblemPaginationController({
    elements: els,
    pageSize: PROBLEM_PAGE_SIZE,
    getLanguage,
    renderProblems
  });
  const resetProblemPagination = problemPaginationController.reset;
  const hideProblemPagination = problemPaginationController.hide;
  const handleProblemPaginationClick = problemPaginationController.handleClick;
  const handleProblemPaginationSubmit = problemPaginationController.handleSubmit;
  const handleProblemPaginationChange = problemPaginationController.handleChange;
  const handleProblemPaginationKeydown = problemPaginationController.handleKeydown;
  const renderProblemPagination = problemPaginationController.render;
  const problemPersonalStateController = createProblemPersonalStateController({
    getState: () => userState.value,
    normalizeProblemState,
    mergeProblemStates,
    saveState,
    renderProblems,
    renderSummary,
    renderSkills: () => getModuleLifecycle("skills")?.render?.(),
    clearSearchCache: () => problemSearchRecordCache.clear(),
    clearCompanyCache: () => problemCompanyCache.clear(),
    nowIso: () => new Date().toISOString()
  });
  const clearProblemLookupCaches = problemPersonalStateController.clearLookupCaches;
  sliceRefs.clearProblemLookupCaches = clearProblemLookupCaches;
  const clearProblemStateCache = problemPersonalStateController.clearStateCache;
  const getProblemStateCache = problemPersonalStateController.getStateCache;
  const getProblemPersonalState = problemPersonalStateController.getPersonalState;
  const updateProblemState = problemPersonalStateController.update;
  const toggleProblemSaved = problemPersonalStateController.toggleSaved;
  const toggleProblemCompleted = problemPersonalStateController.toggleCompleted;
  const problemCatalogMutationController = createProblemCatalogMutationController({
    elements: els,
    windowRef: window,
    getState: () => userState.value,
    getInterviewState: () => interviewRuntime.state,
    normalizeProblem,
    isCatalogProblem,
    isUserProblem,
    isDisabledProblemId,
    isDisabledProblemSource,
    parseTags,
    canUseCloud,
    cloudApi,
    clearProblemLookupCaches,
    saveState,
    resetInterview,
    renderAll,
    nowIso: () => new Date().toISOString()
  });
  const addProblemFromForm = problemCatalogMutationController.addFromForm;
  const addProblemFromPayload = problemCatalogMutationController.addFromPayload;
  const importProblemJson = problemCatalogMutationController.importJson;
  const importProblemJsonText = problemCatalogMutationController.importJsonText;
  const upsertProblems = problemCatalogMutationController.upsertProblems;
  const deleteProblem = problemCatalogMutationController.deleteProblem;
  const pruneProblemCatalog = problemCatalogMutationController.pruneCatalog;
  problemCaptureController = createProblemCaptureController({
    windowRef: window,
    storageKey: PENDING_CAPTURE_KEY,
    getCurrentUser: () => appState.currentUser,
    normalizeProblem,
    upsertProblems,
    setSelectedProblemId(problemId) {
      interviewRuntime.state.selectedProblemId = problemId;
    },
    showAuthMessage
  });
  const planningActivityBundle = createPlanningActivityBundle({
    appState,
    buildTodayStudyPlan: () => sliceRefs.buildTodayStudyPlan?.(),
    documentRef: document,
    elements: els,
    escapeAttribute,
    escapeHtml,
    formatCategoryLabel,
    getCurrentUser: () => appState.currentUser,
    getInterviewRuntimeState: () => interviewRuntime.state,
    getLocale,
    getStreak,
    getState: () => userState.value,
    localDateKey,
    localStatePayload,
    makeId,
    openModule: switchModule,
    queueCloudSync,
    refreshIcons,
    renderInterviewSetup: () => renderInterviewSetup(),
    renderProblems,
    renderTodayPlan: () => sliceRefs.renderTodayPlan?.(),
    resetInterview,
    saveState,
    setText,
    skillDefs,
    t,
    userStateKey,
    windowRef: window,
    writeUserState: writeUserStateValue
  });
  let {
    getTodoDockPlan,
    renderTodoDock,
    toggleTodoDock,
    closeTodoDock,
    handleTodoDockClick,
    handleTodoDockEdit,
    addTodoTask,
    createPrepPlan,
    renderPrepPlan,
    updatePrepTaskIndicator,
    populatePrepPlanForm,
    getPrepStageIndex,
    getPrepPaceText,
    weeksUntilDate,
    getPrepFocusSkills,
    getPrepDailyTasks,
    renderPrepTaskMarkup,
    renderPrepDiagnosticMarkup,
    handlePrepPlanAction,
    togglePrepTask,
    submitPrepDiagnostic,
    openPrepTask,
    editPrepPlan
  } = planningActivityBundle;
  let {
    animateStreakCount,
    hasCheckedInToday,
    markActivityCheckIn,
    persistActivityCheckIn,
    queueCheckInCelebration,
    renderStreakCalendar,
    setStreakPanelOpen,
    showCheckInToast,
    toggleStreakPanel,
    updateCheckInPill
  } = planningActivityBundle;
  userStateActivityHooks = planningActivityBundle.userStateActivityHooks;
  communityActivityHooks = planningActivityBundle.communityActivityHooks;
  const communityControllerBundle = createAppCommunityControllerBundle({
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
    userState,
    userStateRuntime
  });
  experienceShareController = communityControllerBundle.experienceShareController;
  const getUserMessageThreads = communityControllerBundle.getUserMessageThreads;
  const getUnreadMessageCount = communityControllerBundle.getUnreadMessageCount;
  const normalizeCommunityPost = communityControllerBundle.normalizeCommunityPost;
  const normalizeCommunityComment = communityControllerBundle.normalizeCommunityComment;
  const normalizeMessageParticipant = communityControllerBundle.normalizeMessageParticipant;
  const normalizeMessageThread = communityControllerBundle.normalizeMessageThread;
  const updateUnreadMessageBadge = communityControllerBundle.updateUnreadMessageBadge;
  return { addProblemFromForm, addProblemFromPayload, addTodoTask, appShellController, applyLanguage, applySidebarState, clearProblemLookupCaches, clearProblemStateCache, closeTodoDock, communityActivityHooks, communityControllerBundle, deleteProblem, els, experienceShareController, getModuleLifecycle, getNetworkStatusLabel, getProblemPersonalState, getProblemStateCache, getTodoDockPlan, getUnreadMessageCount, getUserMessageThreads, handleProblemPaginationChange, handleProblemPaginationClick, handleProblemPaginationKeydown, handleProblemPaginationSubmit, handleRouteChange, handleTodoDockClick, handleTodoDockEdit, heroCoachController, hideProblemPagination, importProblemJson, importProblemJsonText, interviewAnswerController, interviewFacade, interviewSessionFlowController, jobsFacade, jobsRuntime, leaderboardCloudController, leetcodeHotController, maybeAutoRefreshJobs, newsRuntime, normalizeCommunityComment, normalizeCommunityPost, normalizeMessageParticipant, normalizeMessageThread, openExternalUrl, overviewFacade, overviewSummaryController, pageLifecycleRef, planningActivityBundle, problemBrowserController, problemCaptureController, problemCatalogMutationController, problemPaginationController, problemPersonalStateController, problemsFacade, problemsRuntime, pruneProblemCatalog, publishInterviewExperience, refreshJobsFromApi, renderAll, renderModules, renderProblemPagination, renderTodoDock, resetProblemPagination, restoreRouteModule, runModuleLifecycle, setButtonLabel, setText, setupButtonRipples, showAuthMessage, switchModule, toggleProblemCompleted, toggleProblemSaved, toggleTodoDock, updateGlobalSearchPlaceholder, updateProblemState, updateUnreadMessageBadge, upsertProblems, userStateActivityHooks };

}
