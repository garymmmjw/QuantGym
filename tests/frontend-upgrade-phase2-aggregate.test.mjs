import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE2_COMPONENT_SUMMARY_PATHS,
  assertTrackedPhase2Aggregate,
  buildPhase2AggregateSummary,
  validatePhase2AggregateEvidence,
  validatePhase2AggregateSummary,
} from "../scripts/check-frontend-upgrade-phase2.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(
  path.join(root, "docs/frontend-upgrade/phase-2-acceptance-manifest.json"),
  "utf8",
));
const nowMs = Date.parse("2026-07-27T12:00:00.000Z");
const checkedAt = "2026-07-27T11:55:00.000Z";
const commit = "c".repeat(40);
const manifestSha256 = "a".repeat(64);
const phase1EvidenceLockSha256 = "b".repeat(64);

const requiredChecks = {
  contract: [
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
  ],
  visual: [
    "visualMatrixPassed",
    "originalDimensionsInspected",
    "noSkeletons",
    "noLegacyFrames",
    "brandAssetsPresent",
    "noClipping",
    "chineseEnglishOverflowPassed",
    "reducedMotionPassed",
  ],
  accessibility: [
    "axePassed",
    "keyboardJourneysPassed",
    "mobileTargetsPassed",
    "focusPassed",
  ],
  journeys: [
    "dailyLoopPassed",
    "singleRewardPassed",
    "planUpdated",
    "overviewUpdated",
    "consolePassed",
    "rejectionsPassed",
    "overflowPassed",
  ],
  recovery: [
    "allGatesPassed",
    "noSkippedResults",
    "noRetriedResults",
    "noFlakyResults",
    "idempotencyPassed",
  ],
  performance: [
    "bundleBudgetsPassed",
    "webVitalsPassed",
    "overflowPassed",
  ],
};

const checkNames = {
  contract: "frontend-upgrade-phase2-contracts",
  visual: "frontend-upgrade-phase2-visual",
  accessibility: "frontend-upgrade-phase2-accessibility",
  journeys: "frontend-upgrade-phase2-journeys",
  recovery: "frontend-upgrade-phase2-recovery",
  performance: "frontend-upgrade-phase2-performance",
};

const metrics = {
  contract: {
    commandCount: 21,
    apiPytestTests: 480,
  },
  visual: {},
  accessibility: {
    seriousOrCriticalAxeFindings: 0,
    keyboardJourneyFailures: 0,
    mobileTargetFailures: 0,
    focusFailures: 0,
  },
  journeys: {
    applicationConsoleErrors: 0,
    unhandledRejections: 0,
    pageErrors: 0,
    failedFirstPartyRequests: 0,
    horizontalOverflowPx: 0,
  },
  recovery: { retryIdempotencyGateCount: 1 },
  performance: {
    initialJsGzipBytes: 100 * 1024,
    initialJsBudgetBytes: 180 * 1024,
    largestRouteChunkGzipBytes: 80 * 1024,
    routeChunkBudgetBytes: 100 * 1024,
    lcpP75Ms: 1800,
    lcpTargetMs: 2500,
    inpP75Ms: 120,
    inpTargetMs: 200,
    cls: 0.04,
    clsTarget: 0.1,
    horizontalOverflowPx: 0,
  },
};

const resultCounts = (results) => ({
  resultCount: results.length,
  skippedResultCount: results.filter((result) => result.skipped).length,
  failedResultCount: results.filter((result) => result.status !== "pass").length,
  retriedResultCount: results.filter((result) => result.retried).length,
  flakyResultCount: results.filter((result) => result.flaky).length,
});

const hashFor = (value) => createHash("sha256").update(value).digest("hex");

const createVisualReviewReceipt = (visualCases) => ({
  schemaVersion: 1,
  kind: "frontend-upgrade-phase2-visual-review-receipt",
  status: "attested",
  reviewer: "Phase 2 independent reviewer",
  reviewedAt: "2026-07-27T11:57:00.000Z",
  reviewMethod: "original-resolution-visual-inspection",
  applicationCommit: commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  images: visualCases.map((visualCase) => ({
    id: visualCase.id,
    evidencePath: visualCase.evidencePath,
    sha256: visualCase.sha256,
    width: visualCase.width,
    height: visualCase.height,
    originalDimensionsInspected: true,
  })),
});

