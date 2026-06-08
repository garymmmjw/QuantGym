#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const DEFAULT_RESUME = [
  "Built a Python market making simulator for option risk analysis.",
  "Processed 1.2M rows of tick data and reduced scenario runtime by 38%.",
  "Targeting quant trading and research internships."
].join(" ");

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFromProjectRoot();
const runtimeConfig = loadRuntimeConfig();

const env = process.env;
const llmEndpoint = clean(env.QUANTGYM_LLM_ENDPOINT || env.LLM_ENDPOINT || runtimeConfig.llmEndpoint);
const cloudApiEndpoint = clean(env.QUANTGYM_CLOUD_API_ENDPOINT || env.CLOUD_API_ENDPOINT || runtimeConfig.cloudApiEndpoint);
const googleIdToken = clean(env.QUANTGYM_GOOGLE_ID_TOKEN || env.GOOGLE_ID_TOKEN);
const llmBearerToken = clean(env.QUANTGYM_LLM_BEARER_TOKEN || env.LLM_BEARER_TOKEN);
const googleClientId = clean(env.QUANTGYM_GOOGLE_CLIENT_ID || runtimeConfig.googleClientId);
const model = clean(env.QUANTGYM_LLM_MODEL || env.OPENAI_MODEL || runtimeConfig.llmModel) || "gpt-5-nano";

const results = [];

await check("cloud health", Boolean(cloudApiEndpoint), async () => {
  const data = await requestJson(`${cloudApiEndpoint.replace(/\/+$/, "")}/health`, { method: "GET" });
  assert(data.ok === true, "Expected { ok: true } from cloud health endpoint");
  return { ok: data.ok };
});

await check("google provider config", Boolean(cloudApiEndpoint && googleClientId), async () => {
  const data = await requestJson(`${cloudApiEndpoint.replace(/\/+$/, "")}/auth/google`, {
    method: "POST",
    allowStatus: [400],
    body: {
      credential: "",
      account: {}
    }
  });
  assert(/Google ID token is required/i.test(data.error || data.message || ""), "Google endpoint did not reach configured token validation path");
  return { googleClientIdSet: true, endpointRequiresToken: true };
});

await check("google provider login", Boolean(cloudApiEndpoint && googleIdToken), async () => {
  const tokenSanity = validateGoogleIdToken(googleIdToken, googleClientId);
  const data = await requestJson(`${cloudApiEndpoint.replace(/\/+$/, "")}/auth/google`, {
    method: "POST",
    body: {
      credential: googleIdToken,
      account: {
        country: "china",
        region: "上海"
      }
    }
  });
  assert(data.token, "Google login response is missing token");
  assert(data.account?.email, "Google login response is missing email");
  const provider = data.account?.provider || "";
  const googleLinked = provider === "google" || String(data.account?.googleId || "").startsWith("google:");
  assert(googleLinked, "Google login response is not a Google account or linked account");
  return {
    provider,
    googleLinked,
    email: redactEmail(data.account.email),
    hasToken: Boolean(data.token),
    tokenAudienceMatchesClientId: tokenSanity.audienceMatchesClientId,
    tokenExpiresAt: tokenSanity.expiresAt,
    tokenEmail: redactEmail(tokenSanity.email)
  };
});

await check("LLM resume review", Boolean(llmEndpoint), async () => {
  const data = await requestJson(llmEndpoint, {
    method: "POST",
    headers: llmHeaders(),
    body: {
      task: "resume_review",
      model,
      language: "zh",
      graduationTerm: "2027 Summer",
      target: "quant internship",
      resume: DEFAULT_RESUME
    }
  });
  const items = extractReviewItems(data);
  assert(items.length > 0, "LLM resume review returned no suggestions");
  return { itemCount: items.length, firstItem: String(items[0]).slice(0, 120) };
});

await check("LLM PDF question generation", Boolean(llmEndpoint), async () => {
  const data = await requestJson(llmEndpoint, {
    method: "POST",
    headers: llmHeaders(),
    body: {
      task: "generate_pdf_questions",
      model,
      language: "zh",
      interviewType: "technical",
      count: 1,
      file: {
        name: "quantgym-production-boundary-smoke.pdf",
        dataUrl: minimalPdfDataUrl()
      }
    }
  });
  assert(Array.isArray(data.questions), "PDF generation response is missing questions array");
  assert(data.questions.length >= 1, "PDF generation returned no questions");
  return {
    questionCount: data.questions.length,
    firstTitle: String(data.questions[0]?.titleEn || data.questions[0]?.titleZh || "").slice(0, 120)
  };
});

const failed = results.filter((item) => item.status === "fail");
const skipped = results.filter((item) => item.status === "skip");
const passed = results.filter((item) => item.status === "pass");

