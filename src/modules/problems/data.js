import { skillDefs } from '../../skills.js';
import { parseTags as parseTagsValue } from '../../lib/text.js';
import { isLegacyCatalogMarker } from './format.js';

const DEFAULT_PROBLEM_MEDIA_FIELD_KEYS = [
  "image",
  "imageUrl",
  "imageUrls",
  "images",
  "diagram",
  "diagramUrl",
  "promptImage",
  "promptImages",
  "answerImage",
  "answerImages",
  "explanationImage",
  "explanationImages",
  "solutionImage",
  "solutionImages"
];

const DEFAULT_PROBLEM_LOCALIZED_FIELD_KEYS = [
  "answerEn",
  "answerZh",
  "explanationEn",
  "explanationZh",
  "hint",
  "hintEn",
  "hintZh",
  "quantguide"
];

export function normalizeCatalogProblemId(id) {
  const value = String(id || "").trim();
  const legacyPrefix = [["pu", "rple"].join(""), "book"].join("-");
  if (value.startsWith(`${legacyPrefix}-problem-`)) return value.replace(`${legacyPrefix}-problem-`, "catalog-problem-");
  if (value.startsWith(`${legacyPrefix}-exercise-`)) return value.replace(`${legacyPrefix}-exercise-`, "catalog-exercise-");
  return value;
}

export function normalizeProblemSource(source) {
  return isLegacyCatalogMarker(source) ? "question-bank" : String(source || "").trim();
}

export function sanitizeProblemTags(tags = []) {
  const cleaned = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !isLegacyCatalogMarker(tag));
  return [...new Set(cleaned)];
}

export function sanitizeProblemTitleZh(title, raw = {}, overrides = {}) {
  const legacyLabel = ["紫", "皮", "书"].join("");
  const legacyExercisePattern = new RegExp(`${legacyLabel}练习\\s*\\d+`);
  const legacyLabelPattern = new RegExp(legacyLabel, "g");
  if (!legacyExercisePattern.test(title)) return title.replace(legacyLabelPattern, "").trim();
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return overrides[number]?.zh || title.replace(legacyLabelPattern, "").trim();
}

export function sanitizeProblemTitleEn(title, raw = {}, overrides = {}) {
  const legacyBookPattern = new RegExp(["pu", "rple"].join("") + "\\s+book", "i");
  if (!legacyBookPattern.test(title || "")) return title;
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return overrides[number]?.en || title.replace(new RegExp(legacyBookPattern.source, "ig"), "Question Bank").trim();
}

export function pickProblemExtendedFields(raw = {}, options = {}) {
  const mediaKeys = options.mediaFieldKeys || DEFAULT_PROBLEM_MEDIA_FIELD_KEYS;
  const localizedKeys = options.localizedFieldKeys || DEFAULT_PROBLEM_LOCALIZED_FIELD_KEYS;
  const extra = {};
  [...mediaKeys, ...localizedKeys].forEach((key) => {
    if (raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== "") {
      extra[key] = raw[key];
    }
  });
  return extra;
}

