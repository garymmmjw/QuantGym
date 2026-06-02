#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { skillDefs } from "../src/skills.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const bankRoot = path.join(projectRoot, "data", "question-banks");
const manifestPath = path.join(bankRoot, "catalog-manifest.json");
const validCategories = new Set(Object.keys(skillDefs));
const write = process.argv.includes("--write");
const force = process.argv.includes("--force");

const aliases = new Map(Object.entries({
  probability: "probabilityExpectation",
  expectation: "probabilityExpectation",
  statistics: "statistics",
  stat: "statistics",
  option: "option",
  options: "option",
  derivatives: "option",
  market: "market",
  trading: "market",
  mental: "mentalMath",
  "mental math": "mentalMath",
  leetcode: "leetcode",
  algorithms: "leetcode",
  cpp: "cppProgramming",
  "c++": "cppProgramming",
  pandas: "pandasNumpy",
  numpy: "pandasNumpy",
  optimization: "optimization",
  "linear programming": "optimization",
  calculus: "calculus",
  algebra: "algebra",
  "linear algebra": "linearAlgebra",
  complex: "complexNumbers",
  "machine learning": "machineLearning",
  ml: "machineLearning",
  "deep learning": "deepLearning",
  dl: "deepLearning"
}));

const rules = [
  [/leetcode|dynamic programming|\bdp\b|binary search|two pointers?|sliding window|tree|graph|heap|algorithm|数组|链表|动态规划|二分|双指针|滑动窗口|图|树|堆/i, "leetcode"],
  [/\bc\+\+\b|\bcpp\b|virtual|pointer|reference|inheritance|polymorphism|destructor|内存|指针|引用|继承|多态/i, "cppProgramming"],
  [/pandas|numpy|dataframe|groupby|merge|join|pivot|向量化|数据清洗/i, "pandasNumpy"],
  [/black.scholes|option|greeks?|delta|gamma|vega|theta|volatility|implied vol|future|forward|swap|derivative|期权|希腊值|波动率|远期|期货|互换|衍生品/i, "option"],
  [/market making|order book|bid|ask|spread|trading|arbitrage|liquidity|inventory|做市|订单簿|价差|套利|流动性|库存/i, "market"],
  [/hypothesis|p-value|confidence interval|regression|estimator|mle|ols|sampling|statistics|统计|假设检验|置信区间|回归|估计|抽样/i, "statistics"],
  [/linear algebra|matrix|matrices|determinant|eigen|cholesky|positive definite|rank|矩阵|行列式|特征值|特征向量|正定|秩/i, "linearAlgebra"],
  [/optimization|convex|linear program|quadratic program|network flow|dual|simplex|portfolio optimization|优化|凸优化|线性规划|二次规划|对偶/i, "optimization"],
  [/calculus|integral|integration|derivative|limit|differential equation|ode|stochastic calculus|积分|导数|极限|微分方程|随机微积分/i, "calculus"],
  [/complex number|complex analysis|imaginary|euler'?s formula|principal logarithm|复数|虚数|欧拉公式/i, "complexNumbers"],
  [/algebra|inequalit|polynomial|binomial|induction|proof|代数|不等式|多项式|归纳|证明/i, "algebra"],
  [/machine learning|xgboost|random forest|svm|feature|cross.validation|overfit|机器学习|特征|过拟合/i, "machineLearning"],
  [/deep learning|neural|transformer|attention|cnn|rnn|backprop|深度学习|神经网络|注意力|反向传播/i, "deepLearning"],
  [/mental math|quick calculation|estimate|percentage|coin|dice|cards?|expected|expectation|probability|bayes|poisson|markov|martingale|概率|期望|贝叶斯|泊松|马尔可夫|鞅/i, "probabilityExpectation"]
];

const sourceDefaults = {
  "hull-derivatives": "option",
  "stat110-strategic-practice": "probabilityExpectation",
  "probabilitycourse-solved-samples": "probabilityExpectation",
  "stanford-msande214-hw3": "optimization",
  "boyd-cvxbook-additional-exercises": "optimization",
  "etheridge-finmath-problem-sheets": "option",
  "linalg-primer": "linearAlgebra"
};

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

function normalizeCategory(value) {
  const raw = String(value || "").trim();
  if (validCategories.has(raw)) return raw;
  const key = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return aliases.get(key) || "";
}

function problemText(problem, source) {
  return [
    source?.slug,
    source?.name,
    problem.titleEn,
    problem.titleZh,
    problem.promptEn,
    problem.promptZh,
    problem.answer,
    problem.answerEn,
    problem.answerZh,
    problem.explanation,
    problem.explanationEn,
    problem.explanationZh,
    ...(Array.isArray(problem.tags) ? problem.tags : [])
  ].filter(Boolean).join(" ");
}

function inferCategory(problem, source) {
  const existing = normalizeCategory(problem.category);
  if (existing && !force) return existing;
  const text = problemText(problem, source);
  for (const [pattern, category] of rules) {
    if (pattern.test(text)) return category;
  }
  return sourceDefaults[source?.slug] || "probabilityExpectation";
}

function normalizeDifficulty(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "easy") return "Easy";
  if (raw === "hard") return "Hard";
  return "Medium";
}

function ensureTags(problem, source, category) {
  const tags = Array.isArray(problem.tags) ? problem.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [];
  const needed = [source?.name || source?.slug || "", category].filter(Boolean);
  for (const tag of needed) {
    if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  return tags;
}

function classifyProblem(problem, source) {
  const category = inferCategory(problem, source);
  const difficulty = normalizeDifficulty(problem.difficulty);
  const hasTags = Array.isArray(problem.tags) && problem.tags.some((tag) => String(tag || "").trim());
  const next = { ...problem };
  if (force || normalizeCategory(problem.category) !== category) {
    next.category = category;
    next.classificationReviewSource = "available-problem-classifier-v1";
  }
  if (force || normalizeDifficulty(problem.difficulty) !== String(problem.difficulty || "").trim()) {
    next.difficulty = difficulty;
  }
  if (force || !hasTags) {
    next.tags = ensureTags(problem, source, category);
  }
  return next;
}

const manifest = readJson(manifestPath, { sources: [] });
const activeSources = (manifest.sources || []).filter((source) => source && !source.disabled && source.problemFile);
let total = 0;
let changed = 0;
const invalid = [];

for (const source of activeSources) {
  const filePath = path.join(bankRoot, source.problemFile);
  const payload = readJson(filePath, []);
  const problems = Array.isArray(payload) ? payload : Array.isArray(payload.problems) ? payload.problems : [];
  if (!Array.isArray(problems)) continue;
  const next = problems.map((problem) => {
    if (!problem || typeof problem !== "object") return problem;
    total += 1;
    const classified = classifyProblem(problem, source);
    if (!validCategories.has(classified.category) || !classified.tags?.length) invalid.push(problem.id || `${source.slug}:${total}`);
    if (JSON.stringify(classified) !== JSON.stringify(problem)) changed += 1;
    return classified;
  });
  if (write && JSON.stringify(next) !== JSON.stringify(problems)) {
    writeJson(filePath, Array.isArray(payload) ? next : { ...payload, problems: next });
  }
}

if (write) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, "build-problem-catalog.mjs")], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`${write ? "classified" : "checked"} ${total} available problems across ${activeSources.length} sources`);
console.log(`changes ${write ? "written" : "needed"}: ${changed}`);
if (invalid.length) {
  console.error(`invalid classifications: ${invalid.slice(0, 20).join(", ")}${invalid.length > 20 ? " ..." : ""}`);
  process.exit(1);
}
