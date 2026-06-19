#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/328-browser-route-smoke-summary.json";
const skipBuild = args.includes("--no-build");
const keepTemp = args.includes("--keep-temp");
const onlyInteraction = getArgValue("--only-interaction") || "";
const quietProgress = args.includes("--quiet-progress") || process.env.QUANTGYM_BROWSER_SMOKE_PROGRESS === "0";
const chromePath = process.env.CHROME_PATH || findChromeExecutable();
const startedAt = Date.now();
const browserSmokeAccount = {
  id: "local:browser-route-smoke",
  email: "browser-route-smoke@quantgym.local",
  password: "BrowserRouteSmoke-Password1"
};
browserSmokeAccount.passwordHash = hashLocalPassword(browserSmokeAccount.email, browserSmokeAccount.password);
const routeTargets = {
  overview: ["#heroTypewriter", "#overviewProblemProgress", "#leaderboardMetricSelect"],
  plan: ["#prepPlanSetupForm", "#prepPlanDashboard"],
  skills: ["#skillsPageTitle", "#skillRadar"],
  interview: ["#interviewSetup", "#startInterviewBtn"],
  problems: ["#problemSearch", "#problemList"],
  tools: ["#startDrillSessionBtn", "#drillQuestion"],
  poker: ["#pokerLobbySummary", "#pokerTable"],
  experiences: ["#newExperienceBtn", "#experienceForm"],
  news: ["#newsTopicFilter", "#newsList"],
  community: ["#communityForm", "#communityText"],
  messages: ["#messageThreadList", "#messageComposerForm"],
  network: ["#addNetworkBtn", "#networkForm"],
  resume: ["#resumeForm", "#resumeText"],
  jobs: ["#jobsSummary", "#jobsList"],
  companies: ["#companiesPageTitle", "#companyTierFilter"],
  library: ["#librarySearch", "#libraryBookGrid"],
  courses: ["#learningPathTitle", "#courseList"],
  memory: ["#addResourceBtn", "#resourceForm"],
  settings: ["#settingsForm", "#settingsLanguageSelect"],
  account: ["#accountForm", "#accountNameInput"],
  pk: ["#startPkBtn", "#pkProblem"]
};

const failures = [];
const warnings = [];
const consoleErrors = [];
const ignoredConsoleErrors = [];
const pageErrors = [];
const responseErrors = [];
let tempRoot = "";
let preview = null;
let browser = null;

try {
  if (!chromePath) {
    throw new Error("Google Chrome executable was not found. Set CHROME_PATH to run this check.");
  }

  logProgress("loading module manifest");
  const { MODULE_MANIFEST } = await import(pathToFileURL(path.join(root, "src", "modules", "manifest.js")));
  const routes = MODULE_MANIFEST.map((entry) => ({
    id: entry.id,
    path: entry.path || "/"
  }));
  const missingTargets = routes.filter((route) => !routeTargets[route.id]);
  if (missingTargets.length) {
    throw new Error(`Missing browser route smoke targets for: ${missingTargets.map((route) => route.id).join(", ")}`);
  }

  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-browser-route-smoke-"));
  const distDir = path.join(tempRoot, "dist");
  const port = await getFreePort();

  if (!skipBuild) {
    logProgress("building static site");
    buildStaticSite(distDir);
  }
  logProgress(`starting preview server on port ${port}`);
  preview = await startPreviewServer({ distDir, port });

  const { chromium } = await import("playwright-core");
  logProgress("launching browser");
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check"
    ]
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  logProgress("checking unauthenticated auth flow");
  const unauthenticated = await checkUnauthenticatedAuthFlow(browser, baseUrl);
  const authenticated = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
    locale: "zh-CN",
    acceptDownloads: true
  });
  await authenticated.addInitScript(seedAuthenticatedStorage, browserSmokeAccount);
  const page = await authenticated.newPage();
  attachPageCollectors(page, baseUrl);

  const routeResults = [];
  for (const [index, route] of routes.entries()) {
    logProgress(`route ${index + 1}/${routes.length}: ${route.id}`);
    const result = await checkRoute(page, baseUrl, route);
    routeResults.push(result);
    logProgress(`route ${index + 1}/${routes.length}: ${route.id} ${result.status}`);
  }

  const interactionResults = [];
  const interactionChecks = [
    ["overview CTA opens problems", runOverviewToProblemsFlow],
    ["overview leaderboard controls and news ticker navigation", runOverviewLeaderboardAndTickerFlow],
    ["streak check-in calendar opens and persists activity", runStreakCheckInCalendarFlow],
    ["shell sidebar and command shortcuts persist navigation state", runShellSidebarAndCommandShortcutsFlow],
    ["hash compat deep links redirect without losing query state", runHashCompatDeepLinkFlow],
    ["mobile shell sidebar, search, and settings controls avoid overflow", runMobileShellSidebarSearchAndSettingsFlow],
    ["mobile module nav groups open problems and library routes", runMobileModuleNavGroupRoutingFlow],
    ["skills radar hover and global search spotlight", runSkillsRadarAndGlobalSearchFlow],
    ["global search module, problem, job, company, course, and news navigation", runGlobalSearchResultNavigationFlow],
    ["problems search, detail, reveal, and save", runProblemDetailFlow],
    ["problems pagination, collection filter, and mock interview handoff", runProblemPaginationCollectionInterviewFlow],
    ["mobile problems detail actions and mock handoff avoid overflow", runMobileProblemDetailActionsFlow],
    ["problems ranking view opens ranked detail and preserves ranking navigation", runProblemRankingDetailNavigationFlow],
    ["problems social like/comment no-cloud guard", runProblemSocialNoCloudGuardFlow],
    ["problems LeetCode Hot 100 tracking persistence", runProblemLeetcodeHot100TrackingFlow],
    ["tools drill starts and accepts an answer", runToolsDrillFlow],
    ["tools mental math completes session and persists records", runToolsMentalMathCompletionFlow],
    ["tools market game rejects crossed quote, scores valid quote, and persists record", runToolsMarketGameFlow],
    ["poker demo table starts, acts, and persists room state", runPokerDemoTableActionFlow],
    ["poker preflop matrix position, hand selection, and leave-table navigation", runPokerPreflopMatrixFlow],
    ["pk match, submit, reveal, and record persistence", runPkMatchSubmitRevealFlow],
    ["plan create, edit, task persistence, and navigation", runPlanCreateEditTaskAndNavigationFlow],
    ["plan baseline diagnostic completion and reload persistence", runPlanBaselineDiagnosticCompletionFlow],
    ["mobile interview advanced setup controls avoid overflow", runMobileInterviewAdvancedSetupFlow],
    ["interview onboarding, practice answer, favorite, exit, and resume", runInterviewPracticeExitResumeFlow],
    ["interview attachment upload preview, transcript, and request payload", runInterviewAttachmentAnswerFlow],
    ["interview PDF source upload generates questions and starts session", runInterviewPdfQuestionSourceFlow],
    ["todo dock opens and adds a task", runTodoDockFlow],
    ["todo dock edit, complete, delete, and reload persistence", runTodoDockLifecycleFlow],
    ["community post, like, comment, and reload persistence", runCommunityPostFlow],
    ["community image post fallback and reload persistence", runCommunityMediaPostFlow],
    ["community video post fallback and reload persistence", runCommunityVideoPostFlow],
    ["community direct message from post opens messages thread", runCommunityDirectMessageFromPostFlow],
    ["mobile community posting and messages controls avoid overflow", runMobileCommunityMessagesFlow],
    ["messages thread read, send, and reload persistence", runMessagesThreadFlow],
    ["messages multi-thread unread badges clear and persist read state", runMessagesMultiThreadUnreadFlow],
    ["experiences create, edit, share, delete, and reload persistence", runExperiencesRecordFlow],
    ["news manual submit, filter, detail, and reload persistence", runNewsManualSubmitFlow],
    ["mobile news and experiences controls avoid overflow", runMobileNewsExperiencesFlow],
    ["memory resource add, source link, and reload persistence", runMemoryResourceFlow],
    ["memory image resource upload fallback and reload persistence", runMemoryImageResourceUploadFlow],
    ["network contact add, edit, delete, and reload persistence", runNetworkContactFlow],
    ["resume text save and reload persistence", runResumeSaveFlow],
    ["resume LLM review request, render, and reload persistence", runResumeLlmReviewFlow],
    ["mobile resume review controls avoid overflow", runMobileResumeReviewFlow],
    ["jobs filter and apply link behavior", runJobsFilterAndLinkFlow],
    ["companies tier filter, practice navigation, and careers link behavior", runCompaniesTierPracticeAndCareersFlow],
    ["mobile career jobs and companies controls avoid overflow", runMobileCareerJobsCompaniesFlow],
    ["library search, kind filter, practice navigation, and reader guard", runLibrarySearchPracticeAndReaderGuardFlow],
    ["library cloud PDF reader opens, exposes links, and closes", runLibraryCloudPdfReaderFlow],
    ["cross-module prep journey persists library, problem, todo, resume, and settings state", runCrossModulePrepJourneyFlow],
    ["courses path, source switch, note, and reload persistence", runCoursesPathSourceAndNoteFlow],
    ["account profile save and reload persistence", runAccountProfileSaveFlow],
    ["account local email change requires password and reauthenticates", runAccountEmailChangeReauthFlow],
    ["account avatar upload, clear, and resume file persistence", runAccountAvatarAndResumeUploadFlow],
    ["mobile account profile and upload controls avoid overflow", runMobileAccountProfileUploadFlow],
    ["settings language switch syncs URL and persists reload", runSettingsLanguageSwitchFlow],
    ["settings saves runtime config, clears Google Client ID, and reloads", runSettingsPersistenceFlow],
    ["mobile settings config and backup controls avoid overflow", runMobileSettingsConfigBackupControlsFlow],
    ["settings rejects invalid backup files without changing state", runSettingsInvalidBackupGuardFlow],
    ["settings backup export, import, and reset state", runSettingsBackupImportResetFlow]
  ];
  const selectedInteractionChecks = onlyInteraction
    ? interactionChecks.filter(([name]) => name.includes(onlyInteraction))
    : interactionChecks;
  if (onlyInteraction && !selectedInteractionChecks.length) {
    throw new Error(`No browser interaction matched --only-interaction=${JSON.stringify(onlyInteraction)}`);
  }
  for (const [index, [name, runCheck]] of selectedInteractionChecks.entries()) {
    logProgress(`interaction ${index + 1}/${selectedInteractionChecks.length}: ${name}`);
    interactionResults.push(await runCheck(page, baseUrl));
    logProgress(`interaction ${index + 1}/${selectedInteractionChecks.length}: ${name} ${interactionResults.at(-1)?.status || "done"}`);
  }

  logProgress("closing authenticated browser context");
  await closeWithTimeout("authenticated browser context", () => authenticated.close(), 15000).catch((error) => {
    warnings.push(error.message);
    return false;
  });

  if (consoleErrors.length) {
    fail(`Browser console errors were reported: ${consoleErrors.slice(0, 3).map((item) => item.text).join(" | ")}`);
  }
  if (pageErrors.length) {
    fail(`Page errors were reported: ${pageErrors.slice(0, 3).join(" | ")}`);
  }
  if (responseErrors.length) {
    fail(`HTTP response errors were reported: ${responseErrors.slice(0, 3).map((item) => `${item.status} ${item.url}`).join(" | ")}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    browser: "Google Chrome via playwright-core",
    chromePath,
    baseUrl,
    routes: {
      checked: routeResults.length,
      passed: routeResults.filter((item) => item.status === "pass").length,
      failed: routeResults.filter((item) => item.status === "fail").length,
      results: routeResults
    },
    interactions: {
      checked: interactionResults.length,
      passed: interactionResults.filter((item) => item.status === "pass").length,
      failed: interactionResults.filter((item) => item.status === "fail").length,
      results: interactionResults
    },
    unauthenticated,
    consoleErrors,
    ignoredConsoleErrors,
    pageErrors,
    responseErrors,
    warnings,
    failures
  };

  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    browser: "Google Chrome via playwright-core",
    chromePath,
    consoleErrors,
    ignoredConsoleErrors,
    pageErrors,
    responseErrors,
    warnings,
    failures
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (browser) {
    logProgress("closing browser");
    const browserProcess = typeof browser.process === "function" ? browser.process() : null;
    const closed = await closeWithTimeout("browser", () => browser.close(), 15000).catch((error) => {
      warnings.push(error.message);
      return false;
    });
    if (!closed && browserProcess && browserProcess.exitCode === null) {
      browserProcess.kill("SIGKILL");
    }
  }
  if (preview) {
    logProgress("stopping preview server");
    await stopProcess(preview);
  }
  if (tempRoot && !keepTemp) fs.rmSync(tempRoot, { recursive: true, force: true });
  logProgress("done");
}

async function checkUnauthenticatedAuthFlow(browserInstance, baseUrl) {
  const context = await browserInstance.newContext({ viewport: { width: 1365, height: 900 }, locale: "zh-CN" });
  const apiEndpoint = `${baseUrl}/api`;
  await context.addInitScript((endpoint) => {
    localStorage.setItem("quantMemoryBoard.cloud.v1", JSON.stringify({
      endpoint,
      token: "",
      userId: "",
      lastSyncAt: "",
      lastError: ""
    }));
  }, apiEndpoint);
  let registeredAccountId = "";
  let activePassword = "";
  await context.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith("/auth/account-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exists: false })
      });
      return;
    }
    if (requestUrl.pathname.endsWith("/auth/verification-code")) {
      const body = readRequestJson(route.request());
      if (body?.purpose === "password_reset") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            delivery: "dev",
            devCode: "123456",
            cooldownSeconds: 1
          })
        });
        return;
      }
      await route.abort("failed");
      return;
    }
    if (requestUrl.pathname.endsWith("/auth/reset-password")) {
      const body = readRequestJson(route.request());
      activePassword = body?.password || activePassword;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: `browser-reset-token-${Date.now()}`,
          account: {
            id: registeredAccountId,
            provider: "local",
            name: "Browser Auth Smoke",
            email,
            country: "china",
            region: "上海",
            graduationTerm: "2027-09",
            updatedAt: new Date().toISOString()
          },
          state: {},
          community: {}
        })
      });
      return;
    }
    if (requestUrl.pathname.endsWith("/auth/login")) {
      const body = readRequestJson(route.request());
      if (body?.email === email && body?.password === activePassword && registeredAccountId) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: `browser-login-token-${Date.now()}`,
            account: {
              id: registeredAccountId,
              provider: "local",
              name: "Browser Auth Smoke",
              email,
              country: "china",
              region: "上海",
              graduationTerm: "2027-09",
              updatedAt: new Date().toISOString()
            },
            state: {},
            community: {}
          })
        });
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid credentials" })
      });
      return;
    }
    await route.abort("failed");
  });
  const page = await context.newPage();
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `browser-auth-${unique}@quantgym.local`;
  const password = `BrowserAuth-${unique}`;
  const resetPassword = `BrowserReset-${unique}`;
  activePassword = password;
  const result = {
    name: "protected route redirects to auth and local email auth works",
    status: "pass",
    localEmailAuth: {
      email,
      redirectedToLogin: false,
      accountStatusChecked: false,
      registrationFormShown: false,
      verificationOptional: false,
      registered: false,
      accountPersisted: false,
      logoutReturnedToAuth: false,
      passwordStepShown: false,
      reloginSucceeded: false,
      resetFormShown: false,
      resetCodeSent: false,
      resetSucceeded: false,
      resetOldPasswordRejected: false,
      resetNewPasswordLoginSucceeded: false
    }
  };
  try {
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await page.waitForSelector("#authShell", { timeout: 10000 });
    result.path = new URL(page.url()).pathname;
    result.redirectPath = result.path;
    result.localEmailAuth.redirectedToLogin = result.path === "/login";

    await page.locator("#loginEmail").fill(email);
    await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
    await page.waitForSelector("#registerForm:not(.hidden)", { state: "visible", timeout: 10000 });
    result.localEmailAuth.accountStatusChecked = true;
    result.localEmailAuth.registrationFormShown = true;

    await page.locator("#registerName").fill("Browser Auth Smoke");
    await page.locator("#registerPassword").fill(password);
    await page.locator("#sendRegisterCodeBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => (
      document.querySelector("#registerForm")?.dataset.verificationOptional === "true"
    ), null, { timeout: 10000 });
    result.localEmailAuth.verificationOptional = true;

    await page.locator("#registerForm").evaluate((form) => form.requestSubmit());
    await waitForAuthenticatedShell(page);
    result.localEmailAuth.registered = true;
    const registeredAuth = await expectLocalAuthAccount(page, email);
    result.localEmailAuth.accountPersisted = true;
    result.localEmailAuth.accountId = registeredAuth.currentUserId;
    registeredAccountId = registeredAuth.currentUserId;

    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#logoutBtn", { state: "visible", timeout: 10000 });
    await page.locator("#logoutBtn").click({ timeout: 10000 });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await page.waitForSelector("#authShell:not(.hidden)", { state: "visible", timeout: 10000 });
    await page.waitForFunction(() => {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      return !auth.currentUserId && Array.isArray(auth.accounts) && auth.accounts.length >= 1;
    }, null, { timeout: 10000 });
    result.localEmailAuth.logoutReturnedToAuth = true;

    await page.locator("#loginEmail").fill(email);
    await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
    await page.waitForSelector("#loginPassword:not(.hidden)", { state: "visible", timeout: 10000 });
    result.localEmailAuth.passwordStepShown = true;
    await page.locator("#loginPassword").fill(password);
    await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
    await waitForAuthenticatedShell(page);
    await expectLocalAuthAccount(page, email, registeredAuth.currentUserId);
    result.localEmailAuth.reloginSucceeded = true;
    result.localEmailAuth.reloginPath = new URL(page.url()).pathname;

    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#logoutBtn", { state: "visible", timeout: 10000 });
    await page.locator("#logoutBtn").click({ timeout: 10000 });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await page.waitForSelector("#authShell:not(.hidden)", { state: "visible", timeout: 10000 });
    await page.locator("#loginEmail").fill(email);
    await page.locator("#forgotPasswordBtn").click({ timeout: 10000 });
    await page.waitForSelector("#resetPasswordForm:not(.hidden)", { state: "visible", timeout: 10000 });
    await page.waitForFunction((value) => document.querySelector("#resetPasswordEmail")?.value === value, email, { timeout: 10000 });
    result.localEmailAuth.resetFormShown = true;

    await page.locator("#sendResetPasswordCodeBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => /验证码|code/i.test(document.querySelector("#authMessage")?.textContent || ""), null, { timeout: 10000 });
    result.localEmailAuth.resetCodeSent = true;
    await page.locator("#resetPasswordVerificationCode").fill("123456");
    await page.locator("#resetPasswordNewPassword").fill(resetPassword);
    await page.locator("#resetPasswordForm").evaluate((form) => form.requestSubmit());
    await waitForAuthenticatedShell(page);
    await expectStoredLocalAccountEmail(page, {
      userId: registeredAuth.currentUserId,
      email,
      passwordHash: hashLocalPassword(email, resetPassword)
    });
    result.localEmailAuth.resetSucceeded = true;

    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#logoutBtn", { state: "visible", timeout: 10000 });
    await page.locator("#logoutBtn").click({ timeout: 10000 });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await page.waitForSelector("#authShell:not(.hidden)", { state: "visible", timeout: 10000 });

    await submitLocalLogin(page, email, password);
    await page.waitForFunction(() => {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const message = document.querySelector("#authMessage")?.textContent || "";
      return !auth.currentUserId && /密码不对|Wrong password/i.test(message);
    }, null, { timeout: 10000 });
    result.localEmailAuth.resetOldPasswordRejected = true;

    await submitLocalLogin(page, email, resetPassword);
    await waitForAuthenticatedShell(page);
    await expectLocalAuthAccount(page, email, registeredAuth.currentUserId);
    await expectStoredLocalAccountEmail(page, {
      userId: registeredAuth.currentUserId,
      email,
      passwordHash: hashLocalPassword(email, resetPassword)
    });
    result.localEmailAuth.resetNewPasswordLoginSucceeded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`Unauthenticated auth flow failed: ${error.message}`);
  } finally {
    await context.close();
  }
  return result;
}

function readRequestJson(request) {
  try {
    return request.postDataJSON();
  } catch {
    try {
      return JSON.parse(request.postData() || "{}");
    } catch {
      return {};
    }
  }
}

async function expectLocalAuthAccount(page, email, expectedUserId = "") {
  await page.waitForFunction(({ expectedEmail, expectedId }) => {
    const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
    const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
    const account = accounts.find((item) => item.provider === "local" && item.email === expectedEmail);
    if (!account || !auth.currentUserId) return false;
    if (expectedId && auth.currentUserId !== expectedId) return false;
    return auth.currentUserId === account.id;
  }, { expectedEmail: email, expectedId: expectedUserId }, { timeout: 10000 });
  return page.evaluate((expectedEmail) => {
    const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
    const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
    const account = accounts.find((item) => item.provider === "local" && item.email === expectedEmail) || {};
    return {
      accountId: account.id || "",
      currentUserId: auth.currentUserId || ""
    };
  }, email);
}

async function checkRoute(page, baseUrl, route) {
  const targetUrl = `${baseUrl}${route.path}`;
  const result = {
    id: route.id,
    path: route.path,
    status: "pass",
    selectors: routeTargets[route.id]
  };
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    for (const selector of routeTargets[route.id]) {
      await page.waitForSelector(selector, { state: "attached", timeout: 12000 });
    }
    const health = await getRouteHealth(page);
    result.health = health;
    if (!health.appShellVisible) throw new Error("Authenticated app shell is not visible.");
    if (health.authShellVisible) throw new Error("Auth shell is visible in an authenticated route.");
    if (health.overlayVisible) throw new Error("Vite/runtime overlay is visible.");
    if (health.bodyTextLength < 80) throw new Error(`Route body text is unexpectedly small (${health.bodyTextLength}).`);
    if (health.horizontalOverflowPx > 4) throw new Error(`Document horizontal overflow is ${health.horizontalOverflowPx}px.`);
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`Route ${route.id} failed browser smoke: ${error.message}`);
  }
  return result;
}

async function runOverviewToProblemsFlow(page, baseUrl) {
  const result = { name: "overview CTA opens problems", status: "pass" };
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.locator(".problem-progress-panel button[aria-label='打开题库']").click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    result.path = new URL(page.url()).pathname;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runOverviewLeaderboardAndTickerFlow(page, baseUrl) {
  const result = { name: "overview leaderboard controls and news ticker navigation", status: "pass" };
  try {
    result.step = "open overview";
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#leaderboardMetricSelect", { timeout: 10000 });
    await page.waitForSelector("#leaderboardList", { timeout: 10000 });

    result.step = "change leaderboard controls";
    const metricValue = await page.evaluate(() => {
      const select = document.querySelector("#leaderboardMetricSelect");
      const options = [...(select?.options || [])].map((option) => option.value).filter(Boolean);
      return options.find((value) => value !== select.value) || options[0] || "overall";
    });
    await page.locator("#leaderboardMetricSelect").selectOption(metricValue);
    await page.locator("#leaderboardScopeSelect").selectOption("region");
    await page.waitForFunction(() => !document.querySelector("#leaderboardCountrySelect")?.disabled, null, { timeout: 10000 });
    await page.locator("#leaderboardCountrySelect").selectOption("unitedStates");
    await page.waitForFunction(() => {
      const region = document.querySelector("#leaderboardRegionSelect");
      return region && !region.disabled && [...region.options].some((option) => option.value === "California");
    }, null, { timeout: 10000 });
    await page.locator("#leaderboardRegionSelect").selectOption("California");
    const expectedLeaderboard = {
      metric: metricValue,
      scope: "region",
      country: "unitedStates",
      region: "California"
    };
    await expectOverviewLeaderboardControls(page, expectedLeaderboard);
    await expectStoredOverviewLeaderboard(page, expectedLeaderboard);

    result.step = "reload leaderboard settings";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectOverviewLeaderboardControls(page, expectedLeaderboard);
    await expectStoredOverviewLeaderboard(page, expectedLeaderboard);

    result.step = "open ticker news detail";
    const ticker = page.locator(".news-ticker-item[data-news-id]").first();
    await ticker.waitFor({ state: "visible", timeout: 10000 });
    const newsId = await ticker.getAttribute("data-news-id");
    const newsTitle = (await ticker.locator("strong").innerText()).trim();
    await page.locator(".news-ticker").hover({ timeout: 10000 });
    await page.waitForTimeout(160);
    await ticker.click({ timeout: 10000 });
    await page.waitForURL(/\/news$/, { timeout: 10000 });
    await page.waitForSelector("#newsDetail", { timeout: 10000 });
    await page.waitForFunction((title) => (
      (document.querySelector("#newsDetailTitle")?.textContent || "").trim() === title
    ), newsTitle, { timeout: 10000 });

    result.metric = metricValue;
    result.scope = expectedLeaderboard.scope;
    result.country = expectedLeaderboard.country;
    result.region = expectedLeaderboard.region;
    result.newsId = newsId;
    result.newsTitle = newsTitle.slice(0, 120);
    result.reloaded = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectOverviewDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectOverviewLeaderboardControls(page, expected) {
  await page.waitForFunction((values) => {
    const metric = document.querySelector("#leaderboardMetricSelect");
    const scope = document.querySelector("#leaderboardScopeSelect");
    const country = document.querySelector("#leaderboardCountrySelect");
    const region = document.querySelector("#leaderboardRegionSelect");
    const rows = document.querySelectorAll("#leaderboardList .leaderboard-item, #leaderboardList .leaderboard-empty");
    return metric?.value === values.metric
      && scope?.value === values.scope
      && country?.value === values.country
      && region?.value === values.region
      && !country.disabled
      && !region.disabled
      && rows.length > 0;
  }, expected, { timeout: 10000 });
}

async function expectStoredOverviewLeaderboard(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return state?.leaderboard?.metric === values.metric
        && state?.leaderboard?.scope === values.scope
        && state?.leaderboard?.country === values.country
        && state?.leaderboard?.region === values.region;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function collectOverviewDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    return {
      pathname: window.location.pathname,
      leaderboard: {
        metric: document.querySelector("#leaderboardMetricSelect")?.value || "",
        scope: document.querySelector("#leaderboardScopeSelect")?.value || "",
        country: document.querySelector("#leaderboardCountrySelect")?.value || "",
        region: document.querySelector("#leaderboardRegionSelect")?.value || "",
        countryDisabled: Boolean(document.querySelector("#leaderboardCountrySelect")?.disabled),
        regionDisabled: Boolean(document.querySelector("#leaderboardRegionSelect")?.disabled),
        rowText: document.querySelector("#leaderboardList")?.textContent?.slice(0, 500) || ""
      },
      ticker: [...document.querySelectorAll(".news-ticker-item[data-news-id]")].slice(0, 3).map((item) => ({
        id: item.getAttribute("data-news-id"),
        text: item.textContent?.trim().slice(0, 200) || ""
      })),
      detailTitle: document.querySelector("#newsDetailTitle")?.textContent || "",
      storedLeaderboard: state.leaderboard || {}
    };
  });
}

async function runStreakCheckInCalendarFlow(page, baseUrl) {
  const result = { name: "streak check-in calendar opens and persists activity", status: "pass" };
  const taskTitle = `Streak check-in smoke ${Date.now()}`;
  try {
    result.step = "open overview and reset streak";
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await resetStreakAndTodoState(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectStreakShellState(page, { checked: false, panelOpen: false });
    await expectStoredCheckIn(page, { checked: false });

    result.step = "add activity to trigger check-in";
    await ensureTodoDockOpen(page);
    await page.locator("#todoDockAddInput").fill(taskTitle);
    await page.locator("#todoDockAddInput").press("Enter");
    await expectTodoDockTitleVisible(page, taskTitle);
    await expectStoredTodoTitle(page, taskTitle);
    await expectStoredCheckIn(page, { checked: true, minStreak: 1 });
    await expectStreakShellState(page, { checked: true, minCount: 1, panelOpen: false });

    result.step = "open streak calendar";
    await page.locator("#checkInPill").click({ timeout: 10000 });
    await expectStreakShellState(page, {
      checked: true,
      minCount: 1,
      panelOpen: true,
      todayLit: true,
      readyMessage: true
    });

    result.step = "reload streak state";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectStoredCheckIn(page, { checked: true, minStreak: 1 });
    await expectStreakShellState(page, { checked: true, minCount: 1, panelOpen: false });
    await page.locator("#checkInPill").click({ timeout: 10000 });
    await expectStreakShellState(page, {
      checked: true,
      minCount: 1,
      panelOpen: true,
      todayLit: true,
      readyMessage: true
    });

    delete result.step;
    result.checkedIn = true;
    result.calendarOpened = true;
    result.todayLit = true;
    result.reloaded = true;
    result.persisted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectStreakDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runShellSidebarAndCommandShortcutsFlow(page, baseUrl) {
  const result = { name: "shell sidebar and command shortcuts persist navigation state", status: "pass" };
  try {
    result.step = "open overview and reset shell preferences";
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.evaluate(() => {
      localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
        language: "zh",
        sidebarCollapsed: false
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectShellSidebarState(page, { collapsed: false });

    result.step = "collapse sidebar";
    await page.locator("#sidebarToggleBtn").click({ timeout: 10000 });
    await expectShellSidebarState(page, { collapsed: true });

    result.step = "reload collapsed sidebar";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectShellSidebarState(page, { collapsed: true });

    result.step = "expand sidebar";
    await page.locator("#sidebarToggleBtn").click({ timeout: 10000 });
    await expectShellSidebarState(page, { collapsed: false });

    result.step = "command chat shortcut";
    await page.locator("#commandChatBtn").click({ timeout: 10000 });
    await page.waitForURL(/\/messages$/, { timeout: 10000 });
    await page.waitForSelector("#messageThreadList", { timeout: 10000 });

    result.step = "command account shortcut";
    await page.locator(".app-account-chip[data-jump-module='account']").click({ timeout: 10000 });
    await page.waitForURL(/\/account$/, { timeout: 10000 });
    await page.waitForSelector("#accountForm", { timeout: 10000 });

    result.step = "command settings shortcut";
    await page.locator(".app-settings-button[data-jump-module='settings']").click({ timeout: 10000 });
    await page.waitForURL(/\/settings$/, { timeout: 10000 });
    await page.waitForSelector("#settingsForm", { timeout: 10000 });

    delete result.step;
    result.sidebarCollapsed = true;
    result.reloadPersisted = true;
    result.sidebarExpanded = true;
    result.chatShortcut = true;
    result.accountShortcut = true;
    result.settingsShortcut = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectShellDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runHashCompatDeepLinkFlow(page, baseUrl) {
  const result = { name: "hash compat deep links redirect without losing query state", status: "pass" };
  try {
    result.step = "open legacy hash jobs deep link";
    await page.goto(`${baseUrl}/?utm=browser-smoke#jobs`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForURL((url) => (
      url.pathname === "/jobs"
        && url.searchParams.get("utm") === "browser-smoke"
        && !url.hash
    ), { timeout: 10000 });
    await page.waitForSelector("#jobsList .job-card", { timeout: 10000 });
    const jobsHealth = await getRouteHealth(page);
    if (jobsHealth.pathname !== "/jobs") throw new Error(`Hash jobs link landed on ${jobsHealth.pathname}`);
    if (jobsHealth.authShellVisible || !jobsHealth.appShellVisible) {
      throw new Error(`Hash jobs link shell visibility was wrong: ${JSON.stringify(jobsHealth)}`);
    }

    result.step = "switch legacy hash alias to overview";
    await page.evaluate(() => {
      window.location.hash = "dashboard";
    });
    await page.waitForURL((url) => (
      url.pathname === "/"
        && url.searchParams.get("utm") === "browser-smoke"
        && !url.hash
    ), { timeout: 10000 });
    await page.waitForSelector("#heroTypewriter", { timeout: 10000 });
    const overviewHealth = await getRouteHealth(page);
    if (overviewHealth.pathname !== "/") throw new Error(`Hash dashboard alias landed on ${overviewHealth.pathname}`);
    if (overviewHealth.authShellVisible || !overviewHealth.appShellVisible) {
      throw new Error(`Hash dashboard alias shell visibility was wrong: ${JSON.stringify(overviewHealth)}`);
    }

    delete result.step;
    result.jobsPathname = "/jobs";
    result.overviewAliasPathname = "/";
    result.queryPreserved = true;
    result.hashCleared = true;
    result.jobsRendered = true;
    result.overviewRendered = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectHashCompatDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileShellSidebarSearchAndSettingsFlow(page, baseUrl) {
  const result = { name: "mobile shell sidebar, search, and settings controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  try {
    result.step = "open overview in mobile viewport and reset shell preferences";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.evaluate(() => {
      localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
        language: "zh",
        sidebarCollapsed: false
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectShellSidebarState(page, { collapsed: false });
    await expectMobileShellState(page, { collapsed: false });

    result.step = "focus mobile search";
    await page.locator("#globalSearchInput").fill("settings");
    await expectMobileShellState(page, { collapsed: false, searchHasResults: true });
    await page.keyboard.press("Escape");
    await page.locator("#globalSearchInput").fill("");

    result.step = "collapse mobile sidebar";
    await page.locator("#sidebarToggleBtn").click({ timeout: 10000 });
    await expectShellSidebarState(page, { collapsed: true });
    await expectMobileShellState(page, { collapsed: true });

    result.step = "reload collapsed mobile sidebar";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectShellSidebarState(page, { collapsed: true });
    await expectMobileShellState(page, { collapsed: true });

    result.step = "open mobile settings shortcut";
    await page.locator(".app-settings-button[data-jump-module='settings']").click({ timeout: 10000 });
    await page.waitForURL(/\/settings$/, { timeout: 10000 });
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectMobileShellState(page, { collapsed: true });

    delete result.step;
    result.mobileViewport = true;
    result.noHorizontalOverflow = true;
    result.searchUsable = true;
    result.compactActions = true;
    result.sidebarCollapsed = true;
    result.reloadPersisted = true;
    result.settingsShortcut = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectShellDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function runMobileModuleNavGroupRoutingFlow(page, baseUrl) {
  const result = { name: "mobile module nav groups open problems and library routes", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  try {
    result.step = "open overview in mobile viewport";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.evaluate(() => {
      localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
        language: "zh",
        sidebarCollapsed: false
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMobileShellState(page, { collapsed: false });

    result.step = "open training menu and navigate problems";
    const trainingGroup = page.locator(".module-nav-group", { has: page.locator('[data-module-tab="problems"]') }).first();
    await trainingGroup.locator(".module-nav-trigger").scrollIntoViewIfNeeded({ timeout: 10000 });
    await trainingGroup.locator(".module-nav-trigger").click({ timeout: 10000 });
    await expectMobileModuleMenuOpen(page, { moduleId: "problems" });
    await trainingGroup.locator('[data-module-tab="problems"]').click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectMobileModuleRoute(page, { moduleId: "problems", path: "/problems" });

    result.step = "open resources menu and navigate library";
    const resourcesGroup = page.locator(".module-nav-group", { has: page.locator('[data-module-tab="library"]') }).first();
    await resourcesGroup.locator(".module-nav-trigger").scrollIntoViewIfNeeded({ timeout: 10000 });
    await resourcesGroup.locator(".module-nav-trigger").click({ timeout: 10000 });
    await expectMobileModuleMenuOpen(page, { moduleId: "library" });
    await resourcesGroup.locator('[data-module-tab="library"]').click({ timeout: 10000 });
    await page.waitForURL(/\/library$/, { timeout: 10000 });
    await page.waitForSelector("#librarySearch", { timeout: 10000 });
    await expectMobileModuleRoute(page, { moduleId: "library", path: "/library" });

    delete result.step;
    result.mobileViewport = true;
    result.trainingMenuOpened = true;
    result.problemsRoute = true;
    result.resourcesMenuOpened = true;
    result.libraryRoute = true;
    result.noHorizontalOverflow = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectShellDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectShellSidebarState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const collapsed = document.body.classList.contains("sidebar-collapsed");
      const button = document.querySelector("#sidebarToggleBtn");
      const prefs = JSON.parse(localStorage.getItem("quantMemoryBoard.preferences.v1") || "{}");
      return collapsed === values.collapsed
        && button?.getAttribute("aria-expanded") === String(!values.collapsed)
        && prefs.sidebarCollapsed === values.collapsed;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectMobileModuleMenuOpen(page, expected) {
  await page.waitForFunction((values) => {
    const tab = document.querySelector(`[data-module-tab="${values.moduleId}"]`);
    const menu = tab?.closest?.(".module-nav-menu");
    if (!tab || !menu) return false;
    const style = window.getComputedStyle(menu);
    const rect = menu.getBoundingClientRect();
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return window.innerWidth <= 430
      && overflow <= 4
      && style.visibility !== "hidden"
      && style.pointerEvents !== "none"
      && Number(style.opacity || 0) > 0.5
      && rect.width > 0
      && rect.height > 0
      && rect.left >= 0
      && rect.right <= window.innerWidth + 4
      && rect.bottom > 0
      && rect.top < window.innerHeight;
  }, expected, { timeout: 10000 });
}

async function expectMobileModuleRoute(page, expected) {
  await page.waitForFunction((values) => {
    const tab = document.querySelector(`[data-module-tab="${values.moduleId}"]`);
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return window.innerWidth <= 430
      && window.location.pathname === values.path
      && overflow <= 4
      && Boolean(document.querySelector("#appShell:not(.hidden)"))
      && tab?.classList.contains("active");
  }, expected, { timeout: 10000 });
}

async function expectMobileShellState(page, expected) {
  await page.waitForFunction((values) => {
    const isVisible = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && rect.left < window.innerWidth
        && rect.top < window.innerHeight;
    };
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const searchResults = document.querySelector("#globalSearchResults");
    const searchButtons = [...document.querySelectorAll("#globalSearchResults .global-search-result")];
    const searchStateOk = !values.searchHasResults || (
      searchResults
      && !searchResults.classList.contains("hidden")
      && searchButtons.some((button) => (button.textContent || "").includes("Settings"))
    );
    return window.innerWidth <= 430
      && overflow <= 4
      && document.body.classList.contains("sidebar-collapsed") === values.collapsed
      && isVisible(document.querySelector("#sidebarToggleBtn"))
      && isVisible(document.querySelector("#globalSearchInput"))
      && isVisible(document.querySelector(".app-settings-button[data-jump-module='settings']"))
      && !isVisible(document.querySelector("#commandChatBtn"))
      && !isVisible(document.querySelector(".app-account-chip[data-jump-module='account']"))
      && searchStateOk;
  }, expected, { timeout: 10000 });
}

async function collectShellDiagnostics(page) {
  return page.evaluate(() => {
    const visibility = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return { exists: false, visible: false };
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        exists: true,
        visible: style.display !== "none"
          && style.visibility !== "hidden"
          && Number(style.opacity || 1) !== 0
          && rect.width > 0
          && rect.height > 0,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    };
    let prefs = {};
    try {
      prefs = JSON.parse(localStorage.getItem("quantMemoryBoard.preferences.v1") || "{}");
    } catch {
      prefs = {};
    }
    return {
      path: window.location.pathname,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      bodyClass: document.body.className,
      sidebarExpanded: document.querySelector("#sidebarToggleBtn")?.getAttribute("aria-expanded") || "",
      sidebarLabel: document.querySelector("#sidebarToggleBtn")?.getAttribute("aria-label") || "",
      commandChatVisible: Boolean(document.querySelector("#commandChatBtn")),
      accountShortcutVisible: Boolean(document.querySelector(".app-account-chip[data-jump-module='account']")),
      settingsShortcutVisible: Boolean(document.querySelector(".app-settings-button[data-jump-module='settings']")),
      visibility: {
        sidebarToggle: visibility("#sidebarToggleBtn"),
        searchInput: visibility("#globalSearchInput"),
        chat: visibility("#commandChatBtn"),
        account: visibility(".app-account-chip[data-jump-module='account']"),
        settings: visibility(".app-settings-button[data-jump-module='settings']")
      },
      prefs
    };
  });
}

async function collectHashCompatDiagnostics(page) {
  return page.evaluate(() => ({
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    appShellVisible: Boolean(document.querySelector("#appShell:not(.hidden)")),
    authShellVisible: Boolean(document.querySelector("#authShell:not(.hidden)")),
    jobsListVisible: Boolean(document.querySelector("#jobsList")),
    overviewVisible: Boolean(document.querySelector("#heroTypewriter")),
    bodyTextLength: (document.body?.innerText || "").trim().length
  }));
}

async function resetStreakAndTodoState(page) {
  await page.evaluate(() => {
    const key = "quantMemoryBoard.userState.v1.local:browser-route-smoke";
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      state = {};
    }
    state.checkIns = [];
    state.entries = [];
    state.streakCount = 0;
    delete state.prepPlan;
    delete state.studyPlan;
    localStorage.setItem(key, JSON.stringify(state));
  });
}

async function expectStoredCheckIn(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const localDayKey = (date = new Date()) => {
        const parsed = new Date(date);
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      };
      const today = localDayKey();
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const hasToday = Array.isArray(state.checkIns)
        && state.checkIns.some((item) => localDayKey(item.date) === today && item.source === "activity");
      if (!values.checked) return !hasToday && Number(state.streakCount || 0) === 0;
      return hasToday && Number(state.streakCount || 0) >= Number(values.minStreak || 1);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectStreakShellState(page, expected) {
  await page.waitForFunction((values) => {
    const localDayKey = (date = new Date()) => {
      const parsed = new Date(date);
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    };
    const pill = document.querySelector("#checkInPill");
    const panel = document.querySelector("#streakCalendarPanel");
    const commandCount = Number(document.querySelector("#commandStreakCount")?.textContent || 0);
    const panelCount = Number(document.querySelector("#streakPanelCount")?.textContent || 0);
    const panelOpen = panel ? !panel.hidden : false;
    const checkedMatches = typeof values.checked === "boolean"
      ? pill?.classList.contains("is-checked") === values.checked
      : true;
    const openMatches = typeof values.panelOpen === "boolean" ? panelOpen === values.panelOpen : true;
    const countMatches = values.minCount === undefined
      || commandCount >= Number(values.minCount)
      || (panelOpen && panelCount >= Number(values.minCount));
    const today = localDayKey();
    const todayCell = [...document.querySelectorAll("#streakCalendarGrid .streak-day")]
      .find((cell) => cell.getAttribute("title") === today);
    const todayMatches = !values.todayLit || (todayCell?.classList.contains("is-today") && todayCell?.classList.contains("is-lit"));
    const messageText = document.querySelector("#streakPanelMessage")?.textContent || "";
    const messageMatches = !values.readyMessage || /点燃|lit|rhythm|节奏/i.test(messageText);
    return Boolean(pill)
      && checkedMatches
      && openMatches
      && countMatches
      && todayMatches
      && messageMatches;
  }, expected, { timeout: 10000 });
}

async function collectStreakDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    return {
      path: window.location.pathname,
      pillClass: document.querySelector("#checkInPill")?.className || "",
      pillExpanded: document.querySelector("#checkInPill")?.getAttribute("aria-expanded") || "",
      commandCount: document.querySelector("#commandStreakCount")?.textContent || "",
      panelHidden: document.querySelector("#streakCalendarPanel")?.hidden,
      panelCount: document.querySelector("#streakPanelCount")?.textContent || "",
      panelMessage: document.querySelector("#streakPanelMessage")?.textContent || "",
      litToday: Boolean(document.querySelector("#streakCalendarGrid .streak-day.is-today.is-lit")),
      checkIns: state.checkIns || [],
      streakCount: state.streakCount,
      studyPlanItems: state.studyPlan?.items || []
    };
  });
}

async function runProblemDetailFlow(page, baseUrl) {
  const result = { name: "problems search, detail, reveal, and save", status: "pass" };
  try {
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await page.locator("#problemSearch").fill("option");
    await page.waitForTimeout(500);
    const searchValue = await page.locator("#problemSearch").inputValue();
    if (searchValue !== "option") throw new Error(`Problem search value did not persist: ${searchValue}`);

    const firstCard = page.locator("#problemList .problem-card").first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });
    result.firstProblemId = await firstCard.getAttribute("data-problem-id");
    await firstCard.click();
    await page.waitForFunction(() => {
      const detail = document.querySelector("#problemDetail");
      return detail && !detail.classList.contains("hidden") && detail.textContent.trim().length > 100;
    }, null, { timeout: 10000 });

    const revealButton = page.locator("#problemDetail .problem-lock-overlay button").first();
    await revealButton.click({ timeout: 10000 });
    await page.waitForSelector("#problemDetail .problem-detail-block.is-unlocked", { timeout: 10000 });

    const saveButton = page.locator("#problemDetail .problem-detail-save");
    const before = await saveButton.evaluate((node) => node.classList.contains("active"));
    await saveButton.click();
    await page.waitForFunction((wasActive) => {
      const button = document.querySelector("#problemDetail .problem-detail-save");
      return button && button.classList.contains("active") !== wasActive;
    }, before, { timeout: 10000 });
    result.saveToggled = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runProblemPaginationCollectionInterviewFlow(page, baseUrl) {
  const result = { name: "problems pagination, collection filter, and mock interview handoff", status: "pass" };
  try {
    result.step = "open problems list";
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectProblemListReady(page);

    result.step = "paginate to page 2";
    const firstPage = await readProblemListSnapshot(page);
    if (!firstPage.paginationVisible || firstPage.totalPages < 2) {
      throw new Error(`Problem pagination was not available: ${JSON.stringify(firstPage)}`);
    }
    await page.locator('#problemPagination [data-problem-page="next"]').click({ timeout: 10000 });
    await expectProblemPaginationState(page, { page: 2, previousFirstId: firstPage.firstId });
    const secondPage = await readProblemListSnapshot(page);

    result.step = "jump back to page 1";
    await page.locator("#problemPagination [data-problem-page-input]").fill("1");
    await page.locator("#problemPagination [data-problem-page-jump]").evaluate((form) => form.requestSubmit());
    await expectProblemPaginationState(page, { page: 1, firstId: firstPage.firstId });

    result.step = "apply collection filter";
    const collection = await pickProblemCollection(page);
    await page.locator(`[data-problem-collection="${collection.id}"]`).click({ timeout: 10000 });
    await expectProblemCollectionFilter(page, collection.id);
    const filteredList = await readProblemListSnapshot(page);
    if (!filteredList.firstId) throw new Error("Collection filter produced an empty problem list.");

    result.step = "open filtered detail";
    const firstFilteredCard = page.locator("#problemList .problem-card").first();
    const filteredProblemId = await firstFilteredCard.getAttribute("data-problem-id");
    await firstFilteredCard.click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const detail = document.querySelector("#problemDetail");
      return detail && !detail.classList.contains("hidden") && detail.textContent.trim().length > 100;
    }, null, { timeout: 10000 });
    const detail = await readProblemDetailSnapshot(page);

    result.step = "handoff to interview";
    await page.locator("#problemDetail .problem-detail-actions .primary-button").click({ timeout: 10000 });
    await page.waitForURL(/\/interview$/, { timeout: 10000 });
    await expectProblemInterviewHandoff(page, detail.category);

    delete result.step;
    result.page1FirstId = firstPage.firstId;
    result.page2FirstId = secondPage.firstId;
    result.collectionId = collection.id;
    result.filteredProblemId = filteredProblemId;
    result.detailCategory = detail.category;
    result.paginationNavigated = true;
    result.collectionFilterActive = true;
    result.interviewHandoff = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectProblemPaginationDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileProblemDetailActionsFlow(page, baseUrl) {
  const result = { name: "mobile problems detail actions and mock handoff avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  try {
    result.step = "open mobile problems list";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectMobileProblemSurface(page, { mode: "list" });

    result.step = "search and open mobile detail";
    await page.locator("#problemSearch").fill("option");
    await page.waitForTimeout(500);
    const firstCard = page.locator("#problemList .problem-card").first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });
    const problemId = await firstCard.getAttribute("data-problem-id");
    await firstCard.click({ timeout: 10000 });
    await expectMobileProblemSurface(page, { mode: "detail" });

    result.step = "reveal answer and toggle saved";
    const revealButton = page.locator("#problemDetail .problem-lock-overlay button").first();
    await revealButton.scrollIntoViewIfNeeded({ timeout: 10000 });
    await revealButton.click({ timeout: 10000 });
    await page.waitForSelector("#problemDetail .problem-detail-block.is-unlocked", { timeout: 10000 });
    await expectMobileProblemSurface(page, { mode: "detail", answerRevealed: true });
    const saveButton = page.locator("#problemDetail .problem-detail-save");
    const before = await saveButton.evaluate((node) => node.classList.contains("active"));
    await saveButton.scrollIntoViewIfNeeded({ timeout: 10000 });
    await saveButton.click({ timeout: 10000 });
    await page.waitForFunction((wasActive) => {
      const button = document.querySelector("#problemDetail .problem-detail-save");
      return button && button.classList.contains("active") !== wasActive;
    }, before, { timeout: 10000 });
    await expectMobileProblemSurface(page, { mode: "detail", answerRevealed: true });

    result.step = "mobile handoff to interview";
    const detail = await readProblemDetailSnapshot(page);
    await page.locator("#problemDetail .problem-detail-actions .primary-button").scrollIntoViewIfNeeded({ timeout: 10000 });
    await page.locator("#problemDetail .problem-detail-actions .primary-button").click({ timeout: 10000 });
    await page.waitForURL(/\/interview$/, { timeout: 10000 });
    await expectProblemInterviewHandoff(page, detail.category);
    await expectMobileInterviewHandoffSurface(page);

    delete result.step;
    result.mobileViewport = true;
    result.problemId = problemId || "";
    result.detailOpened = true;
    result.answerRevealed = true;
    result.saveToggled = true;
    result.interviewHandoff = true;
    result.noHorizontalOverflow = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectMobileProblemDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectMobileProblemSurface(page, expected) {
  await page.waitForFunction((values) => {
    const hasLayout = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const list = document.querySelector("#problemList");
    const detail = document.querySelector("#problemDetail");
    const search = document.querySelector("#problemSearch");
    const detailActions = document.querySelector("#problemDetail .problem-detail-actions");
    const unlockedBlocks = document.querySelectorAll("#problemDetail .problem-detail-block.is-unlocked");
    const listOk = values.mode !== "list" || (
      hasLayout(list)
      && document.querySelectorAll("#problemList .problem-card").length > 0
    );
    const detailOk = values.mode !== "detail" || (
      detail
      && !detail.classList.contains("hidden")
      && hasLayout(detail.querySelector("h2"))
      && hasLayout(detailActions)
      && detailActions.getBoundingClientRect().right <= window.innerWidth + 4
    );
    const answerOk = !values.answerRevealed || unlockedBlocks.length > 0;
    return window.innerWidth <= 430
      && overflow <= 4
      && hasLayout(search)
      && listOk
      && detailOk
      && answerOk;
  }, expected, { timeout: 10000 });
}

async function expectMobileInterviewHandoffSurface(page) {
  await page.waitForFunction(() => {
    const setup = document.querySelector("#interviewSetup");
    const start = document.querySelector("#startInterviewBtn");
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return window.innerWidth <= 430
      && overflow <= 4
      && setup
      && !setup.classList.contains("hidden")
      && start;
  }, null, { timeout: 10000 });
}

async function collectMobileProblemDiagnostics(page) {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    width: window.innerWidth,
    horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    list: {
      hidden: document.querySelector("#problemList")?.classList.contains("hidden"),
      count: document.querySelectorAll("#problemList .problem-card").length,
      firstId: document.querySelector("#problemList .problem-card")?.getAttribute("data-problem-id") || ""
    },
    detail: {
      hidden: document.querySelector("#problemDetail")?.classList.contains("hidden"),
      title: document.querySelector("#problemDetail h2")?.textContent?.trim() || "",
      actionsRect: (() => {
        const rect = document.querySelector("#problemDetail .problem-detail-actions")?.getBoundingClientRect();
        return rect ? {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height
        } : null;
      })(),
      unlockedBlocks: document.querySelectorAll("#problemDetail .problem-detail-block.is-unlocked").length,
      savedActive: document.querySelector("#problemDetail .problem-detail-save")?.classList.contains("active")
    },
    interview: {
      setupHidden: document.querySelector("#interviewSetup")?.classList.contains("hidden"),
      summary: document.querySelector("#interviewSummary")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) || ""
    }
  }));
}

