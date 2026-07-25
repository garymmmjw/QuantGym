import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  PHASE1_AGGREGATE_SUMMARY_RELATIVE,
  TEST_ONLY_PHASE1_AGGREGATE,
  runFrontendUpgradePhase1Check,
  secureReadPhase1AggregateInput,
  validatePhase1ComponentSummaries,
  verifyPhase1ApplicationCommitProvenance,
} from "../scripts/check-frontend-upgrade-phase1.mjs";
import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const NOW = new Date("2026-07-24T00:00:00.000Z");
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ISOLATED_TEST_PARENT = await realpath(tmpdir());
const execFileAsync = promisify(execFile);
const FIXTURE_GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  HOME: ISOLATED_TEST_PARENT,
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
});
const fixtureGit = (root, args) => execFileAsync(
  "/usr/bin/git",
  args,
  {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    cwd: root,
    env: FIXTURE_GIT_ENV,
  },
);
const resolveGitPath = (root, value) => (
  path.isAbsolute(value) ? value : path.resolve(root, value)
);
const snapshotRepositoryShallowState = async (root) => {
  const [{ stdout: shallowOutput }, { stdout: pathOutput }] = await Promise.all([
    fixtureGit(root, ["rev-parse", "--is-shallow-repository"]),
    fixtureGit(root, ["rev-parse", "--git-path", "shallow"]),
  ]);
  const shallowPath = resolveGitPath(root, pathOutput.trim());
  let bytes = null;
  try {
    bytes = await readFile(shallowPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return {
    shallow: shallowOutput.trim(),
    shallowPath,
    bytes,
  };
};
process.env.NODE_ENV = "test";
const CHECKED_AT = NOW.toISOString();
const COMMIT = "1".repeat(40);
const EVIDENCE_SHA256 = "2".repeat(64);
const PHASE0_SHA256 = "3".repeat(64);
const PRODUCTION_SHA256 = "4".repeat(64);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hash = (label) => sha256(label);
const allTrue = (keys) => Object.fromEntries(keys.map((key) => [key, true]));

const envelope = ({ check, hashes, checks, counts, commit = COMMIT }) => ({
  schemaVersion: 1,
  check,
  status: "pass",
  checkedAt: CHECKED_AT,
  commit,
  evidenceSha256: EVIDENCE_SHA256,
  hashes,
  checks,
  counts,
  failureCodes: [],
});

const surfaceCounts = () => ({
  systemSurfaces: 8,
  targetGates: 82,
  executedE2eTests: 82,
  skippedE2eTests: 0,
  failedE2eTests: 0,
  flakyE2eTests: 0,
  activatedFutureStates: 6,
  visualCases: 48,
  seriousOrCriticalAxeFindings: 0,
  applicationConsoleErrors: 0,
  unhandledRejections: 0,
  initialJsGzipBytes: 165_042,
  initialJsBudgetBytes: 180 * 1024,
  largestRouteChunkGzipBytes: 4_237,
  routeChunkBudgetBytes: 100 * 1024,
  initialFileCount: 1,
  routeChunkCount: 17,
});

const reviewHashes = () => Array.from(
  { length: 48 },
  (_, index) => hash(`review-${index}`),
);

const summariesFixture = (commit = COMMIT) => ({
  preview: envelope({
    commit,
    check: "frontend-upgrade-phase1-preview-live",
    hashes: {
      phase0EvidenceLockSha256: PHASE0_SHA256,
      productionControlSha256: PRODUCTION_SHA256,
    },
    checks: allTrue([
      "providerEvidenceCurrent",
      "automaticDeploysDisabled",
      "applicationDeploymentsAligned",
      "pagesRuntimeExact",
      "publicConfigMinimal",
      "proxiedApiHealthy",
      "directApiHealthy",
      "privateLlmProviderAttested",
      "postgresBindingVerified",
      "r2BindingVerified",
      "authSecurityVerified",
      "systemSurfacesVerified",
      "legacyCompatibilityLocked",
      "syntheticDataCleaned",
      "productionUnchanged",
      "phase0LockBeforeAndAfter",
    ]),
    counts: {
      providerDeployments: 4,
      liveRuntimeDocuments: 7,
      systemSurfaces: 8,
      targetGates: 82,
      activatedFutureStates: 6,
      visualCases: 48,
      postgresMajor: 18,
      applicationRowsRemaining: 0,
      r2ObjectsRemaining: 0,
      seriousOrCriticalAxeFindings: 0,
      applicationConsoleErrors: 0,
      unhandledRejections: 0,
    },
  }),
  postgres: envelope({
    commit,
    check: "frontend-v2-phase1-postgres",
    hashes: {
      postgresResourceSha256: hash("postgres-resource"),
      postgresRoleSha256: hash("postgres-role"),
      runtimeIdentitySha256: hash("runtime-identity"),
      schemaSha256: hash("schema"),
      migrationRoundTripSha256: hash("migration"),
    },
    checks: allTrue([
      "providerEvidenceCurrent",
      "resourceDistinctFromProduction",
      "authenticatedPreviewBinding",
      "postgresMajor18",
      "ephemeralImagePinnedToPostgres18",
      "sslForCurrentBackend",
      "exactAlembicHead",
      "schemaMatchesFrozenContract",
      "legacyTablesAndColumnsAbsent",
      "migrationRoundTripDeterministic",
      "syntheticCleanupExplicitlyAuthorized",
      "applicationDataCleaned",
    ]),
    counts: {
      postgresMajor: 18,
      applicationTables: 9,
      metadataTables: 1,
      applicationRows: 0,
      syntheticUsersDeleted: 1,
    },
  }),
  r2: envelope({
    commit,
    check: "frontend-v2-phase1-r2",
    hashes: {
      bucketIdentitySha256: hash("bucket"),
      accountIdentitySha256: hash("account"),
      runtimeObjectPayloadSha256: hash("runtime-object"),
      auditObjectPayloadSha256: hash("audit-object"),
      runtimeAccessIdSha256: hash("runtime-r2-access"),
      auditAccessIdSha256: hash("audit-r2-access"),
    },
    checks: allTrue([
      "providerEvidenceCurrent",
      "runtimePolicyIdentityBound",
      "auditPolicyIdentityBound",
      "accessIdentitiesIndependent",
      "isolatedPreviewBinding",
      "resourceDistinctFromProduction",
      "signingRegionAuto",
      "dedicatedLifecyclePrefixUsed",
      "runtimeProductionSignedAccessDenied",
      "runtimeObjectsListedBefore",
      "runtimeStaleSyntheticObjectsCleaned",
      "runtimeSignedUploadSucceeded",
      "runtimeAnonymousReadDenied",
      "runtimeSignedReadSucceeded",
      "runtimeBytesMatch",
      "runtimeSignedDeleteSucceeded",
      "runtimeCleanupConfirmed",
      "runtimeObjectsListedAfter",
      "auditProductionSignedAccessDenied",
      "auditObjectsListedBefore",
      "auditStaleSyntheticObjectsCleaned",
      "auditSignedUploadSucceeded",
      "auditAnonymousReadDenied",
      "auditSignedReadSucceeded",
      "auditBytesMatch",
      "auditSignedDeleteSucceeded",
      "auditCleanupConfirmed",
      "auditObjectsListedAfter",
    ]),
    counts: {
      runtimeObjectsFoundBefore: 0,
      runtimeStaleObjectsDeleted: 0,
      runtimeObjectsCreated: 1,
      runtimeObjectsRemaining: 0,
      auditObjectsFoundBefore: 0,
      auditStaleObjectsDeleted: 0,
      auditObjectsCreated: 1,
      auditObjectsRemaining: 0,
    },
  }),
  auth: envelope({
    commit,
    check: "frontend-upgrade-phase1-auth",
    hashes: { syntheticDataSha256: hash("synthetic-audit-user") },
    checks: allTrue([
      "offlineContractPassed",
      "hostCookiePolicy",
      "csrfPairing",
      "exactOriginEnforced",
      "sessionAndCsrfRotated",
      "logoutRevokedSession",
      "oauthPkceS256",
      "oauthReplayRejected",
      "browserStorageSafe",
      "syntheticCleanupRequired",
    ]),
    counts: {
      localStorageEntries: 2,
      sessionStorageEntries: 0,
      indexedDbRecords: 0,
      sensitiveEntries: 0,
      syntheticUsersCreated: 1,
    },
  }),
  legacy: envelope({
    commit,
    check: "frontend-upgrade-phase1-legacy-boundary",
    hashes: {
      aliasSha256: APPROVED_LEGACY_PAGES_ALIAS_SHA256,
      rootDocumentSha256: hash("legacy-root"),
      planDocumentSha256: hash("legacy-plan"),
    },
    checks: allTrue([
      "sourceBoundaryIsolated",
      "previewOnlyAdapter",
      "lockedDeploymentExact",
      "rootRouteAvailable",
      "planRouteAvailable",
    ]),
    counts: {
      unmigratedRoutes: 22,
      checkedLiveDocuments: 2,
      localBoundaryFailures: 0,
    },
  }),
  surfaces: envelope({
    commit,
    check: "frontend-upgrade-phase1-system-surfaces",
    hashes: { reviewImageSha256: reviewHashes() },
    checks: allTrue([
      "offlineContractPassed",
      "fullE2eExecuted",
      "bundleBudgetsPassed",
      "visualMatrixPassed",
      "accessibilityPassed",
      "consolePassed",
      "rejectionsPassed",
    ]),
    counts: surfaceCounts(),
  }),
});

const providerFixture = (commit = COMMIT) => ({
  schemaVersion: 1,
  capturedAt: "2026-07-23T00:00:00.000Z",
  expiresAt: "2026-07-30T00:00:00.000Z",
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  applicationCommit: commit,
  legacyCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  postgresMajor: 18,
  governance: {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  },
  phase0ProviderEvidenceSha256: hash("phase-zero-provider-evidence"),
  prePushBaselineSha256: hash("pre-push-provider-baseline"),
  productionControlBefore: PRODUCTION_SHA256,
  productionControlAfter: PRODUCTION_SHA256,
  r2PolicyAttestations: {
    runtimeIdSha256: hash("runtime-r2-access"),
    runtimePolicySha256: hash("runtime-r2-policy"),
    runtimeExpirationStatus: "current",
    auditIdSha256: hash("audit-r2-access"),
    auditPolicySha256: hash("audit-r2-policy"),
    auditExpirationStatus: "short-lived",
  },
  resourceFingerprints: {
    pages: hash("preview-pages"),
    api: hash("preview-api"),
    llm: hash("preview-llm"),
    postgres: hash("preview-postgres"),
    postgresRole: hash("preview-postgres-role"),
    r2: hash("preview-r2"),
    previewEnvironmentGroup: hash("preview-environment"),
    legacyPagesDeployment: hash("legacy-pages"),
    productionPages: hash("production-pages"),
    productionServices: [hash("production-api"), hash("production-llm")],
    productionPostgres: hash("production-postgres"),
    productionR2: hash("production-r2"),
    productionEnvironmentGroups: [hash("production-environment")],
  },
  deployments: {
    pages: { provider: "cloudflare-pages", status: "ready", commit },
    api: { provider: "render", status: "ready", commit },
    llm: { provider: "render", status: "ready", commit },
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
});

const validationOptions = () => ({
  expectedCommit: COMMIT,
  evidenceSha256: EVIDENCE_SHA256,
  phase0EvidenceLockSha256: PHASE0_SHA256,
  productionControlSha256: PRODUCTION_SHA256,
  providerCapturedAtMs: Date.parse("2026-07-23T00:00:00.000Z"),
  providerExpiresAtMs: Date.parse("2026-07-30T00:00:00.000Z"),
  nowMs: NOW.getTime(),
});

const writeRuntimeArtifact = async (
  root,
  commit,
  { versionCommit = commit, index = "<main>phase 1 runtime</main>\n" } = {},
) => {
  const runtimeRoot = path.join(root, "dist-v2");
  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(runtimeRoot, { recursive: true });
  const files = {
    "config.json": `${JSON.stringify({ schemaVersion: 1, apiBase: "/api/v2" }, null, 2)}\n`,
    "index.html": index,
    "version.json": `${JSON.stringify({
      schemaVersion: 1,
      commit: versionCommit,
      branch: "codex/frontend-v2-preview",
      source: "local",
    }, null, 2)}\n`,
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    await writeFile(path.join(runtimeRoot, relativePath), contents, { mode: 0o644 });
  }
  const assets = Object.fromEntries(Object.entries(files)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([relativePath, contents]) => {
      const bytes = Buffer.from(contents, "utf8");
      return [relativePath, {
        bytes: bytes.length,
        integrity: `sha384-${createHash("sha384").update(bytes).digest("base64")}`,
      }];
    }));
  await writeFile(
    path.join(runtimeRoot, "asset-integrity.json"),
    `${JSON.stringify({ schemaVersion: 1, algorithm: "sha384", assets }, null, 2)}\n`,
    { mode: 0o644 },
  );
};

test("accepts six strict component envelopes and all frozen Phase 1 counts", () => {
  const summaries = summariesFixture();
  assert.equal(
    validatePhase1ComponentSummaries(summaries, validationOptions()),
    summaries,
  );
});

test("rejects commit, provider digest, production fingerprint, and cleanup drift", () => {
  const mutations = [
    (summaries) => { summaries.auth.commit = "9".repeat(40); },
    (summaries) => { summaries.r2.evidenceSha256 = "8".repeat(64); },
    (summaries) => { summaries.preview.hashes.productionControlSha256 = "7".repeat(64); },
    (summaries) => { summaries.postgres.counts.applicationRows = 1; },
    (summaries) => { summaries.r2.counts.runtimeObjectsRemaining = 1; },
    (summaries) => { summaries.r2.counts.auditObjectsRemaining = 1; },
    (summaries) => { delete summaries.r2.checks.runtimeSignedReadSucceeded; },
  ];
  for (const mutate of mutations) {
    const summaries = summariesFixture();
    mutate(summaries);
    assert.throws(
      () => validatePhase1ComponentSummaries(summaries, validationOptions()),
    );
  }
});

test("rejects stale, self-accepted, extra, and URL-bearing child evidence", () => {
  const mutations = [
    (summaries) => { summaries.auth.checkedAt = "2026-07-01T00:00:00.000Z"; },
    (summaries) => { summaries.auth.checkedAt = "2026-07-22T00:00:00.000Z"; },
    (summaries) => { summaries.auth.status = "accepted"; },
    (summaries) => { summaries.auth.failureCodes = ["accepted"]; },
    (summaries) => { summaries.auth.apiUrl = "https://example.invalid"; },
  ];
  for (const mutate of mutations) {
    const summaries = summariesFixture();
    mutate(summaries);
    assert.throws(
      () => validatePhase1ComponentSummaries(summaries, validationOptions()),
    );
  }
});

test("secure fixed-path reads reject symlinks, hard links, and permissive modes", async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(ISOLATED_TEST_PARENT, "read-"),
  );
  const root = await realpath(temporaryRoot);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "safe.json"), "{}\n", { mode: 0o644 });
  assert.equal(
    (await secureReadPhase1AggregateInput(root, "safe.json")).toString("utf8"),
    "{}\n",
  );

  await symlink("safe.json", path.join(root, "symlink.json"));
  await assert.rejects(
    secureReadPhase1AggregateInput(root, "symlink.json"),
  );

  await link(path.join(root, "safe.json"), path.join(root, "hardlink.json"));
  await assert.rejects(
    secureReadPhase1AggregateInput(root, "hardlink.json"),
  );
  await rm(path.join(root, "hardlink.json"));

  await chmod(path.join(root, "safe.json"), 0o666);
  await assert.rejects(
    secureReadPhase1AggregateInput(root, "safe.json"),
  );
});

