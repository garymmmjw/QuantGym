import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ACCEPTED_PHASE1_ACCEPTANCE_COMMIT,
  ACCEPTED_PHASE1_APPLICATION_COMMIT,
  ACCEPTED_PHASE1_EVIDENCE_COMMIT,
  ACCEPTED_PHASE1_HANDOFF_COMMIT,
  validatePhase1EvidenceLock,
  verifyPhase1EvidenceLock,
} from "./frontend-upgrade-phase2-evidence-lock.mjs";

export const PHASE2_ACCEPTANCE_MANIFEST_PATH = (
  "docs/frontend-upgrade/phase-2-acceptance-manifest.json"
);
export const PHASE2_PREVIEW_CONTRACT_PATH = (
  "docs/frontend-upgrade/phase-2-preview-contract.json"
);
export const PHASE2_SCHEMA_CONTRACT_PATH = (
  "docs/frontend-upgrade/phase-2-schema-contract.json"
);
export const PHASE1_EVIDENCE_LOCK_PATH = (
  "docs/frontend-upgrade/phase-1-evidence-lock.json"
);
export const ACCEPTANCE_CATALOG_PATH = (
  "docs/frontend-upgrade/acceptance-catalog.json"
);
export const SURFACE_CONTRACTS_PATH = (
  "docs/frontend-upgrade/surface-contracts.json"
);
export const PHASE_REGISTRY_PATH = (
  "docs/frontend-upgrade/phase-registry.json"
);
export const DESIGN_SYSTEM_CONTRACT_PATH = (
  "docs/frontend-upgrade/design-system-contract.json"
);
export const PHASE1_SCHEMA_CONTRACT_PATH = (
  "docs/frontend-upgrade/phase-1-schema-contract.json"
);
export const PHASE1_PREVIEW_CONTRACT_PATH = (
  "docs/frontend-upgrade/phase-1-preview-contract.json"
);

export const PHASE2_EVIDENCE_NAMESPACE = "390-frontend-upgrade-phase-2-";
export const PHASE2_RECOVERY_STATES = Object.freeze([
  "recoverable-error",
  "non-recoverable-error",
  "offline-draft",
  "permission-denied",
  "stale-version-conflict",
  "retry",
]);
export const PHASE2_NEW_TABLES = Object.freeze([
  "problem_sources",
  "problems",
  "problem_progress",
  "favorites",
  "notes",
  "plans",
  "recommendations",
  "training_sessions",
  "attempts",
  "answers",
  "training_events",
  "xp_ledger",
  "idempotency_records",
]);
export const PHASE2_ALTERED_TABLES = Object.freeze([
  "plan_tasks",
  "notifications",
]);
export const PHASE2_APPLICATION_TABLE_COUNT = 22;

const MANIFEST_KEYS = Object.freeze([
  "schemaVersion",
  "phase",
  "name",
  "sourceCatalog",
  "evidenceNamespace",
  "activationPolicy",
  "routes",
  "mutations",
  "recoveryStates",
  "gates",
  "targetGateCount",
  "sourceCatalogStatusCounts",
  "finalVisualCases",
  "finalVisualCaseCount",
  "evidenceOutputs",
  "aggregateStatusCeiling",
]);
const PREVIEW_KEYS = Object.freeze([
  "schemaVersion",
  "phase",
  "environment",
  "branch",
  "commits",
  "acceptedPhase1",
  "postgresMajor",
  "governance",
  "resources",
  "topology",
  "routeOwnership",
  "isolation",
  "deployment",
  "evidence",
]);
const SCHEMA_KEYS = Object.freeze([
  "schemaVersion",
  "phase",
  "postgresMajor",
  "owner",
  "metadataTable",
  "revision",
  "phase1Foundation",
  "migrationRoundTrip",
  "sharedPreviewDowngradeAllowed",
  "newTables",
  "alteredTables",
  "applicationTables",
  "appendOnlyPolicy",
  "idempotencyPolicy",
  "phase1ForbiddenTableExceptionsIntroducedBy0002",
  "forbiddenTables",
  "forbiddenNewTableColumns",
  "dataClassification",
]);
const SECRET_FIELD_PATTERN = (
  /(?:^|_)(?:password|passwd|secret|token|credential|authorization|cookie|api_key|private_key|client_secret|database_url|postgres_url|connection_string)(?:$|_)/u
);
const isObject = (value) => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);
const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const sorted = (values) => [...values].sort(compare);
const unique = (values) => [...new Set(values)];
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort(compare).map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalEqual = (left, right) => (
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
);
const arraysEqual = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => canonicalEqual(value, right[index]))
);
const setsEqual = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && canonicalEqual(sorted(left), sorted(right))
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedFieldName = (key) => key
  .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
  .replace(/[-.\s]+/gu, "_")
  .toLowerCase();

