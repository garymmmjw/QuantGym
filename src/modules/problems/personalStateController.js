import {
  getProblemPersonalState as getProblemPersonalStateValue,
  toggleProblemCompletedState,
  toggleProblemSavedState,
  updateProblemStates
} from './mutations.js';
import { createProblemStateCache } from './stateCache.js';

export function createProblemPersonalStateController(deps = {}) {
  const cache = createProblemStateCache({
    normalizeState: deps.normalizeProblemState
  });

  const getState = () => deps.getState?.() || {};
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  function clearStateCache() {
    cache.clear();
  }

  function getStateCache() {
    return cache.getMap(getState().problemStates || []);
  }

  function getPersonalState(problemId) {
    return getProblemPersonalStateValue(getStateCache(), problemId, {
      fallback: deps.normalizeProblemState?.({ problemId }) || { problemId }
    });
  }

  function update(problemId, updateValue) {
    const state = getState();
    state.problemStates = updateProblemStates(state.problemStates || [], problemId, updateValue, {
      normalizeProblemState: deps.normalizeProblemState,
      mergeProblemStates: deps.mergeProblemStates,
      nowIso
    });
    clearStateCache();
    return state.problemStates;
  }

  function toggleSaved(problemId) {
    const state = getState();
    state.problemStates = toggleProblemSavedState(state.problemStates || [], problemId, {
      normalizeProblemState: deps.normalizeProblemState,
      mergeProblemStates: deps.mergeProblemStates,
      nowIso
    });
    clearStateCache();
    deps.saveState?.();
    deps.renderProblems?.();
  }

  function toggleCompleted(problemId) {
    const state = getState();
    state.problemStates = toggleProblemCompletedState(state.problemStates || [], problemId, {
      normalizeProblemState: deps.normalizeProblemState,
      mergeProblemStates: deps.mergeProblemStates,
      nowIso
    });
    clearStateCache();
    deps.saveState?.();
    deps.renderSummary?.();
    deps.renderSkills?.();
    deps.renderProblems?.();
  }

  function clearLookupCaches() {
    deps.clearSearchCache?.();
    deps.clearCompanyCache?.();
    clearStateCache();
  }

  return {
    clearLookupCaches,
    clearStateCache,
    getStateCache,
    getPersonalState,
    update,
    toggleSaved,
    toggleCompleted
  };
}
