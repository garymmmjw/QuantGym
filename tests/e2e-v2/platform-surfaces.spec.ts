import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";

type PlatformTheme = "light" | "dark";
type PlatformLanguage = "zh-CN" | "en";
type FailureState =
  | "recoverable-error"
  | "non-recoverable-error"
  | "permission-denied"
  | "stale-version-conflict";
type RecoveryCase =
  | FailureState
  | "offline-draft"
  | "retry";
type MutationOperation =
  | "notifications.mark-read"
  | "todo.create"
  | "todo.update"
  | "todo.complete"
  | "todo.delete"
  | "preferences.update-theme"
  | "preferences.update-language";

type NotificationRecord = {
  body: string;
  createdAt: string;
  id: string;
  kind: string;
  readAt: string | null;
  title: string;
};

type TodoRecord = {
  completedAt: string | null;
  createdAt: string;
  id: string;
  sortOrder: number;
  status: "open" | "completed";
  title: string;
  updatedAt: string;
  version: number;
};

type PlatformApiCall = {
  body: unknown;
  csrfToken: string | undefined;
  idempotencyKey: string | undefined;
  method: string;
  operation: MutationOperation | null;
  path: string;
};

type FailureRule = {
  remaining: number;
  state: FailureState;
};

type PlatformApiState = {
  calls: PlatformApiCall[];
  csrfToken: string;
  failures: Map<MutationOperation, FailureRule>;
  logoutFailuresRemaining: number;
  meRequestCount: number;
  notificationListRequestCount: number;
  notifications: NotificationRecord[];
  preferences: {
    language: PlatformLanguage;
    theme: PlatformTheme;
    version: number;
  };
  signedOut: boolean;
  todoListRequestCount: number;
  todos: TodoRecord[];
};

type PlatformApiOptions = Partial<{
  language: PlatformLanguage;
  notifications: NotificationRecord[];
  theme: PlatformTheme;
  todos: TodoRecord[];
}>;

const csrfToken = "e2e_platform_csrf_abcdefghijklmnopqrstuvwxyz";
const notificationId = "11111111-1111-4111-8111-111111111111";
const seededTodoId = "22222222-2222-4222-8222-222222222222";
const createdTodoId = "33333333-3333-4333-8333-333333333333";
const fixedCreatedAt = "2026-07-23T02:00:00.000Z";
const fixedUpdatedAt = "2026-07-23T03:00:00.000Z";
const fixedCompletedAt = "2026-07-23T04:00:00.000Z";
const overviewTitleZh = "Gary，今天把一题练扎实";
const planTitleZh = "你的量化职业训练计划";
const shellReadyTimeoutMs = 20_000;

const unreadNotification = (): NotificationRecord => ({
  body: "完成一组随机过程训练，保持今天的节奏。",
  createdAt: fixedCreatedAt,
  id: notificationId,
  kind: "training",
  readAt: null,
  title: "今日训练提醒",
});

const readNotification = (): NotificationRecord => ({
  ...unreadNotification(),
  readAt: fixedUpdatedAt,
});