const isolatedRoot = async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(ISOLATED_TEST_PARENT, "run-"),
  );
  const root = await realpath(temporaryRoot);
  t.after(() => rm(root, { recursive: true, force: true }));
  await fixtureGit(root, ["init", "--quiet"]);
  const { stdout: gitDirectoryOutput } = await fixtureGit(
    root,
    ["rev-parse", "--absolute-git-dir"],
  );
  const expectedGitDirectory = await realpath(path.join(root, ".git"));
  const gitDirectory = await realpath(gitDirectoryOutput.trim());
  assert.equal(gitDirectory, expectedGitDirectory);
  assert.equal(path.dirname(gitDirectory), root);
  await fixtureGit(root, ["config", "user.name", "Phase 1 Test"]);
  await fixtureGit(
    root,
    ["config", "user.email", "phase1-test@example.invalid"],
  );
  await Promise.all([
    writeFile(path.join(root, "fixture.txt"), "phase-1 fixture\n", { mode: 0o644 }),
    writeFile(path.join(root, ".gitignore"), "dist-v2/\n", { mode: 0o644 }),
  ]);
  await fixtureGit(root, ["add", "fixture.txt", ".gitignore"]);
  await fixtureGit(root, ["commit", "--quiet", "-m", "fixture"]);
  const { stdout } = await fixtureGit(root, ["rev-parse", "HEAD"]);
  await mkdir(path.join(root, "docs/browser-audit-screenshots"), { recursive: true });
  const commit = stdout.trim();
  await writeRuntimeArtifact(root, commit);
  return { root, commit, gitDirectory };
};

