#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/338-jobs-source-production-fixture-summary.json";
const startedAt = Date.now();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-jobs-production-fixture-"));
const validCatalogPath = path.join(tempDir, "jobs-catalog-valid.json");
const internshipOnlyCatalogPath = path.join(tempDir, "jobs-catalog-internship-only.json");
const duplicateCatalogPath = path.join(tempDir, "jobs-catalog-duplicate.json");
const feedToken = "quantgym-jobs-production-fixture-token";
const failures = [];
const warnings = [];

const validCatalogJobs = [
  {
    id: "fixture-local-internship",
    company: "Fixture Local Trading",
    title: "Fixture Local Quant Intern",
    type: "internship",
    location: "New York",
    url: "https://jobs.quantgym.test/local-internship",
    postedAt: "2026-06-01T00:00:00Z",
    tags: ["fixture", "local"]
  },
  {
    id: "fixture-local-fulltime",
    company: "Fixture Local Research",
    title: "Fixture Local Quant Researcher",
    type: "fulltime",
    location: "Chicago",
    url: "https://jobs.quantgym.test/local-fulltime",
    postedAt: "2026-06-02T00:00:00Z",
    tags: ["fixture", "local"]
  }
];

const validProductionEnv = {
  QUANTGYM_JOBS_CATALOG: validCatalogPath,
  QUANTGYM_JOBS_SOURCE_URL: "https://jobs.quantgym.test/feed.json",
  QUANTGYM_JOBS_SOURCE_TOKEN: feedToken,
  QUANTGYM_JOBS_SOURCE_CACHE_SECONDS: "300",
  QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS: "5",
  QUANTGYM_JOBS_SOURCE_MAX_BYTES: "65536"
};

const negativeCases = [
  {
    name: "http source URL rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "http://jobs.quantgym.test/feed.json" },
    expectedError: "Production jobs source URL must use HTTPS"
  },
  {
    name: "localhost source URL rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "https://localhost/jobs-feed.json" },
    expectedError: "must not point to localhost"
  },
  {
    name: "private source URL rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "https://10.20.30.40/jobs-feed.json" },
    expectedError: "private network address"
  },
  {
    name: "source URL embedded credentials rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "https://crawler:secret@jobs.quantgym.test/feed.json" },
    expectedError: "embedded credentials"
  },
  {
    name: "source URL query rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "https://jobs.quantgym.test/feed.json?token=leaky" },
    expectedError: "query strings or fragments"
  },
  {
    name: "placeholder source URL rejected",
    env: { QUANTGYM_JOBS_SOURCE_URL: "https://jobs-source.example.com/jobs.json" },
    expectedError: "placeholder value"
  },
  {
    name: "placeholder source token rejected",
    env: { QUANTGYM_JOBS_SOURCE_TOKEN: "optional-feed-token" },
    expectedError: "QUANTGYM_JOBS_SOURCE_TOKEN"
  },
  {
    name: "short source token rejected",
    env: { QUANTGYM_JOBS_SOURCE_TOKEN: "short-token" },
    expectedError: "at least 24 characters"
  },
  {
    name: "short cache rejected",
    env: { QUANTGYM_JOBS_SOURCE_CACHE_SECONDS: "29" },
    expectedError: "QUANTGYM_JOBS_SOURCE_CACHE_SECONDS"
  },
  {
    name: "long timeout rejected",
    env: { QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS: "16" },
    expectedError: "QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS"
  },
  {
    name: "small max bytes rejected",
    env: { QUANTGYM_JOBS_SOURCE_MAX_BYTES: "4095" },
    expectedError: "QUANTGYM_JOBS_SOURCE_MAX_BYTES"
  },
  {
    name: "catalog missing fulltime rejected",
    env: { QUANTGYM_JOBS_CATALOG: internshipOnlyCatalogPath },
    expectedError: "fulltime"
  },
  {
    name: "catalog duplicate ids rejected",
    env: { QUANTGYM_JOBS_CATALOG: duplicateCatalogPath },
    expectedError: "duplicate ids"
  }
];

