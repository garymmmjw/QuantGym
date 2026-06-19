#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/330-jobs-source-runtime-smoke-summary.json";
const keepTemp = args.includes("--keep-temp");
const startedAt = Date.now();
const feedToken = "quantgym-jobs-runtime-feed-token";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-jobs-runtime-"));
const catalogPath = path.join(tempDir, "jobs-catalog.json");
const failures = [];
const warnings = [];
const feedRequests = [];
let feedServer;
let apiProcess;

const localJobs = [
  {
    id: "runtime-local-fulltime",
    company: "Local Catalog Capital",
    title: "Local Catalog Quant Developer",
    type: "fulltime",
    location: "Boston",
    url: "https://jobs.example.test/local-fulltime",
    postedAt: "2026-06-01T00:00:00Z",
    tags: ["local", "fallback"]
  },
  {
    id: "runtime-shared-role",
    company: "Local Duplicate Capital",
    title: "Local Duplicate Should Not Win",
    type: "fulltime",
    location: "Local",
    url: "https://jobs.example.test/local-duplicate",
    postedAt: "2026-06-02T00:00:00Z",
    tags: ["local-duplicate"]
  }
];

const sourceJobs = [
  {
    id: "runtime-source-internship",
    company: "Runtime Source Trading",
    title: "Runtime Source Quant Intern",
    type: "internship",
    location: "New York",
    url: "https://jobs.example.test/source-internship",
    postedAt: "2026-06-03T00:00:00Z",
    tags: "source,quant,python"
  },
	  {
	    id: "runtime-shared-role",
	    company: "Runtime Source Research",
	    title: "Source Feed Quant Researcher",
	    type: "fulltime",
	    location: "Chicago",
	    url: "https://jobs.example.test/source-shared",
	    postedAt: "2026-06-04T00:00:00Z",
	    tags: ["source", "dedupe"]
	  },
	  {
	    id: "runtime-unsafe-url",
	    company: "Runtime Unsafe Source",
	    title: "Unsafe Source URL Should Be Sanitized",
	    type: "contract",
	    location: "Remote",
	    url: "javascript:alert('jobs')",
	    postedAt: "2026-06-05T00:00:00Z",
	    tags: "unsafe,external"
	  },
	  {
	    id: "runtime-invalid-posted-at",
	    company: "Runtime Invalid Date Source",
	    title: "Invalid Source Date Should Be Sanitized",
	    type: "internship",
	    location: "Remote",
	    url: "https://jobs.example.test/invalid-posted-at",
	    postedAt: "not-a-real-date",
	    tags: "invalid-date,external"
	  }
	];

