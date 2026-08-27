import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type Route,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";
import { capturePhase2ReviewImage } from "./phase2-review.fixture";

type ProblemsTheme = "light" | "dark";
type FailureState =
  | "recoverable-error"
  | "non-recoverable-error"
  | "permission-denied"
  | "stale-version-conflict";
type ProblemOperation =
  | "use-hint"
  | "submit-attempt"
  | "reveal-solution"
  | "save-note"
  | "toggle-favorite"
  | "complete";

type FavoriteFixture = {
  favorite: boolean;
  stateId: string | null;
  updatedAt: string | null;
  version: number | null;
};

type NoteFixture = {
  body: string;
  updatedAt: string;
  version: number;
};

type ProblemFixture = {
  category: string;
  companies: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  favorite: FavoriteFixture;
  hot100: boolean;
  id: string;
  note: NoteFixture | null;
  noteExists: boolean;
  noteVersion: number | null;
  progress: {
    attemptCount: number;
    bestScore: number | null;
    completedAt: string | null;
    hintCount: number;
    lastPracticedAt: string | null;
    lastScore: number | null;
    solutionRevealedAt: string | null;
    status: "unstarted" | "in_progress" | "completed";
    version: number | null;
  };
  promptEn: string | null;
  promptZh: string | null;
  source: {
    contentVersion: string;
    name: string;
    slug: string;
  };
  tags: string[];
  titleEn: string | null;
  titleZh: string | null;
  version: number;
};

type TrainingSessionFixture = {
  attemptId: string | null;
  hintEn: string | null;
  hintZh: string | null;
  lastActivityAt: string;
  planTaskId: string | null;
  problemId: string;
  score: number | null;
  sessionId: string;
  sessionVersion: number;
  solutionEn: string | null;
  solutionZh: string | null;
  startedAt: string;
  status: "active" | "completed";
};

type MutationCall = {
  body: unknown;
  idempotencyKey: string | undefined;
  operation: ProblemOperation;
};

type ProblemsApiState = {
  calls: MutationCall[];
  eventSequence: number;
  failure: Readonly<{
    operation: ProblemOperation;
    state: FailureState;
  }> | null;
  preferences: {
    language: "zh-CN";
    theme: ProblemsTheme;
    version: number;
  };
  problem: ProblemFixture;
  rewardCount: number;
  session: TrainingSessionFixture;
};

const problemId = "11111111-1111-4111-8111-111111111111";
const secondProblemId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const eventId = "55555555-5555-4555-8555-555555555555";
const favoriteId = "66666666-6666-4666-8666-666666666666";
const planTaskId = "77777777-7777-4777-8777-777777777777";
const fixedStartedAt = "2026-07-27T02:00:00.000Z";
const fixedUpdatedAt = "2026-07-27T03:00:00.000Z";
const fixedCompletedAt = "2026-07-27T04:00:00.000Z";
const csrfToken = "e2e_problems_csrf_abcdefghijklmnopqrstuvwxyz";
const problemTitle = "随机变量的期望";
const secondProblemTitle = "贝叶斯更新";
const pageTitle = "题目 Problems";
const shellReadyTimeoutMs = 20_000;

test.describe.configure({ mode: "serial", retries: 0, timeout: 60_000 });

const createProblem = (
  id = problemId,
  titleZh = problemTitle,
  titleEn = "Expected Value of a Random Variable",
): ProblemFixture => ({
  category: "概率统计",
  companies: ["Jane Street", "Citadel"],
  difficulty: id === problemId ? "Medium" : "Hard",
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: id === problemId,
  id,
  note: null,
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
  promptEn: "Let X take values 1 and 3 with equal probability. Find E[X].",
  promptZh: "随机变量 X 以相同概率取 1 和 3，求 E[X]。",
  source: {
    contentVersion: "preview-internal-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["期望", "随机变量"],
  titleEn,
  titleZh,
  version: 1,
});

const createSession = (): TrainingSessionFixture => ({
  attemptId: null,
  hintEn: null,
  hintZh: null,
  lastActivityAt: fixedStartedAt,
  planTaskId,
  problemId,
  score: null,
  sessionId,
  sessionVersion: 1,
  solutionEn: null,
  solutionZh: null,
  startedAt: fixedStartedAt,
  status: "active",
});

const createApiState = (): ProblemsApiState => ({
  calls: [],
  eventSequence: 0,
  failure: null,
  preferences: {
    language: "zh-CN",
    theme: "light",
    version: 1,
  },
  problem: createProblem(),
  rewardCount: 0,
  session: createSession(),
});

const problemSummary = (problem: ProblemFixture) => ({
  category: problem.category,
  companies: problem.companies,
  difficulty: problem.difficulty,
  favorite: problem.favorite,
  hot100: problem.hot100,
  id: problem.id,
  noteExists: problem.noteExists,
  noteVersion: problem.noteVersion,
  progress: problem.progress,
  source: problem.source,
  tags: problem.tags,
  titleEn: problem.titleEn,
  titleZh: problem.titleZh,
  version: problem.version,
});

const problemDetail = (problem: ProblemFixture) => ({
  ...problemSummary(problem),
  note: problem.note,
  promptEn: problem.promptEn,
  promptZh: problem.promptZh,
});

const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
) => ({
  body: JSON.stringify(body),
  contentType: "application/json",
  headers,
  status,
});

