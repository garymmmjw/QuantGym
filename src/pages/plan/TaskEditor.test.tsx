import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { OfficialPlanTask } from "../../domains/plan/plan.schema";
import { TaskEditor } from "./TaskEditor";

const task: OfficialPlanTask = {
  actionTarget: "problems",
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: "Review the assumptions after solving.",
  estimatedMinutes: 30,
  id: "20000000-0000-4000-8000-000000000002",
  planId: "10000000-0000-4000-8000-000000000001",
  recommendationId: null,
  scheduledFor: "2026-07-28",
  skillKey: "statistics",
  sortOrder: 0,
  status: "open",
  targetProblemId: "30000000-0000-4000-8000-000000000003",
  title: "Review statistical inference",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 2,
};

describe("TaskEditor", () => {
  it("submits only normalized fields that changed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditor
        language="en"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        task={task}
      />,
    );

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.clear(screen.getByRole("textbox", { name: "Task title" }));
    await user.type(screen.getByRole("textbox", { name: "Task title" }), "  Refine inference  ");
    await user.clear(screen.getByRole("textbox", { name: "Task notes" }));
    await user.clear(screen.getByLabelText("Scheduled date"));
    await user.clear(screen.getByLabelText("Estimated minutes"));
    await user.type(screen.getByLabelText("Estimated minutes"), "45");
    await user.clear(screen.getByLabelText("Task order"));
    await user.type(screen.getByLabelText("Task order"), "3");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      detail: null,
      estimatedMinutes: 45,
      scheduledFor: null,
      sortOrder: 2,
      title: "Refine inference",
    });
  });

  it("blocks invalid values with localized, field-associated errors", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditor
        language="zh-CN"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        task={task}
      />,
    );

    await user.clear(screen.getByRole("textbox", { name: "任务标题" }));
    fireEvent.change(screen.getByLabelText("预计分钟数"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("任务顺序"), { target: { value: "0" } });

    expect(screen.getByText("请输入 1 至 240 个受支持字符的标题。")).toBeVisible();
    expect(screen.getByText("请输入 1 至 1,440 的整数，或留空。")).toBeVisible();
    expect(screen.getByText("请输入 1 至 2,147,483,648 的整数。")).toBeVisible();
    expect(screen.getByRole("button", { name: "保存更改" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps cancellation available when idle and freezes every field while saving", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(
      <TaskEditor
        language="en"
        onCancel={onCancel}
        onSubmit={vi.fn()}
        task={task}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <TaskEditor
        isSubmitting
        language="en"
        onCancel={onCancel}
        onSubmit={vi.fn()}
        task={task}
      />,
    );
    expect(screen.getByRole("button", { name: "Saving task" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Task title" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Task notes" })).toBeDisabled();
  });

  it("edits localized service templates without submitting untouched translations", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditor
        language="en"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        task={{
          ...task,
          detail: "完成一组统计推断题并记录假设。",
          skillKey: "statistics",
          title: "统计推断基础训练",
        }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Task title" }))
      .toHaveValue("Statistical inference foundations");
    expect(screen.getByRole("textbox", { name: "Task notes" }))
      .toHaveValue("Complete a statistical inference set and record every assumption.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    await user.clear(screen.getByLabelText("Estimated minutes"));
    await user.type(screen.getByLabelText("Estimated minutes"), "50");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledWith({ estimatedMinutes: 50 });
  });
});
