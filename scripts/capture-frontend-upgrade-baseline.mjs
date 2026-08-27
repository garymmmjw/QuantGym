import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeWithTimeout } from "./cleanup-timeout.mjs";
import {
  BASELINE_AXE_TAGS,
  BASELINE_VIEWPORTS,
  FRONTEND_UPGRADE_ROUTE_FIXTURES,
  SHARED_STATE_CAPTURE_INVENTORY,
  buildCaptureCases,
  partitionSharedStateCases,
  selectTrackedReviewCases,
  summarizeCaptureStatus
} from "./lib/frontend-upgrade-baseline.mjs";
import { CANONICAL_SURFACE_INVENTORY } from "./lib/frontend-upgrade-approved-surfaces.mjs";
import {
  createFrontendUpgradeBrowserHarness,
  isAllowedFrontendUpgradeConsoleError,
  sha256File
} from "./lib/frontend-upgrade-browser-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const visualSummaryPath = path.resolve(root, getArgValue("--visual-summary") || "docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json");
const sharedSummaryPath = path.resolve(root, getArgValue("--shared-summary") || "docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json");
const artifactsRoot = path.resolve(root, getArgValue("--artifacts-root") || "artifacts/frontend-upgrade/baseline");
const reviewRoot = path.resolve(root, getArgValue("--review-root") || "docs/browser-audit-screenshots/370-frontend-upgrade-review");
const onlyPattern = getArgValue("--only");
const limit = Math.max(0, Number(getArgValue("--limit")) || 0);
const startedAt = Date.now();
const routeCasesAll = buildCaptureCases(FRONTEND_UPGRADE_ROUTE_FIXTURES, CANONICAL_SURFACE_INVENTORY);
const sharedPartition = partitionSharedStateCases(SHARED_STATE_CAPTURE_INVENTORY);
const reviewPlan = selectTrackedReviewCases(routeCasesAll, SHARED_STATE_CAPTURE_INVENTORY);
const reviewBySourceCaseId = new Map(reviewPlan.map((item) => [item.sourceCaseId, item]));
const axeVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules", "axe-core", "package.json"), "utf8")).version;

let harness = null;
let browser = null;
let chromeVersion = "";
const routeResults = [];
const sharedResults = [];
const routeFindings = [];
const sharedFindings = [];
const routeCaptureFailures = [];
const sharedCaptureFailures = [];
const globalCaptureFailures = [];
const reviewImages = [];
let activeCapturePhase = "harness";

prepareOutputDirectories();

try {
  log("building isolated production harness");
  harness = await createFrontendUpgradeBrowserHarness();
  browser = await chromium.launch({
    executablePath: harness.chromePath,
    headless: true,
    args: ["--disable-dev-shm-usage"]
  });
  chromeVersion = await browser.version();

  activeCapturePhase = "route";
  const routeCases = filterCases(routeCasesAll);
  log(`capturing ${routeCases.length}/${routeCasesAll.length} route matrix cases`);
  const capturedRoutes = await captureBatch(routeCases, "route", 3, 5);
  for (const result of capturedRoutes) {
    routeResults.push(result);
    routeFindings.push(...result.findings);
    if (result.status === "capture-failed") routeCaptureFailures.push(compactFailure(result));
  }

  activeCapturePhase = "shared-state";
  const sharedCases = filterCases(sharedPartition.current);
  log(`capturing ${sharedCases.length}/${sharedPartition.current.length} current shared states`);
  const capturedShared = await captureBatch(sharedCases, "shared-state", 2, 1);
  for (const result of capturedShared) {
    sharedResults.push(result);
    sharedFindings.push(...result.findings);
    if (result.status === "capture-failed") sharedCaptureFailures.push(compactFailure(result));
  }
  activeCapturePhase = "complete";
} catch (error) {
  const failure = { id: `${activeCapturePhase}-batch`, error: error?.stack || error?.message || String(error) };
  if (activeCapturePhase === "route") routeCaptureFailures.push(failure);
  else if (activeCapturePhase === "shared-state") sharedCaptureFailures.push(failure);
  else globalCaptureFailures.push(failure);
} finally {
  if (browser) {
    const browserClosed = await closeWithTimeout("frontend-upgrade baseline browser", () => browser.close(), 15000).catch((error) => {
      globalCaptureFailures.push({ id: "browser-cleanup", error: error.message });
      return false;
    });
    if (!browserClosed) globalCaptureFailures.push({ id: "browser-cleanup", error: "Browser close timed out." });
  }
  if (harness) {
    await harness.cleanup().catch((error) => {
      globalCaptureFailures.push({ id: "harness-cleanup", error: error.message });
    });
  }
}

