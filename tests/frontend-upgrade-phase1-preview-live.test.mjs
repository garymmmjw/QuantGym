import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TEST_ONLY_PHASE1_PREVIEW_LIVE,
  readPhase1ProviderEvidence,
  runFrontendUpgradePhase1PreviewLive,
  validatePhase1ProviderEvidence,
  validatePhase1RuntimePayloads,
} from "../scripts/check-frontend-upgrade-phase1-preview-live.mjs";
import {
  PHASE1_AUTH_CLEANUP_CHANNEL,
} from "../scripts/check-frontend-upgrade-phase1-auth.mjs";
import {
  validatePhase1ComponentSummaries,
} from "../scripts/check-frontend-upgrade-phase1.mjs";
import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  PHASE0_EVIDENCE_LOCK_PATH,
  PHASE1_PROVIDER_EVIDENCE_PATH,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = new Date("2026-07-23T12:00:00.000Z");
const COMMIT = "1234567890abcdef1234567890abcdef12345678";
const PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const API_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const LEGACY_ORIGIN = "https://legacy-compat.quantgym-v2-preview.pages.dev";
const RANDOM_BYTES = Buffer.from("0123456789abcdef", "utf8");
const ENV_SECRET = "phase1-live-test-secret-never-persist";
const PRE_AUTH_CHALLENGE_HASH = "d".repeat(64);
const GOOGLE_OAUTH_CHALLENGE_HASH = "e".repeat(64);
const SURFACE_PRE_AUTH_CHALLENGE_HASH = "f".repeat(64);
const AUTH_CLEANUP_TARGETS = Object.freeze([
  Object.freeze({
    kind: "pre_auth_csrf",
    tokenHash: PRE_AUTH_CHALLENGE_HASH,
    expectedConsumed: true,
  }),
  Object.freeze({
    kind: "google_oauth",
    tokenHash: GOOGLE_OAUTH_CHALLENGE_HASH,
    expectedConsumed: true,
  }),
]);
const SURFACE_CLEANUP_TARGET = Object.freeze({
  kind: "pre_auth_csrf",
  tokenHash: SURFACE_PRE_AUTH_CHALLENGE_HASH,
  expectedConsumed: true,
});
const CLEANUP_TARGETS = Object.freeze([
  ...AUTH_CLEANUP_TARGETS,
  SURFACE_CLEANUP_TARGET,
]);
const SUMMARY_DIRECTORY = "docs/browser-audit-screenshots";
const AUTH_SUMMARY_NAME = "380-frontend-upgrade-phase-1-auth-security-summary.json";
const SURFACE_SUMMARY_NAME = "380-frontend-upgrade-phase-1-system-surfaces-summary.json";
const EXPECTED_OUTPUTS = [
  AUTH_SUMMARY_NAME,
  "380-frontend-upgrade-phase-1-legacy-boundary-summary.json",
  "380-frontend-upgrade-phase-1-postgres-migration-summary.json",
  "380-frontend-upgrade-phase-1-preview-live-summary.json",
  "380-frontend-upgrade-phase-1-r2-binding-summary.json",
  SURFACE_SUMMARY_NAME,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

const providerEvidence = () => ({
  schemaVersion: 1,
  capturedAt: "2026-07-22T12:00:00.000Z",
  expiresAt: "2026-07-25T12:00:00.000Z",
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  applicationCommit: COMMIT,
  legacyCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  postgresMajor: 18,
  governance: {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  },
  phase0ProviderEvidenceSha256: sha256("phase-zero-provider-evidence"),
  prePushBaselineSha256: sha256("pre-push-provider-baseline"),
  productionControlBefore: sha256("production-control"),
  productionControlAfter: sha256("production-control"),
  r2PolicyAttestations: {
    runtimeIdSha256: sha256("runtime-r2-access"),
    runtimePolicySha256: sha256("runtime-r2-policy"),
    runtimeExpirationStatus: "current",
    auditIdSha256: sha256("audit-r2-access"),
    auditPolicySha256: sha256("audit-r2-policy"),
    auditExpirationStatus: "short-lived",
  },
  resourceFingerprints: {
    pages: sha256("preview-pages"),
    api: sha256("preview-api"),
    llm: sha256("preview-llm"),
    postgres: sha256("preview-postgres"),
    postgresRole: sha256("preview-postgres-role"),
    r2: sha256("preview-r2"),
    previewEnvironmentGroup: sha256("preview-environment-group"),
    legacyPagesDeployment: sha256("legacy-pages-deployment"),
    productionPages: sha256("production-pages"),
    productionServices: [
      sha256("production-api"),
      sha256("production-llm"),
    ],
    productionPostgres: sha256("production-postgres"),
    productionR2: sha256("production-r2"),
    productionEnvironmentGroups: [sha256("production-environment-group")],
  },
  deployments: {
    pages: {
      provider: "cloudflare-pages",
      status: "ready",
      commit: COMMIT,
    },
    api: {
      provider: "render",
      status: "ready",
      commit: COMMIT,
    },
    llm: {
      provider: "render",
      status: "ready",
      commit: COMMIT,
    },
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

const loadedProviderEvidence = () => {
  const evidence = providerEvidence();
  const bytes = Buffer.from(`${JSON.stringify(evidence)}\n`, "utf8");
  return { evidence, bytes, sha256: sha256(bytes) };
};

const runtimePayloads = () => ({
  version: {
    schemaVersion: 1,
    commit: COMMIT,
    branch: "codex/frontend-v2-preview",
    source: "cloudflare-pages",
  },
  config: {
    schemaVersion: 1,
    apiBase: "/api/v2",
  },
  proxiedHealth: { status: "ok" },
  directHealth: { status: "ok" },
  legacyVersion: {
    commit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    branch: "legacy-compat",
    source: "cloudflare-pages",
  },
});

const authSummary = (evidenceSha256) => ({
  schemaVersion: 1,
  check: "frontend-upgrade-phase1-auth",
  status: "pass",
  checkedAt: NOW.toISOString(),
  commit: COMMIT,
  evidenceSha256,
  hashes: {
    syntheticDataSha256: sha256("synthetic-user"),
  },
  checks: {
    offlineContractPassed: true,
    hostCookiePolicy: true,
    csrfPairing: true,
    exactOriginEnforced: true,
    sessionAndCsrfRotated: true,
    logoutRevokedSession: true,
    oauthPkceS256: true,
    oauthReplayRejected: true,
    browserStorageSafe: true,
    syntheticCleanupRequired: true,
  },
  counts: {
    localStorageEntries: 1,
    sessionStorageEntries: 0,
    indexedDbRecords: 0,
    sensitiveEntries: 0,
    syntheticUsersCreated: 1,
  },
  failureCodes: [],
});

const surfaceSummary = (evidenceSha256) => ({
  schemaVersion: 1,
  check: "frontend-upgrade-phase1-system-surfaces",
  status: "pass",
  checkedAt: NOW.toISOString(),
  commit: COMMIT,
  evidenceSha256,
  hashes: {
    reviewImageSha256: Array.from(
      { length: 48 },
      (_, index) => sha256(`review-image-${index}`),
    ),
  },
  checks: {
    offlineContractPassed: true,
    fullE2eExecuted: true,
    bundleBudgetsPassed: true,
    visualMatrixPassed: true,
    accessibilityPassed: true,
    consolePassed: true,
    rejectionsPassed: true,
  },
  counts: {
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
    initialFileCount: 3,
    routeChunkCount: 22,
  },
  failureCodes: [],
});

const r2Summary = (evidenceSha256) => ({
  schemaVersion: 1,
  check: "frontend-v2-phase1-r2",
  status: "pass",
  checkedAt: NOW.toISOString(),
  commit: COMMIT,
  evidenceSha256,
  hashes: {
    bucketIdentitySha256: sha256("r2-bucket"),
    accountIdentitySha256: sha256("r2-account"),
    runtimeObjectPayloadSha256: sha256("runtime-r2-payload"),
    auditObjectPayloadSha256: sha256("audit-r2-payload"),
    runtimeAccessIdSha256: sha256("runtime-r2-access"),
    auditAccessIdSha256: sha256("audit-r2-access"),
  },
  checks: {
    providerEvidenceCurrent: true,
    runtimePolicyIdentityBound: true,
    auditPolicyIdentityBound: true,
    accessIdentitiesIndependent: true,
    isolatedPreviewBinding: true,
    resourceDistinctFromProduction: true,
    signingRegionAuto: true,
    dedicatedLifecyclePrefixUsed: true,
    runtimeProductionSignedAccessDenied: true,
    runtimeObjectsListedBefore: true,
    runtimeStaleSyntheticObjectsCleaned: true,
    runtimeSignedUploadSucceeded: true,
    runtimeAnonymousReadDenied: true,
    runtimeSignedReadSucceeded: true,
    runtimeBytesMatch: true,
    runtimeSignedDeleteSucceeded: true,
    runtimeCleanupConfirmed: true,
    runtimeObjectsListedAfter: true,
    auditProductionSignedAccessDenied: true,
    auditObjectsListedBefore: true,
    auditStaleSyntheticObjectsCleaned: true,
    auditSignedUploadSucceeded: true,
    auditAnonymousReadDenied: true,
    auditSignedReadSucceeded: true,
    auditBytesMatch: true,
    auditSignedDeleteSucceeded: true,
    auditCleanupConfirmed: true,
    auditObjectsListedAfter: true,
  },
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
  failureCodes: [],
});

const postgresSummary = (evidenceSha256) => ({
  schemaVersion: 1,
  check: "frontend-v2-phase1-postgres",
  status: "pass",
  checkedAt: NOW.toISOString(),
  commit: COMMIT,
  evidenceSha256,
  hashes: {
    postgresResourceSha256: sha256("postgres-resource"),
    postgresRoleSha256: sha256("postgres-role"),
    runtimeIdentitySha256: sha256("postgres-runtime"),
    schemaSha256: sha256("postgres-schema"),
    migrationRoundTripSha256: sha256("postgres-schema"),
  },
  checks: {
    providerEvidenceCurrent: true,
    resourceDistinctFromProduction: true,
    authenticatedPreviewBinding: true,
    postgresMajor18: true,
    ephemeralImagePinnedToPostgres18: true,
    sslForCurrentBackend: true,
    exactAlembicHead: true,
    schemaMatchesFrozenContract: true,
    legacyTablesAndColumnsAbsent: true,
    migrationRoundTripDeterministic: true,
    syntheticCleanupExplicitlyAuthorized: true,
    applicationDataCleaned: true,
  },
  counts: {
    postgresMajor: 18,
    applicationTables: 9,
    metadataTables: 1,
    applicationRows: 0,
    syntheticUsersDeleted: 1,
  },
  failureCodes: [],
});

const createIsolatedRoot = async (t) => {
  const created = await mkdtemp(path.join(tmpdir(), "quantgym-phase1-preview-live-"));
  t.after(async () => {
    await rm(created, { recursive: true, force: true });
  });
  const root = await realpath(created);
  await Promise.all([
    mkdir(path.join(root, SUMMARY_DIRECTORY), { recursive: true }),
    mkdir(path.dirname(path.join(root, PHASE0_EVIDENCE_LOCK_PATH)), {
      recursive: true,
    }),
  ]);
  const phase0Bytes = Buffer.from('{"kind":"test-phase0-lock"}\n', "utf8");
  const phase0Path = path.join(root, PHASE0_EVIDENCE_LOCK_PATH);
  await writeFile(phase0Path, phase0Bytes, { mode: 0o644 });
  await chmod(phase0Path, 0o644);
  return { root, phase0Bytes };
};

const jsonResponse = (value) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { "content-type": "application/json; charset=utf-8" },
});
const htmlResponse = (value) => new Response(value, {
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8" },
});

const buildHarness = ({ root, phase0Bytes, overrides = {} }) => {
  const provider = loadedProviderEvidence();
  const evidenceSha256 = provider.sha256;
  const events = [];
  const requests = [];
  let capturedCredentials;
  let lockChecks = 0;
  const payloads = runtimePayloads();
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const headers = new Headers(init.headers);
    requests.push(url);
    events.push(`fetch:${url}`);
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error");
    assert.equal(headers.get("accept"), url.endsWith("/") || url.endsWith("/plan")
      ? "text/html"
      : "application/json");
    switch (url) {
      case `${PREVIEW_ORIGIN}/version.json`:
        return jsonResponse(payloads.version);
      case `${PREVIEW_ORIGIN}/config.json`:
        return jsonResponse(payloads.config);
      case `${PREVIEW_ORIGIN}/api/v2/health`:
        return jsonResponse(payloads.proxiedHealth);
      case `${API_ORIGIN}/api/v2/health`:
        return jsonResponse(payloads.directHealth);
      case `${LEGACY_ORIGIN}/version.json`:
        return jsonResponse(payloads.legacyVersion);
      case `${LEGACY_ORIGIN}/`:
        return htmlResponse("<!doctype html><title>legacy root</title>");
      case `${LEGACY_ORIGIN}/plan`:
        return htmlResponse("<!doctype html><title>legacy plan</title>");
      default:
        throw new Error(`unexpected URL ${url}`);
    }
  };

  const testOnly = {
    root,
    now: NOW,
    provider,
    phase0: { lock: { kind: "test-phase0-lock" }, bytes: phase0Bytes },
    verifyLock: async ({ root: checkedRoot, headRef }) => {
      lockChecks += 1;
      events.push(`phase0:${lockChecks}`);
      assert.equal(checkedRoot, root);
      assert.equal(headRef, "HEAD");
      return [];
    },
    fetchImpl,
    randomBytes: (size) => {
      assert.equal(size, 16);
      return RANDOM_BYTES;
    },
    runAuth: async (options) => {
      events.push("auth");
      assert.equal(options.root, root);
      assert.equal(options.mode, "live");
      assert.equal(options.baseOrigin, PREVIEW_ORIGIN);
      assert.equal(options.expectedCommit, COMMIT);
      assert.equal(options.evidenceSha256, evidenceSha256);
      assert.equal(options.csrfSigningSecret, ENV_SECRET);
      for (const target of AUTH_CLEANUP_TARGETS) {
        options[PHASE1_AUTH_CLEANUP_CHANNEL](target);
      }
      capturedCredentials = options.auditCredentials;
      const summary = authSummary(evidenceSha256);
      await writeFile(
        path.join(root, SUMMARY_DIRECTORY, AUTH_SUMMARY_NAME),
        `${JSON.stringify(summary, null, 2)}\n`,
        { mode: 0o644 },
      );
      return { summary };
    },
    runSurfaces: async (options) => {
      events.push("surfaces");
      assert.deepEqual(options.credentials, capturedCredentials);
      assert.equal(options.expectedCommit, COMMIT);
      assert.equal(options.evidenceSha256, evidenceSha256);
      assert.equal(options.env.QUANTGYM_V2_CSRF_SIGNING_SECRET, ENV_SECRET);
      assert.equal(options.csrfSigningSecret, ENV_SECRET);
      options[PHASE1_AUTH_CLEANUP_CHANNEL](SURFACE_CLEANUP_TARGET);
      const summary = surfaceSummary(evidenceSha256);
      await writeFile(
        path.join(root, SUMMARY_DIRECTORY, SURFACE_SUMMARY_NAME),
        `${JSON.stringify(summary, null, 2)}\n`,
        { mode: 0o644 },
      );
      return { summary };
    },
    runR2: async (options) => {
      events.push("r2");
      assert.equal(
        options.env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY,
        ENV_SECRET,
      );
      assert.equal(
        options.env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256,
        evidenceSha256,
      );
      assert.equal(options.evidence, provider.evidence);
      assert.equal(options.evidenceSha256, evidenceSha256);
      return r2Summary(evidenceSha256);
    },
    runPostgres: async (options) => {
      events.push("postgres");
      assert.equal(
        options.env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256,
        evidenceSha256,
      );
      assert.equal(
        options.env.QUANTGYM_PHASE1_CLEANUP_SYNTHETIC_AUDIT_DATA,
        "confirmed",
      );
      assert.equal(options.evidenceSha256, evidenceSha256);
      assert.deepEqual(options.cleanupTargets, CLEANUP_TARGETS);
      return postgresSummary(evidenceSha256);
    },
    inspectLegacy: async (checkedRoot) => {
      events.push("legacy");
      assert.equal(checkedRoot, root);
      return [];
    },
    ...overrides,
  };
  return {
    provider,
    evidenceSha256,
    events,
    requests,
    testOnly,
    get capturedCredentials() {
      return capturedCredentials;
    },
    get lockChecks() {
      return lockChecks;
    },
  };
};

const runHarness = (harness, env = {}) => runFrontendUpgradePhase1PreviewLive({
  env: {
    NODE_ENV: "test",
    QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY: ENV_SECRET,
    QUANTGYM_PREVIEW_POSTGRES_URL: `postgresql://preview:${ENV_SECRET}@db.invalid/preview`,
    QUANTGYM_V2_CSRF_SIGNING_SECRET: ENV_SECRET,
    ...env,
  },
  [TEST_ONLY_PHASE1_PREVIEW_LIVE]: harness.testOnly,
});

test("provider evidence requires 0600, no-follow, single-link, path-bound reads", async (t) => {
  const prepareEvidence = async () => {
    const fixture = await createIsolatedRoot(t);
    const evidencePath = path.join(fixture.root, PHASE1_PROVIDER_EVIDENCE_PATH);
    await mkdir(path.dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, '{"schemaVersion":1}\n', { mode: 0o600 });
    await chmod(evidencePath, 0o600);
    return { ...fixture, evidencePath };
  };

  await t.test("accepts one owner-only regular file", async () => {
    const { root, evidencePath } = await prepareEvidence();
    const loaded = await readPhase1ProviderEvidence(root);
    assert.deepEqual(loaded.evidence, { schemaVersion: 1 });
    assert.equal(loaded.sha256, sha256(await readFile(evidencePath)));
  });

  await t.test("rejects broader permissions", async () => {
    const { root, evidencePath } = await prepareEvidence();
    await chmod(evidencePath, 0o644);
    await assert.rejects(readPhase1ProviderEvidence(root), /metadata is invalid/u);
  });

  await t.test("rejects a symbolic-link file", async () => {
    const { root, evidencePath } = await prepareEvidence();
    const target = path.join(root, "outside-provider.json");
    await writeFile(target, '{"schemaVersion":1}\n', { mode: 0o600 });
    await unlink(evidencePath);
    await symlink(target, evidencePath);
    await assert.rejects(readPhase1ProviderEvidence(root));
  });

  await t.test("rejects a hard-linked evidence inode", async () => {
    const { root, evidencePath } = await prepareEvidence();
    await link(evidencePath, `${evidencePath}.peer`);
    await assert.rejects(readPhase1ProviderEvidence(root), /metadata is invalid/u);
  });

  await t.test("rejects a symbolic-link parent", async () => {
    const fixture = await createIsolatedRoot(t);
    const expectedParent = path.dirname(
      path.join(fixture.root, PHASE1_PROVIDER_EVIDENCE_PATH),
    );
    const actualParent = path.join(fixture.root, "actual-provider-parent");
    await mkdir(path.dirname(expectedParent), { recursive: true });
    await mkdir(actualParent, { recursive: true });
    await writeFile(path.join(actualParent, "provider-evidence.redacted.json"), "{}\n", {
      mode: 0o600,
    });
    await symlink(actualParent, expectedParent);
    await assert.rejects(
      readPhase1ProviderEvidence(fixture.root),
      /parent is unsafe/u,
    );
  });
});

test("provider and runtime payloads are exact, current, and minimal", () => {
  assert.equal(
    validatePhase1ProviderEvidence(providerEvidence(), { nowMs: NOW.getTime() })
      .applicationCommit,
    COMMIT,
  );
  assert.equal(validatePhase1RuntimePayloads(runtimePayloads(), COMMIT).config.apiBase, "/api/v2");

  const extraConfig = runtimePayloads();
  extraConfig.config.apiOrigin = API_ORIGIN;
  assert.throws(
    () => validatePhase1RuntimePayloads(extraConfig, COMMIT),
    /public config has an unapproved shape/u,
  );

  const wrongCommit = runtimePayloads();
  wrongCommit.version.commit = "f".repeat(40);
  assert.throws(
    () => validatePhase1RuntimePayloads(wrongCommit, COMMIT),
    /Pages runtime version mismatch/u,
  );

  const wrongLegacy = runtimePayloads();
  wrongLegacy.legacyVersion.commit = COMMIT;
  assert.throws(
    () => validatePhase1RuntimePayloads(wrongLegacy, COMMIT),
    /legacy runtime version mismatch/u,
  );

  const stale = providerEvidence();
  stale.expiresAt = "2026-07-23T11:59:59.000Z";
  assert.throws(
    () => validatePhase1ProviderEvidence(stale, { nowMs: NOW.getTime() }),
    /provider evidence relationship mismatch/u,
  );
});

test("live gate checks fixed endpoints, cleans data, preserves Phase 0, and writes safe 380 evidence", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const harness = buildHarness(fixture);
  const result = await runHarness(harness);

  assert.equal(result.summary.status, "pass");
  assert.equal(result.summary.commit, COMMIT);
  assert.equal(result.summary.evidenceSha256, harness.evidenceSha256);
  assert.deepEqual(result.summary.failureCodes, []);
  assert.equal(harness.lockChecks, 2);
  assert.deepEqual(harness.requests, [
    `${PREVIEW_ORIGIN}/version.json`,
    `${PREVIEW_ORIGIN}/config.json`,
    `${PREVIEW_ORIGIN}/api/v2/health`,
    `${API_ORIGIN}/api/v2/health`,
    `${LEGACY_ORIGIN}/version.json`,
    `${LEGACY_ORIGIN}/`,
    `${LEGACY_ORIGIN}/plan`,
  ]);
  assert.ok(harness.events.indexOf("postgres") > harness.events.indexOf("r2"));
  assert.ok(harness.events.indexOf("phase0:2") > harness.events.indexOf("legacy"));

  const outputDirectory = path.join(fixture.root, SUMMARY_DIRECTORY);
  const outputNames = (await readdir(outputDirectory)).sort();
  assert.deepEqual(outputNames, EXPECTED_OUTPUTS);
  assert.equal(
    path.basename(result.output),
    "380-frontend-upgrade-phase-1-preview-live-summary.json",
  );

  const legacy = JSON.parse(await readFile(
    path.join(
      outputDirectory,
      "380-frontend-upgrade-phase-1-legacy-boundary-summary.json",
    ),
    "utf8",
  ));
  assert.equal(
    validatePhase1ComponentSummaries({
      preview: result.summary,
      postgres: postgresSummary(harness.evidenceSha256),
      r2: r2Summary(harness.evidenceSha256),
      auth: authSummary(harness.evidenceSha256),
      legacy,
      surfaces: surfaceSummary(harness.evidenceSha256),
    }, {
      expectedCommit: COMMIT,
      evidenceSha256: harness.evidenceSha256,
      phase0EvidenceLockSha256: sha256(fixture.phase0Bytes),
      productionControlSha256: harness.provider.evidence.productionControlBefore,
      providerCapturedAtMs: Date.parse(harness.provider.evidence.capturedAt),
      providerExpiresAtMs: Date.parse(harness.provider.evidence.expiresAt),
      nowMs: NOW.getTime(),
    }).preview,
    result.summary,
  );

  const credentials = harness.capturedCredentials;
  assert.match(credentials.email, /^phase1-audit-[0-9a-f]{32}@example[.]com$/u);
  const renderedOutputs = (
    await Promise.all(outputNames.map((name) => readFile(path.join(outputDirectory, name), "utf8")))
  ).join("\n");
  for (const sensitive of [
    ENV_SECRET,
    credentials.email,
    credentials.password,
    RANDOM_BYTES.toString("hex"),
    PRE_AUTH_CHALLENGE_HASH,
    GOOGLE_OAUTH_CHALLENGE_HASH,
    SURFACE_PRE_AUTH_CHALLENGE_HASH,
  ]) {
    assert.equal(renderedOutputs.includes(sensitive), false);
  }
  for (const name of outputNames) {
    assert.match(name, /^380-frontend-upgrade-phase-1-/u);
    const metadata = await lstat(path.join(outputDirectory, name));
    assert.equal(metadata.mode & 0o777, 0o644);
  }
});

