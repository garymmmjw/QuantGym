import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as browserRouteTargets from "../scripts/lib/browser-route-targets.mjs";
import { MODULE_MANIFEST } from "../src/modules/manifest.js";

const { ROUTE_TARGETS } = browserRouteTargets;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("browser route targets cover the current manifest exactly", () => {
  assert.deepEqual(Object.keys(ROUTE_TARGETS).sort(), MODULE_MANIFEST.map((item) => item.id).sort());
});

test("dist runtime fingerprint is stable for provenance-only changes and creation order", () => {
  assert.equal(typeof browserRouteTargets.distRuntimeFingerprint, "function");
  assert.equal(typeof browserRouteTargets.readBuiltRuntimeProvenance, "function");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-dist-fingerprint-stable-"));
  try {
    const first = path.join(tempRoot, "first");
    const second = path.join(tempRoot, "second");
    writeDistFixture(first, {
      provenance: { buildCommit: "a".repeat(40), buildBranch: "first", buildSource: "local-git" }
    });
    writeDistFixture(second, {
      reverse: true,
      provenance: { buildCommit: "b".repeat(40), buildBranch: "second", buildSource: "github" }
    });
    assert.equal(
      browserRouteTargets.distRuntimeFingerprint(first),
      browserRouteTargets.distRuntimeFingerprint(second)
    );
    assert.deepEqual(browserRouteTargets.readBuiltRuntimeProvenance(second), {
      buildCommit: "b".repeat(40),
      buildBranch: "second",
      buildSource: "github"
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("built runtime provenance requires valid config/version agreement", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-dist-provenance-"));
  try {
    const valid = path.join(tempRoot, "valid");
    writeDistFixture(valid, {
      provenance: { buildCommit: "abcdef1", buildBranch: "codex/test", buildSource: "local-git" }
    });
    assert.deepEqual(browserRouteTargets.readBuiltRuntimeProvenance(valid), {
      buildCommit: "abcdef1",
      buildBranch: "codex/test",
      buildSource: "local-git"
    });

    const invalidCases = [
      ["missing config", (distDir) => fs.rmSync(path.join(distDir, "config.js")), /config\.js/i],
      ["malformed config", (distDir) => fs.writeFileSync(path.join(distDir, "config.js"), "window.QUANTGYM_CONFIG = {;\n"), /config/i],
      ["missing version", (distDir) => fs.rmSync(path.join(distDir, "version.json")), /version\.json/i],
      ["malformed version", (distDir) => fs.writeFileSync(path.join(distDir, "version.json"), "{\n"), /version/i],
      ["invalid commit", (distDir) => rewriteProvenance(distDir, { buildCommit: "not-a-commit" }), /commit/i],
      ["empty branch", (distDir) => rewriteProvenance(distDir, { buildBranch: "   " }), /branch/i],
      ["empty source", (distDir) => rewriteProvenance(distDir, { buildSource: "" }), /source/i],
      ["commit mismatch", (distDir) => rewriteVersion(distDir, { commit: "2".repeat(40) }), /commit.*mismatch/i],
      ["branch mismatch", (distDir) => rewriteVersion(distDir, { branch: "different" }), /branch.*mismatch/i],
      ["source mismatch", (distDir) => rewriteVersion(distDir, { source: "different" }), /source.*mismatch/i]
    ];
    for (const [name, mutate, errorPattern] of invalidCases) {
      const candidate = path.join(tempRoot, name.replaceAll(" ", "-"));
      writeDistFixture(candidate);
      mutate(candidate);
      assert.throws(
        () => browserRouteTargets.readBuiltRuntimeProvenance(candidate),
        errorPattern,
        name
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("restored-journey smoke uses stable selectors and exact mobile action geometry", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  assert.doesNotMatch(source, /\.qg-detail-bookmark/);
  assert.doesNotMatch(source, /\.company-overview-card/);
  assert.doesNotMatch(source, /#problemDetail \.problem-detail-actions \.primary-button/);
  assert.match(source, /#problemDetail \[data-problem-action=["']mock-interview["']\]/);
  assert.match(source, /#companyOverviewList \.company-list-row\[data-company-card\]/);
  assert.match(source, /\[data-company-detail=/);
  assert.match(source, /function expectMobileProblemActionLayout/);
  assert.match(source, /scrollWidth\s*<=\s*button\.clientWidth/);
  assert.match(source, /mockRect\.top\s*>=\s*Math\.max\(completeRect\.bottom, saveRect\.bottom\)/);
});

test("browser smoke preserves behavioral intent instead of visibility-only checks", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  assert.match(source, /\.problem-progress-panel button\[aria-label=["']打开题库["']\]/);
  assert.match(source, /function expectMarketCrossedQuoteFeedback/);
  assert.match(source, /function expectMarketScoredRoundFeedback/);
  assert.match(source, /function expectPkAnswerOutcome/);
  assert.match(source, /function expectPlanSetupValues/);
  assert.match(source, /globalThis\.quantProblemCatalog/);
  assert.match(source, /page\.locator\('\[data-problem-view="saved"\]'\)\.click/);
});

test("canonical smoke reports 68 named interactions plus one auth preflight", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const interactionBlock = source.slice(
    source.indexOf("const interactionChecks = ["),
    source.indexOf("const selectedInteractionChecks")
  );
  const names = [...interactionBlock.matchAll(/\["([^"]+)",\s*run[A-Za-z0-9_]+\]/g)].map((match) => match[1]);
  assert.equal(names.length, 68);
  assert.equal(new Set(names).size, 68);
  assert.match(source, /namedInteractions/);
  assert.match(source, /unauthenticatedAuth/);
  assert.match(source, /totalCoreFlows/);
  assert.match(source, /firstPartyResponse/);
  assert.match(source, /provenanceValidated/);
  assert.match(source, /reproducible/);
});

test("dist runtime fingerprint changes for every non-provenance path or byte change", () => {
  assert.equal(typeof browserRouteTargets.distRuntimeFingerprint, "function");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-dist-fingerprint-sensitive-"));
  try {
    const baselineDir = path.join(tempRoot, "baseline");
    writeDistFixture(baselineDir);
    const baseline = browserRouteTargets.distRuntimeFingerprint(baselineDir);
    const mutations = [
      ["runtime config", (distDir) => replaceInFile(path.join(distDir, "config.js"), "gpt-5-nano", "gpt-5-mini")],
      ["built HTML", (distDir) => fs.appendFileSync(path.join(distDir, "index.html"), "<!-- changed -->")],
      ["public file", (distDir) => fs.appendFileSync(path.join(distDir, "favicon.svg"), "<!-- changed -->")],
      ["JavaScript bundle", (distDir) => fs.appendFileSync(path.join(distDir, "assets/main.js"), "\nchanged();")],
      ["CSS bundle", (distDir) => fs.appendFileSync(path.join(distDir, "assets/main.css"), "\n.changed{}")],
      ["copied data", (distDir) => fs.appendFileSync(path.join(distDir, "data/problem-catalog.js"), "\nchanged")],
      ["generated binary asset", (distDir) => fs.appendFileSync(path.join(distDir, "assets/generated/badge.webp"), Buffer.from([0xff]))],
      ["nested version data", (distDir) => fs.appendFileSync(path.join(distDir, "data/version.json"), "\n")],
      ["provenance-like data", (distDir) => fs.appendFileSync(path.join(distDir, "data/problem-catalog.js"), "\n// buildCommit: changed")],
      ["file path", (distDir) => fs.renameSync(path.join(distDir, "assets/main.js"), path.join(distDir, "assets/renamed.js"))],
      ["additional file", (distDir) => fs.writeFileSync(path.join(distDir, "new-runtime.txt"), "new")]
    ];
    for (const [name, mutate] of mutations) {
      const candidate = path.join(tempRoot, name.replaceAll(" ", "-"));
      writeDistFixture(candidate);
      mutate(candidate);
      assert.notEqual(browserRouteTargets.distRuntimeFingerprint(candidate), baseline, name);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

function writeDistFixture(distDir, options = {}) {
  const provenance = options.provenance || {
    buildCommit: "1".repeat(40),
    buildBranch: "baseline",
    buildSource: "local-git"
  };
  const files = {
    "config.js": builtConfig(provenance),
    "version.json": `${JSON.stringify(options.version || versionFromProvenance(provenance))}\n`,
    "index.html": "<!doctype html><main>QuantGym</main>\n",
    "_redirects": "/* /index.html 200\n",
    "favicon.svg": "<svg><path d=\"M0 0\"/></svg>\n",
    "assets/main.js": "globalThis.quantgym = true;\n",
    "assets/main.css": "body{color:#111}\n",
    "assets/generated/badge.webp": Buffer.from([0x52, 0x49, 0x46, 0x46]),
    "data/problem-catalog.js": "window.PROBLEMS = [];\n",
    "data/version.json": "{\"catalog\":1}\n",
    "zh/index.html": "<!doctype html><html lang=\"zh-CN\"></html>\n"
  };
  const entries = Object.entries(files);
  if (options.reverse) entries.reverse();
  for (const [relativePath, contents] of entries) {
    const filePath = path.join(distDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
}

function versionFromProvenance(provenance) {
  return {
    commit: provenance.buildCommit,
    branch: provenance.buildBranch,
    source: provenance.buildSource
  };
}

function rewriteProvenance(distDir, changes) {
  const source = fs.readFileSync(path.join(distDir, "config.js"), "utf8");
  const match = source.match(/window\.QUANTGYM_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  assert.ok(match, "fixture config must parse");
  const config = { ...JSON.parse(match[1]), ...changes };
  fs.writeFileSync(path.join(distDir, "config.js"), builtConfig(config));
  const version = JSON.parse(fs.readFileSync(path.join(distDir, "version.json"), "utf8"));
  fs.writeFileSync(path.join(distDir, "version.json"), `${JSON.stringify({
    ...version,
    ...(Object.hasOwn(changes, "buildCommit") ? { commit: changes.buildCommit } : {}),
    ...(Object.hasOwn(changes, "buildBranch") ? { branch: changes.buildBranch } : {}),
    ...(Object.hasOwn(changes, "buildSource") ? { source: changes.buildSource } : {})
  })}\n`);
}

function rewriteVersion(distDir, changes) {
  const versionPath = path.join(distDir, "version.json");
  const version = JSON.parse(fs.readFileSync(versionPath, "utf8"));
  fs.writeFileSync(versionPath, `${JSON.stringify({ ...version, ...changes })}\n`);
}

function builtConfig(provenance) {
  return [
    "// Generated by scripts/build-static-site.mjs.",
    "window.QUANTGYM_CONFIG = " + JSON.stringify({
      cloudApiEndpoint: "http://127.0.0.1:8790/api",
      llmEndpoint: "http://127.0.0.1:8787/interview",
      llmModel: "gpt-5-nano",
      googleClientId: "",
      googleLoginEnabled: false,
      ...provenance
    }, null, 2) + ";",
    ""
  ].join("\n");
}

function replaceInFile(filePath, from, to) {
  fs.writeFileSync(filePath, fs.readFileSync(filePath, "utf8").replace(from, to));
}
