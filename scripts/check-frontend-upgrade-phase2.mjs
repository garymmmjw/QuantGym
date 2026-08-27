#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
  checkPhase2ContractSet,
} from "./lib/frontend-upgrade-phase2-contracts.mjs";
import {
  validatePhase2ContractSummary,
} from "./lib/frontend-upgrade-phase2-contract-evidence.mjs";
import {
  validatePhase2PerformanceSummary,
} from "./lib/frontend-upgrade-phase2-performance-evidence.mjs";
import {
  validatePhase2ComponentSummary,
} from "./lib/frontend-upgrade-phase2-playwright-evidence.mjs";
import {
  assertPhase2EvidenceProvenanceStable,
  capturePhase2EvidenceProvenance,
  classifyPhase2EvidenceLifecycle,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";
import {
  validatePhase2FinalVisualSummary,
  PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
  validatePhase2VisualReviewReceipt,
} from "./lib/frontend-upgrade-phase2-visual-evidence.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_REVIEW_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/u;
const FORBIDDEN_OUTCOME_KEY_PATTERN = (
  /(?:skip|todo|xfail|xpass|fixme|pending|disable|expected.?fail|unexpected.?success|retr(?:y|ied)|flak|fail)/iu
);
const VERIFIED_READY_VALIDATIONS = new WeakSet();

export const PHASE2_AGGREGATE_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-summary.json"
);

export const PHASE2_COMPONENT_SUMMARY_PATHS = Object.freeze({
  contract: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-contract-summary.json"
  ),
  visual: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-summary.json"
  ),
  accessibility: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-accessibility-summary.json"
  ),
  journeys: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-journeys-summary.json"
  ),
  recovery: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-recovery-summary.json"
  ),
  performance: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-performance-summary.json"
  ),
});

const COMPONENT_CHECKS = Object.freeze({
  contract: "frontend-upgrade-phase2-contracts",
  visual: "frontend-upgrade-phase2-visual",
  accessibility: "frontend-upgrade-phase2-accessibility",
  journeys: "frontend-upgrade-phase2-journeys",
  recovery: "frontend-upgrade-phase2-recovery",
  performance: "frontend-upgrade-phase2-performance",
});

const REQUIRED_COMPONENT_CHECKS = Object.freeze({
  contract: Object.freeze([
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
  ]),
  visual: Object.freeze([
    "visualMatrixPassed",
    "originalDimensionsInspected",
    "noSkeletons",
    "noLegacyFrames",
    "brandAssetsPresent",
    "noClipping",
    "chineseEnglishOverflowPassed",
    "reducedMotionPassed",
  ]),
  accessibility: Object.freeze([
    "axePassed",
    "keyboardJourneysPassed",
    "mobileTargetsPassed",
    "focusPassed",
  ]),
  journeys: Object.freeze([
    "dailyLoopPassed",
    "singleRewardPassed",
    "planUpdated",
    "overviewUpdated",
    "consolePassed",
    "rejectionsPassed",
    "overflowPassed",
  ]),
  recovery: Object.freeze([
    "allGatesPassed",
    "noSkippedResults",
    "noRetriedResults",
    "noFlakyResults",
    "idempotencyPassed",
  ]),
  performance: Object.freeze([
    "bundleBudgetsPassed",
    "webVitalsPassed",
    "overflowPassed",
  ]),
});

const COMPONENT_ENVELOPE_KEYS = Object.freeze([
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
const RESULT_KEYS = Object.freeze([
  "id",
  "status",
  "skipped",
  "retried",
  "flaky",
]);
const VISUAL_CASE_KEYS = Object.freeze([
  "id",
  "status",
  "evidencePath",
  "sha256",
  "width",
  "height",
  "skipped",
  "retried",
  "flaky",
]);
const REQUIRED_COUNT_KEYS = Object.freeze([
  "resultCount",
  "skippedResultCount",
  "failedResultCount",
  "retriedResultCount",
  "flakyResultCount",
]);
const AGGREGATE_CHECK_KEYS = Object.freeze([
  "manifestValid",
  "componentEvidenceAligned",
  "phase1EvidenceLockBeforeAfter",
  "applicationCommitAligned",
  "all76GatesPassed",
  "all22VisualCasesPassed",
  "noSkippedRetriedFlakyResults",
  "accessibilityPassed",
  "journeysPassed",
  "recoveryPassed",
  "performancePassed",
]);
const AGGREGATE_COUNT_KEYS = Object.freeze([
  "componentSummaries",
  "targetGates",
  "passedGates",
  "missingResults",
  "duplicateResults",
  "extraResults",
  "skippedResults",
  "failedResults",
  "retriedResults",
  "flakyResults",
  "targetVisualCases",
  "passedVisualCases",
  "missingVisualCases",
  "seriousOrCriticalAxeFindings",
  "applicationConsoleErrors",
  "unhandledRejections",
  "horizontalOverflowPx",
  "initialJsGzipBytes",
  "largestRouteChunkGzipBytes",
  "lcpP75Ms",
  "inpP75Ms",
  "cls",
]);

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const uniqueSorted = (values) => [...new Set(values)].sort();
const exactKeys = (value, expected) => (
  isPlainObject(value)
  && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key))
);
const safeRelativePath = (relativePath) => (
  typeof relativePath === "string"
  && relativePath.length > 0
  && relativePath === relativePath.replaceAll("\\", "/")
  && !path.posix.isAbsolute(relativePath)
  && path.posix.normalize(relativePath) === relativePath
  && !relativePath.split("/").includes("..")
);
const finiteNonNegative = (value) => (
  typeof value === "number" && Number.isFinite(value) && value >= 0
);
const nonNegativeInteger = (value) => (
  Number.isSafeInteger(value) && value >= 0
);

