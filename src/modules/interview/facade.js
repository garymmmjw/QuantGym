export function createInterviewFacade(deps = {}) {
  const getFlowController = () => deps.getSessionFlowController?.() || null;
  const getAnswerController = () => deps.getAnswerController?.() || null;

  return {
    handleTranscriptAction(event) {
      return getFlowController()?.handleTranscriptAction(event);
    },
    reset(options = {}) {
      return getFlowController()?.reset(options);
    },
    async finalizeOnboarding() {
      return getFlowController()?.finalizeOnboarding();
    },
    showQuestion(index) {
      return getFlowController()?.showQuestion(index);
    },
    async submitAnswer() {
      return getAnswerController()?.submit();
    },
    async requestHint() {
      return getAnswerController()?.requestHint();
    },
    async restartWithSameConfig() {
      return getFlowController()?.restartWithSameConfig();
    }
  };
}
