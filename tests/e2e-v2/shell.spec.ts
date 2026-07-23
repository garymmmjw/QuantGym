import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request, type Route } from "playwright/test";

type ShellTheme = "light" | "dark";
type ShellLanguage = "zh-CN" | "en";
type MeMode = "authenticated" | "permission" | "recoverable" | "signed-out" | "stale";

type ShellApiState = {
  displayName: string;
  meMode: MeMode;
  meRequestCount: number;
  preferences: {
    language: ShellLanguage;
    theme: ShellTheme;
    version: number;
  };
};

const preferenceStorageKey = "qg-v2-preferences";

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

const responseFor = (request: Request, state: ShellApiState) => {
  const path = new URL(request.url()).pathname;
  if (path === "/api/v2/me") {
    state.meRequestCount += 1;
    if (state.meMode === "authenticated") {
      return {
        status: 200,
        contentType: "application/json",
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
  const state: ShellApiState = {
    displayName: "Gary",
    meMode: "authenticated",
    meRequestCount: 0,
    preferences: { language: "zh-CN", theme: "light", version: 1 },
  };
  await page.route("**/api/v2/**", async (route: Route) => {
    await route.fulfill(responseFor(route.request(), state));
  });
  return state;
};

const expectShellReady = async (page: Page, title: string) => {
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("id", "qg-main-content");
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

test("@e2e:desktop-shell-keyboard-navigation 桌面外壳支持跳转、折叠与键盘路由", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, "总览");

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
  await expectShellReady(page, "计划");
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
});

test("@e2e:mobile-shell-navigation 移动底栏与完整抽屉保持焦点和当前路由", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, "总览");

  const mobileNavigation = page.getByRole("navigation", { name: "底部主导航" });
  const targetSizes = await mobileNavigation.locator("a, button").evaluateAll((elements) => (
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    })
  ));
  expect(targetSizes).toHaveLength(5);
  expect(targetSizes.every(({ height, width }) => height >= 44 && width >= 44)).toBe(true);
  const mobileBrandSize = await page.getByRole("link", { name: "QuantGym", exact: true })
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    });
  expect(mobileBrandSize.height).toBeGreaterThanOrEqual(44);
  expect(mobileBrandSize.width).toBeGreaterThanOrEqual(44);

  await mobileNavigation.getByRole("link", { name: "计划", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/u);
  await expectShellReady(page, "计划");

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
});

test("@e2e:shell-breakpoint-no-overflow 临界桌面宽度和长用户名保持无溢出", async ({ page }) => {
  await page.setViewportSize({ width: 861, height: 720 });
  const api = await mockV2Api(page);
  api.displayName = "Gary with an exceptionally long display name";
  await page.goto("/");
  await expectShellReady(page, "总览");
  await expect(page.getByRole("link", { name: "查看训练计划", exact: true })).toBeVisible();
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
  await expectShellReady(page, "总览");

  await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
  await page.getByRole("button", { name: "打开账户菜单", exact: true }).click();
  await page.getByRole("menuitem", { name: "Switch to English", exact: true }).click();

  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  }, preferenceStorageKey)).toEqual({ language: "en", theme: "dark" });

  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/u);
  await expectShellReady(page, "Plan");
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  api.preferences = { language: "en", theme: "dark", version: 2 };
  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ theme: "light", language: "zh-CN" }));
  }, preferenceStorageKey);
  const requestsBeforeReload = api.meRequestCount;
  await page.reload();

  await expect.poll(() => api.meRequestCount).toBeGreaterThan(requestsBeforeReload);
  await expectShellReady(page, "Plan");
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  }, preferenceStorageKey)).toEqual({ language: "en", theme: "dark" });
});

test("@e2e:offline-and-error-recovery 离线、可重试、冲突与权限状态均有固定恢复动作", async ({ context, page }) => {
  const api = await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, "总览");

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
  await expectShellReady(page, "总览");

  api.meMode = "stale";
  await page.reload();
  const stale = page.locator('[data-recovery-state="stale-version-conflict"]');
  await expect(stale).toContainText("内容已在其他位置更新");
  await expect(stale).toContainText("e2e-stale-request-id");
  api.meMode = "authenticated";
  await stale.getByRole("button", { name: "重新载入", exact: true }).click();
  await expectShellReady(page, "总览");

  api.meMode = "permission";
  await page.reload();
  const permission = page.locator('[data-recovery-state="permission-denied"]');
  await expect(permission).toContainText("你暂时没有权限执行此操作");
  await expect(permission).toContainText("e2e-permission-request-id");
  await permission.getByRole("button", { name: "重新登录", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?reauth=1$/u);
  await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible();
});

test("@a11y:desktop-shell @a11y:theme-language 桌面明暗主题通过无障碍门禁", async ({ page }) => {
  await page.setViewportSize({ width: 1_280, height: 720 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, "总览");
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "切换到深色主题", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-qg-theme", "dark");
  await expectNoAxeViolations(page);
});

test("@a11y:mobile-shell 移动导航与完整抽屉通过无障碍门禁", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockV2Api(page);
  await page.goto("/");
  await expectShellReady(page, "总览");
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
    await expectShellReady(page, "总览");
    await expect(page.getByRole("link", { name: "查看训练计划", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", visualCase.theme);
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    await expect(page).toHaveScreenshot(visualCase.name, { fullPage: true });
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
    await expect(recovery).toContainText("e2e-recoverable-request-id");
    await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);
    await expect(page).toHaveScreenshot(`network-recovery-${theme}-laptop.png`, { fullPage: true });
  }
});
