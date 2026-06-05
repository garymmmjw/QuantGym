export async function requestProblemCatalog(cloudApi, options = {}) {
  const data = await cloudApi("/problems");
  const isCatalogProblem = options.isCatalogProblem || (() => true);
  const isDisabledProblemSource = options.isDisabledProblemSource || (() => false);
  return Array.isArray(data.problems)
    ? data.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem))
    : [];
}

export async function requestDeleteProblem(cloudApi, problemId = "") {
  if (!problemId) return null;
  return cloudApi(`/problems/${encodeURIComponent(problemId)}`, { method: "DELETE" });
}
