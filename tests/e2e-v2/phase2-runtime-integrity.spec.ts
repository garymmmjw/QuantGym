import {
  expect,
  test,
  type Page,
  type Request,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";

const appOrigin = "http://localhost:42731";
const problemId = "11111111-1111-4111-8111-111111111111";
const planId = "10000000-0000-4000-8000-000000000001";
const planTaskId = "20000000-0000-4000-8000-000000000002";
const csrfToken = "e2e_runtime_integrity_csrf_abcdefghijklmnopqrstuvwxyz";

const preferences = {
  language: "zh-CN",
  theme: "light",
  version: 1,
} as const;

const plan = {
  createdAt: "2026-07-27T02:00:00Z",
  diagnosticScore: 76,
  diagnosticScores: { statistics: 75 },
  diagnosticStatus: "completed",
  id: planId,
  progress: { completed: 0, total: 1 },
  recommendations: [{
    createdAt: "2026-07-27T02:00:00Z",
    id: "50000000-0000-4000-8000-000000000005",
    kind: "skill",
    problemId,
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
    actionTarget: "problems",
    completedAt: null,
    createdAt: "2026-07-27T02:00:00Z",
    detail: "完成一组统计推断题并记录假设。",
    estimatedMinutes: 30,
    id: planTaskId,
    planId,
    recommendationId: "50000000-0000-4000-8000-000000000005",
    scheduledFor: "2026-07-28",
    skillKey: "statistics",
    sortOrder: 0,
    status: "open",
    targetProblemId: problemId,
    title: "统计推断基础训练",
    updatedAt: "2026-07-27T02:00:00Z",
    version: 2,
  }],
  track: "internship",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 4,
  weeklyHours: 8,
} as const;

const problem = {
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
  id: problemId,
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
  titleEn: "Expected Value of a Random Variable",
  titleZh: "随机变量的期望",
  version: 1,
} as const;

const problemSummary = {
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
};

const json = (body: unknown, status = 200, headers = {}) => ({
  body: JSON.stringify(body),
  contentType: "application/json",
  headers,
  status,
});

const responseFor = (request: Request) => {
  const { pathname } = new URL(request.url());
  const method = request.method();
  if (pathname === "/api/v2/me" && method === "GET") {
    return json({
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences,
    }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }
  if (pathname === "/api/v2/auth/csrf" && method === "GET") {
    return json({ csrfToken });
  }
  if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
    return json({
      planProgress: {
        completedTasks: 0,
        planId,
        totalTasks: 1,
        version: 4,
      },
      profile: {
        displayName: "Gary",
        level: 7,
        streakDays: 12,
        weeklyXp: 480,
      },
      recentXp: [],
      resourceVersions: { plan: 4, training: 1 },
      todayTask: {
        actionResourceId: problemId,
        actionTarget: "problems",
        id: planTaskId,
        rewardXp: 40,
        status: "open",
        title: "完成两数之和训练",
        unlockReason: "巩固数组与哈希表",
        version: 2,
      },
      unreadNotificationCount: 0,
      weakness: {
        label: "数组与哈希表",
        recommendedProblemId: problemId,
        score: 72,
        skillKey: "arrays",
      },
    });
  }
  if (pathname === "/api/v2/plans/current" && method === "GET") {
    return json({ plan });
  }
  if (pathname === "/api/v2/problems" && method === "GET") {
    return json({
      availableSources: [problem.source],
      items: [problemSummary],
      nextCursor: null,
    });
  }
  if (pathname === `/api/v2/problems/${problemId}` && method === "GET") {
    return json(problem);
  }
  if (pathname === "/api/v2/notifications" && method === "GET") {
    return json({ items: [], nextCursor: null, unreadCount: 0 });
  }
  if (pathname === "/api/v2/todos" && method === "GET") {
    return json({ items: [] });
  }
  if (pathname === "/api/v2/auth/logout" && method === "POST") {
    return json({ status: "ok" });
  }
  return json({
    code: "E2E_API_ROUTE_UNHANDLED",
    fieldErrors: {},
    message: `${method} ${pathname}`,
    requestId: "e2e-runtime-integrity-unhandled",
    retryable: false,
  }, 404);
};

const isFirstParty = (url: string) => {
  try {
    return new URL(url).origin === appOrigin;
  } catch {
    return false;
  }
};

const routeReady = async (page: Page, pathname: string) => {
  if (pathname === "/") {
    await expect(page.getByRole("heading", {
      name: "Gary，今天把一题练扎实",
      exact: true,
    })).toBeVisible({ timeout: 20_000 });
  } else if (pathname === "/plan") {
    await expect(page.getByRole("heading", {
      name: "你的量化职业训练计划",
      exact: true,
    })).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(page.getByRole("heading", {
      name: "题目 Problems",
      exact: true,
    })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`article[data-problem-id="${problemId}"]`)).toBeVisible({
      timeout: 20_000,
    });
  }
  await expect(page.getByRole("main")).toHaveAttribute("id", "qg-main-content");
  await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
};

