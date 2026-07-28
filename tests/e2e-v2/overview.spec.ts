import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";
import { capturePhase2ReviewImage } from "./phase2-review.fixture";

test.describe.configure({ timeout: 90_000 });

type OverviewTheme = "light" | "dark";
type TrainingMode =
  | "success"
  | "recoverable"
  | "non-recoverable"
  | "offline"
  | "permission"
  | "retry"
  | "stale";

type TrainingCall = Readonly<{
  body: Readonly<{
    planTaskId?: string;
    problemId: string;
  }>;
  csrfToken: string | undefined;
  idempotencyKey: string | undefined;
}>;

type OverviewApiState = {
  dashboardRequestCount: number;
  preferences: {
    language: "zh-CN";
    theme: OverviewTheme;
    version: number;
  };
  resumed: boolean;
  trainingCalls: TrainingCall[];
  trainingMode: TrainingMode;
};

const csrfToken = "e2e_overview_csrf_abcdefghijklmnopqrstuvwxyz";
const overviewTitle = "Gary，今天把一题练扎实";
const overviewCta = "开始 / 继续训练";
const planId = "10000000-0000-4000-8000-000000000001";
const planTaskId = "20000000-0000-4000-8000-000000000002";
const problemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const routeReadyTimeoutMs = 20_000;
const draftDatabaseName = "qg-v2-phase2-draft-recovery";

const dashboardOverview = {
  planProgress: {
    completedTasks: 2,
    planId,
    totalTasks: 5,
    version: 4,
  },
  profile: {
    displayName: "Gary",
    level: 7,
    streakDays: 12,
    weeklyXp: 480,
  },
  recentXp: [
    {
      amount: 80,
      id: "40000000-0000-4000-8000-000000000004",
      occurredAt: "2026-07-26T08:00:00Z",
      reason: "problem_completion",
      skillKey: "arrays",
    },
    {
      amount: 60,
      id: "50000000-0000-4000-8000-000000000005",
      occurredAt: "2026-07-25T08:00:00Z",
      reason: "problem_completion",
      skillKey: "probability",
    },
  ],
  resourceVersions: {
    plan: 4,
    training: 3,
  },
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
} as const;

const errorResponse = (
  mode: Exclude<TrainingMode, "offline" | "retry" | "success">,
) => {
  const failures = {
    "non-recoverable": {
      code: "TRAINING_REQUEST_INVALID",
      message: "当前推荐无法建立训练会话。",
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
      code: "TRAINING_SERVICE_UNAVAILABLE",
      message: "训练服务暂时不可用。",
      retryable: true,
      status: 503,
    },
    stale: {
      code: "TRAINING_VERSION_CONFLICT",
      message: "训练推荐已在其他位置更新。",
      retryable: false,
      status: 409,
    },
  } as const;
  const failure = failures[mode];
  const requestId = `e2e-overview-${mode}`;
  return {
    body: JSON.stringify({
      code: failure.code,
      fieldErrors: {},
      message: failure.message,
      requestId,
      retryable: failure.retryable,
    }),
    contentType: "application/json",
    headers: { "x-request-id": requestId },
    status: failure.status,
  };
};

const retryFailureResponse = () => ({
  body: JSON.stringify({
    code: "TRAINING_SERVICE_UNAVAILABLE",
    fieldErrors: {},
    message: "第一次启动暂时失败。",
    requestId: "e2e-overview-retry-first",
    retryable: true,
  }),
  contentType: "application/json",
  headers: { "x-request-id": "e2e-overview-retry-first" },
  status: 503,
});

const successResponse = (state: OverviewApiState) => ({
  body: JSON.stringify({
    problemId,
    resumed: state.resumed,
    sessionId,
    sessionVersion: state.resumed ? 4 : 1,
  }),
  contentType: "application/json",
  status: 200,
});

const recordTrainingCall = (
  request: Request,
  state: OverviewApiState,
): TrainingCall => {
  const body = request.postDataJSON() as TrainingCall["body"];
  const headers = request.headers();
  const call = {
    body,
    csrfToken: headers["x-csrf-token"],
    idempotencyKey: headers["x-idempotency-key"],
  };
  state.trainingCalls.push(call);
  return call;
};

