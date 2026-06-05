import { prepDiagnosticQuestions } from '../../prep-data.js';
import { normalizePrepPlan } from './data.js';

function getNowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function getAnswer(answers, questionId) {
  const fieldName = `diagnostic-${questionId}`;
  if (answers && typeof answers.get === "function") return answers.get(fieldName);
  if (answers && typeof answers === "object") return answers[fieldName] ?? answers[questionId];
  return null;
}

export function scorePrepDiagnostic(answers, questions = prepDiagnosticQuestions) {
  const missing = questions.filter((question) => !getAnswer(answers, question.id));
  if (missing.length) {
    return {
      completed: false,
      missingCount: missing.length,
      score: 0,
      scores: {}
    };
  }

  const totals = {};
  const correct = {};
  let score = 0;
  questions.forEach((question) => {
    totals[question.skill] = (totals[question.skill] || 0) + 1;
    if (getAnswer(answers, question.id) === question.answer) {
      score += 1;
      correct[question.skill] = (correct[question.skill] || 0) + 1;
    }
  });
  const scores = Object.fromEntries(Object.keys(totals).map((key) => [
    key,
    Math.round(((correct[key] || 0) / totals[key]) * 100)
  ]));

  return {
    completed: true,
    missingCount: 0,
    score,
    scores
  };
}

export function setPrepDiagnosticStatus(options = {}) {
  const {
    prepPlan,
    status,
    makeId,
    localDateKey,
    now = new Date()
  } = options;
  if (!["pending", "completed", "skipped"].includes(status)) return { changed: false };
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (!normalizedPrepPlan) return { changed: false };
  return {
    changed: true,
    prepPlan: {
      ...normalizedPrepPlan,
      diagnosticStatus: status,
      updatedAt: getNowIso(now)
    }
  };
}

export function completePrepDiagnostic(options = {}) {
  const {
    prepPlan,
    answers,
    makeId,
    localDateKey,
    now = new Date()
  } = options;
  const normalizedPrepPlan = normalizePrepPlan(prepPlan, { makeId, localDateKey });
  if (!normalizedPrepPlan) return { changed: false, missingCount: 0 };

  const result = scorePrepDiagnostic(answers);
  if (!result.completed) {
    return {
      changed: false,
      missingCount: result.missingCount
    };
  }

  return {
    changed: true,
    missingCount: 0,
    prepPlan: {
      ...normalizedPrepPlan,
      diagnosticStatus: "completed",
      diagnosticScore: result.score,
      diagnosticScores: result.scores,
      updatedAt: getNowIso(now)
    }
  };
}
