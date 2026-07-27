import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

import type {
  ProblemDetail,
  ProblemListResponse,
  ProblemSummary,
} from "../../domains/problems/problems.schema";
import type {
  TrainingResultResponse,
  TrainingSessionResponse,
} from "../../domains/training/training.schema";
import { ApiError } from "../../shared/api/errors";
import { I18nProvider, type AppLanguage } from "../../shared/i18n";
import { ProblemsPage, type ProblemsPageSession } from "./ProblemsPage";

type QueryState<Data> = {
  data: Data | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

type WorkflowState = Readonly<{
  failure: null;
  intent: Readonly<{
    kind: string;
    problemId?: string;
    request?: Readonly<{ problemId?: string }>;
    sessionId?: string;
  }>;
  phase: "failed" | "reconciling" | "submitting";
}>;

type WorkflowController = {
  busy: boolean;
  canSubmit: boolean;
  discard: ReturnType<typeof vi.fn>;
  inspectionFailure: null;
  inspectRecovery: ReturnType<typeof vi.fn>;
  loadLatest: ReturnType<typeof vi.fn>;
  recoveryReady: boolean;
  retry: ReturnType<typeof vi.fn>;
  submit: ReturnType<typeof vi.fn>;
  workflow: WorkflowState | null;
};

const pageMocks = vi.hoisted(() => ({
  completeIntent: vi.fn(),
  detailQuery: {} as QueryState<ProblemDetail>,
  hintIntent: vi.fn(),
  problemQuery: {} as QueryState<ProblemListResponse>,
  problemQueryOptions: vi.fn(),
  problemWorkflow: {} as WorkflowController,
  resultQuery: {} as QueryState<TrainingResultResponse>,
  resultQueryOptions: vi.fn(),
  revealIntent: vi.fn(),
  saveNoteIntent: vi.fn(),
  sessionQuery: {} as QueryState<TrainingSessionResponse>,
  sessionQueryOptions: vi.fn(),
  setFavoriteIntent: vi.fn(),
  startIntent: vi.fn(),
  submitAttemptIntent: vi.fn(),
  trainingOptions: null as Readonly<{
    onReceipt: (receipt: unknown, signal?: AbortSignal) => Promise<void>;
  }> | null,
  trainingWorkflow: {} as WorkflowController,
  useDetailQuery: vi.fn(),
}));

vi.mock("../../domains/account/auth/auth.queries", () => ({
  useCurrentUserQuery: () => ({ data: null, isPending: true }),
}));

vi.mock("../../domains/problems/problems.queries", () => ({
  problemQueryKeys: {
    forOwner: (ownerScope: string) => ["problems", ownerScope],
  },
  useProblemDetailQuery: (options: unknown) => {
    pageMocks.useDetailQuery(options);
    return pageMocks.detailQuery;
  },
  useProblemsQuery: (options: unknown) => {
    pageMocks.problemQueryOptions(options);
    return pageMocks.problemQuery;
  },
}));

vi.mock("../../domains/training/training.queries", () => ({
  trainingQueryKeys: {
    forOwner: (ownerScope: string) => ["training", ownerScope],
    result: (ownerScope: string, sessionId: string) => [
      "training",
      ownerScope,
      "result",
      sessionId,
    ],
    session: (ownerScope: string, sessionId: string) => [
      "training",
      ownerScope,
      "session",
      sessionId,
    ],
  },
  useTrainingResultQuery: (options: unknown) => {
    pageMocks.resultQueryOptions(options);
    return pageMocks.resultQuery;
  },
  useTrainingSessionQuery: (options: unknown) => {
    pageMocks.sessionQueryOptions(options);
    return pageMocks.sessionQuery;
  },
}));

vi.mock("../../domains/problems/problems.mutations", () => ({
  newSaveProblemNoteIntent: (
    problemId: string,
    body: string,
    expectedVersion: number | null,
  ) => pageMocks.saveNoteIntent(problemId, body, expectedVersion),
  newSetProblemFavoriteIntent: (problem: ProblemSummary, favorite: boolean) => (
    pageMocks.setFavoriteIntent(problem, favorite)
  ),
}));

vi.mock("../../domains/training/training.mutations", () => ({
  newCompleteTrainingIntent: (session: unknown, attemptId: string) => (
    pageMocks.completeIntent(session, attemptId)
  ),
  newRevealTrainingSolutionIntent: (session: unknown) => (
    pageMocks.revealIntent(session)
  ),
  newStartTrainingIntent: (request: unknown) => pageMocks.startIntent(request),
  newSubmitTrainingAttemptIntent: (session: unknown, attempt: unknown) => (
    pageMocks.submitAttemptIntent(session, attempt)
  ),
  newUseTrainingHintIntent: (session: unknown) => pageMocks.hintIntent(session),
}));

vi.mock("./problems/useProblemMutationWorkflow", () => ({
  useProblemMutationWorkflow: () => pageMocks.problemWorkflow,
}));

vi.mock("./problems/useProblemTrainingWorkflow", () => ({
  useProblemTrainingWorkflow: (options: typeof pageMocks.trainingOptions) => {
    pageMocks.trainingOptions = options;
    return pageMocks.trainingWorkflow;
  },
}));

vi.mock("../../shared/lib/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

const ownerScope = "acct-1234567890abcdef";
const problemId = "11111111-1111-4111-8111-111111111111";
const secondProblemId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const taskId = "55555555-5555-4555-8555-555555555555";

const session: ProblemsPageSession = {
  csrfProof: "csrf-proof-1234567890abcdef",
  ownerScope,
  verifyOwner: async () => undefined,
};

const makeSummary = (
  overrides: Partial<ProblemSummary> = {},
): ProblemSummary => ({
  category: "Arrays",
  companies: ["Jane Street"],
  difficulty: "Medium",
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: true,
  id: problemId,
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: 0,
    bestScore: null,
    completedAt: null,
    hintCount: 0,
    lastPracticedAt: null,
    lastScore: null,
    solutionRevealedAt: null,
    status: "unstarted",
    version: null,
  },
  source: {
    contentVersion: "curated-v1",
    name: "QuantGym Curated",
    slug: "quantgym-curated",
  },
  tags: ["hash-map", "interview"],
  titleEn: "Two Sum",
  titleZh: "两数之和",
  version: 1,
  ...overrides,
});

const summary = makeSummary();
const secondSummary = makeSummary({
  difficulty: "Easy",
  hot100: false,
  id: secondProblemId,
  titleEn: "Valid Parentheses",
  titleZh: "有效的括号",
});
const detail: ProblemDetail = {
  ...summary,
  note: null,
  promptEn: "Return the indices of two numbers that add up to the target.",
  promptZh: "返回和为目标值的两个数字下标。",
};
const problemList: ProblemListResponse = {
  availableSources: [summary.source],
  items: [summary, secondSummary],
  nextCursor: null,
};

const activeSession: TrainingSessionResponse = {
  attemptId,
  hintEn: null,
  hintZh: null,
  lastActivityAt: "2026-07-27T08:10:00Z",
  planTaskId: taskId,
  problemId,
  score: 72,
  sessionId,
  sessionVersion: 7,
  solutionEn: null,
  solutionZh: null,
  startedAt: "2026-07-27T08:00:00Z",
  status: "active",
};

const completedResult: TrainingResultResponse = {
  completedAt: "2026-07-27T08:20:00Z",
  nextAction: {
    problemId: secondProblemId,
    target: "problems",
  },
  planEffect: {
    planVersion: 4,
    taskCompleted: true,
  },
  problemId,
  score: 88,
  sessionId,
  sessionVersion: 8,
  skillEffect: {
    currentBestScore: 88,
    delta: 12,
    previousBestScore: 76,
    skillKey: "arrays",
  },
  xpDelta: 35,
};

const makeQueryState = <Data,>(data: Data | undefined): QueryState<Data> => ({
  data,
  error: null,
  isError: false,
  isFetching: false,
  isPending: data === undefined,
  refetch: vi.fn().mockResolvedValue({ error: null, isError: false }),
});

const makeWorkflow = (): WorkflowController => ({
  busy: false,
  canSubmit: true,
  discard: vi.fn().mockResolvedValue(undefined),
  inspectionFailure: null,
  inspectRecovery: vi.fn().mockResolvedValue(undefined),
  loadLatest: vi.fn().mockResolvedValue(undefined),
  recoveryReady: true,
  retry: vi.fn().mockResolvedValue(true),
  submit: vi.fn().mockResolvedValue(true),
  workflow: null,
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <button onClick={() => void navigate(-1)} type="button">Test history back</button>
      <button onClick={() => void navigate(1)} type="button">Test history forward</button>
    </>
  );
}

const renderPage = ({
  initialEntry = "/problems",
  language = "zh-CN",
  onNavigate = vi.fn<(href: string) => void>(),
}: Readonly<{
  initialEntry?: string;
  language?: AppLanguage;
  onNavigate?: (href: string) => void;
}> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const page = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider language={language}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ProblemsPage onNavigate={onNavigate} session={session} />
          <LocationProbe />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  const rendered = render(page());
  return {
    onNavigate,
    ...rendered,
    rerenderPage: () => rendered.rerender(page()),
  };
};

const currentSearch = () => {
  const href = screen.getByTestId("location").textContent ?? "";
  return new URL(href, "https://quantgym.test").searchParams;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(420);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get")
    .mockImplementation(function height(this: HTMLElement) {
      return this.hasAttribute("data-index") ? 88 : 560;
    });
  pageMocks.problemQuery = makeQueryState(problemList);
  pageMocks.detailQuery = makeQueryState(detail);
  pageMocks.sessionQuery = makeQueryState(activeSession);
  pageMocks.resultQuery = makeQueryState<TrainingResultResponse>(undefined);
  pageMocks.problemWorkflow = makeWorkflow();
  pageMocks.trainingWorkflow = makeWorkflow();
  pageMocks.trainingOptions = null;

  pageMocks.startIntent.mockImplementation((request) => ({
    idempotencyKey: "start-intent-request-12345",
    kind: "start",
    request,
  }));
  pageMocks.hintIntent.mockImplementation((sessionVersion) => ({
    idempotencyKey: "hint-intent-request-123456",
    kind: "hint",
    request: { version: sessionVersion.sessionVersion },
    sessionId: sessionVersion.sessionId,
  }));
  pageMocks.submitAttemptIntent.mockImplementation((sessionVersion, attempt) => ({
    idempotencyKey: "attempt-intent-request-123",
    kind: "attempt",
    request: { ...attempt, version: sessionVersion.sessionVersion },
    sessionId: sessionVersion.sessionId,
  }));
  pageMocks.revealIntent.mockImplementation((sessionVersion) => ({
    idempotencyKey: "solution-intent-request-123",
    kind: "solution",
    request: { version: sessionVersion.sessionVersion },
    sessionId: sessionVersion.sessionId,
  }));
  pageMocks.completeIntent.mockImplementation((sessionVersion, selectedAttemptId) => ({
    idempotencyKey: "complete-intent-request-123",
    kind: "complete",
    request: {
      attemptId: selectedAttemptId,
      version: sessionVersion.sessionVersion,
    },
    sessionId: sessionVersion.sessionId,
  }));
  pageMocks.setFavoriteIntent.mockImplementation((problem, favorite) => ({
    favorite,
    idempotencyKey: "favorite-intent-request-123",
    kind: "set-favorite",
    problemId: problem.id,
  }));
  pageMocks.saveNoteIntent.mockImplementation((selectedProblemId, body, expectedVersion) => ({
    body,
    expectedVersion,
    idempotencyKey: "note-intent-request-1234567",
    kind: "save-note",
    problemId: selectedProblemId,
  }));
});

