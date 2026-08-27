import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPROVED_ACCEPTANCE_POLICY } from "../scripts/lib/frontend-upgrade-approved-acceptance.mjs";
import { CANONICAL_SURFACE_INVENTORY } from "../scripts/lib/frontend-upgrade-approved-surfaces.mjs";
import { ROUTE_TARGETS } from "../scripts/lib/browser-route-targets.mjs";
import { MODULE_MANIFEST } from "../src/modules/manifest.js";
import * as frontendUpgradeBaseline from "../scripts/lib/frontend-upgrade-baseline.mjs";
import * as frontendUpgradeHarness from "../scripts/lib/frontend-upgrade-browser-harness.mjs";
import {
  BASELINE_AXE_TAGS,
  BASELINE_VIEWPORTS,
  FRONTEND_UPGRADE_ROUTE_FIXTURES,
  PERFORMANCE_BASELINE_TARGETS,
  SHARED_STATE_CAPTURE_INVENTORY,
  buildCaptureCases,
  buildPerformanceCases,
  buildSharedStateInventory,
  partitionSharedStateCases,
  selectTrackedReviewCases,
  summarizeCaptureStatus
} from "../scripts/lib/frontend-upgrade-baseline.mjs";
import {
  buildFrontendUpgradeHarnessEnv,
  buildPreviewArgs,
  createFrontendUpgradeBrowserHarness,
  distRuntimeFingerprint,
  sha256File
} from "../scripts/lib/frontend-upgrade-browser-harness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("builds the complete light-dark viewport matrix", () => {
  const cases = buildCaptureCases(FRONTEND_UPGRADE_ROUTE_FIXTURES, CANONICAL_SURFACE_INVENTORY);
  assert.equal(cases.length, 150);
  assert.equal(new Set(cases.map((item) => item.id)).size, 150);
  assert.equal(cases.filter((item) => item.theme === "dark").length, 75);
  assert.equal(cases.filter((item) => item.viewport.id === "tablet").length, 12);
  assert.equal(cases.filter((item) => item.surfaceId === "system:auth").length, 6);
  assert.ok(cases.every((item) => typeof item.path === "string" && item.path.startsWith("/")));
  assert.deepEqual(new Set(cases.map((item) => item.theme)), new Set(["light", "dark"]));
  assert.deepEqual(
    new Set(cases.filter((item) => item.viewport.id === "tablet").map((item) => item.routeId)),
    new Set(APPROVED_ACCEPTANCE_POLICY.evidenceCases.routeMatrix.tabletDistinctRouteIds)
  );
});

test("route fixtures cover auth and the current manifest exactly", () => {
  assert.equal(FRONTEND_UPGRADE_ROUTE_FIXTURES.length, 23);
  const auth = FRONTEND_UPGRADE_ROUTE_FIXTURES[0];
  assert.deepEqual(
    { id: auth.id, surfaceId: auth.surfaceId, path: auth.path, authenticated: auth.authenticated },
    { id: "auth", surfaceId: "system:auth", path: "/login", authenticated: false }
  );
  assert.ok(auth.selectors.length > 0);
  assert.ok(auth.titleSelector);
  const routeFixtures = FRONTEND_UPGRADE_ROUTE_FIXTURES.slice(1);
  assert.deepEqual(routeFixtures.map((item) => item.routeId), MODULE_MANIFEST.map((item) => item.id));
  assert.deepEqual(routeFixtures.map((item) => item.path), MODULE_MANIFEST.map((item) => item.path));
  for (const fixture of routeFixtures) {
    assert.deepEqual(fixture.selectors, ROUTE_TARGETS[fixture.routeId], fixture.routeId);
    assert.equal(fixture.surfaceId, `route:${fixture.routeId}`);
    assert.equal(fixture.authenticated, true);
    assert.ok(fixture.titleSelector, `${fixture.id} title selector`);
    assert.ok(fixture.primaryActionSelector, `${fixture.id} primary action selector`);
  }
});

