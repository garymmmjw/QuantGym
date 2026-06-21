#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noBuild = args.includes("--no-build");
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/321-static-build-config-summary.json";
const failures = [];

const build = noBuild
  ? { status: 0, stdout: "", stderr: "" }
  : spawnSync("npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10
  });

const npmRunBuildPassed = build.status === 0;
if (!npmRunBuildPassed) {
  failures.push("npm run build failed");
}

const distConfigPath = path.join(root, "dist", "config.js");
const distVersionPath = path.join(root, "dist", "version.json");
const distConfigText = readText(distConfigPath);
const distConfig = distConfigText ? parseDistConfig(distConfigText, distConfigPath) : {};
const distVersionText = readText(distVersionPath);
const distVersion = distVersionText ? parseJson(distVersionText, distVersionPath) : null;

const distConfigContainsOpenAiKey = /OPENAI_API_KEY|sk-[A-Za-z0-9_-]{12,}/.test(distConfigText);
const distVersionJsonPresent = Boolean(distVersion);
const distVersionJsonMatchesConfig = Boolean(
  distVersion
    && distVersion.commit === distConfig.buildCommit
    && distVersion.branch === distConfig.buildBranch
    && distVersion.source === distConfig.buildSource
);
const strictModeRejectsLocalHttpEndpoints = strictRejectsLocalHttpEndpoints();

expect(Boolean(distConfig.cloudApiEndpoint), "dist config cloud API endpoint is missing");
expect(Boolean(distConfig.llmEndpoint), "dist config LLM endpoint is missing");
expect(Boolean(distConfig.llmModel), "dist config LLM model is missing");
expect(Boolean(distConfig.googleClientId), "dist config Google Client ID is missing");
expect(distConfig.googleLoginEnabled === true, "dist config Google login is not enabled");
expect(distConfigContainsOpenAiKey === false, "dist config embeds an OpenAI key marker");
expect(/^[0-9a-f]{7,40}$/i.test(String(distConfig.buildCommit || "")), "dist config build commit is missing or invalid");
expect(distVersionJsonPresent, "dist/version.json is missing");
expect(distVersionJsonMatchesConfig, "dist/version.json does not match dist/config.js build metadata");
expect(strictModeRejectsLocalHttpEndpoints, "strict build did not reject local HTTP endpoints");

const summary = {
  id: 321,
  date: new Date().toISOString().slice(0, 10),
  surface: "static build",
  status: failures.length ? "fail" : "pass",
  checks: {
    npmRunBuildPassed,
    distConfigCloudApiEndpoint: clean(distConfig.cloudApiEndpoint),
    distConfigLlmEndpoint: clean(distConfig.llmEndpoint),
    distConfigLlmModel: clean(distConfig.llmModel),
    distConfigGoogleClientIdSet: Boolean(distConfig.googleClientId),
    distConfigGoogleLoginEnabled: distConfig.googleLoginEnabled === true,
    distConfigContainsOpenAiKey,
    distConfigBuildCommit: clean(distConfig.buildCommit),
    distConfigBuildBranch: clean(distConfig.buildBranch),
    distConfigBuildSource: clean(distConfig.buildSource),
    distVersionJsonPresent,
    distVersionJsonMatchesConfig,
    strictModeRejectsLocalHttpEndpoints
  },
  failures,
  notes: [
    "scripts/build-static-site.mjs writes public runtime config to dist/config.js.",
    "dist/version.json mirrors the build commit, branch, and source for deployment provenance checks.",
    "Strict mode still requires HTTPS endpoints for beta or production deploys."
  ]
};

const output = `${JSON.stringify(summary, null, 2)}\n`;
fs.mkdirSync(path.dirname(path.resolve(root, summaryPath)), { recursive: true });
fs.writeFileSync(path.resolve(root, summaryPath), output);
process.stdout.write(output);
if (failures.length) process.exit(1);

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseDistConfig(source, filename) {
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox, { filename, timeout: 1000 });
    return sandbox.window.QUANTGYM_CONFIG || {};
  } catch (error) {
    failures.push(`could not parse dist/config.js: ${error.message}`);
    return {};
  }
}

function parseJson(source, filename) {
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`could not parse ${path.relative(root, filename)}: ${error.message}`);
    return null;
  }
}

function strictRejectsLocalHttpEndpoints() {
  const result = spawnSync(process.execPath, ["scripts/build-static-site.mjs", "--strict"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      QUANTGYM_WEB_API_ENDPOINT: "http://127.0.0.1:8790/api",
      QUANTGYM_WEB_LLM_ENDPOINT: "http://127.0.0.1:8787/interview"
    },
    maxBuffer: 1024 * 1024
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  return result.status !== 0 && /must start with https:\/\//i.test(output);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function clean(value) {
  return String(value || "").trim();
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}
