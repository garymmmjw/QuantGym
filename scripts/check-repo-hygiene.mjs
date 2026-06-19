#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const maxTrackedFileBytes = Math.max(1, Number(args.maxTrackedFileMb || 20)) * 1024 * 1024;
const contentScanMaxBytes = Math.max(1, Number(args.contentScanMaxMb || 2)) * 1024 * 1024;

const blockedTrackedRules = [
  {
    name: "env-file",
    pattern: /^\.env(?:$|\.)/,
    allow: (file) => file === ".env.example",
    message: "Environment files must not be tracked; keep real values in deployment secrets."
  },
  {
    name: "sqlite-db",
    pattern: /^api-server\/data\/.*\.sqlite3(?:-.+)?$/,
    message: "SQLite runtime databases must not be tracked."
  },
  {
    name: "dist-build",
    pattern: /^dist\//,
    message: "Build output must not be tracked."
  },
  {
    name: "artifacts-output",
    pattern: /^artifacts\//,
    allow: (file) => file === "artifacts/README.md",
    message: "QA/build artifacts must stay ignored except artifacts/README.md."
  },
  {
    name: "node-modules",
    pattern: /^node_modules\//,
    message: "node_modules must not be tracked."
  },
  {
    name: "python-cache",
    pattern: /(^|\/)__pycache__\/|\.pyc$/,
    message: "Python cache files must not be tracked."
  },
  {
    name: "logs",
    pattern: /\.log$/,
    message: "Log files must not be tracked."
  },
  {
    name: "private-raw-export",
    pattern: /^data\/question-banks\/quantguide\/raw-export\//,
    message: "Private/raw QuantGuide exports must stay outside Git."
  },
  {
    name: "generated-source-problems-js",
    pattern: /^data\/question-banks\/[^/]+\/problems\.js$/,
    message: "Generated source problems.js files are ignored; keep normalized JSON catalogs only."
  },
  {
    name: "private-book-archives",
    pattern: /^(QuantGuide\/|量化书籍\/|api-server\/library-pdfs\/)/,
    message: "Local book archives and private library PDFs must not be tracked."
  },
  {
    name: "agent-local-state",
    pattern: /^(\.agents\/|skills-lock\.json$)/,
    message: "Local Codex/agent state must not be tracked."
  },
  {
    name: "macos-metadata",
    pattern: /(^|\/)\.DS_Store$/,
    message: "macOS metadata files must not be tracked."
  }
];

const requiredGitignorePatterns = [
  "api-server/data/*.sqlite3",
  "api-server/data/*.sqlite3-*",
  ".env",
  ".env.*",
  "!.env.example",
  "node_modules/",
  "dist/",
  "artifacts/*",
  "!artifacts/README.md",
  "data/question-banks/quantguide/raw-export/",
  "data/question-banks/*/problems.js",
  "QuantGuide/",
  "量化书籍/"
];

const secretPatterns = [
  { name: "openai-key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "google-id-token-env", pattern: /(?:QUANTGYM_GOOGLE_ID_TOKEN|GOOGLE_ID_TOKEN)\s*=\s*eyJ[A-Za-z0-9_-]+\./ }
];

const trackedFiles = git(["ls-files", "-z"]).split("\0").filter(Boolean).sort();
const failures = [];
const warnings = [];
const largestTrackedFiles = [];

for (const file of trackedFiles) {
  const normalized = normalizePath(file);
  const absolute = path.join(projectRoot, normalized);
  const stat = safeStat(absolute);
  if (!stat?.isFile()) continue;

  for (const rule of blockedTrackedRules) {
    if (rule.pattern.test(normalized) && !(rule.allow && rule.allow(normalized))) {
      failures.push({
        type: "blocked-tracked-path",
        rule: rule.name,
        file: normalized,
        message: rule.message
      });
    }
  }

  if (stat.size > maxTrackedFileBytes && !isAllowedLargeRuntimeAsset(normalized)) {
    failures.push({
      type: "large-tracked-file",
      file: normalized,
      sizeBytes: stat.size,
      maxBytes: maxTrackedFileBytes,
      message: "Tracked file exceeds the release hygiene size threshold."
    });
  }

  largestTrackedFiles.push({ file: normalized, sizeBytes: stat.size });

  const contentFinding = scanContentForSecrets(absolute, normalized, stat.size);
  if (contentFinding) failures.push(contentFinding);
}

const gitignoreFindings = checkGitignore();
failures.push(...gitignoreFindings.failures);
warnings.push(...gitignoreFindings.warnings);

largestTrackedFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

const result = {
  status: failures.length ? "fail" : "pass",
  trackedFiles: trackedFiles.length,
  maxTrackedFileMb: Number(args.maxTrackedFileMb || 20),
  contentScanMaxMb: Number(args.contentScanMaxMb || 2),
  largestTrackedFiles: largestTrackedFiles.slice(0, 15),
  failures,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (value === "--max-tracked-file-mb") {
      parsed.maxTrackedFileMb = argv[index + 1];
      index += 1;
    } else if (value === "--content-scan-max-mb") {
      parsed.contentScanMaxMb = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function git(argsList) {
  try {
    return execFileSync("git", ["-C", projectRoot, ...argsList], {
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024
    });
  } catch (error) {
    const detail = error.stderr || error.message || String(error);
    console.error(`Git command failed: git -C ${projectRoot} ${argsList.join(" ")}\n${detail}`);
    process.exit(1);
  }
}

function normalizePath(file) {
  return file.split(path.sep).join("/");
}

function safeStat(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

function isAllowedLargeRuntimeAsset(file) {
  return /^data\/problem-catalog\.(json|js)$/.test(file);
}

function scanContentForSecrets(absolute, file, size) {
  if (size > contentScanMaxBytes) return null;
  if (isLikelyBinary(absolute)) return null;
  const text = fs.readFileSync(absolute, "utf8");
  for (const item of secretPatterns) {
    if (item.pattern.test(text)) {
      return {
        type: "secret-like-content",
        rule: item.name,
        file,
        message: "Tracked file contains a value shaped like a secret."
      };
    }
  }
  return null;
}

function isLikelyBinary(absolute) {
  const sample = fs.readFileSync(absolute).subarray(0, 4096);
  if (sample.includes(0)) return true;
  const textChars = sample.filter((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)).length;
  return sample.length > 0 && textChars / sample.length < 0.7;
}

function checkGitignore() {
  const output = { failures: [], warnings: [] };
  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    output.failures.push({
      type: "missing-gitignore",
      file: ".gitignore",
      message: ".gitignore is required for release hygiene."
    });
    return output;
  }
  const lines = fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const missing = requiredGitignorePatterns.filter((pattern) => !lines.includes(pattern));
  if (missing.length) {
    output.failures.push({
      type: "gitignore-missing-patterns",
      file: ".gitignore",
      patterns: missing,
      message: ".gitignore is missing required release hygiene patterns."
    });
  }
  return output;
}
