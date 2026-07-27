import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request, type Route } from "playwright/test";

import { mockLegacyPreviewFrame } from "./legacy-frame.fixture";

const routeReadyTimeoutMs = 20_000;

type ApiCall = Readonly<{
  method: string;
  path: string;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}>;

const csrfToken = "e2e_csrf_token_abcdefghijklmnopqrstuvwxyz012345";
const resetToken = "e2e-reset-token-abcdefghijklmnopqrstuvwxyz";
const signedInUser = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 1 },
};

const responseFor = (request: Request) => {
  const path = new URL(request.url()).pathname;
  if (path === "/api/v2/auth/csrf") {
    return {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
        "set-cookie": `__Host-qg_csrf=${csrfToken}; Path=/; Secure; SameSite=Lax`,
      },
      body: JSON.stringify({ csrfToken }),
    };
  }
  if (path === "/api/v2/auth/register") {
    return { status: 201, contentType: "application/json", body: JSON.stringify({ user: signedInUser }) };
  }
  if (path === "/api/v2/auth/login") {
    return { status: 200, contentType: "application/json", body: JSON.stringify({ user: signedInUser }) };
  }
  if (path === "/api/v2/auth/password/forgot") {
    return { status: 202, contentType: "application/json", body: JSON.stringify({ status: "ok" }) };
  }
  if (path === "/api/v2/auth/password/reset") {
    return { status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) };
  }
  if (path === "/api/v2/me") {
    return {
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "AUTH_SESSION_REQUIRED",
        message: "请先登录。",
        requestId: "e2e-request-id",
      }),
    };
  }
  if (path === "/api/v2/auth/google/start") {
    return { status: 204, body: "" };
  }
  if (path === "/api/v2/auth/google/callback") {
    return {
      status: 303,
      headers: {
        "cache-control": "no-store",
        "location": "/login?authError=GOOGLE_OAUTH_FAILED",
        "referrer-policy": "no-referrer",
      },
      body: "",
    };
  }
  return {
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ code: "E2E_API_ROUTE_UNHANDLED", message: path }),
  };
};

const mockV2Api = async (page: Page) => {
  await mockLegacyPreviewFrame(page);
  const calls: ApiCall[] = [];
  await page.route("**/api/v2/**", async (route: Route) => {
    const request = route.request();
    let body: unknown = null;
    if (request.postData() !== null) {
      try {
        body = request.postDataJSON();
      } catch {
        body = request.postData();
      }
    }
    calls.push({
      method: request.method(),
      path: new URL(request.url()).pathname,
      headers: request.headers(),
      body,
    });
    await route.fulfill(responseFor(request));
  });
  return calls;
};

const authMutationCalls = (calls: readonly ApiCall[]) => calls.filter(({ path }) => (
  path === "/api/v2/auth/csrf"
  || path === "/api/v2/auth/login"
  || path === "/api/v2/auth/register"
  || path === "/api/v2/auth/password/forgot"
  || path === "/api/v2/auth/password/reset"
));

const expectCsrfThen = (calls: readonly ApiCall[], mutationPath: string) => {
  const relevant = authMutationCalls(calls);
  expect(relevant.map(({ method, path }) => `${method} ${path}`)).toEqual([
    "GET /api/v2/auth/csrf",
    `POST ${mutationPath}`,
  ]);
  expect(relevant[1]?.headers["x-csrf-token"]).toBe(csrfToken);
};

const submitLogin = async (page: Page) => {
  await page.getByLabel(/^邮箱/u).fill("gary@example.com");
  await page.getByLabel(/^密码/u).fill("StrongPass123");
  await page.getByRole("button", { name: "登录", exact: true }).click();
};

