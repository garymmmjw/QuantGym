#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(root, "artifacts", "google-id-token-helper.html");
const summaryPath = path.join(root, "docs/browser-audit-screenshots/356-google-token-helper-flow-summary.json");

const failures = [];
const checks = {};

const local = runHelper([]);
const localHtml = readArtifact();
checks.localTarget = local.target === "local";
checks.localUrlIsLoopback = local.url === "http://127.0.0.1:5179/artifacts/google-id-token-helper.html";
checks.localUsesGoogleButton = localHtml.includes("window.google.accounts.id.renderButton")
  && localHtml.includes("<div id=\"googleButton\"></div>");
checks.localMentionsVerifier = localHtml.includes("rejects expired or nearly expired tokens");

const deployed = runHelper(["--deployed"]);
const deployedHtml = readArtifact();
checks.deployedTarget = deployed.target === "deployed";
checks.deployedOriginIsBeta = deployed.deployedOrigin === "https://beta.quantgym.app";
checks.deployedNextStepsUseExternalOrigin = Array.isArray(deployed.nextSteps)
  && deployed.nextSteps.some((step) => String(step).includes("https://beta.quantgym.app"));
checks.deployedWarnsAboutOriginMismatch = deployedHtml.includes("origin_mismatch");
checks.deployedProvidesConsoleSnippet = deployedHtml.includes("id=\"consoleSnippet\"")
  && deployedHtml.includes("Token copied. Paste it to Codex immediately.");
checks.deployedAvoidsLocalGisScriptTag = !deployedHtml.includes("<script src=\"https://accounts.google.com/gsi/client\" async defer></script>");
checks.deployedDoesNotTellUserToSignInOnLoopback = !deployedHtml.includes("Use this page only from <code>http://127.0.0.1:5179</code>")
  && !deployed.nextSteps.some((step) => /sign in.+127\.0\.0\.1/i.test(String(step)));
checks.deployedVerifierCommand = deployed.verifyCommand === "npm run verify:production-boundaries:deployed:paste-token";
checks.tokenNotWrittenToArtifact = !/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(deployedHtml);

for (const [name, value] of Object.entries(checks)) {
  if (!value) failures.push(name);
}

const summary = {
  status: failures.length ? "fail" : "pass",
  generatedPath: "artifacts/google-id-token-helper.html",
  local: summarize(local),
  deployed: summarize(deployed),
  checks,
  failures
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

if (failures.length) process.exit(1);

function runHelper(args) {
  const output = execFileSync(process.execPath, ["scripts/create-google-token-helper.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1"
    }
  });
  return JSON.parse(output);
}

function readArtifact() {
  return fs.readFileSync(artifactPath, "utf8");
}

function summarize(result) {
  return {
    status: result.status,
    target: result.target,
    url: result.url,
    deployedOrigin: result.deployedOrigin,
    clientIdSource: result.clientIdSource,
    clientIdSet: result.clientIdSet,
    verifyCommand: result.verifyCommand,
    nextStepCount: Array.isArray(result.nextSteps) ? result.nextSteps.length : 0
  };
}
