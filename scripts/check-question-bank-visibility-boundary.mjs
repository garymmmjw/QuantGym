#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertExplicitlyPublicProblems,
  selectExplicitlyPublicProblems,
  selectReleaseProblems
} from "./lib/question-bank-visibility.mjs";
import { isUserProblem, normalizeProblem } from "../src/modules/problems/data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-visibility-boundary-"));
const failures = [];
const checks = {};

try {
  checkSelectionRules();
  checkFrontendVisibilityModel();
  checkApiImportAndAuthentication();
  checkDefaultStaticBuild();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const summary = {
  status: failures.length ? "fail" : "pass",
  surface: "question-bank visibility boundary",
  checks,
  failures
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function checkSelectionRules() {
  const fixture = [
    { id: "public-approved", source: "approved", visibility: "public" },
    { id: "private-approved", source: "approved", visibility: "private" },
    { id: "missing-approved", source: "approved" },
    { id: "public-unapproved", source: "unapproved", visibility: "public" }
  ];
  const browserIds = selectExplicitlyPublicProblems(fixture).map((problem) => problem.id);
  const releaseIds = selectReleaseProblems(fixture, new Set(["approved"])).map((problem) => problem.id);
  checks.browserSelectorRequiresExplicitPublic = equalIds(browserIds, ["public-approved", "public-unapproved"]);
  checks.releaseSelectorRequiresRightsAndExplicitPublic = equalIds(releaseIds, ["public-approved"]);
  let configuredCatalogRejected = false;
  try {
    assertExplicitlyPublicProblems(fixture, "fixture");
  } catch (error) {
    configuredCatalogRejected = /non-public problem/i.test(String(error?.message || error));
  }
  checks.configuredBrowserCatalogRejectsNonPublic = configuredCatalogRejected;
  requireChecks("selection rules", [
    "browserSelectorRequiresExplicitPublic",
    "releaseSelectorRequiresRightsAndExplicitPublic",
    "configuredBrowserCatalogRejectsNonPublic"
  ]);
}

function checkFrontendVisibilityModel() {
  const privateProblem = normalizeProblem({
    id: "private-frontend",
    titleEn: "Private catalog problem",
    promptEn: "Only authenticated users may receive this catalog entry.",
    source: "question-bank",
    visibility: "private"
  });
  checks.frontendRetainsPrivateVisibility = privateProblem.visibility === "private";
  checks.frontendDoesNotTreatPrivateAsUserOwned = isUserProblem(privateProblem) === false;
  requireChecks("frontend visibility model", [
    "frontendRetainsPrivateVisibility",
    "frontendDoesNotTreatPrivateAsUserOwned"
  ]);
}

function checkApiImportAndAuthentication() {
  const catalogPath = path.join(tempDir, "api-problem-catalog.json");
  const databasePath = path.join(tempDir, "api.sqlite3");
  const legacyDatabasePath = path.join(tempDir, "legacy.sqlite3");
  fs.writeFileSync(catalogPath, JSON.stringify({
    problems: [
      apiFixtureProblem("api-public", "public"),
      apiFixtureProblem("api-private", "private")
    ]
  }), "utf8");

  const python = String.raw`
import importlib.util
import json
import sqlite3
import threading
import urllib.request
from pathlib import Path

server_path = Path(${JSON.stringify(path.join(root, "api-server", "server.py"))})
spec = importlib.util.spec_from_file_location("quantgym_visibility_server", server_path)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

with server.db.connect() as conn:
    stored = {row["id"]: row["visibility"] for row in conn.execute("SELECT id, visibility FROM problems").fetchall()}
    anonymous = {problem["id"] for problem in server.db.get_problems(conn)}
    authenticated = {problem["id"] for problem in server.db.get_problems(conn, "authenticated-user")}
    server.db.ensure_visible_problem(conn, "api-private", "authenticated-user")
    anonymous_private_hidden = False
    try:
        server.db.ensure_visible_problem(conn, "api-private")
    except server.HttpError as error:
        anonymous_private_hidden = error.status == 404

assert stored == {"api-private": "private", "api-public": "public"}, stored
assert anonymous == {"api-public"}, anonymous
assert authenticated == {"api-public", "api-private"}, authenticated
assert anonymous_private_hidden

http_server = server.ThreadingHTTPServer(("127.0.0.1", 0), server.QuantGymHandler)
http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
http_thread.start()
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{http_server.server_port}/api/problems", timeout=5) as response:
        assert response.headers.get("Cache-Control") == "private, no-store", response.headers
        vary = ",".join(response.headers.get_all("Vary") or []).lower()
        assert "authorization" in vary, response.headers
        assert {problem["id"] for problem in json.load(response)["problems"]} == {"api-public"}
finally:
    http_server.shutdown()
    http_server.server_close()
    http_thread.join(timeout=5)

legacy_path = Path(${JSON.stringify(legacyDatabasePath)})
legacy = sqlite3.connect(legacy_path)
legacy.executescript("""
CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'user')),
  owner_user_id TEXT,
  title_en TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  prompt_zh TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  problem_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO problems VALUES (
  'legacy-public', 'public', NULL, 'Legacy', '', 'probabilityExpectation', 'Easy', '[]',
  'fixture', '', 'Legacy prompt', '', '', '', '{"id":"legacy-public","visibility":"public"}',
  '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
);
""")
legacy.commit()
legacy.close()

migrated = server.Database(legacy_path)
with migrated.connect() as conn:
    schema = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='problems'").fetchone()["sql"]
    assert "'private'" in schema.lower(), schema
    assert conn.execute("SELECT COUNT(*) FROM problems WHERE id='legacy-public'").fetchone()[0] == 1
    migrated.upsert_problems(conn, [${JSON.stringify(apiFixtureProblem("legacy-private", "private"))}], preserve_problem_visibility=True)
    assert conn.execute("SELECT visibility FROM problems WHERE id='legacy-private'").fetchone()[0] == "private"

print(json.dumps({
  "catalogVisibilityPreserved": True,
  "anonymousPrivateHidden": True,
  "authenticatedPrivateVisible": True,
  "legacySqliteMigrated": True,
  "apiProblemResponseDisablesSharedCaching": True
}))
`;
  const run = spawnSync("python3", ["-c", python], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: [path.join(root, "api-server"), process.env.PYTHONPATH || ""].filter(Boolean).join(path.delimiter),
      QUANTGYM_DB_BACKEND: "sqlite",
      QUANTGYM_DB: databasePath,
      QUANTGYM_PROBLEM_CATALOG: catalogPath,
      QUANTGYM_JOBS_SOURCE_URL: "disabled",
      QUANTGYM_RATE_LIMIT_DISABLED: "1"
    },
    maxBuffer: 1024 * 1024 * 5
  });
  if (run.status !== 0) {
    throw new Error(`API visibility fixture failed (${run.status}):\n${run.stderr || run.stdout}`);
  }
  const apiChecks = JSON.parse(run.stdout.trim().split(/\r?\n/).at(-1));
  Object.assign(checks, apiChecks);
  requireChecks("API visibility boundary", Object.keys(apiChecks));
}