test("an auth failure still runs confirmed PostgreSQL cleanup and the Phase 0 after-check", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const events = [];
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runAuth: async (options) => {
        events.push("auth-failed-after-registration");
        options[PHASE1_AUTH_CLEANUP_CHANNEL](CLEANUP_TARGETS[0]);
        throw new Error("auth probe failed after registration");
      },
      runSurfaces: async () => {
        assert.fail("surface audit must not run after auth failure");
      },
      runR2: async () => {
        assert.fail("R2 audit must not run after auth failure");
      },
      runPostgres: async ({ env, cleanupTargets }) => {
        events.push("postgres-cleanup");
        assert.equal(
          env.QUANTGYM_PHASE1_CLEANUP_SYNTHETIC_AUDIT_DATA,
          "confirmed",
        );
        assert.deepEqual(cleanupTargets, [CLEANUP_TARGETS[0]]);
        return postgresSummary(loadedProviderEvidence().sha256);
      },
    },
  });

  await assert.rejects(runHarness(harness), /auth probe failed after registration/u);
  assert.deepEqual(events, [
    "auth-failed-after-registration",
    "postgres-cleanup",
  ]);
  assert.equal(harness.lockChecks, 2);
  assert.deepEqual(await readdir(path.join(fixture.root, SUMMARY_DIRECTORY)), []);
});