const createValidFixture = () => {
  const summaries = {};
  const reviewImages = new Map();
  for (const [component, evidencePath] of Object.entries(PHASE2_COMPONENT_SUMMARY_PATHS)) {
    const results = manifest.gates
      .filter((gate) => gate.phase2EvidencePath === evidencePath)
      .map((gate) => ({
        id: gate.id,
        status: "pass",
        skipped: false,
        retried: false,
        flaky: false,
      }));
    const visualCases = component === "visual"
      ? manifest.finalVisualCases.map((visualCase) => {
        const digest = hashFor(visualCase.id);
        reviewImages.set(visualCase.evidencePath, {
          sha256: digest,
          width: visualCase.viewport.width,
          height: visualCase.viewport.height,
        });
        return {
          id: visualCase.id,
          status: "pass",
          evidencePath: visualCase.evidencePath,
          sha256: digest,
          width: visualCase.viewport.width,
          height: visualCase.viewport.height,
          skipped: false,
          retried: false,
          flaky: false,
        };
      })
      : [];
    summaries[component] = {
      schemaVersion: 1,
      check: checkNames[component],
      status: "pass",
      checkedAt,
      commit,
      manifestSha256,
      phase1EvidenceLockSha256,
      results,
      visualCases,
      checks: Object.fromEntries(requiredChecks[component].map((key) => [key, true])),
      counts: resultCounts(results),
      metrics: structuredClone(metrics[component]),
      failureCodes: [],
    };
  }
  const visualReviewReceipt = createVisualReviewReceipt(summaries.visual.visualCases);
  const visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(visualReviewReceipt, null, 2)}\n`,
  );
  return {
    summaries,
    reviewImages,
    visualReviewReceipt,
    visualReviewReceiptBytes,
    visualReviewReceiptSha256: hashFor(visualReviewReceiptBytes),
  };
};

const validate = ({
  fixture = createValidFixture(),
  sourceManifest = manifest,
  contractFailures = [],
  phase1EvidenceLockStable = true,
  commitValid = true,
} = {}) => validatePhase2AggregateEvidence({
  manifest: sourceManifest,
  manifestSha256,
  phase1EvidenceLockSha256,
  summaries: fixture.summaries,
  reviewImages: fixture.reviewImages,
  visualReviewReceipt: fixture.visualReviewReceipt,
  visualReviewReceiptBytes: fixture.visualReviewReceiptBytes,
  visualReviewReceiptSha256: fixture.visualReviewReceiptSha256,
  contractFailures,
  phase1EvidenceLockStable,
  commitValid,
  nowMs,
});

test("accepts exactly 76 passing IDs, 22 inspected visuals, aligned commits, and locked budgets", () => {
  const validation = validate();
  assert.deepEqual(validation.failureCodes, []);
  assert.equal(validation.ready, true);
  assert.equal(validation.commit, commit);
  assert.equal(validation.counts.componentSummaries, 6);
  assert.equal(validation.counts.targetGates, 76);
  assert.equal(validation.counts.passedGates, 76);
  assert.equal(validation.counts.targetVisualCases, 22);
  assert.equal(validation.counts.passedVisualCases, 22);
  assert.equal(validation.counts.seriousOrCriticalAxeFindings, 0);
  assert.equal(validation.counts.applicationConsoleErrors, 0);
  assert.equal(validation.counts.unhandledRejections, 0);
});

test("reuses complete component validators and rejects semantically incomplete pass summaries", () => {
  const mutations = [
    ["contract", (summary) => { summary.metrics.apiPytestTests = 479; }],
    ["visual", (summary) => { summary.metrics.unreviewedVisualCases = 0; }],
    ["accessibility", (summary) => { delete summary.metrics.keyboardJourneyFailures; }],
    ["journeys", (summary) => { delete summary.metrics.failedFirstPartyRequests; }],
    ["recovery", (summary) => { summary.metrics.retryIdempotencyGateCount = 0; }],
    ["performance", (summary) => { delete summary.metrics.horizontalOverflowPx; }],
  ];
  for (const [component, mutate] of mutations) {
    const fixture = createValidFixture();
    mutate(fixture.summaries[component]);
    const validation = validate({ fixture });
    assert.equal(validation.ready, false, component);
    assert.ok(
      validation.failureCodes.includes(`${component}_summary_semantics_invalid`),
      component,
    );
  }
});

test("rejects an ancestor component commit when it is not the exact frozen application commit", () => {
  const validation = validate({ commitValid: false });
  assert.equal(validation.ready, false);
  assert.equal(validation.commit, commit);
  assert.ok(validation.failureCodes.includes("commit_invalid"));
});

test("builds ready-for-review only from a fully valid result and never self-accepts", () => {
  const fixture = createValidFixture();
  const validation = validate({ fixture });
  const summary = buildPhase2AggregateSummary({
    checkedAt: new Date(nowMs),
    validation,
    manifestSha256,
    phase1EvidenceLockSha256,
    componentSummarySha256: Object.fromEntries(
      Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).map((key) => [key, hashFor(key)]),
    ),
    reviewImageSha256: manifest.finalVisualCases.map(({ id }) => hashFor(id)),
    visualReviewReceiptSha256: fixture.visualReviewReceiptSha256,
  });
  assert.equal(summary.status, "ready-for-review");
  assert.equal(summary.failureCodes.length, 0);
  assert.equal(JSON.stringify(summary).includes('"accepted"'), false);
  assert.equal(validatePhase2AggregateSummary(summary), summary);
});

test("read-only aggregate matching rejects stale, tampered, and non-canonical tracked bytes", () => {
  const fixture = createValidFixture();
  const summary = buildPhase2AggregateSummary({
    checkedAt: new Date(nowMs),
    validation: validate({ fixture }),
    manifestSha256,
    phase1EvidenceLockSha256,
    componentSummarySha256: Object.fromEntries(
      Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).map((key) => [key, hashFor(key)]),
    ),
    reviewImageSha256: manifest.finalVisualCases.map(({ id }) => hashFor(id)),
    visualReviewReceiptSha256: fixture.visualReviewReceiptSha256,
    nowMs,
  });
  const canonical = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
  assert.equal(assertTrackedPhase2Aggregate({
    trackedBytes: canonical,
    recalculatedSummary: summary,
    nowMs,
  }).status, "ready-for-review");

  const tampered = structuredClone(summary);
  tampered.hashes.componentSummarySha256.contract = "f".repeat(64);
  assert.throws(
    () => assertTrackedPhase2Aggregate({
      trackedBytes: Buffer.from(`${JSON.stringify(tampered, null, 2)}\n`),
      recalculatedSummary: summary,
      nowMs,
    }),
    /does not match exact recalculation/u,
  );
  assert.throws(
    () => assertTrackedPhase2Aggregate({
      trackedBytes: Buffer.from(JSON.stringify(summary)),
      recalculatedSummary: summary,
      nowMs,
    }),
    /does not match exact recalculation/u,
  );
  assert.throws(
    () => assertTrackedPhase2Aggregate({
      trackedBytes: canonical,
      recalculatedSummary: summary,
      nowMs: Date.parse("2026-08-10T00:00:00.000Z"),
    }),
    /aggregate output is invalid/u,
  );
});

test("cannot forge ready-for-review by passing a hand-written validation object", () => {
  const fixture = createValidFixture();
  const forged = buildPhase2AggregateSummary({
    checkedAt: new Date(nowMs),
    validation: {
      ready: true,
      commit,
      counts: validate({ fixture }).counts,
      failureCodes: [],
    },
    manifestSha256,
    phase1EvidenceLockSha256,
    componentSummarySha256: Object.fromEntries(
      Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).map((key) => [key, hashFor(key)]),
    ),
    reviewImageSha256: manifest.finalVisualCases.map(({ id }) => hashFor(id)),
    visualReviewReceiptSha256: fixture.visualReviewReceiptSha256,
  });
  assert.equal(forged.status, "not-ready");
  assert.deepEqual(forged.failureCodes, ["internal_check_failed"]);
});

test("ready aggregate validator rejects stale time and incomplete zero-outcome counts", () => {
  const fixture = createValidFixture();
  const validation = validate({ fixture });
  const summary = buildPhase2AggregateSummary({
    checkedAt: new Date(nowMs),
    validation,
    manifestSha256,
    phase1EvidenceLockSha256,
    componentSummarySha256: Object.fromEntries(
      Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS).map((key) => [key, hashFor(key)]),
    ),
    reviewImageSha256: manifest.finalVisualCases.map(({ id }) => hashFor(id)),
    visualReviewReceiptSha256: fixture.visualReviewReceiptSha256,
  });
  assert.throws(
    () => validatePhase2AggregateSummary({
      ...summary,
      checkedAt: "2026-07-01T00:00:00.000Z",
    }),
    /aggregate output is invalid/u,
  );
  assert.throws(
    () => validatePhase2AggregateSummary({
      ...summary,
      counts: { ...summary.counts, skippedResults: 1 },
    }),
    /ready aggregate output is invalid/u,
  );
});

test("missing current evidence produces deterministic not-ready output", () => {
  const emptyFixture = { summaries: {}, reviewImages: new Map() };
  const first = validate({
    fixture: emptyFixture,
    contractFailures: ["current contract input is incomplete"],
    phase1EvidenceLockStable: false,
    commitValid: false,
  });
  const second = validate({
    fixture: emptyFixture,
    contractFailures: ["different human-readable detail"],
    phase1EvidenceLockStable: false,
    commitValid: false,
  });
  assert.equal(first.ready, false);
  assert.deepEqual(first.failureCodes, second.failureCodes);
  assert.deepEqual(first.failureCodes, [
    "accessibility_summary_missing",
    "commit_invalid",
    "commit_mismatch",
    "contract_set_invalid",
    "contract_summary_missing",
    "gate_inventory_not_ready",
    "journeys_summary_missing",
    "performance_summary_missing",
    "phase1_lock_changed",
    "recovery_summary_missing",
    "visual_inventory_not_ready",
    "visual_review_receipt_hash_invalid",
    "visual_review_receipt_invalid",
    "visual_summary_missing",
  ]);
  const summary = buildPhase2AggregateSummary({
    checkedAt: new Date(nowMs),
    validation: first,
    manifestSha256,
    phase1EvidenceLockSha256,
  });
  assert.equal(summary.status, "not-ready");
  assert.equal(summary.counts.passedGates, 0);
  assert.equal(summary.counts.missingResults, 76);
  assert.equal(summary.counts.passedVisualCases, 0);
  assert.equal(summary.counts.missingVisualCases, 22);
});

test("rejects missing, duplicate, extra, skipped, retried, flaky, failed, and commit-mismatched results", () => {
  const fixture = createValidFixture();
  fixture.summaries.visual.results[0].skipped = true;
  fixture.summaries.visual.counts = resultCounts(fixture.summaries.visual.results);
  fixture.summaries.accessibility.results[0].flaky = true;
  fixture.summaries.accessibility.counts = resultCounts(
    fixture.summaries.accessibility.results,
  );
  fixture.summaries.journeys.results[0].retried = true;
  fixture.summaries.journeys.commit = "d".repeat(40);
  fixture.summaries.journeys.counts = resultCounts(fixture.summaries.journeys.results);
  fixture.summaries.recovery.results[0].status = "failed";
  fixture.summaries.recovery.results.pop();
  fixture.summaries.recovery.results.push(
    structuredClone(fixture.summaries.recovery.results[1]),
  );
  fixture.summaries.recovery.results.push({
    id: "mutation:phase2:extra-result",
    status: "pass",
    skipped: false,
    retried: false,
    flaky: false,
  });
  fixture.summaries.recovery.counts = resultCounts(fixture.summaries.recovery.results);
  fixture.summaries.recovery.counts.retryAttempts = 1;

  const validation = validate({ fixture });
  assert.equal(validation.ready, false);
  for (const code of [
    "commit_mismatch",
    "component_count_mismatch",
    "duplicate_result",
    "extra_result",
    "failed_result",
    "flaky_result",
    "gate_inventory_not_ready",
    "missing_result",
    "retried_result",
    "skipped_result",
  ]) {
    assert.ok(validation.failureCodes.includes(code), code);
  }
});

test("rejects todo, xfail, xpass, fixme, and pending counters even when results say pass", () => {
  for (const key of ["todoCount", "xfailCount", "xpassCount", "fixmeCount", "pendingCount"]) {
    const fixture = createValidFixture();
    fixture.summaries.recovery.counts[key] = 1;
    const validation = validate({ fixture });
    assert.equal(validation.ready, false, key);
    assert.ok(validation.failureCodes.includes("component_count_mismatch"), key);
  }
});

test("rejects visual substitution, axe findings, overflow, and performance budget regressions", () => {
  const fixture = createValidFixture();
  const firstVisual = fixture.summaries.visual.visualCases[0];
  fixture.reviewImages.set(firstVisual.evidencePath, {
    sha256: hashFor("substituted image"),
    width: firstVisual.width,
    height: firstVisual.height,
  });
  fixture.summaries.accessibility.metrics.seriousOrCriticalAxeFindings = 1;
  fixture.summaries.journeys.metrics.horizontalOverflowPx = 1;
  fixture.summaries.performance.metrics.initialJsGzipBytes = 181 * 1024;
  fixture.summaries.performance.metrics.lcpP75Ms = 2501;

  const validation = validate({ fixture });
  assert.equal(validation.ready, false);
  for (const code of [
    "accessibility_failed",
    "horizontal_overflow_detected",
    "performance_budget_failed",
    "review_image_mismatch",
    "visual_inventory_not_ready",
  ]) {
    assert.ok(validation.failureCodes.includes(code), code);
  }
});

test("rejects a rewritten manifest or an incomplete 30-output inventory", () => {
  const rewritten = structuredClone(manifest);
  rewritten.evidenceOutputs.pop();
  rewritten.activationPolicy.retriedResultAllowed = true;
  rewritten.gates[0].phase2RequiredResultStatus = "legacy-baseline";
  const validation = validate({ sourceManifest: rewritten });
  assert.equal(validation.ready, false);
  assert.ok(validation.failureCodes.includes("evidence_output_inventory_invalid"));
  assert.ok(validation.failureCodes.includes("manifest_gate_invalid"));
  assert.ok(validation.failureCodes.includes("manifest_policy_invalid"));
});

test("requires a fresh independently bound 22-image visual review receipt", () => {
  const missing = createValidFixture();
  missing.visualReviewReceipt = null;
  missing.visualReviewReceiptBytes = null;
  missing.visualReviewReceiptSha256 = null;
  const missingValidation = validate({ fixture: missing });
  assert.ok(missingValidation.failureCodes.includes("visual_review_receipt_invalid"));
  assert.ok(missingValidation.failureCodes.includes("visual_review_receipt_hash_invalid"));

  const substituted = createValidFixture();
  substituted.visualReviewReceipt.images[0].sha256 = hashFor("receipt substitution");
  substituted.visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(substituted.visualReviewReceipt, null, 2)}\n`,
  );
  substituted.visualReviewReceiptSha256 = hashFor(substituted.visualReviewReceiptBytes);
  assert.ok(validate({ fixture: substituted }).failureCodes.includes(
    "visual_review_receipt_invalid",
  ));

  const wrongLock = createValidFixture();
  wrongLock.visualReviewReceipt.phase1EvidenceLockSha256 = "f".repeat(64);
  wrongLock.visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(wrongLock.visualReviewReceipt, null, 2)}\n`,
  );
  wrongLock.visualReviewReceiptSha256 = hashFor(wrongLock.visualReviewReceiptBytes);
  assert.ok(validate({ fixture: wrongLock }).failureCodes.includes(
    "visual_review_receipt_invalid",
  ));

  const changed = createValidFixture();
  const changedValidation = validatePhase2AggregateEvidence({
    manifest,
    manifestSha256,
    phase1EvidenceLockSha256,
    summaries: changed.summaries,
    reviewImages: changed.reviewImages,
    visualReviewReceipt: changed.visualReviewReceipt,
    visualReviewReceiptBytes: changed.visualReviewReceiptBytes,
    visualReviewReceiptSha256: changed.visualReviewReceiptSha256,
    visualReviewReceiptStable: false,
    nowMs,
  });
  assert.ok(changedValidation.failureCodes.includes("visual_review_receipt_changed"));
});
