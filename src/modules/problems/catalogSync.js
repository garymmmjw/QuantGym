export function createProblemCatalogSyncController(deps = {}) {
  let refreshPromise = null;
  const getState = () => deps.getState?.() || {};

  const refresh = (force = false) => {
    if (refreshPromise && !force) return refreshPromise;
    refreshPromise = deps.requestCatalog?.()
      .then((problems = []) => {
        if (!problems.length) return { changed: false, count: 0 };
        const state = getState();
        state.problems = deps.mergeProblems?.(
          deps.getUserCatalogProblems?.(state.problems) || [],
          problems
        ) || state.problems;
        state.problemStates = (state.problemStates || []).filter((problemState) => (
          !deps.isDisabledProblemId?.(problemState.problemId)
        ));
        deps.clearProblemLookupCaches?.();
        deps.saveState?.({ sync: false, checkIn: false });
        deps.renderProblems?.();
        deps.renderInterviewSetup?.();
        return { changed: true, count: problems.length };
      })
      .catch((error) => ({ changed: false, count: 0, error }))
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  return {
    isRefreshing: () => Boolean(refreshPromise),
    refresh
  };
}
