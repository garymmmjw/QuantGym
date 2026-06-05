export function getInterviewStatusViewModel(options = {}) {
  const {
    session = null,
    status = "",
    language = "zh",
    typeDefs = {},
    onboarding = false
  } = options;
  const useZh = language !== "en";
  if (!session) {
    return {
      title: "Ready",
      questionStatus: useZh ? "还没有开始。" : "Not started.",
      timerText: "--:--"
    };
  }

  const modeLabel = session.mode === "live"
    ? (useZh ? "真实面试" : "Live mock")
    : (useZh ? "训练练习" : "Practice");
  const typeLabel = typeDefs[session.type]?.label || "Interview";
  const title = onboarding
    ? (useZh ? "AI 面试官配置" : "AI interviewer setup")
    : `${modeLabel} · ${typeLabel}`;

  if (status === "loading") {
    return {
      title,
      questionStatus: useZh ? "正在准备题目..." : "Preparing questions...",
      timerText: null
    };
  }
  if (status === "onboarding") {
    return {
      title,
      questionStatus: useZh ? "正在通过对话配置本场面试。" : "Configuring this interview through chat.",
      timerText: "--:--"
    };
  }
  if (status === "preparing") {
    return {
      title,
      questionStatus: useZh ? "题目已准备。" : "Questions are ready.",
      timerText: null
    };
  }
  if (status === "timeup") {
    return {
      title,
      questionStatus: useZh ? "本题时间到。" : "Time is up.",
      timerText: null
    };
  }
  if (status === "awaitingNext") {
    return {
      title,
      questionStatus: useZh ? "本题收尾，可以进入下一题。" : "This question is wrapped. Ready for the next one.",
      timerText: null
    };
  }
  if (status === "completed") {
    return {
      title,
      questionStatus: useZh ? "模拟面试已结束。" : "Mock interview complete.",
      timerText: "Done"
    };
  }

  return {
    title,
    questionStatus: session.currentIndex >= 0
      ? `Q${session.currentIndex + 1}/${session.questions?.length || 0}`
      : (useZh ? "准备开始。" : "Ready to start."),
    timerText: null
  };
}

export function renderInterviewStatus(elements = {}, viewModel = {}) {
  if (!elements.interviewSessionTitle || !elements.interviewQuestionStatus || !elements.interviewTimer) {
    return false;
  }
  elements.interviewSessionTitle.textContent = viewModel.title || "";
  elements.interviewQuestionStatus.textContent = viewModel.questionStatus || "";
  if (viewModel.timerText != null) elements.interviewTimer.textContent = viewModel.timerText;
  return true;
}