const checkExactKeys = (value, allowed, label, failures) => {
  if (!isObject(value)) {
    failures.push(label + " must be an object");
    return;
  }
  const actual = Object.keys(value);
  const missing = allowed.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !allowed.includes(key));
  if (missing.length > 0) failures.push(label + " is missing keys: " + missing.join(", "));
  if (extra.length > 0) failures.push(label + " has unapproved keys: " + extra.join(", "));
};

const duplicateValues = (values) => values.filter(
  (value, index) => values.indexOf(value) !== index,
);

const namespaceRelativePath = (manifest, output) => {
  const root = manifest?.evidenceNamespace?.trackedRoot;
  if (typeof root !== "string" || typeof output !== "string") return null;
  const prefix = root.endsWith("/") ? root : root + "/";
  return output.startsWith(prefix) ? output.slice(prefix.length) : null;
};

export function findSecretShapedContractKeys(value, label = "contract") {
  const failures = [];
  const visit = (candidate, currentPath) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((entry, index) => visit(entry, currentPath + "[" + index + "]"));
      return;
    }
    if (!isObject(candidate)) return;
    for (const [key, entry] of Object.entries(candidate)) {
      const normalized = normalizedFieldName(key);
      if (SECRET_FIELD_PATTERN.test(normalized)) {
        failures.push("secret-shaped contract field " + currentPath + "." + key);
      }
      visit(entry, currentPath + "." + key);
    }
  };
  visit(value, label);
  return failures;
}

