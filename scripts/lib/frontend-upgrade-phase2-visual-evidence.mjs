import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  mkdir,
  open,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  PHASE1_EVIDENCE_LOCK_PATH,
  PHASE2_ACCEPTANCE_MANIFEST_PATH,
} from "./frontend-upgrade-phase2-contracts.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./frontend-upgrade-phase1-contracts.mjs";
import {
  buildPhase2TagGrep,
  parsePhase2PlaywrightReport,
} from "./frontend-upgrade-phase2-playwright-evidence.mjs";

const execFileAsync = promisify(execFile);
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_REPORT_BYTES = 64 * 1024 * 1024;
const MAX_RECEIPT_BYTES = 1024 * 1024;
const MAX_REVIEW_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const REPORT_FILENAME = "phase2-visual-playwright-report.json";
const REVIEW_DIRECTORY_ENV = "QUANTGYM_PHASE2_REVIEW_DIR";

export const PHASE2_VISUAL_SUMMARY_PATH = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-summary.json"
);
export const PHASE2_VISUAL_REVIEW_DIRECTORY = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-review"
);
export const PHASE2_VISUAL_REVIEW_RECEIPT_PATH = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-review-receipt.json"
);
export const PHASE2_VISUAL_REVIEW_METHOD = "original-resolution-visual-inspection";

export const PHASE2_VISUAL_GATE_IDS = Object.freeze([
  "visual:overview:light-dark",
  "visual:plan:light-dark",
  "visual:problems:light-dark",
]);

export const PHASE2_VISUAL_SUPPORT_TAGS = Object.freeze([
  "e2e:phase2-visual-route-overview",
  "e2e:phase2-visual-route-plan",
  "e2e:phase2-visual-route-problems",
  "e2e:phase2-visual-overflow",
  "e2e:phase2-reduced-motion",
]);

const VISUAL_ANNOTATION_REQUIREMENTS = Object.freeze([
  Object.freeze({
    type: "phase2-visual-route-facts",
    ownerTags: Object.freeze(PHASE2_VISUAL_SUPPORT_TAGS.slice(0, 3)),
  }),
  Object.freeze({
    type: "phase2-visual-overflow-facts",
    ownerTags: Object.freeze(["e2e:phase2-visual-overflow"]),
  }),
  Object.freeze({
    type: "phase2-reduced-motion-facts",
    ownerTags: Object.freeze(["e2e:phase2-reduced-motion"]),
  }),
]);

const REQUIRED_CHECKS = Object.freeze([
  "visualMatrixPassed",
  "originalDimensionsInspected",
  "noSkeletons",
  "noLegacyFrames",
  "brandAssetsPresent",
  "noClipping",
  "chineseEnglishOverflowPassed",
  "reducedMotionPassed",
]);

const REVIEW_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "kind",
  "status",
  "reviewer",
  "reviewedAt",
  "reviewMethod",
  "applicationCommit",
  "manifestSha256",
  "phase1EvidenceLockSha256",
  "images",
]);

const REVIEW_RECEIPT_IMAGE_KEYS = Object.freeze([
  "id",
  "evidencePath",
  "sha256",
  "width",
  "height",
  "originalDimensionsInspected",
]);

const VISUAL_CASE_KEYS = Object.freeze([
  "id",
  "status",
  "evidencePath",
  "sha256",
  "width",
  "height",
  "skipped",
  "retried",
  "flaky",
]);

const PENDING_REVIEW_FAILURE_CODE = "original_dimensions_review_required";

const SUMMARY_ENVELOPE_KEYS = Object.freeze([
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

const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1_440, height: 900 }),
  laptop: Object.freeze({ width: 1_280, height: 720 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
  tablet: Object.freeze({ width: 1_024, height: 768 }),
});

const ROUTES = Object.freeze([
  Object.freeze({
    id: "overview",
    viewports: Object.freeze(["desktop", "laptop", "mobile"]),
  }),
  Object.freeze({
    id: "plan",
    viewports: Object.freeze(["desktop", "laptop", "mobile", "tablet"]),
  }),
  Object.freeze({
    id: "problems",
    viewports: Object.freeze(["desktop", "laptop", "mobile", "tablet"]),
  }),
]);

const EXPECTED_VISUAL_CASES = Object.freeze(ROUTES.flatMap((route) => (
  ["light", "dark"].flatMap((theme) => route.viewports.map((viewportId) => {
    const filename = `${route.id}-${viewportId}-${theme}.jpg`;
    return Object.freeze({
      acceptanceId: `visual:${route.id}:light-dark`,
      evidencePath: `${PHASE2_VISUAL_REVIEW_DIRECTORY}/${filename}`,
      id: `${route.id}--${theme}--${viewportId}`,
      requiredResultStatus: "pass",
      routeId: route.id,
      surfaceId: `route:${route.id}`,
      theme,
      viewport: Object.freeze({
        id: viewportId,
        ...VIEWPORTS[viewportId],
      }),
    });
  }))
)));

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expectedKeys) => (
  isPlainObject(value)
  && Object.keys(value).length === expectedKeys.length
  && expectedKeys.every((key) => Object.hasOwn(value, key))
);

const arraysEqual = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((entry, index) => entry === right[index])
);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const safeRelativePath = (relativePath) => (
  typeof relativePath === "string"
  && relativePath.length > 0
  && relativePath === relativePath.replaceAll("\\", "/")
  && !path.posix.isAbsolute(relativePath)
  && path.posix.normalize(relativePath) === relativePath
  && !relativePath.split("/").includes("..")
);

