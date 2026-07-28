import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE2_CONTRACT_REQUIRED_CHECKS,
  PHASE2_CONTRACT_SUMMARY_PATH,
  assertStrictPhase2ContractSummary,
  buildPhase2ContractSummary,
  parseStrictPytestEvidence,
  runPhase2ContractCommand,
  runPhase2ContractEvidencePipeline,
  writePhase2ContractSummary,
} from "../scripts/lib/frontend-upgrade-phase2-contract-evidence.mjs";
import {
  STRICT_API_PYTEST_TEST_FILES,
  assertExactStringInventory,
} from "../scripts/lib/frontend-upgrade-strict-test-inventory.mjs";
import {
  discoverStrictApiPytestFiles,
} from "../scripts/run-pytest-v2-strict.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const head = "a".repeat(40);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const snapshot = ({
  manifest = "phase2-manifest\n",
  lock = "phase1-lock\n",
  commit = head,
} = {}) => {
  const manifestBytes = Buffer.from(manifest);
  const phase1EvidenceLockBytes = Buffer.from(lock);
  return {
    head: commit,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    phase1EvidenceLockBytes,
    phase1EvidenceLockSha256: sha256(phase1EvidenceLockBytes),
  };
};

const pytestClassnameForFile = (file) => (
  file.slice("api/".length, -".py".length).replaceAll("/", ".")
);

const passingJunit = (tests = 480, files = STRICT_API_PYTEST_TEST_FILES) => (
  `<testsuites><testsuite tests="${tests}" failures="0" errors="0" skipped="0">`
  + Array.from({ length: tests }, (_, index) => (
    `<testcase classname="${pytestClassnameForFile(files[index % files.length])}" `
    + `name="test_${index}"/>`
  )).join("")
  + "</testsuite></testsuites>"
);

const passingResult = (command) => ({
  exitCode: 0,
  signal: null,
  stdout: command.pytest ? "480 passed in 0.01s\n" : "pass\n",
  stderr: "",
  ...(command.pytest ? { junitXml: passingJunit() } : {}),
});

const runInjected = (overrides = {}) => {
  const stable = snapshot();
  return runPhase2ContractEvidencePipeline({
    root,
    pythonExecutable: "/fixture/python3.13",
    commandRunner: async (command) => passingResult(command),
    snapshotProvider: async () => stable,
    now: () => new Date("2026-07-27T12:00:00.000Z"),
    ...overrides,
  });
};

