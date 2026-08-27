import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";

type Phase2PerformanceState = {
  cls: number;
  entries: Array<{
    duration: number;
    interactionId: number;
    name: string;
    startTime: number;
  }>;
  errors: string[];
  lcpMs: number;
  supported: {
    eventTiming: boolean;
    layoutShift: boolean;
    lcp: boolean;
  };
};

type PerformanceSample = {
  cls: number;
  horizontalOverflowPx: number;
  id: string;
  inpMs: number;
  inpSource: "event-timing";
  interaction: {
    eventTimingCandidateCount: number;
    fallbackLatencyMs: number;
    kind: "mobile-more-button-click" | "theme-toggle-button-click";
    label: "切换到深色主题" | "更多";
  };
  lcpMs: number;
  navigation: {
    domContentLoadedMs: number;
    durationMs: number;
    responseStartMs: number;
  };
  observers: {
    errors: string[];
    eventTimingSupported: boolean;
    layoutShiftSupported: boolean;
    lcpSupported: boolean;
  };
  path: "/" | "/plan" | "/problems";
  resources: {
    count: number;
    decodedBodyBytes: number;
  };
  run: 1 | 2 | 3 | 4;
  routeId: "overview" | "plan" | "problems";
  viewport: {
    height: number;
    id: "desktop" | "mobile";
    width: number;
  };
};

type PerformanceCaseMetrics = {
  cls: number;
  horizontalOverflowPx: number;
  id: string;
  inpP75Ms: number;
  lcpP75Ms: number;
  sampleCount: 4;
};

type PerformanceAnnotation = {
  caseMetrics: PerformanceCaseMetrics[];
  cases: PerformanceSample[];
  kind: "phase2-performance-samples";
  metrics: {
    cls: number;
    horizontalOverflowPx: number;
    inpP75Ms: number;
    lcpP75Ms: number;
  };
  sampleCount: 24;
  samplesPerCase: 4;
  schemaVersion: 1;
};

const csrfToken = "e2e_performance_csrf_abcdefghijklmnopqrstuvwxyz";
const problemId = "11111111-1111-4111-8111-111111111111";
const planId = "10000000-0000-4000-8000-000000000001";
const planTaskId = "20000000-0000-4000-8000-000000000002";
const readyTimeoutMs = 20_000;
const samplesPerCase = 4 as const;

const currentPlan = {
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
};

const source = {
  contentVersion: "preview-internal-v1",
  name: "QuantGym Preview",
  slug: "quantgym-preview",
};

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
  source,
  tags: ["期望", "随机变量"],
  titleEn: "Expected Value of a Random Variable",
  titleZh: "随机变量的期望",
  version: 1,
};

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

const overview = {
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
  resourceVersions: { plan: 4, training: 3 },
  todayTask: {
    actionResourceId: problemId,
    actionTarget: "problems",
    id: planTaskId,
    rewardXp: 40,
    status: "open",
    title: "完成随机变量训练",
    unlockReason: "巩固概率基础",
    version: 2,
  },
  unreadNotificationCount: 0,
  weakness: {
    label: "概率",
    recommendedProblemId: problemId,
    score: 72,
    skillKey: "probability",
  },
};

const jsonResponse = (body: unknown, status = 200, headers = {}) => ({
  body: JSON.stringify(body),
  contentType: "application/json",
  headers,
  status,
});

