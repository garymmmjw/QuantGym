import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PHASE0_EXPECTATIONS,
  PHASE0_NESTED_GATES,
  buildPhase0Summary,
  extractReviewFindings,
  readPhase0FileRecord,
  renderPhase0ReviewPacket,
  validatePhase0Evidence,
  verifyPreviewGitState,
  writePhase0Outputs,
} from "../scripts/check-frontend-upgrade-phase0.mjs";
import { APPROVED_ACCEPTANCE_POLICY } from "../scripts/lib/frontend-upgrade-approved-acceptance.mjs";
import {
  BASELINE_VIEWPORTS,
  FRONTEND_UPGRADE_ROUTE_FIXTURES,
  SHARED_STATE_CAPTURE_INVENTORY,
  buildCaptureCases,
  buildPerformanceCases,
} from "../scripts/lib/frontend-upgrade-baseline.mjs";
import { buildAcceptanceCatalog } from "../scripts/lib/frontend-upgrade-contracts.mjs";
import { MODULE_OWNERSHIP } from "../src/modules/ownership.js";

const SHA = "a".repeat(64);
const FINGERPRINT = "b".repeat(64);
const COMMIT = "c".repeat(40);
const NOW = Date.parse("2026-07-17T04:00:00.000Z");
const PREVIEW_BRANCH = "codex/frontend-v2-preview";
const EXPECTED_PREVIEW_RUNTIME_FILES = Object.freeze([
  "scripts/build-frontend-upgrade-preview-web.mjs",
  "scripts/check-frontend-upgrade-preview-live.mjs",
  "scripts/check-frontend-upgrade-preview-postgres.py",
  "scripts/check-frontend-upgrade-preview-r2.mjs",
  "scripts/serve-frontend-upgrade-preview-probe.mjs",
]);
const SURFACE_CONTRACT = JSON.parse(readFileSync(
  new URL("../docs/frontend-upgrade/surface-contracts.json", import.meta.url),
  "utf8",
));
const ROUTE_CASES = buildCaptureCases();
const CURRENT_SHARED = SHARED_STATE_CAPTURE_INVENTORY.filter(
  (item) => item.expectedStatus === "current-capture",
);
const FUTURE_SHARED = SHARED_STATE_CAPTURE_INVENTORY.filter(
  (item) => item.expectedStatus === "future-gate",
);
const PERFORMANCE_CASES = buildPerformanceCases(FRONTEND_UPGRADE_ROUTE_FIXTURES);
const INTERACTION_NAMES = [...new Set(
  MODULE_OWNERSHIP.flatMap((item) => item.browserSmokeInteractions || []),
)];

function record(filePath, {
  requireTracked = true,
  gitTracked = true,
  mode = 0o100644,
} = {}) {
  return {
    path: filePath,
    repoPath: filePath,
    expectedBytes: 10,
    actualBytes: 10,
    expectedSha256: SHA,
    actualSha256: SHA,
    pathApproved: true,
    regularFile: true,
    realpathContained: true,
    symbolicLink: false,
    requireTracked,
    gitTracked,
    mode,
  };
}

function visualCase(item) {
  return {
    id: item.id,
    kind: item.kind,
    routeId: item.routeId,
    surfaceId: item.surfaceId,
    path: item.path,
    theme: item.theme,
    viewport: { ...item.viewport },
    acceptanceIds: [...item.acceptanceIds],
    selectors: {
      targets: [...item.selectors],
      title: item.titleSelector,
      primaryAction: item.primaryActionSelector,
    },
    status: "captured",
  };
}

function currentSharedCase(item) {
  return {
    id: item.id,
    kind: "shared-state",
    surfaceId: item.surfaceId,
    path: item.path,
    theme: item.theme,
    viewport: { ...BASELINE_VIEWPORTS[item.viewportId] },
    acceptanceIds: [...item.acceptanceIds],
    selectors: {
      expected: item.expected.selector,
      title: item.titleSelector,
      primaryAction: item.primaryActionSelector,
    },
    status: "captured",
  };
}

function futureSharedGate(item) {
  return {
    id: item.id,
    surfaceId: item.surfaceId,
    state: item.state,
    status: "future-gate",
    targetPhase: 1,
    targetCommand: item.targetCommand,
    screenshotClaim: false,
    acceptanceIds: [...item.acceptanceIds],
  };
}