async function expectProblemListReady(page) {
  await page.waitForFunction(() => {
    const list = document.querySelector("#problemList");
    const cards = document.querySelectorAll("#problemList .problem-card");
    const pagination = document.querySelector("#problemPagination");
    return list
      && !list.classList.contains("hidden")
      && cards.length > 0
      && pagination
      && !pagination.classList.contains("hidden");
  }, null, { timeout: 10000 });
}

async function readProblemListSnapshot(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("#problemList .problem-card")];
    const pagination = document.querySelector("#problemPagination");
    const activePageButton = document.querySelector("#problemPagination [data-problem-page].active");
    const nextButton = document.querySelector('#problemPagination [data-problem-page="next"]');
    return {
      firstId: cards[0]?.getAttribute("data-problem-id") || "",
      cardCount: cards.length,
      page: Number(activePageButton?.dataset?.problemPage || 1),
      totalPages: Number(nextButton?.dataset?.totalPages || activePageButton?.dataset?.totalPages || 1),
      paginationVisible: Boolean(pagination && !pagination.classList.contains("hidden")),
      summary: document.querySelector("#problemPagination .problem-pagination-summary")?.textContent?.trim() || "",
      searchValue: document.querySelector("#problemSearch")?.value || ""
    };
  });
}

async function expectProblemPaginationState(page, expected) {
  await page.waitForFunction((values) => {
    const cards = [...document.querySelectorAll("#problemList .problem-card")];
    const activePageButton = document.querySelector("#problemPagination [data-problem-page].active");
    const firstId = cards[0]?.getAttribute("data-problem-id") || "";
    const pageNumber = Number(activePageButton?.dataset?.problemPage || 0);
    return cards.length > 0
      && pageNumber === values.page
      && (!values.firstId || firstId === values.firstId)
      && (!values.previousFirstId || firstId !== values.previousFirstId);
  }, expected, { timeout: 10000 });
}

async function pickProblemCollection(page) {
  const collection = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#problemCollectionGrid [data-problem-collection]")]
      .filter((card) => card.dataset.problemCollection !== "leetcode-hot");
    const withProblems = cards.find((card) => !/0\s*\/\s*0/.test(card.textContent || ""));
    const target = withProblems || cards[0] || null;
    return {
      id: target?.dataset?.problemCollection || "",
      title: target?.querySelector("strong")?.textContent?.trim() || ""
    };
  });
  if (!collection.id) throw new Error("No non-LeetCode problem collection card was available.");
  return collection;
}

async function expectProblemCollectionFilter(page, collectionId) {
  await page.waitForFunction((id) => {
    const card = document.querySelector(`[data-problem-collection="${id}"]`);
    const list = document.querySelector("#problemList");
    const cards = document.querySelectorAll("#problemList .problem-card");
    const search = document.querySelector("#problemSearch");
    return card?.classList.contains("active")
      && list
      && !list.classList.contains("hidden")
      && cards.length > 0
      && search?.value === "";
  }, collectionId, { timeout: 10000 });
}

async function readProblemDetailSnapshot(page) {
  return page.evaluate(() => ({
    title: document.querySelector("#problemDetail h2")?.textContent?.trim() || "",
    category: document.querySelector("#problemDetail .problem-meta .pill")?.textContent?.trim() || "",
    position: document.querySelector("#problemDetail .problem-detail-position")?.textContent?.trim() || ""
  }));
}

async function expectProblemInterviewHandoff(page, expectedCategory) {
  await page.waitForFunction((category) => {
    const setup = document.querySelector("#interviewSetup");
    const source = document.querySelector("#interviewSourceSelect");
    const summary = document.querySelector("#interviewSummary")?.textContent || "";
    const activeCategories = [...document.querySelectorAll("#interviewCategoryPicker .interview-category-chip.active")]
      .map((item) => item.textContent?.trim() || "")
      .filter(Boolean);
    return setup
      && !setup.classList.contains("hidden")
      && source?.value === "full"
      && /题库抽题|Question bank/i.test(summary)
      && activeCategories.length > 0
      && !activeCategories.includes("随机")
      && (!category || activeCategories.some((label) => label === category || label.includes(category) || category.includes(label)));
  }, expectedCategory, { timeout: 10000 });
}

async function collectProblemPaginationDiagnostics(page) {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    list: {
      ids: [...document.querySelectorAll("#problemList .problem-card")].slice(0, 5).map((card) => card.getAttribute("data-problem-id")),
      hidden: document.querySelector("#problemList")?.classList.contains("hidden"),
      text: document.querySelector("#problemList")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) || ""
    },
    pagination: {
      hidden: document.querySelector("#problemPagination")?.classList.contains("hidden"),
      active: document.querySelector("#problemPagination [data-problem-page].active")?.getAttribute("data-problem-page") || "",
      summary: document.querySelector("#problemPagination .problem-pagination-summary")?.textContent?.trim() || ""
    },
    collection: {
      activeId: document.querySelector("#problemCollectionGrid [data-problem-collection].active")?.getAttribute("data-problem-collection") || "",
      cards: [...document.querySelectorAll("#problemCollectionGrid [data-problem-collection]")].slice(0, 6).map((card) => ({
        id: card.getAttribute("data-problem-collection"),
        text: card.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) || ""
      }))
    },
    detail: {
      hidden: document.querySelector("#problemDetail")?.classList.contains("hidden"),
      title: document.querySelector("#problemDetail h2")?.textContent?.trim() || "",
      category: document.querySelector("#problemDetail .problem-meta .pill")?.textContent?.trim() || ""
    },
    interview: {
      source: document.querySelector("#interviewSourceSelect")?.value || "",
      summary: document.querySelector("#interviewSummary")?.textContent || "",
      activeCategories: [...document.querySelectorAll("#interviewCategoryPicker .interview-category-chip.active")]
        .map((item) => item.textContent?.trim() || "")
    }
  }));
}

async function runProblemRankingDetailNavigationFlow(page, baseUrl) {
  const result = { name: "problems ranking view opens ranked detail and preserves ranking navigation", status: "pass" };
  try {
    result.step = "open ranking view";
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await page.locator('[data-problem-view="ranking"]').click({ timeout: 10000 });
    const ranking = await expectProblemRankingView(page);
    if (ranking.rowCount < 2) throw new Error(`Expected at least two ranking rows, found ${ranking.rowCount}.`);
    if (!ranking.scoresDescending) throw new Error(`Ranking scores were not descending: ${ranking.scores.join(", ")}`);

    result.step = "open top ranked detail";
    await page.locator("#problemRankingList [data-problem-ranking-row]").first().click({ timeout: 10000 });
    await expectProblemDetailFromRanking(page, {
      title: ranking.firstTitle,
      positionPrefix: "1 /"
    });

    result.step = "navigate to next ranked detail";
    const nextButton = page.locator('#problemDetail .problem-detail-nav-button[aria-label="下一题"], #problemDetail .problem-detail-nav-button[aria-label="Next"]').last();
    await nextButton.waitFor({ state: "visible", timeout: 10000 });
    if (await nextButton.isDisabled()) throw new Error("Next-ranked detail navigation button was disabled.");
    await nextButton.click({ timeout: 10000 });
    await expectProblemDetailFromRanking(page, {
      title: ranking.secondTitle,
      positionPrefix: "2 /"
    });

    result.step = "return to ranking view";
    await page.locator("#problemDetail .problem-detail-top > button").first().click({ timeout: 10000 });
    const returned = await expectProblemRankingView(page, { expectedFirstId: ranking.firstId });

    delete result.step;
    result.firstProblemId = ranking.firstId;
    result.secondProblemId = ranking.secondId;
    result.rowCount = ranking.rowCount;
    result.topScore = ranking.scores[0];
    result.scoresDescending = ranking.scoresDescending;
    result.rankingDetailPositionPass = true;
    result.returnedToRanking = returned.firstId === ranking.firstId;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectProblemRankingDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectProblemRankingView(page, expected = {}) {
  await page.waitForFunction((values) => {
    const ranking = document.querySelector("#problemRanking");
    const list = document.querySelector("#problemList");
    const pagination = document.querySelector("#problemPagination");
    const activeTab = document.querySelector('[data-problem-view="ranking"]');
    const rows = [...document.querySelectorAll("#problemRankingList [data-problem-ranking-row]")];
    const firstId = rows[0]?.getAttribute("data-problem-ranking-row") || "";
    return ranking
      && !ranking.classList.contains("hidden")
      && list?.classList.contains("hidden")
      && pagination?.classList.contains("hidden")
      && activeTab?.classList.contains("active")
      && rows.length > 0
      && (!values.expectedFirstId || firstId === values.expectedFirstId);
  }, expected, { timeout: 10000 });
  return readProblemRankingSnapshot(page);
}

async function readProblemRankingSnapshot(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll("#problemRankingList [data-problem-ranking-row]")];
    const scores = rows.map((row) => Number(row.getAttribute("data-problem-ranking-score") || 0));
    const titles = rows.map((row) => row.querySelector(".problem-ranking-copy strong")?.textContent?.trim() || "");
    return {
      rowCount: rows.length,
      firstId: rows[0]?.getAttribute("data-problem-ranking-row") || "",
      secondId: rows[1]?.getAttribute("data-problem-ranking-row") || "",
      firstTitle: titles[0] || "",
      secondTitle: titles[1] || "",
      scores,
      scoresDescending: scores.every((score, index) => index === 0 || score <= scores[index - 1]),
      rankingText: document.querySelector("#problemRanking")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 600) || ""
    };
  });
}

async function expectProblemDetailFromRanking(page, expected) {
  await page.waitForFunction((values) => {
    const detail = document.querySelector("#problemDetail");
    const title = detail?.querySelector("h2")?.textContent?.trim() || "";
    const position = detail?.querySelector(".problem-detail-position")?.textContent?.trim() || "";
    const expectedTitle = String(values.title || "");
    const titleMatches = title === expectedTitle || title.includes(expectedTitle) || expectedTitle.includes(title);
    return detail
      && !detail.classList.contains("hidden")
      && titleMatches
      && position.startsWith(values.positionPrefix);
  }, expected, { timeout: 10000 });
}

async function collectProblemRankingDiagnostics(page) {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    activeView: [...document.querySelectorAll("[data-problem-view]")]
      .find((button) => button.classList.contains("active"))?.getAttribute("data-problem-view") || "",
    rankingHidden: document.querySelector("#problemRanking")?.classList.contains("hidden"),
    listHidden: document.querySelector("#problemList")?.classList.contains("hidden"),
    paginationHidden: document.querySelector("#problemPagination")?.classList.contains("hidden"),
    rows: [...document.querySelectorAll("#problemRankingList [data-problem-ranking-row]")].slice(0, 5).map((row) => ({
      id: row.getAttribute("data-problem-ranking-row") || "",
      score: Number(row.getAttribute("data-problem-ranking-score") || 0),
      title: row.querySelector(".problem-ranking-copy strong")?.textContent?.trim() || ""
    })),
    detail: {
      hidden: document.querySelector("#problemDetail")?.classList.contains("hidden"),
      title: document.querySelector("#problemDetail h2")?.textContent?.trim() || "",
      position: document.querySelector("#problemDetail .problem-detail-position")?.textContent?.trim() || "",
      nextDisabled: Boolean([...document.querySelectorAll("#problemDetail .problem-detail-nav-button")].at(-1)?.disabled)
    }
  }));
}

async function runProblemSocialNoCloudGuardFlow(page, baseUrl) {
  const result = { name: "problems social like/comment no-cloud guard", status: "pass" };
  const timestamp = Date.now();
  const commentText = `Problem social no-cloud comment ${timestamp}`;
  const socialRoutePattern = "**/problem-social**";
  let socialRequestCount = 0;
  const socialRouteHandler = async (route) => {
    socialRequestCount += 1;
    await route.fulfill({
      status: 599,
      contentType: "text/plain",
      body: "Unexpected problem social request in no-cloud browser smoke."
    });
  };

  try {
    result.problemId = await openProblemDetailFromSearch(page, baseUrl, "option");
    const before = await readProblemSocialDetailState(page);

    await page.route(socialRoutePattern, socialRouteHandler);
    await page.locator("#problemDetail .problem-like-button").click({ timeout: 10000 });
    await expectProblemSocialCloudNotice(page);
    await expectProblemSocialState(page, {
      likeCount: before.likeCount,
      liked: before.liked,
      commentText,
      commentDraft: ""
    });

    await page.locator("#problemDetail .problem-comment-form textarea").fill(commentText);
    await page.locator("#problemDetail .problem-comment-form").evaluate((form) => form.requestSubmit());
    await expectProblemSocialCloudNotice(page);
    await expectProblemSocialState(page, {
      likeCount: before.likeCount,
      liked: before.liked,
      commentText,
      commentDraft: commentText
    });
    await page.waitForTimeout(200);
    if (socialRequestCount !== 0) throw new Error(`No-cloud social action made ${socialRequestCount} problem-social request(s).`);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await openProblemDetailFromSearch(page, baseUrl, "option", { preservePage: true });
    await expectProblemSocialState(page, {
      likeCount: before.likeCount,
      liked: before.liked,
      commentText,
      commentDraft: ""
    });
    if (socialRequestCount !== 0) throw new Error(`No-cloud social flow made ${socialRequestCount} problem-social request(s).`);

    result.likeCount = before.likeCount;
    result.liked = before.liked;
    result.commentDraftPreserved = true;
    result.socialRequests = socialRequestCount;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(socialRoutePattern, socialRouteHandler).catch(() => {});
  }
  return result;
}

async function runProblemLeetcodeHot100TrackingFlow(page, baseUrl) {
  const result = { name: "problems LeetCode Hot 100 tracking persistence", status: "pass" };
  try {
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemCollectionGrid", { timeout: 10000 });

    await openLeetcodeHotPanel(page);
    const firstItem = page.locator("#leetcodeHotList .leetcode-hot-item").first();
    await firstItem.waitFor({ state: "visible", timeout: 10000 });
    const hotId = await firstItem.locator("[data-leetcode-hot-toggle]").getAttribute("data-leetcode-hot-toggle");
    const title = (await firstItem.locator(".leetcode-hot-main strong").innerText()).trim();
    if (!hotId) throw new Error("LeetCode Hot item is missing its toggle id.");
    const before = await readLeetcodeHotTrackingState(page, hotId);
    if (before.doneIds.includes(hotId)) {
      await firstItem.locator("[data-leetcode-hot-toggle]").click({ timeout: 10000 });
      await expectLeetcodeHotTrackingState(page, { hotId, done: false });
    }

    await page.locator(`[data-leetcode-hot-toggle="${hotId}"]`).click({ timeout: 10000 });
    await expectLeetcodeHotTrackingState(page, { hotId, done: true });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await openLeetcodeHotPanel(page);
    await expectLeetcodeHotTrackingState(page, { hotId, done: true });

    await page.locator(`[data-leetcode-hot-toggle="${hotId}"]`).click({ timeout: 10000 });
    await expectLeetcodeHotTrackingState(page, { hotId, done: false });

    result.hotId = hotId;
    result.title = title;
    result.markedDone = true;
    result.unmarkedDone = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function openLeetcodeHotPanel(page) {
  const hotCard = page.locator('[data-problem-collection="leetcode-hot"]');
  await hotCard.waitFor({ state: "visible", timeout: 10000 });
  const expanded = await page.locator("#leetcodeHotList").evaluate((node) => !node.classList.contains("hidden")).catch(() => false);
  if (!expanded) {
    await hotCard.click({ timeout: 10000 });
  }
  await page.waitForFunction(() => {
    const list = document.querySelector("#leetcodeHotList");
    return list && !list.classList.contains("hidden") && list.querySelectorAll(".leetcode-hot-item").length > 0;
  }, null, { timeout: 10000 });
}

async function readLeetcodeHotTrackingState(page, hotId) {
  return page.evaluate((id) => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const item = document.querySelector(`[data-leetcode-hot-toggle="${id}"]`)?.closest(".leetcode-hot-item");
    const progressCard = document.querySelector('[data-problem-collection="leetcode-hot"]');
    return {
      doneIds: Array.isArray(state.leetcodeHot100Done) ? state.leetcodeHot100Done : [],
      skill: Number(state.skills?.leetcode || 0),
      itemDone: Boolean(item?.classList.contains("is-done")),
      itemText: item?.textContent || "",
      progressText: progressCard?.querySelector(".problem-collection-bottom span")?.textContent?.replace(/\s+/g, " ").trim() || ""
    };
  }, hotId);
}

async function expectLeetcodeHotTrackingState(page, expected) {
  await page.waitForFunction((values) => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const doneIds = Array.isArray(state.leetcodeHot100Done) ? state.leetcodeHot100Done : [];
    const item = document.querySelector(`[data-leetcode-hot-toggle="${values.hotId}"]`)?.closest(".leetcode-hot-item");
    const progressCard = document.querySelector('[data-problem-collection="leetcode-hot"]');
    const progressText = progressCard?.querySelector(".problem-collection-bottom span")?.textContent?.replace(/\s+/g, " ").trim() || "";
    const done = doneIds.includes(values.hotId);
    const uiDone = Boolean(item?.classList.contains("is-done"));
    const expectedPrefix = values.done ? "1 /" : "0 /";
    return done === values.done
      && uiDone === values.done
      && progressText.startsWith(expectedPrefix)
      && Number(state.skills?.leetcode || 0) >= (values.done ? 1 : 0);
  }, expected, { timeout: 10000 });
}

async function openProblemDetailFromSearch(page, baseUrl, query, options = {}) {
  if (!options.preservePage) {
    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
  }
  await page.waitForSelector("#problemSearch", { timeout: 10000 });
  await page.locator("#problemSearch").fill(query);
  await page.waitForTimeout(500);
  const firstCard = page.locator("#problemList .problem-card").first();
  await firstCard.waitFor({ state: "visible", timeout: 10000 });
  const problemId = await firstCard.getAttribute("data-problem-id");
  await firstCard.click();
  await page.waitForFunction(() => {
    const detail = document.querySelector("#problemDetail");
    return detail && !detail.classList.contains("hidden") && detail.textContent.trim().length > 100;
  }, null, { timeout: 10000 });
  return problemId || "";
}

async function readProblemSocialDetailState(page) {
  return page.evaluate(() => {
    const likeButton = document.querySelector("#problemDetail .problem-like-button");
    return {
      likeCount: Number(likeButton?.querySelector("strong")?.textContent || 0),
      liked: Boolean(likeButton?.classList.contains("active")),
      notice: document.querySelector("#problemDetail .problem-social-notice")?.textContent?.trim() || ""
    };
  });
}

async function expectProblemSocialCloudNotice(page) {
  await page.waitForFunction(() => {
    const notice = document.querySelector("#problemDetail .problem-social-notice")?.textContent || "";
    return /云端|cloud/i.test(notice);
  }, null, { timeout: 10000 });
}

async function expectProblemSocialState(page, expected) {
  await page.waitForFunction((values) => {
    const likeButton = document.querySelector("#problemDetail .problem-like-button");
    const likeCount = Number(likeButton?.querySelector("strong")?.textContent || 0);
    const liked = Boolean(likeButton?.classList.contains("active"));
    const draft = document.querySelector("#problemDetail .problem-comment-form textarea")?.value || "";
    const commentsText = [...document.querySelectorAll("#problemDetail .problem-comment")]
      .map((item) => item.textContent || "")
      .join("\n");
    return likeCount === values.likeCount
      && liked === values.liked
      && draft === values.commentDraft
      && !commentsText.includes(values.commentText);
  }, expected, { timeout: 10000 });
}

