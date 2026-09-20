import { addLocalDays, collectCalendarActivities, localDayKey, parseLocalDay } from '../personal/calendar/calendarModel.js';
import { leetcodeSubmissionDay } from '../personal/calendar/leetcodeCalendar.js';
import { summarizeLeetCodeProgress } from '../leetcode/leetcodeProgress.js';
import { countsTowardProblemTotal, hasExplicitProblemCompletion } from '../../modules/problems/completion.js';
import { sortCareerStages } from '../careerStages/stageStore.js';

const list = value => Array.isArray(value) ? value : [];
const identity = value => typeof value === 'string' && value.trim() ? value : '';
const count = value => Number.isSafeInteger(value) && value >= 0;
const ASSESSMENTS = new Set(['independent', 'with-help', 'review']);
export const ACTIVITY_WEIGHTS = Object.freeze({ applications: 2, leetcode: 5, technical: 10, behavioral: 10, mentalMath: 5 });
const DAILY_KINDS = Object.keys(ACTIVITY_WEIGHTS);

function applicationDay(application, dayOf) {
  const event = list(application.events).find(item => item?.type === 'submitted');
  if (!event) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) return localDayKey(event.date);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(event.date || '')) return dayOf(event.date);
  const partial = /^(\d{1,2})\/(\d{1,2})$/.exec(event.date || '');
  if (!partial || !Number.isInteger(event.year) || event.year < 1 || event.year > 9999) return '';
  return localDayKey(`${String(event.year).padStart(4, '0')}-${partial[1].padStart(2, '0')}-${partial[2].padStart(2, '0')}`);
}

/** Collect qualifying work; saved Behavioral answers count as preparation. */
export function collectOverviewRecords({ applications = [], personalState = {}, legacyState = {}, leetcodeSnapshot = {}, availability = {} } = {}, { now = Date.now(), timeZone } = {}) {
  const records = new Map();
  const removed = new Set(list(personalState.removedActivityIds));
  const sources = { personal: availability.personal !== false, applications: availability.applications !== false,
    leetcode: availability.leetcode !== false && leetcodeSnapshot?.connection?.site === 'cn'
      && Array.isArray(leetcodeSnapshot.syncedSubmissions) };
  const nowMs = new Date(now).getTime();
  const dayOf = timestamp => {
    if (!hasExplicitProblemCompletion({ completed: true, completedAt: timestamp }) || Date.parse(timestamp) > nowMs) return '';
    return timeZone ? leetcodeSubmissionDay(timestamp, timeZone) : localDayKey(timestamp);
  };
  function add(kind, key, day, extra = {}, allowUndated = false) {
    if (!identity(key) || !day && !allowUndated) return;
    const recordKey = JSON.stringify([kind, key, day]);
    if (!records.has(recordKey)) records.set(recordKey, { kind, key, day, ...extra });
  }
  if (sources.applications) {
    const seen = new Set();
    list(applications).forEach(application => {
      if (!application || seen.has(application.id)) return;
      seen.add(application.id);
      add('applications', application.id, applicationDay(application, dayOf), {}, true);
    });
  }
  if (sources.personal) {
    const questions = new Map();
    list(personalState.dailySessions).forEach(session => list(session?.questions).forEach(question => {
      questions.set(`${session.id}:${question.id}`, question);
    }));
    const { activities } = collectCalendarActivities(personalState, legacyState);
    activities.forEach(activity => {
      const kind = ['quant', 'tech'].includes(activity.kind) ? 'technical' : activity.kind === 'behavioral' ? 'behavioral' : '';
      if (!kind || ['manual', 'import', 'imported'].includes(activity.source) || removed.has(activity.id) || activity.countedAsSolved === false || activity.count < 1) return;
      const question = questions.get(`${activity.sessionId}:${activity.questionId}`);
      if (question && !countsTowardProblemTotal({ ...question, id: question.sourceProblemId || question.id })) return;
      const key = activity.problemId || question?.sourceProblemId || activity.sourceId || activity.questionId;
      add(kind, key, dayOf(activity.completedAt));
    });
    // A restored session may predate its generated calendar activity.
    list(personalState.practiceSessions).forEach(session => {
      if (session?.kind !== 'tech' || session.status !== 'completed' || removed.has(`practice:${session.id}`)
        || !session.text?.trim() || !ASSESSMENTS.has(session.selfAssessment) || !countsTowardProblemTotal(session.question)) return;
      add('technical', session.question?.id, dayOf(session.completedAt));
    });
    list(personalState.dailySessions).forEach(session => list(session?.questions).forEach(question => {
      const kind = question.kind === 'tech' ? 'technical' : question.kind === 'behavioral' ? 'behavioral' : '';
      const answer = session.answers?.[question.id];
      if (!kind || removed.has(`daily:${session.id}:${question.id}`) || !answer?.text?.trim()
        || !ASSESSMENTS.has(answer.selfAssessment) || !countsTowardProblemTotal({ ...question, id: question.sourceProblemId || question.id })) return;
      add(kind, question.sourceProblemId || question.id, dayOf(answer.completedAt));
    }));
    // Reading credit is an explicit action, separate from writing a private note.
    list(personalState.activities).forEach(activity => {
      if (activity?.kind !== 'experience-read' || activity.source !== 'explicit' || activity.count !== 1 || removed.has(activity.id)) return;
      add('experiences', activity.sourceId, dayOf(activity.completedAt));
    });
    const trialIds = new Set();
    list(personalState.trials).forEach(trial => {
      if (!trial?.id || trialIds.has(trial.id)) return;
      trialIds.add(trial.id);
      if (trial.status !== 'completed' || trial.settings?.trainer && trial.settings.trainer !== 'math'
        || removed.has(`mental:${trial.id}`) || !count(trial.correct)) return;
      add('mentalMath', trial.id, dayOf(trial.completedAt), { score: trial.correct });
    });
    // Old drill records are final session results; use correct answers, not the
    // old correct-minus-incorrect score, to match the current trainer's scale.
    const legacyTrialIds = new Set();
    list(legacyState.mentalMathRecords).forEach(record => {
      if (!record?.id || trialIds.has(record.id) || legacyTrialIds.has(record.id) || removed.has(`legacy:mental:${record.id}`)
        || removed.has(`mental:${record.id}`) || !count(record.correct)) return;
      legacyTrialIds.add(record.id);
      add('mentalMath', record.id, dayOf(record.createdAt), { score: record.correct });
    });
  }
  const leetcodeProgress = sources.leetcode ? summarizeLeetCodeProgress(leetcodeSnapshot, { now, timeZone }) : null;
  leetcodeProgress?.completions.forEach(completion => {
    add('leetcode', completion.id, completion.dayKey, { problemSlug: completion.problemSlug });
  });
  return { records: [...records.values()], sources, leetcodeTotal: leetcodeProgress?.total ?? null,
    leetcodeMissingDates: leetcodeProgress?.missingDates ?? 0,
    personalComplete: availability.personalComplete !== false, applicationsComplete: availability.applicationsComplete !== false,
    leetcodeComplete: sources.leetcode && leetcodeProgress.complete };
}

