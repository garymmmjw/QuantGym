import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { ProblemDetail } from "../../domains/problems/problems.schema";
import { ApiError } from "../../shared/api/errors";
import { I18nProvider, type AppLanguage } from "../../shared/i18n";
import { createAccountScope } from "../../shared/lib/accountScope";
import { ProblemTrainingHandoffPage } from "./ProblemTrainingHandoffPage";

const pageMocks = vi.hoisted(() => ({
  currentUser: {
    data: { email: "gary@example.com" } as { email: string } | null | undefined,
  },
  problem: {
    data: undefined as ProblemDetail | undefined,
    error: null as unknown,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  },
  queryOptions: vi.fn(),
}));

vi.mock("../../domains/account/auth/auth.queries", () => ({
  useCurrentUserQuery: () => pageMocks.currentUser,
}));

vi.mock("../../domains/problems/problems.queries", () => ({
  useProblemDetailQuery: (options: unknown) => {
    pageMocks.queryOptions(options);
    return pageMocks.problem;
  },
}));

const problemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const handoff = { problemId, sessionId } as const;
const detail: ProblemDetail = {
  category: "Array",
  companies: ["QuantGym"],
  difficulty: "Medium",
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: true,
  id: problemId,
  note: {
    body: "先记录已经访问过的数字。",
    updatedAt: "2026-07-27T02:06:00Z",
    version: 1,
  },
  noteExists: true,
  noteVersion: 1,
  progress: {
    attemptCount: 1,
    bestScore: null,
    completedAt: null,
    hintCount: 0,
    lastPracticedAt: "2026-07-27T02:00:00Z",
    lastScore: null,
    solutionRevealedAt: null,
    status: "in_progress",
    version: 2,
  },
  promptEn: "Return the two indices.",
  promptZh: "返回两个下标。",
  source: {
    contentVersion: "preview-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["array", "hash-table"],
  titleEn: "Two Sum",
  titleZh: "两数之和",
  version: 3,
};

const renderPage = (
  route: typeof handoff | null,
  language: AppLanguage = "zh-CN",
) => render(
  <MemoryRouter>
    <I18nProvider language={language}>
      <ProblemTrainingHandoffPage handoff={route} />
    </I18nProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  pageMocks.queryOptions.mockClear();
  pageMocks.currentUser.data = { email: "gary@example.com" };
  pageMocks.problem.data = detail;
  pageMocks.problem.error = null;
  pageMocks.problem.isError = false;
  pageMocks.problem.isFetching = false;
  pageMocks.problem.isPending = false;
  pageMocks.problem.refetch.mockResolvedValue(undefined);
});

describe("ProblemTrainingHandoffPage", () => {
  it("fails an invalid handoff closed before any problem query", () => {
    renderPage(null);

    expect(screen.getByRole("alert")).toHaveTextContent("训练交接链接无效");
    expect(pageMocks.queryOptions).not.toHaveBeenCalled();
    expect(screen.queryByTitle(/旧版兼容页面/u)).not.toBeInTheDocument();
  });

  it("renders an honest loading state while resolving the owner-scoped detail", () => {
    pageMocks.problem.data = undefined;
    pageMocks.problem.isPending = true;

    renderPage(handoff);

    expect(screen.getByRole("status", { name: "正在载入训练题目" })).toBeVisible();
    expect(pageMocks.queryOptions).toHaveBeenCalledWith({
      ownerScope: createAccountScope("gary@example.com"),
      problemId,
    });
    expect(screen.queryByText(sessionId)).not.toBeInTheDocument();
  });

  it("renders the selected V2 problem and the full, neutral handoff reference", () => {
    const rendered = renderPage(handoff);

    expect(screen.getByRole("heading", { level: 1, name: "两数之和" })).toBeVisible();
    expect(screen.getByText("返回两个下标。")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "已接收训练交接" })).toBeVisible();
    expect(screen.getByText("交接编号")).toBeVisible();
    expect(screen.getByText(sessionId)).toHaveTextContent(sessionId);
    expect(screen.getByText("QuantGym Preview")).toBeVisible();
    expect(screen.getByText("先记录已经访问过的数字。")).toBeVisible();
    expect(rendered.container).not.toHaveTextContent(/确认|服务器确认|已验证/u);
    expect(screen.queryByTitle(/旧版兼容页面/u)).not.toBeInTheDocument();
  });

  it("keeps the English handoff language neutral and never claims validation", () => {
    const rendered = renderPage(handoff, "en");

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Training handoff received",
    })).toBeVisible();
    expect(screen.getByText("Handoff reference")).toBeVisible();
    expect(screen.getByText(sessionId)).toHaveTextContent(sessionId);
    expect(rendered.container).not.toHaveTextContent(
      /acknowledged|confirmed|server-confirmed|validated|verified/iu,
    );
  });

  it("shows a retryable query error with its request reference", async () => {
    const user = userEvent.setup();
    pageMocks.problem.data = undefined;
    pageMocks.problem.error = new ApiError({
      code: "PROBLEM_UNAVAILABLE",
      message: "Unavailable",
      requestId: "req-problem-handoff-1",
      retryable: true,
      status: 503,
    });
    pageMocks.problem.isError = true;

    renderPage(handoff);

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(screen.getByText("req-problem-handoff-1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "重新载入题目" }));
    expect(pageMocks.problem.refetch).toHaveBeenCalledOnce();
  });
});