const addFailure = (audit, code) => {
  audit.failures.add(SAFE_CODE_PATTERN.test(code) ? code : "internal_check_failed");
};

const validateIsoTime = (value, nowMs, audit) => {
  if (typeof value !== "string") {
    addFailure(audit, "component_summary_invalid");
    return;
  }
  const parsed = Date.parse(value);
  if (
    !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== value
    || parsed > nowMs + CLOCK_SKEW_MS
    || nowMs - parsed > MAX_EVIDENCE_AGE_MS
  ) {
    addFailure(audit, "component_summary_stale");
  }
};

const validateBooleanChecks = (value, required, audit) => {
  if (!isPlainObject(value)) {
    addFailure(audit, "component_summary_invalid");
    return;
  }
  for (const requiredKey of required) {
    if (value[requiredKey] !== true) addFailure(audit, "component_check_failed");
  }
  for (const checkValue of Object.values(value)) {
    if (checkValue !== true) addFailure(audit, "component_check_failed");
  }
};

const validateCounts = (value, results, audit) => {
  if (!isPlainObject(value)) {
    addFailure(audit, "component_summary_invalid");
    return;
  }
  for (const [key, count] of Object.entries(value)) {
    if (!nonNegativeInteger(count)) addFailure(audit, "component_summary_invalid");
    if (FORBIDDEN_OUTCOME_KEY_PATTERN.test(key) && count !== 0) {
      addFailure(audit, "component_count_mismatch");
    }
  }
  for (const key of REQUIRED_COUNT_KEYS) {
    if (!Object.hasOwn(value, key)) addFailure(audit, "component_summary_invalid");
  }
  const observed = {
    resultCount: results.length,
    skippedResultCount: results.filter((result) => result?.skipped === true).length,
    failedResultCount: results.filter((result) => result?.status !== "pass").length,
    retriedResultCount: results.filter((result) => result?.retried === true).length,
    flakyResultCount: results.filter((result) => result?.flaky === true).length,
  };
  for (const [key, count] of Object.entries(observed)) {
    if (value[key] !== count) addFailure(audit, "component_count_mismatch");
  }
};

const validateMetricsShape = (metrics, audit) => {
  if (!isPlainObject(metrics)) {
    addFailure(audit, "component_summary_invalid");
    return;
  }
  for (const [key, value] of Object.entries(metrics)) {
    if (value !== null && typeof value !== "boolean" && !finiteNonNegative(value)) {
      addFailure(audit, "component_summary_invalid");
    }
    if (
      FORBIDDEN_OUTCOME_KEY_PATTERN.test(key)
      && key !== "retryIdempotencyGateCount"
      && finiteNonNegative(value)
      && value !== 0
    ) addFailure(audit, "component_count_mismatch");
  }
};

const validateResultSet = ({
  component,
  results,
  expectedIds,
  audit,
}) => {
  if (!Array.isArray(results)) {
    addFailure(audit, component + "_summary_invalid");
    return;
  }
  const observedIds = [];
  for (const result of results) {
    if (!exactKeys(result, RESULT_KEYS) || typeof result.id !== "string") {
      addFailure(audit, component + "_summary_invalid");
      continue;
    }
    observedIds.push(result.id);
    audit.observedResults.push(result);
    if (result.status !== "pass") addFailure(audit, "failed_result");
    if (result.skipped !== false) addFailure(audit, "skipped_result");
    if (result.retried !== false) addFailure(audit, "retried_result");
    if (result.flaky !== false) addFailure(audit, "flaky_result");
  }
  const observedSet = new Set(observedIds);
  const expectedSet = new Set(expectedIds);
  if (observedIds.length !== observedSet.size) addFailure(audit, "duplicate_result");
  if (expectedIds.some((id) => !observedSet.has(id))) addFailure(audit, "missing_result");
  if (observedIds.some((id) => !expectedSet.has(id))) addFailure(audit, "extra_result");
  for (const result of results) {
    if (
      expectedSet.has(result?.id)
      && result.status === "pass"
      && result.skipped === false
      && result.retried === false
      && result.flaky === false
    ) {
      audit.passedGateIds.add(result.id);
    }
  }
};

const validatePerformanceMetrics = (metrics, audit) => {
  const required = [
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
  ];
  if (!isPlainObject(metrics) || required.some((key) => !finiteNonNegative(metrics[key]))) {
    addFailure(audit, "performance_metrics_invalid");
    return;
  }
  if (
    metrics.initialJsBudgetBytes !== 180 * 1024
    || metrics.routeChunkBudgetBytes !== 100 * 1024
    || metrics.lcpTargetMs !== 2500
    || metrics.inpTargetMs !== 200
    || metrics.clsTarget !== 0.1
    || metrics.initialJsGzipBytes > metrics.initialJsBudgetBytes
    || metrics.largestRouteChunkGzipBytes > metrics.routeChunkBudgetBytes
    || metrics.lcpP75Ms > metrics.lcpTargetMs
    || metrics.inpP75Ms > metrics.inpTargetMs
    || metrics.cls > metrics.clsTarget
    || metrics.horizontalOverflowPx !== 0
  ) {
    addFailure(audit, "performance_budget_failed");
  }
};

const validateCategoryMetrics = (component, metrics, audit) => {
  validateMetricsShape(metrics, audit);
  if (!isPlainObject(metrics)) return;
  if (
    component === "accessibility"
    && metrics.seriousOrCriticalAxeFindings !== 0
  ) addFailure(audit, "accessibility_failed");
  if (component === "journeys") {
    if (metrics.applicationConsoleErrors !== 0) addFailure(audit, "console_errors_detected");
    if (metrics.unhandledRejections !== 0) addFailure(audit, "unhandled_rejections_detected");
    if (metrics.horizontalOverflowPx !== 0) addFailure(audit, "horizontal_overflow_detected");
  }
  if (component === "performance") validatePerformanceMetrics(metrics, audit);
};

