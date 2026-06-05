import {
  registerCommunityModule,
  registerContentModules,
  registerDashboardModules,
  registerPokerModule,
  registerSupportModules,
  registerTrainingModules,
  registerUtilityModules
} from '../modules/pageRegistrar.js';

export function registerAppFeatureModules(deps = {}) {
  const {
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
  } = deps;

  const communityModule = registerCommunityModule({
    elements: els,
    getCurrentUser() {
      return appState.currentUser;
    },
    getCommunityFilter() {
      return communityFilterState.getFilter();
    },
    setCommunityFilter(value) {
      communityFilterState.setFilter(value);
    },
    loadCommunity,
    setCommunity(store) {
      appState.community = store;
    },
    saveCommunity,
    normalizeCommunityPost,
    normalizeCommunityComment,
    getLanguage,
    getInitials,
    formatCommunityPostDetail(post) {
      return `${getCountryLabel(post.country)} · ${getRegionLabel(post.region)} · ${formatDate(post.createdAt)}`;
    },
    startDirectMessage: startDirectMessageWithUser,
    clearExperiencePost(postId) {
      experienceShareController?.clearForPost(postId);
    },
    communityLabels: {
      deleteSharedExperience: "确认删除这条已分享的面经动态？私有面经记录将保留。",
      deletePost: "确认删除这条动态？",
      experienceShare: "面经分享",
      emptyExperience: "还没有面经分享。可以从自己的面经记录中选择一条分享。",
      experienceCount(count) {
        return `${count} 条面经分享`;
      }
    },
    t,
    emptyBlock,
    escapeHtml,
    refreshIcons
  });

  registerContentModules({
    elements: els,
    saveAccount,
    getCurrentUser() {
      return appState.currentUser;
    },
    defaultGraduationTerm: DEFAULT_GRADUATION_TERM,
    renderCountries: renderCountryOptions,
    renderRegions: renderRegionOptions,
    renderAccountResumeMeta,
    getInitials,
    formatAccountDate: formatNewsDate,
    formatAccountRank(user) {
      return `${getCountryLabel(user.country)} · ${getRegionLabel(user.region)} · ${getRank(getQuantScore())}`;
    },
    accountLabels: {
      imageOnly: "请选择图片文件。",
      imageTooLarge: "头像图片太大，先换一张 1.8MB 以下的图片。"
    },
    handleAccountResumeFile,
    companyDefs: quantCompanyDefs,
    getCompanyTierFilter() {
      return companyTierFilterState.getTier();
    },
    setCompanyTierFilter(value) {
      companyTierFilterState.setTier(value);
    },
    getLanguage,
    formatCompanySummary(entryCount, questionCount) {
      return getLanguage() === "en"
        ? `${entryCount} firms · ${questionCount} tagged questions · tier, topics, careers`
        : `${entryCount} 家公司 · ${questionCount} 道标注题 · tier、考点和官网入口`;
    },
    formatCompanyMeta(company) {
      return `Tier ${company.tier} · ${company.type}`;
    },
    getCompanyOpenRolesLabel() {
      return getLanguage() === "en" ? "open roles" : "岗位入口";
    },
    getCompanyLocationsLabel() {
      return getLanguage() === "en" ? "locations" : "常见地点";
    },
    getCatalogProblems,
    getCompanyProblemStats,
    getCompanyJobs,
    companyTierWeight,
    practiceCompanyProblems: showCompanyProblems,
    openExternalUrl,
    t,
    emptyBlock,
    escapeHtml,
    refreshIcons,
    getCourses() {
      return userState.value.courses;
    },
    getCourseStates() {
      return userState.value.courseStates;
    },
    setCourseStates(courseStates) {
      userState.value.courseStates = courseStates;
    },
    normalizeCourses,
    normalizeCourseStates,
    normalizeContentSources,
    saveState,
    addTag: addProblemTag,
    safeExternalUrl,
    formatCoursePrompt(course) {
      return `${course.provider} · ${course.summary}`;
    },
    formatCourseSourceTitle(course, source) {
      return `${course.title} · ${source.provider}`;
    },
    getCourseQueuedLabel() {
      return getLanguage() === "en" ? "Queued" : "待学习";
    },
    getCourseRemoveFromPathLabel() {
      return getLanguage() === "en" ? "Remove from path" : "移出路径";
    },
    setText,
    getExperienceRecords() {
      return userState.value.interviewExperiences;
    },
    setExperienceRecords(records) {
      userState.value.interviewExperiences = records;
    },
    normalizeExperience: normalizeInterviewExperience,
    parseTags,
    localDateKey,
    makeId,
    publishExperience: publishInterviewExperience,
    formatExperienceOutcome,
    formatExperienceDate,
    experienceLabels: {
      newTitle: "新建面经",
      editTitle: "编辑面经",
      emptyFiltered: "当前筛选下还没有面经。",
      emptyRecords: "还没有面经记录。完成一次轮次后，把过程与下一步训练记下来。",
      summaryLabel: "流程概览",
      topicsLabel: "考察主题",
      reflectionLabel: "复盘与下一步",
      updateShare: "更新社群分享",
      shareToCommunity: "分享至社群",
      shareConfirmMessage: "确认已移除受保密要求约束的原题、姓名和联系方式后，再发布到社群。",
      confirmShare: "确认分享",
      cancel: "取消",
      deleteSharedWarning: "删除私有面经不会删除已经发布到社群的分享。确认删除这条私有记录？",
      deleteWarning: "确认删除这条面经记录？"
    },
    openCommunityExperiences() {
      communityFilterState.setFilter("experience");
      communityModule.render();
    },
    getLibraryEntries,
    getVisibleLibraryEntries,
    getLibraryKindFilter() {
      return libraryFilterState.getKind();
    },
    setLibraryQuery(value) {
      libraryFilterState.setQuery(value);
    },
    setLibraryKindFilter(value) {
      libraryFilterState.setKind(value);
    },
    getLibraryTitle,
    getLibrarySubtitle,
    getLibraryKindLabel(entry) {
      const isEn = getLanguage() === "en";
      return entry.kind === "questionSet" ? (isEn ? "Question Set" : "题单") : (isEn ? "Book" : "书籍");
    },
    getLibraryCardActionLabel(entry) {
      const isEn = getLanguage() === "en";
      return (entry.readUrl || entry.readAssetId) ? (isEn ? "Read" : "阅读") : (isEn ? "Practice" : "练题");
    },
    getLibraryProblemCountLabel() {
      return getLanguage() === "en" ? "problems" : "题";
    },
    getLibraryReadLabel() {
      return getLanguage() === "en" ? "Read" : "阅读";
    },
    getLibraryPracticeLabel() {
      return getLanguage() === "en" ? "Practice" : "练题";
    },
    getLibraryReferenceOnlyLabel() {
      return getLanguage() === "en" ? "Reference only" : "仅作资料入口";
    },
    getLibraryEmptyLabel() {
      return getLanguage() === "en" ? "No matching items." : "没有匹配内容。";
    },
    getLibraryBooksLabel() {
      return getLanguage() === "en" ? "Books" : "本书籍";
    },
    getLibrarySetsLabel() {
      return getLanguage() === "en" ? "Sets" : "份题单";
    },
    getLibraryLinkedProblemsLabel() {
      return getLanguage() === "en" ? "Linked Problems" : "关联题目";
    },
    getTotalLibraryProblems() {
      return userState.value.problems.filter(isCatalogProblem).length;
    },
    openLibraryReader,
    openLibraryPractice,
    closeLibraryReader
  });

  registerSupportModules({
    elements: els,
    getEntries() {
      return userState.value.entries;
    },
    getResources() {
      return userState.value.resources;
    },
    setResources(resources) {
      userState.value.resources = resources;
    },
    normalizeResources,
    normalizeContentSources,
    inferSource,
    safeExternalUrl,
    makeId,
    undoLatestEntry,
    saveState,
    t,
    emptyBlock,
    formatDate,
    skillDefs,
    refreshIcons,
    getJobs() {
      return userState.value.jobs;
    },
    normalizeJobs,
    refreshJobs: refreshJobsFromApi,
    openExternalUrl,
    addTag: addProblemTag,
    formatJobDate: formatNewsDate,
    formatJobPrompt(job) {
      return `${job.company} · ${job.location}`;
    },
    getSelectedMessageThread() {
      return messageSelectionState.getSelected();
    },
    setSelectedMessageThread(threadId) {
      messageSelectionState.setSelected(threadId);
    },
    getCurrentUser() {
      return appState.currentUser;
    },
    getMessageThreads: getUserMessageThreads,
    loadCommunity,
    setCommunity(store) {
      appState.community = store;
    },
    saveCommunity,
    normalizeThread: normalizeMessageThread,
    normalizeParticipant: normalizeMessageParticipant,
    updateUnreadBadge: updateUnreadMessageBadge,
    escapeHtml,
    escapeAttribute,
    getInitials,
    getContacts() {
      return userState.value.network;
    },
    setContacts(contacts) {
      userState.value.network = contacts;
    },
    normalizeContact: normalizeNetworkContact,
    getStatusLabel: getNetworkStatusLabel,
    getDeleteLabel() {
      return getLanguage() === "en" ? "Delete contact" : "删除联系人";
    },
    getLanguage
  });

  registerDashboardModules({
    elements: els,
    getNews() {
      return userState.value.news;
    },
    getNewsTopicFilter() {
      return newsFilterState.getTopic();
    },
    setNewsTopicFilter(value) {
      newsFilterState.setTopic(value);
    },
    getNewsSourceFilter() {
      return newsFilterState.getSource();
    },
    setNewsSourceFilter(value) {
      newsFilterState.setSource(value);
    },
    getNewsFetchedAt() {
      return userState.value.newsFetchedAt;
    },
    getNewsSyncError() {
      return userState.value.newsSyncError;
    },
    skillDefs,
    sortNews,
    normalizeNewsTopicFilter,
    normalizeNewsSourceFilter,
    newsMatchesTopic,
    newsMatchesSourceFilter,
    normalizeNewsSourceType,
    inferNewsSourceType,
    inferSource,
    getNewsSourceTypeLabel,
    getNewsVerificationLabel,
    isSocialNewsType,
    normalizeNewsSkills,
    addTag: addProblemTag,
    safeExternalUrl,
    formatNewsDate,
    formatTimeOnly,
    focusNewsItem,
    markNewsRead,
    renderSummary,
    renderLeaderboard,
    refreshNews: refreshNewsFromApi,
    addNewsFromForm,
    t,
    emptyBlock,
    escapeHtml,
    refreshIcons,
    getLanguage,
    renderTodayPlan,
    renderCommunity: communityModule.render,
    getCatalogProblems,
    buildProblemProgressItems,
    renderProgressGroup,
    getDailyXpSeries,
    buildRecentContributionHeatmap,
    dayKey,
    formatOverviewDate: formatNewsDate,
    openCommunity() {
      switchModule("community");
    },
    addCommunityPost: communityModule.addPost,
    handleCommunityMedia: communityModule.handleMedia,
    refreshLeaderboard: refreshLeaderboardFromCloud,
    updateLeaderboardSettings
  });

  registerUtilityModules({
    elements: els,
    renderPrepPlan,
    createPrepPlan,
    editPrepPlan,
    handlePrepPlanAction,
    submitPrepDiagnostic,
    getResume() {
      return userState.value.resume;
    },
    setResume(resume) {
      userState.value.resume = resume;
    },
    normalizeResume: normalizeResumeState,
    saveState,
    requestResumeReview: requestResumeReviewFromApi,
    localResumeReview,
    renderAccountResumeMeta,
    setButtonBusy: setButtonBusyView,
    getEmptyReviewLabel() {
      return getLanguage() === "en"
        ? "Run the review to get role-specific edits."
        : "点击 LLM 修改简历后，这里会显示针对岗位的修改要点。";
    },
    getCurrentUser: () => appState.currentUser,
    getLanguage,
    getLlmConfig,
    getCloudConfig: () => appState.cloudConfig,
    getAuth: () => appState.auth,
    defaultCloudApiEndpoint: DEFAULT_CLOUD_API_ENDPOINT,
    renderCountries: renderCountryOptions,
    renderRegions: renderRegionOptions,
    renderCloudStatus,
    saveSettings,
    syncCloud: syncCloudNow,
    setLanguage,
    exportState,
    importState,
    resetState,
    t
  });

  registerPokerModule({
    elements: els,
    pokerState,
    loadInitialPokerGame,
    renderPokerGame,
    handlePokerDocumentClick,
    handlePokerDocumentSubmit,
    resetPokerTournament,
    renderPokerPreflopChart,
    handlePokerPreflopMatrixClick
  });

  registerTrainingModules({
    elements: els,
    documentRef: document,
    windowRef: window,
    getState() {
      return userState.value;
    },
    makeId,
    randomChoice,
    randomInt,
    formatCategory: formatCategoryLabel,
    skillDefs,
    normalizeCategory,
    getLocalizedProblemField,
    saveState,
    renderAll,
    renderInterviewSetup,
    renderInterviewTranscript,
    renderInterviewFavorites,
    selectInterviewLanguage(value) {
      interviewState.language = value;
      renderInterviewCategoryPicker();
      updateInterviewSetupVisibility();
      updateInterviewAnswerMode();
      renderInterviewTranscript();
      renderInterviewQuestionPanel();
    },
    handleInterviewSetupChange(field) {
      if (field === "type" || field === "source") interviewRuntime.state.selectedCategories = new Set(["all"]);
      updateInterviewSetupVisibility();
      renderInterviewSetup();
      resetInterview({ keepSetup: true });
    },
    toggleInterviewCategory,
    updateInterviewSetupVisibility,
    updateInterviewAnswerMode,
    updateInterviewPdfMeta,
    updateInterviewAnswerFileMeta,
    autoSizeInterviewAnswer,
    handleInterviewAnswerKeydown,
    handleInterviewTranscriptAction,
    saveLlmConfig,
    startInterview,
    requestInterviewHint,
    revealInterviewAnswer,
    goToNextInterviewQuestion,
    saveCurrentInterviewFavorite,
    shareCurrentInterviewQuestion,
    restartInterviewWithSameConfig,
    exportInterviewReport,
    toggleInterviewPanel,
    exitInterview,
    resumeDurableInterview,
    toggleVoiceAnswer,
    resetInterview,
    submitInterviewAnswer,
    renderProblems,
    setProblemSearchComposing(value) {
      problemsRuntime.setSearchComposing(value);
    },
    handleProblemSearchInput,
    handleProblemSearchKeydown,
    setProblemThemeFilter(value) {
      applyProblemFilterAction({ type: "theme", value });
    },
    setProblemDifficultyFilter(value) {
      applyProblemFilterAction({ type: "difficulty", value });
    },
    setProblemCompanyFilter(value) {
      applyProblemFilterAction({ type: "company", value });
    },
    clearProblemCompanyFilter() {
      applyProblemFilterAction({ type: "clearCompany" });
    },
    clearProblemSourceFilter() {
      applyProblemFilterAction({ type: "clearSource" });
    },
    handleProblemCollectionClick,
    toggleLeetcodeHot: toggleLeetcodeHotPanel,
    addProblemFromForm,
    importProblemJson,
    setProblemViewMode(value) {
      applyProblemFilterAction({ type: "viewMode", value });
    },
    handleProblemPaginationClick,
    handleProblemPaginationSubmit,
    handleProblemPaginationChange,
    handleProblemPaginationKeydown,
    getSkills() {
      return userState.value.skills;
    },
    getSkillScore,
    getSkillPracticeStats,
    getAllSkillPracticeStats,
    getQuantScore,
    formatScore,
    skillRadarRuntime,
    getCurrentUserName() {
      return appState.currentUser?.name || "You";
    },
    formatNumber,
    formatDate,
    t,
    escapeHtml,
    emptyBlock,
    renderSummary,
    renderSkills() {
      getModuleLifecycle("skills")?.render?.();
    },
    renderMemory() {
      getModuleLifecycle("memory")?.render?.();
    },
    recordGameResult,
    ensurePokerGame() {
      if (!pokerState.game) pokerState.game = makePokerGameRound();
    },
    renderPokerGame,
    refreshIcons
  });
}
