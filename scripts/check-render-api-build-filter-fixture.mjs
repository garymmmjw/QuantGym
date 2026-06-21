#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const summaryPath = path.resolve(
  projectRoot,
  args.summary || "docs/browser-audit-screenshots/359-render-api-build-filter-fixture-summary.json"
);

const validEnv = {
  QUANTGYM_RENDER_API_BUILD_FILTER_CONFIRMED: "1",
  QUANTGYM_RENDER_API_BUILD_FILTER_METHOD: "dashboard",
  QUANTGYM_RENDER_API_BUILD_FILTER_SERVICE: "quantgym-api",
  QUANTGYM_RENDER_API_BUILD_FILTER_PATHS: "api-server/**,data/**",
  QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL: "https://dashboard.render.com/web/srv-quantgymapi/settings",
  QUANTGYM_RENDER_API_BUILD_FILTER_NOTES: "Render quantgym-api build filter includes api-server/** and data/** so docs/frontend/tooling commits do not restart the API."
};

const cases = [
  {
    name: "valid production build filter",
    env: validEnv,
    expectStatus: 0,
    expectedCheck: "productionSignoffPass"
  },
  {
    name: "missing data path rejected",
    env: {
      ...validEnv,
      QUANTGYM_RENDER_API_BUILD_FILTER_PATHS: "api-server/**"
    },
    expectStatus: 1,
    expectedError: "data/**"
  },
  {
    name: "docs path rejected",
    env: {
      ...validEnv,
      QUANTGYM_RENDER_API_BUILD_FILTER_PATHS: "api-server/**,data/**,docs/**"
    },
    expectStatus: 1,
    expectedError: "docs/**"
  },
  {
    name: "frontend src path rejected",
    env: {
      ...validEnv,
      QUANTGYM_RENDER_API_BUILD_FILTER_PATHS: "api-server/**,data/**,src/**"
    },
    expectStatus: 1,
    expectedError: "src/**"
  },
  {
    name: "query evidence URL rejected",
    env: {
      ...validEnv,
      QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL: "https://dashboard.render.com/web/srv-quantgymapi/settings?token=leaky"
    },
    expectStatus: 1,
    expectedError: "query"
  },
  {
    name: "generic notes rejected",
    env: {
      ...validEnv,
      QUANTGYM_RENDER_API_BUILD_FILTER_NOTES: "configured"
    },
    expectStatus: 1,
    expectedError: "notes"
  }
];

const results = cases.map((testCase) => {
  const result = spawnSync(process.execPath, [
    "scripts/check-render-api-build-filter.mjs",
    "--production",
    "--no-dotenv",
    "--summary",
    "/tmp/quantgym-render-api-build-filter-fixture.json"
  ], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, ...testCase.env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 5
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const json = parseFirstJson(output);
  const statusMatches = result.status === testCase.expectStatus;
  const expectedCheckMatches = !testCase.expectedCheck || json?.checks?.[testCase.expectedCheck] === true;
  const expectedErrorMatches = !testCase.expectedError
    || output.toLowerCase().includes(testCase.expectedError.toLowerCase());
  return {
    name: testCase.name,
    status: statusMatches && expectedCheckMatches && expectedErrorMatches ? "pass" : "fail",
    exitCode: result.status,
    expectedExitCode: testCase.expectStatus,
    expectedCheck: testCase.expectedCheck || "",
    expectedError: testCase.expectedError || "",
    outputPreview: output.slice(0, 700)
  };
});

const failures = results.filter((item) => item.status !== "pass");
const summary = {
  status: failures.length ? "fail" : "pass",
  checks: cases.length,
  passed: results.length - failures.length,
  failed: failures.length,
  localCoverage: {
    validProductionBuildFilterAccepted: results.find((item) => item.name === "valid production build filter")?.status === "pass",
    missingDataPathRejected: results.find((item) => item.name === "missing data path rejected")?.status === "pass",
    docsPathRejected: results.find((item) => item.name === "docs path rejected")?.status === "pass",
    frontendSrcPathRejected: results.find((item) => item.name === "frontend src path rejected")?.status === "pass",
    queryEvidenceUrlRejected: results.find((item) => item.name === "query evidence URL rejected")?.status === "pass",
    genericNotesRejected: results.find((item) => item.name === "generic notes rejected")?.status === "pass"
  },
  results
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);

function parseFirstJson(output) {
  const start = String(output || "").indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(String(output).slice(start));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--summary") {
      parsed.summary = argv[index + 1] || "";
      index += 1;
    }
  }
  return parsed;
}