test("shared-state inventory is exact, executable, and honest about future gates", () => {
  const inventory = buildSharedStateInventory(APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates);
  assert.deepEqual(inventory, SHARED_STATE_CAPTURE_INVENTORY);
  assert.equal(inventory.length, 32);
  assert.equal(new Set(inventory.map((item) => item.id)).size, 32);
  assert.deepEqual(
    new Set(inventory.map((item) => item.surfaceId)),
    new Set([
      "system:auth",
      "system:desktop-shell",
      "system:mobile-shell",
      "system:global-search",
      "system:notifications-toast",
      "system:todo",
      "system:theme-language",
      "system:network-recovery"
    ])
  );
  const { current, future } = partitionSharedStateCases(inventory);
  assert.equal(current.length, 26);
  assert.equal(future.length, 6);
  assert.ok(current.every((item) => item.expectedStatus === "current-capture" && item.targetPhase === 0));
  assert.ok(current.every((item) => item.screenshotClaim === true));
  assert.ok(future.every((item) => item.expectedStatus === "future-gate" && item.targetPhase === 1));
  assert.ok(future.every((item) => item.screenshotClaim === false && item.targetCommand));
  assert.ok(future.every((item) => !Object.hasOwn(item, "captureStatus")));
  for (const item of inventory) {
    assert.ok(["light", "dark"].includes(item.theme), `${item.id} theme`);
    assert.ok(BASELINE_VIEWPORTS[item.viewportId], `${item.id} viewport`);
    assert.equal(typeof item.path, "string", `${item.id} path`);
    assert.ok(item.setup?.kind, `${item.id} setup`);
    assert.ok(Object.hasOwn(item, "focusTarget"), `${item.id} focus target declaration`);
    assert.ok(item.expected?.selector, `${item.id} expected selector`);
    assert.ok(
      item.expected.text || item.expected.aria || item.expected.attribute || typeof item.expected.visible === "boolean",
      `${item.id} concrete expected state`
    );
    assert.ok(Array.isArray(item.acceptanceIds) && item.acceptanceIds.length > 0, `${item.id} acceptance IDs`);
  }
});

test("shared-state presentation selectors target the state being captured", () => {
  for (const item of SHARED_STATE_CAPTURE_INVENTORY) {
    assert.equal(typeof item.titleSelector, "string", `${item.id} title selector`);
    assert.ok(item.titleSelector.length > 0, `${item.id} title selector`);
    assert.equal(typeof item.primaryActionSelector, "string", `${item.id} primary action selector`);
    assert.ok(item.primaryActionSelector.length > 0, `${item.id} primary action selector`);
  }
  const byId = new Map(SHARED_STATE_CAPTURE_INVENTORY.map((item) => [item.id, item]));
  assert.equal(
    byId.get("shared-state:auth:registration-error").primaryActionSelector,
    "#registerForm .auth-submit.auth-register-info-only"
  );
  assert.equal(
    byId.get("shared-state:auth:password-reset").primaryActionSelector,
    "#resetPasswordForm button[type='submit']"
  );
  assert.equal(byId.get("shared-state:todo:empty-mobile").primaryActionSelector, "#todoDockButton");
  assert.equal(byId.get("shared-state:todo:reduced-motion-mobile").primaryActionSelector, "#todoDockButton");
});

test("tracked review selection has 29 deterministic reachable representatives", () => {
  const routeCases = buildCaptureCases(FRONTEND_UPGRADE_ROUTE_FIXTURES, CANONICAL_SURFACE_INVENTORY);
  const reviewCases = selectTrackedReviewCases(routeCases, SHARED_STATE_CAPTURE_INVENTORY);
  assert.equal(reviewCases.length, 29);
  assert.equal(new Set(reviewCases.map((item) => item.reviewId)).size, 29);
  assert.equal(reviewCases.filter((item) => item.kind === "route").length, 23);
  assert.equal(reviewCases.filter((item) => item.kind === "shared-state").length, 6);
  assert.ok(reviewCases.every((item) => item.sourceCaseId && item.outputFile.endsWith(".jpg")));
  assert.equal(reviewCases.some((item) => item.surfaceId === "system:network-recovery"), false);
});

