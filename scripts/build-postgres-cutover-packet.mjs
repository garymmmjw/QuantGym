#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/postgres-cutover/readiness-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/350-postgres-cutover-packet-summary.json");
const generatedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const expectedFiles = [
  "README.md",
  "secure-export-runbook.md",
  "postgres-import-runbook.md",
  "cutover-signoff-env-template.txt",
  "rollback-and-backup-checklist.md",
  "live-cutover-checklist.csv"
];

try {
  const exportSmoke = readJson(
    "docs/browser-audit-screenshots/331-postgres-cutover-export-smoke-summary.json",
    "Postgres cutover export smoke"
  );
  if (exportSmoke.status !== "pass") warnings.push("Postgres cutover export smoke is not currently passing.");

  const packet = buildPacketModel(exportSmoke);
  const files = [
    writePacketFile("README.md", renderOverview(packet)),
    writePacketFile("secure-export-runbook.md", renderSecureExportRunbook(packet)),
    writePacketFile("postgres-import-runbook.md", renderPostgresImportRunbook(packet)),
    writePacketFile("cutover-signoff-env-template.txt", renderSignoffEnvTemplate(packet)),
    writePacketFile("rollback-and-backup-checklist.md", renderRollbackChecklist(packet)),
    writePacketFile("live-cutover-checklist.csv", renderChecklistCsv(packet))
  ];

  const combinedContent = files
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");
  const checks = {
    expectedFilesWritten: expectedFiles.every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
    includesSecureExportRunbook: combinedContent.includes("Secure Export Runbook")
      && combinedContent.includes("scripts/export-api-sqlite.py")
      && combinedContent.includes("--include-sensitive"),
    includesPostgresImportRunbook: combinedContent.includes("Postgres Import Runbook")
      && combinedContent.includes("scripts/import-api-sqlite-export-to-postgres.py")
      && combinedContent.includes("--confirm-replace"),
    includesSignoffEnvTemplate: combinedContent.includes("QUANTGYM_POSTGRES_CUTOVER_STATUS=complete")
      && combinedContent.includes("QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT"),
    includesRawIpEvidenceUrlRule: combinedContent.includes("DNS hostname")
      && combinedContent.includes("raw IP"),
    includesRollbackBackupChecklist: combinedContent.includes("Rollback and Backup Checklist")
      && combinedContent.includes("backup confirmation"),
    includesLiveCutoverChecklist: combinedContent.includes("run complete cutover signoff")
      && combinedContent.includes("npm run check:postgres-cutover:complete"),
    includesCompleteSignoffCommand: combinedContent.includes(packet.signoffCommand)
      && packet.signoffCommand === 'npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json',
    usesPlaceholdersOnlyForSensitivePaths: combinedContent.includes("/secure/quantgym-sqlite-export.json")
      && combinedContent.includes("<managed-postgres-host>")
      && !combinedContent.includes("postgres://")
      && !combinedContent.includes("DATABASE_URL="),
    noCredentialUrlExamples: !/https:\/\/[^/\s"']+:[^@\s"']+@/i.test(combinedContent),
    exportSmokePass: exportSmoke.status === "pass",
    includeSensitiveAccepted: exportSmoke.cutoverChecks?.includeSensitiveAccepted === true,
    importSqlGenerated: exportSmoke.cutoverChecks?.postgresImportSqlGenerated === true,
    importSqlContainsTransaction: exportSmoke.cutoverChecks?.postgresImportSqlContainsTransaction === true,
    rejectsUnsafeExports: exportSmoke.cutoverChecks?.postgresImportRejectsRedactedExport === true
      && exportSmoke.cutoverChecks?.postgresImportRejectsTruncatedExport === true,
    completeSignoffFixturePass: exportSmoke.cutoverChecks?.completeSignoffAccepted === true,
    completeSignoffNegativeFixturesRejected: exportSmoke.cutoverChecks?.completeSignoffNegativeFixturesRejected === true,
    completeSignoffRejectsRawIpTarget: exportSmoke.cutoverChecks?.publicIpTargetHostRejected === true,
    completeSignoffRejectsUnsafeEvidence: exportSmoke.cutoverChecks?.privateEvidenceUrlRejected === true
      && exportSmoke.cutoverChecks?.evidenceUrlRawIpRejected === true
      && exportSmoke.cutoverChecks?.evidenceUrlEmbeddedCredentialsRejected === true
      && exportSmoke.cutoverChecks?.evidenceUrlQueryRejected === true
  };

  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) fail(`Packet check failed: ${name}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    generatedAt,
    outDir,
    filesWritten: files,
    evidence: {
      exportSmokePass: exportSmoke.status === "pass",
      tableCount: Number(exportSmoke.importPlan?.tableCount || 0),
      rowTables: Number(exportSmoke.importPlan?.rowTables || 0),
      smokeRowCount: Number(exportSmoke.importPlan?.rowCount || 0),
      postgresImportSqlGenerated: exportSmoke.cutoverChecks?.postgresImportSqlGenerated === true,
      completeSignoffNegativeFixtureCount: Number(exportSmoke.completeSignoffNegativeFixtures?.length || 0)
    },
    requiredEnv: packet.requiredEnv.map((item) => item.name),
    migrationInputs: packet.migrationInputs,
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

function buildPacketModel(exportSmoke) {
  return {
    generatedAt,
    requiredEnv: [
      ["QUANTGYM_POSTGRES_CUTOVER_STATUS", "Set to complete only after the deployed API is using managed Postgres."],
      ["QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST", "Managed Postgres DNS host name only, not a DSN or IP address."],
      ["QUANTGYM_POSTGRES_CUTOVER_DATABASE", "Plain database name."],
      ["QUANTGYM_POSTGRES_CUTOVER_COMPLETED_AT", "Non-future ISO timestamp for the cutover completion."],
      ["QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL", "Externally reachable HTTPS evidence URL with a DNS hostname, not a raw IP address, and without credentials, query, or fragment."],
      ["QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256", "SHA-256 of the SQLite source DB used for the export."],
      ["QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256", "SHA-256 of the include-sensitive SQLite export used for import."],
      ["QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT", "Managed Postgres row count matching the import plan row count."],
      ["QUANTGYM_POSTGRES_CUTOVER_APP_DATABASE_ACTIVE", "Set to 1/true/yes/confirmed after the app uses Postgres."],
      ["QUANTGYM_POSTGRES_CUTOVER_BACKUP_CONFIRMED", "Set to 1/true/yes/confirmed after backup and rollback evidence is captured."]
    ].map(([name, description]) => ({ name, description })),
    migrationInputs: {
      sqliteDbPath: "$QUANTGYM_DB",
      secureExportPath: "/secure/quantgym-sqlite-export.json",
      postgresImportSqlPath: "/secure/quantgym-postgres-import.sql",
      schemaPath: "api-server/postgres/schema.sql",
      smokeTableCount: Number(exportSmoke.importPlan?.tableCount || 0),
      smokeRowCount: Number(exportSmoke.importPlan?.rowCount || 0)
    },
    exportSmokePass: exportSmoke.status === "pass",
    importSqlGenerated: exportSmoke.cutoverChecks?.postgresImportSqlGenerated === true,
    negativeFixtureCount: Number(exportSmoke.completeSignoffNegativeFixtures?.length || 0),
    signoffCommand: 'npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json'
  };
}

function renderOverview(packet) {
  return [
    "# QuantGym Postgres Cutover Readiness Packet",
    "",
    "This packet turns the managed Postgres cutover blocker into a concrete migration-window handoff. It does not contain production data, database URLs, or credentials.",
    "",
    `Generated at: ${packet.generatedAt}`,
    `Export smoke currently passing: ${packet.exportSmokePass ? "yes" : "no"}`,
    `Import SQL generator covered by smoke: ${packet.importSqlGenerated ? "yes" : "no"}`,
    `Complete-signoff negative fixtures covered: ${packet.negativeFixtureCount}`,
    "",
    "## Files",
    "",
    "- `secure-export-runbook.md`: protected full SQLite export and hash steps.",
    "- `postgres-import-runbook.md`: generated SQL review and guarded psql execution steps.",
    "- `cutover-signoff-env-template.txt`: final signoff variables to fill after the app is on Postgres.",
    "- `rollback-and-backup-checklist.md`: backup, rollback, and evidence checks.",
    "- `live-cutover-checklist.csv`: spreadsheet-friendly migration window checklist.",
    "",
    "## Final Signoff",
    "",
    "After the managed Postgres import is complete and the deployed API is pointed at that database, fill real values in the provider or shell environment, then run:",
    "",
    "```bash",
    packet.signoffCommand,
    "```",
    "",
    "The filled environment must not be committed. The gate rejects redacted or truncated exports, localhost/private/raw-IP target hosts, malformed database names, mismatched source/export hashes, row-count mismatch, inactive app DB state, missing backup confirmation, and private/raw-IP/credential/query-bearing evidence URLs. Evidence URLs must use HTTPS DNS hostnames.",
    ""
  ].join("\n");
}

