import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json"
);
const REVIEW_DIRECTORY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review"
);
const PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const INITIAL_JS_BUDGET = 180 * 1024;
const ROUTE_CHUNK_BUDGET = 100 * 1024;
const EXPECTED_E2E_TEST_COUNT = 82;
const MAX_E2E_COMMAND_OUTPUT_BYTES = 1024 * 1024;
const MAX_E2E_REPORT_BYTES = 16 * 1024 * 1024;
const LOCKED_NODE_VERSION = "20.20.2";
const LOCKED_NPM_VERSION = "10.8.2";
const CONTROLLED_TEMPORARY_ROOT = process.platform === "win32" ? tmpdir() : "/tmp";
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;

export const PHASE1_SURFACE_REQUIRED_SOURCES = Object.freeze({
  authE2e: "tests/e2e-v2/auth.spec.ts",
  shellE2e: "tests/e2e-v2/shell.spec.ts",
  platformE2e: "tests/e2e-v2/platform-surfaces.spec.ts",
  legacyE2e: "tests/e2e-v2/legacy-boundary.spec.ts",
  authMutationTests: "src/domains/account/auth/auth.mutations.test.tsx",
  recoveryPanelTests: (
    "src/design-system/patterns/RecoveryPanel/RecoveryPanel.test.tsx"
  ),
});

