import {
  APPROVED_MUTATION_INVENTORY,
  buildRecoveryAcceptance,
} from "./frontend-upgrade-approved-mutations.mjs";

export const CORE_ENTITY_NAMES = [
  "User", "Session", "Preference",
  "ProblemSource", "Problem", "LibraryResource",
  "ProblemProgress", "Favorite", "Note",
  "TrainingSession", "Attempt", "Answer", "TrainingEvent",
  "InterviewSession", "Turn", "Attachment", "Evaluation",
  "Plan", "PlanTask", "Recommendation", "SkillSnapshot", "XpLedger", "CoinLedger",
  "RatingHistory", "LeagueSeason", "LeagueEntry", "RewardPurchase",
  "NewsItem", "Experience", "Post", "Comment", "Conversation", "Message",
  "NetworkContact", "Notification", "MediaObject", "AiJob", "AuditEvent",
  "ResumeDocument", "ResumeReview", "CompanyProfile", "JobPosting", "JobApplication",
  "Course", "CourseProgress", "MemoryResource",
];

export const SUPPORTING_SOURCES = [
  { file: "QuantGym UI 升级计划.dc.html", role: "historical-design-plan" },
  { file: "QuantGym UI 升级计划 v2.dc.html", role: "approved-design-plan" },
  { file: "README.md", role: "archive-guide" },
  { file: "qg-state.js", role: "reference-state-fixture" },
  { file: "support.js", role: "reference-interaction-fixture" },
  { file: "吉祥物生成任务书.md", role: "mascot-art-direction" },
];

export const REQUIRED_SYSTEM_SURFACE_IDS = [
  "system:auth",
  "system:desktop-shell",
  "system:mobile-shell",
  "system:global-search",
  "system:notifications-toast",
  "system:todo",
  "system:theme-language",
  "system:network-recovery",
];

export const APPROVED_TABLET_ROUTE_IDS = [
  "plan",
  "problems",
  "interview",
  "poker",
  "messages",
  "library",
];

