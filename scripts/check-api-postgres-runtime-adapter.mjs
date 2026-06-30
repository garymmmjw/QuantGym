#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-postgres-runtime-"));
const fakePackageDir = path.join(tempDir, "psycopg");
const fakeRowsDir = path.join(fakePackageDir, "rows");
const fakeTypesDir = path.join(fakePackageDir, "types");
const fakeJsonDir = path.join(fakeTypesDir, "json");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/363-api-postgres-runtime-adapter-summary.json";
const port = 19000 + Math.floor(Math.random() * 1000);
const summary = {
  id: 363,
  date: "2026-06-26",
  surface: "API Postgres runtime adapter",
  status: "fail",
  fixture: "fake psycopg runtime adapter",
  checks: {},
  failures: [],
};

try {
  writeFakePsycopg();
  const catalogPath = writeMiniCatalog();
  const result = await runServerHealth(catalogPath);
  summary.health = {
    ok: result.health?.ok === true,
    database: result.health?.database || null,
  };
  summary.checks.postgresBackendReported = result.health?.database?.backend === "postgres";
  summary.checks.postgresSchemaTablesReported = Number(result.health?.database?.schemaTables || 0) >= 12;
  summary.checks.postgresWritableReported = result.health?.database?.writable === true;
  summary.checks.fakePsycopgImported = String(result.stderrPreview || "").includes("[fake-psycopg] connect");
  summary.checks.schemaStatementsSplit = String(result.stderrPreview || "").includes("[fake-psycopg] schema-statement");
  summary.checks.schemaStatementsIdempotent = String(result.stderrPreview || "").includes("[fake-psycopg] schema-idempotent");
  summary.checks.parameterizedSqlTranslated = String(result.stderrPreview || "").includes("[fake-psycopg] translated-param");
  summary.checks.jsonbParamsAdapted = String(result.stderrPreview || "").includes("[fake-psycopg] jsonb-param");
  for (const [name, pass] of Object.entries(summary.checks)) {
    if (pass !== true) summary.failures.push(`Check failed: ${name}`);
  }
  summary.status = summary.failures.length ? "fail" : "pass";
} catch (error) {
  summary.failures.push(error?.stack || error?.message || String(error));
} finally {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // best effort cleanup
  }
}

if (summary.failures.length) {
  summary.debug = {
    note: "Inspect the command stdout/stderr for the fake psycopg process if this fails locally.",
  };
}

const output = `${JSON.stringify(summary, null, 2)}\n`;
if (summaryPath) {
  const absoluteSummaryPath = path.resolve(projectRoot, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, output);
}
process.stdout.write(output);
if (summary.failures.length) process.exitCode = 1;

