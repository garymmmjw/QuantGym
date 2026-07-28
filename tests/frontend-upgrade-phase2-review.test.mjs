import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE2_COMPONENT_SUMMARY_PATHS,
  buildPhase2AggregateSummary,
  validatePhase2AggregateEvidence,
} from "../scripts/check-frontend-upgrade-phase2.mjs";
import {
  runPhase2PreviewCutover,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-orchestrator.mjs";
import {
  createPhase2CutoverDryRunFixture,
  createPhase2CutoverFixtureClock,
  createPhase2CutoverFixtureCredentialRoles,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-fixture.mjs";
import {
  PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
} from "../scripts/lib/frontend-upgrade-phase2-provider-evidence.mjs";
import {
  PHASE2_REVIEW_PATH,
  TEST_ONLY_PHASE2_REVIEW,
  buildFrontendUpgradePhase2Review,
  checkFrontendUpgradePhase2Review,
  renderPhase2ReviewDocument,
  validatePhase2ReviewDocument,
  validatePhase2ReviewPrerequisites,
} from "../scripts/lib/frontend-upgrade-phase2-review.mjs";

process.env.NODE_ENV = "test";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/frontend-upgrade/phase-2-acceptance-manifest.json"),
  "utf8",
));
const COMMIT = "c".repeat(40);
const NOW = new Date("2026-07-27T02:00:00.000Z");
const COMPONENT_CHECKED_AT = "2026-07-27T01:55:00.000Z";
const AGGREGATE_CHECKED_AT = new Date("2026-07-27T01:58:00.000Z");
const PROVIDER_CAPTURED_AT = NOW.toISOString();
const PROVIDER_EXPIRES_AT = new Date(
  NOW.getTime() + 7 * 24 * 60 * 60 * 1_000,
).toISOString();
const HASH = (value) => createHash("sha256").update(value).digest("hex");
const MANIFEST_SHA256 = HASH("phase2-manifest");
const PHASE1_LOCK_SHA256 = HASH("phase1-lock");

const requiredChecks = Object.freeze({
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
  performance: ["bundleBudgetsPassed", "webVitalsPassed", "overflowPassed"],
});

const checkNames = Object.freeze({
  contract: "frontend-upgrade-phase2-contracts",
  visual: "frontend-upgrade-phase2-visual",
  accessibility: "frontend-upgrade-phase2-accessibility",
  journeys: "frontend-upgrade-phase2-journeys",
  recovery: "frontend-upgrade-phase2-recovery",
  performance: "frontend-upgrade-phase2-performance",
});

const metrics = Object.freeze({
  contract: {
    commandCount: 20,
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
});

const resultCounts = (results) => ({
  resultCount: results.length,
  skippedResultCount: results.filter((result) => result.skipped).length,
  failedResultCount: results.filter((result) => result.status !== "pass").length,
  retriedResultCount: results.filter((result) => result.retried).length,
  flakyResultCount: results.filter((result) => result.flaky).length,
});

const createLocalEvidence = () => {
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
        const digest = HASH(`review-image:${visualCase.id}`);
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
      checkedAt: COMPONENT_CHECKED_AT,
      commit: COMMIT,
      manifestSha256: MANIFEST_SHA256,
      phase1EvidenceLockSha256: PHASE1_LOCK_SHA256,
      results,
      visualCases,
      checks: Object.fromEntries(requiredChecks[component].map((key) => [key, true])),
      counts: resultCounts(results),
      metrics: structuredClone(metrics[component]),
      failureCodes: [],
    };
  }
  return { summaries, reviewImages };
};

const providerFacts = () => runPhase2PreviewCutover({
  mode: "dry-run",
  expectedCommit: COMMIT,
  actions: createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }),
  credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
  clock: createPhase2CutoverFixtureClock(),
});

const createProviderEvidence = async () => ({
  schemaVersion: 1,
  phase: 2,
  status: "pass",
  capturedAt: PROVIDER_CAPTURED_AT,
  expiresAt: PROVIDER_EXPIRES_AT,
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  applicationCommit: COMMIT,
  governance: {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  },
  capture: {
    authenticated: true,
    inputSource: "operator-environment",
    rawResponsesPersisted: false,
    journalTrustBoundary: structuredClone(
      PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
    ),
  },
  ...await providerFacts(),
});

