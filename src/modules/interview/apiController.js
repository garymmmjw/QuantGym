import {
  requestInterviewConverse,
  requestInterviewFeedback,
  requestInterviewHint,
  requestPdfQuestionGeneration
} from './api.js';

export function createInterviewApiController(deps = {}) {
  const elements = deps.elements || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));

  function getLanguage() {
    return getInterviewState().language === "en" ? "en" : "zh";
  }

  function getRequestConfig() {
    const config = deps.getLlmConfig?.() || {};
    const endpoint = (elements.llmEndpointInput?.value?.trim() || config.endpoint || "").trim();
    if (!endpoint) throw new Error("Missing endpoint");
    deps.updateLlmConfigFromControls?.({ endpoint });
    return { config, endpoint };
  }

  function getSessionMeta() {
    const session = getInterviewState().session || {};
    return {
      mode: session.mode || "live",
      sessionConfig: session.sessionConfig || {},
      interviewType: session.type || deps.getType?.(),
      questionIndex: session.currentIndex || 0,
      questionCount: session.questions?.length || 1,
      timeRemaining: session.remainingSeconds || 0
    };
  }

  async function requestFeedback(problem, answer, attachment = null) {
    const { config, endpoint } = getRequestConfig();
    const meta = getSessionMeta();
    return requestInterviewFeedback({
      endpoint,
      headers: deps.getRequestHeaders?.(),
      model: config.model,
      language: getLanguage(),
      interviewType: meta.interviewType,
      questionIndex: meta.questionIndex,
      questionCount: meta.questionCount,
      problem,
      transcript: deps.getSerializableTranscript?.(),
      answer,
      answerAttachment: attachment,
      fallback: deps.localFeedback?.(problem, answer)
    });
  }

  async function requestConverse(problem, answerPayload = {}, conversation = {}) {
    const { config, endpoint } = getRequestConfig();
    const meta = getSessionMeta();
    return requestInterviewConverse({
      endpoint,
      headers: deps.getRequestHeaders?.(),
      model: config.model,
      language: getLanguage(),
      mode: meta.mode,
      sessionConfig: meta.sessionConfig,
      interviewType: meta.interviewType,
      questionIndex: meta.questionIndex,
      questionCount: meta.questionCount,
      problem,
      groundTruth: {
        answer: deps.getLocalizedProblemField?.(problem, "answer", getLanguage() === "en"),
        explanation: deps.getLocalizedProblemField?.(problem, "explanation", getLanguage() === "en")
      },
      turns: conversation.turns || [],
      followupCount: conversation.followupCount || 0,
      maxFollowups: conversation.maxFollowups || deps.getMaxFollowups?.(problem),
      timeRemaining: meta.timeRemaining,
      persona: deps.getPersonaPrompt?.(meta.sessionConfig.persona) || "",
      latestAnswer: answerPayload.text || "",
      answerAttachment: answerPayload.attachment || null
    });
  }

  async function requestPdfQuestions(filePayload, count, type) {
    const { config, endpoint } = getRequestConfig();
    return requestPdfQuestionGeneration({
      endpoint,
      headers: deps.getRequestHeaders?.(),
      model: config.model,
      language: getLanguage(),
      interviewType: type,
      count,
      file: filePayload
    });
  }

  async function requestHint(problem, partialAnswer) {
    const { config, endpoint } = getRequestConfig();
    return requestInterviewHint({
      endpoint,
      headers: deps.getRequestHeaders?.(),
      model: deps.normalizeModel?.(elements.llmModelInput?.value || config.model) || config.model,
      language: getLanguage(),
      interviewType: getSessionMeta().interviewType,
      problem,
      transcript: getInterviewState().messages,
      partialAnswer,
      fallback: deps.localHint?.(problem)
    });
  }

  return {
    requestConverse,
    requestFeedback,
    requestHint,
    requestPdfQuestions
  };
}