console.log(JSON.stringify({
  status: failed.length ? "fail" : skipped.length ? "partial" : "pass",
  passed: passed.length,
  skipped: skipped.length,
  failed: failed.length,
  results
}, null, 2));

if (failed.length) process.exitCode = 1;

async function check(name, enabled, fn) {
  if (!enabled) {
    results.push({
      name,
      status: "skip",
      reason: skipReason(name)
    });
    return;
  }
  const start = Date.now();
  try {
    const data = await fn();
    results.push({
      name,
      status: "pass",
      durationMs: Date.now() - start,
      data
    });
  } catch (error) {
    results.push({
      name,
      status: "fail",
      durationMs: Date.now() - start,
      error: error.message || String(error)
    });
  }
}

async function requestJson(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const data = await response.json().catch(() => ({}));
  const allowStatus = Array.isArray(options.allowStatus) ? options.allowStatus : [];
  if (!response.ok && !allowStatus.includes(response.status)) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

function llmHeaders() {
  return llmBearerToken ? { Authorization: `Bearer ${llmBearerToken}` } : {};
}

function extractReviewItems(data = {}) {
  const value = data.items || data.suggestions || data.review || data.reply || data.text;
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
}

function minimalPdfDataUrl() {
  const pdf = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >> endobj",
    "4 0 obj << /Length 76 >> stream",
    "BT /F1 12 Tf 24 100 Td (QuantGym production boundary smoke PDF) Tj ET",
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000202 00000 n ",
    "trailer << /Root 1 0 R /Size 5 >>",
    "startxref",
    "328",
    "%%EOF"
  ].join("\n");
  return `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function skipReason(name) {
  if (name === "cloud health") return "Set QUANTGYM_CLOUD_API_ENDPOINT or config.js cloudApiEndpoint.";
  if (name === "google provider config") {
    return missing([
      [cloudApiEndpoint, "QUANTGYM_CLOUD_API_ENDPOINT or config.js cloudApiEndpoint"],
      [googleClientId, "QUANTGYM_GOOGLE_CLIENT_ID or config.js googleClientId"]
    ]);
  }
  if (name === "google provider login") {
    return missing([
      [cloudApiEndpoint, "QUANTGYM_CLOUD_API_ENDPOINT or config.js cloudApiEndpoint"],
      [googleIdToken, "QUANTGYM_GOOGLE_ID_TOKEN"]
    ]);
  }
  return missing([
    [llmEndpoint, "QUANTGYM_LLM_ENDPOINT or config.js llmEndpoint"]
  ], "If the LLM proxy requires auth, also set QUANTGYM_LLM_BEARER_TOKEN.");
}

function missing(requirements, suffix = "") {
  const missingNames = requirements
    .filter(([value]) => !value)
    .map(([, label]) => label);
  const message = missingNames.length
    ? `Set ${missingNames.join(" and ")}.`
    : "Required configuration is present, but this check was not enabled.";
  return suffix ? `${message} ${suffix}` : message;
}

function clean(value) {
  return String(value || "").trim();
}

function redactEmail(email) {
  const [name, host] = String(email || "").split("@");
  if (!host) return "";
  return `${name.slice(0, 2)}***@${host}`;
}

function validateGoogleIdToken(token, expectedAudience) {
  const payload = decodeJwtPayload(token);
  assert(payload, "Google ID token is not a valid JWT");
  assert(payload.aud, "Google ID token payload is missing aud");
  if (expectedAudience) {
    assert(
      payload.aud === expectedAudience,
      "Google ID token audience does not match configured Google Client ID"
    );
  }
  if (payload.iss) {
    assert(
      payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com",
      "Google ID token issuer is not accounts.google.com"
    );
  }
  assert(Number(payload.exp || 0) > 0, "Google ID token payload is missing exp");
  const nowSeconds = Math.floor(Date.now() / 1000);
  assert(Number(payload.exp) > nowSeconds + 30, "Google ID token is expired or expires in less than 30 seconds");
  if (payload.iat) {
    assert(Number(payload.iat) < nowSeconds + 300, "Google ID token issue time is unexpectedly in the future");
  }
  return {
    audienceMatchesClientId: expectedAudience ? payload.aud === expectedAudience : null,
    expiresAt: new Date(Number(payload.exp) * 1000).toISOString(),
    email: payload.email || ""
  };
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function loadRuntimeConfig() {
  const configPath = path.join(projectRoot, "config.js");
  if (!fs.existsSync(configPath)) return {};
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(configPath, "utf8"), sandbox, {
    filename: configPath,
    timeout: 1000
  });
  return sandbox.window.QUANTGYM_CONFIG || {};
}
