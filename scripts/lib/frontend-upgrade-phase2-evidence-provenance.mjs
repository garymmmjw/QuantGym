import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  mkdir,
  open,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { promisify, TextDecoder } from "node:util";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
  PHASE2_PREVIEW_CONTRACT_PATH,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";
import {
  validatePhase2ProviderEvidence,
} from "./frontend-upgrade-phase2-provider-evidence.mjs";

const execFileAsync = promisify(execFile);
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const TREE_PATTERN = /^[0-9a-f]{40,64}$/u;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_PROVIDER_EVIDENCE_BYTES = 2 * 1024 * 1024;
const MAX_REVIEW_HANDOFF_MS = 5 * 60 * 1_000;
export const PHASE2_REVIEW_DOCUMENT_MAX_BYTES = (
  Math.ceil(MAX_PROVIDER_EVIDENCE_BYTES / 3) * 4 + 512 * 1024
);
const MAX_EVIDENCE_OUTPUT_BYTES = 16 * 1024 * 1024;
const PHASE2_EVIDENCE_NAMESPACE = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-"
);

export const PHASE2_EVIDENCE_LIFECYCLE_STATES = Object.freeze({
  candidate: "candidate",
  evidence: "evidence",
});

export const PHASE2_REVIEW_DOCUMENT_PATH = (
  "docs/superpowers/reviews/2026-07-27-quantgym-frontend-platform-upgrade-phase-2.md"
);

export const PHASE2_PROVIDER_EVIDENCE_BLOCK_START = (
  "<!-- quantgym-phase2-provider-evidence:v1 encoding=base64 -->"
);
export const PHASE2_PROVIDER_EVIDENCE_BLOCK_END = (
  "<!-- /quantgym-phase2-provider-evidence:v1 -->"
);

const CANONICAL_BASE64_PATTERN = (
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u
);

export function renderPhase2EmbeddedProviderEvidence(providerEvidenceBytes) {
  if (
    !Buffer.isBuffer(providerEvidenceBytes)
    || providerEvidenceBytes.length <= 0
    || providerEvidenceBytes.length > MAX_PROVIDER_EVIDENCE_BYTES
  ) throw new Error("Phase 2 embedded provider evidence bytes are invalid");
  const encoded = providerEvidenceBytes.toString("base64");
  if (
    !CANONICAL_BASE64_PATTERN.test(encoded)
    || !Buffer.from(encoded, "base64").equals(providerEvidenceBytes)
  ) throw new Error("Phase 2 embedded provider evidence base64 is invalid");
  return [
    PHASE2_PROVIDER_EVIDENCE_BLOCK_START,
    encoded,
    PHASE2_PROVIDER_EVIDENCE_BLOCK_END,
  ].join("\n");
}

const PHASE2_TRACKED_COMPONENT_SUMMARIES = Object.freeze({
  contract: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-contract-summary.json"
  ),
  visual: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-summary.json"
  ),
  accessibility: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-accessibility-summary.json"
  ),
  journeys: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-journeys-summary.json"
  ),
  recovery: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-recovery-summary.json"
  ),
  performance: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-performance-summary.json"
  ),
});

const PHASE2_TRACKED_COMPONENT_CHECKS = Object.freeze({
  contract: "frontend-upgrade-phase2-contracts",
  visual: "frontend-upgrade-phase2-visual",
  accessibility: "frontend-upgrade-phase2-accessibility",
  journeys: "frontend-upgrade-phase2-journeys",
  recovery: "frontend-upgrade-phase2-recovery",
  performance: "frontend-upgrade-phase2-performance",
});

const PHASE2_TRACKED_COMPONENT_ENVELOPE_KEYS = Object.freeze([
  "schemaVersion",
  "check",
  "status",
  "checkedAt",
  "commit",
  "manifestSha256",
  "phase1EvidenceLockSha256",
  "results",
  "visualCases",
  "checks",
  "counts",
  "metrics",
  "failureCodes",
]);

const TRUSTED_GIT_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
});

export const PHASE2_USER_UNTRACKED_ALLOWLIST = Object.freeze([
  "docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json",
  "docs/browser-audit-screenshots/371-current-preview-audit.png",
  "docs/browser-audit-screenshots/372-mascot-quality-auth-before.png",
  "docs/browser-audit-screenshots/374-mascot-quality-auth-final.jpg",
]);

const ISOLATED_RUNTIME_PREFIXES = Object.freeze([
  "dist-v2/",
  "test-results/",
  "playwright-report/",
]);

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
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const safeRelativePath = (relativePath) => (
  typeof relativePath === "string"
  && relativePath.length > 0
  && !relativePath.includes("\0")
  && !relativePath.includes("\\")
  && !path.posix.isAbsolute(relativePath)
  && path.posix.normalize(relativePath) === relativePath
  && relativePath.split("/").every((segment) => !["", ".", ".."].includes(segment))
);

