import {
  STORAGE_KEY, AUTH_KEY, USER_STATE_PREFIX, LLM_CONFIG_KEY, PENDING_CAPTURE_KEY,
  APP_PREFS_KEY, COMMUNITY_KEY, CLOUD_CONFIG_KEY, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE,
  RUNTIME_CONFIG, DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL, DEFAULT_GOOGLE_CLIENT_ID,
  GOOGLE_LOGIN_FLAG, GOOGLE_LOGIN_ENABLED, LLM_DEFAULTS_VERSION, LLM_MODEL_OPTIONS,
  DEFAULT_CLOUD_API_ENDPOINT, CLOUD_SYNC_DEBOUNCE_MS, SCORE_XP_PER_POINT,
  NEWS_AUTO_REFRESH_MS, NEWS_RETRY_MS, NEWS_TOPIC_QUERY_PACKS, NEWS_SOURCE_FILTERS,
  JOBS_AUTO_REFRESH_MS, JOBS_RETRY_MS, POKER_RANKS, POKER_SUITS, POKER_BLIND_LEVELS,
  POKER_HAND_NAMES, DEFAULT_GRADUATION_TERM, leetcodeHot100
} from './constants.js';
import { skillDefs } from './skills.js';
import {
  prepRoleDefs, prepSeasonDefs, prepProcessStages, prepSourceLinks,
  prepDiagnosticQuestions, locationDefs, regionEnLabels
} from './prep-data.js';
import { i18n } from './i18n.js';
import {
  sampleEntries, problemTagLabels, exerciseTitleOverrides, seedProblems,
  catalogProblems, disabledProblemSources, disabledProblemBookNames,
  seedNews, seedJobs, quantCompanyDefs, seedCourses
} from './catalog-data.js';

const libraryCatalog = Array.isArray(globalThis.quantLibraryCatalog) ? globalThis.quantLibraryCatalog : [];

const PROBLEM_MEDIA_FIELD_KEYS = [
  "image",
  "imageUrl",
  "imageUrls",
  "images",
  "diagram",
  "diagramUrl",
  "promptImage",
  "promptImages",
  "answerImage",
  "answerImages",
  "explanationImage",
  "explanationImages",
  "solutionImage",
  "solutionImages"
];

const PROBLEM_LOCALIZED_FIELD_KEYS = [
  "answerEn",
  "answerZh",
  "explanationEn",
  "explanationZh",
  "hint",
  "quantguide"
];

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("load", () => {
  requestAnimationFrame(() => window.scrollTo(0, 0));
  window.setTimeout(() => window.scrollTo(0, 0), 80);
}, { once: true });


let appPrefs = loadAppPrefs();
let community = loadCommunity();
let auth = loadAuth();
let currentUser = getCurrentUser();
let state = loadState();
let cloudConfig = loadCloudConfig();
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let cloudDirty = { state: false, community: false, account: false };
const LEADERBOARD_CLOUD_REFRESH_MS = 45_000;
let leaderboardCloudRows = [];
let leaderboardCloudLoadedAt = "";
let leaderboardCloudLoading = false;
let leaderboardCloudError = "";
let leaderboardCloudRefreshPromise = null;
let currentDrill = null;
let drillMode = "numberLogic";
let drillSession = null;
let drillTimerId = null;
let currentMarketGame = null;
let currentPokerGame = null;
let selectedPokerPreflopHand = "AKs";
let selectedMessageThreadId = "";
let googleInitRetries = 0;
let registerCodeTimer = null;
let interviewLanguage = "zh";
let interviewMessages = [];
let selectedInterviewProblemId = "";
let selectedProblemDetailId = "";
let selectedInterviewCategories = new Set(["all"]);
let interviewSession = null;
let interviewPreparing = false;
let interviewPrepTimer = null;
let interviewQuestionTimer = null;
let interviewVoiceRecognition = null;
let interviewTypingTimers = new Map();
let interviewPanelExpandedIndex = 0;
let interviewSnapshotRestored = false;
let mathTypesetTimer = null;
let llmConfig = loadLlmConfig();
let latestClassification = null;
let classifyTimer = null;
let pkSession = null;
let newsRefreshInFlight = false;
let jobsRefreshInFlight = false;
let activeNewsDetailId = "";
let newsTopicFilter = "all";
let newsSourceFilter = "all";
let globalSearchMatches = [];
let globalSearchTimer = 0;
let globalSearchComposing = false;
let problemCatalogRefresh = null;
let radarHitAreas = [];
let radarHoverKey = "";
let radarAnimatedValues = null;
let radarTargetValues = null;
let radarAnimationFrame = 0;
let prepPlanEditorOpen = false;
let pendingExperienceShareId = "";
let communityFilter = "all";
let problemSocial = new Map();
let problemViewMode = "all";
let problemThemeFilter = "all";
let problemDifficultyFilter = "all";
let problemCompanyFilter = "all";
let problemSourceFilter = "all";
let companyTierFilter = "all";
let problemSocialNotice = "";
let libraryKindFilter = "all";
let leetcodeHotExpanded = false;
let libraryQuery = "";
let todoDockOpen = false;
let heroTypewriterTimer = null;
let streakPanelOpen = false;
let freshCheckInKey = "";
let checkInToastTimer = null;
const PROBLEM_PAGE_SIZE = 24;
const PROBLEM_SEARCH_DEBOUNCE_MS = 140;
const INTERVIEW_SESSION_STORAGE_KEY = "quantgym-interview-session-v2";
const INTERVIEW_HISTORY_STORAGE_KEY = "quantgym-interview-history-v1";
const INTERVIEW_RESUME_STORAGE_KEY = "quantgym-interview-resume-v1";
let problemVisibleCount = PROBLEM_PAGE_SIZE;
let problemSearchTimer = 0;
let problemSearchComposing = false;
const problemSearchRecordCache = new Map();
const problemCompanyCache = new Map();
let problemStateCacheSource = null;
let problemStateCache = null;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  bindElements();
  bindEvents();
  setupButtonRipples();
  renderSession();
  initGoogleLogin();
  if (currentUser) renderMentalMath();
  window.setInterval(maybeAutoRefreshNews, NEWS_AUTO_REFRESH_MS);
  window.setInterval(maybeAutoRefreshJobs, JOBS_AUTO_REFRESH_MS);
  window.addEventListener("resize", updateGlobalSearchPlaceholder);
  refreshIcons();
  initSharkInteractions();
});

function bindElements() {
  [
    "todayLine",
    "regionRank",
    "regionMedal",
    "regionRankText",
    "authShell",
    "appShell",
    "moduleNav",
    "sidebarToggleBtn",
    "loginForm",
    "loginEmail",
    "loginPassword",
    "registerForm",
    "registerName",
    "registerEmail",
    "registerPassword",
    "registerVerificationCode",
    "sendRegisterCodeBtn",
    "googleButton",
    "googleClientIdInput",
    "saveGoogleClientBtn",
    "authMessage",
    "userChip",
    "userAvatar",
    "userName",
    "userProvider",
    "commandUserAvatar",
    "commandUserName",
    "commandUserProvider",
    "commandChatBtn",
    "commandUnreadCount",
    "languageSelect",
    "settingsBtn",
    "logoutBtn",
    "accountForm",
    "accountAvatarPreview",
    "accountAvatarUrl",
    "accountAvatarFile",
    "accountClearAvatarBtn",
    "accountNameInput",
    "accountEmailInput",
    "accountCountrySelect",
    "accountRegionSelect",
    "accountGraduationTermInput",
    "accountResumeFile",
    "accountResumeMeta",
    "accountCurrentPassword",
    "accountMessage",
    "accountProviderText",
    "accountCreatedText",
    "accountRankText",
    "rankName",
    "totalXp",
    "commandStreakCount",
    "streakWidget",
    "checkInPill",
    "streakCalendarPanel",
    "streakPanelCount",
    "streakCalendarWeekdays",
    "streakCalendarGrid",
    "streakPanelMessage",
    "heroTypewriter",
    "generateStudyPlanBtn",
    "todayPlanCard",
    "overviewProblemProgress",
    "overviewXpBars",
    "overviewContributionHeatmap",
    "editPrepPlanBtn",
    "prepPlanSetupForm",
    "prepRoleSelect",
    "prepHoursSelect",
    "prepPlanDashboard",
    "newExperienceBtn",
    "experienceForm",
    "experienceFormTitle",
    "experienceId",
    "experienceFirm",
    "experienceRole",
    "experienceStage",
    "experienceSeason",
    "experienceDate",
    "experienceOutcome",
    "experienceTags",
    "experienceSummaryInput",
    "experienceTopics",
    "experienceReflection",
    "cancelExperienceEditBtn",
    "experienceCount",
    "sharedExperienceCount",
    "openCommunityExperiencesBtn",
    "experienceFilter",
    "experienceList",
    "streakCount",
    "entryCount",
    "weeklyXp",
    "overviewCommunityExpandBtn",
    "overviewCommunityForm",
    "overviewCommunityText",
    "overviewCommunityMedia",
    "overviewCommunityMediaPreview",
    "overviewCommunityList",
    "overviewCommunitySummary",
    "communityForm",
    "communityText",
    "communityMedia",
    "communityMediaPreview",
    "communityList",
    "communitySummary",
    "messagesPageTitle",
    "messagesSummary",
    "messageThreadList",
    "messageConversationHeader",
    "messageConversationBody",
    "messageComposerForm",
    "messageComposerInput",
    "librarySearch",
    "libraryKindTabs",
    "libraryStats",
    "libraryContinueShelf",
    "libraryBookGrid",
    "libraryQuestionGrid",
    "libraryEmpty",
    "libraryReaderOverlay",
    "libraryReaderFrame",
    "libraryReaderTitle",
    "libraryReaderMeta",
    "libraryReaderClose",
    "libraryReaderOpenNew",
    "logForm",
    "logText",
    "durationInput",
    "difficultyInput",
    "analysisPreview",
    "autoClassifyChips",
    "problemSearch",
    "addProblemBtn",
    "problemForm",
    "problemTitleEn",
    "problemTitleZh",
    "problemCategory",
    "problemDifficulty",
    "problemTags",
    "problemSourceUrl",
    "problemPromptEn",
    "problemPromptZh",
    "problemAnswer",
    "problemExplanation",
    "problemImportForm",
    "problemJsonInput",
    "problemInteractionStatus",
    "problemSourceFilterClearBtn",
    "problemCompletionProgress",
    "problemThemeFilter",
    "problemThemeSummary",
    "problemDifficultyFilter",
    "problemCompanyPanel",
    "problemCompanyTitle",
    "problemCompanySummary",
    "problemCompanyClearBtn",
    "problemCompanyList",
    "problemRanking",
    "problemRankingList",
    "leetcodeHotTitle",
    "leetcodeHotSummary",
    "leetcodeHotProgressLabel",
    "leetcodeHotProgressText",
    "leetcodeHotProgressFill",
    "leetcodeHotToggleBtn",
    "leetcodeHotPlanLink",
    "leetcodeHotList",
    "problemList",
    "loadMoreProblemsBtn",
    "problemDetail",
    "todoDockButton",
    "todoDockButtonLabel",
    "todoDockCount",
    "todoDockPanel",
    "todoDockCloseBtn",
    "todoDockEyebrow",
    "todoDockTitle",
    "todoDockSummary",
    "todoDockList",
    "todoDockEmpty",
    "todoDockAddForm",
    "todoDockAddInput",
    "interviewSummary",
    "interviewTypeSelect",
    "interviewQuestionCount",
    "interviewQuestionTime",
    "interviewAnswerModeSelect",
    "interviewSourceSelect",
    "interviewPdfRow",
    "interviewPdfInput",
    "interviewPdfMeta",
    "interviewCategoryRow",
    "interviewCategoryPicker",
    "interviewGrid",
    "interviewSetup",
    "interviewConsole",
    "llmEndpointInput",
    "llmModelInput",
    "startInterviewBtn",
    "saveLlmConfigBtn",
    "interviewSessionTitle",
    "interviewQuestionStatus",
    "interviewTimer",
    "toggleInterviewPanelBtn",
    "exitInterviewBtn",
    "resumeInterviewBtn",
    "interviewTranscript",
    "interviewQuestionPanel",
    "interviewForm",
    "interviewAnswer",
    "interviewAnswerFileRow",
    "interviewAnswerFile",
    "interviewAnswerFileMeta",
    "interviewAttachmentPreview",
    "hintInterviewBtn",
    "revealAnswerBtn",
    "interviewCompleteActions",
    "nextInterviewQuestionBtn",
    "saveInterviewFavoriteBtn",
    "shareInterviewQuestionBtn",
    "restartInterviewBtn",
    "exportInterviewReportBtn",
    "interviewFavoritesSummary",
    "interviewFavoritesList",
    "voiceAnswerBtn",
    "clearInterviewBtn",
    "startPkBtn",
    "pkUserScore",
    "pkOpponentName",
    "pkOpponentScore",
    "pkProblem",
    "pkForm",
    "pkAnswer",
    "pkRevealBtn",
    "pkFeed",
    "newsTickerTrack",
    "newsUpdatedAt",
    "newsIntelTitle",
    "newsIntelSummary",
    "newsIntelStats",
    "newsTopicFilter",
    "newsSourceFilter",
    "newsSocialHint",
    "newsList",
    "addNewsBtn",
    "refreshNewsBtn",
    "newsForm",
    "newsTitle",
    "newsSource",
    "newsUrl",
    "newsSourceType",
    "newsPrimarySkill",
    "newsTags",
    "newsSummary",
    "newsInsight",
    "newsDetail",
    "newsBackBtn",
    "newsDetailReadBadge",
    "newsDetailMeta",
    "newsDetailTitle",
    "newsDetailSummary",
    "newsDetailInsight",
    "newsDetailPills",
    "newsDetailLink",
    "refreshJobsBtn",
    "addNetworkBtn",
    "networkForm",
    "networkName",
    "networkCompany",
    "networkRole",
    "networkStatus",
    "networkChannel",
    "networkNextStep",
    "networkNotes",
    "networkList",
    "networkSummary",
    "resumeForm",
    "resumeText",
    "reviewResumeBtn",
    "saveResumeBtn",
    "resumeSummary",
    "resumeReview",
    "jobsSummary",
    "jobsList",
    "companiesPageTitle",
    "companiesSummary",
    "companyTierFilter",
    "companyOverviewList",
    "coursesSummary",
    "courseList",
    "coursePathList",
    "skillsPageTitle",
    "skillsPageSubtitle",
    "skillsScoreLabel",
    "skillsScoreValue",
    "skillsScoreCopy",
    "skillsEntriesCount",
    "skillsEntriesLabel",
    "skillsAverageScore",
    "skillsAverageLabel",
    "skillsWeakestSkill",
    "skillsWeakestLabel",
    "skillRadarTitle",
    "skillRadarHint",
    "skillRadarLegend",
    "skillRadarTooltip",
    "skillsGrid",
    "skillTemplate",
    "historyList",
    "leaderboardList",
    "leaderboardMetricSelect",
    "leaderboardScopeSelect",
    "leaderboardCountrySelect",
    "leaderboardRegionSelect",
    "leaderboardScopeSummary",
    "sampleBtn",
    "exportBtn",
    "importInput",
    "resetBtn",
    "refreshLeaderboardBtn",
    "clearTodayBtn",
    "skillRadar",
    "drillQuestion",
    "drillForm",
    "drillInput",
    "drillOptions",
    "drillFeedback",
    "drillScore",
    "drillAccuracy",
    "drillTimer",
    "drillProgressText",
    "drillTimeLeftText",
    "drillProgressFill",
    "drillCountSelect",
    "drillTimeSelect",
    "startDrillSessionBtn",
    "skipDrillBtn",
    "nextDrillBtn",
    "mentalBestScore",
    "mentalSparkline",
    "mentalRecordList",
    "mentalLeaderboardList",
    "marketGameScore",
    "marketGamePrompt",
    "marketBidInput",
    "marketAskInput",
    "submitMarketQuoteBtn",
    "nextMarketGameBtn",
    "marketGameFeedback",
    "pokerGameScore",
    "pokerPlayerCount",
    "pokerRoomCode",
    "pokerLobbySummary",
    "pokerRoomLinkInput",
    "pokerCopyLinkBtn",
    "pokerPlayerNameInput",
    "pokerTakeSeatBtn",
    "pokerAddBotBtn",
    "pokerFillBotsBtn",
    "pokerStartTournamentBtn",
    "pokerLobbyList",
    "pokerGamePrompt",
    "pokerModeSelect",
    "pokerMatchBtn",
    "pokerTable",
    "pokerSeatGrid",
    "pokerBoard",
    "pokerPot",
    "pokerStageText",
    "pokerBlindText",
    "pokerTurnPrompt",
    "pokerRaiseInput",
    "nextPokerGameBtn",
    "resetPokerGameBtn",
    "pokerGameFeedback",
    "pokerLog",
    "pokerPreflopPositionSelect",
    "pokerPreflopMatrix",
    "pokerPreflopDetail",
    "resourceForm",
    "resourceTitle",
    "resourceType",
    "resourceFile",
    "resourceContent",
    "resourceSources",
    "resourceList",
    "addResourceBtn",
    "settingsForm",
    "settingsLanguageSelect",
    "settingsCountrySelect",
    "settingsRegionSelect",
    "settingsLlmEndpointInput",
    "settingsLlmModelInput",
    "settingsCloudApiInput",
    "settingsGoogleClientIdInput",
    "settingsMessage",
    "syncCloudBtn",
    "globalSearchInput",
    "globalSearchResults"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      switchModule(button.dataset.moduleTab);
    });
  });

  document.querySelectorAll("[data-jump-module]").forEach((button) => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      switchModule(button.dataset.jumpModule);
    });
  });

  els.sidebarToggleBtn?.addEventListener("click", toggleSidebarNav);

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginLocal();
  });

  els.registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registerLocal();
  });

  els.sendRegisterCodeBtn?.addEventListener("click", sendRegisterVerificationCode);
  els.saveGoogleClientBtn?.addEventListener("click", saveGoogleClientId);
  els.userChip.addEventListener("click", () => switchModule("account"));
  els.languageSelect.addEventListener("change", () => setLanguage(els.languageSelect.value));
  els.settingsBtn.addEventListener("click", () => switchModule("settings"));
  els.logoutBtn.addEventListener("click", logout);
  els.checkInPill?.addEventListener("click", toggleStreakPanel);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".streak-widget")) setStreakPanelOpen(false);
  });
  els.generateStudyPlanBtn?.addEventListener("click", () => switchModule("plan"));
  els.prepPlanSetupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createPrepPlan();
  });
  els.editPrepPlanBtn?.addEventListener("click", () => {
    prepPlanEditorOpen = true;
    renderPrepPlan();
  });
  els.prepPlanDashboard?.addEventListener("click", handlePrepPlanAction);
  els.prepPlanDashboard?.addEventListener("submit", (event) => {
    if (!event.target.matches("#prepDiagnosticForm")) return;
    event.preventDefault();
    submitPrepDiagnostic(event.target);
  });
  els.newExperienceBtn?.addEventListener("click", resetExperienceForm);
  els.cancelExperienceEditBtn?.addEventListener("click", resetExperienceForm);
  els.experienceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveInterviewExperience();
  });
  els.experienceFilter?.addEventListener("change", renderExperiences);
  els.experienceList?.addEventListener("click", handleExperienceListAction);
  els.openCommunityExperiencesBtn?.addEventListener("click", () => {
    communityFilter = "experience";
    renderCommunity();
  });

  els.accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAccount();
  });
  els.accountAvatarUrl.addEventListener("input", updateAccountAvatarPreview);
  els.accountAvatarFile.addEventListener("change", handleAccountAvatarFile);
  els.accountClearAvatarBtn.addEventListener("click", clearAccountAvatar);
  els.accountCountrySelect.addEventListener("change", () => {
    renderRegionOptions(els.accountRegionSelect, els.accountCountrySelect.value);
  });
  els.accountResumeFile?.addEventListener("change", handleAccountResumeFile);
  els.saveResumeBtn?.addEventListener("click", saveResumeText);
  els.resumeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    reviewResumeWithLlm();
  });
  document.querySelectorAll("[data-job-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-job-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderJobs(button.dataset.jobFilter || "all");
    });
  });
  els.refreshJobsBtn?.addEventListener("click", () => refreshJobsFromApi(true));
  els.companyTierFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-company-tier]");
    if (!button) return;
    companyTierFilter = button.dataset.companyTier || "all";
    renderCompanies();
  });
  els.companyOverviewList?.addEventListener("click", (event) => {
    const practice = event.target.closest("[data-company-practice]");
    if (practice) {
      showCompanyProblems(practice.dataset.companyPractice);
      return;
    }
    const careers = event.target.closest("[data-company-careers]");
    if (careers) openExternalUrl(careers.dataset.companyCareers);
  });

  els.globalSearchInput?.addEventListener("compositionstart", () => {
    globalSearchComposing = true;
  });
  els.globalSearchInput?.addEventListener("compositionend", () => {
    globalSearchComposing = false;
    scheduleGlobalSearchResults();
  });
  els.globalSearchInput?.addEventListener("input", scheduleGlobalSearchResults);
  els.globalSearchInput?.addEventListener("focus", renderGlobalSearchResults);
  els.globalSearchInput?.addEventListener("keydown", handleGlobalSearchKeydown);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".app-search")) hideGlobalSearchResults();
  });

  els.logForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addEntry();
  });

  els.logText.addEventListener("input", scheduleClassificationPreview);
  els.durationInput.addEventListener("input", updatePreview);
  els.difficultyInput.addEventListener("change", updatePreview);

  els.overviewCommunityExpandBtn.addEventListener("click", () => switchModule("community"));
  bindCommunityComposer("overview");
  bindCommunityComposer("full");
  document.querySelectorAll("[data-community-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      communityFilter = button.dataset.communityFilter === "experience" ? "experience" : "all";
      renderCommunity();
    });
  });
  els.messageThreadList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-message-thread]");
    if (!button) return;
    selectedMessageThreadId = button.dataset.messageThread || "";
    markThreadRead(selectedMessageThreadId);
    renderMessages();
  });
  els.messageComposerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendDirectMessage();
  });
  els.librarySearch?.addEventListener("input", () => {
    libraryQuery = normalizeSearchQuery(els.librarySearch.value);
    renderLibrary();
  });
  els.libraryKindTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-library-kind]");
    if (!button) return;
    libraryKindFilter = ["book", "questionSet"].includes(button.dataset.libraryKind) ? button.dataset.libraryKind : "all";
    renderLibrary();
  });
  [els.libraryContinueShelf, els.libraryBookGrid, els.libraryQuestionGrid].filter(Boolean).forEach((container) => {
    container.addEventListener("click", handleLibraryAction);
  });
  els.libraryReaderClose?.addEventListener("click", closeLibraryReader);
  els.libraryReaderOverlay?.addEventListener("click", (event) => {
    if (event.target === els.libraryReaderOverlay) closeLibraryReader();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.libraryReaderOverlay?.classList.contains("hidden")) closeLibraryReader();
  });

  els.sampleBtn.addEventListener("click", () => {
    els.logText.value = sampleEntries[Math.floor(Math.random() * sampleEntries.length)];
    els.durationInput.value = "45";
    updatePreview();
  });

  els.problemSearch.addEventListener("compositionstart", () => {
    problemSearchComposing = true;
  });
  els.problemSearch.addEventListener("compositionend", () => {
    problemSearchComposing = false;
    handleProblemSearchInput();
  });
  els.problemSearch.addEventListener("input", handleProblemSearchInput);
  els.problemSearch.addEventListener("keydown", handleProblemSearchKeydown);
  els.problemThemeFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-theme]");
    if (!button) return;
    problemThemeFilter = button.dataset.problemTheme || "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemDifficultyFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-difficulty]");
    if (!button) return;
    problemDifficultyFilter = normalizeDifficultyFilter(button.dataset.problemDifficulty || "all");
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemCompanyList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-company]");
    if (!button) return;
    problemCompanyFilter = button.dataset.problemCompany || "all";
    problemViewMode = "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemCompanyClearBtn?.addEventListener("click", () => {
    problemCompanyFilter = "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemSourceFilterClearBtn?.addEventListener("click", () => {
    problemSourceFilter = "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.leetcodeHotToggleBtn?.addEventListener("click", () => {
    leetcodeHotExpanded = !leetcodeHotExpanded;
    renderLeetcodeHot100();
  });
  els.todoDockButton?.addEventListener("click", () => {
    todoDockOpen = !todoDockOpen;
    renderTodoDock();
  });
  els.todoDockCloseBtn?.addEventListener("click", () => {
    todoDockOpen = false;
    renderTodoDock();
  });
  els.todoDockPanel?.addEventListener("click", handleTodoDockClick);
  els.todoDockPanel?.addEventListener("change", handleTodoDockEdit);
  els.todoDockAddForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    addTodoTask();
  });
  els.addProblemBtn.addEventListener("click", () => {
    els.problemForm.classList.toggle("hidden");
    if (!els.problemForm.classList.contains("hidden")) els.problemTitleEn.focus();
  });
  els.problemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addProblemFromForm();
  });
  els.problemImportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    importProblemJson();
  });
  document.querySelectorAll("[data-problem-view]").forEach((button) => {
    button.addEventListener("click", () => {
      problemViewMode = ["saved", "ranking"].includes(button.dataset.problemView) ? button.dataset.problemView : "all";
      problemVisibleCount = PROBLEM_PAGE_SIZE;
      returnToProblemList();
    });
  });
  els.loadMoreProblemsBtn?.addEventListener("click", () => {
    problemVisibleCount += PROBLEM_PAGE_SIZE;
    renderProblems();
  });

  document.querySelectorAll("[data-interview-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-interview-lang]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      interviewLanguage = button.dataset.interviewLang;
      renderInterviewCategoryPicker();
      updateInterviewSetupVisibility();
      updateInterviewAnswerMode();
      renderInterviewTranscript();
      renderInterviewQuestionPanel();
    });
  });

  document.querySelectorAll("[data-interview-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-interview-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  [els.interviewTypeSelect, els.interviewQuestionCount, els.interviewQuestionTime, els.interviewSourceSelect].filter(Boolean).forEach((node) => {
    node.addEventListener("change", () => {
      if (node === els.interviewTypeSelect || node === els.interviewSourceSelect) selectedInterviewCategories = new Set(["all"]);
      updateInterviewSetupVisibility();
      renderInterviewSetup();
      resetInterview({ keepSetup: true });
    });
  });
  els.interviewCategoryPicker?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-interview-category]");
    if (!button) return;
    toggleInterviewCategory(button.dataset.interviewCategory);
  });
  [els.interviewQuestionCount, els.interviewQuestionTime].filter(Boolean).forEach((node) => {
    node.addEventListener("input", updateInterviewSetupVisibility);
  });
  els.interviewAnswerModeSelect?.addEventListener("change", updateInterviewAnswerMode);
  els.interviewPdfInput?.addEventListener("change", updateInterviewPdfMeta);
  els.interviewAnswerFile?.addEventListener("change", updateInterviewAnswerFileMeta);
  els.interviewAnswer?.addEventListener("input", autoSizeInterviewAnswer);
  els.interviewAnswer?.addEventListener("keydown", handleInterviewAnswerKeydown);
  els.interviewTranscript?.addEventListener("click", handleInterviewTranscriptAction);
  els.saveLlmConfigBtn?.addEventListener("click", saveLlmConfig);
  els.startInterviewBtn.addEventListener("click", startInterview);
  els.hintInterviewBtn?.addEventListener("click", requestInterviewHint);
  els.revealAnswerBtn.addEventListener("click", revealInterviewAnswer);
  els.nextInterviewQuestionBtn?.addEventListener("click", goToNextInterviewQuestion);
  els.saveInterviewFavoriteBtn?.addEventListener("click", saveCurrentInterviewFavorite);
  els.shareInterviewQuestionBtn?.addEventListener("click", shareCurrentInterviewQuestion);
  els.restartInterviewBtn?.addEventListener("click", restartInterviewWithSameConfig);
  els.exportInterviewReportBtn?.addEventListener("click", exportInterviewReport);
  els.toggleInterviewPanelBtn?.addEventListener("click", toggleInterviewPanel);
  els.exitInterviewBtn?.addEventListener("click", exitInterview);
  els.resumeInterviewBtn?.addEventListener("click", resumeDurableInterview);
  els.voiceAnswerBtn?.addEventListener("click", toggleVoiceAnswer);
  els.clearInterviewBtn?.addEventListener("click", resetInterview);
  els.interviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitInterviewAnswer();
  });

  els.startPkBtn.addEventListener("click", startPkMatch);
  els.pkRevealBtn.addEventListener("click", revealPkAnswer);
  els.pkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPkAnswer();
  });

  els.addNewsBtn.addEventListener("click", () => {
    els.newsForm.classList.toggle("hidden");
    if (!els.newsForm.classList.contains("hidden")) els.newsTitle.focus();
  });
  els.refreshNewsBtn.addEventListener("click", () => {
    refreshNewsFromApi(true);
  });
  els.newsTopicFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-news-topic]");
    if (!button) return;
    setNewsTopicFilter(button.dataset.newsTopic);
  });
  els.newsSourceFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-news-source-filter]");
    if (!button) return;
    setNewsSourceFilter(button.dataset.newsSourceFilter);
  });
  els.newsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addNewsFromForm();
  });
  els.newsBackBtn.addEventListener("click", closeNewsDetail);

  els.addNetworkBtn.addEventListener("click", () => {
    els.networkForm.classList.toggle("hidden");
    if (!els.networkForm.classList.contains("hidden")) els.networkName.focus();
  });
  els.networkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addNetworkContact();
  });

  els.exportBtn.addEventListener("click", exportState);
  els.importInput.addEventListener("change", importState);
  els.resetBtn.addEventListener("click", resetState);
  els.refreshLeaderboardBtn.addEventListener("click", () => refreshLeaderboardFromCloud(true));
  [
    els.leaderboardMetricSelect,
    els.leaderboardScopeSelect,
    els.leaderboardCountrySelect,
    els.leaderboardRegionSelect
  ].forEach((select) => select.addEventListener("change", updateLeaderboardSettings));
  els.clearTodayBtn.addEventListener("click", undoLatestEntry);

  els.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettings();
  });
  els.syncCloudBtn?.addEventListener("click", syncCloudNow);
  els.settingsLanguageSelect.addEventListener("change", () => setLanguage(els.settingsLanguageSelect.value));
  els.settingsCountrySelect.addEventListener("change", () => {
    renderRegionOptions(els.settingsRegionSelect, els.settingsCountrySelect.value);
  });

  setupSkillRadarInteractions();

  document.querySelectorAll("[data-drill]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-drill]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      drillMode = button.dataset.drill;
      startDrillSession();
    });
  });

  els.drillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = event.submitter?.dataset?.drillOption;
    if (selected) checkDrill(selected);
  });

  els.startDrillSessionBtn?.addEventListener("click", startDrillSession);
  els.skipDrillBtn?.addEventListener("click", skipDrill);
  els.nextDrillBtn?.addEventListener("click", () => advanceDrillQuestion());
  els.drillOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drill-option]");
    if (!button) return;
    checkDrill(button.dataset.drillOption);
  });
  els.submitMarketQuoteBtn?.addEventListener("click", submitMarketQuote);
  els.nextMarketGameBtn?.addEventListener("click", () => newMarketGame(true));
  document.querySelectorAll("[data-poker-action]").forEach((button) => {
    button.addEventListener("click", () => submitPokerAction(button.dataset.pokerAction));
  });
  els.nextPokerGameBtn?.addEventListener("click", () => newPokerGame(true));
  els.resetPokerGameBtn?.addEventListener("click", () => resetPokerTournament(true));
  els.pokerMatchBtn?.addEventListener("click", () => matchPokerTournament(true));
  els.pokerModeSelect?.addEventListener("change", () => resetPokerTournament(true));
  els.pokerCopyLinkBtn?.addEventListener("click", copyPokerRoomLink);
  els.pokerTakeSeatBtn?.addEventListener("click", () => takePokerSeat());
  els.pokerAddBotBtn?.addEventListener("click", () => addPokerBot(true));
  els.pokerFillBotsBtn?.addEventListener("click", () => fillPokerBots(true));
  els.pokerStartTournamentBtn?.addEventListener("click", () => startPokerTournament(true));
  els.pokerSeatGrid?.addEventListener("click", handlePokerSeatClick);
  els.pokerPreflopPositionSelect?.addEventListener("change", renderPokerPreflopChart);
  els.pokerPreflopMatrix?.addEventListener("click", handlePokerPreflopMatrixClick);
  els.courseList?.addEventListener("click", handleCourseListClick);
  els.courseList?.addEventListener("change", handleCourseNoteChange);
  els.coursePathList?.addEventListener("click", handleCourseListClick);

  els.addResourceBtn.addEventListener("click", () => {
    els.resourceForm.classList.toggle("hidden");
    if (!els.resourceForm.classList.contains("hidden")) {
      els.resourceTitle.focus();
    }
  });

  els.resourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addResource();
  });

  els.resourceFile.addEventListener("change", handleResourceFile);
}

function setupButtonRipples() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, .primary-button, .secondary-button, .module-tab, .segment, .library-card, .feature-launch-card, .leetcode-hot-link, .leetcode-hot-done, .todo-dock-button, .todo-task-toggle");
    if (!button || button.closest(".auth-provider-stack")) return;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
}

function createBaseState() {
  return {
    skills: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0])),
    entries: [],
    resources: [],
    network: [],
    interviewFavorites: [],
    mentalMathRecords: [],
    gameRecords: [],
    courseStates: [],
    problemStates: [],
    leetcodeHot100Done: [],
    studyPlan: null,
    prepPlan: null,
    interviewExperiences: [],
    resume: { text: "", review: [], fileName: "", fileType: "", fileSize: 0, uploadedAt: "", updatedAt: "" },
    jobs: seedJobs.map((item) => ({ ...item, tags: [...item.tags] })),
    courses: seedCourses.map((item) => ({ ...item, tags: [...item.tags] })),
    streakCount: 0,
    checkIns: [],
    leaderboard: defaultLeaderboardSettings(),
    problems: mergeProblems(catalogProblems.filter((problem) => !isDisabledProblemSource(problem)), []).map((problem) => ({ ...problem, tags: [...problem.tags] })),
    news: seedNews.map((item) => ({ ...item, tags: [...item.tags], skills: [...item.skills] })),
    newsFetchedAt: "",
    newsFetchAttemptAt: "",
    newsSyncError: "",
    jobsFetchedAt: "",
    jobsFetchAttemptAt: "",
    jobsSyncError: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { accounts: [], currentUserId: "", googleClientId: DEFAULT_GOOGLE_CLIENT_ID };
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map(normalizeAccount) : [],
      currentUserId: parsed.currentUserId || "",
      googleClientId: parsed.googleClientId || DEFAULT_GOOGLE_CLIENT_ID
    };
  } catch {
    return { accounts: [], currentUserId: "", googleClientId: DEFAULT_GOOGLE_CLIENT_ID };
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function getCurrentUser() {
  return auth.accounts.find((account) => account.id === auth.currentUserId) || null;
}

function userStateKey(userId) {
  return `${USER_STATE_PREFIX}.${userId}`;
}

function normalizeState(rawState) {
  const base = createBaseState();
  const legacyFavorites = Array.isArray(rawState?.interviewFavorites) ? rawState.interviewFavorites : [];
  return {
    ...base,
    ...rawState,
    skills: normalizeSkills(rawState?.skills || {}),
    entries: Array.isArray(rawState?.entries) ? rawState.entries : [],
    resources: normalizeResources(rawState?.resources),
    network: Array.isArray(rawState?.network) ? rawState.network.map(normalizeNetworkContact) : [],
    interviewFavorites: legacyFavorites.filter((favorite) => !favorite?.problemId),
    mentalMathRecords: normalizeMentalMathRecords(rawState?.mentalMathRecords),
    gameRecords: normalizeGameRecords(rawState?.gameRecords),
    courseStates: normalizeCourseStates(rawState?.courseStates),
    problemStates: mergeProblemStates(
      Array.isArray(rawState?.problemStates) ? rawState.problemStates : [],
      problemStatesFromFavorites(legacyFavorites.filter((favorite) => favorite?.problemId))
    ).filter((problemState) => !isDisabledProblemId(problemState.problemId)),
    leetcodeHot100Done: normalizeLeetcodeHot100Done(rawState?.leetcodeHot100Done),
    studyPlan: normalizeStudyPlan(rawState?.studyPlan),
    prepPlan: normalizePrepPlan(rawState?.prepPlan),
    interviewExperiences: Array.isArray(rawState?.interviewExperiences)
      ? rawState.interviewExperiences.map(normalizeInterviewExperience)
      : [],
    resume: normalizeResumeState(rawState?.resume),
    jobs: normalizeJobs(rawState?.jobs),
    courses: normalizeCourses(rawState?.courses),
    streakCount: Math.max(0, Number(rawState?.streakCount || 0)),
    checkIns: Array.isArray(rawState?.checkIns) ? rawState.checkIns.filter((item) => item?.date) : [],
    leaderboard: normalizeLeaderboardSettings(rawState?.leaderboard),
    problems: mergeProblems(
      base.problems,
      Array.isArray(rawState?.problems) ? rawState.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem)) : []
    ),
    news: mergeNews(base.news, Array.isArray(rawState?.news) ? rawState.news : []),
    newsFetchedAt: rawState?.newsFetchedAt || "",
    newsFetchAttemptAt: rawState?.newsFetchAttemptAt || "",
    newsSyncError: rawState?.newsSyncError || "",
    jobsFetchedAt: rawState?.jobsFetchedAt || "",
    jobsFetchAttemptAt: rawState?.jobsFetchAttemptAt || "",
    jobsSyncError: rawState?.jobsSyncError || "",
    updatedAt: rawState?.updatedAt || rawState?.createdAt || base.createdAt
  };
}

function normalizeStudyPlan(raw = null) {
  if (!raw || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .map((item) => ({
      id: item?.id || makeId(),
      title: String(item?.title || "").trim(),
      detail: String(item?.detail || "").trim(),
      minutes: Math.max(0, Number(item?.minutes || 0)),
      skill: String(item?.skill || "").trim(),
      done: Boolean(item?.done)
    }))
    .filter((item) => item.title || item.detail);
  if (!items.length) return null;
  return {
    createdAt: raw.createdAt || new Date().toISOString(),
    summary: String(raw.summary || "").trim(),
    items
  };
}

function normalizePrepPlan(raw = null) {
  if (!raw || !prepRoleDefs[raw.role] || !prepSeasonDefs[raw.season]) return null;
  const track = raw.track === "fulltime" ? "fulltime" : "internship";
  const diagnosticStatus = ["pending", "completed", "skipped"].includes(raw.diagnosticStatus)
    ? raw.diagnosticStatus
    : "skipped";
  const diagnosticScores = raw.diagnosticScores && typeof raw.diagnosticScores === "object"
    ? Object.fromEntries(Object.entries(raw.diagnosticScores).map(([key, value]) => [key, Math.max(0, Math.min(100, Number(value || 0)))]))
    : {};
  const taskOverrides = raw.taskOverrides && typeof raw.taskOverrides === "object"
    ? Object.fromEntries(Object.entries(raw.taskOverrides).map(([key, value]) => [key, {
      title: String(value?.title || "").trim().slice(0, 120),
      detail: String(value?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(value?.minutes || 0))
    }]))
    : {};
  const customTasks = Array.isArray(raw.customTasks)
    ? raw.customTasks.map((task) => ({
      id: String(task?.id || makeId()).trim(),
      date: String(task?.date || localDateKey()).slice(0, 10),
      title: String(task?.title || "").trim().slice(0, 120),
      detail: String(task?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(task?.minutes || 15)),
      action: String(task?.action || "custom").trim(),
      query: String(task?.query || "").trim()
    })).filter((task) => task.id && (task.title || task.detail))
    : [];
  return {
    track,
    role: raw.role,
    season: raw.season,
    weeklyHours: [5, 8, 12, 16].includes(Number(raw.weeklyHours)) ? Number(raw.weeklyHours) : 8,
    diagnosticStatus,
    diagnosticScore: Math.max(0, Math.min(prepDiagnosticQuestions.length, Number(raw.diagnosticScore || 0))),
    diagnosticScores,
    completedTasks: raw.completedTasks && typeof raw.completedTasks === "object" ? raw.completedTasks : {},
    taskOverrides,
    customTasks,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

function normalizeMentalMathRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      mode: String(record?.mode || "numberLogic"),
      label: String(record?.label || "").trim(),
      score: Number(record?.score || 0),
      correct: Math.max(0, Number(record?.correct || 0)),
      incorrect: Math.max(0, Number(record?.incorrect || 0)),
      skipped: Math.max(0, Number(record?.skipped || 0)),
      total: Math.max(0, Number(record?.total || 0)),
      accuracy: Math.max(0, Math.min(100, Number(record?.accuracy || 0))),
      durationSeconds: Math.max(0, Number(record?.durationSeconds || 0)),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.total > 0 || record.score !== 0)
    .slice(-80);
}

function normalizeGameRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      game: String(record?.game || "market"),
      score: Number(record?.score || 0),
      detail: String(record?.detail || "").trim().slice(0, 280),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.game)
    .slice(-80);
}

function normalizeInterviewExperience(raw = {}) {
  return {
    id: raw.id || makeId(),
    firm: String(raw.firm || "").trim().slice(0, 120),
    role: String(raw.role || "Quant Trading").trim().slice(0, 80),
    stage: String(raw.stage || "OA / Assessment").trim().slice(0, 80),
    season: String(raw.season || "2027 Summer").trim().slice(0, 40),
    date: String(raw.date || "").slice(0, 10),
    outcome: String(raw.outcome || "Waiting").trim().slice(0, 40),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean).slice(0, 12) : parseTags(raw.tags || "").slice(0, 12),
    summary: String(raw.summary || "").trim().slice(0, 3000),
    topics: String(raw.topics || "").trim().slice(0, 4000),
    reflection: String(raw.reflection || "").trim().slice(0, 4000),
    sharedPostId: String(raw.sharedPostId || ""),
    sharedAt: String(raw.sharedAt || ""),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

function normalizeResumeState(raw = {}) {
  return {
    text: String(raw?.text || "").slice(0, 120_000),
    review: Array.isArray(raw?.review) ? raw.review.map(String).filter(Boolean).slice(0, 8) : [],
    fileName: String(raw?.fileName || ""),
    fileType: String(raw?.fileType || ""),
    fileSize: Math.max(0, Number(raw?.fileSize || 0)),
    uploadedAt: raw?.uploadedAt || "",
    updatedAt: raw?.updatedAt || ""
  };
}

function normalizeJobs(rawJobs) {
  const jobs = Array.isArray(rawJobs) && rawJobs.length ? rawJobs : seedJobs;
  return jobs.map((job) => ({
    id: String(job?.id || stableProblemId(`${job?.company || "job"}-${job?.title || makeId()}`, "job")),
    company: String(job?.company || "Quant Firm"),
    title: String(job?.title || "Quant Role"),
    type: String(job?.type || "internship").toLowerCase() === "fulltime" ? "fulltime" : "internship",
    location: String(job?.location || "Global"),
    url: String(job?.url || "#"),
    postedAt: String(job?.postedAt || "crawler-ready"),
    tags: Array.isArray(job?.tags) ? job.tags.map(String).filter(Boolean) : parseTags(job?.tags || "")
  }));
}

function normalizeCourses(rawCourses) {
  const courses = Array.isArray(rawCourses) && rawCourses.length ? rawCourses : seedCourses;
  return courses.map((course) => {
    const url = String(course?.url || "#").trim();
    const sources = normalizeContentSources(course?.sources, {
      title: course?.provider || course?.platform || "Original",
      provider: course?.platform || inferSource(url) || "Original",
      url
    });
    return {
      id: String(course?.id || stableCourseId(`${course?.platform || "course"}-${course?.title || makeId()}`, url)),
      title: String(course?.title || "Quant Course").trim(),
      platform: String(course?.platform || sources[0]?.provider || "Course").trim(),
      provider: String(course?.provider || course?.platform || sources[0]?.title || "Course").trim(),
      url,
      sources,
      topic: String(course?.topic || "Quant").trim(),
      level: String(course?.level || "Core").trim(),
      summary: String(course?.summary || "").trim(),
      tags: Array.isArray(course?.tags) ? course.tags.map(String).filter(Boolean) : parseTags(course?.tags || "")
    };
  });
}

function normalizeResources(rawResources) {
  return (Array.isArray(rawResources) ? rawResources : []).map((resource) => {
    const content = String(resource?.content || "").trim();
    const urlSources = normalizeContentSources(resource?.sources, {
      title: resource?.type === "link" ? "Original" : "",
      provider: resource?.type === "link" ? inferSource(content) || "Original" : "",
      url: /^https?:\/\//i.test(content) ? content : ""
    });
    return {
      id: String(resource?.id || makeId()),
      title: String(resource?.title || "").trim(),
      type: String(resource?.type || "note").trim(),
      content,
      sources: urlSources,
      dataUrl: String(resource?.dataUrl || ""),
      date: resource?.date || resource?.createdAt || new Date().toISOString()
    };
  }).filter((resource) => resource.title || resource.content || resource.dataUrl);
}

function normalizeCourseStates(rawStates = []) {
  const states = Array.isArray(rawStates) ? rawStates : [];
  return states.map((item) => ({
    courseId: String(item?.courseId || item?.id || "").trim(),
    saved: Boolean(item?.saved),
    inPath: Boolean(item?.inPath),
    done: Boolean(item?.done),
    note: String(item?.note || "").slice(0, 4000),
    selectedSourceId: String(item?.selectedSourceId || ""),
    pathAddedAt: item?.pathAddedAt || "",
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString()
  })).filter((item) => item.courseId);
}

function normalizeSkills(rawSkills) {
  const skills = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, Number(rawSkills[key] || 0)]));
  if (rawSkills.probability && !rawSkills.probabilityExpectation) skills.probabilityExpectation += Number(rawSkills.probability || 0);
  if (rawSkills.mental && !rawSkills.mentalMath) skills.mentalMath += Number(rawSkills.mental || 0);
  return skills;
}

function loadState() {
  if (!currentUser) return createBaseState();

  return loadStateForUser(currentUser.id);
}

function loadStateForUser(userId) {
  try {
    const raw = localStorage.getItem(userStateKey(userId));
    if (!raw) return createBaseState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createBaseState();
  }
}

function saveState(options = {}) {
  if (!currentUser) return;
  const checkInResult = options.checkIn === false ? null : markActivityCheckIn();
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(userStateKey(currentUser.id), JSON.stringify(localStatePayload(state)));
  if (options.sync !== false) queueCloudSync("state");
  queueCheckInCelebration(checkInResult);
}

function localStatePayload(rawState) {
  return {
    ...rawState,
    problems: getUserCatalogProblems(rawState?.problems || [])
  };
}

function cloudStatePayload(rawState) {
  const payload = localStatePayload(rawState);
  delete payload.problems;
  delete payload.problemStates;
  return payload;
}

function getUserCatalogProblems(problems) {
  return (Array.isArray(problems) ? problems : []).filter((problem) => isUserProblem(problem) && isCatalogProblem(problem) && !isDisabledProblemSource(problem));
}

function mergeProblems(seed, saved) {
  const byId = new Map();
  [...seed, ...saved].forEach((problem) => {
    const normalized = normalizeProblem(problem);
    const previous = byId.get(normalized.id);
    if (!previous) {
      byId.set(normalized.id, normalized);
      return;
    }
    byId.set(normalized.id, {
      ...previous,
      ...normalized,
      tags: sanitizeProblemTags([...(previous.tags || []), ...(normalized.tags || [])]),
      companies: normalized.companies?.length ? normalized.companies : previous.companies || []
    });
  });
  return [...byId.values()];
}

function normalizeLeetcodeHot100Done(value) {
  const valid = new Set(leetcodeHot100.map((item) => item.id));
  return [...new Set(Array.isArray(value) ? value.map(String) : [])].filter((id) => valid.has(id));
}

function normalizeProblemState(raw = {}) {
  const problemId = normalizeCatalogProblemId(raw.problemId);
  return {
    ...raw,
    problemId,
    interviewCount: Math.max(0, Number(raw.interviewCount || 0)),
    favorite: Boolean(raw.favorite),
    completed: Boolean(raw.completed),
    completedAt: raw.completedAt || "",
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((favorite) => favorite?.id) : [],
    scoreHistory: Array.isArray(raw.scoreHistory) ? raw.scoreHistory.filter((score) => score?.id) : [],
    lastPracticedAt: raw.lastPracticedAt || "",
    updatedAt: raw.updatedAt || ""
  };
}

function mergeProblemStates(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((raw) => {
    const next = normalizeProblemState(raw);
    if (!next.problemId) return;
    const previous = byId.get(next.problemId);
    if (!previous) {
      byId.set(next.problemId, next);
      return;
    }
    const lastScoreAt = latestIso(previous.lastScoreAt, next.lastScoreAt);
    const scoreSource = previous.lastScoreAt === lastScoreAt ? previous : next;
    const favoriteSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    const completedSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    byId.set(next.problemId, {
      ...previous,
      ...next,
      interviewCount: Math.max(previous.interviewCount || 0, next.interviewCount || 0),
      favorite: Boolean(favoriteSource.favorite),
      completed: Boolean(completedSource.completed),
      completedAt: completedSource.completed ? latestIso(previous.completedAt, next.completedAt) : "",
      favorites: mergeRecordsById(previous.favorites || [], next.favorites || []),
      scoreHistory: mergeRecordsById(previous.scoreHistory || [], next.scoreHistory || []),
      lastScore: scoreSource.lastScore,
      lastScoreAt,
      lastEvaluation: scoreSource.lastEvaluation || "",
      lastPracticedAt: latestIso(previous.lastPracticedAt, next.lastPracticedAt),
      updatedAt: latestIso(previous.updatedAt, next.updatedAt)
    });
  });
  return [...byId.values()];
}

function problemStatesFromFavorites(favorites) {
  const byProblem = new Map();
  (Array.isArray(favorites) ? favorites : []).forEach((favorite) => {
    const problemId = String(favorite?.problemId || "").trim();
    if (!problemId) return;
    const previous = byProblem.get(problemId) || {
      problemId,
      favorite: true,
      favorites: []
    };
    previous.favorites.push(favorite);
    previous.lastFavoriteAt = latestIso(previous.lastFavoriteAt, favorite.createdAt);
    previous.updatedAt = latestIso(previous.updatedAt, favorite.createdAt);
    byProblem.set(problemId, previous);
  });
  return [...byProblem.values()];
}

function updateProblemState(problemId, update) {
  if (!problemId) return;
  const current = (state.problemStates || []).find((item) => item.problemId === problemId) || { problemId };
  const next = normalizeProblemState({
    ...current,
    ...(typeof update === "function" ? update(current) : update),
    problemId,
    updatedAt: new Date().toISOString()
  });
  state.problemStates = mergeProblemStates(state.problemStates || [], [next]);
  clearProblemStateCache();
}

function mergeNews(seed, saved) {
  const byId = new Map();
  [...seed, ...saved].forEach((item) => {
    const normalized = normalizeNewsItem(item);
    if (isLowQualityNews(normalized)) return;
    const key = newsDedupeKey(normalized);
    const previous = byId.get(key);
    byId.set(key, previous ? mergeDuplicateNews(previous, normalized) : normalized);
  });
  return sortNews([...byId.values()]);
}

function newsDedupeKey(item) {
  const title = canonicalNewsTitle(item.titleZh || item.title);
  if (title) return `title:${title}`;
  return `id:${item.id}`;
}

function mergeDuplicateNews(previous, next) {
  const newer = newsTime(next) > newsTime(previous) ? next : previous;
  const older = newer === next ? previous : next;
  return {
    ...older,
    ...newer,
    id: older.id || newer.id,
    tags: [...new Set([...(older.tags || []), ...(newer.tags || [])])].slice(0, 8),
    skills: [...new Set([...(older.skills || []), ...(newer.skills || [])])],
    summary: (newer.summary || "").length >= (older.summary || "").length ? newer.summary : older.summary,
    insight: newer.insight || older.insight || "",
    readAt: older.readAt || newer.readAt || "",
    updatedAt: latestIso(older.updatedAt, newer.updatedAt)
  };
}

function loadLlmConfig() {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return { endpoint: DEFAULT_LLM_ENDPOINT, model: DEFAULT_LLM_MODEL };
    const parsed = JSON.parse(raw);
    const storedModel = parsed.defaultsVersion ? parsed.model : (parsed.model === "gpt-5" ? DEFAULT_LLM_MODEL : parsed.model);
    return {
      endpoint: parsed.endpoint || DEFAULT_LLM_ENDPOINT,
      model: normalizeLlmModel(storedModel)
    };
  } catch {
    return { endpoint: DEFAULT_LLM_ENDPOINT, model: DEFAULT_LLM_MODEL };
  }
}

function saveLlmConfigToStorage() {
  llmConfig = {
    endpoint: llmConfig.endpoint || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(llmConfig.model),
    defaultsVersion: LLM_DEFAULTS_VERSION
  };
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(llmConfig));
}

function normalizeLlmModel(model) {
  const value = String(model || "").trim();
  return LLM_MODEL_OPTIONS.includes(value) ? value : DEFAULT_LLM_MODEL;
}

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase().trim();
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

function getUrlLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED_LANGUAGES.includes(String(queryLanguage || "").toLowerCase())) {
    return normalizeLanguage(queryLanguage);
  }
  const localeSegment = window.location.pathname
    .split("/")
    .filter(Boolean)
    .find((segment) => SUPPORTED_LANGUAGES.includes(String(segment || "").toLowerCase()));
  return localeSegment
    ? normalizeLanguage(localeSegment)
    : "";
}

function getBrowserLanguage() {
  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  const preferred = browserLanguages
    .map((language) => String(language || "").toLowerCase())
    .find((language) => language.startsWith("zh") || language.startsWith("en"));
  return preferred?.startsWith("en") ? "en" : DEFAULT_LANGUAGE;
}

function getInitialLanguage(storedLanguage = "") {
  return normalizeLanguage(getUrlLanguage() || storedLanguage || getBrowserLanguage());
}

function syncLanguageToUrl(language) {
  if (!window.history?.replaceState || !/^https?:$/.test(window.location.protocol)) return;
  const nextLanguage = normalizeLanguage(language);
  const url = new URL(window.location.href);
  const segments = url.pathname.split("/").filter(Boolean);
  const localeIndex = segments.findIndex((segment) => SUPPORTED_LANGUAGES.includes(String(segment || "").toLowerCase()));
  if (localeIndex >= 0) {
    segments[localeIndex] = nextLanguage;
    url.pathname = `/${segments.join("/")}`;
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", nextLanguage);
  }
  window.history.replaceState({}, "", url);
}

function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      language: getInitialLanguage(parsed.language),
      sidebarCollapsed: parsed.sidebarCollapsed === true
    };
  } catch {
    return { language: getInitialLanguage(), sidebarCollapsed: false };
  }
}

function saveAppPrefs() {
  localStorage.setItem(APP_PREFS_KEY, JSON.stringify(appPrefs));
}

function getLanguage() {
  return normalizeLanguage(appPrefs.language);
}

function getLocale() {
  return getLanguage() === "en" ? "en-US" : "zh-CN";
}

function t(key, params = {}) {
  const template = i18n[getLanguage()]?.[key] || i18n.zh[key] || key;
  return Object.entries(params).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value ?? ""))
  ), template);
}

function textMatchesI18nKeys(text, keys = []) {
  const value = String(text || "").trim();
  return keys.some((key) => SUPPORTED_LANGUAGES.some((language) => i18n[language]?.[key] === value));
}

function setLanguage(language, options = {}) {
  const nextLanguage = normalizeLanguage(language);
  appPrefs.language = nextLanguage;
  saveAppPrefs();
  if (options.updateUrl !== false) syncLanguageToUrl(nextLanguage);
  applySidebarState();
  applyLanguage();
  renderAll();
}

function applySidebarState() {
  const collapsed = appPrefs.sidebarCollapsed === true;
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  if (!els.sidebarToggleBtn) return;
  const label = t(collapsed ? "sidebarShow" : "sidebarHide");
  const icon = els.sidebarToggleBtn.querySelector("i");
  els.sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  els.sidebarToggleBtn.setAttribute("aria-label", label);
  els.sidebarToggleBtn.title = label;
  if (icon) icon.setAttribute("data-lucide", collapsed ? "panel-left-open" : "panel-left-close");
  refreshIcons();
}

function toggleSidebarNav() {
  appPrefs.sidebarCollapsed = appPrefs.sidebarCollapsed !== true;
  saveAppPrefs();
  applySidebarState();
}

function loadCommunity() {
  try {
    return normalizeCommunityStore(JSON.parse(localStorage.getItem(COMMUNITY_KEY) || "{}"));
  } catch {
    return { posts: [], threads: [] };
  }
}

function saveCommunity(options = {}) {
  localStorage.setItem(COMMUNITY_KEY, JSON.stringify(community));
  if (options.sync !== false) queueCloudSync("community");
  if (options.checkIn !== false) persistActivityCheckIn();
}

function normalizeCommunityStore(raw = {}) {
  return {
    posts: Array.isArray(raw?.posts) ? raw.posts.map(normalizeCommunityPost) : [],
    threads: Array.isArray(raw?.threads) ? raw.threads.map(normalizeMessageThread).filter((thread) => thread.participants.length >= 2) : []
  };
}

function loadCloudConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "{}");
    return {
      endpoint: parsed.endpoint || DEFAULT_CLOUD_API_ENDPOINT,
      token: parsed.token || "",
      userId: parsed.userId || "",
      lastSyncAt: parsed.lastSyncAt || "",
      lastError: parsed.lastError || ""
    };
  } catch {
    return { endpoint: DEFAULT_CLOUD_API_ENDPOINT, token: "", userId: "", lastSyncAt: "", lastError: "" };
  }
}

function saveCloudConfig() {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
}

function getCloudApiBase() {
  return (cloudConfig.endpoint || DEFAULT_CLOUD_API_ENDPOINT).trim().replace(/\/+$/, "");
}

function canUseCloud() {
  return Boolean(cloudConfig.token && currentUser && cloudConfig.userId === currentUser.id);
}

function getLlmRequestHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (cloudConfig.token) headers.Authorization = `Bearer ${cloudConfig.token}`;
  return headers;
}

async function cloudApi(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.auth !== false && cloudConfig.token) {
    headers.Authorization = `Bearer ${cloudConfig.token}`;
  }

  const response = await fetch(`${getCloudApiBase()}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Cloud API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function invalidateLeaderboardCloud(options = {}) {
  leaderboardCloudLoadedAt = "";
  leaderboardCloudError = "";
  if (options.clear) leaderboardCloudRows = [];
  if (options.refresh) refreshLeaderboardFromCloud(true);
}

async function refreshLeaderboardFromCloud(force = false) {
  if (leaderboardCloudLoading) return leaderboardCloudRefreshPromise;
  const lastAttemptAt = leaderboardCloudLoadedAt ? new Date(leaderboardCloudLoadedAt).getTime() : 0;
  if (!force && lastAttemptAt && Date.now() - lastAttemptAt < LEADERBOARD_CLOUD_REFRESH_MS) {
    return leaderboardCloudRows;
  }

  leaderboardCloudLoading = true;
  leaderboardCloudError = "";
  renderLeaderboardScopeSummary(normalizeLeaderboardSettings(state.leaderboard), getLeaderboardRows(), "loading");

  leaderboardCloudRefreshPromise = cloudApi("/leaderboard", { auth: false })
    .then((data) => {
      const rows = Array.isArray(data.leaderboard) ? data.leaderboard : Array.isArray(data.rows) ? data.rows : [];
      leaderboardCloudRows = normalizeCloudLeaderboardRows(rows);
      leaderboardCloudLoadedAt = data.updatedAt || new Date().toISOString();
      leaderboardCloudError = "";
      return leaderboardCloudRows;
    })
    .catch((error) => {
      leaderboardCloudLoadedAt = new Date().toISOString();
      leaderboardCloudError = error.message || "Leaderboard unavailable";
      return leaderboardCloudRows;
    })
    .finally(() => {
      leaderboardCloudLoading = false;
      leaderboardCloudRefreshPromise = null;
      renderLeaderboard();
      renderRegionRank();
      refreshIcons();
    });
  return leaderboardCloudRefreshPromise;
}

function normalizeCloudLeaderboardRows(rows = []) {
  return rows
    .map((row) => {
      const account = normalizeAccount({
        id: row.id,
        name: row.name,
        country: row.country,
        region: row.region,
        picture: row.picture
      });
      return {
        id: String(account.id || "").trim(),
        name: String(account.name || "Quant").trim() || "Quant",
        country: account.country,
        region: account.region,
        picture: String(account.picture || ""),
        skills: normalizeSkills(row.skills || {}),
        updatedAt: String(row.updatedAt || "")
      };
    })
    .filter((row) => row.id);
}

async function refreshProblemCatalog(force = false) {
  if (problemCatalogRefresh && !force) return problemCatalogRefresh;
  problemCatalogRefresh = cloudApi("/problems")
    .then((data) => {
      const problems = Array.isArray(data.problems)
        ? data.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem))
        : [];
      if (!problems.length) return;
      state.problems = mergeProblems(getUserCatalogProblems(state.problems), problems);
      state.problemStates = (state.problemStates || []).filter((problemState) => !isDisabledProblemId(problemState.problemId));
      clearProblemLookupCaches();
      saveState({ sync: false, checkIn: false });
      renderProblems();
      renderInterviewSetup();
    })
    .catch(() => {})
    .finally(() => {
      problemCatalogRefresh = null;
    });
  return problemCatalogRefresh;
}

function normalizeProblemSocial(raw = {}, preserveComments = []) {
  return {
    problemId: String(raw.problemId || ""),
    likeCount: Math.max(0, Number(raw.likeCount || 0)),
    commentCount: Math.max(0, Number(raw.commentCount || 0)),
    liked: Boolean(raw.liked),
    comments: Array.isArray(raw.comments) ? raw.comments : preserveComments
  };
}

function getProblemSocial(problemId) {
  return problemSocial.get(problemId) || normalizeProblemSocial({ problemId });
}

async function refreshProblemSocial(problemId = "") {
  try {
    const path = problemId ? `/problem-social/${encodeURIComponent(problemId)}` : "/problem-social";
    const result = await cloudApi(path);
    const entries = problemId ? [result.social] : (result.problemSocial || []);
    if (!problemId) {
      const next = new Map();
      entries.forEach((raw) => {
        const previous = problemSocial.get(raw.problemId);
        next.set(raw.problemId, normalizeProblemSocial(raw, previous?.comments || []));
      });
      problemSocial = next;
    } else if (entries[0]) {
      problemSocial.set(problemId, normalizeProblemSocial(entries[0]));
    }
    if (selectedProblemDetailId && selectedProblemDetailId === problemId) {
      const problem = state.problems.find((item) => item.id === problemId);
      if (problem) renderProblemDetail(problem);
    } else {
      renderProblems();
    }
  } catch {
    if (problemId) {
      problemSocialNotice = t("problemSocialError");
      const problem = state.problems.find((item) => item.id === problemId);
      if (problem) renderProblemDetail(problem);
    }
  }
}

function upsertLocalAccount(account, localFields = {}) {
  const normalized = normalizeAccount(account);
  const existing = auth.accounts.find((item) => item.id === normalized.id);
  const merged = { ...(existing || {}), ...normalized, ...localFields };
  auth.accounts = [
    ...auth.accounts.filter((item) => item.id !== normalized.id && normalizeEmail(item.email) !== normalizeEmail(normalized.email)),
    merged
  ];
  auth.currentUserId = normalized.id;
  saveAuth();
  currentUser = getCurrentUser();
  return currentUser;
}

function mergeCloudState(remoteState, localState) {
  const remote = normalizeState(remoteState || {});
  const local = normalizeState(localState || {});
  const skills = Object.fromEntries(Object.keys(skillDefs).map((key) => [
    key,
    Math.max(Number(remote.skills?.[key] || 0), Number(local.skills?.[key] || 0))
  ]));
  const createdAt = [remote.createdAt, local.createdAt].filter(Boolean).sort()[0] || new Date().toISOString();
  const updatedCandidates = [remote.updatedAt, local.updatedAt].filter(Boolean).sort();
  const updatedAt = updatedCandidates[updatedCandidates.length - 1] || new Date().toISOString();
  return normalizeState({
    ...remote,
    ...local,
    skills,
    entries: mergeRecordsById(remote.entries, local.entries),
    resources: mergeRecordsById(remote.resources, local.resources),
    network: mergeRecordsById(remote.network, local.network),
    interviewFavorites: mergeRecordsById(remote.interviewFavorites, local.interviewFavorites),
    interviewExperiences: mergeRecordsById(remote.interviewExperiences, local.interviewExperiences).map(normalizeInterviewExperience),
    courseStates: mergeCourseStates(remote.courseStates, local.courseStates),
    problemStates: mergeProblemStates(remote.problemStates, local.problemStates),
    studyPlan: latestIso(remote.studyPlan?.createdAt, local.studyPlan?.createdAt) === remote.studyPlan?.createdAt ? remote.studyPlan : local.studyPlan,
    prepPlan: latestIso(remote.prepPlan?.updatedAt, local.prepPlan?.updatedAt) === remote.prepPlan?.updatedAt ? remote.prepPlan : local.prepPlan,
    resume: mergeResumeState(remote.resume, local.resume),
    jobs: mergeJobs(remote.jobs, local.jobs),
    courses: mergeCourses(remote.courses, local.courses),
    streakCount: Math.max(Number(remote.streakCount || 0), Number(local.streakCount || 0)),
    checkIns: mergeRecordsById(remote.checkIns, local.checkIns),
    problems: mergeProblems(remote.problems, local.problems),
    news: mergeNews(remote.news, local.news),
    leaderboard: local.leaderboard || remote.leaderboard || defaultLeaderboardSettings(),
    newsFetchedAt: latestIso(remote.newsFetchedAt, local.newsFetchedAt),
    newsFetchAttemptAt: latestIso(remote.newsFetchAttemptAt, local.newsFetchAttemptAt),
    newsSyncError: local.newsSyncError || remote.newsSyncError || "",
    jobsFetchedAt: latestIso(remote.jobsFetchedAt, local.jobsFetchedAt),
    jobsFetchAttemptAt: latestIso(remote.jobsFetchAttemptAt, local.jobsFetchAttemptAt),
    jobsSyncError: local.jobsSyncError || remote.jobsSyncError || "",
    createdAt,
    updatedAt
  });
}

function mergeRecordsById(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const id = item.id || makeId();
    byId.set(id, { ...(byId.get(id) || {}), ...item, id });
  });
  return [...byId.values()].sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
}

function mergeCourseStates(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const normalized = normalizeCourseStates([item])[0];
    if (!normalized) return;
    const previous = byId.get(normalized.courseId) || {};
    const previousIsNewer = latestIso(previous.updatedAt, normalized.updatedAt) === previous.updatedAt;
    byId.set(normalized.courseId, {
      ...previous,
      ...normalized,
      saved: Boolean(previous.saved || normalized.saved),
      inPath: Boolean(previous.inPath || normalized.inPath),
      done: Boolean(previous.done || normalized.done),
      note: previousIsNewer ? previous.note || normalized.note : normalized.note || previous.note,
      pathAddedAt: previous.pathAddedAt || normalized.pathAddedAt
    });
  });
  return [...byId.values()];
}

function mergeResumeState(remoteResume, localResume) {
  const remote = normalizeResumeState(remoteResume);
  const local = normalizeResumeState(localResume);
  const latest = latestIso(remote.updatedAt, local.updatedAt);
  const winner = latest
    ? (latest === remote.updatedAt ? remote : local)
    : ((local.text || local.fileName || local.review.length) ? local : remote);
  return normalizeResumeState({
    ...remote,
    ...local,
    ...winner,
    review: winner.review?.length ? winner.review : local.review.length ? local.review : remote.review
  });
}

function mergeJobs(remoteJobs, localJobs) {
  const byId = new Map();
  [...normalizeJobs(remoteJobs), ...normalizeJobs(localJobs)].forEach((job) => {
    byId.set(job.id, { ...(byId.get(job.id) || {}), ...job });
  });
  return [...byId.values()];
}

function mergeCourses(remoteCourses, localCourses) {
  const byId = new Map();
  [...normalizeCourses(remoteCourses), ...normalizeCourses(localCourses)].forEach((course) => {
    byId.set(course.id, { ...(byId.get(course.id) || {}), ...course });
  });
  return [...byId.values()];
}

function mergeCloudCommunity(remoteCommunity, localCommunity) {
  const byId = new Map();
  const threadsById = new Map();
  [normalizeCommunityStore(remoteCommunity), normalizeCommunityStore(localCommunity)].forEach((source) => {
    source.posts.forEach((post) => {
      const existing = byId.get(post.id) || {};
      byId.set(post.id, normalizeCommunityPost({
        ...existing,
        ...post,
        likes: [...new Set([...(existing.likes || []), ...(post.likes || [])])],
        comments: mergeRecordsById(existing.comments || [], post.comments || [])
      }));
    });
    source.threads.forEach((thread) => {
      const existing = threadsById.get(thread.id);
      if (!existing) {
        threadsById.set(thread.id, thread);
        return;
      }
      const messages = mergeRecordsById(existing.messages || [], thread.messages || [])
        .map(normalizeDirectMessage)
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      threadsById.set(thread.id, normalizeMessageThread({
        ...existing,
        ...thread,
        participants: [...(existing.participants || []), ...(thread.participants || [])],
        messages,
        updatedAt: latestIso(existing.updatedAt, thread.updatedAt, messages.at(-1)?.createdAt)
      }));
    });
  });
  return {
    posts: [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    threads: [...threadsById.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  };
}

function latestIso(...values) {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] || "";
}

function applyCloudSession(payload, options = {}) {
  const account = payload.account ? normalizeAccount(payload.account) : null;
  if (!account) return;
  const localFields = options.passwordHash ? { passwordHash: options.passwordHash } : {};
  upsertLocalAccount(account, localFields);

  cloudConfig = {
    ...cloudConfig,
    token: payload.token || cloudConfig.token || "",
    userId: account.id,
    lastSyncAt: new Date().toISOString(),
    lastError: ""
  };
  saveCloudConfig();

  const localState = options.localState || loadStateForUser(account.id);
  const remoteState = {
    ...(payload.state || {}),
    problemStates: mergeProblemStates(payload.state?.problemStates || [], payload.problemStates || [])
  };
  const nextState = options.merge === false
    ? normalizeState(Object.keys(remoteState).length ? remoteState : localState)
    : mergeCloudState(remoteState, localState);
  localStorage.setItem(userStateKey(account.id), JSON.stringify(localStatePayload(nextState)));
  state = nextState;
  clearProblemLookupCaches();

  community = options.merge === false
    ? normalizeCommunityStore(payload.community || community)
    : mergeCloudCommunity(payload.community, options.localCommunity || community);
  saveCommunity({ sync: false, checkIn: false });
  queueCloudSync("state", 0);
  queueCloudSync("community", 0);
  queueCloudSync("account", 0);
  invalidateLeaderboardCloud({ refresh: true });
}

async function sendCloudVerificationCode(email, purpose = "register") {
  return cloudApi("/auth/verification-code", {
    method: "POST",
    auth: false,
    body: { email, purpose }
  });
}

async function registerCloudAccount(account, password, localState, localCommunity, verificationCode = "") {
  return cloudApi("/auth/register", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      password,
      verificationCode,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}

async function loginCloudAccount(email, password) {
  return cloudApi("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password }
  });
}

async function loginCloudGoogle(account, credential, localState, localCommunity) {
  return cloudApi("/auth/google", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      credential,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}

function sanitizeAccountForCloud(account) {
  const { passwordHash, ...publicAccount } = account || {};
  return publicAccount;
}

function queueCloudSync(scope, delay = CLOUD_SYNC_DEBOUNCE_MS) {
  if (!currentUser || !cloudConfig.token || cloudConfig.userId !== currentUser.id) return;
  cloudDirty[scope] = true;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(flushCloudSync, delay);
}

async function flushCloudSync() {
  if (!canUseCloud()) return;
  if (cloudSyncInFlight) {
    window.clearTimeout(cloudSyncTimer);
    cloudSyncTimer = window.setTimeout(flushCloudSync, CLOUD_SYNC_DEBOUNCE_MS);
    return;
  }

  const dirty = { ...cloudDirty };
  if (!dirty.state && !dirty.community && !dirty.account) return;
  cloudDirty = { state: false, community: false, account: false };
  cloudSyncInFlight = true;

  try {
    const body = {};
    if (dirty.state) {
      body.state = cloudStatePayload(state);
      body.problemStates = state.problemStates || [];
      body.problems = getUserCatalogProblems(state.problems);
    }
    if (dirty.community) body.community = community;
    if (dirty.account) body.account = sanitizeAccountForCloud(currentUser);
    const result = await cloudApi("/sync", { method: "POST", body });
    cloudConfig.lastSyncAt = result.syncedAt || new Date().toISOString();
    cloudConfig.lastError = "";
    saveCloudConfig();
    renderCloudStatus();
    if (dirty.state || dirty.account) invalidateLeaderboardCloud({ refresh: true });
  } catch (error) {
    cloudDirty = {
      state: cloudDirty.state || dirty.state,
      community: cloudDirty.community || dirty.community,
      account: cloudDirty.account || dirty.account
    };
    cloudConfig.lastError = error.message || "Cloud sync failed";
    saveCloudConfig();
    renderCloudStatus();
  } finally {
    cloudSyncInFlight = false;
  }
}

async function syncCloudNow() {
  if (!currentUser) return;
  if (!cloudConfig.token || cloudConfig.userId !== currentUser.id) {
    els.settingsMessage.textContent = t("cloudNoSession");
    return;
  }
  cloudDirty = { state: true, community: true, account: true };
  els.settingsMessage.textContent = t("cloudSyncing");
  await flushCloudSync();
  els.settingsMessage.textContent = getCloudStatusText();
}

function renderCloudStatus() {
  if (els.settingsMessage && !els.settingsMessage.textContent.includes("已保存")) {
    els.settingsMessage.textContent = getCloudStatusText();
  }
}

function getCloudStatusText() {
  if (!cloudConfig.token || cloudConfig.userId !== currentUser?.id) return t("cloudDisconnected");
  if (cloudConfig.lastError) return t("cloudFailed", { error: cloudConfig.lastError });
  if (cloudSyncInFlight) return t("cloudSyncing");
  if (cloudConfig.lastSyncAt) return t("cloudSynced", { date: formatDate(cloudConfig.lastSyncAt) });
  return t("cloudConnected");
}

function makeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function migrateLegacyState(userId) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || localStorage.getItem(userStateKey(userId))) return;
  try {
    const legacy = normalizeState(JSON.parse(raw));
    localStorage.setItem(userStateKey(userId), JSON.stringify(localStatePayload(legacy)));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderSession() {
  currentUser = getCurrentUser();
  state = loadState();
  clearProblemLookupCaches();
  problemSocial = new Map();
  problemSocialNotice = "";
  pruneProblemCatalog();
  document.body.classList.toggle("is-authenticated", Boolean(currentUser));
  window.scrollTo(0, 0);
  consumeIncomingCapture();

  els.authShell.classList.toggle("hidden", Boolean(currentUser));
  els.appShell.classList.toggle("hidden", !currentUser);
  applySidebarState();
  els.regionRank.classList.toggle("hidden", !currentUser);
  els.userChip.classList.toggle("hidden", !currentUser);
  els.languageSelect.classList.remove("hidden");
  [els.settingsBtn, els.exportBtn, els.importInput?.parentElement, els.resetBtn, els.logoutBtn].filter(Boolean).forEach((node) => {
    node.classList.toggle("hidden", !currentUser);
  });

  if (!currentUser) {
    els.todayLine.textContent = t("startAfterLogin");
    els.authMessage.textContent = getAuthReadyMessage();
    renderGoogleClientInput();
    applyLanguage();
    return;
  }

  renderUserChip();
  renderAll();
  renderMentalMath();
  refreshProblemCatalog();
  refreshProblemSocial();
}

function renderUserChip() {
  els.userName.textContent = currentUser.name || currentUser.email || "Quant";
  els.userProvider.textContent = currentUser.provider === "google" ? "Google" : "Local";
  els.userAvatar.innerHTML = "";
  if (els.commandUserName) els.commandUserName.textContent = currentUser.name || currentUser.email || "Quant";
  if (els.commandUserProvider) els.commandUserProvider.textContent = currentUser.provider === "google" ? "Google" : t("accountBadge");
  if (els.commandUserAvatar) els.commandUserAvatar.innerHTML = "";

  if (currentUser.picture) {
    const image = document.createElement("img");
    image.src = currentUser.picture;
    image.alt = "";
    els.userAvatar.appendChild(image);
    if (els.commandUserAvatar) {
      const commandImage = image.cloneNode();
      els.commandUserAvatar.appendChild(commandImage);
    }
    return;
  }

  const image = document.createElement("img");
  image.src = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";
  image.alt = "";
  els.userAvatar.appendChild(image);
  if (els.commandUserAvatar) {
    const commandImage = image.cloneNode();
    els.commandUserAvatar.appendChild(commandImage);
  }
}

function renderAccount() {
  if (!currentUser || !els.accountForm) return;
  delete els.accountForm.dataset.avatarData;
  delete els.accountForm.dataset.avatarCleared;
  els.accountNameInput.value = currentUser.name || "";
  els.accountEmailInput.value = currentUser.email || "";
  els.accountAvatarUrl.value = currentUser.picture && !currentUser.picture.startsWith("data:") ? currentUser.picture : "";
  renderCountryOptions(els.accountCountrySelect, currentUser.country);
  renderRegionOptions(els.accountRegionSelect, currentUser.country, currentUser.region);
  if (els.accountGraduationTermInput) els.accountGraduationTermInput.value = currentUser.graduationTerm || DEFAULT_GRADUATION_TERM;
  renderAccountResumeMeta();
  els.accountCurrentPassword.value = "";
  els.accountProviderText.textContent = currentUser.provider === "google" ? "Google" : "Local";
  els.accountCreatedText.textContent = currentUser.createdAt ? formatNewsDate(currentUser.createdAt) : "-";
  els.accountRankText.textContent = `${getCountryLabel(currentUser.country)} · ${getRegionLabel(currentUser.region)} · ${getRank(getQuantScore())}`;
  renderAccountAvatarPreview(currentUser.picture, currentUser.name || currentUser.email || "Q");
}

function renderAccountAvatarPreview(source, fallback) {
  if (!els.accountAvatarPreview) return;
  els.accountAvatarPreview.innerHTML = "";
  if (source) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "";
    els.accountAvatarPreview.appendChild(image);
    return;
  }
  els.accountAvatarPreview.textContent = getInitials(fallback || "Q");
}

function updateAccountAvatarPreview() {
  const source = els.accountForm.dataset.avatarData || els.accountAvatarUrl.value.trim();
  delete els.accountForm.dataset.avatarCleared;
  renderAccountAvatarPreview(source, els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
}

function handleAccountAvatarFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    els.accountMessage.textContent = "请选择图片文件。";
    event.target.value = "";
    return;
  }
  if (file.size > 1_800_000) {
    els.accountMessage.textContent = "头像图片太大，先换一张 1.8MB 以下的图片。";
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.accountForm.dataset.avatarData = String(reader.result);
    delete els.accountForm.dataset.avatarCleared;
    els.accountAvatarUrl.value = "";
    renderAccountAvatarPreview(String(reader.result), els.accountNameInput.value || currentUser?.name || "Q");
  });
  reader.readAsDataURL(file);
}

function clearAccountAvatar() {
  delete els.accountForm.dataset.avatarData;
  els.accountForm.dataset.avatarCleared = "true";
  els.accountAvatarUrl.value = "";
  els.accountAvatarFile.value = "";
  renderAccountAvatarPreview("", els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
}

async function saveAccount() {
  if (!currentUser) return;
  const name = els.accountNameInput.value.trim();
  const email = normalizeEmail(els.accountEmailInput.value);
  const country = normalizeCountry(els.accountCountrySelect.value);
  const region = normalizeRegionForCountry(els.accountRegionSelect.value, country);
  const graduationTerm = normalizeGraduationTerm(els.accountGraduationTermInput?.value);
  const avatarUrl = els.accountAvatarUrl.value.trim();
  const picture = els.accountForm.dataset.avatarCleared
    ? ""
    : els.accountForm.dataset.avatarData || avatarUrl || currentUser.picture || "";

  if (!name || !email) {
    els.accountMessage.textContent = "昵称和邮箱都要填。";
    return;
  }

  const duplicate = auth.accounts.some((account) => account.id !== currentUser.id && normalizeEmail(account.email) === email);
  if (duplicate) {
    els.accountMessage.textContent = "这个邮箱已经被另一个账户使用。";
    return;
  }

  const updates = {
    name,
    email,
    country,
    region,
    graduationTerm,
    picture,
    updatedAt: new Date().toISOString()
  };

  if (currentUser.provider === "local" && normalizeEmail(currentUser.email) !== email) {
    const password = els.accountCurrentPassword.value;
    if (!password) {
      els.accountMessage.textContent = "更改本地账户邮箱需要输入当前密码。";
      return;
    }
    const oldHash = await hashPassword(currentUser.email, password);
    if (oldHash !== currentUser.passwordHash) {
      els.accountMessage.textContent = "当前密码不对，邮箱没有更新。";
      return;
    }
    updates.passwordHash = await hashPassword(email, password);
  }

  auth.accounts = auth.accounts.map((account) => (account.id === currentUser.id ? { ...account, ...updates } : account));
  saveAuth();
  currentUser = getCurrentUser();
  state.leaderboard = normalizeLeaderboardSettings({ ...state.leaderboard, country, region });
  saveState();
  queueCloudSync("account", 0);
  renderUserChip();
  renderAll();
  switchModule("account");
  els.accountMessage.textContent = t("accountUpdated");
}

function switchAuthTab(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tab);
  });
  els.loginForm.classList.toggle("hidden", tab !== "login");
  els.registerForm.classList.toggle("hidden", tab !== "register");
  els.authMessage.textContent = "";
}

async function sendRegisterVerificationCode() {
  const email = normalizeEmail(els.registerEmail.value);
  if (!email || !email.includes("@")) {
    showAuthMessage(t("authNeedEmail"));
    return;
  }
  if (auth.accounts.some((account) => normalizeEmail(account.email) === email)) {
    showAuthMessage(t("authDuplicateEmail"));
    return;
  }

  delete els.registerForm.dataset.verificationOptional;
  setRegisterCodeButtonBusy(true, t("sending"));
  try {
    const result = await sendCloudVerificationCode(email, "register");
    startRegisterCodeCooldown(Number(result.cooldownSeconds || 60));
    const devCode = result.devCode ? t("authDevCode", { code: result.devCode }) : "";
    const delivery = result.delivery === "dev" ? t("authDeliveryDev") : t("authDeliveryEmail");
    showAuthMessage(t("authVerificationSent", { email, delivery, devCode }));
  } catch (error) {
    if (!error.status) {
      els.registerForm.dataset.verificationOptional = "true";
      showAuthMessage(t("authCloudVerificationUnavailable"));
    } else {
      showAuthMessage(getVerificationErrorMessage(error));
    }
    setRegisterCodeButtonBusy(false);
  }
}

function setRegisterCodeButtonBusy(isBusy, label = t("sendVerificationCode")) {
  if (!els.sendRegisterCodeBtn) return;
  els.sendRegisterCodeBtn.disabled = Boolean(isBusy);
  els.sendRegisterCodeBtn.textContent = label;
}

function startRegisterCodeCooldown(seconds) {
  window.clearInterval(registerCodeTimer);
  let remaining = Math.max(0, Math.floor(seconds || 0));
  const render = () => {
    if (!remaining) {
      setRegisterCodeButtonBusy(false);
      window.clearInterval(registerCodeTimer);
      registerCodeTimer = null;
      return;
    }
    setRegisterCodeButtonBusy(true, `${t("resendIn")} ${remaining}s`);
    remaining -= 1;
  };
  render();
  registerCodeTimer = window.setInterval(render, 1000);
}

async function registerLocal() {
  try {
    const name = els.registerName.value.trim();
    const email = normalizeEmail(els.registerEmail.value);
    const password = els.registerPassword.value;
    const verificationCode = els.registerVerificationCode.value.trim();
    const verificationOptional = els.registerForm.dataset.verificationOptional === "true";

    if (!name || !email || password.length < 6) {
      showAuthMessage(t("authMissingRegisterFields"));
      return;
    }
    if (!verificationCode && !verificationOptional) {
      showAuthMessage(t("authNeedVerificationCode"));
      return;
    }

    if (auth.accounts.some((account) => normalizeEmail(account.email) === email)) {
      showAuthMessage(t("authDuplicateEmail"));
      return;
    }

    const account = {
      id: makeId(),
      provider: "local",
      name,
      email,
      country: "china",
      region: "上海",
      graduationTerm: DEFAULT_GRADUATION_TERM,
      passwordHash: await hashPassword(email, password),
      createdAt: new Date().toISOString()
    };

    migrateLegacyState(account.id);
    const localState = loadStateForUser(account.id);

    if (!verificationOptional) {
      try {
        const cloudSession = await registerCloudAccount(account, password, localState, community, verificationCode);
        applyCloudSession(cloudSession, {
          localState,
          localCommunity: community,
          passwordHash: account.passwordHash
        });
        els.registerForm.reset();
        showAuthMessage(t("authCreatedSynced"));
        renderSession();
        return;
      } catch (error) {
        if (error.status) {
          showAuthMessage(getVerificationErrorMessage(error));
          return;
        }
        showAuthMessage(t("authCloudLocalCreated"));
      }
    }

    auth.accounts.push(account);
    auth.currentUserId = account.id;
    saveAuth();
    els.registerForm.reset();
    renderSession();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error));
  }
}

async function loginLocal() {
  try {
    const email = normalizeEmail(els.loginEmail.value);
    const password = els.loginPassword.value;
    const account = auth.accounts.find((item) => item.provider === "local" && normalizeEmail(item.email) === email);

    try {
      const cloudSession = await loginCloudAccount(email, password);
      const remoteAccount = normalizeAccount(cloudSession.account || {});
      const localAccount = auth.accounts.find((item) => item.id === remoteAccount.id || normalizeEmail(item.email) === email);
      const localState = localAccount ? loadStateForUser(localAccount.id) : createBaseState();
      const localFields = localAccount?.passwordHash
        ? { passwordHash: localAccount.passwordHash }
        : { passwordHash: await hashPassword(email, password) };
      applyCloudSession(cloudSession, {
        localState,
        localCommunity: community,
        ...localFields
      });
      els.loginForm.reset();
      showAuthMessage("");
      renderSession();
      return;
    } catch (error) {
      if (!account && error.status && error.status !== 401) {
        showAuthMessage(t("authCloudNoLocal"));
        return;
      }
      if (!account && error.status === 401) {
        showAuthMessage(t("authCloudLoginFailed"));
        return;
      }
    }

    if (!account) {
      showAuthMessage(t("authNoLocalAccount"));
      return;
    }

    const passwordHash = await hashPassword(email, password);
    if (passwordHash !== account.passwordHash) {
      showAuthMessage(t("authWrongPassword"));
      return;
    }

    auth.currentUserId = account.id;
    saveAuth();
    migrateLegacyState(account.id);
    const localState = loadStateForUser(account.id);
    try {
      const cloudSession = await loginCloudAccount(email, password);
      applyCloudSession(cloudSession, {
        localState,
        localCommunity: community,
        passwordHash: account.passwordHash
      });
    } catch {
      cloudConfig.lastError = getLanguage() === "en"
        ? "Cloud API is not connected; this session is using the local account."
        : "云端 API 未连接，本次使用本地账户。";
      saveCloudConfig();
    }
    els.loginForm.reset();
    showAuthMessage("");
    renderSession();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error));
  }
}

function logout() {
  auth.currentUserId = "";
  saveAuth();
  currentUser = null;
  state = createBaseState();
  renderSession();
  initGoogleLogin();
}

function saveGoogleClientId() {
  auth.googleClientId = els.googleClientIdInput?.value.trim() || "";
  saveAuth();
  renderGoogleClientInput();
  initGoogleLogin();
}

function renderGoogleClientInput() {
  if (els.googleClientIdInput) els.googleClientIdInput.value = auth.googleClientId || "";
}

function renderGooglePlaceholder() {
  if (!els.googleButton) return;
  els.googleButton.innerHTML = `
    <button class="auth-provider-button disabled" type="button" disabled aria-disabled="true">
      <span class="google-mark" aria-hidden="true">G</span>
      <span>${escapeHtml(t("googleContinue"))}</span>
      <small>${escapeHtml(t("notEnabled"))}</small>
    </button>
  `;
}

function initGoogleLogin() {
  if (!els.googleButton) return;
  renderGoogleClientInput();
  els.googleButton.innerHTML = "";

  if (!GOOGLE_LOGIN_ENABLED) {
    googleInitRetries = 0;
    renderGooglePlaceholder();
    return;
  }

  if (!auth.googleClientId) {
    googleInitRetries = 0;
    renderGooglePlaceholder();
    return;
  }

  if (!window.google?.accounts?.id) {
    if (googleInitRetries < 12) {
      googleInitRetries += 1;
      showAuthMessage(t("authGoogleLoading"));
      window.setTimeout(initGoogleLogin, 500);
    } else {
      showAuthMessage(t("authGoogleLoadFailed"));
    }
    return;
  }

  googleInitRetries = 0;
  window.google.accounts.id.initialize({
    client_id: auth.googleClientId,
    callback: handleGoogleCredential,
    auto_select: false
  });
  window.google.accounts.id.renderButton(els.googleButton, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "signin_with",
    width: Math.min(420, els.googleButton.clientWidth || 420)
  });
  showAuthMessage(t("authGoogleEnabled"));
}

async function handleGoogleCredential(response) {
  try {
    const payload = parseJwt(response.credential);
    if (payload.aud !== auth.googleClientId) {
      showAuthMessage(t("authGoogleClientMismatch"));
      return;
    }

    const id = `google:${payload.sub}`;
    const existing = auth.accounts.find((account) => account.id === id);
    const account = {
      ...(existing || {}),
      id,
      provider: "google",
      name: payload.name || payload.email || "Google User",
      email: payload.email || "",
      country: existing?.country || "china",
      region: existing?.region || "上海",
      graduationTerm: existing?.graduationTerm || DEFAULT_GRADUATION_TERM,
      picture: payload.picture || "",
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      auth.accounts = auth.accounts.map((item) => (item.id === id ? account : item));
    } else {
      auth.accounts.push({ ...account, createdAt: new Date().toISOString() });
    }

    auth.currentUserId = id;
    saveAuth();
    migrateLegacyState(id);
    const localState = loadStateForUser(id);
    try {
      const cloudSession = await loginCloudGoogle(account, response.credential, localState, community);
      applyCloudSession(cloudSession, { localState, localCommunity: community });
    } catch {
      cloudConfig.lastError = getLanguage() === "en"
        ? "Google signed in locally; cloud API is not connected."
        : "Google 已本地登录；云端 API 未连接。";
      saveCloudConfig();
    }
    renderSession();
  } catch {
    showAuthMessage(t("authGoogleParseFailed"));
  }
}

function parseJwt(token) {
  const part = token.split(".")[1];
  const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
  const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent([...json].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
}

async function hashPassword(email, password) {
  const value = `${normalizeEmail(email)}:${password}`;
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `fallback-${fallbackHash(value)}`;
}

function fallbackHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getAuthReadyMessage() {
  if (location.protocol === "file:") {
    return t("authReadyFile");
  }
  return GOOGLE_LOGIN_ENABLED
    ? t("authReadyCloud")
    : t("authReadyLocal");
}

function getVerificationErrorMessage(error) {
  const raw = String(error?.message || "");
  if (error?.status === 409) return t("authDuplicateEmail");
  if (error?.status === 403) return t("verificationForbidden");
  if (error?.status === 429) return raw.includes("wait") ? t("verificationTooSoon") : t("verificationTooMany");
  if (error?.status === 502) return t("verificationEmailDown");
  if (/verification|code/i.test(raw)) return t("verificationInvalid");
  return t("verificationFailed");
}

function getAuthErrorMessage(error) {
  if (location.protocol === "file:") {
    return t("authStorageFileBlocked");
  }
  if (/quota|storage|localStorage|SecurityError/i.test(`${error?.name || ""} ${error?.message || ""}`)) {
    return t("authStorageBlocked");
  }
  return t("authOperationFailed");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeAccount(account = {}) {
  const country = normalizeCountry(account.country || inferCountryFromRegion(account.region));
  return {
    ...account,
    country,
    region: normalizeRegionForCountry(account.region, country),
    graduationTerm: normalizeGraduationTerm(account.graduationTerm)
  };
}

function normalizeGraduationTerm(value) {
  const term = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(term) ? term : DEFAULT_GRADUATION_TERM;
}

function normalizeCountry(country) {
  const key = String(country || "").trim();
  const aliases = {
    cn: "china",
    china: "china",
    "中国": "china",
    us: "unitedStates",
    usa: "unitedStates",
    "u.s.": "unitedStates",
    "united states": "unitedStates",
    unitedStates: "unitedStates",
    "美国": "unitedStates",
    uk: "unitedKingdom",
    gb: "unitedKingdom",
    britain: "unitedKingdom",
    "united kingdom": "unitedKingdom",
    unitedKingdom: "unitedKingdom",
    "英国": "unitedKingdom",
    sg: "singapore",
    singapore: "singapore",
    "新加坡": "singapore"
  };
  return locationDefs[key] ? key : aliases[key] || "china";
}

function inferCountryFromRegion(region) {
  const value = String(region || "").trim();
  if (!value) return "china";
  if (locationDefs.china.regions.includes(value) || value === "Shanghai") return "china";
  if (locationDefs.unitedStates.regions.includes(value)) return "unitedStates";
  if (locationDefs.unitedKingdom.regions.includes(value)) return "unitedKingdom";
  if (locationDefs.singapore.regions.includes(value)) return "singapore";
  return "china";
}

function normalizeRegionForCountry(region, country) {
  const normalizedCountry = normalizeCountry(country);
  const regions = locationDefs[normalizedCountry].regions;
  const aliases = {
    Shanghai: "上海",
    Beijing: "北京",
    Guangdong: "广东",
    Zhejiang: "浙江",
    Jiangsu: "江苏",
    "New York State": "New York",
    "Washington DC": "District of Columbia",
    London: "Greater London"
  };
  const raw = String(region || "").trim();
  const value = aliases[raw] || raw;
  return regions.includes(value) ? value : getDefaultRegion(normalizedCountry);
}

function getDefaultRegion(country) {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry === "china") return "上海";
  if (normalizedCountry === "unitedStates") return "California";
  if (normalizedCountry === "unitedKingdom") return "Greater London";
  if (normalizedCountry === "singapore") return "Central Region";
  return locationDefs[normalizedCountry].regions[0];
}

function getCountryLabel(country) {
  const def = locationDefs[normalizeCountry(country)];
  return getLanguage() === "en" ? def.nameEn || def.name : def.name;
}

function getRegionLabel(region) {
  if (getLanguage() === "en") return regionEnLabels[region] || region;
  return region;
}

function renderCountryOptions(select, selectedCountry = "china") {
  if (!select) return;
  const selected = normalizeCountry(selectedCountry);
  select.innerHTML = "";
  Object.entries(locationDefs).forEach(([key, def]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = getCountryLabel(key);
    option.selected = key === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

function renderRegionOptions(select, country = "china", selectedRegion = "") {
  if (!select) return;
  const normalizedCountry = normalizeCountry(country);
  const selected = normalizeRegionForCountry(selectedRegion, normalizedCountry);
  select.innerHTML = "";
  locationDefs[normalizedCountry].regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = getRegionLabel(region);
    option.selected = region === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

function defaultLeaderboardSettings() {
  const country = currentUser?.country || "china";
  const region = currentUser?.region || getDefaultRegion(country);
  return {
    scope: "global",
    country: normalizeCountry(country),
    region: normalizeRegionForCountry(region, country),
    metric: "overall"
  };
}

function normalizeLeaderboardSettings(settings = {}) {
  const fallback = defaultLeaderboardSettings();
  const country = normalizeCountry(settings.country || fallback.country);
  const metric = settings.metric && (settings.metric === "overall" || skillDefs[settings.metric]) ? settings.metric : fallback.metric;
  const scope = ["global", "country", "region"].includes(settings.scope) ? settings.scope : fallback.scope;
  return {
    scope,
    country,
    region: normalizeRegionForCountry(settings.region || fallback.region, country),
    metric
  };
}

function getInitials(value) {
  const cleaned = value.trim();
  if (!cleaned) return "Q";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function showAuthMessage(message) {
  if (els.authMessage) els.authMessage.textContent = message;
}

function applyLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = t("appTitle");
  if (els.languageSelect) els.languageSelect.value = language;
  if (els.settingsLanguageSelect) els.settingsLanguageSelect.value = language;
  applyStaticTranslations();
  if (els.googleButton?.querySelector(".auth-provider-button.disabled")) renderGooglePlaceholder();
  if (!currentUser && els.authMessage && (
    !els.authMessage.textContent.trim()
    || textMatchesI18nKeys(els.authMessage.textContent, ["authReadyFile", "authReadyCloud", "authReadyLocal"])
  )) {
    els.authMessage.textContent = getAuthReadyMessage();
  }

  setButtonLabel('[data-module-tab="overview"]', t("overview"));
  setButtonLabel('[data-module-tab="plan"]', t("plan"));
  setButtonLabel('[data-module-tab="experiences"]', t("experiences"));
  setButtonLabel('[data-module-tab="community"]', t("community"));
  setButtonLabel('[data-module-tab="problems"]', t("problems"));
  setButtonLabel('[data-module-tab="interview"]', t("interview"));
  setButtonLabel('[data-module-tab="pk"]', t("pk"));
  setButtonLabel('[data-module-tab="news"]', t("news"));
  setButtonLabel('[data-module-tab="network"]', t("network"));
  setButtonLabel('[data-module-tab="messages"]', t("messages"));
  setButtonLabel('[data-module-tab="resume"]', t("resume"));
  setButtonLabel('[data-module-tab="jobs"]', t("jobs"));
  setButtonLabel('[data-module-tab="companies"]', t("companies"));
  setButtonLabel('[data-module-tab="library"]', language === "en" ? "Library" : "书城");
  setButtonLabel('[data-module-tab="courses"]', t("courses"));
  setButtonLabel('[data-module-tab="skills"]', t("skills"));
  setButtonLabel('[data-module-tab="tools"]', t("tools"));
  setButtonLabel('[data-module-tab="memory"]', t("memory"));
  setButtonLabel('[data-module-tab="settings"]', t("settings"));
  setText('[data-problem-view="all"]', t("allProblems"));
  setText('[data-problem-view="saved"]', t("savedProblems"));
  setText('[data-problem-view="ranking"]', t("popularProblems"));
  setText(".problem-ranking-header h3", t("problemRankingTitle"));
  setText(".problem-ranking-header p", t("problemRankingHint"));
  setText("#skillsPageTitle", t("skills"));
  setText("#skillsPageSubtitle", t("skillPageSubtitle"));
  setText("#skillsScoreLabel", t("quantScore"));
  setText("#skillsScoreCopy", t("skillScoreCopy"));
  setText("#skillsEntriesLabel", t("practiceRecords"));
  setText("#skillsAverageLabel", t("averageScore"));
  setText("#skillsWeakestLabel", t("weakestSkill"));
  setText("#skillRadarTitle", t("skillRadarTitle"));
  setText("#skillRadarHint", t("skillRadarHint"));
  setText(".sidebar-helper strong", t("todayGuide"));
  updatePrepTaskIndicator();

  updateGlobalSearchPlaceholder();
  setTexts(".app-command-actions .app-stat-pill small", [t("commandStreakLabel"), t("commandChatLabel")]);
  updateCheckInPill();
  setText("#todoDockButtonLabel", t("todoButton"));
  setText("#todoDockEyebrow", t("todoEyebrow"));
  setText("#todoDockTitle", t("todoTitle"));
  setPlaceholder("todoDockAddInput", t("todoAddPlaceholder"));
  setButtonLabel("#todoDockAddForm .secondary-button", t("todoAdd"));
  setAttribute(".app-account-chip", "aria-label", t("accountInfo"));
  setAttribute(".app-settings-button", "aria-label", t("settings"));
  applySidebarState();
  setButtonLabel("#generateStudyPlanBtn", t("designStudyPlan"));

  setText(".summary-copy .rank-label", t("rankLabel"));
  setText(".total-xp span:last-child", t("scoreSuffix"));
  setTexts(".summary-metrics small", [t("streak"), t("records"), t("weeklyXp")]);
  setText(".log-panel h2", t("todayLog"));
  setPlaceholder("logText", t("todayLogPlaceholder"));
  setPlaceholder("durationInput", t("minutesPlaceholder"));
  setSelectOptionLabels("difficultyInput", [t("difficultyNormal"), t("difficultyMedium"), t("difficultyHard")]);
  setButtonLabel("#logForm .primary-button", t("submitLog"));
  setText(".leaderboard-panel h2", t("leaderboard"));
  setLabelFor("leaderboardMetricSelect", t("leaderboardMetric"));
  setLabelFor("leaderboardScopeSelect", t("leaderboardScope"));
  setLabelFor("leaderboardCountrySelect", t("country"));
  setLabelFor("leaderboardRegionSelect", t("region"));
  setText(".overview-community h2", t("community"));
  setText("#overviewCommunitySummary", t("overviewCommunitySummary"));
  setText(".community-section h2", t("community"));
  setText("#communitySummary", t("communitySummary"));
  setText("#messagesPageTitle", t("messages"));
  setText("#messagesSummary", t("messagesSummary"));
  setPlaceholder("messageComposerInput", t("messageComposerPlaceholder"));
  setPlaceholder("librarySearch", language === "en" ? "Search books, sets, sources" : "搜索书籍、题单、题源");
  setText('[data-library-kind="all"]', language === "en" ? "All" : "全部");
  setText('[data-library-kind="book"]', language === "en" ? "Books" : "书籍");
  setText('[data-library-kind="questionSet"]', language === "en" ? "Question Sets" : "题单");
  setText("#libraryContinueTitle", language === "en" ? "Continue Reading" : "继续阅读");
  setText("#libraryBookTitle", language === "en" ? "Books" : "书籍");
  setText("#libraryQuestionTitle", language === "en" ? "Question Sets" : "题单");
  setText("#libraryEmpty", language === "en" ? "No matching books or question sets." : "没有匹配的书籍或题单。");
  setText(".problem-page-copy .rank-label", t("problemEyebrow"));
  setText(".problem-page-copy h2", t("problemTitle"));
  setText(".problem-page-copy p", t("problemSubtitle"));
  setPlaceholder("problemSearch", t("problemSearchPlaceholder"));
  setAttribute("#addProblemBtn", "title", t("addProblem"));
  setAttribute("#addProblemBtn", "aria-label", t("addProblem"));
  setText(".settings-section h2", t("settings"));
  if (els.settingsMessage && !/已保存|saved|同步|sync|连接|connect/i.test(els.settingsMessage.textContent)) {
    els.settingsMessage.textContent = t("settingsMessageDefault");
  }
  setTexts(".settings-panel h3", [t("preferences"), t("data")]);
  setText(".account-section h2", t("accountInfo"));
  setText(".account-meta-panel h3", t("accountInfo"));
  if (els.accountMessage && !/已更新|updated/i.test(els.accountMessage.textContent)) {
    els.accountMessage.textContent = t("accountMessage");
  }
  setTexts(".account-meta-panel dt", [t("provider"), t("createdAt"), t("currentRank")]);

  setLabelFor("accountNameInput", t("nickname"));
  setLabelFor("accountEmailInput", t("email"));
  setLabelFor("accountCountrySelect", t("country"));
  setLabelFor("accountRegionSelect", t("region"));
  setLabelFor("accountGraduationTermInput", t("graduationTerm"));
  setLabelFor("accountResumeFile", t("resumeUpload"));
  setLabelFor("accountCurrentPassword", t("currentPassword"));
  setLabelFor("settingsLanguageSelect", t("language"));
  setLabelFor("settingsCountrySelect", t("defaultCountry"));
  setLabelFor("settingsRegionSelect", t("defaultRegion"));

  setButtonLabel("#accountForm .primary-button", t("saveAccount"));
  setText(".resume-section h2", t("resumeModule"));
  setText("#resumeSummary", t("resumeSummary"));
  setLabelFor("resumeText", t("resumeContent"));
  setPlaceholder("resumeText", t("resumePlaceholder"));
  setButtonLabel("#reviewResumeBtn", t("reviewResume"));
  setButtonLabel("#saveResumeBtn", t("saveResume"));
  setText(".resume-panel h3", t("resumeReviewTitle"));
  setText(".jobs-section h2", t("jobsModule"));
  setText("#jobsSummary", t("jobsSummary"));
  setText("#companiesPageTitle", t("companies"));
  setText("#companiesSummary", t("companiesSummary"));
  setText("#problemCompanyTitle", t("problemCompanyTitle"));
  setText("#problemCompanySummary", t("problemCompanySummary"));
  setButtonLabel("#problemCompanyClearBtn", t("allCompanies"));
  setButtonLabel('[data-company-tier="all"]', t("allCompanies"));
  setButtonLabel('[data-company-tier="s"]', "Tier S");
  setButtonLabel('[data-company-tier="a"]', "Tier A");
  setButtonLabel('[data-company-tier="b"]', "Tier B");
  setButtonLabel('[data-job-filter="all"]', t("allJobs"));
  setButtonLabel('[data-job-filter="internship"]', t("internship"));
  setButtonLabel('[data-job-filter="fulltime"]', t("fulltime"));
  setAttribute("#refreshJobsBtn", "title", t("refreshJobs"));
  setAttribute("#refreshJobsBtn", "aria-label", t("refreshJobs"));
  setText(".news-section h2", t("newsModuleTitle"));
  setText("#newsIntelTitle", t("newsIntelTitle"));
  setText("#newsIntelSummary", t("newsIntelSummary"));
  setText("#newsSocialHint", t("newsSocialHint"));
  setAttribute("#addNewsBtn", "title", t("newsAdd"));
  setAttribute("#addNewsBtn", "aria-label", t("newsAdd"));
  setAttribute("#refreshNewsBtn", "title", t("refreshNews"));
  setAttribute("#refreshNewsBtn", "aria-label", t("refreshNews"));
  setButtonLabel('[data-news-topic="all"]', t("newsTopicAll"));
  setButtonLabel('[data-news-topic="quantFirms"]', t("newsTopicQuantFirms"));
  setButtonLabel('[data-news-topic="marketStructure"]', t("newsTopicMarketStructure"));
  setButtonLabel('[data-news-topic="aiInfra"]', t("newsTopicAiInfra"));
  setButtonLabel('[data-news-topic="recruiting"]', t("newsTopicRecruiting"));
  setButtonLabel('[data-news-source-filter="all"]', t("newsSourceAll"));
  setButtonLabel('[data-news-source-filter="news"]', t("newsSourceNews"));
  setButtonLabel('[data-news-source-filter="official"]', t("newsSourceOfficial"));
  setButtonLabel('[data-news-source-filter="social"]', t("newsSourceSocial"));
  setSelectOptionLabels("newsSourceType", [
    t("newsSourceNews"),
    t("newsSourceOfficial"),
    t("newsSourceLinkedIn"),
    t("newsSourceXiaohongshu"),
    t("newsSourceManual")
  ]);
  setPlaceholder("newsTitle", t("newsTitlePlaceholder"));
  setPlaceholder("newsSource", t("newsSourcePlaceholder"));
  setPlaceholder("newsUrl", t("newsUrlPlaceholder"));
  setPlaceholder("newsTags", t("newsTagsPlaceholder"));
  setPlaceholder("newsSummary", t("newsSummaryPlaceholder"));
  setPlaceholder("newsInsight", t("newsInsightPlaceholder"));
  setButtonLabel("#newsForm .secondary-button", t("newsSave"));
  setText(".courses-section h2", t("coursesModule"));
  setText("#coursesSummary", t("coursesSummary"));
  setText("#learningPathTitle", t("learningPathTitle"));
  setText("#learningPathHint", t("learningPathHint"));
  setPlaceholder("resourceSources", t("resourceSourcesPlaceholder"));
  setText(".network-section h2", t("networkModule"));
  setAttribute("#addNetworkBtn", "title", t("networkAdd"));
  setAttribute("#addNetworkBtn", "aria-label", t("networkAdd"));
  setButtonLabel("#networkForm .secondary-button", t("networkSave"));
  setNetworkStatusOptionLabels();
  setButtonLabel("#settingsForm .primary-button", t("saveSettings"));
  setButtonLabel("#communityForm .primary-button", t("post"));
  setButtonLabel("#overviewCommunityForm .primary-button", t("post"));
  setFileLabel("#communityForm .secondary-button", els.communityMedia, t("addMedia"));
  setButtonLabel("#exportBtn", t("exportBackup"));
  setButtonLabel("#resetBtn", t("resetMemory"));
  setButtonLabel("#syncCloudBtn", t("syncCloud"));
  setButtonLabel("#logoutBtn", t("logout"));
  setImportButtonLabel();

  setPlaceholder("communityText", t("communityPlaceholder"));
  setPlaceholder("overviewCommunityText", t("overviewCommunityPlaceholder"));

  setText("#newsDetail .news-impact strong", t("newsImpact"));
  setText("#newsDetailReadBadge", t("newsReadCount"));

  const scopeOptions = els.leaderboardScopeSelect?.options || [];
  if (scopeOptions.length >= 3) {
    scopeOptions[0].textContent = t("leaderboardGlobal");
    scopeOptions[1].textContent = t("leaderboardCountry");
    scopeOptions[2].textContent = t("leaderboardRegion");
  }
  renderLeaderboardScopeSummary(normalizeLeaderboardSettings(state.leaderboard), getLeaderboardRows());
  startHeroTypewriter();
}

function setButtonLabel(selector, label) {
  const button = document.querySelector(selector);
  if (!button) return;
  const icon = button.querySelector("svg, i");
  button.textContent = "";
  if (icon) button.append(icon, document.createTextNode(` ${label}`));
  else button.textContent = label;
}

function setImportButtonLabel() {
  setFileLabel(null, els.importInput, t("importBackup"));
}

function setFileLabel(selector, input, labelText) {
  const label = selector ? document.querySelector(selector) : input?.closest("label");
  if (!label) return;
  const icon = label.querySelector("svg, i");
  label.textContent = "";
  if (input) label.appendChild(input);
  if (icon) label.append(icon, document.createTextNode(` ${labelText}`));
  else label.append(labelText);
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  const raw = String(value || "#").trim();
  if (!/^https?:\/\//i.test(raw)) return "#";
  return escapeHtml(raw);
}

function safeExternalUrl(value) {
  const raw = String(value || "#").trim();
  return /^https?:\/\//i.test(raw) ? raw : "#";
}

function openExternalUrl(value) {
  const url = safeExternalUrl(value);
  if (url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function normalizeContentSources(rawSources, fallback = {}) {
  const sourceList = Array.isArray(rawSources) ? rawSources : [];
  const fallbackUrl = String(fallback.url || "").trim();
  const candidates = [
    ...sourceList,
    ...(fallbackUrl ? [fallback] : [])
  ];
  const seen = new Set();
  return candidates
    .map((source, index) => normalizeContentSource(source, index))
    .filter((source) => {
      if (!source.url || safeExternalUrl(source.url) === "#") return false;
      const key = source.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeContentSource(raw = {}, index = 0) {
  const url = String(raw?.url || raw?.sourceUrl || raw || "").trim();
  const provider = normalizeSourceProvider(raw?.provider || raw?.platform || inferSource(url));
  const embed = getOfficialEmbed(url, provider);
  const title = String(raw?.title || raw?.label || provider || "Original").trim();
  return {
    id: String(raw?.id || stableCourseId(`${provider}-${title}-${index}`, url)),
    title,
    provider,
    url,
    embedUrl: String(raw?.embedUrl || embed.embedUrl || "").trim(),
    videoId: String(raw?.videoId || embed.videoId || "").trim(),
    embeddable: Boolean(raw?.embedUrl || embed.embedUrl)
  };
}

function normalizeSourceProvider(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (/youtube|youtu\.be/.test(lower)) return "YouTube";
  if (/bilibili|bili|b站/.test(lower)) return "Bilibili";
  if (/ocw|mit/.test(lower)) return raw || "MIT OCW";
  return raw || "Original";
}

function getOfficialEmbed(url, provider = "") {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      provider: "YouTube",
      videoId: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`
    };
  }
  const bvid = getBilibiliBvid(url);
  if (bvid) {
    return {
      provider: "Bilibili",
      videoId: bvid,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&autoplay=0`
    };
  }
  const lower = String(provider || "").toLowerCase();
  if (lower.includes("youtube") || lower.includes("bilibili")) return { provider, videoId: "", embedUrl: "" };
  return { provider, videoId: "", embedUrl: "" };
}

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(String(url || ""));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function getBilibiliBvid(url) {
  const value = String(url || "");
  try {
    const parsed = new URL(value);
    const fromQuery = parsed.searchParams.get("bvid");
    if (fromQuery) return fromQuery;
    const match = parsed.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
    return match?.[1] || "";
  } catch {
    const match = value.match(/BV[a-zA-Z0-9]+/i);
    return match?.[0] || "";
  }
}

function setAttribute(selector, attribute, value) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute(attribute, value);
}

function setTexts(selector, values) {
  document.querySelectorAll(selector).forEach((node, index) => {
    if (values[index]) node.textContent = values[index];
  });
}

function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
}

function setButtonLabels(selector, labels) {
  document.querySelectorAll(selector).forEach((button, index) => {
    if (!labels[index]) return;
    const icon = button.querySelector("svg, i");
    button.textContent = "";
    if (icon) button.append(icon, document.createTextNode(` ${labels[index]}`));
    else button.textContent = labels[index];
  });
}

function setSelectOptionLabels(id, labels) {
  const options = els[id]?.options || [];
  labels.forEach((label, index) => {
    if (options[index]) options[index].textContent = label;
  });
}

function setNetworkStatusOptionLabels() {
  [...(els.networkStatus?.options || [])].forEach((option) => {
    option.textContent = getNetworkStatusLabel(option.value);
  });
}

function setPlaceholder(id, text) {
  if (els[id]) els[id].placeholder = text;
}

function updateGlobalSearchPlaceholder() {
  const compact = window.matchMedia?.("(max-width: 520px)")?.matches;
  setPlaceholder("globalSearchInput", t(compact ? "appSearchPlaceholderCompact" : "appSearchPlaceholder"));
  setAttribute("#globalSearchInput", "aria-label", t("appSearchPlaceholder"));
}

function setLabelFor(id, text) {
  const input = els[id];
  const label = input?.closest("label");
  if (!label) return;
  const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) textNode.textContent = `\n                ${text}\n                `;
}

function switchModule(moduleName = "overview") {
  const hasTargetModule = [...document.querySelectorAll("[data-module-view]")]
    .some((view) => view.dataset.moduleView === moduleName);
  const targetModule = hasTargetModule ? moduleName : "overview";
  let activeTab = null;

  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    const isActive = button.dataset.moduleTab === targetModule;
    button.classList.toggle("active", isActive);
    if (isActive) activeTab = button;
  });
  document.querySelectorAll("[data-module-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.moduleView === targetModule);
  });
  document.body.classList.toggle("is-poker-module", targetModule === "poker");
  if (targetModule === "overview") renderNewsTicker();
  if (targetModule === "news") {
    renderNewsTicker();
    renderNews();
  }
  if (targetModule === "account") renderAccount();
  if (targetModule === "plan") renderPrepPlan();
  if (targetModule === "experiences") renderExperiences();
  if (targetModule === "community") renderCommunity();
  if (targetModule === "messages") renderMessages();
  if (targetModule === "tools") renderMentalMath();
  if (targetModule === "poker") {
    if (!currentPokerGame) currentPokerGame = makePokerGameRound();
    renderPokerGame();
  }
  if (targetModule === "network") renderNetwork();
  if (targetModule === "resume") renderResume();
  if (targetModule === "jobs") renderJobs();
  if (targetModule === "companies") renderCompanies();
  if (targetModule === "library") renderLibrary();
  if (targetModule === "courses") renderCourses();
  if (targetModule === "settings") renderSettings();
  if (targetModule === "skills") drawRadar();
  if (activeTab && window.matchMedia("(max-width: 760px)").matches) {
    window.requestAnimationFrame(() => {
      activeTab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderAccount();
  renderSummary();
  consumePendingCapture();
  renderProblems();
  renderInterviewSetup();
  renderInterviewTranscript();
  renderInterviewFavorites();
  renderSkills();
  renderHistory();
  renderLeaderboard();
  renderResources();
  renderNetwork();
  renderTodayPlan();
  renderPrepPlan();
  renderTodoDock();
  renderExperiences();
  renderResume();
  renderJobs();
  renderCompanies();
  renderLibrary();
  renderCourses();
  renderCommunity();
  renderMessages();
  renderMentalMath();
  renderSettings();
  renderNewsTicker();
  renderNews();
  maybeAutoRefreshNews();
  maybeAutoRefreshJobs();
  drawRadar();
  updatePreview();
  refreshIcons();
  applyLanguage();
}

function renderSummary() {
  const now = new Date();
  els.todayLine.textContent = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(now);

  const score = getQuantScore();
  const streak = getStreak();
  els.totalXp.textContent = formatScore(score);
  els.rankName.textContent = getRank(score);
  els.entryCount.textContent = state.entries.length;
  els.weeklyXp.textContent = getWeeklyXp();
  els.streakCount.textContent = streak;
  if (els.commandStreakCount) els.commandStreakCount.textContent = streak;
  updateUnreadMessageBadge();
  updateCheckInPill();
  renderRegionRank();
  renderOverviewProblemProgress();
  renderOverviewXpBars();
  renderOverviewContributionHeatmap();
}

function startHeroTypewriter() {
  const node = els.heroTypewriter;
  if (!node) return;
  if (heroTypewriterTimer) window.clearTimeout(heroTypewriterTimer);
  const typeDelay = 78;
  const deleteDelay = 44;
  const phrasePause = 6800;
  const nextPhraseDelay = 460;
  const phrases = [
    "Sharpen your quant edge today.",
    "Practice faster. Think clearer.",
    "Turn solved problems into signal.",
    "Build interview-ready intuition."
  ];
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    node.textContent = phrases[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  node.setAttribute("aria-live", "polite");
  node.classList.remove("is-changing");

  const tick = () => {
    const phrase = phrases[phraseIndex];
    node.textContent = phrase.slice(0, charIndex);
    if (!deleting && charIndex < phrase.length) {
      charIndex += 1;
      heroTypewriterTimer = window.setTimeout(tick, typeDelay);
      return;
    }
    if (!deleting) {
      deleting = true;
      heroTypewriterTimer = window.setTimeout(tick, phrasePause);
      return;
    }
    if (charIndex > 0) {
      charIndex -= 1;
      heroTypewriterTimer = window.setTimeout(tick, deleteDelay);
      return;
    }
    deleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    heroTypewriterTimer = window.setTimeout(tick, nextPhraseDelay);
  };

  node.textContent = "";
  tick();
}

function initSharkInteractions() {
  const stage = document.getElementById("sharkStage");
  const btn = document.getElementById("sharkInteractive");
  const shark = document.getElementById("heroShark");
  const bubble = document.getElementById("sharkBubble");
  if (!stage || !btn || !shark) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // --- cursor-follow parallax ("looking at you") ---
  let raf = null;
  let targetX = 0;
  let targetY = 0;
  let targetRot = 0;
  let curX = 0;
  let curY = 0;
  let curRot = 0;

  const apply = () => {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    curRot += (targetRot - curRot) * 0.12;
    btn.style.setProperty("--sx", curX.toFixed(2) + "px");
    btn.style.setProperty("--sy", curY.toFixed(2) + "px");
    btn.style.setProperty("--srot", curRot.toFixed(2) + "deg");
    if (Math.abs(targetX - curX) > 0.1 || Math.abs(targetY - curY) > 0.1 || Math.abs(targetRot - curRot) > 0.05) {
      raf = window.requestAnimationFrame(apply);
    } else {
      raf = null;
    }
  };
  const schedule = () => { if (!raf) raf = window.requestAnimationFrame(apply); };

  if (!reduceMotion) {
    window.addEventListener("mousemove", (e) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;   // ~ -0.5..0.5+
      const dy = (e.clientY - cy) / rect.height;
      targetX = Math.max(-1, Math.min(1, dx)) * 16;
      targetY = Math.max(-1, Math.min(1, dy)) * 10;
      targetRot = Math.max(-1, Math.min(1, dx)) * 5;
      schedule();
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
      targetX = 0; targetY = 0; targetRot = 0; schedule();
    });
  }

  // --- speech bubble helper ---
  let bubbleTimer = null;
  const sharkLines = [
    "嘿，专注一点 🦈",
    "今天也要 sharpen 一下！",
    "解一道题，就离 offer 更近一点。",
    "概率题别慌，先写样本空间。",
    "连续打卡中，别断啊！",
    "速算练了吗？我在看着你哦。",
    "蒙特卡洛说：再来一次。",
    "Greeks 复习一下？",
    "好好刷题，鲨鱼罩着你。",
    "深呼吸，面试稳得很。"
  ];
  let lastLine = -1;
  const sayLine = (text) => {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("is-visible");
    if (bubbleTimer) window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => bubble.classList.remove("is-visible"), 2600);
  };
  const sayRandom = () => {
    let i = Math.floor(Math.random() * sharkLines.length);
    if (i === lastLine) i = (i + 1) % sharkLines.length;
    lastLine = i;
    sayLine(sharkLines[i]);
  };

  // --- click / poke reaction ---
  btn.addEventListener("click", () => {
    if (!reduceMotion) {
      btn.classList.remove("is-poked");
      void shark.offsetWidth; // restart animation
      btn.classList.add("is-poked");
      window.setTimeout(() => btn.classList.remove("is-poked"), 640);
    }
    sayRandom();
  });

  // --- hover greeting ---
  let hoverCooldown = 0;
  btn.addEventListener("mouseenter", () => {
    const now = Date.now();
    if (now - hoverCooldown > 6000) {
      hoverCooldown = now;
      if (!bubble?.classList.contains("is-visible")) sayLine("点我一下试试 👆");
    }
  });

  // --- idle micro-animations ---
  if (!reduceMotion) {
    let lastActivity = Date.now();
    const markActivity = () => { lastActivity = Date.now(); };
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.setInterval(() => {
      const idleFor = Date.now() - lastActivity;
      const overviewVisible = stage.offsetParent !== null;
      if (idleFor > 9000 && overviewVisible && !btn.classList.contains("is-poked")) {
        btn.classList.remove("is-idle-wiggle");
        void shark.offsetWidth;
        btn.classList.add("is-idle-wiggle");
        window.setTimeout(() => btn.classList.remove("is-idle-wiggle"), 1400);
        lastActivity = Date.now(); // avoid back-to-back
      }
    }, 4000);
  }
}

function getCatalogProblems() {
  return state.problems.filter(isCatalogProblem);
}

function isProblemCompleted(problemId) {
  return Boolean(getProblemPersonalState(problemId).completed);
}

function getProblemCompletionCount(problems = getCatalogProblems()) {
  return problems.filter((problem) => isProblemCompleted(problem.id)).length;
}

function getLeetcodeHotCompletionStats() {
  const done = normalizeLeetcodeHot100Done(state.leetcodeHot100Done).length;
  return {
    done,
    total: leetcodeHot100.length || 100
  };
}

function problemMatchesTheme(problem, theme = problemThemeFilter) {
  if (!theme || theme === "all") return true;
  return normalizeCategory(problem.category) === theme;
}

function normalizeDifficultyFilter(value = "all") {
  return ["easy", "medium", "hard"].includes(value) ? value : "all";
}

function problemMatchesDifficulty(problem, difficulty = problemDifficultyFilter) {
  const normalized = normalizeDifficultyFilter(difficulty);
  if (normalized === "all") return true;
  return difficultyClass(problem.difficulty) === normalized;
}

function problemMatchesSource(problem, sourceSlug = problemSourceFilter) {
  if (!sourceSlug || sourceSlug === "all") return true;
  return problem.source === sourceSlug || problem.bookSlug === sourceSlug;
}

function companyKey(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function getCompanyAliases(company) {
  if (!company) return [];
  return [company.name, company.short, ...(company.aliases || [])].filter(Boolean);
}

function getCompanyDef(value) {
  const key = companyKey(value);
  if (!key) return null;
  return quantCompanyDefs.find((company) => (
    company.slug === value
    || getCompanyAliases(company).some((alias) => companyKey(alias) === key)
  )) || null;
}

function normalizeProblemCompanies(raw = {}, tags = [], source = "") {
  const explicitValues = [
    raw.company,
    raw.firm,
    raw.employer,
    raw.sourceCompany,
    ...(Array.isArray(raw.companies) ? raw.companies : parseTags(raw.companies || ""))
  ];
  const textHints = [
    ...explicitValues,
    ...(Array.isArray(tags) ? tags : []),
    source
  ].filter(Boolean);
  const companies = [];
  textHints.forEach((value) => {
    const company = getCompanyDef(value);
    if (!company || companies.includes(company.name)) return;
    companies.push(company.name);
  });
  return companies;
}

function getProblemCompanies(problem = {}) {
  const cacheKey = String(problem.id || "");
  const cached = cacheKey ? problemCompanyCache.get(cacheKey) : null;
  if (cached?.source === problem) return cached.companies;
  const companies = Array.isArray(problem.companies) ? problem.companies : [];
  const defs = companies
    .map(getCompanyDef)
    .filter(Boolean);
  const resolved = defs.length
    ? [...new Map(defs.map((company) => [company.slug, company])).values()]
    : normalizeProblemCompanies(problem, problem.tags || [], problem.source || "")
    .map(getCompanyDef)
    .filter(Boolean);
  if (cacheKey) problemCompanyCache.set(cacheKey, { source: problem, companies: resolved });
  return resolved;
}

function problemMatchesCompany(problem, companySlug = problemCompanyFilter) {
  if (!companySlug || companySlug === "all") return true;
  return getProblemCompanies(problem).some((company) => company.slug === companySlug);
}

function getCompanyProblemStats(company, problems = getCatalogProblems()) {
  const scoped = problems.filter((problem) => problemMatchesCompany(problem, company.slug));
  const completed = getProblemCompletionCount(scoped);
  const scored = scoped
    .map((problem) => Number(getProblemPersonalState(problem.id).lastScore))
    .filter((score) => Number.isFinite(score));
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : null;
  return {
    total: scoped.length,
    completed,
    averageScore,
    percent: Math.round((completed / Math.max(scoped.length, 1)) * 100)
  };
}

function companyTierWeight(tier = "") {
  return { S: 0, A: 1, B: 2 }[String(tier).toUpperCase()] ?? 5;
}

function getCompanyJobs(company) {
  const aliases = getCompanyAliases(company).map(companyKey);
  return normalizeJobs(state.jobs).filter((job) => aliases.includes(companyKey(job.company)));
}

function createCompanyMark(company, className = "") {
  const mark = document.createElement("div");
  mark.className = `company-mark${className ? ` ${className}` : ""}`;
  mark.style.setProperty("--company-color", company.color);
  mark.style.setProperty("--company-accent", company.accent);
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = company.short || getInitials(company.name);
  return mark;
}

function showCompanyProblems(companySlug) {
  const company = getCompanyDef(companySlug);
  if (!company) return;
  problemCompanyFilter = company.slug;
  problemSourceFilter = "all";
  problemViewMode = "all";
  selectedProblemDetailId = "";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (els.problemSearch) els.problemSearch.value = "";
  switchModule("problems");
  renderProblems();
  window.setTimeout(() => spotlightElement(`[data-problem-company="${cssEscape(company.slug)}"]`), 80);
}

function getProblemThemeEntries(problems = getCatalogProblems()) {
  return Object.keys(skillDefs)
    .map((key) => ({
      key,
      label: skillDefs[key].name,
      count: problems.filter((problem) => normalizeCategory(problem.category) === key).length
    }))
    .filter((item) => item.count > 0);
}

function renderProblemThemeFilter(problems = getCatalogProblems()) {
  if (!els.problemThemeFilter) return;
  const isEn = getLanguage() === "en";
  const entries = [
    { key: "all", label: isEn ? "All themes" : "全部主题", count: problems.length },
    ...getProblemThemeEntries(problems)
  ];
  els.problemThemeFilter.innerHTML = "";
  entries.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `problem-theme-chip${problemThemeFilter === item.key ? " active" : ""}`;
    button.dataset.problemTheme = item.key;
    button.innerHTML = `<span>${escapeHtml(item.label)}</span><small>${escapeHtml(String(item.count))}</small>`;
    els.problemThemeFilter.appendChild(button);
  });
  if (els.problemThemeSummary) {
    const active = entries.find((item) => item.key === problemThemeFilter) || entries[0];
    els.problemThemeSummary.textContent = `${active.label} · ${active.count} ${isEn ? "problems" : "题"}`;
  }
}

function renderProblemDifficultyFilter(problems = getCatalogProblems()) {
  if (!els.problemDifficultyFilter) return;
  const isEn = getLanguage() === "en";
  const themeProblems = problems.filter((problem) => problemMatchesTheme(problem, problemThemeFilter));
  const entries = [
    { key: "all", label: t("problemDifficultyAll"), count: themeProblems.length },
    { key: "easy", label: "Easy", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "easy").length },
    { key: "medium", label: "Medium", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "medium").length },
    { key: "hard", label: "Hard", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "hard").length }
  ];
  els.problemDifficultyFilter.querySelectorAll("[data-problem-difficulty]").forEach((button) => {
    const key = normalizeDifficultyFilter(button.dataset.problemDifficulty);
    const entry = entries.find((item) => item.key === key);
    button.classList.toggle("active", key === problemDifficultyFilter);
    button.innerHTML = `${escapeHtml(entry?.label || button.textContent.trim())}<small>${escapeHtml(String(entry?.count || 0))}</small>`;
    button.setAttribute("aria-pressed", String(key === problemDifficultyFilter));
    button.title = isEn ? `${entry?.count || 0} problems` : `${entry?.count || 0} 题`;
  });
}

function buildProblemProgressItems(problems = getCatalogProblems()) {
  const isEn = getLanguage() === "en";
  const allDone = getProblemCompletionCount(problems);
  const hot = getLeetcodeHotCompletionStats();
  const activeThemeProblems = problems.filter((problem) => problemMatchesTheme(problem, problemThemeFilter));
  const themeEntries = getProblemThemeEntries(problems)
    .map((item) => {
      const themeProblems = problems.filter((problem) => normalizeCategory(problem.category) === item.key);
      return {
        key: item.key,
        label: item.label,
        done: getProblemCompletionCount(themeProblems),
        total: themeProblems.length
      };
    })
    .sort((left, right) => right.total - left.total);

  const items = [
    {
      key: "all",
      label: isEn ? "All problems" : "全部题库",
      done: allDone,
      total: problems.length
    },
    {
      key: "leetcode-hot",
      label: "LeetCode Hot 100",
      done: hot.done,
      total: hot.total
    }
  ];

  if (problemThemeFilter !== "all") {
    items.push({
      key: "active-theme",
      label: `${isEn ? "Current theme" : "当前主题"} · ${formatCategoryLabel(problemThemeFilter)}`,
      done: getProblemCompletionCount(activeThemeProblems),
      total: activeThemeProblems.length
    });
  }

  themeEntries.slice(0, problemThemeFilter === "all" ? 3 : 2).forEach((item) => items.push(item));
  return items.filter((item) => item.total > 0);
}

function renderProgressGroup(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item, index) => {
    const percent = Math.round((Number(item.done || 0) / Math.max(Number(item.total || 0), 1)) * 100);
    const row = document.createElement("div");
    row.className = "effect-progress-row";
    row.style.setProperty("--value", String(percent));
    row.style.setProperty("--accent-index", String(index));
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(String(item.done))} / ${escapeHtml(String(item.total))}</span>
      </div>
      <i aria-hidden="true"><span></span></i>
    `;
    container.appendChild(row);
  });
}

function renderOverviewProblemProgress() {
  renderProgressGroup(els.overviewProblemProgress, buildProblemProgressItems(getCatalogProblems()).slice(0, 4));
}

function renderProblemCompletionDashboard(problems = getCatalogProblems()) {
  renderProgressGroup(els.problemCompletionProgress, buildProblemProgressItems(problems).slice(0, 5));
}

function getDailyXpSeries(days = 7) {
  const today = new Date();
  const totals = new Map();
  state.entries.forEach((entry) => {
    const key = dayKey(entry.date);
    totals.set(key, (totals.get(key) || 0) + Number(entry.totalXp || 0));
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(date),
      xp: totals.get(key) || 0
    };
  });
}

function renderOverviewXpBars() {
  if (!els.overviewXpBars) return;
  const series = getDailyXpSeries(7);
  const maxXp = Math.max(20, ...series.map((item) => item.xp));
  els.overviewXpBars.innerHTML = "";
  series.forEach((item) => {
    const bar = document.createElement("div");
    bar.className = "daily-xp-bar";
    bar.style.setProperty("--h", `${Math.max(8, Math.round((item.xp / maxXp) * 100))}%`);
    bar.innerHTML = `<strong>${escapeHtml(String(item.xp))}</strong><i></i><span>${escapeHtml(item.label)}</span>`;
    els.overviewXpBars.appendChild(bar);
  });
}

function getContributionSeries(days = 35) {
  const today = new Date();
  const statsByDay = getContributionStatsByDay(today);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    return { key, date, ...(statsByDay.get(key) || { xp: 0, completed: 0, level: 0 }) };
  });
}

function getContributionStatsByDay(today = new Date()) {
  const xpByDay = new Map();
  const completedByDay = new Map();
  state.entries.forEach((entry) => {
    const key = dayKey(entry.date);
    xpByDay.set(key, (xpByDay.get(key) || 0) + Number(entry.totalXp || 0));
  });
  (state.problemStates || []).forEach((item) => {
    if (!item.completedAt) return;
    const key = dayKey(item.completedAt);
    completedByDay.set(key, (completedByDay.get(key) || 0) + 1);
  });
  const hotDoneCount = normalizeLeetcodeHot100Done(state.leetcodeHot100Done).length;
  if (hotDoneCount) {
    const key = dayKey(today);
    completedByDay.set(key, (completedByDay.get(key) || 0) + Math.min(5, Math.ceil(hotDoneCount / 20)));
  }
  const keys = new Set([...xpByDay.keys(), ...completedByDay.keys()]);
  return new Map([...keys].map((key) => {
    const xp = xpByDay.get(key) || 0;
    const completed = completedByDay.get(key) || 0;
    const level = Math.min(5, Math.max(0, Math.ceil(xp / 24) + Math.ceil(completed)));
    return [key, { xp, completed, level }];
  }));
}

function renderOverviewContributionHeatmap() {
  if (!els.overviewContributionHeatmap) return;
  const heatmap = buildRecentContributionHeatmap(12);
  els.overviewContributionHeatmap.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "contribution-heatmap-grid";
  grid.style.gridTemplateRows = "repeat(7, var(--heatmap-cell-size))";
  grid.style.gridAutoColumns = "var(--heatmap-cell-size)";
  grid.style.setProperty("--weeks", String(heatmap.weekCount));

  heatmap.days.forEach((day) => {
    const cell = document.createElement("span");
    cell.className = [
      "contribution-heatmap-cell",
      `level-${day.future ? 0 : day.level}`,
      day.future ? "is-future" : "",
      day.key === dayKey(new Date()) ? "is-today" : ""
    ].filter(Boolean).join(" ");
    cell.style.setProperty("--v", String(day.level));
    const completedLabel = t("streakCompleted");
    cell.title = !day.future
      ? `${formatNewsDate(day.key)} · ${day.xp} XP · ${Math.floor(day.completed)} ${completedLabel}`
      : "";
    grid.appendChild(cell);
  });

  const labels = document.createElement("div");
  labels.className = "contribution-month-labels";
  labels.style.gridTemplateColumns = `repeat(${heatmap.weekCount}, var(--heatmap-cell-size))`;
  heatmap.labels.forEach((month) => {
    const label = document.createElement("span");
    label.textContent = month.label;
    label.style.gridColumn = `${month.startWeek + 1} / span ${Math.min(month.weekSpan, heatmap.weekCount - month.startWeek)}`;
    labels.appendChild(label);
  });

  const summary = document.createElement("div");
  summary.className = "contribution-range-label";
  const rangeLabel = t("streakLast12Weeks");
  summary.textContent = `${rangeLabel} · ${formatNewsDate(heatmap.startKey)} - ${formatNewsDate(heatmap.endKey)}`;

  els.overviewContributionHeatmap.append(grid, labels, summary);
}

function buildRecentContributionHeatmap(weekCount = 12) {
  const today = new Date();
  const alignedEnd = shiftDate(today, 6 - today.getDay());
  const alignedStart = shiftDate(alignedEnd, -(weekCount * 7 - 1));
  const statsByDay = getContributionStatsByDay(today);
  const days = [];
  for (let cursor = new Date(alignedStart); cursor <= alignedEnd; cursor = shiftDate(cursor, 1)) {
    const key = dayKey(cursor);
    const stats = statsByDay.get(key) || { xp: 0, completed: 0, level: 0 };
    days.push({
      key,
      date: new Date(cursor),
      future: cursor > today,
      ...stats
    });
  }

  const monthFormatter = new Intl.DateTimeFormat(getLocale(), { month: "short" });
  const labelsByMonth = new Map();
  days.forEach((day, index) => {
    const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (labelsByMonth.has(monthKey)) return;
    labelsByMonth.set(monthKey, {
      label: monthFormatter.format(day.date),
      startWeek: Math.floor(index / 7),
      weekSpan: 1
    });
  });
  const labels = [...labelsByMonth.values()].map((label, index, allLabels) => {
    const next = allLabels[index + 1];
    return {
      ...label,
      weekSpan: Math.max(1, (next?.startWeek ?? weekCount) - label.startWeek)
    };
  });
  return {
    days,
    labels,
    weekCount,
    startKey: dayKey(alignedStart),
    endKey: dayKey(today)
  };
}

function buildMonthlyContributionHeatmap(monthCount = 4) {
  return buildRecentContributionHeatmap(Math.max(8, monthCount * 4));
}

function renderTodayPlan() {
  if (!els.todayPlanCard) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  const plan = prepPlan ? buildTodayStudyPlan() : normalizeStudyPlan(state.studyPlan);
  els.todayPlanCard.innerHTML = "";
  els.todayPlanCard.classList.toggle("hidden", !plan);
  if (!plan) return;

  const top = document.createElement("div");
  top.className = "today-plan-top";
  const title = document.createElement("strong");
  title.textContent = t("planTitle");
  const meta = document.createElement("span");
  meta.textContent = plan.summary || t("planGenerated");
  top.append(title, meta);

  const list = document.createElement("ul");
  plan.items.slice(0, 4).forEach((item) => {
    const row = document.createElement("li");
    row.classList.toggle("done", Boolean(item.done));
    const dot = document.createElement("span");
    dot.className = "plan-dot";
    dot.textContent = item.done ? "OK" : item.minutes ? `${item.minutes}` : "Q";
    const copy = document.createElement("div");
    const rowTitle = document.createElement("strong");
    rowTitle.textContent = item.title;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    copy.append(rowTitle, detail);
    row.append(dot, copy);
    list.appendChild(row);
  });

  const open = document.createElement("button");
  open.className = "secondary-button today-plan-open";
  open.type = "button";
  open.innerHTML = `<i data-lucide="arrow-right"></i> ${escapeHtml(prepPlan ? t("todayPlanView") : t("todayPlanCreate"))}`;
  open.addEventListener("click", () => switchModule("plan"));

  els.todayPlanCard.append(top, list, open);
  renderTodoDock();
}

function generateTodayStudyPlan() {
  if (state.prepPlan) {
    switchModule("plan");
    return;
  }
  const plan = buildTodayStudyPlan();
  state.studyPlan = plan;
  saveState();
  renderTodayPlan();
  renderTodoDock();
  refreshIcons();
  els.todayPlanCard?.classList.add("just-created");
  window.setTimeout(() => els.todayPlanCard?.classList.remove("just-created"), 600);
}

function buildTodayStudyPlan() {
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const tasks = getPrepDailyTasks(prepPlan);
    const done = tasks.filter((task) => task.done).length;
    return {
      createdAt: new Date().toISOString(),
      summary: `${prepSeasonDefs[prepPlan.season].label} · ${prepRoleDefs[prepPlan.role].label} · 今日 ${done}/${tasks.length} 完成`,
      items: tasks
    };
  }
  return buildLegacyTodayStudyPlan();
}

function buildLegacyTodayStudyPlan() {
  const isEn = getLanguage() === "en";
  const weakSkills = Object.entries(skillDefs)
    .map(([key, def]) => ({ key, def, score: getSkillScore(state.skills?.[key] || 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const primary = weakSkills[0]?.def || skillDefs.probabilityExpectation;
  const secondary = weakSkills[1]?.def || skillDefs.leetcode;
  const graduationTerm = currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM;
  const resumeText = state.resume?.text || "";
  const resumeTask = resumeText.length > 300
    ? {
      id: makeId(),
      title: isEn ? "Tighten resume bullets" : "过一遍简历 bullet",
      detail: isEn
        ? "Rewrite 2 bullets with metric + action + result, then run the Resume Module."
        : "挑 2 条经历改成 metric + action + result，再用简历模块检查。",
      minutes: 20,
      skill: "resume"
    }
    : {
      id: makeId(),
      title: isEn ? "Upload resume draft" : "上传或粘贴简历",
      detail: isEn
        ? `Target graduation term: ${graduationTerm}. Add a first draft so QuantGym can review gaps.`
        : `毕业时间先按 ${graduationTerm}。先放入一版简历，方便系统检查短板。`,
      minutes: 15,
      skill: "resume"
    };

  return {
    createdAt: new Date().toISOString(),
    summary: isEn ? "Built from your lowest score areas." : "根据当前最低分能力项生成。",
    items: [
      {
        id: makeId(),
        title: isEn ? `Drill ${primary.name}` : `刷 ${primary.name}`,
        detail: isEn
          ? "Solve 3 question-bank or interview-style problems and write the clean conditioning / setup."
          : "刷 3 道题库/面试风格题，把条件、随机变量和关键等式写清楚。",
        minutes: 35,
        skill: weakSkills[0]?.key || "probabilityExpectation"
      },
      {
        id: makeId(),
        title: isEn ? `LeetCode + ${secondary.name}` : `LeetCode + ${secondary.name}`,
        detail: isEn
          ? "Do 2 LeetCode problems around the weakest pattern, then summarize the template."
          : "做 2 道相关 LeetCode，重点复盘模板、复杂度和边界条件。",
        minutes: 45,
        skill: weakSkills[1]?.key || "leetcode"
      },
      resumeTask,
      {
        id: makeId(),
        title: isEn ? "Applications scan" : "求职岗位扫描",
        detail: isEn
          ? "Open the Jobs module and save 2 internship/full-time roles worth applying to."
          : "打开求职模块，筛 2 个 internship/full-time 岗位，记录申请链接。",
        minutes: 15,
        skill: "jobs"
      }
    ]
  };
}

function createPrepPlan() {
  const form = els.prepPlanSetupForm;
  if (!form) return;
  const data = new FormData(form);
  const previous = normalizePrepPlan(state.prepPlan);
  const track = data.get("prepTrack") === "fulltime" ? "fulltime" : "internship";
  const role = prepRoleDefs[data.get("prepRole")] ? data.get("prepRole") : "quantTrading";
  const season = prepSeasonDefs[data.get("prepSeason")] ? data.get("prepSeason") : "2027-summer";
  const weeklyHours = Number(data.get("prepHours") || 8);
  const wantsDiagnostic = data.get("prepDiagnostic") !== "skip";
  const sameTarget = previous
    && previous.track === track
    && previous.role === role
    && previous.season === season;
  const diagnosticStatus = wantsDiagnostic
    ? sameTarget && previous.diagnosticStatus === "completed" ? "completed" : "pending"
    : "skipped";

  state.prepPlan = normalizePrepPlan({
    track,
    role,
    season,
    weeklyHours,
    diagnosticStatus,
    diagnosticScore: diagnosticStatus === "completed" ? previous.diagnosticScore : 0,
    diagnosticScores: diagnosticStatus === "completed" ? previous.diagnosticScores : {},
    completedTasks: sameTarget ? previous.completedTasks : {},
    taskOverrides: sameTarget ? previous.taskOverrides : {},
    customTasks: sameTarget ? previous.customTasks : [],
    createdAt: sameTarget ? previous.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  state.studyPlan = buildTodayStudyPlan();
  prepPlanEditorOpen = false;
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
  refreshIcons();
}

function renderPrepPlan() {
  if (!els.prepPlanSetupForm || !els.prepPlanDashboard) return;
  const plan = normalizePrepPlan(state.prepPlan);
  const showSetup = !plan || prepPlanEditorOpen;
  els.prepPlanSetupForm.classList.toggle("hidden", !showSetup);
  els.prepPlanDashboard.classList.toggle("hidden", !plan || showSetup);
  els.editPrepPlanBtn?.classList.toggle("hidden", !plan || showSetup);
  updatePrepTaskIndicator();
  renderTodoDock();

  if (plan && showSetup) populatePrepPlanForm(plan);
  if (!plan || showSetup) return;

  const role = prepRoleDefs[plan.role];
  const season = prepSeasonDefs[plan.season];
  const tasks = getPrepDailyTasks(plan);
  const stageIndex = getPrepStageIndex(plan);
  const done = tasks.filter((task) => task.done).length;
  const diagnosticCopy = plan.diagnosticStatus === "completed"
    ? `Baseline ${plan.diagnosticScore}/${prepDiagnosticQuestions.length}`
    : plan.diagnosticStatus === "pending" ? "Baseline 待完成" : "未测评";

  els.prepPlanDashboard.innerHTML = `
    <section class="prep-status-band">
      <div class="prep-status-copy">
        <span class="prep-status-label">${escapeHtml(plan.track === "internship" ? t("prepTrackInternship") : t("prepTrackFulltime"))}</span>
        <h3>${escapeHtml(season.label)} · ${escapeHtml(role.label)}</h3>
        <p>${escapeHtml(getPrepPaceText(plan))}</p>
      </div>
      <div class="prep-status-metrics">
        <div><strong>${escapeHtml(String(plan.weeklyHours))}</strong><span>${escapeHtml(t("prepHoursWeek"))}</span></div>
        <div><strong>${escapeHtml(String(done))}/${escapeHtml(String(tasks.length))}</strong><span>${escapeHtml(t("prepDoneToday"))}</span></div>
        <div><strong>${escapeHtml(diagnosticCopy)}</strong><span>${escapeHtml(t("prepSkillLevel"))}</span></div>
      </div>
    </section>
    <div class="prep-dashboard-grid">
      <section class="prep-work-panel">
        <div class="prep-panel-heading">
          <div>
            <h3>${escapeHtml(t("prepTodayTraining"))}</h3>
            <p>${escapeHtml(role.technical)} · ${escapeHtml(t("prepCurrentFocus"))}${escapeHtml(prepProcessStages[stageIndex].name)}</p>
          </div>
        </div>
        <div class="prep-task-list">
          ${tasks.map(renderPrepTaskMarkup).join("")}
        </div>
      </section>
      <section class="prep-assessment-panel">
        ${renderPrepDiagnosticMarkup(plan)}
      </section>
    </div>
    <section class="prep-process-section">
      <div class="prep-panel-heading">
        <div>
          <h3>${escapeHtml(t("prepRecruitProcess"))}</h3>
          <p>${escapeHtml(t("prepRecruitProcessDetail"))}</p>
        </div>
      </div>
      <div class="prep-stage-list">
        ${prepProcessStages.map((stage, index) => `
          <article class="prep-stage${index === stageIndex ? " current" : ""}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h4>${escapeHtml(stage.name)}</h4>
            <p>${escapeHtml(stage.detail)}</p>
            <small>${escapeHtml(stage.evidence)}</small>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="prep-source-section">
      <div class="prep-panel-heading">
        <div>
          <h3>${escapeHtml(t("prepSourceTitle"))}</h3>
          <p>${escapeHtml(t("prepSourceDetail"))}</p>
        </div>
      </div>
      <div class="prep-source-links">
        ${prepSourceLinks.map((source) => `
          <a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(source.label)}</strong>
            <span>${escapeHtml(source.note)}</span>
            <i data-lucide="external-link"></i>
          </a>
        `).join("")}
      </div>
    </section>
  `;
  refreshIcons();
}

function updatePrepTaskIndicator() {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan) {
    setText(".sidebar-helper span", t("tasksWaiting"));
    renderTodoDock();
    return;
  }
  const pending = getPrepDailyTasks(plan).filter((task) => !task.done).length;
  const label = t("prepTasksWaiting").replace("{count}", String(pending));
  setText(".sidebar-helper span", label);
  renderTodoDock();
}

function getTodoDockPlan() {
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const todayPlan = buildTodayStudyPlan();
    return {
      type: "prep",
      summary: todayPlan.summary,
      items: todayPlan.items
    };
  }
  const studyPlan = normalizeStudyPlan(state.studyPlan);
  if (!studyPlan) return null;
  return {
    type: "study",
    summary: studyPlan.summary || t("planGenerated"),
    items: studyPlan.items
  };
}

function renderTodoDock() {
  if (!els.todoDockButton || !els.todoDockPanel || !els.todoDockList) return;
  const plan = getTodoDockPlan();
  const items = plan?.items || [];
  const pending = items.filter((item) => !item.done).length;
  els.todoDockPanel.classList.toggle("hidden", !todoDockOpen);
  els.todoDockButton.classList.toggle("open", todoDockOpen);
  els.todoDockButton.setAttribute("aria-expanded", String(todoDockOpen));
  if (els.todoDockButtonLabel) els.todoDockButtonLabel.textContent = t("todoButton");
  if (els.todoDockCount) els.todoDockCount.textContent = String(pending);
  if (els.todoDockEyebrow) els.todoDockEyebrow.textContent = t("todoEyebrow");
  if (els.todoDockTitle) els.todoDockTitle.textContent = t("todoTitle");
  if (els.todoDockSummary) els.todoDockSummary.textContent = plan?.summary || t("todoSummaryEmpty");
  if (els.todoDockEmpty) {
    els.todoDockEmpty.textContent = t("todoEmpty");
    els.todoDockEmpty.classList.toggle("hidden", items.length > 0);
  }
  if (els.todoDockAddInput) els.todoDockAddInput.placeholder = t("todoAddPlaceholder");
  els.todoDockList.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = `todo-task${item.done ? " done" : ""}`;
    row.dataset.todoId = item.id;
    row.innerHTML = `
      <button class="todo-task-toggle" type="button" data-todo-toggle="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.done ? t("todoDone") : t("todoUndone"))}">
        <i data-lucide="${item.done ? "check" : "circle"}"></i>
      </button>
      <div class="todo-task-fields">
        <input type="text" value="${escapeHtml(item.title)}" data-todo-id="${escapeHtml(item.id)}" data-todo-field="title" aria-label="${escapeHtml(item.title || t("todoAddPlaceholder"))}">
        <textarea rows="2" data-todo-id="${escapeHtml(item.id)}" data-todo-field="detail" aria-label="${escapeHtml(item.title || t("todoAddPlaceholder"))} detail">${escapeHtml(item.detail || "")}</textarea>
      </div>
      <span class="todo-task-time">${escapeHtml(String(item.minutes || 0))}m</span>
    `;
    els.todoDockList.appendChild(row);
  });
  refreshIcons();
}

function handleTodoDockClick(event) {
  const toggle = event.target.closest("[data-todo-toggle]");
  if (!toggle) return;
  toggleTodoTask(toggle.dataset.todoToggle);
}

function handleTodoDockEdit(event) {
  const field = event.target.dataset.todoField;
  const taskId = event.target.dataset.todoId;
  if (!field || !taskId) return;
  updateTodoTask(taskId, field, event.target.value);
}

function addTodoTask() {
  const title = String(els.todoDockAddInput?.value || "").trim();
  if (!title) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    prepPlan.customTasks = [
      ...(prepPlan.customTasks || []),
      {
        id: `custom-${makeId()}`,
        date: localDateKey(),
        title,
        detail: "",
        minutes: 15,
        action: "custom",
        query: ""
      }
    ];
    prepPlan.updatedAt = new Date().toISOString();
    state.prepPlan = prepPlan;
    state.studyPlan = buildTodayStudyPlan();
  } else {
    const plan = normalizeStudyPlan(state.studyPlan) || {
      createdAt: new Date().toISOString(),
      summary: t("planGenerated"),
      items: []
    };
    plan.items.push({
      id: `custom-${makeId()}`,
      title,
      detail: "",
      minutes: 15,
      skill: "custom",
      done: false
    });
    state.studyPlan = plan;
  }
  if (els.todoDockAddInput) els.todoDockAddInput.value = "";
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function toggleTodoTask(taskId) {
  if (!taskId) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    togglePrepTask(taskId);
    return;
  }
  const plan = normalizeStudyPlan(state.studyPlan);
  if (!plan) return;
  const task = plan.items.find((item) => item.id === taskId);
  if (!task) return;
  task.done = !task.done;
  state.studyPlan = plan;
  saveState();
  renderTodayPlan();
  renderTodoDock();
}

function updateTodoTask(taskId, field, rawValue) {
  if (!["title", "detail"].includes(field) || !taskId) return;
  const value = String(rawValue || "").trim().slice(0, field === "title" ? 120 : 260);
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const customTask = (prepPlan.customTasks || []).find((task) => task.date === localDateKey() && task.id === taskId);
    if (customTask) {
      customTask[field] = value;
    } else {
      const key = `${localDateKey()}:${taskId}`;
      const existing = prepPlan.taskOverrides?.[key] || {};
      prepPlan.taskOverrides = {
        ...(prepPlan.taskOverrides || {}),
        [key]: {
          ...existing,
          [field]: value
        }
      };
    }
    prepPlan.updatedAt = new Date().toISOString();
    state.prepPlan = prepPlan;
    state.studyPlan = buildTodayStudyPlan();
  } else {
    const plan = normalizeStudyPlan(state.studyPlan);
    if (!plan) return;
    const task = plan.items.find((item) => item.id === taskId);
    if (!task) return;
    task[field] = value;
    state.studyPlan = plan;
  }
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function populatePrepPlanForm(plan) {
  if (!els.prepPlanSetupForm) return;
  [["prepTrack", plan.track], ["prepSeason", plan.season], ["prepDiagnostic", plan.diagnosticStatus === "skipped" ? "skip" : "take"]]
    .forEach(([name, value]) => {
      const input = els.prepPlanSetupForm.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    });
  els.prepRoleSelect.value = plan.role;
  els.prepHoursSelect.value = String(plan.weeklyHours);
}

function getPrepStageIndex(plan) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate);
  const weeksToApplications = weeksUntilDate(season.applicationDate);
  if (weeksToStart <= 6) return 5;
  if (weeksToApplications > 8) return 0;
  if (weeksToApplications > 0 || plan.diagnosticStatus !== "completed") return 1;
  if (weeksToStart <= 18) return 5;
  if (weeksToStart <= 30) return 4;
  return plan.diagnosticScore >= 6 ? 3 : 1;
}

function getPrepPaceText(plan) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate);
  const weeksToApplications = weeksUntilDate(season.applicationDate);
  if (weeksToStart <= 0) return "目标 summer 已开始：以补录、面试复盘和下一周期准备为主。";
  if (weeksToStart <= 6) return `距目标开始约 ${weeksToStart} 周：以补录、整套模拟和 final-day 即时准备为主。`;
  if (weeksToApplications <= 0) return "常见申请窗口已开启：滚动投递，同时推进 OA、technical 与 behavioral 准备。";
  if (weeksToApplications <= 8) return `距常见申请窗口约 ${weeksToApplications} 周：立即准备简历、baseline 与 OA 限时训练。`;
  return `距常见申请窗口约 ${weeksToApplications} 周：先建立基础、项目表达和岗位判断，再转入限时训练。`;
}

function weeksUntilDate(dateText) {
  const target = new Date(`${dateText}T12:00:00`);
  const delta = target.getTime() - Date.now();
  return Math.ceil(delta / (7 * 24 * 60 * 60 * 1000));
}

function getPrepFocusSkills(plan) {
  const roleFocus = prepRoleDefs[plan.role].focus;
  if (plan.diagnosticStatus !== "completed") return roleFocus;
  return [...roleFocus].sort((left, right) => (
    Number(plan.diagnosticScores[left] ?? 50) - Number(plan.diagnosticScores[right] ?? 50)
  ));
}

function getPrepDailyTasks(plan) {
  const focus = getPrepFocusSkills(plan);
  const stageIndex = getPrepStageIndex(plan);
  const primary = focus[0] || "probabilityExpectation";
  const secondary = focus[1] || "leetcode";
  const tasks = [
    {
      id: "core",
      title: `${formatCategoryLabel(primary)} 基础题`,
      detail: `完成 3 道 ${formatCategoryLabel(primary)} 题并写下清晰解题结构。`,
      minutes: plan.weeklyHours >= 12 ? 45 : 35,
      action: "problems",
      query: primary
    },
    {
      id: "speed",
      title: plan.role === "quantDeveloper" ? "限时 Coding OA" : "OA 速度训练",
      detail: plan.role === "quantDeveloper"
        ? "限时完成 2 道算法题，复盘复杂度与边界情况。"
        : "完成一轮速算，再做 2 道概率或期望短题。",
      minutes: 25,
      action: plan.role === "quantDeveloper" ? "problems" : "tools",
      query: plan.role === "quantDeveloper" ? "leetcode" : ""
    },
    {
      id: "verbal",
      title: stageIndex >= 3 ? "面试口述模拟" : `${formatCategoryLabel(secondary)} 主题复盘`,
      detail: stageIndex >= 3
        ? "进行 3 题 technical mock：先澄清，再口述假设与结论。"
        : `学习 ${formatCategoryLabel(secondary)}，并把一道题讲成面试回答。`,
      minutes: 35,
      action: stageIndex >= 3 ? "interview" : "problems",
      query: secondary
    },
    {
      id: "application",
      title: stageIndex >= 3 ? "Behavioral 故事库" : "申请材料与岗位扫描",
      detail: stageIndex >= 3
        ? "整理 1 个协作或失败复盘故事，并练习 Why quant / Why firm。"
        : "完善一条量化项目 bullet，并追踪合适的目标岗位。",
      minutes: 25,
      action: stageIndex >= 3 ? "interview-behavioral" : "resume"
    },
    {
      id: "pipeline",
      title: stageIndex >= 3 ? "面经复盘归档" : "申请管线维护",
      detail: stageIndex >= 3
        ? "记录最近一次轮次的流程、考察主题和下一步训练，再决定是否分享。"
        : "核对岗位季次、毕业要求、deadline 与下一步联系人。",
      minutes: 15,
      action: stageIndex >= 3 ? "experiences" : "jobs"
    }
  ];
  const limit = plan.weeklyHours <= 5 ? 3 : plan.weeklyHours <= 8 ? 4 : 5;
  const dateKey = localDateKey();
  const preparedTasks = tasks.slice(0, limit).map((task) => {
    const key = `${dateKey}:${task.id}`;
    const override = plan.taskOverrides?.[key] || {};
    return {
      ...task,
      title: override.title || task.title,
      detail: override.detail || task.detail,
      minutes: override.minutes || task.minutes,
      skill: task.query || task.action,
      done: Boolean(plan.completedTasks[key])
    };
  });
  const customTasks = (plan.customTasks || [])
    .filter((task) => task.date === dateKey)
    .map((task) => ({
      ...task,
      skill: task.query || task.action || "custom",
      done: Boolean(plan.completedTasks[`${dateKey}:${task.id}`])
    }));
  return [...preparedTasks, ...customTasks];
}

function renderPrepTaskMarkup(task) {
  return `
    <article class="prep-task${task.done ? " done" : ""}">
      <button class="prep-task-toggle" type="button" data-prep-toggle-task="${escapeHtml(task.id)}" aria-label="${task.done ? "标为未完成" : "标为完成"}">
        <i data-lucide="${task.done ? "check" : "circle"}"></i>
      </button>
      <div>
        <h4>${escapeHtml(task.title)}</h4>
        <p>${escapeHtml(task.detail)}</p>
        <span>${escapeHtml(String(task.minutes))} min</span>
      </div>
      <button class="secondary-button prep-task-action" type="button" data-prep-open="${escapeHtml(task.action)}" data-prep-query="${escapeHtml(task.query || "")}">开始</button>
    </article>
  `;
}

function renderPrepDiagnosticMarkup(plan) {
  if (plan.diagnosticStatus === "pending") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>Baseline 测评</h3>
          <p>8 题快速定位当前训练优先级，不影响题库进度。</p>
        </div>
        <button class="secondary-button compact" type="button" data-prep-skip-test="true">暂时跳过</button>
      </div>
      <form id="prepDiagnosticForm" class="prep-diagnostic-form">
        ${prepDiagnosticQuestions.map((question, index) => `
          <fieldset>
            <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>
            ${question.options.map((option) => `
              <label><input type="radio" name="diagnostic-${escapeHtml(question.id)}" value="${escapeHtml(option)}"> ${escapeHtml(option)}</label>
            `).join("")}
          </fieldset>
        `).join("")}
        <p class="prep-diagnostic-message" id="prepDiagnosticMessage"></p>
        <button class="primary-button" type="submit"><i data-lucide="check-circle-2"></i>提交测评</button>
      </form>
    `;
  }

  if (plan.diagnosticStatus === "skipped") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>能力定位</h3>
          <p>当前按岗位默认路径生成任务。补做 baseline 后会调整训练排序。</p>
        </div>
      </div>
      <button class="secondary-button" type="button" data-prep-start-test="true"><i data-lucide="clipboard-check"></i>开始 8 题测评</button>
    `;
  }

  const scores = Object.entries(plan.diagnosticScores)
    .filter(([key]) => skillDefs[key])
    .sort((left, right) => left[1] - right[1]);
  const level = plan.diagnosticScore === prepDiagnosticQuestions.length
    ? "基础覆盖良好；保持速度训练并进入面试表达"
    : plan.diagnosticScore >= 7
      ? "面试热身就绪；优先补齐低分能力"
      : plan.diagnosticScore >= 4 ? "核心能力建设中；优先训练低分能力" : "从基础模块开始；优先训练低分能力";
  return `
    <div class="prep-panel-heading">
      <div>
        <h3>Baseline ${escapeHtml(String(plan.diagnosticScore))}/${prepDiagnosticQuestions.length}</h3>
        <p>${escapeHtml(level)}。</p>
      </div>
      <button class="secondary-button compact" type="button" data-prep-start-test="true">重测</button>
    </div>
    <div class="prep-score-list">
      ${scores.map(([key, score]) => `
        <div class="prep-score-row">
          <span>${escapeHtml(formatCategoryLabel(key))}</span>
          <div><i style="width: ${score}%"></i></div>
          <strong>${score}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function handlePrepPlanAction(event) {
  const toggle = event.target.closest("[data-prep-toggle-task]");
  if (toggle) {
    togglePrepTask(toggle.dataset.prepToggleTask);
    return;
  }
  if (event.target.closest("[data-prep-start-test]")) {
    state.prepPlan = { ...normalizePrepPlan(state.prepPlan), diagnosticStatus: "pending", updatedAt: new Date().toISOString() };
    saveState();
    renderPrepPlan();
    renderTodoDock();
    return;
  }
  if (event.target.closest("[data-prep-skip-test]")) {
    state.prepPlan = { ...normalizePrepPlan(state.prepPlan), diagnosticStatus: "skipped", updatedAt: new Date().toISOString() };
    state.studyPlan = buildTodayStudyPlan();
    saveState();
    renderPrepPlan();
    renderTodayPlan();
    renderTodoDock();
    return;
  }
  const open = event.target.closest("[data-prep-open]");
  if (open) openPrepTask(open.dataset.prepOpen, open.dataset.prepQuery || "");
}

function togglePrepTask(taskId) {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan || !taskId) return;
  const key = `${localDateKey()}:${taskId}`;
  plan.completedTasks[key] = !plan.completedTasks[key];
  plan.updatedAt = new Date().toISOString();
  state.prepPlan = plan;
  state.studyPlan = buildTodayStudyPlan();
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function submitPrepDiagnostic(form) {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan) return;
  const answers = new FormData(form);
  const missing = prepDiagnosticQuestions.filter((question) => !answers.get(`diagnostic-${question.id}`));
  if (missing.length) {
    const message = form.querySelector("#prepDiagnosticMessage");
    if (message) message.textContent = `还有 ${missing.length} 题未作答。`;
    return;
  }
  const totals = {};
  const correct = {};
  let score = 0;
  prepDiagnosticQuestions.forEach((question) => {
    totals[question.skill] = (totals[question.skill] || 0) + 1;
    if (answers.get(`diagnostic-${question.id}`) === question.answer) {
      score += 1;
      correct[question.skill] = (correct[question.skill] || 0) + 1;
    }
  });
  const scores = Object.fromEntries(Object.keys(totals).map((key) => [
    key,
    Math.round(((correct[key] || 0) / totals[key]) * 100)
  ]));
  state.prepPlan = {
    ...plan,
    diagnosticStatus: "completed",
    diagnosticScore: score,
    diagnosticScores: scores,
    updatedAt: new Date().toISOString()
  };
  state.studyPlan = buildTodayStudyPlan();
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function openPrepTask(action, query = "") {
  if (action === "problems") {
    switchModule("problems");
    if (els.problemSearch) {
      els.problemSearch.value = query;
      renderProblems();
    }
    return;
  }
  if (action === "tools" || action === "resume" || action === "jobs" || action === "experiences") {
    switchModule(action);
    return;
  }
  if (action === "interview" || action === "interview-behavioral") {
    if (els.interviewTypeSelect) els.interviewTypeSelect.value = action === "interview-behavioral" ? "behavioral" : "technical";
    selectedInterviewCategories = query && skillDefs[query] ? new Set([query]) : new Set(["all"]);
    resetInterview({ keepSetup: true });
    renderInterviewSetup();
    switchModule("interview");
  }
}

function localDateKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function saveInterviewExperience() {
  if (!els.experienceForm) return;
  const previous = state.interviewExperiences.find((item) => item.id === els.experienceId.value);
  const now = new Date().toISOString();
  const record = normalizeInterviewExperience({
    ...previous,
    id: previous?.id || makeId(),
    firm: els.experienceFirm.value,
    role: els.experienceRole.value,
    stage: els.experienceStage.value,
    season: els.experienceSeason.value,
    date: els.experienceDate.value || localDateKey(),
    outcome: els.experienceOutcome.value,
    tags: parseTags(els.experienceTags.value),
    summary: els.experienceSummaryInput.value,
    topics: els.experienceTopics.value,
    reflection: els.experienceReflection.value,
    createdAt: previous?.createdAt || now,
    updatedAt: now
  });
  if (!record.firm || !record.summary) return;
  state.interviewExperiences = [
    record,
    ...state.interviewExperiences.filter((item) => item.id !== record.id)
  ];
  pendingExperienceShareId = "";
  saveState();
  resetExperienceForm();
  renderExperiences();
}

function resetExperienceForm() {
  if (!els.experienceForm) return;
  els.experienceForm.reset();
  els.experienceId.value = "";
  els.experienceDate.value = localDateKey();
  els.experienceFormTitle.textContent = "新建面经";
  els.cancelExperienceEditBtn.classList.add("hidden");
}

function editInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record || !els.experienceForm) return;
  els.experienceId.value = record.id;
  els.experienceFirm.value = record.firm;
  els.experienceRole.value = record.role;
  els.experienceStage.value = record.stage;
  els.experienceSeason.value = record.season;
  els.experienceDate.value = record.date;
  els.experienceOutcome.value = record.outcome;
  els.experienceTags.value = record.tags.join(", ");
  els.experienceSummaryInput.value = record.summary;
  els.experienceTopics.value = record.topics;
  els.experienceReflection.value = record.reflection;
  els.experienceFormTitle.textContent = "编辑面经";
  els.cancelExperienceEditBtn.classList.remove("hidden");
  els.experienceForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderExperiences() {
  if (!els.experienceList) return;
  if (els.experienceDate && !els.experienceDate.value && !els.experienceId.value) {
    els.experienceDate.value = localDateKey();
  }
  const records = [...(state.interviewExperiences || [])]
    .map(normalizeInterviewExperience)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const filter = els.experienceFilter?.value || "all";
  const visibleRecords = filter === "all" ? records : records.filter((item) => item.stage === filter);
  const sharedCount = records.filter((item) => item.sharedPostId).length;
  if (els.experienceCount) els.experienceCount.textContent = String(records.length);
  if (els.sharedExperienceCount) els.sharedExperienceCount.textContent = String(sharedCount);
  els.experienceList.innerHTML = "";
  if (!visibleRecords.length) {
    els.experienceList.appendChild(emptyBlock(records.length ? "当前筛选下还没有面经。" : "还没有面经记录。完成一次轮次后，把过程与下一步训练记下来。"));
    return;
  }
  els.experienceList.innerHTML = visibleRecords.map((record) => `
    <article class="experience-card">
      <div class="experience-card-head">
        <div class="experience-card-title">
          <div class="experience-badges">
            <span>${escapeHtml(record.stage)}</span>
            <span class="outcome">${escapeHtml(formatExperienceOutcome(record.outcome))}</span>
            ${record.sharedPostId ? `<span class="shared">${escapeHtml(t("experienceShared"))}</span>` : `<span class="private">${escapeHtml(t("experiencePrivate"))}</span>`}
          </div>
          <h4>${escapeHtml(record.firm)} · ${escapeHtml(record.role)}</h4>
          <small>${escapeHtml(record.season)} · ${escapeHtml(formatExperienceDate(record.date))}</small>
        </div>
        <div class="experience-card-actions">
          <button class="icon-button ghost" type="button" data-experience-edit="${escapeHtml(record.id)}" aria-label="${escapeHtml(t("editExperience"))}" title="${escapeHtml(t("editExperience"))}"><i data-lucide="pencil-line"></i></button>
          <button class="icon-button ghost danger" type="button" data-experience-delete="${escapeHtml(record.id)}" aria-label="${escapeHtml(t("deleteExperience"))}" title="${escapeHtml(t("deleteExperience"))}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="experience-card-body">
        <div><strong>流程概览</strong><p>${escapeHtml(record.summary)}</p></div>
        ${record.topics ? `<div><strong>考察主题</strong><p>${escapeHtml(record.topics)}</p></div>` : ""}
        ${record.reflection ? `<div><strong>复盘与下一步</strong><p>${escapeHtml(record.reflection)}</p></div>` : ""}
      </div>
      ${record.tags.length ? `<div class="experience-tags">${record.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="experience-share-row">
        <button class="secondary-button" type="button" data-experience-share="${escapeHtml(record.id)}"><i data-lucide="share-2"></i>${record.sharedPostId ? "更新社群分享" : "分享至社群"}</button>
      </div>
      ${pendingExperienceShareId === record.id ? `
        <div class="experience-share-confirm" role="alert">
          <p>确认已移除受保密要求约束的原题、姓名和联系方式后，再发布到社群。</p>
          <div>
            <button class="primary-button" type="button" data-experience-share-confirm="${escapeHtml(record.id)}">确认分享</button>
            <button class="secondary-button" type="button" data-experience-share-cancel="true">取消</button>
          </div>
        </div>
      ` : ""}
    </article>
  `).join("");
  refreshIcons();
}

function handleExperienceListAction(event) {
  const edit = event.target.closest("[data-experience-edit]");
  if (edit) {
    editInterviewExperience(edit.dataset.experienceEdit);
    return;
  }
  const remove = event.target.closest("[data-experience-delete]");
  if (remove) {
    deleteInterviewExperience(remove.dataset.experienceDelete);
    return;
  }
  const share = event.target.closest("[data-experience-share]");
  if (share) {
    pendingExperienceShareId = share.dataset.experienceShare;
    renderExperiences();
    return;
  }
  if (event.target.closest("[data-experience-share-cancel]")) {
    pendingExperienceShareId = "";
    renderExperiences();
    return;
  }
  const confirmShare = event.target.closest("[data-experience-share-confirm]");
  if (confirmShare) publishInterviewExperience(confirmShare.dataset.experienceShareConfirm);
}

function deleteInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record) return;
  const warning = record.sharedPostId
    ? "删除私有面经不会删除已经发布到社群的分享。确认删除这条私有记录？"
    : "确认删除这条面经记录？";
  if (!window.confirm(warning)) return;
  state.interviewExperiences = state.interviewExperiences.filter((item) => item.id !== id);
  if (els.experienceId?.value === id) resetExperienceForm();
  pendingExperienceShareId = "";
  saveState();
  renderExperiences();
}

function publishInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record || !currentUser) return;
  community = loadCommunity();
  const existing = community.posts.find((post) => post.id === record.sharedPostId);
  const postId = existing?.id || record.sharedPostId || makeId();
  const publishedPost = normalizeCommunityPost({
    ...existing,
    id: postId,
    kind: "experience",
    experience: record,
    authorId: currentUser.id,
    authorName: currentUser.name || currentUser.email || "Quant",
    authorAvatar: currentUser.picture || "",
    country: currentUser.country,
    region: currentUser.region,
    text: formatSharedExperienceText(record),
    likes: existing?.likes || [],
    comments: existing?.comments || [],
    createdAt: existing?.createdAt || new Date().toISOString()
  });
  community.posts = [publishedPost, ...community.posts.filter((post) => post.id !== postId)];
  const now = new Date().toISOString();
  state.interviewExperiences = state.interviewExperiences.map((item) => item.id === id
    ? normalizeInterviewExperience({ ...item, sharedPostId: postId, sharedAt: now, updatedAt: now })
    : item);
  pendingExperienceShareId = "";
  saveCommunity();
  saveState();
  communityFilter = "experience";
  renderExperiences();
  switchModule("community");
  renderCommunity();
}

function formatSharedExperienceText(record) {
  const lines = [`${record.firm} · ${record.role} · ${record.stage}`, `${record.season}${record.date ? ` · ${formatExperienceDate(record.date)}` : ""}`];
  lines.push(`流程：${record.summary}`);
  if (record.topics) lines.push(`主题：${record.topics}`);
  if (record.reflection) lines.push(`复盘：${record.reflection}`);
  return lines.join("\n");
}

function formatExperienceOutcome(outcome) {
  return {
    Waiting: "等待结果",
    Advanced: "进入下一轮",
    Offer: "Offer",
    Closed: "流程结束",
    Withdrawn: "已撤回"
  }[outcome] || outcome;
}

function formatExperienceDate(date) {
  if (!date) return "日期未记录";
  return date.replace(/-/g, "/");
}

function renderResume() {
  if (!els.resumeText || !els.resumeReview) return;
  if (document.activeElement !== els.resumeText) {
    els.resumeText.value = state.resume?.text || "";
  }
  renderResumeReview();
  renderAccountResumeMeta();
}

function renderResumeReview() {
  if (!els.resumeReview) return;
  const review = Array.isArray(state.resume?.review) ? state.resume.review : [];
  els.resumeReview.innerHTML = "";
  if (!review.length) {
    const empty = document.createElement("p");
    empty.className = "muted-empty";
    empty.textContent = getLanguage() === "en"
      ? "Run the review to get role-specific edits."
      : "点击 LLM 修改简历后，这里会显示针对岗位的修改要点。";
    els.resumeReview.appendChild(empty);
    return;
  }
  const list = document.createElement("ul");
  review.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.appendChild(row);
  });
  els.resumeReview.appendChild(list);
}

function saveResumeText() {
  const text = els.resumeText?.value.trim() || "";
  state.resume = normalizeResumeState({
    ...state.resume,
    text,
    updatedAt: new Date().toISOString()
  });
  saveState();
  renderResume();
  if (els.accountMessage) els.accountMessage.textContent = t("resumeSaved");
}

async function handleAccountResumeFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    if (els.accountResumeMeta) els.accountResumeMeta.textContent = getLanguage() === "en"
      ? "Resume file is too large. Keep it under 5MB."
      : "简历文件太大，请控制在 5MB 以内。";
    event.target.value = "";
    return;
  }

  const isTextResume = /\.(txt|md|tex)$/i.test(file.name) || /text|markdown|latex/i.test(file.type);
  const nextResume = {
    ...state.resume,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isTextResume) {
    const payload = await readFilePayload(file, { preferDataUrl: false });
    nextResume.text = payload.text || "";
    if (els.resumeText) els.resumeText.value = nextResume.text;
  }

  state.resume = normalizeResumeState(nextResume);
  saveState();
  renderResume();
  event.target.value = "";
}

function renderAccountResumeMeta() {
  if (!els.accountResumeMeta) return;
  const resume = normalizeResumeState(state.resume);
  if (resume.fileName) {
    const sizeKb = Math.max(1, Math.round(resume.fileSize / 1024));
    els.accountResumeMeta.textContent = `${resume.fileName} · ${sizeKb} KB`;
    return;
  }
  els.accountResumeMeta.textContent = t("resumeUploadHint");
}

async function reviewResumeWithLlm() {
  const text = els.resumeText?.value.trim() || state.resume?.text || "";
  if (!text) {
    renderInlineReview([t("resumeNoContent")]);
    return;
  }
  state.resume = normalizeResumeState({
    ...state.resume,
    text,
    updatedAt: new Date().toISOString()
  });
  saveState();
  setButtonBusy(els.reviewResumeBtn, true, t("resumeReviewing"));
  let review;
  try {
    review = await requestResumeReviewFromApi(text);
  } catch {
    review = localResumeReview(text);
  }
  state.resume = normalizeResumeState({
    ...state.resume,
    review,
    updatedAt: new Date().toISOString()
  });
  saveState();
  renderResume();
  setButtonBusy(els.reviewResumeBtn, false);
}

function renderInlineReview(items) {
  state.resume = normalizeResumeState({ ...state.resume, review: items });
  renderResumeReview();
}

async function requestResumeReviewFromApi(text) {
  const endpoint = (els.llmEndpointInput?.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput?.value || llmConfig.model)
  };
  saveLlmConfigToStorage();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "resume_review",
      model: llmConfig.model,
      language: getLanguage(),
      graduationTerm: currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM,
      target: "quant internship / full-time",
      resume: text
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  const items = data.items || data.suggestions || data.review || data.reply || data.text;
  if (Array.isArray(items)) return items.map(String).filter(Boolean).slice(0, 8);
  return String(items || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function localResumeReview(text) {
  const isEn = getLanguage() === "en";
  const lower = text.toLowerCase();
  const bullets = [];
  if (!/\b\d+%|\$\d+|\b\d+x|\b\d+\s*(ms|sec|bps|users|trades|rows)\b/i.test(text)) {
    bullets.push(isEn
      ? "Add measurable outcomes to at least 3 bullets: latency, accuracy, PnL proxy, data size, or speed-up."
      : "至少给 3 条经历补上量化结果：延迟、准确率、PnL proxy、数据规模或速度提升。");
  }
  if (!/python|pandas|numpy|sql|c\+\+|java/i.test(lower)) {
    bullets.push(isEn
      ? "Make the technical stack obvious: Python, pandas/NumPy, SQL, C++/Java, or the stack you actually used."
      : "技术栈要一眼可见：Python、pandas/NumPy、SQL、C++/Java，或你实际用过的工具。");
  }
  if (!/market|option|trading|probability|statistics|alpha|risk/i.test(lower)) {
    bullets.push(isEn
      ? "Add one quant-facing line that connects a project to markets, probability, statistics, risk, or options."
      : "补一条 quant 相关表达，把项目和市场、概率、统计、risk 或 options 联系起来。");
  }
  if (!/lead|built|designed|implemented|optimized|analyzed/i.test(lower)) {
    bullets.push(isEn
      ? "Start bullets with stronger verbs: built, optimized, analyzed, implemented, designed."
      : "bullet 开头用更强动词：built、optimized、analyzed、implemented、designed。");
  }
  bullets.push(isEn
    ? `Tune the education line for graduation term ${currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM} and put recruiting status near the top.`
    : `教育经历里明确毕业时间 ${currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM}，并把求职状态放到更靠前的位置。`);
  return bullets.slice(0, 6);
}

function renderJobs(filter = getActiveJobFilter()) {
  if (!els.jobsList) return;
  const selected = filter || "all";
  document.querySelectorAll("[data-job-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.jobFilter === selected);
  });
  const jobs = normalizeJobs(state.jobs)
    .filter((job) => selected === "all" || job.type === selected)
    .sort((a, b) => jobTime(b) - jobTime(a));
  els.jobsList.innerHTML = "";
  if (!jobs.length) {
    els.jobsList.appendChild(emptyBlock(t("searchEmpty")));
    return;
  }
  jobs.forEach((job) => {
    const card = document.createElement("article");
    card.className = "job-card content-card problem-card";
    card.dataset.jobId = job.id;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", `${t("applyNow")}: ${job.company} ${job.title}`);
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      openExternalUrl(job.url);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openExternalUrl(job.url);
    });
    const typeLabel = job.type === "fulltime" ? t("fulltime") : t("internship");

    const title = document.createElement("h3");
    title.textContent = job.title;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    addProblemTag(meta, typeLabel, `difficulty ${job.type === "fulltime" ? "medium" : "easy"}`);
    addProblemTag(meta, job.company, "topic");
    addProblemTag(meta, formatNewsDate(job.postedAt || job.createdAt || ""), "source");

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    prompt.textContent = `${job.company} · ${job.location}`;

    const tags = document.createElement("div");
    tags.className = "problem-meta";
    job.tags.slice(0, 4).forEach((tag) => addProblemTag(tags, tag, "skill"));

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const link = document.createElement("a");
    link.className = "content-card-link";
    link.href = safeExternalUrl(job.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = t("applyNow");
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "external-link");
    footer.append(link, icon);

    card.append(title, meta, prompt, tags, footer);
    els.jobsList.appendChild(card);
  });
  refreshIcons();
}

function renderCompanies() {
  if (!els.companyOverviewList) return;
  const isEn = getLanguage() === "en";
  document.querySelectorAll("[data-company-tier]").forEach((button) => {
    const tier = button.dataset.companyTier || "all";
    button.classList.toggle("active", tier === companyTierFilter);
    button.setAttribute("aria-pressed", String(tier === companyTierFilter));
  });

  const problems = getCatalogProblems();
  const entries = quantCompanyDefs
    .map((company) => ({
      company,
      stats: getCompanyProblemStats(company, problems),
      jobs: getCompanyJobs(company)
    }))
    .filter((entry) => companyTierFilter === "all" || entry.company.tier.toLowerCase() === companyTierFilter)
    .sort((left, right) => (
      companyTierWeight(left.company.tier) - companyTierWeight(right.company.tier)
      || right.stats.total - left.stats.total
      || left.company.name.localeCompare(right.company.name)
    ));

  if (els.companiesPageTitle) els.companiesPageTitle.textContent = t("companies");
  if (els.companiesSummary) {
    const questionCount = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
    els.companiesSummary.textContent = isEn
      ? `${entries.length} firms · ${questionCount} tagged questions · tier, topics, careers`
      : `${entries.length} 家公司 · ${questionCount} 道标注题 · tier、考点和官网入口`;
  }

  els.companyOverviewList.innerHTML = "";
  if (!entries.length) {
    els.companyOverviewList.appendChild(emptyBlock(t("searchEmpty")));
    return;
  }

  entries.forEach(({ company, stats, jobs }) => {
    const summary = isEn ? company.summaryEn : company.summaryZh;
    const card = document.createElement("article");
    card.className = "company-overview-card";
    card.dataset.companyCard = company.slug;
    card.style.setProperty("--company-color", company.color);
    card.style.setProperty("--company-accent", company.accent);

    const head = document.createElement("div");
    head.className = "company-card-head";
    const identity = document.createElement("div");
    identity.className = "company-card-identity";
    identity.appendChild(createCompanyMark(company));
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = company.name;
    const meta = document.createElement("small");
    meta.textContent = `Tier ${company.tier} · ${company.type}`;
    titleWrap.append(title, meta);
    identity.appendChild(titleWrap);
    const count = document.createElement("div");
    count.className = "company-question-count";
    count.innerHTML = `<strong>${escapeHtml(String(stats.total))}</strong><span>${escapeHtml(t("companyQuestions"))}</span>`;
    head.append(identity, count);

    const copy = document.createElement("p");
    copy.className = "company-summary";
    copy.textContent = summary;

    const focus = document.createElement("div");
    focus.className = "company-focus-list";
    company.focus.slice(0, 4).forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      focus.appendChild(chip);
    });

    const detail = document.createElement("div");
    detail.className = "company-detail-grid";
    detail.innerHTML = `
      <span><b>${escapeHtml(String(stats.completed))}/${escapeHtml(String(stats.total))}</b><small>${escapeHtml(t("companyProgress"))}</small></span>
      <span><b>${escapeHtml(String(jobs.length))}</b><small>${escapeHtml(isEn ? "open roles" : "岗位入口")}</small></span>
      <span><b>${escapeHtml(company.locations.slice(0, 2).join(" / "))}</b><small>${escapeHtml(isEn ? "locations" : "常见地点")}</small></span>
    `;

    const progress = document.createElement("div");
    progress.className = "company-progress-track";
    progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

    const actions = document.createElement("div");
    actions.className = "company-card-actions";
    const practice = document.createElement("button");
    practice.type = "button";
    practice.className = "primary-button compact";
    practice.dataset.companyPractice = company.slug;
    practice.innerHTML = `<i data-lucide="target"></i>${escapeHtml(t("companyPractice"))}`;
    const careers = document.createElement("button");
    careers.type = "button";
    careers.className = "secondary-button compact";
    careers.dataset.companyCareers = company.website;
    careers.innerHTML = `<i data-lucide="external-link"></i>${escapeHtml(t("companyCareers"))}`;
    actions.append(practice, careers);

    const watermark = document.createElement("div");
    watermark.className = "company-watermark";
    watermark.textContent = company.short;

    card.append(watermark, head, copy, focus, detail, progress, actions);
    els.companyOverviewList.appendChild(card);
  });
  refreshIcons();
}

function jobTime(job) {
  const value = new Date(job?.postedAt || job?.createdAt || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getActiveJobFilter() {
  return document.querySelector("[data-job-filter].active")?.dataset.jobFilter || "all";
}

function getCourseState(courseId) {
  const normalized = normalizeCourseStates(state.courseStates).find((item) => item.courseId === courseId);
  return normalized || {
    courseId,
    saved: false,
    inPath: false,
    done: false,
    note: "",
    selectedSourceId: "",
    pathAddedAt: "",
    updatedAt: ""
  };
}

function updateCourseState(courseId, patch = {}) {
  const current = getCourseState(courseId);
  const next = normalizeCourseStates([{
    ...current,
    ...patch,
    courseId,
    updatedAt: new Date().toISOString()
  }])[0];
  const without = normalizeCourseStates(state.courseStates).filter((item) => item.courseId !== courseId);
  if (next.saved || next.inPath || next.done || next.note || next.selectedSourceId) {
    state.courseStates = [...without, next];
  } else {
    state.courseStates = without;
  }
  saveState();
}

function getSelectedCourseSource(course, courseState = getCourseState(course.id)) {
  const sources = normalizeContentSources(course.sources, { title: course.provider, provider: course.platform, url: course.url });
  return sources.find((source) => source.id === courseState.selectedSourceId)
    || sources.find((source) => source.embeddable)
    || sources[0]
    || null;
}

function renderCourses() {
  if (!els.courseList) return;
  const courses = normalizeCourses(state.courses);
  els.courseList.innerHTML = "";
  renderLearningPath(courses);
  courses.forEach((course) => {
    const courseState = getCourseState(course.id);
    const selectedSource = getSelectedCourseSource(course, courseState);
    const card = document.createElement("article");
    card.className = "course-card content-card problem-card";
    card.dataset.courseId = course.id;

    const title = document.createElement("h3");
    title.textContent = course.title;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    addProblemTag(meta, course.platform, "topic");
    addProblemTag(meta, course.topic, "skill");
    addProblemTag(meta, course.level, "score");

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    prompt.textContent = `${course.provider} · ${course.summary}`;

    const sourceBar = document.createElement("div");
    sourceBar.className = "course-source-bar";
    course.sources.forEach((source) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.courseAction = "source";
      button.dataset.courseId = course.id;
      button.dataset.sourceId = source.id;
      button.className = source.id === selectedSource?.id ? "active" : "";
      button.textContent = source.provider;
      sourceBar.appendChild(button);
    });

    const player = document.createElement("div");
    player.className = "course-player";
    if (selectedSource?.embedUrl) {
      const iframe = document.createElement("iframe");
      iframe.src = selectedSource.embedUrl;
      iframe.title = `${course.title} · ${selectedSource.provider}`;
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      player.appendChild(iframe);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "course-player-fallback";
      fallback.innerHTML = `<strong>${escapeHtml(t("previewUnavailable"))}</strong>`;
      player.appendChild(fallback);
    }

    const tags = document.createElement("div");
    tags.className = "problem-meta";
    course.tags.slice(0, 4).forEach((tag) => addProblemTag(tags, tag, "skill"));

    const actions = document.createElement("div");
    actions.className = "course-actions";
    [
      ["save", courseState.saved ? t("savedCourse") : t("saveCourse"), courseState.saved ? "bookmark-check" : "bookmark"],
      ["path", courseState.inPath ? t("inLearningPath") : t("addToPath"), courseState.inPath ? "route" : "plus"],
      ["done", courseState.done ? t("courseDone") : t("markCourseDone"), courseState.done ? "check-circle-2" : "circle"]
    ].forEach(([action, label, iconName]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `secondary-button compact${courseState[action === "save" ? "saved" : action === "path" ? "inPath" : "done"] ? " is-active" : ""}`;
      button.dataset.courseAction = action;
      button.dataset.courseId = course.id;
      button.innerHTML = `<i data-lucide="${iconName}"></i>${escapeHtml(label)}`;
      actions.appendChild(button);
    });

    const notes = document.createElement("label");
    notes.className = "course-note-field";
    notes.innerHTML = `<span>${escapeHtml(t("courseNote"))}</span>`;
    const textarea = document.createElement("textarea");
    textarea.dataset.courseNote = course.id;
    textarea.rows = 3;
    textarea.placeholder = t("courseNotePlaceholder");
    textarea.value = courseState.note || "";
    notes.appendChild(textarea);

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const link = document.createElement("a");
    link.className = "content-card-link";
    link.href = safeExternalUrl(selectedSource?.url || course.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = t("openOriginal");
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "external-link");
    footer.append(link, icon);

    card.append(title, meta, prompt, sourceBar, player, tags, actions, notes, footer);
    els.courseList.appendChild(card);
  });
  refreshIcons();
}

function getLibraryEntries() {
  return libraryCatalog
    .filter((entry) => entry && entry.id !== "question-bank")
    .map((entry) => ({
      ...entry,
      kind: entry.kind === "questionSet" ? "questionSet" : "book",
      problemCount: Math.max(0, Number(entry.problemCount || 0))
    }));
}

function getLibraryTitle(entry, preferEnglish = getLanguage() === "en") {
  if (preferEnglish) return entry.titleEn || entry.titleZh || entry.id;
  return entry.titleZh || entry.titleEn || entry.id;
}

function getLibrarySubtitle(entry, preferEnglish = getLanguage() === "en") {
  return preferEnglish ? (entry.titleZh || entry.category || "") : (entry.titleEn || entry.category || "");
}

function getLibrarySearchText(entry) {
  return normalizeSearchFields([
    entry.id,
    entry.kind,
    entry.titleZh,
    entry.titleEn,
    entry.sourceSlug,
    entry.category,
    entry.language,
    Array.isArray(entry.tags) ? entry.tags.join(" ") : ""
  ]);
}

function getVisibleLibraryEntries() {
  const query = libraryQuery || normalizeSearchQuery(els.librarySearch?.value || "");
  return getLibraryEntries()
    .filter((entry) => libraryKindFilter === "all" || entry.kind === libraryKindFilter)
    .filter((entry) => !query || matchesNormalizedText(getLibrarySearchText(entry), query));
}

function renderLibrary() {
  if (!els.libraryBookGrid || !els.libraryQuestionGrid) return;
  const isEn = getLanguage() === "en";
  const allEntries = getLibraryEntries();
  const entries = getVisibleLibraryEntries();
  const books = entries.filter((entry) => entry.kind === "book");
  const questionSets = entries.filter((entry) => entry.kind === "questionSet");
  const readable = entries.filter((entry) => entry.readUrl || entry.readAssetId).slice(0, 7);
  const totalProblems = state.problems.filter(isCatalogProblem).length;

  els.libraryKindTabs?.querySelectorAll("[data-library-kind]").forEach((button) => {
    const kind = ["book", "questionSet"].includes(button.dataset.libraryKind) ? button.dataset.libraryKind : "all";
    button.classList.toggle("active", kind === libraryKindFilter);
    button.setAttribute("aria-selected", String(kind === libraryKindFilter));
  });

  if (els.libraryStats) {
    const bookCount = allEntries.filter((entry) => entry.kind === "book").length;
    const setCount = allEntries.filter((entry) => entry.kind === "questionSet").length;
    els.libraryStats.innerHTML = `
      <span><strong>${escapeHtml(String(bookCount))}</strong><small>${escapeHtml(isEn ? "Books" : "本书籍")}</small></span>
      <span><strong>${escapeHtml(String(setCount))}</strong><small>${escapeHtml(isEn ? "Sets" : "份题单")}</small></span>
      <span><strong>${escapeHtml(String(totalProblems))}</strong><small>${escapeHtml(isEn ? "Linked Problems" : "关联题目")}</small></span>
    `;
  }

  renderLibraryShelf(els.libraryContinueShelf, readable, true);
  renderLibraryShelf(els.libraryBookGrid, books, false);
  renderLibraryShelf(els.libraryQuestionGrid, questionSets, false);
  els.libraryEmpty?.classList.toggle("hidden", entries.length > 0);
  refreshIcons();
}

function renderLibraryShelf(container, entries, compact = false) {
  if (!container) return;
  container.innerHTML = "";
  if (!entries.length) {
    container.appendChild(emptyBlock(getLanguage() === "en" ? "No matching items." : "没有匹配内容。"));
    return;
  }
  entries.forEach((entry) => {
    container.appendChild(createLibraryCard(entry, compact));
  });
}

function createLibraryCard(entry, compact = false) {
  const isEn = getLanguage() === "en";
  const title = getLibraryTitle(entry, isEn);
  const subtitle = getLibrarySubtitle(entry, isEn);
  const kindLabel = entry.kind === "questionSet" ? (isEn ? "Question Set" : "题单") : (isEn ? "Book" : "书籍");
  const hasRead = Boolean(entry.readUrl || entry.readAssetId);
  const hasPractice = Boolean(entry.sourceSlug && entry.problemCount > 0);
  const card = document.createElement("article");
  card.className = `library-card${compact ? " compact" : ""}${entry.kind === "questionSet" ? " question-set" : ""}`;
  card.dataset.libraryId = entry.id;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `${hasRead ? (isEn ? "Read" : "阅读") : (isEn ? "Practice" : "练题")}: ${title}`);

  const cover = document.createElement("button");
  cover.type = "button";
  cover.className = "library-cover-button";
  cover.dataset.libraryId = entry.id;
  cover.dataset.libraryAction = hasRead ? "read" : "practice";
  cover.innerHTML = `
    <img src="${escapeHtml(entry.coverUrl || "assets/generated/brand-q-mark.webp?v=premium-system-2")}" alt="${escapeHtml(title)}" loading="lazy">
    <span>${escapeHtml(kindLabel)}</span>
  `;

  const copy = document.createElement("div");
  copy.className = "library-card-copy";
  copy.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(subtitle)}</p>
    <div class="library-card-meta">
      <span>${escapeHtml(entry.category || "Quant")}</span>
      <span>${escapeHtml(entry.language || "EN + ZH")}</span>
      ${entry.problemCount ? `<span>${escapeHtml(String(entry.problemCount))} ${escapeHtml(isEn ? "problems" : "题")}</span>` : ""}
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "library-card-actions";
  if (hasRead) {
    actions.appendChild(createLibraryActionButton(entry.id, "read", "book-open", isEn ? "Read" : "阅读"));
  }
  if (hasPractice) {
    actions.appendChild(createLibraryActionButton(entry.id, "practice", "list-checks", isEn ? "Practice" : "练题"));
  }
  if (!hasRead && !hasPractice) {
    actions.innerHTML = `<span class="library-card-note">${escapeHtml(isEn ? "Reference only" : "仅作资料入口")}</span>`;
  }

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (hasRead) openLibraryReader(entry.id);
    else if (hasPractice) openLibraryPractice(entry.sourceSlug);
  });
  card.append(cover, copy, actions);
  return card;
}

function createLibraryActionButton(entryId, action, iconName, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button compact";
  button.dataset.libraryId = entryId;
  button.dataset.libraryAction = action;
  button.innerHTML = `<i data-lucide="${iconName}"></i>${escapeHtml(label)}`;
  return button;
}

function handleLibraryAction(event) {
  const actionNode = event.target.closest("[data-library-action]");
  const card = event.target.closest("[data-library-id]");
  const entryId = actionNode?.dataset.libraryId || card?.dataset.libraryId || "";
  const entry = getLibraryEntries().find((item) => item.id === entryId);
  if (!entry) return;
  const action = actionNode?.dataset.libraryAction || ((entry.readUrl || entry.readAssetId) ? "read" : "practice");
  if (action === "practice") {
    openLibraryPractice(entry.sourceSlug);
    return;
  }
  openLibraryReader(entry.id);
}

function toLibraryUrl(value = "") {
  if (!value) return "";
  return encodeURI(value).replace(/#/g, "%23");
}

async function openLibraryReader(entryId) {
  const entry = getLibraryEntries().find((item) => item.id === entryId);
  if (!entry?.readUrl && !entry?.readAssetId) {
    if (entry?.sourceSlug) openLibraryPractice(entry.sourceSlug);
    return;
  }
  if (entry.readType === "external") {
    window.open(toLibraryUrl(entry.readUrl), "_blank", "noopener,noreferrer");
    return;
  }
  const isEn = getLanguage() === "en";
  if (!els.libraryReaderOverlay || !els.libraryReaderFrame) {
    const url = await getLibraryReaderUrl(entry).catch(() => "");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  els.libraryReaderTitle.textContent = getLibraryTitle(entry, isEn);
  els.libraryReaderMeta.textContent = `${entry.readType === "pdf" ? "PDF" : "HTML"} · ${entry.kind === "questionSet" ? (isEn ? "Question Set" : "题单") : (isEn ? "Book" : "书籍")}`;
  els.libraryReaderOpenNew.innerHTML = `<i data-lucide="external-link"></i>${escapeHtml(isEn ? "Open" : "新窗口")}`;
  els.libraryReaderOpenNew.href = "#";
  els.libraryReaderFrame.src = "about:blank";
  els.libraryReaderOverlay.style.setProperty("--reader-cover", `url("${entry.coverUrl || ""}")`);
  els.libraryReaderOverlay.classList.remove("hidden");
  els.libraryReaderOverlay.classList.add("is-opening");
  document.body.classList.add("library-reader-open");
  refreshIcons();

  try {
    const url = await getLibraryReaderUrl(entry);
    els.libraryReaderOpenNew.href = url;
    els.libraryReaderFrame.src = url;
  } catch (error) {
    closeLibraryReader();
    window.alert(error?.message || (isEn ? "Unable to open this PDF." : "暂时无法打开这本 PDF。"));
    return;
  } finally {
    window.setTimeout(() => {
      els.libraryReaderOverlay?.classList.remove("is-opening");
    }, 900);
  }
}

async function getLibraryReaderUrl(entry) {
  if (entry.readType !== "pdf") return toLibraryUrl(entry.readUrl);
  if (!entry.readAssetId) throw new Error(getLanguage() === "en" ? "This PDF is not configured for online reading." : "这本 PDF 尚未配置线上阅读。");
  if (!canUseCloud()) {
    throw new Error(getLanguage() === "en"
      ? "Please sign in or register with the cloud account before reading PDFs."
      : "请先用云端账号登录或注册后再阅读 PDF。");
  }
  const result = await cloudApi(`/library/reader-token/${encodeURIComponent(entry.readAssetId)}`, { method: "POST" });
  const url = result.url || result.path || "";
  if (!url) throw new Error(getLanguage() === "en" ? "The server did not return a reader URL." : "服务器没有返回阅读链接。");
  return absolutizeLibraryApiUrl(url);
}

function absolutizeLibraryApiUrl(url) {
  const raw = String(url || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    const apiUrl = new URL(getCloudApiBase());
    return `${apiUrl.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  } catch {
    return raw;
  }
}

function closeLibraryReader() {
  els.libraryReaderOverlay?.classList.add("hidden");
  els.libraryReaderOverlay?.classList.remove("is-opening");
  if (els.libraryReaderFrame) els.libraryReaderFrame.src = "about:blank";
  document.body.classList.remove("library-reader-open");
}

function getLibrarySourceLabel(sourceSlug) {
  const entry = getLibraryEntries().find((item) => item.sourceSlug === sourceSlug);
  return entry ? getLibraryTitle(entry, getLanguage() === "en") : sourceSlug;
}

function openLibraryPractice(sourceSlug) {
  if (!sourceSlug) return;
  const hasProblems = state.problems.some((problem) => isCatalogProblem(problem) && (
    problem.source === sourceSlug || problem.bookSlug === sourceSlug
  ));
  if (!hasProblems) return;
  problemSourceFilter = sourceSlug;
  problemCompanyFilter = "all";
  problemThemeFilter = "all";
  problemDifficultyFilter = "all";
  problemViewMode = "all";
  selectedProblemDetailId = "";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (els.problemSearch) els.problemSearch.value = "";
  closeLibraryReader();
  switchModule("problems");
  renderProblems();
}

function renderLearningPath(courses = normalizeCourses(state.courses)) {
  if (!els.coursePathList) return;
  const isEn = getLanguage() === "en";
  setText("#learningPathTitle", t("learningPathTitle"));
  setText("#learningPathHint", t("learningPathHint"));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const pathItems = normalizeCourseStates(state.courseStates)
    .filter((item) => item.inPath && courseById.has(item.courseId))
    .sort((a, b) => new Date(a.pathAddedAt || a.updatedAt || 0) - new Date(b.pathAddedAt || b.updatedAt || 0));
  els.coursePathList.innerHTML = "";
  if (!pathItems.length) {
    els.coursePathList.appendChild(emptyBlock(t("learningPathEmpty")));
    return;
  }
  pathItems.forEach((item, index) => {
    const course = courseById.get(item.courseId);
    const row = document.createElement("div");
    row.className = `course-path-item${item.done ? " is-done" : ""}`;
    const indexNode = document.createElement("span");
    indexNode.className = "course-path-index";
    indexNode.textContent = String(index + 1);
    const copy = document.createElement("div");
    copy.innerHTML = `<strong>${escapeHtml(course.title)}</strong><small>${escapeHtml(course.topic)} · ${escapeHtml(item.done ? t("courseDone") : (isEn ? "Queued" : "待学习"))}</small>`;
    const done = document.createElement("button");
    done.type = "button";
    done.className = "icon-button ghost";
    done.dataset.courseAction = "done";
    done.dataset.courseId = course.id;
    done.title = item.done ? t("courseDone") : t("markCourseDone");
    done.setAttribute("aria-label", done.title);
    done.innerHTML = `<i data-lucide="${item.done ? "check-circle-2" : "circle"}"></i>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button ghost";
    remove.dataset.courseAction = "path";
    remove.dataset.courseId = course.id;
    remove.title = isEn ? "Remove from path" : "移出路径";
    remove.setAttribute("aria-label", remove.title);
    remove.innerHTML = '<i data-lucide="x"></i>';
    row.append(indexNode, copy, done, remove);
    els.coursePathList.appendChild(row);
  });
}

function handleCourseListClick(event) {
  const button = event.target.closest("[data-course-action]");
  if (!button) return;
  const courseId = button.dataset.courseId || "";
  const course = normalizeCourses(state.courses).find((item) => item.id === courseId);
  if (!course) return;
  const courseState = getCourseState(courseId);
  const action = button.dataset.courseAction;
  if (action === "source") {
    updateCourseState(courseId, { selectedSourceId: button.dataset.sourceId || "" });
  } else if (action === "save") {
    updateCourseState(courseId, { saved: !courseState.saved });
  } else if (action === "path") {
    const inPath = !courseState.inPath;
    updateCourseState(courseId, {
      inPath,
      pathAddedAt: inPath ? (courseState.pathAddedAt || new Date().toISOString()) : ""
    });
  } else if (action === "done") {
    updateCourseState(courseId, { done: !courseState.done, inPath: courseState.inPath || true, pathAddedAt: courseState.pathAddedAt || new Date().toISOString() });
  }
  renderCourses();
  refreshIcons();
}

function handleCourseNoteChange(event) {
  const field = event.target.closest("[data-course-note]");
  if (!field) return;
  updateCourseState(field.dataset.courseNote, { note: field.value });
  renderLearningPath();
}

function maybeAutoRefreshJobs() {
  if (!currentUser || jobsRefreshInFlight) return;
  const lastFetch = new Date(state.jobsFetchedAt || 0).getTime();
  const lastAttempt = new Date(state.jobsFetchAttemptAt || 0).getTime();
  const fetchDue = !lastFetch || Date.now() - lastFetch > JOBS_AUTO_REFRESH_MS;
  const retryDue = !lastAttempt || Date.now() - lastAttempt > JOBS_RETRY_MS;
  if (fetchDue && retryDue) refreshJobsFromApi(false);
}

async function refreshJobsFromApi(showStatus = false) {
  if (jobsRefreshInFlight) return;
  jobsRefreshInFlight = true;
  state.jobsFetchAttemptAt = new Date().toISOString();
  if (showStatus && els.jobsSummary) els.jobsSummary.textContent = t("jobsSyncing");

  try {
    const items = await requestJobsFromApi();
    if (items.length) upsertJobs(items, { checkIn: false });
    state.jobsFetchedAt = new Date().toISOString();
    state.jobsSyncError = "";
    saveState({ checkIn: false });
    renderJobs();
  } catch (error) {
    state.jobsSyncError = error.message || "Jobs API failed";
    saveState({ checkIn: false });
    if (showStatus && els.jobsSummary) els.jobsSummary.textContent = getLanguage() === "en"
      ? "Live job API is unavailable. Showing saved links."
      : "岗位 API 暂不可用，先显示已保存链接。";
  } finally {
    jobsRefreshInFlight = false;
    refreshIcons();
  }
}

async function requestJobsFromApi() {
  const endpoint = getJobsEndpoint();
  if (!endpoint) throw new Error("Missing jobs endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max: 18,
      boards: ["janestreet", "optiverus", "imc", "jumptrading"]
    })
  });
  if (!response.ok) throw new Error(`Jobs API ${response.status}`);
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.jobs || [];
  return items.map(normalizeJobItem);
}

function getJobsEndpoint() {
  const endpoint = (llmConfig.endpoint || DEFAULT_LLM_ENDPOINT).trim();
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/(interview|classify-log|news)\/?$/, "/jobs");
    if (!url.pathname.endsWith("/jobs")) url.pathname = "/jobs";
    url.search = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:8787/jobs";
  }
}

function normalizeJobItem(raw = {}) {
  return normalizeJobs([raw])[0];
}

function upsertJobs(items, options = {}) {
  const byId = new Map(normalizeJobs(state.jobs).map((item) => [item.id, item]));
  items.map(normalizeJobItem).forEach((item) => {
    if (safeExternalUrl(item.url) === "#") return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });
  state.jobs = [...byId.values()];
  saveState({ checkIn: options.checkIn !== false });
}

function renderGlobalSearchResults() {
  if (globalSearchTimer) {
    window.clearTimeout(globalSearchTimer);
    globalSearchTimer = 0;
  }
  if (!els.globalSearchInput || !els.globalSearchResults) return;
  const query = els.globalSearchInput.value.trim();
  globalSearchMatches = buildGlobalSearchResults(query);
  els.globalSearchResults.innerHTML = "";
  if (!query) {
    hideGlobalSearchResults();
    return;
  }

  if (!globalSearchMatches.length) {
    const empty = document.createElement("div");
    empty.className = "global-search-empty";
    empty.textContent = t("searchEmpty");
    els.globalSearchResults.appendChild(empty);
    els.globalSearchResults.classList.remove("hidden");
    return;
  }

  globalSearchMatches.forEach((result, index) => {
    const button = document.createElement("button");
    button.className = "global-search-result";
    button.type = "button";
    button.dataset.searchIndex = String(index);
    const meta = document.createElement("span");
    meta.className = "global-search-result-meta";
    meta.textContent = result.typeLabel;
    const title = document.createElement("strong");
    title.textContent = result.title;
    const detail = document.createElement("small");
    detail.textContent = result.detail;
    button.append(meta, title, detail);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => activateGlobalSearchResult(index));
    els.globalSearchResults.appendChild(button);
  });
  els.globalSearchResults.classList.remove("hidden");
}

function scheduleGlobalSearchResults() {
  if (globalSearchComposing) return;
  if (globalSearchTimer) window.clearTimeout(globalSearchTimer);
  globalSearchTimer = window.setTimeout(() => {
    globalSearchTimer = 0;
    renderGlobalSearchResults();
  }, 90);
}

function hideGlobalSearchResults() {
  if (globalSearchTimer) {
    window.clearTimeout(globalSearchTimer);
    globalSearchTimer = 0;
  }
  els.globalSearchResults?.classList.add("hidden");
}

function clearGlobalSearch() {
  if (els.globalSearchInput) els.globalSearchInput.value = "";
  globalSearchMatches = [];
  hideGlobalSearchResults();
}

function handleGlobalSearchKeydown(event) {
  if (event.key === "Escape") {
    hideGlobalSearchResults();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (globalSearchTimer) {
      window.clearTimeout(globalSearchTimer);
      globalSearchTimer = 0;
    }
    if (!globalSearchMatches.length) renderGlobalSearchResults();
    if (globalSearchMatches.length) activateGlobalSearchResult(0);
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = [...(els.globalSearchResults?.querySelectorAll(".global-search-result") || [])];
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.findIndex((button) => button === document.activeElement);
  const delta = event.key === "ArrowDown" ? 1 : -1;
  const next = current < 0 ? 0 : (current + delta + buttons.length) % buttons.length;
  buttons[next].focus();
}

function buildGlobalSearchResults(query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  const results = [];

  getModuleSearchDefs().forEach((item) => {
    if (!matchesQuery(item.fields, normalized)) return;
    results.push({
      type: "module",
      typeLabel: t("companyTypeModule"),
      title: item.label,
      detail: item.detail,
      module: item.module
    });
  });

  state.problems.filter(isCatalogProblem).forEach((problem) => {
    const isEn = getLanguage() === "en";
    const searchRecord = getProblemSearchRecord(problem);
    if (!matchesNormalizedText(searchRecord.searchText, normalized)) return;
    results.push({
      type: "problem",
      typeLabel: t("problems"),
      title: isEn ? searchRecord.titleEn : searchRecord.titleZh,
      detail: `${formatCategoryLabel(problem.category)} · ${problem.difficulty}`,
      id: problem.id,
      rank: scoreProblemSearchRecord(searchRecord, normalized)
    });
  });

  quantCompanyDefs.forEach((company) => {
    const summary = getLanguage() === "en" ? company.summaryEn : company.summaryZh;
    const stats = getCompanyProblemStats(company);
    const fields = [
      company.name,
      company.short,
      company.tier,
      company.type,
      summary,
      company.locations.join(" "),
      company.focus.join(" "),
      company.aliases.join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "company",
      typeLabel: t("companies"),
      title: company.name,
      detail: `Tier ${company.tier} · ${stats.total} ${t("companyQuestions")}`,
      id: company.slug,
      rank: company.name.toLowerCase().includes(normalized) ? 2 : 12
    });
  });

  normalizeJobs(state.jobs).forEach((job) => {
    const fields = [job.company, job.title, job.type, job.location, job.postedAt, job.tags.join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "job",
      typeLabel: t("jobs"),
      title: `${job.company} · ${job.title}`,
      detail: `${job.location} · ${job.type}`,
      id: job.id,
      url: job.url
    });
  });

  normalizeCourses(state.courses).forEach((course) => {
    const fields = [
      course.title,
      course.platform,
      course.provider,
      course.topic,
      course.level,
      course.summary,
      course.tags.join(" "),
      course.sources.map((source) => `${source.provider} ${source.title} ${source.url}`).join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "course",
      typeLabel: t("courses"),
      title: course.title,
      detail: `${course.platform} · ${course.topic}`,
      id: course.id,
      url: course.url
    });
  });

  Object.entries(skillDefs).forEach(([key, skill]) => {
    const fields = [skill.name, skill.short, skill.subtitle, skill.keywords.join(" "), skill.subskills.join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "skill",
      typeLabel: t("skills"),
      title: skill.name,
      detail: skill.subtitle,
      id: key
    });
  });

  sortNews(state.news || []).forEach((item) => {
    const fields = [item.title, item.titleZh, item.source, item.summary, item.insight, (item.tags || []).join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "news",
      typeLabel: t("news"),
      title: item.titleZh || item.title,
      detail: `${item.source || inferSource(item.sourceUrl)} · ${formatNewsDate(item.publishedAt || item.createdAt)}`,
      id: item.id
    });
  });

  return results
    .sort((a, b) => (a.rank ?? 40) - (b.rank ?? 40))
    .slice(0, 14);
}

function activateGlobalSearchResult(index) {
  const result = globalSearchMatches[index];
  if (!result) return;
  clearGlobalSearch();

  if (result.type === "module") {
    switchModule(result.module);
    return;
  }
  if (result.type === "problem") {
    switchModule("problems");
    openProblemFromSearch(result.id);
    return;
  }
  if (result.type === "job") {
    switchModule("jobs");
    window.setTimeout(() => spotlightElement(`[data-job-id="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "company") {
    companyTierFilter = "all";
    switchModule("companies");
    window.setTimeout(() => spotlightElement(`[data-company-card="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "course") {
    switchModule("courses");
    window.setTimeout(() => spotlightElement(`[data-course-id="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "skill") {
    switchModule("skills");
    setRadarHover(result.id);
    return;
  }
  if (result.type === "news") {
    focusNewsItem(result.id);
  }
}

function getModuleSearchDefs() {
  return [
    { module: "overview", label: t("overview"), detail: "Dashboard / 总览", fields: [t("overview"), "overview", "dashboard", "总览", "首页", "home"] },
    { module: "plan", label: t("plan"), detail: "Interview prep plan / 备战计划", fields: [t("plan"), "plan", "计划", "备战", "schedule", "baseline"] },
    { module: "experiences", label: t("experiences"), detail: "Interview log / 面经", fields: [t("experiences"), "interview log", "面经", "复盘", "debrief", "experience"] },
    { module: "community", label: t("community"), detail: "Forum / 论坛", fields: [t("community"), "community", "forum", "论坛", "社区", "动态"] },
    { module: "messages", label: t("messages"), detail: "Messages / 聊天", fields: [t("messages"), "messages", "chat", "dm", "私信", "聊天"] },
    { module: "problems", label: t("problems"), detail: "Problem bank / 题库", fields: [t("problems"), "problems", "题目", "题库", "question bank", "problem bank", "概率题"] },
    { module: "interview", label: t("interview"), detail: "Mock interview / 模拟面试", fields: [t("interview"), "interview", "mock", "模拟面试", "面试", "oa"] },
    { module: "pk", label: t("pk"), detail: "PK", fields: [t("pk"), "pk", "对战", "battle"] },
    { module: "news", label: t("news"), detail: "Quant Wire / 新闻", fields: [t("news"), "news", "新闻", "wire", "market news"] },
    { module: "network", label: t("network"), detail: "Network / 人脉", fields: [t("network"), "network", "人脉", "networking"] },
    { module: "resume", label: t("resume"), detail: "Resume / 简历", fields: [t("resume"), "resume", "cv", "简历"] },
    { module: "jobs", label: t("jobs"), detail: "Jobs / 求职", fields: [t("jobs"), "jobs", "job", "求职", "岗位", "申请", "internship", "full-time"] },
    { module: "companies", label: t("companies"), detail: "Companies / 公司", fields: [t("companies"), "companies", "company", "firm", "公司", "tier", "quant firm", "jane street", "citadel", "optiver"] },
    { module: "courses", label: t("courses"), detail: "Courses / 课程", fields: [t("courses"), "course", "courses", "课程", "视频", "youtube", "bilibili", "b站"] },
    { module: "skills", label: t("skills"), detail: "Ability radar / 能力值", fields: [t("skills"), "skills", "ability", "能力值", "雷达", "知识点"] },
    { module: "tools", label: t("tools"), detail: "Mental math / 速算", fields: [t("tools"), "tools", "drills", "速算", "mental math"] },
    { module: "poker", label: "Poker", detail: "Tournament room / 扑克锦标赛", fields: ["poker", "holdem", "tournament", "preflop", "solver", "扑克", "锦标赛", "翻前", "德州扑克"] },
    { module: "memory", label: t("memory"), detail: "Memory / 资料笔记", fields: [t("memory"), "memory", "notes", "资料", "笔记"] },
    { module: "settings", label: t("settings"), detail: "Settings / 设置", fields: [t("settings"), "settings", "设置", "config"] }
  ];
}

function normalizeSearchQuery(query) {
  return String(query || "").normalize("NFKC").trim().toLowerCase();
}

function normalizeSearchFields(fields) {
  return normalizeSearchQuery((Array.isArray(fields) ? fields : [fields]).filter(Boolean).join(" "));
}

function getSearchTokens(normalizedQuery) {
  return normalizeSearchQuery(normalizedQuery).split(/\s+/).filter(Boolean);
}

function matchesNormalizedText(normalizedText, normalizedQuery) {
  const tokens = getSearchTokens(normalizedQuery);
  if (!tokens.length) return true;
  return tokens.every((token) => normalizedText.includes(token));
}

function matchesQuery(fields, normalizedQuery) {
  return matchesNormalizedText(normalizeSearchFields(fields), normalizedQuery);
}

function spotlightElement(selector) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("spotlight");
  window.setTimeout(() => node.classList.remove("spotlight"), 900);
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/"/g, '\\"');
}

function toggleStreakPanel() {
  setStreakPanelOpen(!streakPanelOpen);
}

function setStreakPanelOpen(open) {
  streakPanelOpen = Boolean(open);
  els.streakWidget?.classList.toggle("is-open", streakPanelOpen);
  els.checkInPill?.setAttribute("aria-expanded", String(streakPanelOpen));
  els.checkInPill?.setAttribute("aria-label", t(streakPanelOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  els.checkInPill?.setAttribute("title", t(streakPanelOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  const actions = els.checkInPill?.closest(".app-command-actions");
  actions?.classList.toggle("is-streak-open", streakPanelOpen);
  if (els.streakCalendarPanel) els.streakCalendarPanel.hidden = !streakPanelOpen;
  if (streakPanelOpen) renderStreakCalendar();
}

function markActivityCheckIn() {
  if (!currentUser || hasCheckedInToday()) return null;
  const displayedStreak = Number(els.streakCount?.textContent || els.commandStreakCount?.textContent || state.streakCount || 0);
  const previous = Number.isFinite(displayedStreak) ? displayedStreak : getStreak();
  const now = new Date();
  const today = dayKey(now);
  const nextCheckIns = (state.checkIns || []).filter((item) => dayKey(item.date) !== today);
  state.checkIns = [
    ...nextCheckIns,
    {
      id: `checkin-${today}`,
      date: now.toISOString(),
      source: "activity"
    }
  ];
  state.streakCount = getStreak();
  freshCheckInKey = today;
  return { previous, next: state.streakCount, day: today };
}

function persistActivityCheckIn(options = {}) {
  if (!currentUser) return;
  const checkInResult = markActivityCheckIn();
  if (!checkInResult) return;
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(userStateKey(currentUser.id), JSON.stringify(localStatePayload(state)));
  if (options.sync !== false) queueCloudSync("state");
  queueCheckInCelebration(checkInResult);
}

function queueCheckInCelebration(checkInResult) {
  if (!checkInResult) return;
  window.requestAnimationFrame(() => {
    updateCheckInPill();
    renderStreakCalendar();
    if (els.streakCount) els.streakCount.textContent = String(checkInResult.next);
    animateStreakCount(checkInResult.previous, checkInResult.next);
    showCheckInToast(checkInResult.next);
  });
}

function hasCheckedInToday() {
  const today = dayKey(new Date());
  return (state.checkIns || []).some((item) => dayKey(item.date) === today);
}

function updateCheckInPill() {
  const pill = els.checkInPill;
  if (!pill) return;
  const checked = hasCheckedInToday();
  pill.classList.toggle("is-checked", checked);
  pill.disabled = false;
  pill.setAttribute("aria-disabled", "false");
  pill.setAttribute("aria-label", t(streakPanelOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  pill.setAttribute("title", t(streakPanelOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  const label = pill.querySelector("small");
  if (label) label.textContent = checked ? t("checkInDone") : t("commandStreakLabel");
  renderStreakCalendar();
}

function renderStreakCalendar() {
  if (!els.streakCalendarGrid || !els.streakCalendarWeekdays) return;
  const daySet = getActivityDaySet();
  const days = buildStreakCalendarDays();
  const formatter = new Intl.DateTimeFormat(getLocale(), { weekday: "short" });
  els.streakCalendarWeekdays.innerHTML = "";
  days.slice(0, 7).forEach(({ date }) => {
    const label = document.createElement("span");
    label.textContent = formatter.format(date).replace("周", "");
    els.streakCalendarWeekdays.appendChild(label);
  });

  els.streakCalendarGrid.innerHTML = "";
  days.forEach(({ date, key }) => {
    const lit = daySet.has(key);
    const beforeLit = daySet.has(dayKey(shiftDate(date, -1)));
    const afterLit = daySet.has(dayKey(shiftDate(date, 1)));
    const cell = document.createElement("span");
    cell.className = [
      "streak-day",
      lit ? "is-lit" : "",
      lit && beforeLit ? "connect-left" : "",
      lit && afterLit ? "connect-right" : "",
      key === dayKey(new Date()) ? "is-today" : "",
      key === freshCheckInKey ? "is-fresh" : ""
    ].filter(Boolean).join(" ");
    cell.title = key;
    cell.innerHTML = `
      <span class="streak-day-number">${date.getDate()}</span>
      <span class="streak-day-fire" aria-hidden="true"></span>
    `;
    els.streakCalendarGrid.appendChild(cell);
  });

  if (els.streakPanelCount) els.streakPanelCount.textContent = String(getStreak());
  const kicker = els.streakCalendarPanel?.querySelector(".streak-panel-kicker");
  if (kicker) kicker.textContent = t("streakPanelTitle");
  if (els.streakPanelMessage) {
    els.streakPanelMessage.textContent = hasCheckedInToday() ? t("streakPanelReady") : t("streakPanelPrompt");
  }
}

function getActivityDaySet() {
  return new Set([
    ...(state.entries || []).map((entry) => dayKey(entry.date)),
    ...(state.checkIns || []).map((item) => dayKey(item.date))
  ].filter(Boolean));
}

function buildStreakCalendarDays() {
  const today = new Date();
  const start = shiftDate(today, -13);
  return Array.from({ length: 14 }, (_, index) => {
    const date = shiftDate(start, index);
    return { date, key: dayKey(date) };
  });
}

function shiftDate(date, amount) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

function showCheckInToast(streak) {
  let toast = document.querySelector(".checkin-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "checkin-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <span class="stat-art stat-art-fire" aria-hidden="true"></span>
    <span>
      <strong>${escapeHtml(t("checkInToastTitle"))}</strong>
      <small>${escapeHtml(t("checkInToastDetail", { count: streak }))}</small>
    </span>
  `;
  toast.classList.remove("show");
  toast.offsetWidth;
  toast.classList.add("show");
  if (checkInToastTimer) window.clearTimeout(checkInToastTimer);
  checkInToastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3400);
}

function animateStreakCount(previous, next) {
  const pill = els.checkInPill;
  const countNode = els.commandStreakCount;
  if (!pill || !countNode) return;
  pill.classList.remove("is-burning");
  pill.offsetWidth;
  pill.classList.add("is-burning");
  const burst = document.createElement("span");
  burst.className = "streak-burst";
  burst.textContent = "+1";
  pill.appendChild(burst);
  const start = performance.now();
  const duration = 520;
  const animate = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    const value = Math.round(previous + (next - previous) * progress);
    countNode.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      countNode.textContent = next;
      window.setTimeout(() => {
        pill.classList.remove("is-burning");
        burst.remove();
      }, 520);
    }
  };
  requestAnimationFrame(animate);
}

function renderRegionRank() {
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  const metric = settings.metric || "overall";
  const country = currentUser?.country || "china";
  const region = currentUser?.region || getDefaultRegion(country);
  const regionalRows = getLeaderboardRowsForSettings({
    ...settings,
    scope: "region",
    country,
    region,
    metric
  }, 50);
  const place = regionalRows.findIndex((row) => row.id === currentUser?.id) + 1;
  const rank = place > 0 ? place : 1;
  const metricLabel = metric === "overall" ? "" : ` · ${getLeaderboardMetricLabel(metric)}`;
  els.regionRankText.textContent = `${getCountryLabel(country)} · ${getRegionLabel(region)}${metricLabel} #${rank}`;
  els.regionMedal.textContent = String(rank);
  els.regionMedal.className = `medal ${rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain"}`;
}

function renderSkills() {
  renderSkillScoreSummary();
  renderSkillRadarLegend();
  els.skillsGrid.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const xp = state.skills[key] || 0;
    const score = getSkillScore(xp);
    const stats = getSkillPracticeStats(key);
    const node = els.skillTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.skillKey = key;
    const icon = node.querySelector(".skill-icon");
    icon.textContent = def.short;
    icon.style.background = def.color;
    node.querySelector("h3").textContent = def.name;
    node.querySelector("small").textContent = def.subtitle;
    node.querySelector(".level-row strong").textContent = `${score}/100`;
    node.querySelector(".level-row span").textContent = `${xp} XP`;
    const fill = node.querySelector(".progress-fill");
    fill.style.width = `${score}%`;
    fill.style.background = def.color;
    const metricRow = document.createElement("div");
    metricRow.className = "skill-card-metrics";
    metricRow.innerHTML = `
      <span><b>${stats.practiceCount}</b><small>${escapeHtml(t("practiceCount"))}</small></span>
      <span><b>${stats.problemCount}</b><small>${escapeHtml(t("practicedProblems"))}</small></span>
      <span><b>${stats.averageScore == null ? "-" : Math.round(stats.averageScore)}</b><small>${escapeHtml(t("averageScore"))}</small></span>
    `;
    const subskills = node.querySelector(".subskills");
    def.subskills.forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      subskills.appendChild(span);
    });
    node.insertBefore(metricRow, subskills);
    node.addEventListener("mouseenter", (event) => setRadarHover(key, event));
    node.addEventListener("mousemove", (event) => setRadarHover(key, event));
    node.addEventListener("mouseleave", clearRadarHover);
    node.addEventListener("focusin", () => setRadarHover(key));
    node.addEventListener("focusout", clearRadarHover);
    els.skillsGrid.appendChild(node);
  });
  drawRadar();
  updateRadarLegendHighlight(radarHoverKey);
}

function renderSkillScoreSummary() {
  const score = getQuantScore();
  const stats = getAllSkillPracticeStats();
  const weakest = Object.entries(skillDefs)
    .map(([key, def]) => ({ key, def, score: getSkillScore(state.skills?.[key] || 0) }))
    .sort((a, b) => a.score - b.score)[0];
  if (els.skillsScoreValue) els.skillsScoreValue.textContent = formatScore(score);
  if (els.skillsEntriesCount) els.skillsEntriesCount.textContent = stats.practiceCount;
  if (els.skillsAverageScore) els.skillsAverageScore.textContent = stats.averageScore == null ? "-" : Math.round(stats.averageScore);
  if (els.skillsWeakestSkill) els.skillsWeakestSkill.textContent = weakest?.def.short || "-";
}

function renderSkillRadarLegend() {
  if (!els.skillRadarLegend) return;
  els.skillRadarLegend.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const score = getSkillScore(state.skills?.[key] || 0);
    const row = document.createElement("button");
    row.className = "skill-radar-legend-row";
    row.type = "button";
    row.dataset.skillRadarKey = key;
    row.innerHTML = `
      <span class="legend-dot"></span>
      <span>${escapeHtml(def.name)}</span>
      <strong>${score}/100</strong>
    `;
    row.querySelector(".legend-dot").style.background = def.color;
    row.addEventListener("mouseenter", (event) => setRadarHover(key, event));
    row.addEventListener("mousemove", (event) => setRadarHover(key, event));
    row.addEventListener("click", (event) => setRadarHover(key, event));
    row.addEventListener("mouseleave", clearRadarHover);
    row.addEventListener("focus", () => setRadarHover(key));
    row.addEventListener("blur", clearRadarHover);
    els.skillRadarLegend.appendChild(row);
  });
}

function getSkillPracticeStats(skillKey) {
  const problemById = new Map((state.problems || []).map((problem) => [problem.id, problem]));
  const entries = (state.entries || []).filter((entry) => Number(entry.gains?.[skillKey] || 0) > 0);
  const relatedStates = (state.problemStates || []).filter((item) => {
    const problem = problemById.get(item.problemId);
    return problem && normalizeCategory(problem.category) === skillKey;
  });
  const problemIds = new Set(relatedStates.map((item) => item.problemId).filter(Boolean));
  entries.forEach((entry) => {
    if (entry.problemId) problemIds.add(entry.problemId);
  });

  const scoreValues = [];
  relatedStates.forEach((item) => {
    const history = Array.isArray(item.scoreHistory) ? item.scoreHistory : [];
    history.forEach((record) => {
      const score = Number(record.score);
      if (Number.isFinite(score)) scoreValues.push(clampNumber(score, 0, 100));
    });
    if (!history.length && Number.isFinite(Number(item.lastScore))) {
      scoreValues.push(clampNumber(Number(item.lastScore), 0, 100));
    }
  });
  entries.forEach((entry) => {
    if (Number.isFinite(Number(entry.interviewScore))) {
      scoreValues.push(clampNumber(Number(entry.interviewScore), 0, 100));
    }
  });

  const scoredPracticeCount = relatedStates.reduce((sum, item) => {
    const scoreCount = Array.isArray(item.scoreHistory) ? item.scoreHistory.length : 0;
    return sum + Math.max(Number(item.interviewCount || 0), scoreCount, Number.isFinite(Number(item.lastScore)) ? 1 : 0);
  }, 0);
  const practiceCount = Math.max(entries.length, scoredPracticeCount);
  const averageScore = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : null;
  const latestEntry = entries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return {
    score: getSkillScore(state.skills?.[skillKey] || 0),
    xp: state.skills?.[skillKey] || 0,
    practiceCount,
    problemCount: problemIds.size,
    averageScore,
    latestText: latestEntry?.text || ""
  };
}

function getAllSkillPracticeStats() {
  const stats = Object.keys(skillDefs).map(getSkillPracticeStats);
  const averageScores = stats.map((item) => item.averageScore).filter((score) => Number.isFinite(score));
  return {
    practiceCount: stats.reduce((sum, item) => sum + item.practiceCount, 0),
    averageScore: averageScores.length
      ? averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length
      : null
  };
}

function renderHistory() {
  els.historyList.innerHTML = "";
  const entries = state.entries.slice().reverse();
  if (!entries.length) {
    els.historyList.appendChild(emptyBlock("还没有记录。"));
    return;
  }

  entries.slice(0, 12).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const top = document.createElement("div");
    top.className = "history-top";
    const date = document.createElement("strong");
    date.textContent = formatDate(entry.date);
    const xp = document.createElement("span");
    xp.textContent = `+${entry.totalXp} XP`;
    top.append(date, xp);

    const text = document.createElement("p");
    text.textContent = entry.text;

    const pills = document.createElement("div");
    pills.className = "pill-row";
    Object.entries(entry.gains).forEach(([key, value]) => {
      if (!value) return;
      const def = skillDefs[key];
      if (!def) return;
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = `${def.name} +${value}`;
      pills.appendChild(pill);
    });

    item.append(top, text, pills);
    els.historyList.appendChild(item);
  });
}

function leaderboardSnapshotKey(settings) {
  return `qg.leaderboard.ranks.${settings.metric || "overall"}.${settings.scope || "global"}.${settings.country || ""}.${settings.region || ""}`;
}

// Reads the previous-rank snapshot, returns per-id deltas (positive = moved up),
// then stores the current ranks for next time.
function computeLeaderboardRankChanges(rows, settings) {
  const key = leaderboardSnapshotKey(settings);
  let previous = {};
  try {
    previous = JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    previous = {};
  }
  const changes = {};
  const next = {};
  rows.forEach((row, index) => {
    const place = row.place || index + 1;
    next[row.id] = place;
    const prior = previous[row.id];
    changes[row.id] = Number.isFinite(prior) ? prior - place : null;
  });
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* storage unavailable — arrows just won't persist */
  }
  return changes;
}

function buildLeaderboardTrend(delta) {
  const trend = document.createElement("span");
  trend.className = "leaderboard-trend";
  if (delta === null) {
    trend.classList.add("new");
    trend.textContent = "·";
    return trend;
  }
  if (delta > 0) {
    trend.classList.add("up");
    trend.innerHTML = `<i data-lucide="arrow-up-right"></i><b>+${delta}</b>`;
  } else if (delta < 0) {
    trend.classList.add("down");
    trend.innerHTML = `<i data-lucide="arrow-down-right"></i><b>${delta}</b>`;
  } else {
    trend.classList.add("flat");
    trend.textContent = "—";
  }
  return trend;
}

function renderLeaderboard() {
  renderLeaderboardControls();
  refreshLeaderboardFromCloud(false);
  els.leaderboardList.innerHTML = "";
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  const rows = getLeaderboardRowsForSettings(settings, 10);
  renderLeaderboardScopeSummary(settings, rows);
  if (!rows.length) {
    els.leaderboardList.appendChild(emptyBlock(t("leaderboardEmpty")));
    return;
  }

  const changes = computeLeaderboardRankChanges(rows, settings);

  rows.forEach((row, index) => {
    const rankPosition = row.place || index + 1;
    const item = document.createElement("div");
    item.className = `leaderboard-item${row.isCurrent ? " current" : ""}`;

    const place = document.createElement("strong");
    place.className = `leaderboard-rank ${rankPosition === 1 ? "gold" : rankPosition === 2 ? "silver" : rankPosition === 3 ? "bronze" : "plain"}`;
    place.textContent = String(rankPosition);

    const avatar = document.createElement("span");
    avatar.className = "leaderboard-avatar";
    avatar.style.setProperty("--avatar-hue", String(hashStringToHue(row.id || row.name)));
    if (row.picture) {
      avatar.classList.add("has-image");
      const image = document.createElement("img");
      image.src = row.picture;
      image.alt = "";
      image.loading = "lazy";
      avatar.appendChild(image);
    } else {
      avatar.textContent = getInitials(row.name);
    }

    const identity = document.createElement("div");
    identity.className = "leaderboard-identity";
    const name = document.createElement("span");
    name.textContent = row.isCurrent ? `${row.name} · ${t("leaderboardYou")}` : row.name;
    const rankMeta = document.createElement("small");
    rankMeta.textContent = [row.rank, row.locationLabel].filter(Boolean).join(" · ");
    identity.append(name, rankMeta);

    const score = document.createElement("b");
    score.className = "leaderboard-score";
    score.innerHTML = `<span>${formatScore(row.score)}</span><small>${t("leaderboardScoreUnit")}</small>`;

    const trend = buildLeaderboardTrend(changes[row.id]);

    item.append(place, avatar, identity, score, trend);
    els.leaderboardList.appendChild(item);
  });

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function renderLeaderboardControls() {
  if (!els.leaderboardMetricSelect) return;
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  renderLeaderboardMetricOptions(settings.metric);
  els.leaderboardScopeSelect.value = settings.scope;
  renderCountryOptions(els.leaderboardCountrySelect, settings.country);
  renderRegionOptions(els.leaderboardRegionSelect, settings.country, settings.region);
  const isGlobal = settings.scope === "global";
  const isCountry = settings.scope === "country";
  const countryControl = els.leaderboardCountrySelect.closest("label");
  const regionControl = els.leaderboardRegionSelect.closest("label");
  countryControl?.classList.toggle("hidden", isGlobal);
  regionControl?.classList.toggle("hidden", isGlobal || isCountry);
  els.leaderboardCountrySelect.disabled = isGlobal;
  els.leaderboardRegionSelect.disabled = isGlobal || isCountry;
}

function renderLeaderboardMetricOptions(selected = "overall") {
  els.leaderboardMetricSelect.innerHTML = "";
  [
    ["overall", t("leaderboardOverall")],
    ...Object.entries(skillDefs).map(([key, def]) => [key, def.name])
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    els.leaderboardMetricSelect.appendChild(option);
  });
}

function updateLeaderboardSettings() {
  const country = normalizeCountry(els.leaderboardCountrySelect.value || currentUser?.country);
  const region = normalizeRegionForCountry(els.leaderboardRegionSelect.value, country);
  state.leaderboard = normalizeLeaderboardSettings({
    metric: els.leaderboardMetricSelect.value,
    scope: els.leaderboardScopeSelect.value,
    country,
    region
  });
  saveState();
  renderLeaderboard();
  renderRegionRank();
}

function getLeaderboardRows() {
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  return getLeaderboardRowsForSettings(settings, 10);
}

function getLeaderboardRowsForSettings(settings, limit = 10) {
  const normalized = normalizeLeaderboardSettings(settings);
  const metric = normalized.metric || "overall";
  const baseRows = getAllLeaderboardRows(metric);
  const merged = filterLeaderboardRows(baseRows, normalized)
    .sort(compareLeaderboardRows)
    .map((row, index) => ({ ...row, place: index + 1 }));
  return keepCurrentLeaderboardRow(merged, limit);
}

function filterLeaderboardRows(rows, settings) {
  return rows.filter((row) => {
    if (settings.scope === "global") return true;
    if (settings.scope === "country") return row.country === settings.country;
    return row.country === settings.country && row.region === settings.region;
  });
}

function compareLeaderboardRows(a, b) {
  return b.score - a.score
    || Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    || a.name.localeCompare(b.name);
}

function keepCurrentLeaderboardRow(rows, limit = 10) {
  if (!Number.isFinite(limit) || limit <= 0 || rows.length <= limit) return rows;
  const currentIndex = rows.findIndex((row) => row.isCurrent);
  if (currentIndex < 0 || currentIndex < limit) return rows.slice(0, limit);
  return [...rows.slice(0, limit - 1), rows[currentIndex]];
}

function getAllLeaderboardRows(metric = "overall") {
  const cloudRows = leaderboardCloudRows.map((profile) => makeLeaderboardRow(profile, metric, "cloud"));
  const localRows = getLocalLeaderboardRows(metric);
  return mergeLeaderboardRows(cloudRows, localRows).sort(compareLeaderboardRows);
}

function getLocalLeaderboardRows(metric = "overall") {
  return auth.accounts.map((account) => {
    const accountState = loadStateForUser(account.id);
    return makeLeaderboardRow({
      ...account,
      name: account.name || account.email || "Quant",
      skills: accountState.skills,
      source: "local"
    }, metric, "local");
  });
}

function makeLeaderboardRow(profile, metric = "overall", source = "cloud") {
  const account = normalizeAccount(profile);
  const skills = normalizeSkills(profile.skills || {});
  const score = getLeaderboardScore(skills, metric);
  return {
    id: String(account.id || "").trim(),
    name: String(account.name || account.email || "Quant").trim() || "Quant",
    country: account.country,
    region: account.region,
    picture: String(account.picture || ""),
    locationLabel: `${getCountryLabel(account.country)} · ${getRegionLabel(account.region)}`,
    score,
    rank: metric === "overall" ? getRank(score) : getLeaderboardMetricLabel(metric),
    isCurrent: currentUser?.id === account.id,
    source,
    updatedAt: profile.updatedAt || ""
  };
}

function getLeaderboardScore(skills, metric) {
  if (metric === "overall") return calculateQuantScore(skills);
  return getSkillScore(skills?.[metric] || 0);
}

function getLeaderboardMetricLabel(metric) {
  return metric === "overall" ? t("leaderboardOverall") : skillDefs[metric]?.name || t("leaderboardOverall");
}

function mergeLeaderboardRows(...rowGroups) {
  const byId = new Map();
  rowGroups.flat().forEach((row) => {
    if (!row?.id) return;
    const previous = byId.get(row.id) || {};
    const preferExistingCloud = previous.source === "cloud" && row.source === "local" && !row.isCurrent;
    const merged = preferExistingCloud ? { ...row, ...previous } : { ...previous, ...row };
    byId.set(row.id, {
      ...merged,
      isCurrent: Boolean(previous.isCurrent || row.isCurrent)
    });
  });
  return [...byId.values()];
}

function hashStringToHue(value) {
  return String(value || "").split("").reduce((hash, char) => (
    (hash * 31 + char.charCodeAt(0)) % 360
  ), 0);
}

function renderLeaderboardScopeSummary(settings, rows, forcedStatus = "") {
  if (!els.leaderboardScopeSummary) return;
  const metricLabel = getLeaderboardMetricLabel(settings.metric);
  const location = getLeaderboardScopeText(settings);
  const userLabel = getLanguage() === "en" ? "users" : "位用户";
  const sourceCopy = getLeaderboardSourceText(forcedStatus);
  els.leaderboardScopeSummary.textContent = `${metricLabel} · ${location} · ${rows.length} ${userLabel} · ${sourceCopy}`;
}

function getLeaderboardSourceText(forcedStatus = "") {
  const status = forcedStatus || (
    leaderboardCloudLoading
      ? "loading"
      : leaderboardCloudRows.length
        ? "cloud"
        : leaderboardCloudError
          ? "error"
          : "local"
  );
  if (status === "loading") return t("leaderboardLoading");
  if (status === "cloud") return t("leaderboardCloudLive");
  if (status === "error") return t("leaderboardUnavailable");
  return t("leaderboardLocalOnly");
}

function getLeaderboardScopeText(settings) {
  if (settings.scope === "global") return t("leaderboardGlobal");
  if (settings.scope === "country") return getCountryLabel(settings.country);
  return `${getCountryLabel(settings.country)} · ${getRegionLabel(settings.region)}`;
}

function renderResources() {
  els.resourceList.innerHTML = "";
  const resources = normalizeResources(state.resources);
  if (!resources.length) {
    els.resourceList.appendChild(emptyBlock(t("resourcesEmpty")));
    return;
  }

  resources.slice().reverse().forEach((resource) => {
    const item = document.createElement("article");
    item.className = "resource-item";
    const top = document.createElement("div");
    top.className = "resource-top";
    const title = document.createElement("strong");
    title.textContent = resource.title;
    const type = document.createElement("span");
    type.className = "pill";
    type.textContent = resource.type.toUpperCase();
    top.append(title, type);
    const content = document.createElement("p");
    content.textContent = resource.content;
    item.append(top, content);
    const previewSource = resource.sources.find((source) => source.embeddable);
    if (previewSource?.embedUrl) {
      const player = document.createElement("div");
      player.className = "resource-player";
      const iframe = document.createElement("iframe");
      iframe.src = previewSource.embedUrl;
      iframe.title = `${resource.title} · ${previewSource.provider}`;
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      player.appendChild(iframe);
      item.appendChild(player);
    }
    if (resource.sources.length) {
      const links = document.createElement("div");
      links.className = "resource-source-links";
      resource.sources.forEach((source) => {
        const link = document.createElement("a");
        link.href = safeExternalUrl(source.url);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = source.provider || t("openOriginal");
        links.appendChild(link);
      });
      item.appendChild(links);
    }
    if (resource.dataUrl) {
      const image = document.createElement("img");
      image.className = "resource-image";
      image.src = resource.dataUrl;
      image.alt = resource.title;
      item.appendChild(image);
    }
    els.resourceList.appendChild(item);
  });
}

function parseResourceSources(text) {
  const urls = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
  return normalizeContentSources(urls.map((url) => ({ url, provider: inferSource(url), title: inferSource(url) })));
}

function renderNewsTicker() {
  if (!els.newsTickerTrack) return;
  els.newsTickerTrack.innerHTML = "";
  const news = sortNews(state.news || []).slice(0, 8);
  if (!news.length) {
    const empty = document.createElement("button");
    empty.className = "news-ticker-item";
    empty.type = "button";
    empty.textContent = t("newsTickerEmpty");
    els.newsTickerTrack.appendChild(empty);
    return;
  }

  [...news, ...news].forEach((item) => {
    const button = document.createElement("button");
    button.className = "news-ticker-item";
    button.type = "button";
    button.addEventListener("click", () => focusNewsItem(item.id));

    const source = document.createElement("span");
    source.textContent = item.source || "News";
    const title = document.createElement("strong");
    title.textContent = item.titleZh || item.title;
    button.append(source, title);
    els.newsTickerTrack.appendChild(button);
  });

  els.newsList = els.newsList || document.getElementById("newsList");
  if (els.newsList && !els.newsList.children.length) {
    try {
      renderNews();
    } catch (error) {
      els.newsList.appendChild(emptyBlock(`新闻渲染失败：${error.message || "unknown"}`));
    }
  }
}

function renderNews() {
  els.newsList = els.newsList || document.getElementById("newsList");
  els.newsUpdatedAt = els.newsUpdatedAt || document.getElementById("newsUpdatedAt");
  if (!els.newsList) return;
  try {
    els.newsList.innerHTML = "";
    const allNews = sortNews(state.news || []);
    const news = getFilteredNews(allNews);
    renderNewsIntelligence(allNews);
    const latest = allNews[0]?.publishedAt || allNews[0]?.createdAt || "";
    if (els.newsUpdatedAt) {
      const filteredText = news.length === allNews.length
        ? ""
        : ` · ${t("newsShowing")} ${news.length}`;
      const latestText = latest
        ? `${t("newsSavedCount")} ${allNews.length} · ${t("newsLatest")} ${formatNewsDate(latest)}${filteredText}`
        : t("newsDefaultSubtitle");
      const syncText = state.newsSyncError
        ? ` · ${t("newsApiUnavailable")}`
        : state.newsFetchedAt
          ? ` · API ${formatTimeOnly(state.newsFetchedAt)}`
          : "";
      els.newsUpdatedAt.textContent = `${latestText}${syncText}`;
    }

    if (!allNews.length) {
      els.newsList.appendChild(emptyBlock(t("newsNoItems")));
      return;
    }

    if (!news.length) {
      els.newsList.appendChild(emptyBlock(t("newsNoFilterItems")));
      return;
    }

    news.forEach((item) => {
      const card = document.createElement("article");
      const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
      card.className = `news-card content-card problem-card news-source-${sourceType}${item.readAt ? " read" : ""}`;
      card.dataset.newsId = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", item.titleZh || item.title || "新闻");
      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        openNewsDetail(item.id);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openNewsDetail(item.id);
      });

      const meta = document.createElement("div");
      meta.className = "problem-meta";
      addProblemTag(meta, formatNewsDate(item.publishedAt || item.createdAt), "source");
      addProblemTag(meta, item.source || inferSource(item.sourceUrl), "topic");
      addProblemTag(meta, getNewsSourceTypeLabel(sourceType), sourceType === "official" ? "skill" : "source");
      addProblemTag(meta, getNewsVerificationLabel(sourceType, item.sourceUrl), isSocialNewsType(sourceType) ? "score" : "source");
      if (item.readAt) addProblemTag(meta, t("newsReadCount"), "score");

      const title = document.createElement("h3");
      title.textContent = item.titleZh || item.title;

      const summary = document.createElement("p");
      summary.className = "problem-prompt";
      summary.textContent = item.summary;

      const impact = document.createElement("div");
      impact.className = "content-card-note";
      const impactLabel = document.createElement("strong");
      impactLabel.textContent = t("newsImpact");
      const impactText = document.createElement("span");
      impactText.textContent = item.insight || t("newsFallbackInsight");
      impact.append(impactLabel, impactText);

      const pills = document.createElement("div");
      pills.className = "problem-meta";
      normalizeNewsSkills(item.skills).forEach((key) => {
        addProblemTag(pills, skillDefs[key].name, "skill");
      });
      (item.tags || []).slice(0, 4).forEach((tag) => {
        addProblemTag(pills, tag, "source");
      });

      const actions = document.createElement("div");
      actions.className = "problem-card-footer";

      if (item.sourceUrl) {
        const link = document.createElement("a");
        link.className = "content-card-link";
        link.href = safeExternalUrl(item.sourceUrl);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = t("newsOpenOriginal");
        link.addEventListener("click", (event) => event.stopPropagation());
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "external-link");
        actions.append(link, icon);
      } else {
        const footerText = document.createElement("span");
        footerText.textContent = t("viewFullProblem");
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "chevron-right");
        actions.append(footerText, icon);
      }

      card.append(meta, title, summary, impact, pills, actions);
      els.newsList.appendChild(card);
    });
    refreshIcons();
  } catch (error) {
    els.newsList.innerHTML = "";
    els.newsList.appendChild(emptyBlock(`新闻渲染失败：${error.message || "unknown"}`));
  }
}

function getFilteredNews(allNews = sortNews(state.news || [])) {
  const topic = normalizeNewsTopicFilter(newsTopicFilter);
  const source = normalizeNewsSourceFilter(newsSourceFilter);
  return allNews.filter((item) => newsMatchesTopic(item, topic) && newsMatchesSourceFilter(item, source));
}

function renderNewsIntelligence(allNews = sortNews(state.news || [])) {
  updateNewsFilterButtons();
  if (els.newsIntelTitle) els.newsIntelTitle.textContent = t("newsIntelTitle");
  if (els.newsSocialHint) els.newsSocialHint.textContent = t("newsSocialHint");
  if (els.newsIntelSummary) {
    const syncText = state.newsSyncError
      ? t("newsApiUnavailable")
      : state.newsFetchedAt
        ? `API ${formatTimeOnly(state.newsFetchedAt)}`
        : t("newsDefaultSubtitle");
    els.newsIntelSummary.textContent = `${t("newsIntelSummary")} · ${syncText}`;
  }
  if (!els.newsIntelStats) return;
  els.newsIntelStats.innerHTML = "";
  const stats = [
    { label: t("newsSavedCount"), value: allNews.length },
    { label: t("newsAutoCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "news")).length },
    { label: t("newsOfficialCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "official")).length },
    { label: t("newsSocialCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "social")).length },
    { label: t("newsReadCount"), value: allNews.filter((item) => item.readAt).length }
  ];
  stats.forEach((stat) => {
    const node = document.createElement("span");
    node.className = "news-intel-stat";
    node.innerHTML = `<strong>${escapeHtml(String(stat.value))}</strong><small>${escapeHtml(stat.label)}</small>`;
    els.newsIntelStats.appendChild(node);
  });
}

function setNewsTopicFilter(value) {
  const next = normalizeNewsTopicFilter(value);
  if (next === newsTopicFilter) return;
  newsTopicFilter = next;
  if (activeNewsDetailId) closeNewsDetail();
  else renderNews();
}

function setNewsSourceFilter(value) {
  const next = normalizeNewsSourceFilter(value);
  if (next === newsSourceFilter) return;
  newsSourceFilter = next;
  if (activeNewsDetailId) closeNewsDetail();
  else renderNews();
}

function updateNewsFilterButtons() {
  document.querySelectorAll("[data-news-topic]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsTopic === normalizeNewsTopicFilter(newsTopicFilter));
  });
  document.querySelectorAll("[data-news-source-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsSourceFilter === normalizeNewsSourceFilter(newsSourceFilter));
  });
}

function normalizeNewsTopicFilter(value) {
  const key = String(value || "all").trim();
  return NEWS_TOPIC_QUERY_PACKS[key] ? key : "all";
}

function normalizeNewsSourceFilter(value) {
  const key = String(value || "all").trim();
  return NEWS_SOURCE_FILTERS.includes(key) ? key : "all";
}

function newsMatchesTopic(item, topic) {
  if (!topic || topic === "all") return true;
  const text = [
    item.title,
    item.titleZh,
    item.source,
    item.summary,
    item.insight,
    ...(item.tags || []),
    ...(item.skills || [])
  ].join(" ").toLowerCase();
  const matchers = {
    quantFirms: /jane street|citadel|optiver|imc|jump trading|two sigma|de shaw|d\.e\. shaw|hudson river|hrt|tower research|virtu|drw|flow traders|five rings/,
    marketStructure: /market making|market maker|electronic trading|liquidity|order book|exchange|options?|volatility|derivatives?|execution|sec|cme|nasdaq|nyse/,
    aiInfra: /\bai\b|artificial intelligence|gpu|coreweave|cloud|machine learning|deep learning|model|infrastructure|low latency|算力|模型/,
    recruiting: /intern|internship|graduate|new grad|campus|career|recruiting|job|offer|linkedin|xiaohongshu|小红书|social/
  };
  return (matchers[topic] || /./).test(text);
}

function newsMatchesSourceFilter(item, sourceFilter) {
  if (!sourceFilter || sourceFilter === "all") return true;
  const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
  if (sourceFilter === "news") return sourceType === "news" || sourceType === "rss";
  if (sourceFilter === "official") return sourceType === "official";
  if (sourceFilter === "social") return isSocialNewsType(sourceType);
  return true;
}

function maybeAutoRefreshNews() {
  if (!currentUser || newsRefreshInFlight) return;
  const lastFetch = new Date(state.newsFetchedAt || 0).getTime();
  const lastAttempt = new Date(state.newsFetchAttemptAt || 0).getTime();
  const fetchDue = !lastFetch || Date.now() - lastFetch > NEWS_AUTO_REFRESH_MS;
  const retryDue = !lastAttempt || Date.now() - lastAttempt > NEWS_RETRY_MS;
  if (fetchDue && retryDue) refreshNewsFromApi(false);
}

async function refreshNewsFromApi(showStatus = false) {
  if (newsRefreshInFlight) return;
  newsRefreshInFlight = true;
  state.newsFetchAttemptAt = new Date().toISOString();
  if (showStatus && els.newsUpdatedAt) els.newsUpdatedAt.textContent = "新闻 API 同步中...";

  try {
    const items = await requestNewsFromApi();
    if (items.length) upsertNews(items, { checkIn: false });
    state.newsFetchedAt = new Date().toISOString();
    state.newsSyncError = "";
    saveState({ checkIn: false });
    renderNewsTicker();
    renderNews();
  } catch (error) {
    state.newsSyncError = error.message || "News API failed";
    saveState({ checkIn: false });
    if (showStatus) renderNews();
  } finally {
    newsRefreshInFlight = false;
    refreshIcons();
  }
}

async function requestNewsFromApi() {
  const endpoint = getNewsEndpoint();
  if (!endpoint) throw new Error("Missing news endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max: 24,
      topic: normalizeNewsTopicFilter(newsTopicFilter),
      queries: getNewsQueriesForTopic(newsTopicFilter)
    })
  });

  if (!response.ok) throw new Error(`News API ${response.status}`);
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.news || [];
  return items.map(normalizeNewsItem);
}

function getNewsQueriesForTopic(topic) {
  return NEWS_TOPIC_QUERY_PACKS[normalizeNewsTopicFilter(topic)] || NEWS_TOPIC_QUERY_PACKS.all;
}

function getNewsEndpoint() {
  const endpoint = (llmConfig.endpoint || DEFAULT_LLM_ENDPOINT).trim();
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/(interview|classify-log)\/?$/, "/news");
    if (!url.pathname.endsWith("/news")) url.pathname = "/news";
    url.search = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:8787/news";
  }
}

function addNewsFromForm() {
  const selectedSourceType = normalizeNewsSourceType(els.newsSourceType?.value || "news");
  const item = normalizeNewsItem({
    title: els.newsTitle.value,
    titleZh: els.newsTitle.value,
    source: els.newsSource.value || getNewsSourceTypeLabel(selectedSourceType),
    sourceType: selectedSourceType,
    sourceUrl: els.newsUrl.value,
    publishedAt: new Date().toISOString(),
    tags: parseTags(els.newsTags.value),
    skills: [els.newsPrimarySkill.value],
    summary: els.newsSummary.value,
    insight: els.newsInsight.value,
    createdAt: new Date().toISOString()
  });

  if (!item.titleZh || !item.summary) return;
  upsertNews([item]);
  els.newsForm.reset();
  els.newsForm.classList.add("hidden");
  renderAll();
}

function upsertNews(items, options = {}) {
  const byId = new Map((state.news || []).map((item) => [item.id, item]));
  items.map(normalizeNewsItem).forEach((item) => {
    if (isLowQualityNews(item)) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item, updatedAt: new Date().toISOString() });
  });
  state.news = sortNews([...byId.values()]);
  saveState({ checkIn: options.checkIn !== false });
}

function openNewsDetail(id) {
  const item = state.news.find((newsItem) => newsItem.id === id);
  if (!item) return;
  activeNewsDetailId = id;
  renderNewsDetail(item);
  els.newsList.classList.add("hidden");
  els.newsDetail.classList.remove("hidden");
  els.newsDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  refreshIcons();
}

function renderNewsDetail(item) {
  const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
  els.newsDetailReadBadge.classList.toggle("hidden", !item.readAt);
  els.newsDetailMeta.textContent = [
    formatNewsDate(item.publishedAt || item.createdAt),
    item.source || inferSource(item.sourceUrl),
    getNewsSourceTypeLabel(sourceType),
    getNewsVerificationLabel(sourceType, item.sourceUrl)
  ]
    .filter(Boolean)
    .join(" · ");
  els.newsDetailTitle.textContent = item.titleZh || item.title;
  els.newsDetailSummary.textContent = item.summary;
  els.newsDetailInsight.textContent = item.insight || t("newsFallbackInsight");
  els.newsDetailPills.innerHTML = "";
  const sourcePill = document.createElement("span");
  sourcePill.className = "pill";
  sourcePill.textContent = getNewsSourceTypeLabel(sourceType);
  els.newsDetailPills.appendChild(sourcePill);
  normalizeNewsSkills(item.skills).forEach((key) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = skillDefs[key].name;
    els.newsDetailPills.appendChild(pill);
  });
  (item.tags || []).slice(0, 6).forEach((tag) => {
    const pill = document.createElement("span");
    pill.className = "pill muted-pill";
    pill.textContent = tag;
    els.newsDetailPills.appendChild(pill);
  });
  els.newsDetailLink.classList.toggle("hidden", !item.sourceUrl);
  els.newsDetailLink.href = safeExternalUrl(item.sourceUrl);
  els.newsDetailLink.textContent = t("newsOpenOriginal");
}

function closeNewsDetail() {
  const readId = activeNewsDetailId;
  activeNewsDetailId = "";
  if (readId) markNewsRead(readId, { render: false });
  els.newsDetail.classList.add("hidden");
  els.newsList.classList.remove("hidden");
  renderSummary();
  renderLeaderboard();
  renderNewsTicker();
  renderNews();
  refreshIcons();
  window.setTimeout(() => focusNewsItem(readId, false), 60);
}

function markNewsRead(id, options = {}) {
  const shouldRender = options.render !== false;
  const item = state.news.find((newsItem) => newsItem.id === id);
  if (!item || item.readAt) return;

  item.readAt = new Date().toISOString();
  const skills = normalizeNewsSkills(item.skills);
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  skills.forEach((key) => {
    gains[key] += 8;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + 8);
  });

  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: `阅读新闻：${item.titleZh || item.title}`,
    gains,
    totalXp: skills.length * 8,
    duration: 0
  });

  saveState();
  if (shouldRender) renderAll();
}

function focusNewsItem(id, shouldSwitch = true) {
  if (shouldSwitch) switchModule("news");
  window.setTimeout(() => {
    const card = document.querySelector(`[data-news-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("spotlight");
    window.setTimeout(() => card.classList.remove("spotlight"), 900);
  }, 80);
}

function bindCommunityComposer(scope) {
  const composer = getCommunityComposer(scope);
  if (!composer.form) return;
  composer.form.addEventListener("submit", (event) => {
    event.preventDefault();
    addCommunityPost(scope);
  });
  composer.media.addEventListener("change", (event) => handleCommunityMedia(scope, event));
}

function getCommunityComposer(scope) {
  const isOverview = scope === "overview";
  return {
    form: isOverview ? els.overviewCommunityForm : els.communityForm,
    text: isOverview ? els.overviewCommunityText : els.communityText,
    media: isOverview ? els.overviewCommunityMedia : els.communityMedia,
    preview: isOverview ? els.overviewCommunityMediaPreview : els.communityMediaPreview
  };
}

function normalizeCommunityPost(raw = {}) {
  const experience = raw.experience && raw.kind === "experience"
    ? normalizeInterviewExperience(raw.experience)
    : null;
  return {
    id: raw.id || makeId(),
    kind: experience ? "experience" : "update",
    experience,
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    authorAvatar: raw.authorAvatar || "",
    country: normalizeCountry(raw.country || "china"),
    region: normalizeRegionForCountry(raw.region, raw.country || "china"),
    text: String(raw.text || "").trim(),
    media: raw.media?.dataUrl ? {
      dataUrl: raw.media.dataUrl,
      type: raw.media.type === "video" ? "video" : "image",
      name: raw.media.name || ""
    } : null,
    likes: Array.isArray(raw.likes) ? raw.likes.map(String) : [],
    comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeCommunityComment) : [],
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeCommunityComment(raw = {}) {
  return {
    id: raw.id || makeId(),
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    text: String(raw.text || "").trim(),
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeMessageParticipant(raw = {}) {
  return {
    id: String(raw?.id || "").trim(),
    name: String(raw?.name || "Quant").trim() || "Quant",
    avatar: String(raw?.avatar || "").trim()
  };
}

function normalizeDirectMessage(raw = {}) {
  return {
    id: String(raw?.id || makeId()),
    senderId: String(raw?.senderId || "").trim(),
    text: String(raw?.text || "").trim().slice(0, 2000),
    createdAt: raw?.createdAt || new Date().toISOString(),
    readBy: Array.isArray(raw?.readBy) ? raw.readBy.map(String) : []
  };
}

function normalizeMessageThread(raw = {}) {
  const participants = Array.isArray(raw?.participants)
    ? raw.participants.map(normalizeMessageParticipant).filter((participant) => participant.id)
    : [];
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map(normalizeDirectMessage).filter((message) => message.text)
    : [];
  return {
    id: String(raw?.id || makeMessageThreadId(participants.map((participant) => participant.id))),
    participants: [...new Map(participants.map((participant) => [participant.id, participant])).values()],
    messages,
    updatedAt: raw?.updatedAt || messages.at(-1)?.createdAt || new Date().toISOString()
  };
}

function handleCommunityMedia(scope, event) {
  const composer = getCommunityComposer(scope);
  const file = event.target.files?.[0];
  delete composer.form.dataset.mediaData;
  delete composer.form.dataset.mediaType;
  delete composer.form.dataset.mediaName;
  composer.preview.classList.add("hidden");
  composer.preview.innerHTML = "";
  if (!file) return;

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    event.target.value = "";
    return;
  }
  if (file.size > 5_000_000) {
    window.alert(t("mediaTooLarge"));
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const dataUrl = String(reader.result);
    const type = file.type.startsWith("video/") ? "video" : "image";
    composer.form.dataset.mediaData = dataUrl;
    composer.form.dataset.mediaType = type;
    composer.form.dataset.mediaName = file.name;
    renderCommunityMedia(composer.preview, { dataUrl, type, name: file.name });
    composer.preview.classList.remove("hidden");
  });
  reader.readAsDataURL(file);
}

function addCommunityPost(scope) {
  if (!currentUser) return;
  const composer = getCommunityComposer(scope);
  const text = composer.text.value.trim();
  const media = composer.form.dataset.mediaData ? {
    dataUrl: composer.form.dataset.mediaData,
    type: composer.form.dataset.mediaType === "video" ? "video" : "image",
    name: composer.form.dataset.mediaName || ""
  } : null;

  if (!text && !media) {
    window.alert(t("writeSomething"));
    return;
  }

  community.posts.unshift(normalizeCommunityPost({
    authorId: currentUser.id,
    authorName: currentUser.name || currentUser.email || "Quant",
    authorAvatar: currentUser.picture || "",
    country: currentUser.country,
    region: currentUser.region,
    text,
    media,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  }));
  saveCommunity();
  resetCommunityComposer(scope);
  renderCommunity();
}

function resetCommunityComposer(scope) {
  const composer = getCommunityComposer(scope);
  composer.form.reset();
  delete composer.form.dataset.mediaData;
  delete composer.form.dataset.mediaType;
  delete composer.form.dataset.mediaName;
  composer.preview.innerHTML = "";
  composer.preview.classList.add("hidden");
}

function renderCommunity() {
  community = loadCommunity();
  const visiblePosts = communityFilter === "experience"
    ? community.posts.filter((post) => post.kind === "experience")
    : community.posts;
  renderCommunityList(els.overviewCommunityList, community.posts.slice(0, 3), { compact: true });
  renderCommunityList(els.communityList, visiblePosts, {
    compact: false,
    emptyText: communityFilter === "experience" ? "还没有面经分享。可以从自己的面经记录中选择一条分享。" : t("communityEmpty")
  });
  document.querySelectorAll("[data-community-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.communityFilter === communityFilter);
  });
  if (els.overviewCommunitySummary) {
    els.overviewCommunitySummary.textContent = community.posts.length
      ? formatCommunityPostCount(community.posts.length)
      : t("overviewCommunitySummary");
  }
  if (els.communitySummary) {
    els.communitySummary.textContent = visiblePosts.length
      ? communityFilter === "experience" ? `${visiblePosts.length} 条面经分享` : formatCommunityPostCount(visiblePosts.length)
      : t("communitySummary");
  }
  refreshIcons();
}

function formatCommunityPostCount(count) {
  if (getLanguage() === "en") {
    return `${count} ${count === 1 ? t("communityPostSingular") : t("communityPostPlural")}`;
  }
  return `${count} ${t("communityPostPlural")}`;
}

function renderCommunityList(container, posts, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!posts.length) {
    container.appendChild(emptyBlock(options.emptyText || t("communityEmpty")));
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "community-card";

    const head = document.createElement("div");
    head.className = "community-head";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (post.authorAvatar) {
      const image = document.createElement("img");
      image.src = post.authorAvatar;
      image.alt = "";
      avatar.appendChild(image);
    } else {
      avatar.textContent = getInitials(post.authorName);
    }
    const meta = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = post.authorName;
    const detail = document.createElement("small");
    detail.textContent = `${getCountryLabel(post.country)} · ${getRegionLabel(post.region)} · ${formatDate(post.createdAt)}`;
    meta.append(name, detail);
    head.append(avatar, meta);
    if (post.authorId === currentUser?.id) {
      const remove = document.createElement("button");
      remove.className = "icon-button ghost danger";
      remove.type = "button";
      remove.title = t("deletePost");
      remove.setAttribute("aria-label", t("deletePost"));
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      remove.addEventListener("click", () => deleteCommunityPost(post.id));
      head.appendChild(remove);
    }

    const text = document.createElement("p");
    text.textContent = post.text;

    card.appendChild(head);
    if (post.kind === "experience" && post.experience) {
      const experienceMeta = document.createElement("div");
      experienceMeta.className = "community-experience-meta";
      experienceMeta.innerHTML = `
        <span class="community-experience-label"><i data-lucide="notebook-pen"></i> 面经分享</span>
        <span>${escapeHtml(post.experience.stage)}</span>
        <span>${escapeHtml(post.experience.season)}</span>
        ${post.experience.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      `;
      card.appendChild(experienceMeta);
    }
    if (post.text) card.appendChild(text);
    if (post.media) {
      const mediaWrap = document.createElement("div");
      mediaWrap.className = "community-media";
      renderCommunityMedia(mediaWrap, post.media);
      card.appendChild(mediaWrap);
    }

    const actions = document.createElement("div");
    actions.className = "community-actions";
    const liked = post.likes.includes(currentUser?.id || "");
    const likeButton = document.createElement("button");
    likeButton.className = `secondary-button${liked ? " active-like" : ""}`;
    likeButton.type = "button";
    likeButton.innerHTML = `<i data-lucide="heart"></i> ${liked ? t("unlike") : t("like")} · ${post.likes.length}`;
    likeButton.addEventListener("click", () => toggleCommunityLike(post.id));
    actions.appendChild(likeButton);
    if (post.authorId && post.authorId !== currentUser?.id) {
      const messageButton = document.createElement("button");
      messageButton.className = "secondary-button";
      messageButton.type = "button";
      messageButton.innerHTML = `<i data-lucide="message-square-text"></i> ${t("messageDirect")}`;
      messageButton.addEventListener("click", () => startDirectMessageWithUser({
        id: post.authorId,
        name: post.authorName,
        avatar: post.authorAvatar
      }));
      actions.appendChild(messageButton);
    }

    if (!options.compact) {
      const commentCount = document.createElement("span");
      commentCount.className = "community-count";
      commentCount.textContent = `${post.comments.length} ${t("comment")}`;
      actions.appendChild(commentCount);
    }
    card.appendChild(actions);

    if (!options.compact) {
      const comments = document.createElement("div");
      comments.className = "community-comments";
      post.comments.slice(-4).forEach((comment) => {
        const item = document.createElement("div");
        item.className = "community-comment";
        const author = document.createElement("strong");
        author.textContent = comment.authorName;
        const body = document.createElement("span");
        body.textContent = comment.text;
        item.append(author, body);
        comments.appendChild(item);
      });
      const form = document.createElement("form");
      form.className = "community-comment-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = t("commentPlaceholder");
      const button = document.createElement("button");
      button.className = "icon-button ghost";
      button.type = "submit";
      button.title = t("comment");
      button.setAttribute("aria-label", t("comment"));
      button.innerHTML = '<i data-lucide="send"></i>';
      form.append(input, button);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        addCommunityComment(post.id, input.value);
      });
      comments.appendChild(form);
      card.appendChild(comments);
    }

    container.appendChild(card);
  });
}

function renderCommunityMedia(container, media) {
  container.innerHTML = "";
  if (media.type === "video") {
    const video = document.createElement("video");
    video.src = media.dataUrl;
    video.controls = true;
    video.playsInline = true;
    container.appendChild(video);
    return;
  }
  const image = document.createElement("img");
  image.src = media.dataUrl;
  image.alt = media.name || "community media";
  container.appendChild(image);
}

function toggleCommunityLike(postId) {
  if (!currentUser) return;
  community.posts = community.posts.map((post) => {
    if (post.id !== postId) return post;
    const likes = post.likes.includes(currentUser.id)
      ? post.likes.filter((id) => id !== currentUser.id)
      : [...post.likes, currentUser.id];
    return { ...post, likes };
  });
  saveCommunity();
  renderCommunity();
}

function addCommunityComment(postId, text) {
  if (!currentUser) return;
  const value = String(text || "").trim();
  if (!value) return;
  community.posts = community.posts.map((post) => {
    if (post.id !== postId) return post;
    return {
      ...post,
      comments: [
        ...post.comments,
        normalizeCommunityComment({
          authorId: currentUser.id,
          authorName: currentUser.name || currentUser.email || "Quant",
          text: value,
          createdAt: new Date().toISOString()
        })
      ]
    };
  });
  saveCommunity();
  renderCommunity();
}

function deleteCommunityPost(postId) {
  const deleted = community.posts.find((post) => post.id === postId);
  if (!deleted || !window.confirm(deleted.kind === "experience" ? "确认删除这条已分享的面经动态？私有面经记录将保留。" : "确认删除这条动态？")) return;
  community.posts = community.posts.filter((post) => post.id !== postId);
  saveCommunity();
  if (deleted?.kind === "experience") {
    state.interviewExperiences = state.interviewExperiences.map((record) => record.sharedPostId === postId
      ? normalizeInterviewExperience({ ...record, sharedPostId: "", sharedAt: "", updatedAt: new Date().toISOString() })
      : record);
    saveState();
    renderExperiences();
  }
  renderCommunity();
}

function getCurrentMessageParticipant() {
  return normalizeMessageParticipant({
    id: currentUser?.id || "local-user",
    name: currentUser?.name || currentUser?.email || "Quant",
    avatar: currentUser?.picture || ""
  });
}

function makeMessageThreadId(ids = []) {
  return `thread-${[...new Set(ids.filter(Boolean).map(String))].sort().join("-")}`;
}

function getThreadOtherParticipant(thread) {
  const currentId = currentUser?.id || "local-user";
  return thread?.participants?.find((participant) => participant.id !== currentId)
    || thread?.participants?.[0]
    || normalizeMessageParticipant({ id: "unknown", name: "Quant" });
}

function getUserMessageThreads() {
  const currentId = currentUser?.id || "local-user";
  community = loadCommunity();
  return normalizeCommunityStore(community).threads
    .filter((thread) => thread.participants.some((participant) => participant.id === currentId))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function getUnreadMessageCount() {
  const currentId = currentUser?.id || "local-user";
  return getUserMessageThreads().reduce((count, thread) => (
    count + thread.messages.filter((message) => message.senderId !== currentId && !message.readBy.includes(currentId)).length
  ), 0);
}

function updateUnreadMessageBadge() {
  if (!els.commandUnreadCount) return;
  const unread = getUnreadMessageCount();
  els.commandUnreadCount.textContent = unread ? String(unread) : "0";
  els.commandChatBtn?.classList.toggle("has-unread", unread > 0);
}

function startDirectMessageWithUser(participant) {
  if (!currentUser || !participant?.id || participant.id === currentUser.id) return;
  community = loadCommunity();
  const me = getCurrentMessageParticipant();
  const other = normalizeMessageParticipant(participant);
  const id = makeMessageThreadId([me.id, other.id]);
  const existing = community.threads.find((thread) => thread.id === id);
  if (!existing) {
    community.threads.unshift(normalizeMessageThread({
      id,
      participants: [me, other],
      messages: [{
        id: makeId(),
        senderId: me.id,
        text: t("networkConnectMessage").replace("{name}", other.name),
        createdAt: new Date().toISOString(),
        readBy: [me.id]
      }],
      updatedAt: new Date().toISOString()
    }));
    saveCommunity();
  }
  selectedMessageThreadId = id;
  switchModule("messages");
  renderMessages();
}

function markThreadRead(threadId) {
  if (!threadId || !currentUser) return;
  const currentId = currentUser.id;
  community = loadCommunity();
  community.threads = community.threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    return normalizeMessageThread({
      ...thread,
      messages: thread.messages.map((message) => ({
        ...message,
        readBy: message.readBy.includes(currentId) ? message.readBy : [...message.readBy, currentId]
      }))
    });
  });
  saveCommunity();
  updateUnreadMessageBadge();
}

function renderMessages() {
  if (!els.messageThreadList) return;
  const threads = getUserMessageThreads();
  if (!selectedMessageThreadId && threads.length) selectedMessageThreadId = threads[0].id;
  if (selectedMessageThreadId && !threads.some((thread) => thread.id === selectedMessageThreadId)) {
    selectedMessageThreadId = threads[0]?.id || "";
  }
  els.messageThreadList.innerHTML = "";
  if (!threads.length) {
    els.messageThreadList.appendChild(emptyBlock(t("messageEmpty")));
  } else {
    threads.forEach((thread) => {
      const other = getThreadOtherParticipant(thread);
      const last = thread.messages.at(-1);
      const unread = thread.messages.filter((message) => message.senderId !== currentUser?.id && !message.readBy.includes(currentUser?.id || "")).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `message-thread-item${thread.id === selectedMessageThreadId ? " active" : ""}`;
      button.dataset.messageThread = thread.id;
      button.innerHTML = `
        <span class="avatar">${other.avatar ? `<img src="${escapeAttribute(other.avatar)}" alt="">` : escapeHtml(getInitials(other.name))}</span>
        <span>
          <strong>${escapeHtml(other.name)}</strong>
          <small>${escapeHtml(last?.text || t("messageEmpty"))}</small>
        </span>
        ${unread ? `<b>${escapeHtml(String(unread))}</b>` : ""}
      `;
      els.messageThreadList.appendChild(button);
    });
  }

  const active = threads.find((thread) => thread.id === selectedMessageThreadId);
  renderMessageConversation(active);
  updateUnreadMessageBadge();
  refreshIcons();
}

function renderMessageConversation(thread) {
  if (!els.messageConversationHeader || !els.messageConversationBody || !els.messageComposerForm) return;
  els.messageConversationHeader.innerHTML = "";
  els.messageConversationBody.innerHTML = "";
  els.messageComposerForm.classList.toggle("hidden", !thread);
  if (!thread) {
    els.messageConversationHeader.innerHTML = `<strong>${escapeHtml(t("messages"))}</strong><small>${escapeHtml(t("messageEmpty"))}</small>`;
    els.messageConversationBody.appendChild(emptyBlock(t("messageEmpty")));
    return;
  }
  const other = getThreadOtherParticipant(thread);
  els.messageConversationHeader.innerHTML = `
    <span class="avatar">${other.avatar ? `<img src="${escapeAttribute(other.avatar)}" alt="">` : escapeHtml(getInitials(other.name))}</span>
    <div>
      <strong>${escapeHtml(other.name)}</strong>
      <small>${escapeHtml(thread.messages.length)} messages</small>
    </div>
  `;
  const currentId = currentUser?.id || "local-user";
  thread.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `direct-message ${message.senderId === currentId ? "mine" : "theirs"}`;
    bubble.innerHTML = `<p>${escapeHtml(message.text)}</p><small>${escapeHtml(formatDate(message.createdAt))}</small>`;
    els.messageConversationBody.appendChild(bubble);
  });
  window.requestAnimationFrame(() => {
    els.messageConversationBody.scrollTop = els.messageConversationBody.scrollHeight;
  });
}

function sendDirectMessage() {
  if (!currentUser || !selectedMessageThreadId || !els.messageComposerInput) return;
  const text = els.messageComposerInput.value.trim();
  if (!text) return;
  community = loadCommunity();
  const now = new Date().toISOString();
  community.threads = community.threads.map((thread) => {
    if (thread.id !== selectedMessageThreadId) return thread;
    return normalizeMessageThread({
      ...thread,
      messages: [...thread.messages, {
        id: makeId(),
        senderId: currentUser.id,
        text,
        createdAt: now,
        readBy: [currentUser.id]
      }],
      updatedAt: now
    });
  });
  els.messageComposerInput.value = "";
  saveCommunity();
  renderMessages();
}

function renderNetwork() {
  if (!els.networkList) return;
  const contacts = Array.isArray(state.network) ? state.network : [];
  els.networkList.innerHTML = "";
  if (els.networkSummary) {
    const active = contacts.filter((contact) => contact.status !== "Archived").length;
    els.networkSummary.textContent = contacts.length
      ? `${t("networkContacts").replace("{count}", String(contacts.length))} · ${active} ${t("networkActiveFollowups")}`
      : t("networkSummary");
  }

  if (!contacts.length) {
    els.networkList.appendChild(emptyBlock(t("networkEmpty")));
    return;
  }

  contacts
    .slice()
    .sort((a, b) => networkStatusWeight(a.status) - networkStatusWeight(b.status) || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .forEach((contact) => {
      const card = document.createElement("article");
      card.className = "network-card";

      const top = document.createElement("div");
      top.className = "network-card-top";
      const identity = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = contact.name;
      const role = document.createElement("small");
      role.textContent = [contact.role, contact.company].filter(Boolean).join(" · ") || t("networkCompanyFallback");
      identity.append(name, role);

      const remove = document.createElement("button");
      remove.className = "icon-button ghost danger";
      remove.type = "button";
      remove.title = "删除联系人";
      remove.setAttribute("aria-label", "删除联系人");
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      remove.addEventListener("click", () => deleteNetworkContact(contact.id));
      top.append(identity, remove);

      const status = document.createElement("span");
      status.className = "network-status";
      status.textContent = getNetworkStatusLabel(contact.status);

      const meta = document.createElement("div");
      meta.className = "network-meta";
      [contact.channel, contact.nextStep].filter(Boolean).forEach((item) => {
        const pill = document.createElement("span");
        pill.className = "pill muted-pill";
        pill.textContent = item;
        meta.appendChild(pill);
      });

      const notes = document.createElement("p");
      notes.textContent = contact.notes || t("networkNotesEmpty");

      card.append(top, status, meta, notes);
      els.networkList.appendChild(card);
    });
  refreshIcons();
}

function addNetworkContact() {
  const contact = normalizeNetworkContact({
    name: els.networkName.value,
    company: els.networkCompany.value,
    role: els.networkRole.value,
    status: els.networkStatus.value,
    channel: els.networkChannel.value,
    nextStep: els.networkNextStep.value,
    notes: els.networkNotes.value,
    createdAt: new Date().toISOString()
  });

  if (!contact.name) return;
  state.network = [...(state.network || []), contact];
  saveState();
  els.networkForm.reset();
  els.networkForm.classList.add("hidden");
  renderNetwork();
}

function deleteNetworkContact(id) {
  state.network = (state.network || []).filter((contact) => contact.id !== id);
  saveState();
  renderNetwork();
}

function getNetworkStatusLabel(status) {
  const labels = {
    zh: {
      "To reach out": "待联系",
      Contacted: "已联系",
      "Follow-up": "待跟进",
      Warm: "关系较热",
      Archived: "已归档"
    },
    en: {
      "To reach out": "To reach out",
      Contacted: "Contacted",
      "Follow-up": "Follow-up",
      Warm: "Warm",
      Archived: "Archived"
    }
  };
  return labels[getLanguage()]?.[status] || status || "-";
}

function networkStatusWeight(status) {
  return {
    "Follow-up": 0,
    "To reach out": 1,
    Contacted: 2,
    Warm: 3,
    Archived: 4
  }[status] ?? 5;
}

function handleProblemSearchInput() {
  if (problemSearchComposing) return;
  selectedProblemDetailId = "";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (normalizeSearchQuery(els.problemSearch?.value)) problemViewMode = "all";
  scheduleProblemSearchRender();
}

function handleProblemSearchKeydown(event) {
  if (event.key !== "Enter") return;
  const query = normalizeSearchQuery(els.problemSearch?.value);
  if (!query) return;
  event.preventDefault();
  cancelProblemSearchRender();
  const firstMatch = getProblemBrowserMatches({ forceAllView: true })[0];
  if (firstMatch) openProblemDetail(firstMatch.id);
}

function scheduleProblemSearchRender() {
  if (problemSearchTimer) window.clearTimeout(problemSearchTimer);
  problemSearchTimer = window.setTimeout(() => {
    problemSearchTimer = 0;
    renderProblems({ resultsOnly: true });
  }, PROBLEM_SEARCH_DEBOUNCE_MS);
}

function cancelProblemSearchRender() {
  if (!problemSearchTimer) return;
  window.clearTimeout(problemSearchTimer);
  problemSearchTimer = 0;
}

function getProblemTagSearchText(tags = []) {
  return (Array.isArray(tags) ? tags : [])
    .flatMap((tag) => {
      const label = problemTagLabels[String(tag)] || {};
      return [tag, label.zh, label.en];
    })
    .filter(Boolean)
    .join(" ");
}

function getProblemSearchRecord(problem) {
  const cacheKey = String(problem?.id || "");
  const cached = cacheKey ? problemSearchRecordCache.get(cacheKey) : null;
  if (cached?.source === problem) return cached;

  const companies = getProblemCompanies(problem);
  const companyText = companies.map((company) => getCompanyAliases(company).join(" ")).join(" ");
  const tagText = getProblemTagSearchText(problem.tags);
  const titleEn = getProblemDisplayTitle(problem, true);
  const titleZh = getProblemDisplayTitle(problem, false);
  const titleText = normalizeSearchFields([titleEn, titleZh, problem.titleEn, problem.titleZh]);
  const promptText = normalizeSearchFields([problem.promptEn, problem.promptZh]);
  const metaText = normalizeSearchFields([
    problem.category,
    problem.difficulty,
    problem.source,
    problem.sourceType,
    problem.bookSlug,
    problem.bookName,
    companyText,
    tagText,
    Array.isArray(problem.tags) ? problem.tags.join(" ") : ""
  ]);
  const searchText = normalizeSearchFields([
    titleText,
    promptText,
    problem.answer,
    problem.answerEn,
    problem.answerZh,
    problem.explanation,
    problem.explanationEn,
    problem.explanationZh,
    metaText
  ]);
  const record = {
    source: problem,
    searchText,
    titleText,
    promptText,
    metaText,
    titleEn,
    titleZh: titleZh || titleEn
  };
  if (cacheKey) problemSearchRecordCache.set(cacheKey, record);
  return record;
}

function getProblemSearchFields(problem) {
  const searchRecord = getProblemSearchRecord(problem);
  return [searchRecord.searchText];
}

function scoreProblemSearchRecord(searchRecord, normalizedQuery) {
  const query = normalizeSearchQuery(normalizedQuery);
  if (!query) return 20;
  const tokens = query.split(/\s+/).filter(Boolean);

  if (searchRecord.titleText === query) return 0;
  if (searchRecord.titleText.includes(query)) return 1;
  if (tokens.every((token) => searchRecord.titleText.includes(token))) return 2;
  if (searchRecord.promptText.includes(query)) return 5;
  if (tokens.every((token) => searchRecord.promptText.includes(token))) return 7;
  if (tokens.every((token) => searchRecord.metaText.includes(token))) return 10;
  return 20;
}

function scoreProblemSearchMatch(problem, normalizedQuery) {
  return scoreProblemSearchRecord(getProblemSearchRecord(problem), normalizedQuery);
}

function getProblemBrowserMatches(options = {}) {
  const query = normalizeSearchQuery(els.problemSearch?.value || "");
  const forceAllView = Boolean(options.forceAllView);
  let problems = state.problems
    .filter(isCatalogProblem)
    .filter((problem) => problemMatchesSource(problem, problemSourceFilter))
    .filter((problem) => problemMatchesCompany(problem, problemCompanyFilter))
    .filter((problem) => problemMatchesTheme(problem, problemThemeFilter))
    .filter((problem) => problemMatchesDifficulty(problem, problemDifficultyFilter));

  if (query) {
    const isEn = getLanguage() === "en";
    problems = problems
      .map((problem) => ({ problem, searchRecord: getProblemSearchRecord(problem) }))
      .filter(({ searchRecord }) => matchesNormalizedText(searchRecord.searchText, query))
      .sort((a, b) => (
        scoreProblemSearchRecord(a.searchRecord, query) - scoreProblemSearchRecord(b.searchRecord, query)
        || (isEn ? a.searchRecord.titleEn : a.searchRecord.titleZh).localeCompare(
          isEn ? b.searchRecord.titleEn : b.searchRecord.titleZh,
          getLocale()
        )
      ))
      .map(({ problem }) => problem);
  }

  if (!forceAllView && problemViewMode === "saved") {
    problems = problems.filter((problem) => getProblemPersonalState(problem.id).favorite);
  }
  return problems;
}

function openProblemFromSearch(problemId) {
  selectedProblemDetailId = "";
  problemViewMode = "all";
  problemCompanyFilter = "all";
  problemSourceFilter = "all";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (els.problemSearch) els.problemSearch.value = "";
  renderProblems();
  window.setTimeout(() => openProblemDetail(problemId), 40);
}

function renderProblems(options = {}) {
  cancelProblemSearchRender();
  const resultsOnly = Boolean(options.resultsOnly);
  renderProblemViewTabs();
  if (!resultsOnly) {
    renderLeetcodeHot100();
    const allCatalogProblems = state.problems.filter(isCatalogProblem);
    const sourceCatalogProblems = allCatalogProblems.filter((problem) => problemMatchesSource(problem, problemSourceFilter));
    renderProblemCompanyPanel(sourceCatalogProblems);
    const scopedCatalogProblems = sourceCatalogProblems.filter((problem) => problemMatchesCompany(problem, problemCompanyFilter));
    renderProblemThemeFilter(scopedCatalogProblems);
    renderProblemDifficultyFilter(scopedCatalogProblems);
    renderProblemCompletionDashboard(scopedCatalogProblems);
  }
  if (selectedProblemDetailId) {
    const selected = state.problems.find((item) => item.id === selectedProblemDetailId && isCatalogProblem(item));
    if (selected) {
      els.problemList.classList.add("hidden");
      els.loadMoreProblemsBtn.classList.add("hidden");
      els.problemRanking.classList.add("hidden");
      els.problemDetail.classList.remove("hidden");
      renderProblemDetail(selected);
      return;
    }
    selectedProblemDetailId = "";
  }
  els.problemDetail.classList.add("hidden");
  const isEn = getLanguage() === "en";
  let problems = getProblemBrowserMatches();

  if (problemViewMode === "ranking") {
    els.problemList.classList.add("hidden");
    els.loadMoreProblemsBtn.classList.add("hidden");
    els.problemRanking.classList.remove("hidden");
    renderProblemRanking(problems);
    return;
  }

  els.problemRanking.classList.add("hidden");
  els.problemList.classList.remove("hidden");
  els.problemList.innerHTML = "";
  if (problemViewMode === "saved") {
    problems = problems.filter((problem) => getProblemPersonalState(problem.id).favorite);
  }

  if (!problems.length) {
    els.loadMoreProblemsBtn.classList.add("hidden");
    els.problemList.appendChild(emptyBlock(problemViewMode === "saved"
      ? (isEn ? "No saved problems yet. Add any problem to your private review list." : "收藏本还没有题目。你可以把任意题目加入自己的复习本。")
      : t("problemEmpty")));
    return;
  }

  const visibleProblems = problems.slice(0, problemVisibleCount);
  visibleProblems.forEach((problem) => {
    const titleText = getProblemDisplayTitle(problem, isEn);
    const promptText = getProblemExcerptText(problem, isEn);
    const card = document.createElement("article");
    card.className = "problem-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${t("openProblem")}: ${titleText}`);
    card.addEventListener("click", () => openProblemDetail(problem.id));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openProblemDetail(problem.id);
    });

    const title = document.createElement("h3");
    title.textContent = titleText;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    const personal = getProblemPersonalState(problem.id);
    const social = getProblemSocial(problem.id);
    const lastScore = personal.lastScore;
    if (problem.bookName) addProblemTag(meta, problem.bookName, "source");
    getProblemCompanies(problem).slice(0, 2).forEach((company) => addProblemTag(meta, company.name, "company"));
    addProblemTag(meta, formatCategoryLabel(problem.category), "topic");
    addProblemTag(meta, problem.difficulty, `difficulty ${difficultyClass(problem.difficulty)}`);
    problem.tags
      .filter((tag) => !isHiddenProblemTag(tag) && cleanProblemTagValue(tag) !== cleanProblemTagValue(problem.bookName))
      .slice(0, 2)
      .forEach((tag) => addProblemTag(meta, formatProblemTag(tag), "skill"));
    if (lastScore != null && Number.isFinite(Number(lastScore))) {
      addProblemTag(meta, `${t("lastScore")} ${Math.round(Number(lastScore))}/100`, "score");
    }

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    renderRichText(prompt, formatProblemExcerpt(promptText));

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const metrics = document.createElement("div");
    metrics.className = "problem-card-metrics";
    metrics.append(
      createProblemMetric("heart", social.likeCount),
      createProblemMetric("message-square", social.commentCount)
    );
    const save = document.createElement("button");
    save.type = "button";
    save.className = `problem-save-button${personal.favorite ? " active" : ""}`;
    save.title = personal.favorite ? t("removeSaved") : t("saveForReview");
    save.setAttribute("aria-label", save.title);
    save.innerHTML = `<i data-lucide="bookmark${personal.favorite ? "-check" : ""}"></i>`;
    save.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleProblemSaved(problem.id);
    });
    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = `problem-complete-button${personal.completed ? " active" : ""}`;
    complete.title = personal.completed
      ? (isEn ? "Mark unfinished" : "标记为未完成")
      : (isEn ? "Mark completed" : "标记完成");
    complete.setAttribute("aria-label", complete.title);
    complete.innerHTML = `<i data-lucide="${personal.completed ? "check-circle-2" : "circle"}"></i>`;
    complete.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleProblemCompleted(problem.id);
    });
    const open = document.createElement("span");
    open.className = "problem-card-open";
    open.innerHTML = `${t("viewFullProblem")} <i data-lucide="chevron-right"></i>`;
    footer.append(metrics, complete, save, open);

    card.append(title, meta, prompt, footer);
    els.problemList.appendChild(card);
  });
  const hiddenCount = problems.length - visibleProblems.length;
  els.loadMoreProblemsBtn.classList.toggle("hidden", hiddenCount <= 0);
  if (hiddenCount > 0) {
    const label = getLanguage() === "en"
      ? `Load more problems (${hiddenCount} remaining)`
      : `加载更多题目（剩余 ${hiddenCount}）`;
    els.loadMoreProblemsBtn.innerHTML = `<i data-lucide="chevrons-down"></i> ${label}`;
  }
  scheduleMathTypeset(els.problemList);
  refreshIcons();
}

function renderProblemCompanyPanel(problems = getCatalogProblems()) {
  if (!els.problemCompanyList) return;
  const isEn = getLanguage() === "en";
  const entries = quantCompanyDefs
    .map((company) => ({
      company,
      stats: getCompanyProblemStats(company, problems)
    }))
    .filter((entry) => entry.stats.total > 0)
    .sort((left, right) => (
      companyTierWeight(left.company.tier) - companyTierWeight(right.company.tier)
      || right.stats.total - left.stats.total
      || left.company.name.localeCompare(right.company.name)
    ));

  if (els.problemCompanyTitle) els.problemCompanyTitle.textContent = isEn ? "Prepare by Company" : "按公司刷题";
  if (els.problemCompanySummary) {
    const tagged = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
    els.problemCompanySummary.textContent = isEn
      ? `${entries.length} firms · ${tagged} tagged questions from real interview sources`
      : `${entries.length} 家公司 · ${tagged} 道真实题源标注题`;
  }
  if (els.problemCompanyClearBtn) {
    els.problemCompanyClearBtn.classList.toggle("hidden", problemCompanyFilter === "all");
    els.problemCompanyClearBtn.innerHTML = `<i data-lucide="rotate-ccw"></i>${escapeHtml(t("allCompanies"))}`;
  }

  els.problemCompanyList.innerHTML = "";
  entries.forEach(({ company, stats }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `problem-company-card${problemCompanyFilter === company.slug ? " active" : ""}`;
    card.dataset.problemCompany = company.slug;
    card.style.setProperty("--company-color", company.color);
    card.style.setProperty("--company-accent", company.accent);
    card.setAttribute("aria-pressed", String(problemCompanyFilter === company.slug));

    const mark = createCompanyMark(company, "small");
    const main = document.createElement("span");
    main.className = "problem-company-main";
    main.innerHTML = `
      <strong>${escapeHtml(company.name)}</strong>
      <small>Tier ${escapeHtml(company.tier)} · ${escapeHtml(company.focus.slice(0, 2).join(" / "))}</small>
    `;
    const count = document.createElement("span");
    count.className = "problem-company-count";
    count.innerHTML = `
      <b>${escapeHtml(String(stats.total))}</b>
      <small>${escapeHtml(t("companyQuestions"))}</small>
    `;
    const progress = document.createElement("span");
    progress.className = "problem-company-progress";
    progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

    card.append(mark, main, count, progress);
    els.problemCompanyList.appendChild(card);
  });
  refreshIcons();
}

function renderLeetcodeHot100() {
  if (!els.leetcodeHotList) return;
  const isEn = getLanguage() === "en";
  const done = new Set(normalizeLeetcodeHot100Done(state.leetcodeHot100Done));
  const total = leetcodeHot100.length || 100;
  const doneCount = done.size;
  if (els.leetcodeHotTitle) els.leetcodeHotTitle.textContent = t("leetcodeHotTitle");
  if (els.leetcodeHotSummary) els.leetcodeHotSummary.textContent = t("leetcodeHotSummary");
  if (els.leetcodeHotProgressLabel) els.leetcodeHotProgressLabel.textContent = t("leetcodeHotProgressLabel");
  if (els.leetcodeHotProgressText) els.leetcodeHotProgressText.textContent = `${doneCount} / ${total}`;
  if (els.leetcodeHotProgressFill) els.leetcodeHotProgressFill.style.width = `${Math.round((doneCount / Math.max(total, 1)) * 100)}%`;
  const panel = els.leetcodeHotList.closest(".leetcode-hot-panel");
  panel?.classList.toggle("is-expanded", leetcodeHotExpanded);
  if (els.leetcodeHotToggleBtn) {
    els.leetcodeHotToggleBtn.setAttribute("aria-expanded", String(leetcodeHotExpanded));
    els.leetcodeHotToggleBtn.innerHTML = `<i data-lucide="${leetcodeHotExpanded ? "chevron-up" : "list-checks"}"></i>${escapeHtml(t(leetcodeHotExpanded ? "leetcodeHotCollapse" : "leetcodeHotManage"))}`;
  }
  if (els.leetcodeHotPlanLink) {
    els.leetcodeHotPlanLink.title = t("leetcodeHotOpen");
    els.leetcodeHotPlanLink.setAttribute("aria-label", t("leetcodeHotOpen"));
    els.leetcodeHotPlanLink.innerHTML = '<i data-lucide="external-link"></i>';
  }
  els.leetcodeHotList.innerHTML = "";
  els.leetcodeHotList.classList.toggle("hidden", !leetcodeHotExpanded);
  if (!leetcodeHotExpanded) {
    refreshIcons();
    return;
  }
  if (!leetcodeHot100.length) {
    els.leetcodeHotList.appendChild(emptyBlock(isEn ? "Hot 100 data is not available." : "Hot 100 数据暂不可用。"));
    return;
  }
  leetcodeHot100.forEach((item) => {
    const isDone = done.has(item.id);
    const card = document.createElement("article");
    card.className = `leetcode-hot-item${isDone ? " is-done" : ""}`;
    card.innerHTML = `
      <button class="leetcode-hot-done" type="button" data-leetcode-hot-toggle="${escapeHtml(item.id)}" aria-label="${escapeHtml(isDone ? t("leetcodeHotUndo") : t("leetcodeHotMarkDone"))}">
        <i data-lucide="${isDone ? "check" : "circle"}"></i>
      </button>
      <div class="leetcode-hot-main">
        <strong>${escapeHtml(item.number)}. ${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.topic)} · ${escapeHtml(item.difficulty)}${isDone ? ` · ${escapeHtml(t("leetcodeHotDone"))}` : ""}</span>
      </div>
      <a class="leetcode-hot-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${t("leetcodeHotOpen")}: ${item.title}`)}">
        <i data-lucide="external-link"></i>
      </a>
    `;
    els.leetcodeHotList.appendChild(card);
  });
  els.leetcodeHotList.querySelectorAll("[data-leetcode-hot-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleLeetcodeHotDone(button.dataset.leetcodeHotToggle));
  });
  refreshIcons();
}

function toggleLeetcodeHotDone(problemId) {
  const valid = new Set(leetcodeHot100.map((item) => item.id));
  if (!valid.has(problemId)) return;
  const done = new Set(normalizeLeetcodeHot100Done(state.leetcodeHot100Done));
  if (done.has(problemId)) done.delete(problemId);
  else done.add(problemId);
  state.leetcodeHot100Done = [...done];
  state.skills.leetcode = Math.max(Number(state.skills.leetcode || 0), Math.min(100, state.leetcodeHot100Done.length));
  saveState();
  renderLeetcodeHot100();
  renderSummary();
  renderProblemCompletionDashboard();
  renderSkills();
  drawRadar();
}

function renderProblemViewTabs() {
  document.querySelectorAll("[data-problem-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.problemView === problemViewMode);
  });
  const sourceActive = problemSourceFilter && problemSourceFilter !== "all";
  if (els.problemSourceFilterClearBtn) {
    els.problemSourceFilterClearBtn.classList.toggle("hidden", !sourceActive);
    els.problemSourceFilterClearBtn.innerHTML = `<i data-lucide="rotate-ccw"></i>${escapeHtml(getLanguage() === "en" ? "All sources" : "全部题源")}`;
  }
  if (els.problemInteractionStatus) {
    const sourceText = sourceActive
      ? (getLanguage() === "en"
        ? `Source: ${getLibrarySourceLabel(problemSourceFilter)}`
        : `题源：${getLibrarySourceLabel(problemSourceFilter)}`)
      : "";
    els.problemInteractionStatus.textContent = [sourceText, problemSocialNotice].filter(Boolean).join(" · ");
  }
}

function clearProblemLookupCaches() {
  problemSearchRecordCache.clear();
  problemCompanyCache.clear();
  clearProblemStateCache();
}

function clearProblemStateCache() {
  problemStateCacheSource = null;
  problemStateCache = null;
}

function getProblemStateCache() {
  const source = state.problemStates || [];
  if (problemStateCache && problemStateCacheSource === source) return problemStateCache;
  problemStateCacheSource = source;
  problemStateCache = new Map(source.map((item) => [item.problemId, item]));
  return problemStateCache;
}

function getProblemPersonalState(problemId) {
  return getProblemStateCache().get(problemId) || normalizeProblemState({ problemId });
}

function toggleProblemSaved(problemId) {
  const isSaved = getProblemPersonalState(problemId).favorite;
  updateProblemState(problemId, {
    favorite: !isSaved,
    lastFavoriteAt: isSaved ? "" : new Date().toISOString()
  });
  saveState();
  renderProblems();
}

function toggleProblemCompleted(problemId) {
  const isCompleted = getProblemPersonalState(problemId).completed;
  updateProblemState(problemId, {
    completed: !isCompleted,
    completedAt: isCompleted ? "" : new Date().toISOString()
  });
  saveState();
  renderSummary();
  renderSkills();
  renderProblems();
}

function createProblemMetric(icon, count) {
  const metric = document.createElement("span");
  metric.className = "problem-card-metric";
  metric.innerHTML = `<i data-lucide="${icon}"></i><span>${Number(count || 0)}</span>`;
  return metric;
}

function getProblemPopularity(problemId) {
  const social = getProblemSocial(problemId);
  return social.likeCount * 3 + social.commentCount * 2;
}

function renderProblemRanking(problems) {
  els.problemRankingList.innerHTML = "";
  const ranked = [...problems].sort((left, right) => {
    const socialDiff = getProblemPopularity(right.id) - getProblemPopularity(left.id);
    if (socialDiff) return socialDiff;
    const likeDiff = getProblemSocial(right.id).likeCount - getProblemSocial(left.id).likeCount;
    if (likeDiff) return likeDiff;
    return getProblemDisplayTitle(left).localeCompare(getProblemDisplayTitle(right), getLocale());
  }).slice(0, 50);
  if (!ranked.length) {
    els.problemRankingList.appendChild(emptyBlock(t("problemEmpty")));
    return;
  }
  ranked.forEach((problem, index) => {
    const social = getProblemSocial(problem.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "problem-ranking-row";
    row.addEventListener("click", () => openProblemDetail(problem.id));
    const rank = document.createElement("strong");
    rank.className = "problem-ranking-position";
    rank.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("span");
    copy.className = "problem-ranking-copy";
    copy.innerHTML = `<strong></strong><small></small>`;
    copy.querySelector("strong").textContent = getProblemDisplayTitle(problem);
    copy.querySelector("small").textContent = `${formatCategoryLabel(problem.category)} · ${problem.difficulty}`;
    const stats = document.createElement("span");
    stats.className = "problem-ranking-stats";
    stats.innerHTML = `<strong>${getProblemPopularity(problem.id)}</strong><small>${t("popularity")}</small><span><i data-lucide="heart"></i> ${social.likeCount}</span><span><i data-lucide="message-square"></i> ${social.commentCount}</span>`;
    row.append(rank, copy, stats);
    els.problemRankingList.appendChild(row);
  });
  refreshIcons();
}

function formatProblemExcerpt(text) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (value.length <= 560) return value;
  const slice = value.slice(0, 560);
  const stops = ["。", ".", "？", "?", "；", ";", "，", ",", " "]
    .map((mark) => slice.lastIndexOf(mark))
    .filter((index) => index > 220);
  const boundary = stops.length ? Math.max(...stops) : 560;
  return trimDanglingMath(slice.slice(0, boundary).trim()) + " ...";
}

function trimDanglingMath(value) {
  let text = String(value || "");
  [
    ["\\[", "\\]"],
    ["\\(", "\\)"]
  ].forEach(([open, close]) => {
    const openIndex = text.lastIndexOf(open);
    const closeIndex = text.lastIndexOf(close);
    if (openIndex > closeIndex) text = text.slice(0, openIndex).trim();
  });

  const dollarPositions = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "$" && text[index - 1] !== "\\") dollarPositions.push(index);
  }
  if (dollarPositions.length % 2 === 1) {
    text = text.slice(0, dollarPositions[dollarPositions.length - 1]).trim();
  }
  return text;
}

function getProblemDisplayTitle(problem, isEn = getLanguage() === "en") {
  if (!isEn) return problem.titleZh || problem.titleEn || t("problemTitle");
  if (problem.titleEn) return problem.titleEn;
  const match = String(problem.id || "").match(/(\d+)$/);
  const number = match ? match[1].padStart(3, "0") : "";
  const categoryLabel = formatCategoryLabel(problem.category).replace(/[/&]/g, " ");
  return number ? `${categoryLabel} Challenge ${number}` : t("problemTitle");
}

function getLocalizedProblemField(problem, field, isEn = getLanguage() === "en") {
  const primary = isEn ? `${field}En` : `${field}Zh`;
  const secondary = isEn ? `${field}Zh` : `${field}En`;
  return String(problem?.[primary] || problem?.[field] || problem?.[secondary] || "").trim();
}

function getProblemExcerptText(problem, isEn = getLanguage() === "en") {
  if (!isEn) return problem.promptZh || problem.promptEn || t("noPrompt");
  return problem.promptEn || t("untranslatedProblemFallback");
}

function addProblemTag(container, label, variant = "") {
  if (!label) return;
  const pill = document.createElement("span");
  pill.className = `problem-tag ${variant}`.trim();
  pill.textContent = label;
  container.appendChild(pill);
}

function difficultyClass(difficulty = "") {
  const normalized = String(difficulty).trim().toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "hard") return "hard";
  return "medium";
}

function formatProblemTag(tag) {
  if (isHiddenProblemTag(tag)) return "";
  const label = problemTagLabels[String(tag)] || {};
  return getLanguage() === "en" ? label.en || tag : label.zh || tag;
}

function isHiddenProblemTag(tag) {
  const value = String(tag || "").trim();
  return value === "question-bank" || isLegacyCatalogMarker(value);
}

function cleanProblemTagValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isLegacyCatalogMarker(value) {
  const legacy = [["pu", "rple"].join(""), "book"].join("-");
  return String(value || "").includes(legacy);
}

function isDisabledProblemId(problemId) {
  const id = String(problemId || "");
  return id.startsWith("catalog-problem-") || id.startsWith("catalog-exercise-") || isLegacyCatalogMarker(id);
}

function isDisabledProblemSource(problem) {
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const bookName = String(problem?.bookName || "").trim();
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  return isDisabledProblemId(problem?.id)
    || disabledProblemSources.has(source)
    || disabledProblemSources.has(sourceType)
    || disabledProblemSources.has(bookSlug)
    || disabledProblemBookNames.has(bookName)
    || tags.some((tag) => disabledProblemBookNames.has(String(tag).trim()) || disabledProblemSources.has(String(tag).trim()));
}

function isCatalogProblem(problem) {
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const id = String(problem?.id || "");
  return source === "question-bank"
    || sourceType === "book"
    || sourceType === "question-bank"
    || Boolean(bookSlug)
    || isLegacyCatalogMarker(source)
    || id.startsWith("catalog-")
    || isLegacyCatalogMarker(id)
    || tags.includes("question-bank")
    || tags.some(isLegacyCatalogMarker);
}

function pruneProblemCatalog() {
  const catalogItems = (state.problems || []).filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem));
  const problemStates = (state.problemStates || []).filter((problemState) => !isDisabledProblemId(problemState.problemId));
  if (catalogItems.length === state.problems.length && problemStates.length === (state.problemStates || []).length) return;
  state.problems = catalogItems;
  state.problemStates = problemStates;
  clearProblemLookupCaches();
  saveState({ sync: false, checkIn: false });
}

function openProblemDetail(problemId) {
  const problem = state.problems.find((item) => item.id === problemId && isCatalogProblem(item));
  if (!problem) return;
  selectedProblemDetailId = problemId;
  problemSocialNotice = "";
  els.problemList.classList.add("hidden");
  els.problemRanking.classList.add("hidden");
  els.problemDetail.classList.remove("hidden");
  renderProblemDetail(problem);
  refreshProblemSocial(problemId);
  const stickyOffset = (document.querySelector(".topbar")?.getBoundingClientRect().height || 0) + 14;
  const detailTop = els.problemDetail.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, detailTop), behavior: "smooth" });
}

function returnToProblemList() {
  selectedProblemDetailId = "";
  els.problemDetail.classList.add("hidden");
  els.problemList.classList.remove("hidden");
  renderProblems();
}

function renderProblemDetail(problem) {
  els.problemDetail.innerHTML = "";
  const isEn = getLanguage() === "en";

  const top = document.createElement("div");
  top.className = "problem-detail-top";

  const back = document.createElement("button");
  back.className = "secondary-button";
  back.type = "button";
  back.innerHTML = `<i data-lucide="arrow-left"></i> ${t("backToProblems")}`;
  back.addEventListener("click", returnToProblemList);

  const practice = document.createElement("button");
  practice.className = "primary-button";
  practice.type = "button";
  practice.innerHTML = `<i data-lucide="messages-square"></i> ${t("useForMock")}`;
  practice.addEventListener("click", () => selectProblemForInterview(problem.id));

  const saved = getProblemPersonalState(problem.id).favorite;
  const completed = getProblemPersonalState(problem.id).completed;
  const complete = document.createElement("button");
  complete.className = `secondary-button problem-detail-complete${completed ? " active" : ""}`;
  complete.type = "button";
  complete.innerHTML = `<i data-lucide="${completed ? "check-circle-2" : "circle"}"></i> ${completed ? (isEn ? "Completed" : "已完成") : (isEn ? "Mark completed" : "标记完成")}`;
  complete.addEventListener("click", () => toggleProblemCompleted(problem.id));

  const save = document.createElement("button");
  save.className = `secondary-button problem-detail-save${saved ? " active" : ""}`;
  save.type = "button";
  save.innerHTML = `<i data-lucide="bookmark${saved ? "-check" : ""}"></i> ${saved ? t("savedForReview") : t("saveForReview")}`;
  save.addEventListener("click", () => toggleProblemSaved(problem.id));

  const actions = document.createElement("div");
  actions.className = "problem-detail-actions";
  actions.append(complete, save, practice);
  top.append(back, actions);

  const title = document.createElement("h2");
  const titleZh = String(problem.titleZh || "").trim();
  const titleEn = String(problem.titleEn || "").trim();
  title.textContent = isEn
    ? getProblemDisplayTitle(problem, true)
    : titleZh && titleEn && cleanProblemTagValue(titleZh) !== cleanProblemTagValue(titleEn)
    ? `${titleZh} / ${titleEn}`
    : titleZh || titleEn;

  const meta = document.createElement("div");
  meta.className = "problem-meta";
  [
    formatCategoryLabel(problem.category),
    problem.difficulty,
    ...problem.tags.slice(0, 5)
  ].forEach((label) => {
    if (!label) return;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = formatProblemTag(label);
    meta.appendChild(pill);
  });

  const questionContent = [
    (isEn ? problem.promptEn || problem.promptZh : problem.promptZh || problem.promptEn) || t("noPrompt"),
    getProblemMediaMarkdown(problem, "prompt")
  ].filter(Boolean).join("\n\n");
  const answerContent = getLocalizedProblemField(problem, "answer", isEn) || t("noAnswer");
  const explanationContent = [
    getLocalizedProblemField(problem, "explanation", isEn) || t("noExplanation"),
    getProblemMediaMarkdown(problem, "answer")
  ].filter(Boolean).join("\n\n");

  els.problemDetail.append(
    top,
    title,
    meta,
    createProblemDetailBlock(t("problemQuestion"), questionContent),
    createProblemDetailBlock(t("problemAnswer"), answerContent),
    createProblemDetailBlock(t("problemExplanation"), explanationContent),
    createProblemSocialPanel(problem)
  );
  scheduleMathTypeset(els.problemDetail);
  refreshIcons();
}

function createProblemDetailBlock(title, content) {
  const block = document.createElement("section");
  block.className = "problem-detail-block";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement("div");
  body.className = "problem-detail-body";
  renderRichText(body, content);
  block.append(heading, body);
  return block;
}

function createProblemSocialPanel(problem) {
  const social = getProblemSocial(problem.id);
  const panel = document.createElement("section");
  panel.className = "problem-social-panel";

  const header = document.createElement("div");
  header.className = "problem-social-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = t("problemDiscussion");
  const hint = document.createElement("p");
  hint.textContent = t("problemDiscussionHint");
  heading.append(title, hint);

  const like = document.createElement("button");
  like.type = "button";
  like.className = `problem-like-button${social.liked ? " active" : ""}`;
  like.innerHTML = `<i data-lucide="heart"></i><span>${social.liked ? t("unlike") : t("like")}</span><strong>${social.likeCount}</strong>`;
  like.addEventListener("click", () => toggleProblemLike(problem.id));
  header.append(heading, like);

  const notice = document.createElement("p");
  notice.className = `problem-social-notice${problemSocialNotice ? "" : " hidden"}`;
  notice.textContent = problemSocialNotice;

  const comments = document.createElement("div");
  comments.className = "problem-comments";
  if (!social.comments.length) {
    comments.appendChild(emptyBlock(t("problemCommentEmpty")));
  } else {
    social.comments.forEach((comment) => comments.appendChild(createProblemComment(problem.id, comment)));
  }

  const form = document.createElement("form");
  form.className = "problem-comment-form";
  const input = document.createElement("textarea");
  input.rows = 3;
  input.maxLength = 1200;
  input.placeholder = t("problemCommentPlaceholder");
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "primary-button";
  submit.innerHTML = `<i data-lucide="send"></i> ${t("problemCommentPost")}`;
  form.append(input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    postProblemComment(problem.id, input.value);
  });

  panel.append(header, notice, comments, form);
  return panel;
}

function createProblemComment(problemId, comment) {
  const card = document.createElement("article");
  card.className = "problem-comment";
  const top = document.createElement("div");
  const author = document.createElement("strong");
  author.textContent = comment.author || "Quant";
  const time = document.createElement("time");
  time.textContent = formatDate(comment.createdAt);
  top.append(author, time);
  if (comment.isOwn) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "problem-comment-delete";
    remove.title = t("deleteComment");
    remove.setAttribute("aria-label", remove.title);
    remove.innerHTML = `<i data-lucide="trash-2"></i>`;
    remove.addEventListener("click", () => deleteProblemComment(problemId, comment.id));
    top.append(remove);
  }
  const text = document.createElement("p");
  text.textContent = comment.text;
  card.append(top, text);
  return card;
}

async function toggleProblemLike(problemId) {
  if (!canUseCloud()) {
    problemSocialNotice = t("problemSocialCloudRequired");
    renderProblems();
    return;
  }
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/like`, { method: "POST" });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

async function postProblemComment(problemId, text) {
  const content = String(text || "").trim();
  if (!content) {
    problemSocialNotice = t("problemCommentRequired");
    renderProblems();
    return;
  }
  if (!canUseCloud()) {
    problemSocialNotice = t("problemSocialCloudRequired");
    renderProblems();
    return;
  }
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments`, {
      method: "POST",
      body: { text: content }
    });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

async function deleteProblemComment(problemId, commentId) {
  const message = t("deleteCommentConfirm");
  if (!window.confirm(message) || !canUseCloud()) return;
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE"
    });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

const interviewTypeDefs = {
  oa: {
    label: "Online Assessment",
    categories: ["leetcode", "probabilityExpectation", "statistics", "pandasNumpy", "mentalMath"],
    minutes: 5
  },
  technical: {
    label: "Technical Interview",
    categories: ["leetcode", "pandasNumpy", "probabilityExpectation", "statistics", "machineLearning", "deepLearning", "market", "option"],
    minutes: 8
  },
  behavioral: {
    label: "Behavioral Interview",
    categories: [],
    minutes: 4
  }
};

const interviewModeDefs = {
  practice: {
    labelZh: "训练练习",
    labelEn: "Practice",
    descriptionZh: "即时评分、Hint、参考答案和复盘面板都会开启。",
    descriptionEn: "Immediate scoring, hints, reference answer, and review panel stay on."
  },
  live: {
    labelZh: "真实面试",
    labelEn: "Live mock",
    descriptionZh: "过程中隐藏分数和答案，只通过追问推进，结束后统一反馈。",
    descriptionEn: "Scores and answers stay hidden; follow-ups drive the interview until the final report."
  }
};

const interviewPersonaDefs = {
  friendly: {
    labelZh: "友好引导",
    labelEn: "Friendly",
    prompt: "Patient, warm, and Socratic. Give small footholds without revealing the answer."
  },
  neutral: {
    labelZh: "中性专业",
    labelEn: "Professional",
    prompt: "Concise and professional. Ask precise follow-ups and keep the candidate accountable."
  },
  pressure: {
    labelZh: "高压快节奏",
    labelEn: "Pressure",
    prompt: "Fast-paced and exacting. Challenge vague reasoning, but remain fair and interview-realistic."
  }
};

const interviewDifficultyDefs = {
  easy: { labelZh: "简单", labelEn: "Easy", values: ["Easy"] },
  medium: { labelZh: "中等", labelEn: "Medium", values: ["Medium"] },
  hard: { labelZh: "困难", labelEn: "Hard", values: ["Hard"] },
  adaptive: { labelZh: "自适应", labelEn: "Adaptive", values: [] }
};

const interviewFocusDefs = {
  mixed: {
    labelZh: "混合",
    labelEn: "Mixed",
    categories: ["leetcode", "pandasNumpy", "probabilityExpectation", "statistics", "machineLearning", "deepLearning", "market", "option", "mentalMath"],
    type: "technical"
  },
  probability: {
    labelZh: "概率统计",
    labelEn: "Probability & stats",
    categories: ["probabilityExpectation", "statistics", "mentalMath"],
    type: "technical"
  },
  algorithms: {
    labelZh: "算法",
    labelEn: "Algorithms",
    categories: ["leetcode", "pandasNumpy"],
    type: "oa"
  },
  ml: {
    labelZh: "ML",
    labelEn: "Machine learning",
    categories: ["machineLearning", "deepLearning", "statistics"],
    type: "technical"
  },
  market: {
    labelZh: "市场直觉",
    labelEn: "Trading intuition",
    categories: ["market", "option", "mentalMath"],
    type: "technical"
  },
  marketMaking: {
    labelZh: "做市",
    labelEn: "Market making",
    categories: ["market", "mentalMath", "option"],
    type: "technical"
  },
  behavioral: {
    labelZh: "行为面",
    labelEn: "Behavioral",
    categories: [],
    type: "behavioral"
  },
  resume: {
    labelZh: "简历深挖",
    labelEn: "Resume deep dive",
    categories: [],
    type: "behavioral"
  },
  research: {
    labelZh: "研究项目深挖",
    labelEn: "Research project",
    categories: [],
    type: "behavioral"
  }
};

const interviewOnboardingSteps = ["language", "mode", "focus", "difficulty", "scope", "persona"];

const behavioralInterviewTopics = [
  ["behavioral-impact", "High-impact project story", "高影响力项目经历", "Tell me about a project where you created measurable impact. Use a clear situation, task, action, and result structure.", "讲一个你做出可量化影响的项目经历。请用 Situation、Task、Action、Result 的结构回答。", "impact", "Medium", "leetcode"],
  ["behavioral-conflict", "Disagreement with a teammate", "和队友意见不一致", "Describe a time you disagreed with a teammate or mentor. How did you handle it and what changed afterward?", "讲一次你和队友或 mentor 意见不一致的经历。你如何处理，最后有什么改变？", "teamwork", "Medium", "market"],
  ["behavioral-failure", "Failure and learning", "失败和复盘", "Tell me about a failure or mistake. What did you learn, and how did you change your process?", "讲一次失败或犯错经历。你学到了什么，后来如何改变流程？", "reflection", "Medium", "statistics"],
  ["behavioral-pressure", "Working under pressure", "压力下完成任务", "Describe a time you had to make progress under time pressure or ambiguity.", "讲一次你在时间压力或信息不完整的情况下推进任务的经历。", "pressure", "Medium", "option"],
  ["behavioral-why-quant", "Why quant finance", "为什么选择量化", "Why are you interested in quant finance, and what evidence shows you are prepared for it?", "你为什么想做量化？有哪些经历证明你准备好了？", "motivation", "Easy", "market"],
  ["behavioral-why-firm", "Why this firm", "为什么选择这家公司", "Why are you interested in this firm or desk? Give a specific reason beyond prestige.", "你为什么对这家公司或这个 desk 感兴趣？请给出具体原因，而不是只说名气。", "motivation", "Easy", "market"],
  ["behavioral-leadership", "Leading without authority", "无职权领导", "Tell me about a time you led a group without formal authority.", "讲一次你在没有正式职权时推动团队前进的经历。", "leadership", "Medium", "leetcode"],
  ["behavioral-fast-learning", "Learning a hard topic fast", "快速学习陌生领域", "Describe a time you had to learn a difficult technical topic quickly.", "讲一次你必须快速掌握一个困难技术主题的经历。", "learning", "Medium", "machineLearning"],
  ["behavioral-ambiguous-data", "Ambiguous data decision", "数据不完整时做判断", "Tell me about a time you made a decision with incomplete or noisy data.", "讲一次你在数据不完整或噪声很大时做判断的经历。", "judgment", "Hard", "statistics"],
  ["behavioral-ethical-tradeoff", "Ethical tradeoff", "伦理或合规取舍", "Describe a time you faced an ethical, fairness, or compliance tradeoff.", "讲一次你面对伦理、公平或合规取舍的经历。", "judgment", "Hard", "market"],
  ["behavioral-feedback", "Receiving tough feedback", "接受尖锐反馈", "Tell me about tough feedback you received and what changed afterward.", "讲一次你收到尖锐反馈，以及之后实际改变了什么。", "reflection", "Medium", "statistics"],
  ["behavioral-give-feedback", "Giving difficult feedback", "给别人困难反馈", "Describe a time you had to give difficult feedback to a teammate.", "讲一次你需要给队友困难反馈的经历。", "communication", "Medium", "leetcode"],
  ["behavioral-prioritization", "Prioritizing under constraint", "资源有限时排序", "Tell me about a time you had more work than time. How did you prioritize?", "讲一次任务多于时间时，你如何排序和取舍。", "execution", "Medium", "market"],
  ["behavioral-ownership", "Taking ownership", "主动承担责任", "Describe a time you took ownership of a problem nobody clearly owned.", "讲一次你主动承担一个没人明确负责的问题。", "ownership", "Medium", "leetcode"],
  ["behavioral-missed-deadline", "Missed deadline", "错过截止日期", "Tell me about a time you missed a deadline or almost missed one.", "讲一次你错过或差点错过截止日期的经历。", "execution", "Medium", "statistics"],
  ["behavioral-quality-speed", "Quality versus speed", "质量和速度取舍", "Describe a time you had to trade off speed and rigor.", "讲一次你必须在速度和严谨性之间取舍的经历。", "tradeoff", "Hard", "market"],
  ["behavioral-risk-taking", "Calculated risk", "有计算的冒险", "Tell me about a calculated risk you took. What made it worth taking?", "讲一次你做过的有计算的冒险。为什么值得？", "risk", "Medium", "option"],
  ["behavioral-change-mind", "Changing your mind", "改变观点", "Describe a time evidence made you change your mind.", "讲一次证据让你改变观点的经历。", "humility", "Medium", "statistics"],
  ["behavioral-deep-work", "Deep focus", "深度专注", "Tell me about a period when you needed sustained focus to solve a hard problem.", "讲一段你需要长时间深度专注解决难题的经历。", "execution", "Easy", "leetcode"],
  ["behavioral-simplify", "Simplifying complexity", "把复杂问题讲清楚", "Describe a time you simplified a complex idea for someone else.", "讲一次你把复杂问题解释给别人听的经历。", "communication", "Medium", "machineLearning"],
  ["behavioral-cross-functional", "Working across functions", "跨团队协作", "Tell me about a time you worked with people from a different background or function.", "讲一次你和不同背景或职能的人协作的经历。", "teamwork", "Medium", "market"],
  ["behavioral-mentoring", "Mentoring someone", "辅导他人", "Describe a time you helped someone else improve technically or analytically.", "讲一次你帮助别人提升技术或分析能力的经历。", "leadership", "Easy", "leetcode"],
  ["behavioral-competition", "Competitive pressure", "竞争压力", "Tell me about a time you were in a competitive environment. How did you respond?", "讲一次你处于竞争环境时如何应对。", "pressure", "Medium", "mentalMath"],
  ["behavioral-bug", "Hard-to-find bug", "难定位的问题", "Describe the hardest bug or error you found. How did you isolate it?", "讲一次你定位过的最难 bug 或错误。你如何隔离问题？", "debugging", "Medium", "leetcode"],
  ["behavioral-model-risk", "Model did not work", "模型效果不佳", "Tell me about a model, analysis, or strategy that did not work as expected.", "讲一次模型、分析或策略效果不如预期的经历。", "reflection", "Hard", "machineLearning"],
  ["behavioral-data-quality", "Data quality issue", "数据质量问题", "Describe a time a data quality issue changed your conclusion.", "讲一次数据质量问题改变你结论的经历。", "data", "Hard", "statistics"],
  ["behavioral-independent", "Independent initiative", "独立发起项目", "Tell me about something useful you built or investigated without being asked.", "讲一次你在没人要求的情况下主动做出的有价值项目或研究。", "initiative", "Medium", "leetcode"],
  ["behavioral-resilience", "Resilience after setback", "挫折后的恢复", "Describe a setback and how you recovered operationally, not just emotionally.", "讲一次挫折，以及你如何在行动上恢复，而不只是情绪上恢复。", "resilience", "Medium", "statistics"],
  ["behavioral-detail", "Attention to detail", "细节把关", "Tell me about a time attention to detail materially changed the outcome.", "讲一次细节把关明显改变结果的经历。", "rigor", "Medium", "option"],
  ["behavioral-disagree-senior", "Disagreeing with a senior person", "反对更资深的人", "Describe a time you disagreed with someone more senior than you.", "讲一次你和更资深的人意见不同的经历。", "communication", "Hard", "market"],
  ["behavioral-unclear-goal", "Unclear goal", "目标不清晰", "Tell me about a time the goal was unclear. How did you define success?", "讲一次目标不清晰时，你如何定义成功标准。", "execution", "Medium", "statistics"],
  ["behavioral-scope-cut", "Reducing scope", "削减范围", "Describe a time you reduced scope to ship something useful.", "讲一次你为了交付有用结果而缩小范围的经历。", "execution", "Medium", "leetcode"],
  ["behavioral-research-defense", "Defending a conclusion", "捍卫结论", "Tell me about a time you had to defend an analysis against skeptical questions.", "讲一次你必须面对质疑捍卫分析结论的经历。", "defense", "Hard", "statistics"],
  ["behavioral-help-request", "Asking for help", "主动求助", "Describe a time you asked for help effectively.", "讲一次你有效求助的经历。", "humility", "Easy", "leetcode"],
  ["behavioral-calibration", "Calibrating confidence", "校准信心", "Tell me about a time you were overconfident or underconfident. How did you recalibrate?", "讲一次你过度自信或不够自信，以及你如何校准。", "reflection", "Hard", "statistics"],
  ["behavioral-user-impact", "User or stakeholder impact", "用户或利益相关方影响", "Describe a time you changed your work after understanding a user or stakeholder better.", "讲一次你更理解用户或利益相关方后改变工作方式的经历。", "impact", "Medium", "market"],
  ["behavioral-long-term", "Long-term commitment", "长期投入", "Tell me about a long project where motivation was hard to maintain.", "讲一次长期项目中你如何保持推进。", "resilience", "Medium", "leetcode"],
  ["behavioral-trade-idea", "Market idea communication", "表达交易想法", "Describe a time you explained a market or investment idea clearly.", "讲一次你清晰表达市场或投资想法的经历。", "market", "Medium", "market"],
  ["behavioral-automation", "Automation impact", "自动化带来的影响", "Tell me about a task you automated. What did it save and what new risk did it create?", "讲一次你自动化某个任务。它节省了什么，又带来了什么新风险？", "automation", "Medium", "leetcode"],
  ["behavioral-noisy-feedback", "Conflicting feedback", "反馈相互矛盾", "Describe a time different people gave conflicting feedback. How did you decide what to do?", "讲一次不同人给出矛盾反馈时，你如何决定怎么做。", "judgment", "Hard", "statistics"],
  ["behavioral-team-failure", "Team failure", "团队失败", "Tell me about a team failure. What was your role in the outcome?", "讲一次团队失败。你在结果中承担什么责任？", "ownership", "Hard", "market"],
  ["behavioral-culture-add", "Culture add", "你能带来什么文化增量", "What would teammates learn from working with you?", "队友和你共事会从你身上学到什么？", "self-awareness", "Easy", "leetcode"],
  ["behavioral-last-minute", "Last-minute change", "最后一刻变化", "Describe a time requirements changed late. What did you do first?", "讲一次需求在最后阶段改变时，你第一步做了什么。", "adaptability", "Medium", "market"],
  ["behavioral-technical-debt", "Technical debt", "技术债", "Tell me about a time you chose to accept or repay technical debt.", "讲一次你选择接受或偿还技术债的经历。", "tradeoff", "Hard", "leetcode"],
  ["behavioral-bias", "Bias in your own analysis", "发现自己的分析偏差", "Describe a time you discovered bias in your own analysis.", "讲一次你发现自己分析中存在偏差的经历。", "rigor", "Hard", "statistics"],
  ["behavioral-low-data", "Small sample decision", "小样本决策", "Tell me about a time you had to reason from a small sample.", "讲一次你必须基于小样本进行推理的经历。", "judgment", "Medium", "statistics"],
  ["behavioral-presentation", "High-stakes presentation", "高压汇报", "Describe a high-stakes presentation or demo. How did you prepare?", "讲一次高压汇报或 demo。你如何准备？", "communication", "Medium", "machineLearning"],
  ["behavioral-repetitive-task", "Staying sharp on repetitive work", "重复任务中保持准确", "Tell me about a repetitive task where accuracy mattered.", "讲一次重复性任务中准确性很重要的经历。", "rigor", "Easy", "mentalMath"],
  ["behavioral-open-ended", "Open-ended problem", "开放问题", "Describe the most open-ended problem you have worked on.", "讲一次你做过的最开放的问题。", "ambiguity", "Hard", "machineLearning"],
  ["behavioral-values", "Values under pressure", "压力下坚持原则", "Tell me about a time pressure tested one of your values.", "讲一次压力考验你某个原则的经历。", "values", "Hard", "market"],
  ["behavioral-interviewer-question", "Question for interviewer", "反问面试官", "What is one thoughtful question you would ask a quant interviewer at the end?", "如果面试最后让你反问，你会问一个什么有含金量的问题？", "closing", "Easy", "market"],
  ["behavioral-weakness", "Current weakness", "当前短板", "What is one weakness you are actively working on, and what evidence shows progress?", "你正在改进的一个短板是什么？有什么证据说明你在进步？", "self-awareness", "Medium", "statistics"]
];

const behavioralInterviewProblems = behavioralInterviewTopics.map(([id, titleEn, titleZh, promptEn, promptZh, tag, difficulty, category]) => ({
  id,
  titleEn,
  titleZh,
  category,
  difficulty,
  tags: ["behavioral", "STAR", tag],
  promptEn,
  promptZh,
  answer: "Use a concrete STAR structure. Name your role, quantify the situation when possible, explain the tradeoff, and end with learning.",
  explanation: "Strong behavioral answers are specific, personally owned, evidence-based, and reflective without sounding rehearsed."
}));

const resumeDeepDiveProblems = [
  ["resume-ownership", "Ownership of a resume project", "简历项目 ownership", "Pick one resume project. What exactly was your personal contribution, and what would not have happened without you?", "选一个简历项目。你具体负责哪一部分？如果没有你，哪些结果不会发生？", "ownership"],
  ["resume-hardest-detail", "Hardest technical detail", "最难技术细节", "Choose a project and explain the hardest technical detail at implementation level.", "选一个项目，把最难的技术细节讲到实现层面。", "technical-depth"],
  ["resume-metric", "Project success metric", "项目成功指标", "How did you measure whether this project worked? What baseline did you compare against?", "你如何衡量这个项目是否成功？和什么 baseline 比较？", "metric"],
  ["resume-tradeoff", "Design tradeoff", "设计取舍", "What was the most important design tradeoff in this project?", "这个项目里最重要的设计取舍是什么？", "tradeoff"],
  ["resume-bug-risk", "Failure mode", "失败模式", "What could break this project in production or under real market data?", "这个项目在生产环境或真实市场数据下可能哪里会坏？", "risk"],
  ["resume-reproduce", "Reproducibility", "可复现性", "If I asked you to reproduce the result from scratch, what steps and dependencies matter most?", "如果我让你从零复现结果，哪些步骤和依赖最关键？", "reproducibility"],
  ["resume-critique", "Self critique", "自我质疑", "What is the strongest critique of this project, and how would you respond?", "对这个项目最强的质疑是什么？你会如何回应？", "defense"],
  ["resume-next-version", "Next version", "下一版改进", "If you had two more weeks, what would you change first and why?", "如果你还有两周，最先改什么？为什么？", "iteration"]
].map(([id, titleEn, titleZh, promptEn, promptZh, tag]) => ({
  id,
  titleEn,
  titleZh,
  category: "machineLearning",
  difficulty: "Hard",
  tags: ["resume", "deep-dive", tag],
  promptEn,
  promptZh,
  answer: "Anchor the answer in a specific project. Show ownership, technical depth, measurement, risk awareness, and honest reflection.",
  explanation: "Resume deep dives test whether the candidate truly built and understood the work on the page."
}));

const researchDeepDiveProblems = [
  ["research-hypothesis", "Research hypothesis", "研究假设", "What hypothesis did your research project test, and why was it plausible?", "你的研究项目检验了什么假设？为什么这个假设有合理性？", "hypothesis"],
  ["research-data", "Data construction", "数据构造", "How did you construct the dataset, and what data quality issue worried you most?", "你如何构造数据集？最担心的数据质量问题是什么？", "data"],
  ["research-method", "Method choice", "方法选择", "Why did you choose this method over a simpler baseline?", "为什么选择这个方法，而不是更简单的 baseline？", "method"],
  ["research-bias", "Look-ahead or selection bias", "前视偏差或选择偏差", "If I accuse the project of look-ahead bias or selection bias, how do you check that?", "如果我质疑这个项目有前视偏差或选择偏差，你怎么检查？", "bias"],
  ["research-robustness", "Robustness check", "稳健性检验", "What robustness check would make you trust the result more?", "什么稳健性检验会让你更相信结果？", "robustness"],
  ["research-economics", "Economic intuition", "经济直觉", "What is the economic or behavioral intuition behind the result?", "结果背后的经济或行为直觉是什么？", "intuition"],
  ["research-live-market", "Live market translation", "落到真实市场", "What would change if this research were deployed in a live trading setting?", "如果这个研究要落到真实交易环境，什么会改变？", "deployment"],
  ["research-negative-result", "Negative result", "负结果", "Tell me about the strongest negative result or failed experiment in this project.", "讲一个这个项目里最强的负结果或失败实验。", "negative-result"]
].map(([id, titleEn, titleZh, promptEn, promptZh, tag]) => ({
  id,
  titleEn,
  titleZh,
  category: "statistics",
  difficulty: "Hard",
  tags: ["research", "deep-dive", tag],
  promptEn,
  promptZh,
  answer: "Give the hypothesis, data construction, baseline, validation, failure mode, and economic intuition.",
  explanation: "Research deep dives test rigor, ownership, robustness, and ability to defend assumptions."
}));

function renderInterviewSetup() {
  if (!interviewSnapshotRestored) restoreInterviewSessionSnapshot();
  els.llmEndpointInput.value = llmConfig.endpoint || "";
  els.llmModelInput.value = llmConfig.model || "";
  els.resumeInterviewBtn?.classList.toggle("hidden", !hasDurableInterview());
  renderInterviewCategoryPicker();
  updateInterviewSetupVisibility();
  updateInterviewAnswerMode();
  updateInterviewStatus();
  renderInterviewQuestionPanel();
}

function renderInterviewTranscript() {
  els.interviewTranscript.innerHTML = "";
  if (!interviewMessages.length) {
    appendMessageNode("system", interviewLanguage === "zh"
      ? "进入后，我会用对话和你确认方向、难度、题量和风格，然后自然进入第一题。"
      : "Once we start, I will confirm focus, difficulty, scope, and style through chat, then move into the first question.");
    return;
  }

  let prevRole = null;
  interviewMessages.forEach((message) => {
    const grouped = message.role !== "user" && message.role === prevRole;
    appendMessageNode(message.role, message.displayText ?? message.text, {
      id: message.id,
      typing: message.typing,
      thinking: message.thinking,
      attachments: message.attachments || [],
      actions: message.actions || [],
      actionStep: message.actionStep || "",
      variant: message.variant || "",
      grouped
    });
    prevRole = message.role;
  });
  els.interviewTranscript.scrollTop = els.interviewTranscript.scrollHeight;
  if (!interviewMessages.some((message) => message.typing)) scheduleMathTypeset(els.interviewTranscript);
}

function appendMessageNode(role, text, options = {}) {
  const typing = Boolean(options.typing);
  const thinking = Boolean(options.thinking);
  const grouped = Boolean(options.grouped);
  const turn = document.createElement("article");
  turn.className = `message-turn ${role}`;
  if (options.id) turn.dataset.messageId = options.id;
  if (options.variant) turn.classList.add(`message-${options.variant}`);
  if (typing) turn.classList.add("is-streaming");
  if (grouped) turn.classList.add("is-grouped");

  const avatar = document.createElement("div");
  avatar.className = `message-avatar avatar-${role}`;
  avatar.setAttribute("aria-hidden", "true");
  if (role === "coach") {
    avatar.classList.add("avatar-shark");
    const sharkImg = document.createElement("img");
    sharkImg.src = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";
    sharkImg.alt = "";
    sharkImg.loading = "lazy";
    avatar.appendChild(sharkImg);
  } else {
    avatar.textContent = getInterviewMessageAvatar(role);
  }
  if (grouped) avatar.style.visibility = "hidden";

  const stack = document.createElement("div");
  stack.className = "message-stack";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = getInterviewMessageLabel(role);
  const node = document.createElement("div");
  node.className = `message ${role}`;
  if (options.variant) node.classList.add(`message-${options.variant}`);
  if (role === "user" && isCompactInterviewReply(text)) node.classList.add("message-short");
  if (thinking) {
    node.classList.add("thinking");
    node.setAttribute("aria-label", interviewLanguage === "zh" ? "正在思考" : "Thinking");
    const thinkingLabel = document.createElement("span");
    thinkingLabel.className = "thinking-label";
    thinkingLabel.textContent = interviewLanguage === "zh" ? "分析回答" : "Analyzing";
    node.appendChild(thinkingLabel);
    const dots = document.createElement("span");
    dots.className = "thinking-dots";
    for (let index = 0; index < 3; index += 1) {
      dots.appendChild(document.createElement("i"));
    }
    node.appendChild(dots);
  } else if (typing) {
    renderRichText(node, text);
  } else {
    renderRichText(node, text);
    appendMessageAttachments(node, options.attachments || []);
    appendInterviewActions(node, options.actions || [], options.actionStep || "");
  }
  if (role === "user") {
    stack.append(node);
    turn.append(stack);
  } else {
    if (!grouped) stack.append(meta);
    stack.append(node);
    turn.append(avatar, stack);
  }
  els.interviewTranscript.appendChild(turn);
}

function isCompactInterviewReply(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.includes("\n")) return false;
  const compact = raw.replace(/[*_`#[\]()]/g, "").replace(/\s+/g, "");
  return compact.length > 0 && compact.length <= 8;
}

function getInterviewMessageAvatar(role) {
  if (role === "user") return "你";
  if (role === "system") return "i";
  return "Q";
}

function getInterviewMessageLabel(role) {
  if (role === "user") return interviewLanguage === "zh" ? "你" : "You";
  if (role === "system") return interviewLanguage === "zh" ? "面试题" : "Prompt";
  return interviewLanguage === "zh" ? "AI 面试官" : "AI interviewer";
}

function renderRichText(node, text) {
  node.classList.add("rich-text");
  node.textContent = "";
  const normalized = normalizeRichTextContent(text).replace(/\r/g, "");
  if (renderInterviewQuestionCard(node, normalized)) return;
  if (renderInterviewFeedbackCard(node, normalized)) return;
  const lines = normalized.split("\n");
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const block = document.createElement("p");
    appendInlineRichText(block, paragraph.join("\n"));
    node.appendChild(block);
    paragraph = [];
  };

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (!line.trim()) {
      flushParagraph();
      list = null;
      return;
    }
    if (heading) {
      flushParagraph();
      list = null;
      const level = Math.min(6, 3 + heading[1].length);
      const block = document.createElement(`h${level}`);
      appendInlineRichText(block, heading[2]);
      node.appendChild(block);
      return;
    }
    if (bullet) {
      flushParagraph();
      if (!list) {
        list = document.createElement("ul");
        node.appendChild(list);
      }
      const item = document.createElement("li");
      appendInlineRichText(item, bullet[1]);
      list.appendChild(item);
      return;
    }
    list = null;
    paragraph.push(line);
  });
  flushParagraph();
}

function renderInterviewQuestionCard(node, text) {
  const lines = String(text || "").split("\n");
  const heading = lines[0]?.match(/^#\s+(Q\d+\/\d+)\s+·\s+(.+)$/);
  if (!heading) return false;
  const titleLineIndex = lines.findIndex((line, index) => index > 0 && /^\*\*.+\*\*$/.test(line.trim()));
  const title = titleLineIndex >= 0 ? lines[titleLineIndex].trim().replace(/^\*\*|\*\*$/g, "") : heading[1];
  const prompt = lines.slice(titleLineIndex >= 0 ? titleLineIndex + 1 : 1).join("\n").trim();

  const card = document.createElement("section");
  card.className = "interview-prompt-card";
  const top = document.createElement("div");
  top.className = "interview-prompt-top";
  const badge = document.createElement("span");
  badge.textContent = heading[1];
  const meta = document.createElement("small");
  meta.textContent = heading[2];
  top.append(badge, meta);

  const titleNode = document.createElement("strong");
  titleNode.className = "interview-prompt-title";
  titleNode.textContent = title || heading[1];
  const body = document.createElement("div");
  body.className = "interview-prompt-body";
  renderRichTextBlocks(body, prompt || (interviewLanguage === "zh" ? "暂无题干。" : "No prompt."));
  card.append(top, titleNode, body);
  node.appendChild(card);
  return true;
}

function renderInterviewFeedbackCard(node, text) {
  const data = parseInterviewFeedbackCardText(text);
  if (!data) return false;
  const useZh = interviewLanguage !== "en";
  const card = document.createElement("section");
  card.className = "interview-feedback-card";

  const hero = document.createElement("div");
  hero.className = "interview-feedback-hero";
  const score = document.createElement("div");
  score.className = "interview-feedback-score";
  const scoreValue = document.createElement("strong");
  scoreValue.textContent = String(data.score);
  const scoreMeta = document.createElement("span");
  scoreMeta.textContent = "/100";
  score.append(scoreValue, scoreMeta);
  hero.appendChild(score);

  if (data.dimensions.length) {
    const dims = document.createElement("div");
    dims.className = "interview-feedback-dims-inline";
    data.dimensions.forEach((item) => {
      const row = document.createElement("div");
      row.className = "interview-feedback-dim-inline";
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("em");
      value.textContent = `${item.score}/5`;
      row.append(label, value);
      dims.appendChild(row);
    });
    hero.appendChild(dims);
  }
  card.appendChild(hero);

  if (data.summary) {
    const main = document.createElement("div");
    main.className = "interview-feedback-main";
    const title = document.createElement("h5");
    title.textContent = useZh ? "主要反馈" : "Key feedback";
    const copy = document.createElement("p");
    appendInlineRichText(copy, data.summary);
    main.append(title, copy);
    card.appendChild(main);
  }

  if (data.missing.length) {
    const section = document.createElement("section");
    section.className = "interview-feedback-missing";
    const title = document.createElement("h5");
    title.textContent = useZh ? "缺失要点" : "Missing pieces";
    section.appendChild(title);
    const list = document.createElement("ul");
    data.missing.forEach((item) => {
      const li = document.createElement("li");
      appendInlineRichText(li, item);
      list.appendChild(li);
    });
    section.appendChild(list);
    card.appendChild(section);
  }

  node.appendChild(card);
  return true;
}

function renderRichTextBlocks(node, text) {
  const lines = String(text || "").split("\n");
  let paragraph = [];
  let list = null;
  const flush = () => {
    if (!paragraph.length) return;
    const block = document.createElement("p");
    appendInlineRichText(block, paragraph.join("\n"));
    node.appendChild(block);
    paragraph = [];
  };
  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (!line.trim()) {
      flush();
      list = null;
      return;
    }
    if (bullet) {
      flush();
      if (!list) {
        list = document.createElement("ul");
        node.appendChild(list);
      }
      const item = document.createElement("li");
      appendInlineRichText(item, bullet[1]);
      list.appendChild(item);
      return;
    }
    list = null;
    paragraph.push(line);
  });
  flush();
}

function parseInterviewFeedbackCardText(text) {
  const source = String(text || "").trim();
  const score = parseInterviewFeedbackScore(source);
  if (score == null || !/(维度分|Dimensions|缺失要点|Missing pieces|真实面试风险|Interview risk)/i.test(source)) return null;
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const findValue = (patterns) => {
    const line = lines.find((item) => patterns.some((pattern) => pattern.test(item)));
    if (!line) return "";
    return line.replace(/^(主要反馈|Key feedback|评价|Evaluation|真实面试风险|Interview risk|参考差距|Reference delta)\s*[:：]\s*/i, "").trim();
  };
  const collectListAfter = (patterns) => {
    const start = lines.findIndex((item) => patterns.some((pattern) => pattern.test(item)));
    if (start < 0) return [];
    const items = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^(维度分|Dimensions|缺失要点|Missing pieces|真实面试风险|Interview risk|参考差距|Reference delta|下一步|Next step)\s*[:：]?$/i.test(line)) break;
      if (/^(真实面试风险|Interview risk|参考差距|Reference delta)\s*[:：]/i.test(line)) break;
      const item = line.replace(/^[-*]\s*/, "").trim();
      if (item) items.push(item);
    }
    return items;
  };
  const dimensions = lines
    .map((line) => line.match(/^[-*]\s*([^:：]+)\s*[:：]\s*(\d(?:\.\d+)?)\s*\/\s*5(?:\s*[-–]\s*(.+))?$/))
    .filter(Boolean)
    .map((match) => ({
      label: match[1].trim(),
      score: Math.round(clampNumber(match[2], 0, 5)),
      comment: String(match[3] || "").trim()
    }));
  return {
    score,
    summary: findValue([/^主要反馈\s*[:：]/i, /^Key feedback\s*:/i, /^评价\s*[:：]/i, /^Evaluation\s*:/i]),
    dimensions,
    missing: collectListAfter([/^缺失要点/i, /^Missing pieces/i])
  };
}

function normalizeRichTextContent(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\\\[/g, "\\[")
    .replace(/\\\]/g, "\\]")
    .replace(/\\\(/g, "\\(")
    .replace(/\\\)/g, "\\)");
}

function appendInlineRichText(node, text) {
  const value = String(text || "");
  const pattern = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s)]*)?|`[^`]+`|\*\*[^*]+\*\*)/gi;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) node.appendChild(document.createTextNode(value.slice(cursor, match.index)));
    const token = match[0];
    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (imageMatch && isSafeRichMediaUrl(imageMatch[2])) {
      node.appendChild(createRichImage(imageMatch[2], imageMatch[1] || "Interview image"));
    } else if (linkMatch && isSafeRichMediaUrl(linkMatch[2], { allowData: false })) {
      const link = document.createElement("a");
      link.href = linkMatch[2];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = linkMatch[1];
      node.appendChild(link);
    } else if (/^https?:\/\//i.test(token) && isSafeRichMediaUrl(token)) {
      node.appendChild(createRichImage(token, "Interview image"));
    } else {
      const inline = document.createElement(token.startsWith("`") ? "code" : "strong");
      inline.textContent = token.slice(token.startsWith("`") ? 1 : 2, token.startsWith("`") ? -1 : -2);
      node.appendChild(inline);
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) node.appendChild(document.createTextNode(value.slice(cursor)));
}

function isSafeRichMediaUrl(url, options = {}) {
  const allowData = options.allowData !== false;
  const value = String(url || "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (allowData && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value)) return true;
  return /^(?:\.{0,2}\/|assets\/|data\/)[\w./%-]+\.(?:png|jpe?g|gif|webp|svg)(?:\?.*)?$/i.test(value);
}

function createRichImage(src, alt = "") {
  const image = document.createElement("img");
  image.className = "rich-media";
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  return image;
}

function appendMessageAttachments(node, attachments = []) {
  const safeAttachments = attachments.filter(Boolean);
  if (!safeAttachments.length) return;
  const tray = document.createElement("div");
  tray.className = "message-attachments";
  safeAttachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "message-attachment";
    if (isImageAttachment(attachment) && attachment.dataUrl) {
      item.appendChild(createRichImage(attachment.dataUrl, attachment.name || "Uploaded image"));
    }
    const label = document.createElement("span");
    label.textContent = [
      attachment.name || (interviewLanguage === "zh" ? "附件" : "Attachment"),
      attachment.size ? `${Math.max(1, Math.round(Number(attachment.size) / 1024))} KB` : ""
    ].filter(Boolean).join(" · ");
    item.appendChild(label);
    tray.appendChild(item);
  });
  node.appendChild(tray);
}

function appendInterviewActions(node, actions = [], actionStep = "") {
  const safeActions = actions.filter((action) => action && action.label);
  if (!safeActions.length) return;
  if (actionStep && !isCurrentOnboardingStep(actionStep)) return;
  const tray = document.createElement("div");
  tray.className = "interview-action-chips";
  safeActions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "interview-action-chip";
    button.dataset.interviewAction = actionStep || "choice";
    button.dataset.interviewActionValue = action.value || action.label;
    button.textContent = action.label;
    if (action.description) button.title = action.description;
    tray.appendChild(button);
  });
  node.appendChild(tray);
}

function scheduleMathTypeset(root) {
  if (!root || !window.MathJax?.typesetPromise || mathTypesetTimer) return;
  mathTypesetTimer = window.setTimeout(() => {
    mathTypesetTimer = null;
    window.MathJax.typesetPromise([root]).catch(() => {});
  }, 80);
}

function updateInterviewLayout() {
  const showConsole = Boolean(interviewPreparing || interviewSession);
  els.interviewSetup?.classList.toggle("hidden", showConsole);
  els.interviewConsole?.classList.toggle("hidden", !showConsole);
  els.interviewGrid?.classList.toggle("setup-only", !showConsole);
  els.interviewGrid?.classList.toggle("session-only", showConsole);
  // Immersive mode: fill the screen, hide the floating to-do dock, and collapse the left nav.
  document.body.classList.toggle("interview-immersive", showConsole);
  if (showConsole) {
    document.body.classList.add("sidebar-collapsed");
  } else {
    applySidebarState();
  }
}

function renderInterviewQuestionPanel() {
  if (!els.interviewQuestionPanel) return;
  els.interviewQuestionPanel.innerHTML = "";

  if (!interviewSession?.questions?.length) {
    const empty = document.createElement("div");
    empty.className = "interview-question-panel-empty";
    empty.textContent = interviewLanguage === "zh"
      ? "完成 AI 配置后，这里会显示本轮进度。"
      : "After AI setup, this panel shows session progress.";
    els.interviewQuestionPanel.appendChild(empty);
    return;
  }

  const live = isInterviewLiveMode();
  const heading = document.createElement("div");
  heading.className = "interview-question-panel-head";
  const title = document.createElement("strong");
  title.textContent = live
    ? (interviewLanguage === "zh" ? "真实面试进度" : "Live progress")
    : (interviewLanguage === "zh" ? "训练面板" : "Practice panel");
  const progress = document.createElement("span");
  progress.textContent = `${Math.max(0, interviewSession.currentIndex + 1)} / ${interviewSession.questions.length}`;
  heading.append(title, progress);
  els.interviewQuestionPanel.appendChild(heading);
  els.interviewQuestionPanel.appendChild(createInterviewPanelStats(live));

  const list = document.createElement("div");
  list.className = "interview-question-accordion";
  interviewSession.questions.forEach((problem, index) => {
    const result = interviewSession.questionResults?.[index] || null;
    const expanded = index === interviewPanelExpandedIndex;
    const current = index === interviewSession.currentIndex;
    const titleText = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
    const promptText = interviewLanguage === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;

    const item = document.createElement("article");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.className = [
      "interview-question-item",
      expanded ? "is-expanded" : "",
      current ? "is-current" : "",
      result?.score != null && !live ? "is-scored" : "",
      result?.status === "wrapped" ? "is-wrapped" : ""
    ].filter(Boolean).join(" ");
    item.dataset.interviewQuestionIndex = String(index);
    item.setAttribute("aria-expanded", String(expanded));

    const main = document.createElement("span");
    main.className = "interview-question-main";
    const label = document.createElement("strong");
    label.textContent = `Q${index + 1}. ${titleText || (interviewLanguage === "zh" ? "未命名题目" : "Untitled question")}`;
    const meta = document.createElement("small");
    meta.textContent = [formatCategoryLabel(problem.category), problem.difficulty || ""].filter(Boolean).join(" · ");
    main.append(label, meta);

    const score = document.createElement("span");
    score.className = "interview-question-score";
    if (live) {
      score.classList.add("is-live-state");
      score.textContent = current ? (interviewLanguage === "zh" ? "当前" : "Now") : result ? (interviewLanguage === "zh" ? "完成" : "Done") : "--";
    } else {
      score.textContent = result?.score == null ? "--" : `${Math.round(result.score)}`;
      if (result?.score != null) score.dataset.targetScore = String(Math.round(result.score));
    }

    item.append(main, score);

    const detail = document.createElement("div");
    detail.className = "interview-question-detail";
    const prompt = document.createElement("p");
    prompt.textContent = promptText || (interviewLanguage === "zh" ? "暂无题干。" : "No prompt.");
    detail.appendChild(prompt);
    if (result?.evaluation) {
      const evaluation = document.createElement("small");
      appendInlineRichText(evaluation, result.evaluation);
      detail.appendChild(evaluation);
    }
    if (!live && result?.dimensions) {
      detail.appendChild(createInterviewDimensionMiniBars(result.dimensions));
    }
    item.appendChild(detail);

    item.addEventListener("click", () => {
      interviewPanelExpandedIndex = expanded ? -1 : index;
      renderInterviewQuestionPanel();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      interviewPanelExpandedIndex = expanded ? -1 : index;
      renderInterviewQuestionPanel();
    });
    list.appendChild(item);
  });
  els.interviewQuestionPanel.appendChild(list);
  scheduleMathTypeset(els.interviewQuestionPanel);
  refreshIcons();
}

function createInterviewPanelStats(live = false) {
  const stats = document.createElement("div");
  stats.className = "interview-panel-stats";
  const results = interviewSession?.questionResults || [];
  const completed = results.filter(Boolean).length;
  const scored = results.filter((item) => Number.isFinite(Number(item?.score)));
  const average = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length)
    : null;
  const focus = interviewFocusDefs[interviewSession?.sessionConfig?.focusKey || "mixed"];
  const items = live
    ? [
      [interviewLanguage === "zh" ? "模式" : "Mode", interviewLanguage === "zh" ? "真实面试" : "Live"],
      [interviewLanguage === "zh" ? "进度" : "Progress", `${completed}/${interviewSession?.questions?.length || 0}`],
      [interviewLanguage === "zh" ? "方向" : "Focus", interviewLanguage === "zh" ? focus?.labelZh || "混合" : focus?.labelEn || "Mixed"]
    ]
    : [
      [interviewLanguage === "zh" ? "平均分" : "Average", average == null ? "--" : `${average}`],
      [interviewLanguage === "zh" ? "已完成" : "Done", `${completed}/${interviewSession?.questions?.length || 0}`],
      [interviewLanguage === "zh" ? "方向" : "Focus", interviewLanguage === "zh" ? focus?.labelZh || "混合" : focus?.labelEn || "Mixed"]
    ];
  items.forEach(([label, value]) => {
    const item = document.createElement("span");
    item.innerHTML = `<small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>`;
    stats.appendChild(item);
  });
  return stats;
}

function createInterviewDimensionMiniBars(dimensions = {}) {
  const labels = {
    correctness: interviewLanguage === "zh" ? "正确" : "Correct",
    reasoning: interviewLanguage === "zh" ? "推理" : "Reasoning",
    communication: interviewLanguage === "zh" ? "表达" : "Comms"
  };
  const wrap = document.createElement("div");
  wrap.className = "interview-dimension-bars";
  Object.entries(labels).forEach(([key, label]) => {
    const score = Math.round(clampNumber(dimensions?.[key]?.score ?? 0, 0, 5));
    const row = document.createElement("span");
    row.innerHTML = `<b>${escapeHtml(label)}</b><i style="--score:${score / 5}"></i><em>${score}/5</em>`;
    wrap.appendChild(row);
  });
  return wrap;
}

function animateInterviewScores(root) {
  root.querySelectorAll("[data-target-score]").forEach((node) => {
    if (node.dataset.animatedScore === node.dataset.targetScore) return;
    const target = Math.round(clampNumber(node.dataset.targetScore, 0, 100));
    node.dataset.animatedScore = String(target);
    const start = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(tick);
      else node.textContent = String(target);
    };
    node.textContent = "0";
    window.requestAnimationFrame(tick);
  });
}

function renderInterviewFavorites() {
  if (!els.interviewFavoritesList) return;
  const favorites = getInterviewFavorites();
  els.interviewFavoritesList.innerHTML = "";
  if (els.interviewFavoritesSummary) {
    els.interviewFavoritesSummary.textContent = favorites.length
      ? `${favorites.length} 条复盘`
      : "保存高价值题目复盘。";
  }
  if (!favorites.length) {
    const empty = document.createElement("small");
    empty.className = "interview-favorite-empty";
    empty.textContent = "完成一题后可以把要点收进这里。";
    els.interviewFavoritesList.appendChild(empty);
    return;
  }

  favorites.slice().reverse().slice(0, 6).forEach((favorite) => {
    const item = document.createElement("article");
    item.className = "interview-favorite-item";
    const title = document.createElement("strong");
    title.textContent = favorite.title || "Untitled";
    const meta = document.createElement("small");
    meta.textContent = [
      favorite.category ? formatCategoryLabel(favorite.category) : "",
      favorite.createdAt ? formatDate(favorite.createdAt) : ""
    ].filter(Boolean).join(" · ");
    const summary = document.createElement("p");
    summary.textContent = favorite.summary || "";
    item.append(title, meta, summary);
    els.interviewFavoritesList.appendChild(item);
  });
}

function getInterviewFavorites() {
  const legacy = Array.isArray(state.interviewFavorites) ? state.interviewFavorites : [];
  const problemFavorites = (state.problemStates || []).flatMap((item) => (
    Array.isArray(item.favorites) ? item.favorites : []
  ));
  return mergeRecordsById(legacy, problemFavorites)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function toggleInterviewPanel() {
  if (!els.interviewConsole) return;
  const active = els.interviewConsole.classList.toggle("show-panel");
  els.toggleInterviewPanelBtn?.classList.toggle("is-active", active);
  els.toggleInterviewPanelBtn?.setAttribute("aria-pressed", String(active));
  if (active) renderInterviewQuestionPanel();
}

function updateInterviewActionPanel() {
  if (!els.interviewCompleteActions) return;
  const onboarding = isInterviewOnboarding();
  const live = isInterviewLiveMode();
  const completed = Boolean(interviewSession?.completed);
  const hasCompletedQuestion = Boolean(interviewSession && interviewSession.currentIndex >= 0 && interviewSession.answeredCurrent);
  // Show the action bar when a question is answered, OR at the end of the session (for restart/export).
  els.interviewCompleteActions.classList.toggle("hidden", onboarding || (!hasCompletedQuestion && !completed));

  const hasNext = Boolean(
    interviewSession
    && interviewSession.awaitingNext
    && interviewSession.currentIndex < interviewSession.questions.length - 1
  );
  // In-session buttons hide at completion; restart/export show only at completion.
  els.nextInterviewQuestionBtn?.classList.toggle("hidden", completed);
  els.saveInterviewFavoriteBtn?.classList.toggle("hidden", completed);
  els.shareInterviewQuestionBtn?.classList.toggle("hidden", completed);
  els.restartInterviewBtn?.classList.toggle("hidden", !completed);
  els.exportInterviewReportBtn?.classList.toggle("hidden", !completed);

  const showPanelToggle = Boolean(interviewSession && interviewSession.questions?.length && !onboarding);
  els.toggleInterviewPanelBtn?.classList.toggle("hidden", !showPanelToggle);
  if (!showPanelToggle) {
    els.interviewConsole?.classList.remove("show-panel");
    els.toggleInterviewPanelBtn?.classList.remove("is-active");
    els.toggleInterviewPanelBtn?.setAttribute("aria-pressed", "false");
  }
  if (els.nextInterviewQuestionBtn) els.nextInterviewQuestionBtn.disabled = !hasNext;
  if (els.saveInterviewFavoriteBtn) els.saveInterviewFavoriteBtn.disabled = !hasCompletedQuestion;
  if (els.shareInterviewQuestionBtn) els.shareInterviewQuestionBtn.disabled = !hasCompletedQuestion;
  els.hintInterviewBtn?.classList.toggle("hidden", onboarding || live || completed);
  els.revealAnswerBtn?.classList.toggle("hidden", onboarding || live || completed);
  els.interviewAnswerFileRow?.classList.toggle("hidden", onboarding || completed);
  els.voiceAnswerBtn?.classList.toggle("hidden", onboarding || completed);
  if (els.interviewAnswer) {
    els.interviewAnswer.disabled = completed || Boolean(interviewSession?.submitting);
    els.interviewAnswer.placeholder = onboarding
      ? (interviewLanguage === "zh" ? "输入你的选择，或点上方按钮…" : "Type your choice…")
      : (interviewLanguage === "zh" ? "输入你的回答…" : "Type your answer…");
  }
}

function addProblemFromForm() {
  const problem = normalizeProblem({
    titleEn: els.problemTitleEn.value,
    titleZh: els.problemTitleZh.value,
    category: els.problemCategory.value,
    difficulty: els.problemDifficulty.value,
    tags: parseTags(els.problemTags.value),
    sourceUrl: els.problemSourceUrl.value,
    source: "manual",
    promptEn: els.problemPromptEn.value,
    promptZh: els.problemPromptZh.value,
    answer: els.problemAnswer.value,
    explanation: els.problemExplanation.value,
    createdAt: new Date().toISOString()
  });

  if (!problem.titleEn && !problem.titleZh) return;
  if (!problem.promptEn && !problem.promptZh) return;

  upsertProblems([problem]);
  els.problemForm.reset();
  els.problemForm.classList.add("hidden");
  selectedInterviewProblemId = problem.id;
  resetInterview();
  renderAll();
}

function importProblemJson() {
  const raw = els.problemJsonInput.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const problems = Array.isArray(parsed) ? parsed : [parsed];
    upsertProblems(problems);
    selectedInterviewProblemId = normalizeProblem(problems[0]).id;
    els.problemJsonInput.value = "";
    resetInterview();
    renderAll();
  } catch {
    els.problemJsonInput.value = "";
    window.alert("题目 JSON 无法读取。");
  }
}

function upsertProblems(problems) {
  const byId = new Map(state.problems.map((problem) => [problem.id, problem]));
  problems.map(normalizeProblem).filter(isCatalogProblem).forEach((problem) => {
    byId.set(problem.id, { ...(byId.get(problem.id) || {}), ...problem, updatedAt: new Date().toISOString() });
  });
  state.problems = [...byId.values()].filter(isCatalogProblem);
  clearProblemLookupCaches();
  saveState();
}

async function deleteProblem(id) {
  const problem = state.problems.find((item) => item.id === id);
  if (!problem || !isUserProblem(problem)) return;
  state.problems = state.problems.filter((problem) => problem.id !== id);
  clearProblemLookupCaches();
  if (selectedInterviewProblemId === id) {
    selectedInterviewProblemId = "";
    resetInterview();
  }
  saveState();
  renderAll();
  if (canUseCloud()) {
    await cloudApi(`/problems/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
}

function selectProblemForInterview(id) {
  selectedInterviewProblemId = id;
  const problem = state.problems.find((item) => item.id === id);
  if (problem) selectedInterviewCategories = new Set([normalizeCategory(problem.category)]);
  if (els.interviewSourceSelect) els.interviewSourceSelect.value = "full";
  renderInterviewSetup();
  resetInterview();
  switchModule("interview");
}

function normalizeCatalogProblemId(id) {
  const value = String(id || "").trim();
  const legacyPrefix = [["pu", "rple"].join(""), "book"].join("-");
  if (value.startsWith(`${legacyPrefix}-problem-`)) return value.replace(`${legacyPrefix}-problem-`, "catalog-problem-");
  if (value.startsWith(`${legacyPrefix}-exercise-`)) return value.replace(`${legacyPrefix}-exercise-`, "catalog-exercise-");
  return value;
}

function normalizeProblemSource(source) {
  return isLegacyCatalogMarker(source) ? "question-bank" : String(source || "").trim();
}

function sanitizeProblemTags(tags) {
  const cleaned = tags
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !isLegacyCatalogMarker(tag));
  return [...new Set(cleaned)];
}

function sanitizeProblemTitleZh(title, raw = {}) {
  const legacyLabel = ["紫", "皮", "书"].join("");
  const legacyExercisePattern = new RegExp(`${legacyLabel}练习\\s*\\d+`);
  const legacyLabelPattern = new RegExp(legacyLabel, "g");
  if (!legacyExercisePattern.test(title)) return title.replace(legacyLabelPattern, "").trim();
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return exerciseTitleOverrides[number]?.zh || title.replace(legacyLabelPattern, "").trim();
}

function sanitizeProblemTitleEn(title, raw = {}) {
  const legacyBookPattern = new RegExp(["pu", "rple"].join("") + "\\s+book", "i");
  if (!legacyBookPattern.test(title || "")) return title;
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return exerciseTitleOverrides[number]?.en || title.replace(new RegExp(legacyBookPattern.source, "ig"), "Question Bank").trim();
}

function pickProblemExtendedFields(raw) {
  const extra = {};
  [...PROBLEM_MEDIA_FIELD_KEYS, ...PROBLEM_LOCALIZED_FIELD_KEYS].forEach((key) => {
    if (raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== "") {
      extra[key] = raw[key];
    }
  });
  return extra;
}

function normalizeProblem(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  let titleEn = sanitizeProblemTitleEn(String(raw?.titleEn || raw?.title || "").trim(), raw);
  const titleZh = sanitizeProblemTitleZh(String(raw?.titleZh || "").trim(), raw);
  const promptEn = String(raw?.promptEn || raw?.prompt || "").trim();
  const promptZh = String(raw?.promptZh || "").trim();
  const id = normalizeCatalogProblemId(raw?.id || stableProblemId(titleEn || titleZh || sourceUrl || makeId(), sourceUrl));
  if (!titleEn && id.startsWith("catalog-exercise-")) {
    const number = id.match(/(\d+)$/)?.[1]?.padStart(3, "0");
    titleEn = exerciseTitleOverrides[number]?.en || "";
  }
  const source = normalizeProblemSource(raw?.source || inferSource(sourceUrl));
  const sourceType = String(raw?.sourceType || raw?.collection || "").trim();
  const bookSlug = String(raw?.bookSlug || "").trim();
  const tags = sanitizeProblemTags(Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean) : parseTags(raw?.tags || ""));
  const visibility = raw?.visibility || (
    source === "seed" || source === "question-bank" || sourceType === "book" || bookSlug
      ? "public"
      : "user"
  );
  return {
    id,
    titleEn,
    titleZh,
    category: normalizeCategory(raw?.category || inferProblemCategory(raw)),
    difficulty: raw?.difficulty || "Medium",
    tags,
    companies: normalizeProblemCompanies(raw, tags, source),
    source,
    sourceUrl,
    sourceType,
    bookSlug,
    bookName: String(raw?.bookName || "").trim(),
    promptEn,
    promptZh,
    answer: String(raw?.answer || "").trim(),
    explanation: String(raw?.explanation || raw?.solution || "").trim(),
    visibility: visibility === "public" ? "public" : "user",
    ownerUserId: String(raw?.ownerUserId || "").trim(),
    createdAt: isLegacyCatalogMarker(raw?.createdAt) ? "catalog" : raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || "",
    ...pickProblemExtendedFields(raw)
  };
}

function isUserProblem(problem) {
  return normalizeProblem(problem).visibility === "user";
}

function normalizeNewsItem(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const title = cleanNewsText(raw?.title || "");
  const titleZh = cleanNewsText(raw?.titleZh || title);
  const summary = cleanNewsText(raw?.summary || raw?.description || "");
  const publishedAt = String(raw?.publishedAt || raw?.date || raw?.createdAt || new Date().toISOString()).trim();
  const tags = parseTags(raw?.tags || "");
  const skills = normalizeNewsSkills(raw?.skills || raw?.skill || raw?.primarySkill || inferNewsSkill(`${title} ${titleZh} ${summary} ${tags.join(" ")}`));
  const id = raw?.id || stableNewsId(titleZh || title || sourceUrl || makeId(), sourceUrl);
  const sourceType = normalizeNewsSourceType(raw?.sourceType || raw?.type || raw?.platform || inferNewsSourceType({ ...raw, sourceUrl }));
  return {
    id,
    title,
    titleZh,
    source: cleanNewsSource(raw?.source, sourceUrl),
    sourceType,
    sourceUrl,
    publishedAt,
    tags,
    skills,
    summary,
    insight: cleanNewsText(raw?.insight || raw?.takeaway || ""),
    readAt: raw?.readAt || "",
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

function normalizeNewsSourceType(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases = {
    rss: "rss",
    feed: "rss",
    news: "news",
    media: "news",
    article: "news",
    official: "official",
    company: "official",
    announcement: "official",
    linkedin: "linkedin",
    linkedinsignal: "linkedin",
    xiaohongshu: "xiaohongshu",
    rednote: "xiaohongshu",
    xhs: "xiaohongshu",
    social: "social",
    manual: "manual"
  };
  return aliases[key] || "news";
}

function inferNewsSourceType(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const source = String(raw?.source || "").toLowerCase();
  let host = "";
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }
  const text = `${host} ${source}`.toLowerCase();
  if (/linkedin\.com/.test(text)) return "linkedin";
  if (/xiaohongshu\.com|xhslink\.com|rednote/.test(text)) return "xiaohongshu";
  if (/janestreet\.com|citadel(?:securities)?\.com|optiver\.com|imc\.com|jumptrading\.com|hudsonrivertrading\.com|twosigma\.com|deshaw\.com|virtu\.com|drw\.com|flowtraders\.com|nasdaq\.com|nyse\.com|cmegroup\.com|sec\.gov/.test(text)) {
    return "official";
  }
  if (/rss|feed|google news|news\.google\.com/.test(text)) return "rss";
  if (!sourceUrl && /linkedin|小红书|xiaohongshu|rednote|social/.test(text)) return "social";
  if (!sourceUrl && /manual|手动/.test(text)) return "manual";
  return "news";
}

function isSocialNewsType(sourceType) {
  return ["linkedin", "xiaohongshu", "social", "manual"].includes(normalizeNewsSourceType(sourceType));
}

function getNewsSourceTypeLabel(sourceType) {
  const type = normalizeNewsSourceType(sourceType);
  const labels = {
    rss: "newsSourceNews",
    news: "newsSourceNews",
    official: "newsSourceOfficial",
    linkedin: "newsSourceLinkedIn",
    xiaohongshu: "newsSourceXiaohongshu",
    social: "newsSourceSocial",
    manual: "newsSourceManual"
  };
  return t(labels[type] || "newsSourceNews");
}

function getNewsVerificationLabel(sourceType, sourceUrl = "") {
  const type = normalizeNewsSourceType(sourceType);
  if (isSocialNewsType(type)) return t("newsNeedsVerify");
  return sourceUrl ? t("newsVerified") : t("newsSourceManual");
}

function cleanNewsText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNewsSource(value, sourceUrl = "") {
  const inferred = inferSource(sourceUrl);
  const source = cleanNewsText(value || inferred || "Market News");
  const sourceAliases = {
    "news.google.com": "Google News",
    "m.investing.com": "Investing.com",
    "investing.com": "Investing.com",
    "www.msn.com": "MSN",
    "msn.com": "MSN"
  };
  if (sourceAliases[source.toLowerCase()]) return sourceAliases[source.toLowerCase()];
  const hasLatinOrCjk = /[A-Za-z\u4e00-\u9fa5]/.test(source);
  if (!hasLatinOrCjk) return inferred && inferred !== "manual" ? inferred : "Market News";
  if (source.length > 34) return `${source.slice(0, 31).trim()}...`;
  return source;
}

function canonicalNewsTitle(value) {
  return cleanNewsText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b(stock|shares?)\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim();
}

function normalizeNetworkContact(raw) {
  return {
    id: raw?.id || makeId(),
    name: String(raw?.name || "").trim(),
    company: String(raw?.company || "").trim(),
    role: String(raw?.role || "").trim(),
    status: String(raw?.status || "To reach out").trim(),
    channel: String(raw?.channel || "").trim(),
    nextStep: String(raw?.nextStep || "").trim(),
    notes: String(raw?.notes || "").trim(),
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

function stableProblemId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `problem-${base.slice(0, 80) || makeId()}`;
}

function stableNewsId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `news-${base.slice(0, 90) || makeId()}`;
}

function stableCourseId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `course-${base.slice(0, 90) || makeId()}`;
}

function inferProblemCategory(raw) {
  const text = `${raw?.sourceUrl || ""} ${raw?.source || ""} ${raw?.title || ""} ${raw?.prompt || ""}`.toLowerCase();
  if (text.includes("leetcode")) return "leetcode";
  if (text.includes("pandas") || text.includes("numpy") || text.includes("dataframe")) return "pandasNumpy";
  if (text.includes("option") || text.includes("greeks") || text.includes("volatility")) return "option";
  if (text.includes("market") || text.includes("trading")) return "market";
  if (text.includes("statistics") || text.includes("p-value") || text.includes("hypothesis")) return "statistics";
  if (text.includes("deep learning") || text.includes("transformer") || text.includes("neural")) return "deepLearning";
  if (text.includes("machine learning") || text.includes("xgboost") || text.includes("feature")) return "machineLearning";
  if (text.includes("probability") || text.includes("expected") || text.includes("bayes")) return "probabilityExpectation";
  return "probabilityExpectation";
}

function normalizeCategory(category) {
  const key = String(category || "").trim();
  const aliases = {
    probability: "probabilityExpectation",
    expectation: "probabilityExpectation",
    mental: "mentalMath",
    mental_math: "mentalMath",
    pandas: "pandasNumpy",
    numpy: "pandasNumpy",
    ml: "machineLearning",
    machine_learning: "machineLearning",
    dl: "deepLearning",
    deep_learning: "deepLearning",
    options: "option",
    communication: "leetcode"
  };
  return skillDefs[key] ? key : aliases[key] || "probabilityExpectation";
}

function inferSource(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "") || "manual";
  } catch {
    return "manual";
  }
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/[,，#\s]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeNewsSkills(value) {
  const raw = Array.isArray(value) ? value : parseTags(value || "");
  const skills = raw.map(normalizeCategory).filter((key) => skillDefs[key]);
  return [...new Set(skills.length ? skills : ["market"])];
}

function isLowQualityNews(item) {
  const id = String(item?.id || "");
  if (!id.startsWith("api-news-")) return false;
  const text = `${item.title || ""} ${item.titleZh || ""} ${item.summary || ""} ${item.source || ""}`.toLowerCase();
  if (/trading bot|stock trading bot|crypto trading bot|best ai trading|for beginners|platforms? in 2026|mexc/.test(text)) return true;
  if (/jane street|citadel|two sigma|squarepoint|optiver|imc|hudson river|jump trading|tower research/.test(text)) return false;
  return !/market making|electronic trading|options?|volatility|derivatives?|exchange|hedge fund|coreweave|gpu|liquidity|order book/.test(text);
}

function inferNewsSkill(text) {
  const lower = String(text || "").toLowerCase();
  if (/ai|gpu|cloud|coreweave|model|deep|transformer|算力|模型/.test(lower)) return "deepLearning";
  if (/option|vol|volatility|波动|期权|greeks/.test(lower)) return "option";
  if (/data|feature|machine learning|ml|机器学习/.test(lower)) return "machineLearning";
  if (/stat|regression|估计|统计/.test(lower)) return "statistics";
  if (/leetcode|system|系统|latency|低延迟/.test(lower)) return "leetcode";
  return "market";
}

function sortNews(news) {
  return [...news].sort((a, b) => newsTime(b) - newsTime(a));
}

function newsTime(item) {
  const value = new Date(item?.publishedAt || item?.createdAt || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatCategoryLabel(category) {
  const normalized = normalizeCategory(category);
  return skillDefs[normalized]?.name || category;
}

function consumeIncomingCapture() {
  const params = new URLSearchParams(window.location.search);
  const capture = params.get("capture");
  if (!capture) return;

  try {
    const payload = parseCapturePayload(capture);
    const problems = Array.isArray(payload) ? payload : [payload];
    if (currentUser) {
      upsertProblems(problems);
      selectedInterviewProblemId = normalizeProblem(problems[0]).id;
    } else {
      sessionStorage.setItem(PENDING_CAPTURE_KEY, JSON.stringify(problems));
      showAuthMessage("登录后会自动收录刚才捕获的题目。");
    }
  } catch {
    showAuthMessage("插件捕获的题目无法读取。");
  } finally {
    params.delete("capture");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    history.replaceState(null, "", nextUrl);
  }
}

function consumePendingCapture() {
  if (!currentUser) return;
  const raw = sessionStorage.getItem(PENDING_CAPTURE_KEY);
  if (!raw) return;
  try {
    const problems = JSON.parse(raw);
    upsertProblems(Array.isArray(problems) ? problems : [problems]);
    selectedInterviewProblemId = normalizeProblem(Array.isArray(problems) ? problems[0] : problems).id;
  } catch {
    // Ignore malformed session handoff.
  } finally {
    sessionStorage.removeItem(PENDING_CAPTURE_KEY);
  }
}

function parseCapturePayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function saveLlmConfig() {
  llmConfig = {
    endpoint: els.llmEndpointInput.value.trim() || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(els.llmModelInput.value)
  };
  saveLlmConfigToStorage();
  appendInterviewMessage("system", t("llmSaved"));
}

function renderSettings() {
  if (!currentUser || !els.settingsForm) return;
  els.settingsLanguageSelect.value = getLanguage();
  renderCountryOptions(els.settingsCountrySelect, currentUser.country);
  renderRegionOptions(els.settingsRegionSelect, currentUser.country, currentUser.region);
  els.settingsLlmEndpointInput.value = llmConfig.endpoint || "";
  els.settingsLlmModelInput.value = llmConfig.model || "";
  if (els.settingsCloudApiInput) els.settingsCloudApiInput.value = cloudConfig.endpoint || DEFAULT_CLOUD_API_ENDPOINT;
  els.settingsGoogleClientIdInput.value = auth.googleClientId || "";
  renderCloudStatus();
}

function saveSettings() {
  if (!currentUser) return;
  appPrefs.language = normalizeLanguage(els.settingsLanguageSelect.value);
  saveAppPrefs();
  syncLanguageToUrl(appPrefs.language);
  const previousCloudEndpoint = cloudConfig.endpoint;
  const country = normalizeCountry(els.settingsCountrySelect.value);
  const region = normalizeRegionForCountry(els.settingsRegionSelect.value, country);
  llmConfig = {
    endpoint: els.settingsLlmEndpointInput.value.trim() || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(els.settingsLlmModelInput.value)
  };
  auth.googleClientId = els.settingsGoogleClientIdInput.value.trim();
  cloudConfig.endpoint = els.settingsCloudApiInput?.value.trim() || DEFAULT_CLOUD_API_ENDPOINT;
  auth.accounts = auth.accounts.map((account) => (
    account.id === currentUser.id ? { ...account, country, region, updatedAt: new Date().toISOString() } : account
  ));
  saveLlmConfigToStorage();
  saveCloudConfig();
  saveAuth();
  currentUser = getCurrentUser();
  state.leaderboard = normalizeLeaderboardSettings({ ...state.leaderboard, country, region });
  saveState();
  queueCloudSync("account", 0);
  if (previousCloudEndpoint !== cloudConfig.endpoint) invalidateLeaderboardCloud({ clear: true, refresh: true });
  renderGoogleClientInput();
  renderAll();
  switchModule("settings");
  els.settingsMessage.textContent = `${t("settingsSaved")} ${getCloudStatusText()}`;
}

function getInterviewType() {
  return interviewTypeDefs[els.interviewTypeSelect?.value] ? els.interviewTypeSelect.value : "oa";
}

function getInterviewSource() {
  return els.interviewSourceSelect?.value === "pdf" ? "pdf" : "full";
}

function getInterviewAnswerMode() {
  return ["text", "file", "voice"].includes(els.interviewAnswerModeSelect?.value) ? els.interviewAnswerModeSelect.value : "text";
}

function getInterviewQuestionCount() {
  return Math.round(clampNumber(els.interviewQuestionCount?.value || 3, 1, 12));
}

function getInterviewQuestionSeconds() {
  return Math.round(clampNumber(els.interviewQuestionTime?.value || interviewTypeDefs[getInterviewType()].minutes, 1, 60) * 60);
}

function makeInterviewProblemPool(type = getInterviewType(), config = null) {
  const base = makeInterviewBaseProblemPool(type, config);
  const selectedCategories = config?.focusKey
    ? (interviewFocusDefs[config.focusKey]?.categories?.length ? interviewFocusDefs[config.focusKey].categories : ["all"])
    : getInterviewSelectedCategories();
  if (selectedCategories.includes("all")) return base;
  return base.filter((problem) => selectedCategories.includes(normalizeCategory(problem.category)));
}

function makeInterviewBaseProblemPool(type = getInterviewType(), config = null) {
  if (config?.focusKey === "resume") return resumeDeepDiveProblems.map(normalizeProblem);
  if (config?.focusKey === "research") return researchDeepDiveProblems.map(normalizeProblem);
  if (config?.focusKey === "behavioral" || type === "behavioral") return behavioralInterviewProblems.map(normalizeProblem);
  const categories = interviewTypeDefs[type]?.categories || [];
  const filtered = state.problems.filter((problem) => categories.includes(normalizeCategory(problem.category)));
  return filtered.length ? filtered : state.problems;
}

function getInterviewAvailableCategories(type = getInterviewType()) {
  const categories = makeInterviewBaseProblemPool(type).map((problem) => normalizeCategory(problem.category)).filter((key) => skillDefs[key]);
  const unique = [...new Set(categories)];
  return unique.length ? unique : Object.keys(skillDefs);
}

function getInterviewSelectedCategories() {
  const available = getInterviewAvailableCategories();
  if (selectedInterviewCategories.has("all")) return ["all"];
  const selected = [...selectedInterviewCategories].filter((key) => available.includes(key));
  return selected.length ? selected : ["all"];
}

function renderInterviewCategoryPicker() {
  if (!els.interviewCategoryPicker) return;
  const available = getInterviewAvailableCategories();
  const selected = getInterviewSelectedCategories();
  if (selected[0] === "all") selectedInterviewCategories = new Set(["all"]);
  else selectedInterviewCategories = new Set(selected);

  els.interviewCategoryPicker.innerHTML = "";
  const items = ["all", ...available];
  items.forEach((key) => {
    const button = document.createElement("button");
    const active = key === "all" ? selectedInterviewCategories.has("all") : selectedInterviewCategories.has(key);
    button.type = "button";
    button.className = `interview-category-chip${active ? " active" : ""}`;
    button.dataset.interviewCategory = key;
    button.setAttribute("aria-pressed", String(active));
    button.textContent = key === "all"
      ? (interviewLanguage === "zh" ? "随机" : "Random")
      : formatCategoryLabel(key);
    els.interviewCategoryPicker.appendChild(button);
  });
}

function toggleInterviewCategory(category) {
  if (!category) return;
  if (category === "all") {
    selectedInterviewCategories = new Set(["all"]);
  } else {
    if (selectedInterviewCategories.has("all")) selectedInterviewCategories = new Set();
    if (selectedInterviewCategories.has(category)) selectedInterviewCategories.delete(category);
    else selectedInterviewCategories.add(category);
    if (!selectedInterviewCategories.size) selectedInterviewCategories = new Set(["all"]);
  }
  renderInterviewCategoryPicker();
  updateInterviewSetupVisibility();
  resetInterview({ keepSetup: true });
}

function getSelectedProblem() {
  if (interviewSession?.currentProblem) return interviewSession.currentProblem;
  const pool = makeInterviewProblemPool();
  return pool.find((problem) => problem.id === selectedInterviewProblemId) || pool[0] || null;
}

function updateInterviewSetupVisibility() {
  if (els.interviewPdfRow) {
    els.interviewPdfRow.classList.toggle("hidden", getInterviewSource() !== "pdf");
  }
  if (els.interviewCategoryRow) {
    els.interviewCategoryRow.classList.toggle("hidden", getInterviewSource() !== "full");
  }
  if (els.interviewSummary) {
    const source = getInterviewSource() === "pdf" ? "PDF 题源" : `题库抽题 · ${formatInterviewCategorySummary()}`;
    els.interviewSummary.textContent = interviewLanguage === "zh"
      ? `AI 面试官会通过对话配置 practice / live。${source}`
      : `The AI interviewer configures practice / live through chat. ${source}`;
  }
}

function formatInterviewCategorySummary() {
  const selected = getInterviewSelectedCategories();
  if (selected.includes("all")) return interviewLanguage === "zh" ? "随机主题" : "Random themes";
  return selected.map(formatCategoryLabel).join("、");
}

function updateInterviewAnswerMode() {
  els.interviewAnswerFileRow?.classList.remove("hidden");
  els.voiceAnswerBtn?.classList.remove("hidden");
  if (els.interviewAnswer) {
    els.interviewAnswer.placeholder = interviewLanguage === "zh"
      ? "输入你的回答…"
      : "Type your answer…";
    autoSizeInterviewAnswer();
  }
}

function updateInterviewPdfMeta() {
  const file = els.interviewPdfInput?.files?.[0];
  if (!els.interviewPdfMeta) return;
  els.interviewPdfMeta.textContent = file
    ? `${file.name} · ${Math.round(file.size / 1024)} KB`
    : "上传 PDF 后会由 LLM 总结重点并生成题目。";
}

function updateInterviewAnswerFileMeta() {
  const file = els.interviewAnswerFile?.files?.[0];
  const label = file
    ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`
    : (interviewLanguage === "zh" ? "支持图片、文本文件和 PDF。" : "Supports images, text files, and PDF.");
  if (els.interviewAnswerFileMeta) els.interviewAnswerFileMeta.textContent = label;
  if (!els.interviewAttachmentPreview) return;
  els.interviewAttachmentPreview.innerHTML = "";
  els.interviewAttachmentPreview.classList.toggle("hidden", !file);
  if (!file) return;
  const chip = document.createElement("span");
  chip.className = "interview-attachment-chip";
  chip.innerHTML = `<i data-lucide="${file.type.startsWith("image/") ? "image" : "paperclip"}"></i><span>${escapeHtml(label)}</span>`;
  els.interviewAttachmentPreview.appendChild(chip);
  refreshIcons();
}

function autoSizeInterviewAnswer() {
  if (!els.interviewAnswer) return;
  els.interviewAnswer.style.height = "auto";
  els.interviewAnswer.style.height = `${Math.min(Math.max(44, els.interviewAnswer.scrollHeight), 220)}px`;
}

function handleInterviewAnswerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  els.interviewForm?.requestSubmit();
}

function handleInterviewTranscriptAction(event) {
  const button = event.target.closest("[data-interview-action-value]");
  if (!button || button.disabled) return;
  const value = button.dataset.interviewActionValue || button.textContent || "";
  handleOnboardingAnswer(value);
}

function resetInterview(options = {}) {
  clearInterviewTimers();
  stopInterviewSpeech();
  interviewSession = null;
  interviewPreparing = false;
  interviewMessages = [];
  interviewPanelExpandedIndex = 0;
  sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
  if (!options.keepSetup) renderInterviewSetup();
  if (els.interviewAnswer) els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  updateInterviewStatus();
  renderInterviewTranscript();
  renderInterviewQuestionPanel();
}

function getInterviewSetupLanguage() {
  const active = document.querySelector("[data-interview-lang].active");
  return active?.dataset.interviewLang === "en" ? "en" : "zh";
}

function getInterviewSetupMode() {
  const active = document.querySelector("[data-interview-mode].active");
  const mode = active?.dataset.interviewMode;
  return interviewModeDefs[mode] ? mode : "practice";
}

async function startInterview() {
  clearInterviewTimers();
  stopInterviewSpeech();
  interviewMessages = [];
  interviewPanelExpandedIndex = 0;
  interviewPreparing = false;

  // Apply the three buffer-screen choices: language, model, mode.
  interviewLanguage = getInterviewSetupLanguage();
  syncInterviewLanguageControls();
  const mode = getInterviewSetupMode();
  llmConfig = {
    endpoint: (els.llmEndpointInput?.value.trim() || llmConfig.endpoint || ""),
    model: normalizeLlmModel(els.llmModelInput?.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  interviewSession = createInterviewOnboardingSession({ language: interviewLanguage, mode });
  updateInterviewStatus("onboarding");

  const useZh = interviewLanguage !== "en";
  const modeLabel = useZh
    ? (interviewModeDefs[mode]?.labelZh || "训练练习")
    : (interviewModeDefs[mode]?.labelEn || "Practice");
  const langLabel = useZh ? "中文" : "English";
  appendInterviewMessage("coach", useZh
    ? `好的，本场用${langLabel}进行${modeLabel}。下面我快速问你几个设置。`
    : `Great — this session is ${modeLabel} in ${langLabel}. Let me ask a few quick settings.`);
  askInterviewOnboardingStep("focus");
  persistInterviewSessionSnapshot();
}

function createInterviewOnboardingSession(opts = {}) {
  const presetLanguage = opts.language === "en" ? "en" : opts.language === "zh" ? "zh" : interviewLanguage;
  const presetMode = interviewModeDefs[opts.mode] ? opts.mode : "practice";
  return {
    id: makeId(),
    phase: "onboarding",
    mode: presetMode,
    type: "technical",
    source: getInterviewSource(),
    answerMode: "chat",
    sessionConfig: {
      language: presetLanguage,
      mode: presetMode,
      focusKey: "",
      focusTags: [],
      difficulty: "",
      questionCount: 0,
      durationMinutes: 0,
      persona: "",
      ttsEnabled: true,
      source: getInterviewSource()
    },
    onboardingStep: "focus",
    questions: [],
    currentIndex: -1,
    currentProblem: null,
    awaitingNext: false,
    completed: false,
    questionResults: [],
    questionConversations: [],
    latestScoredIndex: -1,
    startedAt: new Date().toISOString()
  };
}

function isInterviewOnboarding() {
  return interviewSession?.phase === "onboarding";
}

function isInterviewLiveMode() {
  return interviewSession?.mode === "live" || interviewSession?.sessionConfig?.mode === "live";
}

function isCurrentOnboardingStep(step) {
  return Boolean(isInterviewOnboarding() && interviewSession.onboardingStep === step);
}

function askInterviewOnboardingStep(step) {
  if (!interviewSession) return;
  interviewSession.onboardingStep = step;
  const prompt = getInterviewOnboardingPrompt(step);
  appendInterviewMessage("coach", prompt.text, {
    actions: prompt.actions,
    actionStep: step,
    typewriter: step !== "language"
  });
  updateInterviewStatus("onboarding");
  persistInterviewSessionSnapshot();
}

function getInterviewOnboardingPrompt(step) {
  const uiLanguage = step === "language" ? getLanguage() : interviewLanguage;
  const useZh = uiLanguage !== "en";
  const modeOptions = Object.entries(interviewModeDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn,
    description: useZh ? item.descriptionZh : item.descriptionEn
  }));
  const focusOptions = Object.entries(interviewFocusDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));
  const difficultyOptions = Object.entries(interviewDifficultyDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));
  const personaOptions = Object.entries(interviewPersonaDefs).map(([value, item]) => ({
    value,
    label: useZh ? item.labelZh : item.labelEn
  }));

  const prompts = {
    language: {
      text: useZh ? "今天的面试想用什么语言？" : "Which language should we use for this interview?",
      actions: [
        { value: "zh", label: "中文" },
        { value: "en", label: "English" }
      ]
    },
    mode: {
      text: useZh ? "好的，本场我会全程使用中文。你想进行真实模拟面试，还是训练练习？" : "Great. Should this be a live mock interview or a practice session?",
      actions: modeOptions
    },
    focus: {
      text: useZh ? "今天主要想练哪一类题？" : "What should we focus on today?",
      actions: focusOptions
    },
    difficulty: {
      text: useZh ? "难度希望设成什么？" : "What difficulty should I use?",
      actions: difficultyOptions
    },
    scope: {
      text: useZh ? "这场想做多少题，或者按时长来？" : "How many questions, or should we run by time?",
      actions: [
        { value: "3", label: useZh ? "3 题" : "3 questions" },
        { value: "5", label: useZh ? "5 题" : "5 questions" },
        { value: "10", label: useZh ? "10 题" : "10 questions" },
        { value: "30m", label: useZh ? "30 分钟" : "30 minutes" }
      ]
    },
    persona: {
      text: useZh ? "你希望面试官是什么风格？" : "What interviewer style do you want?",
      actions: personaOptions
    },
    tts: {
      text: useZh ? "最后一个设置：要不要开启读题？" : "Last setting: should I read questions aloud?",
      actions: [
        { value: "on", label: useZh ? "开启读题" : "Read aloud" },
        { value: "off", label: useZh ? "关闭读题" : "Text only" }
      ]
    }
  };
  return prompts[step] || prompts.language;
}

async function handleOnboardingAnswer(value) {
  if (!isInterviewOnboarding()) return false;
  const step = interviewSession.onboardingStep || "language";
  const parsed = parseInterviewOnboardingAnswer(step, value);
  if (!parsed.ok) {
    appendInterviewMessage("system", parsed.message, { typewriter: false });
    return true;
  }

  appendInterviewMessage("user", parsed.label, { typewriter: false });
  applyInterviewOnboardingAnswer(step, parsed);
  const nextStep = getNextInterviewOnboardingStep(step);
  if (nextStep) {
    askInterviewOnboardingStep(nextStep);
  } else {
    await finalizeInterviewOnboarding();
  }
  return true;
}

function parseInterviewOnboardingAnswer(step, value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  const useZh = interviewLanguage !== "en";
  const fail = () => ({
    ok: false,
    message: useZh ? "我没有完全识别这个设置。可以点一下快捷选项，或换一种说法。" : "I could not read that setting. Use a quick option or phrase it another way."
  });

  if (step === "language") {
    if (/^(en|english)$/i.test(lower) || /英/.test(raw)) return { ok: true, value: "en", label: "English" };
    if (/^(zh|cn|chinese|中文)$/i.test(lower) || /中/.test(raw)) return { ok: true, value: "zh", label: "中文" };
    return fail();
  }

  if (step === "mode") {
    if (/live|real|mock|真实|正式|模拟真实/.test(lower) || /真实|正式/.test(raw)) {
      const item = interviewModeDefs.live;
      return { ok: true, value: "live", label: useZh ? item.labelZh : item.labelEn };
    }
    if (/practice|train|练习|训练|刷题/.test(lower) || /练习|训练/.test(raw)) {
      const item = interviewModeDefs.practice;
      return { ok: true, value: "practice", label: useZh ? item.labelZh : item.labelEn };
    }
    if (interviewModeDefs[lower]) {
      const item = interviewModeDefs[lower];
      return { ok: true, value: lower, label: useZh ? item.labelZh : item.labelEn };
    }
    return fail();
  }

  if (step === "focus") {
    const directFocus = Object.keys(interviewFocusDefs).find((key) => key.toLowerCase() === lower);
    if (directFocus) {
      const item = interviewFocusDefs[directFocus];
      return { ok: true, value: directFocus, label: useZh ? item.labelZh : item.labelEn };
    }
    const aliases = {
      mixed: ["mixed", "mix", "综合", "混合", "随机"],
      probability: ["probability", "statistics", "stats", "概率", "统计"],
      algorithms: ["algorithm", "algorithms", "leetcode", "oa", "算法"],
      ml: ["ml", "machine learning", "deep learning", "机器学习", "深度学习"],
      market: ["market", "trading", "市场", "交易", "直觉"],
      marketMaking: ["market making", "making", "做市", "bid", "ask"],
      behavioral: ["behavioral", "behavior", "行为", "star"],
      resume: ["resume", "cv", "简历"],
      research: ["research", "project", "研究", "项目深挖", "论文"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = interviewFocusDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "difficulty") {
    const aliases = {
      easy: ["easy", "简单", "基础"],
      medium: ["medium", "中等", "普通"],
      hard: ["hard", "困难", "高难", "难"],
      adaptive: ["adaptive", "自适应", "动态"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = interviewDifficultyDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "scope") {
    const number = Number((lower.match(/\d+/) || [])[0]);
    if (/30m|minute|minutes|分钟|时长/.test(lower) || /分钟|时长/.test(raw)) {
      return { ok: true, value: { durationMinutes: number || 30, questionCount: 0 }, label: useZh ? `${number || 30} 分钟` : `${number || 30} minutes` };
    }
    if (Number.isFinite(number) && number > 0) {
      const questionCount = Math.round(clampNumber(number, 1, 12));
      return { ok: true, value: { questionCount, durationMinutes: 0 }, label: useZh ? `${questionCount} 题` : `${questionCount} questions` };
    }
    return fail();
  }

  if (step === "persona") {
    const aliases = {
      friendly: ["friendly", "kind", "友好", "引导", "温和"],
      neutral: ["neutral", "professional", "中性", "专业"],
      pressure: ["pressure", "stress", "fast", "高压", "快节奏", "严格"]
    };
    const match = Object.entries(aliases).find(([key, words]) => key === lower || words.some((word) => lower.includes(word) || raw.includes(word)));
    if (!match) return fail();
    const item = interviewPersonaDefs[match[0]];
    return { ok: true, value: match[0], label: useZh ? item.labelZh : item.labelEn };
  }

  if (step === "tts") {
    const enabled = !(/off|no|false|关闭|不要|不用|文字/.test(lower) || /关闭|不要|不用|文字/.test(raw));
    return { ok: true, value: enabled, label: enabled ? (useZh ? "开启读题" : "Read aloud") : (useZh ? "关闭读题" : "Text only") };
  }

  return fail();
}

function applyInterviewOnboardingAnswer(step, parsed) {
  const config = interviewSession.sessionConfig || {};
  if (step === "language") {
    interviewLanguage = parsed.value;
    config.language = parsed.value;
    syncInterviewLanguageControls();
  } else if (step === "mode") {
    config.mode = parsed.value;
    interviewSession.mode = parsed.value;
  } else if (step === "focus") {
    const focus = interviewFocusDefs[parsed.value] || interviewFocusDefs.mixed;
    config.focusKey = parsed.value;
    config.focusTags = [parsed.value, ...(focus.categories || [])];
    interviewSession.type = focus.type || "technical";
    if (els.interviewTypeSelect) els.interviewTypeSelect.value = interviewSession.type;
    selectedInterviewCategories = new Set(focus.categories?.length ? focus.categories : ["all"]);
  } else if (step === "difficulty") {
    config.difficulty = parsed.value;
  } else if (step === "scope") {
    config.questionCount = parsed.value.questionCount || 0;
    config.durationMinutes = parsed.value.durationMinutes || 0;
    if (config.questionCount && els.interviewQuestionCount) els.interviewQuestionCount.value = String(config.questionCount);
    if (config.durationMinutes && els.interviewQuestionTime) els.interviewQuestionTime.value = String(Math.max(3, Math.round(config.durationMinutes / 5)));
  } else if (step === "persona") {
    config.persona = parsed.value;
  } else if (step === "tts") {
    config.ttsEnabled = parsed.value;
  }
  interviewSession.sessionConfig = config;
  updateInterviewSetupVisibility();
  renderInterviewQuestionPanel();
}

function getNextInterviewOnboardingStep(step) {
  const index = interviewOnboardingSteps.indexOf(step);
  return index >= 0 ? interviewOnboardingSteps[index + 1] || "" : "";
}

async function finalizeInterviewOnboarding() {
  if (!interviewSession) return;
  const config = normalizeInterviewSessionConfig(interviewSession.sessionConfig || {});
  interviewSession.sessionConfig = config;
  interviewSession.mode = config.mode;
  interviewSession.type = getInterviewTypeForConfig(config);
  interviewSession.source = config.source;
  interviewPreparing = true;
  updateInterviewStatus("loading");
  appendInterviewMessage("coach", formatInterviewConfigSummary(config));

  try {
    const count = getInterviewQuestionCountForConfig(config);
    const questions = config.source === "pdf"
      ? await buildPdfInterviewQuestions(count, interviewSession.type)
      : buildFullRangeInterviewQuestions(count, interviewSession.type, config);

    if (!questions.length) {
      appendInterviewMessage("system", interviewLanguage === "zh"
        ? "没有可用题目。请先添加题库，或切换到 PDF 生成题目。"
        : "No questions available. Add problems first or switch to PDF generation.");
      interviewPreparing = false;
      updateInterviewStatus("onboarding");
      return;
    }

    interviewSession = {
      ...interviewSession,
      phase: "running",
      type: interviewSession.type,
      source: config.source,
      answerMode: "chat",
      questionSeconds: getInterviewQuestionSecondsForConfig(config, count),
      questions,
      currentIndex: -1,
      currentProblem: null,
      awaitingNext: false,
      completed: false,
      answeredCurrent: false,
      questionResults: [],
      questionConversations: [],
      latestScoredIndex: -1,
      startedAt: interviewSession.startedAt || new Date().toISOString()
    };
    interviewPreparing = false;

    appendInterviewMessage("coach", interviewLanguage === "zh"
      ? "设置完成。我会按这个配置开始第一题。"
      : "Configuration is set. I will start with the first question.");
    startInterviewPrepCountdown(2);
  } catch (error) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? `准备模拟面试失败：${error.message || "请检查 LLM 代理是否启动。"}`
      : `Failed to prepare interview: ${error.message || "Check the LLM proxy."}`);
    interviewPreparing = false;
    updateInterviewStatus("onboarding");
  } finally {
    persistInterviewSessionSnapshot();
  }
}

function normalizeInterviewSessionConfig(raw = {}) {
  const focusKey = interviewFocusDefs[raw.focusKey] ? raw.focusKey : "mixed";
  const mode = interviewModeDefs[raw.mode] ? raw.mode : "practice";
  const difficulty = interviewDifficultyDefs[raw.difficulty] ? raw.difficulty : "adaptive";
  const persona = interviewPersonaDefs[raw.persona] ? raw.persona : "neutral";
  const questionCount = Math.round(clampNumber(raw.questionCount || getInterviewQuestionCount(), 1, 12));
  const durationMinutes = Math.round(clampNumber(raw.durationMinutes || 0, 0, 90));
  const focus = interviewFocusDefs[focusKey] || interviewFocusDefs.mixed;
  return {
    language: raw.language === "en" ? "en" : "zh",
    mode,
    focusKey,
    focusTags: [focusKey, ...(focus.categories || [])],
    difficulty,
    questionCount: durationMinutes ? 0 : questionCount,
    durationMinutes,
    persona,
    ttsEnabled: raw.ttsEnabled !== false,
    source: raw.source === "pdf" || getInterviewSource() === "pdf" ? "pdf" : "full"
  };
}

function getInterviewTypeForConfig(config = {}) {
  return interviewFocusDefs[config.focusKey]?.type || getInterviewType();
}

function getInterviewQuestionCountForConfig(config = {}) {
  if (config.durationMinutes) return Math.round(clampNumber(Math.ceil(config.durationMinutes / 6), 3, 10));
  return Math.round(clampNumber(config.questionCount || getInterviewQuestionCount(), 1, 12));
}

function getInterviewQuestionSecondsForConfig(config = {}, count = 1) {
  if (config.durationMinutes) return Math.max(120, Math.round((config.durationMinutes * 60) / Math.max(1, count)));
  return getInterviewQuestionSeconds();
}

function formatInterviewConfigSummary(config = {}) {
  const useZh = interviewLanguage !== "en";
  const focus = interviewFocusDefs[config.focusKey] || interviewFocusDefs.mixed;
  const difficulty = interviewDifficultyDefs[config.difficulty] || interviewDifficultyDefs.adaptive;
  const persona = interviewPersonaDefs[config.persona] || interviewPersonaDefs.neutral;
  const mode = interviewModeDefs[config.mode] || interviewModeDefs.practice;
  const scope = config.durationMinutes
    ? (useZh ? `${config.durationMinutes} 分钟` : `${config.durationMinutes} minutes`)
    : (useZh ? `${config.questionCount || getInterviewQuestionCount()} 题` : `${config.questionCount || getInterviewQuestionCount()} questions`);
  return useZh
    ? `本场设置：${mode.labelZh}，方向 ${focus.labelZh}，难度 ${difficulty.labelZh}，${scope}，风格 ${persona.labelZh}。`
    : `Session setup: ${mode.labelEn}, focus ${focus.labelEn}, difficulty ${difficulty.labelEn}, ${scope}, ${persona.labelEn} style.`;
}

function syncInterviewLanguageControls() {
  document.querySelectorAll("[data-interview-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.interviewLang === interviewLanguage);
  });
}

function buildFullRangeInterviewQuestions(count, type, config = {}) {
  const pool = makeInterviewProblemPool(type, config);
  const difficultyPool = filterInterviewPoolByDifficulty(pool, config.difficulty);
  const selectedProblem = pool.find((problem) => problem.id === selectedInterviewProblemId);
  const sampled = sampleInterviewQuestions(
    selectedProblem ? difficultyPool.filter((problem) => problem.id !== selectedProblem.id) : difficultyPool,
    selectedProblem ? Math.max(0, count - 1) : count
  );
  return (selectedProblem ? [selectedProblem, ...sampled] : sampled).map((problem) => normalizeProblem(problem));
}

function filterInterviewPoolByDifficulty(pool, difficulty = "") {
  const values = interviewDifficultyDefs[difficulty]?.values || [];
  if (!values.length) return pool;
  const filtered = pool.filter((problem) => values.includes(String(problem.difficulty || "").trim()));
  return filtered.length >= 2 ? filtered : pool;
}

async function buildPdfInterviewQuestions(count, type) {
  const file = els.interviewPdfInput?.files?.[0];
  if (!file) throw new Error(interviewLanguage === "zh" ? "请先上传 PDF。" : "Upload a PDF first.");
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(interviewLanguage === "zh" ? "PDF 太大，请先控制在 20MB 内。" : "PDF is too large; keep it under 20MB.");
  }
  appendInterviewMessage("coach", interviewLanguage === "zh" ? "正在分析 PDF 并生成题目..." : "Analyzing PDF and generating questions...");
  const filePayload = await readFilePayload(file, { preferDataUrl: true });
  const data = await requestPdfQuestionGeneration(filePayload, count, type);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (data.summary) {
    updateInterviewMessage(interviewMessages[interviewMessages.length - 1]?.id, data.summary);
  }
  const normalized = questions.slice(0, count).map((item, index) => normalizeGeneratedInterviewProblem(item, index, file.name, type));
  if (normalized.length) upsertProblems(normalized);
  return normalized;
}

function sampleInterviewQuestions(pool, count) {
  const source = [...pool];
  for (let index = source.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [source[index], source[swapIndex]] = [source[swapIndex], source[index]];
  }
  return source.slice(0, count);
}

function normalizeGeneratedInterviewProblem(raw, index, sourceName, type) {
  const fallbackCategory = type === "behavioral" ? "market" : "probabilityExpectation";
  return normalizeProblem({
    ...raw,
    id: raw?.id || stableProblemId(`${sourceName}-${index}-${raw?.titleEn || raw?.titleZh || raw?.promptEn || raw?.promptZh || makeId()}`, sourceName),
    source: "pdf-interview",
    sourceUrl: "",
    category: normalizeCategory(raw?.category || fallbackCategory),
    difficulty: raw?.difficulty || "Medium",
    tags: [...new Set([...parseTags(raw?.tags || ""), "pdf", interviewTypeDefs[type]?.label || "interview"])],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function startInterviewPrepCountdown(seconds) {
  let remaining = seconds;
  setInterviewTimer(remaining);
  updateInterviewStatus("preparing");
  interviewPrepTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(interviewPrepTimer);
      interviewPrepTimer = null;
      showInterviewQuestion(0);
      return;
    }
    setInterviewTimer(remaining);
  }, 1000);
}

function showInterviewQuestion(index) {
  if (!interviewSession || index >= interviewSession.questions.length) {
    completeInterview();
    return;
  }
  clearInterviewQuestionTimer();
  const problem = interviewSession.questions[index];
  interviewSession.currentIndex = index;
  interviewSession.currentProblem = problem;
  interviewSession.awaitingNext = false;
  interviewSession.answeredCurrent = false;
  interviewSession.remainingSeconds = interviewSession.questionSeconds;
  interviewSession.questionConversations = interviewSession.questionConversations || [];
  interviewSession.questionConversations[index] = {
    turns: [],
    followupCount: 0,
    maxFollowups: getInterviewMaxFollowups(problem),
    interviewerSatisfied: false,
    status: "answering"
  };
  interviewPanelExpandedIndex = index;
  if (els.interviewAnswer) els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  autoSizeInterviewAnswer();

  const isFirstQuestion = index === 0;
  const totalQuestions = interviewSession.questions.length;
  const transition = interviewLanguage === "zh"
    ? (isFirstQuestion ? `我们开始吧，第 1 题（共 ${totalQuestions} 题）。` : "好，看下一题。")
    : (isFirstQuestion ? `Let's begin — question 1 of ${totalQuestions}.` : "Alright, here is the next question.");
  appendInterviewMessage("coach", transition);
  interviewSession.currentQuestionMessageId = appendInterviewMessage("system", formatInterviewQuestion(problem, index), { typewriter: false });
  const opening = isInterviewLiveMode()
    ? (interviewLanguage === "zh"
      ? "请开始作答。你可以先讲思路，我会根据你的回答继续追问。"
      : "Start your answer. Walk me through your thinking; I will ask follow-ups from there.")
    : (interviewLanguage === "zh"
      ? "请开始作答。可以先讲思路，再给结论。需要提示时点 Hint。"
      : "Start your answer. Explain your approach first, then give the conclusion. Use Hint if needed.");
  appendInterviewMessage("coach", opening);
  updateInterviewStatus("active");
  setInterviewTimer(interviewSession.remainingSeconds);
  interviewQuestionTimer = window.setInterval(() => {
    if (!interviewSession || interviewSession.completed) return;
    interviewSession.remainingSeconds -= 1;
    setInterviewTimer(interviewSession.remainingSeconds);
    if (interviewSession.remainingSeconds <= 0) {
      clearInterviewQuestionTimer();
      appendInterviewMessage("coach", interviewLanguage === "zh"
        ? (isInterviewLiveMode() ? "时间到。请用一句话收尾，或者直接提交已有回答。" : "时间到。你仍然可以提交当前回答，我会按已有内容评测。")
        : (isInterviewLiveMode() ? "Time is up. Please wrap up in one sentence or submit what you have." : "Time is up. You can still submit the current answer for evaluation."));
      updateInterviewStatus("timeup");
    }
  }, 1000);
  renderInterviewQuestionPanel();
  persistInterviewSessionSnapshot();
  els.interviewAnswer?.focus();
}

function prettyInterviewTitle(problem) {
  const raw = String(interviewLanguage === "zh"
    ? problem.titleZh || problem.titleEn
    : problem.titleEn || problem.titleZh || "").trim();
  // Strip book-import numbering like "Question 5.6 – futures ..." → "Futures ..."
  let cleaned = raw.replace(/^\s*(question|problem|题目|第)\s*[\d.]+\s*[-–—:：.]*\s*/i, "").trim();
  if (!cleaned || /^[\d.\s]+$/.test(cleaned)) {
    cleaned = formatCategoryLabel(problem.category) || (interviewLanguage === "zh" ? "面试题" : "Question");
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatInterviewQuestion(problem, index) {
  const title = prettyInterviewTitle(problem);
  const prompt = interviewLanguage === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
  return [
    `# Q${index + 1}/${interviewSession.questions.length} · ${interviewTypeDefs[interviewSession.type]?.label || "Interview"} · ${formatCategoryLabel(problem.category)} · ${problem.difficulty}`,
    "",
    `**${title}**`,
    "",
    prompt || "No prompt.",
    getProblemMediaMarkdown(problem, "prompt")
  ].filter(Boolean).join("\n");
}

function getProblemMediaMarkdown(problem, scope = "all") {
  const values = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      pushValue(value.url || value.src || value.href || value.dataUrl);
      return;
    }
    const url = String(value || "").trim();
    if (isSafeRichMediaUrl(url)) values.push(url);
  };

  if (scope === "prompt" || scope === "all") {
    ["image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl", "promptImage", "promptImages"].forEach((key) => pushValue(problem?.[key]));
  }
  if (scope === "answer" || scope === "all") {
    ["answerImage", "answerImages", "explanationImage", "explanationImages", "solutionImage", "solutionImages"].forEach((key) => pushValue(problem?.[key]));
  }

  return [...new Set(values)]
    .map((url, index) => `![${scope === "answer" ? "answer" : "problem"} image ${index + 1}](${url})`)
    .join("\n");
}

async function submitInterviewAnswer() {
  if (isInterviewOnboarding()) {
    const value = els.interviewAnswer?.value.trim() || "";
    if (!value) {
      els.interviewAnswer?.focus();
      return;
    }
    els.interviewAnswer.value = "";
    autoSizeInterviewAnswer();
    await handleOnboardingAnswer(value);
    return;
  }

  const problem = getSelectedProblem();
  if (!interviewSession || interviewSession.currentIndex < 0 || !problem) {
    appendInterviewMessage("system", interviewLanguage === "zh" ? "请先点击开始模拟。" : "Start the mock interview first.");
    return;
  }

  const answerPayload = await collectInterviewAnswer();
  if (!answerPayload.text && !answerPayload.attachment) {
    els.interviewAnswer.focus();
    return;
  }

  if (isInterviewLiveMode()) {
    await submitLiveInterviewTurn(problem, answerPayload);
    return;
  }

  await submitPracticeInterviewAnswer(problem, answerPayload);
}

async function submitPracticeInterviewAnswer(problem, answerPayload) {
  clearInterviewQuestionTimer();
  const displayAnswer = [
    answerPayload.text || "",
    answerPayload.attachment ? `[${interviewLanguage === "zh" ? "上传附件" : "Attachment"}: ${answerPayload.attachment.name}]` : ""
  ].filter(Boolean).join("\n");
  appendInterviewMessage("user", displayAnswer, {
    typewriter: false,
    attachments: answerPayload.attachment ? [answerPayload.attachment] : []
  });
  els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  autoSizeInterviewAnswer();
  const thinkingId = appendInterviewMessage("coach", "", { thinking: true });
  let feedback;

  try {
    const reply = await requestInterviewFeedback(problem, answerPayload.text, answerPayload.attachment);
    feedback = normalizeInterviewFeedback(reply, problem, answerPayload.text);
  } catch {
    feedback = normalizeInterviewFeedback(localInterviewFeedback(problem, answerPayload.text), problem, answerPayload.text);
  }
  updateInterviewMessage(thinkingId, feedback.text);

  recordInterviewPractice(problem, feedback);
  interviewSession.answeredCurrent = true;
  persistInterviewSessionSnapshot();
  renderInterviewQuestionPanel();
  const isLast = interviewSession.currentIndex >= interviewSession.questions.length - 1;
  if (isLast) {
    completeInterview();
  } else {
    interviewSession.awaitingNext = true;
    updateInterviewStatus("awaitingNext");
  }
}

async function submitLiveInterviewTurn(problem, answerPayload) {
  if (interviewSession.submitting) return;
  interviewSession.submitting = true;
  const conversation = getCurrentInterviewConversation();
  conversation.status = "followup";
  const displayAnswer = [
    answerPayload.text || "",
    answerPayload.attachment ? `[${interviewLanguage === "zh" ? "上传附件" : "Attachment"}: ${answerPayload.attachment.name}]` : ""
  ].filter(Boolean).join("\n");
  appendInterviewMessage("user", displayAnswer, {
    typewriter: false,
    attachments: answerPayload.attachment ? [answerPayload.attachment] : []
  });
  conversation.turns.push({ role: "user", text: answerPayload.text || "", attachment: summarizeAttachment(answerPayload.attachment) });
  els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  autoSizeInterviewAnswer();
  updateInterviewActionPanel();
  const thinkingId = appendInterviewMessage("coach", "", { thinking: true });

  try {
    const reply = await requestInterviewConverse(problem, answerPayload, conversation);
    const normalized = normalizeInterviewConverseReply(reply, problem, conversation);
    conversation.turns.push({ role: "coach", text: normalized.message });
    conversation.coverage = normalized.coverage;
    conversation.missing = normalized.missing;
    conversation.runningAssessment = normalized.runningAssessment;
    conversation.followupCount += normalized.action === "followup" ? 1 : 0;
    const shouldWrap = normalized.action === "wrap" || (normalized.action === "followup" && conversation.followupCount > conversation.maxFollowups);
    conversation.status = shouldWrap ? "wrapped" : "followup";
    conversation.interviewerSatisfied = shouldWrap;
    updateInterviewMessage(thinkingId, normalized.message, { typewriter: true });

    if (shouldWrap) {
      clearInterviewQuestionTimer();
      interviewSession.answeredCurrent = true;
      recordLiveInterviewQuestionResult(problem, conversation);
      const isLast = interviewSession.currentIndex >= interviewSession.questions.length - 1;
      if (isLast) {
        completeInterview();
      } else {
        interviewSession.awaitingNext = true;
        updateInterviewStatus("awaitingNext");
      }
    } else {
      updateInterviewStatus("active");
    }
  } catch {
    const fallback = normalizeInterviewConverseReply(localInterviewConverse(problem, conversation), problem, conversation);
    conversation.turns.push({ role: "coach", text: fallback.message });
    conversation.followupCount += fallback.action === "followup" ? 1 : 0;
    conversation.runningAssessment = fallback.runningAssessment;
    conversation.missing = fallback.missing;
    const shouldWrap = fallback.action === "wrap" || (fallback.action === "followup" && conversation.followupCount > conversation.maxFollowups);
    conversation.status = shouldWrap ? "wrapped" : "followup";
    updateInterviewMessage(thinkingId, fallback.message, { typewriter: true });
    if (shouldWrap) {
      clearInterviewQuestionTimer();
      interviewSession.answeredCurrent = true;
      recordLiveInterviewQuestionResult(problem, conversation);
      const isLast = interviewSession.currentIndex >= interviewSession.questions.length - 1;
      if (isLast) {
        completeInterview();
      } else {
        interviewSession.awaitingNext = true;
        updateInterviewStatus("awaitingNext");
      }
    }
  } finally {
    interviewSession.submitting = false;
    renderInterviewQuestionPanel();
    updateInterviewActionPanel();
    persistInterviewSessionSnapshot();
  }
}

async function collectInterviewAnswer() {
  const text = els.interviewAnswer.value.trim();
  const file = els.interviewAnswerFile?.files?.[0];
  if (!file) return { text, attachment: null };
  const attachment = await readFilePayload(file, { preferDataUrl: isBinaryInterviewAttachment(file) });
  return { text, attachment };
}

async function readFilePayload(file, options = {}) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = isImageFile(file);
  const preferDataUrl = options.preferDataUrl || isPdf;
  const content = preferDataUrl ? await readFileAsDataUrl(file) : await readFileAsText(file);
  return {
    name: file.name,
    type: file.type || (isPdf ? "application/pdf" : isImage ? "image/*" : "text/plain"),
    size: file.size,
    dataUrl: preferDataUrl ? content : "",
    text: preferDataUrl ? "" : String(content || "").slice(0, 80_000)
  };
}

function isImageFile(file) {
  return Boolean(file && (String(file.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || "")));
}

function isImageAttachment(attachment) {
  return Boolean(attachment && (String(attachment.type || "").startsWith("image/") || /^data:image\//i.test(attachment.dataUrl || "") || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.name || "")));
}

function isBinaryInterviewAttachment(file) {
  return Boolean(file && (isImageFile(file) || file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")));
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsDataURL(file);
  });
}

async function requestInterviewFeedback(problem, answer, attachment = null) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");

  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "evaluate",
      model: llmConfig.model,
      language: interviewLanguage,
      interviewType: interviewSession?.type || getInterviewType(),
      questionIndex: interviewSession?.currentIndex || 0,
      questionCount: interviewSession?.questions?.length || 1,
      problem,
      transcript: getSerializableInterviewTranscript(),
      answer,
      answerAttachment: attachment
    })
  });

  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  return data.feedback || data.reply || data.text || data || localInterviewFeedback(problem, answer);
}

async function requestInterviewConverse(problem, answerPayload, conversation) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "converse",
      model: llmConfig.model,
      language: interviewLanguage,
      mode: interviewSession?.mode || "live",
      sessionConfig: interviewSession?.sessionConfig || {},
      interviewType: interviewSession?.type || getInterviewType(),
      questionIndex: interviewSession?.currentIndex || 0,
      questionCount: interviewSession?.questions?.length || 1,
      problem,
      groundTruth: {
        answer: getLocalizedProblemField(problem, "answer", interviewLanguage === "en"),
        explanation: getLocalizedProblemField(problem, "explanation", interviewLanguage === "en")
      },
      turns: conversation.turns || [],
      followupCount: conversation.followupCount || 0,
      maxFollowups: conversation.maxFollowups || getInterviewMaxFollowups(problem),
      timeRemaining: interviewSession?.remainingSeconds || 0,
      persona: interviewPersonaDefs[interviewSession?.sessionConfig?.persona || "neutral"]?.prompt || "",
      latestAnswer: answerPayload.text || "",
      answerAttachment: answerPayload.attachment || null
    })
  });

  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  return data.reply || data.conversation || data;
}

function getCurrentInterviewConversation() {
  const index = Math.max(0, interviewSession?.currentIndex || 0);
  interviewSession.questionConversations = interviewSession.questionConversations || [];
  if (!interviewSession.questionConversations[index]) {
    interviewSession.questionConversations[index] = {
      turns: [],
      followupCount: 0,
      maxFollowups: getInterviewMaxFollowups(getSelectedProblem()),
      interviewerSatisfied: false,
      status: "answering"
    };
  }
  return interviewSession.questionConversations[index];
}

function getInterviewMaxFollowups(problem = {}) {
  const category = normalizeCategory(problem.category);
  const difficulty = String(problem.difficulty || "").toLowerCase();
  const configDifficulty = interviewSession?.sessionConfig?.difficulty || "";
  if (configDifficulty === "easy" || difficulty === "easy") return 2;
  if (configDifficulty === "hard" || difficulty === "hard") return category === "mentalMath" ? 2 : 4;
  return category === "market" || category === "statistics" || category === "machineLearning" ? 3 : 2;
}

function normalizeInterviewConverseReply(input, problem, conversation) {
  const fallback = localInterviewConverse(problem, conversation);
  const source = typeof input === "string" ? parseLooseInterviewConverseText(input) : (input || {});
  const action = source.action === "wrap" || source.action === "followup" ? source.action : fallback.action;
  const message = String(source.message || source.reply || source.text || fallback.message || "").trim();
  return {
    action,
    message,
    coverage: Array.isArray(source.coverage) ? source.coverage.map(String).slice(0, 6) : fallback.coverage,
    missing: Array.isArray(source.missing) ? source.missing.map(String).slice(0, 6) : fallback.missing,
    runningAssessment: String(source.runningAssessment || source.assessment || fallback.runningAssessment || "").trim()
  };
}

function parseLooseInterviewConverseText(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    return {
      action: /wrap|收尾|下一题|move on/i.test(raw) ? "wrap" : "followup",
      message: raw
    };
  }
}

function localInterviewConverse(problem, conversation = {}) {
  const missing = getLocalInterviewMissingSignals(problem, (conversation.turns || []).map((turn) => turn.text).join(" "));
  const shouldWrap = (conversation.followupCount || 0) >= Math.max(1, (conversation.maxFollowups || 2) - 1);
  if (shouldWrap) {
    return {
      action: "wrap",
      message: interviewLanguage === "zh"
        ? "好的，这题先到这里。我们进入下一题。"
        : "Good, we will stop this question here and move on.",
      coverage: [],
      missing,
      runningAssessment: missing.length
        ? (interviewLanguage === "zh" ? `仍缺少：${missing.join("、")}` : `Still missing: ${missing.join(", ")}`)
        : (interviewLanguage === "zh" ? "回答已覆盖主要方向。" : "The answer covered the main direction.")
    };
  }
  if (isBehavioralLikeProblem(problem)) {
    const followups = interviewLanguage === "zh"
      ? [
        "能给一个具体例子吗？请说清楚当时背景、你的动作和结果。",
        "这个结果怎么衡量？如果没有数字，有什么证据说明它真的有影响？",
        "复盘来看，如果重来一次，你会改变哪一步？"
      ]
      : [
        "Can you give one concrete example with context, your action, and the result?",
        "How did you measure the outcome? If there is no metric, what evidence shows impact?",
        "Looking back, what would you change if you did it again?"
      ];
    return {
      action: "followup",
      message: followups[Math.min(followups.length - 1, conversation.followupCount || 0)],
      coverage: [],
      missing,
      runningAssessment: interviewLanguage === "zh" ? "需要更具体的行为证据。" : "Needs more specific behavioral evidence."
    };
  }
  const category = normalizeCategory(problem.category);
  const followups = {
    leetcode: interviewLanguage === "zh" ? "请把时间复杂度、空间复杂度和关键数据结构说清楚。" : "Clarify the time complexity, space complexity, and core data structure.",
    probabilityExpectation: interviewLanguage === "zh" ? "请明确随机变量和条件概率结构，再继续推导。" : "Define the random variables and conditioning structure, then continue.",
    statistics: interviewLanguage === "zh" ? "请说明样本、估计量或检验假设，以及你如何验证结论。" : "State the sample, estimator or hypothesis, and how you would validate the conclusion.",
    machineLearning: interviewLanguage === "zh" ? "请补充特征、验证方式和如何避免 leakage。" : "Add features, validation, and how you would avoid leakage.",
    deepLearning: interviewLanguage === "zh" ? "请说明输入输出、loss 和训练信号。" : "Clarify inputs, outputs, loss, and training signal.",
    market: interviewLanguage === "zh" ? "请把 fair value、spread 和 inventory risk 的关系讲清楚。" : "Clarify the relationship between fair value, spread, and inventory risk.",
    option: interviewLanguage === "zh" ? "请补充 Greeks、波动率或对冲频率会如何影响答案。" : "Add how Greeks, volatility, or hedge frequency affects the answer.",
    mentalMath: interviewLanguage === "zh" ? "请用更快的数量级估算方式重算一遍。" : "Redo it with a faster order-of-magnitude estimate."
  };
  return {
    action: "followup",
    message: followups[category] || (interviewLanguage === "zh" ? "请更具体一点：你的关键假设是什么？" : "Be more specific: what is your key assumption?"),
    coverage: [],
    missing,
    runningAssessment: interviewLanguage === "zh" ? "需要继续追问。" : "Needs another follow-up."
  };
}

function recordLiveInterviewQuestionResult(problem, conversation = {}) {
  const currentIndex = interviewSession?.currentIndex ?? -1;
  if (currentIndex < 0) return;
  const answer = (conversation.turns || []).filter((turn) => turn.role === "user").map((turn) => turn.text).join(" ");
  const structured = localStructuredInterviewFeedback(problem, answer);
  interviewSession.questionResults = interviewSession.questionResults || [];
  interviewSession.questionResults[currentIndex] = {
    score: structured.overall,
    evaluation: conversation.runningAssessment || structured.summary,
    dimensions: structured.dimensions,
    missing: conversation.missing || structured.missing,
    nextStep: structured.nextStep,
    status: conversation.status || "wrapped",
    liveHidden: true,
    scoredAt: new Date().toISOString(),
    fresh: false
  };
}

function summarizeAttachment(attachment) {
  if (!attachment) return null;
  return {
    name: attachment.name || "",
    type: attachment.type || "",
    size: attachment.size || 0
  };
}

function getSerializableInterviewTranscript() {
  return interviewMessages
    .filter((message) => !message.thinking)
    .map((message) => ({
      role: message.role,
      text: String(message.text || message.displayText || "").slice(0, 6000),
      attachments: (message.attachments || []).map((attachment) => ({
        name: attachment.name || "",
        type: attachment.type || "",
        size: attachment.size || 0
      }))
    }));
}

async function requestPdfQuestionGeneration(filePayload, count, type) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "generate_pdf_questions",
      model: llmConfig.model,
      language: interviewLanguage,
      interviewType: type,
      count,
      file: filePayload
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  return response.json();
}

async function requestInterviewHint() {
  if (isInterviewLiveMode() || isInterviewOnboarding()) {
    appendInterviewMessage("system", interviewLanguage === "zh" ? "真实面试模式中不会提供 Hint。" : "Hints are not available during live mock mode.");
    return;
  }
  const problem = getSelectedProblem();
  if (!problem) return;
  const thinkingId = appendInterviewMessage("coach", interviewLanguage === "zh" ? "生成 hint 中..." : "Generating hint...");
  try {
    const hint = await requestInterviewHintFromApi(problem, els.interviewAnswer.value.trim());
    updateInterviewMessage(thinkingId, hint, { typewriter: true });
  } catch {
    updateInterviewMessage(thinkingId, localInterviewHint(problem), { typewriter: true });
  }
}

async function requestInterviewHintFromApi(problem, partialAnswer) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "hint",
      model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model),
      language: interviewLanguage,
      interviewType: interviewSession?.type || getInterviewType(),
      problem,
      transcript: interviewMessages,
      partialAnswer
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  return data.hint || data.reply || data.text || localInterviewHint(problem);
}

function localStructuredInterviewFeedback(problem, answer) {
  const missing = getLocalInterviewMissingSignals(problem, answer);
  const score = scoreLocalInterviewAnswer(answer, missing.length);
  const evaluation = getLocalInterviewEvaluation(answer, missing);
  const reference = getInterviewReferenceSummary(problem);
  const nextStep = missing.length
    ? [interviewLanguage === "zh" ? `补齐 ${missing.join("、")}，再用 60 秒重讲一遍。` : `Add ${missing.join(", ")} and restate the answer in 60 seconds.`]
    : [interviewLanguage === "zh" ? "把最终结论提前，并补一句复杂度、风险或边界条件。" : "Lead with the final conclusion and add one complexity, risk, or edge-case line."];
  const dimensionBase = Math.round(clampNumber(score / 20, 1, 5));
  return {
    overall: score,
    summary: evaluation,
    dimensions: {
      correctness: { score: clampNumber(dimensionBase - (missing.length ? 1 : 0), 1, 5), comment: missing.length ? missing[0] : (interviewLanguage === "zh" ? "核心方向覆盖。" : "Core direction covered.") },
      reasoning: { score: dimensionBase, comment: interviewLanguage === "zh" ? "推理需要显式写出关键步骤。" : "Make the key steps explicit." },
      communication: { score: Math.min(5, dimensionBase + 1), comment: interviewLanguage === "zh" ? "先结论后展开会更像面试答案。" : "Lead with the conclusion, then expand." },
      speed: { score: dimensionBase, comment: interviewLanguage === "zh" ? "保持 60 秒版本。" : "Keep a 60-second version ready." },
      readiness: { score: dimensionBase, comment: interviewLanguage === "zh" ? "可进入下一轮，但仍需补齐要点。" : "Usable with some missing details." }
    },
    missing,
    interviewerConcern: missing.length
      ? (interviewLanguage === "zh" ? `真实面试中会担心：${missing.join("、")}没有说清。` : `A real interviewer may worry that ${missing.join(", ")} was not clear.`)
      : (interviewLanguage === "zh" ? "真实面试中主要风险是结论不够前置。" : "The main interview risk is not leading with the conclusion."),
    referenceDelta: reference,
    nextStep
  };
}

function localInterviewFeedback(problem, answer) {
  return formatStructuredInterviewFeedback(localStructuredInterviewFeedback(problem, answer));
}

function normalizeInterviewFeedback(input, problem, answer) {
  if (input && typeof input === "object") {
    const structured = normalizeStructuredInterviewFeedback(input.feedback || input, problem, answer);
    return {
      score: structured.overall,
      evaluation: structured.summary || parseInterviewFeedbackEvaluation(formatStructuredInterviewFeedback(structured)),
      dimensions: structured.dimensions,
      missing: structured.missing,
      interviewerConcern: structured.interviewerConcern,
      referenceDelta: structured.referenceDelta,
      nextStep: structured.nextStep,
      text: formatStructuredInterviewFeedback(structured)
    };
  }
  const raw = normalizeRichTextContent(input).trim();
  const local = localInterviewFeedback(problem, answer);
  const score = parseInterviewFeedbackScore(raw) ?? parseInterviewFeedbackScore(local) ?? 0;
  const evaluation = parseInterviewFeedbackEvaluation(raw) || parseInterviewFeedbackEvaluation(local);
  const displayText = raw || local;
  const hasScoreLine = parseInterviewFeedbackScore(displayText) != null;
  return {
    score,
    evaluation,
    text: hasScoreLine
      ? displayText
      : (interviewLanguage === "zh" ? `得分：${score}/100\n\n${displayText}` : `Score: ${score}/100\n\n${displayText}`)
  };
}

function normalizeStructuredInterviewFeedback(input, problem, answer) {
  const local = localStructuredInterviewFeedback(problem, answer);
  const source = input && typeof input === "object" ? input : {};
  const dimensions = source.dimensions && typeof source.dimensions === "object" ? source.dimensions : local.dimensions;
  return {
    overall: Math.round(clampNumber(source.overall ?? source.score ?? local.overall, 0, 100)),
    summary: String(source.summary || source.evaluation || local.summary || "").trim(),
    dimensions: normalizeInterviewDimensions(dimensions, local.dimensions),
    missing: Array.isArray(source.missing) ? source.missing.map(String).filter(Boolean).slice(0, 6) : local.missing,
    interviewerConcern: String(source.interviewerConcern || source.concern || local.interviewerConcern || "").trim(),
    referenceDelta: String(source.referenceDelta || source.reference || local.referenceDelta || "").trim(),
    nextStep: Array.isArray(source.nextStep) ? source.nextStep.map(String).filter(Boolean).slice(0, 4) : local.nextStep
  };
}

function normalizeInterviewDimensions(dimensions, fallback = {}) {
  const keys = ["correctness", "reasoning", "communication", "speed", "readiness"];
  return Object.fromEntries(keys.map((key) => {
    const item = dimensions?.[key] || fallback[key] || {};
    return [key, {
      score: Math.round(clampNumber(item.score ?? item.value ?? 3, 0, 5)),
      comment: String(item.comment || item.note || "").trim()
    }];
  }));
}

function formatStructuredInterviewFeedback(feedback = {}) {
  const useZh = interviewLanguage !== "en";
  const labels = {
    correctness: useZh ? "正确性" : "Correctness",
    reasoning: useZh ? "推理" : "Reasoning",
    communication: useZh ? "表达" : "Communication"
  };
  const dimensionLines = ["correctness", "reasoning", "communication"]
    .map((key) => {
      const item = feedback.dimensions?.[key] || {};
      return `- ${labels[key]}: ${Math.round(clampNumber(item.score, 0, 5))}/5`;
    });
  const missing = Array.isArray(feedback.missing) && feedback.missing.length
    ? feedback.missing.map((item) => `- ${item}`).join("\n")
    : (useZh ? "- 暂无明显缺失。" : "- No major missing piece.");
  return useZh
    ? [
      `得分：${Math.round(clampNumber(feedback.overall, 0, 100))}/100`,
      "",
      "维度分：",
      ...dimensionLines,
      "",
      `主要反馈：${feedback.summary || "回答已记录。"}`,
      "",
      "缺失要点：",
      missing
    ].join("\n")
    : [
      `Score: ${Math.round(clampNumber(feedback.overall, 0, 100))}/100`,
      "",
      "Dimensions:",
      ...dimensionLines,
      "",
      `Key feedback: ${feedback.summary || "Answer recorded."}`,
      "",
      "Missing pieces:",
      missing
    ].join("\n");
}

function parseInterviewFeedbackScore(text) {
  const source = String(text || "");
  const labeled = source.match(/(?:得分|评分|score)\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/i);
  const fallback = source.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const value = Number((labeled || fallback)?.[1]);
  if (!Number.isFinite(value)) return null;
  return Math.round(clampNumber(value, 0, 100));
}

function parseInterviewFeedbackEvaluation(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labeled = lines.find((line) => /^(评价|evaluation)\s*[:：]/i.test(line));
  const olderLine = lines.find((line) => /^(改进|fix|亮点|good)\s*[:：]/i.test(line));
  const fallback = lines.find((line) => !/^(得分|评分|score)\s*[:：]/i.test(line));
  return stripInterviewFeedbackLabel(labeled || olderLine || fallback || "").slice(0, 900);
}

function stripInterviewFeedbackLabel(text) {
  return String(text || "").replace(/^(评价|evaluation|改进|fix|亮点|good)\s*[:：]\s*/i, "").trim();
}

function getLocalInterviewMissingSignals(problem, answer) {
  const missing = [];
  if (isBehavioralLikeProblem(problem)) {
    if (!/(situation|task|action|result|star|背景|任务|行动|结果|我负责|我做|反思|learn|impact|影响)/i.test(answer)) {
      missing.push(interviewLanguage === "zh" ? "STAR 结构和个人责任" : "STAR structure and personal ownership");
    }
    if (!/(\d+|%|percent|baseline|metric|指标|提升|降低|节省|用户|收益|准确率|延迟|成本)/i.test(answer)) {
      missing.push(interviewLanguage === "zh" ? "具体证据或可量化结果" : "specific evidence or measurable result");
    }
    return missing;
  }
  const category = normalizeCategory(problem.category);
  if (category === "leetcode" && !/(o\(|time|space|复杂度|哈希|hash|dp|binary|二分)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "复杂度或关键数据结构" : "complexity or core data structure");
  }
  if (category === "probabilityExpectation" && !/(期望|概率|条件|bayes|expect|prob|conditional|sample space)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "随机变量或条件概率结构" : "random variable or conditioning structure");
  }
  if (category === "statistics" && !/(p-value|hypothesis|置信|检验|估计|regression|回归|sample|抽样)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "统计假设、估计或样本结构" : "statistical hypothesis, estimator, or sampling setup");
  }
  if (category === "machineLearning" && !/(feature|特征|validation|验证|overfit|过拟合|metric|指标|model|模型)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "特征、验证或指标" : "features, validation, or metrics");
  }
  if (category === "deepLearning" && !/(gradient|梯度|loss|attention|transformer|backprop|反向传播|neural|神经)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "梯度、loss 或网络结构" : "gradients, loss, or architecture");
  }
  if (category === "market" && !/(risk|inventory|spread|fair|风险|库存|价差|公允)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "风险、库存或价差" : "risk, inventory, or spread");
  }
  if (category === "option" && !/(delta|gamma|vega|theta|vol|iv|波动率|期权|对冲|hedge)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "Greeks、波动率或对冲逻辑" : "Greeks, volatility, or hedging logic");
  }
  return missing;
}

function isBehavioralLikeProblem(problem = {}) {
  const tags = Array.isArray(problem.tags) ? problem.tags.join(" ") : String(problem.tags || "");
  return interviewSession?.type === "behavioral"
    || /behavioral|resume|research|deep-dive|STAR/i.test(tags)
    || /^behavioral-|^resume-|^research-/i.test(String(problem.id || ""));
}

function scoreLocalInterviewAnswer(answer, missingCount) {
  const lengthBonus = Math.min(20, Math.round(String(answer || "").trim().length / 18));
  return Math.round(clampNumber(48 + lengthBonus - missingCount * 12, 20, 92));
}

function getLocalInterviewEvaluation(answer, missing) {
  if (!missing.length && String(answer || "").trim().length > 60) {
    return interviewLanguage === "zh"
      ? "核心方向已覆盖，再把边界条件和最终结论压得更清楚。"
      : "The core direction is covered; make the edge cases and final conclusion sharper.";
  }

  return interviewLanguage === "zh"
    ? `优先补上${missing.join("、") || "更明确的中间推导"}。`
    : `Prioritize ${missing.join(", ") || "clearer intermediate reasoning"}.`;
}

function getInterviewReferenceSummary(problem) {
  const isEn = interviewLanguage === "en";
  const raw = [
    getLocalizedProblemField(problem, "answer", isEn),
    getLocalizedProblemField(problem, "explanation", isEn)
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return interviewLanguage === "zh"
      ? "围绕题干建立变量、说明推导，再给出可验证结论。"
      : "Define the variables, explain the reasoning, then give a checkable conclusion.";
  }
  return raw.slice(0, interviewLanguage === "zh" ? 180 : 240);
}

function localInterviewHint(problem) {
  const category = normalizeCategory(problem.category);
  const hints = {
    leetcode: ["先说 brute force，再说如何优化。", "明确输入规模、时间复杂度和关键数据结构。"],
    pandasNumpy: ["先说明表结构和目标列。", "考虑 groupby、merge、pivot 或向量化。"],
    probabilityExpectation: ["先定义随机变量和样本空间。", "尝试条件期望或递推。"],
    statistics: ["先说假设、样本、估计量和评价指标。", "区分 correlation、causality 和 sampling bias。"],
    machineLearning: ["先定义 label、feature 和 validation。", "说明避免 leakage 和 overfitting 的方法。"],
    deepLearning: ["先说输入、输出、loss 和训练信号。", "如果有序列或注意力，明确 token/embedding 结构。"],
    market: ["从 fair value、spread、inventory risk 三个角度开始。", "把市场微观结构和风险约束讲清楚。"],
    option: ["先定位 payoff 和 Greeks。", "说明波动率、对冲频率和 tail risk。"],
    mentalMath: ["先做数量级估计。", "把复杂计算拆成百分比、平方或分数。"]
  };
  const pool = hints[category] || hints.probabilityExpectation;
  const translation = {
    "先说 brute force，再说如何优化。": "Start with brute force, then explain the optimization.",
    "明确输入规模、时间复杂度和关键数据结构。": "Clarify input size, time complexity, and the key data structure.",
    "先说明表结构和目标列。": "Start by describing the table schema and target columns.",
    "考虑 groupby、merge、pivot 或向量化。": "Consider groupby, merge, pivot, or vectorization.",
    "先定义随机变量和样本空间。": "Define the random variables and sample space first.",
    "尝试条件期望或递推。": "Try conditional expectation or recurrence.",
    "先说假设、样本、估计量和评价指标。": "State the hypothesis, sample, estimator, and evaluation metric.",
    "区分 correlation、causality 和 sampling bias。": "Separate correlation, causality, and sampling bias.",
    "先定义 label、feature 和 validation。": "Define labels, features, and validation.",
    "说明避免 leakage 和 overfitting 的方法。": "Explain how you avoid leakage and overfitting.",
    "先说输入、输出、loss 和训练信号。": "Start with input, output, loss, and training signal.",
    "如果有序列或注意力，明确 token/embedding 结构。": "For sequence or attention problems, clarify tokens and embeddings.",
    "从 fair value、spread、inventory risk 三个角度开始。": "Start from fair value, spread, and inventory risk.",
    "把市场微观结构和风险约束讲清楚。": "Make market microstructure and risk constraints explicit.",
    "先定位 payoff 和 Greeks。": "Identify payoff and Greeks first.",
    "说明波动率、对冲频率和 tail risk。": "Explain volatility, hedge frequency, and tail risk.",
    "先做数量级估计。": "Start with an order-of-magnitude estimate.",
    "把复杂计算拆成百分比、平方或分数。": "Break the calculation into percentages, squares, or fractions."
  };
  const hint = randomChoice(pool);
  return interviewLanguage === "zh" ? `Hint：${hint}` : `Hint: ${translation[hint] || hint}`;
}

function getCurrentQuestionMessages() {
  if (!interviewSession || interviewSession.currentIndex < 0) return [];
  const startId = interviewSession.currentQuestionMessageId;
  let startIndex = startId ? interviewMessages.findIndex((message) => message.id === startId) : -1;
  if (startIndex < 0) {
    const marker = `Q${interviewSession.currentIndex + 1}/`;
    startIndex = interviewMessages.findLastIndex((message) => message.role === "system" && String(message.text || "").startsWith(marker));
  }
  if (startIndex < 0) return [];

  const nextQuestionIndex = interviewMessages.findIndex((message, index) => (
    index > startIndex && message.role === "system" && /^Q\d+\//.test(String(message.text || ""))
  ));
  return interviewMessages
    .slice(startIndex, nextQuestionIndex < 0 ? undefined : nextQuestionIndex)
    .filter((message) => !message.thinking)
    .filter((message) => !/本题完成|Question complete|模拟面试结束|Mock interview complete/i.test(String(message.text || "")));
}

function getCurrentInterviewFavoriteSummary(messages, problem) {
  const title = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const feedback = [...messages].reverse().find((message) => (
    message.role === "coach"
    && !/本题完成|Question complete|请开始作答|Start your answer|评测中|Evaluating|生成 hint|Generating hint/i.test(String(message.text || ""))
  ));
  const firstLine = String(feedback?.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const evaluation = parseInterviewFeedbackEvaluation(feedback?.text || "");
  return `${title || "Untitled"}：${evaluation || firstLine || "已完成一轮面试复盘。"}`.slice(0, 180);
}

function saveCurrentInterviewFavorite() {
  const problem = getSelectedProblem();
  const messages = getCurrentQuestionMessages();
  if (!problem || !messages.length) return;

  const favorite = {
    id: makeId(),
    problemId: problem.id || "",
    title: interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh,
    category: normalizeCategory(problem.category),
    difficulty: problem.difficulty || "",
    summary: getCurrentInterviewFavoriteSummary(messages, problem),
    conversation: formatCurrentQuestionConversation(messages),
    createdAt: new Date().toISOString()
  };

  updateProblemState(problem.id, (current) => ({
    ...current,
    favorite: true,
    lastFavoriteAt: favorite.createdAt,
    favorites: [...(current.favorites || []), favorite].slice(-80)
  }));
  saveState();
  renderInterviewFavorites();
  flashButtonLabel(els.saveInterviewFavoriteBtn, interviewLanguage === "zh" ? "已收藏" : "Saved", interviewLanguage === "zh" ? "总结到收藏夹" : "Save");
}

async function shareCurrentInterviewQuestion() {
  const messages = getCurrentQuestionMessages();
  if (!messages.length) return;
  await copyText(formatCurrentQuestionConversation(messages));
  flashButtonLabel(els.shareInterviewQuestionBtn, interviewLanguage === "zh" ? "已复制" : "Copied", interviewLanguage === "zh" ? "分享" : "Share");
}

function formatCurrentQuestionConversation(messages) {
  const roleLabels = {
    system: interviewLanguage === "zh" ? "题目" : "Prompt",
    user: interviewLanguage === "zh" ? "我" : "Me",
    coach: "Coach"
  };
  return messages.map((message) => {
    const label = roleLabels[message.role] || message.role;
    return `[${label}]\n${String(message.text || message.displayText || "").trim()}`;
  }).join("\n\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function flashButtonLabel(button, temporaryText, defaultText) {
  if (!button) return;
  setButtonInlineLabel(button, temporaryText);
  window.setTimeout(() => setButtonInlineLabel(button, defaultText), 1500);
}

function setButtonInlineLabel(button, label) {
  const icon = button.querySelector("svg, i");
  button.textContent = "";
  if (icon) button.append(icon, document.createTextNode(` ${label}`));
  else button.textContent = label;
}

function recordInterviewPractice(problem, feedback = {}) {
  const category = normalizeCategory(problem.category);
  const xpGain = interviewSession?.type === "behavioral" ? 6 : 10;
  const practicedAt = new Date().toISOString();
  const entryId = makeId();
  const score = Number.isFinite(Number(feedback.score)) ? Math.round(clampNumber(Number(feedback.score), 0, 100)) : null;
  const evaluation = String(feedback.evaluation || "").trim();
  const currentIndex = interviewSession?.currentIndex ?? -1;
  state.skills[category] = Math.max(0, (state.skills[category] || 0) + xpGain);
  state.entries.push({
    id: entryId,
    date: practicedAt,
    text: [
      `模拟面试：${problem.titleZh || problem.titleEn}`,
      score == null ? "" : `得分 ${score}/100`
    ].filter(Boolean).join("，"),
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === category ? xpGain : 0])),
    totalXp: xpGain,
    duration: Math.round((interviewSession?.questionSeconds || 0) / 60),
    problemId: problem.id || "",
    interviewScore: score,
    interviewEvaluation: evaluation
  });
  updateProblemState(problem.id, (current) => ({
    ...current,
    interviewCount: Number(current.interviewCount || 0) + 1,
    lastPracticedAt: practicedAt,
    lastScore: score,
    lastScoreAt: practicedAt,
    lastEvaluation: evaluation,
    scoreHistory: score == null
      ? current.scoreHistory || []
      : [...(current.scoreHistory || []), {
        id: entryId,
        score,
        evaluation,
        scoredAt: practicedAt
      }].slice(-40)
  }));
  if (interviewSession && currentIndex >= 0) {
    interviewSession.questionResults = interviewSession.questionResults || [];
    interviewSession.questionResults = interviewSession.questionResults.map((item) => item ? { ...item, fresh: false } : item);
    interviewSession.questionResults[currentIndex] = {
      score,
      evaluation,
      dimensions: feedback.dimensions || null,
      missing: feedback.missing || [],
      nextStep: feedback.nextStep || [],
      scoredAt: practicedAt,
      fresh: score != null
    };
    interviewSession.latestScoredIndex = currentIndex;
  }
  saveState();
  renderSummary();
  renderSkills();
  renderHistory();
  renderProblems();
  renderInterviewQuestionPanel();
}

function goToNextInterviewQuestion() {
  if (!interviewSession || !interviewSession.awaitingNext) return;
  showInterviewQuestion(interviewSession.currentIndex + 1);
}

function completeInterview() {
  if (!interviewSession || interviewSession.completed) return;
  clearInterviewQuestionTimer();
  interviewSession.completed = true;
  interviewSession.awaitingNext = false;
  updateInterviewStatus("completed");
  const report = buildInterviewCompletionReport();
  // Persist this session for cross-session trends (after the report reads prior history).
  const scoredResults = (interviewSession.questionResults || []).filter((item) => Number.isFinite(Number(item?.score)));
  const sessionAverage = scoredResults.length
    ? Math.round(scoredResults.reduce((sum, item) => sum + Number(item.score || 0), 0) / scoredResults.length)
    : null;
  if (Number.isFinite(sessionAverage)) {
    const dims = {};
    summarizeInterviewDimensions(scoredResults).forEach((dimension) => { dims[dimension.key] = dimension.score; });
    saveCompletedInterviewToHistory({
      date: new Date().toISOString(),
      mode: interviewSession.mode,
      type: interviewSession.type,
      focusKey: interviewSession.sessionConfig?.focusKey || "",
      average: sessionAverage,
      dimensions: dims,
      questionCount: interviewSession.questions?.length || 0
    });
  }
  appendInterviewMessage("coach", report, { variant: "report", typewriter: false });
  launchInterviewConfetti();
  sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
  renderInterviewQuestionPanel();
}

async function restartInterviewWithSameConfig() {
  const config = normalizeInterviewSessionConfig(interviewSession?.sessionConfig || {});
  clearInterviewTimers();
  stopInterviewSpeech();
  interviewMessages = [];
  interviewPanelExpandedIndex = 0;
  interviewLanguage = config.language === "en" ? "en" : "zh";
  syncInterviewLanguageControls();
  const type = getInterviewTypeForConfig(config);
  interviewSession = {
    id: makeId(),
    phase: "running",
    mode: config.mode,
    type,
    source: config.source,
    answerMode: "chat",
    sessionConfig: config,
    questions: [],
    currentIndex: -1,
    currentProblem: null,
    awaitingNext: false,
    completed: false,
    answeredCurrent: false,
    questionResults: [],
    questionConversations: [],
    latestScoredIndex: -1,
    startedAt: new Date().toISOString()
  };
  interviewPreparing = true;
  updateInterviewStatus("loading");
  renderInterviewTranscript();
  try {
    const count = getInterviewQuestionCountForConfig(config);
    const questions = config.source === "pdf"
      ? await buildPdfInterviewQuestions(count, type)
      : buildFullRangeInterviewQuestions(count, type, config);
    if (!questions.length) {
      appendInterviewMessage("system", interviewLanguage === "zh"
        ? "没有可用题目，请调整设置后重试。"
        : "No questions available. Adjust settings and retry.");
      interviewPreparing = false;
      updateInterviewStatus("onboarding");
      return;
    }
    interviewSession = { ...interviewSession, questionSeconds: getInterviewQuestionSecondsForConfig(config, count), questions };
    interviewPreparing = false;
    appendInterviewMessage("coach", interviewLanguage === "zh"
      ? "好，用同样的设置再来一场。"
      : "Same setup — let's go again.");
    startInterviewPrepCountdown(2);
  } catch (error) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? `重新开始失败：${error.message || "请检查 LLM 代理。"}`
      : `Restart failed: ${error.message || "Check the LLM proxy."}`);
    interviewPreparing = false;
    updateInterviewStatus("onboarding");
  } finally {
    persistInterviewSessionSnapshot();
  }
}

function exportInterviewReport() {
  if (!interviewSession) return;
  const reportText = buildInterviewCompletionReport();
  const win = window.open("", "_blank");
  if (!win) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? "无法打开导出窗口，请允许弹出窗口后重试。"
      : "Could not open the export window. Allow pop-ups and retry.");
    return;
  }
  win.document.write(buildInterviewReportHtml(reportText));
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch (error) { /* user can print manually */ } }, 350);
}

function buildInterviewReportHtml(text) {
  const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = [];
  let inList = false;
  const closeList = () => { if (inList) { body.push("</ul>"); inList = false; } };
  String(text).split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); return; }
    if (trimmed.startsWith("### ")) { closeList(); body.push(`<h2>${esc(trimmed.slice(4))}</h2>`); return; }
    if (trimmed.startsWith("- ")) {
      if (!inList) { body.push("<ul>"); inList = true; }
      body.push(`<li>${esc(trimmed.slice(2))}</li>`);
      return;
    }
    closeList();
    body.push(`<p>${esc(trimmed)}</p>`);
  });
  closeList();
  const title = interviewLanguage === "zh" ? "QuantGym 模拟面试报告" : "QuantGym Mock Interview Report";
  return `<!doctype html><html lang="${interviewLanguage === "zh" ? "zh" : "en"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;max-width:720px;margin:48px auto;padding:0 24px;color:#18181b;line-height:1.7}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 8px;color:#2c3138}p{margin:4px 0}ul{margin:6px 0 6px 20px;padding:0}li{margin:3px 0}.meta{color:#6b7280;font-size:13px;margin-bottom:18px}</style></head><body><h1>${esc(title)}</h1><div class="meta">${esc(new Date().toLocaleString())}</div>${body.join("\n")}</body></html>`;
}

function loadInterviewHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTERVIEW_HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCompletedInterviewToHistory(entry) {
  try {
    const history = loadInterviewHistory();
    history.push(entry);
    localStorage.setItem(INTERVIEW_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-50)));
  } catch {
    /* ignore storage quota / disabled storage */
  }
}

function interviewSparkline(values) {
  const blocks = "▁▂▃▄▅▆▇█";
  const nums = values.filter((value) => Number.isFinite(value));
  if (!nums.length) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return nums.map((value) => blocks[Math.min(blocks.length - 1, Math.round(((value - min) / span) * (blocks.length - 1)))]).join("");
}

function getInterviewTrendLines(currentAverage) {
  const useZh = interviewLanguage !== "en";
  const past = loadInterviewHistory().map((item) => Number(item.average)).filter(Number.isFinite);
  const series = [...past, ...(Number.isFinite(currentAverage) ? [currentAverage] : [])];
  if (series.length < 2) return [];
  const recent = series.slice(-8);
  const spark = interviewSparkline(recent);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const arrow = last > first ? "↑" : last < first ? "↓" : "→";
  const lines = [useZh
    ? `总分趋势（近 ${recent.length} 场）：${spark} ${first}→${last} ${arrow}`
    : `Overall trend (last ${recent.length}): ${spark} ${first}→${last} ${arrow}`];
  if (past.length && Number.isFinite(currentAverage)) {
    const personalAvg = Math.round(past.reduce((sum, value) => sum + value, 0) / past.length);
    const delta = currentAverage - personalAvg;
    lines.push(useZh
      ? `相比你的历史平均 ${personalAvg}：${delta >= 0 ? "+" : ""}${delta}`
      : `vs your average ${personalAvg}: ${delta >= 0 ? "+" : ""}${delta}`);
  }
  return lines;
}

function buildInterviewCompletionReport() {
  const useZh = interviewLanguage !== "en";
  const results = interviewSession?.questionResults || [];
  const scored = results.filter((item) => Number.isFinite(Number(item?.score)));
  const average = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + Number(item.score || 0), 0) / scored.length)
    : null;
  const trendLines = getInterviewTrendLines(average);
  const dimensionSummary = summarizeInterviewDimensions(scored);
  const strongest = dimensionSummary[0];
  const weakest = dimensionSummary[dimensionSummary.length - 1];
  const tags = getInterviewPerformanceTags(average, strongest, weakest);
  const questionLines = (interviewSession?.questions || []).map((problem, index) => {
    const result = results[index] || {};
    const title = prettyInterviewTitle(problem);
    const scoreText = Number.isFinite(Number(result.score)) ? `${Math.round(result.score)}/100` : (useZh ? "未评分" : "Not scored");
    const note = result.evaluation || (useZh ? "已记录回答。" : "Answer recorded.");
    return `- Q${index + 1}: ${title || (useZh ? "未命名题目" : "Untitled")} - ${scoreText} - ${note}`;
  });
  const nextSteps = getInterviewNextSteps(average, weakest);
  return useZh
    ? [
      "### 你完成了一场模拟面试",
      average == null ? "总分：样本不足" : `总分：${average}/100`,
      tags.length ? `表现标签：${tags.join("、")}` : "",
      strongest ? `最强维度：${strongest.label} ${strongest.score}/5` : "",
      weakest ? `最弱维度：${weakest.label} ${weakest.score}/5` : "",
      ...(trendLines.length ? ["", "趋势：", ...trendLines] : []),
      "",
      "逐题复盘：",
      ...questionLines,
      "",
      "下一步训练：",
      ...nextSteps.map((item) => `- ${item}`)
    ].filter(Boolean).join("\n")
    : [
      "### Interview completed",
      average == null ? "Overall: not enough scored answers" : `Overall: ${average}/100`,
      tags.length ? `Tags: ${tags.join(", ")}` : "",
      strongest ? `Strongest dimension: ${strongest.label} ${strongest.score}/5` : "",
      weakest ? `Weakest dimension: ${weakest.label} ${weakest.score}/5` : "",
      ...(trendLines.length ? ["", "Trends:", ...trendLines] : []),
      "",
      "Question review:",
      ...questionLines,
      "",
      "Next training:",
      ...nextSteps.map((item) => `- ${item}`)
    ].filter(Boolean).join("\n");
}

function summarizeInterviewDimensions(results = []) {
  const labels = {
    correctness: interviewLanguage === "zh" ? "正确性" : "Correctness",
    reasoning: interviewLanguage === "zh" ? "推理" : "Reasoning",
    communication: interviewLanguage === "zh" ? "表达" : "Communication"
  };
  return Object.keys(labels)
    .map((key) => {
      const values = results.map((item) => Number(item?.dimensions?.[key]?.score)).filter(Number.isFinite);
      const score = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
      return { key, label: labels[key], score };
    })
    .sort((a, b) => b.score - a.score);
}

function getInterviewPerformanceTags(average, strongest, weakest) {
  const useZh = interviewLanguage !== "en";
  const tags = [];
  if (average != null && average >= 82) tags.push(useZh ? "面试可用" : "Interview-ready");
  if (average != null && average < 65) tags.push(useZh ? "需要专项复盘" : "Needs targeted review");
  if (strongest?.key === "reasoning") tags.push(useZh ? "推理较强" : "Strong reasoning");
  if (strongest?.key === "communication") tags.push(useZh ? "表达清楚" : "Clear communication");
  if (weakest?.key === "speed") tags.push(useZh ? "速度待练" : "Needs speed practice");
  if (weakest?.key === "correctness") tags.push(useZh ? "正确性优先" : "Correctness first");
  return [...new Set(tags)].slice(0, 4);
}

function getInterviewNextSteps(average, weakest) {
  const useZh = interviewLanguage !== "en";
  if (!weakest) {
    return [useZh ? "选择 3 题同方向训练，保留 60 秒口头版答案。" : "Run 3 same-focus questions and keep a 60-second spoken answer."];
  }
  const map = {
    correctness: useZh ? "先重做低分题，补齐标准解法中的关键变量和边界条件。" : "Redo low-score questions and add the key variables and edge cases from the reference.",
    reasoning: useZh ? "每题先写三步推理骨架，再开口作答。" : "Write a three-step reasoning skeleton before speaking.",
    communication: useZh ? "练习先给结论，再按假设、过程、检查展开。" : "Practice conclusion first, then assumptions, process, and checks.",
    speed: useZh ? "把同类题做成 90 秒限时复述。" : "Turn similar questions into 90-second timed explanations.",
    readiness: useZh ? "用 live 模式重开一场，重点练追问下保持结构。" : "Restart in live mode and practice staying structured under follow-ups."
  };
  const primary = map[weakest.key] || map.reasoning;
  const secondary = average != null && average < 70
    ? (useZh ? "下一场建议降一档难度，把完整表达先稳定下来。" : "For the next session, lower difficulty once and stabilize complete answers.")
    : (useZh ? "下一场可以保持难度，增加做市或简历深挖追问。" : "Next session can keep difficulty and add market-making or resume follow-ups.");
  return [primary, secondary];
}

function launchInterviewConfetti() {
  if (!els.interviewTranscript) return;
  const burst = document.createElement("div");
  burst.className = "interview-confetti";
  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${Math.round(Math.random() * 100)}%`);
    piece.style.setProperty("--delay", `${Math.round(Math.random() * 360)}ms`);
    piece.style.setProperty("--spin", `${Math.round(120 + Math.random() * 420)}deg`);
    burst.appendChild(piece);
  }
  els.interviewTranscript.appendChild(burst);
  els.interviewTranscript.scrollTop = els.interviewTranscript.scrollHeight;
  window.setTimeout(() => burst.remove(), 2200);
}

function clearInterviewTimers() {
  if (interviewPrepTimer) window.clearInterval(interviewPrepTimer);
  interviewPrepTimer = null;
  clearInterviewQuestionTimer();
  clearInterviewTypingTimers();
}

function clearInterviewQuestionTimer() {
  if (interviewQuestionTimer) window.clearInterval(interviewQuestionTimer);
  interviewQuestionTimer = null;
}

function clearInterviewTypingTimers() {
  for (const timer of interviewTypingTimers.values()) {
    window.clearInterval(timer);
  }
  interviewTypingTimers.clear();
}

function persistInterviewSessionSnapshot() {
  if (!interviewSession || interviewSession.completed) {
    sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
    return;
  }
  try {
    const snapshot = {
      interviewLanguage,
      interviewPanelExpandedIndex,
      session: {
        ...interviewSession,
        currentProblem: null,
        submitting: false
      },
      messages: interviewMessages
        .filter((message) => !message.thinking)
        .map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          displayText: message.displayText || message.text,
          typing: false,
          thinking: false,
          actions: message.actions || [],
          actionStep: message.actionStep || "",
          variant: message.variant || "",
          attachments: (message.attachments || []).map(summarizeAttachment).filter(Boolean)
        }))
    };
    sessionStorage.setItem(INTERVIEW_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
  }
}

function hasDurableInterview() {
  try {
    return Boolean(localStorage.getItem(INTERVIEW_RESUME_STORAGE_KEY));
  } catch {
    return false;
  }
}

function clearDurableInterview() {
  try {
    localStorage.removeItem(INTERVIEW_RESUME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function exitInterview() {
  if (!interviewSession) return;
  const useZh = interviewLanguage !== "en";
  const completed = Boolean(interviewSession.completed);
  let keep = false;
  if (!completed) {
    keep = window.confirm(useZh
      ? "保留这次面试进程？\n点击「确定」保留，下次回来可继续；点击「取消」放弃本次进程。"
      : "Keep this interview in progress?\nOK = save and resume later. Cancel = discard this session.");
  }
  try {
    if (keep) {
      persistInterviewSessionSnapshot();
      const snapshot = sessionStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);
      if (snapshot) localStorage.setItem(INTERVIEW_RESUME_STORAGE_KEY, snapshot);
    } else {
      clearDurableInterview();
    }
  } catch {
    /* ignore storage errors */
  }
  resetInterview();
}

function resumeDurableInterview() {
  let raw = null;
  try {
    raw = localStorage.getItem(INTERVIEW_RESUME_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return;
  try {
    sessionStorage.setItem(INTERVIEW_SESSION_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
  interviewSession = null;
  interviewSnapshotRestored = false;
  restoreInterviewSessionSnapshot();
  clearDurableInterview();
  updateInterviewStatus();
  renderInterviewTranscript();
  renderInterviewQuestionPanel();
}

function restoreInterviewSessionSnapshot() {
  interviewSnapshotRestored = true;
  const raw = sessionStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);
  if (!raw || interviewSession) return;
  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot?.session || snapshot.session.completed) {
      sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
      return;
    }
    interviewLanguage = snapshot.interviewLanguage === "en" ? "en" : "zh";
    syncInterviewLanguageControls();
    interviewPanelExpandedIndex = Number.isFinite(Number(snapshot.interviewPanelExpandedIndex)) ? Number(snapshot.interviewPanelExpandedIndex) : 0;
    interviewSession = snapshot.session;
    interviewSession.currentProblem = interviewSession.currentIndex >= 0 ? interviewSession.questions?.[interviewSession.currentIndex] || null : null;
    interviewMessages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
    resumeInterviewQuestionTimer();
  } catch {
    sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
  }
}

function resumeInterviewQuestionTimer() {
  if (!interviewSession || interviewSession.phase !== "running" || interviewSession.completed || interviewSession.awaitingNext) return;
  if (interviewSession.currentIndex < 0 || interviewSession.remainingSeconds <= 0) return;
  clearInterviewQuestionTimer();
  setInterviewTimer(interviewSession.remainingSeconds);
  interviewQuestionTimer = window.setInterval(() => {
    if (!interviewSession || interviewSession.completed) return;
    interviewSession.remainingSeconds -= 1;
    setInterviewTimer(interviewSession.remainingSeconds);
    if (interviewSession.remainingSeconds <= 0) {
      clearInterviewQuestionTimer();
      appendInterviewMessage("coach", interviewLanguage === "zh"
        ? (isInterviewLiveMode() ? "时间到。请用一句话收尾，或者直接提交已有回答。" : "时间到。你仍然可以提交当前回答，我会按已有内容评测。")
        : (isInterviewLiveMode() ? "Time is up. Please wrap up in one sentence or submit what you have." : "Time is up. You can still submit the current answer for evaluation."));
      updateInterviewStatus("timeup");
    }
  }, 1000);
}

function updateInterviewStatus(status = "") {
  updateInterviewLayout();
  if (!els.interviewSessionTitle || !els.interviewQuestionStatus || !els.interviewTimer) return;
  if (!interviewSession) {
    els.interviewSessionTitle.textContent = "Ready";
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "还没有开始。" : "Not started.";
    els.interviewTimer.textContent = "--:--";
    updateInterviewActionPanel();
    return;
  }

  const modeLabel = interviewSession.mode === "live"
    ? (interviewLanguage === "zh" ? "真实面试" : "Live mock")
    : (interviewLanguage === "zh" ? "训练练习" : "Practice");
  const typeLabel = interviewTypeDefs[interviewSession.type]?.label || "Interview";
  els.interviewSessionTitle.textContent = isInterviewOnboarding() ? (interviewLanguage === "zh" ? "AI 面试官配置" : "AI interviewer setup") : `${modeLabel} · ${typeLabel}`;
  if (status === "loading") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "正在准备题目..." : "Preparing questions...";
  } else if (status === "onboarding") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "正在通过对话配置本场面试。" : "Configuring this interview through chat.";
    els.interviewTimer.textContent = "--:--";
  } else if (status === "preparing") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "题目已准备。" : "Questions are ready.";
  } else if (status === "timeup") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "本题时间到。" : "Time is up.";
  } else if (status === "awaitingNext") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "本题收尾，可以进入下一题。" : "This question is wrapped. Ready for the next one.";
  } else if (status === "completed") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "模拟面试已结束。" : "Mock interview complete.";
    els.interviewTimer.textContent = "Done";
  } else {
    els.interviewQuestionStatus.textContent = interviewSession.currentIndex >= 0
      ? `Q${interviewSession.currentIndex + 1}/${interviewSession.questions.length}`
      : interviewLanguage === "zh" ? "准备开始。" : "Ready to start.";
  }
  updateInterviewActionPanel();
}

function setInterviewTimer(seconds) {
  if (!els.interviewTimer) return;
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  els.interviewTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function setButtonBusy(button, busy, label = "") {
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.textContent.trim();
    setButtonLabel(`#${button.id}`, label);
  } else if (button.dataset.originalText) {
    setButtonLabel(`#${button.id}`, button.dataset.originalText);
    delete button.dataset.originalText;
  }
}

function getInterviewQuestionSpeechText(problem = {}) {
  const title = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const prompt = interviewLanguage === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
  return [title, prompt].filter(Boolean).join(". ");
}

function speakInterviewText(text) {
  if (!interviewSession?.sessionConfig?.ttsEnabled || !window.speechSynthesis) return;
  const cleanText = normalizeRichTextContent(text)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
  if (!cleanText) return;
  stopInterviewSpeech();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = interviewLanguage === "zh" ? "zh-CN" : "en-US";
  utterance.rate = interviewLanguage === "zh" ? 0.96 : 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function stopInterviewSpeech() {
  if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
    window.speechSynthesis.cancel();
  }
}

function toggleVoiceAnswer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? "当前浏览器不支持语音识别，请使用文字作答。"
      : "Speech recognition is not supported in this browser. Use text answer instead.");
    return;
  }

  if (interviewVoiceRecognition) {
    interviewVoiceRecognition.stop();
    interviewVoiceRecognition = null;
    els.voiceAnswerBtn?.classList.remove("active-like");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = interviewLanguage === "zh" ? "zh-CN" : "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.addEventListener("result", (event) => {
    const transcript = [...event.results]
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript) {
      els.interviewAnswer.value = transcript;
      autoSizeInterviewAnswer();
    }
  });
  recognition.addEventListener("end", () => {
    interviewVoiceRecognition = null;
    els.voiceAnswerBtn?.classList.remove("active-like");
  });
  interviewVoiceRecognition = recognition;
  els.voiceAnswerBtn?.classList.add("active-like");
  recognition.start();
}

function revealInterviewAnswer() {
  if (isInterviewLiveMode() || isInterviewOnboarding()) {
    appendInterviewMessage("system", interviewLanguage === "zh" ? "真实面试模式中不会展示参考答案；结束报告会统一复盘。" : "Reference answers stay hidden in live mock mode; the final report will summarize the review.");
    return;
  }
  const problem = getSelectedProblem();
  if (!problem) return;
  appendInterviewMessage("system", [
    interviewLanguage === "zh" ? "### 参考答案" : "### Reference answer",
    getLocalizedProblemField(problem, "answer", interviewLanguage === "en") || (interviewLanguage === "zh" ? "未填写" : "Not provided"),
    "",
    interviewLanguage === "zh" ? "### 解析" : "### Explanation",
    getLocalizedProblemField(problem, "explanation", interviewLanguage === "en") || (interviewLanguage === "zh" ? "未填写" : "Not provided"),
    getProblemMediaMarkdown(problem, "answer")
  ].filter(Boolean).join("\n"), { variant: "reference" });
}

function startPkMatch() {
  const problem = randomChoice(state.problems);
  if (!problem) {
    els.pkProblem.textContent = "题库为空，先添加题目。";
    return;
  }
  const opponents = ["AlphaQuant", "Jane Street Trainee", "Vol Arb Intern", "Data Quant", "Options Challenger"];
  const opponent = randomChoice(opponents);
  pkSession = {
    id: makeId(),
    problem,
    opponent,
    opponentScore: randomInt(58, 92),
    userScore: 0,
    startedAt: Date.now(),
    finished: false
  };
  els.pkOpponentName.textContent = opponent;
  els.pkUserScore.textContent = "0";
  els.pkOpponentScore.textContent = "?";
  els.pkAnswer.value = "";
  els.pkProblem.textContent = formatPkProblem(problem);
  renderPkFeed([
    `已匹配 ${opponent}`,
    `题目来自：${formatCategoryLabel(problem.category)} · ${problem.difficulty}`
  ]);
  els.pkAnswer.focus();
}

function formatPkProblem(problem) {
  return [
    `${problem.titleZh || problem.titleEn}`,
    "",
    problem.promptZh || problem.promptEn || "无题干"
  ].join("\n");
}

function submitPkAnswer() {
  if (!pkSession) {
    startPkMatch();
    return;
  }
  if (pkSession.finished) return;
  const answer = els.pkAnswer.value.trim();
  if (!answer) return;

  const elapsed = Math.round((Date.now() - pkSession.startedAt) / 1000);
  const userScore = scorePkAnswer(pkSession.problem, answer, elapsed);
  pkSession.userScore = userScore;
  pkSession.finished = true;
  els.pkUserScore.textContent = String(userScore);
  els.pkOpponentScore.textContent = String(pkSession.opponentScore);

  const won = userScore >= pkSession.opponentScore;
  const category = normalizeCategory(pkSession.problem.category);
  const xpGain = won ? 18 : 10;
  state.skills[category] = Math.max(0, (state.skills[category] || 0) + xpGain);
  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: `PK：${pkSession.problem.titleZh || pkSession.problem.titleEn}，对手 ${pkSession.opponent}，比分 ${userScore}-${pkSession.opponentScore}`,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === category ? xpGain : 0])),
    totalXp: xpGain,
    duration: 0
  });
  saveState();

  renderPkFeed([
    won ? "你赢了这一局。" : "这局对手领先。",
    `你的得分：${userScore}`,
    `${pkSession.opponent}：${pkSession.opponentScore}`,
    `获得 ${skillDefs[category].name} +${xpGain} XP`
  ]);
  renderAll();
}

function scorePkAnswer(problem, answer, elapsed) {
  const source = [
    getLocalizedProblemField(problem, "answer", false),
    getLocalizedProblemField(problem, "answer", true),
    getLocalizedProblemField(problem, "explanation", false),
    getLocalizedProblemField(problem, "explanation", true),
    problem.promptEn || "",
    problem.promptZh || ""
  ].join(" ");
  const keywords = extractKeywords(source);
  const lower = answer.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  const coverage = keywords.length ? hits / keywords.length : 0.35;
  const lengthScore = Math.min(1, answer.length / 280);
  const timeBonus = elapsed <= 180 ? 8 : elapsed <= 300 ? 4 : 0;
  return Math.round(Math.min(100, 35 + coverage * 42 + lengthScore * 15 + timeBonus));
}

function extractKeywords(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !["the", "and", "for", "with", "that", "this", "from", "return", "given", "what", "your"].includes(word));
  return [...new Set(words)].slice(0, 18);
}

function revealPkAnswer() {
  if (!pkSession) return;
  renderPkFeed([
    "参考答案",
    getLocalizedProblemField(pkSession.problem, "answer", false) || "未填写",
    getLocalizedProblemField(pkSession.problem, "explanation", false) || "未填写"
  ]);
}

function renderPkFeed(items) {
  els.pkFeed.innerHTML = "";
  items.forEach((text) => {
    const item = document.createElement("div");
    item.className = "pk-feed-item";
    item.textContent = text;
    els.pkFeed.appendChild(item);
  });
}

function appendInterviewMessage(role, text, options = {}) {
  const id = makeId();
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const actionStep = options.actionStep || "";
  const variant = options.variant || "";
  if (options.thinking) {
    interviewMessages.push({ id, role, text: "", displayText: "", typing: false, thinking: true, attachments, actions, actionStep, variant });
    renderInterviewTranscript();
    return id;
  }
  const typewriter = options.typewriter ?? role === "coach";
  interviewMessages.push(typewriter
    ? { id, role, text: String(text || ""), displayText: "", typing: true, attachments, actions, actionStep, variant }
    : { id, role, text: String(text || ""), displayText: String(text || ""), typing: false, attachments, actions, actionStep, variant });
  renderInterviewTranscript();
  if (typewriter) startInterviewTyping(id, text);
  return id;
}

function updateInterviewMessage(id, text, options = {}) {
  stopInterviewTyping(id);
  if (options.typewriter) {
    startInterviewTyping(id, text);
    return;
  }
  interviewMessages = interviewMessages.map((message) => (
    message.id === id ? {
      ...message,
      text,
      displayText: text,
      typing: false,
      thinking: false,
      attachments: options.attachments || message.attachments || [],
      actions: options.actions || message.actions || [],
      actionStep: options.actionStep || message.actionStep || "",
      variant: options.variant || message.variant || ""
    } : message
  ));
  renderInterviewTranscript();
}

function startInterviewTyping(id, text) {
  const fullText = String(text || "");
  let index = 0;
  // Slower, more natural typing for interviewer/onboarding messages (questions are shown instantly elsewhere).
  const step = Math.max(1, Math.ceil(fullText.length / 130));

  interviewMessages = interviewMessages.map((message) => (
    message.id === id ? { ...message, text: fullText, displayText: "", typing: true, thinking: false } : message
  ));
  renderInterviewTranscript();

  const findTurn = () => els.interviewTranscript?.querySelector(`[data-message-id="${id}"]`);

  const timer = window.setInterval(() => {
    index = Math.min(fullText.length, index + step);
    const displayText = fullText.slice(0, index);
    const done = index >= fullText.length;

    // Keep state in sync, but update only the active bubble instead of re-rendering everything.
    interviewMessages = interviewMessages.map((message) => (
      message.id === id ? { ...message, displayText, typing: !done } : message
    ));

    if (done) {
      stopInterviewTyping(id);
      // Full re-render once at the end so attachments and quick-option chips render.
      renderInterviewTranscript();
      scheduleMathTypeset(els.interviewTranscript);
      return;
    }

    const turn = findTurn();
    const node = turn?.querySelector(".message");
    if (node) {
      renderRichText(node, displayText);
      els.interviewTranscript.scrollTop = els.interviewTranscript.scrollHeight;
    } else {
      renderInterviewTranscript();
    }
  }, 42);
  interviewTypingTimers.set(id, timer);
}

function stopInterviewTyping(id) {
  const timer = interviewTypingTimers.get(id);
  if (!timer) return;
  window.clearInterval(timer);
  interviewTypingTimers.delete(id);
}

async function addEntry() {
  const text = els.logText.value.trim();
  if (!text) {
    els.analysisPreview.textContent = "先写一点内容。";
    els.logText.focus();
    return;
  }

  els.analysisPreview.textContent = "AI 分类中...";
  const result = await classifyEntry(text);
  const difficulty = Number(els.difficultyInput.value || 1);
  const gains = Object.fromEntries(
    Object.entries(result.gains).map(([key, value]) => [key, Math.round(value * difficulty)])
  );
  const totalXp = Object.values(gains).reduce((sum, value) => sum + value, 0);

  Object.entries(gains).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + value);
  });

  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text,
    gains,
    totalXp,
    duration: Number(els.durationInput.value || 0)
  });

  saveState();
  latestClassification = null;
  els.logText.value = "";
  els.durationInput.value = "";
  renderAll();
}

async function classifyEntry(text) {
  const local = analyzeEntry(text);
  try {
    const remote = await requestLogClassification(text, local);
    return normalizeClassification(remote, local);
  } catch {
    return local;
  }
}

async function requestLogClassification(text, localResult) {
  const endpoint = getClassifyEndpoint();
  if (!endpoint) throw new Error("Missing classify endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      model: normalizeLlmModel(llmConfig.model),
      text,
      duration: Number(els.durationInput?.value || 0),
      difficulty: Number(els.difficultyInput?.value || 1),
      skills: Object.fromEntries(Object.entries(skillDefs).map(([key, def]) => [key, def.name])),
      localGains: localResult.gains
    })
  });
  if (!response.ok) throw new Error(`Classify endpoint ${response.status}`);
  return response.json();
}

function getClassifyEndpoint() {
  const endpoint = (llmConfig.endpoint || "").trim();
  if (!endpoint) return "";
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/interview\/?$/, "/classify-log");
    if (!url.pathname.endsWith("/classify-log")) url.pathname = "/classify-log";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeClassification(remote, fallback) {
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  const source = remote?.gains || remote?.classification || {};
  Object.entries(source).forEach(([key, value]) => {
    const normalized = normalizeCategory(key);
    if (!skillDefs[normalized]) return;
    gains[normalized] += clampNumber(value, 0, 120);
  });
  if (Object.values(gains).every((value) => value === 0)) return fallback;
  return { gains, hits: {}, summary: remote?.summary || "LLM" };
}

function analyzeEntry(text) {
  const lower = text.toLowerCase();
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  const hits = {};

  Object.entries(skillDefs).forEach(([key, def]) => {
    const matched = def.keywords.filter((word) => lower.includes(word.toLowerCase()));
    hits[key] = matched;
    if (matched.length) gains[key] += 12 + matched.length * 5;
  });

  const duration = Number(els.durationInput?.value || 0);
  if (duration > 0) {
    const active = Object.keys(gains).filter((key) => gains[key] > 0);
    const targets = active.length ? active : [getLowestSkillKey()];
    const durationXp = Math.min(60, Math.round(duration * 0.9));
    targets.forEach((key) => {
      gains[key] += Math.ceil(durationXp / targets.length);
    });
  }

  const problemCount = extractProblemCount(lower);
  if (problemCount > 0) {
    if (hits.leetcode.length) gains.leetcode += problemCount * 12;
    if (hits.probabilityExpectation.length) gains.probabilityExpectation += problemCount * 12;
    if (hits.statistics.length) gains.statistics += problemCount * 10;
    if (hits.machineLearning.length) gains.machineLearning += problemCount * 10;
    if (hits.deepLearning.length) gains.deepLearning += problemCount * 10;
    if (hits.option.length) gains.option += problemCount * 10;
  }

  if (Object.values(gains).every((value) => value === 0)) {
    gains[getLowestSkillKey()] = 12;
  }

  return { gains, hits };
}

function updatePreview() {
  if (!els.logText) return;
  const text = els.logText.value.trim();
  if (!text) {
    els.analysisPreview.textContent = "";
    return;
  }
  const result = latestClassification?.text === text ? latestClassification.result : analyzeEntry(text);
  const difficulty = Number(els.difficultyInput.value || 1);
  const parts = Object.entries(result.gains)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${skillDefs[key].name} +${Math.round(value * difficulty)}`);
  els.analysisPreview.textContent = parts.length ? `自动分类：${parts.join(" | ")}` : "自动分类中";
  renderAutoClassifyChips(result.gains, difficulty);
}

function scheduleClassificationPreview() {
  latestClassification = null;
  updatePreview();
  window.clearTimeout(classifyTimer);
  const text = els.logText.value.trim();
  if (!text) return;
  classifyTimer = window.setTimeout(async () => {
    try {
      const result = await classifyEntry(text);
      latestClassification = { text, result };
      updatePreview();
    } catch {
      updatePreview();
    }
  }, 700);
}

function renderAutoClassifyChips(gains = {}, difficulty = 1) {
  if (!els.autoClassifyChips) return;
  els.autoClassifyChips.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const value = Math.round((gains[key] || 0) * difficulty);
    const chip = document.createElement("span");
    chip.className = `auto-chip${value > 0 ? " active" : ""}`;
    chip.textContent = value > 0 ? `${def.name} +${value}` : def.name;
    els.autoClassifyChips.appendChild(chip);
  });
}

function getLowestSkillKey() {
  return Object.keys(skillDefs).sort((a, b) => (state.skills[a] || 0) - (state.skills[b] || 0))[0] || "leetcode";
}

function extractProblemCount(text) {
  const matches = [...text.matchAll(/(\d+)\s*(道|题|problems?|questions?)/gi)];
  if (!matches.length) return 0;
  return matches.reduce((sum, match) => sum + Number(match[1]), 0);
}

function addResource() {
  const title = els.resourceTitle.value.trim();
  const content = els.resourceContent.value.trim();
  if (!title || !content) return;
  const sources = parseResourceSources(els.resourceSources?.value || content);

  state.resources.push({
    id: makeId(),
    title,
    type: els.resourceType.value,
    content,
    sources,
    dataUrl: els.resourceForm.dataset.previewData || "",
    date: new Date().toISOString()
  });

  saveState();
  els.resourceForm.reset();
  delete els.resourceForm.dataset.previewData;
  els.resourceForm.classList.add("hidden");
  renderResources();
  refreshIcons();
}

function handleResourceFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!els.resourceTitle.value.trim()) els.resourceTitle.value = file.name;
  delete els.resourceForm.dataset.previewData;

  if (file.type.startsWith("image/")) {
    els.resourceType.value = "image";
    if (file.size > 1_500_000) {
      els.resourceContent.value = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      els.resourceForm.dataset.previewData = String(reader.result);
      els.resourceContent.value = file.name;
    });
    reader.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.resourceType.value = file.name.toLowerCase().endsWith(".tex") ? "tex" : "note";
    els.resourceContent.value = String(reader.result);
  });
  reader.readAsText(file);
}

function undoLatestEntry() {
  const entry = state.entries.pop();
  if (!entry) return;
  Object.entries(entry.gains).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) - value);
  });
  saveState();
  renderAll();
}

function resetState() {
  const ok = window.confirm("清空当前账户的训练记录？已连接云端时也会同步为空。");
  if (!ok) return;
  if (currentUser) localStorage.removeItem(userStateKey(currentUser.id));
  state = loadState();
  clearProblemLookupCaches();
  saveState();
  renderAll();
}

function exportState() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: currentUser ? { name: currentUser.name, email: currentUser.email, provider: currentUser.provider } : null,
    state: localStatePayload(state)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `quantgym-${currentUser?.name || "backup"}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importState(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedState = parsed.state || parsed;
      const next = {
        skills: { ...state.skills, ...(importedState.skills || {}) },
        entries: Array.isArray(importedState.entries) ? importedState.entries : [],
        resources: Array.isArray(importedState.resources) ? importedState.resources : [],
        network: Array.isArray(importedState.network) ? importedState.network : [],
        interviewFavorites: Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [],
        mentalMathRecords: normalizeMentalMathRecords(importedState.mentalMathRecords),
        gameRecords: normalizeGameRecords(importedState.gameRecords),
        problemStates: mergeProblemStates(
          state.problemStates || [],
          Array.isArray(importedState.problemStates) ? importedState.problemStates : [],
          problemStatesFromFavorites(Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [])
        ),
        leaderboard: importedState.leaderboard || state.leaderboard || defaultLeaderboardSettings(),
        problems: mergeProblems(state.problems, Array.isArray(importedState.problems) ? importedState.problems : []),
        news: mergeNews(state.news || [], Array.isArray(importedState.news) ? importedState.news : []),
        newsFetchedAt: importedState.newsFetchedAt || state.newsFetchedAt || "",
        newsFetchAttemptAt: importedState.newsFetchAttemptAt || state.newsFetchAttemptAt || "",
        newsSyncError: importedState.newsSyncError || "",
        createdAt: importedState.createdAt || state.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state = normalizeState(next);
      clearProblemLookupCaches();
      saveState();
      renderAll();
    } catch {
      window.alert("备份文件无法读取。");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function getDrillModeLabel(mode = drillMode) {
  const labels = {
    numberLogic: "Number Logic",
    arithmetic: "Arithmetic",
    percent: t("mentalPercent"),
    square: t("mentalSquare"),
    ev: "EV"
  };
  return labels[mode] || labels.numberLogic;
}

function createDrillSession(running = false) {
  const total = Math.max(1, Number(els.drillCountSelect?.value || 20));
  const durationSeconds = Math.max(60, Number(els.drillTimeSelect?.value || 1500));
  return {
    id: makeId(),
    mode: drillMode,
    total,
    index: 0,
    score: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    durationSeconds,
    remainingSeconds: durationSeconds,
    running,
    answered: false,
    completed: false,
    startedAt: Date.now()
  };
}

function ensureDrillSession() {
  if (drillSession && currentDrill) return;
  drillSession = createDrillSession(false);
  currentDrill = makeDrill(drillSession.mode);
}

function startDrillSession() {
  stopDrillTimer();
  drillSession = createDrillSession(true);
  currentDrill = makeDrill(drillSession.mode);
  startDrillTimer();
  renderMentalMath();
}

function startDrillTimer() {
  stopDrillTimer();
  drillTimerId = window.setInterval(() => {
    if (!drillSession?.running) return;
    drillSession.remainingSeconds = Math.max(0, drillSession.remainingSeconds - 1);
    renderDrillStatus();
    if (drillSession.remainingSeconds <= 0) finishDrillSession("time");
  }, 1000);
}

function stopDrillTimer() {
  if (drillTimerId) window.clearInterval(drillTimerId);
  drillTimerId = null;
}

function renderMentalMath() {
  if (!els.drillQuestion) return;
  ensureDrillSession();
  document.querySelectorAll("[data-drill]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drill === drillMode);
  });
  renderDrillStatus();
  renderDrillQuestion();
  renderMentalRecords();
  renderMentalLeaderboard();
  if (!currentMarketGame) currentMarketGame = makeMarketGameRound();
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  renderMarketGame();
  renderPokerGame();
  refreshIcons();
}

function renderDrillStatus() {
  if (!drillSession) return;
  const answered = drillSession.correct + drillSession.incorrect;
  const accuracy = answered ? Math.round((drillSession.correct / answered) * 100) : 0;
  const timeText = formatDuration(drillSession.remainingSeconds);
  if (els.drillScore) els.drillScore.textContent = String(drillSession.score);
  if (els.drillAccuracy) els.drillAccuracy.textContent = `${accuracy}%`;
  if (els.drillTimer) els.drillTimer.textContent = timeText;
  if (els.drillProgressText) els.drillProgressText.textContent = `${drillSession.completed ? "Finished" : "Question"} ${Math.min(drillSession.index + 1, drillSession.total)}/${drillSession.total}`;
  if (els.drillTimeLeftText) els.drillTimeLeftText.textContent = `Time left: ${timeText}`;
  if (els.drillProgressFill) {
    const percent = Math.round((Math.min(drillSession.index, drillSession.total) / Math.max(drillSession.total, 1)) * 100);
    els.drillProgressFill.style.width = `${percent}%`;
  }
}

function renderDrillQuestion() {
  if (!currentDrill || !els.drillQuestion || !els.drillOptions) return;
  els.drillQuestion.textContent = currentDrill.question;
  els.drillOptions.innerHTML = "";
  currentDrill.options.forEach((option) => {
    const button = document.createElement("button");
    const selected = currentDrill.selected != null && Number(option) === Number(currentDrill.selected);
    const correct = Math.abs(Number(option) - Number(currentDrill.answer)) <= currentDrill.tolerance;
    button.type = "button";
    button.className = [
      "drill-option",
      currentDrill.answered && correct ? "correct" : "",
      currentDrill.answered && selected && !correct ? "incorrect" : ""
    ].filter(Boolean).join(" ");
    button.dataset.drillOption = String(option);
    button.disabled = Boolean(!drillSession?.running || currentDrill.answered || drillSession?.completed);
    button.textContent = formatNumber(option);
    els.drillOptions.appendChild(button);
  });
  if (els.drillFeedback) {
    els.drillFeedback.textContent = currentDrill.feedback || (drillSession?.running
      ? t("mentalChooseAnswer")
      : t("mentalPressStart"));
  }
}

function checkDrill(rawAnswer) {
  if (!currentDrill || !drillSession?.running || drillSession.completed || currentDrill.answered) return;
  const answer = Number(rawAnswer);
  if (!Number.isFinite(answer)) return;
  const correct = Math.abs(answer - currentDrill.answer) <= currentDrill.tolerance;
  currentDrill.answered = true;
  currentDrill.selected = answer;
  currentDrill.feedback = correct
    ? `Correct. ${currentDrill.explain}`
    : `Answer: ${formatNumber(currentDrill.answer)}. ${currentDrill.explain}`;
  drillSession.answered = true;
  if (correct) {
    drillSession.correct += 1;
    drillSession.score += 1;
  } else {
    drillSession.incorrect += 1;
    drillSession.score -= 1;
  }
  renderMentalMath();
  if (drillSession.running) window.setTimeout(() => advanceDrillQuestion({ countSkip: false }), 520);
}

function skipDrill() {
  if (!currentDrill || !drillSession?.running || drillSession.completed) return;
  if (currentDrill.answered) {
    advanceDrillQuestion({ countSkip: false });
    return;
  }
  currentDrill.answered = true;
  currentDrill.skipped = true;
  currentDrill.feedback = `Skipped. Answer: ${formatNumber(currentDrill.answer)}. ${currentDrill.explain}`;
  drillSession.skipped += 1;
  drillSession.answered = true;
  renderMentalMath();
  if (drillSession.running) window.setTimeout(() => advanceDrillQuestion({ countSkip: false }), 420);
}

function advanceDrillQuestion(options = {}) {
  if (!drillSession || drillSession.completed) return;
  if (!drillSession.running) return;
  if (!currentDrill?.answered && options.countSkip !== false) {
    drillSession.skipped += 1;
  }
  if (drillSession.index + 1 >= drillSession.total) {
    finishDrillSession("complete");
    return;
  }
  drillSession.index += 1;
  drillSession.answered = false;
  currentDrill = makeDrill(drillSession.mode);
  renderMentalMath();
}

function finishDrillSession(reason = "complete") {
  if (!drillSession || drillSession.completed) return;
  stopDrillTimer();
  drillSession.completed = true;
  drillSession.running = false;
  const answered = drillSession.correct + drillSession.incorrect;
  const accuracy = answered ? Math.round((drillSession.correct / answered) * 100) : 0;
  const usedSeconds = Math.max(0, drillSession.durationSeconds - drillSession.remainingSeconds);
  const record = normalizeMentalMathRecords([{
    id: drillSession.id,
    mode: drillSession.mode,
    label: getDrillModeLabel(drillSession.mode),
    score: drillSession.score,
    correct: drillSession.correct,
    incorrect: drillSession.incorrect,
    skipped: drillSession.skipped,
    total: drillSession.total,
    accuracy,
    durationSeconds: usedSeconds,
    createdAt: new Date().toISOString()
  }])[0];
  if (record && !state.mentalMathRecords.some((item) => item.id === record.id)) {
    state.mentalMathRecords = normalizeMentalMathRecords([...(state.mentalMathRecords || []), record]);
    const xpGain = Math.max(4, record.correct * 3 + Math.max(0, record.score));
    state.skills.mentalMath = Math.max(0, (state.skills.mentalMath || 0) + xpGain);
    state.entries.push({
      id: makeId(),
      date: new Date().toISOString(),
      text: `Mental Math ${record.label}: ${record.score} (${record.correct}/${record.total}, ${reason})`,
      gains: { leetcode: 0, pandasNumpy: 0, probabilityExpectation: 0, statistics: 0, machineLearning: 0, deepLearning: 0, market: 0, option: 0, mentalMath: xpGain },
      totalXp: xpGain,
      duration: Math.round(usedSeconds / 60)
    });
    saveState();
    renderSummary();
    renderSkills();
    renderHistory();
  }
  if (currentDrill) currentDrill.feedback = `Session complete. Score ${drillSession.score}, accuracy ${accuracy}%.`;
  renderMentalMath();
}

function makeDrill(mode) {
  if (mode === "numberLogic") return makeNumberLogicDrill();
  if (mode === "arithmetic") return makeArithmeticDrill();
  if (mode === "square") {
    const n = randomInt(12, 45);
    const answer = n * n;
    return makeChoiceDrill(`${n}² = ?`, answer, `${n}² = ${answer}`, { spread: Math.max(8, n), integer: true });
  }
  if (mode === "ev") {
    const p = randomChoice([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75]);
    const win = randomInt(20, 90);
    const lose = randomInt(5, 35);
    const answer = p * win - (1 - p) * lose;
    return makeChoiceDrill(`${Math.round(p * 100)}% win ${win}, otherwise lose ${lose}. EV = ?`, answer, `${p} x ${win} - ${formatNumber(1 - p)} x ${lose}`, { spread: 8, tolerance: 0.15 });
  }
  const base = randomInt(40, 240);
  const pct = randomChoice([5, 8, 10, 12, 15, 18, 20, 25, 30, 35]);
  const direction = Math.random() > 0.5 ? "increase" : "decrease";
  const answer = direction === "increase" ? base * (1 + pct / 100) : base * (1 - pct / 100);
  const word = direction === "increase" ? "up" : "down";
  return makeChoiceDrill(`${base} ${word} ${pct}% = ?`, answer, `${base} x ${formatNumber(direction === "increase" ? 1 + pct / 100 : 1 - pct / 100)}`, { spread: Math.max(5, base * 0.08), tolerance: 0.1 });
}

function makeNumberLogicDrill() {
  const type = randomChoice(["arithmetic", "geometric", "alternating", "fibonacci"]);
  let sequence = [];
  let answer = 0;
  let explain = "";
  if (type === "geometric") {
    const start = randomChoice([1, 2, 3, 4, 5]);
    const ratio = randomChoice([2, 3, 4]);
    sequence = Array.from({ length: 5 }, (_, index) => start * ratio ** index);
    answer = start * ratio ** 5;
    explain = `Multiply by ${ratio}.`;
  } else if (type === "alternating") {
    const start = randomInt(8, 24);
    const up = randomInt(4, 12);
    const down = randomInt(1, 5);
    sequence = [start];
    for (let index = 1; index < 6; index += 1) {
      sequence.push(sequence[index - 1] + (index % 2 ? up : -down));
    }
    answer = sequence.pop();
    explain = `Alternate +${up}, -${down}.`;
  } else if (type === "fibonacci") {
    const a = randomInt(1, 6);
    const b = randomInt(2, 9);
    sequence = [a, b];
    while (sequence.length < 6) sequence.push(sequence.at(-1) + sequence.at(-2));
    answer = sequence.pop();
    explain = "Each value is the sum of the previous two.";
  } else {
    const start = randomInt(2, 28);
    const step = randomInt(2, 13);
    sequence = Array.from({ length: 5 }, (_, index) => start + step * index);
    answer = start + step * 5;
    explain = `Add ${step} each step.`;
  }
  return makeChoiceDrill(`${sequence.join("   ")}   ?`, answer, explain, { spread: Math.max(6, Math.abs(answer) * 0.2), integer: true });
}

function makeArithmeticDrill() {
  const type = randomChoice(["multiply", "divide", "add", "fraction"]);
  if (type === "divide") {
    const divisor = randomInt(3, 12);
    const answer = randomInt(8, 36);
    const dividend = divisor * answer;
    return makeChoiceDrill(`${dividend} ÷ ${divisor} = ?`, answer, `${divisor} x ${answer} = ${dividend}`, { spread: 8, integer: true });
  }
  if (type === "fraction") {
    const denominator = randomChoice([4, 5, 8, 10, 12, 16]);
    const numerator = randomInt(1, denominator - 1);
    const base = randomChoice([80, 96, 120, 160, 200, 240]);
    const answer = (base * numerator) / denominator;
    return makeChoiceDrill(`${numerator}/${denominator} of ${base} = ?`, answer, `${base} ÷ ${denominator} x ${numerator}`, { spread: 10, tolerance: 0.1 });
  }
  if (type === "add") {
    const a = randomInt(120, 980);
    const b = randomInt(80, 760);
    const sign = Math.random() > 0.45 ? "+" : "-";
    const answer = sign === "+" ? a + b : a - b;
    return makeChoiceDrill(`${a} ${sign} ${b} = ?`, answer, `${a} ${sign} ${b}`, { spread: 30, integer: true });
  }
  const a = randomInt(11, 29);
  const b = randomInt(6, 24);
  const answer = a * b;
  return makeChoiceDrill(`${a} × ${b} = ?`, answer, `${a} x ${b} = ${answer}`, { spread: 18, integer: true });
}

function makeChoiceDrill(question, answer, explain, options = {}) {
  const tolerance = options.tolerance ?? 0;
  return {
    question,
    answer,
    tolerance,
    explain,
    options: makeAnswerOptions(answer, options),
    answered: false,
    selected: null,
    feedback: ""
  };
}

function makeAnswerOptions(answer, options = {}) {
  const integer = options.integer !== false && Math.abs(answer - Math.round(answer)) < 0.001;
  const spread = Math.max(1, Number(options.spread || Math.abs(answer) * 0.12 || 6));
  const normalize = (value) => integer ? Math.round(value) : Number(value.toFixed(1));
  const values = new Set([String(normalize(answer))]);
  const offsets = [-2, -1, 1, 2, 3, -3, 4, -4];
  offsets.forEach((offset) => {
    if (values.size >= 5) return;
    values.add(String(normalize(answer + offset * spread * randomChoice([0.45, 0.7, 1, 1.35]))));
  });
  while (values.size < 5) {
    values.add(String(normalize(answer + randomInt(-5, 5) * spread || answer + values.size + 1)));
  }
  return [...values].map(Number).sort(() => Math.random() - 0.5).slice(0, 5);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function renderMentalRecords() {
  const records = normalizeMentalMathRecords(state.mentalMathRecords);
  if (els.mentalBestScore) {
    const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
    els.mentalBestScore.textContent = `Best ${best}`;
  }
  renderSparkline(els.mentalSparkline, records.map((record) => record.score));
  if (!els.mentalRecordList) return;
  els.mentalRecordList.innerHTML = "";
  if (!records.length) {
    els.mentalRecordList.appendChild(emptyBlock(t("mentalEmpty")));
    return;
  }
  records.slice(-5).reverse().forEach((record) => {
    const row = document.createElement("div");
    row.className = "mental-record-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(record.label || getDrillModeLabel(record.mode))}</strong>
        <small>${escapeHtml(formatDate(record.createdAt))} · ${escapeHtml(formatDuration(record.durationSeconds))}</small>
      </div>
      <span>${escapeHtml(String(record.score))}</span>
      <small>${escapeHtml(String(record.correct))}/${escapeHtml(String(record.total))} · ${escapeHtml(String(record.accuracy))}%</small>
    `;
    els.mentalRecordList.appendChild(row);
  });
}

function renderSparkline(svg, values = []) {
  if (!svg) return;
  svg.innerHTML = "";
  const series = values.slice(-18);
  if (series.length < 2) {
    svg.innerHTML = '<text x="16" y="42">No trend yet</text>';
    return;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const points = series.map((value, index) => {
    const x = 10 + (index / Math.max(series.length - 1, 1)) * 240;
    const y = 58 - ((value - min) / range) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  svg.innerHTML = `
    <polyline class="sparkline-area" points="10,62 ${points} 250,62"></polyline>
    <polyline class="sparkline-line" points="${points}"></polyline>
    ${series.map((value, index) => {
      const [x, y] = points.split(" ")[index].split(",");
      return `<circle cx="${x}" cy="${y}" r="2.8"><title>${escapeHtml(String(value))}</title></circle>`;
    }).join("")}
  `;
}

function renderMentalLeaderboard() {
  if (!els.mentalLeaderboardList) return;
  const records = normalizeMentalMathRecords(state.mentalMathRecords);
  const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
  const rows = [
    { name: currentUser?.name || "You", score: best, self: true },
    { name: "Ari Chen", score: 22 },
    { name: "Mina Patel", score: 18 },
    { name: "Leo Wang", score: 15 },
    { name: "Sofia Kim", score: 12 }
  ].sort((a, b) => b.score - a.score);
  els.mentalLeaderboardList.innerHTML = "";
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = `mental-leaderboard-row${row.self ? " self" : ""}`;
    item.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <b>${escapeHtml(String(row.score))}</b>
    `;
    els.mentalLeaderboardList.appendChild(item);
  });
}

function makeMarketGameRound() {
  const fairValue = randomInt(82, 118);
  const volatility = randomChoice([1.5, 2, 2.5, 3.5, 4]);
  const news = randomChoice(["thin book", "fast tape", "wide client flow", "quiet auction", "late imbalance"]);
  return {
    id: makeId(),
    fairValue,
    volatility,
    news,
    score: Number(currentMarketGame?.score || 0),
    quoted: false,
    feedback: ""
  };
}

function renderMarketGame() {
  if (!currentMarketGame || !els.marketGamePrompt) return;
  if (els.marketGameScore) els.marketGameScore.textContent = String(Math.round(currentMarketGame.score || 0));
  els.marketGamePrompt.innerHTML = `
    <span>Indicative fair: <b>${escapeHtml(String(currentMarketGame.fairValue))}</b></span>
    <span>Vol: ${escapeHtml(String(currentMarketGame.volatility))} · ${escapeHtml(currentMarketGame.news)}</span>
    <small>Quote a two-sided market. Tight and centered quotes score best; crossed markets are rejected.</small>
  `;
  if (els.marketBidInput && !currentMarketGame.quoted) els.marketBidInput.value = String(Math.round(currentMarketGame.fairValue - currentMarketGame.volatility));
  if (els.marketAskInput && !currentMarketGame.quoted) els.marketAskInput.value = String(Math.round(currentMarketGame.fairValue + currentMarketGame.volatility));
  if (els.marketGameFeedback) els.marketGameFeedback.textContent = currentMarketGame.feedback || "";
}

function newMarketGame(renderAfter = true) {
  currentMarketGame = makeMarketGameRound();
  if (renderAfter) renderMentalMath();
}

function submitMarketQuote() {
  if (!currentMarketGame) return;
  if (currentMarketGame.quoted) {
    currentMarketGame.feedback = "Round already scored. Start a new market.";
    renderMarketGame();
    return;
  }
  const bid = Number(els.marketBidInput?.value);
  const ask = Number(els.marketAskInput?.value);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid >= ask) {
    currentMarketGame.feedback = "Bid must be below ask.";
    renderMarketGame();
    return;
  }
  const fair = currentMarketGame.fairValue;
  const mid = (bid + ask) / 2;
  const width = ask - bid;
  const centerPenalty = Math.abs(mid - fair) * 2.2;
  const widthPenalty = Math.max(0, width - currentMarketGame.volatility * 2.2);
  const score = Math.round(20 - centerPenalty - widthPenalty + Math.max(0, currentMarketGame.volatility * 2 - width));
  currentMarketGame.score = Number(currentMarketGame.score || 0) + score;
  currentMarketGame.quoted = true;
  currentMarketGame.feedback = `Round ${score >= 0 ? "+" : ""}${score}. Mid ${formatNumber(mid)}, width ${formatNumber(width)}, fair ${fair}.`;
  recordGameResult("market", score, `Market making quote ${bid}/${ask}; fair ${fair}`);
  renderMarketGame();
  renderSkills();
}

const POKER_TABLE_SEATS = 10;
const POKER_STARTING_STACK_BB = 100;
const POKER_MIN_PLAYERS = 2;
const POKER_BOT_NAMES = ["Ivy Bot", "Max Bot", "Rio Bot", "Nova Bot", "Kai Bot", "Vega Bot", "Mina Bot", "Theo Bot", "Luna Bot", "Axel Bot"];
const POKER_MATRIX_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const POKER_POSITION_LABELS = {
  utg: "UTG",
  hj: "HJ",
  co: "CO",
  btn: "Button",
  sb: "Small Blind",
  bb: "BB vs BTN"
};

function makePokerGameRound() {
  return createPokerTournament(getPokerMode());
}

function getPokerMode() {
  const value = els.pokerModeSelect?.value || "private";
  return ["private", "match", "local", "bots"].includes(value) ? value : "private";
}

function createPokerTournament(mode = "private") {
  const smallBlind = POKER_BLIND_LEVELS[0].small;
  const bigBlind = POKER_BLIND_LEVELS[0].big;
  const game = {
    id: makeId(),
    mode,
    roomCode: makePokerRoomCode(),
    status: "registering",
    seatCount: POKER_TABLE_SEATS,
    startingStack: bigBlind * POKER_STARTING_STACK_BB,
    players: [],
    dealerIndex: -1,
    handNumber: 0,
    handsPlayed: 0,
    blindInterval: 3,
    level: 0,
    levelIncreasedAt: -1,
    smallBlind,
    bigBlind,
    stage: "waiting",
    board: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    minRaise: bigBlind,
    actionIndex: -1,
    handActive: false,
    handComplete: true,
    tournamentOver: false,
    heroStackAtHandStart: bigBlind * POKER_STARTING_STACK_BB,
    showdown: null,
    dealSerial: 0,
    feedback: "Room created. Take seats, add bots if needed, then start the tournament.",
    log: []
  };
  addPokerHumanToGame(game, {
    id: "hero",
    name: getDefaultPokerPlayerName(),
    seat: 0,
    isHero: true
  });
  if (mode === "match" || mode === "bots") fillPokerBotsForGame(game, 3);
  addPokerLog(game, `Room ${game.roomCode} opened with 100BB stacks.`);
  return game;
}

function makePokerRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 5; index += 1) suffix += alphabet[randomInt(0, alphabet.length - 1)];
  return `QG-${suffix}`;
}

function getDefaultPokerPlayerName() {
  return normalizePokerPlayerName(currentUser?.name || "You");
}

function normalizePokerPlayerName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 18) || "Player";
}

function createPokerPlayer({ id, name, type = "human", seat, stack, isHero = false }) {
  return {
    id: id || `${type}-${makeId()}`,
    name: normalizePokerPlayerName(name),
    type,
    isHero,
    seat,
    stack: Math.max(0, Math.round(Number(stack || POKER_BLIND_LEVELS[0].big * POKER_STARTING_STACK_BB))),
    cards: [],
    currentBet: 0,
    committed: 0,
    inHand: false,
    folded: false,
    allIn: false,
    acted: false,
    eliminated: false,
    lastAction: "Registered"
  };
}

function renderPokerGame() {
  if (!els.pokerGamePrompt) return;
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  const game = currentPokerGame;
  const hero = getPokerHero(game);
  const livePlayers = getPokerLivePlayers(game);
  if (els.pokerModeSelect && els.pokerModeSelect.value !== game.mode) {
    els.pokerModeSelect.value = ["private", "match"].includes(game.mode) ? game.mode : "private";
  }
  if (els.pokerGameScore) els.pokerGameScore.textContent = hero ? String(Math.round(hero.stack)) : "0";
  if (els.pokerPlayerCount) els.pokerPlayerCount.textContent = `${game.players.length}/${game.seatCount}`;
  if (els.pokerRoomCode) els.pokerRoomCode.textContent = game.roomCode;
  if (els.pokerStageText) els.pokerStageText.textContent = getPokerStageLabel(game.stage);
  if (els.pokerBlindText) {
    els.pokerBlindText.textContent = `${game.smallBlind} / ${game.bigBlind}`;
  }
  if (els.pokerPot) els.pokerPot.textContent = `Pot ${game.pot}`;
  renderPokerRoomControls(game);
  renderPokerSeats(game);
  renderPokerBoard(game);
  renderPokerActions(game);
  renderPokerLobby(game);
  renderPokerLog(game);
  renderPokerPreflopChart();
  const active = getCurrentPokerPlayer(game);
  const toCall = active ? getPokerToCall(game, active) : 0;
  const coach = getPokerHeroPreflopCoach(game);
  els.pokerGamePrompt.innerHTML = `
    <span>${escapeHtml(game.status === "registering" ? "Registering" : "Running")} · hand <b>#${escapeHtml(String(game.handNumber || 0))}</b> · ${escapeHtml(String(livePlayers.length))} live</span>
    <span>${escapeHtml(getPokerStageLabel(game.stage))} · pot ${escapeHtml(String(game.pot))} · current bet ${escapeHtml(String(game.currentBet))}</span>
    <small>${escapeHtml(getPokerTableHint(game, active, toCall))}</small>
    ${coach ? `<small class="poker-coach-line">${escapeHtml(coach)}</small>` : ""}
  `;
  if (els.pokerGameFeedback) els.pokerGameFeedback.textContent = game.feedback || "";
  refreshIcons();
}

function getPokerTableHint(game, active, toCall) {
  if (game.tournamentOver) return "Tournament complete. Start a new room to run it back.";
  if (game.status === "registering") return "Seat at least two players. Add bots when the table is short.";
  if (game.handComplete) return "Hand finished. Deal the next hand when ready.";
  if (!active) return "Table is resolving automatic actions.";
  return `Action on ${active.name}${toCall ? `, call ${toCall}` : ", check is available"}.`;
}

function renderPokerRoomControls(game) {
  const canRegister = canPokerRegister(game);
  if (els.pokerRoomLinkInput) els.pokerRoomLinkInput.value = getPokerInviteLink(game);
  if (els.pokerPlayerNameInput && !els.pokerPlayerNameInput.value) els.pokerPlayerNameInput.value = getDefaultPokerPlayerName();
  const hasOpenSeat = getNextOpenPokerSeat(game) != null;
  if (els.pokerTakeSeatBtn) els.pokerTakeSeatBtn.disabled = !canRegister || !hasOpenSeat;
  if (els.pokerAddBotBtn) els.pokerAddBotBtn.disabled = !canRegister || !hasOpenSeat;
  if (els.pokerFillBotsBtn) els.pokerFillBotsBtn.disabled = !canRegister || !hasOpenSeat;
  if (els.pokerStartTournamentBtn) {
    els.pokerStartTournamentBtn.disabled = game.status === "running" || game.players.length < POKER_MIN_PLAYERS;
    els.pokerStartTournamentBtn.innerHTML = `<i data-lucide="play"></i>${game.status === "running" ? "Running" : "Start tournament"}`;
  }
}

function getPokerInviteLink(game) {
  const url = new URL(window.location.href);
  url.searchParams.set("pokerRoom", game?.roomCode || "QG");
  url.hash = "poker";
  return url.toString();
}

async function copyPokerRoomLink() {
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  const link = getPokerInviteLink(currentPokerGame);
  try {
    await navigator.clipboard?.writeText(link);
    currentPokerGame.feedback = "Room link copied. Share it with players before starting.";
  } catch (error) {
    els.pokerRoomLinkInput?.select();
    document.execCommand?.("copy");
    currentPokerGame.feedback = "Room link selected for copying.";
  }
  renderPokerGame();
}

function renderPokerLobby(game) {
  if (els.pokerLobbySummary) {
    const avgStack = game.players.length
      ? Math.round(game.players.reduce((sum, player) => sum + player.stack, 0) / game.players.length)
      : 0;
    const late = canPokerRegister(game) && game.status === "running" ? " · late reg open" : "";
    els.pokerLobbySummary.textContent = `${getPokerStatusLabel(game)} · avg ${avgStack} · ${POKER_STARTING_STACK_BB}BB start${late}`;
  }
  if (!els.pokerLobbyList) return;
  els.pokerLobbyList.innerHTML = "";
  game.players
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .forEach((player) => {
      const row = document.createElement("div");
      row.className = `poker-lobby-row ${player.eliminated ? "eliminated" : ""}`;
      row.innerHTML = `
        <span>Seat ${escapeHtml(String(player.seat + 1))}</span>
        <strong>${escapeHtml(player.name)}</strong>
        <small>${escapeHtml(player.type === "bot" ? "Bot" : player.isHero ? "You" : "Human")}</small>
        <b>${escapeHtml(String(Math.round(player.stack)))}</b>
      `;
      els.pokerLobbyList.appendChild(row);
    });
}

function getPokerStatusLabel(game) {
  if (game.tournamentOver) return "Complete";
  if (game.status === "running") return game.handActive ? "In hand" : "Between hands";
  return "Registering";
}

function renderPokerSeats(game) {
  if (!els.pokerSeatGrid) return;
  els.pokerSeatGrid.innerHTML = "";
  const playersBySeat = new Map(game.players.map((player) => [player.seat, player]));
  for (let seatIndex = 0; seatIndex < game.seatCount; seatIndex += 1) {
    const player = playersBySeat.get(seatIndex);
    const seat = document.createElement("div");
    if (!player) {
      seat.className = "poker-seat empty";
      const disabled = canPokerRegister(game) ? "" : "disabled";
      seat.innerHTML = `
        <span class="poker-seat-number">${escapeHtml(String(seatIndex + 1))}</span>
        <div class="poker-seat-top">
          <strong>SIT</strong>
          <span>Open seat</span>
        </div>
        <div class="poker-empty-seat-actions">
          <button type="button" data-poker-seat-action="sit" data-seat="${escapeHtml(String(seatIndex))}" ${disabled}>SIT</button>
          <button type="button" data-poker-seat-action="bot" data-seat="${escapeHtml(String(seatIndex))}" ${disabled}>BOT</button>
        </div>
        <small>${canPokerRegister(game) ? "Ready for player" : "Registration closed"}</small>
      `;
      els.pokerSeatGrid.appendChild(seat);
      continue;
    }
    const index = game.players.indexOf(player);
    const isTurn = index === game.actionIndex && game.handActive && !game.handComplete;
    seat.className = [
      "poker-seat",
      player.type === "human" ? "human" : "bot",
      isTurn ? "active" : "",
      player.folded ? "folded" : "",
      player.allIn ? "all-in" : "",
      player.eliminated || (player.stack <= 0 && !player.inHand) ? "eliminated" : ""
    ].filter(Boolean).join(" ");
    const badges = [];
    if (index === game.dealerIndex) badges.push("D");
    if (player.allIn) badges.push("ALL-IN");
    if (player.folded) badges.push("FOLD");
    if (player.eliminated) badges.push("OUT");
    const removeButton = game.status === "registering"
      ? `<button type="button" data-poker-seat-action="remove" data-player-id="${escapeHtml(player.id)}">Remove</button>`
      : "";
    seat.innerHTML = `
      <div class="poker-seat-top">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${badges.map(escapeHtml).join(" · ") || escapeHtml(player.type === "human" ? "Human" : "Bot")}</span>
      </div>
      <div class="poker-hole-cards">${renderPokerHoleCards(game, player)}</div>
      <div class="poker-seat-stack">
        <span>${escapeHtml(String(Math.max(0, Math.round(player.stack))))}</span>
        <span>Bet ${escapeHtml(String(Math.round(player.currentBet || 0)))}</span>
      </div>
      <small>${escapeHtml(player.lastAction || (player.inHand ? "Waiting" : "Registered"))}</small>
      ${removeButton}
    `;
    els.pokerSeatGrid.appendChild(seat);
  }
}

function renderPokerHoleCards(game, player) {
  const shouldReveal = player.type === "human" || game.handComplete || game.stage === "showdown";
  const cards = player.cards.length ? player.cards : [null, null];
  return cards.map((card, index) => {
    const style = `style="--deal-index:${index}"`;
    return shouldReveal && card
      ? pokerCardHtml(card, { className: "dealt", style })
      : `<span class="poker-card back dealt" ${style}>?</span>`;
  }).join("");
}

function renderPokerBoard(game) {
  if (!els.pokerBoard) return;
  els.pokerBoard.innerHTML = "";
  const cards = [...game.board];
  while (cards.length < 5) cards.push(null);
  cards.forEach((card, index) => {
    if (card) {
      els.pokerBoard.insertAdjacentHTML("beforeend", pokerCardHtml(card, {
        className: "dealt",
        style: `style="--deal-index:${index + 2}"`
      }));
      return;
    }
    const slot = document.createElement("span");
    slot.className = "poker-card empty";
    els.pokerBoard.appendChild(slot);
  });
}

function renderPokerActions(game) {
  const active = getCurrentPokerPlayer(game);
  const canAct = Boolean(active && active.type === "human" && game.status === "running" && game.handActive && !game.handComplete && !game.tournamentOver);
  const toCall = active ? getPokerToCall(game, active) : 0;
  document.querySelectorAll("[data-poker-action]").forEach((button) => {
    const action = button.dataset.pokerAction;
    button.disabled = !canAct;
    if (action === "call") button.textContent = toCall ? `Call ${toCall}` : "Check";
    if (action === "raise") button.textContent = game.currentBet ? "Raise" : "Bet";
    if (action === "allin") button.textContent = "All-in";
  });
  if (els.pokerRaiseInput) {
    const minRaiseTo = active ? getMinimumPokerRaiseTo(game, active) : 0;
    const maxRaiseTo = active ? active.currentBet + active.stack : 0;
    els.pokerRaiseInput.disabled = !canAct;
    els.pokerRaiseInput.min = String(minRaiseTo);
    els.pokerRaiseInput.max = String(maxRaiseTo);
    els.pokerRaiseInput.step = String(game.bigBlind);
    if (canAct && (!Number(els.pokerRaiseInput.value) || Number(els.pokerRaiseInput.value) < minRaiseTo)) {
      els.pokerRaiseInput.value = String(Math.min(maxRaiseTo, minRaiseTo));
    }
  }
  if (els.pokerTurnPrompt) {
    els.pokerTurnPrompt.textContent = canAct
      ? active.isHero || active.id === "hero"
        ? "YOUR TURN"
        : `${active.name} to act`
      : game.status === "registering"
        ? "Lobby open. Seat players or add bots."
        : game.handComplete
          ? "Hand complete."
          : "Bots are acting...";
  }
  if (els.nextPokerGameBtn) {
    els.nextPokerGameBtn.disabled = Boolean(game.handActive && !game.handComplete && !game.tournamentOver);
    els.nextPokerGameBtn.textContent = game.tournamentOver
      ? "New tournament"
      : game.status === "registering" ? "Start tournament" : "Next hand";
  }
}

function renderPokerLog(game) {
  if (!els.pokerLog) return;
  els.pokerLog.innerHTML = "";
  game.log.slice(-9).reverse().forEach((line) => {
    const row = document.createElement("div");
    row.textContent = line;
    els.pokerLog.appendChild(row);
  });
}

function matchPokerTournament(renderAfter = true) {
  currentPokerGame = makePokerGameRound();
  if (currentPokerGame.mode === "private") fillPokerBotsForGame(currentPokerGame, 2);
  currentPokerGame.feedback = "New room matched. Start now or add more players.";
  if (renderAfter) renderPokerGame();
}

function newPokerGame(renderAfter = true) {
  if (!currentPokerGame || currentPokerGame.tournamentOver) {
    resetPokerTournament(false);
  } else if (currentPokerGame.status === "registering") {
    startPokerTournament(false);
  } else if (currentPokerGame.handActive && !currentPokerGame.handComplete) {
    currentPokerGame.feedback = "Finish the current hand before dealing the next one.";
  } else {
    startNextPokerHand(currentPokerGame);
  }
  if (renderAfter) renderPokerGame();
}

function resetPokerTournament(renderAfter = true) {
  currentPokerGame = makePokerGameRound();
  if (renderAfter) renderPokerGame();
}

function startPokerTournament(renderAfter = true) {
  const game = currentPokerGame || makePokerGameRound();
  currentPokerGame = game;
  if (game.players.length < POKER_MIN_PLAYERS) {
    game.feedback = "Need at least two seated players. Add a bot to start heads-up.";
    if (renderAfter) renderPokerGame();
    return;
  }
  if (game.status !== "running") {
    game.status = "running";
    game.feedback = "Tournament started. Shuffle up and deal.";
    addPokerLog(game, "Tournament started.");
  }
  if (!game.handActive && game.handComplete && !game.tournamentOver) startNextPokerHand(game);
  if (renderAfter) renderPokerGame();
}

function canPokerRegister(game) {
  if (!game || game.tournamentOver || game.handActive) return false;
  if (game.status === "registering") return true;
  return game.status === "running" && game.handsPlayed < 3;
}

function getNextOpenPokerSeat(game) {
  const occupied = new Set(game.players.map((player) => player.seat));
  for (let seat = 0; seat < game.seatCount; seat += 1) {
    if (!occupied.has(seat)) return seat;
  }
  return null;
}

function takePokerSeat(seat = null, renderAfter = true) {
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  const game = currentPokerGame;
  if (!canPokerRegister(game)) {
    game.feedback = "Registration is closed while a hand is running.";
    if (renderAfter) renderPokerGame();
    return;
  }
  const targetSeat = Number.isInteger(seat) ? seat : getNextOpenPokerSeat(game);
  if (targetSeat == null) {
    game.feedback = "No open seats at this table.";
    if (renderAfter) renderPokerGame();
    return;
  }
  const isHero = !getPokerHero(game);
  const rawName = els.pokerPlayerNameInput?.value || (isHero ? getDefaultPokerPlayerName() : `Guest ${game.players.length + 1}`);
  const name = uniquePokerName(game, rawName);
  addPokerHumanToGame(game, { id: isHero ? "hero" : `human-${makeId()}`, name, seat: targetSeat, isHero });
  game.feedback = `${name} took seat ${targetSeat + 1}.`;
  addPokerLog(game, game.feedback);
  if (renderAfter) renderPokerGame();
}

function addPokerHumanToGame(game, options = {}) {
  const seat = Number.isInteger(options.seat) ? options.seat : getNextOpenPokerSeat(game);
  if (seat == null) return null;
  const player = createPokerPlayer({
    id: options.id,
    name: options.name,
    type: "human",
    seat,
    stack: game.startingStack,
    isHero: Boolean(options.isHero)
  });
  game.players.push(player);
  sortPokerPlayers(game);
  return player;
}

function addPokerBot(renderAfter = true, seat = null) {
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  const game = currentPokerGame;
  if (!canPokerRegister(game)) {
    game.feedback = "Bots can join before the next hand, not mid-hand.";
    if (renderAfter) renderPokerGame();
    return;
  }
  const player = addPokerBotToGame(game, seat);
  game.feedback = player ? `${player.name} joined seat ${player.seat + 1}.` : "No open seats for another bot.";
  if (player) addPokerLog(game, game.feedback);
  if (renderAfter) renderPokerGame();
}

function addPokerBotToGame(game, seat = null) {
  const targetSeat = Number.isInteger(seat) ? seat : getNextOpenPokerSeat(game);
  if (targetSeat == null) return null;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = POKER_BOT_NAMES.find((botName) => !usedNames.has(botName)) || `Bot ${game.players.length + 1}`;
  const player = createPokerPlayer({
    id: `bot-${makeId()}`,
    name,
    type: "bot",
    seat: targetSeat,
    stack: game.startingStack
  });
  game.players.push(player);
  sortPokerPlayers(game);
  return player;
}

function fillPokerBots(renderAfter = true) {
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  const added = fillPokerBotsForGame(currentPokerGame, currentPokerGame.seatCount);
  currentPokerGame.feedback = added
    ? `Added ${added} bot${added > 1 ? "s" : ""}.`
    : "Table is already full.";
  if (renderAfter) renderPokerGame();
}

function fillPokerBotsForGame(game, targetCount = game.seatCount) {
  let added = 0;
  while (game.players.length < Math.min(targetCount, game.seatCount) && getNextOpenPokerSeat(game) != null) {
    if (!addPokerBotToGame(game)) break;
    added += 1;
  }
  return added;
}

function handlePokerSeatClick(event) {
  const button = event.target.closest("[data-poker-seat-action]");
  if (!button || !currentPokerGame) return;
  const seat = Number(button.dataset.seat);
  const action = button.dataset.pokerSeatAction;
  if (action === "sit") {
    takePokerSeat(Number.isInteger(seat) ? seat : null);
    return;
  }
  if (action === "bot") {
    addPokerBot(true, Number.isInteger(seat) ? seat : null);
    return;
  }
  if (action === "remove") {
    removePokerPlayer(button.dataset.playerId);
  }
}

function removePokerPlayer(playerId) {
  const game = currentPokerGame;
  if (!game || game.status !== "registering") return;
  const player = game.players.find((item) => item.id === playerId);
  if (!player) return;
  game.players = game.players.filter((item) => item.id !== playerId);
  if (player.isHero && game.players[0]) game.players[0].isHero = true;
  game.feedback = `${player.name} left the room.`;
  addPokerLog(game, game.feedback);
  renderPokerGame();
}

function uniquePokerName(game, rawName) {
  const base = normalizePokerPlayerName(rawName);
  const used = new Set(game.players.map((player) => player.name.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${base} ${index}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${randomInt(100, 999)}`;
}

function sortPokerPlayers(game) {
  game.players.sort((a, b) => a.seat - b.seat);
}

function startNextPokerHand(game) {
  if (!game) return;
  if (game.status !== "running") {
    startPokerTournament(false);
    return;
  }
  sortPokerPlayers(game);
  maybeIncreasePokerBlinds(game);
  game.players.forEach((player) => {
    player.eliminated = player.stack <= 0;
    player.cards = [];
    player.currentBet = 0;
    player.committed = 0;
    player.inHand = !player.eliminated && player.stack > 0;
    player.folded = false;
    player.allIn = false;
    player.acted = false;
    player.lastAction = player.eliminated ? "Eliminated" : "In hand";
  });
  const livePlayers = getPokerLivePlayers(game);
  if (livePlayers.length <= 1) {
    game.tournamentOver = true;
    game.handActive = false;
    game.handComplete = true;
    game.stage = "showdown";
    game.feedback = livePlayers[0] ? `${livePlayers[0].name} wins the tournament.` : "Tournament complete.";
    addPokerLog(game, game.feedback);
    return;
  }
  game.handNumber += 1;
  game.dealSerial += 1;
  game.stage = "preflop";
  game.board = [];
  game.deck = shufflePokerDeck(createPokerDeck());
  game.pot = 0;
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.showdown = null;
  game.handActive = true;
  game.handComplete = false;
  game.heroStackAtHandStart = getPokerHero(game)?.stack || 0;
  game.dealerIndex = nextPokerSeatWithStack(game, game.dealerIndex);
  const blindSeats = getPokerBlindSeats(game);
  dealPokerHoleCards(game);
  postPokerBlind(game, blindSeats.small, game.smallBlind, "small blind");
  postPokerBlind(game, blindSeats.big, game.bigBlind, "big blind");
  game.actionIndex = nextPokerActionSeat(game, blindSeats.big);
  addPokerLog(game, `Hand #${game.handNumber}: blinds ${game.smallBlind}/${game.bigBlind}.`);
  game.feedback = `${game.players[game.dealerIndex]?.name || "Dealer"} has the button.`;
  continuePokerHand(game);
}

function submitPokerAction(action) {
  const game = currentPokerGame;
  if (!game || !action || game.handComplete || game.tournamentOver) return;
  const player = getCurrentPokerPlayer(game);
  if (!player || player.type !== "human") return;
  const raiseTo = action === "raise" ? Number(els.pokerRaiseInput?.value || 0) : 0;
  performPokerAction(game, game.actionIndex, action, raiseTo);
  continuePokerHand(game);
  renderPokerGame();
  renderSkills();
}

function continuePokerHand(game) {
  let guard = 0;
  while (game.handActive && !game.handComplete && !game.tournamentOver && guard < 80) {
    guard += 1;
    const contenders = getPokerContenders(game);
    if (contenders.length <= 1) {
      awardPokerPot(game, contenders[0], "Everyone else folded.");
      break;
    }
    const eligible = getPokerEligiblePlayers(game);
    if (!eligible.length) {
      runPokerBoardToShowdown(game);
      break;
    }
    if (isPokerBettingRoundComplete(game)) {
      advancePokerStreet(game);
      continue;
    }
    if (!isPokerActionSeat(game, game.actionIndex)) {
      game.actionIndex = nextPokerActionSeat(game, game.actionIndex);
      continue;
    }
    const player = game.players[game.actionIndex];
    if (player.type === "human") break;
    const botDecision = choosePokerBotAction(game, player);
    performPokerAction(game, game.actionIndex, botDecision.action, botDecision.raiseTo);
  }
  if (guard >= 80) {
    game.feedback = "Poker engine paused after too many automatic actions. Start a new hand.";
    game.handComplete = true;
    game.handActive = false;
  }
}

function performPokerAction(game, playerIndex, action, raiseTo = 0) {
  const player = game.players[playerIndex];
  if (!player || !player.inHand || player.folded || player.allIn) return;
  const toCall = getPokerToCall(game, player);
  if (action === "fold") {
    player.folded = true;
    player.acted = true;
    player.lastAction = "Fold";
    addPokerLog(game, `${player.name} folds.`);
    game.actionIndex = nextPokerActionSeat(game, playerIndex);
    return;
  }
  if (action === "allin") {
    raiseTo = player.currentBet + player.stack;
    action = raiseTo > game.currentBet ? "raise" : "call";
  }
  if (action === "raise") {
    const previousBet = game.currentBet;
    const maxTotal = player.currentBet + player.stack;
    const minTotal = getMinimumPokerRaiseTo(game, player);
    const targetTotal = Math.min(maxTotal, Math.max(minTotal, Math.round(Number(raiseTo || minTotal))));
    const paid = commitPokerChips(player, targetTotal - player.currentBet);
    if (targetTotal > previousBet) {
      const raiseSize = targetTotal - previousBet;
      game.currentBet = targetTotal;
      game.minRaise = Math.max(game.bigBlind, raiseSize);
      game.players.forEach((other) => {
        if (other.inHand && !other.folded && !other.allIn && other.id !== player.id) other.acted = false;
      });
    }
    player.acted = true;
    player.lastAction = player.allIn ? "All-in" : `Raise to ${player.currentBet}`;
    game.pot += paid;
    addPokerLog(game, `${player.name} raises to ${player.currentBet}${player.allIn ? " and is all-in" : ""}.`);
    game.actionIndex = nextPokerActionSeat(game, playerIndex);
    return;
  }
  const paid = commitPokerChips(player, toCall);
  game.pot += paid;
  player.acted = true;
  player.lastAction = toCall ? `Call ${paid}` : "Check";
  addPokerLog(game, toCall ? `${player.name} calls ${paid}${player.allIn ? " and is all-in" : ""}.` : `${player.name} checks.`);
  game.actionIndex = nextPokerActionSeat(game, playerIndex);
}

function commitPokerChips(player, amount) {
  const paid = Math.min(Math.max(0, Math.round(Number(amount || 0))), player.stack);
  player.stack -= paid;
  player.currentBet += paid;
  player.committed += paid;
  if (player.stack <= 0) {
    player.stack = 0;
    player.allIn = true;
  }
  return paid;
}

function advancePokerStreet(game) {
  if (game.stage === "river") {
    showdownPokerHand(game);
    return;
  }
  game.stage = game.stage === "preflop" ? "flop" : game.stage === "flop" ? "turn" : "river";
  game.dealSerial += 1;
  const cardsToDeal = game.stage === "flop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index += 1) {
    const card = drawPokerCard(game);
    if (card) game.board.push(card);
  }
  resetPokerStreetBets(game);
  game.actionIndex = nextPokerActionSeat(game, game.dealerIndex);
  addPokerLog(game, `${getPokerStageLabel(game.stage)}: ${game.board.map(pokerCardLabel).join(" ")}.`);
}

function runPokerBoardToShowdown(game) {
  while (game.stage !== "river") advancePokerStreet(game);
  showdownPokerHand(game);
}

function showdownPokerHand(game) {
  const contenders = getPokerContenders(game);
  const results = contenders.map((player) => ({
    player,
    hand: evaluatePokerHand([...player.cards, ...game.board])
  }));
  results.sort((a, b) => comparePokerHands(b.hand, a.hand));
  const pots = buildPokerPots(game.players);
  const awardLines = [];
  const winnerIds = new Set();
  pots.forEach((pot, potIndex) => {
    const eligible = results.filter((result) => pot.eligibleIds.includes(result.player.id));
    eligible.sort((a, b) => comparePokerHands(b.hand, a.hand));
    const best = eligible[0]?.hand;
    const winners = eligible.filter((result) => best && comparePokerHands(result.hand, best) === 0);
    if (!winners.length || pot.amount <= 0) return;
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    winners.forEach((result) => {
      result.player.stack += share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      winnerIds.add(result.player.id);
    });
    const label = potIndex === 0 ? "main pot" : `side pot ${potIndex}`;
    awardLines.push(`${winners.map((result) => result.player.name).join(", ")} wins ${pot.amount} ${label}`);
  });
  const top = results[0]?.hand;
  const bestName = top ? `${top.name} (${top.cards.map(pokerCardLabel).join(" ")})` : "best hand";
  game.showdown = { winners: [...winnerIds], results, pots };
  finishPokerHand(game, `${awardLines.join(". ")} with ${bestName}.`);
}

function buildPokerPots(players) {
  const levels = [...new Set(players
    .map((player) => Math.round(player.committed || 0))
    .filter((amount) => amount > 0))]
    .sort((a, b) => a - b);
  let previous = 0;
  return levels.map((level) => {
    const contributors = players.filter((player) => (player.committed || 0) >= level);
    const amount = (level - previous) * contributors.length;
    previous = level;
    return {
      amount,
      eligibleIds: contributors
        .filter((player) => player.inHand && !player.folded)
        .map((player) => player.id)
    };
  }).filter((pot) => pot.amount > 0 && pot.eligibleIds.length);
}

function awardPokerPot(game, winner, reason = "") {
  if (winner) winner.stack += game.pot;
  finishPokerHand(game, `${winner?.name || "Nobody"} wins ${game.pot}. ${reason}`.trim());
}

function finishPokerHand(game, message) {
  game.feedback = message;
  game.handComplete = true;
  game.handActive = false;
  game.stage = game.showdown ? "showdown" : game.stage;
  game.actionIndex = -1;
  game.handsPlayed += 1;
  game.players.forEach((player) => {
    player.eliminated = player.stack <= 0;
    if (player.eliminated) player.lastAction = "Eliminated";
  });
  addPokerLog(game, message);
  recordPokerHandResult(game, message);
  const livePlayers = getPokerLivePlayers(game);
  if (livePlayers.length <= 1) {
    game.tournamentOver = true;
    game.feedback = `${livePlayers[0]?.name || "Winner"} wins the tournament.`;
    addPokerLog(game, game.feedback);
  }
}

function recordPokerHandResult(game, message) {
  if (game.recordedHandId === `${game.id}:${game.handNumber}`) return;
  game.recordedHandId = `${game.id}:${game.handNumber}`;
  const hero = getPokerHero(game);
  if (!hero) return;
  const chipDelta = hero.stack - game.heroStackAtHandStart;
  const score = clampNumber(Math.round(chipDelta / Math.max(game.bigBlind, 1)), -24, 36);
  recordGameResult("poker", score, `Poker hand #${game.handNumber}: ${message} Hero ${chipDelta >= 0 ? "+" : ""}${chipDelta} chips`);
}

function choosePokerBotAction(game, player) {
  const toCall = getPokerToCall(game, player);
  const preflopPlan = !game.board.length ? getPreflopStrategyForCards(player.cards, getPokerPositionForPlayer(game, game.players.indexOf(player))) : null;
  const strength = getPokerDecisionStrength(game, player) + randomInt(-8, 8);
  const potOddsPressure = toCall ? (toCall / Math.max(game.pot + toCall, 1)) * 100 : 0;
  if (toCall > 0) {
    if (preflopPlan?.tier === "fold" && toCall > game.bigBlind * 0.5) return { action: "fold" };
    if (strength < 28 + potOddsPressure * 0.8 && toCall > game.bigBlind * 0.5) return { action: "fold" };
    if ((strength > 76 || preflopPlan?.tier === "raise") && player.stack > toCall + game.bigBlind * 2) {
      return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise * randomChoice([1, 2, 3])) };
    }
    return { action: "call" };
  }
  if ((strength > 72 || preflopPlan?.tier === "raise") && player.stack > game.bigBlind * 2) {
    return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * randomChoice([2, 3, 4])) };
  }
  if (strength > 58 && Math.random() < 0.2 && player.stack > game.bigBlind * 2) {
    return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * 2) };
  }
  return { action: "call" };
}

function getPokerDecisionStrength(game, player) {
  if (!game.board.length) return estimatePreflopStrength(player.cards);
  const evaluated = evaluatePokerHand([...player.cards, ...game.board]);
  const base = evaluated.rank * 12 + (evaluated.tiebreakers[0] || 0) * 1.4;
  const boardPressure = game.board.length < 5 ? 6 : 0;
  return clampNumber(Math.round(base + boardPressure), 0, 100);
}

function estimatePreflopStrength(cards) {
  const handKey = getStartingHandKey(cards);
  return handKey ? getStartingHandScore(handKey) : 0;
}

function renderPokerPreflopChart() {
  if (!els.pokerPreflopMatrix || !els.pokerPreflopDetail) return;
  const position = els.pokerPreflopPositionSelect?.value || "btn";
  els.pokerPreflopMatrix.innerHTML = "";
  const corner = document.createElement("span");
  corner.className = "poker-matrix-header corner";
  corner.textContent = POKER_POSITION_LABELS[position] || "POS";
  els.pokerPreflopMatrix.appendChild(corner);
  POKER_MATRIX_RANKS.forEach((rank) => {
    const header = document.createElement("span");
    header.className = "poker-matrix-header";
    header.textContent = rank;
    els.pokerPreflopMatrix.appendChild(header);
  });
  POKER_MATRIX_RANKS.forEach((rowRank, rowIndex) => {
    const rowHeader = document.createElement("span");
    rowHeader.className = "poker-matrix-header";
    rowHeader.textContent = rowRank;
    els.pokerPreflopMatrix.appendChild(rowHeader);
    POKER_MATRIX_RANKS.forEach((colRank, colIndex) => {
      const handKey = getMatrixHandKey(rowIndex, colIndex);
      const strategy = getPreflopStrategyForHand(handKey, position);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `poker-matrix-cell ${strategy.tier}${handKey === selectedPokerPreflopHand ? " selected" : ""}`;
      button.dataset.hand = handKey;
      button.title = `${handKey}: ${strategy.label}`;
      button.innerHTML = `<strong>${escapeHtml(handKey)}</strong><span>${escapeHtml(strategy.code)}</span>`;
      els.pokerPreflopMatrix.appendChild(button);
    });
  });
  renderPokerPreflopDetail(selectedPokerPreflopHand, position);
}

function handlePokerPreflopMatrixClick(event) {
  const button = event.target.closest("[data-hand]");
  if (!button) return;
  selectedPokerPreflopHand = button.dataset.hand || selectedPokerPreflopHand;
  renderPokerPreflopChart();
}

function renderPokerPreflopDetail(handKey = selectedPokerPreflopHand, position = els.pokerPreflopPositionSelect?.value || "btn") {
  if (!els.pokerPreflopDetail) return;
  const strategy = getPreflopStrategyForHand(handKey, position);
  els.pokerPreflopDetail.innerHTML = `
    <span class="rank-label">100BB ${escapeHtml(POKER_POSITION_LABELS[position] || position.toUpperCase())}</span>
    <h4>${escapeHtml(handKey)} · ${escapeHtml(strategy.label)}</h4>
    <p>${escapeHtml(strategy.description)}</p>
    <div class="poker-frequency-bar" aria-label="Suggested frequency">
      <i style="width:${escapeHtml(String(strategy.frequency))}%"></i>
    </div>
    <small>Frequency ${escapeHtml(String(strategy.frequency))}% · sizing baseline: open 2.2BB, 3-bet 8-10BB in position, 10-12BB out of position.</small>
  `;
}

function getPokerHeroPreflopCoach(game) {
  const hero = getPokerHero(game);
  if (!hero || game.stage !== "preflop" || hero.cards.length < 2 || game.handComplete) return "";
  const position = getPokerPositionForPlayer(game, game.players.indexOf(hero));
  const strategy = getPreflopStrategyForCards(hero.cards, position);
  const handKey = getStartingHandKey(hero.cards);
  return `100BB chart: ${handKey} from ${POKER_POSITION_LABELS[position] || position.toUpperCase()} -> ${strategy.label} (${strategy.frequency}%).`;
}

function getPreflopStrategyForCards(cards, position = "btn") {
  const handKey = getStartingHandKey(cards);
  return handKey ? getPreflopStrategyForHand(handKey, position) : getPreflopStrategyForHand("72o", position);
}

function getMatrixHandKey(rowIndex, colIndex) {
  const high = POKER_MATRIX_RANKS[Math.min(rowIndex, colIndex)];
  const low = POKER_MATRIX_RANKS[Math.max(rowIndex, colIndex)];
  if (rowIndex === colIndex) return `${high}${low}`;
  return `${high}${low}${colIndex > rowIndex ? "s" : "o"}`;
}

function getStartingHandKey(cards) {
  if (!cards || cards.length < 2) return "";
  const [a, b] = [...cards].sort((left, right) => right.value - left.value);
  if (a.rank === b.rank) return `${a.rank}${b.rank}`;
  return `${a.rank}${b.rank}${a.suit === b.suit ? "s" : "o"}`;
}

function getStartingHandScore(handKey) {
  const parsed = parseStartingHandKey(handKey);
  if (!parsed) return 0;
  const { high, low, pair, suited, gap } = parsed;
  let score = high * 4 + low * 2 - gap * 4;
  if (pair) score += 38 + high * 2.2;
  if (suited) score += 8;
  if (gap <= 1) score += 7;
  if (gap === 2) score += 3;
  if (high === 14) score += 8;
  if (suited && high === 14) score += 6;
  if (suited && high <= 9 && gap <= 1) score += 9;
  if (!suited && high < 12 && gap > 2) score -= 10;
  return clampNumber(Math.round(score), 0, 100);
}

function getPreflopStrategyForHand(handKey, position = "btn") {
  const score = getStartingHandScore(handKey);
  const parsed = parseStartingHandKey(handKey);
  const thresholds = {
    utg: { open: 78, mix: 70 },
    hj: { open: 72, mix: 64 },
    co: { open: 64, mix: 55 },
    btn: { open: 52, mix: 42 },
    sb: { open: 58, mix: 47 },
    bb: { open: 45, mix: 34 }
  };
  const limits = thresholds[position] || thresholds.btn;
  if (position === "bb") {
    if (score >= 78) {
      return {
        tier: "raise",
        code: "3B",
        label: "3-bet or defend",
        frequency: 90,
        description: "Strong enough to 3-bet for value often; flat sometimes to keep dominated hands in."
      };
    }
    if (score >= limits.open) {
      return {
        tier: "defend",
        code: "DEF",
        label: "Defend",
        frequency: clampNumber(score, 45, 78),
        description: "Continue versus a button open. Prefer call with playable suited and connected hands."
      };
    }
    if (score >= limits.mix) {
      return {
        tier: "mix",
        code: "MIX",
        label: "Mix defend",
        frequency: 35,
        description: "Borderline defend. Continue more versus small opens or passive opponents; fold versus larger sizing."
      };
    }
    return {
      tier: "fold",
      code: "F",
      label: "Fold",
      frequency: 0,
      description: "Too weak to defend profitably at 100BB without a clear exploit."
    };
  }
  const premiumBroadway = ["AKs", "AKo", "AQs", "AQo", "AJs"].includes(handKey);
  if (score >= 84 || (parsed?.pair && parsed.high >= 11) || premiumBroadway) {
    return {
      tier: "raise",
      code: "R",
      label: "Open raise",
      frequency: 100,
      description: "Pure open at 100BB. Continue aggressively versus 3-bets depending on position and sizing."
    };
  }
  if (score >= limits.open) {
    return {
      tier: "open",
      code: "R",
      label: "Open raise",
      frequency: 85,
      description: "Profitable open in this position. Use 2.0-2.5BB sizing and keep postflop plan simple."
    };
  }
  if (score >= limits.mix) {
    return {
      tier: "mix",
      code: "MIX",
      label: "Mix open",
      frequency: 40,
      description: "Open some frequency, especially at softer tables or when blinds overfold. Otherwise fold."
    };
  }
  return {
    tier: "fold",
    code: "F",
    label: "Fold",
    frequency: 0,
    description: "Default fold in this position at 100BB. Save chips for better blockers, pairs, suited aces, and connected hands."
  };
}

function parseStartingHandKey(handKey) {
  const text = String(handKey || "");
  if (text.length < 2) return null;
  const rankValue = (rank) => POKER_RANKS.indexOf(rank) + 2;
  const first = text[0];
  const second = text[1];
  const firstValue = rankValue(first);
  const secondValue = rankValue(second);
  if (firstValue < 2 || secondValue < 2) return null;
  const high = Math.max(firstValue, secondValue);
  const low = Math.min(firstValue, secondValue);
  return {
    high,
    low,
    pair: first === second,
    suited: text.endsWith("s"),
    offsuit: text.endsWith("o"),
    gap: Math.abs(high - low)
  };
}

function evaluatePokerHand(cards) {
  const sorted = [...cards].filter(Boolean).sort((a, b) => b.value - a.value);
  const groups = new Map();
  sorted.forEach((card) => {
    if (!groups.has(card.value)) groups.set(card.value, []);
    groups.get(card.value).push(card);
  });
  const groupsByCount = [...groups.entries()]
    .map(([value, valueCards]) => ({ value: Number(value), cards: valueCards, count: valueCards.length }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flushCards = POKER_SUITS
    .map((suit) => sorted.filter((card) => card.suit === suit.key))
    .find((suitedCards) => suitedCards.length >= 5);
  const straightHigh = findPokerStraightHigh([...groups.keys()].map(Number));
  const straightFlushHigh = flushCards ? findPokerStraightHigh([...new Set(flushCards.map((card) => card.value))]) : 0;
  if (straightFlushHigh) return buildPokerEval(8, [straightFlushHigh], straightCards(sorted, straightFlushHigh, flushCards?.[0]?.suit));
  const quads = groupsByCount.find((group) => group.count === 4);
  if (quads) {
    const kicker = sorted.find((card) => card.value !== quads.value);
    return buildPokerEval(7, [quads.value, kicker?.value || 0], [...quads.cards, kicker].filter(Boolean));
  }
  const trips = groupsByCount.filter((group) => group.count >= 3);
  const pairs = groupsByCount.filter((group) => group.count >= 2 && group.value !== trips[0]?.value);
  if (trips.length && (pairs.length || trips.length > 1)) {
    const pairGroup = pairs[0] || trips[1];
    return buildPokerEval(6, [trips[0].value, pairGroup.value], [...trips[0].cards.slice(0, 3), ...pairGroup.cards.slice(0, 2)]);
  }
  if (flushCards) return buildPokerEval(5, flushCards.slice(0, 5).map((card) => card.value), flushCards.slice(0, 5));
  if (straightHigh) return buildPokerEval(4, [straightHigh], straightCards(sorted, straightHigh));
  if (trips.length) {
    const kickers = sorted.filter((card) => card.value !== trips[0].value).slice(0, 2);
    return buildPokerEval(3, [trips[0].value, ...kickers.map((card) => card.value)], [...trips[0].cards.slice(0, 3), ...kickers]);
  }
  const madePairs = groupsByCount.filter((group) => group.count >= 2);
  if (madePairs.length >= 2) {
    const topPairs = madePairs.slice(0, 2);
    const kicker = sorted.find((card) => !topPairs.some((pair) => pair.value === card.value));
    return buildPokerEval(2, [topPairs[0].value, topPairs[1].value, kicker?.value || 0], [...topPairs[0].cards.slice(0, 2), ...topPairs[1].cards.slice(0, 2), kicker].filter(Boolean));
  }
  if (madePairs.length === 1) {
    const kickers = sorted.filter((card) => card.value !== madePairs[0].value).slice(0, 3);
    return buildPokerEval(1, [madePairs[0].value, ...kickers.map((card) => card.value)], [...madePairs[0].cards.slice(0, 2), ...kickers]);
  }
  return buildPokerEval(0, sorted.slice(0, 5).map((card) => card.value), sorted.slice(0, 5));
}

function buildPokerEval(rank, tiebreakers, cards) {
  return {
    rank,
    name: POKER_HAND_NAMES[rank] || "Hand",
    tiebreakers,
    cards: cards.filter(Boolean).slice(0, 5)
  };
}

function comparePokerHands(a, b) {
  if ((a?.rank || 0) !== (b?.rank || 0)) return (a?.rank || 0) - (b?.rank || 0);
  const left = a?.tiebreakers || [];
  const right = b?.tiebreakers || [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

function findPokerStraightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const run = unique.slice(index, index + 5);
    if (run.every((value, runIndex) => runIndex === 0 || value === run[runIndex - 1] - 1)) return run[0] === 1 ? 5 : run[0];
  }
  return 0;
}

function straightCards(cards, high, suit = "") {
  const values = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  return values.map((value) => cards.find((card) => card.value === value && (!suit || card.suit === suit))).filter(Boolean);
}

function createPokerDeck() {
  return POKER_SUITS.flatMap((suit) => POKER_RANKS.map((rank, index) => ({
    rank,
    value: index + 2,
    suit: suit.key,
    suitSymbol: suit.symbol,
    id: `${rank}${suit.key}`
  })));
}

function shufflePokerDeck(deck) {
  const cards = [...deck];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function drawPokerCard(game) {
  return game.deck.pop();
}

function dealPokerHoleCards(game) {
  for (let round = 0; round < 2; round += 1) {
    game.players.forEach((player) => {
      if (player.inHand) player.cards.push(drawPokerCard(game));
    });
  }
}

function postPokerBlind(game, playerIndex, amount, label) {
  const player = game.players[playerIndex];
  if (!player) return;
  const paid = commitPokerChips(player, amount);
  player.acted = false;
  player.lastAction = `${label} ${paid}`;
  game.currentBet = Math.max(game.currentBet, player.currentBet);
  game.pot += paid;
  addPokerLog(game, `${player.name} posts ${label} ${paid}.`);
}

function resetPokerStreetBets(game) {
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.players.forEach((player) => {
    player.currentBet = 0;
    player.acted = false;
  });
}

function maybeIncreasePokerBlinds(game) {
  if (game.handsPlayed > 0 && game.handsPlayed % game.blindInterval === 0 && game.levelIncreasedAt !== game.handsPlayed) {
    game.level = Math.min(POKER_BLIND_LEVELS.length - 1, game.level + 1);
    game.levelIncreasedAt = game.handsPlayed;
    const level = POKER_BLIND_LEVELS[game.level];
    game.smallBlind = level.small;
    game.bigBlind = level.big;
    game.minRaise = level.big;
    addPokerLog(game, `Blinds increase to ${game.smallBlind}/${game.bigBlind}.`);
  }
}

function getPokerLivePlayers(game) {
  return game.players.filter((player) => !player.eliminated && player.stack > 0);
}

function getPokerPositionForPlayer(game, playerIndex) {
  const player = game.players[playerIndex];
  if (!player || game.dealerIndex < 0) return "btn";
  const liveIndexes = game.players
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.eliminated && item.stack > 0)
    .map(({ index }) => index);
  const heroOrder = liveIndexes.indexOf(playerIndex);
  const dealerOrder = liveIndexes.indexOf(game.dealerIndex);
  if (heroOrder < 0 || dealerOrder < 0) return "btn";
  const count = liveIndexes.length;
  const relative = (heroOrder - dealerOrder + count) % count;
  if (count === 2) return relative === 0 ? "sb" : "bb";
  if (relative === 0) return "btn";
  if (relative === 1) return "sb";
  if (relative === 2) return "bb";
  const early = ["utg", "hj", "co"];
  return early[Math.max(0, early.length - (count - relative))] || "co";
}

function getPokerBlindSeats(game) {
  const liveCount = game.players.filter((player) => !player.eliminated).length;
  if (liveCount === 2) {
    return {
      small: game.dealerIndex,
      big: nextPokerSeatWithStack(game, game.dealerIndex)
    };
  }
  const small = nextPokerSeatWithStack(game, game.dealerIndex);
  return {
    small,
    big: nextPokerSeatWithStack(game, small)
  };
}

function nextPokerSeatWithStack(game, fromIndex) {
  for (let step = 1; step <= game.players.length; step += 1) {
    const index = (fromIndex + step + game.players.length) % game.players.length;
    if (game.players[index].stack > 0) return index;
  }
  return 0;
}

function nextPokerActionSeat(game, fromIndex) {
  for (let step = 1; step <= game.players.length; step += 1) {
    const index = (fromIndex + step + game.players.length) % game.players.length;
    if (isPokerActionSeat(game, index)) return index;
  }
  return -1;
}

function isPokerActionSeat(game, index) {
  const player = game.players[index];
  return Boolean(player && player.inHand && !player.folded && !player.allIn && player.stack > 0);
}

function getPokerContenders(game) {
  return game.players.filter((player) => player.inHand && !player.folded);
}

function getPokerEligiblePlayers(game) {
  return game.players.filter((player) => player.inHand && !player.folded && !player.allIn && player.stack > 0);
}

function isPokerBettingRoundComplete(game) {
  const eligible = getPokerEligiblePlayers(game);
  if (!eligible.length) return true;
  return eligible.every((player) => player.acted && player.currentBet === game.currentBet);
}

function getPokerToCall(game, player) {
  return Math.max(0, game.currentBet - (player?.currentBet || 0));
}

function getMinimumPokerRaiseTo(game, player) {
  if (!player) return 0;
  if (game.currentBet <= 0) return Math.min(player.stack, game.bigBlind);
  return Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise);
}

function getCurrentPokerPlayer(game) {
  return game.players[game.actionIndex] || null;
}

function getPokerHero(game) {
  return game.players.find((player) => player.isHero || player.id === "hero") || game.players[0];
}

function getPokerStageLabel(stage) {
  const labels = {
    waiting: "Waiting",
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown"
  };
  return labels[stage] || "Hand";
}

function addPokerLog(game, line) {
  if (!line) return;
  game.log = [...(game.log || []), line].slice(-24);
  game.feedback = line;
}

function pokerCardLabel(card) {
  return `${card.rank}${card.suitSymbol}`;
}

function pokerCardHtml(card, options = {}) {
  const extraClass = options.className ? ` ${options.className}` : "";
  const style = options.style ? ` ${options.style}` : "";
  const rank = card.rank === "T" ? "10" : card.rank;
  return `
    <span class="poker-card ${isRedPokerCard(card) ? "red" : "black"}${extraClass}"${style} aria-label="${escapeHtml(pokerCardLabel(card))}">
      <span class="poker-card-rank">${escapeHtml(rank)}</span>
      <span class="poker-card-suit">${escapeHtml(card.suitSymbol)}</span>
    </span>
  `;
}

function isRedPokerCard(card) {
  return card?.suit === "h" || card?.suit === "d";
}

function recordGameResult(game, score, detail) {
  state.gameRecords = normalizeGameRecords([...(state.gameRecords || []), {
    id: makeId(),
    game,
    score,
    detail,
    createdAt: new Date().toISOString()
  }]);
  const skillKey = game === "market" ? "market" : "probabilityExpectation";
  const xpGain = Math.max(2, Math.abs(score));
  state.skills[skillKey] = Math.max(0, (state.skills[skillKey] || 0) + xpGain);
  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: detail,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === skillKey ? xpGain : 0])),
    totalXp: xpGain,
    duration: 0
  });
  saveState();
  renderSummary();
}

function setupSkillRadarInteractions() {
  const canvas = els.skillRadar;
  if (!canvas || canvas.dataset.radarReady) return;
  canvas.dataset.radarReady = "true";
  canvas.addEventListener("mousemove", handleSkillRadarMove);
  canvas.addEventListener("mouseleave", clearRadarHover);
  canvas.addEventListener("focus", () => setRadarHover(Object.keys(skillDefs)[0] || ""));
  canvas.addEventListener("blur", clearRadarHover);
}

function handleSkillRadarMove(event) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const hit = radarHitAreas
    .map((area) => ({ ...area, distance: Math.hypot(area.x - x, area.y - y) }))
    .filter((area) => area.distance <= area.radius)
    .sort((a, b) => a.distance - b.distance)[0];
  if (!hit) {
    clearRadarHover();
    return;
  }
  setRadarHover(hit.key, event);
}

function setRadarHover(skillKey, event) {
  if (!skillDefs[skillKey]) return;
  const changed = radarHoverKey !== skillKey;
  radarHoverKey = skillKey;
  if (changed) drawRadar(skillKey);
  updateRadarLegendHighlight(skillKey);
  showSkillRadarTooltip(skillKey, event);
}

function clearRadarHover() {
  if (!radarHoverKey) {
    hideSkillRadarTooltip();
    return;
  }
  radarHoverKey = "";
  drawRadar();
  updateRadarLegendHighlight("");
  hideSkillRadarTooltip();
}

function updateRadarLegendHighlight(skillKey) {
  document.querySelectorAll("[data-skill-radar-key]").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.skillRadarKey === skillKey);
  });
  document.querySelectorAll("[data-skill-key]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.skillKey === skillKey);
  });
}

function showSkillRadarTooltip(skillKey, event) {
  const tooltip = els.skillRadarTooltip;
  const canvas = els.skillRadar;
  if (!tooltip || !canvas) return;
  const def = skillDefs[skillKey];
  const stats = getSkillPracticeStats(skillKey);
  tooltip.innerHTML = `
    <strong>${escapeHtml(def.name)} · ${stats.score}/100</strong>
    <span>${escapeHtml(t("practiceCount"))}: ${stats.practiceCount}</span>
    <span>${escapeHtml(t("practicedProblems"))}: ${stats.problemCount}</span>
    <span>${escapeHtml(t("averageScore"))}: ${stats.averageScore == null ? escapeHtml(t("noPracticeYet")) : `${Math.round(stats.averageScore)}/100`}</span>
    <span>${escapeHtml(t("skillXp"))}: ${stats.xp}</span>
    <em>${escapeHtml(stats.latestText ? `${t("latestPractice")}: ${stats.latestText}` : t("noPracticeYet"))}</em>
  `;
  tooltip.classList.remove("hidden");
  const wrapperRect = canvas.parentElement.getBoundingClientRect();
  const left = event ? event.clientX - wrapperRect.left + 14 : wrapperRect.width * 0.56;
  const top = event ? event.clientY - wrapperRect.top : wrapperRect.height * 0.45;
  tooltip.style.left = `${Math.min(Math.max(16, left), wrapperRect.width - 260)}px`;
  tooltip.style.top = `${Math.min(Math.max(18, top), wrapperRect.height - 126)}px`;
}

function hideSkillRadarTooltip() {
  if (els.skillRadarTooltip) els.skillRadarTooltip.classList.add("hidden");
}

function drawRadar(highlightKey = radarHoverKey, options = {}) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const keys = Object.keys(skillDefs);
  const targets = keys.map((key) => getSkillScore(state.skills?.[key] || 0) / 100);
  const shouldAnimate = options.animate !== false && (!radarTargetValues || !sameRadarValues(targets, radarTargetValues));
  radarTargetValues = targets;
  if (!radarAnimatedValues) radarAnimatedValues = targets.map(() => 0);
  if (shouldAnimate) {
    const from = [...radarAnimatedValues];
    const start = performance.now();
    const duration = 720;
    if (radarAnimationFrame) cancelAnimationFrame(radarAnimationFrame);
    const animate = (time) => {
      const progress = easeOutCubic(Math.min(1, (time - start) / duration));
      radarAnimatedValues = targets.map((target, index) => from[index] + (target - from[index]) * progress);
      renderRadarCanvas(highlightKey, radarAnimatedValues);
      if (progress < 1) {
        radarAnimationFrame = requestAnimationFrame(animate);
      } else {
        radarAnimationFrame = 0;
        radarAnimatedValues = [...targets];
        renderRadarCanvas(highlightKey, radarAnimatedValues);
      }
    };
    radarAnimationFrame = requestAnimationFrame(animate);
    return;
  }
  renderRadarCanvas(highlightKey, radarAnimatedValues || targets);
}

function sameRadarValues(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.001);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function renderRadarCanvas(highlightKey, values) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  radarHitAreas = [];

  const keys = Object.keys(skillDefs);
  const center = { x: width / 2, y: height / 2 + 2 };
  const radius = Math.min(width, height) * 0.35;
  const time = performance.now() / 1000;

  const panelGradient = ctx.createRadialGradient(center.x, center.y, 12, center.x, center.y, radius * 1.72);
  panelGradient.addColorStop(0, "rgba(255,255,255,0.96)");
  panelGradient.addColorStop(0.48, "rgba(247,244,255,0.88)");
  panelGradient.addColorStop(1, "rgba(255,252,247,0.98)");
  ctx.fillStyle = panelGradient;
  roundRect(ctx, 10, 10, width - 20, height - 20, 26);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(99, 91, 255, 0.18)";
  ctx.shadowBlur = 28;
  ctx.strokeStyle = "rgba(222, 216, 255, 0.74)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 1.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  for (let ring = 1; ring <= 4; ring += 1) {
    const points = keys.map((_, index) => radarPoint(index, keys.length, radius * (ring / 4), center));
    ctx.strokeStyle = ring === 4 ? "rgba(167, 139, 250, 0.58)" : "rgba(185, 174, 228, 0.26)";
    ctx.lineWidth = ring === 4 ? 2 : 1;
    drawPolygon(ctx, points, false);
  }

  keys.forEach((key, index) => {
    const outer = radarPoint(index, keys.length, radius, center);
    const orbit = radarPoint(index, keys.length, radius * 1.18, center);
    const pulse = 1 + Math.sin(time * 2.8 + index) * 0.08;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = key === highlightKey ? "rgba(99, 91, 255, 0.92)" : "rgba(154, 156, 175, 0.28)";
    ctx.lineWidth = key === highlightKey ? 2 : 1;
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.36)" : "rgba(99, 91, 255, 0.14)";
    ctx.shadowBlur = key === highlightKey ? 18 : 10;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(222, 216, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 13 : 10) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skillDefs[key].color;
    ctx.beginPath();
    ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 4.5 : 3.4) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const score = getSkillScore(state.skills?.[key] || 0);
    const label = radarPoint(index, keys.length, radius + 65, center);
    ctx.fillStyle = key === highlightKey ? "#17171f" : skillDefs[key].color;
    ctx.font = `${key === highlightKey ? "900" : "800"} 16px Inter, system-ui, sans-serif`;
    ctx.textAlign = label.x < center.x - 5 ? "right" : label.x > center.x + 5 ? "left" : "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(skillDefs[key].short, label.x, label.y);
    ctx.fillStyle = key === highlightKey ? "#635bff" : "#64677a";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`${score}/100`, label.x, label.y + 5);
    radarHitAreas.push({ key, x: label.x, y: label.y, radius: 54 });
    radarHitAreas.push({ key, x: orbit.x, y: orbit.y, radius: 24 });
  });

  const referenceValues = keys.map((_, index) => 0.78 - (index % 3) * 0.08);
  const referencePoints = referenceValues.map((value, index) => radarPoint(index, keys.length, radius * value, center));
  ctx.fillStyle = "rgba(99, 91, 255, 0.035)";
  ctx.strokeStyle = "rgba(99, 91, 255, 0.18)";
  ctx.lineWidth = 1.5;
  drawPolygon(ctx, referencePoints, true);

  const points = values.map((value, index) => radarPoint(index, keys.length, radius * Math.max(value, 0.08), center));
  ctx.save();
  ctx.shadowColor = "rgba(99, 91, 255, 0.36)";
  ctx.shadowBlur = 22;
  const fillGradient = ctx.createLinearGradient(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
  fillGradient.addColorStop(0, "rgba(94, 204, 255, 0.34)");
  fillGradient.addColorStop(0.46, "rgba(99, 91, 255, 0.31)");
  fillGradient.addColorStop(1, "rgba(207, 101, 255, 0.38)");
  ctx.fillStyle = fillGradient;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
  ctx.lineWidth = 4;
  drawPolygon(ctx, points, true);
  ctx.restore();

  ctx.strokeStyle = "rgba(99, 91, 255, 0.82)";
  ctx.lineWidth = 2;
  drawPolygon(ctx, points, false);

  points.forEach((point, index) => {
    const key = keys[index];
    const pulse = 1 + Math.sin(time * 4 + index * 0.8) * 0.08;
    radarHitAreas.push({ key, x: point.x, y: point.y, radius: 28 });
    ctx.save();
    ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.48)" : "rgba(113, 142, 255, 0.22)";
    ctx.shadowBlur = key === highlightKey ? 20 : 12;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(point.x, point.y, (key === highlightKey ? 10 : 7) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = key === highlightKey ? 4 : 3;
    ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(255,255,255,0.94)";
    ctx.stroke();
    ctx.fillStyle = key === highlightKey ? "#635bff" : skillDefs[key].color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, (key === highlightKey ? 4.2 : 3.2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function radarPoint(index, count, radius, center) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPolygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
}

function getTotalXp() {
  return Object.keys(skillDefs).reduce((sum, key) => sum + (state.skills[key] || 0), 0);
}

function getSkillScore(xp) {
  return Math.min(100, Math.floor((xp || 0) / SCORE_XP_PER_POINT));
}

function getQuantScore() {
  return calculateQuantScore(state.skills);
}

function calculateQuantScore(skills) {
  const scores = Object.keys(skillDefs).map((key) => getSkillScore(skills?.[key] || 0));
  if (!scores.length) return 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 10) / 10;
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function getLevelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 55)) + 1;
  const previous = Math.pow(level - 1, 2) * 55;
  const nextTotal = Math.pow(level, 2) * 55;
  const current = Math.max(0, xp - previous);
  const next = Math.max(1, nextTotal - previous);
  return {
    level,
    current,
    next,
    percent: Math.min(100, Math.round((current / next) * 100))
  };
}

function getRank(score) {
  if (score >= 100) return "World-Class Quant PM";
  if (score >= 90) return "Head of Quant";
  if (score >= 75) return "Senior Quant Trader";
  if (score >= 60) return "Quant Researcher";
  if (score >= 40) return "Junior Quant";
  if (score >= 20) return "Quant Intern";
  if (score >= 10) return "Analyst II";
  return "Analyst I";
}

function getWeeklyXp() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.entries
    .filter((entry) => new Date(entry.date).getTime() >= cutoff)
    .reduce((sum, entry) => sum + entry.totalXp, 0);
}

function getStreak() {
  const days = new Set([
    ...state.entries.map((entry) => dayKey(entry.date)),
    ...(state.checkIns || []).map((item) => dayKey(item.date))
  ]);
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function formatNewsDate(date) {
  const dateOnly = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}/${dateOnly[2]}/${dateOnly[3]}`;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date || "");
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

function formatTimeOnly(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function emptyBlock(text) {
  const item = document.createElement("div");
  item.className = "history-item";
  const p = document.createElement("p");
  p.textContent = text;
  item.appendChild(p);
  return item;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
