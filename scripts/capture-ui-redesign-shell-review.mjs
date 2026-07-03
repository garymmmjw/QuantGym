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
    name: "login-desktop",
    pathName: "/login",
    viewport: { width: 1365, height: 900 },
    waitFor: "#authShell"
  });
  await capture({
    name: "login-mobile",
    pathName: "/login",
    viewport: { width: 390, height: 844 },
    waitFor: "#authShell"
  });
  await capture({
    name: "overview-desktop",
    pathName: "/",
    viewport: { width: 1365, height: 900 },
    authenticated: true,
    waitFor: "#appShell:not(.hidden)"
  });
  await capture({
    name: "overview-mobile",
    pathName: "/",
    viewport: { width: 390, height: 844 },
    authenticated: true,
    waitFor: "#appShell:not(.hidden)"
  });
  await capture({
    name: "overview-dark",
    pathName: "/",
    viewport: { width: 1365, height: 900 },
    authenticated: true,
    theme: "dark",
    waitFor: "#appShell:not(.hidden)"
  });
} catch (error) {
  summary.status = "fail";
  summary.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  const summaryPath = path.join(outputDir, "367-ui-redesign-part-1-shell-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    status: summary.status,
    summary: path.relative(root, summaryPath),
    screenshots: summary.screenshots.length
  }, null, 2));
}

async function capture(options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    locale: "zh-CN"
  });
  if (options.authenticated) {
    await context.addInitScript(seedAuthenticatedStorage, {
      theme: options.theme || "light"
    });
  }
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
  if (options.theme === "dark") {
    await page.waitForFunction(() => document.documentElement.getAttribute("data-qg-theme") === "dark", null, {
      timeout: 5000
    });
  }

  const diagnostics = await page.evaluate(() => {
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
      bodyClass: document.body.className,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      authShellVisible: visible("#authShell"),
      appShellVisible: visible("#appShell"),
      moduleNavVisible: visible("#moduleNav"),
      searchVisible: visible("#globalSearchInput"),
      settingsVisible: visible(".app-settings-button[data-jump-module='settings']"),
      chatVisible: visible("#commandChatBtn"),
      accountVisible: visible(".app-account-chip[data-jump-module='account']"),
      themeToggleVisible: visible("#themeToggleBtn"),
      authShellRect: rect("#authShell"),
      appShellRect: rect("#appShell"),
      commandBarRect: rect(".qg-command-bar"),
      moduleNavRect: rect("#moduleNav")
    };
  });

  const screenshotName = `367-ui-redesign-part-1-${options.name}.png`;
  const screenshotPath = path.join(outputDir, screenshotName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  const bytes = fs.statSync(screenshotPath).size;
  const check = {
    name: options.name,
    status: diagnostics.horizontalOverflowPx <= 4 && bytes > 5000 ? "pass" : "fail",
    bytes,
    diagnostics
  };
  if (check.status !== "pass") summary.status = "fail";
  summary.checks.push(check);
  summary.screenshots.push(path.relative(root, screenshotPath));
  await context.close();
}

function seedAuthenticatedStorage(config = {}) {
  const account = {
    id: "local:ui-redesign-shell",
    provider: "local",
    name: "Quant",
    email: "ui-redesign-shell@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "ui-redesign-shell-review",
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
  localStorage.setItem("quantgym.ui.theme.v1", config.theme === "dark" ? "dark" : "light");
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
