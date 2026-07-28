import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request, type Route } from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";
import { capturePhase2ReviewImage } from "./phase2-review.fixture";
import {
  collectPhase2ReducedMotionFacts,
  collectPhase2VisualRouteCaseFacts,
  type Phase2VisualRouteCaseFacts,
} from "./phase2-evidence-facts.fixture";

type ShellTheme = "light" | "dark";
type ShellLanguage = "zh-CN" | "en";
type MeMode = "authenticated" | "permission" | "recoverable" | "signed-out" | "stale";
type PlanMutationMode = "non-recoverable" | "offline" | "permission" | "recoverable" | "stale" | "success";
type PlanMutationOperation = "complete" | "create" | "diagnostic" | "update";

type ShellApiState = {
  displayName: string;
  hasPlan: boolean;
  meMode: MeMode;
  meRequestCount: number;
  plan: typeof currentPlan;
  planMutationMode: PlanMutationMode;
  problemTitleEn: string;
  problemTitleZh: string;
  preferences: {
    language: ShellLanguage;
    theme: ShellTheme;
    version: number;
  };
};

const preferenceStorageKey = "qg-v2-preferences";
const csrfToken = "e2e_shell_csrf_abcdefghijklmnopqrstuvwxyz";
const overviewTitleEn = "Gary, make the next problem count";
const overviewTitleZh = "Gary，今天把一题练扎实";
const planTitleEn = "Your quantitative career plan";
const planTitleZh = "你的量化职业训练计划";
const shellReadyTimeoutMs = 20_000;
const shellProblemId = "91111111-1111-4111-8111-111111111111";
const shellNextProblemId = "92222222-2222-4222-8222-222222222222";
const shellSessionId = "93333333-3333-4333-8333-333333333333";
const shellPlanTaskId = "94444444-4444-4444-8444-444444444444";

const currentPlan = {
  createdAt: "2026-07-27T02:00:00Z",
  diagnosticScore: 76,
  diagnosticScores: { statistics: 75 },
  diagnosticStatus: "completed",
  id: "10000000-0000-4000-8000-000000000001",
  progress: { completed: 0, total: 1 },
  recommendations: [{
    createdAt: "2026-07-27T02:00:00Z",
    id: "50000000-0000-4000-8000-000000000005",
    kind: "skill",
    problemId: null,
    provenanceResourceId: null,
    provenanceType: "diagnostic",
    rank: 0,
    rationale: "Baseline 显示 statistics 当前得分为 75，建议优先安排针对性训练。",
    skillKey: "statistics",
    status: "active",
    updatedAt: "2026-07-27T02:00:00Z",
    version: 1,
  }],
  role: "quantResearch",
  season: "2027-summer",
  status: "active",
  tasks: [{
    actionTarget: "tools",
    completedAt: null,
    createdAt: "2026-07-27T02:00:00Z",
    detail: "完成一组统计推断题并记录假设。",
    estimatedMinutes: 30,
    id: "20000000-0000-4000-8000-000000000002",
    planId: "10000000-0000-4000-8000-000000000001",
    recommendationId: "50000000-0000-4000-8000-000000000005",
    scheduledFor: "2026-07-28",
    skillKey: "statistics",
    sortOrder: 0,
    status: "open",
    targetProblemId: null,
    title: "统计推断基础训练",
    updatedAt: "2026-07-27T02:00:00Z",
    version: 2,
  }],
  track: "internship",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 4,
  weeklyHours: 8,
};

const apiErrorFor = (mode: Exclude<MeMode, "authenticated">) => {
  if (mode === "signed-out") {
    return {
      status: 401,
      code: "AUTH_SESSION_REQUIRED",
      message: "请先登录。",
      requestId: "e2e-signed-out-request-id",
      retryable: false,
    };
  }
  if (mode === "stale") {
    return {
      status: 409,
      code: "PREFERENCE_VERSION_CONFLICT",
      message: "偏好设置已在其他位置更新。",
      requestId: "e2e-stale-request-id",
      retryable: false,
    };
  }
  if (mode === "permission") {
    return {
      status: 403,
      code: "AUTH_PERMISSION_DENIED",
      message: "当前登录状态无法完成此操作。",
      requestId: "e2e-permission-request-id",
      retryable: false,
    };
  }
  return {
    status: 503,
    code: "AUTH_SERVICE_UNAVAILABLE",
    message: "认证服务暂时不可用。",
    requestId: "e2e-recoverable-request-id",
    retryable: true,
  };
};

const planMutationFailureResponse = (
  operation: PlanMutationOperation,
  mode: Exclude<PlanMutationMode, "offline" | "success">,
) => {
  const failures = {
    "non-recoverable": {
      code: "PLAN_MUTATION_INVALID",
      message: "当前计划更改无法保存。",
      retryable: false,
      status: 422,
    },
    permission: {
      code: "AUTH_PERMISSION_DENIED",
      message: "当前会话需要重新验证。",
      retryable: false,
      status: 403,
    },
    recoverable: {
      code: "PLAN_SERVICE_UNAVAILABLE",
      message: "计划服务暂时不可用。",
      retryable: true,
      status: 503,
    },
    stale: {
      code: "PLAN_VERSION_CONFLICT",
      message: "计划已在其他位置更新。",
      retryable: false,
      status: 409,
    },
  } as const;
  const failure = failures[mode];
  const requestId = `e2e-plan-${operation}-${mode}`;
  return {
    status: failure.status,
    contentType: "application/json",
    headers: { "x-request-id": requestId },
    body: JSON.stringify({
      code: failure.code,
      fieldErrors: {},
      message: failure.message,
      requestId,
      retryable: failure.retryable,
    }),
  };
};

const shellProblemSummary = (state: ShellApiState) => ({
  category: "概率统计",
  companies: ["Jane Street", "Citadel"],
  difficulty: "Medium",
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: true,
  id: shellProblemId,
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: 1,
    bestScore: 88,
    completedAt: "2026-07-27T04:00:00.000Z",
    hintCount: 1,
    lastPracticedAt: "2026-07-27T04:00:00.000Z",
    lastScore: 88,
    solutionRevealedAt: null,
    status: "completed",
    version: 2,
  },
  source: {
    contentVersion: "preview-internal-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["期望", "随机变量"],
  titleEn: state.problemTitleEn,
  titleZh: state.problemTitleZh,
  version: 1,
});

