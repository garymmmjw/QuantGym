import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";
import { buildPhase2TagGrep } from "./frontend-upgrade-phase2-playwright-evidence.mjs";

const execFileAsync = promisify(execFile);
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_REPORT_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAX_BUILD_FILE_BYTES = 32 * 1024 * 1024;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const REPORT_FILENAME = "phase2-performance-playwright-report.json";
const SUPPORT_TAG = "e2e:phase2-performance";
const ANNOTATION_TYPE = "phase2-performance-metrics";

export const PHASE2_PERFORMANCE_SUMMARY_PATH = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-performance-summary.json"
);

export const PHASE2_PERFORMANCE_TARGETS = Object.freeze({
  cls: 0.1,
  initialJsGzipBytes: 180 * 1024,
  inpP75Ms: 200,
  largestRouteChunkGzipBytes: 100 * 1024,
  lcpP75Ms: 2_500,
  horizontalOverflowPx: 0,
});

const REQUIRED_CHECKS = Object.freeze([
  "bundleBudgetsPassed",
  "webVitalsPassed",
  "overflowPassed",
]);

const METRIC_KEYS = Object.freeze([
  "initialJsGzipBytes",
  "initialJsBudgetBytes",
  "largestRouteChunkGzipBytes",
  "routeChunkBudgetBytes",
  "lcpP75Ms",
  "lcpTargetMs",
  "inpP75Ms",
  "inpTargetMs",
  "cls",
  "clsTarget",
  "horizontalOverflowPx",
]);

const SUMMARY_ENVELOPE_KEYS = Object.freeze([
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

const CASE_KEYS = Object.freeze([
  "cls",
  "horizontalOverflowPx",
  "id",
  "inpMs",
  "inpSource",
  "interaction",
  "lcpMs",
  "navigation",
  "observers",
  "path",
  "resources",
  "run",
  "routeId",
  "viewport",
]);

const CASE_METRIC_KEYS = Object.freeze([
  "cls",
  "horizontalOverflowPx",
  "id",
  "inpP75Ms",
  "lcpP75Ms",
  "sampleCount",
]);

export const PHASE2_PERFORMANCE_SAMPLES_PER_CASE = 4;

const EXPECTED_CASES = Object.freeze([
  Object.freeze({
    id: "overview--desktop",
    path: "/",
    routeId: "overview",
    viewport: Object.freeze({ height: 900, id: "desktop", width: 1_440 }),
  }),
  Object.freeze({
    id: "overview--mobile",
    path: "/",
    routeId: "overview",
    viewport: Object.freeze({ height: 844, id: "mobile", width: 390 }),
  }),
  Object.freeze({
    id: "plan--desktop",
    path: "/plan",
    routeId: "plan",
    viewport: Object.freeze({ height: 900, id: "desktop", width: 1_440 }),
  }),
  Object.freeze({
    id: "plan--mobile",
    path: "/plan",
    routeId: "plan",
    viewport: Object.freeze({ height: 844, id: "mobile", width: 390 }),
  }),
  Object.freeze({
    id: "problems--desktop",
    path: "/problems",
    routeId: "problems",
    viewport: Object.freeze({ height: 900, id: "desktop", width: 1_440 }),
  }),
  Object.freeze({
    id: "problems--mobile",
    path: "/problems",
    routeId: "problems",
    viewport: Object.freeze({ height: 844, id: "mobile", width: 390 }),
  }),
]);
const EXPECTED_SAMPLE_COUNT = (
  EXPECTED_CASES.length * PHASE2_PERFORMANCE_SAMPLES_PER_CASE
);

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expectedKeys) => (
  isPlainObject(value)
  && Object.keys(value).length === expectedKeys.length
  && expectedKeys.every((key) => Object.hasOwn(value, key))
);

const arraysEqual = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((entry, index) => entry === right[index])
);

const finiteNonNegative = (value) => (
  typeof value === "number" && Number.isFinite(value) && value >= 0
);

