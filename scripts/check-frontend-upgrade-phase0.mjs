#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildFrontendUpgradePreviewWeb } from "./build-frontend-upgrade-preview-web.mjs";
import { APPROVED_ACCEPTANCE_POLICY } from "./lib/frontend-upgrade-approved-acceptance.mjs";
import {
  buildFrontendUpgradeHarnessEnv,
  distRuntimeFingerprint,
  recordFrontendUpgradeBuildEnvironment,
} from "./lib/frontend-upgrade-browser-harness.mjs";
import {
  BASELINE_VIEWPORTS,
  FRONTEND_UPGRADE_ROUTE_FIXTURES,
  SHARED_STATE_CAPTURE_INVENTORY,
  buildCaptureCases,
  buildPerformanceCases,
} from "./lib/frontend-upgrade-baseline.mjs";
import {
  validateAcceptanceCatalog,
  validateApprovedAcceptancePolicy,
} from "./lib/frontend-upgrade-contracts.mjs";
import { MODULE_OWNERSHIP } from "../src/modules/ownership.js";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PHASE0_EXPECTATIONS = Object.freeze({
  routeIds: Object.freeze([
    "overview", "plan", "skills", "league", "interview", "problems", "tools", "poker",
    "experiences", "news", "community", "messages", "network", "resume", "jobs",
    "companies", "library", "courses", "memory", "settings", "account", "pk",
  ]),
  systemSurfaceIds: Object.freeze([
    "system:auth",
    "system:desktop-shell",
    "system:mobile-shell",
    "system:global-search",
    "system:notifications-toast",
    "system:todo",
    "system:theme-language",
    "system:network-recovery",
  ]),
  designTextFiles: 30,
  productionAssets: 36,
  routeVisualA11yCases: 150,
  sharedStateCases: 26,
  sharedStateFutureGates: 6,
  trackedReviewImages: 29,
  performanceRuns: 12,
  runtimeMascotAssets: 16,
  runtimeMascotMasters: 16,
  runtimeMascotVariants: 48,
});

export const PHASE0_NESTED_GATES = Object.freeze([
  Object.freeze({
    id: "frontend-upgrade-contracts",
    command: "npm",
    args: Object.freeze(["run", "check:frontend-upgrade-contracts"]),
  }),
  Object.freeze({
    id: "frontend-v2-boundaries",
    command: "npm",
    args: Object.freeze(["run", "check:frontend-v2-boundaries"]),
  }),
  Object.freeze({
    id: "frontend-upgrade-preview",
    command: "npm",
    args: Object.freeze(["run", "check:frontend-upgrade:preview"]),
  }),
  Object.freeze({
    id: "stage2-strict",
    command: "npm",
    args: Object.freeze(["run", "check:stage2:strict"]),
  }),
  Object.freeze({
    id: "route-integrity",
    command: "npm",
    args: Object.freeze(["run", "check:route-integrity"]),
  }),
  Object.freeze({
    id: "route-interactions",
    command: "npm",
    args: Object.freeze(["run", "check:route-interactions"]),
  }),
  Object.freeze({
    id: "module-ownership",
    command: process.execPath,
    args: Object.freeze([
      "scripts/check-module-ownership.mjs",
      "--summary",
      "docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json",
    ]),
  }),
  Object.freeze({
    id: "repo-hygiene",
    command: "npm",
    args: Object.freeze(["run", "check:repo-hygiene"]),
  }),
]);

const SUMMARY_RELATIVE = "docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json";
const REVIEW_RELATIVE = "docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md";
const QUANTY_MANIFEST_RELATIVE = "assets/generated/playful-precision/quanty-runtime-manifest.json";
const ACCEPTANCE_CATALOG_RELATIVE = "docs/frontend-upgrade/acceptance-catalog.json";
const PROVIDER_EVIDENCE_RELATIVE = "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json";
const PREVIEW_BRANCH = "codex/frontend-v2-preview";
const PREVIEW_API_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const EXPECTED_ORIGIN_URL = "https://github.com/garymmmjw/QuantGym.git";
const TRUSTED_GIT_PATH = "/usr/bin/git";
const TRUSTED_CURL_PATH = "/usr/bin/curl";
const GITHUB_BRANCH_REF = `refs/heads/${PREVIEW_BRANCH}`;
const GITHUB_REF_API_URL = (
  "https://api.github.com/repos/garymmmjw/QuantGym/git/ref/heads/codex/frontend-v2-preview"
);
const PREVIEW_RUNTIME_FILES = Object.freeze([
  "scripts/build-frontend-upgrade-preview-web.mjs",
  "scripts/check-frontend-upgrade-preview-live.mjs",
  "scripts/check-frontend-upgrade-preview-postgres.py",
  "scripts/check-frontend-upgrade-preview-r2.mjs",
  "scripts/serve-frontend-upgrade-preview-probe.mjs",
]);
const APPROVED_FILE_SCOPES = Object.freeze({
  designSource: Object.freeze(["docs/ui-reference/playful-precision/source/"]),
  productionAsset: Object.freeze(["assets/generated/playful-precision/"]),
  productionManifest: Object.freeze(["assets/generated/playful-precision/manifest.json"]),
  reviewImage: Object.freeze(["docs/browser-audit-screenshots/370-frontend-upgrade-review/"]),
  runtimeMascot: Object.freeze(["assets/generated/playful-precision/"]),
  providerEvidence: Object.freeze([PROVIDER_EVIDENCE_RELATIVE]),
});

const SUMMARY_PATHS = Object.freeze({
  core: "docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json",
  visual: "docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json",
  shared: "docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json",
  performance: "docs/browser-audit-screenshots/370-frontend-upgrade-performance-baseline-summary.json",
  legacy: "docs/browser-audit-screenshots/370-frontend-upgrade-legacy-ui-contract-summary.json",
  preview: "docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json",
});

const LEGACY_ALLOWLIST_RELATIVE = "docs/frontend-upgrade/expected-legacy-ui-contract-findings.json";
const DESIGN_MANIFEST_RELATIVE = "docs/ui-reference/playful-precision/source-manifest.json";
const SURFACE_CONTRACT_RELATIVE = "docs/frontend-upgrade/surface-contracts.json";
const CANONICAL_ROUTE_CASES = Object.freeze(buildCaptureCases());
const CANONICAL_CURRENT_SHARED_STATES = Object.freeze(
  SHARED_STATE_CAPTURE_INVENTORY.filter((item) => item.expectedStatus === "current-capture"),
);
const CANONICAL_FUTURE_SHARED_STATES = Object.freeze(
  SHARED_STATE_CAPTURE_INVENTORY.filter((item) => item.expectedStatus === "future-gate"),
);
const CANONICAL_PERFORMANCE_CASES = Object.freeze(buildPerformanceCases(FRONTEND_UPGRADE_ROUTE_FIXTURES));
const CANONICAL_INTERACTION_NAMES = Object.freeze(unique(
  MODULE_OWNERSHIP.flatMap((item) => array(item.browserSmokeInteractions)),
));

export function validatePhase0Evidence(evidence = {}, options = {}) {
  const failures = [...(evidence.loadFailures || [])];
  const nowMs = Number(options.nowMs ?? Date.now());
  const expected = PHASE0_EXPECTATIONS;
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };

  expectExactMembers(evidence.manifestRouteIds, expected.routeIds, "MODULE_MANIFEST routes", failures);
  expectExactMembers(evidence.contractRouteIds, expected.routeIds, "surface-contract routes", failures);
  expectExactMembers(
    evidence.systemSurfaceIds,
    expected.systemSurfaceIds,
    "surface-contract system surfaces",
    failures,
  );
  for (const failure of validateApprovedAcceptancePolicy()) {
    failures.push(`approved acceptance inventory: ${failure}`);
  }
  for (const failure of validateAcceptanceCatalog(
    evidence.acceptanceCatalog || {},
    evidence.surfaceContract || {},
  )) {
    failures.push(`acceptance catalog: ${failure}`);
  }

  const designSources = array(evidence.designSources);
  expect(designSources.length === expected.designTextFiles,
    `design source count must be ${expected.designTextFiles}; received ${designSources.length}`);
  expectUnique(designSources.map((item) => item?.path), "design source paths", failures);
  const designPaths = new Set(designSources.map((item) => item?.path));
  for (const referenced of array(evidence.referencedDesignFiles)) {
    expect(designPaths.has(referenced), `referenced design file is missing from source manifest: ${referenced}`);
  }
  expectExactMembers(
    array(evidence.referencedDesignFiles),
    designSources.map((item) => item?.path),
    "referenced design files",
    failures,
  );
  for (const record of designSources) validateFileRecord(record, "design source", failures);

  const productionAssets = array(evidence.productionAssets);
  expect(isSha256(evidence.productionAssetManifest?.expectedSha256)
    && evidence.productionAssetManifest.expectedSha256 === evidence.productionAssetManifest?.actualSha256,
    "production asset manifest SHA-256 mismatch");
  validateFileRecord(evidence.productionAssetManifest, "production asset manifest", failures);
  expect(productionAssets.length === expected.productionAssets,
    `production asset count must be ${expected.productionAssets}; received ${productionAssets.length}`);
  expectUnique(productionAssets.map((item) => item?.path), "production asset paths", failures);
  for (const record of productionAssets) validateFileRecord(record, "production asset", failures);

  validateCoreSummary(evidence.summaries?.core, evidence.acceptanceCatalog, failures);
  validateVisualSummary(evidence.summaries?.visual, evidence.acceptanceCatalog, failures);
  validateSharedSummary(evidence.summaries?.shared, evidence.acceptanceCatalog, failures);
  validatePerformanceSummary(evidence.summaries?.performance, failures);

  const runtimeFingerprints = [
    evidence.summaries?.core?.build?.distRuntimeFingerprint,
    evidence.summaries?.visual?.metadata?.distRuntimeFingerprint,
    evidence.summaries?.shared?.metadata?.distRuntimeFingerprint,
    evidence.summaries?.performance?.metadata?.distRuntimeFingerprint,
  ];
  expect(isSha256(evidence.canonicalDistRuntimeFingerprint),
    "canonical dist runtime fingerprint must be a SHA-256 value");
  for (const [index, fingerprint] of runtimeFingerprints.entries()) {
    expect(fingerprint === evidence.canonicalDistRuntimeFingerprint,
      `baseline ${index + 1} has a stale canonical dist runtime fingerprint`);
  }

  const reviewImages = array(evidence.reviewImages);
  expect(reviewImages.length === expected.trackedReviewImages,
    `tracked review-image count must be ${expected.trackedReviewImages}; received ${reviewImages.length}`);
  expectUnique(reviewImages.map((item) => item?.path), "tracked review-image paths", failures);
  for (const record of reviewImages) validateFileRecord(record, "tracked review image", failures);

  validateLegacySummary(
    evidence.summaries?.legacy,
    evidence.legacyAllowlist,
    failures,
  );
  validatePreviewSummary(evidence.summaries?.preview, evidence.previewVerification, nowMs, failures);
  validateNestedGates(evidence.nestedCommands, failures);
  validateRuntimeMascot(evidence.runtimeMascot, failures);

  expect(evidence.reviewStatus === "ready-for-review",
    "review status generated by the Phase 0 checker must be ready-for-review, never accepted");
  return unique(failures);
}

