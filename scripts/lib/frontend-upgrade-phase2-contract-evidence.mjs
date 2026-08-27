import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  verifyPhase1EvidenceLock,
} from "./frontend-upgrade-phase2-evidence-lock.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";
import {
  STRICT_API_PYTEST_TEST_COUNT,
  STRICT_API_PYTEST_TEST_FILES,
  STRICT_PHASE1_NODE_TEST_FILES,
  STRICT_PHASE2_CONTRACT_COMMAND_COUNT,
  STRICT_PHASE2_NODE_TEST_FILES,
  assertExactStringInventory,
} from "./frontend-upgrade-strict-test-inventory.mjs";

const execFileAsync = promisify(execFile);
const LOCKED_NODE_VERSION = "20.20.2";
const MAX_PROTECTED_JSON_BYTES = 2 * 1024 * 1024;
const MAX_COMMAND_OUTPUT_BYTES = 32 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;

export const PHASE2_CONTRACT_SUMMARY_PATH = (
  "docs/browser-audit-screenshots/"
  + "390-frontend-upgrade-phase-2-contract-summary.json"
);

export const PHASE2_CONTRACT_REQUIRED_CHECKS = Object.freeze([
  "contractsPassed",
  "apiPassed",
  "migrationPassed",
  "draftsPassed",
  "legacyBoundaryPassed",
  "surfaceContractPassed",
  "openapiExact",
  "buildPassed",
  "designSystemPassed",
  "rightsBoundaryPassed",
  "phase1RegressionPassed",
  "phase1EvidenceLockBeforeAfter",
]);

const SUMMARY_KEYS = Object.freeze([
  "schemaVersion",
  "check",
  "status",
  "checkedAt",
  "commit",
  "manifestSha256",
  "phase1EvidenceLockSha256",
  "results",
  "visualCases",
  "checks",
  "counts",
  "metrics",
  "failureCodes",
]);

const COUNT_KEYS = Object.freeze([
  "resultCount",
  "skippedResultCount",
  "failedResultCount",
  "retriedResultCount",
  "flakyResultCount",
]);

const METRIC_KEYS = Object.freeze([
  "commandCount",
  "apiPytestTests",
]);

const TRUSTED_GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
});

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, keys) => (
  isPlainObject(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key))
);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const safeRelativePath = (relativePath) => (
  typeof relativePath === "string"
  && relativePath.length > 0
  && !relativePath.includes("\0")
  && !relativePath.includes("\\")
  && !path.posix.isAbsolute(relativePath)
  && path.posix.normalize(relativePath) === relativePath
  && relativePath.split("/").every((segment) => !["", ".", ".."].includes(segment))
);

const metadataForDirectory = async (candidatePath) => {
  const metadata = await lstat(candidatePath, { bigint: true });
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`protected ancestor is not a regular directory: ${candidatePath}`);
  }
  return {
    dev: metadata.dev,
    ino: metadata.ino,
    mode: metadata.mode,
  };
};

