#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateMarker = "PRIVATE_FIXTURE_CONTENT_MUST_NOT_SHIP";
const publicProblem = { id: "fixture-public", visibility: "public", promptZh: "Public fixture" };

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-static-catalog-privacy-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const relative of ["scripts/lib", "data", "assets/generated", "node_modules/.bin"]) {
    fs.mkdirSync(path.join(dir, relative), { recursive: true });
  }
  for (const relative of ["scripts/build-static-site.mjs", "scripts/lib/question-bank-visibility.mjs"]) {
    fs.copyFileSync(path.join(root, relative), path.join(dir, relative));
  }
  const problems = [
    publicProblem,
    { id: "fixture-private", visibility: "private", promptZh: privateMarker },
    { id: "fixture-unspecified", promptZh: privateMarker },
    { id: "fixture-user", visibility: "user", promptZh: privateMarker }
  ];
  fs.writeFileSync(path.join(dir, "data/problem-catalog.json"), JSON.stringify({ problems }));
  fs.writeFileSync(path.join(dir, "data/problem-catalog.js"), `window.quantProblemCatalog=${JSON.stringify(problems)};`);
  fs.writeFileSync(path.join(dir, "data/library-catalog.js"), "window.libraryCatalog=[];\n");

  // Exercise the real static publishing code with an isolated Vite output fixture.
  // The full visibility-boundary check also runs the actual Vite application build.
  const vite = path.join(dir, "node_modules/.bin/vite");
  fs.writeFileSync(vite, `#!${process.execPath}\n` + String.raw`
const fs = require("node:fs");
const path = require("node:path");
const dist = process.env.QUANTGYM_WEB_DIST;
fs.mkdirSync(path.join(dist, "assets"), {recursive:true});
fs.writeFileSync(path.join(dist, "index.html"), '<html lang="zh-CN"><script src="config.js"></script></html>');
`);
  fs.chmodSync(vite, 0o755);
  return dir;
}

function build(dir, extraEnv = {}) {
  return spawnSync(process.execPath, ["scripts/build-static-site.mjs", "--strict"], {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      QUANTGYM_WEB_DIST: path.join(dir, "dist"),
      QUANTGYM_WEB_API_ENDPOINT: "https://api.example.test/api",
      QUANTGYM_WEB_LLM_ENDPOINT: "https://llm.example.test/interview",
      QUANTGYM_WEB_BUILD_COMMIT: "a".repeat(40),
      QUANTGYM_WEB_BUILD_BRANCH: "fixture",
      QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE: "",
      QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "/data/problem-catalog.js?v=fixture",
      ...extraEnv
    },
    maxBuffer: 1024 * 1024
  });
}

function readCatalog(dir, name = "problem-catalog.js") {
  const source = fs.readFileSync(path.join(dir, "dist/data", name), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  return { source, problems: JSON.parse(JSON.stringify(sandbox.window.quantProblemCatalog)) };
}

test("default static catalog drops private, user and unspecified visibility while retaining deployment outputs", (t) => {
  const dir = fixture(t);
  const result = build(dir);
  assert.equal(result.status, 0, result.stderr);
  const { source, problems } = readCatalog(dir);
  assert.deepEqual(problems, [publicProblem]);
  assert.equal(source.includes(privateMarker), false);
  assert.deepEqual(fs.readdirSync(path.join(dir, "dist/data")).sort(), ["library-catalog.js", "problem-catalog.js"]);
  for (const relative of ["version.json", "config.js", "zh/index.html", "en/index.html", "_redirects", "assets/404.html"]) {
    assert.equal(fs.existsSync(path.join(dir, "dist", relative)), true, relative);
  }
});

for (const visibility of ["private", "user", undefined]) {
  test(`configured static catalog rejects ${visibility || "unspecified"} visibility`, (t) => {
    const dir = fixture(t);
    const problems = [publicProblem, { id: "unsafe-configured", visibility, promptZh: privateMarker }];
    fs.writeFileSync(path.join(dir, "configured.js"), `window.quantProblemCatalog=${JSON.stringify(problems)};`);
    const result = build(dir, { QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE: "configured.js" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /non-public problem/);
    assert.equal(fs.existsSync(path.join(dir, "dist/data/problem-catalog.js")), false);
  });
}

test("configured public catalog serializes validated rows without copying extra source content", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "configured.js"), [
    `window.quantProblemCatalog=${JSON.stringify([publicProblem])};`,
    `window.unrelatedPrivateData=${JSON.stringify(privateMarker)};`
  ].join("\n"));
  const result = build(dir, {
    QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE: "configured.js",
    QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "/data/release-catalog.js?v=fixture"
  });
  assert.equal(result.status, 0, result.stderr);
  const { source, problems } = readCatalog(dir, "release-catalog.js");
  assert.deepEqual(problems, [publicProblem]);
  assert.equal(source.includes(privateMarker), false);
  assert.equal(fs.existsSync(path.join(dir, "dist/data/problem-catalog.js")), false);
});

test("HTTPS catalog configuration does not copy the local full catalog and cannot combine a local source", (t) => {
  const dir = fixture(t);
  const env = { QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT: "https://example.test/public.js" };
  const result = build(dir, env);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(dir, "dist/data/problem-catalog.js")), false);
  const rejected = build(dir, { ...env, QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE: "data/problem-catalog.js" });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /cannot be used with an HTTPS/);
});