function writeFakePsycopg() {
  fs.mkdirSync(fakeRowsDir, { recursive: true });
  fs.mkdirSync(fakeJsonDir, { recursive: true });
  fs.writeFileSync(
    path.join(fakePackageDir, "__init__.py"),
    [
      "import sys",
      "print('[fake-psycopg] connect module loaded', file=sys.stderr, flush=True)",
      "",
      "class Error(Exception):",
      "    pass",
      "",
      "class FakeCursor:",
      "    def __init__(self, rows=None, rowcount=0):",
      "        self._rows = rows or []",
      "        self.rowcount = rowcount",
      "    def fetchone(self):",
      "        return self._rows[0] if self._rows else None",
      "    def fetchall(self):",
      "        return list(self._rows)",
      "",
      "class FakeConnection:",
      "    def __init__(self, conninfo='', **kwargs):",
      "        self.conninfo = conninfo",
      "        self.closed = False",
      "        print(f'[fake-psycopg] connect {conninfo}', file=sys.stderr, flush=True)",
      "    def execute(self, sql, params=None):",
      "        text_raw = str(sql or '')",
      "        statement_count = len([part for part in text_raw.split(';') if part.strip()])",
      "        if statement_count > 1:",
      "            raise Error(f'multi-statement execute is not allowed in strict Postgres mode: {statement_count} statements')",
      "        if '?' in str(sql or ''):",
      "            raise Error(f'untranslated sqlite placeholder in Postgres SQL: {sql}')",
      "        if params is not None and '%s' in str(sql or ''):",
      "            print('[fake-psycopg] translated-param', file=sys.stderr, flush=True)",
      "        if params is not None and any(value.__class__.__name__ == 'Jsonb' for value in list(params or [])):",
      "            print('[fake-psycopg] jsonb-param', file=sys.stderr, flush=True)",
      "        text = ' '.join(text_raw.split()).lower()",
      "        if text.startswith('create table') or text.startswith('create index'):",
      "            if 'if not exists' not in text:",
      "                raise Error(f'non-idempotent schema statement in Postgres startup: {sql}')",
      "            print('[fake-psycopg] schema-statement', file=sys.stderr, flush=True)",
      "            print('[fake-psycopg] schema-idempotent', file=sys.stderr, flush=True)",
      "            return FakeCursor([], 1)",
      "        if 'information_schema.tables' in text:",
      "            return FakeCursor([{'count': 12}], 1)",
      "        if text.startswith('show transaction_read_only'):",
      "            return FakeCursor([{'transaction_read_only': 'off'}], 1)",
      "        if text.startswith('select 1'):",
      "            return FakeCursor([{'ok': 1}], 1)",
      "        if 'from problems' in text:",
      "            return FakeCursor([], 0)",
      "        return FakeCursor([], 1)",
      "    def commit(self):",
      "        pass",
      "    def rollback(self):",
      "        pass",
      "    def close(self):",
      "        self.closed = True",
      "    def __enter__(self):",
      "        return self",
      "    def __exit__(self, exc_type, exc, tb):",
      "        if exc_type:",
      "            self.rollback()",
      "        else:",
      "            self.commit()",
      "        self.close()",
      "",
      "def connect(conninfo='', **kwargs):",
      "    return FakeConnection(conninfo, **kwargs)",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(path.join(fakeRowsDir, "__init__.py"), "dict_row = object()\n", "utf8");
  fs.writeFileSync(path.join(fakeTypesDir, "__init__.py"), "", "utf8");
  fs.writeFileSync(
    path.join(fakeJsonDir, "__init__.py"),
    [
      "class Jsonb:",
      "    def __init__(self, value):",
      "        self.value = value",
      "    def __repr__(self):",
      "        return f'Jsonb({self.value!r})'",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeMiniCatalog() {
  const catalogPath = path.join(tempDir, "problem-catalog.json");
  const catalog = {
    problems: [
      {
        id: "postgres-runtime-adapter-smoke-001",
        titleEn: "Postgres runtime adapter smoke problem",
        titleZh: "",
        category: "probabilityExpectation",
        difficulty: "Easy",
        tags: ["postgres", "runtime-smoke"],
        source: "runtime-adapter-fixture",
        sourceUrl: "fixture",
        promptEn: "This local-only fixture verifies Postgres parameter translation and JSONB adaptation.",
        promptZh: "",
        answer: "",
        explanation: "The fake psycopg module rejects untranslated SQLite placeholders and records JSONB params.",
      },
    ],
  };
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf8");
  return catalogPath;
}

function runServerHealth(catalogPath) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PYTHONPATH: [tempDir, projectRoot, process.env.PYTHONPATH || ""].filter(Boolean).join(path.delimiter),
      PORT: String(port),
      QUANTGYM_HOST: "127.0.0.1",
      QUANTGYM_DB_BACKEND: "postgres",
      QUANTGYM_POSTGRES_DATABASE_URL: "postgresql://quantgym.example.com/quantgym",
      QUANTGYM_PROBLEM_CATALOG: catalogPath,
      QUANTGYM_JOBS_SOURCE_URL: "disabled",
      QUANTGYM_RATE_LIMIT_DISABLED: "1",
    };
    const child = spawn("python3", ["api-server/server.py"], {
      cwd: projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const startedAt = Date.now();
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`API server exited before health check with code ${code}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      }
    });

    const poll = () => {
      if (settled) return;
      requestJson(`http://127.0.0.1:${port}/api/health`)
        .then((health) => {
          settled = true;
          child.kill("SIGTERM");
          resolve({
            health,
            stdoutPreview: stdout.slice(-1000),
            stderrPreview: stderr.slice(-1000),
          });
        })
        .catch((error) => {
          if (Date.now() - startedAt > 8000) {
            settled = true;
            child.kill("SIGTERM");
            reject(new Error(`Timed out waiting for API health: ${error.message}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
            return;
          }
          setTimeout(poll, 150);
        });
    };
    setTimeout(poll, 150);
  });
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 1000 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error("request timed out"));
    });
    request.on("error", reject);
  });
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const prefix = `${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}