const createVisualReviewReceipt = (visualCases) => ({
  schemaVersion: 1,
  kind: "frontend-upgrade-phase2-visual-review-receipt",
  status: "attested",
  reviewer: "Phase 2 independent reviewer",
  reviewedAt: "2026-07-27T01:57:00.000Z",
  reviewMethod: "original-resolution-visual-inspection",
  applicationCommit: COMMIT,
  manifestSha256: MANIFEST_SHA256,
  phase1EvidenceLockSha256: PHASE1_LOCK_SHA256,
  images: visualCases.map((visualCase) => ({
    id: visualCase.id,
    evidencePath: visualCase.evidencePath,
    sha256: visualCase.sha256,
    width: visualCase.width,
    height: visualCase.height,
    originalDimensionsInspected: true,
  })),
});

const createInputs = async ({ mutateLocal } = {}) => {
  const local = createLocalEvidence();
  mutateLocal?.(local);
  const componentSummarySha256 = Object.fromEntries(
    Object.entries(local.summaries).map(([component, summary]) => [
      component,
      HASH(`${JSON.stringify(summary, null, 2)}\n`),
    ]),
  );
  const reviewImageSha256 = manifest.finalVisualCases.map((visualCase) => (
    local.reviewImages.get(visualCase.evidencePath)?.sha256
  )).filter(Boolean);
  const visualReviewReceipt = createVisualReviewReceipt(
    local.summaries.visual?.visualCases ?? [],
  );
  const visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(visualReviewReceipt, null, 2)}\n`,
  );
  const visualReviewReceiptSha256 = HASH(visualReviewReceiptBytes);
  const aggregateRevalidation = validatePhase2AggregateEvidence({
    manifest,
    manifestSha256: MANIFEST_SHA256,
    phase1EvidenceLockSha256: PHASE1_LOCK_SHA256,
    summaries: local.summaries,
    reviewImages: local.reviewImages,
    visualReviewReceipt,
    visualReviewReceiptBytes,
    visualReviewReceiptSha256,
    contractFailures: [],
    phase1EvidenceLockStable: true,
    manifestStable: true,
    commitValid: true,
    nowMs: NOW.getTime(),
  });
  const aggregateSummary = buildPhase2AggregateSummary({
    checkedAt: AGGREGATE_CHECKED_AT,
    validation: aggregateRevalidation,
    manifestSha256: MANIFEST_SHA256,
    phase1EvidenceLockSha256: PHASE1_LOCK_SHA256,
    componentSummarySha256,
    reviewImageSha256,
    visualReviewReceiptSha256,
  });
  const providerEvidence = await createProviderEvidence();
  const providerEvidenceBytes = Buffer.from(
    `${JSON.stringify(providerEvidence, null, 2)}\n`,
  );
  return {
    providerEvidence,
    providerEvidenceBytes,
    providerEvidenceSha256: HASH(providerEvidenceBytes),
    aggregateSummary,
    aggregateSummarySha256: HASH(`${JSON.stringify(aggregateSummary, null, 2)}\n`),
    componentSummaries: local.summaries,
    componentSummarySha256,
    manifestSha256: MANIFEST_SHA256,
    phase1EvidenceLockSha256: PHASE1_LOCK_SHA256,
    reviewImageSha256,
    manifest,
    visualReviewReceipt,
    visualReviewReceiptBytes,
    visualReviewReceiptSha256,
    aggregateRevalidation,
    recalculatedAggregate: aggregateSummary,
    recalculatedAggregateMatches: true,
    contractFailures: [],
    sourceSnapshotStable: true,
    providerSnapshotStable: true,
    currentHeadBefore: COMMIT,
    currentHeadAfter: COMMIT,
    provenanceApplicationCommit: COMMIT,
    provenanceHead: COMMIT,
    provenanceStable: true,
    expectedCommit: COMMIT,
    nowMs: NOW.getTime(),
    generatedAt: NOW.toISOString(),
  };
};

test("review prerequisites revalidate all 76 IDs, 22 images, six components, provider, and current HEAD", async () => {
  const inputs = await createInputs();
  assert.deepEqual(validatePhase2ReviewPrerequisites(inputs), []);

  const wrongHead = { ...inputs, currentHeadAfter: "d".repeat(40) };
  assert.ok(validatePhase2ReviewPrerequisites(wrongHead).includes("current_head_mismatch"));

  const evidenceHead = "d".repeat(40);
  const evidenceSuccessor = {
    ...inputs,
    currentHeadBefore: evidenceHead,
    currentHeadAfter: evidenceHead,
    provenanceHead: evidenceHead,
  };
  assert.deepEqual(validatePhase2ReviewPrerequisites(evidenceSuccessor), []);

  const unboundSuccessor = { ...evidenceSuccessor, provenanceApplicationCommit: evidenceHead };
  assert.ok(validatePhase2ReviewPrerequisites(unboundSuccessor).includes(
    "application_provenance_invalid",
  ));

  const changed = { ...inputs, sourceSnapshotStable: false };
  assert.ok(validatePhase2ReviewPrerequisites(changed).includes("review_input_changed"));

  const substitutedProviderBytes = {
    ...inputs,
    providerEvidenceBytes: Buffer.from("{}\n"),
  };
  assert.ok(validatePhase2ReviewPrerequisites(substitutedProviderBytes).includes(
    "provider_bytes_invalid",
  ));

  const noncanonicalProviderBytes = {
    ...inputs,
    providerEvidenceBytes: Buffer.from(JSON.stringify(inputs.providerEvidence)),
  };
  noncanonicalProviderBytes.providerEvidenceSha256 = HASH(
    noncanonicalProviderBytes.providerEvidenceBytes,
  );
  assert.ok(validatePhase2ReviewPrerequisites(noncanonicalProviderBytes).includes(
    "provider_bytes_invalid",
  ));

  const missingImage = { ...inputs, reviewImageSha256: inputs.reviewImageSha256.slice(1) };
  assert.ok(validatePhase2ReviewPrerequisites(missingImage).includes(
    "review_image_inventory_invalid",
  ));

  const expired = structuredClone(inputs);
  expired.providerEvidence.expiresAt = "2026-07-27T01:59:59.000Z";
  assert.ok(validatePhase2ReviewPrerequisites(expired).includes(
    "provider_evidence_not_ready",
  ));

  const missingReceipt = {
    ...inputs,
    visualReviewReceipt: null,
    visualReviewReceiptBytes: null,
    visualReviewReceiptSha256: null,
  };
  assert.ok(validatePhase2ReviewPrerequisites(missingReceipt).includes(
    "visual_review_receipt_invalid",
  ));

  const substitutedReceipt = structuredClone(inputs);
  substitutedReceipt.visualReviewReceipt.images[0].sha256 = HASH("substituted receipt");
  substitutedReceipt.visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(substitutedReceipt.visualReviewReceipt, null, 2)}\n`,
  );
  substitutedReceipt.visualReviewReceiptSha256 = HASH(
    substitutedReceipt.visualReviewReceiptBytes,
  );
  assert.ok(validatePhase2ReviewPrerequisites(substitutedReceipt).includes(
    "visual_review_receipt_invalid",
  ));

  const wrongLockReceipt = structuredClone(inputs);
  wrongLockReceipt.visualReviewReceipt.phase1EvidenceLockSha256 = "f".repeat(64);
  wrongLockReceipt.visualReviewReceiptBytes = Buffer.from(
    `${JSON.stringify(wrongLockReceipt.visualReviewReceipt, null, 2)}\n`,
  );
  wrongLockReceipt.visualReviewReceiptSha256 = HASH(
    wrongLockReceipt.visualReviewReceiptBytes,
  );
  assert.ok(validatePhase2ReviewPrerequisites(wrongLockReceipt).includes(
    "visual_review_receipt_invalid",
  ));
});

