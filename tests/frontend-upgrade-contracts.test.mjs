import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildAcceptanceCatalog,
  validateAcceptanceCatalog,
  validateApprovedAcceptancePolicy,
  validateDesignSystemContract,
  validateSurfaceContracts,
} from "../scripts/lib/frontend-upgrade-contracts.mjs";
import { APPROVED_ACCEPTANCE_POLICY } from "../scripts/lib/frontend-upgrade-approved-acceptance.mjs";
import { APPROVED_MUTATION_INVENTORY } from "../scripts/lib/frontend-upgrade-approved-mutations.mjs";
import { MODULE_MANIFEST } from "../src/modules/manifest.js";

const validDesignSystem = JSON.parse(
  await readFile(
    new URL("../docs/frontend-upgrade/design-system-contract.json", import.meta.url),
    "utf8",
  ),
);

const completeHashFailure = "complete approved design-system contract hash mismatch";

const swapFirstTwo = (items) => {
  [items[0], items[1]] = [items[1], items[0]];
};

const reverseObjectKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
};

test("locks the approved Playful Precision foundations", () => {
  const failures = validateDesignSystemContract(validDesignSystem);

  assert.deepEqual(failures, []);
  assert.deepEqual(validDesignSystem.themes, {
    light: {
      appBackground: "#f4f4fb",
      surfacePrimary: "#ffffff",
      surfaceSecondary: "#fbfbfd",
      textPrimary: "#1b1a38",
      textSecondary: "#4a4966",
      textMuted: "#6d6c8e",
      borderSubtle: "#ecebf7",
      actionPrimary: "#5b5ff5",
      actionPrimarySoft: "#eef0ff",
    },
    dark: {
      appBackground: "#111020",
      surfacePrimary: "#201f39",
      surfaceSecondary: "#1b1a30",
      textPrimary: "#f1f0fb",
      textSecondary: "#cbc9e8",
      textMuted: "#a6a4cf",
      borderSubtle: "#332f57",
      actionPrimary: "#7d7bff",
      actionPrimaryInk: "#b9b8ff",
    },
  });
  assert.deepEqual(validDesignSystem.typography, {
    ui: "Plus Jakarta Sans",
    metrics: "Space Grotesk",
    chineseFallbacks: ["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"],
    metricFeatures: ["tabular-nums"],
  });
  assert.deepEqual(validDesignSystem.shape.radiusPx, [11, 14, 16, 20, 28]);
  assert.deepEqual(validDesignSystem.motion.microMs, [120, 180]);
  assert.deepEqual(validDesignSystem.motion.panelMs, [240, 300]);
  assert.deepEqual(validDesignSystem.viewports, [
    { id: "desktop", width: 1440, height: 900 },
    { id: "laptop", width: 1280, height: 720 },
    { id: "mobile", width: 390, height: 844 },
    { id: "tablet", width: 1024, height: 768, conditional: true },
  ]);
  assert.deepEqual(validDesignSystem.requiredStates, [
    "loading",
    "ready",
    "empty",
    "error",
    "disabled",
    "focus",
    "active",
    "reward",
    "reduced-motion",
  ]);
  assert.deepEqual(validDesignSystem.allowedDeviationReasons, [
    "real-data-density",
    "accessibility",
    "performance",
    "small-screen-usability",
  ]);
});

test("rejects raw-palette semantics and an unapproved deviation reason", () => {
  const invalid = structuredClone(validDesignSystem);
  invalid.semanticTokens.push("purple-500");
  invalid.allowedDeviationReasons.push("personal-preference");

  const failures = validateDesignSystemContract(invalid);

  assert.ok(failures.some((item) => item.includes("semantic token")));
  assert.ok(failures.some((item) => item.includes("deviation reason")));
});

test("canonical hashing ignores object key insertion order", () => {
  const reordered = reverseObjectKeys(validDesignSystem);

  assert.deepEqual(validateDesignSystemContract(reordered), []);
});

const topLevelMutations = [
  ["version", (contract) => { contract.version = 2; }],
  ["name", (contract) => { contract.name = "Playful Precision 2.1"; }],
  ["spec", (contract) => { contract.spec = contract.spec.replace("design.md", "design-v2.md"); }],
  ["designSource", (contract) => { contract.designSource = contract.designSource.replace("manifest.json", "manifest-v2.json"); }],
  ["productionAssets", (contract) => { contract.productionAssets = contract.productionAssets.replace("manifest.json", "manifest-v2.json"); }],
  ["themes", (contract) => { contract.themes.light.appBackground = "#f4f4fa"; }],
  ["semanticTokens", (contract) => { swapFirstTwo(contract.semanticTokens); }],
  ["typography", (contract) => { swapFirstTwo(contract.typography.chineseFallbacks); }],
  ["shape", (contract) => { contract.shape.shadowPolicy = "dialogs-command-notifications-only"; }],
  ["surfacePolicy", (contract) => { swapFirstTwo(contract.surfacePolicy.hierarchyOrder); }],
  ["densityPolicy", (contract) => { contract.densityPolicy.problems = "dense-professional-scan-optimized"; }],
  ["shellLayout", (contract) => { contract.shellLayout.ordinaryContentMaxPx = 1179; }],
  ["breakpoints", (contract) => { contract.breakpoints.mobileTouchTargetMinPx = 45; }],
  ["templateResponsiveRules", (contract) => { contract.templateResponsiveRules.dashboard = "stack-priority-sections-primary-action-first"; }],
  ["motion", (contract) => { contract.motion.rewardBlocksNextAction = true; }],
  ["motionProfiles", (contract) => { swapFirstTwo(contract.motionProfiles["panel-and-micro"]); }],
  ["viewports", (contract) => { contract.viewports[3].conditional = false; }],
  ["requiredStates", (contract) => { swapFirstTwo(contract.requiredStates); }],
  ["routeRecoveryStates", (contract) => { swapFirstTwo(contract.routeRecoveryStates); }],
  ["aiJobStates", (contract) => { swapFirstTwo(contract.aiJobStates); }],
  ["pageTemplates", (contract) => { swapFirstTwo(contract.pageTemplates); }],
  ["allowedDeviationReasons", (contract) => { swapFirstTwo(contract.allowedDeviationReasons); }],
  ["mascot", (contract) => { swapFirstTwo(contract.mascot.allowedRoles); }],
];