const validateManifest = (manifest, audit) => {
  if (!isPlainObject(manifest)) {
    addFailure(audit, "manifest_invalid");
    return {
      gatesByEvidencePath: new Map(),
      visualCases: [],
      evidenceOutputs: [],
    };
  }
  const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
  const gateIds = gates.map((gate) => gate?.id);
  const visualCases = Array.isArray(manifest.finalVisualCases)
    ? manifest.finalVisualCases
    : [];
  const evidenceOutputs = Array.isArray(manifest.evidenceOutputs)
    ? manifest.evidenceOutputs
    : [];
  if (
    manifest.schemaVersion !== 1
    || manifest.phase !== 2
    || manifest.targetGateCount !== 76
    || gates.length !== 76
    || new Set(gateIds).size !== 76
    || gateIds.some((id) => typeof id !== "string")
    || manifest.finalVisualCaseCount !== 22
    || visualCases.length !== 22
    || new Set(visualCases.map((entry) => entry?.id)).size !== 22
  ) {
    addFailure(audit, "manifest_invalid");
  }
  const policy = manifest.activationPolicy;
  if (
    !isPlainObject(policy)
    || policy.requiredResultStatus !== "pass"
    || !Array.isArray(policy.allowedResultStatuses)
    || policy.allowedResultStatuses.length !== 1
    || policy.allowedResultStatuses[0] !== "pass"
  ) addFailure(audit, "manifest_policy_invalid");
  for (const key of [
    "legacyResultAllowed",
    "skippedResultAllowed",
    "retriedResultAllowed",
    "flakyResultAllowed",
    "missingResultAllowed",
    "duplicateResultAllowed",
    "extraResultAllowed",
    "staleEvidenceAllowed",
  ]) {
    if (policy?.[key] !== false) addFailure(audit, "manifest_policy_invalid");
  }
  const expectedSummaryOutputs = [
    ...Object.values(PHASE2_COMPONENT_SUMMARY_PATHS),
    PHASE2_AGGREGATE_SUMMARY_RELATIVE,
  ];
  const expectedImageOutputs = visualCases.map((entry) => entry?.evidencePath);
  const expectedEvidenceOutputs = [
    ...expectedSummaryOutputs,
    PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
    ...expectedImageOutputs,
  ];
  if (
    evidenceOutputs.length !== 30
    || new Set(evidenceOutputs).size !== 30
    || JSON.stringify(evidenceOutputs)
      !== JSON.stringify(expectedEvidenceOutputs)
  ) {
    addFailure(audit, "evidence_output_inventory_invalid");
  }
  const gatesByEvidencePath = new Map(
    Object.values(PHASE2_COMPONENT_SUMMARY_PATHS).map((summaryPath) => [summaryPath, []]),
  );
  for (const gate of gates) {
    if (
      !isPlainObject(gate)
      || gate.phase2RequiredResultStatus !== "pass"
      || typeof gate.phase2EvidencePath !== "string"
      || !gatesByEvidencePath.has(gate.phase2EvidencePath)
    ) {
      addFailure(audit, "manifest_gate_invalid");
      continue;
    }
    gatesByEvidencePath.get(gate.phase2EvidencePath).push(gate.id);
  }
  if (
    (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.contract) ?? []).length !== 0
    || (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.performance) ?? []).length !== 0
    || (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.visual) ?? []).length !== 3
    || (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.accessibility) ?? []).length !== 3
    || (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.journeys) ?? []).length !== 3
    || (gatesByEvidencePath.get(PHASE2_COMPONENT_SUMMARY_PATHS.recovery) ?? []).length !== 67
  ) {
    addFailure(audit, "manifest_gate_inventory_invalid");
  }
  return { gatesByEvidencePath, visualCases, evidenceOutputs };
};

const validateVisualCases = ({
  summary,
  expectedCases,
  reviewImages,
  audit,
}) => {
  const cases = Array.isArray(summary.visualCases) ? summary.visualCases : [];
  const expectedById = new Map(expectedCases.map((entry) => [entry.id, entry]));
  const observedIds = [];
  for (const visualCase of cases) {
    if (!exactKeys(visualCase, VISUAL_CASE_KEYS) || typeof visualCase.id !== "string") {
      addFailure(audit, "visual_case_invalid");
      continue;
    }
    observedIds.push(visualCase.id);
    const expected = expectedById.get(visualCase.id);
    if (!expected) {
      addFailure(audit, "extra_visual_case");
      continue;
    }
    const image = reviewImages.get(expected.evidencePath);
    if (!image) addFailure(audit, "review_image_missing");
    if (
      visualCase.status !== "pass"
      || visualCase.skipped !== false
      || visualCase.retried !== false
      || visualCase.flaky !== false
      || visualCase.evidencePath !== expected.evidencePath
      || visualCase.width !== expected.viewport?.width
      || visualCase.height !== expected.viewport?.height
      || !HASH_PATTERN.test(visualCase.sha256)
    ) {
      addFailure(audit, "visual_case_invalid");
      continue;
    }
    if (
      !image
      || image.sha256 !== visualCase.sha256
      || image.width !== visualCase.width
      || image.height !== visualCase.height
    ) {
      addFailure(audit, "review_image_mismatch");
      continue;
    }
    audit.passedVisualCaseIds.add(visualCase.id);
  }
  const observedSet = new Set(observedIds);
  if (observedIds.length !== observedSet.size) addFailure(audit, "duplicate_visual_case");
  if (expectedCases.some((entry) => !observedSet.has(entry.id))) {
    addFailure(audit, "missing_visual_case");
  }
  if (observedIds.some((id) => !expectedById.has(id))) {
    addFailure(audit, "extra_visual_case");
  }
  const observedHashes = cases
    .map((visualCase) => visualCase?.sha256)
    .filter((hash) => HASH_PATTERN.test(hash ?? ""));
  if (observedHashes.length !== new Set(observedHashes).size) {
    addFailure(audit, "duplicate_review_image");
  }
};