test("review provider fixture preserves the SQL-managed PostgreSQL control lifecycle", async () => {
  const { providerEvidence } = await createInputs();
  const bootstrap = providerEvidence.credentialBoundary.bootstrap;
  const control = providerEvidence.credentialBoundary.control;
  const terminalControl = providerEvidence.operatorPreflight.terminalTemporaryControl;
  const temporaryAccess = providerEvidence.temporaryAccess;
  const postRevoke = providerEvidence.postRevokeContinuity;

  assert.equal(bootstrap.kind, "persistent-provider-admin");
  assert.equal(bootstrap.provider, "postgres");
  assert.equal(bootstrap.privilege, "admin");
  assert.equal(bootstrap.retained, true);
  assert.equal(bootstrap.excludedFromReadOnlyControlAssertions, true);
  assert.equal(providerEvidence.capture.journalTrustBoundary.trustRoot, "local-system-user");
  assert.equal(providerEvidence.capture.journalTrustBoundary.operator, "Gary");
  assert.equal(providerEvidence.capture.journalTrustBoundary.journalMode, "0600");
  assert.equal(providerEvidence.capture.journalTrustBoundary.externalSignaturePresent, false);
  assert.equal(providerEvidence.capture.journalTrustBoundary.sameUserTamperingOutOfScope, true);

  assert.deepEqual(control.remainingReadOnlyProviders, ["cloudflare", "r2"]);
  assert.deepEqual(control.terminalTemporaryProviders, ["postgres", "render"]);
  assert.deepEqual(control.terminalTemporaryUnscopedProviders, ["render"]);
  assert.equal(control.terminalRevocationRequired, true);
  assert.deepEqual(terminalControl.providers, ["postgres", "render"]);
  assert.deepEqual(terminalControl.unscopedProviders, ["render"]);
  assert.equal(terminalControl.postgres.sqlManagedTemporaryRole, true);
  assert.equal(terminalControl.postgres.transactionReadOnly, true);
  assert.equal(terminalControl.postgres.finalDropRequired, true);

  assert.deepEqual(
    temporaryAccess.remainingReadOnlyControlProviders,
    ["cloudflare", "r2"],
  );
  assert.deepEqual(
    temporaryAccess.terminalTemporaryControlProviders,
    ["postgres", "render"],
  );
  assert.equal(temporaryAccess.terminalRevocationPending, true);
  assert.equal(temporaryAccess.postgresControlRevocationPending, true);
  assert.equal(temporaryAccess.renderControlRevocationPending, true);
  assert.deepEqual(
    temporaryAccess.postgresIdentities.map(({ kind }) => kind),
    ["mutation", "restore"],
  );
  for (const identity of temporaryAccess.postgresIdentities) {
    assert.equal(identity.revoked, true, identity.kind);
    assert.equal(identity.roleAbsent, true, identity.kind);
    assert.equal(identity.loginDenied, true, identity.kind);
    assert.match(identity.identitySha256, /^[0-9a-f]{64}$/u, identity.kind);
    assert.match(identity.roleSha256, /^[0-9a-f]{64}$/u, identity.kind);
  }

  assert.equal(postRevoke.postgresControlRevokedAfterContinuity, true);
  assert.equal(postRevoke.postgresControlIdentity.kind, "control");
  assert.equal(postRevoke.postgresControlIdentity.revoked, true);
  assert.equal(postRevoke.postgresControlIdentity.roleAbsent, true);
  assert.equal(postRevoke.postgresControlIdentity.loginDenied, true);
  assert.ok(
    temporaryAccess.postgresIdentities.every(({ identitySha256 }) => (
      identitySha256 !== postRevoke.postgresControlIdentity.identitySha256
    )),
  );
  assert.ok(
    temporaryAccess.postgresIdentities.every(({ roleSha256 }) => (
      roleSha256 !== postRevoke.postgresControlIdentity.roleSha256
    )),
  );
  assert.ok(Date.parse(postRevoke.checkedAt) > Date.parse(temporaryAccess.revokedAt));

  const inventorySha256 = terminalControl.postgres.providerCredentialInventorySha256;
  assert.match(inventorySha256, /^[0-9a-f]{64}$/u);
  assert.equal(terminalControl.postgres.providerCredentialInventoryUnchanged, true);
  assert.equal(temporaryAccess.postgresProviderCredentialInventoryUnchanged, true);
  assert.equal(postRevoke.postgresProviderCredentialInventoryUnchanged, true);
  assert.equal(temporaryAccess.postgresProviderCredentialInventorySha256, inventorySha256);
  assert.equal(postRevoke.postgresProviderCredentialInventorySha256, inventorySha256);
  assert.equal(
    terminalControl.postgres.persistentProviderAdmin.identitySha256,
    bootstrap.identitySha256,
  );
  assert.equal(terminalControl.postgres.persistentProviderAdmin.privilege, "admin");
  assert.equal(terminalControl.postgres.persistentProviderAdmin.retained, true);
  assert.equal(
    terminalControl.postgres.persistentProviderAdmin.providerCredentialInventorySha256,
    inventorySha256,
  );
  assert.deepEqual(
    postRevoke.persistentProviderAdmin,
    terminalControl.postgres.persistentProviderAdmin,
  );
});

