import {
  getInterviewStatusViewModel,
  renderInterviewStatus
} from './status.js';
import { renderInterviewTimer } from './timer.js';
import {
  createInterviewVoiceRecognition,
  getInterviewQuestionSpeechText,
  getSpeechRecognitionConstructor,
  getVoiceUnsupportedMessage,
  speakInterviewText,
  stopInterviewSpeechSynthesis,
  stopInterviewVoiceRecognition
} from './voice.js';

export function createInterviewInteractionController(deps = {}) {
  const elements = deps.elements || {};
  const windowRef = deps.windowRef || globalThis;
  const typeDefs = deps.typeDefs || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getRuntimeState = deps.getRuntimeState || (() => ({}));

  function getLanguage() {
    return getInterviewState().language === "en" ? "en" : "zh";
  }

  function useReactSession() {
    return getRuntimeState().reactSession !== false;
  }

  function updateStatus(status = "") {
    const runtime = getRuntimeState();
    runtime.uiStatus = status;
    deps.updateLayout?.();
    if (useReactSession()) {
      deps.updateActionPanel?.();
      return;
    }
    if (!elements.interviewSessionTitle || !elements.interviewQuestionStatus || !elements.interviewTimer) return;
    const viewModel = getInterviewStatusViewModel({
      session: getInterviewState().session,
      status,
      language: getLanguage(),
      typeDefs,
      onboarding: Boolean(deps.isOnboarding?.())
    });
    renderInterviewStatus(elements, viewModel);
    deps.updateActionPanel?.();
  }

  function setTimer(seconds) {
    getRuntimeState().timerSeconds = seconds;
    if (useReactSession()) return;
    renderInterviewTimer(elements.interviewTimer, seconds);
  }

  function getQuestionSpeechText(problem = {}) {
    return getInterviewQuestionSpeechText(problem, {
      language: getLanguage()
    });
  }

  function speakText(text) {
    speakInterviewText(text, {
      enabled: Boolean(getInterviewState().session?.sessionConfig?.ttsEnabled),
      language: getLanguage(),
      speechSynthesis: windowRef.speechSynthesis,
      SpeechSynthesisUtteranceCtor: windowRef.SpeechSynthesisUtterance,
      normalizeRichText: deps.normalizeRichText
    });
  }

  function stopSpeech() {
    stopInterviewSpeechSynthesis(windowRef.speechSynthesis);
  }

  function toggleVoiceAnswer() {
    const SpeechRecognition = getSpeechRecognitionConstructor(windowRef);
    if (!SpeechRecognition) {
      deps.appendMessage?.("system", getVoiceUnsupportedMessage(getLanguage()));
      return;
    }

    const activeRecognition = deps.getVoiceRecognition?.();
    if (activeRecognition) {
      stopInterviewVoiceRecognition(activeRecognition);
      deps.setVoiceRecognition?.(null);
      elements.voiceAnswerBtn?.classList.remove("active-like");
      return;
    }

    const recognition = createInterviewVoiceRecognition({
      SpeechRecognitionCtor: SpeechRecognition,
      language: getLanguage(),
      onTranscript(transcript) {
        if (transcript && elements.interviewAnswer) {
          elements.interviewAnswer.value = transcript;
          deps.autoSizeAnswer?.();
        }
      },
      onEnd() {
        deps.setVoiceRecognition?.(null);
        elements.voiceAnswerBtn?.classList.remove("active-like");
      }
    });
    if (!recognition) return;
    deps.setVoiceRecognition?.(recognition);
    elements.voiceAnswerBtn?.classList.add("active-like");
    recognition.start();
  }

  return {
    getQuestionSpeechText,
    setTimer,
    speakText,
    stopSpeech,
    toggleVoiceAnswer,
    updateStatus
  };
}
