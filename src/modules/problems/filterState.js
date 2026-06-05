import { normalizeDifficultyFilter } from './format.js';

export function normalizeProblemFilterState(state = {}) {
  return {
    source: state.source || "all",
    company: state.company || "all",
    theme: state.theme || "all",
    difficulty: normalizeDifficultyFilter(state.difficulty || "all"),
    viewMode: ["saved", "ranking"].includes(state.viewMode) ? state.viewMode : "all",
    detailId: state.detailId || ""
  };
}

export function applyProblemFilterPatch(current = {}, patch = {}) {
  return normalizeProblemFilterState({
    ...normalizeProblemFilterState(current),
    ...patch
  });
}

export function createProblemFilterState(initialState = {}) {
  let state = normalizeProblemFilterState(initialState);
  const snapshot = () => ({ ...state });

  return {
    getState() {
      return snapshot();
    },
    setState(nextState = {}) {
      state = normalizeProblemFilterState(nextState);
      return snapshot();
    },
    patch(patch = {}) {
      state = applyProblemFilterPatch(state, patch);
      return snapshot();
    },
    applyAction(action = {}) {
      const result = getProblemFilterActionState(state, action);
      state = result.state;
      return {
        ...result,
        state: snapshot()
      };
    }
  };
}

export function getProblemFilterActionState(current = {}, action = {}) {
  const state = normalizeProblemFilterState(current);
  const type = action.type || "";
  let next = state;
  let resetPagination = true;
  let returnToList = true;

  if (type === "theme") {
    next = applyProblemFilterPatch(state, { theme: action.value || "all" });
  } else if (type === "difficulty") {
    next = applyProblemFilterPatch(state, { difficulty: normalizeDifficultyFilter(action.value || "all") });
  } else if (type === "company") {
    next = applyProblemFilterPatch(state, { company: action.value || "all", viewMode: "all" });
  } else if (type === "clearCompany") {
    next = applyProblemFilterPatch(state, { company: "all" });
  } else if (type === "clearSource") {
    next = applyProblemFilterPatch(state, { source: "all" });
  } else if (type === "viewMode") {
    next = applyProblemFilterPatch(state, {
      viewMode: ["saved", "ranking"].includes(action.value) ? action.value : "all"
    });
  } else if (type === "navigation") {
    next = applyProblemFilterPatch(state, action.filters || {});
    resetPagination = false;
    returnToList = false;
  } else {
    resetPagination = false;
    returnToList = false;
  }

  return {
    state: next,
    resetPagination,
    returnToList
  };
}
