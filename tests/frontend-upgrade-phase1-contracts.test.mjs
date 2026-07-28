import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  ACCEPTED_PHASE0_EVIDENCE_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  APPROVED_PHASE1_PREVIEW_CONTRACT,
  APPROVED_PHASE1_PROVIDER_EVIDENCE_SCHEMA,
  APPROVED_PHASE1_SCHEMA_CONTRACT,
  PHASE0_ACCEPTED_REVIEW_PATH,
  PHASE0_EVIDENCE_LOCK_PATH,
  PHASE1_PRE_PUSH_BASELINE_PATH_TEMPLATE,
  PHASE1_PROVIDER_EVIDENCE_ARCHIVE_PATH_TEMPLATE,
  assertTrustedDirectoryChainUnchanged,
  buildPhase0EvidenceLock,
  captureTrustedDirectoryChain,
  validatePhase0EvidenceLock,
  validatePhase1ContractSet,
  validatePhase1ProviderEvidenceRelationships,
  verifyPhase0EvidenceLock,
  writeFileAtomicallyWithinTrustedRoot,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalTmpRoot = await realpath(os.tmpdir());
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);
const clone = (value) => structuredClone(value);
const fingerprint = (label) => createHash("sha256").update(label).digest("hex");
const runGit = (cwd, args, { input } = {}) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  input,
  stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
}).trim();
const createPhase0GitFixture = async (prefix, t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, prefix));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  const artifactPath = path.join(
    fixture,
    "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json",
  );
  await writeFile(artifactPath, "baseline\n");
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "accepted"]);
  return {
    fixture,
    artifactPath,
    acceptedCommit: runGit(fixture, ["rev-parse", "HEAD"]),
  };
};

const replaceGitTreeEntry = (cwd, treeish, { mode, type, object, name }) => {
  const records = runGit(cwd, ["ls-tree", treeish])
    .split("\n")
    .filter((record) => record.length > 0 && !record.endsWith(`\t${name}`));
  records.push(`${mode} ${type} ${object}\t${name}`);
  return runGit(cwd, ["mktree"], { input: `${records.join("\n")}\n` });
};

const checkedIn = await Promise.all([
  readJson("docs/frontend-upgrade/phase-0-evidence-lock.json"),
  readJson("docs/frontend-upgrade/phase-1-preview-contract.json"),
  readJson("docs/frontend-upgrade/phase-1-provider-evidence.schema.json"),
  readJson("docs/frontend-upgrade/phase-1-acceptance-manifest.json"),
  readJson("docs/frontend-upgrade/phase-1-schema-contract.json"),
]);
const [evidenceLock, previewContract, providerSchema, acceptanceManifest, schemaContract] = checkedIn;

const checkedInContractSet = () => ({
  evidenceLock: clone(evidenceLock),
  previewContract: clone(previewContract),
  providerSchema: clone(providerSchema),
  acceptanceManifest: clone(acceptanceManifest),
  schemaContract: clone(schemaContract),
});

test("checked-in Phase 1 contracts match the approved contract set exactly", () => {
  assert.deepEqual(previewContract, APPROVED_PHASE1_PREVIEW_CONTRACT);
  assert.deepEqual(providerSchema, APPROVED_PHASE1_PROVIDER_EVIDENCE_SCHEMA);
  assert.deepEqual(acceptanceManifest, APPROVED_PHASE1_ACCEPTANCE_MANIFEST);
  assert.deepEqual(schemaContract, APPROVED_PHASE1_SCHEMA_CONTRACT);
  assert.deepEqual(validatePhase1ContractSet(checkedInContractSet()), []);
});

test("locks the two accepted Phase 0 commits and exact Preview identities", () => {
  assert.equal(evidenceLock.acceptedDeploymentCommit, ACCEPTED_PHASE0_DEPLOYMENT_COMMIT);
  assert.equal(evidenceLock.acceptedEvidenceCommit, ACCEPTED_PHASE0_EVIDENCE_COMMIT);
  assert.equal(evidenceLock.acceptedReviewPath, PHASE0_ACCEPTED_REVIEW_PATH);
  assert.equal(previewContract.branch, "codex/frontend-v2-preview");
  assert.deepEqual(previewContract.resources, {
    pagesProject: "quantgym-v2-preview",
    apiService: "quantgym-v2-preview-api",
    llmService: "quantgym-v2-preview-llm",
    postgres: "quantgym-v2-preview-postgres",
    r2Bucket: "quantgym-v2-preview-media",
    legacyPagesBranch: "legacy-compat",
    legacyPagesAlias: "legacy-compat.quantgym-v2-preview.pages.dev",
  });
  assert.deepEqual(previewContract.governance, {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  });
  assert.equal(previewContract.topology.browserApiBase, "/api/v2");
  assert.equal(previewContract.topology.browserDirectUpstreamAllowed, false);
  assert.equal(previewContract.postgresMajor, 18);
  assert.equal(previewContract.commits.legacyCommit, ACCEPTED_PHASE0_DEPLOYMENT_COMMIT);
  assert.equal(previewContract.commits.applicationCommitSource, "provider-evidence.applicationCommit");
  assert.equal(previewContract.commits.applicationCommitMustDifferFromLegacy, true);
  assert.equal(
    previewContract.evidence.prePushBaselineStrategy,
    "immutable-per-application-commit",
  );
  assert.equal(
    previewContract.evidence.prePushBaselinePathTemplate,
    PHASE1_PRE_PUSH_BASELINE_PATH_TEMPLATE,
  );
  assert.equal(
    previewContract.evidence.supersededProviderEvidencePathTemplate,
    PHASE1_PROVIDER_EVIDENCE_ARCHIVE_PATH_TEMPLATE,
  );
  assert.equal(previewContract.evidence.productionControlContinuityRequired, true);
  assert.ok(providerSchema.required.includes("postgresMajor"));
  assert.equal(providerSchema.properties.postgresMajor.const, 18);
  assert.ok(providerSchema.required.includes("applicationCommit"));
  assert.ok(providerSchema.required.includes("legacyCommit"));
  assert.equal(
    providerSchema.properties.legacyCommit.const,
    ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  );
  assert.equal(schemaContract.postgresMajor, 18);
});

