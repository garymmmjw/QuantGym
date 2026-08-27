import { createHash } from "node:crypto";

import {
  PHASE2_CUTOVER_STEP_IDS,
  PHASE2_LIVE_CHECK_IDS,
  PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
  PHASE2_REQUIRED_ANCESTOR_COMMITS,
  PHASE2_RESOURCE_CONTRACT,
  validatePhase2CredentialRoles,
  validatePhase2ProviderEvidence,
} from "./frontend-upgrade-phase2-provider-evidence.mjs";

const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const PHASE1_APPLICATION_COMMIT = PHASE2_REQUIRED_ANCESTOR_COMMITS[0];
const PHASE1_REVISION = "0001_phase1_foundation";
const PHASE2_REVISION = "0002_phase2_daily_training";
const MAX_CUTOVER_STEP_DURATION_MS = 2 * 60 * 60 * 1_000;
const MAX_CUTOVER_DURATION_MS = 6 * 60 * 60 * 1_000;
const MAX_TERMINAL_CONTINUITY_HANDOFF_MS = 5 * 60 * 1_000;
const REVOCATION_OUTCOMES = new Set(["none", "partial", "complete"]);
const REMAINING_READ_ONLY_CONTROL_PROVIDERS = Object.freeze([
  "cloudflare",
  "r2",
]);
const TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS = Object.freeze(["render"]);
const TERMINAL_TEMPORARY_CONTROL_PROVIDERS = Object.freeze([
  "postgres",
  "render",
]);

const ACTION_NAMES = Object.freeze([
  "candidateGate",
  "preflight",
  "inspectTopology",
  "backup",
  "proveRestore",
  "destroyRestoreTarget",
  "migrate",
  "deployApi",
  "deployPages",
  "seedAcceptanceData",
  "runLiveChecks",
  "cleanup",
  "revokeTemporaryAccess",
  "verifyPostRevokeContinuity",
  "inspectPullRequest",
  "recoverCleanup",
  "rollbackPages",
  "rollbackApi",
  "restorePreviewDatabase",
  "verifyRecovery",
  "emergencyRevoke",
]);

const CANDIDATE_DETAIL_KEYS = Object.freeze([
  "repository",
  "pullRequestNumber",
  "branch",
  "applicationCommit",
  "evidenceHeadCommit",
  "localHeadCommit",
  "remoteHeadCommit",
  "applicationCommitMessageSha256",
  "evidenceCommitMessageSha256",
  "workflowSha256",
  "ciContractSha256",
  "workflowRunIdentitySha256",
  "applicationCloudflarePagesSkipDirectivePresent",
  "evidenceCloudflarePagesSkipDirectivePresent",
  "evidenceOutputCount",
  "evidenceSuccessorOnly",
  "evidenceHeadCiGreen",
  "applicationPagesSkipRecordCount",
  "evidencePagesSkipRecordCount",
  "pagesSkipObservationSha256",
  "trackedWorktreeClean",
  "indexClean",
  "allowedUntrackedOnly",
  "requiredAncestorCommits",
  "allRequiredAncestorsPresent",
  "pullRequestState",
  "pullRequestDraft",
  "pullRequestMerged",
  "pullRequestHeadCommit",
]);
const TOPOLOGY_DETAIL_KEYS = Object.freeze([
  "resources",
  "productionAnchor",
  "previewAnchor",
  "deploymentControls",
]);
const PREFLIGHT_DETAIL_KEYS = Object.freeze([
  "candidateCommit",
  "capabilitiesReady",
  "toolchainReady",
  "controlDatabaseReadOnly",
  "previewR2RunPrefixEmpty",
  "mutationR2RunPrefixEmpty",
  "frontendBuildPassed",
  "localDowngradeGatePassed",
  "proxyLoopback",
  "proxyIdentitySha256",
  "remainingReadOnlyControlProofs",
  "terminalTemporaryControl",
  "mutationTokenBindings",
]);
const REVOKE_DETAIL_KEYS = Object.freeze([
  "cloudflareRevoked",
  "renderRevoked",
  "postgresRevoked",
  "r2Revoked",
  "mutationCredentialsRevoked",
  "controlIdentityRetained",
  "postgresControlRevocationPending",
  "renderControlRevocationPending",
  "postgresProviderCredentialInventoryUnchanged",
  "postgresProviderCredentialInventorySha256",
  "remainingReadOnlyControlProviders",
  "terminalTemporaryControlProviders",
  "terminalRevocationRequired",
  "terminalRevocationPending",
  "renderControlCredentialIdentitySha256",
  "revokedMutationTokenBindings",
  "postgresIdentities",
]);
const POST_REVOKE_DETAIL_KEYS = Object.freeze([
  "continuityObservedAt",
  "continuityObservationCompletedAt",
  "resources",
  "productionAnchor",
  "previewAnchor",
  "pullRequest",
  "previewApi",
  "previewDatabase",
  "previewR2",
  "renderControlRevoked",
  "renderControlAccessDenied",
  "renderControlRefreshDenied",
  "renderControlCredentialIdentitySha256",
  "renderControlRevocationEvidenceSha256",
  "postgresControlRevokedAfterContinuity",
  "postgresControlIdentity",
  "postgresProviderCredentialInventoryUnchanged",
  "postgresProviderCredentialInventorySha256",
  "persistentProviderAdmin",
  "remainingReadOnlyControlProviders",
  "terminalTemporaryControlProviders",
  "terminalTemporaryControlCredentialsRevoked",
  "remainingControlCredentialsReadOnly",
  "runtimeIdentitiesUnchanged",
  "renderTopologyObservation",
  "sustainableControlRevalidation",
]);
const SUSTAINABLE_CONTROL_REVALIDATION_KEYS = Object.freeze([
  "status",
  "checkedAt",
  "completedAt",
  "cloudflareTopologyUnchanged",
  "pullRequestUnchanged",
  "previewApiLive",
  "previewDatabaseRevisionUnchanged",
  "previewR2ContinuityUnchanged",
  "githubReadOnly",
  "publicApiUnauthenticated",
  "postgresBootstrapAdminUsed",
  "postgresBootstrapAdminExcludedFromReadOnlyAssertions",
  "renderTopologyReobserved",
  "renderTopologyBasis",
  "cloudflareEvidenceSha256",
  "pullRequestEvidenceSha256",
  "previewApiEvidenceSha256",
  "previewDatabaseEvidenceSha256",
  "previewR2EvidenceSha256",
  "evidenceSha256",
]);
const CLEANUP_DETAIL_KEYS = Object.freeze([
  "syntheticApplicationRows",
  "syntheticR2Objects",
  "syntheticCatalogRows",
]);
const MUTATION_BINDING_KEYS = Object.freeze([
  "cloudflare",
  "render",
  "postgres",
  "r2",
]);
const PRODUCTION_SERVICE_NAMES = Object.freeze(["quantgym-api", "quantgym-llm"]);
const POSTGRES_IDENTITY_KINDS = Object.freeze(["mutation", "restore"]);

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const exactKeys = (value, expected) => (
  isPlainObject(value)
  && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key))
);
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalEqual = (left, right) => (
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
);
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const validContentSnapshot = (value) => (
  exactKeys(value, [
    "schemaVersion",
    "tables",
    "catalogSections",
    "inventorySha256",
    "rowCountsSha256",
    "dataAggregateSha256",
    "snapshotSha256",
  ])
  && value.schemaVersion === 2
  && Array.isArray(value.tables)
  && value.tables.length > 0
  && value.tables.every((table) => (
    exactKeys(table, ["name", "rowCount", "rowAggregateSha256"])
      && /^[a-z_][a-z0-9_]{0,62}$/u.test(table.name)
      && Number.isSafeInteger(table.rowCount)
      && table.rowCount >= 0
      && HASH_PATTERN.test(table.rowAggregateSha256)
  ))
  && exactKeys(value.catalogSections, [
    "sequences",
    "extensions",
    "largeObjects",
    "schemas",
    "objects",
    "database",
  ])
  && Object.values(value.catalogSections).every((section) => (
    exactKeys(section, ["rowCount", "aggregateSha256"])
      && Number.isSafeInteger(section.rowCount)
      && section.rowCount >= 0
      && HASH_PATTERN.test(section.aggregateSha256)
  ))
  && HASH_PATTERN.test(value.inventorySha256)
  && HASH_PATTERN.test(value.rowCountsSha256)
  && HASH_PATTERN.test(value.dataAggregateSha256)
  && HASH_PATTERN.test(value.snapshotSha256)
);
const timestamp = (clock) => {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Phase 2 cutover clock is invalid");
  }
  return value.toISOString();
};

export class Phase2CutoverFailure extends Error {
  constructor(failedStage, failureReport) {
    super(`Phase 2 Preview cutover failed at ${failedStage}`);
    this.name = "Phase2CutoverFailure";
    Object.defineProperty(this, "failureReport", {
      configurable: false,
      enumerable: true,
      value: structuredClone(failureReport),
      writable: false,
    });
  }
}

const validateActionSet = (actions, mode) => {
  if (!isPlainObject(actions)) throw new Error("Phase 2 cutover actions are required");
  if (mode === "dry-run" && actions.kind !== "fixture") {
    throw new Error("Phase 2 dry-run accepts fixture actions only");
  }
  if (mode === "execute" && actions.kind !== "operator") {
    throw new Error("Phase 2 execute mode requires the operator action adapter");
  }
  for (const name of ACTION_NAMES) {
    if (typeof actions[name] !== "function") {
      throw new Error(`Phase 2 cutover action ${name} is required`);
    }
  }
};

const requireExecutionConfirmation = (environment, expectedCommit) => {
  if (environment?.QUANTGYM_PHASE2_CUTOVER_MODE !== "execute") {
    throw new Error("Phase 2 execute mode is not enabled by the operator environment");
  }
  if (
    environment?.QUANTGYM_PHASE2_CUTOVER_CONFIRMATION
    !== `preview:${expectedCommit}`
  ) throw new Error("Phase 2 execute confirmation does not match the exact Preview commit");
};

const requireEnvelope = (receipt, label, detailKeys) => {
  if (!exactKeys(receipt, [
    "status",
    "environment",
    "productionMutation",
    "evidenceSha256",
    "details",
  ])) throw new Error(`${label} returned a partial or unapproved receipt`);
  if (
    receipt.status !== "pass"
    || receipt.environment !== "preview"
    || receipt.productionMutation !== false
    || !HASH_PATTERN.test(receipt.evidenceSha256 ?? "")
    || !exactKeys(receipt.details, detailKeys)
  ) throw new Error(`${label} did not prove an isolated Preview pass`);
  return receipt;
};

const requireResource = (resource, key) => {
  const contract = PHASE2_RESOURCE_CONTRACT[key];
  if (
    !exactKeys(resource, ["provider", "name", "identitySha256"])
    || resource.provider !== contract.provider
    || resource.name !== contract.name
    || !HASH_PATTERN.test(resource.identitySha256 ?? "")
  ) throw new Error(`Phase 2 ${key} resource identity is invalid`);
  return resource;
};