try {
  fs.writeFileSync(catalogPath, `${JSON.stringify({ jobs: localJobs }, null, 2)}\n`);
  feedServer = await createFeedServer();
  const feedBaseUrl = `http://127.0.0.1:${feedServer.address().port}`;

  apiProcess = startApi({
    port: await findFreePort(),
    dbPath: path.join(tempDir, "jobs-runtime-ok.sqlite3"),
    sourceUrl: `${feedBaseUrl}/jobs-feed`
  });
  const okBaseUrl = `http://127.0.0.1:${apiProcess.apiPort}`;
  await waitForHealth(okBaseUrl);

  const mergedResponse = await requestJson(`${okBaseUrl}/api/jobs?max=10`);
  validateMergedJobsResponse(mergedResponse);
  const requestCountAfterFirstFetch = okFeedRequests().length;

  const cachedResponse = await requestJson(`${okBaseUrl}/api/jobs?max=10`);
  validateMergedJobsResponse(cachedResponse, "cached");
  if (okFeedRequests().length !== requestCountAfterFirstFetch) {
    fail(`Expected jobs source cache to avoid a second feed request; got ${okFeedRequests().length} feed requests.`);
  }

  const filteredResponse = await requestJson(`${okBaseUrl}/api/jobs`, {
    method: "POST",
    body: { type: "fulltime", max: 2 }
  });
  validateFilteredJobsResponse(filteredResponse);

  await stopProcess(apiProcess);
  apiProcess = startApi({
    port: await findFreePort(),
    dbPath: path.join(tempDir, "jobs-runtime-fallback.sqlite3"),
    sourceUrl: `${feedBaseUrl}/fail-feed`
  });
  const fallbackBaseUrl = `http://127.0.0.1:${apiProcess.apiPort}`;
  await waitForHealth(fallbackBaseUrl);
  const fallbackResponse = await requestJson(`${fallbackBaseUrl}/api/jobs?max=10`);
  validateFallbackJobsResponse(fallbackResponse);

  await stopProcess(apiProcess);
  apiProcess = startApi({
    port: await findFreePort(),
    dbPath: path.join(tempDir, "jobs-runtime-invalid-json.sqlite3"),
    sourceUrl: `${feedBaseUrl}/invalid-json-feed`
  });
  const invalidJsonBaseUrl = `http://127.0.0.1:${apiProcess.apiPort}`;
  await waitForHealth(invalidJsonBaseUrl);
  const invalidJsonResponse = await requestJson(`${invalidJsonBaseUrl}/api/jobs?max=10`);
  validateFallbackJobsResponse(invalidJsonResponse, "invalid JSON fallback");

  await stopProcess(apiProcess);
  apiProcess = startApi({
    port: await findFreePort(),
    dbPath: path.join(tempDir, "jobs-runtime-large-feed.sqlite3"),
    sourceUrl: `${feedBaseUrl}/large-feed`
  });
  const largeFeedBaseUrl = `http://127.0.0.1:${apiProcess.apiPort}`;
  await waitForHealth(largeFeedBaseUrl);
  const largeFeedResponse = await requestJson(`${largeFeedBaseUrl}/api/jobs?max=10`);
  validateFallbackJobsResponse(largeFeedResponse, "large feed fallback");

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    feedRequests: {
      total: feedRequests.length,
      okFeed: okFeedRequests().length,
      failFeed: failFeedRequests().length,
      invalidJsonFeed: invalidJsonFeedRequests().length,
      largeFeed: largeFeedRequests().length,
      tokenAccepted: okFeedRequests().every((request) => request.authorization === `Bearer ${feedToken}`),
      cacheAvoidedSecondFetch: okFeedRequests().length === requestCountAfterFirstFetch
    },
    merged: summarizeJobsResponse(mergedResponse),
    cached: summarizeJobsResponse(cachedResponse),
    filtered: summarizeJobsResponse(filteredResponse),
    fallback: summarizeJobsResponse(fallbackResponse),
    invalidJsonFallback: summarizeJobsResponse(invalidJsonResponse),
    largeFeedFallback: summarizeJobsResponse(largeFeedResponse),
    checks: {
      sourceStatusOk: mergedResponse.data?.sourceStatus === "ok",
      sourceLabelCatalogPlusSource: mergedResponse.data?.source === "catalog+source",
	      sourceJobFirst: mergedResponse.data?.jobs?.[0]?.id === "runtime-source-internship",
	      duplicateIdPrefersSource: findJob(mergedResponse.data?.jobs, "runtime-shared-role")?.title === "Source Feed Quant Researcher",
	      unsafeSourceUrlSanitized: findJob(mergedResponse.data?.jobs, "runtime-unsafe-url")?.url === "#",
	      unknownSourceTypeDefaulted: findJob(mergedResponse.data?.jobs, "runtime-unsafe-url")?.type === "internship",
	      invalidSourcePostedAtSanitized: findJob(mergedResponse.data?.jobs, "runtime-invalid-posted-at")?.postedAt === "crawler-ready",
	      localFallbackJobIncluded: Boolean(findJob(mergedResponse.data?.jobs, "runtime-local-fulltime")),
      postTypeFilterReturnedFulltimeOnly: (filteredResponse.data?.jobs || []).every((job) => job.type === "fulltime"),
      fallbackSourceStatusError: fallbackResponse.data?.sourceStatus === "error",
      fallbackSourceLabel: fallbackResponse.data?.source === "catalog-fallback",
      fallbackReturnedLocalCatalog: Boolean(findJob(fallbackResponse.data?.jobs, "runtime-local-fulltime")),
      invalidJsonFallbackSourceStatusError: invalidJsonResponse.data?.sourceStatus === "error",
      invalidJsonFallbackReturnedLocalCatalog: Boolean(findJob(invalidJsonResponse.data?.jobs, "runtime-local-fulltime")),
      largeFeedFallbackSourceStatusError: largeFeedResponse.data?.sourceStatus === "error",
      largeFeedFallbackReturnedLocalCatalog: Boolean(findJob(largeFeedResponse.data?.jobs, "runtime-local-fulltime"))
    },
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
    feedRequests: {
      total: feedRequests.length,
      okFeed: okFeedRequests().length,
      failFeed: failFeedRequests().length
    },
    apiStdoutTail: tail(apiProcess?.stdoutText || ""),
    apiStderrTail: tail(apiProcess?.stderrText || ""),
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  if (apiProcess) await stopProcess(apiProcess);
  if (feedServer) await closeServer(feedServer);
  if (!keepTemp) fs.rmSync(tempDir, { recursive: true, force: true });
}