test("axe tags and synthetic performance cases match the approved methodology", () => {
  assert.deepEqual(BASELINE_AXE_TAGS, ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
  assert.deepEqual(PERFORMANCE_BASELINE_TARGETS, {
    lcpMs: 2500,
    inpFieldP75Ms: 200,
    cls: 0.1,
    initialJsGzipBytes: 184320,
    ordinaryRouteChunkGzipBytes: 102400,
    horizontalOverflowPx: 0
  });
  const cases = buildPerformanceCases(FRONTEND_UPGRADE_ROUTE_FIXTURES);
  assert.equal(cases.length, 12);
  assert.equal(new Set(cases.map((item) => item.id)).size, 12);
  assert.deepEqual(new Set(cases.map((item) => item.routeId)), new Set(["auth", "overview", "problems", "interview", "league", "messages"]));
  assert.deepEqual(new Set(cases.map((item) => item.viewport.id)), new Set(["laptop", "mobile"]));
  assert.ok(cases.every((item) => item.theme === "light" && item.coldContext === true));
});

test("performance cases choose a visible interaction for each viewport", () => {
  const cases = buildPerformanceCases(FRONTEND_UPGRADE_ROUTE_FIXTURES);
  for (const performanceCase of cases) {
    if (!performanceCase.authenticated) {
      assert.deepEqual(performanceCase.labInteraction, {
        kind: "input",
        selector: "#loginEmail",
        label: "auth email input to two animation frames"
      });
      continue;
    }
    if (performanceCase.viewport.id === "mobile") {
      assert.deepEqual(performanceCase.labInteraction, {
        kind: "click",
        selector: ".qg-tabbar-more",
        label: "mobile module sheet open to two animation frames",
        observedAttribute: "aria-expanded"
      });
      continue;
    }
    assert.deepEqual(performanceCase.labInteraction, {
      kind: "click",
      selector: "#todoDockButton",
      label: "todo dock open to two animation frames",
      observedAttribute: "aria-expanded"
    });
  }
});

test("capture status preserves measured findings and never hides runtime failures", () => {
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [] }), "pass");
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [{ id: "axe-serious" }] }), "captured-with-findings");
  assert.equal(summarizeCaptureStatus({ captureFailures: [{ id: "route-failed" }], findings: [] }), "fail");
  assert.equal(summarizeCaptureStatus({ captureFailures: [{ id: "route-failed" }], findings: [{ id: "overflow" }] }), "fail");
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [], expected: 12, checked: 11, succeeded: 11 }), "fail");
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [], expected: 12, checked: 12, succeeded: 11 }), "fail");
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [], expected: 12, checked: 12, succeeded: 12 }), "pass");
  assert.equal(summarizeCaptureStatus({
    captureFailures: [],
    findings: [],
    expected: 12,
    checked: 12,
    succeeded: 12,
    expectedReview: 6,
    generatedReview: 5
  }), "fail");
});

test("console allowlist never waives matching first-party errors", () => {
  assert.equal(typeof frontendUpgradeHarness.isAllowedFrontendUpgradeConsoleError, "function");
  const text = "[reporter-pb]: request error TypeError: Failed to fetch";
  const firstPartyOrigins = ["http://127.0.0.1:43123", "http://127.0.0.1:8790"];
  assert.equal(frontendUpgradeHarness.isAllowedFrontendUpgradeConsoleError(
    text,
    "https://s1.hdslb.com/bfs/seed/jinkela/short/reporter-pb/index.js",
    firstPartyOrigins
  ), true);
  assert.equal(frontendUpgradeHarness.isAllowedFrontendUpgradeConsoleError(
    text,
    "http://127.0.0.1:43123/assets/index.js",
    firstPartyOrigins
  ), false);
  assert.equal(frontendUpgradeHarness.isAllowedFrontendUpgradeConsoleError(
    "application exploded",
    "https://s1.hdslb.com/bfs/seed/jinkela/short/reporter-pb/index.js",
    firstPartyOrigins
  ), false);
});

test("recorded build environment excludes ambient variables and normalizes temp paths", () => {
  assert.equal(typeof frontendUpgradeHarness.recordFrontendUpgradeBuildEnvironment, "function");
  const recorded = frontendUpgradeHarness.recordFrontendUpgradeBuildEnvironment({
    QUANTGYM_WEB_API_ENDPOINT: "http://127.0.0.1:8790/api",
    QUANTGYM_WEB_GOOGLE_CLIENT_ID: "",
    QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: "false",
    QUANTGYM_WEB_IGNORE_DOTENV: "1",
    QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG: "1",
    QUANTGYM_WEB_LLM_ENDPOINT: "http://127.0.0.1:8787/interview",
    QUANTGYM_WEB_LLM_MODEL: "gpt-5-nano",
    QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "/data/problem-catalog.js?v=2",
    QUANTGYM_WEB_DIST: "/private/tmp/quantgym-secret-path/dist",
    QUANTGYM_WEB_PRIVATE_TOKEN: "must-not-be-recorded",
    PATH: process.env.PATH
  });
  assert.deepEqual(Object.keys(recorded).sort(), [
    "QUANTGYM_WEB_API_ENDPOINT",
    "QUANTGYM_WEB_DIST",
    "QUANTGYM_WEB_GOOGLE_CLIENT_ID",
    "QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED",
    "QUANTGYM_WEB_IGNORE_DOTENV",
    "QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG",
    "QUANTGYM_WEB_LLM_ENDPOINT",
    "QUANTGYM_WEB_LLM_MODEL",
    "QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT"
  ]);
  assert.equal(recorded.QUANTGYM_WEB_DIST, "<temporary-dist>");
  assert.equal(Object.hasOwn(recorded, "QUANTGYM_WEB_PRIVATE_TOKEN"), false);
});

