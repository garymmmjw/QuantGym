import type { AppLanguage } from "../../shared/i18n";
import type { DashboardOverview } from "../../domains/dashboard/dashboard.schema";

export type OverviewCopy = Readonly<{
  activityCount: (count: number) => string;
  activityEmpty: string;
  activityTitle: string;
  cta: string;
  emptyDescription: string;
  emptyMascotAlt: string;
  emptyTitle: string;
  focusDescription: string;
  focusLabel: string;
  loadingDescription: string;
  loadingLabel: string;
  loadingTitle: string;
  metricLevel: string;
  metricLevelDetail: string;
  metricPlan: string;
  metricPlanEmpty: string;
  metricPlanProgress: (completed: number, total: number) => string;
  metricStreak: string;
  metricStreakDetail: string;
  metricWeeklyXp: string;
  metricWeeklyXpDetail: string;
  pageDescription: string;
  pageEyebrow: string;
  pageTitle: (displayName: string) => string;
  queryErrorAction: string;
  queryErrorDescription: string;
  queryErrorTitle: string;
  recommendationScore: (score: number) => string;
  recommendationTask: string;
  recommendationWeakness: string;
  recovery: Readonly<Record<
    "recoverable-error"
    | "non-recoverable-error"
    | "offline-draft"
    | "permission-denied"
    | "stale-version-conflict"
    | "retry",
    Readonly<{
      action: string;
      message: string;
      title: string;
    }>
  >>;
  requestId: string;
  startQueued: string;
  startQueuedTitle: string;
  startSaving: string;
  startSavingTitle: string;
}>;

const zhCNCopy: OverviewCopy = {
  activityCount: (count) => `最近 ${count} 条`,
  activityEmpty: "完成训练后，真实获得的 XP 会记录在这里。",
  activityTitle: "最近训练",
  cta: "开始 / 继续训练",
  emptyDescription: "计划或短板分析生成可训练题目后，推荐会出现在这里。",
  emptyMascotAlt: "Quanty 正在等待下一条训练建议",
  emptyTitle: "今天还没有可开始的推荐",
  focusDescription: "推荐会优先围绕这个真实短板安排训练。",
  focusLabel: "当前短板",
  loadingDescription: "正在读取你的真实进度与训练建议。",
  loadingLabel: "正在载入训练总览",
  loadingTitle: "正在整理今日训练",
  metricLevel: "当前等级",
  metricLevelDetail: "来自账号真实进度",
  metricPlan: "计划进度",
  metricPlanEmpty: "暂无进行中的计划",
  metricPlanProgress: (completed, total) => `${completed} / ${total} 项`,
  metricStreak: "连续训练",
  metricStreakDetail: "按真实 XP 日期计算",
  metricWeeklyXp: "本周 XP",
  metricWeeklyXpDetail: "本周已确认入账",
  pageDescription: "从真实进度出发，只完成眼前最值得练的一轮。",
  pageEyebrow: "训练总览",
  pageTitle: (displayName) => `${displayName}，今天把一题练扎实`,
  queryErrorAction: "重新载入",
  queryErrorDescription: "训练总览暂时没有载入。你的服务端进度不会因此改变。",
  queryErrorTitle: "暂时无法读取训练总览",
  recommendationScore: (score) => `当前能力分 ${score}`,
  recommendationTask: "今日计划",
  recommendationWeakness: "短板强化",
  recovery: {
    "recoverable-error": {
      action: "重试启动",
      message: "训练会话暂时没有建立，本机请求仍然保留，可以安全重试。",
      title: "暂时无法开始训练",
    },
    "non-recoverable-error": {
      action: "放弃本次请求",
      message: "这次请求无法继续。本机副本会保留到你明确返回总览。",
      title: "当前训练无法开始",
    },
    "offline-draft": {
      action: "联网后重试",
      message: "启动请求已安全保留在本机，恢复网络后可以继续提交。",
      title: "训练请求已离线保存",
    },
    "permission-denied": {
      action: "重新登录",
      message: "启动请求仍保留在本机。重新验证当前账号后可以继续。",
      title: "需要重新验证身份",
    },
    "stale-version-conflict": {
      action: "载入最新推荐",
      message: "训练内容已在其他位置变化。载入最新推荐前不会覆盖本机请求。",
      title: "训练版本已变化",
    },
    retry: {
      action: "正在重试",
      message: "正在使用同一请求标识恢复训练，不会重复创建会话。",
      title: "正在恢复训练会话",
    },
  },
  requestId: "参考编号",
  startQueued: "服务确认后会自动打开对应题目，不会提前跳转。",
  startQueuedTitle: "正在建立训练会话",
  startSaving: "先把这次启动请求安全保留在本机。",
  startSavingTitle: "正在保存启动请求",
};