const git = async (root, args, options = {}) => execFileAsync(
  "/usr/bin/git",
  ["-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args],
  {
    cwd: root,
    encoding: options.encoding ?? "utf8",
    env: TRUSTED_GIT_ENV,
    maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024,
  },
);

const resolveCommit = async (root, reference = "HEAD") => {
  const { stdout } = await git(root, ["rev-parse", "--verify", `${reference}^{commit}`]);
  const commit = stdout.trim();
  if (!SHA_PATTERN.test(commit)) throw new Error("Phase 2 frozen commit is invalid");
  return commit;
};

const readHeadJson = async (root, head, relativePath, maximumBytes) => {
  if (!safeRelativePath(relativePath)) throw new Error("Phase 2 provenance path is unsafe");
  const { stdout } = await git(
    root,
    ["show", `${head}:${relativePath}`],
    { encoding: "buffer", maxBuffer: maximumBytes + 1 },
  );
  if (!Buffer.isBuffer(stdout) || stdout.length <= 0 || stdout.length > maximumBytes) {
    throw new Error(`Phase 2 frozen JSON is missing or oversized: ${relativePath}`);
  }
  try {
    return JSON.parse(stdout.toString("utf8"));
  } catch {
    throw new Error(`Phase 2 frozen JSON is invalid: ${relativePath}`);
  }
};

const readHeadTrackedBytes = async ({
  root,
  head,
  relativePath,
  maximumBytes,
  optional = false,
}) => {
  if (!safeRelativePath(relativePath)) throw new Error("Phase 2 provenance path is unsafe");
  const { stdout: treeOutput } = await git(root, [
    "ls-tree",
    "--full-tree",
    "-z",
    head,
    "--",
    relativePath,
  ], { encoding: "buffer", maxBuffer: 64 * 1024 });
  if (!Buffer.isBuffer(treeOutput)) {
    throw new Error("Phase 2 tracked evidence inventory is invalid");
  }
  if (treeOutput.length === 0) {
    if (optional) return null;
    throw new Error(`Phase 2 tracked evidence is missing: ${relativePath}`);
  }
  const records = treeOutput.toString("utf8").split("\0").filter(Boolean);
  if (records.length !== 1) {
    throw new Error(`Phase 2 tracked evidence inventory is ambiguous: ${relativePath}`);
  }
  const tabIndex = records[0].indexOf("\t");
  const header = tabIndex >= 0 ? records[0].slice(0, tabIndex).split(" ") : [];
  const observedPath = tabIndex >= 0 ? records[0].slice(tabIndex + 1) : "";
  const [mode, type, objectId] = header;
  if (
    header.length !== 3
    || mode !== "100644"
    || type !== "blob"
    || !/^[0-9a-f]{40,64}$/u.test(objectId ?? "")
    || observedPath !== relativePath
  ) throw new Error(`Phase 2 tracked evidence is not a regular file: ${relativePath}`);
  const { stdout } = await git(
    root,
    ["cat-file", "blob", objectId],
    { encoding: "buffer", maxBuffer: maximumBytes + 1 },
  );
  if (!Buffer.isBuffer(stdout) || stdout.length <= 0 || stdout.length > maximumBytes) {
    throw new Error(`Phase 2 tracked evidence is missing or oversized: ${relativePath}`);
  }
  return stdout;
};

const readHeadTrackedJson = async (options) => {
  const bytes = await readHeadTrackedBytes(options);
  if (bytes === null) return null;
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`Phase 2 tracked evidence JSON is invalid: ${options.relativePath}`);
  }
  return Object.freeze({ bytes, value });
};