const positiveFinite = (value) => finiteNonNegative(value) && value > 0;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export const phase2PerformanceP75 = (values) => {
  if (
    !Array.isArray(values)
    || values.length === 0
    || values.some((value) => !finiteNonNegative(value))
  ) {
    throw new Error("Phase 2 performance p75 samples are invalid");
  }
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * 0.75) - 1)];
};

const readBoundedFile = async (absolutePath, maximumBytes) => {
  const metadata = await lstat(absolutePath);
  if (
    metadata.isSymbolicLink()
    || !metadata.isFile()
    || metadata.size <= 0
    || metadata.size > maximumBytes
  ) throw new Error(`build evidence file is invalid: ${absolutePath}`);
  const bytes = await readFile(absolutePath);
  const after = await stat(absolutePath);
  if (
    after.dev !== metadata.dev
    || after.ino !== metadata.ino
    || after.size !== metadata.size
    || after.mtimeMs !== metadata.mtimeMs
  ) throw new Error(`build evidence file changed while reading: ${absolutePath}`);
  return bytes;
};

const listBuildFiles = async (directory, relativeDirectory = "") => {
  const absoluteDirectory = path.join(directory, relativeDirectory);
  const metadata = await lstat(absoluteDirectory);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`V2 build directory is invalid: ${relativeDirectory || "."}`);
  }
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, relativePath);
    const linkMetadata = await lstat(absolutePath);
    if (entry.isSymbolicLink() || linkMetadata.isSymbolicLink()) {
      throw new Error(`V2 build contains a symlink: ${relativePath}`);
    }
    if (entry.isDirectory() && linkMetadata.isDirectory()) {
      files.push(...await listBuildFiles(directory, relativePath));
      continue;
    }
    if (!entry.isFile() || !linkMetadata.isFile()) {
      throw new Error(`V2 build contains a non-regular path: ${relativePath}`);
    }
    files.push(relativePath);
  }
  return files;
};

const htmlInitialJavaScript = (html) => [...new Set([
  ...[...html.matchAll(/<script\b[^>]*\bsrc="\/([^"?]+\.js)(?:\?[^"]*)?"[^>]*>/giu)]
    .map((match) => match[1]),
  ...[...html.matchAll(
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="\/([^"?]+\.js)(?:\?[^"]*)?"[^>]*>/giu,
  )].map((match) => match[1]),
])];

const validateIntegrityManifest = async ({ buildDirectory, files }) => {
  const manifestPath = path.join(buildDirectory, "asset-integrity.json");
  let manifest;
  try {
    manifest = JSON.parse((await readBoundedFile(
      manifestPath,
      MAX_MANIFEST_BYTES,
    )).toString("utf8"));
  } catch (error) {
    throw new Error("V2 asset integrity manifest is invalid", { cause: error });
  }
  if (
    !isPlainObject(manifest)
    || manifest.schemaVersion !== 1
    || manifest.algorithm !== "sha384"
    || !isPlainObject(manifest.assets)
  ) throw new Error("V2 asset integrity manifest envelope is invalid");
  const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
  const expectedFiles = files
    .filter((entry) => entry !== "asset-integrity.json")
    .sort(compare);
  const manifestedFiles = Object.keys(manifest.assets).sort(compare);
  if (!arraysEqual(manifestedFiles, expectedFiles)) {
    throw new Error("V2 asset integrity manifest inventory is stale");
  }
  for (const relativePath of expectedFiles) {
    const record = manifest.assets[relativePath];
    if (!exactKeys(record, ["bytes", "integrity"])) {
      throw new Error(`V2 asset integrity record is invalid: ${relativePath}`);
    }
    const bytes = await readBoundedFile(
      path.join(buildDirectory, relativePath),
      MAX_BUILD_FILE_BYTES,
    );
    const expectedIntegrity = (
      `sha384-${createHash("sha384").update(bytes).digest("base64")}`
    );
    if (record.bytes !== bytes.length || record.integrity !== expectedIntegrity) {
      throw new Error(`V2 asset integrity mismatch: ${relativePath}`);
    }
  }
};

