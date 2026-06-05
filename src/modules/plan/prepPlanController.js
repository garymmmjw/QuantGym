import {
  prepDiagnosticQuestions,
  prepRoleDefs,
  prepSeasonDefs
} from '../../prep-data.js';
import {
  getPrepDailyTasks,
  getPrepFocusSkills,
  getPrepPaceText,
  getPrepStageIndex,
  normalizePrepPlan,
  weeksUntilDate
} from './data.js';
import {
  completePrepDiagnostic,
  setPrepDiagnosticStatus
} from './diagnostic.js';
import {
  renderPrepDiagnosticMarkup,
  renderPrepPlanDashboard,
  renderPrepTaskMarkup
} from './prepView.js';
import { buildPrepPlanFromForm } from './setup.js';
import {
  applyCreatedPrepPlan,
  applyPlanUpdateResult,
  createPrepPlanEditorState
} from './state.js';
import { togglePrepTaskCompletion } from './todo.js';

export function createPrepPlanController(deps = {}) {
  const {
    elements,
    getState,
    buildTodayStudyPlan,
    saveState,
    renderTodayPlan,
    renderTodoDock,
    setText,
    makeId,
    localDateKey,
    formatCategoryLabel,
    skillDefs,
    openProblemTask,
    openModule,
    openInterviewTask,
    escapeHtml,
    escapeAttribute,
    t,
    refreshIcons
  } = deps;
  const editorState = createPrepPlanEditorState(false);

  function getPlan() {
    return normalizePrepPlan(getState().prepPlan, {
      makeId,
      localDateKey
    });
  }

  function applyResult(result, options = {}) {
    if (!applyPlanUpdateResult(getState(), result, {
      buildTodayStudyPlan,
      ...options
    }).changed) {
      return false;
    }
    saveState();
    render();
    renderTodayPlan();
    renderTodoDock();
    return true;
  }

  function create() {
    const form = elements.prepPlanSetupForm;
    if (!form) return;
    const prepPlan = buildPrepPlanFromForm({
      form,
      previousPrepPlan: getState().prepPlan,
      makeId,
      localDateKey
    });
    if (!prepPlan) return;
    applyCreatedPrepPlan(getState(), prepPlan, {
      buildTodayStudyPlan
    });
    editorState.close();
    saveState();
    render();
    renderTodayPlan();
    renderTodoDock();
    refreshIcons();
  }

  function populateForm(plan) {
    if (!elements.prepPlanSetupForm) return;
    [["prepTrack", plan.track], ["prepSeason", plan.season], ["prepDiagnostic", plan.diagnosticStatus === "skipped" ? "skip" : "take"]]
      .forEach(([name, value]) => {
        const input = elements.prepPlanSetupForm.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input) input.checked = true;
      });
    elements.prepRoleSelect.value = plan.role;
    elements.prepHoursSelect.value = String(plan.weeklyHours);
  }

  function updateTaskIndicator() {
    const plan = getPlan();
    if (!plan) {
      setText(".sidebar-helper span", t("tasksWaiting"));
      renderTodoDock();
      return;
    }
    const pending = getDailyTasks(plan).filter((task) => !task.done).length;
    const label = t("prepTasksWaiting").replace("{count}", String(pending));
    setText(".sidebar-helper span", label);
    renderTodoDock();
  }

  function render() {
    if (!elements.prepPlanSetupForm || !elements.prepPlanDashboard) return;
    const plan = getPlan();
    const showSetup = !plan || editorState.isOpen();
    elements.prepPlanSetupForm.classList.toggle("hidden", !showSetup);
    elements.prepPlanDashboard.classList.toggle("hidden", !plan || showSetup);
    elements.editPrepPlanBtn?.classList.toggle("hidden", !plan || showSetup);
    updateTaskIndicator();
    renderTodoDock();

    if (plan && showSetup) populateForm(plan);
    if (!plan || showSetup) return;

    const role = prepRoleDefs[plan.role];
    const season = prepSeasonDefs[plan.season];
    renderPrepPlanDashboard(elements.prepPlanDashboard, plan, {
      escapeHtml,
      escapeAttribute,
      t,
      role,
      season,
      tasks: getDailyTasks(plan),
      stageIndex: getPrepStageIndex(plan),
      paceText: getPrepPaceText(plan),
      diagnosticQuestionCount: prepDiagnosticQuestions.length,
      renderTask: renderTaskMarkup,
      renderDiagnostic: renderDiagnosticMarkup,
      refreshIcons
    });
  }

  function getDailyTasks(plan) {
    return getPrepDailyTasks(plan, {
      localDateKey,
      formatCategoryLabel
    });
  }

  function renderTaskMarkup(task) {
    return renderPrepTaskMarkup(task, { escapeHtml });
  }

  function renderDiagnosticMarkup(plan) {
    return renderPrepDiagnosticMarkup(plan, {
      escapeHtml,
      questions: prepDiagnosticQuestions,
      skillDefs,
      formatCategoryLabel
    });
  }

  function startDiagnostic(status, options = {}) {
    const result = setPrepDiagnosticStatus({
      prepPlan: getState().prepPlan,
      status,
      makeId,
      localDateKey
    });
    return applyResult(result, options);
  }

  function handleAction(event) {
    const toggle = event.target.closest("[data-prep-toggle-task]");
    if (toggle) {
      toggleTask(toggle.dataset.prepToggleTask);
      return;
    }
    if (event.target.closest("[data-prep-start-test]")) {
      startDiagnostic("pending");
      return;
    }
    if (event.target.closest("[data-prep-skip-test]")) {
      startDiagnostic("skipped", { rebuildStudyPlan: true });
      return;
    }
    const open = event.target.closest("[data-prep-open]");
    if (open) openTask(open.dataset.prepOpen, open.dataset.prepQuery || "");
  }

  function toggleTask(taskId) {
    const result = togglePrepTaskCompletion({
      prepPlan: getState().prepPlan,
      taskId,
      makeId,
      localDateKey
    });
    applyResult(result, { rebuildStudyPlan: true });
  }

  function submitDiagnostic(form) {
    const result = completePrepDiagnostic({
      prepPlan: getState().prepPlan,
      answers: new FormData(form),
      makeId,
      localDateKey
    });
    if (!result.changed) {
      if (!result.missingCount) return;
      const message = form.querySelector("#prepDiagnosticMessage");
      if (message) message.textContent = `还有 ${result.missingCount} 题未作答。`;
      return;
    }
    applyResult(result, { rebuildStudyPlan: true });
  }

  function openTask(action, query = "") {
    if (action === "problems") {
      openProblemTask(query);
      return;
    }
    if (action === "tools" || action === "resume" || action === "jobs" || action === "experiences") {
      openModule(action);
      return;
    }
    if (action === "interview" || action === "interview-behavioral") {
      openInterviewTask(action, query);
    }
  }

  return {
    create,
    render,
    updateTaskIndicator,
    populateForm,
    getStageIndex: getPrepStageIndex,
    getPaceText: getPrepPaceText,
    weeksUntilDate,
    getFocusSkills: getPrepFocusSkills,
    getDailyTasks,
    renderTaskMarkup,
    renderDiagnosticMarkup,
    handleAction,
    toggleTask,
    submitDiagnostic,
    openTask,
    openEditor() {
      editorState.open();
      render();
    }
  };
}