test("provider evidence locks governance, legacy deployment, controls, and isolation fingerprints", () => {
  assert.equal(
    APPROVED_LEGACY_PAGES_ALIAS_SHA256,
    fingerprint("legacy-compat.quantgym-v2-preview.pages.dev"),
  );
  assert.ok(providerSchema.required.includes("governance"));
  assert.ok(providerSchema.required.includes("controls"));
  assert.deepEqual(providerSchema.properties.governance.$ref, "#/$defs/governance");
  assert.ok(providerSchema.properties.deployments.required.includes("legacy"));
  assert.deepEqual(providerSchema.properties.deployments.properties.legacy, {
    $ref: "#/$defs/legacyDeployment",
  });
  assert.deepEqual(providerSchema.properties.controls.required, [
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
  ]);
  for (const key of providerSchema.properties.controls.required) {
    assert.equal(providerSchema.properties.controls.properties[key].const, true);
  }
  assert.deepEqual(providerSchema.properties.resourceFingerprints.required, [
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
  ]);
  assert.deepEqual(
    providerSchema.properties.resourceFingerprints.properties.productionServices,
    {
      type: "array",
      minItems: 2,
      maxItems: 2,
      uniqueItems: true,
      items: { type: "string", pattern: "^[0-9a-f]{64}$" },
    },
  );
  assert.deepEqual(
    providerSchema.properties.resourceFingerprints.properties.productionEnvironmentGroups,
    {
      type: "array",
      minItems: 0,
      uniqueItems: true,
      items: { type: "string", pattern: "^[0-9a-f]{64}$" },
    },
  );
  assert.deepEqual(providerSchema.properties.applicationCommit.not, {
    const: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  });
  assert.ok(providerSchema.required.includes("productionControlBefore"));
  assert.ok(providerSchema.required.includes("productionControlAfter"));
  assert.deepEqual(providerSchema.properties.deployments.properties.pages, {
    $ref: "#/$defs/pagesDeployment",
  });
  assert.deepEqual(providerSchema.properties.deployments.properties.api, {
    $ref: "#/$defs/renderDeployment",
  });
  assert.deepEqual(providerSchema.properties.deployments.properties.llm, {
    $ref: "#/$defs/renderDeployment",
  });
  assert.deepEqual(providerSchema.$defs.legacyDeployment.properties, {
    provider: { const: "cloudflare-pages" },
    status: { const: "ready" },
    commit: { const: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
    branch: { const: "legacy-compat" },
    aliasSha256: { const: APPROVED_LEGACY_PAGES_ALIAS_SHA256 },
  });
});

const providerEvidenceSample = () => {
  const applicationCommit = "1234567890abcdef1234567890abcdef12345678";
  const productionControl = fingerprint("production-control-stable");
  return {
    schemaVersion: 1,
    capturedAt: "2026-07-18T00:00:00.000Z",
    expiresAt: "2026-07-25T00:00:00.000Z",
    environment: "preview",
    branch: "codex/frontend-v2-preview",
    applicationCommit,
    legacyCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    postgresMajor: 18,
    governance: {
      operator: "Gary",
      budgetOwner: "Gary",
      dataResetOwner: "Gary",
      destroyOwner: "Gary",
      reviewDate: "2026-07-29",
    },
    phase0ProviderEvidenceSha256: fingerprint("phase-zero-provider-evidence"),
    prePushBaselineSha256: fingerprint("pre-push-provider-baseline"),
    productionControlBefore: productionControl,
    productionControlAfter: productionControl,
    r2PolicyAttestations: {
      runtimeIdSha256: fingerprint("runtime-r2-access"),
      runtimePolicySha256: fingerprint("runtime-r2-policy"),
      runtimeExpirationStatus: "current",
      auditIdSha256: fingerprint("audit-r2-access"),
      auditPolicySha256: fingerprint("audit-r2-policy"),
      auditExpirationStatus: "short-lived",
    },
    resourceFingerprints: {
      pages: fingerprint("preview-pages"),
      api: fingerprint("preview-api"),
      llm: fingerprint("preview-llm"),
      postgres: fingerprint("preview-postgres"),
      postgresRole: fingerprint("preview-postgres-role"),
      r2: fingerprint("preview-r2"),
      previewEnvironmentGroup: fingerprint("preview-environment-group"),
      legacyPagesDeployment: fingerprint("preview-legacy-pages-deployment"),
      productionPages: fingerprint("production-pages"),
      productionServices: [
        fingerprint("production-api"),
        fingerprint("production-llm"),
      ],
      productionPostgres: fingerprint("production-postgres"),
      productionR2: fingerprint("production-r2"),
      productionEnvironmentGroups: [fingerprint("production-environment-group")],
    },
    deployments: {
      pages: { provider: "cloudflare-pages", status: "ready", commit: applicationCommit },
      api: { provider: "render", status: "ready", commit: applicationCommit },
      llm: { provider: "render", status: "ready", commit: applicationCommit },
      legacy: {
        provider: "cloudflare-pages",
        status: "ready",
        commit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
        branch: "legacy-compat",
        aliasSha256: APPROVED_LEGACY_PAGES_ALIAS_SHA256,
      },
    },
    bindings: {
      postgres: { status: "ready", isolated: true },
      r2: { status: "ready", isolated: true },
    },
    controls: {
      pagesAutomaticDeploysDisabled: true,
      apiAutomaticDeploysDisabled: true,
      llmAutomaticDeploysDisabled: true,
      pagesV2BuildConfigured: true,
      apiPythonConfigured: true,
      llmProbeConfigured: true,
      applicationDeploymentsAligned: true,
      resourceIsolationVerified: true,
      productionUnchanged: true,
      phase0IdentitiesLocked: true,
      prePushBaselineVerified: true,
      r2PoliciesVerified: true,
    },
  };
};

test("accepts a current, isolated provider-evidence relationship set", () => {
  const sample = providerEvidenceSample();
  const nowMs = Date.parse("2026-07-20T00:00:00.000Z");
  assert.deepEqual(validatePhase1ProviderEvidenceRelationships(sample, nowMs), []);
  sample.resourceFingerprints.productionEnvironmentGroups = [];
  assert.deepEqual(validatePhase1ProviderEvidenceRelationships(sample, nowMs), []);
});

test("historical provider evidence may be expired without relaxing its original lifetime", () => {
  const sample = providerEvidenceSample();
  const afterExpiry = Date.parse("2026-07-26T00:00:00.000Z");
  assert.ok(
    validatePhase1ProviderEvidenceRelationships(sample, afterExpiry)
      .includes("provider evidence has expired"),
  );
  assert.deepEqual(
    validatePhase1ProviderEvidenceRelationships(sample, afterExpiry, { allowExpired: true }),
    [],
  );
  sample.expiresAt = "2026-07-25T00:00:00.001Z";
  assert.ok(
    validatePhase1ProviderEvidenceRelationships(sample, afterExpiry, { allowExpired: true })
      .some((failure) => failure.includes("lifetime must be greater than zero and at most seven days")),
  );
});

for (const [label, mutate, expected] of [
  [
    "provider interchange",
    (sample) => {
      sample.deployments.pages.provider = "render";
      sample.deployments.api.provider = "cloudflare-pages";
    },
    "deployment provider mismatch",
  ],
  [
    "application commit drift",
    (sample) => { sample.deployments.api.commit = "a".repeat(40); },
    "application deployment commit mismatch",
  ],
  [
    "Preview/Production fingerprint collision",
    (sample) => { sample.resourceFingerprints.productionPages = sample.resourceFingerprints.pages; },
    "Preview and Production resource fingerprints overlap",
  ],
  [
    "evidence lifetime over seven days",
    (sample) => { sample.expiresAt = "2026-07-25T00:00:00.001Z"; },
    "lifetime must be greater than zero and at most seven days",
  ],
  [
    "production control drift",
    (sample) => { sample.productionControlAfter = fingerprint("production-control-changed"); },
    "Production control fingerprints differ",
  ],
  [
    "application commit reuses legacy",
    (sample) => {
      sample.applicationCommit = ACCEPTED_PHASE0_DEPLOYMENT_COMMIT;
      sample.deployments.pages.commit = ACCEPTED_PHASE0_DEPLOYMENT_COMMIT;
      sample.deployments.api.commit = ACCEPTED_PHASE0_DEPLOYMENT_COMMIT;
      sample.deployments.llm.commit = ACCEPTED_PHASE0_DEPLOYMENT_COMMIT;
    },
    "application commit must differ from legacy",
  ],
]) {
  test(`rejects provider evidence with ${label}`, () => {
    const sample = providerEvidenceSample();
    mutate(sample);
    const failures = validatePhase1ProviderEvidenceRelationships(
      sample,
      Date.parse("2026-07-20T00:00:00.000Z"),
    );
    assert.ok(failures.some((failure) => failure.includes(expected)), failures.join("\n"));
  });
}

test("preview isolation keys explicitly forbid sharing Production database and bucket", () => {
  assert.equal(previewContract.isolation.productionDatabaseSharingAllowed, false);
  assert.equal(previewContract.isolation.productionBucketSharingAllowed, false);
  assert.ok(!Object.hasOwn(previewContract.isolation, "sharedDatabaseAllowed"));
  assert.ok(!Object.hasOwn(previewContract.isolation, "sharedBucketAllowed"));
});

test("encodes eight unique system surfaces, 82 unique gates, and six activated future states", () => {
  assert.equal(acceptanceManifest.systemSurfaces.length, 8);
  assert.equal(new Set(acceptanceManifest.systemSurfaces).size, 8);
  assert.equal(acceptanceManifest.gates.length, 82);
  assert.equal(new Set(acceptanceManifest.gates.map(({ id }) => id)).size, 82);
  assert.equal(acceptanceManifest.gates.filter(({ kind }) => kind === "journey").length, 8);
  assert.equal(acceptanceManifest.gates.filter(({ kind }) => kind === "mutation-recovery").length, 72);
  assert.equal(acceptanceManifest.gates.filter(({ kind }) => kind === "visual-matrix").length, 1);
  assert.equal(acceptanceManifest.gates.filter(({ kind }) => kind === "axe-matrix").length, 1);
  assert.equal(acceptanceManifest.activatedPhase0FutureStates.length, 6);
  assert.equal(new Set(acceptanceManifest.activatedPhase0FutureStates).size, 6);
  assert.equal(acceptanceManifest.baseVisualCaseCount, 48);
});

test("uses 48 exact and unique review-image paths without globs", () => {
  const reviewPrefix = (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/"
  );
  const reviewOutputs = acceptanceManifest.evidenceOutputs.filter((outputPath) => (
    outputPath.startsWith(reviewPrefix)
  ));
  assert.equal(reviewOutputs.length, 48);
  assert.equal(new Set(reviewOutputs).size, 48);
  assert.ok(acceptanceManifest.evidenceOutputs.every((outputPath) => !/[*?\[\]]/.test(outputPath)));
  assert.deepEqual(reviewOutputs, acceptanceManifest.systemSurfaces.flatMap((surfaceId) => (
    ["desktop", "laptop", "mobile"].flatMap((viewport) => (
      ["light", "dark"].map((theme) => (
        `${reviewPrefix}${surfaceId.slice("system:".length)}-${viewport}-${theme}.jpg`
      ))
    ))
  )));
});

test("encodes nine application tables separately from Alembic metadata", () => {
  assert.equal(schemaContract.applicationTables.length, 9);
  assert.equal(new Set(schemaContract.applicationTables.map(({ name }) => name)).size, 9);
  assert.equal(schemaContract.metadataTable, "alembic_version");
  assert.ok(!schemaContract.applicationTables.some(({ name }) => name === "alembic_version"));
});

test("schema contract uses recoverable encrypted PKCE storage and audit idempotency", () => {
  const authChallenges = schemaContract.applicationTables.find(({ name }) => name === "auth_challenges");
  const authColumnNames = authChallenges.columns.map(({ name }) => name);
  assert.ok(!authColumnNames.includes("verifier_hash"));
  assert.deepEqual(
    authChallenges.columns.find(({ name }) => name === "pkce_verifier_ciphertext"),
    { name: "pkce_verifier_ciphertext", type: "bytea", nullable: true },
  );
  assert.deepEqual(
    authChallenges.columns.find(({ name }) => name === "pkce_key_id"),
    { name: "pkce_key_id", type: "varchar(64)", nullable: true },
  );
  assert.deepEqual(schemaContract.pkceVerifierPolicy, {
    storage: "short-lived-encrypted",
    plaintextStored: false,
    destroyOnConsume: true,
    destroyOnExpiry: true,
    expiredRowAction: "delete",
  });
  assert.deepEqual(authChallenges.checks, [
    "kind IN ('pre_auth_csrf','password_reset','email_verification','google_oauth')",
    "((kind = 'google_oauth' AND consumed_at IS NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NOT NULL AND pkce_key_id IS NOT NULL) OR (kind = 'google_oauth' AND consumed_at IS NOT NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL) OR (kind <> 'google_oauth' AND state_hash IS NULL AND nonce_hash IS NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL))",
  ]);

  const auditEvents = schemaContract.applicationTables.find(({ name }) => name === "audit_events");
  assert.deepEqual(
    auditEvents.columns.find(({ name }) => name === "user_id"),
    {
      name: "user_id",
      type: "uuid",
      nullable: true,
      references: "users.id",
      onDelete: "restrict",
    },
  );
  assert.deepEqual(
    auditEvents.columns.find(({ name }) => name === "idempotency_key_hash"),
    { name: "idempotency_key_hash", type: "char(64)", nullable: true },
  );
  assert.deepEqual(auditEvents.unique, []);
  assert.deepEqual(
    auditEvents.indexes.find(({ name }) => name === "uq_audit_events_idempotency"),
    {
      name: "uq_audit_events_idempotency",
      columns: ["user_id", "event_type", "idempotency_key_hash"],
      unique: true,
      where: "idempotency_key_hash IS NOT NULL",
    },
  );
  assert.ok(auditEvents.checks.includes(
    "idempotency_key_hash IS NULL OR user_id IS NOT NULL",
  ));
  assert.deepEqual(schemaContract.auditRetentionPolicy, {
    userDeletion: "restrict",
    userLifecycle: "soft-disable-with-status",
    previewDestruction: "governed-full-database-destroy",
  });
});

test("evidence-lock CLI rejects output overrides and unknown arguments", () => {
  const script = path.join(root, "scripts/build-frontend-upgrade-phase0-evidence-lock.mjs");
  for (const args of [
    ["--output", "/tmp/forbidden-phase0-lock.json"],
    ["--unknown-phase1-option"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unknown argument|not supported/i);
  }
});

test("Phase 1 contract checker accepts only one complete --root option", () => {
  const script = path.join(root, "scripts/check-frontend-upgrade-phase1-contracts.mjs");
  for (const args of [
    ["--unknown"],
    ["trailing"],
    ["--root"],
    ["--root", "--foo"],
    ["--root", root, "trailing"],
    ["--root", root, "--root", root],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, `unexpected success for ${JSON.stringify(args)}`);
    assert.match(result.stderr, /unknown argument|requires a directory|only once|trailing/i);
  }
});

test("atomic lock writes reject symlink roots and parents without changing external sentinels", async (t) => {
  for (const variant of ["root", "parent"]) {
    const fixture = await mkdtemp(path.join(canonicalTmpRoot, `quantgym-phase1-write-${variant}-`));
    t.after(() => rm(fixture, { force: true, recursive: true }));
    const externalRoot = path.join(fixture, "external");
    await mkdir(path.join(externalRoot, "docs/frontend-upgrade"), { recursive: true });
    const sentinelPath = path.join(externalRoot, PHASE0_EVIDENCE_LOCK_PATH);
    await writeFile(sentinelPath, `external ${variant} sentinel\n`);
    const before = await readFile(sentinelPath);
    let writeRoot;
    if (variant === "root") {
      writeRoot = path.join(fixture, "root-link");
      await symlink(externalRoot, writeRoot);
    } else {
      writeRoot = path.join(fixture, "workspace");
      await mkdir(writeRoot);
      await symlink(path.join(externalRoot, "docs"), path.join(writeRoot, "docs"));
    }

    await assert.rejects(
      writeFileAtomicallyWithinTrustedRoot({
        root: writeRoot,
        relativePath: PHASE0_EVIDENCE_LOCK_PATH,
        data: "must not escape\n",
      }),
      /unsafe ancestor directory/,
    );
    assert.deepEqual(await readFile(sentinelPath), before);
  }
});

test("atomic lock writes reject a symlink above the resolved root", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-write-ancestor-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  const externalRoot = path.join(fixture, "external");
  const externalWorkspace = path.join(externalRoot, "workspace");
  await mkdir(path.join(externalWorkspace, "docs/frontend-upgrade"), { recursive: true });
  const sentinelPath = path.join(externalWorkspace, PHASE0_EVIDENCE_LOCK_PATH);
  await writeFile(sentinelPath, "external ancestor sentinel\n");
  const before = await readFile(sentinelPath);
  const linkedAncestor = path.join(fixture, "ancestor-link");
  await symlink(externalRoot, linkedAncestor);

  await assert.rejects(
    writeFileAtomicallyWithinTrustedRoot({
      root: path.join(linkedAncestor, "workspace"),
      relativePath: PHASE0_EVIDENCE_LOCK_PATH,
      data: "must not escape\n",
    }),
    /unsafe ancestor directory/,
  );
  assert.deepEqual(await readFile(sentinelPath), before);
});

test("trusted directory snapshots ignore external-ancestor sibling timestamp noise", async (t) => {
  const fixture = await mkdtemp(path.join(
    canonicalTmpRoot,
    "quantgym-phase1-external-ancestor-noise-",
  ));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  const workspace = path.join(fixture, "workspace");
  await mkdir(path.join(workspace, "internal/deep"), { recursive: true });
  const snapshot = await captureTrustedDirectoryChain(workspace, "internal/deep");

  await writeFile(path.join(fixture, "external-sibling.txt"), "unrelated sibling\n");
  const forcedTimestamp = new Date("2001-01-01T00:00:00.000Z");
  await utimes(fixture, forcedTimestamp, forcedTimestamp);

  await assert.doesNotReject(assertTrustedDirectoryChainUnchanged(snapshot));
});

test("trusted directory snapshots still reject root and internal timestamp changes", async (t) => {
  const fixture = await mkdtemp(path.join(
    canonicalTmpRoot,
    "quantgym-phase1-internal-ancestor-change-",
  ));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  const workspace = path.join(fixture, "workspace");
  const internal = path.join(workspace, "internal");
  await mkdir(path.join(internal, "deep"), { recursive: true });
  const forcedTimestamp = new Date("2001-01-01T00:00:00.000Z");

  let snapshot = await captureTrustedDirectoryChain(workspace, "internal/deep");
  await utimes(workspace, forcedTimestamp, forcedTimestamp);
  await assert.rejects(
    assertTrustedDirectoryChainUnchanged(snapshot),
    new RegExp(`unsafe ancestor directory changed ${workspace.replaceAll("/", "\\/")}`),
  );

  snapshot = await captureTrustedDirectoryChain(workspace, "internal/deep");
  await utimes(internal, forcedTimestamp, forcedTimestamp);
  await assert.rejects(
    assertTrustedDirectoryChainUnchanged(snapshot),
    new RegExp(`unsafe ancestor directory changed ${internal.replaceAll("/", "\\/")}`),
  );
});

for (const outputPath of acceptanceManifest.evidenceOutputs) {
  test(`uses only the Phase 1 380 namespace for ${outputPath}`, () => {
    assert.match(outputPath, /^docs\/browser-audit-screenshots\/380-frontend-upgrade-phase-1-/);
  });
}

test("rejects contract key drift without throwing", () => {
  const contracts = checkedInContractSet();
  contracts.previewContract.resources.worker = "quantgym-v2-preview-worker";
  const failures = validatePhase1ContractSet(contracts);
  assert.ok(failures.some((failure) => failure.includes("preview contract mismatch")), failures.join("\n"));
});

test("rejects a duplicate system surface", () => {
  const contracts = checkedInContractSet();
  contracts.acceptanceManifest.systemSurfaces[7] = contracts.acceptanceManifest.systemSurfaces[0];
  const failures = validatePhase1ContractSet(contracts);
  assert.ok(failures.some((failure) => failure.includes("system surfaces")), failures.join("\n"));
});

test("rejects a wrong application table", () => {
  const contracts = checkedInContractSet();
  contracts.schemaContract.applicationTables[8].name = "state_json";
  const failures = validatePhase1ContractSet(contracts);
  assert.ok(failures.some((failure) => failure.includes("schema contract mismatch")), failures.join("\n"));
  assert.ok(failures.some((failure) => failure.includes("forbidden table state_json")), failures.join("\n"));
});

test("rejects secret-shaped provider evidence fields", () => {
  const contracts = checkedInContractSet();
  contracts.providerSchema.properties.apiToken = { type: "string" };
  const failures = validatePhase1ContractSet(contracts);
  assert.ok(failures.some((failure) => failure.includes("secret-shaped key apiToken")), failures.join("\n"));
});

test("rejects a Phase 1 output in the 370 namespace", () => {
  const contracts = checkedInContractSet();
  contracts.acceptanceManifest.evidenceOutputs[0] = (
    "docs/browser-audit-screenshots/370-frontend-upgrade-phase-1-summary.json"
  );
  const failures = validatePhase1ContractSet(contracts);
  assert.ok(failures.some((failure) => failure.includes("forbidden Phase 1 output namespace")), failures.join("\n"));
});

test("rejects a non-exact branch, resource identity, or same-origin base", () => {
  for (const mutate of [
    (contract) => { contract.branch = "main"; },
    (contract) => { contract.resources.r2Bucket = "quantgym-media"; },
    (contract) => { contract.topology.browserApiBase = "https://api.example.invalid/api/v2"; },
  ]) {
    const contracts = checkedInContractSet();
    mutate(contracts.previewContract);
    assert.ok(
      validatePhase1ContractSet(contracts).some((failure) => failure.includes("preview contract mismatch")),
    );
  }
});

test("the checked-in Phase 0 lock validates its tracked Git objects and current bytes", async () => {
  const nonEmptyContainer = "docs/browser-audit-screenshots/370-frontend-upgrade-review";
  assert.equal(evidenceLock.entries.some(({ path: entryPath }) => entryPath === nonEmptyContainer), false);
  assert.equal(
    evidenceLock.entries.some(({ path: entryPath }) => entryPath.startsWith(`${nonEmptyContainer}/`)),
    true,
  );
  assert.deepEqual(validatePhase0EvidenceLock(evidenceLock), []);
  assert.deepEqual(await verifyPhase0EvidenceLock({ root, lock: evidenceLock }), []);
});

test("the evidence-lock builder reads tracked Git objects and ignores an untracked 370 sentinel", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-lock-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  await writeFile(
    path.join(fixture, "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json"),
    "tracked baseline\n",
  );
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted review\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "phase 0"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const sentinelPath = path.join(
    fixture,
    "docs/browser-audit-screenshots/370-frontend-upgrade-user-sentinel.json",
  );
  await writeFile(sentinelPath, "user-owned sentinel\n");
  const before = await readFile(sentinelPath);

  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });

  assert.deepEqual(lock.entries.map(({ path: entryPath }) => entryPath), [
    "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json",
    PHASE0_ACCEPTED_REVIEW_PATH,
  ]);
  assert.deepEqual(await readFile(sentinelPath), before);
  assert.deepEqual(await verifyPhase0EvidenceLock({ root: fixture, lock }), []);
  assert.deepEqual(await readFile(sentinelPath), before);
});