function performanceCase(item) {
  return {
    id: item.id,
    routeId: item.routeId,
    surfaceId: item.surfaceId,
    path: item.path,
    theme: item.theme,
    viewport: { ...item.viewport },
    coldContext: true,
    status: "captured",
    metrics: { labInteractionLabel: item.labInteraction.label },
  };
}

function previewGit() {
  return Object.fromEntries([
    "worktreeClean", "originUrlExact", "currentBranchExact", "localBranchExists",
    "originBranchContainsCommit", "remoteBranchExact", "deployedCommitAncestorOfHead",
    "descendantChangesRestricted", "replaceRefsAbsent", "graftsAbsent", "indexFlagsSafe",
    "runtimeFilesMatchExpectedCommit",
  ].map((key) => [key, true]));
}

function localPreviewGit() {
  return Object.fromEntries([
    "trustedExecutable", "originUrlExact", "currentBranchExact",
    "localBranchExists", "expectedCommitExists", "originBranchContainsCommit",
    "originBranchExact", "remoteBranchExact", "deployedCommitAncestorOfHead", "descendantChangesRestricted",
    "replaceRefsAbsent", "graftsAbsent", "indexFlagsSafe", "runtimeFilesMatchExpectedCommit",
  ].map((key) => [key, true]));
}

function fixtureGit(root, args) {
  const result = spawnSync("/usr/bin/git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    env: {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  assert.equal(
    result.status,
    0,
    `fixture Git failed: git ${args.join(" ")}\n${result.stderr || result.stdout}`,
  );
  return result.stdout;
}