const enCopy: OverviewCopy = {
  activityCount: (count) => `${count} recent`,
  activityEmpty: "Verified XP will appear here after you complete training.",
  activityTitle: "Recent training",
  cta: "Start or resume training",
  emptyDescription: "A recommendation will appear when your plan or weakness analysis has a trainable problem.",
  emptyMascotAlt: "Quanty is waiting for the next training recommendation",
  emptyTitle: "No training recommendation is ready yet",
  focusDescription: "Recommendations prioritize this measured weakness.",
  focusLabel: "Current weakness",
  loadingDescription: "Reading your verified progress and training recommendation.",
  loadingLabel: "Loading training overview",
  loadingTitle: "Preparing today’s training",
  metricLevel: "Current level",
  metricLevelDetail: "From verified account progress",
  metricPlan: "Plan progress",
  metricPlanEmpty: "No active plan",
  metricPlanProgress: (completed, total) => `${completed} / ${total} tasks`,
  metricStreak: "Training streak",
  metricStreakDetail: "Calculated from verified XP dates",
  metricWeeklyXp: "Weekly XP",
  metricWeeklyXpDetail: "Confirmed this week",
  pageDescription: "Use your verified progress to focus on the one round worth doing now.",
  pageEyebrow: "Training overview",
  pageTitle: (displayName) => `${displayName}, make the next problem count`,
  queryErrorAction: "Reload overview",
  queryErrorDescription: "The overview could not load. Your server progress has not changed.",
  queryErrorTitle: "Training overview is unavailable",
  recommendationScore: (score) => `Current skill score ${score}`,
  recommendationTask: "Today’s plan",
  recommendationWeakness: "Weakness focus",
  recovery: {
    "recoverable-error": {
      action: "Retry start",
      message: "The session was not created. The local request is still safe to retry.",
      title: "Training could not start",
    },
    "non-recoverable-error": {
      action: "Discard this request",
      message: "This request cannot continue. Its local copy remains until you explicitly return.",
      title: "This training cannot start",
    },
    "offline-draft": {
      action: "Retry when online",
      message: "The start request is safely stored on this device and can continue after reconnection.",
      title: "Training request saved offline",
    },
    "permission-denied": {
      action: "Sign in again",
      message: "The local request remains safe. Verify the current account to continue.",
      title: "Verify your identity",
    },
    "stale-version-conflict": {
      action: "Load latest recommendation",
      message: "Training changed elsewhere. The local request will not be replaced before you load the latest version.",
      title: "Training version changed",
    },
    retry: {
      action: "Retrying",
      message: "Restoring training with the same request identity so a duplicate session is not created.",
      title: "Restoring training session",
    },
  },
  requestId: "Reference",
  startQueued: "The matching problem opens only after the server confirms the session.",
  startQueuedTitle: "Creating training session",
  startSaving: "Safely storing this start request on your device first.",
  startSavingTitle: "Saving start request",
};

export const overviewCopyFor = (language: AppLanguage): OverviewCopy => (
  language === "en" ? enCopy : zhCNCopy
);

export type TrainingRecommendation = Readonly<{
  eyebrow: "task" | "weakness";
  planTaskId: string | null;
  problemId: string;
  reason: string;
  rewardXp: number | null;
  score: number | null;
  title: string;
}>;

export const selectTrainingRecommendation = (
  overview: DashboardOverview,
): TrainingRecommendation | null => {
  const task = overview.todayTask;
  if (
    task !== null
    && task.status === "open"
    && task.actionTarget === "problems"
    && task.actionResourceId !== null
  ) {
    return {
      eyebrow: "task",
      planTaskId: task.id,
      problemId: task.actionResourceId,
      reason: task.unlockReason,
      rewardXp: task.rewardXp,
      score: null,
      title: task.title,
    };
  }

  const weakness = overview.weakness;
  if (weakness !== null && weakness.recommendedProblemId !== null) {
    return {
      eyebrow: "weakness",
      planTaskId: null,
      problemId: weakness.recommendedProblemId,
      reason: weakness.label,
      rewardXp: null,
      score: weakness.score,
      title: weakness.label,
    };
  }

  return null;
};