test("covers every top-level contract section with a shape-preserving mutation", () => {
  assert.deepEqual(
    topLevelMutations.map(([section]) => section),
    Object.keys(validDesignSystem),
  );
});

for (const [section, mutate] of topLevelMutations) {
  test(`hash-locks shape-preserving ${section} mutations`, () => {
    const invalid = structuredClone(validDesignSystem);
    mutate(invalid);

    const failures = validateDesignSystemContract(invalid);

    assert.ok(
      failures.includes(completeHashFailure),
      `${section} mutation should fail the complete contract hash: ${failures.join(", ")}`,
    );
  });
}

const independentSupportingSources = [
  { file: "QuantGym UI 升级计划.dc.html", role: "historical-design-plan" },
  { file: "QuantGym UI 升级计划 v2.dc.html", role: "approved-design-plan" },
  { file: "README.md", role: "archive-guide" },
  { file: "qg-state.js", role: "reference-state-fixture" },
  { file: "support.js", role: "reference-interaction-fixture" },
  { file: "吉祥物生成任务书.md", role: "mascot-art-direction" },
];

const independentPhaseRegistry = {
  version: 1,
  spec: "docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md",
  phases: [
    { id: 0, name: "baseline-and-design-freeze", routes: [] },
    { id: 1, name: "kernel-shell-auth", routes: [] },
    { id: 2, name: "daily-training-loop", routes: ["overview", "plan", "problems"] },
    { id: 3, name: "interview-and-tools", routes: ["interview", "tools"] },
    { id: 4, name: "skills-economy-competition", routes: ["skills", "league", "pk", "poker"] },
    {
      id: 5,
      name: "remaining-product-domains",
      routes: [
        "experiences", "news", "community", "messages", "network", "resume", "jobs",
        "companies", "library", "courses", "memory", "settings", "account",
      ],
    },
    { id: 6, name: "hardening-and-cutover", routes: [] },
  ],
};

