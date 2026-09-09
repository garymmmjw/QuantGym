export const REVIEW_INTERVALS = Object.freeze({ again: 1, good: 3, easy: 7 });
const needsReview = new Set(['review', 'with-help']);
const array = value => Array.isArray(value) ? value : [];
const timestamp = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0, 10)}T12:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10);
const identifier = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 512;
const compareIds = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function validateReviewEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)
    || !identifier(event.id) || !identifier(event.questionKey) || !timestamp(event.reviewedAt)
    || typeof event.rating !== 'string' || !Object.hasOwn(REVIEW_INTERVALS, event.rating) || typeof event.note !== 'string' || event.note.length > 20000
    || Object.keys(event).some(key => !['id', 'questionKey', 'reviewedAt', 'rating', 'note'].includes(key))) {
    throw new Error('Invalid review event.');
  }
  return event;
}

export function createReviewEvent(questionKey, rating, note = '', options = {}) {
  return validateReviewEvent({
    id: options.id || globalThis.crypto?.randomUUID?.() || `review-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    questionKey, reviewedAt: new Date(options.now ?? Date.now()).toISOString(), rating, note: String(note),
  });
}

export function appendReviewEvent(state, event) {
  validateReviewEvent(event);
  const events = array(state.reviewEvents);
  return events.some(item => item.id === event.id) ? state : { ...state, reviewEvents: [...events, event] };
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildDailyQuestionUrl(sessionId, questionId) {
  return `/daily-mock?${new URLSearchParams({ session: sessionId, question: questionId })}`;
}

export function nextReviewDate(reviewedAt, rating) {
  if (!timestamp(reviewedAt) || !Object.hasOwn(REVIEW_INTERVALS, rating)) throw new Error('Invalid review schedule.');
  const date = new Date(reviewedAt);
  // Calendar days, rather than 24-hour durations, keep "tomorrow" stable across DST.
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + REVIEW_INTERVALS[rating]);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

/** One item per stable question id, based on the latest completed answer needing review. */
export function getReviewQueue(state = {}, now = Date.now()) {
  const nowDate = new Date(now);
  if (!Number.isFinite(nowDate.getTime())) throw new Error('Invalid review date.');
  const byQuestion = new Map();
  for (const session of array(state.dailySessions)) {
    if (!session || !identifier(session.id)) continue;
    for (const question of array(session.questions)) {
      const answer = session.answers?.[question?.id];
      if (!identifier(question?.id) || !needsReview.has(answer?.selfAssessment) || !timestamp(answer?.completedAt)) continue;
      const previous = byQuestion.get(question.id);
      if (!previous || Date.parse(answer.completedAt) > Date.parse(previous.answer.completedAt)
        || (Date.parse(answer.completedAt) === Date.parse(previous.answer.completedAt) && session.id > previous.session.id)) {
        byQuestion.set(question.id, { questionKey: question.id, question, session, answer });
      }
    }
  }
  const eventsByQuestion = new Map();
  const seen = new Set();
  for (const event of array(state.reviewEvents)) {
    try { validateReviewEvent(event); } catch { continue; }
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    if (!eventsByQuestion.has(event.questionKey)) eventsByQuestion.set(event.questionKey, []);
    eventsByQuestion.get(event.questionKey).push(event);
  }
  return [...byQuestion.values()].map(item => {
    // A newly difficult attempt restarts review, even if an older attempt was rated easy.
    const history = (eventsByQuestion.get(item.questionKey) || []).filter(event => Date.parse(event.reviewedAt) >= Date.parse(item.answer.completedAt))
      .sort((a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt) || compareIds(a.id, b.id));
    const lastReview = history.at(-1) || null;
    const dueAt = lastReview ? nextReviewDate(lastReview.reviewedAt, lastReview.rating) : item.answer.completedAt;
    return { ...item, dueAt, dueDateKey: dayKey(new Date(dueAt)), due: Date.parse(dueAt) <= nowDate.getTime(),
      lastReview, reviewCount: history.length, history,
      href: buildDailyQuestionUrl(item.session.id, item.questionKey) };
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || compareIds(a.questionKey, b.questionKey));
}
