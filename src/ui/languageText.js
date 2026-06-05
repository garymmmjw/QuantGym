import {
  applyStaticTranslations,
  setAttribute,
  setButtonLabel,
  setFileLabel,
  setLabelText,
  setPlaceholder,
  setSelectOptionLabels,
  setText,
  setTexts
} from './domText.js';

export function applyAppLanguageText(options = {}) {
  const {
    root = globalThis.document,
    elements = {},
    language = "zh",
    state = {},
    t = (key) => key,
    getNetworkStatusLabel = (status) => status,
    updatePrepTaskIndicator = () => {},
    updateGlobalSearchPlaceholder = () => {},
    updateCheckInPill = () => {},
    applySidebarState = () => {},
    renderLeaderboardScopeSummary = () => {},
    startHeroTypewriter = () => {}
  } = options;

  const text = (selector, value) => setText(selector, value, root);
  const button = (selector, value) => setButtonLabel(selector, value, root);
  const attribute = (selector, name, value) => setAttribute(selector, name, value, root);
  const texts = (selector, values) => setTexts(selector, values, root);
  const placeholder = (id, value) => setPlaceholder(elements[id], value);
  const selectOptions = (id, values) => setSelectOptionLabels(elements[id], values);
  const labelFor = (id, value) => setLabelText(elements[id], value);

  applyStaticTranslations(root, t);

  [
    ["overview", t("overview")],
    ["plan", t("plan")],
    ["experiences", t("experiences")],
    ["community", t("community")],
    ["problems", t("problems")],
    ["interview", t("interview")],
    ["pk", t("pk")],
    ["news", t("news")],
    ["network", t("network")],
    ["messages", t("messages")],
    ["resume", t("resume")],
    ["jobs", t("jobs")],
    ["companies", t("companies")],
    ["library", language === "en" ? "Library" : "书城"],
    ["courses", t("courses")],
    ["skills", t("skills")],
    ["tools", t("tools")],
    ["memory", t("memory")],
    ["settings", t("settings")]
  ].forEach(([key, value]) => button(`[data-module-tab="${key}"]`, value));

  text('[data-problem-view="all"]', t("allProblems"));
  text('[data-problem-view="saved"]', t("savedProblems"));
  text('[data-problem-view="ranking"]', t("popularProblems"));
  text(".problem-ranking-header h3", t("problemRankingTitle"));
  text(".problem-ranking-header p", t("problemRankingHint"));
  text("#skillsPageTitle", t("skills"));
  text("#skillsPageSubtitle", t("skillPageSubtitle"));
  text("#skillsScoreLabel", t("quantScore"));
  text("#skillsScoreCopy", t("skillScoreCopy"));
  text("#skillsEntriesLabel", t("practiceRecords"));
  text("#skillsAverageLabel", t("averageScore"));
  text("#skillsWeakestLabel", t("weakestSkill"));
  text("#skillRadarTitle", t("skillRadarTitle"));
  text("#skillRadarHint", t("skillRadarHint"));
  text(".sidebar-helper strong", t("todayGuide"));
  updatePrepTaskIndicator();

  updateGlobalSearchPlaceholder();
  texts(".app-command-actions .app-stat-pill small", [t("commandStreakLabel"), t("commandChatLabel")]);
  updateCheckInPill();
  text("#todoDockButtonLabel", t("todoButton"));
  text("#todoDockEyebrow", t("todoEyebrow"));
  text("#todoDockTitle", t("todoTitle"));
  placeholder("todoDockAddInput", t("todoAddPlaceholder"));
  button("#todoDockAddForm .secondary-button", t("todoAdd"));
  attribute(".app-account-chip", "aria-label", t("accountInfo"));
  attribute(".app-settings-button", "aria-label", t("settings"));
  applySidebarState();
  button("#generateStudyPlanBtn", t("designStudyPlan"));

  text(".summary-copy .rank-label", t("rankLabel"));
  text(".total-xp span:last-child", t("scoreSuffix"));
  texts(".summary-metrics small", [t("streak"), t("records"), t("weeklyXp")]);
  text(".log-panel h2", t("todayLog"));
  placeholder("logText", t("todayLogPlaceholder"));
  placeholder("durationInput", t("minutesPlaceholder"));
  selectOptions("difficultyInput", [t("difficultyNormal"), t("difficultyMedium"), t("difficultyHard")]);
  button("#logForm .primary-button", t("submitLog"));
  text(".leaderboard-panel h2", t("leaderboard"));
  labelFor("leaderboardMetricSelect", t("leaderboardMetric"));
  labelFor("leaderboardScopeSelect", t("leaderboardScope"));
  labelFor("leaderboardCountrySelect", t("country"));
  labelFor("leaderboardRegionSelect", t("region"));
  text(".overview-community h2", t("community"));
  text("#overviewCommunitySummary", t("overviewCommunitySummary"));
  text(".community-section h2", t("community"));
  text("#communitySummary", t("communitySummary"));
  text("#messagesPageTitle", t("messages"));
  text("#messagesSummary", t("messagesSummary"));
  placeholder("messageComposerInput", t("messageComposerPlaceholder"));

  placeholder("librarySearch", language === "en" ? "Search books, sets, sources" : "搜索书籍、题单、题源");
  text('[data-library-kind="all"]', language === "en" ? "All" : "全部");
  text('[data-library-kind="book"]', language === "en" ? "Books" : "书籍");
  text('[data-library-kind="questionSet"]', language === "en" ? "Question Sets" : "题单");
  text("#libraryContinueTitle", language === "en" ? "Continue Reading" : "继续阅读");
  text("#libraryBookTitle", language === "en" ? "Books" : "书籍");
  text("#libraryQuestionTitle", language === "en" ? "Question Sets" : "题单");
  text("#libraryEmpty", language === "en" ? "No matching books or question sets." : "没有匹配的书籍或题单。");

  text(".problem-page-copy .rank-label", t("problemEyebrow"));
  text(".problem-page-copy h2", t("problemTitle"));
  text(".problem-page-copy p", t("problemSubtitle"));
  placeholder("problemSearch", t("problemSearchPlaceholder"));
  attribute("#addProblemBtn", "title", t("addProblem"));
  attribute("#addProblemBtn", "aria-label", t("addProblem"));
  text("#problemCollectionsTitle", t("problemCollectionsTitle"));
  text(".problem-collections-heading p", t("problemCollectionsHint"));
  attribute("#problemCollectionGrid", "aria-label", t("problemCollectionsTitle"));

  text(".settings-section h2", t("settings"));
  if (elements.settingsMessage && !/已保存|saved|同步|sync|连接|connect/i.test(elements.settingsMessage.textContent)) {
    elements.settingsMessage.textContent = t("settingsMessageDefault");
  }
  texts(".settings-panel h3", [t("preferences"), t("data")]);

  text(".account-section h2", t("accountInfo"));
  text(".account-meta-panel h3", t("accountInfo"));
  if (elements.accountMessage && !/已更新|updated/i.test(elements.accountMessage.textContent)) {
    elements.accountMessage.textContent = t("accountMessage");
  }
  texts(".account-meta-panel dt", [t("provider"), t("createdAt"), t("currentRank")]);

  [
    ["accountNameInput", t("nickname")],
    ["accountEmailInput", t("email")],
    ["accountCountrySelect", t("country")],
    ["accountRegionSelect", t("region")],
    ["accountGraduationTermInput", t("graduationTerm")],
    ["accountResumeFile", t("resumeUpload")],
    ["accountCurrentPassword", t("currentPassword")],
    ["settingsLanguageSelect", t("language")],
    ["settingsCountrySelect", t("defaultCountry")],
    ["settingsRegionSelect", t("defaultRegion")]
  ].forEach(([id, value]) => labelFor(id, value));

  button("#accountForm .primary-button", t("saveAccount"));
  text(".resume-section h2", t("resumeModule"));
  text("#resumeSummary", t("resumeSummary"));
  labelFor("resumeText", t("resumeContent"));
  placeholder("resumeText", t("resumePlaceholder"));
  button("#reviewResumeBtn", t("reviewResume"));
  button("#saveResumeBtn", t("saveResume"));
  text(".resume-panel h3", t("resumeReviewTitle"));
  text(".jobs-section h2", t("jobsModule"));
  text("#jobsSummary", t("jobsSummary"));
  text("#companiesPageTitle", t("companies"));
  text("#companiesSummary", t("companiesSummary"));
  text("#problemCompanyTitle", t("problemCompanyTitle"));
  text("#problemCompanySummary", t("problemCompanySummary"));
  button("#problemCompanyClearBtn", t("allCompanies"));
  button('[data-company-tier="all"]', t("allCompanies"));
  button('[data-company-tier="s"]', "Tier S");
  button('[data-company-tier="a"]', "Tier A");
  button('[data-company-tier="b"]', "Tier B");
  button('[data-job-filter="all"]', t("allJobs"));
  button('[data-job-filter="internship"]', t("internship"));
  button('[data-job-filter="fulltime"]', t("fulltime"));
  attribute("#refreshJobsBtn", "title", t("refreshJobs"));
  attribute("#refreshJobsBtn", "aria-label", t("refreshJobs"));

  text(".news-section h2", t("newsModuleTitle"));
  text("#newsIntelTitle", t("newsIntelTitle"));
  text("#newsIntelSummary", t("newsIntelSummary"));
  text("#newsSocialHint", t("newsSocialHint"));
  attribute("#addNewsBtn", "title", t("newsAdd"));
  attribute("#addNewsBtn", "aria-label", t("newsAdd"));
  attribute("#refreshNewsBtn", "title", t("refreshNews"));
  attribute("#refreshNewsBtn", "aria-label", t("refreshNews"));
  button('[data-news-topic="all"]', t("newsTopicAll"));
  button('[data-news-topic="quantFirms"]', t("newsTopicQuantFirms"));
  button('[data-news-topic="marketStructure"]', t("newsTopicMarketStructure"));
  button('[data-news-topic="aiInfra"]', t("newsTopicAiInfra"));
  button('[data-news-topic="recruiting"]', t("newsTopicRecruiting"));
  button('[data-news-source-filter="all"]', t("newsSourceAll"));
  button('[data-news-source-filter="news"]', t("newsSourceNews"));
  button('[data-news-source-filter="official"]', t("newsSourceOfficial"));
  button('[data-news-source-filter="social"]', t("newsSourceSocial"));
  selectOptions("newsSourceType", [
    t("newsSourceNews"),
    t("newsSourceOfficial"),
    t("newsSourceLinkedIn"),
    t("newsSourceXiaohongshu"),
    t("newsSourceManual")
  ]);
  placeholder("newsTitle", t("newsTitlePlaceholder"));
  placeholder("newsSource", t("newsSourcePlaceholder"));
  placeholder("newsUrl", t("newsUrlPlaceholder"));
  placeholder("newsTags", t("newsTagsPlaceholder"));
  placeholder("newsSummary", t("newsSummaryPlaceholder"));
  placeholder("newsInsight", t("newsInsightPlaceholder"));
  button("#newsForm .secondary-button", t("newsSave"));

  text(".courses-section h2", t("coursesModule"));
  text("#coursesSummary", t("coursesSummary"));
  text("#learningPathTitle", t("learningPathTitle"));
  text("#learningPathHint", t("learningPathHint"));
  placeholder("resourceSources", t("resourceSourcesPlaceholder"));
  text(".network-section h2", t("networkModule"));
  attribute("#addNetworkBtn", "title", t("networkAdd"));
  attribute("#addNetworkBtn", "aria-label", t("networkAdd"));
  button("#networkForm .secondary-button", t("networkSave"));
  [...(elements.networkStatus?.options || [])].forEach((option) => {
    option.textContent = getNetworkStatusLabel(option.value);
  });

  button("#settingsForm .primary-button", t("saveSettings"));
  button("#communityForm .primary-button", t("post"));
  button("#overviewCommunityForm .primary-button", t("post"));
  setFileLabel("#communityForm .secondary-button", elements.communityMedia, t("addMedia"), root);
  button("#exportBtn", t("exportBackup"));
  button("#resetBtn", t("resetMemory"));
  button("#syncCloudBtn", t("syncCloud"));
  button("#logoutBtn", t("logout"));
  setFileLabel(null, elements.importInput, t("importBackup"), root);

  placeholder("communityText", t("communityPlaceholder"));
  placeholder("overviewCommunityText", t("overviewCommunityPlaceholder"));
  text("#newsDetail .news-impact strong", t("newsImpact"));
  text("#newsDetailReadBadge", t("newsReadCount"));

  const scopeOptions = elements.leaderboardScopeSelect?.options || [];
  if (scopeOptions.length >= 3) {
    scopeOptions[0].textContent = t("leaderboardGlobal");
    scopeOptions[1].textContent = t("leaderboardCountry");
    scopeOptions[2].textContent = t("leaderboardRegion");
  }
  renderLeaderboardScopeSummary(state.leaderboard);
  startHeroTypewriter();
  return true;
}