const validateComponent = ({
  component,
  summary,
  expectedIds,
  expectedCases,
  reviewImages,
  manifestSha256,
  phase1EvidenceLockSha256,
  nowMs,
  audit,
}) => {
  if (!isPlainObject(summary)) {
    addFailure(audit, component + "_summary_missing");
    return;
  }
  audit.componentSummaryCount += 1;
  if (!exactKeys(summary, COMPONENT_ENVELOPE_KEYS)) {
    addFailure(audit, component + "_summary_invalid");
    return;
  }
  try {
    const shared = {
      expectedCommit: summary.commit,
      manifestSha256,
      nowMs,
      phase1EvidenceLockSha256,
    };
    if (component === "contract") {
      validatePhase2ContractSummary(summary, shared);
    } else if (component === "performance") {
      validatePhase2PerformanceSummary(summary, shared);
    } else if (component === "visual") {
      validatePhase2FinalVisualSummary(summary, {
        ...shared,
        expectedCases,
        reviewImages,
      });
    } else {
      validatePhase2ComponentSummary(summary, {
        ...shared,
        component,
        expectedIds,
      });
    }
  } catch {
    addFailure(audit, component + "_summary_semantics_invalid");
  }
  if (
    summary.schemaVersion !== 1
    || summary.check !== COMPONENT_CHECKS[component]
    || summary.status !== "pass"
    || !SHA_PATTERN.test(summary.commit)
    || summary.manifestSha256 !== manifestSha256
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !HASH_PATTERN.test(summary.manifestSha256)
    || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256)
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) {
    addFailure(audit, component + "_summary_invalid");
  }
  validateIsoTime(summary.checkedAt, nowMs, audit);
  audit.commits.push(summary.commit);
  validateBooleanChecks(summary.checks, REQUIRED_COMPONENT_CHECKS[component], audit);
  const results = Array.isArray(summary.results) ? summary.results : [];
  validateResultSet({ component, results, expectedIds, audit });
  validateCounts(summary.counts, results, audit);
  validateCategoryMetrics(component, summary.metrics, audit);
  if (component === "visual") {
    validateVisualCases({
      summary,
      expectedCases,
      reviewImages,
      audit,
    });
  } else if (!Array.isArray(summary.visualCases) || summary.visualCases.length !== 0) {
    addFailure(audit, component + "_summary_invalid");
  }
};

const metricFrom = (summaries, component, key) => {
  const value = summaries?.[component]?.metrics?.[key];
  return finiteNonNegative(value) ? value : null;
};

const buildCounts = (audit, manifest, summaries) => {
  const expectedGateIds = Array.isArray(manifest?.gates)
    ? manifest.gates.map((gate) => gate.id)
    : [];
  const expectedVisualIds = Array.isArray(manifest?.finalVisualCases)
    ? manifest.finalVisualCases.map((entry) => entry.id)
    : [];
  const resultIds = audit.observedResults
    .filter((result) => typeof result?.id === "string")
    .map((result) => result.id);
  const duplicateCount = resultIds.length - new Set(resultIds).size;
  const expectedGateSet = new Set(expectedGateIds);
  return {
    componentSummaries: audit.componentSummaryCount,
    targetGates: 76,
    passedGates: audit.passedGateIds.size,
    missingResults: Math.max(0, expectedGateIds.length - audit.passedGateIds.size),
    duplicateResults: duplicateCount,
    extraResults: resultIds.filter((id) => !expectedGateSet.has(id)).length,
    skippedResults: audit.observedResults.filter((result) => result?.skipped === true).length,
    failedResults: audit.observedResults.filter((result) => result?.status !== "pass").length,
    retriedResults: audit.observedResults.filter((result) => result?.retried === true).length,
    flakyResults: audit.observedResults.filter((result) => result?.flaky === true).length,
    targetVisualCases: 22,
    passedVisualCases: audit.passedVisualCaseIds.size,
    missingVisualCases: Math.max(
      0,
      expectedVisualIds.length - audit.passedVisualCaseIds.size,
    ),
    seriousOrCriticalAxeFindings: metricFrom(
      summaries,
      "accessibility",
      "seriousOrCriticalAxeFindings",
    ),
    applicationConsoleErrors: metricFrom(
      summaries,
      "journeys",
      "applicationConsoleErrors",
    ),
    unhandledRejections: metricFrom(summaries, "journeys", "unhandledRejections"),
    horizontalOverflowPx: metricFrom(summaries, "journeys", "horizontalOverflowPx"),
    initialJsGzipBytes: metricFrom(summaries, "performance", "initialJsGzipBytes"),
    largestRouteChunkGzipBytes: metricFrom(
      summaries,
      "performance",
      "largestRouteChunkGzipBytes",
    ),
    lcpP75Ms: metricFrom(summaries, "performance", "lcpP75Ms"),
    inpP75Ms: metricFrom(summaries, "performance", "inpP75Ms"),
    cls: metricFrom(summaries, "performance", "cls"),
  };
};

const aggregateChecks = (ready) => Object.fromEntries(
  AGGREGATE_CHECK_KEYS.map((key) => [key, ready]),
);