const shellProblemDetail = (state: ShellApiState) => ({
  ...shellProblemSummary(state),
  note: null,
  promptEn: "Let X take values 1 and 3 with equal probability. Find E[X].",
  promptZh: "随机变量 X 以相同概率取 1 和 3，求 E[X]。",
});

const responseFor = (request: Request, state: ShellApiState) => {
  const path = new URL(request.url()).pathname;
  if (path === "/api/v2/me") {
    state.meRequestCount += 1;
    if (state.meMode === "authenticated") {
      return {
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
        },
        body: JSON.stringify({
          displayName: state.displayName,
          email: "gary@example.com",
          emailVerified: true,
          preferences: state.preferences,
        }),
      };
    }
    const error = apiErrorFor(state.meMode);
    return {
      status: error.status,
      contentType: "application/json",
      headers: { "x-request-id": error.requestId },
      body: JSON.stringify({
        code: error.code,
        fieldErrors: {},
        message: error.message,
        requestId: error.requestId,
        retryable: error.retryable,
      }),
    };
  }
  if (path === "/api/v2/preferences" && request.method() === "PATCH") {
    const payload = request.postDataJSON() as {
      language?: ShellLanguage;
      theme?: ShellTheme;
      version: number;
    };
    if (payload.version !== state.preferences.version) {
      return {
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PREFERENCE_CONFLICT",
          fieldErrors: { version: ["偏好版本已变化"] },
          message: "偏好设置已在其他位置更新。",
          requestId: "e2e-preference-conflict",
          retryable: false,
        }),
      };
    }
    state.preferences = {
      language: payload.language ?? state.preferences.language,
      theme: payload.theme ?? state.preferences.theme,
      version: state.preferences.version + 1,
    };
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state.preferences),
    };
  }
  if (path === "/api/v2/dashboard/overview" && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        planProgress: {
          completedTasks: state.plan.progress.completed,
          planId: state.plan.id,
          totalTasks: state.plan.progress.total,
          version: state.plan.version,
        },
        profile: {
          displayName: state.displayName,
          level: 3,
          streakDays: 2,
          weeklyXp: 120,
        },
        recentXp: [],
        resourceVersions: { plan: state.plan.version, training: 1 },
        todayTask: {
          actionResourceId: null,
          actionTarget: "tools",
          id: state.plan.tasks[0].id,
          rewardXp: 40,
          status: "open",
          title: state.plan.tasks[0].title,
          unlockReason: "Continue the next confirmed plan task.",
          version: state.plan.tasks[0].version,
        },
        unreadNotificationCount: 0,
        weakness: null,
      }),
    };
  }
  if (path === "/api/v2/problems" && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        availableSources: [shellProblemSummary(state).source],
        items: [shellProblemSummary(state)],
        nextCursor: null,
      }),
    };
  }
  if (path === `/api/v2/problems/${shellProblemId}` && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(shellProblemDetail(state)),
    };
  }
  if (path === `/api/v2/training/sessions/${shellSessionId}` && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        attemptId: "95555555-5555-4555-8555-555555555555",
        hintEn: "Use linearity of expectation.",
        hintZh: "先利用期望的线性性质。",
        lastActivityAt: "2026-07-27T04:00:00.000Z",
        planTaskId: shellPlanTaskId,
        problemId: shellProblemId,
        score: 88,
        sessionId: shellSessionId,
        sessionVersion: 4,
        solutionEn: null,
        solutionZh: null,
        startedAt: "2026-07-27T02:00:00.000Z",
        status: "completed",
      }),
    };
  }
  if (
    path === `/api/v2/training/sessions/${shellSessionId}/result`
    && request.method() === "GET"
  ) {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        completedAt: "2026-07-27T04:00:00.000Z",
        nextAction: {
          problemId: shellNextProblemId,
          target: "problems",
        },
        planEffect: {
          planVersion: 5,
          taskCompleted: true,
        },
        problemId: shellProblemId,
        score: 88,
        sessionId: shellSessionId,
        sessionVersion: 4,
        skillEffect: {
          currentBestScore: 88,
          delta: 13,
          previousBestScore: 75,
          skillKey: "probability",
        },
        xpDelta: 40,
      }),
    };
  }
  if (path === "/api/v2/plans/current" && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ plan: state.hasPlan ? state.plan : null }),
    };
  }
  if (path === "/api/v2/plans" && request.method() === "POST") {
    if (state.planMutationMode !== "success") {
      return planMutationFailureResponse(
        "create",
        state.planMutationMode as Exclude<PlanMutationMode, "offline" | "success">,
      );
    }
    const payload = request.postDataJSON() as {
      role: string;
      season: string;
      track: "fulltime" | "internship";
      weeklyHours: 5 | 8 | 12 | 16;
    };
    state.plan = {
      ...structuredClone(currentPlan),
      diagnosticScore: 0,
      diagnosticScores: {},
      diagnosticStatus: "pending",
      recommendations: [],
      role: payload.role,
      season: payload.season,
      track: payload.track,
      updatedAt: "2026-07-27T03:00:00Z",
      version: 1,
      weeklyHours: payload.weeklyHours,
    };
    state.hasPlan = true;
    return {
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        planId: state.plan.id,
        planVersion: state.plan.version,
        taskIds: state.plan.tasks.map(({ id }) => id),
      }),
    };
  }
  if (path === "/api/v2/plans/current/diagnostic" && request.method() === "POST") {
    if (state.planMutationMode !== "success") {
      return planMutationFailureResponse(
        "diagnostic",
        state.planMutationMode as Exclude<PlanMutationMode, "offline" | "success">,
      );
    }
    const payload = request.postDataJSON() as { planVersion: number };
    state.plan = {
      ...state.plan,
      diagnosticScore: currentPlan.diagnosticScore,
      diagnosticScores: currentPlan.diagnosticScores,
      diagnosticStatus: "completed",
      recommendations: structuredClone(currentPlan.recommendations),
      updatedAt: "2026-07-27T03:00:00Z",
      version: payload.planVersion + 1,
    };
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        planId: state.plan.id,
        planVersion: state.plan.version,
        recommendationIds: state.plan.recommendations.map(({ id }) => id),
      }),
    };
  }
  if (
    path.startsWith("/api/v2/plans/current/tasks/")
    && request.method() === "PATCH"
  ) {
    if (state.planMutationMode === "success") {
      const payload = request.postDataJSON() as {
        detail?: string | null;
        estimatedMinutes?: number | null;
        planVersion: number;
        scheduledFor?: string | null;
        sortOrder?: number;
        taskVersion: number;
        title?: string;
      };
      const {
        planVersion,
        taskVersion,
        ...changes
      } = payload;
      const sourceTask = state.plan.tasks[0];
      const updatedTask = {
        ...sourceTask,
        ...changes,
        updatedAt: "2026-07-27T03:00:00Z",
        version: taskVersion + 1,
      };
      state.plan = {
        ...state.plan,
        tasks: [updatedTask],
        updatedAt: "2026-07-27T03:00:00Z",
        version: planVersion + 1,
      };
      return {
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          planVersion: state.plan.version,
          task: updatedTask,
        }),
      };
    }
    return planMutationFailureResponse(
      "update",
      state.planMutationMode as Exclude<PlanMutationMode, "offline" | "success">,
    );
  }
  if (
    path.endsWith("/complete")
    && path.startsWith("/api/v2/plans/current/tasks/")
    && request.method() === "POST"
  ) {
    if (state.planMutationMode !== "success") {
      return planMutationFailureResponse(
        "complete",
        state.planMutationMode as Exclude<PlanMutationMode, "offline" | "success">,
      );
    }
    const payload = request.postDataJSON() as {
      planVersion: number;
      taskVersion: number;
    };
    const sourceTask = state.plan.tasks[0];
    const completedTask = {
      ...sourceTask,
      completedAt: "2026-07-27T03:00:00Z",
      status: "completed",
      updatedAt: "2026-07-27T03:00:00Z",
      version: payload.taskVersion + 1,
    };
    state.plan = {
      ...state.plan,
      progress: { completed: 1, total: state.plan.progress.total },
      tasks: [completedTask],
      updatedAt: "2026-07-27T03:00:00Z",
      version: payload.planVersion + 1,
    };
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        planVersion: state.plan.version,
        task: completedTask,
      }),
    };
  }
  if (path === "/api/v2/notifications" && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], nextCursor: null, unreadCount: 0 }),
    };
  }
  if (path === "/api/v2/todos" && request.method() === "GET") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    };
  }
  if (path === "/api/v2/auth/logout" && request.method() === "POST") {
    return {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    };
  }
  return {
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({
      code: "E2E_API_ROUTE_UNHANDLED",
      fieldErrors: {},
      message: path,
      requestId: "e2e-unhandled-request-id",
      retryable: false,
    }),
  };
};