async function runSkillsRadarAndGlobalSearchFlow(page, baseUrl) {
  const result = { name: "skills radar hover and global search spotlight", status: "pass" };
  try {
    result.step = "open skills";
    await page.goto(`${baseUrl}/skills`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#skillRadar", { timeout: 10000 });
    await expectSkillsSurface(page);

    result.step = "activate radar legend";
    await page.locator('[data-skill-radar-key="probabilityExpectation"]').click({ timeout: 10000 });
    await expectSkillActive(page, {
      key: "probabilityExpectation",
      label: "Probability/Expectation"
    });

    result.step = "global search skill spotlight";
    await page.locator("#globalSearchInput").fill("principal logarithm");
    await expectGlobalSearchSkillResult(page, "Complex Numbers");
    await page.locator("#globalSearchResults .global-search-result", { hasText: "Complex Numbers" }).first().click({ timeout: 10000 });
    await expectGlobalSearchCleared(page);
    await page.waitForURL(/\/skills$/, { timeout: 10000 });
    await expectSkillActive(page, {
      key: "complexNumbers",
      label: "Complex Numbers",
      requireSpotlightOrViewport: true
    });

    delete result.step;
    result.legendRows = await page.locator("#skillRadarLegend [data-skill-radar-key]").count();
    result.skillCards = await page.locator("#skillsGrid [data-skill-key]").count();
    result.searchSkill = "complexNumbers";
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runGlobalSearchResultNavigationFlow(page, baseUrl) {
  const result = { name: "global search module, problem, job, company, course, and news navigation", status: "pass" };
  try {
    result.step = "module result";
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await clickGlobalSearchResult(page, {
      query: "settings",
      expectedText: "Settings"
    });
    await page.waitForURL(/\/settings$/, { timeout: 10000 });
    await page.waitForSelector("#settingsForm", { timeout: 10000 });

    result.step = "company result";
    await clickGlobalSearchResult(page, {
      query: "JaneStreet",
      expectedText: "Jane Street"
    });
    await page.waitForURL(/\/companies$/, { timeout: 10000 });
    await expectGlobalSearchTargetVisible(page, {
      selector: '[data-company-card="jane-street"]',
      text: "Jane Street"
    });

    result.step = "job result";
    await clickGlobalSearchResult(page, {
      query: "Quantitative Trading Internship",
      expectedText: "Quantitative Trading / Research Internship"
    });
    await page.waitForURL(/\/jobs$/, { timeout: 10000 });
    await expectGlobalSearchTargetVisible(page, {
      selector: '[data-job-id="job-jane-street-quant-intern"]',
      text: "Quantitative Trading / Research Internship"
    });

    result.step = "course result";
    await clickGlobalSearchResult(page, {
      query: "StatQuest",
      expectedText: "StatQuest: Statistics and Machine Learning"
    });
    await page.waitForURL(/\/courses$/, { timeout: 10000 });
    await expectGlobalSearchTargetVisible(page, {
      selector: '[data-course-id="course-statquest-ml-stats"]',
      text: "StatQuest: Statistics and Machine Learning"
    });

    result.step = "news result";
    await clickGlobalSearchResult(page, {
      query: "CoreWeave",
      expectedText: "CoreWeave"
    });
    await page.waitForFunction(() => {
      if (window.location.pathname !== "/news") return false;
      const detail = document.querySelector("#newsDetail");
      const text = detail?.textContent || "";
      return detail
        && text.includes("CoreWeave")
        && text.includes("Jane Street");
    }, null, { timeout: 12000 });

    result.step = "problem result";
    await clickGlobalSearchResult(page, {
      query: "0DTE option",
      expectedText: "0DTE"
    });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForFunction(() => {
      const detail = document.querySelector("#problemDetail");
      const text = detail?.textContent || "";
      return detail
        && !detail.classList.contains("hidden")
        && text.includes("0DTE")
        && text.length > 120;
    }, null, { timeout: 12000 });

    delete result.step;
    result.coveredTypes = ["module", "company", "job", "course", "news", "problem"];
    result.news = "CoreWeave";
    result.problem = "0DTE";
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectSkillsSurface(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#skillRadar");
    const legendRows = document.querySelectorAll("#skillRadarLegend [data-skill-radar-key]");
    const cards = document.querySelectorAll("#skillsGrid [data-skill-key]");
    const score = document.querySelector("#skillsScoreValue")?.textContent?.trim() || "";
    return canvas?.getAttribute("width") === "680"
      && canvas?.getAttribute("height") === "440"
      && legendRows.length >= 15
      && cards.length >= 15
      && /^\d+$/.test(score);
  }, null, { timeout: 10000 });
}

async function expectSkillActive(page, expected) {
  await page.waitForFunction(({ key, label, requireSpotlightOrViewport }) => {
    const legend = document.querySelector(`[data-skill-radar-key="${key}"]`);
    const card = document.querySelector(`#skillsGrid [data-skill-key="${key}"]`);
    const tooltip = document.querySelector("#skillRadarTooltip");
    const tooltipText = tooltip?.textContent || "";
    const rect = card?.getBoundingClientRect?.();
    const inViewport = rect
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth;
    const positioned = !requireSpotlightOrViewport
      || card?.classList.contains("spotlight")
      || Boolean(inViewport);
    return legend?.classList.contains("is-active")
      && card?.classList.contains("is-active")
      && tooltip
      && !tooltip.classList.contains("hidden")
      && tooltipText.includes(label)
      && /\d+\/100/.test(tooltipText)
      && positioned;
  }, expected, { timeout: 10000 });
}

async function expectGlobalSearchSkillResult(page, label) {
  await page.waitForFunction((expectedLabel) => {
    const results = document.querySelector("#globalSearchResults");
    const input = document.querySelector("#globalSearchInput");
    const buttons = [...document.querySelectorAll("#globalSearchResults .global-search-result")];
    return input?.value === "principal logarithm"
      && results
      && !results.classList.contains("hidden")
      && buttons.some((button) => button.textContent.includes(expectedLabel) && /能力值|Skills/i.test(button.textContent));
  }, label, { timeout: 12000 });
}

async function clickGlobalSearchResult(page, options = {}) {
  const query = String(options.query || "");
  const expectedText = String(options.expectedText || "");
  if (!query || !expectedText) throw new Error("Global search query and expected text are required.");
  await page.locator("#globalSearchInput").fill(query);
  await page.waitForFunction(({ expected }) => {
    const results = document.querySelector("#globalSearchResults");
    const buttons = [...document.querySelectorAll("#globalSearchResults .global-search-result")];
    return results
      && !results.classList.contains("hidden")
      && buttons.some((button) => (button.textContent || "").includes(expected));
  }, { expected: expectedText }, { timeout: 12000 });
  await page.locator("#globalSearchResults .global-search-result", { hasText: expectedText }).first().click({ timeout: 10000 });
  await expectGlobalSearchCleared(page);
}

async function expectGlobalSearchCleared(page) {
  await page.waitForFunction(() => {
    const input = document.querySelector("#globalSearchInput");
    const results = document.querySelector("#globalSearchResults");
    return input?.value === ""
      && results?.classList.contains("hidden");
  }, null, { timeout: 10000 });
}

async function expectGlobalSearchTargetVisible(page, expected) {
  await page.waitForFunction(({ selector, text }) => {
    const node = document.querySelector(selector);
    if (!node) return false;
    const rect = node.getBoundingClientRect?.();
    const inViewport = rect
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth;
    return (node.textContent || "").includes(text)
      && (node.classList.contains("spotlight") || Boolean(inViewport));
  }, expected, { timeout: 12000 });
}

async function runToolsDrillFlow(page, baseUrl) {
  const result = { name: "tools drill starts and accepts an answer", status: "pass" };
  try {
    await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.locator("#startDrillSessionBtn").click({ timeout: 10000 });
    const answer = page.locator("#drillOptions [data-drill-answer]").first();
    await answer.waitFor({ state: "visible", timeout: 10000 });
    const questionBefore = await page.locator("#drillQuestion").innerText();
    await answer.click();
    await page.waitForFunction(() => {
      const feedback = document.querySelector("#drillFeedback")?.textContent?.trim() || "";
      const answered = document.querySelector("#drillOptions [data-drill-answer].correct, #drillOptions [data-drill-answer].incorrect");
      return Boolean(feedback || answered);
    }, null, { timeout: 10000 });
    result.question = questionBefore.slice(0, 120);
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runToolsMentalMathCompletionFlow(page, baseUrl) {
  const result = { name: "tools mental math completes session and persists records", status: "pass" };
  try {
    result.step = "open tools route";
    await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#startDrillSessionBtn", { timeout: 10000 });
    const before = await readMentalMathState(page);

    result.step = "configure short drill";
    await page.locator("#drillCountSelect").selectOption("10");
    await page.locator("#drillTimeSelect").selectOption("300");
    await page.locator("#startDrillSessionBtn").click({ timeout: 10000 });
    await expectMentalDrillRunning(page, { total: 10 });

    result.step = "complete drill by skipping";
    for (let index = 0; index < 10; index += 1) {
      await page.locator("#skipDrillBtn").click({ timeout: 10000 });
      await page.waitForTimeout(520);
    }
    await expectMentalDrillRecord(page, {
      minRecords: before.records.length + 1,
      total: 10,
      skipped: 10
    });
    const after = await readMentalMathState(page);

    result.step = "reload and verify persistence";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMentalDrillRecord(page, {
      minRecords: before.records.length + 1,
      total: 10,
      skipped: 10,
      requireCompletedUi: false
    });
    const reloaded = await readMentalMathState(page);

    delete result.step;
    result.recordsBefore = before.records.length;
    result.recordsAfter = after.records.length;
    result.recordsReloaded = reloaded.records.length;
    result.latestScore = reloaded.latest?.score ?? null;
    result.latestSkipped = reloaded.latest?.skipped ?? null;
    result.bestScore = reloaded.bestScore;
    result.recordPersisted = true;
    result.entryPersisted = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectMentalMathDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectMentalDrillRunning(page, expected) {
  await page.waitForFunction((values) => {
    const question = document.querySelector("#drillQuestion")?.textContent?.trim() || "";
    const progress = document.querySelector("#drillProgressText")?.textContent?.trim() || "";
    const buttons = document.querySelectorAll("#drillOptions [data-drill-answer]:not(:disabled)");
    return question.length > 0
      && progress.includes(`1/${values.total}`)
      && buttons.length > 0;
  }, expected, { timeout: 10000 });
}

async function readMentalMathState(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const records = Array.isArray(state.mentalMathRecords) ? state.mentalMathRecords : [];
    const entries = Array.isArray(state.entries) ? state.entries : [];
    const latest = records.at(-1) || null;
    return {
      records,
      latest,
      entries,
      bestScore: Number(document.querySelector("#mentalBestScore")?.textContent?.replace(/[^\d.-]/g, "") || 0),
      recordRows: [...document.querySelectorAll("#mentalRecordList .mental-record-row")].map((row) => row.textContent?.replace(/\s+/g, " ").trim() || ""),
      leaderboardRows: [...document.querySelectorAll("#mentalLeaderboardList .mental-leaderboard-row")].map((row) => row.textContent?.replace(/\s+/g, " ").trim() || ""),
      progress: document.querySelector("#drillProgressText")?.textContent?.trim() || "",
      feedback: document.querySelector("#drillFeedback")?.textContent?.trim() || ""
    };
  });
}

async function expectMentalDrillRecord(page, expected) {
  await page.waitForFunction((values) => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const records = Array.isArray(state.mentalMathRecords) ? state.mentalMathRecords : [];
    const entries = Array.isArray(state.entries) ? state.entries : [];
    const latest = records.at(-1);
    const rowsText = [...document.querySelectorAll("#mentalRecordList .mental-record-row")]
      .map((row) => row.textContent || "")
      .join("\n");
    const leaderboardText = document.querySelector("#mentalLeaderboardList")?.textContent || "";
    const bestScoreText = document.querySelector("#mentalBestScore")?.textContent || "";
    const progressText = document.querySelector("#drillProgressText")?.textContent || "";
    const feedback = document.querySelector("#drillFeedback")?.textContent || "";
    const completedUiOk = values.requireCompletedUi === false
      || (/Finished 10\/10/.test(progressText) && /Session complete/i.test(feedback));
    const matchingEntry = entries.some((entry) => (
      /Mental Math/i.test(entry?.text || "")
        && Number(entry?.totalXp || 0) >= 4
    ));
    return records.length >= values.minRecords
      && latest
      && Number(latest.total) === values.total
      && Number(latest.skipped) === values.skipped
      && Number(latest.correct || 0) === 0
      && Number(latest.incorrect || 0) === 0
      && Number(latest.accuracy || 0) === 0
      && completedUiOk
      && rowsText.includes("Number Logic")
      && rowsText.includes("0/10")
      && /Best\s+0/.test(bestScoreText)
      && leaderboardText.includes("Browser Route Smoke")
      && matchingEntry;
  }, expected, { timeout: 10000 });
}

async function collectMentalMathDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    return {
      pathname: window.location.pathname,
      progress: document.querySelector("#drillProgressText")?.textContent || "",
      feedback: document.querySelector("#drillFeedback")?.textContent || "",
      best: document.querySelector("#mentalBestScore")?.textContent || "",
      recordsText: document.querySelector("#mentalRecordList")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
      leaderboardText: document.querySelector("#mentalLeaderboardList")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 500) || "",
      storedRecords: (Array.isArray(state.mentalMathRecords) ? state.mentalMathRecords : []).slice(-3),
      storedEntries: (Array.isArray(state.entries) ? state.entries : []).slice(-5)
    };
  });
}

async function runToolsMarketGameFlow(page, baseUrl) {
  const result = {
    name: "tools market game rejects crossed quote, scores valid quote, and persists record",
    status: "pass"
  };
  try {
    result.step = "open tools route";
    await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#marketGamePrompt b", { timeout: 10000 });

    const storedBefore = await readStoredMarketGameState(page);
    const fairText = await page.locator("#marketGamePrompt b").first().innerText({ timeout: 10000 });
    const fairValue = Number(String(fairText).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(fairValue)) throw new Error(`Unable to parse market fair value from "${fairText}"`);

    result.step = "reject crossed quote";
    const crossedBid = fairValue + 2;
    const crossedAsk = fairValue + 1;
    await page.locator("#marketBidInput").fill(String(crossedBid));
    await page.locator("#marketAskInput").fill(String(crossedAsk));
    await page.locator("#submitMarketQuoteBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => (
      /Bid must be below ask/i.test(document.querySelector("#marketGameFeedback")?.textContent || "")
    ), null, { timeout: 10000 });
    const storedAfterInvalid = await readStoredMarketGameState(page);
    if (storedAfterInvalid.records.length !== storedBefore.records.length) {
      throw new Error("Invalid crossed market quote unexpectedly created a game record");
    }

    result.step = "score valid quote";
    const bid = fairValue - 1;
    const ask = fairValue + 1;
    await page.locator("#marketBidInput").fill(String(bid));
    await page.locator("#marketAskInput").fill(String(ask));
    await page.locator("#submitMarketQuoteBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => (
      /^Round [+-]?\d+\. Mid /i.test(document.querySelector("#marketGameFeedback")?.textContent?.trim() || "")
    ), null, { timeout: 10000 });
    const feedback = (await page.locator("#marketGameFeedback").innerText()).trim();
    const score = Number((await page.locator("#marketGameScore").innerText()).trim());
    await expectStoredMarketGameRecord(page, {
      minRecords: storedBefore.records.length + 1,
      bid,
      ask,
      fairValue
    });

    result.step = "start next market";
    await page.locator("#nextMarketGameBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => (
      (document.querySelector("#marketGameFeedback")?.textContent?.trim() || "") === ""
    ), null, { timeout: 10000 });

    result.step = "reload and verify persisted record";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectStoredMarketGameRecord(page, {
      minRecords: storedBefore.records.length + 1,
      bid,
      ask,
      fairValue
    });

    const storedAfter = await readStoredMarketGameState(page);
    result.fairValue = fairValue;
    result.feedback = feedback;
    result.score = score;
    result.recordsBefore = storedBefore.records.length;
    result.recordsAfter = storedAfter.records.length;
    result.marketSkill = storedAfter.marketSkill;
    result.reloaded = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectToolsMarketGameDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function readStoredMarketGameState(page) {
  return page.evaluate(() => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return {
        records: Array.isArray(state.gameRecords) ? state.gameRecords : [],
        entries: Array.isArray(state.entries) ? state.entries : [],
        marketSkill: Number(state.skills?.market || 0)
      };
    } catch {
      return { records: [], entries: [], marketSkill: 0 };
    }
  });
}

async function expectStoredMarketGameRecord(page, expected) {
  await page.waitForFunction(({ minRecords, bid, ask, fairValue }) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const records = Array.isArray(state.gameRecords) ? state.gameRecords : [];
      const entries = Array.isArray(state.entries) ? state.entries : [];
      const quoteNeedle = `Market making quote ${bid}/${ask}; fair ${fairValue}`;
      const matchingRecord = records.some((record) => (
        record?.game === "market"
          && String(record.detail || "").includes(quoteNeedle)
          && Number.isFinite(Number(record.score))
      ));
      const matchingEntry = entries.some((entry) => (
        String(entry.text || "").includes(quoteNeedle)
          && Number(entry.gains?.market || 0) >= 2
      ));
      return records.length >= minRecords
        && matchingRecord
        && matchingEntry
        && Number(state.skills?.market || 0) >= 2;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function collectToolsMarketGameDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    return {
      pathname: window.location.pathname,
      prompt: document.querySelector("#marketGamePrompt")?.textContent?.slice(0, 300) || "",
      bid: document.querySelector("#marketBidInput")?.value || "",
      ask: document.querySelector("#marketAskInput")?.value || "",
      score: document.querySelector("#marketGameScore")?.textContent || "",
      feedback: document.querySelector("#marketGameFeedback")?.textContent || "",
      storedRecords: Array.isArray(state.gameRecords) ? state.gameRecords.slice(-5) : [],
      storedEntries: Array.isArray(state.entries) ? state.entries.slice(-5) : [],
      skills: state.skills || {}
    };
  });
}