const parseRequestBody = (request: Request): unknown => (
  request.postData() === null ? null : request.postDataJSON() as unknown
);

const operationFor = (request: Request): ProblemOperation | null => {
  const pathname = new URL(request.url()).pathname;
  const method = request.method();
  if (method === "POST" && pathname.endsWith("/hint")) return "use-hint";
  if (method === "POST" && pathname.endsWith("/attempts")) return "submit-attempt";
  if (method === "POST" && pathname.endsWith("/solution")) return "reveal-solution";
  if (method === "PUT" && pathname.endsWith("/note")) return "save-note";
  if (method === "PUT" && pathname.endsWith("/favorite")) return "toggle-favorite";
  if (method === "POST" && pathname.endsWith("/complete")) return "complete";
  return null;
};

const failureResponse = (
  operation: ProblemOperation,
  state: FailureState,
) => {
  const fixture = {
    "recoverable-error": {
      code: "TRAINING_SERVICE_UNAVAILABLE",
      message: "训练服务暂时不可用。",
      retryable: true,
      status: 503,
    },
    "non-recoverable-error": {
      code: "TRAINING_INPUT_INVALID",
      message: "当前训练内容无法提交。",
      retryable: false,
      status: 422,
    },
    "permission-denied": {
      code: "AUTH_PERMISSION_DENIED",
      message: "当前会话需要重新验证。",
      retryable: false,
      status: 403,
    },
    "stale-version-conflict": {
      code: "TRAINING_VERSION_CONFLICT",
      message: "训练进度已在其他位置更新。",
      retryable: false,
      status: 409,
    },
  }[state];
  const requestId = `e2e-problems-${operation}-${state}`;
  return jsonResponse({
    code: fixture.code,
    fieldErrors: {},
    message: fixture.message,
    requestId,
    retryable: fixture.retryable,
  }, fixture.status, { "x-request-id": requestId });
};

const nextEvent = (state: ProblemsApiState) => {
  state.eventSequence += 1;
  state.session.sessionVersion += 1;
  state.session.lastActivityAt = fixedUpdatedAt;
  return {
    eventId,
    eventSequence: state.eventSequence,
    sessionId,
    sessionVersion: state.session.sessionVersion,
  };
};