const validateVisualManifest = (manifest) => {
  if (
    !isPlainObject(manifest)
    || manifest.schemaVersion !== 1
    || manifest.phase !== 2
    || !Array.isArray(manifest.gates)
    || !Array.isArray(manifest.finalVisualCases)
    || !Array.isArray(manifest.evidenceOutputs)
    || manifest.evidenceOutputs.length !== 30
    || manifest.evidenceOutputs.filter(
      (entry) => entry === PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
    ).length !== 1
    || manifest.finalVisualCaseCount !== EXPECTED_VISUAL_CASES.length
    || manifest.finalVisualCases.length !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 visual manifest envelope is invalid");
  }

  const gateIds = manifest.gates
    .filter((gate) => gate?.phase2EvidencePath === PHASE2_VISUAL_SUMMARY_PATH)
    .map((gate) => gate?.id);
  if (!arraysEqual(gateIds, PHASE2_VISUAL_GATE_IDS)) {
    throw new Error("Phase 2 visual gate inventory is invalid");
  }

  for (const [index, expected] of EXPECTED_VISUAL_CASES.entries()) {
    const actual = manifest.finalVisualCases[index];
    if (
      !isPlainObject(actual)
      || !isPlainObject(actual.viewport)
      || actual.id !== expected.id
      || actual.routeId !== expected.routeId
      || actual.surfaceId !== expected.surfaceId
      || actual.theme !== expected.theme
      || actual.viewport.id !== expected.viewport.id
      || actual.viewport.width !== expected.viewport.width
      || actual.viewport.height !== expected.viewport.height
      || actual.acceptanceId !== expected.acceptanceId
      || actual.requiredResultStatus !== "pass"
      || actual.evidencePath !== expected.evidencePath
    ) {
      throw new Error(`Phase 2 visual case is invalid: ${String(actual?.id)}`);
    }
  }

  const ids = manifest.finalVisualCases.map((entry) => entry.id);
  const paths = manifest.finalVisualCases.map((entry) => entry.evidencePath);
  if (
    new Set(ids).size !== EXPECTED_VISUAL_CASES.length
    || new Set(paths).size !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 visual case inventory contains duplicates");
  }
};

export async function loadPhase2VisualEvidenceContext({ root } = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("Phase 2 visual evidence root must be absolute");
  }
  const [manifestRecord, phase1EvidenceLockRecord] = await Promise.all([
    securelyReadEvidenceJson({
      root,
      relativePath: PHASE2_ACCEPTANCE_MANIFEST_PATH,
      maximumBytes: MAX_RECEIPT_BYTES,
    }),
    securelyReadEvidenceJson({
      root,
      relativePath: PHASE1_EVIDENCE_LOCK_PATH,
      maximumBytes: MAX_RECEIPT_BYTES,
    }),
  ]);
  const manifest = manifestRecord.value;
  validateVisualManifest(manifest);
  return Object.freeze({
    expectedGateIds: PHASE2_VISUAL_GATE_IDS,
    annotationRequirements: VISUAL_ANNOTATION_REQUIREMENTS,
    grep: buildPhase2TagGrep([
      ...PHASE2_VISUAL_GATE_IDS,
      ...PHASE2_VISUAL_SUPPORT_TAGS,
    ]),
    manifest,
    manifestSha256: sha256(manifestRecord.bytes),
    phase1EvidenceLockSha256: sha256(phase1EvidenceLockRecord.bytes),
    reviewRelativeDirectory: PHASE2_VISUAL_REVIEW_DIRECTORY,
    supportTags: PHASE2_VISUAL_SUPPORT_TAGS,
    summaryPath: PHASE2_VISUAL_SUMMARY_PATH,
    sourceSnapshot: Object.freeze({
      manifest: manifestRecord.snapshot,
      phase1EvidenceLock: phase1EvidenceLockRecord.snapshot,
    }),
    visualCases: Object.freeze(manifest.finalVisualCases.map((entry) => Object.freeze({
      ...entry,
      viewport: Object.freeze({ ...entry.viewport }),
    }))),
  });
}

const comparableStatFields = Object.freeze([
  "dev",
  "ino",
  "mode",
  "size",
  "mtimeNs",
  "ctimeNs",
]);

const assertSameStat = (before, after, message) => {
  if (comparableStatFields.some((key) => before[key] !== after[key])) {
    throw new Error(message);
  }
};

const snapshotStat = (metadata) => Object.freeze(Object.fromEntries(
  comparableStatFields.map((key) => [key, metadata[key].toString()]),
));

