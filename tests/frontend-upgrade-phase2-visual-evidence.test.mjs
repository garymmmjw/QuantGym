import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadPhase2VisualEvidenceContext,
  PHASE2_VISUAL_GATE_IDS,
  PHASE2_VISUAL_REVIEW_METHOD,
  PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
  PHASE2_VISUAL_SUPPORT_TAGS,
  PHASE2_VISUAL_SUMMARY_PATH,
  phase2VisualPlaywrightArguments,
  runPhase2VisualEvidenceBuilder,
  runPhase2VisualEvidenceFinalizer,
  validatePhase2VisualReviewReceipt,
} from "../scripts/lib/frontend-upgrade-phase2-visual-evidence.mjs";
import {
  buildPhase2VisualEvidence,
} from "../scripts/build-frontend-upgrade-phase2-visual-evidence.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestRelativePath = "docs/frontend-upgrade/phase-2-acceptance-manifest.json";
const phase1LockRelativePath = "docs/frontend-upgrade/phase-1-evidence-lock.json";
const commit = "a".repeat(40);
const checkedAt = "2026-07-27T12:00:00.000Z";
const reviewedAt = "2026-07-27T12:01:00.000Z";
const finalizedAt = "2026-07-27T12:02:00.000Z";
const minimalJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
  "base64",
);

const passedResult = (retry = 0) => ({
  attachments: [],
  duration: 10,
  errors: [],
  retry,
  status: "passed",
  stderr: [],
  stdout: [],
});

const routeForGate = (gateId) => gateId.split(":")[1];

const taggedSpecFor = (tags, annotations = []) => ({
  id: tags.join("-"),
  ok: true,
  tags,
  title: `${tags.map((tag) => `@${tag}`).join(" ")} synthetic visual evidence`,
  tests: [{
    annotations,
    expectedStatus: "passed",
    projectId: "",
    projectName: "",
    results: [passedResult()],
    status: "expected",
  }],
});

const specFor = (gateId) => {
  const routeId = routeForGate(gateId);
  return taggedSpecFor([`phase2:${routeId}`, gateId]);
};

const routeFacts = (routeId) => ({
  brandAssetMissingCases: 0,
  caseCount: 2,
  clippedElementCount: 0,
  horizontalOverflowPx: 0,
  kind: "phase2-visual-route-facts",
  legacyFrameCount: 0,
  routeId,
  schemaVersion: 1,
  skeletonCount: 0,
  viewportWidths: [390, 1_440],
});

const overflowFacts = () => ({
  cases: ["overview", "plan", "problems"].flatMap((routeId) => (
    ["zh-CN", "en"].flatMap((language) => [390, 1_024].map((viewportWidth) => ({
      horizontalOverflowPx: 0,
      injectedTextLength: 96,
      language,
      routeId,
      viewportWidth,
    })))
  )),
  kind: "phase2-visual-overflow-facts",
  schemaVersion: 1,
});

const reducedMotionFacts = () => ({
  kind: "phase2-reduced-motion-facts",
  maxAnimationDurationMs: 1,
  maxTransitionDurationMs: 1,
  nextActionVisible: true,
  reducedMotionMatched: true,
  resultVisible: true,
  schemaVersion: 1,
});

const supportSpecs = () => PHASE2_VISUAL_SUPPORT_TAGS.map((supportTag) => {
  if (supportTag.startsWith("e2e:phase2-visual-route-")) {
    const routeId = supportTag.replace("e2e:phase2-visual-route-", "");
    return taggedSpecFor(["phase2:visual-support", supportTag], [{
      description: JSON.stringify(routeFacts(routeId)),
      type: "phase2-visual-route-facts",
    }]);
  }
  if (supportTag === "e2e:phase2-visual-overflow") {
    return taggedSpecFor(["phase2:visual-support", supportTag], [{
      description: JSON.stringify(overflowFacts()),
      type: "phase2-visual-overflow-facts",
    }]);
  }
  return taggedSpecFor(["phase2:visual-support", supportTag], [{
    description: JSON.stringify(reducedMotionFacts()),
    type: "phase2-reduced-motion-facts",
  }]);
});

