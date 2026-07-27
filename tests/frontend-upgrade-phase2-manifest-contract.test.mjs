import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);
const sorted = (values) => [...values].sort();
const isAncestor = (ancestor, descendant) => {
  execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: root,
    stdio: "ignore",
  });
  return true;
};

const [
  manifest,
  previewContract,
  acceptanceCatalog,
  phaseRegistry,
  surfaceContracts,
  designSystem,
  phase1PreviewContract,
] = await Promise.all([
  readJson("docs/frontend-upgrade/phase-2-acceptance-manifest.json"),
  readJson("docs/frontend-upgrade/phase-2-preview-contract.json"),
  readJson("docs/frontend-upgrade/acceptance-catalog.json"),
  readJson("docs/frontend-upgrade/phase-registry.json"),
  readJson("docs/frontend-upgrade/surface-contracts.json"),
  readJson("docs/frontend-upgrade/design-system-contract.json"),
  readJson("docs/frontend-upgrade/phase-1-preview-contract.json"),
]);

const phase2Registry = phaseRegistry.phases.find((phase) => phase.id === 2);
const phase2Surfaces = surfaceContracts.surfaces.filter((surface) => surface.phase === 2);
const selectedSurfaceIds = phase2Surfaces.map((surface) => surface.id);
const selectedCatalogEntries = acceptanceCatalog.entries.filter(
  (entry) => selectedSurfaceIds.includes(entry.surfaceId),
);
const catalogById = new Map(selectedCatalogEntries.map((entry) => [entry.id, entry]));
const manifestGateById = new Map(manifest.gates.map((gate) => [gate.id, gate]));
const mutationById = new Map(manifest.mutations.map((mutation) => [mutation.id, mutation]));
const viewportById = new Map(designSystem.viewports.map((viewport) => [viewport.id, viewport]));

test("maps the exact Phase 2 routes, mutations, and recovery-state matrix", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.phase, 2);
  assert.equal(manifest.name, "daily-training-loop");
  assert.deepEqual(manifest.routes.map((route) => route.id), phase2Registry.routes);
  assert.deepEqual(manifest.routes.map((route) => route.surfaceId), selectedSurfaceIds);
  assert.equal(manifest.routes.length, 3);

  const expectedMutationIds = phase2Surfaces.flatMap((surface) => surface.mutations);
  assert.deepEqual(manifest.mutations.map((mutation) => mutation.id), expectedMutationIds);
  assert.equal(manifest.mutations.length, 11);
  assert.deepEqual(manifest.recoveryStates, [
    "recoverable-error",
    "non-recoverable-error",
    "offline-draft",
    "permission-denied",
    "stale-version-conflict",
    "retry",
  ]);
  assert.equal(manifest.recoveryStates.length, 6);

  for (const route of manifest.routes) {
    const surface = phase2Surfaces.find((candidate) => candidate.routeId === route.id);
    assert.ok(surface, "missing surface contract for " + route.id);
    assert.deepEqual(route.viewports, surface.responsive.requiredViewports);
    assert.deepEqual(route.mutationIds, surface.mutations);
    assert.deepEqual(route.routeGateIds, surface.acceptanceChecks);
    assert.deepEqual(route.themes, ["light", "dark"]);
  }

  for (const mutation of manifest.mutations) {
    const surface = phase2Surfaces.find((candidate) => candidate.id === mutation.surfaceId);
    assert.ok(surface.mutations.includes(mutation.id));
    assert.equal(mutation.routeId, surface.routeId);
    assert.deepEqual(Object.keys(mutation.recoveryGateIds), manifest.recoveryStates);
    for (const state of manifest.recoveryStates) {
      assert.equal(
        mutation.recoveryGateIds[state],
        "mutation:" + mutation.id + ":" + state,
      );
    }
  }

  assert.equal(
    mutationById.get("problems.complete").retryIdempotencyGateId,
    "mutation:problems.complete:retry-idempotency",
  );
});