const independentSurfaceRows = [
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
    components: ["NotificationCenter", "ToastRegion"],
    entityRefs: ["Notification"], readModels: ["Notification"],
    interactions: ["open", "mark-read", "dismiss"],
    journey: "notifications-live-region", tabletDistinct: false,
  },
  {
    id: "system:todo", phase: 1, template: "workflow-board", designFiles: ["QuantGym 计划.dc.html"],
    components: ["TodoDock", "TodoEditor"],
    entityRefs: ["PlanTask"], readModels: ["PlanTask"],
    interactions: ["create", "edit", "complete", "delete"],
    journey: "todo-lifecycle", tabletDistinct: false,
  },
  {
    id: "system:theme-language", phase: 1, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["ThemeSwitch", "LanguageSwitch"],
    entityRefs: ["Preference"], readModels: ["Preferences"],
    interactions: ["switch-theme", "switch-language"],
    journey: "theme-language-persistence", tabletDistinct: false,
  },
  {
    id: "system:network-recovery", phase: 1, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["NetworkBanner", "ErrorBoundary", "RetryPanel"],
    entityRefs: ["Session", "AuditEvent"], readModels: ["RuntimeStatus"],
    interactions: ["retry", "recover", "sign-in-again"],
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
    components: ["SkillRadar", "SkillTrend", "EvidenceList"],
    entityRefs: ["SkillSnapshot", "TrainingEvent"], readModels: ["SkillSnapshot", "SkillHistory"],
    interactions: ["inspect-skill", "open-evidence"],
    journey: "skill-evidence-drilldown", tabletDistinct: false,
  },
  {
    id: "route:league", phase: 4, template: "dashboard", designFiles: ["QuantGym 联赛.dc.html"],
    components: ["LeagueStandings", "LearningMap", "RewardShop"],
    entityRefs: ["LeagueSeason", "LeagueEntry", "XpLedger", "CoinLedger", "RewardPurchase"],
    readModels: ["LeagueSeason", "LeagueEntry", "EconomyBalance"],
    interactions: ["earn-xp", "open-node", "inspect-reward"],
    journey: "league-xp-reward", tabletDistinct: false,
  },
  {
    id: "route:pk", phase: 4, template: "focused-session", designFiles: ["QuantGym PK.dc.html"],
    components: ["MatchLobby", "TrainingSessionShell", "MatchResult"],
    entityRefs: ["TrainingSession", "Attempt", "RatingHistory", "XpLedger"], readModels: ["PkMatch", "RatingLedger"],
    interactions: ["start", "submit", "reveal", "rematch"],
    journey: "pk-rating-result", tabletDistinct: false,
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
    components: ["ExperienceList", "ExperienceEditor", "SharePanel"],
    entityRefs: ["Experience"], readModels: ["Experience"],
    interactions: ["create", "edit", "share", "delete"],
    journey: "experience-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:news", phase: 5, template: "list-detail", designFiles: ["QuantGym 新闻.dc.html"],
    components: ["NewsFilters", "NewsList", "NewsDetail"],
    entityRefs: ["NewsItem"], readModels: ["NewsItem", "NewsFeed"],
    interactions: ["filter", "open", "refresh", "save"],
    journey: "news-filter-detail", tabletDistinct: false,
  },
  {
    id: "route:community", phase: 5, template: "list-detail", designFiles: ["QuantGym 论坛.dc.html"],
    components: ["PostComposer", "Feed", "CommentThread"],
    entityRefs: ["Post", "Comment", "Conversation", "MediaObject"], readModels: ["Post", "Comment", "MediaObject"],
    interactions: ["post", "like", "comment", "message-author"],
    journey: "community-post-thread", tabletDistinct: false,
  },
  {
    id: "route:messages", phase: 5, template: "list-detail", designFiles: ["QuantGym 聊天.dc.html"],
    components: ["ThreadList", "MessageTimeline", "MessageComposer"],
    entityRefs: ["Conversation", "Message"], readModels: ["Thread", "Message"],
    interactions: ["open-thread", "send", "mark-read", "reconnect"],
    journey: "messages-send-reconnect", tabletDistinct: true,
  },
  {
    id: "route:network", phase: 5, template: "list-detail", designFiles: ["QuantGym 人脉.dc.html"],
    components: ["ContactList", "ContactEditor", "FollowUpPanel"],
    entityRefs: ["NetworkContact"], readModels: ["Contact"],
    interactions: ["create", "edit", "schedule-follow-up", "delete"],
    journey: "network-contact-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:resume", phase: 5, template: "settings-form", designFiles: ["QuantGym 简历.dc.html"],
    components: ["ResumeEditor", "FileUpload", "AiReviewPanel"],
    entityRefs: ["ResumeDocument", "ResumeReview", "Attachment", "AiJob"],
    readModels: ["ResumeProfile", "AiJob", "MediaObject"],
    interactions: ["save", "upload", "request-review", "retry"],
    journey: "resume-review-job", tabletDistinct: false,
  },
  {
    id: "route:jobs", phase: 5, template: "workflow-board", designFiles: ["QuantGym 求职.dc.html"],
    components: ["JobFilters", "JobList", "ApplicationBoard"],
    entityRefs: ["JobPosting", "JobApplication"], readModels: ["Job", "Application"],
    interactions: ["filter", "save", "move-application", "open-source"],
    journey: "job-application-board", tabletDistinct: false,
  },
  {
    id: "route:companies", phase: 5, template: "list-detail", designFiles: ["QuantGym 公司.dc.html"],
    components: ["CompanyFilters", "CompanyList", "CompanyDetail"],
    entityRefs: ["CompanyProfile", "Problem"], readModels: ["Company"],
    interactions: ["filter", "open", "start-practice"],
    journey: "company-practice-handoff", tabletDistinct: false,
  },
  {
    id: "route:library", phase: 5, template: "list-detail", designFiles: ["QuantGym 资料库.dc.html"],
    components: ["LibraryFilters", "ResourceGrid", "Reader"],
    entityRefs: ["LibraryResource", "ProblemProgress"], readModels: ["LibraryItem", "ReaderToken", "Progress"],
    interactions: ["search", "open-reader", "resume-reading", "practice"],
    journey: "library-reader-progress", tabletDistinct: true,
  },
  {
    id: "route:courses", phase: 5, template: "dashboard", designFiles: ["QuantGym 课程.dc.html"],
    components: ["LearningPath", "CourseList", "LessonProgress"],
    entityRefs: ["Course", "CourseProgress"], readModels: ["Course", "LearningPath", "CourseProgress"],
    interactions: ["choose-path", "open-course", "complete-lesson"],
    journey: "course-progress", tabletDistinct: false,
  },
  {
    id: "route:memory", phase: 5, template: "list-detail", designFiles: ["QuantGym 资料笔记.dc.html"],
    components: ["ResourceList", "ResourceEditor", "MediaUpload"],
    entityRefs: ["MemoryResource", "MediaObject", "Note"], readModels: ["ResourceNote", "MediaObject"],
    interactions: ["create", "attach", "edit", "delete"],
    journey: "memory-resource-lifecycle", tabletDistinct: false,
  },
  {
    id: "route:settings", phase: 5, template: "settings-form", designFiles: ["QuantGym 设置.dc.html"],
    components: ["PreferenceForm", "DataControls", "RuntimeStatusPanel"],
    entityRefs: ["Preference", "AuditEvent"], readModels: ["Preferences", "RuntimeStatus", "ExportJob"],
    interactions: ["save", "export", "import", "reset"],
    journey: "settings-data-controls", tabletDistinct: false,
  },
  {
    id: "route:account", phase: 5, template: "settings-form", designFiles: ["QuantGym 账户.dc.html"],
    components: ["ProfileForm", "AvatarUpload", "SessionList"],
    entityRefs: ["User", "Session", "MediaObject"], readModels: ["Me", "Session", "MediaObject"],
    interactions: ["save-profile", "upload-avatar", "revoke-session"],
    journey: "account-session-security", tabletDistinct: false,
  },
];

const independentMutationIdsBySurface = {
  "system:auth": ["auth.sign-in", "auth.register", "auth.reset-password", "auth.google-sign-in"],
  "system:notifications-toast": ["notifications.mark-read"],
  "system:todo": ["todo.create", "todo.update", "todo.complete", "todo.delete"],
  "system:theme-language": ["preferences.update-theme", "preferences.update-language"],
  "system:network-recovery": ["session.retry"],
  "route:overview": ["training.start-or-resume"],
  "route:plan": ["plan.run-diagnostic", "plan.create", "plan.update-task", "plan.complete-task"],
  "route:problems": [
    "problems.use-hint", "problems.submit-attempt", "problems.reveal-solution",
    "problems.save-note", "problems.toggle-favorite", "problems.complete",
  ],
  "route:interview": [
    "interview.create-session", "interview.upload-attachment", "interview.autosave",
    "interview.submit-turn", "interview.finish", "interview.add-recommendations-to-plan",
  ],
  "route:tools": ["tools.submit-answer", "tools.submit-quote", "tools.finish-session"],
  "route:league": ["league.purchase-reward"],
  "route:pk": ["pk.create-match", "pk.submit-attempt", "pk.finish-match"],
  "route:poker": ["poker.join", "poker.act", "poker.finish-hand", "poker.leave"],
  "route:experiences": ["experiences.create", "experiences.update", "experiences.share", "experiences.delete"],
  "route:news": ["news.refresh", "news.save"],
  "route:community": ["community.create-post", "community.like", "community.comment", "community.message-author"],
  "route:messages": ["messages.send", "messages.mark-read"],
  "route:network": ["network.create", "network.update", "network.schedule-follow-up", "network.delete"],
  "route:resume": ["resume.save", "resume.upload", "resume.request-review", "resume.retry-review"],
  "route:jobs": ["jobs.save", "jobs.move-application"],
  "route:courses": ["courses.complete-lesson"],
  "route:memory": ["memory.create", "memory.attach", "memory.update", "memory.delete"],
  "route:settings": ["settings.save", "settings.export", "settings.import", "settings.reset"],
  "route:account": ["account.save-profile", "account.upload-avatar", "account.revoke-session"],
};

