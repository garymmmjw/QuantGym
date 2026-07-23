import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "playwright/test";

type RuntimeTheme = "light" | "dark";
type RuntimeLanguage = "zh-CN" | "en";

type RuntimeApiState = {
  preferences: {
    language: RuntimeLanguage;
    theme: RuntimeTheme;
    version: number;
  };
};

type MainFrameRequest = {
  resourceType: string;
  url: string;
};

type RuntimeProbe = {
  mainFrameRequests: MainFrameRequest[];
};

type Phase1SystemCase = {
  id:
    | "system:auth"
    | "system:desktop-shell"
    | "system:mobile-shell"
    | "system:global-search"
    | "system:notifications-toast"
    | "system:todo"
    | "system:theme-language"
    | "system:network-recovery";
  authenticated: boolean;
  exercise: (page: Page) => Promise<void>;
  hasCompatibilityFrame: boolean;
  viewport: Readonly<{ height: number; width: number }>;
};

const legacyPreviewOrigin = "https://legacy-compat.quantgym-v2-preview.pages.dev";
const csrfToken = "e2e_legacy_boundary_csrf_abcdefghijklmnopqrstuvwxyz";
const exactSandbox = "allow-forms allow-same-origin allow-scripts";

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

const apiError = (
  code: string,
  message: string,
  requestId: string,
  status: number,
) => jsonResponse({
  code,
  fieldErrors: {},
  message,
  requestId,
  retryable: false,
}, status, { "x-request-id": requestId });

const responseFor = (
  request: Request,
  state: RuntimeApiState,
  authenticated: boolean,
) => {
  const url = new URL(request.url());
  const { pathname } = url;
  const method = request.method();

  if (pathname === "/api/v2/me" && method === "GET") {
    if (!authenticated) {
      return apiError(
        "AUTH_SESSION_REQUIRED",
        "请先登录。",
        "e2e-legacy-boundary-signed-out",
        401,
      );
    }
    return jsonResponse({
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences: state.preferences,
    }, 200, {
      "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
    });
  }
  if (pathname === "/api/v2/preferences" && method === "PATCH") {
    const update = request.postDataJSON() as Partial<{
      language: RuntimeLanguage;
      theme: RuntimeTheme;
    }>;
    state.preferences = {
      language: update.language ?? state.preferences.language,
      theme: update.theme ?? state.preferences.theme,
      version: state.preferences.version + 1,
    };
    return jsonResponse(state.preferences);
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
  if (pathname === "/api/v2/auth/logout" && method === "POST") {
    return jsonResponse({ status: "ok" });
  }
  return apiError(
    "E2E_API_ROUTE_UNHANDLED",
    `${method} ${pathname}`,
    "e2e-legacy-boundary-unhandled",
    404,
  );
};

const installRuntimeProbe = async (
  page: Page,
  authenticated: boolean,
): Promise<RuntimeProbe> => {
  const state: RuntimeApiState = {
    preferences: { language: "zh-CN", theme: "light", version: 1 },
  };
  const mainFrameRequests: MainFrameRequest[] = [];

  page.on("request", (request) => {
    if (request.frame() !== page.mainFrame()) return;
    mainFrameRequests.push({
      resourceType: request.resourceType(),
      url: request.url(),
    });
  });

  await page.route("**/api/v2/**", async (route: Route) => {
    await route.fulfill(responseFor(route.request(), state, authenticated));
  });
  await page.route(`${legacyPreviewOrigin}/**`, async (route: Route) => {
    const requestedUrl = new URL(route.request().url());
    await route.fulfill({
      body: [
        "<!doctype html>",
        '<html lang="zh-CN">',
        "<head><meta charset=\"utf-8\"><title>Legacy compatibility fixture</title></head>",
        `<body data-legacy-route="${requestedUrl.pathname}">Legacy compatibility route</body>`,
        "</html>",
      ].join(""),
      contentType: "text/html",
      headers: {
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; frame-ancestors *",
      },
      status: 200,
    });
  });
  return { mainFrameRequests };
};

const setReportedOnlineState = async (page: Page, online: boolean) => {
  await page.evaluate((nextOnline) => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => nextOnline,
    });
    window.dispatchEvent(new Event(nextOnline ? "online" : "offline"));
  }, online);
};

