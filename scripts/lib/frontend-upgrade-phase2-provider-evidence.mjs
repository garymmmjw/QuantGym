import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rm,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureTrustedDirectoryChain,
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";

export const PHASE2_PROVIDER_EVIDENCE_PATH = (
  "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json"
);
export const PHASE2_PROVIDER_SCHEMA_PATH = (
  "docs/frontend-upgrade/phase-2-provider-evidence.schema.json"
);
export const PHASE2_PROVIDER_MAXIMUM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;
export const PHASE2_CUTOVER_STEP_IDS = Object.freeze([
  "backup",
  "restore-proof",
  "restore-target-destroy",
  "migration",
  "api-deploy",
  "pages-deploy",
  "live-checks",
  "cleanup",
  "revoke",
  "post-revoke-continuity",
]);
export const PHASE2_LIVE_CHECK_IDS = Object.freeze([
  "api",
  "migration",
  "daily-loop",
  "accessibility",
  "storage",
  "production-denial",
  "deployed-visual",
  "deployed-bundle",
]);

export const TEST_ONLY_PHASE2_PROVIDER_EVIDENCE = Symbol(
  "frontend-upgrade-phase2-provider-evidence-test-only",
);
export const PHASE2_PROVIDER_FACTS_CHANNEL = Symbol(
  "frontend-upgrade-phase2-provider-facts-channel",
);
export const PHASE2_PROVIDER_CREDENTIAL_ROLES_CHANNEL = Symbol(
  "frontend-upgrade-phase2-provider-credential-roles-channel",
);

export const PHASE2_REQUIRED_ANCESTOR_COMMITS = Object.freeze([
  "5a3b6f33b7f2a4d15f0a81ca57f81570ca89c6a3",
  "d87b20f8630fdc39f46e1065c5ffee14bf3ca8dd",
  "4faba0653e28e4ca28edd8521a053d00d0d88e57",
  "4bed12b2b9951276124df2fff18b23f2319c8de1",
]);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const MAX_CUTOVER_STEP_DURATION_MS = 2 * 60 * 60 * 1_000;
const MAX_CUTOVER_DURATION_MS = 6 * 60 * 60 * 1_000;
const MAX_PROVIDER_CAPTURE_HANDOFF_MS = 5 * 60 * 1_000;
const MAX_TERMINAL_CONTINUITY_HANDOFF_MS = 5 * 60 * 1_000;
const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const MAX_SCHEMA_BYTES = 512 * 1024;
const MAX_RECOVERY_JOURNAL_BYTES = 2 * 1024 * 1024;
const DEFAULT_BRANCH = "codex/frontend-v2-preview";
const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const recoveryJournalPathFor = (expectedCommit) => path.join(
  tmpdir(),
  `quantgym-phase2-recovery-${expectedCommit}.json`,
);
const GOVERNANCE = Object.freeze({
  operator: "Gary",
  budgetOwner: "Gary",
  dataResetOwner: "Gary",
  destroyOwner: "Gary",
  reviewDate: "2026-07-29",
});
const MUTATION_BINDING_KEYS = Object.freeze([
  "cloudflare",
  "render",
  "postgres",
  "r2",
]);
const PRODUCTION_SERVICE_NAMES = Object.freeze(["quantgym-api", "quantgym-llm"]);
const MUTATION_REVOKE_POSTGRES_IDENTITY_KINDS = Object.freeze(["mutation", "restore"]);
const REMAINING_READ_ONLY_CONTROL_PROVIDERS = Object.freeze([
  "cloudflare",
  "r2",
]);
const TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS = Object.freeze(["render"]);
const TERMINAL_TEMPORARY_CONTROL_PROVIDERS = Object.freeze(["postgres", "render"]);
export const PHASE2_RESOURCE_CONTRACT = Object.freeze({
  pages: Object.freeze({ provider: "cloudflare", name: "quantgym-v2-preview" }),
  api: Object.freeze({ provider: "render", name: "quantgym-v2-preview-api" }),
  llm: Object.freeze({ provider: "render", name: "quantgym-v2-preview-llm" }),
  postgres: Object.freeze({ provider: "render", name: "quantgym-v2-preview-postgres" }),
  r2: Object.freeze({ provider: "cloudflare", name: "quantgym-v2-preview-media" }),
  productionPages: Object.freeze({ provider: "cloudflare", name: "quantgym-beta" }),
  productionApi: Object.freeze({ provider: "render", name: "quantgym-api" }),
  productionLlm: Object.freeze({ provider: "render", name: "quantgym-llm" }),
  productionPostgres: Object.freeze({ provider: "render", name: "quantgym-postgres" }),
  productionR2: Object.freeze({ provider: "cloudflare", name: "quantgym-media" }),
});
const TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "phase",
  "status",
  "capturedAt",
  "expiresAt",
  "environment",
  "branch",
  "applicationCommit",
  "governance",
  "capture",
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
  "postRevokeContinuity",
  "pullRequest",
  "cutoverSequence",
  "cutoverDurationMs",
]);
const PROVIDER_FACT_KEYS = Object.freeze(TOP_LEVEL_KEYS.slice(10));
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

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const validDatabaseContentSnapshot = (value) => (
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
      && validateHash(table.rowAggregateSha256)
  ))
  && value.tables.every((table, index) => (
    index === 0 || value.tables[index - 1].name.localeCompare(table.name) < 0
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
    && validateHash(section.aggregateSha256)
  ))
  && value.inventorySha256 === sha256(canonicalJson(value.tables.map(({ name }) => name)))
  && value.rowCountsSha256 === sha256(canonicalJson(
    value.tables.map(({ name, rowCount }) => ({ name, rowCount })),
  ))
  && value.dataAggregateSha256 === sha256(canonicalJson(
    value.tables.map(({ name, rowAggregateSha256 }) => ({ name, rowAggregateSha256 })),
  ))
  && value.snapshotSha256 === sha256(canonicalJson({
    inventorySha256: value.inventorySha256,
    rowCountsSha256: value.rowCountsSha256,
    dataAggregateSha256: value.dataAggregateSha256,
    catalogSections: value.catalogSections,
  }))
);
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const recoveryJournalTrustBoundaryBase = Object.freeze({
  trustRoot: "local-system-user",
  operator: "Gary",
  journalMode: "0600",
  externalSignaturePresent: false,
  sameUserTamperingOutOfScope: true,
});
export const PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY = Object.freeze({
  ...recoveryJournalTrustBoundaryBase,
  evidenceSha256: sha256(canonicalJson(recoveryJournalTrustBoundaryBase)),
});
const canonicalEqual = (left, right) => (
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
);
const unique = (values) => new Set(values).size === values.length;
const isoTime = (value) => {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
};
const exactKeys = (value, expected) => (
  isPlainObject(value)
  && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key))
);
const add = (failures, condition, message) => {
  if (!condition) failures.push(message);
};
const validateHash = (value) => HASH_PATTERN.test(value ?? "");

const validateTimedProof = (value, id, failures, evidence) => {
  const expectedKeys = ["id", "status", "checkedAt", "evidenceSha256"];
  if (id === "deployed-visual") expectedKeys.push("deploymentCommit");
  if (id === "deployed-bundle") {
    expectedKeys.push("deploymentCommit", "artifactManifestSha256");
  }
  add(
    failures,
    exactKeys(value, expectedKeys),
    `${id} live check shape mismatch`,
  );
  add(failures, value?.id === id, `${id} live check identity mismatch`);
  add(failures, value?.status === "pass", `${id} live check did not pass`);
  add(failures, isoTime(value?.checkedAt) !== null, `${id} live check timestamp is invalid`);
  add(failures, validateHash(value?.evidenceSha256), `${id} live check proof is invalid`);
  if (id === "deployed-visual" || id === "deployed-bundle") {
    add(
      failures,
      value?.deploymentCommit === evidence?.applicationCommit,
      `${id} live check is not bound to the deployed commit`,
    );
  }
  if (id === "deployed-bundle") {
    add(
      failures,
      validateHash(value?.artifactManifestSha256)
        && value.artifactManifestSha256
          === evidence?.deployments?.pages?.artifactManifestSha256,
      "deployed bundle live check is not bound to the detached Pages artifact",
    );
  }
};

const validateMutationTokenBindings = (bindings, failures, label) => {
  add(
    failures,
    exactKeys(bindings, MUTATION_BINDING_KEYS),
    `${label} mutation credential binding inventory mismatch`,
  );
  const identities = [];
  for (const key of MUTATION_BINDING_KEYS) {
    const binding = bindings?.[key];
    add(
      failures,
      exactKeys(binding, ["identitySha256", "selfIdentityVerified"])
        && validateHash(binding?.identitySha256)
        && binding?.selfIdentityVerified === true,
      `${label} ${key} mutation credential binding is invalid`,
    );
    if (validateHash(binding?.identitySha256)) identities.push(binding.identitySha256);
  }
  add(failures, unique(identities), `${label} mutation credential identities overlap`);
};

