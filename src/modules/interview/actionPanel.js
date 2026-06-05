export function getInterviewActionPanelViewModel(options = {}) {
  const {
    session = null,
    onboarding = false,
    live = false,
    language = "zh"
  } = options;
  const useZh = language !== "en";
  const completed = Boolean(session?.completed);
  const currentIndex = Number(session?.currentIndex ?? -1);
  const questionCount = Array.isArray(session?.questions) ? session.questions.length : 0;
  const hasCompletedQuestion = Boolean(session && currentIndex >= 0 && session.answeredCurrent);
  const hasNext = Boolean(
    session
    && session.awaitingNext
    && currentIndex < questionCount - 1
  );
  const showPanelToggle = Boolean(session && questionCount && !onboarding);

  return {
    completeActionsHidden: onboarding || (!hasCompletedQuestion && !completed),
    nextHidden: completed,
    saveHidden: completed,
    shareHidden: completed,
    restartHidden: !completed,
    exportHidden: !completed,
    showPanelToggle,
    nextDisabled: !hasNext,
    saveDisabled: !hasCompletedQuestion,
    shareDisabled: !hasCompletedQuestion,
    hintHidden: onboarding || live || completed,
    revealHidden: onboarding || live || completed,
    answerFileRowHidden: onboarding || completed,
    voiceHidden: onboarding || completed,
    answerDisabled: completed || Boolean(session?.submitting),
    answerPlaceholder: onboarding
      ? (useZh ? "输入你的选择，或点上方按钮…" : "Type your choice…")
      : (useZh ? "输入你的回答…" : "Type your answer…")
  };
}

export function renderInterviewActionPanel(elements = {}, viewModel = {}) {
  if (!elements.interviewCompleteActions) return false;

  elements.interviewCompleteActions.classList.toggle("hidden", viewModel.completeActionsHidden);

  elements.nextInterviewQuestionBtn?.classList.toggle("hidden", viewModel.nextHidden);
  elements.saveInterviewFavoriteBtn?.classList.toggle("hidden", viewModel.saveHidden);
  elements.shareInterviewQuestionBtn?.classList.toggle("hidden", viewModel.shareHidden);
  elements.restartInterviewBtn?.classList.toggle("hidden", viewModel.restartHidden);
  elements.exportInterviewReportBtn?.classList.toggle("hidden", viewModel.exportHidden);

  elements.toggleInterviewPanelBtn?.classList.toggle("hidden", !viewModel.showPanelToggle);
  if (!viewModel.showPanelToggle) {
    elements.interviewConsole?.classList.remove("show-panel");
    elements.toggleInterviewPanelBtn?.classList.remove("is-active");
    elements.toggleInterviewPanelBtn?.setAttribute("aria-pressed", "false");
  }

  if (elements.nextInterviewQuestionBtn) elements.nextInterviewQuestionBtn.disabled = viewModel.nextDisabled;
  if (elements.saveInterviewFavoriteBtn) elements.saveInterviewFavoriteBtn.disabled = viewModel.saveDisabled;
  if (elements.shareInterviewQuestionBtn) elements.shareInterviewQuestionBtn.disabled = viewModel.shareDisabled;
  elements.hintInterviewBtn?.classList.toggle("hidden", viewModel.hintHidden);
  elements.revealAnswerBtn?.classList.toggle("hidden", viewModel.revealHidden);
  elements.interviewAnswerFileRow?.classList.toggle("hidden", viewModel.answerFileRowHidden);
  elements.voiceAnswerBtn?.classList.toggle("hidden", viewModel.voiceHidden);
  if (elements.interviewAnswer) {
    elements.interviewAnswer.disabled = viewModel.answerDisabled;
    elements.interviewAnswer.placeholder = viewModel.answerPlaceholder;
  }

  return true;
}