function validEvidence() {
  const routeIds = [...PHASE0_EXPECTATIONS.routeIds];
  const referencedDesignFiles = [...new Set([
    ...SURFACE_CONTRACT.surfaces.flatMap((item) => item.designFiles || []),
    ...SURFACE_CONTRACT.supportingSources.map((item) => item.file),
  ])];
  const visualReview = Array.from({ length: 23 }, (_, index) => ({
    path: `docs/browser-audit-screenshots/370-frontend-upgrade-review/route-${index}.jpg`,
  }));
  const sharedReview = Array.from({ length: 6 }, (_, index) => ({
    path: `docs/browser-audit-screenshots/370-frontend-upgrade-review/shared-${index}.jpg`,
  }));
  return {
    reviewStatus: "ready-for-review",
    loadFailures: [],
    manifestRouteIds: routeIds,
    contractRouteIds: routeIds,
    systemSurfaceIds: [...PHASE0_EXPECTATIONS.systemSurfaceIds],
    surfaceContract: structuredClone(SURFACE_CONTRACT),
    acceptanceCatalog: buildAcceptanceCatalog(SURFACE_CONTRACT),
    designSources: referencedDesignFiles.map((item) => record(item)),
    referencedDesignFiles,
    productionAssetManifest: record("assets/generated/playful-precision/manifest.json"),
    productionAssets: Array.from({ length: 36 }, (_, index) => record(
      `assets/generated/playful-precision/asset-${index}.png`,
    )),
    reviewImages: [...visualReview, ...sharedReview].map((item) => record(item.path)),
    canonicalDistRuntimeFingerprint: FINGERPRINT,
    legacyAllowlist: {
      findings: [{ path: "historical-league.json", message: "^missing League evidence$" }],
    },
    nestedCommands: PHASE0_NESTED_GATES.map((gate) => ({
      id: gate.id,
      status: "pass",
      exitCode: 0,
      stdout: "pass",
      stderr: "",
    })),
    runtimeMascot: {
      status: "pass",
      logicalAssets: 16,
      masters: 16,
      variants: 48,
      manifest: {
        schemaVersion: 1,
        kind: "quanty-runtime-assets",
        variantWidths: [160, 320, 640],
        sourceDesignManifest: { assetCount: 36 },
        assets: Array.from({ length: 16 }, (_, index) => ({
          logicalName: `quanty-${index}`,
          variants: [160, 320, 640].map((width) => ({ width })),
        })),
      },
      sourceDesignManifestRecord: record("assets/generated/playful-precision/manifest.json"),
      fileRecords: Array.from({ length: 64 }, (_, index) => record(
        `assets/generated/playful-precision/quanty-${index}`,
      )),
    },
    summaries: {
      core: {
        status: "pass",
        build: { distRuntimeFingerprint: FINGERPRINT },
        routes: {
          checked: 22,
          passed: 22,
          failed: 0,
          results: routeIds.map((id) => ({ id, status: "pass" })),
        },
        interactions: {
          checked: 68,
          passed: 68,
          failed: 0,
          results: INTERACTION_NAMES.map((name) => ({ name, status: "pass" })),
        },
        coreFlows: {
          namedInteractions: { expected: 68, checked: 68, passed: 68, failed: 0 },
          unauthenticatedAuth: { expected: 1, checked: 1, passed: 1, failed: 0 },
          totalCoreFlows: { expected: 69, checked: 69, passed: 69, failed: 0 },
        },
        failures: [],
      },
      visual: {
        status: "captured-with-findings",
        filteredRun: false,
        expectedCaptures: 150,
        captures: { checked: 150, succeeded: 150, failed: 0 },
        metadata: { distRuntimeFingerprint: FINGERPRINT },
        cases: ROUTE_CASES.map(visualCase),
        findings: [],
        captureFailures: [],
        reviewImages: visualReview,
        reviewManifest: { expected: 23, generated: 23 },
      },
      shared: {
        status: "captured-with-findings",
        filteredRun: false,
        expectedCurrentCaptures: 26,
        expectedFutureGates: 6,
        currentCaptures: { checked: 26, succeeded: 26, failed: 0 },
        metadata: { distRuntimeFingerprint: FINGERPRINT },
        currentCases: CURRENT_SHARED.map(currentSharedCase),
        futureGates: FUTURE_SHARED.map(futureSharedGate),
        findings: [],
        captureFailures: [],
        reviewImages: sharedReview,
        reviewManifest: { expected: 6, generated: 6 },
      },
      performance: {
        status: "captured-with-findings",
        filteredRun: false,
        expectedRuns: 12,
        runs: { checked: 12, succeeded: 12, failed: 0 },
        metadata: { distRuntimeFingerprint: FINGERPRINT },
        results: PERFORMANCE_CASES.map(performanceCase),
        findings: [],
        captureFailures: [],
        bundle: { chunks: [] },
      },
      legacy: {
        status: "expected-legacy-findings",
        rawCommandExit: 1,
        findings: [{ path: "historical-league.json", message: "missing League evidence" }],
      },
      preview: {
        schemaVersion: 1,
        status: "pass",
        checkedAt: "2026-07-17T03:00:00.000Z",
        evidenceCapturedAt: "2026-07-17T02:59:00.000Z",
        evidenceExpiresAt: "2026-07-24T02:59:00.000Z",
        branch: PREVIEW_BRANCH,
        resourceIsolation: "pass",
        applicationBindings: "deferred-to-phase1",
        providerEvidenceSha256: SHA,
        minimalWebArtifactSha256: FINGERPRINT,
        hashes: {
          webOriginHash: SHA,
          apiOriginHash: SHA,
          cloudflareAccountIdHash: SHA,
          pagesProjectIdHash: SHA,
          renderWorkspaceIdHash: SHA,
          postgresResourceIdHash: SHA,
          r2BucketIdentityHash: SHA,
        },
        git: previewGit(),
        checks: {
          minimalWebArtifactMatches: true,
          exactWebConfiguration: true,
          apiHealthAndInternalLlmVerified: true,
          previewOnlyCors: true,
          providerEvidenceFresh: true,
          providerIdentitiesDisjoint: true,
          postgresIsolation: true,
          r2Isolation: true,
        },
        postgres: {
          schemaVersion: 1,
          check: "frontend-v2-preview-postgres",
          status: "pass",
          evidenceSha256: SHA,
          publicBaseTableCount: 0,
        },
        r2: {
          schemaVersion: 1,
          check: "frontend-v2-preview-r2",
          status: "pass",
          evidenceSha256: SHA,
        },
      },
    },
    previewVerification: {
      providerEvidenceRecord: record(
        "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json",
        { requireTracked: false, gitTracked: false, mode: 0o100600 },
      ),
      providerChecks: Object.fromEntries([
        "schemaVersionExact", "topLevelShapeExact", "pagesShapeExact", "branchExact",
        "commitValid", "captureTimeExact", "deploymentPassed", "providerFileOwnerOnly",
        "providerFileUntracked",
      ].map((key) => [key, true])),
      expectedCommit: COMMIT,
      expectedBranch: PREVIEW_BRANCH,
      providerCapturedAt: "2026-07-17T02:59:00.000Z",
      minimalWebArtifactSha256: FINGERPRINT,
      git: localPreviewGit(),
    },
  };
}