test("full revalidation rejects minimal, stale, missing-ID, and substituted-image evidence", async () => {
  const minimal = await createInputs({
    mutateLocal: (local) => {
      local.summaries.performance = {
        schemaVersion: 1,
        check: checkNames.performance,
        status: "pass",
        commit: COMMIT,
      };
    },
  });
  assert.equal(minimal.aggregateRevalidation.ready, false);
  assert.ok(validatePhase2ReviewPrerequisites(minimal).includes(
    "aggregate_full_revalidation_failed",
  ));

  const stale = await createInputs({
    mutateLocal: (local) => {
      local.summaries.recovery.checkedAt = "2026-07-01T00:00:00.000Z";
    },
  });
  assert.equal(stale.aggregateRevalidation.ready, false);

  const missingId = await createInputs({
    mutateLocal: (local) => {
      local.summaries.recovery.results.pop();
      local.summaries.recovery.counts = resultCounts(local.summaries.recovery.results);
    },
  });
  assert.equal(missingId.aggregateRevalidation.ready, false);

  const substitutedImage = await createInputs({
    mutateLocal: (local) => {
      const first = local.summaries.visual.visualCases[0];
      local.reviewImages.set(first.evidencePath, {
        sha256: HASH("substituted"),
        width: first.width,
        height: first.height,
      });
    },
  });
  assert.equal(substitutedImage.aggregateRevalidation.ready, false);
});