test("an incomplete successful auth result cannot start the surface audit", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runAuth: async (options) => {
        options[PHASE1_AUTH_CLEANUP_CHANNEL](AUTH_CLEANUP_TARGETS[0]);
        return { summary: authSummary(loadedProviderEvidence().sha256) };
      },
      runSurfaces: async () => {
        assert.fail("surface audit must not run after incomplete auth cleanup publication");
      },
      runR2: async () => {
        assert.fail("R2 audit must not run after incomplete auth cleanup publication");
      },
      runPostgres: async ({ cleanupTargets }) => {
        assert.deepEqual(cleanupTargets, [AUTH_CLEANUP_TARGETS[0]]);
        return postgresSummary(loadedProviderEvidence().sha256);
      },
    },
  });
  await assert.rejects(
    runHarness(harness),
    /anonymous challenge cleanup targets are incomplete/u,
  );
  assert.equal(harness.lockChecks, 2);
});

test("cleanup publication rejects a second Google OAuth target", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runAuth: async (options) => {
        for (const target of AUTH_CLEANUP_TARGETS) {
          options[PHASE1_AUTH_CLEANUP_CHANNEL](target);
        }
        options[PHASE1_AUTH_CLEANUP_CHANNEL]({
          kind: "google_oauth",
          tokenHash: SURFACE_PRE_AUTH_CHALLENGE_HASH,
          expectedConsumed: true,
        });
      },
      runSurfaces: async () => {
        assert.fail("surface audit must not run after a cleanup quota violation");
      },
      runR2: async () => {
        assert.fail("R2 audit must not run after a cleanup quota violation");
      },
      runPostgres: async ({ cleanupTargets }) => {
        assert.deepEqual(cleanupTargets, AUTH_CLEANUP_TARGETS);
        return postgresSummary(loadedProviderEvidence().sha256);
      },
    },
  });
  await assert.rejects(
    runHarness(harness),
    /anonymous challenge cleanup targets are invalid/u,
  );
  assert.equal(harness.lockChecks, 2);
});

