#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const baseUrl = trimSlash(getArgValue("--base-url") || process.env.QUANTGYM_BETA_SMOKE_BASE_URL || "https://beta.quantgym.app");
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json"
);
const email = clean(getArgValue("--email") || process.env.QUANTGYM_BETA_SMOKE_EMAIL || process.env.QUANTGYM_LIVE_EMAIL);
const password = await readPassword();
const chromePath = process.env.CHROME_PATH || findChromeExecutable();
const startedAt = Date.now();

const routeChecks = [
  {
    name: "overview",
    path: "/",
    selectors: ["#heroTypewriter", "#overviewProblemProgress", "#leaderboardMetricSelect"],
    minText: 60
  },
  {
    name: "plan",
    path: "/plan",
    selectors: ["#prepPlanSetupForm"],
    minText: 120
  },
  {
    name: "skills",
    path: "/skills",
    selectors: ["#skillsPageTitle", "#skillRadar"],
    minText: 300
  },
  {
    name: "interview",
    path: "/interview",
    selectors: ["#interviewSetup", "#startInterviewBtn"],
    minText: 120
  },
  {
    name: "problems",
    path: "/problems",
    selectors: ["#problemSearch", "#problemList"],
    minText: 300
  },
  {
    name: "tools",
    path: "/tools",
    selectors: ["#startDrillSessionBtn", "#drillQuestion"],
    minText: 300
  },
  {
    name: "poker",
    path: "/poker",
    selectors: ["#pokerLobbySummary", "#pokerTable"],
    minText: 300
  },
  {
    name: "experiences",
    path: "/experiences",
    selectors: ["#newExperienceBtn", "#experienceForm"],
    minText: 250
  },
  {
    name: "news",
    path: "/news",
    selectors: ["#newsTopicFilter", "#newsList"],
    minText: 300
  },
  {
    name: "community",
    path: "/community",
    selectors: ["#communityForm", "#communityText"],
    minText: 60
  },
  {
    name: "messages",
    path: "/messages",
    selectors: ["#messageThreadList"],
    minText: 60
  },
  {
    name: "network",
    path: "/network",
    selectors: ["#addNetworkBtn"],
    minText: 60
  },
  {
    name: "resume",
    path: "/resume",
    selectors: ["#resumeForm", "#resumeText"],
    minText: 120
  },
  {
    name: "jobs",
    path: "/jobs",
    selectors: ["#jobsSummary", "#jobsList"],
    minText: 300
  },
  {
    name: "companies",
    path: "/companies",
    selectors: ["#companiesPageTitle", "#companyTierFilter"],
    minText: 300
  },
  {
    name: "library",
    path: "/library",
    selectors: ["#librarySearch", "#libraryBookGrid"],
    minText: 300
  },
  {
    name: "courses",
    path: "/courses",
    selectors: ["#learningPathTitle", "#courseList"],
    minText: 300
  },
  {
    name: "memory",
    path: "/memory",
    selectors: ["#addResourceBtn"],
    minText: 60
  },
  {
    name: "settings",
    path: "/settings",
    selectors: ["#settingsForm", "#settingsLanguageSelect"],
    minText: 150
  },
  {
    name: "account",
    path: "/account",
    selectors: ["#accountForm", "#accountNameInput"],
    minText: 150
  },
  {
    name: "pk",
    path: "/pk",
    selectors: ["#startPkBtn", "#pkProblem"],
    minText: 80
  }
];

const corsPreflightChecks = [
  {
    name: "cloud sync preflight",
    path: "/sync",
    method: "POST",
    requestHeaders: ["content-type", "authorization"]
  },
  {
    name: "poker join preflight",
    path: "/poker/rooms/QG-MAIN/join",
    method: "POST",
    requestHeaders: ["content-type", "authorization"]
  }
];

const summary = {
  status: "pass",
  surface: "deployed beta smoke",
  baseUrl,
  email: redactEmail(email),
  login: { status: "pending" },
  config: {},
  corsPreflights: [],
  routes: [],
  routeSummary: { checked: 0, passed: 0, failed: 0 },
  errors: {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    ignored: []
  },
  checks: {},
  durationMs: 0
};