async function runPokerDemoTableActionFlow(page, baseUrl) {
  const result = { name: "poker demo table starts, acts, and persists room state", status: "pass" };
  try {
    result.step = "open poker route";
    await page.goto(`${baseUrl}/poker`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#pokerTable", { timeout: 10000 });
    await page.waitForSelector("#pokerLobbySummary", { timeout: 10000 });

    result.step = "create demo table";
    await page.locator("#pokerModeSelect").selectOption("demo");
    await page.locator("#pokerMatchBtn").click({ timeout: 10000 });
    await expectPokerDemoRoomReady(page);

    result.step = "start first demo hand";
    const roomCode = (await page.locator("#pokerRoomCode").innerText()).trim();
    await page.locator("#pokerStartTournamentBtn:not([disabled])").click({ timeout: 10000 });
    await expectPokerHandStarted(page);

    result.step = "submit hero action";
    const actionButton = page.locator('[data-poker-action="call"]:not([disabled])');
    await actionButton.waitFor({ state: "visible", timeout: 10000 });
    const actionLabel = (await actionButton.innerText()).trim();
    await actionButton.click({ timeout: 10000 });
    await expectPokerHeroActionPersisted(page);

    result.step = "inspect players and ledger panels";
    const heroNamePattern = /Browser Route Smok/i;
    await page.locator('[data-poker-panel-tab="players"]').click({ timeout: 10000 });
    await expectPokerPanelText(page, /Players/i, heroNamePattern);
    await page.locator('[data-poker-panel-tab="ledger"]').click({ timeout: 10000 });
    await expectPokerPanelText(page, /Session ledger/i, heroNamePattern);

    const room = await readStoredPokerRoom(page);
    result.roomCode = roomCode;
    result.handNumber = room.handNumber;
    result.playerCount = room.players?.length || 0;
    result.actionLabel = actionLabel;
    result.currentHandLogCount = room.currentHandLog?.length || 0;
    result.persisted = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectPokerDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runPokerPreflopMatrixFlow(page, baseUrl) {
  const result = { name: "poker preflop matrix position, hand selection, and leave-table navigation", status: "pass" };
  const expected = {
    position: "co",
    positionLabel: "CO",
    hand: "QQ"
  };
  try {
    result.step = "open poker route";
    await page.goto(`${baseUrl}/poker`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#pokerPreflopMatrix", { timeout: 10000 });
    await page.waitForSelector("#pokerPreflopDetail", { timeout: 10000 });
    await page.locator("#pokerLeaveTableBtn").waitFor({ state: "visible", timeout: 10000 });

    result.step = "change preflop position and hand";
    await page.locator("#pokerPreflopPositionSelect").selectOption(expected.position);
    const handCell = page.locator(`#pokerPreflopMatrix [data-hand="${expected.hand}"]`);
    await handCell.scrollIntoViewIfNeeded({ timeout: 10000 });
    await handCell.click({ timeout: 10000 });
    await expectPokerPreflopSelection(page, expected);

    result.position = expected.position;
    result.hand = expected.hand;
    result.selected = true;

    result.step = "leave table";
    await page.locator("#pokerLeaveTableBtn").scrollIntoViewIfNeeded({ timeout: 10000 });
    await page.locator("#pokerLeaveTableBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => window.location.pathname === "/tools", null, { timeout: 10000 });
    await page.waitForSelector("#startDrillSessionBtn", { timeout: 10000 });
    result.leaveTableNavigated = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectPokerPreflopDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectPokerPreflopSelection(page, expected) {
  await page.waitForFunction(({ position, positionLabel, hand }) => {
    const select = document.querySelector("#pokerPreflopPositionSelect");
    const matrix = document.querySelector("#pokerPreflopMatrix");
    const cell = matrix?.querySelector(`[data-hand="${hand}"]`);
    const detail = document.querySelector("#pokerPreflopDetail")?.textContent || "";
    const corner = matrix?.querySelector(".poker-matrix-header.corner")?.textContent || "";
    const selectedCells = [...(matrix?.querySelectorAll(".poker-matrix-cell.selected") || [])];
    return select?.value === position
      && corner.includes(positionLabel)
      && cell?.classList.contains("selected")
      && cell?.getAttribute("aria-pressed") === "true"
      && selectedCells.length === 1
      && detail.includes(positionLabel)
      && detail.includes(hand)
      && /Open raise|Mix open|Fold|Defend|3-bet/i.test(detail);
  }, expected, { timeout: 10000 });
}

async function collectPokerPreflopDiagnostics(page) {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    position: document.querySelector("#pokerPreflopPositionSelect")?.value || "",
    corner: document.querySelector("#pokerPreflopMatrix .poker-matrix-header.corner")?.textContent || "",
    selectedHands: [...document.querySelectorAll("#pokerPreflopMatrix .poker-matrix-cell.selected")]
      .map((cell) => ({
        hand: cell.getAttribute("data-hand") || "",
        ariaPressed: cell.getAttribute("aria-pressed") || "",
        text: cell.textContent?.trim() || ""
      })),
    detail: document.querySelector("#pokerPreflopDetail")?.textContent?.replace(/\s+/g, " ").trim() || "",
    globalSearchValue: document.querySelector("#globalSearchInput")?.value || ""
  }));
}

async function expectPokerDemoRoomReady(page) {
  await page.waitForFunction(() => {
    const summary = document.querySelector("#pokerLobbySummary")?.textContent || "";
    const playerCount = document.querySelector("#pokerPlayerCount")?.textContent || "";
    const start = document.querySelector("#pokerStartTournamentBtn");
    try {
      const code = localStorage.getItem("quantgym.pokerRoom.last.v1") || "QG-MAIN";
      const room = JSON.parse(localStorage.getItem(`quantgym.pokerRoom.v1.${code}`) || "{}");
      return room.mode === "demo"
        && room.status === "registering"
        && Array.isArray(room.players)
        && room.players.length >= 2
        && !start?.disabled
        && /Open room/.test(summary)
        && /^\d+\//.test(playerCount);
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
}

async function expectPokerHandStarted(page) {
  await page.waitForFunction(() => {
    const prompt = document.querySelector("#pokerGamePrompt")?.textContent || "";
    const turn = document.querySelector("#pokerTurnPrompt")?.textContent || "";
    const stage = document.querySelector("#pokerStageText")?.textContent || "";
    const pot = document.querySelector("#pokerPot")?.textContent || "";
    const call = document.querySelector('[data-poker-action="call"]');
    try {
      const code = localStorage.getItem("quantgym.pokerRoom.last.v1") || "QG-MAIN";
      const room = JSON.parse(localStorage.getItem(`quantgym.pokerRoom.v1.${code}`) || "{}");
      const hero = Array.isArray(room.players) ? room.players.find((player) => player.isHero) : null;
      return room.mode === "demo"
        && room.status === "running"
        && room.handNumber >= 1
        && room.handActive === true
        && room.handComplete === false
        && hero?.cards?.length === 2
        && /hand\s+#?1/i.test(prompt)
        && /Preflop|Flop|Turn|River/i.test(stage)
        && /Pot\s+\d+/i.test(pot)
        && /YOUR TURN/i.test(turn)
        && call
        && !call.disabled;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
}

async function expectPokerHeroActionPersisted(page) {
  await page.waitForFunction(() => {
    const feedback = document.querySelector("#pokerGameFeedback")?.textContent || "";
    try {
      const code = localStorage.getItem("quantgym.pokerRoom.last.v1") || "QG-MAIN";
      const room = JSON.parse(localStorage.getItem(`quantgym.pokerRoom.v1.${code}`) || "{}");
      const hero = Array.isArray(room.players) ? room.players.find((player) => player.isHero) : null;
      const logs = [
        ...(Array.isArray(room.currentHandLog) ? room.currentHandLog : []).map((entry) => entry.line || ""),
        ...(Array.isArray(room.log) ? room.log : [])
      ].join("\\n");
      const heroName = hero?.name || "Browser Route Smoke";
      return room.mode === "demo"
        && room.status === "running"
        && room.handNumber >= 1
        && Boolean(hero)
        && logs.includes(heroName)
        && /calls|checks|folds|raises|bets|all-in/i.test(logs)
        && feedback.trim().length > 0;
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
}

async function expectPokerPanelText(page, titlePattern, bodyPattern) {
  await page.waitForFunction(({ titleSource, titleFlags, bodySource, bodyFlags }) => {
    const text = document.querySelector("#pokerPanelContent")?.textContent || "";
    return new RegExp(titleSource, titleFlags).test(text)
      && new RegExp(bodySource, bodyFlags).test(text);
  }, {
    titleSource: titlePattern.source,
    titleFlags: titlePattern.flags,
    bodySource: bodyPattern.source,
    bodyFlags: bodyPattern.flags
  }, { timeout: 10000 });
}

async function readStoredPokerRoom(page) {
  return page.evaluate(() => {
    const code = localStorage.getItem("quantgym.pokerRoom.last.v1") || "QG-MAIN";
    return JSON.parse(localStorage.getItem(`quantgym.pokerRoom.v1.${code}`) || "{}");
  });
}

async function collectPokerDiagnostics(page) {
  return page.evaluate(() => {
    const code = localStorage.getItem("quantgym.pokerRoom.last.v1") || "QG-MAIN";
    let room = {};
    try {
      room = JSON.parse(localStorage.getItem(`quantgym.pokerRoom.v1.${code}`) || "{}");
    } catch {
      room = {};
    }
    const hero = Array.isArray(room.players) ? room.players.find((player) => player.isHero) : null;
    return {
      pathname: window.location.pathname,
      roomCode: code,
      dom: {
        modeSelect: document.querySelector("#pokerModeSelect")?.value || "",
        lobbySummary: document.querySelector("#pokerLobbySummary")?.textContent || "",
        playerCount: document.querySelector("#pokerPlayerCount")?.textContent || "",
        stage: document.querySelector("#pokerStageText")?.textContent || "",
        pot: document.querySelector("#pokerPot")?.textContent || "",
        prompt: document.querySelector("#pokerGamePrompt")?.textContent || "",
        turn: document.querySelector("#pokerTurnPrompt")?.textContent || "",
        feedback: document.querySelector("#pokerGameFeedback")?.textContent || "",
        startDisabled: Boolean(document.querySelector("#pokerStartTournamentBtn")?.disabled),
        callDisabled: Boolean(document.querySelector('[data-poker-action="call"]')?.disabled),
        panel: document.querySelector("#pokerPanelContent")?.textContent?.slice(0, 500) || ""
      },
      room: {
        mode: room.mode,
        status: room.status,
        online: Boolean(room.online),
        handNumber: room.handNumber,
        handActive: room.handActive,
        handComplete: room.handComplete,
        stage: room.stage,
        playerCount: Array.isArray(room.players) ? room.players.length : 0,
        heroName: hero?.name || "",
        heroCards: hero?.cards?.length || 0,
        logTail: Array.isArray(room.log) ? room.log.slice(-5) : [],
        currentHandLogTail: Array.isArray(room.currentHandLog)
          ? room.currentHandLog.slice(-5).map((entry) => entry.line || "")
          : []
      }
    };
  });
}

async function runPkMatchSubmitRevealFlow(page, baseUrl) {
  const result = { name: "pk match, submit, reveal, and record persistence", status: "pass" };
  try {
    result.step = "open";
    await page.goto(`${baseUrl}/pk`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#pkProblem", { timeout: 10000 });
    result.step = "start match";
    await page.locator("#startPkBtn").click({ timeout: 10000 });
    await expectPkStarted(page);

    const problemText = await page.locator("#pkProblem").innerText();
    const opponentName = await page.locator("#pkOpponentName").innerText();
    const answer = buildPkSmokeAnswer(problemText);
    result.step = "submit answer";
    await page.locator("#pkAnswer").fill(answer);
    await page.locator("#pkForm").evaluate((form) => form.requestSubmit());
    await expectPkSubmitted(page, { opponentName });
    await expectStoredPkRecord(page, { opponentName });

    result.step = "reveal reference";
    await page.locator("#pkRevealBtn").click({ timeout: 10000 });
    await expectPkReveal(page);

    result.opponentName = opponentName;
    result.problemPreview = problemText.slice(0, 120);
    result.recordPersisted = true;
    result.revealed = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    result.diagnostics = await collectPkDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError.message
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectPkStarted(page) {
  await page.waitForFunction(() => {
    const problemText = document.querySelector("#pkProblem")?.textContent || "";
    const normalizedProblem = problemText.trim();
    const opponentName = document.querySelector("#pkOpponentName")?.textContent || "";
    const opponentScore = document.querySelector("#pkOpponentScore")?.textContent || "";
    const userScore = document.querySelector("#pkUserScore")?.textContent || "";
    const feed = document.querySelector("#pkFeed")?.textContent || "";
    return normalizedProblem.length >= 12
      && !normalizedProblem.includes("点击匹配开始")
      && !normalizedProblem.includes("题库为空")
      && opponentName.trim()
      && opponentName.trim() !== "Online Quant"
      && opponentScore.trim() === "?"
      && userScore.trim() === "0"
      && /已匹配|题目来自/.test(feed);
  }, null, { timeout: 10000 });
}

function buildPkSmokeAnswer(problemText = "") {
  const primeMatch = String(problemText).match(/(\d+)\s*是质数吗/);
  if (primeMatch) return isPrime(Number(primeMatch[1])) ? "1" : "0";
  return [
    "Use probability, expectation, option pricing, variance, hedge ratio, market price,",
    "and explain the answer with a clean quantitative argument."
  ].join(" ");
}

function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  if (value === 2) return true;
  if (value % 2 === 0) return false;
  for (let factor = 3; factor * factor <= value; factor += 2) {
    if (value % factor === 0) return false;
  }
  return true;
}

async function expectPkSubmitted(page, expected) {
  await page.waitForFunction(({ opponentName }) => {
    const userScore = Number(document.querySelector("#pkUserScore")?.textContent || NaN);
    const opponentScore = Number(document.querySelector("#pkOpponentScore")?.textContent || NaN);
    const answer = document.querySelector("#pkAnswer")?.value || "";
    const feed = document.querySelector("#pkFeed")?.textContent || "";
    return Number.isFinite(userScore)
      && userScore > 0
      && Number.isFinite(opponentScore)
      && opponentScore >= 0
      && answer === ""
      && feed.includes(opponentName)
      && /你的得分/.test(feed)
      && /获得/.test(feed)
      && /XP/.test(feed);
  }, expected, { timeout: 10000 });
}

async function expectPkReveal(page) {
  await page.waitForFunction(() => {
    const feed = document.querySelector("#pkFeed")?.textContent || "";
    return feed.includes("参考答案") && feed.trim().length > "参考答案".length;
  }, null, { timeout: 10000 });
}

async function expectStoredPkRecord(page, expected) {
  await page.waitForFunction(({ opponentName }) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const entries = Array.isArray(state.entries) ? state.entries : [];
      return entries.some((entry) => (
        String(entry.text || "").includes("PK：")
          && String(entry.text || "").includes(opponentName)
          && Number(entry.totalXp || 0) > 0
      ));
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function collectPkDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const entries = Array.isArray(state.entries) ? state.entries : [];
    return {
      pathname: window.location.pathname,
      dom: {
        problem: document.querySelector("#pkProblem")?.textContent?.slice(0, 300) || "",
        opponentName: document.querySelector("#pkOpponentName")?.textContent || "",
        opponentScore: document.querySelector("#pkOpponentScore")?.textContent || "",
        userScore: document.querySelector("#pkUserScore")?.textContent || "",
        answerValueLength: document.querySelector("#pkAnswer")?.value?.length || 0,
        revealDisabled: Boolean(document.querySelector("#pkRevealBtn")?.disabled),
        feed: document.querySelector("#pkFeed")?.textContent?.slice(0, 500) || ""
      },
      storedEntries: entries.slice(-3).map((entry) => ({
        type: entry.type,
        title: entry.title,
        score: entry.score,
        xp: entry.xp,
        createdAt: entry.createdAt
      }))
    };
  });
}

async function runPlanCreateEditTaskAndNavigationFlow(page, baseUrl) {
  const result = { name: "plan create, edit, task persistence, and navigation", status: "pass" };
  try {
    result.step = "create skipped-diagnostic plan";
    await page.goto(`${baseUrl}/plan`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#prepPlanSetupForm", { timeout: 10000 });
    await page.locator('input[name="prepTrack"][value="internship"]').check({ timeout: 10000 });
    await page.locator('input[name="prepSeason"][value="2027-summer"]').check({ timeout: 10000 });
    await page.locator("#prepRoleSelect").selectOption("quantTrading");
    await page.locator("#prepHoursSelect").selectOption("8");
    await page.locator('input[name="prepDiagnostic"][value="skip"]').check({ timeout: 10000 });
    await page.locator("#prepPlanSetupForm").evaluate((form) => form.requestSubmit());
    await expectPlanDashboard(page, {
      roleText: "Quant Trading",
      seasonText: "2027 Summer",
      hours: "8",
      done: "0/4",
      diagnosticText: "未测评"
    });
    await expectStoredPrepPlan(page, {
      role: "quantTrading",
      weeklyHours: 8,
      diagnosticStatus: "skipped",
      completedCount: 0
    });

    result.step = "edit plan target";
    await page.locator("#editPrepPlanBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const form = document.querySelector("#prepPlanSetupForm");
      return form && !form.classList.contains("hidden");
    }, null, { timeout: 10000 });
    await page.locator("#prepRoleSelect").selectOption("quantDeveloper");
    await page.locator("#prepHoursSelect").selectOption("12");
    await page.locator("#prepPlanSetupForm").evaluate((form) => form.requestSubmit());
    await expectPlanDashboard(page, {
      roleText: "Quant Developer",
      seasonText: "2027 Summer",
      hours: "12",
      done: "0/5",
      diagnosticText: "未测评"
    });
    await expectStoredPrepPlan(page, {
      role: "quantDeveloper",
      weeklyHours: 12,
      diagnosticStatus: "skipped",
      completedCount: 0
    });

    result.step = "toggle first task";
    const firstToggle = page.locator(".prep-task-toggle").first();
    await firstToggle.waitFor({ state: "visible", timeout: 10000 });
    const taskId = await firstToggle.getAttribute("data-prep-toggle-task");
    if (!taskId) throw new Error("First prep task did not expose data-prep-toggle-task.");
    await firstToggle.click({ timeout: 10000 });
    await expectPlanTaskDone(page, { taskId, doneText: "1/5" });
    await expectStoredPrepPlan(page, {
      role: "quantDeveloper",
      weeklyHours: 12,
      diagnosticStatus: "skipped",
      completedTaskId: taskId,
      completedCount: 1
    });

    result.step = "reload plan persistence";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectPlanDashboard(page, {
      roleText: "Quant Developer",
      seasonText: "2027 Summer",
      hours: "12",
      done: "1/5",
      diagnosticText: "未测评"
    });
    await expectPlanTaskDone(page, { taskId, doneText: "1/5" });
    await expectStoredPrepPlan(page, {
      role: "quantDeveloper",
      weeklyHours: 12,
      diagnosticStatus: "skipped",
      completedTaskId: taskId,
      completedCount: 1
    });

    result.step = "task navigation to problems";
    const problemAction = page.locator('.prep-task-action[data-prep-open="problems"][data-prep-query]:not([data-prep-query=""])').first();
    await problemAction.waitFor({ state: "visible", timeout: 10000 });
    const query = await problemAction.getAttribute("data-prep-query");
    if (!query) throw new Error("Problem prep task did not expose data-prep-query.");
    await problemAction.click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectPlanProblemNavigation(page, query);

    delete result.step;
    result.role = "quantDeveloper";
    result.weeklyHours = 12;
    result.completedTaskId = taskId;
    result.problemQuery = query;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectPlanDashboard(page, expected) {
  await page.waitForFunction((values) => {
    const dashboard = document.querySelector("#prepPlanDashboard");
    if (!dashboard || dashboard.classList.contains("hidden")) return false;
    const text = dashboard.textContent || "";
    const metrics = [...dashboard.querySelectorAll(".prep-status-metrics strong")]
      .map((node) => node.textContent.trim());
    return text.includes(values.roleText)
      && text.includes(values.seasonText)
      && text.includes(values.diagnosticText)
      && metrics.includes(values.hours)
      && metrics.includes(values.done)
      && document.querySelectorAll(".prep-task").length === Number(values.done.split("/")[1] || 0);
  }, expected, { timeout: 10000 });
}

async function expectStoredPrepPlan(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const plan = state.prepPlan || {};
      const completedTasks = plan.completedTasks && typeof plan.completedTasks === "object"
        ? plan.completedTasks
        : {};
      const completedKeys = Object.entries(completedTasks)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
      if (plan.track !== "internship" || plan.season !== "2027-summer") return false;
      if (plan.role !== values.role) return false;
      if (Number(plan.weeklyHours) !== Number(values.weeklyHours)) return false;
      if (plan.diagnosticStatus !== values.diagnosticStatus) return false;
      if (Number(values.completedCount) !== completedKeys.length) return false;
      if (values.completedTaskId && !completedKeys.some((key) => key.endsWith(`:${values.completedTaskId}`))) return false;
      return Boolean(plan.createdAt && plan.updatedAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectPlanTaskDone(page, expected) {
  await page.waitForFunction(({ taskId, doneText }) => {
    const toggle = document.querySelector(`[data-prep-toggle-task="${taskId}"]`);
    const task = toggle?.closest(".prep-task");
    const metrics = [...document.querySelectorAll("#prepPlanDashboard .prep-status-metrics strong")]
      .map((node) => node.textContent.trim());
    return task?.classList.contains("done")
      && metrics.includes(doneText);
  }, expected, { timeout: 10000 });
}

async function expectPlanProblemNavigation(page, query) {
  await page.waitForFunction((theme) => {
    const search = document.querySelector("#problemSearch");
    const activeTheme = document.querySelector(`#problemThemeFilter [data-problem-theme="${theme}"]`);
    const cards = [...document.querySelectorAll("#problemList .problem-card")];
    const summary = document.querySelector("#problemThemeSummary")?.textContent || "";
    return search?.value === ""
      && activeTheme?.classList.contains("active")
      && summary.trim().length > 0
    && cards.length > 0;
  }, query, { timeout: 10000 });
}

async function runPlanBaselineDiagnosticCompletionFlow(page, baseUrl) {
  const result = { name: "plan baseline diagnostic completion and reload persistence", status: "pass" };
  try {
    result.step = "reset prep plan state";
    await resetPrepPlanState(page, baseUrl);

    result.step = "create diagnostic-required plan";
    await page.goto(`${baseUrl}/plan`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#prepPlanSetupForm", { timeout: 10000 });
    await page.locator('input[name="prepTrack"][value="internship"]').check({ timeout: 10000 });
    await page.locator('input[name="prepSeason"][value="2027-summer"]').check({ timeout: 10000 });
    await page.locator("#prepRoleSelect").selectOption("quantResearch");
    await page.locator("#prepHoursSelect").selectOption("8");
    await page.locator('input[name="prepDiagnostic"][value="take"]').check({ timeout: 10000 });
    await page.locator("#prepPlanSetupForm").evaluate((form) => form.requestSubmit());
    await expectPlanDashboard(page, {
      roleText: "Quant Research",
      seasonText: "2027 Summer",
      hours: "8",
      done: "0/4",
      diagnosticText: "Baseline 待完成"
    });
    await page.waitForSelector("#prepDiagnosticForm fieldset", { timeout: 10000 });
    const questionCount = await page.locator("#prepDiagnosticForm fieldset").count();
    if (questionCount < 8) throw new Error(`Expected at least 8 diagnostic questions, found ${questionCount}.`);
    await expectStoredPrepPlanDiagnostic(page, {
      role: "quantResearch",
      weeklyHours: 8,
      diagnosticStatus: "pending",
      questionCount
    });

    result.step = "validate missing diagnostic answers";
    await page.locator("#prepDiagnosticForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction((count) => {
      const message = document.querySelector("#prepDiagnosticMessage")?.textContent || "";
      return message.includes(`还有 ${count} 题未作答`);
    }, questionCount, { timeout: 10000 });

    result.step = "complete baseline diagnostic";
    await answerPlanDiagnosticWithLastOptions(page);
    await page.locator("#prepDiagnosticForm").evaluate((form) => form.requestSubmit());
    const completed = await expectPlanDiagnosticCompleted(page, {
      roleText: "Quant Research",
      seasonText: "2027 Summer",
      hours: "8",
      done: "0/4",
      questionCount
    });
    await expectStoredPrepPlanDiagnostic(page, {
      role: "quantResearch",
      weeklyHours: 8,
      diagnosticStatus: "completed",
      questionCount,
      expectedScore: completed.score,
      requireScores: true
    });

    result.step = "reload diagnostic persistence";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectPlanDiagnosticCompleted(page, {
      roleText: "Quant Research",
      seasonText: "2027 Summer",
      hours: "8",
      done: "0/4",
      questionCount,
      expectedScore: completed.score
    });
    await expectStoredPrepPlanDiagnostic(page, {
      role: "quantResearch",
      weeklyHours: 8,
      diagnosticStatus: "completed",
      questionCount,
      expectedScore: completed.score,
      requireScores: true,
      requireStudyPlan: true
    });

    delete result.step;
    result.questionCount = questionCount;
    result.score = completed.score;
    result.scoreRowCount = completed.scoreRowCount;
    result.diagnosticCompleted = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectPlanDiagnosticDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function resetPrepPlanState(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await waitForAuthenticatedShell(page);
  await page.evaluate(() => {
    const key = "quantMemoryBoard.userState.v1.local:browser-route-smoke";
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      state = {};
    }
    delete state.prepPlan;
    delete state.studyPlan;
    localStorage.setItem(key, JSON.stringify(state));
  });
}

async function answerPlanDiagnosticWithLastOptions(page) {
  const fieldsets = page.locator("#prepDiagnosticForm fieldset");
  const questionCount = await fieldsets.count();
  for (let index = 0; index < questionCount; index += 1) {
    await fieldsets.nth(index).locator('input[type="radio"]').last().check({ timeout: 10000 });
  }
}

async function expectPlanDiagnosticCompleted(page, expected) {
  await page.waitForFunction((values) => {
    const dashboard = document.querySelector("#prepPlanDashboard");
    if (!dashboard || dashboard.classList.contains("hidden")) return false;
    const text = dashboard.textContent || "";
    const metrics = [...dashboard.querySelectorAll(".prep-status-metrics strong")]
      .map((node) => node.textContent.trim());
    const scoreText = values.expectedScore === undefined
      ? new RegExp(`Baseline\\s+\\d+/${values.questionCount}`)
      : new RegExp(`Baseline\\s+${values.expectedScore}/${values.questionCount}`);
    return text.includes(values.roleText)
      && text.includes(values.seasonText)
      && scoreText.test(text)
      && metrics.includes(values.hours)
      && metrics.includes(values.done)
      && document.querySelectorAll(".prep-score-row").length > 0
      && !document.querySelector("#prepDiagnosticForm");
  }, expected, { timeout: 10000 });
  return page.evaluate((values) => {
    const metricText = [...document.querySelectorAll("#prepPlanDashboard .prep-status-metrics strong")]
      .map((node) => node.textContent.trim())
      .find((text) => text.startsWith("Baseline "));
    const score = Number(metricText?.match(/Baseline\s+(\d+)\//)?.[1] || 0);
    return {
      score,
      scoreRowCount: document.querySelectorAll(".prep-score-row").length,
      questionCount: values.questionCount
    };
  }, expected);
}

async function expectStoredPrepPlanDiagnostic(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const plan = state.prepPlan || {};
      if (plan.track !== "internship" || plan.season !== "2027-summer") return false;
      if (plan.role !== values.role) return false;
      if (Number(plan.weeklyHours) !== Number(values.weeklyHours)) return false;
      if (plan.diagnosticStatus !== values.diagnosticStatus) return false;
      if (values.expectedScore !== undefined && Number(plan.diagnosticScore) !== Number(values.expectedScore)) return false;
      if (values.requireScores) {
        const scores = plan.diagnosticScores && typeof plan.diagnosticScores === "object"
          ? Object.values(plan.diagnosticScores)
          : [];
        if (!scores.length || !scores.every((score) => Number.isFinite(Number(score)))) return false;
      }
      if (values.requireStudyPlan) {
        const items = Array.isArray(state.studyPlan?.items) ? state.studyPlan.items : [];
        if (!items.length || !state.studyPlan?.summary) return false;
      }
      return Boolean(plan.createdAt && plan.updatedAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function collectPlanDiagnosticDiagnostics(page) {
  return page.evaluate(() => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    } catch {
      state = {};
    }
    const plan = state.prepPlan || {};
    return {
      pathname: window.location.pathname,
      dashboardText: document.querySelector("#prepPlanDashboard")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 800) || "",
      diagnosticFormVisible: Boolean(document.querySelector("#prepDiagnosticForm")),
      diagnosticMessage: document.querySelector("#prepDiagnosticMessage")?.textContent || "",
      questionCount: document.querySelectorAll("#prepDiagnosticForm fieldset").length,
      scoreRowCount: document.querySelectorAll(".prep-score-row").length,
      storedPlan: {
        role: plan.role,
        weeklyHours: plan.weeklyHours,
        diagnosticStatus: plan.diagnosticStatus,
        diagnosticScore: plan.diagnosticScore,
        diagnosticScoreKeys: Object.keys(plan.diagnosticScores || {})
      },
      studyPlanItemCount: Array.isArray(state.studyPlan?.items) ? state.studyPlan.items.length : 0
    };
  });
}

async function runInterviewPracticeExitResumeFlow(page, baseUrl) {
  const result = { name: "interview onboarding, practice answer, favorite, exit, and resume", status: "pass" };
  const answer = [
    "I would start by clarifying inputs and constraints, then outline a brute-force baseline,",
    "improve it with a hash map or dynamic programming where appropriate, and test edge cases."
  ].join(" ");
  try {
    result.step = "open interview setup";
    await page.goto(`${baseUrl}/interview`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#interviewSetup", { timeout: 10000 });
    await page.locator('[data-interview-mode="practice"]').click({ timeout: 10000 });
    await page.locator("#llmEndpointInput").evaluate((input) => {
      input.value = "http://127.0.0.1:59991/interview";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.locator("#startInterviewBtn").click({ timeout: 10000 });
    await expectInterviewOnboardingStep(page, "focus");

    result.step = "complete onboarding";
    await clickInterviewAction(page, "focus", "algorithms");
    await expectInterviewOnboardingStep(page, "difficulty");
    await clickInterviewAction(page, "difficulty", "easy");
    await expectInterviewOnboardingStep(page, "scope");
    await page.locator("#interviewAnswer").fill("2");
    await page.locator("#interviewForm").evaluate((form) => form.requestSubmit());
    await expectInterviewOnboardingStep(page, "persona");
    await clickInterviewAction(page, "persona", "friendly");
    await expectInterviewQuestionReady(page, "Q1/2");

    result.step = "hint and reveal";
    const questionTitle = await page.locator("#interviewQuestionStatus").innerText();
    const hintBaselineLength = await page.locator("#interviewTranscript").evaluate((node) => node.textContent.length);
    await page.locator("#hintInterviewBtn:not(.hidden)").click({ timeout: 10000 });
    await expectInterviewHint(page, hintBaselineLength);
    await page.locator("#revealAnswerBtn:not(.hidden)").click({ timeout: 10000 });
    await expectInterviewReference(page);

    result.step = "submit practice answer";
    await page.locator("#interviewAnswer").fill(answer);
    await page.locator("#interviewForm").evaluate((form) => form.requestSubmit());
    await expectInterviewAnswered(page);

    result.step = "save favorite";
    await page.locator("#saveInterviewFavoriteBtn:not(.hidden)").click({ timeout: 10000 });
    await expectStoredInterviewFavorite(page);

    result.step = "exit and keep durable session";
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#exitInterviewBtn").click({ timeout: 10000 });
    await expectInterviewSetupWithResume(page);
    await expectDurableInterview(page, { exists: true });

    result.step = "resume durable session";
    await page.locator("#resumeInterviewBtn:not(.hidden)").click({ timeout: 10000 });
    await expectInterviewResumed(page);
    await expectDurableInterview(page, { exists: false });

    delete result.step;
    result.questionStatus = questionTitle;
    result.favoritePersisted = true;
    result.durableResume = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectInterviewDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileInterviewAdvancedSetupFlow(page, baseUrl) {
  const result = { name: "mobile interview advanced setup controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  try {
    result.step = "open mobile interview setup";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/interview`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#interviewSetup", { timeout: 10000 });
    await expectMobileInterviewSetupState(page, { source: "full" });

    result.step = "open advanced setup";
    await page.locator("#interviewSetup:not(.hidden) .interview-advanced-config summary").click({ timeout: 10000 });
    await expectMobileInterviewSetupState(page, { advancedOpen: true, source: "full" });

    result.step = "select technical type and option category";
    await page.locator("#interviewSetup:not(.hidden) #interviewTypeSelect").selectOption("technical", { timeout: 10000 });
    await expectMobileInterviewSetupState(page, { advancedOpen: true, type: "technical", source: "full" });
    await page.locator('#interviewSetup:not(.hidden) [data-interview-category="option"]').click({ timeout: 10000 });
    await expectMobileInterviewSetupState(page, {
      advancedOpen: true,
      type: "technical",
      source: "full",
      category: "option"
    });

    result.step = "switch to PDF source and back";
    await page.locator("#interviewSetup:not(.hidden) #interviewSourceSelect").selectOption("pdf", { timeout: 10000 });
    await expectMobileInterviewSetupState(page, { advancedOpen: true, type: "technical", source: "pdf" });
    await page.locator("#interviewSetup:not(.hidden) #interviewSourceSelect").selectOption("full", { timeout: 10000 });
    await expectMobileInterviewSetupState(page, { advancedOpen: true, type: "technical", source: "full" });

    delete result.step;
    result.mobileViewport = true;
    result.advancedOpened = true;
    result.technicalTypeSelected = true;
    result.optionCategorySelected = true;
    result.pdfSourceVisible = true;
    result.fullSourceRestored = true;
    result.noHorizontalOverflow = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectMobileInterviewSetupDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function runInterviewAttachmentAnswerFlow(page, baseUrl) {
  const result = { name: "interview attachment upload preview, transcript, and request payload", status: "pass" };
  const timestamp = Date.now();
  const fileName = `browser-smoke-interview-attachment-${timestamp}.png`;
  const answer = `Attachment smoke answer ${timestamp}: I would annotate the payoff diagram, explain edge cases, and validate assumptions.`;
  const imagePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
  const routePattern = "http://127.0.0.1:59991/interview";
  let requestPayload = null;
  const routeHandler = async (route) => {
    requestPayload = readRequestJson(route.request());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        feedback: [
          "得分: 88/100",
          "主要反馈: Attachment evidence received and the reasoning is structured.",
          "缺失要点: Mention risk limits and one more validation case.",
          "下一步: Add one numerical example."
        ].join("\n")
      })
    });
  };

  try {
    result.step = "continue resumed interview";
    await page.waitForSelector("#interviewConsole", { timeout: 10000 });
    await page.locator("#nextInterviewQuestionBtn:not(.hidden):not([disabled])").click({ timeout: 10000 });
    await expectInterviewQuestionReady(page, "Q2/2");

    result.step = "upload attachment preview";
    await page.route(routePattern, routeHandler);
    await page.locator("#interviewAnswerFile").setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: imagePng
    });
    await expectInterviewAttachmentPreview(page, fileName);

    result.step = "submit attachment answer";
    await page.locator("#interviewAnswer").fill(answer);
    await page.locator("#interviewForm").evaluate((form) => form.requestSubmit());
    await expectInterviewAttachmentAnswered(page, { fileName, answer });

    result.step = "verify request payload";
    if (!requestPayload) throw new Error("Interview attachment answer did not call the LLM endpoint.");
    if (requestPayload.task !== "evaluate") throw new Error(`Unexpected interview attachment task: ${requestPayload.task}`);
    if (requestPayload.answer !== answer) throw new Error("Interview attachment request did not include the answer text.");
    const attachment = requestPayload.answerAttachment || {};
    const attachmentUrl = String(attachment.mediaUrl || attachment.dataUrl || attachment.url || "");
    if (attachment.name !== fileName) throw new Error(`Interview attachment payload name mismatch: ${attachment.name}`);
    if (attachment.type !== "image/png") throw new Error(`Interview attachment payload type mismatch: ${attachment.type}`);
    if (!attachmentUrl.startsWith("data:image/png;base64,")) throw new Error("Interview attachment payload did not include the image data URL fallback.");
    const transcriptAttachment = (requestPayload.transcript || []).some((message) => (
      Array.isArray(message.attachments)
      && message.attachments.some((item) => item.name === fileName && item.type === "image/png")
    ));
    if (!transcriptAttachment) throw new Error("Interview attachment transcript summary was not included in the LLM request.");

    delete result.step;
    result.fileName = fileName;
    result.previewRendered = true;
    result.transcriptAttachmentRendered = true;
    result.requestAttachmentSent = true;
    result.completedSession = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectInterviewDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(routePattern, routeHandler).catch(() => {});
  }
  return result;
}

async function runInterviewPdfQuestionSourceFlow(page, baseUrl) {
  const result = { name: "interview PDF source upload generates questions and starts session", status: "pass" };
  const timestamp = Date.now();
  const fileName = `browser-smoke-interview-source-${timestamp}.pdf`;
  const title = `PDF Smoke Delta Hedging ${timestamp}`;
  const prompt = "Use the uploaded PDF notes to explain delta hedging P&L attribution and one production monitoring check.";
  const llmEndpoint = `${baseUrl}/__browser-smoke-pdf-interview`;
  const routePattern = llmEndpoint;
  const pdfBuffer = Buffer.from([
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj",
    "trailer << /Root 1 0 R >>",
    "%%EOF"
  ].join("\n"), "utf8");
  let requestPayload = null;
  let requestCount = 0;
  const routeHandler = async (route) => {
    requestCount += 1;
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization"
        },
        body: ""
      });
      return;
    }
    requestPayload = readRequestJson(route.request());
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
      contentType: "application/json",
      body: JSON.stringify({
        summary: "PDF summary: delta hedging, P&L attribution, and monitoring checks.",
        questions: [
          {
            titleEn: title,
            titleZh: title,
            promptEn: prompt,
            promptZh: prompt,
            answerEn: "Discuss hedge rebalancing, gamma/theta attribution, and alerting on stale greeks.",
            answerZh: "说明再平衡、gamma/theta 归因，以及希腊值过期监控。",
            explanationEn: "A production answer should connect pricing assumptions to monitoring.",
            explanationZh: "生产化回答需要把定价假设和监控连接起来。",
            category: "option",
            difficulty: "Medium",
            tags: ["pdf", "delta-hedging"]
          }
        ]
      })
    });
  };

  try {
    result.step = "return to interview setup";
    await page.goto(`${baseUrl}/interview`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    if (await page.locator("#exitInterviewBtn").isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.locator("#exitInterviewBtn").click({ timeout: 10000 });
    }
    await page.waitForSelector("#interviewSetup:not(.hidden)", { timeout: 10000 });

    result.step = "configure PDF source";
    await page.locator("details.interview-advanced-config summary").click({ timeout: 10000 });
    await page.locator("#interviewQuestionCount").fill("1");
    await page.locator("#interviewSourceSelect").selectOption("pdf");
    await page.locator("#llmEndpointInput").evaluate((input, endpoint) => {
      input.value = endpoint;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, llmEndpoint);
    await expectInterviewPdfSourceReady(page, { endpoint: llmEndpoint });

    result.step = "upload PDF";
    await page.route(routePattern, routeHandler);
    await page.locator("#interviewPdfInput").setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: pdfBuffer
    });
    await expectInterviewPdfMeta(page, fileName);
    await expectInterviewPdfSourceReady(page, { endpoint: llmEndpoint });

    result.step = "complete PDF onboarding";
    await page.locator("#startInterviewBtn").click({ timeout: 10000 });
    await expectInterviewOnboardingStep(page, "focus");
    await clickInterviewAction(page, "focus", "market");
    await expectInterviewOnboardingStep(page, "difficulty");
    await clickInterviewAction(page, "difficulty", "medium");
    await expectInterviewOnboardingStep(page, "scope");
    await page.locator("#interviewAnswer").fill("1");
    await page.locator("#interviewForm").evaluate((form) => form.requestSubmit());
    await expectInterviewOnboardingStep(page, "persona");
    await clickInterviewAction(page, "persona", "neutral");
    await expectInterviewPdfQuestionReady(page, { title, prompt });

    result.step = "verify PDF request payload";
    if (!requestPayload) throw new Error("PDF source did not call the LLM endpoint.");
    if (requestPayload.task !== "generate_pdf_questions") throw new Error(`Unexpected PDF generation task: ${requestPayload.task}`);
    if (requestPayload.count !== 1) throw new Error(`Unexpected PDF generation count: ${requestPayload.count}`);
    if (requestPayload.interviewType !== "technical") throw new Error(`Unexpected PDF generation interview type: ${requestPayload.interviewType}`);
    if (requestPayload.file?.name !== fileName) throw new Error(`PDF request filename mismatch: ${requestPayload.file?.name}`);
    if (!String(requestPayload.file?.dataUrl || "").startsWith("data:application/pdf;base64,")) {
      throw new Error("PDF request did not include an application/pdf data URL.");
    }

    delete result.step;
    result.fileName = fileName;
    result.generatedQuestionTitle = title;
    result.requestCount = requestCount;
    result.requestPdfPayloadSent = true;
    result.generatedQuestionRendered = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectInterviewDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(routePattern, routeHandler).catch(() => {});
  }
  return result;
}

async function clickInterviewAction(page, step, value) {
  await page.locator(`[data-interview-action="${step}"][data-interview-action-value="${value}"]`).click({ timeout: 10000 });
}

async function expectMobileInterviewSetupState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const hasLayout = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const setup = [...document.querySelectorAll("#interviewSetup")]
      .find((node) => !node.classList.contains("hidden") && hasLayout(node));
    const advanced = setup?.querySelector(".interview-advanced-config");
    const type = setup?.querySelector("#interviewTypeSelect");
    const source = setup?.querySelector("#interviewSourceSelect");
    const summary = document.querySelector("#interviewSummary")?.textContent || "";
    const categoryRow = setup?.querySelector("#interviewCategoryRow");
    const pdfRow = setup?.querySelector("#interviewPdfRow");
    const activeCategory = values.category
      ? setup?.querySelector(`[data-interview-category="${values.category}"].active`)
      : null;
    const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const advancedOk = values.advancedOpen === undefined || Boolean(advanced?.open) === values.advancedOpen;
    const typeOk = !values.type || type?.value === values.type;
    const sourceOk = !values.source || source?.value === values.source;
    const categoryOk = !values.category || Boolean(activeCategory);
    const pdfOk = values.source !== "pdf" || (
      hasLayout(pdfRow)
      && !hasLayout(categoryRow)
      && /PDF 题源|PDF source/i.test(summary)
    );
    const fullOk = values.source !== "full" || (
      hasLayout(categoryRow)
      && /题库抽题|Question bank/i.test(summary)
    );
    return window.innerWidth <= 430
      && overflow <= 4
      && setup
      && hasLayout(advanced)
      && hasLayout(type)
      && hasLayout(source)
      && advancedOk
      && typeOk
      && sourceOk
      && categoryOk
      && pdfOk
      && fullOk;
  }, expected, { timeout: 10000 });
}

async function expectInterviewOnboardingStep(page, step) {
  await page.waitForFunction((value) => {
    const consoleNode = document.querySelector("#interviewConsole");
    const setup = document.querySelector("#interviewSetup");
    const action = document.querySelector(`[data-interview-action="${value}"]`);
    const title = document.querySelector("#interviewSessionTitle")?.textContent || "";
    return consoleNode
      && setup?.classList.contains("hidden")
      && action
      && /AI 面试官配置|AI interviewer setup/i.test(title);
  }, step, { timeout: 12000 });
}

async function expectInterviewQuestionReady(page, statusText) {
  await page.waitForFunction((expectedStatus) => {
    const status = document.querySelector("#interviewQuestionStatus")?.textContent?.trim() || "";
    const title = document.querySelector("#interviewSessionTitle")?.textContent || "";
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    const answer = document.querySelector("#interviewAnswer");
    const hint = document.querySelector("#hintInterviewBtn");
    const reveal = document.querySelector("#revealAnswerBtn");
    const panel = document.querySelector("#toggleInterviewPanelBtn");
    return status === expectedStatus
      && /Practice|训练练习/.test(title)
      && transcript.includes("第 1 题")
      && answer && !answer.disabled
      && hint && !hint.classList.contains("hidden")
      && reveal && !reveal.classList.contains("hidden")
      && panel && !panel.classList.contains("hidden");
  }, statusText, { timeout: 18000 });
}

async function expectInterviewHint(page, baselineLength) {
  await page.waitForFunction((lengthBefore) => {
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    return transcript.length > lengthBefore + 5
      && /提示|hint|思路|clarify|edge/i.test(transcript);
  }, baselineLength, { timeout: 15000 });
}

async function expectInterviewReference(page) {
  await page.waitForFunction(() => {
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    return /参考答案|Reference answer|解析|Explanation/.test(transcript);
  }, null, { timeout: 10000 });
}

async function expectInterviewAnswered(page) {
  await page.waitForFunction(() => {
    const answer = document.querySelector("#interviewAnswer")?.value || "";
    const completeActions = document.querySelector("#interviewCompleteActions");
    const save = document.querySelector("#saveInterviewFavoriteBtn");
    const next = document.querySelector("#nextInterviewQuestionBtn");
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    let latestEntryOk = false;
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      latestEntryOk = Array.isArray(state.entries)
        && state.entries.some((entry) => String(entry.text || "").includes("模拟面试") && Number(entry.totalXp || 0) > 0);
    } catch {
      latestEntryOk = false;
    }
    return answer === ""
      && completeActions && !completeActions.classList.contains("hidden")
      && save && !save.classList.contains("hidden") && !save.disabled
      && next && !next.classList.contains("hidden") && !next.disabled
      && /得分|score|\/100|正确性|主要反馈|缺失要点|feedback|correctness|missing/i.test(transcript)
      && latestEntryOk;
  }, null, { timeout: 18000 });
}

async function expectInterviewAttachmentPreview(page, fileName) {
  await page.waitForFunction((name) => {
    const preview = document.querySelector("#interviewAttachmentPreview");
    const chip = preview?.querySelector(".interview-attachment-chip");
    return preview
      && !preview.classList.contains("hidden")
      && chip
      && chip.textContent.includes(name);
  }, fileName, { timeout: 10000 });
}

async function expectInterviewAttachmentAnswered(page, expected) {
  await page.waitForFunction(({ fileName, answer }) => {
    const answerInput = document.querySelector("#interviewAnswer");
    const preview = document.querySelector("#interviewAttachmentPreview");
    const latestUserMessage = [...document.querySelectorAll("#interviewTranscript .message.user")].at(-1);
    const attachmentLabel = latestUserMessage?.querySelector(".message-attachment span")?.textContent || "";
    const attachmentImage = latestUserMessage?.querySelector(".message-attachment img.rich-media");
    const completeActions = document.querySelector("#interviewCompleteActions");
    const restart = document.querySelector("#restartInterviewBtn");
    const exportReport = document.querySelector("#exportInterviewReportBtn");
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    return answerInput?.value === ""
      && (!preview || preview.classList.contains("hidden"))
      && latestUserMessage
      && latestUserMessage.textContent.includes(answer)
      && latestUserMessage.textContent.includes(fileName)
      && attachmentLabel.includes(fileName)
      && attachmentImage?.getAttribute("src")?.startsWith("data:image/png;base64,")
      && completeActions && !completeActions.classList.contains("hidden")
      && restart && !restart.classList.contains("hidden")
      && exportReport && !exportReport.classList.contains("hidden")
      && /Attachment evidence received|主要反馈|得分|score/i.test(transcript);
  }, expected, { timeout: 18000 });
}

async function expectInterviewPdfSourceReady(page, expected = {}) {
  await page.waitForFunction(({ endpoint }) => {
    const source = document.querySelector("#interviewSourceSelect");
    const pdfRow = document.querySelector("#interviewPdfRow");
    const categoryRow = document.querySelector("#interviewCategoryRow");
    const llmEndpoint = document.querySelector("#llmEndpointInput")?.value || "";
    const summary = document.querySelector("#interviewSummary")?.textContent || "";
    return source?.value === "pdf"
      && pdfRow && !pdfRow.classList.contains("hidden")
      && categoryRow?.classList.contains("hidden")
      && llmEndpoint === endpoint
      && /PDF 题源|PDF source/.test(summary);
  }, expected, { timeout: 10000 });
}

async function expectInterviewPdfMeta(page, fileName) {
  await page.waitForFunction((name) => {
    const meta = document.querySelector("#interviewPdfMeta")?.textContent || "";
    return meta.includes(name) && /1 KB|0 KB|2 KB/.test(meta);
  }, fileName, { timeout: 10000 });
}

async function expectInterviewPdfQuestionReady(page, expected) {
  try {
    await page.waitForFunction(({ title, prompt }) => {
      const status = document.querySelector("#interviewQuestionStatus")?.textContent?.trim() || "";
      const titleNode = document.querySelector("#interviewSessionTitle")?.textContent || "";
      const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
      const panel = document.querySelector("#interviewQuestionPanel")?.textContent || "";
      const answer = document.querySelector("#interviewAnswer");
      let storedProblemOk = false;
      try {
        const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
        const problems = Array.isArray(state.problems) ? state.problems : [];
        storedProblemOk = problems.some((problem) => (
          String(problem.titleEn || problem.titleZh || "").includes(title)
          && problem.source === "pdf-interview"
        ));
      } catch {
        storedProblemOk = false;
      }
      return status === "Q1/1"
        && /Practice|训练练习/.test(titleNode)
        && transcript.includes("PDF summary: delta hedging")
        && transcript.includes(title)
        && transcript.includes(prompt)
        && panel.includes(title)
        && answer && !answer.disabled
        && storedProblemOk;
    }, expected, { timeout: 22000 });
  } catch (error) {
    const readiness = await page.evaluate(({ title, prompt }) => {
      const status = document.querySelector("#interviewQuestionStatus")?.textContent?.trim() || "";
      const titleNode = document.querySelector("#interviewSessionTitle")?.textContent || "";
      const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
      const panel = document.querySelector("#interviewQuestionPanel")?.textContent || "";
      const answer = document.querySelector("#interviewAnswer");
      let problemCount = 0;
      let matchingProblem = null;
      let storedProblemOk = false;
      try {
        const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
        const problems = Array.isArray(state.problems) ? state.problems : [];
        problemCount = problems.length;
        matchingProblem = problems.find((problem) => String(problem.titleEn || problem.titleZh || "").includes(title)) || null;
        storedProblemOk = Boolean(matchingProblem && matchingProblem.source === "pdf-interview");
      } catch {
        storedProblemOk = false;
      }
      return {
        status,
        titleOk: /Practice|训练练习/.test(titleNode),
        transcriptHasSummary: transcript.includes("PDF summary: delta hedging"),
        transcriptHasTitle: transcript.includes(title),
        transcriptHasPrompt: transcript.includes(prompt),
        panelHasTitle: panel.includes(title),
        answerExists: Boolean(answer),
        answerDisabled: Boolean(answer?.disabled),
        problemCount,
        matchingProblem: matchingProblem ? {
          id: matchingProblem.id,
          source: matchingProblem.source,
          title: matchingProblem.titleEn || matchingProblem.titleZh || ""
        } : null,
        storedProblemOk
      };
    }, expected).catch((diagnosticError) => ({ error: diagnosticError?.message || String(diagnosticError) }));
    throw new Error(`PDF generated question readiness did not pass: ${JSON.stringify(readiness)}; ${error.message}`);
  }
}

async function expectStoredInterviewFavorite(page) {
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const favorites = Array.isArray(state.interviewFavorites) ? state.interviewFavorites : [];
      const favoriteVisible = (document.querySelector("#interviewFavoritesList")?.textContent || "").trim().length > 0;
      return favoriteVisible
        && favorites.length > 0
        && favorites.some((item) => item.title || item.summary);
    } catch {
      return false;
    }
  }, null, { timeout: 10000 });
}

async function expectInterviewSetupWithResume(page) {
  await page.waitForFunction(() => {
    const setup = document.querySelector("#interviewSetup");
    const consoleNode = document.querySelector("#interviewConsole");
    const resume = document.querySelector("#resumeInterviewBtn");
    return setup && !setup.classList.contains("hidden")
      && !consoleNode
      && resume && !resume.classList.contains("hidden");
  }, null, { timeout: 10000 });
}

async function expectDurableInterview(page, expected) {
  await page.waitForFunction(({ exists }) => {
    const keys = Object.keys(localStorage).filter((key) => /interview/i.test(key));
    const hasSnapshot = keys.some((key) => {
      const value = localStorage.getItem(key) || "";
      return value.includes("\"session\"") && value.includes("\"questions\"");
    });
    return exists ? hasSnapshot : !hasSnapshot;
  }, expected, { timeout: 10000 });
}

async function expectInterviewResumed(page) {
  await page.waitForFunction(() => {
    const consoleNode = document.querySelector("#interviewConsole");
    const setup = document.querySelector("#interviewSetup");
    const status = document.querySelector("#interviewQuestionStatus")?.textContent || "";
    const completeActions = document.querySelector("#interviewCompleteActions");
    const next = document.querySelector("#nextInterviewQuestionBtn");
    const transcript = document.querySelector("#interviewTranscript")?.textContent || "";
    return consoleNode
      && setup?.classList.contains("hidden")
      && /Q1\/2|收尾|Ready for the next/i.test(status)
      && completeActions && !completeActions.classList.contains("hidden")
      && next && !next.classList.contains("hidden") && !next.disabled
      && transcript.includes("第 1 题");
  }, null, { timeout: 12000 });
}

async function collectInterviewDiagnostics(page) {
  return await page.evaluate(() => {
    const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || "";
    const getVisible = (selector) => {
      const node = document.querySelector(selector);
      return Boolean(node && !node.classList.contains("hidden"));
    };
    const getDisabled = (selector) => Boolean(document.querySelector(selector)?.disabled);
    let stored = {};
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const entries = Array.isArray(state.entries) ? state.entries : [];
      const favorites = Array.isArray(state.interviewFavorites) ? state.interviewFavorites : [];
      const problems = Array.isArray(state.problems) ? state.problems : [];
      const pdfProblems = problems.filter((problem) => problem?.source === "pdf-interview");
      stored = {
        problemsCount: problems.length,
        pdfProblemsCount: pdfProblems.length,
        latestPdfProblem: pdfProblems.at(-1) ? {
          id: pdfProblems.at(-1).id,
          title: pdfProblems.at(-1).titleEn || pdfProblems.at(-1).titleZh || "",
          source: pdfProblems.at(-1).source
        } : null,
        entriesCount: entries.length,
        latestEntry: entries.at(-1) || null,
        interviewEntries: entries.filter((entry) => String(entry.text || "").includes("模拟面试")).slice(-3),
        favoritesCount: favorites.length,
        latestFavorite: favorites.at(-1) || null
      };
    } catch (error) {
      stored = { error: error?.message || String(error) };
    }
    return {
      path: window.location.pathname,
      title: getText("#interviewSessionTitle"),
      status: getText("#interviewQuestionStatus"),
      answerValue: document.querySelector("#interviewAnswer")?.value || "",
      answerDisabled: getDisabled("#interviewAnswer"),
      panelText: getText("#interviewQuestionPanel").slice(0, 500),
      completeActionsVisible: getVisible("#interviewCompleteActions"),
      saveVisible: getVisible("#saveInterviewFavoriteBtn"),
      saveDisabled: getDisabled("#saveInterviewFavoriteBtn"),
      nextVisible: getVisible("#nextInterviewQuestionBtn"),
      nextDisabled: getDisabled("#nextInterviewQuestionBtn"),
      transcriptLength: getText("#interviewTranscript").length,
      transcriptTail: getText("#interviewTranscript").slice(-700),
      stored
    };
  });
}

async function collectMobileInterviewSetupDiagnostics(page) {
  return page.evaluate(() => {
    const hasLayout = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const setup = [...document.querySelectorAll("#interviewSetup")]
      .find((node) => !node.classList.contains("hidden") && hasLayout(node));
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      setupCount: document.querySelectorAll("#interviewSetup").length,
      typeSelectCount: document.querySelectorAll("#interviewTypeSelect").length,
      sourceSelectCount: document.querySelectorAll("#interviewSourceSelect").length,
      setupFound: Boolean(setup),
      setupHidden: setup?.classList.contains("hidden"),
      advancedOpen: Boolean(setup?.querySelector(".interview-advanced-config")?.open),
      typeValue: setup?.querySelector("#interviewTypeSelect")?.value || "",
      sourceValue: setup?.querySelector("#interviewSourceSelect")?.value || "",
      summary: document.querySelector("#interviewSummary")?.textContent?.replace(/\s+/g, " ").trim() || "",
      pdfRowHidden: setup?.querySelector("#interviewPdfRow")?.classList.contains("hidden"),
      categoryRowHidden: setup?.querySelector("#interviewCategoryRow")?.classList.contains("hidden"),
      activeCategories: [...setup?.querySelectorAll("#interviewCategoryPicker .interview-category-chip.active") || []]
        .map((chip) => ({
          key: chip.getAttribute("data-interview-category") || "",
          text: chip.textContent?.replace(/\s+/g, " ").trim() || ""
        })),
      categoryKeys: [...setup?.querySelectorAll("#interviewCategoryPicker .interview-category-chip") || []]
        .map((chip) => chip.getAttribute("data-interview-category") || "")
        .filter(Boolean)
    };
  });
}

async function runTodoDockFlow(page, baseUrl) {
  const result = { name: "todo dock opens and adds a task", status: "pass" };
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.locator("#todoDockButton").click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const panel = document.querySelector("#todoDockPanel");
      return panel && !panel.classList.contains("hidden");
    }, null, { timeout: 10000 });
    const taskTitle = `Browser smoke task ${Date.now()}`;
    await page.locator("#todoDockAddInput").fill(taskTitle);
    await page.locator("#todoDockAddInput").press("Enter");
    await page.waitForFunction((title) => {
      return [...document.querySelectorAll("#todoDockList input")]
        .some((input) => input.value === title);
    }, taskTitle, { timeout: 10000 });
    result.taskAdded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runTodoDockLifecycleFlow(page, baseUrl) {
  const result = { name: "todo dock edit, complete, delete, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const initialTitle = `Todo lifecycle smoke ${timestamp}`;
  const editedTitle = `Edited todo lifecycle smoke ${timestamp}`;
  const detail = `Review one probability note and record follow-up ${timestamp}`;
  try {
    result.step = "open overview and reset todo state";
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await resetTodoDockState(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await ensureTodoDockOpen(page);

    result.step = "add todo task";
    await page.locator("#todoDockAddInput").fill(initialTitle);
    await page.locator("#todoDockAddInput").press("Enter");
    await expectTodoDockTask(page, { title: initialTitle, done: false, deleted: false });
    let taskId = await getTodoDockTaskIdByTitle(page, initialTitle);
    if (!taskId) throw new Error("Added Todo dock task did not expose data-todo-id.");

    result.step = "edit todo task";
    await page.locator(`[data-todo-id="${taskId}"][data-todo-field="title"]`).fill(editedTitle);
    await page.locator(`[data-todo-id="${taskId}"][data-todo-field="detail"]`).fill(detail);
    await expectTodoDockTask(page, { taskId, title: editedTitle, detail, done: false, deleted: false });
    await expectStoredTodoTask(page, { taskId, title: editedTitle, detail, done: false, deleted: false });

    result.step = "complete todo task";
    await page.locator(`[data-todo-toggle="${taskId}"]`).click({ timeout: 10000 });
    await expectTodoDockTask(page, { taskId, title: editedTitle, detail, done: true, deleted: false, pendingCount: "0" });
    await expectStoredTodoTask(page, { taskId, title: editedTitle, detail, done: true, deleted: false });

    result.step = "close and reopen todo dock";
    await page.locator("#todoDockCloseBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("#todoDockPanel")?.classList.contains("hidden"), null, { timeout: 10000 });
    await ensureTodoDockOpen(page);
    await expectTodoDockTask(page, { taskId, title: editedTitle, detail, done: true, deleted: false, pendingCount: "0" });

    result.step = "reload completed todo task";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await ensureTodoDockOpen(page);
    await expectTodoDockTask(page, { taskId, title: editedTitle, detail, done: true, deleted: false, pendingCount: "0" });
    await expectStoredTodoTask(page, { taskId, title: editedTitle, detail, done: true, deleted: false });

    result.step = "delete todo task";
    await page.locator(`[data-todo-delete="${taskId}"]`).click({ timeout: 10000 });
    await expectTodoDockTask(page, { taskId, title: editedTitle, deleted: true, emptyVisible: true, pendingCount: "0" });
    await expectStoredTodoTask(page, { taskId, title: editedTitle, deleted: true });

    result.step = "reload deleted todo task";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await ensureTodoDockOpen(page);
    await expectTodoDockTask(page, { taskId, title: editedTitle, deleted: true, emptyVisible: true, pendingCount: "0" });
    await expectStoredTodoTask(page, { taskId, title: editedTitle, deleted: true });

    delete result.step;
    result.taskId = taskId;
    result.edited = true;
    result.completed = true;
    result.reopened = true;
    result.reloaded = true;
    result.deleted = true;
    result.deletePersisted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function resetTodoDockState(page) {
  await page.evaluate(() => {
    const key = "quantMemoryBoard.userState.v1.local:browser-route-smoke";
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      state = {};
    }
    delete state.prepPlan;
    delete state.studyPlan;
    localStorage.setItem(key, JSON.stringify(state));
  });
}

async function getTodoDockTaskIdByTitle(page, title) {
  return page.evaluate((expectedTitle) => {
    const input = [...document.querySelectorAll("#todoDockList [data-todo-field='title']")]
      .find((node) => node.value === expectedTitle);
    return input?.dataset.todoId || "";
  }, title);
}

async function expectTodoDockTask(page, expected) {
  await page.waitForFunction((values) => {
    const rows = [...document.querySelectorAll("#todoDockList .todo-task")];
    const row = values.taskId
      ? rows.find((node) => node.dataset.todoId === values.taskId)
      : rows.find((node) => [...node.querySelectorAll("[data-todo-field='title']")].some((input) => input.value === values.title));
    const empty = document.querySelector("#todoDockEmpty");
    const count = document.querySelector("#todoDockCount")?.textContent?.trim() || "";
    if (values.deleted) {
      const absent = !row && !rows.some((node) => node.textContent?.includes(values.title));
      const emptyMatches = !values.emptyVisible || (empty && !empty.classList.contains("hidden"));
      const countMatches = values.pendingCount === undefined || count === String(values.pendingCount);
      return absent && emptyMatches && countMatches;
    }
    if (!row) return false;
    const titleInput = row.querySelector("[data-todo-field='title']");
    const detailInput = row.querySelector("[data-todo-field='detail']");
    const doneMatches = typeof values.done === "boolean" ? row.classList.contains("done") === values.done : true;
    const detailMatches = values.detail === undefined || detailInput?.value === values.detail;
    const countMatches = values.pendingCount === undefined || count === String(values.pendingCount);
    const deleteButtonPresent = Boolean(row.querySelector("[data-todo-delete]"));
    return titleInput?.value === values.title
      && detailMatches
      && doneMatches
      && countMatches
      && deleteButtonPresent;
  }, expected, { timeout: 10000 });
}

async function expectStoredTodoTask(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const prepTasks = Array.isArray(state.prepPlan?.customTasks) ? state.prepPlan.customTasks : [];
      const studyTasks = Array.isArray(state.studyPlan?.items) ? state.studyPlan.items : [];
      const task = [...prepTasks, ...studyTasks].find((item) => item.id === values.taskId || item.title === values.title);
      if (values.deleted) return !task;
      return task
        && task.title === values.title
        && (values.detail === undefined || task.detail === values.detail)
        && (typeof values.done !== "boolean" || Boolean(task.done || state.prepPlan?.completedTasks?.[`${new Date().toISOString().slice(0, 10)}:${task.id}`]) === values.done);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runCommunityPostFlow(page, baseUrl) {
  const result = { name: "community post, like, comment, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const postText = `Browser smoke community post ${timestamp}`;
  const commentText = `Browser smoke comment ${timestamp}`;
  try {
    await page.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityForm", { timeout: 10000 });

    await page.locator("#communityText").fill(postText);
    await page.locator("#communityForm button[type='submit']").click({ timeout: 10000 });
    const card = page.locator(".community-card", { hasText: postText }).first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("#communityText")?.value === "", null, { timeout: 10000 });

    const likeButton = card.locator(".community-actions button").filter({ hasText: /赞|Like|like/i }).first();
    await likeButton.click({ timeout: 10000 });
    await page.waitForFunction((text) => {
      const cardNode = [...document.querySelectorAll(".community-card")]
        .find((node) => node.textContent.includes(text));
      return /已赞|取消赞|Liked|Unlike/i.test(cardNode?.textContent || "") && /-\s*1/.test(cardNode?.textContent || "");
    }, postText, { timeout: 10000 });

    await card.locator(".community-comment-form input").fill(commentText);
    await card.locator(".community-comment-form").evaluate((form) => form.requestSubmit());
    await page.waitForFunction((text) => {
      const cardNode = [...document.querySelectorAll(".community-card")]
        .find((node) => node.textContent.includes(text));
      return cardNode?.textContent.includes(text);
    }, commentText, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    await page.waitForFunction(({ postText: savedPost, commentText: savedComment }) => {
      const cardNode = [...document.querySelectorAll(".community-card")]
        .find((node) => node.textContent.includes(savedPost));
      const text = cardNode?.textContent || "";
      return text.includes(savedComment) && /已赞|取消赞|Liked|Unlike/i.test(text) && /-\s*1/.test(text);
    }, { postText, commentText }, { timeout: 10000 });

    result.postText = postText;
    result.commentText = commentText;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runCommunityMediaPostFlow(page, baseUrl) {
  const result = { name: "community image post fallback and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const postText = `Browser smoke community image post ${timestamp}`;
  const fileName = `browser-smoke-community-${timestamp}.png`;
  const imagePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
  try {
    await page.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityForm", { timeout: 10000 });

    await page.locator("#communityMedia").setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: imagePng
    });
    await page.waitForFunction((name) => {
      const preview = document.querySelector("#communityMediaPreview");
      const image = preview?.querySelector("img");
      return preview && !preview.classList.contains("hidden")
        && image?.getAttribute("src")?.startsWith("data:image/png;base64,")
        && image?.getAttribute("alt") === name;
    }, fileName, { timeout: 10000 });

    const previewSrc = await page.locator("#communityMediaPreview img").getAttribute("src");
    await page.locator("#communityText").fill(postText);
    await page.locator("#communityForm").evaluate((form) => form.requestSubmit());
    await expectCommunityMediaPost(page, { postText, fileName, dataUrl: previewSrc, mediaType: "image" });
    await page.waitForFunction(() => {
      const preview = document.querySelector("#communityMediaPreview");
      return document.querySelector("#communityText")?.value === ""
        && preview?.classList.contains("hidden");
    }, null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    await expectCommunityMediaPost(page, { postText, fileName, dataUrl: previewSrc, mediaType: "image" });

    result.postText = postText;
    result.fileName = fileName;
    result.dataUrlFallback = previewSrc?.startsWith("data:image/png;base64,") || false;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runCommunityVideoPostFlow(page, baseUrl) {
  const result = { name: "community video post fallback and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const postText = `Browser smoke community video post ${timestamp}`;
  const fileName = `browser-smoke-community-${timestamp}.webm`;
  const videoWebm = Buffer.from("GkXfo59ChoEBQveBAULygQRC84EIQoKIbWF0cm9za2FCh4EEQlRCh4ECQoWBAhhTgGcBAAAAAAAAABZUrmsBAAAAAAAAGFOAZwEAAAAAAAAB", "base64");
  try {
    await page.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityForm", { timeout: 10000 });

    await page.locator("#communityMedia").setInputFiles({
      name: fileName,
      mimeType: "video/webm",
      buffer: videoWebm
    });
    await page.waitForFunction(() => {
      const preview = document.querySelector("#communityMediaPreview");
      const video = preview?.querySelector("video");
      return preview && !preview.classList.contains("hidden")
        && video?.getAttribute("src")?.startsWith("data:video/webm;base64,")
        && video?.hasAttribute("controls");
    }, null, { timeout: 10000 });

    const previewSrc = await page.locator("#communityMediaPreview video").getAttribute("src");
    await page.locator("#communityText").fill(postText);
    await page.locator("#communityForm").evaluate((form) => form.requestSubmit());
    await expectCommunityMediaPost(page, { postText, fileName, dataUrl: previewSrc, mediaType: "video" });
    await page.waitForFunction(() => {
      const preview = document.querySelector("#communityMediaPreview");
      return document.querySelector("#communityText")?.value === ""
        && preview?.classList.contains("hidden");
    }, null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    await expectCommunityMediaPost(page, { postText, fileName, dataUrl: previewSrc, mediaType: "video" });

    result.postText = postText;
    result.fileName = fileName;
    result.dataUrlFallback = previewSrc?.startsWith("data:video/webm;base64,") || false;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectCommunityMediaPost(page, expected) {
  await page.waitForFunction(({ postText, fileName, dataUrl, mediaType }) => {
    try {
      const card = [...document.querySelectorAll(".community-card")]
        .find((node) => node.textContent.includes(postText));
      if (!card) return false;
      const selector = mediaType === "video" ? ".community-media video" : ".community-media img";
      const media = card.querySelector(selector);
      if (media?.getAttribute("src") !== dataUrl) return false;
      if (mediaType !== "video" && media?.getAttribute("alt") !== fileName) return false;
      if (mediaType === "video" && !media?.hasAttribute("controls")) return false;
      const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
      const post = Array.isArray(community.posts)
        ? community.posts.find((item) => item.text === postText)
        : null;
      return post
        && post.media?.dataUrl === dataUrl
        && post.media?.url === dataUrl
        && post.media?.type === mediaType
        && post.media?.name === fileName
        && Boolean(post.createdAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runCommunityDirectMessageFromPostFlow(page, baseUrl) {
  const result = { name: "community direct message from post opens messages thread", status: "pass" };
  const timestamp = Date.now();
  const authorId = `mentor:community-dm-${timestamp}`;
  const authorName = `Community Mentor ${timestamp}`;
  const postText = `Browser smoke mentor community post ${timestamp}`;
  const replyText = `Community DM reply ${timestamp}`;
  const introText = `${authorName} 你好，我在论坛看到你的动态，想继续交流一下。`;
  const threadId = `thread-local:browser-route-smoke-${authorId}`;

  try {
    await page.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    await page.evaluate(({ authorId, authorName, postText }) => {
      const now = new Date().toISOString();
      localStorage.setItem("quantMemoryBoard.community.v1", JSON.stringify({
        posts: [{
          id: `post:${authorId}`,
          kind: "update",
          authorId,
          authorName,
          authorAvatar: "",
          country: "unitedStates",
          region: "California",
          text: postText,
          media: null,
          likes: [],
          comments: [],
          createdAt: now
        }],
        threads: []
      }));
    }, { authorId, authorName, postText });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    const card = page.locator(".community-card", { hasText: postText }).first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    await card.locator("button", { hasText: /私信|Message/i }).click({ timeout: 10000 });

    await page.waitForFunction(() => window.location.pathname === "/messages", null, { timeout: 10000 });
    await expectCommunityDirectMessageThread(page, {
      authorName,
      introText,
      replyText: "",
      threadId,
      unreadCleared: true
    });

    await page.locator("#messageComposerInput").fill(replyText);
    await page.locator("#messageComposerForm").evaluate((form) => form.requestSubmit());
    await expectCommunityDirectMessageThread(page, {
      authorName,
      introText,
      replyText,
      threadId,
      unreadCleared: true
    });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#messageThreadList", { timeout: 10000 });
    await expectCommunityDirectMessageThread(page, {
      authorName,
      introText,
      replyText,
      threadId,
      unreadCleared: true
    });

    result.authorName = authorName;
    result.threadId = threadId;
    result.openedMessages = true;
    result.threadPersisted = true;
    result.replyPersisted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectCommunityDirectMessageThread(page, expected) {
  await page.waitForFunction(({ authorName, introText, replyText, threadId, unreadCleared }) => {
    try {
      const headerText = document.querySelector("#messageConversationHeader")?.textContent || "";
      const bodyText = document.querySelector("#messageConversationBody")?.textContent || "";
      const thread = [...document.querySelectorAll(".message-thread-item")]
        .find((node) => node.textContent.includes(authorName));
      const threadText = thread?.textContent || "";
      const threadSelected = thread?.classList.contains("active") || thread?.getAttribute("aria-pressed") === "true";
      const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
      const storedThread = Array.isArray(community.threads)
        ? community.threads.find((item) => item.id === threadId)
        : null;
      const storedMessages = Array.isArray(storedThread?.messages) ? storedThread.messages : [];
      return headerText.includes(authorName)
        && bodyText.includes(introText)
        && (!replyText || bodyText.includes(replyText))
        && threadText.includes(replyText || introText)
        && threadSelected
        && (!unreadCleared || !thread?.querySelector("b"))
        && storedThread
        && storedThread.participants?.some((item) => item.id === "local:browser-route-smoke")
        && storedThread.participants?.some((item) => item.name === authorName)
        && storedMessages.some((message) => message.text === introText)
        && (!replyText || storedMessages.some((message) => message.text === replyText));
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runMobileCommunityMessagesFlow(page, baseUrl) {
  const result = { name: "mobile community posting and messages controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const timestamp = Date.now();
  const currentUserId = "local:browser-route-smoke";
  const mentorId = `mentor:mobile-social-${timestamp}`;
  const mentorName = `Mobile Social Mentor ${timestamp}`;
  const mentorPostText = `Mobile social mentor post ${timestamp}`;
  const selfPostText = `Mobile community post ${timestamp}`;
  const commentText = `Mobile community comment ${timestamp}`;
  const replyText = `Mobile message reply ${timestamp}`;
  const introText = `${mentorName} 你好，我在论坛看到你的动态，想继续交流一下。`;
  const threadId = `thread-${currentUserId}-${mentorId}`;

  try {
    result.step = "seed mobile community";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityForm", { timeout: 10000 });
    await page.evaluate(({ mentorId, mentorName, mentorPostText }) => {
      const now = new Date().toISOString();
      localStorage.setItem("quantMemoryBoard.community.v1", JSON.stringify({
        posts: [{
          id: `post:${mentorId}`,
          kind: "update",
          authorId: mentorId,
          authorName: mentorName,
          authorAvatar: "",
          country: "unitedStates",
          region: "New York",
          text: mentorPostText,
          media: null,
          likes: [],
          comments: [],
          createdAt: now
        }],
        threads: []
      }));
    }, { mentorId, mentorName, mentorPostText });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#communityList", { timeout: 10000 });
    await expectMobileSocialState(page, { section: "community", minCards: 1 });

    result.step = "post, like, and comment from mobile community";
    await page.locator("#communityText").fill(selfPostText);
    await page.locator("#communityForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction((text) => {
      const card = [...document.querySelectorAll(".community-card")]
        .find((node) => node.textContent.includes(text));
      return card && document.querySelector("#communityText")?.value === "";
    }, selfPostText, { timeout: 10000 });
    await expectMobileSocialState(page, { section: "community", minCards: 2 });

    const selfCard = page.locator(".community-card", { hasText: selfPostText }).first();
    await selfCard.locator(".community-actions button").filter({ hasText: /赞|Like|like/i }).first().click({ timeout: 10000 });
    await selfCard.locator(".community-comment-form input").fill(commentText);
    await selfCard.locator(".community-comment-form").evaluate((form) => form.requestSubmit());
    await page.waitForFunction(({ selfPostText, commentText, currentUserId }) => {
      try {
        const card = [...document.querySelectorAll(".community-card")]
          .find((node) => node.textContent.includes(selfPostText));
        const cardText = card?.textContent || "";
        const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
        const storedPost = Array.isArray(community.posts)
          ? community.posts.find((item) => item.text === selfPostText)
          : null;
        return cardText.includes(commentText)
          && /已赞|取消赞|Liked|Unlike/i.test(cardText)
          && /-\s*1/.test(cardText)
          && storedPost?.likes?.includes(currentUserId)
          && storedPost?.comments?.some((comment) => comment.text === commentText);
      } catch {
        return false;
      }
    }, { selfPostText, commentText, currentUserId }, { timeout: 10000 });
    await expectMobileSocialState(page, { section: "community", minCards: 2 });

    result.step = "open mobile direct message";
    const mentorCard = page.locator(".community-card", { hasText: mentorPostText }).first();
    await mentorCard.waitFor({ state: "visible", timeout: 10000 });
    await mentorCard.locator("button", { hasText: /私信|Message/i }).click({ timeout: 10000 });
    await page.waitForURL(/\/messages$/, { timeout: 10000 });
    await expectMobileSocialState(page, { section: "messages", minThreads: 1 });
    await expectCommunityDirectMessageThread(page, {
      authorName: mentorName,
      introText,
      replyText: "",
      threadId,
      unreadCleared: true
    });

    result.step = "reply and reload mobile messages";
    await page.locator("#messageComposerInput").fill(replyText);
    await page.locator("#messageComposerForm").evaluate((form) => form.requestSubmit());
    await expectCommunityDirectMessageThread(page, {
      authorName: mentorName,
      introText,
      replyText,
      threadId,
      unreadCleared: true
    });
    await expectMobileSocialState(page, { section: "messages", minThreads: 1 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#messageThreadList", { timeout: 10000 });
    await expectCommunityDirectMessageThread(page, {
      authorName: mentorName,
      introText,
      replyText,
      threadId,
      unreadCleared: true
    });
    await expectMobileSocialState(page, { section: "messages", minThreads: 1 });

    delete result.step;
    result.mobileViewport = true;
    result.communityComposerUsable = true;
    result.postLikeCommentPersisted = true;
    result.directMessageNavigated = true;
    result.messageReplyPersisted = true;
    result.messageReloadPersisted = true;
    result.noHorizontalOverflow = true;
    result.threadId = threadId;
    result.finalPath = new URL(page.url()).pathname;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileSocialDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectMobileSocialState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const rectFor = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    };
    const visible = (node) => {
      const rect = rectFor(node);
      if (!rect) return false;
      const style = window.getComputedStyle(node);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4;
    };
    const overflow = Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.documentElement.clientWidth
    );
    if (window.innerWidth > 430 || overflow > 4) return false;

    if (values.section === "community") {
      const controls = [
        "#communitySummary",
        "#communityForm",
        "#communityText",
        ".community-compose-actions .file-button",
        ".community-compose-actions .primary-button",
        '[data-community-filter="all"]',
        '[data-community-filter="experience"]',
        "#communityList"
      ].map((selector) => document.querySelector(selector));
      const cards = [...document.querySelectorAll("#communityList .community-card")];
      return controls.every(visible)
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 3)).every(visible)
        && cards.slice(0, Math.min(cards.length, 3)).every((card) => (
          visible(card.querySelector(".community-actions"))
          && visible(card.querySelector(".community-comment-form"))
        ));
    }

    if (values.section === "messages") {
      const controls = [
        "#messagesPageTitle",
        "#messagesSummary",
        "#messageThreadList",
        ".message-thread-item",
        "#messageConversationHeader",
        "#messageConversationBody",
        "#messageComposerForm",
        "#messageComposerInput",
        "#messageComposerForm button[type='submit']"
      ].map((selector) => document.querySelector(selector));
      const threads = [...document.querySelectorAll("#messageThreadList .message-thread-item")];
      return controls.every(visible)
        && threads.length >= values.minThreads
        && threads.slice(0, Math.min(threads.length, 3)).every(visible);
    }

    return false;
  }, expected, { timeout: 10000 });
}

async function collectMobileSocialDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 160)
      };
    };
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth
      ),
      communityForm: rectFor("#communityForm"),
      communityActions: rectFor(".community-compose-actions"),
      communityFirstCard: rectFor("#communityList .community-card"),
      messageLayout: rectFor(".messages-layout"),
      messageThreadList: rectFor("#messageThreadList"),
      messageFirstThread: rectFor("#messageThreadList .message-thread-item"),
      messageConversation: rectFor(".message-conversation"),
      messageComposer: rectFor("#messageComposerForm")
    };
  });
}

async function runMessagesThreadFlow(page, baseUrl) {
  const result = { name: "messages thread read, send, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const mentorName = `Smoke Mentor ${timestamp}`;
  const inboundText = `Inbound smoke message ${timestamp}`;
  const replyText = `Reply smoke message ${timestamp}`;
  const threadId = `thread-browser-route-smoke-${timestamp}`;
  try {
    await page.goto(`${baseUrl}/messages`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#messageThreadList", { timeout: 10000 });
    await page.evaluate(({ threadId, mentorName, inboundText }) => {
      const now = new Date().toISOString();
      localStorage.setItem("quantMemoryBoard.community.v1", JSON.stringify({
        posts: [],
        threads: [{
          id: threadId,
          participants: [
            { id: "local:browser-route-smoke", name: "Browser Route Smoke", avatar: "" },
            { id: `mentor:${threadId}`, name: mentorName, avatar: "" }
          ],
          messages: [{
            id: `message:${threadId}:inbound`,
            senderId: `mentor:${threadId}`,
            text: inboundText,
            createdAt: now,
            readBy: []
          }],
          updatedAt: now
        }]
      }));
    }, { threadId, mentorName, inboundText });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    const threadButton = page.locator(".message-thread-item", { hasText: mentorName }).first();
    await threadButton.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction((name) => {
      const thread = [...document.querySelectorAll(".message-thread-item")]
        .find((node) => node.textContent.includes(name));
      return thread?.querySelector("b")?.textContent?.trim() === "1";
    }, mentorName, { timeout: 10000 });

    await threadButton.click({ timeout: 10000 });
    await page.waitForFunction((name) => {
      const thread = [...document.querySelectorAll(".message-thread-item")]
        .find((node) => node.textContent.includes(name));
      return thread && !thread.querySelector("b");
    }, mentorName, { timeout: 10000 });

    await page.locator("#messageComposerInput").fill(replyText);
    await page.locator("#messageComposerForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction((text) => {
      const inputCleared = document.querySelector("#messageComposerInput")?.value === "";
      const bodyText = document.querySelector("#messageConversationBody")?.textContent || "";
      return inputCleared && bodyText.includes(text);
    }, replyText, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForFunction(({ mentorName: name, inboundText: inbound, replyText: reply }) => {
      const headerText = document.querySelector("#messageConversationHeader")?.textContent || "";
      const bodyText = document.querySelector("#messageConversationBody")?.textContent || "";
      const thread = [...document.querySelectorAll(".message-thread-item")]
        .find((node) => node.textContent.includes(name));
      const threadText = thread?.textContent || "";
      return headerText.includes(name)
        && bodyText.includes(inbound)
        && bodyText.includes(reply)
        && threadText.includes(reply)
        && !thread?.querySelector("b");
    }, { mentorName, inboundText, replyText }, { timeout: 10000 });

    result.threadId = threadId;
    result.mentorName = mentorName;
    result.replied = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMessagesMultiThreadUnreadFlow(page, baseUrl) {
  const result = { name: "messages multi-thread unread badges clear and persist read state", status: "pass" };
  const timestamp = Date.now();
  const currentUserId = "local:browser-route-smoke";
  const olderIso = new Date(Date.now() - 120_000).toISOString();
  const newerIso = new Date(Date.now() - 60_000).toISOString();
  const threads = [
    {
      id: `thread-browser-route-smoke-alpha-${timestamp}`,
      mentorId: `mentor:messages-alpha-${timestamp}`,
      mentorName: `Alpha Mentor ${timestamp}`,
      inboundText: `Alpha unread smoke message ${timestamp}`,
      replyText: `Alpha reply smoke message ${timestamp}`,
      createdAt: olderIso,
      updatedAt: olderIso
    },
    {
      id: `thread-browser-route-smoke-beta-${timestamp}`,
      mentorId: `mentor:messages-beta-${timestamp}`,
      mentorName: `Beta Mentor ${timestamp}`,
      inboundText: `Beta unread smoke message ${timestamp}`,
      replyText: `Beta reply smoke message ${timestamp}`,
      createdAt: newerIso,
      updatedAt: newerIso
    }
  ];
  const [alpha, beta] = threads;

  try {
    await page.goto(`${baseUrl}/messages`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#messageThreadList", { timeout: 10000 });
    await page.evaluate(({ currentUserId, threads }) => {
      localStorage.setItem("quantMemoryBoard.community.v1", JSON.stringify({
        posts: [],
        threads: threads.map((thread) => ({
          id: thread.id,
          participants: [
            { id: currentUserId, name: "Browser Route Smoke", avatar: "" },
            { id: thread.mentorId, name: thread.mentorName, avatar: "" }
          ],
          messages: [{
            id: `message:${thread.id}:inbound`,
            senderId: thread.mentorId,
            text: thread.inboundText,
            createdAt: thread.createdAt,
            readBy: []
          }],
          updatedAt: thread.updatedAt
        }))
      }));
    }, { currentUserId, threads });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMessageThreadState(page, {
      threadId: alpha.id,
      mentorName: alpha.mentorName,
      threadText: alpha.inboundText,
      unreadCount: 1,
      active: false
    });
    await expectMessageThreadState(page, {
      threadId: beta.id,
      mentorName: beta.mentorName,
      threadText: beta.inboundText,
      unreadCount: 1,
      active: true,
      bodyText: beta.inboundText
    });

    await page.locator(`[data-message-thread="${beta.id}"]`).click({ timeout: 10000 });
    await expectMessageThreadState(page, {
      threadId: beta.id,
      mentorName: beta.mentorName,
      threadText: beta.inboundText,
      unreadCount: 0,
      active: true,
      bodyText: beta.inboundText,
      currentUserId,
      storedInboundRead: true
    });
    await page.locator("#messageComposerInput").fill(beta.replyText);
    await page.locator("#messageComposerForm").evaluate((form) => form.requestSubmit());
    await expectMessageThreadState(page, {
      threadId: beta.id,
      mentorName: beta.mentorName,
      threadText: beta.replyText,
      unreadCount: 0,
      active: true,
      bodyText: beta.replyText,
      currentUserId,
      storedInboundRead: true,
      storedReplyText: beta.replyText
    });

    await page.locator(`[data-message-thread="${alpha.id}"]`).click({ timeout: 10000 });
    await expectMessageThreadState(page, {
      threadId: alpha.id,
      mentorName: alpha.mentorName,
      threadText: alpha.inboundText,
      unreadCount: 0,
      active: true,
      bodyText: alpha.inboundText,
      currentUserId,
      storedInboundRead: true
    });
    await page.locator("#messageComposerInput").fill(alpha.replyText);
    await page.locator("#messageComposerForm").evaluate((form) => form.requestSubmit());
    await expectMessageThreadState(page, {
      threadId: alpha.id,
      mentorName: alpha.mentorName,
      threadText: alpha.replyText,
      unreadCount: 0,
      active: true,
      bodyText: alpha.replyText,
      currentUserId,
      storedInboundRead: true,
      storedReplyText: alpha.replyText
    });
    await expectStoredMessageThreads(page, { currentUserId, threads });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMessageThreadState(page, {
      threadId: alpha.id,
      mentorName: alpha.mentorName,
      threadText: alpha.replyText,
      unreadCount: 0,
      active: true,
      bodyText: alpha.replyText,
      currentUserId,
      storedInboundRead: true,
      storedReplyText: alpha.replyText
    });
    await expectMessageThreadState(page, {
      threadId: beta.id,
      mentorName: beta.mentorName,
      threadText: beta.replyText,
      unreadCount: 0,
      active: false,
      currentUserId,
      storedInboundRead: true,
      storedReplyText: beta.replyText
    });
    await expectStoredMessageThreads(page, { currentUserId, threads });

    result.threadCount = threads.length;
    result.initialUnreadBadges = true;
    result.switchClearedBadges = true;
    result.readStatePersisted = true;
    result.repliesPersisted = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectMessageThreadState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const thread = document.querySelector(`[data-message-thread="${values.threadId}"]`);
      if (!thread) return false;
      const threadText = thread.textContent || "";
      const headerText = document.querySelector("#messageConversationHeader")?.textContent || "";
      const bodyText = document.querySelector("#messageConversationBody")?.textContent || "";
      const badge = thread.querySelector("b")?.textContent?.trim() || "";
      const isActive = thread.classList.contains("active") || thread.getAttribute("aria-pressed") === "true";
      const unreadMatches = Number(values.unreadCount || 0) > 0
        ? badge === String(values.unreadCount)
        : !thread.querySelector("b");
      const activeMatches = typeof values.active === "boolean" ? isActive === values.active : true;
      const activeConversationMatches = !values.active || (
        headerText.includes(values.mentorName)
        && (!values.bodyText || bodyText.includes(values.bodyText))
      );
      let storedMatches = true;
      if (values.storedInboundRead || values.storedReplyText) {
        const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
        const storedThread = Array.isArray(community.threads)
          ? community.threads.find((item) => item.id === values.threadId)
          : null;
        const messages = Array.isArray(storedThread?.messages) ? storedThread.messages : [];
        const inboundMessages = messages.filter((message) => message.senderId !== values.currentUserId);
        const inboundRead = !values.storedInboundRead
          || (inboundMessages.length > 0 && inboundMessages.every((message) => message.readBy?.includes(values.currentUserId)));
        const replyStored = !values.storedReplyText
          || messages.some((message) => message.senderId === values.currentUserId && message.text === values.storedReplyText);
        storedMatches = Boolean(storedThread) && inboundRead && replyStored;
      }
      return threadText.includes(values.mentorName)
        && (!values.threadText || threadText.includes(values.threadText))
        && unreadMatches
        && activeMatches
        && activeConversationMatches
        && storedMatches;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectStoredMessageThreads(page, expected) {
  await page.waitForFunction(({ currentUserId, threads }) => {
    try {
      const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
      if (!Array.isArray(community.threads)) return false;
      return threads.every((thread) => {
        const storedThread = community.threads.find((item) => item.id === thread.id);
        const messages = Array.isArray(storedThread?.messages) ? storedThread.messages : [];
        const inbound = messages.find((message) => message.text === thread.inboundText && message.senderId === thread.mentorId);
        const reply = messages.find((message) => message.text === thread.replyText && message.senderId === currentUserId);
        return storedThread
          && storedThread.participants?.some((participant) => participant.id === currentUserId)
          && storedThread.participants?.some((participant) => participant.id === thread.mentorId)
          && inbound?.readBy?.includes(currentUserId)
          && reply?.readBy?.includes(currentUserId);
      });
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runExperiencesRecordFlow(page, baseUrl) {
  const result = { name: "experiences create, edit, share, delete, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const initial = {
    firm: `Browser Smoke Firm ${timestamp}`,
    role: "Quant Research",
    stage: "OA / Assessment",
    season: "2028 Summer",
    date: "2026-06-17",
    outcome: "Waiting",
    tags: "probability, market-making",
    summary: `Experience smoke summary ${timestamp}`,
    topics: `Probability brainteasers and market intuition ${timestamp}`,
    reflection: `Practice sharper assumption framing ${timestamp}`
  };
  const edited = {
    ...initial,
    firm: `Browser Smoke Edited Firm ${timestamp}`,
    stage: "Technical Interview",
    outcome: "Advanced",
    summary: `Edited experience smoke summary ${timestamp}`,
    topics: `Edited stochastic calculus and options discussion ${timestamp}`,
    reflection: `Edited follow-up plan ${timestamp}`
  };
  try {
    await page.goto(`${baseUrl}/experiences`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#experienceForm", { timeout: 10000 });

    await fillExperienceForm(page, initial);
    await page.locator("#experienceForm button[type='submit']").click({ timeout: 10000 });
    const card = page.locator(".experience-card", { hasText: initial.firm }).first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    const recordId = await card.getAttribute("data-experience-id");
    if (!recordId) throw new Error("Saved experience card did not expose data-experience-id.");
    await expectStoredExperience(page, { id: recordId, ...initial });

    await page.locator("#experienceFilter").selectOption(initial.stage);
    await expectExperienceFilter(page, { includeId: recordId, stage: initial.stage });
    await page.locator("#experienceFilter").selectOption("all");

    await card.locator("button[aria-label='编辑面经']").click({ timeout: 10000 });
    await page.waitForFunction((id) => document.querySelector("#experienceId")?.value === id, recordId, { timeout: 10000 });
    await fillExperienceForm(page, edited);
    await page.locator("#experienceForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(({ id, firm }) => {
      const cardNode = document.querySelector(`[data-experience-id="${id}"]`);
      return cardNode?.textContent.includes(firm);
    }, { id: recordId, firm: edited.firm }, { timeout: 10000 });
    await expectStoredExperience(page, { id: recordId, ...edited });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`[data-experience-id="${recordId}"]`, { timeout: 10000 });
    await expectExperienceCard(page, { id: recordId, ...edited });
    await expectStoredExperience(page, { id: recordId, ...edited });

    const editedCard = page.locator(`[data-experience-id="${recordId}"]`);
    await editedCard.locator(".experience-share-row button").click({ timeout: 10000 });
    await page.waitForSelector(".experience-share-confirm", { timeout: 10000 });
    await page.locator(".experience-share-confirm .primary-button").click({ timeout: 10000 });
    const shared = await waitForSharedExperience(page, { id: recordId, firm: edited.firm, summary: edited.summary });

    await page.goto(`${baseUrl}/experiences`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`[data-experience-id="${recordId}"]`, { timeout: 10000 });
    await page.waitForFunction((id) => {
      const cardNode = document.querySelector(`[data-experience-id="${id}"]`);
      return cardNode?.textContent.includes("已分享");
    }, recordId, { timeout: 10000 });

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(`[data-experience-id="${recordId}"] button[aria-label='删除面经']`).click({ timeout: 10000 });
    await page.waitForFunction((id) => !document.querySelector(`[data-experience-id="${id}"]`), recordId, { timeout: 10000 });
    await expectExperienceDeleted(page, recordId);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#experienceList", { timeout: 10000 });
    await page.waitForFunction((id) => !document.querySelector(`[data-experience-id="${id}"]`), recordId, { timeout: 10000 });
    await expectExperienceDeleted(page, recordId);

    result.recordId = recordId;
    result.sharedPostId = shared.postId;
    result.deleted = true;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function fillExperienceForm(page, values) {
  await page.locator("#experienceFirm").fill(values.firm);
  await page.locator("#experienceRole").selectOption(values.role);
  await page.locator("#experienceStage").selectOption(values.stage);
  await page.locator("#experienceSeason").selectOption(values.season);
  await page.locator("#experienceDate").fill(values.date);
  await page.locator("#experienceOutcome").selectOption(values.outcome);
  await page.locator("#experienceTags").fill(values.tags);
  await page.locator("#experienceSummaryInput").fill(values.summary);
  await page.locator("#experienceTopics").fill(values.topics);
  await page.locator("#experienceReflection").fill(values.reflection);
}

async function expectExperienceCard(page, expected) {
  await page.waitForFunction((values) => {
    const card = document.querySelector(`[data-experience-id="${values.id}"]`);
    const text = card?.textContent || "";
    return [
      values.firm,
      values.role,
      values.stage,
      values.season,
      values.summary,
      values.topics,
      values.reflection
    ].every((value) => text.includes(value));
  }, expected, { timeout: 10000 });
}

async function expectExperienceFilter(page, expected) {
  await page.waitForFunction(({ includeId, stage }) => {
    const cards = [...document.querySelectorAll("#experienceList .experience-card")];
    return cards.some((card) => card.getAttribute("data-experience-id") === includeId)
      && cards.every((card) => (card.textContent || "").includes(stage));
  }, expected, { timeout: 10000 });
}

async function expectStoredExperience(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const record = Array.isArray(state.interviewExperiences)
        ? state.interviewExperiences.find((item) => item.id === values.id)
        : null;
      if (!record) return false;
      return record.firm === values.firm
        && record.role === values.role
        && record.stage === values.stage
        && record.season === values.season
        && record.date === values.date
        && record.outcome === values.outcome
        && record.summary === values.summary
        && record.topics === values.topics
        && record.reflection === values.reflection
        && values.tags.split(",").map((tag) => tag.trim()).every((tag) => record.tags?.includes(tag));
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function waitForSharedExperience(page, expected) {
  const handle = await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const record = Array.isArray(state.interviewExperiences)
        ? state.interviewExperiences.find((item) => item.id === values.id)
        : null;
      const community = JSON.parse(localStorage.getItem("quantMemoryBoard.community.v1") || "{}");
      const post = Array.isArray(community.posts)
        ? community.posts.find((item) => item.id === record?.sharedPostId)
        : null;
      if (!record?.sharedPostId || !post) return false;
      const text = post.text || "";
      return post.kind === "experience"
        && post.experience?.id === values.id
        && text.includes(values.firm)
        && text.includes(values.summary)
        ? { postId: post.id }
        : false;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
  return handle.evaluate((value) => value);
}

async function expectExperienceDeleted(page, recordId) {
  await page.waitForFunction((id) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return !Array.isArray(state.interviewExperiences)
        || !state.interviewExperiences.some((item) => item.id === id);
    } catch {
      return false;
    }
  }, recordId, { timeout: 10000 });
}

async function runNewsManualSubmitFlow(page, baseUrl) {
  const result = { name: "news manual submit, filter, detail, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const expected = {
    title: `Browser Smoke Jane Street official update ${timestamp}`,
    source: "Jane Street Careers",
    sourceType: "official",
    sourceUrl: "https://www.janestreet.com/join-jane-street/open-roles/",
    primarySkill: "market",
    tags: ["janestreet", "internship", "browser-smoke"],
    summary: `Jane Street official recruiting browser smoke summary ${timestamp}`,
    insight: `Track market making and internship signals for interview prep ${timestamp}`
  };
  try {
    await page.goto(`${baseUrl}/news`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#newsList", { timeout: 10000 });

    await page.locator("#addNewsBtn").click({ timeout: 10000 });
    await page.waitForSelector("#newsForm", { timeout: 10000 });
    await page.locator("#newsTitle").fill(expected.title);
    await page.locator("#newsSource").fill(expected.source);
    await page.locator("#newsUrl").fill(expected.sourceUrl);
    await page.locator("#newsSourceType").selectOption(expected.sourceType);
    await page.locator("#newsPrimarySkill").selectOption(expected.primarySkill);
    await page.locator("#newsTags").fill(expected.tags.join(", "));
    await page.locator("#newsSummary").fill(expected.summary);
    await page.locator("#newsInsight").fill(expected.insight);
    await page.locator("#newsForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector("#newsForm"), null, { timeout: 10000 });

    const card = page.locator(".news-card", { hasText: expected.title }).first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    const newsId = await card.getAttribute("data-news-id");
    if (!newsId) throw new Error("Saved news card did not expose data-news-id.");
    await expectStoredNews(page, { ...expected, id: newsId, read: false });

    await page.locator('[data-news-source-filter="official"]').click({ timeout: 10000 });
    await expectNewsFilterResult(page, { id: newsId, sourceType: expected.sourceType });
    await page.locator('[data-news-topic="quantFirms"]').click({ timeout: 10000 });
    await expectNewsFilterResult(page, { id: newsId, sourceType: expected.sourceType });

    await page.locator(`[data-news-id="${newsId}"]`).click({ timeout: 10000 });
    await expectNewsDetail(page, { ...expected, id: newsId });
    await page.locator("#newsBackBtn").click({ timeout: 10000 });
    await page.waitForFunction((id) => {
      const cardNode = document.querySelector(`[data-news-id="${id}"]`);
      return cardNode?.classList.contains("read") && /已读|Read/i.test(cardNode.textContent || "");
    }, newsId, { timeout: 10000 });
    await expectStoredNews(page, { ...expected, id: newsId, read: true });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`[data-news-id="${newsId}"]`, { timeout: 10000 });
    await expectNewsCard(page, { ...expected, id: newsId, read: true });
    await expectStoredNews(page, { ...expected, id: newsId, read: true });

    result.newsId = newsId;
    result.sourceType = expected.sourceType;
    result.reloaded = true;
    result.readPersisted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectNewsCard(page, expected) {
  await page.waitForFunction((values) => {
    const card = document.querySelector(`[data-news-id="${values.id}"]`);
    const text = card?.textContent || "";
    const link = card?.querySelector(`a[href="${values.sourceUrl}"]`);
    const hasReadState = values.read
      ? card?.classList.contains("read") && /已读|Read/i.test(text)
      : !card?.classList.contains("read");
    return [
      values.title,
      values.source,
      values.summary,
      values.insight,
      ...values.tags
    ].every((value) => text.includes(value))
      && hasReadState
      && link?.getAttribute("target") === "_blank"
      && link?.getAttribute("rel") === "noreferrer";
  }, expected, { timeout: 10000 });
}

async function expectNewsFilterResult(page, expected) {
  await page.waitForFunction(({ id, sourceType }) => {
    const cards = [...document.querySelectorAll("#newsList .news-card")];
    const target = cards.find((card) => card.getAttribute("data-news-id") === id);
    return Boolean(target)
      && cards.length > 0
      && cards.every((card) => card.classList.contains(`news-source-${sourceType}`));
  }, expected, { timeout: 10000 });
}

async function expectNewsDetail(page, expected) {
  await page.waitForFunction((values) => {
    const detail = document.querySelector("#newsDetail");
    const text = detail?.textContent || "";
    const link = document.querySelector("#newsDetailLink");
    return [
      values.title,
      values.source,
      values.summary,
      values.insight,
      ...values.tags
    ].every((value) => text.includes(value))
      && link?.getAttribute("href") === values.sourceUrl
      && link?.getAttribute("target") === "_blank"
      && link?.getAttribute("rel") === "noreferrer";
  }, expected, { timeout: 10000 });
}

async function expectStoredNews(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const item = Array.isArray(state.news)
        ? state.news.find((entry) => entry.id === values.id)
        : null;
      if (!item) return false;
      const matches = item.title === values.title
        && item.titleZh === values.title
        && item.source === values.source
        && item.sourceType === values.sourceType
        && item.sourceUrl === values.sourceUrl
        && item.summary === values.summary
        && item.insight === values.insight
        && item.skills?.includes(values.primarySkill)
        && values.tags.every((tag) => item.tags?.includes(tag));
      const readMatches = values.read ? Boolean(item.readAt) : !item.readAt;
      return matches && readMatches;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runMobileNewsExperiencesFlow(page, baseUrl) {
  const result = { name: "mobile news and experiences controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const timestamp = Date.now();
  const experience = {
    firm: `Mobile Smoke Firm ${timestamp}`,
    role: "Quant Developer",
    stage: "Technical Interview",
    season: "2028 Summer",
    date: "2026-06-19",
    outcome: "Advanced",
    tags: "mobile, systems, market-making",
    summary: `Mobile experience summary ${timestamp}`,
    topics: `Mobile systems design and market data pipeline ${timestamp}`,
    reflection: `Practice concise tradeoff framing on mobile ${timestamp}`
  };
  const news = {
    title: `Mobile Smoke official recruiting update ${timestamp}`,
    source: "Jane Street Careers",
    sourceType: "official",
    sourceUrl: "https://www.janestreet.com/join-jane-street/open-roles/",
    primarySkill: "market",
    tags: ["mobile-smoke", "official", "recruiting"],
    summary: `Mobile news official summary ${timestamp}`,
    insight: `Mobile news interview prep insight ${timestamp}`
  };

  try {
    result.step = "open mobile experiences";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/experiences`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#experienceForm", { timeout: 10000 });
    await expectMobileContentState(page, { section: "experiences", minCards: 0 });

    result.step = "save mobile experience";
    await fillExperienceForm(page, experience);
    await page.locator("#experienceForm").evaluate((form) => form.requestSubmit());
    const experienceCard = page.locator(".experience-card", { hasText: experience.firm }).first();
    await experienceCard.waitFor({ state: "visible", timeout: 10000 });
    const recordId = await experienceCard.getAttribute("data-experience-id");
    if (!recordId) throw new Error("Mobile saved experience did not expose data-experience-id.");
    await expectStoredExperience(page, { id: recordId, ...experience });
    await expectMobileContentState(page, { section: "experiences", minCards: 1 });

    result.step = "filter and share mobile experience";
    await page.locator("#experienceFilter").selectOption(experience.stage);
    await expectExperienceFilter(page, { includeId: recordId, stage: experience.stage });
    await expectMobileContentState(page, { section: "experiences", minCards: 1 });
    await page.locator(`[data-experience-id="${recordId}"] .experience-share-row button`).click({ timeout: 10000 });
    const confirmSelector = `[data-experience-id="${recordId}"] .experience-share-confirm`;
    const shareConfirmVisible = await page.waitForSelector(confirmSelector, { timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (shareConfirmVisible) {
      await expectMobileContentState(page, { section: "experiences", minCards: 1, shareConfirmVisible: true });
      await page.locator(`${confirmSelector} .primary-button`).click({ timeout: 10000 });
    }
    const shared = await waitForSharedExperience(page, { id: recordId, firm: experience.firm, summary: experience.summary });
    const sharePath = new URL(page.url()).pathname;
    if (sharePath !== "/community" && shareConfirmVisible !== true) {
      throw new Error(`Mobile experience share neither showed confirmation nor navigated to Community: ${sharePath}`);
    }

    result.step = "open mobile news";
    await page.goto(`${baseUrl}/news`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#newsList", { timeout: 10000 });
    await expectMobileContentState(page, { section: "news", minCards: 1 });

    result.step = "submit mobile news";
    await page.locator("#addNewsBtn").click({ timeout: 10000 });
    await page.waitForSelector("#newsForm", { timeout: 10000 });
    await expectMobileContentState(page, { section: "newsForm", minCards: 1 });
    await page.locator("#newsTitle").fill(news.title);
    await page.locator("#newsSource").fill(news.source);
    await page.locator("#newsUrl").fill(news.sourceUrl);
    await page.locator("#newsSourceType").selectOption(news.sourceType);
    await page.locator("#newsPrimarySkill").selectOption(news.primarySkill);
    await page.locator("#newsTags").fill(news.tags.join(", "));
    await page.locator("#newsSummary").fill(news.summary);
    await page.locator("#newsInsight").fill(news.insight);
    await page.locator("#newsForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector("#newsForm"), null, { timeout: 10000 });
    const newsCard = page.locator(".news-card", { hasText: news.title }).first();
    await newsCard.waitFor({ state: "visible", timeout: 10000 });
    const newsId = await newsCard.getAttribute("data-news-id");
    if (!newsId) throw new Error("Mobile saved news card did not expose data-news-id.");
    await expectStoredNews(page, { ...news, id: newsId, read: false });
    await expectMobileContentState(page, { section: "news", minCards: 1 });

    result.step = "filter and read mobile news";
    await page.locator('[data-news-source-filter="official"]').click({ timeout: 10000 });
    await expectNewsFilterResult(page, { id: newsId, sourceType: news.sourceType });
    await page.locator('[data-news-topic="quantFirms"]').click({ timeout: 10000 });
    await expectNewsFilterResult(page, { id: newsId, sourceType: news.sourceType });
    await expectMobileContentState(page, { section: "news", minCards: 1 });
    await page.locator(`[data-news-id="${newsId}"]`).click({ timeout: 10000 });
    await expectNewsDetail(page, { ...news, id: newsId });
    await expectMobileContentState(page, { section: "newsDetail", minCards: 0 });
    await page.locator("#newsBackBtn").click({ timeout: 10000 });
    await page.waitForFunction((id) => {
      const card = document.querySelector(`[data-news-id="${id}"]`);
      return card?.classList.contains("read") && /已读|Read/i.test(card.textContent || "");
    }, newsId, { timeout: 10000 });
    await expectStoredNews(page, { ...news, id: newsId, read: true });

    result.step = "reload mobile content";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`[data-news-id="${newsId}"]`, { timeout: 10000 });
    await expectNewsCard(page, { ...news, id: newsId, read: true });
    await expectStoredNews(page, { ...news, id: newsId, read: true });
    await expectMobileContentState(page, { section: "news", minCards: 1 });

    delete result.step;
    result.mobileViewport = true;
    result.experienceSaved = true;
    result.experienceFilterUsable = true;
    result.experienceShared = true;
    result.newsSubmitted = true;
    result.newsFiltersUsable = true;
    result.newsDetailReadPersisted = true;
    result.noHorizontalOverflow = true;
    result.recordId = recordId;
    result.sharedPostId = shared.postId;
    result.newsId = newsId;
    result.finalPath = new URL(page.url()).pathname;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileContentDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectMobileContentState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const rectFor = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    };
    const visible = (node) => {
      const rect = rectFor(node);
      if (!rect) return false;
      const style = window.getComputedStyle(node);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4;
    };
    const overflow = Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.documentElement.clientWidth
    );
    if (window.innerWidth > 430 || overflow > 4) return false;

    if (values.section === "experiences") {
      const controls = [
        ".experience-header",
        "#newExperienceBtn",
        "#experienceForm",
        "#experienceFirm",
        "#experienceRole",
        "#experienceStage",
        "#experienceSeason",
        "#experienceDate",
        "#experienceOutcome",
        "#experienceTags",
        "#experienceSummaryInput",
        "#experienceTopics",
        "#experienceReflection",
        ".experience-form-actions .primary-button",
        "#experienceCount",
        "#sharedExperienceCount",
        "#openCommunityExperiencesBtn",
        "#experienceFilter",
        "#experienceList"
      ].map((selector) => document.querySelector(selector));
      const cards = [...document.querySelectorAll("#experienceList .experience-card")];
      const shareConfirm = values.shareConfirmVisible
        ? visible(document.querySelector(".experience-share-confirm"))
        : true;
      return controls.every(visible)
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 3)).every(visible)
        && shareConfirm;
    }

    if (values.section === "news" || values.section === "newsForm") {
      const controls = [
        "#newsUpdatedAt",
        "#addNewsBtn",
        "#refreshNewsBtn",
        "#newsIntelTitle",
        "#newsIntelStats",
        "#newsTopicFilter",
        "#newsSourceFilter",
        '[data-news-topic="all"]',
        '[data-news-topic="quantFirms"]',
        '[data-news-source-filter="all"]',
        '[data-news-source-filter="official"]',
        "#newsList"
      ].map((selector) => document.querySelector(selector));
      const formControls = values.section === "newsForm"
        ? [
          "#newsForm",
          "#newsTitle",
          "#newsSource",
          "#newsUrl",
          "#newsSourceType",
          "#newsPrimarySkill",
          "#newsTags",
          "#newsSummary",
          "#newsInsight",
          "#newsForm .secondary-button",
          "#newsForm .ghost-button"
        ].map((selector) => document.querySelector(selector)).every(visible)
        : true;
      const cards = [...document.querySelectorAll("#newsList .news-card")];
      return controls.every(visible)
        && formControls
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 3)).every(visible);
    }

    if (values.section === "newsDetail") {
      const controls = [
        "#newsDetail",
        "#newsBackBtn",
        "#newsDetailMeta",
        "#newsDetailTitle",
        "#newsDetailSummary",
        "#newsDetailInsight",
        "#newsDetailPills",
        "#newsDetailLink"
      ].map((selector) => document.querySelector(selector));
      return controls.every(visible);
    }

    return false;
  }, expected, { timeout: 10000 });
}

async function collectMobileContentDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 160)
      };
    };
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth
      ),
      experienceForm: rectFor("#experienceForm"),
      experienceList: rectFor("#experienceList"),
      experienceFirstCard: rectFor("#experienceList .experience-card"),
      newsIntel: rectFor(".news-intel-board"),
      newsForm: rectFor("#newsForm"),
      newsList: rectFor("#newsList"),
      newsFirstCard: rectFor("#newsList .news-card"),
      newsDetail: rectFor("#newsDetail")
    };
  });
}

async function runMemoryResourceFlow(page, baseUrl) {
  const result = { name: "memory resource add, source link, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const title = `Browser Smoke Resource ${timestamp}`;
  const content = `Memory smoke note ${timestamp}: review Ito lemma and option Greeks.`;
  const sourceUrl = "https://www.youtube.com/@atypicalquant";
  try {
    await page.goto(`${baseUrl}/memory`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resourceForm", { state: "attached", timeout: 10000 });

    await page.locator("#addResourceBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const form = document.querySelector("#resourceForm");
      return form && !form.classList.contains("hidden");
    }, null, { timeout: 10000 });
    await page.locator("#resourceTitle").fill(title);
    await page.locator("#resourceType").selectOption("note");
    await page.locator("#resourceContent").fill(content);
    await page.locator("#resourceSources").fill(sourceUrl);
    await page.locator("#resourceForm").evaluate((form) => form.requestSubmit());

    await expectMemoryResource(page, { title, content, sourceUrl });
    await page.waitForFunction(() => document.querySelector("#resourceTitle")?.value === "", null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMemoryResource(page, { title, content, sourceUrl });

    result.title = title;
    result.sourceUrl = sourceUrl;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectMemoryResource(page, expected) {
  await page.waitForFunction(({ title, content, sourceUrl }) => {
    const resource = [...document.querySelectorAll(".resource-item")]
      .find((node) => node.textContent.includes(title));
    if (!resource) return false;
    const text = resource.textContent || "";
    const sourceLink = resource.querySelector(`a[href="${sourceUrl}"]`);
    return text.includes(content)
      && text.includes("NOTE")
      && sourceLink
      && sourceLink.getAttribute("target") === "_blank"
      && sourceLink.getAttribute("rel") === "noreferrer";
  }, expected, { timeout: 10000 });
}

async function runMemoryImageResourceUploadFlow(page, baseUrl) {
  const result = { name: "memory image resource upload fallback and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const title = `Browser Smoke Image Resource ${timestamp}`;
  const fileName = `browser-smoke-memory-${timestamp}.png`;
  const imagePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );
  try {
    await page.goto(`${baseUrl}/memory`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resourceForm", { state: "attached", timeout: 10000 });

    await page.locator("#addResourceBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const form = document.querySelector("#resourceForm");
      return form && !form.classList.contains("hidden");
    }, null, { timeout: 10000 });
    await page.locator("#resourceTitle").fill(title);
    await page.locator("#resourceFile").setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: imagePng
    });
    await page.waitForFunction((name) => {
      return document.querySelector("#resourceType")?.value === "image"
        && document.querySelector("#resourceContent")?.value === name;
    }, fileName, { timeout: 10000 });
    await page.locator("#resourceForm").evaluate((form) => form.requestSubmit());

    const stored = await expectMemoryImageResource(page, { title, fileName });
    await page.waitForFunction(() => document.querySelector("#resourceTitle")?.value === "", null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectMemoryImageResource(page, { title, fileName, dataUrl: stored.dataUrl });

    result.title = title;
    result.fileName = fileName;
    result.dataUrlFallback = stored.dataUrl.startsWith("data:image/png;base64,");
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectMemoryImageResource(page, expected) {
  await page.waitForFunction(({ title, fileName, dataUrl }) => {
    try {
      const resource = [...document.querySelectorAll(".resource-item")]
        .find((node) => node.textContent.includes(title));
      if (!resource) return false;
      const text = resource.textContent || "";
      const image = resource.querySelector("img.resource-image");
      const imageSrc = image?.getAttribute("src") || "";
      if (!text.includes(fileName) || !text.includes("IMAGE") || !imageSrc) return false;
      if (dataUrl && imageSrc !== dataUrl) return false;
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const stored = Array.isArray(state.resources)
        ? state.resources.find((item) => item.title === title)
        : null;
      return stored
        && stored.type === "image"
        && stored.content === fileName
        && stored.dataUrl === imageSrc
        && Boolean(stored.date);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
  return page.evaluate(({ title }) => {
    const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
    const stored = Array.isArray(state.resources)
      ? state.resources.find((item) => item.title === title)
      : null;
    return {
      dataUrl: stored?.dataUrl || ""
    };
  }, expected);
}

async function runNetworkContactFlow(page, baseUrl) {
  const result = { name: "network contact add, edit, delete, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const contactName = `Browser Smoke Contact ${timestamp}`;
  const company = "QuantGym Capital";
  const role = "Alumni Mentor";
  const channel = `smoke-${timestamp}@quantgym.local`;
  const nextStep = "Schedule mock chat";
  const notes = `Network smoke note ${timestamp}`;
  const editedNotes = `Network smoke edited note ${timestamp}`;
  try {
    await page.goto(`${baseUrl}/network`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#networkForm", { state: "attached", timeout: 10000 });

    await page.locator("#addNetworkBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => {
      const form = document.querySelector("#networkForm");
      return form && !form.classList.contains("hidden");
    }, null, { timeout: 10000 });
    await page.locator("#networkName").fill(contactName);
    await page.locator("#networkCompany").fill(company);
    await page.locator("#networkRole").fill(role);
    await page.locator("#networkStatus").selectOption("Follow-up");
    await page.locator("#networkChannel").fill(channel);
    await page.locator("#networkNextStep").fill(nextStep);
    await page.locator("#networkNotes").fill(notes);
    await page.locator("#networkForm").evaluate((form) => form.requestSubmit());

    const card = page.locator(".network-card", { hasText: contactName }).first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    await expectNetworkContact(page, { contactName, company, role, channel, nextStep, notes, status: "待跟进" });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectNetworkContact(page, { contactName, company, role, channel, nextStep, notes, status: "待跟进" });

    const reloadedCard = page.locator(".network-card", { hasText: contactName }).first();
    await reloadedCard.locator("button[aria-label*='编辑'], button[aria-label*='Edit']").first().click({ timeout: 10000 });
    await page.waitForFunction((name) => document.querySelector("#networkName")?.value === name, contactName, { timeout: 10000 });
    await page.locator("#networkStatus").selectOption("Warm");
    await page.locator("#networkNotes").fill(editedNotes);
    await page.locator("#networkForm").evaluate((form) => form.requestSubmit());
    await expectNetworkContact(page, { contactName, company, role, channel, nextStep, notes: editedNotes, status: "关系较热" });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await expectNetworkContact(page, { contactName, company, role, channel, nextStep, notes: editedNotes, status: "关系较热" });

    const editedCard = page.locator(".network-card", { hasText: contactName }).first();
    await editedCard.locator("button[aria-label*='删除'], button[aria-label*='Delete']").first().click({ timeout: 10000 });
    await page.waitForFunction((name) => {
      return ![...document.querySelectorAll(".network-card")]
        .some((node) => node.textContent.includes(name));
    }, contactName, { timeout: 10000 });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForFunction((name) => {
      return ![...document.querySelectorAll(".network-card")]
        .some((node) => node.textContent.includes(name));
    }, contactName, { timeout: 10000 });

    result.contactName = contactName;
    result.edited = true;
    result.deleted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectNetworkContact(page, expected) {
  await page.waitForFunction((values) => {
    const card = [...document.querySelectorAll(".network-card")]
      .find((node) => node.textContent.includes(values.contactName));
    if (!card) return false;
    const text = card.textContent || "";
    return [
      values.company,
      values.role,
      values.channel,
      values.nextStep,
      values.notes,
      values.status
    ].every((value) => text.includes(value));
  }, expected, { timeout: 10000 });
}

async function runResumeSaveFlow(page, baseUrl) {
  const result = { name: "resume text save and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const resumeText = [
    `Browser smoke resume ${timestamp}`,
    "Built a Python backtesting dashboard with pandas, NumPy, and risk controls.",
    "Analyzed option greeks, market microstructure notes, and internship interview cases."
  ].join("\n");
  try {
    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeForm", { timeout: 10000 });
    await page.locator("#resumeText").fill(resumeText);
    await page.locator("#saveResumeBtn").click({ timeout: 10000 });
    await expectStoredResumeText(page, resumeText);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, resumeText, { timeout: 10000 });
    await expectStoredResumeText(page, resumeText);

    result.textLength = resumeText.length;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectStoredResumeText(page, resumeText) {
  await page.waitForFunction((text) => {
    return Object.keys(localStorage).some((key) => {
      if (!key.startsWith("quantMemoryBoard.userState.v1.")) return false;
      try {
        const state = JSON.parse(localStorage.getItem(key) || "{}");
        return state?.resume?.text === text && Boolean(state?.resume?.updatedAt);
      } catch {
        return false;
      }
    });
  }, resumeText, { timeout: 10000 });
}

async function runResumeLlmReviewFlow(page, baseUrl) {
  const result = { name: "resume LLM review request, render, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const endpoint = `${baseUrl}/__quantgym_browser_smoke/resume-review`;
  const routePattern = "**/__quantgym_browser_smoke/resume-review";
  const model = "gpt-5-nano";
  const resumeText = [
    `Browser smoke LLM resume ${timestamp}`,
    "Built a latency-aware pairs trading backtest with Python, pandas, NumPy, and walk-forward validation.",
    "Presented options greek hedging analysis and production monitoring notes for quant interviews."
  ].join("\n");
  const reviewItems = [
    `Quantify backtest impact for resume smoke ${timestamp}.`,
    "Name Python, pandas, NumPy, and walk-forward validation in the first bullet.",
    "Tie options greek hedging work to market-making interview readiness."
  ];
  let requestCount = 0;
  let requestPayload = null;

  try {
    await page.route(routePattern, async (route) => {
      requestCount += 1;
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: reviewItems })
      });
    });

    await page.evaluate((config) => {
      localStorage.setItem("quantMemoryBoard.llm.v1", JSON.stringify(config));
    }, { endpoint, model, defaultsVersion: 2 });

    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeForm", { timeout: 10000 });
    await page.locator("#resumeText").fill(resumeText);
    await page.locator("#reviewResumeBtn").click({ timeout: 10000 });

    await expectResumeReviewItems(page, reviewItems);
    if (requestCount !== 1) throw new Error(`Expected one resume review request, got ${requestCount}.`);
    if (requestPayload?.task !== "resume_review") throw new Error(`Unexpected resume review task: ${requestPayload?.task}`);
    if (requestPayload?.model !== model) throw new Error(`Unexpected resume review model: ${requestPayload?.model}`);
    if (requestPayload?.resume !== resumeText) throw new Error("Resume review request did not include the current textarea text.");
    await expectStoredResumeReview(page, resumeText, reviewItems);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, resumeText, { timeout: 10000 });
    await expectResumeReviewItems(page, reviewItems);
    await expectStoredResumeReview(page, resumeText, reviewItems);

    result.reviewCount = reviewItems.length;
    result.requestCount = requestCount;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(routePattern).catch(() => {});
  }
  return result;
}

async function runMobileResumeReviewFlow(page, baseUrl) {
  const result = { name: "mobile resume review controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const timestamp = Date.now();
  const endpoint = `${baseUrl}/__quantgym_browser_smoke/mobile-resume-review`;
  const routePattern = "**/__quantgym_browser_smoke/mobile-resume-review";
  const model = "gpt-5-mini";
  const resumeText = [
    `Mobile resume review smoke ${timestamp}`,
    "Built a latency-aware options monitoring dashboard with Python, pandas, NumPy, and alerting.",
    "Shipped browser-tested account, settings, resume, interview, and problem-practice workflows.",
    "Prepared concise market-making stories with measurable risk controls and production-readiness evidence."
  ].join("\n");
  const reviewItems = [
    `Add measurable latency and reliability numbers for mobile resume smoke ${timestamp}.`,
    "Move Python, pandas, NumPy, alerting, and browser-tested workflows into the first two bullets.",
    "Tie market-making stories to concrete risk controls and interview outcomes."
  ];
  let requestCount = 0;
  let requestPayload = null;

  try {
    await page.route(routePattern, async (route) => {
      requestCount += 1;
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: reviewItems })
      });
    });

    result.step = "open mobile resume";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((config) => {
      localStorage.setItem("quantMemoryBoard.llm.v1", JSON.stringify(config));
    }, { endpoint, model, defaultsVersion: 2 });
    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeForm", { timeout: 10000 });
    await expectMobileResumeState(page);

    result.step = "run mobile resume review";
    await page.locator("#resumeText").fill(resumeText);
    await expectMobileResumeState(page);
    await page.locator("#reviewResumeBtn").click({ timeout: 10000 });
    await expectResumeReviewItems(page, reviewItems);
    await expectMobileResumeState(page, { hasReview: true });
    if (requestCount !== 1) throw new Error(`Expected one mobile resume review request, got ${requestCount}.`);
    if (requestPayload?.task !== "resume_review") throw new Error(`Unexpected mobile resume review task: ${requestPayload?.task}`);
    if (requestPayload?.model !== model) throw new Error(`Unexpected mobile resume review model: ${requestPayload?.model}`);
    if (requestPayload?.resume !== resumeText) throw new Error("Mobile resume review request did not include the textarea text.");
    await expectStoredResumeReview(page, resumeText, reviewItems);

    result.step = "reload mobile resume review";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, resumeText, { timeout: 10000 });
    await expectResumeReviewItems(page, reviewItems);
    await expectMobileResumeState(page, { hasReview: true });
    await expectStoredResumeReview(page, resumeText, reviewItems);

    delete result.step;
    result.mobileViewport = true;
    result.textareaUsable = true;
    result.reviewButtonsVisible = true;
    result.reviewRendered = true;
    result.requestPayloadSent = true;
    result.reviewPersisted = true;
    result.noHorizontalOverflow = true;
    result.reloaded = true;
    result.reviewCount = reviewItems.length;
    result.requestCount = requestCount;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileResumeDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(routePattern).catch(() => {});
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectResumeReviewItems(page, expectedItems) {
  await page.waitForFunction((items) => {
    const rendered = [...document.querySelectorAll("#resumeReview li")]
      .map((node) => node.textContent?.trim() || "");
    return items.every((item) => rendered.includes(item));
  }, expectedItems, { timeout: 10000 });
}

async function expectStoredResumeReview(page, resumeText, expectedItems) {
  await page.waitForFunction(({ text, items }) => {
    return Object.keys(localStorage).some((key) => {
      if (!key.startsWith("quantMemoryBoard.userState.v1.")) return false;
      try {
        const resume = JSON.parse(localStorage.getItem(key) || "{}")?.resume || {};
        const review = Array.isArray(resume.review) ? resume.review : [];
        return resume.text === text
          && Boolean(resume.updatedAt)
          && items.every((item) => review.includes(item));
      } catch {
        return false;
      }
    });
  }, { text: resumeText, items: expectedItems }, { timeout: 10000 });
}

async function expectMobileResumeState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const laidOut = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4;
    };
    const documentElement = document.documentElement;
    const overflow = Math.max(0, documentElement.scrollWidth - documentElement.clientWidth);
    const reviewItems = document.querySelectorAll("#resumeReview li");
    const controlsLaidOut = [
      "#resumeForm",
      "#resumeText",
      "#reviewResumeBtn",
      "#saveResumeBtn",
      "#resumeReview"
    ].every((selector) => laidOut(document.querySelector(selector)));
    const hasReviewOk = !values.hasReview || reviewItems.length > 0;
    return window.innerWidth <= 430
      && overflow <= 4
      && controlsLaidOut
      && hasReviewOk;
  }, expected, { timeout: 10000 });
}

async function collectMobileResumeDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 140)
      };
    };
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      resumeGrid: rectFor(".resume-grid"),
      resumeForm: rectFor("#resumeForm"),
      resumeText: rectFor("#resumeText"),
      buttonRow: rectFor("#resumeForm .form-row"),
      reviewButton: rectFor("#reviewResumeBtn"),
      saveButton: rectFor("#saveResumeBtn"),
      resumeReview: rectFor("#resumeReview"),
      reviewItems: document.querySelectorAll("#resumeReview li").length
    };
  });
}

async function runJobsFilterAndLinkFlow(page, baseUrl) {
  const result = { name: "jobs filter and apply link behavior", status: "pass" };
  const internshipIds = [
    "job-jane-street-quant-intern",
    "job-citadel-securities-intern",
    "job-optiver-trading-intern"
  ];
  const fulltimeIds = [
    "job-imc-quant-trader",
    "job-drw-researcher",
    "job-jump-trading-campus"
  ];
  try {
    await page.goto(`${baseUrl}/jobs`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#jobsList .job-card", { timeout: 10000 });
    await expectJobCardsContaining(page, [...internshipIds, ...fulltimeIds]);
    const fallbackPostedAtCount = await countJobCardsWithFallbackPostedAt(page);
    if (fallbackPostedAtCount < internshipIds.length + fulltimeIds.length) {
      throw new Error(`Expected fallback postedAt labels for all seed jobs, found ${fallbackPostedAtCount}`);
    }

    await page.locator('[data-job-filter="internship"]').click({ timeout: 10000 });
    await expectJobFilterResult(page, {
      includeIds: internshipIds,
      excludeIds: fulltimeIds,
      typePattern: /实习|Internship/i
    });
    await expectJobFilterSelected(page, "internship");

    await page.locator('[data-job-filter="fulltime"]').click({ timeout: 10000 });
    await expectJobFilterResult(page, {
      includeIds: fulltimeIds,
      excludeIds: internshipIds,
      typePattern: /全职|Full-?time/i
    });
    await expectJobFilterSelected(page, "fulltime");

    const firstFulltimeId = fulltimeIds[0];
    const applyLink = page.locator(`[data-job-id="${firstFulltimeId}"] .content-card-link`).first();
    const linkAttrs = await applyLink.evaluate((link) => ({
      href: link.getAttribute("href") || "",
      target: link.getAttribute("target") || "",
      rel: link.getAttribute("rel") || ""
    }));
    if (!/^https:\/\/www\.imc\.com\/us\/careers\/jobs\/?$/.test(linkAttrs.href)) {
      throw new Error(`Unexpected apply link href: ${linkAttrs.href}`);
    }
    if (linkAttrs.target !== "_blank") throw new Error(`Apply link target is not _blank: ${linkAttrs.target}`);
    if (linkAttrs.rel !== "noreferrer") throw new Error(`Apply link rel is not noreferrer: ${linkAttrs.rel}`);

    await page.evaluate(() => {
      window.__quantgymOpenedUrls = [];
      window.open = (url, target, features) => {
        window.__quantgymOpenedUrls.push({ url: String(url || ""), target: String(target || ""), features: String(features || "") });
        return null;
      };
    });
    await page.locator(`[data-job-id="${firstFulltimeId}"] h3`).click({ timeout: 10000 });
    const opened = await page.waitForFunction(() => window.__quantgymOpenedUrls?.length > 0, null, { timeout: 10000 })
      .then((handle) => handle.evaluate(() => window.__quantgymOpenedUrls[0]));
    if (opened.url !== linkAttrs.href) throw new Error(`Job card opened ${opened.url} instead of ${linkAttrs.href}`);
    if (opened.target !== "_blank") throw new Error(`Job card target is not _blank: ${opened.target}`);
    if (!opened.features.includes("noopener") || !opened.features.includes("noreferrer")) {
      throw new Error(`Job card open features are unsafe: ${opened.features}`);
    }

    await page.locator('[data-job-filter="all"]').click({ timeout: 10000 });
    await expectJobCardsContaining(page, [...internshipIds, ...fulltimeIds]);
    await expectJobFilterSelected(page, "all");

    result.allCount = await page.locator("#jobsList .job-card").count();
    result.seedJobCount = internshipIds.length + fulltimeIds.length;
    result.fallbackPostedAtCount = fallbackPostedAtCount;
    result.internshipSeedCount = internshipIds.length;
    result.fulltimeSeedCount = fulltimeIds.length;
    result.openedUrl = opened.url;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function countJobCardsWithFallbackPostedAt(page) {
  return page.locator("#jobsList .job-card", { hasText: "crawler-ready" }).count();
}

async function expectJobCardsContaining(page, expectedIds) {
  await page.waitForFunction((ids) => {
    const actual = [...document.querySelectorAll("#jobsList .job-card")]
      .map((node) => node.getAttribute("data-job-id"))
      .filter(Boolean);
    return ids.every((id) => actual.includes(id));
  }, expectedIds, { timeout: 10000 });
}

async function expectJobFilterResult(page, expected) {
  await page.waitForFunction(({ includeIds, excludeIds, typePatternSource, typePatternFlags }) => {
    const typePattern = new RegExp(typePatternSource, typePatternFlags);
    const cards = [...document.querySelectorAll("#jobsList .job-card")];
    const ids = cards.map((node) => node.getAttribute("data-job-id")).filter(Boolean);
    return cards.length >= includeIds.length
      && includeIds.every((id) => ids.includes(id))
      && excludeIds.every((id) => !ids.includes(id))
      && cards.every((node) => typePattern.test(node.textContent || ""));
  }, {
    includeIds: expected.includeIds,
    excludeIds: expected.excludeIds,
    typePatternSource: expected.typePattern.source,
    typePatternFlags: expected.typePattern.flags
  }, { timeout: 10000 });
}

async function expectJobFilterSelected(page, filter) {
  await page.waitForFunction((value) => {
    const selected = document.querySelector(`[data-job-filter="${value}"]`);
    const others = [...document.querySelectorAll("[data-job-filter]")].filter((node) => node !== selected);
    return selected?.getAttribute("aria-pressed") === "true"
      && selected?.getAttribute("aria-selected") === "true"
      && others.every((node) => node.getAttribute("aria-pressed") === "false");
  }, filter, { timeout: 10000 });
}

async function runCompaniesTierPracticeAndCareersFlow(page, baseUrl) {
  const result = { name: "companies tier filter, practice navigation, and careers link behavior", status: "pass" };
  const sTierIds = ["jane-street", "citadel", "hrt", "two-sigma", "de-shaw"];
  const aTierIds = ["optiver", "imc", "drw", "jump-trading", "virtu", "sig", "five-rings"];
  const bTierIds = ["akuna"];
  try {
    result.step = "open companies route";
    await page.goto(`${baseUrl}/companies`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#companyOverviewList .company-overview-card", { timeout: 10000 });
    result.step = "verify all company cards";
    await expectCompanyCardsContaining(page, [...sTierIds, ...aTierIds, ...bTierIds]);
    await expectCompanyTierSelected(page, "all");

    result.step = "filter Tier S";
    await page.locator('[data-company-tier="s"]').click({ timeout: 10000 });
    await expectCompanyTierSelected(page, "s");
    await expectCompanyFilterResult(page, { includeIds: sTierIds, excludeIds: [...aTierIds, ...bTierIds] });

    result.step = "filter Tier A";
    await page.locator('[data-company-tier="a"]').click({ timeout: 10000 });
    await expectCompanyTierSelected(page, "a");
    await expectCompanyFilterResult(page, { includeIds: aTierIds, excludeIds: [...sTierIds, ...bTierIds] });

    result.step = "reset all companies";
    await page.locator('[data-company-tier="all"]').click({ timeout: 10000 });
    await expectCompanyTierSelected(page, "all");
    await expectCompanyCardsContaining(page, [...sTierIds, ...aTierIds, ...bTierIds]);

    result.step = "open careers";
    const careersButton = page.locator('[data-company-card="jane-street"] [data-company-careers]').first();
    const careersUrl = await careersButton.getAttribute("data-company-careers");
    if (!/^https:\/\/www\.janestreet\.com\/join-jane-street\/open-roles\/?$/.test(careersUrl || "")) {
      throw new Error(`Unexpected Jane Street careers URL: ${careersUrl}`);
    }
    await page.evaluate(() => {
      window.__quantgymOpenedUrls = [];
      window.open = (url, target, features) => {
        window.__quantgymOpenedUrls.push({ url: String(url || ""), target: String(target || ""), features: String(features || "") });
        return null;
      };
    });
    await careersButton.click({ timeout: 10000 });
    const opened = await page.waitForFunction(() => window.__quantgymOpenedUrls?.length > 0, null, { timeout: 10000 })
      .then((handle) => handle.evaluate(() => window.__quantgymOpenedUrls[0]));
    if (opened.url !== careersUrl) throw new Error(`Careers button opened ${opened.url} instead of ${careersUrl}`);
    if (opened.target !== "_blank") throw new Error(`Careers button target is not _blank: ${opened.target}`);
    if (!opened.features.includes("noopener") || !opened.features.includes("noreferrer")) {
      throw new Error(`Careers open features are unsafe: ${opened.features}`);
    }

    result.step = "practice company navigation";
    await page.locator('[data-company-card="jane-street"] [data-company-practice="jane-street"]').click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector('#problemCompanyList [data-problem-company="jane-street"]', { timeout: 10000 });
    await expectCompanyPracticeFilter(page, "jane-street", "Jane Street");

    delete result.step;
    result.sTierCount = sTierIds.length;
    result.aTierCount = aTierIds.length;
    result.bTierCount = bTierIds.length;
    result.openedUrl = opened.url;
    result.practicePath = new URL(page.url()).pathname;
    result.practiceCompany = "jane-street";
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileCareerJobsCompaniesFlow(page, baseUrl) {
  const result = { name: "mobile career jobs and companies controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const internshipIds = [
    "job-jane-street-quant-intern",
    "job-citadel-securities-intern",
    "job-optiver-trading-intern"
  ];
  const fulltimeIds = [
    "job-imc-quant-trader",
    "job-drw-researcher",
    "job-jump-trading-campus"
  ];
  const sTierIds = ["jane-street", "citadel", "hrt", "two-sigma", "de-shaw"];
  const aTierIds = ["optiver", "imc", "drw", "jump-trading", "virtu", "sig", "five-rings"];
  const bTierIds = ["akuna"];

  try {
    result.step = "open mobile jobs";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/jobs`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#jobsList .job-card", { timeout: 10000 });
    await expectMobileCareerState(page, { section: "jobs", minCards: internshipIds.length + fulltimeIds.length });
    await expectJobCardsContaining(page, [...internshipIds, ...fulltimeIds]);

    result.step = "filter mobile internship jobs";
    await page.locator('[data-job-filter="internship"]').click({ timeout: 10000 });
    await expectJobFilterSelected(page, "internship");
    await expectJobFilterResult(page, {
      includeIds: internshipIds,
      excludeIds: fulltimeIds,
      typePattern: /实习|Internship/i
    });
    await expectMobileCareerState(page, { section: "jobs", minCards: internshipIds.length });

    result.step = "filter mobile full-time jobs";
    await page.locator('[data-job-filter="fulltime"]').click({ timeout: 10000 });
    await expectJobFilterSelected(page, "fulltime");
    await expectJobFilterResult(page, {
      includeIds: fulltimeIds,
      excludeIds: internshipIds,
      typePattern: /全职|Full-?time/i
    });
    await expectMobileCareerState(page, { section: "jobs", minCards: fulltimeIds.length });

    result.step = "open mobile job apply link";
    const firstFulltimeId = fulltimeIds[0];
    const applyLink = page.locator(`[data-job-id="${firstFulltimeId}"] .content-card-link`).first();
    const linkAttrs = await applyLink.evaluate((link) => ({
      href: link.getAttribute("href") || "",
      target: link.getAttribute("target") || "",
      rel: link.getAttribute("rel") || ""
    }));
    if (!/^https:\/\/www\.imc\.com\/us\/careers\/jobs\/?$/.test(linkAttrs.href)) {
      throw new Error(`Unexpected mobile apply link href: ${linkAttrs.href}`);
    }
    if (linkAttrs.target !== "_blank") throw new Error(`Mobile apply link target is not _blank: ${linkAttrs.target}`);
    if (linkAttrs.rel !== "noreferrer") throw new Error(`Mobile apply link rel is not noreferrer: ${linkAttrs.rel}`);
    await page.evaluate(() => {
      window.__quantgymOpenedUrls = [];
      window.open = (url, target, features) => {
        window.__quantgymOpenedUrls.push({ url: String(url || ""), target: String(target || ""), features: String(features || "") });
        return null;
      };
    });
    await page.locator(`[data-job-id="${firstFulltimeId}"] h3`).click({ timeout: 10000 });
    const openedJob = await page.waitForFunction(() => window.__quantgymOpenedUrls?.length > 0, null, { timeout: 10000 })
      .then((handle) => handle.evaluate(() => window.__quantgymOpenedUrls[0]));
    if (openedJob.url !== linkAttrs.href) throw new Error(`Mobile job card opened ${openedJob.url} instead of ${linkAttrs.href}`);
    if (openedJob.target !== "_blank") throw new Error(`Mobile job card target is not _blank: ${openedJob.target}`);
    if (!openedJob.features.includes("noopener") || !openedJob.features.includes("noreferrer")) {
      throw new Error(`Mobile job card open features are unsafe: ${openedJob.features}`);
    }

    result.step = "open mobile companies";
    await page.goto(`${baseUrl}/companies`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#companyOverviewList .company-overview-card", { timeout: 10000 });
    await expectMobileCareerState(page, { section: "companies", minCards: sTierIds.length + aTierIds.length + bTierIds.length });
    await expectCompanyCardsContaining(page, [...sTierIds, ...aTierIds, ...bTierIds]);
    await expectCompanyTierSelected(page, "all");

    result.step = "filter mobile Tier S companies";
    await page.locator('[data-company-tier="s"]').click({ timeout: 10000 });
    await expectCompanyTierSelected(page, "s");
    await expectCompanyFilterResult(page, { includeIds: sTierIds, excludeIds: [...aTierIds, ...bTierIds] });
    await expectMobileCareerState(page, { section: "companies", minCards: sTierIds.length });

    result.step = "open mobile company careers";
    const careersButton = page.locator('[data-company-card="jane-street"] [data-company-careers]').first();
    const careersUrl = await careersButton.getAttribute("data-company-careers");
    if (!/^https:\/\/www\.janestreet\.com\/join-jane-street\/open-roles\/?$/.test(careersUrl || "")) {
      throw new Error(`Unexpected mobile Jane Street careers URL: ${careersUrl}`);
    }
    await page.evaluate(() => {
      window.__quantgymOpenedUrls = [];
      window.open = (url, target, features) => {
        window.__quantgymOpenedUrls.push({ url: String(url || ""), target: String(target || ""), features: String(features || "") });
        return null;
      };
    });
    await careersButton.click({ timeout: 10000 });
    const openedCareers = await page.waitForFunction(() => window.__quantgymOpenedUrls?.length > 0, null, { timeout: 10000 })
      .then((handle) => handle.evaluate(() => window.__quantgymOpenedUrls[0]));
    if (openedCareers.url !== careersUrl) throw new Error(`Mobile careers button opened ${openedCareers.url} instead of ${careersUrl}`);
    if (openedCareers.target !== "_blank") throw new Error(`Mobile careers button target is not _blank: ${openedCareers.target}`);
    if (!openedCareers.features.includes("noopener") || !openedCareers.features.includes("noreferrer")) {
      throw new Error(`Mobile careers open features are unsafe: ${openedCareers.features}`);
    }

    result.step = "mobile company practice navigation";
    await page.locator('[data-company-card="jane-street"] [data-company-practice="jane-street"]').click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector('#problemCompanyList [data-problem-company="jane-street"]', { timeout: 10000 });
    await expectCompanyPracticeFilter(page, "jane-street", "Jane Street");
    await expectMobileCareerState(page, { section: "problems", minCards: 1 });

    delete result.step;
    result.mobileViewport = true;
    result.jobsFilterUsable = true;
    result.jobApplyLinkSafe = true;
    result.companiesFilterUsable = true;
    result.companyCareersLinkSafe = true;
    result.companyPracticeNavigated = true;
    result.noHorizontalOverflow = true;
    result.openedJobUrl = openedJob.url;
    result.openedCareersUrl = openedCareers.url;
    result.practicePath = new URL(page.url()).pathname;
    result.practiceCompany = "jane-street";
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileCareerDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectCompanyCardsContaining(page, expectedIds) {
  await page.waitForFunction((ids) => {
    const actual = [...document.querySelectorAll("#companyOverviewList [data-company-card]")]
      .map((node) => node.getAttribute("data-company-card"))
      .filter(Boolean);
    return ids.every((id) => actual.includes(id));
  }, expectedIds, { timeout: 10000 });
}

async function expectCompanyFilterResult(page, expected) {
  await page.waitForFunction(({ includeIds, excludeIds }) => {
    const cards = [...document.querySelectorAll("#companyOverviewList [data-company-card]")];
    const ids = cards.map((node) => node.getAttribute("data-company-card")).filter(Boolean);
    return cards.length === includeIds.length
      && includeIds.every((id) => ids.includes(id))
      && excludeIds.every((id) => !ids.includes(id));
  }, expected, { timeout: 10000 });
}

async function expectCompanyTierSelected(page, tier) {
  await page.waitForFunction((value) => {
    const selected = document.querySelector(`[data-company-tier="${value}"]`);
    const others = [...document.querySelectorAll("[data-company-tier]")].filter((node) => node !== selected);
    return selected?.classList.contains("active")
      && selected?.getAttribute("aria-pressed") === "true"
      && selected?.getAttribute("aria-selected") === "true"
      && others.every((node) => node.getAttribute("aria-pressed") === "false");
  }, tier, { timeout: 10000 });
}

async function expectCompanyPracticeFilter(page, companySlug, companyName) {
  await page.waitForFunction(({ slug, name }) => {
    const activeCompany = document.querySelector(`#problemCompanyList [data-problem-company="${slug}"]`);
    const clearButton = document.querySelector("#problemCompanyClearBtn");
    const cards = [...document.querySelectorAll("#problemList .problem-card")];
    const cardsWithCompany = cards.filter((card) => (card.textContent || "").includes(name));
    return activeCompany?.classList.contains("active")
      && activeCompany?.getAttribute("aria-pressed") === "true"
      && clearButton && !clearButton.classList.contains("hidden")
      && cards.length > 0
    && cardsWithCompany.length >= Math.max(1, Math.floor(cards.length * 0.8));
  }, { slug: companySlug, name: companyName }, { timeout: 10000 });
}

async function expectMobileCareerState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const rectFor = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom
      };
    };
    const visible = (node) => {
      const rect = rectFor(node);
      if (!rect) return false;
      const style = window.getComputedStyle(node);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4;
    };
    const documentElement = document.documentElement;
    const overflow = Math.max(0, documentElement.scrollWidth - documentElement.clientWidth);
    if (window.innerWidth > 430 || overflow > 4) return false;

    if (values.section === "jobs") {
      const controls = [
        "#jobsSummary",
        '[data-job-filter="all"]',
        '[data-job-filter="internship"]',
        '[data-job-filter="fulltime"]',
        "#refreshJobsBtn"
      ].map((selector) => document.querySelector(selector));
      const cards = [...document.querySelectorAll("#jobsList .job-card")];
      return controls.every(visible)
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 4)).every(visible)
        && cards.slice(0, Math.min(cards.length, 4)).every((card) => visible(card.querySelector(".content-card-link")));
    }

    if (values.section === "companies") {
      const controls = [
        "#companiesPageTitle",
        "#companiesSummary",
        '[data-company-tier="all"]',
        '[data-company-tier="s"]',
        '[data-company-tier="a"]',
        '[data-company-tier="b"]'
      ].map((selector) => document.querySelector(selector));
      const cards = [...document.querySelectorAll("#companyOverviewList [data-company-card]")];
      const firstCard = cards[0];
      return controls.every(visible)
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 4)).every(visible)
        && (!firstCard || (
          visible(firstCard.querySelector("[data-company-practice]"))
          && visible(firstCard.querySelector("[data-company-careers]"))
        ));
    }

    if (values.section === "problems") {
      const controls = [
        "#problemSearch",
        "#problemCompanyList",
        '[data-problem-company="jane-street"]',
        "#problemCompanyClearBtn"
      ].map((selector) => document.querySelector(selector));
      const cards = [...document.querySelectorAll("#problemList .problem-card")];
      return controls.every(visible)
        && cards.length >= values.minCards
        && cards.slice(0, Math.min(cards.length, 4)).every(visible);
    }

    return false;
  }, expected, { timeout: 10000 });
}

async function collectMobileCareerDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 160)
      };
    };
    return {
      pathname: window.location.pathname,
      url: window.location.href,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      jobCards: document.querySelectorAll("#jobsList .job-card").length,
      companyCards: document.querySelectorAll("#companyOverviewList [data-company-card]").length,
      problemCards: document.querySelectorAll("#problemList .problem-card").length,
      jobsSummary: rectFor("#jobsSummary"),
      jobFilters: rectFor(".view-tabs"),
      jobsList: rectFor("#jobsList"),
      companyTierFilter: rectFor("#companyTierFilter"),
      companyList: rectFor("#companyOverviewList"),
      problemCompanyList: rectFor("#problemCompanyList")
    };
  });
}

