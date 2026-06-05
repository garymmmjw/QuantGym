import { applyPlanUpdateResult } from './state.js';
import {
  addTodoTaskToPlans,
  buildTodoDockPlan,
  toggleStudyTodoTask,
  updateTodoTaskInPlans
} from './todo.js';
import {
  createTodoDockOpenState,
  renderTodoDock as renderTodoDockView
} from './todoDock.js';
import { normalizePrepPlan } from './data.js';

export function createTodoDockController(deps = {}) {
  const {
    elements,
    documentRef,
    getState,
    buildPrepTodayPlan,
    fallbackSummary,
    makeId,
    localDateKey,
    saveState,
    renderPrepPlan,
    renderTodayPlan,
    togglePrepTask,
    t,
    refreshIcons
  } = deps;
  const openState = createTodoDockOpenState(false);

  function getPlan() {
    const state = getState();
    return buildTodoDockPlan({
      prepPlan: state.prepPlan,
      studyPlan: state.studyPlan,
      buildPrepTodayPlan,
      fallbackSummary: fallbackSummary(),
      makeId,
      localDateKey
    });
  }

  function render() {
    renderTodoDockView(elements, getPlan(), {
      documentRef,
      open: openState.isOpen(),
      t,
      refreshIcons
    });
  }

  function applyResult(result, options = {}) {
    const state = getState();
    const { renderPrep = true, ...planOptions } = options;
    if (!applyPlanUpdateResult(state, result, {
      buildTodayStudyPlan: buildPrepTodayPlan,
      ...planOptions
    }).changed) {
      return false;
    }
    saveState();
    if (renderPrep) renderPrepPlan();
    renderTodayPlan();
    render();
    return true;
  }

  function addTask() {
    const title = String(elements.todoDockAddInput?.value || "").trim();
    if (!title) return;
    const state = getState();
    const changed = applyResult(addTodoTaskToPlans({
      title,
      prepPlan: state.prepPlan,
      studyPlan: state.studyPlan,
      makeId,
      localDateKey,
      fallbackSummary: fallbackSummary()
    }));
    if (changed && elements.todoDockAddInput) elements.todoDockAddInput.value = "";
  }

  function toggleTask(taskId) {
    if (!taskId) return;
    const state = getState();
    if (normalizePrepPlan(state.prepPlan, { makeId, localDateKey })) {
      togglePrepTask(taskId);
      return;
    }
    applyResult(toggleStudyTodoTask({
      studyPlan: state.studyPlan,
      taskId,
      makeId
    }), { renderPrep: false });
  }

  function updateTask(taskId, field, rawValue) {
    const state = getState();
    applyResult(updateTodoTaskInPlans({
      prepPlan: state.prepPlan,
      studyPlan: state.studyPlan,
      taskId,
      field,
      rawValue,
      makeId,
      localDateKey
    }));
  }

  return {
    getPlan,
    render,
    toggleOpen() {
      openState.toggle();
      render();
    },
    close() {
      openState.setOpen(false);
      render();
    },
    handleClick(event) {
      const toggle = event.target.closest("[data-todo-toggle]");
      if (!toggle) return;
      toggleTask(toggle.dataset.todoToggle);
    },
    handleEdit(event) {
      const field = event.target.dataset.todoField;
      const taskId = event.target.dataset.todoId;
      if (!field || !taskId) return;
      updateTask(taskId, field, event.target.value);
    },
    addTask,
    toggleTask,
    updateTask
  };
}
