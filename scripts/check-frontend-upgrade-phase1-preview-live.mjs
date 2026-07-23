#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, realpath, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PHASE1_AUTH_CLEANUP_CHANNEL,
  runFrontendUpgradePhase1AuthCheck,
} from "./check-frontend-upgrade-phase1-auth.mjs";
import { findPhase1LegacyBoundaryFailures } from "./check-frontend-upgrade-phase1-legacy-boundary.mjs";
import { runFrontendUpgradePhase1R2Check } from "./check-frontend-upgrade-phase1-r2.mjs";
import {
  runFrontendUpgradePhase1SystemSurfacesCheck,
} from "./check-frontend-upgrade-phase1-system-surfaces.mjs";
import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  APPROVED_PHASE1_PREVIEW_CONTRACT,
  PHASE0_EVIDENCE_LOCK_PATH,
  PHASE1_PROVIDER_EVIDENCE_PATH,
  assertTrustedDirectoryChainUnchanged,
  captureTrustedDirectoryChain,
  validatePhase1ProviderEvidenceRelationships,
  verifyPhase0EvidenceLock,
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const API_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const LEGACY_ORIGIN = "https://legacy-compat.quantgym-v2-preview.pages.dev";
const SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-preview-live-summary.json"
);
const POSTGRES_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-postgres-migration-summary.json"
);
const R2_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-r2-binding-summary.json"
);
const LEGACY_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-legacy-boundary-summary.json"
);
const MAX_EVIDENCE_BYTES = 256 * 1024;
const MAX_HTTP_BYTES = 128 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const FORBIDDEN_SUMMARY_KEY = (
  /(?:url|origin|endpoint|dsn|secret|token|password|credential|cookie|csrf|oauth|session|user|header|body|stderr|stack)/iu
);
const POSTGRES_CLEANUP_ENV = "QUANTGYM_PHASE1_CLEANUP_SYNTHETIC_AUDIT_DATA";
const POSTGRES_CLEANUP_CONFIRMATION = "confirmed";
const MAX_ANONYMOUS_CHALLENGE_TARGETS = 2;
const AUTH_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json"
);
const SURFACE_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json"
);
const PHASE1_BATCH_EVIDENCE_PATHS = Object.freeze([
  SUMMARY_RELATIVE,
  ...APPROVED_PHASE1_ACCEPTANCE_MANIFEST.evidenceOutputs.filter(
    (relativePath) => relativePath !== SUMMARY_RELATIVE,
  ),
]);
const PHASE1_ORCHESTRATOR_OUTPUT_PATHS = Object.freeze(
  PHASE1_BATCH_EVIDENCE_PATHS.filter((relativePath) => (
    relativePath !== AUTH_SUMMARY_RELATIVE
    && relativePath !== SURFACE_SUMMARY_RELATIVE
    && !relativePath.startsWith(
      "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/",
    )
  )),
);
const PHASE1_BATCH_EVIDENCE_PATH_SET = new Set(PHASE1_BATCH_EVIDENCE_PATHS);