const requireProductionAnchor = (anchor, resources, expectedCommit, label) => {
  if (
    !exactKeys(anchor, [
      "pagesDeploymentCommit",
      "pagesResourceIdentitySha256",
      "pagesConfigurationSha256",
      "pagesSuccessfulDeploymentSetSha256",
      "pagesEnvironment",
      "pagesBranch",
      "pagesAutomaticDeploysEnabled",
      "pagesLive",
      "candidateCommitChecked",
      "candidateCommitRecordCount",
      "candidateCommitSkippedRecordCount",
      "candidateCommitStartedRecordCount",
      "candidateCommitAliasedRecordCount",
      "candidateCommitActiveDeploymentCount",
      "services",
      "postgresControlSha256",
      "r2ControlSha256",
      "environmentGroupsControlSha256",
    ])
    || !SHA_PATTERN.test(anchor.pagesDeploymentCommit ?? "")
    || anchor.pagesResourceIdentitySha256 !== resources.productionPages.identitySha256
    || !HASH_PATTERN.test(anchor.pagesConfigurationSha256 ?? "")
    || !HASH_PATTERN.test(anchor.pagesSuccessfulDeploymentSetSha256 ?? "")
    || anchor.pagesEnvironment !== "production"
    || anchor.pagesBranch !== "main"
    || typeof anchor.pagesAutomaticDeploysEnabled !== "boolean"
    || anchor.pagesLive !== true
    || anchor.candidateCommitChecked !== expectedCommit
    || !Number.isSafeInteger(anchor.candidateCommitRecordCount)
    || anchor.candidateCommitRecordCount < 0
    || anchor.candidateCommitSkippedRecordCount !== anchor.candidateCommitRecordCount
    || anchor.candidateCommitStartedRecordCount !== 0
    || anchor.candidateCommitAliasedRecordCount !== 0
    || anchor.candidateCommitActiveDeploymentCount !== 0
    || !HASH_PATTERN.test(anchor.postgresControlSha256 ?? "")
    || !HASH_PATTERN.test(anchor.r2ControlSha256 ?? "")
    || !HASH_PATTERN.test(anchor.environmentGroupsControlSha256 ?? "")
    || !Array.isArray(anchor.services)
    || anchor.services.length !== PRODUCTION_SERVICE_NAMES.length
  ) throw new Error(`${label} Production anchor is invalid`);
  PRODUCTION_SERVICE_NAMES.forEach((name, index) => {
    const service = anchor.services[index];
    const expectedResource = index === 0 ? resources.productionApi : resources.productionLlm;
    if (
      !exactKeys(service, [
        "name",
        "identitySha256",
        "configurationSha256",
        "repository",
        "branch",
        "visibility",
        "automaticDeploysEnabled",
        "liveDeploymentCommit",
        "live",
      ])
      || service.name !== name
      || service.identitySha256 !== expectedResource.identitySha256
      || !HASH_PATTERN.test(service.configurationSha256 ?? "")
      || service.repository !== "garymmmjw/QuantGym"
      || service.branch !== "main"
      || service.visibility !== "public"
      || typeof service.automaticDeploysEnabled !== "boolean"
      || !SHA_PATTERN.test(service.liveDeploymentCommit ?? "")
      || service.live !== true
    ) throw new Error(`${label} Production ${name} service anchor is invalid`);
  });
  return anchor;
};

const requirePreviewAnchor = (anchor, resources, label) => {
  if (
    !exactKeys(anchor, [
      "pagesDeploymentCommit",
      "apiDeploymentCommit",
      "llmDeploymentCommit",
      "llmResourceIdentitySha256",
      "llmConfigurationSha256",
      "llmRepository",
      "llmBranch",
      "llmVisibility",
      "llmAutomaticDeploysEnabled",
      "llmLive",
      "databaseRevision",
    ])
    || !SHA_PATTERN.test(anchor.pagesDeploymentCommit ?? "")
    || !SHA_PATTERN.test(anchor.apiDeploymentCommit ?? "")
    || !SHA_PATTERN.test(anchor.llmDeploymentCommit ?? "")
    || anchor.llmResourceIdentitySha256 !== resources.llm.identitySha256
    || !HASH_PATTERN.test(anchor.llmConfigurationSha256 ?? "")
    || anchor.llmRepository !== "garymmmjw/QuantGym"
    || anchor.llmBranch !== "codex/frontend-v2-preview"
    || anchor.llmVisibility !== "internal"
    || anchor.llmAutomaticDeploysEnabled !== false
    || anchor.llmLive !== true
    || !new Set([PHASE1_REVISION, PHASE2_REVISION]).has(anchor.databaseRevision)
  ) throw new Error(`${label} Preview anchor is invalid`);
  return anchor;
};

const requireTopology = (receipt, expectedCommit, label) => {
  requireEnvelope(receipt, label, TOPOLOGY_DETAIL_KEYS);
  const resources = receipt.details.resources;
  if (!exactKeys(resources, Object.keys(PHASE2_RESOURCE_CONTRACT))) {
    throw new Error(`${label} resource inventory is invalid`);
  }
  const preview = [];
  const production = [];
  for (const key of Object.keys(PHASE2_RESOURCE_CONTRACT)) {
    const resource = requireResource(resources[key], key);
    (key.startsWith("production") ? production : preview).push(resource.identitySha256);
  }
  if (
    new Set(preview).size !== preview.length
    || preview.some((identity) => production.includes(identity))
  ) throw new Error("Phase 2 Preview resources share a Production identity");
  requireProductionAnchor(
    receipt.details.productionAnchor,
    resources,
    expectedCommit,
    label,
  );
  requirePreviewAnchor(receipt.details.previewAnchor, resources, label);
  const controls = receipt.details.deploymentControls;
  if (
    !exactKeys(controls, [
      "pagesAutomaticDeploysDisabled",
      "apiAutomaticDeploysDisabled",
      "llmAutomaticDeploysDisabled",
      "evidenceSha256",
    ])
    || controls.pagesAutomaticDeploysDisabled !== true
    || controls.apiAutomaticDeploysDisabled !== true
    || controls.llmAutomaticDeploysDisabled !== true
    || !HASH_PATTERN.test(controls.evidenceSha256 ?? "")
  ) throw new Error(`${label} Preview automatic deploy controls are invalid`);
  return receipt;
};

const requireCandidateGate = (receipt, expectedCommit) => {
  requireEnvelope(receipt, "Phase 2 candidate gate", CANDIDATE_DETAIL_KEYS);
  const details = receipt.details;
  if (
    details.repository !== "garymmmjw/QuantGym"
    || details.pullRequestNumber !== 130
    || details.branch !== "codex/frontend-v2-preview"
    || details.applicationCommit !== expectedCommit
    || !SHA_PATTERN.test(details.evidenceHeadCommit ?? "")
    || details.evidenceHeadCommit === expectedCommit
    || details.localHeadCommit !== details.evidenceHeadCommit
    || details.remoteHeadCommit !== details.evidenceHeadCommit
    || !HASH_PATTERN.test(details.applicationCommitMessageSha256 ?? "")
    || !HASH_PATTERN.test(details.evidenceCommitMessageSha256 ?? "")
    || !HASH_PATTERN.test(details.workflowSha256 ?? "")
    || !HASH_PATTERN.test(details.ciContractSha256 ?? "")
    || !HASH_PATTERN.test(details.workflowRunIdentitySha256 ?? "")
    || details.applicationCloudflarePagesSkipDirectivePresent !== true
    || details.evidenceCloudflarePagesSkipDirectivePresent !== true
    || details.evidenceOutputCount !== 30
    || details.evidenceSuccessorOnly !== true
    || details.evidenceHeadCiGreen !== true
    || !Number.isSafeInteger(details.applicationPagesSkipRecordCount)
    || details.applicationPagesSkipRecordCount < 1
    || !Number.isSafeInteger(details.evidencePagesSkipRecordCount)
    || details.evidencePagesSkipRecordCount < 1
    || !HASH_PATTERN.test(details.pagesSkipObservationSha256 ?? "")
    || details.trackedWorktreeClean !== true
    || details.indexClean !== true
    || details.allowedUntrackedOnly !== true
    || !canonicalEqual(details.requiredAncestorCommits, PHASE2_REQUIRED_ANCESTOR_COMMITS)
    || details.allRequiredAncestorsPresent !== true
    || details.pullRequestState !== "open"
    || details.pullRequestDraft !== true
    || details.pullRequestMerged !== false
    || details.pullRequestHeadCommit !== details.evidenceHeadCommit
  ) throw new Error("Phase 2 candidate gate did not pass before provider writes");
  return receipt;
};