const mockV2Api = async (page: Page) => {
  await mockLegacyPreviewFrame(page);
  const state: ShellApiState = {
    displayName: "Gary",
    hasPlan: true,
    meMode: "authenticated",
    meRequestCount: 0,
    plan: structuredClone(currentPlan),
    planMutationMode: "success",
    problemTitleEn: "Expected Value of a Random Variable",
    problemTitleZh: "随机变量的期望",
    preferences: { language: "zh-CN", theme: "light", version: 1 },
  };
  await page.route("**/api/v2/**", async (route: Route) => {
    const request = route.request();
    if (
      state.planMutationMode === "offline"
      && (
        request.method() === "PATCH"
        || request.method() === "POST"
      )
      && new URL(request.url()).pathname.startsWith("/api/v2/plans")
    ) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.fulfill(responseFor(request, state));
  });
  return state;
};

const expectShellReady = async (
  page: Page,
  title: string,
  timeout = shellReadyTimeoutMs,
) => {
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
    timeout,
  });
  await expect(page.getByRole("main")).toHaveAttribute(
    "id",
    "qg-main-content",
    { timeout },
  );
};

const expectNoAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, results.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);
};

const waitForSubtreeAnimations = async (page: Page, selector: string) => {
  await page.locator(selector).evaluate(async (element) => {
    const root = element.parentElement ?? element;
    await Promise.all(root.getAnimations({ subtree: true }).map(async (animation) => {
      await animation.finished.catch(() => undefined);
    }));
  });
};

const phase2EvidenceRoutePath = (routeId: "overview" | "plan" | "problems") => {
  if (routeId === "overview") return "/";
  if (routeId === "plan") return "/plan";
  return `/problems?problem=${shellProblemId}&session=${shellSessionId}`;
};

const expectPhase2EvidenceRouteReady = async (
  page: Page,
  routeId: "overview" | "plan" | "problems",
) => {
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: shellReadyTimeoutMs });
  await expect(page.getByRole("main")).toHaveAttribute("id", "qg-main-content");
  if (routeId === "problems") {
    await expect(page.locator(`article[data-problem-id="${shellProblemId}"]`))
      .toBeVisible({ timeout: shellReadyTimeoutMs });
  }
};

const expectVisualRouteCaseFacts = (facts: Phase2VisualRouteCaseFacts) => {
  expect(facts.skeletonCount).toBe(0);
  expect(facts.legacyFrameCount).toBe(0);
  expect(facts.brandAssetCount).toBeGreaterThan(0);
  expect(facts.clippedElementCount).toBe(0);
  expect(facts.horizontalOverflowPx).toBe(0);
};

const collectPhase2AxeFacts = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousOrCritical = results.violations.filter((violation) => (
    violation.impact === "serious" || violation.impact === "critical"
  ));
  expect(results.violations, results.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);
  return {
    seriousOrCriticalAxeFindings: seriousOrCritical.length,
    violationCount: results.violations.length,
  };
};