function distinct(records, kind) {
  return new Set(records.filter(record => record.kind === kind).map(record => record.key)).size;
}

function sourceAvailable(bundle, kind) {
  return bundle.sources[kind === 'applications' ? 'applications' : kind === 'leetcode' ? 'leetcode' : 'personal'];
}

function metricCount(bundle, records, kind) {
  if (!sourceAvailable(bundle, kind)) return null;
  const value = distinct(records, kind);
  const complete = kind === 'leetcode' ? bundle.leetcodeComplete : kind === 'applications' ? bundle.applicationsComplete : bundle.personalComplete;
  return !value && !complete ? null : value;
}

function dailyCounts(bundle, records) {
  return Object.fromEntries(DAILY_KINDS.map(kind => [kind, metricCount(bundle, records, kind)]));
}

function scoreActivity(counts) {
  if (Object.values(counts).every(value => value === null)) return null;
  return DAILY_KINDS.reduce((total, kind) => total + (counts[kind] ?? 0) * ACTIVITY_WEIGHTS[kind], 0);
}

/** Stage boundaries are unchanged: exclude its date, include the next date. */
export function summarizeOverviewStages(stages = [], bundle, { today = localDayKey() } = {}) {
  const ordered = sortCareerStages(stages);
  const endToday = localDayKey(today);
  return ordered.map((stage, index) => {
    const next = ordered[index + 1];
    const periodStart = localDayKey(stage.recordedDate);
    const periodEnd = next ? localDayKey(next.recordedDate) : endToday;
    const known = Boolean(periodStart && periodEnd && periodStart <= periodEnd);
    const records = known ? bundle.records.filter(record => record.day > periodStart && record.day <= periodEnd && record.day <= endToday) : [];
    const result = { ...stage, isCurrent: !next, periodStart, periodEnd, usesTodayBoundary: !next };
    for (const kind of ['applications', 'leetcode', 'technical', 'behavioral']) result[kind] = known
      ? periodStart === periodEnd && sourceAvailable(bundle, kind) ? 0 : metricCount(bundle, records, kind) : null;
    const trials = records.filter(record => record.kind === 'mentalMath');
    result.mentalMathAverage = known && bundle.sources.personal && trials.length
      ? trials.reduce((total, trial) => total + trial.score, 0) / trials.length : null;
    return result;
  });
}

