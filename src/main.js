import {
  STORAGE_KEY, AUTH_KEY, USER_STATE_PREFIX, LLM_CONFIG_KEY, PENDING_CAPTURE_KEY,
  APP_PREFS_KEY, COMMUNITY_KEY, CLOUD_CONFIG_KEY, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE,
  RUNTIME_CONFIG, DEFAULT_LLM_ENDPOINT, DEFAULT_LLM_MODEL, DEFAULT_GOOGLE_CLIENT_ID,
  GOOGLE_LOGIN_FLAG, GOOGLE_LOGIN_ENABLED, LLM_DEFAULTS_VERSION, LLM_MODEL_OPTIONS,
  DEFAULT_CLOUD_API_ENDPOINT, CLOUD_SYNC_DEBOUNCE_MS, SCORE_XP_PER_POINT,
  NEWS_AUTO_REFRESH_MS, NEWS_RETRY_MS, NEWS_TOPIC_QUERY_PACKS, NEWS_SOURCE_FILTERS,
  JOBS_AUTO_REFRESH_MS, JOBS_RETRY_MS,
  DEFAULT_GRADUATION_TERM, leetcodeHot100
} from './constants.js';
import { skillDefs } from './skills.js';
import {
  prepRoleDefs, prepSeasonDefs, prepDiagnosticQuestions
} from './prep-data.js';
import { i18n } from './i18n.js';
import {
  DEFAULT_ROUTE_MODULE,
  getAvailableRouteModules,
  initHashRouter
} from './router.js';
import {
  applyCloudSessionConfig as applyCloudSessionConfigValue
} from './api/cloud.js';
import { createCloudRuntime } from './api/cloudRuntime.js';
import { createCloudSyncFacade } from './api/cloudSyncFacade.js';
import { dayKey, formatDate, formatNewsDate, formatTimeOnly, localDateKey } from './lib/date.js';
import {
  makeId,
  stableCourseId,
  stableNewsId,
  stableProblemId
} from './lib/id.js';
import { clampNumber, formatNumber, formatScore } from './lib/number.js';
import { randomChoice, randomInt } from './lib/random.js';
import {
  escapeHtml,
  hashStringToHue,
  normalizeEmail,
  normalizeSearchQuery,
  parseTags
} from './lib/text.js';
import {
  escapeAttribute,
  inferSourceFromUrl as inferSource,
  openExternalUrl as openExternalUrlValue,
  safeExternalUrl
} from './lib/url.js';
import { getModuleLifecycle, renderModules, runModuleLifecycle } from './modules/registry.js';
import { createBackupController } from './state/backupController.js';
import {
  buildCloudSessionCommunity as buildCloudSessionCommunityValue,
  buildCloudSessionState as buildCloudSessionStateValue,
  latestIso as latestIsoValue
} from './state/data.js';
import {
  hashPassword as hashPasswordValue,
  getGoogleClientId as getGoogleClientIdValue,
  applyGoogleAccount as applyGoogleAccountValue,
  buildGoogleAccountFromPayload as buildGoogleAccountFromPayloadValue,
  buildLocalAccount as buildLocalAccountValue,
  addLocalAccount as addLocalAccountValue,
  parseJwt as parseJwtValue,
  setCurrentUserId as setCurrentUserIdValue,
  setGoogleClientId as setGoogleClientIdValue,
  userStateKey as userStateKeyValue
} from './state/auth.js';
import { createAuthMessageAdapter } from './state/authMessageAdapter.js';
import {
  clearUserState as clearUserStateValue,
  loadUserState as loadUserStateValue,
  migrateLegacyState as migrateLegacyStateValue,
  writeUserState as writeUserStateValue
} from './state/persistence.js';
import { createAppRuntime } from './state/appRuntime.js';
import { createAuthStateRuntime } from './state/authRuntime.js';
import { createStateDataRuntime } from './state/dataRuntime.js';
import { createLlmConfigRuntime } from './state/llmConfigRuntime.js';
import { createPreferencesRuntime } from './state/preferencesRuntime.js';
import { createUserStateRuntime } from './state/userStateRuntime.js';
import { createAppShellController } from './ui/appShellController.js';
import { onDomReady, runAppBootstrap } from './ui/bootstrap.js';
import { createEmptyBlock as createEmptyBlockView } from './ui/emptyBlock.js';
import {
  bindElements as bindAppElements,
  bindShellEvents,
  loadPagePartials as loadPagePartialsView
} from './app/shellDom.js';
import { createAccountAuthBundle } from './app/accountAuthBundle.js';
import { createAppCommunityControllerBundle } from './app/communityControllerBundle.js';
import { createContentControllerBundles } from './app/contentControllerBundles.js';
import { createLibrarySearchBundles } from './app/librarySearchBundles.js';
import { createOverviewActivityBundle } from './app/overviewActivityBundle.js';
import { createAppOverviewControllerBundle } from './app/overviewControllerBundle.js';
import { createPokerControllerBundle } from './app/pokerControllerBundle.js';
import { createPlanningActivityBundle } from './app/planningActivityBundle.js';
import { createAppProblemControllerBundles } from './app/problemControllerBundles.js';
import { createProblemNavigationBundle } from './app/problemNavigationBundle.js';
import { createAppSkillsControllerBundle } from './app/skillsControllerBundle.js';
import { createSyncSettingsBundle } from './app/syncSettingsBundle.js';
import { createHeroCoachController } from './ui/heroCoach.js';
import { refreshIcons as refreshIconsView } from './ui/icons.js';
import { setupButtonRipples as setupButtonRipplesView } from './ui/ripples.js';
import { createMathTypesetScheduler } from './ui/mathTypeset.js';
import {
  setButtonBusy as setButtonBusyView,
  setButtonLabel as setButtonLabelView,
  setText as setTextView
} from './ui/domText.js';
import { createAccountDataAdapter } from './modules/account/dataAdapter.js';
import {
  createCommunityFilterState
} from './modules/community/data.js';
import { createCommunityRuntime } from './modules/community/runtime.js';
import {
  createCompanyTierFilterState
} from './modules/companies/data.js';
import { createCompaniesDataAdapter } from './modules/companies/dataAdapter.js';
import { createCoursesDataAdapter } from './modules/courses/dataAdapter.js';
import {
  formatExperienceDate,
  formatExperienceOutcome,
  formatSharedExperienceText
} from './modules/experiences/data.js';
import {
  behavioralInterviewProblems,
  interviewDifficultyDefs,
  interviewFocusDefs,
  interviewModeDefs,
  interviewPersonaDefs,
  interviewTypeDefs,
  researchDeepDiveProblems,
  resumeDeepDiveProblems
} from './modules/interview/defs.js';
import {
  createInterviewOnboardingController
} from './modules/interview/onboardingController.js';
import { createInterviewAnswerController } from './modules/interview/answerController.js';
import { createInterviewApiController } from './modules/interview/apiController.js';
import { createInterviewFacade } from './modules/interview/facade.js';
import { createInterviewFeedbackController } from './modules/interview/feedbackController.js';
import { createInterviewMessageController } from './modules/interview/messageController.js';
import { isSafeRichMediaUrl as isSafeRichMediaUrlValue } from './modules/interview/richText.js';
import { createInterviewSetupController } from './modules/interview/setupController.js';
import {
  createInterviewQuestionBuilderController
} from './modules/interview/questionBuilderController.js';
import { createInterviewResultsController } from './modules/interview/resultsController.js';
import { createInterviewRuntime } from './modules/interview/runtime.js';
import { createInterviewViewController } from './modules/interview/viewController.js';
import { createInterviewInteractionController } from './modules/interview/interactionController.js';
import { createInterviewSessionLifecycleController } from './modules/interview/sessionLifecycleController.js';
import { createInterviewSessionFlowController } from './modules/interview/sessionFlowController.js';
import { createJobsFacade } from './modules/jobs/facade.js';
import {
  createLibraryFilterState
} from './modules/library/data.js';
import {
  createMessageSelectionState
} from './modules/messages/index.js';
import {
  getNetworkStatusLabel as getNetworkStatusLabelValue,
  normalizeNetworkContact
} from './modules/network/data.js';
import { createNewsFacade } from './modules/news/facade.js';
import {
  createNewsFilterState,
  inferNewsSourceType,
  isSocialNewsType as isSocialNewsTypeValue,
  newsMatchesSourceFilter as newsMatchesSourceFilterValue,
  newsMatchesTopic as newsMatchesTopicValue,
  normalizeNewsSourceType as normalizeNewsSourceTypeValue,
  normalizeNewsSourceFilter as normalizeNewsSourceFilterValue,
  normalizeNewsTopicFilter as normalizeNewsTopicFilterValue,
  sortNews
} from './modules/news/data.js';
import { createNewsDataAdapter } from './modules/news/dataAdapter.js';
import { createOverviewFacade } from './modules/overview/facade.js';
import {
  normalizeCloudLeaderboardRows as normalizeCloudLeaderboardRowsValue
} from './modules/overview/leaderboard.js';
import { registerAppFeatureModules } from './app/featureModules.js';
import { createPokerRuntime } from './modules/poker/runtime.js';
import {
  difficultyClass,
  getLocalizedProblemField,
  isDisabledProblemId,
  isLegacyCatalogMarker
} from './modules/problems/format.js';
import { createProblemsFacade } from './modules/problems/facade.js';
import { createProblemProvider } from './modules/problems/provider.js';
import { createProblemProviderFacade } from './modules/problems/providerFacade.js';
import { createProblemCaptureController } from './modules/problems/captureController.js';
import { addProblemTag } from './modules/problems/list.js';
import { createProblemCatalogMutationController } from './modules/problems/catalogMutationController.js';
import { createProblemPaginationController } from './modules/problems/paginationController.js';
import { createProblemDetailState } from './modules/problems/viewState.js';
import {
  createProblemSearchRecord,
  scoreProblemSearchRecord
} from './modules/problems/search.js';
import {
  getProblemSocial as getProblemSocialValue,
  requestProblemSocial as requestProblemSocialValue
} from './modules/problems/social.js';
import { createProblemSocialState } from './modules/problems/socialState.js';
import { createProblemPersonalStateController } from './modules/problems/personalStateController.js';
import {
  requestResumeReview as requestResumeReviewValue
} from './modules/resume/data.js';
import { createSkillsMetricsProvider } from './modules/skills/metricsProvider.js';
import {
  sampleEntries, problemTagLabels, exerciseTitleOverrides, seedProblems,
  catalogProblems, disabledProblemSources, disabledProblemBookNames,
  seedNews, seedJobs, quantCompanyDefs, seedCourses
} from './catalog-data.js';