test("@e2e:desktop-shell-keyboard-navigation 桌面外壳支持跳转、折叠与键盘路由", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, overviewTitleZh);

  const skipLink = page.getByRole("link", { name: "跳到主要内容", exact: true });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const collapse = page.getByRole("button", { name: "收起侧边栏", exact: true });
  await collapse.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "展开侧边栏", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const planLink = page.getByRole("link", { name: "计划", exact: true });
  await planLink.focus();
  await expect(planLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/plan$/u);
  await expectShellReady(page, planTitleZh);
  await expect(page.getByRole("link", { name: "计划", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const accountTrigger = page.getByRole("button", { name: "打开账户菜单", exact: true });
  await accountTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "账户资料", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(accountTrigger).toBeFocused();
  await expect(accountTrigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu", { name: "账户操作", exact: true })).toBeHidden();
  await expect(accountTrigger).toHaveAttribute("aria-expanded", "false");
  testInfo.annotations.push({
    type: "phase2-accessibility-desktop-facts",
    description: JSON.stringify({
      focusCheckCount: 7,
      focusFailures: 0,
      keyboardJourneyCount: 6,
      keyboardJourneyFailures: 0,
      kind: "phase2-accessibility-desktop-facts",
      schemaVersion: 1,
    }),
  });
});

test("@e2e:mobile-shell-navigation 移动底栏与完整抽屉保持焦点和当前路由", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, overviewTitleZh);

  const mobileNavigation = page.getByRole("navigation", { name: "底部主导航" });
  const targetSizes = await mobileNavigation.locator("a, button").evaluateAll((elements) => (
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    })
  ));
  expect(targetSizes).toHaveLength(5);
  const mobileTargetFailures = targetSizes
    .filter(({ height, width }) => height < 44 || width < 44).length;
  expect(mobileTargetFailures).toBe(0);
  const mobileBrandSize = await page.getByRole("link", { name: "QuantGym", exact: true })
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    });
  expect(mobileBrandSize.height).toBeGreaterThanOrEqual(44);
  expect(mobileBrandSize.width).toBeGreaterThanOrEqual(44);

  await mobileNavigation.getByRole("link", { name: "计划", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/u);
  await expectShellReady(page, planTitleZh);

  const headerMenu = page.getByRole("button", { name: "打开全部模块", exact: true });
  await headerMenu.click();
  const firstDrawer = page.getByRole("dialog", { name: "全部模块", exact: true });
  await expect(firstDrawer).toBeVisible();
  await expect(firstDrawer.getByRole("button", { name: "关闭全部模块" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(firstDrawer).toBeHidden();
  await expect(headerMenu).toBeFocused();

  await mobileNavigation.getByRole("button", { name: "更多", exact: true }).click();
  let drawer = page.getByRole("dialog", { name: "全部模块", exact: true });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(mobileNavigation.getByRole("button", { name: "更多", exact: true })).toBeFocused();

  await mobileNavigation.getByRole("button", { name: "更多", exact: true }).click();
  drawer = page.getByRole("dialog", { name: "全部模块", exact: true });
  await expect(drawer.getByRole("link")).toHaveCount(21);
  await drawer.getByRole("link", { name: "公司", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/\/companies$/u);
  await expectShellReady(page, "公司");
  await expect(mobileNavigation.getByRole("button", { name: "更多", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  testInfo.annotations.push({
    type: "phase2-accessibility-mobile-facts",
    description: JSON.stringify({
      focusCheckCount: 4,
      focusFailures: 0,
      keyboardJourneyCount: 4,
      keyboardJourneyFailures: 0,
      kind: "phase2-accessibility-mobile-facts",
      mobileTargetCount: targetSizes.length + 1,
      mobileTargetFailures,
      schemaVersion: 1,
    }),
  });
});

for (const routeId of ["overview", "plan", "problems"] as const) {
  test(
    `@phase2:visual-support @e2e:phase2-visual-route-${routeId} `
    + `${routeId} 在桌面与移动端证明无骨架、旧框架、裁切和横向溢出`,
    async ({ page }, testInfo) => {
      await mockV2Api(page);
      const caseFacts: Phase2VisualRouteCaseFacts[] = [];
      for (const viewport of [
        { height: 900, width: 1_440 },
        { height: 844, width: 390 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(phase2EvidenceRoutePath(routeId));
        await expectPhase2EvidenceRouteReady(page, routeId);
        const facts = await collectPhase2VisualRouteCaseFacts(page);
        expectVisualRouteCaseFacts(facts);
        caseFacts.push(facts);
      }
      testInfo.annotations.push({
        type: "phase2-visual-route-facts",
        description: JSON.stringify({
          brandAssetMissingCases: caseFacts
            .filter(({ brandAssetCount }) => brandAssetCount === 0).length,
          caseCount: caseFacts.length,
          clippedElementCount: caseFacts
            .reduce((total, facts) => total + facts.clippedElementCount, 0),
          horizontalOverflowPx: Math.max(
            ...caseFacts.map((facts) => facts.horizontalOverflowPx),
          ),
          kind: "phase2-visual-route-facts",
          legacyFrameCount: caseFacts
            .reduce((total, facts) => total + facts.legacyFrameCount, 0),
          routeId,
          schemaVersion: 1,
          skeletonCount: caseFacts
            .reduce((total, facts) => total + facts.skeletonCount, 0),
          viewportWidths: [390, 1_440],
        }),
      });
    },
  );
}

test(
  "@phase2:visual-support @e2e:phase2-visual-overflow "
  + "三条原生路由在中英文长文本及 390/1024 关键宽度无横向溢出",
  async ({ page }, testInfo) => {
    const api = await mockV2Api(page);
    const longTexts = {
      en: "Gary Quantitative Research Candidate With An Intentionally Extended Cross-Market Training Profile For Responsive Layout Verification",
      "zh-CN": "Gary量化研究候选人这是一段为了验证响应式布局在极端长度内容下仍然不会发生横向溢出的中英文混合超长训练档案名称并继续补充更多训练目标与职业方向信息",
    } as const;
    const cases: Array<{
      horizontalOverflowPx: number;
      injectedTextLength: number;
      language: ShellLanguage;
      routeId: "overview" | "plan" | "problems";
      viewportWidth: number;
    }> = [];

    for (const routeId of ["overview", "plan", "problems"] as const) {
      for (const language of ["zh-CN", "en"] as const) {
        const longText = longTexts[language];
        api.displayName = longText;
        api.preferences = {
          language,
          theme: "light",
          version: api.preferences.version + 1,
        };
        api.plan = {
          ...api.plan,
          tasks: [{
            ...api.plan.tasks[0],
            detail: longText,
            title: longText,
          }],
        } as typeof currentPlan;
        api.problemTitleEn = longTexts.en;
        api.problemTitleZh = longTexts["zh-CN"];

        for (const viewportWidth of [390, 1_024] as const) {
          await page.setViewportSize({
            height: viewportWidth === 390 ? 844 : 768,
            width: viewportWidth,
          });
          await page.goto(phase2EvidenceRoutePath(routeId));
          await expectPhase2EvidenceRouteReady(page, routeId);
          const facts = await collectPhase2VisualRouteCaseFacts(page);
          expect(facts.horizontalOverflowPx).toBe(0);
          cases.push({
            horizontalOverflowPx: facts.horizontalOverflowPx,
            injectedTextLength: longText.length,
            language,
            routeId,
            viewportWidth,
          });
        }
      }
    }

    expect(cases).toHaveLength(12);
    expect(cases.every(({ injectedTextLength }) => injectedTextLength >= 64)).toBe(true);
    testInfo.annotations.push({
      type: "phase2-visual-overflow-facts",
      description: JSON.stringify({
        cases,
        kind: "phase2-visual-overflow-facts",
        schemaVersion: 1,
      }),
    });
  },
);

test(
  "@phase2:visual-support @e2e:phase2-reduced-motion "
  + "减少动态效果时训练结果和下一步保持可见且相关动效降至 1ms",
  async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ height: 844, width: 390 });
    await mockV2Api(page);
    await page.goto(phase2EvidenceRoutePath("problems"));
    await expectPhase2EvidenceRouteReady(page, "problems");

    const result = page.locator('section[aria-label="训练完成"]');
    const nextAction = result.getByRole("button", { name: /继续/u });
    await expect(result.getByText("本次训练结果", { exact: true })).toBeVisible();
    await expect(nextAction).toBeVisible();
    const motionFacts = await collectPhase2ReducedMotionFacts(
      page,
      'section[aria-label="训练完成"]',
    );
    expect(motionFacts.reducedMotionMatched).toBe(true);
    expect(motionFacts.maxAnimationDurationMs).toBeLessThanOrEqual(1);
    expect(motionFacts.maxTransitionDurationMs).toBeLessThanOrEqual(1);
    testInfo.annotations.push({
      type: "phase2-reduced-motion-facts",
      description: JSON.stringify({
        kind: "phase2-reduced-motion-facts",
        maxAnimationDurationMs: motionFacts.maxAnimationDurationMs,
        maxTransitionDurationMs: motionFacts.maxTransitionDurationMs,
        nextActionVisible: await nextAction.isVisible(),
        reducedMotionMatched: motionFacts.reducedMotionMatched,
        resultVisible: await result.isVisible(),
        schemaVersion: 1,
      }),
    });
  },
);

for (const routeId of ["overview", "plan", "problems"] as const) {
  test(
    `@phase2:accessibility-support @e2e:phase2-a11y-route-${routeId} `
    + `${routeId} 在桌面和移动布局记录 axe 与可见焦点事实`,
    async ({ page }, testInfo) => {
      await mockV2Api(page);
      const axeFacts: Array<Awaited<ReturnType<typeof collectPhase2AxeFacts>>> = [];
      let focusFailures = 0;
      for (const viewport of [
        { height: 900, width: 1_440 },
        { height: 844, width: 390 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(phase2EvidenceRoutePath(routeId));
        await expectPhase2EvidenceRouteReady(page, routeId);
        axeFacts.push(await collectPhase2AxeFacts(page));
        const focusTarget = page.locator("main button:visible").first();
        await expect(focusTarget).toBeVisible();
        await focusTarget.focus();
        if (!(await focusTarget.evaluate((element) => element === document.activeElement))) {
          focusFailures += 1;
        }
        await expect(focusTarget).toBeFocused();
      }
      testInfo.annotations.push({
        type: "phase2-accessibility-route-facts",
        description: JSON.stringify({
          axeCheckedViewportCount: axeFacts.length,
          axeViolationCount: axeFacts
            .reduce((total, facts) => total + facts.violationCount, 0),
          focusCheckCount: 2,
          focusFailures,
          kind: "phase2-accessibility-route-facts",
          routeId,
          schemaVersion: 1,
          seriousOrCriticalAxeFindings: axeFacts.reduce((total, facts) => (
            total + facts.seriousOrCriticalAxeFindings
          ), 0),
          viewportWidths: [390, 1_440],
        }),
      });
    },
  );
}

test("@e2e:shell-breakpoint-no-overflow 临界桌面宽度和长用户名保持无溢出", async ({ page }) => {
  await page.setViewportSize({ width: 861, height: 720 });
  const api = await mockV2Api(page);
  api.displayName = "Gary with an exceptionally long display name";
  await page.goto("/");
  await expectShellReady(page, "Gary with an exceptionally long display name，今天把一题练扎实");
  await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  await page.goto("/plan/typo");
  await expect(page.getByRole("heading", { name: "这里还没有训练场", exact: true })).toBeVisible();
  await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole("link", { name: "计划", exact: true })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test(
  "@phase2:plan @e2e:plan-tablet-task-editor @e2e:plan-recommendation @a11y:plan "
  + "计划页在 1024px 使用独立平板布局并完整编辑任务",
  async ({ page }) => {
    await page.setViewportSize({ width: 1_024, height: 768 });
    await mockV2Api(page);
    await page.goto("/plan");
    await expectShellReady(page, planTitleZh);
    await expect(page.locator('section[data-dashboard-layout="tablet-stacked"]')).toBeVisible();
    await expect(page.getByText("来源：Baseline 诊断", { exact: true })).toBeVisible();
    await expect(page.getByText(
      "Baseline 显示：统计当前得分为 75，建议优先安排针对性训练。",
      { exact: true },
    )).toBeVisible();
    await expect(page.getByText(/Baseline 显示 statistics/u)).toHaveCount(0);

    await page.getByRole("button", { name: "编辑任务", exact: true }).click();
    const editor = page.getByRole("form", { name: "编辑任务", exact: true });
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox", { name: "任务标题", exact: true })
      .fill("验证平板端任务编辑");
    await expect(editor.getByRole("button", { name: "保存更改", exact: true }))
      .toBeEnabled();

    const geometry = await page.evaluate(() => {
      const board = document.querySelector('[data-workflow-board="true"]');
      const aside = document.querySelector('aside[aria-label="当前建议"]');
      if (!(board instanceof HTMLElement) || !(aside instanceof HTMLElement)) return null;
      const boardBox = board.getBoundingClientRect();
      const asideBox = aside.getBoundingClientRect();
      return {
        asideTop: asideBox.top,
        boardBottom: boardBox.bottom,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.scrollWidth).toBe(geometry!.clientWidth);
    expect(geometry!.asideTop).toBeGreaterThanOrEqual(geometry!.boardBottom);
    await expectNoAxeViolations(page);

    await editor.getByRole("button", { name: "取消", exact: true }).click();
    await expect(editor).toBeHidden();
  },
);

const submitPlanTaskTitle = async (
  page: Page,
  title: string,
  beforeSubmit?: () => Promise<void>,
) => {
  await expectShellReady(page, planTitleZh);
  await page.getByRole("button", { name: "编辑任务", exact: true }).click();
  const editor = page.getByRole("form", { name: "编辑任务", exact: true });
  await editor.getByRole("textbox", { name: "任务标题", exact: true }).fill(title);
  await beforeSubmit?.();
  await editor.getByRole("button", { name: "保存更改", exact: true }).click();
};

test(
  "@phase2:plan @mutation:plan.update-task:recoverable-error @mutation:plan.update-task:retry "
  + "任务编辑可从暂时失败中使用原草稿安全重试",
  async ({ page }) => {
    const api = await mockV2Api(page);
    api.planMutationMode = "recoverable";
    await page.goto("/plan");
    const updatedTitle = "恢复后确认的任务标题";
    await submitPlanTaskTitle(page, updatedTitle);

    const recovery = page.locator('[data-recovery-state="recoverable-error"]');
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText("e2e-plan-update-recoverable");
    api.planMutationMode = "success";
    await recovery.getByRole("button", { name: "重试", exact: true }).click();

    await expect(recovery).toBeHidden();
    await expect(page.getByRole("heading", { name: updatedTitle, exact: true })).toBeVisible();
  },
);

test(
  "@phase2:plan @mutation:plan.update-task:non-recoverable-error "
  + "不可恢复的任务编辑可被明确放弃",
  async ({ page }) => {
    const api = await mockV2Api(page);
    api.planMutationMode = "non-recoverable";
    await page.goto("/plan");
    await submitPlanTaskTitle(page, "不会落盘的任务标题");

    const recovery = page.locator('[data-recovery-state="non-recoverable-error"]');
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText("e2e-plan-update-non-recoverable");
    await recovery.getByRole("button", { name: "放弃更改", exact: true }).click();
    await expect(recovery).toBeHidden();
    await expect(page.getByRole("button", { name: "编辑任务", exact: true })).toBeEnabled();
  },
);

test(
  "@phase2:plan @mutation:plan.update-task:offline-draft "
  + "离线任务草稿在恢复联网后继续提交",
  async ({ context, page }) => {
    const api = await mockV2Api(page);
    await page.goto("/plan");
    api.planMutationMode = "offline";
    const updatedTitle = "离线恢复后的任务标题";
    await submitPlanTaskTitle(
      page,
      updatedTitle,
      () => context.setOffline(true),
    );

    const recovery = page.locator('[data-recovery-state="offline-draft"]');
    await expect(recovery).toBeVisible();
    api.planMutationMode = "success";
    await context.setOffline(false);

    await expect(page.getByRole("heading", { name: updatedTitle, exact: true })).toBeVisible();
    await expect(recovery).toBeHidden();
  },
);

test(
  "@phase2:plan @mutation:plan.update-task:permission-denied "
  + "权限失效时任务编辑只允许重新验证身份",
  async ({ page }) => {
    const api = await mockV2Api(page);
    api.planMutationMode = "permission";
    await page.goto("/plan");
    await submitPlanTaskTitle(page, "等待重新验证的任务标题");

    const recovery = page.locator('[data-recovery-state="permission-denied"]');
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText("e2e-plan-update-permission");
    await recovery.getByRole("button", { name: "重新登录", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?reauth=1&redirect=%2Fplan$/u);
  },
);

test(
  "@phase2:plan @mutation:plan.update-task:stale-version-conflict "
  + "版本冲突时载入服务端最新计划并解除看板锁定",
  async ({ page }) => {
    const api = await mockV2Api(page);
    api.planMutationMode = "stale";
    await page.goto("/plan");
    await submitPlanTaskTitle(page, "发生版本冲突的任务标题");

    const recovery = page.locator('[data-recovery-state="stale-version-conflict"]');
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText("e2e-plan-update-stale");
    await recovery.getByRole("button", { name: "载入最新版本", exact: true }).click();

    await expect(recovery).toBeHidden();
    await expect(page.getByRole("button", { name: "编辑任务", exact: true })).toBeEnabled();
  },
);

type AdditionalPlanMutation = "complete-task" | "create" | "run-diagnostic";

const planMutationFixtureOperation = (
  operation: AdditionalPlanMutation,
): PlanMutationOperation => {
  if (operation === "complete-task") return "complete";
  if (operation === "run-diagnostic") return "diagnostic";
  return "create";
};

const prepareAdditionalPlanMutation = (
  api: ShellApiState,
  operation: AdditionalPlanMutation,
) => {
  if (operation === "create") {
    api.hasPlan = false;
    return;
  }
  api.hasPlan = true;
  if (operation === "run-diagnostic") {
    api.plan = {
      ...api.plan,
      diagnosticScore: 0,
      diagnosticScores: {},
      diagnosticStatus: "pending",
      recommendations: [],
    };
  }
};

const submitAdditionalPlanMutation = async (
  page: Page,
  operation: AdditionalPlanMutation,
  beforeSubmit?: () => Promise<void>,
) => {
  await expectShellReady(page, planTitleZh);
  if (operation === "create") {
    await beforeSubmit?.();
    await page.getByRole("button", { name: "创建训练计划", exact: true }).click();
    return;
  }
  if (operation === "complete-task") {
    await beforeSubmit?.();
    await page.getByRole("button", { name: "标记完成", exact: true }).click();
    return;
  }

  await page.getByRole("button", { name: "开始 Baseline", exact: true }).click();
  const questionnaire = page.locator("form").filter({
    has: page.getByRole("button", { name: "提交诊断", exact: true }),
  });
  const questions = questionnaire.locator("fieldset");
  await expect(questions).toHaveCount(8);
  for (let index = 0; index < 8; index += 1) {
    await questions.nth(index).locator('input[type="radio"]').first().check();
  }
  await beforeSubmit?.();
  await questionnaire.getByRole("button", { name: "提交诊断", exact: true }).click();
};

const expectAdditionalPlanMutationSucceeded = async (
  page: Page,
  operation: AdditionalPlanMutation,
) => {
  if (operation === "create") {
    await expect(page.getByRole("heading", {
      name: "量化研究（Quant Research）",
      exact: true,
    })).toBeVisible();
    return;
  }
  if (operation === "run-diagnostic") {
    await expect(page.getByRole("button", { name: "重新测评", exact: true })).toBeVisible();
    return;
  }
  await expect(page.locator('article[data-plan-task-status="completed"]')).toBeVisible();
};

const expectAdditionalPlanMutationReady = async (
  page: Page,
  operation: AdditionalPlanMutation,
) => {
  const actionName = operation === "create"
    ? "创建训练计划"
    : operation === "complete-task"
      ? "标记完成"
      : "提交诊断";
  await expect(page.getByRole("button", { name: actionName, exact: true })).toBeEnabled();
};

for (const operation of [
  "create",
  "run-diagnostic",
  "complete-task",
] as const satisfies readonly AdditionalPlanMutation[]) {
  const fixtureOperation = planMutationFixtureOperation(operation);

  test(
    `@phase2:plan @mutation:plan.${operation}:recoverable-error `
    + `@mutation:plan.${operation}:retry `
    + `${operation} 可从暂时失败中使用原草稿安全重试`,
    async ({ page }) => {
      const api = await mockV2Api(page);
      prepareAdditionalPlanMutation(api, operation);
      api.planMutationMode = "recoverable";
      await page.goto("/plan");
      await submitAdditionalPlanMutation(page, operation);

      const recovery = page.locator('[data-recovery-state="recoverable-error"]');
      await expect(recovery).toBeVisible();
      await expect(recovery).toContainText(`e2e-plan-${fixtureOperation}-recoverable`);
      api.planMutationMode = "success";
      await recovery.getByRole("button", { name: "重试", exact: true }).click();

      await expect(recovery).toBeHidden();
      await expectAdditionalPlanMutationSucceeded(page, operation);
    },
  );

  test(
    `@phase2:plan @mutation:plan.${operation}:non-recoverable-error `
    + `${operation} 的不可恢复更改可被明确放弃`,
    async ({ page }) => {
      const api = await mockV2Api(page);
      prepareAdditionalPlanMutation(api, operation);
      api.planMutationMode = "non-recoverable";
      await page.goto("/plan");
      await submitAdditionalPlanMutation(page, operation);

      const recovery = page.locator('[data-recovery-state="non-recoverable-error"]');
      await expect(recovery).toBeVisible();
      await expect(recovery).toContainText(`e2e-plan-${fixtureOperation}-non-recoverable`);
      await recovery.getByRole("button", { name: "放弃更改", exact: true }).click();

      await expect(recovery).toBeHidden();
      await expectAdditionalPlanMutationReady(page, operation);
    },
  );

  test(
    `@phase2:plan @mutation:plan.${operation}:offline-draft `
    + `${operation} 的离线草稿在恢复联网后继续提交`,
    async ({ context, page }) => {
      const api = await mockV2Api(page);
      prepareAdditionalPlanMutation(api, operation);
      api.planMutationMode = "offline";
      await page.goto("/plan");
      await submitAdditionalPlanMutation(
        page,
        operation,
        () => context.setOffline(true),
      );

      const recovery = page.locator('[data-recovery-state="offline-draft"]');
      await expect(recovery).toBeVisible();
      api.planMutationMode = "success";
      await context.setOffline(false);

      await expectAdditionalPlanMutationSucceeded(page, operation);
      await expect(recovery).toBeHidden();
    },
  );

  test(
    `@phase2:plan @mutation:plan.${operation}:permission-denied `
    + `${operation} 权限失效时只允许重新验证身份`,
    async ({ page }) => {
      const api = await mockV2Api(page);
      prepareAdditionalPlanMutation(api, operation);
      api.planMutationMode = "permission";
      await page.goto("/plan");
      await submitAdditionalPlanMutation(page, operation);

      const recovery = page.locator('[data-recovery-state="permission-denied"]');
      await expect(recovery).toBeVisible();
      await expect(recovery).toContainText(`e2e-plan-${fixtureOperation}-permission`);
      await recovery.getByRole("button", { name: "重新登录", exact: true }).click();
      await expect(page).toHaveURL(/\/login\?reauth=1&redirect=%2Fplan$/u);
    },
  );

  test(
    `@phase2:plan @mutation:plan.${operation}:stale-version-conflict `
    + `${operation} 版本冲突时载入服务端最新计划`,
    async ({ page }) => {
      const api = await mockV2Api(page);
      prepareAdditionalPlanMutation(api, operation);
      api.planMutationMode = "stale";
      await page.goto("/plan");
      await submitAdditionalPlanMutation(page, operation);

      const recovery = page.locator('[data-recovery-state="stale-version-conflict"]');
      await expect(recovery).toBeVisible();
      await expect(recovery).toContainText(`e2e-plan-${fixtureOperation}-stale`);
      await recovery.getByRole("button", { name: "载入最新版本", exact: true }).click();

      await expect(recovery).toBeHidden();
      await expectAdditionalPlanMutationReady(page, operation);
    },
  );
}

test("@e2e:first-visit-system-theme 首次登录访问跟随系统主题且不固化选择", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const api = await mockV2Api(page);
  api.meMode = "signed-out";
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), preferenceStorageKey))
    .toBeNull();
});

test("@e2e:theme-language-persistence 本地偏好即时生效并由权威 me 响应恢复", async ({ page }) => {
  const api = await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, overviewTitleZh);

  await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
  await page.getByRole("button", { name: "打开账户菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "Switch to English", exact: true }).click();

  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expectShellReady(page, overviewTitleEn);
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  }, preferenceStorageKey)).toEqual({ language: "en", theme: "dark" });

  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/u);
  await expectShellReady(page, planTitleEn);
  await expect(page.getByRole("progressbar", { name: "Progress", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Statistical inference foundations",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "Your baseline score for Statistics is 75; prioritize focused practice here.",
    { exact: true },
  )).toBeVisible();
  await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
  await expectNoAxeViolations(page);
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  api.preferences = { language: "en", theme: "dark", version: 2 };
  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ theme: "light", language: "zh-CN" }));
  }, preferenceStorageKey);
  const requestsBeforeReload = api.meRequestCount;
  await page.reload();

  await expect.poll(() => api.meRequestCount).toBeGreaterThan(requestsBeforeReload);
  await expectShellReady(page, planTitleEn);
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  }, preferenceStorageKey)).toEqual({ language: "en", theme: "dark" });
});

