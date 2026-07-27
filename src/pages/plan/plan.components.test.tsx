import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  CreatePlanRequest,
  OfficialPlanTask,
} from "../../domains/plan/plan.schema";
import {
  planDiagnosticCatalog,
  type DiagnosticAnswerSelection,
} from "../training/planDiagnosticCatalog";
import { PlanDiagnosticPanel } from "./PlanDiagnosticPanel";
import { PlanSetupForm } from "./PlanSetupForm";
import { PlanTaskCard } from "./PlanTaskCard";

const planId = "10000000-0000-4000-8000-000000000001";
const problemId = "30000000-0000-4000-8000-000000000003";

const makeTask = (overrides: Partial<OfficialPlanTask> = {}): OfficialPlanTask => ({
  actionTarget: null,
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: "完成后再显式确认。",
  estimatedMinutes: 30,
  id: "20000000-0000-4000-8000-000000000002",
  planId,
  recommendationId: null,
  scheduledFor: "2026-07-28",
  skillKey: "statistics",
  sortOrder: 0,
  status: "open",
  targetProblemId: null,
  title: "今日训练任务",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 1,
  ...overrides,
});

describe("Plan pure display components", () => {
  it("keeps plan setup controlled and offers no unsupported diagnostic skip choice", async () => {
    const user = userEvent.setup();
    const value: CreatePlanRequest = {
      role: "quantResearch",
      season: "2027-summer",
      track: "internship",
      weeklyHours: 8,
    };
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <PlanSetupForm
        language="zh-CN"
        onChange={onChange}
        onSubmit={onSubmit}
        value={value}
      />,
    );

    expect(screen.queryByText(/跳过诊断/)).not.toBeInTheDocument();
    const roleSelect = screen.getByRole("combobox", { name: "目标岗位" });
    expect(roleSelect).toHaveValue(
      "quantResearch",
    );
    expect(screen.getByRole("combobox", { name: "目标招聘季" })).toHaveValue(
      "2027-summer",
    );
    await user.selectOptions(roleSelect, "quantDeveloper");
    expect(onChange).toHaveBeenCalledWith({ ...value, role: "quantDeveloper" });
    await user.click(screen.getByRole("radio", { name: "全职求职" }));
    expect(onChange).toHaveBeenCalledWith({ ...value, track: "fulltime" });
    await user.click(screen.getByRole("button", { name: "创建训练计划" }));
    expect(onSubmit).toHaveBeenCalledWith(value);
  });

  it("never submits a display label in place of the exact service role slug", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PlanSetupForm
        language="en"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        value={{
          role: "Quant Research",
          season: "2027-summer",
          track: "internship",
          weeklyHours: 8,
        }}
      />,
    );

    const submit = screen.getByRole("button", { name: "Create training plan" });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows start training for a problem-backed task and never renders direct completion", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onStartTraining = vi.fn();
    const task = makeTask({ actionTarget: "problems", targetProblemId: problemId });
    render(
      <PlanTaskCard
        language="zh-CN"
        onComplete={onComplete}
        onStartTraining={onStartTraining}
        task={task}
      />,
    );

    expect(screen.queryByRole("button", { name: "标记完成" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "开始训练" }));
    expect(onStartTraining).toHaveBeenCalledWith(problemId, task);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("keeps navigation and explicit completion as separate actions", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onNavigate = vi.fn();
    const task = makeTask({ actionTarget: "tools" });
    render(
      <PlanTaskCard
        language="en"
        onComplete={onComplete}
        onNavigate={onNavigate}
        task={task}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open tools" }));
    expect(onNavigate).toHaveBeenCalledWith("/tools", task);
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(onComplete).toHaveBeenCalledWith(task);
  });

  it("renders real service-generated task content in the selected English locale", () => {
    render(
      <PlanTaskCard
        language="en"
        task={makeTask({
          detail: "完成一组统计推断题并记录假设。",
          title: "统计推断基础训练",
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Statistical inference foundations" }))
      .toBeVisible();
    expect(screen.getByText("Complete a statistical inference set and record every assumption."))
      .toBeVisible();
    expect(screen.queryByText("统计推断基础训练")).not.toBeInTheDocument();
  });

  it("does not invent a destination for a custom task", () => {
    render(
      <PlanTaskCard
        language="en"
        onNavigate={vi.fn()}
        task={makeTask({ actionTarget: "custom" })}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the confirmed diagnostic score as a percentage", () => {
    render(
      <PlanDiagnosticPanel
        diagnosticScore={76}
        diagnosticScores={{ statistics: 75 }}
        expanded={false}
        language="en"
        onAnswerChange={vi.fn()}
        onOpen={vi.fn()}
        onSubmit={vi.fn()}
        selections={[]}
        status="completed"
      />,
    );

    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("submits all eight bilingual catalog selections in canonical order", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const selections: DiagnosticAnswerSelection[] = planDiagnosticCatalog.map(
      (question) => ({
        optionId: question.options[0].optionId,
        questionId: question.questionId,
      }),
    );
    render(
      <PlanDiagnosticPanel
        diagnosticScore={0}
        diagnosticScores={{}}
        expanded
        language="en"
        onAnswerChange={vi.fn()}
        onOpen={vi.fn()}
        onSubmit={onSubmit}
        selections={selections}
        status="pending"
      />,
    );

    expect(screen.getByText(planDiagnosticCatalog[0].prompt.en)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit assessment" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toHaveLength(8);
    expect(onSubmit.mock.calls[0]?.[0].map(
      ({ questionId }: { questionId: string }) => questionId,
    )).toEqual(planDiagnosticCatalog.map(({ questionId }) => questionId));
  });
});