export function validatePhase2AggregateEvidence({
  manifest,
  manifestSha256,
  phase1EvidenceLockSha256,
  summaries = {},
  reviewImages = new Map(),
  visualReviewReceipt = null,
  visualReviewReceiptBytes = null,
  visualReviewReceiptSha256 = null,
  visualReviewReceiptStable = true,
  contractFailures = [],
  phase1EvidenceLockStable = true,
  manifestStable = true,
  commitValid = true,
  nowMs = Date.now(),
} = {}) {
  const audit = {
    failures: new Set(),
    observedResults: [],
    passedGateIds: new Set(),
    passedVisualCaseIds: new Set(),
    componentSummaryCount: 0,
    commits: [],
  };
  if (!HASH_PATTERN.test(manifestSha256 ?? "")) addFailure(audit, "manifest_hash_invalid");
  if (!HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")) {
    addFailure(audit, "phase1_lock_hash_invalid");
  }
  if (!Array.isArray(contractFailures) || contractFailures.length !== 0) {
    addFailure(audit, "contract_set_invalid");
  }
  if (phase1EvidenceLockStable !== true) addFailure(audit, "phase1_lock_changed");
  if (manifestStable !== true) addFailure(audit, "manifest_changed");
  const inventory = validateManifest(manifest, audit);
  for (const [component, summaryPath] of Object.entries(PHASE2_COMPONENT_SUMMARY_PATHS)) {
    validateComponent({
      component,
      summary: summaries[component],
      expectedIds: inventory.gatesByEvidencePath.get(summaryPath) ?? [],
      expectedCases: inventory.visualCases,
      reviewImages,
      manifestSha256,
      phase1EvidenceLockSha256,
      nowMs,
      audit,
    });
  }
  const commits = audit.commits.filter((commit) => SHA_PATTERN.test(commit ?? ""));
  if (
    commits.length !== Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).length
    || new Set(commits).size !== 1
  ) addFailure(audit, "commit_mismatch");
  if (commitValid !== true) addFailure(audit, "commit_invalid");
  let visualReviewReceiptBytesValid = false;
  try {
    visualReviewReceiptBytesValid = (
      Buffer.isBuffer(visualReviewReceiptBytes)
      && sha256(visualReviewReceiptBytes) === visualReviewReceiptSha256
      && JSON.stringify(JSON.parse(visualReviewReceiptBytes.toString("utf8")))
        === JSON.stringify(visualReviewReceipt)
    );
  } catch {
    visualReviewReceiptBytesValid = false;
  }
  if (
    !HASH_PATTERN.test(visualReviewReceiptSha256 ?? "")
    || !visualReviewReceiptBytesValid
  ) {
    addFailure(audit, "visual_review_receipt_hash_invalid");
  }
  if (visualReviewReceiptStable !== true) {
    addFailure(audit, "visual_review_receipt_changed");
  }
  try {
    validatePhase2VisualReviewReceipt({
      receipt: visualReviewReceipt,
      visualCases: summaries?.visual?.visualCases,
      expectedCases: inventory.visualCases,
      commit: summaries?.visual?.commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      captureCheckedAt: summaries?.visual?.checkedAt,
      nowMs,
    });
  } catch {
    addFailure(audit, "visual_review_receipt_invalid");
  }
  const counts = buildCounts(audit, manifest, summaries);
  if (
    counts.targetGates !== 76
    || counts.passedGates !== 76
    || counts.missingResults !== 0
    || counts.duplicateResults !== 0
    || counts.extraResults !== 0
    || counts.skippedResults !== 0
    || counts.failedResults !== 0
    || counts.retriedResults !== 0
    || counts.flakyResults !== 0
  ) addFailure(audit, "gate_inventory_not_ready");
  if (
    counts.targetVisualCases !== 22
    || counts.passedVisualCases !== 22
    || counts.missingVisualCases !== 0
  ) addFailure(audit, "visual_inventory_not_ready");
  const failureCodes = uniqueSorted(audit.failures);
  const result = Object.freeze({
    ready: failureCodes.length === 0,
    failureCodes,
    commit: commits.length > 0 && new Set(commits).size === 1 ? commits[0] : null,
    counts: Object.freeze(counts),
  });
  if (result.ready) VERIFIED_READY_VALIDATIONS.add(result);
  return result;
}

export function buildPhase2AggregateSummary({
  checkedAt,
  validation,
  manifestSha256 = null,
  phase1EvidenceLockSha256 = null,
  componentSummarySha256 = {},
  reviewImageSha256 = [],
  visualReviewReceiptSha256 = null,
  nowMs = Date.now(),
} = {}) {
  const ready = validation?.ready === true && VERIFIED_READY_VALIDATIONS.has(validation);
  const summary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase2",
    status: ready ? "ready-for-review" : "not-ready",
    checkedAt: checkedAt instanceof Date && Number.isFinite(checkedAt.getTime())
      ? checkedAt.toISOString()
      : new Date(0).toISOString(),
    commit: validation?.commit ?? null,
    manifestSha256: HASH_PATTERN.test(manifestSha256 ?? "") ? manifestSha256 : null,
    phase1EvidenceLockSha256: HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")
      ? phase1EvidenceLockSha256
      : null,
    hashes: {
      componentSummarySha256: Object.fromEntries(
        Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).map((component) => [
          component,
          HASH_PATTERN.test(componentSummarySha256[component] ?? "")
            ? componentSummarySha256[component]
            : null,
        ]),
      ),
      reviewImageSha256: Array.isArray(reviewImageSha256)
        ? reviewImageSha256.filter((hash) => HASH_PATTERN.test(hash))
        : [],
      visualReviewReceiptSha256: HASH_PATTERN.test(visualReviewReceiptSha256 ?? "")
        ? visualReviewReceiptSha256
        : null,
    },
    checks: aggregateChecks(ready),
    counts: validation?.counts ?? {
      componentSummaries: 0,
      targetGates: 76,
      passedGates: 0,
      missingResults: 76,
      duplicateResults: 0,
      extraResults: 0,
      skippedResults: 0,
      failedResults: 0,
      retriedResults: 0,
      flakyResults: 0,
      targetVisualCases: 22,
      passedVisualCases: 0,
      missingVisualCases: 22,
      seriousOrCriticalAxeFindings: null,
      applicationConsoleErrors: null,
      unhandledRejections: null,
      horizontalOverflowPx: null,
      initialJsGzipBytes: null,
      largestRouteChunkGzipBytes: null,
      lcpP75Ms: null,
      inpP75Ms: null,
      cls: null,
    },
    failureCodes: ready
      ? []
      : uniqueSorted(validation?.failureCodes?.length
        ? validation.failureCodes
        : ["internal_check_failed"]),
  };
  validatePhase2AggregateSummary(summary, { nowMs });
  return summary;
}