const independentRewardProducingMutations = new Set([
  "problems.complete",
  "interview.finish",
  "tools.finish-session",
  "pk.finish-match",
  "poker.finish-hand",
]);

const independentLedgerMutations = new Set([
  ...independentRewardProducingMutations,
  "league.purchase-reward",
]);

const independentRecoveryStates = [
  "recoverable-error",
  "non-recoverable-error",
  "offline-draft",
  "permission-denied",
  "stale-version-conflict",
  "retry",
];

const independentPhaseBySurface = Object.fromEntries(
  independentSurfaceRows.map((row) => [row.id, row.phase]),
);

const independentMutationInventory = Object.entries(independentMutationIdsBySurface)
  .flatMap(([surfaceId, mutationIds]) => mutationIds.map((id) => ({
    id,
    surfaceId,
    targetPhase: independentPhaseBySurface[surfaceId],
    rewardProducing: independentRewardProducingMutations.has(id),
    ledgerMutation: independentLedgerMutations.has(id),
  })));

const independentMutationById = new Map(
  independentMutationInventory.map((mutation) => [mutation.id, mutation]),
);

const independentRecoveryAcceptance = (mutationIds) => ({
  source: "approved-mutation-inventory",
  stateSetRef: "design-system.routeRecoveryStates",
  mutations: Object.fromEntries(mutationIds.map((mutationId) => {
    const mutation = independentMutationById.get(mutationId);
    return [mutationId, {
      states: Object.fromEntries(
        independentRecoveryStates.map((state) => [state, `mutation:${mutationId}:${state}`]),
      ),
      ...((mutation.rewardProducing || mutation.ledgerMutation)
        ? { retryIdempotency: `mutation:${mutationId}:retry-idempotency` }
        : {}),
    }];
  })),
});

const independentMotionProfile = (surfaceId) => {
  if (["route:interview", "route:tools"].includes(surfaceId)) return "session-feedback";
  if (["route:skills", "route:league", "route:pk", "route:poker"].includes(surfaceId)) return "reward-feedback";
  return "panel-and-micro";
};

const independentSurfaces = independentSurfaceRows.map((row) => {
  const slug = row.id.split(":")[1];
  const mutationIds = independentMutationIdsBySurface[row.id] || [];
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
      profile: independentMotionProfile(row.id),
      reducedMotion: true,
      blocksPrimaryAction: false,
    },
    recoveryAcceptance: independentRecoveryAcceptance(mutationIds),
    deviations: [],
  };
});

const independentSurfaceContract = {
  version: 1,
  spec: "docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md",
  designSystem: "docs/frontend-upgrade/design-system-contract.json",
  supportingSources: independentSupportingSources,
  surfaces: independentSurfaces,
};

const designManifest = JSON.parse(
  await readFile(
    new URL("../docs/ui-reference/playful-precision/source-manifest.json", import.meta.url),
    "utf8",
  ),
);

const manifestIds = MODULE_MANIFEST.map((item) => item.id);

const independentCoreFlowInteractions = {
  overview: "overview CTA opens problems",
  plan: "plan create, edit, task persistence, and navigation",
  problems: "problems search, detail, reveal, and save",
  interview: "interview onboarding, practice answer, favorite, exit, and resume",
  tools: "tools mental math completes session and persists records",
  skills: "skills radar hover and global search spotlight",
  league: "league standings, learning map, and reward shop guard",
  pk: "pk match, submit, reveal, and record persistence",
  poker: "poker demo table starts, acts, and persists room state",
  experiences: "experiences create, edit, share, delete, and reload persistence",
  news: "news manual submit, filter, detail, and reload persistence",
  community: "community post, like, comment, and reload persistence",
  messages: "messages thread read, send, and reload persistence",
  network: "network contact add, edit, delete, and reload persistence",
  resume: "resume LLM review request, render, and reload persistence",
  jobs: "jobs filter and apply link behavior",
  companies: "companies tier filter, practice navigation, and careers link behavior",
  library: "library search, kind filter, practice navigation, and reader guard",
  courses: "courses path, source switch, note, and reload persistence",
  memory: "memory resource add, source link, and reload persistence",
  settings: "settings backup export, import, and reset state",
  account: "account profile save and reload persistence",
};

const independentSharedStatesBySurface = {
  "system:auth": ["registration-error", "password-reset", "keyboard-focus", "reduced-motion"],
  "system:desktop-shell": ["collapsed-light", "expanded-dark", "keyboard-focus", "reduced-motion"],
  "system:mobile-shell": ["drawer-open-light", "drawer-open-dark", "keyboard-focus", "reduced-motion"],
  "system:global-search": ["results-open", "keyboard-focus", "empty", "reduced-motion"],
  "system:notifications-toast": ["center-open", "live-toast", "empty", "reduced-motion"],
  "system:todo": ["dock-open", "editor-focus", "empty-mobile", "reduced-motion-mobile"],
  "system:theme-language": ["theme-focus", "language-focus", "mobile-controls", "reduced-motion-mobile"],
  "system:network-recovery": ["offline-draft", "recoverable-error", "stale-conflict", "permission-denied-retry"],
};

