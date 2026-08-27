import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { collectPhase1AuthOfflineEvidence } from "./check-frontend-upgrade-phase1-auth.mjs";
import { findPhase1LegacyBoundaryFailures } from "./check-frontend-upgrade-phase1-legacy-boundary.mjs";
import {
  readPhase1ProviderEvidence,
  validatePhase1ProviderEvidence,
} from "./check-frontend-upgrade-phase1-preview-live.mjs";
import {
  collectPhase1SystemSurfaceOfflineEvidence,
} from "./check-frontend-upgrade-phase1-system-surfaces.mjs";
import {
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST,
  PHASE0_EVIDENCE_LOCK_PATH,
  assertTrustedDirectoryChainUnchanged,
  captureTrustedDirectoryChain,
  validatePhase1ContractSet,
  verifyPhase0EvidenceLock,
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controlledTestParent = tmpdir();
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
const TRUSTED_GIT_CONFIG = Object.freeze([
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.ignoreStat=false",
]);
const MAX_JSON_BYTES = 512 * 1024;
const MAX_REVIEW_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/u;
const URL_VALUE_PATTERN = /(?:https?:\/\/|wss?:\/\/|postgres(?:ql)?(?:\+psycopg)?:\/\/)/iu;
const UNSAFE_KEY_TOKENS = new Set([
  "url",
  "uri",
  "origin",
  "endpoint",
  "dsn",
  "secret",
  "password",
  "credential",
  "authorization",
  "stderr",
  "stacktrace",
]);
const UNSAFE_KEY_COMPOUNDS = new Set([
  "private_key",
  "access_key",
  "signed_request",
  "response_body",
  "request_body",
]);
const SENSITIVE_IDENTIFIER_COMPOUNDS = new Set([
  "cookie_value",
  "csrf_value",
  "oauth_state",
  "oauth_code",
  "oauth_nonce",
  "oauth_verifier",
  "session_id",
  "session_token",
  "user_id",
  "user_record",
]);
const MAX_RUNTIME_FILE_BYTES = 16 * 1024 * 1024;
const MAX_RUNTIME_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_RUNTIME_FILES = 512;
const RUNTIME_DIRECTORY = "dist-v2";
const USER_OWNED_UNTRACKED_LOCKS = Object.freeze({
  "docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json": (
    "e78853f564e956f2af381b85064b118408016e4d13f840ed5b06b68dc1795ac5"
  ),
  "docs/browser-audit-screenshots/371-current-preview-audit.png": (
    "0259caa91cc908b92b891b9088887fa8b18fb4215aaea35487ca4e9f9acefbfb"
  ),
  "docs/browser-audit-screenshots/372-mascot-quality-auth-before.png": (
    "6503084e2782d1122cafcaa0b37f8889a8a4e39109aca3f8a15fc154f82552af"
  ),
  "docs/browser-audit-screenshots/374-mascot-quality-auth-final.jpg": (
    "f8a9de040058bbf656e34e64b03fed8a6b3d07308da24247cfa7479ed986e77c"
  ),
});
const ALLOWED_PHASE1_EVIDENCE_PATHS = new Set(
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST.evidenceOutputs,
);
const ALLOWED_UNTRACKED_PATHS = new Set([
  ...ALLOWED_PHASE1_EVIDENCE_PATHS,
  ...Object.keys(USER_OWNED_UNTRACKED_LOCKS),
]);

export const PHASE1_AGGREGATE_SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json"
);

export const PHASE1_COMPONENT_SUMMARY_PATHS = Object.freeze({
  preview: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-preview-live-summary.json"
  ),
  postgres: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-postgres-migration-summary.json"
  ),
  r2: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-r2-binding-summary.json"
  ),
  auth: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json"
  ),
  legacy: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-legacy-boundary-summary.json"
  ),
  surfaces: (
    "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json"
  ),
});

export const TEST_ONLY_PHASE1_AGGREGATE = Symbol(
  "frontend-upgrade-phase1-aggregate-test-only",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const unique = (values) => [...new Set(values)];

class AggregateCheckError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "AggregateCheckError";
    this.code = code;
  }
}

const fail = (code, message) => {
  throw new AggregateCheckError(code, message);
};

const requireIsolatedTestRoot = async (candidateRoot) => {
  let rootRealPath;
  let defaultRealPath;
  let temporaryRealPath;
  try {
    [rootRealPath, defaultRealPath, temporaryRealPath] = await Promise.all([
      realpath(candidateRoot),
      realpath(defaultRoot),
      realpath(controlledTestParent),
    ]);
  } catch {
    fail("test_injection_forbidden", "test-only injection root is invalid");
  }
  if (rootRealPath === defaultRealPath) {
    fail("test_injection_forbidden", "test-only injection requires an isolated root");
  }
  const relative = path.relative(temporaryRealPath, rootRealPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    fail(
      "test_injection_forbidden",
      "test-only injection requires a canonical temporary root",
    );
  }
  return rootRealPath;
};

const trustedGit = async (root, argumentsList) => {
  const metadata = await lstat(TRUSTED_GIT_BINARY, { bigint: true });
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.uid !== 0n
    || (metadata.mode & 0o022n) !== 0n
    || (metadata.mode & 0o111n) === 0n
  ) {
    fail("application_commit_invalid", "trusted Git binary is unavailable");
  }
  return execFileAsync(
    TRUSTED_GIT_BINARY,
    [...TRUSTED_GIT_CONFIG, ...argumentsList],
    {
      cwd: root,
      encoding: "utf8",
      env: TRUSTED_GIT_ENV,
      maxBuffer: 1024 * 1024,
    },
  );
};

const parseNullRecords = (output, label) => {
  if (typeof output !== "string") {
    fail("application_commit_invalid", `${label} output is invalid`);
  }
  if (output === "") return [];
  if (!output.endsWith("\0")) {
    fail("application_commit_invalid", `${label} output is truncated`);
  }
  return output.slice(0, -1).split("\0");
};

const parseNameStatusRecords = (output, label) => {
  const records = parseNullRecords(output, label);
  if (records.length % 2 !== 0) {
    fail("application_commit_invalid", `${label} output is malformed`);
  }
  const paths = [];
  for (let index = 0; index < records.length; index += 2) {
    if (!/^[ACDMTUXB]$/u.test(records[index])) {
      fail("application_commit_invalid", `${label} status is invalid`);
    }
    paths.push(records[index + 1]);
  }
  return paths;
};