test("injected pipeline runs all contract commands serially and builds the strict envelope", async () => {
  const order = [];
  let active = 0;
  const result = await runInjected({
    commandRunner: async (command) => {
      active += 1;
      assert.equal(active, 1, "commands must not overlap");
      order.push(command.id);
      await Promise.resolve();
      active -= 1;
      return passingResult(command);
    },
  });
  assert.equal(result.plan.length, 21);
  assert.deepEqual(order, result.plan.map(({ id }) => id));
  const buildIsolationIndex = result.plan.findIndex(({ id }) => id === "build-isolation");
  const buildIndex = result.plan.findIndex(({ id }) => id === "build-v2");
  const boundariesIndex = result.plan.findIndex(({ id }) => id === "frontend-v2-boundaries");
  assert.ok(buildIsolationIndex >= 0);
  assert.equal(buildIndex, buildIsolationIndex + 1);
  assert.equal(boundariesIndex, buildIndex + 1);
  assert.deepEqual(result.plan[buildIsolationIndex].args, [
    "scripts/run-node-tests-strict.mjs",
    "--file",
    "tests/frontend-v2-build-isolation.test.mjs",
  ]);
  assert.equal(
    result.plan[buildIsolationIndex].args.includes("--test"),
    false,
    "build isolation must run through the strict no-skip wrapper",
  );
  const storybookBuildIndex = result.plan.findIndex(({ id }) => id === "storybook-build");
  const storybookA11yIndex = result.plan.findIndex(({ id }) => id === "storybook-a11y");
  assert.ok(storybookBuildIndex >= 0);
  assert.equal(storybookA11yIndex, storybookBuildIndex + 1);
  assert.deepEqual(result.plan[storybookBuildIndex].args, [
    "node_modules/storybook/dist/bin/dispatcher.js",
    "build",
    "--config-dir",
    ".storybook",
    "--output-dir",
    "storybook-static-v2",
    "--test",
    "--disable-telemetry",
  ]);
  const rightsCommand = result.plan.find(({ id }) => id === "question-bank-rights");
  assert.deepEqual(rightsCommand?.args, [
    "scripts/check-question-bank-rights-release-blockers.mjs",
  ]);
  assert.equal(rightsCommand?.temporarySummary, true);
  assert.equal(result.summary.metrics.commandCount, 21);
  assert.equal(result.summary.metrics.apiPytestTests, 480);
  assert.deepEqual(result.summary.results, []);
  assert.deepEqual(result.summary.visualCases, []);
  assert.deepEqual(Object.keys(result.summary.checks), PHASE2_CONTRACT_REQUIRED_CHECKS);
  assert.ok(Object.values(result.summary.checks).every((value) => value === true));
  assert.equal(assertStrictPhase2ContractSummary(result.summary), true);

  const environmentProbe = await runPhase2ContractCommand({
    root,
    pythonExecutable: "/fixture/python3.13",
    command: {
      id: "environment-probe",
      command: process.execPath,
      args: [
        "-e",
        "process.stdout.write(JSON.stringify({"
          + "branch:process.env.QUANTGYM_BUILD_BRANCH,"
          + "cloudflareBranch:process.env.CF_PAGES_BRANCH??null,"
          + "cloudflareCommit:process.env.CF_PAGES_COMMIT_SHA??null,"
          + "source:process.env.QUANTGYM_BUILD_SOURCE"
          + "}))",
      ],
    },
  });
  assert.equal(environmentProbe.exitCode, 0);
  assert.equal(environmentProbe.signal, null);
  assert.deepEqual(JSON.parse(environmentProbe.stdout), {
    branch: "codex/frontend-v2-preview",
    cloudflareBranch: null,
    cloudflareCommit: null,
    source: "test",
  });

  const pytestEnvironmentProbe = await runPhase2ContractCommand({
    root,
    pythonExecutable: "/fixture/python3.13",
    command: {
      id: "pytest-environment-probe",
      command: process.execPath,
      args: [
        "-e",
        "const fs=require('node:fs');"
          + "const argument=process.argv.find((value)=>value.startsWith('--junitxml='));"
          + "const junitPath=argument.slice('--junitxml='.length);"
          + "fs.writeFileSync(junitPath,'<testsuites/>');"
          + "process.stdout.write(JSON.stringify({"
          + "junitPath,ryukDisabled:process.env.TESTCONTAINERS_RYUK_DISABLED"
          + "}));",
        "--",
      ],
      pytest: true,
    },
  });
  assert.equal(pytestEnvironmentProbe.exitCode, 0);
  assert.equal(pytestEnvironmentProbe.signal, null);
  assert.equal(pytestEnvironmentProbe.junitXml, "<testsuites/>");
  const pytestEnvironment = JSON.parse(pytestEnvironmentProbe.stdout);
  assert.equal(pytestEnvironment.ryukDisabled, "true");
  await assert.rejects(lstat(pytestEnvironment.junitPath), { code: "ENOENT" });

  const temporarySummaryProbe = await runPhase2ContractCommand({
    root,
    pythonExecutable: "/fixture/python3.13",
    command: {
      id: "temporary-summary-probe",
      command: process.execPath,
      args: [
        "-e",
        "const fs=require('node:fs');"
          + "const index=process.argv.indexOf('--summary');"
          + "const target=process.argv[index+1];"
          + "fs.writeFileSync(target,'summary\\n');"
          + "process.stdout.write(JSON.stringify({index,target}));",
        "--",
      ],
      temporarySummary: true,
    },
  });
  assert.equal(temporarySummaryProbe.exitCode, 0);
  assert.equal(temporarySummaryProbe.signal, null);
  const temporarySummary = JSON.parse(temporarySummaryProbe.stdout);
  assert.ok(temporarySummary.index >= 0);
  assert.equal(path.isAbsolute(temporarySummary.target), true);
  await assert.rejects(lstat(temporarySummary.target), { code: "ENOENT" });

  const failingTemporarySummaryProbe = await runPhase2ContractCommand({
    root,
    pythonExecutable: "/fixture/python3.13",
    command: {
      id: "failing-temporary-summary-probe",
      command: process.execPath,
      args: [
        "-e",
        "const fs=require('node:fs');"
          + "const index=process.argv.indexOf('--summary');"
          + "const target=process.argv[index+1];"
          + "fs.writeFileSync(target,'failed summary\\n');"
          + "process.stdout.write(JSON.stringify({target}));"
          + "process.exitCode=7;",
        "--",
      ],
      temporarySummary: true,
    },
  });
  assert.equal(failingTemporarySummaryProbe.exitCode, 7);
  assert.equal(failingTemporarySummaryProbe.signal, null);
  const failingTemporarySummary = JSON.parse(failingTemporarySummaryProbe.stdout);
  await assert.rejects(lstat(failingTemporarySummary.target), { code: "ENOENT" });
});

