import {
  getInterviewTypeForConfig,
  normalizeInterviewSessionConfig
} from './config.js';
import {
  getInterviewOnboardingPrompt,
  getNextInterviewOnboardingStep,
  parseInterviewOnboardingAnswer
} from './onboarding.js';
import {
  getInterviewQuestionCountForConfig,
  getInterviewQuestionSecondsForConfig
} from './questionPool.js';
import {
  formatInterviewConfigSummary,
  syncInterviewLanguageControls
} from './setup.js';
import { createInterviewOnboardingSession } from './session.js';

export function createInterviewOnboardingController(deps = {}) {
  const elements = deps.elements || {};
  const documentRef = deps.documentRef || globalThis.document;
  const focusDefs = deps.focusDefs || {};
  const difficultyDefs = deps.difficultyDefs || {};
  const personaDefs = deps.personaDefs || {};
  const modeDefs = deps.modeDefs || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getRuntimeState = deps.getRuntimeState || (() => ({}));

  function isOnboarding() {
    return getInterviewState().session?.phase === "onboarding";
  }

  function isLiveMode() {
    const session = getInterviewState().session;
    return session?.mode === "live" || session?.sessionConfig?.mode === "live";
  }

  function isCurrentStep(step) {
    return Boolean(isOnboarding() && getInterviewState().session.onboardingStep === step);
  }

  function syncLanguageControls() {
    syncInterviewLanguageControls(documentRef, getInterviewState().language);
  }

  function createSession(options = {}) {
    return createInterviewOnboardingSession({
      ...options,
      fallbackLanguage: getInterviewState().language,
      source: deps.getSource?.()
    });
  }

  function getPrompt(step) {
    return getInterviewOnboardingPrompt(step, {
      uiLanguage: step === "language" ? deps.getAppLanguage?.() : getInterviewState().language
    });
  }

  function askStep(step) {
    const interviewState = getInterviewState();
    if (!interviewState.session) return;
    interviewState.session.onboardingStep = step;
    const prompt = getPrompt(step);
    deps.appendMessage?.("coach", prompt.text, {
      actions: prompt.actions,
      actionStep: step,
      typewriter: step !== "language"
    });
    deps.updateStatus?.("onboarding");
    deps.persistSnapshot?.();
  }

  function parseAnswer(step, value) {
    return parseInterviewOnboardingAnswer(step, value, {
      language: getInterviewState().language
    });
  }

  function applyAnswer(step, parsed = {}) {
    const interviewState = getInterviewState();
    if (!interviewState.session) return;
    const runtimeState = getRuntimeState();
    const config = interviewState.session.sessionConfig || {};
    if (step === "language") {
      interviewState.language = parsed.value;
      config.language = parsed.value;
      syncLanguageControls();
    } else if (step === "mode") {
      config.mode = parsed.value;
      interviewState.session.mode = parsed.value;
    } else if (step === "focus") {
      const focus = focusDefs[parsed.value] || focusDefs.mixed || {};
      config.focusKey = parsed.value;
      config.focusTags = [parsed.value, ...(focus.categories || [])];
      interviewState.session.type = focus.type || "technical";
      if (elements.interviewTypeSelect) elements.interviewTypeSelect.value = interviewState.session.type;
      runtimeState.selectedCategories = new Set(focus.categories?.length ? focus.categories : ["all"]);
    } else if (step === "difficulty") {
      config.difficulty = parsed.value;
    } else if (step === "scope") {
      config.questionCount = parsed.value?.questionCount || 0;
      config.durationMinutes = parsed.value?.durationMinutes || 0;
      if (config.questionCount && elements.interviewQuestionCount) elements.interviewQuestionCount.value = String(config.questionCount);
      if (config.durationMinutes && elements.interviewQuestionTime) elements.interviewQuestionTime.value = String(Math.max(3, Math.round(config.durationMinutes / 5)));
    } else if (step === "persona") {
      config.persona = parsed.value;
    } else if (step === "tts") {
      config.ttsEnabled = parsed.value;
    }
    interviewState.session.sessionConfig = config;
    deps.updateSetupVisibility?.();
    deps.renderQuestionPanel?.();
  }

  async function handleAnswer(value) {
    if (!isOnboarding()) return false;
    const step = getInterviewState().session.onboardingStep || "language";
    const parsed = parseAnswer(step, value);
    if (!parsed.ok) {
      deps.appendMessage?.("system", parsed.message, { typewriter: false });
      return true;
    }

    deps.appendMessage?.("user", parsed.label, { typewriter: false });
    applyAnswer(step, parsed);
    const nextStep = getNextStep(step);
    if (nextStep) {
      askStep(nextStep);
    } else {
      await deps.finalize?.();
    }
    return true;
  }

  async function start() {
    const interviewState = getInterviewState();
    deps.clearTimers?.();
    deps.stopSpeech?.();
    interviewState.messages = [];
    deps.resetSessionUiState?.();
    interviewState.language = deps.getSetupLanguage?.();
    syncLanguageControls();
    const mode = deps.getSetupMode?.();
    deps.updateLlmConfigFromControls?.();

    interviewState.session = createSession({ language: interviewState.language, mode });
    deps.updateStatus?.("onboarding");

    const useZh = interviewState.language !== "en";
    const modeLabel = useZh
      ? (modeDefs[mode]?.labelZh || "训练练习")
      : (modeDefs[mode]?.labelEn || "Practice");
    const langLabel = useZh ? "中文" : "English";
    deps.appendMessage?.("coach", useZh
      ? `好的，本场用${langLabel}进行${modeLabel}。下面我快速问你几个设置。`
      : `Great — this session is ${modeLabel} in ${langLabel}. Let me ask a few quick settings.`);
    askStep("focus");
    deps.persistSnapshot?.();
  }

  function getNextStep(step) {
    return getNextInterviewOnboardingStep(step);
  }

  function normalizeSessionConfig(raw = {}) {
    return normalizeInterviewSessionConfig(raw, {
      defaultQuestionCount: deps.getQuestionCount?.(),
      currentSource: deps.getSource?.()
    });
  }

  function getTypeForConfig(config = {}) {
    return getInterviewTypeForConfig(config, {
      fallbackType: deps.getType?.()
    });
  }

  function getQuestionCountForConfig(config = {}) {
    return getInterviewQuestionCountForConfig(config, {
      defaultQuestionCount: deps.getQuestionCount?.()
    });
  }

  function getQuestionSecondsForConfig(config = {}, count = 1) {
    return getInterviewQuestionSecondsForConfig(config, count, {
      defaultQuestionSeconds: deps.getQuestionSeconds?.()
    });
  }

  function formatConfigSummary(config = {}) {
    return formatInterviewConfigSummary(config, {
      language: getInterviewState().language,
      focusDefs,
      difficultyDefs,
      personaDefs,
      modeDefs,
      defaultQuestionCount: deps.getQuestionCount?.()
    });
  }

  return {
    applyAnswer,
    askStep,
    createSession,
    formatConfigSummary,
    getNextStep,
    getPrompt,
    getQuestionCountForConfig,
    getQuestionSecondsForConfig,
    getTypeForConfig,
    handleAnswer,
    isCurrentStep,
    isLiveMode,
    isOnboarding,
    normalizeSessionConfig,
    parseAnswer,
    start,
    syncLanguageControls
  };
}