const reportFor = () => ({
  config: {
    projects: [{ id: "", name: "", retries: 0 }],
    reporter: [["json"]],
  },
  errors: [],
  stats: {
    expected: PHASE2_VISUAL_GATE_IDS.length + PHASE2_VISUAL_SUPPORT_TAGS.length,
    flaky: 0,
    skipped: 0,
    unexpected: 0,
  },
  suites: [{
    specs: [...PHASE2_VISUAL_GATE_IDS.map(specFor), ...supportSpecs()],
    suites: [],
    title: "synthetic visual evidence",
  }],
});

const resizeAndIdentifyJpeg = ({ width, height, identity }) => {
  const bytes = Buffer.from(minimalJpeg);
  const markerOffset = bytes.indexOf(Buffer.from([0xff, 0xc0, 0x00, 0x11]));
  assert.notEqual(markerOffset, -1, "synthetic JPEG must contain a baseline SOF marker");
  bytes.writeUInt16BE(height, markerOffset + 5);
  bytes.writeUInt16BE(width, markerOffset + 7);
  const comment = Buffer.from(`phase2-${identity}`, "utf8");
  const commentMarker = Buffer.alloc(4);
  commentMarker[0] = 0xff;
  commentMarker[1] = 0xfe;
  commentMarker.writeUInt16BE(comment.length + 2, 2);
  return Buffer.concat([
    bytes.subarray(0, -2),
    commentMarker,
    comment,
    Buffer.from([0xff, 0xd9]),
  ]);
};

const createTemporaryRoot = async () => {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), "phase2-visual-test-"));
  await Promise.all([
    mkdir(path.join(root, "docs/frontend-upgrade"), { recursive: true }),
    mkdir(path.join(root, "docs/browser-audit-screenshots"), { recursive: true }),
  ]);
  const [manifestBytes, phase1LockBytes] = await Promise.all([
    readFile(path.join(repositoryRoot, manifestRelativePath)),
    readFile(path.join(repositoryRoot, phase1LockRelativePath)),
  ]);
  await Promise.all([
    writeFile(path.join(root, manifestRelativePath), manifestBytes),
    writeFile(path.join(root, phase1LockRelativePath), phase1LockBytes),
  ]);
  return {
    manifest: JSON.parse(manifestBytes.toString("utf8")),
    root,
  };
};

const writeSyntheticReviewImages = async ({
  duplicatePair,
  manifest,
  omitId,
  reviewDirectory,
  wrongDimensionId,
} = {}) => {
  const generated = new Map();
  for (const visualCase of manifest.finalVisualCases) {
    if (visualCase.id === omitId) continue;
    const duplicateSource = duplicatePair?.[1] === visualCase.id
      ? generated.get(duplicatePair[0])
      : undefined;
    const bytes = duplicateSource ?? resizeAndIdentifyJpeg({
      width: visualCase.viewport.width + (visualCase.id === wrongDimensionId ? 1 : 0),
      height: visualCase.viewport.height,
      identity: visualCase.id,
    });
    generated.set(visualCase.id, bytes);
    await writeFile(
      path.join(reviewDirectory, path.posix.basename(visualCase.evidencePath)),
      bytes,
    );
  }
};

const runSyntheticBuilder = async ({
  imageOptions,
  mutateReport,
  writeEvidence = true,
} = {}) => {
  const fixture = await createTemporaryRoot();
  const report = reportFor();
  mutateReport?.(report);
  const run = runPhase2VisualEvidenceBuilder({
    root: fixture.root,
    commitResolver: async () => commit,
    now: () => new Date(checkedAt),
    writeEvidence,
    reportRunner: async ({ grep, reviewDirectory }) => {
      assert.equal(path.isAbsolute(reviewDirectory), true);
      for (const gateId of PHASE2_VISUAL_GATE_IDS) {
        assert.equal(grep.includes(gateId), true);
      }
      await writeSyntheticReviewImages({
        manifest: fixture.manifest,
        reviewDirectory,
        ...imageOptions,
      });
      return { exitCode: 0, report };
    },
  });
  return { fixture, run };
};