const expectCompatibilityFrameIsolation = async (
  page: Page,
  expected: boolean,
) => {
  const frame = page.locator("iframe[data-legacy-preview-frame]");
  if (!expected) {
    await expect(frame).toHaveCount(0);
    return;
  }

  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute("sandbox", exactSandbox);
  expect(await frame.getAttribute("data-legacy-preview-frame")).not.toBeNull();
  const source = await frame.getAttribute("src");
  expect(source).not.toBeNull();
  const frameUrl = new URL(source ?? "");
  expect(frameUrl.origin).toBe(legacyPreviewOrigin);
  expect(frameUrl.pathname).toBe(new URL(page.url()).pathname);

  await expect.poll(() => (
    page.frames().filter((candidate) => candidate.url().startsWith(legacyPreviewOrigin)).length
  )).toBe(1);
};

const expectTopLevelV2Isolation = async (
  page: Page,
  probe: RuntimeProbe,
  hasCompatibilityFrame: boolean,
) => {
  await expectCompatibilityFrameIsolation(page, hasCompatibilityFrame);

  const topLevelApiRequests = probe.mainFrameRequests.filter(({ resourceType, url }) => {
    const requestUrl = new URL(url);
    return (
      resourceType === "fetch"
      || resourceType === "xhr"
      || requestUrl.pathname.startsWith("/api/")
    );
  });
  expect(topLevelApiRequests.length).toBeGreaterThan(0);
  const applicationOrigin = new URL(page.url()).origin;
  for (const request of topLevelApiRequests) {
    const url = new URL(request.url);
    expect(url.origin).toBe(applicationOrigin);
    expect(url.pathname === "/api/v2" || url.pathname.startsWith("/api/v2/")).toBe(true);
  }

  const legacyTopLevelResources = probe.mainFrameRequests.filter(({ resourceType, url }) => {
    if (!["document", "fetch", "script", "xhr"].includes(resourceType)) return false;
    const requestUrl = new URL(url);
    return (
      requestUrl.origin === legacyPreviewOrigin
      || /\bsrc\/(?:App|main)\.jsx\b/u.test(requestUrl.pathname)
      || /\/src\/(?:app|components|features|layouts|modules|router|routes|stores|ui)\//u
        .test(requestUrl.pathname)
    );
  });
  expect(legacyTopLevelResources, "legacyBootCount must be zero in the main frame").toEqual([]);

  const mainDocumentEvidence = await page.evaluate(() => ({
    legacyDomCount: document.querySelectorAll([
      "[data-module-view]",
      ".app-shell",
      "#legacy-app",
      'script[src*="/src/main.jsx"]',
      'script[src*="/src/App.jsx"]',
    ].join(",")).length,
    scriptSources: [...document.scripts]
      .map(({ src }) => src)
      .filter((src) => src.length > 0),
  }));
  expect(mainDocumentEvidence.legacyDomCount).toBe(0);
  expect(mainDocumentEvidence.scriptSources.some((source) => (
    source.startsWith(legacyPreviewOrigin)
    || /\bsrc\/(?:App|main)\.jsx\b/u.test(source)
  ))).toBe(false);
};

const phase1SystemCases: readonly Phase1SystemCase[] = [
  {
    id: "system:auth",
    authenticated: false,
    exercise: async (page) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: false,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:desktop-shell",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await expect(page.getByRole("main")).toHaveAttribute("id", "qg-main-content");
      await expect(page.getByRole("navigation", { name: "主导航", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:mobile-shell",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await expect(page.getByRole("navigation", { name: "底部主导航", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "打开全部模块", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "全部模块", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: true,
    viewport: { width: 390, height: 844 },
  },
  {
    id: "system:global-search",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: /搜索题目、公司、课程/u }).click();
      await expect(page.getByRole("dialog", { name: "全局搜索", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:notifications-toast",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: "打开通知", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "通知中心", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:todo",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: /打开今日待办/u }).click();
      await expect(page.getByRole("dialog", { name: "今日待办", exact: true })).toBeVisible();
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:theme-language",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
  {
    id: "system:network-recovery",
    authenticated: true,
    exercise: async (page) => {
      await page.goto("/");
      await setReportedOnlineState(page, false);
      await expect(page.locator('[data-network-status="offline"]')).toBeVisible();
      await setReportedOnlineState(page, true);
    },
    hasCompatibilityFrame: true,
    viewport: { width: 1_440, height: 900 },
  },
];

for (const systemCase of phase1SystemCases) {
  test(
    `@phase1-system ${systemCase.id} keeps legacy runtime outside the V2 main frame`,
    async ({ page }) => {
      await page.setViewportSize(systemCase.viewport);
      const probe = await installRuntimeProbe(page, systemCase.authenticated);
      await systemCase.exercise(page);
      await expectTopLevelV2Isolation(
        page,
        probe,
        systemCase.hasCompatibilityFrame,
      );
    },
  );
}