export async function securelyReadPhase2ContractFile({
  root,
  relativePath,
  maximumBytes = MAX_PROTECTED_JSON_BYTES,
} = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("protected read root must be absolute");
  }
  if (!safeRelativePath(relativePath)) throw new Error("unsafe protected relative path");
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new Error("protected read size limit is invalid");
  }
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is unavailable");
  }
  const resolvedRoot = path.resolve(root);
  if (await realpath(resolvedRoot) !== resolvedRoot) {
    throw new Error("protected read root must not be a symlink");
  }
  const directorySegments = path.posix.dirname(relativePath).split("/");
  const directories = [resolvedRoot];
  let cursor = resolvedRoot;
  for (const segment of directorySegments) {
    if (segment === ".") continue;
    cursor = path.join(cursor, segment);
    directories.push(cursor);
  }
  const beforeDirectories = await Promise.all(directories.map(metadataForDirectory));
  const filePath = path.join(resolvedRoot, relativePath);
  const handle = await open(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.isSymbolicLink()) {
      throw new Error("protected path is not a regular file");
    }
    if (before.size > BigInt(maximumBytes)) throw new Error("protected file is oversized");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) throw new Error("protected file changed while reading");
    }
    const afterDirectories = await Promise.all(directories.map(metadataForDirectory));
    for (let index = 0; index < beforeDirectories.length; index += 1) {
      for (const field of ["dev", "ino", "mode"]) {
        if (beforeDirectories[index][field] !== afterDirectories[index][field]) {
          throw new Error("protected ancestor changed while reading");
        }
      }
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

const resolveHead = async (root) => {
  const { stdout } = await execFileAsync(
    "/usr/bin/git",
    [
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "rev-parse", "--verify", "HEAD^{commit}",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: TRUSTED_GIT_ENV,
      maxBuffer: 128 * 1024,
    },
  );
  const head = stdout.trim();
  if (!SHA_PATTERN.test(head)) throw new Error("Git HEAD is not a full lowercase commit SHA");
  return head;
};

export async function capturePhase2ContractSnapshot({ root } = {}) {
  const [manifestBytes, phase1EvidenceLockBytes, head] = await Promise.all([
    securelyReadPhase2ContractFile({
      root,
      relativePath: PHASE2_ACCEPTANCE_MANIFEST_PATH,
    }),
    securelyReadPhase2ContractFile({
      root,
      relativePath: PHASE1_EVIDENCE_LOCK_PATH,
    }),
    resolveHead(root),
  ]);
  let manifest;
  let phase1EvidenceLock;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
    phase1EvidenceLock = JSON.parse(phase1EvidenceLockBytes.toString("utf8"));
  } catch {
    throw new Error("Phase 2 protected contract JSON is invalid");
  }
  if (
    manifest?.schemaVersion !== 1
    || manifest?.phase !== 2
    || manifest?.targetGateCount !== 76
  ) {
    throw new Error("Phase 2 acceptance manifest identity is invalid");
  }
  const lockFailures = await verifyPhase1EvidenceLock({
    root,
    lock: phase1EvidenceLock,
    headRef: head,
  });
  if (lockFailures.length > 0) {
    throw new Error(`Phase 1 evidence lock verification failed: ${lockFailures.join("; ")}`);
  }
  return Object.freeze({
    head,
    manifestBytes,
    manifestSha256: sha256(manifestBytes),
    phase1EvidenceLockBytes,
    phase1EvidenceLockSha256: sha256(phase1EvidenceLockBytes),
  });
}

const validateSnapshot = (snapshot, label) => {
  if (
    !isPlainObject(snapshot)
    || !Buffer.isBuffer(snapshot.manifestBytes)
    || !Buffer.isBuffer(snapshot.phase1EvidenceLockBytes)
    || !SHA_PATTERN.test(snapshot.head ?? "")
    || snapshot.manifestSha256 !== sha256(snapshot.manifestBytes)
    || snapshot.phase1EvidenceLockSha256 !== sha256(snapshot.phase1EvidenceLockBytes)
    || !HASH_PATTERN.test(snapshot.manifestSha256 ?? "")
    || !HASH_PATTERN.test(snapshot.phase1EvidenceLockSha256 ?? "")
  ) throw new Error(`${label} Phase 2 contract snapshot is invalid`);
};

export function assertPhase2ContractSnapshotsStable(before, after) {
  validateSnapshot(before, "before");
  validateSnapshot(after, "after");
  if (before.head !== after.head) throw new Error("Git HEAD changed during contract evidence");
  if (
    before.manifestSha256 !== after.manifestSha256
    || !before.manifestBytes.equals(after.manifestBytes)
  ) throw new Error("Phase 2 acceptance manifest hash drift detected");
  if (
    before.phase1EvidenceLockSha256 !== after.phase1EvidenceLockSha256
    || !before.phase1EvidenceLockBytes.equals(after.phase1EvidenceLockBytes)
  ) throw new Error("Phase 1 evidence lock drift detected");
  return true;
}

const nodeTestFiles = async (root, prefix) => (
  (await readdir(path.join(root, "tests"), { withFileTypes: true }))
    .filter((entry) => (
      entry.isFile()
      && entry.name.startsWith(prefix)
      && entry.name.endsWith(".test.mjs")
    ))
    .map((entry) => `tests/${entry.name}`)
    .sort()
);

const descriptor = (id, command, args, extra = {}) => Object.freeze({
  id,
  command,
  args: Object.freeze([...args]),
  ...extra,
});