async function runLibrarySearchPracticeAndReaderGuardFlow(page, baseUrl) {
  const result = { name: "library search, kind filter, practice navigation, and reader guard", status: "pass" };
  try {
    result.step = "open library route";
    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#libraryBookGrid .library-card[data-library-id='green-book']", { timeout: 10000 });
    await page.waitForSelector("#libraryQuestionGrid .library-card[data-library-id='quantguide']", { timeout: 10000 });
    await expectLibraryKindSelected(page, "all");

    result.step = "filter question sets";
    await page.locator('[data-library-kind="questionSet"]').click({ timeout: 10000 });
    await expectLibraryKindSelected(page, "questionSet");
    await expectLibraryQuestionSetFilter(page);

    result.step = "search QuantGuide";
    await page.locator("#librarySearch").fill("QuantGuide");
    await expectLibrarySearchResult(page, {
      includeId: "quantguide",
      includeGrid: "libraryQuestionGrid",
      excludeIds: ["green-book", "probabilitycourse-textbook"]
    });

    result.step = "practice QuantGuide";
    await page.locator('#libraryQuestionGrid .library-card[data-library-id="quantguide"] .library-card-actions button').click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectLibraryPracticeSourceFilter(page, {
      sourceSlug: "quantguide",
      sourceLabel: "QuantGuide"
    });

    result.step = "reader auth guard";
    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#librarySearch", { timeout: 10000 });
    await page.locator("#librarySearch").fill("");
    await page.locator('[data-library-kind="all"]').click({ timeout: 10000 });
    await expectLibraryKindSelected(page, "all");
    await page.locator('#libraryBookGrid .library-card[data-library-id="green-book"] .library-card-actions button').filter({ hasText: /阅读|Read/i }).first().click({ timeout: 10000 });
    await expectLibraryReaderGuard(page);

    delete result.step;
    result.practiceSource = "quantguide";
    result.readerGuarded = true;
    result.searchQuery = "QuantGuide";
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectLibraryKindSelected(page, kind) {
  await page.waitForFunction((value) => {
    const selected = document.querySelector(`[data-library-kind="${value}"]`);
    const buttons = [...document.querySelectorAll("[data-library-kind]")];
    return selected?.classList.contains("active")
      && selected?.getAttribute("aria-selected") === "true"
      && buttons.filter((button) => button.classList.contains("active")).length === 1;
  }, kind, { timeout: 10000 });
}

async function expectLibraryQuestionSetFilter(page) {
  await page.waitForFunction(() => {
    const bookCards = document.querySelectorAll("#libraryBookGrid .library-card[data-library-id]");
    const questionCards = document.querySelectorAll("#libraryQuestionGrid .library-card[data-library-id]");
    return bookCards.length === 0
      && questionCards.length > 0
      && [...questionCards].every((card) => card.classList.contains("question-set"));
  }, null, { timeout: 10000 });
}

async function expectLibrarySearchResult(page, expected) {
  await page.waitForFunction(({ includeId, includeGrid, excludeIds }) => {
    const queryMatches = document.querySelector("#librarySearch")?.value?.toLowerCase() === "quantguide";
    const target = document.querySelector(`#${includeGrid} .library-card[data-library-id="${includeId}"]`);
    const excludedMissing = excludeIds.every((id) => !document.querySelector(`.library-card[data-library-id="${id}"]`));
    return queryMatches && target && excludedMissing;
  }, expected, { timeout: 10000 });
}

async function expectLibraryPracticeSourceFilter(page, expected) {
  await page.waitForFunction(({ sourceSlug, sourceLabel }) => {
    const clearButton = document.querySelector("#problemSourceFilterClearBtn");
    const searchInput = document.querySelector("#problemSearch");
    const status = document.querySelector("#problemInteractionStatus")?.textContent || "";
    const collection = document.querySelector(`[data-problem-collection="${sourceSlug}"]`);
    const cards = [...document.querySelectorAll("#problemList .problem-card")];
    return clearButton && !clearButton.classList.contains("hidden")
      && searchInput?.value === ""
      && status.includes(sourceLabel)
      && collection?.classList.contains("active")
      && cards.length > 0
      && cards.every((card) => (card.textContent || "").includes(sourceLabel));
  }, expected, { timeout: 10000 });
}

async function expectLibraryReaderGuard(page) {
  await page.waitForFunction(() => {
    const alert = document.querySelector(".library-alert")?.textContent || "";
    const overlay = document.querySelector("#libraryReaderOverlay");
    const frame = document.querySelector("#libraryReaderFrame");
    const openNew = document.querySelector("#libraryReaderOpenNew");
    return /请先用云端账号登录或注册后再阅读 PDF|Please sign in or register with the cloud account/i.test(alert)
      && overlay?.classList.contains("hidden")
      && (!frame || frame.getAttribute("src") === "about:blank")
      && (!openNew || openNew.getAttribute("href") === "#");
  }, null, { timeout: 10000 });
}

async function runLibraryCloudPdfReaderFlow(page, baseUrl) {
  const result = { name: "library cloud PDF reader opens, exposes links, and closes", status: "pass" };
  const readerTokenPattern = "**/api/library/reader-token/**";
  const pdfPattern = "**/api/library-reader-smoke/green-book.pdf";
  let tokenRequestCount = 0;
  let pdfRequestCount = 0;

  try {
    result.step = "install cloud reader fixture";
    await page.route(readerTokenPattern, async (route) => {
      tokenRequestCount += 1;
      const requestUrl = new URL(route.request().url());
      const assetId = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");
      if (assetId !== "green-book") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: `Unexpected reader asset: ${assetId}` })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/api/library-reader-smoke/green-book.pdf" })
      });
    });
    await page.route(pdfPattern, async (route) => {
      pdfRequestCount += 1;
      await route.fulfill({
        status: 206,
        contentType: "application/pdf",
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": "bytes 0-0/28"
        },
        body: "%PDF-1.4\n% QuantGym smoke\n%%EOF\n"
      });
    });

    result.step = "open library route with cloud session";
    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await enableCloudSessionForCurrentUser(page, `${baseUrl}/api`);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector('#libraryBookGrid .library-card[data-library-id="green-book"]', { timeout: 10000 });

    result.step = "open green-book PDF reader";
    await page.locator('#libraryBookGrid .library-card[data-library-id="green-book"] .library-card-actions button').filter({ hasText: /阅读|Read/i }).first().click({ timeout: 10000 });
    const opened = await expectLibraryReaderOpen(page, {
      titlePattern: /绿皮书|Practical Guide/i,
      openUrl: `${baseUrl}/api/library-reader-smoke/green-book.pdf`
    });
    if (tokenRequestCount !== 1) throw new Error(`Expected one reader-token request, got ${tokenRequestCount}.`);
    if (pdfRequestCount < 1) throw new Error("Expected at least one PDF probe/frame request.");

    result.step = "close reader by button";
    await page.locator("#libraryReaderClose").click({ timeout: 10000 });
    await expectLibraryReaderClosed(page);

    result.step = "reopen and close reader with Escape";
    await page.locator('#libraryBookGrid .library-card[data-library-id="green-book"] .library-card-actions button').filter({ hasText: /阅读|Read/i }).first().click({ timeout: 10000 });
    await expectLibraryReaderOpen(page, {
      titlePattern: /绿皮书|Practical Guide/i,
      openUrl: `${baseUrl}/api/library-reader-smoke/green-book.pdf`
    });
    await page.keyboard.press("Escape");
    await expectLibraryReaderClosed(page);

    delete result.step;
    result.readerTokenRequests = tokenRequestCount;
    result.pdfRequests = pdfRequestCount;
    result.readerOpened = true;
    result.openNewHref = opened.openNewHref;
    result.embedUrl = opened.embedUrl;
    result.closedByButton = true;
    result.closedByEscape = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    result.diagnostics = await collectLibraryReaderDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.unroute(readerTokenPattern).catch(() => {});
    await page.unroute(pdfPattern).catch(() => {});
  }
  return result;
}