export async function inspectPhase2Bundle({ root, expectedCommit } = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 bundle root must be absolute");
  }
  if (!SHA_PATTERN.test(expectedCommit ?? "")) {
    throw new Error("Phase 2 bundle commit is invalid");
  }
  const buildDirectory = path.join(root, "dist-v2");
  const files = await listBuildFiles(buildDirectory);
  if (!files.includes("asset-integrity.json")) {
    throw new Error("V2 build asset integrity manifest is missing");
  }
  await validateIntegrityManifest({ buildDirectory, files });

  let version;
  try {
    version = JSON.parse((await readBoundedFile(
      path.join(buildDirectory, "version.json"),
      64 * 1024,
    )).toString("utf8"));
  } catch (error) {
    throw new Error("V2 build version is invalid", { cause: error });
  }
  if (
    !isPlainObject(version)
    || version.schemaVersion !== 1
    || version.commit !== expectedCommit
    || typeof version.branch !== "string"
    || typeof version.source !== "string"
  ) throw new Error("V2 build commit does not match the evidence commit");

  const html = (await readBoundedFile(
    path.join(buildDirectory, "index.html"),
    MAX_BUILD_FILE_BYTES,
  )).toString("utf8");
  const allJavaScript = files.filter((entry) => (
    entry.startsWith("assets/") && entry.endsWith(".js")
  ));
  const initialFiles = htmlInitialJavaScript(html);
  if (initialFiles.length === 0 || new Set(initialFiles).size !== initialFiles.length) {
    throw new Error("V2 build has no exact initial JavaScript inventory");
  }
  if (initialFiles.some((entry) => !allJavaScript.includes(entry))) {
    throw new Error("V2 initial JavaScript is absent from the build manifest");
  }

  const gzipSizes = new Map();
  for (const relativePath of allJavaScript) {
    const bytes = await readBoundedFile(
      path.join(buildDirectory, relativePath),
      MAX_BUILD_FILE_BYTES,
    );
    gzipSizes.set(relativePath, gzipSync(bytes, { level: 9 }).byteLength);
  }
  const routeChunks = allJavaScript.filter((entry) => !initialFiles.includes(entry));
  const bundle = Object.freeze({
    initialJsGzipBytes: initialFiles.reduce(
      (total, entry) => total + (gzipSizes.get(entry) ?? 0),
      0,
    ),
    largestRouteChunkGzipBytes: Math.max(
      0,
      ...routeChunks.map((entry) => gzipSizes.get(entry) ?? 0),
    ),
  });
  if (bundle.initialJsGzipBytes > PHASE2_PERFORMANCE_TARGETS.initialJsGzipBytes) {
    throw new Error("Phase 2 initial JavaScript exceeds 184320 gzip bytes");
  }
  if (
    bundle.largestRouteChunkGzipBytes
    > PHASE2_PERFORMANCE_TARGETS.largestRouteChunkGzipBytes
  ) {
    throw new Error("Phase 2 ordinary route chunk exceeds 102400 gzip bytes");
  }
  return bundle;
}

const normalizedTags = (spec) => {
  const reported = Array.isArray(spec?.tags)
    ? spec.tags.map((tag) => String(tag).replace(/^@/u, ""))
    : [];
  const titleTags = typeof spec?.title === "string"
    ? [...spec.title.matchAll(/(?:^|\s)@([^\s]+)/gu)].map((match) => match[1])
    : [];
  return [...new Set([...reported, ...titleTags])];
};

const flattenSpecs = (suites) => {
  if (!Array.isArray(suites)) throw new Error("Phase 2 performance report suites are missing");
  const specs = [];
  const visit = (suite) => {
    if (!isPlainObject(suite)) throw new Error("Phase 2 performance report suite is invalid");
    if (Array.isArray(suite.specs)) specs.push(...suite.specs);
    if (Array.isArray(suite.suites)) suite.suites.forEach(visit);
  };
  suites.forEach(visit);
  return specs;
};

