import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  classifyLegacyUiContractResult,
  parseUiContractFindings,
} from "../scripts/capture-legacy-ui-contract-findings.mjs";

const expectedAllowlist = {
  version: 1,
  command: "npm run check:ui-contracts",
  findings: [
    {
      path: "docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json",
      message: "^(?:desktop|mobile) route smoke count expected 22, got 21$",
    },
    {
      path: "docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json",
      message: "^GitHub visual parity (?:routeCount|total|pass count|route array length) expected 22, got 21$",
    },
    {
      path: "docs/browser-audit-screenshots/322-ui-contract-gate-summary.json",
      message: "^(?:UI contract route count expected 22, got 21|UI contract image artifact count expected 96, got 92|Stage 2 strict React route count expected 22, got 21)$",
    },
    {
      path: "docs/browser-audit-screenshots/323-release-readiness-summary.json",
      message: "^(?:Route interactions nested gate must cover all routes when present|nested browser route smoke must check all routes|nested browser route smoke route pass count must match all routes|nested browser route smoke must verify mobile shell module sheet remains usable|nested module ownership must cover every route module|nested module ownership manifest route count must match UI contracts|nested module ownership must use browser smoke that checked every route)$",
    },
    {
      path: "docs/browser-audit-screenshots/341-external-launch-blockers-summary.json",
      message: "^external launch blockers must include the all-route deployed beta smoke$",
    },
    {
      path: "docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json",
      message: "^deployed beta smoke (?:must check all deployed routes|must pass all deployed routes|route result count must match expected routes)$",
    },
    {
      path: "docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png",
      message: "^missing screenshot artifact$",
    },
    {
      path: "docs/browser-audit-screenshots/312-chrome-visual-mobile-league.png",
      message: "^missing screenshot artifact$",
    },
    {
      path: "docs/browser-audit-screenshots/314-parity-baseline-league.png",
      message: "^missing screenshot artifact$",
    },
    {
      path: "docs/browser-audit-screenshots/314-parity-current-league.png",
      message: "^missing screenshot artifact$",
    },
  ],
};

const historicalFindings = [
  ["docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json", "desktop route smoke count expected 22, got 21"],
  ["docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json", "mobile route smoke count expected 22, got 21"],
  ["docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json", "GitHub visual parity routeCount expected 22, got 21"],
  ["docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json", "GitHub visual parity total expected 22, got 21"],
  ["docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json", "GitHub visual parity pass count expected 22, got 21"],
  ["docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json", "GitHub visual parity route array length expected 22, got 21"],
  ["docs/browser-audit-screenshots/322-ui-contract-gate-summary.json", "UI contract route count expected 22, got 21"],
  ["docs/browser-audit-screenshots/322-ui-contract-gate-summary.json", "UI contract image artifact count expected 96, got 92"],
  ["docs/browser-audit-screenshots/322-ui-contract-gate-summary.json", "Stage 2 strict React route count expected 22, got 21"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "Route interactions nested gate must cover all routes when present"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested browser route smoke must check all routes"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested browser route smoke route pass count must match all routes"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested browser route smoke must verify mobile shell module sheet remains usable"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested module ownership must cover every route module"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested module ownership manifest route count must match UI contracts"],
  ["docs/browser-audit-screenshots/323-release-readiness-summary.json", "nested module ownership must use browser smoke that checked every route"],
  ["docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json", "deployed beta smoke must check all deployed routes"],
  ["docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json", "deployed beta smoke must pass all deployed routes"],
  ["docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json", "deployed beta smoke route result count must match expected routes"],
  ["docs/browser-audit-screenshots/341-external-launch-blockers-summary.json", "external launch blockers must include the all-route deployed beta smoke"],
  ["docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png", "missing screenshot artifact"],
  ["docs/browser-audit-screenshots/312-chrome-visual-mobile-league.png", "missing screenshot artifact"],
  ["docs/browser-audit-screenshots/314-parity-baseline-league.png", "missing screenshot artifact"],
  ["docs/browser-audit-screenshots/314-parity-current-league.png", "missing screenshot artifact"],
].map(([path, message]) => ({ path, message }));

const historicalOutput = historicalFindings
  .map(({ path, message }) => message === "missing screenshot artifact"
    ? `  ✗ ${message} ${path}`
    : `  ✗ ${path}: ${message}`)
  .join("\n");

test("stores exactly the approved legacy UI-contract allowlist", async () => {
  const actual = JSON.parse(await readFile(
    new URL("../docs/frontend-upgrade/expected-legacy-ui-contract-findings.json", import.meta.url),
    "utf8",
  ));

  assert.deepEqual(actual, expectedAllowlist);
});

test("normalizes path-first and missing-artifact failure lines", () => {
  const output = [
    "UI contract check failed:",
    "  ✗ docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json: desktop route smoke count expected 22, got 21",
    "  ✗ missing screenshot artifact docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png",
  ].join("\n");

  assert.deepEqual(parseUiContractFindings(output), [
    {
      path: "docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json",
      message: "desktop route smoke count expected 22, got 21",
    },
    {
      path: "docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png",
      message: "missing screenshot artifact",
    },
  ]);
});

test("classifies every current historical finding and preserves the raw exit", () => {
  const result = classifyLegacyUiContractResult({
    exitCode: 1,
    stdout: "npm lifecycle output",
    stderr: historicalOutput,
    allowlist: expectedAllowlist,
  });

  assert.equal(result.status, "expected-legacy-findings");
  assert.equal(result.rawCommandExit, 1);
  assert.deepEqual(result.findings, historicalFindings);
  assert.deepEqual(result.unusedAllowlistEntries, []);
});

test("rejects a failure from an unexpected evidence file", () => {
  assert.throws(
    () => classifyLegacyUiContractResult({
      exitCode: 1,
      stderr: "  ✗ docs/browser-audit-screenshots/new-summary.json: desktop route smoke count expected 22, got 21",
      allowlist: expectedAllowlist,
    }),
    /Unexpected UI-contract finding.*new-summary\.json/,
  );
});

test("rejects an unexpected message for an allowed evidence file", () => {
  assert.throws(
    () => classifyLegacyUiContractResult({
      exitCode: 1,
      stderr: "  ✗ docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json: desktop route smoke count expected 22, got 20",
      allowlist: expectedAllowlist,
    }),
    /Unexpected UI-contract finding.*got 20/,
  );
});

test("rejects a failure marker that cannot be normalized", () => {
  assert.throws(
    () => parseUiContractFindings("  ✗ unstructured new failure"),
    /Unparseable UI-contract finding/,
  );
});

test("rejects command exits other than zero or one", () => {
  for (const exitCode of [2, null]) {
    assert.throws(
      () => classifyLegacyUiContractResult({
        exitCode,
        stderr: historicalOutput,
        allowlist: expectedAllowlist,
      }),
      /UI-contract command exit must be 0 or 1/,
    );
  }
});

test("rejects exit one when no failure lines explain it", () => {
  assert.throws(
    () => classifyLegacyUiContractResult({
      exitCode: 1,
      stderr: "UI contract check failed without details",
      allowlist: expectedAllowlist,
    }),
    /exited 1 without any UI-contract findings/,
  );
});

test("keeps a green gate green and reports stale allowlist entries", () => {
  const result = classifyLegacyUiContractResult({
    exitCode: 0,
    stdout: "UI contract check passed.",
    allowlist: expectedAllowlist,
  });

  assert.equal(result.status, "pass");
  assert.equal(result.rawCommandExit, 0);
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.unusedAllowlistEntries, expectedAllowlist.findings);
});
