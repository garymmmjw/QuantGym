#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/331-postgres-cutover-export-smoke-summary.json";
const keepTemp = args.includes("--keep-temp");
const startedAt = Date.now();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-postgres-export-"));
const tempDb = path.join(tempDir, "quantgym-cutover-smoke.sqlite3");
const tempProblemCatalog = path.join(tempDir, "empty-problem-catalog.json");
const redactedExportPath = path.join(tempDir, "quantgym-cutover-redacted.json");
const sensitiveExportPath = path.join(tempDir, "quantgym-cutover-sensitive.json");
const truncatedSensitiveExportPath = path.join(tempDir, "quantgym-cutover-sensitive-truncated.json");
const postgresImportSqlPath = path.join(tempDir, "quantgym-postgres-import.sql");
const redactedImportSqlPath = path.join(tempDir, "quantgym-postgres-import-redacted.sql");
const truncatedImportSqlPath = path.join(tempDir, "quantgym-postgres-import-truncated.sql");
const failures = [];
const warnings = [];
let apiProcess;

const fixtureEmail = `cutover-export-${Date.now()}@example.test`;
const fixtureProblemId = "cutover-export-problem";
const secretMarkers = [
  "CUTOVER_SECRET_STATE",
  "CUTOVER_SECRET_PROMPT",
  "CUTOVER_SECRET_ANSWER",
  "CUTOVER_SECRET_EXPLANATION",
  "CUTOVER_SECRET_COMMUNITY"
];

