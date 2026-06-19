#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const baseUrl = trimSlash(getArgValue("--base-url") || process.env.QUANTGYM_BETA_SMOKE_BASE_URL || "https://beta.quantgym.app");
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/352-deployed-beta-mobile-content-smoke-summary.json"
);
const chromePath = process.env.CHROME_PATH || findChromeExecutable();
const startedAt = Date.now();

const summary = {
  status: "pass",
  surface: "deployed beta mobile content smoke",
  baseUrl,
  authMode: "isolated local browser state",
  viewport: { width: 390, height: 844 },
  config: {},
  checkpoints: [],
  checks: {},
  errors: {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    ignored: []
  },
  durationMs: 0
};

let browser;
try {
  assert(chromePath, "Google Chrome executable was not found. Set CHROME_PATH to run this check.");

  const { chromium } = await import("playwright-core");
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"]
  });
  const context = await browser.newContext({
    viewport: summary.viewport,
    locale: "zh-CN"
  });
  await context.addInitScript(seedIsolatedAuth);
  const page = await context.newPage();
  attachCollectors(page);

  await runMobileContentFlow(page);
  finalizeChecks();
  await context.close();
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

async function runMobileContentFlow(page) {
  const timestamp = Date.now();
  const experience = {
    firm: `Mobile Live Smoke Firm ${timestamp}`,
    role: "Quant Developer",
    stage: "Technical Interview",
    season: "2028 Summer",
    date: "2026-06-19",
    outcome: "Advanced",
    tags: "mobile-live-smoke, systems",
    summary: `Mobile live experience summary ${timestamp}`,
    topics: `Mobile live systems topic ${timestamp}`,
    reflection: `Mobile live reflection ${timestamp}`
  };
  const news = {
    title: `Mobile Live Smoke official update ${timestamp}`,
    source: "Jane Street Careers",
    sourceUrl: "https://www.janestreet.com/join-jane-street/open-roles/",
    sourceType: "official",
    primarySkill: "market",
    tags: "mobile-live-smoke, official, recruiting",
    summary: `Mobile live news summary ${timestamp}`,
    insight: `Mobile live news insight ${timestamp}`
  };

  await page.goto(`${baseUrl}/experiences`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForShell(page);
  summary.config = await readRuntimeConfig(page);
  await page.waitForSelector("#experienceForm", { timeout: 15000 });
  await expectMobile(page, "experiences-open", ["#experienceForm", "#experienceFirm", "#experienceFilter", "#experienceList"]);

  await page.locator("#experienceFirm").fill(experience.firm);
  await page.locator("#experienceRole").selectOption(experience.role);
  await page.locator("#experienceStage").selectOption(experience.stage);
  await page.locator("#experienceSeason").selectOption(experience.season);
  await page.locator("#experienceDate").fill(experience.date);
  await page.locator("#experienceOutcome").selectOption(experience.outcome);
  await page.locator("#experienceTags").fill(experience.tags);
  await page.locator("#experienceSummaryInput").fill(experience.summary);
  await page.locator("#experienceTopics").fill(experience.topics);
  await page.locator("#experienceReflection").fill(experience.reflection);
  await page.locator("#experienceForm").evaluate((form) => form.requestSubmit());

  const experienceCard = page.locator(".experience-card", { hasText: experience.firm }).first();
  await experienceCard.waitFor({ state: "visible", timeout: 15000 });
  const recordId = await experienceCard.getAttribute("data-experience-id");
  if (!recordId) throw new Error("Saved experience card had no data-experience-id.");

  await page.locator("#experienceFilter").selectOption(experience.stage);
  await page.waitForSelector(`[data-experience-id="${recordId}"]`, { timeout: 10000 });
  await expectMobile(page, "experiences-filtered", ["#experienceFilter", `[data-experience-id="${recordId}"]`]);

  await page.locator(`[data-experience-id="${recordId}"] .experience-share-row button`).click({ timeout: 10000 });
  await page.waitForSelector(`[data-experience-id="${recordId}"] .experience-share-confirm`, { timeout: 10000 });
  await expectMobile(page, "experiences-share-confirm", [".experience-share-confirm"]);
  await page.locator(`[data-experience-id="${recordId}"] .experience-share-confirm .primary-button`).click({ timeout: 10000 });
  await page.waitForURL(/\/community$/, { timeout: 15000 });
  await waitForShell(page);
  await page.waitForSelector("#communityForm", { state: "visible", timeout: 15000 });
  await page.waitForSelector("#communityList", { state: "visible", timeout: 15000 });
  await page.waitForFunction((firm) => document.body.textContent.includes(firm), experience.firm, { timeout: 15000 });
  await expectMobile(page, "community-after-share", ["#communityForm", "#communityList"]);

  await page.goto(`${baseUrl}/news`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForShell(page);
  await page.waitForSelector("#newsList", { timeout: 15000 });
  await expectMobile(page, "news-open", ["#addNewsBtn", "#newsTopicFilter", "#newsSourceFilter", "#newsList"]);

  await page.locator("#addNewsBtn").click({ timeout: 10000 });
  await page.waitForSelector("#newsForm", { timeout: 10000 });
  await expectMobile(page, "news-form", ["#newsForm", "#newsTitle", "#newsSummary", "#newsInsight"]);
  await page.locator("#newsTitle").fill(news.title);
  await page.locator("#newsSource").fill(news.source);
  await page.locator("#newsUrl").fill(news.sourceUrl);
  await page.locator("#newsSourceType").selectOption(news.sourceType);
  await page.locator("#newsPrimarySkill").selectOption(news.primarySkill);
  await page.locator("#newsTags").fill(news.tags);
  await page.locator("#newsSummary").fill(news.summary);
  await page.locator("#newsInsight").fill(news.insight);
  await page.locator("#newsForm").evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() => !document.querySelector("#newsForm"), null, { timeout: 10000 });

  const newsCard = page.locator(".news-card", { hasText: news.title }).first();
  await newsCard.waitFor({ state: "visible", timeout: 15000 });
  const newsId = await newsCard.getAttribute("data-news-id");
  if (!newsId) throw new Error("Saved news card had no data-news-id.");

  await page.locator('[data-news-source-filter="official"]').click({ timeout: 10000 });
  await page.waitForSelector(`[data-news-id="${newsId}"]`, { timeout: 10000 });
  await page.locator('[data-news-topic="quantFirms"]').click({ timeout: 10000 });
  await page.waitForSelector(`[data-news-id="${newsId}"]`, { timeout: 10000 });
  await expectMobile(page, "news-filtered", ["#newsTopicFilter", "#newsSourceFilter", `[data-news-id="${newsId}"]`]);

  await page.locator(`[data-news-id="${newsId}"]`).click({ timeout: 10000 });
  await page.waitForSelector("#newsDetail", { timeout: 10000 });
  await page.waitForFunction((title) => (
    document.querySelector("#newsDetailTitle")?.textContent?.includes(title)
  ), news.title, { timeout: 10000 });
  await expectMobile(page, "news-detail", ["#newsDetail", "#newsBackBtn", "#newsDetailTitle"]);
  await page.locator("#newsBackBtn").click({ timeout: 10000 });
  await page.waitForFunction((id) => (
    document.querySelector(`[data-news-id="${id}"]`)?.classList.contains("read")
  ), newsId, { timeout: 10000 });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForShell(page);
  await page.waitForFunction((id) => (
    document.querySelector(`[data-news-id="${id}"]`)?.classList.contains("read")
  ), newsId, { timeout: 15000 });
  await expectMobile(page, "news-reload-read", ["#newsList", `[data-news-id="${newsId}"]`]);

  summary.recordId = recordId;
  summary.newsId = newsId;
  summary.finalPath = new URL(page.url()).pathname;
}

async function waitForShell(page) {
  await page.waitForSelector("#appShell:not(.hidden)", { state: "visible", timeout: 25000 });
  await page.waitForFunction(() => (
    !document.querySelector("#authShell") || document.querySelector("#authShell").classList.contains("hidden")
  ), null, { timeout: 10000 });
}

async function expectMobile(page, label, selectors) {
  const checkpoint = await page.evaluate((values) => {
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0
        && rect.left >= -2
        && rect.right <= window.innerWidth + 6;
    };
    const overflow = Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.documentElement.clientWidth
    );
    return {
      label: values.label,
      width: window.innerWidth,
      overflow,
      missing: values.selectors.filter((selector) => !visible(selector)),
      path: location.pathname
    };
  }, { label, selectors });
  summary.checkpoints.push(checkpoint);
  if (checkpoint.width > 430) throw new Error(`${label}: viewport width ${checkpoint.width} is not mobile.`);
  if (checkpoint.overflow > 4) throw new Error(`${label}: horizontal overflow ${checkpoint.overflow}px.`);
  if (checkpoint.missing.length) throw new Error(`${label}: invisible selectors ${checkpoint.missing.join(", ")}`);
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