async function enableCloudSessionForCurrentUser(page, endpoint) {
  await page.evaluate((apiEndpoint) => {
    let auth = {};
    try {
      auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
    } catch {
      auth = {};
    }
    const userId = auth.currentUserId || "local:browser-route-smoke";
    localStorage.setItem("quantMemoryBoard.cloud.v1", JSON.stringify({
      endpoint: apiEndpoint,
      token: "browser-library-reader-token",
      userId,
      lastSyncAt: new Date().toISOString(),
      lastError: ""
    }));
  }, endpoint);
}

async function expectLibraryReaderOpen(page, expected) {
  await page.waitForFunction(({ titleSource, titleFlags, openUrl }) => {
    const overlay = document.querySelector("#libraryReaderOverlay");
    const title = document.querySelector("#libraryReaderTitle")?.textContent || "";
    const meta = document.querySelector("#libraryReaderMeta")?.textContent || "";
    const frame = document.querySelector("#libraryReaderFrame");
    const openNew = document.querySelector("#libraryReaderOpenNew");
    const frameSrc = frame?.getAttribute("src") || "";
    const href = openNew?.getAttribute("href") || "";
    const titleMatches = new RegExp(titleSource, titleFlags).test(title);
    return overlay
      && !overlay.classList.contains("hidden")
      && !overlay.classList.contains("is-opening")
      && overlay.getAttribute("data-reader-type") === "pdf"
      && document.body.classList.contains("library-reader-open")
      && titleMatches
      && /安全 PDF|Secure PDF/i.test(meta)
      && href === openUrl
      && frameSrc.startsWith(openUrl)
      && frameSrc.includes("toolbar=0")
      && frame?.getAttribute("title") === "PDF 阅读器";
  }, {
    titleSource: expected.titlePattern.source,
    titleFlags: expected.titlePattern.flags,
    openUrl: expected.openUrl
  }, { timeout: 10000 });
  return page.evaluate(() => ({
    openNewHref: document.querySelector("#libraryReaderOpenNew")?.getAttribute("href") || "",
    embedUrl: document.querySelector("#libraryReaderFrame")?.getAttribute("src") || ""
  }));
}