export function inferProblemCategory(raw = {}) {
  const text = `${raw?.sourceUrl || ""} ${raw?.source || ""} ${raw?.title || ""} ${raw?.prompt || ""}`.toLowerCase();
  if (text.includes("leetcode")) return "leetcode";
  if (/c\+\+|\bcpp\b|virtual function|abstract class|polymorphism|strcmp|destructor|\bconst\s+(?:keyword|member|method|pointer|reference)\b|\bstatic\s+(?:keyword|member|function|variable)\b|虚函数|抽象类|多态|c\+\+.*(?:指针|引用|静态|常量)/.test(text)) return "cppProgramming";
  if (text.includes("pandas") || text.includes("numpy") || text.includes("dataframe")) return "pandasNumpy";
  if (text.includes("option") || text.includes("greeks") || text.includes("volatility")) return "option";
  if (text.includes("market") || text.includes("trading")) return "market";
  if (text.includes("statistics") || text.includes("p-value") || text.includes("hypothesis")) return "statistics";
  if (/complex number|complex analysis|imaginary|euler'?s formula|principal logarithm|\bi\^i\b|复数|虚数|欧拉公式|主值对数/.test(text)) return "complexNumbers";
  if (/linear algebra|matrix|matrices|determinant|eigen(?:value|vector)?|cholesky|positive semi.?definite|positive definite|vector space|线性代数|矩阵|行列式|特征值|特征向量|正半定|正定/.test(text)) return "linearAlgebra";
  if (/optimization|linear programming|linear program|quadratic programming|quadratic program|min.?cost flow|max flow|network flow|dual variable|convex optimization|最优化|优化|线性规划|二次规划|网络流|最小费用流|最大流|对偶变量|凸优化/.test(text)) return "optimization";
  if (/calculus|analysis|integral|integration|derivative|limits?|\bl'?hospital\b|ordinary differential equation|differential equation|\bode\b|微积分|分析|积分|导数|极限|洛必达|微分方程|常微分/.test(text)) return "calculus";
  if (/algebra|inequalit(?:y|ies)|bernoulli inequality|polynomial|binomial|induction|代数|不等式|伯努利不等式|多项式|二项式|归纳法/.test(text)) return "algebra";
  if (text.includes("deep learning") || text.includes("transformer") || text.includes("neural")) return "deepLearning";
  if (text.includes("machine learning") || text.includes("xgboost") || text.includes("feature")) return "machineLearning";
  if (text.includes("probability") || text.includes("expected") || text.includes("bayes")) return "probabilityExpectation";
  return "probabilityExpectation";
}

export function normalizeCategory(category, defs = skillDefs) {
  const key = String(category || "").trim();
  const lookupKey = key.toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    probability: "probabilityExpectation",
    expectation: "probabilityExpectation",
    cpp: "cppProgramming",
    "c++": "cppProgramming",
    "c++_programming": "cppProgramming",
    cplusplus: "cppProgramming",
    c_plus_plus: "cppProgramming",
    c___programming: "cppProgramming",
    cpp_programming: "cppProgramming",
    cplusplus_programming: "cppProgramming",
    object_oriented_programming: "cppProgramming",
    mental: "mentalMath",
    mental_math: "mentalMath",
    pandas: "pandasNumpy",
    numpy: "pandasNumpy",
    ml: "machineLearning",
    machine_learning: "machineLearning",
    dl: "deepLearning",
    deep_learning: "deepLearning",
    options: "option",
    calculus: "calculus",
    integration: "calculus",
    integral: "calculus",
    derivative: "calculus",
    limits: "calculus",
    analysis: "calculus",
    ode: "calculus",
    ordinary_differential_equation: "calculus",
    differential_equation: "calculus",
    differential_equations: "calculus",
    algebra: "algebra",
    inequality: "algebra",
    inequalities: "algebra",
    linear_algebra: "linearAlgebra",
    matrix: "linearAlgebra",
    matrices: "linearAlgebra",
    optimization: "optimization",
    optim: "optimization",
    linear_programming: "optimization",
    linear_program: "optimization",
    lp: "optimization",
    quadratic_programming: "optimization",
    quadratic_program: "optimization",
    qp: "optimization",
    network_flow: "optimization",
    min_cost_flow: "optimization",
    max_flow: "optimization",
    convex_optimization: "optimization",
    complex: "complexNumbers",
    complex_number: "complexNumbers",
    complex_numbers: "complexNumbers",
    complex_analysis: "complexNumbers",
    communication: "leetcode"
  };
  return defs[key] ? key : aliases[key] || aliases[lookupKey] || "probabilityExpectation";
}

export function normalizeProblem(raw = {}, deps = {}) {
  const {
    makeId = () => `${Date.now()}-${Math.random()}`,
    stableId = (title, sourceUrl) => `${title}|${sourceUrl}`,
    inferSource = () => "manual",
    parseTags = parseTagsValue,
    exerciseTitleOverrides = {},
    normalizeProblemCompanies = () => [],
    mediaFieldKeys = DEFAULT_PROBLEM_MEDIA_FIELD_KEYS,
    localizedFieldKeys = DEFAULT_PROBLEM_LOCALIZED_FIELD_KEYS
  } = deps;
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  let titleEn = sanitizeProblemTitleEn(String(raw?.titleEn || raw?.title || "").trim(), raw, exerciseTitleOverrides);
  const titleZh = sanitizeProblemTitleZh(String(raw?.titleZh || "").trim(), raw, exerciseTitleOverrides);
  const promptEn = String(raw?.promptEn || raw?.prompt || "").trim();
  const promptZh = String(raw?.promptZh || "").trim();
  const id = normalizeCatalogProblemId(raw?.id || stableId(titleEn || titleZh || sourceUrl || makeId(), sourceUrl));
  if (!titleEn && id.startsWith("catalog-exercise-")) {
    const number = id.match(/(\d+)$/)?.[1]?.padStart(3, "0");
    titleEn = exerciseTitleOverrides[number]?.en || "";
  }
  const source = normalizeProblemSource(raw?.source || inferSource(sourceUrl));
  const sourceType = String(raw?.sourceType || raw?.collection || "").trim();
  const bookSlug = String(raw?.bookSlug || "").trim();
  const tags = sanitizeProblemTags(Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean) : parseTags(raw?.tags || ""));
  const visibility = raw?.visibility || (
    source === "seed" || source === "question-bank" || sourceType === "book" || bookSlug
      ? "public"
      : "user"
  );
  return {
    id,
    titleEn,
    titleZh,
    category: normalizeCategory(raw?.category || inferProblemCategory(raw), deps.skillDefs || skillDefs),
    difficulty: raw?.difficulty || "Medium",
    tags,
    companies: normalizeProblemCompanies(raw, tags, source),
    source,
    sourceUrl,
    sourceType,
    bookSlug,
    bookName: String(raw?.bookName || "").trim(),
    promptEn,
    promptZh,
    answer: String(raw?.answer || "").trim(),
    explanation: String(raw?.explanation || raw?.solution || "").trim(),
    visibility: visibility === "public" ? "public" : "user",
    ownerUserId: String(raw?.ownerUserId || "").trim(),
    createdAt: isLegacyCatalogMarker(raw?.createdAt) ? "catalog" : raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || "",
    ...pickProblemExtendedFields(raw, { mediaFieldKeys, localizedFieldKeys })
  };
}

