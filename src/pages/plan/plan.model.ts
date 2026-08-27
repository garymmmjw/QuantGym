import type {
  CreatePlanRequest,
  OfficialPlan,
  OfficialPlanTask,
  Recommendation,
} from "../../domains/plan/plan.schema";
import type { AppLanguage } from "../../shared/i18n";

type PlanActionTarget = NonNullable<OfficialPlanTask["actionTarget"]>;

export type PlanTaskNavigationTarget = Exclude<PlanActionTarget, "custom">;

export const planRoleValues = [
  "quantTrading",
  "quantResearch",
  "quantDeveloper",
] as const;
export type PlanRole = (typeof planRoleValues)[number];

export const planSeasonValues = [
  "2026-summer",
  "2027-summer",
  "2028-summer",
] as const;
export type PlanSeason = (typeof planSeasonValues)[number];

export const creatablePlanSeasons = [
  "2027-summer",
  "2028-summer",
] as const satisfies readonly PlanSeason[];
export type CreatablePlanSeason = (typeof creatablePlanSeasons)[number];

export type PlanTaskNavigation = Readonly<{
  label: string;
  route: string;
  target: PlanTaskNavigationTarget;
}>;

export type PlanTaskActionModel = Readonly<{
  canComplete: boolean;
  navigation: PlanTaskNavigation | null;
  training: Readonly<{
    label: string;
    problemId: string;
  }> | null;
}>;

export type PlanDisplayModel = Readonly<{
  completedTasks: readonly OfficialPlanTask[];
  diagnosticScore: string;
  openTasks: readonly OfficialPlanTask[];
  progressLabel: string;
  progressPercentage: number;
  subtitle: string;
  title: string;
}>;

export type PlanCopy = Readonly<{
  baseline: string;
  baselineCancel: string;
  baselineCompletedDescription: string;
  baselineCompletedTitle: string;
  baselinePendingDescription: string;
  baselinePendingTitle: string;
  baselineRetake: string;
  baselineSkippedDescription: string;
  baselineSkippedTitle: string;
  baselineStart: string;
  baselineSubmit: string;
  baselineSubmitting: string;
  completeTask: string;
  completingTask: string;
  createPlan: string;
  creatingPlan: string;
  diagnosticOverallScore: string;
  diagnosticProgress: (answered: number, total: number) => string;
  editTask: string;
  editingTask: string;
  estimatedMinutes: (minutes: number) => string;
  openingTaskTarget: string;
  planSetupDescription: string;
  planSetupTitle: string;
  roleLabel: string;
  scheduledFor: (date: string) => string;
  scheduledTaskLabel: string;
  seasonLabel: string;
  skillLabel: string;
  statusCompleted: string;
  statusOpen: string;
  startingTraining: string;
  taskDurationLabel: string;
  trackFulltime: string;
  trackInternship: string;
  trackLabel: string;
  weeklyHoursLabel: string;
  weeklyHoursOption: (hours: CreatePlanRequest["weeklyHours"]) => string;
}>;

const zhCNCopy: PlanCopy = {
  baseline: "Baseline 能力诊断",
  baselineCancel: "暂不作答",
  baselineCompletedDescription: "分数来自最近一次已确认的诊断结果。",
  baselineCompletedTitle: "能力诊断已完成",
  baselinePendingDescription: "完成 8 道基础题，训练计划会据此生成真实建议。",
  baselinePendingTitle: "先建立能力基线",
  baselineRetake: "重新测评",
  baselineSkippedDescription: "当前计划尚无诊断结果；开始后需完成全部 8 题再提交。",
  baselineSkippedTitle: "当前已跳过能力诊断",
  baselineStart: "开始 Baseline",
  baselineSubmit: "提交诊断",
  baselineSubmitting: "正在提交诊断",
  completeTask: "标记完成",
  completingTask: "正在确认完成",
  createPlan: "创建训练计划",
  creatingPlan: "正在创建计划",
  diagnosticOverallScore: "综合得分",
  diagnosticProgress: (answered, total) => `已回答 ${answered} / ${total} 题`,
  editTask: "编辑任务",
  editingTask: "正在保存任务",
  estimatedMinutes: (minutes) => `约 ${minutes} 分钟`,
  openingTaskTarget: "正在打开",
  planSetupDescription: "只设置真实目标与可投入时间，任务将在创建后由服务端生成。",
  planSetupTitle: "建立你的训练节奏",
  roleLabel: "目标岗位",
  scheduledFor: (date) => `安排于 ${date}`,
  scheduledTaskLabel: "计划日期",
  seasonLabel: "目标招聘季",
  skillLabel: "能力方向",
  statusCompleted: "已完成",
  statusOpen: "待完成",
  startingTraining: "正在开始训练",
  taskDurationLabel: "预计用时",
  trackFulltime: "全职求职",
  trackInternship: "实习求职",
  trackLabel: "求职方向",
  weeklyHoursLabel: "每周可投入时间",
  weeklyHoursOption: (hours) => `每周 ${hours} 小时`,
};