test("review revalidation rejects hand-authored summaries that omit required component facts", async () => {
  for (const [component, mutate] of [
    ["accessibility", (summary) => { delete summary.metrics.focusFailures; }],
    ["journeys", (summary) => { delete summary.metrics.pageErrors; }],
    ["recovery", (summary) => { summary.metrics.retryIdempotencyGateCount = 0; }],
  ]) {
    const inputs = await createInputs({
      mutateLocal: (local) => mutate(local.summaries[component]),
    });
    assert.equal(inputs.aggregateRevalidation.ready, false, component);
    assert.ok(
      inputs.aggregateRevalidation.failureCodes.includes(
        `${component}_summary_semantics_invalid`,
      ),
      component,
    );
    assert.ok(
      validatePhase2ReviewPrerequisites(inputs).includes(
        "aggregate_full_revalidation_failed",
      ),
      component,
    );
  }
});

test("review template is ready-for-review only and records the complete provider boundary", async () => {
  const inputs = await createInputs();
  const renderDocument = (candidate) => renderPhase2ReviewDocument({
    generatedAt: candidate.generatedAt,
    applicationCommit: candidate.expectedCommit,
    evidenceCommit: candidate.provenanceHead,
    visualReviewReceiptSha256: candidate.visualReviewReceiptSha256,
    providerEvidenceSha256: candidate.providerEvidenceSha256,
    aggregateSummarySha256: candidate.aggregateSummarySha256,
    componentSummarySha256: candidate.componentSummarySha256,
    providerEvidence: candidate.providerEvidence,
    providerEvidenceBytes: candidate.providerEvidenceBytes,
    aggregateSummary: candidate.aggregateSummary,
    visualReviewReceipt: candidate.visualReviewReceipt,
  });
  const withAggregateCheckedAt = (candidate, checkedAt) => {
    const aggregateSummary = { ...candidate.aggregateSummary, checkedAt };
    return {
      ...candidate,
      aggregateSummary,
      aggregateSummarySha256: HASH(`${JSON.stringify(aggregateSummary, null, 2)}\n`),
      recalculatedAggregate: { ...candidate.recalculatedAggregate, checkedAt },
    };
  };
  const document = renderDocument(inputs);
  assert.deepEqual(validatePhase2ReviewDocument(document, inputs), []);
  assert.match(document, /^Status: ready-for-review$/mu);
  assert.match(document, /All eight live checks passed/u);
  assert.match(document, /Preview Pages, API, LLM, PostgreSQL, and R2/u);
  assert.match(document, /Cloudflare and R2 remained read-only control providers/u);
  assert.match(
    document,
    /PostgreSQL control, mutation, and restore were deterministic SQL-managed temporary roles/u,
  );
  assert.match(
    document,
    /PostgreSQL mutation\/restore, and R2 mutation access were revoked before continuity/u,
  );
  assert.match(
    document,
    /PostgreSQL control role performed the database continuity check and was then dropped/u,
  );
  assert.match(document, /Render control credential was revoked last/u);
  assert.match(document, /Provider credential inventory unchanged/u);
  assert.match(document, /76\/76 gates and 22\/22 final visual cases/u);
  assert.match(document, /original-resolution-visual-inspection/u);
  assert.match(
    document,
    /quantgym-phase2-provider-evidence:v1 encoding=base64/u,
  );
  assert.ok(document.includes(inputs.providerEvidenceBytes.toString("base64")));
  assert.doesNotMatch(document, /^Accepted:/mu);

  const generatedAt = "2026-07-27T02:05:00.000Z";
  const delayedAggregate = {
    ...withAggregateCheckedAt(inputs, "2026-07-26T02:05:00.000Z"),
    generatedAt,
    nowMs: Date.parse(generatedAt),
  };
  assert.deepEqual(
    validatePhase2ReviewDocument(renderDocument(delayedAggregate), delayedAggregate),
    [],
  );

  const lateProviderHandoff = {
    ...delayedAggregate,
    generatedAt: "2026-07-27T02:05:00.001Z",
    nowMs: Date.parse("2026-07-27T02:05:00.001Z"),
  };
  assert.ok(validatePhase2ReviewDocument(
    renderDocument(lateProviderHandoff),
    lateProviderHandoff,
  ).includes("review_generated_time_invalid"));

  for (const checkedAt of [
    "2026-07-20T02:04:59.999Z",
    "2026-07-27T02:05:00.001Z",
  ]) {
    const invalidAggregate = withAggregateCheckedAt(delayedAggregate, checkedAt);
    assert.ok(validatePhase2ReviewDocument(
      renderDocument(invalidAggregate),
      invalidAggregate,
    ).includes("review_generated_time_invalid"));
  }

  const selfAccepted = document.replace("Status: ready-for-review", "Status: accepted");
  const failures = validatePhase2ReviewDocument(selfAccepted, inputs);
  assert.ok(failures.includes("review_document_self_accepts"));
  assert.ok(failures.includes("review_status_invalid"));
});

