import { chromium } from "playwright-core";
import { gzipSync } from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeWithTimeout } from "./cleanup-timeout.mjs";
import {
  FRONTEND_UPGRADE_ROUTE_FIXTURES,
  PERFORMANCE_BASELINE_TARGETS,
  buildPerformanceCases,
  summarizeCaptureStatus
} from "./lib/frontend-upgrade-baseline.mjs";
import { createFrontendUpgradeBrowserHarness } from "./lib/frontend-upgrade-browser-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = path.resolve(root, getArgValue("--summary") || "docs/browser-audit-screenshots/370-frontend-upgrade-performance-baseline-summary.json");
const onlyPattern = getArgValue("--only");
const startedAt = Date.now();
const allCases = buildPerformanceCases(FRONTEND_UPGRADE_ROUTE_FIXTURES);
const selectedCases = onlyPattern ? allCases.filter((item) => item.id.includes(onlyPattern)) : allCases;
const results = [];
const captureFailures = [];
const findings = [];
let harness = null;
let browser = null;
let chromeVersion = "";
let bundle = null;

try {
  log("building isolated production harness");
  harness = await createFrontendUpgradeBrowserHarness();
  bundle = inventoryBuiltJavascript(harness.distDir);
  browser = await chromium.launch({ executablePath: harness.chromePath, headless: true, args: ["--disable-dev-shm-usage"] });
  chromeVersion = await browser.version();
  for (const [index, performanceCase] of selectedCases.entries()) {
    const result = await capturePerformanceCase(performanceCase);
    results.push(result);
    findings.push(...result.findings);
    if (result.status === "capture-failed") captureFailures.push({ id: result.id, error: result.error, errors: result.errors });
    log(`run ${index + 1}/${selectedCases.length}: ${performanceCase.id} ${result.status}`);
  }
} catch (error) {
  captureFailures.push({ id: "harness", error: error?.stack || error?.message || String(error) });
} finally {
  if (browser) {
    const closed = await closeWithTimeout("frontend-upgrade performance browser", () => browser.close(), 15000).catch((error) => {
      captureFailures.push({ id: "browser-cleanup", error: error.message });
      return false;
    });
    if (!closed) captureFailures.push({ id: "browser-cleanup", error: "Browser close timed out." });
  }
  if (harness) {
    await harness.cleanup().catch((error) => captureFailures.push({ id: "harness-cleanup", error: error.message }));
  }
}

if (bundle) findings.push(...bundleBudgetFindings(bundle));
const filteredRun = Boolean(onlyPattern);
const status = filteredRun
  ? (captureFailures.length ? "fail" : "partial")
  : summarizeCaptureStatus({ captureFailures, findings });
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status,
  filteredRun,
  durationMs: Date.now() - startedAt,
  expectedRuns: allCases.length,
  runs: {
    checked: results.length,
    succeeded: results.filter((item) => item.status === "captured").length,
    failed: captureFailures.length
  },
  targets: PERFORMANCE_BASELINE_TARGETS,
  fieldInpBaseline: {
    status: "unavailable-before-v2-rum",
    substitute: "lab interaction latency is recorded but is not labelled as field INP"
  },
  methodology: {
    cache: "cold browser context per run",
    environment: "local isolated production preview",
    theme: "light",
    performanceObserver: ["largest-contentful-paint", "layout-shift"],
    labInteractionSample: "single local interaction followed by the next two animation frames; not field INP or P75"
  },
  metadata: {
    browser: "Google Chrome via playwright-core",
    chromePath: harness?.chromePath || "",
    chromeVersion,
    locale: "zh-CN",
    buildMode: "isolated-production-preview",
    distRuntimeFingerprint: harness?.fingerprint || "",
    fingerprintAlgorithm: "sha256",
    provenance: harness?.provenance || null,
    buildEnvironment: harness?.buildEnv || null
  },
  findings,
  captureFailures,
  results,
  bundle
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
log(`wrote ${path.relative(root, summaryPath)}`);
if (captureFailures.length) process.exitCode = 1;