function renderSecureExportRunbook(packet) {
  return [
    "# Secure Export Runbook",
    "",
    "Create the migration input from the current production SQLite DB in a protected location. The export is sensitive because it contains password/session hashes and user data.",
    "",
    "## Preflight",
    "",
    "```bash",
    "npm run check:postgres-cutover",
    "```",
    "",
    "## Protected Full Export",
    "",
    "```bash",
    `python3 scripts/export-api-sqlite.py --db "${packet.migrationInputs.sqliteDbPath}" --out ${packet.migrationInputs.secureExportPath} --include-sensitive`,
    `python3 scripts/check-postgres-cutover.py --db "${packet.migrationInputs.sqliteDbPath}" --export ${packet.migrationInputs.secureExportPath} --require-sensitive-export`,
    "shasum -a 256 \"$QUANTGYM_DB\"",
    `shasum -a 256 ${packet.migrationInputs.secureExportPath}`,
    "```",
    "",
    "## Required Properties",
    "",
    "- Export must be generated with `--include-sensitive`.",
    "- Export must not be `--summary-only`.",
    "- Export must not use `--max-rows-per-table`.",
    "- Export must contain every table and row needed by the Postgres schema.",
    "- Store the export only in protected infrastructure, never in Git.",
    "",
    `Smoke fixture currently covers ${packet.migrationInputs.smokeTableCount} tables and ${packet.migrationInputs.smokeRowCount} seeded rows.`,
    ""
  ].join("\n");
}

