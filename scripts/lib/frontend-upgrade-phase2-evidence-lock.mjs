import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
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

export const PHASE1_EVIDENCE_LOCK_PATH = (
  "docs/frontend-upgrade/phase-1-evidence-lock.json"
);
export const ACCEPTED_PHASE1_APPLICATION_COMMIT = (
  "5a3b6f33b7f2a4d15f0a81ca57f81570ca89c6a3"
);
export const ACCEPTED_PHASE1_EVIDENCE_COMMIT = (
  "d87b20f8630fdc39f46e1065c5ffee14bf3ca8dd"
);
export const ACCEPTED_PHASE1_HANDOFF_COMMIT = (
  "4faba0653e28e4ca28edd8521a053d00d0d88e57"
);
export const ACCEPTED_PHASE1_ACCEPTANCE_COMMIT = (
  "4bed12b2b9951276124df2fff18b23f2319c8de1"
);
export const PHASE1_ACCEPTED_REVIEW_PATH = (
  "docs/superpowers/reviews/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md"
);
export const PHASE1_PLAN_PATH = (
  "docs/superpowers/plans/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md"
);
export const PHASE0_EVIDENCE_LOCK_PATH = (
  "docs/frontend-upgrade/phase-0-evidence-lock.json"
);

const PHASE1_SUMMARY_PATHS = Object.freeze([
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-legacy-boundary-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-postgres-migration-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-preview-live-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-r2-binding-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json",
  "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json",
]);
const REVIEW_SURFACES = Object.freeze([
  "auth",
  "desktop-shell",
  "global-search",
  "mobile-shell",
  "network-recovery",
  "notifications-toast",
  "theme-language",
  "todo",
]);
const REVIEW_VIEWPORTS = Object.freeze(["desktop", "laptop", "mobile"]);
const REVIEW_THEMES = Object.freeze(["dark", "light"]);
const PHASE1_REVIEW_IMAGE_PATHS = Object.freeze(REVIEW_SURFACES.flatMap((surface) => (
  REVIEW_VIEWPORTS.flatMap((viewport) => REVIEW_THEMES.map((theme) => (
    `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/`
    + `${surface}-${viewport}-${theme}.jpg`
  )))
)));
const PHASE1_CONTRACT_PATHS = Object.freeze([
  "docs/frontend-upgrade/phase-1-acceptance-manifest.json",
  "docs/frontend-upgrade/phase-1-preview-contract.json",
  "docs/frontend-upgrade/phase-1-provider-evidence.schema.json",
  "docs/frontend-upgrade/phase-1-schema-contract.json",
]);

const comparePaths = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
export const PHASE1_EVIDENCE_PATHS = Object.freeze([
  ...PHASE1_SUMMARY_PATHS,
  ...PHASE1_REVIEW_IMAGE_PATHS,
  ...PHASE1_CONTRACT_PATHS,
  PHASE1_ACCEPTED_REVIEW_PATH,
  PHASE1_PLAN_PATH,
  PHASE0_EVIDENCE_LOCK_PATH,
].sort(comparePaths));
const PHASE1_EVIDENCE_PATH_SET = new Set(PHASE1_EVIDENCE_PATHS);
const SCOPED_DIRECTORIES = Object.freeze([
  "docs/browser-audit-screenshots",
  "docs/frontend-upgrade",
  "docs/superpowers/reviews",
  "docs/superpowers/plans",
]);
const FORBIDDEN_EVIDENCE_NAMESPACE = (
  /^docs\/browser-audit-screenshots\/(?:370|390)-/u
);

const isObject = (value) => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);
const isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
const isSafeRepoRelativePath = (value) => {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }
  return path.posix.normalize(value) === value;
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalEqual = (left, right) => (
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
);

const expectedCommitsFrom = (overrides = {}) => ({
  acceptedApplicationCommit: (
    overrides.acceptedApplicationCommit ?? ACCEPTED_PHASE1_APPLICATION_COMMIT
  ),
  acceptedEvidenceCommit: overrides.acceptedEvidenceCommit ?? ACCEPTED_PHASE1_EVIDENCE_COMMIT,
  acceptedHandoffCommit: overrides.acceptedHandoffCommit ?? ACCEPTED_PHASE1_HANDOFF_COMMIT,
  acceptedAcceptanceCommit: (
    overrides.acceptedAcceptanceCommit ?? ACCEPTED_PHASE1_ACCEPTANCE_COMMIT
  ),
});

