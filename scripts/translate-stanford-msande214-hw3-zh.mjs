import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(projectRoot, "data", "question-banks", "stanford-msande214-hw3", "problems.json");
const options = parseArgs(process.argv.slice(2));

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source file: ${path.relative(projectRoot, sourcePath)}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const missing = [];

for (const problem of problems) {
  for (const field of ["titleZh", "promptZh", "answerZh", "explanationZh"]) {
    if (!String(problem[field] || "").trim()) {
      missing.push({ id: problem.id, field });
    }
  }
}

const report = {
  source: "stanford-msande214-hw3",
  problemCount: problems.length,
  titleZh: problems.filter((problem) => String(problem.titleZh || "").trim()).length,
  promptZh: problems.filter((problem) => String(problem.promptZh || "").trim()).length,
  answerZh: problems.filter((problem) => String(problem.answerZh || "").trim()).length,
  explanationZh: problems.filter((problem) => String(problem.explanationZh || "").trim()).length,
  missing
};

if (missing.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (options.rebuild) {
  const result = spawnSync("node", ["scripts/build-problem-catalog.mjs"], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(JSON.stringify(report, null, 2));

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