test("test-only aggregate injection requires a canonical isolated temporary root", async (t) => {
  const temporaryRoot = await mkdtemp(
    path.join(ISOLATED_TEST_PARENT, "aggregate-root-"),
  );
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const workspaceAlias = path.join(temporaryRoot, "workspace-alias");
  await symlink(PROJECT_ROOT, workspaceAlias, "dir");

  await assert.rejects(
    runFrontendUpgradePhase1Check({
      root: workspaceAlias,
      mode: "offline",
      [TEST_ONLY_PHASE1_AGGREGATE]: {
        offline: {
          passed: true,
        },
      },
    }),
    (error) => error?.code === "test_injection_forbidden",
  );
});

const liveTestOptions = (root, commit, summaries = summariesFixture(commit)) => ({
  root,
  mode: "live",
  [TEST_ONLY_PHASE1_AGGREGATE]: {
    now: NOW,
    offline: {
      passed: true,
      failures: [],
      phase0EvidenceLockSha256: PHASE0_SHA256,
      counts: {
        systemSurfaces: 8,
        targetGates: 82,
        activatedFutureStates: 6,
        visualCases: 48,
        postgresMajor: 18,
      },
      bundle: {},
    },
    provider: {
      evidence: providerFixture(commit),
      bytes: Buffer.from("redacted-provider-evidence\n"),
      sha256: EVIDENCE_SHA256,
    },
    summaries,
    reviewImageHashes: summaries.surfaces.hashes.reviewImageSha256,
    phase0After: {
      value: { schemaVersion: 1 },
      bytes: Buffer.from("phase-zero-lock\n"),
    },
    phase0AfterFailures: [],
  },
});