const verifyTrustedGitBinary = async () => {
  const metadata = await lstat(TRUSTED_GIT_BINARY, { bigint: true });
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${TRUSTED_GIT_BINARY} must be a regular file`);
  }
  if (metadata.uid !== 0n) throw new Error(`${TRUSTED_GIT_BINARY} must be root-owned`);
  if ((metadata.mode & 0o022n) !== 0n) {
    throw new Error(`${TRUSTED_GIT_BINARY} must not be group- or world-writable`);
  }
  if ((metadata.mode & 0o111n) === 0n) {
    throw new Error(`${TRUSTED_GIT_BINARY} must be executable`);
  }
};

const runGit = async (root, args, options = {}) => {
  await verifyTrustedGitBinary();
  const { stdout } = await execFileAsync(
    TRUSTED_GIT_BINARY,
    [...TRUSTED_GIT_CONFIG, ...args],
    {
      cwd: root,
      encoding: options.encoding ?? "utf8",
      env: TRUSTED_GIT_ENV,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return stdout;
};

const gitBlob = async (root, object) => Buffer.from(await runGit(
  root,
  ["cat-file", "blob", object],
  { encoding: "buffer" },
));

const gitIsAncestor = async (root, ancestor, descendant) => {
  try {
    await runGit(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
};

const assertCommit = async (root, commit, label) => {
  if (!isSha(commit)) throw new Error(`${label} must be a 40-character lowercase Git SHA`);
  const resolved = String(await runGit(
    root,
    ["rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`],
  )).trim();
  if (resolved !== commit) throw new Error(`${label} does not resolve exactly`);
};

const assertTrustedRepositoryShape = async (root) => {
  const resolvedRoot = await realpath(path.resolve(root));
  const topLevel = String(await runGit(root, ["rev-parse", "--show-toplevel"])).trim();
  if (await realpath(path.resolve(topLevel)) !== resolvedRoot) {
    throw new Error("root must be the Git repository root");
  }

  const replaceRefs = String(await runGit(root, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace/",
  ])).trim();
  if (replaceRefs) throw new Error("Git replace refs are forbidden");

  const graftValue = String(await runGit(root, ["rev-parse", "--git-path", "info/grafts"])).trim();
  const graftPath = path.isAbsolute(graftValue) ? graftValue : path.resolve(root, graftValue);
  try {
    await lstat(graftPath);
    throw new Error("Git grafts are forbidden");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const shallow = String(await runGit(root, ["rev-parse", "--is-shallow-repository"])).trim();
  if (shallow !== "false") throw new Error("shallow Git repositories are forbidden");
};

const parseTreeEntries = (output) => Buffer.from(output)
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .map((record) => {
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/u.exec(record);
    if (!match) throw new Error(`unable to parse Git tree record: ${record}`);
    return { mode: match[1], type: match[2], object: match[3], path: match[4] };
  });

const isPhase1CandidatePath = (candidatePath) => (
  candidatePath.startsWith("docs/browser-audit-screenshots/380-")
  || PHASE1_EVIDENCE_PATH_SET.has(candidatePath)
);

const listCandidateTreeEntries = async (root, ref) => {
  const output = await runGit(root, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    ref,
    "--",
    ...SCOPED_DIRECTORIES,
  ], { encoding: "buffer" });
  return parseTreeEntries(output)
    .filter(({ path: candidatePath }) => isPhase1CandidatePath(candidatePath))
    .sort((left, right) => comparePaths(left.path, right.path));
};

const parseIndexEntries = (output) => Buffer.from(output)
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .map((record) => {
    const match = /^(\d+) ([0-9a-f]+) (\d+)\t([\s\S]+)$/u.exec(record);
    if (!match) throw new Error(`unable to parse Git index record: ${record}`);
    return {
      mode: match[1],
      object: match[2],
      stage: Number(match[3]),
      path: match[4],
    };
  });

const listCandidateIndexEntries = async (root) => {
  const output = await runGit(root, [
    "ls-files",
    "--stage",
    "-z",
    "--",
    ...SCOPED_DIRECTORIES,
  ], { encoding: "buffer" });
  return parseIndexEntries(output)
    .filter(({ path: candidatePath }) => isPhase1CandidatePath(candidatePath))
    .sort((left, right) => (
      comparePaths(left.path, right.path) || left.stage - right.stage
    ));
};

const nulPaths = (output) => Buffer.from(output)
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const protectedWorkingTreeChanges = async (root) => {
  const [unstaged, staged, untracked] = await Promise.all([
    runGit(root, ["diff", "--name-only", "-z", "--", ...SCOPED_DIRECTORIES], {
      encoding: "buffer",
    }),
    runGit(root, ["diff", "--cached", "--name-only", "-z", "--", ...SCOPED_DIRECTORIES], {
      encoding: "buffer",
    }),
    runGit(root, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...SCOPED_DIRECTORIES,
    ], { encoding: "buffer" }),
  ]);
  return [...new Set([
    ...nulPaths(unstaged),
    ...nulPaths(staged),
    ...nulPaths(untracked),
  ].filter(isPhase1CandidatePath))].sort(comparePaths);
};

