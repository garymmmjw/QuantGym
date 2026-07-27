import "@testing-library/jest-dom/vitest";

import { createRef } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  ProblemDetail,
  ProblemSummary,
} from "../../../domains/problems/problems.schema";
import { ProblemDetailPanel } from "./ProblemDetailPanel";
import { ProblemsFilterPanel } from "./ProblemsFilterPanel";
import { ProblemsWorkspace } from "./ProblemsWorkspace";
import { TrainingResult } from "./TrainingResult";
import { VirtualProblemList } from "./VirtualProblemList";

const problemId = (index: number) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`;

const makeProblem = (index: number): ProblemSummary => ({
  category: index % 2 === 0 ? "Probability" : "Mental math",
  companies: ["Jane Street", "Optiver"],
  difficulty: index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard",
  favorite: {
    favorite: index === 0,
    stateId: index === 0 ? "22222222-2222-4222-8222-222222222222" : null,
    updatedAt: index === 0 ? "2026-07-27T03:00:00Z" : null,
    version: index === 0 ? 1 : null,
  },
  hot100: index % 5 === 0,
  id: problemId(index),
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: index,
    bestScore: index === 0 ? 88 : null,
    completedAt: index === 0 ? "2026-07-27T03:00:00Z" : null,
    hintCount: 0,
    lastPracticedAt: null,
    lastScore: index === 0 ? 88 : null,
    solutionRevealedAt: null,
    status: index === 0 ? "completed" : "unstarted",
    version: index === 0 ? 1 : null,
  },
  source: {
    contentVersion: "preview-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["Bayes", "Interview"],
  titleEn: `Problem ${index}`,
  titleZh: `题目 ${index}`,
  version: 1,
});

const detail: ProblemDetail = {
  ...makeProblem(0),
  note: null,
  promptEn: "Explain the conditional probability.",
  promptZh: "解释条件概率。",
};

describe("Problems display components", () => {
  it("keeps every filter controlled and exposes each filter action", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onDifficultyChange = vi.fn();
    const onQueryChange = vi.fn();
    const onQuerySubmit = vi.fn();
    const onSourceChange = vi.fn();
    const onStatusChange = vi.fn();
    const onViewChange = vi.fn();

    render(
      <ProblemsFilterPanel
        onClear={onClear}
        onDifficultyChange={onDifficultyChange}
        onQueryChange={onQueryChange}
        onQuerySubmit={onQuerySubmit}
        onSourceChange={onSourceChange}
        onStatusChange={onStatusChange}
        onViewChange={onViewChange}
        resultSummary="找到 18 道题"
        sources={[{ label: "绿皮书", value: "green-book" }]}
        value={{
          difficulty: null,
          query: "Bayes",
          source: null,
          status: null,
          view: "all",
        }}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索题目" }), {
      target: { value: "Monty Hall" },
    });
    await user.click(within(screen.getByRole("group", { name: "难度" }))
      .getByRole("button", { name: "中等" }));
    await user.click(within(screen.getByRole("group", { name: "进度" }))
      .getByRole("button", { name: "进行中" }));
    await user.click(within(screen.getByRole("group", { name: "来源" }))
      .getByRole("button", { name: "绿皮书" }));
    await user.click(within(screen.getByRole("group", { name: "题集" }))
      .getByRole("button", { name: "Hot 100" }));
    await user.click(screen.getByRole("button", { name: "搜索" }));
    await user.click(screen.getByRole("button", { name: /清除筛选 · 1/u }));

    expect(onQueryChange).toHaveBeenCalledWith("Monty Hall");
    expect(onDifficultyChange).toHaveBeenCalledWith("Medium");
    expect(onStatusChange).toHaveBeenCalledWith("in_progress");
    expect(onSourceChange).toHaveBeenCalledWith("green-book");
    expect(onViewChange).toHaveBeenCalledWith("hot100");
    expect(onQuerySubmit).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.getByText("找到 18 道题")).toBeVisible();
  });

  it("virtualizes a dense bilingual list and exposes selection, keyboard, favorite, and scroll", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(420);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function height(this: HTMLElement) {
      return this.hasAttribute("data-index") ? 88 : 560;
    });
    const items = Array.from({ length: 120 }, (_, index) => makeProblem(index));
    const onScrollOffsetChange = vi.fn();
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();
    const selectedControlRef = createRef<HTMLButtonElement>();
    const rendered = render(
      <VirtualProblemList
        items={items}
        language="en"
        onScrollOffsetChange={onScrollOffsetChange}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        selectedControlRef={selectedControlRef}
        selectedId={items[0]?.id ?? null}
      />,
    );

    const firstProblem = screen.getByRole("button", { name: /Problem 0/u });
    expect(firstProblem).toHaveTextContent("Problem 0");
    expect(firstProblem).toHaveTextContent("题目 0");
    expect(screen.queryByText("Problem 90")).not.toBeInTheDocument();
    expect(selectedControlRef.current).toBe(firstProblem);

    await user.click(firstProblem);
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("button", { name: "取消收藏" }));
    const scroller = rendered.container.querySelector<HTMLDivElement>("div[tabindex='-1']");
    expect(scroller).not.toBeNull();
    fireEvent.scroll(scroller as HTMLDivElement, { target: { scrollTop: 176 } });

    expect(onSelect).toHaveBeenNthCalledWith(1, items[0]);
    expect(onSelect).toHaveBeenNthCalledWith(2, items[1]);
    expect(onToggleFavorite).toHaveBeenCalledWith(items[0]);
    expect(onScrollOffsetChange).toHaveBeenCalledWith(176);
  });

  it("exposes the full active-training action set without holding workflow state", async () => {
    const user = userEvent.setup();
    const actions = {
      complete: vi.fn(),
      favorite: vi.fn(),
      hint: vi.fn(),
      noteChange: vi.fn(),
      noteSave: vi.fn(),
      solution: vi.fn(),
      start: vi.fn(),
      submit: vi.fn(),
    };

    const rendered = render(
      <ProblemDetailPanel
        attempt={{
          answer: "P(A|B) = P(B|A)P(A)/P(B)",
          kind: "text",
          onAnswerChange: vi.fn(),
          onSubmit: actions.submit,
        }}
        canComplete
        hint={{ hint: "从 Bayes 公式开始。", onReveal: actions.hint, revealed: false }}
        isSessionActive
        note={{
          onChange: actions.noteChange,
          onSave: actions.noteSave,
          status: "dirty",
          value: "先写条件事件。",
        }}
        onComplete={actions.complete}
        onStart={actions.start}
        onToggleFavorite={actions.favorite}
        problem={detail}
        solution={{ content: "使用 Bayes 公式。", onReveal: actions.solution, revealed: false }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "取消收藏" }));
    await user.click(screen.getByRole("button", { name: "使用提示" }));
    await user.click(screen.getByRole("button", { name: "提交作答" }));
    await user.click(screen.getByRole("button", { name: /查看参考解析/u }));
    await user.click(screen.getByRole("button", { name: "完成本次训练" }));
    await user.click(screen.getByRole("button", { name: "保存笔记" }));

    expect(actions.favorite).toHaveBeenCalledOnce();
    expect(actions.hint).toHaveBeenCalledOnce();
    expect(actions.submit).toHaveBeenCalledOnce();
    expect(actions.solution).toHaveBeenCalledOnce();
    expect(actions.complete).toHaveBeenCalledOnce();
    expect(actions.noteSave).toHaveBeenCalledOnce();

    rendered.rerender(
      <ProblemDetailPanel
        canComplete={false}
        isSessionActive={false}
        note={{ onChange: vi.fn(), onSave: vi.fn(), status: "idle", value: "" }}
        onComplete={actions.complete}
        onStart={actions.start}
        onToggleFavorite={actions.favorite}
        problem={detail}
        solution={{ content: null, onReveal: actions.solution, revealed: false }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "开始这道题" }));
    expect(actions.start).toHaveBeenCalledOnce();
  });

  it("places the confirmed result and next action before the delayed reward", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const rendered = render(
      <TrainingResult
        nextAction="继续概率专项"
        onNext={onNext}
        planEffect={{ description: "今日计划已同步完成", taskCompleted: true }}
        score={92}
        skillEffect="概率 +3"
        xpDelta={25}
      />,
    );

    const result = screen.getByRole("heading", { name: "本次训练结果" });
    const reward = screen.getByText("+25 XP");
    expect(result.compareDocumentPosition(reward) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(screen.getByText("概率 +3")).toBeVisible();
    expect(screen.getByText("继续概率专项")).toBeVisible();
    expect(rendered.container.querySelector("[data-plan-task-completed='true']"))
      .toHaveTextContent("今日计划已同步完成");
    await user.click(screen.getByRole("button", { name: "继续下一题" }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("uses the controlled mobile view and restores focus when returning to the list", async () => {
    const user = userEvent.setup();
    const onBackToList = vi.fn();
    const returnFocusRef = createRef<HTMLButtonElement>();
    const rendered = render(
      <ProblemsWorkspace
        detail={<p>详情内容</p>}
        filterPanel={<p>筛选</p>}
        list={<button ref={returnFocusRef}>题目一</button>}
        mobileView="list"
        onBackToList={onBackToList}
        returnFocusRef={returnFocusRef}
      />,
    );

    rendered.rerender(
      <ProblemsWorkspace
        detail={<p>详情内容</p>}
        filterPanel={<p>筛选</p>}
        list={<button ref={returnFocusRef}>题目一</button>}
        mobileView="detail"
        onBackToList={onBackToList}
        returnFocusRef={returnFocusRef}
      />,
    );
    expect(screen.getByRole("region", { name: "题目详情" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /返回题目列表/u }));
    expect(onBackToList).toHaveBeenCalledOnce();

    rendered.rerender(
      <ProblemsWorkspace
        detail={<p>详情内容</p>}
        filterPanel={<p>筛选</p>}
        list={<button ref={returnFocusRef}>题目一</button>}
        mobileView="list"
        onBackToList={onBackToList}
        returnFocusRef={returnFocusRef}
      />,
    );
    expect(screen.getByRole("button", { name: "题目一" })).toHaveFocus();
  });
});