test("cleanup targets require an exact consumed-state assertion", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runAuth: async (options) => {
        options[PHASE1_AUTH_CLEANUP_CHANNEL]({
          kind: "google_oauth",
          tokenHash: GOOGLE_OAUTH_CHALLENGE_HASH,
        });
      },
      runSurfaces: async () => {
        assert.fail("surface audit must not run after an invalid cleanup target");
      },
      runR2: async () => {
        assert.fail("R2 audit must not run after an invalid cleanup target");
      },
      runPostgres: async ({ cleanupTargets }) => {
        assert.deepEqual(cleanupTargets, []);
        return postgresSummary(loadedProviderEvidence().sha256);
      },
    },
  });
  await assert.rejects(
    runHarness(harness),
    /anonymous challenge cleanup target has an unapproved shape/u,
  );
  assert.deepEqual(await readdir(path.join(fixture.root, SUMMARY_DIRECTORY)), []);
});

test("surface login must publish its distinct pre-auth cleanup target", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runSurfaces: async () => ({ summary: surfaceSummary(
        loadedProviderEvidence().sha256,
      ) }),
      runR2: async () => {
        assert.fail("R2 audit must not run with an incomplete cleanup set");
      },
      runPostgres: async ({ cleanupTargets }) => {
        assert.deepEqual(cleanupTargets, AUTH_CLEANUP_TARGETS);
        return postgresSummary(loadedProviderEvidence().sha256);
      },
    },
  });
  await assert.rejects(
    runHarness(harness),
    /anonymous challenge cleanup targets are incomplete/u,
  );
  assert.equal(harness.lockChecks, 2);
});

