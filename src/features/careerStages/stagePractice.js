import { collectCalendarActivities, localDayKey, addLocalDays } from '../personal/calendar/calendarModel.js';
import { collectLeetCodeActivities } from '../personal/calendar/leetcodeCalendar.js';
import { countsTowardProblemTotal, hasExplicitProblemCompletion } from '../../modules/problems/completion.js';
import { sortCareerStages } from './stageStore.js';
import { USER_STATE_PREFIX } from '../../constants.js';
import { userStateKey } from '../../state/auth.js';

const list = value => Array.isArray(value) ? value : [];
const QUESTION_KINDS = new Set(['quant', 'coding', 'tech', 'behavioral']);

// A count represents distinct completed questions, never trial/session totals.
export function collectStagePractice(personalState = {}, legacyState = {}, leetcodeSnapshot = {}, leetcodeOptions = {}) {
  const records = new Map();
  const sessionQuestions = new Map();
  list(personalState.dailySessions).forEach(session => list(session.questions).forEach(question => {
    sessionQuestions.set(`${session.id}:${question.id}`, question);
  }));
  function add(id, completedAt) {
    const day = localDayKey(completedAt);
    if (!id || !day || !hasExplicitProblemCompletion({ completed: true, completedAt })) return;
    const key = String(id);
    records.set(`${key}:${day}`, { key, day });
  }
  const removed = new Set(list(personalState.removedActivityIds));
  const { activities } = collectCalendarActivities(personalState, {
    ...legacyState,
    problemStates: list(legacyState.problemStates).filter(record => record?.completed === true),
  });
  activities.forEach(activity => {
    if (!QUESTION_KINDS.has(activity.kind) || activity.source === 'manual' || activity.countedAsSolved === false
      || activity.count < 1 || removed.has(activity.id)) return;
    const question = sessionQuestions.get(`${activity.sessionId}:${activity.questionId}`);
    if (question && !countsTowardProblemTotal({ ...question, id: question.sourceProblemId || question.id })) return;
    add(activity.problemId || question?.sourceProblemId || activity.questionId, activity.completedAt);
  });
  // Older daily sessions may have answers without a corresponding activity entry.
  list(personalState.dailySessions).forEach(session => list(session.questions).forEach(question => {
    const eventId = `daily:${session.id}:${question.id}`;
    const answer = session.answers?.[question.id];
    if (!QUESTION_KINDS.has(question.kind) || removed.has(eventId)
      || !countsTowardProblemTotal({ ...question, id: question.sourceProblemId || question.id })
      || !answer?.text?.trim() || !['independent', 'with-help', 'review'].includes(answer.selfAssessment)) return;
    add(question.sourceProblemId || question.id, answer.completedAt);
  }));
  // Only verified account-sync ACs qualify. Local Hot100 flags, imported history,
  // saved reviews and source-calendar submission totals cannot create credit.
  collectLeetCodeActivities(leetcodeSnapshot, leetcodeOptions).activities.forEach(activity => {
    add(`leetcode:cn:${activity.problemSlug}`, activity.completedAt);
  });
  return { records: [...records.values()], available: true };
}

export function stagePracticeKeys(ownerId) {
  return {
    legacy: userStateKey(USER_STATE_PREFIX, ownerId),
    personal: `quantgym.personal-prep.v1:${encodeURIComponent(ownerId || 'guest')}`,
  };
}

export function readStagePractice({ ownerId, namespace = '', storage, legacyState, leetcodeSnapshot, leetcodeOptions } = {}) {
  if (namespace) return collectStagePractice();
  if (!ownerId || ownerId === 'guest') return { records: [], available: false };
  try {
    const keys = stagePracticeKeys(ownerId);
    const raw = storage.getItem(keys.personal);
    const envelope = raw ? JSON.parse(raw) : null;
    if (envelope && (envelope.ownerId !== ownerId || envelope.version !== 1 || !envelope.data)) throw new Error('Invalid practice owner');
    const savedRaw = storage.getItem(keys.legacy);
    // Durable records reflect other tabs; the homepage prop can lag behind them.
    const savedLegacy = savedRaw ? JSON.parse(savedRaw) : legacyState || {};
    if (!savedLegacy || typeof savedLegacy !== 'object' || Array.isArray(savedLegacy)) throw new Error('Invalid question records');
    return collectStagePractice(envelope?.data || {}, { ...savedLegacy, problems: legacyState?.problems || savedLegacy.problems }, leetcodeSnapshot, leetcodeOptions);
  } catch { return { records: [], available: false }; }
}

export function summarizeStagePractice(stages, practice = {}) {
  const ordered = sortCareerStages(stages);
  return ordered.map((stage, index) => {
    const previous = ordered[index - 1];
    const end = localDayKey(stage.recordedDate);
    const boundary = previous ? localDayKey(previous.recordedDate) : '';
    const knownRange = Boolean(end && (!previous || (boundary && boundary <= end)));
    const matching = knownRange && practice.available !== false
      ? new Set(list(practice.records).filter(record => record.day <= end && (!boundary || record.day > boundary)).map(record => record.key))
      : null;
    return {
      ...stage,
      questionCount: matching ? matching.size : null,
      periodStart: boundary ? addLocalDays(boundary, 1) : '',
      periodEnd: end,
      previousLabel: previous?.label || '',
      sameDay: Boolean(boundary && boundary === end),
    };
  });
}