test("the evidence-lock builder fails when the accepted review is missing and preserves sentinels", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-missing-review-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  const sentinelPath = path.join(
    fixture,
    "docs/browser-audit-screenshots/370-frontend-upgrade-user-sentinel.json",
  );
  await writeFile(sentinelPath, "do not alter\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "no review"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const before = await readFile(sentinelPath);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: acceptedCommit,
    }),
    /accepted Phase 0 review is not tracked/,
  );
  assert.deepEqual(await readFile(sentinelPath), before);
});

test("detects a modified locked artifact without changing any 370 bytes", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-modified-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  const artifactPath = path.join(
    fixture,
    "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json",
  );
  await writeFile(artifactPath, "original\n");
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "accepted"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  await writeFile(artifactPath, "modified\n");
  const modifiedBytes = await readFile(artifactPath);

  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(failures.some((failure) => failure.includes("working-tree bytes mismatch")), failures.join("\n"));
  assert.deepEqual(await readFile(artifactPath), modifiedBytes);
});

test("rejects a staged mutation even when HEAD and working-tree bytes remain locked", async (t) => {
  const { fixture, artifactPath, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-index-tamper-",
    t,
  );
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  await writeFile(artifactPath, "staged mutation\n");
  runGit(fixture, ["add", "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json"]);
  await writeFile(artifactPath, "baseline\n");

  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(
    failures.some((failure) => failure.includes("index bytes mismatch")),
    failures.join("\n"),
  );
});