const captureTrustedAncestors = async (root, relativePath) => {
  const resolvedRoot = path.resolve(root);
  const directory = path.posix.dirname(relativePath);
  const paths = [resolvedRoot];
  let current = resolvedRoot;
  if (directory !== ".") {
    for (const segment of directory.split("/")) {
      current = path.join(current, segment);
      paths.push(current);
    }
  }
  return Object.freeze(await Promise.all(paths.map(async (directoryPath) => {
    const metadata = await lstat(directoryPath, { bigint: true });
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Phase 2 visual input ancestor is unsafe: ${relativePath}`);
    }
    return Object.freeze({
      path: path.relative(resolvedRoot, directoryPath) || ".",
      stat: snapshotStat(metadata),
    });
  })));
};

const sameSnapshot = (before, after) => JSON.stringify(before) === JSON.stringify(after);

const captureTrustedDirectory = async (directory) => {
  const metadata = await lstat(directory, { bigint: true });
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Phase 2 review directory is not trusted");
  }
  return metadata;
};

const securelyReadReviewFile = async ({ reviewDirectory, filename }) => {
  if (
    typeof reviewDirectory !== "string"
    || !path.isAbsolute(reviewDirectory)
    || typeof filename !== "string"
    || path.posix.basename(filename) !== filename
    || !/^[a-z][a-z0-9-]*\.jpg$/u.test(filename)
  ) {
    throw new Error("Phase 2 review image path is unsafe");
  }
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is unavailable on this platform");
  }

  const resolvedDirectory = path.resolve(reviewDirectory);
  const directoryBefore = await captureTrustedDirectory(resolvedDirectory);
  const absolutePath = path.join(resolvedDirectory, filename);
  if (path.dirname(absolutePath) !== resolvedDirectory) {
    throw new Error("Phase 2 review image escaped its capture directory");
  }
  const metadata = await lstat(absolutePath, { bigint: true });
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.size <= 0n
    || metadata.size > BigInt(MAX_IMAGE_BYTES)
  ) {
    throw new Error(`Phase 2 review image is missing or invalid: ${filename}`);
  }

  const handle = await open(
    absolutePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat({ bigint: true });
    assertSameStat(metadata, before, `Phase 2 review image changed before read: ${filename}`);
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    assertSameStat(before, after, `Phase 2 review image changed while read: ${filename}`);
    const directoryAfter = await captureTrustedDirectory(resolvedDirectory);
    assertSameStat(
      directoryBefore,
      directoryAfter,
      "Phase 2 review directory changed while images were read",
    );
    return Object.freeze({
      bytes,
      snapshot: Object.freeze({
        directory: snapshotStat(directoryAfter),
        file: snapshotStat(after),
        sha256: sha256(bytes),
      }),
    });
  } finally {
    await handle.close();
  }
};

export function phase2JpegDimensions(bytes) {
  if (
    !Buffer.isBuffer(bytes)
    || bytes.length < 12
    || bytes[0] !== 0xff
    || bytes[1] !== 0xd8
    || bytes.at(-2) !== 0xff
    || bytes.at(-1) !== 0xd9
  ) {
    throw new Error("Phase 2 review image is not a complete JPEG");
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (
      marker === 0xd8
      || marker === 0x01
      || (marker >= 0xd0 && marker <= 0xd7)
    ) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrameMarkers.has(marker)) {
      if (length < 7) break;
      const dimensions = {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
      if (dimensions.width <= 0 || dimensions.height <= 0) break;
      return dimensions;
    }
    offset += length;
  }
  throw new Error("Phase 2 review JPEG dimensions are unavailable");
}

export async function collectPhase2ReviewImages({
  protectedRoot,
  reviewDirectory,
  visualCases,
} = {}) {
  if (
    typeof reviewDirectory !== "string"
    || !path.isAbsolute(reviewDirectory)
    || !Array.isArray(visualCases)
    || visualCases.length !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 review image collection is invalid");
  }
  let protectedAncestorsBefore = null;
  if (protectedRoot !== undefined) {
    const expectedDirectory = path.join(
      path.resolve(protectedRoot),
      PHASE2_VISUAL_REVIEW_DIRECTORY,
    );
    if (path.resolve(reviewDirectory) !== expectedDirectory) {
      throw new Error("Phase 2 installed review directory escaped its trusted root");
    }
    protectedAncestorsBefore = await captureTrustedAncestors(
      path.resolve(protectedRoot),
      `${PHASE2_VISUAL_REVIEW_DIRECTORY}/placeholder.jpg`,
    );
  }

  const collectionDirectoryBefore = await captureTrustedDirectory(path.resolve(reviewDirectory));
  const expectedFilenames = visualCases.map((visualCase) => (
    path.posix.basename(visualCase.evidencePath)
  ));
  const entries = await readdir(reviewDirectory, { withFileTypes: true });
  const observedFilenames = entries.map((entry) => entry.name).sort();
  const expectedSorted = [...expectedFilenames].sort();
  if (
    entries.some((entry) => !entry.isFile())
    || !arraysEqual(observedFilenames, expectedSorted)
  ) {
    throw new Error("Phase 2 review image inventory is missing or contains extra paths");
  }

  const visualEvidence = [];
  const imageBytesByEvidencePath = new Map();
  const imageSnapshotsByEvidencePath = new Map();
  const hashes = new Set();
  for (const visualCase of visualCases) {
    if (!safeRelativePath(visualCase.evidencePath)) {
      throw new Error(`Phase 2 visual evidence path is unsafe: ${visualCase.evidencePath}`);
    }
    const filename = path.posix.basename(visualCase.evidencePath);
    const expectedPath = `${PHASE2_VISUAL_REVIEW_DIRECTORY}/${filename}`;
    if (visualCase.evidencePath !== expectedPath) {
      throw new Error(`Phase 2 visual evidence path is invalid: ${visualCase.evidencePath}`);
    }
    const record = await securelyReadReviewFile({ reviewDirectory, filename });
    const { bytes } = record;
    const dimensions = phase2JpegDimensions(bytes);
    if (
      dimensions.width !== visualCase.viewport.width
      || dimensions.height !== visualCase.viewport.height
    ) {
      throw new Error(`Phase 2 review image dimensions are invalid: ${filename}`);
    }
    const digest = sha256(bytes);
    if (hashes.has(digest)) {
      throw new Error(`Phase 2 review image hash is duplicated: ${filename}`);
    }
    hashes.add(digest);
    imageBytesByEvidencePath.set(visualCase.evidencePath, bytes);
    imageSnapshotsByEvidencePath.set(visualCase.evidencePath, record.snapshot);
    visualEvidence.push({
      id: visualCase.id,
      status: "pass",
      evidencePath: visualCase.evidencePath,
      sha256: digest,
      width: dimensions.width,
      height: dimensions.height,
      skipped: false,
      retried: false,
      flaky: false,
    });
  }

  const collectionDirectoryAfter = await captureTrustedDirectory(path.resolve(reviewDirectory));
  assertSameStat(
    collectionDirectoryBefore,
    collectionDirectoryAfter,
    "Phase 2 review directory changed during full image collection",
  );
  let protectedAncestorsAfter = null;
  if (protectedRoot !== undefined) {
    protectedAncestorsAfter = await captureTrustedAncestors(
      path.resolve(protectedRoot),
      `${PHASE2_VISUAL_REVIEW_DIRECTORY}/placeholder.jpg`,
    );
    if (!sameSnapshot(protectedAncestorsBefore, protectedAncestorsAfter)) {
      throw new Error("Phase 2 review directory ancestors changed during image collection");
    }
  }
  return Object.freeze({
    imageBytesByEvidencePath,
    snapshot: Object.freeze({
      directory: snapshotStat(collectionDirectoryAfter),
      files: Object.freeze(Object.fromEntries(
        [...imageSnapshotsByEvidencePath.entries()],
      )),
      protectedAncestors: protectedAncestorsAfter,
    }),
    visualCases: Object.freeze(visualEvidence),
  });
}

const validIsoTimestamp = (value) => {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return (
    Number.isFinite(parsed)
    && new Date(parsed).toISOString() === value
  );
};

const validReviewer = (value) => (
  typeof value === "string"
  && value === value.trim()
  && value.length >= 2
  && value.length <= 128
  && /^[\p{L}\p{N}][\p{L}\p{N} ._@-]*$/u.test(value)
);

export function validatePhase2VisualReviewReceipt({
  receipt,
  visualCases,
  expectedCases,
  commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  captureCheckedAt,
  nowMs = Date.now(),
} = {}) {
  const reviewedAtMs = Date.parse(receipt?.reviewedAt);
  const captureCheckedAtMs = Date.parse(captureCheckedAt);
  if (
    !exactKeys(receipt, REVIEW_RECEIPT_KEYS)
    || receipt.schemaVersion !== 1
    || receipt.kind !== "frontend-upgrade-phase2-visual-review-receipt"
    || receipt.status !== "attested"
    || !validReviewer(receipt.reviewer)
    || !validIsoTimestamp(receipt.reviewedAt)
    || receipt.reviewMethod !== PHASE2_VISUAL_REVIEW_METHOD
    || receipt.applicationCommit !== commit
    || !SHA_PATTERN.test(receipt.applicationCommit ?? "")
    || receipt.manifestSha256 !== manifestSha256
    || !HASH_PATTERN.test(receipt.manifestSha256 ?? "")
    || receipt.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !HASH_PATTERN.test(receipt.phase1EvidenceLockSha256 ?? "")
    || !Number.isFinite(nowMs)
    || !validIsoTimestamp(captureCheckedAt)
    || reviewedAtMs < captureCheckedAtMs
    || reviewedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - reviewedAtMs > MAX_REVIEW_AGE_MS
    || !Array.isArray(receipt.images)
    || !Array.isArray(visualCases)
    || !Array.isArray(expectedCases)
    || receipt.images.length !== EXPECTED_VISUAL_CASES.length
    || visualCases.length !== EXPECTED_VISUAL_CASES.length
    || expectedCases.length !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 visual review receipt envelope is invalid");
  }

  const observedIds = new Set();
  const observedPaths = new Set();
  const observedHashes = new Set();
  for (const [index, receiptImage] of receipt.images.entries()) {
    const visualCase = visualCases[index];
    const expected = expectedCases[index];
    if (
      !exactKeys(receiptImage, REVIEW_RECEIPT_IMAGE_KEYS)
      || !exactKeys(visualCase, VISUAL_CASE_KEYS)
      || !isPlainObject(expected)
      || receiptImage.id !== expected.id
      || receiptImage.id !== visualCase.id
      || receiptImage.evidencePath !== expected.evidencePath
      || receiptImage.evidencePath !== visualCase.evidencePath
      || receiptImage.sha256 !== visualCase.sha256
      || !HASH_PATTERN.test(receiptImage.sha256 ?? "")
      || receiptImage.width !== expected.viewport?.width
      || receiptImage.height !== expected.viewport?.height
      || receiptImage.width !== visualCase.width
      || receiptImage.height !== visualCase.height
      || receiptImage.originalDimensionsInspected !== true
      || visualCase.status !== "pass"
      || visualCase.skipped !== false
      || visualCase.retried !== false
      || visualCase.flaky !== false
    ) {
      throw new Error(`Phase 2 visual review receipt image is invalid: ${String(receiptImage?.id)}`);
    }
    observedIds.add(receiptImage.id);
    observedPaths.add(receiptImage.evidencePath);
    observedHashes.add(receiptImage.sha256);
  }
  if (
    observedIds.size !== EXPECTED_VISUAL_CASES.length
    || observedPaths.size !== EXPECTED_VISUAL_CASES.length
    || observedHashes.size !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 visual review receipt inventory contains duplicates");
  }
  return true;
}

const VISUAL_ROUTE_FACT_KEYS = Object.freeze([
  "brandAssetMissingCases",
  "caseCount",
  "clippedElementCount",
  "horizontalOverflowPx",
  "kind",
  "legacyFrameCount",
  "routeId",
  "schemaVersion",
  "skeletonCount",
  "viewportWidths",
]);

const nonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

const derivePhase2VisualChecks = ({
  parsedEvidence,
  visualCases,
  originalDimensionsInspected,
}) => {
  const reported = parsedEvidence?.reportedAnnotations;
  if (!isPlainObject(reported)) {
    throw new Error("Phase 2 visual fact annotations are missing");
  }
  const routeFacts = reported["phase2-visual-route-facts"];
  const expectedRoutes = Object.freeze({
    "e2e:phase2-visual-route-overview": "overview",
    "e2e:phase2-visual-route-plan": "plan",
    "e2e:phase2-visual-route-problems": "problems",
  });
  if (!isPlainObject(routeFacts) || !exactKeys(routeFacts, Object.keys(expectedRoutes))) {
    throw new Error("Phase 2 visual route facts are incomplete");
  }
  const validatedRouteFacts = Object.entries(expectedRoutes).map(([ownerTag, routeId]) => {
    const facts = routeFacts[ownerTag];
    if (
      !exactKeys(facts, VISUAL_ROUTE_FACT_KEYS)
      || facts.schemaVersion !== 1
      || facts.kind !== "phase2-visual-route-facts"
      || facts.routeId !== routeId
      || facts.caseCount !== 2
      || !arraysEqual(facts.viewportWidths, [390, 1_440])
      || !nonNegativeInteger(facts.skeletonCount)
      || !nonNegativeInteger(facts.legacyFrameCount)
      || !nonNegativeInteger(facts.brandAssetMissingCases)
      || !nonNegativeInteger(facts.clippedElementCount)
      || !nonNegativeInteger(facts.horizontalOverflowPx)
    ) {
      throw new Error(`Phase 2 visual route facts are invalid: ${routeId}`);
    }
    return facts;
  });

  const overflowFacts = reported["phase2-visual-overflow-facts"]
    ?.["e2e:phase2-visual-overflow"];
  if (
    !exactKeys(overflowFacts, ["cases", "kind", "schemaVersion"])
    || overflowFacts.schemaVersion !== 1
    || overflowFacts.kind !== "phase2-visual-overflow-facts"
    || !Array.isArray(overflowFacts.cases)
    || overflowFacts.cases.length !== 12
  ) {
    throw new Error("Phase 2 multilingual overflow facts are invalid");
  }
  const expectedOverflowCases = ROUTES.flatMap(({ id: routeId }) => (
    ["zh-CN", "en"].flatMap((language) => (
      [390, 1_024].map((viewportWidth) => `${routeId}:${language}:${viewportWidth}`)
    ))
  ));
  const observedOverflowCases = overflowFacts.cases.map((entry) => {
    if (
      !exactKeys(entry, [
        "horizontalOverflowPx",
        "injectedTextLength",
        "language",
        "routeId",
        "viewportWidth",
      ])
      || !["overview", "plan", "problems"].includes(entry.routeId)
      || !["zh-CN", "en"].includes(entry.language)
      || ![390, 1_024].includes(entry.viewportWidth)
      || !nonNegativeInteger(entry.horizontalOverflowPx)
      || !Number.isSafeInteger(entry.injectedTextLength)
      || entry.injectedTextLength < 64
    ) {
      throw new Error("Phase 2 multilingual overflow case is invalid");
    }
    return `${entry.routeId}:${entry.language}:${entry.viewportWidth}`;
  });
  if (
    new Set(observedOverflowCases).size !== expectedOverflowCases.length
    || !expectedOverflowCases.every((identity) => observedOverflowCases.includes(identity))
  ) {
    throw new Error("Phase 2 multilingual overflow matrix is incomplete");
  }

  const motionFacts = reported["phase2-reduced-motion-facts"]
    ?.["e2e:phase2-reduced-motion"];
  if (
    !exactKeys(motionFacts, [
      "kind",
      "maxAnimationDurationMs",
      "maxTransitionDurationMs",
      "nextActionVisible",
      "reducedMotionMatched",
      "resultVisible",
      "schemaVersion",
    ])
    || motionFacts.schemaVersion !== 1
    || motionFacts.kind !== "phase2-reduced-motion-facts"
    || typeof motionFacts.maxAnimationDurationMs !== "number"
    || !Number.isFinite(motionFacts.maxAnimationDurationMs)
    || motionFacts.maxAnimationDurationMs < 0
    || typeof motionFacts.maxTransitionDurationMs !== "number"
    || !Number.isFinite(motionFacts.maxTransitionDurationMs)
    || motionFacts.maxTransitionDurationMs < 0
  ) {
    throw new Error("Phase 2 reduced-motion facts are invalid");
  }

  const checks = {
    visualMatrixPassed: (
      arraysEqual(parsedEvidence.resultIds, PHASE2_VISUAL_GATE_IDS)
      && visualCases.length === EXPECTED_VISUAL_CASES.length
      && visualCases.every((entry) => (
        entry.status === "pass"
        && entry.skipped === false
        && entry.retried === false
        && entry.flaky === false
      ))
    ),
    originalDimensionsInspected: originalDimensionsInspected === true,
    noSkeletons: validatedRouteFacts.every(({ skeletonCount }) => skeletonCount === 0),
    noLegacyFrames: validatedRouteFacts.every(({ legacyFrameCount }) => legacyFrameCount === 0),
    brandAssetsPresent: validatedRouteFacts.every(({ brandAssetMissingCases }) => (
      brandAssetMissingCases === 0
    )),
    noClipping: validatedRouteFacts.every(({ clippedElementCount, horizontalOverflowPx }) => (
      clippedElementCount === 0 && horizontalOverflowPx === 0
    )),
    chineseEnglishOverflowPassed: overflowFacts.cases.every(({ horizontalOverflowPx }) => (
      horizontalOverflowPx === 0
    )),
    reducedMotionPassed: (
      motionFacts.reducedMotionMatched === true
      && motionFacts.maxAnimationDurationMs <= 1
      && motionFacts.maxTransitionDurationMs <= 1
      && motionFacts.resultVisible === true
      && motionFacts.nextActionVisible === true
    ),
  };
  if (Object.entries(checks).some(([key, value]) => (
    key !== "originalDimensionsInspected" && value !== true
  ))) {
    throw new Error("Phase 2 visual facts contain failed checks");
  }
  return checks;
};

export function buildPhase2VisualCaptureSummary({
  checkedAt,
  commit,
  manifestSha256,
  phase1EvidenceLockSha256,
  parsedEvidence,
  visualCases,
} = {}) {
  if (
    typeof checkedAt !== "string"
    || !Number.isFinite(Date.parse(checkedAt))
    || new Date(Date.parse(checkedAt)).toISOString() !== checkedAt
  ) throw new Error("Phase 2 visual evidence timestamp is invalid");
  if (!SHA_PATTERN.test(commit ?? "")) {
    throw new Error("Phase 2 visual evidence commit is invalid");
  }
  if (!HASH_PATTERN.test(manifestSha256 ?? "")) {
    throw new Error("Phase 2 visual manifest hash is invalid");
  }
  if (!HASH_PATTERN.test(phase1EvidenceLockSha256 ?? "")) {
    throw new Error("Phase 1 evidence lock hash is invalid");
  }
  if (!arraysEqual(parsedEvidence?.resultIds, PHASE2_VISUAL_GATE_IDS)) {
    throw new Error("Phase 2 visual parsed gate inventory is invalid");
  }
  if (
    !Array.isArray(visualCases)
    || visualCases.length !== EXPECTED_VISUAL_CASES.length
    || new Set(visualCases.map((entry) => entry?.id)).size !== EXPECTED_VISUAL_CASES.length
    || new Set(visualCases.map((entry) => entry?.sha256)).size !== EXPECTED_VISUAL_CASES.length
  ) {
    throw new Error("Phase 2 visual evidence inventory is invalid");
  }
  const checks = derivePhase2VisualChecks({
    parsedEvidence,
    visualCases,
    originalDimensionsInspected: false,
  });

  const summary = {
    schemaVersion: 1,
    check: "frontend-upgrade-phase2-visual",
    status: "pending-review",
    checkedAt,
    commit,
    manifestSha256,
    phase1EvidenceLockSha256,
    results: PHASE2_VISUAL_GATE_IDS.map((id) => ({
      id,
      status: "pass",
      skipped: false,
      retried: false,
      flaky: false,
    })),
    visualCases: visualCases.map((entry) => ({ ...entry })),
    checks,
    counts: {
      resultCount: PHASE2_VISUAL_GATE_IDS.length,
      skippedResultCount: 0,
      failedResultCount: 0,
      retriedResultCount: 0,
      flakyResultCount: 0,
    },
    metrics: {},
    failureCodes: [PENDING_REVIEW_FAILURE_CODE],
  };
  if (
    !exactKeys(summary, SUMMARY_ENVELOPE_KEYS)
    || !exactKeys(summary.checks, REQUIRED_CHECKS)
    || summary.checks.originalDimensionsInspected !== false
    || Object.entries(summary.checks).some(([key, value]) => (
      key !== "originalDimensionsInspected" && value !== true
    ))
  ) {
    throw new Error("Phase 2 visual capture summary envelope is invalid");
  }
  return summary;
}

export const phase2VisualPlaywrightArguments = (grep) => Object.freeze([
  path.join("node_modules", "playwright", "cli.js"),
  "test",
  "--config",
  "playwright.v2.config.ts",
  "--grep",
  grep,
  "--reporter=json",
  "--retries=0",
  "--workers=1",
]);

export async function runPhase2VisualPlaywright({
  root,
  grep,
  reviewDirectory,
} = {}) {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "quantgym-phase2-visual-report-"),
  );
  const reportPath = path.join(temporaryDirectory, REPORT_FILENAME);
  let exitCode = 0;
  let commandError;
  try {
    try {
      await execFileAsync(
        process.execPath,
        phase2VisualPlaywrightArguments(grep),
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ""}`,
            PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
            [REVIEW_DIRECTORY_ENV]: reviewDirectory,
          },
          maxBuffer: 8 * 1024 * 1024,
        },
      );
    } catch (error) {
      exitCode = Number.isSafeInteger(error?.code) ? error.code : 1;
      commandError = error;
    }
    const reportMetadata = await stat(reportPath).catch(() => null);
    if (
      !reportMetadata?.isFile()
      || reportMetadata.size <= 0
      || reportMetadata.size > MAX_REPORT_BYTES
    ) {
      throw new Error("Phase 2 visual Playwright report is missing or oversized", {
        cause: commandError,
      });
    }
    let report;
    try {
      report = JSON.parse(await readFile(reportPath, "utf8"));
    } catch (error) {
      throw new Error("Phase 2 visual Playwright report cannot be parsed", {
        cause: error,
      });
    }
    return { exitCode, report };
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

const resolveCommit = async (root) => {
  const { stdout } = await execFileAsync(
    "/usr/bin/git",
    ["-c", "core.fsmonitor=false", "rev-parse", "HEAD"],
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
      maxBuffer: 128 * 1024,
    },
  );
  const commit = stdout.trim();
  if (!SHA_PATTERN.test(commit)) throw new Error("current Git commit is invalid");
  return commit;
};

