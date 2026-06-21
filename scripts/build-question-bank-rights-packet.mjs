#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const mode = getArgValue("--mode") || "commercial";
const allowedModes = new Set(["public", "commercial"]);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/question-bank-rights/public-commercial-approval-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/345-question-bank-rights-packet-summary.json");
const catalogManifestPath = path.join(projectRoot, "data/question-banks/catalog-manifest.json");
const rightsManifestPath = path.join(projectRoot, "data/question-banks/source-rights-manifest.json");
const releaseBlockersPath = path.join(projectRoot, "docs/browser-audit-screenshots/340-question-bank-rights-release-blockers-summary.json");
const generatedAt = new Date().toISOString();
const publicScopes = ["public-web", "redistribution", "compiled-catalog", "derived-adaptation"];
const commercialScopes = [...publicScopes, "commercial-use"];
const finalSignoffCommand = "npm run check:question-bank-rights:public && npm run check:question-bank-rights:commercial";
const releaseBlockerCommand = "npm run check:question-bank-rights:release-blockers";
const packetBuildCommand = "npm run build:question-bank-rights-packet";
const failures = [];
const warnings = [];

try {
  if (!allowedModes.has(mode)) fail(`Unsupported --mode ${JSON.stringify(mode)}. Use public or commercial.`);
  const catalogManifest = readJson(catalogManifestPath, "catalog manifest");
  const rightsManifest = readJson(rightsManifestPath, "source rights manifest");
  const releaseBlockers = readJson(releaseBlockersPath, "question-bank release blockers");
  const catalogSources = Array.isArray(catalogManifest.sources) ? catalogManifest.sources : [];
  const rightsSources = Array.isArray(rightsManifest.sources) ? rightsManifest.sources : [];
  const catalogBySlug = new Map(catalogSources.map((source) => [clean(source.slug), source]));
  const activeRightsSources = rightsSources.filter((source) => source.expectedActive === true);
  const blockedSources = activeRightsSources
    .filter((source) => clean(source.publicCommercial?.status) !== "approved")
    .map((rights) => buildSourcePacketModel(rights, catalogBySlug.get(clean(rights.slug)) || {}))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (!blockedSources.length) fail("No active question-bank public/commercial blockers found.");
  if (releaseBlockers.status !== "pass" || releaseBlockers.releaseBlocked !== true) {
    warnings.push("Release blocker summary was not in the expected pass-but-blocked state.");
  }

  const requiredScopes = mode === "commercial" ? commercialScopes : publicScopes;
  const readme = renderOverview(blockedSources, releaseBlockers);
  const trackerCsv = renderTrackerCsv(blockedSources);
  const manifestDraft = renderManifestDraft(blockedSources);
  const manifestDraftJson = `${JSON.stringify(manifestDraft, null, 2)}\n`;
  const sourcePackets = blockedSources.map((source) => ({
    source,
    relativePath: `sources/${source.slug}.md`,
    content: renderSourceMarkdown(source)
  }));

  fs.mkdirSync(path.join(outDir, "sources"), { recursive: true });
  const files = [];
  files.push(writePacketFile("README.md", readme));
  files.push(writePacketFile("rights-evidence-tracker.csv", trackerCsv));
  files.push(writePacketFile("manifest-draft.json", manifestDraftJson));
  for (const packet of sourcePackets) {
    files.push(writePacketFile(packet.relativePath, packet.content));
  }
  const sourceSlugs = blockedSources.map((source) => source.slug);
  const trackerRowCount = trackerCsv.trim().split("\n").length - 1;

  const summary = {
    status: failures.length ? "fail" : "pass",
    generatedAt,
    mode,
    outDir,
    signoffCommand: finalSignoffCommand,
    supportingCommands: {
      releaseBlockers: releaseBlockerCommand,
      rebuildPacket: packetBuildCommand
    },
    releaseBlockerSummaryPath: path.relative(projectRoot, releaseBlockersPath),
    blockedSourceCount: blockedSources.length,
    activeSourceCount: activeRightsSources.length,
    sourcePacketCount: sourcePackets.length,
    manifestDraftSourceCount: manifestDraft.sources.length,
    trackerRowCount,
    releaseBlocked: releaseBlockers.releaseBlocked === true,
    publicFailureCount: releaseBlockers.publicRelease?.failureCount || 0,
    commercialFailureCount: releaseBlockers.commercialRelease?.failureCount || 0,
    requiredScopes,
    filesWritten: files,
    sources: blockedSources.map((source) => ({
      slug: source.slug,
      name: source.name,
      type: source.type,
      problemCount: source.problemCount,
      currentStatus: source.currentStatus,
      sourceUrlCount: source.sourceUrls.length,
      packetPath: path.relative(projectRoot, path.join(outDir, "sources", `${source.slug}.md`))
    })),
    checks: {
      allActiveSourcesHavePackets: blockedSources.length === activeRightsSources.length,
      sourcePacketCountMatchesBlockedSources: sourcePackets.length === blockedSources.length,
      manifestDraftEntriesMatchPackets: manifestDraft.sources.length === blockedSources.length,
      trackerRowsMatchPackets: trackerRowCount === blockedSources.length,
      filesIncludeOverviewTrackerAndManifestDraft: ["README.md", "rights-evidence-tracker.csv", "manifest-draft.json"]
        .every((relativePath) => files.includes(path.relative(projectRoot, path.join(outDir, relativePath)))),
      includesCommercialUseScope: mode === "commercial" && commercialScopes.includes("commercial-use"),
      packetIncludesCompleteSignoffCommand: readme.includes(finalSignoffCommand),
      packetIncludesReleaseBlockerCommand: readme.includes(releaseBlockerCommand),
      packetIncludesEvidenceUrlSafetyRules: readme.includes("Evidence URLs must be HTTPS, public, and free of embedded credentials, query strings, or fragments."),
      packetIncludesRawIpEvidenceUrlRule: readme.includes("DNS hostnames rather than raw IP addresses"),
      packetRequiresExternalPermissionGrantor: readme.includes("external rights holder or authorized representative")
        && readme.includes("not QuantGym or an internal self-approval"),
      sourcePacketsIncludeOutreachAndDrafts: sourcePackets.every((packet) => packet.content.includes("## Outreach Template") && packet.content.includes("## Manifest Draft")),
      sourcePacketsListRequiredScopes: sourcePackets.every((packet) => requiredScopes.every((scope) => packet.content.includes(`- ${scope}`))),
      manifestDraftEntriesContainTodoPlaceholders: manifestDraft.sources.every((entry) => draftContainsTodoPlaceholders(entry.publicCommercial)),
      releaseBlockersMatchPacketSources: sameList(releaseBlockers.blockerSlugs?.public || [], sourceSlugs)
        && sameList(releaseBlockers.blockerSlugs?.commercial || [], sourceSlugs)
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
    generatedAt,
    mode,
    outDir,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

function buildSourcePacketModel(rights, catalog) {
  const slug = clean(rights.slug);
  const name = clean(catalog.name || slug);
  const sourceUrls = collectSourceUrls(catalog);
  return {
    slug,
    name,
    type: clean(catalog.type || "unknown"),
    problemCount: Number(rights.expectedProblemCount || catalog.problemCount || 0),
    allowedCatalogVisibility: Array.isArray(rights.allowedCatalogVisibility) ? rights.allowedCatalogVisibility.map(clean).filter(Boolean) : [],
    currentStatus: clean(rights.publicCommercial?.status || ""),
    basis: clean(rights.publicCommercial?.basis || ""),
    requiredNextStep: clean(rights.publicCommercial?.requiredNextStep || ""),
    privateBetaBasis: clean(rights.privateBeta?.basis || ""),
    privateBetaReviewedAt: clean(rights.privateBeta?.reviewedAt || ""),
    sourceUrls,
    sourcePaths: collectSourcePaths(catalog),
    rightsNote: clean(catalog.rightsNote || catalog.privacyNote || ""),
    draftApproval: buildDraftApproval()
  };
}

function buildDraftApproval() {
  return {
    status: "approved",
    approvalType: "direct-permission",
    redistributionScope: mode === "commercial" ? commercialScopes : publicScopes,
    basis: "TODO: replace with a concise basis for why this source is approved for the requested release.",
    reviewedBy: "TODO: reviewer name or role",
    reviewedAt: "YYYY-MM-DD",
    evidenceUrl: "https://TODO.example/approval-evidence",
    evidenceSummary: "TODO: summarize the permission/license evidence in at least 40 characters.",
    permissionGrantor: "TODO: rights holder, publisher, course owner, or authorized platform representative"
  };
}

function collectSourceUrls(catalog) {
  const keys = ["sourceUrl", "sourceZipUrl", "repoUrl", "problemHtmlUrl", "problemPdfUrl"];
  const urls = [];
  for (const key of keys) {
    if (clean(catalog[key])) urls.push({ label: key, url: clean(catalog[key]) });
  }
  if (Array.isArray(catalog.sourcePageUrls)) {
    catalog.sourcePageUrls.forEach((url, index) => {
      if (clean(url)) urls.push({ label: `sourcePageUrls[${index}]`, url: clean(url) });
    });
  }
  return urls;
}

function collectSourcePaths(catalog) {
  return Object.entries(catalog)
    .filter(([key, value]) => /Path$/.test(key) && clean(value))
    .map(([key, value]) => ({ label: key, path: clean(value) }));
}

function renderOverview(sources, releaseBlockers) {
  const requiredScopes = mode === "commercial" ? commercialScopes : publicScopes;
  return [
    "# QuantGym Question-Bank Rights Approval Packet",
    "",
    "This packet is a workflow artifact, not legal advice. It turns the current public/commercial release blockers into per-source review tasks.",
    "",
    `Generated at: ${generatedAt}`,
    `Target mode: ${mode}`,
    `Blocked active sources: ${sources.length}`,
    `Public failure count: ${releaseBlockers.publicRelease?.failureCount || 0}`,
    `Commercial failure count: ${releaseBlockers.commercialRelease?.failureCount || 0}`,
    "",
    "## Required Manifest Fields",
    "",
    "Each approved `publicCommercial` entry must include:",
    "",
    "- `status: \"approved\"`",
    "- `approvalType`: one of `direct-permission`, `open-license`, `public-domain`, `owned-original`",
    `- \`redistributionScope\`: ${requiredScopes.map((scope) => `\`${scope}\``).join(", ")}`,
    "- `basis`, `reviewedBy`, `reviewedAt`, `evidenceUrl`, `evidenceSummary`",
    "- `permissionGrantor` for direct permission, or license/owner fields for other approval types",
    "- Direct-permission `permissionGrantor` must name an external rights holder or authorized representative, not QuantGym or an internal self-approval.",
    "",
    "## Signoff Commands",
    "",
    `- Final public/commercial signoff: \`${finalSignoffCommand}\``,
    `- Refresh release-blocker evidence: \`${releaseBlockerCommand}\``,
    `- Rebuild this packet: \`${packetBuildCommand}\``,
    "",
    "## Evidence URL Safety Rules",
    "",
    "Evidence URLs must be HTTPS, public, and free of embedded credentials, query strings, or fragments.",
    "Use DNS hostnames rather than raw IP addresses, and do not record localhost, private-network, expiring-token, or secret-bearing links in `source-rights-manifest.json`.",
    "",
    "## Files",
    "",
    "- `rights-evidence-tracker.csv`: spreadsheet-friendly tracker.",
    "- `manifest-draft.json`: non-authoritative draft snippets with placeholders.",
    "- `sources/*.md`: per-source context and outreach template.",
    "",
    "## Source Packets",
    "",
    ...sources.map((source) => `- [${source.slug}](sources/${source.slug}.md): ${source.name} (${source.problemCount} problems)`),
    ""
  ].join("\n");
}

function renderSourceMarkdown(source) {
  const urls = source.sourceUrls.length
    ? source.sourceUrls.map((item) => `- ${item.label}: ${item.url}`).join("\n")
    : "- No public URL recorded in catalog manifest.";
  const paths = source.sourcePaths.length
    ? source.sourcePaths.map((item) => `- ${item.label}: ${item.path}`).join("\n")
    : "- No local source path recorded.";
  return [
    `# ${source.slug}`,
    "",
    `Name: ${source.name}`,
    `Type: ${source.type}`,
    `Problem count: ${source.problemCount}`,
    `Allowed catalog visibility: ${source.allowedCatalogVisibility.join(", ") || "none recorded"}`,
    `Current publicCommercial status: ${source.currentStatus}`,
    "",
    "## Current Manifest Basis",
    "",
    source.basis || "No current basis recorded.",
    "",
    "## Required Next Step",
    "",
    source.requiredNextStep || "Record explicit approval evidence or remove/replace this source before release.",
    "",
    "## Source URLs",
    "",
    urls,
    "",
    "## Local Source Paths",
    "",
    paths,
    "",
    "## Existing Notes",
    "",
    source.rightsNote || source.privateBetaBasis || "No additional notes recorded.",
    "",
    "## Outreach Template",
    "",
    "Subject: Permission request for QuantGym question-bank source",
    "",
    `Hello, I am reviewing whether QuantGym may include adapted practice problems from \"${source.name}\" in a ${mode} release.`,
    "",
    "Could you confirm whether QuantGym has permission to redistribute compiled/adapted practice prompts and non-official explanations derived from this source on the public web, including the scopes listed below?",
    "",
    ...(mode === "commercial" ? commercialScopes : publicScopes).map((scope) => `- ${scope}`),
    "",
    "If approved, please provide the external grantor name/role, any license terms, and an evidence URL or written approval record that can be stored without secrets or query tokens.",
    "",
    "## Manifest Draft",
    "",
    "Do not paste this draft until every TODO is replaced with real evidence.",
    "",
    "```json",
    JSON.stringify({ slug: source.slug, publicCommercial: source.draftApproval }, null, 2),
    "```",
    ""
  ].join("\n");
}

function renderTrackerCsv(sources) {
  const headers = [
    "slug",
    "name",
    "type",
    "problemCount",
    "currentStatus",
    "approvalType",
    "permissionGrantor",
    "reviewedBy",
    "reviewedAt",
    "evidenceUrl",
    "evidenceSummary",
    "decision"
  ];
  const rows = sources.map((source) => [
    source.slug,
    source.name,
    source.type,
    String(source.problemCount),
    source.currentStatus,
    "direct-permission",
    "",
    "",
    "",
    "",
    "",
    "pending"
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function renderManifestDraft(sources) {
  return {
    generatedAt,
    mode,
    note: "Draft only. Replace TODO values and review each source before editing source-rights-manifest.json.",
    sources: sources.map((source) => ({
      slug: source.slug,
      publicCommercial: source.draftApproval
    }))
  };
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

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
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

function draftContainsTodoPlaceholders(publicCommercial = {}) {
  return [
    publicCommercial.basis,
    publicCommercial.reviewedBy,
    publicCommercial.evidenceUrl,
    publicCommercial.evidenceSummary,
    publicCommercial.permissionGrantor
  ].every((value) => String(value || "").includes("TODO"))
    && String(publicCommercial.reviewedAt || "") === "YYYY-MM-DD";
}

function sameList(left, right) {
  const normalize = (items) => [...items].map(clean).filter(Boolean).sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function fail(message) {
  failures.push(message);
}