test("application commit must exist and be an ancestor of repository HEAD", async (t) => {
  const { root, commit } = await isolatedRoot(t);
  assert.equal(
    await verifyPhase1ApplicationCommitProvenance(root, commit),
    true,
  );
  await assert.rejects(
    verifyPhase1ApplicationCommitProvenance(root, "9".repeat(40)),
  );

  const { stdout: branchOutput } = await fixtureGit(
    root,
    ["branch", "--show-current"],
  );
  await fixtureGit(root, ["checkout", "--quiet", "-b", "side"]);
  await writeFile(path.join(root, "side.txt"), "side commit\n", { mode: 0o644 });
  await fixtureGit(root, ["add", "side.txt"]);
  await fixtureGit(root, ["commit", "--quiet", "-m", "side"]);
  const { stdout: sideOutput } = await fixtureGit(
    root,
    ["rev-parse", "HEAD"],
  );
  await fixtureGit(
    root,
    ["checkout", "--quiet", branchOutput.trim()],
  );
  await assert.rejects(
    verifyPhase1ApplicationCommitProvenance(root, sideOutput.trim()),
  );
});

test("an application commit may have only exact committed 380 evidence successors", async (t) => {
  const { root, commit } = await isolatedRoot(t);
  const evidencePath = (
    "docs/browser-audit-screenshots/"
    + "380-frontend-upgrade-phase-1-postgres-migration-summary.json"
  );
  await writeFile(path.join(root, evidencePath), "{}\n", { mode: 0o644 });
  assert.equal(
    await verifyPhase1ApplicationCommitProvenance(root, commit),
    true,
  );
  await fixtureGit(root, ["add", evidencePath]);
  await fixtureGit(root, ["commit", "--quiet", "-m", "evidence"]);
  assert.equal(
    await verifyPhase1ApplicationCommitProvenance(root, commit),
    true,
  );
});