const validateReportEnvelope = (report) => {
  if (
    !isPlainObject(report)
    || !isPlainObject(report.config)
    || !Array.isArray(report.config.reporter)
    || report.config.reporter.length !== 1
    || !Array.isArray(report.config.reporter[0])
    || report.config.reporter[0][0] !== "json"
    || !Array.isArray(report.config.projects)
    || report.config.projects.length === 0
    || report.config.projects.some((project) => project?.retries !== 0)
    || !Array.isArray(report.errors)
    || report.errors.length !== 0
    || !isPlainObject(report.stats)
    || report.stats.expected !== 1
    || report.stats.skipped !== 0
    || report.stats.unexpected !== 0
    || report.stats.flaky !== 0
  ) throw new Error("Phase 2 performance report envelope is invalid");
};

const validatePerformanceAnnotation = (annotation) => {
  if (
    !exactKeys(annotation, [
      "caseMetrics",
      "cases",
      "kind",
      "metrics",
      "sampleCount",
      "samplesPerCase",
      "schemaVersion",
    ])
    || annotation.schemaVersion !== 1
    || annotation.kind !== "phase2-performance-samples"
    || annotation.sampleCount !== EXPECTED_SAMPLE_COUNT
    || annotation.samplesPerCase !== PHASE2_PERFORMANCE_SAMPLES_PER_CASE
    || !Array.isArray(annotation.cases)
    || annotation.cases.length !== EXPECTED_SAMPLE_COUNT
    || !Array.isArray(annotation.caseMetrics)
    || annotation.caseMetrics.length !== EXPECTED_CASES.length
    || !exactKeys(annotation.metrics, [
      "cls",
      "horizontalOverflowPx",
      "inpP75Ms",
      "lcpP75Ms",
    ])
  ) throw new Error("Phase 2 performance annotation envelope is invalid");

  for (const [caseIndex, expected] of EXPECTED_CASES.entries()) {
    for (let run = 1; run <= PHASE2_PERFORMANCE_SAMPLES_PER_CASE; run += 1) {
      const index = (
        caseIndex * PHASE2_PERFORMANCE_SAMPLES_PER_CASE + run - 1
      );
      const sample = annotation.cases[index];
    if (
      !exactKeys(sample, CASE_KEYS)
      || sample.id !== expected.id
      || sample.run !== run
      || sample.routeId !== expected.routeId
      || sample.path !== expected.path
      || !exactKeys(sample.viewport, ["height", "id", "width"])
      || sample.viewport.id !== expected.viewport.id
      || sample.viewport.width !== expected.viewport.width
      || sample.viewport.height !== expected.viewport.height
      || !positiveFinite(sample.lcpMs)
      || !positiveFinite(sample.inpMs)
      || !finiteNonNegative(sample.cls)
      || !finiteNonNegative(sample.horizontalOverflowPx)
      || !exactKeys(sample.navigation, [
        "domContentLoadedMs",
        "durationMs",
        "responseStartMs",
      ])
      || !positiveFinite(sample.navigation.domContentLoadedMs)
      || !positiveFinite(sample.navigation.durationMs)
      || !positiveFinite(sample.navigation.responseStartMs)
      || !exactKeys(sample.resources, ["count", "decodedBodyBytes"])
      || !Number.isSafeInteger(sample.resources.count)
      || sample.resources.count <= 0
      || !finiteNonNegative(sample.resources.decodedBodyBytes)
      || !exactKeys(sample.observers, [
        "errors",
        "eventTimingSupported",
        "layoutShiftSupported",
        "lcpSupported",
      ])
      || sample.observers.lcpSupported !== true
      || sample.observers.layoutShiftSupported !== true
      || sample.observers.eventTimingSupported !== true
      || !Array.isArray(sample.observers.errors)
      || sample.observers.errors.length !== 0
      || !exactKeys(sample.interaction, [
        "eventTimingCandidateCount",
        "fallbackLatencyMs",
        "kind",
        "label",
      ])
      || !Number.isSafeInteger(sample.interaction.eventTimingCandidateCount)
      || sample.interaction.eventTimingCandidateCount <= 0
      || !positiveFinite(sample.interaction.fallbackLatencyMs)
      || sample.inpSource !== "event-timing"
    ) throw new Error(`Phase 2 performance sample is invalid: ${String(sample?.id)}`);

    const expectedInteraction = sample.viewport.id === "mobile"
      ? { kind: "mobile-more-button-click", label: "更多" }
      : { kind: "theme-toggle-button-click", label: "切换到深色主题" };
    if (
      sample.interaction.kind !== expectedInteraction.kind
      || sample.interaction.label !== expectedInteraction.label
    ) {
      throw new Error(`Phase 2 performance interaction is invalid: ${sample.id}`);
    }
    }
  }

  const recomputedCaseMetrics = EXPECTED_CASES.map((expected) => {
    const samples = annotation.cases.filter((sample) => sample.id === expected.id);
    if (
      samples.length !== PHASE2_PERFORMANCE_SAMPLES_PER_CASE
      || new Set(samples.map((sample) => sample.run)).size
        !== PHASE2_PERFORMANCE_SAMPLES_PER_CASE
    ) throw new Error(`Phase 2 performance case sample inventory is invalid: ${expected.id}`);
    return {
      cls: phase2PerformanceP75(samples.map((entry) => entry.cls)),
      horizontalOverflowPx: Math.max(
        0,
        ...samples.map((entry) => entry.horizontalOverflowPx),
      ),
      id: expected.id,
      inpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.inpMs)),
      lcpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.lcpMs)),
      sampleCount: PHASE2_PERFORMANCE_SAMPLES_PER_CASE,
    };
  });
  for (const [index, recomputedCase] of recomputedCaseMetrics.entries()) {
    const reportedCase = annotation.caseMetrics[index];
    if (
      !exactKeys(reportedCase, CASE_METRIC_KEYS)
      || JSON.stringify(reportedCase) !== JSON.stringify(recomputedCase)
    ) throw new Error(`Phase 2 performance case metrics are invalid: ${recomputedCase.id}`);
  }

  const recomputed = {
    cls: Math.max(...recomputedCaseMetrics.map((entry) => entry.cls)),
    horizontalOverflowPx: Math.max(
      0,
      ...recomputedCaseMetrics.map((entry) => entry.horizontalOverflowPx),
    ),
    inpP75Ms: Math.max(...recomputedCaseMetrics.map((entry) => entry.inpP75Ms)),
    lcpP75Ms: Math.max(...recomputedCaseMetrics.map((entry) => entry.lcpP75Ms)),
  };
  for (const [key, value] of Object.entries(recomputed)) {
    if (annotation.metrics[key] !== value) {
      throw new Error(`Phase 2 performance annotation ${key} is not derived from samples`);
    }
  }
  if (recomputed.lcpP75Ms > PHASE2_PERFORMANCE_TARGETS.lcpP75Ms) {
    throw new Error("Phase 2 LCP p75 exceeds 2500ms");
  }
  if (recomputed.inpP75Ms > PHASE2_PERFORMANCE_TARGETS.inpP75Ms) {
    throw new Error("Phase 2 INP p75 exceeds 200ms");
  }
  if (recomputed.cls > PHASE2_PERFORMANCE_TARGETS.cls) {
    throw new Error("Phase 2 CLS p75 exceeds 0.1");
  }
  if (recomputed.horizontalOverflowPx !== 0) {
    throw new Error("Phase 2 performance samples contain horizontal overflow");
  }
  return Object.freeze({
    annotation,
    caseMetrics: Object.freeze(recomputedCaseMetrics),
    metrics: Object.freeze(recomputed),
  });
};

