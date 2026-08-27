import { createHash } from "node:crypto";

import {
  PHASE2_LIVE_CHECK_IDS,
  PHASE2_REQUIRED_ANCESTOR_COMMITS,
  PHASE2_RESOURCE_CONTRACT,
} from "./frontend-upgrade-phase2-provider-evidence.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const REMAINING_READ_ONLY_CONTROL_PROVIDERS = Object.freeze([
  "cloudflare",
  "r2",
]);
const TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS = Object.freeze(["render"]);
const TERMINAL_TEMPORARY_CONTROL_PROVIDERS = Object.freeze([
  "postgres",
  "render",
]);
const envelope = (label, details) => ({
  status: "pass",
  environment: "preview",
  productionMutation: false,
  evidenceSha256: digest(`fixture:${label}`),
  details,
});

export const createPhase2CutoverFixtureCredentialRoles = () => ({
  bootstrap: {
    kind: "persistent-provider-admin",
    provider: "postgres",
    privilege: "admin",
    retained: true,
    excludedFromReadOnlyControlAssertions: true,
    identitySha256: digest("fixture:credential:bootstrap"),
  },
  control: {
    kind: "control",
    remainingReadOnlyProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
    terminalTemporaryUnscopedProviders: (
      TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS
    ),
    terminalTemporaryProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
    terminalRevocationRequired: true,
    retainedAfterMutationRevoke: true,
    identitySha256: digest("fixture:credential:control"),
  },
  mutation: {
    kind: "mutation",
    revocable: true,
    identitySha256: digest("fixture:credential:mutation"),
  },
});

