#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
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

const damagedAudienceGate = runPasteTokenGateWithDamagedAudience();
checks.deployedPasteTokenRejectsDamagedGoogleAudience = damagedAudienceGate.status !== 0
  && damagedAudienceGate.json?.tokenAudienceMatchesExpected === false
  && damagedAudienceGate.json?.tokenAudienceHost === "googleusercont.com"
  && damagedAudienceGate.json?.expectedGoogleClientIdHost === "googleusercontent.com"
  && damagedAudienceGate.json?.tokenAudienceLooksCorruptedGoogleClientId === true;
checks.deployedPasteTokenRejectsDamagedGoogleAudienceWithoutTokenLeak = !damagedAudienceGate.output.includes(damagedAudienceGate.token);

for (const [name, value] of Object.entries(checks)) {
  if (!value) failures.push(name);
}

const summary = {
  status: failures.length ? "fail" : "pass",
  generatedPath: "artifacts/google-id-token-helper.html",
  local: summarize(local),
  deployed: summarize(deployed),
  damagedAudienceGate: summarizeDamagedAudienceGate(damagedAudienceGate),
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

function runPasteTokenGateWithDamagedAudience() {
  const expectedClientId = "539256360065-3297isnu2o7dgpvptq4lr77eh0sf43r4.apps.googleusercontent.com";
  const damagedClientId = expectedClientId.replace("googleusercontent.com", "googleusercont.com");
  const token = unsignedJwt({
    iss: "https://accounts.google.com",
    aud: damagedClientId,
    azp: damagedClientId,
    sub: "google-token-helper-flow-smoke",
    email: "helper-smoke@example.com",
    email_verified: true,
    nbf: Math.floor(Date.now() / 1000) - 30,
    iat: Math.floor(Date.now() / 1000) - 30,
    exp: Math.floor(Date.now() / 1000) + 600
  });
  const result = spawnSync(process.execPath, ["scripts/run-google-token-gate.mjs", "--verify-deployed", "--dry-run"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      QUANTGYM_GOOGLE_ID_TOKEN: token,
      NO_COLOR: "1"
    },
    maxBuffer: 1024 * 1024
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  return {
    status: result.status,
    output,
    token,
    json: parseFirstJson(output)
  };
}

function unsignedJwt(payload) {
  return [
    base64UrlJson({ alg: "none", typ: "JWT" }),
    base64UrlJson(payload),
    "signature"
  ].join(".");
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseFirstJson(output) {
  const start = String(output || "").indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(String(output).slice(start));
  } catch {
    return null;
  }
}

function summarizeDamagedAudienceGate(result) {
  return {
    status: result.status,
    parsedJson: Boolean(result.json),
    tokenPrinted: result.output.includes(result.token),
    tokenAudienceHost: result.json?.tokenAudienceHost || "",
    expectedGoogleClientIdHost: result.json?.expectedGoogleClientIdHost || "",
    tokenAudienceLooksCorruptedGoogleClientId: result.json?.tokenAudienceLooksCorruptedGoogleClientId === true
  };
}
