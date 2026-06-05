export function getCatalogProblems(problems = [], isCatalogProblem = () => true) {
  return (Array.isArray(problems) ? problems : []).filter(isCatalogProblem);
}

export function isProblemCompleted(problemId, getPersonalState = () => ({})) {
  return Boolean(getPersonalState(problemId)?.completed);
}

export function getProblemCompletionCount(problems = [], getPersonalState = () => ({})) {
  return (Array.isArray(problems) ? problems : []).filter((problem) => isProblemCompleted(problem.id, getPersonalState)).length;
}

export function getLeetcodeHotCompletionStats(doneIds = [], hotItems = []) {
  return {
    done: (Array.isArray(doneIds) ? doneIds : []).length,
    total: hotItems.length || 100
  };
}

export function toggleLeetcodeHotDoneState(options = {}) {
  const {
    problemId = "",
    doneIds = [],
    hotItems = [],
    currentLeetcodeSkill = 0,
    normalizeDoneIds = (ids) => ids
  } = options;
  const valid = new Set((Array.isArray(hotItems) ? hotItems : []).map((item) => item.id));
  if (!valid.has(problemId)) return null;
  const done = new Set(normalizeDoneIds(doneIds));
  if (done.has(problemId)) done.delete(problemId);
  else done.add(problemId);
  const nextDoneIds = [...done];
  return {
    doneIds: nextDoneIds,
    leetcodeSkill: Math.max(Number(currentLeetcodeSkill || 0), Math.min(100, nextDoneIds.length))
  };
}