const enCopy: PlanCopy = {
  baseline: "Baseline assessment",
  baselineCancel: "Answer later",
  baselineCompletedDescription: "This score comes from your latest confirmed assessment.",
  baselineCompletedTitle: "Baseline completed",
  baselinePendingDescription: "Complete eight foundation questions to generate evidence-based plan recommendations.",
  baselinePendingTitle: "Establish your baseline",
  baselineRetake: "Retake assessment",
  baselineSkippedDescription: "This plan has no assessment result yet. Once started, all eight questions are required.",
  baselineSkippedTitle: "Baseline currently skipped",
  baselineStart: "Start baseline",
  baselineSubmit: "Submit assessment",
  baselineSubmitting: "Submitting assessment",
  completeTask: "Mark complete",
  completingTask: "Confirming completion",
  createPlan: "Create training plan",
  creatingPlan: "Creating plan",
  diagnosticOverallScore: "Overall score",
  diagnosticProgress: (answered, total) => `${answered} of ${total} answered`,
  editTask: "Edit task",
  editingTask: "Saving task",
  estimatedMinutes: (minutes) => `About ${minutes} min`,
  openingTaskTarget: "Opening",
  planSetupDescription: "Set only your real goal and available time. Tasks are generated by the service after creation.",
  planSetupTitle: "Build your training rhythm",
  roleLabel: "Target role",
  scheduledFor: (date) => `Scheduled for ${date}`,
  scheduledTaskLabel: "Scheduled date",
  seasonLabel: "Target season",
  skillLabel: "Skill focus",
  statusCompleted: "Completed",
  statusOpen: "Open",
  startingTraining: "Starting training",
  taskDurationLabel: "Estimated time",
  trackFulltime: "Full-time recruiting",
  trackInternship: "Internship recruiting",
  trackLabel: "Recruiting track",
  weeklyHoursLabel: "Weekly availability",
  weeklyHoursOption: (hours) => `${hours} hours per week`,
};

const navigationRoutes: Readonly<Record<PlanTaskNavigationTarget, string>> = {
  experiences: "/experiences",
  interview: "/interview",
  jobs: "/jobs",
  problems: "/problems",
  resume: "/resume",
  tools: "/tools",
};

const navigationLabels: Readonly<Record<
  AppLanguage,
  Readonly<Record<PlanTaskNavigationTarget, string>>
>> = {
  en: {
    experiences: "Open experiences",
    interview: "Open interview practice",
    jobs: "Open jobs",
    problems: "Browse problems",
    resume: "Open résumé",
    tools: "Open tools",
  },
  "zh-CN": {
    experiences: "打开经历库",
    interview: "打开面试训练",
    jobs: "打开岗位库",
    problems: "浏览题库",
    resume: "打开简历工具",
    tools: "打开训练工具",
  },
};

const planRoleLabels: Readonly<Record<
  PlanRole,
  Readonly<Record<AppLanguage, string>>
>> = {
  quantDeveloper: {
    en: "Quant Developer",
    "zh-CN": "量化开发（Quant Developer）",
  },
  quantResearch: {
    en: "Quant Research",
    "zh-CN": "量化研究（Quant Research）",
  },
  quantTrading: {
    en: "Quant Trading",
    "zh-CN": "量化交易（Quant Trading）",
  },
};

const planSeasonLabels: Readonly<Record<
  PlanSeason,
  Readonly<Record<AppLanguage, string>>
>> = {
  "2026-summer": { en: "2026 Summer", "zh-CN": "2026 暑期" },
  "2027-summer": { en: "2027 Summer", "zh-CN": "2027 暑期" },
  "2028-summer": { en: "2028 Summer", "zh-CN": "2028 暑期" },
};

const isNavigationTarget = (
  target: OfficialPlanTask["actionTarget"],
): target is PlanTaskNavigationTarget => (
  target !== null && target !== "custom"
);

const compareTasks = (left: OfficialPlanTask, right: OfficialPlanTask) => (
  left.sortOrder - right.sortOrder
  || (left.scheduledFor ?? "9999-12-31").localeCompare(
    right.scheduledFor ?? "9999-12-31",
  )
  || left.createdAt.localeCompare(right.createdAt)
  || left.id.localeCompare(right.id)
);