async function expectLibraryReaderClosed(page) {
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#libraryReaderOverlay");
    return overlay?.classList.contains("hidden")
      && !document.body.classList.contains("library-reader-open");
  }, null, { timeout: 10000 });
}

async function collectLibraryReaderDiagnostics(page) {
  return page.evaluate(() => {
    let cloud = {};
    try {
      cloud = JSON.parse(localStorage.getItem("quantMemoryBoard.cloud.v1") || "{}");
    } catch {
      cloud = {};
    }
    return {
      pathname: window.location.pathname,
      cloud: {
        endpoint: cloud.endpoint || "",
        hasToken: Boolean(cloud.token),
        userId: cloud.userId || ""
      },
      alert: document.querySelector(".library-alert")?.textContent || "",
      overlay: {
        hidden: document.querySelector("#libraryReaderOverlay")?.classList.contains("hidden"),
        opening: document.querySelector("#libraryReaderOverlay")?.classList.contains("is-opening"),
        readerType: document.querySelector("#libraryReaderOverlay")?.getAttribute("data-reader-type") || "",
        bodyOpen: document.body.classList.contains("library-reader-open")
      },
      title: document.querySelector("#libraryReaderTitle")?.textContent || "",
      meta: document.querySelector("#libraryReaderMeta")?.textContent || "",
      openNewHref: document.querySelector("#libraryReaderOpenNew")?.getAttribute("href") || "",
      frameSrc: document.querySelector("#libraryReaderFrame")?.getAttribute("src") || ""
    };
  });
}

async function runCrossModulePrepJourneyFlow(page, baseUrl) {
  const result = { name: "cross-module prep journey persists library, problem, todo, resume, and settings state", status: "pass" };
  const timestamp = Date.now();
  const todoTitle = `Cross-module QuantGuide review ${timestamp}`;
  const resumeText = [
    `Cross-module browser journey ${timestamp}`,
    "Used QuantGuide practice to select an options problem, saved it for review, and added a linked prep task.",
    "Resume note: Python, probability, options pricing, and structured interview preparation."
  ].join("\n");
  const settings = {
    llmEndpoint: "http://127.0.0.1:8789/interview",
    llmModel: "gpt-5-mini",
    cloudEndpoint: "http://127.0.0.1:8799/api",
    googleClientId: "cross-module-browser-smoke.apps.googleusercontent.com"
  };

  try {
    result.step = "practice from Library into Problems";
    await page.goto(`${baseUrl}/library`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#librarySearch", { timeout: 10000 });
    await page.locator('[data-library-kind="questionSet"]').click({ timeout: 10000 });
    await expectLibraryKindSelected(page, "questionSet");
    await page.locator("#librarySearch").fill("QuantGuide");
    await expectLibrarySearchResult(page, {
      includeId: "quantguide",
      includeGrid: "libraryQuestionGrid",
      excludeIds: ["green-book", "probabilitycourse-textbook"]
    });
    await page.locator('#libraryQuestionGrid .library-card[data-library-id="quantguide"] .library-card-actions button').click({ timeout: 10000 });
    await page.waitForURL(/\/problems$/, { timeout: 10000 });
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await expectLibraryPracticeSourceFilter(page, {
      sourceSlug: "quantguide",
      sourceLabel: "QuantGuide"
    });

    result.step = "save a filtered practice problem";
    const firstCard = page.locator("#problemList .problem-card").first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });
    const problemId = await firstCard.getAttribute("data-problem-id");
    const problemTitle = (await firstCard.locator("h3").first().textContent({ timeout: 10000 }) || "").trim();
    if (!problemId) throw new Error("Filtered practice problem did not expose data-problem-id.");
    const saveButton = firstCard.locator(".problem-save-button");
    const alreadySaved = await saveButton.evaluate((button) => button.classList.contains("active"));
    if (!alreadySaved) {
      await saveButton.click({ timeout: 10000 });
      await page.waitForFunction((id) => {
        const card = document.querySelector(`#problemList .problem-card[data-problem-id="${CSS.escape(id)}"]`);
        return card?.querySelector(".problem-save-button")?.classList.contains("active");
      }, problemId, { timeout: 10000 });
    }
    await expectStoredProblemFavorite(page, problemId);

    result.step = "add linked Todo task";
    await ensureTodoDockOpen(page);
    await page.locator("#todoDockAddInput").fill(`${todoTitle}: ${problemTitle || problemId}`.slice(0, 90));
    const storedTodoTitle = await page.locator("#todoDockAddInput").inputValue();
    await page.locator("#todoDockAddInput").press("Enter");
    await expectTodoDockTitleVisible(page, storedTodoTitle);
    await expectStoredTodoTitle(page, storedTodoTitle);

    result.step = "save Resume note";
    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.locator("#resumeText").fill(resumeText);
    await page.locator("#saveResumeBtn").click({ timeout: 10000 });
    await expectStoredResumeText(page, resumeText);

    result.step = "save Settings runtime config";
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await page.locator("#settingsLlmEndpointInput").fill(settings.llmEndpoint);
    await page.locator("#settingsLlmModelInput").selectOption(settings.llmModel);
    await page.locator("#settingsCloudApiInput").fill(settings.cloudEndpoint);
    await page.locator("#settingsGoogleClientIdInput").fill(settings.googleClientId);
    await page.locator("#settingsForm .primary-button").click({ timeout: 10000 });
    await page.waitForFunction(() => /已保存|saved/i.test(document.querySelector("#settingsMessage")?.textContent || ""), null, { timeout: 10000 });

    result.step = "verify persisted state after route reloads";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    const persistedSettings = await readSettingsPersistenceValues(page);
    if (persistedSettings.llmEndpoint !== settings.llmEndpoint) throw new Error(`Cross-module LLM endpoint did not persist: ${persistedSettings.llmEndpoint}`);
    if (persistedSettings.llmModel !== settings.llmModel) throw new Error(`Cross-module LLM model did not persist: ${persistedSettings.llmModel}`);
    if (persistedSettings.cloudEndpoint !== settings.cloudEndpoint) throw new Error(`Cross-module cloud endpoint did not persist: ${persistedSettings.cloudEndpoint}`);
    if (persistedSettings.googleClientId !== settings.googleClientId) throw new Error(`Cross-module Google Client ID did not persist: ${persistedSettings.googleClientId}`);

    await page.goto(`${baseUrl}/problems`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#problemSearch", { timeout: 10000 });
    await page.locator('[data-problem-view="saved"]').click({ timeout: 10000 });
    await expectSavedProblemVisible(page, problemId);

    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, resumeText, { timeout: 10000 });

    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await ensureTodoDockOpen(page);
    await expectTodoDockTitleVisible(page, storedTodoTitle);
    await expectStoredTodoTitle(page, storedTodoTitle);

    delete result.step;
    result.problemId = problemId;
    result.problemTitle = problemTitle;
    result.todoTitle = storedTodoTitle;
    result.resumeTextLength = resumeText.length;
    result.settings = settings;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = `${result.step}: ${error.message}`;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function ensureTodoDockOpen(page) {
  const isOpen = await page.evaluate(() => {
    const panel = document.querySelector("#todoDockPanel");
    return Boolean(panel && !panel.classList.contains("hidden"));
  });
  if (!isOpen) await page.locator("#todoDockButton").click({ timeout: 10000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector("#todoDockPanel");
    return panel && !panel.classList.contains("hidden");
  }, null, { timeout: 10000 });
}

async function expectStoredProblemFavorite(page, problemId) {
  await page.waitForFunction((id) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return (Array.isArray(state.problemStates) ? state.problemStates : [])
        .some((item) => item.problemId === id && item.favorite === true && Boolean(item.lastFavoriteAt));
    } catch {
      return false;
    }
  }, problemId, { timeout: 10000 });
}

async function expectStoredTodoTitle(page, title) {
  await page.waitForFunction((expectedTitle) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const prepTasks = Array.isArray(state.prepPlan?.customTasks) ? state.prepPlan.customTasks : [];
      const studyTasks = Array.isArray(state.studyPlan?.items) ? state.studyPlan.items : [];
      return [...prepTasks, ...studyTasks].some((item) => item.title === expectedTitle);
    } catch {
      return false;
    }
  }, title, { timeout: 10000 });
}

async function expectTodoDockTitleVisible(page, title) {
  await page.waitForFunction((expectedTitle) => {
    return [...document.querySelectorAll("#todoDockList input")]
      .some((input) => input.value === expectedTitle);
  }, title, { timeout: 10000 });
}

async function expectSavedProblemVisible(page, problemId) {
  await page.waitForFunction((id) => {
    const savedTab = document.querySelector('[data-problem-view="saved"]');
    const card = document.querySelector(`#problemList .problem-card[data-problem-id="${CSS.escape(id)}"]`);
    return savedTab?.classList.contains("active")
      && card
      && card.querySelector(".problem-save-button")?.classList.contains("active");
  }, problemId, { timeout: 10000 });
}

async function runCoursesPathSourceAndNoteFlow(page, baseUrl) {
  const result = { name: "courses path, source switch, note, and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const courseId = "course-statquest-ml-stats";
  const title = "StatQuest: Statistics and Machine Learning";
  const note = `Browser smoke course note ${timestamp}`;
  try {
    await page.goto(`${baseUrl}/courses`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`#courseList [data-course-id="${courseId}"]`, { timeout: 10000 });

    const courseCard = page.locator(`#courseList [data-course-id="${courseId}"]`).first();
    await expectCourseOriginalLink(page, { courseId, expectedHref: "https://www.youtube.com/watch?v=oI3hZJqXJuc" });

    await courseCard.locator('[data-course-action="save"]').click({ timeout: 10000 });
    await expectCourseActionActive(page, { courseId, action: "save" });
    await expectStoredCourseState(page, { courseId, saved: true });

    await courseCard.locator('[data-course-action="path"]').click({ timeout: 10000 });
    await expectCourseActionActive(page, { courseId, action: "path" });
    await expectCoursePathItem(page, { courseId, title, done: false });
    await expectStoredCourseState(page, { courseId, saved: true, inPath: true });

    await courseCard.locator('[data-course-action="done"]').click({ timeout: 10000 });
    await expectCourseActionActive(page, { courseId, action: "done" });
    await expectCoursePathItem(page, { courseId, title, done: true });
    await expectStoredCourseState(page, { courseId, saved: true, inPath: true, done: true });

    await page.locator(`textarea[data-course-note="${courseId}"]`).fill(note);
    await expectStoredCourseState(page, { courseId, saved: true, inPath: true, done: true, note });

    const statQuestSource = courseCard.locator('[data-course-action="source"]', { hasText: "StatQuest" }).first();
    const statQuestSourceId = await statQuestSource.getAttribute("data-source-id");
    if (!statQuestSourceId) throw new Error("StatQuest source button did not expose data-source-id.");
    await statQuestSource.click({ timeout: 10000 });
    await expectCourseSourceSelected(page, { courseId, sourceId: statQuestSourceId });
    await expectCourseOriginalLink(page, { courseId, expectedHref: "https://statquest.org/video-index/" });
    await expectCourseFallbackVisible(page, courseId);
    await expectStoredCourseState(page, { courseId, saved: true, inPath: true, done: true, note, selectedSourceId: statQuestSourceId });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector(`#courseList [data-course-id="${courseId}"]`, { timeout: 10000 });
    await expectCourseActionActive(page, { courseId, action: "save" });
    await expectCourseActionActive(page, { courseId, action: "path" });
    await expectCourseActionActive(page, { courseId, action: "done" });
    await expectCoursePathItem(page, { courseId, title, done: true });
    await expectCourseSourceSelected(page, { courseId, sourceId: statQuestSourceId });
    await expectCourseOriginalLink(page, { courseId, expectedHref: "https://statquest.org/video-index/" });
    await expectCourseFallbackVisible(page, courseId);
    await page.waitForFunction(({ courseId: id, note: value }) => {
      return document.querySelector(`textarea[data-course-note="${id}"]`)?.value === value;
    }, { courseId, note }, { timeout: 10000 });
    await expectStoredCourseState(page, { courseId, saved: true, inPath: true, done: true, note, selectedSourceId: statQuestSourceId });

    result.courseId = courseId;
    result.selectedSourceId = statQuestSourceId;
    result.reloaded = true;
    result.notePersisted = true;
    result.pathDonePersisted = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectCourseActionActive(page, expected) {
  await page.waitForFunction(({ courseId, action }) => {
    const button = document.querySelector(`#courseList [data-course-id="${courseId}"][data-course-action="${action}"]`);
    return button?.classList.contains("is-active");
  }, expected, { timeout: 10000 });
}

async function expectCoursePathItem(page, expected) {
  await page.waitForFunction(({ courseId, title, done }) => {
    const item = [...document.querySelectorAll("#coursePathList .course-path-item")]
      .find((node) => node.textContent.includes(title) && node.querySelector(`[data-course-id="${courseId}"]`));
    if (!item) return false;
    return done ? item.classList.contains("is-done") : !item.classList.contains("is-done");
  }, expected, { timeout: 10000 });
}

async function expectCourseSourceSelected(page, expected) {
  await page.waitForFunction(({ courseId, sourceId }) => {
    const selected = document.querySelector(`#courseList [data-course-id="${courseId}"][data-source-id="${sourceId}"]`);
    const sources = [...document.querySelectorAll(`#courseList [data-course-id="${courseId}"][data-course-action="source"]`)];
    return selected?.classList.contains("active")
      && sources.filter((button) => button.classList.contains("active")).length === 1;
  }, expected, { timeout: 10000 });
}

async function expectCourseOriginalLink(page, expected) {
  await page.waitForFunction(({ courseId, expectedHref }) => {
    const link = document.querySelector(`#courseList [data-course-id="${courseId}"] .content-card-link`);
    return link?.getAttribute("href") === expectedHref
      && link?.getAttribute("target") === "_blank"
      && link?.getAttribute("rel") === "noreferrer";
  }, expected, { timeout: 10000 });
}

async function expectCourseFallbackVisible(page, courseId) {
  await page.waitForFunction((id) => {
    const card = document.querySelector(`#courseList [data-course-id="${id}"]`);
    const fallback = card?.querySelector(".course-player-fallback");
    const iframe = card?.querySelector(".course-player iframe");
    return Boolean(fallback && !iframe);
  }, courseId, { timeout: 10000 });
}

async function expectStoredCourseState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const courseState = Array.isArray(state.courseStates)
        ? state.courseStates.find((item) => item.courseId === values.courseId)
        : null;
      if (!courseState) return false;
      for (const key of ["saved", "inPath", "done"]) {
        if (key in values && Boolean(courseState[key]) !== Boolean(values[key])) return false;
      }
      if ("note" in values && courseState.note !== values.note) return false;
      if ("selectedSourceId" in values && courseState.selectedSourceId !== values.selectedSourceId) return false;
      if (values.inPath && !courseState.pathAddedAt) return false;
      if (!courseState.updatedAt) return false;
      return true;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runAccountProfileSaveFlow(page, baseUrl) {
  const result = { name: "account profile save and reload persistence", status: "pass" };
  const timestamp = Date.now();
  const expected = {
    id: "local:browser-route-smoke",
    name: `Browser Smoke ${timestamp}`,
    email: "browser-route-smoke@quantgym.local",
    country: "unitedStates",
    region: "California",
    graduationTerm: "2028-05",
    picture: `https://beta.quantgym.app/chrome-extension-privacy.html?avatar=${timestamp}`
  };
  try {
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });

    await page.locator("#accountNameInput").fill(expected.name);
    await page.locator("#accountAvatarUrl").fill(expected.picture);
    await page.locator("#accountCountrySelect").selectOption(expected.country);
    await page.waitForFunction((region) => {
      return [...document.querySelectorAll("#accountRegionSelect option")]
        .some((option) => option.value === region);
    }, expected.region, { timeout: 10000 });
    await page.locator("#accountRegionSelect").selectOption(expected.region);
    await page.locator("#accountGraduationTermInput").fill(expected.graduationTerm);
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectStoredAccountProfile(page, expected);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await expectAccountFormValues(page, expected);
    await expectStoredAccountProfile(page, expected);

    result.profileName = expected.name;
    result.country = expected.country;
    result.region = expected.region;
    result.graduationTerm = expected.graduationTerm;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function expectAccountFormValues(page, expected) {
  await page.waitForFunction((values) => {
    return document.querySelector("#accountNameInput")?.value === values.name
      && document.querySelector("#accountEmailInput")?.value === values.email
      && document.querySelector("#accountAvatarUrl")?.value === values.picture
      && document.querySelector("#accountCountrySelect")?.value === values.country
      && document.querySelector("#accountRegionSelect")?.value === values.region
      && document.querySelector("#accountGraduationTermInput")?.value === values.graduationTerm
      && document.querySelector("#accountProviderText")?.textContent?.trim() === "Local";
  }, expected, { timeout: 10000 });
}

async function expectStoredAccountProfile(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const account = Array.isArray(auth.accounts)
        ? auth.accounts.find((item) => item.id === values.id)
        : null;
      if (auth.currentUserId !== values.id) return false;
      if (!account) return false;
      const authMatches = account.name === values.name
        && account.email === values.email
        && account.country === values.country
        && account.region === values.region
        && account.graduationTerm === values.graduationTerm
        && account.picture === values.picture
        && Boolean(account.updatedAt);
      const stateRaw = localStorage.getItem(`quantMemoryBoard.userState.v1.${values.id}`) || "{}";
      const state = JSON.parse(stateRaw);
      return authMatches
        && state?.leaderboard?.country === values.country
        && state?.leaderboard?.region === values.region;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runAccountEmailChangeReauthFlow(page, baseUrl) {
  const result = { name: "account local email change requires password and reauthenticates", status: "pass" };
  const timestamp = Date.now();
  const userId = browserSmokeAccount.id;
  const oldEmail = browserSmokeAccount.email;
  const newEmail = `browser-route-smoke+email-${timestamp}@quantgym.local`;
  const password = browserSmokeAccount.password;
  const oldPasswordHash = hashLocalPassword(oldEmail, password);
  const newPasswordHash = hashLocalPassword(newEmail, password);

  try {
    result.step = "open account form";
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await expectStoredLocalAccountEmail(page, {
      userId,
      email: oldEmail,
      passwordHash: oldPasswordHash
    });

    result.step = "reject wrong current password";
    await page.locator("#accountEmailInput").fill(newEmail);
    await page.locator("#accountCurrentPassword").fill("wrong-browser-smoke-password");
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /当前密码不对|Current password is incorrect/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectStoredLocalAccountEmail(page, {
      userId,
      email: oldEmail,
      passwordHash: oldPasswordHash,
      absentEmail: newEmail
    });
    result.wrongPasswordRejected = true;

    result.step = "save email with current password";
    await page.locator("#accountCurrentPassword").fill(password);
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectStoredLocalAccountEmail(page, {
      userId,
      email: newEmail,
      passwordHash: newPasswordHash,
      absentEmail: oldEmail
    });

    result.step = "reload account form with new email";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await page.waitForFunction((email) => document.querySelector("#accountEmailInput")?.value === email, newEmail, { timeout: 10000 });
    await expectStoredLocalAccountEmail(page, {
      userId,
      email: newEmail,
      passwordHash: newPasswordHash,
      absentEmail: oldEmail
    });

    result.step = "logout and reject old email";
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#logoutBtn", { state: "visible", timeout: 10000 });
    await page.locator("#logoutBtn").click({ timeout: 10000 });
    await page.waitForURL(/\/login$/, { timeout: 10000 });
    await page.waitForSelector("#authShell:not(.hidden)", { state: "visible", timeout: 10000 });
    await page.waitForFunction(() => {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      return !auth.currentUserId;
    }, null, { timeout: 10000 });

    await submitLocalLogin(page, oldEmail, password);
    await page.waitForFunction(() => {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const message = document.querySelector("#authMessage")?.textContent || "";
      return !auth.currentUserId && /没有找到这个本地账户|No local account found/i.test(message);
    }, null, { timeout: 10000 });
    result.oldEmailRejected = true;

    result.step = "relogin with new email";
    await submitLocalLogin(page, newEmail, password);
    await waitForAuthenticatedShell(page);
    await expectStoredLocalAccountEmail(page, {
      userId,
      email: newEmail,
      passwordHash: newPasswordHash,
      absentEmail: oldEmail
    });

    result.oldEmail = oldEmail;
    result.newEmail = newEmail;
    result.passwordHashRotated = true;
    result.reloginSucceeded = true;
    result.reloginPath = new URL(page.url()).pathname;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function submitLocalLogin(page, email, password) {
  await page.waitForSelector("#loginEmail", { state: "visible", timeout: 10000 });
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
  await page.waitForSelector("#loginPassword:not(.hidden)", { state: "visible", timeout: 10000 });
  await page.locator("#loginPassword").fill(password);
  await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
}

async function expectStoredLocalAccountEmail(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
      const account = accounts.find((item) => item.id === values.userId);
      const absentAccount = values.absentEmail
        ? accounts.find((item) => item.provider === "local" && item.email === values.absentEmail)
        : null;
      return auth.currentUserId === values.userId
        && account?.provider === "local"
        && account.email === values.email
        && account.passwordHash === values.passwordHash
        && Boolean(account.updatedAt || account.createdAt)
        && !absentAccount;
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runAccountAvatarAndResumeUploadFlow(page, baseUrl) {
  const result = { name: "account avatar upload, clear, and resume file persistence", status: "pass" };
  const timestamp = Date.now();
  const userId = "local:browser-route-smoke";
  const resumeFileName = `browser-smoke-resume-${timestamp}.txt`;
  const resumeText = [
    `Browser smoke uploaded resume ${timestamp}`,
    "Quant developer candidate with Python, pandas, NumPy, backtesting, and risk monitoring projects.",
    "Prepared market-making, options greeks, and probability interview stories."
  ].join("\n");
  const avatarPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );

  try {
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });

    await page.locator("#accountAvatarFile").setInputFiles({
      name: `browser-smoke-avatar-${timestamp}.png`,
      mimeType: "image/png",
      buffer: avatarPng
    });
    await page.waitForFunction(() => {
      const image = document.querySelector("#accountAvatarPreview img");
      return image?.getAttribute("src")?.startsWith("data:image/png;base64,");
    }, null, { timeout: 10000 });
    const avatarDataUrl = await page.locator("#accountAvatarPreview img").getAttribute("src");
    if (!avatarDataUrl?.startsWith("data:image/png;base64,")) throw new Error("Avatar preview did not use an image data URL fallback.");
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectStoredAccountAvatar(page, { userId, avatarDataUrl });

    await page.locator("#accountResumeFile").setInputFiles({
      name: resumeFileName,
      mimeType: "text/plain",
      buffer: Buffer.from(resumeText, "utf8")
    });
    await page.waitForFunction((fileName) => {
      return (document.querySelector("#accountResumeMeta")?.textContent || "").includes(fileName);
    }, resumeFileName, { timeout: 10000 });
    await expectStoredResumeUpload(page, { fileName: resumeFileName, text: resumeText });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await page.waitForFunction(({ fileName, avatar }) => {
      const image = document.querySelector("#accountAvatarPreview img");
      const meta = document.querySelector("#accountResumeMeta")?.textContent || "";
      return image?.getAttribute("src") === avatar && meta.includes(fileName);
    }, { fileName: resumeFileName, avatar: avatarDataUrl }, { timeout: 10000 });
    await expectStoredAccountAvatar(page, { userId, avatarDataUrl });
    await expectStoredResumeUpload(page, { fileName: resumeFileName, text: resumeText });

    await page.locator("#accountClearAvatarBtn").click({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector("#accountAvatarPreview img"), null, { timeout: 10000 });
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectStoredAccountAvatarCleared(page, { userId });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await page.waitForFunction((fileName) => {
      const preview = document.querySelector("#accountAvatarPreview");
      const meta = document.querySelector("#accountResumeMeta")?.textContent || "";
      return preview && !preview.querySelector("img") && meta.includes(fileName);
    }, resumeFileName, { timeout: 10000 });
    await expectStoredAccountAvatarCleared(page, { userId });
    await expectStoredResumeUpload(page, { fileName: resumeFileName, text: resumeText });

    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, resumeText, { timeout: 10000 });

    result.avatarDataUrl = true;
    result.avatarCleared = true;
    result.resumeFileName = resumeFileName;
    result.resumeTextLength = resumeText.length;
    result.reloaded = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileAccountProfileUploadFlow(page, baseUrl) {
  const result = { name: "mobile account profile and upload controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const timestamp = Date.now();
  const resumeFileName = `mobile-account-resume-${timestamp}.txt`;
  const resumeText = [
    `Mobile account resume ${timestamp}`,
    "Quant developer profile checked from a narrow account settings viewport.",
    "Covers profile fields, upload controls, security field layout, and reload persistence."
  ].join("\n");
  const expected = {
    id: "local:browser-route-smoke",
    name: `Mobile Account ${timestamp}`,
    email: "",
    country: "unitedStates",
    region: "New York",
    graduationTerm: "2029-06",
    picture: `https://beta.quantgym.app/chrome-extension-privacy.html?mobile-account-avatar=${timestamp}`
  };

  try {
    result.step = "open mobile account";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await expectMobileAccountState(page);

    result.step = "save profile from mobile form";
    expected.email = await page.locator("#accountEmailInput").inputValue();
    await page.locator("#accountNameInput").fill(expected.name);
    await page.locator("#accountAvatarUrl").fill(expected.picture);
    await page.locator("#accountCountrySelect").selectOption(expected.country);
    await page.waitForFunction((region) => {
      return [...document.querySelectorAll("#accountRegionSelect option")]
        .some((option) => option.value === region);
    }, expected.region, { timeout: 10000 });
    await page.locator("#accountRegionSelect").selectOption(expected.region);
    await page.locator("#accountGraduationTermInput").fill(expected.graduationTerm);
    await page.locator("#accountForm button[type='submit']").click({ timeout: 10000 });
    await page.waitForFunction(() => /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectMobileAccountState(page, { saved: true });
    await expectStoredAccountProfile(page, expected);

    result.step = "upload resume from mobile form";
    await page.locator("#accountResumeFile").setInputFiles({
      name: resumeFileName,
      mimeType: "text/plain",
      buffer: Buffer.from(resumeText, "utf8")
    });
    await page.waitForFunction((fileName) => {
      return (document.querySelector("#accountResumeMeta")?.textContent || "").includes(fileName);
    }, resumeFileName, { timeout: 10000 });
    await expectMobileAccountState(page);
    await expectStoredResumeUpload(page, { fileName: resumeFileName, text: resumeText });

    result.step = "reload mobile account";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#accountForm", { timeout: 10000 });
    await expectMobileAccountState(page);
    await expectAccountFormValues(page, expected);
    await expectStoredAccountProfile(page, expected);
    await expectStoredResumeUpload(page, { fileName: resumeFileName, text: resumeText });

    delete result.step;
    result.mobileViewport = true;
    result.formControlsVisible = true;
    result.securityFieldVisible = true;
    result.uploadControlsVisible = true;
    result.profilePersisted = true;
    result.resumeUploadPersisted = true;
    result.noHorizontalOverflow = true;
    result.reloaded = true;
    result.profileName = expected.name;
    result.resumeFileName = resumeFileName;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileAccountDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function expectMobileAccountState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const laidOut = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4;
    };
    const documentElement = document.documentElement;
    const overflow = Math.max(0, documentElement.scrollWidth - documentElement.clientWidth);
    const formSelectors = [
      "#accountForm",
      "#accountAvatarPreview",
      "#accountAvatarUrl",
      ".avatar-upload",
      "#accountClearAvatarBtn",
      "#accountNameInput",
      "#accountEmailInput",
      "#accountCountrySelect",
      "#accountRegionSelect",
      "#accountGraduationTermInput",
      "#accountResumeFile",
      "#accountResumeMeta",
      "#accountCurrentPassword",
      "#accountForm button[type='submit']",
      ".account-meta-panel",
      "#accountProviderText"
    ];
    const allLaidOut = formSelectors.every((selector) => laidOut(document.querySelector(selector)));
    const savedOk = !values.saved || /账户已更新|account updated/i.test(document.querySelector("#accountMessage")?.textContent || "");
    return window.innerWidth <= 430
      && overflow <= 4
      && allLaidOut
      && savedOk;
  }, expected, { timeout: 10000 });
}

async function collectMobileAccountDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 120)
      };
    };
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      message: document.querySelector("#accountMessage")?.textContent || "",
      accountGrid: rectFor(".account-grid"),
      accountForm: rectFor("#accountForm"),
      avatarRow: rectFor(".account-avatar-row"),
      avatarUrl: rectFor("#accountAvatarUrl"),
      avatarUpload: rectFor(".avatar-upload"),
      clearAvatar: rectFor("#accountClearAvatarBtn"),
      emailInput: rectFor("#accountEmailInput"),
      resumeInput: rectFor("#accountResumeFile"),
      currentPassword: rectFor("#accountCurrentPassword"),
      metaPanel: rectFor(".account-meta-panel")
    };
  });
}