const ensureTrustedOutputDirectory = async ({ root, relativeDirectory }) => {
  if (!safeRelativePath(relativeDirectory)) {
    throw new Error("Phase 2 visual output directory is unsafe");
  }
  const resolvedRoot = path.resolve(root);
  await captureTrustedDirectory(resolvedRoot);
  let current = resolvedRoot;
  for (const segment of relativeDirectory.split("/")) {
    current = path.join(current, segment);
    await mkdir(current).catch((error) => {
      if (error?.code !== "EEXIST") throw error;
    });
    await captureTrustedDirectory(current);
  }
};

const securelyReadEvidenceJson = async ({
  root,
  relativePath,
  maximumBytes,
  requiredMode,
}) => {
  if (!safeRelativePath(relativePath) || typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("Phase 2 visual JSON input path is unsafe");
  }
  const resolvedRoot = path.resolve(root);
  const ancestorsBefore = await captureTrustedAncestors(resolvedRoot, relativePath);
  const absolutePath = path.join(resolvedRoot, relativePath);
  const metadata = await lstat(absolutePath, { bigint: true });
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.nlink !== 1n
    || metadata.size <= 0n
    || metadata.size > BigInt(maximumBytes)
    || (requiredMode !== undefined && (metadata.mode & 0o777n) !== BigInt(requiredMode))
  ) {
    throw new Error(`Phase 2 visual JSON input is unsafe: ${relativePath}`);
  }
  const handle = await open(
    absolutePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat({ bigint: true });
    assertSameStat(metadata, before, "Phase 2 visual JSON changed before read");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    assertSameStat(before, after, "Phase 2 visual JSON changed while read");
    const ancestorsAfter = await captureTrustedAncestors(resolvedRoot, relativePath);
    if (!sameSnapshot(ancestorsBefore, ancestorsAfter)) {
      throw new Error(`Phase 2 visual JSON ancestors changed while read: ${relativePath}`);
    }
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error(`Phase 2 visual JSON input is invalid: ${relativePath}`);
    }
    return Object.freeze({
      bytes,
      value,
      snapshot: Object.freeze({
        ancestors: ancestorsAfter,
        file: snapshotStat(after),
        sha256: sha256(bytes),
      }),
    });
  } finally {
    await handle.close();
  }
};