const trackedNamespaceEntries = async ({ root, commit }) => {
  const { stdout } = await git(root, [
    "ls-tree",
    "--full-tree",
    "-r",
    "-z",
    commit,
    "--",
    "docs/browser-audit-screenshots",
  ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
  if (!Buffer.isBuffer(stdout)) throw new Error("Phase 2 lifecycle tree is invalid");
  const entries = stdout.toString("utf8").split("\0").filter(Boolean).map((record) => {
    const tabIndex = record.indexOf("\t");
    const [mode, type, objectId] = tabIndex >= 0
      ? record.slice(0, tabIndex).split(" ")
      : [];
    const relativePath = tabIndex >= 0 ? record.slice(tabIndex + 1) : "";
    if (
      !safeRelativePath(relativePath)
      || !TREE_PATTERN.test(objectId ?? "")
      || typeof mode !== "string"
      || typeof type !== "string"
    ) throw new Error("Phase 2 lifecycle tree entry is invalid");
    return Object.freeze({ mode, objectId, path: relativePath, type });
  });
  return Object.freeze(entries.filter((entry) => (
    entry.path.startsWith(PHASE2_EVIDENCE_NAMESPACE)
  )));
};

const historicalNamespacePaths = async ({ root, head }) => {
  const { stdout } = await git(root, [
    "log",
    "--format=",
    "--name-only",
    head,
    "--",
    "docs/browser-audit-screenshots",
  ]);
  return Object.freeze([...new Set(stdout.split("\n").map((entry) => entry.trim()).filter(
    (entry) => entry.startsWith(PHASE2_EVIDENCE_NAMESPACE),
  ))].sort());
};

const changedPathsBetween = async ({ root, from, to }) => {
  const { stdout } = await git(root, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    `${from}..${to}`,
    "--",
  ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
  if (!Buffer.isBuffer(stdout)) throw new Error("Phase 2 lifecycle diff is invalid");
  return Object.freeze(stdout.toString("utf8").split("\0").filter(Boolean).sort());
};

const changedStatusBetween = async ({ root, from, to }) => {
  const { stdout } = await git(root, [
    "diff",
    "--name-status",
    "--no-renames",
    "-z",
    `${from}..${to}`,
    "--",
  ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 });
  if (!Buffer.isBuffer(stdout)) throw new Error("Phase 2 lifecycle status diff is invalid");
  const fields = stdout.toString("utf8").split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (fields.length % 2 !== 0) throw new Error("Phase 2 lifecycle status diff is malformed");
  const entries = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const relativePath = fields[index + 1];
    if (!/^[AMDT]$/u.test(status) || !safeRelativePath(relativePath)) {
      throw new Error("Phase 2 lifecycle status diff is malformed");
    }
    entries.push(Object.freeze({ path: relativePath, status }));
  }
  return Object.freeze(entries);
};

const linearSuccessors = async ({ root, from, to }) => {
  const { stdout } = await git(root, [
    "rev-list",
    "--reverse",
    `${from}..${to}`,
  ]);
  const commits = stdout.split("\n").filter(Boolean);
  if (commits.some((commit) => !SHA_PATTERN.test(commit))) {
    throw new Error("Phase 2 lifecycle successor identity is invalid");
  }
  return Object.freeze(commits);
};

const assertDirectParent = async ({ root, commit, parent }) => {
  const { stdout } = await git(root, ["rev-list", "--parents", "-n", "1", commit]);
  const record = stdout.trim().split(" ");
  if (record.length !== 2 || record[0] !== commit || record[1] !== parent) {
    throw new Error("Phase 2 lifecycle contains a merge or non-linear successor");
  }
};

const occurrenceCount = (value, needle) => {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = value.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
};

const parseEmbeddedProviderEvidence = ({ document, expectedSha256 }) => {
  if (
    typeof document !== "string"
    || occurrenceCount(document, PHASE2_PROVIDER_EVIDENCE_BLOCK_START) !== 1
    || occurrenceCount(document, PHASE2_PROVIDER_EVIDENCE_BLOCK_END) !== 1
  ) throw new Error("Phase 2 review embedded provider evidence block is invalid");
  const blockStart = `${PHASE2_PROVIDER_EVIDENCE_BLOCK_START}\n`;
  const blockEnd = `\n${PHASE2_PROVIDER_EVIDENCE_BLOCK_END}`;
  const startIndex = document.indexOf(blockStart);
  const endIndex = document.indexOf(blockEnd, startIndex + blockStart.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error("Phase 2 review embedded provider evidence block is invalid");
  }
  const encoded = document.slice(startIndex + blockStart.length, endIndex);
  const maximumEncodedLength = Math.ceil(MAX_PROVIDER_EVIDENCE_BYTES / 3) * 4;
  if (
    encoded.length <= 0
    || encoded.length > maximumEncodedLength
    || !CANONICAL_BASE64_PATTERN.test(encoded)
  ) throw new Error("Phase 2 review embedded provider evidence base64 is invalid");
  const bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length <= 0
    || bytes.length > MAX_PROVIDER_EVIDENCE_BYTES
    || bytes.toString("base64") !== encoded
    || sha256(bytes) !== expectedSha256
  ) throw new Error("Phase 2 review embedded provider evidence hash is invalid");
  let evidence;
  try {
    evidence = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("Phase 2 review embedded provider evidence JSON is invalid");
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  if (!bytes.equals(canonicalBytes)) {
    throw new Error("Phase 2 review embedded provider evidence JSON is not canonical");
  }
  return { bytes, evidence };
};

const validateTrackedReviewHandoff = async ({
  root,
  head,
  applicationCommit,
  evidenceCommit,
  evidenceOutputs,
  requireReady,
}) => {
  const reviewBytes = await readHeadTrackedBytes({
    root,
    head,
    relativePath: PHASE2_REVIEW_DOCUMENT_PATH,
    maximumBytes: PHASE2_REVIEW_DOCUMENT_MAX_BYTES,
  });
  const document = reviewBytes.toString("utf8");
  const metadataPattern = (
    /<!-- quantgym-phase2-review:v1 application=([0-9a-f]{40}) evidence=([0-9a-f]{40}) visualReceipt=([0-9a-f]{64}) provider=([0-9a-f]{64}) aggregate=([0-9a-f]{64}) generated=([^\s]+) status=(ready-for-review|accepted) -->/gu
  );
  const matches = [...document.matchAll(metadataPattern)];
  const generatedAt = matches.length === 1 ? Date.parse(matches[0][6]) : Number.NaN;
  if (
    matches.length !== 1
    || matches[0][1] !== applicationCommit
    || matches[0][2] !== evidenceCommit
    || !Number.isFinite(generatedAt)
    || new Date(generatedAt).toISOString() !== matches[0][6]
    || !document.startsWith("# QuantGym Frontend Platform Upgrade Phase 2 Review\n")
    || !new RegExp(`^Status: ${matches[0]?.[7]}$`, "mu").test(document)
    || (
      matches[0]?.[7] === "ready-for-review"
      && !/^Acceptance: pending Gary's explicit confirmation$/mu.test(document)
    )
    || (
      matches[0]?.[7] === "accepted"
      && !/^Acceptance: Gary explicitly accepted Phase 2$/mu.test(document)
    )
    || (
      requireReady === true
      && (
        matches[0][7] !== "ready-for-review"
      )
    )
  ) throw new Error("Phase 2 review handoff document is invalid");

  const embeddedProvider = parseEmbeddedProviderEvidence({
    document,
    expectedSha256: matches[0][4],
  });
  const providerFailures = validatePhase2ProviderEvidence(embeddedProvider.evidence, {
    expectedCommit: applicationCommit,
    nowMs: generatedAt,
  });
  if (providerFailures.length > 0) {
    throw new Error(
      `Phase 2 review embedded provider evidence failed: ${providerFailures[0]}`,
    );
  }

  const aggregatePath = evidenceOutputs.find((relativePath) => (
    relativePath.endsWith("390-frontend-upgrade-phase-2-summary.json")
  ));
  const visualReceiptPath = evidenceOutputs.find((relativePath) => (
    relativePath.endsWith("390-frontend-upgrade-phase-2-visual-review-receipt.json")
  ));
  if (!aggregatePath || !visualReceiptPath) {
    throw new Error("Phase 2 review handoff evidence bindings are missing");
  }
  const [aggregateBytes, visualReceiptBytes] = await Promise.all([
    readHeadTrackedBytes({
      root,
      head,
      relativePath: aggregatePath,
      maximumBytes: MAX_MANIFEST_BYTES,
    }),
    readHeadTrackedBytes({
      root,
      head,
      relativePath: visualReceiptPath,
      maximumBytes: MAX_MANIFEST_BYTES,
    }),
  ]);
  if (
    matches[0][3] !== sha256(visualReceiptBytes)
    || matches[0][5] !== sha256(aggregateBytes)
  ) throw new Error("Phase 2 review handoff hashes do not match tracked evidence");
  let aggregate;
  try {
    aggregate = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(aggregateBytes));
  } catch {
    throw new Error("Phase 2 review handoff aggregate is invalid JSON");
  }
  const providerCapturedAt = Date.parse(embeddedProvider.evidence.capturedAt);
  const aggregateCheckedAt = Date.parse(aggregate?.checkedAt);
  if (
    !Number.isFinite(providerCapturedAt)
    || new Date(providerCapturedAt).toISOString() !== embeddedProvider.evidence.capturedAt
    || !Number.isFinite(aggregateCheckedAt)
    || new Date(aggregateCheckedAt).toISOString() !== aggregate?.checkedAt
    || generatedAt < providerCapturedAt
    || generatedAt - providerCapturedAt > MAX_REVIEW_HANDOFF_MS
    || generatedAt < aggregateCheckedAt
    || generatedAt - aggregateCheckedAt > MAX_REVIEW_HANDOFF_MS
  ) throw new Error("Phase 2 review handoff time is outside the exact five-minute window");
  return Object.freeze({
    status: matches[0][7],
    providerSha256: matches[0][4],
    generatedAt: matches[0][6],
  });
};

const exactSortedStrings = (actual, expected) => {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.length === right.length
    && left.every((entry, index) => entry === right[index]);
};

const validateEvidenceOutputs = (manifest) => {
  const outputs = manifest?.evidenceOutputs;
  if (
    manifest?.schemaVersion !== 1
    || manifest?.phase !== 2
    || !Array.isArray(outputs)
    || outputs.length !== 30
    || new Set(outputs).size !== outputs.length
    || outputs.some((entry) => (
      !safeRelativePath(entry)
      || !entry.startsWith("docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-")
    ))
  ) throw new Error("Phase 2 frozen evidence output inventory is invalid");
  return Object.freeze([...outputs]);
};

const parsePorcelainV1Z = (stdout) => {
  if (!Buffer.isBuffer(stdout)) throw new Error("Git status output must be binary-safe");
  const records = stdout.toString("utf8").split("\0");
  if (records.at(-1) === "") records.pop();
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4 || record[2] !== " ") {
      throw new Error("Git porcelain status is malformed");
    }
    const status = record.slice(0, 2);
    const relativePath = record.slice(3);
    if (!safeRelativePath(relativePath)) {
      throw new Error("Git porcelain status contains an unsafe path");
    }
    const entry = { path: relativePath, status };
    if (/[RC]/u.test(status)) {
      const sourcePath = records[index + 1];
      if (!safeRelativePath(sourcePath)) {
        throw new Error("Git porcelain rename status is malformed");
      }
      entry.sourcePath = sourcePath;
      index += 1;
    }
    entries.push(Object.freeze(entry));
  }
  return Object.freeze(entries);
};

