#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.argv[2] || "http://127.0.0.1:5174";
const outputDir = path.join(root, "docs", "browser-audit-screenshots");
const chromePath = process.env.CHROME_PATH || findChromeExecutable();

if (!chromePath) {
  throw new Error("Google Chrome executable was not found. Set CHROME_PATH to run this check.");
}

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check"
  ]
});

const summary = {
  status: "pass",
  baseUrl,
  screenshots: [],
  checks: []
};

const REVIEW_VIEW_NAMES = [
  "experiences-desktop",
  "experiences-mobile",
  "news-desktop",
  "news-mobile",
  "community-desktop",
  "community-mobile",
  "messages-desktop",
  "messages-mobile",
  "network-desktop",
  "network-mobile",
  "resume-desktop",
  "resume-mobile",
  "jobs-desktop",
  "jobs-mobile",
  "companies-desktop",
  "companies-mobile",
  "library-desktop",
  "library-mobile",
  "courses-desktop",
  "courses-mobile",
  "memory-desktop",
  "memory-mobile",
  "settings-desktop",
  "settings-mobile",
  "account-desktop",
  "account-mobile"
];

const routes = [
  ["experiences", "/experiences", "#experienceForm", ["#newExperienceBtn", "#experienceForm", "#experienceList"]],
  ["news", "/news", "#newsTopicFilter", ["#newsTopicFilter", "#newsList", "#refreshNewsBtn"]],
  ["community", "/community", "#communityForm", ["#communityForm", "#communityText", "#communityList"]],
  ["messages", "/messages", "#messageThreadList", ["#messageThreadList", "#messageConversationBody"]],
  ["network", "/network", "#addNetworkBtn", ["#addNetworkBtn", "#networkList"]],
  ["resume", "/resume", "#resumeForm", ["#resumeForm", "#resumeText", "#resumeReview"]],
  ["jobs", "/jobs", "#jobsSummary", ["#jobsSummary", "#jobsList"]],
  ["companies", "/companies", "#companyTierFilter", ["#companiesPageTitle", "#companyTierFilter", "#companyOverviewList"]],
  ["library", "/library", "#librarySearch", ["#librarySearch", "#libraryBookGrid", "#libraryKindTabs"]],
  ["courses", "/courses", "#learningPathTitle", ["#learningPathTitle", "#courseList"]],
  ["memory", "/memory", "#addResourceBtn", ["#addResourceBtn", "#resourceList", "#historyList"]],
  ["settings", "/settings", "#settingsForm", ["#settingsForm", "#settingsLanguageSelect"]],
  ["account", "/account", "#accountForm", ["#accountForm", "#accountNameInput"]]
];

try {
  void REVIEW_VIEW_NAMES;
  for (const [id, pathName, waitFor, critical] of routes) {
    await capture({
      name: `${id}-desktop`,
      pathName,
      viewport: { width: 1365, height: 900 },
      waitFor,
      critical
    });
    await capture({
      name: `${id}-mobile`,
      pathName,
      viewport: { width: 390, height: 844 },
      waitFor,
      critical
    });
  }
} catch (error) {
  summary.status = "fail";
  summary.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  const summaryPath = path.join(outputDir, "370-ui-redesign-part-4-support-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    status: summary.status,
    summary: path.relative(root, summaryPath),
    screenshots: summary.screenshots.length
  }, null, 2));
}

async function capture(options) {
  process.stderr.write(`[support-review] capturing ${options.name}\n`);
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    locale: "zh-CN"
  });
  await context.addInitScript(seedAuthenticatedStorage);
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    summary.status = "fail";
    summary.checks.push({
      name: `${options.name}: page error`,
      status: "fail",
      error: error.message
    });
  });
  await page.goto(new URL(options.pathName, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 25000
  });
  await page.waitForSelector(options.waitFor, { timeout: 15000 });
  await page.waitForTimeout(650);

  const diagnostics = await page.evaluate((config) => {
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height)
      };
    };
    return {
      url: location.href,
      theme: document.documentElement.getAttribute("data-qg-theme") || "light",
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      supportPageVisible: visible(".qg-support-page"),
      criticalVisible: Object.fromEntries(config.critical.map((selector) => [selector, visible(selector)])),
      pageRect: rect(".qg-support-page"),
      appRect: rect("#appShell")
    };
  }, {
    critical: options.critical || []
  });

  const screenshotName = `370-ui-redesign-part-4-${options.name}.png`;
  const screenshotPath = path.join(outputDir, screenshotName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: "disabled",
    caret: "hide"
  });
  const bytes = fs.statSync(screenshotPath).size;
  const criticalOk = Object.values(diagnostics.criticalVisible).every(Boolean);
  const visibleOk = diagnostics.supportPageVisible
    && diagnostics.horizontalOverflowPx <= 4
    && bytes > 5000
    && criticalOk;
  const check = {
    name: options.name,
    status: visibleOk ? "pass" : "fail",
    bytes,
    diagnostics
  };
  if (check.status !== "pass") summary.status = "fail";
  summary.checks.push(check);
  summary.screenshots.push(path.relative(root, screenshotPath));
  await context.close();
}

function seedAuthenticatedStorage() {
  const account = {
    id: "local:ui-redesign-support",
    provider: "local",
    name: "Quant",
    email: "ui-redesign-support@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "ui-redesign-support-review",
    createdAt: "2026-07-03T00:00:00.000Z"
  };
  localStorage.setItem("quantMemoryBoard.auth.v1", JSON.stringify({
    accounts: [account],
    currentUserId: account.id,
    lastAuthenticatedAt: "2026-07-03T00:00:00.000Z"
  }));
  localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({
    language: "zh",
    sidebarCollapsed: false
  }));
  localStorage.setItem("quantgym.ui.theme.v1", "light");
  localStorage.removeItem(`quantMemoryBoard.userState.v1.${account.id}`);
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