test("application provenance rejects committed and uncommitted source successors", async (t) => {
  await t.test("committed source successor", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(path.join(root, "fixture.txt"), "changed source\n", { mode: 0o644 });
    await fixtureGit(root, ["add", "fixture.txt"]);
    await fixtureGit(root, ["commit", "--quiet", "-m", "source drift"]);
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_source_drift",
    );
  });

  await t.test("dirty tracked source", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(path.join(root, "fixture.txt"), "dirty source\n", { mode: 0o644 });
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_source_drift",
    );
  });

  await t.test("dirty untracked source", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(path.join(root, "unexpected-source.ts"), "export {};\n", {
      mode: 0o644,
    });
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_source_drift",
    );
  });

  await t.test("tampered user-owned untracked evidence", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(
      path.join(
        root,
        "docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json",
      ),
      "tampered user evidence\n",
      { mode: 0o644 },
    );
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_source_drift",
    );
  });
});

test("application provenance rejects stale or internally inconsistent dist-v2", async (t) => {
  await t.test("stale version with a self-consistent manifest", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeRuntimeArtifact(root, commit, { versionCommit: "9".repeat(40) });
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "runtime_artifact_invalid",
    );
  });

  await t.test("asset changed after integrity generation", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(
      path.join(root, "dist-v2/index.html"),
      "<main>tampered runtime</main>\n",
      { mode: 0o644 },
    );
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "runtime_artifact_invalid",
    );
  });

  await t.test("missing runtime artifact", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await rm(path.join(root, "dist-v2"), { recursive: true, force: true });
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "runtime_artifact_invalid",
    );
  });
});