test.describe.configure({ mode: "serial", retries: 0 });

test(
  "@phase2:runtime-integrity @e2e:phase2-runtime-integrity "
  + "三条主路径无控制台错误、未处理异常、失败的一方请求或水平溢出",
  async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await mockLegacyPreviewFrame(page);
    await page.route("**/api/v2/**", async (route) => {
      await route.fulfill(responseFor(route.request()));
    });

    const applicationConsoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const unhandledRejections: string[] = [];
    const failedFirstPartyRequests: string[] = [];
    let horizontalOverflowPx = 0;

    page.on("console", (message) => {
      if (message.type() === "error") applicationConsoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "failed";
      if (isFirstParty(request.url()) && failure !== "net::ERR_ABORTED") {
        failedFirstPartyRequests.push(
          `${request.method()} ${request.url()} ${failure}`,
        );
      }
    });
    page.on("response", (response) => {
      if (isFirstParty(response.url()) && response.status() >= 400) {
        failedFirstPartyRequests.push(
          `${response.request().method()} ${response.url()} HTTP ${response.status()}`,
        );
      }
    });
    await page.exposeFunction("__qgPhase2UnhandledRejection", (reason: string) => {
      unhandledRejections.push(reason);
    });
    await page.addInitScript(() => {
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
        const report = (window as typeof window & {
          __qgPhase2UnhandledRejection?: (message: string) => Promise<void>;
        }).__qgPhase2UnhandledRejection;
        void report?.(reason);
      });
    });

    const cases = [
      { pathname: "/", viewport: { height: 900, width: 1_440 } },
      { pathname: "/plan", viewport: { height: 900, width: 1_440 } },
      { pathname: `/problems?problem=${problemId}`, viewport: { height: 900, width: 1_440 } },
      { pathname: "/", viewport: { height: 844, width: 390 } },
      { pathname: "/plan", viewport: { height: 844, width: 390 } },
      { pathname: `/problems?problem=${problemId}`, viewport: { height: 844, width: 390 } },
    ] as const;

    for (const acceptanceCase of cases) {
      await page.setViewportSize(acceptanceCase.viewport);
      await page.goto(acceptanceCase.pathname);
      await routeReady(page, new URL(page.url()).pathname);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ));
      horizontalOverflowPx = Math.max(horizontalOverflowPx, overflow);
    }

    const metrics = {
      applicationConsoleErrors: applicationConsoleErrors.length,
      unhandledRejections: unhandledRejections.length,
      pageErrors: pageErrors.length,
      failedFirstPartyRequests: failedFirstPartyRequests.length,
      horizontalOverflowPx,
    };
    testInfo.annotations.push({
      type: "phase2-runtime-integrity-metrics",
      description: JSON.stringify(metrics),
    });

    expect(applicationConsoleErrors, "application console errors").toEqual([]);
    expect(unhandledRejections, "unhandled browser rejections").toEqual([]);
    expect(pageErrors, "page errors").toEqual([]);
    expect(failedFirstPartyRequests, "failed first-party requests").toEqual([]);
    expect(horizontalOverflowPx, "maximum horizontal overflow").toBe(0);
  },
);
