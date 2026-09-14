import { countsTowardProblemTotal, hasExplicitProblemCompletion } from './completion.js';

export function getCatalogProblems(problems = [], isCatalogProblem = () => true) {
  return (Array.isArray(problems) ? problems : []).filter(isCatalogProblem);
}

export function isProblemCompleted(problemId, getPersonalState = () => ({})) {
  return hasExplicitProblemCompletion(getPersonalState(problemId));
}

export function getProblemCompletionCount(problems = [], getPersonalState = () => ({})) {
  return new Set((Array.isArray(problems) ? problems : [])
    .filter(problem => isProblemCompleted(problem.id, getPersonalState) && countsTowardProblemTotal(problem))
    .map(problem => problem.id)).size;
}

export function getLeetcodeHotCompletionStats(_doneIds = [], hotItems = []) {
  // The legacy list cannot verify a linked account. Never publish local flags
  // as LeetCode completions; the LeetCode page owns synced progress.
  return { done: 0, total: hotItems.length || 100, requiresSync: true };
}

export function toggleLeetcodeHotDoneState() {
  return null;
}