test("performance metric validation rejects missing observer or paint data", () => {
  assert.equal(typeof frontendUpgradeBaseline.validatePerformanceMetrics, "function");
  const valid = {
    navigationTiming: { durationMs: 123 },
    fcpMs: 100,
    lcpMs: 200,
    observers: { lcpSupported: true, layoutShiftSupported: true, errors: [] }
  };
  assert.deepEqual(frontendUpgradeBaseline.validatePerformanceMetrics(valid), []);
  assert.deepEqual(frontendUpgradeBaseline.validatePerformanceMetrics({
    ...valid,
    lcpMs: 0,
    observers: { lcpSupported: false, layoutShiftSupported: true, errors: ["lcp unavailable"] }
  }), ["lcp-observer-unavailable", "lcp-unavailable", "observer-error:lcp unavailable"]);
});

test("harness build environment is explicit and poisoned aliases cannot win", () => {
  const poison = {
    QUANTGYM_WEB_API_ENDPOINT: "https://poison.invalid/api",
    QUANTGYM_WEB_LLM_ENDPOINT: "https://poison.invalid/interview",
    QUANTGYM_WEB_GOOGLE_CLIENT_ID: "poison.apps.googleusercontent.com",
    QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: "true",
    QUANTGYM_WEB_IGNORE_DOTENV: "0",
    QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG: "0",
    PATH: process.env.PATH
  };
  const env = buildFrontendUpgradeHarnessEnv("/tmp/quantgym-upgrade-dist", poison);
  assert.equal(env.QUANTGYM_WEB_DIST, "/tmp/quantgym-upgrade-dist");
  assert.equal(env.QUANTGYM_WEB_IGNORE_DOTENV, "1");
  assert.equal(env.QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG, "1");
  assert.equal(env.QUANTGYM_WEB_API_ENDPOINT, "http://127.0.0.1:8790/api");
  assert.equal(env.QUANTGYM_WEB_LLM_ENDPOINT, "http://127.0.0.1:8787/interview");
  assert.equal(env.QUANTGYM_WEB_GOOGLE_CLIENT_ID, "");
  assert.equal(env.QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED, "false");
});

test("preview arguments bind the temporary production dist explicitly", () => {
  assert.deepEqual(buildPreviewArgs("/tmp/quantgym-upgrade-dist", 43123), [
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "43123",
    "--outDir",
    "/tmp/quantgym-upgrade-dist",
    "--strictPort"
  ]);
});

test("real harness serves an isolated production build from version.json", { timeout: 120000 }, async () => {
  const harness = await createFrontendUpgradeBrowserHarness();
  const tempRoot = harness.tempRoot;
  try {
    assert.equal(harness.buildEnv.QUANTGYM_WEB_IGNORE_DOTENV, "1");
    assert.equal(harness.buildEnv.QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG, "1");
    assert.equal(harness.buildEnv.QUANTGYM_WEB_GOOGLE_CLIENT_ID, "");
    assert.equal(harness.buildEnv.QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED, "false");
    assert.equal(harness.buildEnv.QUANTGYM_WEB_DIST, "<temporary-dist>");
    assert.equal(harness.version.commit, harness.provenance.buildCommit);
    assert.equal(harness.version.branch, harness.provenance.buildBranch);
    assert.equal(harness.version.source, harness.provenance.buildSource);
    assert.match(harness.fingerprint, /^[a-f0-9]{64}$/);
    const builtConfig = fs.readFileSync(path.join(harness.distDir, "config.js"), "utf8");
    assert.doesNotMatch(builtConfig, /539256360065-75e3la13tbnc1ih7pot2lt1q6upk7ed7\.apps\.googleusercontent\.com/);
    assert.match(builtConfig, /"googleClientId"\s*:\s*""/);
    assert.match(builtConfig, /"googleLoginEnabled"\s*:\s*false/);
    const response = await fetch(`${harness.baseUrl}/version.json`, { cache: "no-store" });
    assert.equal(response.ok, true);
  } finally {
    await harness.cleanup();
  }
  assert.equal(fs.existsSync(tempRoot), false);
});

