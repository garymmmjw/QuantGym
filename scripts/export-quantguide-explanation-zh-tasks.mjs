import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const outputDir = path.resolve(projectRoot, options.output || "artifacts/external-translation/quantguide-explanations");
const batchSize = Math.max(1, Number(options.batchSize || 40));

const payload = readJson(sourcePath, { problems: [] });
const problems = (Array.isArray(payload) ? payload : payload.problems || [])
  .filter((problem) => problem?.source === "quantguide" && !String(problem.explanationZh || "").trim());

fs.mkdirSync(outputDir, { recursive: true });

const batches = [];
for (let index = 0; index < problems.length; index += batchSize) {
  const items = problems.slice(index, index + batchSize).map((problem) => ({
    id: problem.id,
    titleEn: problem.titleEn || "",
    titleZh: problem.titleZh || "",
    promptEn: problem.promptEn || "",
    promptZh: problem.promptZh || "",
    answer: problem.answer || "",
    explanationEn: problem.explanationEn || problem.explanation || ""
  }));
  const batchNumber = batches.length + 1;
  const fileName = `quantguide-explanations-${String(batchNumber).padStart(3, "0")}.json`;
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify({ items }, null, 2)}\n`);
  batches.push({ file: fileName, count: items.length });
}

fs.writeFileSync(path.join(outputDir, "PROMPT.md"), promptText());
fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: relativePath(sourcePath),
  missingExplanationZhCount: problems.length,
  batchSize,
  batchCount: batches.length,
  batches
}, null, 2)}\n`);

console.log(JSON.stringify({
  missingExplanationZhCount: problems.length,
  batchSize,
  batchCount: batches.length,
  output: relativePath(outputDir)
}, null, 2));

function promptText() {
  return [
    "# QuantGuide Explanation Translation Prompt",
    "",
    "You are translating QuantGuide quant interview explanations from English to Simplified Chinese.",
    "",
    "Input: a JSON object with an `items` array. Each item contains `id`, English/Chinese title, English/Chinese prompt, answer, and `explanationEn`.",
    "",
    "Output JSON only, with this exact shape:",
    "",
    "{",
    "  \"items\": [",
    "    { \"id\": \"same id\", \"explanationZh\": \"中文解答\" }",
    "  ]",
    "}",
    "",
    "Rules:",
    "",
    "- Translate only `explanationEn` into `explanationZh`; do not rewrite the question.",
    "- Preserve all LaTeX/math/code exactly, including `$...$`, `$$...$$`, `\\frac`, `\\mathbb`, variables, URLs, and numeric answers.",
    "- Keep paragraph breaks where useful, but do not add Markdown fences or commentary.",
    "- Use clear Simplified Chinese suitable for quant interview prep.",
    "- Keep common quant terms consistent: payoff=收益, strike=行权价, underlying=标的, volatility=波动率, expectation=期望, variance=方差, covariance=协方差, Brownian Motion=Brownian 运动 or 布朗运动, martingale=鞅, Markov chain=马尔可夫链.",
    "- If the English explanation contains a typo, translate the intended meaning while preserving formulas.",
    "- Every input item must appear exactly once in output with the same `id`.",
    ""
  ].join("\n");
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      parsed[key] = args[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
