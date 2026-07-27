import type { DashboardOverview } from "../../domains/dashboard/dashboard.schema";
import {
  overviewCopyFor,
  selectTrainingRecommendation,
} from "./overview.model";

const problemId = "30000000-0000-4000-8000-000000000003";
const weaknessProblemId = "50000000-0000-4000-8000-000000000005";

const overview: DashboardOverview = {
  planProgress: {
    completedTasks: 2,
    planId: "10000000-0000-4000-8000-000000000001",
    totalTasks: 5,
    version: 4,
  },
  profile: {
    displayName: "Gary",
    level: 3,
    streakDays: 7,
    weeklyXp: 90,
  },
  recentXp: [],
  resourceVersions: {
    notifications: 4,
    plan: 4,
    xpLedger: 6,
  },
  todayTask: {
    actionResourceId: problemId,
    actionTarget: "problems",
    id: "40000000-0000-4000-8000-000000000004",
    rewardXp: 20,
    status: "open",
    title: "完成两数之和训练",
    unlockReason: "巩固数组与哈希表",
    version: 2,
  },
  unreadNotificationCount: 1,
  weakness: {
    label: "哈希表边界",
    recommendedProblemId: weaknessProblemId,
    score: 62,
    skillKey: "arrays",
  },
};

describe("Overview training recommendation", () => {
  it("uses the real open plan task before the weakness fallback", () => {
    expect(selectTrainingRecommendation(overview)).toEqual({
      eyebrow: "task",
      planTaskId: overview.todayTask?.id,
      problemId,
      reason: "巩固数组与哈希表",
      rewardXp: 20,
      score: null,
      title: "完成两数之和训练",
    });
  });

  it("falls back to the measured weakness when the plan task is complete", () => {
    expect(selectTrainingRecommendation({
      ...overview,
      todayTask: overview.todayTask === null
        ? null
        : { ...overview.todayTask, status: "completed" },
    })).toEqual({
      eyebrow: "weakness",
      planTaskId: null,
      problemId: weaknessProblemId,
      reason: "哈希表边界",
      rewardXp: null,
      score: 62,
      title: "哈希表边界",
    });
  });

  it("does not treat a non-problem task resource as a training recommendation", () => {
    expect(selectTrainingRecommendation({
      ...overview,
      todayTask: overview.todayTask === null
        ? null
        : { ...overview.todayTask, actionTarget: "plan" },
    })).toEqual({
      eyebrow: "weakness",
      planTaskId: null,
      problemId: weaknessProblemId,
      reason: "哈希表边界",
      rewardXp: null,
      score: 62,
      title: "哈希表边界",
    });
  });

  it("returns an honest empty state when neither source has a trainable problem", () => {
    expect(selectTrainingRecommendation({
      ...overview,
      todayTask: null,
      weakness: {
        ...overview.weakness!,
        recommendedProblemId: null,
      },
    })).toBeNull();
  });

  it("keeps copy localized without inventing dashboard data", () => {
    expect(overviewCopyFor("zh-CN").pageTitle("Gary")).toContain("Gary");
    expect(overviewCopyFor("en").metricPlanProgress(2, 5)).toBe("2 / 5 tasks");
  });
});
