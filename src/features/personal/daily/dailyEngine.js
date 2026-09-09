import { DAILY_QUESTION_BANK } from './questionBank.js';

export const DEFAULT_DAILY_SETTINGS = Object.freeze({
  mentalEnabled: true,
  mentalSeconds: 120,
  techCount: 3,
  codingCount: 3,
  behavioralCount: 1,
  techMinutes: 5,
  codingMinutes: 20,
  behavioralMinutes: 3,
  techSource: 'library',
});

export const SELF_ASSESSMENTS = ['independent', 'with-help', 'review'];
const KINDS = ['tech', 'coding', 'behavioral'];
const bounded = (value, fallback, low, high) => value === '' || value == null || !Number.isFinite(Number(value)) ? fallback : Math.max(low, Math.min(high, Math.round(Number(value))));

export function localDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function normalizeDailySettings(settings = {}) {
  settings = settings && typeof settings === 'object' ? settings : {};
  const normalized = {
    mentalEnabled: typeof settings.mentalEnabled === 'boolean' ? settings.mentalEnabled : true,
    mentalSeconds: bounded(settings.mentalSeconds, 120, 30, 600),
    techSource: settings.techSource === 'practice' ? 'practice' : 'library',
  };
  for (const kind of KINDS) {
    normalized[`${kind}Count`] = bounded(settings[`${kind}Count`], DEFAULT_DAILY_SETTINGS[`${kind}Count`], 0, 8);
    normalized[`${kind}Minutes`] = bounded(settings[`${kind}Minutes`], DEFAULT_DAILY_SETTINGS[`${kind}Minutes`], 1, 120);
  }
  return normalized;
}

export function hasDailySections(settings) {
  const normalized = normalizeDailySettings(settings);
  return normalized.mentalEnabled || KINDS.some(kind => normalized[`${kind}Count`] > 0);
}

export function dailyBudgetSeconds(settings) {
  const normalized = normalizeDailySettings(settings);
  return (normalized.mentalEnabled ? normalized.mentalSeconds : 0) + KINDS.reduce((total, kind) => total + normalized[`${kind}Count`] * normalized[`${kind}Minutes`] * 60, 0);
}

