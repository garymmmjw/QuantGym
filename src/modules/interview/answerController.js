import {
  isBinaryInterviewAttachment,
  readFilePayload
} from '../../lib/files.js';

export function createInterviewAnswerController(deps = {}) {
  const elements = deps.elements || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));

  function getState() {
    return getInterviewState();
  }

  function getLanguage() {
    return getState().language === "en" ? "en" : "zh";
  }

  function formatAttachmentLabel(attachment) {
    return attachment ? `[${getLanguage() === "zh" ? "上传附件" : "Attachment"}: ${attachment.name}]` : "";
  }

  function clearAnswerInputs() {
    if (elements.interviewAnswer) elements.interviewAnswer.value = "";
    if (elements.interviewAnswerFile) elements.interviewAnswerFile.value = "";
    deps.updateAnswerFileMeta?.();
    deps.autoSizeAnswer?.();
  }

  function markAwaitingNextOrComplete() {
    const state = getState();
    const session = state.session;
    const isLast = session.currentIndex >= session.questions.length - 1;
    if (isLast) {
      deps.completeInterview?.();
    } else {
      session.awaitingNext = true;
      deps.updateStatus?.("awaitingNext");
    }
  }

  async function submit() {
    if (deps.isOnboarding?.()) {
      const value = elements.interviewAnswer?.value.trim() || "";
      if (!value) {
        elements.interviewAnswer?.focus();
        return;
      }
      elements.interviewAnswer.value = "";
      deps.autoSizeAnswer?.();
      await deps.handleOnboardingAnswer?.(value);
      return;
    }

    const state = getState();
    const problem = deps.getSelectedProblem?.();
    if (!state.session || state.session.currentIndex < 0 || !problem) {
      deps.appendMessage?.("system", getLanguage() === "zh" ? "请先点击开始模拟。" : "Start the mock interview first.");
      return;
    }

    const answerPayload = await collect();
    if (!answerPayload.text && !answerPayload.attachment) {
      elements.interviewAnswer?.focus();
      return;
    }

    if (deps.isLive?.()) {
      await submitLiveTurn(problem, answerPayload);
      return;
    }

    await submitPractice(problem, answerPayload);
  }

  async function submitPractice(problem, answerPayload) {
    const state = getState();
    deps.clearQuestionTimer?.();
    const displayAnswer = [
      answerPayload.text || "",
      formatAttachmentLabel(answerPayload.attachment)
    ].filter(Boolean).join("\n");
    deps.appendMessage?.("user", displayAnswer, {
      typewriter: false,
      attachments: answerPayload.attachment ? [answerPayload.attachment] : []
    });
    clearAnswerInputs();
    const thinkingId = deps.appendMessage?.("coach", "", { thinking: true });
    let feedback;

    try {
      const reply = await deps.requestFeedback?.(problem, answerPayload.text, answerPayload.attachment);
      feedback = deps.normalizeFeedback?.(reply, problem, answerPayload.text);
    } catch {
      feedback = deps.normalizeFeedback?.(
        deps.localFeedback?.(problem, answerPayload.text),
        problem,
        answerPayload.text
      );
    }
    deps.updateMessage?.(thinkingId, feedback.text);

    deps.recordPractice?.(problem, feedback);
    state.session.answeredCurrent = true;
    deps.persistSnapshot?.();
    deps.renderQuestionPanel?.();
    markAwaitingNextOrComplete();
  }

  async function submitLiveTurn(problem, answerPayload) {
    const state = getState();
    if (state.session.submitting) return;
    state.session.submitting = true;
    const conversation = deps.getCurrentConversation?.();
    conversation.status = "followup";
    const displayAnswer = [
      answerPayload.text || "",
      formatAttachmentLabel(answerPayload.attachment)
    ].filter(Boolean).join("\n");
    deps.appendMessage?.("user", displayAnswer, {
      typewriter: false,
      attachments: answerPayload.attachment ? [answerPayload.attachment] : []
    });
    conversation.turns.push({
      role: "user",
      text: answerPayload.text || "",
      attachment: deps.summarizeAttachment?.(answerPayload.attachment)
    });
    clearAnswerInputs();
    deps.updateActionPanel?.();
    const thinkingId = deps.appendMessage?.("coach", "", { thinking: true });

    try {
      const reply = await deps.requestConverse?.(problem, answerPayload, conversation);
      const normalized = deps.normalizeConverseReply?.(reply, problem, conversation);
      applyLiveCoachReply({
        problem,
        conversation,
        thinkingId,
        normalized,
        typewriter: true
      });
    } catch {
      const fallback = deps.normalizeConverseReply?.(deps.localConverse?.(problem, conversation), problem, conversation);
      applyLiveCoachReply({
        problem,
        conversation,
        thinkingId,
        normalized: fallback,
        typewriter: true
      });
    } finally {
      state.session.submitting = false;
      deps.renderQuestionPanel?.();
      deps.updateActionPanel?.();
      deps.persistSnapshot?.();
    }
  }

  function applyLiveCoachReply(options = {}) {
    const state = getState();
    const { problem, conversation, thinkingId, normalized, typewriter = false } = options;
    conversation.turns.push({ role: "coach", text: normalized.message });
    if (normalized.coverage) conversation.coverage = normalized.coverage;
    if (normalized.missing) conversation.missing = normalized.missing;
    if (normalized.runningAssessment) conversation.runningAssessment = normalized.runningAssessment;
    conversation.followupCount += normalized.action === "followup" ? 1 : 0;
    const shouldWrap = normalized.action === "wrap"
      || (normalized.action === "followup" && conversation.followupCount > conversation.maxFollowups);
    conversation.status = shouldWrap ? "wrapped" : "followup";
    conversation.interviewerSatisfied = shouldWrap;
    deps.updateMessage?.(thinkingId, normalized.message, { typewriter });

    if (shouldWrap) {
      deps.clearQuestionTimer?.();
      state.session.answeredCurrent = true;
      deps.recordLiveQuestionResult?.(problem, conversation);
      markAwaitingNextOrComplete();
    } else {
      deps.updateStatus?.("active");
    }
  }

  async function collect() {
    const text = elements.interviewAnswer?.value.trim() || "";
    const file = elements.interviewAnswerFile?.files?.[0];
    if (!file) return { text, attachment: null };
    const attachment = await readFilePayload(file, { preferDataUrl: isBinaryInterviewAttachment(file) });
    return { text, attachment };
  }

  async function requestHint() {
    if (deps.isLive?.() || deps.isOnboarding?.()) {
      deps.appendMessage?.("system", getLanguage() === "zh"
        ? "真实面试模式中不会提供 Hint。"
        : "Hints are not available during live mock mode.");
      return;
    }
    const problem = deps.getSelectedProblem?.();
    if (!problem) return;
    const thinkingId = deps.appendMessage?.("coach", getLanguage() === "zh" ? "生成 hint 中..." : "Generating hint...");
    try {
      const hint = await deps.requestHintFromApi?.(problem, elements.interviewAnswer?.value.trim() || "");
      deps.updateMessage?.(thinkingId, hint, { typewriter: true });
    } catch {
      deps.updateMessage?.(thinkingId, deps.localHint?.(problem), { typewriter: true });
    }
  }

  return {
    collect,
    requestHint,
    submit,
    submitLiveTurn,
    submitPractice
  };
}
