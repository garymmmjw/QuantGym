#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/jobs-feed/publication-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/349-jobs-feed-publication-packet-summary.json");
const feedPath = path.resolve(projectRoot, getArgValue("--feed-out") || path.join(outDir, "public-ats-feed.json"));
const generatorSummaryPath = path.join(outDir, "public-ats-generator-summary.json");
const generatedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const expectedFiles = [
  "README.md",
  "feed-hosting-runbook.md",
  "render-api-env-template.txt",
  "source-list.md",
  "generated-feed-manifest.json",
  "live-signoff-checklist.csv",
  "public-ats-feed.json"
];

try {
  fs.mkdirSync(outDir, { recursive: true });
  const generator = spawnSync(process.execPath, [
    "scripts/build-public-ats-jobs-feed.mjs",
    "--strict",
    "--pretty",
    "--out",
    feedPath,
    "--summary",
    generatorSummaryPath
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (generator.status !== 0) {
    fail(`public ATS feed generator exited ${generator.status || 1}: ${clean(generator.stderr || generator.stdout || "no output")}`);
  }

  const sourceConfig = readJson("data/jobs-feed-sources.json", "jobs feed sources");
  const generatorSummary = readJsonAbsolute(generatorSummaryPath, "public ATS generator summary");
  const feedPayload = readJsonAbsolute(feedPath, "public ATS feed snapshot");
  const feed = validateFeedPayload(feedPayload, generatorSummary);
  const feedSha256 = fs.existsSync(feedPath) ? sha256File(feedPath) : "";
  const packet = buildPacketModel({ sourceConfig, generatorSummary, feed, feedSha256 });

  const files = [
    writePacketFile("README.md", renderOverview(packet)),
    writePacketFile("feed-hosting-runbook.md", renderHostingRunbook(packet)),
    writePacketFile("render-api-env-template.txt", renderEnvTemplate(packet)),
    writePacketFile("source-list.md", renderSourceList(packet)),
    writePacketFile("generated-feed-manifest.json", `${JSON.stringify(packet.feedManifest, null, 2)}\n`),
    writePacketFile("live-signoff-checklist.csv", renderChecklistCsv(packet)),
    path.relative(projectRoot, feedPath)
  ];

  const combinedContent = files
    .filter((file) => file !== path.relative(projectRoot, feedPath))
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");
  const checks = {
    expectedFilesWritten: expectedFiles.every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
    generatorPass: generatorSummary.status === "pass",
    generatedFeedSnapshotWritten: fs.existsSync(feedPath),
    generatedFeedShaMatches: fs.existsSync(feedPath) && sha256File(feedPath) === packet.feedManifest.feedSha256,
    generatedFeedIncludesInternshipAndFulltime: feed.internships > 0 && feed.fulltime > 0,
    generatedFeedHasRealMetadata: feed.defaultedMetadataCount === 0 && feed.invalidUrlCount === 0 && feed.invalidPostedAtCount === 0,
    includesProductionEnvTemplate: combinedContent.includes("QUANTGYM_JOBS_SOURCE_URL")
      && combinedContent.includes("QUANTGYM_JOBS_SOURCE_CACHE_SECONDS"),
    includesHostingRunbook: combinedContent.includes("Feed Hosting Runbook")
      && combinedContent.includes("stable HTTPS URL"),
    includesSourceList: combinedContent.includes("Public ATS Source List")
      && packet.sources.every((source) => combinedContent.includes(source.id)),
    includesLiveSignoffChecklist: combinedContent.includes("run live jobs signoff")
      && combinedContent.includes("npm run check:jobs-source:production -- --live"),
    usesPlaceholderOnlyForOptionalToken: combinedContent.includes("<optional-strong-feed-token>")
      && !combinedContent.includes("quantgym-jobs-production-fixture-token"),
    noCredentialUrlExamples: !/https:\/\/[^/\s"']+:[^@\s"']+@/i.test(combinedContent)
  };

  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) fail(`Packet check failed: ${name}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    generatedAt,
    outDir,
    filesWritten: files,
    feed: packet.feedManifest,
    sources: packet.sources,
    signoffCommand: packet.signoffCommand,
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
    generatedAt,
    outDir,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

function validateFeedPayload(payload, generatorSummary) {
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  if (!jobs.length) fail("Generated jobs feed is empty.");
  if (generatorSummary.status !== "pass") fail("Generator summary did not report pass.");
  if (Number(generatorSummary.output?.count || 0) !== jobs.length) {
    fail("Generator summary count does not match generated feed jobs length.");
  }
  const ids = new Set();
  let internships = 0;
  let fulltime = 0;
  let invalidUrlCount = 0;
  let invalidPostedAtCount = 0;
  let defaultedMetadataCount = 0;
  for (const job of jobs) {
    const id = clean(job.id);
    if (!id) fail("Generated job is missing id.");
    if (ids.has(id)) fail(`Generated jobs feed contains duplicate id: ${id}`);
    ids.add(id);
    if (job.type === "internship") internships += 1;
    if (job.type === "fulltime") fulltime += 1;
    if (!isHttpUrl(job.url)) invalidUrlCount += 1;
    if (!isValidPostedAt(job.postedAt)) invalidPostedAtCount += 1;
    if (job.company === "Quant Firm" || job.title === "Quant Role" || job.postedAt === "crawler-ready") {
      defaultedMetadataCount += 1;
    }
  }
  if (!internships) fail("Generated jobs feed must include at least one internship.");
  if (!fulltime) fail("Generated jobs feed must include at least one fulltime role.");
  if (invalidUrlCount) fail(`Generated jobs feed has invalid URLs: ${invalidUrlCount}`);
  if (invalidPostedAtCount) fail(`Generated jobs feed has invalid postedAt values: ${invalidPostedAtCount}`);
  if (defaultedMetadataCount) fail(`Generated jobs feed has defaulted metadata values: ${defaultedMetadataCount}`);
  return {
    generatedAt: clean(payload.generatedAt),
    generatedBy: clean(payload.generatedBy),
    source: clean(payload.source),
    count: jobs.length,
    internships,
    fulltime,
    firstId: clean(jobs[0]?.id),
    firstPostedAt: clean(jobs[0]?.postedAt),
    invalidUrlCount,
    invalidPostedAtCount,
    defaultedMetadataCount
  };
}

function buildPacketModel({ sourceConfig, generatorSummary, feed, feedSha256 }) {
  const sources = (Array.isArray(sourceConfig.sources) ? sourceConfig.sources : []).map((source) => {
    const summary = (generatorSummary.sources || []).find((item) => item.id === source.id) || {};
    return {
      id: clean(source.id),
      provider: clean(source.provider),
      company: clean(source.company),
      boardToken: clean(source.boardToken),
      url: clean(source.url),
      fetched: Number(summary.fetched || 0),
      kept: Number(summary.kept || 0),
      internships: Number(summary.internships || 0),
      fulltime: Number(summary.fulltime || 0),
      status: clean(summary.status || "unknown")
    };
  });
  return {
    generatedAt,
    sources,
    feedManifest: {
      generatedAt: feed.generatedAt,
      generatedBy: feed.generatedBy,
      source: feed.source,
      feedPath: path.relative(projectRoot, feedPath),
      feedSha256,
      count: feed.count,
      internships: feed.internships,
      fulltime: feed.fulltime,
      firstId: feed.firstId,
      firstPostedAt: feed.firstPostedAt
    },
    signoffCommand: "npm run check:jobs-source:production -- --live"
  };
}

function renderOverview(packet) {
  return [
    "# QuantGym Jobs Feed Publication Packet",
    "",
    "This packet turns the jobs feed blocker into a concrete hosting and production-signoff handoff. It does not mean the feed is already hosted in production.",
    "",
    `Generated at: ${packet.generatedAt}`,
    `Feed snapshot: ${packet.feedManifest.feedPath}`,
    `Feed SHA-256: ${packet.feedManifest.feedSha256}`,
    `Jobs: ${packet.feedManifest.count}`,
    `Internships: ${packet.feedManifest.internships}`,
    `Full-time roles: ${packet.feedManifest.fulltime}`,
    "",
    "## Files",
    "",
    "- `public-ats-feed.json`: generated feed snapshot from checked-in public ATS sources.",
    "- `feed-hosting-runbook.md`: stable HTTPS hosting instructions.",
    "- `render-api-env-template.txt`: production API environment variables.",
    "- `source-list.md`: source boards and current fetch counts.",
    "- `generated-feed-manifest.json`: feed path, SHA-256, counts, and first job metadata.",
    "- `live-signoff-checklist.csv`: spreadsheet-friendly final checklist.",
    "",
    "## Final Signoff",
    "",
    "Host the feed snapshot at a stable HTTPS URL, set the production API variables, then run:",
    "",
    "```bash",
    packet.signoffCommand,
    "```",
    "",
    "The live signoff rejects localhost, private-network, credential-bearing, query-bearing, missing-role, duplicate-id, invalid-URL, defaulted-metadata, invalid-date, invalid-JSON, oversized, and bad-token feeds.",
    ""
  ].join("\n");
}

function renderHostingRunbook(packet) {
  return [
    "# Feed Hosting Runbook",
    "",
    "Publish `public-ats-feed.json` at a stable HTTPS URL that the API can fetch.",
    "",
    "## Recommended Shape",
    "",
    "- URL shape: `https://jobs.quantgym.app/quantgym-jobs-feed.json`",
    "- Content type: `application/json`",
    "- Body shape: `{ \"generatedAt\": \"...\", \"generatedBy\": \"...\", \"source\": \"public-ats-greenhouse\", \"jobs\": [...] }`",
    "- Do not put secrets, credentials, query tokens, or fragments in the URL.",
    "- If the feed is protected, use `QUANTGYM_JOBS_SOURCE_TOKEN` as a bearer token instead of URL credentials.",
    "",
    "## Snapshot Evidence",
    "",
    `- Snapshot path: \`${packet.feedManifest.feedPath}\``,
    `- Snapshot SHA-256: \`${packet.feedManifest.feedSha256}\``,
    `- Snapshot count: \`${packet.feedManifest.count}\` jobs`,
    `- Internship/full-time mix: \`${packet.feedManifest.internships}\` / \`${packet.feedManifest.fulltime}\``,
    "",
    "## Local Host Dry Run",
    "",
    "You can test the exact feed before production hosting with a temporary local HTTP server and `npm run check:jobs-source -- --live --no-dotenv`, but the production signoff must use an externally reachable HTTPS URL.",
    ""
  ].join("\n");
}

function renderEnvTemplate() {
  return [
    "# QuantGym jobs feed production env template.",
    "# Fill these in the API provider dashboard. Do not commit filled values.",
    "",
    "QUANTGYM_JOBS_SOURCE_URL=https://jobs.quantgym.app/quantgym-jobs-feed.json",
    "QUANTGYM_JOBS_SOURCE_TOKEN=<optional-strong-feed-token>",
    "QUANTGYM_JOBS_SOURCE_CACHE_SECONDS=300",
    "QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS=5",
    "QUANTGYM_JOBS_SOURCE_MAX_BYTES=1048576",
    "",
    "# Then run:",
    "npm run check:jobs-source:production -- --live",
    ""
  ].join("\n");
}

function renderSourceList(packet) {
  return [
    "# Public ATS Source List",
    "",
    "These checked-in public Greenhouse boards generated the feed snapshot.",
    "",
    "| Source | Company | Provider | Fetched | Kept | Internships | Full-time |",
    "|---|---|---|---:|---:|---:|---:|",
    ...packet.sources.map((source) => (
      `| ${source.id} | ${source.company} | ${source.provider} | ${source.fetched} | ${source.kept} | ${source.internships} | ${source.fulltime} |`
    )),
    ""
  ].join("\n");
}

function renderChecklistCsv(packet) {
  const rows = [
    ["step", "owner", "evidence", "status"],
    ["generate public ATS feed", "", packet.feedManifest.feedSha256, "complete"],
    ["host feed snapshot", "", "stable HTTPS URL without credentials/query/fragment", "pending"],
    ["configure API env", "", "QUANTGYM_JOBS_SOURCE_URL plus optional bearer token", "pending"],
    ["run production config gate", "", "npm run check:jobs-source:production", "pending"],
    ["run live jobs signoff", "", "npm run check:jobs-source:production -- --live", "pending"],
    ["confirm role mix", "", `${packet.feedManifest.internships} internships / ${packet.feedManifest.fulltime} fulltime in generated snapshot`, "pending"]
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function writePacketFile(relativePath, content) {
  const absolutePath = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  return path.relative(projectRoot, absolutePath);
}

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function readJson(relativePath, label) {
  return readJsonAbsolute(path.join(projectRoot, relativePath), label);
}

function readJsonAbsolute(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidPostedAt(value) {
  const parsed = Date.parse(String(value || ""));
  return !Number.isNaN(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function fail(message) {
  failures.push(message);
}