const reviewReceiptFor = (summary, mutate) => {
  const receipt = {
    schemaVersion: 1,
    kind: "frontend-upgrade-phase2-visual-review-receipt",
    status: "attested",
    reviewer: "Codex",
    reviewedAt,
    reviewMethod: PHASE2_VISUAL_REVIEW_METHOD,
    applicationCommit: summary.commit,
    manifestSha256: summary.manifestSha256,
    phase1EvidenceLockSha256: summary.phase1EvidenceLockSha256,
    images: summary.visualCases.map((visualCase) => ({
      id: visualCase.id,
      evidencePath: visualCase.evidencePath,
      sha256: visualCase.sha256,
      width: visualCase.width,
      height: visualCase.height,
      originalDimensionsInspected: true,
    })),
  };
  mutate?.(receipt);
  return receipt;
};

const writeReviewReceipt = async (root, receipt) => writeFile(
  path.join(root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH),
  `${JSON.stringify(receipt, null, 2)}\n`,
  { mode: 0o644 },
);

test("requires an external 22-image receipt before original dimensions can pass", async () => {
  const { fixture, run } = await runSyntheticBuilder();
  try {
    const capture = await run;
    assert.equal(capture.outputPath, PHASE2_VISUAL_SUMMARY_PATH);
    assert.deepEqual(capture.summary.results.map((entry) => entry.id), PHASE2_VISUAL_GATE_IDS);
    assert.equal(capture.summary.visualCases.length, 22);
    assert.equal(new Set(capture.summary.visualCases.map((entry) => entry.sha256)).size, 22);
    assert.equal(capture.summary.status, "pending-review");
    assert.equal(capture.summary.checks.originalDimensionsInspected, false);
    assert.deepEqual(capture.summary.failureCodes, ["original_dimensions_review_required"]);
    assert.deepEqual(capture.summary.counts, {
      resultCount: 3,
      skippedResultCount: 0,
      failedResultCount: 0,
      retriedResultCount: 0,
      flakyResultCount: 0,
    });
    assert.deepEqual(capture.summary.metrics, {});

    const serialized = await readFile(path.join(fixture.root, PHASE2_VISUAL_SUMMARY_PATH));
    assert.deepEqual(JSON.parse(serialized.toString("utf8")), capture.summary);
    for (const visualCase of capture.summary.visualCases) {
      const installed = await readFile(path.join(fixture.root, visualCase.evidencePath));
      assert.equal(createHash("sha256").update(installed).digest("hex"), visualCase.sha256);
    }

    await assert.rejects(
      runPhase2VisualEvidenceFinalizer({
        root: fixture.root,
        now: () => new Date(finalizedAt),
      }),
      { code: "ENOENT" },
    );

    const receipt = reviewReceiptFor(capture.summary);
    await writeReviewReceipt(fixture.root, receipt);
    const finalized = await runPhase2VisualEvidenceFinalizer({
      root: fixture.root,
      now: () => new Date(finalizedAt),
    });
    assert.equal(finalized.summary.status, "pass");
    assert.equal(finalized.summary.checks.originalDimensionsInspected, true);
    assert.deepEqual(Object.values(finalized.summary.checks), Array(8).fill(true));
    assert.deepEqual(finalized.summary.failureCodes, []);
    assert.equal(finalized.reviewReceiptSha256, createHash("sha256").update(
      await readFile(path.join(fixture.root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH)),
    ).digest("hex"));
  } finally {
    await run.catch(() => undefined);
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("rejects forged, incomplete, stale, or mismatched visual review receipts", async (t) => {
  const { fixture, run } = await runSyntheticBuilder();
  try {
    const capture = await run;
    const validationOptions = {
      visualCases: capture.summary.visualCases,
      expectedCases: fixture.manifest.finalVisualCases,
      commit: capture.summary.commit,
      manifestSha256: capture.summary.manifestSha256,
      phase1EvidenceLockSha256: capture.summary.phase1EvidenceLockSha256,
      captureCheckedAt: capture.summary.checkedAt,
      nowMs: Date.parse(finalizedAt),
    };
    assert.equal(validatePhase2VisualReviewReceipt({
      ...validationOptions,
      receipt: reviewReceiptFor(capture.summary),
    }), true);

    const cases = [
      ["missing image identity", (receipt) => { delete receipt.images[0].id; }],
      ["mismatched image hash", (receipt) => { receipt.images[0].sha256 = "f".repeat(64); }],
      ["mismatched original width", (receipt) => { receipt.images[0].width += 1; }],
      ["unattested original dimensions", (receipt) => {
        receipt.images[0].originalDimensionsInspected = false;
      }],
      ["anonymous reviewer", (receipt) => { receipt.reviewer = " "; }],
      ["automated review method", (receipt) => { receipt.reviewMethod = "jpeg-header-check"; }],
      ["review before capture", (receipt) => {
        receipt.reviewedAt = "2026-07-27T11:59:59.000Z";
      }],
      ["mismatched application commit", (receipt) => {
        receipt.applicationCommit = "b".repeat(40);
      }],
      ["mismatched Phase 1 evidence lock", (receipt) => {
        receipt.phase1EvidenceLockSha256 = "f".repeat(64);
      }],
      ["reordered image inventory", (receipt) => {
        [receipt.images[0], receipt.images[1]] = [receipt.images[1], receipt.images[0]];
      }],
      ["duplicate image inventory", (receipt) => {
        receipt.images[1] = structuredClone(receipt.images[0]);
      }],
      ["missing image inventory entry", (receipt) => {
        receipt.images.pop();
      }],
      ["extra image inventory entry", (receipt) => {
        receipt.images.push(structuredClone(receipt.images[0]));
      }],
    ];
    for (const [name, mutate] of cases) {
      await t.test(name, () => {
        const receipt = reviewReceiptFor(capture.summary, mutate);
        assert.throws(
          () => validatePhase2VisualReviewReceipt({ ...validationOptions, receipt }),
          /visual review receipt/u,
        );
      });
    }
    const expiredReceipt = reviewReceiptFor(capture.summary);
    assert.throws(
      () => validatePhase2VisualReviewReceipt({
        ...validationOptions,
        nowMs: Date.parse("2026-08-05T12:02:00.000Z"),
        receipt: expiredReceipt,
      }),
      /visual review receipt/u,
    );
  } finally {
    await run.catch(() => undefined);
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("fails closed for unsafe receipt mode, symlink, or directory", async (t) => {
  await t.test("wrong receipt mode", async () => {
    const { fixture, run } = await runSyntheticBuilder();
    try {
      const capture = await run;
      await writeReviewReceipt(fixture.root, reviewReceiptFor(capture.summary));
      await chmod(path.join(fixture.root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH), 0o600);
      await assert.rejects(
        runPhase2VisualEvidenceFinalizer({
          root: fixture.root,
          now: () => new Date(finalizedAt),
        }),
        /JSON input is unsafe/u,
      );
    } finally {
      await run.catch(() => undefined);
      await rm(fixture.root, { force: true, recursive: true });
    }
  });

  for (const kind of ["symlink", "directory"]) {
    await t.test(kind, async () => {
      const fixture = await createTemporaryRoot();
      const receiptPath = path.join(fixture.root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH);
      if (kind === "symlink") {
        await symlink(
          path.join(fixture.root, phase1LockRelativePath),
          receiptPath,
        );
      } else {
        await mkdir(receiptPath);
      }
      await assert.rejects(
        buildPhase2VisualEvidence({ root: fixture.root }),
        /receipt exists but is unsafe/u,
      );
      await rm(fixture.root, { force: true, recursive: true });
    });
  }
});

test("rejects symlinked manifest, Phase 1 lock, and protected ancestors", async (t) => {
  for (const relativePath of [manifestRelativePath, phase1LockRelativePath]) {
    await t.test(relativePath, async () => {
      const fixture = await createTemporaryRoot();
      const target = path.join(fixture.root, relativePath);
      const realTarget = `${target}.real`;
      await rename(target, realTarget);
      await symlink(realTarget, target);
      await assert.rejects(
        loadPhase2VisualEvidenceContext({ root: fixture.root }),
        /JSON input is unsafe/u,
      );
      await rm(fixture.root, { force: true, recursive: true });
    });
  }

  const fixture = await createTemporaryRoot();
  const frontendUpgrade = path.join(fixture.root, "docs/frontend-upgrade");
  const realDirectory = path.join(fixture.root, "docs/frontend-upgrade-real");
  await rename(frontendUpgrade, realDirectory);
  await symlink(realDirectory, frontendUpgrade);
  await assert.rejects(
    loadPhase2VisualEvidenceContext({ root: fixture.root }),
    /ancestor is unsafe/u,
  );
  await rm(fixture.root, { force: true, recursive: true });
});

test("finalizer rejects cross-file TOCTOU and leaves capture pending", async () => {
  const { fixture, run } = await runSyntheticBuilder();
  try {
    const capture = await run;
    const receipt = reviewReceiptFor(capture.summary);
    await writeReviewReceipt(fixture.root, receipt);
    await assert.rejects(
      runPhase2VisualEvidenceFinalizer({
        root: fixture.root,
        now: () => {
          const changed = { ...receipt, reviewer: "Changed reviewer" };
          writeFileSync(
            path.join(fixture.root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH),
            `${JSON.stringify(changed, null, 2)}\n`,
            { mode: 0o644 },
          );
          return new Date(finalizedAt);
        },
      }),
      /changed before finalization/u,
    );
    const summary = JSON.parse(await readFile(
      path.join(fixture.root, PHASE2_VISUAL_SUMMARY_PATH),
      "utf8",
    ));
    assert.equal(summary.status, "pending-review");
    assert.equal(summary.checks.originalDimensionsInspected, false);
  } finally {
    await run.catch(() => undefined);
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("visual runner arguments lock JSON reporting and zero retries", async () => {
  const fixture = await createTemporaryRoot();
  try {
    const context = await loadPhase2VisualEvidenceContext({ root: fixture.root });
    const argumentsList = phase2VisualPlaywrightArguments(context.grep);
    assert.deepEqual(argumentsList.slice(1), [
      "test",
      "--config",
      "playwright.v2.config.ts",
      "--grep",
      context.grep,
      "--reporter=json",
      "--retries=0",
      "--workers=1",
    ]);
    for (const gateId of PHASE2_VISUAL_GATE_IDS) assert.match(context.grep, new RegExp(gateId, "u"));
    for (const supportTag of PHASE2_VISUAL_SUPPORT_TAGS) {
      assert.match(context.grep, new RegExp(supportTag, "u"));
    }
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

const assertSyntheticFailure = async ({ imageOptions, mutateReport, pattern }) => {
  const { fixture, run } = await runSyntheticBuilder({
    imageOptions,
    mutateReport,
  });
  try {
    await assert.rejects(run, pattern);
    await assert.rejects(
      readFile(path.join(fixture.root, PHASE2_VISUAL_SUMMARY_PATH)),
      { code: "ENOENT" },
    );
  } finally {
    await run.catch(() => undefined);
    await rm(fixture.root, { force: true, recursive: true });
  }
};

test("rejects a missing manifest image", async () => {
  await assertSyntheticFailure({
    imageOptions: { omitId: "overview--light--desktop" },
    pattern: /inventory is missing/u,
  });
});

test("rejects a JPEG with the wrong original dimensions", async () => {
  await assertSyntheticFailure({
    imageOptions: { wrongDimensionId: "plan--dark--tablet" },
    pattern: /dimensions are invalid/u,
  });
});

test("rejects duplicate review-image hashes", async () => {
  await assertSyntheticFailure({
    imageOptions: {
      duplicatePair: [
        "overview--light--desktop",
        "overview--dark--desktop",
      ],
    },
    pattern: /hash is duplicated/u,
  });
});

test("rejects a missing visual support tag", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const index = report.suites[0].specs.findIndex((spec) => (
        spec.tags.includes("e2e:phase2-visual-overflow")
      ));
      report.suites[0].specs.splice(index, 1);
      report.stats.expected -= 1;
    },
    pattern: /missing support tests/u,
  });
});

test("rejects a missing visual fact annotation", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const spec = report.suites[0].specs.find((candidate) => (
        candidate.tags.includes("e2e:phase2-reduced-motion")
      ));
      spec.tests[0].annotations = [];
    },
    pattern: /exactly one phase2-reduced-motion-facts annotation/u,
  });
});

test("rejects non-zero route clipping facts", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const spec = report.suites[0].specs.find((candidate) => (
        candidate.tags.includes("e2e:phase2-visual-route-plan")
      ));
      const annotation = spec.tests[0].annotations[0];
      const facts = JSON.parse(annotation.description);
      facts.clippedElementCount = 1;
      annotation.description = JSON.stringify(facts);
    },
    pattern: /failed checks/u,
  });
});