const validateManifestRelationships = ({
  acceptanceManifest,
  acceptanceCatalog,
  surfaceContracts,
  phaseRegistry,
  designSystemContract,
}, failures) => {
  checkExactKeys(acceptanceManifest, MANIFEST_KEYS, "Phase 2 acceptance manifest", failures);
  if (!isObject(acceptanceManifest)) return;

  const phase2Registry = phaseRegistry?.phases?.find((phase) => phase.id === 2);
  const phase2Surfaces = surfaceContracts?.surfaces?.filter((surface) => surface.phase === 2) ?? [];
  const surfaceIds = phase2Surfaces.map((surface) => surface.id);
  const catalogEntries = acceptanceCatalog?.entries?.filter(
    (entry) => surfaceIds.includes(entry.surfaceId),
  ) ?? [];
  const catalogById = new Map(catalogEntries.map((entry) => [entry.id, entry]));
  const gates = Array.isArray(acceptanceManifest.gates) ? acceptanceManifest.gates : [];
  const routes = Array.isArray(acceptanceManifest.routes) ? acceptanceManifest.routes : [];
  const mutations = Array.isArray(acceptanceManifest.mutations)
    ? acceptanceManifest.mutations
    : [];
  const visualCases = Array.isArray(acceptanceManifest.finalVisualCases)
    ? acceptanceManifest.finalVisualCases
    : [];

  if (acceptanceManifest.schemaVersion !== 1) {
    failures.push("Phase 2 acceptance manifest schemaVersion must be 1");
  }
  if (acceptanceManifest.phase !== 2 || acceptanceManifest.name !== "daily-training-loop") {
    failures.push("Phase 2 acceptance manifest identity mismatch");
  }
  if (
    acceptanceManifest.sourceCatalog?.path !== ACCEPTANCE_CATALOG_PATH
    || acceptanceManifest.sourceCatalog?.immutable !== true
    || !arraysEqual(acceptanceManifest.sourceCatalog?.selectedSurfaceIds, surfaceIds)
  ) failures.push("Phase 2 acceptance manifest source catalog relationship mismatch");

  const registryRoutes = phase2Registry?.routes ?? [];
  if (!arraysEqual(routes.map((route) => route.id), registryRoutes) || routes.length !== 3) {
    failures.push("Phase 2 acceptance manifest must map exactly 3 registry routes");
  }
  if (!arraysEqual(routes.map((route) => route.surfaceId), surfaceIds)) {
    failures.push("Phase 2 acceptance manifest surface order mismatch");
  }

  const expectedMutationIds = phase2Surfaces.flatMap((surface) => surface.mutations ?? []);
  if (!arraysEqual(mutations.map((mutation) => mutation.id), expectedMutationIds)) {
    failures.push("Phase 2 acceptance manifest mutation inventory mismatch");
  }
  if (mutations.length !== 11 || duplicateValues(mutations.map(({ id }) => id)).length > 0) {
    failures.push("Phase 2 acceptance manifest must contain 11 unique mutations");
  }
  if (!arraysEqual(acceptanceManifest.recoveryStates, PHASE2_RECOVERY_STATES)) {
    failures.push("Phase 2 recovery state inventory mismatch");
  }

  for (const route of routes) {
    const surface = phase2Surfaces.find((candidate) => candidate.routeId === route.id);
    if (!surface) {
      failures.push("unknown Phase 2 route " + String(route.id));
      continue;
    }
    if (
      route.surfaceId !== surface.id
      || !arraysEqual(route.routeGateIds, surface.acceptanceChecks)
      || !arraysEqual(route.mutationIds, surface.mutations)
      || !arraysEqual(route.viewports, surface.responsive?.requiredViewports)
      || !arraysEqual(route.themes, ["light", "dark"])
    ) failures.push("Phase 2 route contract mismatch for " + route.id);
  }

  for (const mutation of mutations) {
    const surface = phase2Surfaces.find((candidate) => candidate.id === mutation.surfaceId);
    if (
      !surface
      || mutation.routeId !== surface.routeId
      || !(surface.mutations ?? []).includes(mutation.id)
    ) failures.push("Phase 2 mutation ownership mismatch for " + String(mutation.id));
    if (!arraysEqual(Object.keys(mutation.recoveryGateIds ?? {}), PHASE2_RECOVERY_STATES)) {
      failures.push("Phase 2 mutation recovery map mismatch for " + String(mutation.id));
      continue;
    }
    for (const state of PHASE2_RECOVERY_STATES) {
      if (mutation.recoveryGateIds[state] !== "mutation:" + mutation.id + ":" + state) {
        failures.push(
          "Phase 2 mutation gate mismatch for " + mutation.id + " " + state,
        );
      }
    }
  }
  const completeMutation = mutations.find((mutation) => mutation.id === "problems.complete");
  if (
    completeMutation?.retryIdempotencyGateId
    !== "mutation:problems.complete:retry-idempotency"
  ) failures.push("Phase 2 completion retry-idempotency gate mismatch");

  const gateIds = gates.map((gate) => gate.id);
  const catalogIds = catalogEntries.map((entry) => entry.id);
  if (
    gates.length !== 76
    || acceptanceManifest.targetGateCount !== 76
    || duplicateValues(gateIds).length > 0
    || !setsEqual(gateIds, catalogIds)
  ) failures.push("Phase 2 acceptance manifest must map exactly 76 unique catalog IDs");

  for (const gate of gates) {
    const source = catalogById.get(gate.id);
    if (!source) continue;
    if (
      gate.surfaceId !== source.surfaceId
      || gate.kind !== source.kind
      || gate.sourceCatalogTargetPhase !== source.targetPhase
      || gate.sourceCatalogExpectedStatus !== source.expectedStatus
      || gate.phase2RequiredResultStatus !== "pass"
      || gate.resultSelector !== 'results[id="' + gate.id + '"]'
    ) failures.push("Phase 2 acceptance gate mapping mismatch for " + gate.id);
    if (
      typeof gate.phase2EvidencePath !== "string"
      || !gate.phase2EvidencePath.startsWith(
        "docs/browser-audit-screenshots/" + PHASE2_EVIDENCE_NAMESPACE,
      )
    ) failures.push("Phase 2 gate evidence namespace mismatch for " + gate.id);
  }

  const sourceStatusCounts = {
    "legacy-baseline": gates.filter(
      (gate) => gate.sourceCatalogExpectedStatus === "legacy-baseline",
    ).length,
    "future-gate": gates.filter(
      (gate) => gate.sourceCatalogExpectedStatus === "future-gate",
    ).length,
  };
  if (
    !canonicalEqual(sourceStatusCounts, { "legacy-baseline": 9, "future-gate": 67 })
    || !canonicalEqual(acceptanceManifest.sourceCatalogStatusCounts, sourceStatusCounts)
  ) failures.push("Phase 2 source catalog status counts mismatch");

  const policy = acceptanceManifest.activationPolicy ?? {};
  if (
    policy.requiredResultStatus !== "pass"
    || !arraysEqual(policy.allowedResultStatuses, ["pass"])
    || policy.sourceLegacyBaselineIdsBecomePhase2Targets !== true
    || policy.sourceFutureGateIdsBecomePhase2Targets !== true
  ) failures.push("Phase 2 result activation policy mismatch");
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
    if (policy[key] !== false) failures.push("Phase 2 result policy must reject " + key);
  }

  const viewportById = new Map(
    (designSystemContract?.viewports ?? []).map((viewport) => [viewport.id, viewport]),
  );
  const expectedVisualCaseIds = routes.flatMap((route) => (
    route.themes.flatMap((theme) => (
      route.viewports.map((viewport) => route.id + "--" + theme + "--" + viewport)
    ))
  ));
  if (
    visualCases.length !== 22
    || acceptanceManifest.finalVisualCaseCount !== 22
    || duplicateValues(visualCases.map(({ id }) => id)).length > 0
    || !arraysEqual(visualCases.map(({ id }) => id), expectedVisualCaseIds)
  ) failures.push("Phase 2 manifest must define exactly 22 final visual cases");
  for (const visualCase of visualCases) {
    const viewport = viewportById.get(visualCase.viewport?.id);
    if (
      !viewport
      || visualCase.viewport.width !== viewport.width
      || visualCase.viewport.height !== viewport.height
      || visualCase.requiredResultStatus !== "pass"
      || !gateIds.includes(visualCase.acceptanceId)
      || typeof visualCase.evidencePath !== "string"
      || !visualCase.evidencePath.startsWith(
        "docs/browser-audit-screenshots/"
        + PHASE2_EVIDENCE_NAMESPACE
        + "review/",
      )
    ) failures.push("Phase 2 final visual case mismatch for " + String(visualCase.id));
  }

  if (
    acceptanceManifest.evidenceNamespace?.prefix !== PHASE2_EVIDENCE_NAMESPACE
    || acceptanceManifest.evidenceNamespace?.trackedRoot
      !== "docs/browser-audit-screenshots"
    || acceptanceManifest.aggregateStatusCeiling !== "ready-for-review"
  ) failures.push("Phase 2 evidence namespace or aggregate ceiling mismatch");
  const outputs = acceptanceManifest.evidenceOutputs ?? [];
  if (!Array.isArray(outputs) || duplicateValues(outputs).length > 0) {
    failures.push("Phase 2 evidence outputs must be a unique array");
  } else {
    for (const output of outputs) {
      const relative = namespaceRelativePath(acceptanceManifest, output);
      if (relative === null || !relative.startsWith(PHASE2_EVIDENCE_NAMESPACE)) {
        failures.push("Phase 2 evidence output is outside 390 namespace: " + String(output));
      }
    }
  }
};

