export function createInterviewRuntime(deps = {}) {
  const windowRef = deps.windowRef || globalThis.window || globalThis;
  const state = {
    language: "zh",
    messages: [],
    session: null,
    preparing: false,
    panelExpandedIndex: 0,
    selectedProblemId: "",
    selectedCategories: new Set(["all"])
  };
  let prepTimer = null;
  let questionTimer = null;
  let voiceRecognition = null;
  const typingTimers = new Map();
  let snapshotRestored = false;

  function clearIntervalRef(timer) {
    if (timer) windowRef.clearInterval?.(timer);
  }

  function clearPrepTimer() {
    clearIntervalRef(prepTimer);
    prepTimer = null;
  }

  function setPrepTimer(timer) {
    clearPrepTimer();
    prepTimer = timer || null;
    return prepTimer;
  }

  function clearQuestionTimer() {
    clearIntervalRef(questionTimer);
    questionTimer = null;
  }

  function setQuestionTimer(timer) {
    clearQuestionTimer();
    questionTimer = timer || null;
    return questionTimer;
  }

  function clearTypingTimers() {
    for (const timer of typingTimers.values()) {
      clearIntervalRef(timer);
    }
    typingTimers.clear();
  }

  function setTypingTimer(id, timer) {
    if (!id) return null;
    const existing = typingTimers.get(id);
    clearIntervalRef(existing);
    typingTimers.set(id, timer);
    return timer;
  }

  function clearTypingTimer(id) {
    const timer = typingTimers.get(id);
    if (!timer) return false;
    clearIntervalRef(timer);
    typingTimers.delete(id);
    return true;
  }

  return {
    state,
    resetSessionUiState() {
      state.preparing = false;
      state.panelExpandedIndex = 0;
    },
    clearTimers() {
      clearPrepTimer();
      clearQuestionTimer();
      clearTypingTimers();
    },
    clearPrepTimer,
    setPrepTimer,
    clearQuestionTimer,
    setQuestionTimer,
    clearTypingTimers,
    setTypingTimer,
    clearTypingTimer,
    getVoiceRecognition() {
      return voiceRecognition;
    },
    setVoiceRecognition(recognition) {
      voiceRecognition = recognition || null;
      return voiceRecognition;
    },
    hasRestoredSnapshot() {
      return snapshotRestored;
    },
    setSnapshotRestored(value) {
      snapshotRestored = Boolean(value);
    }
  };
}