function failuresFor(mutator) {
  const evidence = validEvidence();
  mutator(evidence);
  return validatePhase0Evidence(evidence, { nowMs: NOW });
}

test("accepts the exact canonical Phase 0 fixture and emits ready-for-review, never accepted", () => {
  const evidence = validEvidence();
  assert.deepEqual(validatePhase0Evidence(evidence, { nowMs: NOW }), []);
  const summary = buildPhase0Summary(evidence, { nowMs: NOW });
  assert.equal(summary.status, "ready-for-review");
  assert.equal(summary.routeVisualA11yCases, 150);
  assert.equal(summary.sharedStateCases, 26);
  assert.equal(summary.performanceRuns, 12);
  assert.deepEqual(summary.failures, []);
  const accepted = buildPhase0Summary(evidence, { nowMs: NOW, reviewStatus: "accepted" });
  assert.equal(accepted.status, "not-ready");
  assert.match(accepted.failures.join("\n"), /never accepted/);
});

test("package scripts expose the exact aggregate test and checker commands", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(
    packageJson.scripts["test:frontend-upgrade:phase0"],
    "node --test tests/frontend-upgrade-contracts.test.mjs tests/frontend-v2-boundaries.test.mjs tests/browser-route-targets.test.mjs tests/build-static-site-isolation.test.mjs tests/frontend-upgrade-baseline.test.mjs tests/frontend-upgrade-legacy-findings.test.mjs tests/frontend-upgrade-preview-contracts.test.mjs tests/frontend-upgrade-preview-probe.test.mjs tests/frontend-upgrade-preview-live.test.mjs tests/frontend-upgrade-phase0.test.mjs && python3 -B -m unittest discover -s tests -p 'test_*.py' -v",
  );
  assert.equal(packageJson.scripts["check:frontend-upgrade:phase0"], "node scripts/check-frontend-upgrade-phase0.mjs");
});

test("rejects route, system-surface, and source inventory substitutions", () => {
  assert.match(failuresFor((e) => e.manifestRouteIds[0] = "substitute").join("\n"), /MODULE_MANIFEST routes mismatch/);
  assert.match(failuresFor((e) => e.systemSurfaceIds[0] = "system:substitute").join("\n"), /system surfaces mismatch/);
  assert.match(failuresFor((e) => e.referencedDesignFiles[0] = "missing.html").join("\n"), /referenced design file is missing/);
  assert.match(failuresFor((e) => e.designSources[0].actualSha256 = "d".repeat(64)).join("\n"), /design source SHA-256 mismatch/);
});

test("rejects visual case ID, surface, selector, acceptance, and catalog locator substitution", () => {
  assert.match(failuresFor((e) => e.summaries.visual.cases[0].id = e.summaries.visual.cases[1].id).join("\n"), /exact case IDs mismatch/);
  assert.match(failuresFor((e) => e.summaries.visual.cases[0].surfaceId = "route:plan").join("\n"), /surfaceId mismatch/);
  assert.match(failuresFor((e) => e.summaries.visual.cases[0].selectors.targets = ["#fake"]).join("\n"), /selectors mismatch/);
  assert.match(failuresFor((e) => e.summaries.visual.cases[0].acceptanceIds[0] = "acceptance:fake").join("\n"), /acceptanceIds mismatch/);
  assert.match(failuresFor((e) => {
    const id = e.summaries.visual.cases[0].acceptanceIds[0];
    e.acceptanceCatalog.entries.find((item) => item.id === id).phase0Evidence.locator = "cases[fake]";
  }).join("\n"), /acceptance catalog|acceptance locator mismatch/);
});

test("rejects current and future shared-state substitutions", () => {
  assert.match(failuresFor((e) => e.summaries.shared.currentCases[0].id = e.summaries.shared.currentCases[1].id).join("\n"), /exact current IDs mismatch/);
  assert.match(failuresFor((e) => e.summaries.shared.currentCases[0].surfaceId = "system:todo").join("\n"), /surfaceId mismatch/);
  assert.match(failuresFor((e) => e.summaries.shared.currentCases[0].acceptanceIds = ["acceptance:fake"]).join("\n"), /acceptanceIds mismatch/);
  assert.match(failuresFor((e) => e.summaries.shared.futureGates[0].targetCommand = "npm run fake").join("\n"), /targetCommand mismatch/);
});