const libraryCatalog = Array.isArray(globalThis.quantLibraryCatalog) ? globalThis.quantLibraryCatalog : [];
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
const {
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

let newsProvider = null;
const newsDataAdapter = createNewsDataAdapter({
  parseTags,
  skillDefs,
  stableId: stableNewsId,
  makeId,
  inferSource,
  latestIso: latestIsoValue
});
const newsFacade = createNewsFacade({
  getProvider: () => newsProvider,
  getRuntime: () => newsRuntime
});
const {
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
let cloudSyncController = null;
const cloudSyncFacade = createCloudSyncFacade({
  getController: () => cloudSyncController
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
  catalogProblems,
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
  navigator,
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
    userState.value = state;
  },
  clearStateForUser,
  loadState,
  clearProblemLookupCaches: () => clearProblemLookupCaches(),
  saveState,
  renderAll: () => renderAll(),
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
const setLanguage = preferencesRuntime.setLanguage;
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
  getBrowserController: () => problemBrowserController,
  getLeetcodeHotController: () => leetcodeHotController,
  getCaptureController: () => problemCaptureController,
  getRuntime: () => problemsRuntime
});
const {
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
  getRuntime: () => jobsRuntime
});
const {
  maybeAutoRefresh: maybeAutoRefreshJobs,
  refresh: refreshJobsFromApi
} = jobsFacade;
const overviewFacade = createOverviewFacade({
  getHeroCoachController: () => heroCoachController,
  getSummaryController: () => overviewSummaryController,
  getLeaderboardController: () => leaderboardCloudController
});
const {
  startHeroTypewriter,
  renderSummary,
  invalidateLeaderboard: invalidateLeaderboardCloud,
  refreshLeaderboard: refreshLeaderboardFromCloud
} = overviewFacade;
let interviewSessionFlowController = null;
let interviewAnswerController = null;
const interviewFacade = createInterviewFacade({
  getSessionFlowController: () => interviewSessionFlowController,
  getAnswerController: () => interviewAnswerController
});
const {
  handleTranscriptAction: handleInterviewTranscriptAction,
  reset: resetInterview,
  finalizeOnboarding: finalizeInterviewOnboarding,
  showQuestion: showInterviewQuestion,
  submitAnswer: submitInterviewAnswer,
  requestHint: requestInterviewHint,
  restartWithSameConfig: restartInterviewWithSameConfig
} = interviewFacade;
const publishInterviewExperience = (id) => experienceShareController?.publish(id);
const appShellController = createAppShellController({
  documentRef: document,
  windowRef: window,
  elements: els,
  defaultRouteModule: DEFAULT_ROUTE_MODULE,
  getAppState: () => appState,
  getUserState: () => userState.value,
  getLanguage,
  t,
  textMatchesI18nKeys,
  getAuthReadyMessage,
  renderGooglePlaceholder: () => renderGooglePlaceholder(),
  normalizeLeaderboardSettings,
  getLeaderboardRows: () => getLeaderboardRows(),
  renderLeaderboardScopeSummary: (...args) => renderLeaderboardScopeSummary(...args),
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
  updatePreview: () => updatePreview(),
  refreshIcons
});
const applySidebarState = appShellController.applySidebarState;
const applyLanguage = appShellController.applyLanguage;
const updateGlobalSearchPlaceholder = appShellController.updateGlobalSearchPlaceholder;
const handleRouteChange = appShellController.handleRouteChange;
const restoreRouteModule = appShellController.restoreRouteModule;
const switchModule = appShellController.switchModule;
const renderAll = appShellController.renderAll;
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
const importProblemJson = problemCatalogMutationController.importJson;
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
  buildTodayStudyPlan: () => buildTodayStudyPlan(),
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
  renderTodayPlan: () => renderTodayPlan(),
  resetInterview,
  saveState,
  setText,
  skillDefs,
  t,
  userStateKey,
  windowRef: window,
  writeUserState: writeUserStateValue
});
const {
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
const {
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
  userState
});
experienceShareController = communityControllerBundle.experienceShareController;
const getUserMessageThreads = communityControllerBundle.getUserMessageThreads;
const getUnreadMessageCount = communityControllerBundle.getUnreadMessageCount;
const normalizeCommunityPost = communityControllerBundle.normalizeCommunityPost;
const normalizeCommunityComment = communityControllerBundle.normalizeCommunityComment;
const normalizeMessageParticipant = communityControllerBundle.normalizeMessageParticipant;
const normalizeMessageThread = communityControllerBundle.normalizeMessageThread;
const updateUnreadMessageBadge = communityControllerBundle.updateUnreadMessageBadge;
const startDirectMessageWithUser = communityControllerBundle.startDirectMessageWithUser;
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
  getLlmConfig: () => getLlmConfig(),
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
  updateLlmConfigFromControls: () => updateLlmConfigFromControls(),
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
  getLlmConfig: () => getLlmConfig(),
  updateLlmConfigFromControls: (...args) => updateLlmConfigFromControls(...args),
  getRequestHeaders: () => getLlmRequestHeaders(),
  normalizeModel: (model) => normalizeLlmModel(model),
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
const registerLocal = accountAuthBundle.registerLocal;
const loginLocal = accountAuthBundle.loginLocal;
const logout = accountAuthBundle.logout;
const saveGoogleClientId = accountAuthBundle.saveGoogleClientId;
const saveAccount = accountAuthBundle.saveAccount;
const renderGoogleClientInput = accountAuthBundle.renderGoogleClientInput;
const renderGooglePlaceholder = accountAuthBundle.renderGooglePlaceholder;
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
const {
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
  renderLeaderboardLoading: () => renderLeaderboardScopeSummary(
    normalizeLeaderboardSettings(userState.value.leaderboard),
    getLeaderboardRows(),
    "loading"
  ),
  renderLeaderboardSettled: () => {
    renderLeaderboard();
    renderRegionRank();
    refreshIcons();
  },
  saveAppPrefs,
  saveAuth,
  saveCloudConfig,
  saveLlmConfigToStorage,
  saveState,
  switchModule,
  syncLanguageToUrl,
  t,
  userState
});
leaderboardCloudController = syncSettingsBundle.leaderboardCloudController;
cloudSyncController = syncSettingsBundle.cloudSyncController;
const saveLlmConfig = syncSettingsBundle.saveLlmConfig;
const updateLlmConfigFromControls = syncSettingsBundle.updateLlmConfigFromControls;
const syncCloudNow = syncSettingsBundle.syncCloudNow;
const renderCloudStatus = syncSettingsBundle.renderCloudStatus;
const getCloudStatusText = syncSettingsBundle.getCloudStatusText;
const saveSettings = syncSettingsBundle.saveSettings;
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
const {
  addEntry,
  fillSampleEntry,
  updatePreview,
  scheduleClassificationPreview,
  undoLatestEntry,
  recordGameResult,
  skillRadarRuntime
} = skillsControllerBundle;
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
newsProvider = contentControllerBundles.newsProvider;
newsRuntime = contentControllerBundles.newsRuntime;
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
leetcodeHotController = appProblemControllerBundles.leetcodeHotController;
problemsRuntime = appProblemControllerBundles.problemsRuntime;
const handleProblemSearchInput = appProblemControllerBundles.handleProblemSearchInput;
const handleProblemSearchKeydown = appProblemControllerBundles.handleProblemSearchKeydown;
const scheduleProblemSearchRender = appProblemControllerBundles.scheduleProblemSearchRender;
const cancelProblemSearchRender = appProblemControllerBundles.cancelProblemSearchRender;
const {
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

onDomReady(document, () => runAppBootstrap({
  windowRef: window,
  loadPagePartials,
  bindElements,
  registerFeatureModules,
  bindEvents,
  setupButtonRipples,
  initRouter: () => initHashRouter({
    getAvailableModules: () => getAvailableRouteModules(document),
    onRouteChange: handleRouteChange
  }),
  renderSession,
  initGoogleLogin,
  renderTools: () => getModuleLifecycle("tools")?.render?.(),
  shouldRenderTools: Boolean(appState.currentUser),
  refreshNews: maybeAutoRefreshNews,
  refreshJobs: maybeAutoRefreshJobs,
  newsRefreshMs: NEWS_AUTO_REFRESH_MS,
  jobsRefreshMs: JOBS_AUTO_REFRESH_MS,
  updateGlobalSearchPlaceholder,
  refreshIcons,
  initHeroInteractions: () => heroCoachController.initSharkInteractions()
}));

async function loadPagePartials() {
  return loadPagePartialsView(document);
}

function bindElements() {
  bindAppElements(els, document);
}

function registerFeatureModules() {
  registerAppFeatureModules({
    addNewsFromForm,
    addProblemFromForm,
    addProblemTag,
    appState,
    applyProblemFilterAction,
    autoSizeInterviewAnswer,
    buildProblemProgressItems,
    buildRecentContributionHeatmap,
    closeLibraryReader,
    communityFilterState,
    companyTierFilterState,
    companyTierWeight,
    createPrepPlan,
    dayKey,
    DEFAULT_CLOUD_API_ENDPOINT,
    DEFAULT_GRADUATION_TERM,
    documentRef: document,
    editPrepPlan,
    elements: els,
    emptyBlock,
    escapeAttribute,
    escapeHtml,
    exitInterview,
    experienceShareController,
    exportInterviewReport,
    exportState,
    focusNewsItem,
    formatCategoryLabel,
    formatDate,
    formatExperienceDate,
    formatExperienceOutcome,
    formatNewsDate,
    formatNumber,
    formatScore,
    formatTimeOnly,
    getAllSkillPracticeStats,
    getCatalogProblems,
    getCompanyJobs,
    getCompanyProblemStats,
    getCountryLabel,
    getDailyXpSeries,
    getInitials,
    getLanguage,
    getLibraryEntries,
    getLibrarySubtitle,
    getLibraryTitle,
    getLlmConfig,
    getLocalizedProblemField,
    getModuleLifecycle,
    getNetworkStatusLabel,
    getNewsSourceTypeLabel,
    getNewsVerificationLabel,
    getQuantScore,
    getRank,
    getRegionLabel,
    getSkillPracticeStats,
    getSkillScore,
    getUserMessageThreads,
    getVisibleLibraryEntries,
    goToNextInterviewQuestion,
    handleAccountResumeFile,
    handleInterviewAnswerKeydown,
    handleInterviewTranscriptAction,
    handlePokerDocumentClick,
    handlePokerDocumentSubmit,
    handlePokerPreflopMatrixClick,
    handlePrepPlanAction,
    handleProblemCollectionClick,
    handleProblemPaginationChange,
    handleProblemPaginationClick,
    handleProblemPaginationKeydown,
    handleProblemPaginationSubmit,
    handleProblemSearchInput,
    handleProblemSearchKeydown,
    importProblemJson,
    importState,
    inferNewsSourceType,
    inferSource,
    interviewRuntime,
    interviewState,
    isCatalogProblem,
    isSocialNewsType,
    libraryFilterState,
    loadInitialPokerGame,
    loadCommunity,
    localDateKey,
    localResumeReview,
    makeId,
    makePokerGameRound,
    markNewsRead,
    messageSelectionState,
    newsFilterState,
    newsMatchesSourceFilter,
    newsMatchesTopic,
    normalizeCategory,
    normalizeCommunityComment,
    normalizeCommunityPost,
    normalizeContentSources,
    normalizeCourses,
    normalizeCourseStates,
    normalizeInterviewExperience,
    normalizeJobs,
    normalizeMessageParticipant,
    normalizeMessageThread,
    normalizeNetworkContact,
    normalizeNewsSkills,
    normalizeNewsSourceFilter,
    normalizeNewsSourceType,
    normalizeNewsTopicFilter,
    normalizeResources,
    normalizeResumeState,
    openExternalUrl,
    openLibraryPractice,
    openLibraryReader,
    parseTags,
    pokerState,
    problemsRuntime,
    publishInterviewExperience,
    quantCompanyDefs,
    randomChoice,
    randomInt,
    recordGameResult,
    refreshIcons,
    refreshJobsFromApi,
    refreshLeaderboardFromCloud,
    refreshNewsFromApi,
    renderAccountResumeMeta,
    renderAll,
    renderCloudStatus,
    renderCountryOptions,
    renderInterviewCategoryPicker,
    renderInterviewFavorites,
    renderInterviewQuestionPanel,
    renderInterviewSetup,
    renderInterviewTranscript,
    renderLeaderboard,
    renderPokerGame,
    renderPokerPreflopChart,
    renderPrepPlan,
    renderProblems,
    renderProgressGroup,
    renderRegionOptions,
    renderSummary,
    renderTodayPlan,
    requestInterviewHint,
    requestResumeReviewFromApi,
    resetInterview,
    resetState,
    restartInterviewWithSameConfig,
    resumeDurableInterview,
    revealInterviewAnswer,
    resetPokerTournament,
    safeExternalUrl,
    saveAccount,
    saveCommunity,
    saveCurrentInterviewFavorite,
    saveLlmConfig,
    saveSettings,
    saveState,
    setButtonBusyView,
    setLanguage,
    setText,
    shareCurrentInterviewQuestion,
    showCompanyProblems,
    skillDefs,
    skillRadarRuntime,
    sortNews,
    startDirectMessageWithUser,
    startInterview,
    submitInterviewAnswer,
    submitPrepDiagnostic,
    switchModule,
    syncCloudNow,
    t,
    toggleInterviewCategory,
    toggleInterviewPanel,
    toggleLeetcodeHotPanel,
    toggleVoiceAnswer,
    undoLatestEntry,
    updateInterviewAnswerFileMeta,
    updateInterviewAnswerMode,
    updateInterviewPdfMeta,
    updateInterviewSetupVisibility,
    updateLeaderboardSettings,
    updateUnreadMessageBadge,
    userState,
    windowRef: window
  });

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
const {
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
  refreshIcons,
  windowRef: window
});
const {
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
