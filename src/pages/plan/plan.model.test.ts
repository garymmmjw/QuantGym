import type {
  OfficialPlan,
  OfficialPlanTask,
  Recommendation,
} from "../../domains/plan/plan.schema";
import {
  clampDiagnosticScore,
  createPlanDisplayModel,
  formatDiagnosticScore,
  isCreatablePlanSeason,
  isPlanRole,
  localizedPlanTaskContent,
  localizedRecommendationRationale,
  planCopyFor,
  planRoleLabel,
  planSeasonLabel,
  planTaskActionsFor,
  skillLabelFor,
} from "./plan.model";

const planId = "10000000-0000-4000-8000-000000000001";

const task = (
  id: string,
  overrides: Partial<OfficialPlanTask> = {},
): OfficialPlanTask => ({
  actionTarget: null,
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: null,
  estimatedMinutes: null,
  id,
  planId,
  recommendationId: null,
  scheduledFor: null,
  skillKey: null,
  sortOrder: 0,
  status: "open",
  targetProblemId: null,
  title: "真实任务",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 1,
  ...overrides,
});

const plan = (tasks: readonly OfficialPlanTask[]): OfficialPlan => ({
  createdAt: "2026-07-27T02:00:00Z",
  diagnosticScore: 76,
  diagnosticScores: { statistics: 75 },
  diagnosticStatus: "completed",
  id: planId,
  progress: { completed: 1, total: 3 },
  recommendations: [],
  role: "quantResearch",
  season: "2027-summer",
  status: "active",
  tasks: [...tasks],
  track: "internship",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 4,
  weeklyHours: 8,
});