test("rejects core interaction substitutions, duplicates, failed routes, and catalog result locators", () => {
  assert.match(failuresFor((e) => e.summaries.core.interactions.results[0].name = "fake interaction").join("\n"), /exact interaction names mismatch/);
  assert.match(failuresFor((e) => e.summaries.core.interactions.results[0].name = e.summaries.core.interactions.results[1].name).join("\n"), /duplicates/);
  assert.match(failuresFor((e) => e.summaries.core.routes.results[0].status = "fail").join("\n"), /route did not pass/);
  assert.match(failuresFor((e) => {
    const flow = APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows[0];
    e.acceptanceCatalog.entries.find((item) => item.id === flow.acceptanceId)
      .phase0Evidence.resultLocator = "interactions.results[fake]";
  }).join("\n"), /acceptance catalog|core-flow acceptance locator mismatch/);
});

test("rejects performance ID, surface, and lab-interaction substitutions with one count failure", () => {
  assert.match(failuresFor((e) => e.summaries.performance.results[0].id = e.summaries.performance.results[1].id).join("\n"), /exact run IDs mismatch/);
  assert.match(failuresFor((e) => e.summaries.performance.results[0].surfaceId = "route:overview").join("\n"), /surfaceId mismatch/);
  assert.match(failuresFor((e) => e.summaries.performance.results[0].metrics.labInteractionLabel = "fake").join("\n"), /lab interaction locator mismatch/);
  const countFailures = failuresFor((e) => e.summaries.performance.runs.checked = 11)
    .filter((message) => message.includes("exactly 12 successful runs"));
  assert.equal(countFailures.length, 1);
});

test("rejects stale runtime fingerprints, unexpected legacy findings, and nested gate drift", () => {
  assert.match(failuresFor((e) => e.summaries.performance.metadata.distRuntimeFingerprint = "d".repeat(64)).join("\n"), /stale canonical dist runtime fingerprint/);
  assert.match(failuresFor((e) => e.summaries.legacy.findings.push({ path: "new.json", message: "new regression" })).join("\n"), /unexpected legacy UI-contract finding/);
  assert.match(failuresFor((e) => e.nestedCommands[2].exitCode = 1).join("\n"), /nested command failed/);
  assert.match(failuresFor((e) => e.runtimeMascot.variants = 47).join("\n"), /variant count must be 48/);
});

test("rejects Preview schema, branch, provider SHA, commit, timestamps, probe, and local Git drift", () => {
  assert.match(failuresFor((e) => e.summaries.preview.schemaVersion = 2).join("\n"), /schemaVersion/);
  assert.match(failuresFor((e) => e.summaries.preview.branch = "main").join("\n"), /branch/);
  assert.match(failuresFor((e) => e.summaries.preview.providerEvidenceSha256 = "d".repeat(64)).join("\n"), /provider evidence|SHA-256 bound/i);
  assert.match(failuresFor((e) => e.previewVerification.expectedCommit = "not-a-commit").join("\n"), /deployment commit/);
  assert.match(failuresFor((e) => e.summaries.preview.evidenceCapturedAt = "2026-07-17T02:59:00Z").join("\n"), /valid ISO|capture timestamp/);
  assert.match(failuresFor((e) => e.previewVerification.minimalWebArtifactSha256 = "d".repeat(64)).join("\n"), /deterministic rebuild/);
  assert.match(failuresFor((e) => e.previewVerification.git.originBranchExact = false).join("\n"), /originBranchExact/);
  assert.match(failuresFor((e) => e.previewVerification.git.remoteBranchExact = false).join("\n"), /remoteBranchExact/);
  assert.match(failuresFor((e) => e.previewVerification.providerChecks.pagesShapeExact = false).join("\n"), /pagesShapeExact/);
  assert.match(failuresFor((e) => e.summaries.preview.extra = true).join("\n"), /summary keys mismatch/);
});