const assertOnlyAllowedPaths = (paths, allowed, label) => {
  if (paths.some((relativePath) => !allowed.has(relativePath))) {
    fail("application_source_drift", `${label} contains a non-evidence path`);
  }
};

const assertNormalIndexFlags = (output, label) => {
  const records = parseNullRecords(output, label);
  if (
    records.length === 0
    || records.some((record) => (
      !record.startsWith("H ")
      || record.length <= 2
    ))
  ) {
    fail(
      "application_source_drift",
      `${label} contains skip-worktree, assume-unchanged, or fsmonitor flags`,
    );
  }
};

const assertDirectoryMetadataUnchanged = async (snapshots) => {
  for (const entry of snapshots) {
    const current = await lstat(entry.path, { bigint: true });
    for (const field of ["dev", "ino", "mode", "uid", "mtimeNs", "ctimeNs"]) {
      if (current[field] !== entry.metadata[field]) {
        fail("runtime_artifact_invalid", "runtime directory changed during validation");
      }
    }
  }
};

const collectRuntimeArtifactPaths = async (root) => {
  const runtimeRoot = path.join(root, RUNTIME_DIRECTORY);
  if (await realpath(runtimeRoot) !== runtimeRoot) {
    fail("runtime_artifact_invalid", "runtime directory is not canonical");
  }
  const currentUid = typeof process.getuid === "function"
    ? BigInt(process.getuid())
    : null;
  const files = [];
  const directories = [];
  const visit = async (absoluteDirectory, relativeDirectory) => {
    const metadata = await lstat(absoluteDirectory, { bigint: true });
    if (
      !metadata.isDirectory()
      || metadata.isSymbolicLink()
      || (currentUid !== null && metadata.uid !== currentUid)
      || (metadata.mode & 0o022n) !== 0n
      || await realpath(absoluteDirectory) !== absoluteDirectory
    ) {
      fail("runtime_artifact_invalid", "runtime directory metadata is unsafe");
    }
    directories.push({ path: absoluteDirectory, metadata });
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      if (
        entry.name === ""
        || entry.name === "."
        || entry.name === ".."
        || entry.name.includes("/")
        || entry.name.includes("\\")
        || /[\u0000-\u001f\u007f]/u.test(entry.name)
      ) {
        fail("runtime_artifact_invalid", "runtime path is unsafe");
      }
      const childAbsolute = path.join(absoluteDirectory, entry.name);
      const childRelative = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      if (entry.isDirectory()) {
        await visit(childAbsolute, childRelative);
      } else if (entry.isFile()) {
        files.push(childRelative);
        if (files.length > MAX_RUNTIME_FILES) {
          fail("runtime_artifact_invalid", "runtime contains too many files");
        }
      } else {
        fail("runtime_artifact_invalid", "runtime contains a non-file entry");
      }
    }
  };
  await visit(runtimeRoot, "");
  return { files, directories };
};

const exactRuntimeKeys = (value, expected, label) => {
  if (!isPlainObject(value)) {
    fail("runtime_artifact_invalid", `${label} is not an object`);
  }
  const actual = Object.keys(value).sort();
  const approved = [...expected].sort();
  if (
    actual.length !== approved.length
    || actual.some((key, index) => key !== approved[index])
  ) {
    fail("runtime_artifact_invalid", `${label} has an unapproved shape`);
  }
  return value;
};

const parseRuntimeJson = (bytes, label) => {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("runtime_artifact_invalid", `${label} is not valid JSON`);
  }
  return value;
};

export async function verifyPhase1RuntimeArtifactProvenance(root, commit) {
  try {
    const { files, directories } = await collectRuntimeArtifactPaths(root);
    const integrityBytes = await secureReadPhase1AggregateInput(
      root,
      `${RUNTIME_DIRECTORY}/asset-integrity.json`,
      {
        maximumBytes: MAX_JSON_BYTES,
        requiredMode: 0o644,
      },
    );
    const integrity = exactRuntimeKeys(
      parseRuntimeJson(integrityBytes, "runtime integrity manifest"),
      ["schemaVersion", "algorithm", "assets"],
      "runtime integrity manifest",
    );
    if (integrity.schemaVersion !== 1 || integrity.algorithm !== "sha384") {
      fail("runtime_artifact_invalid", "runtime integrity algorithm is invalid");
    }
    exactRuntimeKeys(integrity.assets, Object.keys(integrity.assets), "runtime assets");
    const actualAssets = files
      .filter((relativePath) => relativePath !== "asset-integrity.json")
      .sort();
    const declaredAssets = Object.keys(integrity.assets).sort();
    if (
      actualAssets.length !== declaredAssets.length
      || actualAssets.some((relativePath, index) => (
        relativePath !== declaredAssets[index]
      ))
      || !actualAssets.includes("version.json")
      || !actualAssets.includes("config.json")
      || !actualAssets.includes("index.html")
    ) {
      fail("runtime_artifact_invalid", "runtime integrity paths do not align");
    }

    let totalBytes = 0;
    let versionBytes;
    for (const relativePath of actualAssets) {
      const record = exactRuntimeKeys(
        integrity.assets[relativePath],
        ["bytes", "integrity"],
        `runtime integrity record ${relativePath}`,
      );
      if (
        !Number.isSafeInteger(record.bytes)
        || record.bytes <= 0
        || record.bytes > MAX_RUNTIME_FILE_BYTES
        || typeof record.integrity !== "string"
        || !/^sha384-[A-Za-z0-9+/]{64}$/u.test(record.integrity)
      ) {
        fail("runtime_artifact_invalid", "runtime integrity record is invalid");
      }
      const bytes = await secureReadPhase1AggregateInput(
        root,
        `${RUNTIME_DIRECTORY}/${relativePath}`,
        {
          maximumBytes: MAX_RUNTIME_FILE_BYTES,
          requiredMode: 0o644,
        },
      );
      totalBytes += bytes.length;
      if (
        bytes.length !== record.bytes
        || `sha384-${createHash("sha384").update(bytes).digest("base64")}`
          !== record.integrity
      ) {
        fail("runtime_artifact_invalid", "runtime asset integrity does not align");
      }
      if (relativePath === "version.json") versionBytes = bytes;
    }
    if (totalBytes > MAX_RUNTIME_TOTAL_BYTES || !versionBytes) {
      fail("runtime_artifact_invalid", "runtime artifact size is invalid");
    }
    const version = exactRuntimeKeys(
      parseRuntimeJson(versionBytes, "runtime version"),
      ["schemaVersion", "commit", "branch", "source"],
      "runtime version",
    );
    if (
      version.schemaVersion !== 1
      || version.commit !== commit
      || version.branch !== "codex/frontend-v2-preview"
      || !["local", "cloudflare-pages"].includes(version.source)
    ) {
      fail("runtime_artifact_invalid", "runtime version does not align");
    }
    await assertDirectoryMetadataUnchanged(directories);
    return true;
  } catch (error) {
    if (error instanceof AggregateCheckError) {
      if (error.code === "runtime_artifact_invalid") throw error;
      fail("runtime_artifact_invalid", "runtime artifact could not be verified safely");
    }
    fail("runtime_artifact_invalid", "runtime artifact could not be verified safely");
  }
}