export function createPhase2CutoverDryRunFixture({
  expectedCommit,
  overrides = {},
  onAction = () => {},
} = {}) {
  const resources = Object.fromEntries(
    Object.entries(PHASE2_RESOURCE_CONTRACT).map(([key, contract]) => [key, {
      ...contract,
      identitySha256: digest(`fixture:resource:${key}`),
    }]),
  );
  const mutationTokenBindings = Object.fromEntries(
    ["cloudflare", "render", "postgres", "r2"].map((provider) => [provider, {
      identitySha256: digest(`fixture:credential-binding:${provider}`),
      selfIdentityVerified: true,
    }]),
  );
  const postgresIdentity = (kind) => ({
    kind,
    identitySha256: digest(`fixture:postgres-identity:${kind}`),
    roleSha256: digest(`fixture:postgres-role:${kind}`),
    revoked: true,
    roleAbsent: true,
    loginDenied: true,
    evidenceSha256: digest(`fixture:postgres-revocation:${kind}`),
  });
  const postgresIdentities = ["mutation", "restore"].map(postgresIdentity);
  const postgresControlIdentity = postgresIdentity("control");
  const productionAnchor = {
    pagesDeploymentCommit: "1".repeat(40),
    pagesResourceIdentitySha256: resources.productionPages.identitySha256,
    pagesConfigurationSha256: digest("fixture:production:pages-config"),
    pagesSuccessfulDeploymentSetSha256: digest("fixture:production:pages-success-set"),
    pagesEnvironment: "production",
    pagesBranch: "main",
    pagesAutomaticDeploysEnabled: true,
    pagesLive: true,
    candidateCommitChecked: expectedCommit,
    candidateCommitRecordCount: 1,
    candidateCommitSkippedRecordCount: 1,
    candidateCommitStartedRecordCount: 0,
    candidateCommitAliasedRecordCount: 0,
    candidateCommitActiveDeploymentCount: 0,
    services: [
      {
        name: "quantgym-api",
        identitySha256: resources.productionApi.identitySha256,
        configurationSha256: digest("fixture:production:api-config"),
        repository: "garymmmjw/QuantGym",
        branch: "main",
        visibility: "public",
        automaticDeploysEnabled: true,
        liveDeploymentCommit: "2".repeat(40),
        live: true,
      },
      {
        name: "quantgym-llm",
        identitySha256: resources.productionLlm.identitySha256,
        configurationSha256: digest("fixture:production:llm-config"),
        repository: "garymmmjw/QuantGym",
        branch: "main",
        visibility: "public",
        automaticDeploysEnabled: true,
        liveDeploymentCommit: "3".repeat(40),
        live: true,
      },
    ],
    postgresControlSha256: digest("fixture:production:postgres"),
    r2ControlSha256: digest("fixture:production:r2"),
    environmentGroupsControlSha256: digest("fixture:production:environment-groups"),
  };
  const deploymentControls = {
    pagesAutomaticDeploysDisabled: true,
    apiAutomaticDeploysDisabled: true,
    llmAutomaticDeploysDisabled: true,
    evidenceSha256: digest("fixture:preview:auto-deploy-controls"),
  };
  const phase1PreviewAnchor = {
    pagesDeploymentCommit: PHASE2_REQUIRED_ANCESTOR_COMMITS[0],
    apiDeploymentCommit: PHASE2_REQUIRED_ANCESTOR_COMMITS[0],
    llmDeploymentCommit: PHASE2_REQUIRED_ANCESTOR_COMMITS[0],
    llmResourceIdentitySha256: resources.llm.identitySha256,
    llmConfigurationSha256: digest("fixture:preview:llm-config"),
    llmRepository: "garymmmjw/QuantGym",
    llmBranch: "codex/frontend-v2-preview",
    llmVisibility: "internal",
    llmAutomaticDeploysEnabled: false,
    llmLive: true,
    databaseRevision: "0001_phase1_foundation",
  };
  const phase2PreviewAnchor = {
    pagesDeploymentCommit: expectedCommit,
    apiDeploymentCommit: expectedCommit,
    llmDeploymentCommit: PHASE2_REQUIRED_ANCESTOR_COMMITS[0],
    llmResourceIdentitySha256: resources.llm.identitySha256,
    llmConfigurationSha256: digest("fixture:preview:llm-config"),
    llmRepository: "garymmmjw/QuantGym",
    llmBranch: "codex/frontend-v2-preview",
    llmVisibility: "internal",
    llmAutomaticDeploysEnabled: false,
    llmLive: true,
    databaseRevision: "0002_phase2_daily_training",
  };
  const pagesArtifactManifestSha256 = digest("fixture:pages-artifact-manifest");
  const evidenceHeadCommit = "e".repeat(40);
  const restoreTargetResourceSha256 = digest("fixture:restore-target");
  const renderControlCredentialIdentitySha256 = digest(
    "fixture:credential:control:render-oauth",
  );
  const renderControlRevocationEvidenceSha256 = digest(canonicalJson({
    accessDenied: true,
    credentialIdentitySha256: renderControlCredentialIdentitySha256,
    refreshDenied: true,
    revoked: true,
  }));
  const postgresProviderCredentialInventorySha256 = digest(
    "fixture:postgres:provider-credential-inventory",
  );
  const persistentProviderAdmin = {
    retained: true,
    privilege: "admin",
    excludedFromReadOnlyControlAssertions: true,
    identitySha256: digest("fixture:credential:bootstrap"),
    sqlIdentitySha256: digest("fixture:postgres:provider-admin-sql-identity"),
    providerCredentialInventoryUnchanged: true,
    providerCredentialInventorySha256: postgresProviderCredentialInventorySha256,
    evidenceSha256: digest("fixture:postgres:persistent-provider-admin"),
  };
  const contentTables = [{
    name: "alembic_version",
    rowCount: 1,
    rowAggregateSha256: digest("fixture:content:alembic-version"),
  }];
  const contentInventorySha256 = digest(canonicalJson(
    contentTables.map(({ name }) => name),
  ));
  const contentRowCountsSha256 = digest(canonicalJson(
    contentTables.map(({ name, rowCount }) => ({ name, rowCount })),
  ));
  const contentDataAggregateSha256 = digest(canonicalJson(
    contentTables.map(({ name, rowAggregateSha256 }) => ({
      name,
      rowAggregateSha256,
    })),
  ));
  const sourceContentSnapshot = {
    schemaVersion: 2,
    tables: contentTables,
    catalogSections: Object.fromEntries([
      "sequences",
      "extensions",
      "largeObjects",
      "schemas",
      "objects",
      "database",
    ].map((name) => [name, {
      rowCount: name === "schemas" || name === "database" ? 1 : 0,
      aggregateSha256: digest(`fixture:content:${name}`),
    }])),
    inventorySha256: contentInventorySha256,
    rowCountsSha256: contentRowCountsSha256,
    dataAggregateSha256: contentDataAggregateSha256,
    snapshotSha256: digest(canonicalJson({
      dataAggregateSha256: contentDataAggregateSha256,
      inventorySha256: contentInventorySha256,
      rowCountsSha256: contentRowCountsSha256,
      catalogSections: Object.fromEntries([
        "sequences",
        "extensions",
        "largeObjects",
        "schemas",
        "objects",
        "database",
      ].map((name) => [name, {
        rowCount: name === "schemas" || name === "database" ? 1 : 0,
        aggregateSha256: digest(`fixture:content:${name}`),
      }])),
    })),
  };
  const base = {
    kind: "fixture",
    candidateGate: () => {
      onAction("candidateGate");
      return envelope("candidate-gate", {
        repository: "garymmmjw/QuantGym",
        pullRequestNumber: 130,
        branch: "codex/frontend-v2-preview",
        applicationCommit: expectedCommit,
        evidenceHeadCommit,
        localHeadCommit: evidenceHeadCommit,
        remoteHeadCommit: evidenceHeadCommit,
        applicationCommitMessageSha256: digest("fixture:application-message"),
        evidenceCommitMessageSha256: digest("fixture:evidence-message"),
        workflowSha256: digest("fixture:trusted-workflow"),
        ciContractSha256: digest("fixture:trusted-ci-contract"),
        workflowRunIdentitySha256: digest("fixture:trusted-workflow-run"),
        applicationCloudflarePagesSkipDirectivePresent: true,
        evidenceCloudflarePagesSkipDirectivePresent: true,
        evidenceOutputCount: 30,
        evidenceSuccessorOnly: true,
        evidenceHeadCiGreen: true,
        applicationPagesSkipRecordCount: 1,
        evidencePagesSkipRecordCount: 1,
        pagesSkipObservationSha256: digest("fixture:pages-skip-observation"),
        trackedWorktreeClean: true,
        indexClean: true,
        allowedUntrackedOnly: true,
        requiredAncestorCommits: [...PHASE2_REQUIRED_ANCESTOR_COMMITS],
        allRequiredAncestorsPresent: true,
        pullRequestState: "open",
        pullRequestDraft: true,
        pullRequestMerged: false,
        pullRequestHeadCommit: evidenceHeadCommit,
      });
    },
    preflight: () => {
      onAction("preflight");
      return envelope("preflight", {
        candidateCommit: expectedCommit,
        capabilitiesReady: true,
        toolchainReady: true,
        controlDatabaseReadOnly: true,
        previewR2RunPrefixEmpty: true,
        mutationR2RunPrefixEmpty: true,
        frontendBuildPassed: true,
        localDowngradeGatePassed: true,
        proxyLoopback: true,
        proxyIdentitySha256: digest("fixture:loopback-proxy"),
        remainingReadOnlyControlProofs: {
          cloudflare: {
            accountBound: true,
            providerScopeReadOnly: true,
            evidenceSha256: digest("fixture:control:cloudflare"),
          },
          r2: {
            policyBucketBound: true,
            policyReadOnly: true,
            previewReadSucceeded: true,
            previewWriteDenied: true,
            productionAccessDenied: true,
            evidenceSha256: digest("fixture:control:r2"),
          },
        },
        terminalTemporaryControl: {
          providers: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
          unscopedProviders: TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
          terminalRevocationRequired: true,
          postgres: {
            applicationDmlDenied: true,
            ddlDenied: true,
            largeObjectCreationDenied: true,
            selectSucceeded: true,
            sqlManagedTemporaryRole: true,
            transactionReadOnly: true,
            finalDropRequired: true,
            providerCredentialInventoryUnchanged: true,
            providerCredentialInventorySha256: (
              postgresProviderCredentialInventorySha256
            ),
            persistentProviderAdmin,
            evidenceSha256: digest("fixture:control:postgres"),
          },
          renderCredentialIdentitySha256: (
            renderControlCredentialIdentitySha256
          ),
        },
        mutationTokenBindings,
      });
    },
    inspectTopology: ({ point }) => {
      onAction(`inspectTopology:${point}`);
      return envelope(`topology:${point}`, {
        resources,
        productionAnchor,
        previewAnchor: point === "before" ? phase1PreviewAnchor : phase2PreviewAnchor,
        deploymentControls,
      });
    },
    backup: () => {
      onAction("backup");
      return envelope("backup", {
        backupSha256: digest("fixture:backup"),
        sourceResourceSha256: resources.postgres.identitySha256,
        sourceRevision: "0001_phase1_foundation",
        sourceSchemaSha256: digest("fixture:schema:0001"),
        sourceContentSnapshot,
      });
    },
    proveRestore: () => {
      onAction("proveRestore");
      return envelope("restore", {
        backupSha256: digest("fixture:backup"),
        sourceResourceSha256: resources.postgres.identitySha256,
        targetResourceSha256: restoreTargetResourceSha256,
        sourceRevision: "0001_phase1_foundation",
        sourceSchemaSha256: digest("fixture:schema:0001"),
        sourceContentSnapshot,
      });
    },
    destroyRestoreTarget: ({ restore } = {}) => {
      onAction("destroyRestoreTarget");
      if (
        restore !== undefined
        && restore?.targetResourceSha256 !== restoreTargetResourceSha256
      ) throw new Error("fixture restore target binding mismatch");
      return envelope("restore-target-destroy", {
        targetResourceSha256: restoreTargetResourceSha256,
        destroyed: true,
        absentAfterDestroy: true,
        restoreIdentitySha256: postgresIdentities[1].identitySha256,
        restoreRoleSha256: postgresIdentities[1].roleSha256,
        restoreRoleAbsent: true,
        restoreLoginDenied: true,
      });
    },
    migrate: () => {
      onAction("migrate");
      return envelope("migration", {
        direction: "upgrade",
        fromRevision: "0001_phase1_foundation",
        toRevision: "0002_phase2_daily_training",
        sourceSchemaSha256: digest("fixture:schema:0001"),
        targetSchemaSha256: digest("fixture:schema:0002"),
        roundTripSchemaSha256: digest("fixture:schema:0002"),
        localDowngradeGatePassed: true,
        providerDowngradeExecuted: false,
      });
    },
    deployApi: () => {
      onAction("deployApi");
      return envelope("api-deploy", {
        commit: expectedCommit,
        resourceIdentitySha256: resources.api.identitySha256,
      });
    },
    deployPages: () => {
      onAction("deployPages");
      return envelope("pages-deploy", {
        commit: expectedCommit,
        resourceIdentitySha256: resources.pages.identitySha256,
        artifactManifestSha256: pagesArtifactManifestSha256,
      });
    },
    seedAcceptanceData: () => {
      onAction("seedAcceptanceData");
      return envelope("seed", {
        rightsLabelled: true,
        syntheticOnly: true,
        catalogSha256: digest("fixture:rights-labelled-catalog"),
        actorSha256: digest("fixture:synthetic-actor"),
      });
    },
    runLiveChecks: () => {
      onAction("runLiveChecks");
      return envelope("live-checks", {
        checks: PHASE2_LIVE_CHECK_IDS.map((id) => ({
          id,
          status: "pass",
          evidenceSha256: digest(`fixture:live:${id}`),
          ...(id === "deployed-visual" || id === "deployed-bundle"
            ? { deploymentCommit: expectedCommit }
            : {}),
          ...(id === "deployed-bundle"
            ? { artifactManifestSha256: pagesArtifactManifestSha256 }
            : {}),
        })),
      });
    },
    cleanup: () => {
      onAction("cleanup");
      return envelope("cleanup", {
        syntheticApplicationRows: 0,
        syntheticR2Objects: 0,
        syntheticCatalogRows: 0,
      });
    },
    revokeTemporaryAccess: () => {
      onAction("revokeTemporaryAccess");
      return envelope("revoke", {
        cloudflareRevoked: true,
        renderRevoked: true,
        postgresRevoked: true,
        r2Revoked: true,
        mutationCredentialsRevoked: true,
        controlIdentityRetained: true,
        postgresControlRevocationPending: true,
        renderControlRevocationPending: true,
        postgresProviderCredentialInventoryUnchanged: true,
        postgresProviderCredentialInventorySha256: (
          postgresProviderCredentialInventorySha256
        ),
        remainingReadOnlyControlProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryControlProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalRevocationRequired: true,
        terminalRevocationPending: true,
        renderControlCredentialIdentitySha256,
        revokedMutationTokenBindings: mutationTokenBindings,
        postgresIdentities,
      });
    },
    verifyPostRevokeContinuity: async (context = {}) => {
      onAction("verifyPostRevokeContinuity");
      const continuityObservedAt = context.terminalStepStartedAt
        ?? "2026-07-27T01:59:00.000Z";
      const continuityObservationCompletedAt = continuityObservedAt;
      const renderTopologyObservation = {
        observedAt: continuityObservedAt,
        timing: "before-terminal-control-revocation",
        reobservedAfterTerminalRevocation: false,
      };
      const cloudflareEvidenceSha256 = digest(canonicalJson({
        previewPagesDeploymentCommit: phase2PreviewAnchor.pagesDeploymentCommit,
        productionPagesDeploymentCommit: productionAnchor.pagesDeploymentCommit,
        previewPagesIdentitySha256: resources.pages.identitySha256,
        productionPagesIdentitySha256: resources.productionPages.identitySha256,
        previewR2IdentitySha256: resources.r2.identitySha256,
        productionR2IdentitySha256: resources.productionR2.identitySha256,
      }));
      const sustainableControlRevalidationBasis = {
        status: "pass",
        checkedAt: continuityObservedAt,
        completedAt: continuityObservedAt,
        cloudflareTopologyUnchanged: true,
        pullRequestUnchanged: true,
        previewApiLive: true,
        previewDatabaseRevisionUnchanged: true,
        previewR2ContinuityUnchanged: true,
        githubReadOnly: true,
        publicApiUnauthenticated: true,
        postgresBootstrapAdminUsed: true,
        postgresBootstrapAdminExcludedFromReadOnlyAssertions: true,
        renderTopologyReobserved: false,
        renderTopologyBasis: "pre-terminal-revocation-observation",
        cloudflareEvidenceSha256,
        pullRequestEvidenceSha256: digest("fixture:post-revoke:pull-request"),
        previewApiEvidenceSha256: digest("fixture:post-revoke:api"),
        previewDatabaseEvidenceSha256: digest("fixture:post-revoke:database"),
        previewR2EvidenceSha256: digest("fixture:post-revoke:r2"),
      };
      const sustainableControlRevalidation = {
        ...sustainableControlRevalidationBasis,
        evidenceSha256: digest(canonicalJson(sustainableControlRevalidationBasis)),
      };
      const postRevokeReceipt = envelope("post-revoke-continuity", {
        continuityObservedAt,
        continuityObservationCompletedAt,
        resources,
        productionAnchor,
        previewAnchor: phase2PreviewAnchor,
        pullRequest: {
          repository: "garymmmjw/QuantGym",
          number: 130,
          state: "open",
          draft: true,
          merged: false,
          headCommit: evidenceHeadCommit,
          evidenceSha256: digest("fixture:post-revoke:pull-request"),
        },
        previewApi: {
          resourceIdentitySha256: resources.api.identitySha256,
          deploymentCommit: expectedCommit,
          live: true,
          evidenceSha256: digest("fixture:post-revoke:api"),
        },
        previewDatabase: {
          resourceIdentitySha256: resources.postgres.identitySha256,
          revision: "0002_phase2_daily_training",
          readSucceeded: true,
          evidenceSha256: digest("fixture:post-revoke:database"),
        },
        previewR2: {
          resourceIdentitySha256: resources.r2.identitySha256,
          readSucceeded: true,
          policyBucketBound: true,
          policyReadOnly: true,
          writeDenied: true,
          productionAccessDenied: true,
          mutationAttempted: false,
          evidenceSha256: digest("fixture:post-revoke:r2"),
        },
        renderControlRevoked: true,
        renderControlAccessDenied: true,
        renderControlRefreshDenied: true,
        renderControlCredentialIdentitySha256,
        renderControlRevocationEvidenceSha256,
        postgresControlRevokedAfterContinuity: true,
        postgresControlIdentity,
        postgresProviderCredentialInventoryUnchanged: true,
        postgresProviderCredentialInventorySha256: (
          postgresProviderCredentialInventorySha256
        ),
        persistentProviderAdmin,
        remainingReadOnlyControlProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryControlProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalTemporaryControlCredentialsRevoked: true,
        remainingControlCredentialsReadOnly: true,
        runtimeIdentitiesUnchanged: true,
        renderTopologyObservation,
        sustainableControlRevalidation,
      });
      if (
        typeof context.stageTerminalIntent === "function"
        && typeof context.completeTerminalIntent === "function"
      ) {
        const basis = structuredClone(postRevokeReceipt.details);
        for (const key of [
          "renderControlRevoked",
          "renderControlAccessDenied",
          "renderControlRefreshDenied",
          "renderControlRevocationEvidenceSha256",
          "postgresControlRevokedAfterContinuity",
          "postgresControlIdentity",
          "terminalTemporaryControlCredentialsRevoked",
          "sustainableControlRevalidation",
        ]) delete basis[key];
        await context.stageTerminalIntent(basis);
        await context.completeTerminalIntent(postRevokeReceipt);
      }
      return postRevokeReceipt;
    },
    inspectPullRequest: () => {
      onAction("inspectPullRequest");
      return envelope("pull-request", {
        repository: "garymmmjw/QuantGym",
        number: 130,
        state: "open",
        draft: true,
        merged: false,
        headCommit: evidenceHeadCommit,
      });
    },
    recoverCleanup: () => {
      onAction("recoverCleanup");
      return envelope("recovery:cleanup", {
        syntheticApplicationRows: 0,
        syntheticR2Objects: 0,
        syntheticCatalogRows: 0,
      });
    },
    rollbackPages: () => {
      onAction("rollbackPages");
      return envelope("recovery:pages", {
        commit: phase1PreviewAnchor.pagesDeploymentCommit,
        resourceIdentitySha256: resources.pages.identitySha256,
      });
    },
    rollbackApi: () => {
      onAction("rollbackApi");
      return envelope("recovery:api", {
        commit: phase1PreviewAnchor.apiDeploymentCommit,
        resourceIdentitySha256: resources.api.identitySha256,
      });
    },
    restorePreviewDatabase: () => {
      onAction("restorePreviewDatabase");
      return envelope("recovery:database", {
        backupSha256: digest("fixture:backup"),
        sourceResourceSha256: resources.postgres.identitySha256,
        restoredRevision: "0001_phase1_foundation",
        restoredSchemaSha256: digest("fixture:schema:0001"),
        restoredContentSnapshot: sourceContentSnapshot,
      });
    },
    verifyRecovery: ({ expectedPreviewAnchor } = {}) => {
      onAction("verifyRecovery");
      return envelope("recovery:verify", {
        resources,
        productionAnchor,
        previewAnchor: expectedPreviewAnchor ?? phase1PreviewAnchor,
        syntheticApplicationRows: 0,
        syntheticR2Objects: 0,
        syntheticCatalogRows: 0,
      });
    },
    emergencyRevoke: () => {
      onAction("emergencyRevoke");
      return envelope("recovery:emergency-revoke", {
        cloudflareRevoked: true,
        renderRevoked: true,
        postgresRevoked: true,
        r2Revoked: true,
        mutationCredentialsRevoked: true,
        controlIdentityRetained: true,
        postgresControlRevocationPending: true,
        renderControlRevocationPending: true,
        postgresProviderCredentialInventoryUnchanged: true,
        postgresProviderCredentialInventorySha256: (
          postgresProviderCredentialInventorySha256
        ),
        remainingReadOnlyControlProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryControlProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalRevocationRequired: true,
        terminalRevocationPending: true,
        renderControlCredentialIdentitySha256,
        revokedMutationTokenBindings: mutationTokenBindings,
        postgresIdentities,
      });
    },
  };
  return Object.assign(base, overrides);
}

export function createPhase2CutoverFixtureClock(
  start = "2026-07-27T01:59:00.000Z",
) {
  let milliseconds = Date.parse(start);
  if (!Number.isFinite(milliseconds)) throw new Error("fixture clock start is invalid");
  return () => {
    const value = new Date(milliseconds);
    milliseconds += 1_000;
    return value;
  };
}