const filteredRun = Boolean(onlyPattern || limit);
reviewImages.sort((left, right) => left.reviewId.localeCompare(right.reviewId));
const routeReviewImages = reviewImages.filter((item) => item.kind === "route");
const sharedReviewImages = reviewImages.filter((item) => item.kind === "shared-state");
const visualCaptureFailures = [...globalCaptureFailures, ...routeCaptureFailures];
const sharedStateCaptureFailures = [...globalCaptureFailures, ...sharedCaptureFailures];
const routeSucceeded = routeResults.filter((item) => item.status === "captured").length;
const sharedSucceeded = sharedResults.filter((item) => item.status === "captured").length;
const visualStatus = filteredRun
  ? (visualCaptureFailures.length ? "fail" : "partial")
  : summarizeCaptureStatus({
      captureFailures: visualCaptureFailures,
      findings: routeFindings,
      expected: routeCasesAll.length,
      checked: routeResults.length,
      succeeded: routeSucceeded,
      expectedReview: 23,
      generatedReview: routeReviewImages.length
    });
const sharedStatus = filteredRun
  ? (sharedStateCaptureFailures.length ? "fail" : "partial")
  : summarizeCaptureStatus({
      captureFailures: sharedStateCaptureFailures,
      findings: sharedFindings,
      expected: sharedPartition.current.length,
      checked: sharedResults.length,
      succeeded: sharedSucceeded,
      expectedReview: 6,
      generatedReview: sharedReviewImages.length
    });
const metadata = buildMetadata();

const visualSummary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: visualStatus,
  filteredRun,
  durationMs: Date.now() - startedAt,
  expectedCaptures: routeCasesAll.length,
  captures: {
    checked: routeResults.length,
    succeeded: routeSucceeded,
    failed: visualCaptureFailures.length
  },
  metadata,
  axe: { version: axeVersion, tags: BASELINE_AXE_TAGS },
  findings: routeFindings,
  seriousCriticalFindings: routeFindings.filter((item) => item.kind === "axe" && ["serious", "critical"].includes(item.impact)),
  captureFailures: visualCaptureFailures,
  cases: routeResults,
  reviewImages: routeReviewImages,
  reviewManifest: {
    expected: 23,
    generated: routeReviewImages.length
  }
};

const futureGates = sharedPartition.future.map((item) => ({
  id: item.id,
  surfaceId: item.surfaceId,
  state: item.state,
  status: "future-gate",
  targetPhase: item.targetPhase,
  targetCommand: item.targetCommand,
  screenshotClaim: false,
  acceptanceIds: item.acceptanceIds
}));
const sharedSummary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: sharedStatus,
  filteredRun,
  durationMs: Date.now() - startedAt,
  expectedCurrentCaptures: sharedPartition.current.length,
  expectedFutureGates: sharedPartition.future.length,
  currentCaptures: {
    checked: sharedResults.length,
    succeeded: sharedSucceeded,
    failed: sharedStateCaptureFailures.length
  },
  futureGateCounts: { checked: futureGates.length, passed: 0 },
  metadata,
  axe: { version: axeVersion, tags: BASELINE_AXE_TAGS },
  findings: sharedFindings,
  seriousCriticalFindings: sharedFindings.filter((item) => item.kind === "axe" && ["serious", "critical"].includes(item.impact)),
  captureFailures: sharedStateCaptureFailures,
  currentCases: sharedResults,
  futureGates,
  reviewImages: sharedReviewImages,
  reviewManifest: {
    expected: 6,
    generated: sharedReviewImages.length
  }
};

