#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const productionMode = args.has("--production");
const smokeMode = args.has("--smoke");
const loadDotEnv = !args.has("--no-dotenv");
const MIN_PRODUCTION_WEBHOOK_TOKEN_LENGTH = 24;

if (loadDotEnv) loadEnvFromProjectRoot();

const env = process.env;
const config = {
  alertWebhookUrl: clean(env.QUANTGYM_ALERT_WEBHOOK_URL),
  alertWebhookToken: clean(env.QUANTGYM_ALERT_WEBHOOK_TOKEN),
  alertMinStatusCode: parseInteger(env.QUANTGYM_ALERT_MIN_STATUS_CODE, 500),
  alertTimeoutSeconds: parseNumber(env.QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS, 3),
  rateLimitDisabled: envBool("QUANTGYM_RATE_LIMIT_DISABLED", false),
  rateLimitWindowSeconds: parseInteger(env.QUANTGYM_RATE_LIMIT_WINDOW_SECONDS, 60),
  authRateLimitMax: parseInteger(env.QUANTGYM_AUTH_RATE_LIMIT_MAX, 30),
  verificationRateLimitMax: parseInteger(env.QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX, 5),
  registerRateLimitMax: parseInteger(env.QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX, null),
  loginRateLimitMax: parseInteger(env.QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX, null),
  googleRateLimitMax: parseInteger(env.QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX, null),
  passwordResetRateLimitMax: parseInteger(env.QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX, null),
  trustProxyHeaders: envBool("QUANTGYM_TRUST_PROXY_HEADERS", false),
  trustedProxyCidrs: clean(env.QUANTGYM_TRUSTED_PROXY_CIDRS),
  edgeRateLimitConfirmed: envBool("QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED", false),
  edgeRateLimitProvider: clean(env.QUANTGYM_EDGE_RATE_LIMIT_PROVIDER).toLowerCase(),
  edgeRateLimitEvidenceUrl: clean(env.QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL),
  edgeRateLimitNotes: clean(env.QUANTGYM_EDGE_RATE_LIMIT_NOTES)
};

const results = [];

check("alert webhook shape", () => {
  if (!config.alertWebhookUrl) {
    assert(!productionMode, "QUANTGYM_ALERT_WEBHOOK_URL is required.");
    return { configured: false };
  }
  assertNoPlaceholder("QUANTGYM_ALERT_WEBHOOK_URL", config.alertWebhookUrl);
  const url = parseHttpUrl(config.alertWebhookUrl, "QUANTGYM_ALERT_WEBHOOK_URL");
  if (productionMode) {
    assert(url.protocol === "https:", "Production alert webhook URL must use HTTPS.");
    assert(!isLocalOrPrivateHost(url.hostname), "Production alert webhook URL must not point to localhost, loopback, or a private network address.");
    assert(config.alertWebhookToken, "Production alert webhook should set QUANTGYM_ALERT_WEBHOOK_TOKEN.");
    assertNoPlaceholder("QUANTGYM_ALERT_WEBHOOK_TOKEN", config.alertWebhookToken);
    assertStrongProductionToken("QUANTGYM_ALERT_WEBHOOK_TOKEN", config.alertWebhookToken);
  }
  assert(config.alertTimeoutSeconds > 0 && config.alertTimeoutSeconds <= 15, "QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS must be between 0 and 15 seconds.");
  assert(
    Number.isInteger(config.alertMinStatusCode) && config.alertMinStatusCode >= 400 && config.alertMinStatusCode <= 599,
    "QUANTGYM_ALERT_MIN_STATUS_CODE must be an HTTP error code from 400 to 599."
  );
  return {
    configured: true,
    host: url.hostname,
    protocol: url.protocol.replace(":", ""),
    tokenSet: Boolean(config.alertWebhookToken),
    minStatusCode: config.alertMinStatusCode,
    timeoutSeconds: config.alertTimeoutSeconds
  };
});