export const TEST_ONLY_PHASE1_PREVIEW_LIVE = Symbol(
  "frontend-upgrade-phase1-preview-live-test-only",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const exactKeys = (value, expected, label) => {
  if (!isObject(value)) throw new Error(`${label} is invalid`);
  const actual = Object.keys(value).sort();
  const approved = [...expected].sort();
  if (
    actual.length !== approved.length
    || actual.some((key, index) => key !== approved[index])
  ) {
    throw new Error(`${label} has an unapproved shape`);
  }
  return value;
};
const requireHash = (value, label) => {
  if (!HASH_PATTERN.test(value ?? "")) throw new Error(`${label} is invalid`);
  return value;
};
const requireSha = (value, label) => {
  if (!SHA_PATTERN.test(value ?? "")) throw new Error(`${label} is invalid`);
  return value;
};
const requireIsoTimestamp = (value, label) => {
  if (
    typeof value !== "string"
    || !value.endsWith("Z")
    || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
};
const requireNonnegativeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} is invalid`);
  }
  return value;
};
const requireTrueChecks = (value, keys, label) => {
  exactKeys(value, keys, label);
  if (keys.some((key) => value[key] !== true)) {
    throw new Error(`${label} failed`);
  }
  return value;
};
const assertNoSecretShapedSummaryKeys = (value, label = "summary") => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => (
      assertNoSecretShapedSummaryKeys(entry, `${label}[${index}]`)
    ));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (
      FORBIDDEN_SUMMARY_KEY.test(key)
      && typeof nested !== "boolean"
      && typeof nested !== "number"
      && nested !== null
    ) {
      throw new Error(`${label} contains an unsafe field`);
    }
    assertNoSecretShapedSummaryKeys(nested, `${label}.${key}`);
  }
};

const validateAnonymousChallengeTargets = (value, { complete = false } = {}) => {
  if (
    !Array.isArray(value)
    || value.length > MAX_ANONYMOUS_CHALLENGE_TARGETS
  ) {
    throw new Error("anonymous challenge cleanup targets are invalid");
  }
  const allowedKinds = new Set(["pre_auth_csrf", "google_oauth"]);
  const seenKinds = new Set();
  const validated = value.map((target) => {
    exactKeys(
      target,
      ["kind", "tokenHash", "expectedConsumed"],
      "anonymous challenge cleanup target",
    );
    if (
      !allowedKinds.has(target.kind)
      || seenKinds.has(target.kind)
      || !HASH_PATTERN.test(target.tokenHash)
      || target.expectedConsumed !== true
    ) {
      throw new Error("anonymous challenge cleanup targets are invalid");
    }
    seenKinds.add(target.kind);
    return Object.freeze({
      kind: target.kind,
      tokenHash: target.tokenHash,
      expectedConsumed: true,
    });
  });
  if (
    complete
    && (
      validated.length !== MAX_ANONYMOUS_CHALLENGE_TARGETS
      || ![...allowedKinds].every((kind) => seenKinds.has(kind))
    )
  ) {
    throw new Error("anonymous challenge cleanup targets are incomplete");
  }
  return Object.freeze(validated);
};

const execFileWithInput = (
  executable,
  argumentsList,
  options,
  input,
) => new Promise((resolve, reject) => {
  let inputFailure;
  const child = execFile(
    executable,
    argumentsList,
    options,
    (error, stdout, stderr) => {
      if (error || inputFailure) {
        reject(error ?? inputFailure);
        return;
      }
      resolve({ stdout, stderr });
    },
  );
  child.stdin.once("error", (error) => {
    inputFailure = error;
  });
  child.stdin.end(input);
});

const secureRead = async (
  root,
  relativePath,
  { maximumBytes = MAX_EVIDENCE_BYTES, requiredMode = null } = {},
) => {
  const rootReal = await realpath(root);
  const candidate = path.join(rootReal, relativePath);
  const parent = path.dirname(candidate);
  const parentStats = await lstat(parent, { bigint: true });
  if (parentStats.isSymbolicLink() || !parentStats.isDirectory()) {
    throw new Error(`${relativePath} parent is unsafe`);
  }
  const parentReal = await realpath(parent);
  if (parentReal !== parent) throw new Error(`${relativePath} parent is unsafe`);
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is unavailable");
  }
  const handle = await open(candidate, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    const currentUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : before.uid;
    if (
      !before.isFile()
      || before.nlink !== 1n
      || before.uid !== currentUid
      || before.size <= 0n
      || before.size > BigInt(maximumBytes)
      || (requiredMode !== null && Number(before.mode & 0o7777n) !== requiredMode)
    ) {
      throw new Error(`${relativePath} metadata is invalid`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "uid", "nlink", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) {
        throw new Error(`${relativePath} changed while being read`);
      }
    }
    if (bytes.length !== Number(after.size)) {
      throw new Error(`${relativePath} changed while being read`);
    }
    const pathAfter = await lstat(candidate, { bigint: true });
    for (const field of ["dev", "ino", "mode", "uid", "nlink", "size", "mtimeNs", "ctimeNs"]) {
      if (after[field] !== pathAfter[field]) {
        throw new Error(`${relativePath} path changed while being read`);
      }
    }
    const parentAfter = await lstat(parent, { bigint: true });
    for (const field of ["dev", "ino", "mode"]) {
      if (parentStats[field] !== parentAfter[field]) {
        throw new Error(`${relativePath} parent changed while being read`);
      }
    }
    if (await realpath(candidate) !== candidate) {
      throw new Error(`${relativePath} resolves outside its approved path`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
};

export async function readPhase1ProviderEvidence(root = defaultRoot) {
  const bytes = await secureRead(root, PHASE1_PROVIDER_EVIDENCE_PATH, {
    requiredMode: 0o600,
  });
  let evidence;
  try {
    evidence = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("provider evidence JSON is invalid");
  }
  return { evidence, bytes, sha256: sha256(bytes) };
}

export function validatePhase1ProviderEvidence(
  evidence,
  { nowMs = Date.now(), expectedCommit } = {},
) {
  exactKeys(evidence, [
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
  ], "provider evidence");
  if (
    evidence.schemaVersion !== 1
    || evidence.environment !== "preview"
    || evidence.branch !== APPROVED_PHASE1_PREVIEW_CONTRACT.branch
    || evidence.postgresMajor !== 18
    || evidence.legacyCommit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT
  ) {
    throw new Error("provider evidence contract mismatch");
  }
  requireIsoTimestamp(evidence.capturedAt, "provider capturedAt");
  requireIsoTimestamp(evidence.expiresAt, "provider expiresAt");
  requireSha(evidence.applicationCommit, "provider application commit");
  if (expectedCommit !== undefined && evidence.applicationCommit !== expectedCommit) {
    throw new Error("provider application commit mismatch");
  }
  requireHash(evidence.productionControlBefore, "production before fingerprint");
  requireHash(evidence.productionControlAfter, "production after fingerprint");
  requireHash(
    evidence.phase0ProviderEvidenceSha256,
    "Phase 0 provider evidence fingerprint",
  );
  requireHash(evidence.prePushBaselineSha256, "pre-push baseline fingerprint");
  exactKeys(evidence.r2PolicyAttestations, [
    "runtimeIdSha256",
    "runtimePolicySha256",
    "runtimeExpirationStatus",
    "auditIdSha256",
    "auditPolicySha256",
    "auditExpirationStatus",
  ], "R2 policy attestations");
  for (const key of [
    "runtimeIdSha256",
    "runtimePolicySha256",
    "auditIdSha256",
    "auditPolicySha256",
  ]) {
    requireHash(evidence.r2PolicyAttestations[key], `R2 policy attestation ${key}`);
  }
  if (
    evidence.r2PolicyAttestations.runtimeIdSha256
      === evidence.r2PolicyAttestations.auditIdSha256
    || evidence.r2PolicyAttestations.runtimeExpirationStatus !== "current"
    || evidence.r2PolicyAttestations.auditExpirationStatus !== "short-lived"
  ) {
    throw new Error("R2 policy attestations mismatch");
  }
  exactKeys(evidence.governance, [
    "operator",
    "budgetOwner",
    "dataResetOwner",
    "destroyOwner",
    "reviewDate",
  ], "provider governance");
  if (
    JSON.stringify(evidence.governance)
    !== JSON.stringify(APPROVED_PHASE1_PREVIEW_CONTRACT.governance)
  ) {
    throw new Error("provider governance mismatch");
  }

  exactKeys(evidence.resourceFingerprints, [
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
  ], "provider resource fingerprints");
  for (const [key, value] of Object.entries(evidence.resourceFingerprints)) {
    if (Array.isArray(value)) {
      if (key === "productionServices" && value.length !== 2) {
        throw new Error("production service fingerprints are invalid");
      }
      if (new Set(value).size !== value.length) {
        throw new Error(`${key} fingerprints are not unique`);
      }
      value.forEach((entry) => requireHash(entry, `${key} fingerprint`));
    } else {
      requireHash(value, `${key} fingerprint`);
    }
  }

  exactKeys(evidence.deployments, ["pages", "api", "llm", "legacy"], "deployments");
  for (const [name, provider] of [
    ["pages", "cloudflare-pages"],
    ["api", "render"],
    ["llm", "render"],
  ]) {
    const deployment = exactKeys(
      evidence.deployments[name],
      ["provider", "status", "commit"],
      `${name} deployment`,
    );
    if (
      deployment.provider !== provider
      || deployment.status !== "ready"
      || deployment.commit !== evidence.applicationCommit
    ) {
      throw new Error(`${name} deployment mismatch`);
    }
  }
  const legacy = exactKeys(
    evidence.deployments.legacy,
    ["provider", "status", "commit", "branch", "aliasSha256"],
    "legacy deployment",
  );
  if (
    legacy.provider !== "cloudflare-pages"
    || legacy.status !== "ready"
    || legacy.commit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT
    || legacy.branch !== "legacy-compat"
    || legacy.aliasSha256 !== APPROVED_LEGACY_PAGES_ALIAS_SHA256
  ) {
    throw new Error("legacy deployment mismatch");
  }
  exactKeys(evidence.bindings, ["postgres", "r2"], "bindings");
  for (const value of Object.values(evidence.bindings)) {
    exactKeys(value, ["status", "isolated"], "provider binding");
    if (value.status !== "ready" || value.isolated !== true) {
      throw new Error("provider binding mismatch");
    }
  }
  const controlKeys = [
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
  ];
  exactKeys(evidence.controls, controlKeys, "provider controls");
  if (controlKeys.some((key) => evidence.controls[key] !== true)) {
    throw new Error("provider controls are not locked");
  }
  const relationshipFailures = validatePhase1ProviderEvidenceRelationships(
    evidence,
    nowMs,
  );
  if (relationshipFailures.length > 0) {
    throw new Error(`provider evidence relationship mismatch: ${relationshipFailures[0]}`);
  }
  return evidence;
}

const responseBytes = async (response, label, expectedContentType) => {
  if (!response || response.status !== 200) throw new Error(`${label} failed`);
  const contentLengthValue = response.headers?.get?.("content-length");
  if (contentLengthValue !== null && contentLengthValue !== undefined) {
    if (
      !/^\d+$/u.test(contentLengthValue)
      || Number(contentLengthValue) > MAX_HTTP_BYTES
    ) {
      throw new Error(`${label} is too large`);
    }
  }
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith(expectedContentType)) {
    throw new Error(`${label} has an invalid content type`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 0 || bytes.length > MAX_HTTP_BYTES) {
    throw new Error(`${label} is invalid`);
  }
  return bytes;
};

const responseJson = async (response, label) => {
  const bytes = await responseBytes(response, label, "application/json");
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} JSON is invalid`);
  }
};

