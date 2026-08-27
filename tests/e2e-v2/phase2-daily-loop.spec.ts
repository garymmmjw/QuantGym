import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";

type CompletionAck = Readonly<{
  nextAction: Readonly<{
    problemId: null;
    target: "overview";
  }>;
  planEffect: Readonly<{
    planVersion: number;
    taskCompleted: true;
  }>;
  sessionId: string;
  sessionVersion: number;
  skillEffect: Readonly<{
    currentBestScore: number;
    delta: number;
    previousBestScore: null;
    skillKey: string;
  }>;
  xpDelta: number;
}>;

type DailyLoopState = {
  completeCalls: Array<Readonly<{
    body: unknown;
    idempotencyKey: string;
  }>>;
  completionAcks: Map<string, CompletionAck>;
  completionRequest: Readonly<{
    body: unknown;
    idempotencyKey: string;
  }> | null;
  eventSequence: number;
  meRequestCount: number;
  plan: ReturnType<typeof createPlan>;
  problem: ReturnType<typeof createProblem>;
  rewardCount: number;
  session: ReturnType<typeof createSession> | null;
  startCalls: Array<Readonly<{
    body: unknown;
    idempotencyKey: string;
  }>>;
  weeklyXp: number;
  xpLedger: Array<ReturnType<typeof createXpEntry>>;
};

const problemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const hintEventId = "55555555-5555-4555-8555-555555555551";
const attemptEventId = "55555555-5555-4555-8555-555555555552";
const planTaskId = "77777777-7777-4777-8777-777777777777";
const planId = "88888888-8888-4888-8888-888888888888";
const recommendationId = "99999999-9999-4999-8999-999999999999";
const xpEntryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const csrfToken = "e2e_daily_loop_csrf_abcdefghijklmnopqrstuvwxyz";
const startedAt = "2026-07-27T02:00:00.000Z";
const updatedAt = "2026-07-27T03:00:00.000Z";
const completedAt = "2026-07-27T04:00:00.000Z";
const problemTitle = "随机变量的期望";
const taskTitle = "完成今日概率训练";
const overviewTitle = "Gary，今天把一题练扎实";
const noteBody = "E[X] = 2";

test.describe.configure({
  mode: "serial",
  retries: 0,
  timeout: 90_000,
});

const createProblem = () => ({
  category: "概率统计",
  companies: ["Jane Street", "Citadel"],
  difficulty: "Medium" as const,
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: true,
  id: problemId,
  note: null,
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: 0,
    bestScore: null as number | null,
    completedAt: null as string | null,
    hintCount: 0,
    lastPracticedAt: null as string | null,
    lastScore: null as number | null,
    solutionRevealedAt: null,
    status: "unstarted" as "unstarted" | "in_progress" | "completed",
    version: null as number | null,
  },
  promptEn: "Let X take values 1 and 3 with equal probability. Find E[X].",
  promptZh: "随机变量 X 以相同概率取 1 和 3，求 E[X]。",
  source: {
    contentVersion: "preview-internal-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["期望", "随机变量"],
  titleEn: "Expected Value of a Random Variable",
  titleZh: problemTitle,
  version: 1,
});

const createPlan = () => ({
  createdAt: startedAt,
  diagnosticScore: 76,
  diagnosticScores: { probability: 62 },
  diagnosticStatus: "completed" as const,
  id: planId,
  progress: { completed: 0, total: 1 },
  recommendations: [{
    createdAt: startedAt,
    id: recommendationId,
    kind: "problem" as const,
    problemId,
    provenanceResourceId: problemId,
    provenanceType: "system" as const,
    rank: 0,
    rationale: "今日计划根据概率短板安排这道训练。",
    skillKey: "probability",
    status: "active" as const,
    updatedAt: startedAt,
    version: 1,
  }],
  role: "quantResearch",
  season: "2027-summer",
  status: "active" as "active" | "completed",
  tasks: [{
    actionTarget: "problems" as const,
    completedAt: null as string | null,
    createdAt: startedAt,
    detail: "完成期望计算并提交一次有效作答。",
    estimatedMinutes: 20,
    id: planTaskId,
    planId,
    recommendationId,
    scheduledFor: "2026-07-27",
    skillKey: "probability",
    sortOrder: 0,
    status: "open" as "open" | "completed",
    targetProblemId: problemId,
    title: taskTitle,
    updatedAt: startedAt,
    version: 1,
  }],
  track: "internship" as const,
  updatedAt: startedAt,
  version: 4,
  weeklyHours: 8 as const,
});

