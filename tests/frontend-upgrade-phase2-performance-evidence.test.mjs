import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPhase2PerformanceSummary,
  inspectPhase2Bundle,
  parsePhase2PerformanceReport,
  PHASE2_PERFORMANCE_SAMPLES_PER_CASE,
  PHASE2_PERFORMANCE_SUMMARY_PATH,
  phase2PerformanceBuildEnvironment,
  phase2PerformanceP75,
  phase2PerformancePlaywrightArguments,
  runPhase2PerformanceEvidenceBuilder,
  validatePhase2PerformanceSummary,
} from "../scripts/lib/frontend-upgrade-phase2-performance-evidence.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestRelativePath = "docs/frontend-upgrade/phase-2-acceptance-manifest.json";
const phase1LockRelativePath = "docs/frontend-upgrade/phase-1-evidence-lock.json";
const commit = "a".repeat(40);
const checkedAt = "2026-07-27T12:00:00.000Z";
const manifestHash = "b".repeat(64);
const phase1LockHash = "c".repeat(64);

const exactCases = [
  ["overview--desktop", "overview", "/", "desktop", 1_440, 900],
  ["overview--mobile", "overview", "/", "mobile", 390, 844],
  ["plan--desktop", "plan", "/plan", "desktop", 1_440, 900],
  ["plan--mobile", "plan", "/plan", "mobile", 390, 844],
  ["problems--desktop", "problems", "/problems", "desktop", 1_440, 900],
  ["problems--mobile", "problems", "/problems", "mobile", 390, 844],
];

const annotationFor = () => {
  const cases = exactCases.flatMap(([
    id,
    routeId,
    routePath,
    viewportId,
    width,
    height,
  ], index) => Array.from(
    { length: PHASE2_PERFORMANCE_SAMPLES_PER_CASE },
    (_, runIndex) => ({
    cls: 0.01 + index * 0.001,
    horizontalOverflowPx: 0,
    id,
    inpMs: 40 + index,
    inpSource: "event-timing",
    interaction: {
      eventTimingCandidateCount: 1,
      fallbackLatencyMs: 70 + index,
      kind: viewportId === "mobile"
        ? "mobile-more-button-click"
        : "theme-toggle-button-click",
      label: viewportId === "mobile" ? "更多" : "切换到深色主题",
    },
    lcpMs: 900 + index * 100,
    navigation: {
      domContentLoadedMs: 300 + index,
      durationMs: 350 + index,
      responseStartMs: 20 + index,
    },
    observers: {
      errors: [],
      eventTimingSupported: true,
      layoutShiftSupported: true,
      lcpSupported: true,
    },
    path: routePath,
    resources: {
      count: 12 + index,
      decodedBodyBytes: 20_000 + index,
    },
    run: runIndex + 1,
    routeId,
    viewport: { height, id: viewportId, width },
    }),
  ));
  const caseMetrics = exactCases.map(([id]) => {
    const samples = cases.filter((entry) => entry.id === id);
    return {
      cls: phase2PerformanceP75(samples.map((entry) => entry.cls)),
      horizontalOverflowPx: Math.max(
        0,
        ...samples.map((entry) => entry.horizontalOverflowPx),
      ),
      id,
      inpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.inpMs)),
      lcpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.lcpMs)),
      sampleCount: PHASE2_PERFORMANCE_SAMPLES_PER_CASE,
    };
  });
  return {
    caseMetrics,
    cases,
    kind: "phase2-performance-samples",
    metrics: {
      cls: Math.max(...caseMetrics.map((entry) => entry.cls)),
      horizontalOverflowPx: 0,
      inpP75Ms: Math.max(...caseMetrics.map((entry) => entry.inpP75Ms)),
      lcpP75Ms: Math.max(...caseMetrics.map((entry) => entry.lcpP75Ms)),
    },
    sampleCount: cases.length,
    samplesPerCase: PHASE2_PERFORMANCE_SAMPLES_PER_CASE,
    schemaVersion: 1,
  };
};

const recomputeAnnotationMetrics = (annotation) => {
  annotation.caseMetrics = exactCases.map(([id]) => {
    const samples = annotation.cases.filter((entry) => entry.id === id);
    return {
      cls: phase2PerformanceP75(samples.map((entry) => entry.cls)),
      horizontalOverflowPx: Math.max(
        0,
        ...samples.map((entry) => entry.horizontalOverflowPx),
      ),
      id,
      inpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.inpMs)),
      lcpP75Ms: phase2PerformanceP75(samples.map((entry) => entry.lcpMs)),
      sampleCount: PHASE2_PERFORMANCE_SAMPLES_PER_CASE,
    };
  });
  annotation.metrics = {
    cls: Math.max(...annotation.caseMetrics.map((entry) => entry.cls)),
    horizontalOverflowPx: Math.max(
      0,
      ...annotation.caseMetrics.map((entry) => entry.horizontalOverflowPx),
    ),
    inpP75Ms: Math.max(...annotation.caseMetrics.map((entry) => entry.inpP75Ms)),
    lcpP75Ms: Math.max(...annotation.caseMetrics.map((entry) => entry.lcpP75Ms)),
  };
};