test("activates all and only the 76 catalog IDs as non-legacy pass results", () => {
  const manifestIds = manifest.gates.map((gate) => gate.id);
  const catalogIds = selectedCatalogEntries.map((entry) => entry.id);
  assert.equal(new Set(manifestIds).size, manifestIds.length);
  assert.equal(manifestIds.length, 76);
  assert.equal(manifest.targetGateCount, 76);
  assert.deepEqual(sorted(manifestIds), sorted(catalogIds));

  for (const gate of manifest.gates) {
    const catalogEntry = catalogById.get(gate.id);
    assert.ok(catalogEntry, "missing catalog entry for " + gate.id);
    assert.equal(gate.surfaceId, catalogEntry.surfaceId);
    assert.equal(gate.kind, catalogEntry.kind);
    assert.equal(gate.sourceCatalogTargetPhase, catalogEntry.targetPhase);
    assert.equal(gate.sourceCatalogExpectedStatus, catalogEntry.expectedStatus);
    assert.equal(gate.phase2RequiredResultStatus, "pass");
    assert.ok(
      gate.phase2EvidencePath.startsWith(
        "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-",
      ),
    );
    assert.equal(gate.resultSelector, 'results[id="' + gate.id + '"]');

    if (gate.kind === "mutation-recovery") {
      assert.ok(mutationById.has(gate.mutationId));
      assert.ok(manifest.recoveryStates.includes(gate.state));
      assert.equal(gate.id, "mutation:" + gate.mutationId + ":" + gate.state);
    }
    if (gate.kind === "retry-idempotency") {
      assert.equal(gate.mutationId, "problems.complete");
      assert.equal(gate.id, "mutation:problems.complete:retry-idempotency");
    }
  }

  const sourceStatusCounts = Object.fromEntries(
    ["legacy-baseline", "future-gate"].map((status) => [
      status,
      manifest.gates.filter((gate) => gate.sourceCatalogExpectedStatus === status).length,
    ]),
  );
  assert.deepEqual(sourceStatusCounts, {
    "legacy-baseline": 9,
    "future-gate": 67,
  });
  assert.deepEqual(manifest.sourceCatalogStatusCounts, sourceStatusCounts);

  assert.deepEqual(manifest.activationPolicy.allowedResultStatuses, ["pass"]);
  assert.equal(manifest.activationPolicy.requiredResultStatus, "pass");
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
    assert.equal(manifest.activationPolicy[key], false, key + " must remain false");
  }
  for (const rejected of ["legacy-baseline", "future-gate", "skipped", "retry", "flaky"]) {
    assert.equal(manifest.activationPolicy.allowedResultStatuses.includes(rejected), false);
  }
});

test("locks the 22 light/dark final visual cases to approved Phase 2 viewports", () => {
  const expectedCases = manifest.routes.flatMap((route) =>
    route.themes.flatMap((theme) =>
      route.viewports.map((viewportId) => ({
        id: route.id + "--" + theme + "--" + viewportId,
        routeId: route.id,
        surfaceId: route.surfaceId,
        theme,
        viewportId,
        acceptanceId: "visual:" + route.id + ":light-dark",
      })),
    ),
  );
  const actualCases = manifest.finalVisualCases.map((entry) => ({
    id: entry.id,
    routeId: entry.routeId,
    surfaceId: entry.surfaceId,
    theme: entry.theme,
    viewportId: entry.viewport.id,
    acceptanceId: entry.acceptanceId,
  }));
  assert.deepEqual(actualCases, expectedCases);
  assert.equal(manifest.finalVisualCaseCount, 22);
  assert.equal(manifest.finalVisualCases.length, 22);
  assert.equal(new Set(manifest.finalVisualCases.map((entry) => entry.id)).size, 22);

  for (const entry of manifest.finalVisualCases) {
    const viewport = viewportById.get(entry.viewport.id);
    assert.ok(viewport, "unknown viewport " + entry.viewport.id);
    assert.equal(entry.viewport.width, viewport.width);
    assert.equal(entry.viewport.height, viewport.height);
    assert.equal(entry.requiredResultStatus, "pass");
    assert.equal(manifestGateById.get(entry.acceptanceId).kind, "visual");
    assert.ok(
      entry.evidencePath.startsWith(
        "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-review/",
      ),
    );
  }

  assert.equal(manifest.evidenceNamespace.prefix, "390-frontend-upgrade-phase-2-");
  assert.deepEqual(manifest.evidenceNamespace.forbiddenPrefixes, [
    "370-frontend-upgrade-",
    "380-frontend-upgrade-phase-1-",
  ]);
  assert.equal(new Set(manifest.evidenceOutputs).size, manifest.evidenceOutputs.length);
  for (const output of manifest.evidenceOutputs) {
    const relativeEvidencePath = output.replace(
      "docs/browser-audit-screenshots/",
      "",
    );
    assert.ok(
      relativeEvidencePath.startsWith(manifest.evidenceNamespace.prefix),
      "out-of-namespace evidence output: " + output,
    );
    assert.equal(relativeEvidencePath.startsWith("370-"), false);
    assert.equal(relativeEvidencePath.startsWith("380-"), false);
  }
  for (const visualCase of manifest.finalVisualCases) {
    assert.ok(manifest.evidenceOutputs.includes(visualCase.evidencePath));
  }
  assert.equal(manifest.aggregateStatusCeiling, "ready-for-review");
});

