import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE1_SURFACE_REQUIRED_SOURCES,
  assertPhase1NodeRuntime,
  buildPhase1SystemSurfacesLiveSummary,
  collectPhase1SystemSurfaceOfflineEvidence,
  inspectPhase1BundleBudgets,
  phase1E2EChildEnvironment,
  phase1SystemBrowserLaunchOptions,
  runPhase1ExactCommitE2E,
  validatePhase1BrowserAudit,
  validatePhase1E2EReport,
  validatePhase1SystemSurfaceSources,
} from "../scripts/check-frontend-upgrade-phase1-system-surfaces.mjs";
import {
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  phase1AuditCredentialsAreValid,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadSources = async () => Object.fromEntries(await Promise.all(
  Object.entries(PHASE1_SURFACE_REQUIRED_SOURCES).map(async ([key, relativePath]) => (
    [key, await readFile(path.join(root, relativePath), "utf8")]
  )),
));
const e2eReport = (overrides = {}) => ({
  suites: [{
    title: "phase1.spec.ts",
    specs: [{
      title: "full suite",
      tests: Array.from({ length: 82 }, () => ({
        expectedStatus: "passed",
        status: "expected",
      })),
    }],
  }],
  errors: [],
  stats: {
    expected: 82,
    skipped: 0,
    unexpected: 0,
    flaky: 0,
    ...overrides,
  },
});

test("Phase 1 E2E runtime accepts only exact Node 20.20.2", () => {
  assert.equal(assertPhase1NodeRuntime("20.20.2"), "20.20.2");
  for (const version of ["20.20.1", "20.20.3", "20.19.6", "22.20.2", "v20.20.2", ""]) {
    assert.throws(
      () => assertPhase1NodeRuntime(version),
      /requires Node 20\.20\.2/u,
    );
  }
});

test("Phase 1 audit credentials accept only synthetic example.com identities", () => {
  const password = "Qg!0123456789abcdefaZ9";
  assert.equal(phase1AuditCredentialsAreValid({
    email: `phase1-audit-${"a".repeat(32)}@example.com`,
    password,
  }), true);
  for (const email of [
    `phase1-audit-${"a".repeat(32)}@example.invalid`,
    `phase1-audit-${"a".repeat(32)}@example.org`,
    "gary@example.com",
  ]) {
    assert.equal(phase1AuditCredentialsAreValid({ email, password }), false);
  }
});

test("Auth, orchestrator, and system surfaces consume the shared credential contract", async () => {
  const [authSource, orchestratorSource, surfaceSource] = await Promise.all([
    readFile(path.join(root, "scripts/check-frontend-upgrade-phase1-auth.mjs"), "utf8"),
    readFile(path.join(root, "scripts/check-frontend-upgrade-phase1-preview-live.mjs"), "utf8"),
    readFile(
      path.join(root, "scripts/check-frontend-upgrade-phase1-system-surfaces.mjs"),
      "utf8",
    ),
  ]);
  assert.ok(authSource.includes(
    "&& !phase1AuditCredentialsAreValid(suppliedCredentials)",
  ));
  assert.ok(orchestratorSource.includes(
    "email: `phase1-audit-${random}@example.com`",
  ));
  assert.ok(surfaceSource.includes(
    "if (!phase1AuditCredentialsAreValid(credentials))",
  ));
  for (const source of [authSource, orchestratorSource, surfaceSource]) {
    assert.equal(source.includes("@example.invalid"), false);
  }
});

test("checked-in Phase 1 system surfaces trace 82 gates and stay within bundle budgets", async () => {
  const result = await collectPhase1SystemSurfaceOfflineEvidence(root);
  assert.deepEqual(result.failures, []);
  assert.equal(result.summary.status, "pass");
  assert.equal(result.summary.systemSurfaceCount, 8);
  assert.equal(result.summary.targetGateCount, 82);
  assert.equal(result.summary.activatedFutureStateCount, 6);
  assert.equal(result.summary.declaredVisualCaseCount, 48);
  assert.equal(result.summary.bundle.initialWithinBudget, true);
  assert.equal(result.summary.bundle.routesWithinBudget, true);
  assert.ok(result.summary.bundle.initialJsGzipBytes <= 180 * 1024);
  assert.ok(result.summary.bundle.largestRouteChunkGzipBytes <= 100 * 1024);
});

test("surface source gate rejects missing journeys, mutation traces, states, and systems", async () => {
  const sources = await loadSources();
  assert.deepEqual(validatePhase1SystemSurfaceSources(sources), []);

  assert.match(validatePhase1SystemSurfaceSources({
    ...sources,
    authE2e: sources.authE2e.replaceAll("@e2e:auth-session-and-recovery", "missing"),
  }).join("\n"), /auth-session-and-recovery/u);
  assert.match(validatePhase1SystemSurfaceSources({
    ...sources,
    platformE2e: sources.platformE2e.replace(
      "@mutation:todo.create:offline-draft",
      "@missing:todo.create:offline-draft",
    ),
  }).join("\n"), /mutation:todo\.create:offline-draft/u);
  assert.match(validatePhase1SystemSurfaceSources({
    ...sources,
    shellE2e: sources.shellE2e.replace(
      "@shared-state:network-recovery:stale-conflict",
      "@missing:network-recovery:stale-conflict",
    ),
  }).join("\n"), /stale-conflict/u);
  assert.match(validatePhase1SystemSurfaceSources({
    ...sources,
    legacyE2e: sources.legacyE2e.replace(
      'id: "system:todo"',
      'id: "system:missing"',
    ),
  }).join("\n"), /runtime legacy-isolation matrix is missing system:todo/u);
});

test("surface source gate fails closed when approved aggregate counts drift", async () => {
  const sources = await loadSources();
  const manifest = structuredClone(APPROVED_PHASE1_ACCEPTANCE_MANIFEST);
  manifest.gates.pop();
  assert.match(
    validatePhase1SystemSurfaceSources(sources, manifest).join("\n"),
    /exactly 82 target gates|unique/u,
  );
});

test("browser audit accepts only the exact 48-case zero-error matrix", () => {
  const valid = {
    visualCaseCount: 48,
    seriousOrCriticalAxeFindings: 0,
    applicationConsoleErrors: 0,
    unhandledRejections: 0,
    imageFingerprints: Array.from({ length: 48 }, (_, index) => (
      index.toString(16).padStart(64, "0")
    )),
  };
  assert.deepEqual(validatePhase1BrowserAudit(valid), []);
  assert.deepEqual(validatePhase1BrowserAudit({
    ...valid,
    imageFingerprints: Array.from({ length: 48 }, () => "a".repeat(64)),
  }), []);

  assert.match(validatePhase1BrowserAudit({
    ...valid,
    seriousOrCriticalAxeFindings: 1,
  }).join("\n"), /axe/u);
  assert.match(validatePhase1BrowserAudit({
    ...valid,
    applicationConsoleErrors: 1,
  }).join("\n"), /console/u);
  assert.match(validatePhase1BrowserAudit({
    ...valid,
    unhandledRejections: 1,
  }).join("\n"), /unhandled/u);
  assert.match(validatePhase1BrowserAudit({
    ...valid,
    imageFingerprints: valid.imageFingerprints.slice(1),
  }).join("\n"), /fingerprints/u);
});

test("system browser launch only accepts the explicit system Chrome switch", () => {
  assert.throws(
    () => phase1SystemBrowserLaunchOptions({}),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
  assert.deepEqual(
    phase1SystemBrowserLaunchOptions({ PLAYWRIGHT_USE_SYSTEM_CHROME: "1" }),
    { headless: true, channel: "chrome" },
  );
  for (const value of ["0", "true", "msedge", "chrome-beta"]) {
    assert.throws(
      () => phase1SystemBrowserLaunchOptions({
        PLAYWRIGHT_CHANNEL: "msedge",
        PLAYWRIGHT_USE_SYSTEM_CHROME: value,
      }),
      /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
    );
  }
});

test("E2E child environment excludes provider and application secrets", () => {
  assert.throws(
    () => phase1E2EChildEnvironment({}),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
  assert.throws(
    () => phase1E2EChildEnvironment({ PLAYWRIGHT_USE_SYSTEM_CHROME: "true" }),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
  assert.deepEqual(phase1E2EChildEnvironment({
    PATH: "/controlled/bin",
    HOME: "/controlled/home",
    PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
    QUANTGYM_PHASE1_AUTH_AUDIT_PASSWORD: "must-not-pass",
    CLOUDFLARE_API_TOKEN: "must-not-pass",
    DATABASE_URL: "must-not-pass",
    AWS_SECRET_ACCESS_KEY: "must-not-pass",
  }), {
    HOME: "/controlled/home",
    PATH: "/controlled/bin",
    PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
    CI: "true",
  });
});

test("full E2E evidence requires exactly 82 executed passes with no skip or retry", () => {
  assert.deepEqual(validatePhase1E2EReport(e2eReport()), {
    executedTestCount: 82,
    passedTestCount: 82,
    skippedTestCount: 0,
    failedTestCount: 0,
    flakyTestCount: 0,
  });
  assert.throws(
    () => validatePhase1E2EReport(e2eReport({ expected: 81, skipped: 1 })),
    /exact 82-test pass/u,
  );
  assert.throws(
    () => validatePhase1E2EReport(e2eReport({ expected: 81, unexpected: 1 })),
    /exact 82-test pass/u,
  );
  assert.throws(
    () => validatePhase1E2EReport(e2eReport({ expected: 81, flaky: 1 })),
    /exact 82-test pass/u,
  );
});

test("E2E runner injection is confined to NODE_ENV=test in an isolated root", async (t) => {
  const temporaryRoot = process.platform === "win32" ? os.tmpdir() : "/tmp";
  const fixture = await mkdtemp(path.join(temporaryRoot, "qg-phase1-e2e-runner-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const commit = "b".repeat(40);
  const runner = async ({ root: receivedRoot, expectedCommit, environment }) => {
    assert.equal(receivedRoot, fixture);
    assert.equal(expectedCommit, commit);
    assert.equal(environment.NODE_ENV, "test");
    return {
      commit,
      exitCode: 0,
      signal: null,
      report: e2eReport(),
    };
  };
  const evidence = await runPhase1ExactCommitE2E({
    root: fixture,
    expectedCommit: commit,
    environment: {
      NODE_ENV: "test",
      PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
    },
    runner,
  });
  assert.equal(evidence.executedTestCount, 82);
  await assert.rejects(
    runPhase1ExactCommitE2E({
      root: fixture,
      expectedCommit: commit,
      environment: { NODE_ENV: "test" },
      runner,
    }),
    /requires PLAYWRIGHT_USE_SYSTEM_CHROME=1/u,
  );
  await assert.rejects(
    runPhase1ExactCommitE2E({
      root: fixture,
      expectedCommit: commit,
      environment: {
        NODE_ENV: "production",
        PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
      },
      runner,
    }),
    /requires NODE_ENV=test/u,
  );
  await assert.rejects(
    runPhase1ExactCommitE2E({
      root,
      expectedCommit: commit,
      environment: {
        NODE_ENV: "test",
        PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
      },
      runner,
    }),
    /requires an isolated root/u,
  );
});

test("bundle inspector rejects an incompressible initial payload over 180KB", async (t) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "qg-phase1-bundle-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  await mkdir(path.join(fixture, "dist-v2/assets"), { recursive: true });
  await writeFile(
    path.join(fixture, "dist-v2/index.html"),
    '<script type="module" src="/assets/main.js"></script>',
  );
  await writeFile(path.join(fixture, "dist-v2/assets/main.js"), randomBytes(220 * 1024));
  const budget = await inspectPhase1BundleBudgets(fixture);
  assert.equal(budget.initialWithinBudget, false);
  assert.ok(budget.initialJsGzipBytes > 180 * 1024);
});

test("live surface evidence uses the strict aggregate envelope", () => {
  const browserAudit = {
    visualCaseCount: 48,
    seriousOrCriticalAxeFindings: 0,
    applicationConsoleErrors: 0,
    unhandledRejections: 0,
    imageFingerprints: Array.from({ length: 48 }, () => "a".repeat(64)),
  };
  const summary = buildPhase1SystemSurfacesLiveSummary({
    browserAudit,
    e2eExecution: {
      commit: "b".repeat(40),
      executedTestCount: 82,
      passedTestCount: 82,
      skippedTestCount: 0,
      failedTestCount: 0,
      flakyTestCount: 0,
    },
    offlineSummary: {
      bundle: {
        initialJsGzipBytes: 165_042,
        initialJsBudgetBytes: 180 * 1024,
        largestRouteChunkGzipBytes: 4_237,
        routeChunkBudgetBytes: 100 * 1024,
        initialWithinBudget: true,
        routesWithinBudget: true,
        initialFileCount: 3,
        routeChunkCount: 4,
      },
    },
    checkedAt: new Date("2026-07-23T00:00:00.000Z"),
    commit: "b".repeat(40),
    evidenceSha256: "c".repeat(64),
  });
  assert.deepEqual(Object.keys(summary).sort(), [
    "check",
    "checkedAt",
    "checks",
    "commit",
    "counts",
    "evidenceSha256",
    "failureCodes",
    "hashes",
    "schemaVersion",
    "status",
  ]);
  assert.equal(summary.counts.targetGates, 82);
  assert.equal(summary.counts.executedE2eTests, 82);
  assert.equal(summary.checks.fullE2eExecuted, true);
  assert.equal(summary.checks.bundleBudgetsPassed, true);
  assert.throws(() => buildPhase1SystemSurfacesLiveSummary({
    browserAudit,
    e2eExecution: {
      commit: "b".repeat(40),
      executedTestCount: 81,
      passedTestCount: 81,
      skippedTestCount: 1,
      failedTestCount: 0,
      flakyTestCount: 0,
    },
    offlineSummary: {
      bundle: {
        initialJsGzipBytes: 165_042,
        initialJsBudgetBytes: 180 * 1024,
        largestRouteChunkGzipBytes: 4_237,
        routeChunkBudgetBytes: 100 * 1024,
        initialWithinBudget: true,
        routesWithinBudget: true,
        initialFileCount: 3,
        routeChunkCount: 4,
      },
    },
    checkedAt: new Date("2026-07-23T00:00:00.000Z"),
    commit: "b".repeat(40),
    evidenceSha256: "c".repeat(64),
  }), /requires an exact full E2E pass/u);
});

test("CI installs the lockfile Chromium and executes the complete Playwright script", async () => {
  const workflow = await readFile(
    path.join(root, ".github/workflows/frontend-v2-preview.yml"),
    "utf8",
  );
  const playwrightConfig = await readFile(
    path.join(root, "playwright.v2.config.ts"),
    "utf8",
  );
  assert.match(
    playwrightConfig,
    /captureGitInfo:\s*\{\s*commit:\s*false,\s*diff:\s*false,\s*\}/u,
    "Playwright must not fetch shallow PR history while collecting Git metadata",
  );
  assert.match(
    workflow,
    /npx --no-install playwright install --with-deps chromium/u,
  );
  assert.match(workflow, /run: npm run test:e2e:v2 -- --retries=0/u);
  assert.match(
    workflow,
    /npm run build:v2[\s\S]*npm run test:frontend-upgrade:phase1:node/u,
    "CI must build dist-v2 before Phase 1 Node tests inspect its runtime artifacts",
  );
  const actionReferences = [...workflow.matchAll(/^\s*uses:\s*(\S+)\s*$/gmu)]
    .map((match) => match[1]);
  assert.ok(actionReferences.length >= 4);
  assert.ok(actionReferences.every((value) => /@[0-9a-f]{40}$/u.test(value)));
  assert.doesNotMatch(workflow, /^\s*push:\s*$/mu);
  assert.doesNotMatch(workflow, /\b(?:deploy|wrangler|render)\b/iu);
  assert.doesNotMatch(workflow, /QUANTGYM_PHASE1_(?:PROVIDER|R2|POSTGRES)/u);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./u);
});

test("Linux baseline refresh verifies its runtime and uploads only fresh output", async () => {
  const updater = await readFile(
    path.join(root, "scripts/update-playwright-linux-snapshots.mjs"),
    "utf8",
  );
  const workflow = await readFile(
    path.join(root, ".github/workflows/frontend-v2-preview.yml"),
    "utf8",
  );

  const expectedNodeArchiveSha256 = (
    "19e56f0825510207dd904f087fe52faa0a4eb6b2aab5f0ea7a33830d04888b8b"
  );
  assert.match(updater, new RegExp(expectedNodeArchiveSha256, "u"));
  assert.match(updater, /sha256sum --check --strict -/u);
  assert.doesNotMatch(updater, /curl[^\n]*\|\s*tar/u);
  const downloadIndex = updater.indexOf("--output \"$node_archive\"");
  const checksumIndex = updater.indexOf("sha256sum --check --strict -");
  const extractIndex = updater.indexOf("tar -xzf \"$node_archive\"");
  assert.ok(downloadIndex >= 0);
  assert.ok(downloadIndex < checksumIndex);
  assert.ok(checksumIndex < extractIndex);

  assert.match(workflow, /id: generate_linux_baselines/u);
  assert.match(
    workflow,
    /find tests\/e2e-v2 -type f -name '\*-linux\.png' -delete/u,
  );
  assert.match(workflow, /test "\$\{#snapshots\[@\]\}" = "21"/u);
  assert.match(workflow, /sha256sum --check --strict SHA256SUMS/u);
  assert.match(
    workflow,
    /steps\.generate_linux_baselines\.outcome == 'success'/u,
  );
  assert.match(
    workflow,
    /steps\.generate_linux_baselines\.outputs\.snapshot_count == '21'/u,
  );
  assert.match(
    workflow,
    /path: \$\{\{ runner\.temp \}\}\/playwright-linux-visual-baselines/u,
  );
  const uploadBlock = workflow.match(
    /- name: Upload generated Playwright Linux visual baselines[\s\S]*?retention-days: 14/u,
  )?.[0] ?? "";
  assert.notEqual(uploadBlock, "");
  assert.doesNotMatch(uploadBlock, /always\(\)/u);
  assert.doesNotMatch(uploadBlock, /tests\/e2e-v2\/\*\*\/\*-linux\.png/u);
});
