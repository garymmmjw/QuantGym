import { countsTowardProblemTotal, hasExplicitProblemCompletion, isLeetcodeCatalogProblem, isTrainerCatalogProblem } from '../../../modules/problems/completion.js';

export const ACTIVITY_KINDS = ["quant", "mental", "sequence", "pattern", "tech", "coding", "behavioral", "daily"];
export const TRIAL_KINDS = ["mental", "sequence", "pattern"];
export const MANUAL_KINDS = ACTIVITY_KINDS.filter((kind) => kind !== "daily");

const list = (value) => Array.isArray(value) ? value : [];
const countOf = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

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
    dayKey: localDayKey(raw.completedAt),
    source: raw.source || "automatic",
    trialCount: TRIAL_KINDS.includes(raw.kind) ? (raw.source === "manual" ? 0 : countOf(raw.trialCount ?? 1)) : 0
  };
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

/** Read dated records only. Events are authoritative; linked trial/session records are fallbacks. */
export function collectCalendarActivities(state = {}, legacyState = {}) {
  const byId = new Map();
  const problemCompletions = new Set();
  const completionKey = (problemId, completedAt) => JSON.stringify([problemId, Date.parse(completedAt)]);
  const problems = new Map(list(legacyState.problems).map((problem) => [problem.id, problem]));
  let undatedLegacyCount = 0;
  const add = (raw) => {
    const activity = normalizedActivity(raw, byId.size);
    if (activity && !byId.has(activity.id)) {
      byId.set(activity.id, activity);
      const problemId = activity.problemId || activity.questionId;
      if (problemId && activity.countedAsSolved !== false) problemCompletions.add(completionKey(problemId, activity.completedAt));
    }
  };
  const practiceById = new Map(list(state.practiceSessions).map(session => [`practice:${session.id}`, session]));
  list(state.activities).forEach(raw => {
    const session = practiceById.get(raw?.id);
    const problemId = raw?.problemId || raw?.questionId;
    const problem = problems.get(problemId) || { id: problemId };
    // A local Coding OA review is not a verified LeetCode accepted submission.
    // Keep its history while separating it from solved-problem statistics.
    const localLeetCode = raw?.kind === 'coding' && (raw.source === 'standalone' || raw.source === 'manual'
      || raw.source === 'leetcode' || session?.question?.source === 'leetcode');
    const unconfirmedPractice = raw?.source === 'standalone' && session?.status !== 'completed';
    add({ ...raw, ...(isTrainerCatalogProblem(problem) ? { kind: problemKind(problem) } : {}),
      countedAsSolved: !localLeetCode && !unconfirmedPractice && countsTowardProblemTotal(problem) });
  });
  const explicit = [...byId.values()];
  const linkedTrials = new Set(explicit.filter((item) => TRIAL_KINDS.includes(item.kind)).flatMap((item) =>
    [item.trialId, item.id.startsWith(`${item.kind}:`) ? item.id.slice(item.kind.length + 1) : ""]
      .filter(Boolean).map((trialId) => `${item.kind}:${trialId}`)));
  const linkedDaily = new Set(explicit.filter((item) => item.kind === "daily").flatMap((item) => [item.dailySessionId, item.sessionId, item.id.startsWith("daily:") ? item.id.slice(6) : ""]).filter(Boolean));
  list(state.trials).forEach((trial) => {
    const kind = trial?.settings?.trainer == null || trial.settings.trainer === "math" ? "mental" : trial.settings.trainer;
    if (!trial?.id || !TRIAL_KINDS.includes(kind) || !["completed", "aborted"].includes(trial.status) || linkedTrials.has(`${kind}:${trial.id}`)) return;
    add({ id: `${kind}:${trial.id}`, kind, count: trial.correct, trialId: trial.id, completedAt: trial.completedAt, status: trial.status });
  });
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
    add({ id: `legacy:problem:${record.problemId}`, kind, count: 1, completedAt: record.completedAt, problemId: record.problemId, title: problem?.titleZh || problem?.titleEn || "", titleEn: problem?.titleEn || "", source: "legacy", countedAsSolved: countsTowardProblemTotal(problem) });
  });
  list(legacyState.mentalMathRecords).forEach((record, index) => {
    if (!record) return;
    if (!localDayKey(record.createdAt)) { undatedLegacyCount += 1; return; }
    if (record.id && (linkedTrials.has(`mental:${record.id}`) || legacyReferences.has(record.id))) return;
    add({ id: `legacy:mental:${record.id || `${record.createdAt}:${index}`}`, kind: "mental", count: record.correct, completedAt: record.createdAt, title: record.label || "", source: "legacy" });
  });
  // Scores, evaluations, and the entry's logging date do not prove completion.
  // Only an explicit confirmation with its own completion timestamp can count.
  list(legacyState.entries).forEach((entry, index) => {
    if (!entry?.problemId || entry.completed !== true) return;
    if (!hasExplicitProblemCompletion(entry) || !localDayKey(entry.completedAt)) { undatedLegacyCount += 1; return; }
    const problem = problems.get(entry.problemId) || { id: entry.problemId };
    const kind = problemKind(problem, true);
    if (legacyReferences.has(entry.id) || hasSameProblemEvent(entry.problemId, entry.completedAt)) return;
    add({ id: `legacy:interview:${entry.id || `${entry.problemId}:${entry.completedAt}:${index}`}`, kind, count: 1, completedAt: entry.completedAt, problemId: entry.problemId, title: problem?.titleZh || problem?.titleEn || "", titleEn: problem?.titleEn || "", source: "legacy", countedAsSolved: countsTowardProblemTotal(problem) });
  });
  return {
    activities: [...byId.values()].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt) || a.id.localeCompare(b.id)),
    undatedLegacyCount
  };
}

export function summarizeActivities(activities = []) {
  const result = { quant: 0, mental: 0, mentalTrials: 0, sequence: 0, sequenceTrials: 0, pattern: 0, patternTrials: 0,
    tech: 0, coding: 0, codingReviews: 0, behavioral: 0, daily: 0, totalQuestions: 0, activityCount: 0 };
  list(activities).forEach((item) => {
    if (!ACTIVITY_KINDS.includes(item?.kind)) return;
    const count = countOf(item.count);
    if (item.countedAsSolved === false && !TRIAL_KINDS.includes(item.kind)) {
      if (item.kind === 'coding') result.codingReviews += count;
    } else result[item.kind] += count;
    result.activityCount += 1;
    if (item.kind !== "daily" && !TRIAL_KINDS.includes(item.kind) && item.countedAsSolved !== false) result.totalQuestions += count;
    if (TRIAL_KINDS.includes(item.kind)) result[`${item.kind}Trials`] += countOf(item.trialCount ?? (item.source === "manual" ? 0 : 1));
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
