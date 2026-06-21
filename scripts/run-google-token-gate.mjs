#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const mode = args.includes("--verify-deployed")
  ? "verify-deployed"
  : args.includes("--release-readiness")
  ? "release-readiness"
  : args.includes("--release-readiness-local")
    ? "release-readiness-local"
    : "verify";

const commandByMode = {
  verify: ["npm", ["run", "verify:production-boundaries"]],
  "verify-deployed": [
    "node",
    [
      "scripts/verify-production-boundaries.mjs",
      "--deployed",
      "--require-llm-pass",
      "--summary",
      "docs/browser-audit-screenshots/333-production-boundaries-deployed-services-summary.json"
    ]
  ],
  "release-readiness-local": ["npm", ["run", "check:release-readiness:local"]],
  "release-readiness": ["npm", ["run", "check:release-readiness"]]
};

const [command, commandArgs] = commandByMode[mode];
const token = clean(process.env.QUANTGYM_GOOGLE_ID_TOKEN || await readToken());
const minimumSecondsRemaining = parsePositiveInteger(process.env.QUANTGYM_GOOGLE_TOKEN_MIN_SECONDS) || 120;

if (!token) {
  console.error("Google ID token is required.");
  process.exit(1);
}

const sanity = decodeJwtPayload(token);
if (!sanity) {
  console.error("Google ID token is not a valid JWT.");
  process.exit(1);
}

const freshness = tokenFreshness(sanity, minimumSecondsRemaining);
if (!freshness.ok) {
  console.error(JSON.stringify({
    status: "fail",
    mode,
    reason: freshness.reason,
    tokenProvided: true,
    tokenWrittenToDisk: false,
    tokenPrinted: false,
    tokenExpiresAt: freshness.expiresAt,
    secondsRemaining: freshness.secondsRemaining,
    minimumSecondsRemaining,
    tokenEmailPresent: Boolean(sanity.email)
  }, null, 2));
  process.exit(1);
}

if (dryRun) {
  const childEnv = buildChildEnv(token);
  console.log(JSON.stringify({
    status: "ready",
    mode,
    command: [command, ...commandArgs].join(" "),
    tokenProvided: true,
    tokenWrittenToDisk: false,
    tokenPrinted: false,
    tokenExpiresAt: freshness.expiresAt,
    secondsRemaining: freshness.secondsRemaining,
    minimumSecondsRemaining,
    tokenEmailPresent: Boolean(sanity.email),
    childProxyConfigured: Boolean(childEnv.HTTPS_PROXY || childEnv.https_proxy || childEnv.HTTP_PROXY || childEnv.http_proxy),
    childNoProxy: childEnv.NO_PROXY || childEnv.no_proxy || ""
  }, null, 2));
  process.exit(0);
}

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  env: buildChildEnv(token)
});

process.exit(typeof result.status === "number" ? result.status : 1);

async function readToken() {
  if (!process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        input += chunk;
      });
      process.stdin.on("end", () => resolve(input.trim()));
      process.stdin.on("error", reject);
    });
  }

  process.stdout.write("Paste QUANTGYM_GOOGLE_ID_TOKEN (hidden, press Enter): ");
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\r" || char === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value.trim());
        return;
      }
      if (char === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        process.exit(130);
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on("data", onData);
  });
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

function clean(value) {
  return String(value || "").trim();
}

function tokenFreshness(payload, minSecondsRemaining) {
  const exp = Number(payload?.exp || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(exp) || exp <= 0) {
    return {
      ok: false,
      reason: "Google ID token payload is missing exp.",
      expiresAt: null,
      secondsRemaining: null
    };
  }
  const secondsRemaining = exp - now;
  if (secondsRemaining < minSecondsRemaining) {
    return {
      ok: false,
      reason: "Google ID token expires too soon for a safe verification run; generate a fresh token and rerun immediately.",
      expiresAt: new Date(exp * 1000).toISOString(),
      secondsRemaining
    };
  }
  const nbf = Number(payload?.nbf || 0);
  if (Number.isFinite(nbf) && nbf > now + 30) {
    return {
      ok: false,
      reason: "Google ID token is not valid yet.",
      expiresAt: new Date(exp * 1000).toISOString(),
      secondsRemaining
    };
  }
  return {
    ok: true,
    reason: "",
    expiresAt: new Date(exp * 1000).toISOString(),
    secondsRemaining
  };
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function buildChildEnv(token) {
  const env = {
    ...process.env,
    QUANTGYM_GOOGLE_ID_TOKEN: token
  };
  applyMacSystemProxyDefaults(env);
  appendNoProxyDefaults(env);
  return env;
}

function applyMacSystemProxyDefaults(env) {
  if (process.platform !== "darwin") return;
  if (hasProxyEnv(env)) return;
  const proxy = readMacSystemProxy();
  if (proxy.https) {
    env.HTTPS_PROXY = proxy.https;
    env.https_proxy = proxy.https;
  }
  if (proxy.http) {
    env.HTTP_PROXY = proxy.http;
    env.http_proxy = proxy.http;
  }
}

function hasProxyEnv(env) {
  return [
    env.HTTPS_PROXY,
    env.https_proxy,
    env.HTTP_PROXY,
    env.http_proxy,
    env.ALL_PROXY,
    env.all_proxy
  ].some(isHttpProxyUrl);
}

function readMacSystemProxy() {
  const result = spawnSync("scutil", ["--proxy"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  if (result.status !== 0) return {};
  const values = parseScutilProxy(result.stdout || "");
  return {
    https: proxyUrl(values.HTTPSEnable, values.HTTPSProxy, values.HTTPSPort),
    http: proxyUrl(values.HTTPEnable, values.HTTPProxy, values.HTTPPort)
  };
}

function parseScutilProxy(output) {
  const values = {};
  for (const line of String(output || "").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*(.+?)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function proxyUrl(enabled, host, port) {
  if (String(enabled || "").trim() !== "1") return "";
  const cleanHost = clean(host);
  const cleanPort = clean(port);
  if (!cleanHost || !cleanPort || !/^\d+$/.test(cleanPort)) return "";
  return `http://${cleanHost}:${cleanPort}`;
}

function isHttpProxyUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function appendNoProxyDefaults(env) {
  const defaults = ["127.0.0.1", "localhost", "::1"];
  const existing = String(env.NO_PROXY || env.no_proxy || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  for (const item of defaults) {
    if (!seen.has(item.toLowerCase())) existing.push(item);
  }
  const value = existing.join(",");
  env.NO_PROXY = value;
  env.no_proxy = value;
}