test("a new failed round cannot be aggregated with a complete old 380 evidence batch", async (t) => {
  const fixture = await createIsolatedRoot(t);
  for (const relativePath of APPROVED_PHASE1_ACCEPTANCE_MANIFEST.evidenceOutputs) {
    const absolutePath = path.join(fixture.root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, "old Phase 1 evidence\n", { mode: 0o644 });
  }
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runR2: async () => {
        throw new Error("new round failed after auth and surfaces");
      },
    },
  });
  await assert.rejects(
    runHarness(harness),
    /new round failed after auth and surfaces/u,
  );

  const remaining = [];
  for (const relativePath of APPROVED_PHASE1_ACCEPTANCE_MANIFEST.evidenceOutputs) {
    try {
      await lstat(path.join(fixture.root, relativePath));
      remaining.push(relativePath);
    } catch (error) {
      assert.equal(error?.code, "ENOENT");
    }
  }
  assert.deepEqual(remaining.sort(), [
    `${SUMMARY_DIRECTORY}/${AUTH_SUMMARY_NAME}`,
    `${SUMMARY_DIRECTORY}/${SURFACE_SUMMARY_NAME}`,
  ].sort());
});

test("batch invalidation rejects symlinked, hard-linked, and redirected evidence", async (t) => {
  const aggregateRelative = (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json"
  );
  await t.test("symbolic-link output", async (subtest) => {
    const fixture = await createIsolatedRoot(subtest);
    const outside = path.join(fixture.root, "outside-summary.json");
    await writeFile(outside, "must remain\n", { mode: 0o644 });
    await symlink(outside, path.join(fixture.root, aggregateRelative));
    const harness = buildHarness(fixture);
    await assert.rejects(
      runHarness(harness),
      /invalidation target is unsafe/u,
    );
    assert.equal(await readFile(outside, "utf8"), "must remain\n");
  });

  await t.test("hard-linked output", async (subtest) => {
    const fixture = await createIsolatedRoot(subtest);
    const outside = path.join(fixture.root, "outside-summary.json");
    await writeFile(outside, "must remain\n", { mode: 0o644 });
    await link(outside, path.join(fixture.root, aggregateRelative));
    const harness = buildHarness(fixture);
    await assert.rejects(
      runHarness(harness),
      /invalidation target is unsafe/u,
    );
    assert.equal(await readFile(outside, "utf8"), "must remain\n");
  });

  await t.test("symbolic-link review directory", async (subtest) => {
    const fixture = await createIsolatedRoot(subtest);
    const outsideDirectory = path.join(fixture.root, "outside-review");
    const reviewDirectory = path.join(
      fixture.root,
      SUMMARY_DIRECTORY,
      "380-frontend-upgrade-phase-1-review",
    );
    await mkdir(outsideDirectory, { recursive: true });
    await symlink(outsideDirectory, reviewDirectory);
    const harness = buildHarness(fixture);
    await assert.rejects(
      runHarness(harness),
      /evidence parent is unsafe/u,
    );
    assert.deepEqual(await readdir(outsideDirectory), []);
  });
});