// Seeded Fisher–Yates: the session stores a complete snapshot, so a reload or a
// later content edit cannot silently replace an in-progress question.
export function getLibraryTechQuestions(problems = []) {
  const usedIds = new Set();
  const usedPrompts = new Set();
  const content = value => typeof value === 'string' ? value.trim() : '';
  return (Array.isArray(problems) ? problems : []).flatMap(problem => {
    if (!problem || typeof problem !== 'object') return [];
    const classification = [problem.category, problem.titleZh, problem.titleEn, ...(Array.isArray(problem.tags) ? problem.tags : [])].join(' ');
    if (/behavior|behaviour|行为|编程|coding|leetcode|algorithm|数据结构|\boa\b/i.test(classification)) return [];
    const prompt = content(problem.promptZh) || content(problem.prompt) || content(problem.promptEn);
    const promptEn = content(problem.promptEn) || prompt;
    const reference = [content(problem.answerZh) || content(problem.answer), content(problem.explanationZh) || content(problem.explanation), content(problem.solutionZh) || content(problem.solution)].filter(Boolean).join('\n\n');
    const referenceEn = [content(problem.answerEn) || content(problem.answer), content(problem.explanationEn) || content(problem.explanation), content(problem.solutionEn) || content(problem.solution)].filter(Boolean).join('\n\n') || reference;
    const answer = reference || referenceEn;
    const id = typeof problem.id === 'string' || typeof problem.id === 'number' ? String(problem.id) : '';
    const key = prompt.toLowerCase().replace(/\s+/g, ' ');
    if (!id || usedIds.has(id) || usedPrompts.has(key) || prompt.length < 24 || answer.length < 8 || /^(tbd|todo|暂无|待补充|无答案|no answer)/i.test(answer)) return [];
    if (/!\[[^\]]*\]\(|<img\b/i.test(prompt)) return [];
    usedIds.add(id);
    usedPrompts.add(key);
    return [{ id: `library-tech-${id}`, kind: 'tech', title: content(problem.titleZh) || content(problem.titleEn) || '题库技术题', titleEn: content(problem.titleEn) || content(problem.titleZh) || 'Library interview question', prompt, promptEn, reference: answer, referenceEn, source: 'library', sourceProblemId: id, sourceLabel: content(problem.source), sourceUrl: /^https?:\/\//i.test(content(problem.sourceUrl)) ? content(problem.sourceUrl) : '' }];
  });
}

export function selectDailyQuestions(settings, seed, problems = [], priorSessions = []) {
  const normalized = normalizeDailySettings(settings);
  let number = 2166136261;
  for (const char of String(seed)) number = Math.imul(number ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    number = (Math.imul(1664525, number) + 1013904223) >>> 0;
    return number / 4294967296;
  };
  const shuffle = input => {
    const pool = [...input];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    return pool;
  };
  const recentLibraryIds = new Set((Array.isArray(priorSessions) ? [...priorSessions] : [])
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 3)
    .flatMap(session => (session.questions || []).filter(question => question.source === 'library').map(question => question.id)));
  return KINDS.flatMap(kind => {
    const count = normalized[`${kind}Count`];
    const candidates = kind === 'tech' && normalized.techSource === 'library' ? shuffle(getLibraryTechQuestions(problems)) : [];
    const library = [...candidates.filter(question => !recentLibraryIds.has(question.id)), ...candidates.filter(question => recentLibraryIds.has(question.id))].slice(0, count);
    const pool = [...library, ...shuffle(DAILY_QUESTION_BANK[kind]).slice(0, count - library.length)];
    return pool.map(question => JSON.parse(JSON.stringify({
      ...question, budgetSeconds: normalized[`${kind}Minutes`] * 60,
    })));
  });
}

export function createDailySession(settings, options = {}) {
  const normalized = normalizeDailySettings(settings);
  if (!hasDailySections(normalized)) throw new Error('Select at least one Daily Mock section.');
  const startedAt = options.startedAt || new Date().toISOString();
  const id = options.id || globalThis.crypto?.randomUUID?.() || `daily-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const dateKey = options.dateKey || localDateKey(startedAt);
  return {
    id, dateKey, startedAt, completedAt: null, status: 'active',
    settings: normalized,
    questions: selectDailyQuestions(normalized, `${dateKey}:${id}`, options.problems, options.priorSessions),
    answers: {}, mentalTrialId: null, mentalCompletedAt: null,
  };
}

export function getDailyProgress(session) {
  if (!session) return { completed: 0, total: 0, complete: false };
  const total = session.questions.length + (session.settings.mentalEnabled ? 1 : 0);
  const completed = session.questions.filter(question => Boolean(session.answers?.[question.id]?.completedAt)).length + (session.settings.mentalEnabled && session.mentalCompletedAt ? 1 : 0);
  return { completed, total, complete: total > 0 && completed === total };
}

export function getQuestionElapsed(answer, at = Date.now()) {
  const elapsed = Number.isFinite(answer?.elapsedSeconds) ? Math.max(0, answer.elapsedSeconds) : 0;
  const started = Date.parse(answer?.timerStartedAt || '');
  return elapsed + (Number.isFinite(started) ? Math.max(0, (Number(at) - started) / 1000) : 0);
}

function editSession(state, sessionId, edit) {
  const sessions = state.dailySessions || [];
  const index = sessions.findIndex(session => session.id === sessionId);
  if (index < 0) return state;
  const original = sessions[index];
  const changed = edit(original);
  if (changed === original) return state;
  const updated = [...sessions];
  updated[index] = changed;
  return { ...state, dailySessions: updated };
}

export function updateDailyAnswer(state, sessionId, questionId, patch) {
  return editSession(state, sessionId, session => {
    if (session.status !== 'active' || !session.questions.some(question => question.id === questionId)) return session;
    const answer = session.answers?.[questionId] || {};
    if (answer.completedAt) return session;
    // Completion metadata is written only through completeDailyQuestion.
    const allowed = {};
    if (typeof patch.text === 'string') allowed.text = patch.text;
    if (['python', 'javascript', 'cpp'].includes(patch.codeLanguage)) allowed.codeLanguage = patch.codeLanguage;
    if (typeof patch.reviewed === 'boolean') allowed.reviewed = patch.reviewed;
    if (SELF_ASSESSMENTS.includes(patch.selfAssessment)) allowed.selfAssessment = patch.selfAssessment;
    if (!Object.keys(allowed).some(key => allowed[key] !== answer[key])) return session;
    return { ...session, answers: { ...session.answers, [questionId]: { ...answer, ...allowed } } };
  });
}

export function setDailyQuestionTimer(state, sessionId, questionId, running, now = new Date().toISOString()) {
  return editSession(state, sessionId, session => {
    if (session.status !== 'active' || !session.questions.some(question => question.id === questionId)) return session;
    const answer = session.answers?.[questionId] || {};
    if (answer.completedAt || Boolean(answer.timerStartedAt) === running) return session;
    const answers = { ...session.answers };
    if (running) {
      for (const [key, other] of Object.entries(answers)) {
        if (other.timerStartedAt) answers[key] = { ...other, elapsedSeconds: getQuestionElapsed(other, Date.parse(now)), timerStartedAt: null };
      }
    }
    answers[questionId] = {
      ...answer,
      elapsedSeconds: getQuestionElapsed(answer, Date.parse(now)),
      timerStartedAt: running ? now : null,
    };
    return { ...session, answers };
  });
}

function appendActivity(state, activity) {
  const activities = state.activities || [];
  return activities.some(item => item.id === activity.id) ? state : { ...state, activities: [...activities, activity] };
}

function finishDailyIfReady(state, sessionId, now) {
  const session = state.dailySessions.find(item => item.id === sessionId);
  if (!session || !getDailyProgress(session).complete) return state;
  const updated = editSession(state, sessionId, original => original.status === 'completed' ? original : { ...original, status: 'completed', completedAt: now });
  return appendActivity(updated, { id: `daily:${sessionId}:complete`, kind: 'daily', count: 1, completedAt: session.completedAt || now, sessionId });
}

export function completeDailyQuestion(state, sessionId, questionId, now = new Date().toISOString()) {
  const session = (state.dailySessions || []).find(item => item.id === sessionId);
  const question = session?.questions.find(item => item.id === questionId);
  const answer = session?.answers?.[questionId];
  if (!session || session.status !== 'active' || !question || answer?.completedAt || !answer?.text?.trim() || !SELF_ASSESSMENTS.includes(answer.selfAssessment)) return state;
  let updated = editSession(state, sessionId, original => ({
    ...original,
    answers: { ...original.answers, [questionId]: {
      ...answer, completedAt: now, elapsedSeconds: getQuestionElapsed(answer, Date.parse(now)), timerStartedAt: null,
    } },
  }));
  updated = appendActivity(updated, {
    id: `daily:${sessionId}:${questionId}`, kind: question.kind, count: 1,
    title: question.title, titleEn: question.titleEn,
    completedAt: now, sessionId, questionId, selfAssessment: answer.selfAssessment,
  });
  return finishDailyIfReady(updated, sessionId, now);
}

export function completeDailyMental(state, sessionId, trial, now = new Date().toISOString()) {
  const session = (state.dailySessions || []).find(item => item.id === sessionId);
  if (!session || session.status !== 'active' || !session.settings.mentalEnabled || session.mentalCompletedAt || !trial?.id || trial.status !== 'completed' || trial.dailySessionId !== sessionId) return state;
  const updated = editSession(state, sessionId, original => ({ ...original, mentalTrialId: trial.id, mentalCompletedAt: trial.completedAt || now }));
  // The mental trainer owns its trial activity. Do not count the same math twice.
  return finishDailyIfReady(updated, sessionId, now);
}

export function preferredDailySession(sessions = [], today = localDateKey()) {
  return [...sessions].reverse().find(session => session.status === 'active') || [...sessions].reverse().find(session => session.dateKey === today) || null;
}

export function resolveDailyDeepLink(sessions = [], search = '') {
  const params = new URLSearchParams(search);
  const sessionId = params.get('session');
  const questionId = params.get('question');
  const session = sessions.find(item => item.id === sessionId);
  return { sessionId, questionId, missingSession: Boolean(sessionId && !session),
    missingQuestion: Boolean(session && questionId && !(questionId === 'mental' && session.settings.mentalEnabled)
      && !session.questions.some(question => question.id === questionId)) };
}