test("@e2e:auth-session-and-recovery 登录、注册与找回流程均使用一次性 CSRF", async ({ page }) => {
  const calls = await mockV2Api(page);

  await page.goto("/login");
  await submitLogin(page);
  await expect.poll(() => authMutationCalls(calls).length).toBe(2);
  expectCsrfThen(calls, "/api/v2/auth/login");

  calls.length = 0;
  await page.goto("/login");
  await page.getByRole("tab", { name: "注册", exact: true }).click();
  await page.getByLabel(/^名字/u).fill("Gary");
  await page.getByLabel(/^邮箱/u).fill("gary@example.com");
  await page.getByLabel(/^密码/u).fill("StrongPass123");
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await expect.poll(() => authMutationCalls(calls).length).toBe(2);
  expectCsrfThen(calls, "/api/v2/auth/register");

  calls.length = 0;
  await page.goto("/login");
  await page.getByRole("button", { name: /忘记密码/ }).click();
  await page.getByLabel(/^邮箱/u).fill("gary@example.com");
  await page.getByRole("button", { name: "发送重置链接", exact: true }).click();
  await expect.poll(() => authMutationCalls(calls).length).toBe(2);
  expectCsrfThen(calls, "/api/v2/auth/password/forgot");
});

test("@e2e:auth-session-and-recovery 重设令牌只从 fragment 读取并立即清除", async ({ page }) => {
  const calls = await mockV2Api(page);

  await page.goto(`/auth/reset#${resetToken}`);
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
  await page.getByLabel(/^新密码/u).fill("NewStrongPass123");
  await page.getByLabel(/^确认新密码/u).fill("NewStrongPass123");
  await page.getByRole("button", { name: "设置新密码", exact: true }).click();
  await expect.poll(() => authMutationCalls(calls).length).toBe(2);

  expectCsrfThen(calls, "/api/v2/auth/password/reset");
  expect(authMutationCalls(calls)[1]?.body).toEqual({
    password: "NewStrongPass123",
    token: resetToken,
  });
  expect(calls.every(({ path }) => !path.includes(resetToken))).toBe(true);
});

test("@e2e:auth-session-and-recovery Google 登录保持同源导航", async ({ page, baseURL }) => {
  await mockV2Api(page);
  await page.goto("/login?redirect=%2Finterview%3Ffrom%3Dgoogle");

  const googleRequestPromise = page.waitForRequest("**/api/v2/auth/google/start?**");
  await page.getByRole("button", { name: "使用 Google 继续", exact: true }).click();
  const googleRequest = await googleRequestPromise;
  const target = new URL(googleRequest.url());

  expect(target.origin).toBe(new URL(baseURL ?? "http://localhost:42731").origin);
  expect(target.pathname).toBe("/api/v2/auth/google/start");
  expect(target.searchParams.get("redirectPath")).toBe("/interview?from=google");

  await page.route("**/api/v2/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(signedInUser),
    });
  });
  await page.goto("/interview?from=google");
  await expect(page.getByRole("heading", { name: "模拟面试", exact: true })).toBeVisible();
  await expect(page.getByText("兼容预览", { exact: true })).toBeVisible();
  await expect(page.getByTitle("模拟面试 · 旧版兼容页面")).toBeVisible();
});

test("@e2e:auth-session-and-recovery Google 回调失败清除秘密并返回品牌恢复页", async ({ page }) => {
  await mockV2Api(page);
  await page.route("**/api/v2/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(signedInUser),
    });
  });
  const state = "secret-provider-state";
  await page.goto(`/api/v2/auth/google/callback?error=access_denied&state=${state}`);

  await expect(page).toHaveURL(/\/login\?authError=GOOGLE_OAUTH_FAILED$/u);
  await expect(page.getByRole("status", { name: "Google 登录未完成" })).toContainText(
    "授权可能已取消或链接已经失效",
  );
  await expect(page.getByRole("button", { name: "重新尝试 Google 登录" })).toBeVisible();
  expect(page.url()).not.toContain(state);
  expect(page.url()).not.toContain("access_denied");
});

test("@e2e:auth-session-and-recovery 强制重新认证不会从子流程回跳", async ({ page }) => {
  await mockV2Api(page);
  await page.route("**/api/v2/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(signedInUser),
    });
  });

  await page.goto("/login?redirect=%2Faccount&reauth=1");
  await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "忘记密码", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?(?=.*mode=forgot)(?=.*reauth=1)/u);
  await expect(page.getByRole("heading", { name: "重置密码", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /返回登录/u }).click();
  await expect(page).toHaveURL(/\/login\?(?=.*reauth=1)(?!.*mode=)/u);
  await page.getByRole("tab", { name: "注册", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?(?=.*mode=register)(?=.*reauth=1)/u);
  await expect(page.getByRole("button", { name: "创建账号", exact: true })).toBeVisible();
});