test("review builder/checker use a fixed template and invalidate tampered output", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-review-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(path.join(root, path.dirname(PHASE2_REVIEW_PATH)), { recursive: true });
  const inputs = await createInputs();
  const testOnly = {
    root,
    loadInputs: async () => inputs,
  };
  const result = await buildFrontendUpgradePhase2Review({
    expectedCommit: COMMIT,
    now: NOW,
    [TEST_ONLY_PHASE2_REVIEW]: testOnly,
  });
  assert.equal(result.status, "ready-for-review");
  assert.match(await readFile(result.output, "utf8"), /^Status: ready-for-review$/mu);
  assert.equal((await checkFrontendUpgradePhase2Review({
    expectedCommit: COMMIT,
    now: NOW,
    [TEST_ONLY_PHASE2_REVIEW]: testOnly,
  })).sha256, result.sha256);

  await writeFile(
    result.output,
    result.document.replace("Status: ready-for-review", "Status: accepted"),
  );
  await assert.rejects(checkFrontendUpgradePhase2Review({
    expectedCommit: COMMIT,
    now: NOW,
    [TEST_ONLY_PHASE2_REVIEW]: testOnly,
  }), /review_document_content_mismatch|review_document_self_accepts/u);
  await assert.rejects(readFile(result.output), /ENOENT/u);
});

test("a failed rebuild deletes an older ready review instead of leaving stale approval", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-review-stale-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(path.join(root, path.dirname(PHASE2_REVIEW_PATH)), { recursive: true });
  const readyInputs = await createInputs();
  const readyOptions = {
    expectedCommit: COMMIT,
    now: NOW,
    [TEST_ONLY_PHASE2_REVIEW]: {
      root,
      loadInputs: async () => readyInputs,
    },
  };
  const ready = await buildFrontendUpgradePhase2Review(readyOptions);
  assert.equal((await readFile(ready.output, "utf8")).length > 0, true);

  const blockedInputs = {
    ...readyInputs,
    sourceSnapshotStable: false,
  };
  await assert.rejects(buildFrontendUpgradePhase2Review({
    expectedCommit: COMMIT,
    now: NOW,
    [TEST_ONLY_PHASE2_REVIEW]: {
      root,
      loadInputs: async () => blockedInputs,
    },
  }), /review is not ready/u);
  await assert.rejects(readFile(ready.output), /ENOENT/u);
});

test("production review root cannot be redirected through the public builder", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-review-root-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  await assert.rejects(buildFrontendUpgradePhase2Review({
    root,
    expectedCommit: COMMIT,
    now: NOW,
  }), /root is fixed/u);
});
