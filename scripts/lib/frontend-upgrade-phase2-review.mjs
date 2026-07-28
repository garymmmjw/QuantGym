import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  PHASE2_AGGREGATE_SUMMARY_RELATIVE,
  PHASE2_COMPONENT_SUMMARY_PATHS,
  buildPhase2AggregateSummary,
  validatePhase2AggregateEvidence,
  validatePhase2AggregateSummary,
} from "../check-frontend-upgrade-phase2.mjs";
import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
  checkPhase2ContractSet,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";
import {
  checkPhase2ProviderEvidence,
  validatePhase2ProviderEvidence,
} from "./frontend-upgrade-phase2-provider-evidence.mjs";
import {
  PHASE2_REVIEW_DOCUMENT_MAX_BYTES,
  PHASE2_REVIEW_DOCUMENT_PATH,
  assertPhase2EvidenceProvenanceStable,
  capturePhase2EvidenceProvenance,
  renderPhase2EmbeddedProviderEvidence,
} from "./frontend-upgrade-phase2-evidence-provenance.mjs";
import {
  PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
  phase2JpegDimensions,
  validatePhase2VisualReviewReceipt,
} from "./frontend-upgrade-phase2-visual-evidence.mjs";

export const PHASE2_REVIEW_PATH = PHASE2_REVIEW_DOCUMENT_PATH;
export const TEST_ONLY_PHASE2_REVIEW = Symbol(
  "frontend-upgrade-phase2-review-test-only",
);

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const execFileAsync = promisify(execFile);
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_REVIEW_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const MAX_PROVIDER_REVIEW_HANDOFF_MS = 5 * 60 * 1_000;
const COMPONENT_NAMES = Object.freeze(Object.keys(PHASE2_COMPONENT_SUMMARY_PATHS));
const COMPONENT_ENVELOPE_KEYS = Object.freeze([
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
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
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
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalEqual = (left, right) => (
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
);
const safeRelativePath = (value) => (
  typeof value === "string"
  && value.length > 0
  && value === value.replaceAll("\\", "/")
  && !path.posix.isAbsolute(value)
  && path.posix.normalize(value) === value
  && !value.split("/").includes("..")
);

const securelyReadBytes = async (
  root,
  relativePath,
  maximumBytes = MAX_JSON_BYTES,
  { requiredMode } = {},
) => {
  if (!safeRelativePath(relativePath)) {
    throw new Error(`Phase 2 review input path is unsafe: ${relativePath}`);
  }
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is required for Phase 2 review inputs");
  }
  const absolutePath = path.join(path.resolve(root), relativePath);
  const pathMetadata = await lstat(absolutePath, { bigint: true });
  if (
    pathMetadata.isSymbolicLink()
    || !pathMetadata.isFile()
    || pathMetadata.nlink !== 1n
    || pathMetadata.size <= 0n
    || pathMetadata.size > BigInt(maximumBytes)
    || (
      requiredMode !== undefined
      && Number(pathMetadata.mode & 0o777n) !== requiredMode
    )
  ) throw new Error(`Phase 2 review input is unsafe: ${relativePath}`);
  const handle = await open(absolutePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (pathMetadata[key] !== before[key]) {
        throw new Error("Phase 2 review input changed before reading");
      }
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const key of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[key] !== after[key]) throw new Error("Phase 2 review input changed while reading");
    }
    return { bytes, sha256: sha256(bytes) };
  } finally {
    await handle.close();
  }
};

const securelyReadJson = async (root, relativePath, options) => {
  const result = await securelyReadBytes(
    root,
    relativePath,
    options?.maximumBytes ?? MAX_JSON_BYTES,
    options,
  );
  let value;
  try {
    value = JSON.parse(result.bytes.toString("utf8"));
  } catch {
    throw new Error(`Phase 2 review input is invalid JSON: ${relativePath}`);
  }
  return { ...result, value };
};

const readCurrentHead = async (root) => {
  const { stdout } = await execFileAsync(
    "/usr/bin/git",
    ["rev-parse", "--verify", "HEAD^{commit}"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
      maxBuffer: 64 * 1024,
    },
  );
  const commit = stdout.trim();
  if (!SHA_PATTERN.test(commit)) throw new Error("Phase 2 review current HEAD is invalid");
  return commit;
};