export function parsePhase2PerformanceReport({ report } = {}) {
  validateReportEnvelope(report);
  const specs = flattenSpecs(report.suites);
  if (specs.length !== 1 || !isPlainObject(specs[0])) {
    throw new Error("Phase 2 performance report must execute exactly one support spec");
  }
  const [spec] = specs;
  const tags = normalizedTags(spec);
  if (
    !tags.includes(SUPPORT_TAG)
    || !tags.includes("phase2:performance")
    || tags.some((tag) => (
      tag.startsWith("e2e:phase2-performance") && tag !== SUPPORT_TAG
    ))
    || spec.ok !== true
    || !Array.isArray(spec.tests)
    || spec.tests.length !== 1
  ) throw new Error("Phase 2 performance support spec is invalid");
  const [reportedTest] = spec.tests;
  const annotations = Array.isArray(reportedTest?.annotations)
    ? reportedTest.annotations
    : [];
  if (
    annotations.some((entry) => [
      "disabled",
      "expected-failure",
      "fixme",
      "pending",
      "skip",
      "todo",
      "xfail",
      "xpass",
    ].includes(String(entry?.type ?? "").trim().toLowerCase()))
    || reportedTest?.expectedStatus !== "passed"
    || reportedTest?.status === "skipped"
    || reportedTest?.status === "flaky"
    || reportedTest?.status !== "expected"
    || !Array.isArray(reportedTest?.results)
    || reportedTest.results.length !== 1
  ) throw new Error("Phase 2 performance test was skipped, retried, flaky, or failed");
  const [result] = reportedTest.results;
  if (
    result?.retry !== 0
    || result?.status !== "passed"
    || result?.error !== undefined
    || (Array.isArray(result?.errors) && result.errors.length > 0)
  ) throw new Error("Phase 2 performance result was retried or failed");
  const metricAnnotations = annotations.filter((entry) => entry?.type === ANNOTATION_TYPE);
  if (metricAnnotations.length !== 1 || typeof metricAnnotations[0].description !== "string") {
    throw new Error("Phase 2 performance metrics annotation must occur exactly once");
  }
  let annotation;
  try {
    annotation = JSON.parse(metricAnnotations[0].description);
  } catch (error) {
    throw new Error("Phase 2 performance metrics annotation is invalid JSON", { cause: error });
  }
  return validatePerformanceAnnotation(annotation);
}

