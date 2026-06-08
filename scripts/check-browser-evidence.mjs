#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(root, "docs", "browser-audit-screenshots");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/326-browser-evidence-manifest-summary.json";
const docsToScan = [
  "docs/ui-function-regression-audit-2026-06-07.md",
  "docs/SMOKE_CHECKS.md"
];

const referenced = new Map();
const ignored = [];

for (const doc of docsToScan) {
  const text = read(doc);
  for (const match of text.matchAll(/`([^`]+\.(?:png|jpg|jpeg|webp|json))`/gi)) {
    const rawRef = match[1].trim();
    const classified = classifyRef(rawRef);
    if (classified.ignore) {
      ignored.push({ ref: rawRef, reason: classified.reason, doc });
      continue;
    }
    const current = referenced.get(classified.fileName) || {
      fileName: classified.fileName,
      docs: new Set(),
      refs: new Set()
    };
    current.docs.add(doc);
    current.refs.add(rawRef);
    referenced.set(classified.fileName, current);
  }
}

const missing = [];
const smallFiles = [];
const invalidJson = [];
const evidence = [];

for (const item of [...referenced.values()].sort((a, b) => a.fileName.localeCompare(b.fileName))) {
  const filePath = path.join(evidenceDir, item.fileName);
  const relativePath = path.relative(root, filePath);
  if (!fs.existsSync(filePath)) {
    missing.push({
      fileName: item.fileName,
      docs: [...item.docs].sort(),
      refs: [...item.refs].sort()
    });
    continue;
  }

  const stat = fs.statSync(filePath);
  const extension = path.extname(item.fileName).toLowerCase();
  if (stat.size < 1024 && extension !== ".json") {
    smallFiles.push({ fileName: item.fileName, size: stat.size });
  }
  if (extension === ".json") {
    try {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      invalidJson.push({ fileName: item.fileName, error: error.message });
    }
  }

  evidence.push({
    fileName: item.fileName,
    path: relativePath,
    kind: extension.slice(1),
    size: stat.size,
    docs: [...item.docs].sort()
  });
}

const summary = {
  status: missing.length || smallFiles.length || invalidJson.length ? "fail" : "pass",
  docsScanned: docsToScan.length,
  totalBacktickFileRefs: referenced.size + ignored.length,
  evidenceRefs: referenced.size,
  imageRefs: evidence.filter((item) => ["png", "jpg", "jpeg", "webp"].includes(item.kind)).length,
  jsonRefs: evidence.filter((item) => item.kind === "json").length,
  ignoredRefs: ignored.length,
  missing: missing.length,
  smallFiles: smallFiles.length,
  invalidJson: invalidJson.length,
  checkedDir: "docs/browser-audit-screenshots",
  ignoredReasonCounts: countBy(ignored, "reason"),
  failures: {
    missing,
    smallFiles,
    invalidJson
  }
};

if (summaryPath) {
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== "pass") process.exitCode = 1;

function classifyRef(rawRef) {
  if (/[<>]/.test(rawRef)) return { ignore: true, reason: "template-placeholder" };
  const normalized = rawRef.replaceAll("\\", "/");
  const fileName = path.basename(normalized);

  if (normalized.startsWith("docs/browser-audit-screenshots/")) {
    return { fileName };
  }
  if (/^\d{2,4}-/.test(fileName)) {
    return { fileName };
  }

  return { ignore: true, reason: "non-browser-evidence-file" };
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${relativePath} is missing`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}