test("application provenance rejects hidden index state", async (t) => {
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    await t.test(flag, async (subtest) => {
      const { root, commit } = await isolatedRoot(subtest);
      await fixtureGit(
        root,
        ["update-index", flag, "fixture.txt"],
      );
      await assert.rejects(
        verifyPhase1ApplicationCommitProvenance(root, commit),
        (error) => error?.code === "application_source_drift",
      );
    });
  }
});

test("application provenance rejects replace refs, grafts, and shallow history", async (t) => {
  await t.test("replace ref", async (subtest) => {
    const { root, commit } = await isolatedRoot(subtest);
    await writeFile(path.join(root, "fixture.txt"), "replacement commit\n", {
      mode: 0o644,
    });
    await fixtureGit(root, ["add", "fixture.txt"]);
    await fixtureGit(root, ["commit", "--quiet", "-m", "replacement"]);
    await fixtureGit(root, ["replace", commit, "HEAD"]);
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_commit_invalid",
    );
  });

  await t.test("graft file", async (subtest) => {
    const { root, commit, gitDirectory } = await isolatedRoot(subtest);
    const graftPath = path.join(gitDirectory, "info/grafts");
    assert.equal(path.relative(root, graftPath), path.join(".git", "info", "grafts"));
    await mkdir(path.dirname(graftPath), { recursive: true });
    await writeFile(graftPath, "\n", { mode: 0o644 });
    await assert.rejects(
      verifyPhase1ApplicationCommitProvenance(root, commit),
      (error) => error?.code === "application_commit_invalid",
    );
  });

  await t.test("shallow repository", async (subtest) => {
    const projectStateBefore = await snapshotRepositoryShallowState(PROJECT_ROOT);
    const decoyTemporaryRoot = await mkdtemp(
      path.join(ISOLATED_TEST_PARENT, "git-env-decoy-"),
    );
    const decoyRoot = await realpath(decoyTemporaryRoot);
    subtest.after(() => rm(decoyRoot, { recursive: true, force: true }));
    await fixtureGit(decoyRoot, ["init", "--quiet"]);
    const decoyStateBefore = await snapshotRepositoryShallowState(decoyRoot);
    const gitLocationVariables = ["GIT_DIR", "GIT_COMMON_DIR", "GIT_WORK_TREE"];
    const ambientValues = Object.fromEntries(
      gitLocationVariables.map((name) => [name, process.env[name]]),
    );
    process.env.GIT_DIR = path.join(decoyRoot, ".git");
    process.env.GIT_COMMON_DIR = path.join(decoyRoot, ".git");
    process.env.GIT_WORK_TREE = decoyRoot;
    try {
      const { root, commit, gitDirectory } = await isolatedRoot(subtest);
      const shallowPath = path.join(gitDirectory, "shallow");
      assert.equal(path.dirname(shallowPath), gitDirectory);
      assert.equal(path.relative(root, shallowPath), path.join(".git", "shallow"));
      await writeFile(shallowPath, `${commit}\n`, { mode: 0o644 });
      await assert.rejects(
        verifyPhase1ApplicationCommitProvenance(root, commit),
        (error) => error?.code === "application_commit_invalid",
      );
    } finally {
      for (const name of gitLocationVariables) {
        if (ambientValues[name] === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = ambientValues[name];
        }
      }
      assert.deepEqual(
        await snapshotRepositoryShallowState(PROJECT_ROOT),
        projectStateBefore,
      );
      assert.deepEqual(
        await snapshotRepositoryShallowState(decoyRoot),
        decoyStateBefore,
      );
    }
  });
});