export async function createPhase2ContractCommandPlan({
  root,
  pythonExecutable,
} = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 contract command root must be absolute");
  }
  if (
    typeof pythonExecutable !== "string"
    || pythonExecutable.length === 0
    || /[\u0000-\u001f\u007f]/u.test(pythonExecutable)
  ) throw new Error("QUANTGYM_PYTHON_313 is required and must be valid");
  const [phase2Tests, phase1Tests] = await Promise.all([
    nodeTestFiles(root, "frontend-upgrade-phase2"),
    nodeTestFiles(root, "frontend-upgrade-phase1"),
  ]);
  assertExactStringInventory({
    actual: phase2Tests,
    expected: STRICT_PHASE2_NODE_TEST_FILES,
    label: "Phase 2 Node regression",
  });
  assertExactStringInventory({
    actual: phase1Tests,
    expected: STRICT_PHASE1_NODE_TEST_FILES,
    label: "Phase 1 Node regression",
  });
  const node = process.execPath;
  const plan = [
    descriptor("phase2-contracts", node, [
      "scripts/check-frontend-upgrade-phase2-contracts.mjs",
    ]),
    descriptor("phase2-node", node, [
      "scripts/run-node-tests-strict.mjs", "--prefix", "frontend-upgrade-phase2",
    ]),
    descriptor("typecheck-v2", node, [
      "node_modules/typescript/bin/tsc", "--project", "tsconfig.v2.json", "--noEmit",
    ]),
    descriptor("lint-v2", node, [
      "node_modules/eslint/bin/eslint.js",
      "--max-warnings", "0",
      "--no-error-on-unmatched-pattern",
      "--config", "eslint.config.mjs",
      "src/{core,design-system,domains,legacy-preview,pages/plan,pages/training,pages/v2}/**/*.{ts,tsx}",
      "src/shared/{api,i18n,lib,storage,testing}/**/*.{ts,tsx}",
      "functions/**/*.ts",
      ".storybook/*.ts",
      "vite.v2.config.ts",
      "vitest.v2.config.ts",
    ]),
    descriptor("lint-styles-v2", node, [
      "node_modules/stylelint/bin/stylelint.mjs",
      "--config", "stylelint.config.mjs",
      "src/{core,shared,design-system,domains,legacy-preview,pages/plan,pages/training,pages/v2}/**/*.css",
      "--allow-empty-input",
    ]),
    descriptor("unit-v2", node, ["scripts/run-vitest-v2-strict.mjs"]),
    descriptor("api-pytest", pythonExecutable, [
      "-B", "-m", "pytest", "api/tests", "-ra", "--strict-config", "--strict-markers",
    ], { pytest: true }),
    descriptor("openapi-v2", node, ["scripts/openapi-v2.mjs", "--check"]),
    descriptor("design-system-contracts", node, [
      "scripts/run-node-tests-strict.mjs",
      "--file",
      "tests/design-system-v2-contracts.test.mjs",
    ]),
    descriptor("design-system-check", node, ["scripts/check-design-system-v2.mjs"]),
    descriptor("storybook-build", node, [
      "node_modules/storybook/dist/bin/dispatcher.js",
      "build",
      "--config-dir",
      ".storybook",
      "--output-dir",
      "storybook-static-v2",
      "--test",
      "--disable-telemetry",
    ]),
    descriptor("storybook-a11y", node, ["scripts/check-storybook-a11y-v2.mjs"]),
    descriptor("build-isolation", node, [
      "scripts/run-node-tests-strict.mjs",
      "--file",
      "tests/frontend-v2-build-isolation.test.mjs",
    ]),
    descriptor("build-v2", node, ["scripts/build-frontend-v2.mjs"]),
    descriptor("frontend-v2-boundaries", node, ["scripts/check-frontend-v2-boundaries.mjs"]),
    descriptor("route-integrity", node, ["scripts/check-route-integrity.mjs"]),
    descriptor("route-interactions", node, ["scripts/check-route-interactions.mjs"]),
    descriptor("module-ownership", node, ["scripts/check-module-ownership.mjs"]),
    descriptor("question-bank-rights", node, [
      "scripts/check-question-bank-rights-release-blockers.mjs",
    ], { temporarySummary: true }),
    descriptor("phase1-node", node, [
      "scripts/run-node-tests-strict.mjs", "--prefix", "frontend-upgrade-phase1",
    ]),
    descriptor("phase1-python", node, ["scripts/run-python-unittest-strict.mjs"]),
  ];
  if (plan.length !== STRICT_PHASE2_CONTRACT_COMMAND_COUNT) {
    throw new Error("Phase 2 contract command inventory changed");
  }
  return Object.freeze(plan);
}

