// Display-label helpers for the Playful Precision problems page replica.
// Pure presentation mapping — all underlying data still comes from the real
// catalog (window.quantProblemCatalog, loaded by src/main.jsx before mount)
// and the real user store.

const CATEGORY_LABELS_ZH = {
  mentalMath: "速算",
  probabilityExpectation: "概率期望",
  calculus: "微积分",
  statistics: "统计",
  complexNumbers: "复数",
  linearAlgebra: "线代",
  algebra: "代数",
  optimization: "优化",
  machineLearning: "机器学习",
  deepLearning: "深度学习",
  market: "市场",
  option: "期权",
  leetcode: "编程",
  coding: "编程",
  cppProgramming: "C++ 编程",
  pandasNumpy: "Pandas/NumPy",
  // English display names (formatCategoryLabel output) → zh
  "Mental Math": "速算",
  "Probability/Expectation": "概率期望",
  Calculus: "微积分",
  Statistics: "统计",
  "Complex Numbers": "复数",
  "Linear Algebra": "线代",
  Algebra: "代数",
  Optimization: "优化",
  "Machine Learning": "机器学习",
  "Deep Learning": "深度学习",
  Market: "市场",
  Option: "期权",
  LeetCode: "编程",
  "C++ Programming": "C++ 编程"
};

const DIFFICULTY_LABELS_ZH = {
  Easy: "简单",
  Medium: "中等",
  Hard: "困难",
  easy: "简单",
  medium: "中等",
  hard: "困难",
  all: "全部",
  All: "全部"
};

const SOURCE_SHORT_LABELS = {
  "green-book": "绿皮书",
  "yellow-book": "黄皮书",
  "red-book": "红宝书",
  "hull-derivatives": "Hull",
  quantguide: "QuantGuide",
  "stat110-strategic-practice": "Stat 110"
};

// Design source row order (all slugs exist in the real catalog).
const SOURCE_CHIP_ORDER = [
  "green-book",
  "quantguide",
  "yellow-book",
  "red-book",
  "hull-derivatives"
];

export function localizeCategoryLabel(value, isEnglish) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isEnglish) return raw;
  return CATEGORY_LABELS_ZH[raw] || raw;
}

export function localizeDifficultyLabel(value, isEnglish) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isEnglish) return raw;
  return DIFFICULTY_LABELS_ZH[raw] || raw;
}

export function getSourceShortLabel(slug) {
  return SOURCE_SHORT_LABELS[String(slug || "").trim()] || "";
}

function readRuntimeCatalog() {
  const value = globalThis.quantProblemCatalog ?? globalThis.window?.quantProblemCatalog;
  return Array.isArray(value) ? value : [];
}

let catalogMapCache = null;
let catalogMapSize = -1;

export function getCatalogProblemInfo(problemId) {
  const catalog = readRuntimeCatalog();
  if (!catalogMapCache || catalogMapSize !== catalog.length) {
    catalogMapCache = new Map();
    catalog.forEach((problem) => {
      if (problem && problem.id) catalogMapCache.set(problem.id, problem);
    });
    catalogMapSize = catalog.length;
  }
  return catalogMapCache.get(String(problemId || "")) || null;
}

export function getProblemCatalogStats() {
  const catalog = readRuntimeCatalog();
  const banks = new Set();
  catalog.forEach((problem) => {
    const slug = problem?.bookSlug || problem?.source;
    if (slug) banks.add(slug);
  });
  return { total: catalog.length, banks: banks.size };
}

export function getProblemSourceChips() {
  const catalog = readRuntimeCatalog();
  const counts = new Map();
  catalog.forEach((problem) => {
    const slug = problem?.bookSlug || problem?.source || "";
    if (!slug) return;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  });
  const chips = SOURCE_CHIP_ORDER
    .filter((slug) => !counts.size || counts.get(slug) > 0)
    .map((slug) => ({ slug, label: SOURCE_SHORT_LABELS[slug] || slug }));
  return chips;
}

export function getProblemRowNumber(problemId, fallback) {
  const match = /(\d+)$/.exec(String(problemId || ""));
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

// zh locale list rows show the zh title with the en title as a subtitle
// (and vice versa for en locale). Falls back to the combined display title.
export function getProblemTitlePair(problemId, displayTitle, isEnglish) {
  const info = getCatalogProblemInfo(problemId);
  const zh = String(info?.titleZh || "").trim();
  const en = String(info?.titleEn || "").trim();
  if (zh || en) {
    const main = isEnglish ? (en || zh) : (zh || en);
    const sub = isEnglish ? (zh !== main ? zh : "") : (en !== main ? en : "");
    return { main, sub: sub === main ? "" : sub };
  }
  const combined = String(displayTitle || "").trim();
  const parts = combined.split(" / ");
  if (parts.length === 2) return { main: parts[0], sub: parts[1] };
  return { main: combined, sub: "" };
}