const validatePhase2VisualCaptureSummary = ({
  summary,
  context,
  visualCases,
}) => {
  if (
    !exactKeys(summary, SUMMARY_ENVELOPE_KEYS)
    || summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase2-visual"
    || summary.status !== "pending-review"
    || !validIsoTimestamp(summary.checkedAt)
    || !SHA_PATTERN.test(summary.commit ?? "")
    || summary.manifestSha256 !== context.manifestSha256
    || summary.phase1EvidenceLockSha256 !== context.phase1EvidenceLockSha256
    || !Array.isArray(summary.results)
    || !arraysEqual(summary.results.map((entry) => entry?.id), PHASE2_VISUAL_GATE_IDS)
    || summary.results.some((entry) => (
      !exactKeys(entry, ["id", "status", "skipped", "retried", "flaky"])
      || entry.status !== "pass"
      || entry.skipped !== false
      || entry.retried !== false
      || entry.flaky !== false
    ))
    || JSON.stringify(summary.visualCases) !== JSON.stringify(visualCases)
    || !exactKeys(summary.checks, REQUIRED_CHECKS)
    || summary.checks.originalDimensionsInspected !== false
    || Object.entries(summary.checks).some(([key, value]) => (
      key !== "originalDimensionsInspected" && value !== true
    ))
    || !exactKeys(summary.counts, [
      "resultCount",
      "skippedResultCount",
      "failedResultCount",
      "retriedResultCount",
      "flakyResultCount",
    ])
    || summary.counts.resultCount !== PHASE2_VISUAL_GATE_IDS.length
    || Object.entries(summary.counts).some(([key, value]) => (
      key !== "resultCount" && value !== 0
    ))
    || !exactKeys(summary.metrics, [])
    || !arraysEqual(summary.failureCodes, [PENDING_REVIEW_FAILURE_CODE])
  ) {
    throw new Error("Phase 2 visual capture summary is invalid");
  }
};