export async function verifyPhase1ApplicationCommitProvenance(root, commit) {
  requireSha(commit, "application commit");
  const rootReal = await realpath(root);
  try {
    const { stdout: topLevelOutput } = await trustedGit(rootReal, [
      "rev-parse",
      "--show-toplevel",
    ]);
    if (await realpath(topLevelOutput.trim()) !== rootReal) {
      fail("application_commit_invalid", "repository root does not align");
    }
    const { stdout: shallowOutput } = await trustedGit(rootReal, [
      "rev-parse",
      "--is-shallow-repository",
    ]);
    if (shallowOutput.trim() !== "false") {
      fail("application_commit_invalid", "shallow repositories are not accepted");
    }
    const { stdout: replaceOutput } = await trustedGit(rootReal, [
      "for-each-ref",
      "--format=%(refname)",
      "refs/replace/",
    ]);
    if (replaceOutput !== "") {
      fail("application_commit_invalid", "Git replace refs are not accepted");
    }
    const { stdout: graftOutput } = await trustedGit(rootReal, [
      "rev-parse",
      "--git-path",
      "info/grafts",
    ]);
    const graftPath = path.isAbsolute(graftOutput.trim())
      ? graftOutput.trim()
      : path.resolve(rootReal, graftOutput.trim());
    try {
      await lstat(graftPath);
      fail("application_commit_invalid", "Git grafts are not accepted");
    } catch (error) {
      if (
        error instanceof AggregateCheckError
        || (error && typeof error === "object" && error.code !== "ENOENT")
      ) {
        throw error;
      }
    }
    const { stdout: objectTypeOutput } = await trustedGit(rootReal, [
      "cat-file",
      "-t",
      commit,
    ]);
    if (objectTypeOutput !== "commit\n") {
      fail("application_commit_invalid", "application commit is not a commit object");
    }
    const { stdout: peeledCommitOutput } = await trustedGit(rootReal, [
      "rev-parse",
      "--verify",
      `${commit}^{commit}`,
    ]);
    if (peeledCommitOutput.trim() !== commit) {
      fail("application_commit_invalid", "application commit does not resolve exactly");
    }
    await trustedGit(rootReal, ["merge-base", "--is-ancestor", commit, "HEAD"]);

    const { stdout: descendantOutput } = await trustedGit(rootReal, [
      "diff",
      "--no-ext-diff",
      "--name-status",
      "--no-renames",
      "-z",
      commit,
      "HEAD",
      "--",
    ]);
    assertOnlyAllowedPaths(
      parseNameStatusRecords(descendantOutput, "application descendant diff"),
      ALLOWED_PHASE1_EVIDENCE_PATHS,
      "application descendant diff",
    );

    const { stdout: trackedWorktreeOutput } = await trustedGit(rootReal, [
      "diff",
      "--no-ext-diff",
      "--name-status",
      "--no-renames",
      "-z",
      "HEAD",
      "--",
    ]);
    assertOnlyAllowedPaths(
      parseNameStatusRecords(trackedWorktreeOutput, "application worktree diff"),
      ALLOWED_PHASE1_EVIDENCE_PATHS,
      "application worktree diff",
    );
    const { stdout: unmergedOutput } = await trustedGit(rootReal, [
      "ls-files",
      "--unmerged",
      "-z",
    ]);
    if (unmergedOutput !== "") {
      fail("application_source_drift", "unmerged worktree entries are not accepted");
    }
    const { stdout: untrackedOutput } = await trustedGit(rootReal, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ]);
    const untrackedPaths = parseNullRecords(
      untrackedOutput,
      "application untracked inventory",
    );
    assertOnlyAllowedPaths(
      untrackedPaths,
      ALLOWED_UNTRACKED_PATHS,
      "application untracked inventory",
    );

    const userOwnedPaths = Object.keys(USER_OWNED_UNTRACKED_LOCKS);
    const { stdout: trackedUserOutput } = await trustedGit(rootReal, [
      "ls-files",
      "-z",
      "--",
      ...userOwnedPaths,
    ]);
    if (trackedUserOutput !== "") {
      fail("application_source_drift", "user-owned evidence must remain untracked");
    }
    for (const relativePath of userOwnedPaths) {
      if (!untrackedPaths.includes(relativePath)) continue;
      const bytes = await secureReadPhase1AggregateInput(rootReal, relativePath, {
        maximumBytes: MAX_REVIEW_IMAGE_BYTES,
        requiredMode: 0o644,
      });
      if (sha256(bytes) !== USER_OWNED_UNTRACKED_LOCKS[relativePath]) {
        fail("application_source_drift", "user-owned untracked evidence changed");
      }
    }

    const { stdout: indexFlagsOutput } = await trustedGit(rootReal, [
      "ls-files",
      "-v",
      "-z",
    ]);
    assertNormalIndexFlags(indexFlagsOutput, "Git index flags");
    const { stdout: fsmonitorFlagsOutput } = await trustedGit(rootReal, [
      "ls-files",
      "-f",
      "-z",
    ]);
    assertNormalIndexFlags(fsmonitorFlagsOutput, "Git fsmonitor flags");
    await verifyPhase1RuntimeArtifactProvenance(rootReal, commit);
    return true;
  } catch (error) {
    if (error instanceof AggregateCheckError) throw error;
    fail(
      "application_commit_invalid",
      "application commit is missing or is not an ancestor of HEAD",
    );
  }
}