test("locks the accepted commit chain and existing isolated Preview resources", () => {
  const commits = previewContract.commits;
  assert.deepEqual(commits, {
    phase2AcceptanceAncestor: "4bed12b2b9951276124df2fff18b23f2319c8de1",
    phase1ApplicationCommit: "5a3b6f33b7f2a4d15f0a81ca57f81570ca89c6a3",
    phase1EvidenceCommit: "d87b20f8630fdc39f46e1065c5ffee14bf3ca8dd",
    phase1HandoffCommit: "4faba0653e28e4ca28edd8521a053d00d0d88e57",
    requiredAncestorOrder: [
      "phase1ApplicationCommit",
      "phase1EvidenceCommit",
      "phase1HandoffCommit",
      "phase2AcceptanceAncestor",
      "candidateApplicationCommit",
    ],
    candidateApplicationCommitSource: "provider-evidence.applicationCommit",
    candidateApiCommitSource: "provider-evidence.deployments.api.commit",
    candidatePagesCommitSource: "provider-evidence.deployments.pages.commit",
    candidateCommitsMustMatch: true,
    acceptanceAncestorRequired: true,
  });
  assert.ok(isAncestor(commits.phase1ApplicationCommit, commits.phase1EvidenceCommit));
  assert.ok(isAncestor(commits.phase1EvidenceCommit, commits.phase1HandoffCommit));
  assert.ok(isAncestor(commits.phase1HandoffCommit, commits.phase2AcceptanceAncestor));
  assert.ok(isAncestor(commits.phase2AcceptanceAncestor, "HEAD"));

  assert.equal(previewContract.phase, 2);
  assert.equal(previewContract.environment, "preview");
  assert.equal(previewContract.branch, "codex/frontend-v2-preview");
  assert.equal(previewContract.postgresMajor, 18);
  assert.deepEqual(previewContract.resources, phase1PreviewContract.resources);
  assert.deepEqual(previewContract.topology, phase1PreviewContract.topology);
  assert.deepEqual(previewContract.governance, phase1PreviewContract.governance);
  assert.deepEqual(previewContract.acceptedPhase1, {
    reviewPath: "docs/superpowers/reviews/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md",
    previewUrl: "https://quantgym-v2-preview.pages.dev/",
    pullRequest: "garymmmjw/QuantGym#130",
    pullRequestMustRemainDraft: true,
    pullRequestMustRemainUnmerged: true,
  });
});

test("keeps exactly three native routes and nineteen Preview-only compatibility routes", () => {
  const ownership = previewContract.routeOwnership;
  const expectedNative = phase2Registry.routes;
  const expectedCompatibility = phaseRegistry.phases
    .filter((phase) => phase.id >= 3 && phase.id <= 5)
    .flatMap((phase) => phase.routes);

  assert.deepEqual(ownership.nativeRoutes, expectedNative);
  assert.deepEqual(ownership.compatibilityRoutes, expectedCompatibility);
  assert.equal(ownership.nativeRouteCount, 3);
  assert.equal(ownership.compatibilityRouteCount, 19);
  assert.equal(ownership.totalBusinessRouteCount, 22);
  assert.equal(new Set([...ownership.nativeRoutes, ...ownership.compatibilityRoutes]).size, 22);
  assert.deepEqual(
    ownership.nativeRoutes.filter((route) => ownership.compatibilityRoutes.includes(route)),
    [],
  );
  assert.equal(ownership.compatibilityAdapterPreviewOnly, true);
  assert.equal(ownership.nativeRoutesMayUseCompatibilityAdapter, false);
  assert.equal(ownership.nativeRoutesUseV2DataOnly, true);
  assert.equal(ownership.compatibilityStateAcceptedAsPhase2Evidence, false);
});

test("forbids Production mutation and dual-write and caps provider evidence at review", () => {
  assert.deepEqual(previewContract.isolation, {
    productionResourcesAllowed: false,
    productionMutationAllowed: false,
    productionDeploymentAllowed: false,
    productionPromotionAllowed: false,
    productionDatabaseSharingAllowed: false,
    productionBucketSharingAllowed: false,
    productionEnvironmentGroupSharingAllowed: false,
    legacyDataImportAllowed: false,
    dualWriteAllowed: false,
    previewSyntheticOrRightsLabelledDataOnly: true,
  });
  assert.deepEqual(previewContract.deployment, {
    automaticPreviewDeployMayBypassMigration: false,
    databaseMigrationRequiresBackupRestoreEvidence: true,
    databaseMigrationRequiresTestedDowngrade: true,
    staticRollbackTarget: "previous-cloudflare-pages-build",
    productionMustRemainUnchanged: true,
  });

  assert.equal(previewContract.evidence.namespace, "390-frontend-upgrade-phase-2-");
  assert.equal(previewContract.evidence.providerEvidenceMode, "0600");
  assert.equal(previewContract.evidence.providerEvidenceMaximumLifetimeDays, 7);
  assert.equal(previewContract.evidence.providerEvidenceExpiresAtRequired, true);
  assert.equal(previewContract.evidence.authenticatedProviderCaptureRequired, true);
  assert.equal(previewContract.evidence.exactCandidateCommitAlignmentRequired, true);
  assert.equal(previewContract.evidence.rawProviderResponsesAllowed, false);
  assert.equal(previewContract.evidence.harFilesAllowed, false);
  assert.equal(previewContract.evidence.signedUrlsAllowed, false);
  assert.equal(previewContract.evidence.databaseExportsAllowed, false);
  assert.equal(previewContract.evidence.productionControlContinuityRequired, true);
  assert.equal(previewContract.evidence.aggregateStatusCeiling, "ready-for-review");
});
