import { localDayKey, parseLocalDay } from './calendar/calendarModel.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

export function behavioralEditId(sourceId, editId) {
  if (!sourceIdentity(sourceId) || typeof editId !== 'string' || !UUID.test(editId)) throw new Error('Invalid behavioral edit identity.');
  const id = `behavioral:edit:${encodeURIComponent(sourceId)}:${editId}`;
  if (id.length > 512) throw new Error('Completion identity is too long.');
  return id;
}

export function isExplicitCompletionActivity(activity) {
  return activity?.source === 'explicit' && KINDS.has(activity.kind)
    || activity?.source === 'answer-edit' && activity.kind === 'behavioral';
}

export function validateExplicitCompletionActivity(activity) {
  const keys = ['id', 'kind', 'source', 'sourceId', 'count', 'completedAt', 'dateKey', ...(activity?.kind === 'behavioral' ? ['questionId'] : [])];
  const revision = activity?.kind === 'behavioral' && activity.id?.startsWith('behavioral:edit:');
  const expectedId = revision ? behavioralEditId(activity.sourceId, activity.id.split(':').at(-1))
    : explicitCompletionId(activity?.kind, activity?.sourceId, activity?.dateKey);
  if (!isExplicitCompletionActivity(activity) || activity.count !== 1 || !instant(activity.completedAt) || !parseLocalDay(activity.dateKey)
    || activity.source === 'answer-edit' && !revision
    || Object.keys(activity).some(key => !keys.includes(key))
    || activity.id !== expectedId
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
  return Boolean(typeof answer?.text === 'string' && answer.text.trim());
}

function hasBehavioralHistory(state, sourceId) {
  return (state.activities || []).some(activity => activity.kind === 'behavioral' && isExplicitCompletionActivity(activity)
    && (activity.sourceId || activity.questionId) === sourceId)
    || (state.removedActivityIds || []).some(id => id.startsWith(`behavioral:explicit:${encodeURIComponent(sourceId)}:`)
      || id.startsWith(`behavioral:edit:${encodeURIComponent(sourceId)}:`)
      || id === `behavioral:answer:${encodeURIComponent(sourceId)}`);
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
  if (hasBehavioralHistory(state, question.id)) return state;
  const answer = (state.behavioralAnswers || []).find(item => item.id === question.id);
  // Preserve the existing answer's known date when adopting the new counting
  // rule. A later edit must not move a previously prepared question to today.
  return recordCompletion(state, 'behavioral', question.id, instant(answer.updatedAt) ? answer.updatedAt : now);
}

export function saveBehavioralAnswer(state, question, text, now = new Date(), { editId = crypto.randomUUID() } = {}) {
  if (typeof text !== 'string') throw new Error('Invalid behavioral answer.');
  let next = state;
  const previous = (state.behavioralAnswers || []).find(item => item.id === question.id);
  if (previous?.text === text) return state;
  // Even a clear must first preserve preparation already represented by the
  // old nonempty answer. Otherwise rewriting it later would move its date.
  if (hasPersonalBehavioralAnswer(state, question) && instant(previous.updatedAt)) {
    next = completeBehavioralPractice(state, question, now);
  }
  next = { ...next, behavioralAnswers: [
    ...(next.behavioralAnswers || []).filter(item => item.id !== question.id),
    { id: question.id, text, updatedAt: new Date(now).toISOString() },
  ] };
  if (!text.trim() || previous?.text.trim() === text.trim()) return next;
  const id = behavioralEditId(question.id, editId);
  // Automatic saves throughout one editing session share this identity. A
  // later editing session gets a new id, including on the same question/day.
  if ((next.activities || []).some(activity => activity.id === id) || (next.removedActivityIds || []).includes(id)) return next;
  // A separate source lets older clients read the snapshot without applying
  // their legacy explicit-ID validator to this new event identity.
  const activity = validateExplicitCompletionActivity({ id, kind: 'behavioral', source: 'answer-edit',
    sourceId: question.id, questionId: question.id, count: 1, completedAt: new Date(now).toISOString(), dateKey: localDayKey(now) });
  return { ...next, activities: [...(next.activities || []), activity] };
}

export function markExperienceRead(state, experienceId, now = new Date()) {
  return recordCompletion(state, 'experience-read', experienceId, now);
}

// Concurrent retries of the same event or first read retain one record.
// Retain the first timestamp, including when an older client omits these records.
export function retainExplicitCompletionActivities(base, ...sources) {
  const rows = new Map();
  const removed = new Set(base.removedActivityIds || []);
  for (const source of [base, ...sources]) {
    for (const id of source.removedActivityIds || []) {
      if (id.startsWith('behavioral:explicit:') || id.startsWith('behavioral:edit:') || id.startsWith('experience-read:')) removed.add(id);
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