export const phase2PerformancePlaywrightArguments = (grep) => Object.freeze([
  path.join("node_modules", "playwright", "cli.js"),
  "test",
  "--config",
  "playwright.v2.config.ts",
  "--grep",
  grep,
  "--reporter=json",
  "--retries=0",
  "--workers=1",
]);

export async function runPhase2PerformancePlaywright({ root, grep } = {}) {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "quantgym-phase2-performance-report-"),
  );
  const reportPath = path.join(temporaryDirectory, REPORT_FILENAME);
  let exitCode = 0;
  let commandError;
  try {
    try {
      await execFileAsync(
        process.execPath,
        phase2PerformancePlaywrightArguments(grep),
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`,
            PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
          },
          maxBuffer: 8 * 1024 * 1024,
        },
      );
    } catch (error) {
      exitCode = Number.isSafeInteger(error?.code) ? error.code : 1;
      commandError = error;
    }
    const reportMetadata = await stat(reportPath).catch(() => null);
    if (
      !reportMetadata?.isFile()
      || reportMetadata.size <= 0
      || reportMetadata.size > MAX_REPORT_BYTES
    ) {
      throw new Error("Phase 2 performance Playwright report is missing or oversized", {
        cause: commandError,
      });
    }
    let report;
    try {
      report = JSON.parse(await readFile(reportPath, "utf8"));
    } catch (error) {
      throw new Error("Phase 2 performance Playwright report cannot be parsed", {
        cause: error,
      });
    }
    return { exitCode, report };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

export async function runPhase2ProductionBuild({ root } = {}) {
  const npmExecutable = path.join(path.dirname(process.execPath), "npm");
  await execFileAsync(npmExecutable, ["run", "build:v2"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`,
    },
    maxBuffer: 16 * 1024 * 1024,
  });
}

const resolveCommit = async (root) => {
  const { stdout } = await execFileAsync(
    "/usr/bin/git",
    ["-c", "core.fsmonitor=false", "rev-parse", "HEAD"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
      maxBuffer: 128 * 1024,
    },
  );
  const commit = stdout.trim();
  if (!SHA_PATTERN.test(commit)) throw new Error("current Git commit is invalid");
  return commit;
};