const exactKeys = (value, expected, label) => {
  if (!isPlainObject(value)) fail("component_summary_invalid", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const approved = [...expected].sort();
  if (
    actual.length !== approved.length
    || actual.some((key, index) => key !== approved[index])
  ) {
    fail("component_summary_invalid", `${label} has an unapproved shape`);
  }
  return value;
};

const requireHash = (value, label) => {
  if (!HASH_PATTERN.test(value ?? "")) {
    fail("component_summary_invalid", `${label} is not a SHA-256`);
  }
  return value;
};

const requireSha = (value, label) => {
  if (!SHA_PATTERN.test(value ?? "")) {
    fail("component_summary_invalid", `${label} is not a Git SHA`);
  }
  return value;
};

const requireInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("component_summary_invalid", `${label} must be a non-negative integer`);
  }
  return value;
};

const requireExactBooleanMap = (value, keys, label) => {
  exactKeys(value, keys, label);
  for (const key of keys) {
    if (value[key] !== true) {
      fail("component_summary_invalid", `${label}.${key} must be true`);
    }
  }
  return value;
};

const requireExactIntegerMap = (value, keys, label) => {
  exactKeys(value, keys, label);
  for (const key of keys) requireInteger(value[key], `${label}.${key}`);
  return value;
};

const requireExactHashMap = (value, keys, label) => {
  exactKeys(value, keys, label);
  for (const key of keys) requireHash(value[key], `${label}.${key}`);
  return value;
};

const canonicalIsoTime = (value, label) => {
  if (typeof value !== "string") {
    fail("component_summary_invalid", `${label} is not a timestamp`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail("component_summary_invalid", `${label} is not canonical ISO-8601`);
  }
  return date;
};

const normalizedKey = (key) => String(key)
  .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
  .replace(/[^a-zA-Z0-9]+/gu, "_")
  .toLowerCase();

const isUnsafeEvidenceKey = (key) => {
  const normalized = normalizedKey(key);
  const tokens = normalized.split("_").filter(Boolean);
  return (
    tokens.some((token) => UNSAFE_KEY_TOKENS.has(token))
    || UNSAFE_KEY_COMPOUNDS.has(normalized)
    || SENSITIVE_IDENTIFIER_COMPOUNDS.has(normalized)
  );
};

const assertEvidenceSafe = (value, label = "evidence") => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertEvidenceSafe(entry, `${label}[${index}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (
        isUnsafeEvidenceKey(key)
        && typeof nested !== "boolean"
        && typeof nested !== "number"
        && nested !== null
      ) {
        fail("component_summary_unsafe", `${label}.${key} is forbidden`);
      }
      assertEvidenceSafe(nested, `${label}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && URL_VALUE_PATTERN.test(value)) {
    fail("component_summary_unsafe", `${label} contains a URL`);
  }
};

const componentEnvelope = (summary, {
  check,
  commit,
  evidenceSha256,
  nowMs,
  providerCapturedAtMs,
  providerExpiresAtMs,
}) => {
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
  ], `${check} summary`);
  if (
    summary.schemaVersion !== 1
    || summary.check !== check
    || summary.status !== "pass"
    || summary.commit !== commit
    || summary.evidenceSha256 !== evidenceSha256
  ) {
    fail("component_summary_mismatch", `${check} envelope does not align`);
  }
  requireSha(summary.commit, `${check}.commit`);
  requireHash(summary.evidenceSha256, `${check}.evidenceSha256`);
  if (!Array.isArray(summary.failureCodes) || summary.failureCodes.length !== 0) {
    fail("component_summary_invalid", `${check}.failureCodes must be empty`);
  }
  const checkedAt = canonicalIsoTime(summary.checkedAt, `${check}.checkedAt`);
  if (
    checkedAt.getTime() > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAt.getTime() > MAX_EVIDENCE_AGE_MS
    || checkedAt.getTime() < providerCapturedAtMs - CLOCK_SKEW_MS
    || checkedAt.getTime() > providerExpiresAtMs
  ) {
    fail("component_summary_stale", `${check} is stale or from the future`);
  }
  assertEvidenceSafe(summary, `${check} summary`);
  return summary;
};

const validatePreviewSummary = (summary) => {
  requireExactHashMap(
    summary.hashes,
    ["phase0EvidenceLockSha256", "productionControlSha256"],
    "preview.hashes",
  );
  requireExactBooleanMap(summary.checks, [
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
  ], "preview.checks");
  requireExactIntegerMap(summary.counts, [
    "providerDeployments",
    "liveRuntimeDocuments",
    "systemSurfaces",
    "targetGates",
    "activatedFutureStates",
    "visualCases",
    "postgresMajor",
    "applicationRowsRemaining",
    "r2ObjectsRemaining",
    "seriousOrCriticalAxeFindings",
    "applicationConsoleErrors",
    "unhandledRejections",
  ], "preview.counts");
};

const validatePostgresSummary = (summary) => {
  requireExactHashMap(summary.hashes, [
    "postgresResourceSha256",
    "postgresRoleSha256",
    "runtimeIdentitySha256",
    "schemaSha256",
    "migrationRoundTripSha256",
  ], "postgres.hashes");
  requireExactBooleanMap(summary.checks, [
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
  ], "postgres.checks");
  requireExactIntegerMap(summary.counts, [
    "postgresMajor",
    "applicationTables",
    "metadataTables",
    "applicationRows",
    "syntheticUsersDeleted",
  ], "postgres.counts");
};

const validateR2Summary = (summary) => {
  requireExactHashMap(summary.hashes, [
    "bucketIdentitySha256",
    "accountIdentitySha256",
    "runtimeObjectPayloadSha256",
    "auditObjectPayloadSha256",
    "runtimeAccessIdSha256",
    "auditAccessIdSha256",
  ], "r2.hashes");
  requireExactBooleanMap(summary.checks, [
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
  ], "r2.checks");
  requireExactIntegerMap(
    summary.counts,
    [
      "runtimeObjectsFoundBefore",
      "runtimeStaleObjectsDeleted",
      "runtimeObjectsCreated",
      "runtimeObjectsRemaining",
      "auditObjectsFoundBefore",
      "auditStaleObjectsDeleted",
      "auditObjectsCreated",
      "auditObjectsRemaining",
    ],
    "r2.counts",
  );
  if (
    summary.counts.runtimeObjectsFoundBefore
      !== summary.counts.runtimeStaleObjectsDeleted
    || summary.counts.auditObjectsFoundBefore
      !== summary.counts.auditStaleObjectsDeleted
  ) {
    fail("component_summary_invalid", "R2 stale cleanup counts do not align");
  }
};

