export function upsertCatalogProblems(existingProblems = [], incomingProblems = [], options = {}) {
  const {
    normalizeProblem = (problem) => problem,
    isCatalogProblem = () => true,
    nowIso = () => new Date().toISOString()
  } = options;
  const byId = new Map((Array.isArray(existingProblems) ? existingProblems : []).map((problem) => [problem.id, problem]));
  (Array.isArray(incomingProblems) ? incomingProblems : [incomingProblems])
    .map(normalizeProblem)
    .filter(isCatalogProblem)
    .forEach((problem) => {
      byId.set(problem.id, {
        ...(byId.get(problem.id) || {}),
        ...problem,
        updatedAt: nowIso()
      });
    });
  return [...byId.values()].filter(isCatalogProblem);
}

export function applyProblemUpsert(state = {}, problems = [], options = {}) {
  state.problems = upsertCatalogProblems(state.problems, problems, options);
  return {
    changed: true,
    problems: state.problems
  };
}

export function removeUserProblemById(existingProblems = [], problemId = "", options = {}) {
  const {
    isUserProblem = () => false
  } = options;
  const problems = Array.isArray(existingProblems) ? existingProblems : [];
  const problem = problems.find((item) => item.id === problemId);
  if (!problem || !isUserProblem(problem)) {
    return { removed: false, problem: null, problems };
  }
  return {
    removed: true,
    problem,
    problems: problems.filter((item) => item.id !== problemId)
  };
}

export function applyUserProblemRemoval(state = {}, problemId = "", options = {}) {
  const result = removeUserProblemById(state.problems, problemId, options);
  if (!result.removed) return { ...result, changed: false };
  state.problems = result.problems;
  return { ...result, changed: true };
}

export function getProblemPersonalState(problemStates = [], problemId = "", options = {}) {
  const fallback = options.fallback || {};
  if (problemStates?.get) return problemStates.get(problemId) || fallback;
  return (Array.isArray(problemStates) ? problemStates : []).find((item) => item.problemId === problemId) || fallback;
}

export function updateProblemStates(problemStates = [], problemId = "", update = {}, options = {}) {
  if (!problemId) return Array.isArray(problemStates) ? problemStates : [];
  const {
    normalizeProblemState = (item) => item,
    mergeProblemStates = (...lists) => lists.flat().filter(Boolean),
    nowIso = () => new Date().toISOString()
  } = options;
  const current = getProblemPersonalState(problemStates, problemId, { fallback: { problemId } });
  const next = normalizeProblemState({
    ...current,
    ...(typeof update === "function" ? update(current) : update),
    problemId,
    updatedAt: nowIso()
  });
  return mergeProblemStates(problemStates || [], [next]);
}

export function getProblemSavedToggle(current = {}, options = {}) {
  const isSaved = Boolean(current.favorite);
  const nowIso = options.nowIso || (() => new Date().toISOString());
  return {
    favorite: !isSaved,
    lastFavoriteAt: isSaved ? "" : nowIso()
  };
}

export function getProblemCompletedToggle(current = {}, options = {}) {
  const isCompleted = Boolean(current.completed);
  const nowIso = options.nowIso || (() => new Date().toISOString());
  return {
    completed: !isCompleted,
    completedAt: isCompleted ? "" : nowIso()
  };
}

export function toggleProblemSavedState(problemStates = [], problemId = "", options = {}) {
  const current = getProblemPersonalState(problemStates, problemId, { fallback: { problemId } });
  return updateProblemStates(problemStates, problemId, getProblemSavedToggle(current, {
    nowIso: options.nowIso
  }), options);
}

export function toggleProblemCompletedState(problemStates = [], problemId = "", options = {}) {
  const current = getProblemPersonalState(problemStates, problemId, { fallback: { problemId } });
  return updateProblemStates(problemStates, problemId, getProblemCompletedToggle(current, {
    nowIso: options.nowIso
  }), options);
}