try {
  fs.writeFileSync(tempProblemCatalog, "{\"problems\": []}\n");
  const apiPort = await findFreePort();
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  apiProcess = startApi(apiPort);
  await waitForHealth(baseUrl);
  await seedFixtureData(baseUrl);

  const redactedRun = runPython(["scripts/export-api-sqlite.py", "--db", tempDb, "--out", redactedExportPath]);
  assertRun(redactedRun, "redacted SQLite export");
  const redactedExport = readJson(redactedExportPath, "redacted export");
  validateRedactedExport(redactedExport);

  const sensitiveRun = runPython([
    "scripts/export-api-sqlite.py",
    "--db",
    tempDb,
    "--out",
    sensitiveExportPath,
    "--include-sensitive"
  ]);
  assertRun(sensitiveRun, "include-sensitive SQLite export");
  const sensitiveExport = readJson(sensitiveExportPath, "include-sensitive export");
  validateSensitiveExport(sensitiveExport);

  const sensitiveCutoverRun = runPython([
    "scripts/check-postgres-cutover.py",
    "--db",
    tempDb,
    "--export",
    sensitiveExportPath,
    "--require-sensitive-export"
  ]);
  assertRun(sensitiveCutoverRun, "Postgres cutover check with include-sensitive export");
  const sensitiveCutover = parseLastJson(sensitiveCutoverRun.stdout, "include-sensitive cutover check");
  validateSensitiveCutoverCheck(sensitiveCutover);

  const postgresImportRun = runPython([
    "scripts/import-api-sqlite-export-to-postgres.py",
    "--export",
    sensitiveExportPath,
    "--out",
    postgresImportSqlPath,
    "--replace"
  ]);
  assertRun(postgresImportRun, "Postgres import SQL generation with include-sensitive export");
  const postgresImport = parseLastJson(postgresImportRun.stdout, "Postgres import SQL generation");
  validatePostgresImportSql(postgresImport, postgresImportSqlPath, sensitiveCutover?.exportCheck?.importPlan);

  const completeSignoffEnv = buildCompleteSignoffEnv(
    tempDb,
    sensitiveExportPath,
    sensitiveCutover?.exportCheck?.importPlan?.rowCount
  );
  const completeSignoffRun = runPython(
    [
      "scripts/check-postgres-cutover.py",
      "--db",
      tempDb,
      "--export",
      sensitiveExportPath,
      "--require-sensitive-export",
      "--cutover-complete"
    ],
    completeSignoffEnv
  );
  assertRun(completeSignoffRun, "Postgres cutover complete signoff with include-sensitive export");
  const completeSignoff = parseLastJson(completeSignoffRun.stdout, "Postgres cutover complete signoff");
  validateCompleteCutoverSignoff(completeSignoff, completeSignoffEnv);
  const completeSignoffNegativeFixtures = runCompleteSignoffNegativeFixtures({
    tempDb,
    sensitiveExportPath,
    validEnv: completeSignoffEnv,
    importRowCount: sensitiveCutover?.exportCheck?.importPlan?.rowCount
  });
  validateCompleteSignoffNegativeFixtures(completeSignoffNegativeFixtures);

  const redactedCutoverRun = runPython([
    "scripts/check-postgres-cutover.py",
    "--db",
    tempDb,
    "--export",
    redactedExportPath,
    "--require-sensitive-export"
  ]);
  validateRedactedExportRejected(redactedCutoverRun);
  const redactedPostgresImportRun = runPython([
    "scripts/import-api-sqlite-export-to-postgres.py",
    "--export",
    redactedExportPath,
    "--out",
    redactedImportSqlPath
  ]);
  validatePostgresImportRejected(redactedPostgresImportRun, "include-sensitive");

  const truncatedSensitiveRun = runPython([
    "scripts/export-api-sqlite.py",
    "--db",
    tempDb,
    "--out",
    truncatedSensitiveExportPath,
    "--include-sensitive",
    "--max-rows-per-table",
    "1"
  ]);
  assertRun(truncatedSensitiveRun, "truncated include-sensitive SQLite export");
  const truncatedSensitiveExport = readJson(truncatedSensitiveExportPath, "truncated include-sensitive export");
  validateTruncatedSensitiveExport(truncatedSensitiveExport);

  const truncatedSensitiveCutoverRun = runPython([
    "scripts/check-postgres-cutover.py",
    "--db",
    tempDb,
    "--export",
    truncatedSensitiveExportPath,
    "--require-sensitive-export"
  ]);
  validateTruncatedSensitiveExportRejected(truncatedSensitiveCutoverRun);
  const truncatedPostgresImportRun = runPython([
    "scripts/import-api-sqlite-export-to-postgres.py",
    "--export",
    truncatedSensitiveExportPath,
    "--out",
    truncatedImportSqlPath
  ]);
  validatePostgresImportRejected(truncatedPostgresImportRun, "full export");

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    fixture: {
      tablesSeeded: seededTables(redactedExport),
      dbPath: tempDb
    },
    redactedExport: {
      status: redactedExport.status,
      includeSensitive: redactedExport.includeSensitive,
      summaryOnly: redactedExport.summaryOnly,
      tableCount: Object.keys(redactedExport.tables || {}).length,
      rowTables: countTablesWithRows(redactedExport),
      secretsRedacted: validateNoSecretMarkers(redactedExport),
      redactionChecks: redactedChecks(redactedExport)
    },
    sensitiveExport: {
      status: sensitiveExport.status,
      includeSensitive: sensitiveExport.includeSensitive,
      summaryOnly: sensitiveExport.summaryOnly,
      tableCount: Object.keys(sensitiveExport.tables || {}).length,
      rowTables: countTablesWithRows(sensitiveExport),
      fullRowsPresent: sensitiveRowsPresent(sensitiveExport),
      secretMarkersPresent: secretMarkersPresent(sensitiveExport)
    },
    truncatedSensitiveExport: {
      status: truncatedSensitiveExport.status,
      includeSensitive: truncatedSensitiveExport.includeSensitive,
      summaryOnly: truncatedSensitiveExport.summaryOnly,
      maxRowsPerTable: truncatedSensitiveExport.maxRowsPerTable,
      truncatedTables: truncatedTables(truncatedSensitiveExport),
      secretMarkersPresent: secretMarkersPresent(truncatedSensitiveExport)
    },
    cutoverChecks: {
      includeSensitiveAccepted: sensitiveCutoverRun.status === 0 && sensitiveCutover.status === "pass",
      postgresImportSqlGenerated: postgresImportRun.status === 0 && postgresImport.status === "pass",
      postgresImportSqlContainsTransaction: postgresImportSqlContainsTransaction(postgresImportSqlPath),
      postgresImportRejectsRedactedExport: redactedPostgresImportRun.status !== 0,
      postgresImportRejectsTruncatedExport: truncatedPostgresImportRun.status !== 0,
      redactedRejected: redactedCutoverRun.status !== 0,
      redactedRejectsIncludeSensitiveRequirement: redactedRejectsIncludeSensitiveRequirement(redactedCutoverRun),
      truncatedSensitiveRejected: truncatedSensitiveCutoverRun.status !== 0,
      truncatedRejectsFullExportRequirement: truncatedRejectsFullExportRequirement(truncatedSensitiveCutoverRun),
      includeSensitiveImportPlanValid: sensitiveCutover?.exportCheck?.importPlan?.columnShapeOk === true
        && sensitiveCutover?.exportCheck?.importPlan?.referencedTablesFirst === true
        && Number(sensitiveCutover?.exportCheck?.importPlan?.rowCount || 0) > 0,
      completeSignoffAccepted: completeSignoffRun.status === 0
        && completeSignoff.status === "pass"
        && completeSignoff.cutoverSignoff?.required === true,
      completeSignoffNegativeFixturesRejected: completeSignoffNegativeFixtures.every((fixture) => fixture.rejected),
      completeSignoffNegativeFixturesMentionExpectedErrors: completeSignoffNegativeFixtures.every((fixture) => fixture.expectedErrorObserved),
      privateTargetHostRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "private target host rejected" && fixture.rejected === true),
      publicIpTargetHostRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "public IP target host rejected" && fixture.rejected === true),
      privateEvidenceUrlRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "private evidence URL rejected" && fixture.rejected === true),
      evidenceUrlRawIpRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "public IP evidence URL rejected" && fixture.rejected === true),
      targetHostWhitespaceRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "target host whitespace rejected" && fixture.rejected === true),
      databaseUnsafeCharactersRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "database unsafe characters rejected" && fixture.rejected === true),
      evidenceUrlEmbeddedCredentialsRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "evidence URL embedded credentials rejected" && fixture.rejected === true),
      evidenceUrlQueryRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "evidence URL query rejected" && fixture.rejected === true),
      futureCompletedTimestampRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "future completed timestamp rejected" && fixture.rejected === true),
      exportShaMismatchRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "export SHA mismatch rejected" && fixture.rejected === true),
      sourceDbShaMismatchRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "source DB SHA mismatch rejected" && fixture.rejected === true),
      targetRowCountMismatchRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "target row count mismatch rejected" && fixture.rejected === true),
      inactiveAppDatabaseRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "inactive app database rejected" && fixture.rejected === true),
      missingBackupConfirmationRejected: completeSignoffNegativeFixtures.some((fixture) => fixture.name === "missing backup confirmation rejected" && fixture.rejected === true)
    },
    importPlan: summarizeImportPlan(sensitiveCutover?.exportCheck?.importPlan),
    postgresImport: summarizePostgresImport(postgresImport),
    cutoverSignoff: summarizeCutoverSignoff(completeSignoff?.cutoverSignoff),
    completeSignoffNegativeFixtures,
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
  if (!keepTemp) fs.rmSync(tempDir, { recursive: true, force: true });
}