const validateAuthSummary = (summary) => {
  requireExactHashMap(summary.hashes, ["syntheticDataSha256"], "auth.hashes");
  requireExactBooleanMap(summary.checks, [
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
  ], "auth.checks");
  requireExactIntegerMap(summary.counts, [
    "localStorageEntries",
    "sessionStorageEntries",
    "indexedDbRecords",
    "sensitiveEntries",
    "syntheticUsersCreated",
  ], "auth.counts");
};

const validateLegacySummary = (summary) => {
  requireExactHashMap(summary.hashes, [
    "aliasSha256",
    "rootDocumentSha256",
    "planDocumentSha256",
  ], "legacy.hashes");
  requireExactBooleanMap(summary.checks, [
    "sourceBoundaryIsolated",
    "previewOnlyAdapter",
    "lockedDeploymentExact",
    "rootRouteAvailable",
    "planRouteAvailable",
  ], "legacy.checks");
  requireExactIntegerMap(summary.counts, [
    "unmigratedRoutes",
    "checkedLiveDocuments",
    "localBoundaryFailures",
  ], "legacy.counts");
};

const validateSurfaceSummary = (summary) => {
  exactKeys(summary.hashes, ["reviewImageSha256"], "surfaces.hashes");
  if (
    !Array.isArray(summary.hashes.reviewImageSha256)
    || summary.hashes.reviewImageSha256.length !== 48
    || summary.hashes.reviewImageSha256.some((value) => !HASH_PATTERN.test(value))
  ) {
    fail("component_summary_invalid", "surface review hashes are invalid");
  }
  requireExactBooleanMap(summary.checks, [
    "offlineContractPassed",
    "fullE2eExecuted",
    "bundleBudgetsPassed",
    "visualMatrixPassed",
    "accessibilityPassed",
    "consolePassed",
    "rejectionsPassed",
  ], "surfaces.checks");
  requireExactIntegerMap(summary.counts, [
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
  ], "surfaces.counts");
};

const COMPONENT_SCHEMAS = Object.freeze({
  preview: {
    check: "frontend-upgrade-phase1-preview-live",
    validate: validatePreviewSummary,
  },
  postgres: {
    check: "frontend-v2-phase1-postgres",
    validate: validatePostgresSummary,
  },
  r2: {
    check: "frontend-v2-phase1-r2",
    validate: validateR2Summary,
  },
  auth: {
    check: "frontend-upgrade-phase1-auth",
    validate: validateAuthSummary,
  },
  legacy: {
    check: "frontend-upgrade-phase1-legacy-boundary",
    validate: validateLegacySummary,
  },
  surfaces: {
    check: "frontend-upgrade-phase1-system-surfaces",
    validate: validateSurfaceSummary,
  },
});

const requireCounts = (summaries) => {
  const { preview, postgres, r2, auth, legacy, surfaces } = summaries;
  const surfaceExpected = {
    systemSurfaces: 8,
    targetGates: 82,
    activatedFutureStates: 6,
    visualCases: 48,
  };
  for (const [key, value] of Object.entries(surfaceExpected)) {
    if (surfaces.counts[key] !== value || preview.counts[key] !== value) {
      fail("aggregate_relationship_mismatch", `${key} count does not align`);
    }
  }
  if (preview.counts.postgresMajor !== 18 || postgres.counts.postgresMajor !== 18) {
    fail("aggregate_relationship_mismatch", "postgresMajor count does not align");
  }
  if (
    surfaces.counts.seriousOrCriticalAxeFindings !== 0
    || surfaces.counts.applicationConsoleErrors !== 0
    || surfaces.counts.unhandledRejections !== 0
    || surfaces.counts.executedE2eTests !== 82
    || surfaces.counts.skippedE2eTests !== 0
    || surfaces.counts.failedE2eTests !== 0
    || surfaces.counts.flakyE2eTests !== 0
    || preview.counts.seriousOrCriticalAxeFindings !== 0
    || preview.counts.applicationConsoleErrors !== 0
    || preview.counts.unhandledRejections !== 0
  ) {
    fail("aggregate_relationship_mismatch", "browser quality counts are non-zero");
  }
  if (
    surfaces.counts.initialJsBudgetBytes !== 180 * 1024
    || surfaces.counts.routeChunkBudgetBytes !== 100 * 1024
    || surfaces.counts.initialJsGzipBytes > surfaces.counts.initialJsBudgetBytes
    || surfaces.counts.largestRouteChunkGzipBytes > surfaces.counts.routeChunkBudgetBytes
  ) {
    fail("aggregate_relationship_mismatch", "bundle budgets do not align");
  }
  if (
    auth.counts.syntheticUsersCreated !== 1
    || auth.counts.sensitiveEntries !== 0
    || postgres.counts.postgresMajor !== 18
    || postgres.counts.applicationTables !== 9
    || postgres.counts.metadataTables !== 1
    || postgres.counts.applicationRows !== 0
    || postgres.counts.syntheticUsersDeleted < auth.counts.syntheticUsersCreated
    || r2.counts.runtimeObjectsFoundBefore
      !== r2.counts.runtimeStaleObjectsDeleted
    || r2.counts.runtimeObjectsCreated !== 1
    || r2.counts.runtimeObjectsRemaining !== 0
    || r2.counts.auditObjectsFoundBefore !== r2.counts.auditStaleObjectsDeleted
    || r2.counts.auditObjectsCreated !== 1
    || r2.counts.auditObjectsRemaining !== 0
    || preview.counts.applicationRowsRemaining !== 0
    || preview.counts.r2ObjectsRemaining !== 0
  ) {
    fail("cleanup_counts_mismatch", "synthetic cleanup counts do not align");
  }
  if (
    legacy.counts.unmigratedRoutes !== 22
    || legacy.counts.checkedLiveDocuments !== 2
    || legacy.counts.localBoundaryFailures !== 0
    || preview.counts.providerDeployments !== 4
    || preview.counts.liveRuntimeDocuments !== 7
  ) {
    fail("aggregate_relationship_mismatch", "live evidence counts do not align");
  }
};