test("rejects unapproved, symlinked, escaping, or untracked file evidence", () => {
  assert.match(failuresFor((e) => e.designSources[0].pathApproved = false).join("\n"), /outside its approved/);
  assert.match(failuresFor((e) => e.productionAssets[0].symbolicLink = true).join("\n"), /non-symlink/);
  assert.match(failuresFor((e) => e.productionAssets[0].realpathContained = false).join("\n"), /realpath escapes/);
  assert.match(failuresFor((e) => e.designSources[0].gitTracked = false).join("\n"), /design source must be tracked by Git/);
  assert.match(failuresFor((e) => e.productionAssetManifest.gitTracked = false).join("\n"), /production asset manifest must be tracked by Git/);
  assert.match(failuresFor((e) => e.productionAssets[0].gitTracked = false).join("\n"), /production asset must be tracked by Git/);
  assert.match(failuresFor((e) => e.runtimeMascot.sourceDesignManifestRecord.gitTracked = false).join("\n"), /runtime mascot source design manifest must be tracked by Git/);
  assert.match(failuresFor((e) => e.runtimeMascot.fileRecords[0].gitTracked = false).join("\n"), /runtime mascot asset must be tracked by Git/);
  assert.match(failuresFor((e) => e.reviewImages[0].gitTracked = false).join("\n"), /tracked by Git/);
  assert.match(failuresFor((e) => e.previewVerification.providerEvidenceRecord.gitTracked = true).join("\n"), /provider evidence must remain untracked/);
  assert.match(failuresFor((e) => e.previewVerification.providerEvidenceRecord.mode = 0o100644).join("\n"), /permissions must remain owner-only/);
});

test("secure file reader accepts a tracked approved regular file and rejects traversal and symlinks", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase0-file-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "approved"), { recursive: true });
  await writeFile(path.join(root, "approved", "asset.txt"), "safe", "utf8");
  await writeFile(path.join(root, "outside.txt"), "outside", "utf8");
  await symlink(path.join(root, "outside.txt"), path.join(root, "approved", "link.txt"));
  const bytes = Buffer.from("safe");
  const expectedSha256 = (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex");
  const safe = readPhase0FileRecord({
    root,
    relativePath: "approved/asset.txt",
    expected: { bytes: bytes.length, sha256: expectedSha256 },
    approvedPrefixes: ["approved/"],
    trackedFiles: new Set(["approved/asset.txt"]),
    requireTracked: true,
  });
  assert.equal(safe.readError, undefined);
  assert.equal(safe.pathApproved, true);
  assert.equal(safe.gitTracked, true);
  const traversal = readPhase0FileRecord({
    root,
    relativePath: "approved/../outside.txt",
    expected: { sha256: SHA },
    approvedPrefixes: ["approved/"],
  });
  assert.match(traversal.readError, /traversal|non-canonical/);
  const linked = readPhase0FileRecord({
    root,
    relativePath: "approved/link.txt",
    expected: { sha256: SHA },
    approvedPrefixes: ["approved/"],
  });
  assert.equal(linked.symbolicLink, true);
  assert.match(linked.readError, /non-symlink/);
});