export const planCopyFor = (language: AppLanguage): PlanCopy => (
  language === "en" ? enCopy : zhCNCopy
);

export const isPlanRole = (value: string): value is PlanRole => (
  planRoleValues.some((role) => role === value)
);

export const isPlanSeason = (value: string): value is PlanSeason => (
  planSeasonValues.some((season) => season === value)
);

export const isCreatablePlanSeason = (
  value: string,
): value is CreatablePlanSeason => (
  creatablePlanSeasons.some((season) => season === value)
);

export const planRoleLabel = (
  role: string,
  language: AppLanguage,
): string => isPlanRole(role) ? planRoleLabels[role][language] : role;

export const planSeasonLabel = (
  season: string,
  language: AppLanguage,
): string => isPlanSeason(season) ? planSeasonLabels[season][language] : season;

export const formatDiagnosticScore = (score: number): string => `${score}%`;

export const clampDiagnosticScore = (score: number): number => (
  Math.min(100, Math.max(0, score))
);

export const formatPlanDate = (
  isoDate: string,
  language: AppLanguage,
): string => new Intl.DateTimeFormat(language, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
}).format(new Date(`${isoDate}T00:00:00Z`));

export const planTrackLabel = (
  track: CreatePlanRequest["track"],
  language: AppLanguage,
): string => {
  const copy = planCopyFor(language);
  return track === "internship" ? copy.trackInternship : copy.trackFulltime;
};

export const skillLabelFor = (
  skillKey: string,
  language: AppLanguage,
): string => {
  const knownLabels: Readonly<Record<string, Readonly<Record<AppLanguage, string>>>> = {
    general: { en: "Core skills", "zh-CN": "核心能力" },
    jobs: { en: "Applications", "zh-CN": "求职准备" },
    leetcode: { en: "Algorithms", "zh-CN": "算法" },
    machineLearning: { en: "Machine learning", "zh-CN": "机器学习" },
    market: { en: "Markets", "zh-CN": "市场" },
    mentalMath: { en: "Mental math", "zh-CN": "速算" },
    option: { en: "Options", "zh-CN": "期权" },
    pandasNumpy: { en: "Python & data", "zh-CN": "Python 与数据" },
    probabilityExpectation: { en: "Probability & expectation", "zh-CN": "概率与期望" },
    statistics: { en: "Statistics", "zh-CN": "统计" },
  };
  return knownLabels[skillKey]?.[language] ?? skillKey;
};

const englishServiceContent: Readonly<Record<string, string>> = {
  "OA 速度训练": "Timed OA speed practice",
  "Python 数据训练": "Python data practice",
  "代码边界复盘": "Edge-case code review",
  "完成一组目标岗位相关题目并记录复盘。": "Complete a target-role practice set and record your review.",
  "完成一组概率或期望题并写下关键条件。": "Complete a probability or expectation set and note the key conditions.",
  "完成一组统计推断题并记录假设。": "Complete a statistical inference set and record every assumption.",
  "完成一项数据处理练习。": "Complete one data-processing exercise.",
  "完成一轮速算并复盘错误。": "Complete a mental-math round and review every mistake.",
  "完成一轮限时练习并复盘错误。": "Complete a timed practice round and review every mistake.",
  "完成两道算法题并复盘复杂度。": "Complete two algorithm problems and review their complexity.",
  "复盘一个交易系统相关概念。": "Review one trading-system concept.",
  "复盘一个实现的边界条件和测试。": "Review one implementation's edge cases and tests.",
  "复盘一个目标岗位的核心知识点。": "Review one core concept for your target role.",
  "复盘一项做市或期权核心概念。": "Review one core market-making or options concept.",
  "复盘一次无泄漏验证流程。": "Review one leakage-free validation workflow.",
  "岗位知识复盘": "Role knowledge review",
  "核心能力训练": "Core skill practice",
  "概率与期望基础训练": "Probability and expectation foundations",
  "检查一项岗位要求并更新准备记录。": "Check one role requirement and update your preparation record.",
  "技术面试口述": "Technical interview walkthrough",
  "市场与期权复盘": "Markets and options review",
  "市场背景训练": "Market context practice",
  "申请材料扫描": "Application materials scan",
  "研究验证复盘": "Research validation review",
  "研究项目口述": "Research project walkthrough",
  "用面试方式讲清一道题的假设和结论。": "Explain one problem's assumptions and conclusion aloud as in an interview.",
  "用面试方式讲清研究假设、验证和失败模式。": "Explain a research hypothesis, validation, and failure modes aloud as in an interview.",
  "清晰说明一道题的假设、步骤和结论。": "Clearly explain one problem's assumptions, steps, and conclusion.",
  "练习清晰说明一次系统设计取舍。": "Practice clearly explaining one system-design tradeoff.",
  "统计推断基础训练": "Statistical inference foundations",
  "系统设计口述": "System design walkthrough",
  "限时 Coding OA": "Timed coding OA",
  "限时能力训练": "Timed skill practice",
  "面试口述训练": "Interview walkthrough",
};