test(
  "@e2e:offline-and-error-recovery "
  + "@shared-state:network-recovery:offline-draft "
  + "@shared-state:network-recovery:recoverable-error "
  + "@shared-state:network-recovery:stale-conflict "
  + "@shared-state:network-recovery:permission-denied-retry "
  + "离线、可重试、冲突与权限状态均有固定恢复动作",
  async ({ context, page }) => {
    const api = await mockV2Api(page);
    await page.goto("/");
    await expectShellReady(page, overviewTitleZh);

    await context.setOffline(true);
    const offlineBanner = page.locator('[data-network-status="offline"]');
    await expect(offlineBanner).toBeVisible();
    await expect(offlineBanner).toContainText("你的更改会先安全保留");
    await context.setOffline(false);
    await expect(offlineBanner).toHaveCount(0);

    api.meMode = "recoverable";
    await page.reload();
    const recoverable = page.locator('[data-recovery-state="recoverable-error"]');
    await expect(recoverable).toContainText("暂时无法连接");
    await expect(recoverable).toContainText("e2e-recoverable-request-id");
    api.meMode = "authenticated";
    const requestsBeforeRetry = api.meRequestCount;
    await recoverable.getByRole("button", { name: "重试", exact: true }).click();
    await expect.poll(() => api.meRequestCount).toBeGreaterThan(requestsBeforeRetry);
    await expectShellReady(page, overviewTitleZh);

    api.meMode = "stale";
    await page.reload();
    const stale = page.locator('[data-recovery-state="stale-version-conflict"]');
    await expect(stale).toContainText("内容已在其他位置更新");
    await expect(stale).toContainText("e2e-stale-request-id");
    api.meMode = "authenticated";
    await stale.getByRole("button", { name: "重新载入", exact: true }).click();
    await expectShellReady(page, overviewTitleZh);

    api.meMode = "permission";
    await page.reload();
    const permission = page.locator('[data-recovery-state="permission-denied"]');
    await expect(permission).toContainText("你暂时没有权限执行此操作");
    await expect(permission).toContainText("e2e-permission-request-id");
    await permission.getByRole("button", { name: "重新登录", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?reauth=1$/u);
    await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible();
  },
);

test("@a11y:desktop-shell @a11y:theme-language 桌面明暗主题通过无障碍门禁", async ({ page }) => {
  await page.setViewportSize({ width: 1_280, height: 720 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, overviewTitleZh);
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expectNoAxeViolations(page);
});

test("@a11y:mobile-shell 移动导航与完整抽屉通过无障碍门禁", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, overviewTitleZh);
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "更多", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "全部模块", exact: true });
  await expect(dialog).toBeVisible();
  await waitForSubtreeAnimations(page, '[role="dialog"]');
  await expectNoAxeViolations(page);
});