test("a command failure stops the serial plan and cannot produce a pass summary", async () => {
  const called = [];
  let snapshots = 0;
  await assert.rejects(runInjected({
    commandRunner: async (command) => {
      called.push(command.id);
      if (command.id === "typecheck-v2") {
        return { ...passingResult(command), exitCode: 1 };
      }
      return passingResult(command);
    },
    snapshotProvider: async () => {
      snapshots += 1;
      return snapshot();
    },
  }), /contract command failed: typecheck-v2/u);
  assert.equal(called.at(-1), "typecheck-v2");
  assert.equal(snapshots, 2, "the protected after snapshot must still run on failure");
});

test("strict pytest parser rejects skip, xfail, and xpass outcomes", () => {
  const skippedXml = (
    "<testsuites><testsuite tests=\"1\" failures=\"0\" errors=\"0\" skipped=\"1\">"
    + "<testcase classname=\"api\" name=\"test_skip\"><skipped/></testcase>"
    + "</testsuite></testsuites>"
  );
  assert.throws(
    () => parseStrictPytestEvidence({
      junitXml: skippedXml,
      stdout: "1 skipped\n",
      expectedCount: 1,
      expectedFiles: ["api/tests/test_migrations.py"],
    }),
    /skip, or xfail outcomes/u,
  );
  assert.throws(
    () => parseStrictPytestEvidence({
      junitXml: skippedXml,
      stdout: "XFAIL test_api.py\n",
      expectedCount: 1,
      expectedFiles: ["api/tests/test_migrations.py"],
    }),
    /skip, or xfail outcomes/u,
  );
  assert.throws(
    () => parseStrictPytestEvidence({
      junitXml: passingJunit(1, ["api/tests/test_migrations.py"]),
      stdout: "XPASS test_api.py\n1 xpassed in 0.01s\n",
      expectedCount: 1,
      expectedFiles: ["api/tests/test_migrations.py"],
    }),
    /skip, xfail, or xpass outcomes/u,
  );
  assert.throws(
    () => parseStrictPytestEvidence({
      junitXml: passingJunit(479),
      stdout: "479 passed in 0.01s\n",
      expectedCount: 480,
      expectedFiles: STRICT_API_PYTEST_TEST_FILES,
    }),
    /test count is invalid/u,
  );
});

test("strict pytest parser rejects a replaced source file with a padded test count", () => {
  const forged = passingJunit().replaceAll(
    "tests.auth.test_challenge_limits",
    "tests.auth.test_google",
  );
  assert.throws(
    () => parseStrictPytestEvidence({
      junitXml: forged,
      stdout: "480 passed in 0.01s\n",
      expectedCount: 480,
      expectedFiles: STRICT_API_PYTEST_TEST_FILES,
    }),
    /source test file inventory changed/u,
  );
});

test("strict pytest discovery rejects a substituted source file with a padded file count", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-pytest-inventory-"));
  t.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await Promise.all(STRICT_API_PYTEST_TEST_FILES.map(async (file) => {
    await mkdir(path.dirname(path.join(fixtureRoot, file)), { recursive: true });
    await writeFile(path.join(fixtureRoot, file), "def test_frozen(): pass\n", "utf8");
  }));
  assert.deepEqual(
    await discoverStrictApiPytestFiles(fixtureRoot),
    STRICT_API_PYTEST_TEST_FILES,
  );

  await rm(path.join(fixtureRoot, STRICT_API_PYTEST_TEST_FILES[0]));
  await writeFile(
    path.join(fixtureRoot, "api/tests/auth/test_substitute.py"),
    "def test_padded(): pass\n",
    "utf8",
  );
  const substituted = await discoverStrictApiPytestFiles(fixtureRoot);
  assert.throws(
    () => assertExactStringInventory({
      actual: substituted,
      expected: STRICT_API_PYTEST_TEST_FILES,
      label: "API pytest source files",
    }),
    /inventory changed/u,
  );
});