const independentFutureSharedStateIds = [
  "shared-state:notifications-toast:center-open",
  "shared-state:notifications-toast:empty",
  "shared-state:network-recovery:offline-draft",
  "shared-state:network-recovery:recoverable-error",
  "shared-state:network-recovery:stale-conflict",
  "shared-state:network-recovery:permission-denied-retry",
];

const independentSharedEvidenceRecords = Object.entries(independentSharedStatesBySurface)
  .flatMap(([surfaceId, states]) => {
    const surface = independentSurfaces.find((item) => item.id === surfaceId);
    return states.map((state) => {
      const id = `shared-state:${surfaceId.split(":")[1]}:${state}`;
      const future = independentFutureSharedStateIds.includes(id);
      return {
        id,
        surfaceId,
        state,
        acceptanceIds: future ? [surface.acceptanceChecks[2]] : surface.acceptanceChecks.slice(0, 2),
        source: "docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json",
        expectedStatus: future ? "future-gate" : "legacy-baseline",
        targetPhase: future ? 1 : 0,
        ...(future ? { targetCommand: `npm run test:e2e:v2 -- --grep @${id}` } : {}),
      };
    });
  });

const cloneSurfaceContract = () => structuredClone(independentSurfaceContract);

const surfaceById = (contract, surfaceId) => (
  contract.surfaces.find((surface) => surface.id === surfaceId)
);

const assertFailureIncludes = (contract, expectedText, registry = independentPhaseRegistry) => {
  const failures = validateSurfaceContracts(contract, registry, designManifest, manifestIds);
  assert.ok(
    failures.some((failure) => failure.includes(expectedText)),
    `expected a diagnostic containing ${JSON.stringify(expectedText)}; got ${failures.join(" | ")}`,
  );
};

test("validates all 22 routes and eight system surfaces against independent fixtures", () => {
  const routeSurfaces = independentSurfaceContract.surfaces.filter((item) => item.kind === "route");
  const systemSurfaces = independentSurfaceContract.surfaces.filter((item) => item.kind === "system");

  assert.equal(routeSurfaces.length, 22);
  assert.equal(systemSurfaces.length, 8);
  assert.equal(new Set(routeSurfaces.map((item) => item.routeId)).size, 22);
  assert.deepEqual(
    validateSurfaceContracts(independentSurfaceContract, independentPhaseRegistry, designManifest, manifestIds),
    [],
  );
});

test("freezes the complete 74-entry mutation inventory and every reward or ledger flag", () => {
  assert.equal(independentMutationInventory.length, 74);
  assert.deepEqual(APPROVED_MUTATION_INVENTORY, independentMutationInventory);
  assert.equal(APPROVED_MUTATION_INVENTORY.filter((item) => item.rewardProducing).length, 5);
  assert.equal(APPROVED_MUTATION_INVENTORY.filter((item) => item.ledgerMutation).length, 6);
});

test("rejects duplicate routes and surfaces", () => {
  const invalid = cloneSurfaceContract();
  invalid.surfaces.push(structuredClone(surfaceById(invalid, "route:overview")));

  assertFailureIncludes(invalid, "duplicate surface id route:overview");
  assertFailureIncludes(invalid, "duplicate route id overview");
});

test("rejects a missing League route", () => {
  const invalid = cloneSurfaceContract();
  invalid.surfaces = invalid.surfaces.filter((surface) => surface.id !== "route:league");

  assertFailureIncludes(invalid, "route IDs mismatch");
  assertFailureIncludes(invalid, "route:league");
});

test("rejects a missing design source", () => {
  const invalid = cloneSurfaceContract();
  surfaceById(invalid, "route:overview").designFiles[0] = "QuantGym 不存在.dc.html";

  assertFailureIncludes(invalid, "route:overview designFiles");
  assertFailureIncludes(invalid, "missing design source QuantGym 不存在.dc.html");
});

test("rejects a route assigned to the wrong phase", () => {
  const invalid = cloneSurfaceContract();
  surfaceById(invalid, "route:overview").phase = 3;

  assertFailureIncludes(invalid, "route:overview phase");
});

test("rejects a missing required system surface", () => {
  const invalid = cloneSurfaceContract();
  invalid.surfaces = invalid.surfaces.filter((surface) => surface.id !== "system:todo");

  assertFailureIncludes(invalid, "missing required system surface system:todo");
});

test("rejects an empty acceptance array", () => {
  const invalid = cloneSurfaceContract();
  surfaceById(invalid, "route:overview").acceptanceChecks = [];

  assertFailureIncludes(invalid, "route:overview acceptanceChecks");
});

const canonicalSurfaceFieldMutations = [
  ["components", (surface) => { surface.components[0] = "AlternateOverviewHero"; }],
  ["entityRefs", (surface) => { surface.entityRefs[0] = "PresentationOnlyUser"; }],
  ["readModels", (surface) => { surface.readModels[0] = "AlternateMe"; }],
  ["interactions", (surface) => { surface.interactions[0] = "alternate-resume"; }],
  ["phase", (surface) => { surface.phase = 3; }],
  ["template", (surface) => { surface.template = "list-detail"; }],
  ["responsive.tabletDistinct", (surface) => { surface.responsive.tabletDistinct = true; }],
  ["stateSetRef", (surface) => { surface.stateSetRef = "design-system.alternateStates"; }],
  ["motion.profile", (surface) => { surface.motion.profile = "session-feedback"; }],
  ["acceptanceChecks", (surface) => { surface.acceptanceChecks[2] = "e2e:alternate-overview-journey"; }],
];

for (const [field, mutate] of canonicalSurfaceFieldMutations) {
  test(`reports a field-specific failure for a one-field ${field} mutation`, () => {
    const invalid = cloneSurfaceContract();
    mutate(surfaceById(invalid, "route:overview"));

    assertFailureIncludes(invalid, `route:overview ${field}`);
  });
}

const unapprovedSurfaceSemanticMutations = [
  ["unapprovedPolicy", (surface) => { surface.unapprovedPolicy = "silent-extension"; }],
  ["responsive.unapprovedViewport", (surface) => { surface.responsive.unapprovedViewport = "watch"; }],
  ["motion.unapprovedAnimation", (surface) => { surface.motion.unapprovedAnimation = "bounce"; }],
];