test("non-test callers cannot roll back the aggregate validation clock", async (t) => {
  const { root } = await isolatedRoot(t);
  await assert.rejects(
    runFrontendUpgradePhase1Check({
      root,
      mode: "live",
      checkedAt: "2026-07-24T00:00:00.000Z",
    }),
    (error) => error?.code === "check_time_override_forbidden",
  );
});

test("live aggregate writes ready-for-review and can never self-accept", async (t) => {
  const { root, commit } = await isolatedRoot(t);
  const options = liveTestOptions(root, commit);
  options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256 = sha256(
    options[TEST_ONLY_PHASE1_AGGREGATE].phase0After.bytes,
  );
  options[TEST_ONLY_PHASE1_AGGREGATE].summaries.preview.hashes.phase0EvidenceLockSha256 = (
    options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256
  );
  const result = await runFrontendUpgradePhase1Check(options);
  assert.equal(result.summary.status, "ready-for-review");
  assert.equal(result.summary.commit, commit);
  assert.deepEqual(result.summary.failureCodes, []);
  assert.ok(!JSON.stringify(result.summary).includes('"accepted"'));
  const output = JSON.parse(await readFile(result.output, "utf8"));
  assert.deepEqual(output, result.summary);
  assert.equal(
    Number((await lstat(result.output, { bigint: true })).mode & 0o777n),
    0o644,
  );
  assert.equal(
    path.relative(root, result.output),
    PHASE1_AGGREGATE_SUMMARY_RELATIVE,
  );
});

test("test-only live aggregation rejects a nonexistent application commit", async (t) => {
  const { root } = await isolatedRoot(t);
  const nonexistentCommit = "9".repeat(40);
  const summaries = summariesFixture(nonexistentCommit);
  const options = liveTestOptions(root, nonexistentCommit, summaries);
  options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256 = sha256(
    options[TEST_ONLY_PHASE1_AGGREGATE].phase0After.bytes,
  );
  summaries.preview.hashes.phase0EvidenceLockSha256 = (
    options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256
  );
  const result = await runFrontendUpgradePhase1Check(options);
  assert.equal(result.summary.status, "not-ready");
  assert.deepEqual(result.summary.failureCodes, ["application_commit_invalid"]);
});

test("live aggregate fails closed to not-ready without leaking validation details", async (t) => {
  const { root, commit } = await isolatedRoot(t);
  const summaries = summariesFixture(commit);
  summaries.auth.evidenceSha256 = "8".repeat(64);
  const options = liveTestOptions(root, commit, summaries);
  options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256 = sha256(
    options[TEST_ONLY_PHASE1_AGGREGATE].phase0After.bytes,
  );
  summaries.preview.hashes.phase0EvidenceLockSha256 = (
    options[TEST_ONLY_PHASE1_AGGREGATE].offline.phase0EvidenceLockSha256
  );
  const result = await runFrontendUpgradePhase1Check(options);
  assert.equal(result.summary.status, "not-ready");
  assert.deepEqual(result.summary.failureCodes, ["component_summary_mismatch"]);
  assert.equal(result.summary.counts.applicationRowsRemaining, null);
  assert.ok(!JSON.stringify(result.summary).includes("https://"));
  assert.ok(!JSON.stringify(result.summary).includes("redacted-provider-evidence"));
});

test("an offline collection exception replaces any prior result with not-ready", async (t) => {
  const { root, commit } = await isolatedRoot(t);
  const output = path.join(root, PHASE1_AGGREGATE_SUMMARY_RELATIVE);
  await writeFile(output, '{"status":"ready-for-review"}\n', { mode: 0o644 });
  const options = liveTestOptions(root, commit);
  Object.defineProperty(options[TEST_ONLY_PHASE1_AGGREGATE], "offline", {
    get() {
      throw new Error("sensitive https://example.invalid failure");
    },
  });
  const result = await runFrontendUpgradePhase1Check(options);
  assert.equal(result.summary.status, "not-ready");
  assert.deepEqual(result.summary.failureCodes, ["internal_check_failed"]);
  assert.equal(result.summary.commit, null);
  assert.ok(!(await readFile(output, "utf8")).includes("example.invalid"));
});