export function buildPhase0Summary(evidence = {}, options = {}) {
  const requestedStatus = options.reviewStatus ?? evidence.reviewStatus ?? "ready-for-review";
  const normalizedEvidence = { ...evidence, reviewStatus: requestedStatus };
  const failures = validatePhase0Evidence(normalizedEvidence, options);
  const unexpectedLegacyUiFindings = countUnexpectedLegacyFindings(
    evidence.summaries?.legacy,
    evidence.legacyAllowlist,
  );
  return {
    status: failures.length === 0 ? "ready-for-review" : "not-ready",
    routes: array(evidence.manifestRouteIds).length,
    systemSurfaces: array(evidence.systemSurfaceIds).length,
    designTextFiles: array(evidence.designSources).length,
    productionAssets: array(evidence.productionAssets).length,
    runtimeMascotAssets: Number(evidence.runtimeMascot?.logicalAssets || 0),
    runtimeMascotVariants: Number(evidence.runtimeMascot?.variants || 0),
    coreFlowRoutes: Number(evidence.summaries?.core?.routes?.checked || 0),
    routeVisualA11yCases: Number(evidence.summaries?.visual?.captures?.checked || 0),
    sharedStateCases: Number(evidence.summaries?.shared?.currentCaptures?.checked || 0),
    sharedStateFutureGates: array(evidence.summaries?.shared?.futureGates).length,
    trackedReviewImages: array(evidence.reviewImages).length,
    performanceRuns: Number(evidence.summaries?.performance?.runs?.checked || 0),
    previewResourceIsolation: evidence.summaries?.preview?.resourceIsolation || "missing",
    previewApplicationBindings: evidence.summaries?.preview?.applicationBindings || "missing",
    unexpectedLegacyUiFindings,
    failures,
  };
}

export function renderPhase0ReviewPacket(evidence = {}, summary = {}) {
  if (summary.status !== "ready-for-review" || array(summary.failures).length > 0) {
    throw new Error("Phase 0 review packet can only be generated from a ready-for-review summary.");
  }
  const findings = extractReviewFindings(evidence.summaries || {});
  return `# QuantGym Frontend Platform Upgrade Phase 0 Review

Date: 2026-07-10
Status: ready-for-review

## Evidence

- Design source and production assets: verified by SHA-256.
- Surface mapping: 22 routes and 8 shared surfaces.
- Core flows: 22 routes; League ownership and journey included.
- Visual/accessibility baseline: 150 route cases, 26 reachable shared-state cases, 6 explicit Phase 1 state gates, and 29 tracked review images across light/dark and approved viewports.
- Performance baseline: 12 representative lab runs plus bundle inventory.
- Runtime mascot assets: ${summary.runtimeMascotAssets} logical assets and ${summary.runtimeMascotVariants} responsive WebP variants passed the dedicated Quanty asset gate and runtime-manifest hash verification.
- Preview resource isolation: minimal web probe, API/internal LLM probes, empty PostgreSQL, and private R2 live checks passed with redacted evidence; real API bindings are deferred to Phase 1.

## Findings Requiring Later Improvement

The following arrays copy the complete matching finding records from the generated Phase 0 summaries. They are evidence records, not approvals or waivers.

### Serious/Critical Accessibility Findings

\`\`\`json
${JSON.stringify(findings.accessibility, null, 2)}
\`\`\`

### Horizontal Overflow Findings

\`\`\`json
${JSON.stringify(findings.overflow, null, 2)}
\`\`\`

### Hidden Primary-Action Findings

\`\`\`json
${JSON.stringify(findings.hiddenActions, null, 2)}
\`\`\`

### Performance-Budget Findings

\`\`\`json
${JSON.stringify(findings.performanceBudget, null, 2)}
\`\`\`

### Historical League Evidence Findings

\`\`\`json
${JSON.stringify(findings.historicalLeague, null, 2)}
\`\`\`

## Review Decision

Independent reviewer and user decision are pending. Phase 1 planning must not begin until this status is changed in a separate reviewed commit after explicit user acceptance.
`;
}

export function extractReviewFindings(summaries = {}) {
  const baselineFindings = [
    ...array(summaries.visual?.findings),
    ...array(summaries.shared?.findings),
  ];
  return {
    accessibility: baselineFindings.filter((item) => (
      item?.kind === "axe" && ["serious", "critical"].includes(item?.impact)
    )),
    overflow: baselineFindings.filter((item) => /overflow/i.test(String(item?.id || ""))),
    hiddenActions: baselineFindings.filter((item) => /hidden-primary-action/i.test(String(item?.id || ""))),
    performanceBudget: array(summaries.performance?.findings).filter((item) => (
      item?.kind === "performance" || item?.kind === "bundle"
    )),
    historicalLeague: array(summaries.legacy?.findings),
  };
}

export async function runPhase0Check(options = {}) {
  const root = path.resolve(options.root || defaultRoot);
  const nowMs = Number(options.nowMs ?? Date.now());
  const commandResults = await runPhase0Commands({
    root,
    runner: options.commandRunner,
    stream: options.streamCommands !== false,
  });
  const legacyResult = await runLegacyWrapper({
    root,
    runner: options.commandRunner,
    stream: options.streamCommands !== false,
  });
  let buildResult;
  try {
    buildResult = await rebuildCanonicalDist({ root, runner: options.commandRunner });
  } catch (error) {
    buildResult = {
      status: "fail",
      fingerprint: "",
      error: error?.message || String(error),
    };
  }
  const evidence = await collectPhase0Evidence({
    root,
    commandResults,
    legacyResult,
    canonicalDistRuntimeFingerprint: buildResult.fingerprint,
  });
  if (buildResult.status !== "pass") {
    evidence.loadFailures.push(`canonical dist rebuild failed: ${buildResult.error || "unknown error"}`);
  }
  evidence.reviewStatus = options.reviewStatus || "ready-for-review";
  const summary = buildPhase0Summary(evidence, { nowMs, reviewStatus: evidence.reviewStatus });
  const summaryPath = path.resolve(root, options.summaryPath || SUMMARY_RELATIVE);
  const requestedReviewPath = path.resolve(root, options.reviewPath || REVIEW_RELATIVE);
  const outputs = writePhase0Outputs({
    evidence,
    summary,
    summaryPath,
    reviewPath: requestedReviewPath,
  });
  return {
    summary,
    evidence,
    commandResults,
    legacyResult,
    buildResult,
    summaryPath,
    reviewPath: outputs.reviewPath,
    reviewDisposition: outputs.reviewDisposition,
  };
}