test("cleanup and Phase 0 failures are fail-closed and redacted", async (t) => {
  await t.test("a cleanup failure masks both underlying errors", async () => {
    const fixture = await createIsolatedRoot(t);
    const harness = buildHarness({
      ...fixture,
      overrides: {
        runAuth: async () => {
          throw new Error(`auth failure ${ENV_SECRET}`);
        },
        runPostgres: async () => {
          throw new Error(`cleanup failure ${ENV_SECRET}`);
        },
      },
    });
    await assert.rejects(
      runHarness(harness),
      (error) => (
        error.message === "live audit and synthetic cleanup both failed"
        && !error.message.includes(ENV_SECRET)
      ),
    );
    assert.equal(harness.lockChecks, 2);
  });

  await t.test("an after-lock failure blocks all orchestrator summaries", async () => {
    const fixture = await createIsolatedRoot(t);
    let checks = 0;
    const harness = buildHarness({
      ...fixture,
      overrides: {
        verifyLock: async () => {
          checks += 1;
          return checks === 1 ? [] : ["changed"];
        },
      },
    });
    await assert.rejects(runHarness(harness), /Phase 0 evidence lock failed after/u);
    assert.equal(checks, 2);
    assert.deepEqual(
      (await readdir(path.join(fixture.root, SUMMARY_DIRECTORY))).sort(),
      [AUTH_SUMMARY_NAME, SURFACE_SUMMARY_NAME].sort(),
    );
  });
});

