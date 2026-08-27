import { skillDefs } from "../../skills.js";
import { parseTags as parseTagsValue } from "../../lib/text.js";

const CATEGORY_ALIASES = Object.freeze({
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
  integration: "calculus",
  integral: "calculus",
  derivative: "calculus",
  limits: "calculus",
  analysis: "calculus",
  ode: "calculus",
  ordinary_differential_equation: "calculus",
  differential_equation: "calculus",
  differential_equations: "calculus",
  inequality: "algebra",
  inequalities: "algebra",
  linear_algebra: "linearAlgebra",
  matrix: "linearAlgebra",
  matrices: "linearAlgebra",
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
});

const normalizeCategory = (category, defs) => {
  const key = String(category || "").trim();
  const lookupKey = key.toLowerCase().replace(/[\s-]+/g, "_");
  return defs[key]
    ? key
    : CATEGORY_ALIASES[key] || CATEGORY_ALIASES[lookupKey] || "probabilityExpectation";
};

/**
 * Normalizes news-topic skill tags without depending on the retired Problems
 * page or its local training store.
 */
export function normalizeNewsSkills(value, deps = {}) {
  const parseTags = deps.parseTags || parseTagsValue;
  const defs = deps.skillDefs || skillDefs;
  const raw = Array.isArray(value) ? value : parseTags(value || "");
  const skills = raw
    .map((item) => normalizeCategory(item, defs))
    .filter((key) => defs[key]);
  return [...new Set(skills.length ? skills : ["market"])];
}