const localizedBaselineRationale = (
  value: string,
  skillKey: string | null,
  language: AppLanguage,
): string | null => {
  if (skillKey === null) return null;
  const escapedSkill = skillKey.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(
    `^Baseline 显示 ${escapedSkill} 当前得分为 (\\d+)，建议优先安排针对性训练。$`,
    "u",
  ).exec(value);
  if (match === null) return null;
  return language === "en"
    ? `Your baseline score for ${skillLabelFor(skillKey, "en")} is ${match[1]}; prioritize focused practice here.`
    : `Baseline 显示：${skillLabelFor(skillKey, "zh-CN")}当前得分为 ${match[1]}，建议优先安排针对性训练。`;
};

export const localizedPlanTaskContent = (
  task: OfficialPlanTask,
  language: AppLanguage,
): Readonly<{ detail: string | null; title: string }> => {
  if (language !== "en") return { detail: task.detail, title: task.title };
  const skillKey = task.skillKey;
  const title = skillKey !== null && task.title === `${skillKey} 针对性训练`
    ? `${skillLabelFor(skillKey, "en")} targeted practice`
    : englishServiceContent[task.title] ?? task.title;
  let detail = task.detail;
  if (detail !== null) {
    if (skillKey !== null && detail === `完成一组 ${skillKey} 针对性练习并记录复盘。`) {
      detail = `Complete a focused ${skillLabelFor(skillKey, "en")} practice set and record your review.`;
    } else {
      detail = localizedBaselineRationale(detail, skillKey, "en")
        ?? englishServiceContent[detail]
        ?? detail;
    }
  }
  return { detail, title };
};

export const localizedRecommendationRationale = (
  recommendation: Recommendation,
  language: AppLanguage,
): string => {
  return localizedBaselineRationale(
    recommendation.rationale,
    recommendation.skillKey,
    language,
  ) ?? (language === "en" ? englishServiceContent[recommendation.rationale] : undefined)
    ?? recommendation.rationale;
};

export const planTaskActionsFor = (
  task: OfficialPlanTask,
  language: AppLanguage,
): PlanTaskActionModel => {
  if (task.status !== "open") {
    return { canComplete: false, navigation: null, training: null };
  }
  if (task.targetProblemId !== null) {
    return {
      canComplete: false,
      navigation: null,
      training: {
        label: language === "zh-CN" ? "开始训练" : "Start training",
        problemId: task.targetProblemId,
      },
    };
  }
  if (!isNavigationTarget(task.actionTarget)) {
    return { canComplete: true, navigation: null, training: null };
  }
  return {
    canComplete: true,
    navigation: {
      label: navigationLabels[language][task.actionTarget],
      route: navigationRoutes[task.actionTarget],
      target: task.actionTarget,
    },
    training: null,
  };
};

export const createPlanDisplayModel = (
  plan: OfficialPlan,
  language: AppLanguage,
): PlanDisplayModel => {
  const openTasks = plan.tasks.filter(({ status }) => status === "open").sort(compareTasks);
  const completedTasks = plan.tasks
    .filter(({ status }) => status === "completed")
    .sort(compareTasks);
  const progressPercentage = plan.progress.total === 0
    ? 0
    : Math.round((plan.progress.completed / plan.progress.total) * 100);
  return {
    completedTasks,
    diagnosticScore: formatDiagnosticScore(plan.diagnosticScore),
    openTasks,
    progressLabel: language === "zh-CN"
      ? `${plan.progress.completed} / ${plan.progress.total} 项`
      : `${plan.progress.completed} / ${plan.progress.total} tasks`,
    progressPercentage,
    subtitle: `${planTrackLabel(plan.track, language)} · ${
      planSeasonLabel(plan.season, language)
    } · ${
      planCopyFor(language).weeklyHoursOption(plan.weeklyHours)
    }`,
    title: planRoleLabel(plan.role, language),
  };
};