const validateProductionAnchor = (
  anchor,
  failures,
  label,
  resources,
  expectedCandidateCommit,
) => {
  const keys = [
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
  ];
  add(failures, exactKeys(anchor, keys), `${label} Production anchor shape mismatch`);
  add(
    failures,
    SHA_PATTERN.test(anchor?.pagesDeploymentCommit ?? "")
      && anchor?.pagesResourceIdentitySha256
        === resources?.productionPages?.identitySha256
      && validateHash(anchor?.pagesConfigurationSha256)
      && validateHash(anchor?.pagesSuccessfulDeploymentSetSha256)
      && anchor?.pagesEnvironment === "production"
      && anchor?.pagesBranch === "main"
      && typeof anchor?.pagesAutomaticDeploysEnabled === "boolean"
      && anchor?.pagesLive === true
      && anchor?.candidateCommitChecked === expectedCandidateCommit
      && Number.isSafeInteger(anchor?.candidateCommitRecordCount)
      && anchor.candidateCommitRecordCount >= 0
      && anchor?.candidateCommitSkippedRecordCount === anchor.candidateCommitRecordCount
      && anchor?.candidateCommitStartedRecordCount === 0
      && anchor?.candidateCommitAliasedRecordCount === 0
      && anchor?.candidateCommitActiveDeploymentCount === 0
      && validateHash(anchor?.postgresControlSha256)
      && validateHash(anchor?.r2ControlSha256)
      && validateHash(anchor?.environmentGroupsControlSha256),
    `${label} Production control anchor is invalid`,
  );
  add(
    failures,
    Array.isArray(anchor?.services)
      && anchor.services.length === PRODUCTION_SERVICE_NAMES.length,
    `${label} Production service anchor inventory mismatch`,
  );
  PRODUCTION_SERVICE_NAMES.forEach((name, index) => {
    const service = anchor?.services?.[index];
    add(
      failures,
      exactKeys(service, [
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
        && service?.name === name
        && validateHash(service?.identitySha256)
        && validateHash(service?.configurationSha256)
        && service?.repository === "garymmmjw/QuantGym"
        && service?.branch === "main"
        && service?.visibility === (name === "quantgym-api" ? "public" : "internal")
        && typeof service?.automaticDeploysEnabled === "boolean"
        && SHA_PATTERN.test(service?.liveDeploymentCommit ?? "")
        && service?.live === true,
      `${label} Production ${name} service anchor is invalid`,
    );
  });
  add(
    failures,
    anchor?.services?.[0]?.identitySha256 === resources?.productionApi?.identitySha256
      && anchor?.services?.[1]?.identitySha256
        === resources?.productionLlm?.identitySha256,
    `${label} Production service anchors do not bind the exact resource identities`,
  );
};

const validatePreviewAnchor = (anchor, failures, label, allowedRevision, resources) => {
  add(
    failures,
    exactKeys(anchor, [
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
    ]),
    `${label} Preview anchor shape mismatch`,
  );
  add(
    failures,
    SHA_PATTERN.test(anchor?.pagesDeploymentCommit ?? "")
      && SHA_PATTERN.test(anchor?.apiDeploymentCommit ?? "")
      && SHA_PATTERN.test(anchor?.llmDeploymentCommit ?? "")
      && anchor?.llmResourceIdentitySha256 === resources?.llm?.identitySha256
      && validateHash(anchor?.llmConfigurationSha256)
      && anchor?.llmRepository === "garymmmjw/QuantGym"
      && anchor?.llmBranch === DEFAULT_BRANCH
      && anchor?.llmVisibility === "internal"
      && anchor?.llmAutomaticDeploysEnabled === false
      && anchor?.llmLive === true
      && (allowedRevision === undefined || anchor?.databaseRevision === allowedRevision),
    `${label} Preview anchor is invalid`,
  );
};

const forbiddenSerializedContent = (serialized) => (
  /(?:postgres(?:ql)?:\/\/|https?:\/\/|bearer\s|-----BEGIN [A-Z ]+PRIVATE KEY-----)/iu
    .test(serialized)
  || /"(?:password|secret|token|credential|accessKey|privateKey|databaseUrl|rawResponse)"\s*:/iu
    .test(serialized)
);

export function validatePhase2ProviderEvidenceSchema(schema) {
  const failures = [];
  add(failures, isPlainObject(schema), "Phase 2 provider schema must be an object");
  if (!isPlainObject(schema)) return failures;
  add(
    failures,
    schema.$schema === "https://json-schema.org/draft/2020-12/schema",
    "Phase 2 provider schema dialect mismatch",
  );
  add(
    failures,
    schema.$id === (
      "https://quantgym.invalid/schemas/frontend-upgrade-phase2-provider-evidence.schema.json"
    ),
    "Phase 2 provider schema identity mismatch",
  );
  add(failures, schema.type === "object", "Phase 2 provider schema root type mismatch");
  add(
    failures,
    schema.additionalProperties === false,
    "Phase 2 provider schema must reject additional properties",
  );
  add(
    failures,
    Array.isArray(schema.required)
      && schema.required.length === TOP_LEVEL_KEYS.length
      && unique(schema.required)
      && canonicalEqual(schema.required, TOP_LEVEL_KEYS),
    "Phase 2 provider schema required fields mismatch",
  );
  add(
    failures,
    isPlainObject(schema.properties)
      && canonicalEqual(Object.keys(schema.properties), TOP_LEVEL_KEYS),
    "Phase 2 provider schema properties mismatch",
  );
  add(
    failures,
    schema.properties?.cutoverSequence?.minItems === PHASE2_CUTOVER_STEP_IDS.length
      && schema.properties?.cutoverSequence?.maxItems === PHASE2_CUTOVER_STEP_IDS.length
      && schema.properties?.cutoverSequence?.uniqueItems === true
      && schema.properties?.cutoverSequence?.items === false
      && schema.properties?.cutoverSequence?.prefixItems?.length
        === PHASE2_CUTOVER_STEP_IDS.length,
    "Phase 2 provider schema cutover cardinality mismatch",
  );
  add(
    failures,
    schema.properties?.cutoverDurationMs?.type === "integer"
      && schema.properties?.cutoverDurationMs?.minimum === 0
      && schema.properties?.cutoverDurationMs?.maximum === MAX_CUTOVER_DURATION_MS
      && schema.$defs?.cutoverStep?.properties?.durationMs?.type === "integer"
      && schema.$defs?.cutoverStep?.properties?.durationMs?.minimum === 0
      && schema.$defs?.cutoverStep?.properties?.durationMs?.maximum
        === MAX_CUTOVER_STEP_DURATION_MS,
    "Phase 2 provider schema cutover duration bounds mismatch",
  );
  add(
    failures,
    schema.properties?.liveChecks?.minItems === PHASE2_LIVE_CHECK_IDS.length
      && schema.properties?.liveChecks?.maxItems === PHASE2_LIVE_CHECK_IDS.length
      && schema.properties?.liveChecks?.uniqueItems === true
      && schema.properties?.liveChecks?.items === false
      && schema.properties?.liveChecks?.prefixItems?.length === PHASE2_LIVE_CHECK_IDS.length,
    "Phase 2 provider schema live-check cardinality mismatch",
  );
  add(
    failures,
    canonicalEqual(schema.$defs?.cutoverStep?.properties?.id?.enum, PHASE2_CUTOVER_STEP_IDS),
    "Phase 2 provider schema cutover order inventory mismatch",
  );
  add(
    failures,
    canonicalEqual(
      schema.properties?.cutoverSequence?.prefixItems?.map((entry) => entry?.$ref),
      [
        "#/$defs/cutoverStepBackup",
        "#/$defs/cutoverStepRestoreProof",
        "#/$defs/cutoverStepRestoreTargetDestroy",
        "#/$defs/cutoverStepMigration",
        "#/$defs/cutoverStepApiDeploy",
        "#/$defs/cutoverStepPagesDeploy",
        "#/$defs/cutoverStepLiveChecks",
        "#/$defs/cutoverStepCleanup",
        "#/$defs/cutoverStepRevoke",
        "#/$defs/cutoverStepPostRevokeContinuity",
      ],
    ),
    "Phase 2 provider schema cutover prefix order mismatch",
  );
  add(
    failures,
    canonicalEqual(
      schema.properties?.liveChecks?.prefixItems?.map((entry) => entry?.$ref),
      [
        "#/$defs/liveCheckApi",
        "#/$defs/liveCheckMigration",
        "#/$defs/liveCheckDailyLoop",
        "#/$defs/liveCheckAccessibility",
        "#/$defs/liveCheckStorage",
        "#/$defs/liveCheckProductionDenial",
        "#/$defs/liveCheckDeployedVisual",
        "#/$defs/liveCheckDeployedBundle",
      ],
    ),
    "Phase 2 provider schema live-check inventory mismatch",
  );
  add(
    failures,
    canonicalEqual(
      schema.$defs?.candidateGate?.properties?.requiredAncestorCommits
        ?.prefixItems?.map((entry) => entry?.const),
      PHASE2_REQUIRED_ANCESTOR_COMMITS,
    )
      && schema.$defs?.candidateGate?.properties?.requiredAncestorCommits
        ?.uniqueItems === true
      && schema.$defs?.candidateGate?.properties?.requiredAncestorCommits?.items === false,
    "Phase 2 provider schema candidate ancestor order mismatch",
  );
  add(
    failures,
    schema.$defs?.previewAnchor?.properties?.llmRepository?.const
        === "garymmmjw/QuantGym"
      && schema.$defs?.previewAnchor?.properties?.llmBranch?.const === DEFAULT_BRANCH
      && schema.$defs?.previewAnchor?.properties?.llmVisibility?.const === "internal"
      && schema.$defs?.previewAnchor?.properties
        ?.llmAutomaticDeploysEnabled?.const === false
      && schema.$defs?.previewAnchor?.properties?.llmLive?.const === true
      && schema.$defs?.productionAnchor?.properties?.services?.minItems
        === PRODUCTION_SERVICE_NAMES.length
      && schema.$defs?.productionAnchor?.properties?.services?.maxItems
        === PRODUCTION_SERVICE_NAMES.length
      && schema.$defs?.productionAnchor?.properties?.services?.items === false,
    "Phase 2 provider schema service topology inventory mismatch",
  );
  add(
    failures,
    schema.$defs?.cleanup?.properties?.syntheticApplicationRows?.const === 0
      && schema.$defs?.cleanup?.properties?.syntheticR2Objects?.const === 0
      && schema.$defs?.cleanup?.properties?.syntheticCatalogRows?.const === 0,
    "Phase 2 provider schema cleanup zero proof mismatch",
  );
  add(
    failures,
    schema.$defs?.pullRequestCheck?.properties?.draft?.const === true
      && schema.$defs?.pullRequestCheck?.properties?.merged?.const === false
      && schema.$defs?.pullRequest?.properties?.unchanged?.const === true,
    "Phase 2 provider schema pull-request boundary mismatch",
  );
  add(
    failures,
    schema.$defs?.candidateGate?.properties?.allRequiredAncestorsPresent?.const === true
      && schema.$defs?.candidateGate?.properties?.trackedWorktreeClean?.const === true
      && schema.$defs?.candidateGate?.properties?.indexClean?.const === true
      && schema.$defs?.candidateGate?.properties
        ?.applicationCloudflarePagesSkipDirectivePresent?.const === true
      && schema.$defs?.candidateGate?.properties
        ?.evidenceCloudflarePagesSkipDirectivePresent?.const === true
      && schema.$defs?.candidateGate?.properties?.workflowSha256?.$ref
        === "#/$defs/sha256"
      && schema.$defs?.candidateGate?.properties?.workflowRunIdentitySha256?.$ref
        === "#/$defs/sha256",
    "Phase 2 provider schema candidate gate mismatch",
  );
  add(
    failures,
    schema.$defs?.capture?.properties?.journalTrustBoundary?.$ref
      === "#/$defs/journalTrustBoundary"
      && schema.$defs?.journalTrustBoundary?.properties?.trustRoot?.const
        === "local-system-user"
      && schema.$defs?.journalTrustBoundary?.properties?.operator?.const === "Gary"
      && schema.$defs?.journalTrustBoundary?.properties?.journalMode?.const === "0600"
      && schema.$defs?.journalTrustBoundary?.properties
        ?.externalSignaturePresent?.const === false
      && schema.$defs?.journalTrustBoundary?.properties
        ?.sameUserTamperingOutOfScope?.const === true,
    "Phase 2 provider schema recovery journal trust boundary mismatch",
  );
  add(
    failures,
    schema.$defs?.credentialBoundary?.properties?.identitiesDistinct?.const === true
      && schema.$defs?.credentialBoundary?.properties?.bootstrap?.$ref
        === "#/$defs/bootstrapCredentialRole"
      && schema.$defs?.bootstrapCredentialRole?.properties?.kind?.const
        === "persistent-provider-admin"
      && schema.$defs?.bootstrapCredentialRole?.properties?.provider?.const === "postgres"
      && schema.$defs?.bootstrapCredentialRole?.properties?.privilege?.const === "admin"
      && schema.$defs?.bootstrapCredentialRole?.properties?.retained?.const === true
      && schema.$defs?.bootstrapCredentialRole?.properties
        ?.excludedFromReadOnlyControlAssertions?.const === true
      && canonicalEqual(
        schema.$defs?.controlCredentialRole?.properties
          ?.remainingReadOnlyProviders?.const,
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        schema.$defs?.controlCredentialRole?.properties
          ?.terminalTemporaryUnscopedProviders?.const,
        TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        schema.$defs?.controlCredentialRole?.properties
          ?.terminalTemporaryProviders?.const,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && schema.$defs?.controlCredentialRole?.properties
        ?.terminalRevocationRequired?.const === true
      && schema.$defs?.mutationCredentialRole?.properties?.revocable?.const === true,
    "Phase 2 provider schema credential boundary mismatch",
  );
  add(
    failures,
    schema.$defs?.operatorPreflight?.properties?.capabilitiesReady?.const === true
      && schema.$defs?.operatorPreflight?.properties?.toolchainReady?.const === true
      && schema.$defs?.operatorPreflight?.properties?.controlDatabaseReadOnly?.const === true
      && schema.$defs?.operatorPreflight?.properties?.frontendBuildPassed?.const === true
      && schema.$defs?.credentialBinding?.properties?.selfIdentityVerified?.const === true,
    "Phase 2 provider schema ordered operator preflight mismatch",
  );
  add(
    failures,
    canonicalEqual(
      schema.$defs?.remainingReadOnlyControlProofs?.required,
      REMAINING_READ_ONLY_CONTROL_PROVIDERS,
    )
      && canonicalEqual(
        Object.keys(schema.$defs?.remainingReadOnlyControlProofs?.properties ?? {}),
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        schema.$defs?.terminalTemporaryControl?.properties?.providers?.const,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        schema.$defs?.terminalTemporaryControl?.properties?.unscopedProviders?.const,
        TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
      )
      && schema.$defs?.terminalTemporaryControl?.properties
        ?.terminalRevocationRequired?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.applicationDmlDenied?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.ddlDenied?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.largeObjectCreationDenied?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.selectSucceeded?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.transactionReadOnly?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.sqlManagedTemporaryRole?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.finalDropRequired?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.providerCredentialInventoryUnchanged?.const === true
      && schema.$defs?.terminalTemporaryControl?.properties?.postgres?.properties
        ?.providerCredentialInventorySha256?.$ref === "#/$defs/sha256"
      && schema.$defs?.terminalTemporaryControl?.properties
        ?.renderCredentialIdentitySha256?.$ref === "#/$defs/sha256",
    "Phase 2 provider schema composite terminal control mismatch",
  );
  add(
    failures,
    canonicalEqual(schema.$defs?.productionContinuity?.required, [
      "before",
      "beforeCheckedAt",
      "after",
      "afterCheckedAt",
      "controlIdentitySha256",
      "unchanged",
    ])
      && schema.$defs?.productionContinuity?.properties?.controlIdentitySha256?.$ref
        === "#/$defs/sha256",
    "Phase 2 provider schema control topology proof mismatch",
  );
  add(
    failures,
    schema.$defs?.temporaryAccess?.properties?.mutationCredentialsRevoked?.const === true
      && schema.$defs?.temporaryAccess?.properties?.controlIdentityRetained?.const === true
      && canonicalEqual(
        schema.$defs?.temporaryAccess?.properties
          ?.remainingReadOnlyControlProviders?.const,
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        schema.$defs?.temporaryAccess?.properties
          ?.terminalTemporaryControlProviders?.const,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && schema.$defs?.temporaryAccess?.properties
        ?.postgresControlRevocationPending?.const === true
      && schema.$defs?.temporaryAccess?.properties
        ?.renderControlRevocationPending?.const === true
      && schema.$defs?.temporaryAccess?.properties
        ?.postgresProviderCredentialInventoryUnchanged?.const === true
      && schema.$defs?.temporaryAccess?.properties
        ?.postgresProviderCredentialInventorySha256?.$ref === "#/$defs/sha256"
      && schema.$defs?.temporaryAccess?.properties?.terminalRevocationPending?.const === true
      && canonicalEqual(
        schema.$defs?.temporaryAccess?.properties?.postgresIdentities
          ?.prefixItems?.map((entry) => entry?.$ref),
        [
          "#/$defs/postgresMutationIdentity",
          "#/$defs/postgresRestoreIdentity",
        ],
      )
      && schema.$defs?.temporaryAccess?.properties?.postgresIdentities?.minItems === 2
      && schema.$defs?.temporaryAccess?.properties?.postgresIdentities?.maxItems === 2
      && schema.$defs?.temporaryAccess?.properties?.postgresIdentities?.uniqueItems === true
      && schema.$defs?.temporaryAccess?.properties?.postgresIdentities?.items === false
      && canonicalEqual(
        schema.$defs?.postgresIdentityRevocation?.properties?.kind?.enum,
        ["control", "mutation", "restore"],
      )
      && canonicalEqual(
        schema.$defs?.postRevokeContinuity?.properties
          ?.terminalTemporaryControlProviders?.const,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && schema.$defs?.postRevokeContinuity?.properties
        ?.postgresControlRevokedAfterContinuity?.const === true
      && schema.$defs?.postRevokeContinuity?.properties
        ?.postgresProviderCredentialInventoryUnchanged?.const === true
      && schema.$defs?.postRevokeContinuity?.properties
        ?.postgresProviderCredentialInventorySha256?.$ref === "#/$defs/sha256"
      && schema.$defs?.postRevokeContinuity?.properties?.persistentProviderAdmin?.$ref
        === "#/$defs/persistentProviderAdmin"
      && schema.$defs?.persistentProviderAdmin?.properties?.retained?.const === true
      && schema.$defs?.persistentProviderAdmin?.properties?.privilege?.const === "admin"
      && schema.$defs?.persistentProviderAdmin?.properties
        ?.excludedFromReadOnlyControlAssertions?.const === true
      && schema.$defs?.persistentProviderAdmin?.properties
        ?.providerCredentialInventoryUnchanged?.const === true
      && schema.$defs?.postRevokeContinuity?.properties
        ?.postgresControlIdentity?.$ref === "#/$defs/postgresControlIdentity"
      && schema.$defs?.postRevokeContinuity?.properties
        ?.terminalTemporaryControlCredentialsRevoked?.const === true
      && schema.$defs?.postRevokeContinuity?.properties
        ?.runtimeIdentitiesUnchanged?.const === true
      && schema.$defs?.postRevokeContinuity?.properties
        ?.continuityToTerminalRevocationMs?.maximum
          === MAX_TERMINAL_CONTINUITY_HANDOFF_MS
      && schema.$defs?.postRevokeContinuity?.properties
        ?.continuityObservationCompletedAt?.$ref === "#/$defs/timestamp"
      && schema.$defs?.postRevokeContinuity?.properties
        ?.renderTopologyObservation?.$ref === "#/$defs/renderTopologyObservation"
      && schema.$defs?.postRevokeContinuity?.properties
        ?.sustainableControlRevalidation?.$ref
          === "#/$defs/sustainableControlRevalidation"
      && schema.$defs?.renderTopologyObservation?.properties
        ?.timing?.const === "before-terminal-control-revocation"
      && schema.$defs?.renderTopologyObservation?.properties
        ?.reobservedAfterTerminalRevocation?.const === false
      && schema.$defs?.sustainableControlRevalidation?.properties
        ?.renderTopologyReobserved?.const === false
      && schema.$defs?.sustainableControlRevalidation?.properties
        ?.renderTopologyBasis?.const === "pre-terminal-revocation-observation"
      && schema.$defs?.sustainableControlRevalidation?.properties
        ?.postgresBootstrapAdminUsed?.const === true
      && schema.$defs?.sustainableControlRevalidation?.properties
        ?.postgresBootstrapAdminExcludedFromReadOnlyAssertions?.const === true,
    "Phase 2 provider schema mutation revoke boundary mismatch",
  );
  add(
    failures,
    schema.$defs?.restoreDestruction?.properties?.destroyed?.const === true
      && schema.$defs?.restoreDestruction?.properties?.absentAfterDestroy?.const === true
      && schema.$defs?.restoreDestruction?.properties?.restoreRoleAbsent?.const === true
      && schema.$defs?.restoreDestruction?.properties?.restoreLoginDenied?.const === true,
    "Phase 2 provider schema restore-target destruction mismatch",
  );
  add(
    failures,
    schema.$defs?.databaseMigration?.properties?.direction?.const === "upgrade"
      && schema.$defs?.databaseMigration?.properties?.providerDowngradeExecuted?.const === false,
    "Phase 2 provider schema downgrade boundary mismatch",
  );
  return [...new Set(failures)];
}

export function validatePhase2CredentialRoles(value) {
  const failures = [];
  add(
    failures,
    exactKeys(value, ["bootstrap", "control", "mutation"]),
    "credential role inventory mismatch",
  );
  const bootstrap = value?.bootstrap;
  const control = value?.control;
  const mutation = value?.mutation;
  add(
    failures,
    exactKeys(bootstrap, [
      "kind",
      "provider",
      "privilege",
      "retained",
      "excludedFromReadOnlyControlAssertions",
      "identitySha256",
    ])
      && bootstrap?.kind === "persistent-provider-admin"
      && bootstrap?.provider === "postgres"
      && bootstrap?.privilege === "admin"
      && bootstrap?.retained === true
      && bootstrap?.excludedFromReadOnlyControlAssertions === true
      && validateHash(bootstrap?.identitySha256),
    "persistent Provider admin bootstrap role is invalid",
  );
  add(
    failures,
    exactKeys(control, [
      "kind",
      "remainingReadOnlyProviders",
      "terminalTemporaryUnscopedProviders",
      "terminalTemporaryProviders",
      "terminalRevocationRequired",
      "retainedAfterMutationRevoke",
      "identitySha256",
    ])
      && control?.kind === "control"
      && canonicalEqual(
        control?.remainingReadOnlyProviders,
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        control?.terminalTemporaryUnscopedProviders,
        TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        control?.terminalTemporaryProviders,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && control?.terminalRevocationRequired === true
      && control?.retainedAfterMutationRevoke === true
      && validateHash(control?.identitySha256),
    "composite control credential role is invalid",
  );
  add(
    failures,
    exactKeys(mutation, ["kind", "revocable", "identitySha256"])
      && mutation?.kind === "mutation"
      && mutation?.revocable === true
      && validateHash(mutation?.identitySha256),
    "revocable mutation credential role is invalid",
  );
  add(
    failures,
    validateHash(bootstrap?.identitySha256)
      && validateHash(control?.identitySha256)
      && validateHash(mutation?.identitySha256)
      && bootstrap.identitySha256 !== control.identitySha256
      && bootstrap.identitySha256 !== mutation.identitySha256
      && control.identitySha256 !== mutation.identitySha256,
    "bootstrap, control, and mutation credential identities must be distinct",
  );
  return [...new Set(failures)];
}

export function validatePhase2ProviderEvidence(
  evidence,
  { expectedCommit, nowMs = Date.now(), allowExpired = false } = {},
) {
  const failures = [];
  add(failures, exactKeys(evidence, TOP_LEVEL_KEYS), "provider evidence shape mismatch");
  if (!isPlainObject(evidence)) return [...new Set(failures)];
  add(failures, evidence.schemaVersion === 1, "provider evidence schemaVersion mismatch");
  add(failures, evidence.phase === 2, "provider evidence phase mismatch");
  add(failures, evidence.status === "pass", "provider evidence status must be pass");
  add(failures, evidence.environment === "preview", "provider evidence environment mismatch");
  add(failures, evidence.branch === DEFAULT_BRANCH, "provider evidence branch mismatch");
  add(failures, SHA_PATTERN.test(evidence.applicationCommit ?? ""), "application commit is invalid");
  if (expectedCommit !== undefined) {
    add(failures, evidence.applicationCommit === expectedCommit, "application commit mismatch");
  }

  const capturedAt = isoTime(evidence.capturedAt);
  const expiresAt = isoTime(evidence.expiresAt);
  add(failures, capturedAt !== null, "provider evidence capturedAt is invalid");
  add(failures, expiresAt !== null, "provider evidence expiresAt is invalid");
  add(failures, Number.isFinite(nowMs), "provider evidence validation time is invalid");
  if (capturedAt !== null && expiresAt !== null) {
    add(
      failures,
      expiresAt > capturedAt
        && expiresAt - capturedAt <= PHASE2_PROVIDER_MAXIMUM_LIFETIME_MS,
      "provider evidence lifetime must be greater than zero and at most seven days",
    );
    add(
      failures,
      !Number.isFinite(nowMs) || capturedAt <= nowMs + CLOCK_SKEW_MS,
      "provider evidence is captured in the future",
    );
    if (!allowExpired) {
      add(
        failures,
        !Number.isFinite(nowMs) || expiresAt >= nowMs,
        "provider evidence has expired",
      );
    }
  }

  add(
    failures,
    exactKeys(evidence.governance, Object.keys(GOVERNANCE))
      && canonicalEqual(evidence.governance, GOVERNANCE),
    "provider evidence governance mismatch",
  );
  add(
    failures,
    exactKeys(evidence.capture, [
      "authenticated",
      "inputSource",
      "rawResponsesPersisted",
      "journalTrustBoundary",
    ])
      && evidence.capture.authenticated === true
      && evidence.capture.inputSource === "operator-environment"
      && evidence.capture.rawResponsesPersisted === false
      && canonicalEqual(
        evidence.capture.journalTrustBoundary,
        PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
      ),
    "provider evidence capture policy mismatch",
  );

  const candidate = evidence.candidateGate;
  add(
    failures,
    exactKeys(candidate, [
      "status",
      "checkedAt",
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
      "evidenceSha256",
    ]),
    "candidate gate shape mismatch",
  );
  add(
    failures,
    candidate?.status === "pass"
      && candidate?.repository === "garymmmjw/QuantGym"
      && candidate?.pullRequestNumber === 130
      && candidate?.branch === DEFAULT_BRANCH
      && candidate?.applicationCommit === evidence.applicationCommit
      && SHA_PATTERN.test(candidate?.evidenceHeadCommit ?? "")
      && candidate?.evidenceHeadCommit !== evidence.applicationCommit
      && candidate?.localHeadCommit === candidate.evidenceHeadCommit
      && candidate?.remoteHeadCommit === candidate.evidenceHeadCommit
      && validateHash(candidate?.applicationCommitMessageSha256)
      && validateHash(candidate?.evidenceCommitMessageSha256)
      && validateHash(candidate?.workflowSha256)
      && validateHash(candidate?.ciContractSha256)
      && validateHash(candidate?.workflowRunIdentitySha256)
      && candidate?.applicationCloudflarePagesSkipDirectivePresent === true
      && candidate?.evidenceCloudflarePagesSkipDirectivePresent === true
      && candidate?.evidenceOutputCount === 30
      && candidate?.evidenceSuccessorOnly === true
      && candidate?.evidenceHeadCiGreen === true
      && Number.isSafeInteger(candidate?.applicationPagesSkipRecordCount)
      && candidate.applicationPagesSkipRecordCount >= 1
      && Number.isSafeInteger(candidate?.evidencePagesSkipRecordCount)
      && candidate.evidencePagesSkipRecordCount >= 1
      && validateHash(candidate?.pagesSkipObservationSha256)
      && candidate?.trackedWorktreeClean === true
      && candidate?.indexClean === true
      && candidate?.allowedUntrackedOnly === true
      && canonicalEqual(candidate?.requiredAncestorCommits, PHASE2_REQUIRED_ANCESTOR_COMMITS)
      && candidate?.allRequiredAncestorsPresent === true
      && candidate?.pullRequestState === "open"
      && candidate?.pullRequestDraft === true
      && candidate?.pullRequestMerged === false
      && candidate?.pullRequestHeadCommit === candidate.evidenceHeadCommit,
    "candidate gate did not prove the exact clean draft Preview candidate",
  );
  add(failures, isoTime(candidate?.checkedAt) !== null, "candidate gate timestamp is invalid");
  add(failures, validateHash(candidate?.evidenceSha256), "candidate gate proof is invalid");

  const preflight = evidence.operatorPreflight;
  add(
    failures,
    exactKeys(preflight, [
      "status",
      "checkedAt",
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
      "evidenceSha256",
    ]),
    "operator preflight shape mismatch",
  );
  add(
    failures,
    preflight?.status === "pass"
      && preflight?.candidateCommit === evidence.applicationCommit
      && preflight?.capabilitiesReady === true
      && preflight?.toolchainReady === true
      && preflight?.controlDatabaseReadOnly === true
      && preflight?.previewR2RunPrefixEmpty === true
      && preflight?.mutationR2RunPrefixEmpty === true
      && preflight?.frontendBuildPassed === true
      && preflight?.localDowngradeGatePassed === true
      && preflight?.proxyLoopback === true
      && validateHash(preflight?.proxyIdentitySha256),
    "operator capability preflight did not pass after the exact candidate gate",
  );
  add(failures, isoTime(preflight?.checkedAt) !== null, "operator preflight timestamp is invalid");
  add(failures, validateHash(preflight?.evidenceSha256), "operator preflight proof is invalid");
  validateMutationTokenBindings(
    preflight?.mutationTokenBindings,
    failures,
    "operator preflight",
  );
  const controlProofs = preflight?.remainingReadOnlyControlProofs;
  const terminalControl = preflight?.terminalTemporaryControl;
  add(
    failures,
    exactKeys(controlProofs, ["cloudflare", "r2"])
      && exactKeys(controlProofs?.cloudflare, [
        "accountBound",
        "providerScopeReadOnly",
        "evidenceSha256",
      ])
      && controlProofs?.cloudflare?.accountBound === true
      && controlProofs?.cloudflare?.providerScopeReadOnly === true
      && validateHash(controlProofs?.cloudflare?.evidenceSha256)
      && exactKeys(controlProofs?.r2, [
        "policyBucketBound",
        "policyReadOnly",
        "previewReadSucceeded",
        "previewWriteDenied",
        "productionAccessDenied",
        "evidenceSha256",
      ])
      && controlProofs?.r2?.policyBucketBound === true
      && controlProofs?.r2?.policyReadOnly === true
      && controlProofs?.r2?.previewReadSucceeded === true
      && controlProofs?.r2?.previewWriteDenied === true
      && controlProofs?.r2?.productionAccessDenied === true
      && validateHash(controlProofs?.r2?.evidenceSha256),
    "remaining read-only control proofs are invalid",
  );
  add(
    failures,
    exactKeys(terminalControl, [
      "providers",
      "unscopedProviders",
      "terminalRevocationRequired",
      "postgres",
      "renderCredentialIdentitySha256",
    ])
      && canonicalEqual(
        terminalControl?.providers,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        terminalControl?.unscopedProviders,
        TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
      )
      && terminalControl?.terminalRevocationRequired === true
      && exactKeys(terminalControl?.postgres, [
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
      && terminalControl?.postgres?.applicationDmlDenied === true
      && terminalControl?.postgres?.ddlDenied === true
      && terminalControl?.postgres?.largeObjectCreationDenied === true
      && terminalControl?.postgres?.selectSucceeded === true
      && terminalControl?.postgres?.sqlManagedTemporaryRole === true
      && terminalControl?.postgres?.transactionReadOnly === true
      && terminalControl?.postgres?.finalDropRequired === true
      && terminalControl?.postgres?.providerCredentialInventoryUnchanged === true
      && validateHash(terminalControl?.postgres?.providerCredentialInventorySha256)
      && exactKeys(terminalControl?.postgres?.persistentProviderAdmin, [
        "retained",
        "privilege",
        "excludedFromReadOnlyControlAssertions",
        "identitySha256",
        "sqlIdentitySha256",
        "providerCredentialInventoryUnchanged",
        "providerCredentialInventorySha256",
        "evidenceSha256",
      ])
      && terminalControl?.postgres?.persistentProviderAdmin?.retained === true
      && terminalControl?.postgres?.persistentProviderAdmin?.privilege === "admin"
      && terminalControl?.postgres?.persistentProviderAdmin
        ?.excludedFromReadOnlyControlAssertions === true
      && terminalControl?.postgres?.persistentProviderAdmin
        ?.providerCredentialInventoryUnchanged === true
      && terminalControl?.postgres?.persistentProviderAdmin
        ?.providerCredentialInventorySha256
          === terminalControl?.postgres?.providerCredentialInventorySha256
      && validateHash(terminalControl?.postgres?.persistentProviderAdmin?.identitySha256)
      && validateHash(terminalControl?.postgres?.persistentProviderAdmin?.sqlIdentitySha256)
      && validateHash(terminalControl?.postgres?.persistentProviderAdmin?.evidenceSha256)
      && validateHash(terminalControl?.postgres?.evidenceSha256)
      && validateHash(terminalControl?.renderCredentialIdentitySha256),
    "terminal temporary control proof is invalid",
  );

  const credentialBoundary = evidence.credentialBoundary;
  const credentialFailures = validatePhase2CredentialRoles(
    exactKeys(credentialBoundary, [
      "bootstrap",
      "control",
      "mutation",
      "identitiesDistinct",
    ])
      ? {
        bootstrap: credentialBoundary.bootstrap,
        control: credentialBoundary.control,
        mutation: credentialBoundary.mutation,
      }
      : credentialBoundary,
  );
  add(
    failures,
    exactKeys(credentialBoundary, [
      "bootstrap",
      "control",
      "mutation",
      "identitiesDistinct",
    ]),
    "credential boundary shape mismatch",
  );
  add(
    failures,
    credentialFailures.length === 0 && credentialBoundary?.identitiesDistinct === true,
    "credential boundary did not separate retained read-only control from mutation access",
  );
  add(
    failures,
    terminalControl?.postgres?.persistentProviderAdmin?.identitySha256
      === credentialBoundary?.bootstrap?.identitySha256,
    "persistent Provider admin proof is not bound to the bootstrap identity",
  );

  add(
    failures,
    exactKeys(evidence.resources, Object.keys(PHASE2_RESOURCE_CONTRACT)),
    "provider resource inventory mismatch",
  );
  const previewHashes = [];
  const productionHashes = [];
  for (const [key, contract] of Object.entries(PHASE2_RESOURCE_CONTRACT)) {
    const resource = evidence.resources?.[key];
    add(
      failures,
      exactKeys(resource, ["provider", "name", "identitySha256"]),
      `${key} resource shape mismatch`,
    );
    add(failures, resource?.provider === contract.provider, `${key} provider mismatch`);
    add(failures, resource?.name === contract.name, `${key} resource name mismatch`);
    add(failures, validateHash(resource?.identitySha256), `${key} identity proof is invalid`);
    if (key.startsWith("production")) productionHashes.push(resource?.identitySha256);
    else previewHashes.push(resource?.identitySha256);
  }
  add(failures, unique(previewHashes.filter(Boolean)), "Preview resource identities overlap");
  add(failures, unique(productionHashes.filter(Boolean)), "Production resource identities overlap");
  add(
    failures,
    previewHashes.every((hash) => !productionHashes.includes(hash)),
    "Preview and Production resource identities overlap",
  );

  const continuity = evidence.productionContinuity;
  add(
    failures,
    exactKeys(continuity, [
      "before",
      "beforeCheckedAt",
      "after",
      "afterCheckedAt",
      "controlIdentitySha256",
      "unchanged",
    ]),
    "Production continuity shape mismatch",
  );
  for (const name of ["before", "after"]) {
    const anchor = continuity?.[name];
    validateProductionAnchor(
      anchor,
      failures,
      `Production ${name}`,
      evidence.resources,
      evidence.applicationCommit,
    );
  }
  add(
    failures,
    continuity?.unchanged === true && canonicalEqual(continuity?.before, continuity?.after),
    "Production deployment, PostgreSQL, or R2 control changed",
  );
  add(
    failures,
    continuity?.controlIdentitySha256 === credentialBoundary?.control?.identitySha256,
    "Production topology checks were not bound to the read-only control identity",
  );
  add(
    failures,
    isoTime(continuity?.beforeCheckedAt) !== null
      && isoTime(continuity?.afterCheckedAt) !== null
      && isoTime(continuity.afterCheckedAt) >= isoTime(continuity.beforeCheckedAt),
    "Production continuity timestamps are invalid",
  );

  add(
    failures,
    exactKeys(evidence.deployments, ["api", "pages"]),
    "provider deployment inventory mismatch",
  );
  for (const [name, provider, resourceKey] of [
    ["api", "render", "api"],
    ["pages", "cloudflare-pages", "pages"],
  ]) {
    const deployment = evidence.deployments?.[name];
    const deploymentKeys = ["provider", "resourceIdentitySha256", "commit", "status"];
    if (name === "pages") deploymentKeys.push("artifactManifestSha256");
    add(
      failures,
      exactKeys(deployment, deploymentKeys),
      `${name} deployment shape mismatch`,
    );
    add(failures, deployment?.provider === provider, `${name} deployment provider mismatch`);
    add(failures, deployment?.status === "ready", `${name} deployment is not ready`);
    add(
      failures,
      deployment?.resourceIdentitySha256 === evidence.resources?.[resourceKey]?.identitySha256,
      `${name} deployment resource mismatch`,
    );
    add(
      failures,
      deployment?.commit === evidence.applicationCommit,
      `${name} deployment commit mismatch`,
    );
    if (name === "pages") {
      add(
        failures,
        validateHash(deployment?.artifactManifestSha256),
        "Pages detached artifact manifest proof is invalid",
      );
    }
  }

  const deploymentControls = evidence.deploymentControls;
  add(
    failures,
    exactKeys(deploymentControls, [
      "pagesAutomaticDeploysDisabled",
      "apiAutomaticDeploysDisabled",
      "llmAutomaticDeploysDisabled",
      "migrationPrecedesDeploy",
      "evidenceSha256",
    ]),
    "Preview deployment control shape mismatch",
  );
  add(
    failures,
    deploymentControls?.pagesAutomaticDeploysDisabled === true
      && deploymentControls?.apiAutomaticDeploysDisabled === true
      && deploymentControls?.llmAutomaticDeploysDisabled === true
      && deploymentControls?.migrationPrecedesDeploy === true
      && validateHash(deploymentControls?.evidenceSha256),
    "Preview automatic deploys can bypass the migration gate",
  );

  const backup = evidence.databaseBackup;
  add(
    failures,
    exactKeys(backup, [
      "status",
      "capturedAt",
      "backupSha256",
      "sourceResourceSha256",
      "sourceRevision",
      "sourceSchemaSha256",
      "sourceContentSnapshot",
      "restore",
    ]),
    "database backup shape mismatch",
  );
  add(failures, backup?.status === "pass", "database backup did not pass");
  add(failures, isoTime(backup?.capturedAt) !== null, "database backup timestamp is invalid");
  add(failures, validateHash(backup?.backupSha256), "database backup digest is invalid");
  add(
    failures,
    backup?.sourceResourceSha256 === evidence.resources?.postgres?.identitySha256,
    "database backup source is not the exact Preview PostgreSQL resource",
  );
  add(
    failures,
    backup?.sourceRevision === "0001_phase1_foundation"
      && validateHash(backup?.sourceSchemaSha256)
      && validDatabaseContentSnapshot(backup?.sourceContentSnapshot),
    "database backup did not bind the Phase 1 source schema",
  );
  const restore = backup?.restore;
  add(
    failures,
    exactKeys(restore, [
      "status",
      "verifiedAt",
      "backupSha256",
      "sourceResourceSha256",
      "targetResourceSha256",
      "sourceRevision",
      "sourceSchemaSha256",
      "sourceContentSnapshot",
      "destruction",
    ]),
    "database restore proof shape mismatch",
  );
  add(failures, restore?.status === "pass", "database restore proof did not pass");
  add(failures, isoTime(restore?.verifiedAt) !== null, "database restore timestamp is invalid");
  add(
    failures,
    restore?.backupSha256 === backup?.backupSha256
      && restore?.sourceResourceSha256 === backup?.sourceResourceSha256
      && restore?.sourceRevision === backup?.sourceRevision
      && restore?.sourceSchemaSha256 === backup?.sourceSchemaSha256
      && canonicalEqual(
        restore?.sourceContentSnapshot,
        backup?.sourceContentSnapshot,
      ),
    "database restore proof does not bind the captured backup",
  );
  add(failures, validateHash(restore?.targetResourceSha256), "restore target proof is invalid");
  add(
    failures,
    restore?.targetResourceSha256 !== evidence.resources?.productionPostgres?.identitySha256
      && restore?.targetResourceSha256 !== backup?.sourceResourceSha256,
    "database restore target must be an isolated disposable resource",
  );
  const destruction = restore?.destruction;
  add(
    failures,
    exactKeys(destruction, [
      "status",
      "destroyedAt",
      "targetResourceSha256",
      "destroyed",
      "absentAfterDestroy",
      "restoreIdentitySha256",
      "restoreRoleSha256",
      "restoreRoleAbsent",
      "restoreLoginDenied",
      "evidenceSha256",
    ]),
    "restore-target destruction proof shape mismatch",
  );
  add(
    failures,
    destruction?.status === "pass"
      && destruction?.targetResourceSha256 === restore?.targetResourceSha256
      && destruction?.destroyed === true
      && destruction?.absentAfterDestroy === true
      && validateHash(destruction?.restoreIdentitySha256)
      && validateHash(destruction?.restoreRoleSha256)
      && destruction?.restoreRoleAbsent === true
      && destruction?.restoreLoginDenied === true
      && validateHash(destruction?.evidenceSha256),
    "restore target was not destroyed and confirmed absent",
  );
  add(
    failures,
    isoTime(destruction?.destroyedAt) !== null
      && isoTime(restore?.verifiedAt) !== null
      && isoTime(destruction.destroyedAt) >= isoTime(restore.verifiedAt),
    "restore-target destruction timestamp is invalid",
  );

  const migration = evidence.databaseMigration;
  add(
    failures,
    exactKeys(migration, [
      "status",
      "direction",
      "fromRevision",
      "toRevision",
      "sourceSchemaSha256",
      "targetSchemaSha256",
      "roundTripSchemaSha256",
      "localDowngradeGatePassed",
      "providerDowngradeExecuted",
      "completedAt",
    ]),
    "database migration shape mismatch",
  );
  add(
    failures,
    migration?.status === "pass"
      && migration?.direction === "upgrade"
      && migration?.fromRevision === "0001_phase1_foundation"
      && migration?.toRevision === "0002_phase2_daily_training"
      && migration?.localDowngradeGatePassed === true
      && migration?.providerDowngradeExecuted === false,
    "database migration boundary mismatch",
  );
  add(
    failures,
    validateHash(migration?.sourceSchemaSha256)
      && validateHash(migration?.targetSchemaSha256)
      && migration?.sourceSchemaSha256 === backup?.sourceSchemaSha256
      && migration?.targetSchemaSha256 === migration?.roundTripSchemaSha256
      && migration?.sourceSchemaSha256 !== migration?.targetSchemaSha256,
    "database schema fingerprint proof mismatch",
  );
  add(failures, isoTime(migration?.completedAt) !== null, "database migration timestamp is invalid");

  const data = evidence.acceptanceData;
  add(
    failures,
    exactKeys(data, [
      "status",
      "rightsLabelled",
      "syntheticOnly",
      "catalogSha256",
      "actorSha256",
      "seededAt",
    ]),
    "acceptance data proof shape mismatch",
  );
  add(
    failures,
    data?.status === "pass" && data?.rightsLabelled === true && data?.syntheticOnly === true,
    "acceptance data must be rights-labelled and synthetic-only",
  );
  add(
    failures,
    validateHash(data?.catalogSha256) && validateHash(data?.actorSha256),
    "acceptance data fingerprints are invalid",
  );
  add(failures, isoTime(data?.seededAt) !== null, "acceptance data timestamp is invalid");

  add(
    failures,
    Array.isArray(evidence.liveChecks)
      && evidence.liveChecks.length === PHASE2_LIVE_CHECK_IDS.length,
    "live check inventory mismatch",
  );
  PHASE2_LIVE_CHECK_IDS.forEach((id, index) => (
    validateTimedProof(evidence.liveChecks?.[index], id, failures, evidence)
  ));

  const cleanup = evidence.cleanup;
  add(
    failures,
    exactKeys(cleanup, [
      "status",
      "syntheticApplicationRows",
      "syntheticR2Objects",
      "syntheticCatalogRows",
      "completedAt",
      "evidenceSha256",
    ]),
    "cleanup proof shape mismatch",
  );
  add(
    failures,
    cleanup?.status === "pass"
      && cleanup?.syntheticApplicationRows === 0
      && cleanup?.syntheticR2Objects === 0
      && cleanup?.syntheticCatalogRows === 0,
    "cleanup did not prove zero synthetic application, R2, and catalog rows",
  );
  add(failures, isoTime(cleanup?.completedAt) !== null, "cleanup timestamp is invalid");
  add(failures, validateHash(cleanup?.evidenceSha256), "cleanup proof is invalid");

  const access = evidence.temporaryAccess;
  add(
    failures,
    exactKeys(access, [
      "status",
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
      "revokedAt",
      "evidenceSha256",
    ]),
    "temporary access proof shape mismatch",
  );
  add(
    failures,
    access?.status === "pass"
      && access?.cloudflareRevoked === true
      && access?.renderRevoked === true
      && access?.postgresRevoked === true
      && access?.r2Revoked === true
      && access?.mutationCredentialsRevoked === true
      && access?.controlIdentityRetained === true
      && access?.postgresControlRevocationPending === true
      && access?.renderControlRevocationPending === true
      && access?.postgresProviderCredentialInventoryUnchanged === true
      && validateHash(access?.postgresProviderCredentialInventorySha256)
      && access?.postgresProviderCredentialInventorySha256
        === terminalControl?.postgres?.providerCredentialInventorySha256
      && canonicalEqual(
        access?.remainingReadOnlyControlProviders,
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        access?.terminalTemporaryControlProviders,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && access?.terminalRevocationRequired === true
      && access?.terminalRevocationPending === true
      && access?.renderControlCredentialIdentitySha256
        === terminalControl?.renderCredentialIdentitySha256,
    "temporary mutation access was not fully revoked with terminal control pending",
  );
  add(failures, isoTime(access?.revokedAt) !== null, "temporary access revoke timestamp is invalid");
  add(failures, validateHash(access?.evidenceSha256), "temporary access revoke proof is invalid");
  validateMutationTokenBindings(
    access?.revokedMutationTokenBindings,
    failures,
    "revoked",
  );
  add(
    failures,
    canonicalEqual(
      access?.revokedMutationTokenBindings,
      preflight?.mutationTokenBindings,
    ),
    "revoked mutation credentials do not match the preflight self-identities",
  );
  add(
    failures,
    Array.isArray(access?.postgresIdentities)
      && access.postgresIdentities.length
        === MUTATION_REVOKE_POSTGRES_IDENTITY_KINDS.length,
    "PostgreSQL revocation identity inventory mismatch",
  );
  const postgresIdentityHashes = [];
  const postgresRoleHashes = [];
  MUTATION_REVOKE_POSTGRES_IDENTITY_KINDS.forEach((kind, index) => {
    const proof = access?.postgresIdentities?.[index];
    add(
      failures,
      exactKeys(proof, [
        "kind",
        "identitySha256",
        "roleSha256",
        "revoked",
        "roleAbsent",
        "loginDenied",
        "evidenceSha256",
      ])
        && proof?.kind === kind
        && validateHash(proof?.identitySha256)
        && validateHash(proof?.roleSha256)
        && proof?.revoked === true
        && proof?.roleAbsent === true
        && proof?.loginDenied === true
        && validateHash(proof?.evidenceSha256),
      `PostgreSQL ${kind} identity was not fully revoked and denied`,
    );
    if (validateHash(proof?.identitySha256)) postgresIdentityHashes.push(proof.identitySha256);
    if (validateHash(proof?.roleSha256)) postgresRoleHashes.push(proof.roleSha256);
  });
  add(
    failures,
    access?.postgresIdentities?.[1]?.identitySha256
        === destruction?.restoreIdentitySha256
      && access?.postgresIdentities?.[1]?.roleSha256
        === destruction?.restoreRoleSha256,
    "restore-target destruction and final restore-identity revoke proofs do not match",
  );
  add(
    failures,
    unique(postgresIdentityHashes)
      && unique(postgresRoleHashes)
      && postgresIdentityHashes.every((identity) => ![
        evidence.resources?.postgres?.identitySha256,
        evidence.resources?.productionPostgres?.identitySha256,
      ].includes(identity)),
    "PostgreSQL temporary revocation identities overlap each other or a runtime resource",
  );

  const postRevoke = evidence.postRevokeContinuity;
  add(
    failures,
    exactKeys(postRevoke, [
      "status",
      "checkedAt",
      "continuityObservationCompletedAt",
      "terminalRevocationCompletedAt",
      "continuityToTerminalRevocationMs",
      "controlIdentitySha256",
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
      "postgresProviderCredentialInventoryUnchanged",
      "postgresProviderCredentialInventorySha256",
      "postgresControlIdentity",
      "persistentProviderAdmin",
      "remainingReadOnlyControlProviders",
      "terminalTemporaryControlProviders",
      "terminalTemporaryControlCredentialsRevoked",
      "remainingControlCredentialsReadOnly",
      "runtimeIdentitiesUnchanged",
      "renderTopologyObservation",
      "sustainableControlRevalidation",
      "evidenceSha256",
    ]),
    "post-revoke continuity proof shape mismatch",
  );
  add(
    failures,
    postRevoke?.status === "pass"
      && postRevoke?.controlIdentitySha256 === credentialBoundary?.control?.identitySha256
      && postRevoke?.runtimeIdentitiesUnchanged === true
      && postRevoke?.renderControlRevoked === true
      && postRevoke?.renderControlAccessDenied === true
      && postRevoke?.renderControlRefreshDenied === true
      && postRevoke?.renderControlCredentialIdentitySha256
        === access?.renderControlCredentialIdentitySha256
      && postRevoke?.renderControlRevocationEvidenceSha256 === sha256(canonicalJson({
        accessDenied: postRevoke?.renderControlAccessDenied,
        credentialIdentitySha256: postRevoke?.renderControlCredentialIdentitySha256,
        refreshDenied: postRevoke?.renderControlRefreshDenied,
        revoked: postRevoke?.renderControlRevoked,
      }))
      && postRevoke?.postgresControlRevokedAfterContinuity === true
      && postRevoke?.postgresProviderCredentialInventoryUnchanged === true
      && validateHash(postRevoke?.postgresProviderCredentialInventorySha256)
      && postRevoke?.postgresProviderCredentialInventorySha256
        === access?.postgresProviderCredentialInventorySha256
      && exactKeys(postRevoke?.persistentProviderAdmin, [
        "retained",
        "privilege",
        "excludedFromReadOnlyControlAssertions",
        "identitySha256",
        "sqlIdentitySha256",
        "providerCredentialInventoryUnchanged",
        "providerCredentialInventorySha256",
        "evidenceSha256",
      ])
      && postRevoke?.persistentProviderAdmin?.retained === true
      && postRevoke?.persistentProviderAdmin?.privilege === "admin"
      && postRevoke?.persistentProviderAdmin
        ?.excludedFromReadOnlyControlAssertions === true
      && postRevoke?.persistentProviderAdmin?.identitySha256
        === credentialBoundary?.bootstrap?.identitySha256
      && postRevoke?.persistentProviderAdmin
        ?.providerCredentialInventoryUnchanged === true
      && postRevoke?.persistentProviderAdmin?.providerCredentialInventorySha256
        === postRevoke?.postgresProviderCredentialInventorySha256
      && validateHash(postRevoke?.persistentProviderAdmin?.sqlIdentitySha256)
      && validateHash(postRevoke?.persistentProviderAdmin?.evidenceSha256)
      && canonicalEqual(
        postRevoke?.remainingReadOnlyControlProviders,
        REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      )
      && canonicalEqual(
        postRevoke?.terminalTemporaryControlProviders,
        TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      )
      && postRevoke?.terminalTemporaryControlCredentialsRevoked === true
      && postRevoke?.remainingControlCredentialsReadOnly === true
      && canonicalEqual(postRevoke?.resources, evidence.resources)
      && canonicalEqual(postRevoke?.productionAnchor, continuity?.after),
    "post-revoke continuity did not preserve exact topology with read-only control",
  );
  add(
    failures,
    isoTime(postRevoke?.checkedAt) !== null
      && isoTime(postRevoke?.continuityObservationCompletedAt) !== null
      && validateHash(postRevoke?.evidenceSha256),
    "post-revoke continuity timestamp or proof is invalid",
  );
  const renderTopologyObservation = postRevoke?.renderTopologyObservation;
  add(
    failures,
    exactKeys(renderTopologyObservation, [
      "observedAt",
      "timing",
      "reobservedAfterTerminalRevocation",
    ])
      && renderTopologyObservation?.observedAt === postRevoke?.checkedAt
      && renderTopologyObservation?.timing
        === "before-terminal-control-revocation"
      && renderTopologyObservation?.reobservedAfterTerminalRevocation === false,
    "Render topology timing must remain the persisted pre-terminal observation",
  );
  const sustainableRevalidation = postRevoke?.sustainableControlRevalidation;
  const unsignedSustainableRevalidation = isPlainObject(sustainableRevalidation)
    ? Object.fromEntries(SUSTAINABLE_CONTROL_REVALIDATION_KEYS
      .filter((key) => key !== "evidenceSha256")
      .map((key) => [key, sustainableRevalidation[key]]))
    : undefined;
  const cloudflareRevalidationSha256 = sha256(canonicalJson({
    previewPagesDeploymentCommit: postRevoke?.previewAnchor?.pagesDeploymentCommit,
    productionPagesDeploymentCommit:
      postRevoke?.productionAnchor?.pagesDeploymentCommit,
    previewPagesIdentitySha256: postRevoke?.resources?.pages?.identitySha256,
    productionPagesIdentitySha256:
      postRevoke?.resources?.productionPages?.identitySha256,
    previewR2IdentitySha256: postRevoke?.resources?.r2?.identitySha256,
    productionR2IdentitySha256:
      postRevoke?.resources?.productionR2?.identitySha256,
  }));
  add(
    failures,
    exactKeys(sustainableRevalidation, SUSTAINABLE_CONTROL_REVALIDATION_KEYS)
      && sustainableRevalidation?.status === "pass"
      && isoTime(sustainableRevalidation?.checkedAt) !== null
      && isoTime(sustainableRevalidation?.completedAt) !== null
      && sustainableRevalidation?.cloudflareTopologyUnchanged === true
      && sustainableRevalidation?.pullRequestUnchanged === true
      && sustainableRevalidation?.previewApiLive === true
      && sustainableRevalidation?.previewDatabaseRevisionUnchanged === true
      && sustainableRevalidation?.previewR2ContinuityUnchanged === true
      && sustainableRevalidation?.githubReadOnly === true
      && sustainableRevalidation?.publicApiUnauthenticated === true
      && sustainableRevalidation?.postgresBootstrapAdminUsed === true
      && sustainableRevalidation
        ?.postgresBootstrapAdminExcludedFromReadOnlyAssertions === true
      && sustainableRevalidation?.renderTopologyReobserved === false
      && sustainableRevalidation?.renderTopologyBasis
        === "pre-terminal-revocation-observation"
      && sustainableRevalidation?.cloudflareEvidenceSha256
        === cloudflareRevalidationSha256
      && sustainableRevalidation?.pullRequestEvidenceSha256
        === postRevoke?.pullRequest?.evidenceSha256
      && sustainableRevalidation?.previewApiEvidenceSha256
        === postRevoke?.previewApi?.evidenceSha256
      && sustainableRevalidation?.previewDatabaseEvidenceSha256
        === postRevoke?.previewDatabase?.evidenceSha256
      && sustainableRevalidation?.previewR2EvidenceSha256
        === postRevoke?.previewR2?.evidenceSha256
      && validateHash(sustainableRevalidation?.evidenceSha256)
      && sustainableRevalidation?.evidenceSha256
        === sha256(canonicalJson(unsignedSustainableRevalidation)),
    "sustainable post-terminal continuity revalidation is invalid",
  );
  const continuityObservedAt = isoTime(postRevoke?.checkedAt);
  const continuityObservationCompletedAt = isoTime(
    postRevoke?.continuityObservationCompletedAt,
  );
  const terminalRevocationCompletedAt = isoTime(
    postRevoke?.terminalRevocationCompletedAt,
  );
  const sustainableRevalidatedAt = isoTime(sustainableRevalidation?.checkedAt);
  const sustainableRevalidationCompletedAt = isoTime(
    sustainableRevalidation?.completedAt,
  );
  add(
    failures,
    continuityObservedAt !== null
      && continuityObservationCompletedAt !== null
      && terminalRevocationCompletedAt !== null
      && sustainableRevalidatedAt !== null
      && sustainableRevalidationCompletedAt !== null
      && continuityObservationCompletedAt >= continuityObservedAt
      && sustainableRevalidatedAt >= continuityObservationCompletedAt
      && sustainableRevalidationCompletedAt >= sustainableRevalidatedAt
      && sustainableRevalidationCompletedAt <= terminalRevocationCompletedAt
      && Number.isSafeInteger(postRevoke?.continuityToTerminalRevocationMs)
      && postRevoke.continuityToTerminalRevocationMs
        === terminalRevocationCompletedAt - continuityObservedAt
      && postRevoke.continuityToTerminalRevocationMs >= 0
      && postRevoke.continuityToTerminalRevocationMs
        <= MAX_TERMINAL_CONTINUITY_HANDOFF_MS,
    "terminal revocation is not bounded to the persisted continuity observation",
  );
  const postgresControlIdentity = postRevoke?.postgresControlIdentity;
  add(
    failures,
    exactKeys(postgresControlIdentity, [
      "kind",
      "identitySha256",
      "roleSha256",
      "revoked",
      "roleAbsent",
      "loginDenied",
      "evidenceSha256",
    ])
      && postgresControlIdentity?.kind === "control"
      && validateHash(postgresControlIdentity?.identitySha256)
      && validateHash(postgresControlIdentity?.roleSha256)
      && postgresControlIdentity?.revoked === true
      && postgresControlIdentity?.roleAbsent === true
      && postgresControlIdentity?.loginDenied === true
      && validateHash(postgresControlIdentity?.evidenceSha256),
    "PostgreSQL control identity was not revoked after continuity",
  );
  add(
    failures,
    validateHash(postgresControlIdentity?.identitySha256)
      && validateHash(postgresControlIdentity?.roleSha256)
      && !postgresIdentityHashes.includes(postgresControlIdentity.identitySha256)
      && !postgresRoleHashes.includes(postgresControlIdentity.roleSha256)
      && ![
        evidence.resources?.postgres?.identitySha256,
        evidence.resources?.productionPostgres?.identitySha256,
      ].includes(postgresControlIdentity.identitySha256),
    "PostgreSQL control identity overlaps a mutation-stage identity or runtime resource",
  );
  validateProductionAnchor(
    postRevoke?.productionAnchor,
    failures,
    "post-revoke",
    evidence.resources,
    evidence.applicationCommit,
  );
  validatePreviewAnchor(
    postRevoke?.previewAnchor,
    failures,
    "post-revoke",
    "0002_phase2_daily_training",
    evidence.resources,
  );
  add(
    failures,
    postRevoke?.previewAnchor?.pagesDeploymentCommit === evidence.applicationCommit
      && postRevoke?.previewAnchor?.apiDeploymentCommit === evidence.applicationCommit
      && postRevoke?.previewAnchor?.llmDeploymentCommit
        === PHASE2_REQUIRED_ANCESTOR_COMMITS[0],
    "post-revoke Preview deployment anchors drifted",
  );
  const postApi = postRevoke?.previewApi;
  add(
    failures,
    exactKeys(postApi, [
      "resourceIdentitySha256",
      "deploymentCommit",
      "live",
      "evidenceSha256",
    ])
      && postApi?.resourceIdentitySha256 === evidence.resources?.api?.identitySha256
      && postApi?.deploymentCommit === evidence.applicationCommit
      && postApi?.live === true
      && validateHash(postApi?.evidenceSha256),
    "post-revoke Preview API continuity proof is invalid",
  );
  const postDatabase = postRevoke?.previewDatabase;
  add(
    failures,
    exactKeys(postDatabase, [
      "resourceIdentitySha256",
      "revision",
      "readSucceeded",
      "evidenceSha256",
    ])
      && postDatabase?.resourceIdentitySha256
        === evidence.resources?.postgres?.identitySha256
      && postDatabase?.revision === "0002_phase2_daily_training"
      && postDatabase?.readSucceeded === true
      && validateHash(postDatabase?.evidenceSha256),
    "post-revoke Preview database continuity proof is invalid",
  );
  const postR2 = postRevoke?.previewR2;
  add(
    failures,
    exactKeys(postR2, [
      "resourceIdentitySha256",
      "readSucceeded",
      "policyBucketBound",
      "policyReadOnly",
      "writeDenied",
      "productionAccessDenied",
      "mutationAttempted",
      "evidenceSha256",
    ])
      && postR2?.resourceIdentitySha256 === evidence.resources?.r2?.identitySha256
      && postR2?.readSucceeded === true
      && postR2?.policyBucketBound === true
      && postR2?.policyReadOnly === true
      && postR2?.writeDenied === true
      && postR2?.productionAccessDenied === true
      && postR2?.mutationAttempted === false
      && validateHash(postR2?.evidenceSha256),
    "post-revoke Preview R2 read-only continuity proof is invalid",
  );

  const pullRequest = evidence.pullRequest;
  add(
    failures,
    exactKeys(pullRequest, ["before", "after", "unchanged"]),
    "pull request proof shape mismatch",
  );
  for (const point of ["before", "after"]) {
    const check = pullRequest?.[point];
    add(
      failures,
      exactKeys(check, [
        "repository",
        "number",
        "state",
        "draft",
        "merged",
        "headCommit",
        "checkedAt",
        "evidenceSha256",
      ]),
      `pull request ${point} proof shape mismatch`,
    );
    add(
      failures,
      check?.repository === "garymmmjw/QuantGym"
        && check?.number === 130
        && check?.state === "open"
        && check?.draft === true
        && check?.merged === false
        && check?.headCommit === candidate?.evidenceHeadCommit,
      `pull request ${point} must remain draft, open, unmerged, and commit-aligned`,
    );
    add(failures, isoTime(check?.checkedAt) !== null, `pull request ${point} timestamp is invalid`);
    add(failures, validateHash(check?.evidenceSha256), `pull request ${point} proof is invalid`);
  }
  add(
    failures,
    pullRequest?.unchanged === true
      && canonicalEqual(
        pullRequest?.before && {
          repository: pullRequest.before.repository,
          number: pullRequest.before.number,
          state: pullRequest.before.state,
          draft: pullRequest.before.draft,
          merged: pullRequest.before.merged,
          headCommit: pullRequest.before.headCommit,
        },
        pullRequest?.after && {
          repository: pullRequest.after.repository,
          number: pullRequest.after.number,
          state: pullRequest.after.state,
          draft: pullRequest.after.draft,
          merged: pullRequest.after.merged,
          headCommit: pullRequest.after.headCommit,
        },
      ),
    "pull request boundary changed during cutover",
  );
  const postRevokePullRequest = postRevoke?.pullRequest;
  add(
    failures,
    exactKeys(postRevokePullRequest, [
      "repository",
      "number",
      "state",
      "draft",
      "merged",
      "headCommit",
      "checkedAt",
      "evidenceSha256",
    ])
      && postRevokePullRequest?.repository === "garymmmjw/QuantGym"
      && postRevokePullRequest?.number === 130
      && postRevokePullRequest?.state === "open"
      && postRevokePullRequest?.draft === true
      && postRevokePullRequest?.merged === false
      && postRevokePullRequest?.headCommit === candidate?.evidenceHeadCommit
      && isoTime(postRevokePullRequest?.checkedAt) === isoTime(postRevoke?.checkedAt)
      && validateHash(postRevokePullRequest?.evidenceSha256),
    "post-revoke pull request continuity proof is invalid",
  );

  add(
    failures,
    Array.isArray(evidence.cutoverSequence)
      && evidence.cutoverSequence.length === PHASE2_CUTOVER_STEP_IDS.length,
    "cutover sequence inventory mismatch",
  );
  let priorCompletion = null;
  PHASE2_CUTOVER_STEP_IDS.forEach((id, index) => {
    const step = evidence.cutoverSequence?.[index];
    add(
      failures,
      exactKeys(step, [
        "id",
        "status",
        "startedAt",
        "completedAt",
        "durationMs",
        "evidenceSha256",
      ]),
      `${id} cutover step shape mismatch`,
    );
    add(failures, step?.id === id, `${id} cutover step order mismatch`);
    add(failures, step?.status === "pass", `${id} cutover step did not pass`);
    const startedAt = isoTime(step?.startedAt);
    const completedAt = isoTime(step?.completedAt);
    add(
      failures,
      startedAt !== null
        && completedAt !== null
        && startedAt <= completedAt
        && completedAt - startedAt <= MAX_CUTOVER_STEP_DURATION_MS
        && step?.durationMs === completedAt - startedAt,
      `${id} cutover step timestamp is invalid`,
    );
    if (priorCompletion !== null && startedAt !== null) {
      add(failures, startedAt >= priorCompletion, `${id} cutover step is out of order`);
    }
    if (completedAt !== null) priorCompletion = completedAt;
    add(failures, validateHash(step?.evidenceSha256), `${id} cutover step proof is invalid`);
  });
  const sequence = evidence.cutoverSequence;
  add(
    failures,
    backup?.capturedAt === sequence?.[0]?.completedAt
      && restore?.verifiedAt === sequence?.[1]?.completedAt
      && destruction?.destroyedAt === sequence?.[2]?.completedAt
      && migration?.completedAt === sequence?.[3]?.completedAt
      && cleanup?.completedAt === sequence?.[7]?.completedAt
      && access?.revokedAt === sequence?.[8]?.completedAt
      && postRevoke?.terminalRevocationCompletedAt === sequence?.[9]?.completedAt
      && postRevoke?.evidenceSha256 === sequence?.[9]?.evidenceSha256,
    "cutover facts do not bind the ordered sequence",
  );
  add(
    failures,
    isoTime(sequence?.[0]?.startedAt) !== null
      && priorCompletion !== null
      && Number.isSafeInteger(evidence.cutoverDurationMs)
      && evidence.cutoverDurationMs >= 0
      && evidence.cutoverDurationMs <= MAX_CUTOVER_DURATION_MS
      && evidence.cutoverDurationMs
        === priorCompletion - isoTime(sequence[0].startedAt),
    "cutover sequence exceeded the maximum duration",
  );
  const seededAt = isoTime(data?.seededAt);
  const liveStartedAt = isoTime(sequence?.[6]?.startedAt);
  const liveCompletedAt = isoTime(sequence?.[6]?.completedAt);
  add(
    failures,
    seededAt !== null
      && liveStartedAt !== null
      && liveCompletedAt !== null
      && seededAt >= liveStartedAt
      && seededAt <= liveCompletedAt,
    "acceptance data was not seeded inside the live-check stage",
  );
  add(
    failures,
    isoTime(candidate?.checkedAt) !== null
      && isoTime(preflight?.checkedAt) !== null
      && isoTime(candidate.checkedAt) <= isoTime(preflight.checkedAt)
      && isoTime(sequence?.[0]?.startedAt) !== null
      && isoTime(preflight.checkedAt) <= isoTime(sequence[0].startedAt),
    "capability preflight or provider writes started before the candidate gate passed",
  );
  add(
    failures,
    isoTime(preflight?.checkedAt) !== null
      && isoTime(continuity?.beforeCheckedAt) !== null
      && isoTime(continuity.beforeCheckedAt) >= isoTime(preflight.checkedAt)
      && isoTime(sequence?.[0]?.startedAt) !== null
      && isoTime(continuity.beforeCheckedAt) <= isoTime(sequence[0].startedAt)
      && isoTime(continuity?.afterCheckedAt) !== null
      && isoTime(sequence?.[7]?.completedAt) !== null
      && isoTime(continuity.afterCheckedAt) >= isoTime(sequence[7].completedAt)
      && isoTime(sequence?.[8]?.startedAt) !== null
      && isoTime(continuity.afterCheckedAt) <= isoTime(sequence[8].startedAt),
    "Production topology was not checked before writes and before final mutation revoke",
  );
  add(
    failures,
    isoTime(pullRequest?.after?.checkedAt) !== null
      && isoTime(continuity?.afterCheckedAt) !== null
      && isoTime(pullRequest.after.checkedAt) >= isoTime(continuity.afterCheckedAt)
      && isoTime(sequence?.[8]?.startedAt) !== null
      && isoTime(pullRequest.after.checkedAt) <= isoTime(sequence[8].startedAt),
    "final pull-request control check did not precede mutation revoke",
  );
  add(
    failures,
    isoTime(sequence?.[8]?.completedAt) !== null
      && isoTime(sequence?.[9]?.startedAt) !== null
      && isoTime(sequence[9].startedAt) >= isoTime(sequence[8].completedAt)
      && isoTime(postRevoke?.checkedAt) !== null
      && isoTime(postRevoke.checkedAt) >= isoTime(sequence[9].startedAt)
      && isoTime(postRevokePullRequest?.checkedAt) === isoTime(postRevoke.checkedAt)
      && isoTime(postRevoke?.terminalRevocationCompletedAt)
        === isoTime(sequence[9].completedAt)
      && isoTime(postRevoke?.sustainableControlRevalidation?.checkedAt)
        >= isoTime(postRevoke.checkedAt)
      && isoTime(postRevoke?.sustainableControlRevalidation?.completedAt)
        <= isoTime(sequence[9].completedAt),
    "post-revoke continuity was not checked after mutation access was revoked",
  );
  if (capturedAt !== null) {
    add(
      failures,
      priorCompletion !== null && capturedAt >= priorCompletion,
      "provider evidence was captured before cutover completion",
    );
    add(
      failures,
      isoTime(pullRequest?.after?.checkedAt) !== null
        && capturedAt >= isoTime(pullRequest.after.checkedAt),
      "provider evidence was captured before the final pull-request check",
    );
    add(
      failures,
      priorCompletion !== null
        && capturedAt - priorCompletion >= 0
        && capturedAt - priorCompletion <= MAX_PROVIDER_CAPTURE_HANDOFF_MS,
      "provider evidence capture is not bound to the final provider receipt",
    );
    const candidateCheckedAt = isoTime(candidate?.checkedAt);
    add(
      failures,
      candidateCheckedAt !== null
        && candidateCheckedAt <= capturedAt
        && capturedAt - candidateCheckedAt
          <= MAX_CUTOVER_DURATION_MS + MAX_PROVIDER_CAPTURE_HANDOFF_MS,
      "provider facts are stale relative to the evidence capture",
    );
  }

  const serialized = JSON.stringify(evidence);
  add(
    failures,
    !forbiddenSerializedContent(serialized),
    "provider evidence contains a raw response, secret, or network location",
  );
  add(
    failures,
    !/(?:"accepted"|"selfAccepted"|"productionMutation"\s*:\s*true)/u.test(serialized),
    "provider evidence exceeds the Phase 2 review boundary",
  );
  return [...new Set(failures)];
}

const ensureTrustedOutputDirectory = async (root, relativePath) => {
  const relativeDirectory = path.posix.dirname(relativePath);
  const rootPath = path.resolve(root);
  await captureTrustedDirectoryChain(rootPath);
  let current = rootPath;
  for (const segment of relativeDirectory.split("/")) {
    current = path.join(current, segment);
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("provider evidence output directory is unsafe");
    }
  }
  await captureTrustedDirectoryChain(rootPath, relativeDirectory);
};

const invalidateExistingProviderEvidence = async (root) => {
  const target = path.join(path.resolve(root), PHASE2_PROVIDER_EVIDENCE_PATH);
  let metadata;
  try {
    metadata = await lstat(target, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (
    metadata.isSymbolicLink()
    || !metadata.isFile()
    || metadata.nlink !== 1n
  ) throw new Error("existing Phase 2 provider evidence is unsafe to invalidate");
  await unlink(target);
};

const writeIsolatedTestProviderEvidence = async (root, serialized) => {
  const target = path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH);
  const handle = await open(
    target,
    fsConstants.O_WRONLY
      | fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const securelyReadBoundedFile = async (root, relativePath, maximumBytes) => {
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is required for provider evidence");
  }
  const absolutePath = path.join(path.resolve(root), relativePath);
  const pathMetadata = await lstat(absolutePath, { bigint: true });
  if (
    pathMetadata.isSymbolicLink()
    || !pathMetadata.isFile()
    || pathMetadata.nlink !== 1n
    || pathMetadata.size <= 0n
    || pathMetadata.size > BigInt(maximumBytes)
  ) throw new Error("provider evidence path is not a bounded single-link regular file");
  const handle = await open(absolutePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) throw new Error("provider evidence changed while reading");
    }
    if (pathMetadata.dev !== after.dev || pathMetadata.ino !== after.ino) {
      throw new Error("provider evidence inode changed while reading");
    }
    return { bytes, metadata: after };
  } finally {
    await handle.close();
  }
};

export async function readPhase2ProviderEvidence({
  root = defaultRoot,
  nowMs = Date.now(),
} = {}) {
  const { bytes, metadata } = await securelyReadBoundedFile(
    root,
    PHASE2_PROVIDER_EVIDENCE_PATH,
    MAX_EVIDENCE_BYTES,
  );
  if (Number(metadata.mode & 0o777n) !== 0o600) {
    throw new Error("Phase 2 provider evidence must use mode 0600");
  }
  let evidence;
  try {
    evidence = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Phase 2 provider evidence is invalid JSON");
  }
  const failures = validatePhase2ProviderEvidence(evidence, { nowMs });
  if (failures.length > 0) {
    throw new Error(`Phase 2 provider evidence failed: ${failures[0]}`);
  }
  return { evidence, bytes, sha256: sha256(bytes) };
}

export async function checkPhase2ProviderEvidence({
  root = defaultRoot,
  nowMs = Date.now(),
} = {}) {
  const { bytes: schemaBytes } = await securelyReadBoundedFile(
    root,
    PHASE2_PROVIDER_SCHEMA_PATH,
    MAX_SCHEMA_BYTES,
  );
  let schema;
  try {
    schema = JSON.parse(schemaBytes.toString("utf8"));
  } catch {
    throw new Error("Phase 2 provider schema is invalid JSON");
  }
  const schemaFailures = validatePhase2ProviderEvidenceSchema(schema);
  if (schemaFailures.length > 0) {
    throw new Error(`Phase 2 provider schema failed: ${schemaFailures[0]}`);
  }
  return readPhase2ProviderEvidence({ root, nowMs });
}

const requireTestRoot = async (testOnly) => {
  if (process.env.NODE_ENV !== "test" || !testOnly || typeof testOnly.root !== "string") {
    throw new Error("test-only Phase 2 provider injection requires NODE_ENV=test");
  }
  const [rootPath, temporaryPath] = await Promise.all([
    realpath(testOnly.root),
    realpath(tmpdir()),
  ]);
  const relative = path.relative(temporaryPath, rootPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) throw new Error("test-only Phase 2 provider root must be isolated under the temporary root");
  return rootPath;
};

const readRecoveryFinalizationJournal = async ({ expectedCommit, journalPath }) => {
  let pathMetadata;
  try {
    pathMetadata = await lstat(journalPath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const expectedUid = typeof process.getuid === "function" ? BigInt(process.getuid()) : null;
  if (
    pathMetadata.isSymbolicLink()
    || !pathMetadata.isFile()
    || pathMetadata.nlink !== 1n
    || pathMetadata.size <= 0n
    || pathMetadata.size > BigInt(MAX_RECOVERY_JOURNAL_BYTES)
    || Number(pathMetadata.mode & 0o777n) !== 0o600
    || (expectedUid !== null && pathMetadata.uid !== expectedUid)
  ) throw new Error("Phase 2 recovery journal is unsafe");
  const handle = await open(journalPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let bytes;
  let metadata;
  try {
    const before = await handle.stat({ bigint: true });
    bytes = await handle.readFile();
    metadata = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== metadata[field]) {
        throw new Error("Phase 2 recovery journal changed while reading");
      }
    }
    if (pathMetadata.dev !== metadata.dev || pathMetadata.ino !== metadata.ino) {
      throw new Error("Phase 2 recovery journal inode changed while reading");
    }
  } finally {
    await handle.close();
  }
  let journal;
  try {
    journal = JSON.parse(bytes.toString("utf8"));
  } finally {
    bytes.fill(0);
  }
  const finalization = journal?.finalization;
  if (
    journal?.schemaVersion !== 6
    || journal?.expectedCommit !== expectedCommit
    || typeof journal?.controlRenderRevoked !== "boolean"
    || !isPlainObject(finalization)
    || !new Set(["pending", "terminal-intent", "facts-staged", "evidence-written"])
      .has(finalization.status)
    || (
      new Set(["facts-staged", "evidence-written"]).has(finalization.status)
      && journal.controlRenderRevoked !== true
    )
  ) throw new Error("Phase 2 recovery journal finalization state is invalid");
  if (new Set(["pending", "terminal-intent"]).has(finalization.status)) return null;
  if (
    !exactKeys(finalization, [
      "status",
      "capturedAt",
      "facts",
      "factsSha256",
      "evidenceSha256",
    ])
    || isoTime(finalization.capturedAt) === null
    || !exactKeys(finalization.facts, PROVIDER_FACT_KEYS)
    || !validateHash(finalization.factsSha256)
    || finalization.factsSha256 !== sha256(canonicalJson(finalization.facts))
    || (
      finalization.status === "facts-staged"
        ? finalization.evidenceSha256 !== null
        : !validateHash(finalization.evidenceSha256)
    )
  ) throw new Error("Phase 2 recovery journal facts are invalid");
  return { journal, journalPath, metadata };
};

const removeRecoveryFinalizationJournal = async ({ journalPath, metadata }) => {
  const current = await lstat(journalPath, { bigint: true });
  if (
    current.isSymbolicLink()
    || !current.isFile()
    || current.nlink !== 1n
    || current.dev !== metadata.dev
    || current.ino !== metadata.ino
  ) throw new Error("Phase 2 recovery journal changed before acknowledgement");
  await unlink(journalPath);
};

const cleanupRecoveryBackup = async (journal) => {
  if (journal.backup === null || journal.backup === undefined) return;
  const directory = path.resolve(journal.backup.directory ?? "");
  const temporaryRoot = await realpath(tmpdir());
  if (
    path.dirname(directory) !== temporaryRoot
    || !/^quantgym-phase2-backup-[A-Za-z0-9_-]+$/u.test(path.basename(directory))
    || path.dirname(path.resolve(journal.backup.backupPath ?? "")) !== directory
    || path.basename(journal.backup.backupPath ?? "") !== "preview-phase1.dump"
  ) throw new Error("Phase 2 recovery backup path is invalid");
  let metadata;
  try {
    metadata = await lstat(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Phase 2 recovery backup directory is unsafe");
  }
  await rm(directory, { recursive: true, force: false });
};

const evidenceFromStagedFacts = ({ expectedCommit, capturedAt, facts }) => ({
  schemaVersion: 1,
  phase: 2,
  status: "pass",
  capturedAt,
  expiresAt: new Date(
    Date.parse(capturedAt) + PHASE2_PROVIDER_MAXIMUM_LIFETIME_MS,
  ).toISOString(),
  environment: "preview",
  branch: DEFAULT_BRANCH,
  applicationCommit: expectedCommit,
  governance: { ...GOVERNANCE },
  capture: {
    authenticated: true,
    inputSource: "operator-environment",
    rawResponsesPersisted: false,
    journalTrustBoundary: structuredClone(
      PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
    ),
  },
  ...structuredClone(facts),
});

export async function resumeFrontendUpgradePhase2ProviderEvidenceFinalization(
  options = {},
) {
  const testOnly = options[TEST_ONLY_PHASE2_PROVIDER_EVIDENCE];
  if (!testOnly && (options.root !== undefined || options.recoveryJournalPath !== undefined)) {
    throw new Error("Phase 2 finalization recovery paths are fixed");
  }
  const expectedCommit = options.expectedCommit;
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("expected commit is invalid");
  const root = testOnly ? await requireTestRoot(testOnly) : defaultRoot;
  const journalPath = testOnly?.recoveryJournalPath
    ?? recoveryJournalPathFor(expectedCommit);
  const loaded = await readRecoveryFinalizationJournal({ expectedCommit, journalPath });
  if (loaded === null) return Object.freeze({ resumed: false });
  const { journal, metadata } = loaded;
  const { capturedAt, facts, evidenceSha256, status } = journal.finalization;
  const evidence = evidenceFromStagedFacts({ expectedCommit, capturedAt, facts });
  const nowMs = testOnly?.now instanceof Date ? testOnly.now.getTime() : Date.now();
  if (!Number.isFinite(nowMs)) throw new Error("provider evidence time is invalid");
  const failures = validatePhase2ProviderEvidence(evidence, { expectedCommit, nowMs });
  if (failures.length > 0) {
    throw new Error(`Phase 2 staged provider facts failed: ${failures[0]}`);
  }
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (forbiddenSerializedContent(serialized)) {
    throw new Error("Phase 2 staged provider evidence contains sensitive input");
  }
  const expectedBytes = Buffer.from(serialized, "utf8");
  const expectedSha256 = sha256(expectedBytes);
  if (status === "evidence-written" && evidenceSha256 !== expectedSha256) {
    throw new Error("Phase 2 recovery journal evidence hash is inconsistent");
  }
  await ensureTrustedOutputDirectory(root, PHASE2_PROVIDER_EVIDENCE_PATH);
  let existing;
  try {
    existing = await securelyReadBoundedFile(
      root,
      PHASE2_PROVIDER_EVIDENCE_PATH,
      MAX_EVIDENCE_BYTES,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (existing !== undefined) {
    if (!existing.bytes.equals(expectedBytes)) {
      throw new Error("existing Phase 2 provider evidence differs from staged facts");
    }
  } else if (status === "evidence-written") {
    throw new Error("acknowledged Phase 2 provider evidence is missing");
  } else if (testOnly) {
    await writeIsolatedTestProviderEvidence(root, serialized);
  } else {
    await writeFileAtomicallyWithinTrustedRoot({
      root,
      relativePath: PHASE2_PROVIDER_EVIDENCE_PATH,
      data: serialized,
      mode: 0o600,
    });
  }
  const result = await readPhase2ProviderEvidence({ root, nowMs });
  if (result.sha256 !== expectedSha256) {
    throw new Error("Phase 2 provider evidence read-back hash mismatch");
  }
  await cleanupRecoveryBackup(journal);
  await removeRecoveryFinalizationJournal({ journalPath, metadata });
  return Object.freeze({
    resumed: true,
    output: path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH),
    sha256: result.sha256,
    evidence: result.evidence,
  });
}

export async function invalidateFrontendUpgradePhase2ProviderEvidence(options = {}) {
  const testOnly = options[TEST_ONLY_PHASE2_PROVIDER_EVIDENCE];
  if (!testOnly && options.root !== undefined) {
    throw new Error("Phase 2 provider evidence root is fixed");
  }
  const root = testOnly ? await requireTestRoot(testOnly) : defaultRoot;
  await ensureTrustedOutputDirectory(root, PHASE2_PROVIDER_EVIDENCE_PATH);
  await invalidateExistingProviderEvidence(root);
  return path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH);
}

const buildFrontendUpgradePhase2ProviderEvidenceInternal = async (
  options = {},
  { productionAuthorized = false } = {},
) => {
  const testOnly = options[TEST_ONLY_PHASE2_PROVIDER_EVIDENCE];
  if (!testOnly && !productionAuthorized) {
    throw new Error("production provider evidence requires an authenticated operator adapter");
  }
  if (!testOnly && options.root !== undefined) {
    throw new Error("Phase 2 provider evidence root is fixed");
  }
  const root = testOnly ? await requireTestRoot(testOnly) : defaultRoot;
  const collectFacts = testOnly?.collectFacts ?? options.productionCollector;
  if (typeof collectFacts !== "function") {
    throw new Error("controlled Phase 2 provider facts channel is required");
  }
  const suppliedCredentialRoles = testOnly?.credentialRoles
    ?? options.productionCredentialRoles;
  const credentialFailures = validatePhase2CredentialRoles(suppliedCredentialRoles);
  if (credentialFailures.length > 0) {
    throw new Error(`controlled Phase 2 credential roles failed: ${credentialFailures[0]}`);
  }
  const credentialRoles = Object.freeze({
    bootstrap: Object.freeze({ ...suppliedCredentialRoles.bootstrap }),
    control: Object.freeze({ ...suppliedCredentialRoles.control }),
    mutation: Object.freeze({ ...suppliedCredentialRoles.mutation }),
  });
  const expectedCommit = options.expectedCommit;
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("expected commit is invalid");
  await invalidateFrontendUpgradePhase2ProviderEvidence({
    ...(testOnly ? { [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: testOnly } : {}),
  });
  let collection;
  try {
    collection = await collectFacts(credentialRoles, Object.freeze({
      expectedCommit,
      branch: DEFAULT_BRANCH,
      resources: PHASE2_RESOURCE_CONTRACT,
      governance: GOVERNANCE,
    }));
  } catch (error) {
    const failure = new Error("controlled Phase 2 provider fact collection failed");
    if (isPlainObject(error?.failureReport)) {
      Object.defineProperty(failure, "failureReport", {
        configurable: false,
        enumerable: true,
        value: structuredClone(error.failureReport),
        writable: false,
      });
    }
    throw failure;
  }
  const facts = testOnly && exactKeys(collection, PROVIDER_FACT_KEYS)
    ? collection
    : collection?.facts;
  if (!exactKeys(facts, PROVIDER_FACT_KEYS)) {
    throw new Error("controlled Phase 2 provider facts are invalid");
  }
  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("provider evidence time is invalid");
  const capturedAt = testOnly && exactKeys(collection, PROVIDER_FACT_KEYS)
    ? now.toISOString()
    : collection?.capturedAt;
  const capturedAtMs = Date.parse(capturedAt ?? "");
  if (
    !Number.isFinite(capturedAtMs)
    || new Date(capturedAtMs).toISOString() !== capturedAt
    || capturedAtMs > now.getTime() + CLOCK_SKEW_MS
    || now.getTime() - capturedAtMs > MAX_PROVIDER_CAPTURE_HANDOFF_MS
  ) throw new Error("provider receipt capture is stale or invalid");
  const evidence = {
    schemaVersion: 1,
    phase: 2,
    status: "pass",
    capturedAt,
    expiresAt: new Date(
      capturedAtMs + PHASE2_PROVIDER_MAXIMUM_LIFETIME_MS,
    ).toISOString(),
    environment: "preview",
    branch: DEFAULT_BRANCH,
    applicationCommit: expectedCommit,
    governance: { ...GOVERNANCE },
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
  const failures = validatePhase2ProviderEvidence(evidence, {
    expectedCommit,
    nowMs: now.getTime(),
  });
  if (failures.length > 0) {
    throw new Error(`Phase 2 provider facts failed: ${failures[0]}`);
  }
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (forbiddenSerializedContent(serialized)) {
    throw new Error("Phase 2 provider evidence serialization contains sensitive input");
  }
  await ensureTrustedOutputDirectory(root, PHASE2_PROVIDER_EVIDENCE_PATH);
  if (testOnly) {
    await writeIsolatedTestProviderEvidence(root, serialized);
  } else {
    await writeFileAtomicallyWithinTrustedRoot({
      root,
      relativePath: PHASE2_PROVIDER_EVIDENCE_PATH,
      data: serialized,
      mode: 0o600,
    });
  }
  const result = await readPhase2ProviderEvidence({ root, nowMs: now.getTime() });
  if (!testOnly && typeof options.productionFinalize === "function") {
    await options.productionFinalize({
      expectedCommit,
      evidenceSha256: result.sha256,
    });
  }
  return {
    output: path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH),
    ...result,
  };
};

export async function buildFrontendUpgradePhase2ProviderEvidence(options = {}) {
  if (!options[TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]) {
    throw new Error("public provider evidence builder is test-only");
  }
  return buildFrontendUpgradePhase2ProviderEvidenceInternal(options);
}

export async function buildFrontendUpgradePhase2ProviderEvidenceFromOperator({
  expectedCommit,
  operatorAdapter,
  clock,
} = {}) {
  const [{ isAuthenticPhase2ProductionOperatorAdapter }, { createPhase2CutoverFactsCollector }] = (
    await Promise.all([
      import("./frontend-upgrade-phase2-operator-adapter.mjs"),
      import("./frontend-upgrade-phase2-cutover-orchestrator.mjs"),
    ])
  );
  if (!isAuthenticPhase2ProductionOperatorAdapter(operatorAdapter)) {
    throw new Error("authentic in-memory Phase 2 operator adapter is required");
  }
  if (
    typeof operatorAdapter.stageProviderEvidenceFacts !== "function"
    || typeof operatorAdapter.stageTerminalRevocationIntent !== "function"
    || typeof operatorAdapter.completeTerminalRevocationIntent !== "function"
    || typeof operatorAdapter.finalizeProviderEvidence !== "function"
  ) throw new Error("authentic operator evidence finalization channel is required");
  const collector = createPhase2CutoverFactsCollector({
    mode: "execute",
    actions: operatorAdapter.actions,
    environment: process.env,
    clock,
    stageProviderEvidenceFacts: (proof) => (
      operatorAdapter.stageProviderEvidenceFacts(proof)
    ),
    stageTerminalRevocationIntent: (proof) => (
      operatorAdapter.stageTerminalRevocationIntent(proof)
    ),
    completeTerminalRevocationIntent: (proof) => (
      operatorAdapter.completeTerminalRevocationIntent(proof)
    ),
  });
  return buildFrontendUpgradePhase2ProviderEvidenceInternal({
    expectedCommit,
    productionCredentialRoles: operatorAdapter.credentialRoles,
    productionCollector: collector,
    productionFinalize: (proof) => operatorAdapter.finalizeProviderEvidence(proof),
  }, { productionAuthorized: true });
}