export function validatePhase1ComponentSummaries(summaries, {
  expectedCommit,
  evidenceSha256,
  phase0EvidenceLockSha256,
  productionControlSha256,
  providerCapturedAtMs,
  providerExpiresAtMs,
  nowMs = Date.now(),
} = {}) {
  exactKeys(summaries, Object.keys(COMPONENT_SCHEMAS), "component summaries");
  requireSha(expectedCommit, "expected commit");
  requireHash(evidenceSha256, "provider evidence digest");
  requireHash(phase0EvidenceLockSha256, "Phase 0 evidence lock digest");
  requireHash(productionControlSha256, "production control digest");
  if (
    !Number.isFinite(providerCapturedAtMs)
    || !Number.isFinite(providerExpiresAtMs)
    || providerCapturedAtMs > providerExpiresAtMs
  ) {
    fail("component_summary_invalid", "provider evidence time window is invalid");
  }

  for (const [name, schema] of Object.entries(COMPONENT_SCHEMAS)) {
    componentEnvelope(summaries[name], {
      check: schema.check,
      commit: expectedCommit,
      evidenceSha256,
      nowMs,
      providerCapturedAtMs,
      providerExpiresAtMs,
    });
    schema.validate(summaries[name]);
  }
  if (summaries.preview.hashes.phase0EvidenceLockSha256 !== phase0EvidenceLockSha256) {
    fail("phase0_lock_mismatch", "preview summary Phase 0 digest does not align");
  }
  if (summaries.preview.hashes.productionControlSha256 !== productionControlSha256) {
    fail("production_fingerprint_mismatch", "production fingerprint does not align");
  }
  requireCounts(summaries);
  return summaries;
}

export async function secureReadPhase1AggregateInput(
  root,
  relativePath,
  { maximumBytes = MAX_JSON_BYTES, requiredMode = 0o644 } = {},
) {
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    fail("unsafe_evidence_path", "O_NOFOLLOW is unavailable");
  }
  const rootPath = path.resolve(root);
  const relativeDirectory = path.posix.dirname(relativePath);
  let directorySnapshot;
  let handle;
  try {
    directorySnapshot = await captureTrustedDirectoryChain(rootPath, relativeDirectory);
    const candidate = path.join(rootPath, relativePath);
    if (await realpath(path.dirname(candidate)) !== path.dirname(candidate)) {
      fail("unsafe_evidence_path", "evidence parent is not canonical");
    }
    handle = await open(candidate, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    const currentUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : before.uid;
    if (
      !before.isFile()
      || before.nlink !== 1n
      || before.uid !== currentUid
      || Number(before.mode & 0o777n) !== requiredMode
      || before.size <= 0n
      || before.size > BigInt(maximumBytes)
    ) {
      fail("unsafe_evidence_path", "evidence metadata is invalid");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of [
      "dev",
      "ino",
      "mode",
      "uid",
      "nlink",
      "size",
      "mtimeNs",
      "ctimeNs",
    ]) {
      if (before[field] !== after[field]) {
        fail("unsafe_evidence_path", "evidence changed while being read");
      }
    }
    if (
      bytes.length !== Number(before.size)
      || await realpath(path.join(rootPath, relativePath)) !== path.join(rootPath, relativePath)
    ) {
      fail("unsafe_evidence_path", "evidence path changed while being read");
    }
    const pathAfter = await lstat(path.join(rootPath, relativePath), { bigint: true });
    for (const field of [
      "dev",
      "ino",
      "mode",
      "uid",
      "nlink",
      "size",
      "mtimeNs",
      "ctimeNs",
    ]) {
      if (after[field] !== pathAfter[field]) {
        fail("unsafe_evidence_path", "evidence inode changed while being read");
      }
    }
    await assertTrustedDirectoryChainUnchanged(directorySnapshot);
    return bytes;
  } catch (error) {
    if (error instanceof AggregateCheckError) throw error;
    fail("unsafe_evidence_path", "evidence could not be read safely");
  } finally {
    await handle?.close();
  }
}

const securelyReadJson = async (root, relativePath) => {
  const bytes = await secureReadPhase1AggregateInput(root, relativePath);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("component_summary_invalid", `${relativePath} is not valid JSON`);
  }
  if (!isPlainObject(value)) {
    fail("component_summary_invalid", `${relativePath} is not a JSON object`);
  }
  return { value, bytes };
};

const readContractJson = async (root, relativePath) => (
  (await securelyReadJson(root, relativePath)).value
);

export async function collectFrontendUpgradePhase1OfflineEvidence(root = defaultRoot) {
  const absoluteRoot = path.resolve(root);
  const lockBefore = await securelyReadJson(absoluteRoot, PHASE0_EVIDENCE_LOCK_PATH);
  const beforeFailures = await verifyPhase0EvidenceLock({
    root: absoluteRoot,
    lock: lockBefore.value,
    headRef: "HEAD",
  });
  const [previewContract, providerSchema, acceptanceManifest, schemaContract] = await Promise.all([
    readContractJson(absoluteRoot, "docs/frontend-upgrade/phase-1-preview-contract.json"),
    readContractJson(
      absoluteRoot,
      "docs/frontend-upgrade/phase-1-provider-evidence.schema.json",
    ),
    readContractJson(
      absoluteRoot,
      "docs/frontend-upgrade/phase-1-acceptance-manifest.json",
    ),
    readContractJson(absoluteRoot, "docs/frontend-upgrade/phase-1-schema-contract.json"),
  ]);
  const contractFailures = validatePhase1ContractSet({
    evidenceLock: lockBefore.value,
    previewContract,
    providerSchema,
    acceptanceManifest,
    schemaContract,
  });
  const [auth, surfaces, legacyFailures] = await Promise.all([
    collectPhase1AuthOfflineEvidence(absoluteRoot),
    collectPhase1SystemSurfaceOfflineEvidence(absoluteRoot),
    findPhase1LegacyBoundaryFailures(absoluteRoot),
  ]);
  const lockAfter = await securelyReadJson(absoluteRoot, PHASE0_EVIDENCE_LOCK_PATH);
  const afterFailures = await verifyPhase0EvidenceLock({
    root: absoluteRoot,
    lock: lockAfter.value,
    headRef: "HEAD",
  });
  const failures = unique([
    ...(Array.isArray(beforeFailures) ? beforeFailures : ["Phase 0 pre-check failed"]),
    ...contractFailures,
    ...auth.failures,
    ...surfaces.failures,
    ...legacyFailures,
    ...(Array.isArray(afterFailures) ? afterFailures : ["Phase 0 post-check failed"]),
    ...(sha256(lockBefore.bytes) === sha256(lockAfter.bytes)
      ? []
      : ["Phase 0 evidence lock changed during offline checks"]),
  ]);
  const counts = {
    systemSurfaces: acceptanceManifest.systemSurfaces?.length ?? 0,
    targetGates: acceptanceManifest.gates?.length ?? 0,
    activatedFutureStates: acceptanceManifest.activatedPhase0FutureStates?.length ?? 0,
    visualCases: acceptanceManifest.baseVisualCaseCount ?? 0,
    postgresMajor: schemaContract.postgresMajor ?? 0,
  };
  if (
    counts.systemSurfaces !== 8
    || counts.targetGates !== 82
    || counts.activatedFutureStates !== 6
    || counts.visualCases !== 48
    || counts.postgresMajor !== 18
    || surfaces.summary.bundle.initialJsBudgetBytes !== 180 * 1024
    || surfaces.summary.bundle.routeChunkBudgetBytes !== 100 * 1024
    || !surfaces.summary.bundle.initialWithinBudget
    || !surfaces.summary.bundle.routesWithinBudget
  ) {
    failures.push("Phase 1 aggregate counts or budgets do not match the frozen contract");
  }
  return {
    passed: failures.length === 0,
    failures: unique(failures),
    phase0EvidenceLockSha256: sha256(lockAfter.bytes),
    counts,
    bundle: surfaces.summary.bundle,
  };
}