const assertProtectedWorkingTreeClean = async (root) => {
  const changes = await protectedWorkingTreeChanges(root);
  if (changes.length > 0) {
    throw new Error(`Phase 1 evidence working tree is polluted: ${changes.join(", ")}`);
  }
};

const assertExactPaths = (entries, label) => {
  const paths = entries.map((entry) => entry.path);
  const missing = PHASE1_EVIDENCE_PATHS.filter((candidatePath) => !paths.includes(candidatePath));
  const extra = paths.filter((candidatePath) => !PHASE1_EVIDENCE_PATH_SET.has(candidatePath));
  const duplicates = paths.filter((candidatePath, index) => paths.indexOf(candidatePath) !== index);
  if (missing.length > 0) throw new Error(`${label} is missing: ${missing.join(", ")}`);
  if (extra.length > 0) throw new Error(`${label} contains unlocked paths: ${extra.join(", ")}`);
  if (duplicates.length > 0) throw new Error(`${label} contains duplicate paths`);
};

export function validatePhase1EvidenceLock(lock = {}, expectedCommitOverrides = {}) {
  const failures = [];
  if (!isObject(lock)) return ["Phase 1 evidence lock must be an object"];
  const expectedCommits = expectedCommitsFrom(expectedCommitOverrides);
  const allowedTopLevelKeys = [
    "schemaVersion",
    "kind",
    "generatedFrom",
    "acceptedApplicationCommit",
    "acceptedEvidenceCommit",
    "acceptedHandoffCommit",
    "acceptedAcceptanceCommit",
    "acceptedReviewPath",
    "phase1PlanPath",
    "phase0EvidenceLockPath",
    "summaryCount",
    "reviewImageCount",
    "contractCount",
    "entryCount",
    "entries",
  ];
  for (const key of Object.keys(lock)) {
    if (!allowedTopLevelKeys.includes(key)) {
      failures.push(`Phase 1 evidence lock key ${key} is not approved`);
    }
  }
  if (lock.schemaVersion !== 1) failures.push("Phase 1 evidence lock schemaVersion must be 1");
  if (lock.kind !== "frontend-upgrade-phase-1-evidence-lock") {
    failures.push("Phase 1 evidence lock kind mismatch");
  }
  if (lock.generatedFrom !== "tracked-git-objects") {
    failures.push("Phase 1 evidence lock source mismatch");
  }
  for (const [field, expected] of Object.entries(expectedCommits)) {
    if (!isSha(lock[field])) failures.push(`Phase 1 ${field} must be a Git SHA`);
    if (lock[field] !== expected) failures.push(`Phase 1 ${field} mismatch`);
  }
  if (lock.acceptedReviewPath !== PHASE1_ACCEPTED_REVIEW_PATH) {
    failures.push("Phase 1 accepted review path mismatch");
  }
  if (lock.phase1PlanPath !== PHASE1_PLAN_PATH) failures.push("Phase 1 plan path mismatch");
  if (lock.phase0EvidenceLockPath !== PHASE0_EVIDENCE_LOCK_PATH) {
    failures.push("Phase 0 evidence lock path mismatch");
  }
  if (lock.summaryCount !== PHASE1_SUMMARY_PATHS.length) {
    failures.push("Phase 1 evidence summaryCount mismatch");
  }
  if (lock.reviewImageCount !== PHASE1_REVIEW_IMAGE_PATHS.length) {
    failures.push("Phase 1 evidence reviewImageCount mismatch");
  }
  if (lock.contractCount !== PHASE1_CONTRACT_PATHS.length) {
    failures.push("Phase 1 evidence contractCount mismatch");
  }
  if (!Array.isArray(lock.entries)) {
    return [...failures, "Phase 1 evidence lock entries must be an array"];
  }
  if (lock.entryCount !== PHASE1_EVIDENCE_PATHS.length || lock.entryCount !== lock.entries.length) {
    failures.push("Phase 1 evidence lock entryCount mismatch");
  }
  const paths = lock.entries.map((entry) => entry?.path);
  if (new Set(paths).size !== paths.length) failures.push("Phase 1 evidence lock has duplicate paths");
  if (paths.join("\n") !== [...paths].sort(comparePaths).join("\n")) {
    failures.push("Phase 1 evidence lock paths must be sorted");
  }
  const missing = PHASE1_EVIDENCE_PATHS.filter((candidatePath) => !paths.includes(candidatePath));
  if (missing.length > 0) failures.push(`Phase 1 evidence lock is missing ${missing.join(", ")}`);
  for (const entry of lock.entries) {
    if (!isObject(entry)) {
      failures.push("Phase 1 evidence lock entry must be an object");
      continue;
    }
    for (const key of Object.keys(entry)) {
      if (!["path", "mode", "bytes", "sha256"].includes(key)) {
        failures.push(`Phase 1 evidence lock entry key ${key} is not approved`);
      }
    }
    if (!isSafeRepoRelativePath(entry.path)) {
      failures.push(`unsafe Phase 1 evidence path ${String(entry.path)}`);
    } else if (FORBIDDEN_EVIDENCE_NAMESPACE.test(entry.path)) {
      failures.push(`forbidden 370/390 evidence path ${entry.path}`);
    } else if (!PHASE1_EVIDENCE_PATH_SET.has(entry.path)) {
      failures.push(`Phase 1 evidence lock path ${entry.path} is not approved`);
    }
    if (!/^100(?:644|755)$/u.test(entry.mode ?? "")) {
      failures.push(`Phase 1 evidence lock mode mismatch for ${String(entry.path)}`);
    }
    if (!Number.isInteger(entry.bytes) || entry.bytes < 0) {
      failures.push(`Phase 1 evidence lock bytes mismatch for ${String(entry.path)}`);
    }
    if (!/^[0-9a-f]{64}$/u.test(entry.sha256 ?? "")) {
      failures.push(`Phase 1 evidence lock SHA-256 mismatch for ${String(entry.path)}`);
    }
  }
  return [...new Set(failures)];
}