describe("plan display model", () => {
  it("groups and sorts only the real tasks supplied by the plan", () => {
    const completed = task("20000000-0000-4000-8000-000000000002", {
      completedAt: "2026-07-27T03:00:00Z",
      sortOrder: 1,
      status: "completed",
      title: "已完成任务",
    });
    const later = task("30000000-0000-4000-8000-000000000003", {
      sortOrder: 2,
      title: "稍后任务",
    });
    const first = task("40000000-0000-4000-8000-000000000004", {
      sortOrder: 0,
      title: "下一项任务",
    });

    const model = createPlanDisplayModel(plan([later, completed, first]), "zh-CN");

    expect(model.openTasks.map(({ title }) => title)).toEqual([
      "下一项任务",
      "稍后任务",
    ]);
    expect(model.completedTasks).toEqual([completed]);
    expect(model.title).toBe("量化研究（Quant Research）");
    expect(model.progressLabel).toBe("1 / 3 项");
    expect(model.progressPercentage).toBe(33);
    expect(model.subtitle).toContain("2027 暑期");
  });

  it("formats diagnostic results as percentages and only clamps visual progress", () => {
    expect(formatDiagnosticScore(76)).toBe("76%");
    expect(formatDiagnosticScore(125)).toBe("125%");
    expect(clampDiagnosticScore(125)).toBe(100);
    expect(clampDiagnosticScore(-4)).toBe(0);
  });

  it("makes problem-backed tasks trainable but never directly completable", () => {
    const actions = planTaskActionsFor(task(
      "50000000-0000-4000-8000-000000000005",
      {
        actionTarget: "problems",
        targetProblemId: "60000000-0000-4000-8000-000000000006",
      },
    ), "zh-CN");

    expect(actions).toEqual({
      canComplete: false,
      navigation: null,
      training: {
        label: "开始训练",
        problemId: "60000000-0000-4000-8000-000000000006",
      },
    });
  });

  it("keeps external navigation separate from explicit completion", () => {
    const actions = planTaskActionsFor(task(
      "70000000-0000-4000-8000-000000000007",
      { actionTarget: "tools" },
    ), "en");

    expect(actions.training).toBeNull();
    expect(actions.canComplete).toBe(true);
    expect(actions.navigation).toEqual({
      label: "Open tools",
      route: "/tools",
      target: "tools",
    });
  });

  it.each([null, "custom"] as const)(
    "does not invent a navigation destination for %s tasks",
    (actionTarget) => {
      const actions = planTaskActionsFor(task(
        "80000000-0000-4000-8000-000000000008",
        { actionTarget },
      ), "zh-CN");

      expect(actions.navigation).toBeNull();
      expect(actions.training).toBeNull();
      expect(actions.canComplete).toBe(true);
    },
  );

  it("renders completed tasks as read-only", () => {
    expect(planTaskActionsFor(task(
      "90000000-0000-4000-8000-000000000009",
      { status: "completed" },
    ), "en")).toEqual({
      canComplete: false,
      navigation: null,
      training: null,
    });
  });

  it("keeps copy and known skill labels bilingual without replacing unknown keys", () => {
    expect(planCopyFor("zh-CN").createPlan).toBe("创建训练计划");
    expect(planCopyFor("en").createPlan).toBe("Create training plan");
    expect(skillLabelFor("statistics", "zh-CN")).toBe("统计");
    expect(skillLabelFor("pandasNumpy", "en")).toBe("Python & data");
    expect(skillLabelFor("jobs", "zh-CN")).toBe("求职准备");
    expect(skillLabelFor("new-skill", "en")).toBe("new-skill");
  });

  it("localizes the closed server task templates while preserving user-authored content", () => {
    const serviceTask = task("a0000000-0000-4000-8000-00000000000a", {
      detail: "完成一组统计推断题并记录假设。",
      skillKey: "statistics",
      title: "统计推断基础训练",
    });
    expect(localizedPlanTaskContent(serviceTask, "en")).toEqual({
      detail: "Complete a statistical inference set and record every assumption.",
      title: "Statistical inference foundations",
    });
    expect(localizedPlanTaskContent(serviceTask, "zh-CN")).toEqual({
      detail: serviceTask.detail,
      title: serviceTask.title,
    });

    const generatedTask = task("b0000000-0000-4000-8000-00000000000b", {
      detail: "完成一组 statistics 针对性练习并记录复盘。",
      skillKey: "statistics",
      title: "statistics 针对性训练",
    });
    expect(localizedPlanTaskContent(generatedTask, "en")).toEqual({
      detail: "Complete a focused Statistics practice set and record your review.",
      title: "Statistics targeted practice",
    });

    const userTask = task("c0000000-0000-4000-8000-00000000000c", {
      detail: "我自己写的说明",
      skillKey: "statistics",
      title: "我自己写的任务",
    });
    expect(localizedPlanTaskContent(userTask, "en")).toEqual({
      detail: userTask.detail,
      title: userTask.title,
    });
  });

  it("localizes baseline recommendation evidence from the real API template", () => {
    const recommendation: Recommendation = {
      createdAt: "2026-07-27T02:00:00Z",
      id: "d0000000-0000-4000-8000-00000000000d",
      kind: "skill",
      problemId: null,
      provenanceResourceId: planId,
      provenanceType: "diagnostic",
      rank: 0,
      rationale: "Baseline 显示 statistics 当前得分为 75，建议优先安排针对性训练。",
      skillKey: "statistics",
      status: "active",
      updatedAt: "2026-07-27T02:00:00Z",
      version: 1,
    };
    expect(localizedRecommendationRationale(recommendation, "en")).toBe(
      "Your baseline score for Statistics is 75; prioritize focused practice here.",
    );
    expect(localizedRecommendationRationale(recommendation, "zh-CN"))
      .toBe("Baseline 显示：统计当前得分为 75，建议优先安排针对性训练。");
  });

  it("guards exact service role and creatable season slugs", () => {
    expect(isPlanRole("quantResearch")).toBe(true);
    expect(isPlanRole("Quant Research")).toBe(false);
    expect(isCreatablePlanSeason("2027-summer")).toBe(true);
    expect(isCreatablePlanSeason("2026-summer")).toBe(false);
    expect(planRoleLabel("quantDeveloper", "en")).toBe("Quant Developer");
    expect(planSeasonLabel("2026-summer", "en")).toBe("2026 Summer");
    expect(planRoleLabel("legacy-role", "en")).toBe("legacy-role");
  });
});
