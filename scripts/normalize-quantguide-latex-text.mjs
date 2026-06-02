import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-audit/quantguide-latex-normalize-report.json");
const apply = Boolean(options.apply);
const rebuild = Boolean(options.rebuild || apply);

const textFields = ["promptEn", "promptZh", "explanation", "explanationZh", "hint"];
const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const changes = [];

for (const problem of problems) {
  if (problem?.source !== "quantguide") continue;
  for (const field of textFields) {
    if (typeof problem[field] !== "string" || !problem[field]) continue;
    const before = problem[field];
    const after = normalizeLatexText(before);
    if (after === before) continue;
    problem[field] = after;
    problem.updatedAt = new Date().toISOString();
    changes.push({
      id: problem.id,
      titleEn: problem.titleEn || "",
      field,
      beforeSample: sample(before),
      afterSample: sample(after)
    });
  }
}

if (apply) {
  writeJson(sourcePath, Array.isArray(payload) ? problems : { ...payload, problems });
  if (rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  dryRun: !apply,
  sourcePath: relativePath(sourcePath),
  changedFieldCount: changes.length,
  changedProblemCount: new Set(changes.map((change) => change.id)).size,
  changes
});

console.log(JSON.stringify({
  dryRun: !apply,
  changedFieldCount: changes.length,
  changedProblemCount: new Set(changes.map((change) => change.id)).size,
  reportPath: relativePath(reportPath)
}, null, 2));

function normalizeLatexText(text) {
  let value = String(text || "");

  value = value
    .replace(/\$\$\\{1,2}\$\$/g, "\n\n")
    .replace(/\$\$\$\$/g, "\n\n");

  value = value.replace(/(^|[\s([（])\$\$((?:\\.|[^$\\\n]){1,180})\$(?=([\s,.;:!?，。！？；：)）\]]|$))/g, (_match, prefix, body, suffix) => {
    return `${prefix}$${body}$${suffix}`;
  });

  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function sample(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 220);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativePath(filePath) {
  const rel = path.relative(projectRoot, filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
