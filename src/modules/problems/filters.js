import { normalizeSearchQuery } from "../../lib/text.js";
import { difficultyClass, normalizeDifficultyFilter } from "./format.js";

export function problemMatchesTheme(problem, theme = "all", options = {}) {
  if (!theme || theme === "all") return true;
  const normalizeCategory = options.normalizeCategory || ((value) => value);
  return normalizeCategory(problem?.category) === theme;
}

export function problemMatchesDifficulty(problem, difficulty = "all") {
  const normalized = normalizeDifficultyFilter(difficulty);
  if (normalized === "all") return true;
  return difficultyClass(problem?.difficulty) === normalized;
}

export function problemMatchesSource(problem, sourceSlug = "all") {
  if (!sourceSlug || sourceSlug === "all") return true;
  return problem?.source === sourceSlug || problem?.bookSlug === sourceSlug;
}

export function getProblemViewModeForSearch(query, currentViewMode = "all") {
  return normalizeSearchQuery(query) ? "all" : currentViewMode;
}

export function getProblemFilterScopes(problems = [], filters = {}, predicates = {}) {
  const catalogProblems = (Array.isArray(problems) ? problems : []).filter((problem) => predicates.isCatalogProblem?.(problem) ?? true);
  const sourceProblems = catalogProblems.filter((problem) => predicates.matchesSource?.(problem, filters.source) ?? true);
  const companyProblems = sourceProblems.filter((problem) => predicates.matchesCompany?.(problem, filters.company) ?? true);
  return {
    catalogProblems,
    sourceProblems,
    companyProblems
  };
}