const statusEntries = async (root) => {
  const { stdout } = await git(root, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "-z",
  ], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  return parsePorcelainV1Z(stdout);
};

const isAllowedRuntimePath = (relativePath) => (
  relativePath === "node_modules"
  || ISOLATED_RUNTIME_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
);

const assertStatusAllowed = ({
  entries,
  evidenceOutputs,
  isolated = false,
}) => {
  const evidenceSet = new Set([...evidenceOutputs, PHASE2_REVIEW_DOCUMENT_PATH]);
  const userSet = new Set(PHASE2_USER_UNTRACKED_ALLOWLIST);
  const failures = [];
  for (const entry of entries) {
    const indexStatus = entry.status[0];
    const worktreeStatus = entry.status[1];
    if (indexStatus !== " " && indexStatus !== "?") {
      failures.push(`staged:${entry.status}:${entry.path}`);
      continue;
    }
    if (entry.sourcePath !== undefined) {
      failures.push(`rename:${entry.status}:${entry.path}`);
      continue;
    }
    if (entry.status === "??") {
      if (
        evidenceSet.has(entry.path)
        || (!isolated && userSet.has(entry.path))
        || (isolated && isAllowedRuntimePath(entry.path))
      ) continue;
      failures.push(`untracked:${entry.path}`);
      continue;
    }
    if (
      (worktreeStatus === "M" && evidenceSet.has(entry.path))
      || (worktreeStatus === "D" && entry.path === PHASE2_REVIEW_DOCUMENT_PATH)
    ) continue;
    failures.push(`tracked:${entry.status}:${entry.path}`);
  }
  if (failures.length > 0) {
    throw new Error(`Phase 2 evidence worktree is not clean: ${failures.join(", ")}`);
  }
};

