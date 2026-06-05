import { requestDeleteProblem } from './catalogApi.js';
import { getProblemImportResult } from './capture.js';
import { applyProblemUpsert, applyUserProblemRemoval } from './mutations.js';

export function createProblemCatalogMutationController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const getInterviewState = () => deps.getInterviewState?.() || {};
  const normalizeProblem = (problem) => deps.normalizeProblem?.(problem) || problem;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  const upsertProblems = (problems) => {
    const result = applyProblemUpsert(getState(), problems, {
      normalizeProblem,
      isCatalogProblem: deps.isCatalogProblem || (() => true),
      nowIso
    });
    deps.clearProblemLookupCaches?.();
    deps.saveState?.();
    return result;
  };

  const selectFirstProblem = (problems = []) => {
    const first = (Array.isArray(problems) ? problems : [problems])[0];
    if (!first) return;
    getInterviewState().selectedProblemId = normalizeProblem(first).id;
  };

  const addFromForm = () => {
    const els = getElements();
    const problem = normalizeProblem({
      titleEn: els.problemTitleEn?.value,
      titleZh: els.problemTitleZh?.value,
      category: els.problemCategory?.value,
      difficulty: els.problemDifficulty?.value,
      tags: deps.parseTags?.(els.problemTags?.value),
      sourceUrl: els.problemSourceUrl?.value,
      source: "manual",
      promptEn: els.problemPromptEn?.value,
      promptZh: els.problemPromptZh?.value,
      answer: els.problemAnswer?.value,
      explanation: els.problemExplanation?.value,
      createdAt: nowIso()
    });

    if (!problem.titleEn && !problem.titleZh) return;
    if (!problem.promptEn && !problem.promptZh) return;

    upsertProblems([problem]);
    els.problemForm?.reset();
    els.problemForm?.classList.add("hidden");
    getInterviewState().selectedProblemId = problem.id;
    deps.resetInterview?.();
    deps.renderAll?.();
  };

  const importJson = () => {
    const els = getElements();
    const raw = String(els.problemJsonInput?.value || "").trim();
    if (!raw) return;
    const result = getProblemImportResult(raw);
    if (result.status !== "ok") {
      if (els.problemJsonInput) els.problemJsonInput.value = "";
      deps.windowRef?.alert?.("题目 JSON 无法读取。");
      return;
    }
    upsertProblems(result.problems);
    selectFirstProblem(result.problems);
    if (els.problemJsonInput) els.problemJsonInput.value = "";
    deps.resetInterview?.();
    deps.renderAll?.();
  };

  const deleteProblem = async (id) => {
    const result = applyUserProblemRemoval(getState(), id, {
      isUserProblem: deps.isUserProblem || (() => false)
    });
    if (!result.changed) return result;
    deps.clearProblemLookupCaches?.();
    if (getInterviewState().selectedProblemId === id) {
      getInterviewState().selectedProblemId = "";
      deps.resetInterview?.();
    }
    deps.saveState?.();
    deps.renderAll?.();
    if (deps.canUseCloud?.()) {
      await requestDeleteProblem(deps.cloudApi, id).catch(() => {});
    }
    return result;
  };

  const pruneCatalog = () => {
    const state = getState();
    const existingProblems = Array.isArray(state.problems) ? state.problems : [];
    const existingStates = Array.isArray(state.problemStates) ? state.problemStates : [];
    const catalogItems = existingProblems.filter((problem) => (
      deps.isCatalogProblem?.(problem) && !deps.isDisabledProblemSource?.(problem)
    ));
    const problemStates = existingStates.filter((problemState) => (
      !deps.isDisabledProblemId?.(problemState.problemId)
    ));

    if (catalogItems.length === existingProblems.length && problemStates.length === existingStates.length) {
      return { changed: false, problems: existingProblems, problemStates: existingStates };
    }

    state.problems = catalogItems;
    state.problemStates = problemStates;
    deps.clearProblemLookupCaches?.();
    deps.saveState?.({ sync: false, checkIn: false });
    return { changed: true, problems: catalogItems, problemStates };
  };

  return {
    addFromForm,
    importJson,
    pruneCatalog,
    upsertProblems,
    deleteProblem
  };
}