function renderPostgresImportRunbook(packet) {
  return [
    "# Postgres Import Runbook",
    "",
    "Generate the SQL import from the protected include-sensitive export, review it, then execute against the managed Postgres target during the migration window.",
    "",
    "## Generate and Review SQL",
    "",
    "```bash",
    `python3 scripts/import-api-sqlite-export-to-postgres.py --export ${packet.migrationInputs.secureExportPath} --out ${packet.migrationInputs.postgresImportSqlPath} --replace`,
    "```",
    "",
    "The generated SQL is sensitive and should stay in the same protected storage boundary as the export. Review that it begins with `BEGIN;`, contains the expected table order, and ends with `COMMIT;` before execution.",
    "",
    "## Execute After Review",
    "",
    "```bash",
    `python3 scripts/import-api-sqlite-export-to-postgres.py --export ${packet.migrationInputs.secureExportPath} --out ${packet.migrationInputs.postgresImportSqlPath} --replace --execute --database-url "$QUANTGYM_POSTGRES_DATABASE_URL" --confirm-replace`,
    "```",
    "",
    "Use `--replace --confirm-replace` only for the approved cutover target. Do not paste or commit the managed database URL.",
    "",
    "## Post-Import",
    "",
    "- Confirm target row count from the managed Postgres database.",
    "- Point the deployed API at managed Postgres.",
    "- Run API health and release-readiness checks after deployment.",
    "- Keep the SQLite source DB and export available for rollback until the cutover is accepted.",
    ""
  ].join("\n");
}

