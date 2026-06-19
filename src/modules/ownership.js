export const MODULE_OWNERSHIP = [
  {
    id: "overview",
    owner: "product-core",
    navGroup: "overview",
    page: "src/pages/OverviewPage.jsx",
    featureEntry: "src/features/overview/OverviewPageContent.jsx",
    stateDomains: ["userState", "problemBank", "leaderboard"],
    browserSmokeInteractions: [
      "overview CTA opens problems",
      "overview leaderboard controls and news ticker navigation",
      "streak check-in calendar opens and persists activity",
      "shell sidebar and command shortcuts persist navigation state",
      "hash compat deep links redirect without losing query state",
      "mobile shell sidebar, search, and settings controls avoid overflow",
      "mobile module nav groups open problems and library routes",
      "global search module, problem, job, company, course, and news navigation"
    ]
  },
  {
    id: "plan",
    owner: "growth",
    navGroup: "growth",
    page: "src/pages/PlanPage.jsx",
    featureEntry: "src/features/plan/PlanPageContent.jsx",
    stateDomains: ["userState", "prepPlan", "todo"],
    browserSmokeInteractions: [
      "plan create, edit, task persistence, and navigation",
      "plan baseline diagnostic completion and reload persistence",
      "todo dock opens and adds a task",
      "todo dock edit, complete, delete, and reload persistence"
    ]
  },
  {
    id: "skills",
    owner: "growth",
    navGroup: "growth",
    page: "src/pages/SkillsPage.jsx",
    featureEntry: "src/features/skills/SkillsPageContent.jsx",
    stateDomains: ["userState", "skills"],
    browserSmokeInteractions: ["skills radar hover and global search spotlight"]
  },
  {
    id: "interview",
    owner: "training",
    navGroup: "training",
    page: "src/pages/InterviewPage.jsx",
    featureEntry: "src/features/interview/InterviewPageContent.jsx",
    stateDomains: ["userState", "interview", "llm"],
    browserSmokeInteractions: [
      "mobile interview advanced setup controls avoid overflow",
      "interview onboarding, practice answer, favorite, exit, and resume",
      "interview attachment upload preview, transcript, and request payload",
      "interview PDF source upload generates questions and starts session"
    ]
  },
  {
    id: "problems",
    owner: "training",
    navGroup: "training",
    page: "src/pages/ProblemsPage.jsx",
    featureEntry: "src/features/problems/ProblemsPageContent.jsx",
    stateDomains: ["userState", "problemBank", "problemSocial"],
    browserSmokeInteractions: [
      "problems search, detail, reveal, and save",
      "problems pagination, collection filter, and mock interview handoff",
      "mobile problems detail actions and mock handoff avoid overflow",
      "problems ranking view opens ranked detail and preserves ranking navigation",
      "problems social like/comment no-cloud guard",
      "problems LeetCode Hot 100 tracking persistence"
    ]
  },
  {
    id: "tools",
    owner: "training",
    navGroup: "training",
    page: "src/pages/ToolsPage.jsx",
    featureEntry: "src/features/tools/ToolsPageContent.jsx",
    stateDomains: ["mentalMath", "marketGame"],
    browserSmokeInteractions: [
      "tools drill starts and accepts an answer",
      "tools mental math completes session and persists records",
      "tools market game rejects crossed quote, scores valid quote, and persists record"
    ]
  },
  {
    id: "poker",
    owner: "training",
    navGroup: "training",
    page: "src/pages/PokerPage.jsx",
    featureEntry: "src/features/poker/PokerPageContent.jsx",
    stateDomains: ["poker", "cloud"],
    browserSmokeInteractions: [
      "poker demo table starts, acts, and persists room state",
      "poker preflop matrix position, hand selection, and leave-table navigation"
    ]
  },
  {
    id: "experiences",
    owner: "training",
    navGroup: "training",
    page: "src/pages/ExperiencesPage.jsx",
    featureEntry: "src/features/experiences/ExperiencesPageContent.jsx",
    stateDomains: ["userState", "experiences", "community"],
    browserSmokeInteractions: ["experiences create, edit, share, delete, and reload persistence"]
  },
  {
    id: "news",
    owner: "community",
    navGroup: "social",
    page: "src/pages/NewsPage.jsx",
    featureEntry: "src/features/news/NewsPageContent.jsx",
    stateDomains: ["news", "userState"],
    browserSmokeInteractions: ["news manual submit, filter, detail, and reload persistence"]
  },
  {
    id: "community",
    owner: "community",
    navGroup: "social",
    page: "src/pages/CommunityPage.jsx",
    featureEntry: "src/features/community/CommunityPageContent.jsx",
    stateDomains: ["community", "media", "messages"],
    browserSmokeInteractions: [
      "community post, like, comment, and reload persistence",
      "community image post fallback and reload persistence",
      "community video post fallback and reload persistence",
      "community direct message from post opens messages thread"
    ]
  },
  {
    id: "messages",
    owner: "community",
    navGroup: "social",
    page: "src/pages/MessagesPage.jsx",
    featureEntry: "src/features/messages/MessagesPageContent.jsx",
    stateDomains: ["community", "messages"],
    browserSmokeInteractions: [
      "messages thread read, send, and reload persistence",
      "messages multi-thread unread badges clear and persist read state"
    ]
  },
  {
    id: "network",
    owner: "community",
    navGroup: "social",
    page: "src/pages/NetworkPage.jsx",
    featureEntry: "src/features/network/NetworkPageContent.jsx",
    stateDomains: ["userState", "network"],
    browserSmokeInteractions: ["network contact add, edit, delete, and reload persistence"]
  },
  {
    id: "resume",
    owner: "career",
    navGroup: "career",
    page: "src/pages/ResumePage.jsx",
    featureEntry: "src/features/resume/ResumePageContent.jsx",
    stateDomains: ["userState", "resume", "llm"],
    browserSmokeInteractions: [
      "resume text save and reload persistence",
      "resume LLM review request, render, and reload persistence",
      "mobile resume review controls avoid overflow"
    ]
  },
  {
    id: "jobs",
    owner: "career",
    navGroup: "career",
    page: "src/pages/JobsPage.jsx",
    featureEntry: "src/features/jobs/JobsPageContent.jsx",
    stateDomains: ["jobsCatalog", "cloud"],
    browserSmokeInteractions: ["jobs filter and apply link behavior"]
  },
  {
    id: "companies",
    owner: "career",
    navGroup: "career",
    page: "src/pages/CompaniesPage.jsx",
    featureEntry: "src/features/companies/CompaniesPageContent.jsx",
    stateDomains: ["companies", "problemBank"],
    browserSmokeInteractions: ["companies tier filter, practice navigation, and careers link behavior"]
  },
  {
    id: "library",
    owner: "resources",
    navGroup: "resources",
    page: "src/pages/LibraryPage.jsx",
    featureEntry: "src/features/library/LibraryPageContent.jsx",
    stateDomains: ["library", "reader", "problemBank"],
    browserSmokeInteractions: [
      "library search, kind filter, practice navigation, and reader guard",
      "library cloud PDF reader opens, exposes links, and closes"
    ]
  },
  {
    id: "courses",
    owner: "resources",
    navGroup: "resources",
    page: "src/pages/CoursesPage.jsx",
    featureEntry: "src/features/courses/CoursesPageContent.jsx",
    stateDomains: ["courses", "userState"],
    browserSmokeInteractions: ["courses path, source switch, note, and reload persistence"]
  },
  {
    id: "memory",
    owner: "resources",
    navGroup: "resources",
    page: "src/pages/MemoryPage.jsx",
    featureEntry: "src/features/memory/MemoryPageContent.jsx",
    stateDomains: ["memory", "media", "userState"],
    browserSmokeInteractions: [
      "memory resource add, source link, and reload persistence",
      "memory image resource upload fallback and reload persistence"
    ]
  },
  {
    id: "settings",
    owner: "platform",
    navGroup: "utility",
    page: "src/pages/SettingsPage.jsx",
    featureEntry: "src/features/settings/SettingsPageContent.jsx",
    stateDomains: ["settings", "runtimeConfig", "cloud"],
    browserSmokeInteractions: [
      "settings language switch syncs URL and persists reload",
      "settings saves runtime config, clears Google Client ID, and reloads",
      "mobile settings config and backup controls avoid overflow",
      "settings rejects invalid backup files without changing state",
      "settings backup export, import, and reset state",
      "cross-module prep journey persists library, problem, todo, resume, and settings state"
    ]
  },
  {
    id: "account",
    owner: "platform",
    navGroup: "utility",
    page: "src/pages/AccountPage.jsx",
    featureEntry: "src/features/account/AccountPageContent.jsx",
    stateDomains: ["account", "auth", "media"],
    browserSmokeInteractions: [
      "account profile save and reload persistence",
      "account local email change requires password and reauthenticates",
      "account avatar upload, clear, and resume file persistence",
      "mobile account profile and upload controls avoid overflow"
    ]
  },
  {
    id: "pk",
    owner: "training",
    navGroup: "training",
    page: "src/pages/PkPage.jsx",
    featureEntry: "src/features/pk/PkPageContent.jsx",
    stateDomains: ["pk", "problemBank", "userState"],
    browserSmokeInteractions: ["pk match, submit, reveal, and record persistence"]
  }
];

export function getModuleOwnership(id = "") {
  return MODULE_OWNERSHIP.find((entry) => entry.id === String(id || "").trim()) || null;
}