test("@e2e:auth-session-and-recovery 认证视图与 URL、刷新及后退保持一致", async ({ page }) => {
  await mockV2Api(page);
  await page.goto("/login?mode=register");
  await expect(page.getByRole("tab", { name: "注册", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/login\?mode=register$/u);
  await expect(page.getByRole("tab", { name: "注册", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: /忘记密码/u }).click();
  await expect(page).toHaveURL(/\/login\?mode=forgot$/u);
  await page.reload();
  await expect(page.getByRole("heading", { name: "重置密码", exact: true })).toBeVisible();
});

test("@visual:auth:light-dark 三种批准尺寸无溢出、无 PNG 且只有一个主 Quanty", async ({ page }, testInfo) => {
  await mockV2Api(page);
  const viewports = [
    { name: "desktop", width: 1_440, height: 900 },
    { name: "laptop", width: 1_280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "欢迎回来", exact: true })).toBeVisible({
        timeout: routeReadyTimeoutMs,
      });
      await expect(page.locator("html")).toHaveAttribute("data-qg-theme", theme);

      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
      await expect(page.locator('[data-quanty-prominence="primary"]')).toHaveCount(1);

      const imageSources = await page.locator("img").evaluateAll((images) => images.flatMap((image) => [
        image.getAttribute("src") ?? "",
        image.getAttribute("srcset") ?? "",
      ]));
      expect(imageSources.every((source) => !/\.png(?:\?|\s|$)/i.test(source))).toBe(true);

      await expect(page).toHaveScreenshot(`auth-${theme}-${viewport.name}.png`, {
        fullPage: true,
      });
      await testInfo.attach(`auth-${theme}-${viewport.name}`, {
        path: testInfo.snapshotPath(`auth-${theme}-${viewport.name}.png`),
        contentType: "image/png",
      });
    }
  }

  const additionalStates = [
    {
      heading: "创建训练账号",
      name: "auth-light-register-laptop.png",
      path: "/login?mode=register",
      viewport: { width: 1_280, height: 720 },
    },
    {
      heading: "创建训练账号",
      name: "auth-light-register-mobile.png",
      path: "/login?mode=register",
      viewport: { width: 390, height: 844 },
    },
    {
      heading: "设置新密码",
      name: "auth-light-reset-invalid-mobile.png",
      path: "/auth/reset",
      viewport: { width: 390, height: 844 },
    },
  ] as const;

  for (const state of additionalStates) {
    await page.setViewportSize(state.viewport);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(state.path);
    await expect(page.getByRole("heading", { name: state.heading, exact: true })).toBeVisible();
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    await expect(page).toHaveScreenshot(state.name, { fullPage: true });
    await testInfo.attach(state.name.replace(/\.png$/u, ""), {
      path: testInfo.snapshotPath(state.name),
      contentType: "image/png",
    });
  }
});

test("@a11y:auth 键盘、密码可见性与 axe 门禁", async ({ page }) => {
  await mockV2Api(page);
  await page.goto("/login");
  await expect(page.getByRole("tab", { name: "登录", exact: true })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("tab", { name: "登录", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "注册", exact: true })).toBeFocused();
  await expect(page.getByRole("tab", { name: "注册", exact: true })).toHaveAttribute("aria-selected", "true");

  const password = page.getByLabel(/^密码/u);
  await password.fill("StrongPass123");
  await page.getByRole("button", { name: "显示密码", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");

  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, results.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);

  await page.goto("/auth/reset");
  await expect(page.getByRole("alert", { name: "重置链接无效" })).toBeVisible();
  const resetResults = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(resetResults.violations, resetResults.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);

  await page.goto("/login?authError=GOOGLE_OAUTH_FAILED");
  await expect(page.getByRole("status", { name: "Google 登录未完成" })).toBeVisible();
  const googleErrorResults = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(googleErrorResults.violations, googleErrorResults.violations.map((violation) => (
    `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
  )).join("\n")).toEqual([]);
});