export function writePhase0Outputs({ evidence = {}, summary, summaryPath, reviewPath }) {
  if (!summary || !summaryPath || !reviewPath) {
    throw new Error("Phase 0 output paths and summary are required.");
  }
  atomicWriteText(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  const existingReview = readExistingReview(reviewPath);
  if (existingReview.status === "accepted") {
    return { reviewPath, reviewDisposition: "accepted-preserved" };
  }
  if (summary.status === "ready-for-review" && array(summary.failures).length === 0) {
    atomicWriteText(reviewPath, renderPhase0ReviewPacket(evidence, summary));
    return { reviewPath, reviewDisposition: "ready-written" };
  }
  if (existingReview.exists) {
    atomicWriteText(reviewPath, renderInvalidatedPhase0Review(summary));
    return { reviewPath, reviewDisposition: "stale-review-invalidated" };
  }
  return { reviewPath: null, reviewDisposition: "no-ready-review" };
}

export async function runPhase0Commands({ root = defaultRoot, runner, stream = false } = {}) {
  const results = [];
  for (const gate of PHASE0_NESTED_GATES) {
    results.push(await runCommand(gate, { root, runner, stream }));
  }
  const quantyManifestPath = path.join(root, QUANTY_MANIFEST_RELATIVE);
  if (fs.existsSync(quantyManifestPath)) {
    results.push(await runCommand({
      id: "quanty-assets",
      command: "npm",
      args: ["run", "check:quanty-assets"],
    }, { root, runner, stream }));
  }
  return results;
}

export async function collectPhase0Evidence({
  root = defaultRoot,
  commandResults = [],
  legacyResult = null,
  canonicalDistRuntimeFingerprint = "",
} = {}) {
  const loadFailures = [];
  const readJson = (relativePath, label) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
    } catch (error) {
      loadFailures.push(`${label} is missing or invalid JSON: ${error.message}`);
      return null;
    }
  };
  const [moduleManifest, surfaceContract, designManifest, productionManifest] = await Promise.all([
    import(pathToFileURL(path.join(root, "src/modules/manifest.js")).href),
    Promise.resolve(readJson(SURFACE_CONTRACT_RELATIVE, "surface contract")),
    Promise.resolve(readJson(DESIGN_MANIFEST_RELATIVE, "design source manifest")),
    Promise.resolve(null),
  ]);
  const assetManifestRelative = designManifest?.assetManifest || "";
  const trackedFiles = readTrackedFileSet(root, loadFailures);
  const parsedProductionManifest = assetManifestRelative
    ? readJson(assetManifestRelative, "production asset manifest")
    : productionManifest;
  const designSources = array(designManifest?.textFiles).map((item) => fileRecord(
    root,
    path.posix.join("docs/ui-reference/playful-precision/source", item.path),
    item,
    item.path,
    APPROVED_FILE_SCOPES.designSource,
    trackedFiles,
    { requireTracked: true },
  ));
  const productionAssets = array(parsedProductionManifest?.assets).map((item) => fileRecord(
    root,
    item.dest,
    item,
    item.dest,
    APPROVED_FILE_SCOPES.productionAsset,
    trackedFiles,
    { requireTracked: true },
  ));
  const productionAssetManifest = fileRecord(
    root,
    assetManifestRelative,
    { sha256: designManifest?.assetManifestSha256 },
    assetManifestRelative,
    APPROVED_FILE_SCOPES.productionManifest,
    trackedFiles,
    { requireTracked: true },
  );
  const surfaces = array(surfaceContract?.surfaces);
  const referencedDesignFiles = unique([
    ...surfaces.flatMap((item) => array(item?.designFiles)),
    ...array(surfaceContract?.supportingSources).map((item) => item?.file),
  ]);
  const summaries = {
    core: readJson(SUMMARY_PATHS.core, "core-flow summary"),
    visual: readJson(SUMMARY_PATHS.visual, "visual/accessibility summary"),
    shared: readJson(SUMMARY_PATHS.shared, "shared-state summary"),
    performance: readJson(SUMMARY_PATHS.performance, "performance summary"),
    legacy: readJson(SUMMARY_PATHS.legacy, "legacy UI-contract summary"),
    preview: readJson(SUMMARY_PATHS.preview, "live Preview summary"),
  };
  if (legacyResult?.status === "pass") {
    summaries.legacy = readJson(SUMMARY_PATHS.legacy, "fresh legacy UI-contract summary");
  } else {
    loadFailures.push(`legacy UI-contract wrapper failed with exit ${String(legacyResult?.exitCode)}`);
  }
  const reviewMetadata = [
    ...array(summaries.visual?.reviewImages),
    ...array(summaries.shared?.reviewImages),
  ];
  const reviewImages = reviewMetadata.map((item) => fileRecord(
    root,
    item.path,
    item,
    item.path,
    APPROVED_FILE_SCOPES.reviewImage,
    trackedFiles,
    { requireTracked: true },
  ));
  const quantyCommand = commandResults.find((item) => item.id === "quanty-assets");
  const runtimeMascot = loadRuntimeMascotEvidence(
    root,
    quantyCommand,
    loadFailures,
    trackedFiles,
  );
  const acceptanceCatalog = readJson(ACCEPTANCE_CATALOG_RELATIVE, "acceptance catalog");
  const previewVerification = await buildLocalPreviewVerification({
    root,
    summaries,
    loadFailures,
    trackedFiles,
  });
  return {
    loadFailures,
    manifestRouteIds: array(moduleManifest.MODULE_MANIFEST).map((item) => item.id),
    contractRouteIds: surfaces.filter((item) => item?.kind === "route").map((item) => item.routeId),
    systemSurfaceIds: surfaces.filter((item) => item?.kind === "system").map((item) => item.id),
    surfaceContract,
    acceptanceCatalog,
    designSources,
    referencedDesignFiles,
    productionAssetManifest,
    productionAssets,
    reviewImages,
    summaries,
    legacyAllowlist: readJson(LEGACY_ALLOWLIST_RELATIVE, "legacy UI-contract allowlist"),
    canonicalDistRuntimeFingerprint,
    nestedCommands: commandResults,
    runtimeMascot,
    previewVerification,
  };
}

async function buildLocalPreviewVerification({
  root,
  summaries,
  loadFailures,
  trackedFiles,
}) {
  const summary = summaries?.preview;
  const providerEvidenceRecord = fileRecord(
    root,
    PROVIDER_EVIDENCE_RELATIVE,
    { sha256: summary?.providerEvidenceSha256 },
    PROVIDER_EVIDENCE_RELATIVE,
    APPROVED_FILE_SCOPES.providerEvidence,
    trackedFiles,
  );
  let providerEvidence = null;
  try {
    providerEvidence = JSON.parse(providerEvidenceRecord._bytes?.toString("utf8") || "");
  } catch (error) {
    loadFailures.push(`Preview provider evidence is invalid JSON: ${error.message}`);
  }

  const pages = providerEvidence?.cloudflare?.pages;
  const expectedCommit = typeof pages?.latestDeploymentCommit === "string"
    ? pages.latestDeploymentCommit
    : "";
  const expectedBranch = pages?.productionBranch;
  const providerCapturedAt = providerEvidence?.capturedAt;
  const providerChecks = {
    schemaVersionExact: providerEvidence?.schemaVersion === 1,
    topLevelShapeExact: exactObjectKeys(providerEvidence, [
      "schemaVersion", "authenticatedSource", "capturedAt", "operator", "budgetOwner",
      "destroyOwner", "cloudflare", "render",
    ]),
    pagesShapeExact: exactObjectKeys(pages, [
      "projectIdHash", "name", "productionBranch", "buildCommand", "destinationDir",
      "latestDeploymentCommit", "latestDeploymentStatus",
    ]),
    branchExact: expectedBranch === PREVIEW_BRANCH,
    commitValid: /^[a-f0-9]{40}$/.test(expectedCommit),
    captureTimeExact: isExactIsoDate(providerCapturedAt),
    deploymentPassed: pages?.latestDeploymentStatus === "success",
    providerFileOwnerOnly: providerEvidenceRecord.mode !== null
      && (providerEvidenceRecord.mode & 0o077) === 0,
    providerFileUntracked: providerEvidenceRecord.requireTracked === false
      && providerEvidenceRecord.gitTracked === false,
  };

  let minimalWebArtifactSha256 = "";
  if (providerChecks.commitValid) {
    try {
      minimalWebArtifactSha256 = await rebuildMinimalPreviewProbeFingerprint(expectedCommit);
    } catch (error) {
      loadFailures.push(`Preview minimal probe rebuild failed: ${error.message}`);
    }
  }

  let git = {};
  try {
    git = verifyPreviewGitState(root, expectedCommit);
  } catch (error) {
    loadFailures.push(`Preview trusted Git verification failed: ${error.message}`);
  }
  return {
    providerEvidenceRecord,
    providerChecks,
    expectedCommit,
    expectedBranch,
    providerCapturedAt,
    minimalWebArtifactSha256,
    git,
  };
}

