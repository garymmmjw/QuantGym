import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  BROWSER_BUILD_ENV_KEYS_TO_CLEAR,
  CANONICAL_BROWSER_BUILD_CONFIG,
  assertSuccessfulSubprocess,
  canonicalBrowserBuildEnv,
  distRuntimeFingerprint,
  readBuiltRuntimeProvenance
} from "../scripts/lib/browser-route-targets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const explicitApiEndpoint = "http://127.0.0.1:8790/api";
const explicitLlmEndpoint = "http://127.0.0.1:8787/interview";
const conflictingValues = [
  "https://dotenv.invalid/api",
  "https://dotenv.invalid/interview",
  "dotenv-google-client-id.apps.googleusercontent.com",
  "https://runtime.invalid/api",
  "https://runtime.invalid/interview",
  "runtime-google-client-id.apps.googleusercontent.com"
];
const buildTimeoutMs = 120000;

test("build isolation flags are opt-in independently", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-build-isolation-matrix-"));
  const fixtureRoot = path.join(tempRoot, "project");
  try {
    createFixtureProject(fixtureRoot);
    writeConflictingInputs(fixtureRoot);
    const cases = [
      {
        name: "normal build reads dotenv before runtime config",
        flags: {},
        expected: { api: "https://dotenv.invalid/api", llm: "https://dotenv.invalid/interview", google: "dotenv-google-client-id.apps.googleusercontent.com" }
      },
      {
        name: "dotenv-only isolation still reads runtime config",
        flags: { QUANTGYM_WEB_IGNORE_DOTENV: "1" },
        expected: { api: "https://runtime.invalid/api", llm: "https://runtime.invalid/interview", google: "runtime-google-client-id.apps.googleusercontent.com" }
      },
      {
        name: "runtime-only isolation still reads dotenv",
        flags: { QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG: "1" },
        expected: { api: "https://dotenv.invalid/api", llm: "https://dotenv.invalid/interview", google: "dotenv-google-client-id.apps.googleusercontent.com" }
      },
      {
        name: "both flags use only explicit inputs",
        flags: {
          QUANTGYM_WEB_IGNORE_DOTENV: "1",
          QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG: "1",
          QUANTGYM_WEB_API_ENDPOINT: explicitApiEndpoint,
          QUANTGYM_WEB_LLM_ENDPOINT: explicitLlmEndpoint,
          QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: "false"
        },
        expected: { api: explicitApiEndpoint, llm: explicitLlmEndpoint, google: "" }
      }
    ];
    for (const [index, entry] of cases.entries()) {
      const distDir = path.join(tempRoot, `dist-${index}`);
      const build = runBuild(fixtureRoot, directBuildEnv(distDir, entry.flags), entry.name);
      assertSuccessfulSubprocess(entry.name, build);
      const config = parseBuiltConfig(path.join(distDir, "config.js"));
      assert.equal(config.cloudApiEndpoint, entry.expected.api, entry.name);
      assert.equal(config.llmEndpoint, entry.expected.llm, entry.name);
      assert.equal(config.googleClientId, entry.expected.google, entry.name);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("canonical browser build environment resists every poisoned ambient alias", () => {
  assert.equal(typeof canonicalBrowserBuildEnv, "function");
  assert.ok(Array.isArray(BROWSER_BUILD_ENV_KEYS_TO_CLEAR));
  const poison = Object.fromEntries(BROWSER_BUILD_ENV_KEYS_TO_CLEAR.map((name) => [name, `poison-${name}`]));
  const env = canonicalBrowserBuildEnv("/tmp/quantgym-canonical-dist", {
    ...poison,
    PATH: process.env.PATH
  });
  assert.equal(env.QUANTGYM_WEB_DIST, "/tmp/quantgym-canonical-dist");
  assert.equal(env.QUANTGYM_WEB_IGNORE_DOTENV, "1");
  assert.equal(env.QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG, "1");
  assert.equal(env.QUANTGYM_WEB_API_ENDPOINT, explicitApiEndpoint);
  assert.equal(env.QUANTGYM_WEB_LLM_ENDPOINT, explicitLlmEndpoint);
  assert.equal(env.QUANTGYM_WEB_LLM_MODEL, "gpt-5-nano");
  assert.equal(env.QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED, "false");
  assert.equal(env.QUANTGYM_WEB_GOOGLE_CLIENT_ID, "");
  assert.equal(env.QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT, "/data/problem-catalog.js?v=2");
  assert.equal(Object.hasOwn(env, "QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE"), false);
  assert.equal(Object.hasOwn(env, "QUANTGYM_WEB_STRICT"), false);
  for (const name of BROWSER_BUILD_ENV_KEYS_TO_CLEAR) {
    if (Object.hasOwn(CANONICAL_BROWSER_BUILD_CONFIG.env, name)) continue;
    assert.notEqual(env[name], poison[name], name);
  }
});

test("explicit build isolation ignores dotenv and root runtime config", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-build-isolation-"));
  const fixtureRoot = path.join(tempRoot, "project");
  const distDir = path.join(tempRoot, "dist");

  try {
    createFixtureProject(fixtureRoot);
    writeConflictingInputs(fixtureRoot);

    const poisonedAmbient = Object.fromEntries(
      BROWSER_BUILD_ENV_KEYS_TO_CLEAR.map((name) => [name, `https://poison.invalid/${name}`])
    );
    const build = runBuild(
      fixtureRoot,
      canonicalBrowserBuildEnv(distDir, { ...process.env, ...poisonedAmbient }),
      "poison-resistant fixture build"
    );
    assertSuccessfulSubprocess("poison-resistant fixture build", build);

    const configPath = path.join(distDir, "config.js");
    const builtConfig = parseBuiltConfig(configPath);
    assert.equal(builtConfig.cloudApiEndpoint, explicitApiEndpoint);
    assert.equal(builtConfig.llmEndpoint, explicitLlmEndpoint);
    assert.equal(builtConfig.googleClientId, "");
    assert.equal(builtConfig.googleLoginEnabled, false);
    assert.equal(builtConfig.llmModel, "gpt-5-nano");
    assert.equal(builtConfig.problemCatalogScript, "/data/problem-catalog.js?v=2");

    const builtFiles = listFiles(distDir);
    assert.ok(builtFiles.length > 0, "temporary build emitted no files");
    for (const conflict of conflictingValues) {
      assert.equal(
        builtFiles.some((filePath) => fs.readFileSync(filePath).includes(Buffer.from(conflict))),
        false,
        `temporary build leaked conflicting value: ${conflict}`
      );
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("subprocess failure reporting distinguishes errors, signals, and exit status", () => {
  assert.throws(
    () => assertSuccessfulSubprocess("timed build", {
      error: Object.assign(new Error("spawnSync timed out"), { code: "ETIMEDOUT" }),
      status: null,
      signal: "SIGTERM",
      stdout: "partial stdout",
      stderr: "partial stderr"
    }),
    /timed build[\s\S]*ETIMEDOUT[\s\S]*SIGTERM[\s\S]*partial stdout[\s\S]*partial stderr/i
  );
  assert.throws(
    () => assertSuccessfulSubprocess("failed build", {
      status: 7,
      signal: null,
      stdout: "stdout marker",
      stderr: "stderr marker"
    }),
    /failed build[\s\S]*status 7[\s\S]*stdout marker[\s\S]*stderr marker/i
  );
});

test("two real canonical builds have one normalized full-dist fingerprint", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-real-build-fingerprint-"));
  try {
    const first = path.join(tempRoot, "first");
    const second = path.join(tempRoot, "second");
    for (const [name, distDir] of [["first", first], ["second", second]]) {
      const build = runBuild(root, canonicalBrowserBuildEnv(distDir, process.env), `${name} canonical build`);
      assertSuccessfulSubprocess(`${name} canonical build`, build);
      readBuiltRuntimeProvenance(distDir);
    }
    assert.equal(distRuntimeFingerprint(first), distRuntimeFingerprint(second));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

function createFixtureProject(fixtureRoot) {
  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  for (const relativePath of [
    "index.html",
    "package.json",
    "styles.css",
    "vite.config.js",
    "scripts/build-static-site.mjs"
  ]) {
    const destination = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, relativePath), destination);
  }
  for (const directory of ["assets", "data", "node_modules", "public", "src"]) {
    fs.symlinkSync(path.join(root, directory), path.join(fixtureRoot, directory), "dir");
  }
}

function writeConflictingInputs(fixtureRoot) {
  fs.writeFileSync(path.join(fixtureRoot, ".env"), [
    "QUANTGYM_WEB_API_ENDPOINT=https://dotenv.invalid/api",
    "QUANTGYM_WEB_LLM_ENDPOINT=https://dotenv.invalid/interview",
    "QUANTGYM_WEB_LLM_MODEL=dotenv-model",
    "QUANTGYM_WEB_GOOGLE_CLIENT_ID=dotenv-google-client-id.apps.googleusercontent.com",
    "QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=true",
    ""
  ].join("\n"));
  fs.writeFileSync(path.join(fixtureRoot, "config.js"), [
    "window.QUANTGYM_CONFIG = {",
    "  cloudApiEndpoint: \"https://runtime.invalid/api\",",
    "  llmEndpoint: \"https://runtime.invalid/interview\",",
    "  llmModel: \"runtime-model\",",
    "  googleClientId: \"runtime-google-client-id.apps.googleusercontent.com\",",
    "  googleLoginEnabled: true",
    "};",
    ""
  ].join("\n"));
}

function directBuildEnv(distDir, overrides = {}) {
  const env = { ...process.env };
  for (const name of [
    ...BROWSER_BUILD_ENV_KEYS_TO_CLEAR,
    "QUANTGYM_WEB_API_ENDPOINT",
    "QUANTGYM_WEB_DIST",
    "QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED",
    "QUANTGYM_WEB_IGNORE_DOTENV",
    "QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG",
    "QUANTGYM_WEB_LLM_ENDPOINT"
  ]) delete env[name];
  return { ...env, QUANTGYM_WEB_DIST: distDir, ...overrides };
}

function runBuild(cwd, env, label) {
  return spawnSync(process.execPath, ["scripts/build-static-site.mjs"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    timeout: buildTimeoutMs,
    env,
    windowsHide: true,
    killSignal: "SIGTERM"
  });
}

function parseBuiltConfig(configPath) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(configPath, "utf8"), context, { filename: configPath });
  return context.window.QUANTGYM_CONFIG || {};
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    });
}
