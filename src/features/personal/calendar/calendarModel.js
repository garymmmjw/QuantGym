import { countsTowardProblemTotal, hasExplicitProblemCompletion, isLeetcodeCatalogProblem, isTrainerCatalogProblem } from '../../../modules/problems/completion.js';

export const ACTIVITY_KINDS = ["quant", "mental", "sequence", "pattern", "tech", "coding", "behavioral", "daily"];
export const TRIAL_KINDS = ["mental", "sequence", "pattern"];
export const DISPLAY_KINDS = ACTIVITY_KINDS.filter((kind) => kind !== "coding");
export const MANUAL_KINDS = DISPLAY_KINDS.filter((kind) => kind !== "daily");

const list = (value) => Array.isArray(value) ? value : [];
const countOf = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const trialKind = (trial) => trial?.settings?.trainer == null || trial.settings.trainer === 'math' ? 'mental' : trial.settings.trainer;
const questionNumber = (question) => String(question?.provenance?.originalNumber || '').trim();

// Date-only strings are civil dates, never UTC instants. Noon avoids DST gaps at midnight.
export function parseLocalDay(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function localDayKey(value) {
  if (arguments.length === 0) value = new Date();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseLocalDay(value) ? value : "";
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !parseLocalDay(value.slice(0, 10))) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  if (date.getFullYear() < 1 || date.getFullYear() > 9999) return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addLocalDays(key, offset) {
  const date = parseLocalDay(key);
  if (!date || !Number.isInteger(offset)) return "";
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

export function dayRange(endKey, length = 7) {
  if (!parseLocalDay(endKey) || !Number.isInteger(length) || length < 1) return [];
  return Array.from({ length }, (_, index) => addLocalDays(endKey, index - length + 1)).filter(Boolean);
}

function normalizedActivity(raw, index) {
  if (!raw || !ACTIVITY_KINDS.includes(raw.kind) || !localDayKey(raw.completedAt)) return null;
  return {
    ...raw,
    id: String(raw.id || `event:${index}`),
    count: countOf(raw.count),
    ...(TRIAL_KINDS.includes(raw.kind) ? { correctCount: countOf(raw.correctCount ?? raw.count) } : {}),
    dayKey: localDayKey(raw.completedAt),
    source: raw.source || "automatic",
    trialCount: TRIAL_KINDS.includes(raw.kind) ? (raw.source === "manual" ? 0 : countOf(raw.trialCount ?? 1)) : 0
  };
}

/** One saved answer is one prepared question, independent of later text edits. */
export function collectBehavioralAnswerActivities(state = {}) {
  const records = new Map();
  const removed = new Set(list(state.removedActivityIds));
  // Tombstones target individual event ids. They suppress reconstructing an
  // answer fallback, but do not erase another surviving historical event.
  const questionsWithRemovedEvents = new Set();
  const dated = value => hasExplicitProblemCompletion({ completed: true, completedAt: value }) && Boolean(localDayKey(value));
  for (const id of removed) {
    const match = /^behavioral:explicit:(.+):\d{4}-\d{2}-\d{2}$/.exec(id);
    if (match) { try { questionsWithRemovedEvents.add(decodeURIComponent(match[1])); } catch { /* Ignore malformed historical ids. */ } }
  }
  for (const activity of list(state.activities)) {
    if (activity?.kind !== 'behavioral' || activity.source !== 'explicit') continue;
    const key = activity.sourceId || activity.questionId;
    if (typeof key !== 'string' || !key.trim()) continue;
    if (removed.has(activity.id)) { questionsWithRemovedEvents.add(key); continue; }
    if (activity.count !== 1 || !dated(activity.completedAt)) continue;
    const previous = records.get(key);
    if (!previous || Date.parse(activity.completedAt) < Date.parse(previous.completedAt)
      || Date.parse(activity.completedAt) === Date.parse(previous.completedAt) && activity.id < previous.id) {
      records.set(key, { ...activity, sourceId: key, questionId: key });
    }
  }
  let undatedLegacyCount = 0;
  const seenAnswers = new Set();
  for (const answer of list(state.behavioralAnswers)) {
    if (typeof answer?.id !== 'string' || !answer.id.trim() || seenAnswers.has(answer.id)) continue;
    seenAnswers.add(answer.id);
    if (typeof answer.text !== 'string' || !answer.text.trim() || records.has(answer.id) || questionsWithRemovedEvents.has(answer.id)) continue;
    // Older answers have no first-save field. Their stored edit time is the
    // only known date; reading them must never assign today's date instead.
    if (!dated(answer.updatedAt)) { undatedLegacyCount += 1; continue; }
    const id = `behavioral:answer:${encodeURIComponent(answer.id)}`;
    if (removed.has(id)) continue;
    records.set(answer.id, { id, kind: 'behavioral', source: 'saved-answer', sourceId: answer.id,
      questionId: answer.id, count: 1, completedAt: answer.updatedAt });
  }
  return { activities: [...records.values()], undatedLegacyCount };
}

function problemKind(problem, isInterview = false) {
  const category = String(problem?.category || "").toLowerCase();
  if (isTrainerCatalogProblem(problem)) {
    const trainer = category.replace(/[\s_-]/g, '');
    return ['sequence', 'pattern'].includes(trainer) ? trainer : 'mental';
  }
  if (isLeetcodeCatalogProblem(problem) || ["coding", "programming", "algorithms"].includes(category)) return "coding";
  if (category === "behavioral" || category === "behavioural") return "behavioral";
  return isInterview ? "tech" : "quant";
}

export function formatCalendarQuestionTitle(activity, language = 'zh') {
  const title = language === 'en' ? activity.titleEn || activity.title || '' : activity.title || activity.titleEn || '';
  const number = String(activity.questionNumber || '').trim();
  if (!number || title === number || title.startsWith(`${number} `) || title.startsWith(`${number}. `)) return title;
  return title ? `${number} · ${title}` : number;
}

// Preserve finished-question and correct-answer detail in one activity per trial.
// Each trial with finished questions contributes one to the completion total.
function trainerActivities(trial, kind, fallback = {}) {
  const terminal = ['completed', 'aborted'].includes(trial.status);
  if (!terminal && trial.status !== 'active') return [];
  if (!Array.isArray(trial.questions)) {
    if (!terminal) return [];
    const correct = countOf(trial.correct ?? fallback.count);
    return [{ ...fallback, id: `${kind}:${trial.id}`, kind, count: correct, correctCount: correct,
      trialId: trial.id, trialCount: 1, completedAt: trial.completedAt || fallback.completedAt, status: trial.status }];
  }
  const seen = new Set();
  const activity = { legacyId: fallback.legacyId, sourceId: fallback.sourceId,
    id: `${kind}:${trial.id}`, kind, count: 0, correctCount: 0, trialId: trial.id,
    trialCount: terminal ? 1 : 0, completedAt: null, status: trial.status, source: 'automatic' };
  for (const question of trial.questions) {
    if (!question?.id || seen.has(question.id) || !['correct', 'wrong'].includes(question.outcome)
      || !hasExplicitProblemCompletion({ completed: true, completedAt: question.completedAt })) continue;
    const key = localDayKey(question.completedAt);
    if (!key) continue;
    seen.add(question.id);
    activity.count += 1;
    activity.correctCount += question.outcome === 'correct' ? 1 : 0;
    if (!activity.completedAt || Date.parse(question.completedAt) > Date.parse(activity.completedAt)) activity.completedAt = question.completedAt;
  }
  // An overnight session stays together on its latest finished question's date.
  // Keep empty terminal trials for trial stats, with zero completion credit.
  if (!activity.completedAt && terminal) activity.completedAt = trial.completedAt;
  return activity.completedAt ? [activity] : [];
}

/** Read dated records only. Detailed trainer questions override their aggregate event counts. */
export function collectCalendarActivities(state = {}, legacyState = {}) {
  const byId = new Map();
  const problemCompletions = new Set();
  const completionKey = (problemId, completedAt) => JSON.stringify([problemId, Date.parse(completedAt)]);
  const problems = new Map(list(legacyState.problems).map((problem) => [problem.id, problem]));
  const legacyMentalById = new Map(list(legacyState.mentalMathRecords).filter(record => record?.id && localDayKey(record.createdAt)).map(record => [record.id, record]));
  let undatedLegacyCount = 0;
  const add = (raw) => {
    const activity = normalizedActivity(raw, byId.size);
    if (activity && !byId.has(activity.id)) {
      byId.set(activity.id, activity);
      const problemId = activity.problemId || activity.questionId;
      if (problemId && activity.countedAsSolved !== false) problemCompletions.add(completionKey(problemId, activity.completedAt));
    }
  };
  const trialsById = new Map();
  for (const trial of [...list(state.trials), ...(state.activeTrial ? [state.activeTrial] : [])]) {
    const kind = trialKind(trial);
    if (!trial?.id || !TRIAL_KINDS.includes(kind)) continue;
    const key = `${kind}:${trial.id}`;
    if (!trialsById.has(key)) trialsById.set(key, trial);
  }
  const recordedTrials = new Set();
  const addTrial = (key, kind, fallback) => {
    if (recordedTrials.has(key)) return;
    recordedTrials.add(key);
    trainerActivities(trialsById.get(key), kind, fallback).forEach(add);
  };
  const practiceById = new Map(list(state.practiceSessions).map(session => [`practice:${session.id}`, session]));
  const recordedLegacyMental = new Set();
  const behavioral = collectBehavioralAnswerActivities(state);
  behavioral.activities.forEach(add);
  undatedLegacyCount += behavioral.undatedLegacyCount;
  list(state.activities).forEach(raw => {
    if (raw?.kind === 'behavioral' && raw.source === 'explicit') return;
    if (TRIAL_KINDS.includes(raw?.kind) && raw.source !== 'manual') {
      const trialId = raw.trialId || (String(raw.id).startsWith(`${raw.kind}:`) ? String(raw.id).slice(raw.kind.length + 1) : '');
      const key = `${raw.kind}:${trialId}`;
      if (trialsById.has(key)) { addTrial(key, raw.kind, raw); return; }
    }
    if (raw?.kind === 'mental' && (raw.source === 'legacy' || raw.legacyId || raw.sourceId)) {
      const legacyId = [raw.legacyId, raw.sourceId, raw.trialId, String(raw.id || '').replace(/^(?:legacy:)?mental:/, '')]
        .find(id => legacyMentalById.has(id));
      if (legacyId) {
        const trialKey = `mental:${legacyId}`;
        if (trialsById.has(trialKey)) { addTrial(trialKey, 'mental'); return; }
        if (recordedLegacyMental.has(legacyId)) return;
        recordedLegacyMental.add(legacyId);
        const record = legacyMentalById.get(legacyId);
        add({ ...raw, legacyId, count: countOf(record.correct) + countOf(record.incorrect), correctCount: countOf(record.correct), completedAt: record.createdAt });
        return;
      }
    }
    const session = practiceById.get(raw?.id);
    const problemId = raw?.problemId || raw?.questionId;
    const problem = problems.get(problemId) || { id: problemId };
    // A historical local coding review is not a verified LeetCode accepted submission.
    // Keep its history while separating it from solved-problem statistics.
    const localLeetCode = raw?.kind === 'coding' && (raw.source === 'standalone' || raw.source === 'manual'
      || raw.source === 'leetcode' || session?.question?.source === 'leetcode');
    const unconfirmedPractice = raw?.source === 'standalone' && session?.status !== 'completed';
    add({ ...raw, ...(isTrainerCatalogProblem(problem) ? { kind: problemKind(problem) } : {}),
      questionNumber: questionNumber(session?.question || problem),
      countedAsSolved: !localLeetCode && !unconfirmedPractice && countsTowardProblemTotal(problem) });
  });
  for (const [key, trial] of trialsById) addTrial(key, trialKind(trial));
  const explicit = [...byId.values()];
  const linkedTrials = new Set([...trialsById.keys(), ...explicit.filter((item) => TRIAL_KINDS.includes(item.kind)).flatMap((item) =>
    [item.trialId, item.id.startsWith(`${item.kind}:`) ? item.id.slice(item.kind.length + 1) : ""]
      .filter(Boolean).map((trialId) => `${item.kind}:${trialId}`))]);
  const linkedDaily = new Set(explicit.filter((item) => item.kind === "daily").flatMap((item) => [item.dailySessionId, item.sessionId, item.id.startsWith("daily:") ? item.id.slice(6) : ""]).filter(Boolean));
  list(state.dailySessions).forEach((session) => {
    if (!session?.id || session.status !== "completed" || linkedDaily.has(session.id)) return;
    add({ id: `daily:${session.id}`, kind: "daily", count: 1, dailySessionId: session.id, completedAt: session.completedAt });
  });

  const legacyReferences = new Set(explicit.flatMap((item) => [item.legacyId, item.sourceId]).filter(Boolean));
  const hasSameProblemEvent = (problemId, completedAt) => problemCompletions.has(completionKey(problemId, completedAt));
  list(legacyState.problemStates).forEach((record) => {
    if (record?.completed !== true || !record.problemId) return;
    if (!hasExplicitProblemCompletion(record) || !localDayKey(record.completedAt)) { undatedLegacyCount += 1; return; }
    const problem = problems.get(record.problemId) || { id: record.problemId };
    const kind = problemKind(problem);
    if (legacyReferences.has(record.problemId) || hasSameProblemEvent(record.problemId, record.completedAt)) return;
    add({ id: `legacy:problem:${record.problemId}`, kind, count: 1, completedAt: record.completedAt, problemId: record.problemId, title: problem?.titleZh || problem?.titleEn || "", titleEn: problem?.titleEn || "", questionNumber: questionNumber(problem), source: "legacy", countedAsSolved: countsTowardProblemTotal(problem) });
  });
  list(legacyState.mentalMathRecords).forEach((record, index) => {
    if (!record) return;
    if (!localDayKey(record.createdAt)) { undatedLegacyCount += 1; return; }
    if (record.id && (linkedTrials.has(`mental:${record.id}`) || legacyReferences.has(record.id))) return;
    // The old drill closes a question after either answer; its incorrect count
    // represents finished questions, unlike modern in-question math mistakes.
    add({ id: `legacy:mental:${record.id || `${record.createdAt}:${index}`}`, kind: "mental", count: countOf(record.correct) + countOf(record.incorrect), correctCount: countOf(record.correct), completedAt: record.createdAt, title: record.label || "", source: "legacy" });
  });
  // Scores, evaluations, and the entry's logging date do not prove completion.
  // Only an explicit confirmation with its own completion timestamp can count.
  list(legacyState.entries).forEach((entry, index) => {
    if (!entry?.problemId || entry.completed !== true) return;
    if (!hasExplicitProblemCompletion(entry) || !localDayKey(entry.completedAt)) { undatedLegacyCount += 1; return; }
    const problem = problems.get(entry.problemId) || { id: entry.problemId };
    const kind = problemKind(problem, true);
    if (legacyReferences.has(entry.id) || hasSameProblemEvent(entry.problemId, entry.completedAt)) return;
    add({ id: `legacy:interview:${entry.id || `${entry.problemId}:${entry.completedAt}:${index}`}`, kind, count: 1, completedAt: entry.completedAt, problemId: entry.problemId, title: problem?.titleZh || problem?.titleEn || "", titleEn: problem?.titleEn || "", questionNumber: questionNumber(problem), source: "legacy", countedAsSolved: countsTowardProblemTotal(problem) });
  });
  return {
    activities: [...byId.values()].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt) || a.id.localeCompare(b.id)),
    undatedLegacyCount
  };
}

