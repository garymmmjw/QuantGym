import { collectCalendarActivities, localDayKey } from '../personal/calendar/calendarModel.js';
import { collectLeetCodeActivities } from '../personal/calendar/leetcodeCalendar.js';
import { countsTowardProblemTotal, hasExplicitProblemCompletion } from '../../modules/problems/completion.js';
import { sortCareerStages } from './stageStore.js';
import { USER_STATE_PREFIX } from '../../constants.js';
import { userStateKey } from '../../state/auth.js';
import { EMPTY_LEETCODE } from '../leetcode/leetcodeModel.js';

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

// One unavailable source must not hide verified records from another source.
// An unconnected/disabled LeetCode account has no expected synced records; an
// initial request still loading is different from a confirmed empty account.
export function resolveStagePractice({ ownerId, namespace = '', personal = {}, leetcode = {}, leetcodeOptions } = {}) {
  if (namespace) return { ...collectStagePractice(), countStatus: 'ready', countSourceNote: '' };
  if (!ownerId || ownerId === 'guest') return { records: [], available: false, countStatus: 'unavailable', countSourceNote: '登录后显示刷题统计' };
  const personalReady = personal.ownerId === ownerId && Boolean(personal.snapshot?.data)
    && !personal.snapshot.error?.startsWith('read:') && !personal.snapshot.conflict;
  let leetcodeStatus = 'unavailable';
  if (leetcode.ownerId === ownerId) {
    if (leetcode.enabled === false) leetcodeStatus = 'not-connected';
    else if (leetcode.data && leetcode.data !== EMPTY_LEETCODE) {
      leetcodeStatus = !leetcode.data.connection ? 'not-connected'
        : Array.isArray(leetcode.data.syncedSubmissions) ? 'ready' : 'unavailable';
    } else if (leetcode.enabled && leetcode.phase !== 'error') leetcodeStatus = 'loading';
  }
  const leetcodeReady = leetcodeStatus === 'ready';
  const available = personalReady || leetcodeReady;
  const complete = personalReady && (leetcodeReady || leetcodeStatus === 'not-connected');
  const countStatus = complete ? 'ready' : available ? 'partial' : 'unavailable';
  const notes = [];
  if (!personalReady) notes.push('站内刷题记录暂不可用');
  if (leetcodeStatus === 'loading') notes.push('LeetCode 记录加载中');
  else if (leetcodeStatus === 'unavailable') notes.push('LeetCode 记录暂不可用');
  return {
    ...collectStagePractice(personalReady ? personal.snapshot.data : {}, personalReady ? personal.legacyState : {}, leetcodeReady ? leetcode.data : {}, leetcodeOptions),
    available,
    countStatus,
    countSourceNote: notes.join('；'),
    sources: { personal: personalReady ? 'ready' : 'unavailable', leetcode: leetcodeStatus },
  };
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

export function summarizeStagePractice(stages, practice = {}, { today = practice.asOfDay || new Date() } = {}) {
  const ordered = sortCareerStages(stages);
  return ordered.map((stage, index) => {
    // Each Stage owns the interval after its saved date through the next Stage's
    // date. The final interval stays live; missing dates must never be guessed.
    const next = ordered[index + 1];
    const usesTodayBoundary = !next;
    const boundary = localDayKey(stage.recordedDate);
    const end = localDayKey(usesTodayBoundary ? today : next.recordedDate);
    const knownRange = Boolean(boundary && end && boundary <= end);
    const matching = knownRange && practice.available === true
      ? new Set(list(practice.records).filter(record => record.day > boundary && record.day <= end).map(record => record.key))
      : null;
    const countStatus = !matching ? 'unavailable' : practice.countStatus || 'ready';
    return {
      ...stage,
      questionCount: matching && (countStatus === 'ready' || (countStatus === 'partial' && matching.size > 0)) ? matching.size : null,
      countStatus,
      countSourceNote: knownRange ? practice.countSourceNote || '' : '暂无法确定统计区间',
      periodStart: boundary,
      periodEnd: end,
      nextLabel: next?.label || '',
      sameDay: Boolean(boundary && boundary === end),
      usesTodayBoundary,
    };
  });
}

export function formatStagePeriod(stage) {
  const start = localDayKey(stage.periodStart);
  const end = localDayKey(stage.periodEnd);
  if (!start || !end) return '日期待补充';
  if (start > end) return '日期待校正';
  const includeYear = start.slice(0, 4) !== end.slice(0, 4);
  const format = value => {
    const [year, month, day] = value.split('-');
    return `${includeYear ? `${year}/` : ''}${Number(month)}/${Number(day)}`;
  };
  return `${format(start)} - ${stage.usesTodayBoundary ? '至今' : format(end)}`;
}