async function expectStoredAccountAvatar(page, expected) {
  await page.waitForFunction(({ userId, avatarDataUrl }) => {
    try {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const account = Array.isArray(auth.accounts)
        ? auth.accounts.find((item) => item.id === userId)
        : null;
      return auth.currentUserId === userId
        && account?.picture === avatarDataUrl
        && account.picture.startsWith("data:image/png;base64,")
        && Boolean(account.updatedAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectStoredAccountAvatarCleared(page, expected) {
  await page.waitForFunction(({ userId }) => {
    try {
      const auth = JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}");
      const account = Array.isArray(auth.accounts)
        ? auth.accounts.find((item) => item.id === userId)
        : null;
      return auth.currentUserId === userId
        && account
        && (account.picture || "") === ""
        && Boolean(account.updatedAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectStoredResumeUpload(page, expected) {
  await page.waitForFunction(({ fileName, text }) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      const resume = state?.resume || {};
      return resume.fileName === fileName
        && resume.fileType === "text/plain"
        && Number(resume.fileSize || 0) >= text.length
        && resume.text === text
        && Boolean(resume.uploadedAt)
        && Boolean(resume.updatedAt);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function runSettingsLanguageSwitchFlow(page, baseUrl) {
  const result = { name: "settings language switch syncs URL and persists reload", status: "pass" };
  try {
    result.step = "open settings in Chinese";
    await page.goto(`${baseUrl}/settings?source=browser-smoke&lang=zh`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.evaluate(() => {
      const current = JSON.parse(localStorage.getItem("quantMemoryBoard.preferences.v1") || "{}");
      localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
        ...current,
        language: "zh",
        sidebarCollapsed: false
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectSettingsLanguageState(page, {
      language: "zh",
      documentLang: "zh-CN",
      heading: "设置",
      saveButtonText: "保存设置",
      messageText: "应用偏好和数据管理。"
    });

    result.step = "switch settings to English";
    await page.locator("#settingsLanguageSelect").selectOption("en");
    await expectSettingsLanguageState(page, {
      language: "en",
      documentLang: "en",
      heading: "Settings",
      saveButtonText: "Save Settings",
      messageText: "App preferences and data management."
    });
    const englishSnapshot = await readSettingsLanguageSnapshot(page);
    if (englishSnapshot.selectedLanguage !== "en") throw new Error(`English select value was ${englishSnapshot.selectedLanguage}`);
    if (englishSnapshot.storedLanguage !== "en") throw new Error(`English language was not stored: ${englishSnapshot.storedLanguage}`);
    if (englishSnapshot.langParam !== "en") throw new Error(`English URL lang was not synced: ${englishSnapshot.langParam}`);
    if (englishSnapshot.sourceParam !== "browser-smoke") throw new Error(`Language URL sync dropped query state: ${englishSnapshot.sourceParam}`);

    result.step = "reload English settings";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectSettingsLanguageState(page, {
      language: "en",
      documentLang: "en",
      heading: "Settings",
      saveButtonText: "Save Settings",
      messageText: "App preferences and data management."
    });

    result.step = "switch settings back to Chinese";
    await page.locator("#settingsLanguageSelect").selectOption("zh");
    await expectSettingsLanguageState(page, {
      language: "zh",
      documentLang: "zh-CN",
      heading: "设置",
      saveButtonText: "保存设置",
      messageText: "应用偏好和数据管理。"
    });
    const chineseSnapshot = await readSettingsLanguageSnapshot(page);
    if (chineseSnapshot.langParam !== "zh") throw new Error(`Chinese URL lang was not restored: ${chineseSnapshot.langParam}`);
    if (chineseSnapshot.storedLanguage !== "zh") throw new Error(`Chinese language was not stored: ${chineseSnapshot.storedLanguage}`);

    delete result.step;
    result.englishSelected = true;
    result.englishUrlSynced = true;
    result.queryPreserved = true;
    result.englishReloadPersisted = true;
    result.zhRestored = true;
    result.statusMessageTranslated = true;
    result.appShellVisible = true;
    result.snapshots = {
      english: englishSnapshot,
      chinese: chineseSnapshot
    };
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectSettingsLanguageDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runSettingsPersistenceFlow(page, baseUrl) {
  const result = { name: "settings saves runtime config, clears Google Client ID, and reloads", status: "pass" };
  const llmEndpoint = "http://127.0.0.1:8788/interview?browser-smoke=settings";
  const cloudEndpoint = "http://127.0.0.1:8798/api";
  const googleClientId = "browser-route-smoke.apps.googleusercontent.com";
  const model = "gpt-5-mini";
  try {
    result.step = "save runtime config";
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await page.locator("#settingsLlmEndpointInput").fill(llmEndpoint);
    await page.locator("#settingsLlmModelInput").selectOption(model);
    await page.locator("#settingsCloudApiInput").fill(cloudEndpoint);
    await page.locator("#settingsGoogleClientIdInput").fill(googleClientId);
    await page.locator("#settingsForm .primary-button").click({ timeout: 10000 });
    await page.waitForFunction(() => /已保存|saved/i.test(document.querySelector("#settingsMessage")?.textContent || ""), null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    const values = await readSettingsPersistenceValues(page);
    if (values.llmEndpoint !== llmEndpoint) throw new Error(`LLM endpoint did not persist after reload: ${values.llmEndpoint}`);
    if (values.llmModel !== model) throw new Error(`LLM model did not persist after reload: ${values.llmModel}`);
    if (values.cloudEndpoint !== cloudEndpoint) throw new Error(`Cloud endpoint did not persist after reload: ${values.cloudEndpoint}`);
    if (values.googleClientId !== googleClientId) throw new Error(`Google Client ID did not persist after reload: ${values.googleClientId}`);
    if (values.storedLlm.endpoint !== llmEndpoint || values.storedLlm.model !== model) throw new Error("Stored LLM config does not match the settings form.");
    if (values.storedCloud.endpoint !== cloudEndpoint) throw new Error("Stored cloud endpoint does not match the settings form.");
    if (values.storedAuth.googleClientId !== googleClientId) throw new Error("Stored Google Client ID does not match the settings form.");
    result.persisted = {
      llmEndpoint,
      llmModel: model,
      cloudEndpoint,
      googleClientId
    };

    result.step = "clear Google Client ID";
    await page.locator("#settingsGoogleClientIdInput").fill("");
    await page.locator("#settingsForm").evaluate((form) => form.requestSubmit());
    await page.waitForFunction(() => /已保存|saved/i.test(document.querySelector("#settingsMessage")?.textContent || ""), null, { timeout: 10000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    const clearedValues = await readSettingsPersistenceValues(page);
    if (clearedValues.llmEndpoint !== llmEndpoint) throw new Error(`LLM endpoint changed while clearing Google Client ID: ${clearedValues.llmEndpoint}`);
    if (clearedValues.llmModel !== model) throw new Error(`LLM model changed while clearing Google Client ID: ${clearedValues.llmModel}`);
    if (clearedValues.cloudEndpoint !== cloudEndpoint) throw new Error(`Cloud endpoint changed while clearing Google Client ID: ${clearedValues.cloudEndpoint}`);
    if (clearedValues.googleClientId !== "") throw new Error(`Google Client ID form value did not clear: ${clearedValues.googleClientId}`);
    if ((clearedValues.storedAuth.googleClientId || "") !== "") throw new Error("Stored Google Client ID did not clear.");
    result.googleClientIdCleared = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runSettingsBackupImportResetFlow(page, baseUrl) {
  const result = { name: "settings backup export, import, and reset state", status: "pass" };
  const timestamp = Date.now();
  const importedResume = {
    text: [
      `Settings backup imported resume ${timestamp}`,
      "Recovered quant resume content from a browser-route-smoke backup file.",
      "Includes Python, options risk, market making, and production monitoring bullets."
    ].join("\n"),
    review: [`Imported backup review ${timestamp}`],
    fileName: `settings-imported-resume-${timestamp}.txt`,
    fileType: "text/plain",
    fileSize: 128,
    uploadedAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString()
  };
  const importedResource = {
    id: `settings-imported-resource-${timestamp}`,
    title: `Settings imported resource ${timestamp}`,
    type: "note",
    content: "Imported from Settings backup smoke.",
    date: new Date(timestamp).toISOString()
  };
  const importedCourseState = {
    courseId: `settings-imported-course-${timestamp}`,
    saved: true,
    inPath: true,
    done: false,
    note: `Settings imported course note ${timestamp}`,
    selectedSourceId: "backup-smoke",
    pathAddedAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString()
  };

  try {
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator("#exportBtn").click({ timeout: 10000 })
    ]);
    const exportedPath = await download.path();
    if (!exportedPath) throw new Error("Settings export did not produce a readable download path.");
    const exportedBackup = JSON.parse(fs.readFileSync(exportedPath, "utf8"));
    const exportedFilename = download.suggestedFilename();
    if (!/\.json$/i.test(exportedFilename)) throw new Error(`Settings export filename is not JSON: ${exportedFilename}`);
    if (exportedBackup.version !== 2) throw new Error(`Settings export version should be 2, got ${exportedBackup.version}.`);
    if (!exportedBackup.exportedAt) throw new Error("Settings export is missing exportedAt.");
    if (!exportedBackup.user?.email) throw new Error("Settings export is missing user email metadata.");
    if (!exportedBackup.state || typeof exportedBackup.state !== "object") throw new Error("Settings export is missing state payload.");

    const importedBackup = {
      version: 2,
      exportedAt: new Date(timestamp).toISOString(),
      user: exportedBackup.user,
      state: {
        ...exportedBackup.state,
        resume: importedResume,
        resources: [
          ...(Array.isArray(exportedBackup.state.resources) ? exportedBackup.state.resources : []),
          importedResource
        ],
        courseStates: [
          ...(Array.isArray(exportedBackup.state.courseStates) ? exportedBackup.state.courseStates : []),
          importedCourseState
        ]
      }
    };

    await page.locator("#importInput").setInputFiles({
      name: `settings-import-backup-${timestamp}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedBackup), "utf8")
    });
    await expectStoredImportedBackupState(page, {
      resumeText: importedResume.text,
      resumeFileName: importedResume.fileName,
      resourceId: importedResource.id,
      courseId: importedCourseState.courseId
    });

    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    await page.waitForFunction((text) => document.querySelector("#resumeText")?.value === text, importedResume.text, { timeout: 10000 });

    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    const dialogPromise = page.waitForEvent("dialog", { timeout: 10000 }).then(async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    });
    await Promise.all([
      dialogPromise,
      page.locator("#resetBtn").click({ timeout: 10000 })
    ]).then(([message]) => {
      result.resetPrompt = message;
    });
    await expectResetClearedImportedBackupState(page, {
      resumeText: importedResume.text,
      resourceId: importedResource.id,
      courseId: importedCourseState.courseId
    });

    await page.goto(`${baseUrl}/resume`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#resumeText", { timeout: 10000 });
    const resetResumeText = await page.locator("#resumeText").inputValue();
    if (resetResumeText.includes(importedResume.text)) throw new Error("Settings reset did not clear imported resume text.");

    result.exportedFilename = exportedFilename;
    result.importedResumeFile = importedResume.fileName;
    result.importedResourceId = importedResource.id;
    result.importedCourseId = importedCourseState.courseId;
    result.resetClearedImport = true;
  } catch (error) {
    result.status = "fail";
    result.error = error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runSettingsInvalidBackupGuardFlow(page, baseUrl) {
  const result = { name: "settings rejects invalid backup files without changing state", status: "pass" };
  const timestamp = Date.now();
  const expected = {
    resumeText: `Settings invalid backup guard resume ${timestamp}`,
    resumeFileName: `settings-invalid-backup-guard-${timestamp}.txt`,
    resourceId: `settings-invalid-backup-guard-resource-${timestamp}`,
    courseId: `settings-invalid-backup-guard-course-${timestamp}`
  };

  try {
    result.step = "seed sentinel state";
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await page.evaluate((values) => {
      const key = "quantMemoryBoard.userState.v1.local:browser-route-smoke";
      const current = JSON.parse(localStorage.getItem(key) || "{}");
      const next = {
        ...current,
        resume: {
          ...(current.resume || {}),
          text: values.resumeText,
          fileName: values.resumeFileName,
          fileType: "text/plain",
          fileSize: values.resumeText.length,
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        resources: [
          ...(Array.isArray(current.resources) ? current.resources.filter((item) => item?.id !== values.resourceId) : []),
          {
            id: values.resourceId,
            title: "Settings invalid backup guard resource",
            type: "note",
            content: "This resource must survive rejected backup imports.",
            date: new Date().toISOString()
          }
        ],
        courseStates: [
          ...(Array.isArray(current.courseStates) ? current.courseStates.filter((item) => item?.courseId !== values.courseId) : []),
          {
            courseId: values.courseId,
            saved: true,
            inPath: true,
            done: false,
            note: "This course state must survive rejected backup imports.",
            selectedSourceId: "invalid-backup-guard",
            updatedAt: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(next));
    }, expected);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectStoredInvalidBackupGuardState(page, expected);

    result.step = "reject malformed JSON backup";
    const malformedMessage = await importInvalidSettingsBackupAndAcceptAlert(page, {
      name: `settings-invalid-json-${timestamp}.json`,
      buffer: Buffer.from("{\"version\":2,\"state\":", "utf8")
    });
    if (!/备份文件无法读取|backup file/i.test(malformedMessage)) {
      throw new Error(`Unexpected malformed backup alert: ${malformedMessage}`);
    }
    await expectStoredInvalidBackupGuardState(page, expected);
    result.malformedJsonRejected = true;

    result.step = "reject non-object JSON backup";
    const arrayMessage = await importInvalidSettingsBackupAndAcceptAlert(page, {
      name: `settings-array-backup-${timestamp}.json`,
      buffer: Buffer.from(JSON.stringify([{ resume: { text: "array backup should not import" } }]), "utf8")
    });
    if (!/备份文件无法读取|backup file/i.test(arrayMessage)) {
      throw new Error(`Unexpected array backup alert: ${arrayMessage}`);
    }
    await expectStoredInvalidBackupGuardState(page, expected);
    result.nonObjectJsonRejected = true;
    result.statePreserved = true;
    delete result.step;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    fail(`${result.name} failed: ${error.message}`);
  }
  return result;
}

async function runMobileSettingsConfigBackupControlsFlow(page, baseUrl) {
  const result = { name: "mobile settings config and backup controls avoid overflow", status: "pass" };
  const desktopViewport = { width: 1365, height: 900 };
  const timestamp = Date.now();
  const llmEndpoint = `http://127.0.0.1:8788/interview?browser-smoke=mobile-settings-${timestamp}`;
  const cloudEndpoint = "http://127.0.0.1:8798/api";
  const googleClientId = `mobile-settings-${timestamp}.apps.googleusercontent.com`;
  const model = "gpt-5-mini";
  try {
    result.step = "open mobile settings";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectMobileSettingsState(page);

    result.step = "save long runtime settings";
    await page.locator("#settingsLlmEndpointInput").fill(llmEndpoint);
    await page.locator("#settingsLlmModelInput").selectOption(model);
    await page.locator("#settingsCloudApiInput").fill(cloudEndpoint);
    await page.locator("#settingsGoogleClientIdInput").fill(googleClientId);
    await page.locator("#settingsForm .primary-button").click({ timeout: 10000 });
    await page.waitForFunction(() => /已保存|saved/i.test(document.querySelector("#settingsMessage")?.textContent || ""), null, { timeout: 10000 });
    await expectMobileSettingsState(page, { saved: true });

    result.step = "export backup from mobile controls";
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.locator("#exportBtn").click({ timeout: 10000 })
    ]);
    const exportedFilename = download.suggestedFilename();
    if (!/\.json$/i.test(exportedFilename)) throw new Error(`Mobile Settings export filename is not JSON: ${exportedFilename}`);

    result.step = "reload mobile settings";
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await waitForAuthenticatedShell(page);
    await page.waitForSelector("#settingsForm", { timeout: 10000 });
    await expectMobileSettingsState(page);
    const values = await readSettingsPersistenceValues(page);
    if (values.llmEndpoint !== llmEndpoint) throw new Error(`Mobile Settings LLM endpoint did not persist: ${values.llmEndpoint}`);
    if (values.llmModel !== model) throw new Error(`Mobile Settings LLM model did not persist: ${values.llmModel}`);
    if (values.cloudEndpoint !== cloudEndpoint) throw new Error(`Mobile Settings cloud endpoint did not persist: ${values.cloudEndpoint}`);
    if (values.googleClientId !== googleClientId) throw new Error(`Mobile Settings Google Client ID did not persist: ${values.googleClientId}`);

    delete result.step;
    result.mobileViewport = true;
    result.formControlsVisible = true;
    result.dataActionsVisible = true;
    result.longConfigPersisted = true;
    result.exportDownloadWorks = true;
    result.noHorizontalOverflow = true;
    result.reloaded = true;
    result.exportedFilename = exportedFilename;
  } catch (error) {
    result.status = "fail";
    result.error = result.step ? `${result.step}: ${error.message}` : error.message;
    result.diagnostics = await collectMobileSettingsDiagnostics(page).catch((diagnosticError) => ({
      error: diagnosticError?.message || String(diagnosticError)
    }));
    fail(`${result.name} failed: ${error.message}`);
  } finally {
    await page.setViewportSize(desktopViewport).catch(() => {});
  }
  return result;
}

async function readSettingsPersistenceValues(page) {
  return page.evaluate(() => ({
    llmEndpoint: document.querySelector("#settingsLlmEndpointInput")?.value || "",
    llmModel: document.querySelector("#settingsLlmModelInput")?.value || "",
    cloudEndpoint: document.querySelector("#settingsCloudApiInput")?.value || "",
    googleClientId: document.querySelector("#settingsGoogleClientIdInput")?.value || "",
    storedLlm: JSON.parse(localStorage.getItem("quantMemoryBoard.llm.v1") || "{}"),
    storedCloud: JSON.parse(localStorage.getItem("quantMemoryBoard.cloud.v1") || "{}"),
    storedAuth: JSON.parse(localStorage.getItem("quantMemoryBoard.auth.v1") || "{}")
  }));
}

async function expectSettingsLanguageState(page, expected) {
  await page.waitForFunction((values) => {
    const readPrefs = () => {
      try {
        return JSON.parse(localStorage.getItem("quantMemoryBoard.preferences.v1") || "{}");
      } catch {
        return {};
      }
    };
    const url = new URL(window.location.href);
    const saveText = document.querySelector("#settingsForm .primary-button")?.textContent || "";
    const heading = document.querySelector(".settings-section h2")?.textContent || "";
    const messageText = document.querySelector("#settingsMessage")?.textContent || "";
    const appShell = document.querySelector("#appShell");
    const authShell = document.querySelector("#authShell");
    return document.querySelector("#settingsLanguageSelect")?.value === values.language
      && readPrefs().language === values.language
      && url.pathname === "/settings"
      && url.searchParams.get("lang") === values.language
      && url.searchParams.get("source") === "browser-smoke"
      && document.documentElement.lang === values.documentLang
      && heading.includes(values.heading)
      && saveText.includes(values.saveButtonText)
      && messageText.includes(values.messageText)
      && Boolean(appShell && !appShell.classList.contains("hidden"))
      && !Boolean(authShell && !authShell.classList.contains("hidden"));
  }, expected, { timeout: 10000 });
}

async function readSettingsLanguageSnapshot(page) {
  return page.evaluate(() => {
    let prefs = {};
    try {
      prefs = JSON.parse(localStorage.getItem("quantMemoryBoard.preferences.v1") || "{}");
    } catch {
      prefs = {};
    }
    const url = new URL(window.location.href);
    const appShell = document.querySelector("#appShell");
    const authShell = document.querySelector("#authShell");
    return {
      pathname: url.pathname,
      langParam: url.searchParams.get("lang") || "",
      sourceParam: url.searchParams.get("source") || "",
      selectedLanguage: document.querySelector("#settingsLanguageSelect")?.value || "",
      storedLanguage: prefs.language || "",
      documentLang: document.documentElement.lang || "",
      heading: (document.querySelector(".settings-section h2")?.textContent || "").trim(),
      saveButtonText: (document.querySelector("#settingsForm .primary-button")?.textContent || "").replace(/\s+/g, " ").trim(),
      settingsMessage: (document.querySelector("#settingsMessage")?.textContent || "").trim(),
      appShellVisible: Boolean(appShell && !appShell.classList.contains("hidden")),
      authShellVisible: Boolean(authShell && !authShell.classList.contains("hidden")),
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
  });
}

async function collectSettingsLanguageDiagnostics(page) {
  return readSettingsLanguageSnapshot(page);
}

async function expectMobileSettingsState(page, expected = {}) {
  await page.waitForFunction((values) => {
    const visible = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -1
        && rect.right <= window.innerWidth + 4
        && rect.bottom > 0;
    };
    const documentElement = document.documentElement;
    const overflow = Math.max(0, documentElement.scrollWidth - documentElement.clientWidth);
    const selectors = [
      "#settingsForm",
      "#settingsLanguageSelect",
      "#settingsCountrySelect",
      "#settingsRegionSelect",
      "#settingsLlmEndpointInput",
      "#settingsLlmModelInput",
      "#settingsCloudApiInput",
      "#settingsGoogleClientIdInput",
      "#settingsForm .primary-button",
      "#exportBtn",
      ".settings-file-button",
      "#resetBtn",
      "#syncCloudBtn",
      "#logoutBtn"
    ];
    const allVisible = selectors.every((selector) => visible(document.querySelector(selector)));
    const savedOk = !values.saved || /已保存|saved/i.test(document.querySelector("#settingsMessage")?.textContent || "");
    return window.innerWidth <= 430
      && overflow <= 4
      && allVisible
      && savedOk;
  }, expected, { timeout: 10000 });
}

async function collectMobileSettingsDiagnostics(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (node.textContent || node.value || "").replace(/\s+/g, " ").trim().slice(0, 120)
      };
    };
    return {
      pathname: window.location.pathname,
      width: window.innerWidth,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      message: document.querySelector("#settingsMessage")?.textContent || "",
      settingsGrid: rectFor(".settings-grid"),
      settingsForm: rectFor("#settingsForm"),
      dataPanel: rectFor(".settings-panel:nth-of-type(2)"),
      llmEndpointInput: rectFor("#settingsLlmEndpointInput"),
      googleClientIdInput: rectFor("#settingsGoogleClientIdInput"),
      exportBtn: rectFor("#exportBtn"),
      importButton: rectFor(".settings-file-button"),
      resetBtn: rectFor("#resetBtn")
    };
  });
}

async function expectStoredImportedBackupState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return state.resume?.text === values.resumeText
        && state.resume?.fileName === values.resumeFileName
        && (state.resources || []).some((item) => item.id === values.resourceId)
        && (state.courseStates || []).some((item) => item.courseId === values.courseId);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function expectResetClearedImportedBackupState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const raw = localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke");
      if (!raw) return true;
      const state = JSON.parse(raw);
      return state.resume?.text !== values.resumeText
        && !(state.resources || []).some((item) => item.id === values.resourceId)
        && !(state.courseStates || []).some((item) => item.courseId === values.courseId);
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function importInvalidSettingsBackupAndAcceptAlert(page, file) {
  const dialogPromise = page.waitForEvent("dialog", { timeout: 10000 }).then(async (dialog) => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  await page.locator("#importInput").setInputFiles({
    name: file.name,
    mimeType: "application/json",
    buffer: file.buffer
  });
  return dialogPromise;
}

async function expectStoredInvalidBackupGuardState(page, expected) {
  await page.waitForFunction((values) => {
    try {
      const state = JSON.parse(localStorage.getItem("quantMemoryBoard.userState.v1.local:browser-route-smoke") || "{}");
      return state.resume?.text === values.resumeText
        && state.resume?.fileName === values.resumeFileName
        && (state.resources || []).some((item) => item.id === values.resourceId)
        && (state.courseStates || []).some((item) => item.courseId === values.courseId)
        && !(state.resources || []).some((item) => item?.title === "array backup should not import")
        && state.resume?.text !== "array backup should not import";
    } catch {
      return false;
    }
  }, expected, { timeout: 10000 });
}

async function waitForAuthenticatedShell(page) {
  await page.waitForSelector("#appShell:not(.hidden)", { timeout: 15000 });
  await page.waitForTimeout(150);
}

async function getRouteHealth(page) {
  return page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const appShell = document.querySelector("#appShell");
    const authShell = document.querySelector("#authShell");
    const overlay = document.querySelector("vite-error-overlay, .vite-error-overlay, [data-vite-dev-id]");
    return {
      appShellVisible: Boolean(appShell && !appShell.classList.contains("hidden")),
      authShellVisible: Boolean(authShell && !authShell.classList.contains("hidden")),
      overlayVisible: Boolean(overlay),
      bodyTextLength: (body?.innerText || "").trim().length,
      horizontalOverflowPx: Math.max(0, documentElement.scrollWidth - documentElement.clientWidth),
      pathname: window.location.pathname
    };
  });
}

function attachPageCollectors(page, baseUrl) {
  const ownOrigin = new URL(baseUrl).origin;
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon\.ico/i.test(text)) return;
    if (/Failed to load resource: net::ERR_CONNECTION_REFUSED/i.test(text)) return;
    if (/Failed to load resource: the server responded with a status of 403/i.test(text)) return;
    if (/\[GSI_LOGGER\]|origin is not allowed for the given client ID/i.test(text)) return;
    if (/\[QuantGym\] Failed to import backup/i.test(text)) return;
    if (/@bilibili\/bili-user-fingerprint\(report\): report is not found/i.test(text)) return;
    if (isIgnoredThirdPartyConsoleError(text)) {
      ignoredConsoleErrors.push({ type: message.type(), text: text.slice(0, 500) });
      return;
    }
    consoleErrors.push({ type: message.type(), text: text.slice(0, 500) });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.stack || error?.message || error).slice(0, 1200));
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.startsWith(ownOrigin)) return;
    if (/\/favicon\.ico($|\?)/.test(url)) return;
    if (response.status() >= 400) {
      responseErrors.push({ status: response.status(), url });
    }
  });
}

function isIgnoredThirdPartyConsoleError(text) {
  const bilibiliReporterError = /\[reporter-pb\]: request error TypeError: Failed to fetch/i.test(text)
    && (
      /https:\/\/s1\.hdslb\.com\/bfs\/seed\/jinkela\/short\/reporter-pb\/index\.js/i.test(text)
      || /^\[reporter-pb\]: request error TypeError: Failed to fetch(?:\s|$)/i.test(text)
    );
  const chromeComputePressurePolicyNoise = /^Permissions policy violation: compute-pressure is not allowed in this document\.$/.test(text);
  return bilibiliReporterError || chromeComputePressurePolicyNoise;
}

function seedAuthenticatedStorage(config = {}) {
  let storage = null;
  try {
    storage = globalThis.localStorage || null;
  } catch {
    storage = null;
  }
  if (!storage?.getItem || !storage?.setItem) return;

  const accountId = config.id || "local:browser-route-smoke";
  const accountEmail = config.email || "browser-route-smoke@quantgym.local";
  const accountPasswordHash = config.passwordHash || "6246e686ac437c36bc94b6bd3b6cf9e578267cad791c8b2c1ea13e286b011f92";
  const account = {
    id: accountId,
    provider: "local",
    name: "Browser Route Smoke",
    email: accountEmail,
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: accountPasswordHash,
    createdAt: "2026-06-17T00:00:00.000Z"
  };
  const existingAuth = JSON.parse(storage.getItem("quantMemoryBoard.auth.v1") || "{}");
  storage.setItem("quantMemoryBoard.auth.v1", JSON.stringify({
    ...existingAuth,
    accounts: Array.isArray(existingAuth.accounts) && existingAuth.accounts.length ? existingAuth.accounts : [account],
    currentUserId: existingAuth.currentUserId || account.id,
    lastAuthenticatedAt: existingAuth.lastAuthenticatedAt || "2026-06-17T00:00:00.000Z"
  }));
  if (!storage.getItem("quantMemoryBoard.preferences.v1")) {
    storage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
      language: "zh",
      sidebarCollapsed: false
    }));
  }
}

function hashLocalPassword(email, password) {
  return createHash("sha256")
    .update(`${String(email || "").trim().toLowerCase()}:${String(password || "")}`)
    .digest("hex");
}

function buildStaticSite(distDir) {
  const build = spawnSync(process.execPath, ["scripts/build-static-site.mjs"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    env: {
      ...process.env,
      QUANTGYM_WEB_DIST: distDir,
      QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: "0"
    }
  });
  if (build.status !== 0) {
    throw new Error(`Static build failed:\n${tail(build.stdout)}\n${tail(build.stderr)}`);
  }
}

async function startPreviewServer({ distDir, port }) {
  const viteBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
  const child = spawn(viteBin, ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      QUANTGYM_WEB_DIST: distDir
    }
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("exit", (code) => {
    if (code && !process.exitCode) {
      warnings.push(`Vite preview exited with ${code}: ${tail(stderr || stdout)}`);
    }
  });
  await waitForHttp(`http://127.0.0.1:${port}/`, () => {
    if (child.exitCode !== null) {
      throw new Error(`Vite preview exited before it became ready:\n${tail(stdout)}\n${tail(stderr)}`);
    }
  });
  return child;
}

async function waitForHttp(url, checkProcess) {
  const deadline = Date.now() + 20000;
  let lastError = "";
  while (Date.now() < deadline) {
    checkProcess?.();
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function findChromeExecutable() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function fail(message) {
  failures.push(message);
}

function logProgress(message) {
  if (quietProgress) return;
  process.stderr.write(`[browser-route-smoke ${formatElapsed(Date.now() - startedAt)}] ${message}\n`);
}

async function closeWithTimeout(label, close, timeoutMs) {
  let timer = null;
  try {
    await Promise.race([
      Promise.resolve().then(close),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} cleanup timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
    return true;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function formatElapsed(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function tail(text, max = 2000) {
  const value = String(text || "").trim();
  return value.length > max ? value.slice(-max) : value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