const SURFACE_ROWS = [
  {
    id: "system:auth", phase: 1, template: "settings-form", designFiles: ["QuantGym 登录.dc.html"],
    components: ["AuthFrame", "EmailAuthForm", "GoogleAuthButton", "AuthRecovery"],
    entityRefs: ["User", "Session"], readModels: ["Session", "AuthChallenge"],
    interactions: ["sign-in", "register", "reset-password", "google-sign-in"],
    journey: "auth-session-and-recovery", tabletDistinct: false,
  },
  {
    id: "system:desktop-shell", phase: 1, template: "dashboard", designFiles: ["QuantGym 总览.dc.html"],
    components: ["DesktopSidebar", "TopBar", "AccountMenu"],
    entityRefs: ["User", "Notification"], readModels: ["Me", "Navigation"],
    interactions: ["navigate", "collapse-sidebar", "open-account"],
    journey: "desktop-shell-keyboard-navigation", tabletDistinct: false,
  },
  {
    id: "system:mobile-shell", phase: 1, template: "dashboard", designFiles: ["QuantGym 总览.dc.html"],
    components: ["MobileHeader", "MobileDrawer", "BottomNavigation"],
    entityRefs: ["User", "Notification"], readModels: ["Me", "Navigation"],
    interactions: ["open-drawer", "switch-route", "restore-focus"],
    journey: "mobile-shell-navigation", tabletDistinct: false,
  },
  {
    id: "system:global-search", phase: 1, template: "list-detail", designFiles: ["QuantGym 总览.dc.html"],
    components: ["CommandPalette", "SearchResults"],
    entityRefs: ["Problem", "NewsItem", "CompanyProfile", "JobPosting", "Course"], readModels: ["SearchResult"],
    interactions: ["open", "query", "keyboard-select"],
    journey: "global-search-keyboard", tabletDistinct: false,
  },
  {
    id: "system:notifications-toast", phase: 1, template: "list-detail", designFiles: ["QuantGym 总览.dc.html"],
    components: ["NotificationCenter", "ToastRegion"], entityRefs: ["Notification"], readModels: ["Notification"],
    interactions: ["open", "mark-read", "dismiss"], journey: "notifications-live-region", tabletDistinct: false,
  },
  {
    id: "system:todo", phase: 1, template: "workflow-board", designFiles: ["QuantGym 计划.dc.html"],
    components: ["TodoDock", "TodoEditor"], entityRefs: ["PlanTask"], readModels: ["PlanTask"],
    interactions: ["create", "edit", "complete", "delete"], journey: "todo-lifecycle", tabletDistinct: false,
  },
  {
    id: "system:theme-language", phase: 1, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["ThemeSwitch", "LanguageSwitch"], entityRefs: ["Preference"], readModels: ["Preferences"],
    interactions: ["switch-theme", "switch-language"], journey: "theme-language-persistence", tabletDistinct: false,
  },
  {
    id: "system:network-recovery", phase: 1, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["NetworkBanner", "ErrorBoundary", "RetryPanel"], entityRefs: ["Session", "AuditEvent"],
    readModels: ["RuntimeStatus"], interactions: ["retry", "recover", "sign-in-again"],
    journey: "offline-and-error-recovery", tabletDistinct: false,
  },
  {
    id: "route:overview", phase: 2, template: "dashboard", designFiles: ["QuantGym 总览.dc.html"],
    components: ["OverviewHero", "DailyPlanCard", "ProgressSummary", "LeaderboardPreview"],
    entityRefs: ["User", "Plan", "PlanTask", "SkillSnapshot", "XpLedger", "LeagueEntry"],
    readModels: ["Me", "DailyPlan", "TrainingSummary", "LeagueSummary"],
    interactions: ["resume-training", "open-daily-task", "open-leaderboard"],
    journey: "overview-resume-training", tabletDistinct: false,
  },
  {
    id: "route:plan", phase: 2, template: "workflow-board", designFiles: ["QuantGym 计划.dc.html"],
    components: ["PlanSetup", "Diagnostic", "PlanBoard", "TaskEditor"],
    entityRefs: ["Plan", "PlanTask", "Recommendation"], readModels: ["Plan", "PlanTask", "Recommendation"],
    interactions: ["diagnose", "create-plan", "edit-task", "complete-task"],
    journey: "plan-recommendation", tabletDistinct: true,
  },
  {
    id: "route:problems", phase: 2, template: "list-detail", designFiles: ["QuantGym 题目.dc.html"],
    components: ["ProblemFilters", "ProblemList", "ProblemDetail", "AttemptComposer", "HintPanel", "NoteEditor"],
    entityRefs: [
      "ProblemSource", "Problem", "ProblemProgress", "Favorite", "Note", "TrainingSession",
      "Attempt", "Answer", "TrainingEvent", "Comment",
    ],
    readModels: ["Problem", "ProblemProgress", "AttemptSummary", "CommentSummary"],
    interactions: ["filter", "open", "use-hint", "submit-attempt", "reveal-solution", "save-note", "toggle-favorite", "complete"],
    journey: "problem-attempt-completion", tabletDistinct: true,
  },
  {
    id: "route:interview", phase: 3, template: "focused-session", designFiles: ["QuantGym 模拟面试.dc.html"],
    components: [
      "InterviewSetup", "DeviceCheck", "TrainingSessionShell", "VoiceTextToggle", "Transcript",
      "AttachmentQueue", "FeedbackPanel", "FinalReport", "RecommendationPanel",
    ],
    entityRefs: ["InterviewSession", "Turn", "Attachment", "Evaluation", "AiJob", "Plan", "Recommendation"],
    readModels: ["InterviewSessionView", "AiJobView", "DraftView", "MediaObjectView"],
    interactions: [
      "configure", "device-check", "switch-answer-mode", "answer", "autosave", "recover",
      "view-question-feedback", "open-final-report", "add-recommendations-to-plan",
    ],
    journey: "interview-autosave-recovery", tabletDistinct: true,
  },
  {
    id: "route:tools", phase: 3, template: "focused-session", designFiles: ["QuantGym 速算.dc.html", "QuantGym 报价.dc.html"],
    components: ["ToolSelector", "TrainingSessionShell", "MentalMathRound", "QuoteRound"],
    entityRefs: ["TrainingSession", "Attempt", "Answer", "TrainingEvent", "XpLedger", "CoinLedger"],
    readModels: ["TrainingSession", "Attempt", "QuoteRound"],
    interactions: ["select-mode", "submit-answer", "submit-quote", "finish"],
    journey: "tools-session-completion", tabletDistinct: false,
  },
  {
    id: "route:skills", phase: 4, template: "dashboard", designFiles: ["QuantGym 能力值.dc.html"],
    components: ["SkillRadar", "SkillTrend", "EvidenceList"], entityRefs: ["SkillSnapshot", "TrainingEvent"],
    readModels: ["SkillSnapshot", "SkillHistory"], interactions: ["inspect-skill", "open-evidence"],
    journey: "skill-evidence-drilldown", tabletDistinct: false,
  },
  {
    id: "route:league", phase: 4, template: "dashboard", designFiles: ["QuantGym 联赛.dc.html"],
    components: ["LeagueStandings", "LearningMap", "RewardShop"],
    entityRefs: ["LeagueSeason", "LeagueEntry", "XpLedger", "CoinLedger", "RewardPurchase"],
    readModels: ["LeagueSeason", "LeagueEntry", "EconomyBalance"],
    interactions: ["earn-xp", "open-node", "inspect-reward"], journey: "league-xp-reward", tabletDistinct: false,
  },
  {
    id: "route:pk", phase: 4, template: "focused-session", designFiles: ["QuantGym PK.dc.html"],
    components: ["MatchLobby", "TrainingSessionShell", "MatchResult"],
    entityRefs: ["TrainingSession", "Attempt", "RatingHistory", "XpLedger"], readModels: ["PkMatch", "RatingLedger"],
    interactions: ["start", "submit", "reveal", "rematch"], journey: "pk-rating-result", tabletDistinct: false,
  },
  {
    id: "route:poker", phase: 4, template: "focused-session", designFiles: ["QuantGym Poker.dc.html"],
    components: ["PokerLobby", "TrainingSessionShell", "PokerTable", "ActionBar", "HandHistory"],
    entityRefs: ["TrainingSession", "TrainingEvent", "RatingHistory", "CoinLedger"],
    readModels: ["PokerRoomView", "PokerHandView", "RatingSummary"],
    interactions: ["configure", "join", "act", "recover-session", "reconnect", "view-result", "leave"],
    journey: "poker-reconnect", tabletDistinct: true,
  },
  {
    id: "route:experiences", phase: 5, template: "list-detail", designFiles: ["QuantGym 面经.dc.html"],
    components: ["ExperienceList", "ExperienceEditor", "SharePanel"], entityRefs: ["Experience"], readModels: ["Experience"],
    interactions: ["create", "edit", "share", "delete"], journey: "experience-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:news", phase: 5, template: "list-detail", designFiles: ["QuantGym 新闻.dc.html"],
    components: ["NewsFilters", "NewsList", "NewsDetail"], entityRefs: ["NewsItem"], readModels: ["NewsItem", "NewsFeed"],
    interactions: ["filter", "open", "refresh", "save"], journey: "news-filter-detail", tabletDistinct: false,
  },
  {
    id: "route:community", phase: 5, template: "list-detail", designFiles: ["QuantGym 论坛.dc.html"],
    components: ["PostComposer", "Feed", "CommentThread"], entityRefs: ["Post", "Comment", "Conversation", "MediaObject"],
    readModels: ["Post", "Comment", "MediaObject"], interactions: ["post", "like", "comment", "message-author"],
    journey: "community-post-thread", tabletDistinct: false,
  },
  {
    id: "route:messages", phase: 5, template: "list-detail", designFiles: ["QuantGym 聊天.dc.html"],
    components: ["ThreadList", "MessageTimeline", "MessageComposer"], entityRefs: ["Conversation", "Message"],
    readModels: ["Thread", "Message"], interactions: ["open-thread", "send", "mark-read", "reconnect"],
    journey: "messages-send-reconnect", tabletDistinct: true,
  },
  {
    id: "route:network", phase: 5, template: "list-detail", designFiles: ["QuantGym 人脉.dc.html"],
    components: ["ContactList", "ContactEditor", "FollowUpPanel"], entityRefs: ["NetworkContact"], readModels: ["Contact"],
    interactions: ["create", "edit", "schedule-follow-up", "delete"], journey: "network-contact-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:resume", phase: 5, template: "settings-form", designFiles: ["QuantGym 简历.dc.html"],
    components: ["ResumeEditor", "FileUpload", "AiReviewPanel"],
    entityRefs: ["ResumeDocument", "ResumeReview", "Attachment", "AiJob"], readModels: ["ResumeProfile", "AiJob", "MediaObject"],
    interactions: ["save", "upload", "request-review", "retry"], journey: "resume-review-job", tabletDistinct: false,
  },
  {
    id: "route:jobs", phase: 5, template: "workflow-board", designFiles: ["QuantGym 求职.dc.html"],
    components: ["JobFilters", "JobList", "ApplicationBoard"], entityRefs: ["JobPosting", "JobApplication"],
    readModels: ["Job", "Application"], interactions: ["filter", "save", "move-application", "open-source"],
    journey: "job-application-board", tabletDistinct: false,
  },
  {
    id: "route:companies", phase: 5, template: "list-detail", designFiles: ["QuantGym 公司.dc.html"],
    components: ["CompanyFilters", "CompanyList", "CompanyDetail"], entityRefs: ["CompanyProfile", "Problem"], readModels: ["Company"],
    interactions: ["filter", "open", "start-practice"], journey: "company-practice-handoff", tabletDistinct: false,
  },
  {
    id: "route:library", phase: 5, template: "list-detail", designFiles: ["QuantGym 资料库.dc.html"],
    components: ["LibraryFilters", "ResourceGrid", "Reader"], entityRefs: ["LibraryResource", "ProblemProgress"],
    readModels: ["LibraryItem", "ReaderToken", "Progress"], interactions: ["search", "open-reader", "resume-reading", "practice"],
    journey: "library-reader-progress", tabletDistinct: true,
  },
  {
    id: "route:courses", phase: 5, template: "dashboard", designFiles: ["QuantGym 课程.dc.html"],
    components: ["LearningPath", "CourseList", "LessonProgress"], entityRefs: ["Course", "CourseProgress"],
    readModels: ["Course", "LearningPath", "CourseProgress"], interactions: ["choose-path", "open-course", "complete-lesson"],
    journey: "course-progress", tabletDistinct: false,
  },
  {
    id: "route:memory", phase: 5, template: "list-detail", designFiles: ["QuantGym 资料笔记.dc.html"],
    components: ["ResourceList", "ResourceEditor", "MediaUpload"], entityRefs: ["MemoryResource", "MediaObject", "Note"],
    readModels: ["ResourceNote", "MediaObject"], interactions: ["create", "attach", "edit", "delete"],
    journey: "memory-resource-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:settings", phase: 5, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["PreferenceForm", "DataControls", "RuntimeStatusPanel"], entityRefs: ["Preference", "AuditEvent"],
    readModels: ["Preferences", "RuntimeStatus", "ExportJob"], interactions: ["save", "export", "import", "reset"],
    journey: "settings-data-controls", tabletDistinct: false,
  },
  {
    id: "route:account", phase: 5, template: "settings-form", designFiles: ["QuantGym 账户.dc.html"],
    components: ["ProfileForm", "AvatarUpload", "SessionList"], entityRefs: ["User", "Session", "MediaObject"],
    readModels: ["Me", "Session", "MediaObject"], interactions: ["save-profile", "upload-avatar", "revoke-session"],
    journey: "account-session-security", tabletDistinct: false,
  },
];