function renderSignoffEnvTemplate(packet) {
  return [
    "# QuantGym Postgres cutover signoff env template.",
    "# Fill these only after the managed Postgres import is complete and the deployed API is using that DB.",
    "# Do not commit filled values.",
    "# Evidence URL must use an HTTPS DNS hostname, not a raw IP address.",
    "",
    "QUANTGYM_POSTGRES_CUTOVER_STATUS=complete",
    "QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST=<managed-postgres-host>",
    "QUANTGYM_POSTGRES_CUTOVER_DATABASE=quantgym",
    "QUANTGYM_POSTGRES_CUTOVER_COMPLETED_AT=<cutover-completed-at-iso>",
    "QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL=https://<external-deployment-or-runbook-evidence-url>",
    "QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256=<sqlite-source-db-sha256>",
    "QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256=<include-sensitive-export-sha256>",
    "QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT=<managed-postgres-row-count>",
    "QUANTGYM_POSTGRES_CUTOVER_APP_DATABASE_ACTIVE=confirmed",
    "QUANTGYM_POSTGRES_CUTOVER_BACKUP_CONFIRMED=confirmed",
    "",
    "# Then run:",
    packet.signoffCommand,
    ""
  ].join("\n");
}

function renderRollbackChecklist() {
  return [
    "# Rollback and Backup Checklist",
    "",
    "Capture backup confirmation before declaring the cutover complete.",
    "",
    "## Before Import",
    "",
    "- Confirm the current SQLite DB file is copied to protected backup storage.",
    "- Record the SQLite source DB SHA-256.",
    "- Record the include-sensitive export SHA-256.",
    "- Confirm who can restore the previous deployment DB setting.",
    "",
    "## During Cutover",
    "",
    "- Pause writes or keep the migration window short enough that source and target row counts can be reconciled.",
    "- Execute the reviewed import SQL only against the approved managed Postgres target.",
    "- Capture target row counts after import.",
    "- Switch the deployed API database configuration.",
    "",
    "## Rollback",
    "",
    "- If API health, auth, or release-readiness checks fail after the switch, restore the previous DB configuration.",
    "- Keep the source SQLite DB, export, and generated import SQL until the rollback window closes.",
    "- Record backup confirmation and rollback decision evidence in the final signoff URL.",
    ""
  ].join("\n");
}

function renderChecklistCsv(packet) {
  const rows = [
    ["step", "owner", "evidence", "status"],
    ["run schema/data preflight", "", "npm run check:postgres-cutover", "pending"],
    ["create protected include-sensitive export", "", packet.migrationInputs.secureExportPath, "pending"],
    ["verify protected export", "", "python3 scripts/check-postgres-cutover.py --require-sensitive-export", "pending"],
    ["record source DB SHA-256", "", "QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256", "pending"],
    ["record export SHA-256", "", "QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256", "pending"],
    ["generate import SQL", "", packet.migrationInputs.postgresImportSqlPath, "pending"],
    ["review import SQL transaction", "", "BEGIN and COMMIT present", "pending"],
    ["execute guarded Postgres import", "", "--execute --confirm-replace", "pending"],
    ["confirm target row count", "", "QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT", "pending"],
    ["switch deployed API database", "", "app database active confirmed", "pending"],
    ["record evidence URL", "", "HTTPS DNS-hostname URL without raw IP, credentials, or query", "pending"],
    ["capture backup confirmation", "", "backup confirmation", "pending"],
    ["run complete cutover signoff", "", packet.signoffCommand, "pending"]
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
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
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

function fail(message) {
  failures.push(message);
}