export async function buildPhase1EvidenceLock({ root, headRef = "HEAD", ...commitOverrides } = {}) {
  if (typeof root !== "string" || root.length === 0) throw new Error("root is required");
  if (!(headRef === "HEAD" || isSha(headRef))) {
    throw new Error("headRef must be HEAD or a Git SHA");
  }
  const commits = expectedCommitsFrom(commitOverrides);
  if (new Set(Object.values(commits)).size !== Object.values(commits).length) {
    throw new Error("accepted Phase 1 commits must be distinct");
  }
  await assertTrustedRepositoryShape(root);
  for (const [label, commit] of Object.entries(commits)) {
    await assertCommit(root, commit, label);
  }
  const ancestry = [
    [commits.acceptedApplicationCommit, commits.acceptedEvidenceCommit, "application", "evidence"],
    [commits.acceptedEvidenceCommit, commits.acceptedHandoffCommit, "evidence", "handoff"],
    [commits.acceptedHandoffCommit, commits.acceptedAcceptanceCommit, "handoff", "acceptance"],
    [commits.acceptedAcceptanceCommit, headRef, "acceptance", headRef],
  ];
  for (const [ancestor, descendant, ancestorLabel, descendantLabel] of ancestry) {
    if (!await gitIsAncestor(root, ancestor, descendant)) {
      throw new Error(
        `accepted Phase 1 ${ancestorLabel} commit is not an ancestor of ${descendantLabel}`,
      );
    }
  }
  await assertProtectedWorkingTreeClean(root);

  const trackedEntries = await listCandidateTreeEntries(
    root,
    commits.acceptedAcceptanceCommit,
  );
  assertExactPaths(trackedEntries, "accepted Phase 1 evidence tree");
  const entries = [];
  for (const entry of trackedEntries) {
    if (!isSafeRepoRelativePath(entry.path)) {
      throw new Error(`unsafe tracked Phase 1 evidence path: ${String(entry.path)}`);
    }
    if (entry.type !== "blob" || !/^100(?:644|755)$/u.test(entry.mode)) {
      throw new Error(
        `tracked Phase 1 evidence must be a regular blob: ${entry.path} (${entry.type} ${entry.mode})`,
      );
    }
    const bytes = await gitBlob(root, entry.object);
    entries.push({
      path: entry.path,
      mode: entry.mode,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  const lock = {
    schemaVersion: 1,
    kind: "frontend-upgrade-phase-1-evidence-lock",
    generatedFrom: "tracked-git-objects",
    ...commits,
    acceptedReviewPath: PHASE1_ACCEPTED_REVIEW_PATH,
    phase1PlanPath: PHASE1_PLAN_PATH,
    phase0EvidenceLockPath: PHASE0_EVIDENCE_LOCK_PATH,
    summaryCount: PHASE1_SUMMARY_PATHS.length,
    reviewImageCount: PHASE1_REVIEW_IMAGE_PATHS.length,
    contractCount: PHASE1_CONTRACT_PATHS.length,
    entryCount: entries.length,
    entries,
  };
  const failures = validatePhase1EvidenceLock(lock, commits);
  if (failures.length > 0) throw new Error(failures.join("; "));
  return lock;
}

const compareEntriesToLock = async ({ root, entries, lock, label, failures }) => {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const entry of entries) {
    if (!PHASE1_EVIDENCE_PATH_SET.has(entry.path)) {
      failures.push(`unlocked tracked Phase 1 path in ${label}: ${entry.path}`);
    }
    if (entry.type !== undefined && entry.type !== "blob") {
      failures.push(`non-blob Phase 1 path in ${label}: ${entry.path}`);
    }
    if (entry.stage !== undefined && entry.stage !== 0) {
      failures.push(`non-stage-0 Phase 1 index entry: ${entry.path}`);
    }
    if (!/^100(?:644|755)$/u.test(entry.mode)) {
      failures.push(`non-regular Phase 1 path in ${label}: ${entry.path} (${entry.mode})`);
    }
  }
  for (const locked of lock.entries) {
    const candidate = byPath.get(locked.path);
    if (!candidate) {
      failures.push(`locked Phase 1 path missing from ${label}: ${locked.path}`);
      continue;
    }
    if (
      candidate.type !== undefined && candidate.type !== "blob"
      || candidate.stage !== undefined && candidate.stage !== 0
      || !/^100(?:644|755)$/u.test(candidate.mode)
    ) continue;
    try {
      const bytes = await gitBlob(root, candidate.object);
      if (
        candidate.mode !== locked.mode
        || bytes.length !== locked.bytes
        || sha256(bytes) !== locked.sha256
      ) failures.push(`tracked bytes mismatch for locked Phase 1 path ${locked.path} in ${label}`);
    } catch (error) {
      failures.push(`unable to inspect ${locked.path} in ${label}: ${error.message}`);
    }
  }
};

export async function verifyPhase1EvidenceLock({
  root,
  lock,
  headRef = "HEAD",
  expectedCommitOverrides = {},
} = {}) {
  const failures = validatePhase1EvidenceLock(lock, expectedCommitOverrides);
  if (!(headRef === "HEAD" || isSha(headRef))) failures.push("headRef must be HEAD or a Git SHA");
  if (typeof root !== "string" || root.length === 0) {
    failures.push("root is required to verify Phase 1 evidence lock");
  }
  if (failures.length > 0) return [...new Set(failures)];
  try {
    await assertTrustedRepositoryShape(root);
  } catch (error) {
    return [`untrusted Git repository: ${error.message}`];
  }

  const commits = expectedCommitsFrom(expectedCommitOverrides);
  for (const [label, commit] of Object.entries(commits)) {
    try {
      await assertCommit(root, commit, label);
      if (!await gitIsAncestor(root, commit, headRef)) {
        failures.push(`${commit} is not an ancestor of ${headRef}`);
      }
    } catch (error) {
      failures.push(`unable to verify ${label}: ${error.message}`);
    }
  }
  let expectedLock;
  try {
    expectedLock = await buildPhase1EvidenceLock({ root, headRef, ...commits });
    if (!canonicalEqual(lock, expectedLock)) {
      failures.push("Phase 1 evidence lock does not match accepted tracked Git objects");
    }
  } catch (error) {
    failures.push(`unable to rebuild Phase 1 evidence lock: ${error.message}`);
  }

  try {
    const headEntries = await listCandidateTreeEntries(root, headRef);
    await compareEntriesToLock({
      root,
      entries: headEntries,
      lock,
      label: headRef,
      failures,
    });
  } catch (error) {
    failures.push(`unable to inspect Phase 1 evidence at ${headRef}: ${error.message}`);
  }
  try {
    const indexEntries = await listCandidateIndexEntries(root);
    await compareEntriesToLock({
      root,
      entries: indexEntries,
      lock,
      label: "index",
      failures,
    });
  } catch (error) {
    failures.push(`unable to inspect Phase 1 evidence index: ${error.message}`);
  }
  try {
    const changes = await protectedWorkingTreeChanges(root);
    for (const candidatePath of changes) {
      failures.push(`working-tree pollution for Phase 1 evidence path ${candidatePath}`);
    }
  } catch (error) {
    failures.push(`unable to inspect Phase 1 evidence working tree: ${error.message}`);
  }
  return [...new Set(failures)];
}
