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

  const addFromPayload = (payload = {}) => {
    const problem = normalizeProblem({
      titleEn: payload.titleEn,
      titleZh: payload.titleZh,
      category: payload.category,
      difficulty: payload.difficulty,
      tags: Array.isArray(payload.tags) ? payload.tags : deps.parseTags?.(payload.tags),
      sourceUrl: payload.sourceUrl,
      source: "manual",
      promptEn: payload.promptEn,
      promptZh: payload.promptZh,
      answer: payload.answer,
      explanation: payload.explanation,
      createdAt: nowIso()
    });

    if (!problem.titleEn && !problem.titleZh) return null;
    if (!problem.promptEn && !problem.promptZh) return null;

    upsertProblems([problem]);
    getInterviewState().selectedProblemId = problem.id;
    deps.resetInterview?.();
    deps.renderAll?.();
    return problem;
  };

  const addFromForm = () => {
    const els = getElements();
    const problem = addFromPayload({
      titleEn: els.problemTitleEn?.value,
      titleZh: els.problemTitleZh?.value,
      category: els.problemCategory?.value,
      difficulty: els.problemDifficulty?.value,
      tags: els.problemTags?.value,
      sourceUrl: els.problemSourceUrl?.value,
      promptEn: els.problemPromptEn?.value,
      promptZh: els.problemPromptZh?.value,
      answer: els.problemAnswer?.value,
      explanation: els.problemExplanation?.value
    });
    if (!problem) return;
    els.problemForm?.reset();
    els.problemForm?.classList.add("hidden");
  };

  const importJsonText = (rawValue = "") => {
    const raw = String(rawValue || "").trim();
    if (!raw) return false;
    const result = getProblemImportResult(raw);
    if (result.status !== "ok") {
      deps.windowRef?.alert?.("题目 JSON 无法读取。");
      return false;
    }
    upsertProblems(result.problems);
    selectFirstProblem(result.problems);
    deps.resetInterview?.();
    deps.renderAll?.();
    return true;
  };

  const importJson = () => {
    const els = getElements();
    const ok = importJsonText(els.problemJsonInput?.value || "");
    if (els.problemJsonInput) els.problemJsonInput.value = "";
    return ok;
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
    const problems = existingProblems.filter((problem) => !deps.isDisabledProblemSource?.(problem));
    const problemStates = existingStates.filter((problemState) => (
      !deps.isDisabledProblemId?.(problemState.problemId)
    ));

    if (problems.length === existingProblems.length && problemStates.length === existingStates.length) {
      return { changed: false, problems: existingProblems, problemStates: existingStates };
    }

    state.problems = problems;
    state.problemStates = problemStates;
    deps.clearProblemLookupCaches?.();
    deps.saveState?.({ sync: false, checkIn: false });
    return { changed: true, problems, problemStates };
  };

  return {
    addFromForm,
    addFromPayload,
    importJson,
    importJsonText,
    pruneCatalog,
    upsertProblems,
    deleteProblem
  };
}