test("local Preview Git verification permits dirty gate evidence but rejects every dirty runtime file", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase0-git-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  fixtureGit(root, ["init"]);
  fixtureGit(root, ["checkout", "-b", PREVIEW_BRANCH]);
  fixtureGit(root, ["remote", "add", "origin", "https://github.com/garymmmjw/QuantGym.git"]);

  const runtimeContents = new Map();
  for (const [index, relativePath] of EXPECTED_PREVIEW_RUNTIME_FILES.entries()) {
    const content = `runtime-${index}\n`;
    runtimeContents.set(relativePath, content);
    await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
    await writeFile(path.join(root, relativePath), content, "utf8");
  }
  const baselinePath = path.join(
    root,
    "docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json",
  );
  await mkdir(path.dirname(baselinePath), { recursive: true });
  await writeFile(baselinePath, "{\"status\":\"pass\"}\n", "utf8");
  fixtureGit(root, ["add", "--all"]);
  fixtureGit(root, [
    "-c", "user.name=Phase0 Test",
    "-c", "user.email=phase0@example.invalid",
    "-c", "commit.gpgsign=false",
    "commit", "-m", "fixture",
  ]);
  const expectedCommit = fixtureGit(root, ["rev-parse", "HEAD"]).trim();
  fixtureGit(root, ["update-ref", `refs/remotes/origin/${PREVIEW_BRANCH}`, expectedCommit]);
  const matchingRemoteRunner = (request) => {
    assert.equal(request.command, "/usr/bin/git");
    assert.equal(request.cwd, "/");
    assert.deepEqual(request.args, [
      "-c", "http.followRedirects=false",
      "ls-remote", "--exit-code", "https://github.com/garymmmjw/QuantGym.git",
      `refs/heads/${PREVIEW_BRANCH}`,
    ]);
    assert.equal(request.env.GIT_CONFIG_NOSYSTEM, "1");
    assert.equal(request.env.GIT_CONFIG_GLOBAL, "/dev/null");
    return {
      status: 0,
      stdout: `${expectedCommit}\trefs/heads/${PREVIEW_BRANCH}\n`,
      stderr: "",
    };
  };

  await writeFile(baselinePath, "{\"status\":\"fail\"}\n", "utf8");
  const uncommittedGatePath = path.join(root, "scripts/check-frontend-upgrade-phase0.mjs");
  await writeFile(uncommittedGatePath, "// uncommitted Task 11 gate\n", "utf8");
  assert.notEqual(fixtureGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]), "");

  const dirtyEvidenceVerification = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: matchingRemoteRunner,
  });
  assert.equal(Object.hasOwn(dirtyEvidenceVerification, "worktreeClean"), false);
  assert.deepEqual(
    Object.entries(dirtyEvidenceVerification).filter(([, value]) => value !== true),
    [],
  );

  for (const relativePath of EXPECTED_PREVIEW_RUNTIME_FILES) {
    await writeFile(path.join(root, relativePath), `${runtimeContents.get(relativePath)}dirty\n`, "utf8");
    const runtimeDirtyVerification = verifyPreviewGitState(root, expectedCommit, {
      remoteRunner: matchingRemoteRunner,
    });
    assert.equal(
      runtimeDirtyVerification.runtimeFilesMatchExpectedCommit,
      false,
      `${relativePath} local drift must fail Preview runtime verification`,
    );
    await writeFile(path.join(root, relativePath), runtimeContents.get(relativePath), "utf8");
  }

  const mismatchedRemote = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: () => ({
      status: 0,
      stdout: `${"d".repeat(40)}\trefs/heads/${PREVIEW_BRANCH}\n`,
      stderr: "",
    }),
  });
  assert.equal(mismatchedRemote.originBranchExact, true);
  assert.equal(mismatchedRemote.remoteBranchExact, false);
  const canonicalRemoteLine = `${expectedCommit}\trefs/heads/${PREVIEW_BRANCH}`;
  for (const paddedOutput of [
    ` ${canonicalRemoteLine}\n`,
    `\n${canonicalRemoteLine}\n`,
    `\t${canonicalRemoteLine}\n`,
    `${canonicalRemoteLine} \n`,
    `${canonicalRemoteLine}\t\n`,
    `${canonicalRemoteLine}\n\n`,
  ]) {
    const paddedRemote = verifyPreviewGitState(root, expectedCommit, {
      remoteRunner: () => ({
        status: 0,
        stdout: paddedOutput,
        stderr: "",
      }),
    });
    assert.equal(paddedRemote.remoteBranchExact, false);
  }
  const apiFallback = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: () => ({ status: 128, stdout: "", stderr: "git transport unavailable" }),
    remoteApiRunner: (request) => {
      assert.equal(request.command, "/usr/bin/curl");
      assert.equal(request.cwd, "/");
      assert.equal(request.args.includes("--location"), false);
      assert.equal(request.args.includes("Cache-Control: no-cache"), true);
      assert.equal(request.args.includes("Pragma: no-cache"), true);
      assert.deepEqual(
        request.args.slice(request.args.indexOf("--write-out"), request.args.indexOf("--write-out") + 2),
        ["--write-out", "\n%{http_code}"],
      );
      assert.equal(
        request.args.at(-1),
        "https://api.github.com/repos/garymmmjw/QuantGym/git/ref/heads/codex/frontend-v2-preview",
      );
      return {
        status: 0,
        stdout: `${JSON.stringify({
          ref: `refs/heads/${PREVIEW_BRANCH}`,
          object: { type: "commit", sha: expectedCommit },
        })}\n200`,
        stderr: "",
      };
    },
  });
  assert.equal(apiFallback.remoteBranchExact, true);
  const redirectedApiResponse = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: () => ({ status: 128, stdout: "", stderr: "network unavailable" }),
    remoteApiRunner: () => ({
      status: 0,
      stdout: `${JSON.stringify({
        ref: `refs/heads/${PREVIEW_BRANCH}`,
        object: { type: "commit", sha: expectedCommit },
      })}\n301`,
      stderr: "",
    }),
  });
  assert.equal(redirectedApiResponse.remoteBranchExact, false);
  const unavailableRemote = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: () => ({ status: 128, stdout: "", stderr: "network unavailable" }),
    remoteApiRunner: () => ({ status: 28, stdout: "", stderr: "timeout" }),
  });
  assert.equal(unavailableRemote.remoteBranchExact, false);
  const invalidApiResponse = verifyPreviewGitState(root, expectedCommit, {
    remoteRunner: () => ({ status: 128, stdout: "", stderr: "network unavailable" }),
    remoteApiRunner: () => ({
      status: 0,
      stdout: `${JSON.stringify({
        ref: `refs/heads/${PREVIEW_BRANCH}`,
        object: { type: "tag", sha: expectedCommit },
      })}\n200`,
      stderr: "",
    }),
  });
  assert.equal(invalidApiResponse.remoteBranchExact, false);
});