const spawnCaptured = ({ command, args, cwd, environment }) => new Promise((resolve, reject) => {
  let settled = false;
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd,
    env: environment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    child.kill("SIGKILL");
    reject(new Error("contract evidence command timed out"));
  }, COMMAND_TIMEOUT_MS);
  const fail = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    child.kill("SIGKILL");
    reject(error);
  };
  const collect = (target, chunk, currentBytes, setBytes) => {
    const nextBytes = currentBytes + chunk.length;
    setBytes(nextBytes);
    if (nextBytes > MAX_COMMAND_OUTPUT_BYTES) {
      fail(new Error("contract evidence command output is oversized"));
      return;
    }
    target.push(chunk);
  };
  child.stdout.on("data", (chunk) => collect(
    stdout,
    chunk,
    stdoutBytes,
    (value) => { stdoutBytes = value; },
  ));
  child.stderr.on("data", (chunk) => collect(
    stderr,
    chunk,
    stderrBytes,
    (value) => { stderrBytes = value; },
  ));
  child.once("error", fail);
  child.once("close", (exitCode, signal) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve({
      exitCode,
      signal,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    });
  });
});

const commandEnvironment = (pythonExecutable) => {
  const environment = { ...process.env };
  delete environment.CF_PAGES_BRANCH;
  delete environment.CF_PAGES_COMMIT_SHA;
  return {
    ...environment,
    PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`,
    PYTHONDONTWRITEBYTECODE: "1",
    QUANTGYM_BUILD_BRANCH: "codex/frontend-v2-preview",
    QUANTGYM_BUILD_SOURCE: "test",
    QUANTGYM_PYTHON_313: pythonExecutable,
  };
};

export async function runPhase2ContractCommand({
  root,
  command,
  pythonExecutable,
} = {}) {
  if (!isPlainObject(command) || typeof command.id !== "string") {
    throw new Error("contract evidence command descriptor is invalid");
  }
  const environment = commandEnvironment(pythonExecutable);
  if (command.pytest === true) {
    environment.TESTCONTAINERS_RYUK_DISABLED = "true";
  }
  if (command.temporarySummary === true) {
    const temporaryDirectory = await mkdtemp(path.join(
      tmpdir(),
      "quantgym-phase2-rights-summary-",
    ));
    const summaryPath = path.join(temporaryDirectory, "summary.json");
    try {
      return await spawnCaptured({
        command: command.command,
        args: [...command.args, "--summary", summaryPath],
        cwd: root,
        environment,
      });
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
  if (command.pytest !== true) {
    return spawnCaptured({
      command: command.command,
      args: command.args,
      cwd: root,
      environment,
    });
  }
  const temporaryDirectory = await mkdtemp(path.join(
    tmpdir(),
    "quantgym-phase2-api-pytest-",
  ));
  const junitPath = path.join(temporaryDirectory, "pytest-junit.xml");
  try {
    const result = await spawnCaptured({
      command: command.command,
      args: [...command.args, `--junitxml=${junitPath}`],
      cwd: root,
      environment,
    });
    const junitXml = await readFile(junitPath, "utf8").catch(() => "");
    return { ...result, junitXml };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

const integerAttribute = (attributes, name) => {
  const match = new RegExp(`(?:^|\\s)${name}="(\\d+)"`, "u").exec(attributes);
  return match ? Number(match[1]) : null;
};

const stringAttribute = (attributes, name) => {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]+)"`, "u").exec(attributes);
  return match ? match[1] : null;
};