const mutationsBySurface = new Map();
for (const mutation of APPROVED_MUTATION_INVENTORY) {
  const mutationIds = mutationsBySurface.get(mutation.surfaceId) || [];
  mutationIds.push(mutation.id);
  mutationsBySurface.set(mutation.surfaceId, mutationIds);
}

const motionProfileFor = (surfaceId) => {
  if (["route:interview", "route:tools"].includes(surfaceId)) return "session-feedback";
  if (["route:skills", "route:league", "route:pk", "route:poker"].includes(surfaceId)) return "reward-feedback";
  return "panel-and-micro";
};

export const CANONICAL_SURFACE_INVENTORY = SURFACE_ROWS.map((row) => {
  const slug = row.id.split(":")[1];
  const mutationIds = mutationsBySurface.get(row.id) || [];
  return {
    id: row.id,
    kind: row.id.startsWith("route:") ? "route" : "system",
    ...(row.id.startsWith("route:") ? { routeId: slug } : {}),
    phase: row.phase,
    template: row.template,
    designFiles: row.designFiles,
    components: row.components,
    entityRefs: row.entityRefs,
    readModels: row.readModels,
    interactions: row.interactions,
    mutations: mutationIds,
    acceptanceChecks: [
      `visual:${slug}:light-dark`,
      `a11y:${slug}`,
      `e2e:${row.journey}`,
    ],
    stateSetRef: "design-system.requiredStates",
    recoveryStateSetRef: "design-system.routeRecoveryStates",
    ...(["route:interview", "route:resume"].includes(row.id)
      ? { aiJobStateSetRef: "design-system.aiJobStates" }
      : {}),
    responsive: {
      requiredViewports: row.tabletDistinct
        ? ["desktop", "laptop", "mobile", "tablet"]
        : ["desktop", "laptop", "mobile"],
      tabletDistinct: row.tabletDistinct,
    },
    motion: {
      profile: motionProfileFor(row.id),
      reducedMotion: true,
      blocksPrimaryAction: false,
    },
    recoveryAcceptance: buildRecoveryAcceptance(mutationIds),
    deviations: [],
  };
});