const validatePreviewRelationships = ({
  previewContract,
  phase1PreviewContract,
  phase1EvidenceLock,
  phaseRegistry,
  acceptanceManifest,
}, failures) => {
  checkExactKeys(previewContract, PREVIEW_KEYS, "Phase 2 Preview contract", failures);
  if (!isObject(previewContract)) return;

  if (
    previewContract.schemaVersion !== 1
    || previewContract.phase !== 2
    || previewContract.environment !== "preview"
    || previewContract.branch !== "codex/frontend-v2-preview"
    || previewContract.postgresMajor !== 18
  ) failures.push("Phase 2 Preview identity mismatch");

  for (const key of ["resources", "topology", "governance"]) {
    if (!canonicalEqual(previewContract[key], phase1PreviewContract?.[key])) {
      failures.push("Phase 2 Preview " + key + " must match accepted Phase 1");
    }
  }

  const lockFailures = validatePhase1EvidenceLock(phase1EvidenceLock);
  failures.push(...lockFailures.map((failure) => "Phase 1 evidence lock: " + failure));

  const commits = previewContract.commits ?? {};
  const expectedCommits = {
    phase2AcceptanceAncestor: ACCEPTED_PHASE1_ACCEPTANCE_COMMIT,
    phase1ApplicationCommit: ACCEPTED_PHASE1_APPLICATION_COMMIT,
    phase1EvidenceCommit: ACCEPTED_PHASE1_EVIDENCE_COMMIT,
    phase1HandoffCommit: ACCEPTED_PHASE1_HANDOFF_COMMIT,
  };
  for (const [field, expected] of Object.entries(expectedCommits)) {
    if (commits[field] !== expected) failures.push("Phase 2 Preview " + field + " mismatch");
  }
  if (
    phase1EvidenceLock?.acceptedApplicationCommit !== commits.phase1ApplicationCommit
    || phase1EvidenceLock?.acceptedEvidenceCommit !== commits.phase1EvidenceCommit
    || phase1EvidenceLock?.acceptedHandoffCommit !== commits.phase1HandoffCommit
    || phase1EvidenceLock?.acceptedAcceptanceCommit !== commits.phase2AcceptanceAncestor
  ) failures.push("Phase 2 Preview commit chain does not match Phase 1 evidence lock");
  if (
    commits.acceptanceAncestorRequired !== true
    || commits.candidateCommitsMustMatch !== true
    || commits.candidateApplicationCommitSource !== "provider-evidence.applicationCommit"
    || commits.candidateApiCommitSource !== "provider-evidence.deployments.api.commit"
    || commits.candidatePagesCommitSource !== "provider-evidence.deployments.pages.commit"
  ) failures.push("Phase 2 Preview candidate commit policy mismatch");

  const nativeRoutes = phaseRegistry?.phases?.find((phase) => phase.id === 2)?.routes ?? [];
  const compatibilityRoutes = phaseRegistry?.phases
    ?.filter((phase) => phase.id >= 3 && phase.id <= 5)
    .flatMap((phase) => phase.routes) ?? [];
  const ownership = previewContract.routeOwnership ?? {};
  if (
    !arraysEqual(ownership.nativeRoutes, nativeRoutes)
    || ownership.nativeRouteCount !== 3
    || !arraysEqual(ownership.compatibilityRoutes, compatibilityRoutes)
    || ownership.compatibilityRouteCount !== 19
    || ownership.totalBusinessRouteCount !== 22
    || new Set([...nativeRoutes, ...compatibilityRoutes]).size !== 22
  ) failures.push("Phase 2 Preview route ownership must remain 3 native plus 19 compatibility");
  if (
    ownership.compatibilityAdapterPreviewOnly !== true
    || ownership.nativeRoutesMayUseCompatibilityAdapter !== false
    || ownership.nativeRoutesUseV2DataOnly !== true
    || ownership.compatibilityStateAcceptedAsPhase2Evidence !== false
  ) failures.push("Phase 2 Preview compatibility adapter policy mismatch");

  const isolation = previewContract.isolation ?? {};
  for (const key of [
    "productionResourcesAllowed",
    "productionMutationAllowed",
    "productionDeploymentAllowed",
    "productionPromotionAllowed",
    "productionDatabaseSharingAllowed",
    "productionBucketSharingAllowed",
    "productionEnvironmentGroupSharingAllowed",
    "legacyDataImportAllowed",
    "dualWriteAllowed",
  ]) {
    if (isolation[key] !== false) failures.push("Phase 2 Preview must forbid " + key);
  }
  if (isolation.previewSyntheticOrRightsLabelledDataOnly !== true) {
    failures.push("Phase 2 Preview data policy mismatch");
  }

  const deployment = previewContract.deployment ?? {};
  if (
    deployment.automaticPreviewDeployMayBypassMigration !== false
    || deployment.databaseMigrationRequiresBackupRestoreEvidence !== true
    || deployment.databaseMigrationRequiresTestedDowngrade !== true
    || deployment.staticRollbackTarget !== "previous-cloudflare-pages-build"
    || deployment.productionMustRemainUnchanged !== true
  ) failures.push("Phase 2 Preview migration or rollback policy mismatch");

  const evidence = previewContract.evidence ?? {};
  if (
    evidence.namespace !== PHASE2_EVIDENCE_NAMESPACE
    || evidence.namespace !== acceptanceManifest?.evidenceNamespace?.prefix
    || evidence.providerEvidenceMode !== "0600"
    || evidence.providerEvidenceMaximumLifetimeDays !== 7
    || evidence.providerEvidenceExpiresAtRequired !== true
    || evidence.authenticatedProviderCaptureRequired !== true
    || evidence.exactCandidateCommitAlignmentRequired !== true
    || evidence.rawProviderResponsesAllowed !== false
    || evidence.harFilesAllowed !== false
    || evidence.signedUrlsAllowed !== false
    || evidence.databaseExportsAllowed !== false
    || evidence.productionControlContinuityRequired !== true
    || evidence.aggregateStatusCeiling !== "ready-for-review"
  ) failures.push("Phase 2 provider evidence policy mismatch");
};