check("auth rate limits", () => {
  assert(!config.rateLimitDisabled || !productionMode, "Production must not set QUANTGYM_RATE_LIMIT_DISABLED=1.");
  assertPositiveInteger("QUANTGYM_RATE_LIMIT_WINDOW_SECONDS", config.rateLimitWindowSeconds);
  assertPositiveInteger("QUANTGYM_AUTH_RATE_LIMIT_MAX", config.authRateLimitMax);
  assertPositiveInteger("QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX", config.verificationRateLimitMax);

  const registerLimit = config.registerRateLimitMax ?? config.authRateLimitMax;
  const loginLimit = config.loginRateLimitMax ?? config.authRateLimitMax;
  const googleLimit = config.googleRateLimitMax ?? config.authRateLimitMax;
  const passwordResetLimit = config.passwordResetRateLimitMax ?? config.verificationRateLimitMax;

  assertPositiveInteger("QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX", registerLimit);
  assertPositiveInteger("QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX", loginLimit);
  assertPositiveInteger("QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX", googleLimit);
  assertPositiveInteger("QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX", passwordResetLimit);

  if (productionMode) {
    assert(config.rateLimitWindowSeconds >= 30 && config.rateLimitWindowSeconds <= 900, "Production auth rate-limit window should be between 30 and 900 seconds.");
    assert(config.authRateLimitMax <= 120, "Production QUANTGYM_AUTH_RATE_LIMIT_MAX should be no more than 120 per window.");
    assert(config.verificationRateLimitMax <= 20, "Production QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX should be no more than 20 per window.");
    assert(passwordResetLimit <= 20, "Production password reset rate limit should be no more than 20 per window.");
  }

  return {
    disabled: config.rateLimitDisabled,
    windowSeconds: config.rateLimitWindowSeconds,
    authRateLimitMax: config.authRateLimitMax,
    verificationRateLimitMax: config.verificationRateLimitMax,
    registerRateLimitMax: registerLimit,
    loginRateLimitMax: loginLimit,
    googleRateLimitMax: googleLimit,
    passwordResetRateLimitMax: passwordResetLimit
  };
});

check("proxy header trust", () => {
  if (!config.trustProxyHeaders) {
    return { enabled: false, cidrCount: 0 };
  }
  assert(
    config.trustedProxyCidrs,
    "QUANTGYM_TRUSTED_PROXY_CIDRS is required when QUANTGYM_TRUST_PROXY_HEADERS=1."
  );
  const cidrs = parseTrustedProxyCidrs(config.trustedProxyCidrs);
  return {
    enabled: true,
    cidrCount: cidrs.length,
    families: [...new Set(cidrs.map((item) => item.family))].sort()
  };
});

check("edge rate-limit signoff", () => {
  if (!productionMode) {
    return { required: false };
  }
  const allowedProviders = new Set(["cloudflare", "render", "reverse-proxy", "load-balancer", "other"]);
  assert(
    config.edgeRateLimitConfirmed,
    "Set QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1 only after Cloudflare/Render/reverse-proxy edge rate limits are configured."
  );
  assert(config.edgeRateLimitProvider, "QUANTGYM_EDGE_RATE_LIMIT_PROVIDER is required for production edge rate-limit signoff.");
  assert(
    allowedProviders.has(config.edgeRateLimitProvider),
    `QUANTGYM_EDGE_RATE_LIMIT_PROVIDER must be one of: ${[...allowedProviders].join(", ")}.`
  );
  assert(config.edgeRateLimitNotes.length >= 20, "QUANTGYM_EDGE_RATE_LIMIT_NOTES must briefly describe the configured edge rule.");
  assertNoPlaceholder("QUANTGYM_EDGE_RATE_LIMIT_NOTES", config.edgeRateLimitNotes);
  assert(config.edgeRateLimitEvidenceUrl, "QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL is required for production edge rate-limit signoff.");
  assertNoPlaceholder("QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL", config.edgeRateLimitEvidenceUrl);
  const evidenceUrl = parseHttpUrl(config.edgeRateLimitEvidenceUrl, "QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL");
  assert(evidenceUrl.protocol === "https:", "Production edge rate-limit evidence URL must use HTTPS.");
  assert(!isLocalOrPrivateHost(evidenceUrl.hostname), "Production edge rate-limit evidence URL must not point to localhost, loopback, or a private network address.");
  return {
    required: true,
    confirmed: true,
    provider: config.edgeRateLimitProvider,
    notesSet: true,
    notesLength: config.edgeRateLimitNotes.length,
    evidenceHost: evidenceUrl.hostname
  };
});