function startApi(port) {
  const child = spawn("python3", ["api-server/server.py"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PORT: String(port),
      QUANTGYM_HOST: "127.0.0.1",
      QUANTGYM_DB: tempDb,
      QUANTGYM_PROBLEM_CATALOG: tempProblemCatalog,
      QUANTGYM_MEDIA_ROOT: path.join(tempDir, "media"),
      QUANTGYM_REQUIRE_EMAIL_VERIFICATION: "0",
      QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS: "0",
      QUANTGYM_RATE_LIMIT_DISABLED: "1",
      QUANTGYM_BETA_EMAIL_ALLOWLIST: ""
    }
  });
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

async function seedFixtureData(baseUrl) {
  const verification = await postJson(`${baseUrl}/api/auth/verification-code`, {
    email: fixtureEmail,
    purpose: "register"
  });
  if (verification.status !== 200 || !verification.data?.devCode) {
    throw new Error(`Verification code fixture failed: ${verification.status} ${JSON.stringify(verification.data)}`);
  }

  const registration = await postJson(`${baseUrl}/api/auth/register`, {
    password: "cutover-export-password",
    account: {
      id: "cutover-export-user",
      provider: "local",
      email: fixtureEmail,
      name: "Cutover Export User",
      country: "us",
      region: "CA"
    },
    state: {
      resumeText: "CUTOVER_SECRET_STATE resume text",
      resources: [{ id: "cutover-resource", title: "Private resource", notes: "CUTOVER_SECRET_STATE notes" }]
    },
    problemStates: [
      {
        problemId: fixtureProblemId,
        saved: true,
        notes: "CUTOVER_SECRET_STATE problem state"
      }
    ],
    problems: [
      {
        id: fixtureProblemId,
        titleEn: "Cutover Export Problem",
        titleZh: "Cutover Export Problem",
        category: "probabilityExpectation",
        difficulty: "Medium",
        tags: ["cutover", "export"],
        source: "cutover-smoke",
        sourceUrl: "https://example.test/cutover",
        promptEn: "CUTOVER_SECRET_PROMPT",
        promptZh: "CUTOVER_SECRET_PROMPT zh",
        answer: "CUTOVER_SECRET_ANSWER",
        explanation: "CUTOVER_SECRET_EXPLANATION"
      }
    ],
    community: {
      posts: [
        {
          id: "cutover-post",
          text: "CUTOVER_SECRET_COMMUNITY",
          createdAt: new Date().toISOString(),
          likes: [],
          comments: [
            {
              id: "cutover-comment",
              text: "CUTOVER_SECRET_COMMUNITY comment",
              createdAt: new Date().toISOString()
            }
          ]
        }
      ]
    }
  });
  if (registration.status !== 201 || !registration.data?.token) {
    throw new Error(`Registration fixture failed: ${registration.status} ${JSON.stringify(registration.data)}`);
  }

  const token = registration.data.token;
  const media = await postJson(
    `${baseUrl}/api/media`,
    {
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      name: "cutover-upload.png",
      context: "cutover-export-smoke"
    },
    token
  );
  if (media.status !== 201) {
    throw new Error(`Media fixture failed: ${media.status} ${JSON.stringify(media.data)}`);
  }

  await fetch(`${baseUrl}/api/cutover-export-smoke-404`, {
    headers: {
      "User-Agent": "CUTOVER_SECRET_STATE user-agent"
    }
  });
}

async function postJson(url, payload, token = "") {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { rawBody: text };
  }
  return { status: response.status, data };
}

function runPython(scriptArgs, extraEnv = {}) {
  return spawnSync("python3", scriptArgs, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    env: {
      ...process.env,
      ...extraEnv,
      PYTHONDONTWRITEBYTECODE: "1"
    }
  });
}