function createFeedServer() {
  const server = http.createServer((req, res) => {
    const request = {
      method: req.method,
      url: req.url || "",
      authorization: req.headers.authorization || "",
      userAgent: req.headers["user-agent"] || ""
    };
    feedRequests.push(request);

    if (request.url.startsWith("/fail-feed")) {
      sendJson(res, 500, { error: "simulated jobs feed failure" });
      return;
    }

    if (request.url.startsWith("/invalid-json-feed")) {
      const body = Buffer.from("{ this is not valid jobs json");
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(body.length)
      });
      res.end(body);
      return;
    }

    if (request.url.startsWith("/large-feed")) {
      const body = Buffer.alloc(17000, "x");
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(body.length)
      });
      res.end(body);
      return;
    }

    if (!request.url.startsWith("/jobs-feed")) {
      sendJson(res, 404, { error: "not found" });
      return;
    }

    if (request.authorization !== `Bearer ${feedToken}`) {
      sendJson(res, 401, { error: "bad feed token" });
      return;
    }

    sendJson(res, 200, {
      data: {
        jobs: sourceJobs
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function startApi({ port, dbPath, sourceUrl }) {
  const child = spawn("python3", ["api-server/server.py"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PORT: String(port),
      QUANTGYM_HOST: "127.0.0.1",
      QUANTGYM_DB: dbPath,
      QUANTGYM_JOBS_CATALOG: catalogPath,
      QUANTGYM_JOBS_SOURCE_URL: sourceUrl,
      QUANTGYM_JOBS_SOURCE_TOKEN: feedToken,
      QUANTGYM_JOBS_SOURCE_CACHE_SECONDS: "300",
      QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS: "2",
      QUANTGYM_JOBS_SOURCE_MAX_BYTES: "16384"
    }
  });
  child.apiPort = port;
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => {
    child.stdoutText += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString("utf8");
  });
  return child;
}

async function waitForHealth(baseUrl) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (apiProcess.exitCode != null) {
      throw new Error(`API exited before health check. stderr: ${tail(apiProcess.stderrText || "")}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok === true) return;
    } catch {
      // Keep polling until startup finishes or timeout.
    }
    await delay(200);
  }
  throw new Error("Timed out waiting for API health.");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { rawBody: text };
  }
  return { status: response.status, headers: response.headers, data };
}

function validateMergedJobsResponse(response, label = "merged") {
  if (response.status !== 200) fail(`${label} jobs response should return 200, got ${response.status}.`);
  const data = response.data || {};
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  if (data.source !== "catalog+source") fail(`${label} jobs source should be catalog+source, got ${data.source}.`);
  if (data.sourceStatus !== "ok") fail(`${label} jobs sourceStatus should be ok, got ${data.sourceStatus}.`);
  if (!Array.isArray(data.items) || data.items.length !== jobs.length) fail(`${label} jobs response items should mirror jobs.`);
  if (jobs.length < 3) fail(`${label} jobs response should include source and local catalog jobs, got ${jobs.length}.`);
  if (jobs[0]?.id !== "runtime-source-internship") fail(`${label} first job should come from source feed, got ${jobs[0]?.id}.`);

  const sourceJob = findJob(jobs, "runtime-source-internship");
  if (!sourceJob) fail(`${label} jobs response is missing runtime-source-internship.`);
  if (sourceJob?.tags?.includes("source") !== true) fail(`${label} source string tags should normalize to an array.`);

  const shared = findJob(jobs, "runtime-shared-role");
  if (!shared) fail(`${label} jobs response is missing runtime-shared-role.`);
	  if (shared?.title !== "Source Feed Quant Researcher") fail(`${label} duplicate id should prefer source title, got ${shared?.title}.`);
	  if (shared?.url !== "https://jobs.example.test/source-shared") fail(`${label} duplicate id should prefer source URL, got ${shared?.url}.`);
	  const unsafe = findJob(jobs, "runtime-unsafe-url");
	  if (!unsafe) fail(`${label} jobs response is missing runtime-unsafe-url.`);
	  if (unsafe?.url !== "#") fail(`${label} unsafe source URL should be sanitized to #, got ${unsafe?.url}.`);
	  if (unsafe?.type !== "internship") fail(`${label} unknown source type should default to internship, got ${unsafe?.type}.`);
	  const invalidPostedAt = findJob(jobs, "runtime-invalid-posted-at");
	  if (!invalidPostedAt) fail(`${label} jobs response is missing runtime-invalid-posted-at.`);
	  if (invalidPostedAt?.postedAt !== "crawler-ready") fail(`${label} invalid source postedAt should be sanitized to crawler-ready, got ${invalidPostedAt?.postedAt}.`);
  if (!findJob(jobs, "runtime-local-fulltime")) fail(`${label} jobs response should retain local catalog fallback job.`);
}

function validateFilteredJobsResponse(response) {
  if (response.status !== 200) fail(`filtered jobs response should return 200, got ${response.status}.`);
  const data = response.data || {};
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  if (jobs.length !== 2) fail(`filtered fulltime response should return 2 jobs, got ${jobs.length}.`);
  if (jobs.some((job) => job.type !== "fulltime")) fail("filtered fulltime response included a non-fulltime job.");
  if (!findJob(jobs, "runtime-shared-role")) fail("filtered fulltime response should include source duplicate fulltime job.");
  if (!findJob(jobs, "runtime-local-fulltime")) fail("filtered fulltime response should include local fulltime job.");
}

function validateFallbackJobsResponse(response, label = "fallback") {
  if (response.status !== 200) fail(`${label} jobs response should return 200, got ${response.status}.`);
  const data = response.data || {};
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  if (data.source !== "catalog-fallback") fail(`${label} jobs source should be catalog-fallback, got ${data.source}.`);
  if (data.sourceStatus !== "error") fail(`${label} jobs sourceStatus should be error, got ${data.sourceStatus}.`);
  if (!findJob(jobs, "runtime-local-fulltime")) fail(`${label} jobs response should include local catalog fulltime job.`);
  if (findJob(jobs, "runtime-source-internship")) fail(`${label} jobs response should not include source feed jobs.`);
}

function summarizeJobsResponse(response) {
  const jobs = Array.isArray(response.data?.jobs) ? response.data.jobs : [];
  return {
    statusCode: response.status,
    source: response.data?.source || "",
    sourceStatus: response.data?.sourceStatus || "",
    count: jobs.length,
    firstId: jobs[0]?.id || "",
    ids: jobs.map((job) => job.id).slice(0, 6)
  };
}

function findJob(jobs, id) {
  return Array.isArray(jobs) ? jobs.find((job) => job.id === id) : undefined;
}

function okFeedRequests() {
  return feedRequests.filter((request) => request.url.startsWith("/jobs-feed"));
}

function failFeedRequests() {
  return feedRequests.filter((request) => request.url.startsWith("/fail-feed"));
}

function invalidJsonFeedRequests() {
  return feedRequests.filter((request) => request.url.startsWith("/invalid-json-feed"));
}

function largeFeedRequests() {
  return feedRequests.filter((request) => request.url.startsWith("/large-feed"));
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length)
  });
  res.end(body);
}

function findFreePort() {
  const server = http.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function stopProcess(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode == null) child.kill("SIGKILL");
      resolve();
    }, 2000).unref();
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  failures.push(message);
}

function tail(value, max = 2000) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(-max) : text;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}
