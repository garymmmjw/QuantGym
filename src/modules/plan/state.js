export function createPrepPlanEditorState(initialOpen = false) {
  let open = Boolean(initialOpen);
  return {
    isOpen() {
      return open;
    },
    setOpen(value) {
      open = Boolean(value);
      return open;
    },
    open() {
      open = true;
      return open;
    },
    close() {
      open = false;
      return open;
    }
  };
}

export function applyCreatedPrepPlan(state = {}, prepPlan = null, options = {}) {
  if (!prepPlan) return { changed: false };
  state.prepPlan = prepPlan;
  state.studyPlan = options.buildTodayStudyPlan?.() || state.studyPlan;
  return { changed: true };
}

export function applyPlanUpdateResult(state = {}, result = {}, options = {}) {
  if (!result?.changed) return { changed: false };
  const rebuildStudyPlan = Boolean(options.rebuildStudyPlan);
  if ("prepPlan" in result) state.prepPlan = result.prepPlan;
  if (result.mode === "prep" || rebuildStudyPlan) {
    state.studyPlan = options.buildTodayStudyPlan?.() || state.studyPlan;
  } else if ("studyPlan" in result) {
    state.studyPlan = result.studyPlan;
  }
  return { changed: true };
}
