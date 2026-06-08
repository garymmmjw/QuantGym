import {
  prepDiagnosticQuestions,
  prepProcessStages,
  prepRoleDefs,
  prepSeasonDefs,
  prepSourceLinks
} from "../../prep-data.js";
import {
  getPrepDailyTasks,
  getPrepPaceText,
  getPrepStageIndex,
  normalizePrepPlan
} from "../../modules/plan/data.js";
import { completePrepDiagnostic, setPrepDiagnosticStatus } from "../../modules/plan/diagnostic.js";
import { buildPrepPlanFromValues } from "../../modules/plan/setup.js";
import {
  applyCreatedPrepPlan,
  applyPlanUpdateResult,
  createPrepPlanEditorState
} from "../../modules/plan/state.js";
import { togglePrepTaskCompletion } from "../../modules/plan/todo.js";

export function createPlanPageApi(deps = {}) {
  const editorState = createPrepPlanEditorState(false);

  function getPlan() {
    return normalizePrepPlan(deps.getState?.().prepPlan, {
      makeId: deps.makeId,
      localDateKey: deps.localDateKey
    });
  }

  function applyResult(result, options = {}) {
    if (!applyPlanUpdateResult(deps.getState?.(), result, {
      buildTodayStudyPlan: deps.buildTodayStudyPlan,
      ...options
    }).changed) {
      return false;
    }
    deps.saveState?.();
    deps.renderTodayPlan?.();
    deps.renderTodoDock?.();
    deps.updatePrepTaskIndicator?.();
    deps.userStateRuntime?.store?.setState?.(deps.getState?.());
    return true;
  }

  function getDailyTasks(plan) {
    return getPrepDailyTasks(plan, {
      localDateKey: deps.localDateKey,
      formatCategoryLabel: deps.formatCategoryLabel
    });
  }

  function getViewModel() {
    const plan = getPlan();
    const showSetup = !plan || editorState.isOpen();
    if (!plan || showSetup) {
      return {
        mode: showSetup && plan ? "edit" : "setup",
        plan,
        showSetup,
        setupDefaults: plan ? {
          track: plan.track,
          season: plan.season,
          role: plan.role,
          weeklyHours: plan.weeklyHours,
          diagnostic: plan.diagnosticStatus === "skipped" ? "skip" : "take"
        } : {
          track: "internship",
          season: "2027-summer",
          role: "quantTrading",
          weeklyHours: 8,
          diagnostic: "take"
        }
      };
    }

    const role = prepRoleDefs[plan.role] || prepRoleDefs.quantTrading;
    const season = prepSeasonDefs[plan.season] || prepSeasonDefs["2027-summer"];
    const tasks = getDailyTasks(plan);
    const diagnosticScores = Object.entries(plan.diagnosticScores || {})
      .filter(([key]) => deps.skillDefs?.[key])
      .sort((left, right) => left[1] - right[1]);

    return {
      mode: "dashboard",
      plan,
      showSetup: false,
      role,
      season,
      tasks,
      stageIndex: getPrepStageIndex(plan),
      paceText: getPrepPaceText(plan),
      processStages: prepProcessStages,
      sourceLinks: prepSourceLinks,
      diagnosticQuestions: prepDiagnosticQuestions,
      diagnosticScores,
      diagnosticQuestionCount: prepDiagnosticQuestions.length,
      doneCount: tasks.filter((task) => task.done).length
    };
  }

  return {
    getViewModel,

    create(values = {}) {
      const prepPlan = buildPrepPlanFromValues(values, {
        previousPrepPlan: deps.getState?.().prepPlan,
        makeId: deps.makeId,
        localDateKey: deps.localDateKey
      });
      if (!prepPlan) return { ok: false };
      applyCreatedPrepPlan(deps.getState?.(), prepPlan, {
        buildTodayStudyPlan: deps.buildTodayStudyPlan
      });
      editorState.close();
      deps.saveState?.();
      deps.renderTodayPlan?.();
      deps.renderTodoDock?.();
      deps.updatePrepTaskIndicator?.();
      deps.refreshIcons?.();
      deps.userStateRuntime?.store?.setState?.(deps.getState?.());
      return { ok: true };
    },

    openEditor() {
      editorState.open();
      return getViewModel();
    },

    closeEditor() {
      editorState.close();
      return getViewModel();
    },

    toggleTask(taskId) {
      const result = togglePrepTaskCompletion({
        prepPlan: deps.getState?.().prepPlan,
        taskId,
        makeId: deps.makeId,
        localDateKey: deps.localDateKey
      });
      applyResult(result, { rebuildStudyPlan: true });
      return getViewModel();
    },

    startDiagnostic(status) {
      const result = setPrepDiagnosticStatus({
        prepPlan: deps.getState?.().prepPlan,
        status,
        makeId: deps.makeId,
        localDateKey: deps.localDateKey
      });
      applyResult(result, { rebuildStudyPlan: status === "skipped" });
      return getViewModel();
    },

    submitDiagnostic(answers = {}) {
      const result = completePrepDiagnostic({
        prepPlan: deps.getState?.().prepPlan,
        answers,
        makeId: deps.makeId,
        localDateKey: deps.localDateKey
      });
      if (!result.changed) {
        return {
          ok: false,
          missingCount: result.missingCount || 0,
          view: getViewModel()
        };
      }
      applyResult(result, { rebuildStudyPlan: true });
      return { ok: true, view: getViewModel() };
    },

    openTask(action, query = "") {
      if (action === "problems") {
        const filters = deps.skillDefs?.[query]
          ? {
              source: "all",
              company: "all",
              theme: query,
              difficulty: "all",
              viewMode: "all",
              detailId: ""
            }
          : {
              source: "all",
              company: "all",
              theme: "all",
              difficulty: "all",
              viewMode: "all",
              detailId: ""
            };
        deps.setProblemFilterState?.(filters);
        deps.setProblemPage?.(1);
        deps.setProblemDetailId?.("");
        deps.setProblemSearchQuery?.(deps.skillDefs?.[query] ? "" : query);
        deps.switchModule?.("problems");
        if (deps.elements?.problemSearch) deps.elements.problemSearch.value = deps.skillDefs?.[query] ? "" : query;
        deps.renderProblems?.();
        return;
      }
      if (action === "tools" || action === "resume" || action === "jobs" || action === "experiences") {
        deps.switchModule?.(action);
        return;
      }
      if (action === "interview" || action === "interview-behavioral") {
        if (deps.elements?.interviewTypeSelect) {
          deps.elements.interviewTypeSelect.value = action === "interview-behavioral" ? "behavioral" : "technical";
        }
        const interviewRuntimeState = deps.getInterviewRuntimeState?.();
        if (interviewRuntimeState) {
          interviewRuntimeState.selectedCategories = query && deps.skillDefs?.[query]
            ? new Set([query])
            : new Set(["all"]);
        }
        deps.resetInterview?.({ keepSetup: true });
        deps.renderInterviewSetup?.();
        deps.switchModule?.("interview");
      }
    },

    formatCategoryLabel: deps.formatCategoryLabel,
    t: deps.t,
    safeExternalUrl: deps.safeExternalUrl
  };
}