const validateSchemaRelationships = ({
  schemaContract,
  phase1SchemaContract,
  phase1SchemaContractSha256,
  previewContract,
}, failures) => {
  checkExactKeys(schemaContract, SCHEMA_KEYS, "Phase 2 schema contract", failures);
  if (!isObject(schemaContract)) return;

  if (
    schemaContract.schemaVersion !== 2
    || schemaContract.phase !== 2
    || schemaContract.postgresMajor !== phase1SchemaContract?.postgresMajor
    || schemaContract.owner !== phase1SchemaContract?.owner
    || schemaContract.metadataTable !== phase1SchemaContract?.metadataTable
  ) failures.push("Phase 2 schema identity must preserve Phase 1 PostgreSQL ownership");

  const revision = schemaContract.revision ?? {};
  if (
    revision.id !== "0002_phase2_daily_training"
    || revision.downRevision !== "0001_phase1_foundation"
    || revision.path !== "api/migrations/versions/0002_phase2_daily_training.py"
  ) failures.push("Phase 2 schema revision must be exact 0002 with 0001 rollback");

  const expectedRoundTrip = [
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "fingerprint:0002_phase2_daily_training",
    "downgrade:0002_phase2_daily_training->0001_phase1_foundation",
    "fingerprint:0001_phase1_foundation-exact",
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "same-fingerprint:0002_phase2_daily_training",
  ];
  if (
    !arraysEqual(schemaContract.migrationRoundTrip, expectedRoundTrip)
    || schemaContract.sharedPreviewDowngradeAllowed !== false
    || previewContract?.deployment?.databaseMigrationRequiresTestedDowngrade !== true
  ) failures.push("Phase 2 schema upgrade/downgrade round-trip mismatch");

  const phase1Tables = (phase1SchemaContract?.applicationTables ?? []).map((table) => table.name);
  const foundation = schemaContract.phase1Foundation ?? {};
  if (
    foundation.contractPath !== PHASE1_SCHEMA_CONTRACT_PATH
    || foundation.contractSha256 !== phase1SchemaContractSha256
    || foundation.revision !== "0001_phase1_foundation"
    || foundation.preservation !== "exact"
    || foundation.immutable !== true
    || !arraysEqual(foundation.tables, phase1Tables)
    || phase1Tables.length !== 9
  ) failures.push("Phase 2 schema Phase 1 foundation relationship mismatch");

  const newTables = schemaContract.newTables ?? [];
  const newNames = newTables.map((table) => table.name);
  const alteredTables = schemaContract.alteredTables ?? [];
  const alteredNames = alteredTables.map((table) => table.name);
  if (
    newTables.length !== 13
    || duplicateValues(newNames).length > 0
    || !arraysEqual(newNames, PHASE2_NEW_TABLES)
  ) failures.push("Phase 2 schema must define exactly 13 new application tables");
  if (
    alteredTables.length !== 2
    || duplicateValues(alteredNames).length > 0
    || !arraysEqual(alteredNames, PHASE2_ALTERED_TABLES)
    || alteredTables.some((table) => table.phase1RowsRemainValid !== true)
  ) failures.push("Phase 2 schema additive table extensions mismatch");
  if (
    schemaContract.applicationTables?.length !== PHASE2_APPLICATION_TABLE_COUNT
    || !arraysEqual(schemaContract.applicationTables, [...phase1Tables, ...PHASE2_NEW_TABLES])
  ) failures.push("Phase 2 schema must contain exactly 22 application tables");

  const introducedPhase1Exceptions = (phase1SchemaContract?.forbiddenTables ?? [])
    .filter((table) => newNames.includes(table));
  if (
    !setsEqual(
      schemaContract.phase1ForbiddenTableExceptionsIntroducedBy0002,
      introducedPhase1Exceptions,
    )
    || !setsEqual(introducedPhase1Exceptions, ["xp_ledger", "problems"])
  ) failures.push("Phase 2 schema Phase 1 forbidden-table exceptions mismatch");

  if (
    !arraysEqual(schemaContract.appendOnlyPolicy?.tables, ["training_events", "xp_ledger"])
    || !arraysEqual(schemaContract.appendOnlyPolicy?.allowedServiceOperations, ["insert", "select"])
    || !arraysEqual(schemaContract.appendOnlyPolicy?.forbiddenServiceOperations, ["update", "delete"])
    || schemaContract.appendOnlyPolicy?.completionTransactionRequired !== true
  ) failures.push("Phase 2 append-only ledger/event policy mismatch");

  const idempotency = schemaContract.idempotencyPolicy ?? {};
  if (
    idempotency.table !== "idempotency_records"
    || idempotency.rawKeyStored !== false
    || !arraysEqual(idempotency.scopeColumns, ["user_id", "operation", "key_hash"])
    || idempotency.requestFingerprintColumn !== "request_hash"
    || idempotency.responseSnapshotColumn !== "response_snapshot"
    || idempotency.sameTransactionAsReward !== true
    || idempotency.replaySurvivesResourceVersionAdvance !== true
  ) failures.push("Phase 2 completion idempotency policy mismatch");

  const forbiddenColumns = schemaContract.forbiddenNewTableColumns ?? [];
  for (const column of [
    "state_json",
    "legacy_id",
    "sqlite_rowid",
    "raw_idempotency_key",
    "idempotency_key",
    "csrf_token",
    "csrf_proof",
    "session_token",
    "cookie",
    "authorization",
  ]) {
    if (!forbiddenColumns.includes(column)) {
      failures.push("Phase 2 schema is missing forbidden column " + column);
    }
  }
};