export function validatePhase2AggregateSummary(summary, { nowMs = Date.now() } = {}) {
  const expectedKeys = [
    "schemaVersion",
    "check",
    "status",
    "checkedAt",
    "commit",
    "manifestSha256",
    "phase1EvidenceLockSha256",
    "hashes",
    "checks",
    "counts",
    "failureCodes",
  ];
  const checkedAtMs = Date.parse(summary?.checkedAt);
  if (
    !exactKeys(summary, expectedKeys)
    || summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase2"
    || !["ready-for-review", "not-ready"].includes(summary.status)
    || !exactKeys(summary.checks, AGGREGATE_CHECK_KEYS)
    || !exactKeys(summary.counts, AGGREGATE_COUNT_KEYS)
    || !Array.isArray(summary.failureCodes)
    || !exactKeys(summary.hashes, [
      "componentSummarySha256",
      "reviewImageSha256",
      "visualReviewReceiptSha256",
    ])
    || !exactKeys(
      summary.hashes.componentSummarySha256,
      Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS),
    )
    || !Array.isArray(summary.hashes.reviewImageSha256)
    || !Number.isFinite(checkedAtMs)
    || new Date(checkedAtMs).toISOString() !== summary.checkedAt
    || !Number.isFinite(nowMs)
    || checkedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAtMs > MAX_EVIDENCE_AGE_MS
  ) {
    throw new Error("Phase 2 aggregate output is invalid");
  }
  if (
    summary.status === "ready-for-review"
    && (
      !SHA_PATTERN.test(summary.commit ?? "")
      || !HASH_PATTERN.test(summary.manifestSha256 ?? "")
      || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256 ?? "")
      || summary.failureCodes.length !== 0
      || Object.values(summary.checks).some((value) => value !== true)
      || Object.values(summary.hashes.componentSummarySha256)
        .some((hash) => !HASH_PATTERN.test(hash ?? ""))
      || summary.hashes.reviewImageSha256.length !== 22
      || new Set(summary.hashes.reviewImageSha256).size !== 22
      || summary.hashes.reviewImageSha256.some((hash) => !HASH_PATTERN.test(hash))
      || !HASH_PATTERN.test(summary.hashes.visualReviewReceiptSha256 ?? "")
      || summary.counts.componentSummaries !== 6
      || summary.counts.targetGates !== 76
      || summary.counts.passedGates !== 76
      || summary.counts.missingResults !== 0
      || summary.counts.duplicateResults !== 0
      || summary.counts.extraResults !== 0
      || summary.counts.skippedResults !== 0
      || summary.counts.failedResults !== 0
      || summary.counts.retriedResults !== 0
      || summary.counts.flakyResults !== 0
      || summary.counts.targetVisualCases !== 22
      || summary.counts.passedVisualCases !== 22
      || summary.counts.missingVisualCases !== 0
      || summary.counts.seriousOrCriticalAxeFindings !== 0
      || summary.counts.applicationConsoleErrors !== 0
      || summary.counts.unhandledRejections !== 0
      || summary.counts.horizontalOverflowPx !== 0
      || !finiteNonNegative(summary.counts.initialJsGzipBytes)
      || !finiteNonNegative(summary.counts.largestRouteChunkGzipBytes)
      || !finiteNonNegative(summary.counts.lcpP75Ms)
      || !finiteNonNegative(summary.counts.inpP75Ms)
      || !finiteNonNegative(summary.counts.cls)
    )
  ) throw new Error("Phase 2 ready aggregate output is invalid");
  if (
    summary.status === "not-ready"
    && (
      summary.failureCodes.length === 0
      || summary.failureCodes.some((code) => !SAFE_CODE_PATTERN.test(code))
      || Object.values(summary.checks).some((value) => value !== false)
    )
  ) throw new Error("Phase 2 not-ready aggregate output is invalid");
  const serialized = JSON.stringify(summary);
  if (serialized.includes('"accepted"') || serialized.includes('"status":"accepted"')) {
    throw new Error("Phase 2 aggregate cannot self-accept");
  }
  return summary;
}

const securelyReadFile = async (
  root,
  relativePath,
  maximumBytes,
  { requiredMode } = {},
) => {
  if (!safeRelativePath(relativePath)) throw new Error("unsafe evidence path");
  const absolutePath = path.join(path.resolve(root), relativePath);
  const metadata = await lstat(absolutePath, { bigint: true });
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.nlink !== 1n
    || metadata.size <= 0n
    || metadata.size > BigInt(maximumBytes)
    || (
      requiredMode !== undefined
      && Number(metadata.mode & 0o777n) !== requiredMode
    )
    || typeof fsConstants.O_NOFOLLOW !== "number"
  ) throw new Error("evidence file is not a bounded regular file");
  const handle = await open(
    absolutePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (metadata[key] !== before[key]) throw new Error("evidence file changed before reading");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[key] !== after[key]) throw new Error("evidence file changed while reading");
    }
    return bytes;
  } finally {
    await handle.close();
  }
};