export function validatePhase2FinalVisualSummary(summary, {
  expectedCases,
  expectedCommit,
  manifestSha256,
  nowMs,
  phase1EvidenceLockSha256,
  reviewImages,
} = {}) {
  const checkedAtMs = Date.parse(summary?.checkedAt);
  if (
    !exactKeys(summary, SUMMARY_ENVELOPE_KEYS)
    || summary.schemaVersion !== 1
    || summary.check !== "frontend-upgrade-phase2-visual"
    || summary.status !== "pass"
    || summary.commit !== expectedCommit
    || !SHA_PATTERN.test(summary.commit ?? "")
    || summary.manifestSha256 !== manifestSha256
    || !HASH_PATTERN.test(summary.manifestSha256 ?? "")
    || summary.phase1EvidenceLockSha256 !== phase1EvidenceLockSha256
    || !HASH_PATTERN.test(summary.phase1EvidenceLockSha256 ?? "")
    || !Number.isFinite(checkedAtMs)
    || new Date(checkedAtMs).toISOString() !== summary.checkedAt
    || !Number.isFinite(nowMs)
    || checkedAtMs > nowMs + CLOCK_SKEW_MS
    || nowMs - checkedAtMs > MAX_REVIEW_AGE_MS
    || !Array.isArray(summary.results)
    || !arraysEqual(summary.results.map((entry) => entry?.id), PHASE2_VISUAL_GATE_IDS)
    || summary.results.some((entry) => (
      !exactKeys(entry, ["id", "status", "skipped", "retried", "flaky"])
      || entry.status !== "pass"
      || entry.skipped !== false
      || entry.retried !== false
      || entry.flaky !== false
    ))
    || !Array.isArray(expectedCases)
    || expectedCases.length !== EXPECTED_VISUAL_CASES.length
    || !Array.isArray(summary.visualCases)
    || summary.visualCases.length !== expectedCases.length
    || !(reviewImages instanceof Map)
    || !exactKeys(summary.checks, REQUIRED_CHECKS)
    || Object.values(summary.checks).some((value) => value !== true)
    || !exactKeys(summary.counts, [
      "resultCount",
      "skippedResultCount",
      "failedResultCount",
      "retriedResultCount",
      "flakyResultCount",
    ])
    || summary.counts.resultCount !== PHASE2_VISUAL_GATE_IDS.length
    || Object.entries(summary.counts).some(([key, value]) => (
      key !== "resultCount" && value !== 0
    ))
    || !exactKeys(summary.metrics, [])
    || !Array.isArray(summary.failureCodes)
    || summary.failureCodes.length !== 0
  ) throw new Error("Phase 2 finalized visual summary is invalid or stale");

  const observedHashes = new Set();
  for (const [index, expectedCase] of expectedCases.entries()) {
    const visualCase = summary.visualCases[index];
    const image = reviewImages.get(expectedCase?.evidencePath);
    if (
      !exactKeys(visualCase, VISUAL_CASE_KEYS)
      || visualCase.id !== expectedCase?.id
      || visualCase.status !== "pass"
      || visualCase.evidencePath !== expectedCase?.evidencePath
      || visualCase.width !== expectedCase?.viewport?.width
      || visualCase.height !== expectedCase?.viewport?.height
      || !HASH_PATTERN.test(visualCase.sha256 ?? "")
      || visualCase.skipped !== false
      || visualCase.retried !== false
      || visualCase.flaky !== false
      || observedHashes.has(visualCase.sha256)
      || image?.sha256 !== visualCase.sha256
      || image?.width !== visualCase.width
      || image?.height !== visualCase.height
    ) throw new Error(`Phase 2 finalized visual case is invalid: ${String(visualCase?.id)}`);
    observedHashes.add(visualCase.sha256);
  }
  return summary;
}

