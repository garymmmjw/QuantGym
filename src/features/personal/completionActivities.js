import { localDayKey, parseLocalDay } from './calendar/calendarModel.js';

const KINDS = new Set(['behavioral', 'experience-read']);
const sourceIdentity = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
const instant = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Boolean(parseLocalDay(value.slice(0, 10))) && Number.isFinite(Date.parse(value));

export function explicitCompletionId(kind, sourceId, dayKey) {
  if (!KINDS.has(kind) || !sourceIdentity(sourceId) || !parseLocalDay(dayKey)) throw new Error('Invalid completion identity.');
  const id = kind === 'behavioral' ? `behavioral:explicit:${encodeURIComponent(sourceId)}:${dayKey}` : `experience-read:${encodeURIComponent(sourceId)}`;
  if (id.length > 512) throw new Error('Completion identity is too long.');
  return id;
}

export function isExplicitCompletionActivity(activity) {
  return activity?.source === 'explicit' && KINDS.has(activity.kind);
}

export function validateExplicitCompletionActivity(activity) {
  const keys = ['id', 'kind', 'source', 'sourceId', 'count', 'completedAt', 'dateKey', ...(activity?.kind === 'behavioral' ? ['questionId'] : [])];
  if (!isExplicitCompletionActivity(activity) || activity.count !== 1 || !instant(activity.completedAt)
    || Object.keys(activity).some(key => !keys.includes(key))
    || activity.id !== explicitCompletionId(activity.kind, activity.sourceId, activity.dateKey)
    || activity.kind === 'behavioral' && activity.questionId !== activity.sourceId) throw new Error('Invalid explicit completion activity.');
  return activity;
}

export function hasExplicitCompletion(state, kind, sourceId, now = new Date()) {
  let id;
  try { id = explicitCompletionId(kind, sourceId, localDayKey(now)); } catch { return false; }
  return (state.activities || []).some(activity => activity.id === id && isExplicitCompletionActivity(activity))
    && !(state.removedActivityIds || []).includes(id);
}

export function hasPersonalBehavioralAnswer(state, question) {
  const answer = (state.behavioralAnswers || []).find(item => item.id === question.id);
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
  return Boolean(typeof answer?.text === 'string' && normalize(answer.text)
    && (!question.answer || normalize(answer.text) !== normalize(question.answer)));
}

function recordCompletion(state, kind, sourceId, now) {
  const completedAt = new Date(now).toISOString();
  const dateKey = localDayKey(now);
  const id = explicitCompletionId(kind, sourceId, dateKey);
  if ((state.activities || []).some(activity => activity.id === id) || (state.removedActivityIds || []).includes(id)) return state;
  const activity = validateExplicitCompletionActivity({ id, kind, source: 'explicit', sourceId,
    count: 1, completedAt, dateKey, ...(kind === 'behavioral' ? { questionId: sourceId } : {}) });
  return { ...state, activities: [...(state.activities || []), activity] };
}

export function completeBehavioralPractice(state, question, now = new Date()) {
  if (!hasPersonalBehavioralAnswer(state, question)) throw new Error('Write your own answer before completing this practice.');
  return recordCompletion(state, 'behavioral', question.id, now);
}

export function markExperienceRead(state, experienceId, now = new Date()) {
  return recordCompletion(state, 'experience-read', experienceId, now);
}

// Concurrent confirmations of the same question/day or first read are one event.
// Retain the first timestamp, including when an older client omits these records.
export function retainExplicitCompletionActivities(base, ...sources) {
  const rows = new Map();
  const removed = new Set(base.removedActivityIds || []);
  for (const source of [base, ...sources]) {
    for (const id of source.removedActivityIds || []) {
      if (id.startsWith('behavioral:explicit:') || id.startsWith('experience-read:')) removed.add(id);
    }
    for (const activity of source.activities || []) {
      if (!isExplicitCompletionActivity(activity)) continue;
      validateExplicitCompletionActivity(activity);
      const previous = rows.get(activity.id);
      if (!previous || Date.parse(activity.completedAt) < Date.parse(previous.completedAt)
        || Date.parse(activity.completedAt) === Date.parse(previous.completedAt) && activity.dateKey < previous.dateKey) rows.set(activity.id, activity);
    }
  }
  const activities = [...(base.activities || []).filter(activity => !isExplicitCompletionActivity(activity)),
    ...[...rows.values()].filter(activity => !removed.has(activity.id)).sort((a, b) => a.id.localeCompare(b.id))];
  const removedActivityIds = [...removed].sort();
  return JSON.stringify(activities) === JSON.stringify(base.activities) && JSON.stringify(removedActivityIds) === JSON.stringify(base.removedActivityIds)
    ? base : { ...base, activities, removedActivityIds };
}