const fetchJson = async (fetchImpl, url, label) => {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  return responseJson(response, label);
};

const fetchDocument = async (fetchImpl, url, label) => {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "text/html" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const bytes = await responseBytes(response, label, "text/html");
  return { bytes: bytes.length, sha256: sha256(bytes) };
};

export function validatePhase1RuntimePayloads(payloads, expectedCommit) {
  requireSha(expectedCommit, "expected runtime commit");
  const version = exactKeys(
    payloads.version,
    ["schemaVersion", "commit", "branch", "source"],
    "Pages version",
  );
  if (
    version.schemaVersion !== 1
    || version.commit !== expectedCommit
    || version.branch !== APPROVED_PHASE1_PREVIEW_CONTRACT.branch
    || version.source !== "cloudflare-pages"
  ) {
    throw new Error("Pages runtime version mismatch");
  }
  const config = exactKeys(
    payloads.config,
    ["schemaVersion", "apiBase"],
    "public config",
  );
  if (config.schemaVersion !== 1 || config.apiBase !== "/api/v2") {
    throw new Error("public config mismatch");
  }
  for (const [name, health] of [
    ["proxied API health", payloads.proxiedHealth],
    ["direct API health", payloads.directHealth],
  ]) {
    exactKeys(health, ["status"], name);
    if (health.status !== "ok") throw new Error(`${name} mismatch`);
  }
  const legacy = exactKeys(
    payloads.legacyVersion,
    ["commit", "branch", "source"],
    "legacy version",
  );
  if (
    legacy.commit !== ACCEPTED_PHASE0_DEPLOYMENT_COMMIT
    || legacy.branch !== "legacy-compat"
    || legacy.source !== "cloudflare-pages"
  ) {
    throw new Error("legacy runtime version mismatch");
  }
  return payloads;
}

const runPostgresCli = async ({
  root,
  env,
  evidenceSha256,
  cleanupTargets,
}) => {
  const executable = env.QUANTGYM_PYTHON_313 ?? "python3.13";
  if (
    typeof executable !== "string"
    || executable.length === 0
    || /[\u0000-\u001f\u007f]/u.test(executable)
  ) {
    throw new Error("Python 3.13 executable is invalid");
  }
  const targets = validateAnonymousChallengeTargets(cleanupTargets);
  const cleanupInput = JSON.stringify({
    schemaVersion: 1,
    anonymousChallengeTargets: targets,
  });
  let result;
  try {
    result = await execFileWithInput(
      executable,
      ["scripts/check-frontend-upgrade-phase1-postgres.py"],
      {
        cwd: root,
        env: {
          ...env,
          QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256: evidenceSha256,
          [POSTGRES_CLEANUP_ENV]: POSTGRES_CLEANUP_CONFIRMATION,
        },
        encoding: "utf8",
        maxBuffer: MAX_EVIDENCE_BYTES,
        timeout: 10 * 60 * 1000,
      },
      cleanupInput,
    );
  } catch {
    throw new Error("PostgreSQL Phase 1 check failed");
  }
  let summary;
  try {
    summary = JSON.parse(result.stdout);
  } catch {
    throw new Error("PostgreSQL Phase 1 summary is invalid");
  }
  if (
    summary?.status !== "pass"
    || summary?.check !== "frontend-v2-phase1-postgres"
  ) {
    throw new Error("PostgreSQL Phase 1 check failed");
  }
  return summary;
};