async function capturePerformanceCase(performanceCase) {
  const context = await browser.newContext({
    viewport: { width: performanceCase.viewport.width, height: performanceCase.viewport.height },
    colorScheme: "light",
    reducedMotion: "no-preference",
    locale: "zh-CN",
    serviceWorkers: "block"
  });
  await installFixtures(context);
  await context.addInitScript(seedPerformanceStorage, {
    authenticated: performanceCase.authenticated,
    accountId: "local:frontend-upgrade-performance"
  });
  await context.addInitScript(installPerformanceObservers);
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);
  const result = {
    id: performanceCase.id,
    routeId: performanceCase.routeId,
    surfaceId: performanceCase.surfaceId,
    path: performanceCase.path,
    theme: performanceCase.theme,
    viewport: performanceCase.viewport,
    coldContext: true,
    status: "captured",
    findings: []
  };
  try {
    const targetUrl = new URL(performanceCase.path, harness.baseUrl).href;
    const response = await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error(`Navigation response was ${response ? response.status() : "missing"}.`);
    if (new URL(page.url()).pathname !== performanceCase.path) throw new Error(`Final pathname mismatch: ${new URL(page.url()).pathname}`);
    await waitForShell(page, performanceCase.authenticated);
    for (const selector of performanceCase.selectors) {
      await page.waitForSelector(selector, { state: "attached", timeout: 15000 });
    }
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const interaction = await measureLabInteraction(page, performanceCase.authenticated);
    const metrics = await readPerformanceMetrics(page);
    const runtimeErrors = errors.snapshot();
    if (runtimeErrors.console.length || runtimeErrors.page.length || runtimeErrors.firstPartyResponse.length || runtimeErrors.firstPartyRequest.length) {
      throw new Error(`Runtime errors detected: ${JSON.stringify(runtimeErrors)}`);
    }
    result.metrics = { ...metrics, ...interaction };
    result.errors = runtimeErrors;
    result.findings = performanceFindings(performanceCase, result.metrics);
  } catch (error) {
    result.status = "capture-failed";
    result.error = error?.stack || error?.message || String(error);
    result.errors = errors.snapshot();
  } finally {
    const closed = await closeWithTimeout(`performance context ${performanceCase.id}`, () => context.close(), 10000).catch((error) => {
      result.status = "capture-failed";
      result.error ||= `Context close failed: ${error.message}`;
      return false;
    });
    if (!closed) {
      result.status = "capture-failed";
      result.error ||= "Context close timed out.";
    }
  }
  return result;
}

async function measureLabInteraction(page, authenticated) {
  if (!authenticated) {
    return page.locator("#loginEmail").evaluate(async (input) => {
      const start = performance.now();
      input.focus();
      input.value = "baseline-latency@quantgym.local";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { labInteractionLabel: "auth email input to two animation frames", labInteractionLatencyMs: round(performance.now() - start) };
      function round(value) { return Math.round(value * 100) / 100; }
    });
  }
  await page.waitForSelector("#todoDockButton", { state: "visible" });
  return page.locator("#todoDockButton").evaluate(async (button) => {
    const start = performance.now();
    button.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      labInteractionLabel: "todo dock open to two animation frames",
      labInteractionLatencyMs: Math.round((performance.now() - start) * 100) / 100,
      observedExpandedState: button.getAttribute("aria-expanded")
    };
  });
}

async function readPerformanceMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
    const resources = performance.getEntriesByType("resource");
    const state = globalThis.__quantgymPerformanceBaseline || {};
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    return {
      navigationTiming: navigation ? {
        dnsMs: rounded(navigation.domainLookupEnd - navigation.domainLookupStart),
        connectMs: rounded(navigation.connectEnd - navigation.connectStart),
        ttfbMs: rounded(navigation.responseStart - navigation.requestStart),
        responseMs: rounded(navigation.responseEnd - navigation.responseStart),
        domContentLoadedMs: rounded(navigation.domContentLoadedEventEnd),
        loadEventMs: rounded(navigation.loadEventEnd),
        durationMs: rounded(navigation.duration),
        transferredBytes: navigation.transferSize || 0
      } : null,
      fcpMs: rounded(paints["first-contentful-paint"] || 0),
      lcpMs: rounded(state.lcpMs || 0),
      cls: Math.round(Number(state.cls || 0) * 100000) / 100000,
      resourceCount: resources.length,
      transferredBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      decodedBodyBytes: resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
      resourceInitiators: resources.reduce((counts, entry) => {
        counts[entry.initiatorType || "other"] = (counts[entry.initiatorType || "other"] || 0) + 1;
        return counts;
      }, {}),
      horizontalOverflowPx: Math.max(0, documentWidth - document.documentElement.clientWidth)
    };
    function rounded(value) { return Math.round(Number(value || 0) * 100) / 100; }
  });
}

function installPerformanceObservers() {
  globalThis.__quantgymPerformanceBaseline = { lcpMs: 0, cls: 0 };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) globalThis.__quantgymPerformanceBaseline.lcpMs = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) globalThis.__quantgymPerformanceBaseline.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
}

function performanceFindings(performanceCase, metrics) {
  const rows = [];
  if (metrics.lcpMs > PERFORMANCE_BASELINE_TARGETS.lcpMs) rows.push(finding("lcp", metrics.lcpMs, PERFORMANCE_BASELINE_TARGETS.lcpMs));
  if (metrics.cls > PERFORMANCE_BASELINE_TARGETS.cls) rows.push(finding("cls", metrics.cls, PERFORMANCE_BASELINE_TARGETS.cls));
  if (metrics.horizontalOverflowPx > PERFORMANCE_BASELINE_TARGETS.horizontalOverflowPx) rows.push(finding("horizontal-overflow", metrics.horizontalOverflowPx, PERFORMANCE_BASELINE_TARGETS.horizontalOverflowPx));
  return rows.map((row) => ({ ...row, caseId: performanceCase.id, surfaceId: performanceCase.surfaceId, kind: "performance" }));
}

