import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

import {
  assertStrictPlaywrightReport,
  assertStrictVitestReport,
  parseStrictNodeTap,
} from "../scripts/lib/frontend-upgrade-strict-test-outcomes.mjs";
import {
  expectedCountFor,
} from "../scripts/run-playwright-v2-strict.mjs";
import {
  resolveStrictNodeGate,
} from "../scripts/run-node-tests-strict.mjs";
import {
  renderPhase2Lifecycle,
} from "../scripts/check-frontend-upgrade-phase2-lifecycle.mjs";
import {
  STRICT_API_PYTEST_FILE_INVENTORY_SHA256,
  STRICT_API_PYTEST_TEST_FILES,
  STRICT_BUILD_ISOLATION_NODE_FILE_INVENTORY_SHA256,
  STRICT_BUILD_ISOLATION_NODE_TEST_FILES,
  STRICT_DESIGN_SYSTEM_NODE_FILE_INVENTORY_SHA256,
  STRICT_DESIGN_SYSTEM_NODE_TEST_FILES,
  STRICT_PHASE1_NODE_FILE_INVENTORY_SHA256,
  STRICT_PHASE1_NODE_TEST_FILES,
  STRICT_PHASE1_UNITTEST_FILE_INVENTORY_SHA256,
  STRICT_PHASE1_UNITTEST_TEST_FILES,
  STRICT_PHASE1_UNITTEST_TEST_ID_INVENTORY_SHA256,
  STRICT_PHASE1_UNITTEST_TEST_IDS,
  STRICT_PHASE2_NODE_FILE_INVENTORY_SHA256,
  STRICT_PHASE2_NODE_TEST_FILES,
  STRICT_VITEST_V2_FILE_COUNT,
  STRICT_VITEST_V2_FILE_INVENTORY_SHA256,
  STRICT_VITEST_V2_TEST_FILES,
  sha256StringInventory,
} from "../scripts/lib/frontend-upgrade-strict-test-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [
  packageManifest,
  previewWorkflow,
  operatorToolchainLock,
  linuxBaselineUpdater,
] = await Promise.all([
  readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, ".github/workflows/frontend-v2-preview.yml"), "utf8")
    .then((source) => yaml.load(source)),
  readFile(
    path.join(root, "docs/frontend-upgrade/phase-2-operator-toolchain-lock.json"),
    "utf8",
  ).then(JSON.parse),
  readFile(path.join(root, "scripts/update-playwright-linux-snapshots.mjs"), "utf8"),
]);