export async function loadPhase2PerformanceContext({ root } = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 performance evidence root must be absolute");
  }
  const [manifestBytes, phase1EvidenceLockBytes] = await Promise.all([
    readFile(path.join(root, PHASE2_ACCEPTANCE_MANIFEST_PATH)),
    readFile(path.join(root, PHASE1_EVIDENCE_LOCK_PATH)),
  ]);
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("Phase 2 acceptance manifest is not valid JSON");
  }
  const allocatedGates = Array.isArray(manifest?.gates)
    ? manifest.gates.filter((gate) => (
      gate?.phase2EvidencePath === PHASE2_PERFORMANCE_SUMMARY_PATH
    ))
    : null;
  if (
    manifest?.schemaVersion !== 1
    || manifest?.phase !== 2
    || !Array.isArray(allocatedGates)
    || allocatedGates.length !== 0
    || !Array.isArray(manifest.evidenceOutputs)
    || manifest.evidenceOutputs.filter((entry) => (
      entry === PHASE2_PERFORMANCE_SUMMARY_PATH
    )).length !== 1
  ) throw new Error("Phase 2 performance manifest allocation is invalid");
  return Object.freeze({
    grep: buildPhase2TagGrep([SUPPORT_TAG]),
    manifestSha256: sha256(manifestBytes),
    phase1EvidenceLockSha256: sha256(phase1EvidenceLockBytes),
    summaryPath: PHASE2_PERFORMANCE_SUMMARY_PATH,
  });
}

export function validatePhase2PerformanceSummary(summary, {
  expectedCommit,
  manifestSha256,
  nowMs,
  phase1EvidenceLockSha256,
} = {}) {
  const checkedAtMs = Date.parse(summary?.checkedAt);
  if (
    !exactKeys(summary, SUMMARY_ENVELOPE_KEYS)
    || summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase2-performance"
    || summary.status !== "pass"
    || summary.commit !== expectedCommit
    || !SHA_PATTERN.test(summary.commit ?? "")
    || summary.manifestSha256 !== manifestSha256
    || !HASH_PATTERN.test(summary.manifestSha256 ?? "")
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256 ?? "")
    || !Number.isFinite(checkedAtMs)
    || new Date(checkedAtMs).toISOString() !== summary.checkedAt
    || !Number.isFinite(nowMs)
    || checkedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAtMs > MAX_EVIDENCE_AGE_MS
    || !Array.isArray(summary.results)
    || summary.results.length !== 0
    || !Array.isArray(summary.visualCases)
    || summary.visualCases.length !== 0
    || !exactKeys(summary.checks, REQUIRED_CHECKS)
    || Object.values(summary.checks).some((value) => value !== true)
    || !exactKeys(summary.counts, [
      "resultCount",
      "skippedResultCount",
      "failedResultCount",
      "retriedResultCount",
      "flakyResultCount",
    ])
    || Object.values(summary.counts).some((value) => value !== 0)
    || !exactKeys(summary.metrics, METRIC_KEYS)
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) throw new Error("Phase 2 performance summary envelope is invalid or stale");
  for (const metric of Object.values(summary.metrics)) {
    if (!finiteNonNegative(metric)) {
      throw new Error("Phase 2 performance summary metrics are invalid");
    }
  }
  if (
    summary.metrics.initialJsBudgetBytes !== PHASE2_PERFORMANCE_TARGETS.initialJsGzipBytes
    || summary.metrics.routeChunkBudgetBytes
      !== PHASE2_PERFORMANCE_TARGETS.largestRouteChunkGzipBytes
    || summary.metrics.lcpTargetMs !== PHASE2_PERFORMANCE_TARGETS.lcpP75Ms
    || summary.metrics.inpTargetMs !== PHASE2_PERFORMANCE_TARGETS.inpP75Ms
    || summary.metrics.clsTarget !== PHASE2_PERFORMANCE_TARGETS.cls
    || summary.metrics.initialJsGzipBytes > summary.metrics.initialJsBudgetBytes
    || summary.metrics.largestRouteChunkGzipBytes
      > summary.metrics.routeChunkBudgetBytes
    || summary.metrics.lcpP75Ms > summary.metrics.lcpTargetMs
    || summary.metrics.inpP75Ms > summary.metrics.inpTargetMs
    || summary.metrics.cls > summary.metrics.clsTarget
    || summary.metrics.horizontalOverflowPx !== 0
  ) throw new Error("Phase 2 performance summary exceeds a required threshold");
  return summary;
}