const expectedReviewPaths = () => (
  APPROVED_PHASE1_ACCEPTANCE_MANIFEST.systemSurfaces.flatMap((surfaceId) => (
    ["desktop", "laptop", "mobile"].flatMap((viewport) => (
      ["light", "dark"].map((theme) => (
        "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/"
        + `${surfaceId.slice("system:".length)}-${viewport}-${theme}.jpg`
      ))
    ))
  ))
);

const readReviewImageHashes = async (root) => {
  const images = [];
  for (const relativePath of expectedReviewPaths()) {
    const bytes = await secureReadPhase1AggregateInput(root, relativePath, {
      maximumBytes: MAX_REVIEW_IMAGE_BYTES,
      requiredMode: 0o644,
    });
    if (
      bytes.length < 4
      || bytes[0] !== 0xff
      || bytes[1] !== 0xd8
      || bytes.at(-2) !== 0xff
      || bytes.at(-1) !== 0xd9
    ) {
      fail("review_evidence_invalid", "review evidence is not a complete JPEG");
    }
    images.push(sha256(bytes));
  }
  return images;
};

const aggregateChecks = (ready) => ({
  offlineContractsPassed: ready,
  providerEvidenceCurrent: ready,
  applicationCommitAligned: ready,
  componentEvidenceAligned: ready,
  phase0EvidenceLockIntact: ready,
  productionUnchanged: ready,
  authSecurityPassed: ready,
  postgresPassed: ready,
  r2Passed: ready,
  legacyBoundaryPassed: ready,
  systemSurfacesPassed: ready,
  reviewEvidenceVerified: ready,
  bundleBudgetsPassed: ready,
  syntheticDataCleaned: ready,
});

const aggregateCounts = (summaries) => ({
  componentSummaries: summaries ? 6 : null,
  systemSurfaces: summaries?.surfaces.counts.systemSurfaces ?? null,
  targetGates: summaries?.surfaces.counts.targetGates ?? null,
  activatedFutureStates: summaries?.surfaces.counts.activatedFutureStates ?? null,
  visualCases: summaries?.surfaces.counts.visualCases ?? null,
  seriousOrCriticalAxeFindings: (
    summaries?.surfaces.counts.seriousOrCriticalAxeFindings ?? null
  ),
  applicationConsoleErrors: summaries?.surfaces.counts.applicationConsoleErrors ?? null,
  unhandledRejections: summaries?.surfaces.counts.unhandledRejections ?? null,
  postgresMajor: summaries?.postgres.counts.postgresMajor ?? null,
  applicationRowsRemaining: summaries?.postgres.counts.applicationRows ?? null,
  r2ObjectsRemaining: summaries
    ? (
      summaries.r2.counts.runtimeObjectsRemaining
      + summaries.r2.counts.auditObjectsRemaining
    )
    : null,
});

const notReadySummary = ({ checkedAt, code, references = {} }) => ({
  schemaVersion: 1,
  check: "frontend-upgrade-phase1",
  status: "not-ready",
  checkedAt: checkedAt.toISOString(),
  commit: references.commit ?? null,
  evidenceSha256: references.evidenceSha256 ?? null,
  hashes: {
    phase0EvidenceLockSha256: references.phase0EvidenceLockSha256 ?? null,
    productionControlSha256: references.productionControlSha256 ?? null,
  },
  checks: aggregateChecks(false),
  counts: aggregateCounts(null),
  failureCodes: [SAFE_CODE_PATTERN.test(code ?? "") ? code : "internal_check_failed"],
});

const readySummary = ({
  checkedAt,
  commit,
  evidenceSha256,
  phase0EvidenceLockSha256,
  productionControlSha256,
  summaries,
}) => ({
  schemaVersion: 1,
  check: "frontend-upgrade-phase1",
  status: "ready-for-review",
  checkedAt: checkedAt.toISOString(),
  commit,
  evidenceSha256,
  hashes: {
    phase0EvidenceLockSha256,
    productionControlSha256,
  },
  checks: aggregateChecks(true),
  counts: aggregateCounts(summaries),
  failureCodes: [],
});

const validateAggregateOutput = (summary) => {
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
  ], "aggregate summary");
  if (
    summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase1"
    || !["ready-for-review", "not-ready"].includes(summary.status)
  ) {
    fail("aggregate_output_invalid", "aggregate status is invalid");
  }
  if (
    summary.status === "ready-for-review"
    && (
      !SHA_PATTERN.test(summary.commit ?? "")
      || !HASH_PATTERN.test(summary.evidenceSha256 ?? "")
      || summary.failureCodes.length !== 0
    )
  ) {
    fail("aggregate_output_invalid", "ready aggregate envelope is invalid");
  }
  if (summary.status === "not-ready" && summary.failureCodes.length === 0) {
    fail("aggregate_output_invalid", "not-ready aggregate needs a failure code");
  }
  canonicalIsoTime(summary.checkedAt, "aggregate.checkedAt");
  assertEvidenceSafe(summary, "aggregate summary");
  if (
    JSON.stringify(summary).includes('"accepted"')
    || JSON.stringify(summary).includes('"status":"accepted"')
  ) {
    fail("aggregate_output_invalid", "aggregate must not self-accept");
  }
};

