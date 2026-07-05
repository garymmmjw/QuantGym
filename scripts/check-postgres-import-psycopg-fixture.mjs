#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-psycopg-import-"));
const fakeModuleDir = path.join(tempDir, "fake-python");
const exportPath = path.join(tempDir, "empty-include-sensitive-export.json");
const sqlPath = path.join(tempDir, "import.sql");
const summaryPath = path.join(tempDir, "summary.json");
const fakeLogPath = path.join(tempDir, "fake-psycopg-log.json");
const schemaPath = path.join(root, "api-server", "postgres", "schema.sql");
const fixtureDatabaseUrl = buildFixtureDatabaseUrl();
const failures = [];

try {
  fs.mkdirSync(fakeModuleDir, { recursive: true });
  fs.writeFileSync(path.join(fakeModuleDir, "psycopg.py"), fakePsycopgModule(), "utf8");
  fs.writeFileSync(exportPath, JSON.stringify(buildEmptySensitiveExport(), null, 2), "utf8");

  const run = spawnSync(
    "python3",
    [
      "scripts/import-api-sqlite-export-to-postgres.py",
      "--export",
      exportPath,
      "--out",
      sqlPath,
      "--summary",
      summaryPath,
      "--replace",
      "--execute",
      "--init-schema",
      "--execute-driver",
      "psycopg",
      "--database-url",
      fixtureDatabaseUrl,
      "--confirm-replace"
    ],
    {
      cwd: root,
      text: true,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PYTHONPATH: fakeModuleDir,
        QUANTGYM_FAKE_PSYCOPG_LOG: fakeLogPath
      }
    }
  );

  if (run.status !== 0) {
    failures.push(`psycopg fixture import failed with exit code ${run.status}: ${run.stderr || run.stdout}`);
  }
  const outputText = `${run.stdout}\n${run.stderr}`;
  if (outputText.includes(fixtureDatabaseUrl)) {
    failures.push("psycopg fixture leaked the database URL in output.");
  }
  const summary = readJson(summaryPath);
  const fakeLog = readJson(fakeLogPath);
  if (summary.status !== "pass") failures.push(`Expected pass summary, got ${summary.status}.`);
  if (summary.execution?.driver !== "psycopg") failures.push("Expected execution.driver to be psycopg.");
  if (summary.execution?.initSchema !== true) failures.push("Expected execution.initSchema to be true.");
  if (summary.execution?.executed !== true) failures.push("Expected psycopg execution to be marked executed.");
  if (summary.execution?.databaseUrlSet !== true) failures.push("Expected databaseUrlSet to be true.");
  if (summary.execution?.databaseUrl !== undefined) failures.push("Summary must not include the database URL.");
  if (fakeLog.autocommit !== true) failures.push("Expected psycopg connection to use autocommit=true.");
  if (fakeLog.sqlContainsBegin !== true || fakeLog.sqlContainsCommit !== true) {
    failures.push("Expected fake psycopg execution to receive the transaction SQL.");
  }
  if (fakeLog.schemaSqlReceived !== true) {
    failures.push("Expected fake psycopg execution to initialize the schema first.");
  }
  if (fakeLog.executeCount !== 2) {
    failures.push(`Expected fake psycopg execution to execute schema and import SQL, got ${fakeLog.executeCount}.`);
  }
  if (fakeLog.sqlContainsTruncate !== true) {
    failures.push("Expected fake psycopg execution to receive the replace TRUNCATE.");
  }

  const result = {
    status: failures.length ? "fail" : "pass",
    tempDir,
    checks: {
      subprocessPass: run.status === 0,
      summaryPass: summary.status === "pass",
      executionDriverPsycopg: summary.execution?.driver === "psycopg",
      initSchema: summary.execution?.initSchema === true,
      executed: summary.execution?.executed === true,
      databaseUrlRedacted: !outputText.includes(fixtureDatabaseUrl)
        && summary.execution?.databaseUrl === undefined,
      autocommit: fakeLog.autocommit === true,
      schemaSqlReceived: fakeLog.schemaSqlReceived === true,
      executeCount: fakeLog.executeCount === 2,
      transactionSqlReceived: fakeLog.sqlContainsBegin === true && fakeLog.sqlContainsCommit === true,
      truncateSqlReceived: fakeLog.sqlContainsTruncate === true
    },
    failures
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} finally {
  if (!process.env.QUANTGYM_KEEP_TEMP) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function buildEmptySensitiveExport() {
  const schema = fs.readFileSync(schemaPath, "utf8");
  const tables = {};
  for (const match of schema.matchAll(/CREATE\s+TABLE\s+([a-zA-Z_][\w]*)\s*\(/g)) {
    tables[match[1]] = {
      rowCount: 0,
      exportedRows: 0,
      truncated: false,
      rows: []
    };
  }
  return {
    status: "pass",
    generatedAt: new Date().toISOString(),
    includeSensitive: true,
    summaryOnly: false,
    maxRowsPerTable: null,
    tables
  };
}

function buildFixtureDatabaseUrl() {
  const credentials = ["fixture_user", "fixture_password"].join(":");
  return `postgresql://${credentials}@example.invalid/quantgym`;
}

function fakePsycopgModule() {
  return `
import json
import os

class Cursor:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, sql):
        log_path = os.environ["QUANTGYM_FAKE_PSYCOPG_LOG"]
        existing = {}
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8") as fh:
                existing = json.load(fh)
        execute_count = existing.get("executeCount", 0) + 1
        is_schema = "CREATE TABLE IF NOT EXISTS users" in sql
        existing.update({
            "executeCount": execute_count,
            "schemaSqlReceived": existing.get("schemaSqlReceived", False) or is_schema,
            "sqlContainsBegin": existing.get("sqlContainsBegin", False) or "BEGIN;" in sql,
            "sqlContainsCommit": existing.get("sqlContainsCommit", False) or "COMMIT;" in sql,
            "sqlContainsTruncate": existing.get("sqlContainsTruncate", False) or "TRUNCATE" in sql,
            "sqlLength": existing.get("sqlLength", 0) + len(sql),
        })
        with open(log_path, "w", encoding="utf-8") as fh:
            json.dump(existing, fh)

class Connection:
    def __init__(self, url, autocommit=False):
        self.url = url
        self.autocommit = autocommit

    def __enter__(self):
        log_path = os.environ["QUANTGYM_FAKE_PSYCOPG_LOG"]
        existing = {}
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8") as fh:
                existing = json.load(fh)
        existing.update({"autocommit": self.autocommit, "urlSet": bool(self.url)})
        with open(log_path, "w", encoding="utf-8") as fh:
            json.dump(existing, fh)
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return Cursor()

def connect(url, autocommit=False):
    return Connection(url, autocommit=autocommit)
`;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}