const readProviderApplicationCommit = async ({ root, head, previewContract }) => {
  if (
    previewContract?.commits?.candidateApplicationCommitSource
      !== "provider-evidence.applicationCommit"
    || previewContract?.commits?.candidateApiCommitSource
      !== "provider-evidence.deployments.api.commit"
    || previewContract?.commits?.candidatePagesCommitSource
      !== "provider-evidence.deployments.pages.commit"
    || previewContract?.commits?.candidateCommitsMustMatch !== true
  ) throw new Error("Phase 2 frozen application commit source is invalid");
  const providerRelativePath = previewContract?.evidence?.providerEvidencePath;
  if (!safeRelativePath(providerRelativePath)) {
    throw new Error("Phase 2 provider evidence path is invalid");
  }
  const providerPath = path.join(root, providerRelativePath);
  let metadata;
  try {
    metadata = await lstat(providerPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("Phase 2 provider evidence is not a regular file");
  }
  if ((metadata.mode & 0o777) !== 0o600) {
    throw new Error("Phase 2 provider evidence must use mode 0600");
  }
  if (metadata.size <= 0 || metadata.size > MAX_PROVIDER_EVIDENCE_BYTES) {
    throw new Error("Phase 2 provider evidence is oversized");
  }
  let provider;
  try {
    provider = JSON.parse(await readFile(providerPath, "utf8"));
  } catch {
    throw new Error("Phase 2 provider evidence is invalid JSON");
  }
  const applicationCommit = provider?.applicationCommit;
  if (!SHA_PATTERN.test(applicationCommit ?? "")) {
    throw new Error("Phase 2 provider application commit is invalid");
  }
  const deployedCommits = [
    provider?.deployments?.api?.commit,
    provider?.deployments?.pages?.commit,
  ];
  if (deployedCommits.some((value) => value !== applicationCommit)) {
    throw new Error("Phase 2 provider deployment commits are not aligned");
  }
  await resolveCommit(root, applicationCommit);
  if (applicationCommit === head) return applicationCommit;
  try {
    await git(root, ["merge-base", "--is-ancestor", applicationCommit, head]);
  } catch {
    throw new Error("Phase 2 provider application commit is not an ancestor of HEAD");
  }
  return applicationCommit;
};

const assertEvidenceOnlySuccessor = async ({
  root,
  applicationCommit,
  head,
  evidenceOutputs,
}) => {
  if (applicationCommit === head) return;
  const { stdout } = await git(root, [
    "diff",
    "--name-only",
    "--no-renames",
    `${applicationCommit}..${head}`,
    "--",
  ]);
  const changed = stdout.split("\n").filter(Boolean);
  const allowed = new Set([...evidenceOutputs, PHASE2_REVIEW_DOCUMENT_PATH]);
  if (changed.length === 0 || changed.some((relativePath) => !allowed.has(relativePath))) {
    throw new Error("Phase 2 evidence successor contains application source changes");
  }
};

const validateTrackedComponentSummary = ({
  component,
  record,
  manifestSha256,
  phase1EvidenceLockSha256,
}) => {
  const summary = record?.value;
  if (
    !exactKeys(summary, PHASE2_TRACKED_COMPONENT_ENVELOPE_KEYS)
    || summary.schemaVersion !== 1
    || summary.check !== PHASE2_TRACKED_COMPONENT_CHECKS[component]
    || summary.status !== "pass"
    || !SHA_PATTERN.test(summary.commit ?? "")
    || summary.manifestSha256 !== manifestSha256
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !Array.isArray(summary.results)
    || !Array.isArray(summary.visualCases)
    || !isPlainObject(summary.checks)
    || !isPlainObject(summary.counts)
    || !isPlainObject(summary.metrics)
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) throw new Error(`Phase 2 tracked ${component} summary envelope is invalid`);
  return summary.commit;
};

const deriveTrackedApplicationCommit = async ({
  root,
  head,
  manifestBytes,
  evidenceOutputs,
}) => {
  const phase1EvidenceLockBytes = await readHeadTrackedBytes({
    root,
    head,
    relativePath: PHASE1_EVIDENCE_LOCK_PATH,
    maximumBytes: MAX_MANIFEST_BYTES,
  });
  const manifestSha256 = sha256(manifestBytes);
  const phase1EvidenceLockSha256 = sha256(phase1EvidenceLockBytes);
  const componentRecords = await Promise.all(
    Object.entries(PHASE2_TRACKED_COMPONENT_SUMMARIES).map(async ([component, relativePath]) => [
      component,
      await readHeadTrackedJson({
        root,
        head,
        relativePath,
        maximumBytes: MAX_MANIFEST_BYTES,
        optional: true,
      }),
    ]),
  );
  const present = componentRecords.filter(([, record]) => record !== null);
  if (present.length === 0) return head;
  const commits = present.map(([component, record]) => validateTrackedComponentSummary({
    component,
    record,
    manifestSha256,
    phase1EvidenceLockSha256,
  }));
  if (new Set(commits).size !== 1) {
    throw new Error("Phase 2 tracked component summary commits are inconsistent");
  }
  const applicationCommit = commits[0];
  if (applicationCommit === head) return head;
  await resolveCommit(root, applicationCommit);
  try {
    await git(root, ["merge-base", "--is-ancestor", applicationCommit, head]);
  } catch {
    throw new Error("Phase 2 tracked application commit is not an ancestor of HEAD");
  }
  await assertEvidenceOnlySuccessor({
    root,
    applicationCommit,
    head,
    evidenceOutputs,
  });
  if (present.length !== Object.keys(PHASE2_TRACKED_COMPONENT_SUMMARIES).length) {
    throw new Error("Phase 2 tracked evidence successor is missing a component summary");
  }
  return applicationCommit;
};

export async function classifyPhase2EvidenceLifecycle({ root } = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 lifecycle root must be absolute");
  }
  const head = await resolveCommit(root);
  const manifestRecord = await readHeadTrackedJson({
    root,
    head,
    relativePath: PHASE2_ACCEPTANCE_MANIFEST_PATH,
    maximumBytes: MAX_MANIFEST_BYTES,
  });
  const evidenceOutputs = validateEvidenceOutputs(manifestRecord.value);
  const expected = new Set(evidenceOutputs);
  const [namespaceEntries, reviewAtHead] = await Promise.all([
    trackedNamespaceEntries({ root, commit: head }),
    readHeadTrackedBytes({
      root,
      head,
      relativePath: PHASE2_REVIEW_DOCUMENT_PATH,
      maximumBytes: PHASE2_REVIEW_DOCUMENT_MAX_BYTES,
      optional: true,
    }),
  ]);
  const unexpected = namespaceEntries.filter((entry) => !expected.has(entry.path));
  if (unexpected.length > 0) {
    throw new Error("Phase 2 lifecycle contains substitute or extra evidence paths");
  }
  const present = namespaceEntries.filter((entry) => expected.has(entry.path));
  if (present.length === 0) {
    if (reviewAtHead !== null) {
      throw new Error("Phase 2 candidate cannot contain a review handoff document");
    }
    const historical = await historicalNamespacePaths({ root, head });
    if (historical.length > 0) {
      throw new Error("Phase 2 lifecycle cannot return to candidate after evidence existed");
    }
    return Object.freeze({
      schemaVersion: 1,
      state: PHASE2_EVIDENCE_LIFECYCLE_STATES.candidate,
      applicationCommit: head,
      evidenceCommit: null,
      headCommit: head,
      reviewCommit: null,
      evidenceOutputCount: 0,
      evidenceOutputTarget: evidenceOutputs.length,
    });
  }
  if (present.length !== evidenceOutputs.length) {
    throw new Error("Phase 2 lifecycle evidence inventory is partial");
  }
  if (present.some((entry) => entry.mode !== "100644" || entry.type !== "blob")) {
    throw new Error("Phase 2 lifecycle evidence must be regular tracked files");
  }

  const applicationCommit = await deriveTrackedApplicationCommit({
    root,
    head,
    manifestBytes: manifestRecord.bytes,
    evidenceOutputs,
  });
  if (applicationCommit === head) {
    throw new Error("Phase 2 evidence commit must be distinct from the application commit");
  }
  const applicationNamespaceEntries = await trackedNamespaceEntries({
    root,
    commit: applicationCommit,
  });
  if (applicationNamespaceEntries.length !== 0) {
    throw new Error("Phase 2 application commit must contain zero Phase 2 evidence outputs");
  }
  const successors = await linearSuccessors({ root, from: applicationCommit, to: head });
  if (successors.length === 0) {
    throw new Error("Phase 2 lifecycle is missing its evidence transition commit");
  }
  const evidenceCommit = successors[0];
  await assertDirectParent({ root, commit: evidenceCommit, parent: applicationCommit });
  const evidenceEntries = await trackedNamespaceEntries({ root, commit: evidenceCommit });
  if (
    !exactSortedStrings(evidenceEntries.map((entry) => entry.path), evidenceOutputs)
    || evidenceEntries.some((entry) => entry.mode !== "100644" || entry.type !== "blob")
  ) throw new Error("Phase 2 evidence transition must add the exact regular 30 outputs");
  const evidenceChanges = await changedStatusBetween({
    root,
    from: applicationCommit,
    to: evidenceCommit,
  });
  if (
    evidenceChanges.some((entry) => entry.status !== "A")
    || !exactSortedStrings(evidenceChanges.map((entry) => entry.path), evidenceOutputs)
  ) throw new Error("Phase 2 evidence commit must add exactly the 30 manifest outputs");

  const evidenceIdentities = Object.fromEntries(evidenceEntries.map((entry) => [
    entry.path,
    `${entry.mode}:${entry.type}:${entry.objectId}`,
  ]));
  let parent = evidenceCommit;
  let previousReview = null;
  for (const [index, reviewCommit] of successors.slice(1).entries()) {
    await assertDirectParent({ root, commit: reviewCommit, parent });
    const reviewChanges = await changedStatusBetween({
      root,
      from: parent,
      to: reviewCommit,
    });
    const expectedStatus = index === 0 ? "A" : "M";
    if (
      reviewChanges.length !== 1
      || reviewChanges[0].path !== PHASE2_REVIEW_DOCUMENT_PATH
      || reviewChanges[0].status !== expectedStatus
    ) throw new Error("Phase 2 review successor may only add or modify the review document");
    const reviewEvidenceEntries = await trackedNamespaceEntries({
      root,
      commit: reviewCommit,
    });
    const reviewIdentities = Object.fromEntries(reviewEvidenceEntries.map((entry) => [
      entry.path,
      `${entry.mode}:${entry.type}:${entry.objectId}`,
    ]));
    if (JSON.stringify(reviewIdentities) !== JSON.stringify(evidenceIdentities)) {
      throw new Error("Phase 2 review successor changed tracked evidence identities");
    }
    const review = await validateTrackedReviewHandoff({
      root,
      head: reviewCommit,
      applicationCommit,
      evidenceCommit,
      evidenceOutputs,
      requireReady: index === 0,
    });
    if (
      previousReview !== null
      && (
        review.providerSha256 !== previousReview.providerSha256
        || review.generatedAt !== previousReview.generatedAt
      )
    ) {
      throw new Error("Phase 2 review successor changed its provider evidence binding");
    }
    if (previousReview?.status === "accepted" && review.status !== "accepted") {
      throw new Error("Phase 2 review acceptance cannot regress to pending");
    }
    previousReview = review;
    parent = reviewCommit;
  }
  if (successors.length === 1 && reviewAtHead !== null) {
    throw new Error("Phase 2 evidence transition cannot include the review document");
  }
  return Object.freeze({
    schemaVersion: 1,
    state: PHASE2_EVIDENCE_LIFECYCLE_STATES.evidence,
    applicationCommit,
    evidenceCommit,
    headCommit: head,
    reviewCommit: successors.length > 1 ? head : null,
    evidenceOutputCount: present.length,
    evidenceOutputTarget: evidenceOutputs.length,
  });
}

