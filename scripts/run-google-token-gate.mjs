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

if (!token) {
  console.error("Google ID token is required.");
  process.exit(1);
}

const sanity = decodeJwtPayload(token);
if (!sanity) {
  console.error("Google ID token is not a valid JWT.");
  process.exit(1);
}

if (dryRun) {
  console.log(JSON.stringify({
    status: "ready",
    mode,
    command: [command, ...commandArgs].join(" "),
    tokenProvided: true,
    tokenWrittenToDisk: false,
    tokenPrinted: false,
    tokenExpiresAt: sanity.exp ? new Date(Number(sanity.exp) * 1000).toISOString() : null,
    tokenEmailPresent: Boolean(sanity.email)
  }, null, 2));
  process.exit(0);
}

const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    QUANTGYM_GOOGLE_ID_TOKEN: token
  }
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
