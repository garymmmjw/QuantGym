import { createJobsControllerBundle } from '../modules/jobs/controllerBundle.js';
import { createNewsControllerBundle } from '../modules/news/controllerBundle.js';
import { createResumeControllerBundle } from '../modules/resume/controllerBundle.js';

export function createContentControllerBundles(deps = {}) {
  const {
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
  } = deps;

  const resumeControllerBundle = createResumeControllerBundle({
    elements: els,
    getState: () => userState.value,
    getEndpoint: () => els.llmEndpointInput?.value.trim(),
    getFallbackEndpoint: () => getLlmConfig().endpoint,
    getModel: () => els.llmModelInput?.value,
    getFallbackModel: () => getLlmConfig().model,
    normalizeModel: normalizeLlmModel,
    setLlmConfig(config) {
      llmConfigRuntime.set(config);
    },
    saveLlmConfig: saveLlmConfigToStorage,
    getHeaders: getLlmRequestHeaders,
    getLanguage,
    getGraduationTerm: () => appState.currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM,
    requestReview: requestResumeReviewValue,
    getFileTooLargeLabel: () => getLanguage() === "en"
      ? "Resume file is too large. Keep it under 5MB."
      : "简历文件太大，请控制在 5MB 以内。",
    getEmptyMetaLabel: () => t("resumeUploadHint"),
    saveState,
    renderResume: () => getModuleLifecycle("resume")?.render?.()
  });

  const jobsControllerBundle = createJobsControllerBundle({
    getState: () => userState.value,
    getCurrentUser: () => appState.currentUser,
    getEndpointBase: () => getLlmConfig().endpoint || DEFAULT_LLM_ENDPOINT,
    seedJobs,
    parseTags,
    stableId: stableProblemId,
    makeId,
    normalizeJobs,
    isValidUrl: (url) => safeExternalUrl(url) !== "#",
    saveState,
    autoRefreshMs: JOBS_AUTO_REFRESH_MS,
    retryMs: JOBS_RETRY_MS,
    renderJobs: () => getModuleLifecycle("jobs")?.render?.(),
    refreshIcons,
    setStatusText: (text) => {
      if (els.jobsSummary) els.jobsSummary.textContent = text;
    },
    getSyncingLabel: () => t("jobsSyncing"),
    getUnavailableLabel: () => getLanguage() === "en"
      ? "Live job API is unavailable. Showing saved links."
      : "岗位 API 暂不可用，先显示已保存链接。"
  });

  const newsControllerBundle = createNewsControllerBundle({
    elements: els,
    documentRef: document,
    windowRef: window,
    getState: () => userState.value,
    getEndpointBase: () => getLlmConfig().endpoint || DEFAULT_LLM_ENDPOINT,
    getFilters: () => newsFilterState.getState(),
    topicPacks: NEWS_TOPIC_QUERY_PACKS,
    normalizeTopic: normalizeNewsTopicFilter,
    parseTags,
    normalizeNewsSkills,
    stableId: stableNewsId,
    makeId,
    inferSource,
    skillDefs,
    switchModule,
    t,
    saveState,
    renderAll,
    getCurrentUser: () => appState.currentUser,
    autoRefreshMs: NEWS_AUTO_REFRESH_MS,
    retryMs: NEWS_RETRY_MS,
    renderNews: () => getModuleLifecycle("news")?.render?.(),
    refreshIcons,
    setStatusText: (text) => {
      if (els.newsUpdatedAt) els.newsUpdatedAt.textContent = text;
    },
    getSyncingLabel: () => "新闻 API 同步中..."
  });

  return {
    handleAccountResumeFile: resumeControllerBundle.handleAccountFile,
    renderAccountResumeMeta: resumeControllerBundle.renderAccountMeta,
    requestResumeReviewFromApi: resumeControllerBundle.requestReview,
    localResumeReview: resumeControllerBundle.localReview,
    jobsRuntime: jobsControllerBundle.runtime,
    newsProvider: newsControllerBundle.provider,
    newsRuntime: newsControllerBundle.runtime
  };
}