test("@a11y:network-recovery 错误恢复与请求编号通过无障碍门禁", async ({ page }) => {
  const api = await mockV2Api(page);
  api.meMode = "recoverable";
  await page.goto("/");
  await expect(page.locator('[data-recovery-state="recoverable-error"]')).toContainText(
    "e2e-recoverable-request-id",
    { timeout: shellReadyTimeoutMs },
  );
  await expectNoAxeViolations(page);
});

test("@visual:desktop-shell:light-dark @visual:mobile-shell @visual:theme-language:light-dark 壳层视觉基线", async ({ page }) => {
  const api = await mockV2Api(page);
  const cases = [
    { name: "shell-light-laptop.png", theme: "light" as const, viewport: { width: 1_280, height: 720 } },
    { name: "shell-dark-laptop.png", theme: "dark" as const, viewport: { width: 1_280, height: 720 } },
    { name: "shell-light-mobile.png", theme: "light" as const, viewport: { width: 390, height: 844 } },
    { name: "shell-dark-mobile.png", theme: "dark" as const, viewport: { width: 390, height: 844 } },
  ];

  for (const visualCase of cases) {
    api.preferences = { language: "zh-CN", theme: visualCase.theme, version: api.preferences.version + 1 };
    await page.setViewportSize(visualCase.viewport);
    await page.goto("/");
    await expectShellReady(page, overviewTitleZh);
    await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", visualCase.theme);
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    await expect(page).toHaveScreenshot(visualCase.name, { fullPage: true });
  }
});

