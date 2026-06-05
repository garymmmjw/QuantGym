import {
  clearInterviewSessionSnapshot,
  createRunningInterviewSession
} from './session.js';
import { getInterviewTimeUpMessage } from './timer.js';

export function createInterviewSessionFlowController(deps) {
  const {
    elements,
    windowRef,
    sessionStorageKey,
    getInterviewState,
    getRuntimeState,
    resetSessionUiState,
    clearTimers,
    clearQuestionTimer,
    setPrepTimer,
    clearPrepTimer,
    setQuestionTimer,
    stopSpeech,
    renderSetup,
    updateAnswerFileMeta,
    updateStatus,
    renderTranscript,
    renderQuestionPanel,
    normalizeSessionConfig,
    getTypeForConfig,
    getQuestionCountForConfig,
    getQuestionSecondsForConfig,
    formatConfigSummary,
    buildPdfQuestions,
    buildFullRangeQuestions,
    appendMessage,
    persistSnapshot,
    setTimer,
    getMaxFollowups,
    formatQuestion,
    completeInterview,
    autoSizeAnswer,
    syncLanguageControls,
    handleOnboardingAnswer,
    isLive
  } = deps;

  const getState = () => getInterviewState();
  const getRuntime = () => getRuntimeState();

  function handleTranscriptAction(event) {
    const button = event.target.closest("[data-interview-action-value]");
    if (!button || button.disabled) return;
    const value = button.dataset.interviewActionValue || button.textContent || "";
    handleOnboardingAnswer(value);
  }

  function reset(options = {}) {
    const state = getState();
    clearTimers();
    stopSpeech();
    state.session = null;
    state.messages = [];
    resetSessionUiState();
    clearInterviewSessionSnapshot(sessionStorageKey);
    if (!options.keepSetup) renderSetup();
    if (elements.interviewAnswer) elements.interviewAnswer.value = "";
    if (elements.interviewAnswerFile) elements.interviewAnswerFile.value = "";
    updateAnswerFileMeta();
    updateStatus();
    renderTranscript();
    renderQuestionPanel();
  }

  async function finalizeOnboarding() {
    const state = getState();
    const runtime = getRuntime();
    if (!state.session) return;
    const config = normalizeSessionConfig(state.session.sessionConfig || {});
    state.session.sessionConfig = config;
    state.session.mode = config.mode;
    state.session.type = getTypeForConfig(config);
    state.session.source = config.source;
    runtime.preparing = true;
    updateStatus("loading");
    appendMessage("coach", formatConfigSummary(config));

    try {
      const count = getQuestionCountForConfig(config);
      const questions = config.source === "pdf"
        ? await buildPdfQuestions(count, state.session.type)
        : buildFullRangeQuestions(count, state.session.type, config);

      if (!questions.length) {
        appendMessage("system", state.language === "zh"
          ? "没有可用题目。请先添加题库，或切换到 PDF 生成题目。"
          : "No questions available. Add problems first or switch to PDF generation.");
        runtime.preparing = false;
        updateStatus("onboarding");
        return;
      }

      state.session = createRunningInterviewSession({
        baseSession: state.session,
        config,
        mode: config.mode,
        type: state.session.type,
        source: config.source,
        questionSeconds: getQuestionSecondsForConfig(config, count),
        questions,
        startedAt: state.session.startedAt || new Date().toISOString()
      });
      runtime.preparing = false;

      appendMessage("coach", state.language === "zh"
        ? "设置完成。我会按这个配置开始第一题。"
        : "Configuration is set. I will start with the first question.");
      startPrepCountdown(2);
    } catch (error) {
      appendMessage("system", state.language === "zh"
        ? `准备模拟面试失败：${error.message || "请检查 LLM 代理是否启动。"}`
        : `Failed to prepare interview: ${error.message || "Check the LLM proxy."}`);
      runtime.preparing = false;
      updateStatus("onboarding");
    } finally {
      persistSnapshot();
    }
  }

  function startPrepCountdown(seconds) {
    let remaining = seconds;
    setTimer(remaining);
    updateStatus("preparing");
    setPrepTimer(windowRef.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearPrepTimer();
        showQuestion(0);
        return;
      }
      setTimer(remaining);
    }, 1000));
  }

  function showQuestion(index) {
    const state = getState();
    const runtime = getRuntime();
    if (!state.session || index >= state.session.questions.length) {
      completeInterview();
      return;
    }
    clearQuestionTimer();
    const problem = state.session.questions[index];
    state.session.currentIndex = index;
    state.session.currentProblem = problem;
    state.session.awaitingNext = false;
    state.session.answeredCurrent = false;
    state.session.remainingSeconds = state.session.questionSeconds;
    state.session.questionConversations = state.session.questionConversations || [];
    state.session.questionConversations[index] = {
      turns: [],
      followupCount: 0,
      maxFollowups: getMaxFollowups(problem),
      interviewerSatisfied: false,
      status: "answering"
    };
    runtime.panelExpandedIndex = index;
    if (elements.interviewAnswer) elements.interviewAnswer.value = "";
    if (elements.interviewAnswerFile) elements.interviewAnswerFile.value = "";
    updateAnswerFileMeta();
    autoSizeAnswer();

    const isFirstQuestion = index === 0;
    const totalQuestions = state.session.questions.length;
    const transition = state.language === "zh"
      ? (isFirstQuestion ? `我们开始吧，第 1 题（共 ${totalQuestions} 题）。` : "好，看下一题。")
      : (isFirstQuestion ? `Let's begin — question 1 of ${totalQuestions}.` : "Alright, here is the next question.");
    appendMessage("coach", transition);
    state.session.currentQuestionMessageId = appendMessage("system", formatQuestion(problem, index), { typewriter: false });
    const opening = isLive()
      ? (state.language === "zh"
        ? "请开始作答。你可以先讲思路，我会根据你的回答继续追问。"
        : "Start your answer. Walk me through your thinking; I will ask follow-ups from there.")
      : (state.language === "zh"
        ? "请开始作答。可以先讲思路，再给结论。需要提示时点 Hint。"
        : "Start your answer. Explain your approach first, then give the conclusion. Use Hint if needed.");
    appendMessage("coach", opening);
    updateStatus("active");
    setTimer(state.session.remainingSeconds);
    setQuestionTimer(windowRef.setInterval(() => {
      if (!state.session || state.session.completed) return;
      state.session.remainingSeconds -= 1;
      setTimer(state.session.remainingSeconds);
      if (state.session.remainingSeconds <= 0) {
        clearQuestionTimer();
        appendMessage("coach", getInterviewTimeUpMessage({
          language: state.language,
          live: isLive()
        }));
        updateStatus("timeup");
      }
    }, 1000));
    renderQuestionPanel();
    persistSnapshot();
    elements.interviewAnswer?.focus();
  }

  async function restartWithSameConfig() {
    const state = getState();
    const runtime = getRuntime();
    const config = normalizeSessionConfig(state.session?.sessionConfig || {});
    clearTimers();
    stopSpeech();
    state.messages = [];
    runtime.panelExpandedIndex = 0;
    state.language = config.language === "en" ? "en" : "zh";
    syncLanguageControls();
    const type = getTypeForConfig(config);
    state.session = createRunningInterviewSession({
      config,
      mode: config.mode,
      type,
      source: config.source
    });
    runtime.preparing = true;
    updateStatus("loading");
    renderTranscript();
    try {
      const count = getQuestionCountForConfig(config);
      const questions = config.source === "pdf"
        ? await buildPdfQuestions(count, type)
        : buildFullRangeQuestions(count, type, config);
      if (!questions.length) {
        appendMessage("system", state.language === "zh"
          ? "没有可用题目，请调整设置后重试。"
          : "No questions available. Adjust settings and retry.");
        runtime.preparing = false;
        updateStatus("onboarding");
        return;
      }
      state.session = { ...state.session, questionSeconds: getQuestionSecondsForConfig(config, count), questions };
      runtime.preparing = false;
      appendMessage("coach", state.language === "zh"
        ? "好，用同样的设置再来一场。"
        : "Same setup — let's go again.");
      startPrepCountdown(2);
    } catch (error) {
      appendMessage("system", state.language === "zh"
        ? `重新开始失败：${error.message || "请检查 LLM 代理。"}`
        : `Restart failed: ${error.message || "Check the LLM proxy."}`);
      runtime.preparing = false;
      updateStatus("onboarding");
    } finally {
      persistSnapshot();
    }
  }

  return {
    handleTranscriptAction,
    reset,
    finalizeOnboarding,
    startPrepCountdown,
    showQuestion,
    restartWithSameConfig
  };
}