export function validatePhase2ContractSet(contractSet = {}) {
  const failures = [];
  const {
    acceptanceManifest,
    previewContract,
    schemaContract,
    phase1EvidenceLock,
    acceptanceCatalog,
    surfaceContracts,
    phaseRegistry,
    designSystemContract,
    phase1SchemaContract,
    phase1SchemaContractSha256,
    phase1PreviewContract,
  } = contractSet;

  for (const [label, value] of Object.entries({
    acceptanceManifest,
    previewContract,
    schemaContract,
    phase1EvidenceLock,
    acceptanceCatalog,
    surfaceContracts,
    phaseRegistry,
    designSystemContract,
    phase1SchemaContract,
    phase1PreviewContract,
  })) {
    if (!isObject(value)) failures.push(label + " must be an object");
  }
  if (failures.length > 0) return unique(failures);

  validateManifestRelationships({
    acceptanceManifest,
    acceptanceCatalog,
    surfaceContracts,
    phaseRegistry,
    designSystemContract,
  }, failures);
  validatePreviewRelationships({
    previewContract,
    phase1PreviewContract,
    phase1EvidenceLock,
    phaseRegistry,
    acceptanceManifest,
  }, failures);
  validateSchemaRelationships({
    schemaContract,
    phase1SchemaContract,
    phase1SchemaContractSha256,
    previewContract,
  }, failures);

  for (const [label, value] of Object.entries({
    acceptanceManifest,
    previewContract,
    schemaContract,
    phase1EvidenceLock,
  })) {
    failures.push(...findSecretShapedContractKeys(value, label));
  }

  return unique(failures);
}