export async function capturePhase2EvidenceProvenance({
  root,
  isolated = false,
  expectedApplicationCommit,
  evidenceOutputs: providedEvidenceOutputs,
} = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 evidence provenance root must be absolute");
  }
  const head = await resolveCommit(root);
  const [manifestRecord, previewContract, headTreeResult, indexDiffResult, entries] = await Promise.all([
    readHeadTrackedJson({
      root,
      head,
      relativePath: PHASE2_ACCEPTANCE_MANIFEST_PATH,
      maximumBytes: MAX_MANIFEST_BYTES,
    }),
    readHeadJson(root, head, PHASE2_PREVIEW_CONTRACT_PATH, MAX_MANIFEST_BYTES),
    git(root, ["rev-parse", "--verify", "HEAD^{tree}"]),
    git(root, [
      "diff",
      "--cached",
      "--name-only",
      "--no-renames",
      "-z",
      "HEAD",
      "--",
    ], { encoding: "buffer", maxBuffer: 4 * 1024 * 1024 }),
    statusEntries(root),
  ]);
  const manifest = manifestRecord.value;
  const manifestOutputs = validateEvidenceOutputs(manifest);
  const evidenceOutputs = providedEvidenceOutputs ?? manifestOutputs;
  if (
    !Array.isArray(evidenceOutputs)
    || evidenceOutputs.some((entry) => !manifestOutputs.includes(entry))
  ) throw new Error("Phase 2 provenance evidence output allowance is invalid");
  const headTree = headTreeResult.stdout.trim();
  if (!TREE_PATTERN.test(headTree) || !Buffer.isBuffer(indexDiffResult.stdout)) {
    throw new Error("Phase 2 evidence Git tree identity is invalid");
  }
  if (indexDiffResult.stdout.length !== 0) {
    throw new Error("Phase 2 evidence index does not match the frozen HEAD tree");
  }
  const indexTree = headTree;
  assertStatusAllowed({ entries, evidenceOutputs: manifestOutputs, isolated });

  const providerApplicationCommit = expectedApplicationCommit === undefined
    ? await readProviderApplicationCommit({ root, head, previewContract })
    : null;
  const applicationCommit = expectedApplicationCommit
    ?? providerApplicationCommit
    ?? await deriveTrackedApplicationCommit({
      root,
      head,
      manifestBytes: manifestRecord.bytes,
      evidenceOutputs: manifestOutputs,
    });
  if (!SHA_PATTERN.test(applicationCommit ?? "")) {
    throw new Error("Phase 2 frozen application commit is invalid");
  }
  await assertEvidenceOnlySuccessor({
    root,
    applicationCommit,
    head,
    evidenceOutputs: manifestOutputs,
  });
  return Object.freeze({
    applicationCommit,
    evidenceOutputs: manifestOutputs,
    head,
    headTree,
    indexTree,
    statusEntries: entries,
  });
}