const createSession = () => ({
  attemptId: null as string | null,
  hintEn: null as string | null,
  hintZh: null as string | null,
  lastActivityAt: startedAt,
  planTaskId,
  problemId,
  score: null as number | null,
  sessionId,
  sessionVersion: 1,
  solutionEn: null,
  solutionZh: null,
  startedAt,
  status: "active" as "active" | "completed",
});

const createXpEntry = () => ({
  amount: 40,
  id: xpEntryId,
  occurredAt: completedAt,
  reason: "problem_completion" as const,
  skillKey: "probability",
});

const createState = (): DailyLoopState => ({
  completeCalls: [],
  completionAcks: new Map(),
  completionRequest: null,
  eventSequence: 0,
  meRequestCount: 0,
  plan: createPlan(),
  problem: createProblem(),
  rewardCount: 0,
  session: null,
  startCalls: [],
  weeklyXp: 120,
  xpLedger: [],
});

const jsonResponse = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  contentType: "application/json",
  status,
});

const parseBody = (request: Request): unknown => (
  request.postData() === null ? null : request.postDataJSON() as unknown
);

const idempotencyKeyFor = (request: Request): string => (
  request.headers()["x-idempotency-key"] ?? ""
);

const planTask = (state: DailyLoopState) => {
  const task = state.plan.tasks[0];
  if (task === undefined) throw new Error("daily-loop plan task fixture is missing");
  return task;
};

const problemSummary = (state: DailyLoopState) => ({
  category: state.problem.category,
  companies: state.problem.companies,
  difficulty: state.problem.difficulty,
  favorite: state.problem.favorite,
  hot100: state.problem.hot100,
  id: state.problem.id,
  noteExists: state.problem.noteExists,
  noteVersion: state.problem.noteVersion,
  progress: state.problem.progress,
  source: state.problem.source,
  tags: state.problem.tags,
  titleEn: state.problem.titleEn,
  titleZh: state.problem.titleZh,
  version: state.problem.version,
});

const problemDetail = (state: DailyLoopState) => ({
  ...problemSummary(state),
  note: state.problem.note,
  promptEn: state.problem.promptEn,
  promptZh: state.problem.promptZh,
});

const dashboardOverview = (state: DailyLoopState) => {
  const task = planTask(state);
  return {
    planProgress: {
      completedTasks: state.plan.progress.completed,
      planId,
      totalTasks: state.plan.progress.total,
      version: state.plan.version,
    },
    profile: {
      displayName: "Gary",
      level: 3,
      streakDays: 2,
      weeklyXp: state.weeklyXp,
    },
    recentXp: state.xpLedger,
    resourceVersions: {
      plan: state.plan.version,
      training: state.session?.sessionVersion ?? 0,
    },
    todayTask: {
      actionResourceId: problemId,
      actionTarget: "problems",
      id: planTaskId,
      rewardXp: 40,
      status: task.status,
      title: taskTitle,
      unlockReason: "完成后更新概率能力与训练计划。",
      version: task.version,
    },
    unreadNotificationCount: 0,
    weakness: {
      label: "概率",
      recommendedProblemId: problemId,
      score: 62,
      skillKey: "probability",
    },
  };
};

const nextTrainingEvent = (
  state: DailyLoopState,
  eventId: string,
) => {
  const session = state.session;
  if (session === null) throw new Error("daily-loop training session is missing");
  state.eventSequence += 1;
  session.sessionVersion += 1;
  session.lastActivityAt = updatedAt;
  return {
    eventId,
    eventSequence: state.eventSequence,
    sessionId,
    sessionVersion: session.sessionVersion,
  };
};