const PHASE2_COMMANDS = Object.freeze({
  "build:frontend-upgrade:phase2:contract-evidence": (
    "node scripts/build-frontend-upgrade-phase2-contract-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:visual-evidence": (
    "node scripts/build-frontend-upgrade-phase2-visual-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:accessibility-evidence": (
    "node scripts/build-frontend-upgrade-phase2-accessibility-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:journeys-evidence": (
    "node scripts/build-frontend-upgrade-phase2-journeys-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:recovery-evidence": (
    "node scripts/build-frontend-upgrade-phase2-recovery-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:performance-evidence": (
    "node scripts/build-frontend-upgrade-phase2-performance-evidence.mjs"
  ),
  "build:frontend-upgrade:phase2:provider-evidence": (
    "node scripts/build-frontend-upgrade-phase2-provider-evidence.mjs"
  ),
  "run:frontend-upgrade:phase2:operator": (
    "node scripts/run-frontend-upgrade-phase2-operator.mjs --execute"
  ),
  "check:frontend-upgrade:phase2:provider-evidence": (
    "node scripts/check-frontend-upgrade-phase2-provider-evidence.mjs"
  ),
  "test:frontend-upgrade:phase2:cutover:dry-run": (
    "node scripts/check-frontend-upgrade-phase2-preview-cutover.mjs --dry-run"
  ),
  "build:frontend-upgrade:phase2:review": (
    "node scripts/build-frontend-upgrade-phase2-review.mjs"
  ),
  "check:frontend-upgrade:phase2:review": (
    "node scripts/check-frontend-upgrade-phase2-review.mjs"
  ),
  "check:frontend-upgrade:phase2:lifecycle": (
    "node scripts/check-frontend-upgrade-phase2-lifecycle.mjs"
  ),
  "build:frontend-upgrade:phase2:aggregate": (
    "node scripts/build-frontend-upgrade-phase2-aggregate.mjs"
  ),
  "check:frontend-upgrade:phase2:aggregate": (
    "node scripts/check-frontend-upgrade-phase2.mjs"
  ),
});

const commandsForStep = (step) => (
  typeof step?.run === "string"
    ? step.run.split("\n").map((line) => line.trim()).filter(Boolean)
    : []
);

const stepNamed = (job, name) => {
  const matches = job.steps.filter((step) => step.name === name);
  assert.equal(matches.length, 1, `workflow step ${name}`);
  return matches[0];
};

const allRunCommands = (workflow) => Object.values(workflow.jobs)
  .flatMap((job) => job.steps)
  .flatMap(commandsForStep);

test("exposes strict, unambiguous npm aliases for Phase 2 evidence and cutover gates", () => {
  for (const [name, command] of Object.entries(PHASE2_COMMANDS)) {
    assert.equal(packageManifest.scripts[name], command, name);
  }
  assert.equal(
    packageManifest.scripts["check:frontend-upgrade:phase2"],
    PHASE2_COMMANDS["check:frontend-upgrade:phase2:aggregate"],
  );
  assert.equal(packageManifest.scripts["check:frontend-upgrade:phase2:cutover"], undefined);
  assert.equal(
    packageManifest.scripts["test:frontend-upgrade:phase2"],
    "node scripts/run-node-tests-strict.mjs --prefix frontend-upgrade-phase2",
  );
  assert.equal(packageManifest.scripts["test:v2"], "node scripts/run-vitest-v2-strict.mjs");
  assert.equal(
    packageManifest.scripts["test:e2e:v2"],
    "node scripts/run-playwright-v2-strict.mjs",
  );
  assert.equal(
    packageManifest.scripts["test:frontend-upgrade:phase1:node"],
    "node scripts/run-node-tests-strict.mjs --prefix frontend-upgrade-phase1",
  );
  assert.equal(
    packageManifest.scripts["test:frontend-upgrade:phase1:python"],
    "node scripts/run-python-unittest-strict.mjs",
  );
  assert.equal(
    packageManifest.scripts["test:api:v2:strict"],
    "node scripts/run-pytest-v2-strict.mjs",
  );
});

test("strict test file and unittest ID inventories match independent SHA-256 locks", () => {
  assert.equal(STRICT_VITEST_V2_TEST_FILES.length, STRICT_VITEST_V2_FILE_COUNT);
  assert.equal(STRICT_API_PYTEST_TEST_FILES.length, 29);
  assert.equal(STRICT_PHASE1_UNITTEST_TEST_FILES.length, 1);
  assert.equal(STRICT_PHASE1_UNITTEST_TEST_IDS.length, 15);
  assert.equal(STRICT_PHASE1_NODE_TEST_FILES.length, 9);
  assert.equal(STRICT_PHASE2_NODE_TEST_FILES.length, 15);
  assert.equal(STRICT_DESIGN_SYSTEM_NODE_TEST_FILES.length, 1);
  assert.equal(STRICT_BUILD_ISOLATION_NODE_TEST_FILES.length, 1);
  for (const [inventory, expectedSha256] of [
    [STRICT_VITEST_V2_TEST_FILES, STRICT_VITEST_V2_FILE_INVENTORY_SHA256],
    [STRICT_API_PYTEST_TEST_FILES, STRICT_API_PYTEST_FILE_INVENTORY_SHA256],
    [
      STRICT_PHASE1_UNITTEST_TEST_FILES,
      STRICT_PHASE1_UNITTEST_FILE_INVENTORY_SHA256,
    ],
    [
      STRICT_PHASE1_UNITTEST_TEST_IDS,
      STRICT_PHASE1_UNITTEST_TEST_ID_INVENTORY_SHA256,
    ],
    [STRICT_PHASE1_NODE_TEST_FILES, STRICT_PHASE1_NODE_FILE_INVENTORY_SHA256],
    [STRICT_PHASE2_NODE_TEST_FILES, STRICT_PHASE2_NODE_FILE_INVENTORY_SHA256],
    [
      STRICT_DESIGN_SYSTEM_NODE_TEST_FILES,
      STRICT_DESIGN_SYSTEM_NODE_FILE_INVENTORY_SHA256,
    ],
    [
      STRICT_BUILD_ISOLATION_NODE_TEST_FILES,
      STRICT_BUILD_ISOLATION_NODE_FILE_INVENTORY_SHA256,
    ],
  ]) assert.equal(sha256StringInventory(inventory), expectedSha256);
});

test("Preview CI is a structured, read-only PR-head workflow with operator execution disabled", () => {
  assert.deepEqual(Object.keys(previewWorkflow.jobs).sort(), ["node-gates", "python-gates"]);
  assert.equal(previewWorkflow.jobs["node-gates"].name, "Node and browser gates");
  assert.equal(previewWorkflow.jobs["python-gates"].name, "Python API and migration gates");
  assert.deepEqual(previewWorkflow.permissions, { contents: "read" });
  assert.equal(previewWorkflow.env.CI, "true");
  assert.equal(previewWorkflow.env.QUANTGYM_PHASE2_OPERATOR_ALLOWED, "false");
  const exactHeadExpression = (
    "${{ github.event_name == 'pull_request' "
    + "&& github.event.pull_request.head.sha || github.sha }}"
  );
  for (const job of Object.values(previewWorkflow.jobs)) {
    const checkout = stepNamed(job, "Check out the complete review history");
    assert.equal(checkout.with["fetch-depth"], 0);
    assert.equal(checkout.with["persist-credentials"], false);
    assert.equal(checkout.with.ref, exactHeadExpression);
  }

  const forbiddenCommands = new Set([
    "npm run build:frontend-upgrade:phase2:provider-evidence",
    "npm run check:frontend-upgrade:phase2:provider-evidence",
    "npm run test:frontend-upgrade:phase2:cutover:dry-run",
    "npm run run:frontend-upgrade:phase2:operator",
    "npm run build:frontend-upgrade:phase2:review",
    "npm run check:frontend-upgrade:phase2:review",
    "npm run build:frontend-upgrade:phase2:aggregate",
  ]);
  const observed = allRunCommands(previewWorkflow);
  for (const command of forbiddenCommands) assert.equal(observed.includes(command), false, command);
  assert.equal(observed.some((command) => command.includes("--execute")), false);
});

test("Preview CI runs build isolation, design system, full E2E, and Phase 2 aggregate gates", () => {
  const job = previewWorkflow.jobs["node-gates"];
  const lifecycle = stepNamed(job, "Classify the fail-closed Phase 2 evidence lifecycle");
  assert.equal(lifecycle.id, "phase2_lifecycle");
  assert.deepEqual(commandsForStep(lifecycle), [
    "node scripts/check-frontend-upgrade-phase2-lifecycle.mjs --format github | tee -a \"$GITHUB_OUTPUT\"",
  ]);
  assert.deepEqual(
    commandsForStep(stepNamed(job, "Verify design-system and isolated-build boundaries")),
    [
      "npm run check:design-system:v2",
      "npm run check:frontend-v2-build-isolation",
    ],
  );
  assert.deepEqual(
    commandsForStep(stepNamed(job, "Build and inspect the production V2 artifact")),
    ["npm run build:v2", "npm run check:frontend-v2-boundaries"],
  );
  assert.deepEqual(
    commandsForStep(stepNamed(job, "Run V2, Phase 1, and Phase 2 tests")),
    [
      "npm run test:v2",
      "npm run test:frontend-upgrade:phase1:node",
      "npm run test:frontend-upgrade:phase2",
    ],
  );
  const fullE2e = stepNamed(job, "Run the complete Playwright suite with strict outcomes");
  assert.equal(
    fullE2e.if,
    "${{ github.event_name != 'workflow_dispatch' || !inputs.update_linux_visual_baselines }}",
  );
  assert.deepEqual(commandsForStep(fullE2e), ["npm run test:e2e:v2 -- --retries=0"]);
  const acceptance = commandsForStep(stepNamed(
    job,
    "Verify frozen contracts and functional acceptance gates",
  ));
  assert.equal(acceptance.includes("npm run check:frontend-upgrade:phase2:contracts"), true);
  assert.equal(acceptance.includes("npm run check:frontend-upgrade:phase2:aggregate"), false);
  const aggregate = stepNamed(job, "Verify tracked Phase 2 aggregate evidence");
  assert.equal(
    aggregate.if,
    "${{ steps.phase2_lifecycle.outputs.state == 'evidence' }}",
  );
  assert.deepEqual(commandsForStep(aggregate), [
    "npm run check:frontend-upgrade:phase2:aggregate",
  ]);
  assert.deepEqual(
    commandsForStep(stepNamed(
      previewWorkflow.jobs["python-gates"],
      "Run API and migration tests",
    )),
    [
      "npm run test:api:v2:strict",
      "python -m alembic -c api/alembic.ini heads",
      "npm run test:frontend-upgrade:phase1:python",
    ],
  );
});

test("lifecycle CI outputs keep application, evidence, head, and review commits distinct", () => {
  const applicationCommit = "a".repeat(40);
  const evidenceCommit = "e".repeat(40);
  const reviewCommit = "f".repeat(40);
  assert.equal(renderPhase2Lifecycle({
    state: "evidence",
    applicationCommit,
    evidenceCommit,
    headCommit: reviewCommit,
    reviewCommit,
    evidenceOutputCount: 30,
  }, "github"), [
    "state=evidence",
    `application_commit=${applicationCommit}`,
    `evidence_commit=${evidenceCommit}`,
    `head_commit=${reviewCommit}`,
    `review_commit=${reviewCommit}`,
    "evidence_output_count=30",
  ].join("\n"));
});

test("Linux visual baseline refresh proves nonvisual, generated visual, then complete E2E", () => {
  const job = previewWorkflow.jobs["node-gates"];
  const normalFull = stepNamed(
    job,
    "Run the complete Playwright suite with strict outcomes",
  );
  const nonvisual = stepNamed(
    job,
    "Run strict nonvisual Playwright before Linux baseline refresh",
  );
  const aggregateIndex = job.steps.indexOf(stepNamed(
    job,
    "Verify tracked Phase 2 aggregate evidence",
  ));
  const baseline = stepNamed(job, "Generate Playwright Linux visual baselines after nonvisual E2E");
  const baselineIndex = job.steps.indexOf(baseline);
  const refreshedFull = stepNamed(
    job,
    "Run complete Playwright suite against refreshed Linux baselines",
  );
  const refreshedFullIndex = job.steps.indexOf(refreshedFull);
  const updateCondition = (
    "${{ github.event_name == 'workflow_dispatch' && inputs.update_linux_visual_baselines }}"
  );
  assert.equal(normalFull.if, (
    "${{ github.event_name != 'workflow_dispatch' || !inputs.update_linux_visual_baselines }}"
  ));
  assert.equal(nonvisual.if, updateCondition);
  assert.deepEqual(commandsForStep(nonvisual), [
    "npm run test:e2e:v2 -- --grep-invert '@visual:' --retries=0",
  ]);
  assert.ok(job.steps.indexOf(nonvisual) < baselineIndex);
  assert.ok(baselineIndex < refreshedFullIndex);
  assert.ok(refreshedFullIndex < aggregateIndex);
  assert.equal(
    baseline.if,
    updateCondition,
  );
  assert.ok(commandsForStep(baseline).includes(
    "npm run test:e2e:v2 -- --grep '@visual:' --update-snapshots --timeout=300000",
  ));
  const upload = stepNamed(job, "Upload generated Playwright Linux visual baselines");
  assert.ok(job.steps.indexOf(upload) > aggregateIndex);
  assert.equal(upload.with["if-no-files-found"], "error");
  const localNonvisual = linuxBaselineUpdater.indexOf(
    "npm run test:e2e:v2 -- --grep-invert '@visual:' --retries=0",
  );
  const localUpdate = linuxBaselineUpdater.indexOf(
    "npm run test:e2e:v2 -- --grep '@visual:' --update-snapshots",
  );
  const localFull = linuxBaselineUpdater.lastIndexOf(
    "npm run test:e2e:v2 -- --retries=0",
  );
  assert.ok(localNonvisual >= 0);
  assert.ok(localNonvisual < localUpdate);
  assert.ok(localUpdate < localFull);
});

test("strict Playwright count lock handles split and equals filter syntax", () => {
  assert.equal(expectedCountFor([]), 157);
  assert.equal(expectedCountFor(["--grep", "@visual:"]), 9);
  assert.equal(expectedCountFor(["--grep=@visual:"]), 9);
  assert.equal(expectedCountFor(["--grep-invert", "@visual:"]), 148);
  assert.equal(expectedCountFor(["--grep-invert=@visual:"]), 148);
  assert.equal(expectedCountFor(["--grep", "@phase2:"]), 75);
  assert.equal(expectedCountFor(["--grep-invert=@phase2:"]), 82);
  assert.equal(expectedCountFor(["--grep=@e2e:phase2-performance"]), 1);
  assert.throws(
    () => expectedCountFor(["--grep", "@arbitrary-focused-gate"]),
    /frozen inventory/u,
  );
  assert.throws(() => expectedCountFor(["--grep"]), /requires a non-empty value/u);
});

const passingTap = `TAP version 13
# Subtest: exact gate
ok 1 - exact gate
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1
`;

const passingNestedTap = `TAP version 13
# Subtest: parent
    # Subtest: child
    ok 1 - child
    1..1
ok 1 - parent
ok 2 - sibling
1..2
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1
`;

test("strict Node outcome parser rejects zero-exit skip and todo reports", () => {
  assert.equal(parseStrictNodeTap(passingTap, { expectedCount: 1 }).tests, 1);
  assert.throws(
    () => parseStrictNodeTap(passingTap, { expectedCount: 2 }),
    /test count changed/u,
  );
  assert.throws(
    () => parseStrictNodeTap(
      passingTap.replace("# skipped 0", "# skipped 1"),
      { expectedCount: 1 },
    ),
    /skip, todo/u,
  );
  assert.throws(
    () => parseStrictNodeTap(
      passingTap.replace("# todo 0", "# todo 1"),
      { expectedCount: 1 },
    ),
    /skip, todo/u,
  );
});

test("strict Node outcome parser validates nested TAP separately from the root plan", () => {
  assert.equal(parseStrictNodeTap(
    passingNestedTap,
    { expectedCount: 3 },
  ).tests, 3);
  assert.throws(
    () => parseStrictNodeTap(
      passingNestedTap.replace("ok 2 - sibling\n", "    ok 2 - sibling\n"),
      { expectedCount: 3 },
    ),
    /root plan or nested results/u,
  );
  assert.throws(
    () => parseStrictNodeTap(
      passingNestedTap.replace("    ok 1 - child", "    not ok 1 - child"),
      { expectedCount: 3 },
    ),
    /root plan or nested results/u,
  );
  assert.throws(
    () => parseStrictNodeTap(
      passingNestedTap.replace("    ok 1 - child", "    ok 1 - child # SKIP"),
      { expectedCount: 3 },
    ),
    /root plan or nested results/u,
  );
});

test("strict Node gate rejects a substituted file even when the file count is padded", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-node-inventory-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await mkdir(path.join(fixtureRoot, "tests"), { recursive: true });
  await Promise.all(STRICT_PHASE1_NODE_TEST_FILES.map(async (file) => {
    await writeFile(path.join(fixtureRoot, file), "// frozen fixture\n", "utf8");
  }));
  const resolved = await resolveStrictNodeGate(
    ["--prefix", "frontend-upgrade-phase1"],
    { root: fixtureRoot },
  );
  assert.deepEqual(resolved.files, STRICT_PHASE1_NODE_TEST_FILES);

  await rm(path.join(fixtureRoot, STRICT_PHASE1_NODE_TEST_FILES[0]));
  await writeFile(
    path.join(fixtureRoot, "tests/frontend-upgrade-phase1-substitute.test.mjs"),
    "// padded substitute\n",
    "utf8",
  );
  await assert.rejects(
    resolveStrictNodeGate(
      ["--prefix", "frontend-upgrade-phase1"],
      { root: fixtureRoot },
    ),
    /inventory changed/u,
  );
});

const passingVitest = () => ({
  numTotalTestSuites: 1,
  numPassedTestSuites: 1,
  numFailedTestSuites: 0,
  numPendingTestSuites: 0,
  numTotalTests: 1,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  snapshot: { failure: false },
  success: true,
  testResults: [{
    name: "/fixture/tests/frozen.test.ts",
    status: "passed",
    assertionResults: [{ status: "passed", failureMessages: [] }],
  }],
});

test("strict Vitest outcome parser rejects pending and todo tests", () => {
  const options = {
    expectedCount: 1,
    expectedFileCount: 1,
    expectedFiles: ["tests/frozen.test.ts"],
    expectedSuiteCount: 1,
    root: "/fixture",
  };
  assert.equal(assertStrictVitestReport(passingVitest(), options).testCount, 1);
  assert.throws(
    () => assertStrictVitestReport(passingVitest(), {
      ...options,
      expectedCount: 2,
    }),
    /inventory changed/u,
  );
  const pending = passingVitest();
  pending.numPendingTests = 1;
  assert.throws(() => assertStrictVitestReport(pending, options), /skip, todo/u);
  const todo = passingVitest();
  todo.numTodoTests = 1;
  assert.throws(() => assertStrictVitestReport(todo, options), /skip, todo/u);
  const substituted = passingVitest();
  substituted.testResults[0].name = "/fixture/tests/substitute.test.ts";
  assert.throws(
    () => assertStrictVitestReport(substituted, options),
    /file inventory changed/u,
  );
});

test("strict unittest outcome parser rejects skips and expected failures", async () => {
  const { parseStrictUnittestOutput } = await import(
    "../scripts/lib/frontend-upgrade-strict-test-outcomes.mjs"
  );
  const testIds = [
    "fixture.FrozenTests.test_alpha",
    "fixture.FrozenTests.test_beta",
    "fixture.FrozenTests.test_gamma",
  ];
  const passing = (
    "test_alpha (fixture.FrozenTests.test_alpha) ... ok\n"
    + "test_beta (fixture.FrozenTests.test_beta) ... ok\n"
    + "test_gamma (fixture.FrozenTests.test_gamma) ... ok\n\n"
    + "Ran 3 tests in 0.010s\n\nOK\n"
  );
  assert.equal(parseStrictUnittestOutput({
    stderr: passing,
    expectedCount: 3,
    expectedTestIds: testIds,
  }).testCount, 3);
  assert.throws(
    () => parseStrictUnittestOutput({
      stderr: passing,
      expectedCount: 4,
      expectedTestIds: [...testIds, "fixture.FrozenTests.test_delta"],
    }),
    /test count changed|verbose result inventory/u,
  );
  assert.throws(
    () => parseStrictUnittestOutput({
      stderr: passing.replace("OK\n", "OK (skipped=1)\n"),
      expectedCount: 3,
      expectedTestIds: testIds,
    }),
    /skip or expected-failure/u,
  );
  assert.throws(
    () => parseStrictUnittestOutput({
      stderr: passing.replace("OK\n", "OK (expected failures=1)\n"),
      expectedCount: 3,
      expectedTestIds: testIds,
    }),
    /skip or expected-failure/u,
  );
  const substituted = passing.replace(
    "fixture.FrozenTests.test_gamma",
    "fixture.FrozenTests.test_delta",
  ).replace("test_gamma (", "test_delta (");
  assert.throws(
    () => parseStrictUnittestOutput({
      stderr: substituted,
      expectedCount: 3,
      expectedTestIds: testIds,
    }),
    /test-name inventory changed/u,
  );
});

const passingPlaywright = () => ({
  config: { reporter: [["json"]], projects: [{ retries: 0 }] },
  errors: [],
  stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 },
  suites: [{
    specs: [{
      ok: true,
      tests: [{
        annotations: [],
        expectedStatus: "passed",
        status: "expected",
        results: [{ retry: 0, status: "passed", errors: [] }],
      }],
    }],
  }],
});

test("strict Playwright outcome parser rejects skip, todo, and xfail annotations", () => {
  assert.equal(assertStrictPlaywrightReport(
    passingPlaywright(),
    { expectedCount: 1 },
  ).testCount, 1);
  assert.throws(
    () => assertStrictPlaywrightReport(passingPlaywright(), { expectedCount: 2 }),
    /test count changed/u,
  );
  for (const type of ["skip", "fixme", "todo", "xfail", "xpass", "pending"]) {
    const report = passingPlaywright();
    report.suites[0].specs[0].tests[0].annotations.push({ type });
    assert.throws(
      () => assertStrictPlaywrightReport(report, { expectedCount: 1 }),
      /skip\/todo\/xfail/u,
      type,
    );
  }
});

test("operator-only Python, PostgreSQL, and Wrangler tools are independently closure locked", () => {
  assert.deepEqual(operatorToolchainLock, {
    schemaVersion: 1,
    scope: "phase-2-preview-operator-only",
    applicationPackageLockIntegration: true,
    applicationPackageLockSha256: "411cd3646ddf62cd8687dddf1717bda192d18f5948401d2be3d3ec9925d36471",
    pythonRuntime: {
      version: "3.13.14",
      requirementsLockSha256: "e1b3ddb0c1d29d749e9180c21b93b3fe2cd29205e057a5964060d635e2ec8141",
      resolution: "fresh-private-venv-require-hashes",
      sitePackages: {
        relativePath: "lib/python3.13/site-packages",
        closureSha256: "355c445c683c12a9867600abce8fe32d2acfc892bec3d098a74d9cf27914d364",
        derivedBytecodePolicy: "exclude-cpython-313-pyc-under-__pycache__",
        recordPolicy: "include-record-normalize-venv-bin-hash-size",
        distributions: [
          ["alembic", "1.18.5"],
          ["annotated-doc", "0.0.4"],
          ["annotated-types", "0.7.0"],
          ["anyio", "4.14.2"],
          ["argon2-cffi", "25.1.0"],
          ["argon2-cffi-bindings", "25.1.0"],
          ["asgi-lifespan", "2.1.0"],
          ["boto3", "1.43.51"],
          ["botocore", "1.43.51"],
          ["certifi", "2026.6.17"],
          ["cffi", "2.1.0"],
          ["charset-normalizer", "3.4.9"],
          ["click", "8.4.2"],
          ["cryptography", "49.0.0"],
          ["dnspython", "2.8.0"],
          ["docker", "7.2.0"],
          ["email-validator", "2.3.0"],
          ["fastapi", "0.139.2"],
          ["h11", "0.16.0"],
          ["httpcore", "1.0.9"],
          ["httptools", "0.8.0"],
          ["httpx", "0.28.1"],
          ["idna", "3.18"],
          ["iniconfig", "2.3.0"],
          ["jmespath", "1.1.0"],
          ["mako", "1.3.12"],
          ["markupsafe", "3.0.3"],
          ["packaging", "26.2"],
          ["pip", "26.1.2"],
          ["pluggy", "1.6.0"],
          ["psycopg", "3.3.4"],
          ["psycopg-binary", "3.3.4"],
          ["pwdlib", "0.3.0"],
          ["pycparser", "3.0"],
          ["pydantic", "2.13.4"],
          ["pydantic-core", "2.46.4"],
          ["pydantic-settings", "2.14.2"],
          ["pygments", "2.20.0"],
          ["pyjwt", "2.13.0"],
          ["pytest", "9.1.1"],
          ["pytest-asyncio", "1.4.0"],
          ["python-dateutil", "2.9.0.post0"],
          ["python-dotenv", "1.2.2"],
          ["pyyaml", "6.0.3"],
          ["requests", "2.34.2"],
          ["s3transfer", "0.19.1"],
          ["six", "1.17.0"],
          ["sniffio", "1.3.1"],
          ["sqlalchemy", "2.0.51"],
          ["starlette", "1.3.1"],
          ["testcontainers", "4.14.2"],
          ["typing-extensions", "4.16.0"],
          ["typing-inspection", "0.4.2"],
          ["urllib3", "2.7.0"],
          ["uvicorn", "0.51.0"],
          ["uvloop", "0.22.1"],
          ["watchfiles", "1.2.0"],
          ["websockets", "16.1.1"],
          ["wrapt", "2.2.2"],
        ].map(([name, version]) => ({ name, version })),
      },
    },
    postgresClient: {
      version: "18.4",
      requiredExecutables: ["pg_dump", "pg_restore", "psql"],
      executableSha256: {
        pg_dump: "1c4a884d5ad3154fedf80cc9b28e5a1d4447293adfcea862998f8c93b79076bd",
        pg_restore: "51f5f3a9b5245a04547186a1a2649b3f1229596def9c86e5e245499586cafe0a",
        psql: "823383db827c7edc654465e52ebf9284126c13fbd97fbac8bf799878515809a4",
      },
    },
    wrangler: {
      version: "4.86.0",
      binSha256: "770db21641fb72c8035877b33c6a32856d61d253b58d9ea20e37820bcbc79007",
      closureSha256: "2ba16de471310a9ab8d2463e1fb3041b018f131bc12034622c33d5bf050b7666",
      resolution: "operator-clean-install-closure",
    },
  });
});