for (const [field, mutate] of unapprovedSurfaceSemanticMutations) {
  test(`rejects unapproved extra canonical semantics at ${field}`, () => {
    const invalid = cloneSurfaceContract();
    mutate(surfaceById(invalid, "route:overview"));

    assertFailureIncludes(invalid, `route:overview ${field} is not approved`);
  });
}

test("requires each acceptance category exactly once", () => {
  const invalid = cloneSurfaceContract();
  const overview = surfaceById(invalid, "route:overview");
  overview.acceptanceChecks[1] = "visual:overview:mobile";

  assertFailureIncludes(invalid, "route:overview acceptanceChecks a11y category");
});

test("requires explicit approved responsive and motion safety settings", () => {
  const missingResponsive = cloneSurfaceContract();
  delete surfaceById(missingResponsive, "route:overview").responsive;
  assertFailureIncludes(missingResponsive, "route:overview responsive");

  const reducedMotion = cloneSurfaceContract();
  surfaceById(reducedMotion, "route:overview").motion.reducedMotion = false;
  assertFailureIncludes(reducedMotion, "route:overview motion.reducedMotion");

  const blockedAction = cloneSurfaceContract();
  surfaceById(blockedAction, "route:overview").motion.blocksPrimaryAction = true;
  assertFailureIncludes(blockedAction, "route:overview motion.blocksPrimaryAction");

  const unauthorizedTablet = cloneSurfaceContract();
  const overview = surfaceById(unauthorizedTablet, "route:overview");
  overview.responsive.tabletDistinct = true;
  overview.responsive.requiredViewports.push("tablet");
  assertFailureIncludes(unauthorizedTablet, "route:overview responsive.tabletDistinct");
});

test("requires the approved recovery and AI-job state mappings", () => {
  const missingRecovery = cloneSurfaceContract();
  delete surfaceById(missingRecovery, "route:overview").recoveryStateSetRef;
  assertFailureIncludes(missingRecovery, "route:overview recoveryStateSetRef");

  const missingAiJobs = cloneSurfaceContract();
  delete surfaceById(missingAiJobs, "route:interview").aiJobStateSetRef;
  assertFailureIncludes(missingAiJobs, "route:interview aiJobStateSetRef");

  const unexpectedAiJobs = cloneSurfaceContract();
  surfaceById(unexpectedAiJobs, "route:overview").aiJobStateSetRef = "design-system.aiJobStates";
  assertFailureIncludes(unexpectedAiJobs, "route:overview aiJobStateSetRef");
});

test("rejects presentation names in entityRefs", () => {
  const invalid = cloneSurfaceContract();
  surfaceById(invalid, "route:overview").entityRefs[0] = "DailyPlan";

  assertFailureIncludes(invalid, "route:overview entityRefs contains non-core entity DailyPlan");
});

test("requires exact mutation IDs and recovery or idempotency mappings", () => {
  const missingMutation = cloneSurfaceContract();
  surfaceById(missingMutation, "route:problems").mutations.pop();
  assertFailureIncludes(missingMutation, "route:problems mutations");

  const missingRecoveryState = cloneSurfaceContract();
  delete surfaceById(missingRecoveryState, "route:problems")
    .recoveryAcceptance.mutations["problems.complete"].states.retry;
  assertFailureIncludes(missingRecoveryState, "route:problems recoveryAcceptance");

  const missingIdempotency = cloneSurfaceContract();
  delete surfaceById(missingIdempotency, "route:league")
    .recoveryAcceptance.mutations["league.purchase-reward"].retryIdempotency;
  assertFailureIncludes(missingIdempotency, "route:league recoveryAcceptance");
});

test("accounts for all 30 extracted source files exactly once by role", () => {
  const duplicateSupporting = cloneSurfaceContract();
  duplicateSupporting.supportingSources.push(structuredClone(duplicateSupporting.supportingSources[0]));
  assertFailureIncludes(duplicateSupporting, "duplicate supporting source");

  const overlap = cloneSurfaceContract();
  overlap.supportingSources[0].file = "QuantGym 总览.dc.html";
  assertFailureIncludes(overlap, "used as both supporting and surface design source");

  const omitted = cloneSurfaceContract();
  omitted.supportingSources.pop();
  assertFailureIncludes(omitted, "extracted source coverage mismatch");
});

test("requires complete, approved deviation records", () => {
  const invalidReason = cloneSurfaceContract();
  surfaceById(invalidReason, "route:overview").deviations.push({
    reason: "personal-preference",
    designFile: "QuantGym 总览.dc.html",
    decision: "Use a denser table.",
    acceptanceCheck: "visual:overview:density",
  });
  assertFailureIncludes(invalidReason, "route:overview deviations[0].reason");

  for (const field of ["designFile", "decision", "acceptanceCheck"]) {
    const invalid = cloneSurfaceContract();
    const deviation = {
      reason: "real-data-density",
      designFile: "QuantGym 总览.dc.html",
      decision: "Use a denser table.",
      acceptanceCheck: "visual:overview:density",
    };
    delete deviation[field];
    surfaceById(invalid, "route:overview").deviations.push(deviation);
    assertFailureIncludes(invalid, `route:overview deviations[0].${field}`);
  }
});

test("rejects a phase registry route omission or duplication", () => {
  const omitted = structuredClone(independentPhaseRegistry);
  omitted.phases.find((phase) => phase.id === 4).routes = ["skills", "pk", "poker"];
  assertFailureIncludes(cloneSurfaceContract(), "phase registry route IDs mismatch", omitted);

  const duplicated = structuredClone(independentPhaseRegistry);
  duplicated.phases.find((phase) => phase.id === 3).routes.push("overview");
  assertFailureIncludes(cloneSurfaceContract(), "route overview must appear in exactly one phase", duplicated);
});