const validateComponentSummary = (summary, {
  check,
  expectedCommit,
  evidenceSha256,
}) => {
  if (
    !isObject(summary)
    || summary.schemaVersion !== 1
    || summary.status !== "pass"
    || summary.check !== check
  ) {
    throw new Error(`${check} summary failed`);
  }
  if (summary.commit !== expectedCommit) throw new Error(`${check} commit mismatch`);
  if (
    evidenceSha256 !== undefined
    && summary.evidenceSha256 !== evidenceSha256
  ) {
    throw new Error(`${check} evidence mismatch`);
  }
  return summary;
};

const requireEmptyFailureCodes = (value, label) => {
  if (!Array.isArray(value) || value.length !== 0) {
    throw new Error(`${label} failure codes are invalid`);
  }
};

const validateAuthSummary = (summary, expectedCommit, evidenceSha256) => {
  validateComponentSummary(summary, {
    check: "frontend-upgrade-phase1-auth",
    expectedCommit,
    evidenceSha256,
  });
  exactKeys(summary, [
    "schemaVersion",
    "check",
    "status",
    "checkedAt",
    "commit",
    "evidenceSha256",
    "hashes",
    "checks",
    "counts",
    "failureCodes",
  ], "auth summary");
  requireIsoTimestamp(summary.checkedAt, "auth checkedAt");
  exactKeys(summary.hashes, ["syntheticDataSha256"], "auth hashes");
  requireHash(summary.hashes.syntheticDataSha256, "auth synthetic-data fingerprint");
  requireTrueChecks(summary.checks, [
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
  ], "auth checks");
  exactKeys(summary.counts, [
    "localStorageEntries",
    "sessionStorageEntries",
    "indexedDbRecords",
    "sensitiveEntries",
    "syntheticUsersCreated",
  ], "auth counts");
  for (const [key, value] of Object.entries(summary.counts)) {
    requireNonnegativeInteger(value, `auth count ${key}`);
  }
  if (
    summary.counts.sensitiveEntries !== 0
    || summary.counts.syntheticUsersCreated !== 1
  ) {
    throw new Error("auth counts mismatch");
  }
  requireEmptyFailureCodes(summary.failureCodes, "auth");
  return summary;
};

const validateSurfaceSummary = (summary, expectedCommit, evidenceSha256) => {
  validateComponentSummary(summary, {
    check: "frontend-upgrade-phase1-system-surfaces",
    expectedCommit,
    evidenceSha256,
  });
  exactKeys(summary, [
    "schemaVersion",
    "check",
    "status",
    "checkedAt",
    "commit",
    "evidenceSha256",
    "hashes",
    "checks",
    "counts",
    "failureCodes",
  ], "system-surface summary");
  requireIsoTimestamp(summary.checkedAt, "system-surface checkedAt");
  exactKeys(summary.hashes, ["reviewImageSha256"], "system-surface hashes");
  if (
    !Array.isArray(summary.hashes.reviewImageSha256)
    || summary.hashes.reviewImageSha256.length !== 48
  ) {
    throw new Error("system-surface image fingerprints are invalid");
  }
  summary.hashes.reviewImageSha256.forEach((value) => (
    requireHash(value, "system-surface image fingerprint")
  ));
  requireTrueChecks(summary.checks, [
    "offlineContractPassed",
    "fullE2eExecuted",
    "bundleBudgetsPassed",
    "visualMatrixPassed",
    "accessibilityPassed",
    "consolePassed",
    "rejectionsPassed",
  ], "system-surface checks");
  exactKeys(summary.counts, [
    "systemSurfaces",
    "targetGates",
    "executedE2eTests",
    "skippedE2eTests",
    "failedE2eTests",
    "flakyE2eTests",
    "activatedFutureStates",
    "visualCases",
    "seriousOrCriticalAxeFindings",
    "applicationConsoleErrors",
    "unhandledRejections",
    "initialJsGzipBytes",
    "initialJsBudgetBytes",
    "largestRouteChunkGzipBytes",
    "routeChunkBudgetBytes",
    "initialFileCount",
    "routeChunkCount",
  ], "system-surface counts");
  for (const [key, value] of Object.entries(summary.counts)) {
    requireNonnegativeInteger(value, `system-surface count ${key}`);
  }
  if (
    summary.counts.systemSurfaces !== 8
    || summary.counts.targetGates !== 82
    || summary.counts.executedE2eTests !== 82
    || summary.counts.skippedE2eTests !== 0
    || summary.counts.failedE2eTests !== 0
    || summary.counts.flakyE2eTests !== 0
    || summary.counts.activatedFutureStates !== 6
    || summary.counts.visualCases !== 48
    || summary.counts.seriousOrCriticalAxeFindings !== 0
    || summary.counts.applicationConsoleErrors !== 0
    || summary.counts.unhandledRejections !== 0
    || summary.counts.initialJsBudgetBytes !== 180 * 1024
    || summary.counts.routeChunkBudgetBytes !== 100 * 1024
    || summary.counts.initialJsGzipBytes > summary.counts.initialJsBudgetBytes
    || summary.counts.largestRouteChunkGzipBytes > summary.counts.routeChunkBudgetBytes
  ) {
    throw new Error("system-surface counts mismatch");
  }
  requireEmptyFailureCodes(summary.failureCodes, "system-surface");
  return summary;
};