const responseFor = (request: Request, preferences: { theme: "light" | "dark" }) => {
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();
  if (pathname === "/api/v2/me" && method === "GET") {
    return jsonResponse({
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences: {
        language: "zh-CN",
        theme: preferences.theme,
        version: preferences.theme === "light" ? 1 : 2,
      },
    }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }
  if (pathname === "/api/v2/preferences" && method === "PATCH") {
    const payload = request.postDataJSON() as { theme?: "light" | "dark" };
    preferences.theme = payload.theme ?? preferences.theme;
    return jsonResponse({
      language: "zh-CN",
      theme: preferences.theme,
      version: 2,
    });
  }
  if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
    return jsonResponse(overview);
  }
  if (pathname === "/api/v2/plans/current" && method === "GET") {
    return jsonResponse({ plan: currentPlan });
  }
  if (pathname === "/api/v2/problems" && method === "GET") {
    return jsonResponse({
      availableSources: [source],
      items: [problemSummary],
      nextCursor: null,
    });
  }
  if (pathname === `/api/v2/problems/${problemId}` && method === "GET") {
    return jsonResponse(problem);
  }
  if (pathname === "/api/v2/notifications" && method === "GET") {
    return jsonResponse({ items: [], nextCursor: null, unreadCount: 0 });
  }
  if (pathname === "/api/v2/todos" && method === "GET") {
    return jsonResponse({ items: [] });
  }
  if (pathname === "/api/v2/auth/csrf" && method === "GET") {
    return jsonResponse({ csrfToken }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }
  return jsonResponse({
    code: "E2E_PERFORMANCE_ROUTE_UNHANDLED",
    fieldErrors: {},
    message: `${method} ${pathname}`,
    requestId: "e2e-performance-unhandled",
    retryable: false,
  }, 404);
};

const installPerformanceObservers = () => {
  const state: Phase2PerformanceState = {
    cls: 0,
    entries: [],
    errors: [],
    lcpMs: 0,
    supported: {
      eventTiming: PerformanceObserver.supportedEntryTypes.includes("event"),
      layoutShift: PerformanceObserver.supportedEntryTypes.includes("layout-shift"),
      lcp: PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint"),
    },
  };
  (globalThis as typeof globalThis & {
    __quantgymPhase2Performance: Phase2PerformanceState;
  }).__quantgymPhase2Performance = state;

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last !== undefined) state.lcpMs = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (error) {
    state.errors.push(`lcp:${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!layoutShift.hadRecentInput) state.cls += layoutShift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch (error) {
    state.errors.push(`layout-shift:${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const event = entry as PerformanceEntry & {
          duration: number;
          interactionId: number;
          name: string;
        };
        state.entries.push({
          duration: event.duration,
          interactionId: event.interactionId,
          name: event.name,
          startTime: event.startTime,
        });
      }
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit & { durationThreshold: number });
  } catch (error) {
    state.errors.push(`event:${error instanceof Error ? error.message : String(error)}`);
  }
};

const mockApi = async (page: Page) => {
  await mockLegacyPreviewFrame(page);
  const preferences = { theme: "light" as const } as { theme: "light" | "dark" };
  await page.route("**/api/v2/**", async (route) => {
    await route.fulfill(responseFor(route.request(), preferences));
  });
};

const readyForRoute = async (page: Page, routeId: PerformanceSample["routeId"]) => {
  if (routeId === "overview") {
    await expect(page.getByRole("heading", {
      name: "Gary，今天把一题练扎实",
      exact: true,
    })).toBeVisible({ timeout: readyTimeoutMs });
    return;
  }
  if (routeId === "plan") {
    await expect(page.getByRole("heading", {
      name: "你的量化职业训练计划",
      exact: true,
    })).toBeVisible({ timeout: readyTimeoutMs });
    return;
  }
  await expect(page.getByRole("heading", {
    name: "题目 Problems",
    exact: true,
  })).toBeVisible({ timeout: readyTimeoutMs });
  await expect(page.getByRole("button", {
    name: /随机变量的期望/u,
  }).first()).toBeVisible({ timeout: readyTimeoutMs });
};

const round = (value: number, precision = 2) => {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
};

const p75 = (values: number[]) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * 0.75) - 1)] ?? 0;
};