if (smokeMode) {
  await checkAsync("alert webhook smoke", async () => {
    assert(config.alertWebhookUrl, "QUANTGYM_ALERT_WEBHOOK_URL is required for --smoke.");
    const url = parseHttpUrl(config.alertWebhookUrl, "QUANTGYM_ALERT_WEBHOOK_URL");
    const payload = {
      service: "quantgym-api",
      eventType: "ops.readiness.smoke",
      status: "test",
      statusCode: Math.max(400, Math.min(599, config.alertMinStatusCode || 500)),
      method: "POST",
      path: "/ops/readiness-smoke",
      message: "QuantGym alert webhook readiness smoke.",
      occurredAt: new Date().toISOString()
    };
    const response = await postJson(url, payload, {
      token: config.alertWebhookToken,
      timeoutMs: Math.ceil(config.alertTimeoutSeconds * 1000)
    });
    assert(response.statusCode >= 200 && response.statusCode < 300, `Alert webhook smoke returned HTTP ${response.statusCode}.`);
    return {
      delivered: true,
      statusCode: response.statusCode,
      host: url.hostname,
      tokenSet: Boolean(config.alertWebhookToken)
    };
  });
}

const failed = results.filter((item) => item.status === "fail");
const passed = results.filter((item) => item.status === "pass");

console.log(JSON.stringify({
  status: failed.length ? "fail" : "pass",
  mode: productionMode ? "production" : "local",
  smoke: smokeMode,
  passed: passed.length,
  failed: failed.length,
  results
}, null, 2));

if (failed.length) process.exitCode = 1;

function check(name, fn) {
  try {
    const data = fn();
    results.push({ name, status: "pass", data });
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
  }
}

async function checkAsync(name, fn) {
  try {
    const data = await fn();
    results.push({ name, status: "pass", data });
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPositiveInteger(name, value) {
  assert(Number.isInteger(value) && value > 0, `${name} must be a positive integer.`);
}

function assertNoPlaceholder(name, value) {
  const text = String(value || "");
  assert(!/[<>]/.test(text), `${name} still contains placeholder brackets.`);
  assert(!/\.\.\./.test(text), `${name} still contains a placeholder ellipsis.`);
  assert(
    !/example\.com|webhook-url|shared-secret|placeholder|change-?me|todo|tbd|your-|bearer-token|secret-token/i.test(text),
    `${name} still contains a placeholder value.`
  );
}

function assertStrongProductionToken(name, value) {
  const text = String(value || "");
  assert(
    text.length >= MIN_PRODUCTION_WEBHOOK_TOKEN_LENGTH,
    `${name} must be at least ${MIN_PRODUCTION_WEBHOOK_TOKEN_LENGTH} characters in production.`
  );
}

function parseHttpUrl(value, name) {
  try {
    const url = new URL(value);
    assert(["http:", "https:"].includes(url.protocol), `${name} must be an HTTP(S) URL.`);
    return url;
  } catch (error) {
    if (error.message.includes(name)) throw error;
    throw new Error(`${name} must be a valid URL.`);
  }
}

function parseTrustedProxyCidrs(value) {
  const cidrs = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseTrustedProxyCidr(item));
  assert(cidrs.length > 0, "QUANTGYM_TRUSTED_PROXY_CIDRS must include at least one CIDR or IP address.");
  return cidrs;
}

function parseTrustedProxyCidr(value) {
  const [address, prefixRaw] = String(value || "").split("/");
  const family = net.isIP(address);
  assert(family === 4 || family === 6, `Invalid QUANTGYM_TRUSTED_PROXY_CIDRS entry: ${value}.`);
  const maxPrefix = family === 4 ? 32 : 128;
  const prefix = prefixRaw == null || prefixRaw === "" ? maxPrefix : Number(prefixRaw);
  assert(Number.isInteger(prefix) && prefix >= 0 && prefix <= maxPrefix, `Invalid QUANTGYM_TRUSTED_PROXY_CIDRS prefix: ${value}.`);
  assert(prefix > 0, "QUANTGYM_TRUSTED_PROXY_CIDRS must not trust every source address.");
  return { value, family, prefix };
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const family = net.isIP(host);
  if (family === 4) return isPrivateIpv4(host);
  if (family === 6) return isPrivateIpv6(host);
  return false;
}

function isPrivateIpv4(host) {
  const parts = host.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host) {
  const normalized = host.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  return (
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
  );
}

function parseInteger(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseNumber(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  return Number(String(value).trim());
}

function envBool(name, fallback) {
  const value = env[name];
  if (value == null || String(value).trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function clean(value) {
  return String(value || "").trim();
}

function postJson(url, payload, { token = "", timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url, {
      method: "POST",
      timeout: timeoutMs,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "QuantGymOpsReadiness/0.1",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, (response) => {
      response.resume();
      response.on("end", () => resolve({ statusCode: response.statusCode || 0 }));
    });
    request.on("timeout", () => {
      request.destroy(new Error("Alert webhook smoke timed out."));
    });
    request.on("error", reject);
    request.end(body);
  });
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