export function summarizeActivities(activities = []) {
  const result = { quant: 0, mental: 0, mentalCorrect: 0, mentalTrials: 0, sequence: 0, sequenceCorrect: 0, sequenceTrials: 0, pattern: 0, patternCorrect: 0, patternTrials: 0,
    tech: 0, coding: 0, codingReviews: 0, behavioral: 0, daily: 0, totalQuestions: 0, activityCount: 0 };
  list(activities).forEach((item) => {
    if (!ACTIVITY_KINDS.includes(item?.kind)) return;
    const count = countOf(item.count);
    if (item.countedAsSolved === false && !TRIAL_KINDS.includes(item.kind)) {
      if (item.kind === 'coding') result.codingReviews += count;
    } else result[item.kind] += count;
    result.activityCount += 1;
    if (item.kind !== "daily" && item.countedAsSolved !== false) result.totalQuestions += TRIAL_KINDS.includes(item.kind) ? (count > 0 ? 1 : 0) : count;
    if (TRIAL_KINDS.includes(item.kind)) {
      result[`${item.kind}Correct`] += countOf(item.correctCount ?? item.count);
      result[`${item.kind}Trials`] += countOf(item.trialCount ?? (item.source === "manual" ? 0 : 1));
    }
  });
  return result;
}

export function buildDailySummaries(activities = [], endKey = localDayKey(), length = 7) {
  const grouped = new Map();
  list(activities).forEach((activity) => {
    const key = localDayKey(activity.completedAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(activity);
  });
  return dayRange(endKey, length).map((key) => ({ key, ...summarizeActivities(grouped.get(key) || []) }));
}

export function createManualActivity({ kind, count, dateKey, note = "" }, options = {}) {
  if (!MANUAL_KINDS.includes(kind)) throw new Error("invalid_kind");
  if (!Number.isInteger(Number(count)) || Number(count) < 1 || Number(count) > 10000) throw new Error("invalid_count");
  const date = parseLocalDay(dateKey);
  if (!date) throw new Error("invalid_date");
  const now = options.now || new Date();
  const id = options.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id: `manual:${id}`, kind, count: Number(count), completedAt: date.toISOString(), createdAt: new Date(now).toISOString(), dateKey, source: "manual", note: String(note).trim().slice(0, 500), trialCount: 0 };
}

// A failed durable write can still be retained in memory. Retrying a form must
// replace its original entry rather than count the same offline work twice.
export function recordManualActivity(state, activity) {
  const activities = list(state.activities);
  return {
    ...state,
    activities: activities.some((item) => item.id === activity.id)
      ? activities.map((item) => item.id === activity.id ? activity : item)
      : [...activities, activity]
  };
}