const securelyReadJson = async (root, relativePath, options) => {
  const bytes = await securelyReadFile(root, relativePath, MAX_JSON_BYTES, options);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
};

const jpegDimensions = (bytes) => {
  if (
    !Buffer.isBuffer(bytes)
    || bytes.length < 12
    || bytes[0] !== 0xff
    || bytes[1] !== 0xd8
  ) throw new Error("review image is not a JPEG");
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0x01) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrameMarkers.has(marker)) {
      if (length < 7) break;
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw new Error("review JPEG dimensions are unavailable");
};

const verifyCommit = async (root, commit, expectedApplicationCommit) => {
  if (
    !SHA_PATTERN.test(commit ?? "")
    || !SHA_PATTERN.test(expectedApplicationCommit ?? "")
    || commit !== expectedApplicationCommit
  ) return false;
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/git",
      ["rev-parse", "--verify", `${commit}^{commit}`],
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
      },
    );
    if (stdout.trim() !== commit) return false;
    return true;
  } catch {
    return false;
  }
};

export async function calculateFrontendUpgradePhase2Aggregate({
  root = defaultRoot,
  nowMs = Date.now(),
  summaryCheckedAtMs = nowMs,
  expectedApplicationCommit,
} = {}) {
  root = path.resolve(root);
  const checkedAt = new Date(summaryCheckedAtMs);
  if (!Number.isFinite(checkedAt.getTime())) throw new Error("invalid aggregate check time");
  const contractFailures = [];
  try {
    contractFailures.push(...await checkPhase2ContractSet({ root, headRef: "HEAD" }));
  } catch {
    contractFailures.push("unable to validate Phase 2 contracts");
  }

  let manifest = null;
  let manifestBefore = null;
  let manifestSha256 = null;
  let phase1EvidenceLockSha256 = null;
  let phase1LockBefore = null;
  let visualReviewReceipt = null;
  let visualReviewReceiptBefore = null;
  let visualReviewReceiptSha256 = null;
  try {
    const loadedManifest = await securelyReadJson(root, PHASE2_ACCEPTANCE_MANIFEST_PATH);
    manifest = loadedManifest.value;
    manifestBefore = loadedManifest.bytes;
    manifestSha256 = sha256(loadedManifest.bytes);
  } catch {
    contractFailures.push("unable to read Phase 2 acceptance manifest");
  }
  try {
    phase1LockBefore = await securelyReadFile(
      root,
      PHASE1_EVIDENCE_LOCK_PATH,
      MAX_JSON_BYTES,
    );
    phase1EvidenceLockSha256 = sha256(phase1LockBefore);
  } catch {
    contractFailures.push("unable to read Phase 1 evidence lock");
  }
  try {
    const loadedReceipt = await securelyReadJson(
      root,
      PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
      { requiredMode: 0o644 },
    );
    visualReviewReceipt = loadedReceipt.value;
    visualReviewReceiptBefore = loadedReceipt.bytes;
    visualReviewReceiptSha256 = sha256(loadedReceipt.bytes);
  } catch {
    contractFailures.push("unable to read Phase 2 visual review receipt");
  }

  const summaries = {};
  const componentSummarySha256 = {};
  for (const [component, relativePath] of Object.entries(PHASE2_COMPONENT_SUMMARY_PATHS)) {
    try {
      const loaded = await securelyReadJson(root, relativePath);
      summaries[component] = loaded.value;
      componentSummarySha256[component] = sha256(loaded.bytes);
    } catch {
      summaries[component] = null;
      componentSummarySha256[component] = null;
    }
  }

  const reviewImages = new Map();
  const reviewImageSha256 = [];
  for (const visualCase of manifest?.finalVisualCases ?? []) {
    try {
      if (
        typeof visualCase.evidencePath !== "string"
        || !visualCase.evidencePath.startsWith(
          "docs/browser-audit-screenshots/"
          + "390-frontend-upgrade-phase-2-review/",
        )
      ) throw new Error("review image path is outside the Phase 2 namespace");
      const bytes = await securelyReadFile(
        root,
        visualCase.evidencePath,
        MAX_REVIEW_IMAGE_BYTES,
      );
      const dimensions = jpegDimensions(bytes);
      const digest = sha256(bytes);
      reviewImages.set(visualCase.evidencePath, {
        ...dimensions,
        sha256: digest,
      });
      reviewImageSha256.push(digest);
    } catch {
      // The validator records a deterministic missing-image failure.
    }
  }

  let phase1EvidenceLockStable = false;
  let manifestStable = false;
  let visualReviewReceiptStable = false;
  try {
    const afterFailures = await checkPhase2ContractSet({ root, headRef: "HEAD" });
    contractFailures.push(...afterFailures);
    const [manifestAfter, phase1LockAfter, visualReviewReceiptAfter] = await Promise.all([
      securelyReadFile(root, PHASE2_ACCEPTANCE_MANIFEST_PATH, MAX_JSON_BYTES),
      securelyReadFile(root, PHASE1_EVIDENCE_LOCK_PATH, MAX_JSON_BYTES),
      securelyReadFile(
        root,
        PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
        MAX_JSON_BYTES,
        { requiredMode: 0o644 },
      ),
    ]);
    manifestStable = (
      Buffer.isBuffer(manifestBefore)
      && manifestBefore.equals(manifestAfter)
    );
    phase1EvidenceLockStable = (
      Buffer.isBuffer(phase1LockBefore)
      && phase1LockBefore.equals(phase1LockAfter)
    );
    visualReviewReceiptStable = (
      Buffer.isBuffer(visualReviewReceiptBefore)
      && visualReviewReceiptBefore.equals(visualReviewReceiptAfter)
    );
  } catch {
    contractFailures.push("unable to revalidate Phase 1 evidence lock");
  }

  const candidateCommits = Object.values(summaries)
    .map((summary) => summary?.commit)
    .filter((commit) => SHA_PATTERN.test(commit ?? ""));
  const candidateCommit = candidateCommits.length > 0
    && new Set(candidateCommits).size === 1
    ? candidateCommits[0]
    : null;
  const validation = validatePhase2AggregateEvidence({
    manifest,
    manifestSha256,
    phase1EvidenceLockSha256,
    summaries,
    reviewImages,
    visualReviewReceipt,
    visualReviewReceiptBytes: visualReviewReceiptBefore,
    visualReviewReceiptSha256,
    visualReviewReceiptStable,
    contractFailures,
    phase1EvidenceLockStable,
    manifestStable,
    commitValid: candidateCommit
      ? await verifyCommit(root, candidateCommit, expectedApplicationCommit)
      : false,
    nowMs,
  });
  const summary = buildPhase2AggregateSummary({
    checkedAt,
    validation,
    manifestSha256,
    phase1EvidenceLockSha256,
    componentSummarySha256,
    reviewImageSha256,
    visualReviewReceiptSha256,
    nowMs,
  });
  return {
    output: path.join(root, PHASE2_AGGREGATE_SUMMARY_RELATIVE),
    summary,
  };
}