test("pipeline rejects an API pytest skip even when pytest exits zero", async () => {
  const skippedXml = (
    "<testsuites><testsuite tests=\"480\" failures=\"0\" errors=\"0\" skipped=\"1\">"
    + "<testcase classname=\"api\" name=\"test_skip\"><skipped/></testcase>"
    + Array.from({ length: 479 }, (_, index) => (
      `<testcase classname="api" name="test_${index}"/>`
    )).join("")
    + "</testsuite></testsuites>"
  );
  await assert.rejects(runInjected({
    commandRunner: async (command) => command.pytest
      ? {
          exitCode: 0,
          signal: null,
          stdout: "1 skipped\n",
          stderr: "",
          junitXml: skippedXml,
        }
      : passingResult(command),
  }), /skip, or xfail outcomes/u);
});

test("pipeline rejects Phase 1 evidence lock drift", async () => {
  let calls = 0;
  await assert.rejects(runInjected({
    snapshotProvider: async () => {
      calls += 1;
      return calls === 1 ? snapshot() : snapshot({ lock: "changed-lock\n" });
    },
  }), /Phase 1 evidence lock drift/u);
});

test("pipeline rejects Phase 2 manifest hash drift", async () => {
  let calls = 0;
  await assert.rejects(runInjected({
    snapshotProvider: async () => {
      calls += 1;
      return calls === 1 ? snapshot() : snapshot({ manifest: "changed-manifest\n" });
    },
  }), /manifest hash drift/u);
});

test("strict envelope rejects extra keys, non-empty results, and false checks", () => {
  const summary = buildPhase2ContractSummary({
    checkedAt: "2026-07-27T12:00:00.000Z",
    commit: head,
    manifestSha256: "b".repeat(64),
    phase1EvidenceLockSha256: "c".repeat(64),
    commandCount: 21,
    apiPytestTests: 480,
  });
  assert.throws(
    () => assertStrictPhase2ContractSummary({ ...summary, extra: true }),
    /envelope/u,
  );
  assert.throws(
    () => assertStrictPhase2ContractSummary({
      ...summary,
      results: [{ id: "forbidden" }],
    }),
    /envelope/u,
  );
  assert.throws(
    () => assertStrictPhase2ContractSummary({
      ...summary,
      checks: { ...summary.checks, contractsPassed: false },
    }),
    /checks/u,
  );
  assert.throws(
    () => buildPhase2ContractSummary({
      checkedAt: "2026-07-27T12:00:00.000Z",
      commit: head,
      manifestSha256: "b".repeat(64),
      phase1EvidenceLockSha256: "c".repeat(64),
      commandCount: 21,
      apiPytestTests: 479,
    }),
    /API pytest count/u,
  );
});

test("fixed-path atomic writer replaces an output symlink without touching its target", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(root, ".phase2-contract-writer-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const output = path.join(temporaryRoot, PHASE2_CONTRACT_SUMMARY_PATH);
  const sentinel = path.join(temporaryRoot, "outside-sentinel.txt");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(sentinel, "unchanged\n");
  await symlink(sentinel, output);
  const summary = buildPhase2ContractSummary({
    checkedAt: "2026-07-27T12:00:00.000Z",
    commit: head,
    manifestSha256: "b".repeat(64),
    phase1EvidenceLockSha256: "c".repeat(64),
    commandCount: 21,
    apiPytestTests: 480,
  });
  const written = await writePhase2ContractSummary({ root: temporaryRoot, summary });
  assert.equal(written, output);
  assert.equal((await lstat(output)).isSymbolicLink(), false);
  assert.equal(await readFile(sentinel, "utf8"), "unchanged\n");
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), summary);
});
