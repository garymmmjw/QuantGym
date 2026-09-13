const ASSESSMENTS = ['', 'independent', 'with-help', 'review'];
const LANGUAGES = ['python', 'javascript', 'cpp'];
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const text = (value, max = 80000) => typeof value === 'string' && value.length <= max;
const identity = value => text(value, 512) && value.trim().length > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => Number.isFinite(value) && value >= 0 && value <= 1e12;
const nextUpdate = (session, now) => new Date(Math.max(Date.parse(now), Date.parse(session.updatedAt) + 1)).toISOString();

export function validatePracticeSession(session) {
  const q = session?.question;
  if (!object(session) || !identity(session.id) || !['tech', 'coding'].includes(session.kind)
    || !['active', 'completed'].includes(session.status) || !stamp(session.startedAt) || !stamp(session.updatedAt)
    || !object(q) || !identity(q.id) || !text(q.title, 500) || !text(q.titleEn, 500)
    || !['prompt', 'promptEn', 'reference', 'referenceEn'].every(key => text(q[key]))
    || !text(q.url, 2048) || !text(session.text) || !LANGUAGES.includes(session.codeLanguage)
    || !ASSESSMENTS.includes(session.selfAssessment) || !finite(session.elapsedSeconds)
    || typeof session.reviewed !== 'boolean' || session.timerStartedAt != null && !stamp(session.timerStartedAt)
    || session.completedAt != null && !stamp(session.completedAt)) throw new Error('Invalid practice session.');
  if (session.kind === 'tech' && (q.source !== 'question-bank' || q.url !== '' || !q.prompt.trim() || !q.reference.trim()
    || q.slug || q.username || q.linkedAt)) throw new Error('Invalid technical question source.');
  if (session.kind === 'coding' && (q.source !== 'leetcode' || !/^[a-zA-Z0-9_-]{1,200}$/.test(q.slug)
    || q.id !== q.slug || q.url !== `https://leetcode.cn/problems/${q.slug}/`
    || !/^[a-zA-Z0-9_-]{1,100}$/.test(q.username) || !stamp(q.linkedAt))) throw new Error('Invalid coding question source.');
  if (session.status === 'completed' && (!stamp(session.completedAt) || !session.text.trim()
    || !session.selfAssessment || session.timerStartedAt != null)) throw new Error('Incomplete practice result.');
  if (session.status === 'active' && session.completedAt != null) throw new Error('Invalid active practice result.');
  return session;
}

export function mergePracticeSessions(current = [], incoming = []) {
  const byId = new Map();
  for (const session of [...incoming, ...current]) {
    validatePracticeSession(session);
    const previous = byId.get(session.id);
    if (previous && (previous.kind !== session.kind || previous.question.id !== session.question.id
      || previous.question.source !== session.question.source || previous.question.username !== session.question.username
      || previous.question.linkedAt !== session.question.linkedAt)) throw new Error('Conflicting practice question.');
    if (!previous || session.status === 'completed' && previous.status !== 'completed'
      || session.status === previous.status && Date.parse(session.updatedAt) >= Date.parse(previous.updatedAt)) byId.set(session.id, session);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.id.localeCompare(b.id));
}

export function practiceActivity(session) {
  return { id: `practice:${session.id}`, kind: session.kind, count: 1, source: 'standalone',
    title: session.question.title, titleEn: session.question.titleEn, questionId: session.question.id,
    completedAt: session.completedAt, selfAssessment: session.selfAssessment };
}

export function withPracticeActivities(state) {
  const activities = new Map((state.activities || []).map(item => [item.id, item]));
  const removed = new Set(state.removedActivityIds || []);
  for (const session of state.practiceSessions || []) {
    if (session.status !== 'completed') continue;
    const activity = practiceActivity(session);
    if (!removed.has(activity.id)) activities.set(activity.id, activity);
  }
  return { ...state, activities: [...activities.values()] };
}

export function createPracticeSession(kind, question, { now = new Date().toISOString(), id = globalThis.crypto.randomUUID() } = {}) {
  return validatePracticeSession({ id, kind, status: 'active', startedAt: now, updatedAt: now, completedAt: null,
    question: { titleEn: '', prompt: '', promptEn: '', reference: '', referenceEn: '', url: '', ...question },
    text: '', codeLanguage: 'python', selfAssessment: '', elapsedSeconds: 0, timerStartedAt: null, reviewed: false });
}

export function practiceElapsed(session, now = Date.now()) {
  return session.elapsedSeconds + (session.timerStartedAt ? Math.max(0, (Number(now) - Date.parse(session.timerStartedAt)) / 1000) : 0);
}

export function editPracticeSession(state, id, patch, now = new Date().toISOString()) {
  const allowed = Object.fromEntries(Object.entries(patch).filter(([key]) => ['text', 'codeLanguage', 'selfAssessment', 'reviewed'].includes(key)));
  return { ...state, practiceSessions: (state.practiceSessions || []).map(session => session.id === id && session.status === 'active'
    ? validatePracticeSession({ ...session, ...allowed, updatedAt: nextUpdate(session, now) }) : session) };
}

export function setPracticeTimer(state, id, running, now = new Date().toISOString()) {
  return { ...state, practiceSessions: (state.practiceSessions || []).map(session => {
    if (session.status !== 'active') return session;
    if (session.id === id || running && session.timerStartedAt) return { ...session,
      elapsedSeconds: practiceElapsed(session, Date.parse(now)), timerStartedAt: session.id === id && running ? now : null, updatedAt: nextUpdate(session, now) };
    return session;
  }) };
}

export function completePracticeSession(state, id, now = new Date().toISOString()) {
  const session = (state.practiceSessions || []).find(item => item.id === id);
  if (!session || session.status !== 'active' || !session.text.trim() || !session.selfAssessment) return state;
  const completed = validatePracticeSession({ ...session, status: 'completed', completedAt: now, updatedAt: nextUpdate(session, now),
    elapsedSeconds: practiceElapsed(session, Date.parse(now)), timerStartedAt: null });
  return withPracticeActivities({ ...state, practiceSessions: state.practiceSessions.map(item => item.id === id ? completed : item) });
}

export function drawTechnicalQuestion(questions = [], previousId = '', random = Math.random) {
  const pool = questions.filter(question => question?.source === 'question-bank' && question.prompt?.trim());
  const choices = pool.length > 1 ? pool.filter(question => question.id !== previousId) : pool;
  const n = Number(random());
  return choices[Math.floor(Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 1 - Number.EPSILON) * choices.length)] || null;
}
