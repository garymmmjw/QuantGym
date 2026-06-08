export function initInterviewSliceImpl(shared, ctx) {
  const deps = { ...shared, ...ctx };
  const sliceRefs = ctx.__sliceRefs || {};
  let {
  INTERVIEW_HISTORY_STORAGE_KEY,
  INTERVIEW_RESUME_STORAGE_KEY,
  INTERVIEW_SESSION_STORAGE_KEY,
  animateScores,
  appendMessage,
  applySidebarState,
  args,
  autoSizeAnswer,
  behavioralInterviewProblems,
  behavioralProblems,
  buildFullRangeQuestions,
  buildPdfQuestions,
  clearPrepTimer,
  clearQuestionTimer,
  clearTimers,
  clearTypingTimer,
  clearTypingTimers,
  complete,
  createDimensionMiniBars,
  createInterviewAnswerController,
  createInterviewApiController,
  createInterviewFeedbackController,
  createInterviewInteractionController,
  createInterviewMessageController,
  createInterviewOnboardingController,
  createInterviewQuestionBuilderController,
  createInterviewResultsController,
  createInterviewRuntime,
  createInterviewSessionFlowController,
  createInterviewSessionLifecycleController,
  createInterviewSetupController,
  createInterviewViewController,
  createPanelStats,
  difficultyDefs,
  documentRef,
  elements,
  els,
  exit,
  exportReport,
  finalize,
  finalizeInterviewOnboarding,
  focusDefs,
  formatCategory,
  formatCategoryLabel,
  formatConfigSummary,
  formatDate,
  formatQuestion,
  getAnswerMode,
  getAppLanguage,
  getAvailableCategories,
  getBaseProblemPool,
  getCategorySummary,
  getCurrentConversation,
  getFavorites,
  getInterviewState,
  getLanguage,
  getLlmConfig,
  getLlmRequestHeaders,
  getLocalizedProblemField,
  getMaxFollowups,
  getMessages,
  getModuleLifecycle,
  getPersonaPrompt,
  getProblemMediaMarkdown,
  getProblems,
  getQuestionCount,
  getQuestionCountForConfig,
  getQuestionMessages,
  getQuestionSeconds,
  getQuestionSecondsForConfig,
  getQuestionSpeechText,
  getRequestHeaders,
  getRuntimeState,
  getSelectedCategories,
  getSelectedProblemId,
  getSerializableTranscript,
  getSetupLanguage,
  getSetupMode,
  getSource,
  getType,
  getTypeForConfig,
  getUserState,
  getVoiceRecognition,
  goToNextQuestion,
  handleAnswer,
  handleAnswerKeydown,
  hasDurable,
  hasRestoredSnapshot,
  historyStorageKey,
  id,
  index,
  interviewAnswerController,
  interviewDifficultyDefs,
  interviewFocusDefs,
  interviewModeDefs,
  interviewPersonaDefs,
  interviewSessionFlowController,
  interviewTypeDefs,
  isCurrentStep,
  isLive,
  isLiveMode,
  isOnboarding,
  key,
  localConverse,
  localFeedback,
  localHint,
  makeId,
  makeProblemPool,
  mathTypesetScheduler,
  mergeRecordsById,
  messages,
  modeDefs,
  model,
  neutral,
  normalizeCategory,
  normalizeConverseReply,
  normalizeFeedback,
  normalizeLlmModel,
  normalizeModel,
  normalizeProblem,
  normalizeRichText,
  normalizeSessionConfig,
  nowIso,
  options,
  parseEvaluation,
  parseFeedbackEvaluation,
  parseTags,
  persistSnapshot,
  personaDefs,
  problems,
  prompt,
  randomChoice,
  randomInt,
  recognition,
  recordLiveQuestionResult,
  recordPractice,
  refreshIcons,
  render,
  renderCategoryPicker,
  renderFavorites,
  renderModule,
  renderProblems,
  renderQuestionPanel,
  renderSetup,
  renderSummary,
  renderTranscript,
  requestConverse,
  requestFeedback,
  requestHint,
  requestHintFromApi,
  requestPdfQuestions,
  researchDeepDiveProblems,
  researchProblems,
  resetInterview,
  resetSessionUiState,
  restoreSessionSnapshot,
  restoreSnapshot,
  resumeDeepDiveProblems,
  resumeDurable,
  resumeProblems,
  resumeStorageKey,
  revealAnswer,
  saveFavorite,
  saveState,
  selectedProblemId,
  sessionStorageKey,
  setMessages,
  setPrepTimer,
  setQuestionTimer,
  setSnapshotRestored,
  setTimer,
  setTypingTimer,
  setVoiceRecognition,
  shareQuestion,
  showInterviewQuestion,
  showQuestion,
  skillDefs,
  speakText,
  stableId,
  stableProblemId,
  start,
  state,
  step,
  stopSpeech,
  storageKey,
  switchModule,
  syncLanguageControls,
  timer,
  toISOString,
  toggleCategory,
  togglePanel,
  typeDefs,
  updateActionPanel,
  updateAnswerFileMeta,
  updateAnswerMode,
  updateLayout,
  updateLlmConfigFromControls,
  updateMessage,
  updatePdfMeta,
  updateProblemState,
  updateSetupVisibility,
  updateStatus,
  upsertProblems,
  userState,
  value,
  windowRef
  } = deps;





  const interviewRuntime = createInterviewRuntime({ windowRef: window });
  const interviewState = interviewRuntime.state;
  const interviewViewController = createInterviewViewController({
    elements: els,
    documentRef: document,
    mathTypesetScheduler,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    getUserState: () => userState.value,
    getProblems: () => userState.value.problems,
    focusDefs: interviewFocusDefs,
    formatCategory: formatCategoryLabel,
    formatDate,
    mergeRecordsById,
    normalizeCategory,
    isCurrentOnboardingStep: (step) => isCurrentOnboardingStep(step),
    isLive: () => isInterviewLiveMode(),
    isOnboarding: () => isInterviewOnboarding(),
    refreshIcons,
    applySidebarState,
    renderSetup: () => renderInterviewSetup(),
    resetInterview: () => resetInterview(),
    switchModule
  });
  const renderInterviewTranscript = interviewViewController.renderTranscript;
  const renderRichText = interviewViewController.renderRichText;
  const normalizeRichTextContent = interviewViewController.normalizeRichTextContent;
  const appendInlineRichText = interviewViewController.appendInlineRichText;
  const scheduleMathTypeset = interviewViewController.scheduleMathTypeset;
  const updateInterviewLayout = interviewViewController.updateLayout;
  const renderInterviewQuestionPanel = interviewViewController.renderQuestionPanel;
  const createInterviewPanelStats = interviewViewController.createPanelStats;
  const createInterviewDimensionMiniBars = interviewViewController.createDimensionMiniBars;
  const animateInterviewScores = interviewViewController.animateScores;
  const renderInterviewFavorites = interviewViewController.renderFavorites;
  const getInterviewFavorites = interviewViewController.getFavorites;
  const toggleInterviewPanel = interviewViewController.togglePanel;
  const setInterviewPanelExpandedIndex = interviewViewController.setPanelExpandedIndex;
  const updateInterviewActionPanel = interviewViewController.updateActionPanel;
  const selectProblemForInterview = interviewViewController.selectProblemForInterview;
  const interviewSetupController = createInterviewSetupController({
    elements: els,
    documentRef: document,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    getProblems: () => userState.value.problems,
    typeDefs: interviewTypeDefs,
    focusDefs: interviewFocusDefs,
    modeDefs: interviewModeDefs,
    skillDefs,
    behavioralProblems: behavioralInterviewProblems,
    resumeProblems: resumeDeepDiveProblems,
    researchProblems: researchDeepDiveProblems,
    normalizeProblem,
    normalizeCategory,
    formatCategory: formatCategoryLabel,
    getLlmConfig: () => sliceRefs.getLlmConfig?.() || {},
    hasDurableInterview: () => hasDurableInterview(),
    hasRestoredSnapshot: () => interviewRuntime.hasRestoredSnapshot(),
    restoreSessionSnapshot: () => restoreInterviewSessionSnapshot(),
    updateStatus: () => updateInterviewStatus(),
    renderQuestionPanel: renderInterviewQuestionPanel,
    resetInterview: (options) => resetInterview(options),
    refreshIcons
  });
  const renderInterviewSetup = interviewSetupController.renderSetup;
  const getInterviewType = interviewSetupController.getType;
  const getInterviewSource = interviewSetupController.getSource;
  const getInterviewAnswerMode = interviewSetupController.getAnswerMode;
  const getInterviewQuestionCount = interviewSetupController.getQuestionCount;
  const getInterviewQuestionSeconds = interviewSetupController.getQuestionSeconds;
  const makeInterviewProblemPool = interviewSetupController.makeProblemPool;
  const makeInterviewBaseProblemPool = interviewSetupController.getBaseProblemPool;
  const getInterviewAvailableCategories = interviewSetupController.getAvailableCategories;
  const getInterviewSelectedCategories = interviewSetupController.getSelectedCategories;
  const renderInterviewCategoryPicker = interviewSetupController.renderCategoryPicker;
  const toggleInterviewCategory = interviewSetupController.toggleCategory;
  const getSelectedProblem = interviewSetupController.getSelectedProblem;
  const updateInterviewSetupVisibility = interviewSetupController.updateSetupVisibility;
  const formatInterviewCategorySummary = interviewSetupController.getCategorySummary;
  const updateInterviewAnswerMode = interviewSetupController.updateAnswerMode;
  const updateInterviewPdfMeta = interviewSetupController.updatePdfMeta;
  const updateInterviewAnswerFileMeta = interviewSetupController.updateAnswerFileMeta;
  const autoSizeInterviewAnswer = interviewSetupController.autoSizeAnswer;
  const handleInterviewAnswerKeydown = interviewSetupController.handleAnswerKeydown;
  const getInterviewSetupLanguage = interviewSetupController.getSetupLanguage;
  const getInterviewSetupMode = interviewSetupController.getSetupMode;
  const interviewOnboardingController = createInterviewOnboardingController({
    elements: els,
    documentRef: document,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    getAppLanguage: () => getLanguage(),
    getSource: getInterviewSource,
    getType: getInterviewType,
    getQuestionCount: getInterviewQuestionCount,
    getQuestionSeconds: getInterviewQuestionSeconds,
    getSetupLanguage: getInterviewSetupLanguage,
    getSetupMode: getInterviewSetupMode,
    focusDefs: interviewFocusDefs,
    difficultyDefs: interviewDifficultyDefs,
    personaDefs: interviewPersonaDefs,
    modeDefs: interviewModeDefs,
    clearTimers: () => clearInterviewTimers(),
    stopSpeech: () => stopInterviewSpeech(),
    resetSessionUiState: () => interviewRuntime.resetSessionUiState(),
    updateLlmConfigFromControls: () => sliceRefs.updateLlmConfigFromControls?.(),
    appendMessage: (...args) => appendInterviewMessage(...args),
    updateStatus: (...args) => updateInterviewStatus(...args),
    persistSnapshot: () => persistInterviewSessionSnapshot(),
    updateSetupVisibility: updateInterviewSetupVisibility,
    renderQuestionPanel: renderInterviewQuestionPanel,
    finalize: () => finalizeInterviewOnboarding()
  });
  const startInterview = interviewOnboardingController.start;
  const isInterviewOnboarding = interviewOnboardingController.isOnboarding;
  const isInterviewLiveMode = interviewOnboardingController.isLiveMode;
  const isCurrentOnboardingStep = interviewOnboardingController.isCurrentStep;
  const handleOnboardingAnswer = interviewOnboardingController.handleAnswer;
  const normalizeInterviewSessionConfig = interviewOnboardingController.normalizeSessionConfig;
  const getInterviewTypeForConfig = interviewOnboardingController.getTypeForConfig;
  const getInterviewQuestionCountForConfig = interviewOnboardingController.getQuestionCountForConfig;
  const getInterviewQuestionSecondsForConfig = interviewOnboardingController.getQuestionSecondsForConfig;
  const formatInterviewConfigSummary = interviewOnboardingController.formatConfigSummary;
  const syncInterviewLanguageControls = interviewOnboardingController.syncLanguageControls;
  const interviewFeedbackController = createInterviewFeedbackController({
    getInterviewState: () => interviewState,
    getType: getInterviewType,
    getSelectedProblem,
    typeDefs: interviewTypeDefs,
    formatCategory: formatCategoryLabel,
    getProblemMediaMarkdown,
    normalizeCategory,
    getLocalizedProblemField,
    randomChoice,
    nowIso: () => new Date().toISOString()
  });
  const formatInterviewQuestion = interviewFeedbackController.formatQuestion;
  const getCurrentInterviewConversation = interviewFeedbackController.getCurrentConversation;
  const getInterviewMaxFollowups = interviewFeedbackController.getMaxFollowups;
  const normalizeInterviewConverseReply = interviewFeedbackController.normalizeConverseReply;
  const localInterviewConverse = interviewFeedbackController.localConverse;
  const recordLiveInterviewQuestionResult = interviewFeedbackController.recordLiveQuestionResult;
  const summarizeAttachment = interviewFeedbackController.summarizeAttachment;
  const getSerializableInterviewTranscript = interviewFeedbackController.getSerializableTranscript;
  const localInterviewFeedback = interviewFeedbackController.localFeedback;
  const normalizeInterviewFeedback = interviewFeedbackController.normalizeFeedback;
  const parseInterviewFeedbackEvaluation = interviewFeedbackController.parseFeedbackEvaluation;
  const localInterviewHint = interviewFeedbackController.localHint;
  const getCurrentQuestionMessages = interviewFeedbackController.getQuestionMessages;
  const formatCurrentQuestionConversation = interviewFeedbackController.formatCurrentQuestionConversation;
  const interviewApiController = createInterviewApiController({
    elements: els,
    getInterviewState: () => interviewState,
    getLlmConfig: () => sliceRefs.getLlmConfig?.() || {},
    updateLlmConfigFromControls: (...args) => sliceRefs.updateLlmConfigFromControls?.(...args),
    getRequestHeaders: () => getLlmRequestHeaders(),
    normalizeModel: (model) => sliceRefs.normalizeLlmModel?.(model) || model,
    getType: getInterviewType,
    getSerializableTranscript: getSerializableInterviewTranscript,
    localFeedback: localInterviewFeedback,
    localHint: localInterviewHint,
    getMaxFollowups: getInterviewMaxFollowups,
    getLocalizedProblemField,
    getPersonaPrompt: (key) => interviewPersonaDefs[key || "neutral"]?.prompt || ""
  });
  const requestInterviewFeedback = interviewApiController.requestFeedback;
  const requestInterviewConverse = interviewApiController.requestConverse;
  const requestPdfQuestionGeneration = interviewApiController.requestPdfQuestions;
  const requestInterviewHintFromApi = interviewApiController.requestHint;
  const interviewQuestionBuilderController = createInterviewQuestionBuilderController({
    elements: els,
    getInterviewState: () => interviewState,
    difficultyDefs: interviewDifficultyDefs,
    makeProblemPool: makeInterviewProblemPool,
    getSelectedProblemId: () => interviewRuntime.state.selectedProblemId,
    normalizeProblem,
    normalizeCategory,
    parseTags,
    stableId: stableProblemId,
    makeId,
    randomInt,
    appendMessage: (...args) => appendInterviewMessage(...args),
    updateMessage: (...args) => updateInterviewMessage(...args),
    requestPdfQuestionGeneration,
    upsertProblems
  });
  const buildFullRangeInterviewQuestions = interviewQuestionBuilderController.buildFullRangeQuestions;
  const buildPdfInterviewQuestions = interviewQuestionBuilderController.buildPdfQuestions;
  const interviewInteractionController = createInterviewInteractionController({
    elements: els,
    windowRef: window,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    typeDefs: interviewTypeDefs,
    isOnboarding: () => isInterviewOnboarding(),
    updateLayout: updateInterviewLayout,
    updateActionPanel: updateInterviewActionPanel,
    normalizeRichText: normalizeRichTextContent,
    appendMessage: (...args) => appendInterviewMessage(...args),
    autoSizeAnswer: autoSizeInterviewAnswer,
    getVoiceRecognition: () => interviewRuntime.getVoiceRecognition(),
    setVoiceRecognition: (recognition) => interviewRuntime.setVoiceRecognition(recognition)
  });
  const updateInterviewStatus = interviewInteractionController.updateStatus;
  const setInterviewTimer = interviewInteractionController.setTimer;
  const getInterviewQuestionSpeechText = interviewInteractionController.getQuestionSpeechText;
  const speakInterviewText = interviewInteractionController.speakText;
  const stopInterviewSpeech = interviewInteractionController.stopSpeech;
  const toggleVoiceAnswer = interviewInteractionController.toggleVoiceAnswer;
  const interviewSessionLifecycleController = createInterviewSessionLifecycleController({
    windowRef: window,
    storageKey: INTERVIEW_SESSION_STORAGE_KEY,
    resumeStorageKey: INTERVIEW_RESUME_STORAGE_KEY,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    summarizeAttachment,
    clearTimers: () => interviewRuntime.clearTimers(),
    clearQuestionTimer: () => interviewRuntime.clearQuestionTimer(),
    clearTypingTimers: () => interviewRuntime.clearTypingTimers(),
    setQuestionTimer: (timer) => interviewRuntime.setQuestionTimer(timer),
    setSnapshotRestored: (value) => interviewRuntime.setSnapshotRestored(value),
    setTimer: setInterviewTimer,
    appendMessage: (...args) => appendInterviewMessage(...args),
    updateStatus: (...args) => updateInterviewStatus(...args),
    renderTranscript: renderInterviewTranscript,
    renderQuestionPanel: renderInterviewQuestionPanel,
    syncLanguageControls: syncInterviewLanguageControls,
    resetInterview: () => resetInterview(),
    isLive: () => isInterviewLiveMode()
  });
  const clearInterviewTimers = interviewSessionLifecycleController.clearTimers;
  const clearInterviewQuestionTimer = interviewSessionLifecycleController.clearQuestionTimer;
  const persistInterviewSessionSnapshot = interviewSessionLifecycleController.persistSnapshot;
  const hasDurableInterview = interviewSessionLifecycleController.hasDurable;
  const exitInterview = interviewSessionLifecycleController.exit;
  const resumeDurableInterview = interviewSessionLifecycleController.resumeDurable;
  const restoreInterviewSessionSnapshot = interviewSessionLifecycleController.restoreSnapshot;
  const interviewMessageController = createInterviewMessageController({
    elements: els,
    windowRef: window,
    getMessages: () => interviewState.messages,
    setMessages(messages) {
      interviewState.messages = messages;
    },
    makeId,
    renderTranscript: renderInterviewTranscript,
    renderRichText,
    scheduleMathTypeset,
    setTypingTimer: (id, timer) => interviewRuntime.setTypingTimer(id, timer),
    clearTypingTimer: (id) => interviewRuntime.clearTypingTimer(id)
  });
  const appendInterviewMessage = interviewMessageController.appendMessage;
  const updateInterviewMessage = interviewMessageController.updateMessage;
  const interviewResultsController = createInterviewResultsController({
    elements: els,
    windowRef: window,
    sessionStorageKey: INTERVIEW_SESSION_STORAGE_KEY,
    historyStorageKey: INTERVIEW_HISTORY_STORAGE_KEY,
    getInterviewState: () => interviewState,
    getUserState: () => userState.value,
    skillDefs,
    makeId,
    normalizeCategory,
    formatCategory: formatCategoryLabel,
    getSelectedProblem,
    getCurrentQuestionMessages,
    formatCurrentQuestionConversation,
    parseEvaluation: parseInterviewFeedbackEvaluation,
    updateProblemState,
    saveState,
    renderFavorites: renderInterviewFavorites,
    renderSummary,
    renderModule: (id) => getModuleLifecycle(id)?.render?.(),
    renderProblems,
    renderQuestionPanel: renderInterviewQuestionPanel,
    clearQuestionTimer: clearInterviewQuestionTimer,
    updateStatus: updateInterviewStatus,
    appendMessage: appendInterviewMessage,
    showQuestion: (index) => showInterviewQuestion(index),
    getLocalizedProblemField,
    getProblemMediaMarkdown,
    isLive: () => isInterviewLiveMode(),
    isOnboarding: () => isInterviewOnboarding()
  });
  const saveCurrentInterviewFavorite = interviewResultsController.saveFavorite;
  const shareCurrentInterviewQuestion = interviewResultsController.shareQuestion;
  const recordInterviewPractice = interviewResultsController.recordPractice;
  const goToNextInterviewQuestion = interviewResultsController.goToNextQuestion;
  const completeInterview = interviewResultsController.complete;
  const exportInterviewReport = interviewResultsController.exportReport;
  const revealInterviewAnswer = interviewResultsController.revealAnswer;
  interviewSessionFlowController = createInterviewSessionFlowController({
    elements: els,
    windowRef: window,
    sessionStorageKey: INTERVIEW_SESSION_STORAGE_KEY,
    getInterviewState: () => interviewState,
    getRuntimeState: () => interviewRuntime.state,
    resetSessionUiState: () => interviewRuntime.resetSessionUiState(),
    clearTimers: () => clearInterviewTimers(),
    clearQuestionTimer: () => clearInterviewQuestionTimer(),
    setPrepTimer: (timer) => interviewRuntime.setPrepTimer(timer),
    clearPrepTimer: () => interviewRuntime.clearPrepTimer(),
    setQuestionTimer: (timer) => interviewRuntime.setQuestionTimer(timer),
    stopSpeech: () => stopInterviewSpeech(),
    renderSetup: () => renderInterviewSetup(),
    updateAnswerFileMeta: () => updateInterviewAnswerFileMeta(),
    updateStatus: (...args) => updateInterviewStatus(...args),
    renderTranscript: () => renderInterviewTranscript(),
    renderQuestionPanel: () => renderInterviewQuestionPanel(),
    normalizeSessionConfig: (...args) => normalizeInterviewSessionConfig(...args),
    getTypeForConfig: (...args) => getInterviewTypeForConfig(...args),
    getQuestionCountForConfig: (...args) => getInterviewQuestionCountForConfig(...args),
    getQuestionSecondsForConfig: (...args) => getInterviewQuestionSecondsForConfig(...args),
    formatConfigSummary: (...args) => formatInterviewConfigSummary(...args),
    buildPdfQuestions: (...args) => buildPdfInterviewQuestions(...args),
    buildFullRangeQuestions: (...args) => buildFullRangeInterviewQuestions(...args),
    appendMessage: (...args) => appendInterviewMessage(...args),
    persistSnapshot: () => persistInterviewSessionSnapshot(),
    setTimer: (...args) => setInterviewTimer(...args),
    getMaxFollowups: (...args) => getInterviewMaxFollowups(...args),
    formatQuestion: (...args) => formatInterviewQuestion(...args),
    completeInterview: () => completeInterview(),
    autoSizeAnswer: () => autoSizeInterviewAnswer(),
    syncLanguageControls: () => syncInterviewLanguageControls(),
    handleOnboardingAnswer: (...args) => handleOnboardingAnswer(...args),
    isLive: () => isInterviewLiveMode()
  });
  sliceRefs.interviewSessionFlowController = interviewSessionFlowController;
  resetInterview = interviewSessionFlowController.reset;
  finalizeInterviewOnboarding = interviewSessionFlowController.finalizeOnboarding;
  showInterviewQuestion = interviewSessionFlowController.showQuestion;
  const restartInterviewWithSameConfig = interviewSessionFlowController.restartWithSameConfig;
  interviewAnswerController = createInterviewAnswerController({
    elements: els,
    getInterviewState: () => interviewState,
    isOnboarding: () => isInterviewOnboarding(),
    isLive: () => isInterviewLiveMode(),
    handleOnboardingAnswer: (...args) => handleOnboardingAnswer(...args),
    getSelectedProblem,
    appendMessage: (...args) => appendInterviewMessage(...args),
    updateMessage: (...args) => updateInterviewMessage(...args),
    autoSizeAnswer: () => autoSizeInterviewAnswer(),
    updateAnswerFileMeta: () => updateInterviewAnswerFileMeta(),
    clearQuestionTimer: () => clearInterviewQuestionTimer(),
    requestFeedback: (...args) => requestInterviewFeedback(...args),
    normalizeFeedback: (...args) => normalizeInterviewFeedback(...args),
    localFeedback: (...args) => localInterviewFeedback(...args),
    recordPractice: (...args) => recordInterviewPractice(...args),
    persistSnapshot: () => persistInterviewSessionSnapshot(),
    renderQuestionPanel: () => renderInterviewQuestionPanel(),
    completeInterview: () => completeInterview(),
    updateStatus: (...args) => updateInterviewStatus(...args),
    getCurrentConversation: () => getCurrentInterviewConversation(),
    summarizeAttachment: (...args) => summarizeAttachment(...args),
    updateActionPanel: () => updateInterviewActionPanel(),
    requestConverse: (...args) => requestInterviewConverse(...args),
    normalizeConverseReply: (...args) => normalizeInterviewConverseReply(...args),
    localConverse: (...args) => localInterviewConverse(...args),
    recordLiveQuestionResult: (...args) => recordLiveInterviewQuestionResult(...args),
    requestHintFromApi: (...args) => requestInterviewHintFromApi(...args),
    localHint: (...args) => localInterviewHint(...args)
  });
  sliceRefs.interviewAnswerController = interviewAnswerController;
  const requestInterviewHint = (...args) => interviewAnswerController?.requestHint?.(...args);
  const submitInterviewAnswer = (...args) => interviewAnswerController?.submit?.(...args);
  return { animateInterviewScores, appendInlineRichText, appendInterviewMessage, autoSizeInterviewAnswer, buildFullRangeInterviewQuestions, buildPdfInterviewQuestions, clearInterviewQuestionTimer, clearInterviewTimers, completeInterview, createInterviewDimensionMiniBars, createInterviewPanelStats, exitInterview, exportInterviewReport, finalizeInterviewOnboarding, formatCurrentQuestionConversation, formatInterviewCategorySummary, formatInterviewConfigSummary, formatInterviewQuestion, getCurrentInterviewConversation, getCurrentQuestionMessages, getInterviewAnswerMode, getInterviewAvailableCategories, getInterviewFavorites, getInterviewMaxFollowups, getInterviewQuestionCount, getInterviewQuestionCountForConfig, getInterviewQuestionSeconds, getInterviewQuestionSecondsForConfig, getInterviewQuestionSpeechText, getInterviewSelectedCategories, getInterviewSetupLanguage, getInterviewSetupMode, getInterviewSource, getInterviewType, getInterviewTypeForConfig, getSelectedProblem, getSerializableInterviewTranscript, goToNextInterviewQuestion, handleInterviewAnswerKeydown, handleOnboardingAnswer, hasDurableInterview, interviewAnswerController, interviewApiController, interviewFeedbackController, interviewFocusDefs, interviewInteractionController, interviewMessageController, interviewOnboardingController, interviewQuestionBuilderController, interviewResultsController, interviewRuntime, interviewSessionFlowController, interviewSessionLifecycleController, interviewSetupController, interviewState, interviewTypeDefs, interviewViewController, isCurrentOnboardingStep, isInterviewLiveMode, isInterviewOnboarding, localInterviewConverse, localInterviewFeedback, localInterviewHint, makeInterviewBaseProblemPool, makeInterviewProblemPool, normalizeInterviewConverseReply, normalizeInterviewFeedback, normalizeInterviewSessionConfig, normalizeRichTextContent, parseInterviewFeedbackEvaluation, persistInterviewSessionSnapshot, recordInterviewPractice, recordLiveInterviewQuestionResult, renderInterviewCategoryPicker, renderInterviewFavorites, renderInterviewQuestionPanel, renderInterviewSetup, renderInterviewTranscript, renderRichText, requestInterviewConverse, requestInterviewFeedback, requestInterviewHint, requestInterviewHintFromApi, requestPdfQuestionGeneration, resetInterview, restartInterviewWithSameConfig, restoreInterviewSessionSnapshot, resumeDurableInterview, revealInterviewAnswer, saveCurrentInterviewFavorite, scheduleMathTypeset, selectProblemForInterview, setInterviewPanelExpandedIndex, setInterviewTimer, shareCurrentInterviewQuestion, showInterviewQuestion, speakInterviewText, startInterview, submitInterviewAnswer, stopInterviewSpeech, summarizeAttachment, syncInterviewLanguageControls, toggleInterviewCategory, toggleInterviewPanel, toggleVoiceAnswer, updateInterviewActionPanel, updateInterviewAnswerFileMeta, updateInterviewAnswerMode, updateInterviewLayout, updateInterviewMessage, updateInterviewPdfMeta, updateInterviewSetupVisibility, updateInterviewStatus };

}
