import { createHash, createHmac, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TRUSTED_GIT_BINARY = "/usr/bin/git";
const TRUSTED_GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_LITERAL_PATHSPECS: "1",
});
const TRUSTED_GIT_CONFIG = [
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.ignoreStat=false",
];

export const ACCEPTED_PHASE0_DEPLOYMENT_COMMIT = (
  "7a85c2a43b24013d5a49969eca7b4a5f1d093640"
);
export const ACCEPTED_PHASE0_EVIDENCE_COMMIT = (
  "d4d263337728dab0156a9ee2aff4999d5085d77e"
);
export const PHASE0_ACCEPTED_REVIEW_PATH = (
  "docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md"
);
export const PHASE0_EVIDENCE_LOCK_PATH = (
  "docs/frontend-upgrade/phase-0-evidence-lock.json"
);
export const PHASE1_PROVIDER_EVIDENCE_PATH = (
  "artifacts/frontend-upgrade/phase-1-preview/provider-evidence.redacted.json"
);
export const PHASE1_PRE_PUSH_BASELINE_PATH_TEMPLATE = (
  "artifacts/frontend-upgrade/phase-1-preview/"
  + "pre-push-provider-baseline.{applicationCommit}.redacted.json"
);
export const PHASE1_PROVIDER_EVIDENCE_ARCHIVE_PATH_TEMPLATE = (
  "artifacts/frontend-upgrade/phase-1-preview/"
  + "provider-evidence.{applicationCommit}.redacted.json"
);
export const APPROVED_LEGACY_PAGES_ALIAS_SHA256 = (
  "ba30f7e6f48ae62b8011fa7036856089061d9c123bea1110ecad267cc408b637"
);

const PRE_AUTH_CSRF_DOMAIN = Buffer.from("quantgym:v2:csrf:pre-auth:v1", "ascii");

export const PHASE1_AUTH_CLEANUP_CHANNEL = Symbol(
  "frontend-upgrade-phase1-auth-cleanup-channel",
);

export const phase1PreAuthCsrfDigest = (token, signingSecret) => {
  if (
    typeof token !== "string"
    || !/^[A-Za-z0-9_-]{43}$/u.test(token)
    || typeof signingSecret !== "string"
  ) {
    throw new Error("Phase 1 cleanup binding is invalid");
  }
  let key;
  try {
    key = Buffer.from(signingSecret, "utf8");
  } catch {
    throw new Error("Phase 1 cleanup binding is invalid");
  }
  if (key.byteLength < 32) throw new Error("Phase 1 cleanup binding is invalid");
  return createHmac("sha256", key)
    .update(PRE_AUTH_CSRF_DOMAIN)
    .update(Buffer.from([0, 0]))
    .update(token, "ascii")
    .digest("hex");
};

export const phase1AnonymousChallengeCleanupChannelFor = (options) => {
  const channel = options[PHASE1_AUTH_CLEANUP_CHANNEL];
  if (channel !== undefined && typeof channel !== "function") {
    throw new Error("Phase 1 cleanup channel is invalid");
  }
  return channel;
};

export const publishPhase1AnonymousChallengeCleanupTarget = (channel, target) => {
  if (!channel) return;
  const result = channel(Object.freeze({ ...target }));
  if (result !== undefined) {
    throw new Error("Phase 1 cleanup channel is invalid");
  }
};

export const phase1AuditCredentialsAreValid = (credentials) => (
  credentials
  && /^phase1-audit-[a-z0-9._-]+@example\.com$/u.test(credentials.email ?? "")
  && typeof credentials.password === "string"
  && credentials.password.length >= 12
  && credentials.password.length <= 128
  && !/[\s\u0000-\u001f\u007f]/u.test(credentials.password)
);

const SYSTEM_SURFACES = [
  "system:auth",
  "system:desktop-shell",
  "system:mobile-shell",
  "system:global-search",
  "system:notifications-toast",
  "system:todo",
  "system:theme-language",
  "system:network-recovery",
];

const SYSTEM_JOURNEYS = [
  ["e2e:auth-session-and-recovery", "system:auth"],
  ["e2e:desktop-shell-keyboard-navigation", "system:desktop-shell"],
  ["e2e:mobile-shell-navigation", "system:mobile-shell"],
  ["e2e:global-search-keyboard", "system:global-search"],
  ["e2e:notifications-live-region", "system:notifications-toast"],
  ["e2e:todo-lifecycle", "system:todo"],
  ["e2e:theme-language-persistence", "system:theme-language"],
  ["e2e:offline-and-error-recovery", "system:network-recovery"],
];

const PHASE1_MUTATIONS = [
  ["auth.sign-in", "system:auth"],
  ["auth.register", "system:auth"],
  ["auth.reset-password", "system:auth"],
  ["auth.google-sign-in", "system:auth"],
  ["notifications.mark-read", "system:notifications-toast"],
  ["todo.create", "system:todo"],
  ["todo.update", "system:todo"],
  ["todo.complete", "system:todo"],
  ["todo.delete", "system:todo"],
  ["preferences.update-theme", "system:theme-language"],
  ["preferences.update-language", "system:theme-language"],
  ["session.retry", "system:network-recovery"],
];

const RECOVERY_STATES = [
  "recoverable-error",
  "non-recoverable-error",
  "offline-draft",
  "permission-denied",
  "stale-version-conflict",
  "retry",
];

const ACTIVATED_PHASE0_FUTURE_STATES = [
  "shared-state:notifications-toast:center-open",
  "shared-state:notifications-toast:empty",
  "shared-state:network-recovery:offline-draft",
  "shared-state:network-recovery:recoverable-error",
  "shared-state:network-recovery:stale-conflict",
  "shared-state:network-recovery:permission-denied-retry",
];

const REVIEW_EVIDENCE_OUTPUTS = SYSTEM_SURFACES.flatMap((surfaceId) => (
  ["desktop", "laptop", "mobile"].flatMap((viewport) => (
    ["light", "dark"].map((theme) => (
      "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/"
      + `${surfaceId.slice("system:".length)}-${viewport}-${theme}.jpg`
    ))
  ))
));

const EVIDENCE_OUTPUTS = [
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-preview-live-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-postgres-migration-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-r2-binding-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-legacy-boundary-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json",
  ...REVIEW_EVIDENCE_OUTPUTS,
];

const phase1Gates = [
  ...SYSTEM_JOURNEYS.map(([id, surfaceId]) => ({ id, kind: "journey", surfaceId })),
  ...PHASE1_MUTATIONS.flatMap(([mutationId, surfaceId]) => (
    RECOVERY_STATES.map((state) => ({
      id: `mutation:${mutationId}:${state}`,
      kind: "mutation-recovery",
      surfaceId,
      mutationId,
      state,
    }))
  )),
  {
    id: "visual:phase1-system-surfaces:light-dark-responsive",
    kind: "visual-matrix",
    surfaceIds: SYSTEM_SURFACES,
    viewports: ["desktop", "laptop", "mobile"],
    themes: ["light", "dark"],
    caseCount: 48,
  },
  {
    id: "a11y:phase1-system-surfaces",
    kind: "axe-matrix",
    surfaceIds: SYSTEM_SURFACES,
    maximumSeriousOrCriticalFindings: 0,
  },
];

