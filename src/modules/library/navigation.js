import {
  getLibraryEntries,
  getVisibleLibraryEntries
} from './data.js';

export function getVisibleLibraryEntriesForState(options = {}) {
  const {
    catalog = [],
    kindFilter = "all",
    query = "",
    searchValue = ""
  } = options;
  return getVisibleLibraryEntries(getLibraryEntries(catalog), {
    kindFilter,
    query: query || searchValue
  });
}

export function getLibraryPracticeNavigation(options = {}) {
  const {
    sourceSlug = "",
    problems = [],
    isCatalogProblem = () => false
  } = options;
  if (!sourceSlug) return { ok: false };
  const hasProblems = (Array.isArray(problems) ? problems : []).some((problem) => (
    isCatalogProblem(problem)
    && (problem.source === sourceSlug || problem.bookSlug === sourceSlug)
  ));
  if (!hasProblems) return { ok: false };
  return {
    ok: true,
    filters: {
      source: sourceSlug,
      company: "all",
      theme: "all",
      difficulty: "all",
      viewMode: "all",
      detailId: ""
    }
  };
}