const assertVisualRecordStable = (before, after, label) => {
  if (
    !Buffer.isBuffer(before?.bytes)
    || !Buffer.isBuffer(after?.bytes)
    || !before.bytes.equals(after.bytes)
    || !sameSnapshot(before.snapshot, after.snapshot)
  ) throw new Error(`Phase 2 visual ${label} changed before finalization`);
};

const assertVisualImagesStable = (before, after) => {
  if (
    JSON.stringify(before?.visualCases) !== JSON.stringify(after?.visualCases)
    || !sameSnapshot(before?.snapshot, after?.snapshot)
    || !(before?.imageBytesByEvidencePath instanceof Map)
    || !(after?.imageBytesByEvidencePath instanceof Map)
    || before.imageBytesByEvidencePath.size !== after.imageBytesByEvidencePath.size
  ) throw new Error("Phase 2 visual image snapshot changed before finalization");
  for (const [relativePath, bytes] of before.imageBytesByEvidencePath) {
    const afterBytes = after.imageBytesByEvidencePath.get(relativePath);
    if (!Buffer.isBuffer(bytes) || !Buffer.isBuffer(afterBytes) || !bytes.equals(afterBytes)) {
      throw new Error("Phase 2 visual image bytes changed before finalization");
    }
  }
};

const assertVisualContextStable = (before, after) => {
  if (
    before.manifestSha256 !== after.manifestSha256
    || before.phase1EvidenceLockSha256 !== after.phase1EvidenceLockSha256
    || !sameSnapshot(before.sourceSnapshot, after.sourceSnapshot)
  ) throw new Error("Phase 2 visual manifest or Phase 1 lock changed before finalization");
};