export function parseStrictPytestEvidence({
  junitXml,
  stdout = "",
  stderr = "",
  expectedCount,
  expectedFiles,
} = {}) {
  if (
    !Number.isSafeInteger(expectedCount)
    || expectedCount <= 0
    || !Array.isArray(expectedFiles)
    || expectedFiles.length === 0
    || expectedFiles.some((file) => (
      typeof file !== "string"
      || !/^api\/tests\/(?:[a-z0-9_]+\/)*test_[a-z0-9_]+\.py$/u.test(file)
    ))
    || new Set(expectedFiles).size !== expectedFiles.length
  ) {
    throw new Error("API pytest expected test inventory is invalid");
  }
  if (typeof junitXml !== "string" || junitXml.length === 0) {
    throw new Error("API pytest JUnit report is missing");
  }
  const suites = [...junitXml.matchAll(/<testsuite\b([^>]*)>/gu)];
  if (suites.length === 0) throw new Error("API pytest JUnit report has no test suite");
  const totals = { tests: 0, failures: 0, errors: 0, skipped: 0 };
  for (const suite of suites) {
    for (const key of Object.keys(totals)) {
      const value = integerAttribute(suite[1], key);
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`API pytest JUnit ${key} count is invalid`);
      }
      totals[key] += value;
    }
  }
  const testcases = [...junitXml.matchAll(/<testcase\b([^>]*)>/gu)];
  const testcaseCount = testcases.length;
  if (totals.tests !== expectedCount || testcaseCount !== expectedCount) {
    throw new Error("API pytest JUnit test count is invalid");
  }
  if (
    totals.failures !== 0
    || totals.errors !== 0
    || totals.skipped !== 0
    || /<(?:failure|error|skipped)\b/gu.test(junitXml)
  ) {
    throw new Error("API pytest contains failure, error, skip, or xfail outcomes");
  }
  const expectedModules = expectedFiles.map((file) => Object.freeze({
    file,
    module: file.slice("api/".length, -".py".length).replaceAll("/", "."),
  }));
  const actualFiles = testcases.map((testcase) => {
    const classname = stringAttribute(testcase[1], "classname");
    if (classname === null) throw new Error("API pytest JUnit testcase classname is invalid");
    const matches = expectedModules.filter(({ module }) => (
      classname === module || classname.startsWith(`${module}.`)
    ));
    if (matches.length !== 1) {
      throw new Error("API pytest JUnit source test file is outside the frozen inventory");
    }
    return matches[0].file;
  });
  const observedFiles = [...new Set(actualFiles)].sort();
  const frozenFiles = [...expectedFiles].sort();
  if (
    observedFiles.length !== frozenFiles.length
    || observedFiles.some((file, index) => file !== frozenFiles[index])
  ) throw new Error("API pytest JUnit source test file inventory changed");
  const terminal = `${stdout}\n${stderr}`;
  if (
    /^(?:SKIPPED|XFAIL|XPASS)\b/gmu.test(terminal)
    || /(?:^|\s)[1-9]\d*\s+(?:skipped|xfailed|xpassed)\b/gimu.test(terminal)
  ) {
    throw new Error("API pytest contains skip, xfail, or xpass outcomes");
  }
  return Object.freeze({ ...totals });
}

const requireSuccessfulCommand = (result, command) => {
  if (
    !isPlainObject(result)
    || result.exitCode !== 0
    || result.signal !== null
    || typeof result.stdout !== "string"
    || typeof result.stderr !== "string"
  ) throw new Error(`Phase 2 contract command failed: ${command.id}`);
};

export function buildPhase2ContractSummary({
  checkedAt,
  commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  commandCount,
  apiPytestTests,
} = {}) {
  if (
    typeof checkedAt !== "string"
    || !Number.isFinite(Date.parse(checkedAt))
    || new Date(Date.parse(checkedAt)).toISOString() !== checkedAt
  ) throw new Error("contract evidence timestamp is invalid");
  if (!SHA_PATTERN.test(commit ?? "")) throw new Error("contract evidence commit is invalid");
  if (!HASH_PATTERN.test(manifestSha256 ?? "")) {
    throw new Error("contract evidence manifest hash is invalid");
  }
  if (!HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")) {
    throw new Error("contract evidence Phase 1 lock hash is invalid");
  }
  if (commandCount !== STRICT_PHASE2_CONTRACT_COMMAND_COUNT) {
    throw new Error("contract evidence command count is invalid");
  }
  if (apiPytestTests !== STRICT_API_PYTEST_TEST_COUNT) {
    throw new Error("contract evidence API pytest count is invalid");
  }
  const summary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase2-contracts",
    status: "pass",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    results: [],
    visualCases: [],
    checks: Object.fromEntries(
      PHASE2_CONTRACT_REQUIRED_CHECKS.map((key) => [key, true]),
    ),
    counts: Object.fromEntries(COUNT_KEYS.map((key) => [key, 0])),
    metrics: {
      commandCount,
      apiPytestTests,
    },
    failureCodes: [],
  };
  assertStrictPhase2ContractSummary(summary);
  return summary;
}

