import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const catalogPath = path.resolve(projectRoot, options.catalog || "data/problem-catalog.json");
const outputDir = path.resolve(projectRoot, options.output || "artifacts/question-bank-latex-audit");
const payload = readJson(catalogPath, { problems: [] });
const problems = (Array.isArray(payload) ? payload : payload.problems || [])
  .filter((problem) => problem && problem.visibility !== "disabled");

const textFields = [
  "promptEn",
  "promptZh",
  "answer",
  "answerEn",
  "answerZh",
  "explanation",
  "explanationEn",
  "explanationZh",
  "hint"
];

const rows = [];
for (const problem of problems) {
  for (const field of textFields) {
    const text = String(problem[field] || "");
    if (!text.trim()) continue;
    const issues = auditText(text);
    for (const issue of issues) {
      rows.push({
        source: problem.source || "",
        id: problem.id || "",
        field,
        code: issue.code,
        line: issue.line,
        snippet: issue.snippet
      });
    }
  }
}

const summary = {
  checkedProblems: problems.length,
  issueRows: rows.length,
  byCode: countBy(rows, "code"),
  examples: rows.slice(0, 40)
};

fs.mkdirSync(outputDir, { recursive: true });
writeJson(path.join(outputDir, "summary.json"), summary);
writeCsv(path.join(outputDir, "issues.csv"), rows);
console.log(JSON.stringify({
  checkedProblems: summary.checkedProblems,
  issueRows: summary.issueRows,
  byCode: summary.byCode,
  output: relativePath(outputDir)
}, null, 2));

function auditText(text) {
  const issues = [];
  const displayDollarCount = countMatches(text, /(?<!\\)\$\$/g);
  if (displayDollarCount % 2 === 1) {
    issues.push({ code: "odd-display-dollar-delimiter", line: 0, snippet: snippet(text) });
  }
  if (countMatches(text, /\\\[/g) !== countMatches(text, /\\\]/g)) {
    issues.push({ code: "unbalanced-bracket-display-delimiter", line: 0, snippet: snippet(text) });
  }
  if (countMatches(text, /\\\(/g) !== countMatches(text, /\\\)/g)) {
    issues.push({ code: "unbalanced-paren-inline-delimiter", line: 0, snippet: snippet(text) });
  }
  if (displayDollarCount % 2 === 1 && /\${2,}\s*\d/.test(text)) {
    issues.push({ code: "double-dollar-before-number", line: 0, snippet: snippet(text.match(/\${2,}\s*\d.{0,80}/)?.[0] || text) });
  }

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/\\(?:sum|prod|int)_\{[^{}]+\}\s+\^\{?[^{}\s]+/.test(trimmed)) {
      issues.push({ code: "spaced-tex-limit", line: index + 1, snippet: snippet(trimmed) });
    }
    if (isRawStandaloneLatex(trimmed)) {
      issues.push({ code: "raw-standalone-latex-line", line: index + 1, snippet: snippet(trimmed) });
    }
  });
  return issues;
}

function isRawStandaloneLatex(line) {
  if (/^\s*(?:\\\[|\\\(|\$\$|\$)/.test(line)) return false;
  if (/(?:\\\]|\\\)|\$\$|\$)\s*$/.test(line)) return false;
  if (!/\\(?:sum|prod|int|frac|sqrt|lim|begin|end|left|right|cdot|times|leq|geq|neq|approx|Rightarrow|rightarrow|to|infty|mathbb|mathrm|operatorname)/.test(line)) return false;
  const cjkCount = (line.match(/[\u3400-\u9fff]/g) || []).length;
  if (cjkCount > 4) return false;
  const proseWords = line
    .replace(/\\[A-Za-z]+/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .match(/[A-Za-z]{3,}/g) || [];
  if (proseWords.length > 4) return false;
  if (line.length > 180 && proseWords.length > 1) return false;
  return /[=<>≤≥≈]|\\(?:sum|prod|int|frac|sqrt|lim|begin|end)/.test(line);
}

function countMatches(text, pattern) {
  return Array.from(String(text || "").matchAll(pattern)).length;
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] || "";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function snippet(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "source,id,field,code,line,snippet\n");
    return;
  }
  const columns = Object.keys(rows[0]);
  const body = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\n");
  fs.writeFileSync(filePath, `${body}\n`);
}

function csvCell(value) {
  const raw = String(value ?? "");
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