const validateR2Summary = (summary, expectedCommit, evidenceSha256) => {
  validateComponentSummary(summary, {
    check: "frontend-v2-phase1-r2",
    expectedCommit,
    evidenceSha256,
  });
  exactKeys(summary, [
    "schemaVersion",
    "check",
    "status",
    "checkedAt",
    "commit",
    "evidenceSha256",
    "hashes",
    "checks",
    "counts",
    "failureCodes",
  ], "R2 summary");
  requireIsoTimestamp(summary.checkedAt, "R2 checkedAt");
  exactKeys(summary.hashes, [
    "bucketIdentitySha256",
    "accountIdentitySha256",
    "runtimeObjectPayloadSha256",
    "auditObjectPayloadSha256",
    "runtimeAccessIdSha256",
    "auditAccessIdSha256",
  ], "R2 hashes");
  Object.values(summary.hashes).forEach((value) => requireHash(value, "R2 hash"));
  requireTrueChecks(summary.checks, [
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
  ], "R2 checks");
  exactKeys(summary.counts, [
    "runtimeObjectsFoundBefore",
    "runtimeStaleObjectsDeleted",
    "runtimeObjectsCreated",
    "runtimeObjectsRemaining",
    "auditObjectsFoundBefore",
    "auditStaleObjectsDeleted",
    "auditObjectsCreated",
    "auditObjectsRemaining",
  ], "R2 counts");
  for (const [key, value] of Object.entries(summary.counts)) {
    requireNonnegativeInteger(value, `R2 count ${key}`);
  }
  if (
    summary.counts.runtimeStaleObjectsDeleted
      !== summary.counts.runtimeObjectsFoundBefore
    || summary.counts.runtimeObjectsCreated !== 1
    || summary.counts.runtimeObjectsRemaining !== 0
    || summary.counts.auditStaleObjectsDeleted
      !== summary.counts.auditObjectsFoundBefore
    || summary.counts.auditObjectsCreated !== 1
    || summary.counts.auditObjectsRemaining !== 0
  ) {
    throw new Error("R2 counts mismatch");
  }
  requireEmptyFailureCodes(summary.failureCodes, "R2");
  return summary;
};

const validatePostgresSummary = (summary, expectedCommit, evidenceSha256) => {
  validateComponentSummary(summary, {
    check: "frontend-v2-phase1-postgres",
    expectedCommit,
    evidenceSha256,
  });
  exactKeys(summary, [
    "schemaVersion",
    "check",
    "status",
    "checkedAt",
    "commit",
    "evidenceSha256",
    "hashes",
    "checks",
    "counts",
    "failureCodes",
  ], "PostgreSQL summary");
  requireIsoTimestamp(summary.checkedAt, "PostgreSQL checkedAt");
  exactKeys(summary.hashes, [
    "postgresResourceSha256",
    "postgresRoleSha256",
    "runtimeIdentitySha256",
    "schemaSha256",
    "migrationRoundTripSha256",
  ], "PostgreSQL hashes");
  Object.values(summary.hashes).forEach((value) => (
    requireHash(value, "PostgreSQL hash")
  ));
  requireTrueChecks(summary.checks, [
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
  ], "PostgreSQL checks");
  exactKeys(summary.counts, [
    "postgresMajor",
    "applicationTables",
    "metadataTables",
    "applicationRows",
    "syntheticUsersDeleted",
  ], "PostgreSQL counts");
  for (const [key, value] of Object.entries(summary.counts)) {
    requireNonnegativeInteger(value, `PostgreSQL count ${key}`);
  }
  if (
    summary.counts.postgresMajor !== 18
    || summary.counts.applicationTables !== 9
    || summary.counts.metadataTables !== 1
    || summary.counts.applicationRows !== 0
  ) {
    throw new Error("PostgreSQL counts mismatch");
  }
  requireEmptyFailureCodes(summary.failureCodes, "PostgreSQL");
  return summary;
};

const sameMetadata = (left, right, fields) => (
  fields.every((field) => left[field] === right[field])
);