test("harness fingerprint ignores provenance only and hashes every other byte", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-upgrade-harness-test-"));
  try {
    const first = path.join(tempRoot, "first");
    const second = path.join(tempRoot, "second");
    createDist(first, { commit: "a".repeat(40), branch: "first", source: "local-git", asset: "same" });
    createDist(second, { commit: "b".repeat(40), branch: "second", source: "ci", asset: "same" });
    assert.equal(distRuntimeFingerprint(first), distRuntimeFingerprint(second));
    fs.writeFileSync(path.join(second, "assets", "app.js"), "changed");
    assert.notEqual(distRuntimeFingerprint(first), distRuntimeFingerprint(second));
    assert.equal(sha256File(path.join(first, "assets", "app.js")), sha256File(path.join(first, "assets", "app.js")));
    assert.notEqual(sha256File(path.join(first, "assets", "app.js")), sha256File(path.join(second, "assets", "app.js")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("axe dependency stays exact for reproducible scans", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(packageJson.devDependencies?.["@axe-core/playwright"], "4.12.1");
});

test("capture CLI keeps runtime failures strict and future gates non-passing", () => {
  const source = fs.readFileSync(path.join(root, "scripts/capture-frontend-upgrade-baseline.mjs"), "utf8");
  assert.match(source, /new URL\(captureCase\.path, harness\.baseUrl\)\.href/);
  assert.match(source, /new AxeBuilder\(\{ page \}\)\.withTags\(BASELINE_AXE_TAGS\)\.analyze\(\)/);
  assert.match(source, /lastAuthenticatedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(source, /futureGateCounts:\s*\{ checked: futureGates\.length, passed: 0 \}/);
  assert.match(source, /type: "png", fullPage: true/);
  assert.match(source, /type: "jpeg", quality: 72, fullPage: true/);
  assert.match(source, /records = \{ console: \[\], page: \[\], firstPartyResponse: \[\], firstPartyRequest: \[\] \}/);
  assert.match(source, /await locator\.waitFor\(\{ state: "attached", timeout: 10000 \}\)/);
  assert.match(source, /selectors: resolvedSelectors/);
  assert.match(source, /expected: routeCasesAll\.length/);
  assert.match(source, /expected: sharedPartition\.current\.length/);
  assert.match(source, /globalCaptureFailures/);
});

test("performance CLI labels synthetic latency honestly and inventories gzip chunks", () => {
  const source = fs.readFileSync(path.join(root, "scripts/capture-frontend-upgrade-performance.mjs"), "utf8");
  assert.match(source, /new PerformanceObserver[\s\S]*largest-contentful-paint/);
  assert.match(source, /new PerformanceObserver[\s\S]*layout-shift/);
  assert.match(source, /status: "unavailable-before-v2-rum"/);
  assert.match(source, /not labelled as field INP/);
  assert.match(source, /labInteractionLatencyMs/);
  assert.match(source, /gzipSync\(bytes, \{ level: 9 \}\)/);
  assert.match(source, /measureLabInteraction\(page, performanceCase\.labInteraction\)/);
  assert.match(source, /page\.waitForSelector\(interaction\.selector, \{ state: "visible" \}\)/);
  assert.doesNotMatch(source, /page\.waitForSelector\("#todoDockButton", \{ state: "visible" \}\)/);
  assert.doesNotMatch(source, /fieldInp(?:Ms|P75)\s*:\s*metrics\.labInteractionLatencyMs/);
  assert.ok(
    source.indexOf("const metrics = await readPerformanceMetrics(page)")
      < source.indexOf("const interaction = await measureLabInteraction(page, performanceCase.labInteraction)"),
    "navigation metrics must be snapshotted before the synthetic interaction"
  );
  assert.match(source, /validatePerformanceMetrics\(metrics\)/);
  assert.match(source, /expected: allCases\.length/);
});

function createDist(directory, { commit, branch, source, asset }) {
  fs.mkdirSync(path.join(directory, "assets"), { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), "<main>QuantGym</main>");
  fs.writeFileSync(path.join(directory, "assets", "app.js"), asset);
  fs.writeFileSync(path.join(directory, "config.js"), [
    "window.QUANTGYM_CONFIG = {",
    `  \"buildCommit\": ${JSON.stringify(commit)},`,
    `  \"buildBranch\": ${JSON.stringify(branch)},`,
    `  \"buildSource\": ${JSON.stringify(source)},`,
    "  \"llmModel\": \"gpt-5-nano\"",
    "};",
    ""
  ].join("\n"));
  fs.writeFileSync(path.join(directory, "version.json"), JSON.stringify({ commit, branch, source }));
}