export function assertPhase2EvidenceProvenanceStable(before, after) {
  if (
    !isPlainObject(before)
    || !isPlainObject(after)
    || before.head !== after.head
    || before.headTree !== after.headTree
    || before.indexTree !== after.indexTree
    || before.applicationCommit !== after.applicationCommit
  ) throw new Error("Phase 2 frozen application provenance drifted during evidence generation");
  return true;
}

export function assertPhase2EvidenceCommit({ actualCommit, provenance } = {}) {
  if (
    !SHA_PATTERN.test(actualCommit ?? "")
    || !isPlainObject(provenance)
    || actualCommit !== provenance.applicationCommit
  ) throw new Error("Phase 2 evidence commit does not equal the frozen application commit");
  return true;
}

const componentOutputPaths = (evidenceOutputs, component) => {
  const summarySuffix = component === "aggregate"
    ? "phase-2-summary.json"
    : `phase-2-${component === "contract" ? "contract" : component}-summary.json`;
  if (component === "visual") {
    return evidenceOutputs.filter((entry) => (
      entry.endsWith("phase-2-visual-summary.json")
      || entry.includes("390-frontend-upgrade-phase-2-review/")
    ));
  }
  const matches = evidenceOutputs.filter((entry) => entry.endsWith(summarySuffix));
  if (matches.length !== 1) {
    throw new Error(`Phase 2 ${component} output inventory is invalid`);
  }
  return matches;
};