const independentCatalogPolicyEntries = [
  ...independentSurfaces.flatMap((surface) => surface.acceptanceChecks.map((id, index) => {
    const isNetworkRecovery = surface.id === "system:network-recovery";
    const isSystemJourney = surface.kind === "system" && index === 2;
    const expectedStatus = (isNetworkRecovery || isSystemJourney) ? "future-gate" : "legacy-baseline";
    return {
      id,
      surfaceId: surface.id,
      kind: index === 0 ? "visual" : (index === 1 ? "axe" : "journey"),
      expectedStatus,
      targetPhase: expectedStatus === "legacy-baseline" ? 0 : surface.phase,
    };
  })),
  ...independentMutationInventory.flatMap((mutation) => [
    ...independentRecoveryStates.map((state) => ({
      id: `mutation:${mutation.id}:${state}`,
      surfaceId: mutation.surfaceId,
      kind: "mutation-recovery",
      expectedStatus: "future-gate",
      targetPhase: mutation.targetPhase,
    })),
    ...((mutation.rewardProducing || mutation.ledgerMutation) ? [{
      id: `mutation:${mutation.id}:retry-idempotency`,
      surfaceId: mutation.surfaceId,
      kind: "retry-idempotency",
      expectedStatus: "future-gate",
      targetPhase: mutation.targetPhase,
    }] : []),
  ]),
];

test("freezes exactly 540 aggregate catalog policy entries without case-level IDs", () => {
  assert.equal(independentCatalogPolicyEntries.length, 540);
  assert.deepEqual(APPROVED_ACCEPTANCE_POLICY.catalogEntries, independentCatalogPolicyEntries);
  assert.equal(new Set(APPROVED_ACCEPTANCE_POLICY.catalogEntries.map((item) => item.id)).size, 540);
  assert.equal(APPROVED_ACCEPTANCE_POLICY.catalogEntries.filter((item) => item.expectedStatus === "legacy-baseline").length, 80);
  assert.equal(APPROVED_ACCEPTANCE_POLICY.catalogEntries.filter((item) => item.expectedStatus === "future-gate").length, 460);
});

test("freezes the 150-case route matrix rule", () => {
  assert.deepEqual(APPROVED_ACCEPTANCE_POLICY.evidenceCases.routeMatrix, {
    id: "route-visual-a11y-matrix",
    source: "docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json",
    expectedStatus: "legacy-baseline",
    targetPhase: 0,
    surfaceIds: ["system:auth", ...manifestIds.map((id) => `route:${id}`)],
    themes: ["light", "dark"],
    baseViewports: ["desktop", "laptop", "mobile"],
    tabletDistinctRouteIds: ["plan", "problems", "interview", "poker", "messages", "library"],
    caseCount: 150,
  });
});

test("freezes 32 shared-state evidence cases with exactly six Phase 1 future gates", () => {
  const sharedStates = APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates;
  assert.deepEqual(sharedStates, independentSharedEvidenceRecords);
  assert.equal(sharedStates.length, 32);
  assert.equal(new Set(sharedStates.map((item) => item.id)).size, 32);
  assert.deepEqual(
    sharedStates.map((item) => item.id),
    Object.entries(independentSharedStatesBySurface).flatMap(([surfaceId, states]) => (
      states.map((state) => `shared-state:${surfaceId.split(":")[1]}:${state}`)
    )),
  );
  assert.equal(sharedStates.filter((item) => item.expectedStatus === "legacy-baseline").length, 26);
  assert.deepEqual(
    sharedStates
      .filter((item) => item.expectedStatus === "future-gate")
      .map((item) => item.id),
    independentFutureSharedStateIds,
  );
  assert.ok(sharedStates.filter((item) => item.expectedStatus === "legacy-baseline").every((item) => item.targetPhase === 0));
  assert.ok(sharedStates.filter((item) => item.expectedStatus === "future-gate").every((item) => item.targetPhase === 1));
});

const sharedEvidenceFieldMutations = [
  ["surfaceId", (records) => { records[0].surfaceId = "system:desktop-shell"; }],
  ["state", (records) => { records[0].state = "substituted-registration-state"; }],
  ["acceptanceIds", (records) => { records[0].acceptanceIds = ["visual:substituted", "a11y:substituted"]; }],
  ["source", (records) => { records[0].source = "docs/browser-audit-screenshots/substituted-summary.json"; }],
  ["targetCommand", (records) => {
    records.find((item) => item.expectedStatus === "future-gate").targetCommand = "npm run substituted-future-gate";
  }],
];

for (const [field, mutate] of sharedEvidenceFieldMutations) {
  test(`rejects a same-count shared-evidence ${field} substitution`, () => {
    const invalid = structuredClone(APPROVED_ACCEPTANCE_POLICY);
    mutate(invalid.evidenceCases.sharedStates);

    const failures = validateApprovedAcceptancePolicy(invalid);
    assert.ok(
      failures.some((item) => item.includes(`shared-state evidence ${field} mismatch`)),
      `expected a ${field} mismatch; got ${failures.join(" | ")}`,
    );
  });
}

test("freezes exact Phase 0 core-flow interactions and result locators for all 22 routes", () => {
  const coreFlows = APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows;
  assert.equal(coreFlows.length, 22);
  assert.deepEqual(
    coreFlows.map(({ routeId, interactionName }) => [routeId, interactionName]),
    Object.entries(independentCoreFlowInteractions),
  );
  for (const coreFlow of coreFlows) {
    const surface = independentSurfaces.find((item) => item.id === `route:${coreFlow.routeId}`);
    assert.equal(coreFlow.id, `core-flow:${coreFlow.routeId}`);
    assert.equal(coreFlow.surfaceId, surface.id);
    assert.equal(coreFlow.acceptanceId, surface.acceptanceChecks[2]);
    assert.equal(coreFlow.source, "docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json");
    assert.equal(coreFlow.expectedStatus, "legacy-baseline");
    assert.equal(coreFlow.targetPhase, 0);
    assert.equal(coreFlow.resultLocator, `interactions.results[name=${JSON.stringify(coreFlow.interactionName)}]`);
  }
});