let browser;
try {
  assert(email, "Set QUANTGYM_BETA_SMOKE_EMAIL or pass --email.");
  assert(password, "Set QUANTGYM_BETA_SMOKE_PASSWORD or pass --password-stdin.");
  assert(chromePath, "Google Chrome executable was not found. Set CHROME_PATH to run this check.");

  const { chromium } = await import("playwright-core");
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"]
  });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    locale: "zh-CN"
  });
  const page = await context.newPage();
  attachCollectors(page);

  await signIn(page);
  summary.config = await readRuntimeConfig(page);
  await checkCorsPreflights();
  await checkRoutes(page);
  finalizeChecks();
} catch (error) {
  summary.status = "fail";
  summary.error = error.message;
} finally {
  summary.durationMs = Date.now() - startedAt;
  if (browser) await browser.close().catch(() => {});
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== "pass") process.exitCode = 1;
}

function attachCollectors(page) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isIgnoredConsole(text)) {
      summary.errors.ignored.push({ type: "console", text: text.slice(0, 220) });
      return;
    }
    summary.errors.consoleErrors.push(text.slice(0, 500));
  });
  page.on("pageerror", (error) => {
    summary.errors.pageErrors.push(String(error.message || error).slice(0, 500));
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!isOwnUrl(url)) return;
    const failure = request.failure()?.errorText || "";
    if (/\/cdn-cgi\/rum/i.test(url)) {
      summary.errors.ignored.push({ type: "requestfailed", url: sanitizeUrl(url), failure });
      return;
    }
    if (/\/api\/sync($|\?)/i.test(url) && failure === "net::ERR_ABORTED") {
      summary.errors.ignored.push({
        type: "requestfailed",
        url: sanitizeUrl(url),
        failure,
        reason: "navigation-aborted background sync"
      });
      return;
    }
    if (failure === "net::ERR_ABORTED" && isNavigationAbortedStaticAsset(url)) {
      summary.errors.ignored.push({
        type: "requestfailed",
        url: sanitizeUrl(url),
        failure,
        reason: "navigation-aborted static asset"
      });
      return;
    }
    summary.errors.requestFailures.push({ url: sanitizeUrl(url), failure });
  });
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400 || !isOwnUrl(url) || /\/favicon\.ico($|\?)/i.test(url)) return;
    if (status === 403 && /\/api\/admin\/(audit-events|metrics)($|\?)/i.test(url)) {
      summary.errors.ignored.push({
        type: "http",
        status,
        url: sanitizeUrl(url),
        reason: "non-admin account admin endpoint guard"
      });
      return;
    }
    summary.errors.httpErrors.push({ status, url: sanitizeUrl(url) });
  });
}

async function signIn(page) {
  await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await Promise.race([
    page.waitForSelector("#authShell", { timeout: 15000 }).catch(() => null),
    page.waitForSelector("#appShell", { timeout: 15000 }).catch(() => null)
  ]);

  if (await isVisible(page, "#authShell")) {
    await page.locator("#loginEmail").fill(email);
    await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
    await Promise.race([
      page.waitForSelector("#loginPassword:not(.hidden)", { state: "visible", timeout: 15000 }).catch(() => null),
      page.waitForSelector("#registerForm:not(.hidden)", { state: "visible", timeout: 15000 }).catch(() => null)
    ]);
    if (await isVisible(page, "#registerForm")) {
      throw new Error("Live auth showed registration for this email.");
    }
    if (!(await isVisible(page, "#loginPassword"))) {
      throw new Error("Password field did not appear after email submit.");
    }
    await page.locator("#loginPassword").fill(password);
    await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
  }

  await page.waitForSelector("#appShell:not(.hidden)", { state: "visible", timeout: 25000 });
  await page.waitForFunction(() => (
    !document.querySelector("#authShell") || document.querySelector("#authShell").classList.contains("hidden")
  ), null, { timeout: 10000 });

  const authSnapshot = await page.evaluate(() => {
    const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
    const cloud = JSON.parse(localStorage.getItem("quantMemoryBoard.cloud.v1") || "{}");
    const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
    const current = accounts.find((item) => item.id === auth.currentUserId) || auth.currentAccount || auth.account || {};
    return {
      hasCurrentUser: Boolean(auth.currentUserId),
      currentAccountEmail: current.email || "",
      provider: current.provider || "",
      cloudEndpoint: cloud.endpoint || "",
      hasCloudToken: Boolean(cloud.token),
      cloudUserIdSet: Boolean(cloud.userId)
    };
  });

  summary.login = {
    status: authSnapshot.hasCurrentUser ? "pass" : "fail",
    emailMatched: normalizeEmail(authSnapshot.currentAccountEmail) === normalizeEmail(email),
    provider: authSnapshot.provider,
    cloudEndpoint: authSnapshot.cloudEndpoint,
    hasCloudToken: authSnapshot.hasCloudToken,
    cloudUserIdSet: authSnapshot.cloudUserIdSet,
    pathAfterLogin: new URL(page.url()).pathname
  };
  assert(summary.login.status === "pass", "Login did not create an authenticated session.");
  assert(summary.login.emailMatched === true, "Authenticated account email did not match the requested beta account.");
  assert(summary.login.hasCloudToken === true, "Login did not persist a cloud session token.");
}