function bundleBudgetFindings(bundleMetrics) {
  const rows = [];
  if (bundleMetrics.initialJsGzipBytes > PERFORMANCE_BASELINE_TARGETS.initialJsGzipBytes) {
    rows.push({ id: "bundle:initial-js-gzip", kind: "bundle", value: bundleMetrics.initialJsGzipBytes, target: PERFORMANCE_BASELINE_TARGETS.initialJsGzipBytes });
  }
  for (const chunk of bundleMetrics.chunks.filter((item) => item.ordinaryRouteChunk && item.gzipBytes > PERFORMANCE_BASELINE_TARGETS.ordinaryRouteChunkGzipBytes)) {
    rows.push({ id: `bundle:route-chunk:${chunk.path}`, kind: "bundle", value: chunk.gzipBytes, target: PERFORMANCE_BASELINE_TARGETS.ordinaryRouteChunkGzipBytes });
  }
  return rows;
}

function inventoryBuiltJavascript(distDir) {
  const files = listFiles(distDir).filter((filePath) => filePath.endsWith(".js"));
  const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const initialPaths = new Set([...indexHtml.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)].map((match) => normalizeAssetPath(match[1])));
  const chunks = files.map((filePath) => {
    const relativePath = path.relative(distDir, filePath).split(path.sep).join("/");
    const bytes = fs.readFileSync(filePath);
    return {
      path: relativePath,
      rawBytes: bytes.length,
      gzipBytes: gzipSync(bytes, { level: 9 }).length,
      initial: initialPaths.has(relativePath),
      ordinaryRouteChunk: /(?:^|\/)[A-Z][A-Za-z]+Page-[^/]+\.js$/.test(relativePath)
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  return {
    chunkCount: chunks.length,
    initialChunks: chunks.filter((item) => item.initial).map((item) => item.path),
    initialJsRawBytes: chunks.filter((item) => item.initial).reduce((sum, item) => sum + item.rawBytes, 0),
    initialJsGzipBytes: chunks.filter((item) => item.initial).reduce((sum, item) => sum + item.gzipBytes, 0),
    largestRouteChunkGzipBytes: Math.max(0, ...chunks.filter((item) => item.ordinaryRouteChunk).map((item) => item.gzipBytes)),
    chunks
  };
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function normalizeAssetPath(value) {
  return String(value).replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "").split("?")[0];
}

function collectRuntimeErrors(page) {
  const records = { console: [], page: [], firstPartyResponse: [], firstPartyRequest: [] };
  page.on("console", (message) => {
    if (message.type() !== "error" || isAllowedConsoleError(message.text())) return;
    records.console.push({ text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => records.page.push({ message: error.message, stack: error.stack || "" }));
  page.on("response", (response) => {
    if (response.status() >= 400 && isTracked(response.url())) records.firstPartyResponse.push({ method: response.request().method(), status: response.status(), url: response.url() });
  });
  page.on("requestfailed", (request) => {
    if (isTracked(request.url())) records.firstPartyRequest.push({ method: request.method(), errorText: request.failure()?.errorText || "", url: request.url() });
  });
  return { snapshot: () => structuredClone(records) };
}

function isTracked(url) {
  try {
    const origin = new URL(url).origin;
    return origin === new URL(harness.baseUrl).origin || origin === "http://127.0.0.1:8790" || origin === "http://127.0.0.1:8787";
  } catch { return false; }
}

function isAllowedConsoleError(text) {
  return /(?:\[reporter-pb\]: request error TypeError: Failed to fetch|@bilibili\/bili-user-fingerprint\(report\): report is not found)/i.test(text)
    || /^Permissions policy violation: compute-pressure is not allowed in this document\.$/.test(text);
}

async function installFixtures(context) {
  for (const pathname of ["/news", "/jobs"]) {
    await context.route(`http://127.0.0.1:8787${pathname}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }));
  }
}

async function waitForShell(page, authenticated) {
  await page.waitForSelector(authenticated ? "#appShell" : "#authShell", { state: "visible", timeout: 20000 });
}

function seedPerformanceStorage({ authenticated, accountId }) {
  const account = {
    id: accountId,
    provider: "local",
    name: "Frontend Upgrade Performance",
    email: "frontend-upgrade-performance@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "a8e7ada1c0c74046c020eec00859ae3c7fa5c2608ea8d22e330859cc4ff128dd",
    createdAt: "2026-07-12T00:00:00.000Z"
  };
  localStorage.setItem("quantMemoryBoard.auth.v1", JSON.stringify({ accounts: [account], currentUserId: authenticated ? accountId : "", lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem(`quantgym.ui.onboarded.v1:${accountId}`, "1");
  localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({ language: "zh", sidebarCollapsed: false }));
  localStorage.setItem("quantgym.ui.theme.v1", "light");
  localStorage.setItem(`quantMemoryBoard.userState.v1.${accountId}`, JSON.stringify({}));
}

function finding(metric, value, target) {
  return { id: `performance:${metric}`, metric, value, target };
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

function log(message) {
  process.stdout.write(`[frontend-upgrade-performance ${Math.round((Date.now() - startedAt) / 1000)}s] ${message}\n`);
}