const requireMutationBindings = (bindings, label) => {
  if (!exactKeys(bindings, MUTATION_BINDING_KEYS)) {
    throw new Error(`${label} mutation credential bindings are invalid`);
  }
  const identities = MUTATION_BINDING_KEYS.map((key) => {
    const binding = bindings[key];
    if (
      !exactKeys(binding, ["identitySha256", "selfIdentityVerified"])
      || !HASH_PATTERN.test(binding.identitySha256 ?? "")
      || binding.selfIdentityVerified !== true
    ) throw new Error(`${label} ${key} credential self-identity is invalid`);
    return binding.identitySha256;
  });
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} mutation credential identities overlap`);
  }
  return bindings;
};

const requireCompositeControlProof = (details, label) => {
  const proofs = details.remainingReadOnlyControlProofs;
  const terminal = details.terminalTemporaryControl;
  if (
    !exactKeys(proofs, ["cloudflare", "r2"])
    || !exactKeys(proofs.cloudflare, [
      "accountBound",
      "providerScopeReadOnly",
      "evidenceSha256",
    ])
    || proofs.cloudflare.accountBound !== true
    || proofs.cloudflare.providerScopeReadOnly !== true
    || !HASH_PATTERN.test(proofs.cloudflare.evidenceSha256 ?? "")
    || !exactKeys(proofs.r2, [
      "policyBucketBound",
      "policyReadOnly",
      "previewReadSucceeded",
      "previewWriteDenied",
      "productionAccessDenied",
      "evidenceSha256",
    ])
    || proofs.r2.policyBucketBound !== true
    || proofs.r2.policyReadOnly !== true
    || proofs.r2.previewReadSucceeded !== true
    || proofs.r2.previewWriteDenied !== true
    || proofs.r2.productionAccessDenied !== true
    || !HASH_PATTERN.test(proofs.r2.evidenceSha256 ?? "")
    || !exactKeys(terminal, [
      "providers",
      "unscopedProviders",
      "terminalRevocationRequired",
      "postgres",
      "renderCredentialIdentitySha256",
    ])
    || !canonicalEqual(
      terminal.providers,
      TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
    )
    || !canonicalEqual(
      terminal.unscopedProviders,
      TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
    )
    || terminal.terminalRevocationRequired !== true
    || !exactKeys(terminal.postgres, [
      "applicationDmlDenied",
      "ddlDenied",
      "largeObjectCreationDenied",
      "selectSucceeded",
      "sqlManagedTemporaryRole",
      "transactionReadOnly",
      "finalDropRequired",
      "providerCredentialInventoryUnchanged",
      "providerCredentialInventorySha256",
      "persistentProviderAdmin",
      "evidenceSha256",
    ])
    || terminal.postgres.applicationDmlDenied !== true
    || terminal.postgres.ddlDenied !== true
    || terminal.postgres.largeObjectCreationDenied !== true
    || terminal.postgres.selectSucceeded !== true
    || terminal.postgres.sqlManagedTemporaryRole !== true
    || terminal.postgres.transactionReadOnly !== true
    || terminal.postgres.finalDropRequired !== true
    || terminal.postgres.providerCredentialInventoryUnchanged !== true
    || !HASH_PATTERN.test(
      terminal.postgres.providerCredentialInventorySha256 ?? "",
    )
    || !exactKeys(terminal.postgres.persistentProviderAdmin, [
      "retained",
      "privilege",
      "excludedFromReadOnlyControlAssertions",
      "identitySha256",
      "sqlIdentitySha256",
      "providerCredentialInventoryUnchanged",
      "providerCredentialInventorySha256",
      "evidenceSha256",
    ])
    || terminal.postgres.persistentProviderAdmin.retained !== true
    || terminal.postgres.persistentProviderAdmin.privilege !== "admin"
    || terminal.postgres.persistentProviderAdmin
      .excludedFromReadOnlyControlAssertions !== true
    || terminal.postgres.persistentProviderAdmin
      .providerCredentialInventoryUnchanged !== true
    || terminal.postgres.persistentProviderAdmin.providerCredentialInventorySha256
      !== terminal.postgres.providerCredentialInventorySha256
    || ![
      terminal.postgres.persistentProviderAdmin.identitySha256,
      terminal.postgres.persistentProviderAdmin.sqlIdentitySha256,
      terminal.postgres.persistentProviderAdmin.evidenceSha256,
    ].every((value) => HASH_PATTERN.test(value ?? ""))
    || !HASH_PATTERN.test(terminal.postgres.evidenceSha256 ?? "")
    || !HASH_PATTERN.test(terminal.renderCredentialIdentitySha256 ?? "")
  ) throw new Error(`${label} composite control proof is invalid`);
  return details;
};

const requirePreflight = (receipt, expectedCommit) => {
  requireEnvelope(receipt, "Phase 2 operator preflight", PREFLIGHT_DETAIL_KEYS);
  const details = receipt.details;
  if (
    details.candidateCommit !== expectedCommit
    || details.capabilitiesReady !== true
    || details.toolchainReady !== true
    || details.controlDatabaseReadOnly !== true
    || details.previewR2RunPrefixEmpty !== true
    || details.mutationR2RunPrefixEmpty !== true
    || details.frontendBuildPassed !== true
    || details.localDowngradeGatePassed !== true
    || details.proxyLoopback !== true
    || !HASH_PATTERN.test(details.proxyIdentitySha256 ?? "")
  ) throw new Error("Phase 2 operator preflight did not pass after the candidate gate");
  requireCompositeControlProof(details, "Phase 2 operator preflight");
  requireMutationBindings(details.mutationTokenBindings, "Phase 2 operator preflight");
  return receipt;
};

const requirePullRequest = (receipt, expectedCommit, label) => {
  requireEnvelope(receipt, label, [
    "repository",
    "number",
    "state",
    "draft",
    "merged",
    "headCommit",
  ]);
  const details = receipt.details;
  if (
    details.repository !== "garymmmjw/QuantGym"
    || details.number !== 130
    || details.state !== "open"
    || details.draft !== true
    || details.merged !== false
    || details.headCommit !== expectedCommit
  ) throw new Error(`${label} is not draft, unmerged, and commit-aligned`);
  return receipt;
};

const terminalCloudflareEvidenceSha256 = (details) => sha256(canonicalJson({
  previewPagesDeploymentCommit: details.previewAnchor?.pagesDeploymentCommit,
  productionPagesDeploymentCommit: details.productionAnchor?.pagesDeploymentCommit,
  previewPagesIdentitySha256: details.resources?.pages?.identitySha256,
  productionPagesIdentitySha256: details.resources?.productionPages?.identitySha256,
  previewR2IdentitySha256: details.resources?.r2?.identitySha256,
  productionR2IdentitySha256: details.resources?.productionR2?.identitySha256,
}));

const requireTerminalObservationBoundary = (details) => {
  const observation = details.renderTopologyObservation;
  const observedMs = Date.parse(details.continuityObservedAt);
  const completedMs = Date.parse(details.continuityObservationCompletedAt);
  if (
    typeof details.continuityObservedAt !== "string"
    || !Number.isFinite(observedMs)
    || new Date(observedMs).toISOString()
      !== details.continuityObservedAt
    || typeof details.continuityObservationCompletedAt !== "string"
    || !Number.isFinite(completedMs)
    || new Date(completedMs).toISOString()
      !== details.continuityObservationCompletedAt
    || completedMs < observedMs
    || !exactKeys(observation, [
      "observedAt",
      "timing",
      "reobservedAfterTerminalRevocation",
    ])
    || observation.observedAt !== details.continuityObservedAt
    || observation.timing !== "before-terminal-control-revocation"
    || observation.reobservedAfterTerminalRevocation !== false
  ) throw new Error("Phase 2 Render topology observation boundary is invalid");
  return observation;
};

const requireSustainableControlRevalidation = (details) => {
  const proof = details.sustainableControlRevalidation;
  const unsignedProof = isPlainObject(proof)
    ? Object.fromEntries(SUSTAINABLE_CONTROL_REVALIDATION_KEYS
      .filter((key) => key !== "evidenceSha256")
      .map((key) => [key, proof[key]]))
    : undefined;
  if (
    !exactKeys(proof, SUSTAINABLE_CONTROL_REVALIDATION_KEYS)
    || proof.status !== "pass"
    || typeof proof.checkedAt !== "string"
    || !Number.isFinite(Date.parse(proof.checkedAt))
    || new Date(Date.parse(proof.checkedAt)).toISOString() !== proof.checkedAt
    || typeof proof.completedAt !== "string"
    || !Number.isFinite(Date.parse(proof.completedAt))
    || new Date(Date.parse(proof.completedAt)).toISOString() !== proof.completedAt
    || Date.parse(proof.completedAt) < Date.parse(proof.checkedAt)
    || proof.cloudflareTopologyUnchanged !== true
    || proof.pullRequestUnchanged !== true
    || proof.previewApiLive !== true
    || proof.previewDatabaseRevisionUnchanged !== true
    || proof.previewR2ContinuityUnchanged !== true
    || proof.githubReadOnly !== true
    || proof.publicApiUnauthenticated !== true
    || proof.postgresBootstrapAdminUsed !== true
    || proof.postgresBootstrapAdminExcludedFromReadOnlyAssertions !== true
    || proof.renderTopologyReobserved !== false
    || proof.renderTopologyBasis !== "pre-terminal-revocation-observation"
    || proof.cloudflareEvidenceSha256 !== terminalCloudflareEvidenceSha256(details)
    || proof.pullRequestEvidenceSha256 !== details.pullRequest?.evidenceSha256
    || proof.previewApiEvidenceSha256 !== details.previewApi?.evidenceSha256
    || proof.previewDatabaseEvidenceSha256 !== details.previewDatabase?.evidenceSha256
    || proof.previewR2EvidenceSha256 !== details.previewR2?.evidenceSha256
    || !HASH_PATTERN.test(proof.evidenceSha256 ?? "")
    || proof.evidenceSha256 !== sha256(canonicalJson(unsignedProof))
  ) throw new Error("Phase 2 sustainable control revalidation is invalid");
  return proof;
};

const requirePostRevokeContinuity = ({
  receipt,
  expectedCommit,
  evidenceHeadCommit,
  expectedTopology,
  expectedRenderControlCredentialIdentitySha256,
  expectedPostgresProviderCredentialInventorySha256,
  expectedPostgresIdentities,
  expectedBootstrapIdentitySha256,
}) => {
  requireEnvelope(
    receipt,
    "Phase 2 post-revoke continuity",
    POST_REVOKE_DETAIL_KEYS,
  );
  const details = receipt.details;
  requireTerminalObservationBoundary(details);
  requireSustainableControlRevalidation(details);
  if (
    !canonicalEqual(details.resources, expectedTopology.details.resources)
    || !canonicalEqual(
      details.productionAnchor,
      expectedTopology.details.productionAnchor,
    )
    || !canonicalEqual(details.previewAnchor, expectedTopology.details.previewAnchor)
    || details.runtimeIdentitiesUnchanged !== true
    || details.renderControlRevoked !== true
    || details.renderControlAccessDenied !== true
    || details.renderControlRefreshDenied !== true
    || details.renderControlCredentialIdentitySha256
      !== expectedRenderControlCredentialIdentitySha256
    || details.renderControlRevocationEvidenceSha256 !== sha256(canonicalJson({
      accessDenied: details.renderControlAccessDenied,
      credentialIdentitySha256: details.renderControlCredentialIdentitySha256,
      refreshDenied: details.renderControlRefreshDenied,
      revoked: details.renderControlRevoked,
    }))
    || details.postgresControlRevokedAfterContinuity !== true
    || details.postgresProviderCredentialInventoryUnchanged !== true
    || !HASH_PATTERN.test(
      details.postgresProviderCredentialInventorySha256 ?? "",
    )
    || details.postgresProviderCredentialInventorySha256
      !== expectedPostgresProviderCredentialInventorySha256
    || !exactKeys(details.persistentProviderAdmin, [
      "retained",
      "privilege",
      "excludedFromReadOnlyControlAssertions",
      "identitySha256",
      "sqlIdentitySha256",
      "providerCredentialInventoryUnchanged",
      "providerCredentialInventorySha256",
      "evidenceSha256",
    ])
    || details.persistentProviderAdmin.retained !== true
    || details.persistentProviderAdmin.privilege !== "admin"
    || details.persistentProviderAdmin.excludedFromReadOnlyControlAssertions !== true
    || details.persistentProviderAdmin.identitySha256 !== expectedBootstrapIdentitySha256
    || details.persistentProviderAdmin.providerCredentialInventoryUnchanged !== true
    || details.persistentProviderAdmin.providerCredentialInventorySha256
      !== expectedPostgresProviderCredentialInventorySha256
    || !HASH_PATTERN.test(details.persistentProviderAdmin.sqlIdentitySha256 ?? "")
    || !HASH_PATTERN.test(details.persistentProviderAdmin.evidenceSha256 ?? "")
    || !canonicalEqual(
      details.remainingReadOnlyControlProviders,
      REMAINING_READ_ONLY_CONTROL_PROVIDERS,
    )
    || !canonicalEqual(
      details.terminalTemporaryControlProviders,
      TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
    )
    || details.terminalTemporaryControlCredentialsRevoked !== true
    || details.remainingControlCredentialsReadOnly !== true
  ) throw new Error("Phase 2 post-revoke topology or runtime identities changed");
  const postgresControlIdentity = requirePostgresRevocation(
    details.postgresControlIdentity,
    "control",
  );
  const terminalPostgresIdentities = [
    postgresControlIdentity,
    ...requirePostgresRevocations(expectedPostgresIdentities),
  ];
  if (
    new Set(terminalPostgresIdentities.map((proof) => proof.identitySha256)).size
      !== terminalPostgresIdentities.length
    || new Set(terminalPostgresIdentities.map((proof) => proof.roleSha256)).size
      !== terminalPostgresIdentities.length
  ) throw new Error("Phase 2 PostgreSQL terminal revocation identities overlap");
  requireProductionAnchor(
    details.productionAnchor,
    details.resources,
    expectedCommit,
    "Phase 2 post-revoke",
  );
  requirePreviewAnchor(
    details.previewAnchor,
    details.resources,
    "Phase 2 post-revoke",
  );
  const pullRequest = details.pullRequest;
  if (
    !exactKeys(pullRequest, [
      "repository",
      "number",
      "state",
      "draft",
      "merged",
      "headCommit",
      "evidenceSha256",
    ])
    || pullRequest.repository !== "garymmmjw/QuantGym"
    || pullRequest.number !== 130
    || pullRequest.state !== "open"
    || pullRequest.draft !== true
    || pullRequest.merged !== false
    || pullRequest.headCommit !== evidenceHeadCommit
    || !HASH_PATTERN.test(pullRequest.evidenceSha256 ?? "")
  ) throw new Error("Phase 2 post-revoke pull request continuity is invalid");
  const previewApi = details.previewApi;
  if (
    !exactKeys(previewApi, [
      "resourceIdentitySha256",
      "deploymentCommit",
      "live",
      "evidenceSha256",
    ])
    || previewApi.resourceIdentitySha256 !== details.resources.api.identitySha256
    || previewApi.deploymentCommit !== expectedCommit
    || previewApi.live !== true
    || !HASH_PATTERN.test(previewApi.evidenceSha256 ?? "")
  ) throw new Error("Phase 2 post-revoke Preview API continuity is invalid");
  const previewDatabase = details.previewDatabase;
  if (
    !exactKeys(previewDatabase, [
      "resourceIdentitySha256",
      "revision",
      "readSucceeded",
      "evidenceSha256",
    ])
    || previewDatabase.resourceIdentitySha256
      !== details.resources.postgres.identitySha256
    || previewDatabase.revision !== PHASE2_REVISION
    || previewDatabase.readSucceeded !== true
    || !HASH_PATTERN.test(previewDatabase.evidenceSha256 ?? "")
  ) throw new Error("Phase 2 post-revoke Preview database continuity is invalid");
  const previewR2 = details.previewR2;
  if (
    !exactKeys(previewR2, [
      "resourceIdentitySha256",
      "readSucceeded",
      "policyBucketBound",
      "policyReadOnly",
      "writeDenied",
      "productionAccessDenied",
      "mutationAttempted",
      "evidenceSha256",
    ])
    || previewR2.resourceIdentitySha256 !== details.resources.r2.identitySha256
    || previewR2.readSucceeded !== true
    || previewR2.policyBucketBound !== true
    || previewR2.policyReadOnly !== true
    || previewR2.writeDenied !== true
    || previewR2.productionAccessDenied !== true
    || previewR2.mutationAttempted !== false
    || !HASH_PATTERN.test(previewR2.evidenceSha256 ?? "")
  ) throw new Error("Phase 2 post-revoke Preview R2 continuity is invalid");
  return receipt;
};

const runAction = async ({ actions, name, context, label, detailKeys }) => {
  let receipt;
  try {
    receipt = await actions[name](context);
  } catch {
    throw new Error(`${label} failed`);
  }
  return requireEnvelope(receipt, label, detailKeys);
};

const makeStep = ({ id, startedAt, completedAt, receipt }) => {
  const durationMs = Date.parse(completedAt) - Date.parse(startedAt);
  if (
    !Number.isSafeInteger(durationMs)
    || durationMs < 0
    || durationMs > MAX_CUTOVER_STEP_DURATION_MS
  ) throw new Error(`Phase 2 ${id} exceeded its maximum duration`);
  return {
    id,
    status: "pass",
    startedAt,
    completedAt,
    durationMs,
    evidenceSha256: receipt.evidenceSha256,
  };
};

const TERMINAL_INTENT_PREFIX_KEYS = Object.freeze([
  "candidateGate",
  "operatorPreflight",
  "credentialBoundary",
  "resources",
  "productionContinuity",
  "deployments",
  "deploymentControls",
  "databaseBackup",
  "databaseMigration",
  "acceptanceData",
  "liveChecks",
  "cleanup",
  "temporaryAccess",
  "pullRequest",
]);

const TERMINAL_CONTINUITY_BASIS_KEYS = Object.freeze([
  "continuityObservedAt",
  "continuityObservationCompletedAt",
  "resources",
  "productionAnchor",
  "previewAnchor",
  "pullRequest",
  "previewApi",
  "previewDatabase",
  "previewR2",
  "renderControlCredentialIdentitySha256",
  "postgresProviderCredentialInventoryUnchanged",
  "postgresProviderCredentialInventorySha256",
  "persistentProviderAdmin",
  "remainingReadOnlyControlProviders",
  "terminalTemporaryControlProviders",
  "remainingControlCredentialsReadOnly",
  "runtimeIdentitiesUnchanged",
  "renderTopologyObservation",
]);

const validateTerminalIntentShape = (intent) => {
  if (
    !isPlainObject(intent)
    || !exactKeys(intent, [
      "kind",
      "expectedCommit",
      "startedAt",
      "prefixFacts",
      "cutoverSequence",
      "continuityBasis",
    ])
    || intent.kind !== "phase2-terminal-revocation-intent-v1"
    || !SHA_PATTERN.test(intent.expectedCommit ?? "")
    || !Number.isFinite(Date.parse(intent.startedAt))
    || !exactKeys(intent.prefixFacts, TERMINAL_INTENT_PREFIX_KEYS)
    || !Array.isArray(intent.cutoverSequence)
    || !exactKeys(intent.continuityBasis, TERMINAL_CONTINUITY_BASIS_KEYS)
  ) throw new Error("Phase 2 terminal revocation intent is invalid");
  return intent;
};

export const finalizePhase2TerminalRevocationIntent = ({
  intent,
  postRevokeReceipt,
  completedAt,
  capturedAt,
}) => {
  validateTerminalIntentShape(intent);
  requireEnvelope(
    postRevokeReceipt,
    "Phase 2 post-revoke continuity",
    POST_REVOKE_DETAIL_KEYS,
  );
  const startedMs = Date.parse(intent.startedAt);
  const completedMs = Date.parse(completedAt);
  const capturedMs = Date.parse(capturedAt);
  const details = postRevokeReceipt.details;
  requireTerminalObservationBoundary(details);
  const sustainableRevalidation = requireSustainableControlRevalidation(details);
  const observedMs = Date.parse(details.continuityObservedAt);
  const observationCompletedMs = Date.parse(details.continuityObservationCompletedAt);
  const revalidatedMs = Date.parse(sustainableRevalidation.checkedAt);
  const revalidationCompletedMs = Date.parse(sustainableRevalidation.completedAt);
  if (
    !Number.isFinite(completedMs)
    || !Number.isFinite(capturedMs)
    || !Number.isFinite(observedMs)
    || !Number.isFinite(observationCompletedMs)
    || !Number.isFinite(revalidatedMs)
    || !Number.isFinite(revalidationCompletedMs)
    || observedMs < startedMs
    || observationCompletedMs < observedMs
    || revalidatedMs < observationCompletedMs
    || revalidatedMs < observedMs
    || revalidationCompletedMs < revalidatedMs
    || revalidationCompletedMs > completedMs
    || completedMs < startedMs
    || completedMs - observedMs > MAX_TERMINAL_CONTINUITY_HANDOFF_MS
    || capturedMs < completedMs
  ) throw new Error("Phase 2 terminal revocation timestamps are invalid");
  const expectedRenderProofSha256 = sha256(canonicalJson({
    accessDenied: details.renderControlAccessDenied,
    credentialIdentitySha256: details.renderControlCredentialIdentitySha256,
    refreshDenied: details.renderControlRefreshDenied,
    revoked: details.renderControlRevoked,
  }));
  if (
    details.renderControlRevocationEvidenceSha256 !== expectedRenderProofSha256
    || !canonicalEqual(
      Object.fromEntries(TERMINAL_CONTINUITY_BASIS_KEYS.map((key) => [
        key,
        details[key],
      ])),
      intent.continuityBasis,
    )
  ) throw new Error("Phase 2 terminal revocation proof is not bound to its intent");
  const step = makeStep({
    id: "post-revoke-continuity",
    startedAt: intent.startedAt,
    completedAt,
    receipt: postRevokeReceipt,
  });
  const cutoverSequence = [...structuredClone(intent.cutoverSequence), step];
  const cutoverDurationMs = completedMs - Date.parse(cutoverSequence[0]?.startedAt ?? "");
  if (
    !Number.isSafeInteger(cutoverDurationMs)
    || cutoverDurationMs < 0
    || cutoverDurationMs > MAX_CUTOVER_DURATION_MS
  ) throw new Error("Phase 2 cutover exceeded its maximum duration");
  return Object.freeze({
    capturedAt,
    step,
    facts: {
      ...structuredClone(intent.prefixFacts),
      postRevokeContinuity: {
        status: "pass",
        checkedAt: details.continuityObservedAt,
        continuityObservationCompletedAt:
          details.continuityObservationCompletedAt,
        terminalRevocationCompletedAt: completedAt,
        continuityToTerminalRevocationMs: completedMs - observedMs,
        controlIdentitySha256:
          intent.prefixFacts.credentialBoundary.control.identitySha256,
        resources: structuredClone(details.resources),
        productionAnchor: structuredClone(details.productionAnchor),
        previewAnchor: structuredClone(details.previewAnchor),
        pullRequest: {
          ...structuredClone(details.pullRequest),
          checkedAt: details.continuityObservedAt,
        },
        previewApi: structuredClone(details.previewApi),
        previewDatabase: structuredClone(details.previewDatabase),
        previewR2: structuredClone(details.previewR2),
        renderControlRevoked: details.renderControlRevoked,
        renderControlAccessDenied: details.renderControlAccessDenied,
        renderControlRefreshDenied: details.renderControlRefreshDenied,
        renderControlCredentialIdentitySha256:
          details.renderControlCredentialIdentitySha256,
        renderControlRevocationEvidenceSha256:
          details.renderControlRevocationEvidenceSha256,
        postgresControlRevokedAfterContinuity:
          details.postgresControlRevokedAfterContinuity,
        postgresControlIdentity: structuredClone(details.postgresControlIdentity),
        postgresProviderCredentialInventoryUnchanged:
          details.postgresProviderCredentialInventoryUnchanged,
        postgresProviderCredentialInventorySha256:
          details.postgresProviderCredentialInventorySha256,
        persistentProviderAdmin: structuredClone(details.persistentProviderAdmin),
        remainingReadOnlyControlProviders: structuredClone(
          details.remainingReadOnlyControlProviders,
        ),
        terminalTemporaryControlProviders: structuredClone(
          details.terminalTemporaryControlProviders,
        ),
        terminalTemporaryControlCredentialsRevoked:
          details.terminalTemporaryControlCredentialsRevoked,
        remainingControlCredentialsReadOnly:
          details.remainingControlCredentialsReadOnly,
        runtimeIdentitiesUnchanged: details.runtimeIdentitiesUnchanged,
        renderTopologyObservation: structuredClone(
          details.renderTopologyObservation,
        ),
        sustainableControlRevalidation: structuredClone(
          details.sustainableControlRevalidation,
        ),
        evidenceSha256: postRevokeReceipt.evidenceSha256,
      },
      cutoverSequence,
      cutoverDurationMs,
    },
  });
};

const runStep = async ({ actions, name, id, context, clock, detailKeys }) => {
  const startedAt = timestamp(clock);
  const receipt = await runAction({
    actions,
    name,
    context,
    label: `Phase 2 ${id}`,
    detailKeys,
  });
  const completedAt = timestamp(clock);
  return {
    receipt,
    step: makeStep({ id, startedAt, completedAt, receipt }),
  };
};

const cleanupPassed = (details) => (
  details.syntheticApplicationRows === 0
  && details.syntheticR2Objects === 0
  && details.syntheticCatalogRows === 0
);

const requirePostgresRevocation = (proof, kind) => {
  if (
    !exactKeys(proof, [
      "kind",
      "identitySha256",
      "roleSha256",
      "revoked",
      "roleAbsent",
      "loginDenied",
      "evidenceSha256",
    ])
    || proof.kind !== kind
    || !HASH_PATTERN.test(proof.identitySha256 ?? "")
    || !HASH_PATTERN.test(proof.roleSha256 ?? "")
    || proof.revoked !== true
    || proof.roleAbsent !== true
    || proof.loginDenied !== true
    || !HASH_PATTERN.test(proof.evidenceSha256 ?? "")
  ) throw new Error(`Phase 2 PostgreSQL ${kind} identity revocation is invalid`);
  return proof;
};

const requirePostgresRevocations = (value) => {
  if (!Array.isArray(value) || value.length !== POSTGRES_IDENTITY_KINDS.length) {
    throw new Error("Phase 2 PostgreSQL revocation identity inventory is invalid");
  }
  const identities = [];
  const roles = [];
  POSTGRES_IDENTITY_KINDS.forEach((kind, index) => {
    const proof = requirePostgresRevocation(value[index], kind);
    identities.push(proof.identitySha256);
    roles.push(proof.roleSha256);
  });
  if (new Set(identities).size !== identities.length || new Set(roles).size !== roles.length) {
    throw new Error("Phase 2 PostgreSQL revocation identities overlap");
  }
  return value;
};

const revokePassed = (
  details,
  expectedBindings,
  expectedPostgresProviderCredentialInventorySha256,
) => {
  if (
    details.cloudflareRevoked !== true
    || details.renderRevoked !== true
    || details.postgresRevoked !== true
    || details.r2Revoked !== true
    || details.mutationCredentialsRevoked !== true
    || details.controlIdentityRetained !== true
    || details.postgresControlRevocationPending !== true
    || details.renderControlRevocationPending !== true
    || details.postgresProviderCredentialInventoryUnchanged !== true
    || !HASH_PATTERN.test(
      details.postgresProviderCredentialInventorySha256 ?? "",
    )
    || (
      expectedPostgresProviderCredentialInventorySha256 !== undefined
      && details.postgresProviderCredentialInventorySha256
        !== expectedPostgresProviderCredentialInventorySha256
    )
    || !canonicalEqual(
      details.remainingReadOnlyControlProviders,
      REMAINING_READ_ONLY_CONTROL_PROVIDERS,
    )
    || !canonicalEqual(
      details.terminalTemporaryControlProviders,
      TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
    )
    || details.terminalRevocationRequired !== true
    || details.terminalRevocationPending !== true
    || !HASH_PATTERN.test(details.renderControlCredentialIdentitySha256 ?? "")
  ) return false;
  try {
    requireMutationBindings(details.revokedMutationTokenBindings, "Phase 2 revoked");
    requirePostgresRevocations(details.postgresIdentities);
  } catch {
    return false;
  }
  return expectedBindings === undefined
    || canonicalEqual(details.revokedMutationTokenBindings, expectedBindings);
};

const pullRequestProofFromCandidate = (receipt, checkedAt) => ({
  repository: receipt.details.repository,
  number: receipt.details.pullRequestNumber,
  state: receipt.details.pullRequestState,
  draft: receipt.details.pullRequestDraft,
  merged: receipt.details.pullRequestMerged,
  headCommit: receipt.details.pullRequestHeadCommit,
  checkedAt,
  evidenceSha256: receipt.evidenceSha256,
});

const pullRequestProof = (receipt, checkedAt) => ({
  ...structuredClone(receipt.details),
  checkedAt,
  evidenceSha256: receipt.evidenceSha256,
});

const recoveryEntry = (id, status, evidenceSha256 = null) => ({
  id,
  status,
  evidenceSha256,
});

const validateRollbackReceipt = ({ receipt, resource, commit, label }) => {
  if (
    receipt.details.commit !== commit
    || receipt.details.resourceIdentitySha256 !== resource.identitySha256
  ) throw new Error(`${label} did not restore the exact Preview deployment`);
};

const makeFailureReport = ({
  expectedCommit,
  failedStage,
  candidateGatePassed,
  providerWriteAttempted,
  completedStages,
  recoveryActions,
}) => {
  const attempted = recoveryActions.filter(({ status }) => status !== "skipped");
  const recoveryStatus = attempted.length === 0
    ? "not-required"
    : attempted.some(({ status }) => status === "failed")
      ? "incomplete"
      : "pass";
  return {
    schemaVersion: 1,
    phase: 2,
    status: "failed",
    environment: "preview",
    applicationCommit: expectedCommit,
    failedStage,
    candidateGatePassed,
    providerWriteAttempted,
    productionMutation: false,
    completedStages: [...completedStages],
    recoveryStatus,
    recoveryActions: recoveryActions.map((entry) => ({ ...entry })),
  };
};

const recoverFromFailure = async ({
  actions,
  state,
  controlContext,
  mutationContext,
}) => {
  const recoveryActions = [];
  const attempt = async ({
    id,
    name,
    shouldRun,
    context,
    detailKeys,
    validate = () => {},
  }) => {
    if (!shouldRun) {
      recoveryActions.push(recoveryEntry(id, "skipped"));
      return;
    }
    try {
      const receipt = await runAction({
        actions,
        name,
        context,
        label: `Phase 2 recovery ${id}`,
        detailKeys,
      });
      validate(receipt);
      recoveryActions.push(recoveryEntry(id, "pass", receipt.evidenceSha256));
    } catch {
      recoveryActions.push(recoveryEntry(id, "failed"));
    }
  };

  if (
    state.revocationOutcome !== "not-started"
    && state.revocationOutcome !== "none"
  ) {
    for (const id of [
      "cleanup",
      "rollback-pages",
      "rollback-api",
      "restore-database",
      "destroy-restore-target",
    ]) recoveryActions.push(recoveryEntry(id, "skipped"));
    await attempt({
      id: "verify-recovery",
      name: "verifyRecovery",
      shouldRun: Boolean(state.topologyAfter),
      context: {
        ...controlContext,
        recovery: true,
        postRevoke: true,
        expectedPreviewAnchor: state.topologyAfter?.details.previewAnchor,
        expectedProductionAnchor: state.topologyAfter?.details.productionAnchor,
      },
      detailKeys: [
        "resources",
        "productionAnchor",
        "previewAnchor",
        "syntheticApplicationRows",
        "syntheticR2Objects",
        "syntheticCatalogRows",
      ],
      validate: (receipt) => {
        if (
          !canonicalEqual(receipt.details.resources, state.topologyAfter.details.resources)
          || !canonicalEqual(
            receipt.details.productionAnchor,
            state.topologyAfter.details.productionAnchor,
          )
          || !canonicalEqual(
            receipt.details.previewAnchor,
            state.topologyAfter.details.previewAnchor,
          )
          || !cleanupPassed(receipt.details)
        ) throw new Error("Phase 2 post-revoke verification failed");
      },
    });
    recoveryActions.push(recoveryEntry(
      "revoke-mutation-access",
      state.mutationAccessRevoked ? "pass" : "failed",
      state.revoke?.receipt.evidenceSha256,
    ));
    if (state.mutationAccessRevoked) {
      recoveryActions.push(recoveryEntry("emergency-revoke-mutation-access", "skipped"));
    } else {
      await attempt({
        id: "emergency-revoke-mutation-access",
        name: "emergencyRevoke",
        shouldRun: true,
        context: { ...mutationContext, recovery: true },
        detailKeys: REVOKE_DETAIL_KEYS,
        validate: (receipt) => {
          if (!revokePassed(
            receipt.details,
            state.preflight?.details.mutationTokenBindings,
            state.preflight?.details.terminalTemporaryControl?.postgres
              ?.providerCredentialInventorySha256,
          )) {
            throw new Error("Phase 2 emergency mutation access revoke failed");
          }
        },
      });
    }
    return recoveryActions;
  }

  await attempt({
    id: "cleanup",
    name: "recoverCleanup",
    shouldRun: state.seedAttempted || state.cleanupAttempted,
    context: {
      ...mutationContext,
      recovery: true,
      acceptanceData: state.seed?.details,
    },
    detailKeys: CLEANUP_DETAIL_KEYS,
    validate: (receipt) => {
      if (!cleanupPassed(receipt.details)) {
        throw new Error("Phase 2 recovery cleanup was incomplete");
      }
    },
  });
  await attempt({
    id: "rollback-pages",
    name: "rollbackPages",
    shouldRun: state.pagesDeployAttempted,
    context: {
      ...mutationContext,
      recovery: true,
      target: state.topologyBefore?.details.previewAnchor.pagesDeploymentCommit,
    },
    detailKeys: ["commit", "resourceIdentitySha256"],
    validate: (receipt) => validateRollbackReceipt({
      receipt,
      resource: state.topologyBefore.details.resources.pages,
      commit: state.topologyBefore.details.previewAnchor.pagesDeploymentCommit,
      label: "Phase 2 Pages rollback",
    }),
  });
  await attempt({
    id: "rollback-api",
    name: "rollbackApi",
    shouldRun: state.apiDeployAttempted,
    context: {
      ...mutationContext,
      recovery: true,
      target: state.topologyBefore?.details.previewAnchor.apiDeploymentCommit,
    },
    detailKeys: ["commit", "resourceIdentitySha256"],
    validate: (receipt) => validateRollbackReceipt({
      receipt,
      resource: state.topologyBefore.details.resources.api,
      commit: state.topologyBefore.details.previewAnchor.apiDeploymentCommit,
      label: "Phase 2 API rollback",
    }),
  });
  await attempt({
    id: "restore-database",
    name: "restorePreviewDatabase",
    shouldRun: state.migrationAttempted,
    context: {
      ...mutationContext,
      recovery: true,
      backup: state.backup?.receipt.details,
    },
    detailKeys: [
      "backupSha256",
      "sourceResourceSha256",
      "restoredRevision",
      "restoredSchemaSha256",
      "restoredContentSnapshot",
    ],
    validate: (receipt) => {
      const backup = state.backup.receipt.details;
      if (
        receipt.details.backupSha256 !== backup.backupSha256
        || receipt.details.sourceResourceSha256 !== backup.sourceResourceSha256
        || receipt.details.restoredRevision !== PHASE1_REVISION
        || receipt.details.restoredSchemaSha256 !== backup.sourceSchemaSha256
        || !canonicalEqual(
          receipt.details.restoredContentSnapshot,
          backup.sourceContentSnapshot,
        )
      ) throw new Error("Phase 2 Preview database recovery did not restore Phase 1");
    },
  });
  await attempt({
    id: "destroy-restore-target",
    name: "destroyRestoreTarget",
    shouldRun: state.restoreAttempted && !state.restoreTargetDestroyed,
    context: {
      ...mutationContext,
      recovery: true,
      restore: state.restore?.receipt.details,
    },
    detailKeys: [
      "targetResourceSha256",
      "destroyed",
      "absentAfterDestroy",
      "restoreIdentitySha256",
      "restoreRoleSha256",
      "restoreRoleAbsent",
      "restoreLoginDenied",
    ],
    validate: (receipt) => {
      const target = receipt.details.targetResourceSha256;
      if (
        !HASH_PATTERN.test(target ?? "")
        || target === state.topologyBefore?.details.resources.postgres.identitySha256
        || target === state.topologyBefore?.details.resources.productionPostgres.identitySha256
        || receipt.details.destroyed !== true
        || receipt.details.absentAfterDestroy !== true
        || !HASH_PATTERN.test(receipt.details.restoreIdentitySha256 ?? "")
        || !HASH_PATTERN.test(receipt.details.restoreRoleSha256 ?? "")
        || receipt.details.restoreRoleAbsent !== true
        || receipt.details.restoreLoginDenied !== true
      ) throw new Error("Phase 2 recovery did not destroy the restore target");
    },
  });
  await attempt({
    id: "verify-recovery",
    name: "verifyRecovery",
    shouldRun: state.providerWriteAttempted && Boolean(state.topologyBefore),
    context: {
      ...controlContext,
      recovery: true,
      expectedPreviewAnchor: state.topologyBefore?.details.previewAnchor,
      expectedProductionAnchor: state.topologyBefore?.details.productionAnchor,
    },
    detailKeys: [
      "resources",
      "productionAnchor",
      "previewAnchor",
      "syntheticApplicationRows",
      "syntheticR2Objects",
      "syntheticCatalogRows",
    ],
    validate: (receipt) => {
      if (
        !canonicalEqual(receipt.details.resources, state.topologyBefore.details.resources)
        || !canonicalEqual(
          receipt.details.productionAnchor,
          state.topologyBefore.details.productionAnchor,
        )
        || !canonicalEqual(receipt.details.previewAnchor, state.topologyBefore.details.previewAnchor)
        || !cleanupPassed(receipt.details)
      ) throw new Error("Phase 2 recovery verification failed");
    },
  });

  let revoked = false;
  await attempt({
    id: "revoke-mutation-access",
    name: "revokeTemporaryAccess",
    shouldRun: true,
    context: { ...mutationContext, recovery: true },
    detailKeys: REVOKE_DETAIL_KEYS,
    validate: (receipt) => {
      if (!revokePassed(
        receipt.details,
        state.preflight?.details.mutationTokenBindings,
        state.preflight?.details.terminalTemporaryControl?.postgres
          ?.providerCredentialInventorySha256,
      )) {
        throw new Error("Phase 2 mutation access revoke failed");
      }
      revoked = true;
    },
  });
  if (!revoked) {
    await attempt({
      id: "emergency-revoke-mutation-access",
      name: "emergencyRevoke",
      shouldRun: true,
      context: { ...mutationContext, recovery: true },
      detailKeys: REVOKE_DETAIL_KEYS,
      validate: (receipt) => {
        if (!revokePassed(
          receipt.details,
          state.preflight?.details.mutationTokenBindings,
          state.preflight?.details.terminalTemporaryControl?.postgres
            ?.providerCredentialInventorySha256,
        )) {
          throw new Error("Phase 2 emergency mutation access revoke failed");
        }
      },
    });
  } else {
    recoveryActions.push(recoveryEntry("emergency-revoke-mutation-access", "skipped"));
  }
  return recoveryActions;
};

export async function runPhase2PreviewCutover({
  mode = "dry-run",
  expectedCommit,
  actions,
  credentialRoles,
  evidenceFactsSink,
  terminalCompletionSink,
  terminalIntentSink,
  environment = process.env,
  clock = () => new Date(),
} = {}) {
  if (!new Set(["dry-run", "execute"]).has(mode)) {
    throw new Error("Phase 2 cutover mode must be dry-run or execute");
  }
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("Phase 2 cutover commit is invalid");
  validateActionSet(actions, mode);
  const credentialFailures = validatePhase2CredentialRoles(credentialRoles);
  if (credentialFailures.length > 0) {
    throw new Error(`Phase 2 cutover credential roles failed: ${credentialFailures[0]}`);
  }
  if (mode === "execute") requireExecutionConfirmation(environment, expectedCommit);

  const roleDescriptors = Object.freeze({
    bootstrap: Object.freeze({ ...credentialRoles.bootstrap }),
    control: Object.freeze({ ...credentialRoles.control }),
    mutation: Object.freeze({ ...credentialRoles.mutation }),
  });

  const baseContext = Object.freeze({
    mode,
    expectedCommit,
    environment: "preview",
    productionMutationAllowed: false,
    providerDowngradeAllowed: false,
    resourceSharingAllowed: false,
  });
  const controlContext = Object.freeze({
    ...baseContext,
    credentialRole: roleDescriptors.control,
  });
  const mutationContext = Object.freeze({
    ...baseContext,
    credentialRole: roleDescriptors.mutation,
  });
  const state = {
    candidateGatePassed: false,
    providerWriteAttempted: false,
    completedStages: [],
    currentStage: "candidate-gate",
    preflight: undefined,
    topologyBefore: undefined,
    topologyAfter: undefined,
    backup: undefined,
    restore: undefined,
    restoreAttempted: false,
    restoreTargetDestroyed: false,
    migrationAttempted: false,
    apiDeployAttempted: false,
    pagesDeployAttempted: false,
    seedAttempted: false,
    cleanupAttempted: false,
    revocationOutcome: "not-started",
    mutationAccessRevoked: false,
    revoke: undefined,
  };

  let candidateReceipt;
  let candidateCheckedAt;
  try {
    candidateReceipt = requireCandidateGate(
      await actions.candidateGate(controlContext),
      expectedCommit,
    );
    candidateCheckedAt = timestamp(clock);
    state.evidenceHeadCommit = candidateReceipt.details.evidenceHeadCommit;
    state.candidateGatePassed = true;
    state.completedStages.push("candidate-gate");
  } catch {
    const recoveryActions = [];
    try {
      const emergencyReceipt = await actions.emergencyRevoke({
        ...mutationContext,
        recovery: true,
      });
      requireEnvelope(
        emergencyReceipt,
        "Phase 2 candidate-gate emergency revoke",
        REVOKE_DETAIL_KEYS,
      );
      if (!revokePassed(emergencyReceipt.details, undefined)) {
        throw new Error("candidate-gate emergency revoke proof is invalid");
      }
      recoveryActions.push(recoveryEntry(
        "emergency-revoke-mutation-access",
        "pass",
        emergencyReceipt.evidenceSha256,
      ));
    } catch {
      recoveryActions.push(recoveryEntry(
        "emergency-revoke-mutation-access",
        "failed",
      ));
    }
    throw new Phase2CutoverFailure("candidate-gate", makeFailureReport({
      expectedCommit,
      failedStage: "candidate-gate",
      candidateGatePassed: false,
      providerWriteAttempted: false,
      completedStages: state.completedStages,
      recoveryActions,
    }));
  }

  const cutoverSequence = [];
  try {
    state.currentStage = "operator-preflight";
    state.preflight = requirePreflight(
      await actions.preflight(controlContext),
      expectedCommit,
    );
    const preflightCheckedAt = timestamp(clock);
    state.completedStages.push("operator-preflight");

    state.currentStage = "topology-before";
    state.topologyBefore = requireTopology(
      await actions.inspectTopology({ ...controlContext, point: "before" }),
      expectedCommit,
      "Phase 2 pre-cutover topology",
    );
    const topologyBeforeCheckedAt = timestamp(clock);
    if (
      state.topologyBefore.details.previewAnchor.pagesDeploymentCommit
        !== PHASE1_APPLICATION_COMMIT
      || state.topologyBefore.details.previewAnchor.apiDeploymentCommit
        !== PHASE1_APPLICATION_COMMIT
      || state.topologyBefore.details.previewAnchor.llmDeploymentCommit
        !== PHASE1_APPLICATION_COMMIT
      || state.topologyBefore.details.previewAnchor.databaseRevision !== PHASE1_REVISION
    ) throw new Error("Phase 2 pre-cutover Preview is not frozen at accepted Phase 1");
    state.completedStages.push("topology-before");

    state.currentStage = "backup";
    state.providerWriteAttempted = true;
    const backup = await runStep({
      actions,
      name: "backup",
      id: "backup",
      context: mutationContext,
      clock,
      detailKeys: [
        "backupSha256",
        "sourceResourceSha256",
        "sourceRevision",
        "sourceSchemaSha256",
        "sourceContentSnapshot",
      ],
    });
    if (
      !HASH_PATTERN.test(backup.receipt.details.backupSha256 ?? "")
      || backup.receipt.details.sourceResourceSha256
        !== state.topologyBefore.details.resources.postgres.identitySha256
      || backup.receipt.details.sourceRevision !== PHASE1_REVISION
      || !HASH_PATTERN.test(backup.receipt.details.sourceSchemaSha256 ?? "")
      || !validContentSnapshot(backup.receipt.details.sourceContentSnapshot)
    ) throw new Error("Phase 2 backup did not bind the exact Phase 1 Preview PostgreSQL resource");
    state.backup = backup;
    cutoverSequence.push(backup.step);
    state.completedStages.push("backup");

    state.currentStage = "restore-proof";
    state.restoreAttempted = true;
    const restore = await runStep({
      actions,
      name: "proveRestore",
      id: "restore-proof",
      context: { ...mutationContext, backup: backup.receipt.details },
      clock,
      detailKeys: [
        "backupSha256",
        "sourceResourceSha256",
        "targetResourceSha256",
        "sourceRevision",
        "sourceSchemaSha256",
        "sourceContentSnapshot",
      ],
    });
    if (
      restore.receipt.details.backupSha256 !== backup.receipt.details.backupSha256
      || restore.receipt.details.sourceResourceSha256
        !== backup.receipt.details.sourceResourceSha256
      || restore.receipt.details.sourceRevision !== backup.receipt.details.sourceRevision
      || restore.receipt.details.sourceSchemaSha256
        !== backup.receipt.details.sourceSchemaSha256
      || !canonicalEqual(
        restore.receipt.details.sourceContentSnapshot,
        backup.receipt.details.sourceContentSnapshot,
      )
      || !HASH_PATTERN.test(restore.receipt.details.targetResourceSha256 ?? "")
      || new Set([
        state.topologyBefore.details.resources.postgres.identitySha256,
        state.topologyBefore.details.resources.productionPostgres.identitySha256,
      ]).has(restore.receipt.details.targetResourceSha256)
    ) throw new Error("Phase 2 restore proof is not isolated or backup-bound");
    state.restore = restore;
    cutoverSequence.push(restore.step);
    state.completedStages.push("restore-proof");

    state.currentStage = "restore-target-destroy";
    const restoreDestroy = await runStep({
      actions,
      name: "destroyRestoreTarget",
      id: "restore-target-destroy",
      context: { ...mutationContext, restore: restore.receipt.details },
      clock,
      detailKeys: [
        "targetResourceSha256",
        "destroyed",
        "absentAfterDestroy",
        "restoreIdentitySha256",
        "restoreRoleSha256",
        "restoreRoleAbsent",
        "restoreLoginDenied",
      ],
    });
    if (
      restoreDestroy.receipt.details.targetResourceSha256
        !== restore.receipt.details.targetResourceSha256
      || restoreDestroy.receipt.details.destroyed !== true
      || restoreDestroy.receipt.details.absentAfterDestroy !== true
      || !HASH_PATTERN.test(restoreDestroy.receipt.details.restoreIdentitySha256 ?? "")
      || !HASH_PATTERN.test(restoreDestroy.receipt.details.restoreRoleSha256 ?? "")
      || restoreDestroy.receipt.details.restoreRoleAbsent !== true
      || restoreDestroy.receipt.details.restoreLoginDenied !== true
    ) throw new Error("Phase 2 restore target was not destroyed and confirmed absent");
    state.restoreTargetDestroyed = true;
    cutoverSequence.push(restoreDestroy.step);
    state.completedStages.push("restore-target-destroy");

    state.currentStage = "migration";
    state.migrationAttempted = true;
    const migration = await runStep({
      actions,
      name: "migrate",
      id: "migration",
      context: mutationContext,
      clock,
      detailKeys: [
        "direction",
        "fromRevision",
        "toRevision",
        "sourceSchemaSha256",
        "targetSchemaSha256",
        "roundTripSchemaSha256",
        "localDowngradeGatePassed",
        "providerDowngradeExecuted",
      ],
    });
    const migrationDetails = migration.receipt.details;
    if (
      migrationDetails.direction !== "upgrade"
      || migrationDetails.fromRevision !== PHASE1_REVISION
      || migrationDetails.toRevision !== PHASE2_REVISION
      || migrationDetails.sourceSchemaSha256 !== backup.receipt.details.sourceSchemaSha256
      || migrationDetails.localDowngradeGatePassed !== true
      || migrationDetails.providerDowngradeExecuted !== false
      || !HASH_PATTERN.test(migrationDetails.targetSchemaSha256 ?? "")
      || migrationDetails.targetSchemaSha256 !== migrationDetails.roundTripSchemaSha256
      || migrationDetails.sourceSchemaSha256 === migrationDetails.targetSchemaSha256
    ) throw new Error("Phase 2 migration attempted a downgrade or failed schema proof");
    cutoverSequence.push(migration.step);
    state.completedStages.push("migration");

    state.currentStage = "api-deploy";
    state.apiDeployAttempted = true;
    const api = await runStep({
      actions,
      name: "deployApi",
      id: "api-deploy",
      context: mutationContext,
      clock,
      detailKeys: ["commit", "resourceIdentitySha256"],
    });
    if (
      api.receipt.details.commit !== expectedCommit
      || api.receipt.details.resourceIdentitySha256
        !== state.topologyBefore.details.resources.api.identitySha256
    ) throw new Error("Phase 2 API deploy is not aligned to the exact Preview commit/resource");
    cutoverSequence.push(api.step);
    state.completedStages.push("api-deploy");

    state.currentStage = "pages-deploy";
    state.pagesDeployAttempted = true;
    const pages = await runStep({
      actions,
      name: "deployPages",
      id: "pages-deploy",
      context: mutationContext,
      clock,
      detailKeys: ["commit", "resourceIdentitySha256", "artifactManifestSha256"],
    });
    if (
      pages.receipt.details.commit !== expectedCommit
      || pages.receipt.details.resourceIdentitySha256
        !== state.topologyBefore.details.resources.pages.identitySha256
      || !HASH_PATTERN.test(pages.receipt.details.artifactManifestSha256 ?? "")
    ) throw new Error("Phase 2 Pages deploy is not aligned to the exact Preview commit/resource");
    cutoverSequence.push(pages.step);
    state.completedStages.push("pages-deploy");

    state.currentStage = "live-checks";
    const liveStartedAt = timestamp(clock);
    state.seedAttempted = true;
    const seed = await runAction({
      actions,
      name: "seedAcceptanceData",
      context: mutationContext,
      label: "Phase 2 rights-labelled acceptance seed",
      detailKeys: ["rightsLabelled", "syntheticOnly", "catalogSha256", "actorSha256"],
    });
    if (
      seed.details.rightsLabelled !== true
      || seed.details.syntheticOnly !== true
      || !HASH_PATTERN.test(seed.details.catalogSha256 ?? "")
      || !HASH_PATTERN.test(seed.details.actorSha256 ?? "")
    ) throw new Error("Phase 2 acceptance seed is not rights-labelled and synthetic-only");
    state.seed = seed;
    const seededAt = timestamp(clock);
    const live = await runAction({
      actions,
      name: "runLiveChecks",
      context: mutationContext,
      label: "Phase 2 live checks",
      detailKeys: ["checks"],
    });
    if (
      !Array.isArray(live.details.checks)
      || live.details.checks.length !== PHASE2_LIVE_CHECK_IDS.length
    ) throw new Error("Phase 2 live check inventory is incomplete");
    const liveCheckedAt = timestamp(clock);
    const liveChecks = PHASE2_LIVE_CHECK_IDS.map((id, index) => {
      const check = live.details.checks[index];
      const detailKeys = ["id", "status", "evidenceSha256"];
      if (id === "deployed-visual") detailKeys.push("deploymentCommit");
      if (id === "deployed-bundle") {
        detailKeys.push("deploymentCommit", "artifactManifestSha256");
      }
      if (
        !exactKeys(check, detailKeys)
        || check.id !== id
        || check.status !== "pass"
        || !HASH_PATTERN.test(check.evidenceSha256 ?? "")
      ) throw new Error(`Phase 2 ${id} live check is missing or failed`);
      if (
        (id === "deployed-visual" || id === "deployed-bundle")
        && check.deploymentCommit !== expectedCommit
      ) throw new Error(`Phase 2 ${id} live check is not commit-bound`);
      if (
        id === "deployed-bundle"
        && check.artifactManifestSha256
          !== pages.receipt.details.artifactManifestSha256
      ) throw new Error("Phase 2 deployed bundle check is not artifact-bound");
      return { ...check, checkedAt: liveCheckedAt };
    });
    const liveCompletedAt = timestamp(clock);
    cutoverSequence.push(makeStep({
      id: "live-checks",
      startedAt: liveStartedAt,
      completedAt: liveCompletedAt,
      receipt: live,
    }));
    state.completedStages.push("live-checks");

    state.currentStage = "cleanup";
    state.cleanupAttempted = true;
    const cleanup = await runStep({
      actions,
      name: "cleanup",
      id: "cleanup",
      context: mutationContext,
      clock,
      detailKeys: CLEANUP_DETAIL_KEYS,
    });
    if (!cleanupPassed(cleanup.receipt.details)) {
      throw new Error("Phase 2 cleanup did not prove zero synthetic rows, R2 objects, and catalog rows");
    }
    cutoverSequence.push(cleanup.step);
    state.completedStages.push("cleanup");

    state.currentStage = "topology-after";
    const topologyAfter = requireTopology(
      await actions.inspectTopology({ ...controlContext, point: "after" }),
      expectedCommit,
      "Phase 2 post-cutover topology",
    );
    state.topologyAfter = topologyAfter;
    const topologyAfterCheckedAt = timestamp(clock);
    if (
      !canonicalEqual(
        state.topologyBefore.details.productionAnchor,
        topologyAfter.details.productionAnchor,
      )
      || !canonicalEqual(
        state.topologyBefore.details.resources,
        topologyAfter.details.resources,
      )
      || topologyAfter.details.previewAnchor.pagesDeploymentCommit !== expectedCommit
      || topologyAfter.details.previewAnchor.apiDeploymentCommit !== expectedCommit
      || topologyAfter.details.previewAnchor.llmDeploymentCommit
        !== PHASE1_APPLICATION_COMMIT
      || topologyAfter.details.previewAnchor.llmConfigurationSha256
        !== state.topologyBefore.details.previewAnchor.llmConfigurationSha256
      || topologyAfter.details.previewAnchor.databaseRevision !== PHASE2_REVISION
    ) throw new Error("Phase 2 cutover changed Production control or missed the candidate Preview");
    state.completedStages.push("topology-after");

    state.currentStage = "pull-request-after";
    const pullRequestAfterReceipt = requirePullRequest(
      await actions.inspectPullRequest(controlContext),
      state.evidenceHeadCommit,
      "Phase 2 post-cutover pull request",
    );
    const pullRequestAfterCheckedAt = timestamp(clock);
    state.completedStages.push("pull-request-after");

    state.currentStage = "revoke";
    const revokeStartedAt = timestamp(clock);
    state.revocationOutcome = "indeterminate";
    let revokeReceipt;
    try {
      revokeReceipt = await actions.revokeTemporaryAccess(mutationContext);
      requireEnvelope(
        revokeReceipt,
        "Phase 2 revoke",
        REVOKE_DETAIL_KEYS,
      );
      if (!revokePassed(
        revokeReceipt.details,
        state.preflight?.details.mutationTokenBindings,
        state.preflight?.details.terminalTemporaryControl?.postgres
          ?.providerCredentialInventorySha256,
      )) {
        throw new Error("Phase 2 temporary mutation access was not fully revoked");
      }
      if (
        revokeReceipt.details.renderControlCredentialIdentitySha256
        !== state.preflight?.details.terminalTemporaryControl
          ?.renderCredentialIdentitySha256
      ) throw new Error("Phase 2 terminal Render control was not preflight-bound");
      const restoreRevocation = revokeReceipt.details.postgresIdentities[1];
      if (
        restoreRevocation.identitySha256
          !== restoreDestroy.receipt.details.restoreIdentitySha256
        || restoreRevocation.roleSha256
          !== restoreDestroy.receipt.details.restoreRoleSha256
      ) throw new Error("Phase 2 restore identity revoke proof is not destruction-bound");
      state.revocationOutcome = "complete";
      state.mutationAccessRevoked = true;
      state.revoke = { receipt: revokeReceipt };
    } catch (error) {
      if (state.revocationOutcome !== "complete") {
        state.revocationOutcome = REVOCATION_OUTCOMES.has(
          error?.mutationRevocationOutcome,
        ) ? error.mutationRevocationOutcome : "indeterminate";
      }
      throw error;
    }
    const revokeCompletedAt = timestamp(clock);
    const revoke = {
      receipt: revokeReceipt,
      step: makeStep({
        id: "revoke",
        startedAt: revokeStartedAt,
        completedAt: revokeCompletedAt,
        receipt: revokeReceipt,
      }),
    };
    state.revoke = revoke;
    cutoverSequence.push(revoke.step);
    state.completedStages.push("revoke");
    state.currentStage = "post-revoke-continuity";

    const candidateGate = {
      status: "pass",
      checkedAt: candidateCheckedAt,
      ...structuredClone(candidateReceipt.details),
      evidenceSha256: candidateReceipt.evidenceSha256,
    };
    const credentialBoundary = {
      bootstrap: structuredClone(roleDescriptors.bootstrap),
      control: structuredClone(roleDescriptors.control),
      mutation: structuredClone(roleDescriptors.mutation),
      identitiesDistinct: true,
    };
    const pullRequestBefore = pullRequestProofFromCandidate(
      candidateReceipt,
      candidateCheckedAt,
    );
    const pullRequestAfter = pullRequestProof(
      pullRequestAfterReceipt,
      pullRequestAfterCheckedAt,
    );
    const prefixFacts = {
      candidateGate,
      operatorPreflight: {
        status: "pass",
        checkedAt: preflightCheckedAt,
        ...structuredClone(state.preflight.details),
        evidenceSha256: state.preflight.evidenceSha256,
      },
      credentialBoundary,
      resources: structuredClone(topologyAfter.details.resources),
      productionContinuity: {
        before: structuredClone(state.topologyBefore.details.productionAnchor),
        beforeCheckedAt: topologyBeforeCheckedAt,
        after: structuredClone(topologyAfter.details.productionAnchor),
        afterCheckedAt: topologyAfterCheckedAt,
        controlIdentitySha256: roleDescriptors.control.identitySha256,
        unchanged: true,
      },
      deployments: {
        api: {
          provider: "render",
          resourceIdentitySha256: api.receipt.details.resourceIdentitySha256,
          commit: api.receipt.details.commit,
          status: "ready",
        },
        pages: {
          provider: "cloudflare-pages",
          resourceIdentitySha256: pages.receipt.details.resourceIdentitySha256,
          commit: pages.receipt.details.commit,
          status: "ready",
          artifactManifestSha256: pages.receipt.details.artifactManifestSha256,
        },
      },
      deploymentControls: {
        ...structuredClone(topologyAfter.details.deploymentControls),
        migrationPrecedesDeploy: true,
      },
      databaseBackup: {
        status: "pass",
        capturedAt: backup.step.completedAt,
        ...backup.receipt.details,
        restore: {
          status: "pass",
          verifiedAt: restore.step.completedAt,
          ...restore.receipt.details,
          destruction: {
            status: "pass",
            destroyedAt: restoreDestroy.step.completedAt,
            ...restoreDestroy.receipt.details,
            evidenceSha256: restoreDestroy.receipt.evidenceSha256,
          },
        },
      },
      databaseMigration: {
        status: "pass",
        ...migrationDetails,
        completedAt: migration.step.completedAt,
      },
      acceptanceData: {
        status: "pass",
        ...seed.details,
        seededAt,
      },
      liveChecks,
      cleanup: {
        status: "pass",
        ...cleanup.receipt.details,
        completedAt: cleanup.step.completedAt,
        evidenceSha256: cleanup.receipt.evidenceSha256,
      },
      temporaryAccess: {
        status: "pass",
        ...revoke.receipt.details,
        revokedAt: revoke.step.completedAt,
        evidenceSha256: revoke.receipt.evidenceSha256,
      },
      pullRequest: {
        before: pullRequestBefore,
        after: pullRequestAfter,
        unchanged: true,
      },
    };
    const validateTerminalFacts = ({ facts, capturedAt }) => {
      const syntheticEvidence = {
        schemaVersion: 1,
        phase: 2,
        status: "pass",
        capturedAt,
        expiresAt: new Date(
          Date.parse(capturedAt) + 24 * 60 * 60 * 1_000,
        ).toISOString(),
        environment: "preview",
        branch: "codex/frontend-v2-preview",
        applicationCommit: expectedCommit,
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
        ...facts,
      };
      const validationFailures = validatePhase2ProviderEvidence(syntheticEvidence, {
        expectedCommit,
        nowMs: Date.parse(syntheticEvidence.capturedAt),
      });
      if (validationFailures.length > 0) {
        throw new Error(`Phase 2 cutover facts failed: ${validationFailures[0]}`);
      }
    };
    const postRevokeStartedAt = timestamp(clock);
    let stagedIntent;
    let stagedTerminal;
    const stageTerminalIntent = mode === "execute" && typeof terminalIntentSink === "function"
      ? async (continuityBasis) => {
        stagedIntent = {
          kind: "phase2-terminal-revocation-intent-v1",
          expectedCommit,
          startedAt: postRevokeStartedAt,
          prefixFacts: structuredClone(prefixFacts),
          cutoverSequence: structuredClone(cutoverSequence),
          continuityBasis: structuredClone(continuityBasis),
        };
        validateTerminalIntentShape(stagedIntent);
        await terminalIntentSink({
          expectedCommit,
          intent: structuredClone(stagedIntent),
        });
      }
      : undefined;
    const completeTerminalIntent = (
      mode === "execute"
      && typeof terminalCompletionSink === "function"
    )
      ? async (actualReceipt) => {
        if (stagedIntent === undefined) {
          throw new Error("Phase 2 terminal revocation intent was not staged");
        }
        requirePostRevokeContinuity({
          receipt: actualReceipt,
          expectedCommit,
          evidenceHeadCommit: state.evidenceHeadCommit,
          expectedTopology: topologyAfter,
          expectedRenderControlCredentialIdentitySha256:
            revoke.receipt.details.renderControlCredentialIdentitySha256,
          expectedPostgresProviderCredentialInventorySha256:
            revoke.receipt.details.postgresProviderCredentialInventorySha256,
          expectedPostgresIdentities: revoke.receipt.details.postgresIdentities,
          expectedBootstrapIdentitySha256: roleDescriptors.bootstrap.identitySha256,
        });
        const completedAt = timestamp(clock);
        const capturedAt = timestamp(clock);
        const terminal = finalizePhase2TerminalRevocationIntent({
          intent: stagedIntent,
          postRevokeReceipt: actualReceipt,
          completedAt,
          capturedAt,
        });
        validateTerminalFacts(terminal);
        const persisted = await terminalCompletionSink({
          expectedCommit,
          postRevokeReceipt: structuredClone(actualReceipt),
          completedAt,
          capturedAt,
        });
        if (
          persisted?.capturedAt !== terminal.capturedAt
          || !canonicalEqual(persisted?.facts, terminal.facts)
        ) throw new Error("Phase 2 terminal revocation completion diverged");
        stagedTerminal = terminal;
      }
      : undefined;

    state.currentStage = "post-revoke-continuity";
    const postRevokeReceipt = await runAction({
      actions,
      name: "verifyPostRevokeContinuity",
      context: {
        ...controlContext,
        postRevoke: true,
        terminalStepStartedAt: postRevokeStartedAt,
        expectedTopology: structuredClone(topologyAfter.details),
        ...(stageTerminalIntent ? { stageTerminalIntent } : {}),
        ...(completeTerminalIntent ? { completeTerminalIntent } : {}),
      },
      label: "Phase 2 post-revoke-continuity",
      detailKeys: POST_REVOKE_DETAIL_KEYS,
    });
    requirePostRevokeContinuity({
      receipt: postRevokeReceipt,
      expectedCommit,
      evidenceHeadCommit: state.evidenceHeadCommit,
      expectedTopology: topologyAfter,
      expectedRenderControlCredentialIdentitySha256:
        revoke.receipt.details.renderControlCredentialIdentitySha256,
      expectedPostgresProviderCredentialInventorySha256:
        revoke.receipt.details.postgresProviderCredentialInventorySha256,
      expectedPostgresIdentities: revoke.receipt.details.postgresIdentities,
      expectedBootstrapIdentitySha256: roleDescriptors.bootstrap.identitySha256,
    });
    let terminal = stagedTerminal;
    if (terminal === undefined) {
      if (mode === "execute") {
        throw new Error("Phase 2 terminal revocation completion was not staged");
      }
      const continuityBasis = Object.fromEntries(
        TERMINAL_CONTINUITY_BASIS_KEYS.map((key) => [
          key,
          structuredClone(postRevokeReceipt.details[key]),
        ]),
      );
      const intent = {
        kind: "phase2-terminal-revocation-intent-v1",
        expectedCommit,
        startedAt: postRevokeStartedAt,
        prefixFacts: structuredClone(prefixFacts),
        cutoverSequence: structuredClone(cutoverSequence),
        continuityBasis,
      };
      terminal = finalizePhase2TerminalRevocationIntent({
        intent,
        postRevokeReceipt,
        completedAt: timestamp(clock),
        capturedAt: timestamp(clock),
      });
      validateTerminalFacts(terminal);
    }
    cutoverSequence.push(terminal.step);
    state.completedStages.push("post-revoke-continuity");
    state.currentStage = "evidence-finalization";
    const facts = terminal.facts;
    if (mode === "execute" && typeof evidenceFactsSink === "function") {
      await evidenceFactsSink({
        expectedCommit,
        capturedAt: terminal.capturedAt,
        facts: structuredClone(facts),
      });
    }
    return facts;
  } catch {
    const failedStage = state.currentStage;
    const recoveryActions = await recoverFromFailure({
      actions,
      state,
      controlContext,
      mutationContext,
    });
    throw new Phase2CutoverFailure(failedStage, makeFailureReport({
      expectedCommit,
      failedStage,
      candidateGatePassed: state.candidateGatePassed,
      providerWriteAttempted: state.providerWriteAttempted,
      completedStages: state.completedStages,
      recoveryActions,
    }));
  }
}

export function createPhase2CutoverFactsCollector({
  mode,
  actions,
  environment,
  clock,
  stageProviderEvidenceFacts,
  completeTerminalRevocationIntent,
  stageTerminalRevocationIntent,
} = {}) {
  return async (credentialRoles, contract) => {
    let capturedAt;
    const facts = await runPhase2PreviewCutover({
      mode,
      actions,
      environment,
      clock,
      credentialRoles,
      expectedCommit: contract.expectedCommit,
      terminalIntentSink: typeof stageTerminalRevocationIntent === "function"
        ? stageTerminalRevocationIntent
        : undefined,
      terminalCompletionSink: typeof completeTerminalRevocationIntent === "function"
        ? completeTerminalRevocationIntent
        : undefined,
      evidenceFactsSink: typeof stageProviderEvidenceFacts === "function"
        ? async (proof) => {
          await stageProviderEvidenceFacts(proof);
          capturedAt = proof.capturedAt;
        }
        : undefined,
    });
    return Object.freeze({
      facts,
      capturedAt: capturedAt ?? facts.postRevokeContinuity.checkedAt,
    });
  };
}

export const PHASE2_CUTOVER_ACTION_NAMES = ACTION_NAMES;