try {
  writeFixtureCatalogs();

  const validProduction = await runConfig(["--production", "--no-dotenv"], validProductionEnv);
  const productionFixture = summarizeProductionFixture(validProduction);
  validateValidProductionFixture(validProduction, productionFixture);

  const defaultProduction = await runConfig(["--production", "--no-dotenv"], {
    ...validProductionEnv,
    QUANTGYM_JOBS_SOURCE_URL: "",
    QUANTGYM_JOBS_SOURCE_TOKEN: ""
  });
  const defaultProductionFixture = summarizeProductionFixture(defaultProduction);
  validateDefaultProductionFixture(defaultProduction, defaultProductionFixture);

  const negativeFixtures = [];
  for (const fixture of negativeCases) {
    const result = await runConfig(["--production", "--no-dotenv"], {
      ...validProductionEnv,
      ...fixture.env
    });
    const summary = summarizeNegativeFixture(fixture, result);
    negativeFixtures.push(summary);
    if (!summary.rejected) fail(`Negative fixture "${fixture.name}" should fail production jobs validation.`);
    if (!summary.expectedErrorObserved) {
      fail(`Negative fixture "${fixture.name}" did not mention expected error text "${fixture.expectedError}".`);
    }
  }

  const fakeFeed = await createFakeFeedServer();
  let liveFixtures;
  try {
    liveFixtures = {
      valid: await runLiveFixture(fakeFeed, "valid-feed", { token: feedToken }),
      internshipOnly: await runLiveFixture(fakeFeed, "internship-only-feed", { token: feedToken }),
      duplicateIds: await runLiveFixture(fakeFeed, "duplicate-feed", { token: feedToken }),
      invalidUrl: await runLiveFixture(fakeFeed, "invalid-url-feed", { token: feedToken }),
      defaultedMetadata: await runLiveFixture(fakeFeed, "defaulted-metadata-feed", { token: feedToken }),
      invalidPostedAt: await runLiveFixture(fakeFeed, "invalid-posted-at-feed", { token: feedToken }),
      futurePostedAt: await runLiveFixture(fakeFeed, "future-posted-at-feed", { token: feedToken }),
      invalidJson: await runLiveFixture(fakeFeed, "invalid-json-feed", { token: feedToken }),
      oversizedPayload: await runLiveFixture(fakeFeed, "oversized-feed", { token: feedToken, maxBytes: "4096" }),
      missingToken: await runLiveFixture(fakeFeed, "valid-feed", { token: "" })
    };
  } finally {
    await closeServer(fakeFeed.server);
  }

  validateLiveFixtures(liveFixtures);

  const checks = {
    validProductionPass: productionFixture.status === "pass",
    validProductionHasAllChecks: productionFixture.passed === 2 && productionFixture.failed === 0,
    validProductionSourceTokenRedacted: !validProduction.combinedOutput.includes(feedToken),
    validProductionSourceUrlRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_JOBS_SOURCE_URL),
    defaultProductionPass: defaultProductionFixture.status === "pass",
    defaultProductionUsesPublicAtsFeed: defaultProductionFixture.sourceDefaulted === true
      && defaultProductionFixture.sourceHost === "beta.quantgym.app",
    defaultProductionTokenOptional: defaultProductionFixture.sourceTokenSet === false,
    negativeFixturesRejected: negativeFixtures.every((fixture) => fixture.rejected),
    negativeFixturesMentionExpectedErrors: negativeFixtures.every((fixture) => fixture.expectedErrorObserved),
    sourceUrlEmbeddedCredentialsRejected: findNegativeFixture(negativeFixtures, "source URL embedded credentials rejected")?.rejected === true,
    sourceUrlQueryRejected: findNegativeFixture(negativeFixtures, "source URL query rejected")?.rejected === true,
    placeholderSourceTokenRejected: findNegativeFixture(negativeFixtures, "placeholder source token rejected")?.rejected === true,
    shortSourceTokenRejected: findNegativeFixture(negativeFixtures, "short source token rejected")?.rejected === true,
    liveValidPass: liveFixtures.valid.status === "pass",
    liveValidTokenAccepted: liveFixtures.valid.feedTokenAccepted === true,
    liveInvalidFeedsRejected: [
      liveFixtures.internshipOnly,
      liveFixtures.duplicateIds,
      liveFixtures.invalidUrl,
      liveFixtures.defaultedMetadata,
      liveFixtures.invalidPostedAt,
      liveFixtures.futurePostedAt,
      liveFixtures.invalidJson,
      liveFixtures.oversizedPayload,
      liveFixtures.missingToken
    ].every((fixture) => fixture.rejected),
    liveInvalidFeedsMentionExpectedErrors: [
      liveFixtures.internshipOnly,
      liveFixtures.duplicateIds,
      liveFixtures.invalidUrl,
      liveFixtures.defaultedMetadata,
      liveFixtures.invalidPostedAt,
      liveFixtures.futurePostedAt,
      liveFixtures.invalidJson,
      liveFixtures.oversizedPayload,
      liveFixtures.missingToken
    ].every((fixture) => fixture.expectedErrorObserved)
  };

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    productionFixture,
    defaultProductionFixture,
    negativeFixtures,
    liveFixtures,
    checks,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function writeFixtureCatalogs() {
  fs.writeFileSync(validCatalogPath, `${JSON.stringify({ jobs: validCatalogJobs }, null, 2)}\n`);
  fs.writeFileSync(internshipOnlyCatalogPath, `${JSON.stringify({ jobs: [validCatalogJobs[0]] }, null, 2)}\n`);
  fs.writeFileSync(duplicateCatalogPath, `${JSON.stringify({ jobs: [
    validCatalogJobs[0],
    { ...validCatalogJobs[1], id: validCatalogJobs[0].id }
  ] }, null, 2)}\n`);
}