export function assertTrackedPhase2Aggregate({
  trackedBytes,
  recalculatedSummary,
  nowMs = Date.now(),
} = {}) {
  if (!Buffer.isBuffer(trackedBytes) || trackedBytes.length === 0) {
    throw new Error("tracked Phase 2 aggregate is missing");
  }
  let trackedSummary;
  try {
    trackedSummary = JSON.parse(trackedBytes.toString("utf8"));
  } catch {
    throw new Error("tracked Phase 2 aggregate is invalid JSON");
  }
  validatePhase2AggregateSummary(trackedSummary, { nowMs });
  validatePhase2AggregateSummary(recalculatedSummary, { nowMs });
  const recalculatedBytes = Buffer.from(`${JSON.stringify(recalculatedSummary, null, 2)}\n`);
  if (!trackedBytes.equals(recalculatedBytes)) {
    throw new Error("tracked Phase 2 aggregate does not match exact recalculation");
  }
  return trackedSummary;
}

const assertEvidenceOutputsUnmodified = (provenance) => {
  const evidenceSet = new Set(provenance?.evidenceOutputs ?? []);
  const dirty = (provenance?.statusEntries ?? []).filter((entry) => (
    evidenceSet.has(entry.path)
  ));
  if (dirty.length > 0) {
    throw new Error("Phase 2 aggregate checker requires tracked, unmodified evidence");
  }
};

export async function runFrontendUpgradePhase2Check({
  root = defaultRoot,
  nowMs = Date.now(),
} = {}) {
  root = path.resolve(root);
  const lifecycle = await classifyPhase2EvidenceLifecycle({ root });
  if (lifecycle.state !== "evidence") {
    throw new Error("Phase 2 aggregate checker requires the exact evidence lifecycle state");
  }
  const before = await capturePhase2EvidenceProvenance({ root });
  if (before.applicationCommit !== lifecycle.applicationCommit) {
    throw new Error("Phase 2 aggregate lifecycle and provenance are inconsistent");
  }
  assertEvidenceOutputsUnmodified(before);
  const trackedBytes = await securelyReadFile(
    root,
    PHASE2_AGGREGATE_SUMMARY_RELATIVE,
    MAX_JSON_BYTES,
    { requiredMode: 0o644 },
  );
  let trackedCheckedAtMs;
  try {
    trackedCheckedAtMs = Date.parse(JSON.parse(trackedBytes.toString("utf8")).checkedAt);
  } catch {
    throw new Error("tracked Phase 2 aggregate is invalid JSON");
  }
  const result = await calculateFrontendUpgradePhase2Aggregate({
    root,
    nowMs,
    summaryCheckedAtMs: trackedCheckedAtMs,
    expectedApplicationCommit: before.applicationCommit,
  });
  if (result.summary.status !== "ready-for-review") {
    throw new Error(
      `tracked Phase 2 evidence is not ready: ${result.summary.failureCodes.join(",")}`,
    );
  }
  const trackedSummary = assertTrackedPhase2Aggregate({
    trackedBytes,
    recalculatedSummary: result.summary,
    nowMs,
  });
  const afterBytes = await securelyReadFile(
    root,
    PHASE2_AGGREGATE_SUMMARY_RELATIVE,
    MAX_JSON_BYTES,
    { requiredMode: 0o644 },
  );
  if (!trackedBytes.equals(afterBytes)) {
    throw new Error("tracked Phase 2 aggregate changed during read-only validation");
  }
  const after = await capturePhase2EvidenceProvenance({ root });
  assertEvidenceOutputsUnmodified(after);
  assertPhase2EvidenceProvenanceStable(before, after);
  return {
    output: result.output,
    summary: trackedSummary,
  };
}

const parseArguments = (argumentsList) => {
  let root = defaultRoot;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory");
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${argument}`);
  }
  return { root };
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await runFrontendUpgradePhase2Check(
      parseArguments(process.argv.slice(2)),
    );
    console.log(JSON.stringify(result.summary, null, 2));
    if (result.summary.status !== "ready-for-review") process.exitCode = 1;
  } catch {
    console.error("FAIL: frontend upgrade Phase 2 aggregate check failed");
    process.exitCode = 1;
  }
}