function assertRun(run, label) {
  if (run.status !== 0) {
    throw new Error(`${label} failed: ${tail(run.stderr || run.stdout || run.error?.message || "")}`);
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateRedactedExport(payload) {
  expect(payload.status === "pass", "Redacted export status must be pass.");
  expect(payload.includeSensitive === false, "Redacted export must not include sensitive rows.");
  expect(payload.summaryOnly === false, "Redacted export must include redacted row objects.");
  expect(validateNoSecretMarkers(payload) === true, "Redacted export leaked a secret fixture marker.");

  const tables = payload.tables || {};
  expect(isRedaction(firstRow(tables.users)?.password_hash, "secret"), "users.password_hash must be redacted.");
  expect(isRedaction(firstRow(tables.users)?.password_salt, "secret"), "users.password_salt must be redacted.");
  expect(isRedaction(firstRow(tables.users)?.account_json, "json"), "users.account_json must be redacted.");
  expect(isMaskedEmail(firstRow(tables.users)?.email_norm), "users.email_norm must be masked.");
  expect(isRedaction(firstRow(tables.sessions)?.token_hash, "secret"), "sessions.token_hash must be redacted.");
  expect(isRedaction(firstRow(tables.email_verification_codes)?.code_hash, "secret"), "email_verification_codes.code_hash must be redacted.");
  expect(isRedaction(firstRow(tables.email_verification_codes)?.code_salt, "secret"), "email_verification_codes.code_salt must be redacted.");
  expect(isMaskedEmail(firstRow(tables.email_verification_codes)?.email_norm), "email_verification_codes.email_norm must be masked.");
  expect(isRedaction(firstRow(tables.user_states)?.state_json, "json"), "user_states.state_json must be redacted.");
  expect(isRedaction(firstRow(tables.community)?.community_json, "json"), "community.community_json must be redacted.");
  const problem = rowBy(tables.problems, "id", fixtureProblemId) || firstRow(tables.problems);
  expect(isRedaction(problem?.tags_json, "json"), "problems.tags_json must be redacted.");
  expect(isRedaction(problem?.problem_json, "json"), "problems.problem_json must be redacted.");
  expect(isRedaction(problem?.prompt_en, "text"), "problems.prompt_en must be redacted.");
  expect(isRedaction(problem?.answer, "text"), "problems.answer must be redacted.");
  expect(isRedaction(problem?.explanation, "text"), "problems.explanation must be redacted.");
  expect(isRedaction(firstRow(tables.media_objects)?.storage_path, "secret"), "media_objects.storage_path must be redacted.");
  expect(isRedaction(firstRow(tables.audit_events)?.metadata_json, "json"), "audit_events.metadata_json must be redacted.");
  expect(isMaskedEmail(firstRow(tables.audit_events)?.email_norm) || isRedaction(firstRow(tables.audit_events)?.email_norm, "pii"), "audit_events.email_norm must be masked or redacted.");
  expect(isRedaction(firstRow(tables.audit_events)?.ip, "pii"), "audit_events.ip must be redacted.");
  expect(isRedaction(firstRow(tables.audit_events)?.user_agent, "pii"), "audit_events.user_agent must be redacted.");
}

function validateSensitiveExport(payload) {
  expect(payload.status === "pass", "Include-sensitive export status must be pass.");
  expect(payload.includeSensitive === true, "Include-sensitive export must opt into full rows.");
  expect(payload.summaryOnly === false, "Include-sensitive export must not be summary-only.");
  expect(payload.maxRowsPerTable == null, "Include-sensitive migration export must not be row-limited.");
  expect(truncatedTables(payload).length === 0, "Include-sensitive migration export must not truncate tables.");
  expect(sensitiveRowsPresent(payload), "Include-sensitive export must contain rows.");
  expect(secretMarkersPresent(payload), "Include-sensitive export should preserve fixture markers for secured migration input.");

  const tables = payload.tables || {};
  expect(typeof firstRow(tables.users)?.password_hash === "string", "Sensitive users.password_hash must be a raw string.");
  expect(typeof firstRow(tables.sessions)?.token_hash === "string", "Sensitive sessions.token_hash must be a raw string.");
  expect(typeof firstRow(tables.email_verification_codes)?.code_hash === "string", "Sensitive email_verification_codes.code_hash must be a raw string.");
  expect(typeof firstRow(tables.media_objects)?.storage_path === "string", "Sensitive media_objects.storage_path must be a raw string.");
  expect(typeof firstRow(tables.user_states)?.state_json === "string", "Sensitive user_states.state_json must be a raw JSON string.");
  const problem = rowBy(tables.problems, "id", fixtureProblemId) || firstRow(tables.problems);
  expect(typeof problem?.prompt_en === "string", "Sensitive problems.prompt_en must be raw text.");
}

function validateSensitiveCutoverCheck(payload) {
  expect(payload.status === "pass", "Cutover check with include-sensitive export must pass.");
  expect(payload.exportCheck?.provided === true, "Cutover check must record export as provided.");
  expect(payload.exportCheck?.includeSensitive === true, "Cutover check must accept include-sensitive export.");
  expect(payload.exportCheck?.summaryOnly === false, "Cutover check must reject summary-only migration input.");
  expect(payload.exportCheck?.maxRowsPerTable == null, "Cutover check must require an unlimited migration export.");
  expect(payload.exportCheck?.fullExport === true, "Cutover check must mark full include-sensitive export as complete.");
  expect(Array.isArray(payload.exportCheck?.truncatedTables) && payload.exportCheck.truncatedTables.length === 0, "Cutover check must report no truncated tables for full export.");
  expect(payload.exportCheck?.hasRows === true, "Cutover check must confirm migration rows are present.");
  expect(payload.exportCheck?.importPlan?.columnShapeOk === true, "Cutover check must validate export row columns against Postgres schema.");
  expect(payload.exportCheck?.importPlan?.referencedTablesFirst === true, "Cutover check must produce a dependency-safe import order.");
  expect(Number(payload.exportCheck?.importPlan?.rowCount || 0) > 0, "Cutover check import plan must include export rows.");
  expect(Number(payload.exportCheck?.importPlan?.jsonValuesChecked || 0) > 0, "Cutover check import plan must validate JSON values.");
  expect(Number(payload.exportCheck?.importPlan?.timestampValuesChecked || 0) > 0, "Cutover check import plan must validate timestamp values.");
  expect(payload.dataChecks?.integrityOk === true, "Cutover check must pass SQLite integrity.");
  expect(payload.dataChecks?.foreignKeyOk === true, "Cutover check must pass SQLite foreign keys.");
}

function validatePostgresImportSql(payload, sqlPath, importPlan = {}) {
  expect(payload.status === "pass", "Postgres import SQL generation must pass.");
  expect(payload.sqlWritten === true, "Postgres import must write a SQL file.");
  expect(payload.replace === true, "Postgres import smoke must exercise --replace SQL generation.");
  expect(payload.containsSensitiveRows === true, "Postgres import summary must mark output as sensitive.");
  expect(payload.execution?.requested === false, "Postgres import smoke must not execute against a database.");
  expect(payload.importPlan?.columnShapeOk === true, "Postgres import must validate row column shapes.");
  expect(payload.importPlan?.referencedTablesFirst === true, "Postgres import must use dependency-safe table order.");
  expect(Number(payload.importPlan?.rowCount || 0) === Number(importPlan?.rowCount || 0), "Postgres import row count must match cutover import plan.");
  expect(Number(payload.importPlan?.jsonValuesChecked || 0) > 0, "Postgres import must validate JSON values.");
  expect(Number(payload.importPlan?.timestampValuesChecked || 0) > 0, "Postgres import must validate timestamp values.");
  expect(Array.isArray(payload.failures) && payload.failures.length === 0, "Postgres import summary must have no failures.");
  const sql = fs.readFileSync(sqlPath, "utf8");
  expect(sql.includes("BEGIN;") && sql.includes("COMMIT;"), "Postgres import SQL must be transactional.");
  expect(sql.includes("TRUNCATE") && sql.includes("RESTART IDENTITY CASCADE"), "Postgres import SQL must include replace TRUNCATE when requested.");
  expect(sql.includes("INSERT INTO \"users\""), "Postgres import SQL must insert users.");
  expect(sql.includes("INSERT INTO \"problems\""), "Postgres import SQL must insert problems.");
  expect(sql.includes("::jsonb"), "Postgres import SQL must cast JSON values to jsonb.");
  expect(sql.includes("::timestamptz"), "Postgres import SQL must cast timestamps to timestamptz.");
}

function validateCompleteCutoverSignoff(payload, env) {
  expect(payload.status === "pass", "Complete cutover signoff check must pass.");
  const signoff = payload.cutoverSignoff || {};
  expect(signoff.required === true, "Complete cutover signoff must be required.");
  expect(signoff.targetHost === env.QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST, "Complete cutover signoff must report the target host.");
  expect(signoff.database === env.QUANTGYM_POSTGRES_CUTOVER_DATABASE, "Complete cutover signoff must report the database name.");
  expect(signoff.evidenceHost === "render.com", "Complete cutover signoff must report the evidence host.");
  expect(signoff.appDatabaseActive === true, "Complete cutover signoff must require active app DB confirmation.");
  expect(signoff.backupConfirmed === true, "Complete cutover signoff must require backup confirmation.");
  expect(signoff.exportSha256Prefix === env.QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256.slice(0, 12), "Complete cutover signoff must bind to the export SHA.");
  expect(signoff.sourceDbSha256Prefix === env.QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256.slice(0, 12), "Complete cutover signoff must bind to the source DB SHA.");
  expect(Number(signoff.importPlanRowCount || 0) > 0, "Complete cutover signoff must include import-plan row count.");
  expect(Number(signoff.targetRowCount) === Number(env.QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT), "Complete cutover signoff target row count must match env.");
  expect(Number(signoff.targetRowCount) === Number(signoff.importPlanRowCount), "Complete cutover signoff target row count must match import-plan row count.");
}

function runCompleteSignoffNegativeFixtures({ tempDb, sensitiveExportPath, validEnv, importRowCount }) {
  const args = [
    "scripts/check-postgres-cutover.py",
    "--db",
    tempDb,
    "--export",
    sensitiveExportPath,
    "--require-sensitive-export",
    "--cutover-complete"
  ];
  const cases = [
    {
      name: "pending status rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_STATUS: "pending" },
      expectedError: "QUANTGYM_POSTGRES_CUTOVER_STATUS must be complete"
    },
    {
      name: "localhost target host rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST: "localhost" },
      expectedError: "must not point at localhost"
    },
    {
      name: "private target host rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST: "10.21.0.17" },
      expectedError: "private network address"
    },
    {
      name: "public IP target host rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST: "8.8.8.8" },
      expectedError: "not an IP address"
    },
    {
      name: "target host whitespace rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST: "postgres quantgym.internal" },
      expectedError: "plain DNS hostname"
    },
    {
      name: "database DSN rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_DATABASE: "postgres://quantgym" },
      expectedError: "plain non-placeholder database name"
    },
    {
      name: "database unsafe characters rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_DATABASE: "quantgym prod;drop" },
      expectedError: "plain non-placeholder database name"
    },
    {
      name: "future completed timestamp rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_COMPLETED_AT: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
      expectedError: "must not be in the future"
    },
    {
      name: "placeholder evidence URL rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://render.com/<service>/postgres-cutover" },
      expectedError: "placeholder URL"
    },
    {
      name: "private evidence URL rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://192.168.12.20/postgres-cutover" },
      expectedError: "private network address"
    },
    {
      name: "public IP evidence URL rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://8.8.4.4/postgres-cutover" },
      expectedError: "DNS hostname"
    },
    {
      name: "evidence URL embedded credentials rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://user:secret@render.com/quantgym/postgres-cutover" },
      expectedError: "embedded credentials"
    },
    {
      name: "evidence URL query rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://render.com/quantgym/postgres-cutover?token=leaky" },
      expectedError: "query strings or fragments"
    },
    {
      name: "export SHA mismatch rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256: "f".repeat(64) },
      expectedError: "EXPORT_SHA256 does not match"
    },
    {
      name: "source DB SHA mismatch rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256: "e".repeat(64) },
      expectedError: "SOURCE_DB_SHA256 does not match"
    },
    {
      name: "empty database path rejected",
      args: [
        "scripts/check-postgres-cutover.py",
        "--db",
        "",
        "--export",
        sensitiveExportPath,
        "--require-sensitive-export",
        "--cutover-complete"
      ],
      env: {},
      expectedError: "SQLite DB path is empty"
    },
    {
      name: "database directory path rejected",
      args: [
        "scripts/check-postgres-cutover.py",
        "--db",
        path.dirname(tempDb),
        "--export",
        sensitiveExportPath,
        "--require-sensitive-export",
        "--cutover-complete"
      ],
      env: {},
      expectedError: "SQLite DB path is not a file"
    },
    {
      name: "target row count mismatch rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT: String(Number(importRowCount || 0) + 1) },
      expectedError: "TARGET_ROW_COUNT must match"
    },
    {
      name: "inactive app database rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_APP_DATABASE_ACTIVE: "0" },
      expectedError: "APP_DATABASE_ACTIVE must be one of"
    },
    {
      name: "missing backup confirmation rejected",
      env: { QUANTGYM_POSTGRES_CUTOVER_BACKUP_CONFIRMED: "" },
      expectedError: "BACKUP_CONFIRMED is required"
    }
  ];

  return cases.map((fixture) => {
    const run = runPython(fixture.args || args, { ...validEnv, ...fixture.env });
    const payload = parseLastJson(run.stdout, `${fixture.name} complete cutover rejection`);
    const error = firstFailureText(run, payload);
    return {
      name: fixture.name,
      rejected: run.status !== 0 && payload.status === "fail",
      expectedErrorObserved: error.includes(fixture.expectedError),
      failed: Array.isArray(payload.failures) ? payload.failures.length : 0,
      error
    };
  });
}

