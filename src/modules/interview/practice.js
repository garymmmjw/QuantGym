import { clampNumber } from '../../lib/number.js';

export function buildInterviewPracticeRecord(options = {}) {
  const {
    problem = {},
    feedback = {},
    session = null,
    skillKeys = [],
    normalizeCategory = (value) => value,
    makeId = () => `${Date.now()}-${Math.random()}`,
    nowIso = () => new Date().toISOString()
  } = options;
  const category = normalizeCategory(problem.category);
  const xpGain = session?.type === "behavioral" ? 6 : 10;
  const practicedAt = nowIso();
  const entryId = makeId();
  const score = Number.isFinite(Number(feedback.score))
    ? Math.round(clampNumber(Number(feedback.score), 0, 100))
    : null;
  const evaluation = String(feedback.evaluation || "").trim();
  const currentIndex = session?.currentIndex ?? -1;
  const gains = Object.fromEntries((Array.isArray(skillKeys) ? skillKeys : []).map((key) => [
    key,
    key === category ? xpGain : 0
  ]));
  return {
    category,
    xpGain,
    practicedAt,
    entryId,
    score,
    evaluation,
    currentIndex,
    entry: {
      id: entryId,
      date: practicedAt,
      text: [
        `模拟面试：${problem.titleZh || problem.titleEn}`,
        score == null ? "" : `得分 ${score}/100`
      ].filter(Boolean).join("，"),
      gains,
      totalXp: xpGain,
      duration: Math.round((session?.questionSeconds || 0) / 60),
      problemId: problem.id || "",
      interviewScore: score,
      interviewEvaluation: evaluation
    }
  };
}

export function applyInterviewPracticeProblemState(current = {}, practice = {}) {
  const score = practice.score == null
    ? null
    : Number.isFinite(Number(practice.score)) ? Number(practice.score) : null;
  const evaluation = String(practice.evaluation || "").trim();
  return {
    ...current,
    interviewCount: Number(current.interviewCount || 0) + 1,
    lastPracticedAt: practice.practicedAt,
    lastScore: score,
    lastScoreAt: practice.practicedAt,
    lastEvaluation: evaluation,
    scoreHistory: score == null
      ? current.scoreHistory || []
      : [...(current.scoreHistory || []), {
        id: practice.entryId,
        score,
        evaluation,
        scoredAt: practice.practicedAt
      }].slice(-40)
  };
}

export function buildInterviewPracticeSessionPatch(session = null, practice = {}, feedback = {}) {
  if (!session || practice.currentIndex < 0) return null;
  const questionResults = Array.isArray(session.questionResults) ? session.questionResults : [];
  const nextResults = questionResults.map((item) => item ? { ...item, fresh: false } : item);
  nextResults[practice.currentIndex] = {
    score: practice.score,
    evaluation: practice.evaluation,
    dimensions: feedback.dimensions || null,
    missing: feedback.missing || [],
    nextStep: feedback.nextStep || [],
    scoredAt: practice.practicedAt,
    fresh: practice.score != null
  };
  return {
    questionResults: nextResults,
    latestScoredIndex: practice.currentIndex
  };
}