export async function runPhase2VisualEvidenceFinalizer({
  root,
  now = () => new Date(),
  writeEvidence = true,
} = {}) {
  const context = await loadPhase2VisualEvidenceContext({ root });
  const [captureRecord, receiptRecord, images] = await Promise.all([
    securelyReadEvidenceJson({
      root,
      relativePath: context.summaryPath,
      maximumBytes: MAX_RECEIPT_BYTES,
    }),
    securelyReadEvidenceJson({
      root,
      relativePath: PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
      maximumBytes: MAX_RECEIPT_BYTES,
      requiredMode: 0o644,
    }),
    collectPhase2ReviewImages({
      protectedRoot: root,
      reviewDirectory: path.join(root, context.reviewRelativeDirectory),
      visualCases: context.visualCases,
    }),
  ]);
  validatePhase2VisualCaptureSummary({
    summary: captureRecord.value,
    context,
    visualCases: images.visualCases,
  });
  const finalizedAt = now();
  if (!(finalizedAt instanceof Date) || !Number.isFinite(finalizedAt.getTime())) {
    throw new Error("Phase 2 visual evidence finalizer clock is invalid");
  }
  validatePhase2VisualReviewReceipt({
    receipt: receiptRecord.value,
    visualCases: images.visualCases,
    expectedCases: context.visualCases,
    commit: captureRecord.value.commit,
    manifestSha256: context.manifestSha256,
    phase1EvidenceLockSha256: context.phase1EvidenceLockSha256,
    captureCheckedAt: captureRecord.value.checkedAt,
    nowMs: finalizedAt.getTime(),
  });
  const summary = {
    ...captureRecord.value,
    status: "pass",
    checks: {
      ...captureRecord.value.checks,
      originalDimensionsInspected: true,
    },
    failureCodes: [],
  };
  validatePhase2FinalVisualSummary(summary, {
    expectedCases: context.visualCases,
    expectedCommit: captureRecord.value.commit,
    manifestSha256: context.manifestSha256,
    nowMs: finalizedAt.getTime(),
    phase1EvidenceLockSha256: context.phase1EvidenceLockSha256,
    reviewImages: new Map(images.visualCases.map((visualCase) => [
      visualCase.evidencePath,
      {
        height: visualCase.height,
        sha256: visualCase.sha256,
        width: visualCase.width,
      },
    ])),
  });

  const [
    contextAfter,
    captureRecordAfter,
    receiptRecordAfter,
    imagesAfter,
  ] = await Promise.all([
    loadPhase2VisualEvidenceContext({ root }),
    securelyReadEvidenceJson({
      root,
      relativePath: context.summaryPath,
      maximumBytes: MAX_RECEIPT_BYTES,
    }),
    securelyReadEvidenceJson({
      root,
      relativePath: PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
      maximumBytes: MAX_RECEIPT_BYTES,
      requiredMode: 0o644,
    }),
    collectPhase2ReviewImages({
      protectedRoot: root,
      reviewDirectory: path.join(root, context.reviewRelativeDirectory),
      visualCases: context.visualCases,
    }),
  ]);
  assertVisualContextStable(context, contextAfter);
  assertVisualRecordStable(captureRecord, captureRecordAfter, "capture summary");
  assertVisualRecordStable(receiptRecord, receiptRecordAfter, "review receipt");
  assertVisualImagesStable(images, imagesAfter);

  if (writeEvidence) {
    await writeFileAtomicallyWithinTrustedRoot({
      root,
      relativePath: context.summaryPath,
      data: `${JSON.stringify(summary, null, 2)}\n`,
      mode: 0o644,
    });
  }
  return {
    outputPath: context.summaryPath,
    reviewReceiptSha256: sha256(receiptRecord.bytes),
    summary,
  };
}

export async function runPhase2VisualEvidenceBuilder({
  root,
  reportRunner = runPhase2VisualPlaywright,
  commitResolver = resolveCommit,
  now = () => new Date(),
  writeEvidence = true,
} = {}) {
  const context = await loadPhase2VisualEvidenceContext({ root });
  const reviewDirectory = await mkdtemp(
    path.join(tmpdir(), "quantgym-phase2-visual-review-"),
  );
  try {
    const execution = await reportRunner({
      root,
      grep: context.grep,
      reviewDirectory,
    });
    const parsedEvidence = parsePhase2PlaywrightReport({
      report: execution?.report,
      expectedIds: context.expectedGateIds,
      supportTags: context.supportTags,
      annotationRequirements: context.annotationRequirements,
    });
    if (execution?.exitCode !== 0) {
      throw new Error(`Phase 2 visual Playwright exited with code ${String(execution?.exitCode)}`);
    }
    const images = await collectPhase2ReviewImages({
      reviewDirectory,
      visualCases: context.visualCases,
    });
    const checkedAtDate = now();
    if (!(checkedAtDate instanceof Date) || !Number.isFinite(checkedAtDate.getTime())) {
      throw new Error("Phase 2 visual evidence clock is invalid");
    }
    const summary = buildPhase2VisualCaptureSummary({
      checkedAt: checkedAtDate.toISOString(),
      commit: await commitResolver(root),
      manifestSha256: context.manifestSha256,
      phase1EvidenceLockSha256: context.phase1EvidenceLockSha256,
      parsedEvidence,
      visualCases: images.visualCases,
    });

    if (writeEvidence) {
      await ensureTrustedOutputDirectory({
        root,
        relativeDirectory: context.reviewRelativeDirectory,
      });
      for (const visualCase of context.visualCases) {
        const bytes = images.imageBytesByEvidencePath.get(visualCase.evidencePath);
        if (!Buffer.isBuffer(bytes)) {
          throw new Error(`Phase 2 visual image bytes are missing: ${visualCase.id}`);
        }
        await writeFileAtomicallyWithinTrustedRoot({
          root,
          relativePath: visualCase.evidencePath,
          data: bytes,
        });
      }
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: context.summaryPath,
        data: `${JSON.stringify(summary, null, 2)}\n`,
      });
    }

    return {
      outputPath: context.summaryPath,
      parsedEvidence,
      summary,
    };
  } finally {
    await rm(reviewDirectory, { force: true, recursive: true });
  }
}
