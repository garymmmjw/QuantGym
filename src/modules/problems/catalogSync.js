export function createProblemCatalogSyncController(deps = {}) {
  let refreshPromise = null;
  let refreshSession = null;
  let requestSequence = 0;
  const getState = () => deps.getState?.() || {};
  const getSessionKey = deps.getSessionKey || getState;

  const refresh = (force = false) => {
    const session = getSessionKey();
    if (refreshPromise && !force && refreshSession === session) return refreshPromise;
    const sequence = ++requestSequence;
    refreshSession = session;
    refreshPromise = Promise.resolve().then(() => deps.requestCatalog?.() || [])
      .then((problems = []) => {
        // A late response must not reach a switched account or replace the
        // result of a newer access check for this same account.
        if (getSessionKey() !== session || sequence !== requestSequence) {
          return { changed: false, count: 0, discarded: true };
        }
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
        if (sequence === requestSequence) refreshPromise = null;
      });
    return refreshPromise;
  };

  return {
    isRefreshing: () => Boolean(refreshPromise),
    refresh
  };
}
