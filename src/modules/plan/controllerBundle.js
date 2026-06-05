import { createPrepPlanController } from './prepPlanController.js';
import { createTodoDockController } from './todoDockController.js';

export function createPlanControllerBundle(deps = {}) {
  let prepPlanController = null;

  const todoDockController = createTodoDockController({
    elements: deps.elements,
    documentRef: deps.documentRef,
    getState: deps.getState,
    buildPrepTodayPlan: deps.buildTodayStudyPlan,
    fallbackSummary: deps.fallbackSummary,
    makeId: deps.makeId,
    localDateKey: deps.localDateKey,
    saveState: deps.saveState,
    renderPrepPlan: () => prepPlanController?.render?.(),
    renderTodayPlan: deps.renderTodayPlan,
    togglePrepTask: (taskId) => prepPlanController?.toggleTask?.(taskId),
    t: deps.t,
    refreshIcons: deps.refreshIcons
  });

  prepPlanController = createPrepPlanController({
    elements: deps.elements,
    getState: deps.getState,
    buildTodayStudyPlan: deps.buildTodayStudyPlan,
    saveState: deps.saveState,
    renderTodayPlan: deps.renderTodayPlan,
    renderTodoDock: todoDockController.render,
    setText: deps.setText,
    makeId: deps.makeId,
    localDateKey: deps.localDateKey,
    formatCategoryLabel: deps.formatCategoryLabel,
    skillDefs: deps.skillDefs,
    openProblemTask(query) {
      deps.openModule?.("problems");
      if (deps.elements.problemSearch) {
        deps.elements.problemSearch.value = query;
        deps.renderProblems?.();
      }
    },
    openModule: deps.openModule,
    openInterviewTask(action, query) {
      if (deps.elements.interviewTypeSelect) {
        deps.elements.interviewTypeSelect.value = action === "interview-behavioral" ? "behavioral" : "technical";
      }
      const interviewRuntimeState = deps.getInterviewRuntimeState?.();
      if (interviewRuntimeState) {
        interviewRuntimeState.selectedCategories = query && deps.skillDefs?.[query] ? new Set([query]) : new Set(["all"]);
      }
      deps.resetInterview?.({ keepSetup: true });
      deps.renderInterviewSetup?.();
      deps.openModule?.("interview");
    },
    escapeHtml: deps.escapeHtml,
    escapeAttribute: deps.escapeAttribute,
    t: deps.t,
    refreshIcons: deps.refreshIcons
  });

  return {
    getTodoDockPlan: todoDockController.getPlan,
    renderTodoDock: todoDockController.render,
    toggleTodoDock: todoDockController.toggleOpen,
    closeTodoDock: todoDockController.close,
    handleTodoDockClick: todoDockController.handleClick,
    handleTodoDockEdit: todoDockController.handleEdit,
    addTodoTask: todoDockController.addTask,
    createPrepPlan: prepPlanController.create,
    renderPrepPlan: prepPlanController.render,
    updatePrepTaskIndicator: prepPlanController.updateTaskIndicator,
    populatePrepPlanForm: prepPlanController.populateForm,
    getPrepStageIndex: prepPlanController.getStageIndex,
    getPrepPaceText: prepPlanController.getPaceText,
    weeksUntilDate: prepPlanController.weeksUntilDate,
    getPrepFocusSkills: prepPlanController.getFocusSkills,
    getPrepDailyTasks: prepPlanController.getDailyTasks,
    renderPrepTaskMarkup: prepPlanController.renderTaskMarkup,
    renderPrepDiagnosticMarkup: prepPlanController.renderDiagnosticMarkup,
    handlePrepPlanAction: prepPlanController.handleAction,
    togglePrepTask: prepPlanController.toggleTask,
    submitPrepDiagnostic: prepPlanController.submitDiagnostic,
    openPrepTask: prepPlanController.openTask,
    editPrepPlan: prepPlanController.openEditor
  };
}