function validateCompleteSignoffNegativeFixtures(fixtures) {
  expect(Array.isArray(fixtures) && fixtures.length >= 10, "Complete cutover signoff must include negative fixtures.");
  for (const fixture of fixtures) {
    expect(fixture.rejected === true, `Complete cutover signoff negative fixture "${fixture.name}" must be rejected.`);
    expect(fixture.expectedErrorObserved === true, `Complete cutover signoff negative fixture "${fixture.name}" must mention expected error.`);
  }
}

function validateRedactedExportRejected(run) {
  expect(run.status !== 0, "Cutover check must reject redacted export when --require-sensitive-export is set.");
  const payload = parseLastJson(run.stdout, "redacted export cutover rejection");
  const failuresText = JSON.stringify(payload.failures || []);
  expect(payload.status === "fail", "Redacted export cutover check status must be fail.");
  expect(/include-sensitive/i.test(failuresText), "Redacted export rejection must mention --include-sensitive.");
}

function validatePostgresImportRejected(run, expectedPattern) {
  expect(run.status !== 0, "Postgres import must reject unsafe migration input.");
  const payload = parseLastJson(run.stdout, "Postgres import rejection");
  const failuresText = JSON.stringify(payload.failures || []);
  expect(payload.status === "fail", "Postgres import rejection status must be fail.");
  expect(new RegExp(expectedPattern, "i").test(failuresText), `Postgres import rejection must mention ${expectedPattern}.`);
}