async function readRuntimeConfig(page) {
  return page.evaluate(() => {
    const config = window.QUANTGYM_CONFIG || {};
    return {
      cloudApiEndpoint: config.cloudApiEndpoint || "",
      llmEndpoint: config.llmEndpoint || "",
      googleLoginEnabled: config.googleLoginEnabled === true,
      googleClientIdSet: Boolean(config.googleClientId)
    };
  });
}

async function checkRoutes(page) {
  for (const route of routeChecks) {
    const routeResult = {
      name: route.name,
      path: route.path,
      status: "pass",
      selectors: {}
    };
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("#appShell:not(.hidden)", { state: "visible", timeout: 15000 });
      for (const selector of route.selectors) {
        await page.waitForSelector(selector, { state: "visible", timeout: 15000 });
        routeResult.selectors[selector] = true;
      }
      await page.waitForTimeout(700);
      const health = await page.evaluate(() => {
        const body = document.body;
        const doc = document.documentElement;
        const horizontalOverflowPx = Math.max(
          0,
          body.scrollWidth - doc.clientWidth,
          doc.scrollWidth - doc.clientWidth
        );
        return {
          pathname: location.pathname,
          bodyTextLength: (body.innerText || "").trim().length,
          appShellVisible: Boolean(document.querySelector("#appShell:not(.hidden)")),
          authShellVisible: Boolean(document.querySelector("#authShell:not(.hidden)")),
          horizontalOverflowPx
        };
      });
      routeResult.health = health;
      if (
        !health.appShellVisible
        || health.authShellVisible
        || health.bodyTextLength < route.minText
        || health.horizontalOverflowPx > 2
      ) {
        routeResult.status = "fail";
      }
    } catch (error) {
      routeResult.status = "fail";
      routeResult.error = error.message;
    }
    summary.routes.push(routeResult);
  }

  summary.routeSummary = {
    checked: summary.routes.length,
    passed: summary.routes.filter((route) => route.status === "pass").length,
    failed: summary.routes.filter((route) => route.status !== "pass").length
  };
}

