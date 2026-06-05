import { parseLooseInterviewConverseText } from './api.js';
import {
  formatInterviewConversation,
  getCurrentQuestionMessages
} from './favorites.js';
import {
  formatInterviewQuestion,
  formatStructuredInterviewFeedback,
  parseInterviewFeedbackEvaluation,
  parseInterviewFeedbackScore,
  prettyInterviewTitle
} from './format.js';
import {
  getInterviewMaxFollowups,
  getLocalInterviewMissingSignals,
  isBehavioralLikeProblem,
  localInterviewConverse,
  localInterviewFeedback,
  localInterviewHint,
  localStructuredInterviewFeedback,
  normalizeInterviewFeedback
} from './localFeedback.js';
import {
  getSerializableInterviewTranscript,
  summarizeInterviewAttachment
} from './session.js';

export function createInterviewFeedbackController(deps = {}) {
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const typeDefs = deps.typeDefs || {};

  function getLanguage() {
    return getInterviewState().language === "en" ? "en" : "zh";
  }

  function getFeedbackOptions() {
    const state = getInterviewState();
    return {
      language: getLanguage(),
      interviewType: state.session?.type || deps.getType?.(),
      configDifficulty: state.session?.sessionConfig?.difficulty || "",
      normalizeCategory: deps.normalizeCategory,
      getLocalizedProblemField: deps.getLocalizedProblemField,
      randomChoice: deps.randomChoice
    };
  }

  function prettyTitle(problem) {
    return prettyInterviewTitle(problem, {
      language: getLanguage(),
      formatCategory: deps.formatCategory
    });
  }

  function formatQuestion(problem, index) {
    return formatInterviewQuestion(problem, index, {
      language: getLanguage(),
      session: getInterviewState().session,
      typeDefs,
      formatCategory: deps.formatCategory,
      getProblemMediaMarkdown: deps.getProblemMediaMarkdown
    });
  }

  function getCurrentConversation() {
    const state = getInterviewState();
    const session = state.session;
    const index = Math.max(0, session?.currentIndex || 0);
    session.questionConversations = session.questionConversations || [];
    if (!session.questionConversations[index]) {
      session.questionConversations[index] = {
        turns: [],
        followupCount: 0,
        maxFollowups: getMaxFollowups(deps.getSelectedProblem?.()),
        interviewerSatisfied: false,
        status: "answering"
      };
    }
    return session.questionConversations[index];
  }

  function getMaxFollowups(problem = {}) {
    return getInterviewMaxFollowups(problem, getFeedbackOptions());
  }

  function normalizeConverseReply(input, problem, conversation) {
    const fallback = localConverse(problem, conversation);
    const source = typeof input === "string" ? parseLooseInterviewConverseText(input) : (input || {});
    const action = source.action === "wrap" || source.action === "followup" ? source.action : fallback.action;
    const message = String(source.message || source.reply || source.text || fallback.message || "").trim();
    return {
      action,
      message,
      coverage: Array.isArray(source.coverage) ? source.coverage.map(String).slice(0, 6) : fallback.coverage,
      missing: Array.isArray(source.missing) ? source.missing.map(String).slice(0, 6) : fallback.missing,
      runningAssessment: String(source.runningAssessment || source.assessment || fallback.runningAssessment || "").trim()
    };
  }

  function localConverse(problem, conversation = {}) {
    return localInterviewConverse(problem, conversation, getFeedbackOptions());
  }

  function recordLiveQuestionResult(problem, conversation = {}) {
    const session = getInterviewState().session;
    const currentIndex = session?.currentIndex ?? -1;
    if (currentIndex < 0) return;
    const answer = (conversation.turns || []).filter((turn) => turn.role === "user").map((turn) => turn.text).join(" ");
    const structured = localStructuredFeedback(problem, answer);
    session.questionResults = session.questionResults || [];
    session.questionResults[currentIndex] = {
      score: structured.overall,
      evaluation: conversation.runningAssessment || structured.summary,
      dimensions: structured.dimensions,
      missing: conversation.missing || structured.missing,
      nextStep: structured.nextStep,
      status: conversation.status || "wrapped",
      liveHidden: true,
      scoredAt: deps.nowIso?.() || new Date().toISOString(),
      fresh: false
    };
  }

  function summarizeAttachment(attachment) {
    return summarizeInterviewAttachment(attachment);
  }

  function getSerializableTranscript() {
    return getSerializableInterviewTranscript(getInterviewState().messages);
  }

  function localStructuredFeedback(problem, answer) {
    return localStructuredInterviewFeedback(problem, answer, getFeedbackOptions());
  }

  function localFeedback(problem, answer) {
    return localInterviewFeedback(problem, answer, getFeedbackOptions());
  }

  function normalizeFeedback(input, problem, answer) {
    return normalizeInterviewFeedback(input, problem, answer, getFeedbackOptions());
  }

  function formatStructuredFeedback(feedback = {}) {
    return formatStructuredInterviewFeedback(feedback, {
      language: getLanguage()
    });
  }

  function getMissingSignals(problem, answer) {
    return getLocalInterviewMissingSignals(problem, answer, getFeedbackOptions());
  }

  function isBehavioralLike(problem = {}) {
    return isBehavioralLikeProblem(problem, getFeedbackOptions());
  }

  function localHint(problem) {
    return localInterviewHint(problem, getFeedbackOptions());
  }

  function getQuestionMessages() {
    const state = getInterviewState();
    return getCurrentQuestionMessages(state.session, state.messages);
  }

  function formatCurrentQuestionConversation(messages) {
    return formatInterviewConversation(messages, {
      language: getLanguage()
    });
  }

  return {
    formatCurrentQuestionConversation,
    formatQuestion,
    formatStructuredFeedback,
    getCurrentConversation,
    getFeedbackOptions,
    getMaxFollowups,
    getMissingSignals,
    getQuestionMessages,
    getSerializableTranscript,
    isBehavioralLike,
    localConverse,
    localFeedback,
    localHint,
    localStructuredFeedback,
    normalizeConverseReply,
    normalizeFeedback,
    parseFeedbackEvaluation: parseInterviewFeedbackEvaluation,
    parseFeedbackScore: parseInterviewFeedbackScore,
    prettyTitle,
    recordLiveQuestionResult,
    summarizeAttachment
  };
}