test("@phase2:plan @visual:plan:light-dark 计划页覆盖桌面、笔记本、平板与移动端明暗基线", async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  const api = await mockV2Api(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewports = [
    { label: "desktop", size: { width: 1_440, height: 900 } },
    { label: "laptop", size: { width: 1_280, height: 720 } },
    { label: "tablet", size: { width: 1_024, height: 768 } },
    { label: "mobile", size: { width: 390, height: 844 } },
  ] as const;

  for (const viewport of viewports) {
    for (const theme of ["light", "dark"] as const) {
      api.preferences = {
        language: "zh-CN",
        theme,
        version: api.preferences.version + 1,
      };
      await page.setViewportSize(viewport.size);
      await page.goto("/plan");
      await expectShellReady(page, planTitleZh, 60_000);
      await expect(page.getByRole("heading", {
        name: "统计推断基础训练",
        exact: true,
      })).toBeVisible();
      await expect(page.getByText("来源：Baseline 诊断", { exact: true })).toBeVisible();
      await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
      await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
      await expect(page).toHaveScreenshot(
        `plan-${theme}-${viewport.label}.png`,
        { fullPage: true },
      );
      await capturePhase2ReviewImage(page, {
        routeId: "plan",
        theme,
        viewportId: viewport.label,
      });
    }
  }
});

test("@visual:network-recovery:light-dark 网络恢复视觉基线", async ({ page }) => {
  const api = await mockV2Api(page);
  api.meMode = "recoverable";
  await page.setViewportSize({ width: 1_280, height: 720 });

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    const recovery = page.locator('[data-recovery-state="recoverable-error"]');
    await expect(recovery).toContainText(
      "e2e-recoverable-request-id",
      { timeout: shellReadyTimeoutMs },
    );
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
    await expect(page).toHaveScreenshot(`network-recovery-${theme}-laptop.png`, { fullPage: true });
  }
});