const readJsonWithBytes = async (root, relativePath) => {
  const bytes = await readFile(path.join(root, relativePath));
  return {
    bytes,
    value: JSON.parse(bytes.toString("utf8")),
  };
};

export async function loadPhase2ContractSet({ root } = {}) {
  if (typeof root !== "string" || root.length === 0) throw new Error("root is required");
  const [
    acceptanceManifest,
    previewContract,
    schemaContract,
    phase1EvidenceLock,
    acceptanceCatalog,
    surfaceContracts,
    phaseRegistry,
    designSystemContract,
    phase1Schema,
    phase1PreviewContract,
  ] = await Promise.all([
    readJsonWithBytes(root, PHASE2_ACCEPTANCE_MANIFEST_PATH),
    readJsonWithBytes(root, PHASE2_PREVIEW_CONTRACT_PATH),
    readJsonWithBytes(root, PHASE2_SCHEMA_CONTRACT_PATH),
    readJsonWithBytes(root, PHASE1_EVIDENCE_LOCK_PATH),
    readJsonWithBytes(root, ACCEPTANCE_CATALOG_PATH),
    readJsonWithBytes(root, SURFACE_CONTRACTS_PATH),
    readJsonWithBytes(root, PHASE_REGISTRY_PATH),
    readJsonWithBytes(root, DESIGN_SYSTEM_CONTRACT_PATH),
    readJsonWithBytes(root, PHASE1_SCHEMA_CONTRACT_PATH),
    readJsonWithBytes(root, PHASE1_PREVIEW_CONTRACT_PATH),
  ]);
  return {
    acceptanceManifest: acceptanceManifest.value,
    previewContract: previewContract.value,
    schemaContract: schemaContract.value,
    phase1EvidenceLock: phase1EvidenceLock.value,
    acceptanceCatalog: acceptanceCatalog.value,
    surfaceContracts: surfaceContracts.value,
    phaseRegistry: phaseRegistry.value,
    designSystemContract: designSystemContract.value,
    phase1SchemaContract: phase1Schema.value,
    phase1SchemaContractSha256: sha256(phase1Schema.bytes),
    phase1PreviewContract: phase1PreviewContract.value,
  };
}

export async function checkPhase2ContractSet({ root, headRef = "HEAD" } = {}) {
  const contractSet = await loadPhase2ContractSet({ root });
  const failures = validatePhase2ContractSet(contractSet);
  const lockFailures = await verifyPhase1EvidenceLock({
    root,
    lock: contractSet.phase1EvidenceLock,
    headRef,
  });
  failures.push(...lockFailures.map((failure) => "Phase 1 evidence verification: " + failure));
  return unique(failures);
}