test("builds and validates a deterministic catalog with exact status policy", () => {
  const first = buildAcceptanceCatalog(independentSurfaceContract);
  const second = buildAcceptanceCatalog(structuredClone(independentSurfaceContract));

  assert.deepEqual(first, second);
  assert.equal(first.version, 1);
  assert.equal(first.entries.length, 540);
  assert.equal(new Set(first.entries.map((item) => item.id)).size, 540);
  assert.deepEqual(validateAcceptanceCatalog(first, independentSurfaceContract), []);
  assert.equal(first.entries.filter((item) => item.expectedStatus === "legacy-baseline").length, 80);
  assert.equal(first.entries.filter((item) => item.expectedStatus === "future-gate").length, 460);
  assert.ok(first.entries.every((item) => Object.hasOwn(item, "phase0Evidence")));
  assert.ok(first.entries.every((item) => typeof item.targetCommand === "string" && item.targetCommand.length > 0));
  assert.ok(first.entries
    .filter((item) => item.expectedStatus === "future-gate")
    .every((item) => item.targetCommand === `npm run test:e2e:v2 -- --grep @${item.id}`));
  assert.ok(first.entries
    .filter((item) => item.expectedStatus === "legacy-baseline")
    .every((item) => item.phase0Evidence !== null));
});

test("returns field-specific catalog diagnostics for noncanonical surface acceptance IDs", () => {
  const invalidContract = cloneSurfaceContract();
  surfaceById(invalidContract, "route:overview").acceptanceChecks[2] = "e2e:substituted-overview-journey";
  const catalog = buildAcceptanceCatalog(independentSurfaceContract);
  let failures;

  assert.doesNotThrow(() => {
    failures = validateAcceptanceCatalog(catalog, invalidContract);
  });
  assert.ok(failures.some((item) => item.includes("route:overview acceptanceChecks")));
  assert.ok(failures.some((item) => item.includes("e2e:substituted-overview-journey")));
});

test("checker aggregates invalid surface acceptance and catalog diagnostics without crashing", async () => {
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-contract-checker-"));
  const invalidContract = cloneSurfaceContract();
  surfaceById(invalidContract, "route:overview").acceptanceChecks[2] = "e2e:substituted-overview-journey";
  const invalidCatalog = buildAcceptanceCatalog(independentSurfaceContract);
  invalidCatalog.entries[0].targetPhase = 9;
  const writeJson = async (relativePath, value) => {
    const target = path.join(fixtureRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  };

  try {
    await Promise.all([
      writeJson("docs/frontend-upgrade/design-system-contract.json", validDesignSystem),
      writeJson("docs/frontend-upgrade/phase-registry.json", independentPhaseRegistry),
      writeJson("docs/frontend-upgrade/surface-contracts.json", invalidContract),
      writeJson("docs/frontend-upgrade/acceptance-catalog.json", invalidCatalog),
      writeJson("docs/ui-reference/playful-precision/source-manifest.json", designManifest),
    ]);
    const result = spawnSync(
      process.execPath,
      ["scripts/check-frontend-upgrade-contracts.mjs", "--root", fixtureRoot],
      { cwd: repositoryRoot, encoding: "utf8" },
    );

    assert.equal(result.status, 1, `checker output:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /FAIL: route:overview acceptanceChecks/);
    assert.match(result.stderr, /FAIL: visual:auth:light-dark targetPhase mismatch/);
    assert.match(result.stderr, /FAIL: .*e2e:substituted-overview-journey/);
    assert.doesNotMatch(result.stderr, /Cannot build acceptance catalog/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("prevents evidence-backed acceptance downgrade", () => {
  const invalid = buildAcceptanceCatalog(independentSurfaceContract);
  const entry = invalid.entries.find((item) => item.expectedStatus === "legacy-baseline");
  entry.expectedStatus = "future-gate";
  entry.targetPhase = 2;
  entry.phase0Evidence = null;

  const failures = validateAcceptanceCatalog(invalid, independentSurfaceContract);
  assert.ok(failures.some((item) => item.includes(`${entry.id} expectedStatus`)));
});

test("prevents future-gate target phase changes", () => {
  const invalid = buildAcceptanceCatalog(independentSurfaceContract);
  const entry = invalid.entries.find((item) => item.id === "mutation:problems.complete:retry-idempotency");
  entry.targetPhase += 1;

  const failures = validateAcceptanceCatalog(invalid, independentSurfaceContract);
  assert.ok(failures.some((item) => item.includes(`${entry.id} targetPhase`)));
});

test("rejects missing, duplicate, and orphan catalog entries", () => {
  const missing = buildAcceptanceCatalog(independentSurfaceContract);
  const removed = missing.entries.pop();
  assert.ok(validateAcceptanceCatalog(missing, independentSurfaceContract)
    .some((item) => item.includes(`missing acceptance catalog entry ${removed.id}`)));

  const duplicate = buildAcceptanceCatalog(independentSurfaceContract);
  duplicate.entries.push(structuredClone(duplicate.entries[0]));
  assert.ok(validateAcceptanceCatalog(duplicate, independentSurfaceContract)
    .some((item) => item.includes(`duplicate acceptance catalog id ${duplicate.entries[0].id}`)));

  const orphan = buildAcceptanceCatalog(independentSurfaceContract);
  orphan.entries.push({
    id: "e2e:orphan",
    surfaceId: "route:overview",
    kind: "journey",
    phase0Evidence: null,
    targetPhase: 2,
    targetCommand: "npm run test:e2e:v2 -- --grep @e2e:orphan",
    expectedStatus: "future-gate",
  });
  assert.ok(validateAcceptanceCatalog(orphan, independentSurfaceContract)
    .some((item) => item.includes("orphan acceptance catalog entry e2e:orphan")));
});
