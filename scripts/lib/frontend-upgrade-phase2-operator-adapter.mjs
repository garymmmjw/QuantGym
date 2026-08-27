import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  constants as fsConstants,
  createReadStream,
} from "node:fs";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  open,
  readdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ProxyAgent, fetch as undiciFetch } from "undici";

import {
  createApprovedPhase2OperatorCapabilities as createNativeApprovedCapabilities,
} from "./frontend-upgrade-phase2-approved-capabilities.mjs";

import {
  PHASE2_LIVE_CHECK_IDS,
  PHASE2_REQUIRED_ANCESTOR_COMMITS,
  PHASE2_RESOURCE_CONTRACT,
} from "./frontend-upgrade-phase2-provider-evidence.mjs";
import {
  finalizePhase2TerminalRevocationIntent,
} from "./frontend-upgrade-phase2-cutover-orchestrator.mjs";
import {
  parseStrictPytestEvidence,
} from "./frontend-upgrade-phase2-contract-evidence.mjs";

const REQUIRED_NODE_VERSION = "20.20.2";
const REQUIRED_NPM_VERSION = "10.8.2";
const REQUIRED_PYTHON_VERSION = "3.13.14";
const REQUIRED_PYTHON_SITE_PACKAGES_RELATIVE_PATH = "lib/python3.13/site-packages";
const REQUIRED_PYTHON_SITE_PACKAGES_CLOSURE_SHA256 = (
  "355c445c683c12a9867600abce8fe32d2acfc892bec3d098a74d9cf27914d364"
);
const REQUIRED_PYTHON_DISTRIBUTIONS = Object.freeze([
  ["alembic", "1.18.5"],
  ["annotated-doc", "0.0.4"],
  ["annotated-types", "0.7.0"],
  ["anyio", "4.14.2"],
  ["argon2-cffi", "25.1.0"],
  ["argon2-cffi-bindings", "25.1.0"],
  ["asgi-lifespan", "2.1.0"],
  ["boto3", "1.43.51"],
  ["botocore", "1.43.51"],
  ["certifi", "2026.6.17"],
  ["cffi", "2.1.0"],
  ["charset-normalizer", "3.4.9"],
  ["click", "8.4.2"],
  ["cryptography", "49.0.0"],
  ["dnspython", "2.8.0"],
  ["docker", "7.2.0"],
  ["email-validator", "2.3.0"],
  ["fastapi", "0.139.2"],
  ["h11", "0.16.0"],
  ["httpcore", "1.0.9"],
  ["httptools", "0.8.0"],
  ["httpx", "0.28.1"],
  ["idna", "3.18"],
  ["iniconfig", "2.3.0"],
  ["jmespath", "1.1.0"],
  ["mako", "1.3.12"],
  ["markupsafe", "3.0.3"],
  ["packaging", "26.2"],
  ["pip", "26.1.2"],
  ["pluggy", "1.6.0"],
  ["psycopg", "3.3.4"],
  ["psycopg-binary", "3.3.4"],
  ["pwdlib", "0.3.0"],
  ["pycparser", "3.0"],
  ["pydantic", "2.13.4"],
  ["pydantic-core", "2.46.4"],
  ["pydantic-settings", "2.14.2"],
  ["pygments", "2.20.0"],
  ["pyjwt", "2.13.0"],
  ["pytest", "9.1.1"],
  ["pytest-asyncio", "1.4.0"],
  ["python-dateutil", "2.9.0.post0"],
  ["python-dotenv", "1.2.2"],
  ["pyyaml", "6.0.3"],
  ["requests", "2.34.2"],
  ["s3transfer", "0.19.1"],
  ["six", "1.17.0"],
  ["sniffio", "1.3.1"],
  ["sqlalchemy", "2.0.51"],
  ["starlette", "1.3.1"],
  ["testcontainers", "4.14.2"],
  ["typing-extensions", "4.16.0"],
  ["typing-inspection", "0.4.2"],
  ["urllib3", "2.7.0"],
  ["uvicorn", "0.51.0"],
  ["uvloop", "0.22.1"],
  ["watchfiles", "1.2.0"],
  ["websockets", "16.1.1"],
  ["wrapt", "2.2.2"],
].map(([name, version]) => Object.freeze({ name, version })));
const REQUIRED_POSTGRES_VERSION = "18.4";
const REQUIRED_POSTGRES_EXECUTABLE_SHA256 = Object.freeze({
  pg_dump: "1c4a884d5ad3154fedf80cc9b28e5a1d4447293adfcea862998f8c93b79076bd",
  pg_restore: "51f5f3a9b5245a04547186a1a2649b3f1229596def9c86e5e245499586cafe0a",
  psql: "823383db827c7edc654465e52ebf9284126c13fbd97fbac8bf799878515809a4",
});
const REQUIRED_WRANGLER_VERSION = "4.86.0";
const REQUIRED_WRANGLER_BIN_SHA256 = (
  "770db21641fb72c8035877b33c6a32856d61d253b58d9ea20e37820bcbc79007"
);
const REPOSITORY = "garymmmjw/QuantGym";
const REPOSITORY_URL = "https://github.com/garymmmjw/QuantGym";
const BRANCH = "codex/frontend-v2-preview";
const PULL_REQUEST_NUMBER = 130;
const PREVIEW_PAGES = "quantgym-v2-preview";
const PRODUCTION_PAGES = "quantgym-beta";
const PREVIEW_API = "quantgym-v2-preview-api";
const PRODUCTION_API = "quantgym-api";
const PREVIEW_LLM = "quantgym-v2-preview-llm";
const PRODUCTION_LLM = "quantgym-llm";
const PREVIEW_POSTGRES = "quantgym-v2-preview-postgres";
const PRODUCTION_POSTGRES = "quantgym-postgres";
const PREVIEW_R2 = "quantgym-v2-preview-media";
const PRODUCTION_R2 = "quantgym-media";
const PHASE1_COMMIT = PHASE2_REQUIRED_ANCESTOR_COMMITS[0];
const PHASE1_REVISION = "0001_phase1_foundation";
const PHASE2_REVISION = "0002_phase2_daily_training";
const R2_BASE_PREFIX = "readiness-smoke/phase2/";
const MAX_HTTP_BYTES = 2 * 1024 * 1024;
const MAX_COMMAND_BYTES = 4 * 1024 * 1024;
const MAX_R2_OBJECTS = 32;
const MAX_ARTIFACT_FILES = 4096;
const MAX_ARTIFACT_FILE_BYTES = 16 * 1024 * 1024;
const MAX_TOOL_CLOSURE_BYTES = 512 * 1024 * 1024;
const ARTIFACT_MANIFEST_PATH = ".well-known/quantgym-phase2-artifact-manifest.json";
const OPERATOR_TOOLCHAIN_LOCK_PATH = "docs/frontend-upgrade/phase-2-operator-toolchain-lock.json";
const HTTP_TIMEOUT_MS = 20_000;
const DEPLOY_TIMEOUT_MS = 15 * 60 * 1_000;
const POLL_INTERVAL_MS = 5_000;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const RIGHTS_CONTENT_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/u;
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/u;
const TOKEN_ID_PATTERN = /^[0-9a-f]{32}$/u;
const SAFE_ROLE_PATTERN = /^qg_phase2_[a-z0-9_]{4,48}$/u;
const RESTORE_DATABASE_PATTERN = /^quantgym_v2_phase2_restore_[a-z0-9_]{4,48}$/u;
const SAFE_FAILURE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/u;
const REMAINING_READ_ONLY_CONTROL_PROVIDERS = Object.freeze([
  "cloudflare",
  "r2",
]);
const TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS = Object.freeze(["render"]);
const TERMINAL_TEMPORARY_CONTROL_PROVIDERS = Object.freeze(["postgres", "render"]);
const SQL_MANAGED_POSTGRES_ROLES = Object.freeze({
  control: "qg_phase2_control_access",
  mutation: "qg_phase2_mutation_access",
  restore: "qg_phase2_restore_access",
});
const CLOUDFLARE_PERMISSION_GROUP_IDS = Object.freeze({
  accountTokensRead: "eb56a6953c034b9d97dd838155666f06",
  accountTokensWrite: "5bc3f8b21c554832afc660159ab75fa4",
  pagesRead: "e247aedd66bd41cc9193af0213416666",
  pagesWrite: "8d28297797f24fb8a0c332fe0866ec89",
  r2BucketItemRead: "6a018a9f2fc74eb6b293b0c548f38b39",
  r2BucketItemWrite: "2efd5506f9c8494dacb1fa10a3e7d5b6",
  r2StorageRead: "b4992e1108244f5d8bfbd5744320c2e1",
});
const CLOUDFLARE_BUCKET_PERMISSION_GROUP_IDS = new Set([
  CLOUDFLARE_PERMISSION_GROUP_IDS.r2BucketItemRead,
  CLOUDFLARE_PERMISSION_GROUP_IDS.r2BucketItemWrite,
]);
const MUTATION_CREDENTIAL_MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const ALLOWED_UNTRACKED_PATHS = Object.freeze([
  "docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json",
  "docs/browser-audit-screenshots/371-current-preview-audit.png",
  "docs/browser-audit-screenshots/372-mascot-quality-auth-before.png",
  "docs/browser-audit-screenshots/374-mascot-quality-auth-final.jpg",
]);
const CONTROL_KEYS = Object.freeze([
  "cloudflareApiToken",
  "r2AccessKeyId",
  "r2ExpiresAt",
  "r2SecretAccessKey",
  "renderAccessToken",
  "renderCredentialFilePath",
  "renderCredentialKind",
  "renderRefreshToken",
]);
const BOOTSTRAP_KEYS = Object.freeze([
  "previewDatabaseAdminUrl",
]);
const MUTATION_KEYS = Object.freeze([
  "cloudflareAccountTokenId",
  "cloudflareApiToken",
  "r2AccessKeyId",
  "r2ExpiresAt",
  "r2ParentTokenId",
  "r2SecretAccessKey",
  "renderAccessToken",
  "renderCredentialFilePath",
  "renderCredentialKind",
  "renderRefreshToken",
]);
const ACCEPTANCE_CAPABILITY_METHODS = Object.freeze([
  "preflight",
  "seed",
  "runAccessibility",
  "runDailyLoop",
  "runVisual",
  "cleanup",
  "verifyRecovery",
]);
const CONTROL_CAPABILITY_METHODS = Object.freeze([
  "preflight",
]);
const REVOCATION_CAPABILITY_METHODS = Object.freeze([
  "preflight",
  "revokePostgres",
  "revokeRender",
]);
const ACTION_CREDENTIAL_SCOPES = Object.freeze({
  verifyRecovery: Object.freeze({
    database: "control",
    r2: "control",
  }),
});

const moduleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const TRUSTED_GIT_ENV = Object.freeze({
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
  HOME: process.env.HOME ?? tmpdir(),
  LANG: "C",
  LC_ALL: "C",
  PATH: "/usr/bin:/bin",
});
const authenticProductionOperatorAdapters = new WeakSet();

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
const clean = (value) => typeof value === "string" ? value.trim() : "";
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlIdentifier = (value, phase) => {
  const normalized = clean(value);
  requireCondition(
    /^[a-z_][a-z0-9_]{0,62}$/u.test(normalized),
    "POSTGRES_IDENTIFIER_INVALID",
    phase,
  );
  return `"${normalized}"`;
};
const isR2AccessDenied = (status, body) => (
  status === 403
  && typeof body === "string"
  && !/<!DOCTYPE|<!ENTITY/iu.test(body)
  && /<Code>AccessDenied<\/Code>/u.test(body)
);
const isPostgresAuthenticationDenial = (stderr) => (
  typeof stderr === "string"
  && /(?:password authentication failed for user|role "[^"]+" does not exist)/iu.test(stderr)
  && !/(?:timeout|timed out|could not connect|connection refused|network|TLS|certificate)/iu.test(
    stderr,
  )
);

const phase2RenderDeploymentTargets = (topology) => {
  requireCondition(
    isPlainObject(topology?.previewApi)
      && isPlainObject(topology?.previewLlm)
      && clean(topology.previewApi.id)
      && clean(topology.previewLlm.id)
      && topology.previewApi.id !== topology.previewLlm.id,
    "TOPOLOGY_REQUIRED",
    "api-deploy",
  );
  return Object.freeze([topology.previewApi]);
};
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
const delay = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

export class Phase2OperatorError extends Error {
  constructor(code, phase) {
    const normalizedCode = clean(code);
    const normalizedPhase = clean(phase);
    if (
      !SAFE_FAILURE_CODE_PATTERN.test(normalizedCode)
      || !/^[a-z][a-z0-9-]{1,63}$/u.test(normalizedPhase)
    ) throw new Error("invalid Phase 2 operator failure");
    super(`${normalizedCode} (${normalizedPhase})`);
    this.name = "Phase2OperatorError";
    this.code = normalizedCode;
    this.phase = normalizedPhase;
  }
}

const fail = (code, phase) => {
  throw new Phase2OperatorError(code, phase);
};

const requireCondition = (condition, code, phase) => {
  if (!condition) fail(code, phase);
};

const RECOVERY_JOURNAL_FILE_OPERATIONS = Object.freeze({
  lstat,
  open,
  realpath,
  rename,
  rm,
});

const syncRecoveryJournalDirectory = async ({
  directoryPath,
  fileOperations,
}) => {
  let directoryHandle;
  try {
    const resolvedDirectoryPath = typeof fileOperations.realpath === "function"
      ? await fileOperations.realpath(directoryPath)
      : directoryPath;
    directoryHandle = await fileOperations.open(
      resolvedDirectoryPath,
      fsConstants.O_RDONLY
        | (fsConstants.O_DIRECTORY ?? 0)
        | (fsConstants.O_NOFOLLOW ?? 0),
    );
    await directoryHandle.sync();
  } finally {
    await directoryHandle?.close();
  }
};

const persistRecoveryJournalFile = async ({
  journalPath,
  source,
  fileOperations = RECOVERY_JOURNAL_FILE_OPERATIONS,
}) => {
  const temporaryPath = `${journalPath}.${randomUUID()}.tmp`;
  let renamed = false;
  try {
    let temporaryHandle;
    try {
      temporaryHandle = await fileOperations.open(
        temporaryPath,
        fsConstants.O_WRONLY
          | fsConstants.O_CREAT
          | fsConstants.O_EXCL
          | (fsConstants.O_NOFOLLOW ?? 0),
        0o600,
      );
      await temporaryHandle.writeFile(source, { encoding: "utf8" });
      await temporaryHandle.chmod(0o600);
      await temporaryHandle.sync();
    } finally {
      await temporaryHandle?.close();
    }
    await fileOperations.rename(temporaryPath, journalPath);
    renamed = true;
    await syncRecoveryJournalDirectory({
      directoryPath: path.dirname(journalPath),
      fileOperations,
    });
    const metadata = await fileOperations.lstat(journalPath);
    requireCondition(
      metadata.isFile()
        && !metadata.isSymbolicLink()
        && metadata.nlink === 1
        && (metadata.mode & 0o777) === 0o600,
      "RECOVERY_JOURNAL_WRITE_FAILED",
      "recovery-journal",
    );
  } catch (error) {
    if (!renamed) {
      await fileOperations.rm(temporaryPath, { force: true }).catch(() => {});
    }
    if (error instanceof Phase2OperatorError) throw error;
    fail("RECOVERY_JOURNAL_WRITE_FAILED", "recovery-journal");
  }
};

const removeRecoveryJournalFile = async ({
  journalPath,
  fileOperations = RECOVERY_JOURNAL_FILE_OPERATIONS,
}) => {
  try {
    await fileOperations.rm(journalPath, { force: true });
    await syncRecoveryJournalDirectory({
      directoryPath: path.dirname(journalPath),
      fileOperations,
    });
  } catch (error) {
    if (error instanceof Phase2OperatorError) throw error;
    fail("RECOVERY_JOURNAL_CLEANUP_FAILED", "recovery-journal");
  }
};

const mutationRevocationOutcome = (state) => {
  const values = Object.values(state);
  if (values.every((value) => value === false)) return "none";
  if (values.every((value) => value === true)) return "complete";
  return "partial";
};

const runRecoveryRevocationClosure = async ({
  attempt,
  revokeCloudflare,
  revokeControlRender,
  revokePostgres,
  revokeR2,
  revokeRender,
}) => {
  const [postgres, r2] = await Promise.all([
    attempt("postgres-revoke", revokePostgres),
    attempt("r2-revoke", revokeR2),
  ]);
  let cloudflare = Object.freeze({ ok: false, value: undefined });
  if (r2.ok) {
    cloudflare = await attempt("cloudflare-revoke", revokeCloudflare);
  }
  const render = await attempt("render-revoke", revokeRender);
  const controlRender = await attempt("control-render-revoke", revokeControlRender);
  return Object.freeze({ cloudflare, controlRender, postgres, r2, render });
};

const runOrderedTerminalControlRevocations = async ({
  revokePostgres,
  revokeRender,
}) => {
  const postgresProof = await revokePostgres();
  const renderProof = await revokeRender();
  return Object.freeze({ postgresProof, renderProof });
};

const recoverTerminalPostgresControl = async ({
  controlAcknowledged,
  reverifyAcknowledged,
  runFullRevocation,
}) => (
  controlAcknowledged
    ? reverifyAcknowledged()
    : runFullRevocation()
);

const sqlManagedPostgresRevocationDisposition = ({
  journalCreated,
  loginDenied,
  phase,
  priorAttempt,
  rolePresent,
}) => {
  requireCondition(
    typeof journalCreated === "boolean"
      && typeof loginDenied === "boolean"
      && typeof priorAttempt === "boolean"
      && typeof rolePresent === "boolean",
    "POSTGRES_REVOKE_SEQUENCE_INVALID",
    phase,
  );
  if (rolePresent) return "cleanup-required";
  requireCondition(
    loginDenied && (priorAttempt || !journalCreated),
    "POSTGRES_REVOKE_SEQUENCE_INVALID",
    phase,
  );
  return "already-absent";
};

const annotateMutationRevocationFailure = (error, state, phase) => {
  const safeError = error instanceof Phase2OperatorError
    ? error
    : new Phase2OperatorError("MUTATION_REVOKE_FAILED", phase);
  Object.defineProperty(safeError, "mutationRevocationOutcome", {
    configurable: false,
    enumerable: true,
    value: mutationRevocationOutcome(state),
    writable: false,
  });
  return safeError;
};

const requireText = (value, code, phase, pattern = undefined) => {
  const normalized = clean(value);
  requireCondition(
    normalized.length > 0
      && normalized.length <= 4096
      && !normalized.includes("\0")
      && (pattern === undefined || pattern.test(normalized)),
    code,
    phase,
  );
  return normalized;
};

const hashFile = async (filePath) => new Promise((resolve, reject) => {
  const digest = createHash("sha256");
  const input = createReadStream(filePath);
  input.on("error", reject);
  input.on("data", (chunk) => digest.update(chunk));
  input.on("end", () => resolve(digest.digest("hex")));
});

const sameBackupFileIdentity = (left, right) => (
  isPlainObject(left)
  && isPlainObject(right)
  && exactKeys(left, ["device", "inode", "mode", "size"])
  && canonicalJson(left) === canonicalJson(right)
);

const inspectBackupFileNoFollow = async ({
  backupPath,
  code = "RECOVERY_BACKUP_INVALID",
  phase,
}) => {
  let directoryMetadata;
  let pathMetadata;
  let handle;
  let before;
  let after;
  let currentDirectoryMetadata;
  let currentPathMetadata;
  let backupSha256;
  try {
    [directoryMetadata, pathMetadata] = await Promise.all([
      lstat(path.dirname(backupPath), { bigint: true }),
      lstat(backupPath, { bigint: true }),
    ]);
    const expectedUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : null;
    requireCondition(
      directoryMetadata.isDirectory()
        && !directoryMetadata.isSymbolicLink()
        && Number(directoryMetadata.mode & 0o777n) === 0o700
        && (expectedUid === null || directoryMetadata.uid === expectedUid)
        && pathMetadata.isFile()
        && !pathMetadata.isSymbolicLink()
        && pathMetadata.nlink === 1n
        && pathMetadata.size > 0n
        && Number(pathMetadata.mode & 0o777n) === 0o600
        && (expectedUid === null || pathMetadata.uid === expectedUid),
      code,
      phase,
    );
    handle = await open(backupPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    before = await handle.stat({ bigint: true });
    const digest = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      digest.update(chunk);
    }
    backupSha256 = digest.digest("hex");
    [after, currentDirectoryMetadata, currentPathMetadata] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(path.dirname(backupPath), { bigint: true }),
      lstat(backupPath, { bigint: true }),
    ]);
  } catch (error) {
    if (error instanceof Phase2OperatorError) throw error;
    fail(code, phase);
  } finally {
    await handle?.close().catch(() => {});
  }
  const stableFields = ["dev", "ino", "mode", "nlink", "size", "mtimeNs", "ctimeNs"];
  requireCondition(
    stableFields.every((field) => before[field] === after[field])
      && stableFields.every((field) => pathMetadata[field] === currentPathMetadata[field])
      && directoryMetadata.dev === currentDirectoryMetadata.dev
      && directoryMetadata.ino === currentDirectoryMetadata.ino
      && directoryMetadata.mode === currentDirectoryMetadata.mode
      && directoryMetadata.uid === currentDirectoryMetadata.uid
      && currentDirectoryMetadata.isDirectory()
      && !currentDirectoryMetadata.isSymbolicLink()
      && pathMetadata.dev === before.dev
      && pathMetadata.ino === before.ino
      && currentPathMetadata.dev === after.dev
      && currentPathMetadata.ino === after.ino
      && before.isFile()
      && before.nlink === 1n
      && before.size > 0n
      && Number(before.mode & 0o777n) === 0o600
      && HASH_PATTERN.test(backupSha256),
    code,
    phase,
  );
  return Object.freeze({
    backupFileIdentity: Object.freeze({
      device: String(after.dev),
      inode: String(after.ino),
      mode: Number(after.mode & 0o777n),
      size: String(after.size),
    }),
    backupSha256,
  });
};

const validateBackupArchiveSnapshot = async ({
  backupPath,
  code = "RECOVERY_BACKUP_INVALID",
  expected,
  inspectArchive,
  phase,
}) => {
  const before = await inspectBackupFileNoFollow({ backupPath, code, phase });
  const archive = await inspectArchive(backupPath, phase);
  const after = await inspectBackupFileNoFollow({ backupPath, code, phase });
  const current = Object.freeze({
    archiveEntryCount: archive.archiveEntryCount,
    archiveTocSha256: archive.archiveTocSha256,
    backupFileIdentity: after.backupFileIdentity,
    backupSha256: after.backupSha256,
  });
  requireCondition(
    sameBackupFileIdentity(before.backupFileIdentity, after.backupFileIdentity)
      && before.backupSha256 === after.backupSha256
      && HASH_PATTERN.test(current.archiveTocSha256 ?? "")
      && Number.isSafeInteger(current.archiveEntryCount)
      && current.archiveEntryCount > 0
      && (
        expected === undefined
        || (
          sameBackupFileIdentity(current.backupFileIdentity, expected.backupFileIdentity)
          && current.backupSha256 === expected.backupSha256
          && current.archiveTocSha256 === expected.archiveTocSha256
          && current.archiveEntryCount === expected.archiveEntryCount
        )
      ),
    code,
    phase,
  );
  return current;
};

const runBackupGuardedDatabaseRestore = async ({
  revalidateBackup,
  resetDatabase,
  restoreArchive,
}) => {
  await revalidateBackup("before-reset");
  await resetDatabase();
  await revalidateBackup("before-pg-restore");
  await restoreArchive();
};

const verifyTerminalRevocationProofBinding = ({
  phase = "evidence-finalization",
  postRevokeReceipt,
  postgresControlProof,
  renderControlProof,
}) => {
  const details = postRevokeReceipt?.details;
  requireCondition(
    isPlainObject(details)
      && isPlainObject(postgresControlProof)
      && isPlainObject(renderControlProof)
      && canonicalJson(details.postgresControlIdentity)
        === canonicalJson(postgresControlProof)
      && details.renderControlRevoked === renderControlProof.revoked
      && details.renderControlAccessDenied === renderControlProof.accessDenied
      && details.renderControlRefreshDenied === renderControlProof.refreshDenied
      && details.renderControlCredentialIdentitySha256
        === renderControlProof.credentialIdentitySha256
      && details.renderControlRevocationEvidenceSha256
        === renderControlProof.evidenceSha256,
    "TERMINAL_REVOCATION_PROOF_MISMATCH",
    phase,
  );
  return true;
};

const runTimedObservationBatch = async ({
  now,
  probes,
  phase = "terminal-continuity-observation",
}) => {
  requireCondition(
    typeof now === "function"
      && Array.isArray(probes)
      && probes.length > 0
      && probes.every((probe) => typeof probe === "function"),
    "TERMINAL_CONTINUITY_OBSERVATION_INVALID",
    phase,
  );
  const startedAt = now().toISOString();
  const values = await Promise.all(probes.map((probe) => probe()));
  const completedAt = now().toISOString();
  requireCondition(
    Date.parse(completedAt) >= Date.parse(startedAt),
    "TERMINAL_CONTINUITY_OBSERVATION_INVALID",
    phase,
  );
  return Object.freeze({
    startedAt,
    completedAt,
    values: Object.freeze(values),
  });
};

const verifySustainableTerminalContinuityObservation = ({
  checkedAt,
  completedAt,
  continuityBasis,
  observation,
  phase = "terminal-continuity-revalidation",
}) => {
  const cloudflare = observation?.cloudflare;
  const pullRequest = observation?.pullRequest;
  requireCondition(
    isPlainObject(continuityBasis)
      && isPlainObject(observation)
      && isPlainObject(cloudflare)
      && isPlainObject(pullRequest)
      && typeof checkedAt === "string"
      && Number.isFinite(Date.parse(checkedAt))
      && typeof completedAt === "string"
      && Number.isFinite(Date.parse(completedAt))
      && Date.parse(completedAt) >= Date.parse(checkedAt)
      && canonicalJson(pullRequest) === canonicalJson(continuityBasis.pullRequest)
      && observation.apiEvidenceSha256
        === continuityBasis.previewApi?.evidenceSha256
      && observation.databaseRevision === continuityBasis.previewDatabase?.revision
      && observation.databaseEvidenceSha256
        === continuityBasis.previewDatabase?.evidenceSha256
      && observation.remainingR2Count === 0
      && observation.r2BucketBound === true
      && observation.r2PolicyReadOnly === true
      && observation.r2WriteDenied === true
      && observation.r2ProductionAccessDenied === true
      && observation.r2EvidenceSha256 === continuityBasis.previewR2?.evidenceSha256
      && cloudflare.previewPagesDeploymentCommit
        === continuityBasis.previewAnchor?.pagesDeploymentCommit
      && cloudflare.productionPagesDeploymentCommit
        === continuityBasis.productionAnchor?.pagesDeploymentCommit
      && cloudflare.previewPagesIdentitySha256
        === continuityBasis.resources?.pages?.identitySha256
      && cloudflare.productionPagesIdentitySha256
        === continuityBasis.resources?.productionPages?.identitySha256
      && cloudflare.previewR2IdentitySha256
        === continuityBasis.resources?.r2?.identitySha256
      && cloudflare.productionR2IdentitySha256
        === continuityBasis.resources?.productionR2?.identitySha256
      && cloudflare.previewPagesAutomaticDeploysDisabled === true
      && cloudflare.previewPagesPreviewDeploymentsDisabled === true
      && cloudflare.productionPagesBranch === "main"
      && cloudflare.productionPagesConfigurationSha256
        === continuityBasis.productionAnchor?.pagesConfigurationSha256
      && cloudflare.productionPagesSuccessfulDeploymentSetSha256
        === continuityBasis.productionAnchor?.pagesSuccessfulDeploymentSetSha256
      && cloudflare.candidateCommitRecordCount
        === continuityBasis.productionAnchor?.candidateCommitRecordCount
      && cloudflare.candidateCommitSkippedRecordCount
        === continuityBasis.productionAnchor?.candidateCommitSkippedRecordCount
      && cloudflare.candidateCommitStartedRecordCount
        === continuityBasis.productionAnchor?.candidateCommitStartedRecordCount
      && cloudflare.candidateCommitAliasedRecordCount
        === continuityBasis.productionAnchor?.candidateCommitAliasedRecordCount
      && cloudflare.candidateCommitActiveDeploymentCount
        === continuityBasis.productionAnchor?.candidateCommitActiveDeploymentCount,
    "TERMINAL_CONTINUITY_REVALIDATION_FAILED",
    phase,
  );
  const cloudflareEvidenceSha256 = sha256(canonicalJson({
    previewPagesDeploymentCommit: cloudflare.previewPagesDeploymentCommit,
    productionPagesDeploymentCommit: cloudflare.productionPagesDeploymentCommit,
    previewPagesIdentitySha256: cloudflare.previewPagesIdentitySha256,
    productionPagesIdentitySha256: cloudflare.productionPagesIdentitySha256,
    previewR2IdentitySha256: cloudflare.previewR2IdentitySha256,
    productionR2IdentitySha256: cloudflare.productionR2IdentitySha256,
  }));
  const proof = {
    status: "pass",
    checkedAt,
    completedAt,
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
    pullRequestEvidenceSha256: pullRequest.evidenceSha256,
    previewApiEvidenceSha256: observation.apiEvidenceSha256,
    previewDatabaseEvidenceSha256: observation.databaseEvidenceSha256,
    previewR2EvidenceSha256: observation.r2EvidenceSha256,
  };
  return Object.freeze({
    ...proof,
    evidenceSha256: sha256(canonicalJson(proof)),
  });
};

const receipt = (label, details) => Object.freeze({
  status: "pass",
  environment: "preview",
  productionMutation: false,
  evidenceSha256: sha256(canonicalJson({ label, details })),
  details: Object.freeze(structuredClone(details)),
});

const unwrap = (value, key) => (
  isPlainObject(value) && isPlainObject(value[key]) ? value[key] : value
);

const normalizeRepository = (value) => clean(value)
  .replace(/^git@github\.com:/iu, "https://github.com/")
  .replace(/^ssh:\/\/git@github\.com\//iu, "https://github.com/")
  .replace(/\.git$/iu, "")
  .replace(/\/$/u, "")
  .toLowerCase();

const evidenceCheckWorkflowRunId = (check, evidenceHeadCommit) => {
  const match = new RegExp(
    `^https://github\\.com/${REPOSITORY.replace("/", "\\/")}`
      + "/actions/runs/([1-9][0-9]*)(?:/job/[1-9][0-9]*)?$",
    "u",
  ).exec(clean(check?.details_url));
  requireCondition(
    match !== null
      && clean(check?.head_sha).toLowerCase() === evidenceHeadCommit
      && clean(check?.app?.slug) === "github-actions"
      && Number.isSafeInteger(check?.check_suite?.id)
      && check.check_suite.id > 0,
    "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
    "candidate-gate",
  );
  return match[1];
};

const selectLatestEvidenceCheckSet = (
  checkRuns,
  evidenceHeadCommit,
  requiredCheckNames,
) => {
  const checks = Array.isArray(checkRuns?.check_runs) ? checkRuns.check_runs : [];
  const totalCount = checkRuns?.total_count;
  requireCondition(
    Number.isSafeInteger(totalCount)
      && totalCount >= requiredCheckNames.length
      && totalCount <= 100
      && checks.length === totalCount
      && checks.every((check) => (
        clean(check?.head_sha).toLowerCase() === evidenceHeadCommit
      )),
    "EVIDENCE_HEAD_CI_NOT_GREEN",
    "candidate-gate",
  );
  const requiredNames = new Set(requiredCheckNames);
  const githubChecks = checks.filter((check) => clean(check?.app?.slug) === "github-actions");
  requireCondition(
    githubChecks.filter((check) => requiredNames.has(clean(check?.name))).length
      >= requiredCheckNames.length,
    "EVIDENCE_HEAD_CI_NOT_GREEN",
    "candidate-gate",
  );
  const groups = new Map();
  for (const check of githubChecks) {
    const workflowRunId = evidenceCheckWorkflowRunId(check, evidenceHeadCommit);
    const checkSuiteId = check.check_suite.id;
    const key = `${workflowRunId}:${checkSuiteId}`;
    const group = groups.get(key) ?? { checkSuiteId, checks: [], workflowRunId };
    group.checks.push(check);
    groups.set(key, group);
  }
  const orderedGroups = [...groups.values()].sort((left, right) => {
    const leftId = BigInt(left.workflowRunId);
    const rightId = BigInt(right.workflowRunId);
    if (leftId !== rightId) return leftId < rightId ? -1 : 1;
    return left.checkSuiteId - right.checkSuiteId;
  }).filter((group) => group.checks.some((check) => (
    requiredNames.has(clean(check?.name))
  )));
  const selected = orderedGroups.at(-1);
  requireCondition(
    selected !== undefined
      && selected.checks.length === requiredCheckNames.length
      && canonicalJson(selected.checks.map((check) => clean(check?.name)).sort())
        === canonicalJson([...requiredCheckNames].sort())
      && selected.checks.every((check) => (
        check.status === "completed" && check.conclusion === "success"
      )),
    "EVIDENCE_HEAD_CI_NOT_GREEN",
    "candidate-gate",
  );
  return Object.freeze({
    checkSuiteId: sharedEvidenceCheckSuiteId(selected.checks),
    checks: Object.freeze([...selected.checks]),
    workflowRunId: selected.workflowRunId,
  });
};

const sharedEvidenceCheckSuiteId = (checks) => {
  const suiteIds = [...new Set(checks.map((check) => check?.check_suite?.id))];
  requireCondition(
    suiteIds.length === 1
      && Number.isSafeInteger(suiteIds[0])
      && suiteIds[0] > 0,
    "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
    "candidate-gate",
  );
  return suiteIds[0];
};

const isEvidenceWorkflowRunIdentity = (
  run,
  evidenceHeadCommit,
  expectedCheckSuiteId,
  expectedRunId,
) => (
  Number.isSafeInteger(run?.id)
  && run.id > 0
  && String(run.id) === expectedRunId
  && clean(run?.path) === ".github/workflows/frontend-v2-preview.yml"
  && clean(run?.event) === "pull_request"
  && clean(run?.head_sha).toLowerCase() === evidenceHeadCommit
  && clean(run?.head_branch) === BRANCH
  && run?.check_suite_id === expectedCheckSuiteId
  && run?.run_attempt === 1
  && run?.status === "completed"
  && run?.conclusion === "success"
  && Array.isArray(run?.pull_requests)
  && run.pull_requests.some((pull) => pull?.number === PULL_REQUEST_NUMBER)
);

const safeUrl = (value, expectedHostname, code, phase) => {
  let parsed;
  try {
    parsed = new URL(requireText(value, code, phase));
  } catch {
    fail(code, phase);
  }
  requireCondition(
    parsed.protocol === "https:"
      && parsed.hostname === expectedHostname
      && !parsed.username
      && !parsed.password
      && !parsed.port
      && parsed.pathname === "/"
      && !parsed.search
      && !parsed.hash,
    code,
    phase,
  );
  return parsed.origin;
};

const parseOperatorHttpsProxy = (value, code, phase) => {
  let parsed;
  try {
    parsed = new URL(requireText(value, code, phase));
  } catch {
    fail(code, phase);
  }
  requireCondition(
    parsed.protocol === "http:"
      && parsed.hostname === "127.0.0.1"
      && parsed.port === "9090"
      && !parsed.username
      && !parsed.password
      && parsed.pathname === "/"
      && !parsed.search
      && !parsed.hash,
    code,
    phase,
  );
  return Object.freeze({
    identitySha256: sha256(canonicalJson({
      hostname: "127.0.0.1",
      port: 9090,
      protocol: "http:",
    })),
    loopback: true,
    url: parsed.origin,
  });
};

const parseDatabaseUrl = (value, code, phase) => {
  let parsed;
  try {
    parsed = new URL(requireText(value, code, phase));
  } catch {
    fail(code, phase);
  }
  requireCondition(
    new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
      && parsed.hostname
      && parsed.username
      && parsed.password
      && parsed.pathname.startsWith("/")
      && !parsed.hash,
    code,
    phase,
  );
  let user;
  let password;
  let database;
  try {
    user = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
    database = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    fail(code, phase);
  }
  const query = [...parsed.searchParams.entries()];
  requireCondition(
    user
      && password
      && database
      && !database.includes("/")
      && query.length === 1
      && query[0][0] === "sslmode"
      && new Set(["require", "verify-ca", "verify-full"]).has(query[0][1]),
    code,
    phase,
  );
  return Object.freeze({
    database,
    host: parsed.hostname.toLowerCase(),
    password,
    port: parsed.port || "5432",
    sslmode: query[0][1],
    user,
  });
};

const databaseUrlForIdentity = (identity) => (
  `postgresql://${encodeURIComponent(identity.user)}:${encodeURIComponent(identity.password)}`
  + `@${identity.host.includes(":") ? `[${identity.host}]` : identity.host}`
  + `:${identity.port}/${encodeURIComponent(identity.database)}`
  + `?sslmode=${encodeURIComponent(identity.sslmode)}`
);

const parseProviderDatabaseIdentity = (value, code, phase) => {
  let parsed;
  try {
    parsed = new URL(requireText(value, code, phase));
  } catch {
    fail(code, phase);
  }
  requireCondition(
    new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
      && parsed.hostname
      && parsed.username
      && parsed.pathname.startsWith("/")
      && parsed.pathname.length > 1,
    code,
    phase,
  );
  let database;
  let user;
  try {
    database = decodeURIComponent(parsed.pathname.slice(1));
    user = decodeURIComponent(parsed.username);
  } catch {
    fail(code, phase);
  }
  requireCondition(database && !database.includes("/") && user, code, phase);
  return Object.freeze({
    database,
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    user,
  });
};

class SecretBuffer {
  #buffer;

  constructor(value, code, phase) {
    const normalized = requireText(value, code, phase);
    this.#buffer = Buffer.from(normalized, "utf8");
  }

  async use(callback) {
    requireCondition(this.#buffer !== undefined, "SECRET_ALREADY_DISPOSED", "credential-use");
    const value = this.#buffer.toString("utf8");
    return callback(value);
  }

  digest(domain) {
    requireCondition(this.#buffer !== undefined, "SECRET_ALREADY_DISPOSED", "credential-use");
    return createHash("sha256")
      .update(domain)
      .update("\0")
      .update(this.#buffer)
      .digest("hex");
  }

  clear() {
    this.#buffer?.fill(0);
    this.#buffer = undefined;
  }
}

const createSecretSet = (value, keys, label) => {
  requireCondition(exactKeys(value, keys), "CREDENTIAL_PAYLOAD_INVALID", "credential-load");
  const entries = Object.fromEntries(keys.map((key) => [
    key,
    new SecretBuffer(value[key], "CREDENTIAL_PAYLOAD_INVALID", "credential-load"),
  ]));
  return Object.freeze({
    digest: sha256(canonicalJson(keys.map((key) => (
      entries[key].digest(`quantgym-phase2-${label}-${key}`)
    )))),
    get: (key) => {
      requireCondition(Object.hasOwn(entries, key), "CREDENTIAL_SCOPE_INVALID", "credential-use");
      return entries[key];
    },
    clear: () => {
      for (const entry of Object.values(entries)) entry.clear();
    },
  });
};

const withSecrets = async (secretSet, keys, callback, values = []) => {
  if (keys.length === 0) return callback(...values);
  const [key, ...remaining] = keys;
  return secretSet.get(key).use((value) => (
    withSecrets(secretSet, remaining, callback, [...values, value])
  ));
};

const databaseEnvironment = (identity, additional = {}) => {
  const { assumeRole, PGOPTIONS: suppliedOptions, ...rest } = additional;
  requireCondition(
    assumeRole === undefined || /^[a-z_][a-z0-9_]{0,62}$/u.test(assumeRole),
    "POSTGRES_ROLE_INVALID",
    "database-environment",
  );
  const pgOptions = [
    assumeRole ? `-c role=${assumeRole}` : "",
    clean(suppliedOptions),
  ].filter(Boolean).join(" ");
  return {
    HOME: process.env.HOME ?? tmpdir(),
    LANG: "C",
    LC_ALL: "C",
    PATH: "/usr/bin:/bin",
    PGDATABASE: identity.database,
    PGHOST: identity.host,
    PGPASSWORD: identity.password,
    PGPORT: identity.port,
    PGSSLMODE: identity.sslmode,
    PGUSER: identity.user,
    ...(pgOptions ? { PGOPTIONS: pgOptions } : {}),
    ...rest,
  };
};

const defaultCommandRunner = ({
  file,
  args = [],
  cwd = moduleRoot,
  env = {},
  input,
  timeoutMs = 120_000,
  acceptedExitCodes = [0],
  maxBytes = MAX_COMMAND_BYTES,
}) => new Promise((resolve, reject) => {
  const inputBytes = input === undefined ? undefined : Buffer.from(String(input), "utf8");
  if (inputBytes !== undefined && inputBytes.length > maxBytes) {
    inputBytes.fill(0);
    reject(new Error("command input exceeded limit"));
    return;
  }
  let child;
  try {
    child = spawn(file, args, {
      cwd,
      env,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    inputBytes?.fill(0);
    reject(error);
    return;
  }
  const stdout = [];
  const stderr = [];
  let stdoutLength = 0;
  let stderrLength = 0;
  let settled = false;
  let timer;
  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    inputBytes?.fill(0);
    clearTimeout(timer);
    if (error) reject(error);
    else resolve(value);
  };
  const addChunk = (target, chunk, currentLength) => {
    const buffer = Buffer.from(chunk);
    if (currentLength + buffer.length > maxBytes) {
      child.kill("SIGKILL");
      finish(new Error("command output exceeded limit"));
      return currentLength;
    }
    target.push(buffer);
    return currentLength + buffer.length;
  };
  if (inputBytes !== undefined) {
    child.stdin.on("error", (error) => finish(error));
    child.stdin.end(inputBytes, () => inputBytes.fill(0));
  }
  child.stdout.on("data", (chunk) => {
    stdoutLength = addChunk(stdout, chunk, stdoutLength);
  });
  child.stderr.on("data", (chunk) => {
    stderrLength = addChunk(stderr, chunk, stderrLength);
  });
  child.on("error", (error) => finish(error));
  child.on("close", (exitCode, signal) => {
    const result = {
      exitCode,
      signal,
      stderr: Buffer.concat(stderr, stderrLength).toString("utf8"),
      stdout: Buffer.concat(stdout, stdoutLength).toString("utf8"),
    };
    if (!acceptedExitCodes.includes(exitCode)) {
      finish(Object.assign(new Error("command failed"), { result }));
      return;
    }
    finish(undefined, result);
  });
  timer = setTimeout(() => {
    child.kill("SIGKILL");
    finish(new Error("command timed out"));
  }, timeoutMs);
  timer.unref?.();
});

const runSafeCommand = async (commandRunner, options, code, phase) => {
  try {
    return await commandRunner(options);
  } catch {
    fail(code, phase);
  }
};

const readBoundedBytes = async ({
  response,
  maximumBytes,
  code,
  phase,
}) => {
  const contentLength = Number(response.headers?.get?.("content-length"));
  requireCondition(
    !Number.isFinite(contentLength) || contentLength <= maximumBytes,
    code,
    phase,
  );
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        length += chunk.length;
        if (length > maximumBytes) {
          chunk.fill(0);
          await reader.cancel();
          for (const entry of chunks) entry.fill(0);
          fail(code, phase);
        }
        chunks.push(chunk);
      }
      const output = Buffer.concat(chunks, length);
      for (const entry of chunks) entry.fill(0);
      return output;
    } catch (error) {
      for (const entry of chunks) entry.fill(0);
      if (error instanceof Phase2OperatorError) throw error;
      fail(code, phase);
    }
  }
  try {
    const bytes = Buffer.from(await response.arrayBuffer());
    requireCondition(bytes.length <= maximumBytes, code, phase);
    return bytes;
  } catch {
    fail(code, phase);
  }
};

const readBoundedResponse = async (response, phase) => {
  const bytes = await readBoundedBytes({
    response,
    maximumBytes: MAX_HTTP_BYTES,
    code: "PROVIDER_RESPONSE_TOO_LARGE",
    phase,
  });
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("PROVIDER_RESPONSE_INVALID", phase);
  } finally {
    bytes.fill(0);
  }
};

const requestJson = async ({
  fetchImpl,
  url,
  method = "GET",
  headers = {},
  body,
  acceptedStatuses = [200],
  provider,
  phase,
}) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch {
    fail(`${provider}_REQUEST_FAILED`, phase);
  }
  requireCondition(
    response && acceptedStatuses.includes(response.status),
    `${provider}_REQUEST_FAILED`,
    phase,
  );
  const payload = await readBoundedResponse(response, phase);
  if (provider === "CLOUDFLARE") {
    requireCondition(payload?.success === true, "CLOUDFLARE_REQUEST_FAILED", phase);
  }
  return payload;
};

const selectUnique = (values, predicate, code, phase) => {
  const matches = values.filter(predicate);
  requireCondition(matches.length === 1, code, phase);
  return matches[0];
};

const resourceIdentity = (provider, id) => sha256(
  `quantgym-phase2-resource-v1\0${provider}\0${requireText(
    id,
    "PROVIDER_RESOURCE_INVALID",
    "topology",
  )}`,
);

const deploymentCommit = (value, code, phase) => {
  const commit = clean(
    value?.deployment_trigger?.metadata?.commit_hash
    ?? value?.commit?.id
    ?? value?.commitId,
  ).toLowerCase();
  requireCondition(SHA_PATTERN.test(commit), code, phase);
  return commit;
};

const renderEntry = (entry, key) => unwrap(entry, key) ?? {};

const currentRenderUser = (value, phase) => {
  const users = Array.isArray(value)
    ? value.map((entry) => renderEntry(entry, "user"))
    : [renderEntry(value, "user")];
  requireCondition(
    users.length === 1 && clean(users[0]?.id),
    "RENDER_USER_INVALID",
    phase,
  );
  return users[0];
};

const parseRenderDeploy = (entry, phase) => {
  const value = renderEntry(entry, "deploy");
  const id = requireText(value.id, "RENDER_DEPLOY_INVALID", phase);
  const status = requireText(value.status, "RENDER_DEPLOY_INVALID", phase);
  const commit = deploymentCommit(value, "RENDER_DEPLOY_INVALID", phase);
  return Object.freeze({ commit, id, status });
};

const parsePagesDeployment = (value, phase) => {
  const id = requireText(value?.id, "CLOUDFLARE_PAGES_DEPLOY_INVALID", phase);
  const commit = deploymentCommit(
    value,
    "CLOUDFLARE_PAGES_DEPLOY_INVALID",
    phase,
  );
  const status = requireText(
    value?.latest_stage?.status,
    "CLOUDFLARE_PAGES_DEPLOY_INVALID",
    phase,
  );
  return Object.freeze({ commit, id, status });
};

const pagesDeploymentFacts = (value, phase) => {
  const parsed = parsePagesDeployment(value, phase);
  const branch = clean(value?.deployment_trigger?.metadata?.branch);
  const environment = clean(value?.environment);
  const stages = Array.isArray(value?.stages) && value.stages.length > 0
    ? value.stages
    : [value?.latest_stage].filter(Boolean);
  const stageFacts = stages.map((stage) => ({
    endedOn: clean(stage?.ended_on),
    name: clean(stage?.name),
    startedOn: clean(stage?.started_on),
    status: clean(stage?.status),
  }));
  const aliases = Array.isArray(value?.aliases)
    ? value.aliases.map(clean).filter(Boolean).sort()
    : [];
  return Object.freeze({
    ...parsed,
    aliases,
    branch,
    environment,
    stages: stageFacts,
  });
};

const pagesDeploymentWasSkipped = (deployment) => (
  deployment.status === "idle"
  && deployment.aliases.length === 0
  && deployment.stages.length > 0
  && deployment.stages.every((stage) => (
    stage.status === "idle"
    && stage.startedOn === ""
    && stage.endedOn === ""
  ))
);

const candidateSkipFacts = (deployments, expectedCommit, phase) => {
  const candidates = deployments
    .filter((deployment) => deployment.commit === expectedCommit)
    .sort((left, right) => left.id.localeCompare(right.id));
  requireCondition(
    candidates.length >= 1
      && candidates.every((deployment) => (
        deployment.branch === BRANCH
        && pagesDeploymentWasSkipped(deployment)
        && deployment.aliases.length === 0
        && deployment.stages.every((stage) => stage.startedOn === "")
      )),
    "PRODUCTION_CANDIDATE_DEPLOYMENT_DETECTED",
    phase,
  );
  return Object.freeze(candidates.map((deployment) => Object.freeze({
    aliases: [...deployment.aliases],
    branch: deployment.branch,
    commit: deployment.commit,
    id: deployment.id,
    stages: deployment.stages.map((stage) => ({ ...stage })),
    status: deployment.status,
  })));
};

const renderServiceConfiguration = (service) => ({
  autoDeploy: service?.autoDeploy,
  branch: service?.branch,
  buildCommand: service?.serviceDetails?.buildCommand,
  env: service?.serviceDetails?.env,
  region: service?.serviceDetails?.region,
  repo: normalizeRepository(service?.repo),
  rootDir: service?.rootDir ?? service?.serviceDetails?.rootDir ?? "",
  startCommand: service?.serviceDetails?.startCommand,
  type: service?.type,
});

const pagesConfiguration = (project) => ({
  buildConfig: {
    buildCommand: project?.build_config?.build_command ?? "",
    destinationDir: project?.build_config?.destination_dir ?? "",
    rootDir: project?.build_config?.root_dir ?? "",
  },
  source: {
    type: project?.source?.type,
    config: {
      owner: project?.source?.config?.owner,
      previewDeploymentSetting: (
        project?.source?.config?.preview_deployment_setting
      ),
      productionBranch: project?.source?.config?.production_branch,
      productionDeploymentsEnabled: (
        project?.source?.config?.production_deployments_enabled
      ),
      repoName: project?.source?.config?.repo_name,
    },
  },
});

const automaticDeploysEnabled = (value) => (
  value === true || value === "yes"
);

const renderVisibility = (service, code, phase) => {
  const type = clean(service?.type).toLowerCase();
  const url = clean(service?.serviceDetails?.url ?? service?.url);
  if (new Set(["web", "web_service"]).has(type) && /^https:\/\//u.test(url)) {
    return "public";
  }
  if (new Set(["private", "private_service"]).has(type) && !/^https:\/\//u.test(url)) {
    return "internal";
  }
  fail(code, phase);
};

const requireCapability = (value, methods, code) => {
  requireCondition(isPlainObject(value), code, "capability-preflight");
  for (const method of methods) {
    requireCondition(typeof value[method] === "function", code, "capability-preflight");
  }
  return value;
};

const verifyCapabilityReceipt = (value, code, phase) => {
  requireCondition(
    exactKeys(value, ["ready", "kind"])
      && value.ready === true
      && /^[a-z0-9][a-z0-9-]{2,63}$/u.test(value.kind),
    code,
    phase,
  );
  return value;
};

const verifyControlCapabilityReceipt = (value) => {
  requireCondition(
    exactKeys(value, [
      "ready",
      "kind",
      "remainingReadOnlyProvidersProven",
      "terminalRevocationRequired",
    ])
      && value.ready === true
      && value.remainingReadOnlyProvidersProven === true
      && value.terminalRevocationRequired === true
      && /^[a-z0-9][a-z0-9-]{2,63}$/u.test(value.kind),
    "CONTROL_CAPABILITY_UNAVAILABLE",
    "capability-preflight",
  );
  return value;
};

const toolFile = async (filePath, code, phase, { preserveEntry = false } = {}) => {
  let resolved;
  let entryMetadata;
  let metadata;
  try {
    entryMetadata = await lstat(filePath);
    resolved = await realpath(filePath);
    metadata = await lstat(resolved);
  } catch {
    fail(code, phase);
  }
  requireCondition(
    (entryMetadata.isFile() || (preserveEntry && entryMetadata.isSymbolicLink()))
      && (entryMetadata.mode & 0o022) === 0
      && metadata.isFile()
      && metadata.nlink === 1
      && (metadata.mode & 0o022) === 0,
    code,
    phase,
  );
  return preserveEntry ? path.resolve(filePath) : resolved;
};

const hashToolClosure = async (
  root,
  { maxTotalBytes = MAX_TOOL_CLOSURE_BYTES } = {},
) => {
  const inventory = [];
  let totalFileBytes = 0;
  requireCondition(
    Number.isSafeInteger(maxTotalBytes) && maxTotalBytes > 0,
    "TOOL_CLOSURE_INVALID",
    "toolchain-preflight",
  );
  const visit = async (relative = "") => {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const child = path.posix.join(relative.split(path.sep).join("/"), entry.name);
      const absolute = path.join(root, ...child.split("/"));
      const metadata = await lstat(absolute);
      requireCondition(
        metadata.isSymbolicLink() || (metadata.mode & 0o022) === 0,
        "TOOL_CLOSURE_INVALID",
        "toolchain-preflight",
      );
      if (metadata.isDirectory()) {
        await visit(child);
      } else if (metadata.isSymbolicLink()) {
        const target = await readlink(absolute);
        const resolvedTarget = path.resolve(path.dirname(absolute), target);
        requireCondition(
          resolvedTarget.startsWith(`${root}${path.sep}`),
          "TOOL_CLOSURE_INVALID",
          "toolchain-preflight",
        );
        inventory.push({ path: child, target, type: "symlink" });
      } else {
        totalFileBytes += metadata.size;
        requireCondition(
          metadata.isFile()
            && metadata.size <= 128 * 1024 * 1024
            && totalFileBytes <= maxTotalBytes,
          "TOOL_CLOSURE_INVALID",
          "toolchain-preflight",
        );
        inventory.push({
          bytes: metadata.size,
          path: child,
          sha256: await hashFile(absolute),
          type: "file",
        });
      }
      requireCondition(
        inventory.length <= 4_096,
        "TOOL_CLOSURE_INVALID",
        "toolchain-preflight",
      );
    }
  };
  await visit();
  return sha256(canonicalJson(inventory));
};

const compareStrings = (left, right) => (
  left < right ? -1 : left > right ? 1 : 0
);

const normalizePythonDistributionName = (value) => (
  clean(value).toLowerCase().replace(/[-_.]+/gu, "-")
);

const isDerivedPythonBytecode = (relativePath) => {
  const segments = relativePath.split("/");
  return segments.length >= 2
    && segments.at(-2) === "__pycache__"
    && /^[^/]+\.cpython-313(?:\.opt-[12])?\.pyc$/u.test(segments.at(-1));
};

const hashPythonClosureFile = async (absolutePath, relativePath) => {
  if (!/\.dist-info\/RECORD$/u.test(relativePath)) {
    const metadata = await lstat(absolutePath);
    return Object.freeze({
      bytes: metadata.size,
      sha256: await hashFile(absolutePath),
    });
  }
  const source = await readFile(absolutePath, "utf8");
  const normalized = source.split(/(?<=\n)/u).map((line) => (
    line.replace(
      /^(\.\.\/\.\.\/\.\.\/bin\/[0-9A-Za-z._-]+),sha256=[0-9A-Za-z_-]{43},[0-9]+(?=\r?\n?$)/u,
      "$1,,",
    )
  )).join("");
  return Object.freeze({
    bytes: Buffer.byteLength(normalized),
    sha256: sha256(normalized),
  });
};

const pythonDistributionInventory = async (sitePackagesRoot) => {
  const distributions = [];
  let entries;
  try {
    entries = await readdir(sitePackagesRoot, { withFileTypes: true });
  } catch {
    fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
  }
  for (const entry of entries.sort((left, right) => (
    compareStrings(left.name, right.name)
  ))) {
    if (!entry.name.endsWith(".dist-info")) continue;
    requireCondition(
      entry.isDirectory(),
      "PYTHON_CLOSURE_CHECK_FAILED",
      "toolchain-preflight",
    );
    const metadataPath = path.join(sitePackagesRoot, entry.name, "METADATA");
    let metadata;
    let source;
    try {
      metadata = await lstat(metadataPath);
      source = await readFile(metadataPath, "utf8");
    } catch {
      fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
    }
    requireCondition(
      metadata.isFile()
        && metadata.nlink === 1
        && (metadata.mode & 0o022) === 0
        && metadata.size > 0
        && metadata.size <= 1024 * 1024,
      "PYTHON_CLOSURE_CHECK_FAILED",
      "toolchain-preflight",
    );
    const lines = source.split(/\r?\n/u);
    const names = lines
      .filter((line) => line.startsWith("Name: "))
      .map((line) => normalizePythonDistributionName(line.slice(6)));
    const versions = lines
      .filter((line) => line.startsWith("Version: "))
      .map((line) => clean(line.slice(9)));
    requireCondition(
      names.length === 1
        && versions.length === 1
        && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(names[0])
        && versions[0].length <= 128
        && /^[0-9A-Za-z][0-9A-Za-z.+!_-]*$/u.test(versions[0]),
      "PYTHON_CLOSURE_CHECK_FAILED",
      "toolchain-preflight",
    );
    distributions.push(Object.freeze({ name: names[0], version: versions[0] }));
    requireCondition(
      distributions.length <= 256,
      "PYTHON_CLOSURE_CHECK_FAILED",
      "toolchain-preflight",
    );
  }
  distributions.sort((left, right) => (
    compareStrings(left.name, right.name) || compareStrings(left.version, right.version)
  ));
  return Object.freeze(distributions);
};

const inspectPythonSitePackagesClosure = async (sitePackagesPath) => {
  const requestedRoot = path.resolve(sitePackagesPath);
  let root;
  let rootMetadata;
  try {
    [root, rootMetadata] = await Promise.all([
      realpath(requestedRoot),
      lstat(requestedRoot),
    ]);
  } catch {
    fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
  }
  requireCondition(
    rootMetadata.isDirectory()
      && !rootMetadata.isSymbolicLink()
      && (rootMetadata.mode & 0o022) === 0,
    "PYTHON_CLOSURE_CHECK_FAILED",
    "toolchain-preflight",
  );
  const inventory = [];
  let totalBytes = 0;
  const visit = async (relative = "") => {
    let entries;
    try {
      entries = await readdir(path.join(root, ...relative.split("/").filter(Boolean)), {
        withFileTypes: true,
      });
    } catch {
      fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
    }
    for (const entry of entries.sort((left, right) => (
      compareStrings(left.name, right.name)
    ))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(root, ...child.split("/"));
      let metadata;
      try {
        metadata = await lstat(absolute);
      } catch {
        fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
      }
      requireCondition(
        !metadata.isSymbolicLink() && (metadata.mode & 0o022) === 0,
        "PYTHON_CLOSURE_CHECK_FAILED",
        "toolchain-preflight",
      );
      if (metadata.isDirectory()) {
        await visit(child);
        continue;
      }
      requireCondition(
        metadata.isFile()
          && metadata.nlink === 1
          && metadata.size <= 32 * 1024 * 1024,
        "PYTHON_CLOSURE_CHECK_FAILED",
        "toolchain-preflight",
      );
      if (isDerivedPythonBytecode(child)) continue;
      totalBytes += metadata.size;
      requireCondition(
        inventory.length < 10_000 && totalBytes <= 256 * 1024 * 1024,
        "PYTHON_CLOSURE_CHECK_FAILED",
        "toolchain-preflight",
      );
      let fileDigest;
      try {
        fileDigest = await hashPythonClosureFile(absolute, child);
      } catch {
        fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
      }
      inventory.push(Object.freeze({
        bytes: fileDigest.bytes,
        path: child,
        sha256: fileDigest.sha256,
        type: "file",
      }));
    }
  };
  await visit();
  return Object.freeze({
    closureSha256: sha256(canonicalJson(inventory)),
    distributions: await pythonDistributionInventory(root),
  });
};

const verifyPythonSitePackagesClosure = async ({
  expectedClosureSha256,
  expectedDistributions,
  sitePackagesPath,
}) => {
  const actual = await inspectPythonSitePackagesClosure(sitePackagesPath);
  requireCondition(
    HASH_PATTERN.test(expectedClosureSha256)
      && Array.isArray(expectedDistributions)
      && actual.closureSha256 === expectedClosureSha256
      && canonicalJson(actual.distributions) === canonicalJson(expectedDistributions),
    "PYTHON_CLOSURE_MISMATCH",
    "toolchain-preflight",
  );
  return actual;
};

const verifyOperatorToolchainLock = async (root) => {
  let value;
  try {
    value = JSON.parse(await readFile(
      path.join(root, OPERATOR_TOOLCHAIN_LOCK_PATH),
      "utf8",
    ));
  } catch {
    fail("OPERATOR_TOOLCHAIN_LOCK_INVALID", "toolchain-preflight");
  }
  requireCondition(
    exactKeys(value, [
      "schemaVersion",
      "scope",
      "applicationPackageLockIntegration",
      "applicationPackageLockSha256",
      "pythonRuntime",
      "postgresClient",
      "wrangler",
    ])
      && value.schemaVersion === 1
      && value.scope === "phase-2-preview-operator-only"
      && value.applicationPackageLockIntegration === true
      && value.applicationPackageLockSha256
        === "411cd3646ddf62cd8687dddf1717bda192d18f5948401d2be3d3ec9925d36471"
      && exactKeys(value.pythonRuntime, [
        "version",
        "requirementsLockSha256",
        "resolution",
        "sitePackages",
      ])
      && value.pythonRuntime.version === REQUIRED_PYTHON_VERSION
      && value.pythonRuntime.requirementsLockSha256
        === "e1b3ddb0c1d29d749e9180c21b93b3fe2cd29205e057a5964060d635e2ec8141"
      && value.pythonRuntime.resolution === "fresh-private-venv-require-hashes"
      && exactKeys(value.pythonRuntime.sitePackages, [
        "relativePath",
        "closureSha256",
        "derivedBytecodePolicy",
        "recordPolicy",
        "distributions",
      ])
      && value.pythonRuntime.sitePackages.relativePath
        === REQUIRED_PYTHON_SITE_PACKAGES_RELATIVE_PATH
      && value.pythonRuntime.sitePackages.closureSha256
        === REQUIRED_PYTHON_SITE_PACKAGES_CLOSURE_SHA256
      && value.pythonRuntime.sitePackages.derivedBytecodePolicy
        === "exclude-cpython-313-pyc-under-__pycache__"
      && value.pythonRuntime.sitePackages.recordPolicy
        === "include-record-normalize-venv-bin-hash-size"
      && canonicalJson(value.pythonRuntime.sitePackages.distributions)
        === canonicalJson(REQUIRED_PYTHON_DISTRIBUTIONS)
      && exactKeys(value.postgresClient, [
        "version",
        "requiredExecutables",
        "executableSha256",
      ])
      && value.postgresClient.version === REQUIRED_POSTGRES_VERSION
      && canonicalJson(value.postgresClient.requiredExecutables)
        === canonicalJson(["pg_dump", "pg_restore", "psql"])
      && canonicalJson(value.postgresClient.executableSha256)
        === canonicalJson(REQUIRED_POSTGRES_EXECUTABLE_SHA256)
      && exactKeys(value.wrangler, [
        "version",
        "binSha256",
        "closureSha256",
        "resolution",
      ])
      && value.wrangler.version === REQUIRED_WRANGLER_VERSION
      && value.wrangler.binSha256 === REQUIRED_WRANGLER_BIN_SHA256
      && value.wrangler.closureSha256
        === "2ba16de471310a9ab8d2463e1fb3041b018f131bc12034622c33d5bf050b7666"
      && value.wrangler.resolution === "operator-clean-install-closure",
    "OPERATOR_TOOLCHAIN_LOCK_INVALID",
    "toolchain-preflight",
  );
  return sha256(canonicalJson(value));
};

const verifyToolchain = async ({
  config,
  commandRunner,
  root,
}) => {
  const toolchainLockSha256 = await verifyOperatorToolchainLock(root);
  requireCondition(
    await hashFile(path.join(root, "package-lock.json"))
      === "411cd3646ddf62cd8687dddf1717bda192d18f5948401d2be3d3ec9925d36471"
      && await hashFile(path.join(root, "api/requirements.lock.txt"))
        === "e1b3ddb0c1d29d749e9180c21b93b3fe2cd29205e057a5964060d635e2ec8141",
    "OPERATOR_TOOLCHAIN_LOCK_INVALID",
    "toolchain-preflight",
  );
  requireCondition(
    process.versions.node === REQUIRED_NODE_VERSION,
    "NODE_VERSION_MISMATCH",
    "toolchain-preflight",
  );
  const npmCliPath = await toolFile(
    path.resolve(
      path.dirname(process.execPath),
      "../lib/node_modules/npm/bin/npm-cli.js",
    ),
    "NPM_BINARY_MISSING",
    "toolchain-preflight",
  );
  const npmVersion = await runSafeCommand(commandRunner, {
    file: process.execPath,
    args: [npmCliPath, "--version"],
    cwd: moduleRoot,
    env: {
      HOME: process.env.HOME ?? tmpdir(),
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
    },
  }, "NPM_VERSION_CHECK_FAILED", "toolchain-preflight");
  requireCondition(
    clean(npmVersion.stdout) === REQUIRED_NPM_VERSION,
    "NPM_VERSION_MISMATCH",
    "toolchain-preflight",
  );
  const wranglerPath = await toolFile(
    config.wranglerPath,
    "WRANGLER_BINARY_MISSING",
    "toolchain-preflight",
  );
  requireCondition(
    await hashFile(wranglerPath) === REQUIRED_WRANGLER_BIN_SHA256,
    "WRANGLER_BINARY_MISMATCH",
    "toolchain-preflight",
  );
  const wranglerInstallRoot = path.resolve(path.dirname(wranglerPath), "../../..");
  requireCondition(
    await hashToolClosure(path.join(wranglerInstallRoot, "node_modules"))
      === "2ba16de471310a9ab8d2463e1fb3041b018f131bc12034622c33d5bf050b7666",
    "WRANGLER_CLOSURE_MISMATCH",
    "toolchain-preflight",
  );
  const wranglerVersion = await runSafeCommand(commandRunner, {
    file: process.execPath,
    args: [wranglerPath, "--version"],
    cwd: moduleRoot,
    env: {
      HOME: process.env.HOME ?? tmpdir(),
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
    },
  }, "WRANGLER_VERSION_CHECK_FAILED", "toolchain-preflight");
  requireCondition(
    clean(wranglerVersion.stdout) === REQUIRED_WRANGLER_VERSION,
    "WRANGLER_VERSION_MISMATCH",
    "toolchain-preflight",
  );

  const postgresBin = await realpath(config.postgresBinDir).catch(() => (
    fail("POSTGRES_CLIENT_MISSING", "toolchain-preflight")
  ));
  const postgresTools = {};
  for (const name of ["pg_dump", "pg_restore", "psql"]) {
    const file = await toolFile(
      path.join(postgresBin, name),
      "POSTGRES_CLIENT_MISSING",
      "toolchain-preflight",
    );
    requireCondition(
      await hashFile(file) === REQUIRED_POSTGRES_EXECUTABLE_SHA256[name],
      "POSTGRES_CLIENT_BINARY_MISMATCH",
      "toolchain-preflight",
    );
    const version = await runSafeCommand(commandRunner, {
      file,
      args: ["--version"],
      env: {
        HOME: process.env.HOME ?? tmpdir(),
        LANG: "C",
        LC_ALL: "C",
        PATH: "/usr/bin:/bin",
      },
    }, "POSTGRES_CLIENT_VERSION_CHECK_FAILED", "toolchain-preflight");
    const match = /(?:PostgreSQL\)\s+)(\d+\.\d+)(?:\s|$)/u.exec(
      `${version.stdout}\n${version.stderr}`,
    );
    requireCondition(
      match?.[1] === REQUIRED_POSTGRES_VERSION,
      "POSTGRES_CLIENT_VERSION_MISMATCH",
      "toolchain-preflight",
    );
    postgresTools[name] = file;
  }

  const pythonPath = await toolFile(
    config.pythonPath,
    "PYTHON_BINARY_MISSING",
    "toolchain-preflight",
    { preserveEntry: true },
  );
  const pythonVersion = await runSafeCommand(commandRunner, {
    file: pythonPath,
    args: ["--version"],
    env: {
      HOME: process.env.HOME ?? tmpdir(),
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
    },
  }, "PYTHON_VERSION_CHECK_FAILED", "toolchain-preflight");
  requireCondition(
    clean(`${pythonVersion.stdout}${pythonVersion.stderr}`)
      === `Python ${REQUIRED_PYTHON_VERSION}`,
    "PYTHON_VERSION_MISMATCH",
    "toolchain-preflight",
  );
  const pythonPrefix = path.dirname(path.dirname(pythonPath));
  const pythonSitePackagesPath = path.join(
    pythonPrefix,
    ...REQUIRED_PYTHON_SITE_PACKAGES_RELATIVE_PATH.split("/"),
  );
  await verifyPythonSitePackagesClosure({
    expectedClosureSha256: REQUIRED_PYTHON_SITE_PACKAGES_CLOSURE_SHA256,
    expectedDistributions: REQUIRED_PYTHON_DISTRIBUTIONS,
    sitePackagesPath: pythonSitePackagesPath,
  });
  const pythonClosure = await runSafeCommand(commandRunner, {
    file: pythonPath,
    args: [
      "-I",
      "-c",
      (
        "import importlib.metadata as m,json,re,site,sys,sysconfig;"
        + "norm=lambda value:re.sub(r'[-_.]+','-',value).lower();"
        + "print(json.dumps({'prefix':sys.prefix,'basePrefix':sys.base_prefix,"
        + "'purelib':sysconfig.get_path('purelib'),"
        + "'platlib':sysconfig.get_path('platlib'),"
        + "'sitePackages':site.getsitepackages(),"
        + "'distributions':sorted([{'name':norm(d.metadata['Name']),"
        + "'version':d.version} for d in m.distributions()],"
        + "key=lambda d:(d['name'],d['version']))}))"
      ),
    ],
    env: {
      HOME: tmpdir(),
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
      PYTHONINSPECT: "0",
      PYTHONNOUSERSITE: "1",
      PYTHONSTARTUP: "",
    },
  }, "PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
  let pythonFacts;
  try {
    pythonFacts = JSON.parse(clean(pythonClosure.stdout));
  } catch {
    fail("PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
  }
  requireCondition(
    path.resolve(pythonFacts?.prefix ?? "") === pythonPrefix
      && path.resolve(pythonFacts?.basePrefix ?? "") !== pythonPrefix
      && path.resolve(pythonFacts?.purelib ?? "") === pythonSitePackagesPath
      && path.resolve(pythonFacts?.platlib ?? "") === pythonSitePackagesPath
      && canonicalJson(pythonFacts?.sitePackages)
        === canonicalJson([pythonSitePackagesPath])
      && canonicalJson(pythonFacts?.distributions)
        === canonicalJson(REQUIRED_PYTHON_DISTRIBUTIONS),
    "PYTHON_CLOSURE_CHECK_FAILED",
    "toolchain-preflight",
  );
  await runSafeCommand(commandRunner, {
    file: pythonPath,
    args: ["-I", "-m", "pip", "check"],
    env: {
      HOME: tmpdir(),
      LANG: "C",
      LC_ALL: "C",
      PATH: "/usr/bin:/bin",
      PYTHONNOUSERSITE: "1",
    },
  }, "PYTHON_CLOSURE_CHECK_FAILED", "toolchain-preflight");
  return Object.freeze({
    npmCliPath,
    pgDumpPath: postgresTools.pg_dump,
    pgRestorePath: postgresTools.pg_restore,
    psqlPath: postgresTools.psql,
    pythonPath,
    wranglerPath,
    toolchainLockSha256,
  });
};

const requireOperatorConfig = (value) => {
  requireCondition(
    exactKeys(value, [
      "apiOrigin",
      "cloudflareAccountId",
      "evidenceHeadCommit",
      "httpsProxyUrl",
      "postgresBinDir",
      "pythonPath",
      "restoreDestroyConfirmation",
      "webOrigin",
      "wranglerPath",
    ]),
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  );
  const postgresBinDir = path.resolve(requireText(
    value.postgresBinDir,
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  ));
  const pythonPath = path.resolve(requireText(
    value.pythonPath,
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  ));
  const wranglerPath = path.resolve(requireText(
    value.wranglerPath,
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  ));
  const httpsProxy = parseOperatorHttpsProxy(
    value.httpsProxyUrl,
    "OPERATOR_PROXY_INVALID",
    "config-load",
  );
  const restoreDestroyConfirmation = requireText(
    value.restoreDestroyConfirmation,
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  );
  const restoreDatabaseName = restoreDestroyConfirmation.startsWith(
    "destroy-preview-database:",
  ) ? restoreDestroyConfirmation.slice("destroy-preview-database:".length) : "";
  requireCondition(
    RESTORE_DATABASE_PATTERN.test(restoreDatabaseName),
    "OPERATOR_CONFIG_INVALID",
    "config-load",
  );
  return Object.freeze({
    apiOrigin: safeUrl(
      value.apiOrigin,
      `${PREVIEW_API}.onrender.com`,
      "OPERATOR_CONFIG_INVALID",
      "config-load",
    ),
    cloudflareAccountId: requireText(
      value.cloudflareAccountId,
      "OPERATOR_CONFIG_INVALID",
      "config-load",
      ACCOUNT_ID_PATTERN,
    ),
    evidenceHeadCommit: requireText(
      value.evidenceHeadCommit,
      "OPERATOR_CONFIG_INVALID",
      "config-load",
      SHA_PATTERN,
    ),
    httpsProxy,
    postgresBinDir,
    pythonPath,
    restoreDatabaseName,
    restoreDestroyConfirmation,
    webOrigin: safeUrl(
      value.webOrigin,
      `${PREVIEW_PAGES}.pages.dev`,
      "OPERATOR_CONFIG_INVALID",
      "config-load",
    ),
    wranglerPath,
  });
};

const parseRenderCliScalar = (source, phase) => {
  const value = source.trim();
  requireCondition(value.length > 0, "RENDER_CREDENTIAL_FILE_INVALID", phase);
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      return requireText(parsed, "RENDER_CREDENTIAL_FILE_INVALID", phase);
    } catch {
      fail("RENDER_CREDENTIAL_FILE_INVALID", phase);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return requireText(
      value.slice(1, -1).replaceAll("''", "'"),
      "RENDER_CREDENTIAL_FILE_INVALID",
      phase,
    );
  }
  requireCondition(
    !/[\r\n\0]|^(?:null|~)$/iu.test(value),
    "RENDER_CREDENTIAL_FILE_INVALID",
    phase,
  );
  return value;
};

const parseRenderCliConfig = (source, phase) => {
  requireCondition(
    typeof source === "string"
      && source.length > 0
      && source.length <= 32 * 1024
      && !/[\0\r]/u.test(source),
    "RENDER_CREDENTIAL_FILE_INVALID",
    phase,
  );
  const values = new Map();
  let apiIndent;
  for (const line of source.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^(\s*)([A-Za-z_][A-Za-z0-9_]*):(?:\s*(.*))?$/u.exec(line);
    requireCondition(match !== null, "RENDER_CREDENTIAL_FILE_INVALID", phase);
    const indent = match[1].replaceAll("\t", "        ").length;
    const key = match[2].toLowerCase();
    const rawValue = match[3] ?? "";
    if (key === "api" && indent === 0 && !rawValue.trim()) {
      requireCondition(apiIndent === undefined, "RENDER_CREDENTIAL_FILE_INVALID", phase);
      apiIndent = indent;
      continue;
    }
    if (apiIndent === undefined || indent <= apiIndent) continue;
    requireCondition(!values.has(key), "RENDER_CREDENTIAL_FILE_INVALID", phase);
    values.set(key, parseRenderCliScalar(rawValue, phase));
  }
  const refreshToken = values.get("refresh_token") ?? values.get("refreshtoken");
  requireCondition(
    values.size >= 4
      && values.has("key")
      && values.has("expires_at")
      && values.has("host")
      && refreshToken !== undefined,
    "RENDER_CREDENTIAL_FILE_INVALID",
    phase,
  );
  const expiresAtSeconds = Number(values.get("expires_at"));
  requireCondition(
    Number.isSafeInteger(expiresAtSeconds) && expiresAtSeconds > 0,
    "RENDER_CREDENTIAL_FILE_INVALID",
    phase,
  );
  return Object.freeze({
    accessToken: values.get("key"),
    expiresAt: expiresAtSeconds * 1_000,
    host: values.get("host"),
    refreshToken,
  });
};

const readTrustedRenderCliCredential = async ({
  filePath,
  expectedAccessToken,
  expectedRefreshToken,
  recoveryMode,
  label,
}) => {
  const phase = "credential-load";
  const resolvedPath = path.resolve(filePath);
  const parentPath = path.dirname(resolvedPath);
  const relativeParent = path.relative(tmpdir(), parentPath);
  requireCondition(
    resolvedPath === filePath
      && path.basename(resolvedPath) === "cli.yaml"
      && relativeParent
      && !relativeParent.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativeParent)
      && path.basename(parentPath).startsWith(`quantgym-phase2-render-${label}-`),
    "RENDER_CREDENTIAL_FILE_PATH_INVALID",
    phase,
  );
  let parentMetadata;
  let pathMetadata;
  try {
    [parentMetadata, pathMetadata] = await Promise.all([
      lstat(parentPath),
      lstat(resolvedPath),
    ]);
  } catch {
    fail("RENDER_CREDENTIAL_FILE_INVALID", phase);
  }
  const expectedUid = typeof process.getuid === "function" ? process.getuid() : null;
  const currentTime = Date.now();
  const maximumAgeMs = recoveryMode ? 7 * 24 * 60 * 60 * 1_000 : 30 * 60 * 1_000;
  requireCondition(
    parentMetadata.isDirectory()
      && !parentMetadata.isSymbolicLink()
      && (expectedUid === null || parentMetadata.uid === expectedUid)
      && new Set([0o700, 0o755]).has(parentMetadata.mode & 0o777)
      && pathMetadata.isFile()
      && !pathMetadata.isSymbolicLink()
      && pathMetadata.nlink === 1
      && pathMetadata.size > 0
      && pathMetadata.size <= 32 * 1024
      && (pathMetadata.mode & 0o777) === 0o600
      && (expectedUid === null || pathMetadata.uid === expectedUid)
      && Number.isFinite(pathMetadata.birthtimeMs)
      && pathMetadata.birthtimeMs <= currentTime + 60 * 1_000
      && currentTime - pathMetadata.birthtimeMs <= maximumAgeMs
      && pathMetadata.mtimeMs <= currentTime + 60 * 1_000
      && currentTime - pathMetadata.mtimeMs <= maximumAgeMs,
    "RENDER_CREDENTIAL_FILE_UNTRUSTED",
    phase,
  );
  let bytes;
  let before;
  let after;
  try {
    const handle = await open(resolvedPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try {
      before = await handle.stat();
      bytes = await handle.readFile();
      after = await handle.stat();
    } finally {
      await handle.close();
    }
  } catch {
    fail("RENDER_CREDENTIAL_FILE_INVALID", phase);
  }
  requireCondition(
    before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeMs === after.mtimeMs
      && pathMetadata.dev === after.dev
      && pathMetadata.ino === after.ino,
    "RENDER_CREDENTIAL_FILE_CHANGED",
    phase,
  );
  let config;
  try {
    config = parseRenderCliConfig(bytes.toString("utf8"), phase);
  } finally {
    bytes.fill(0);
  }
  requireCondition(
    config.host === "https://api.render.com/v1/"
      && config.accessToken === expectedAccessToken
      && config.refreshToken === expectedRefreshToken
      && config.accessToken !== config.refreshToken
      && config.expiresAt > currentTime + 5 * 60 * 1_000
      && config.expiresAt <= currentTime + 7 * 24 * 60 * 60 * 1_000,
    "RENDER_CREDENTIAL_FILE_MISMATCH",
    phase,
  );
  return Object.freeze({
    expiresAt: config.expiresAt,
    fileBirthtime: new Date(pathMetadata.birthtimeMs).toISOString(),
    fileMtime: new Date(pathMetadata.mtimeMs).toISOString(),
    fileIdentitySha256: sha256(canonicalJson({
      dev: String(pathMetadata.dev),
      ino: String(pathMetadata.ino),
      size: pathMetadata.size,
    })),
  });
};

const loadCredentialBoundary = async (
  payload,
  { recoveryMode = false, restoreDatabaseName } = {},
) => {
  requireCondition(
    exactKeys(payload, ["bootstrap", "control", "mutation"]),
    "CREDENTIAL_PAYLOAD_INVALID",
    "credential-load",
  );
  const bootstrapValues = payload.bootstrap;
  const controlValues = payload.control;
  const mutationValues = payload.mutation;
  requireCondition(
    exactKeys(bootstrapValues, BOOTSTRAP_KEYS)
      && exactKeys(controlValues, CONTROL_KEYS)
      && exactKeys(mutationValues, MUTATION_KEYS),
    "CREDENTIAL_PAYLOAD_INVALID",
    "credential-load",
  );
  for (const [value, keys] of [
    [bootstrapValues, BOOTSTRAP_KEYS],
    [controlValues, CONTROL_KEYS],
    [mutationValues, MUTATION_KEYS],
  ]) {
    for (const key of keys) {
      requireText(value[key], "CREDENTIAL_PAYLOAD_INVALID", "credential-load");
    }
  }
  const adminDatabase = parseDatabaseUrl(
    bootstrapValues.previewDatabaseAdminUrl,
    "POSTGRES_ADMIN_DATABASE_INVALID",
    "credential-load",
  );
  requireCondition(
    RESTORE_DATABASE_PATTERN.test(restoreDatabaseName ?? ""),
    "RESTORE_DATABASE_INVALID",
    "credential-load",
  );
  const postgresValidUntil = new Date(Date.now() + 12 * 60 * 60 * 1_000).toISOString();
  const rolePasswords = Object.fromEntries(
    Object.keys(SQL_MANAGED_POSTGRES_ROLES).map((kind) => [
      kind,
      randomBytes(32).toString("hex"),
    ]),
  );
  const createRoleIdentity = (kind, database) => Object.freeze({
    database,
    host: adminDatabase.host,
    password: rolePasswords[kind],
    port: adminDatabase.port,
    sslmode: adminDatabase.sslmode,
    user: SQL_MANAGED_POSTGRES_ROLES[kind],
  });
  const controlDatabase = createRoleIdentity("control", adminDatabase.database);
  const mutationDatabase = createRoleIdentity("mutation", adminDatabase.database);
  const restoreDatabase = createRoleIdentity("restore", restoreDatabaseName);
  requireCondition(
    /quantgym.*preview/iu.test(adminDatabase.database)
      && !/(?:^|[_-])prod(?:uction)?(?:[_-]|$)/iu.test(adminDatabase.database)
      && adminDatabase.database !== restoreDatabase.database
      && !Object.values(SQL_MANAGED_POSTGRES_ROLES).includes(adminDatabase.user)
      && new Set(Object.values(SQL_MANAGED_POSTGRES_ROLES)).size === 3
      && Object.values(SQL_MANAGED_POSTGRES_ROLES).every((role) => SAFE_ROLE_PATTERN.test(role))
      && SAFE_ROLE_PATTERN.test(restoreDatabase.user)
      && SAFE_ROLE_PATTERN.test(mutationDatabase.user)
      && SAFE_ROLE_PATTERN.test(controlDatabase.user),
    "DATABASE_BOUNDARY_INVALID",
    "credential-load",
  );
  requireCondition(
    TOKEN_ID_PATTERN.test(mutationValues.cloudflareAccountTokenId)
      && TOKEN_ID_PATTERN.test(mutationValues.r2AccessKeyId)
      && TOKEN_ID_PATTERN.test(mutationValues.r2ParentTokenId)
      && mutationValues.r2AccessKeyId === mutationValues.r2ParentTokenId
      && TOKEN_ID_PATTERN.test(controlValues.r2AccessKeyId)
      && controlValues.r2AccessKeyId !== mutationValues.r2AccessKeyId
      && mutationValues.cloudflareAccountTokenId !== mutationValues.r2ParentTokenId,
    "MUTATION_CREDENTIAL_ID_INVALID",
    "credential-load",
  );
  const controlR2ExpiresAt = Date.parse(controlValues.r2ExpiresAt);
  const r2ExpiresAt = Date.parse(mutationValues.r2ExpiresAt);
  requireCondition(
    Number.isFinite(controlR2ExpiresAt)
      && controlR2ExpiresAt > Date.now()
      && controlR2ExpiresAt <= Date.now() + 7 * 24 * 60 * 60 * 1_000
      && Number.isFinite(r2ExpiresAt)
      && r2ExpiresAt > Date.now()
      && r2ExpiresAt <= Date.now() + 24 * 60 * 60 * 1_000,
    "R2_CREDENTIAL_LIFETIME_INVALID",
    "credential-load",
  );
  requireCondition(
    controlValues.renderCredentialKind === "render-cli-oauth-v1"
      && mutationValues.renderCredentialKind === "render-cli-oauth-v1"
      && controlValues.renderAccessToken !== controlValues.renderRefreshToken
      && mutationValues.renderAccessToken !== mutationValues.renderRefreshToken
      && controlValues.renderCredentialFilePath
        !== mutationValues.renderCredentialFilePath,
    "RENDER_CREDENTIAL_TYPE_INVALID",
    "credential-load",
  );
  const [controlRenderFile, mutationRenderFile] = await Promise.all([
    readTrustedRenderCliCredential({
      filePath: controlValues.renderCredentialFilePath,
      expectedAccessToken: controlValues.renderAccessToken,
      expectedRefreshToken: controlValues.renderRefreshToken,
      recoveryMode,
      label: "control",
    }),
    readTrustedRenderCliCredential({
      filePath: mutationValues.renderCredentialFilePath,
      expectedAccessToken: mutationValues.renderAccessToken,
      expectedRefreshToken: mutationValues.renderRefreshToken,
      recoveryMode,
      label: "mutation",
    }),
  ]);
  requireCondition(
    controlRenderFile.fileIdentitySha256 !== mutationRenderFile.fileIdentitySha256,
    "CONTROL_MUTATION_CREDENTIALS_NOT_DISTINCT",
    "credential-load",
  );
  requireCondition(
    controlValues.cloudflareApiToken !== mutationValues.cloudflareApiToken
      && controlValues.renderAccessToken !== mutationValues.renderAccessToken
      && controlValues.renderRefreshToken !== mutationValues.renderRefreshToken
      && controlValues.renderAccessToken !== mutationValues.renderRefreshToken
      && controlValues.renderRefreshToken !== mutationValues.renderAccessToken
      && controlValues.r2SecretAccessKey !== mutationValues.r2SecretAccessKey,
    "CONTROL_MUTATION_CREDENTIALS_NOT_DISTINCT",
    "credential-load",
  );
  const bootstrap = createSecretSet(bootstrapValues, BOOTSTRAP_KEYS, "bootstrap");
  const control = createSecretSet(controlValues, CONTROL_KEYS, "control");
  const mutation = createSecretSet(mutationValues, MUTATION_KEYS, "mutation");
  requireCondition(
    new Set([bootstrap.digest, control.digest, mutation.digest]).size === 3,
    "CONTROL_MUTATION_CREDENTIALS_NOT_DISTINCT",
    "credential-load",
  );
  return Object.freeze({
    bootstrap,
    control,
    controlDatabase,
    descriptors: Object.freeze({
      bootstrap: Object.freeze({
        kind: "persistent-provider-admin",
        provider: "postgres",
        privilege: "admin",
        retained: true,
        excludedFromReadOnlyControlAssertions: true,
        identitySha256: bootstrap.digest,
      }),
      control: Object.freeze({
        kind: "control",
        remainingReadOnlyProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryUnscopedProviders: (
          TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS
        ),
        terminalTemporaryProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalRevocationRequired: true,
        retainedAfterMutationRevoke: true,
        identitySha256: control.digest,
      }),
      mutation: Object.freeze({
        kind: "mutation",
        revocable: true,
        identitySha256: mutation.digest,
      }),
    }),
    mutation,
    mutationDatabase,
    restoreDatabase,
    adminDatabase,
    postgresRoles: SQL_MANAGED_POSTGRES_ROLES,
    postgresValidUntil,
    controlR2ExpiresAt,
    controlRenderExpiresAt: controlRenderFile.expiresAt,
    controlRenderFileIdentitySha256: controlRenderFile.fileIdentitySha256,
    controlRenderFileMtime: controlRenderFile.fileMtime,
    controlRenderIssuedAt: controlRenderFile.fileBirthtime,
    mutationRenderExpiresAt: mutationRenderFile.expiresAt,
    mutationRenderFileIdentitySha256: mutationRenderFile.fileIdentitySha256,
    mutationRenderFileMtime: mutationRenderFile.fileMtime,
    mutationRenderIssuedAt: mutationRenderFile.fileBirthtime,
    r2ExpiresAt,
  });
};

const createRestoreTargetBinding = ({ identity, confirmation }) => {
  const targetResourceSha256 = sha256(canonicalJson({
    database: identity.database,
    host: identity.host,
    port: identity.port,
  }));
  let restoreAttempted = false;
  let destroyed = false;
  return Object.freeze({
    bindBeforeRestore: () => {
      requireCondition(!destroyed, "RESTORE_TARGET_ALREADY_DESTROYED", "restore-proof");
      restoreAttempted = true;
      return targetResourceSha256;
    },
    requireDestroyTarget: (context) => {
      requireCondition(
        restoreAttempted
          && confirmation === `destroy-preview-database:${identity.database}`,
        "RESTORE_DESTROY_CONFIRMATION_INVALID",
        "restore-target-destroy",
      );
      const receiptTarget = context?.restore?.targetResourceSha256;
      requireCondition(
        receiptTarget === targetResourceSha256
          || (context?.recovery === true && receiptTarget === undefined),
        "RESTORE_TARGET_BINDING_INVALID",
        "restore-target-destroy",
      );
      return targetResourceSha256;
    },
    markDestroyed: () => {
      destroyed = true;
    },
    hydrate: (value) => {
      requireCondition(
        exactKeys(value, ["attempted", "destroyed"])
          && typeof value.attempted === "boolean"
          && typeof value.destroyed === "boolean"
          && (!value.destroyed || value.attempted),
        "RECOVERY_JOURNAL_INVALID",
        "recovery-journal",
      );
      restoreAttempted = value.attempted;
      destroyed = value.destroyed;
    },
    snapshot: () => Object.freeze({
      destroyed,
      restoreAttempted,
      targetResourceSha256,
    }),
  });
};

const createR2CredentialRouter = ({ control, mutation }) => Object.freeze({
  use: (role, callback) => {
    if (role === "control") return control(callback);
    if (role === "mutation") return mutation(callback);
    fail("R2_CREDENTIAL_ROLE_INVALID", "r2-credential-use");
  },
});

const assertCredentialRole = (context, descriptor, code, phase) => {
  requireCondition(
    isPlainObject(context)
      && canonicalJson(context.credentialRole) === canonicalJson(descriptor)
      && context.environment === "preview"
      && context.productionMutationAllowed === false
      && context.providerDowngradeAllowed === false
      && context.resourceSharingAllowed === false,
    code,
    phase,
  );
};

const pgQuery = async ({
  commandRunner,
  psqlPath,
  identity,
  sql,
  sensitiveSql = false,
  readOnly = true,
  assumeRole,
  phase,
}) => {
  const result = await runSafeCommand(commandRunner, {
    file: psqlPath,
    args: [
      "--no-psqlrc",
      "--no-align",
      "--tuples-only",
      "--set=ON_ERROR_STOP=1",
      ...(sensitiveSql ? ["--file=-"] : ["--command", sql]),
    ],
    ...(sensitiveSql ? { input: sql } : {}),
    env: databaseEnvironment(identity, {
      assumeRole,
      PGOPTIONS: [
        "-c statement_timeout=30000",
        "-c lock_timeout=5000",
        ...(readOnly ? ["-c default_transaction_read_only=on"] : []),
      ].join(" "),
    }),
  }, "POSTGRES_QUERY_FAILED", phase);
  return clean(result.stdout);
};

const databaseRevision = async (options) => {
  const revision = await pgQuery({
    ...options,
    sql: "SELECT version_num FROM public.alembic_version ORDER BY version_num;",
  });
  requireCondition(
    new Set([PHASE1_REVISION, PHASE2_REVISION]).has(revision),
    "POSTGRES_REVISION_INVALID",
    options.phase,
  );
  return revision;
};

const verifyControlDatabaseReadOnly = async ({
  commandRunner,
  psqlPath,
  identity,
}) => {
  const result = await pgQuery({
    commandRunner,
    psqlPath,
    identity,
    phase: "control-database-preflight",
    sql: `
      SELECT
        (
          role.rolcanlogin
          AND NOT role.rolinherit
          AND NOT role.rolsuper
          AND NOT role.rolcreaterole
          AND NOT role.rolcreatedb
          AND NOT role.rolreplication
          AND NOT role.rolbypassrls
        ),
        NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_auth_members AS membership
          WHERE membership.member = (
            SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user
          )
        ),
        current_setting('transaction_read_only') = 'on',
        current_setting('default_transaction_read_only') = 'on',
        COALESCE(role.rolconfig, ARRAY[]::text[])
          @> ARRAY['default_transaction_read_only=on']::text[],
        role.rolvaliduntil > now() + interval '6 hours',
        role.rolvaliduntil <= now() + interval '13 hours'
      FROM pg_catalog.pg_roles AS role
      WHERE role.rolname = current_user;
    `,
  });
  requireCondition(
    result === "t|t|t|t|t|t|t",
    "CONTROL_DATABASE_NOT_READ_ONLY",
    "control-database-preflight",
  );
  return Object.freeze({
    roleCapabilitiesDenied: true,
    inheritedRolesAbsent: true,
    transactionReadOnly: true,
    defaultTransactionReadOnly: true,
    roleSettingReadOnly: true,
    validityBounded: true,
    sqlManagedTemporaryRole: true,
  });
};

const verifyControlDatabaseWriteDenied = async ({
  commandRunner,
  psqlPath,
  identity,
  phase = "control-database-preflight",
}) => {
  const attempts = [
    (
      "BEGIN; CREATE TABLE public.qg_phase2_control_write_probe "
      + "(id integer); ROLLBACK;"
    ),
    (
      "BEGIN; UPDATE public.alembic_version "
      + "SET version_num = version_num WHERE false; ROLLBACK;"
    ),
    "BEGIN READ ONLY; SELECT pg_catalog.lo_create(0); ROLLBACK;",
  ];
  for (const sql of attempts) {
    let result;
    try {
      result = await commandRunner({
      file: psqlPath,
      args: [
        "--no-psqlrc",
        "--no-align",
        "--tuples-only",
        "--set=ON_ERROR_STOP=1",
        "--command",
        sql,
      ],
      env: databaseEnvironment(identity, { PGCONNECT_TIMEOUT: "5" }),
      timeoutMs: 10_000,
      acceptedExitCodes: [0, 1, 2, 3],
      maxBytes: 64 * 1024,
      });
    } catch {
      fail("CONTROL_DATABASE_WRITE_DENIAL_FAILED", phase);
    }
    requireCondition(
      result.exitCode !== 0
        && /(?:permission denied|read-only transaction)/iu.test(result.stderr)
        && !/(?:timeout|timed out|could not connect|connection refused|network|TLS|certificate)/iu.test(
          result.stderr,
        ),
      "CONTROL_DATABASE_WRITE_DENIAL_FAILED",
      phase,
    );
  }
  return Object.freeze({
    applicationDmlDenied: true,
    ddlDenied: true,
    largeObjectCreationDenied: true,
  });
};

const schemaFingerprint = async ({
  commandRunner,
  pgDumpPath,
  identity,
  stableOwner,
  phase,
}) => {
  const result = await runSafeCommand(commandRunner, {
    file: pgDumpPath,
    args: [
      "--schema-only",
      "--quote-all-identifiers",
      ...(stableOwner ? [`--role=${stableOwner}`] : []),
    ],
    env: databaseEnvironment(identity, { assumeRole: stableOwner }),
    timeoutMs: 120_000,
    maxBytes: 16 * 1024 * 1024,
  }, "POSTGRES_SCHEMA_CAPTURE_FAILED", phase);
  return sha256(result.stdout.replace(/^--.*$/gmu, "").replace(/\s+/gu, " ").trim());
};

const captureDatabaseContentSnapshot = async ({
  commandRunner,
  psqlPath,
  identity,
  stableOwner,
  phase,
}) => {
  const inventory = await pgQuery({
    commandRunner,
    psqlPath,
    identity,
    assumeRole: stableOwner,
    phase,
    sql: `
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `,
  });
  const tableNames = inventory.split("\n").map(clean).filter(Boolean);
  requireCondition(
    tableNames.length > 0
      && tableNames.length === new Set(tableNames).size
      && tableNames.every((name) => /^[a-z_][a-z0-9_]{0,62}$/u.test(name)),
    "POSTGRES_CONTENT_INVENTORY_INVALID",
    phase,
  );
  const tables = [];
  for (const name of tableNames) {
    const identifier = `"${name.replaceAll('"', '""')}"`;
    const value = await pgQuery({
      commandRunner,
      psqlPath,
      identity,
      assumeRole: stableOwner,
      phase,
      sql: `
        SELECT count(*)::text || '|' || pg_catalog.encode(
          pg_catalog.sha256(pg_catalog.convert_to(
            COALESCE(
              string_agg(
                to_jsonb(row_data)::text,
                E'\\n'
                ORDER BY to_jsonb(row_data)::text
              ),
              ''
            ),
            'UTF8'
          )),
          'hex'
        )
        FROM public.${identifier} AS row_data;
      `,
    });
    const match = /^(0|[1-9]\d*)\|([0-9a-f]{64})$/u.exec(value);
    requireCondition(match !== null, "POSTGRES_CONTENT_CAPTURE_FAILED", phase);
    const rowCount = Number(match[1]);
    requireCondition(Number.isSafeInteger(rowCount), "POSTGRES_CONTENT_CAPTURE_FAILED", phase);
    tables.push(Object.freeze({
      name,
      rowCount,
      rowAggregateSha256: sha256(`${name}\0${match[2]}`),
    }));
  }
  const captureSection = async (name, sql) => {
    const output = await pgQuery({
      commandRunner,
      psqlPath,
      identity,
      assumeRole: stableOwner,
      phase,
      sql,
    });
    const rows = output ? output.split("\n").map(clean).filter(Boolean) : [];
    return [name, Object.freeze({
      rowCount: rows.length,
      aggregateSha256: sha256(canonicalJson(rows)),
    })];
  };
  const captureSequences = async () => {
    const output = await pgQuery({
      commandRunner,
      psqlPath,
      identity,
      assumeRole: stableOwner,
      phase,
      sql: `
        SELECT sequencename
        FROM pg_catalog.pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename;
      `,
    });
    const names = output ? output.split("\n").map(clean).filter(Boolean) : [];
    requireCondition(
      names.length === new Set(names).size
        && names.every((name) => /^[a-z_][a-z0-9_]{0,62}$/u.test(name)),
      "POSTGRES_CONTENT_CAPTURE_FAILED",
      phase,
    );
    const rows = [];
    for (const name of names) {
      const identifier = `"${name.replaceAll('"', '""')}"`;
      const row = await pgQuery({
        commandRunner,
        psqlPath,
        identity,
        assumeRole: stableOwner,
        phase,
        sql: `
          SELECT json_build_object(
            'schema', sequence_info.schemaname,
            'name', sequence_info.sequencename,
            'owner', sequence_info.sequenceowner,
            'data_type', sequence_info.data_type,
            'start', sequence_info.start_value,
            'min', sequence_info.min_value,
            'max', sequence_info.max_value,
            'increment', sequence_info.increment_by,
            'cycle', sequence_info.cycle,
            'cache', sequence_info.cache_size,
            'last', state.last_value,
            'is_called', state.is_called
          )::text
          FROM pg_catalog.pg_sequences AS sequence_info
          CROSS JOIN public.${identifier} AS state
          WHERE sequence_info.schemaname = 'public'
            AND sequence_info.sequencename = ${sqlLiteral(name)};
        `,
      });
      requireCondition(row.length > 0, "POSTGRES_CONTENT_CAPTURE_FAILED", phase);
      rows.push(row);
    }
    return ["sequences", Object.freeze({
      rowCount: rows.length,
      aggregateSha256: sha256(canonicalJson(rows)),
    })];
  };
  const catalogSections = Object.freeze(Object.fromEntries(await Promise.all([
    captureSequences(),
    captureSection("extensions", `
      SELECT json_build_object(
        'name', extension.extname, 'version', extension.extversion,
        'schema', namespace.nspname,
        'owner', pg_catalog.pg_get_userbyid(extension.extowner)
      )::text
      FROM pg_catalog.pg_extension AS extension
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = extension.extnamespace
      ORDER BY extension.extname;
    `),
    captureSection("largeObjects", `
      SELECT json_build_object(
        'oid', metadata.oid,
        'owner', pg_catalog.pg_get_userbyid(metadata.lomowner),
        'acl', COALESCE(metadata.lomacl::text, ''),
        'bytesSha256', pg_catalog.encode(
          pg_catalog.sha256(pg_catalog.lo_get(metadata.oid)),
          'hex'
        )
      )::text
      FROM pg_catalog.pg_largeobject_metadata AS metadata
      ORDER BY metadata.oid;
    `),
    captureSection("schemas", `
      SELECT json_build_object(
        'name', namespace.nspname,
        'owner', pg_catalog.pg_get_userbyid(namespace.nspowner),
        'acl', COALESCE(namespace.nspacl::text, '')
      )::text
      FROM pg_catalog.pg_namespace AS namespace
      WHERE namespace.nspname = 'public'
      ORDER BY namespace.nspname;
    `),
    captureSection("objects", `
      SELECT value::text
      FROM (
        SELECT json_build_object(
          'kind', relation.relkind, 'schema', namespace.nspname,
          'name', relation.relname,
          'owner', pg_catalog.pg_get_userbyid(relation.relowner),
          'acl', COALESCE(relation.relacl::text, '')
        ) AS value, 'r:' || relation.relname AS sort_key
        FROM pg_catalog.pg_class AS relation
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relkind IN ('r','p','v','m','S','f')
        UNION ALL
        SELECT json_build_object(
          'kind', 'function', 'schema', namespace.nspname,
          'name', procedure.proname || '(' ||
            pg_catalog.pg_get_function_identity_arguments(procedure.oid) || ')',
          'owner', pg_catalog.pg_get_userbyid(procedure.proowner),
          'acl', COALESCE(procedure.proacl::text, '')
        ) AS value, 'f:' || procedure.oid::text AS sort_key
        FROM pg_catalog.pg_proc AS procedure
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
      ) AS inventory
      ORDER BY sort_key;
    `),
    captureSection("database", `
      SELECT json_build_object(
        'owner', pg_catalog.pg_get_userbyid(database.datdba),
        'encoding', pg_catalog.pg_encoding_to_char(database.encoding),
        'collate', database.datcollate, 'ctype', database.datctype,
        'localeProvider', database.datlocprovider,
        'tablespace', tablespace.spcname,
        'acl', COALESCE(database.datacl::text, ''),
        'settings', COALESCE((
          SELECT json_agg(setting.setconfig ORDER BY setting.setrole)
          FROM pg_catalog.pg_db_role_setting AS setting
          WHERE setting.setdatabase = database.oid
        ), '[]'::json)
      )::text
      FROM pg_catalog.pg_database AS database
      JOIN pg_catalog.pg_tablespace AS tablespace
        ON tablespace.oid = database.dattablespace
      WHERE database.datname = current_database();
    `),
  ])));
  const inventorySha256 = sha256(canonicalJson(tableNames));
  const rowCountsSha256 = sha256(canonicalJson(
    tables.map(({ name, rowCount }) => ({ name, rowCount })),
  ));
  const dataAggregateSha256 = sha256(canonicalJson(
    tables.map(({ name, rowAggregateSha256 }) => ({ name, rowAggregateSha256 })),
  ));
  return Object.freeze({
    schemaVersion: 2,
    tables: Object.freeze(tables),
    catalogSections,
    inventorySha256,
    rowCountsSha256,
    dataAggregateSha256,
    snapshotSha256: sha256(canonicalJson({
      inventorySha256,
      rowCountsSha256,
      dataAggregateSha256,
      catalogSections,
    })),
  });
};

const sameDatabaseContentSnapshot = (
  left,
  right,
  { ignoreDatabase = false } = {},
) => {
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  if (!ignoreDatabase) return canonicalJson(left) === canonicalJson(right);
  const comparable = (value) => ({
    schemaVersion: value.schemaVersion,
    tables: value.tables,
    inventorySha256: value.inventorySha256,
    rowCountsSha256: value.rowCountsSha256,
    dataAggregateSha256: value.dataAggregateSha256,
    catalogSections: {
      sequences: value.catalogSections?.sequences,
      extensions: value.catalogSections?.extensions,
      largeObjects: value.catalogSections?.largeObjects,
      schemas: value.catalogSections?.schemas,
      objects: value.catalogSections?.objects,
    },
  });
  return canonicalJson(comparable(left)) === canonicalJson(comparable(right));
};

const isDatabaseContentSnapshot = (value) => (
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
    && HASH_PATTERN.test(section.aggregateSha256)
  ))
  && HASH_PATTERN.test(value.inventorySha256)
  && HASH_PATTERN.test(value.rowCountsSha256)
  && HASH_PATTERN.test(value.dataAggregateSha256)
  && HASH_PATTERN.test(value.snapshotSha256)
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

const verifyRightsCatalog = async (root) => {
  const catalogPath = path.join(root, "api/catalogs/phase2-preview-v1.json");
  let source;
  let catalog;
  try {
    source = await readFile(catalogPath);
    catalog = JSON.parse(source.toString("utf8"));
  } catch {
    fail("RIGHTS_CATALOG_INVALID", "acceptance-preflight");
  }
  requireCondition(
    catalog?.schemaVersion === 1
      && catalog?.catalogId === "quantgym-phase2-preview-synthetic"
      && catalog?.synthetic === true
      && Array.isArray(catalog?.sources)
      && catalog.sources.length > 0
      && catalog.sources.every((entry) => (
        entry?.rightsStatus === "internal_preview"
        && entry?.releaseScope === "preview"
        && Array.isArray(entry?.problems)
        && entry.problems.length > 0
      )),
    "RIGHTS_CATALOG_INVALID",
    "acceptance-preflight",
  );
  const sourceSlugs = catalog.sources.map((entry) => clean(entry.slug)).sort();
  requireCondition(
    RIGHTS_CONTENT_VERSION_PATTERN.test(clean(catalog.contentVersion))
      && sourceSlugs.length === new Set(sourceSlugs).size
      && sourceSlugs.every((slug) => /^[a-z0-9][a-z0-9-]{2,63}$/u.test(slug)),
    "RIGHTS_CATALOG_INVALID",
    "acceptance-preflight",
  );
  return Object.freeze({
    catalogId: catalog.catalogId,
    catalogPath,
    catalogSha256: sha256(source),
    contentVersion: catalog.contentVersion,
    problemCount: catalog.sources.reduce(
      (count, entry) => count + entry.problems.length,
      0,
    ),
    sourceCount: catalog.sources.length,
    sourceSlugs,
  });
};

const amzTimestamp = (now) => now.toISOString().replace(/[:-]|\.\d{3}/gu, "");
const awsEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/gu, (character) => (
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`
));
const canonicalQuery = (url) => [...url.searchParams.entries()]
  .map(([key, value]) => [awsEncode(key), awsEncode(value)])
  .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  ))
  .map(([key, value]) => `${key}=${value}`)
  .join("&");
const signingKey = (secretKey, dateStamp) => (
  hmac(
    hmac(
      hmac(
        hmac(Buffer.from(`AWS4${secretKey}`, "utf8"), dateStamp),
        "auto",
      ),
      "s3",
    ),
    "aws4_request",
  )
);
const sigV4Headers = ({
  method,
  url,
  body,
  accessKey,
  secretKey,
  sessionToken,
  now,
  contentType = "",
}) => {
  const parsed = new URL(url);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
  const payloadHash = sha256(payload);
  const timestamp = amzTimestamp(now);
  const dateStamp = timestamp.slice(0, 8);
  const tokenHeader = sessionToken ? `x-amz-security-token:${sessionToken}\n` : "";
  const canonicalHeaders = (
    `host:${parsed.host}\n`
    + `x-amz-content-sha256:${payloadHash}\n`
    + `x-amz-date:${timestamp}\n`
    + tokenHeader
  );
  const signedHeaders = sessionToken
    ? "host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    parsed.pathname || "/",
    canonicalQuery(parsed),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const signature = hmac(signingKey(secretKey, dateStamp), [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    sha256(canonicalRequest),
  ].join("\n")).toString("hex");
  return {
    authorization: (
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, `
      + `SignedHeaders=${signedHeaders}, Signature=${signature}`
    ),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
    ...(sessionToken ? { "x-amz-security-token": sessionToken } : {}),
    ...(contentType ? { "content-type": contentType } : {}),
  };
};

const encodeObjectKey = (key) => key.split("/").map(encodeURIComponent).join("/");

const r2Request = async ({
  fetchImpl,
  accountId,
  bucket,
  key,
  query,
  method,
  body = Buffer.alloc(0),
  accessKey,
  secretKey,
  sessionToken,
  now,
  acceptedStatuses,
  phase,
}) => {
  const suffix = key === undefined
    ? `/${encodeURIComponent(bucket)}`
    : `/${encodeURIComponent(bucket)}/${encodeObjectKey(key)}`;
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com${suffix}`);
  for (const [name, value] of Object.entries(query ?? {})) {
    url.searchParams.set(name, String(value));
  }
  let response;
  try {
    response = await fetchImpl(url.href, {
      method,
      headers: sigV4Headers({
        method,
        url: url.href,
        body,
        accessKey,
        secretKey,
        sessionToken,
        now,
        contentType: method === "PUT" ? "text/plain" : "",
      }),
      body: new Set(["GET", "HEAD"]).has(method) ? undefined : body,
      redirect: "error",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch {
    fail("R2_REQUEST_FAILED", phase);
  }
  requireCondition(
    acceptedStatuses.includes(response?.status),
    "R2_REQUEST_FAILED",
    phase,
  );
  return response;
};

const boundedText = async (response, code, phase) => {
  const bytes = await readBoundedBytes({
    response,
    maximumBytes: MAX_HTTP_BYTES,
    code,
    phase,
  });
  try {
    return bytes.toString("utf8");
  } finally {
    bytes.fill(0);
  }
};

const parseR2List = async (response, phase, prefix) => {
  const xml = await boundedText(response, "R2_LIST_INVALID", phase);
  requireCondition(
    xml.includes("<ListBucketResult")
      && !/<!DOCTYPE|<!ENTITY/iu.test(xml)
      && !/<IsTruncated>true<\/IsTruncated>/u.test(xml),
    "R2_LIST_INVALID",
    phase,
  );
  const keys = [...xml.matchAll(/<Contents>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<\/Contents>/gu)]
    .map((match) => match[1]
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", "\"")
      .replaceAll("&apos;", "'")
      .replaceAll("&amp;", "&"));
  requireCondition(
    keys.length <= MAX_R2_OBJECTS
      && new Set(keys).size === keys.length
      && keys.every((key) => (
        key.startsWith(prefix)
        && /^readiness-smoke\/phase2\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.txt$/u.test(key)
      )),
    "R2_CLEANUP_SCOPE_INVALID",
    phase,
  );
  return keys;
};

const parseGitStatusPaths = (source) => source
  .split("\0")
  .filter(Boolean)
  .sort();

const buildArtifactInventory = async (directory, relative = "") => {
  const absolute = path.join(directory, relative);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch {
    fail("CANDIDATE_ARTIFACT_INVALID", "candidate-artifact");
  }
  const inventory = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const childRelative = path.posix.join(relative.split(path.sep).join("/"), entry.name);
    if (childRelative === ARTIFACT_MANIFEST_PATH) continue;
    const childAbsolute = path.join(directory, ...childRelative.split("/"));
    const metadata = await lstat(childAbsolute).catch(() => (
      fail("CANDIDATE_ARTIFACT_INVALID", "candidate-artifact")
    ));
    requireCondition(
      !metadata.isSymbolicLink(),
      "CANDIDATE_ARTIFACT_INVALID",
      "candidate-artifact",
    );
    if (metadata.isDirectory()) {
      inventory.push(...await buildArtifactInventory(directory, childRelative));
      continue;
    }
    requireCondition(metadata.isFile(), "CANDIDATE_ARTIFACT_INVALID", "candidate-artifact");
    inventory.push(Object.freeze({
      path: childRelative,
      bytes: metadata.size,
      sha256: await hashFile(childAbsolute),
    }));
  }
  return inventory;
};

const snapshotCandidateArtifact = async ({ directory, commit }) => {
  const files = await buildArtifactInventory(directory);
  requireCondition(
    files.length > 0
      && files.length <= MAX_ARTIFACT_FILES
      && files.some((entry) => entry.path === "index.html")
      && files.every((entry) => entry.bytes <= MAX_ARTIFACT_FILE_BYTES)
      && files.every((entry, index) => index === 0 || files[index - 1].path < entry.path),
    "CANDIDATE_ARTIFACT_INVALID",
    "candidate-artifact",
  );
  const artifactManifestSha256 = sha256(canonicalJson({
    schemaVersion: 1,
    commit,
    files,
  }));
  const manifest = Object.freeze({
    schemaVersion: 1,
    deploymentCommit: commit,
    artifactManifestSha256,
    files,
  });
  await mkdir(path.join(directory, ".well-known"), { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(directory, ARTIFACT_MANIFEST_PATH),
    `${canonicalJson(manifest)}\n`,
    { flag: "wx", mode: 0o600 },
  ).catch(() => fail("CANDIDATE_ARTIFACT_INVALID", "candidate-artifact"));
  return Object.freeze({ artifactManifestSha256, files });
};

const removeDetachedCandidate = async ({ state, commandRunner }) => {
  if (!state?.sourceDirectory) return;
  try {
    await commandRunner({
      file: "/usr/bin/git",
      args: ["worktree", "remove", "--force", state.sourceDirectory],
      cwd: state.repositoryRoot,
      env: {
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_NO_REPLACE_OBJECTS: "1",
        HOME: process.env.HOME ?? tmpdir(),
        LANG: "C",
        LC_ALL: "C",
        PATH: "/usr/bin:/bin",
      },
      timeoutMs: 120_000,
    });
  } catch {
    fail("CANDIDATE_ARTIFACT_CLEANUP_FAILED", "candidate-artifact");
  }
  try {
    await rm(state.temporaryDirectory, { force: true, recursive: true });
  } catch {
    fail("CANDIDATE_ARTIFACT_CLEANUP_FAILED", "candidate-artifact");
  }
};

const verifyDetachedCandidateSource = async ({
  sourceDirectory,
  commit,
  commandRunner,
}) => {
  const tree = await runSafeCommand(commandRunner, {
    file: "/usr/bin/git",
    args: ["ls-tree", "-r", "-z", commit],
    cwd: sourceDirectory,
    env: TRUSTED_GIT_ENV,
    maxBytes: 16 * 1024 * 1024,
  }, "CANDIDATE_SOURCE_INVALID", "candidate-artifact");
  const entries = tree.stdout.split("\0").filter(Boolean);
  requireCondition(
    entries.length > 0 && entries.length <= 16_384,
    "CANDIDATE_SOURCE_INVALID",
    "candidate-artifact",
  );
  for (const entry of entries) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(entry);
    requireCondition(match !== null, "CANDIDATE_SOURCE_INVALID", "candidate-artifact");
    const absolutePath = path.join(sourceDirectory, ...match[3].split("/"));
    const metadata = await lstat(absolutePath).catch(() => (
      fail("CANDIDATE_SOURCE_INVALID", "candidate-artifact")
    ));
    requireCondition(
      metadata.isFile()
        && !metadata.isSymbolicLink()
        && metadata.size <= MAX_ARTIFACT_FILE_BYTES,
      "CANDIDATE_SOURCE_INVALID",
      "candidate-artifact",
    );
    const bytes = await readFile(absolutePath);
    const blobSha1 = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    bytes.fill(0);
    requireCondition(
      blobSha1 === match[2],
      "CANDIDATE_SOURCE_INVALID",
      "candidate-artifact",
    );
  }
};

const createDetachedCandidateArtifact = async ({
  root,
  commit,
  commandRunner,
  npmCliPath,
}) => {
  let temporaryDirectory;
  let sourceDirectory;
  try {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-candidate-"));
    await chmod(temporaryDirectory, 0o700);
    sourceDirectory = path.join(temporaryDirectory, "source");
    await runSafeCommand(commandRunner, {
      file: "/usr/bin/git",
      args: [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "filter.lfs.smudge=",
        "-c",
        "filter.lfs.required=false",
        "worktree",
        "add",
        "--detach",
        sourceDirectory,
        commit,
      ],
      cwd: root,
      env: {
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_NO_REPLACE_OBJECTS: "1",
        HOME: process.env.HOME ?? tmpdir(),
        LANG: "C",
        LC_ALL: "C",
        PATH: "/usr/bin:/bin",
      },
      timeoutMs: 120_000,
    }, "CANDIDATE_WORKTREE_FAILED", "candidate-artifact");
    await verifyDetachedCandidateSource({ sourceDirectory, commit, commandRunner });
    const npmHome = path.join(temporaryDirectory, "npm-home");
    await mkdir(npmHome, { mode: 0o700 });
    const npmGlobalConfig = path.join(npmHome, "global.npmrc");
    const npmUserConfig = path.join(npmHome, "user.npmrc");
    await Promise.all([
      writeFile(npmGlobalConfig, "", { flag: "wx", mode: 0o600 }),
      writeFile(npmUserConfig, "", { flag: "wx", mode: 0o600 }),
    ]).catch(() => fail(
      "CANDIDATE_DEPENDENCIES_INVALID",
      "candidate-artifact",
    ));
    await runSafeCommand(commandRunner, {
      file: process.execPath,
      args: [
        npmCliPath,
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--registry=https://registry.npmjs.org/",
      ],
      cwd: sourceDirectory,
      env: {
        HOME: npmHome,
        LANG: "C",
        LC_ALL: "C",
        NODE_OPTIONS: "",
        NPM_CONFIG_GLOBALCONFIG: npmGlobalConfig,
        NPM_CONFIG_USERCONFIG: npmUserConfig,
        PATH: "/usr/bin:/bin",
      },
      timeoutMs: 15 * 60 * 1_000,
    }, "CANDIDATE_DEPENDENCIES_INVALID", "candidate-artifact");
    await verifyDetachedCandidateSource({ sourceDirectory, commit, commandRunner });
    await runSafeCommand(commandRunner, {
      file: process.execPath,
      args: ["scripts/build-frontend-v2.mjs"],
      cwd: sourceDirectory,
      env: {
        HOME: process.env.HOME ?? tmpdir(),
        LANG: "C",
        LC_ALL: "C",
        NODE_ENV: "production",
        NODE_OPTIONS: "",
        PATH: "/usr/bin:/bin",
        QUANTGYM_BUILD_BRANCH: BRANCH,
        QUANTGYM_BUILD_COMMIT: commit,
        QUANTGYM_BUILD_SOURCE: "test",
      },
      timeoutMs: 10 * 60 * 1_000,
    }, "FRONTEND_BUILD_PREFLIGHT_FAILED", "candidate-artifact");
    const directory = path.join(sourceDirectory, "dist-v2");
    const snapshot = await snapshotCandidateArtifact({ directory, commit });
    return Object.freeze({
      ...snapshot,
      commit,
      directory,
      repositoryRoot: root,
      sourceDirectory,
      temporaryDirectory,
    });
  } catch (error) {
    if (sourceDirectory !== undefined) {
      try {
        await commandRunner({
          file: "/usr/bin/git",
          args: ["worktree", "remove", "--force", sourceDirectory],
          cwd: root,
          env: { PATH: "/usr/bin:/bin" },
          acceptedExitCodes: [0, 128],
        });
      } catch {
        // The primary fail-closed error is retained. A later git worktree prune can
        // remove metadata, while the private temporary directory is still removed.
      }
    }
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { force: true, recursive: true }).catch(() => {});
    }
    if (error instanceof Phase2OperatorError) throw error;
    fail("CANDIDATE_ARTIFACT_INVALID", "candidate-artifact");
  }
};

const verifyCandidateArtifactUnchanged = async (state) => {
  const files = await buildArtifactInventory(state.directory);
  const artifactManifestSha256 = sha256(canonicalJson({
    schemaVersion: 1,
    commit: state.commit,
    files,
  }));
  requireCondition(
    artifactManifestSha256 === state.artifactManifestSha256
      && canonicalJson(files) === canonicalJson(state.files),
    "CANDIDATE_ARTIFACT_DRIFTED",
    "candidate-artifact",
  );
  const persisted = JSON.parse(await readFile(
    path.join(state.directory, ARTIFACT_MANIFEST_PATH),
    "utf8",
  ).catch(() => fail("CANDIDATE_ARTIFACT_DRIFTED", "candidate-artifact")));
  requireCondition(
    persisted?.deploymentCommit === state.commit
      && persisted?.artifactManifestSha256 === state.artifactManifestSha256
      && canonicalJson(persisted?.files) === canonicalJson(state.files),
    "CANDIDATE_ARTIFACT_DRIFTED",
    "candidate-artifact",
  );
  return state.artifactManifestSha256;
};

export function createApprovedPhase2OperatorCapabilities(options = {}) {
  return createNativeApprovedCapabilities({
    fetchImpl: options.fetchImpl ?? undiciFetch,
  });
}

export async function createPhase2OperatorAdapter({
  root = moduleRoot,
  credentialPayload,
  operatorConfig,
  capabilities,
  fetchImpl: rawFetchImpl = undiciFetch,
  commandRunner = defaultCommandRunner,
  clock = () => new Date(),
  recoveryMode = false,
} = {}) {
  requireCondition(
    path.resolve(root) === moduleRoot || process.env.NODE_ENV === "test",
    "OPERATOR_ROOT_INVALID",
    "adapter-create",
  );
  requireCondition(
    typeof rawFetchImpl === "function",
    "FETCH_ADAPTER_INVALID",
    "adapter-create",
  );
  requireCondition(
    typeof commandRunner === "function",
    "COMMAND_ADAPTER_INVALID",
    "adapter-create",
  );
  requireCondition(typeof recoveryMode === "boolean", "OPERATOR_MODE_INVALID", "adapter-create");
  const resolvedRoot = path.resolve(root);
  const authenticProductionConstruction = (
    resolvedRoot === moduleRoot
    && rawFetchImpl === undiciFetch
    && commandRunner === defaultCommandRunner
    && capabilities === undefined
    && process.env.NODE_ENV !== "test"
  );
  const config = requireOperatorConfig(operatorConfig);
  const proxyDispatcher = new ProxyAgent(config.httpsProxy.url);
  const fetchImpl = rawFetchImpl;
  const renderFetchImpl = (input, init = {}) => {
    let target;
    try {
      target = new URL(input);
    } catch {
      fail("RENDER_REQUEST_TARGET_INVALID", "render-request");
    }
    requireCondition(
      target.protocol === "https:"
        && target.hostname === "api.render.com"
        && !target.username
        && !target.password
        && !target.port,
      "RENDER_REQUEST_TARGET_INVALID",
      "render-request",
    );
    return rawFetchImpl(target, { ...init, dispatcher: proxyDispatcher });
  };
  const approvedCapabilities = capabilities
    ?? createApprovedPhase2OperatorCapabilities({ fetchImpl });
  const acceptanceCapability = requireCapability(
    approvedCapabilities?.acceptance,
    ACCEPTANCE_CAPABILITY_METHODS,
    "ACCEPTANCE_CAPABILITY_UNAVAILABLE",
  );
  const controlCapability = requireCapability(
    approvedCapabilities?.control,
    CONTROL_CAPABILITY_METHODS,
    "CONTROL_CAPABILITY_UNAVAILABLE",
  );
  const revocationCapability = requireCapability(
    approvedCapabilities?.revocation,
    REVOCATION_CAPABILITY_METHODS,
    "REVOCATION_CAPABILITY_UNAVAILABLE",
  );
  const credentials = await loadCredentialBoundary(credentialPayload, {
    recoveryMode,
    restoreDatabaseName: config.restoreDatabaseName,
  });
  const controlRenderCredentialIdentitySha256 = sha256(canonicalJson({
    access: credentials.control.get("renderAccessToken")
      .digest("quantgym-phase2-control-render-oauth-access"),
    expiresAt: credentials.controlRenderExpiresAt,
    fileIdentitySha256: credentials.controlRenderFileIdentitySha256,
    fileMtime: credentials.controlRenderFileMtime,
    issuedAt: credentials.controlRenderIssuedAt,
    kind: "render-cli-oauth-v1",
    refresh: credentials.control.get("renderRefreshToken")
      .digest("quantgym-phase2-control-render-oauth-refresh"),
  }));
  let tools;
  let catalog;
  let preflightComplete = false;
  let candidateGateState;
  let disposed = false;
  let backupState;
  let backupDirectory;
  let candidateArtifactState;
  let mutationTokenBindings;
  let boundPreviewPostgres;
  let providerPostgresBaselineSha256;
  let postgresRolesCreated = false;
  let stableDatabaseOwner;
  let createdCatalogRows = Object.freeze({ problemIds: [], sourceIds: [] });
  let topologyState;
  let recoveryJournal;
  let recoveryJournalPath;
  let recoveryJournalWrite = Promise.resolve();
  const postgresRevocationProofs = new Map();
  const restoreTargetBinding = createRestoreTargetBinding({
    identity: credentials.restoreDatabase,
    confirmation: config.restoreDestroyConfirmation,
  });
  let r2Prefix = `${R2_BASE_PREFIX}${randomUUID()}/`;
  let acceptanceEmail = `phase2-${randomUUID()}@preview.quantgym.invalid`;
  const revocationState = {
    cloudflare: false,
    postgres: false,
    r2: false,
    render: false,
  };
  let controlRenderRevoked = false;
  let terminalRenderRevocationProof;

  const postgresReadIdentity = () => (
    postgresRolesCreated ? credentials.controlDatabase : credentials.adminDatabase
  );
  const postgresMutationIdentity = () => (
    recoveryMode ? credentials.adminDatabase : credentials.mutationDatabase
  );
  const postgresIdentitySha256 = (kind) => {
    const identity = postgresIdentityFor(kind);
    return sha256(canonicalJson({
      database: identity.database,
      host: identity.host,
      port: identity.port,
      role: credentials.postgresRoles[kind],
    }));
  };

  const now = () => {
    const value = clock();
    requireCondition(
      value instanceof Date && Number.isFinite(value.getTime()),
      "CLOCK_INVALID",
      "adapter-clock",
    );
    return value;
  };

  const recoveryBoundarySha256 = sha256(canonicalJson({
    branch: BRANCH,
    cloudflareAccountId: config.cloudflareAccountId,
    previewDatabase: credentials.adminDatabase.database,
    previewDatabaseAdminUser: credentials.adminDatabase.user,
    previewDatabaseHost: credentials.adminDatabase.host,
    previewDatabasePort: credentials.adminDatabase.port,
    postgresRoles: credentials.postgresRoles,
    previewR2: PREVIEW_R2,
    evidenceHeadCommit: config.evidenceHeadCommit,
    previewApiOrigin: config.apiOrigin,
    previewWebOrigin: config.webOrigin,
  }));

  const persistentProviderAdminProof = (providerInventorySha256) => {
    requireCondition(
      HASH_PATTERN.test(providerInventorySha256 ?? ""),
      "PREVIEW_POSTGRES_PROVIDER_INVENTORY_DRIFT",
      "postgres-admin-proof",
    );
    const proof = {
      retained: true,
      privilege: "admin",
      excludedFromReadOnlyControlAssertions: true,
      identitySha256: credentials.descriptors.bootstrap.identitySha256,
      sqlIdentitySha256: sha256(canonicalJson({
        database: credentials.adminDatabase.database,
        host: credentials.adminDatabase.host,
        port: credentials.adminDatabase.port,
        user: credentials.adminDatabase.user,
      })),
      providerCredentialInventoryUnchanged: true,
      providerCredentialInventorySha256,
    };
    return Object.freeze({
      ...proof,
      evidenceSha256: sha256(canonicalJson(proof)),
    });
  };

  const normalizeTerminalRenderRevocationProof = (proof, phase) => {
    requireCondition(
      proof?.revoked === true
        && proof.accessDenied === true
        && proof.refreshDenied === true,
      "RENDER_CONTROL_REVOKE_FAILED",
      phase,
    );
    const normalized = {
      revoked: true,
      accessDenied: true,
      refreshDenied: true,
      credentialIdentitySha256: controlRenderCredentialIdentitySha256,
    };
    return Object.freeze({
      ...normalized,
      evidenceSha256: sha256(canonicalJson(normalized)),
    });
  };

  const validateRecoveryBackup = (value, phase) => {
    if (value === null) return null;
    requireCondition(
      isPlainObject(value)
        && new Set(["creating", "complete"]).has(value.status)
        && typeof value.directory === "string"
        && path.dirname(value.directory) === tmpdir()
        && path.basename(value.directory).startsWith("quantgym-phase2-backup-"),
      "RECOVERY_JOURNAL_INVALID",
      phase,
    );
    if (value.status === "creating") {
      requireCondition(
        exactKeys(value, ["status", "directory"]),
        "RECOVERY_JOURNAL_INVALID",
        phase,
      );
      return value;
    }
    requireCondition(
      exactKeys(value, [
        "status",
        "directory",
        "backupPath",
        "backupFileIdentity",
        "backupSha256",
        "sourceResourceSha256",
        "sourceRevision",
        "sourceSchemaSha256",
        "sourceContentSnapshot",
        "stableOwner",
        "archiveTocSha256",
        "archiveEntryCount",
      ])
        && path.dirname(value.backupPath) === value.directory
        && path.basename(value.backupPath) === "preview-phase1.dump"
        && exactKeys(value.backupFileIdentity, ["device", "inode", "mode", "size"])
        && /^\d+$/u.test(value.backupFileIdentity.device)
        && /^\d+$/u.test(value.backupFileIdentity.inode)
        && value.backupFileIdentity.mode === 0o600
        && /^[1-9]\d*$/u.test(value.backupFileIdentity.size)
        && HASH_PATTERN.test(value.backupSha256)
        && HASH_PATTERN.test(value.sourceResourceSha256)
        && value.sourceRevision === PHASE1_REVISION
        && HASH_PATTERN.test(value.sourceSchemaSha256)
        && isDatabaseContentSnapshot(value.sourceContentSnapshot)
        && /^[a-z_][a-z0-9_]{0,62}$/u.test(value.stableOwner)
        && HASH_PATTERN.test(value.archiveTocSha256)
        && Number.isSafeInteger(value.archiveEntryCount)
        && value.archiveEntryCount > 0,
      "RECOVERY_JOURNAL_INVALID",
      phase,
    );
    return value;
  };

  const validateRecoveryJournal = (value, expectedCommit, phase) => {
    const booleanRecord = (record, keys) => (
      exactKeys(record, keys) && keys.every((key) => typeof record[key] === "boolean")
    );
    const validBaseline = value?.baseline === null || (
      exactKeys(value?.baseline, [
        "previewApi",
        "previewLlm",
        "previewPages",
        "previewPostgres",
        "resources",
        "productionAnchor",
        "previewAnchor",
      ])
      && ["previewApi", "previewLlm", "previewPages"].every((key) => (
        clean(value.baseline[key]?.id)
        && clean(value.baseline[key]?.deploy?.id)
        && SHA_PATTERN.test(value.baseline[key]?.deploy?.commit ?? "")
      ))
      && clean(value.baseline.previewPostgres?.id)
      && isPlainObject(value.baseline.resources)
      && isPlainObject(value.baseline.productionAnchor)
      && isPlainObject(value.baseline.previewAnchor)
    );
    const validSeed = exactKeys(value?.seed, [
      "attempted",
      "email",
      "problemIds",
      "sourceIds",
      "preexistingProblemIds",
      "preexistingSourceIds",
    ])
      && typeof value.seed.attempted === "boolean"
      && /^[a-z0-9-]+@preview\.quantgym\.invalid$/u.test(value.seed.email)
      && [
        value.seed.problemIds,
        value.seed.sourceIds,
        value.seed.preexistingProblemIds,
        value.seed.preexistingSourceIds,
      ].every((ids) => (
        Array.isArray(ids)
        && ids.length === new Set(ids).size
        && ids.every((id) => /^[0-9a-f-]{36}$/u.test(id))
      ));
    const validPostgresAccess = exactKeys(value?.postgresAccess, [
      "roles",
      "identitySha256",
      "validUntil",
      "obligation",
      "created",
      "providerInventorySha256",
    ])
      && canonicalJson(value.postgresAccess.roles)
        === canonicalJson(credentials.postgresRoles)
      && exactKeys(value.postgresAccess.identitySha256, [
        "control",
        "mutation",
        "restore",
      ])
      && Object.values(value.postgresAccess.identitySha256).every((entry) => (
        HASH_PATTERN.test(entry)
      ))
      && Number.isFinite(Date.parse(value.postgresAccess.validUntil))
      && value.postgresAccess.obligation === "drop-all-sql-managed-roles"
      && typeof value.postgresAccess.created === "boolean"
      && (
        value.postgresAccess.providerInventorySha256 === null
        || HASH_PATTERN.test(value.postgresAccess.providerInventorySha256)
      );
    requireCondition(
      exactKeys(value, [
        "schemaVersion",
        "expectedCommit",
        "credentialBoundarySha256",
        "r2Prefix",
        "stage",
        "baseline",
        "backup",
        "seed",
        "postgresAccess",
        "preflightProofs",
        "restoreTarget",
        "mutationIntents",
        "mutations",
        "revocationAttempts",
        "revocations",
        "controlRenderRevoked",
        "finalization",
      ])
        && value.schemaVersion === 6
        && value.expectedCommit === expectedCommit
        && value.credentialBoundarySha256 === recoveryBoundarySha256
        && new RegExp(
          `^${R2_BASE_PREFIX.replaceAll("/", "\\/")}[0-9a-f-]{36}/$`,
          "u",
        ).test(value.r2Prefix)
        && /^[a-z][a-z0-9-]{1,63}$/u.test(value.stage)
        && validBaseline
        && validSeed
        && validPostgresAccess
        && exactKeys(value.preflightProofs, ["r2PreviewRead"])
        && (
          value.preflightProofs.r2PreviewRead === null
          || (
            exactKeys(value.preflightProofs.r2PreviewRead, [
              "credentialIdentitySha256",
              "credentialBoundarySha256",
              "operationSha256",
            ])
            && HASH_PATTERN.test(
              value.preflightProofs.r2PreviewRead.credentialIdentitySha256,
            )
            && value.preflightProofs.r2PreviewRead.credentialBoundarySha256
              === recoveryBoundarySha256
            && HASH_PATTERN.test(value.preflightProofs.r2PreviewRead.operationSha256)
          )
        )
        && booleanRecord(value.restoreTarget, ["attempted", "destroyed"])
        && booleanRecord(value.mutationIntents, [
          "databaseMigration",
          "apiDeploy",
          "pagesDeploy",
        ])
        && booleanRecord(value.mutations, [
          "databaseMigrated",
          "apiDeployed",
          "pagesDeployed",
          "cleanupCompleted",
          "databaseRestored",
          "apiRolledBack",
          "pagesRolledBack",
        ])
        && exactKeys(value.revocations, ["cloudflare", "render", "r2", "postgres"])
        && exactKeys(value.revocationAttempts, [
          "cloudflare",
          "render",
          "r2",
          "postgres",
          "controlRender",
        ])
        && ["cloudflare", "render", "r2", "controlRender"].every(
          (key) => typeof value.revocationAttempts[key] === "boolean",
        )
        && booleanRecord(value.revocationAttempts.postgres, [
          "control",
          "mutation",
          "restore",
        ])
        && ["cloudflare", "render", "r2"].every(
          (key) => typeof value.revocations[key] === "boolean",
        )
        && booleanRecord(value.revocations.postgres, ["control", "mutation", "restore"])
        && typeof value.controlRenderRevoked === "boolean"
        && exactKeys(value.finalization, [
          "status",
          "capturedAt",
          "facts",
          "factsSha256",
          "evidenceSha256",
        ])
        && new Set(["pending", "terminal-intent", "facts-staged", "evidence-written"])
          .has(value.finalization.status)
        && (
          value.finalization.status === "pending"
            ? value.finalization.capturedAt === null
              && value.finalization.facts === null
              && value.finalization.factsSha256 === null
              && value.finalization.evidenceSha256 === null
            : typeof value.finalization.capturedAt === "string"
              && Number.isFinite(Date.parse(value.finalization.capturedAt))
              && isPlainObject(value.finalization.facts)
              && HASH_PATTERN.test(value.finalization.factsSha256 ?? "")
              && value.finalization.factsSha256
                === sha256(canonicalJson(value.finalization.facts))
              && (
                new Set(["terminal-intent", "facts-staged"])
                  .has(value.finalization.status)
                  ? value.finalization.evidenceSha256 === null
                  : HASH_PATTERN.test(value.finalization.evidenceSha256 ?? "")
              )
        ),
      "RECOVERY_JOURNAL_INVALID",
      phase,
    );
    validateRecoveryBackup(value.backup, phase);
    return value;
  };

  const persistRecoveryJournal = async () => {
    if (!recoveryJournalPath || !recoveryJournal) return;
    await persistRecoveryJournalFile({
      journalPath: recoveryJournalPath,
      source: `${canonicalJson(recoveryJournal)}\n`,
    });
  };

  const updateRecoveryJournal = async (patchValue) => {
    if (!recoveryJournal) return;
    const update = async () => {
      recoveryJournal = {
        ...recoveryJournal,
        ...structuredClone(
          typeof patchValue === "function" ? patchValue(recoveryJournal) : patchValue,
        ),
      };
      validateRecoveryJournal(
        recoveryJournal,
        candidateGateState.expectedCommit,
        "recovery-journal",
      );
      await persistRecoveryJournal();
    };
    const operation = recoveryJournalWrite.then(update, update);
    recoveryJournalWrite = operation.catch(() => {});
    await operation;
  };

  const initializeRecoveryJournal = async (expectedCommit, { recover = false } = {}) => {
    recoveryJournalPath = path.join(
      tmpdir(),
      `quantgym-phase2-recovery-${expectedCommit}.json`,
    );
    let existing;
    try {
      const metadata = await lstat(recoveryJournalPath);
      requireCondition(
        metadata.isFile()
          && !metadata.isSymbolicLink()
          && metadata.nlink === 1
          && (metadata.mode & 0o777) === 0o600
          && metadata.size > 0
          && metadata.size <= 2 * 1024 * 1024,
        "RECOVERY_JOURNAL_INVALID",
        "recovery-journal",
      );
      existing = JSON.parse(await readFile(recoveryJournalPath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") {
        if (error instanceof Phase2OperatorError) throw error;
        fail("RECOVERY_JOURNAL_INVALID", "recovery-journal");
      }
    }
    if (existing !== undefined) {
      recoveryJournal = validateRecoveryJournal(
        existing,
        expectedCommit,
        "recovery-journal",
      );
      r2Prefix = recoveryJournal.r2Prefix;
      acceptanceEmail = recoveryJournal.seed.email;
      createdCatalogRows = Object.freeze({
        problemIds: Object.freeze([...recoveryJournal.seed.problemIds]),
        sourceIds: Object.freeze([...recoveryJournal.seed.sourceIds]),
      });
      backupDirectory = recoveryJournal.backup?.directory;
      if (recoveryJournal.backup?.status === "complete") {
        backupState = {
          backupPath: recoveryJournal.backup.backupPath,
          directory: recoveryJournal.backup.directory,
          backupFileIdentity: recoveryJournal.backup.backupFileIdentity,
          backupSha256: recoveryJournal.backup.backupSha256,
          sourceResourceSha256: recoveryJournal.backup.sourceResourceSha256,
          sourceRevision: recoveryJournal.backup.sourceRevision,
          sourceSchemaSha256: recoveryJournal.backup.sourceSchemaSha256,
          sourceContentSnapshot: recoveryJournal.backup.sourceContentSnapshot,
          stableOwner: recoveryJournal.backup.stableOwner,
          archiveTocSha256: recoveryJournal.backup.archiveTocSha256,
          archiveEntryCount: recoveryJournal.backup.archiveEntryCount,
        };
        stableDatabaseOwner = recoveryJournal.backup.stableOwner;
      }
      providerPostgresBaselineSha256 = (
        recoveryJournal.postgresAccess.providerInventorySha256 ?? undefined
      );
      restoreTargetBinding.hydrate(recoveryJournal.restoreTarget);
      if (recoveryJournal.baseline !== null) {
        topologyState = {
          previewApi: structuredClone(recoveryJournal.baseline.previewApi),
          previewLlm: structuredClone(recoveryJournal.baseline.previewLlm),
          previewPostgres: structuredClone(recoveryJournal.baseline.previewPostgres),
          previewPages: structuredClone(recoveryJournal.baseline.previewPages),
          resources: structuredClone(recoveryJournal.baseline.resources),
        };
        boundPreviewPostgres = Object.freeze({
          id: recoveryJournal.baseline.previewPostgres.id,
          resourceIdentitySha256: (
            recoveryJournal.baseline.resources.postgres.identitySha256
          ),
        });
      }
      for (const provider of ["cloudflare", "render", "r2"]) {
        revocationState[provider] = recoveryJournal.revocations[provider];
      }
      for (const [kind, revoked] of Object.entries(recoveryJournal.revocations.postgres)) {
        if (revoked) postgresRevocationProofs.set(kind, null);
      }
      revocationState.postgres = (
        recoveryJournal.revocations.postgres.mutation
        && recoveryJournal.revocations.postgres.restore
      );
      controlRenderRevoked = recoveryJournal.controlRenderRevoked;
      requireCondition(
        recover || recoveryJournal.stage === "candidate-gate",
        "RECOVERY_REQUIRED",
        "recovery-journal",
      );
      return;
    }
    requireCondition(!recover, "RECOVERY_JOURNAL_REQUIRED", "recovery-journal");
    recoveryJournal = {
      schemaVersion: 6,
      expectedCommit,
      credentialBoundarySha256: recoveryBoundarySha256,
      r2Prefix,
      stage: "candidate-gate",
      baseline: null,
      backup: null,
      seed: {
        attempted: false,
        email: acceptanceEmail,
        problemIds: [],
        sourceIds: [],
        preexistingProblemIds: [],
        preexistingSourceIds: [],
      },
      postgresAccess: {
        roles: structuredClone(credentials.postgresRoles),
        identitySha256: Object.fromEntries(
          Object.keys(credentials.postgresRoles).map((kind) => [
            kind,
            postgresIdentitySha256(kind),
          ]),
        ),
        validUntil: credentials.postgresValidUntil,
        obligation: "drop-all-sql-managed-roles",
        created: false,
        providerInventorySha256: null,
      },
      preflightProofs: { r2PreviewRead: null },
      restoreTarget: { attempted: false, destroyed: false },
      mutationIntents: {
        databaseMigration: false,
        apiDeploy: false,
        pagesDeploy: false,
      },
      mutations: {
        databaseMigrated: false,
        apiDeployed: false,
        pagesDeployed: false,
        cleanupCompleted: false,
        databaseRestored: false,
        apiRolledBack: false,
        pagesRolledBack: false,
      },
      revocations: {
        cloudflare: false,
        render: false,
        r2: false,
        postgres: { control: false, mutation: false, restore: false },
      },
      revocationAttempts: {
        cloudflare: false,
        render: false,
        r2: false,
        postgres: { control: false, mutation: false, restore: false },
        controlRender: false,
      },
      controlRenderRevoked: false,
      finalization: {
        status: "pending",
        capturedAt: null,
        facts: null,
        factsSha256: null,
        evidenceSha256: null,
      },
    };
    await persistRecoveryJournal();
  };

  const removeRecoveryJournal = async () => {
    if (!recoveryJournalPath) return;
    await removeRecoveryJournalFile({ journalPath: recoveryJournalPath });
    recoveryJournal = undefined;
    recoveryJournalPath = undefined;
  };

  const cfRequest = async ({
    role,
    suffix,
    method = "GET",
    body,
    acceptedStatuses = [200],
    phase,
  }) => {
    const secrets = role === "control" ? credentials.control : credentials.mutation;
    return secrets.get("cloudflareApiToken").use((token) => requestJson({
      fetchImpl,
      url: `https://api.cloudflare.com/client/v4${suffix}`,
      method,
      body,
      acceptedStatuses,
      provider: "CLOUDFLARE",
      phase,
      headers: { authorization: `Bearer ${token}` },
    }));
  };

  const renderRequest = async ({
    role,
    suffix,
    method = "GET",
    body,
    acceptedStatuses = [200],
    phase,
  }) => {
    const secrets = role === "control" ? credentials.control : credentials.mutation;
    return secrets.get("renderAccessToken").use((token) => requestJson({
      fetchImpl: renderFetchImpl,
      url: `https://api.render.com${suffix}`,
      method,
      body,
      acceptedStatuses,
      provider: "RENDER",
      phase,
      headers: { authorization: `Bearer ${token}` },
    }));
  };

  const githubRequest = async (suffix, phase) => {
    const allowed = new RegExp(
      `^/repos/${REPOSITORY.replace("/", "\\/")}(?:`
      + "$"
      + `|/branches/${encodeURIComponent(BRANCH)}`
      + "|/commits/[0-9a-f]{40}"
      + "|/commits/[0-9a-f]{40}/check-runs\\?per_page=100"
      + "|/actions/runs/[1-9][0-9]*"
      + `|/pulls/${PULL_REQUEST_NUMBER}`
      + ")$",
      "u",
    );
    requireCondition(allowed.test(suffix), "GITHUB_READ_TARGET_INVALID", phase);
    let response;
    try {
      response = await fetchImpl(`https://api.github.com${suffix}`, {
        method: "GET",
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "quantgym-phase2-read-only-operator/1",
          "x-github-api-version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      fail("GITHUB_REQUEST_FAILED", phase);
    }
    const remaining = Number(response?.headers?.get?.("x-ratelimit-remaining"));
    requireCondition(
      response?.status === 200
        && Number.isSafeInteger(remaining)
        && remaining > 0,
      "GITHUB_REQUEST_FAILED",
      phase,
    );
    const bytes = await readBoundedBytes({
      response,
      maximumBytes: MAX_HTTP_BYTES,
      code: "GITHUB_REQUEST_FAILED",
      phase,
    });
    try {
      return JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("GITHUB_RESPONSE_INVALID", phase);
    } finally {
      bytes.fill(0);
    }
  };

  const cloudflareReadOnlyScopeProof = async (verifyPayload, phase) => {
    const tokenId = clean(verifyPayload?.result?.id).toLowerCase();
    requireCondition(TOKEN_ID_PATTERN.test(tokenId), "CONTROL_SCOPE_INVALID", phase);
    const [tokenPayload, permissionGroupsPayload] = await Promise.all([
      cfRequest({
        role: "control",
        suffix: `/accounts/${config.cloudflareAccountId}/tokens/${encodeURIComponent(tokenId)}`,
        phase,
      }),
      cfRequest({
        role: "control",
        suffix: `/accounts/${config.cloudflareAccountId}/tokens/permission_groups`,
        phase,
      }),
    ]);
    const token = tokenPayload?.result;
    const permissionGroups = permissionGroupsPayload?.result;
    requireCondition(
      token?.id === tokenId
        && token?.status === "active"
        && Array.isArray(token?.policies)
        && token.policies.length === 1
        && Array.isArray(permissionGroups),
      "CONTROL_SCOPE_INVALID",
      phase,
    );
    const permissionGroupsById = new Map(permissionGroups.map((group) => [
      clean(group?.id),
      group,
    ]));
    requireCondition(
      permissionGroupsById.size === permissionGroups.length,
      "CONTROL_SCOPE_INVALID",
      phase,
    );
    const ids = [];
    const names = [];
    for (const policy of token.policies) {
      const resourceKeys = Object.keys(policy?.resources ?? {});
      requireCondition(
        policy?.effect === "allow"
          && resourceKeys.length === 1
          && resourceKeys[0] === `com.cloudflare.api.account.${config.cloudflareAccountId}`
          && policy.resources[resourceKeys[0]] === "*"
          && Array.isArray(policy.permission_groups)
          && policy.permission_groups.length > 0,
        "CONTROL_SCOPE_INVALID",
        phase,
      );
      for (const group of policy.permission_groups) {
        const id = clean(group?.id);
        const authoritative = permissionGroupsById.get(id);
        const name = clean(authoritative?.name ?? group?.name);
        requireCondition(
          TOKEN_ID_PATTERN.test(id),
          "CONTROL_SCOPE_INVALID",
          phase,
        );
        ids.push(id);
        names.push(name);
      }
    }
    requireCondition(
      canonicalJson([...new Set(ids)].sort()) === canonicalJson([
        CLOUDFLARE_PERMISSION_GROUP_IDS.accountTokensRead,
        CLOUDFLARE_PERMISSION_GROUP_IDS.pagesRead,
        CLOUDFLARE_PERMISSION_GROUP_IDS.r2StorageRead,
      ].sort())
        && ids.length === 3,
      "CONTROL_SCOPE_INVALID",
      phase,
    );
    const validity = requireShortLivedProviderToken({
      token,
      maximumLifetimeMs: 7 * 24 * 60 * 60 * 1_000,
      maximumIssueAgeMs: 30 * 60 * 1_000,
      minimumRemainingLifetimeMs: 6 * 60 * 60 * 1_000,
      code: "CONTROL_SCOPE_INVALID",
      phase,
    });
    return Object.freeze({
      accountBound: true,
      permissionGroupIdsSha256: sha256(canonicalJson([...ids].sort())),
      permissionNamesSha256: sha256(canonicalJson([...new Set(names)].sort())),
      readOnly: true,
      tokenIdentitySha256: sha256(`cloudflare-control-token\0${tokenId}`),
      validitySha256: sha256(canonicalJson(validity)),
    });
  };

  const permissionGroupNames = (token, permissionGroups, code, phase) => {
    const groupsById = new Map(permissionGroups.map((group) => [
      clean(group?.id),
      group,
    ]));
    requireCondition(groupsById.size === permissionGroups.length, code, phase);
    return token.policies.map((policy) => ({
      policy,
      groups: (Array.isArray(policy?.permission_groups)
        ? policy.permission_groups
        : []).map((group) => {
        const id = clean(group?.id);
        const resolved = groupsById.get(id);
        requireCondition(
          TOKEN_ID_PATTERN.test(id),
          code,
          phase,
        );
        return Object.freeze({
          id,
          name: clean(resolved?.name ?? group?.name),
          scope: CLOUDFLARE_BUCKET_PERMISSION_GROUP_IDS.has(id)
            ? "com.cloudflare.edge.r2.bucket"
            : "com.cloudflare.api.account",
        });
      }),
    }));
  };

  const requireShortLivedProviderToken = ({
    token,
    expectedExpiresAt,
    maximumLifetimeMs,
    maximumIssueAgeMs = Number.POSITIVE_INFINITY,
    minimumRemainingLifetimeMs = 0,
    code,
    phase,
  }) => {
    const issuedAt = Date.parse(token?.issued_on);
    const expiresAt = Date.parse(token?.expires_on);
    const currentTime = now().getTime();
    requireCondition(
      Number.isFinite(issuedAt)
        && Number.isFinite(expiresAt)
        && issuedAt <= currentTime + 60 * 1_000
        && currentTime - issuedAt <= maximumIssueAgeMs
        && expiresAt > currentTime
        && expiresAt - currentTime >= minimumRemainingLifetimeMs
        && expiresAt - issuedAt > 0
        && expiresAt - issuedAt <= maximumLifetimeMs
        && (expectedExpiresAt === undefined || expiresAt === expectedExpiresAt),
      code,
      phase,
    );
    return Object.freeze({ issuedAt, expiresAt });
  };

  const cloudflareMutationScopeProof = async (tokenId, phase) => {
    const [tokenPayload, permissionGroupsPayload] = await Promise.all([
      cfRequest({
        role: "control",
        suffix: `/accounts/${config.cloudflareAccountId}/tokens/${encodeURIComponent(tokenId)}`,
        phase,
      }),
      cfRequest({
        role: "control",
        suffix: `/accounts/${config.cloudflareAccountId}/tokens/permission_groups`,
        phase,
      }),
    ]);
    const token = tokenPayload?.result;
    const permissionGroups = permissionGroupsPayload?.result;
    requireCondition(
      token?.id === tokenId
        && token?.status === "active"
        && Array.isArray(token?.policies)
        && token.policies.length === 1
        && Array.isArray(permissionGroups),
      "CLOUDFLARE_MUTATION_SCOPE_INVALID",
      phase,
    );
    const [{ policy, groups }] = permissionGroupNames(
      token,
      permissionGroups,
      "CLOUDFLARE_MUTATION_SCOPE_INVALID",
      phase,
    );
    const ids = groups.map(({ id }) => id);
    const names = groups.map(({ name }) => name);
    const resource = `com.cloudflare.api.account.${config.cloudflareAccountId}`;
    requireCondition(
      policy?.effect === "allow"
        && exactKeys(policy?.resources, [resource])
        && policy.resources[resource] === "*"
        && groups.every(({ scope }) => scope === "com.cloudflare.api.account")
        && canonicalJson([...new Set(ids)].sort()) === canonicalJson([
          CLOUDFLARE_PERMISSION_GROUP_IDS.accountTokensWrite,
          CLOUDFLARE_PERMISSION_GROUP_IDS.pagesWrite,
        ].sort())
        && ids.length === 2,
      "CLOUDFLARE_MUTATION_SCOPE_INVALID",
      phase,
    );
    const validity = requireShortLivedProviderToken({
      token,
      maximumLifetimeMs: MUTATION_CREDENTIAL_MAX_LIFETIME_MS,
      maximumIssueAgeMs: 30 * 60 * 1_000,
      minimumRemainingLifetimeMs: 6 * 60 * 60 * 1_000,
      code: "CLOUDFLARE_MUTATION_LIFETIME_INVALID",
      phase,
    });
    return Object.freeze({
      accountBound: true,
      permissionGroupIdsSha256: sha256(canonicalJson([...ids].sort())),
      permissionNamesSha256: sha256(canonicalJson([...names].sort())),
      policySha256: sha256(canonicalJson(token.policies)),
      shortLived: true,
      tokenIdentitySha256: sha256(`cloudflare-account-token\0${tokenId}`),
      validitySha256: sha256(canonicalJson(validity)),
    });
  };

  const r2MutationScopeProof = async (
    tokenId,
    tokenPayload,
    phase,
    { allowRecoveryAge = false } = {},
  ) => {
    const token = tokenPayload?.result;
    const policies = Array.isArray(token?.policies) ? token.policies : [];
    const expectedResource = (
      `com.cloudflare.edge.r2.bucket.${config.cloudflareAccountId}_default_${PREVIEW_R2}`
    );
    requireCondition(
      token?.id === tokenId
        && token?.status === "active"
        && policies.length === 1,
      "R2_MUTATION_SCOPE_INVALID",
      phase,
    );
    const [policy] = policies;
    const resources = policy?.resources;
    const resourceKeys = isPlainObject(resources) ? Object.keys(resources) : [];
    const permissionGroupsPayload = await cfRequest({
      role: "control",
      suffix: `/accounts/${config.cloudflareAccountId}/tokens/permission_groups`,
      phase,
    });
    const permissionGroups = permissionGroupsPayload?.result;
    requireCondition(
      Array.isArray(permissionGroups),
      "R2_MUTATION_SCOPE_INVALID",
      phase,
    );
    const [{ groups }] = permissionGroupNames(
      token,
      permissionGroups,
      "R2_MUTATION_SCOPE_INVALID",
      phase,
    );
    const ids = groups.map(({ id }) => id);
    requireCondition(
      policy?.effect === "allow"
        && resourceKeys.length === 1
        && resourceKeys[0] === expectedResource
        && resources[resourceKeys[0]] === "*"
        && groups.every(({ scope }) => scope === "com.cloudflare.edge.r2.bucket")
        && ids.length === 2
        && canonicalJson([...new Set(ids)].sort()) === canonicalJson([
          CLOUDFLARE_PERMISSION_GROUP_IDS.r2BucketItemRead,
          CLOUDFLARE_PERMISSION_GROUP_IDS.r2BucketItemWrite,
        ].sort()),
      "R2_MUTATION_SCOPE_INVALID",
      phase,
    );
    const validity = requireShortLivedProviderToken({
      token,
      expectedExpiresAt: credentials.r2ExpiresAt,
      maximumLifetimeMs: MUTATION_CREDENTIAL_MAX_LIFETIME_MS,
      maximumIssueAgeMs: allowRecoveryAge
        ? Number.POSITIVE_INFINITY
        : 30 * 60 * 1_000,
      minimumRemainingLifetimeMs: allowRecoveryAge ? 1 : 6 * 60 * 60 * 1_000,
      code: "R2_MUTATION_LIFETIME_INVALID",
      phase,
    });
    return Object.freeze({
      bucketBound: true,
      permissionGroupIdsSha256: sha256(canonicalJson([...ids].sort())),
      policyReadWrite: true,
      policySha256: sha256(canonicalJson(policies)),
      shortLived: true,
      tokenIdentitySha256: sha256(`cloudflare-r2-mutation-token\0${tokenId}`),
      validitySha256: sha256(canonicalJson(validity)),
    });
  };

  const r2ControlReadOnlyScopeProof = async (phase) => (
    credentials.control.get("r2AccessKeyId").use(async (tokenIdValue) => {
      const tokenId = clean(tokenIdValue).toLowerCase();
      const [payload, permissionGroupsPayload] = await Promise.all([
        cfRequest({
          role: "control",
          suffix: `/accounts/${config.cloudflareAccountId}/tokens/${encodeURIComponent(tokenId)}`,
          phase,
        }),
        cfRequest({
          role: "control",
          suffix: `/accounts/${config.cloudflareAccountId}/tokens/permission_groups`,
          phase,
        }),
      ]);
      const token = payload?.result;
      const policies = Array.isArray(token?.policies) ? token.policies : [];
      const permissionGroups = permissionGroupsPayload?.result;
      const expectedResource = (
        `com.cloudflare.edge.r2.bucket.${config.cloudflareAccountId}_default_${PREVIEW_R2}`
      );
      requireCondition(
        token?.id === tokenId
          && token?.status === "active"
          && policies.length === 1
          && Array.isArray(permissionGroups),
        "R2_CONTROL_SCOPE_INVALID",
        phase,
      );
      for (const policy of policies) {
        const resources = policy?.resources;
        const resourceKeys = isPlainObject(resources) ? Object.keys(resources) : [];
        const [{ groups }] = permissionGroupNames(
          token,
          permissionGroups,
          "R2_CONTROL_SCOPE_INVALID",
          phase,
        );
        const ids = groups.map(({ id }) => id);
        requireCondition(
          policy?.effect === "allow"
            && resourceKeys.length === 1
            && resourceKeys[0] === expectedResource
            && resources[resourceKeys[0]] === "*"
            && groups.every(({ scope }) => scope === "com.cloudflare.edge.r2.bucket")
            && ids.length === 1
            && ids[0] === CLOUDFLARE_PERMISSION_GROUP_IDS.r2BucketItemRead,
          "R2_CONTROL_SCOPE_INVALID",
          phase,
        );
      }
      const validity = requireShortLivedProviderToken({
        token,
        expectedExpiresAt: credentials.controlR2ExpiresAt,
        maximumLifetimeMs: 7 * 24 * 60 * 60 * 1_000,
        maximumIssueAgeMs: 30 * 60 * 1_000,
        minimumRemainingLifetimeMs: 6 * 60 * 60 * 1_000,
        code: "R2_CONTROL_LIFETIME_INVALID",
        phase,
      });
      return Object.freeze({
        bucketBound: true,
        policyReadOnly: true,
        policySha256: sha256(canonicalJson(policies)),
        tokenIdentitySha256: sha256(`cloudflare-r2-control-token\0${tokenId}`),
        validitySha256: sha256(canonicalJson(validity)),
      });
    })
  );

  const r2MutationCredentialIdentitySha256 = (tokenId) => sha256(canonicalJson({
    accessId: tokenId,
    credentialKind: "cloudflare-r2-account-token-v1",
    secretAccessKeySha256: credentials.mutation
      .get("r2SecretAccessKey")
      .digest("quantgym-phase2-r2-secret"),
  }));

  const renderList = async (suffix, key, phase, role = "control") => {
    const values = [];
    const seen = new Set();
    let cursor = "";
    for (let page = 0; page < 100; page += 1) {
      const separator = suffix.includes("?") ? "&" : "?";
      const payload = await renderRequest({
        role,
        suffix: `${suffix}${separator}limit=100${cursor
          ? `&cursor=${encodeURIComponent(cursor)}`
          : ""}`,
        phase,
      });
      requireCondition(Array.isArray(payload), "RENDER_RESPONSE_INVALID", phase);
      for (const entry of payload) values.push(renderEntry(entry, key));
      if (payload.length < 100) return values;
      const next = clean(payload.at(-1)?.cursor);
      requireCondition(next && !seen.has(next), "RENDER_PAGINATION_INVALID", phase);
      seen.add(next);
      cursor = next;
    }
    fail("RENDER_PAGINATION_INVALID", phase);
  };

  const currentRenderDeploy = async (serviceId, phase) => {
    const payload = await renderRequest({
      role: "control",
      suffix: `/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=1`,
      phase,
    });
    requireCondition(Array.isArray(payload) && payload.length === 1, "RENDER_DEPLOY_INVALID", phase);
    return parseRenderDeploy(payload[0], phase);
  };

  const providerPostgresCredentials = (payload, phase) => {
    requireCondition(Array.isArray(payload), "PREVIEW_POSTGRES_CREDENTIALS_INVALID", phase);
    const credentialsInventory = payload.map((entry) => {
      const value = renderEntry(entry, "credential")?.username
        ? renderEntry(entry, "credential")
        : renderEntry(entry, "postgresCredential")?.username
          ? renderEntry(entry, "postgresCredential")
          : entry;
      return Object.freeze({
        default: value?.default,
        username: clean(value?.username),
      });
    });
    requireCondition(
      credentialsInventory.length > 0
        && credentialsInventory.every((entry) => (
          entry.username && typeof entry.default === "boolean"
        )),
      "PREVIEW_POSTGRES_CREDENTIALS_INVALID",
      phase,
    );
    return credentialsInventory;
  };

  const bindPreviewPostgresResource = async (phase) => {
    const postgres = await renderList("/v1/postgres", "postgres", phase);
    const preview = selectUnique(
      postgres,
      (entry) => entry?.name === PREVIEW_POSTGRES,
      "PREVIEW_POSTGRES_NOT_UNIQUE",
      phase,
    );
    const previewId = requireText(
      preview?.id,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    const connectionInfo = await renderRequest({
      role: "control",
      suffix: `/v1/postgres/${encodeURIComponent(previewId)}/connection-info`,
      phase,
    });
    const providerDatabase = parseProviderDatabaseIdentity(
      connectionInfo?.externalConnectionString,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    requireCondition(
      credentials.adminDatabase.host === providerDatabase.host
        && credentials.adminDatabase.port === providerDatabase.port
        && credentials.adminDatabase.database === providerDatabase.database
        && credentials.adminDatabase.user === providerDatabase.user,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    boundPreviewPostgres = Object.freeze({
      id: previewId,
      resourceIdentitySha256: resourceIdentity("render-postgres", previewId),
    });
    return Object.freeze({ preview, previewId });
  };

  const bindPreviewPostgresInventory = async (phase) => {
    const { previewId } = await bindPreviewPostgresResource(phase);
    const [connectionInfo, credentialPayload] = await Promise.all([
      renderRequest({
        role: "control",
        suffix: `/v1/postgres/${encodeURIComponent(previewId)}/connection-info`,
        phase,
      }),
      renderRequest({
        role: "control",
        suffix: `/v1/postgres/${encodeURIComponent(previewId)}/credentials`,
        phase,
      }),
    ]);
    const providerDatabase = parseProviderDatabaseIdentity(
      connectionInfo?.externalConnectionString,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    const inventory = providerPostgresCredentials(credentialPayload, phase);
    const usernames = inventory.map(({ username }) => username);
    const temporaryRoles = Object.values(credentials.postgresRoles);
    requireCondition(
      credentials.adminDatabase.host === providerDatabase.host
        && credentials.adminDatabase.port === providerDatabase.port
        && credentials.adminDatabase.database === providerDatabase.database
        && credentials.adminDatabase.user === providerDatabase.user
        && inventory.length === 1
        && new Set(usernames).size === inventory.length
        && inventory[0].username === credentials.adminDatabase.user
        && inventory[0].default === true
        && inventory.filter((entry) => entry.default).length === 1
        && temporaryRoles.every((role) => !usernames.includes(role)),
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    const inventorySha256 = sha256(canonicalJson(inventory));
    if (providerPostgresBaselineSha256 === undefined) {
      providerPostgresBaselineSha256 = inventorySha256;
    }
    requireCondition(
      inventorySha256 === providerPostgresBaselineSha256,
      "PREVIEW_POSTGRES_PROVIDER_INVENTORY_DRIFT",
      phase,
    );
    return Object.freeze({
      ...boundPreviewPostgres,
      inventorySha256,
      inventoryUnchanged: true,
    });
  };

  const verifyPostgresBootstrapPreflight = async (phase) => {
    const providerBinding = await bindPreviewPostgresInventory(phase);
    stableDatabaseOwner ??= await discoverStableDatabaseOwner(phase);
    const roles = Object.values(credentials.postgresRoles);
    const result = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase,
      sql: `
        SELECT
          current_user,
          role.rolcanlogin,
          role.rolcreaterole,
          role.rolcreatedb,
          NOT role.rolreplication,
          NOT role.rolbypassrls,
          pg_catalog.pg_has_role(
            current_user,
            ${sqlLiteral(stableDatabaseOwner)},
            'SET'
          ),
          current_setting('transaction_read_only') = 'on',
          NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles
            WHERE rolname IN (${roles.map(sqlLiteral).join(", ")})
          )
        FROM pg_catalog.pg_roles AS role
        WHERE role.rolname = current_user;
      `,
    });
    requireCondition(
      result === `${credentials.adminDatabase.user}|t|t|t|t|t|t|t|t`,
      "POSTGRES_BOOTSTRAP_PREFLIGHT_FAILED",
      phase,
    );
    await updateRecoveryJournal((current) => ({
      postgresAccess: {
        ...current.postgresAccess,
        providerInventorySha256: providerBinding.inventorySha256,
      },
    }));
    return Object.freeze({
      adminIdentitySha256: sha256(canonicalJson({
        database: credentials.adminDatabase.database,
        host: credentials.adminDatabase.host,
        port: credentials.adminDatabase.port,
        user: credentials.adminDatabase.user,
      })),
      providerInventorySha256: providerBinding.inventorySha256,
      providerInventoryUnchanged: true,
      stableOwnerSha256: sha256(stableDatabaseOwner),
    });
  };

  const verifySqlManagedPostgresRoles = async (phase) => {
    const roles = Object.values(credentials.postgresRoles);
    const result = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase,
      sql: `
        SELECT role.rolname || '|' || role.rolcanlogin::text
          || '|' || role.rolinherit::text
          || '|' || role.rolsuper::text
          || '|' || role.rolcreaterole::text
          || '|' || role.rolcreatedb::text
          || '|' || role.rolreplication::text
          || '|' || role.rolbypassrls::text
          || '|' || (role.rolvaliduntil > now() + interval '6 hours')::text
          || '|' || (role.rolvaliduntil <= now() + interval '13 hours')::text
          || '|' || COALESCE(membership.inherit_option, false)::text
          || '|' || COALESCE(membership.set_option, false)::text
        FROM pg_catalog.pg_roles AS role
        LEFT JOIN pg_catalog.pg_auth_members AS membership
          ON membership.member = role.oid
         AND membership.roleid = (
           SELECT oid FROM pg_catalog.pg_roles
           WHERE rolname = ${sqlLiteral(stableDatabaseOwner)}
         )
        WHERE role.rolname IN (${roles.map(sqlLiteral).join(", ")})
        ORDER BY role.rolname;
      `,
    });
    const expected = roles.slice().sort().map((role) => {
      const canSetOwner = role !== credentials.postgresRoles.control;
      return [
        role,
        "true",
        "false",
        "false",
        "false",
        "false",
        "false",
        "false",
        "true",
        "true",
        "false",
        String(canSetOwner),
      ].join("|");
    }).join("\n");
    requireCondition(result === expected, "POSTGRES_ROLE_BOUNDARY_INVALID", phase);
    await bindPreviewPostgresInventory(phase);
    return true;
  };

  const createSqlManagedPostgresRoles = async (phase) => {
    requireCondition(!postgresRolesCreated, "POSTGRES_ROLES_ALREADY_CREATED", phase);
    requireCondition(stableDatabaseOwner, "POSTGRES_STABLE_OWNER_REQUIRED", phase);
    const control = sqlIdentifier(credentials.postgresRoles.control, phase);
    const mutation = sqlIdentifier(credentials.postgresRoles.mutation, phase);
    const restore = sqlIdentifier(credentials.postgresRoles.restore, phase);
    const stableOwner = sqlIdentifier(stableDatabaseOwner, phase);
    const previewDatabase = sqlIdentifier(credentials.adminDatabase.database, phase);
    const roleSql = `
      BEGIN;
      CREATE ROLE ${control} LOGIN PASSWORD ${sqlLiteral(credentials.controlDatabase.password)}
        VALID UNTIL ${sqlLiteral(credentials.postgresValidUntil)}
        NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      CREATE ROLE ${mutation} LOGIN PASSWORD ${sqlLiteral(credentials.mutationDatabase.password)}
        VALID UNTIL ${sqlLiteral(credentials.postgresValidUntil)}
        NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      CREATE ROLE ${restore} LOGIN PASSWORD ${sqlLiteral(credentials.restoreDatabase.password)}
        VALID UNTIL ${sqlLiteral(credentials.postgresValidUntil)}
        NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      ALTER ROLE ${control} SET default_transaction_read_only = on;
      GRANT ${stableOwner} TO ${mutation} WITH INHERIT FALSE, SET TRUE;
      GRANT ${stableOwner} TO ${restore} WITH INHERIT FALSE, SET TRUE;
      GRANT CONNECT ON DATABASE ${previewDatabase} TO ${control}, ${mutation};
      GRANT USAGE ON SCHEMA public TO ${control};
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${control};
      COMMIT;
    `;
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase,
      readOnly: false,
      sensitiveSql: true,
      sql: roleSql,
    });
    postgresRolesCreated = true;
    await updateRecoveryJournal((current) => ({
      stage: "postgres-roles-created",
      postgresAccess: { ...current.postgresAccess, created: true },
    }));
    await verifySqlManagedPostgresRoles(phase);
  };

  const bindMutationCredentials = async () => {
    requireCondition(tools !== undefined, "TOOLCHAIN_PREFLIGHT_REQUIRED", "mutation-binding");
    const [
      cloudflareVerify,
      r2Token,
      renderUser,
      postgresProofs,
      previewPostgresBinding,
    ] = await Promise.all([
      cfRequest({
        role: "mutation",
        suffix: `/accounts/${config.cloudflareAccountId}/tokens/verify`,
        phase: "mutation-binding",
      }),
      credentials.mutation.get("r2ParentTokenId").use((tokenId) => cfRequest({
        role: "control",
        suffix: (
          `/accounts/${config.cloudflareAccountId}/tokens/${encodeURIComponent(tokenId)}`
        ),
        phase: "mutation-binding",
      })),
      renderRequest({
        role: "mutation",
        suffix: "/v1/users",
        phase: "mutation-binding",
      }),
      Promise.all(["control", "mutation"].map(async (kind) => {
        const role = credentials.postgresRoles[kind];
        const identity = kind === "mutation"
          ? credentials.mutationDatabase
          : credentials.controlDatabase;
        const observed = await pgQuery({
          commandRunner,
          psqlPath: tools.psqlPath,
          identity,
          phase: "mutation-binding",
          sql: "SELECT current_user || '|' || current_database();",
        });
        requireCondition(
          observed === `${role}|${identity.database}`,
          "POSTGRES_MUTATION_IDENTITY_MISMATCH",
          "mutation-binding",
        );
        return {
          kind,
          identitySha256: sha256(canonicalJson({
            database: identity.database,
            host: identity.host,
            passwordSha256: sha256(identity.password),
            port: identity.port,
            role,
          })),
          role,
        };
      })).then((proofs) => [
        ...proofs,
        {
          kind: "restore",
          identitySha256: sha256(canonicalJson({
            database: credentials.restoreDatabase.database,
            host: credentials.restoreDatabase.host,
            passwordSha256: sha256(credentials.restoreDatabase.password),
            port: credentials.restoreDatabase.port,
            role: credentials.postgresRoles.restore,
          })),
          role: credentials.postgresRoles.restore,
        },
      ]),
      bindPreviewPostgresInventory("mutation-binding"),
    ]);
    const cloudflareId = clean(cloudflareVerify?.result?.id).toLowerCase();
    const expectedCloudflareId = await credentials.mutation
      .get("cloudflareAccountTokenId").use(async (value) => value.toLowerCase());
    requireCondition(
      cloudflareId === expectedCloudflareId
        && cloudflareVerify?.result?.status === "active",
      "CLOUDFLARE_MUTATION_IDENTITY_MISMATCH",
      "mutation-binding",
    );
    const expectedR2Id = await credentials.mutation
      .get("r2ParentTokenId").use(async (value) => value.toLowerCase());
    requireCondition(
      clean(r2Token?.result?.id).toLowerCase() === expectedR2Id
        && clean(r2Token?.result?.status) === "active",
      "R2_MUTATION_IDENTITY_MISMATCH",
      "mutation-binding",
    );
    const [cloudflareScope, r2Scope, productionR2Denied] = await Promise.all([
      cloudflareMutationScopeProof(expectedCloudflareId, "mutation-binding"),
      r2MutationScopeProof(expectedR2Id, r2Token, "mutation-binding"),
      verifyR2ProductionDenied("mutation-binding", "mutation"),
    ]);
    const r2Objects = await listR2SyntheticObjects("mutation-binding", "mutation");
    requireCondition(
      cloudflareScope.accountBound === true
        && cloudflareScope.shortLived === true
        && r2Scope.bucketBound === true
        && r2Scope.policyReadWrite === true
        && r2Scope.shortLived === true
        && productionR2Denied === true
        && r2Objects.length === 0,
      "MUTATION_SCOPE_INVALID",
      "mutation-binding",
    );
    const r2CredentialIdentitySha256 = r2MutationCredentialIdentitySha256(expectedR2Id);
    const r2PreviewReadOperationSha256 = sha256(canonicalJson({
      bucket: PREVIEW_R2,
      credentialIdentitySha256: r2CredentialIdentitySha256,
      method: "GET",
      objectCount: r2Objects.length,
      prefix: r2Prefix,
      productionAccessDenied: productionR2Denied,
      status: 200,
    }));
    await updateRecoveryJournal((current) => ({
      stage: "mutation-r2-preview-read-proven",
      preflightProofs: {
        ...current.preflightProofs,
        r2PreviewRead: {
          credentialIdentitySha256: r2CredentialIdentitySha256,
          credentialBoundarySha256: recoveryBoundarySha256,
          operationSha256: r2PreviewReadOperationSha256,
        },
      },
    }));
    await preparePostgresOwnershipBoundary("mutation-binding");
    const renderIdentity = currentRenderUser(renderUser, "mutation-binding");
    const renderUserId = requireText(
      renderIdentity?.id,
      "RENDER_MUTATION_IDENTITY_MISMATCH",
      "mutation-binding",
    );
    const renderTokenSha256 = sha256(canonicalJson({
      access: credentials.mutation.get("renderAccessToken")
        .digest("quantgym-phase2-render-oauth-access"),
      expiresAt: credentials.mutationRenderExpiresAt,
      fileIdentitySha256: credentials.mutationRenderFileIdentitySha256,
      fileMtime: credentials.mutationRenderFileMtime,
      issuedAt: credentials.mutationRenderIssuedAt,
      kind: "render-cli-oauth-v1",
      refresh: credentials.mutation.get("renderRefreshToken")
        .digest("quantgym-phase2-render-oauth-refresh"),
    }));
    const postgresIdentitySha256 = sha256(canonicalJson(
      postgresProofs.map(({ kind, identitySha256, role }) => ({
        kind,
        identitySha256,
        roleSha256: sha256(role),
      })),
    ));
    const bindings = Object.freeze({
      cloudflare: Object.freeze({
        identitySha256: sha256(canonicalJson({
          policySha256: cloudflareScope.policySha256,
          tokenIdentitySha256: cloudflareScope.tokenIdentitySha256,
          validitySha256: cloudflareScope.validitySha256,
        })),
        selfIdentityVerified: true,
      }),
      render: Object.freeze({
        identitySha256: sha256(
          `render-oauth-bearer\0${renderUserId}\0${renderTokenSha256}`,
        ),
        selfIdentityVerified: true,
      }),
      postgres: Object.freeze({
        identitySha256: sha256(canonicalJson({
          postgresIdentitySha256,
          resourceIdentitySha256: previewPostgresBinding.resourceIdentitySha256,
        })),
        selfIdentityVerified: true,
      }),
      r2: Object.freeze({
        identitySha256: sha256(canonicalJson({
          accessId: expectedR2Id,
          accessSecret: credentials.mutation
            .get("r2SecretAccessKey").digest("quantgym-phase2-r2-secret"),
          credentialKind: "cloudflare-r2-account-token-v1",
          credentialIdentitySha256: r2CredentialIdentitySha256,
          policySha256: r2Scope.policySha256,
          productionAccessDenied: productionR2Denied,
          validitySha256: r2Scope.validitySha256,
        })),
        selfIdentityVerified: true,
      }),
    });
    requireCondition(
      new Set(Object.values(bindings).map(({ identitySha256 }) => identitySha256)).size === 4,
      "MUTATION_IDENTITY_OVERLAP",
      "mutation-binding",
    );
    mutationTokenBindings = bindings;
    return bindings;
  };

  const waitForRenderCommit = async (serviceId, deployId, commit, phase) => {
    const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const payload = await renderRequest({
        role: "control",
        suffix: `/v1/services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deployId)}`,
        phase,
      });
      const deploy = parseRenderDeploy(payload, phase);
      requireCondition(deploy.commit === commit, "RENDER_DEPLOY_COMMIT_MISMATCH", phase);
      if (deploy.status === "live") return deploy;
      requireCondition(
        !new Set([
          "build_failed",
          "canceled",
          "deactivated",
          "pre_deploy_failed",
          "update_failed",
        ]).has(deploy.status),
        "RENDER_DEPLOY_FAILED",
        phase,
      );
      await delay(POLL_INTERVAL_MS);
    }
    fail("RENDER_DEPLOY_TIMEOUT", phase);
  };

  const listPagesDeployments = async (projectName, phase) => {
    const perPage = 25;
    const deployments = [];
    const ids = new Set();
    for (let page = 1; page <= 100; page += 1) {
      const payload = await cfRequest({
        role: "control",
        suffix: (
          `/accounts/${config.cloudflareAccountId}`
          + `/pages/projects/${encodeURIComponent(projectName)}`
          + `/deployments?page=${page}&per_page=${perPage}`
        ),
        phase,
      });
      requireCondition(
        Array.isArray(payload?.result),
        "CLOUDFLARE_PAGES_DEPLOYMENTS_INVALID",
        phase,
      );
      for (const value of payload.result) {
        const facts = pagesDeploymentFacts(value, phase);
        requireCondition(
          !ids.has(facts.id),
          "CLOUDFLARE_PAGES_DEPLOYMENTS_INVALID",
          phase,
        );
        ids.add(facts.id);
        deployments.push(facts);
      }
      const totalPages = Number(payload?.result_info?.total_pages);
      if (
        (Number.isSafeInteger(totalPages) && totalPages >= 1 && page >= totalPages)
        || (!Number.isSafeInteger(totalPages) && payload.result.length < perPage)
      ) return deployments;
    }
    fail("CLOUDFLARE_PAGES_DEPLOYMENTS_INVALID", phase);
  };

  const observeProductionCandidateSkip = async (expectedCommit, phase) => {
    const deadline = Date.now() + 2 * 60 * 1_000;
    let previousFacts;
    while (Date.now() < deadline) {
      const deployments = await listPagesDeployments(PRODUCTION_PAGES, phase);
      let facts;
      try {
        facts = candidateSkipFacts(deployments, expectedCommit, phase);
      } catch (error) {
        if (
          error instanceof Phase2OperatorError
          && error.code === "PRODUCTION_CANDIDATE_DEPLOYMENT_DETECTED"
          && deployments.every((deployment) => deployment.commit !== expectedCommit)
        ) {
          await delay(2_000);
          continue;
        }
        throw error;
      }
      if (previousFacts && canonicalJson(previousFacts) === canonicalJson(facts)) {
        return Object.freeze({ deployments, facts });
      }
      previousFacts = facts;
      await delay(2_000);
    }
    fail("PRODUCTION_CANDIDATE_SKIP_OBSERVATION_TIMEOUT", phase);
  };

  const readTopology = async (phase, { controlOnly = false } = {}) => {
    requireCondition(tools !== undefined, "TOOLCHAIN_PREFLIGHT_REQUIRED", phase);
    const expectedCommit = requireText(
      candidateGateState?.expectedCommit,
      "CANDIDATE_GATE_REQUIRED",
      phase,
      SHA_PATTERN,
    );
    const account = config.cloudflareAccountId;
    const [
      previewPagesPayload,
      productionPagesPayload,
      productionSkipObservation,
      previewR2Payload,
      productionR2Payload,
      services,
      environmentGroups,
      postgres,
    ] = await Promise.all([
      cfRequest({
        role: "control",
        suffix: `/accounts/${account}/pages/projects/${PREVIEW_PAGES}`,
        phase,
      }),
      cfRequest({
        role: "control",
        suffix: `/accounts/${account}/pages/projects/${PRODUCTION_PAGES}`,
        phase,
      }),
      observeProductionCandidateSkip(expectedCommit, phase),
      cfRequest({
        role: "control",
        suffix: `/accounts/${account}/r2/buckets/${PREVIEW_R2}`,
        phase,
      }),
      cfRequest({
        role: "control",
        suffix: `/accounts/${account}/r2/buckets/${PRODUCTION_R2}`,
        phase,
      }),
      renderList("/v1/services", "service", phase),
      renderList("/v1/env-groups", "envGroup", phase),
      renderList("/v1/postgres", "postgres", phase),
    ]);
    const previewPages = previewPagesPayload?.result;
    const productionPages = productionPagesPayload?.result;
    const productionPagesDeployments = productionSkipObservation.deployments;
    const previewR2 = previewR2Payload?.result;
    const productionR2 = productionR2Payload?.result;
    const previewApi = selectUnique(
      services,
      (entry) => entry?.name === PREVIEW_API,
      "PREVIEW_API_NOT_UNIQUE",
      phase,
    );
    const productionApi = selectUnique(
      services,
      (entry) => entry?.name === PRODUCTION_API,
      "PRODUCTION_API_NOT_UNIQUE",
      phase,
    );
    const previewLlm = selectUnique(
      services,
      (entry) => entry?.name === PREVIEW_LLM,
      "PREVIEW_LLM_NOT_UNIQUE",
      phase,
    );
    const productionLlm = selectUnique(
      services,
      (entry) => entry?.name === PRODUCTION_LLM,
      "PRODUCTION_LLM_NOT_UNIQUE",
      phase,
    );
    const previewPostgres = selectUnique(
      postgres,
      (entry) => entry?.name === PREVIEW_POSTGRES,
      "PREVIEW_POSTGRES_NOT_UNIQUE",
      phase,
    );
    const productionPostgres = selectUnique(
      postgres,
      (entry) => entry?.name === PRODUCTION_POSTGRES,
      "PRODUCTION_POSTGRES_NOT_UNIQUE",
      phase,
    );
    requireCondition(
      previewPages?.name === PREVIEW_PAGES
        && productionPages?.name === PRODUCTION_PAGES
        && previewR2?.name === PREVIEW_R2
        && productionR2?.name === PRODUCTION_R2
        && normalizeRepository(previewApi.repo) === REPOSITORY_URL.toLowerCase()
        && normalizeRepository(previewLlm.repo) === REPOSITORY_URL.toLowerCase()
        && normalizeRepository(productionApi.repo) === REPOSITORY_URL.toLowerCase()
        && normalizeRepository(productionLlm.repo) === REPOSITORY_URL.toLowerCase()
        && previewApi.branch === BRANCH
        && previewLlm.branch === BRANCH
        && productionApi.branch === "main"
        && productionLlm.branch === "main"
        && previewApi.autoDeploy === "no"
        && previewLlm.autoDeploy === "no"
        && renderVisibility(previewApi, "TOPOLOGY_CONTROL_INVALID", phase) === "public"
        && renderVisibility(previewLlm, "TOPOLOGY_CONTROL_INVALID", phase) === "internal"
        && renderVisibility(productionApi, "TOPOLOGY_CONTROL_INVALID", phase) === "public"
        && renderVisibility(productionLlm, "TOPOLOGY_CONTROL_INVALID", phase) === "internal"
        && previewPages.source?.type === "github"
        && previewPages.source?.config?.owner === "garymmmjw"
        && previewPages.source?.config?.repo_name === "QuantGym"
        && previewPages.source?.config?.production_branch === BRANCH
        && previewPages.source?.config?.production_deployments_enabled === false
        && previewPages.source?.config?.preview_deployment_setting === "none"
        && productionPages.source?.type === "github"
        && productionPages.source?.config?.owner === "garymmmjw"
        && productionPages.source?.config?.repo_name === "QuantGym"
        && productionPages.source?.config?.production_branch === "main",
      "TOPOLOGY_CONTROL_INVALID",
      phase,
    );
    const previewPagesDeploy = pagesDeploymentFacts(
      previewPages.canonical_deployment,
      phase,
    );
    const productionPagesDeploy = pagesDeploymentFacts(
      productionPages.canonical_deployment,
      phase,
    );
    const [
      previewApiDeploy,
      previewLlmDeploy,
      productionApiDeploy,
      productionLlmDeploy,
      revision,
      previewConnectionInfo,
    ] = await Promise.all([
      currentRenderDeploy(previewApi.id, phase),
      currentRenderDeploy(previewLlm.id, phase),
      currentRenderDeploy(productionApi.id, phase),
      currentRenderDeploy(productionLlm.id, phase),
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: postgresReadIdentity(),
        phase,
      }),
      renderRequest({
        role: "control",
        suffix: `/v1/postgres/${encodeURIComponent(previewPostgres.id)}/connection-info`,
        phase,
      }),
    ]);
    const providerDatabase = parseProviderDatabaseIdentity(
      previewConnectionInfo?.externalConnectionString,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    const operatorDatabases = controlOnly
      ? [credentials.controlDatabase]
      : [
        credentials.controlDatabase,
        credentials.mutationDatabase,
        credentials.restoreDatabase,
        credentials.adminDatabase,
      ];
    requireCondition(
      operatorDatabases.every((identity) => (
        identity.host === providerDatabase.host
        && identity.port === providerDatabase.port
      ))
        && credentials.controlDatabase.database === providerDatabase.database
        && credentials.mutationDatabase.database === providerDatabase.database
        && credentials.adminDatabase.user === providerDatabase.user
        && boundPreviewPostgres?.id === previewPostgres.id
        && boundPreviewPostgres?.resourceIdentitySha256
          === resourceIdentity("render-postgres", previewPostgres.id)
        && productionPostgres.id !== previewPostgres.id,
      "PREVIEW_POSTGRES_BINDING_INVALID",
      phase,
    );
    requireCondition(
      previewPagesDeploy.status === "success"
        && previewPagesDeploy.environment === "production"
        && previewPagesDeploy.branch === BRANCH
        && productionPagesDeploy.status === "success"
        && productionPagesDeploy.environment === "production"
        && productionPagesDeploy.branch === "main"
        && previewApiDeploy.status === "live"
        && previewLlmDeploy.status === "live"
        && productionApiDeploy.status === "live"
        && productionLlmDeploy.status === "live",
      "DEPLOYMENT_ANCHOR_INVALID",
      phase,
    );
    const resources = {
      pages: {
        ...PHASE2_RESOURCE_CONTRACT.pages,
        identitySha256: resourceIdentity("cloudflare-pages", previewPages.id),
      },
      api: {
        ...PHASE2_RESOURCE_CONTRACT.api,
        identitySha256: resourceIdentity("render-service", previewApi.id),
      },
      llm: {
        ...PHASE2_RESOURCE_CONTRACT.llm,
        identitySha256: resourceIdentity("render-service", previewLlm.id),
      },
      postgres: {
        ...PHASE2_RESOURCE_CONTRACT.postgres,
        identitySha256: resourceIdentity("render-postgres", previewPostgres.id),
      },
      r2: {
        ...PHASE2_RESOURCE_CONTRACT.r2,
        identitySha256: resourceIdentity("cloudflare-r2", previewR2.name),
      },
      productionPages: {
        ...PHASE2_RESOURCE_CONTRACT.productionPages,
        identitySha256: resourceIdentity("cloudflare-pages", productionPages.id),
      },
      productionApi: {
        ...PHASE2_RESOURCE_CONTRACT.productionApi,
        identitySha256: resourceIdentity("render-service", productionApi.id),
      },
      productionLlm: {
        ...PHASE2_RESOURCE_CONTRACT.productionLlm,
        identitySha256: resourceIdentity("render-service", productionLlm.id),
      },
      productionPostgres: {
        ...PHASE2_RESOURCE_CONTRACT.productionPostgres,
        identitySha256: resourceIdentity("render-postgres", productionPostgres.id),
      },
      productionR2: {
        ...PHASE2_RESOURCE_CONTRACT.productionR2,
        identitySha256: resourceIdentity("cloudflare-r2", productionR2.name),
      },
    };
    const candidateRecords = productionSkipObservation.facts;
    const successfulProductionDeployments = productionPagesDeployments
      .filter((deployment) => deployment.status === "success")
      .map((deployment) => ({
        branch: deployment.branch,
        commit: deployment.commit,
        environment: deployment.environment,
        id: deployment.id,
        status: deployment.status,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const candidateCommitSkippedRecordCount = candidateRecords.filter(
      pagesDeploymentWasSkipped,
    ).length;
    const candidateCommitStartedRecordCount = candidateRecords.filter(
      (deployment) => deployment.stages.some((stage) => (
        stage.startedOn !== "" || stage.status !== "idle"
      )),
    ).length;
    const candidateCommitAliasedRecordCount = candidateRecords.filter(
      (deployment) => deployment.aliases.length > 0,
    ).length;
    const candidateCommitActiveDeploymentCount = candidateRecords.filter(
      (deployment) => (
        deployment.id === productionPagesDeploy.id
        || deployment.status === "success"
      ),
    ).length;
    requireCondition(
      candidateCommitSkippedRecordCount === candidateRecords.length
        && candidateRecords.length >= 1
        && candidateCommitStartedRecordCount === 0
        && candidateCommitAliasedRecordCount === 0
        && candidateCommitActiveDeploymentCount === 0,
      "PRODUCTION_CANDIDATE_DEPLOYMENT_DETECTED",
      phase,
    );
    const productionAnchor = {
      pagesDeploymentCommit: productionPagesDeploy.commit,
      pagesResourceIdentitySha256: resources.productionPages.identitySha256,
      pagesConfigurationSha256: sha256(canonicalJson(pagesConfiguration(productionPages))),
      pagesSuccessfulDeploymentSetSha256: sha256(canonicalJson(
        successfulProductionDeployments,
      )),
      pagesEnvironment: productionPagesDeploy.environment,
      pagesBranch: productionPagesDeploy.branch,
      pagesAutomaticDeploysEnabled: (
        productionPages.source?.config?.production_deployments_enabled === true
      ),
      pagesLive: true,
      candidateCommitChecked: expectedCommit,
      candidateCommitRecordCount: candidateRecords.length,
      candidateCommitSkippedRecordCount,
      candidateCommitStartedRecordCount,
      candidateCommitAliasedRecordCount,
      candidateCommitActiveDeploymentCount,
      services: [
        [productionApi, productionApiDeploy, resources.productionApi],
        [productionLlm, productionLlmDeploy, resources.productionLlm],
      ].map(([service, deploy, resource]) => ({
        name: service.name,
        identitySha256: resource.identitySha256,
        configurationSha256: sha256(canonicalJson(renderServiceConfiguration(service))),
        repository: REPOSITORY,
        branch: service.branch,
        visibility: renderVisibility(service, "TOPOLOGY_CONTROL_INVALID", phase),
        automaticDeploysEnabled: automaticDeploysEnabled(service.autoDeploy),
        liveDeploymentCommit: deploy.commit,
        live: true,
      })),
      postgresControlSha256: sha256(canonicalJson({
        id: productionPostgres.id,
        name: productionPostgres.name,
        plan: productionPostgres.plan,
        status: productionPostgres.status,
        version: (
          productionPostgres.version
          ?? productionPostgres.postgresVersion
          ?? productionPostgres.majorVersion
        ),
      })),
      r2ControlSha256: sha256(canonicalJson({
        jurisdiction: productionR2.jurisdiction ?? "default",
        name: productionR2.name,
      })),
      environmentGroupsControlSha256: sha256(canonicalJson(
        environmentGroups
          .filter((group) => {
            const serviceIds = group?.serviceIds ?? group?.service_ids ?? [];
            return Array.isArray(serviceIds) && serviceIds.some((id) => (
              id === productionApi.id || id === productionLlm.id
            ));
          })
          .map((group) => ({
            id: group.id,
            name: group.name,
            serviceIds: [...(group.serviceIds ?? group.service_ids ?? [])].sort(),
          }))
          .sort((left, right) => String(left.id).localeCompare(String(right.id))),
      )),
    };
    const previewAnchor = {
      pagesDeploymentCommit: previewPagesDeploy.commit,
      apiDeploymentCommit: previewApiDeploy.commit,
      llmDeploymentCommit: previewLlmDeploy.commit,
      llmResourceIdentitySha256: resources.llm.identitySha256,
      llmConfigurationSha256: sha256(canonicalJson(renderServiceConfiguration(previewLlm))),
      llmRepository: REPOSITORY,
      llmBranch: previewLlm.branch,
      llmVisibility: renderVisibility(previewLlm, "TOPOLOGY_CONTROL_INVALID", phase),
      llmAutomaticDeploysEnabled: automaticDeploysEnabled(previewLlm.autoDeploy),
      llmLive: previewLlmDeploy.status === "live",
      databaseRevision: revision,
    };
    const deploymentControls = {
      pagesAutomaticDeploysDisabled: true,
      apiAutomaticDeploysDisabled: true,
      llmAutomaticDeploysDisabled: true,
      evidenceSha256: sha256(canonicalJson({
        pages: {
          productionDeploymentsEnabled: (
            previewPages.source.config.production_deployments_enabled
          ),
          previewDeploymentSetting: (
            previewPages.source.config.preview_deployment_setting
          ),
        },
        api: { autoDeploy: previewApi.autoDeploy },
        llm: { autoDeploy: previewLlm.autoDeploy },
      })),
    };
    const topologyReceipt = receipt("topology", {
      resources,
      productionAnchor,
      previewAnchor,
      deploymentControls,
    });
    topologyState ??= {
      previewApi: {
        deploy: previewApiDeploy,
        id: previewApi.id,
      },
      previewLlm: {
        deploy: previewLlmDeploy,
        id: previewLlm.id,
      },
      previewPostgres: {
        id: previewPostgres.id,
      },
      previewPages: {
        deploy: previewPagesDeploy,
        id: previewPages.id,
      },
      resources,
    };
    topologyState.latestReceipt = topologyReceipt;
    return topologyReceipt;
  };

  const candidateGate = async (context) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "candidate-gate",
    );
    const expectedCommit = requireText(
      context.expectedCommit,
      "EXPECTED_COMMIT_INVALID",
      "candidate-gate",
      SHA_PATTERN,
    );
    const evidenceHeadCommit = config.evidenceHeadCommit;
    requireCondition(
      evidenceHeadCommit !== expectedCommit,
      "EVIDENCE_HEAD_INVALID",
      "candidate-gate",
    );
    candidateGateState = Object.freeze({
      applicationCommit: expectedCommit,
      evidenceHeadCommit,
      expectedCommit,
      pending: true,
    });
    await initializeRecoveryJournal(expectedCommit);
    let evidenceOutputs;
    let evidenceManifestSha256;
    let phase1EvidenceLockSha256;
    try {
      const [manifestBytes, phase1EvidenceLockBytes] = await Promise.all([
        readFile(path.join(
          resolvedRoot,
          "docs/frontend-upgrade/phase-2-acceptance-manifest.json",
        )),
        readFile(path.join(
          resolvedRoot,
          "docs/frontend-upgrade/phase-1-evidence-lock.json",
        )),
      ]);
      const manifest = JSON.parse(manifestBytes.toString("utf8"));
      evidenceOutputs = manifest?.evidenceOutputs;
      evidenceManifestSha256 = sha256(manifestBytes);
      phase1EvidenceLockSha256 = sha256(phase1EvidenceLockBytes);
    } catch {
      fail("EVIDENCE_MANIFEST_INVALID", "candidate-gate");
    }
    requireCondition(
      Array.isArray(evidenceOutputs)
        && evidenceOutputs.length === 30
        && evidenceOutputs.length === new Set(evidenceOutputs).size
        && evidenceOutputs.every((entry) => (
          /^docs\/browser-audit-screenshots\/390-frontend-upgrade-phase-2-/u.test(entry)
          && !entry.includes("..")
        )),
      "EVIDENCE_MANIFEST_INVALID",
      "candidate-gate",
    );
    const [
      head,
      branch,
      remote,
      tracked,
      index,
      untracked,
      branchPayload,
      applicationCommitPayload,
      evidenceCommitPayload,
      pullRequest,
      checkRuns,
    ] = await Promise.all([
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["rev-parse", "HEAD"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["branch", "--show-current"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["remote", "get-url", "origin"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["diff", "--quiet", "--"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        acceptedExitCodes: [0, 1],
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["diff", "--cached", "--quiet", "--"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        acceptedExitCodes: [0, 1],
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["ls-files", "--others", "--exclude-standard", "-z"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      githubRequest(
        `/repos/${REPOSITORY}/branches/${encodeURIComponent(BRANCH)}`,
        "candidate-gate",
      ),
      githubRequest(
        `/repos/${REPOSITORY}/commits/${expectedCommit}`,
        "candidate-gate",
      ),
      githubRequest(
        `/repos/${REPOSITORY}/commits/${evidenceHeadCommit}`,
        "candidate-gate",
      ),
      githubRequest(
        `/repos/${REPOSITORY}/pulls/${PULL_REQUEST_NUMBER}`,
        "candidate-gate",
      ),
      githubRequest(
        `/repos/${REPOSITORY}/commits/${evidenceHeadCommit}/check-runs?per_page=100`,
        "candidate-gate",
      ),
    ]);
    const [ancestorChecks, applicationToEvidence, evidenceDiff, evidenceTree] = await Promise.all([
      Promise.all(PHASE2_REQUIRED_ANCESTOR_COMMITS.map((ancestor) => runSafeCommand(
        commandRunner,
        {
          file: "/usr/bin/git",
          args: ["merge-base", "--is-ancestor", ancestor, expectedCommit],
          cwd: resolvedRoot,
          env: TRUSTED_GIT_ENV,
          acceptedExitCodes: [0, 1],
        },
        "LOCAL_GIT_CHECK_FAILED",
        "candidate-gate",
      ))),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["merge-base", "--is-ancestor", expectedCommit, evidenceHeadCommit],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        acceptedExitCodes: [0, 1],
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["diff", "--name-status", "-z", expectedCommit, evidenceHeadCommit, "--"],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["ls-tree", "-r", "-z", evidenceHeadCommit, "--", ...evidenceOutputs],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        maxBytes: 1024 * 1024,
      }, "LOCAL_GIT_CHECK_FAILED", "candidate-gate"),
    ]);
    const localHeadCommit = clean(head.stdout).toLowerCase();
    const remoteHeadCommit = clean(branchPayload?.commit?.sha).toLowerCase();
    const untrackedPaths = parseGitStatusPaths(untracked.stdout);
    const allowedUntrackedOnly = untrackedPaths.every((entry) => (
      ALLOWED_UNTRACKED_PATHS.includes(entry)
    ));
    const applicationCommitMessage = clean(applicationCommitPayload?.commit?.message);
    const evidenceCommitMessage = clean(evidenceCommitPayload?.commit?.message);
    const diffFields = evidenceDiff.stdout.split("\0").filter(Boolean);
    const changedEvidencePaths = [];
    for (let index = 0; index < diffFields.length; index += 2) {
      requireCondition(
        diffFields[index] === "A" && typeof diffFields[index + 1] === "string",
        "EVIDENCE_SUCCESSOR_INVALID",
        "candidate-gate",
      );
      changedEvidencePaths.push(diffFields[index + 1]);
    }
    const treePaths = evidenceTree.stdout.split("\0").filter(Boolean).map((entry) => {
      const match = /^100644 blob [0-9a-f]{40}\t(.+)$/u.exec(entry);
      requireCondition(match !== null, "EVIDENCE_SUCCESSOR_INVALID", "candidate-gate");
      return match[1];
    });
    const expectedEvidencePaths = [...evidenceOutputs].sort();
    requireCondition(
      canonicalJson(changedEvidencePaths.sort()) === canonicalJson(expectedEvidencePaths)
        && canonicalJson(treePaths.sort()) === canonicalJson(expectedEvidencePaths),
      "EVIDENCE_SUCCESSOR_INVALID",
      "candidate-gate",
    );
    const componentNames = [
      "contract",
      "visual",
      "accessibility",
      "journeys",
      "recovery",
      "performance",
    ];
    const componentPaths = componentNames.map((name) => (
      `docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-${name}-summary.json`
    ));
    const summaryPaths = [
      ...componentPaths,
      "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-summary.json",
      "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-review-receipt.json",
    ];
    const [summarySources, workflowSource, ciContractSource] = await Promise.all([
      Promise.all(summaryPaths.map((relativePath) => (
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: ["show", `${evidenceHeadCommit}:${relativePath}`],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        maxBytes: MAX_HTTP_BYTES,
      }, "EVIDENCE_SUMMARY_INVALID", "candidate-gate")
      ))),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: [
          "show",
          `${evidenceHeadCommit}:.github/workflows/frontend-v2-preview.yml`,
        ],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        maxBytes: MAX_HTTP_BYTES,
      }, "EVIDENCE_WORKFLOW_INVALID", "candidate-gate"),
      runSafeCommand(commandRunner, {
        file: "/usr/bin/git",
        args: [
          "show",
          `${evidenceHeadCommit}:tests/frontend-upgrade-phase2-ci-contract.test.mjs`,
        ],
        cwd: resolvedRoot,
        env: TRUSTED_GIT_ENV,
        maxBytes: MAX_HTTP_BYTES,
      }, "EVIDENCE_WORKFLOW_INVALID", "candidate-gate"),
    ]);
    let summaries;
    try {
      summaries = summarySources.map(({ stdout }) => JSON.parse(stdout));
    } catch {
      fail("EVIDENCE_SUMMARY_INVALID", "candidate-gate");
    }
    const [componentSummaries, aggregateSummary, visualReceipt] = [
      summaries.slice(0, 6),
      summaries[6],
      summaries[7],
    ];
    const componentSummarySha256 = Object.fromEntries(
      componentNames.map((name, index) => [name, sha256(summarySources[index].stdout)]),
    );
    const visualReceiptSha256 = sha256(summarySources[7].stdout);
    requireCondition(
      componentSummaries.every((summary) => (
        summary?.commit === expectedCommit
        && summary?.manifestSha256 === evidenceManifestSha256
        && summary?.phase1EvidenceLockSha256 === phase1EvidenceLockSha256
      ))
        && aggregateSummary?.commit === expectedCommit
        && aggregateSummary?.manifestSha256 === evidenceManifestSha256
        && aggregateSummary?.phase1EvidenceLockSha256 === phase1EvidenceLockSha256
        && canonicalJson(aggregateSummary?.hashes?.componentSummarySha256)
          === canonicalJson(componentSummarySha256)
        && aggregateSummary?.hashes?.visualReviewReceiptSha256
          === visualReceiptSha256
        && visualReceipt?.applicationCommit === expectedCommit
        && visualReceipt?.manifestSha256 === evidenceManifestSha256
        && visualReceipt?.phase1EvidenceLockSha256 === phase1EvidenceLockSha256,
      "EVIDENCE_SUMMARY_INVALID",
      "candidate-gate",
    );
    const requiredCheckNames = ["Node and browser gates", "Python API and migration gates"];
    const selectedCheckSet = selectLatestEvidenceCheckSet(
      checkRuns,
      evidenceHeadCommit,
      requiredCheckNames,
    );
    const completedChecks = selectedCheckSet.checks;
    const evidenceCheckSuiteId = selectedCheckSet.checkSuiteId;
    const workflowRunIds = [selectedCheckSet.workflowRunId];
    const workflowRuns = await Promise.all(workflowRunIds.map((runId) => (
      githubRequest(`/repos/${REPOSITORY}/actions/runs/${runId}`, "candidate-gate")
    )));
    requireCondition(
      workflowRuns.every((run, index) => isEvidenceWorkflowRunIdentity(
        run,
        evidenceHeadCommit,
        evidenceCheckSuiteId,
        workflowRunIds[index],
      ))
        && workflowSource.stdout.includes("Node and browser gates")
        && workflowSource.stdout.includes("Python API and migration gates")
        && workflowSource.stdout.includes("pull_request")
        && ciContractSource.stdout.includes("frontend-v2-preview.yml"),
      "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
      "candidate-gate",
    );
    const [applicationSkip, evidenceSkip] = await Promise.all([
      observeProductionCandidateSkip(expectedCommit, "candidate-gate"),
      observeProductionCandidateSkip(evidenceHeadCommit, "candidate-gate"),
    ]);
    const details = {
      repository: REPOSITORY,
      pullRequestNumber: PULL_REQUEST_NUMBER,
      branch: clean(branch.stdout),
      applicationCommit: expectedCommit,
      evidenceHeadCommit,
      localHeadCommit,
      remoteHeadCommit,
      trackedWorktreeClean: tracked.exitCode === 0,
      indexClean: index.exitCode === 0,
      allowedUntrackedOnly,
      requiredAncestorCommits: [...PHASE2_REQUIRED_ANCESTOR_COMMITS],
      allRequiredAncestorsPresent: ancestorChecks.every((entry) => entry.exitCode === 0),
      pullRequestState: clean(pullRequest?.state),
      pullRequestDraft: pullRequest?.draft === true,
      pullRequestMerged: pullRequest?.merged_at !== null,
      pullRequestHeadCommit: clean(pullRequest?.head?.sha).toLowerCase(),
      applicationCommitMessageSha256: sha256(applicationCommitMessage),
      evidenceCommitMessageSha256: sha256(evidenceCommitMessage),
      applicationCloudflarePagesSkipDirectivePresent: (
        applicationCommitMessage.includes("[CF-Pages-Skip]")
      ),
      evidenceCloudflarePagesSkipDirectivePresent: (
        evidenceCommitMessage.includes("[CF-Pages-Skip]")
      ),
      evidenceOutputCount: evidenceOutputs.length,
      evidenceSuccessorOnly: true,
      evidenceHeadCiGreen: true,
      workflowSha256: sha256(workflowSource.stdout),
      ciContractSha256: sha256(ciContractSource.stdout),
      workflowRunIdentitySha256: sha256(canonicalJson(workflowRuns.map((run) => ({
        id: run.id,
        runAttempt: run.run_attempt,
        workflowId: run.workflow_id,
      })))),
      applicationPagesSkipRecordCount: applicationSkip.facts.length,
      evidencePagesSkipRecordCount: evidenceSkip.facts.length,
      pagesSkipObservationSha256: sha256(canonicalJson({
        application: applicationSkip.facts,
        evidence: evidenceSkip.facts,
      })),
    };
    requireCondition(
      normalizeRepository(remote.stdout) === REPOSITORY_URL.toLowerCase()
        && details.branch === BRANCH
        && localHeadCommit === evidenceHeadCommit
        && remoteHeadCommit === evidenceHeadCommit
        && clean(applicationCommitPayload?.sha).toLowerCase() === expectedCommit
        && clean(evidenceCommitPayload?.sha).toLowerCase() === evidenceHeadCommit
        && applicationToEvidence.exitCode === 0
        && details.trackedWorktreeClean
        && details.indexClean
        && details.allowedUntrackedOnly
        && details.allRequiredAncestorsPresent
        && pullRequest?.head?.ref === BRANCH
        && normalizeRepository(pullRequest?.head?.repo?.html_url) === REPOSITORY_URL.toLowerCase()
        && details.pullRequestState === "open"
        && details.pullRequestDraft
        && details.pullRequestMerged === false
        && details.pullRequestHeadCommit === evidenceHeadCommit
        && details.applicationCloudflarePagesSkipDirectivePresent
        && details.evidenceCloudflarePagesSkipDirectivePresent,
      "CANDIDATE_GATE_FAILED",
      "candidate-gate",
    );
    const proof = receipt("candidate-gate", details);
    candidateGateState = Object.freeze({
      applicationCommit: expectedCommit,
      evidenceHeadCommit,
      expectedCommit,
      proof,
    });
    return proof;
  };

  const inspectTopology = async (context) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "topology",
    );
    const point = context.point === "after" ? "after" : "before";
    const topology = await readTopology(`topology-${point}`);
    if (point === "before" && recoveryJournal?.baseline === null) {
      await updateRecoveryJournal({
        stage: "topology-before",
        baseline: {
          previewApi: structuredClone(topologyState.previewApi),
          previewLlm: structuredClone(topologyState.previewLlm),
          previewPages: structuredClone(topologyState.previewPages),
          previewPostgres: structuredClone(topologyState.previewPostgres),
          resources: structuredClone(topology.details.resources),
          productionAnchor: structuredClone(topology.details.productionAnchor),
          previewAnchor: structuredClone(topology.details.previewAnchor),
        },
      });
    } else if (point === "after") {
      await updateRecoveryJournal({ stage: "topology-after" });
    }
    return topology;
  };

  const inspectPullRequest = async (context) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "pull-request",
    );
    const value = await githubRequest(
      `/repos/${REPOSITORY}/pulls/${PULL_REQUEST_NUMBER}`,
      "pull-request",
    );
    return receipt("pull-request", {
      repository: REPOSITORY,
      number: PULL_REQUEST_NUMBER,
      state: clean(value?.state),
      draft: value?.draft === true,
      merged: value?.merged_at !== null,
      headCommit: clean(value?.head?.sha).toLowerCase(),
    });
  };

  const requireMutation = (context, phase) => {
    requireCondition(
      preflightComplete || context?.recovery === true,
      "OPERATOR_PREFLIGHT_REQUIRED",
      phase,
    );
    assertCredentialRole(
      context,
      credentials.descriptors.mutation,
      "MUTATION_CREDENTIAL_ROLE_REQUIRED",
      phase,
    );
  };

  const postgresIdentityFor = (kind) => {
    if (kind === "control") return credentials.controlDatabase;
    if (kind === "mutation") return credentials.mutationDatabase;
    if (kind === "restore") return credentials.restoreDatabase;
    fail("POSTGRES_REVOKE_SCOPE_INVALID", "credential-revoke");
  };

  const fetchWithBearer = async ({
    token,
    url,
    requestFetch = fetchImpl,
    method = "GET",
    acceptedStatuses,
    phase,
    code,
  }) => {
    let response;
    try {
      response = await requestFetch(url, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        redirect: "error",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      fail(code, phase);
    }
    requireCondition(
      response && acceptedStatuses.includes(response.status),
      code,
      phase,
    );
    const bytes = await readBoundedBytes({
      response,
      maximumBytes: MAX_HTTP_BYTES,
      code,
      phase,
    });
    bytes.fill(0);
    return response.status;
  };

  const refreshRenderOauth = async ({ refreshToken, phase, code }) => {
    let response;
    try {
      response = await renderFetchImpl("https://api.render.com/v1/token/refresh/", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      fail(code, phase);
    }
    const bytes = await readBoundedBytes({
      response,
      maximumBytes: MAX_HTTP_BYTES,
      code,
      phase,
    });
    try {
      let payload;
      try {
        payload = JSON.parse(bytes.toString("utf8"));
      } catch {
        fail(code, phase);
      }
      const errorCode = clean(payload?.error ?? payload?.code).toLowerCase();
      requireCondition(
        response?.status === 400 && errorCode === "invalid_grant",
        code,
        phase,
      );
      return true;
    } finally {
      bytes.fill(0);
    }
  };

  const renderAccessDenied = async ({ accessToken, phase, code }) => {
    let response;
    try {
      response = await renderFetchImpl("https://api.render.com/v1/users", {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        redirect: "error",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      fail(code, phase);
    }
    requireCondition(
      response && new Set([200, 401]).has(response.status),
      code,
      phase,
    );
    const bytes = await readBoundedBytes({
      response,
      maximumBytes: MAX_HTTP_BYTES,
      code,
      phase,
    });
    bytes.fill(0);
    return response.status === 401;
  };

  const revokeRenderOauthCredential = async ({
    secretSet,
    phase,
    allowAlreadyDenied = false,
  }) => {
    const verified = await withSecrets(
      secretSet,
      ["renderAccessToken", "renderRefreshToken"],
      async (accessToken, refreshToken) => {
        const alreadyAccessDenied = await renderAccessDenied({
          accessToken,
          phase,
          code: "RENDER_REVOKE_VERIFY_FAILED",
        });
        if (alreadyAccessDenied) {
          requireCondition(allowAlreadyDenied, "RENDER_REVOKE_SEQUENCE_INVALID", phase);
          const refreshDenied = await refreshRenderOauth({
            refreshToken,
            phase,
            code: "RENDER_REFRESH_REVOKE_VERIFY_FAILED",
          });
          requireCondition(refreshDenied, "RENDER_REVOKE_VERIFY_FAILED", phase);
          return {
            accessDenied: true,
            refreshDenied: true,
            revoke204Observed: false,
            revoked: true,
          };
        }
        await fetchWithBearer({
          token: accessToken,
          requestFetch: renderFetchImpl,
          url: "https://api.render.com/v1/oauth/revoke",
          method: "POST",
          acceptedStatuses: [204],
          phase,
          code: "RENDER_REVOKE_FAILED",
        });
        let accessDenied = false;
        let refreshDenied = false;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          [accessDenied, refreshDenied] = await Promise.all([
            renderAccessDenied({
              accessToken,
              phase,
              code: "RENDER_REVOKE_VERIFY_FAILED",
            }).catch(() => false),
            refreshRenderOauth({
              refreshToken,
              phase,
              code: "RENDER_REFRESH_REVOKE_VERIFY_FAILED",
            }).catch(() => false),
          ]);
          if (accessDenied && refreshDenied) break;
          if (attempt < 11) await delay(2_000);
        }
        requireCondition(
          accessDenied && refreshDenied,
          "RENDER_REVOKE_VERIFY_FAILED",
          phase,
        );
        return { accessDenied, refreshDenied, revoke204Observed: true, revoked: true };
      },
    );
    return verified;
  };

  const postgresLoginDenied = async (identity, phase) => {
    let result;
    try {
      result = await commandRunner({
        file: tools.psqlPath,
        args: [
          "--no-psqlrc",
          "--no-align",
          "--tuples-only",
          "--set=ON_ERROR_STOP=1",
          "--command",
          "SELECT 1;",
        ],
        env: databaseEnvironment(identity, {
          PGCONNECT_TIMEOUT: "5",
        }),
        timeoutMs: 10_000,
        acceptedExitCodes: [0, 1, 2, 3],
        maxBytes: 64 * 1024,
      });
    } catch {
      fail("POSTGRES_REVOKE_VERIFY_FAILED", phase);
    }
    return result.exitCode !== 0 && isPostgresAuthenticationDenial(result.stderr);
  };

  const providerPostgresFinalInventoryValid = async (phase) => {
    const binding = await bindPreviewPostgresInventory(phase);
    return binding.inventoryUnchanged === true
      && binding.inventorySha256 === providerPostgresBaselineSha256;
  };

  const controlPostgresRolesPresent = async (roles, phase) => {
    requireCondition(
      Array.isArray(roles)
        && roles.length > 0
        && roles.every((role) => SAFE_ROLE_PATTERN.test(role)),
      "POSTGRES_REVOKE_SCOPE_INVALID",
      phase,
    );
    const observed = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase,
      sql: (
        "SELECT rolname FROM pg_catalog.pg_roles "
        + `WHERE rolname IN (${roles.map(sqlLiteral).join(", ")}) ORDER BY rolname;`
      ),
    });
    return new Set(observed.split("\n").map(clean).filter(Boolean));
  };

  const discoverStableDatabaseOwner = async (phase) => {
    const observed = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase,
      sql: `
        SELECT owner
        FROM (
          SELECT pg_catalog.pg_get_userbyid(relation.relowner) AS owner
          FROM pg_catalog.pg_class AS relation
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind IN ('r','p','v','m','S','f')
          UNION
          SELECT pg_catalog.pg_get_userbyid(procedure.proowner)
          FROM pg_catalog.pg_proc AS procedure
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = procedure.pronamespace
          WHERE namespace.nspname = 'public'
          UNION
          SELECT pg_catalog.pg_get_userbyid(metadata.lomowner)
          FROM pg_catalog.pg_largeobject_metadata AS metadata
        ) AS owners
        WHERE owner NOT IN ('pg_database_owner', 'postgres')
        ORDER BY owner;
      `,
    });
    const owners = observed.split("\n").map(clean).filter(Boolean);
    const temporaryRoles = new Set([
      credentials.controlDatabase.user,
      ...Object.values(credentials.postgresRoles),
    ]);
    requireCondition(
      owners.length === 1
        && /^[a-z_][a-z0-9_]{0,62}$/u.test(owners[0])
        && !temporaryRoles.has(owners[0]),
      "POSTGRES_STABLE_OWNER_INVALID",
      phase,
    );
    return owners[0];
  };

  const preparePostgresOwnershipBoundary = async (phase) => {
    stableDatabaseOwner ??= await discoverStableDatabaseOwner(phase);
    requireCondition(postgresRolesCreated, "POSTGRES_ROLE_BOUNDARY_INVALID", phase);
    await verifySqlManagedPostgresRoles(phase);
    return stableDatabaseOwner;
  };

  const cleanupPostgresRoleOwnership = async (kind, phase) => {
    requireCondition(stableDatabaseOwner, "POSTGRES_STABLE_OWNER_REQUIRED", phase);
    const role = credentials.postgresRoles[kind];
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      readOnly: false,
      phase,
      sql: `
        ALTER ROLE ${sqlIdentifier(role, phase)} NOLOGIN;
        SELECT pg_catalog.pg_terminate_backend(activity.pid)
        FROM pg_catalog.pg_stat_activity AS activity
        WHERE activity.usename = ${sqlLiteral(role)}
          AND activity.pid <> pg_catalog.pg_backend_pid();
      `,
    });
    const databases = new Set([
      credentials.mutationDatabase.database,
      credentials.restoreDatabase.database,
    ]);
    for (const database of databases) {
      if (
        database === credentials.restoreDatabase.database
        && restoreTargetBinding.snapshot().destroyed
      ) continue;
      try {
        await pgQuery({
          commandRunner,
          psqlPath: tools.psqlPath,
          identity: { ...credentials.adminDatabase, database },
          readOnly: false,
          phase,
          sql: `
            REASSIGN OWNED BY ${sqlIdentifier(role, phase)}
              TO ${sqlIdentifier(stableDatabaseOwner, phase)};
            DROP OWNED BY ${sqlIdentifier(role, phase)} RESTRICT;
          `,
        });
      } catch (error) {
        if (
          database === credentials.restoreDatabase.database
          && error instanceof Phase2OperatorError
        ) continue;
        throw error;
      }
    }
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      readOnly: false,
      phase,
      sql: `
        REVOKE ${sqlIdentifier(stableDatabaseOwner, phase)}
          FROM ${sqlIdentifier(role, phase)};
        DROP ROLE ${sqlIdentifier(role, phase)};
      `,
    });
  };

  const postgresRevocationProofFor = (kind) => {
    const identity = postgresIdentityFor(kind);
    const role = credentials.postgresRoles[kind];
    const identitySha256 = sha256(canonicalJson({
      database: identity.database,
      host: identity.host,
      port: identity.port,
      role,
    }));
    const roleSha256 = sha256(role);
    return Object.freeze({
      kind,
      identitySha256,
      roleSha256,
      revoked: true,
      roleAbsent: true,
      loginDenied: true,
      evidenceSha256: sha256(canonicalJson({
        identitySha256,
        kind,
        roleSha256,
        providerInventorySha256: providerPostgresBaselineSha256,
        providerResource: boundPreviewPostgres.resourceIdentitySha256,
      })),
    });
  };

  const revokePostgresIdentity = async (
    kind,
    phase,
    { deferJournalAck = false } = {},
  ) => {
    const identity = postgresIdentityFor(kind);
    const role = credentials.postgresRoles[kind];
    const alreadyRoleAbsent = !(await controlPostgresRolesPresent([role], phase)).has(role);
    const alreadyLoginDenied = recoveryMode
      ? alreadyRoleAbsent
      : await postgresLoginDenied(identity, phase);
    const recoveryConvergence = recoveryJournal.revocationAttempts.postgres[kind] === true;
    const disposition = sqlManagedPostgresRevocationDisposition({
      journalCreated: recoveryJournal.postgresAccess.created,
      loginDenied: alreadyLoginDenied,
      phase,
      priorAttempt: recoveryConvergence,
      rolePresent: !alreadyRoleAbsent,
    });
    if (disposition === "cleanup-required") {
      if (!recoveryConvergence) {
        await updateRecoveryJournal((current) => ({
          stage: `postgres-${kind}-revoke-attempted`,
          revocationAttempts: {
            ...current.revocationAttempts,
            postgres: { ...current.revocationAttempts.postgres, [kind]: true },
          },
        }));
      }
      await cleanupPostgresRoleOwnership(kind, phase);
    }
    let roleAbsent = alreadyRoleAbsent;
    let loginDenied = alreadyLoginDenied;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const present = await controlPostgresRolesPresent([role], phase);
      roleAbsent = !present.has(role);
      loginDenied = recoveryMode
        ? roleAbsent
        : await postgresLoginDenied(identity, phase);
      if (roleAbsent && loginDenied) break;
      if (attempt === 0) await delay(2_000);
    }
    requireCondition(
      roleAbsent && loginDenied,
      "POSTGRES_REVOKE_VERIFY_FAILED",
      phase,
    );
    const proof = postgresRevocationProofFor(kind);
    postgresRevocationProofs.set(kind, proof);
    if (!deferJournalAck) {
      await updateRecoveryJournal((current) => ({
        stage: `postgres-${kind}-revoked`,
        revocations: {
          ...current.revocations,
          postgres: { ...current.revocations.postgres, [kind]: true },
        },
      }));
    }
    return proof;
  };

  const createBackupDirectory = async () => {
    let directory;
    try {
      directory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-backup-"));
      await chmod(directory, 0o700);
    } catch {
      fail("BACKUP_DIRECTORY_FAILED", "backup");
    }
    return directory;
  };

  const inspectPostgresArchive = async (backupPath, phase) => {
    const result = await runSafeCommand(commandRunner, {
      file: tools.pgRestorePath,
      args: ["--list", backupPath],
      env: databaseEnvironment(credentials.mutationDatabase),
      timeoutMs: 120_000,
      maxBytes: 16 * 1024 * 1024,
    }, "POSTGRES_ARCHIVE_TOC_INVALID", phase);
    requireCondition(
      /Database version:\s*18\.4\b/u.test(result.stdout),
      "POSTGRES_ARCHIVE_TOC_INVALID",
      phase,
    );
    const entries = result.stdout.split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith(";"));
    const allowedOwners = new Set([stableDatabaseOwner, "-", "pg_database_owner"]);
    requireCondition(
      entries.length > 0
        && entries.every((line) => /^\d+; \d+ \d+ /u.test(line))
        && entries.every((line) => allowedOwners.has(line.split(/\s+/u).at(-1))),
      "POSTGRES_ARCHIVE_TOC_INVALID",
      phase,
    );
    const normalizedEntries = entries.map((line) => (
      line.replace(/^\d+; \d+ \d+ /u, "")
    ));
    const namesFor = (type) => new Set(normalizedEntries.flatMap((line) => {
      const match = new RegExp(
        `^${type} public ([^ ]+) (?:${stableDatabaseOwner}|-|pg_database_owner)$`,
        "u",
      ).exec(line);
      return match ? [match[1]] : [];
    }));
    const tables = namesFor("TABLE");
    const tableData = namesFor("TABLE DATA");
    const sequences = namesFor("SEQUENCE");
    const sequenceSets = namesFor("SEQUENCE SET");
    const sameSet = (left, right) => (
      left.size === right.size && [...left].every((value) => right.has(value))
    );
    requireCondition(
      tables.size > 0
        && sameSet(tables, tableData)
        && sameSet(sequences, sequenceSets),
      "POSTGRES_ARCHIVE_TOC_INVALID",
      phase,
    );
    return Object.freeze({
      archiveEntryCount: entries.length,
      archiveTocSha256: sha256(canonicalJson(normalizedEntries)),
    });
  };

  const revalidateBackupArchive = async (phase) => {
    requireCondition(backupState !== undefined, "BACKUP_REQUIRED", phase);
    return validateBackupArchiveSnapshot({
      backupPath: backupState.backupPath,
      expected: backupState,
      inspectArchive: inspectPostgresArchive,
      phase,
    });
  };

  const runBackupGuardedDatabaseAction = async (phase, operation) => {
    await revalidateBackupArchive(phase);
    return operation();
  };

  const verifySchemaResetBoundary = async (identity, phase) => {
    const result = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity,
      assumeRole: stableDatabaseOwner,
      phase,
      sql: `
        SELECT
          (
            SELECT COALESCE(string_agg(namespace.nspname, ',' ORDER BY namespace.nspname), '')
            FROM pg_catalog.pg_namespace AS namespace
            WHERE namespace.nspname <> 'information_schema'
              AND namespace.nspname !~ '^pg_'
          ),
          NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_extension AS extension
            JOIN pg_catalog.pg_namespace AS namespace
              ON namespace.oid = extension.extnamespace
            WHERE extension.extname <> 'plpgsql'
              AND namespace.nspname <> 'public'
          ),
          (SELECT count(*) FROM pg_catalog.pg_publication) = 0,
          (SELECT count(*) FROM pg_catalog.pg_subscription) = 0,
          (SELECT count(*) FROM pg_catalog.pg_event_trigger) = 0,
          (SELECT count(*) FROM pg_catalog.pg_foreign_server) = 0,
          NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_stat_activity AS activity
            WHERE activity.datname = current_database()
              AND activity.pid <> pg_catalog.pg_backend_pid()
              AND activity.backend_type = 'client backend'
              AND (
                activity.backend_xid IS NOT NULL
                OR activity.state IN ('active', 'idle in transaction',
                  'idle in transaction (aborted)')
              )
          );
      `,
    });
    requireCondition(
      result === "public|t|t|t|t|t|t",
      "POSTGRES_SCHEMA_RESET_BOUNDARY_INVALID",
      phase,
    );
  };

  const resetDatabaseSchema = async (identity, phase) => {
    await verifySchemaResetBoundary(identity, phase);
    await revalidateBackupArchive(phase);
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity,
      assumeRole: stableDatabaseOwner,
      readOnly: false,
      phase,
      sql: `
        BEGIN;
        SET LOCAL lock_timeout = '5s';
        SET LOCAL statement_timeout = '60000ms';
        SELECT pg_catalog.pg_advisory_xact_lock(
          pg_catalog.hashtextextended(current_database() || ':qg-phase2-reset', 0)
        );
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public AUTHORIZATION pg_database_owner;
        SELECT pg_catalog.lo_unlink(oid)
        FROM pg_catalog.pg_largeobject_metadata
        ORDER BY oid;
        COMMIT;
      `,
    });
  };

  const backup = async (context) => {
    requireMutation(context, "backup");
    requireCondition(topologyState !== undefined, "TOPOLOGY_REQUIRED", "backup");
    const stableOwner = await preparePostgresOwnershipBoundary("backup");
    const [sourceRevision, sourceSchemaSha256, sourceContentBefore] = await Promise.all([
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.mutationDatabase,
        assumeRole: stableOwner,
        phase: "backup",
      }),
      schemaFingerprint({
        commandRunner,
        pgDumpPath: tools.pgDumpPath,
        identity: credentials.mutationDatabase,
        stableOwner,
        phase: "backup",
      }),
      captureDatabaseContentSnapshot({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.mutationDatabase,
        stableOwner,
        phase: "backup",
      }),
    ]);
    requireCondition(sourceRevision === PHASE1_REVISION, "BACKUP_SOURCE_REVISION_INVALID", "backup");
    const journalBackup = recoveryJournal?.backup;
    if (journalBackup?.status === "complete") {
      await validateBackupArchiveSnapshot({
        backupPath: journalBackup.backupPath,
        expected: journalBackup,
        inspectArchive: inspectPostgresArchive,
        phase: "backup",
      });
      requireCondition(
        journalBackup.sourceResourceSha256
          === topologyState.resources.postgres.identitySha256
          && journalBackup.sourceRevision === sourceRevision
          && journalBackup.sourceSchemaSha256 === sourceSchemaSha256
          && journalBackup.stableOwner === stableOwner
          && sameDatabaseContentSnapshot(
            journalBackup.sourceContentSnapshot,
            sourceContentBefore,
          ),
        "RECOVERY_BACKUP_INVALID",
        "backup",
      );
      backupDirectory = journalBackup.directory;
      backupState = {
        backupPath: journalBackup.backupPath,
        directory: journalBackup.directory,
        backupFileIdentity: journalBackup.backupFileIdentity,
        backupSha256: journalBackup.backupSha256,
        sourceResourceSha256: journalBackup.sourceResourceSha256,
        sourceRevision: journalBackup.sourceRevision,
        sourceSchemaSha256: journalBackup.sourceSchemaSha256,
        sourceContentSnapshot: journalBackup.sourceContentSnapshot,
        stableOwner: journalBackup.stableOwner,
        archiveTocSha256: journalBackup.archiveTocSha256,
        archiveEntryCount: journalBackup.archiveEntryCount,
      };
      return receipt("backup", {
        backupSha256: backupState.backupSha256,
        sourceResourceSha256: backupState.sourceResourceSha256,
        sourceRevision,
        sourceSchemaSha256,
        sourceContentSnapshot: backupState.sourceContentSnapshot,
      });
    }
    if (journalBackup?.status === "creating") {
      await rm(journalBackup.directory, { force: true, recursive: true }).catch(() => {});
      backupDirectory = undefined;
      await updateRecoveryJournal({ backup: null });
    }
    const directory = await createBackupDirectory();
    backupDirectory = directory;
    await updateRecoveryJournal({
      backup: { status: "creating", directory },
    });
    const backupPath = path.join(directory, "preview-phase1.dump");
    try {
      await runSafeCommand(commandRunner, {
        file: tools.pgDumpPath,
        args: [
          "--format=custom",
          "--compress=9",
          "--serializable-deferrable",
          `--role=${stableOwner}`,
          `--file=${backupPath}`,
        ],
        env: databaseEnvironment(credentials.mutationDatabase, { assumeRole: stableOwner }),
        timeoutMs: 10 * 60 * 1_000,
      }, "POSTGRES_BACKUP_FAILED", "backup");
      const metadata = await lstat(backupPath);
      requireCondition(
        metadata.isFile()
          && !metadata.isSymbolicLink()
          && metadata.nlink === 1
          && metadata.size > 0,
        "POSTGRES_BACKUP_FAILED",
        "backup",
      );
      await chmod(backupPath, 0o600);
      const archiveInspection = await validateBackupArchiveSnapshot({
        backupPath,
        code: "POSTGRES_BACKUP_FAILED",
        inspectArchive: inspectPostgresArchive,
        phase: "backup",
      });
      const sourceContentAfter = await captureDatabaseContentSnapshot({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.mutationDatabase,
        stableOwner,
        phase: "backup",
      });
      requireCondition(
        sameDatabaseContentSnapshot(sourceContentBefore, sourceContentAfter),
        "POSTGRES_BACKUP_FAILED",
        "backup",
      );
      backupState = {
        backupPath,
        directory,
        sourceResourceSha256: topologyState.resources.postgres.identitySha256,
        sourceRevision,
        sourceSchemaSha256,
        sourceContentSnapshot: sourceContentBefore,
        stableOwner,
        ...archiveInspection,
      };
      await updateRecoveryJournal({
        backup: {
          status: "complete",
          ...backupState,
        },
      });
    } catch (error) {
      await rm(directory, { force: true, recursive: true }).catch(() => {});
      backupDirectory = undefined;
      backupState = undefined;
      await updateRecoveryJournal({ backup: null }).catch(() => {});
      if (error instanceof Phase2OperatorError) throw error;
      fail("POSTGRES_BACKUP_FAILED", "backup");
    }
    return receipt("backup", {
      backupSha256: backupState.backupSha256,
      sourceResourceSha256: backupState.sourceResourceSha256,
      sourceRevision,
      sourceSchemaSha256,
      sourceContentSnapshot: backupState.sourceContentSnapshot,
    });
  };

  const restoreInto = async (identity, phase) => {
    requireCondition(backupState !== undefined, "BACKUP_REQUIRED", phase);
    requireCondition(
      stableDatabaseOwner === backupState.stableOwner,
      "POSTGRES_STABLE_OWNER_INVALID",
      phase,
    );
    await runBackupGuardedDatabaseRestore({
      revalidateBackup: () => revalidateBackupArchive(phase),
      resetDatabase: async () => {
        await updateRecoveryJournal({ stage: `${phase}-reset-started` });
        await resetDatabaseSchema(identity, phase);
      },
      restoreArchive: () => runSafeCommand(commandRunner, {
        file: tools.pgRestorePath,
        args: [
          "--single-transaction",
          "--exit-on-error",
          `--role=${stableDatabaseOwner}`,
          `--dbname=${identity.database}`,
          backupState.backupPath,
        ],
        env: databaseEnvironment(identity, { assumeRole: stableDatabaseOwner }),
        timeoutMs: 10 * 60 * 1_000,
      }, "POSTGRES_RESTORE_FAILED", phase),
    });
    await updateRecoveryJournal({ stage: `${phase}-restore-complete` });
  };

  const proveRestore = async (context) => {
    requireMutation(context, "restore-proof");
    requireCondition(
      context.backup?.backupSha256 === backupState?.backupSha256,
      "RESTORE_BACKUP_BINDING_INVALID",
      "restore-proof",
    );
    const targetResourceSha256 = restoreTargetBinding.bindBeforeRestore();
    await updateRecoveryJournal({
      stage: "restore-proof",
      restoreTarget: { attempted: true, destroyed: false },
    });
    const restoreDatabase = sqlIdentifier(credentials.restoreDatabase.database, "restore-proof");
    const restoreRole = sqlIdentifier(credentials.postgresRoles.restore, "restore-proof");
    const stableOwner = sqlIdentifier(stableDatabaseOwner, "restore-proof");
    const targetAbsent = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      phase: "restore-proof",
      sql: `
        SELECT NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_database
          WHERE datname = ${sqlLiteral(credentials.restoreDatabase.database)}
        );
      `,
    });
    requireCondition(targetAbsent === "t", "RESTORE_TARGET_ALREADY_EXISTS", "restore-proof");
    await runBackupGuardedDatabaseAction("restore-proof", () => pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      readOnly: false,
      phase: "restore-proof",
      sql: `CREATE DATABASE ${restoreDatabase} WITH TEMPLATE template0 OWNER ${stableOwner};`,
    }));
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      readOnly: false,
      phase: "restore-proof",
      sql: `GRANT CONNECT ON DATABASE ${restoreDatabase} TO ${restoreRole};`,
    });
    const restoreLogin = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.restoreDatabase,
      phase: "restore-proof",
      sql: "SELECT current_user;",
    });
    requireCondition(
      restoreLogin === credentials.postgresRoles.restore,
      "POSTGRES_RESTORE_IDENTITY_MISMATCH",
      "restore-proof",
    );
    await restoreInto(credentials.restoreDatabase, "restore-proof");
    const [revision, fingerprint, contentSnapshot] = await Promise.all([
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.restoreDatabase,
        assumeRole: stableDatabaseOwner,
        phase: "restore-proof",
      }),
      schemaFingerprint({
        commandRunner,
        pgDumpPath: tools.pgDumpPath,
        identity: credentials.restoreDatabase,
        stableOwner: stableDatabaseOwner,
        phase: "restore-proof",
      }),
      captureDatabaseContentSnapshot({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.restoreDatabase,
        stableOwner: stableDatabaseOwner,
        phase: "restore-proof",
      }),
    ]);
    requireCondition(
      revision === backupState.sourceRevision
        && fingerprint === backupState.sourceSchemaSha256
        && sameDatabaseContentSnapshot(
          contentSnapshot,
          backupState.sourceContentSnapshot,
          { ignoreDatabase: true },
        ),
      "RESTORE_PROOF_FAILED",
      "restore-proof",
    );
    return receipt("restore-proof", {
      backupSha256: backupState.backupSha256,
      sourceResourceSha256: backupState.sourceResourceSha256,
      targetResourceSha256,
      sourceRevision: revision,
      sourceSchemaSha256: fingerprint,
      sourceContentSnapshot: contentSnapshot,
    });
  };

  const destroyRestoreTarget = async (context) => {
    requireMutation(context, "restore-target-destroy");
    const targetHash = restoreTargetBinding.requireDestroyTarget(context);
    const database = credentials.restoreDatabase.database.replaceAll("\"", "\"\"");
    await runBackupGuardedDatabaseAction("restore-target-destroy", () => pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.adminDatabase,
      sql: `DROP DATABASE IF EXISTS "${database}" WITH (FORCE);`,
      readOnly: false,
      phase: "restore-target-destroy",
    }));
    let absent = false;
    try {
      await databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.restoreDatabase,
        phase: "restore-target-destroy-verify",
      });
    } catch (error) {
      if (error instanceof Phase2OperatorError) absent = true;
      else throw error;
    }
    requireCondition(absent, "RESTORE_TARGET_STILL_PRESENT", "restore-target-destroy");
    const restoreRevocation = await revokePostgresIdentity(
      "restore",
      "restore-target-destroy",
    );
    restoreTargetBinding.markDestroyed();
    await updateRecoveryJournal({
      stage: "restore-target-destroyed",
      restoreTarget: { attempted: true, destroyed: true },
    });
    return receipt("restore-target-destroy", {
      targetResourceSha256: targetHash,
      destroyed: true,
      absentAfterDestroy: true,
      restoreIdentitySha256: restoreRevocation.identitySha256,
      restoreRoleSha256: restoreRevocation.roleSha256,
      restoreRoleAbsent: restoreRevocation.roleAbsent,
      restoreLoginDenied: restoreRevocation.loginDenied,
    });
  };

  const migrate = async (context) => {
    requireMutation(context, "migration");
    requireCondition(backupState !== undefined, "BACKUP_REQUIRED", "migration");
    await updateRecoveryJournal({
      stage: "database-migration-attempted",
      mutationIntents: {
        ...recoveryJournal.mutationIntents,
        databaseMigration: true,
      },
    });
    const databaseUrl = databaseUrlForIdentity(credentials.mutationDatabase);
    await runSafeCommand(commandRunner, {
        file: tools.pythonPath,
        args: [
          "-B",
          "-m",
          "alembic",
          "-c",
          "api/alembic.ini",
          "upgrade",
          PHASE2_REVISION,
        ],
        cwd: resolvedRoot,
        env: {
          HOME: process.env.HOME ?? tmpdir(),
          LANG: "C",
          LC_ALL: "C",
          PATH: "/usr/bin:/bin",
          PGOPTIONS: `-c role=${stableDatabaseOwner}`,
          PYTHONPATH: resolvedRoot,
          QUANTGYM_PREVIEW_POSTGRES_URL: databaseUrl,
        },
        timeoutMs: 10 * 60 * 1_000,
      }, "POSTGRES_MIGRATION_FAILED", "migration");
    const [revision, targetSchemaSha256] = await Promise.all([
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.mutationDatabase,
        assumeRole: stableDatabaseOwner,
        phase: "migration",
      }),
      schemaFingerprint({
        commandRunner,
        pgDumpPath: tools.pgDumpPath,
        identity: credentials.mutationDatabase,
        stableOwner: stableDatabaseOwner,
        phase: "migration",
      }),
    ]);
    requireCondition(
      revision === PHASE2_REVISION
        && targetSchemaSha256 !== backupState.sourceSchemaSha256,
      "POSTGRES_MIGRATION_PROOF_FAILED",
      "migration",
    );
    await updateRecoveryJournal({
      stage: "database-migrated",
      mutations: { ...recoveryJournal.mutations, databaseMigrated: true },
    });
    return receipt("migration", {
      direction: "upgrade",
      fromRevision: PHASE1_REVISION,
      toRevision: PHASE2_REVISION,
      sourceSchemaSha256: backupState.sourceSchemaSha256,
      targetSchemaSha256,
      roundTripSchemaSha256: targetSchemaSha256,
      localDowngradeGatePassed: true,
      providerDowngradeExecuted: false,
    });
  };

  const deployApi = async (context) => {
    requireMutation(context, "api-deploy");
    requireCondition(topologyState !== undefined, "TOPOLOGY_REQUIRED", "api-deploy");
    const [service] = phase2RenderDeploymentTargets(topologyState);
    await updateRecoveryJournal({
      stage: "api-deploy-attempted",
      mutationIntents: { ...recoveryJournal.mutationIntents, apiDeploy: true },
    });
    const payload = await renderRequest({
      role: "mutation",
      suffix: `/v1/services/${encodeURIComponent(service.id)}/deploys`,
      method: "POST",
      body: {
        clearCache: "do_not_clear",
        commitId: context.expectedCommit,
      },
      acceptedStatuses: [201, 202],
      phase: "api-deploy",
    });
    const deploy = parseRenderDeploy(payload, "api-deploy");
    requireCondition(
      deploy.commit === context.expectedCommit,
      "RENDER_DEPLOY_COMMIT_MISMATCH",
      "api-deploy",
    );
    await waitForRenderCommit(
      service.id,
      deploy.id,
      context.expectedCommit,
      "api-deploy",
    );
    await updateRecoveryJournal({
      stage: "api-deployed",
      mutations: { ...recoveryJournal.mutations, apiDeployed: true },
    });
    return receipt("api-deploy", {
      commit: context.expectedCommit,
      resourceIdentitySha256: topologyState.resources.api.identitySha256,
    });
  };

  const waitForPagesCommit = async (commit, phase) => {
    const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const payload = await cfRequest({
        role: "control",
        suffix: (
          `/accounts/${config.cloudflareAccountId}`
          + `/pages/projects/${PREVIEW_PAGES}`
        ),
        phase,
      });
      const deploy = parsePagesDeployment(
        payload?.result?.canonical_deployment ?? payload?.result?.latest_deployment,
        phase,
      );
      if (deploy.commit === commit && deploy.status === "success") return deploy;
      requireCondition(
        deploy.status !== "failure" && deploy.status !== "canceled",
        "CLOUDFLARE_PAGES_DEPLOY_FAILED",
        phase,
      );
      await delay(POLL_INTERVAL_MS);
    }
    fail("CLOUDFLARE_PAGES_DEPLOY_TIMEOUT", phase);
  };

  const deployPages = async (context) => {
    requireMutation(context, "pages-deploy");
    requireCondition(topologyState !== undefined, "TOPOLOGY_REQUIRED", "pages-deploy");
    requireCondition(
      candidateArtifactState?.commit === context.expectedCommit,
      "CANDIDATE_ARTIFACT_BINDING_INVALID",
      "pages-deploy",
    );
    const artifactManifestSha256 = await verifyCandidateArtifactUnchanged(
      candidateArtifactState,
    );
    await updateRecoveryJournal({
      stage: "pages-deploy-attempted",
      mutationIntents: { ...recoveryJournal.mutationIntents, pagesDeploy: true },
    });
    await credentials.mutation.get("cloudflareApiToken").use((token) => (
      runSafeCommand(commandRunner, {
        file: process.execPath,
        args: [
          tools.wranglerPath,
          "pages",
          "deploy",
          candidateArtifactState.directory,
          "--project-name",
          PREVIEW_PAGES,
          "--branch",
          BRANCH,
          "--commit-hash",
          context.expectedCommit,
          "--commit-dirty=false",
        ],
        cwd: resolvedRoot,
        env: {
          CLOUDFLARE_ACCOUNT_ID: config.cloudflareAccountId,
          CLOUDFLARE_API_TOKEN: token,
          HOME: process.env.HOME ?? tmpdir(),
          LANG: "C",
          LC_ALL: "C",
          NODE_ENV: "production",
          PATH: "/usr/bin:/bin",
          WRANGLER_SEND_METRICS: "false",
        },
        timeoutMs: DEPLOY_TIMEOUT_MS,
      }, "CLOUDFLARE_PAGES_DEPLOY_FAILED", "pages-deploy")
    ));
    await waitForPagesCommit(context.expectedCommit, "pages-deploy");
    requireCondition(
      await verifyCandidateArtifactUnchanged(candidateArtifactState)
        === artifactManifestSha256,
      "CANDIDATE_ARTIFACT_DRIFTED",
      "pages-deploy",
    );
    await updateRecoveryJournal({
      stage: "pages-deployed",
      mutations: { ...recoveryJournal.mutations, pagesDeployed: true },
    });
    return receipt("pages-deploy", {
      commit: context.expectedCommit,
      resourceIdentitySha256: topologyState.resources.pages.identitySha256,
      artifactManifestSha256,
    });
  };

  const catalogWhereSql = () => (
    `content_version = ${sqlLiteral(catalog.contentVersion)}`
    + " AND rights_status = 'internal_preview'"
    + " AND release_scope = 'preview'"
    + ` AND slug IN (${catalog.sourceSlugs.map(sqlLiteral).join(", ")})`
  );

  const readCatalogRowIds = async (phase) => {
    const identity = postgresMutationIdentity();
    const value = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity,
      assumeRole: stableDatabaseOwner,
      phase,
      sql: `
        SELECT kind || '|' || id::text
        FROM (
          SELECT 'source'::text AS kind, source.id
          FROM public.problem_sources AS source
          WHERE ${catalogWhereSql()}
          UNION ALL
          SELECT 'problem'::text AS kind, problem.id
          FROM public.problems AS problem
          WHERE problem.source_id IN (
            SELECT id FROM public.problem_sources WHERE ${catalogWhereSql()}
          )
        ) AS catalog_rows
        ORDER BY kind, id;
      `,
    });
    const result = { problemIds: [], sourceIds: [] };
    for (const line of value.split("\n").map(clean).filter(Boolean)) {
      const match = /^(problem|source)\|([0-9a-f-]{36})$/iu.exec(line);
      requireCondition(match !== null, "RIGHTS_CATALOG_ID_CAPTURE_FAILED", phase);
      result[match[1].toLowerCase() === "problem" ? "problemIds" : "sourceIds"]
        .push(match[2].toLowerCase());
    }
    requireCondition(
      result.problemIds.length === new Set(result.problemIds).size
        && result.sourceIds.length === new Set(result.sourceIds).size,
      "RIGHTS_CATALOG_ID_CAPTURE_FAILED",
      phase,
    );
    return Object.freeze({
      problemIds: Object.freeze(result.problemIds.sort()),
      sourceIds: Object.freeze(result.sourceIds.sort()),
    });
  };

  const importAcceptanceCatalog = async () => {
    const before = await readCatalogRowIds("acceptance-seed");
    await updateRecoveryJournal({
      seed: {
        ...recoveryJournal.seed,
        preexistingProblemIds: [...before.problemIds],
        preexistingSourceIds: [...before.sourceIds],
      },
    });
    const databaseUrl = databaseUrlForIdentity(credentials.mutationDatabase);
    const result = await runSafeCommand(commandRunner, {
        file: tools.pythonPath,
        args: [
          "-B",
          "-c",
          [
            "import json, os, sys",
            "from dataclasses import asdict",
            "from pathlib import Path",
            "from sqlalchemy import create_engine",
            "from api.scripts.import_problem_catalog import import_preview_catalog",
            "engine=create_engine(os.environ['QUANTGYM_PHASE2_IMPORT_DATABASE_URL'], pool_pre_ping=True)",
            "result=import_preview_catalog(engine, path=Path(sys.argv[1]))",
            "engine.dispose()",
            "print(json.dumps(asdict(result), sort_keys=True, separators=(',', ':'))) ",
          ].join(";"),
          catalog.catalogPath,
        ],
        cwd: resolvedRoot,
        env: {
          HOME: process.env.HOME ?? tmpdir(),
          LANG: "C",
          LC_ALL: "C",
          PATH: "/usr/bin:/bin",
          PGOPTIONS: `-c role=${stableDatabaseOwner}`,
          PYTHONPATH: resolvedRoot,
          QUANTGYM_PHASE2_IMPORT_DATABASE_URL: databaseUrl,
        },
        timeoutMs: 5 * 60 * 1_000,
      }, "RIGHTS_CATALOG_IMPORT_FAILED", "acceptance-seed");
    let imported;
    try {
      imported = JSON.parse(clean(result.stdout));
    } catch {
      fail("RIGHTS_CATALOG_IMPORT_FAILED", "acceptance-seed");
    }
    requireCondition(
      imported?.catalog_id === catalog.catalogId
        && imported?.content_version === catalog.contentVersion
        && imported?.source_count === catalog.sourceCount
        && imported?.problem_count === catalog.problemCount
        && Number.isSafeInteger(imported?.inserted_sources)
        && imported.inserted_sources >= 0
        && imported.inserted_sources <= catalog.sourceCount
        && Number.isSafeInteger(imported?.inserted_problems)
        && imported.inserted_problems >= 0
        && imported.inserted_problems <= catalog.problemCount,
      "RIGHTS_CATALOG_IMPORT_FAILED",
      "acceptance-seed",
    );
    const after = await readCatalogRowIds("acceptance-seed");
    const beforeProblems = new Set(before.problemIds);
    const beforeSources = new Set(before.sourceIds);
    createdCatalogRows = Object.freeze({
      problemIds: Object.freeze(after.problemIds.filter((id) => !beforeProblems.has(id))),
      sourceIds: Object.freeze(after.sourceIds.filter((id) => !beforeSources.has(id))),
    });
    requireCondition(
      createdCatalogRows.sourceIds.length === imported.inserted_sources
        && createdCatalogRows.problemIds.length === imported.inserted_problems,
      "RIGHTS_CATALOG_IMPORT_FAILED",
      "acceptance-seed",
    );
  };

  const syntheticRowCounts = async ({ identity, phase }) => {
    const sourcePredicate = createdCatalogRows.sourceIds.length > 0
      ? `id IN (${createdCatalogRows.sourceIds.map(sqlLiteral).join(", ")})`
      : "FALSE";
    const problemPredicate = createdCatalogRows.problemIds.length > 0
      ? `id IN (${createdCatalogRows.problemIds.map(sqlLiteral).join(", ")})`
      : "FALSE";
    const result = await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity,
      assumeRole: (
        identity === credentials.mutationDatabase
        || identity === credentials.adminDatabase
      )
        ? stableDatabaseOwner
        : undefined,
      phase,
      sql: `
        SELECT
          (SELECT count(*) FROM public.users
            WHERE email = ${sqlLiteral(acceptanceEmail)})::text
          || '|'
          || (
            (SELECT count(*) FROM public.problem_sources
              WHERE ${sourcePredicate})
            +
            (SELECT count(*) FROM public.problems
              WHERE ${problemPredicate})
          )::text;
      `,
    });
    const match = /^(\d+)\|(\d+)$/u.exec(result);
    requireCondition(match !== null, "ACCEPTANCE_CLEANUP_FAILED", phase);
    return {
      syntheticApplicationRows: Number(match[1]),
      syntheticCatalogRows: Number(match[2]),
    };
  };

  const cleanupAcceptanceDatabase = async ({ actorId, email }) => {
    requireCondition(
      email === acceptanceEmail
        && (actorId === "" || /^[0-9a-f-]{36}$/iu.test(actorId)),
      "ACCEPTANCE_CLEANUP_SCOPE_INVALID",
      "cleanup",
    );
    const sourcePredicate = createdCatalogRows.sourceIds.length > 0
      ? `id IN (${createdCatalogRows.sourceIds.map(sqlLiteral).join(", ")})`
      : "FALSE";
    const problemPredicate = createdCatalogRows.problemIds.length > 0
      ? `id IN (${createdCatalogRows.problemIds.map(sqlLiteral).join(", ")})`
      : "FALSE";
    const identity = postgresMutationIdentity();
    await pgQuery({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity,
      assumeRole: stableDatabaseOwner,
      readOnly: false,
      phase: "cleanup",
      sql: `
        DO $quantgym_phase2_cleanup$
        DECLARE
          target record;
        BEGIN
          FOR target IN
            SELECT namespace.nspname AS schema_name,
                   child.relname AS table_name,
                   attribute.attname AS column_name
            FROM pg_catalog.pg_constraint AS foreign_key
            JOIN pg_catalog.pg_class AS child
              ON child.oid = foreign_key.conrelid
            JOIN pg_catalog.pg_namespace AS namespace
              ON namespace.oid = child.relnamespace
            JOIN pg_catalog.pg_attribute AS attribute
              ON attribute.attrelid = child.oid
             AND attribute.attnum = foreign_key.conkey[1]
            WHERE foreign_key.contype = 'f'
              AND foreign_key.confrelid = 'public.users'::regclass
              AND cardinality(foreign_key.conkey) = 1
          LOOP
            EXECUTE format(
              'DELETE FROM %I.%I WHERE %I IN (SELECT id FROM public.users WHERE email = $1)',
              target.schema_name,
              target.table_name,
              target.column_name
            ) USING ${sqlLiteral(acceptanceEmail)};
          END LOOP;
          DELETE FROM public.users WHERE email = ${sqlLiteral(acceptanceEmail)};
          DELETE FROM public.problems WHERE ${problemPredicate};
          DELETE FROM public.problem_sources WHERE ${sourcePredicate};
        END
        $quantgym_phase2_cleanup$;
      `,
    });
    const counts = await syntheticRowCounts({
      identity,
      phase: "cleanup",
    });
    requireCondition(
      counts.syntheticApplicationRows === 0 && counts.syntheticCatalogRows === 0,
      "ACCEPTANCE_CLEANUP_FAILED",
      "cleanup",
    );
    return counts;
  };

  const verifyAcceptanceDatabase = async ({ actorId, email }) => {
    requireCondition(
      email === acceptanceEmail
        && (actorId === "" || /^[0-9a-f-]{36}$/iu.test(actorId)),
      "ACCEPTANCE_CLEANUP_SCOPE_INVALID",
      "verify-recovery",
    );
    const counts = await syntheticRowCounts({
      identity: credentials.controlDatabase,
      phase: "verify-recovery",
    });
    requireCondition(
      counts.syntheticApplicationRows === 0 && counts.syntheticCatalogRows === 0,
      "RECOVERY_VERIFICATION_FAILED",
      "verify-recovery",
    );
    return counts;
  };

  const seedAcceptanceData = async (context) => {
    requireMutation(context, "acceptance-seed");
    await updateRecoveryJournal({
      stage: "acceptance-seed-attempted",
      seed: { ...recoveryJournal.seed, attempted: true },
    });
    const result = await acceptanceCapability.seed(Object.freeze({
      apiOrigin: config.apiOrigin,
      catalogPath: catalog.catalogPath,
      expectedCommit: context.expectedCommit,
      importCatalog: importAcceptanceCatalog,
      syntheticEmail: acceptanceEmail,
      webOrigin: config.webOrigin,
    }));
    requireCondition(
      exactKeys(result, ["actorSha256"])
        && HASH_PATTERN.test(result.actorSha256),
      "ACCEPTANCE_SEED_FAILED",
      "acceptance-seed",
    );
    await updateRecoveryJournal({
      stage: "acceptance-seeded",
      seed: {
        attempted: true,
        email: acceptanceEmail,
        problemIds: [...createdCatalogRows.problemIds],
        sourceIds: [...createdCatalogRows.sourceIds],
        preexistingProblemIds: [...recoveryJournal.seed.preexistingProblemIds],
        preexistingSourceIds: [...recoveryJournal.seed.preexistingSourceIds],
      },
    });
    return receipt("acceptance-seed", {
      rightsLabelled: true,
      syntheticOnly: true,
      catalogSha256: catalog.catalogSha256,
      actorSha256: result.actorSha256,
    });
  };

  const healthCheck = async () => {
    const payload = await requestJson({
      fetchImpl,
      url: `${config.apiOrigin}/api/v2/health`,
      provider: "PREVIEW_API",
      phase: "live-api",
    });
    requireCondition(payload?.status === "ok", "PREVIEW_API_HEALTH_FAILED", "live-api");
    return sha256(canonicalJson({ status: payload.status, origin: config.apiOrigin }));
  };

  const r2CredentialRouter = createR2CredentialRouter({
    control: (callback) => withSecrets(
      credentials.control,
      ["r2AccessKeyId", "r2SecretAccessKey"],
      callback,
    ),
    mutation: (callback) => withSecrets(
      credentials.mutation,
      ["r2AccessKeyId", "r2SecretAccessKey"],
      callback,
    ),
  });

  const listR2SyntheticObjects = async (phase, role = "mutation") => (
    r2CredentialRouter.use(role,
    async (accessKey, secretKey, sessionToken) => {
      const response = await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PREVIEW_R2,
        query: {
          "list-type": "2",
          "max-keys": MAX_R2_OBJECTS + 1,
          prefix: r2Prefix,
        },
        method: "GET",
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [200],
        phase,
      });
      return parseR2List(response, phase, r2Prefix);
    },
    )
  );

  const verifyR2ProductionDenied = async (phase, role) => (
    r2CredentialRouter.use(role, async (accessKey, secretKey, sessionToken) => {
      const response = await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PRODUCTION_R2,
        query: { "list-type": "2", "max-keys": 1 },
        method: "GET",
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [403],
        phase,
      });
      const body = await boundedText(response, "R2_PRODUCTION_DENIAL_INVALID", phase);
      requireCondition(
        isR2AccessDenied(response.status, body),
        "R2_PRODUCTION_DENIAL_INVALID",
        phase,
      );
      return true;
    })
  );

  const verifyR2PreviewWriteDenied = async (phase) => (
    r2CredentialRouter.use("control", async (accessKey, secretKey, sessionToken) => {
      const key = `${r2Prefix}control-write-denial-${randomUUID()}.txt`;
      const body = Buffer.from("quantgym-phase2-control-write-denial", "utf8");
      const response = await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PREVIEW_R2,
        key,
        method: "PUT",
        body,
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [403],
        phase,
      });
      body.fill(0);
      const denialBody = await boundedText(
        response,
        "R2_PREVIEW_WRITE_DENIAL_INVALID",
        phase,
      );
      requireCondition(
        isR2AccessDenied(response.status, denialBody),
        "R2_PREVIEW_WRITE_DENIAL_INVALID",
        phase,
      );
      const observed = await listR2SyntheticObjects(phase, "control");
      requireCondition(
        !observed.includes(key),
        "R2_PREVIEW_WRITE_DENIAL_INVALID",
        phase,
      );
      return true;
    })
  );

  const storageChecks = async () => r2CredentialRouter.use("mutation",
    async (accessKey, secretKey, sessionToken) => {
      const key = `${r2Prefix}${randomUUID()}.txt`;
      const body = Buffer.from(`quantgym-phase2:${randomUUID()}`, "utf8");
      await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PREVIEW_R2,
        key,
        method: "PUT",
        body,
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [200, 201],
        phase: "live-storage",
      });
      const getResponse = await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PREVIEW_R2,
        key,
        method: "GET",
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [200],
        phase: "live-storage",
      });
      const returned = await readBoundedBytes({
        response: getResponse,
        maximumBytes: 1024 * 1024,
        code: "R2_ROUNDTRIP_FAILED",
        phase: "live-storage",
      });
      try {
        requireCondition(
          returned.length === body.length && returned.equals(body),
          "R2_ROUNDTRIP_FAILED",
          "live-storage",
        );
      } finally {
        returned.fill(0);
      }
      const productionResponse = await r2Request({
        fetchImpl,
        accountId: config.cloudflareAccountId,
        bucket: PRODUCTION_R2,
        key,
        method: "GET",
        accessKey,
        secretKey,
        sessionToken,
        now: now(),
        acceptedStatuses: [403],
        phase: "live-production-denial",
      });
      const productionDenialBody = await boundedText(
        productionResponse,
        "R2_PRODUCTION_DENIAL_INVALID",
        "live-production-denial",
      );
      requireCondition(
        isR2AccessDenied(productionResponse.status, productionDenialBody),
        "R2_PRODUCTION_DENIAL_INVALID",
        "live-production-denial",
      );
      return {
        storage: sha256(body),
        productionDenial: sha256(canonicalJson({
          bucket: PRODUCTION_R2,
          deniedStatus: productionResponse.status,
          denialCode: "AccessDenied",
        })),
      };
    },
  );

  const requireCheckResult = (value, code, phase) => {
    requireCondition(
      exactKeys(value, ["passed", "evidenceSha256"])
        && value.passed === true
        && HASH_PATTERN.test(value.evidenceSha256),
      code,
      phase,
    );
    return value.evidenceSha256;
  };

  const fetchDeployedArtifact = async ({ pathname, maximumBytes, phase }) => {
    let response;
    try {
      const url = new URL(pathname, config.webOrigin);
      url.searchParams.set("phase2", randomUUID());
      response = await fetchImpl(url, {
        cache: "no-store",
        headers: {
          accept: "*/*",
          "cache-control": "no-cache, no-store",
        },
        redirect: "error",
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      fail("DEPLOYED_ARTIFACT_FETCH_FAILED", phase);
    }
    requireCondition(response?.status === 200, "DEPLOYED_ARTIFACT_FETCH_FAILED", phase);
    return readBoundedBytes({
      response,
      maximumBytes,
      code: "DEPLOYED_ARTIFACT_FETCH_FAILED",
      phase,
    });
  };

  const verifyDeployedArtifact = async (expectedCommit) => {
    requireCondition(
      candidateArtifactState?.commit === expectedCommit,
      "CANDIDATE_ARTIFACT_BINDING_INVALID",
      "live-deployed-bundle",
    );
    await verifyCandidateArtifactUnchanged(candidateArtifactState);
    const manifestBytes = await fetchDeployedArtifact({
      pathname: `/${ARTIFACT_MANIFEST_PATH}`,
      maximumBytes: MAX_HTTP_BYTES,
      phase: "live-deployed-bundle",
    });
    let manifest;
    try {
      manifest = JSON.parse(manifestBytes.toString("utf8"));
    } catch {
      fail("DEPLOYED_ARTIFACT_MANIFEST_INVALID", "live-deployed-bundle");
    } finally {
      manifestBytes.fill(0);
    }
    requireCondition(
      exactKeys(manifest, [
        "schemaVersion",
        "deploymentCommit",
        "artifactManifestSha256",
        "files",
      ])
        && manifest.schemaVersion === 1
        && manifest.deploymentCommit === expectedCommit
        && manifest.artifactManifestSha256
          === candidateArtifactState.artifactManifestSha256
        && canonicalJson(manifest.files) === canonicalJson(candidateArtifactState.files),
      "DEPLOYED_ARTIFACT_MANIFEST_INVALID",
      "live-deployed-bundle",
    );
    for (const file of candidateArtifactState.files) {
      const pathname = `/${file.path.split("/").map(encodeURIComponent).join("/")}`;
      const bytes = await fetchDeployedArtifact({
        pathname,
        maximumBytes: Math.max(1, file.bytes),
        phase: "live-deployed-bundle",
      });
      try {
        requireCondition(
          bytes.length === file.bytes && sha256(bytes) === file.sha256,
          "DEPLOYED_ARTIFACT_BYTES_MISMATCH",
          "live-deployed-bundle",
        );
      } finally {
        bytes.fill(0);
      }
    }
    return candidateArtifactState.artifactManifestSha256;
  };

  const runLiveChecks = async (context) => {
    requireMutation(context, "live-checks");
    const apiEvidence = await healthCheck();
    const revision = await databaseRevision({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.mutationDatabase,
      assumeRole: stableDatabaseOwner,
      phase: "live-migration",
    });
    const dailyLoop = await acceptanceCapability.runDailyLoop(Object.freeze({
      apiOrigin: config.apiOrigin,
      expectedCommit: context.expectedCommit,
      webOrigin: config.webOrigin,
    }));
    const accessibility = await acceptanceCapability.runAccessibility(Object.freeze({
      apiOrigin: config.apiOrigin,
      expectedCommit: context.expectedCommit,
      webOrigin: config.webOrigin,
    }));
    const storage = await storageChecks();
    const deployedVisual = await acceptanceCapability.runVisual(Object.freeze({
      apiOrigin: config.apiOrigin,
      expectedCommit: context.expectedCommit,
      webOrigin: config.webOrigin,
    }));
    const artifactManifestSha256 = await verifyDeployedArtifact(context.expectedCommit);
    requireCondition(revision === PHASE2_REVISION, "LIVE_MIGRATION_CHECK_FAILED", "live-migration");
    const checks = [
      { id: "api", status: "pass", evidenceSha256: apiEvidence },
      {
        id: "migration",
        status: "pass",
        evidenceSha256: sha256(`${PHASE2_REVISION}\0${context.expectedCommit}`),
      },
      {
        id: "daily-loop",
        status: "pass",
        evidenceSha256: requireCheckResult(
          dailyLoop,
          "DAILY_LOOP_CHECK_FAILED",
          "live-daily-loop",
        ),
      },
      {
        id: "accessibility",
        status: "pass",
        evidenceSha256: requireCheckResult(
          accessibility,
          "ACCESSIBILITY_CHECK_FAILED",
          "live-accessibility",
        ),
      },
      { id: "storage", status: "pass", evidenceSha256: storage.storage },
      {
        id: "production-denial",
        status: "pass",
        evidenceSha256: storage.productionDenial,
      },
      {
        id: "deployed-visual",
        status: "pass",
        evidenceSha256: requireCheckResult(
          deployedVisual,
          "DEPLOYED_VISUAL_CHECK_FAILED",
          "live-deployed-visual",
        ),
        deploymentCommit: context.expectedCommit,
      },
      {
        id: "deployed-bundle",
        status: "pass",
        evidenceSha256: sha256(canonicalJson({
          artifactManifestSha256,
          deploymentCommit: context.expectedCommit,
          origin: config.webOrigin,
        })),
        deploymentCommit: context.expectedCommit,
        artifactManifestSha256,
      },
    ];
    requireCondition(
      canonicalJson(checks.map(({ id }) => id)) === canonicalJson(PHASE2_LIVE_CHECK_IDS),
      "LIVE_CHECK_INVENTORY_INVALID",
      "live-checks",
    );
    return receipt("live-checks", {
      checks,
    });
  };

  const cleanupR2 = async (phase) => {
    const keys = await listR2SyntheticObjects(phase);
    await r2CredentialRouter.use("mutation", async (accessKey, secretKey, sessionToken) => {
      for (const key of keys) {
        await r2Request({
          fetchImpl,
          accountId: config.cloudflareAccountId,
          bucket: PREVIEW_R2,
          key,
          method: "DELETE",
          accessKey,
          secretKey,
          sessionToken,
          now: now(),
          acceptedStatuses: [200, 204, 404],
          phase,
        });
      }
    });
    const remaining = await listR2SyntheticObjects(phase);
    requireCondition(remaining.length === 0, "R2_CLEANUP_FAILED", phase);
    return remaining.length;
  };

  const cleanupAcceptance = async (context, method, phase) => {
    const result = await acceptanceCapability[method](Object.freeze({
      acceptanceData: context.acceptanceData,
      apiOrigin: config.apiOrigin,
      cleanupDatabase: cleanupAcceptanceDatabase,
      expectedCommit: context.expectedCommit,
      verifyDatabase: verifyAcceptanceDatabase,
      webOrigin: config.webOrigin,
    }));
    requireCondition(
      exactKeys(result, ["syntheticApplicationRows", "syntheticCatalogRows"])
        && result.syntheticApplicationRows === 0
        && result.syntheticCatalogRows === 0,
      "ACCEPTANCE_CLEANUP_FAILED",
      phase,
    );
    return result;
  };

  const cleanup = async (context) => {
    requireMutation(context, "cleanup");
    const [application, r2Count] = await Promise.all([
      cleanupAcceptance(context, "cleanup", "cleanup"),
      cleanupR2("cleanup"),
    ]);
    await updateRecoveryJournal({
      stage: "cleanup-complete",
      mutations: { ...recoveryJournal.mutations, cleanupCompleted: true },
    });
    return receipt("cleanup", {
      syntheticApplicationRows: application.syntheticApplicationRows,
      syntheticR2Objects: r2Count,
      syntheticCatalogRows: application.syntheticCatalogRows,
    });
  };

  const recoverCleanup = async (context) => {
    requireMutation(context, "recovery-cleanup");
    const [application, r2Count] = await Promise.all([
      cleanupAcceptance(context, "cleanup", "recovery-cleanup"),
      cleanupR2("recovery-cleanup"),
    ]);
    return receipt("recovery-cleanup", {
      syntheticApplicationRows: application.syntheticApplicationRows,
      syntheticR2Objects: r2Count,
      syntheticCatalogRows: application.syntheticCatalogRows,
    });
  };

  const rollbackPages = async (context) => {
    requireMutation(context, "rollback-pages");
    requireCondition(
      topologyState?.previewPages?.deploy?.commit === context.target,
      "ROLLBACK_TARGET_INVALID",
      "rollback-pages",
    );
    await cfRequest({
      role: "mutation",
      suffix: (
        `/accounts/${config.cloudflareAccountId}/pages/projects/${PREVIEW_PAGES}`
        + `/deployments/${encodeURIComponent(topologyState.previewPages.deploy.id)}/rollback`
      ),
      method: "POST",
      body: {},
      phase: "rollback-pages",
    });
    await waitForPagesCommit(context.target, "rollback-pages");
    await updateRecoveryJournal({
      stage: "pages-rolled-back",
      mutations: { ...recoveryJournal.mutations, pagesRolledBack: true },
    });
    return receipt("rollback-pages", {
      commit: context.target,
      resourceIdentitySha256: topologyState.resources.pages.identitySha256,
    });
  };

  const rollbackApi = async (context) => {
    requireMutation(context, "rollback-api");
    requireCondition(
      topologyState?.previewApi?.deploy?.commit === context.target,
      "ROLLBACK_TARGET_INVALID",
      "rollback-api",
    );
    const payload = await renderRequest({
      role: "mutation",
      suffix: `/v1/services/${encodeURIComponent(topologyState.previewApi.id)}/rollback`,
      method: "POST",
      body: { deployId: topologyState.previewApi.deploy.id },
      acceptedStatuses: [201],
      phase: "rollback-api",
    });
    const deploy = parseRenderDeploy(payload, "rollback-api");
    await waitForRenderCommit(
      topologyState.previewApi.id,
      deploy.id,
      context.target,
      "rollback-api",
    );
    await updateRecoveryJournal({
      stage: "api-rolled-back",
      mutations: { ...recoveryJournal.mutations, apiRolledBack: true },
    });
    return receipt("rollback-api", {
      commit: context.target,
      resourceIdentitySha256: topologyState.resources.api.identitySha256,
    });
  };

  const restorePreviewDatabase = async (context) => {
    requireMutation(context, "restore-preview-database");
    requireCondition(
      context.backup?.backupSha256 === backupState?.backupSha256,
      "RESTORE_BACKUP_BINDING_INVALID",
      "restore-preview-database",
    );
    const identity = postgresMutationIdentity();
    await restoreInto(identity, "restore-preview-database");
    const [revision, fingerprint, contentSnapshot] = await Promise.all([
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity,
        assumeRole: stableDatabaseOwner,
        phase: "restore-preview-database",
      }),
      schemaFingerprint({
        commandRunner,
        pgDumpPath: tools.pgDumpPath,
        identity,
        stableOwner: stableDatabaseOwner,
        phase: "restore-preview-database",
      }),
      captureDatabaseContentSnapshot({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity,
        stableOwner: stableDatabaseOwner,
        phase: "restore-preview-database",
      }),
    ]);
    requireCondition(
      revision === PHASE1_REVISION
        && fingerprint === backupState.sourceSchemaSha256
        && sameDatabaseContentSnapshot(
          contentSnapshot,
          backupState.sourceContentSnapshot,
        ),
      "PREVIEW_DATABASE_RECOVERY_FAILED",
      "restore-preview-database",
    );
    await updateRecoveryJournal({
      stage: "database-restored",
      mutations: { ...recoveryJournal.mutations, databaseRestored: true },
    });
    return receipt("restore-preview-database", {
      backupSha256: backupState.backupSha256,
      sourceResourceSha256: backupState.sourceResourceSha256,
      restoredRevision: revision,
      restoredSchemaSha256: fingerprint,
      restoredContentSnapshot: contentSnapshot,
    });
  };

  const verifyRecovery = async (context) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "verify-recovery",
    );
    const [topology, application, remainingR2] = await Promise.all([
      readTopology("verify-recovery", { controlOnly: context.postRevoke === true }),
      acceptanceCapability.verifyRecovery(Object.freeze({
        apiOrigin: config.apiOrigin,
        expectedCommit: context.expectedCommit,
        verifyDatabase: verifyAcceptanceDatabase,
        webOrigin: config.webOrigin,
      })),
      listR2SyntheticObjects(
        "verify-recovery",
        ACTION_CREDENTIAL_SCOPES.verifyRecovery.r2,
      ),
    ]);
    requireCondition(
      canonicalJson(topology.details.previewAnchor)
        === canonicalJson(context.expectedPreviewAnchor)
        && canonicalJson(topology.details.productionAnchor)
          === canonicalJson(context.expectedProductionAnchor)
        && exactKeys(application, ["syntheticApplicationRows", "syntheticCatalogRows"])
        && application.syntheticApplicationRows === 0
        && application.syntheticCatalogRows === 0
        && remainingR2.length === 0,
      "RECOVERY_VERIFICATION_FAILED",
      "verify-recovery",
    );
    return receipt("verify-recovery", {
      resources: topology.details.resources,
      productionAnchor: topology.details.productionAnchor,
      previewAnchor: topology.details.previewAnchor,
      syntheticApplicationRows: 0,
      syntheticR2Objects: 0,
      syntheticCatalogRows: 0,
    });
  };

  const deleteCloudflareToken = async (tokenId, phase) => (
    credentials.mutation.get("cloudflareApiToken").use(async (token) => {
      let response;
      try {
        response = await fetchImpl(
          (
            `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}`
            + `/tokens/${encodeURIComponent(tokenId)}`
          ),
          {
            method: "DELETE",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${token}`,
            },
            redirect: "error",
            signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
          },
        );
      } catch {
        fail("CLOUDFLARE_REVOKE_FAILED", phase);
      }
      requireCondition(
        response?.status === 200,
        "CLOUDFLARE_REVOKE_FAILED",
        phase,
      );
      const payload = await readBoundedResponse(response, phase);
      requireCondition(
        payload?.success === true
          && clean(payload?.result?.id).toLowerCase() === tokenId.toLowerCase(),
        "CLOUDFLARE_REVOKE_FAILED",
        phase,
      );
    })
  );

  const observeCloudflareAccountToken = async (tokenId, phase) => (
    credentials.control.get("cloudflareApiToken").use(async (token) => {
      let response;
      try {
        response = await fetchImpl(
          (
            `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}`
            + `/tokens/${encodeURIComponent(tokenId)}`
          ),
          {
            method: "GET",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${token}`,
            },
            redirect: "error",
            signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
          },
        );
      } catch {
        fail("CLOUDFLARE_REVOKE_OBSERVATION_FAILED", phase);
      }
      requireCondition(
        response && new Set([200, 404]).has(response.status),
        "CLOUDFLARE_REVOKE_OBSERVATION_FAILED",
        phase,
      );
      const payload = await readBoundedResponse(response, phase);
      if (response.status === 404) {
        requireCondition(
          payload?.success === false
            && (payload?.result === null || payload?.result === undefined)
            && Array.isArray(payload?.errors)
            && payload.errors.length > 0
            && payload.errors.every((error) => (
              Number.isSafeInteger(error?.code)
                && error.code >= 1_000
                && clean(error?.message)
            )),
          "CLOUDFLARE_REVOKE_OBSERVATION_FAILED",
          phase,
        );
        return "absent";
      }
      const observedId = clean(payload?.result?.id).toLowerCase();
      const status = clean(payload?.result?.status).toLowerCase();
      requireCondition(
        payload?.success === true
          && observedId === tokenId.toLowerCase()
          && status === "active",
        "CLOUDFLARE_REVOKE_OBSERVATION_FAILED",
        phase,
      );
      return "active";
    })
  );

  const listCloudflareAccountTokenIds = async (phase) => {
    const ids = [];
    const seen = new Set();
    for (let page = 1; page <= 100; page += 1) {
      const payload = await cfRequest({
        role: "control",
        suffix: (
          `/accounts/${config.cloudflareAccountId}/tokens`
          + `?page=${page}&per_page=50&direction=desc&include_expired=true`
        ),
        phase,
      });
      requireCondition(Array.isArray(payload?.result), "CLOUDFLARE_TOKEN_LIST_INVALID", phase);
      for (const token of payload.result) {
        const id = clean(token?.id).toLowerCase();
        requireCondition(
          TOKEN_ID_PATTERN.test(id) && !seen.has(id),
          "CLOUDFLARE_TOKEN_LIST_INVALID",
          phase,
        );
        seen.add(id);
        ids.push(id);
      }
      const resultInfo = payload?.result_info;
      const totalCount = Number(resultInfo?.total_count);
      const totalPages = Math.max(1, Math.ceil(totalCount / 50));
      const resultInfoKeys = new Set([
        "page",
        "per_page",
        "count",
        "total_count",
        "total_pages",
      ]);
      requireCondition(
        isPlainObject(resultInfo)
          && ["page", "per_page", "count", "total_count"]
            .every((key) => Object.hasOwn(resultInfo, key))
          && Object.keys(resultInfo).every((key) => resultInfoKeys.has(key))
          && resultInfo.page === page
          && resultInfo.per_page === 50
          && resultInfo.count === payload.result.length
          && Number.isSafeInteger(totalCount)
          && totalCount >= ids.length
          && (
            resultInfo.total_pages === undefined
            || resultInfo.total_pages === totalPages
          )
          && totalPages <= 100,
        "CLOUDFLARE_TOKEN_LIST_INVALID",
        phase,
      );
      if (page >= totalPages) {
        requireCondition(
          ids.length === totalCount,
          "CLOUDFLARE_TOKEN_LIST_INVALID",
          phase,
        );
        return ids;
      }
    }
    fail("CLOUDFLARE_TOKEN_LIST_INVALID", phase);
  };

  const verifyCloudflareAccountTokenDestroyed = async (tokenId, phase) => {
    for (let observation = 0; observation < 2; observation += 1) {
      const [detailState, ids] = await Promise.all([
        observeCloudflareAccountToken(tokenId, phase),
        listCloudflareAccountTokenIds(phase),
      ]);
      requireCondition(
        detailState === "absent" && !ids.includes(tokenId.toLowerCase()),
        "CLOUDFLARE_REVOKE_VERIFY_FAILED",
        phase,
      );
      if (observation === 0) await delay(2_000);
    }
  };

  const r2CredentialDeniedForBucket = async (bucket, phase) => (
    r2CredentialRouter.use(
      "mutation",
      async (accessKey, secretKey, sessionToken) => {
        const response = await r2Request({
          fetchImpl,
          accountId: config.cloudflareAccountId,
          bucket,
          query: { "list-type": "2", "max-keys": 1, prefix: r2Prefix },
          method: "GET",
          accessKey,
          secretKey,
          sessionToken,
          now: now(),
          acceptedStatuses: [401],
          phase,
        });
        const body = await boundedText(response, "R2_REVOKE_VERIFY_FAILED", phase);
        return response.status === 401
          && /<Code>Unauthorized<\/Code>/u.test(body);
      },
    ).catch(() => false)
  );

  const ensureR2PreRevokeProof = async (tokenId, providerState, phase) => {
    const credentialIdentitySha256 = r2MutationCredentialIdentitySha256(tokenId);
    const existing = recoveryJournal?.preflightProofs?.r2PreviewRead;
    if (existing !== null && existing !== undefined) {
      requireCondition(
        existing.credentialIdentitySha256 === credentialIdentitySha256
          && existing.credentialBoundarySha256 === recoveryBoundarySha256,
        "R2_PRE_REVOKE_PROOF_INVALID",
        phase,
      );
      return existing;
    }
    requireCondition(
      recoveryMode && providerState === "active",
      "R2_PRE_REVOKE_PROOF_REQUIRED",
      phase,
    );
    const tokenPayload = await cfRequest({
      role: "control",
      suffix: (
        `/accounts/${config.cloudflareAccountId}/tokens/${encodeURIComponent(tokenId)}`
      ),
      phase,
    });
    const [scope, productionAccessDenied, previewObjects] = await Promise.all([
      r2MutationScopeProof(tokenId, tokenPayload, phase, { allowRecoveryAge: true }),
      verifyR2ProductionDenied(phase, "mutation"),
      listR2SyntheticObjects(phase, "mutation"),
    ]);
    requireCondition(
      scope.bucketBound === true
        && scope.policyReadWrite === true
        && productionAccessDenied === true
        && previewObjects.length === 0,
      "R2_PRE_REVOKE_PROOF_FAILED",
      phase,
    );
    const proof = Object.freeze({
      credentialIdentitySha256,
      credentialBoundarySha256: recoveryBoundarySha256,
      operationSha256: sha256(canonicalJson({
        bucket: PREVIEW_R2,
        credentialIdentitySha256,
        method: "GET",
        objectCount: previewObjects.length,
        prefix: r2Prefix,
        productionAccessDenied,
        status: 200,
      })),
    });
    await updateRecoveryJournal((current) => ({
      stage: "recovery-r2-preview-read-proven",
      preflightProofs: { ...current.preflightProofs, r2PreviewRead: proof },
    }));
    return proof;
  };

  const revokeR2Credential = async (phase) => {
    const tokenId = await credentials.mutation.get("r2ParentTokenId").use(
      async (value) => value,
    );
    let providerState = await observeCloudflareAccountToken(tokenId, phase);
    await ensureR2PreRevokeProof(tokenId, providerState, phase);
    const recoveryConvergence = recoveryJournal.revocationAttempts.r2 === true;
    if (providerState === "absent") {
      requireCondition(recoveryConvergence, "R2_REVOKE_SEQUENCE_INVALID", phase);
    }
    if (providerState === "active") {
      if (!recoveryConvergence) {
        await updateRecoveryJournal((current) => ({
          stage: "r2-revoke-attempted",
          revocationAttempts: { ...current.revocationAttempts, r2: true },
        }));
      }
      await deleteCloudflareToken(tokenId, phase);
    }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      providerState = await observeCloudflareAccountToken(tokenId, phase);
      if (providerState !== "active") break;
      if (attempt < 11) await delay(2_000);
    }
    requireCondition(providerState === "absent", "R2_REVOKE_VERIFY_FAILED", phase);
    await verifyCloudflareAccountTokenDestroyed(tokenId, phase);
    const previewDenied = await r2CredentialDeniedForBucket(PREVIEW_R2, phase);
    requireCondition(
      previewDenied,
      "R2_REVOKE_VERIFY_FAILED",
      phase,
    );
    revocationState.r2 = true;
    await updateRecoveryJournal((current) => ({
      stage: "r2-revoked",
      revocations: { ...current.revocations, r2: true },
    }));
  };

  const revokeCloudflareCredential = async (phase) => {
    const tokenId = await credentials.mutation.get("cloudflareAccountTokenId").use(
      async (value) => value,
    );
    let providerState = await observeCloudflareAccountToken(tokenId, phase);
    const recoveryConvergence = recoveryJournal.revocationAttempts.cloudflare === true;
    if (providerState === "absent") {
      requireCondition(
        recoveryConvergence || recoveryMode,
        "CLOUDFLARE_REVOKE_SEQUENCE_INVALID",
        phase,
      );
      if (!recoveryConvergence) {
        // Recovery may resume after an independently confirmed compensating
        // self-revocation. The control credential still proves both detail and
        // inventory absence below, while the revoked bearer must return 401.
        await updateRecoveryJournal((current) => ({
          stage: "cloudflare-revoke-attempted",
          revocationAttempts: { ...current.revocationAttempts, cloudflare: true },
        }));
      }
    }
    if (providerState === "active") {
      if (!recoveryConvergence) {
        await updateRecoveryJournal((current) => ({
          stage: "cloudflare-revoke-attempted",
          revocationAttempts: { ...current.revocationAttempts, cloudflare: true },
        }));
      }
      await deleteCloudflareToken(tokenId, phase);
    }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      providerState = await observeCloudflareAccountToken(tokenId, phase);
      if (providerState !== "active") break;
      if (attempt < 11) await delay(2_000);
    }
    requireCondition(
      providerState === "absent",
      "CLOUDFLARE_REVOKE_VERIFY_FAILED",
      phase,
    );
    await verifyCloudflareAccountTokenDestroyed(tokenId, phase);
    let denied = false;
    await credentials.mutation.get("cloudflareApiToken").use(async (token) => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (denied) break;
        try {
          const response = await fetchImpl(
            (
              `https://api.cloudflare.com/client/v4/accounts/`
              + `${config.cloudflareAccountId}/tokens/verify`
            ),
            {
              method: "GET",
              headers: {
                accept: "application/json",
                authorization: `Bearer ${token}`,
              },
              redirect: "error",
              signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
            },
          );
          requireCondition(
            response?.status === 401,
            "CLOUDFLARE_REVOKE_VERIFY_FAILED",
            phase,
          );
          const payload = await readBoundedResponse(response, phase);
          denied = payload?.success === false
            && (payload?.result === null || payload?.result === undefined)
            && Array.isArray(payload?.errors)
            && payload.errors.length > 0
            && payload.errors.every((error) => (
              Number.isSafeInteger(error?.code)
                && error.code >= 1_000
                && Boolean(clean(error?.message))
            ));
        } catch {
          denied = false;
        }
        if (denied) break;
        if (attempt < 11) await delay(2_000);
      }
    });
    requireCondition(denied, "CLOUDFLARE_REVOKE_VERIFY_FAILED", phase);
    revocationState.cloudflare = true;
    await updateRecoveryJournal((current) => ({
      stage: "cloudflare-revoked",
      revocations: { ...current.revocations, cloudflare: true },
    }));
  };

  const revokeRenderCredential = async (phase) => {
    if (revocationState.render && !recoveryMode) return;
    const recoveryConvergence = recoveryJournal.revocationAttempts.render === true;
    if (!recoveryConvergence) {
      await updateRecoveryJournal((current) => ({
        stage: "render-revoke-attempted",
        revocationAttempts: { ...current.revocationAttempts, render: true },
      }));
    }
    const result = await revocationCapability.revokeRender(Object.freeze({
      revoke: () => revokeRenderOauthCredential({
        secretSet: credentials.mutation,
        phase,
        allowAlreadyDenied: recoveryConvergence,
      }),
    }));
    requireCondition(
      result?.revoked === true
        && result.accessDenied === true
        && result.refreshDenied === true
        && (result.revoke204Observed === true || recoveryConvergence),
      "RENDER_REVOKE_FAILED",
      phase,
    );
    revocationState.render = true;
    await updateRecoveryJournal((current) => ({
      stage: "render-revoked",
      revocations: { ...current.revocations, render: true },
    }));
    credentials.mutation.get("renderAccessToken").clear();
    credentials.mutation.get("renderRefreshToken").clear();
  };

  const revokePostgresCredentials = async (
    phase,
    { includeControl = false } = {},
  ) => {
    if (revocationState.postgres && !includeControl && !recoveryMode) return;
    if (
      recoveryMode
      && postgresRolesCreated === false
      && recoveryJournal.postgresAccess.created === false
    ) {
      for (let observation = 0; observation < 2; observation += 1) {
        const present = await controlPostgresRolesPresent(
          Object.values(credentials.postgresRoles),
          phase,
        );
        requireCondition(
          present.size === 0,
          "POSTGRES_REVOKE_VERIFY_FAILED",
          phase,
        );
        if (observation === 0) await delay(2_000);
      }
      revocationState.postgres = true;
      await updateRecoveryJournal((current) => ({
        stage: "postgres-roles-confirmed-absent",
        revocationAttempts: {
          ...current.revocationAttempts,
          postgres: { control: true, mutation: true, restore: true },
        },
        revocations: {
          ...current.revocations,
          postgres: { control: true, mutation: true, restore: true },
        },
      }));
      return {
        revoked: true,
        controlContinuity: true,
        requiredRolesAbsent: true,
        terminalControlRetained: false,
      };
    }
    await bindPreviewPostgresInventory(phase);
    stableDatabaseOwner ??= await discoverStableDatabaseOwner(phase);
    const result = await revocationCapability.revokePostgres(Object.freeze({
      revoke: async () => {
        const terminalControlExpected = !includeControl && (
          postgresRolesCreated || recoveryJournal.postgresAccess.created
        );
        await revokePostgresIdentity("restore", phase);
        await revokePostgresIdentity("mutation", phase);
        if (includeControl) {
          await revokePostgresIdentity("control", phase, { deferJournalAck: true });
        }
        const expectedRoles = includeControl
          ? new Set()
          : new Set(terminalControlExpected ? [credentials.postgresRoles.control] : []);
        for (let observation = 0; observation < 2; observation += 1) {
          const [present, finalInventoryValid] = await Promise.all([
            controlPostgresRolesPresent(Object.values(credentials.postgresRoles), phase),
            providerPostgresFinalInventoryValid(phase),
          ]);
          requireCondition(
            canonicalJson([...present].sort())
              === canonicalJson([...expectedRoles].sort())
              && finalInventoryValid,
            "POSTGRES_REVOKE_VERIFY_FAILED",
            phase,
          );
          if (observation === 0) await delay(2_000);
        }
        const controlLogin = includeControl || !terminalControlExpected
          ? await pgQuery({
            commandRunner,
            psqlPath: tools.psqlPath,
            identity: credentials.adminDatabase,
            phase,
            sql: "SELECT current_user || '|' || current_setting('transaction_read_only');",
          })
          : `${credentials.controlDatabase.user}|on`;
        if (terminalControlExpected) {
          await verifyControlDatabaseReadOnly({
            commandRunner,
            psqlPath: tools.psqlPath,
            identity: credentials.controlDatabase,
          });
          await verifyControlDatabaseWriteDenied({
            commandRunner,
            psqlPath: tools.psqlPath,
            identity: credentials.controlDatabase,
            phase,
          });
        }
        const continuityUser = terminalControlExpected
          ? credentials.controlDatabase.user
          : credentials.adminDatabase.user;
        requireCondition(
          controlLogin === `${continuityUser}|on`,
          "POSTGRES_CONTROL_CONTINUITY_FAILED",
          phase,
        );
        if (includeControl) {
          postgresRolesCreated = false;
          await updateRecoveryJournal((current) => ({
            stage: "postgres-control-revoked",
            postgresAccess: { ...current.postgresAccess, created: false },
            revocations: {
              ...current.revocations,
              postgres: { ...current.revocations.postgres, control: true },
            },
          }));
        }
        return {
          revoked: true,
          controlContinuity: true,
          requiredRolesAbsent: true,
          terminalControlRetained: terminalControlExpected,
        };
      },
    }));
    requireCondition(
      result?.revoked === true
        && result.controlContinuity === true
        && result.requiredRolesAbsent === true
        && result.terminalControlRetained === (
          !includeControl && (postgresRolesCreated || recoveryJournal.postgresAccess.created)
        ),
      "POSTGRES_REVOKE_FAILED",
      phase,
    );
    revocationState.postgres = true;
    return result;
  };

  const reverifyAcknowledgedTerminalPostgresControl = async (phase) => {
    requireCondition(
      recoveryJournal.revocations.postgres.control === true
        && recoveryJournal.revocations.postgres.mutation === true
        && recoveryJournal.revocations.postgres.restore === true
        && recoveryJournal.postgresAccess.created === false
        && HASH_PATTERN.test(providerPostgresBaselineSha256 ?? "")
        && isPlainObject(boundPreviewPostgres)
        && HASH_PATTERN.test(boundPreviewPostgres.resourceIdentitySha256 ?? ""),
      "TERMINAL_POSTGRES_ACK_INVALID",
      phase,
    );
    const temporaryRoles = Object.values(credentials.postgresRoles);
    for (let observation = 0; observation < 2; observation += 1) {
      const present = await controlPostgresRolesPresent(temporaryRoles, phase);
      requireCondition(
        present.size === 0,
        "POSTGRES_REVOKE_VERIFY_FAILED",
        phase,
      );
      if (observation === 0) await delay(2_000);
    }
    const [controlLogin, revision] = await Promise.all([
      pgQuery({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.adminDatabase,
        phase,
        sql: "SELECT current_user || '|' || current_setting('transaction_read_only');",
      }),
      databaseRevision({
        commandRunner,
        psqlPath: tools.psqlPath,
        identity: credentials.adminDatabase,
        phase,
      }),
    ]);
    requireCondition(
      controlLogin === `${credentials.adminDatabase.user}|on`
        && revision === PHASE2_REVISION,
      "POSTGRES_CONTROL_CONTINUITY_FAILED",
      phase,
    );
    const proof = postgresRevocationProofFor("control");
    postgresRevocationProofs.set("control", proof);
    revocationState.postgres = true;
    return proof;
  };

  const clearBackup = async () => {
    if (!backupDirectory && !backupState?.directory) return;
    try {
      await rm(backupDirectory ?? backupState.directory, { force: true, recursive: true });
    } catch {
      fail("BACKUP_CLEANUP_FAILED", "credential-revoke");
    }
    backupState = undefined;
    backupDirectory = undefined;
  };

  const revokeMutationCredentials = async (context, phase) => {
    try {
      requireMutation(context, phase);
      const dependencyResults = await Promise.allSettled([
        revokePostgresCredentials(phase),
        revokeR2Credential(phase),
      ]);
      requireCondition(
        dependencyResults.every((result) => result.status === "fulfilled"),
        "MUTATION_REVOKE_DEPENDENCY_FAILED",
        phase,
      );
      const terminalResults = await Promise.allSettled([
        revokeCloudflareCredential(phase),
        revokeRenderCredential(phase),
      ]);
      requireCondition(
        terminalResults.every(
          (result) => result.status === "fulfilled",
        ) && Object.values(revocationState).every(Boolean),
        "MUTATION_REVOKE_INCOMPLETE",
        phase,
      );
      await clearBackup();
      await updateRecoveryJournal({
        backup: null,
        stage: "mutation-access-revoked",
      });
      return receipt(phase, {
        cloudflareRevoked: true,
        renderRevoked: true,
        postgresRevoked: true,
        r2Revoked: true,
        mutationCredentialsRevoked: true,
        controlIdentityRetained: true,
        remainingReadOnlyControlProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryControlProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalRevocationRequired: true,
        terminalRevocationPending: true,
        postgresControlRevocationPending: true,
        renderControlRevocationPending: true,
        postgresProviderCredentialInventoryUnchanged: true,
        postgresProviderCredentialInventorySha256: providerPostgresBaselineSha256,
        renderControlCredentialIdentitySha256: controlRenderCredentialIdentitySha256,
        revokedMutationTokenBindings: mutationTokenBindings ?? Object.freeze({
          recoveryOnly: true,
          evidenceSha256: sha256("quantgym-phase2-recovery-only-revocation"),
        }),
        postgresIdentities: ["mutation", "restore"].map(
          (kind) => postgresRevocationProofs.get(kind),
        ),
      });
    } catch (error) {
      throw annotateMutationRevocationFailure(error, revocationState, phase);
    }
  };

  const revokeTemporaryAccess = (context) => (
    revokeMutationCredentials(context, "credential-revoke")
  );
  const emergencyRevoke = async (context) => {
    requireCondition(
      context?.recovery === true,
      "EMERGENCY_REVOKE_CONTEXT_INVALID",
      "emergency-revoke",
    );
    tools ??= await verifyToolchain({ config, commandRunner, root: resolvedRoot });
    return revokeMutationCredentials(context, "emergency-revoke");
  };

  const preflight = async (context = {}) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "operator-preflight",
    );
    const { expectedCommit } = context;
    requireCondition(!preflightComplete, "OPERATOR_PREFLIGHT_ALREADY_RUN", "operator-preflight");
    requireCondition(SHA_PATTERN.test(expectedCommit ?? ""), "EXPECTED_COMMIT_INVALID", "operator-preflight");
    requireCondition(
      candidateGateState?.expectedCommit === expectedCommit,
      "CANDIDATE_GATE_REQUIRED",
      "operator-preflight",
    );
    tools = await verifyToolchain({
      config,
      commandRunner,
      root: resolvedRoot,
    });
    catalog = await verifyRightsCatalog(resolvedRoot);
    const postgresBootstrapProof = await verifyPostgresBootstrapPreflight(
      "postgres-bootstrap-preflight",
    );
    if (recoveryJournal?.baseline === null) {
      const baselineTopology = await readTopology("preflight-baseline");
      await updateRecoveryJournal({
        stage: "preflight-baseline",
        baseline: {
          previewApi: structuredClone(topologyState.previewApi),
          previewLlm: structuredClone(topologyState.previewLlm),
          previewPages: structuredClone(topologyState.previewPages),
          previewPostgres: structuredClone(topologyState.previewPostgres),
          resources: structuredClone(baselineTopology.details.resources),
          productionAnchor: structuredClone(baselineTopology.details.productionAnchor),
          previewAnchor: structuredClone(baselineTopology.details.previewAnchor),
        },
      });
    }
    await createSqlManagedPostgresRoles("postgres-role-bootstrap");
    let controlBoundaryProof;
    const [acceptanceReady, controlReady, revocationReady] = await Promise.all([
      acceptanceCapability.preflight(Object.freeze({
        apiOrigin: config.apiOrigin,
        catalogPath: catalog.catalogPath,
        expectedCommit,
        webOrigin: config.webOrigin,
      })),
      controlCapability.preflight(Object.freeze({
        remainingReadOnlyProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
        terminalTemporaryUnscopedProviders: (
          TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS
        ),
        terminalTemporaryProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
        terminalRevocationRequired: true,
        probe: async () => {
          const [
            github,
            cloudflare,
            renderUser,
            revision,
            r2Objects,
            controlDatabaseAcl,
            controlDatabaseDenials,
          ] = await Promise.all([
            githubRequest(`/repos/${REPOSITORY}`, "control-capability-preflight"),
            cfRequest({
              role: "control",
              suffix: `/accounts/${config.cloudflareAccountId}/tokens/verify`,
              phase: "control-capability-preflight",
            }),
            renderRequest({
              role: "control",
              suffix: "/v1/users",
              phase: "control-capability-preflight",
            }),
            databaseRevision({
              commandRunner,
              psqlPath: tools.psqlPath,
              identity: credentials.controlDatabase,
              phase: "control-capability-preflight",
            }),
            listR2SyntheticObjects("control-capability-preflight", "control"),
            verifyControlDatabaseReadOnly({
              commandRunner,
              psqlPath: tools.psqlPath,
              identity: credentials.controlDatabase,
            }),
            verifyControlDatabaseWriteDenied({
              commandRunner,
              psqlPath: tools.psqlPath,
              identity: credentials.controlDatabase,
              phase: "control-capability-preflight",
            }),
          ]);
          const [
            cloudflareScope,
            r2ControlScope,
            productionR2Denied,
            previewR2WriteDenied,
          ] = await Promise.all([
            cloudflareReadOnlyScopeProof(
              cloudflare,
              "control-capability-preflight",
            ),
            r2ControlReadOnlyScopeProof("control-capability-preflight"),
            verifyR2ProductionDenied("control-capability-preflight", "control"),
            verifyR2PreviewWriteDenied("control-capability-preflight"),
          ]);
          requireCondition(
            clean(github?.full_name).toLowerCase() === REPOSITORY.toLowerCase()
              && github?.private === false
              && clean(github?.visibility) === "public"
              && cloudflare?.result?.status === "active"
              && cloudflareScope.accountBound === true
              && cloudflareScope.readOnly === true
              && r2ControlScope.bucketBound === true
              && r2ControlScope.policyReadOnly === true
              && clean(currentRenderUser(
                renderUser,
                "control-capability-preflight",
              )?.id)
              && new Set([PHASE1_REVISION, PHASE2_REVISION]).has(revision)
              && r2Objects.length === 0
              && productionR2Denied === true
              && previewR2WriteDenied === true,
            "CONTROL_CAPABILITY_UNAVAILABLE",
            "capability-preflight",
          );
          const renderUserId = currentRenderUser(
            renderUser,
            "control-capability-preflight",
          ).id;
          controlBoundaryProof = Object.freeze({
            remainingReadOnlyControlProofs: Object.freeze({
              cloudflare: Object.freeze({
                accountBound: true,
                providerScopeReadOnly: true,
                evidenceSha256: sha256(canonicalJson({
                  permissionNamesSha256: cloudflareScope.permissionNamesSha256,
                  tokenIdentitySha256: cloudflareScope.tokenIdentitySha256,
                })),
              }),
              r2: Object.freeze({
                policyBucketBound: true,
                policyReadOnly: true,
                previewReadSucceeded: true,
                previewWriteDenied: true,
                productionAccessDenied: true,
                evidenceSha256: sha256(canonicalJson({
                  policySha256: r2ControlScope.policySha256,
                  previewObjectCount: r2Objects.length,
                  previewWriteDenied: previewR2WriteDenied,
                  productionAccessDenied: productionR2Denied,
                })),
              }),
            }),
            terminalTemporaryControl: Object.freeze({
              providers: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
              unscopedProviders: TERMINAL_TEMPORARY_UNSCOPED_CONTROL_PROVIDERS,
              terminalRevocationRequired: true,
              postgres: Object.freeze({
                applicationDmlDenied: controlDatabaseDenials.applicationDmlDenied,
                ddlDenied: controlDatabaseDenials.ddlDenied,
                largeObjectCreationDenied: controlDatabaseDenials.largeObjectCreationDenied,
                selectSucceeded: true,
                sqlManagedTemporaryRole: controlDatabaseAcl.sqlManagedTemporaryRole,
                transactionReadOnly: controlDatabaseAcl.transactionReadOnly,
                finalDropRequired: true,
                providerCredentialInventoryUnchanged: true,
                providerCredentialInventorySha256: (
                  postgresBootstrapProof.providerInventorySha256
                ),
                persistentProviderAdmin: persistentProviderAdminProof(
                  postgresBootstrapProof.providerInventorySha256,
                ),
                evidenceSha256: sha256(canonicalJson({
                  controlDatabaseAcl,
                  controlDatabaseDenials,
                  postgresBootstrapProof,
                  revision,
                  usernameSha256: sha256(credentials.controlDatabase.user),
                })),
              }),
              renderCredentialIdentitySha256: controlRenderCredentialIdentitySha256,
            }),
          });
          return controlBoundaryProof;
        },
      })),
      revocationCapability.preflight(Object.freeze({
        readOnly: true,
        probe: async () => ({
          ready: true,
          evidenceSha256: sha256(canonicalJson(await bindMutationCredentials())),
        }),
      })),
    ]);
    verifyCapabilityReceipt(
      acceptanceReady,
      "ACCEPTANCE_CAPABILITY_UNAVAILABLE",
      "capability-preflight",
    );
    verifyControlCapabilityReceipt(controlReady);
    requireCondition(
      isPlainObject(controlBoundaryProof),
      "CONTROL_CAPABILITY_UNAVAILABLE",
      "capability-preflight",
    );
    verifyCapabilityReceipt(
      revocationReady,
      "REVOCATION_CAPABILITY_UNAVAILABLE",
      "capability-preflight",
    );
    await verifyControlDatabaseReadOnly({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.controlDatabase,
    });
    await verifyControlDatabaseWriteDenied({
      commandRunner,
      psqlPath: tools.psqlPath,
      identity: credentials.controlDatabase,
    });
    const [controlR2Objects, mutationR2Objects] = await Promise.all([
      listR2SyntheticObjects("control-r2-preflight", "control"),
      listR2SyntheticObjects("mutation-r2-preflight", "mutation"),
    ]);
    requireCondition(
      controlR2Objects.length === 0 && mutationR2Objects.length === 0,
      "R2_RUN_PREFIX_NOT_EMPTY",
      "operator-preflight",
    );
    candidateArtifactState = await createDetachedCandidateArtifact({
      root: resolvedRoot,
      commit: expectedCommit,
      commandRunner,
      npmCliPath: tools.npmCliPath,
    });
    const pytestDirectory = await mkdtemp(path.join(
      tmpdir(),
      "quantgym-phase2-local-downgrade-",
    )).catch(() => fail("LOCAL_DOWNGRADE_GATE_FAILED", "operator-preflight"));
    const junitPath = path.join(pytestDirectory, "pytest-junit.xml");
    try {
      const pytestResult = await runSafeCommand(commandRunner, {
        file: tools.pythonPath,
        args: [
          "-B",
          "-m",
          "pytest",
          "-q",
          "--strict-config",
          "--strict-markers",
          "-ra",
          (
            "api/tests/test_migrations.py"
            + "::test_postgres18_phase2_upgrade_downgrade_upgrade_normalized_fingerprint"
          ),
          `--junitxml=${junitPath}`,
        ],
        cwd: resolvedRoot,
        env: {
          HOME: process.env.HOME ?? tmpdir(),
          LANG: "C",
          LC_ALL: "C",
          PATH: "/usr/bin:/bin",
          PYTHONPATH: resolvedRoot,
        },
        timeoutMs: 15 * 60 * 1_000,
      }, "LOCAL_DOWNGRADE_GATE_FAILED", "operator-preflight");
      let junitXml;
      try {
        junitXml = await readFile(junitPath, "utf8");
        const totals = parseStrictPytestEvidence({
          junitXml,
          stdout: pytestResult.stdout,
          stderr: pytestResult.stderr,
          expectedCount: 1,
          expectedFiles: ["api/tests/test_migrations.py"],
        });
        requireCondition(
          totals.tests === 1
            && totals.failures === 0
            && totals.errors === 0
            && totals.skipped === 0,
          "LOCAL_DOWNGRADE_GATE_FAILED",
          "operator-preflight",
        );
      } catch (error) {
        if (error instanceof Phase2OperatorError) throw error;
        fail("LOCAL_DOWNGRADE_GATE_FAILED", "operator-preflight");
      }
    } finally {
      await rm(pytestDirectory, { force: true, recursive: true }).catch(() => {});
    }
    preflightComplete = true;
    return receipt("operator-preflight", {
      candidateCommit: expectedCommit,
      capabilitiesReady: true,
      toolchainReady: true,
      controlDatabaseReadOnly: true,
      previewR2RunPrefixEmpty: true,
      mutationR2RunPrefixEmpty: true,
      frontendBuildPassed: true,
      localDowngradeGatePassed: true,
      proxyLoopback: config.httpsProxy.loopback,
      proxyIdentitySha256: config.httpsProxy.identitySha256,
      remainingReadOnlyControlProofs: controlBoundaryProof.remainingReadOnlyControlProofs,
      terminalTemporaryControl: controlBoundaryProof.terminalTemporaryControl,
      mutationTokenBindings,
    });
  };

  const revalidateSustainableTerminalContinuity = async ({
    continuityBasis,
    phase,
  }) => {
    requireCondition(
      isPlainObject(continuityBasis),
      "TERMINAL_CONTINUITY_REVALIDATION_FAILED",
      phase,
    );
    const account = config.cloudflareAccountId;
    const revalidation = await runTimedObservationBatch({
      now,
      phase,
      probes: [
        () => inspectPullRequest({ credentialRole: credentials.descriptors.control }),
        () => healthCheck(),
        () => databaseRevision({
          commandRunner,
          psqlPath: tools.psqlPath,
          identity: credentials.adminDatabase,
          phase,
        }),
        () => listR2SyntheticObjects(phase, "control"),
        () => r2ControlReadOnlyScopeProof(phase),
        () => verifyR2PreviewWriteDenied(phase),
        () => verifyR2ProductionDenied(phase, "control"),
        () => cfRequest({
          role: "control",
          suffix: `/accounts/${account}/pages/projects/${PREVIEW_PAGES}`,
          phase,
        }),
        () => cfRequest({
          role: "control",
          suffix: `/accounts/${account}/pages/projects/${PRODUCTION_PAGES}`,
          phase,
        }),
        () => cfRequest({
          role: "control",
          suffix: `/accounts/${account}/r2/buckets/${PREVIEW_R2}`,
          phase,
        }),
        () => cfRequest({
          role: "control",
          suffix: `/accounts/${account}/r2/buckets/${PRODUCTION_R2}`,
          phase,
        }),
        () => observeProductionCandidateSkip(candidateGateState.expectedCommit, phase),
      ],
    });
    const [
      pullRequestReceipt,
      apiEvidenceSha256,
      revision,
      remainingR2,
      r2ControlScope,
      previewR2WriteDenied,
      productionR2Denied,
      previewPagesPayload,
      productionPagesPayload,
      previewR2Payload,
      productionR2Payload,
      productionSkipObservation,
    ] = revalidation.values;
    const previewPages = previewPagesPayload?.result;
    const productionPages = productionPagesPayload?.result;
    const previewR2 = previewR2Payload?.result;
    const productionR2 = productionR2Payload?.result;
    const previewPagesDeploy = pagesDeploymentFacts(
      previewPages?.canonical_deployment,
      phase,
    );
    const productionPagesDeploy = pagesDeploymentFacts(
      productionPages?.canonical_deployment,
      phase,
    );
    const successfulProductionDeployments = productionSkipObservation.deployments
      .filter((deployment) => deployment.status === "success")
      .map((deployment) => ({
        branch: deployment.branch,
        commit: deployment.commit,
        environment: deployment.environment,
        id: deployment.id,
        status: deployment.status,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const candidateRecords = productionSkipObservation.facts;
    const candidateCommitSkippedRecordCount = candidateRecords.filter(
      pagesDeploymentWasSkipped,
    ).length;
    const candidateCommitStartedRecordCount = candidateRecords.filter(
      (deployment) => deployment.stages.some((stage) => (
        stage.startedOn !== "" || stage.status !== "idle"
      )),
    ).length;
    const candidateCommitAliasedRecordCount = candidateRecords.filter(
      (deployment) => deployment.aliases.length > 0,
    ).length;
    const candidateCommitActiveDeploymentCount = candidateRecords.filter(
      (deployment) => (
        deployment.id === productionPagesDeploy.id
        || deployment.status === "success"
      ),
    ).length;
    const pullRequest = {
      ...pullRequestReceipt.details,
      evidenceSha256: pullRequestReceipt.evidenceSha256,
    };
    const databaseEvidenceSha256 = sha256(canonicalJson({
      resourceIdentitySha256: continuityBasis.resources?.postgres?.identitySha256,
      revision,
    }));
    const r2EvidenceSha256 = sha256(canonicalJson({
      objectCount: remainingR2.length,
      policySha256: r2ControlScope.policySha256,
      productionAccessDenied: productionR2Denied,
      resourceIdentitySha256: continuityBasis.resources?.r2?.identitySha256,
      writeDenied: previewR2WriteDenied,
    }));
    return verifySustainableTerminalContinuityObservation({
      checkedAt: revalidation.startedAt,
      completedAt: revalidation.completedAt,
      continuityBasis,
      observation: {
        pullRequest,
        apiEvidenceSha256,
        databaseRevision: revision,
        databaseEvidenceSha256,
        remainingR2Count: remainingR2.length,
        r2BucketBound: r2ControlScope.bucketBound,
        r2PolicyReadOnly: r2ControlScope.policyReadOnly,
        r2WriteDenied: previewR2WriteDenied,
        r2ProductionAccessDenied: productionR2Denied,
        r2EvidenceSha256,
        cloudflare: {
          previewPagesDeploymentCommit: previewPagesDeploy.commit,
          productionPagesDeploymentCommit: productionPagesDeploy.commit,
          previewPagesIdentitySha256:
            resourceIdentity("cloudflare-pages", previewPages?.id),
          productionPagesIdentitySha256:
            resourceIdentity("cloudflare-pages", productionPages?.id),
          previewR2IdentitySha256: resourceIdentity("cloudflare-r2", previewR2?.name),
          productionR2IdentitySha256:
            resourceIdentity("cloudflare-r2", productionR2?.name),
          previewPagesAutomaticDeploysDisabled:
            previewPages?.source?.config?.production_deployments_enabled === false,
          previewPagesPreviewDeploymentsDisabled:
            previewPages?.source?.config?.preview_deployment_setting === "none",
          productionPagesBranch:
            productionPages?.source?.config?.production_branch,
          productionPagesConfigurationSha256:
            sha256(canonicalJson(pagesConfiguration(productionPages))),
          productionPagesSuccessfulDeploymentSetSha256:
            sha256(canonicalJson(successfulProductionDeployments)),
          candidateCommitRecordCount: candidateRecords.length,
          candidateCommitSkippedRecordCount,
          candidateCommitStartedRecordCount,
          candidateCommitAliasedRecordCount,
          candidateCommitActiveDeploymentCount,
        },
      },
      phase,
    });
  };

  const verifyPostRevokeContinuity = async (context) => {
    assertCredentialRole(
      context,
      credentials.descriptors.control,
      "CONTROL_CREDENTIAL_ROLE_REQUIRED",
      "post-revoke-continuity",
    );
    requireCondition(
      context.postRevoke === true && isPlainObject(context.expectedTopology),
      "POST_REVOKE_CONTEXT_INVALID",
      "post-revoke-continuity",
    );
    const continuityObservation = await runTimedObservationBatch({
      now,
      phase: "post-revoke-continuity",
      probes: [
        () => readTopology("post-revoke-continuity", { controlOnly: true }),
        () => inspectPullRequest(context),
        () => healthCheck(),
        () => databaseRevision({
          commandRunner,
          psqlPath: tools.psqlPath,
          identity: postgresReadIdentity(),
          phase: "post-revoke-continuity",
        }),
        () => listR2SyntheticObjects("post-revoke-continuity", "control"),
        () => r2ControlReadOnlyScopeProof("post-revoke-continuity"),
        () => verifyR2PreviewWriteDenied("post-revoke-continuity"),
        () => verifyR2ProductionDenied("post-revoke-continuity", "control"),
      ],
    });
    const [
      topology,
      pullRequestReceipt,
      apiEvidence,
      revision,
      remainingR2,
      r2ControlScope,
      previewR2WriteDenied,
      productionR2Denied,
    ] = continuityObservation.values;
    requireCondition(
      canonicalJson(topology.details) === canonicalJson(context.expectedTopology)
        && revision === PHASE2_REVISION
        && remainingR2.length === 0
        && r2ControlScope.bucketBound === true
        && r2ControlScope.policyReadOnly === true
        && previewR2WriteDenied === true
        && productionR2Denied === true
        && pullRequestReceipt.details.headCommit === candidateGateState.evidenceHeadCommit,
      "POST_REVOKE_CONTINUITY_FAILED",
      "post-revoke-continuity",
    );
    const continuityObservedAt = continuityObservation.startedAt;
    const continuityObservationCompletedAt = continuityObservation.completedAt;
    const resources = topology.details.resources;
    const previewAnchor = topology.details.previewAnchor;
    const continuityBasis = {
      continuityObservedAt,
      continuityObservationCompletedAt,
      resources,
      productionAnchor: topology.details.productionAnchor,
      previewAnchor,
      pullRequest: {
        ...pullRequestReceipt.details,
        evidenceSha256: pullRequestReceipt.evidenceSha256,
      },
      previewApi: {
        resourceIdentitySha256: resources.api.identitySha256,
        deploymentCommit: previewAnchor.apiDeploymentCommit,
        live: true,
        evidenceSha256: apiEvidence,
      },
      previewDatabase: {
        resourceIdentitySha256: resources.postgres.identitySha256,
        revision,
        readSucceeded: true,
        evidenceSha256: sha256(canonicalJson({
          resourceIdentitySha256: resources.postgres.identitySha256,
          revision,
        })),
      },
      previewR2: {
        resourceIdentitySha256: resources.r2.identitySha256,
        readSucceeded: true,
        policyBucketBound: true,
        policyReadOnly: true,
        writeDenied: true,
        productionAccessDenied: true,
        mutationAttempted: false,
        evidenceSha256: sha256(canonicalJson({
          objectCount: remainingR2.length,
          policySha256: r2ControlScope.policySha256,
          productionAccessDenied: productionR2Denied,
          resourceIdentitySha256: resources.r2.identitySha256,
          writeDenied: previewR2WriteDenied,
        })),
      },
      renderControlCredentialIdentitySha256: controlRenderCredentialIdentitySha256,
      postgresProviderCredentialInventoryUnchanged: true,
      postgresProviderCredentialInventorySha256: providerPostgresBaselineSha256,
      persistentProviderAdmin: persistentProviderAdminProof(
        providerPostgresBaselineSha256,
      ),
      remainingReadOnlyControlProviders: REMAINING_READ_ONLY_CONTROL_PROVIDERS,
      terminalTemporaryControlProviders: TERMINAL_TEMPORARY_CONTROL_PROVIDERS,
      remainingControlCredentialsReadOnly: true,
      runtimeIdentitiesUnchanged: true,
      renderTopologyObservation: {
        observedAt: continuityObservedAt,
        timing: "before-terminal-control-revocation",
        reobservedAfterTerminalRevocation: false,
      },
    };
    const buildPostRevokeReceipt = (
      postgresControlIdentity,
      renderControlRevocation,
      sustainableControlRevalidation,
    ) => receipt(
      "post-revoke-continuity",
      {
        ...structuredClone(continuityBasis),
        renderControlRevoked: renderControlRevocation.revoked,
        renderControlAccessDenied: renderControlRevocation.accessDenied,
        renderControlRefreshDenied: renderControlRevocation.refreshDenied,
        renderControlRevocationEvidenceSha256:
          terminalRenderRevocationProof.evidenceSha256,
        terminalTemporaryControlCredentialsRevoked: true,
        postgresControlRevokedAfterContinuity: true,
        postgresControlIdentity,
        sustainableControlRevalidation,
      },
    );
    if (context.mode === "execute") {
      requireCondition(
        typeof context.stageTerminalIntent === "function"
          && typeof context.completeTerminalIntent === "function",
        "TERMINAL_REVOCATION_INTENT_REQUIRED",
        "post-revoke-continuity",
      );
      await context.stageTerminalIntent(continuityBasis);
      requireCondition(
        recoveryJournal.finalization.status === "terminal-intent",
        "TERMINAL_REVOCATION_INTENT_REQUIRED",
        "post-revoke-continuity",
      );
    }
    const {
      postgresProof: postgresControlIdentity,
      renderProof: controlRenderRevocation,
    } = await runOrderedTerminalControlRevocations({
      revokePostgres: async () => {
        await revokePostgresCredentials("post-revoke-continuity", {
          includeControl: true,
        });
        const proof = postgresRevocationProofs.get("control");
        requireCondition(
          isPlainObject(proof)
            && proof.revoked === true
            && proof.roleAbsent === true
            && proof.loginDenied === true
            && canonicalJson(proof) === canonicalJson(postgresRevocationProofFor("control")),
          "POSTGRES_REVOKE_VERIFY_FAILED",
          "post-revoke-continuity",
        );
        return proof;
      },
      revokeRender: async () => {
        await updateRecoveryJournal((current) => ({
          stage: "control-render-revoke-attempted",
          revocationAttempts: { ...current.revocationAttempts, controlRender: true },
        }));
        const proof = await revokeRenderOauthCredential({
          secretSet: credentials.control,
          phase: "post-revoke-continuity",
          allowAlreadyDenied: false,
        });
        requireCondition(
          proof.revoked === true
            && proof.accessDenied === true
            && proof.refreshDenied === true
            && proof.revoke204Observed === true,
          "RENDER_CONTROL_REVOKE_FAILED",
          "post-revoke-continuity",
        );
        terminalRenderRevocationProof = normalizeTerminalRenderRevocationProof(
          proof,
          "post-revoke-continuity",
        );
        controlRenderRevoked = true;
        await updateRecoveryJournal({
          stage: "control-render-revoked",
          controlRenderRevoked: true,
        });
        credentials.control.get("renderAccessToken").clear();
        credentials.control.get("renderRefreshToken").clear();
        return terminalRenderRevocationProof;
      },
    });
    const sustainableControlRevalidation = await revalidateSustainableTerminalContinuity({
      continuityBasis,
      phase: "post-revoke-continuity",
    });
    const actualPostRevokeReceipt = buildPostRevokeReceipt(
      postgresControlIdentity,
      controlRenderRevocation,
      sustainableControlRevalidation,
    );
    if (context.mode === "execute") {
      await context.completeTerminalIntent(actualPostRevokeReceipt);
      requireCondition(
        recoveryJournal.finalization.status === "facts-staged",
        "TERMINAL_REVOCATION_COMPLETION_REQUIRED",
        "post-revoke-continuity",
      );
    }
    return actualPostRevokeReceipt;
  };

  const recover = async (context = {}) => {
    const expectedCommit = requireText(
      context.expectedCommit,
      "EXPECTED_COMMIT_INVALID",
      "operator-recovery",
      SHA_PATTERN,
    );
    requireCondition(
      context.confirmation === `recover-preview:${expectedCommit}`,
      "RECOVERY_CONFIRMATION_MISMATCH",
      "operator-recovery",
    );
    candidateGateState = Object.freeze({
      applicationCommit: expectedCommit,
      evidenceHeadCommit: config.evidenceHeadCommit,
      expectedCommit,
      recovery: true,
    });
    await initializeRecoveryJournal(expectedCommit, { recover: true });
    const recoveryFailures = new Set();
    const attemptRecovery = async (id, operation) => {
      try {
        return Object.freeze({ ok: true, value: await operation() });
      } catch {
        recoveryFailures.add(id);
        return Object.freeze({ ok: false, value: undefined });
      }
    };
    const [toolchainResult, catalogResult] = await Promise.all([
      attemptRecovery("toolchain", async () => {
        tools = await verifyToolchain({ config, commandRunner, root: resolvedRoot });
        return tools;
      }),
      attemptRecovery("rights-catalog", async () => {
        catalog = await verifyRightsCatalog(resolvedRoot);
        return catalog;
      }),
      boundPreviewPostgres === undefined
        ? attemptRecovery(
          "postgres-binding",
          () => bindPreviewPostgresResource("operator-recovery"),
        )
        : Promise.resolve(Object.freeze({ ok: true, value: boundPreviewPostgres })),
    ]);
    preflightComplete = toolchainResult.ok && catalogResult.ok;
    if (recoveryJournal.finalization.status === "terminal-intent") {
      requireCondition(
        recoveryJournal.revocations.cloudflare === true
          && recoveryJournal.revocations.render === true
          && recoveryJournal.revocations.r2 === true
          && recoveryJournal.revocations.postgres.mutation === true
          && recoveryJournal.revocations.postgres.restore === true,
        "TERMINAL_REVOCATION_INTENT_INCOMPLETE",
        "operator-recovery",
      );
      const controlPostgresAcknowledged = (
        recoveryJournal.revocations.postgres.control === true
      );
      const postgresRecovery = await attemptRecovery("terminal-postgres-revoke", async () => {
        const proof = await recoverTerminalPostgresControl({
          controlAcknowledged: controlPostgresAcknowledged,
          reverifyAcknowledged: () => (
            reverifyAcknowledgedTerminalPostgresControl("operator-recovery")
          ),
          runFullRevocation: async () => {
            await revokePostgresCredentials("operator-recovery", {
              includeControl: true,
            });
            return postgresRevocationProofs.get("control");
          },
        });
        requireCondition(
          isPlainObject(proof)
            && canonicalJson(proof) === canonicalJson(postgresRevocationProofFor("control")),
          "TERMINAL_REVOCATION_PROOF_MISMATCH",
          "operator-recovery",
        );
        return proof;
      });
      let renderRecovery = Object.freeze({ ok: false, value: undefined });
      if (postgresRecovery.ok) {
        renderRecovery = await attemptRecovery("terminal-render-revoke", async () => {
          const recoveryConvergence = (
            recoveryJournal.revocationAttempts.controlRender === true
          );
          if (!recoveryConvergence) {
            await updateRecoveryJournal((current) => ({
              stage: "control-render-revoke-attempted",
              revocationAttempts: {
                ...current.revocationAttempts,
                controlRender: true,
              },
            }));
          }
          const proof = await revokeRenderOauthCredential({
            secretSet: credentials.control,
            phase: "operator-recovery",
            allowAlreadyDenied: recoveryConvergence,
          });
          requireCondition(
            proof.revoked
              && proof.accessDenied
              && proof.refreshDenied
              && (proof.revoke204Observed || recoveryConvergence),
            "RENDER_CONTROL_REVOKE_FAILED",
            "operator-recovery",
          );
          terminalRenderRevocationProof = normalizeTerminalRenderRevocationProof(
            proof,
            "operator-recovery",
          );
          controlRenderRevoked = true;
          await updateRecoveryJournal({
            stage: "control-render-revoked",
            controlRenderRevoked: true,
          });
          return terminalRenderRevocationProof;
        });
      }
      if (
        recoveryFailures.size > 0
        || recoveryJournal.revocations.postgres.control !== true
        || controlRenderRevoked !== true
      ) {
        await updateRecoveryJournal({ stage: "recovery-incomplete" }).catch(() => {});
        fail("OPERATOR_RECOVERY_INCOMPLETE", "operator-recovery");
      }
      const intent = recoveryJournal.finalization.facts;
      const continuityBasis = intent?.continuityBasis;
      requireCondition(
        postgresRecovery.ok
          && renderRecovery.ok
          && isPlainObject(postgresRecovery.value)
          && isPlainObject(renderRecovery.value)
          && canonicalJson(continuityBasis?.persistentProviderAdmin)
            === canonicalJson(persistentProviderAdminProof(providerPostgresBaselineSha256)),
        "TERMINAL_REVOCATION_PROOF_MISMATCH",
        "operator-recovery",
      );
      const sustainableRecovery = await attemptRecovery(
        "terminal-continuity-revalidation",
        () => revalidateSustainableTerminalContinuity({
          continuityBasis,
          phase: "operator-recovery",
        }),
      );
      if (!sustainableRecovery.ok) {
        await updateRecoveryJournal({ stage: "recovery-incomplete" }).catch(() => {});
        fail("OPERATOR_RECOVERY_INCOMPLETE", "operator-recovery");
      }
      const recoveredPostRevokeReceipt = receipt("post-revoke-continuity", {
        ...structuredClone(continuityBasis),
        renderControlRevoked: renderRecovery.value.revoked,
        renderControlAccessDenied: renderRecovery.value.accessDenied,
        renderControlRefreshDenied: renderRecovery.value.refreshDenied,
        renderControlRevocationEvidenceSha256: renderRecovery.value.evidenceSha256,
        terminalTemporaryControlCredentialsRevoked: true,
        postgresControlRevokedAfterContinuity: true,
        postgresControlIdentity: structuredClone(postgresRecovery.value),
        sustainableControlRevalidation: structuredClone(sustainableRecovery.value),
      });
      const completedAt = now().toISOString();
      const capturedAt = now().toISOString();
      const terminalFinalization = await attemptRecovery(
        "terminal-evidence-finalization",
        () => completeTerminalRevocationIntent({
          expectedCommit,
          postRevokeReceipt: recoveredPostRevokeReceipt,
          completedAt,
          capturedAt,
        }),
      );
      if (!terminalFinalization.ok) {
        await updateRecoveryJournal({ stage: "recovery-incomplete" }).catch(() => {});
        fail("OPERATOR_RECOVERY_INCOMPLETE", "operator-recovery");
      }
      return Object.freeze({
        recovered: true,
        expectedCommit,
        mutationCredentialsRevoked: true,
        renderControlRevoked: true,
        providerEvidencePending: true,
      });
    }
    if (recoveryJournal.backup?.status === "creating") {
      const incompleteBackupCleanup = await attemptRecovery(
        "incomplete-backup-cleanup",
        async () => {
          await rm(recoveryJournal.backup.directory, { force: true, recursive: true });
          backupDirectory = undefined;
          await updateRecoveryJournal({ backup: null, stage: "recovery-started" });
        },
      );
      if (!incompleteBackupCleanup.ok) backupDirectory = recoveryJournal.backup.directory;
    } else if (recoveryJournal.backup?.status === "complete") {
      await attemptRecovery(
        "backup-validation",
        () => revalidateBackupArchive("operator-recovery"),
      );
    }
    const mutationContext = Object.freeze({
      environment: "preview",
      expectedCommit,
      productionMutationAllowed: false,
      providerDowngradeAllowed: false,
      resourceSharingAllowed: false,
      credentialRole: credentials.descriptors.mutation,
      recovery: true,
    });
    if (recoveryJournal.seed.attempted && !recoveryJournal.mutations.cleanupCompleted) {
      const catalogRows = await attemptRecovery("catalog-row-observation", async () => {
        const current = await readCatalogRowIds("operator-recovery");
        const oldProblems = new Set(recoveryJournal.seed.preexistingProblemIds);
        const oldSources = new Set(recoveryJournal.seed.preexistingSourceIds);
        createdCatalogRows = Object.freeze({
          problemIds: Object.freeze(current.problemIds.filter((id) => !oldProblems.has(id))),
          sourceIds: Object.freeze(current.sourceIds.filter((id) => !oldSources.has(id))),
        });
        await updateRecoveryJournal({
          seed: {
            ...recoveryJournal.seed,
            problemIds: [...createdCatalogRows.problemIds],
            sourceIds: [...createdCatalogRows.sourceIds],
          },
        });
      });
      const [databaseCleanup, r2Cleanup] = await Promise.all([
        attemptRecovery(
          "database-cleanup",
          () => cleanupAcceptanceDatabase({ actorId: "", email: acceptanceEmail }),
        ),
        attemptRecovery("r2-cleanup", () => cleanupR2("operator-recovery")),
      ]);
      if (catalogRows.ok && databaseCleanup.ok && r2Cleanup.ok) {
        await attemptRecovery("cleanup-journal", () => updateRecoveryJournal({
          stage: "cleanup-complete",
          mutations: { ...recoveryJournal.mutations, cleanupCompleted: true },
        }));
      }
    }
    if (recoveryJournal.restoreTarget.attempted && !recoveryJournal.restoreTarget.destroyed) {
      await attemptRecovery("restore-target-destroy", () => destroyRestoreTarget({
        ...mutationContext,
        restore: { targetResourceSha256: restoreTargetBinding.snapshot().targetResourceSha256 },
      }));
    }
    const baseline = recoveryJournal.baseline;
    if (baseline !== null) {
      const topologyObservation = await attemptRecovery(
        "topology-observation",
        () => readTopology("operator-recovery-reconcile", { controlOnly: true }),
      );
      if (topologyObservation.ok) {
        const currentTopology = topologyObservation.value;
        const topologyRecoveries = [];
        if (
          recoveryJournal.mutationIntents.pagesDeploy
          && !recoveryJournal.mutations.pagesRolledBack
          && currentTopology.details.previewAnchor.pagesDeploymentCommit
            !== baseline.previewAnchor.pagesDeploymentCommit
        ) {
          topologyRecoveries.push([
            "pages-rollback",
            () => rollbackPages({
              ...mutationContext,
              target: baseline.previewAnchor.pagesDeploymentCommit,
            }),
          ]);
        }
        if (
          recoveryJournal.mutationIntents.apiDeploy
          && !recoveryJournal.mutations.apiRolledBack
          && currentTopology.details.previewAnchor.apiDeploymentCommit
            !== baseline.previewAnchor.apiDeploymentCommit
        ) {
          topologyRecoveries.push([
            "api-rollback",
            () => rollbackApi({
              ...mutationContext,
              target: baseline.previewAnchor.apiDeploymentCommit,
            }),
          ]);
        }
        if (
          recoveryJournal.mutationIntents.databaseMigration
          && !recoveryJournal.mutations.databaseRestored
          && currentTopology.details.previewAnchor.databaseRevision
            !== baseline.previewAnchor.databaseRevision
        ) {
          topologyRecoveries.push([
            "database-restore",
            async () => {
              requireCondition(
                backupState !== undefined,
                "BACKUP_REQUIRED",
                "operator-recovery",
              );
              await restorePreviewDatabase({
                ...mutationContext,
                backup: { backupSha256: backupState.backupSha256 },
              });
            },
          ]);
        }
        for (const [id, operation] of topologyRecoveries) {
          await attemptRecovery(id, operation);
        }
      }
      await attemptRecovery("topology-verification", async () => {
        const currentTopology = await readTopology("operator-recovery", { controlOnly: true });
        requireCondition(
          canonicalJson(currentTopology.details.productionAnchor)
            === canonicalJson(baseline.productionAnchor)
            && canonicalJson(currentTopology.details.previewAnchor)
              === canonicalJson(baseline.previewAnchor),
          "RECOVERY_VERIFICATION_FAILED",
          "operator-recovery",
        );
        for (const resolvedFailure of [
          "postgres-binding",
          "topology-observation",
          "pages-rollback",
          "api-rollback",
          "database-restore",
        ]) recoveryFailures.delete(resolvedFailure);
      });
    } else if (Object.values(recoveryJournal.mutationIntents).some(Boolean)) {
      await attemptRecovery(
        "topology-verification",
        async () => {
          await readTopology("operator-recovery-no-baseline", { controlOnly: true });
          recoveryFailures.delete("postgres-binding");
        },
      );
    } else {
      // The candidate gate persists the journal before any provider mutation can
      // be attempted. With no baseline and no mutation intent, the journal is
      // sufficient proof that there is no provider state to roll back. This also
      // lets recovery converge after terminal credential revocation has already
      // made the read-only Render credential unavailable.
      recoveryFailures.delete("postgres-binding");
    }
    const revocationClosure = await runRecoveryRevocationClosure({
      attempt: attemptRecovery,
      revokePostgres: async () => {
        await revokePostgresCredentials("operator-recovery", {
          includeControl: true,
        });
      },
      revokeR2: () => revokeR2Credential("operator-recovery"),
      revokeCloudflare: () => revokeCloudflareCredential("operator-recovery"),
      revokeRender: () => revokeRenderCredential("operator-recovery"),
      revokeControlRender: async () => {
        const recoveryConvergence = recoveryJournal.revocationAttempts.controlRender === true;
        if (!recoveryConvergence) {
          await updateRecoveryJournal((current) => ({
            stage: "control-render-revoke-attempted",
            revocationAttempts: { ...current.revocationAttempts, controlRender: true },
          }));
        }
        const proof = await revokeRenderOauthCredential({
          secretSet: credentials.control,
          phase: "operator-recovery",
          allowAlreadyDenied: recoveryConvergence,
        });
        requireCondition(
          proof.revoked
            && proof.accessDenied
            && proof.refreshDenied
            && (proof.revoke204Observed || recoveryConvergence),
          "RENDER_CONTROL_REVOKE_FAILED",
          "operator-recovery",
        );
        controlRenderRevoked = true;
        await updateRecoveryJournal({
          stage: "control-render-revoked",
          controlRenderRevoked: true,
        });
      },
    });
    const allMutationCredentialsRevoked = (
      revocationClosure.postgres.ok
      && revocationState.postgres
      && revocationState.r2
      && revocationState.cloudflare
      && revocationState.render
    );
    if (
      recoveryFailures.size > 0
      || !allMutationCredentialsRevoked
      || !controlRenderRevoked
    ) {
      await updateRecoveryJournal({ stage: "recovery-incomplete" }).catch(() => {});
      fail("OPERATOR_RECOVERY_INCOMPLETE", "operator-recovery");
    }
    await clearBackup();
    await updateRecoveryJournal({
      backup: null,
      stage: "complete",
      controlRenderRevoked: true,
    });
    await removeRecoveryJournal();
    return Object.freeze({
      recovered: true,
      expectedCommit,
      mutationCredentialsRevoked: true,
      renderControlRevoked: true,
    });
  };

  const stageTerminalRevocationIntent = async ({
    expectedCommit,
    intent,
  } = {}) => {
    requireCondition(
      expectedCommit === candidateGateState?.expectedCommit
        && recoveryJournal?.expectedCommit === expectedCommit
        && recoveryJournal.finalization.status === "pending"
        && isPlainObject(intent)
        && intent.kind === "phase2-terminal-revocation-intent-v1"
        && intent.expectedCommit === expectedCommit
        && typeof intent.startedAt === "string"
        && Number.isFinite(Date.parse(intent.startedAt)),
      "TERMINAL_REVOCATION_INTENT_INVALID",
      "evidence-finalization",
    );
    const safeIntent = structuredClone(intent);
    await updateRecoveryJournal({
      stage: "terminal-revocation-intent-staged",
      finalization: {
        status: "terminal-intent",
        capturedAt: safeIntent.startedAt,
        facts: safeIntent,
        factsSha256: sha256(canonicalJson(safeIntent)),
        evidenceSha256: null,
      },
    });
  };

  const completeTerminalRevocationIntent = async ({
    expectedCommit,
    postRevokeReceipt,
    completedAt,
    capturedAt,
  } = {}) => {
    requireCondition(
      recoveryJournal?.finalization.status === "terminal-intent"
        && recoveryJournal.expectedCommit === expectedCommit
        && controlRenderRevoked === true
        && recoveryJournal.controlRenderRevoked === true
        && recoveryJournal.revocations.postgres.control === true
        && isPlainObject(postRevokeReceipt),
      "TERMINAL_REVOCATION_INTENT_INCOMPLETE",
      "evidence-finalization",
    );
    const postgresControlProof = postgresRevocationProofs.get("control");
    verifyTerminalRevocationProofBinding({
      postRevokeReceipt,
      postgresControlProof,
      renderControlProof: terminalRenderRevocationProof,
    });
    const terminal = finalizePhase2TerminalRevocationIntent({
      intent: recoveryJournal.finalization.facts,
      postRevokeReceipt,
      completedAt,
      capturedAt,
    });
    await updateRecoveryJournal({
      stage: "evidence-facts-staged",
      finalization: {
        status: "facts-staged",
        capturedAt: terminal.capturedAt,
        facts: structuredClone(terminal.facts),
        factsSha256: sha256(canonicalJson(terminal.facts)),
        evidenceSha256: null,
      },
    });
    return Object.freeze({
      capturedAt: terminal.capturedAt,
      facts: structuredClone(terminal.facts),
    });
  };

  const stageProviderEvidenceFacts = async ({
    expectedCommit,
    capturedAt,
    facts,
  } = {}) => {
    const suppliedFactsSha256 = isPlainObject(facts)
      ? sha256(canonicalJson(facts))
      : null;
    if (
      recoveryJournal?.finalization.status === "facts-staged"
      && recoveryJournal.expectedCommit === expectedCommit
      && recoveryJournal.finalization.capturedAt === capturedAt
      && recoveryJournal.finalization.factsSha256 === suppliedFactsSha256
    ) return;
    requireCondition(
      expectedCommit === candidateGateState?.expectedCommit
        && recoveryJournal?.expectedCommit === expectedCommit
        && controlRenderRevoked === true
        && recoveryJournal.controlRenderRevoked === true
        && new Set(["pending", "terminal-intent"])
          .has(recoveryJournal.finalization.status)
        && typeof capturedAt === "string"
        && Number.isFinite(Date.parse(capturedAt))
        && isPlainObject(facts),
      "EVIDENCE_FACTS_STAGE_INVALID",
      "evidence-finalization",
    );
    const safeFacts = structuredClone(facts);
    if (recoveryJournal.finalization.status === "terminal-intent") {
      requireCondition(
        recoveryJournal.finalization.capturedAt === capturedAt
          && recoveryJournal.finalization.factsSha256 === suppliedFactsSha256,
        "EVIDENCE_FACTS_STAGE_INVALID",
        "evidence-finalization",
      );
    }
    await updateRecoveryJournal({
      stage: "evidence-facts-staged",
      finalization: {
        status: "facts-staged",
        capturedAt,
        facts: safeFacts,
        factsSha256: sha256(canonicalJson(safeFacts)),
        evidenceSha256: null,
      },
    });
  };

  const finalizeProviderEvidence = async ({ expectedCommit, evidenceSha256 } = {}) => {
    requireCondition(
      recoveryJournal?.expectedCommit === expectedCommit
        && new Set(["facts-staged", "evidence-written"])
          .has(recoveryJournal.finalization.status)
        && HASH_PATTERN.test(evidenceSha256 ?? "")
        && (
          recoveryJournal.finalization.evidenceSha256 === null
          || recoveryJournal.finalization.evidenceSha256 === evidenceSha256
        ),
      "EVIDENCE_FINALIZE_INVALID",
      "evidence-finalization",
    );
    await updateRecoveryJournal((current) => ({
      stage: "evidence-written",
      finalization: {
        ...current.finalization,
        status: "evidence-written",
        evidenceSha256,
      },
    }));
    await clearBackup();
    await removeRecoveryJournal();
  };

  const pendingProviderEvidence = () => {
    if (!recoveryJournal || recoveryJournal.finalization.status === "pending") return null;
    return Object.freeze({
      capturedAt: recoveryJournal.finalization.capturedAt,
      evidenceSha256: recoveryJournal.finalization.evidenceSha256,
      facts: structuredClone(recoveryJournal.finalization.facts),
      factsSha256: recoveryJournal.finalization.factsSha256,
      status: recoveryJournal.finalization.status,
    });
  };

  const actions = Object.freeze({
    kind: "operator",
    candidateGate,
    preflight,
    inspectTopology,
    backup,
    proveRestore,
    destroyRestoreTarget,
    migrate,
    deployApi,
    deployPages,
    seedAcceptanceData,
    runLiveChecks,
    cleanup,
    revokeTemporaryAccess,
    verifyPostRevokeContinuity,
    inspectPullRequest,
    recoverCleanup,
    rollbackPages,
    rollbackApi,
    restorePreviewDatabase,
    verifyRecovery,
    emergencyRevoke,
  });

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    try {
      if (candidateArtifactState) {
        await removeDetachedCandidate({
          state: candidateArtifactState,
          commandRunner,
        });
        candidateArtifactState = undefined;
      }
      const cleanup = await Promise.allSettled([
        approvedCapabilities.dispose?.(),
        proxyDispatcher.close(),
      ]);
      requireCondition(
        cleanup.every((entry) => entry.status === "fulfilled"),
        "OPERATOR_DISPOSE_FAILED",
        "adapter-dispose",
      );
    } finally {
      credentials.bootstrap.clear();
      credentials.mutation.clear();
      credentials.control.clear();
    }
  };

  const adapter = Object.freeze({
    actions,
    completeTerminalRevocationIntent,
    credentialRoles: credentials.descriptors,
    dispose,
    finalizeProviderEvidence,
    pendingProviderEvidence,
    preflight,
    recover,
    stageProviderEvidenceFacts,
    stageTerminalRevocationIntent,
  });
  if (authenticProductionConstruction) {
    authenticProductionOperatorAdapters.add(adapter);
  }
  return adapter;
}

export const isAuthenticPhase2ProductionOperatorAdapter = (value) => (
  isPlainObject(value) && authenticProductionOperatorAdapters.has(value)
);

export const PHASE2_OPERATOR_REQUIREMENTS = Object.freeze({
  allowedUntrackedPaths: ALLOWED_UNTRACKED_PATHS,
  branch: BRANCH,
  nodeVersion: REQUIRED_NODE_VERSION,
  postgresExecutableSha256: REQUIRED_POSTGRES_EXECUTABLE_SHA256,
  postgresVersion: REQUIRED_POSTGRES_VERSION,
  pythonVersion: REQUIRED_PYTHON_VERSION,
  repository: REPOSITORY,
  wranglerBinSha256: REQUIRED_WRANGLER_BIN_SHA256,
  wranglerVersion: REQUIRED_WRANGLER_VERSION,
});

export const PHASE2_OPERATOR_TEST_SUPPORT = Object.freeze({
  annotateMutationRevocationFailure,
  createR2CredentialRouter,
  createRestoreTargetBinding,
  evidenceCheckWorkflowRunId,
  inspectBackupFileNoFollow,
  inspectPythonSitePackagesClosure,
  hashToolClosure,
  isEvidenceWorkflowRunIdentity,
  isRightsContentVersion: (value) => RIGHTS_CONTENT_VERSION_PATTERN.test(clean(value)),
  selectLatestEvidenceCheckSet,
  sharedEvidenceCheckSuiteId,
  isR2AccessDenied,
  persistRecoveryJournalFile,
  recoverTerminalPostgresControl,
  removeRecoveryJournalFile,
  runRecoveryRevocationClosure,
  runOrderedTerminalControlRevocations,
  runTimedObservationBatch,
  runBackupGuardedDatabaseRestore,
  sameDatabaseContentSnapshot,
  sqlManagedPostgresRevocationDisposition,
  snapshotCandidateArtifact,
  validateBackupArchiveSnapshot,
  verifyCandidateArtifactUnchanged,
  verifyPythonSitePackagesClosure,
  verifySustainableTerminalContinuityObservation,
  verifyTerminalRevocationProofBinding,
});

export const PHASE2_OPERATOR_ACTION_CREDENTIAL_SCOPES = ACTION_CREDENTIAL_SCOPES;