function finalizeChecks() {
  const checkpointLabels = new Set(summary.checkpoints.map((checkpoint) => checkpoint.label));
  summary.checks = {
    appShellVisible: true,
    configUsesProductionEndpoints: summary.config.cloudApiEndpoint === "https://api.quantgym.app/api"
      && summary.config.llmEndpoint === "https://llm.quantgym.app/interview"
      && summary.config.googleLoginEnabled === true
      && summary.config.googleClientIdSet === true,
    checkpointCountPass: summary.checkpoints.length === 9,
    allExpectedCheckpointsPresent: [
      "experiences-open",
      "experiences-filtered",
      "experiences-share-confirm",
      "community-after-share",
      "news-open",
      "news-form",
      "news-filtered",
      "news-detail",
      "news-reload-read"
    ].every((label) => checkpointLabels.has(label)),
    experienceSaved: Boolean(summary.recordId),
    experienceFilterUsable: checkpointLabels.has("experiences-filtered"),
    experienceSharedToCommunity: checkpointLabels.has("community-after-share"),
    newsSubmitted: Boolean(summary.newsId),
    newsFiltersUsable: checkpointLabels.has("news-filtered"),
    newsDetailReadPersisted: checkpointLabels.has("news-reload-read"),
    noHorizontalOverflow: summary.checkpoints.every((checkpoint) => Number(checkpoint.overflow || 0) <= 4),
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

function seedIsolatedAuth() {
  const account = {
    id: "local:beta-mobile-content-smoke",
    provider: "local",
    name: "Beta Mobile Content Smoke",
    email: "beta-mobile-content-smoke@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "local-smoke-only",
    createdAt: new Date().toISOString()
  };
  localStorage.setItem("quantMemoryBoard.auth.v1", JSON.stringify({
    accounts: [account],
    currentUserId: account.id,
    lastAuthenticatedAt: new Date().toISOString()
  }));
  localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
    language: "zh",
    sidebarCollapsed: false
  }));
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
  return /compute-pressure|Permissions-Policy|Failed to load resource: the server responded with a status of 403/i.test(text);
}

function isSummaryRedacted(data) {
  const raw = JSON.stringify(data);
  return !/"password"\s*:/i.test(raw)
    && !/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(raw);
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