const captureCase = async (
  browser: Browser,
  performanceCase: Pick<PerformanceSample, "id" | "path" | "routeId" | "run" | "viewport">,
): Promise<PerformanceSample> => {
  const context: BrowserContext = await browser.newContext({
    colorScheme: "light",
    locale: "zh-CN",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: {
      height: performanceCase.viewport.height,
      width: performanceCase.viewport.width,
    },
  });
  await context.addInitScript(installPerformanceObservers);
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`);
  });
  try {
    await mockApi(page);
    const response = await page.goto(performanceCase.path, {
      waitUntil: "load",
      timeout: readyTimeoutMs,
    });
    expect(response?.status()).toBe(200);
    await readyForRoute(page, performanceCase.routeId);
    await expect(page.locator("iframe[data-legacy-preview-frame]")).toHaveCount(0);
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(500);

    const mobile = performanceCase.viewport.id === "mobile";
    const interaction = page.getByRole("button", {
      name: mobile ? "更多" : "切换到深色主题",
      exact: true,
    });
    await expect(interaction).toBeVisible();
    const interactionStartedAt = await page.evaluate(() => performance.now());
    await interaction.click();
    if (mobile) {
      await expect(page.getByRole("dialog", {
        name: "全部模块",
        exact: true,
      })).toBeVisible();
    } else {
      await expect(page.getByRole("button", {
        name: "切换到浅色主题",
        exact: true,
      })).toBeVisible();
    }
    await page.waitForTimeout(250);

    const measured = await page.evaluate(async (startedAt) => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const state = (globalThis as typeof globalThis & {
        __quantgymPhase2Performance: Phase2PerformanceState;
      }).__quantgymPhase2Performance;
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const candidates = state.entries.filter((entry) => (
        entry.interactionId > 0 && entry.startTime >= startedAt
      ));
      const fallbackLatencyMs = performance.now() - startedAt;
      const eventTimingInp = Math.max(0, ...candidates.map((entry) => entry.duration));
      const documentWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth ?? 0,
      );
      return {
        cls: state.cls,
        eventTimingCandidateCount: candidates.length,
        fallbackLatencyMs,
        horizontalOverflowPx: Math.max(
          0,
          documentWidth - document.documentElement.clientWidth,
        ),
        inpMs: eventTimingInp,
        inpSource: "event-timing" as const,
        lcpMs: state.lcpMs,
        navigation: navigation === undefined ? null : {
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          durationMs: navigation.duration,
          responseStartMs: navigation.responseStart,
        },
        observers: {
          errors: state.errors,
          eventTimingSupported: state.supported.eventTiming,
          layoutShiftSupported: state.supported.layoutShift,
          lcpSupported: state.supported.lcp,
        },
        resources: {
          count: resources.length,
          decodedBodyBytes: resources.reduce(
            (total, resource) => total + resource.decodedBodySize,
            0,
          ),
        },
      };
    }, interactionStartedAt);

    expect(measured.navigation).not.toBeNull();
    if (measured.navigation === null) throw new Error("navigation timing unavailable");
    expect(measured.observers.errors).toEqual([]);
    expect(measured.observers.lcpSupported).toBe(true);
    expect(measured.observers.layoutShiftSupported).toBe(true);
    expect(measured.observers.eventTimingSupported).toBe(true);
    expect(measured.eventTimingCandidateCount).toBeGreaterThan(0);
    expect(measured.lcpMs).toBeGreaterThan(0);
    expect(measured.inpMs).toBeGreaterThan(0);
    expect(measured.fallbackLatencyMs).toBeGreaterThan(0);
    expect(measured.resources.count).toBeGreaterThan(0);
    expect(runtimeErrors).toEqual([]);

    return {
      cls: round(measured.cls, 5),
      horizontalOverflowPx: measured.horizontalOverflowPx,
      id: performanceCase.id,
      inpMs: round(measured.inpMs),
      inpSource: measured.inpSource,
      interaction: {
        eventTimingCandidateCount: measured.eventTimingCandidateCount,
        fallbackLatencyMs: round(measured.fallbackLatencyMs),
        kind: mobile ? "mobile-more-button-click" : "theme-toggle-button-click",
        label: mobile ? "更多" : "切换到深色主题",
      },
      lcpMs: round(measured.lcpMs),
      navigation: {
        domContentLoadedMs: round(measured.navigation.domContentLoadedMs),
        durationMs: round(measured.navigation.durationMs),
        responseStartMs: round(measured.navigation.responseStartMs),
      },
      observers: measured.observers,
      path: performanceCase.path,
      resources: measured.resources,
      run: performanceCase.run,
      routeId: performanceCase.routeId,
      viewport: performanceCase.viewport,
    };
  } finally {
    await context.close();
  }
};

test.describe.configure({ mode: "serial", retries: 0, timeout: 300_000 });

test(
  "@phase2:performance @e2e:phase2-performance "
  + "真实页面按六组路由视口分别采集四次 Web Vitals、交互延迟与横向溢出样本",
  async ({ browser }, testInfo) => {
    const routes = [
      { path: "/" as const, routeId: "overview" as const },
      { path: "/plan" as const, routeId: "plan" as const },
      { path: "/problems" as const, routeId: "problems" as const },
    ];
    const viewports = [
      { height: 900, id: "desktop" as const, width: 1_440 },
      { height: 844, id: "mobile" as const, width: 390 },
    ];
    const samples: PerformanceSample[] = [];
    for (const route of routes) {
      for (const viewport of viewports) {
        for (let run = 1; run <= samplesPerCase; run += 1) {
          samples.push(await captureCase(browser, {
            id: `${route.routeId}--${viewport.id}`,
            path: route.path,
            routeId: route.routeId,
            run: run as PerformanceSample["run"],
            viewport,
          }));
        }
      }
    }

    const caseMetrics = routes.flatMap((route) => viewports.map((viewport) => {
      const id = `${route.routeId}--${viewport.id}`;
      const caseSamples = samples.filter((sample) => sample.id === id);
      expect(caseSamples).toHaveLength(samplesPerCase);
      return {
        cls: p75(caseSamples.map((sample) => sample.cls)),
        horizontalOverflowPx: Math.max(
          0,
          ...caseSamples.map((sample) => sample.horizontalOverflowPx),
        ),
        id,
        inpP75Ms: p75(caseSamples.map((sample) => sample.inpMs)),
        lcpP75Ms: p75(caseSamples.map((sample) => sample.lcpMs)),
        sampleCount: samplesPerCase,
      } satisfies PerformanceCaseMetrics;
    }));
    expect(samples).toHaveLength(24);
    for (const metrics of caseMetrics) {
      expect(metrics.lcpP75Ms, `${metrics.id} LCP p75`).toBeLessThanOrEqual(2_500);
      expect(metrics.inpP75Ms, `${metrics.id} INP p75`).toBeLessThanOrEqual(200);
      expect(metrics.cls, `${metrics.id} CLS`).toBeLessThanOrEqual(0.1);
      expect(metrics.horizontalOverflowPx, `${metrics.id} overflow`).toBe(0);
    }

    const annotation: PerformanceAnnotation = {
      caseMetrics,
      cases: samples,
      kind: "phase2-performance-samples",
      metrics: {
        cls: Math.max(...caseMetrics.map((entry) => entry.cls)),
        horizontalOverflowPx: Math.max(
          0,
          ...caseMetrics.map((entry) => entry.horizontalOverflowPx),
        ),
        inpP75Ms: Math.max(...caseMetrics.map((entry) => entry.inpP75Ms)),
        lcpP75Ms: Math.max(...caseMetrics.map((entry) => entry.lcpP75Ms)),
      },
      sampleCount: 24,
      samplesPerCase,
      schemaVersion: 1,
    };
    testInfo.annotations.push({
      description: JSON.stringify(annotation),
      type: "phase2-performance-metrics",
    });
  },
);