function validateValidProductionFixture(result, summary) {
  if (result.exitCode !== 0) fail(`Valid production jobs fixture exited ${result.exitCode}: ${firstFailure(result)}`);
  if (summary.status !== "pass") fail("Valid production jobs fixture did not report pass.");
  if (summary.passed !== 2 || summary.failed !== 0) fail(`Valid production jobs fixture expected 2 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (summary.catalogCount !== 2 || summary.catalogInternships !== 1 || summary.catalogFulltime !== 1) {
    fail("Valid production jobs fixture catalog counts are wrong.");
  }
  if (summary.sourceProtocol !== "https") fail(`Valid production jobs fixture expected HTTPS source protocol, got ${summary.sourceProtocol}.`);
  if (summary.sourceHost !== "jobs.quantgym.test") fail(`Valid production jobs fixture source host mismatch: ${summary.sourceHost}.`);
  if (!summary.sourceTokenSet) fail("Valid production jobs fixture should require a source token.");
  if (result.combinedOutput.includes(feedToken)) fail("Valid production jobs fixture output leaked the source token.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_JOBS_SOURCE_URL)) fail("Valid production jobs fixture output leaked the full source URL.");
}

function validateDefaultProductionFixture(result, summary) {
  if (result.exitCode !== 0) fail(`Default production jobs fixture exited ${result.exitCode}: ${firstFailure(result)}`);
  if (summary.status !== "pass") fail("Default production jobs fixture did not report pass.");
  if (summary.passed !== 2 || summary.failed !== 0) fail(`Default production jobs fixture expected 2 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (!summary.sourceDefaulted) fail("Default production jobs fixture should report a defaulted source URL.");
  if (summary.sourceProtocol !== "https") fail(`Default production jobs fixture expected HTTPS source protocol, got ${summary.sourceProtocol}.`);
  if (summary.sourceHost !== "beta.quantgym.app") fail(`Default production jobs fixture source host mismatch: ${summary.sourceHost}.`);
  if (summary.sourceTokenSet) fail("Default production jobs fixture should not require a token for the public ATS feed.");
}

function validateLiveFixtures(liveFixtures) {
  const valid = liveFixtures.valid;
  if (valid.status !== "pass") fail(`Valid live jobs fixture should pass, got ${valid.status}.`);
  if (valid.childExitCode !== 0) fail(`Valid live jobs fixture child exited ${valid.childExitCode}.`);
  if (valid.sourceStatusCode !== 200) fail(`Valid live jobs fixture should return source HTTP 200, got ${valid.sourceStatusCode}.`);
  if (valid.count !== 2 || valid.internships !== 1 || valid.fulltime !== 1) fail("Valid live jobs fixture should include one internship and one fulltime role.");
  if (!valid.feedTokenAccepted) fail("Valid live jobs fixture should send the configured bearer token.");
  if (!valid.feedUserAgentOk) fail("Valid live jobs fixture should send the jobs readiness user agent.");

  const expectations = [
    [liveFixtures.internshipOnly, "fulltime role"],
    [liveFixtures.duplicateIds, "duplicate ids"],
    [liveFixtures.invalidUrl, "invalid URLs"],
    [liveFixtures.defaultedMetadata, "valid company/title/postedAt"],
    [liveFixtures.invalidPostedAt, "valid company/title/postedAt"],
    [liveFixtures.futurePostedAt, "valid company/title/postedAt"],
    [liveFixtures.invalidJson, "valid JSON"],
    [liveFixtures.oversizedPayload, "too large"],
    [liveFixtures.missingToken, "HTTP 401"]
  ];
  for (const [fixture, expectedText] of expectations) {
    if (!fixture.rejected) fail(`Live fixture "${fixture.name}" should be rejected.`);
    if (!fixture.expectedErrorObserved) fail(`Live fixture "${fixture.name}" did not report expected text "${expectedText}".`);
  }
}

async function runLiveFixture(fakeFeed, routeName, { token, maxBytes = "65536" }) {
  const expectedErrors = {
    "valid-feed": "",
    "internship-only-feed": "fulltime role",
    "duplicate-feed": "duplicate ids",
    "invalid-url-feed": "invalid URLs",
    "defaulted-metadata-feed": "valid company/title/postedAt",
    "invalid-posted-at-feed": "valid company/title/postedAt",
    "future-posted-at-feed": "valid company/title/postedAt",
    "invalid-json-feed": "valid JSON",
    "oversized-feed": "too large",
    "missing-token": "HTTP 401"
  };
  const routeKey = token ? routeName : "missing-token";
  const result = await runConfig(["--live", "--no-dotenv"], {
    QUANTGYM_JOBS_CATALOG: validCatalogPath,
    QUANTGYM_JOBS_SOURCE_URL: `${fakeFeed.endpoint}/${routeName}`,
    QUANTGYM_JOBS_SOURCE_TOKEN: token,
    QUANTGYM_JOBS_SOURCE_CACHE_SECONDS: "300",
    QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS: "5",
    QUANTGYM_JOBS_SOURCE_MAX_BYTES: maxBytes
  });
  const liveData = findResult(result.parsed?.results, "source live fetch")?.data || {};
  const request = fakeFeed.requests.find((item) => item.path === `/${routeName}` && item.fixtureIndex === fakeFeed.fixtureIndex) || null;
  fakeFeed.fixtureIndex += 1;
  const errorText = result.exitCode === 0 ? "" : firstFailure(result);
  return {
    name: routeKey,
    status: result.parsed?.status || "unknown",
    childExitCode: result.exitCode,
    rejected: result.exitCode !== 0 && (result.parsed?.status === "fail" || Number(result.parsed?.failed || 0) > 0),
    expectedErrorObserved: routeKey === "valid-feed" ? result.exitCode === 0 : errorText.includes(expectedErrors[routeKey]),
    error: errorText,
    sourceStatusCode: Number(liveData.statusCode || request?.statusCode || 0),
    bytes: Number(liveData.bytes || request?.bytes || 0),
    count: Number(liveData.count || 0),
    internships: Number(liveData.internships || 0),
    fulltime: Number(liveData.fulltime || 0),
    firstId: liveData.firstId || "",
    tokenSent: liveData.tokenSent === true,
    feedTokenAccepted: request?.authorization === `Bearer ${feedToken}`,
    feedUserAgentOk: String(request?.userAgent || "").includes("QuantGymJobsReadiness"),
    requestStatusCode: Number(request?.statusCode || 0)
  };
}

function createFakeFeedServer() {
  const requests = [];
  const serverState = { fixtureIndex: 0 };
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const item = {
      fixtureIndex: serverState.fixtureIndex,
      method: req.method || "",
      path: requestUrl.pathname,
      authorization: req.headers.authorization || "",
      userAgent: req.headers["user-agent"] || "",
      statusCode: 0,
      bytes: 0
    };
    requests.push(item);

    if (item.authorization !== `Bearer ${feedToken}`) {
      sendJson(res, item, 401, { error: "bad jobs feed token" });
      return;
    }

    if (item.path === "/valid-feed") {
      sendJson(res, item, 200, { data: { jobs: liveJobs() } });
      return;
    }
    if (item.path === "/internship-only-feed") {
      sendJson(res, item, 200, { jobs: [liveJobs()[0]] });
      return;
    }
    if (item.path === "/duplicate-feed") {
      const jobs = liveJobs();
      sendJson(res, item, 200, { jobs: [jobs[0], { ...jobs[1], id: jobs[0].id }] });
      return;
    }
    if (item.path === "/invalid-url-feed") {
      const jobs = liveJobs();
      sendJson(res, item, 200, { jobs: [jobs[0], { ...jobs[1], url: "javascript:alert('jobs')" }] });
      return;
    }
    if (item.path === "/defaulted-metadata-feed") {
      const jobs = liveJobs();
      const { postedAt, ...fulltimeWithoutPostedAt } = jobs[1];
      sendJson(res, item, 200, { jobs: [jobs[0], fulltimeWithoutPostedAt] });
      return;
    }
    if (item.path === "/invalid-posted-at-feed") {
      const jobs = liveJobs();
      sendJson(res, item, 200, { jobs: [jobs[0], { ...jobs[1], postedAt: "not-a-real-date" }] });
      return;
    }
    if (item.path === "/future-posted-at-feed") {
      const jobs = liveJobs();
      sendJson(res, item, 200, { jobs: [jobs[0], { ...jobs[1], postedAt: "2999-01-01T00:00:00Z" }] });
      return;
    }
    if (item.path === "/invalid-json-feed") {
      const body = Buffer.from("{ this is not valid jobs json");
      item.statusCode = 200;
      item.bytes = body.length;
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(body.length)
      });
      res.end(body);
      return;
    }
    if (item.path === "/oversized-feed") {
      const body = Buffer.alloc(8192, "x");
      item.statusCode = 200;
      item.bytes = body.length;
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(body.length)
      });
      res.end(body);
      return;
    }
    sendJson(res, item, 404, { error: "not found" });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        endpoint: `http://127.0.0.1:${server.address().port}`,
        requests,
        get fixtureIndex() {
          return serverState.fixtureIndex;
        },
        set fixtureIndex(value) {
          serverState.fixtureIndex = value;
        }
      });
    });
  });
}