const completionAckFor = (state: DailyLoopState): CompletionAck => {
  const session = state.session;
  if (session === null) throw new Error("daily-loop training session is missing");
  return {
    nextAction: {
      problemId: null,
      target: "overview",
    },
    planEffect: {
      planVersion: state.plan.version,
      taskCompleted: true,
    },
    sessionId,
    sessionVersion: session.sessionVersion,
    skillEffect: {
      currentBestScore: 88,
      delta: 88,
      previousBestScore: null,
      skillKey: "probability",
    },
    xpDelta: 40,
  };
};

const completeTraining = (
  request: Request,
  state: DailyLoopState,
) => {
  const idempotencyKey = idempotencyKeyFor(request);
  const body = parseBody(request);
  state.completeCalls.push({ body, idempotencyKey });
  const acknowledged = state.completionAcks.get(idempotencyKey);
  if (acknowledged !== undefined) return jsonResponse(acknowledged);

  const session = state.session;
  if (session === null) throw new Error("daily-loop training session is missing");
  const task = planTask(state);
  session.sessionVersion += 1;
  session.lastActivityAt = completedAt;
  session.status = "completed";
  state.problem.progress.completedAt = completedAt;
  state.problem.progress.status = "completed";
  state.problem.progress.version = (state.problem.progress.version ?? 0) + 1;
  task.completedAt = completedAt;
  task.status = "completed";
  task.updatedAt = completedAt;
  task.version += 1;
  state.plan.progress.completed = 1;
  state.plan.status = "completed";
  state.plan.updatedAt = completedAt;
  state.plan.version += 1;
  state.rewardCount += 1;
  state.weeklyXp += 40;
  state.xpLedger.push(createXpEntry());

  const acknowledgement = completionAckFor(state);
  state.completionAcks.set(idempotencyKey, acknowledgement);
  state.completionRequest = { body, idempotencyKey };
  return jsonResponse(acknowledgement);
};