export const APPROVED_PHASE1_PREVIEW_CONTRACT = {
  schemaVersion: 1,
  phase: 1,
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  commits: {
    acceptedDeploymentAncestor: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    acceptedEvidenceAncestor: ACCEPTED_PHASE0_EVIDENCE_COMMIT,
    legacyCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    applicationCommitSource: "provider-evidence.applicationCommit",
    applicationCommitMustDifferFromLegacy: true,
  },
  postgresMajor: 18,
  governance: {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  },
  resources: {
    pagesProject: "quantgym-v2-preview",
    apiService: "quantgym-v2-preview-api",
    llmService: "quantgym-v2-preview-llm",
    postgres: "quantgym-v2-preview-postgres",
    r2Bucket: "quantgym-v2-preview-media",
    legacyPagesBranch: "legacy-compat",
    legacyPagesAlias: "legacy-compat.quantgym-v2-preview.pages.dev",
  },
  topology: {
    browserApiBase: "/api/v2",
    edgeProxy: "cloudflare-pages-function",
    apiProvider: "render",
    llmVisibility: "internal",
    browserDirectUpstreamAllowed: false,
    edgeProofHeader: "X-QuantGym-Edge-Token",
  },
  isolation: {
    productionResourcesAllowed: false,
    legacyDataImportAllowed: false,
    dualWriteAllowed: false,
    productionDatabaseSharingAllowed: false,
    productionBucketSharingAllowed: false,
    previewSyntheticDataOnly: true,
  },
  evidence: {
    namespace: "380-frontend-upgrade-phase-1-",
    providerEvidencePath: PHASE1_PROVIDER_EVIDENCE_PATH,
    providerEvidenceMode: "0600",
    prePushBaselineStrategy: "immutable-per-application-commit",
    prePushBaselinePathTemplate: PHASE1_PRE_PUSH_BASELINE_PATH_TEMPLATE,
    supersededProviderEvidencePathTemplate: PHASE1_PROVIDER_EVIDENCE_ARCHIVE_PATH_TEMPLATE,
    productionControlContinuityRequired: true,
    aggregateStatusCeiling: "ready-for-review",
  },
};