const passedResult = (retry = 0) => ({
  attachments: [],
  duration: 10,
  errors: [],
  retry,
  status: "passed",
  stderr: [],
  stdout: [],
});

const reportFor = (annotation = annotationFor()) => ({
  config: {
    projects: [{ id: "", name: "", retries: 0 }],
    reporter: [["json"]],
  },
  errors: [],
  stats: {
    expected: 1,
    flaky: 0,
    skipped: 0,
    unexpected: 0,
  },
  suites: [{
    specs: [{
      id: "phase2-performance",
      ok: true,
      tags: ["phase2:performance", "e2e:phase2-performance"],
      title: "@phase2:performance @e2e:phase2-performance synthetic",
      tests: [{
        annotations: [{
          description: JSON.stringify(annotation),
          type: "phase2-performance-metrics",
        }],
        expectedStatus: "passed",
        projectId: "",
        projectName: "",
        results: [passedResult()],
        status: "expected",
      }],
    }],
    suites: [],
    title: "synthetic",
  }],
});

const pseudoRandomSource = (minimumBytes) => {
  let source = "export default `";
  for (let index = 0; source.length < minimumBytes; index += 1) {
    source += createHash("sha256").update(`phase2-${index}`).digest("base64");
  }
  return `${source}` + "`;";
};

const createTemporaryRoot = async () => {
  const root = await mkdtemp(path.join(repositoryRoot, ".phase2-performance-test-"));
  await Promise.all([
    mkdir(path.join(root, "docs/frontend-upgrade"), { recursive: true }),
    mkdir(path.join(root, "docs/browser-audit-screenshots"), { recursive: true }),
  ]);
  const [manifestBytes, lockBytes] = await Promise.all([
    readFile(path.join(repositoryRoot, manifestRelativePath)),
    readFile(path.join(repositoryRoot, phase1LockRelativePath)),
  ]);
  await Promise.all([
    writeFile(path.join(root, manifestRelativePath), manifestBytes),
    writeFile(path.join(root, phase1LockRelativePath), lockBytes),
  ]);
  return { manifestBytes, root };
};