const responseFor = (
  request: Request,
  state: DailyLoopState,
) => {
  const { pathname } = new URL(request.url());
  const method = request.method();

  if (pathname === "/api/v2/me" && method === "GET") {
    state.meRequestCount += 1;
    return {
      ...jsonResponse({
        displayName: "Gary",
        email: "gary@example.com",
        emailVerified: true,
        preferences: {
          language: "zh-CN",
          theme: "light",
          version: 1,
        },
      }),
      headers: {
        "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
      },
    };
  }

  if (pathname === "/api/v2/auth/csrf" && method === "GET") {
    return {
      ...jsonResponse({ csrfToken }),
      headers: {
        "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
      },
    };
  }

  if (pathname === "/api/v2/notifications" && method === "GET") {
    return jsonResponse({ items: [], nextCursor: null, unreadCount: 0 });
  }

  if (pathname === "/api/v2/todos" && method === "GET") {
    return jsonResponse({ items: [] });
  }

  if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
    return jsonResponse(dashboardOverview(state));
  }

  if (pathname === "/api/v2/plans/current" && method === "GET") {
    return jsonResponse({ plan: state.plan });
  }

  if (pathname === "/api/v2/problems" && method === "GET") {
    return jsonResponse({
      availableSources: [state.problem.source],
      items: [problemSummary(state)],
      nextCursor: null,
    });
  }

  if (pathname === `/api/v2/problems/${problemId}` && method === "GET") {
    return jsonResponse(problemDetail(state));
  }

  if (pathname === "/api/v2/training/sessions" && method === "POST") {
    const body = parseBody(request);
    state.startCalls.push({
      body,
      idempotencyKey: idempotencyKeyFor(request),
    });
    state.session = createSession();
    return jsonResponse({
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: state.session.sessionVersion,
    }, 201);
  }

  if (pathname === `/api/v2/training/sessions/${sessionId}` && method === "GET") {
    return state.session === null
      ? jsonResponse({
          code: "TRAINING_SESSION_NOT_FOUND",
          fieldErrors: {},
          message: "训练会话不存在。",
          requestId: "e2e-daily-loop-session-missing",
          retryable: false,
        }, 404)
      : jsonResponse(state.session);
  }

  if (
    pathname === `/api/v2/training/sessions/${sessionId}/hint`
    && method === "POST"
  ) {
    const session = state.session;
    if (session === null) throw new Error("daily-loop training session is missing");
    const event = nextTrainingEvent(state, hintEventId);
    session.hintZh = "先利用期望的线性性质，再代入两个离散取值。";
    session.hintEn = "Use linearity of expectation, then substitute the two values.";
    state.problem.progress.hintCount += 1;
    state.problem.progress.status = "in_progress";
    return jsonResponse({
      ...event,
      hintEn: session.hintEn,
      hintZh: session.hintZh,
    });
  }

  if (
    pathname === `/api/v2/training/sessions/${sessionId}/attempts`
    && method === "POST"
  ) {
    const session = state.session;
    if (session === null) throw new Error("daily-loop training session is missing");
    const event = nextTrainingEvent(state, attemptEventId);
    session.attemptId = attemptId;
    session.score = 88;
    state.problem.progress.attemptCount += 1;
    state.problem.progress.bestScore = 88;
    state.problem.progress.lastPracticedAt = updatedAt;
    state.problem.progress.lastScore = 88;
    state.problem.progress.status = "in_progress";
    state.problem.progress.version = (state.problem.progress.version ?? 0) + 1;
    return jsonResponse({
      ...event,
      attemptId,
      score: 88,
    });
  }

  if (
    pathname === `/api/v2/training/sessions/${sessionId}/complete`
    && method === "POST"
  ) {
    return completeTraining(request, state);
  }

  if (
    pathname === `/api/v2/training/sessions/${sessionId}/result`
    && method === "GET"
  ) {
    const acknowledgement = [...state.completionAcks.values()][0];
    return acknowledgement === undefined
      ? jsonResponse({
          code: "TRAINING_RESULT_NOT_READY",
          fieldErrors: {},
          message: "训练结果尚未确认。",
          requestId: "e2e-daily-loop-result-pending",
          retryable: true,
        }, 409)
      : jsonResponse({
          ...acknowledgement,
          completedAt,
          problemId,
          score: 88,
        });
  }

  if (pathname === "/api/v2/preferences" && method === "PATCH") {
    return jsonResponse({
      language: "zh-CN",
      theme: "light",
      version: 2,
    });
  }

  if (pathname === "/api/v2/auth/logout" && method === "POST") {
    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({
    code: "E2E_API_ROUTE_UNHANDLED",
    fieldErrors: {},
    message: `${method} ${pathname}`,
    requestId: "e2e-daily-loop-unhandled",
    retryable: false,
  }, 404);
};

const installDailyLoopApi = async (page: Page) => {
  await mockLegacyPreviewFrame(page);
  const state = createState();
  await page.route("**/api/v2/**", async (route: Route) => {
    await route.fulfill(responseFor(route.request(), state));
  });
  return state;
};

const measureHorizontalOverflow = async (page: Page): Promise<number> => (
  page.evaluate(() => Math.max(
    0,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.body.clientWidth,
  ))
);

const expectShellPage = async (
  page: Page,
  heading: string,
) => {
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("main")).toHaveAttribute("id", "qg-main-content");
};

