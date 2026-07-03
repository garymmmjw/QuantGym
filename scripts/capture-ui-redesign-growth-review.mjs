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
    name: "overview-desktop",
    pathName: "/",
    viewport: { width: 1365, height: 900 },
    waitFor: ".qg-overview-page"
  });
  await capture({
    name: "overview-mobile",
    pathName: "/",
    viewport: { width: 390, height: 844 },
    waitFor: ".qg-overview-page"
  });
  await capture({
    name: "plan-setup-desktop",
    pathName: "/plan",
    viewport: { width: 1365, height: 900 },
    waitFor: "#prepPlanSetupForm"
  });
  await capture({
    name: "plan-dashboard-desktop",
    pathName: "/plan",
    viewport: { width: 1365, height: 900 },
    waitFor: "#prepPlanSetupForm",
    prepare: preparePlanDashboard
  });
  await capture({
    name: "plan-mobile",
    pathName: "/plan",
    viewport: { width: 390, height: 844 },
    waitFor: "#prepPlanSetupForm",
    prepare: preparePlanDashboard
  });
  await capture({
    name: "skills-desktop",
    pathName: "/skills",
    viewport: { width: 1365, height: 900 },
    waitFor: "#skillRadar",
    requireRadar: true
  });
  await capture({
    name: "skills-mobile",
    pathName: "/skills",
    viewport: { width: 390, height: 844 },
    waitFor: "#skillRadar",
    requireRadar: true
  });
  await capture({
    name: "skills-dark",
    pathName: "/skills",
    viewport: { width: 1365, height: 900 },
    waitFor: "#skillRadar",
    theme: "dark",
    requireRadar: true
  });
} catch (error) {
  summary.status = "fail";
  summary.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  const summaryPath = path.join(outputDir, "368-ui-redesign-part-2-growth-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({
    status: summary.status,
    summary: path.relative(root, summaryPath),
    screenshots: summary.screenshots.length
  }, null, 2));
}

async function capture(options) {
  process.stderr.write(`[growth-review] capturing ${options.name}\n`);
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    locale: "zh-CN"
  });
  await context.addInitScript(seedAuthenticatedStorage, {
    theme: options.theme || "light"
  });
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
  await page.waitForTimeout(500);
  if (options.theme === "dark") {
    await page.waitForFunction(() => document.documentElement.getAttribute("data-qg-theme") === "dark", null, {
      timeout: 5000
    });
  }
  if (options.prepare) {
    await options.prepare(page);
  }
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
    const imageReady = (selector) => {
      const image = document.querySelector(selector);
      return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
    };
    const canvasSignal = (() => {
      const canvas = document.querySelector("#skillRadar");
      if (!canvas) return { present: false, nonBlank: 0 };
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return { present: true, nonBlank: 0 };
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlank = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] !== 0 || data[index - 1] !== 0 || data[index - 2] !== 0 || data[index - 3] !== 0) {
          nonBlank += 1;
        }
      }
      return { present: true, nonBlank };
    })();
    return {
      url: location.href,
      theme: document.documentElement.getAttribute("data-qg-theme") || "light",
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      growthPageVisible: visible(".qg-growth-page"),
      overviewHeroVisible: visible(".qg-overview-hero"),
      overviewMascotReady: imageReady("#heroShark"),
      planSetupVisible: visible("#prepPlanSetupForm"),
      planDashboardVisible: visible("#prepPlanDashboard:not(.hidden)"),
      skillsRadarVisible: visible("#skillRadar"),
      skillsCoachReady: imageReady(".skill-radar-coach"),
      radarNonBlankPixels: canvasSignal.nonBlank,
      requireRadar: Boolean(config.requireRadar)
    };
  }, { requireRadar: options.requireRadar });

  const screenshotName = `368-ui-redesign-part-2-${options.name}.png`;
  const screenshotPath = path.join(outputDir, screenshotName);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: "disabled",
    caret: "hide"
  });
  const bytes = fs.statSync(screenshotPath).size;
  const radarOk = !options.requireRadar || diagnostics.radarNonBlankPixels > 250;
  const visibleOk = diagnostics.growthPageVisible
    && diagnostics.horizontalOverflowPx <= 4
    && bytes > 5000
    && radarOk;
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

async function preparePlanDashboard(page) {
  await page.locator('input[name="prepTrack"][value="internship"]').check({ timeout: 10000 });
  await page.locator('input[name="prepSeason"][value="2027-summer"]').check({ timeout: 10000 });
  await page.locator("#prepRoleSelect").selectOption("quantTrading");
  await page.locator("#prepHoursSelect").selectOption("8");
  await page.locator('input[name="prepDiagnostic"][value="skip"]').check({ timeout: 10000 });
  await page.locator("#prepPlanSetupForm").evaluate((form) => form.requestSubmit());
  await page.waitForSelector("#prepPlanDashboard:not(.hidden)", { timeout: 10000 });
}

function seedAuthenticatedStorage(config = {}) {
  const account = {
    id: "local:ui-redesign-growth",
    provider: "local",
    name: "Quant",
    email: "ui-redesign-growth@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "ui-redesign-growth-review",
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