async function rebuildMinimalPreviewProbeFingerprint(expectedCommit) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-phase0-preview-web-"));
  const outDir = path.join(temporaryRoot, "dist-preview");
  try {
    await buildFrontendUpgradePreviewWeb({
      outDir,
      env: {
        CF_PAGES_COMMIT_SHA: expectedCommit,
        CF_PAGES_BRANCH: PREVIEW_BRANCH,
        QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
        QUANTGYM_PREVIEW_SERVICE: "web",
        QUANTGYM_PREVIEW_COMMIT: expectedCommit,
        QUANTGYM_PREVIEW_BRANCH: PREVIEW_BRANCH,
        QUANTGYM_PREVIEW_API_BASE: `${PREVIEW_API_ORIGIN}/api/v2`,
      },
    });
    const digest = createHash("sha256");
    for (const name of ["index.html", "config.json", "version.json"]) {
      const bytes = fs.readFileSync(path.join(outDir, name));
      digest.update(name);
      digest.update("\0");
      digest.update(String(bytes.length));
      digest.update("\0");
      digest.update(bytes);
      digest.update("\0");
    }
    return digest.digest("hex");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function verifyPreviewGitState(root, expectedCommit, options = {}) {
  assertTrustedGitExecutable();
  const run = (args, timeout = 10_000) => runTrustedGit(root, args, timeout);
  const remoteRequest = {
    command: TRUSTED_GIT_PATH,
    args: [
      "-c", "http.followRedirects=false",
      "ls-remote", "--exit-code", EXPECTED_ORIGIN_URL, GITHUB_BRANCH_REF,
    ],
    cwd: "/",
    env: trustedGitEnvironment(),
    timeoutMs: 10_000,
  };
  const remoteResult = options.remoteRunner
    ? options.remoteRunner(remoteRequest)
    : runTrustedRemoteGit(remoteRequest);
  let remoteBranchExact = remoteResult?.status === 0
    && exactRemoteLine(remoteResult.stdout, expectedCommit);
  if (remoteResult?.status !== 0) {
    const apiRequest = {
      command: TRUSTED_CURL_PATH,
      args: [
        "--disable",
        "--fail", "--silent", "--show-error",
        "--max-time", "15",
        "--proto", "=https",
        "--write-out", "\n%{http_code}",
        "--header", "Accept: application/vnd.github+json",
        "--header", "X-GitHub-Api-Version: 2022-11-28",
        GITHUB_REF_API_URL,
      ],
      cwd: "/",
      env: trustedGitEnvironment(),
      timeoutMs: 20_000,
    };
    const apiResult = options.remoteApiRunner
      ? options.remoteApiRunner(apiRequest)
      : runTrustedRemoteApi(apiRequest);
    remoteBranchExact = parseGitHubBranchSha(apiResult) === expectedCommit;
  }
  const originUrl = run(["config", "--local", "--get-all", "remote.origin.url"]);
  const currentBranch = run(["branch", "--show-current"]);
  const localBranch = run(["rev-parse", "--verify", `refs/heads/${PREVIEW_BRANCH}^{commit}`]);
  const originBranch = run(["rev-parse", "--verify", `refs/remotes/origin/${PREVIEW_BRANCH}^{commit}`]);
  const expectedObject = run(["cat-file", "-e", `${expectedCommit}^{commit}`]);
  const originAncestor = run([
    "merge-base", "--is-ancestor", expectedCommit, `refs/remotes/origin/${PREVIEW_BRANCH}`,
  ]);
  const headAncestor = run(["merge-base", "--is-ancestor", expectedCommit, "HEAD"]);
  const descendant = run([
    "diff", "--name-only", expectedCommit, "HEAD", "--", ".",
    `:(exclude,top)${SUMMARY_PATHS.preview}`,
  ]);
  const replaceRefs = run(["for-each-ref", "--format=%(refname)", "refs/replace"]);
  const graftPathResult = run(["rev-parse", "--git-path", "info/grafts"]);
  const indexFlags = run(["ls-files", "-v", "-z"]);
  const fsmonitorFlags = run(["ls-files", "-f", "-z"]);
  const originUrls = originUrl.stdout.trim().split(/\r?\n/).filter(Boolean);
  const indexRecords = indexFlags.stdout.split("\0").filter(Boolean);
  const fsmonitorRecords = fsmonitorFlags.stdout.split("\0").filter(Boolean);
  let graftsAbsent = false;
  const graftPathLines = graftPathResult.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (graftPathResult.status === 0 && graftPathLines.length === 1
    && !/[\u0000-\u001f\u007f]/.test(graftPathLines[0])) {
    const graftPath = path.isAbsolute(graftPathLines[0])
      ? graftPathLines[0]
      : path.resolve(root, graftPathLines[0]);
    try {
      fs.lstatSync(graftPath);
    } catch (error) {
      graftsAbsent = error?.code === "ENOENT";
    }
  }
  const runtimeFilesMatchExpectedCommit = PREVIEW_RUNTIME_FILES.every((relativePath) => {
    let stats;
    try {
      stats = fs.lstatSync(path.join(root, relativePath));
    } catch {
      return false;
    }
    if (!stats.isFile() || stats.isSymbolicLink() || (stats.mode & 0o022) !== 0) return false;
    if (typeof process.getuid === "function" && stats.uid !== 0 && stats.uid !== process.getuid()) {
      return false;
    }
    const expectedBlob = run(["rev-parse", "--verify", `${expectedCommit}:${relativePath}`]);
    const actualBlob = run(["hash-object", "--no-filters", "--", relativePath]);
    return expectedBlob.status === 0
      && actualBlob.status === 0
      && /^[a-f0-9]{40,64}$/.test(expectedBlob.stdout.trim())
      && actualBlob.stdout.trim() === expectedBlob.stdout.trim();
  });
  return {
    trustedExecutable: true,
    originUrlExact: originUrl.status === 0
      && originUrls.length === 1
      && originUrls[0] === EXPECTED_ORIGIN_URL,
    currentBranchExact: currentBranch.status === 0 && currentBranch.stdout.trim() === PREVIEW_BRANCH,
    localBranchExists: localBranch.status === 0,
    expectedCommitExists: expectedObject.status === 0,
    originBranchContainsCommit: originAncestor.status === 0,
    originBranchExact: originBranch.status === 0 && originBranch.stdout.trim() === expectedCommit,
    remoteBranchExact,
    deployedCommitAncestorOfHead: headAncestor.status === 0,
    descendantChangesRestricted: descendant.status === 0 && descendant.stdout === "",
    replaceRefsAbsent: replaceRefs.status === 0 && replaceRefs.stdout === "",
    graftsAbsent,
    indexFlagsSafe: indexFlags.status === 0
      && indexRecords.length > 0
      && indexRecords.every((record) => record.startsWith("H "))
      && fsmonitorFlags.status === 0
      && fsmonitorRecords.length === indexRecords.length
      && fsmonitorRecords.every((record) => record.startsWith("H ")),
    runtimeFilesMatchExpectedCommit,
  };
}

export async function rebuildCanonicalDist({ root = defaultRoot, runner } = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-phase0-dist-"));
  const distDir = path.join(tempRoot, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  const env = buildFrontendUpgradeHarnessEnv(distDir, process.env);
  try {
    const result = await invokeRunner(runner, {
      id: "canonical-dist-build",
      command: process.execPath,
      args: ["scripts/build-static-site.mjs"],
      cwd: root,
      env,
      timeoutMs: 180000,
    });
    if (result.exitCode !== 0) {
      throw new Error(`canonical dist build failed (${result.exitCode}): ${tail(result.stderr || result.stdout)}`);
    }
    return {
      status: "pass",
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      fingerprint: distRuntimeFingerprint(distDir),
      environment: recordFrontendUpgradeBuildEnvironment(env),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function runLegacyWrapper({ root, runner, stream }) {
  return runCommand({
    id: "legacy-ui-contract-wrapper",
    command: process.execPath,
    args: ["scripts/capture-legacy-ui-contract-findings.mjs"],
  }, { root, runner, stream });
}

async function runCommand(gate, { root, runner, stream }) {
  const result = await invokeRunner(runner, {
    ...gate,
    cwd: root,
    env: process.env,
    timeoutMs: 900000,
  });
  const normalized = {
    id: gate.id,
    command: [gate.command, ...gate.args].join(" "),
    status: result.exitCode === 0 ? "pass" : "fail",
    exitCode: result.exitCode,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
  if (stream) {
    process.stderr.write(`\n[phase0:${gate.id}] exit ${normalized.exitCode}\n`);
    if (normalized.stdout) process.stderr.write(normalized.stdout);
    if (normalized.stderr) process.stderr.write(normalized.stderr);
  }
  return normalized;
}

async function invokeRunner(runner, request) {
  if (runner) {
    const result = await runner(request);
    return {
      exitCode: Number.isInteger(result?.exitCode) ? result.exitCode : Number(result?.status ?? 1),
      stdout: String(result?.stdout || ""),
      stderr: String(result?.stderr || ""),
    };
  }
  const child = spawnSync(request.command, request.args, {
    cwd: request.cwd,
    env: request.env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
    timeout: request.timeoutMs,
    killSignal: "SIGTERM",
    windowsHide: true,
  });
  return {
    exitCode: Number.isInteger(child.status) ? child.status : 1,
    stdout: child.stdout || "",
    stderr: [child.stderr || "", child.error?.message || ""].filter(Boolean).join("\n"),
  };
}

function validateCoreSummary(summary, acceptanceCatalog, failures) {
  if (!summary) {
    failures.push("core-flow summary is required");
    return;
  }
  expectValue(summary.status, "pass", "core-flow status", failures);
  expectNumber(summary.routes?.checked, 22, "core-flow route count", failures);
  expectNumber(summary.routes?.passed, 22, "core-flow passed route count", failures);
  expectNumber(summary.routes?.failed, 0, "core-flow failed route count", failures);
  expectExactMembers(
    array(summary.routes?.results).map((item) => item?.id),
    PHASE0_EXPECTATIONS.routeIds,
    "core-flow route results",
    failures,
  );
  for (const result of array(summary.routes?.results)) {
    if (result?.status !== "pass") {
      failures.push(`core-flow route did not pass: ${result?.id || "(missing id)"}`);
    }
  }
  expectNumber(summary.interactions?.failed, 0, "core-flow failed interaction count", failures);
  if (summary.interactions?.checked !== CANONICAL_INTERACTION_NAMES.length
    || summary.interactions?.passed !== CANONICAL_INTERACTION_NAMES.length) {
    failures.push(`core-flow interaction counts must be exactly ${CANONICAL_INTERACTION_NAMES.length}/${CANONICAL_INTERACTION_NAMES.length}`);
  }
  const interactionResults = array(summary.interactions?.results);
  expectNumber(interactionResults.length, CANONICAL_INTERACTION_NAMES.length,
    "core-flow named interaction inventory", failures);
  expectExactMembers(
    interactionResults.map((item) => item?.name),
    CANONICAL_INTERACTION_NAMES,
    "core-flow exact interaction names",
    failures,
  );
  for (const result of interactionResults) {
    if (result?.status !== "pass") {
      failures.push(`core-flow interaction did not pass: ${result?.name || "(missing name)"}`);
    }
  }
  const catalogById = new Map(array(acceptanceCatalog?.entries).map((item) => [item?.id, item]));
  for (const flow of APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows) {
    const matches = interactionResults.filter((item) => item?.name === flow.interactionName);
    if (matches.length !== 1) {
      failures.push(`core-flow interaction locator must resolve exactly once: ${flow.id}`);
    }
    const catalogEntry = catalogById.get(flow.acceptanceId);
    if (!catalogEntry
      || catalogEntry.surfaceId !== flow.surfaceId
      || catalogEntry.phase0Evidence?.path !== flow.source
      || catalogEntry.phase0Evidence?.interactionName !== flow.interactionName
      || catalogEntry.phase0Evidence?.resultLocator !== flow.resultLocator) {
      failures.push(`core-flow acceptance locator mismatch: ${flow.id}`);
    }
  }
  if (!jsonEqual(summary.coreFlows, {
    namedInteractions: { expected: 68, checked: 68, passed: 68, failed: 0 },
    unauthenticatedAuth: { expected: 1, checked: 1, passed: 1, failed: 0 },
    totalCoreFlows: { expected: 69, checked: 69, passed: 69, failed: 0 },
  })) failures.push("core-flow aggregate inventory must be exactly 68 named interactions plus one auth flow");
  if (array(summary.failures).length > 0) failures.push("core-flow summary contains failures");
}

function validateVisualSummary(summary, acceptanceCatalog, failures) {
  if (!summary) {
    failures.push("visual/accessibility summary is required");
    return;
  }
  if (!["pass", "captured-with-findings"].includes(summary.status)) {
    failures.push(`visual/accessibility status must be pass or captured-with-findings; received ${summary.status}`);
  }
  expectValue(summary.filteredRun, false, "visual/accessibility filteredRun", failures);
  expectNumber(summary.expectedCaptures, 150, "visual/accessibility expected case count", failures);
  expectNumber(summary.captures?.checked, 150, "visual/accessibility checked case count", failures);
  expectNumber(summary.captures?.succeeded, 150, "visual/accessibility successful case count", failures);
  expectNumber(summary.captures?.failed, 0, "visual/accessibility failed case count", failures);
  const cases = array(summary.cases);
  expectNumber(cases.length, 150, "visual/accessibility case inventory", failures);
  expectExactMembers(
    cases.map((item) => item?.id),
    CANONICAL_ROUTE_CASES.map((item) => item.id),
    "visual/accessibility exact case IDs",
    failures,
  );
  const actualById = new Map(cases.map((item) => [item?.id, item]));
  const catalogById = new Map(array(acceptanceCatalog?.entries).map((item) => [item?.id, item]));
  for (const expected of CANONICAL_ROUTE_CASES) {
    const actual = actualById.get(expected.id);
    if (!actual) continue;
    const expectedShape = {
      id: expected.id,
      kind: expected.kind,
      routeId: expected.routeId,
      surfaceId: expected.surfaceId,
      path: expected.path,
      theme: expected.theme,
      viewport: expected.viewport,
      acceptanceIds: expected.acceptanceIds,
      selectors: {
        targets: expected.selectors,
        title: expected.titleSelector,
        primaryAction: expected.primaryActionSelector,
      },
      status: "captured",
    };
    for (const [field, value] of Object.entries(expectedShape)) {
      if (!jsonEqual(actual[field], value)) {
        failures.push(`visual/accessibility case ${expected.id} ${field} mismatch`);
      }
    }
    for (const acceptanceId of expected.acceptanceIds) {
      validateAcceptanceLocator({
        catalogEntry: catalogById.get(acceptanceId),
        acceptanceId,
        surfaceId: expected.surfaceId,
        source: SUMMARY_PATHS.visual,
        locator: `cases[acceptanceIds includes ${JSON.stringify(acceptanceId)}]`,
        label: `visual/accessibility case ${expected.id}`,
        failures,
      });
    }
  }
  expectNumber(summary.reviewManifest?.expected, 23, "route review-image expectation", failures);
  expectNumber(summary.reviewManifest?.generated, 23, "route review-image generation count", failures);
  expectNumber(array(summary.reviewImages).length, 23, "route review-image inventory", failures);
  if (array(summary.captureFailures).length > 0) failures.push("visual/accessibility summary contains capture failures");
}

function validateSharedSummary(summary, acceptanceCatalog, failures) {
  if (!summary) {
    failures.push("shared-state summary is required");
    return;
  }
  if (!["pass", "captured-with-findings"].includes(summary.status)) {
    failures.push(`shared-state status must be pass or captured-with-findings; received ${summary.status}`);
  }
  expectValue(summary.filteredRun, false, "shared-state filteredRun", failures);
  expectNumber(summary.expectedCurrentCaptures, 26, "shared-state current expectation", failures);
  expectNumber(summary.expectedFutureGates, 6, "shared-state future-gate expectation", failures);
  expectNumber(summary.currentCaptures?.checked, 26, "shared-state current case count", failures);
  expectNumber(summary.currentCaptures?.succeeded, 26, "shared-state successful current count", failures);
  expectNumber(summary.currentCaptures?.failed, 0, "shared-state failed current count", failures);
  const currentCases = array(summary.currentCases);
  const futureGates = array(summary.futureGates);
  expectNumber(currentCases.length, 26, "shared-state current inventory", failures);
  expectNumber(futureGates.length, 6, "shared-state future-gate inventory", failures);
  expectExactMembers(
    currentCases.map((item) => item?.id),
    CANONICAL_CURRENT_SHARED_STATES.map((item) => item.id),
    "shared-state exact current IDs",
    failures,
  );
  expectExactMembers(
    futureGates.map((item) => item?.id),
    CANONICAL_FUTURE_SHARED_STATES.map((item) => item.id),
    "shared-state exact future IDs",
    failures,
  );
  const currentById = new Map(currentCases.map((item) => [item?.id, item]));
  const futureById = new Map(futureGates.map((item) => [item?.id, item]));
  const catalogById = new Map(array(acceptanceCatalog?.entries).map((item) => [item?.id, item]));
  const approvedStateById = new Map(
    APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates.map((item) => [item.id, item]),
  );
  for (const expected of CANONICAL_CURRENT_SHARED_STATES) {
    const actual = currentById.get(expected.id);
    if (!actual) continue;
    const expectedShape = {
      id: expected.id,
      kind: "shared-state",
      surfaceId: expected.surfaceId,
      path: expected.path,
      theme: expected.theme,
      viewport: BASELINE_VIEWPORTS[expected.viewportId],
      acceptanceIds: expected.acceptanceIds,
      selectors: {
        expected: expected.expected.selector,
        title: expected.titleSelector,
        primaryAction: expected.primaryActionSelector,
      },
      status: "captured",
    };
    for (const [field, value] of Object.entries(expectedShape)) {
      if (!jsonEqual(actual[field], value)) failures.push(`shared-state current case ${expected.id} ${field} mismatch`);
    }
    const approved = approvedStateById.get(expected.id);
    if (!approved
      || approved.source !== SUMMARY_PATHS.shared
      || approved.surfaceId !== expected.surfaceId
      || approved.state !== expected.state
      || approved.expectedStatus !== "legacy-baseline"
      || approved.targetPhase !== 0
      || !jsonEqual(approved.acceptanceIds, expected.acceptanceIds)) {
      failures.push(`shared-state current policy mapping mismatch: ${expected.id}`);
    }
    for (const acceptanceId of expected.acceptanceIds) {
      const entry = catalogById.get(acceptanceId);
      if (!entry || entry.surfaceId !== expected.surfaceId || entry.expectedStatus !== "legacy-baseline") {
        failures.push(`shared-state current acceptance mapping mismatch: ${expected.id} -> ${acceptanceId}`);
      }
    }
  }
  for (const expected of CANONICAL_FUTURE_SHARED_STATES) {
    const actual = futureById.get(expected.id);
    if (!actual) continue;
    const expectedShape = {
      id: expected.id,
      surfaceId: expected.surfaceId,
      state: expected.state,
      status: "future-gate",
      targetPhase: 1,
      targetCommand: expected.targetCommand,
      screenshotClaim: false,
      acceptanceIds: expected.acceptanceIds,
    };
    for (const [field, value] of Object.entries(expectedShape)) {
      if (!jsonEqual(actual[field], value)) failures.push(`shared-state future gate ${expected.id} ${field} mismatch`);
    }
    const approved = approvedStateById.get(expected.id);
    if (!approved
      || approved.source !== SUMMARY_PATHS.shared
      || approved.surfaceId !== expected.surfaceId
      || approved.state !== expected.state
      || approved.expectedStatus !== "future-gate"
      || approved.targetPhase !== 1
      || approved.targetCommand !== expected.targetCommand
      || !jsonEqual(approved.acceptanceIds, expected.acceptanceIds)) {
      failures.push(`shared-state future policy mapping mismatch: ${expected.id}`);
    }
    for (const acceptanceId of expected.acceptanceIds) {
      const entry = catalogById.get(acceptanceId);
      if (!entry || entry.surfaceId !== expected.surfaceId || entry.expectedStatus !== "future-gate") {
        failures.push(`shared-state future acceptance mapping mismatch: ${expected.id} -> ${acceptanceId}`);
      }
    }
  }
  expectNumber(summary.reviewManifest?.expected, 6, "shared-state review-image expectation", failures);
  expectNumber(summary.reviewManifest?.generated, 6, "shared-state review-image generation count", failures);
  expectNumber(array(summary.reviewImages).length, 6, "shared-state review-image inventory", failures);
  if (array(summary.captureFailures).length > 0) failures.push("shared-state summary contains capture failures");
}

function validatePerformanceSummary(summary, failures) {
  if (!summary) {
    failures.push("performance summary is required");
    return;
  }
  if (!["pass", "captured-with-findings"].includes(summary.status)) {
    failures.push(`performance status must be pass or captured-with-findings; received ${summary.status}`);
  }
  expectValue(summary.filteredRun, false, "performance filteredRun", failures);
  const results = array(summary.results);
  if (
    summary.expectedRuns !== 12
    || summary.runs?.checked !== 12
    || summary.runs?.succeeded !== 12
    || summary.runs?.failed !== 0
    || results.length !== 12
  ) failures.push("performance evidence must contain exactly 12 successful runs and zero failures");
  expectExactMembers(
    results.map((item) => item?.id),
    CANONICAL_PERFORMANCE_CASES.map((item) => item.id),
    "performance exact run IDs",
    failures,
  );
  const actualById = new Map(results.map((item) => [item?.id, item]));
  for (const expected of CANONICAL_PERFORMANCE_CASES) {
    const actual = actualById.get(expected.id);
    if (!actual) continue;
    const expectedShape = {
      id: expected.id,
      routeId: expected.routeId,
      surfaceId: expected.surfaceId,
      path: expected.path,
      theme: expected.theme,
      viewport: expected.viewport,
      coldContext: true,
      status: "captured",
    };
    for (const [field, value] of Object.entries(expectedShape)) {
      if (!jsonEqual(actual[field], value)) failures.push(`performance run ${expected.id} ${field} mismatch`);
    }
    if (actual.metrics?.labInteractionLabel !== expected.labInteraction.label) {
      failures.push(`performance run ${expected.id} lab interaction locator mismatch`);
    }
  }
  if (array(summary.captureFailures).length > 0) failures.push("performance summary contains capture failures");
  if (!summary.bundle || !Array.isArray(summary.bundle.chunks)) failures.push("performance bundle inventory is required");
}

function validateLegacySummary(summary, allowlist, failures) {
  if (!summary) {
    failures.push("legacy UI-contract summary is required");
    return 0;
  }
  if (!["pass", "expected-legacy-findings"].includes(summary.status)) {
    failures.push(`legacy UI-contract status is invalid: ${summary.status}`);
  }
  const allowlistEntries = array(allowlist?.findings);
  let unexpected = 0;
  for (const finding of array(summary.findings)) {
    const match = allowlistEntries.some((entry) => {
      if (entry?.path !== finding?.path) return false;
      try {
        return new RegExp(entry.message).test(String(finding?.message || ""));
      } catch {
        return false;
      }
    });
    if (!match) {
      unexpected += 1;
      failures.push(`unexpected legacy UI-contract finding: ${finding?.path}: ${finding?.message}`);
    }
  }
  if (summary.status === "pass") {
    expectNumber(summary.rawCommandExit, 0, "legacy UI-contract raw exit", failures);
    expectNumber(array(summary.findings).length, 0, "legacy UI-contract green finding count", failures);
  } else {
    expectNumber(summary.rawCommandExit, 1, "legacy UI-contract raw exit", failures);
    if (array(summary.findings).length === 0) failures.push("legacy UI-contract expected finding list is empty");
  }
  return unexpected;
}

function countUnexpectedLegacyFindings(summary, allowlist) {
  const allowlistEntries = array(allowlist?.findings);
  return array(summary?.findings).filter((finding) => !allowlistEntries.some((entry) => {
    if (entry?.path !== finding?.path) return false;
    try {
      return new RegExp(entry.message).test(String(finding?.message || ""));
    } catch {
      return false;
    }
  })).length;
}

function validatePreviewSummary(summary, verification, nowMs, failures) {
  if (!summary) {
    failures.push("live Preview evidence is required");
    return;
  }
  expectExactObjectKeys(summary, [
    "schemaVersion", "status", "checkedAt", "evidenceCapturedAt", "evidenceExpiresAt",
    "branch", "resourceIsolation", "applicationBindings", "providerEvidenceSha256",
    "minimalWebArtifactSha256", "hashes", "git", "checks", "postgres", "r2",
  ], "live Preview summary", failures);
  expectValue(summary.schemaVersion, 1, "live Preview schemaVersion", failures);
  expectValue(summary.status, "pass", "live Preview status", failures);
  expectValue(summary.branch, PREVIEW_BRANCH, "live Preview branch", failures);
  expectValue(summary.resourceIsolation, "pass", "Preview resource isolation", failures);
  expectValue(summary.applicationBindings, "deferred-to-phase1", "Preview application bindings", failures);
  const checkedAt = Date.parse(summary.checkedAt);
  const capturedAt = Date.parse(summary.evidenceCapturedAt);
  const expiresAt = Date.parse(summary.evidenceExpiresAt);
  if (!isExactIsoDate(summary.checkedAt)
    || !isExactIsoDate(summary.evidenceCapturedAt)
    || !isExactIsoDate(summary.evidenceExpiresAt)
    || !Number.isFinite(checkedAt)
    || !Number.isFinite(capturedAt)
    || !Number.isFinite(expiresAt)) {
    failures.push("live Preview evidence timestamps must be valid ISO dates");
  } else {
    if (capturedAt > checkedAt) failures.push("live Preview evidence capture must not be later than its check");
    if (checkedAt > nowMs + 5 * 60 * 1000) failures.push("live Preview evidence is dated in the future");
    if (nowMs - checkedAt > 7 * 24 * 60 * 60 * 1000) failures.push("live Preview evidence is older than seven days");
    if (expiresAt <= nowMs) failures.push("live Preview evidence is expired");
    if (expiresAt - capturedAt !== 7 * 24 * 60 * 60 * 1000) {
      failures.push("live Preview evidence expiry must be exactly seven days after capture");
    }
  }
  if (!verification) {
    failures.push("local Preview verification is required");
  } else {
    validateFileRecord(verification.providerEvidenceRecord, "Preview provider evidence", failures);
    if (verification.providerEvidenceRecord?.requireTracked !== false
      || verification.providerEvidenceRecord?.gitTracked !== false) {
      failures.push("Preview provider evidence must remain untracked");
    }
    if (!Number.isInteger(verification.providerEvidenceRecord?.mode)
      || (verification.providerEvidenceRecord.mode & 0o077) !== 0) {
      failures.push("Preview provider evidence permissions must remain owner-only");
    }
    const providerCheckKeys = [
      "schemaVersionExact", "topLevelShapeExact", "pagesShapeExact", "branchExact",
      "commitValid", "captureTimeExact", "deploymentPassed", "providerFileOwnerOnly",
      "providerFileUntracked",
    ];
    expectExactObjectKeys(
      verification.providerChecks,
      providerCheckKeys,
      "local Preview provider checks",
      failures,
    );
    for (const key of providerCheckKeys) {
      if (verification.providerChecks?.[key] !== true) {
        failures.push(`local Preview provider verification failed: ${key}`);
      }
    }
    if (!/^[a-f0-9]{40}$/.test(String(verification.expectedCommit || ""))) {
      failures.push("Preview expected deployment commit is invalid");
    }
    if (verification.expectedBranch !== PREVIEW_BRANCH) failures.push("Preview provider branch mismatch");
    if (verification.providerCapturedAt !== summary.evidenceCapturedAt) {
      failures.push("Preview provider capture timestamp does not match the live summary");
    }
    if (summary.providerEvidenceSha256 !== verification.providerEvidenceRecord?.actualSha256) {
      failures.push("Preview summary is not SHA-256 bound to current provider evidence");
    }
    if (summary.minimalWebArtifactSha256 !== verification.minimalWebArtifactSha256) {
      failures.push("Preview minimal probe artifact fingerprint does not match a local deterministic rebuild");
    }
    const localGitKeys = [
      "trustedExecutable", "originUrlExact", "currentBranchExact",
      "localBranchExists", "expectedCommitExists", "originBranchContainsCommit",
      "originBranchExact", "remoteBranchExact", "deployedCommitAncestorOfHead", "descendantChangesRestricted",
      "replaceRefsAbsent", "graftsAbsent", "indexFlagsSafe", "runtimeFilesMatchExpectedCommit",
    ];
    expectExactObjectKeys(verification.git, localGitKeys, "local Preview Git verification", failures);
    for (const key of localGitKeys) {
      if (verification.git?.[key] !== true) failures.push(`current Preview Git verification failed: ${key}`);
    }
  }
  expectExactObjectKeys(summary.hashes, [
    "webOriginHash", "apiOriginHash", "cloudflareAccountIdHash", "pagesProjectIdHash",
    "renderWorkspaceIdHash", "postgresResourceIdHash", "r2BucketIdentityHash",
  ], "live Preview hashes", failures);
  for (const [key, value] of Object.entries(summary.hashes || {})) {
    if (!isSha256(value)) failures.push(`live Preview hash is invalid: ${key}`);
  }
  const requiredChecks = [
    "minimalWebArtifactMatches",
    "exactWebConfiguration",
    "apiHealthAndInternalLlmVerified",
    "previewOnlyCors",
    "providerEvidenceFresh",
    "providerIdentitiesDisjoint",
    "postgresIsolation",
    "r2Isolation",
  ];
  expectExactObjectKeys(summary.checks, requiredChecks, "live Preview checks", failures);
  for (const key of requiredChecks) {
    if (summary.checks?.[key] !== true) failures.push(`Preview check failed or production resources may be reused: ${key}`);
  }
  const requiredGitChecks = [
    "worktreeClean",
    "originUrlExact",
    "currentBranchExact",
    "localBranchExists",
    "originBranchContainsCommit",
    "remoteBranchExact",
    "deployedCommitAncestorOfHead",
    "descendantChangesRestricted",
    "replaceRefsAbsent",
    "graftsAbsent",
    "indexFlagsSafe",
    "runtimeFilesMatchExpectedCommit",
  ];
  expectExactObjectKeys(summary.git, requiredGitChecks, "live Preview Git evidence", failures);
  for (const key of requiredGitChecks) {
    if (summary.git?.[key] !== true) failures.push(`Preview Git evidence failed: ${key}`);
  }
  expectValue(summary.postgres?.status, "pass", "Preview PostgreSQL status", failures);
  expectValue(summary.postgres?.schemaVersion, 1, "Preview PostgreSQL schemaVersion", failures);
  expectValue(summary.postgres?.check, "frontend-v2-preview-postgres", "Preview PostgreSQL check", failures);
  expectValue(summary.postgres?.evidenceSha256, summary.providerEvidenceSha256,
    "Preview PostgreSQL provider evidence hash", failures);
  expectNumber(summary.postgres?.publicBaseTableCount, 0, "Preview PostgreSQL public table count", failures);
  expectValue(summary.r2?.status, "pass", "Preview R2 status", failures);
  expectValue(summary.r2?.schemaVersion, 1, "Preview R2 schemaVersion", failures);
  expectValue(summary.r2?.check, "frontend-v2-preview-r2", "Preview R2 check", failures);
  expectValue(summary.r2?.evidenceSha256, summary.providerEvidenceSha256,
    "Preview R2 provider evidence hash", failures);
  if (!isSha256(summary.minimalWebArtifactSha256)) failures.push("Preview minimal probe artifact hash is invalid");
}

function validateNestedGates(results, failures) {
  const byId = new Map(array(results).map((item) => [item?.id, item]));
  for (const gate of PHASE0_NESTED_GATES) {
    const result = byId.get(gate.id);
    if (!result) {
      failures.push(`nested command result is missing: ${gate.id}`);
      continue;
    }
    if (result.status !== "pass" || result.exitCode !== 0) {
      failures.push(`nested command failed: ${gate.id} (exit ${String(result.exitCode)})`);
    }
  }
}

function validateRuntimeMascot(runtimeMascot, failures) {
  if (!runtimeMascot) {
    failures.push(`runtime mascot manifest is required: ${QUANTY_MANIFEST_RELATIVE}`);
    return;
  }
  expectValue(runtimeMascot.status, "pass", "runtime mascot gate status", failures);
  expectNumber(runtimeMascot.logicalAssets, 16, "runtime mascot logical asset count", failures);
  expectNumber(runtimeMascot.masters, 16, "runtime mascot master count", failures);
  expectNumber(runtimeMascot.variants, 48, "runtime mascot variant count", failures);
  expectValue(runtimeMascot.manifest?.schemaVersion, 1, "runtime mascot manifest schemaVersion", failures);
  expectValue(runtimeMascot.manifest?.kind, "quanty-runtime-assets", "runtime mascot manifest kind", failures);
  if (JSON.stringify(runtimeMascot.manifest?.variantWidths) !== JSON.stringify([160, 320, 640])) {
    failures.push("runtime mascot variantWidths must be [160,320,640]");
  }
  expectNumber(runtimeMascot.manifest?.sourceDesignManifest?.assetCount, 36,
    "runtime mascot source design asset count", failures);
  validateFileRecord(runtimeMascot.sourceDesignManifestRecord, "runtime mascot source design manifest", failures);
  expectNumber(array(runtimeMascot.manifest?.assets).length, 16, "runtime mascot manifest asset inventory", failures);
  expectUnique(array(runtimeMascot.manifest?.assets).map((item) => item?.logicalName),
    "runtime mascot logical names", failures);
  for (const asset of array(runtimeMascot.manifest?.assets)) {
    const variantWidths = array(asset?.variants).map((item) => item?.width);
    if (JSON.stringify(variantWidths) !== JSON.stringify([160, 320, 640])) {
      failures.push(`runtime mascot variants are not ordered 160/320/640: ${asset?.logicalName || "(missing name)"}`);
    }
  }
  if (array(runtimeMascot.fileRecords).length !== 64) {
    failures.push(`runtime mascot manifest must cover 64 files; received ${array(runtimeMascot.fileRecords).length}`);
  }
  for (const record of array(runtimeMascot.fileRecords)) validateFileRecord(record, "runtime mascot asset", failures);
}

function loadRuntimeMascotEvidence(root, commandResult, loadFailures, trackedFiles) {
  const manifestPath = path.join(root, QUANTY_MANIFEST_RELATIVE);
  if (!fs.existsSync(manifestPath)) {
    loadFailures.push(`runtime mascot manifest is missing: ${QUANTY_MANIFEST_RELATIVE}`);
    return null;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    loadFailures.push(`runtime mascot manifest is invalid JSON: ${error.message}`);
    return null;
  }
  const assets = array(manifest.assets);
  const fileRecords = [];
  for (const asset of assets) {
    if (asset?.master?.path) fileRecords.push(fileRecord(
      root,
      asset.master.path,
      asset.master,
      asset.master.path,
      APPROVED_FILE_SCOPES.runtimeMascot,
      trackedFiles,
      { requireTracked: true },
    ));
    for (const variant of array(asset?.variants)) {
      if (variant?.path) fileRecords.push(fileRecord(
        root,
        variant.path,
        variant,
        variant.path,
        APPROVED_FILE_SCOPES.runtimeMascot,
        trackedFiles,
        { requireTracked: true },
      ));
    }
  }
  const parsedGate = parseLastJson(commandResult?.stdout || commandResult?.stderr || "");
  const counts = manifest.counts || {};
  const sourceDesignManifestRecord = fileRecord(
    root,
    manifest.sourceDesignManifest?.path,
    manifest.sourceDesignManifest,
    manifest.sourceDesignManifest?.path,
    APPROVED_FILE_SCOPES.productionManifest,
    trackedFiles,
    { requireTracked: true },
  );
  return {
    status: commandResult?.status === "pass"
      && parsedGate?.status === "pass"
      && Number(parsedGate?.logicalAssets) === PHASE0_EXPECTATIONS.runtimeMascotAssets
      && Number(parsedGate?.masters?.validated) === PHASE0_EXPECTATIONS.runtimeMascotMasters
      && Number(parsedGate?.responsiveWebp?.validated) === PHASE0_EXPECTATIONS.runtimeMascotVariants
      ? "pass"
      : "fail",
    logicalAssets: Number(counts.logicalAssets ?? counts.assets ?? assets.length),
    masters: Number(counts.masters ?? assets.filter((asset) => asset?.master).length),
    variants: Number(counts.optimizedVariants ?? counts.variants
      ?? assets.reduce((sum, asset) => sum + array(asset?.variants).length, 0)),
    manifest,
    sourceDesignManifestRecord,
    fileRecords,
  };
}

function fileRecord(
  root,
  relativePath,
  expected = {},
  displayPath = relativePath,
  approvedPrefixes = [],
  trackedFiles = new Set(),
  options = {},
) {
  return readPhase0FileRecord({
    root,
    relativePath,
    displayPath,
    expected,
    approvedPrefixes,
    trackedFiles,
    requireTracked: options.requireTracked === true,
  });
}

function readTrackedFileSet(root, loadFailures) {
  try {
    assertTrustedGitExecutable();
    const result = runTrustedGit(root, ["ls-files", "-z"]);
    if (result.status !== 0 || result.error) {
      throw new Error(result.error?.message || result.stderr.trim() || `exit ${String(result.status)}`);
    }
    const tracked = new Set();
    for (const source of result.stdout.split("\0").filter(Boolean)) {
      tracked.add(normalizeRepoRelativePath(source));
    }
    return tracked;
  } catch (error) {
    loadFailures.push(`Git tracked-file inventory failed: ${error.message}`);
    return new Set();
  }
}

function assertTrustedGitExecutable() {
  assertTrustedExecutable(TRUSTED_GIT_PATH, "Git");
}

function assertTrustedExecutable(executable, label) {
  let stats;
  try {
    stats = fs.lstatSync(executable);
    fs.accessSync(executable, fs.constants.X_OK);
  } catch (error) {
    throw new Error(`trusted ${label} executable is unavailable: ${error.message}`);
  }
  if (!stats.isFile() || stats.isSymbolicLink() || stats.uid !== 0 || (stats.mode & 0o022) !== 0) {
    throw new Error(`trusted ${label} executable has unsafe ownership or permissions`);
  }
}

function trustedGitEnvironment() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function runTrustedGit(root, args, timeout = 10_000) {
  return spawnSync(TRUSTED_GIT_PATH, [
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "-c", "core.ignoreStat=false",
    "-C", path.resolve(root),
    ...args,
  ], {
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    env: trustedGitEnvironment(),
  });
}

function runTrustedRemoteGit(request) {
  return spawnSync(request.command, request.args, {
    cwd: request.cwd,
    encoding: "utf8",
    timeout: request.timeoutMs,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    env: request.env,
  });
}

function runTrustedRemoteApi(request) {
  assertTrustedExecutable(TRUSTED_CURL_PATH, "curl");
  return spawnSync(request.command, request.args, {
    cwd: request.cwd,
    encoding: "utf8",
    timeout: request.timeoutMs,
    maxBuffer: 256 * 1024,
    windowsHide: true,
    env: request.env,
  });
}

function exactRemoteLine(output, expectedCommit) {
  const actual = String(output || "");
  const expected = `${expectedCommit}\t${GITHUB_BRANCH_REF}`;
  return actual === expected || actual === `${expected}\n` || actual === `${expected}\r\n`;
}

function parseGitHubBranchSha(result) {
  if (result?.status !== 0 || typeof result.stdout !== "string"
    || Buffer.byteLength(result.stdout, "utf8") > 256 * 1024) return "";
  const statusDelimiter = result.stdout.lastIndexOf("\n");
  if (statusDelimiter < 0 || result.stdout.slice(statusDelimiter + 1) !== "200") return "";
  const responseBody = result.stdout.slice(0, statusDelimiter);
  let value;
  try {
    value = JSON.parse(responseBody);
  } catch {
    return "";
  }
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.ref !== GITHUB_BRANCH_REF
    || !value.object || typeof value.object !== "object" || Array.isArray(value.object)
    || value.object.type !== "commit"
    || !/^[a-f0-9]{40}$/.test(String(value.object.sha || ""))) return "";
  return value.object.sha;
}

function normalizeRepoRelativePath(value) {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error("repository path must be a non-empty canonical string");
  }
  if (/[\u0000-\u001f\u007f\\]/.test(value)
    || path.posix.isAbsolute(value)
    || path.win32.isAbsolute(value)) {
    throw new Error("repository path is absolute or contains unsafe characters");
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")
    || path.posix.normalize(value) !== value) {
    throw new Error("repository path contains a traversal or non-canonical segment");
  }
  return value;
}

function isContainedPath(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return Boolean(relative)
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

export function readPhase0FileRecord({
  root,
  relativePath,
  displayPath = relativePath,
  expected = {},
  approvedPrefixes = [],
  trackedFiles = new Set(),
  requireTracked = false,
}) {
  const record = {
    path: displayPath,
    repoPath: "",
    expectedBytes: Number.isFinite(Number(expected?.bytes)) ? Number(expected.bytes) : null,
    actualBytes: null,
    expectedSha256: expected?.sha256 || null,
    actualSha256: null,
    pathApproved: false,
    regularFile: false,
    realpathContained: false,
    symbolicLink: false,
    requireTracked,
    gitTracked: false,
    mode: null,
  };
  let handle;
  try {
    const rootRealPath = fs.realpathSync(path.resolve(root));
    const normalized = normalizeRepoRelativePath(relativePath);
    record.repoPath = normalized;
    record.pathApproved = array(approvedPrefixes).some((prefix) => (
      prefix.endsWith("/") ? normalized.startsWith(prefix) : normalized === prefix
    ));
    if (!record.pathApproved) throw new Error("path is outside its approved Phase 0 prefix");
    const absolutePath = path.resolve(rootRealPath, ...normalized.split("/"));
    if (!isContainedPath(rootRealPath, absolutePath)) throw new Error("path escapes repository root");
    const linkStats = fs.lstatSync(absolutePath);
    record.mode = linkStats.mode;
    record.symbolicLink = linkStats.isSymbolicLink();
    if (record.symbolicLink || !linkStats.isFile()) throw new Error("path must be a regular non-symlink file");
    record.regularFile = true;
    const resolved = fs.realpathSync(absolutePath);
    record.realpathContained = isContainedPath(rootRealPath, resolved);
    if (!record.realpathContained || resolved !== absolutePath) {
      throw new Error("realpath is not the approved repository file");
    }
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    handle = fs.openSync(absolutePath, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(handle);
    if (!before.isFile() || before.dev !== linkStats.dev || before.ino !== linkStats.ino) {
      throw new Error("file identity changed before hashing");
    }
    const data = fs.readFileSync(handle);
    const after = fs.fstatSync(handle);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs || data.length !== before.size) {
      throw new Error("file changed while being hashed");
    }
    record.actualBytes = data.length;
    record.actualSha256 = createHash("sha256").update(data).digest("hex");
    record.gitTracked = trackedFiles instanceof Set && trackedFiles.has(normalized);
    Object.defineProperty(record, "_bytes", {
      value: data,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  } catch (error) {
    record.readError = error?.message || String(error);
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
  return record;
}

function validateFileRecord(record, label, failures) {
  if (!record || !record.path) {
    failures.push(`${label} record is missing a path`);
    return;
  }
  if (record.readError) failures.push(`${label} cannot be read: ${record.path}: ${record.readError}`);
  if (record.pathApproved !== true) failures.push(`${label} is outside its approved repository prefix: ${record.path}`);
  if (record.regularFile !== true || record.symbolicLink === true) {
    failures.push(`${label} must be a regular non-symlink file: ${record.path}`);
  }
  if (record.realpathContained !== true) failures.push(`${label} realpath escapes the repository: ${record.path}`);
  if (record.requireTracked === true && record.gitTracked !== true) {
    failures.push(`${label} must be tracked by Git: ${record.path}`);
  }
  if (!isSha256(record.expectedSha256) || record.expectedSha256 !== record.actualSha256) {
    failures.push(`${label} SHA-256 mismatch: ${record.path}`);
  }
  if (record.expectedBytes !== null && record.expectedBytes !== record.actualBytes) {
    failures.push(`${label} byte-size mismatch: ${record.path}`);
  }
}

function validateAcceptanceLocator({
  catalogEntry,
  acceptanceId,
  surfaceId,
  source,
  locator,
  label,
  failures,
}) {
  if (!catalogEntry
    || catalogEntry.id !== acceptanceId
    || catalogEntry.surfaceId !== surfaceId
    || catalogEntry.expectedStatus !== "legacy-baseline"
    || catalogEntry.phase0Evidence?.path !== source
    || catalogEntry.phase0Evidence?.locator !== locator) {
    failures.push(`${label} acceptance locator mismatch: ${acceptanceId}`);
  }
}

function expectExactMembers(actualValue, expectedValue, label, failures) {
  const actual = array(actualValue);
  const expected = array(expectedValue);
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  const duplicates = actual.filter((item, index) => actual.indexOf(item) !== index);
  if (missing.length || extra.length || duplicates.length || actual.length !== expected.length) {
    failures.push(
      `${label} mismatch; missing: ${missing.join(", ") || "none"}; `
      + `extra: ${extra.join(", ") || "none"}; duplicates: ${unique(duplicates).join(", ") || "none"}`,
    );
  }
}

function expectExactObjectKeys(value, keys, label, failures) {
  if (!exactObjectKeys(value, keys)) {
    const actual = value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).sort().join(", ")
      : "not-an-object";
    failures.push(`${label} keys mismatch; received: ${actual}`);
  }
}

function exactObjectKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function expectUnique(values, label, failures) {
  const duplicates = unique(values.filter((item, index) => values.indexOf(item) !== index));
  if (duplicates.length) failures.push(`${label} contain duplicates: ${duplicates.join(", ")}`);
}

function expectValue(actual, expected, label, failures) {
  if (actual !== expected) failures.push(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`);
}

function expectNumber(actual, expected, label, failures) {
  if (Number(actual) !== Number(expected)) failures.push(`${label} must be ${expected}; received ${String(actual)}`);
}

function atomicWriteText(targetPath, value) {
  const output = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o644);
    fs.fchmodSync(handle, 0o644);
    fs.writeFileSync(handle, value, "utf8");
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temporary, output);
  } catch (error) {
    if (handle !== undefined) fs.closeSync(handle);
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

function readExistingReview(reviewPath) {
  const output = path.resolve(reviewPath);
  let stats;
  try {
    stats = fs.lstatSync(output);
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, status: null };
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) return { exists: true, status: null };
  const source = fs.readFileSync(output, "utf8");
  const statuses = [...source.matchAll(/^Status: ([^\r\n]+)$/gm)].map((match) => match[1]);
  return {
    exists: true,
    status: statuses.includes("accepted")
      ? "accepted"
      : (statuses.length === 1 ? statuses[0] : null),
  };
}

function renderInvalidatedPhase0Review(summary) {
  return `# QuantGym Frontend Platform Upgrade Phase 0 Review

Date: 2026-07-10
Status: invalidated

The previously generated ready-for-review packet is invalid because the current Phase 0 gate is not ready.

## Current Gate Failures

\`\`\`json
${JSON.stringify(array(summary?.failures), null, 2)}
\`\`\`
`;
}

function parseLastJson(output) {
  const text = String(output || "");
  for (let index = text.lastIndexOf("{"); index >= 0; index = text.lastIndexOf("{", index - 1)) {
    try {
      return JSON.parse(text.slice(index));
    } catch {}
  }
  return null;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function jsonEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function unique(values) {
  return [...new Set(values)];
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}

function isExactIsoDate(value) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function tail(value, limit = 3000) {
  const text = String(value || "");
  return text.length > limit ? text.slice(-limit) : text;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runPhase0Check().then(({ summary }) => {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (summary.status !== "ready-for-review") process.exitCode = 1;
  }).catch((error) => {
    process.stderr.write(`${error?.stack || error?.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