test("strict child envelopes reject extra fields before orchestrator summaries are written", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const provider = loadedProviderEvidence();
  const unsafe = {
    ...r2Summary(provider.sha256),
    harmless: `postgresql://preview:${ENV_SECRET}@database.invalid/preview`,
  };
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runR2: async () => unsafe,
    },
  });
  await assert.rejects(runHarness(harness), /R2 summary has an unapproved shape/u);
  assert.deepEqual(
    (await readdir(path.join(fixture.root, SUMMARY_DIRECTORY))).sort(),
    [AUTH_SUMMARY_NAME, SURFACE_SUMMARY_NAME].sort(),
  );
});

test("R2 envelope requires the runtime credential lifecycle before binding verification", async (t) => {
  const fixture = await createIsolatedRoot(t);
  const provider = loadedProviderEvidence();
  const incomplete = r2Summary(provider.sha256);
  delete incomplete.checks.runtimeSignedReadSucceeded;
  const harness = buildHarness({
    ...fixture,
    overrides: {
      runR2: async () => incomplete,
    },
  });
  await assert.rejects(runHarness(harness), /R2 checks has an unapproved shape/u);
  assert.deepEqual(
    (await readdir(path.join(fixture.root, SUMMARY_DIRECTORY))).sort(),
    [AUTH_SUMMARY_NAME, SURFACE_SUMMARY_NAME].sort(),
  );
});

test("test-only injection requires NODE_ENV=test and an isolated temporary root", async (t) => {
  const fixture = await createIsolatedRoot(t);
  await assert.rejects(
    runFrontendUpgradePhase1PreviewLive({
      env: { NODE_ENV: "production" },
      [TEST_ONLY_PHASE1_PREVIEW_LIVE]: { root: fixture.root },
    }),
    /requires NODE_ENV=test/u,
  );
  await assert.rejects(
    runFrontendUpgradePhase1PreviewLive({
      env: { NODE_ENV: "test" },
      [TEST_ONLY_PHASE1_PREVIEW_LIVE]: { root: PROJECT_ROOT },
    }),
    /isolated temporary root/u,
  );
});