export const APPROVED_PHASE1_PROVIDER_EVIDENCE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://quantgym.invalid/schemas/frontend-upgrade-phase1-provider-evidence.schema.json",
  title: "QuantGym Phase 1 Preview provider evidence",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "capturedAt",
    "expiresAt",
    "environment",
    "branch",
    "applicationCommit",
    "legacyCommit",
    "postgresMajor",
    "governance",
    "phase0ProviderEvidenceSha256",
    "prePushBaselineSha256",
    "productionControlBefore",
    "productionControlAfter",
    "r2PolicyAttestations",
    "resourceFingerprints",
    "deployments",
    "bindings",
    "controls",
  ],
  properties: {
    schemaVersion: { const: 1 },
    capturedAt: { type: "string", format: "date-time" },
    expiresAt: { type: "string", format: "date-time" },
    environment: { const: "preview" },
    branch: { const: "codex/frontend-v2-preview" },
    applicationCommit: {
      type: "string",
      pattern: "^[0-9a-f]{40}$",
      not: { const: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
    },
    legacyCommit: { const: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
    postgresMajor: { const: 18 },
    governance: { $ref: "#/$defs/governance" },
    phase0ProviderEvidenceSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    prePushBaselineSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    productionControlBefore: { type: "string", pattern: "^[0-9a-f]{64}$" },
    productionControlAfter: { type: "string", pattern: "^[0-9a-f]{64}$" },
    r2PolicyAttestations: {
      type: "object",
      additionalProperties: false,
      required: [
        "runtimeIdSha256",
        "runtimePolicySha256",
        "runtimeExpirationStatus",
        "auditIdSha256",
        "auditPolicySha256",
        "auditExpirationStatus",
      ],
      properties: {
        runtimeIdSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
        runtimePolicySha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
        runtimeExpirationStatus: { const: "current" },
        auditIdSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
        auditPolicySha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
        auditExpirationStatus: { const: "short-lived" },
      },
    },
    resourceFingerprints: {
      type: "object",
      additionalProperties: false,
      required: [
        "pages",
        "api",
        "llm",
        "postgres",
        "postgresRole",
        "r2",
        "previewEnvironmentGroup",
        "legacyPagesDeployment",
        "productionPages",
        "productionServices",
        "productionPostgres",
        "productionR2",
        "productionEnvironmentGroups",
      ],
      properties: {
        pages: { type: "string", pattern: "^[0-9a-f]{64}$" },
        api: { type: "string", pattern: "^[0-9a-f]{64}$" },
        llm: { type: "string", pattern: "^[0-9a-f]{64}$" },
        postgres: { type: "string", pattern: "^[0-9a-f]{64}$" },
        postgresRole: { type: "string", pattern: "^[0-9a-f]{64}$" },
        r2: { type: "string", pattern: "^[0-9a-f]{64}$" },
        previewEnvironmentGroup: { type: "string", pattern: "^[0-9a-f]{64}$" },
        legacyPagesDeployment: { type: "string", pattern: "^[0-9a-f]{64}$" },
        productionPages: { type: "string", pattern: "^[0-9a-f]{64}$" },
        productionServices: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          uniqueItems: true,
          items: { type: "string", pattern: "^[0-9a-f]{64}$" },
        },
        productionPostgres: { type: "string", pattern: "^[0-9a-f]{64}$" },
        productionR2: { type: "string", pattern: "^[0-9a-f]{64}$" },
        productionEnvironmentGroups: {
          type: "array",
          minItems: 0,
          uniqueItems: true,
          items: { type: "string", pattern: "^[0-9a-f]{64}$" },
        },
      },
    },
    deployments: {
      type: "object",
      additionalProperties: false,
      required: ["pages", "api", "llm", "legacy"],
      properties: {
        pages: { $ref: "#/$defs/pagesDeployment" },
        api: { $ref: "#/$defs/renderDeployment" },
        llm: { $ref: "#/$defs/renderDeployment" },
        legacy: { $ref: "#/$defs/legacyDeployment" },
      },
    },
    bindings: {
      type: "object",
      additionalProperties: false,
      required: ["postgres", "r2"],
      properties: {
        postgres: { $ref: "#/$defs/binding" },
        r2: { $ref: "#/$defs/binding" },
      },
    },
    controls: {
      type: "object",
      additionalProperties: false,
      required: [
        "pagesAutomaticDeploysDisabled",
        "apiAutomaticDeploysDisabled",
        "llmAutomaticDeploysDisabled",
        "pagesV2BuildConfigured",
        "apiPythonConfigured",
        "llmProbeConfigured",
        "applicationDeploymentsAligned",
        "resourceIsolationVerified",
        "productionUnchanged",
        "phase0IdentitiesLocked",
        "prePushBaselineVerified",
        "r2PoliciesVerified",
      ],
      properties: {
        pagesAutomaticDeploysDisabled: { const: true },
        apiAutomaticDeploysDisabled: { const: true },
        llmAutomaticDeploysDisabled: { const: true },
        pagesV2BuildConfigured: { const: true },
        apiPythonConfigured: { const: true },
        llmProbeConfigured: { const: true },
        applicationDeploymentsAligned: { const: true },
        resourceIsolationVerified: { const: true },
        productionUnchanged: { const: true },
        phase0IdentitiesLocked: { const: true },
        prePushBaselineVerified: { const: true },
        r2PoliciesVerified: { const: true },
      },
    },
  },
  $defs: {
    governance: {
      type: "object",
      additionalProperties: false,
      required: ["operator", "budgetOwner", "dataResetOwner", "destroyOwner", "reviewDate"],
      properties: {
        operator: { const: "Gary" },
        budgetOwner: { const: "Gary" },
        dataResetOwner: { const: "Gary" },
        destroyOwner: { const: "Gary" },
        reviewDate: { const: "2026-07-29" },
      },
    },
    pagesDeployment: {
      type: "object",
      additionalProperties: false,
      required: ["provider", "status", "commit"],
      properties: {
        provider: { const: "cloudflare-pages" },
        status: { const: "ready" },
        commit: { type: "string", pattern: "^[0-9a-f]{40}$" },
      },
    },
    renderDeployment: {
      type: "object",
      additionalProperties: false,
      required: ["provider", "status", "commit"],
      properties: {
        provider: { const: "render" },
        status: { const: "ready" },
        commit: { type: "string", pattern: "^[0-9a-f]{40}$" },
      },
    },
    legacyDeployment: {
      type: "object",
      additionalProperties: false,
      required: ["provider", "status", "commit", "branch", "aliasSha256"],
      properties: {
        provider: { const: "cloudflare-pages" },
        status: { const: "ready" },
        commit: { const: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
        branch: { const: "legacy-compat" },
        aliasSha256: { const: APPROVED_LEGACY_PAGES_ALIAS_SHA256 },
      },
    },
    binding: {
      type: "object",
      additionalProperties: false,
      required: ["status", "isolated"],
      properties: {
        status: { const: "ready" },
        isolated: { const: true },
      },
    },
  },
};

export const APPROVED_PHASE1_ACCEPTANCE_MANIFEST = {
  schemaVersion: 1,
  phase: 1,
  systemSurfaces: SYSTEM_SURFACES,
  mutations: PHASE1_MUTATIONS.map(([id, surfaceId]) => ({ id, surfaceId })),
  recoveryStates: RECOVERY_STATES,
  gates: phase1Gates,
  targetGateCount: 82,
  activatedPhase0FutureStates: ACTIVATED_PHASE0_FUTURE_STATES,
  activatedPhase0FutureStateCount: 6,
  baseVisualCaseCount: 48,
  evidenceOutputs: EVIDENCE_OUTPUTS,
  aggregateStatusCeiling: "ready-for-review",
};

const timestamps = [
  { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
];
const uuidPrimaryKey = { name: "id", type: "uuid", nullable: false, primaryKey: true };
const userForeignKey = {
  name: "user_id",
  type: "uuid",
  nullable: false,
  references: "users.id",
  onDelete: "cascade",
};

export const APPROVED_PHASE1_SCHEMA_CONTRACT = {
  schemaVersion: 1,
  owner: "alembic",
  postgresMajor: 18,
  metadataTable: "alembic_version",
  applicationTables: [
    {
      name: "users",
      columns: [
        uuidPrimaryKey,
        { name: "email", type: "varchar(320)", nullable: false },
        { name: "normalized_email", type: "varchar(320)", nullable: false },
        { name: "password_hash", type: "text", nullable: true },
        { name: "display_name", type: "varchar(120)", nullable: false },
        { name: "status", type: "varchar(24)", nullable: false, default: "active" },
        { name: "email_verified_at", type: "timestamptz", nullable: true },
        ...timestamps,
      ],
      unique: [["normalized_email"]],
      indexes: [
        { name: "ix_users_status", columns: ["status"], unique: false },
      ],
      checks: ["status IN ('active','disabled','pending')"],
    },
    {
      name: "user_identities",
      columns: [
        uuidPrimaryKey,
        userForeignKey,
        { name: "provider", type: "varchar(24)", nullable: false },
        { name: "subject", type: "varchar(255)", nullable: false },
        { name: "linked_email", type: "varchar(320)", nullable: true },
        ...timestamps,
      ],
      unique: [["provider", "subject"]],
      indexes: [
        { name: "ix_user_identities_user_id", columns: ["user_id"], unique: false },
      ],
      checks: ["provider IN ('local','google')"],
    },
    {
      name: "sessions",
      columns: [
        uuidPrimaryKey,
        userForeignKey,
        { name: "token_hash", type: "char(64)", nullable: false },
        { name: "csrf_hash", type: "char(64)", nullable: false },
        { name: "expires_at", type: "timestamptz", nullable: false },
        { name: "last_seen_at", type: "timestamptz", nullable: false },
        { name: "revoked_at", type: "timestamptz", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
      ],
      unique: [["token_hash"]],
      indexes: [
        { name: "ix_sessions_user_id", columns: ["user_id"], unique: false },
        { name: "ix_sessions_expires_at", columns: ["expires_at"], unique: false },
      ],
      checks: ["expires_at > created_at"],
    },
    {
      name: "auth_challenges",
      columns: [
        uuidPrimaryKey,
        { ...userForeignKey, nullable: true, onDelete: "set null" },
        { name: "kind", type: "varchar(32)", nullable: false },
        { name: "token_hash", type: "char(64)", nullable: false },
        { name: "state_hash", type: "char(64)", nullable: true },
        { name: "nonce_hash", type: "char(64)", nullable: true },
        { name: "pkce_verifier_ciphertext", type: "bytea", nullable: true },
        { name: "pkce_key_id", type: "varchar(64)", nullable: true },
        { name: "redirect_path", type: "varchar(512)", nullable: true },
        { name: "expires_at", type: "timestamptz", nullable: false },
        { name: "consumed_at", type: "timestamptz", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
      ],
      unique: [["kind", "token_hash"]],
      indexes: [
        { name: "ix_auth_challenges_expires_at", columns: ["expires_at"], unique: false },
        { name: "ix_auth_challenges_user_id", columns: ["user_id"], unique: false },
      ],
      checks: [
        "kind IN ('pre_auth_csrf','password_reset','email_verification','google_oauth')",
        "((kind = 'google_oauth' AND consumed_at IS NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NOT NULL AND pkce_key_id IS NOT NULL) OR (kind = 'google_oauth' AND consumed_at IS NOT NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL) OR (kind <> 'google_oauth' AND state_hash IS NULL AND nonce_hash IS NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL))",
      ],
    },
    {
      name: "preferences",
      columns: [
        { ...userForeignKey, primaryKey: true },
        { name: "theme", type: "varchar(16)", nullable: false, default: "system" },
        { name: "language", type: "varchar(16)", nullable: false, default: "zh-CN" },
        { name: "version", type: "integer", nullable: false, default: 1 },
        { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
      ],
      unique: [],
      indexes: [],
      checks: [
        "theme IN ('light','dark','system')",
        "language IN ('zh-CN','en')",
        "version > 0",
      ],
    },
    {
      name: "notifications",
      columns: [
        uuidPrimaryKey,
        userForeignKey,
        { name: "kind", type: "varchar(48)", nullable: false },
        { name: "title", type: "varchar(200)", nullable: false },
        { name: "body", type: "text", nullable: false },
        { name: "read_at", type: "timestamptz", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
      ],
      unique: [],
      indexes: [
        { name: "ix_notifications_user_created", columns: ["user_id", "created_at"], unique: false },
        { name: "ix_notifications_user_read", columns: ["user_id", "read_at"], unique: false },
      ],
      checks: [],
    },
    {
      name: "plan_tasks",
      columns: [
        uuidPrimaryKey,
        userForeignKey,
        { name: "title", type: "varchar(240)", nullable: false },
        { name: "status", type: "varchar(24)", nullable: false, default: "open" },
        { name: "sort_order", type: "integer", nullable: false, default: 0 },
        { name: "version", type: "integer", nullable: false, default: 1 },
        { name: "completed_at", type: "timestamptz", nullable: true },
        ...timestamps,
      ],
      unique: [],
      indexes: [
        { name: "ix_plan_tasks_user_status_order", columns: ["user_id", "status", "sort_order"], unique: false },
      ],
      checks: [
        "status IN ('open','completed')",
        "sort_order >= 0",
        "version > 0",
      ],
    },
    {
      name: "audit_events",
      columns: [
        uuidPrimaryKey,
        { ...userForeignKey, nullable: true, onDelete: "restrict" },
        { name: "event_type", type: "varchar(80)", nullable: false },
        { name: "idempotency_key_hash", type: "char(64)", nullable: true },
        { name: "request_id", type: "varchar(64)", nullable: false },
        { name: "details", type: "jsonb", nullable: false, default: "{}" },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
      ],
      unique: [],
      indexes: [
        { name: "ix_audit_events_user_created", columns: ["user_id", "created_at"], unique: false },
        { name: "ix_audit_events_request_id", columns: ["request_id"], unique: false },
        {
          name: "uq_audit_events_idempotency",
          columns: ["user_id", "event_type", "idempotency_key_hash"],
          unique: true,
          where: "idempotency_key_hash IS NOT NULL",
        },
      ],
      checks: ["idempotency_key_hash IS NULL OR user_id IS NOT NULL"],
    },
    {
      name: "media_objects",
      columns: [
        uuidPrimaryKey,
        userForeignKey,
        { name: "object_key", type: "varchar(512)", nullable: false },
        { name: "content_type", type: "varchar(120)", nullable: false },
        { name: "byte_size", type: "bigint", nullable: false },
        { name: "sha256", type: "char(64)", nullable: false },
        { name: "status", type: "varchar(24)", nullable: false, default: "pending" },
        { name: "deleted_at", type: "timestamptz", nullable: true },
        ...timestamps,
      ],
      unique: [["object_key"]],
      indexes: [
        { name: "ix_media_objects_user_created", columns: ["user_id", "created_at"], unique: false },
        { name: "ix_media_objects_status", columns: ["status"], unique: false },
      ],
      checks: [
        "byte_size > 0",
        "status IN ('pending','ready','deleted','failed')",
      ],
    },
  ],
  pkceVerifierPolicy: {
    storage: "short-lived-encrypted",
    plaintextStored: false,
    destroyOnConsume: true,
    destroyOnExpiry: true,
    expiredRowAction: "delete",
  },
  auditRetentionPolicy: {
    userDeletion: "restrict",
    userLifecycle: "soft-disable-with-status",
    previewDestruction: "governed-full-database-destroy",
  },
  forbiddenTables: [
    "state_json",
    "xp_ledger",
    "coin_ledger",
    "rating_history",
    "league_entries",
    "problems",
    "interview_sessions",
  ],
  forbiddenColumns: ["state_json", "legacy_id", "sqlite_rowid"],
  migrationRoundTrip: ["upgrade-head", "fingerprint", "downgrade-base", "empty", "upgrade-head", "same-fingerprint"],
  sharedPreviewDowngradeAllowed: false,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalEqual = (actual, expected) => (
  JSON.stringify(canonicalize(actual)) === JSON.stringify(canonicalize(expected))
);
const isObject = (value) => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);
const isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
const unique = (values) => new Set(values).size === values.length;
const isSafeRepoRelativePath = (value) => {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return false;
  return path.posix.normalize(value) === value;
};

const verifyTrustedGitBinary = async () => {
  const metadata = await lstat(TRUSTED_GIT_BINARY, { bigint: true });
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${TRUSTED_GIT_BINARY} must be a regular file`);
  }
  if (metadata.uid !== 0n) throw new Error(`${TRUSTED_GIT_BINARY} must be root-owned`);
  if ((metadata.mode & 0o022n) !== 0n) {
    throw new Error(`${TRUSTED_GIT_BINARY} must not be group- or world-writable`);
  }
  if ((metadata.mode & 0o111n) === 0n) throw new Error(`${TRUSTED_GIT_BINARY} must be executable`);
};

const runGit = async (root, args, options = {}) => {
  await verifyTrustedGitBinary();
  const { stdout } = await execFileAsync(TRUSTED_GIT_BINARY, [...TRUSTED_GIT_CONFIG, ...args], {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    env: TRUSTED_GIT_ENV,
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
};

const listFrozenGitEntries = async (root, ref) => {
  const output = await runGit(root, [
    "ls-tree",
    "-r",
    "-t",
    "-z",
    ref,
    "--",
    "docs/browser-audit-screenshots",
    "docs/superpowers/reviews",
  ], { encoding: "buffer" });
  const records = Buffer.from(output).toString("utf8").split("\0").filter(Boolean);
  return records.map((record) => {
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/.exec(record);
    if (!match) throw new Error(`unable to parse git tree record: ${record}`);
    return { mode: match[1], type: match[2], object: match[3], path: match[4] };
  }).filter((entry) => (
    entry.path.startsWith("docs/browser-audit-screenshots/370-frontend-upgrade-")
    || entry.path === PHASE0_ACCEPTED_REVIEW_PATH
  )).sort((left, right) => left.path.localeCompare(right.path));
};

const isNonEmpty370ContainerTree = (entry, entries) => (
  entry.type === "tree"
  && entry.path !== PHASE0_ACCEPTED_REVIEW_PATH
  && entry.path.startsWith("docs/browser-audit-screenshots/370-frontend-upgrade-")
  && entries.some((candidate) => candidate.path.startsWith(`${entry.path}/`))
);

const listFrozenGitIndexEntries = async (root) => {
  const output = await runGit(root, [
    "ls-files",
    "--stage",
    "-z",
    "--",
    "docs/browser-audit-screenshots",
    "docs/superpowers/reviews",
  ], { encoding: "buffer" });
  const records = Buffer.from(output).toString("utf8").split("\0").filter(Boolean);
  return records.map((record) => {
    const match = /^(\d+) ([0-9a-f]+) (\d+)\t([\s\S]+)$/.exec(record);
    if (!match) throw new Error(`unable to parse git index record: ${record}`);
    return {
      mode: match[1],
      object: match[2],
      stage: Number(match[3]),
      path: match[4],
    };
  }).filter((entry) => (
    entry.path.startsWith("docs/browser-audit-screenshots/370-frontend-upgrade-")
    || entry.path === PHASE0_ACCEPTED_REVIEW_PATH
  )).sort((left, right) => (
    left.path.localeCompare(right.path) || left.stage - right.stage
  ));
};

const gitBlob = async (root, object) => {
  const stdout = await runGit(root, ["cat-file", "blob", object], { encoding: "buffer" });
  return Buffer.from(stdout);
};

const directoryMetadata = async (directoryPath) => {
  let metadata;
  try {
    metadata = await lstat(directoryPath, { bigint: true });
  } catch (error) {
    throw new Error(`unsafe ancestor directory ${directoryPath}: ${error.message}`);
  }
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`unsafe ancestor directory ${directoryPath}`);
  }
  return metadata;
};

export async function captureTrustedDirectoryChain(root, relativeDirectory = ".") {
  if (typeof root !== "string" || root.length === 0) throw new Error("root is required");
  if (relativeDirectory !== "." && !isSafeRepoRelativePath(relativeDirectory)) {
    throw new Error(`unsafe repository-relative directory ${String(relativeDirectory)}`);
  }
  const resolvedRoot = path.resolve(root);
  const filesystemRoot = path.parse(resolvedRoot).root;
  const resolvedRootSegments = resolvedRoot
    .slice(filesystemRoot.length)
    .split(path.sep)
    .filter((segment) => segment.length > 0);
  const relativeSegments = relativeDirectory === "." ? [] : relativeDirectory.split("/");
  const entries = [];
  let directoryPath = filesystemRoot;
  entries.push({ path: directoryPath, metadata: await directoryMetadata(directoryPath) });
  for (const segment of [...resolvedRootSegments, ...relativeSegments]) {
    directoryPath = path.join(directoryPath, segment);
    entries.push({ path: directoryPath, metadata: await directoryMetadata(directoryPath) });
  }
  return { root: resolvedRoot, relativeDirectory, entries };
}

export async function assertTrustedDirectoryChainUnchanged(
  snapshot,
  { allowLeafMetadataChange = false } = {},
) {
  if (!isObject(snapshot) || !Array.isArray(snapshot.entries) || snapshot.entries.length === 0) {
    throw new Error("trusted directory snapshot is required");
  }
  const resolvedSnapshotRoot = path.resolve(snapshot.root);
  const currentEntries = [];
  for (const [index, entry] of snapshot.entries.entries()) {
    const current = await directoryMetadata(entry.path);
    const isLeaf = index === snapshot.entries.length - 1;
    const relativeToSnapshotRoot = path.relative(resolvedSnapshotRoot, entry.path);
    const isAtOrWithinSnapshotRoot = relativeToSnapshotRoot === ""
      || (
        relativeToSnapshotRoot !== ".."
        && !relativeToSnapshotRoot.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relativeToSnapshotRoot)
      );
    for (const field of ["dev", "ino", "mode"]) {
      if (entry.metadata[field] !== current[field]) {
        throw new Error(`unsafe ancestor directory changed ${entry.path}`);
      }
    }
    if (isAtOrWithinSnapshotRoot && !(allowLeafMetadataChange && isLeaf)) {
      for (const field of ["mtimeNs", "ctimeNs"]) {
        if (entry.metadata[field] !== current[field]) {
          throw new Error(`unsafe ancestor directory changed ${entry.path}`);
        }
      }
    }
    currentEntries.push({ path: entry.path, metadata: current });
  }
  return { ...snapshot, entries: currentEntries };
}

const securelyReadRegularFile = async (root, relativePath) => {
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is unavailable on this platform");
  }
  if (!isSafeRepoRelativePath(relativePath)) throw new Error("unsafe repository-relative path");
  const resolvedRoot = path.resolve(root);
  const relativeDirectory = path.posix.dirname(relativePath);
  const directorySnapshot = await captureTrustedDirectoryChain(root, relativeDirectory);
  const filePath = path.join(resolvedRoot, relativePath);
  const handle = await open(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new Error("path is not a regular file");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!after.isFile()) throw new Error("path stopped being a regular file while reading");
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) throw new Error("file changed while being read");
    }
    await assertTrustedDirectoryChainUnchanged(directorySnapshot);
    const mode = Number(before.mode & 0o111n) === 0 ? "100644" : "100755";
    return { bytes, mode };
  } finally {
    await handle.close();
  }
};

export async function writeFileAtomicallyWithinTrustedRoot({
  root,
  relativePath,
  data,
  mode = 0o644,
} = {}) {
  if (!isSafeRepoRelativePath(relativePath)) {
    throw new Error(`unsafe repository-relative path ${String(relativePath)}`);
  }
  if (!Number.isInteger(mode) || mode < 0 || mode > 0o777) throw new Error("invalid file mode");
  const relativeDirectory = path.posix.dirname(relativePath);
  let directorySnapshot = await captureTrustedDirectoryChain(root, relativeDirectory);
  const outputPath = path.join(directorySnapshot.root, relativePath);
  const temporaryPath = `${outputPath}.tmp-${randomBytes(16).toString("hex")}`;
  let handle;
  let temporaryCreated = false;
  let renamed = false;
  let failure;
  try {
    handle = await open(temporaryPath, "wx", mode);
    temporaryCreated = true;
    directorySnapshot = await assertTrustedDirectoryChainUnchanged(
      directorySnapshot,
      { allowLeafMetadataChange: true },
    );
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = undefined;
    directorySnapshot = await assertTrustedDirectoryChainUnchanged(directorySnapshot);
    await rename(temporaryPath, outputPath);
    renamed = true;
    await assertTrustedDirectoryChainUnchanged(
      directorySnapshot,
      { allowLeafMetadataChange: true },
    );
  } catch (error) {
    failure = error;
  }
  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      if (!failure) failure = error;
    }
  }
  if (temporaryCreated && !renamed) {
    try {
      await assertTrustedDirectoryChainUnchanged(
        directorySnapshot,
        { allowLeafMetadataChange: true },
      );
      await unlink(temporaryPath);
    } catch (error) {
      if (error.code !== "ENOENT" && !failure) failure = error;
    }
  }
  if (failure) throw failure;
}

const gitIsAncestor = async (root, ancestor, head) => {
  try {
    await runGit(root, ["merge-base", "--is-ancestor", ancestor, head]);
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
};

const assertTrustedRepositoryShape = async (root) => {
  const replaceRefs = String(await runGit(root, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace/",
  ])).trim();
  if (replaceRefs) throw new Error("Git replace refs are forbidden");

  const graftPathValue = String(await runGit(root, ["rev-parse", "--git-path", "info/grafts"])).trim();
  const graftPath = path.isAbsolute(graftPathValue)
    ? graftPathValue
    : path.resolve(root, graftPathValue);
  try {
    await lstat(graftPath);
    throw new Error("Git grafts are forbidden");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const shallow = String(await runGit(root, ["rev-parse", "--is-shallow-repository"])).trim();
  if (shallow !== "false") throw new Error("shallow Git repositories are forbidden");
};

export async function buildPhase0EvidenceLock({
  root,
  acceptedDeploymentCommit = ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  acceptedEvidenceCommit = ACCEPTED_PHASE0_EVIDENCE_COMMIT,
} = {}) {
  if (!root) throw new Error("root is required");
  if (!isSha(acceptedDeploymentCommit) || !isSha(acceptedEvidenceCommit)) {
    throw new Error("accepted commits must be 40-character lowercase Git SHAs");
  }
  await assertTrustedRepositoryShape(root);
  if (!await gitIsAncestor(root, acceptedDeploymentCommit, acceptedEvidenceCommit)) {
    throw new Error("accepted Phase 0 deployment commit is not an ancestor of accepted evidence");
  }
  const frozenEntries = await listFrozenGitEntries(root, acceptedEvidenceCommit);
  // Non-empty 370 trees are traversal containers, not evidence leaves; all descendants stay frozen.
  // Empty trees remain leaves and the exact accepted-review path is never granted this exception.
  const trackedEntries = frozenEntries.filter((entry) => (
    !isNonEmpty370ContainerTree(entry, frozenEntries)
  ));
  if (!trackedEntries.some(({ path }) => path === PHASE0_ACCEPTED_REVIEW_PATH)) {
    throw new Error("accepted Phase 0 review is not tracked at the accepted evidence commit");
  }
  if (!trackedEntries.some(({ path }) => (
    path.startsWith("docs/browser-audit-screenshots/370-frontend-upgrade-")
  ))) {
    throw new Error("no tracked Phase 0 370 evidence exists at the accepted evidence commit");
  }
  const entries = [];
  for (const entry of trackedEntries) {
    if (!isSafeRepoRelativePath(entry.path)) {
      throw new Error(`unsafe tracked Phase 0 evidence path: ${String(entry.path)}`);
    }
    // The accepted review path is never a container exception: it must be one regular blob too.
    if (entry.type !== "blob") {
      throw new Error(
        `tracked Phase 0 evidence is non-blob: ${entry.path} (${entry.type} ${entry.mode})`,
      );
    }
    if (!/^100(?:644|755)$/.test(entry.mode)) {
      throw new Error(`tracked Phase 0 evidence must be a regular file: ${entry.path}`);
    }
    const bytes = await gitBlob(root, entry.object);
    entries.push({
      path: entry.path,
      mode: entry.mode,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  return {
    schemaVersion: 1,
    kind: "frontend-upgrade-phase-0-evidence-lock",
    generatedFrom: "tracked-git-objects",
    acceptedDeploymentCommit,
    acceptedEvidenceCommit,
    acceptedReviewPath: PHASE0_ACCEPTED_REVIEW_PATH,
    entryCount: entries.length,
    entries,
  };
}

export function validatePhase0EvidenceLock(lock = {}) {
  const failures = [];
  if (!isObject(lock)) return ["Phase 0 evidence lock must be an object"];
  const allowedTopLevelKeys = [
    "schemaVersion",
    "kind",
    "generatedFrom",
    "acceptedDeploymentCommit",
    "acceptedEvidenceCommit",
    "acceptedReviewPath",
    "entryCount",
    "entries",
  ];
  for (const key of Object.keys(lock)) {
    if (!allowedTopLevelKeys.includes(key)) failures.push(`Phase 0 evidence lock key ${key} is not approved`);
  }
  if (lock.schemaVersion !== 1) failures.push("Phase 0 evidence lock schemaVersion must be 1");
  if (lock.kind !== "frontend-upgrade-phase-0-evidence-lock") failures.push("Phase 0 evidence lock kind mismatch");
  if (lock.generatedFrom !== "tracked-git-objects") failures.push("Phase 0 evidence lock source mismatch");
  if (!isSha(lock.acceptedDeploymentCommit)) failures.push("Phase 0 deployment commit must be a Git SHA");
  if (!isSha(lock.acceptedEvidenceCommit)) failures.push("Phase 0 evidence commit must be a Git SHA");
  if (lock.acceptedReviewPath !== PHASE0_ACCEPTED_REVIEW_PATH) failures.push("Phase 0 accepted review path mismatch");
  if (!Array.isArray(lock.entries)) return [...failures, "Phase 0 evidence lock entries must be an array"];
  if (lock.entryCount !== lock.entries.length) failures.push("Phase 0 evidence lock entryCount mismatch");
  const paths = lock.entries.map((entry) => entry?.path).filter((value) => typeof value === "string");
  if (!unique(paths)) failures.push("Phase 0 evidence lock contains duplicate paths");
  if (paths.join("\n") !== [...paths].sort().join("\n")) failures.push("Phase 0 evidence lock paths must be sorted");
  if (!paths.includes(PHASE0_ACCEPTED_REVIEW_PATH)) failures.push("Phase 0 evidence lock is missing the accepted review");
  for (const entry of lock.entries) {
    if (!isObject(entry)) {
      failures.push("Phase 0 evidence lock entry must be an object");
      continue;
    }
    const allowedKeys = ["path", "mode", "bytes", "sha256"];
    for (const key of Object.keys(entry)) {
      if (!allowedKeys.includes(key)) failures.push(`Phase 0 evidence lock entry key ${key} is not approved`);
    }
    if (!isSafeRepoRelativePath(entry.path)) {
      failures.push(`unsafe Phase 0 evidence path ${String(entry.path)}`);
    } else if (!(
      entry.path === PHASE0_ACCEPTED_REVIEW_PATH
      || entry.path.startsWith("docs/browser-audit-screenshots/370-frontend-upgrade-")
    )) {
      failures.push(`Phase 0 evidence lock path ${String(entry.path)} is not approved`);
    }
    if (!/^100(?:644|755)$/.test(entry.mode ?? "")) failures.push(`Phase 0 evidence lock mode mismatch for ${entry.path}`);
    if (!Number.isInteger(entry.bytes) || entry.bytes < 0) failures.push(`Phase 0 evidence lock bytes mismatch for ${entry.path}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) failures.push(`Phase 0 evidence lock SHA-256 mismatch for ${entry.path}`);
  }
  return failures;
}

export async function verifyPhase0EvidenceLock({ root, lock, headRef = "HEAD" } = {}) {
  const failures = validatePhase0EvidenceLock(lock);
  if (!(headRef === "HEAD" || isSha(headRef))) {
    failures.push("headRef must be HEAD or a Git SHA");
  }
  if (failures.length > 0 || !root) {
    if (!root) failures.push("root is required to verify Phase 0 evidence lock");
    return failures;
  }
  try {
    await assertTrustedRepositoryShape(root);
  } catch (error) {
    return [`untrusted Git repository: ${error.message}`];
  }
  for (const acceptedCommit of [lock.acceptedDeploymentCommit, lock.acceptedEvidenceCommit]) {
    try {
      if (!await gitIsAncestor(root, acceptedCommit, headRef)) {
        failures.push(`${acceptedCommit} is not an ancestor of ${headRef}`);
      }
    } catch (error) {
      failures.push(`unable to verify ancestor ${acceptedCommit}: ${error.message}`);
    }
  }

  let expectedLock;
  try {
    expectedLock = await buildPhase0EvidenceLock({
      root,
      acceptedDeploymentCommit: lock.acceptedDeploymentCommit,
      acceptedEvidenceCommit: lock.acceptedEvidenceCommit,
    });
    if (!canonicalEqual(lock, expectedLock)) failures.push("Phase 0 evidence lock does not match accepted tracked Git objects");
  } catch (error) {
    failures.push(`unable to rebuild Phase 0 evidence lock: ${error.message}`);
  }

  let headEntries = [];
  try {
    headEntries = await listFrozenGitEntries(root, headRef);
  } catch (error) {
    failures.push(`unable to inspect locked files at ${headRef}: ${error.message}`);
  }
  const headByPath = new Map(headEntries.map((entry) => [entry.path, entry]));
  const lockedPathSet = new Set(lock.entries.map((entry) => entry.path));
  for (const headEntry of headEntries) {
    if (!isSafeRepoRelativePath(headEntry.path)) {
      failures.push(`unsafe tracked Phase 0 path at ${headRef}: ${String(headEntry.path)}`);
    }
    const isUnlockedContainer = (
      isNonEmpty370ContainerTree(headEntry, headEntries)
      && !lockedPathSet.has(headEntry.path)
    );
    if (isUnlockedContainer) continue;
    if (headEntry.type !== "blob") {
      failures.push(
        `non-blob tracked Phase 0 path at ${headRef}: ${headEntry.path} (${headEntry.type} ${headEntry.mode})`,
      );
    } else if (!/^100(?:644|755)$/.test(headEntry.mode)) {
      failures.push(
        `non-regular tracked Phase 0 path at ${headRef}: ${headEntry.path} (${headEntry.mode})`,
      );
    }
    if (!lockedPathSet.has(headEntry.path)) {
      failures.push(`unlocked tracked Phase 0 path at ${headRef}: ${headEntry.path}`);
    }
  }
  let indexEntries = [];
  try {
    indexEntries = await listFrozenGitIndexEntries(root);
  } catch (error) {
    failures.push(`unable to inspect locked files in index: ${error.message}`);
  }
  const stageZeroIndexEntries = indexEntries.filter((entry) => entry.stage === 0);
  const indexByPath = new Map(stageZeroIndexEntries.map((entry) => [entry.path, entry]));
  for (const indexEntry of indexEntries) {
    if (!isSafeRepoRelativePath(indexEntry.path)) {
      failures.push(`unsafe Phase 0 index path ${String(indexEntry.path)}`);
    }
    if (indexEntry.stage !== 0) {
      failures.push(`non-stage-0 Phase 0 index entry: ${indexEntry.path}`);
    }
    if (!/^100(?:644|755)$/.test(indexEntry.mode)) {
      failures.push(`non-regular Phase 0 index path: ${indexEntry.path} (${indexEntry.mode})`);
    }
    if (!lockedPathSet.has(indexEntry.path)) {
      failures.push(`unlocked Phase 0 index path: ${indexEntry.path}`);
    }
  }
  for (const entry of lock.entries) {
    const headEntry = headByPath.get(entry.path);
    if (!headEntry) {
      failures.push(`locked Phase 0 path missing at ${headRef}: ${entry.path}`);
    } else if (headEntry.type !== "blob") {
      failures.push(
        `locked Phase 0 path is non-blob at ${headRef}: ${entry.path} (${headEntry.type} ${headEntry.mode})`,
      );
    } else if (!/^100(?:644|755)$/.test(headEntry.mode)) {
      failures.push(
        `locked Phase 0 path is non-regular at ${headRef}: ${entry.path} (${headEntry.mode})`,
      );
    } else {
      try {
        const bytes = await gitBlob(root, headEntry.object);
        if (headEntry.mode !== entry.mode || bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
          failures.push(`tracked bytes mismatch for locked Phase 0 path ${entry.path}`);
        }
      } catch (error) {
        failures.push(`unable to inspect tracked bytes for ${entry.path}: ${error.message}`);
      }
    }
    const indexEntry = indexByPath.get(entry.path);
    if (!indexEntry) {
      failures.push(`locked Phase 0 path missing from index: ${entry.path}`);
    } else {
      try {
        const bytes = await gitBlob(root, indexEntry.object);
        if (
          indexEntry.mode !== entry.mode
          || bytes.length !== entry.bytes
          || sha256(bytes) !== entry.sha256
        ) failures.push(`index bytes mismatch for locked Phase 0 path ${entry.path}`);
      } catch (error) {
        failures.push(`unable to inspect index bytes for ${entry.path}: ${error.message}`);
      }
    }
    try {
      const { bytes: workspaceBytes, mode: workspaceMode } = await securelyReadRegularFile(
        root,
        entry.path,
      );
      if (
        workspaceMode !== entry.mode
        || workspaceBytes.length !== entry.bytes
        || sha256(workspaceBytes) !== entry.sha256
      ) failures.push(`working-tree bytes mismatch for locked Phase 0 path ${entry.path}`);
    } catch (error) {
      failures.push(`unable to securely read working-tree Phase 0 path ${entry.path}: ${error.message}`);
    }
  }
  return [...new Set(failures)];
}

const FORBIDDEN_EVIDENCE_KEY = /(?:token|secret|password|credential|access.?key|private.?key|dsn|url|origin|endpoint|header|cookie|csrf|oauth|session|user|response.?body|stderr|stack)/i;
const collectSecretShapedKeys = (value, currentPath = "providerSchema", failures = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSecretShapedKeys(item, `${currentPath}[${index}]`, failures));
    return failures;
  }
  if (!isObject(value)) return failures;
  for (const [key, nested] of Object.entries(value)) {
    if (currentPath.endsWith(".properties") && FORBIDDEN_EVIDENCE_KEY.test(key)) {
      failures.push(`provider evidence contains secret-shaped key ${key} at ${currentPath}`);
    }
    collectSecretShapedKeys(nested, `${currentPath}.${key}`, failures);
  }
  return failures;
};

export function validatePhase1ProviderEvidenceRelationships(
  sample = {},
  nowMs = Date.now(),
  { allowExpired = false } = {},
) {
  const failures = [];
  if (!isObject(sample)) return ["provider evidence must be an object"];
  const capturedMs = Date.parse(sample.capturedAt);
  const expiresMs = Date.parse(sample.expiresAt);
  const maximumLifetimeMs = 7 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(capturedMs)) failures.push("capturedAt must be a valid ISO timestamp");
  if (!Number.isFinite(expiresMs)) failures.push("expiresAt must be a valid ISO timestamp");
  if (!Number.isFinite(nowMs)) failures.push("nowMs must be finite");
  if (Number.isFinite(capturedMs) && Number.isFinite(expiresMs)) {
    const lifetimeMs = expiresMs - capturedMs;
    if (lifetimeMs <= 0 || lifetimeMs > maximumLifetimeMs) {
      failures.push("provider evidence lifetime must be greater than zero and at most seven days");
    }
    if (Number.isFinite(nowMs) && capturedMs > nowMs) failures.push("provider evidence is captured in the future");
    if (Number.isFinite(nowMs) && expiresMs < nowMs && !allowExpired) {
      failures.push("provider evidence has expired");
    }
  }

  if (sample.applicationCommit === ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    failures.push("application commit must differ from legacy");
  }
  if (sample.legacyCommit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    failures.push("legacy commit mismatch");
  }
  const deployments = isObject(sample.deployments) ? sample.deployments : {};
  const expectedProviders = {
    pages: "cloudflare-pages",
    api: "render",
    llm: "render",
  };
  for (const [service, provider] of Object.entries(expectedProviders)) {
    if (deployments[service]?.provider !== provider) {
      failures.push(`${service} deployment provider mismatch`);
    }
    if (deployments[service]?.commit !== sample.applicationCommit) {
      failures.push(`${service} application deployment commit mismatch`);
    }
  }
  if (deployments.legacy?.provider !== "cloudflare-pages") {
    failures.push("legacy deployment provider mismatch");
  }
  if (deployments.legacy?.commit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    failures.push("legacy deployment commit mismatch");
  }
  if (deployments.legacy?.branch !== "legacy-compat") {
    failures.push("legacy deployment branch mismatch");
  }
  if (deployments.legacy?.aliasSha256 !== APPROVED_LEGACY_PAGES_ALIAS_SHA256) {
    failures.push("legacy deployment alias fingerprint mismatch");
  }

  const fingerprints = isObject(sample.resourceFingerprints)
    ? sample.resourceFingerprints
    : {};
  const previewFingerprints = [
    fingerprints.pages,
    fingerprints.api,
    fingerprints.llm,
    fingerprints.postgres,
    fingerprints.postgresRole,
    fingerprints.r2,
    fingerprints.previewEnvironmentGroup,
    fingerprints.legacyPagesDeployment,
  ].filter((value) => typeof value === "string");
  const productionServices = Array.isArray(fingerprints.productionServices)
    ? fingerprints.productionServices
    : [];
  const productionEnvironmentGroups = Array.isArray(fingerprints.productionEnvironmentGroups)
    ? fingerprints.productionEnvironmentGroups
    : [];
  const productionFingerprints = [
    fingerprints.productionPages,
    ...productionServices,
    fingerprints.productionPostgres,
    fingerprints.productionR2,
    ...productionEnvironmentGroups,
  ].filter((value) => typeof value === "string");
  const productionSet = new Set(productionFingerprints);
  const overlaps = [...new Set(previewFingerprints.filter((value) => productionSet.has(value)))];
  if (overlaps.length > 0) failures.push("Preview and Production resource fingerprints overlap");
  if (sample.productionControlBefore !== sample.productionControlAfter) {
    failures.push("Production control fingerprints differ");
  }
  for (const [label, value] of [
    ["Phase 0 provider evidence", sample.phase0ProviderEvidenceSha256],
    ["pre-push provider baseline", sample.prePushBaselineSha256],
    ["runtime R2 access identity", sample.r2PolicyAttestations?.runtimeIdSha256],
    ["runtime R2 policy", sample.r2PolicyAttestations?.runtimePolicySha256],
    ["audit access identity", sample.r2PolicyAttestations?.auditIdSha256],
    ["audit access policy", sample.r2PolicyAttestations?.auditPolicySha256],
  ]) {
    if (!/^[0-9a-f]{64}$/.test(value ?? "")) failures.push(`${label} fingerprint mismatch`);
  }
  if (
    sample.r2PolicyAttestations?.runtimeIdSha256
    === sample.r2PolicyAttestations?.auditIdSha256
  ) {
    failures.push("runtime and audit R2 access identities overlap");
  }
  if (sample.r2PolicyAttestations?.runtimeExpirationStatus !== "current") {
    failures.push("runtime R2 access expiration status mismatch");
  }
  if (sample.r2PolicyAttestations?.auditExpirationStatus !== "short-lived") {
    failures.push("audit access expiration status mismatch");
  }
  return [...new Set(failures)];
}

export function validatePhase1ContractSet({
  evidenceLock,
  previewContract,
  providerSchema,
  acceptanceManifest,
  schemaContract,
} = {}) {
  const failures = [...validatePhase0EvidenceLock(evidenceLock)];
  if (evidenceLock?.acceptedDeploymentCommit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    failures.push("Phase 0 accepted deployment commit mismatch");
  }
  if (evidenceLock?.acceptedEvidenceCommit !== ACCEPTED_PHASE0_EVIDENCE_COMMIT) {
    failures.push("Phase 0 accepted evidence commit mismatch");
  }
  if (!canonicalEqual(previewContract, APPROVED_PHASE1_PREVIEW_CONTRACT)) {
    failures.push("Phase 1 preview contract mismatch");
  }
  if (!canonicalEqual(providerSchema, APPROVED_PHASE1_PROVIDER_EVIDENCE_SCHEMA)) {
    failures.push("Phase 1 provider evidence schema mismatch");
  }
  if (!canonicalEqual(acceptanceManifest, APPROVED_PHASE1_ACCEPTANCE_MANIFEST)) {
    failures.push("Phase 1 acceptance manifest mismatch");
  }
  if (!canonicalEqual(schemaContract, APPROVED_PHASE1_SCHEMA_CONTRACT)) {
    failures.push("Phase 1 schema contract mismatch");
  }

  failures.push(...collectSecretShapedKeys(providerSchema));

  const surfaces = Array.isArray(acceptanceManifest?.systemSurfaces)
    ? acceptanceManifest.systemSurfaces
    : [];
  if (surfaces.length !== 8 || !unique(surfaces) || !canonicalEqual(surfaces, SYSTEM_SURFACES)) {
    failures.push("Phase 1 system surfaces must be the eight unique approved surfaces");
  }
  const gates = Array.isArray(acceptanceManifest?.gates) ? acceptanceManifest.gates : [];
  const gateIds = gates.map((gate) => gate?.id).filter((id) => typeof id === "string");
  if (gates.length !== 82 || !unique(gateIds) || gateIds.length !== 82) {
    failures.push("Phase 1 gates must contain 82 unique IDs");
  }
  const futureStates = Array.isArray(acceptanceManifest?.activatedPhase0FutureStates)
    ? acceptanceManifest.activatedPhase0FutureStates
    : [];
  if (futureStates.length !== 6 || !unique(futureStates)) {
    failures.push("Phase 1 must activate six unique Phase 0 future states");
  }
  const outputPaths = Array.isArray(acceptanceManifest?.evidenceOutputs)
    ? acceptanceManifest.evidenceOutputs
    : [];
  for (const outputPath of outputPaths) {
    if (
      typeof outputPath !== "string"
      || /[*?\[\]]/.test(outputPath)
      || outputPath.includes("/370-")
      || !outputPath.includes("/380-frontend-upgrade-phase-1-")
    ) {
      failures.push(`forbidden Phase 1 output namespace: ${String(outputPath)}`);
    }
  }

  const tables = Array.isArray(schemaContract?.applicationTables)
    ? schemaContract.applicationTables
    : [];
  if (tables.length !== 9 || !unique(tables.map((table) => table?.name))) {
    failures.push("Phase 1 schema must contain nine unique application tables");
  }
  const forbiddenTables = new Set(["state_json", ...(schemaContract?.forbiddenTables ?? [])]);
  for (const table of tables) {
    if (forbiddenTables.has(table?.name)) failures.push(`forbidden table ${String(table?.name)} in Phase 1 schema`);
  }
  if (schemaContract?.metadataTable !== "alembic_version") {
    failures.push("Phase 1 schema metadata table must be alembic_version");
  }
  return [...new Set(failures)];
}