const seededTodo = (): TodoRecord => ({
  completedAt: null,
  createdAt: fixedCreatedAt,
  id: seededTodoId,
  sortOrder: 0,
  status: "open",
  title: "复习概率论",
  updatedAt: fixedCreatedAt,
  version: 1,
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

const errorResponse = (state: FailureState) => {
  const fixture = {
    "recoverable-error": {
      code: "PLATFORM_SERVICE_UNAVAILABLE",
      message: "平台服务暂时不可用。",
      retryable: true,
      status: 503,
    },
    "non-recoverable-error": {
      code: "PLATFORM_INPUT_INVALID",
      message: "当前内容无法提交。",
      retryable: false,
      status: 422,
    },
    "permission-denied": {
      code: "AUTH_PERMISSION_DENIED",
      message: "当前登录状态无法完成此操作。",
      retryable: false,
      status: 403,
    },
    "stale-version-conflict": {
      code: "PLATFORM_VERSION_CONFLICT",
      message: "内容已在其他位置更新。",
      retryable: false,
      status: 409,
    },
  }[state];
  const requestId = `e2e-${state}-request-id`;
  return jsonResponse({
    code: fixture.code,
    fieldErrors: {},
    message: fixture.message,
    requestId,
    retryable: fixture.retryable,
  }, fixture.status, { "x-request-id": requestId });
};

const mutationOperationFor = (request: Request): MutationOperation | null => {
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();
  if (
    method === "PATCH"
    && /^\/api\/v2\/notifications\/[^/]+\/read$/u.test(pathname)
  ) {
    return "notifications.mark-read";
  }
  if (pathname === "/api/v2/preferences" && method === "PATCH") {
    const body = request.postDataJSON() as { language?: unknown; theme?: unknown };
    return body.theme === undefined
      ? "preferences.update-language"
      : "preferences.update-theme";
  }
  if (pathname === "/api/v2/todos" && method === "POST") return "todo.create";
  if (/^\/api\/v2\/todos\/[^/]+$/u.test(pathname) && method === "PATCH") {
    return "todo.update";
  }
  if (/^\/api\/v2\/todos\/[^/]+\/complete$/u.test(pathname) && method === "POST") {
    return "todo.complete";
  }
  if (/^\/api\/v2\/todos\/[^/]+$/u.test(pathname) && method === "DELETE") {
    return "todo.delete";
  }
  return null;
};

const parseRequestBody = (request: Request): unknown => {
  if (request.postData() === null) return null;
  return request.postDataJSON() as unknown;
};

const taskIdFromPath = (pathname: string) => {
  const segments = pathname.split("/");
  return decodeURIComponent(segments[4] ?? "");
};

const responseFor = (request: Request, state: PlatformApiState) => {
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();
  const operation = mutationOperationFor(request);
  const headers = request.headers();

  state.calls.push({
    body: parseRequestBody(request),
    csrfToken: headers["x-csrf-token"],
    idempotencyKey: headers["x-idempotency-key"],
    method,
    operation,
    path: `${pathname}${url.search}`,
  });

  if (pathname === "/api/v2/me" && method === "GET") {
    state.meRequestCount += 1;
    if (state.signedOut) {
      return jsonResponse({
        code: "AUTH_SESSION_REQUIRED",
        fieldErrors: {},
        message: "请先登录。",
        requestId: "e2e-signed-out-request-id",
        retryable: false,
      }, 401, { "x-request-id": "e2e-signed-out-request-id" });
    }
    return jsonResponse({
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences: state.preferences,
    }, 200, {
      "set-cookie": `__Host-qg_csrf=${state.csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }

  if (pathname === "/api/v2/auth/csrf" && method === "GET") {
    return jsonResponse({ csrfToken: state.csrfToken }, 200, {
      "set-cookie": `__Host-qg_csrf=${state.csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }

  if (pathname === "/api/v2/notifications" && method === "GET") {
    state.notificationListRequestCount += 1;
    return jsonResponse({
      items: state.notifications,
      nextCursor: null,
      unreadCount: state.notifications.filter(({ readAt }) => readAt === null).length,
    });
  }

  if (pathname === "/api/v2/todos" && method === "GET") {
    state.todoListRequestCount += 1;
    return jsonResponse({ items: state.todos });
  }

  if (pathname === "/api/v2/dashboard/overview" && method === "GET") {
    return jsonResponse({
      planProgress: null,
      profile: {
        displayName: "Gary",
        level: 1,
        streakDays: 0,
        weeklyXp: 0,
      },
      recentXp: [],
      resourceVersions: { plan: 0, training: 0 },
      todayTask: null,
      unreadNotificationCount: state.notifications.filter(
        ({ readAt }) => readAt === null,
      ).length,
      weakness: null,
    });
  }

  if (pathname === "/api/v2/plans/current" && method === "GET") {
    return jsonResponse({ plan: null });
  }

  if (operation !== null) {
    const rule = state.failures.get(operation);
    if (rule !== undefined && rule.remaining > 0) {
      rule.remaining -= 1;
      if (
        rule.state === "stale-version-conflict"
        && operation !== "todo.create"
        && operation.startsWith("todo.")
      ) {
        const task = state.todos.find((candidate) => candidate.id === taskIdFromPath(pathname));
        if (task !== undefined) {
          task.sortOrder += 1;
          task.updatedAt = fixedUpdatedAt;
          task.version += 1;
        }
      }
      return errorResponse(rule.state);
    }
  }

  if (
    operation === "notifications.mark-read"
    && method === "PATCH"
  ) {
    const id = decodeURIComponent(pathname.split("/")[4] ?? "");
    const existing = state.notifications.find((item) => item.id === id);
    if (existing === undefined) return errorResponse("non-recoverable-error");
    existing.readAt = fixedUpdatedAt;
    return jsonResponse(existing);
  }

  if (
    (operation === "preferences.update-theme"
      || operation === "preferences.update-language")
    && method === "PATCH"
  ) {
    const body = request.postDataJSON() as {
      language?: PlatformLanguage;
      theme?: PlatformTheme;
      version: number;
    };
    if (body.version !== state.preferences.version) {
      return errorResponse("stale-version-conflict");
    }
    state.preferences = {
      language: body.language ?? state.preferences.language,
      theme: body.theme ?? state.preferences.theme,
      version: state.preferences.version + 1,
    };
    return jsonResponse(state.preferences);
  }

  if (operation === "todo.create" && method === "POST") {
    const body = request.postDataJSON() as { sortOrder?: number; title: string };
    const task: TodoRecord = {
      completedAt: null,
      createdAt: fixedUpdatedAt,
      id: createdTodoId,
      sortOrder: body.sortOrder ?? state.todos.length,
      status: "open",
      title: body.title,
      updatedAt: fixedUpdatedAt,
      version: 1,
    };
    state.todos.push(task);
    return jsonResponse(task);
  }

  if (operation === "todo.update" && method === "PATCH") {
    const id = taskIdFromPath(pathname);
    const body = request.postDataJSON() as {
      sortOrder?: number;
      title?: string;
      version: number;
    };
    const task = state.todos.find((item) => item.id === id);
    if (task === undefined || task.version !== body.version) {
      return errorResponse("stale-version-conflict");
    }
    task.title = body.title ?? task.title;
    task.sortOrder = body.sortOrder ?? task.sortOrder;
    task.updatedAt = fixedUpdatedAt;
    task.version += 1;
    return jsonResponse(task);
  }

  if (operation === "todo.complete" && method === "POST") {
    const id = taskIdFromPath(pathname);
    const body = request.postDataJSON() as { version: number };
    const task = state.todos.find((item) => item.id === id);
    if (task === undefined || task.version !== body.version) {
      return errorResponse("stale-version-conflict");
    }
    task.completedAt = fixedCompletedAt;
    task.status = "completed";
    task.updatedAt = fixedCompletedAt;
    task.version += 1;
    return jsonResponse(task);
  }

  if (operation === "todo.delete" && method === "DELETE") {
    const id = taskIdFromPath(pathname);
    const version = Number(url.searchParams.get("version"));
    const task = state.todos.find((item) => item.id === id);
    if (task === undefined || task.version !== version) {
      return errorResponse("stale-version-conflict");
    }
    state.todos = state.todos.filter((item) => item.id !== id);
    return { status: 204 };
  }

  if (pathname === "/api/v2/auth/logout" && method === "POST") {
    if (state.logoutFailuresRemaining > 0) {
      state.logoutFailuresRemaining -= 1;
      return errorResponse("recoverable-error");
    }
    state.signedOut = true;
    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({
    code: "E2E_API_ROUTE_UNHANDLED",
    fieldErrors: {},
    message: `${method} ${pathname}`,
    requestId: "e2e-unhandled-request-id",
    retryable: false,
  }, 404);
};

const mockPlatformApi = async (
  page: Page,
  options: PlatformApiOptions = {},
) => {
  await mockLegacyPreviewFrame(page);
  const state: PlatformApiState = {
    calls: [],
    csrfToken,
    failures: new Map(),
    logoutFailuresRemaining: 0,
    meRequestCount: 0,
    notificationListRequestCount: 0,
    notifications: options.notifications?.map((item) => ({ ...item })) ?? [],
    preferences: {
      language: options.language ?? "zh-CN",
      theme: options.theme ?? "light",
      version: 1,
    },
    signedOut: false,
    todoListRequestCount: 0,
    todos: options.todos?.map((item) => ({ ...item })) ?? [],
  };
  await page.route("**/api/v2/**", async (route: Route) => {
    await route.fulfill(responseFor(route.request(), state));
  });
  return {
    failNext(
      operation: MutationOperation,
      failure: FailureState,
      remaining = 1,
    ) {
      state.failures.set(operation, { remaining, state: failure });
    },
    failLogoutNext(remaining = 1) {
      state.logoutFailuresRemaining = remaining;
    },
    rotateCsrfToken(nextCsrfToken: string) {
      state.csrfToken = nextCsrfToken;
    },
    state,
  };
};

const callsFor = (state: PlatformApiState, operation: MutationOperation) => (
  state.calls.filter((call) => call.operation === operation)
);

const expectShellReady = async (page: Page, title = overviewTitleZh) => {
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
    timeout: shellReadyTimeoutMs,
  });
  await expect(page.getByRole("main")).toHaveAttribute(
    "id",
    "qg-main-content",
    { timeout: shellReadyTimeoutMs },
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

const openSearch = async (page: Page) => {
  await page.keyboard.press("Meta+k");
  const dialog = page.getByRole("dialog", { name: "全局搜索", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "全局搜索", exact: true })).toBeFocused();
  return dialog;
};

const openNotifications = async (page: Page) => {
  await page.getByRole("button", { name: "打开通知", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "通知中心", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

const openTodo = async (page: Page) => {
  await page.getByRole("button", {
    name: /打开今日待办|Open today\x27s tasks/iu,
  }).first().click();
  const dialog = page.getByRole("dialog", {
    name: /今日待办|Today\x27s tasks/iu,
  }).first();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("新增待办", { exact: true })).toBeVisible();
  return dialog;
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

const seedSessionDrafts = async (page: Page) => {
  await page.evaluate(async () => {
    const ownerScope = "acct-1234567890abcdef";
    const idempotencyKey = "a".repeat(64);
    window.localStorage.setItem("qg-v2-preference-sync-drafts", JSON.stringify([{
      createdAt: "2026-07-23T05:00:00.000Z",
      field: "theme",
      ownerScope,
      value: "dark",
    }]));
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open("qg-v2-recoverable-drafts", 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("todo-operations")) {
          request.result.createObjectStore("todo-operations", { keyPath: "draftId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("todo-operations", "readwrite");
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      transaction.objectStore("todo-operations").put({
        createdAt: "2026-07-23T05:00:00.000Z",
        draftId: `todo-${ownerScope}-${idempotencyKey}`,
        intent: {
          idempotencyKey,
          kind: "create",
          title: "退出前草稿",
        },
        ownerScope,
      });
    });
    database.close();
  });
};

const readSessionDraftState = async (page: Page) => page.evaluate(async () => {
  const preferenceDrafts = window.localStorage.getItem(
    "qg-v2-preference-sync-drafts",
  );
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open("qg-v2-recoverable-drafts", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  const todoDraftCount = await new Promise<number>((resolve, reject) => {
    const transaction = database.transaction("todo-operations", "readonly");
    const request = transaction.objectStore("todo-operations").count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  database.close();
  return { preferenceDrafts, todoDraftCount };
});

const rejectNextMutationFetch = async (
  page: Page,
  operation: MutationOperation,
) => {
  await page.evaluate((targetOperation) => {
    const originalFetch = window.fetch;
    window.fetch = (async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.origin,
      );
      const method = (
        init?.method
        ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const path = url.pathname;
      const matches = targetOperation === "notifications.mark-read"
        ? method === "PATCH" && /^\/api\/v2\/notifications\/[^/]+\/read$/u.test(path)
        : targetOperation === "preferences.update-theme"
          || targetOperation === "preferences.update-language"
          ? method === "PATCH" && path === "/api/v2/preferences"
          : false;
      if (matches) {
        window.fetch = originalFetch;
        throw new TypeError("Failed to fetch");
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;
  }, operation);
};

const triggerTodoMutation = async (
  page: Page,
  operation: Extract<MutationOperation, `todo.${string}`>,
) => {
  const dialog = page.getByRole("dialog", { name: "今日待办", exact: true });
  if (operation === "todo.create") {
    await dialog.getByLabel("新增待办", { exact: true }).fill("完成一套随机过程题");
    await dialog.getByRole("button", { name: "添加", exact: true }).click();
    return;
  }
  const row = dialog.getByRole("listitem").filter({ hasText: "复习概率论" });
  await expect(row).toBeVisible();
  if (operation === "todo.update") {
    await row.getByLabel("编辑待办", { exact: true }).fill("复习随机过程");
    await row.getByRole("button", { name: "保存", exact: true }).click();
    return;
  }
  if (operation === "todo.complete") {
    await row.getByRole("button", { name: "完成：复习概率论", exact: true }).click();
    return;
  }
  await row.getByRole("button", { name: "删除", exact: true }).click();
};

const assertTodoApplied = async (
  page: Page,
  state: PlatformApiState,
  operation: Extract<MutationOperation, `todo.${string}`>,
) => {
  const dialog = page.getByRole("dialog", { name: "今日待办", exact: true });
  if (operation === "todo.create") {
    await expect(dialog.getByText("完成一套随机过程题", { exact: true })).toBeVisible();
    expect(state.todos.some(({ title }) => title === "完成一套随机过程题")).toBe(true);
    return;
  }
  if (operation === "todo.update") {
    await expect(dialog.getByText("复习随机过程", { exact: true })).toBeVisible();
    expect(state.todos[0]?.title).toBe("复习随机过程");
    return;
  }
  if (operation === "todo.complete") {
    await expect(dialog.getByRole("button", { name: "完成：复习概率论", exact: true }))
      .toBeDisabled();
    expect(state.todos[0]?.status).toBe("completed");
    return;
  }
  await expect(dialog.getByText("复习概率论", { exact: true })).toHaveCount(0);
  expect(state.todos).toHaveLength(0);
};

const triggerPreferenceMutation = async (
  page: Page,
  operation: Extract<MutationOperation, `preferences.${string}`>,
) => {
  if (operation === "preferences.update-theme") {
    await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
    return;
  }
  await page.getByRole("button", { name: "打开账户菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "Switch to English", exact: true }).click();
};

const assertPreferenceApplied = async (
  page: Page,
  state: PlatformApiState,
  operation: Extract<MutationOperation, `preferences.${string}`>,
) => {
  if (operation === "preferences.update-theme") {
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
    await expect.poll(() => state.preferences.theme).toBe("dark");
    return;
  }
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => state.preferences.language).toBe("en");
};

test(
  "@e2e:global-search-keyboard 全局搜索支持快捷键、组合框键盘选择和路由焦点恢复",
  async ({ page }) => {
    await mockPlatformApi(page);
    await page.goto("/");
    await expectShellReady(page);

    const dialog = await openSearch(page);
    const search = dialog.getByRole("combobox", { name: "全局搜索", exact: true });
    await search.fill("计划");
    const option = dialog.getByRole("option", { name: /计划/u });
    await expect(option).toBeVisible();
    await expect(option).toHaveAttribute("aria-selected", "true");
    await search.press("End");
    await search.press("Home");
    await search.press("Enter");

    await expect(page).toHaveURL(/\/plan$/u);
    await expectShellReady(page, planTitleZh);
    await expect(dialog).toHaveCount(0);

    const trigger = page.getByRole("button", { name: /搜索题目|打开全局搜索/u }).first();
    await trigger.focus();
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "全局搜索", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  },
);

test(
  "@e2e:notifications-live-region @shared-state:notifications-toast:center-open 通知中心同步未读数并通过 live region 确认",
  async ({ page }) => {
    const api = await mockPlatformApi(page, { notifications: [unreadNotification()] });
    await page.goto("/");
    await expectShellReady(page);

    const dialog = await openNotifications(page);
    await expect(dialog).toContainText("1 条未读通知");
    await dialog.getByRole("button", { name: "标为已读: 今日训练提醒", exact: true }).click();

    await expect(dialog.getByRole("button", { name: "标为已读: 今日训练提醒", exact: true }))
      .toHaveCount(0);
    const liveRegion = page.getByRole("region", { name: "状态通知", exact: true });
    await expect(liveRegion).toContainText("通知已标为已读");
    await expect(liveRegion).toContainText("未读数量已同步更新");
    expect(api.state.notifications[0]?.readAt).toBe(fixedUpdatedAt);
    const call = callsFor(api.state, "notifications.mark-read")[0];
    expect(call?.csrfToken).toBe(csrfToken);
  },
);

test(
  "@shared-state:notifications-toast:empty 通知中心空状态与 Toast 区域可同时存在且语义独立",
  async ({ page }) => {
    await mockPlatformApi(page);
    await page.goto("/");
    await expectShellReady(page);
    const dialog = await openNotifications(page);

    await expect(dialog.getByRole("heading", { name: "暂时没有通知", exact: true }))
      .toBeVisible();
    await expect(page.getByRole("region", { name: "状态通知", exact: true })).toBeAttached();
  },
);

test(
  "@e2e:todo-lifecycle 今日待办完成创建、编辑、完成、刷新持久化与删除闭环",
  async ({ page }) => {
    const api = await mockPlatformApi(page);
    await page.goto("/");
    await expectShellReady(page);
    let dialog = await openTodo(page);

    await dialog.getByLabel("新增待办", { exact: true }).fill("复习概率论");
    await dialog.getByRole("button", { name: "添加", exact: true }).click();
    await expect(dialog.getByText("复习概率论", { exact: true })).toBeVisible();

    let row = dialog.getByRole("listitem").filter({ hasText: "复习概率论" });
    await row.getByLabel("编辑待办", { exact: true }).fill("复习随机过程");
    await row.getByRole("button", { name: "保存", exact: true }).click();
    await expect(dialog.getByText("复习随机过程", { exact: true })).toBeVisible();

    row = dialog.getByRole("listitem").filter({ hasText: "复习随机过程" });
    await row.getByRole("button", { name: "完成：复习随机过程", exact: true }).click();
    await expect(row.getByRole("button", { name: "完成：复习随机过程", exact: true }))
      .toBeDisabled();

    await page.reload();
    await expectShellReady(page);
    dialog = await openTodo(page);
    row = dialog.getByRole("listitem").filter({ hasText: "复习随机过程" });
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: "完成：复习随机过程", exact: true }))
      .toBeDisabled();

    await row.getByRole("button", { name: "删除", exact: true }).click();
    await expect(dialog.getByText("复习随机过程", { exact: true })).toHaveCount(0);
    expect(api.state.todos).toHaveLength(0);

    const todoCalls = api.state.calls.filter(({ operation }) => operation?.startsWith("todo."));
    expect(todoCalls).toHaveLength(4);
    expect(todoCalls.every(({ csrfToken: value }) => value === csrfToken)).toBe(true);
    const idempotencyKeys = todoCalls.map(({ idempotencyKey }) => idempotencyKey);
    expect(idempotencyKeys.every((key) => typeof key === "string" && key.length > 0)).toBe(true);
    expect(new Set(idempotencyKeys).size).toBe(4);
  },
);

test("@a11y:global-search 全局搜索结果态通过 WCAG 自动门禁", async ({ page }) => {
  await mockPlatformApi(page);
  await page.goto("/");
  await expectShellReady(page);
  const dialog = await openSearch(page);
  await dialog.getByRole("combobox", { name: "全局搜索", exact: true }).fill("计划");
  await expect(dialog.getByRole("option", { name: /计划/u })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("@a11y:notifications-toast 通知中心与 Toast 通过 WCAG 自动门禁", async ({ page }) => {
  await mockPlatformApi(page, { notifications: [unreadNotification()] });
  await page.goto("/");
  await expectShellReady(page);
  const dialog = await openNotifications(page);
  await expect(dialog.getByText("今日训练提醒", { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("@a11y:notifications-read 已读通知在普通动效下通过 WCAG 自动门禁", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockPlatformApi(page, { notifications: [readNotification()] });
  await page.goto("/");
  await expectShellReady(page);
  const dialog = await openNotifications(page);
  await expect(dialog.getByText("今日训练提醒", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "标为已读", exact: true })).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("@a11y:todo 今日待办编辑态通过 WCAG 自动门禁", async ({ page }) => {
  await mockPlatformApi(page, { todos: [seededTodo()] });
  await page.goto("/");
  await expectShellReady(page);
  const dialog = await openTodo(page);
  await expect(dialog.getByText("复习概率论", { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("@visual:global-search:light-dark 全局搜索明暗主题视觉基线", async ({ page }) => {
  const api = await mockPlatformApi(page);
  await page.setViewportSize({ width: 1_280, height: 720 });
  for (const theme of ["light", "dark"] as const) {
    api.state.preferences = { language: "zh-CN", theme, version: api.state.preferences.version + 1 };
    await page.goto("/");
    await expectShellReady(page);
    const dialog = await openSearch(page);
    await dialog.getByRole("combobox", { name: "全局搜索", exact: true }).fill("计划");
    await expect(dialog.getByRole("option", { name: /计划/u })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
    await expect(page).toHaveScreenshot(`global-search-${theme}-laptop.png`, { fullPage: true });
    await page.keyboard.press("Escape");
  }
});

test(
  "@visual:notifications-toast:light-dark 通知中心与 Toast 明暗主题视觉基线",
  async ({ page }) => {
    const api = await mockPlatformApi(page, { notifications: [unreadNotification()] });
    await page.setViewportSize({ width: 1_280, height: 720 });
    for (const theme of ["light", "dark"] as const) {
      api.state.preferences = { language: "zh-CN", theme, version: api.state.preferences.version + 1 };
      api.state.notifications = [unreadNotification()];
      await page.goto("/");
      await expectShellReady(page);
      const dialog = await openNotifications(page);
      await expect(dialog.getByText("今日训练提醒", { exact: true })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
      await expect(page).toHaveScreenshot(
        `notifications-toast-${theme}-laptop.png`,
        { fullPage: true },
      );
      await dialog.getByRole("button", { name: "关闭通知中心", exact: true }).click();
    }
  },
);

test("@visual:todo:light-dark 今日待办明暗主题视觉基线", async ({ page }) => {
  const api = await mockPlatformApi(page, { todos: [seededTodo()] });
  await page.setViewportSize({ width: 1_280, height: 720 });
  for (const theme of ["light", "dark"] as const) {
    api.state.preferences = { language: "zh-CN", theme, version: api.state.preferences.version + 1 };
    api.state.todos = [seededTodo()];
    await page.goto("/");
    await expectShellReady(page);
    const dialog = await openTodo(page);
    await expect(dialog.getByText("复习概率论", { exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
    await expect(page).toHaveScreenshot(`todo-${theme}-laptop.png`, { fullPage: true });
    await dialog.getByRole("button", { name: "关闭今日待办", exact: true }).click();
  }
});

test(
  "@e2e:logout-session-boundary 退出使用刷新后的会话证明并清除本地草稿",
  async ({ page }) => {
    const api = await mockPlatformApi(page);
    await page.goto("/");
    await expectShellReady(page);
    await seedSessionDrafts(page);

    const refreshedCsrfToken = "e2e_refreshed_csrf_abcdefghijklmnopqrstuvwxyz";
    const meRequestsBeforeRefresh = api.state.meRequestCount;
    await setAppOnline(page, false);
    api.rotateCsrfToken(refreshedCsrfToken);
    await setAppOnline(page, true);
    await expect.poll(() => api.state.meRequestCount).toBeGreaterThan(
      meRequestsBeforeRefresh,
    );

    await page.getByRole("button", { name: "打开账户菜单", exact: true }).click();
    await page.getByRole("menuitem", { name: "退出登录", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/u);

    const logoutCalls = api.state.calls.filter(
      ({ method, path }) => method === "POST" && path === "/api/v2/auth/logout",
    );
    expect(logoutCalls).toHaveLength(1);
    expect(logoutCalls[0]?.csrfToken).toBe(refreshedCsrfToken);
    await expect.poll(() => readSessionDraftState(page)).toEqual({
      preferenceDrafts: null,
      todoDraftCount: 0,
    });
  },
);

test(
  "@e2e:logout-retry 退出失败后只在用户明确重试时再次提交",
  async ({ page }) => {
    const api = await mockPlatformApi(page);
    api.failLogoutNext();
    await page.goto("/");
    await expectShellReady(page);
    await seedSessionDrafts(page);

    await page.getByRole("button", { name: "打开账户菜单", exact: true }).click();
    await page.getByRole("menuitem", { name: "退出登录", exact: true }).click();
    const retry = page.getByRole("button", { name: "重试", exact: true });
    await expect(page.getByText("暂时无法退出", { exact: true })).toBeVisible();
    await expect(retry).toBeVisible();
    expect(api.state.calls.filter(
      ({ method, path }) => method === "POST" && path === "/api/v2/auth/logout",
    )).toHaveLength(1);
    const draftsAfterFailure = await readSessionDraftState(page);
    expect(draftsAfterFailure.preferenceDrafts).not.toBeNull();
    expect(draftsAfterFailure.todoDraftCount).toBe(1);

    await retry.click();
    await expect(page).toHaveURL(/\/login$/u);
    const logoutCalls = api.state.calls.filter(
      ({ method, path }) => method === "POST" && path === "/api/v2/auth/logout",
    );
    expect(logoutCalls).toHaveLength(2);
    expect(logoutCalls.every(({ csrfToken: value }) => value === csrfToken)).toBe(true);
    await expect.poll(() => readSessionDraftState(page)).toEqual({
      preferenceDrafts: null,
      todoDraftCount: 0,
    });
  },
);

const recoveryCases: readonly RecoveryCase[] = [
  "recoverable-error",
  "non-recoverable-error",
  "offline-draft",
  "permission-denied",
  "stale-version-conflict",
  "retry",
];

const mutationManifest = [
  {
    operation: "notifications.mark-read",
    tags: [
      "@mutation:notifications.mark-read:recoverable-error",
      "@mutation:notifications.mark-read:non-recoverable-error",
      "@mutation:notifications.mark-read:offline-draft",
      "@mutation:notifications.mark-read:permission-denied",
      "@mutation:notifications.mark-read:stale-version-conflict",
      "@mutation:notifications.mark-read:retry",
    ],
  },
  {
    operation: "todo.create",
    tags: [
      "@mutation:todo.create:recoverable-error",
      "@mutation:todo.create:non-recoverable-error",
      "@mutation:todo.create:offline-draft",
      "@mutation:todo.create:permission-denied",
      "@mutation:todo.create:stale-version-conflict",
      "@mutation:todo.create:retry",
    ],
  },
  {
    operation: "todo.update",
    tags: [
      "@mutation:todo.update:recoverable-error",
      "@mutation:todo.update:non-recoverable-error",
      "@mutation:todo.update:offline-draft",
      "@mutation:todo.update:permission-denied",
      "@mutation:todo.update:stale-version-conflict",
      "@mutation:todo.update:retry",
    ],
  },
  {
    operation: "todo.complete",
    tags: [
      "@mutation:todo.complete:recoverable-error",
      "@mutation:todo.complete:non-recoverable-error",
      "@mutation:todo.complete:offline-draft",
      "@mutation:todo.complete:permission-denied",
      "@mutation:todo.complete:stale-version-conflict",
      "@mutation:todo.complete:retry",
    ],
  },
  {
    operation: "todo.delete",
    tags: [
      "@mutation:todo.delete:recoverable-error",
      "@mutation:todo.delete:non-recoverable-error",
      "@mutation:todo.delete:offline-draft",
      "@mutation:todo.delete:permission-denied",
      "@mutation:todo.delete:stale-version-conflict",
      "@mutation:todo.delete:retry",
    ],
  },
  {
    operation: "preferences.update-theme",
    tags: [
      "@mutation:preferences.update-theme:recoverable-error",
      "@mutation:preferences.update-theme:non-recoverable-error",
      "@mutation:preferences.update-theme:offline-draft",
      "@mutation:preferences.update-theme:permission-denied",
      "@mutation:preferences.update-theme:stale-version-conflict",
      "@mutation:preferences.update-theme:retry",
    ],
  },
  {
    operation: "preferences.update-language",
    tags: [
      "@mutation:preferences.update-language:recoverable-error",
      "@mutation:preferences.update-language:non-recoverable-error",
      "@mutation:preferences.update-language:offline-draft",
      "@mutation:preferences.update-language:permission-denied",
      "@mutation:preferences.update-language:stale-version-conflict",
      "@mutation:preferences.update-language:retry",
    ],
  },
] as const satisfies readonly Readonly<{
  operation: MutationOperation;
  tags: readonly string[];
}>[];

const expectedPanelState = (recoveryCase: RecoveryCase) => (
  recoveryCase === "retry" ? "recoverable-error" : recoveryCase
);

for (const contract of mutationManifest) {
  for (const [recoveryIndex, manifestTag] of contract.tags.entries()) {
    const recoveryCase = recoveryCases[recoveryIndex];
    if (recoveryCase === undefined) throw new Error(`Missing recovery case for ${manifestTag}`);
    test(
      `${manifestTag} 状态型 mock 验证固定恢复契约`,
      async ({ page }) => {
        const isTodo = contract.operation.startsWith("todo.");
        const api = await mockPlatformApi(page, {
          notifications: contract.operation === "notifications.mark-read"
            ? [unreadNotification()]
            : [],
          todos: isTodo && contract.operation !== "todo.create"
            ? [seededTodo()]
            : [],
        });
        const serverFailure = recoveryCase === "retry"
          ? "recoverable-error"
          : recoveryCase;
        if (serverFailure !== "offline-draft") {
          api.failNext(
            contract.operation,
            serverFailure,
            contract.operation.startsWith("preferences.")
              && recoveryCase === "retry"
              ? 2
              : 1,
          );
        }

        await page.goto("/");
        await expectShellReady(page);

        if (contract.operation === "notifications.mark-read") {
          const dialog = await openNotifications(page);
          if (recoveryCase === "offline-draft") {
            await setAppOnline(page, false);
            await rejectNextMutationFetch(page, contract.operation);
          }
          await dialog
            .getByRole("button", { name: "标为已读: 今日训练提醒", exact: true })
            .click();
          const recovery = dialog.locator(
            `[data-recovery-state="${expectedPanelState(recoveryCase)}"]`,
          );
          await expect(recovery).toBeVisible();
          expect(api.state.notifications[0]?.readAt).toBeNull();

          if (recoveryCase === "permission-denied") {
            await recovery.getByRole("button", { name: "重新登录", exact: true }).click();
            await expect(page).toHaveURL(/\/login\?reauth=1$/u);
            return;
          }
          if (recoveryCase === "stale-version-conflict") {
            const before = api.state.notificationListRequestCount;
            await recovery.getByRole("button", { name: "载入最新状态", exact: true }).click();
            await expect.poll(() => api.state.notificationListRequestCount).toBeGreaterThan(before);
            await expect(recovery).toHaveCount(0);
            return;
          }
          if (recoveryCase === "non-recoverable-error") {
            await recovery.getByRole("button", { name: "关闭错误提示", exact: true }).click();
            await expect(recovery).toHaveCount(0);
            return;
          }
          if (recoveryCase === "offline-draft") await setAppOnline(page, true);
          await recovery.getByRole("button", { name: "重试", exact: true }).click();
          await expect(recovery).toHaveCount(0);
          await expect(
            dialog.getByRole("button", { name: "标为已读: 今日训练提醒", exact: true }),
          ).toHaveCount(0);
          expect(api.state.notifications[0]?.readAt).toBe(fixedUpdatedAt);
          if (recoveryCase === "retry") {
            expect(callsFor(api.state, contract.operation)).toHaveLength(2);
          }
          return;
        }

        if (isTodo) {
          const operation = contract.operation as Extract<MutationOperation, `todo.${string}`>;
          const dialog = await openTodo(page);
          if (operation !== "todo.create") {
            await expect(dialog.getByText("复习概率论", { exact: true })).toBeVisible();
          }
          if (recoveryCase === "offline-draft") await setAppOnline(page, false);
          await triggerTodoMutation(page, operation);
          const recovery = dialog.locator(
            `section[data-recovery-state="${expectedPanelState(recoveryCase)}"]`,
          );
          await expect(recovery).toBeVisible();

          if (recoveryCase === "permission-denied") {
            await recovery.getByRole("button", { name: "重新登录", exact: true }).click();
            await expect(page).toHaveURL(/\/login\?reauth=1$/u);
            return;
          }
          if (recoveryCase === "stale-version-conflict") {
            const before = api.state.todoListRequestCount;
            await recovery.getByRole("button", { name: "载入最新后重试", exact: true }).click();
            if (operation === "todo.create") {
              expect(api.state.todoListRequestCount).toBe(before);
            } else {
              await expect.poll(() => api.state.todoListRequestCount).toBeGreaterThan(before);
            }
            await expect(recovery).toHaveCount(0);
            await assertTodoApplied(page, api.state, operation);
            const calls = callsFor(api.state, operation);
            expect(calls).toHaveLength(2);
            expect(calls[0]?.idempotencyKey).not.toBe(calls[1]?.idempotencyKey);
            if (operation !== "todo.create") {
              const firstVersion = operation === "todo.delete"
                ? new URL(`https://quantgym.test${calls[0]?.path ?? ""}`)
                  .searchParams.get("version")
                : (calls[0]?.body as { version?: unknown } | null)?.version;
              const secondVersion = operation === "todo.delete"
                ? new URL(`https://quantgym.test${calls[1]?.path ?? ""}`)
                  .searchParams.get("version")
                : (calls[1]?.body as { version?: unknown } | null)?.version;
              expect(String(firstVersion)).toBe("1");
              expect(String(secondVersion)).toBe("2");
              if (operation === "todo.update") {
                expect(
                  (calls[1]?.body as { sortOrder?: unknown } | null)?.sortOrder,
                ).toBeUndefined();
                expect(api.state.todos[0]?.sortOrder).toBe(1);
              }
              if (operation === "todo.complete") {
                expect(api.state.todos[0]?.sortOrder).toBe(1);
              }
            }
            return;
          }
          if (recoveryCase === "non-recoverable-error") {
            await recovery.getByRole("button", { name: "丢弃草稿", exact: true }).click();
            await expect(recovery).toHaveCount(0);
            await expect(dialog).toBeVisible();
            return;
          }
          if (recoveryCase === "offline-draft") {
            await setAppOnline(page, true);
            await expect(recovery).toHaveCount(0);
          } else {
            await recovery.getByRole("button", { name: "重试同步", exact: true }).click();
            await expect(recovery).toHaveCount(0);
          }
          await assertTodoApplied(page, api.state, operation);
          if (recoveryCase === "retry") {
            const calls = callsFor(api.state, operation);
            expect(calls).toHaveLength(2);
            expect(calls[0]?.idempotencyKey).toBe(calls[1]?.idempotencyKey);
          }
          return;
        }

        const operation = contract.operation as Extract<
          MutationOperation,
          `preferences.${string}`
        >;
        if (recoveryCase === "offline-draft") {
          await setAppOnline(page, false);
          await rejectNextMutationFetch(page, contract.operation);
        }
        await triggerPreferenceMutation(page, operation);
        const toast = page.locator(
          `[data-recovery-state="${expectedPanelState(recoveryCase)}"]`,
        );
        const usesOptimisticEnglishCopy = (
          operation === "preferences.update-language"
          && recoveryCase === "offline-draft"
        );
        await expect(toast).toContainText(
          usesOptimisticEnglishCopy ? "Preference not synced" : "偏好尚未同步",
        );

        const optimisticValue = operation === "preferences.update-theme"
          ? page.locator("html").getAttribute("data-qg-theme")
          : page.locator("html").getAttribute("lang");
        if (recoveryCase === "offline-draft") {
          await expect(optimisticValue).resolves.toBe(
            operation === "preferences.update-theme" ? "dark" : "en",
          );
          await setAppOnline(page, true);
          await toast.getByRole("button", {
            name: usesOptimisticEnglishCopy ? "Retry" : "重试",
            exact: true,
          }).click();
          await assertPreferenceApplied(page, api.state, operation);
          return;
        }

        if (recoveryCase === "permission-denied") {
          await expect(optimisticValue).resolves.toBe(
            operation === "preferences.update-theme" ? "light" : "zh-CN",
          );
          await toast.getByRole("button", { name: "重新登录", exact: true }).click();
          await expect(page).toHaveURL(/\/login\?reauth=1$/u);
          return;
        }
        if (recoveryCase === "stale-version-conflict") {
          await expect(optimisticValue).resolves.toBe(
            operation === "preferences.update-theme" ? "light" : "zh-CN",
          );
          const before = api.state.meRequestCount;
          await toast.getByRole("button", { name: "载入最新后重试", exact: true }).click();
          await expect.poll(() => api.state.meRequestCount).toBeGreaterThan(before);
          await assertPreferenceApplied(page, api.state, operation);
          return;
        }
        if (recoveryCase === "non-recoverable-error") {
          await expect(optimisticValue).resolves.toBe(
            operation === "preferences.update-theme" ? "light" : "zh-CN",
          );
          await toast.getByRole("button", { name: "恢复服务器设置", exact: true }).click();
          await expect(toast).toHaveCount(0);
          return;
        }
        await expect(optimisticValue).resolves.toBe(
          operation === "preferences.update-theme" ? "light" : "zh-CN",
        );
        await expect(toast.getByRole("button", { name: "重试", exact: true })).toBeVisible();
        expect(callsFor(api.state, operation)).toHaveLength(1);
        if (recoveryCase !== "retry") return;

        await toast.getByRole("button", { name: "重试", exact: true }).click();
        await expect(toast).toContainText("偏好尚未同步");
        await expect(optimisticValue).resolves.toBe(
          operation === "preferences.update-theme" ? "light" : "zh-CN",
        );
        expect(callsFor(api.state, operation)).toHaveLength(2);

        await toast.getByRole("button", { name: "重试", exact: true }).click();
        await expect(toast).toHaveCount(0);
        await assertPreferenceApplied(page, api.state, operation);
        expect(callsFor(api.state, operation)).toHaveLength(3);
      },
    );
  }
}