/** Pure dashboard projection; source snapshots and their stored dates stay intact. */
export function buildOverviewActivity(input = {}, { today = localDayKey(), now = Date.now(), timeZone } = {}) {
  const todayKey = localDayKey(today);
  const bundle = collectOverviewRecords(input, { now, timeZone });
  const past = bundle.records.filter(record => !record.day || record.day <= todayKey);
  const totals = Object.fromEntries(['applications', 'technical', 'behavioral', 'experiences'].map(kind => [kind, metricCount(bundle, past, kind)]));
  totals.applications = metricCount(bundle, bundle.records, 'applications');
  // Include the profile's missing first solves, never invent their dates or
  // unknown repeat attempts. Known three-hour repeats add to this lower bound.
  totals.leetcode = bundle.leetcodeTotal ?? (bundle.leetcodeComplete ? distinct(past, 'leetcode') : null);
  totals.mock = null;
  const currentCounts = dailyCounts(bundle, past.filter(record => record.day === todayKey));
  const date = parseLocalDay(todayKey);
  const monday = date ? addLocalDays(todayKey, -((date.getDay() + 6) % 7)) : '';
  const days = monday ? Array.from({ length: 7 }, (_, index) => {
    const day = addLocalDays(monday, index);
    const counts = day > todayKey ? Object.fromEntries(DAILY_KINDS.map(kind => [kind, 0]))
      : dailyCounts(bundle, past.filter(record => record.day === day));
    return { day, counts, activityScore: scoreActivity(counts), isToday: day === todayKey };
  }) : [];
  const stageRows = summarizeOverviewStages(input.stages || [], bundle, { today: todayKey });
  const datedLeetcode = past.filter(record => record.kind === 'leetcode');
  const outsideStages = datedLeetcode.filter(record => !stageRows.some(stage => record.day > stage.periodStart && record.day <= stage.periodEnd)).length;
  const stageNotes = [];
  if (stageRows.length && bundle.leetcodeMissingDates) stageNotes.push(`${bundle.leetcodeMissingDates} 次缺少日期`);
  if (stageRows.length && outsideStages) stageNotes.push(`${outsideStages} 次在阶段范围外`);
  const notes = [];
  if (!bundle.sources.personal) notes.push('训练记录暂不可用');
  else if (!bundle.personalComplete) notes.push('账户记录尚未同步完成，显示已记录活动');
  if (!bundle.sources.applications) notes.push('投递记录暂不可用');
  if (!bundle.sources.leetcode) notes.push('LeetCode 尚未同步');
  else if (!bundle.leetcodeComplete) notes.push('LeetCode 日期统计仅含已同步记录');
  return { totals, today: { counts: currentCounts, activityScore: scoreActivity(currentCounts) }, days,
    stageRows, leetcodeStageNote: stageNotes.length ? `LeetCode：${stageNotes.join('，')}，未计入 Stage。` : '',
    statusNote: notes.join('；'), recordBundle: bundle };
}

/** Select only snapshots belonging to the active owner before any projection. */
export function resolveOverviewActivity({ ownerId, namespace = '', personal = {}, leetcode = {}, tracker = {}, stages = [] } = {}, options = {}) {
  const active = Boolean(ownerId && ownerId !== 'guest');
  const personalReady = active && !namespace && personal.ownerId === ownerId && Boolean(personal.snapshot?.data)
    && !personal.snapshot.error?.startsWith('read:') && !personal.snapshot.conflict;
  const trackerReady = active && tracker.ownerId === ownerId && !tracker.error && !tracker.syncError && Array.isArray(tracker.applications);
  const lcReady = active && !namespace && leetcode.ownerId === ownerId && leetcode.enabled !== false
    && leetcode.data?.connection?.site === 'cn' && Array.isArray(leetcode.data.syncedSubmissions);
  const personalComplete = !personal.cloudExpected || personal.cloud?.phase === 'synced';
  const result = buildOverviewActivity({ applications: trackerReady ? tracker.applications : [], stages: active ? stages : [],
    personalState: personalReady ? personal.snapshot.data : {}, legacyState: personalReady ? personal.legacyState : {},
    leetcodeSnapshot: lcReady ? leetcode.data : {}, availability: { personal: personalReady, applications: trackerReady, leetcode: lcReady,
      personalComplete, applicationsComplete: namespace ? true : personalComplete } }, options);
  if (lcReady && leetcode.phase === 'error') result.statusNote = [result.statusNote, 'LeetCode 暂未刷新，显示已同步记录'].filter(Boolean).join('；');
  return result;
}
