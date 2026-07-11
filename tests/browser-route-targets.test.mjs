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

test("browser smoke waits for League entry motion before asserting layout", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const start = source.indexOf("async function expectLeagueSurface");
  const end = source.indexOf("async function runGlobalSearchResultNavigationFlow", start);
  assert.ok(start >= 0 && end > start, "League surface helper must remain discoverable");
  const helper = source.slice(start, end);
  const waitIndex = helper.indexOf("page.waitForFunction");
  const snapshotIndex = helper.indexOf("page.evaluate");
  assert.ok(waitIndex >= 0, "League surface helper must wait for nonzero visible layout");
  assert.ok(snapshotIndex > waitIndex, "League surface helper must wait before taking its layout snapshot");
  assert.match(helper, /standingsRows\.length\s*>\s*0/);
  assert.match(helper, /learningNodes\.length\s*>\s*0/);
  assert.match(helper, /shopItems\.length\s*>\s*0/);
});

test("browser smoke restores temporary runtime configuration between journeys", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const functionBlock = (name, nextName) => {
    const start = source.indexOf(`async function ${name}`);
    const end = source.indexOf(`async function ${nextName}`, start + 1);
    assert.ok(start >= 0 && end > start, `${name} must remain discoverable`);
    return source.slice(start, end);
  };
  const independentlyIsolated = [
    ["runResumeLlmReviewFlow", "runMobileResumeReviewFlow"],
    ["runMobileResumeReviewFlow", "expectResumeReviewItems"],
    ["runCrossModulePrepJourneyFlow", "ensureTodoDockOpen"],
    ["runSettingsPersistenceFlow", "runSettingsCloudSyncNoSessionGuardFlow"],
    ["runSettingsCloudSyncNoSessionGuardFlow", "runSettingsCloudSyncSuccessFlow"],
    ["runSettingsCloudSyncSuccessFlow", "runSettingsBackupImportResetFlow"],
    ["runMobileSettingsConfigBackupControlsFlow", "readSettingsPersistenceValues"]
  ];
  for (const [name, nextName] of independentlyIsolated) {
    const block = functionBlock(name, nextName);
    assert.match(block, /readRawLocalStorageSnapshot\(page,/,
      `${name} must capture runtime configuration before mutating it`);
    assert.match(block, /finally\s*\{[\s\S]*restoreRawLocalStorageSnapshot\(page,/,
      `${name} must restore runtime configuration in finally`);
  }
  assert.match(
    functionBlock("runInterviewPracticeExitResumeFlow", "runMobileInterviewAdvancedSetupFlow"),
    /captureInterviewRuntimeStorage\(page\)/
  );
  assert.match(
    functionBlock("runInterviewPdfQuestionSourceFlow", "clickInterviewAction"),
    /finally\s*\{[\s\S]*restoreInterviewRuntimeStorage\(page\)/
  );
  assert.match(source, /quantgym-interview-session-v2/);
  assert.doesNotMatch(source, /restoreRawLocalStorageSnapshot\(page,[^;\n]+\)\.catch\(/);
  assert.doesNotMatch(source, /restoreInterviewRuntimeStorage\(page\)\.catch\(\(\)\s*=>\s*\{\}\)/);

  const cloudSyncSuccess = functionBlock("runSettingsCloudSyncSuccessFlow", "runSettingsBackupImportResetFlow");
  assert.match(cloudSyncSuccess, /quantMemoryBoard\.community\.v1/);
  assert.match(cloudSyncSuccess, /quantMemoryBoard\.userState\.v1\./);
});

test("browser storage snapshots round-trip missing and existing local/session keys", async () => {
  assert.equal(typeof browserRouteTargets.readRawBrowserStorageSnapshot, "function");
  assert.equal(typeof browserRouteTargets.restoreRawBrowserStorageSnapshot, "function");
  const localValues = new Map([["local-existing", "local-before"], ["local-extra", "keep"]]);
  const sessionValues = new Map([["session-existing", "session-before"]]);
  const page = fakeStoragePage(localValues, sessionValues);
  const snapshot = await browserRouteTargets.readRawBrowserStorageSnapshot(page, {
    localStorageKeys: ["local-existing", "local-missing"],
    sessionStorageKeys: ["session-existing", "session-missing"]
  });
  assert.deepEqual(snapshot, {
    localStorage: { "local-existing": "local-before", "local-missing": null },
    sessionStorage: { "session-existing": "session-before", "session-missing": null }
  });

  localValues.set("local-existing", "local-after");
  localValues.set("local-missing", "temporary");
  sessionValues.set("session-existing", "session-after");
  sessionValues.set("session-missing", "temporary");
  await browserRouteTargets.restoreRawBrowserStorageSnapshot(page, snapshot);
  assert.equal(localValues.get("local-existing"), "local-before");
  assert.equal(localValues.has("local-missing"), false);
  assert.equal(localValues.get("local-extra"), "keep");
  assert.equal(sessionValues.get("session-existing"), "session-before");
  assert.equal(sessionValues.has("session-missing"), false);

  await assert.rejects(
    browserRouteTargets.restoreRawBrowserStorageSnapshot({
      evaluate: async () => { throw new Error("restore failed"); }
    }, snapshot),
    /restore failed/
  );
});

test("preview resource abort classification is limited to cancelled static GETs", () => {
  assert.equal(typeof browserRouteTargets.isExpectedPreviewResourceAbort, "function");
  const previewOrigin = "http://127.0.0.1:4173";
  const expected = [
    ["/favicon.svg", { navigationChanged: true }],
    ["/assets/avatar-focused-v2.png", { frameDetached: true }],
    ["/assets/generated/playful-precision/reward-xp.webp?cache=1", { contextClosing: true }],
    ["/api/library-reader-smoke/green-book.pdf", { successfulResponse: true }]
  ];
  for (const [pathname, evidence] of expected) {
    const record = {
      kind: "requestfailed",
      method: "GET",
      errorText: "net::ERR_ABORTED",
      url: `${previewOrigin}${pathname}`
    };
    assert.equal(browserRouteTargets.isExpectedPreviewResourceAbort(record, previewOrigin, evidence), true, pathname);
    assert.equal(browserRouteTargets.isExpectedPreviewResourceAbort(record, previewOrigin), false, `${pathname} requires lifecycle evidence`);
  }
  const rejected = [
    { kind: "requestfailed", method: "POST", errorText: "net::ERR_ABORTED", url: `${previewOrigin}/assets/main.js` },
    { kind: "requestfailed", method: "GET", errorText: "net::ERR_FAILED", url: `${previewOrigin}/assets/main.js` },
    { kind: "requestfailed", method: "GET", errorText: "net::ERR_ABORTED", url: `${previewOrigin}/api/sync` },
    { kind: "requestfailed", method: "GET", errorText: "net::ERR_ABORTED", url: "http://127.0.0.1:8790/assets/main.js" },
    { kind: "response", method: "GET", status: 404, url: `${previewOrigin}/assets/main.js` }
  ];
  for (const record of rejected) {
    assert.equal(browserRouteTargets.isExpectedPreviewResourceAbort(record, previewOrigin), false, JSON.stringify(record));
  }
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const requestFailedStart = source.indexOf('page.on("requestfailed"');
  const collectorEnd = source.indexOf("return collector;", requestFailedStart);
  assert.ok(requestFailedStart >= 0 && collectorEnd > requestFailedStart, "requestfailed collector must remain discoverable");
  assert.match(
    source.slice(requestFailedStart, collectorEnd),
    /isExpectedPreviewResourceAbort\(record, previewOrigin,\s*\{/,
    "cancelled preview resources must be classified in the requestfailed collector"
  );
  assert.match(source, /page\.on\("request",/);
  assert.match(source, /navigationGeneration/);
  assert.match(source, /successfulResponseRequests\.has\(request\)/);
  assert.match(source, /beginTeardown\(\)/);
});

test("interview local fallback failures are scoped to the exact hint and feedback requests", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const start = source.indexOf("async function runInterviewPracticeExitResumeFlow");
  const end = source.indexOf("async function runMobileInterviewAdvancedSetupFlow", start);
  assert.ok(start >= 0 && end > start, "interview practice flow must remain discoverable");
  const flow = source.slice(start, end);
  assert.match(flow, /id:\s*"interview hint offline fallback"/);
  assert.match(flow, /id:\s*"interview feedback offline fallback"/);
  assert.equal((flow.match(/url:\s*"http:\/\/127\.0\.0\.1:59991\/interview"/g) || []).length, 2);
  assert.equal((flow.match(/text:\s*"Failed to load resource: net::ERR_CONNECTION_REFUSED"/g) || []).length, 2);
  assert.equal((flow.match(/\.wait\(\)/g) || []).length >= 2, true);
});

test("account email reauthentication scopes all three offline cloud-login fallbacks", () => {
  const source = fs.readFileSync(path.join(root, "scripts/check-browser-route-smoke.mjs"), "utf8");
  const start = source.indexOf("async function runAccountEmailChangeReauthFlow");
  const end = source.indexOf("async function submitLocalLogin", start);
  assert.ok(start >= 0 && end > start, "account email reauthentication flow must remain discoverable");
  const flow = source.slice(start, end);
  assert.match(flow, /expectOfflineCloudLoginFailure\(page, "account old-email cloud fallback"\)/);
  assert.match(flow, /expectOfflineCloudLoginFailure\(page, "account new-email primary cloud fallback"\)/);
  assert.match(flow, /expectOfflineCloudLoginFailure\(page, "account new-email session cloud fallback"\)/);
  assert.equal((flow.match(/\.wait\(\)/g) || []).length >= 3, true);
});

test("expected console matching requires an exact scoped first-party message", () => {
  assert.equal(typeof browserRouteTargets.matchesExpectedConsoleMessage, "function");
  const firstPartyOrigins = new Set(["http://127.0.0.1:4173"]);
  const expectation = {
    firstParty: true,
    text: "[QuantGym] Failed to import backup Error: Backup payload must be a JSON object."
  };
  assert.equal(browserRouteTargets.matchesExpectedConsoleMessage(expectation, {
    url: "http://127.0.0.1:4173/assets/main.js",
    text: expectation.text
  }, firstPartyOrigins), true);
  assert.equal(browserRouteTargets.matchesExpectedConsoleMessage(expectation, {
    url: "https://third-party.example/widget.js",
    text: expectation.text
  }, firstPartyOrigins), false);
  assert.equal(browserRouteTargets.matchesExpectedConsoleMessage(expectation, {
    url: "http://127.0.0.1:4173/assets/main.js",
    text: `${expectation.text} extra`
  }, firstPartyOrigins), false);
  assert.equal(browserRouteTargets.matchesExpectedConsoleMessage({
    firstParty: true,
    textPattern: /^\[QuantGym\] Failed to import backup SyntaxError: Unexpected end of JSON input$/
  }, {
    url: "http://127.0.0.1:4173/assets/main.js",
    text: "[QuantGym] Failed to import backup SyntaxError: Unexpected end of JSON input"
  }, firstPartyOrigins), true);
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

function fakeStoragePage(localValues, sessionValues) {
  return {
    async evaluate(callback, argument) {
      const localDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
      const sessionDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: mapStorage(localValues)
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: mapStorage(sessionValues)
      });
      try {
        return await callback(argument);
      } finally {
        if (localDescriptor) Object.defineProperty(globalThis, "localStorage", localDescriptor);
        else delete globalThis.localStorage;
        if (sessionDescriptor) Object.defineProperty(globalThis, "sessionStorage", sessionDescriptor);
        else delete globalThis.sessionStorage;
      }
    }
  };
}

function mapStorage(values) {
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

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
