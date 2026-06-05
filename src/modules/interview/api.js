import { requestJson } from "../../api/client.js";

async function requestInterviewTask(endpoint, body, options = {}) {
  if (!endpoint) throw new Error("Missing endpoint");
  try {
    return await requestJson(endpoint, {
      method: "POST",
      headers: options.headers,
      body,
      auth: false,
      fetchImpl: options.fetchImpl
    });
  } catch (error) {
    if (error?.status) throw new Error(`LLM endpoint ${error.status}`);
    throw error;
  }
}

export async function requestInterviewFeedback(options = {}) {
  const data = await requestInterviewTask(options.endpoint, {
    task: "evaluate",
    model: options.model,
    language: options.language,
    interviewType: options.interviewType,
    questionIndex: options.questionIndex,
    questionCount: options.questionCount,
    problem: options.problem,
    transcript: options.transcript,
    answer: options.answer,
    answerAttachment: options.answerAttachment
  }, options);
  return data.feedback || data.reply || data.text || data || options.fallback;
}

export async function requestInterviewConverse(options = {}) {
  const data = await requestInterviewTask(options.endpoint, {
    task: "converse",
    model: options.model,
    language: options.language,
    mode: options.mode,
    sessionConfig: options.sessionConfig,
    interviewType: options.interviewType,
    questionIndex: options.questionIndex,
    questionCount: options.questionCount,
    problem: options.problem,
    groundTruth: options.groundTruth,
    turns: options.turns,
    followupCount: options.followupCount,
    maxFollowups: options.maxFollowups,
    timeRemaining: options.timeRemaining,
    persona: options.persona,
    latestAnswer: options.latestAnswer,
    answerAttachment: options.answerAttachment
  }, options);
  return data.reply || data.conversation || data;
}

export function parseLooseInterviewConverseText(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    return {
      action: /wrap|收尾|下一题|move on/i.test(raw) ? "wrap" : "followup",
      message: raw
    };
  }
}

export async function requestPdfQuestionGeneration(options = {}) {
  return requestInterviewTask(options.endpoint, {
    task: "generate_pdf_questions",
    model: options.model,
    language: options.language,
    interviewType: options.interviewType,
    count: options.count,
    file: options.file
  }, options);
}

export async function requestInterviewHint(options = {}) {
  const data = await requestInterviewTask(options.endpoint, {
    task: "hint",
    model: options.model,
    language: options.language,
    interviewType: options.interviewType,
    problem: options.problem,
    transcript: options.transcript,
    partialAnswer: options.partialAnswer
  }, options);
  return data.hint || data.reply || data.text || options.fallback;
}