const applySuccessfulMutation = (
  operation: ProblemOperation,
  request: Request,
  state: ProblemsApiState,
) => {
  if (operation === "use-hint") {
    const event = nextEvent(state);
    state.session.hintZh = "先利用期望的线性性质，再代入两个离散取值。";
    state.session.hintEn = "Use linearity of expectation, then substitute the two values.";
    state.problem.progress.hintCount += 1;
    state.problem.progress.status = "in_progress";
    return jsonResponse({
      ...event,
      hintEn: state.session.hintEn,
      hintZh: state.session.hintZh,
    });
  }

  if (operation === "submit-attempt") {
    const event = nextEvent(state);
    state.session.attemptId = attemptId;
    state.session.score = 88;
    state.problem.progress.attemptCount += 1;
    state.problem.progress.bestScore = 88;
    state.problem.progress.lastScore = 88;
    state.problem.progress.lastPracticedAt = fixedUpdatedAt;
    state.problem.progress.status = "in_progress";
    state.problem.progress.version = (state.problem.progress.version ?? 0) + 1;
    return jsonResponse({
      ...event,
      attemptId,
      score: 88,
    });
  }

  if (operation === "reveal-solution") {
    const event = nextEvent(state);
    state.session.solutionZh = "E[X] = 1 × 1/2 + 3 × 1/2 = 2。";
    state.session.solutionEn = "E[X] = 1 × 1/2 + 3 × 1/2 = 2.";
    state.problem.progress.solutionRevealedAt = fixedUpdatedAt;
    state.problem.progress.status = "in_progress";
    return jsonResponse({
      ...event,
      solutionEn: state.session.solutionEn,
      solutionZh: state.session.solutionZh,
    });
  }

  if (operation === "save-note") {
    const payload = parseRequestBody(request) as { body: string };
    const version = (state.problem.note?.version ?? 0) + 1;
    state.problem.note = {
      body: payload.body,
      updatedAt: fixedUpdatedAt,
      version,
    };
    state.problem.noteExists = true;
    state.problem.noteVersion = version;
    return jsonResponse(state.problem.note);
  }

  if (operation === "toggle-favorite") {
    const payload = parseRequestBody(request) as { favorite: boolean };
    state.problem.favorite = payload.favorite
      ? {
          favorite: true,
          stateId: favoriteId,
          updatedAt: fixedUpdatedAt,
          version: 1,
        }
      : {
          favorite: false,
          stateId: null,
          updatedAt: null,
          version: null,
        };
    return jsonResponse(state.problem.favorite);
  }

  const event = nextEvent(state);
  state.session.status = "completed";
  state.problem.progress.completedAt = fixedCompletedAt;
  state.problem.progress.status = "completed";
  state.problem.progress.version = (state.problem.progress.version ?? 0) + 1;
  state.rewardCount += 1;
  return jsonResponse({
    nextAction: {
      problemId: secondProblemId,
      target: "problems",
    },
    planEffect: {
      planVersion: 5,
      taskCompleted: true,
    },
    sessionId,
    sessionVersion: event.sessionVersion,
    skillEffect: {
      currentBestScore: 88,
      delta: 88,
      previousBestScore: null,
      skillKey: "probability",
    },
    xpDelta: 40,
  });
};