function validateTruncatedSensitiveExport(payload) {
  expect(payload.status === "pass", "Truncated include-sensitive export should still pass SQLite health checks.");
  expect(payload.includeSensitive === true, "Truncated export fixture must still be include-sensitive.");
  expect(payload.summaryOnly === false, "Truncated export fixture must include rows.");
  expect(payload.maxRowsPerTable === 1, "Truncated export fixture must record maxRowsPerTable.");
  expect(truncatedTables(payload).length > 0, "Truncated export fixture must mark at least one table truncated.");
}

function validateTruncatedSensitiveExportRejected(run) {
  expect(run.status !== 0, "Cutover check must reject truncated include-sensitive export.");
  const payload = parseLastJson(run.stdout, "truncated include-sensitive cutover rejection");
  const failuresText = JSON.stringify(payload.failures || []);
  expect(payload.status === "fail", "Truncated include-sensitive cutover check status must be fail.");
  expect(payload.exportCheck?.includeSensitive === true, "Truncated export rejection must still identify include-sensitive input.");
  expect(payload.exportCheck?.fullExport === false, "Truncated export rejection must mark input as not full.");
  expect(Array.isArray(payload.exportCheck?.truncatedTables) && payload.exportCheck.truncatedTables.length > 0, "Truncated export rejection must report truncated tables.");
  expect(/full export|truncated|max-rows-per-table/i.test(failuresText), "Truncated export rejection must mention full export or truncation.");
}