const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1_440, height: 900 }),
  laptop: Object.freeze({ width: 1_280, height: 720 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
});
const THEMES = Object.freeze(["light", "dark"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const unique = (values) => [...new Set(values)];

export const assertPhase1NodeRuntime = (
  version = process.versions.node,
  label = "current process",
) => {
  if (version !== LOCKED_NODE_VERSION) {
    throw new Error(
      `Phase 1 E2E requires Node ${LOCKED_NODE_VERSION} for the ${label}`,
    );
  }
  return version;
};

export const phase1SystemBrowserLaunchOptions = (environment = process.env) => {
  if (environment?.PLAYWRIGHT_USE_SYSTEM_CHROME !== "1") {
    throw new Error(
      "Phase 1 live browser evidence requires PLAYWRIGHT_USE_SYSTEM_CHROME=1",
    );
  }
  return { headless: true, channel: "chrome" };
};

export const phase1E2EChildEnvironment = (environment = process.env) => {
  phase1SystemBrowserLaunchOptions(environment);
  const allowedNames = [
    "ComSpec",
    "FORCE_COLOR",
    "HOME",
    "LANG",
    "LC_ALL",
    "NO_COLOR",
    "PATH",
    "PATHEXT",
    "PLAYWRIGHT_BROWSERS_PATH",
    "SHELL",
    "SystemRoot",
    "TEMP",
    "TERM",
    "TMP",
    "TMPDIR",
    "XDG_CACHE_HOME",
  ];
  const controlled = {};
  for (const name of allowedNames) {
    if (typeof environment?.[name] === "string") {
      controlled[name] = environment[name];
    }
  }
  controlled.PLAYWRIGHT_USE_SYSTEM_CHROME = "1";
  controlled.CI = "true";
  return controlled;
};

const spawnCaptured = ({
  command,
  argumentsList,
  cwd,
  environment,
}) => new Promise((resolve, reject) => {
  let settled = false;
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const stdout = [];
  const stderr = [];
  const child = spawn(command, argumentsList, {
    cwd,
    env: environment,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const fail = (error) => {
    if (settled) return;
    settled = true;
    child.kill("SIGKILL");
    reject(error);
  };
  child.stdout.on("data", (chunk) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes > MAX_E2E_COMMAND_OUTPUT_BYTES) {
      fail(new Error("Phase 1 E2E command output is too large"));
      return;
    }
    stdout.push(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderrBytes += chunk.length;
    if (stderrBytes > MAX_E2E_COMMAND_OUTPUT_BYTES) {
      fail(new Error("Phase 1 E2E command output is too large"));
      return;
    }
    stderr.push(chunk);
  });
  child.once("error", fail);
  child.once("close", (exitCode, signal) => {
    if (settled) return;
    settled = true;
    resolve({
      exitCode,
      signal,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    });
  });
});

const requireSuccessfulCommand = (result, label) => {
  if (result.exitCode !== 0 || result.signal !== null) {
    throw new Error(`${label} failed`);
  }
  return result.stdout.trim();
};

const countReportTests = (suites) => {
  if (!Array.isArray(suites)) return -1;
  let count = 0;
  for (const suite of suites) {
    if (!suite || typeof suite !== "object" || Array.isArray(suite)) return -1;
    const specs = suite.specs ?? [];
    const nestedSuites = suite.suites ?? [];
    if (!Array.isArray(specs) || !Array.isArray(nestedSuites)) return -1;
    for (const spec of specs) {
      if (!spec || typeof spec !== "object" || !Array.isArray(spec.tests)) return -1;
      count += spec.tests.length;
    }
    const nested = countReportTests(nestedSuites);
    if (nested < 0) return -1;
    count += nested;
  }
  return count;
};

export function validatePhase1E2EReport(report) {
  const stats = report?.stats;
  const reportTestCount = countReportTests(report?.suites);
  if (
    !report
    || typeof report !== "object"
    || Array.isArray(report)
    || !Array.isArray(report.errors)
    || report.errors.length !== 0
    || !stats
    || typeof stats !== "object"
    || Array.isArray(stats)
    || reportTestCount !== EXPECTED_E2E_TEST_COUNT
    || stats.expected !== EXPECTED_E2E_TEST_COUNT
    || stats.skipped !== 0
    || stats.unexpected !== 0
    || stats.flaky !== 0
  ) {
    throw new Error("Phase 1 full E2E report is not an exact 82-test pass");
  }
  return Object.freeze({
    executedTestCount: EXPECTED_E2E_TEST_COUNT,
    passedTestCount: stats.expected,
    skippedTestCount: stats.skipped,
    failedTestCount: stats.unexpected,
    flakyTestCount: stats.flaky,
  });
}

const assertIsolatedInjectedRunnerRoot = async (root, environment) => {
  if (environment?.NODE_ENV !== "test") {
    throw new Error("Phase 1 E2E runner injection requires NODE_ENV=test");
  }
  const [rootRealPath, temporaryRealPath] = await Promise.all([
    realpath(root),
    realpath(CONTROLLED_TEMPORARY_ROOT),
  ]);
  const relative = path.relative(temporaryRealPath, rootRealPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("Phase 1 E2E runner injection requires an isolated root");
  }
};

const defaultE2ERunner = async ({ root, expectedCommit, environment }) => {
  assertPhase1NodeRuntime();
  const childEnvironment = phase1E2EChildEnvironment(environment);
  const head = requireSuccessfulCommand(await spawnCaptured({
    command: "git",
    argumentsList: ["rev-parse", "--verify", "HEAD"],
    cwd: root,
    environment: childEnvironment,
  }), "Phase 1 E2E commit check");
  if (head !== expectedCommit) {
    throw new Error("Phase 1 E2E checkout does not match the expected commit");
  }
  const trackedStatus = requireSuccessfulCommand(await spawnCaptured({
    command: "git",
    argumentsList: ["status", "--porcelain=v1", "--untracked-files=no"],
    cwd: root,
    environment: childEnvironment,
  }), "Phase 1 E2E worktree check");
  if (trackedStatus !== "") {
    throw new Error("Phase 1 E2E checkout contains tracked changes");
  }
  const nodeVersion = requireSuccessfulCommand(await spawnCaptured({
    command: process.platform === "win32" ? "node.exe" : "node",
    argumentsList: ["--version"],
    cwd: root,
    environment: childEnvironment,
  }), "Phase 1 E2E child Node version check");
  assertPhase1NodeRuntime(
    nodeVersion.startsWith("v") ? nodeVersion.slice(1) : nodeVersion,
    "controlled child PATH",
  );
  const npmVersion = requireSuccessfulCommand(await spawnCaptured({
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    argumentsList: ["--version"],
    cwd: root,
    environment: childEnvironment,
  }), "Phase 1 E2E npm version check");
  if (npmVersion !== LOCKED_NPM_VERSION) {
    throw new Error("Phase 1 E2E requires the locked npm CLI");
  }

  const temporaryDirectory = await mkdtemp(
    path.join(CONTROLLED_TEMPORARY_ROOT, "qg-phase1-e2e-"),
  );
  const reportPath = path.join(temporaryDirectory, "report.json");
  try {
    const execution = await spawnCaptured({
      command: process.platform === "win32" ? "npm.cmd" : "npm",
      argumentsList: ["run", "test:e2e:v2", "--", "--reporter=json"],
      cwd: root,
      environment: {
        ...childEnvironment,
        PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
      },
    });
    const [headAfter, trackedStatusAfter] = await Promise.all([
      spawnCaptured({
        command: "git",
        argumentsList: ["rev-parse", "--verify", "HEAD"],
        cwd: root,
        environment: childEnvironment,
      }),
      spawnCaptured({
        command: "git",
        argumentsList: ["status", "--porcelain=v1", "--untracked-files=no"],
        cwd: root,
        environment: childEnvironment,
      }),
    ]);
    if (
      requireSuccessfulCommand(headAfter, "Phase 1 E2E post-run commit check")
        !== expectedCommit
      || requireSuccessfulCommand(
        trackedStatusAfter,
        "Phase 1 E2E post-run worktree check",
      ) !== ""
    ) {
      throw new Error("Phase 1 E2E checkout changed during execution");
    }
    let report = null;
    if (execution.exitCode === 0 && execution.signal === null) {
      const bytes = await readFile(reportPath);
      if (bytes.length === 0 || bytes.length > MAX_E2E_REPORT_BYTES) {
        throw new Error("Phase 1 E2E report size is invalid");
      }
      try {
        report = JSON.parse(bytes.toString("utf8"));
      } catch {
        throw new Error("Phase 1 E2E report JSON is invalid");
      }
    }
    return {
      commit: head,
      exitCode: execution.exitCode,
      signal: execution.signal,
      report,
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

export async function runPhase1ExactCommitE2E({
  root,
  expectedCommit,
  environment = process.env,
  runner,
}) {
  if (!SHA_PATTERN.test(expectedCommit ?? "")) {
    throw new Error("Phase 1 E2E expected commit is invalid");
  }
  phase1SystemBrowserLaunchOptions(environment);
  if (runner !== undefined) {
    if (typeof runner !== "function") {
      throw new Error("Phase 1 E2E runner injection is invalid");
    }
    await assertIsolatedInjectedRunnerRoot(root, environment);
  }
  const result = await (runner ?? defaultE2ERunner)({
    root,
    expectedCommit,
    environment,
  });
  if (
    !result
    || result.commit !== expectedCommit
    || result.exitCode !== 0
    || result.signal !== null
  ) {
    throw new Error("Phase 1 full E2E execution failed");
  }
  return Object.freeze({
    commit: expectedCommit,
    ...validatePhase1E2EReport(result.report),
  });
}

const expectedReviewImages = () => APPROVED_PHASE1_ACCEPTANCE_MANIFEST.systemSurfaces.flatMap(
  (surfaceId) => Object.keys(VIEWPORTS).flatMap((viewport) => THEMES.map((theme) => (
    `${REVIEW_DIRECTORY_RELATIVE}/${surfaceId.slice("system:".length)}-${viewport}-${theme}.jpg`
  ))),
);

const securelyRead = async (root, relativePath) => {
  const absolute = path.join(root, relativePath);
  const [rootRealPath, stats] = await Promise.all([realpath(root), lstat(absolute)]);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${relativePath}: required file must be regular and non-symlink`);
  }
  const resolved = await realpath(absolute);
  const relative = path.relative(rootRealPath, resolved);
  if (
    relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error(`${relativePath}: required file resolves outside the repository`);
  }
  return readFile(resolved);
};

const includes = (source, value, failure, failures) => {
  if (!source.includes(value)) failures.push(failure);
};

const validateManifestShape = (manifest, failures) => {
  if (manifest.systemSurfaces?.length !== 8) {
    failures.push("Phase 1 must contain exactly eight system surfaces");
  }
  if (new Set(manifest.systemSurfaces ?? []).size !== 8) {
    failures.push("Phase 1 system surfaces must be unique");
  }
  if (manifest.gates?.length !== 82 || manifest.targetGateCount !== 82) {
    failures.push("Phase 1 must contain exactly 82 target gates");
  }
  if (new Set((manifest.gates ?? []).map(({ id }) => id)).size !== 82) {
    failures.push("Phase 1 target gate IDs must be unique");
  }
  if (
    manifest.activatedPhase0FutureStates?.length !== 6
    || manifest.activatedPhase0FutureStateCount !== 6
  ) {
    failures.push("Phase 1 must activate exactly six Phase 0 future states");
  }
  if (manifest.baseVisualCaseCount !== 48) {
    failures.push("Phase 1 base visual matrix must contain exactly 48 cases");
  }
  if (expectedReviewImages().length !== 48) {
    failures.push("Phase 1 review image inventory must contain exactly 48 files");
  }
};

const validateJourneyCoverage = (manifest, combinedE2e, failures) => {
  for (const gate of manifest.gates.filter(({ kind }) => kind === "journey")) {
    includes(
      combinedE2e,
      `@${gate.id}`,
      `journey gate ${gate.id} has no browser trace`,
      failures,
    );
  }
};

const validateMutationCoverage = (manifest, sources, failures) => {
  const mutationGates = manifest.gates.filter(({ kind }) => kind === "mutation-recovery");
  const platformOperations = new Set([
    "notifications.mark-read",
    "todo.create",
    "todo.update",
    "todo.complete",
    "todo.delete",
    "preferences.update-theme",
    "preferences.update-language",
  ]);
  for (const gate of mutationGates.filter(({ mutationId }) => (
    platformOperations.has(mutationId)
  ))) {
    includes(
      sources.platformE2e,
      `@${gate.id}`,
      `mutation gate ${gate.id} has no browser trace`,
      failures,
    );
  }

  const authOperations = [
    "auth.sign-in",
    "auth.register",
    "auth.reset-password",
    "auth.google-sign-in",
  ];
  includes(
    sources.authMutationTests,
    "phase1AuthRecoveryGates",
    "auth mutation recovery matrix is missing",
    failures,
  );
  for (const operation of authOperations) {
    includes(
      sources.authMutationTests,
      `"${operation}"`,
      `auth recovery matrix is missing ${operation}`,
      failures,
    );
  }
  for (const state of manifest.recoveryStates ?? []) {
    includes(
      sources.authMutationTests,
      `:${state}\``,
      `auth recovery matrix is missing ${state}`,
      failures,
    );
  }
  includes(
    sources.authMutationTests,
    '"$gateId maps to the approved recovery action"',
    "auth recovery matrix is not executed as named gates",
    failures,
  );

  includes(
    sources.recoveryPanelTests,
    '"mutation:session.retry:$state',
    "session retry recovery matrix is missing",
    failures,
  );
  for (const state of manifest.recoveryStates ?? []) {
    includes(
      sources.recoveryPanelTests,
      `state: "${state}"`,
      `session retry matrix is missing ${state}`,
      failures,
    );
  }
};

const validateVisualAndA11yCoverage = (manifest, combinedE2e, failures) => {
  const tokens = {
    "system:auth": ["@visual:auth", "@a11y:auth"],
    "system:desktop-shell": ["@visual:desktop-shell", "@a11y:desktop-shell"],
    "system:mobile-shell": ["@visual:mobile-shell", "@a11y:mobile-shell"],
    "system:global-search": ["@visual:global-search", "@a11y:global-search"],
    "system:notifications-toast": [
      "@visual:notifications-toast",
      "@a11y:notifications-toast",
    ],
    "system:todo": ["@visual:todo", "@a11y:todo"],
    "system:theme-language": ["@visual:theme-language", "@a11y:theme-language"],
    "system:network-recovery": [
      "@visual:network-recovery",
      "@a11y:network-recovery",
    ],
  };
  for (const surfaceId of manifest.systemSurfaces) {
    for (const token of tokens[surfaceId] ?? []) {
      includes(
        combinedE2e,
        token,
        `${surfaceId} is missing ${token} coverage`,
        failures,
      );
    }
  }
  for (const futureState of manifest.activatedPhase0FutureStates ?? []) {
    includes(
      combinedE2e,
      `@${futureState}`,
      `activated future state ${futureState} has no browser trace`,
      failures,
    );
  }
};

export function validatePhase1SystemSurfaceSources(
  sources,
  manifest = APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
) {
  const failures = [];
  for (const key of Object.keys(PHASE1_SURFACE_REQUIRED_SOURCES)) {
    if (typeof sources?.[key] !== "string" || sources[key].length === 0) {
      failures.push(`required system-surface source ${key} is unavailable`);
    }
  }
  if (failures.length > 0) return unique(failures);
  validateManifestShape(manifest, failures);
  const combinedE2e = [
    sources.authE2e,
    sources.shellE2e,
    sources.platformE2e,
    sources.legacyE2e,
  ].join("\n");
  validateJourneyCoverage(manifest, combinedE2e, failures);
  validateMutationCoverage(manifest, sources, failures);
  validateVisualAndA11yCoverage(manifest, combinedE2e, failures);
  includes(
    sources.legacyE2e,
    "@phase1-system",
    "runtime legacy-isolation matrix is missing",
    failures,
  );
  for (const surfaceId of manifest.systemSurfaces) {
    includes(
      sources.legacyE2e,
      `id: "${surfaceId}"`,
      `runtime legacy-isolation matrix is missing ${surfaceId}`,
      failures,
    );
  }
  return unique(failures).sort();
}

const listJavaScriptFiles = async (root) => {
  const directory = path.join(root, "dist-v2/assets");
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const stats = await lstat(absolute);
    if (
      entry.isSymbolicLink()
      || stats.isSymbolicLink()
      || (!entry.isFile() && !entry.isDirectory())
    ) {
      throw new Error("V2 build assets contain a non-regular path");
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      result.push(`assets/${entry.name}`);
    }
  }
  return result.sort();
};

const htmlInitialJavaScript = (html) => unique([
  ...[...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+\.js)"[^>]*>/giu)]
    .map((match) => match[1]),
  ...[...html.matchAll(
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="\/([^"]+\.js)"[^>]*>/giu,
  )].map((match) => match[1]),
]);

export async function inspectPhase1BundleBudgets(root = defaultRoot) {
  const html = (await securelyRead(root, "dist-v2/index.html")).toString("utf8");
  const allJavaScript = await listJavaScriptFiles(root);
  const initialFiles = htmlInitialJavaScript(html);
  if (initialFiles.length === 0) throw new Error("V2 build has no initial JavaScript");
  for (const relativePath of initialFiles) {
    if (!allJavaScript.includes(relativePath)) {
      throw new Error(`initial JavaScript file is missing: ${relativePath}`);
    }
  }
  const gzipSizes = new Map();
  for (const relativePath of allJavaScript) {
    const bytes = await securelyRead(root, `dist-v2/${relativePath}`);
    gzipSizes.set(relativePath, gzipSync(bytes, { level: 9 }).byteLength);
  }
  const initialJsGzipBytes = initialFiles.reduce(
    (total, relativePath) => total + (gzipSizes.get(relativePath) ?? 0),
    0,
  );
  const routeFiles = allJavaScript.filter((relativePath) => !initialFiles.includes(relativePath));
  const largestRouteChunkGzipBytes = Math.max(
    0,
    ...routeFiles.map((relativePath) => gzipSizes.get(relativePath) ?? 0),
  );
  return {
    initialJsGzipBytes,
    initialJsBudgetBytes: INITIAL_JS_BUDGET,
    largestRouteChunkGzipBytes,
    routeChunkBudgetBytes: ROUTE_CHUNK_BUDGET,
    initialWithinBudget: initialJsGzipBytes <= INITIAL_JS_BUDGET,
    routesWithinBudget: routeFiles.every((relativePath) => (
      (gzipSizes.get(relativePath) ?? Infinity) <= ROUTE_CHUNK_BUDGET
    )),
    initialFileCount: initialFiles.length,
    routeChunkCount: routeFiles.length,
  };
}

export async function collectPhase1SystemSurfaceOfflineEvidence(root = defaultRoot) {
  const sources = Object.fromEntries(await Promise.all(
    Object.entries(PHASE1_SURFACE_REQUIRED_SOURCES).map(async ([key, relativePath]) => (
      [key, (await securelyRead(root, relativePath)).toString("utf8")]
    )),
  ));
  const failures = validatePhase1SystemSurfaceSources(sources);
  let bundles;
  try {
    bundles = await inspectPhase1BundleBudgets(root);
    if (!bundles.initialWithinBudget) failures.push("initial JavaScript exceeds 180KB gzip");
    if (!bundles.routesWithinBudget) failures.push("a route chunk exceeds 100KB gzip");
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  return {
    failures: unique(failures).sort(),
    summary: {
      schemaVersion: 1,
      check: "frontend-upgrade-phase1-system-surfaces",
      status: failures.length === 0 ? "pass" : "fail",
      mode: "offline",
      systemSurfaceCount: APPROVED_PHASE1_ACCEPTANCE_MANIFEST.systemSurfaces.length,
      targetGateCount: APPROVED_PHASE1_ACCEPTANCE_MANIFEST.gates.length,
      activatedFutureStateCount: (
        APPROVED_PHASE1_ACCEPTANCE_MANIFEST.activatedPhase0FutureStates.length
      ),
      declaredVisualCaseCount: APPROVED_PHASE1_ACCEPTANCE_MANIFEST.baseVisualCaseCount,
      bundle: bundles ?? {
        initialJsGzipBytes: 0,
        initialJsBudgetBytes: INITIAL_JS_BUDGET,
        largestRouteChunkGzipBytes: 0,
        routeChunkBudgetBytes: ROUTE_CHUNK_BUDGET,
        initialWithinBudget: false,
        routesWithinBudget: false,
        initialFileCount: 0,
        routeChunkCount: 0,
      },
      failureCount: failures.length,
    },
  };
}

const validAuditCredentials = (credentials) => (
  credentials
  && /^phase1-audit-[a-z0-9._-]+@example\.invalid$/u.test(credentials.email ?? "")
  && typeof credentials.password === "string"
  && credentials.password.length >= 12
  && credentials.password.length <= 128
  && !/[\s\u0000-\u001f\u007f]/u.test(credentials.password)
);

const loginBrowserContext = async ({ context, credentials }) => {
  const csrfResponse = await context.request.get(`${PREVIEW_ORIGIN}/api/v2/auth/csrf`, {
    failOnStatusCode: false,
    headers: { accept: "application/json", "cache-control": "no-store" },
  });
  if (csrfResponse.status() !== 200) throw new Error("browser audit CSRF request failed");
  const csrfBody = await csrfResponse.json();
  if (
    typeof csrfBody?.csrfToken !== "string"
    || !/^[A-Za-z0-9_-]{16,512}$/u.test(csrfBody.csrfToken)
  ) {
    throw new Error("browser audit CSRF response is invalid");
  }
  const login = await context.request.post(`${PREVIEW_ORIGIN}/api/v2/auth/login`, {
    data: { email: credentials.email, password: credentials.password },
    failOnStatusCode: false,
    headers: {
      accept: "application/json",
      origin: PREVIEW_ORIGIN,
      "x-csrf-token": csrfBody.csrfToken,
    },
  });
  if (login.status() !== 200) throw new Error("browser audit login failed");
};

const waitForTheme = async (page, theme) => {
  await page.waitForFunction((expected) => (
    document.documentElement.getAttribute("data-qg-theme") === expected
  ), theme, { timeout: 10_000 }).catch(async () => {
    const toggle = page.getByRole("button", {
      name: theme === "dark"
        ? /切换到深色主题|Switch to dark theme/iu
        : /切换到浅色主题|Switch to light theme/iu,
    }).first();
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    await page.waitForFunction((expected) => (
      document.documentElement.getAttribute("data-qg-theme") === expected
    ), theme, { timeout: 10_000 });
  });
};

const exerciseSurface = async ({ context, page, surfaceId }) => {
  if (surfaceId === "system:auth") {
    await page.goto(`${PREVIEW_ORIGIN}/login`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /欢迎回来|Welcome back/iu }).waitFor();
    return;
  }
  await page.goto(`${PREVIEW_ORIGIN}/`, { waitUntil: "networkidle" });
  await page.locator("#qg-main-content").waitFor();
  if (surfaceId === "system:mobile-shell") {
    const trigger = page.getByRole("button", {
      name: /打开全部模块|Open all modules/iu,
    });
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.getByRole("dialog", { name: /全部模块|All modules/iu }).waitFor();
    }
  } else if (surfaceId === "system:global-search") {
    await page.getByRole("button", {
      name: /搜索题目、公司、课程|打开全局搜索|Search problems|Open global search/iu,
    }).first().click();
    await page.getByRole("dialog", { name: /全局搜索|Global search/iu }).waitFor();
  } else if (surfaceId === "system:notifications-toast") {
    await page.getByRole("button", {
      name: /打开通知|Open notifications/iu,
    }).first().click();
    await page.getByRole("dialog", { name: /通知中心|Notifications/iu }).waitFor();
  } else if (surfaceId === "system:todo") {
    await page.getByRole("button", {
      name: /打开今日待办|Open today's tasks/iu,
    }).first().click();
    await page.getByRole("dialog", { name: /今日待办|Today's tasks/iu }).waitFor();
  } else if (surfaceId === "system:network-recovery") {
    await context.setOffline(true);
    await page.locator('[data-network-status="offline"]').waitFor();
  }
};

const defaultBrowserAudit = async ({ credentials, environment, outputRoot }) => {
  if (!validAuditCredentials(credentials)) {
    throw new Error("browser audit credentials are invalid");
  }
  const [{ chromium }, { default: AxeBuilder }] = await Promise.all([
    import("playwright"),
    import("@axe-core/playwright"),
  ]);
  const browser = await chromium.launch(
    phase1SystemBrowserLaunchOptions(environment),
  );
  const outputDirectory = path.join(outputRoot, REVIEW_DIRECTORY_RELATIVE);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  const imageFingerprints = [];
  let seriousOrCriticalAxeFindings = 0;
  let applicationConsoleErrors = 0;
  let unhandledRejections = 0;
  let visualCaseCount = 0;
  try {
    const authenticatedContext = await browser.newContext({
      locale: "zh-CN",
      serviceWorkers: "block",
    });
    const anonymousContext = await browser.newContext({
      locale: "zh-CN",
      serviceWorkers: "block",
    });
    await authenticatedContext.addInitScript(() => {
      Object.defineProperty(window, "__qgPhase1UnhandledRejections", {
        configurable: false,
        enumerable: false,
        value: { count: 0 },
        writable: false,
      });
      window.addEventListener("unhandledrejection", () => {
        window.__qgPhase1UnhandledRejections.count += 1;
      });
    });
    await anonymousContext.addInitScript(() => {
      Object.defineProperty(window, "__qgPhase1UnhandledRejections", {
        configurable: false,
        enumerable: false,
        value: { count: 0 },
        writable: false,
      });
      window.addEventListener("unhandledrejection", () => {
        window.__qgPhase1UnhandledRejections.count += 1;
      });
    });
    await loginBrowserContext({ context: authenticatedContext, credentials });

    for (const surfaceId of APPROVED_PHASE1_ACCEPTANCE_MANIFEST.systemSurfaces) {
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        for (const theme of THEMES) {
          const context = surfaceId === "system:auth"
            ? anonymousContext
            : authenticatedContext;
          await context.setOffline(false);
          const page = await context.newPage();
          page.on("console", (message) => {
            const location = message.location().url ?? "";
            if (
              message.type() === "error"
              && (location === "" || location.startsWith(PREVIEW_ORIGIN))
            ) applicationConsoleErrors += 1;
          });
          page.on("pageerror", () => {
            applicationConsoleErrors += 1;
          });
          try {
            await page.setViewportSize(viewport);
            await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
            await exerciseSurface({ context, page, surfaceId });
            await waitForTheme(page, theme);
            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();
            seriousOrCriticalAxeFindings += axe.violations.filter((violation) => (
              violation.impact === "serious" || violation.impact === "critical"
            )).length;
            unhandledRejections += await page.evaluate(() => (
              window.__qgPhase1UnhandledRejections?.count ?? 0
            ));
            const relativePath = (
              `${REVIEW_DIRECTORY_RELATIVE}/`
              + `${surfaceId.slice("system:".length)}-${viewportName}-${theme}.jpg`
            );
            const absolutePath = path.join(outputRoot, relativePath);
            await page.screenshot({
              animations: "disabled",
              caret: "hide",
              fullPage: true,
              path: absolutePath,
              quality: 82,
              type: "jpeg",
            });
            const bytes = await readFile(absolutePath);
            const fileStats = await stat(absolutePath);
            if (!fileStats.isFile() || fileStats.size !== bytes.length || bytes.length === 0) {
              throw new Error("browser audit image is invalid");
            }
            imageFingerprints.push(sha256(bytes));
            visualCaseCount += 1;
          } finally {
            await context.setOffline(false);
            await page.close();
          }
        }
      }
    }
    await Promise.all([authenticatedContext.close(), anonymousContext.close()]);
  } finally {
    await browser.close();
  }
  return {
    visualCaseCount,
    seriousOrCriticalAxeFindings,
    applicationConsoleErrors,
    unhandledRejections,
    imageFingerprints,
  };
};

export function validatePhase1BrowserAudit(result) {
  const failures = [];
  if (result?.visualCaseCount !== 48) failures.push("browser audit must contain 48 visual cases");
  if (result?.seriousOrCriticalAxeFindings !== 0) {
    failures.push("browser audit has serious or critical axe findings");
  }
  if (result?.applicationConsoleErrors !== 0) {
    failures.push("browser audit has application-owned console errors");
  }
  if (result?.unhandledRejections !== 0) {
    failures.push("browser audit has unhandled rejections");
  }
  if (
    !Array.isArray(result?.imageFingerprints)
    || result.imageFingerprints.length !== 48
    || result.imageFingerprints.some((value) => !/^[0-9a-f]{64}$/u.test(value))
  ) {
    failures.push("browser audit image fingerprints are invalid");
  }
  return failures;
}

export function buildPhase1SystemSurfacesLiveSummary({
  browserAudit,
  e2eExecution,
  offlineSummary,
  checkedAt,
  commit,
  evidenceSha256,
}) {
  if (
    e2eExecution?.commit !== commit
    || e2eExecution?.executedTestCount !== EXPECTED_E2E_TEST_COUNT
    || e2eExecution?.passedTestCount !== EXPECTED_E2E_TEST_COUNT
    || e2eExecution?.skippedTestCount !== 0
    || e2eExecution?.failedTestCount !== 0
    || e2eExecution?.flakyTestCount !== 0
  ) {
    throw new Error("Phase 1 system-surface summary requires an exact full E2E pass");
  }
  return {
    schemaVersion: 1,
    check: "frontend-upgrade-phase1-system-surfaces",
    status: "pass",
    checkedAt: checkedAt.toISOString(),
    commit,
    evidenceSha256,
    hashes: {
      reviewImageSha256: [...browserAudit.imageFingerprints],
    },
    checks: {
      offlineContractPassed: true,
      fullE2eExecuted: true,
      bundleBudgetsPassed: (
        offlineSummary.bundle.initialWithinBudget
        && offlineSummary.bundle.routesWithinBudget
      ),
      visualMatrixPassed: browserAudit.visualCaseCount === 48,
      accessibilityPassed: browserAudit.seriousOrCriticalAxeFindings === 0,
      consolePassed: browserAudit.applicationConsoleErrors === 0,
      rejectionsPassed: browserAudit.unhandledRejections === 0,
    },
    counts: {
      systemSurfaces: APPROVED_PHASE1_ACCEPTANCE_MANIFEST.systemSurfaces.length,
      targetGates: APPROVED_PHASE1_ACCEPTANCE_MANIFEST.gates.length,
      executedE2eTests: e2eExecution.executedTestCount,
      skippedE2eTests: e2eExecution.skippedTestCount,
      failedE2eTests: e2eExecution.failedTestCount,
      flakyE2eTests: e2eExecution.flakyTestCount,
      activatedFutureStates: (
        APPROVED_PHASE1_ACCEPTANCE_MANIFEST.activatedPhase0FutureStates.length
      ),
      visualCases: browserAudit.visualCaseCount,
      seriousOrCriticalAxeFindings: browserAudit.seriousOrCriticalAxeFindings,
      applicationConsoleErrors: browserAudit.applicationConsoleErrors,
      unhandledRejections: browserAudit.unhandledRejections,
      initialJsGzipBytes: offlineSummary.bundle.initialJsGzipBytes,
      initialJsBudgetBytes: offlineSummary.bundle.initialJsBudgetBytes,
      largestRouteChunkGzipBytes: offlineSummary.bundle.largestRouteChunkGzipBytes,
      routeChunkBudgetBytes: offlineSummary.bundle.routeChunkBudgetBytes,
      initialFileCount: offlineSummary.bundle.initialFileCount,
      routeChunkCount: offlineSummary.bundle.routeChunkCount,
    },
    failureCodes: [],
  };
}

export async function runFrontendUpgradePhase1SystemSurfacesCheck(options = {}) {
  const root = path.resolve(options.root ?? defaultRoot);
  const mode = options.mode ?? "offline";
  const offline = await collectPhase1SystemSurfaceOfflineEvidence(root);
  if (offline.failures.length > 0) {
    throw new Error(`offline system-surface contract failed (${offline.failures.length})`);
  }
  if (mode === "offline") return { output: null, summary: offline.summary };
  if (mode !== "live") throw new Error("system-surface mode must be offline or live");
  const expectedCommit = options.expectedCommit ?? process.env.QUANTGYM_PHASE1_EXPECTED_COMMIT;
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("expected commit is invalid");
  const evidenceSha256 = (
    options.evidenceSha256
    ?? process.env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256
  );
  if (!HASH_PATTERN.test(evidenceSha256 ?? "")) {
    throw new Error("provider evidence SHA-256 is invalid");
  }
  const environment = options.env ?? process.env;
  const checkedAt = new Date(options.checkedAt ?? Date.now());
  if (!Number.isFinite(checkedAt.getTime())) throw new Error("checkedAt is invalid");
  const credentials = options.credentials ?? {
    email: environment.QUANTGYM_PHASE1_AUTH_AUDIT_EMAIL,
    password: environment.QUANTGYM_PHASE1_AUTH_AUDIT_PASSWORD,
  };
  const e2eExecution = await runPhase1ExactCommitE2E({
    root,
    expectedCommit,
    environment,
    runner: options.e2eRunner,
  });
  const browserAudit = await (options.browserAudit ?? defaultBrowserAudit)({
    credentials,
    environment,
    outputRoot: root,
  });
  const browserFailures = validatePhase1BrowserAudit(browserAudit);
  if (browserFailures.length > 0) {
    throw new Error(`live browser audit failed (${browserFailures.length})`);
  }
  const summary = buildPhase1SystemSurfacesLiveSummary({
    browserAudit,
    e2eExecution,
    offlineSummary: offline.summary,
    checkedAt,
    commit: expectedCommit,
    evidenceSha256,
  });
  await writeFileAtomicallyWithinTrustedRoot({
    root,
    relativePath: SUMMARY_RELATIVE,
    data: `${JSON.stringify(summary, null, 2)}\n`,
    mode: 0o644,
  });
  return { output: path.join(root, SUMMARY_RELATIVE), summary };
}

const parseArguments = (argumentsList) => {
  let root = defaultRoot;
  let mode = "offline";
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--offline" || argument === "--live") {
      mode = argument.slice(2);
    } else if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory");
      root = path.resolve(value);
      index += 1;
    } else {
      throw new Error(`unsupported argument: ${argument}`);
    }
  }
  return { mode, root };
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await runFrontendUpgradePhase1SystemSurfacesCheck(
      parseArguments(process.argv.slice(2)),
    );
    console.log(JSON.stringify(result.summary, null, 2));
  } catch {
    console.error("FAIL: frontend upgrade Phase 1 system-surface check failed");
    process.exitCode = 1;
  }
}