const responseFor = (request: Request, state: ProblemsApiState) => {
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();
  const operation = operationFor(request);

  if (pathname === "/api/v2/me" && method === "GET") {
    return jsonResponse({
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences: state.preferences,
    }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }

  if (pathname === "/api/v2/auth/csrf" && method === "GET") {
    return jsonResponse({ csrfToken }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }

  if (pathname === "/api/v2/preferences" && method === "PATCH") {
    const payload = parseRequestBody(request) as {
      language?: "zh-CN";
      theme?: ProblemsTheme;
    };
    state.preferences = {
      language: payload.language ?? state.preferences.language,
      theme: payload.theme ?? state.preferences.theme,
      version: state.preferences.version + 1,
    };
    return jsonResponse(state.preferences);
  }

  if (pathname === "/api/v2/problems" && method === "GET") {
    return jsonResponse({
      availableSources: [state.problem.source],
      items: [
        problemSummary(state.problem),
        problemSummary(createProblem(
          secondProblemId,
          secondProblemTitle,
          "Bayesian Updating",
        )),
      ],
      nextCursor: null,
    });
  }

  if (pathname === `/api/v2/problems/${problemId}` && method === "GET") {
    return jsonResponse(problemDetail(state.problem));
  }

  if (pathname === `/api/v2/problems/${secondProblemId}` && method === "GET") {
    return jsonResponse(problemDetail(createProblem(
      secondProblemId,
      secondProblemTitle,
      "Bayesian Updating",
    )));
  }

  if (pathname === "/api/v2/training/sessions" && method === "POST") {
    state.session = createSession();
    return jsonResponse({
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: state.session.sessionVersion,
    }, 201);
  }

  if (pathname === `/api/v2/training/sessions/${sessionId}` && method === "GET") {
    return jsonResponse(state.session);
  }

  if (
    pathname === `/api/v2/training/sessions/${sessionId}/result`
    && method === "GET"
  ) {
    return jsonResponse({
      completedAt: fixedCompletedAt,
      nextAction: {
        problemId: secondProblemId,
        target: "problems",
      },
      planEffect: {
        planVersion: 5,
        taskCompleted: true,
      },
      problemId,
      score: state.session.score ?? 88,
      sessionId,
      sessionVersion: state.session.sessionVersion,
      skillEffect: {
        currentBestScore: 88,
        delta: 88,
        previousBestScore: null,
        skillKey: "probability",
      },
      xpDelta: 40,
    });
  }

  if (operation !== null) {
    state.calls.push({
      body: parseRequestBody(request),
      idempotencyKey: request.headers()["x-idempotency-key"],
      operation,
    });
    if (
      state.failure !== null
      && state.failure.operation === operation
    ) {
      return failureResponse(operation, state.failure.state);
    }
    return applySuccessfulMutation(operation, request, state);
  }

  if (pathname === "/api/v2/notifications" && method === "GET") {
    return jsonResponse({ items: [], nextCursor: null, unreadCount: 0 });
  }

  if (pathname === "/api/v2/todos" && method === "GET") {
    return jsonResponse({ items: [] });
  }

  if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
    return jsonResponse({
      planProgress: {
        completedTasks: state.session.status === "completed" ? 1 : 0,
        planId: "88888888-8888-4888-8888-888888888888",
        totalTasks: 1,
        version: state.session.status === "completed" ? 5 : 4,
      },
      profile: {
        displayName: "Gary",
        level: 3,
        streakDays: 2,
        weeklyXp: state.rewardCount === 0 ? 120 : 160,
      },
      recentXp: [],
      resourceVersions: {
        plan: state.session.status === "completed" ? 5 : 4,
        training: state.session.sessionVersion,
      },
      todayTask: {
        actionResourceId: problemId,
        actionTarget: "problems",
        id: planTaskId,
        rewardXp: 40,
        status: state.session.status === "completed" ? "completed" : "open",
        title: "完成今日概率训练",
        unlockReason: "完成后更新概率能力与训练计划。",
        version: state.session.status === "completed" ? 2 : 1,
      },
      unreadNotificationCount: 0,
      weakness: {
        label: "概率",
        recommendedProblemId: problemId,
        score: 62,
        skillKey: "probability",
      },
    });
  }

  if (pathname === "/api/v2/auth/logout" && method === "POST") {
    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({
    code: "E2E_API_ROUTE_UNHANDLED",
    fieldErrors: {},
    message: `${method} ${pathname}`,
    requestId: "e2e-problems-unhandled",
    retryable: false,
  }, 404);
};

const mockProblemsApi = async (page: Page) => {
  await mockLegacyPreviewFrame(page);
  const state = createApiState();
  await page.route("**/api/v2/**", async (route: Route) => {
    await route.fulfill(responseFor(route.request(), state));
  });
  return state;
};

const directProblemUrl = (withSession: boolean): string => (
  withSession
    ? `/problems?problem=${problemId}&session=${sessionId}`
    : `/problems?problem=${problemId}`
);

const expectProblemsReady = async (page: Page) => {
  await expect(page.getByRole("heading", { name: pageTitle, exact: true })).toBeVisible({
    timeout: shellReadyTimeoutMs,
  });
  await expect(page.locator(`article[data-problem-id="${problemId}"]`)).toBeVisible({
    timeout: shellReadyTimeoutMs,
  });
  await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
};

const prepareOperation = async (
  page: Page,
  state: ProblemsApiState,
  operation: ProblemOperation,
) => {
  if (operation === "complete") {
    state.session.attemptId = attemptId;
    state.session.score = 88;
    state.problem.progress.attemptCount = 1;
    state.problem.progress.bestScore = 88;
    state.problem.progress.lastScore = 88;
    state.problem.progress.status = "in_progress";
    state.problem.progress.version = 1;
  }
  await page.goto(directProblemUrl(!["save-note", "toggle-favorite"].includes(operation)));
  await expectProblemsReady(page);
};

const submitOperation = async (
  page: Page,
  operation: ProblemOperation,
) => {
  const detail = page.locator(`article[data-problem-id="${problemId}"]`);
  if (operation === "use-hint") {
    await detail.getByRole("button", { name: "使用提示", exact: true }).click();
    return;
  }
  if (operation === "submit-attempt") {
    await detail.getByRole("textbox", { name: "你的答案", exact: true })
      .fill("E[X] = 2");
    await detail.getByRole("button", { name: "提交作答", exact: true }).click();
    return;
  }
  if (operation === "reveal-solution") {
    await detail.getByRole("button", { name: "查看参考解析", exact: true }).click();
    return;
  }
  if (operation === "save-note") {
    const note = detail.getByRole("textbox", { name: "题目笔记", exact: true });
    await note.fill("先写出离散分布，再计算加权平均。");
    await note.press("Tab");
    return;
  }
  if (operation === "toggle-favorite") {
    await detail.getByRole("button", { name: "收藏题目", exact: true }).click();
    return;
  }
  await detail.getByRole("button", { name: "完成本次训练", exact: true }).click();
};

const expectOperationSucceeded = async (
  page: Page,
  operation: ProblemOperation,
) => {
  const detail = page.locator(`article[data-problem-id="${problemId}"]`);
  if (operation === "use-hint") {
    await expect(detail.getByText(
      "先利用期望的线性性质，再代入两个离散取值。",
      { exact: true },
    )).toBeVisible();
    return;
  }
  if (operation === "submit-attempt") {
    await expect(detail.getByText("最近一次得分：88", { exact: true })).toBeVisible();
    return;
  }
  if (operation === "reveal-solution") {
    await expect(detail.getByText(
      "E[X] = 1 × 1/2 + 3 × 1/2 = 2。",
      { exact: true },
    )).toBeVisible();
    return;
  }
  if (operation === "save-note") {
    await expect(detail.getByRole("textbox", { name: "题目笔记", exact: true }))
      .toHaveValue("先写出离散分布，再计算加权平均。");
    return;
  }
  if (operation === "toggle-favorite") {
    await expect(detail.getByRole("button", { name: "取消收藏", exact: true }))
      .toHaveAttribute("aria-pressed", "true");
    return;
  }
  const result = detail.locator('section[aria-label="训练完成"]');
  await expect(result).toBeVisible();
  await expect(result.getByText("+40 XP", { exact: true })).toBeVisible();
  await expect(result.getByText("关联计划任务已完成。", { exact: true })).toBeVisible();
};

const expectOperationReady = async (
  page: Page,
  operation: ProblemOperation,
) => {
  const detail = page.locator(`article[data-problem-id="${problemId}"]`);
  if (operation === "use-hint") {
    await expect(detail.getByRole("button", { name: "使用提示", exact: true })).toBeEnabled();
    return;
  }
  if (operation === "submit-attempt") {
    await expect(detail.getByRole("textbox", { name: "你的答案", exact: true })).toBeEnabled();
    return;
  }
  if (operation === "reveal-solution") {
    await expect(detail.getByRole("button", { name: "查看参考解析", exact: true }))
      .toBeEnabled();
    return;
  }
  if (operation === "save-note") {
    await expect(detail.getByRole("textbox", { name: "题目笔记", exact: true })).toBeEnabled();
    return;
  }
  if (operation === "toggle-favorite") {
    await expect(detail.getByRole("button", { name: "收藏题目", exact: true })).toBeEnabled();
    return;
  }
  await expect(detail.getByRole("button", { name: "完成本次训练", exact: true }))
    .toBeEnabled();
};

const recoveryPanel = (
  page: Page,
  state: FailureState | "offline-draft",
) => page.locator(`[data-recovery-state="${state}"]`).first();

const expectNoAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, results.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
};

test(
  "@phase2:problems @visual:problems:light-dark "
  + "题目页覆盖桌面、笔记本、平板与移动端明暗布局",
  async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    await mockProblemsApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const viewports = [
      { height: 900, name: "desktop", width: 1_440 },
      { height: 720, name: "laptop", width: 1_280 },
      { height: 768, name: "tablet", width: 1_024 },
      { height: 844, name: "mobile", width: 390 },
    ] as const;

    await page.setViewportSize({ height: 900, width: 1_440 });
    await page.goto(directProblemUrl(false));
    await expectProblemsReady(page);

    for (const theme of ["light", "dark"] as const) {
      if (theme === "dark") {
        await page.setViewportSize({ height: 900, width: 1_440 });
        await page.getByRole("button", {
          name: "切换到深色主题",
          exact: true,
        }).click();
      }
      await expect(page.locator("html")).toHaveAttribute(
        "data-qg-theme",
        theme,
      );

      for (const viewport of viewports) {
        await page.setViewportSize({
          height: viewport.height,
          width: viewport.width,
        });
        await expectProblemsReady(page);
        await expectNoHorizontalOverflow(page);

        const filters = page.getByRole("search", { name: "筛选题目", exact: true });
        if (viewport.name === "mobile") {
          await expect(filters).toBeHidden();
          await expect(page.getByRole("button", {
            name: "返回题目列表",
            exact: true,
          })).toBeVisible();
        } else {
          await expect(filters).toBeVisible();
          await expect(page.getByRole("region", {
            name: "题目列表",
            exact: true,
          })).toBeVisible();
        }
        await expect(page).toHaveScreenshot(
          `problems-${theme}-${viewport.name}.png`,
          { fullPage: true, timeout: 20_000 },
        );
        await capturePhase2ReviewImage(page, {
          routeId: "problems",
          theme,
          viewportId: viewport.name,
        });
      }
    }
  },
);