function redactedChecks(payload) {
  const tables = payload.tables || {};
  return {
    usersPasswordHash: isRedaction(firstRow(tables.users)?.password_hash, "secret"),
    sessionsTokenHash: isRedaction(firstRow(tables.sessions)?.token_hash, "secret"),
    emailCodeHash: isRedaction(firstRow(tables.email_verification_codes)?.code_hash, "secret"),
    stateJson: isRedaction(firstRow(tables.user_states)?.state_json, "json"),
    communityJson: isRedaction(firstRow(tables.community)?.community_json, "json"),
    problemText: isRedaction(firstRow(tables.problems)?.prompt_en, "text"),
    mediaStoragePath: isRedaction(firstRow(tables.media_objects)?.storage_path, "secret"),
    auditMetadata: isRedaction(firstRow(tables.audit_events)?.metadata_json, "json")
  };
}

function seededTables(payload) {
  return Object.entries(payload.tables || {})
    .filter(([, table]) => Number(table?.rowCount || 0) > 0)
    .map(([name]) => name)
    .sort();
}

function countTablesWithRows(payload) {
  return seededTables(payload).length;
}

function sensitiveRowsPresent(payload) {
  return countTablesWithRows(payload) >= 8
    && Boolean(firstRow(payload.tables?.users))
    && Boolean(firstRow(payload.tables?.sessions))
    && Boolean(firstRow(payload.tables?.email_verification_codes))
    && Boolean(firstRow(payload.tables?.media_objects))
    && Boolean(firstRow(payload.tables?.problems));
}

function validateNoSecretMarkers(payload) {
  const text = JSON.stringify(payload);
  return secretMarkers.every((marker) => !text.includes(marker));
}

function secretMarkersPresent(payload) {
  const text = JSON.stringify(payload);
  return secretMarkers.slice(0, 5).every((marker) => text.includes(marker));
}

function redactedRejectsIncludeSensitiveRequirement(run) {
  if (run.status === 0) return false;
  try {
    const payload = parseLastJson(run.stdout, "redacted cutover rejection");
    return JSON.stringify(payload.failures || []).includes("--include-sensitive");
  } catch {
    return false;
  }
}

function truncatedRejectsFullExportRequirement(run) {
  if (run.status === 0) return false;
  try {
    const payload = parseLastJson(run.stdout, "truncated sensitive cutover rejection");
    const failuresText = JSON.stringify(payload.failures || []);
    return payload.exportCheck?.fullExport === false
      && Array.isArray(payload.exportCheck?.truncatedTables)
      && payload.exportCheck.truncatedTables.length > 0
      && /full export|truncated|max-rows-per-table/i.test(failuresText);
  } catch {
    return false;
  }
}