describe("ProblemsPage", () => {
  it("loads the native list and keeps search, set, level, progress, and source in the URL query", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /题目 Problems/u })).toBeVisible();
    expect(screen.getByRole("region", { name: "题目列表" })).toBeVisible();
    expect(screen.getByRole("button", { name: /两数之和/u })).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "搜索题目" }), "two sum");
    await user.click(screen.getByRole("button", { name: "搜索" }));
    await user.click(within(screen.getByRole("group", { name: "题集" }))
      .getByRole("button", { name: "Hot 100" }));
    await user.click(within(screen.getByRole("group", { name: "难度" }))
      .getByRole("button", { name: "中等" }));
    await user.click(within(screen.getByRole("group", { name: "进度" }))
      .getByRole("button", { name: "进行中" }));
    await user.click(within(screen.getByRole("group", { name: "来源" }))
      .getByRole("button", { name: "QuantGym Curated" }));

    await waitFor(() => {
      expect(currentSearch().get("q")).toBe("two sum");
      expect(currentSearch().get("hot100")).toBe("true");
      expect(currentSearch().get("difficulty")).toBe("Medium");
      expect(currentSearch().get("status")).toBe("in_progress");
      expect(currentSearch().get("source")).toBe("quantgym-curated");
    });
    expect(pageMocks.problemQueryOptions).toHaveBeenLastCalledWith({
      enabled: true,
      filters: {
        difficulty: "Medium",
        hot100: true,
        limit: 50,
        q: "two sum",
        source: "quantgym-curated",
        status: "in_progress",
      },
      ownerScope,
    });
  });

  it("selects a list item into the URL-backed detail pane", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /两数之和/u }));

    await waitFor(() => expect(currentSearch().get("problem")).toBe(problemId));
    expect(pageMocks.useDetailQuery).toHaveBeenLastCalledWith({
      ownerScope,
      problemId,
    });
    expect(screen.getByRole("heading", { level: 2, name: "两数之和" })).toBeVisible();
    expect(screen.getByText("返回和为目标值的两个数字下标。")).toBeVisible();
  });

  it("fails invalid duplicate or conflicting URL state closed and can return to a safe list", async () => {
    const user = userEvent.setup();
    renderPage({ initialEntry: "/problems?favorite=true&hot100=true" });

    expect(screen.getByRole("alert")).toHaveTextContent("无法安全打开这个题库链接");
    expect(pageMocks.problemQueryOptions).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
    expect(pageMocks.useDetailQuery).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "返回安全题库" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/problems$/u));
  });

  it("renders recoverable list and detail query failures without stale data", () => {
    pageMocks.problemQuery = {
      ...makeQueryState<ProblemListResponse>(undefined),
      error: new ApiError({
        code: "PROBLEMS_UNAVAILABLE",
        message: "题库服务暂时不可用",
        requestId: "req-problems-list-123",
        retryable: true,
        status: 503,
      }),
      isError: true,
      isPending: false,
    };
    const listFailure = renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("暂时无法载入题库");
    expect(screen.getByRole("alert")).toHaveTextContent("题库服务暂时不可用");
    listFailure.unmount();

    pageMocks.problemQuery = makeQueryState(problemList);
    pageMocks.detailQuery = {
      ...makeQueryState<ProblemDetail>(undefined),
      error: new ApiError({
        code: "PROBLEM_UNAVAILABLE",
        message: "题目详情暂时不可用",
        requestId: "req-problem-detail-123",
        retryable: true,
        status: 503,
      }),
      isError: true,
      isPending: false,
    };
    renderPage({ initialEntry: `/problems?problem=${problemId}` });

    expect(screen.getByRole("alert")).toHaveTextContent("暂时无法载入题库");
    expect(screen.getByRole("alert")).toHaveTextContent("题目详情暂时不可用");
  });

  it("submits a start intent through the durable training workflow", async () => {
    const user = userEvent.setup();
    renderPage({ initialEntry: `/problems?problem=${problemId}` });

    await user.click(screen.getByRole("button", { name: "开始这道题" }));

    expect(pageMocks.startIntent).toHaveBeenCalledWith({ problemId });
    expect(pageMocks.trainingWorkflow.submit).toHaveBeenCalledWith({
      idempotencyKey: "start-intent-request-12345",
      kind: "start",
      request: { problemId },
    });
    expect(pageMocks.trainingOptions?.onReceipt).toEqual(expect.any(Function));
  });

  it("maps every active-session control to a versioned hint, attempt, solution, or completion intent", async () => {
    const user = userEvent.setup();
    renderPage({
      initialEntry: `/problems?problem=${problemId}&session=${sessionId}&task=${taskId}`,
    });

    expect(screen.getByRole("button", { name: "使用提示" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /查看参考解析/u })).toBeEnabled();
    expect(screen.getByRole("button", { name: "完成本次训练" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "使用提示" }));
    await user.type(screen.getByRole("textbox", { name: "你的答案" }), "Use a hash map");
    await user.selectOptions(screen.getByRole("combobox", { name: "作答方式" }), "code");
    await user.click(screen.getByRole("button", { name: "提交作答" }));
    await user.click(screen.getByRole("button", { name: /查看参考解析/u }));
    await user.click(screen.getByRole("button", { name: "完成本次训练" }));

    const version = { sessionId, sessionVersion: 7 };
    expect(pageMocks.hintIntent).toHaveBeenCalledWith(version);
    expect(pageMocks.submitAttemptIntent).toHaveBeenCalledWith(version, {
      answer: "Use a hash map",
      kind: "code",
    });
    expect(pageMocks.revealIntent).toHaveBeenCalledWith(version);
    expect(pageMocks.completeIntent).toHaveBeenCalledWith(version, attemptId);
    expect(pageMocks.trainingWorkflow.submit).toHaveBeenCalledTimes(4);
  });

  it("shows a confirmed result with XP, skill, plan, and a URL-backed next action", async () => {
    const user = userEvent.setup();
    pageMocks.sessionQuery = makeQueryState({
      ...activeSession,
      sessionVersion: 8,
      status: "completed",
    });
    pageMocks.resultQuery = makeQueryState(completedResult);
    renderPage({
      initialEntry: `/problems?problem=${problemId}&session=${sessionId}&task=${taskId}`,
    });

    const result = screen.getByRole("region", { name: "训练完成" });
    expect(result).toHaveTextContent("88");
    expect(result).toHaveTextContent("+35 XP");
    expect(result).toHaveTextContent("arrays +12 · 最佳 88");
    expect(result).toHaveTextContent("关联计划任务已完成。");
    expect(result).toHaveTextContent("继续推荐题目");

    await user.click(within(result).getByRole("button", { name: "继续推荐题目" }));
    await waitFor(() => {
      expect(currentSearch().get("problem")).toBe(secondProblemId);
      expect(currentSearch().has("session")).toBe(false);
      expect(currentSearch().has("task")).toBe(false);
    });
  });

  it("uses an explicit mobile back action and prioritizes the English title in English mode", async () => {
    const user = userEvent.setup();
    renderPage({
      initialEntry: `/problems?problem=${problemId}`,
      language: "en",
    });

    expect(screen.getByRole("heading", { level: 2, name: "Two Sum" })).toBeVisible();
    expect(screen.getByText("Return the indices of two numbers that add up to the target.")).toBeVisible();
    const back = screen.getByRole("button", { name: /Back to problem list/u });
    expect(back).toHaveAttribute("type", "button");

    await user.click(back);
    await waitFor(() => expect(currentSearch().has("problem")).toBe(false));
    expect(screen.getByRole("heading", { level: 2, name: "Choose a problem to begin" }))
      .toBeVisible();
    await waitFor(() => (
      expect(screen.getByRole("button", { name: /Two Sum/u })).toHaveFocus()
    ));
  });

  it("preserves an active session when the selected problem is clicked again", async () => {
    const user = userEvent.setup();
    renderPage({
      initialEntry: `/problems?problem=${problemId}&session=${sessionId}`,
    });

    await user.click(screen.getByRole("button", { name: /两数之和/u }));

    expect(currentSearch().get("problem")).toBe(problemId);
    expect(currentSearch().get("session")).toBe(sessionId);
  });

  it("keeps cursor history aligned with browser back, forward, and direct cursor entry", async () => {
    const user = userEvent.setup();
    pageMocks.problemQuery = makeQueryState({
      ...problemList,
      nextCursor: "cursor-page-2",
    });
    const rendered = renderPage();

    await user.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(currentSearch().get("cursor")).toBe("cursor-page-2"));
    expect(screen.getByText("Page 2")).toBeVisible();
    expect(screen.getByRole("button", { name: "上一页" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Test history back" }));
    await waitFor(() => expect(currentSearch().has("cursor")).toBe(false));
    expect(screen.getByText("Page 1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Test history forward" }));
    await waitFor(() => expect(currentSearch().get("cursor")).toBe("cursor-page-2"));
    expect(screen.getByText("Page 2")).toBeVisible();
    rendered.unmount();

    renderPage({ initialEntry: "/problems?cursor=direct-page" });
    expect(screen.getByText("Page 2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "上一页" }));
    await waitFor(() => expect(currentSearch().has("cursor")).toBe(false));
  });

  it("discards an unsubmitted search edit after navigating away and returning", async () => {
    const user = userEvent.setup();
    renderPage({ initialEntry: "/problems?q=two" });
    const searchbox = screen.getByRole("searchbox", { name: "搜索题目" });

    await user.clear(searchbox);
    await user.type(searchbox, "local draft");
    expect(searchbox).toHaveValue("local draft");
    await user.click(screen.getByRole("button", { name: /两数之和/u }));
    await waitFor(() => expect(searchbox).toHaveValue("two"));

    await user.click(screen.getByRole("button", { name: "Test history back" }));
    await waitFor(() => expect(searchbox).toHaveValue("two"));
  });

  it("fails a cross-tab note version change closed before saving the local edit", async () => {
    const user = userEvent.setup();
    const originalDetail: ProblemDetail = {
      ...detail,
      note: {
        body: "Original server note",
        updatedAt: "2026-07-27T08:00:00Z",
        version: 1,
      },
      noteExists: true,
      noteVersion: 1,
    };
    pageMocks.detailQuery = makeQueryState(originalDetail);
    const rendered = renderPage({
      initialEntry: `/problems?problem=${problemId}`,
    });
    const note = screen.getByRole("textbox", { name: "题目笔记" });

    await user.clear(note);
    await user.type(note, "Local unsaved edit");
    pageMocks.detailQuery = makeQueryState({
      ...originalDetail,
      note: {
        body: "Newer note from another tab",
        updatedAt: "2026-07-27T08:05:00Z",
        version: 2,
      },
      noteVersion: 2,
    });
    rendered.rerenderPage();

    expect(screen.getByRole("alert", { name: "笔记版本已变化" })).toBeVisible();
    expect(screen.getByRole("button", { name: "保存笔记" })).toBeDisabled();
    expect(pageMocks.problemWorkflow.submit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "载入最新笔记" }));
    expect(note).toHaveValue("Newer note from another tab");
  });

  it("rejects mismatched problem details and training results", () => {
    pageMocks.detailQuery = makeQueryState({
      ...detail,
      id: secondProblemId,
    });
    const detailMismatch = renderPage({
      initialEntry: `/problems?problem=${problemId}`,
    });
    expect(screen.getByRole("alert")).toHaveTextContent("题目数据不匹配");
    detailMismatch.unmount();

    pageMocks.detailQuery = makeQueryState(detail);
    pageMocks.sessionQuery = makeQueryState({
      ...activeSession,
      sessionVersion: 8,
      status: "completed",
    });
    pageMocks.resultQuery = makeQueryState({
      ...completedResult,
      problemId: secondProblemId,
    });
    renderPage({
      initialEntry: `/problems?problem=${problemId}&session=${sessionId}`,
    });
    expect(screen.getByRole("alert")).toHaveTextContent("训练结果不匹配");
  });
});
