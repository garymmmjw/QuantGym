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

try {
  await capture({
    name: "interview-desktop",
    pathName: "/interview",
    viewport: { width: 1365, height: 900 },
    waitFor: "#interviewSetup",
    critical: ["#startInterviewBtn", ".qg-interview-setup"],
    requireImages: [".interview-setup-shark img"]
  });
  await capture({
    name: "interview-mobile",
    pathName: "/interview",
    viewport: { width: 390, height: 844 },
    waitFor: "#interviewSetup",
    critical: ["#startInterviewBtn", ".qg-interview-setup"],
    requireImages: [".interview-setup-shark img"]
  });
  await capture({
    name: "problems-desktop",
    pathName: "/problems",
    viewport: { width: 1365, height: 900 },
    waitFor: "#problemSearch",
    critical: ["#problemSearch", "#problemList", "#problemCompletionProgress"],
    requireImages: [".problem-page-header > img"]
  });
  await capture({
    name: "problems-mobile",
    pathName: "/problems",
    viewport: { width: 390, height: 844 },
    waitFor: "#problemSearch",
    critical: ["#problemSearch", "#problemList"],
    requireImages: [".problem-page-header > img"]
  });
  await capture({
    name: "tools-desktop",
    pathName: "/tools",
    viewport: { width: 1365, height: 900 },
    waitFor: "#startDrillSessionBtn",
    critical: ["#startDrillSessionBtn", "#drillQuestion", "#drillOptions", "#submitMarketQuoteBtn"]
  });
  await capture({
    name: "tools-mobile",
    pathName: "/tools",
    viewport: { width: 390, height: 844 },
    waitFor: "#startDrillSessionBtn",
    critical: ["#startDrillSessionBtn", "#drillQuestion", "#drillOptions"]
  });
  await capture({
    name: "poker-desktop",
    pathName: "/poker",
    viewport: { width: 1365, height: 900 },
    waitFor: "#pokerTable",
    critical: ["#pokerTable", "#pokerSeatGrid", "#pokerLobbySummary", "#pokerPreflopMatrix"]
  });
  await capture({
    name: "poker-mobile",
    pathName: "/poker",
    viewport: { width: 390, height: 844 },
    waitFor: "#pokerTable",
    critical: ["#pokerTable", "#pokerSeatGrid", "#pokerLeaveTableBtn"]
  });
  await capture({
    name: "pk-desktop",
    pathName: "/pk",
    viewport: { width: 1365, height: 900 },
    waitFor: "#pkProblem",
    critical: ["#startPkBtn", "#pkProblem", "#pkForm", "#pkFeed"]
  });
  await capture({
    name: "pk-mobile",
    pathName: "/pk",
    viewport: { width: 390, height: 844 },
    waitFor: "#pkProblem",
    critical: ["#startPkBtn", "#pkProblem", "#pkForm"]
  });
} catch (error) {
  summary.status = "fail";
  summary.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  const summaryPath = path.join(outputDir, "369-ui-redesign-part-3-training-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    status: summary.status,
    summary: path.relative(root, summaryPath),
    screenshots: summary.screenshots.length
  }, null, 2));
}

async function capture(options) {
  process.stderr.write(`[training-review] capturing ${options.name}\n`);
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
  await page.waitForTimeout(750);

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
    const imageReady = (selector) => {
      const image = document.querySelector(selector);
      return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
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
      trainingPageVisible: visible(".qg-training-page"),
      criticalVisible: Object.fromEntries(config.critical.map((selector) => [selector, visible(selector)])),
      imagesReady: Object.fromEntries(config.requireImages.map((selector) => [selector, imageReady(selector)])),
      pageRect: rect(".qg-training-page"),
      appRect: rect("#appShell")
    };
  }, {
    critical: options.critical || [],
    requireImages: options.requireImages || []
  });

  const screenshotName = `369-ui-redesign-part-3-${options.name}.png`;
  const screenshotPath = path.join(outputDir, screenshotName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: "disabled",
    caret: "hide"
  });
  const bytes = fs.statSync(screenshotPath).size;
  const criticalOk = Object.values(diagnostics.criticalVisible).every(Boolean);
  const imagesOk = Object.values(diagnostics.imagesReady).every(Boolean);
  const visibleOk = diagnostics.trainingPageVisible
    && diagnostics.horizontalOverflowPx <= 4
    && bytes > 5000
    && criticalOk
    && imagesOk;
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
    id: "local:ui-redesign-training",
    provider: "local",
    name: "Quant",
    email: "ui-redesign-training@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "ui-redesign-training-review",
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