const securelyReadGeneratedOutput = async (root, relativePath) => {
  const absolutePath = path.join(root, relativePath);
  const metadata = await lstat(absolutePath);
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.size <= 0
    || metadata.size > MAX_EVIDENCE_OUTPUT_BYTES
  ) throw new Error(`Phase 2 generated evidence output is invalid: ${relativePath}`);
  if (typeof fsConstants.O_NOFOLLOW !== "number") throw new Error("O_NOFOLLOW is unavailable");
  const handle = await open(absolutePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    return await handle.readFile();
  } finally {
    await handle.close();
  }
};

const ensureTrustedOutputAncestors = async (root, relativePath) => {
  let current = root;
  for (const segment of path.posix.dirname(relativePath).split("/")) {
    current = path.join(current, segment);
    await mkdir(current).catch((error) => {
      if (error?.code !== "EEXIST") throw error;
    });
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Phase 2 evidence output ancestor is unsafe: ${relativePath}`);
    }
  }
};

const addDetachedWorktree = async ({ sourceRoot, applicationCommit, worktreeRoot }) => {
  await git(sourceRoot, ["worktree", "add", "--detach", worktreeRoot, applicationCommit]);
  const sourceNodeModules = path.join(sourceRoot, "node_modules");
  try {
    const metadata = await lstat(sourceNodeModules);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("source node_modules must be a regular directory");
    }
    await symlink(sourceNodeModules, path.join(worktreeRoot, "node_modules"), "dir");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

const removeDetachedWorktree = async ({ sourceRoot, worktreeRoot, temporaryRoot }) => {
  await git(sourceRoot, ["worktree", "remove", "--force", worktreeRoot]).catch(() => {});
  await rm(temporaryRoot, { force: true, recursive: true });
  await git(sourceRoot, ["worktree", "prune"]).catch(() => {});
};

export async function runPhase2EvidenceBuilderWithProvenance({
  root,
  component,
  runner,
} = {}) {
  if (typeof runner !== "function") throw new Error("Phase 2 evidence runner is required");
  const before = await capturePhase2EvidenceProvenance({ root });
  const outputs = componentOutputPaths(before.evidenceOutputs, component);
  const temporaryRoot = await mkdtemp(path.join(
    path.dirname(root),
    ".quantgym-phase2-evidence-worktree-",
  ));
  const worktreeRoot = path.join(temporaryRoot, "worktree");
  try {
    await addDetachedWorktree({
      sourceRoot: root,
      applicationCommit: before.applicationCommit,
      worktreeRoot,
    });
    const result = await runner({
      applicationCommit: before.applicationCommit,
      root: worktreeRoot,
      sourceRoot: root,
    });
    assertPhase2EvidenceCommit({
      actualCommit: result?.summary?.commit,
      provenance: before,
    });
    const isolatedAfter = await capturePhase2EvidenceProvenance({
      root: worktreeRoot,
      isolated: true,
      expectedApplicationCommit: before.applicationCommit,
    });
    if (isolatedAfter.head !== before.applicationCommit) {
      throw new Error("Phase 2 isolated evidence worktree changed commit");
    }
    const generated = new Map();
    for (const relativePath of outputs) {
      generated.set(relativePath, await securelyReadGeneratedOutput(worktreeRoot, relativePath));
    }

    const beforeInstall = await capturePhase2EvidenceProvenance({ root });
    assertPhase2EvidenceProvenanceStable(before, beforeInstall);
    for (const relativePath of outputs) {
      await ensureTrustedOutputAncestors(root, relativePath);
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath,
        data: generated.get(relativePath),
      });
    }
    const after = await capturePhase2EvidenceProvenance({ root });
    assertPhase2EvidenceProvenanceStable(before, after);
    return result;
  } finally {
    await removeDetachedWorktree({ sourceRoot: root, worktreeRoot, temporaryRoot });
  }
}

export async function runPhase2EvidenceInPlaceWithProvenance({
  root,
  runner,
} = {}) {
  if (typeof runner !== "function") throw new Error("Phase 2 evidence runner is required");
  const before = await capturePhase2EvidenceProvenance({ root });
  const result = await runner({
    applicationCommit: before.applicationCommit,
    provenance: before,
    root,
  });
  const after = await capturePhase2EvidenceProvenance({ root });
  assertPhase2EvidenceProvenanceStable(before, after);
  if (SHA_PATTERN.test(result?.summary?.commit ?? "")) {
    assertPhase2EvidenceCommit({ actualCommit: result.summary.commit, provenance: before });
  }
  return result;
}
