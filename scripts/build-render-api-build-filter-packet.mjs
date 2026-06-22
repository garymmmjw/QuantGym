#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(projectRoot, args.outDir || "artifacts/render-api-build-filter/readiness-packet");
const summaryPath = path.resolve(projectRoot, args.summary || "docs/browser-audit-screenshots/358-render-api-build-filter-packet-summary.json");
const generatedAt = new Date().toISOString();
const recommendedPaths = ["api-server/**", "data/**"];
const signoffCommand = "npm run check:render-api-build-filter:production";
const files = [];
const failures = [];

writePacketFile("README.md", renderOverview());
writePacketFile("render-dashboard-checklist.md", renderDashboardChecklist());
writePacketFile("render-cli-command.md", renderCliCommand());
writePacketFile("render-blueprint-snippet.yaml", renderBlueprintSnippet());
writePacketFile("render-api-reference-payload.json", `${JSON.stringify(renderApiPayload(), null, 2)}\n`);
writePacketFile("signoff-env-template.txt", renderSignoffEnvTemplate());
writePacketFile("signoff-checklist.csv", renderChecklistCsv());

const combinedContent = files
  .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
  .join("\n");
const checks = {
  expectedFilesWritten: [
    "README.md",
    "render-dashboard-checklist.md",
    "render-cli-command.md",
    "render-blueprint-snippet.yaml",
    "render-api-reference-payload.json",
    "signoff-env-template.txt",
    "signoff-checklist.csv"
  ].every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
  includesExactRecommendedPaths: recommendedPaths.every((item) => combinedContent.includes(item)),
  excludesDocsFrontendToolingPaths: combinedContent.includes("Do not include `docs/**`, `src/**`, `scripts/**`, `public/**`, `artifacts/**`, or root docs/tooling files"),
  includesDashboardInstructions: combinedContent.includes("Render Dashboard") && combinedContent.includes("Build Filter"),
  includesCliInstructions: combinedContent.includes("Render CLI") && combinedContent.includes("render services update") && combinedContent.includes("--build-filter-path"),
  includesBlueprintSnippet: combinedContent.includes("buildFilter:") && combinedContent.includes("paths:"),
  includesApiReferencePayload: combinedContent.includes("\"buildFilter\"") && combinedContent.includes("\"paths\""),
  includesSignoffCommand: combinedContent.includes(signoffCommand),
  includesEvidenceUrlSafety: combinedContent.includes("HTTPS") && combinedContent.includes("DNS hostname") && combinedContent.includes("no query strings or fragments"),
  includesNoHalfBlueprintWarning: combinedContent.includes("Do not commit a partial `render.yaml`"),
  noFilledSecrets: !/srv-[a-z0-9]{8,}/i.test(combinedContent)
    && !/api[-_]?key/i.test(combinedContent)
    && !combinedContent.includes("token=leaky")
};

for (const [name, value] of Object.entries(checks)) {
  if (value !== true) failures.push(`Packet check failed: ${name}`);
}