function liveJobs() {
  return [
    {
      id: "fixture-live-internship",
      company: "Fixture Live Trading",
      title: "Fixture Live Quant Trading Intern",
      type: "internship",
      location: "New York",
      url: "https://jobs.quantgym.test/live-internship",
      postedAt: "2026-06-03T00:00:00Z",
      tags: ["live", "internship"]
    },
    {
      id: "fixture-live-fulltime",
      company: "Fixture Live Research",
      title: "Fixture Live Quant Researcher",
      type: "fulltime",
      location: "Chicago",
      url: "https://jobs.quantgym.test/live-fulltime",
      postedAt: "2026-06-04T00:00:00Z",
      tags: ["live", "fulltime"]
    }
  ];
}

function sendJson(res, item, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  item.statusCode = statusCode;
  item.bytes = body.length;
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length)
  });
  res.end(body);
}

async function runConfig(configArgs, envOverrides) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/check-jobs-source-config.mjs", ...configArgs], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: isolatedEnv(envOverrides)
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) child.kill("SIGKILL");
    }, 30000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}`, parsed: null, combinedOutput: `${stdout}\n${stderr}\n${error.message}` });
    });
    child.on("close", (code, signal) => {
      settled = true;
      clearTimeout(timeout);
      const combinedOutput = `${stdout}\n${stderr}`;
      resolve({
        exitCode: typeof code === "number" ? code : 1,
        signal: signal || "",
        stdout,
        stderr,
        parsed: parseLastJson(stdout),
        combinedOutput
      });
    });
  });
}

function summarizeProductionFixture(result) {
  const parsed = result.parsed || {};
  const catalog = findResult(parsed.results, "local jobs catalog")?.data || {};
  const source = findResult(parsed.results, "source configuration")?.data || {};
  return {
    status: parsed.status || "unknown",
    mode: parsed.mode || "",
    passed: Number(parsed.passed || 0),
    failed: Number(parsed.failed || 0),
    catalogCount: Number(catalog.count || 0),
    catalogInternships: Number(catalog.internships || 0),
    catalogFulltime: Number(catalog.fulltime || 0),
    sourceConfigured: source.configured === true,
    sourceHost: source.host || "",
    sourceProtocol: source.protocol || "",
    sourceDefaulted: source.defaulted === true,
    sourceTokenSet: source.tokenSet === true,
    cacheSeconds: Number(source.cacheSeconds || 0),
    timeoutSeconds: Number(source.timeoutSeconds || 0),
    maxBytes: Number(source.maxBytes || 0)
  };
}

function summarizeNegativeFixture(fixture, result) {
  const parsed = result.parsed || {};
  const errorText = firstFailure(result);
  return {
    name: fixture.name,
    rejected: result.exitCode !== 0 && (parsed.status === "fail" || Number(parsed.failed || 0) > 0),
    expectedErrorObserved: errorText.includes(fixture.expectedError),
    failed: Number(parsed.failed || 0),
    error: errorText
  };
}

function firstFailure(result) {
  const parsed = result.parsed || {};
  const failed = Array.isArray(parsed.results) ? parsed.results.find((item) => item.status === "fail") : null;
  return String(failed?.error || result.stderr || result.stdout || "").trim();
}

function parseLastJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  const start = trimmed.lastIndexOf("\n{");
  const candidate = start >= 0 ? trimmed.slice(start + 1) : trimmed.slice(trimmed.indexOf("{"));
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function findResult(results, name) {
  return Array.isArray(results) ? results.find((item) => item.name === name) : null;
}

function findNegativeFixture(fixtures, name) {
  return Array.isArray(fixtures) ? fixtures.find((item) => item.name === name) : null;
}

function isolatedEnv(overrides = {}) {
  const inherited = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_OPTIONS"]) {
    if (process.env[key] != null) inherited[key] = process.env[key];
  }
  return { ...inherited, ...overrides };
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function fail(message) {
  failures.push(String(message));
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}