const writeSyntheticBuild = async ({
  buildCommit = commit,
  initialBytes = 2_000,
  root,
  routeBytes = 3_000,
} = {}) => {
  const buildDirectory = path.join(root, "dist-v2");
  await mkdir(path.join(buildDirectory, "assets"), { recursive: true });
  const files = new Map([
    ["assets/entry.js", Buffer.from(pseudoRandomSource(initialBytes))],
    ["assets/route.js", Buffer.from(pseudoRandomSource(routeBytes))],
    ["index.html", Buffer.from(
      '<div id="root"></div><script type="module" src="/assets/entry.js"></script>',
    )],
    ["version.json", Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      branch: "codex/frontend-v2-preview",
      commit: buildCommit,
      source: "test",
    })}\n`)],
  ]);
  for (const [relativePath, bytes] of files) {
    await writeFile(path.join(buildDirectory, relativePath), bytes);
  }
  const assets = {};
  for (const [relativePath, bytes] of files) {
    assets[relativePath] = {
      bytes: bytes.length,
      integrity: `sha384-${createHash("sha384").update(bytes).digest("base64")}`,
    };
  }
  await writeFile(
    path.join(buildDirectory, "asset-integrity.json"),
    `${JSON.stringify({ schemaVersion: 1, algorithm: "sha384", assets })}\n`,
  );
};

test("builds an exact performance summary from real gzip inventory and 24 samples", async () => {
  const fixture = await createTemporaryRoot();
  try {
    const result = await runPhase2PerformanceEvidenceBuilder({
      root: fixture.root,
      buildRunner: async ({ root }) => writeSyntheticBuild({ root }),
      commitResolver: async () => commit,
      now: () => new Date(checkedAt),
      reportRunner: async ({ grep }) => {
        assert.equal(grep.includes("e2e:phase2-performance"), true);
        return { exitCode: 0, report: reportFor() };
      },
    });
    assert.equal(result.outputPath, PHASE2_PERFORMANCE_SUMMARY_PATH);
    assert.equal(result.summary.check, "frontend-upgrade-phase2-performance");
    assert.deepEqual(result.summary.results, []);
    assert.deepEqual(result.summary.visualCases, []);
    assert.deepEqual(Object.values(result.summary.checks), [true, true, true]);
    assert.equal(result.summary.metrics.initialJsGzipBytes, result.bundle.initialJsGzipBytes);
    assert.equal(
      result.summary.metrics.largestRouteChunkGzipBytes,
      result.bundle.largestRouteChunkGzipBytes,
    );
    const written = JSON.parse(await readFile(
      path.join(fixture.root, PHASE2_PERFORMANCE_SUMMARY_PATH),
      "utf8",
    ));
    assert.deepEqual(written, result.summary);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("Playwright command locks JSON reporter, retries zero, and one worker", () => {
  const args = phase2PerformancePlaywrightArguments("phase2-performance-grep");
  assert.deepEqual(args.slice(1), [
    "test",
    "--config",
    "playwright.v2.config.ts",
    "--grep",
    "phase2-performance-grep",
    "--reporter=json",
    "--retries=0",
    "--workers=1",
  ]);

  const inheritedEnvironment = {
    CF_PAGES_BRANCH: "main",
    CF_PAGES_COMMIT_SHA: "f".repeat(40),
    PATH: "/fixture/bin",
    QUANTGYM_BUILD_BRANCH: "main",
    QUANTGYM_BUILD_COMMIT: "e".repeat(40),
    QUANTGYM_BUILD_SOURCE: "cloudflare-pages",
    SENTINEL: "preserved",
  };
  const buildEnvironment = phase2PerformanceBuildEnvironment(inheritedEnvironment);
  assert.equal(buildEnvironment.CF_PAGES_BRANCH, undefined);
  assert.equal(buildEnvironment.CF_PAGES_COMMIT_SHA, undefined);
  assert.equal(buildEnvironment.QUANTGYM_BUILD_COMMIT, undefined);
  assert.equal(buildEnvironment.QUANTGYM_BUILD_BRANCH, "codex/frontend-v2-preview");
  assert.equal(buildEnvironment.QUANTGYM_BUILD_SOURCE, "test");
  assert.equal(buildEnvironment.SENTINEL, "preserved");
  assert.equal(
    buildEnvironment.PATH,
    `${path.dirname(process.execPath)}:/fixture/bin`,
  );
  assert.deepEqual(inheritedEnvironment, {
    CF_PAGES_BRANCH: "main",
    CF_PAGES_COMMIT_SHA: "f".repeat(40),
    PATH: "/fixture/bin",
    QUANTGYM_BUILD_BRANCH: "main",
    QUANTGYM_BUILD_COMMIT: "e".repeat(40),
    QUANTGYM_BUILD_SOURCE: "cloudflare-pages",
    SENTINEL: "preserved",
  });
});

test("bundle inspection rejects an oversized initial JavaScript payload", async () => {
  const fixture = await createTemporaryRoot();
  try {
    await writeSyntheticBuild({ root: fixture.root, initialBytes: 500_000 });
    await assert.rejects(
      inspectPhase2Bundle({ root: fixture.root, expectedCommit: commit }),
      /initial JavaScript exceeds 184320/u,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("bundle inspection rejects an oversized ordinary route chunk", async () => {
  const fixture = await createTemporaryRoot();
  try {
    await writeSyntheticBuild({ root: fixture.root, routeBytes: 300_000 });
    await assert.rejects(
      inspectPhase2Bundle({ root: fixture.root, expectedCommit: commit }),
      /ordinary route chunk exceeds 102400/u,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

for (const [label, mutate, pattern] of [
  ["LCP", (annotation) => {
    annotation.cases.filter((entry) => (
      entry.id === "overview--desktop" && entry.run <= 3
    )).forEach((entry) => { entry.lcpMs = 2_501; });
    recomputeAnnotationMetrics(annotation);
  }, /LCP p75 exceeds/u],
  ["INP", (annotation) => {
    annotation.cases.filter((entry) => (
      entry.id === "overview--desktop" && entry.run <= 3
    )).forEach((entry) => { entry.inpMs = 201; });
    recomputeAnnotationMetrics(annotation);
  }, /INP p75 exceeds/u],
  ["CLS", (annotation) => {
    annotation.cases.filter((entry) => (
      entry.id === "overview--desktop" && entry.run <= 3
    )).forEach((entry) => { entry.cls = 0.11; });
    recomputeAnnotationMetrics(annotation);
  }, /CLS p75 exceeds/u],
  ["overflow", (annotation) => {
    annotation.cases[0].horizontalOverflowPx = 1;
    recomputeAnnotationMetrics(annotation);
  }, /horizontal overflow/u],
]) {
  test(`report parser rejects ${label} threshold failure`, () => {
    const annotation = annotationFor();
    mutate(annotation);
    assert.throws(
      () => parsePhase2PerformanceReport({ report: reportFor(annotation) }),
      pattern,
    );
  });
}

test("report parser rejects a sample without an Event Timing interaction candidate", () => {
  const missingCandidate = annotationFor();
  missingCandidate.cases[0].interaction.eventTimingCandidateCount = 0;
  missingCandidate.cases[0].observers.eventTimingSupported = false;
  missingCandidate.cases[0].inpMs = missingCandidate.cases[0].interaction.fallbackLatencyMs;
  recomputeAnnotationMetrics(missingCandidate);
  assert.throws(
    () => parsePhase2PerformanceReport({ report: reportFor(missingCandidate) }),
    /sample is invalid/u,
  );
});

for (const [label, mutate] of [
  ["skip", (report) => {
    report.stats.expected = 0;
    report.stats.skipped = 1;
    report.suites[0].specs[0].tests[0].status = "skipped";
    report.suites[0].specs[0].tests[0].results[0].status = "skipped";
  }],
  ["retry", (report) => {
    report.suites[0].specs[0].tests[0].results.push(passedResult(1));
  }],
  ["flake", (report) => {
    report.stats.expected = 0;
    report.stats.flaky = 1;
    report.suites[0].specs[0].tests[0].status = "flaky";
  }],
]) {
  test(`report parser rejects ${label}`, () => {
    const report = reportFor();
    mutate(report);
    assert.throws(
      () => parsePhase2PerformanceReport({ report }),
      /report envelope|skipped, retried, flaky, or failed/u,
    );
  });
}

test("performance parser rejects skip, todo, and xfail annotations", () => {
  for (const type of ["skip", "todo", "xfail", "xpass", "fixme", "pending"]) {
    const report = reportFor();
    report.suites[0].specs[0].tests[0].annotations.push({ type });
    assert.throws(
      () => parsePhase2PerformanceReport({ report }),
      /skipped, retried, flaky, or failed/u,
      type,
    );
  }
});

test("summary validation rejects stale timestamps and the wrong commit", () => {
  const summary = buildPhase2PerformanceSummary({
    bundle: { initialJsGzipBytes: 100, largestRouteChunkGzipBytes: 100 },
    checkedAt,
    commit,
    manifestSha256: manifestHash,
    performance: {
      cls: 0.01,
      horizontalOverflowPx: 0,
      inpP75Ms: 50,
      lcpP75Ms: 1_000,
    },
    phase1EvidenceLockSha256: phase1LockHash,
  });
  assert.throws(() => validatePhase2PerformanceSummary(summary, {
    expectedCommit: commit,
    manifestSha256: manifestHash,
    nowMs: Date.parse(checkedAt) + 8 * 24 * 60 * 60 * 1_000,
    phase1EvidenceLockSha256: phase1LockHash,
  }), /stale/u);
  assert.throws(() => validatePhase2PerformanceSummary(summary, {
    expectedCommit: "d".repeat(40),
    manifestSha256: manifestHash,
    nowMs: Date.parse(checkedAt),
    phase1EvidenceLockSha256: phase1LockHash,
  }), /envelope/u);
});

test("bundle inspection rejects a build from a different commit", async () => {
  const fixture = await createTemporaryRoot();
  try {
    await writeSyntheticBuild({ buildCommit: "d".repeat(40), root: fixture.root });
    await assert.rejects(
      inspectPhase2Bundle({ root: fixture.root, expectedCommit: commit }),
      /commit does not match/u,
    );
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});

test("builder rejects a manifest changed during capture", async () => {
  const fixture = await createTemporaryRoot();
  try {
    await assert.rejects(runPhase2PerformanceEvidenceBuilder({
      root: fixture.root,
      buildRunner: async ({ root }) => {
        await writeSyntheticBuild({ root });
        const manifest = JSON.parse(fixture.manifestBytes.toString("utf8"));
        await writeFile(
          path.join(root, manifestRelativePath),
          `${JSON.stringify(manifest, null, 2)}\n\n`,
        );
      },
      commitResolver: async () => commit,
      reportRunner: async () => ({ exitCode: 0, report: reportFor() }),
      writeSummary: false,
    }), /became stale/u);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
});