export function assertStrictPhase2ContractSummary(summary) {
  if (!exactKeys(summary, SUMMARY_KEYS)) throw new Error("contract summary envelope is invalid");
  if (
    summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase2-contracts"
    || summary.status !== "pass"
    || !SHA_PATTERN.test(summary.commit ?? "")
    || !HASH_PATTERN.test(summary.manifestSha256 ?? "")
    || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256 ?? "")
    || typeof summary.checkedAt !== "string"
    || new Date(Date.parse(summary.checkedAt)).toISOString() !== summary.checkedAt
    || !Array.isArray(summary.results)
    || summary.results.length !== 0
    || !Array.isArray(summary.visualCases)
    || summary.visualCases.length !== 0
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) throw new Error("contract summary envelope is invalid");
  if (
    !exactKeys(summary.checks, PHASE2_CONTRACT_REQUIRED_CHECKS)
    || Object.values(summary.checks).some((value) => value !== true)
  ) throw new Error("contract summary checks are invalid");
  if (
    !exactKeys(summary.counts, COUNT_KEYS)
    || Object.values(summary.counts).some((value) => value !== 0)
  ) throw new Error("contract summary counts are invalid");
  if (
    !exactKeys(summary.metrics, METRIC_KEYS)
    || summary.metrics.commandCount !== STRICT_PHASE2_CONTRACT_COMMAND_COUNT
    || summary.metrics.apiPytestTests !== STRICT_API_PYTEST_TEST_COUNT
  ) throw new Error("contract summary metrics are invalid");
  return true;
}

export function validatePhase2ContractSummary(summary, {
  expectedCommit,
  manifestSha256,
  nowMs,
  phase1EvidenceLockSha256,
} = {}) {
  assertStrictPhase2ContractSummary(summary);
  const checkedAtMs = Date.parse(summary.checkedAt);
  if (
    summary.commit !== expectedCommit
    || summary.manifestSha256 !== manifestSha256
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !Number.isFinite(nowMs)
    || checkedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAtMs > MAX_EVIDENCE_AGE_MS
  ) throw new Error("contract summary is stale or bound to the wrong inputs");
  return summary;
}

export async function runPhase2ContractEvidencePipeline({
  root,
  pythonExecutable,
  commandRunner,
  snapshotProvider,
  now = () => new Date(),
} = {}) {
  if (process.versions.node !== LOCKED_NODE_VERSION) {
    throw new Error(`Phase 2 contract evidence requires Node ${LOCKED_NODE_VERSION}`);
  }
  const plan = await createPhase2ContractCommandPlan({ root, pythonExecutable });
  const runner = commandRunner ?? ((command) => runPhase2ContractCommand({
    root,
    command,
    pythonExecutable,
  }));
  const snapshots = snapshotProvider ?? (() => capturePhase2ContractSnapshot({ root }));
  const before = await snapshots("before");
  validateSnapshot(before, "before");
  let commandFailure = null;
  let apiPytestTests = null;
  try {
    for (const command of plan) {
      const result = await runner(command);
      requireSuccessfulCommand(result, command);
      if (command.pytest === true) {
        const pytest = parseStrictPytestEvidence({
          ...result,
          expectedCount: STRICT_API_PYTEST_TEST_COUNT,
          expectedFiles: STRICT_API_PYTEST_TEST_FILES,
        });
        apiPytestTests = pytest.tests;
      }
    }
  } catch (error) {
    commandFailure = error;
  }
  let after;
  try {
    after = await snapshots("after");
    assertPhase2ContractSnapshotsStable(before, after);
  } catch (error) {
    if (commandFailure) {
      throw new AggregateError(
        [commandFailure, error],
        "contract command failed and protected snapshots were not preserved",
      );
    }
    throw error;
  }
  if (commandFailure) throw commandFailure;
  if (apiPytestTests !== STRICT_API_PYTEST_TEST_COUNT) {
    throw new Error("strict API pytest evidence was not produced");
  }
  const checkedAt = now();
  if (!(checkedAt instanceof Date) || !Number.isFinite(checkedAt.getTime())) {
    throw new Error("contract evidence clock is invalid");
  }
  const summary = buildPhase2ContractSummary({
    checkedAt: checkedAt.toISOString(),
    commit: before.head,
    manifestSha256: before.manifestSha256,
    phase1EvidenceLockSha256: before.phase1EvidenceLockSha256,
    commandCount: plan.length,
    apiPytestTests,
  });
  return { plan, summary };
}

export async function writePhase2ContractSummary({ root, summary } = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("contract evidence output root must be absolute");
  }
  assertStrictPhase2ContractSummary(summary);
  await writeFileAtomicallyWithinTrustedRoot({
    root,
    relativePath: PHASE2_CONTRACT_SUMMARY_PATH,
    data: `${JSON.stringify(summary, null, 2)}\n`,
    mode: 0o644,
  });
  return path.join(root, PHASE2_CONTRACT_SUMMARY_PATH);
}