function checkDefaultStaticBuild() {
  const distDir = path.join(tempDir, "dist");
  const run = spawnSync(process.execPath, ["scripts/build-static-site.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      QUANTGYM_WEB_DIST: distDir,
      QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE: "",
      QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "/data/problem-catalog.js?v=visibility-boundary"
    },
    maxBuffer: 1024 * 1024 * 20
  });
  if (run.status !== 0) {
    throw new Error(`Static visibility build failed (${run.status}):\n${run.stderr || run.stdout}`);
  }

  const compiled = JSON.parse(fs.readFileSync(path.join(root, "data", "problem-catalog.json"), "utf8"));
  const expected = selectExplicitlyPublicProblems(compiled.problems);
  const browserScriptPath = path.join(distDir, "data", "problem-catalog.js");
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(browserScriptPath, "utf8"), sandbox, {
    filename: browserScriptPath,
    timeout: 5000
  });
  const shipped = sandbox.window.quantProblemCatalog;
  checks.defaultStaticCatalogExists = Array.isArray(shipped);
  checks.defaultStaticCatalogMatchesExplicitPublicCount = shipped?.length === expected.length;
  checks.defaultStaticCatalogContainsOnlyExplicitPublic = Array.isArray(shipped)
    && shipped.every((problem) => problem?.visibility === "public");
  const privateIds = new Set(compiled.problems
    .filter((problem) => problem?.visibility === "private")
    .map((problem) => problem.id));
  checks.defaultStaticCatalogContainsNoPrivateIds = Array.isArray(shipped)
    && shipped.every((problem) => !privateIds.has(problem.id));
  requireChecks("default static build", [
    "defaultStaticCatalogExists",
    "defaultStaticCatalogMatchesExplicitPublicCount",
    "defaultStaticCatalogContainsOnlyExplicitPublic",
    "defaultStaticCatalogContainsNoPrivateIds"
  ]);
}

function apiFixtureProblem(id, visibility) {
  return {
    id,
    titleEn: `${visibility} fixture`,
    titleZh: "",
    category: "probabilityExpectation",
    difficulty: "Easy",
    tags: ["visibility-fixture"],
    source: "visibility-fixture",
    sourceUrl: "fixture",
    promptEn: `Prompt for ${visibility} fixture.`,
    promptZh: "",
    answer: "",
    explanation: "",
    visibility
  };
}

function equalIds(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function requireChecks(label, names) {
  const failed = names.filter((name) => checks[name] !== true);
  if (failed.length) throw new Error(`${label} failed: ${failed.join(", ")}`);
}