test("rejects Git replace refs before reading accepted objects", async (t) => {
  const { fixture, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-replace-ref-",
    t,
  );
  const replacement = runGit(fixture, ["commit-tree", "HEAD^{tree}", "-m", "replacement"]);
  runGit(fixture, ["replace", acceptedCommit, replacement]);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: acceptedCommit,
    }),
    /replace refs are forbidden/,
  );
});

test("rejects legacy Git grafts before ancestry checks", async (t) => {
  const { fixture, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-graft-",
    t,
  );
  await writeFile(path.join(fixture, ".git/info/grafts"), `${acceptedCommit}\n`);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: acceptedCommit,
    }),
    /Git grafts are forbidden/,
  );
});

test("rejects a symlink in a locked artifact parent directory", async (t) => {
  const { fixture, artifactPath, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-parent-symlink-",
    t,
  );
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  const browserEvidenceDirectory = path.dirname(artifactPath);
  const relocatedDirectory = path.join(fixture, "browser-audit-screenshots-relocated");
  await rename(browserEvidenceDirectory, relocatedDirectory);
  await symlink(relocatedDirectory, browserEvidenceDirectory);
  const baselineBefore = await readFile(path.join(relocatedDirectory, path.basename(artifactPath)));

  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(
    failures.some((failure) => failure.includes("unsafe ancestor directory")),
    failures.join("\n"),
  );
  assert.deepEqual(
    await readFile(path.join(relocatedDirectory, path.basename(artifactPath))),
    baselineBefore,
  );
});