export async function runFrontendUpgradePhase1Check(options = {}) {
  const mode = options.mode ?? "offline";
  let root = path.resolve(options.root ?? defaultRoot);
  const testOnly = options[TEST_ONLY_PHASE1_AGGREGATE];
  if (testOnly && process.env.NODE_ENV !== "test") {
    fail("test_injection_forbidden", "test-only injection requires NODE_ENV=test");
  }
  if (testOnly) {
    root = await requireIsolatedTestRoot(root);
  }
  if (Object.hasOwn(options, "checkedAt")) {
    fail("check_time_override_forbidden", "checkedAt cannot be overridden");
  }
  const checkedAt = new Date(testOnly?.now ?? Date.now());
  if (!Number.isFinite(checkedAt.getTime())) {
    fail("check_time_invalid", "aggregate check time is invalid");
  }
  if (mode === "offline") {
    const offline = testOnly?.offline
      ?? await collectFrontendUpgradePhase1OfflineEvidence(root);
    return { mode, offline, output: null, summary: null };
  }
  if (mode !== "live") fail("unsupported_arguments", "mode must be offline or live");

  let offline = {
    passed: false,
    failures: [],
    phase0EvidenceLockSha256: null,
    counts: {},
    bundle: {},
  };
  const references = {};
  let summaries;
  let summary;
  try {
    offline = testOnly?.offline
      ?? await collectFrontendUpgradePhase1OfflineEvidence(root);
    references.phase0EvidenceLockSha256 = offline.phase0EvidenceLockSha256;
    if (!offline.passed) fail("offline_gate_failed", "offline checks failed");
    const loadedProvider = testOnly?.provider ?? await readPhase1ProviderEvidence(root);
    const providerEvidenceSha256 = requireHash(
      loadedProvider.sha256 ?? sha256(loadedProvider.bytes),
      "provider evidence digest",
    );
    const providerEvidence = validatePhase1ProviderEvidence(loadedProvider.evidence, {
      nowMs: checkedAt.getTime(),
      expectedCommit: options.expectedCommit,
    });
    if (providerEvidence.productionControlBefore !== providerEvidence.productionControlAfter) {
      fail("production_fingerprint_mismatch", "production controls changed");
    }
    references.commit = providerEvidence.applicationCommit;
    references.evidenceSha256 = providerEvidenceSha256;
    references.productionControlSha256 = providerEvidence.productionControlBefore;
    await verifyPhase1ApplicationCommitProvenance(root, references.commit);

    if (testOnly?.summaries) {
      summaries = testOnly.summaries;
    } else {
      summaries = Object.fromEntries(await Promise.all(
        Object.entries(PHASE1_COMPONENT_SUMMARY_PATHS).map(async ([name, relativePath]) => (
          [name, (await securelyReadJson(root, relativePath)).value]
        )),
      ));
    }
    validatePhase1ComponentSummaries(summaries, {
      expectedCommit: references.commit,
      evidenceSha256: references.evidenceSha256,
      phase0EvidenceLockSha256: references.phase0EvidenceLockSha256,
      productionControlSha256: references.productionControlSha256,
      providerCapturedAtMs: Date.parse(providerEvidence.capturedAt),
      providerExpiresAtMs: Date.parse(providerEvidence.expiresAt),
      nowMs: checkedAt.getTime(),
    });
    const reviewHashes = testOnly?.reviewImageHashes ?? await readReviewImageHashes(root);
    if (
      !Array.isArray(reviewHashes)
      || reviewHashes.length !== 48
      || reviewHashes.some((hash, index) => (
        hash !== summaries.surfaces.hashes.reviewImageSha256[index]
      ))
    ) {
      fail("review_evidence_invalid", "review image hashes do not align");
    }

    const lockAfter = testOnly?.phase0After
      ?? await securelyReadJson(root, PHASE0_EVIDENCE_LOCK_PATH);
    const afterBytes = lockAfter.bytes ?? Buffer.from(
      `${JSON.stringify(lockAfter.value)}\n`,
      "utf8",
    );
    if (sha256(afterBytes) !== references.phase0EvidenceLockSha256) {
      fail("phase0_lock_mismatch", "Phase 0 lock digest changed");
    }
    const afterFailures = testOnly?.phase0AfterFailures
      ?? await verifyPhase0EvidenceLock({
        root,
        lock: lockAfter.value,
        headRef: "HEAD",
      });
    if (!Array.isArray(afterFailures) || afterFailures.length !== 0) {
      fail("phase0_lock_mismatch", "Phase 0 evidence changed");
    }
    summary = readySummary({
      checkedAt,
      commit: references.commit,
      evidenceSha256: references.evidenceSha256,
      phase0EvidenceLockSha256: references.phase0EvidenceLockSha256,
      productionControlSha256: references.productionControlSha256,
      summaries,
    });
  } catch (error) {
    summary = notReadySummary({
      checkedAt,
      code: error instanceof AggregateCheckError ? error.code : "internal_check_failed",
      references,
    });
  }
  validateAggregateOutput(summary);
  await writeFileAtomicallyWithinTrustedRoot({
    root,
    relativePath: PHASE1_AGGREGATE_SUMMARY_RELATIVE,
    data: `${JSON.stringify(summary, null, 2)}\n`,
    mode: 0o644,
  });
  return {
    mode,
    offline,
    output: path.join(root, PHASE1_AGGREGATE_SUMMARY_RELATIVE),
    summary,
  };
}

const parseArguments = (argumentsList) => {
  let mode = "offline";
  let root = defaultRoot;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--offline" || argument === "--live") {
      mode = argument.slice(2);
    } else if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        fail("unsupported_arguments", "--root requires a directory");
      }
      root = path.resolve(value);
      index += 1;
    } else {
      fail("unsupported_arguments", `unsupported argument: ${argument}`);
    }
  }
  return { mode, root };
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await runFrontendUpgradePhase1Check(
      parseArguments(process.argv.slice(2)),
    );
    if (result.mode === "offline") {
      if (!result.offline.passed) {
        console.error("FAIL: frontend upgrade Phase 1 offline aggregate gate failed");
        process.exitCode = 1;
      } else {
        console.log(
          "Frontend upgrade Phase 1 offline aggregate valid: "
          + `${result.offline.counts.systemSurfaces} systems, `
          + `${result.offline.counts.targetGates} gates, `
          + `${result.offline.counts.activatedFutureStates} activated future states, `
          + `${result.offline.counts.visualCases} visual cases.`,
        );
      }
    } else {
      console.log(JSON.stringify(result.summary, null, 2));
      if (result.summary.status !== "ready-for-review") process.exitCode = 1;
    }
  } catch {
    console.error("FAIL: frontend upgrade Phase 1 aggregate check failed");
    process.exitCode = 1;
  }
}
