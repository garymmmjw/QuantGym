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

test("capture status preserves measured findings and never hides runtime failures", () => {
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [] }), "pass");
  assert.equal(summarizeCaptureStatus({ captureFailures: [], findings: [{ id: "axe-serious" }] }), "captured-with-findings");
  assert.equal(summarizeCaptureStatus({ captureFailures: [{ id: "route-failed" }], findings: [] }), "fail");
  assert.equal(summarizeCaptureStatus({ captureFailures: [{ id: "route-failed" }], findings: [{ id: "overflow" }] }), "fail");
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
});

test("performance CLI labels synthetic latency honestly and inventories gzip chunks", () => {
  const source = fs.readFileSync(path.join(root, "scripts/capture-frontend-upgrade-performance.mjs"), "utf8");
  assert.match(source, /new PerformanceObserver[\s\S]*largest-contentful-paint/);
  assert.match(source, /new PerformanceObserver[\s\S]*layout-shift/);
  assert.match(source, /status: "unavailable-before-v2-rum"/);
  assert.match(source, /not labelled as field INP/);
  assert.match(source, /labInteractionLatencyMs/);
  assert.match(source, /gzipSync\(bytes, \{ level: 9 \}\)/);
  assert.doesNotMatch(source, /fieldInp(?:Ms|P75)\s*:\s*metrics\.labInteractionLatencyMs/);
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