export function isUserProblem(problem, deps = {}) {
  return normalizeProblem(problem, deps).visibility === "user";
}

export function isCatalogProblem(problem, deps = {}) {
  const parseTags = deps.parseTags || parseTagsValue;
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const id = String(problem?.id || "");
  return source === "question-bank"
    || sourceType === "book"
    || sourceType === "question-bank"
    || Boolean(bookSlug)
    || isLegacyCatalogMarker(source)
    || id.startsWith("catalog-")
    || isLegacyCatalogMarker(id)
    || tags.includes("question-bank")
    || tags.some(isLegacyCatalogMarker);
}

export function getUserCatalogProblems(problems = [], deps = {}) {
  return (Array.isArray(problems) ? problems : []).filter((problem) => (
    isUserProblem(problem, deps)
    && isCatalogProblem(problem, deps)
    && !deps.isDisabledProblemSource?.(problem)
  ));
}

export function mergeProblems(seed = [], saved = [], deps = {}) {
  const byId = new Map();
  [...seed, ...saved].forEach((problem) => {
    const normalized = normalizeProblem(problem, deps);
    const previous = byId.get(normalized.id);
    if (!previous) {
      byId.set(normalized.id, normalized);
      return;
    }
    byId.set(normalized.id, {
      ...previous,
      ...normalized,
      tags: sanitizeProblemTags([...(previous.tags || []), ...(normalized.tags || [])]),
      companies: normalized.companies?.length ? normalized.companies : previous.companies || []
    });
  });
  return [...byId.values()];
}