test("rejects a non-zero multilingual overflow fact", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const spec = report.suites[0].specs.find((candidate) => (
        candidate.tags.includes("e2e:phase2-visual-overflow")
      ));
      const annotation = spec.tests[0].annotations[0];
      const facts = JSON.parse(annotation.description);
      facts.cases[0].horizontalOverflowPx = 1;
      annotation.description = JSON.stringify(facts);
    },
    pattern: /failed checks/u,
  });
});

test("rejects reduced motion that leaves a long transition", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const spec = report.suites[0].specs.find((candidate) => (
        candidate.tags.includes("e2e:phase2-reduced-motion")
      ));
      const annotation = spec.tests[0].annotations[0];
      const facts = JSON.parse(annotation.description);
      facts.maxTransitionDurationMs = 200;
      annotation.description = JSON.stringify(facts);
    },
    pattern: /failed checks/u,
  });
});

test("rejects an extra visual gate spec", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      report.suites[0].specs.push(specFor("visual:extra:light-dark"));
      report.stats.expected += 1;
    },
    pattern: /extra executed spec/u,
  });
});

test("rejects duplicate visual gate ownership", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      report.suites[0].specs.push(specFor(PHASE2_VISUAL_GATE_IDS[0]));
      report.stats.expected += 1;
    },
    pattern: /duplicate gate/u,
  });
});

test("rejects skipped visual evidence", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      const testResult = report.suites[0].specs[0].tests[0];
      testResult.status = "skipped";
      testResult.results[0].status = "skipped";
      report.stats.expected -= 1;
      report.stats.skipped = 1;
    },
    pattern: /non-zero skipped count/u,
  });
});

test("rejects retried visual evidence even when the retry passes", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      report.suites[0].specs[0].tests[0].results.push(passedResult(1));
    },
    pattern: /retried test/u,
  });
});

test("rejects flaky visual evidence", async () => {
  await assertSyntheticFailure({
    mutateReport: (report) => {
      report.suites[0].specs[0].tests[0].status = "flaky";
      report.stats.expected -= 1;
      report.stats.flaky = 1;
    },
    pattern: /non-zero flaky count/u,
  });
});