const mockOverviewApi = async (
  page: Page,
  initialMode: TrainingMode = "success",
) => {
  await mockLegacyPreviewFrame(page);
  let releaseRetryResponse = () => undefined;
  const retryResponseGate = new Promise<void>((resolve) => {
    releaseRetryResponse = resolve;
  });
  const state: OverviewApiState = {
    dashboardRequestCount: 0,
    preferences: {
      language: "zh-CN",
      theme: "light",
      version: 1,
    },
    resumed: false,
    trainingCalls: [],
    trainingMode: initialMode,
  };

  await page.route("**/api/v2/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === "/api/v2/me" && method === "GET") {
      await route.fulfill({
        body: JSON.stringify({
          displayName: "Gary",
          email: "gary@example.com",
          emailVerified: true,
          preferences: state.preferences,
        }),
        contentType: "application/json",
        headers: {
          "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
        },
        status: 200,
      });
      return;
    }

    if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
      state.dashboardRequestCount += 1;
      await route.fulfill({
        body: JSON.stringify(dashboardOverview),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (pathname === "/api/v2/training/sessions" && method === "POST") {
      recordTrainingCall(request, state);
      if (state.trainingMode === "offline") {
        await route.abort("internetdisconnected");
        return;
      }
      if (state.trainingMode === "retry" && state.trainingCalls.length === 1) {
        await route.fulfill(retryFailureResponse());
        return;
      }
      if (state.trainingMode === "retry") await retryResponseGate;
      if (
        state.trainingMode === "recoverable"
        || state.trainingMode === "non-recoverable"
        || state.trainingMode === "permission"
        || state.trainingMode === "stale"
      ) {
        await route.fulfill(errorResponse(state.trainingMode));
        return;
      }
      await route.fulfill(successResponse(state));
      return;
    }

    if (pathname === "/api/v2/notifications" && method === "GET") {
      await route.fulfill({
        body: JSON.stringify({
          items: [],
          nextCursor: null,
          unreadCount: 0,
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (pathname === "/api/v2/todos" && method === "GET") {
      await route.fulfill({
        body: JSON.stringify({ items: [] }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        code: "E2E_API_ROUTE_UNHANDLED",
        fieldErrors: {},
        message: pathname,
        requestId: "e2e-overview-unhandled",
        retryable: false,
      }),
      contentType: "application/json",
      status: 404,
    });
  });

  return {
    releaseRetryResponse,
    state,
  };
};

const expectOverviewReady = async (page: Page) => {
  await expect(page.getByRole("heading", {
    name: overviewTitle,
    exact: true,
  })).toBeVisible({ timeout: routeReadyTimeoutMs });
  await expect(page.getByRole("main")).toHaveAttribute(
    "id",
    "qg-main-content",
    { timeout: routeReadyTimeoutMs },
  );
  await expect(page.getByRole("button", {
    name: overviewCta,
    exact: true,
  })).toBeEnabled({ timeout: routeReadyTimeoutMs });
};

const expectNoAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, results.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => (
      node.target.join(" ")
    )).join(", ")}`
  )).join("\n")).toEqual([]);
};

const waitForOverviewVisualReady = async (page: Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect.poll(() => page.locator("main img").evaluateAll((images) => (
    images.every((image) => image.complete && image.naturalWidth > 0)
  ))).toBe(true);
};

const setAppOnline = async (page: Page, online: boolean) => {
  await page.evaluate((nextOnline) => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => nextOnline,
    });
    window.dispatchEvent(new Event(nextOnline ? "online" : "offline"));
  }, online);
};

const readTrainingStartDrafts = async (page: Page) => page.evaluate(async (
  databaseName,
) => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  if (!database.objectStoreNames.contains("drafts")) {
    database.close();
    return [];
  }
  const records = await new Promise<unknown[]>((resolve, reject) => {
    const transaction = database.transaction("drafts", "readonly");
    const request = transaction.objectStore("drafts").getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as unknown[]);
  });
  database.close();
  return records.flatMap((record) => {
    if (
      typeof record !== "object"
      || record === null
      || !("kind" in record)
      || record.kind !== "training.start"
      || !("draftId" in record)
      || typeof record.draftId !== "string"
      || !("generationId" in record)
      || typeof record.generationId !== "string"
      || !("idempotencyKey" in record)
      || typeof record.idempotencyKey !== "string"
    ) return [];
    return [{
      draftId: record.draftId,
      generationId: record.generationId,
      idempotencyKey: record.idempotencyKey,
    }];
  });
}, draftDatabaseName);

const expectOneDurableStartDraft = async (page: Page) => {
  await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
    .toBe(1);
  const [draft] = await readTrainingStartDrafts(page);
  if (draft === undefined) throw new Error("OVERVIEW_START_DRAFT_EXPECTED");
  return draft;
};

const expectTrainingRoute = async (page: Page) => {
  await expect(page).toHaveURL((url) => (
    url.pathname === "/problems"
    && url.searchParams.get("problem") === problemId
    && url.searchParams.get("session") === sessionId
  ), { timeout: routeReadyTimeoutMs });
};

test(
  "@phase2:overview @visual:overview:light-dark "
  + "训练总览覆盖批准尺寸的明暗主题视觉基线",
  async ({ page }) => {
    const api = await mockOverviewApi(page);
    const viewports = [
      { label: "desktop", size: { height: 900, width: 1_440 } },
      { label: "laptop", size: { height: 720, width: 1_280 } },
      { label: "mobile", size: { height: 844, width: 390 } },
    ] as const;

    for (const viewport of viewports) {
      for (const theme of ["light", "dark"] as const) {
        api.state.preferences = {
          language: "zh-CN",
          theme,
          version: api.state.preferences.version + 1,
        };
        await page.setViewportSize(viewport.size);
        await page.goto("/");
        await expectOverviewReady(page);
        await expect(page.locator("html")).toHaveAttribute(
          "data-qg-theme",
          theme,
        );
        await expect(page.locator("iframe[data-legacy-preview-frame]"))
          .toHaveCount(0);
        await expect(page.locator('[data-quanty-prominence="primary"]'))
          .toHaveCount(1);
        await expect(page.getByRole("heading", {
          name: "完成两数之和训练",
          exact: true,
        })).toBeVisible();
        await waitForOverviewVisualReady(page);
        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
        await expect(page).toHaveScreenshot(
          `overview-${theme}-${viewport.label}.png`,
          { fullPage: true },
        );
        await capturePhase2ReviewImage(page, {
          routeId: "overview",
          theme,
          viewportId: viewport.label,
        });
      }
    }
  },
);

test(
  "@phase2:overview @a11y:overview "
  + "训练总览在桌面明色与移动深色布局通过 WCAG 自动门禁",
  async ({ page }) => {
    const api = await mockOverviewApi(page);
    const cases = [
      {
        theme: "light" as const,
        viewport: { height: 900, width: 1_440 },
      },
      {
        theme: "dark" as const,
        viewport: { height: 844, width: 390 },
      },
    ];

    for (const acceptanceCase of cases) {
      api.state.preferences = {
        language: "zh-CN",
        theme: acceptanceCase.theme,
        version: api.state.preferences.version + 1,
      };
      await page.setViewportSize(acceptanceCase.viewport);
      await page.goto("/");
      await expectOverviewReady(page);
      await expect(page.locator("html")).toHaveAttribute(
        "data-qg-theme",
        acceptanceCase.theme,
      );
      await expect(page.getByRole("heading", {
        name: "最近训练",
        exact: true,
      })).toBeVisible();
      await expectNoAxeViolations(page);
    }
  },
);

test(
  "@phase2:overview @e2e:overview-resume-training "
  + "总览使用真实推荐恢复既有训练并交接到精确题目会话",
  async ({ page }) => {
    const api = await mockOverviewApi(page);
    api.state.resumed = true;
    await page.goto("/");
    await expectOverviewReady(page);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    await expectTrainingRoute(page);
    expect(api.state.trainingCalls).toHaveLength(1);
    expect(api.state.trainingCalls[0]).toEqual({
      body: {
        planTaskId,
        problemId,
      },
      csrfToken,
      idempotencyKey: expect.any(String),
    });
    expect(api.state.trainingCalls[0]?.idempotencyKey?.length).toBeGreaterThanOrEqual(16);
    await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
      .toBe(0);
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:recoverable-error "
  + "暂时失败保留可安全重试的启动草稿",
  async ({ page }) => {
    const api = await mockOverviewApi(page, "recoverable");
    await page.goto("/");
    await expectOverviewReady(page);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const recovery = page.locator(
      '[data-recovery-state="recoverable-error"]',
    );
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText("e2e-overview-recoverable");
    await expect(recovery.getByRole("button", {
      name: "重试启动",
      exact: true,
    })).toBeVisible();
    const draft = await expectOneDurableStartDraft(page);
    expect(draft.idempotencyKey).toBe(
      api.state.trainingCalls[0]?.idempotencyKey,
    );
    await expect(page).toHaveURL("/");
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:non-recoverable-error "
  + "不可恢复请求只在用户明确放弃后移除精确草稿",
  async ({ page }) => {
    await mockOverviewApi(page, "non-recoverable");
    await page.goto("/");
    await expectOverviewReady(page);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const recovery = page.locator(
      '[data-recovery-state="non-recoverable-error"]',
    );
    await expect(recovery).toContainText("e2e-overview-non-recoverable");
    await expectOneDurableStartDraft(page);
    await recovery.getByRole("button", {
      name: "放弃本次请求",
      exact: true,
    }).click();

    await expect(recovery).toHaveCount(0);
    await expectOverviewReady(page);
    await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
      .toBe(0);
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:offline-draft "
  + "离线草稿在重新联网后使用原请求自动恢复",
  async ({ page }) => {
    const api = await mockOverviewApi(page, "offline");
    await page.goto("/");
    await expectOverviewReady(page);
    await setAppOnline(page, false);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const recovery = page.locator('[data-recovery-state="offline-draft"]');
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole("button", {
      name: "联网后重试",
      exact: true,
    })).toBeVisible();
    const draft = await expectOneDurableStartDraft(page);
    api.state.trainingMode = "success";
    await setAppOnline(page, true);

    await expectTrainingRoute(page);
    expect(api.state.trainingCalls).toHaveLength(2);
    expect(api.state.trainingCalls[0]?.idempotencyKey).toBe(
      api.state.trainingCalls[1]?.idempotencyKey,
    );
    expect(api.state.trainingCalls[1]?.idempotencyKey).toBe(
      draft.idempotencyKey,
    );
    await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
      .toBe(0);
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:permission-denied "
  + "权限失效保留本地请求并只允许重新验证当前账号",
  async ({ page }) => {
    await mockOverviewApi(page, "permission");
    await page.goto("/");
    await expectOverviewReady(page);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const recovery = page.locator(
      '[data-recovery-state="permission-denied"]',
    );
    await expect(recovery).toContainText("e2e-overview-permission");
    const draft = await expectOneDurableStartDraft(page);
    await recovery.getByRole("button", {
      name: "重新登录",
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/login\?reauth=1&redirect=%2F$/u);
    expect(await readTrainingStartDrafts(page)).toEqual([draft]);
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:stale-version-conflict "
  + "版本冲突先载入最新推荐再移除旧启动草稿",
  async ({ page }) => {
    const api = await mockOverviewApi(page, "stale");
    await page.goto("/");
    await expectOverviewReady(page);
    const initialDashboardRequests = api.state.dashboardRequestCount;

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const recovery = page.locator(
      '[data-recovery-state="stale-version-conflict"]',
    );
    await expect(recovery).toContainText("e2e-overview-stale");
    await expectOneDurableStartDraft(page);
    await recovery.getByRole("button", {
      name: "载入最新推荐",
      exact: true,
    }).click();

    await expect.poll(() => api.state.dashboardRequestCount)
      .toBeGreaterThan(initialDashboardRequests);
    await expect(recovery).toHaveCount(0);
    await expectOverviewReady(page);
    await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
      .toBe(0);
    expect(api.state.trainingCalls).toHaveLength(1);
  },
);

test(
  "@phase2:overview @mutation:training.start-or-resume:retry "
  + "手动重试沿用同一请求标识且不会重复建立会话",
  async ({ page }) => {
    const api = await mockOverviewApi(page, "retry");
    await page.goto("/");
    await expectOverviewReady(page);

    await page.getByRole("button", {
      name: overviewCta,
      exact: true,
    }).click();

    const failed = page.locator('[data-recovery-state="recoverable-error"]');
    await expect(failed).toContainText("e2e-overview-retry-first");
    const draft = await expectOneDurableStartDraft(page);
    await failed.getByRole("button", {
      name: "重试启动",
      exact: true,
    }).click();

    const retrying = page.locator('[data-recovery-state="retry"]');
    await expect(retrying).toBeVisible();
    await expect(retrying).toContainText("正在使用同一请求标识恢复训练");
    await expect.poll(() => api.state.trainingCalls.length).toBe(2);
    expect(api.state.trainingCalls[0]?.idempotencyKey).toBe(
      api.state.trainingCalls[1]?.idempotencyKey,
    );
    expect(api.state.trainingCalls[1]?.idempotencyKey).toBe(
      draft.idempotencyKey,
    );
    expect(await readTrainingStartDrafts(page)).toEqual([draft]);

    api.releaseRetryResponse();
    await expectTrainingRoute(page);
    await expect.poll(async () => (await readTrainingStartDrafts(page)).length)
      .toBe(0);
  },
);