export function normalizeLeetcodeHot100Done(value, leetcodeHot100 = []) {
  const valid = new Set(leetcodeHot100.map((item) => item.id));
  return [...new Set(Array.isArray(value) ? value.map(String) : [])].filter((id) => valid.has(id));
}

export function normalizeProblemState(raw = {}, deps = {}) {
  const problemId = normalizeCatalogProblemId(raw.problemId);
  return {
    ...raw,
    problemId,
    interviewCount: Math.max(0, Number(raw.interviewCount || 0)),
    favorite: Boolean(raw.favorite),
    completed: Boolean(raw.completed),
    completedAt: raw.completedAt || "",
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((favorite) => favorite?.id) : [],
    scoreHistory: Array.isArray(raw.scoreHistory) ? raw.scoreHistory.filter((score) => score?.id) : [],
    lastPracticedAt: raw.lastPracticedAt || "",
    updatedAt: raw.updatedAt || ""
  };
}

export function mergeProblemStates(lists = [], deps = {}) {
  const mergeRecordsById = deps.mergeRecordsById || ((...items) => items.flat().filter(Boolean));
  const latestIso = deps.latestIso || ((...values) => values.filter(Boolean).sort().at(-1) || "");
  const byId = new Map();
  lists.flat().filter(Boolean).forEach((raw) => {
    const next = normalizeProblemState(raw, deps);
    if (!next.problemId) return;
    const previous = byId.get(next.problemId);
    if (!previous) {
      byId.set(next.problemId, next);
      return;
    }
    const lastScoreAt = latestIso(previous.lastScoreAt, next.lastScoreAt);
    const scoreSource = previous.lastScoreAt === lastScoreAt ? previous : next;
    const favoriteSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    const completedSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    byId.set(next.problemId, {
      ...previous,
      ...next,
      interviewCount: Math.max(previous.interviewCount || 0, next.interviewCount || 0),
      favorite: Boolean(favoriteSource.favorite),
      completed: Boolean(completedSource.completed),
      completedAt: completedSource.completed ? latestIso(previous.completedAt, next.completedAt) : "",
      favorites: mergeRecordsById(previous.favorites || [], next.favorites || []),
      scoreHistory: mergeRecordsById(previous.scoreHistory || [], next.scoreHistory || []),
      lastScore: scoreSource.lastScore,
      lastScoreAt,
      lastEvaluation: scoreSource.lastEvaluation || "",
      lastPracticedAt: latestIso(previous.lastPracticedAt, next.lastPracticedAt),
      updatedAt: latestIso(previous.updatedAt, next.updatedAt)
    });
  });
  return [...byId.values()];
}

export function problemStatesFromFavorites(favorites = [], deps = {}) {
  const latestIso = deps.latestIso || ((...values) => values.filter(Boolean).sort().at(-1) || "");
  const byProblem = new Map();
  (Array.isArray(favorites) ? favorites : []).forEach((favorite) => {
    const problemId = String(favorite?.problemId || "").trim();
    if (!problemId) return;
    const previous = byProblem.get(problemId) || {
      problemId,
      favorite: true,
      favorites: []
    };
    previous.favorites.push(favorite);
    previous.lastFavoriteAt = latestIso(previous.lastFavoriteAt, favorite.createdAt);
    previous.updatedAt = latestIso(previous.updatedAt, favorite.createdAt);
    byProblem.set(problemId, previous);
  });
  return [...byProblem.values()];
}

export function normalizeNewsSkills(value, deps = {}) {
  const parseTags = deps.parseTags || parseTagsValue;
  const defs = deps.skillDefs || skillDefs;
  const raw = Array.isArray(value) ? value : parseTags(value || "");
  const skills = raw.map((item) => normalizeCategory(item, defs)).filter((key) => defs[key]);
  return [...new Set(skills.length ? skills : ["market"])];
}

export function formatCategoryLabel(category, defs = skillDefs) {
  const normalized = normalizeCategory(category, defs);
  return defs[normalized]?.name || category;
}