const captureEvidenceParentChainIfPresent = async (root, relativeDirectory) => {
  const rootSnapshot = await captureTrustedDirectoryChain(root, ".");
  const entries = [...rootSnapshot.entries];
  let current = rootSnapshot.root;
  const segments = relativeDirectory === "."
    ? []
    : relativeDirectory.split("/");
  for (const segment of segments) {
    const candidate = path.join(current, segment);
    let metadata;
    try {
      metadata = await lstat(candidate, { bigint: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const snapshot = { root: rootSnapshot.root, relativeDirectory, entries };
      await assertTrustedDirectoryChainUnchanged(snapshot);
      try {
        await lstat(candidate);
      } catch (secondError) {
        if (secondError?.code === "ENOENT") return null;
        throw secondError;
      }
      throw new Error("evidence directory appeared during invalidation");
    }
    if (
      metadata.isSymbolicLink()
      || !metadata.isDirectory()
      || await realpath(candidate) !== candidate
    ) {
      throw new Error("Phase 1 evidence parent is unsafe");
    }
    entries.push({ path: candidate, metadata });
    current = candidate;
  }
  const snapshot = { root: rootSnapshot.root, relativeDirectory, entries };
  await assertTrustedDirectoryChainUnchanged(snapshot);
  return snapshot;
};

const invalidatePhase1EvidencePath = async (root, relativePath) => {
  if (
    !PHASE1_BATCH_EVIDENCE_PATH_SET.has(relativePath)
    || typeof fsConstants.O_NOFOLLOW !== "number"
  ) {
    throw new Error("Phase 1 evidence invalidation path is unsafe");
  }
  const rootReal = await realpath(root);
  if (rootReal !== path.resolve(root)) {
    throw new Error("Phase 1 evidence root is unsafe");
  }
  const candidate = path.join(rootReal, relativePath);
  const relative = path.relative(rootReal, candidate);
  if (
    relative !== relativePath.split("/").join(path.sep)
    || relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("Phase 1 evidence invalidation escaped its root");
  }
  const relativeDirectory = path.posix.dirname(relativePath);
  const directorySnapshot = await captureEvidenceParentChainIfPresent(
    rootReal,
    relativeDirectory,
  );
  if (directorySnapshot === null) return false;

  let pathMetadata;
  try {
    pathMetadata = await lstat(candidate, { bigint: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await assertTrustedDirectoryChainUnchanged(directorySnapshot);
    try {
      await lstat(candidate);
    } catch (secondError) {
      if (secondError?.code === "ENOENT") return false;
      throw secondError;
    }
    throw new Error("Phase 1 evidence appeared during invalidation");
  }
  const currentUid = typeof process.getuid === "function"
    ? BigInt(process.getuid())
    : pathMetadata.uid;
  if (
    !pathMetadata.isFile()
    || pathMetadata.isSymbolicLink()
    || pathMetadata.nlink !== 1n
    || pathMetadata.uid !== currentUid
    || Number(pathMetadata.mode & 0o7777n) !== 0o644
    || await realpath(candidate) !== candidate
  ) {
    throw new Error("Phase 1 evidence invalidation target is unsafe");
  }

  const handle = await open(candidate, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const openedMetadata = await handle.stat({ bigint: true });
    const identityFields = ["dev", "ino", "mode", "uid", "nlink", "size", "mtimeNs", "ctimeNs"];
    if (!sameMetadata(pathMetadata, openedMetadata, identityFields)) {
      throw new Error("Phase 1 evidence changed before invalidation");
    }
    const pathBeforeUnlink = await lstat(candidate, { bigint: true });
    if (!sameMetadata(openedMetadata, pathBeforeUnlink, identityFields)) {
      throw new Error("Phase 1 evidence path changed before invalidation");
    }
    await assertTrustedDirectoryChainUnchanged(directorySnapshot);
    await unlink(candidate);
    const unlinkedMetadata = await handle.stat({ bigint: true });
    if (
      !sameMetadata(openedMetadata, unlinkedMetadata, ["dev", "ino", "mode", "uid", "size"])
      || unlinkedMetadata.nlink !== 0n
    ) {
      throw new Error("Phase 1 evidence invalidation did not remove the opened inode");
    }
    try {
      await lstat(candidate);
      throw new Error("Phase 1 evidence path remains after invalidation");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await assertTrustedDirectoryChainUnchanged(
      directorySnapshot,
      { allowLeafMetadataChange: true },
    );
    return true;
  } finally {
    await handle.close();
  }
};

export const invalidatePhase1EvidenceBatch = async (
  root,
  paths = PHASE1_BATCH_EVIDENCE_PATHS,
) => {
  if (
    paths !== PHASE1_BATCH_EVIDENCE_PATHS
    || paths.length !== APPROVED_PHASE1_ACCEPTANCE_MANIFEST.evidenceOutputs.length
  ) {
    throw new Error("Phase 1 evidence invalidation set is incomplete");
  }
  for (const relativePath of paths) {
    await invalidatePhase1EvidencePath(root, relativePath);
  }
};

const isOutsideRootAncestorChurn = (error, root) => {
  if (!(error instanceof Error)) return false;
  const prefix = "unsafe ancestor directory changed ";
  if (!error.message.startsWith(prefix)) return false;
  const changedPath = error.message.slice(prefix.length);
  const relative = path.relative(changedPath, root);
  return (
    relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
};

const invalidatePhase1EvidenceBatchWithRetry = async (
  root,
  { retryTemporaryAncestorChurn = false } = {},
) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await invalidatePhase1EvidenceBatch(root);
      return;
    } catch (error) {
      if (
        !retryTemporaryAncestorChurn
        || !isOutsideRootAncestorChurn(error, root)
        || attempt === 19
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
};

const removeIsolatedTestWriteResidue = async (root, relativePath) => {
  const parent = path.join(root, path.posix.dirname(relativePath));
  if (await realpath(parent) !== parent) {
    throw new Error("test evidence parent is unsafe");
  }
  const prefix = `${path.posix.basename(relativePath)}.tmp-`;
  const entries = await readdir(parent, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;
    if (!/^[0-9a-f]{32}$/u.test(entry.name.slice(prefix.length))) {
      throw new Error("test evidence temporary path is unsafe");
    }
    const candidate = path.join(parent, entry.name);
    const metadata = await lstat(candidate, { bigint: true });
    const currentUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : metadata.uid;
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.nlink !== 1n
      || metadata.uid !== currentUid
      || Number(metadata.mode & 0o7777n) !== 0o644
    ) {
      throw new Error("test evidence temporary file is unsafe");
    }
    await unlink(candidate);
  }
};

const writeSafeSummary = async (
  root,
  relativePath,
  summary,
  { retryTemporaryAncestorChurn = false } = {},
) => {
  assertNoSecretShapedSummaryKeys(summary);
  const operation = {
    root,
    relativePath,
    data: `${JSON.stringify(summary, null, 2)}\n`,
    mode: 0o644,
  };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await writeFileAtomicallyWithinTrustedRoot(operation);
      if (retryTemporaryAncestorChurn) {
        await removeIsolatedTestWriteResidue(root, relativePath);
      }
      return;
    } catch (error) {
      if (
        !retryTemporaryAncestorChurn
        || !isOutsideRootAncestorChurn(error, root)
        || attempt === 19
      ) {
        throw error;
      }
      await removeIsolatedTestWriteResidue(root, relativePath);
      await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
};

const phase0LockFromDisk = async (root) => {
  const bytes = await secureRead(root, PHASE0_EVIDENCE_LOCK_PATH, {
    requiredMode: 0o644,
  });
  let lock;
  try {
    lock = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Phase 0 evidence lock JSON is invalid");
  }
  return { lock, bytes };
};

const assertIsolatedTemporaryTestRoot = async (root) => {
  const [rootReal, temporaryReal] = await Promise.all([
    realpath(root),
    realpath(tmpdir()),
  ]);
  const relative = path.relative(temporaryReal, rootReal);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("test-only live injection requires an isolated temporary root");
  }
  return rootReal;
};

export async function runFrontendUpgradePhase1PreviewLive(options = {}) {
  const testOnly = options[TEST_ONLY_PHASE1_PREVIEW_LIVE];
  const env = options.env ?? process.env;
  if (testOnly && env.NODE_ENV !== "test") {
    throw new Error("test-only live injection requires NODE_ENV=test");
  }
  const requestedRoot = path.resolve(testOnly?.root ?? options.root ?? defaultRoot);
  const root = testOnly
    ? await assertIsolatedTemporaryTestRoot(requestedRoot)
    : requestedRoot;
  await invalidatePhase1EvidenceBatchWithRetry(root, {
    retryTemporaryAncestorChurn: Boolean(testOnly),
  });
  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("check time is invalid");
  const loadedProvider = testOnly?.provider
    ?? await readPhase1ProviderEvidence(root);
  const providerEvidence = validatePhase1ProviderEvidence(loadedProvider.evidence, {
    nowMs: now.getTime(),
    expectedCommit: options.expectedCommit,
  });
  const providerEvidenceSha256 = requireHash(
    loadedProvider.sha256 ?? sha256(loadedProvider.bytes),
    "provider evidence SHA-256",
  );
  const expectedCommit = providerEvidence.applicationCommit;

  const loadedLock = testOnly?.phase0
    ?? await phase0LockFromDisk(root);
  const phase0LockSha256 = sha256(loadedLock.bytes);
  const verifyLock = testOnly?.verifyLock ?? verifyPhase0EvidenceLock;
  const beforeFailures = await verifyLock({
    root,
    lock: loadedLock.lock,
    headRef: "HEAD",
  });
  if (!Array.isArray(beforeFailures) || beforeFailures.length > 0) {
    throw new Error("Phase 0 evidence lock failed before live audit");
  }

  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("HTTPS fetch is unavailable");
  const runAuth = testOnly?.runAuth ?? runFrontendUpgradePhase1AuthCheck;
  const runSurfaces = testOnly?.runSurfaces
    ?? runFrontendUpgradePhase1SystemSurfacesCheck;
  const runR2 = testOnly?.runR2 ?? runFrontendUpgradePhase1R2Check;
  const runPostgres = testOnly?.runPostgres ?? runPostgresCli;
  const inspectLegacy = testOnly?.inspectLegacy ?? findPhase1LegacyBoundaryFailures;

  let legacyRootDocument;
  let legacyPlanDocument;
  let postgresSummary;
  let authResult;
  let surfaceResult;
  let r2Summary;
  let auditFailure;
  try {
    const payloads = {
      version: await fetchJson(
        fetchImpl,
        `${PREVIEW_ORIGIN}/version.json`,
        "Pages version",
      ),
      config: await fetchJson(
        fetchImpl,
        `${PREVIEW_ORIGIN}/config.json`,
        "public config",
      ),
      proxiedHealth: await fetchJson(
        fetchImpl,
        `${PREVIEW_ORIGIN}/api/v2/health`,
        "proxied API health",
      ),
      directHealth: await fetchJson(
        fetchImpl,
        `${API_ORIGIN}/api/v2/health`,
        "direct API health",
      ),
      legacyVersion: await fetchJson(
        fetchImpl,
        `${LEGACY_ORIGIN}/version.json`,
        "legacy version",
      ),
    };
    validatePhase1RuntimePayloads(payloads, expectedCommit);
    [legacyRootDocument, legacyPlanDocument] = await Promise.all([
      fetchDocument(fetchImpl, `${LEGACY_ORIGIN}/`, "legacy root"),
      fetchDocument(fetchImpl, `${LEGACY_ORIGIN}/plan`, "legacy plan"),
    ]);

    const randomSource = (testOnly?.randomBytes ?? randomBytes)(16);
    if (
      !(randomSource instanceof Uint8Array)
      || randomSource.byteLength !== 16
    ) {
      throw new Error("audit randomness is invalid");
    }
    const random = Buffer.from(randomSource).toString("hex");
    const credentials = {
      email: `phase1-audit-${random}@example.invalid`,
      password: `Qg!${random}aZ9`,
    };

    let componentFailure;
    let authAttempted = false;
    let anonymousChallengeTargets = Object.freeze([]);
    const recordAnonymousChallengeTarget = (target) => {
      anonymousChallengeTargets = validateAnonymousChallengeTargets([
        ...anonymousChallengeTargets,
        target,
      ]);
    };
    try {
      authAttempted = true;
      authResult = await runAuth({
        root,
        mode: "live",
        baseOrigin: PREVIEW_ORIGIN,
        expectedCommit,
        evidenceSha256: providerEvidenceSha256,
        checkedAt: now,
        auditCredentials: credentials,
        csrfSigningSecret: env.QUANTGYM_V2_CSRF_SIGNING_SECRET,
        [PHASE1_AUTH_CLEANUP_CHANNEL]: recordAnonymousChallengeTarget,
      });
      validateAnonymousChallengeTargets(
        anonymousChallengeTargets,
        { complete: true },
      );
      surfaceResult = await runSurfaces({
        root,
        mode: "live",
        expectedCommit,
        evidenceSha256: providerEvidenceSha256,
        checkedAt: now,
        credentials,
      });
      r2Summary = await runR2({
        env: {
          ...env,
          QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256: providerEvidenceSha256,
        },
        evidence: providerEvidence,
        evidenceSha256: providerEvidenceSha256,
      });
    } catch (error) {
      componentFailure = error;
    } finally {
      if (authAttempted) {
        try {
          postgresSummary = await runPostgres({
            root,
            env: {
              ...env,
              QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256: (
                providerEvidenceSha256
              ),
              [POSTGRES_CLEANUP_ENV]: POSTGRES_CLEANUP_CONFIRMATION,
            },
            evidenceSha256: providerEvidenceSha256,
            cleanupTargets: anonymousChallengeTargets,
          });
        } catch (error) {
          if (!componentFailure) componentFailure = error;
          else componentFailure = new Error(
            "live audit and synthetic cleanup both failed",
          );
        }
      }
    }
    if (componentFailure) throw componentFailure;

    const legacyFailures = await inspectLegacy(root);
    if (!Array.isArray(legacyFailures) || legacyFailures.length > 0) {
      throw new Error("legacy boundary check failed");
    }
  } catch (error) {
    auditFailure = error;
  }

  let phase0AfterFailure;
  try {
    const afterBytes = await secureRead(root, PHASE0_EVIDENCE_LOCK_PATH, {
      requiredMode: 0o644,
    });
    const afterFailures = await verifyLock({
      root,
      lock: loadedLock.lock,
      headRef: "HEAD",
    });
    if (
      sha256(afterBytes) !== phase0LockSha256
      || !Array.isArray(afterFailures)
      || afterFailures.length > 0
    ) {
      throw new Error("Phase 0 evidence lock failed after live audit");
    }
  } catch {
    phase0AfterFailure = new Error("Phase 0 evidence lock failed after live audit");
  }
  if (auditFailure && phase0AfterFailure) {
    throw new Error("live audit failed and Phase 0 evidence lock was not preserved");
  }
  if (auditFailure) throw auditFailure;
  if (phase0AfterFailure) throw phase0AfterFailure;

  const authSummary = validateAuthSummary(
    authResult?.summary ?? authResult,
    expectedCommit,
    providerEvidenceSha256,
  );
  const surfaceSummary = validateSurfaceSummary(
    surfaceResult?.summary ?? surfaceResult,
    expectedCommit,
    providerEvidenceSha256,
  );
  validateR2Summary(r2Summary, expectedCommit, providerEvidenceSha256);
  validatePostgresSummary(
    postgresSummary,
    expectedCommit,
    providerEvidenceSha256,
  );
  if (postgresSummary.counts.syntheticUsersDeleted < 1) {
    throw new Error("synthetic audit cleanup was not confirmed");
  }

  const legacySummary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase1-legacy-boundary",
    status: "pass",
    checkedAt: now.toISOString(),
    commit: expectedCommit,
    evidenceSha256: providerEvidenceSha256,
    hashes: {
      aliasSha256: APPROVED_LEGACY_PAGES_ALIAS_SHA256,
      rootDocumentSha256: legacyRootDocument.sha256,
      planDocumentSha256: legacyPlanDocument.sha256,
    },
    checks: {
      sourceBoundaryIsolated: true,
      previewOnlyAdapter: true,
      lockedDeploymentExact: true,
      rootRouteAvailable: true,
      planRouteAvailable: true,
    },
    counts: {
      unmigratedRoutes: 22,
      checkedLiveDocuments: 2,
      localBoundaryFailures: 0,
    },
    failureCodes: [],
  };

  const summary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase1-preview-live",
    status: "pass",
    checkedAt: now.toISOString(),
    commit: expectedCommit,
    evidenceSha256: providerEvidenceSha256,
    hashes: {
      phase0EvidenceLockSha256: phase0LockSha256,
      productionControlSha256: providerEvidence.productionControlBefore,
    },
    checks: {
      providerEvidenceCurrent: true,
      automaticDeploysDisabled: true,
      applicationDeploymentsAligned: true,
      pagesRuntimeExact: true,
      publicConfigMinimal: true,
      proxiedApiHealthy: true,
      directApiHealthy: true,
      privateLlmProviderAttested: true,
      postgresBindingVerified: true,
      r2BindingVerified: true,
      authSecurityVerified: true,
      systemSurfacesVerified: true,
      legacyCompatibilityLocked: true,
      syntheticDataCleaned: true,
      productionUnchanged: true,
      phase0LockBeforeAndAfter: true,
    },
    counts: {
      providerDeployments: 4,
      liveRuntimeDocuments: 7,
      systemSurfaces: surfaceSummary.counts.systemSurfaces,
      targetGates: surfaceSummary.counts.targetGates,
      activatedFutureStates: surfaceSummary.counts.activatedFutureStates,
      visualCases: surfaceSummary.counts.visualCases,
      postgresMajor: postgresSummary.counts.postgresMajor,
      applicationRowsRemaining: postgresSummary.counts.applicationRows,
      r2ObjectsRemaining: (
        r2Summary.counts.runtimeObjectsRemaining
        + r2Summary.counts.auditObjectsRemaining
      ),
      seriousOrCriticalAxeFindings: (
        surfaceSummary.counts.seriousOrCriticalAxeFindings
      ),
      applicationConsoleErrors: surfaceSummary.counts.applicationConsoleErrors,
      unhandledRejections: surfaceSummary.counts.unhandledRejections,
    },
    failureCodes: [],
  };
  try {
    for (const [relativePath, componentSummary] of [
      [POSTGRES_SUMMARY_RELATIVE, postgresSummary],
      [R2_SUMMARY_RELATIVE, r2Summary],
      [LEGACY_SUMMARY_RELATIVE, legacySummary],
    ]) {
      await writeSafeSummary(root, relativePath, componentSummary, {
        retryTemporaryAncestorChurn: Boolean(testOnly),
      });
    }
    await writeSafeSummary(root, SUMMARY_RELATIVE, summary, {
      retryTemporaryAncestorChurn: Boolean(testOnly),
    });
  } catch (error) {
    let invalidationFailure;
    for (const relativePath of PHASE1_ORCHESTRATOR_OUTPUT_PATHS) {
      try {
        await invalidatePhase1EvidencePath(root, relativePath);
      } catch (cleanupError) {
        invalidationFailure = cleanupError;
      }
    }
    if (invalidationFailure) {
      throw new Error("Phase 1 evidence write and invalidation both failed");
    }
    throw error;
  }
  return { output: path.join(root, SUMMARY_RELATIVE), summary };
}

const parseArguments = (argv) => {
  if (argv.length !== 0) throw new Error("unsupported arguments");
  return {};
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await runFrontendUpgradePhase1PreviewLive(
      parseArguments(process.argv.slice(2)),
    );
    console.log(JSON.stringify(result.summary, null, 2));
  } catch {
    console.error("FAIL: frontend upgrade Phase 1 live Preview check failed");
    process.exitCode = 1;
  }
}