test("atomic output invalidates a stale ready review without leaving temporary files", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase0-output-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const summaryPath = path.join(root, "summary.json");
  const reviewPath = path.join(root, "review.md");
  await writeFile(reviewPath, "# Old\n\nStatus: ready-for-review\n", "utf8");
  const summary = { status: "not-ready", failures: ["new gate failure"] };
  const result = writePhase0Outputs({ evidence: {}, summary, summaryPath, reviewPath });
  assert.equal(result.reviewDisposition, "stale-review-invalidated");
  assert.equal(JSON.parse(await readFile(summaryPath, "utf8")).status, "not-ready");
  assert.match(await readFile(reviewPath, "utf8"), /Status: invalidated/);
  assert.deepEqual((await readdir(root)).filter((name) => name.endsWith(".tmp")), []);
});

test("atomic output preserves an accepted review on both ready and failing reruns", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase0-accepted-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const summaryPath = path.join(root, "summary.json");
  const reviewPath = path.join(root, "review.md");
  const accepted = "# Human decision\n\nStatus: accepted\n\nDo not overwrite.\n";
  await writeFile(reviewPath, accepted, "utf8");
  let result = writePhase0Outputs({
    evidence: validEvidence(),
    summary: buildPhase0Summary(validEvidence(), { nowMs: NOW }),
    summaryPath,
    reviewPath,
  });
  assert.equal(result.reviewDisposition, "accepted-preserved");
  assert.equal(await readFile(reviewPath, "utf8"), accepted);
  result = writePhase0Outputs({
    evidence: {},
    summary: { status: "not-ready", failures: ["failure"] },
    summaryPath,
    reviewPath,
  });
  assert.equal(result.reviewDisposition, "accepted-preserved");
  assert.equal(await readFile(reviewPath, "utf8"), accepted);
});

test("atomic output writes a ready packet with restrictive deterministic file modes", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quantgym-phase0-ready-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const summaryPath = path.join(root, "summary.json");
  const reviewPath = path.join(root, "review.md");
  const evidence = validEvidence();
  const summary = buildPhase0Summary(evidence, { nowMs: NOW });
  const result = writePhase0Outputs({ evidence, summary, summaryPath, reviewPath });
  assert.equal(result.reviewDisposition, "ready-written");
  assert.match(await readFile(reviewPath, "utf8"), /Status: ready-for-review/);
  assert.equal((await stat(summaryPath)).mode & 0o777, 0o644);
  assert.equal((await stat(reviewPath)).mode & 0o777, 0o644);
  assert.deepEqual((await readdir(root)).filter((name) => name.endsWith(".tmp")), []);
});

test("review packet copies complete findings rather than replacing them with counts", () => {
  const evidence = validEvidence();
  evidence.summaries.visual.findings = [{
    id: "axe-one", kind: "axe", impact: "serious", nodes: [{ target: ["#cta"], failureSummary: "exact" }],
  }];
  evidence.summaries.shared.findings = [
    { id: "case:horizontal-overflow", kind: "layout", horizontalOverflowPx: 4 },
    { id: "case:hidden-primary-action", kind: "layout", severity: "quality" },
  ];
  evidence.summaries.performance.findings = [{ id: "budget", kind: "bundle", value: 200, target: 100 }];
  const findings = extractReviewFindings(evidence.summaries);
  assert.equal(findings.accessibility[0].nodes[0].failureSummary, "exact");
  assert.equal(findings.overflow[0].horizontalOverflowPx, 4);
  assert.equal(findings.hiddenActions[0].id, "case:hidden-primary-action");
  assert.equal(findings.performanceBudget[0].target, 100);
  const review = renderPhase0ReviewPacket(evidence, buildPhase0Summary(evidence, { nowMs: NOW }));
  for (const text of ["axe-one", "failureSummary", "horizontal-overflow", "hidden-primary-action", "budget", "historical-league.json"]) {
    assert.match(review, new RegExp(text));
  }
  assert.doesNotMatch(review, /Status: accepted/);
});