test(
  "@phase2:problems @a11y:problems "
  + "题目列表详情与移动端返回路径通过无障碍门禁",
  async ({ page }) => {
    await mockProblemsApi(page);
    await page.setViewportSize({ width: 1_440, height: 900 });
    await page.goto(directProblemUrl(true));
    await expectProblemsReady(page);
    await expectNoAxeViolations(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", {
      name: "返回题目列表",
      exact: true,
    })).toBeVisible();
    const mobileTargets = await page.locator("main button:visible").evaluateAll((elements) => (
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return { height: bounds.height, width: bounds.width };
      })
    ));
    expect(mobileTargets.length).toBeGreaterThan(0);
    expect(mobileTargets.every(({ height, width }) => height >= 44 && width >= 44)).toBe(true);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
  },
);

test(
  "@phase2:problems @e2e:problem-attempt-completion "
  + "用户可从题目列表完成提示、作答、结果、XP 与计划更新闭环",
  async ({ page }) => {
    const api = await mockProblemsApi(page);
    await page.goto("/problems");
    await expect(page.getByRole("heading", { name: pageTitle, exact: true })).toBeVisible({
      timeout: shellReadyTimeoutMs,
    });

    await page.getByRole("button", { name: new RegExp(problemTitle, "u") }).first().click();
    await expectProblemsReady(page);
    await page.getByRole("button", { name: "开始这道题", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`session=${sessionId}`, "u"));

    await page.getByRole("button", { name: "使用提示", exact: true }).click();
    await expect(page.getByText(
      "先利用期望的线性性质，再代入两个离散取值。",
      { exact: true },
    )).toBeVisible();

    await page.getByRole("textbox", { name: "你的答案", exact: true }).fill("E[X] = 2");
    await page.getByRole("button", { name: "提交作答", exact: true }).click();
    await expect(page.getByText("最近一次得分：88", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "完成本次训练", exact: true }).click();

    const result = page.locator('section[aria-label="训练完成"]');
    await expect(result.getByText("本次训练结果", { exact: true })).toBeVisible();
    await expect(result.getByText("+40 XP", { exact: true })).toBeVisible();
    await expect(result.getByText("关联计划任务已完成。", { exact: true })).toBeVisible();
    const childOrder = await result.evaluate((element) => (
      Array.from(element.children).map((child) => child.getAttribute("aria-label") ?? child.tagName)
    ));
    expect(childOrder.at(-1)).toBe("训练奖励");
    expect(api.rewardCount).toBe(1);
  },
);