async function checkCorsPreflights() {
  const apiEndpoint = trimSlash(summary.config.cloudApiEndpoint || "");
  const origin = new URL(baseUrl).origin;
  for (const check of corsPreflightChecks) {
    const result = {
      name: check.name,
      url: sanitizeUrl(`${apiEndpoint}${check.path}`),
      method: check.method,
      requestHeaders: check.requestHeaders,
      status: 0,
      allowOrigin: "",
      allowMethods: "",
      allowHeaders: "",
      statusPass: false,
      originPass: false,
      methodPass: false,
      headersPass: false,
      statusText: ""
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${apiEndpoint}${check.path}`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": check.method,
          "Access-Control-Request-Headers": check.requestHeaders.join(", ")
        },
        signal: controller.signal
      });
      result.status = response.status;
      result.statusText = response.statusText || "";
      result.allowOrigin = response.headers.get("access-control-allow-origin") || "";
      result.allowMethods = response.headers.get("access-control-allow-methods") || "";
      result.allowHeaders = response.headers.get("access-control-allow-headers") || "";
      result.statusPass = [200, 204].includes(response.status);
      result.originPass = result.allowOrigin === origin;
      result.methodPass = headerListIncludes(result.allowMethods, check.method);
      result.headersPass = check.requestHeaders.every((header) => headerListIncludes(result.allowHeaders, header));
    } catch (error) {
      result.error = String(error?.message || error).slice(0, 300);
    } finally {
      clearTimeout(timeout);
    }
    result.pass = result.statusPass && result.originPass && result.methodPass && result.headersPass;
    summary.corsPreflights.push(result);
  }
}

function finalizeChecks() {
  summary.checks = {
    loginPass: summary.login.status === "pass",
    loginEmailMatched: summary.login.emailMatched === true,
    cloudTokenPresent: summary.login.hasCloudToken === true,
    cloudEndpointIsProduction: summary.login.cloudEndpoint === "https://api.quantgym.app/api"
      && summary.config.cloudApiEndpoint === "https://api.quantgym.app/api",
    llmEndpointIsProduction: summary.config.llmEndpoint === "https://llm.quantgym.app/interview",
    googleLoginEnabled: summary.config.googleLoginEnabled === true && summary.config.googleClientIdSet === true,
    corsPreflightPass: summary.corsPreflights.length === corsPreflightChecks.length
      && summary.corsPreflights.every((result) => result.pass === true),
    routeCountPass: Number(summary.routeSummary.checked) === routeChecks.length
      && Number(summary.routeSummary.failed) === 0,
    noMaterialConsoleErrors: summary.errors.consoleErrors.length === 0,
    noPageErrors: summary.errors.pageErrors.length === 0,
    noRequestFailures: summary.errors.requestFailures.length === 0,
    noHttpErrors: summary.errors.httpErrors.length === 0,
    summaryRedacted: isSummaryRedacted(summary)
  };
  for (const [name, value] of Object.entries(summary.checks)) {
    if (value !== true) summary.errors[`${name}Failure`] = true;
  }
  if (Object.values(summary.checks).some((value) => value !== true)) summary.status = "fail";
}

async function readPassword() {
  if (args.includes("--password-stdin")) {
    const input = await new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
    return clean(String(input).split(/\r?\n/)[0] || input);
  }
  return clean(process.env.QUANTGYM_BETA_SMOKE_PASSWORD || process.env.QUANTGYM_LIVE_PASSWORD);
}

function writeSummary(data) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(data, null, 2)}\n`);
}

function isOwnUrl(value) {
  const text = String(value || "");
  return text.startsWith(baseUrl)
    || text.startsWith("https://api.quantgym.app")
    || text.startsWith("https://llm.quantgym.app");
}

function isIgnoredConsole(text) {
  if (/Framing 'https:\/\/accounts\.google\.com\/' violates the following report-only Content Security Policy directive/i.test(text)) {
    return true;
  }
  return /compute-pressure|Permissions-Policy|Failed to load resource: the server responded with a status of 403/i.test(text);
}

function isNavigationAbortedStaticAsset(value) {
  try {
    const url = new URL(value);
    const expected = new URL(baseUrl);
    return url.origin === expected.origin && /^\/assets\/.+\.(png|jpe?g|webp|svg|gif|avif|woff2?)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isSummaryRedacted(data) {
  const raw = JSON.stringify(data);
  return !/"password"\s*:/i.test(raw)
    && !/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(raw)
    && /^\S{2}\*\*\*@[^@\s]+$/.test(String(data.email || ""));
}

function headerListIncludes(value, expected) {
  const needle = String(expected || "").trim().toLowerCase();
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .includes(needle);
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return String(value || "").split("?")[0].slice(0, 300);
  }
}

async function isVisible(page, selector) {
  return page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
}

function redactEmail(value) {
  const [name, domain] = String(value || "").split("@");
  return `${name ? name.slice(0, 2) : "**"}***@${domain || "unknown"}`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function clean(value) {
  return String(value || "").trim();
}

function trimSlash(value) {
  return clean(value).replace(/\/+$/, "");
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findChromeExecutable() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}