test("rejects an injected headRef before invoking Git", async () => {
  const failures = await verifyPhase0EvidenceLock({ root, lock: evidenceLock, headRef: "--help" });
  assert.ok(failures.some((failure) => failure.includes("headRef must be HEAD or a Git SHA")));
});

test("rejects every extra tracked 370 artifact added after the accepted evidence commit", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-extra-370-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  await writeFile(
    path.join(fixture, "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json"),
    "baseline\n",
  );
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "accepted"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  await writeFile(
    path.join(fixture, "docs/browser-audit-screenshots/370-frontend-upgrade-late.json"),
    "late tracked evidence\n",
  );
  runGit(fixture, ["add", "docs/browser-audit-screenshots/370-frontend-upgrade-late.json"]);
  runGit(fixture, ["commit", "-qm", "late evidence"]);

  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(
    failures.some((failure) => failure.includes("unlocked tracked Phase 0 path")),
    failures.join("\n"),
  );
});

test("rejects a committed 370 gitlink even when its deletion is staged", async (t) => {
  const { fixture, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-gitlink-",
    t,
  );
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  const gitlinkPath = "docs/browser-audit-screenshots/370-frontend-upgrade-gitlink";
  runGit(fixture, [
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${acceptedCommit},${gitlinkPath}`,
  ]);
  runGit(fixture, ["commit", "-qm", "committed gitlink"]);
  const gitlinkCommit = runGit(fixture, ["rev-parse", "HEAD"]);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: gitlinkCommit,
    }),
    /non-blob/i,
  );

  runGit(fixture, ["rm", "-q", "--cached", "--", gitlinkPath]);
  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(failures.length > 0);
  assert.ok(failures.some((failure) => /non-blob/i.test(failure)), failures.join("\n"));
  assert.ok(failures.some((failure) => /unlocked/i.test(failure)), failures.join("\n"));
});

test("rejects an empty 370 tree leaf that cannot appear in the index", async (t) => {
  const { fixture, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-empty-tree-",
    t,
  );
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  const emptyTree = runGit(fixture, ["mktree"], { input: "" });
  const browserTree = runGit(fixture, [
    "rev-parse",
    `${acceptedCommit}:docs/browser-audit-screenshots`,
  ]);
  const browserTreeWithEmptyLeaf = replaceGitTreeEntry(fixture, browserTree, {
    mode: "040000",
    type: "tree",
    object: emptyTree,
    name: "370-frontend-upgrade-empty-tree",
  });
  const docsTree = runGit(fixture, ["rev-parse", `${acceptedCommit}:docs`]);
  const docsTreeWithEmptyLeaf = replaceGitTreeEntry(fixture, docsTree, {
    mode: "040000",
    type: "tree",
    object: browserTreeWithEmptyLeaf,
    name: "browser-audit-screenshots",
  });
  const rootTree = runGit(fixture, ["rev-parse", `${acceptedCommit}^{tree}`]);
  const rootTreeWithEmptyLeaf = replaceGitTreeEntry(fixture, rootTree, {
    mode: "040000",
    type: "tree",
    object: docsTreeWithEmptyLeaf,
    name: "docs",
  });
  const emptyTreeCommit = runGit(fixture, [
    "commit-tree",
    rootTreeWithEmptyLeaf,
    "-p",
    acceptedCommit,
    "-m",
    "committed empty evidence tree",
  ]);
  runGit(fixture, ["update-ref", "HEAD", emptyTreeCommit]);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: emptyTreeCommit,
    }),
    /non-blob/i,
  );
  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });
  assert.ok(failures.some((failure) => /non-blob/i.test(failure)), failures.join("\n"));
  assert.ok(failures.some((failure) => /unlocked/i.test(failure)), failures.join("\n"));
});

test("requires the accepted review path itself to be a regular blob", async (t) => {
  const { fixture, acceptedCommit } = await createPhase0GitFixture(
    "quantgym-phase1-review-tree-",
    t,
  );
  const acceptedReview = path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH);
  await rm(acceptedReview);
  await mkdir(acceptedReview);
  await writeFile(path.join(acceptedReview, "nested.md"), "not a single accepted review blob\n");
  runGit(fixture, ["add", "-A"]);
  runGit(fixture, ["commit", "-qm", "replace accepted review with tree"]);
  const reviewTreeCommit = runGit(fixture, ["rev-parse", "HEAD"]);

  await assert.rejects(
    buildPhase0EvidenceLock({
      root: fixture,
      acceptedDeploymentCommit: acceptedCommit,
      acceptedEvidenceCommit: reviewTreeCommit,
    }),
    /non-blob/i,
  );
});

test("rejects a symlink substituted for a locked working-tree artifact", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-symlink-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  const artifactPath = path.join(
    fixture,
    "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json",
  );
  const targetPath = path.join(fixture, "symlink-target.txt");
  await writeFile(artifactPath, "baseline\n");
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "accepted"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  await writeFile(targetPath, "baseline\n");
  await rm(artifactPath);
  await symlink(targetPath, artifactPath);
  const targetBefore = await readFile(targetPath);

  const failures = await verifyPhase0EvidenceLock({ root: fixture, lock });

  assert.ok(
    failures.some((failure) => failure.includes("securely read working-tree Phase 0 path")),
    failures.join("\n"),
  );
  assert.deepEqual(await readFile(targetPath), targetBefore);
});

test("rejects non-canonical and path-traversing evidence-lock paths before filesystem access", async () => {
  for (const unsafePath of [
    "/tmp/370-frontend-upgrade-escape.json",
    "../docs/browser-audit-screenshots/370-frontend-upgrade-escape.json",
    "docs\\browser-audit-screenshots\\370-frontend-upgrade-escape.json",
    "docs/browser-audit-screenshots/../370-frontend-upgrade-escape.json",
    "docs/browser-audit-screenshots//370-frontend-upgrade-escape.json",
    "docs/browser-audit-screenshots/370-frontend-upgrade-escape.json\0outside",
  ]) {
    const invalidLock = clone(evidenceLock);
    invalidLock.entries[0].path = unsafePath;
    const validationFailures = validatePhase0EvidenceLock(invalidLock);
    assert.ok(
      validationFailures.some((failure) => failure.includes("unsafe Phase 0 evidence path")),
      `${unsafePath}: ${validationFailures.join("\n")}`,
    );
    const verificationFailures = await verifyPhase0EvidenceLock({ root, lock: invalidLock });
    assert.ok(
      verificationFailures.some((failure) => failure.includes("unsafe Phase 0 evidence path")),
      `${unsafePath}: ${verificationFailures.join("\n")}`,
    );
  }
});

test("rejects a Phase 1 head that does not descend from both accepted commits", async (t) => {
  const fixture = await mkdtemp(path.join(canonicalTmpRoot, "quantgym-phase1-ancestor-"));
  t.after(() => rm(fixture, { force: true, recursive: true }));
  runGit(fixture, ["init", "-q"]);
  runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  runGit(fixture, ["config", "user.name", "Fixture"]);
  await mkdir(path.join(fixture, "docs/browser-audit-screenshots"), { recursive: true });
  await mkdir(path.join(fixture, path.dirname(PHASE0_ACCEPTED_REVIEW_PATH)), { recursive: true });
  await writeFile(
    path.join(fixture, "docs/browser-audit-screenshots/370-frontend-upgrade-baseline.json"),
    "baseline\n",
  );
  await writeFile(path.join(fixture, PHASE0_ACCEPTED_REVIEW_PATH), "accepted\n");
  runGit(fixture, ["add", "docs"]);
  runGit(fixture, ["commit", "-qm", "accepted"]);
  const acceptedCommit = runGit(fixture, ["rev-parse", "HEAD"]);
  const lock = await buildPhase0EvidenceLock({
    root: fixture,
    acceptedDeploymentCommit: acceptedCommit,
    acceptedEvidenceCommit: acceptedCommit,
  });
  const unrelatedHead = runGit(fixture, ["commit-tree", "HEAD^{tree}", "-m", "unrelated"]);

  const failures = await verifyPhase0EvidenceLock({
    root: fixture,
    lock,
    headRef: unrelatedHead,
  });

  assert.ok(failures.some((failure) => failure.includes("is not an ancestor")), failures.join("\n"));
});