test(
  "@phase2:daily-loop @e2e:phase2-daily-loop-facts "
  + "共享服务状态贯穿 Overview、Problems、Plan 并保持单笔奖励",
  async ({ page }, testInfo) => {
    const applicationConsoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedFirstPartyRequests: string[] = [];
    let horizontalOverflowPx = 0;

    page.on("console", (message) => {
      if (message.type() === "error") applicationConsoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "";
      if (
        url.pathname.startsWith("/api/v2/")
        && !/ERR_ABORTED|NS_BINDING_ABORTED/u.test(failure)
      ) {
        failedFirstPartyRequests.push(`${request.method()} ${url.pathname}`);
      }
    });
    await page.addInitScript(() => {
      const scope = window as typeof window & {
        __phase2DailyLoopUnhandledRejections?: string[];
      };
      scope.__phase2DailyLoopUnhandledRejections = [];
      window.addEventListener("unhandledrejection", (event) => {
        scope.__phase2DailyLoopUnhandledRejections?.push(String(event.reason));
      });
    });

    const state = await installDailyLoopApi(page);
    await page.goto("/");
    await expectShellPage(page, overviewTitle);
    expect(state.meRequestCount).toBeGreaterThan(0);

    const initialWeeklyXp = page.getByRole("region", {
      name: "本周 XP",
      exact: true,
    });
    const initialPlanProgress = page.getByRole("region", {
      name: "计划进度",
      exact: true,
    });
    await expect(initialWeeklyXp.locator("[data-qg-metric]")).toHaveText("120");
    await expect(initialPlanProgress.locator("[data-qg-metric]")).toHaveText("0/1");
    await expect(page.locator('[data-training-recommendation="task"]')).toContainText(taskTitle);
    horizontalOverflowPx = Math.max(
      horizontalOverflowPx,
      await measureHorizontalOverflow(page),
    );

    const start = page.getByRole("button", {
      name: "开始 / 继续训练",
      exact: true,
    });
    await expect(start).toBeEnabled({ timeout: 20_000 });
    await start.click();
    await expect(page).toHaveURL(
      new RegExp(`/problems\\?problem=${problemId}&session=${sessionId}$`, "u"),
      { timeout: 20_000 },
    );
    await expectShellPage(page, "题目 Problems");
    await expect(page.locator(`article[data-problem-id="${problemId}"]`)).toBeVisible();
    expect(state.startCalls).toHaveLength(1);
    expect(state.startCalls[0]?.body).toEqual({ planTaskId, problemId });
    expect(state.session).toMatchObject({
      planTaskId,
      problemId,
      sessionId,
      status: "active",
    });
    horizontalOverflowPx = Math.max(
      horizontalOverflowPx,
      await measureHorizontalOverflow(page),
    );

    await page.getByRole("button", { name: "使用提示", exact: true }).click();
    await expect(page.getByText(
      "先利用期望的线性性质，再代入两个离散取值。",
      { exact: true },
    )).toBeVisible();
    await page.getByRole("textbox", { name: "你的答案", exact: true }).fill(noteBody);
    await page.getByRole("button", { name: "提交作答", exact: true }).click();
    await expect(page.getByText("最近一次得分：88", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "完成本次训练", exact: true }).click();

    const result = page.getByRole("region", { name: "训练完成", exact: true });
    await expect(result.getByText("本次训练结果", { exact: true })).toBeVisible();
    await expect(result.getByText("+40 XP", { exact: true })).toBeVisible();
    await expect(result.getByText("关联计划任务已完成。", { exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/problems");
    expect(state.rewardCount).toBe(1);
    expect(state.xpLedger).toHaveLength(1);
    expect(state.weeklyXp).toBe(160);

    const firstAcknowledgement = [...state.completionAcks.values()][0];
    const completionRequest = state.completionRequest;
    expect(firstAcknowledgement).toBeDefined();
    expect(completionRequest).not.toBeNull();
    if (firstAcknowledgement === undefined || completionRequest === null) {
      throw new Error("daily-loop completion acknowledgement was not captured");
    }
    const replay = await page.evaluate(async ({
      body,
      csrfProof,
      idempotencyKey,
      target,
    }) => {
      const response = await fetch(target, {
        body: JSON.stringify(body),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfProof,
          "x-idempotency-key": idempotencyKey,
        },
        method: "POST",
      });
      return {
        body: await response.json() as unknown,
        status: response.status,
      };
    }, {
      body: completionRequest.body,
      csrfProof: csrfToken,
      idempotencyKey: completionRequest.idempotencyKey,
      target: `/api/v2/training/sessions/${sessionId}/complete`,
    });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(firstAcknowledgement);
    expect(state.completeCalls).toHaveLength(2);
    expect(state.completeCalls[1]?.idempotencyKey).toBe(
      state.completeCalls[0]?.idempotencyKey,
    );
    expect(state.completionAcks.size).toBe(1);
    expect(state.rewardCount).toBe(1);
    expect(state.xpLedger).toHaveLength(1);
    expect(state.weeklyXp).toBe(160);

    await page.getByRole("navigation", { name: "主导航", exact: true })
      .getByRole("link", { name: "计划", exact: true })
      .click();
    await expectShellPage(page, "你的量化职业训练计划");
    const completedTask = page.locator(
      `article[data-plan-task-status="completed"]`,
    ).filter({ hasText: taskTitle });
    await expect(completedTask).toBeVisible();
    await expect(completedTask.getByText("已完成", { exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", {
      name: "计划进度",
      exact: true,
    })).toHaveAttribute("value", "100");
    expect(planTask(state)).toMatchObject({
      id: planTaskId,
      status: "completed",
      version: 2,
    });
    expect(state.plan.progress).toEqual({ completed: 1, total: 1 });
    horizontalOverflowPx = Math.max(
      horizontalOverflowPx,
      await measureHorizontalOverflow(page),
    );

    await page.getByRole("navigation", { name: "主导航", exact: true })
      .getByRole("link", { name: "总览", exact: true })
      .click();
    await expectShellPage(page, overviewTitle);
    const finalWeeklyXp = page.getByRole("region", {
      name: "本周 XP",
      exact: true,
    });
    const finalPlanProgress = page.getByRole("region", {
      name: "计划进度",
      exact: true,
    });
    await expect(finalWeeklyXp.locator("[data-qg-metric]")).toHaveText("160");
    await expect(finalPlanProgress.locator("[data-qg-metric]")).toHaveText("1/1");
    await expect(page.getByText("+40 XP", { exact: true })).toHaveCount(1);
    await expect(page.locator('[data-training-recommendation="weakness"]')).toBeVisible();
    await expect(page.locator('[data-training-recommendation="task"]')).toHaveCount(0);
    expect(dashboardOverview(state).todayTask).toMatchObject({
      id: planTaskId,
      status: "completed",
      version: 2,
    });
    horizontalOverflowPx = Math.max(
      horizontalOverflowPx,
      await measureHorizontalOverflow(page),
    );

    const unhandledRejections = await page.evaluate(() => {
      const scope = window as typeof window & {
        __phase2DailyLoopUnhandledRejections?: string[];
      };
      return scope.__phase2DailyLoopUnhandledRejections ?? [];
    });
    expect(applicationConsoleErrors, "application console errors").toEqual([]);
    expect(unhandledRejections, "unhandled browser rejections").toEqual([]);
    expect(pageErrors, "page errors").toEqual([]);
    expect(failedFirstPartyRequests, "failed first-party requests").toEqual([]);
    expect(horizontalOverflowPx, "maximum horizontal overflow").toBe(0);

    testInfo.annotations.push({
      type: "phase2-daily-loop-facts",
      description: JSON.stringify({
        checks: {
          authenticatedEntry: true,
          dailyLoopPassed: true,
          exactTrainingSession: true,
          overviewUpdated: true,
          planUpdated: true,
          resultVisibleBeforeNavigation: true,
          singleRewardPassed: true,
        },
        completion: {
          idempotencyKeyReused: (
            state.completeCalls[0]?.idempotencyKey
            === state.completeCalls[1]?.idempotencyKey
          ),
          requestCount: state.completeCalls.length,
          rewardCount: state.rewardCount,
          sameAcknowledgement: true,
          xpLedgerEntryCount: state.xpLedger.length,
        },
        integrity: {
          applicationConsoleErrors: applicationConsoleErrors.length,
          failedFirstPartyRequests: failedFirstPartyRequests.length,
          horizontalOverflowPx,
          pageErrors: pageErrors.length,
          unhandledRejections: unhandledRejections.length,
        },
        kind: "phase2-daily-loop-facts",
        overview: {
          finalPlanCompletedTasks: state.plan.progress.completed,
          finalTodayTaskStatus: dashboardOverview(state).todayTask.status,
          finalWeeklyXp: state.weeklyXp,
          initialPlanCompletedTasks: 0,
          initialTodayTaskStatus: "open",
          initialWeeklyXp: 120,
        },
        plan: {
          completedTasks: state.plan.progress.completed,
          taskId: planTaskId,
          taskStatus: planTask(state).status,
          totalTasks: state.plan.progress.total,
        },
        schemaVersion: 1,
        session: {
          planTaskId: state.session?.planTaskId ?? null,
          problemId: state.session?.problemId ?? null,
          sessionId: state.session?.sessionId ?? null,
        },
      }),
    });
  },
);