const summary = {
  id: 358,
  date: new Date().toISOString().slice(0, 10),
  surface: "Render API build filter readiness packet",
  status: failures.length ? "fail" : "pass",
  generatedAt,
  outDir,
  filesWritten: files,
  recommendedPaths,
  signoffCommand,
  checks,
  failures
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exit(1);

function renderOverview() {
  return [
    "# Render API Build Filter Readiness Packet",
    "",
    "Purpose: prevent docs, frontend-only, and tooling-only commits from auto-deploying and briefly restarting the `quantgym-api` Render service.",
    "",
    "Recommended included paths:",
    "",
    ...recommendedPaths.map((item) => `- \`${item}\``),
    "",
    "With included paths configured, commits outside these API runtime inputs should not deploy `quantgym-api`.",
    "",
    "Do not include `docs/**`, `src/**`, `scripts/**`, `public/**`, `artifacts/**`, or root docs/tooling files unless the API process actually reads them at runtime and the fixture is updated first.",
    "",
    "Do not commit a partial `render.yaml` for this service. A Blueprint can replace service settings, so use it only if it reflects the complete current Render service configuration.",
    "",
    "Configuration options in this packet: Render Dashboard, Render CLI, Render API reference payload, or a complete Render Blueprint.",
    "",
    "Final signoff after configuring Render:",
    "",
    "```bash",
    signoffCommand,
    "```",
    ""
  ].join("\n");
}

function renderDashboardChecklist() {
  return [
    "# Render Dashboard Build Filter Checklist",
    "",
    "1. Open the Render Dashboard service `quantgym-api`.",
    "2. Find Settings -> Build & Deploy -> Build Filter.",
    "3. Configure included paths exactly:",
    "",
    ...recommendedPaths.map((item) => `   - \`${item}\``),
    "",
    "4. Do not add ignored paths as a substitute for the included-path allowlist.",
    "5. Save the setting.",
    "6. Trigger a docs-only or frontend-only commit only after the build filter is live, then confirm `quantgym-api` does not restart.",
    "7. Record an HTTPS evidence URL from the Render Dashboard. The URL must use a DNS hostname and must have no embedded credentials, no query strings or fragments.",
    ""
  ].join("\n");
}

function renderCliCommand() {
  return [
    "# Render CLI Build Filter Command",
    "",
    "Use this only from a machine where the Render CLI is already installed and authenticated.",
    "",
    "Reference:",
    "",
    "- https://render.com/docs/cli-reference",
    "",
    "Recommended command:",
    "",
    "```bash",
    "render services update quantgym-api \\",
    ...recommendedPaths.map((item, index) => `  --build-filter-path ${quoteShell(item)}${index === recommendedPaths.length - 1 ? "" : " \\"}`),
    "```",
    "",
    "After the command completes:",
    "",
    "1. Reopen the Render Dashboard service `quantgym-api`.",
    "2. Confirm the included Build Filter paths are exactly `api-server/**` and `data/**`.",
    "3. Confirm `docs/**`, `src/**`, `scripts/**`, `public/**`, and `artifacts/**` are not included.",
    "4. Record an HTTPS Render Dashboard evidence URL with a DNS hostname and no query strings or fragments.",
    "5. Run the production signoff with `QUANTGYM_RENDER_API_BUILD_FILTER_METHOD=cli`.",
    ""
  ].join("\n");
}

function renderBlueprintSnippet() {
  return [
    "# Reference only. Do not commit this partial Blueprint unless the complete Render service config is represented.",
    "services:",
    "  - type: web",
    "    name: quantgym-api",
    "    buildFilter:",
    "      paths:",
    ...recommendedPaths.map((item) => `        - ${item}`),
    ""
  ].join("\n");
}

function renderApiPayload() {
  return {
    service: "quantgym-api",
    buildFilter: {
      paths: recommendedPaths
    },
    warning: "Reference shape only. Confirm the current Render API schema before applying."
  };
}

function renderSignoffEnvTemplate() {
  return [
    "# Fill these locally after the Render build filter is live. Do not commit filled values.",
    "QUANTGYM_RENDER_API_BUILD_FILTER_CONFIRMED=1",
    "# Allowed methods: dashboard, cli, api, blueprint.",
    "QUANTGYM_RENDER_API_BUILD_FILTER_METHOD=dashboard",
    "QUANTGYM_RENDER_API_BUILD_FILTER_SERVICE=quantgym-api",
    `QUANTGYM_RENDER_API_BUILD_FILTER_PATHS=${recommendedPaths.join(",")}`,
    "QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL=https://dashboard.render.com/web/<service-id>/settings",
    "QUANTGYM_RENDER_API_BUILD_FILTER_NOTES=Render quantgym-api build filter includes api-server/** and data/** so docs/frontend/tooling commits do not restart the API.",
    "",
    signoffCommand,
    ""
  ].join("\n");
}

function renderChecklistCsv() {
  const rows = [
    ["step", "evidence", "status"],
    ["open quantgym-api Render service settings", "", "pending"],
    ["set included paths api-server/** and data/**", "", "pending"],
    ["verify docs/src/scripts/public/artifacts are not included", "", "pending"],
    ["save build filter", "", "pending"],
    ["run production signoff command", signoffCommand, "pending"],
    ["run deployed beta readiness after next main push", "npm run check:deployed-beta-smoke -- --expected-commit HEAD --readiness-only", "pending"]
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function writePacketFile(name, content) {
  const absolutePath = path.join(outDir, name);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
  files.push(path.relative(projectRoot, absolutePath));
}

function csvCell(value) {
  const text = String(value || "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function quoteShell(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--out-dir") {
      parsed.outDir = argv[index + 1] || "";
      index += 1;
    } else if (value === "--summary") {
      parsed.summary = argv[index + 1] || "";
      index += 1;
    }
  }
  return parsed;
}