writeJson(visualSummaryPath, visualSummary);
writeJson(sharedSummaryPath, sharedSummary);
log(`wrote ${path.relative(root, visualSummaryPath)} and ${path.relative(root, sharedSummaryPath)}`);

if (visualStatus === "fail" || sharedStatus === "fail") {
  process.exitCode = 1;
}

async function captureOne({ kind, captureCase }) {
  const artifactPath = path.join(
    artifactsRoot,
    kind === "route" ? "routes" : "shared-states",
    `${safeFileName(captureCase.id)}.png`
  );
  const errors = createErrorCollector();
  const resolvedSelectors = resolveCaptureSelectors(kind, captureCase);
  const reducedMotion = captureCase.state?.includes("reduced-motion") || captureCase.setup?.id?.includes("reduced-motion");
  const context = await browser.newContext({
    viewport: { width: captureCase.viewport?.width || BASELINE_VIEWPORTS[captureCase.viewportId].width, height: captureCase.viewport?.height || BASELINE_VIEWPORTS[captureCase.viewportId].height },
    colorScheme: captureCase.theme,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    locale: "zh-CN",
    serviceWorkers: "block",
    acceptDownloads: false
  });
  await installLocalServiceFixtures(context, harness.baseUrl);
  await context.addInitScript(seedBaselineStorage, {
    authenticated: kind === "route" ? captureCase.authenticated : captureCase.surfaceId !== "system:auth",
    theme: captureCase.theme,
    accountId: "local:frontend-upgrade-baseline"
  });
  const page = await context.newPage();
  errors.attach(page);
  const result = {
    id: captureCase.id,
    kind,
    surfaceId: captureCase.surfaceId,
    routeId: captureCase.routeId,
    path: captureCase.path,
    theme: captureCase.theme,
    viewport: captureCase.viewport || BASELINE_VIEWPORTS[captureCase.viewportId],
    acceptanceIds: captureCase.acceptanceIds,
    selectors: resolvedSelectors,
    status: "captured",
    findings: []
  };
  try {
    const targetUrl = new URL(captureCase.path, harness.baseUrl).href;
    const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!response || response.status() >= 400) {
      throw new Error(`Navigation response was ${response ? response.status() : "missing"} for ${targetUrl}`);
    }
    if (new URL(page.url()).pathname !== captureCase.path) {
      throw new Error(`Final pathname mismatch: ${new URL(page.url()).pathname} !== ${captureCase.path}`);
    }
    await waitForShell(page, kind === "route" ? captureCase.authenticated : captureCase.surfaceId !== "system:auth");
    if (kind === "route") {
      for (const selector of captureCase.selectors) {
        await page.waitForSelector(selector, { state: "attached", timeout: 15000 });
      }
    } else {
      await applySharedStateSetup(page, captureCase);
      await assertExpectedState(page, captureCase);
    }

    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await settleRenderableImages(page);
    const measurements = await measurePage(
      page,
      resolvedSelectors,
      captureCase.authenticated ?? captureCase.surfaceId !== "system:auth"
    );
    if (!measurements.shellVisible) throw new Error("Expected shell is not visible.");
    if (measurements.overlayVisible) throw new Error("Vite/runtime overlay is visible.");
    if (measurements.bodyTextLength <= 80) throw new Error(`Body text is too small (${measurements.bodyTextLength}).`);
    if (measurements.fontStatus !== "loaded") throw new Error(`Document fonts are not loaded (${measurements.fontStatus}).`);
    if (measurements.incompleteVisibleImages.length) {
      throw new Error(`Visible images did not finish loading: ${measurements.incompleteVisibleImages.join(", ")}`);
    }
    const runtimeErrors = errors.snapshot();
    if (runtimeErrors.console.length || runtimeErrors.page.length || runtimeErrors.firstPartyResponse.length || runtimeErrors.firstPartyRequest.length) {
      throw new Error(`Runtime errors detected: ${JSON.stringify(runtimeErrors)}`);
    }

    const axe = await new AxeBuilder({ page }).withTags(BASELINE_AXE_TAGS).analyze();
    const compactViolations = axe.violations.map(compactAxeViolation);
    result.measurements = measurements;
    result.axe = {
      passes: axe.passes.length,
      incomplete: axe.incomplete.length,
      inapplicable: axe.inapplicable.length,
      violations: compactViolations
    };
    result.errors = runtimeErrors;
    result.findings = buildFindings(captureCase, measurements, compactViolations);

    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    await page.screenshot({ path: artifactPath, type: "png", fullPage: true, animations: "disabled" });
    result.screenshot = {
      path: path.relative(root, artifactPath),
      bytes: fs.statSync(artifactPath).size,
      sha256: sha256File(artifactPath)
    };

    const review = reviewBySourceCaseId.get(captureCase.id);
    if (review) {
      const reviewPath = path.join(reviewRoot, path.basename(review.outputFile));
      fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
      await page.screenshot({ path: reviewPath, type: "jpeg", quality: 72, fullPage: true, animations: "disabled" });
      reviewImages.push({
        ...review,
        path: path.relative(root, reviewPath),
        width: measurements.documentWidth,
        height: measurements.documentHeight,
        bytes: fs.statSync(reviewPath).size,
        sha256: sha256File(reviewPath),
        quality: 72
      });
    }
  } catch (error) {
    result.status = "capture-failed";
    result.error = error?.stack || error?.message || String(error);
    result.errors = errors.snapshot();
  } finally {
    const closed = await closeWithTimeout(`capture context ${captureCase.id}`, () => context.close(), 10000).catch((error) => {
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

async function captureBatch(cases, kind, concurrency, logEvery) {
  const results = new Array(cases.length);
  let cursor = 0;
  let completed = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, cases.length)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= cases.length) return;
      results[index] = await captureOne({ kind, captureCase: cases[index] });
      completed += 1;
      if (completed % logEvery === 0 || completed === cases.length) {
        log(`${kind === "route" ? "route matrix" : "shared states"} ${completed}/${cases.length}${kind === "shared-state" ? `: ${cases[index].id}` : ""}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function createErrorCollector() {
  const records = { console: [], page: [], firstPartyResponse: [], firstPartyRequest: [] };
  return {
    attach(page) {
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        const location = message.location();
        if (isAllowedFrontendUpgradeConsoleError(text, location.url, trackedFirstPartyOrigins())) return;
        records.console.push({ text, location });
      });
      page.on("pageerror", (error) => records.page.push({ message: error.message, stack: error.stack || "" }));
      page.on("response", (response) => {
        if (response.status() < 400 || !isTrackedFirstParty(response.url())) return;
        records.firstPartyResponse.push({ method: response.request().method(), status: response.status(), url: response.url() });
      });
      page.on("requestfailed", (request) => {
        if (!isTrackedFirstParty(request.url())) return;
        records.firstPartyRequest.push({ method: request.method(), errorText: request.failure()?.errorText || "", url: request.url() });
      });
    },
    snapshot() {
      return structuredClone(records);
    }
  };
}

function isTrackedFirstParty(url) {
  try {
    const origin = new URL(url).origin;
    return origin === new URL(harness.baseUrl).origin
      || origin === "http://127.0.0.1:8790"
      || origin === "http://127.0.0.1:8787";
  } catch {
    return false;
  }
}

function trackedFirstPartyOrigins() {
  return [harness?.baseUrl, "http://127.0.0.1:8790", "http://127.0.0.1:8787"].filter(Boolean);
}

async function installLocalServiceFixtures(context, baseUrl) {
  const llmOrigin = "http://127.0.0.1:8787";
  for (const pathname of ["/news", "/jobs"]) {
    await context.route(`${llmOrigin}${pathname}`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "Expected POST" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    });
  }
  void baseUrl;
}

async function waitForShell(page, authenticated) {
  if (authenticated) {
    await page.waitForSelector("#appShell", { state: "visible", timeout: 20000 });
    await page.waitForFunction(() => {
      const auth = document.querySelector("#authShell");
      return !auth || auth.classList.contains("hidden") || getComputedStyle(auth).display === "none";
    }, null, { timeout: 10000 });
  } else {
    await page.waitForSelector("#authShell", { state: "visible", timeout: 20000 });
    await page.waitForFunction(() => {
      const app = document.querySelector("#appShell");
      return !app || app.classList.contains("hidden") || getComputedStyle(app).display === "none";
    }, null, { timeout: 10000 });
  }
}

async function applySharedStateSetup(page, captureCase) {
  const id = captureCase.setup.id;
  if (id === "auth-registration-error") {
    await page.locator('[data-auth-tab="register"]').click();
    await page.locator("#registerName").fill("Baseline User");
    await page.locator("#registerEmail").fill("baseline-registration@quantgym.local");
    await page.locator("#registerPassword").fill("123");
    await page.locator("#registerForm .auth-register-info-only.auth-submit").click();
    await page.waitForFunction(() => (document.querySelector("#authMessage")?.textContent || "").trim().length > 0);
  } else if (id === "auth-password-reset") {
    await page.locator("#loginEmail").fill("frontend-upgrade-baseline@quantgym.local");
    await page.locator("#forgotPasswordBtn").click();
    await page.waitForSelector("#resetPasswordForm:not(.hidden)", { state: "visible" });
  } else if (id === "desktop-sidebar-collapse") {
    const expanded = await page.locator("#sidebarToggleBtn").getAttribute("aria-expanded");
    if (expanded !== "true") await page.locator("#sidebarToggleBtn").click();
    await page.locator("#sidebarToggleBtn").click();
    await page.waitForFunction(() => document.querySelector("#sidebarToggleBtn")?.getAttribute("aria-expanded") === "false");
  } else if (id === "desktop-sidebar-expand") {
    const expanded = await page.locator("#sidebarToggleBtn").getAttribute("aria-expanded");
    if (expanded === "true") await page.locator("#sidebarToggleBtn").click();
    await page.locator("#sidebarToggleBtn").click();
    await page.waitForFunction(() => document.querySelector("#sidebarToggleBtn")?.getAttribute("aria-expanded") === "true");
  } else if (id === "mobile-drawer-open") {
    await page.locator(".qg-mobile-menu-btn").click();
    await page.waitForSelector(".qg-nav-sheet.is-open", { state: "visible" });
  } else if (id === "global-search-results") {
    await openGlobalSearch(page);
    await page.locator(".qg-cmdk-input").fill("quant");
    await page.waitForSelector(".qg-cmdk-list [role='option']", { state: "visible" });
  } else if (id === "global-search-keyboard") {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await page.waitForSelector(".qg-cmdk-input", { state: "visible" });
    await page.locator(".qg-cmdk-input").focus();
  } else if (id === "global-search-empty") {
    await openGlobalSearch(page);
    await page.locator(".qg-cmdk-input").fill("baseline-no-result-zzzzzzzz");
    await page.waitForSelector(".qg-cmdk-empty", { state: "visible" });
  } else if (id === "global-search-reduced-motion") {
    await openGlobalSearch(page);
  } else if (id === "live-toast" || id === "live-toast-reduced-motion") {
    await page.waitForSelector("#leagueRewardShop [data-shop-item]", { state: "visible" });
    await page.locator("#leagueRewardShop [data-shop-item]").first().click();
    await page.waitForSelector(".qg-fb-toasts[aria-live='polite']:has(.qg-fb-toast)", { state: "visible" });
  } else if (["todo-dock-open", "todo-editor-focus"].includes(id)) {
    await page.locator("#todoDockButton").click();
    await page.waitForSelector("#todoDockPanel:not(.hidden)", { state: "visible" });
    if (id === "todo-editor-focus") await page.locator("#todoDockAddInput").focus();
  } else if (id === "todo-mobile-current-state") {
    await page.waitForFunction(() => matchMedia("(max-width: 760px)").matches);
  } else if (id === "theme-language-mobile") {
    await page.waitForSelector("#settingsLanguageSelect", { state: "visible" });
    await page.locator("#settingsLanguageSelect").focus();
  } else if (id === "focus-target") {
    if (!captureCase.focusTarget) throw new Error(`Missing focus target for ${captureCase.id}`);
    await page.locator(captureCase.focusTarget).first().focus();
  } else if (id === "reduced-motion") {
    // The browser context is created with reducedMotion="reduce" before navigation.
  } else {
    throw new Error(`Unsupported current shared-state setup: ${id}`);
  }
}

async function openGlobalSearch(page) {
  await page.locator("#globalSearchInput").click();
  await page.waitForSelector(".qg-cmdk-input", { state: "visible" });
}

async function assertExpectedState(page, captureCase) {
  const { expected } = captureCase;
  const locator = page.locator(expected.selector).first();
  await locator.waitFor({ state: "attached", timeout: 10000 });
  await locator.waitFor({ state: expected.visible === false ? "hidden" : "visible", timeout: 10000 });
  if (expected.text) {
    const text = (await locator.textContent()) || "";
    if (!text.includes(expected.text)) throw new Error(`Expected ${JSON.stringify(expected.text)} in ${expected.selector}: ${JSON.stringify(text)}`);
  }
  if (expected.aria) {
    for (const [name, value] of Object.entries(expected.aria)) {
      const actual = await locator.getAttribute(`aria-${name}`);
      if (actual !== value) throw new Error(`Expected aria-${name}=${JSON.stringify(value)} on ${expected.selector}; got ${JSON.stringify(actual)}`);
    }
  }
  if (expected.attribute?.name === "focused") {
    const focused = await locator.evaluate((node) => node === document.activeElement);
    if (!focused) throw new Error(`Expected keyboard focus on ${expected.selector}`);
  }
  if (expected.attribute?.name === "reducedMotion") {
    const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!reduced) throw new Error(`Reduced-motion media query is not active for ${captureCase.id}`);
  }
}

async function settleRenderableImages(page) {
  await page.evaluate(async () => {
    const startY = window.scrollY;
    const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let y = 0; y <= maxY; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 12)));
    }
    window.scrollTo(0, maxY);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const renderable = [...document.images].filter((image) => {
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    });
    await Promise.all(renderable.map((image) => {
      if (image.complete) return image.decode?.().catch(() => {}) || Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
        setTimeout(done, 5000);
      });
    }));
    window.scrollTo(0, startY);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

async function measurePage(page, selectors, authenticated) {
  return page.evaluate(({ titleSelector, primaryActionSelector, authenticated }) => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const firstVisible = (selector) => selector
      ? [...document.querySelectorAll(selector)].find(visible) || null
      : null;
    const incompleteVisibleImages = [...document.images]
      .filter(visible)
      .filter((image) => !image.complete || image.naturalWidth <= 0)
      .map((image) => image.currentSrc || image.src || image.getAttribute("alt") || "unknown-image");
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
    const title = firstVisible(titleSelector);
    const primary = firstVisible(primaryActionSelector);
    return {
      pathname: location.pathname,
      shellVisible: authenticated ? visible(document.querySelector("#appShell")) : visible(document.querySelector("#authShell")),
      overlayVisible: visible(document.querySelector("vite-error-overlay, #vite-error-overlay, .vite-error-overlay")),
      bodyTextLength: (document.body?.innerText || "").trim().length,
      fontStatus: document.fonts.status,
      horizontalOverflowPx: Math.max(0, documentWidth - document.documentElement.clientWidth),
      documentWidth,
      documentHeight,
      titleVisible: Boolean(title),
      titleText: (title?.textContent || "").trim().slice(0, 240),
      primaryActionVisible: Boolean(primary),
      primaryActionText: (primary?.textContent || "").trim().slice(0, 240),
      incompleteVisibleImages
    };
  }, {
    titleSelector: selectors.title,
    primaryActionSelector: selectors.primaryAction,
    authenticated
  });
}

function resolveCaptureSelectors(kind, captureCase) {
  return kind === "route"
    ? {
        targets: [...captureCase.selectors],
        title: captureCase.titleSelector,
        primaryAction: captureCase.primaryActionSelector
      }
    : {
        expected: captureCase.expected.selector,
        title: captureCase.titleSelector,
        primaryAction: captureCase.primaryActionSelector
      };
}

function compactAxeViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact || "unknown",
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary || ""
    }))
  };
}

function buildFindings(captureCase, measurements, violations) {
  const findings = [];
  if (captureCase.qualityFinding) {
    findings.push({
      id: `${captureCase.id}:planned-state-not-visibly-reachable`,
      caseId: captureCase.id,
      surfaceId: captureCase.surfaceId,
      kind: "shared-state",
      severity: "quality",
      detail: captureCase.qualityFinding
    });
  }
  if (measurements.horizontalOverflowPx > 0) {
    findings.push({ id: `${captureCase.id}:horizontal-overflow`, caseId: captureCase.id, surfaceId: captureCase.surfaceId, kind: "layout", severity: "quality", value: measurements.horizontalOverflowPx });
  }
  if (!measurements.titleVisible) {
    findings.push({ id: `${captureCase.id}:hidden-title`, caseId: captureCase.id, surfaceId: captureCase.surfaceId, kind: "layout", severity: "quality" });
  }
  if (!measurements.primaryActionVisible) {
    findings.push({ id: `${captureCase.id}:hidden-primary-action`, caseId: captureCase.id, surfaceId: captureCase.surfaceId, kind: "layout", severity: "quality" });
  }
  for (const violation of violations) {
    findings.push({
      id: `${captureCase.id}:axe:${violation.id}`,
      caseId: captureCase.id,
      surfaceId: captureCase.surfaceId,
      kind: "axe",
      impact: violation.impact,
      ruleId: violation.id,
      help: violation.help,
      nodes: violation.nodes
    });
  }
  return findings;
}

function seedBaselineStorage({ authenticated, theme, accountId }) {
  const account = {
    id: accountId,
    provider: "local",
    name: "Frontend Upgrade Baseline",
    email: "frontend-upgrade-baseline@quantgym.local",
    country: "china",
    region: "上海",
    graduationTerm: "2027-09",
    passwordHash: "7d930e90ff04cf1f317a757dad81ca07cdca4f7b1f98196c6c499241c1902f9d",
    createdAt: "2026-07-12T00:00:00.000Z"
  };
  const lastAuthenticatedAt = new Date().toISOString();
  localStorage.setItem("quantMemoryBoard.auth.v1", JSON.stringify({
    accounts: [account],
    currentUserId: authenticated ? accountId : "",
    lastAuthenticatedAt
  }));
  localStorage.setItem(`quantgym.ui.onboarded.v1:${accountId}`, "1");
  localStorage.setItem("quantMemoryBoard.preferences.v1", JSON.stringify({ language: "zh", sidebarCollapsed: false }));
  localStorage.setItem("quantgym.ui.theme.v1", theme);
  if (!localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`)) {
    localStorage.setItem(`quantMemoryBoard.userState.v1.${accountId}`, JSON.stringify({}));
  }
  if (document.documentElement) {
    if (theme === "dark") document.documentElement.setAttribute("data-qg-theme", "dark");
    else document.documentElement.removeAttribute("data-qg-theme");
  }
}

function buildMetadata() {
  return {
    browser: "Google Chrome via playwright-core",
    chromePath: harness?.chromePath || "",
    chromeVersion,
    buildMode: "isolated-production-preview",
    locale: "zh-CN",
    distRuntimeFingerprint: harness?.fingerprint || "",
    fingerprintAlgorithm: "sha256",
    provenance: harness?.provenance || null,
    buildEnvironment: harness?.buildEnv || null
  };
}

function prepareOutputDirectories() {
  for (const directory of [path.join(artifactsRoot, "routes"), path.join(artifactsRoot, "shared-states"), reviewRoot]) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
  }
}

function filterCases(cases) {
  let selected = [...cases];
  if (onlyPattern) selected = selected.filter((item) => item.id.includes(onlyPattern));
  if (limit) selected = selected.slice(0, limit);
  return selected;
}

function compactFailure(result) {
  return { id: result.id, surfaceId: result.surfaceId, error: result.error, errors: result.errors };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function safeFileName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "-");
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

function log(message) {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  process.stdout.write(`[frontend-upgrade-baseline ${elapsed}s] ${message}\n`);
}