function postgresImportSqlContainsTransaction(sqlPath) {
  try {
    const sql = fs.readFileSync(sqlPath, "utf8");
    return sql.includes("BEGIN;") && sql.includes("COMMIT;");
  } catch {
    return false;
  }
}

function firstFailureText(run, payload = null) {
  const parsed = payload || parseLastJson(run.stdout, "cutover check failure");
  const failuresText = Array.isArray(parsed?.failures) ? parsed.failures.join("\n").trim() : "";
  return failuresText || String(run.stderr || run.stdout || run.error?.message || "").trim();
}

function truncatedTables(payload) {
  return Object.entries(payload.tables || {})
    .filter(([, table]) => table?.truncated === true || Number(table?.exportedRows || 0) < Number(table?.rowCount || 0))
    .map(([name]) => name)
    .sort();
}

function summarizeImportPlan(plan = {}) {
  return {
    tableCount: Number(plan.tableCount || 0),
    rowTables: Number(plan.rowTables || 0),
    rowCount: Number(plan.rowCount || 0),
    copyOrder: Array.isArray(plan.copyOrder) ? plan.copyOrder : [],
    jsonValuesChecked: Number(plan.jsonValuesChecked || 0),
    timestampValuesChecked: Number(plan.timestampValuesChecked || 0),
    columnShapeOk: plan.columnShapeOk === true,
    referencedTablesFirst: plan.referencedTablesFirst === true
  };
}

function summarizePostgresImport(importSummary = {}) {
  return {
    status: String(importSummary.status || ""),
    sqlWritten: importSummary.sqlWritten === true,
    sqlBytes: Number(importSummary.sqlBytes || 0),
    replace: importSummary.replace === true,
    containsSensitiveRows: importSummary.containsSensitiveRows === true,
    executionRequested: importSummary.execution?.requested === true,
    tableCount: Number(importSummary.importPlan?.tableCount || 0),
    rowCount: Number(importSummary.importPlan?.rowCount || 0),
    columnShapeOk: importSummary.importPlan?.columnShapeOk === true,
    referencedTablesFirst: importSummary.importPlan?.referencedTablesFirst === true
  };
}

function summarizeCutoverSignoff(signoff = {}) {
  return {
    required: signoff.required === true,
    targetHost: String(signoff.targetHost || ""),
    database: String(signoff.database || ""),
    completedAt: String(signoff.completedAt || ""),
    evidenceHost: String(signoff.evidenceHost || ""),
    appDatabaseActive: signoff.appDatabaseActive === true,
    backupConfirmed: signoff.backupConfirmed === true,
    sourceDbSha256Prefix: String(signoff.sourceDbSha256Prefix || ""),
    exportSha256Prefix: String(signoff.exportSha256Prefix || ""),
    importPlanRowCount: Number(signoff.importPlanRowCount || 0),
    targetRowCount: Number(signoff.targetRowCount || 0)
  };
}

function buildCompleteSignoffEnv(dbFile, exportFile, importRowCount) {
  return {
    QUANTGYM_POSTGRES_CUTOVER_STATUS: "complete",
    QUANTGYM_POSTGRES_CUTOVER_TARGET_HOST: "postgres.quantgym.internal",
    QUANTGYM_POSTGRES_CUTOVER_DATABASE: "quantgym",
    QUANTGYM_POSTGRES_CUTOVER_COMPLETED_AT: new Date().toISOString(),
    QUANTGYM_POSTGRES_CUTOVER_EVIDENCE_URL: "https://render.com/quantgym/postgres-cutover-smoke",
    QUANTGYM_POSTGRES_CUTOVER_EXPORT_SHA256: sha256File(exportFile),
    QUANTGYM_POSTGRES_CUTOVER_SOURCE_DB_SHA256: sha256File(dbFile),
    QUANTGYM_POSTGRES_CUTOVER_TARGET_ROW_COUNT: String(Number(importRowCount || 0)),
    QUANTGYM_POSTGRES_CUTOVER_APP_DATABASE_ACTIVE: "1",
    QUANTGYM_POSTGRES_CUTOVER_BACKUP_CONFIRMED: "confirmed"
  };
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function firstRow(table) {
  return Array.isArray(table?.rows) ? table.rows[0] : undefined;
}

function rowBy(table, key, value) {
  return Array.isArray(table?.rows) ? table.rows.find((row) => row?.[key] === value) : undefined;
}

function isRedaction(value, label = "") {
  return Boolean(value)
    && typeof value === "object"
    && value.redacted === label
    && Number(value.bytes || 0) > 0;
}

function isMaskedEmail(value) {
  return typeof value === "string" && value.includes("***@") && !value.includes(fixtureEmail);
}

function parseLastJson(text, label) {
  const trimmed = String(text || "").trim();
  for (let index = trimmed.lastIndexOf("{"); index >= 0; index = trimmed.lastIndexOf("{", index - 1)) {
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Keep searching; nested JSON can precede the final object.
    }
  }
  throw new Error(`${label} did not print a JSON object.`);
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

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expect(condition, message) {
  if (!condition) fail(message);
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