const operations = [
  "use-hint",
  "submit-attempt",
  "reveal-solution",
  "save-note",
  "toggle-favorite",
  "complete",
] as const satisfies readonly ProblemOperation[];

for (const operation of operations) {
  const idempotencyTag = operation === "complete"
    ? " @mutation:problems.complete:retry-idempotency"
    : "";

  test(
    `@phase2:problems @mutation:problems.${operation}:recoverable-error `
    + `@mutation:problems.${operation}:retry${idempotencyTag} `
    + `${operation} 可保留原意图安全重试`,
    async ({ page }) => {
      const api = await mockProblemsApi(page);
      await prepareOperation(page, api, operation);
      api.failure = { operation, state: "recoverable-error" };
      await submitOperation(page, operation);

      const recovery = recoveryPanel(page, "recoverable-error");
      await expect(recovery).toBeVisible();
      expect(api.calls.filter((call) => call.operation === operation)).toHaveLength(1);
      api.failure = null;
      await recovery.getByRole("button", { name: "重试", exact: true }).click();

      await expect(recovery).toBeHidden();
      await expectOperationSucceeded(page, operation);
      if (operation === "save-note") {
        expect(api.problem.note?.body).toBe("先写出离散分布，再计算加权平均。");
      }
      if (operation === "complete") {
        const completionCalls = api.calls.filter((call) => call.operation === "complete");
        expect(completionCalls).toHaveLength(2);
        expect(completionCalls[0]?.idempotencyKey).toBeTruthy();
        expect(completionCalls[1]?.idempotencyKey).toBe(
          completionCalls[0]?.idempotencyKey,
        );
        expect(api.rewardCount).toBe(1);
      }
    },
  );

  test(
    `@phase2:problems @mutation:problems.${operation}:non-recoverable-error `
    + `${operation} 的无效更改可被明确放弃`,
    async ({ page }) => {
      const api = await mockProblemsApi(page);
      await prepareOperation(page, api, operation);
      api.failure = { operation, state: "non-recoverable-error" };
      await submitOperation(page, operation);

      const recovery = recoveryPanel(page, "non-recoverable-error");
      await expect(recovery).toBeVisible();
      expect(api.calls.filter((call) => call.operation === operation)).toHaveLength(1);
      await recovery.getByRole("button", {
        name: "返回安全页面",
        exact: true,
      }).click();

      await expect(recovery).toBeHidden();
      await expectOperationReady(page, operation);
    },
  );

  test(
    `@phase2:problems @mutation:problems.${operation}:offline-draft `
    + `${operation} 的离线草稿可在恢复联网后继续提交`,
    async ({ context, page }) => {
      const api = await mockProblemsApi(page);
      await prepareOperation(page, api, operation);
      await context.setOffline(true);
      await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
      await expect(page.getByRole("status", {
        name: "当前处于离线状态",
        exact: true,
      })).toBeVisible();
      await submitOperation(page, operation);

      const recovery = recoveryPanel(page, "offline-draft");
      await expect(recovery).toBeVisible();
      await context.setOffline(false);
      await retryOfflineRecovery(page, recovery, context);

      await expect(recovery).toBeHidden();
      await expectOperationSucceeded(page, operation);
      if (operation === "save-note") {
        expect(api.problem.note?.body).toBe("先写出离散分布，再计算加权平均。");
      }
    },
  );

  test(
    `@phase2:problems @mutation:problems.${operation}:permission-denied `
    + `${operation} 权限失效时只允许重新验证身份`,
    async ({ page }) => {
      const api = await mockProblemsApi(page);
      await prepareOperation(page, api, operation);
      api.failure = { operation, state: "permission-denied" };
      await submitOperation(page, operation);

      const recovery = recoveryPanel(page, "permission-denied");
      await expect(recovery).toBeVisible();
      expect(api.calls.filter((call) => call.operation === operation)).toHaveLength(1);
      await recovery.getByRole("button", { name: "重新登录", exact: true }).click();

      await expect(page).toHaveURL(/\/login\?reauth=1&redirect=/u);
      const redirect = await page.evaluate(() => (
        new URL(window.location.href).searchParams.get("redirect")
      ));
      expect(redirect).toContain("/problems?problem=");
    },
  );

  test(
    `@phase2:problems @mutation:problems.${operation}:stale-version-conflict `
    + `${operation} 版本冲突时载入最新服务端状态`,
    async ({ page }) => {
      const api = await mockProblemsApi(page);
      await prepareOperation(page, api, operation);
      api.failure = { operation, state: "stale-version-conflict" };
      await submitOperation(page, operation);

      const recovery = recoveryPanel(page, "stale-version-conflict");
      await expect(recovery).toBeVisible();
      expect(api.calls.filter((call) => call.operation === operation)).toHaveLength(1);
      api.failure = null;
      await recovery.getByRole("button", {
        name: "载入最新版本",
        exact: true,
      }).click();

      await expect(recovery).toBeHidden();
      await expectOperationReady(page, operation);
    },
  );
}

const retryOfflineRecovery = async (
  page: Page,
  recovery: ReturnType<typeof recoveryPanel>,
  context: BrowserContext,
) => {
  await expect.poll(() => context.browser()?.isConnected() ?? false).toBe(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
  await expect.poll(async () => {
    if (!await recovery.isVisible()) return true;
    const action = recovery.getByRole("button", {
      name: "联网后重试",
      exact: true,
    });
    if (await action.isVisible()) {
      await action.click({ timeout: 750 }).catch(() => undefined);
    }
    return !await recovery.isVisible();
  }, {
    intervals: [100, 250, 500],
    timeout: 10_000,
  }).toBe(true);
};