const invalidateExistingReview = async (root) => {
  const target = path.join(root, PHASE2_REVIEW_PATH);
  try {
    const metadata = await lstat(target);
    if (metadata.isDirectory()) throw new Error("Phase 2 review output is an unsafe directory");
    await unlink(target);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

const writeIsolatedTestReview = async (root, document) => {
  const target = path.join(root, PHASE2_REVIEW_PATH);
  const handle = await open(
    target,
    fsConstants.O_WRONLY
      | fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_NOFOLLOW,
    0o644,
  );
  try {
    await handle.writeFile(document, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const readLocalEvidenceSnapshot = async (root) => {
  const [
    manifest,
    phase1Lock,
    aggregate,
    visualReviewReceipt,
    ...componentEntries
  ] = await Promise.all([
    securelyReadJson(root, PHASE2_ACCEPTANCE_MANIFEST_PATH),
    securelyReadBytes(root, PHASE1_EVIDENCE_LOCK_PATH),
    securelyReadJson(root, PHASE2_AGGREGATE_SUMMARY_RELATIVE),
    securelyReadJson(root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH, {
      requiredMode: 0o644,
    }),
    ...COMPONENT_NAMES.map((component) => (
      securelyReadJson(root, PHASE2_COMPONENT_SUMMARY_PATHS[component])
    )),
  ]);
  const componentRecords = Object.fromEntries(
    COMPONENT_NAMES.map((component, index) => [component, componentEntries[index]]),
  );
  const visualCases = Array.isArray(manifest.value?.finalVisualCases)
    ? manifest.value.finalVisualCases
    : [];
  const imageEntries = await Promise.all(visualCases.map(async (visualCase) => {
    const relativePath = visualCase?.evidencePath;
    if (
      typeof relativePath !== "string"
      || !relativePath.startsWith(
        "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-review/",
      )
    ) throw new Error("Phase 2 review image is outside the fixed namespace");
    const record = await securelyReadBytes(root, relativePath, MAX_REVIEW_IMAGE_BYTES);
    return [relativePath, {
      ...record,
      ...phase2JpegDimensions(record.bytes),
    }];
  }));
  const sourceRecords = new Map([
    [PHASE2_ACCEPTANCE_MANIFEST_PATH, manifest],
    [PHASE1_EVIDENCE_LOCK_PATH, phase1Lock],
    [PHASE2_AGGREGATE_SUMMARY_RELATIVE, aggregate],
    [PHASE2_VISUAL_REVIEW_RECEIPT_PATH, visualReviewReceipt],
    ...COMPONENT_NAMES.map((component) => [
      PHASE2_COMPONENT_SUMMARY_PATHS[component],
      componentRecords[component],
    ]),
    ...imageEntries,
  ]);
  return {
    manifest,
    phase1Lock,
    aggregate,
    visualReviewReceipt,
    componentRecords,
    imageEntries,
    sourceRecords,
  };
};

const verifySnapshotStable = async (root, sourceRecords) => {
  for (const [relativePath, before] of sourceRecords) {
    const maximumBytes = relativePath.endsWith(".jpg")
      ? MAX_REVIEW_IMAGE_BYTES
      : MAX_JSON_BYTES;
    const after = await securelyReadBytes(
      root,
      relativePath,
      maximumBytes,
      relativePath === PHASE2_VISUAL_REVIEW_RECEIPT_PATH
        ? { requiredMode: 0o644 }
        : undefined,
    );
    if (after.sha256 !== before.sha256) return false;
  }
  return true;
};

const loadPhase2ReviewInputs = async ({ root, expectedCommit, now }) => {
  const nowMs = now.getTime();
  const provenanceBefore = await capturePhase2EvidenceProvenance({ root });
  const currentHeadBefore = await readCurrentHead(root);
  const contractFailuresBefore = await checkPhase2ContractSet({ root, headRef: "HEAD" });
  const providerBefore = await checkPhase2ProviderEvidence({ root, nowMs });
  const snapshot = await readLocalEvidenceSnapshot(root);
  const reviewImages = new Map(snapshot.imageEntries.map(([relativePath, record]) => [
    relativePath,
    {
      sha256: record.sha256,
      width: record.width,
      height: record.height,
    },
  ]));
  const summaries = Object.fromEntries(
    COMPONENT_NAMES.map((component) => [
      component,
      snapshot.componentRecords[component].value,
    ]),
  );
  const componentSummarySha256 = Object.fromEntries(
    COMPONENT_NAMES.map((component) => [
      component,
      snapshot.componentRecords[component].sha256,
    ]),
  );
  const reviewImageSha256 = snapshot.imageEntries.map(([, record]) => record.sha256);
  const aggregateRevalidation = validatePhase2AggregateEvidence({
    manifest: snapshot.manifest.value,
    manifestSha256: snapshot.manifest.sha256,
    phase1EvidenceLockSha256: snapshot.phase1Lock.sha256,
    summaries,
    reviewImages,
    visualReviewReceipt: snapshot.visualReviewReceipt.value,
    visualReviewReceiptBytes: snapshot.visualReviewReceipt.bytes,
    visualReviewReceiptSha256: snapshot.visualReviewReceipt.sha256,
    contractFailures: contractFailuresBefore,
    phase1EvidenceLockStable: true,
    manifestStable: true,
    commitValid: (
      provenanceBefore.applicationCommit === expectedCommit
      && currentHeadBefore === provenanceBefore.head
    ),
    nowMs,
  });
  const recalculatedAggregate = buildPhase2AggregateSummary({
    checkedAt: new Date(snapshot.aggregate.value?.checkedAt),
    validation: aggregateRevalidation,
    manifestSha256: snapshot.manifest.sha256,
    phase1EvidenceLockSha256: snapshot.phase1Lock.sha256,
    componentSummarySha256,
    reviewImageSha256,
    visualReviewReceiptSha256: snapshot.visualReviewReceipt.sha256,
  });
  const [
    sourceSnapshotStable,
    contractFailuresAfter,
    providerAfter,
    currentHeadAfter,
    provenanceAfter,
  ] = await Promise.all([
    verifySnapshotStable(root, snapshot.sourceRecords),
    checkPhase2ContractSet({ root, headRef: "HEAD" }),
    checkPhase2ProviderEvidence({ root, nowMs }),
    readCurrentHead(root),
    capturePhase2EvidenceProvenance({ root }),
  ]);
  const provenanceStable = assertPhase2EvidenceProvenanceStable(
    provenanceBefore,
    provenanceAfter,
  );
  return {
    providerEvidence: providerAfter.evidence,
    providerEvidenceBytes: providerAfter.bytes,
    providerEvidenceSha256: providerAfter.sha256,
    aggregateSummary: snapshot.aggregate.value,
    aggregateSummarySha256: snapshot.aggregate.sha256,
    componentSummaries: summaries,
    componentSummarySha256,
    manifestSha256: snapshot.manifest.sha256,
    phase1EvidenceLockSha256: snapshot.phase1Lock.sha256,
    reviewImageSha256,
    manifest: snapshot.manifest.value,
    visualReviewReceipt: snapshot.visualReviewReceipt.value,
    visualReviewReceiptBytes: snapshot.visualReviewReceipt.bytes,
    visualReviewReceiptSha256: snapshot.visualReviewReceipt.sha256,
    aggregateRevalidation,
    recalculatedAggregate,
    recalculatedAggregateMatches: canonicalEqual(
      recalculatedAggregate,
      snapshot.aggregate.value,
    ),
    contractFailures: [...contractFailuresBefore, ...contractFailuresAfter],
    sourceSnapshotStable,
    providerSnapshotStable: (
      providerBefore.sha256 === providerAfter.sha256
      && providerBefore.bytes.equals(providerAfter.bytes)
    ),
    currentHeadBefore,
    currentHeadAfter,
    provenanceApplicationCommit: provenanceAfter.applicationCommit,
    provenanceHead: provenanceAfter.head,
    provenanceStable,
    expectedCommit,
    nowMs,
  };
};

export function validatePhase2ReviewPrerequisites({
  providerEvidence,
  providerEvidenceBytes,
  providerEvidenceSha256,
  aggregateSummary,
  aggregateSummarySha256,
  componentSummaries,
  componentSummarySha256,
  manifestSha256,
  phase1EvidenceLockSha256,
  reviewImageSha256,
  manifest,
  visualReviewReceipt,
  visualReviewReceiptBytes,
  visualReviewReceiptSha256,
  aggregateRevalidation,
  recalculatedAggregate,
  recalculatedAggregateMatches,
  contractFailures,
  sourceSnapshotStable,
  providerSnapshotStable,
  currentHeadBefore,
  currentHeadAfter,
  provenanceApplicationCommit,
  provenanceHead,
  provenanceStable,
  expectedCommit,
  nowMs = Date.now(),
} = {}) {
  const failures = [];
  if (!SHA_PATTERN.test(expectedCommit ?? "")) failures.push("expected_commit_invalid");
  if (
    !SHA_PATTERN.test(currentHeadBefore ?? "")
    || !SHA_PATTERN.test(currentHeadAfter ?? "")
    || currentHeadBefore !== currentHeadAfter
  ) failures.push("current_head_mismatch");
  if (
    provenanceStable !== true
    || provenanceApplicationCommit !== expectedCommit
    || provenanceHead !== currentHeadBefore
    || provenanceHead !== currentHeadAfter
  ) failures.push("application_provenance_invalid");
  if (!HASH_PATTERN.test(providerEvidenceSha256 ?? "")) failures.push("provider_hash_invalid");
  let providerEvidenceBytesBound = false;
  try {
    providerEvidenceBytesBound = (
      Buffer.isBuffer(providerEvidenceBytes)
      && providerEvidenceBytes.length > 0
      && providerEvidenceBytes.length <= MAX_JSON_BYTES
      && sha256(providerEvidenceBytes) === providerEvidenceSha256
      && providerEvidenceBytes.equals(
        Buffer.from(`${JSON.stringify(providerEvidence, null, 2)}\n`),
      )
      && canonicalEqual(
        JSON.parse(providerEvidenceBytes.toString("utf8")),
        providerEvidence,
      )
    );
  } catch {
    providerEvidenceBytesBound = false;
  }
  if (!providerEvidenceBytesBound) failures.push("provider_bytes_invalid");
  if (!HASH_PATTERN.test(aggregateSummarySha256 ?? "")) failures.push("aggregate_hash_invalid");
  if (!HASH_PATTERN.test(manifestSha256 ?? "")) failures.push("manifest_hash_invalid");
  if (!HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")) {
    failures.push("phase1_lock_hash_invalid");
  }
  let visualReviewReceiptHashBound = false;
  try {
    visualReviewReceiptHashBound = (
      Buffer.isBuffer(visualReviewReceiptBytes)
      && sha256(visualReviewReceiptBytes) === visualReviewReceiptSha256
      && JSON.stringify(JSON.parse(visualReviewReceiptBytes.toString("utf8")))
        === JSON.stringify(visualReviewReceipt)
    );
  } catch {
    visualReviewReceiptHashBound = false;
  }
  if (
    !HASH_PATTERN.test(visualReviewReceiptSha256 ?? "")
    || !visualReviewReceiptHashBound
  ) failures.push("visual_review_receipt_hash_invalid");
  try {
    validatePhase2VisualReviewReceipt({
      receipt: visualReviewReceipt,
      visualCases: componentSummaries?.visual?.visualCases,
      expectedCases: manifest?.finalVisualCases,
      commit: expectedCommit,
      manifestSha256,
      phase1EvidenceLockSha256,
      captureCheckedAt: componentSummaries?.visual?.checkedAt,
      nowMs,
    });
  } catch {
    failures.push("visual_review_receipt_invalid");
  }
  const providerFailures = validatePhase2ProviderEvidence(providerEvidence, {
    expectedCommit,
    nowMs,
  });
  if (providerFailures.length > 0) failures.push("provider_evidence_not_ready");
  try {
    validatePhase2AggregateSummary(aggregateSummary);
  } catch {
    failures.push("aggregate_summary_invalid");
  }
  const aggregateCheckedAt = Date.parse(aggregateSummary?.checkedAt);
  if (
    !Number.isFinite(aggregateCheckedAt)
    || new Date(aggregateCheckedAt).toISOString() !== aggregateSummary?.checkedAt
    || !Number.isFinite(nowMs)
    || aggregateCheckedAt > nowMs + CLOCK_SKEW_MS
    || nowMs - aggregateCheckedAt > MAX_EVIDENCE_AGE_MS
  ) failures.push("aggregate_summary_stale");
  if (
    aggregateSummary?.status !== "ready-for-review"
    || aggregateSummary?.commit !== expectedCommit
    || !isPlainObject(aggregateSummary?.checks)
    || Object.values(aggregateSummary.checks).some((value) => value !== true)
  ) failures.push("aggregate_not_ready");
  if (
    !isPlainObject(aggregateRevalidation)
    || aggregateRevalidation.ready !== true
    || aggregateRevalidation.commit !== expectedCommit
    || !Array.isArray(aggregateRevalidation.failureCodes)
    || aggregateRevalidation.failureCodes.length !== 0
    || aggregateRevalidation.counts?.componentSummaries !== 6
    || aggregateRevalidation.counts?.targetGates !== 76
    || aggregateRevalidation.counts?.passedGates !== 76
    || aggregateRevalidation.counts?.targetVisualCases !== 22
    || aggregateRevalidation.counts?.passedVisualCases !== 22
  ) failures.push("aggregate_full_revalidation_failed");
  if (
    recalculatedAggregateMatches !== true
    || !canonicalEqual(recalculatedAggregate, aggregateSummary)
  ) failures.push("aggregate_recalculation_mismatch");
  if (!Array.isArray(contractFailures) || contractFailures.length !== 0) {
    failures.push("contract_set_invalid");
  }
  if (sourceSnapshotStable !== true || providerSnapshotStable !== true) {
    failures.push("review_input_changed");
  }
  if (!isPlainObject(componentSummaries) || !isPlainObject(componentSummarySha256)) {
    failures.push("component_inventory_invalid");
  } else {
    if (
      !exactKeys(componentSummaries, COMPONENT_NAMES)
      || !exactKeys(componentSummarySha256, COMPONENT_NAMES)
    ) failures.push("component_inventory_invalid");
    for (const component of COMPONENT_NAMES) {
      const summary = componentSummaries[component];
      const digest = componentSummarySha256[component];
      if (
        !exactKeys(summary, COMPONENT_ENVELOPE_KEYS)
        || summary.status !== "pass"
        || summary.commit !== expectedCommit
        || summary.manifestSha256 !== manifestSha256
        || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
        || !Array.isArray(summary.results)
        || !Array.isArray(summary.visualCases)
        || !isPlainObject(summary.checks)
        || !isPlainObject(summary.counts)
        || !isPlainObject(summary.metrics)
        || !Array.isArray(summary.failureCodes)
        || summary.failureCodes.length !== 0
        || !HASH_PATTERN.test(digest ?? "")
        || aggregateSummary?.hashes?.componentSummarySha256?.[component] !== digest
      ) failures.push(`component_${component}_not_ready`);
    }
  }
  if (
    aggregateSummary?.manifestSha256 !== manifestSha256
    || aggregateSummary?.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || aggregateSummary?.hashes?.visualReviewReceiptSha256
      !== visualReviewReceiptSha256
  ) failures.push("aggregate_contract_hash_mismatch");
  if (
    !Array.isArray(reviewImageSha256)
    || reviewImageSha256.length !== 22
    || new Set(reviewImageSha256).size !== 22
    || reviewImageSha256.some((digest) => !HASH_PATTERN.test(digest))
    || !canonicalEqual(
      aggregateSummary?.hashes?.reviewImageSha256,
      reviewImageSha256,
    )
  ) failures.push("review_image_inventory_invalid");
  if (
    providerEvidence?.applicationCommit !== expectedCommit
    || providerEvidence?.deployments?.api?.commit !== expectedCommit
    || providerEvidence?.deployments?.pages?.commit !== expectedCommit
  ) failures.push("provider_commit_mismatch");
  const pullRequestBefore = providerEvidence?.pullRequest?.before;
  const pullRequestAfter = providerEvidence?.pullRequest?.after;
  const postRevokePullRequest = providerEvidence?.postRevokeContinuity?.pullRequest;
  if (
    providerEvidence?.pullRequest?.unchanged !== true
    || pullRequestBefore?.draft !== true
    || pullRequestBefore?.merged !== false
    || pullRequestBefore?.state !== "open"
    || pullRequestAfter?.draft !== true
    || pullRequestAfter?.merged !== false
    || pullRequestAfter?.state !== "open"
    || postRevokePullRequest?.draft !== true
    || postRevokePullRequest?.merged !== false
    || postRevokePullRequest?.state !== "open"
  ) failures.push("pull_request_boundary_failed");
  return [...new Set(failures)];
}

export function renderPhase2ReviewDocument({
  generatedAt,
  applicationCommit,
  evidenceCommit,
  visualReviewReceiptSha256,
  providerEvidenceSha256,
  aggregateSummarySha256,
  componentSummarySha256,
  providerEvidence,
  providerEvidenceBytes,
  aggregateSummary,
  visualReviewReceipt,
} = {}) {
  const componentLines = COMPONENT_NAMES.map((component) => (
    `- ${component}: \`pass\` — SHA-256 \`${componentSummarySha256[component]}\``
  )).join("\n");
  const embeddedProviderEvidence = renderPhase2EmbeddedProviderEvidence(
    providerEvidenceBytes,
  );
  return `# QuantGym Frontend Platform Upgrade Phase 2 Review

Date: ${generatedAt.slice(0, 10)}
Status: ready-for-review
Acceptance: pending Gary's explicit confirmation

<!-- quantgym-phase2-review:v1 application=${applicationCommit} evidence=${evidenceCommit} visualReceipt=${visualReviewReceiptSha256} provider=${providerEvidenceSha256} aggregate=${aggregateSummarySha256} generated=${generatedAt} status=ready-for-review -->

## Reviewed candidate

- Application, API, and Pages commit: \`${applicationCommit}\`
- Tracked evidence HEAD: \`${evidenceCommit}\` (application-ancestor binding verified; successor diff limited to the 30 manifest evidence outputs and this review document)
- Branch: \`codex/frontend-v2-preview\`
- Pull request: \`garymmmjw/QuantGym#130\` (draft, open, unmerged)
- Redacted provider evidence SHA-256: \`${providerEvidenceSha256}\`
- Phase 2 aggregate SHA-256: \`${aggregateSummarySha256}\`
- Independent visual-review receipt: \`${visualReviewReceiptSha256}\` — \`${visualReviewReceipt.reviewer}\`, \`${visualReviewReceipt.reviewMethod}\`, reviewed \`${visualReviewReceipt.reviewedAt}\`

## Embedded redacted provider evidence

The following unique canonical base64 block contains the exact redacted provider-evidence bytes bound by the marker SHA-256 above:

${embeddedProviderEvidence}

## Local acceptance evidence

All six independently generated component summaries were fully revalidated at the current HEAD and are bound to the exact candidate commit:

${componentLines}

The aggregate remains intentionally limited to \`${aggregateSummary.status}\`: 76/76 gates and 22/22 final visual cases passed with no skip, retry, flake, duplicate, extra, missing, stale, or legacy result.

## Controlled Preview cutover

- The exact local/remote candidate, draft PR #130, clean tracked/index state, allowed-untracked boundary, Cloudflare skip directive, and all four required ancestor commits passed the candidate gate before capability preflight or any provider write.
- Cloudflare and R2 remained read-only control providers. PostgreSQL control, mutation, and restore were deterministic SQL-managed temporary roles, while Render remained the only unscoped terminal control. The persistent Render PostgreSQL Provider admin is a separate bootstrap identity: it remains retained with \`admin\` privilege, is explicitly excluded from every read-only control claim, and its one-default-credential inventory stayed exactly unchanged.
- Exact isolated Preview Pages, API, LLM, PostgreSQL, and R2 resources were verified. Preview LLM identity, configuration, repository, branch, internal visibility, live state, and disabled automatic deploy were preserved.
- Canonical Production Pages plus the complete API/LLM service set, PostgreSQL, R2, and environment-group anchors were identical before and after cutover. Candidate Cloudflare records under the Production Pages project remained fully skipped/idle, with no build, deploy, alias, or active deployment.
- Backup and isolated restore proof passed before the one-way provider migration from \`0001_phase1_foundation\` to \`0002_phase2_daily_training\`; the target and round-trip schema fingerprints match, and the disposable restore target plus restore identity were destroyed, confirmed absent, and denied login before migration.
- Only rights-labelled Preview acceptance content and a synthetic audit actor were seeded.
- All eight live checks passed against the actual Preview deployment: API, migration, complete daily loop, storage, accessibility, visual rendering, bundle/artifact integrity, and Production denial.
- Cleanup proved 0 synthetic application rows, 0 synthetic R2 objects, and 0 synthetic catalog rows.
- Cloudflare mutation, Render mutation, PostgreSQL mutation/restore, and R2 mutation access were revoked before continuity. The read-only SQL PostgreSQL control role performed the database continuity check and was then dropped; its full role-absence and admin-continuity proof was durably acknowledged with the Provider credential inventory unchanged before the Render control credential was revoked last. Render topology is explicitly recorded as observed before terminal control revocation and is never presented as freshly re-read afterward. Following terminal revocation, the still-available GitHub, public API, Cloudflare, R2, and persistent PostgreSQL bootstrap-admin channels revalidated their exact continuity; the bootstrap admin remains explicitly excluded from every read-only claim.
- The mode-0600 recovery journal is authenticated only by the local Gary system-user trust boundary. It is not externally signed; tampering by that same trusted system user is explicitly outside this evidence model.
- Provider evidence expires at \`${providerEvidence.expiresAt}\` and contains no raw provider response, network location, signed URL, database export, or secret.

## Decision boundary

This document does not accept Phase 2 and cannot authorize Phase 3. It records only \`ready-for-review\`. Phase 2 exits only after Gary independently reviews this candidate and gives an explicit acceptance.
`;
}

export function validatePhase2ReviewDocument(document, inputs) {
  const failures = validatePhase2ReviewPrerequisites(inputs);
  if (typeof document !== "string" || document.length === 0) {
    return [...new Set([...failures, "review_document_missing"])];
  }
  const expected = renderPhase2ReviewDocument({
    generatedAt: inputs.generatedAt,
    applicationCommit: inputs.expectedCommit,
    evidenceCommit: inputs.provenanceHead,
    visualReviewReceiptSha256: inputs.visualReviewReceiptSha256,
    providerEvidenceSha256: inputs.providerEvidenceSha256,
    aggregateSummarySha256: inputs.aggregateSummarySha256,
    componentSummarySha256: inputs.componentSummarySha256,
    providerEvidence: inputs.providerEvidence,
    providerEvidenceBytes: inputs.providerEvidenceBytes,
    aggregateSummary: inputs.aggregateSummary,
    visualReviewReceipt: inputs.visualReviewReceipt,
  });
  if (document !== expected) failures.push("review_document_content_mismatch");
  if (
    /^Status:\s*(?:accepted|approved|complete)\s*$/imu.test(document)
    || /^Accepted:/imu.test(document)
    || /status=(?:accepted|approved|complete)/iu.test(document)
  ) failures.push("review_document_self_accepts");
  if (!/^Status: ready-for-review$/mu.test(document)) failures.push("review_status_invalid");
  const generatedAt = Date.parse(inputs.generatedAt);
  const aggregateCheckedAt = Date.parse(inputs.aggregateSummary?.checkedAt);
  const providerCapturedAt = Date.parse(inputs.providerEvidence?.capturedAt);
  if (
    !Number.isFinite(generatedAt)
    || new Date(generatedAt).toISOString() !== inputs.generatedAt
    || !Number.isFinite(inputs.nowMs)
    || generatedAt > inputs.nowMs + CLOCK_SKEW_MS
    || inputs.nowMs - generatedAt > MAX_EVIDENCE_AGE_MS
    || !Number.isFinite(aggregateCheckedAt)
    || new Date(aggregateCheckedAt).toISOString() !== inputs.aggregateSummary?.checkedAt
    || generatedAt < aggregateCheckedAt
    || generatedAt - aggregateCheckedAt > MAX_EVIDENCE_AGE_MS
    || !Number.isFinite(providerCapturedAt)
    || new Date(providerCapturedAt).toISOString() !== inputs.providerEvidence?.capturedAt
    || generatedAt < providerCapturedAt
    || generatedAt - providerCapturedAt > MAX_PROVIDER_REVIEW_HANDOFF_MS
  ) failures.push("review_generated_time_invalid");
  return [...new Set(failures)];
}

const requireTestRoot = async (testOnly) => {
  if (
    process.env.NODE_ENV !== "test"
    || !testOnly
    || typeof testOnly.root !== "string"
    || typeof testOnly.loadInputs !== "function"
  ) throw new Error("test-only Phase 2 review injection requires NODE_ENV=test");
  const [rootPath, temporaryPath] = await Promise.all([
    realpath(testOnly.root),
    realpath(tmpdir()),
  ]);
  const relative = path.relative(temporaryPath, rootPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) throw new Error("test-only Phase 2 review root must be isolated under the temporary root");
  return rootPath;
};

const resolveRootAndLoader = async (options) => {
  const testOnly = options[TEST_ONLY_PHASE2_REVIEW];
  if (testOnly) {
    return {
      root: await requireTestRoot(testOnly),
      loadInputs: testOnly.loadInputs,
      isolatedTestWrite: true,
    };
  }
  if (options.root !== undefined && path.resolve(options.root) !== defaultRoot) {
    throw new Error("Phase 2 review root is fixed");
  }
  return {
    root: await realpath(defaultRoot),
    loadInputs: loadPhase2ReviewInputs,
    isolatedTestWrite: false,
  };
};

export async function buildFrontendUpgradePhase2Review(options = {}) {
  const expectedCommit = options.expectedCommit;
  const now = options.now ?? new Date();
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("Phase 2 review commit is invalid");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Phase 2 review time is invalid");
  }
  const { root, loadInputs, isolatedTestWrite } = await resolveRootAndLoader(options);
  await invalidateExistingReview(root);
  try {
    const loadedInputs = await loadInputs({ root, expectedCommit, now });
    const inputs = { ...loadedInputs, generatedAt: now.toISOString() };
    const failures = validatePhase2ReviewPrerequisites(inputs);
    if (failures.length > 0) {
      throw new Error(`Phase 2 review is not ready: ${failures[0]}`);
    }
    const document = renderPhase2ReviewDocument({
      generatedAt: inputs.generatedAt,
      applicationCommit: expectedCommit,
      evidenceCommit: inputs.provenanceHead,
      visualReviewReceiptSha256: inputs.visualReviewReceiptSha256,
      providerEvidenceSha256: inputs.providerEvidenceSha256,
      aggregateSummarySha256: inputs.aggregateSummarySha256,
      componentSummarySha256: inputs.componentSummarySha256,
      providerEvidence: inputs.providerEvidence,
      providerEvidenceBytes: inputs.providerEvidenceBytes,
      aggregateSummary: inputs.aggregateSummary,
      visualReviewReceipt: inputs.visualReviewReceipt,
    });
    const documentFailures = validatePhase2ReviewDocument(document, inputs);
    if (documentFailures.length > 0) {
      throw new Error(`Phase 2 review document failed: ${documentFailures[0]}`);
    }
    if (isolatedTestWrite) {
      await writeIsolatedTestReview(root, document);
    } else {
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: PHASE2_REVIEW_PATH,
        data: document,
        mode: 0o644,
      });
    }
    return {
      output: path.join(root, PHASE2_REVIEW_PATH),
      document,
      sha256: sha256(Buffer.from(document)),
      status: "ready-for-review",
    };
  } catch (error) {
    await invalidateExistingReview(root);
    throw error;
  }
}

export async function checkFrontendUpgradePhase2Review(options = {}) {
  const expectedCommit = options.expectedCommit;
  const now = options.now ?? new Date();
  if (!SHA_PATTERN.test(expectedCommit ?? "")) throw new Error("Phase 2 review commit is invalid");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Phase 2 review time is invalid");
  }
  const { root, loadInputs } = await resolveRootAndLoader(options);
  try {
    const loadedInputs = await loadInputs({ root, expectedCommit, now });
    const review = await securelyReadBytes(
      root,
      PHASE2_REVIEW_PATH,
      PHASE2_REVIEW_DOCUMENT_MAX_BYTES,
    );
    const document = review.bytes.toString("utf8");
    const metadata = /<!-- quantgym-phase2-review:v1\b[^>]*\bgenerated=([^\s]+)\s+status=ready-for-review -->/u
      .exec(document);
    const inputs = {
      ...loadedInputs,
      generatedAt: metadata?.[1] ?? "",
    };
    const failures = validatePhase2ReviewDocument(document, inputs);
    if (failures.length > 0) {
      throw new Error(`Phase 2 review document failed: ${failures[0]}`);
    }
    return {
      output: path.join(root, PHASE2_REVIEW_PATH),
      document,
      sha256: review.sha256,
      status: "ready-for-review",
    };
  } catch (error) {
    await invalidateExistingReview(root);
    throw error;
  }
}