export function buildPhase2PerformanceSummary({
  bundle,
  checkedAt,
  commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  performance,
  nowMs = Date.parse(checkedAt),
} = {}) {
  const summary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase2-performance",
    status: "pass",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    results: [],
    visualCases: [],
    checks: {
      bundleBudgetsPassed: true,
      webVitalsPassed: true,
      overflowPassed: true,
    },
    counts: {
      resultCount: 0,
      skippedResultCount: 0,
      failedResultCount: 0,
      retriedResultCount: 0,
      flakyResultCount: 0,
    },
    metrics: {
      initialJsGzipBytes: bundle?.initialJsGzipBytes,
      initialJsBudgetBytes: PHASE2_PERFORMANCE_TARGETS.initialJsGzipBytes,
      largestRouteChunkGzipBytes: bundle?.largestRouteChunkGzipBytes,
      routeChunkBudgetBytes: PHASE2_PERFORMANCE_TARGETS.largestRouteChunkGzipBytes,
      lcpP75Ms: performance?.lcpP75Ms,
      lcpTargetMs: PHASE2_PERFORMANCE_TARGETS.lcpP75Ms,
      inpP75Ms: performance?.inpP75Ms,
      inpTargetMs: PHASE2_PERFORMANCE_TARGETS.inpP75Ms,
      cls: performance?.cls,
      clsTarget: PHASE2_PERFORMANCE_TARGETS.cls,
      horizontalOverflowPx: performance?.horizontalOverflowPx,
    },
    failureCodes: [],
  };
  return validatePhase2PerformanceSummary(summary, {
    expectedCommit: commit,
    manifestSha256,
    nowMs,
    phase1EvidenceLockSha256,
  });
}

export async function runPhase2PerformanceEvidenceBuilder({
  root,
  buildRunner = runPhase2ProductionBuild,
  bundleInspector = inspectPhase2Bundle,
  reportRunner = runPhase2PerformancePlaywright,
  commitResolver = resolveCommit,
  now = () => new Date(),
  writeSummary = true,
} = {}) {
  const initialContext = await loadPhase2PerformanceContext({ root });
  const initialCommit = await commitResolver(root);
  await buildRunner({ root });
  const bundle = await bundleInspector({ root, expectedCommit: initialCommit });
  const execution = await reportRunner({ root, grep: initialContext.grep });
  const parsed = parsePhase2PerformanceReport({ report: execution?.report });
  if (execution?.exitCode !== 0) {
    throw new Error(
      `Phase 2 performance Playwright exited with code ${String(execution?.exitCode)}`,
    );
  }

  const [finalContext, finalCommit] = await Promise.all([
    loadPhase2PerformanceContext({ root }),
    commitResolver(root),
  ]);
  if (
    finalCommit !== initialCommit
    || finalContext.manifestSha256 !== initialContext.manifestSha256
    || finalContext.phase1EvidenceLockSha256
      !== initialContext.phase1EvidenceLockSha256
  ) throw new Error("Phase 2 performance evidence inputs became stale during capture");
  const checkedAtDate = now();
  if (!(checkedAtDate instanceof Date) || !Number.isFinite(checkedAtDate.getTime())) {
    throw new Error("Phase 2 performance evidence clock is invalid");
  }
  const summary = buildPhase2PerformanceSummary({
    bundle,
    checkedAt: checkedAtDate.toISOString(),
    commit: finalCommit,
    manifestSha256: finalContext.manifestSha256,
    nowMs: checkedAtDate.getTime(),
    performance: parsed.metrics,
    phase1EvidenceLockSha256: finalContext.phase1EvidenceLockSha256,
  });
  if (writeSummary) {
    await writeFileAtomicallyWithinTrustedRoot({
      root,
      relativePath: finalContext.summaryPath,
      data: `${JSON.stringify(summary, null, 2)}\n`,
    });
  }
  return {
    bundle,
    outputPath: finalContext.summaryPath,
    parsed,
    summary,
  };
}
