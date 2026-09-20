import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverviewActivity, collectOverviewRecords, resolveOverviewActivity, summarizeOverviewStages } from '../src/features/overview/activityMetrics.js';
import { createPracticeSession, completePracticeSession } from '../src/features/personal/practice/practiceModel.js';
import { completeBehavioralPractice, markExperienceRead, saveBehavioralAnswer } from '../src/features/personal/completionActivities.js';
import { collectStagePractice, summarizeStagePractice } from '../src/features/careerStages/stagePractice.js';
import { collectLeetCodeActivities } from '../src/features/personal/calendar/leetcodeCalendar.js';

const stamp = (day, time = '12:00') => `${day}T${time}:00Z`;
const options = { today: '2026-09-19', now: stamp('2026-09-19', '23:59'), timeZone: 'UTC' };
const submitted = (id, date, year) => ({ id, company: id, role: 'Quant', events: [{ id: `${id}:event`, type: 'submitted', date, ...(year ? { year } : {}) }] });
const done = (problemId, day) => ({ problemId, completed: true, completedAt: stamp(day) });
const ac = (id, day, slug = 'two-sum', time) => ({ id, status: 'AC', problemSlug: slug, submittedAt: stamp(day, time) });
const lc = (submissions = [], extra = {}) => ({ connection: { site: 'cn', username: 'fixture', lastSyncedAt: stamp('2026-09-19', '23:00') },
  syncedSubmissions: submissions, submissions: [], stats: { solved: new Set(submissions.map(item => item.problemSlug)).size }, coverage: { historyComplete: true }, ...extra });
const activity = (kind, id, key, day = '2026-09-19') => ({ id, kind, source: 'explicit', sourceId: key,
  ...(kind === 'behavioral' ? { questionId: key } : {}), count: 1, completedAt: stamp(day) });
const trial = (id, correct, day = '2026-09-19', extra = {}) => ({ id, correct, status: 'completed', settings: { trainer: 'math' }, completedAt: stamp(day), ...extra });
const stages = [
  { id: 's3', label: 'Stage 3', recordedDate: '2026-09-19', description: '' },
  { id: 's1', label: 'Stage 1', recordedDate: '2026-08-21', description: '' },
  { id: 's2', label: 'Stage 2', recordedDate: '2026-09-13', description: '' },
];

test('71 different problems plus 14 qualifying repeats total 85 across calendar, overview and both Stage views', () => {
  const submissions = [
    ...Array.from({ length: 34 }, (_, i) => ac(`old-${i}`, '2026-09-12', `old-${i}`, '08:00')),
    ...Array.from({ length: 37 }, (_, i) => ac(`new-${i}`, '2026-09-18', `new-${i}`, '08:00')),
    ...Array.from({ length: 14 }, (_, i) => ac(`repeat-${i}`, '2026-09-18', `new-${i}`, '12:00')),
  ];
  const snapshot = lc(submissions, { syncedLifetimeSolvedCount: 71 });
  const model = buildOverviewActivity({ stages, leetcodeSnapshot: snapshot }, options);
  assert.equal(model.totals.leetcode, 85);
  assert.deepEqual(model.stageRows.map(row => row.leetcode), [34, 51, 0]);
  assert.equal(model.days.find(day => day.day === '2026-09-18').counts.leetcode, 51);
  assert.equal(model.days.find(day => day.day === '2026-09-18').activityScore, 255);
  assert.equal(collectLeetCodeActivities(snapshot, options).activities.reduce((sum, item) => sum + item.count, 0), 85);
  const tracker = summarizeStagePractice(stages, collectStagePractice({}, {}, snapshot, options), options);
  assert.deepEqual(tracker.map(row => row.questionCount), [34, 51, 0]);
  assert.equal(model.leetcodeStageNote, '');
});

test('undated profile history stays in the lifetime floor and never fabricates Stage or daily work', () => {
  const snapshot = lc([ac('known', '2026-09-18'), ac('repeat', '2026-09-18', 'two-sum', '16:00')], {
    syncedLifetimeSolvedCount: 85, stats: { solved: 999 }, coverage: { historyComplete: false },
  });
  const model = buildOverviewActivity({ stages, leetcodeSnapshot: snapshot }, options);
  assert.equal(model.totals.leetcode, 86);
  assert.equal(model.recordBundle.leetcodeMissingDates, 84);
  assert.equal(model.recordBundle.leetcodeComplete, false);
  assert.equal(model.stageRows[1].leetcode, 2);
  assert.equal(model.today.counts.leetcode, null);
  assert.match(model.leetcodeStageNote, /84 次缺少日期/);
  const noTrustedTotal = buildOverviewActivity({ leetcodeSnapshot: { ...snapshot, syncedLifetimeSolvedCount: null } }, options);
  assert.equal(noTrustedTotal.totals.leetcode, 2, 'an explicit missing trusted total cannot fall back to arbitrary stats');
});

test('Stage ranges never restart the three-hour clock and out-of-range dates remain unassigned', () => {
  const snapshot = lc([
    ac('start-day', '2026-08-21', 'before'),
    ac('boundary', '2026-09-13', 'same', '23:30'),
    ac('too-soon', '2026-09-14', 'same', '00:30'),
    ac('three-hours', '2026-09-14', 'same', '02:30'),
  ]);
  const model = buildOverviewActivity({ stages, leetcodeSnapshot: snapshot }, options);
  assert.equal(model.totals.leetcode, 3);
  assert.deepEqual(model.stageRows.map(row => row.leetcode), [1, 1, 0]);
  assert.match(model.leetcodeStageNote, /1 次在阶段范围外/);
  const tracker = summarizeStagePractice(stages, collectStagePractice({}, {}, snapshot, options), options);
  assert.deepEqual(tracker.map(row => row.questionCount), [1, 1, 0]);
});

test('writing a Behavioral answer counts immediately across overview, activity and Tracker; editing does not count twice', () => {
  const question = { id: 'general-introduction' };
  let state = saveBehavioralAnswer({ activities: [], behavioralAnswers: [] }, question, 'My project experience.', stamp('2026-09-18'));
  state = saveBehavioralAnswer(state, question, 'My revised project experience.', stamp('2026-09-19'));
  const model = buildOverviewActivity({ stages, personalState: state }, options);
  assert.equal(model.totals.behavioral, 1);
  assert.equal(model.today.counts.behavioral, 0);
  assert.equal(model.days.find(day => day.day === '2026-09-18').counts.behavioral, 1);
  assert.deepEqual(model.stageRows.map(row => row.behavioral), [0, 1, 0]);
  const tracker = summarizeStagePractice(stages, collectStagePractice(state), options);
  assert.deepEqual(tracker.map(row => row.questionCount), [0, 1, 0]);
});

test('six cumulative metrics use real distinct records, with Mock explicitly unknown', () => {
  const input = {
    applications: [submitted('a', '2026-09-19'), submitted('b', '8/21'), submitted('a', '2026-09-19')],
    personalState: { activities: [activity('behavioral', 'b1', 'bq1'), activity('behavioral', 'b2', 'bq1'),
      activity('experience-read', 'r1', 'experience1'), activity('experience-read', 'r2', 'experience1'),
      { id: 'manual', kind: 'tech', source: 'manual', questionId: 'manual', count: 90, completedAt: stamp('2026-09-19') }] },
    legacyState: { problemStates: [done('q1', '2026-09-19'), done('q1', '2026-09-19')],
      entries: [{ id: 'xp', totalXp: 500, date: stamp('2026-09-19') }], interviewExperiences: [{ id: 'written-only' }],
      leetcodeHot100Done: ['local-only'] },
    leetcodeSnapshot: lc([ac('1', '2026-09-19')], { stats: { solved: 118 }, submissions: [ac('imported', '2026-09-19', 'imported-only')] }),
  };
  const before = structuredClone(input);
  assert.deepEqual(buildOverviewActivity(input, options).totals, { applications: 2, technical: 1, behavioral: 1, experiences: 1, leetcode: 118, mock: null });
  assert.deepEqual(input, before);
});

test('daily counts include three-hour LeetCode repeats and use the requested weights', () => {
  const model = buildOverviewActivity({
    applications: [submitted('a', '2026-09-19')],
    personalState: { activities: [activity('behavioral', 'b1', 'bq1'), activity('behavioral', 'b2', 'bq1')], trials: [trial('t1', 12)] },
    legacyState: { problemStates: [done('q1', '2026-09-19'), done('q2', '2026-09-19')],
      entries: [{ id: 'same-q', ...done('q1', '2026-09-19') }] },
    leetcodeSnapshot: lc([ac('1', '2026-09-19', 'two-sum', '01:00'), ac('2', '2026-09-19', 'two-sum', '06:00')]),
  }, options);
  assert.deepEqual(model.today.counts, { applications: 1, leetcode: 2, technical: 2, behavioral: 1, mentalMath: 1 });
  assert.equal(model.today.activityScore, 47);
  assert.deepEqual(model.days.map(item => item.day), ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']);
  assert.equal(model.days.filter(item => item.isToday).length, 1);
  assert.equal(model.days.at(-1).activityScore, 0);
  assert.ok(Object.values(model.days.at(-1).counts).every(value => value === 0));
});

test('midnight does not reset the LeetCode three-hour repeat interval', () => {
  const model = buildOverviewActivity({ leetcodeSnapshot: lc([
    ac('before', '2026-09-18', 'two-sum', '23:30'), ac('after', '2026-09-19', 'two-sum', '00:10'),
  ]) }, options);
  assert.equal(model.totals.leetcode, 1);
  assert.equal(model.today.counts.leetcode, 0);
  assert.equal(model.days.find(item => item.day === '2026-09-18').counts.leetcode, 1);
});

test('Stage rows preserve the original 34 / 37 / 0 left-open right-closed dates', () => {
  const input = { stages, applications: [submitted('boundary', '2026-09-13'), submitted('latest', '2026-09-19')],
    legacyState: { problemStates: [done('before', '2026-08-21'),
      ...Array.from({ length: 34 }, (_, index) => done(`old-${index}`, '2026-09-13')),
      ...Array.from({ length: 37 }, (_, index) => done(`new-${index}`, '2026-09-19'))] }, leetcodeSnapshot: lc() };
  const model = buildOverviewActivity(input, options);
  assert.deepEqual(model.stageRows.map(row => [row.label, row.technical, row.applications]), [['Stage 1', 34, 1], ['Stage 2', 37, 1], ['Stage 3', 0, 0]]);
  assert.deepEqual(model.stageRows.map(row => row.isCurrent), [false, false, true]);
  assert.equal(model.stageRows[1].periodStart, '2026-09-13');
  assert.equal(model.stageRows[1].periodEnd, '2026-09-19');
  assert.equal(model.stageRows.at(-1).usesTodayBoundary, true);
  assert.deepEqual(input.stages, stages);
});

test('Stage question dedup is per interval while totals dedup across all intervals', () => {
  const model = buildOverviewActivity({ stages, personalState: { activities: [
    { id: 't1', kind: 'tech', questionId: 'same', count: 1, completedAt: stamp('2026-09-12') },
    { id: 't2', kind: 'tech', questionId: 'same', count: 1, completedAt: stamp('2026-09-14') },
    { id: 't3', kind: 'tech', questionId: 'same', count: 1, completedAt: stamp('2026-09-15') },
  ] } }, options);
  assert.equal(model.totals.technical, 1);
  assert.deepEqual(model.stageRows.map(row => row.technical), [1, 1, 0]);
  assert.equal(model.days.find(row => row.day === '2026-09-14').counts.technical, 1);
  assert.equal(model.days.find(row => row.day === '2026-09-15').counts.technical, 1);
});

test('real standalone session output and restored daily answers dedup against calendar and legacy records', () => {
  let personal = { practiceSessions: [createPracticeSession('tech', { id: 'bank-1', source: 'question-bank', title: 'Question', prompt: 'Why?', reference: 'Because.' }, { id: 's1', now: stamp('2026-09-19') })] };
  personal.practiceSessions[0] = { ...personal.practiceSessions[0], text: 'Answer', selfAssessment: 'independent' };
  personal = completePracticeSession(personal, 's1', stamp('2026-09-19', '13:00'));
  personal.dailySessions = [{ id: 'd1', questions: [{ id: 'q1', sourceProblemId: 'bank-1', kind: 'tech' }, { id: 'q2', kind: 'behavioral' }], answers: {
    q1: { text: 'Answer', selfAssessment: 'review', completedAt: stamp('2026-09-19') },
    q2: { text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-19') },
  } }];
  const model = buildOverviewActivity({ personalState: personal, legacyState: { problemStates: [done('bank-1', '2026-09-19')] } }, options);
  assert.equal(model.totals.technical, 1);
  assert.equal(model.totals.behavioral, 1);
});

test('saved Behavioral answers count while deleted events, Tech drafts and local reviews do not', () => {
  const model = buildOverviewActivity({ personalState: {
    removedActivityIds: ['b1', 'daily:d1:q1', 'practice:s1', 'mental:t1'],
    activities: [activity('behavioral', 'b1', 'removed'), { id: 'coding', kind: 'coding', source: 'standalone', questionId: 'two-sum', count: 1, completedAt: stamp('2026-09-19') }],
    behavioralAnswers: [{ id: 'draft', text: 'Text', updatedAt: stamp('2026-09-19') }],
    dailySessions: [{ id: 'd1', questions: [{ id: 'q1', kind: 'tech' }, { id: 'q2', kind: 'tech' }], answers: {
      q1: { text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-19') }, q2: { text: 'Draft', completedAt: stamp('2026-09-19') } } }],
    practiceSessions: [{ id: 's1', kind: 'tech', status: 'completed', question: { id: 'removed' }, text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-19') }],
    trials: [trial('t1', 10)],
  }, legacyState: { problemStates: [{ problemId: 'undated', completed: true }, { ...done('incomplete', '2026-09-19'), completed: false }] } }, options);
  assert.equal(model.totals.technical, 0);
  assert.equal(model.totals.behavioral, 1);
  assert.equal(model.today.counts.mentalMath, 0);
});

test('math average uses completed math correct counts, respects aliases and includes valid zero scores', () => {
  const model = buildOverviewActivity({ stages, personalState: { trials: [trial('complete', 10), trial('zero', 0),
    trial('aborted', 90, '2026-09-19', { status: 'aborted' }), trial('active', 90, '2026-09-19', { status: 'active' }),
    trial('pattern', 90, '2026-09-19', { settings: { trainer: 'pattern' } }), trial('sequence', 90, '2026-09-19', { settings: { trainer: 'sequence' } })],
    activities: [{ id: 'manual', kind: 'mental', source: 'manual', count: 100, completedAt: stamp('2026-09-19') }] },
    legacyState: { mentalMathRecords: [{ id: 'complete', correct: 999, score: 999, createdAt: stamp('2026-09-19') },
      { id: 'legacy', correct: 20, score: -5, createdAt: stamp('2026-09-19') }] } }, options);
  assert.equal(model.today.counts.mentalMath, 3);
  assert.equal(model.stageRows[1].mentalMathAverage, 10);
  assert.equal(model.stageRows[0].mentalMathAverage, null);
  assert.equal(model.stageRows[2].mentalMathAverage, null);
});

test('missing or inverted Stage dates are unknown and edits recalculate without guessing boundaries', () => {
  const bundle = collectOverviewRecords({ legacyState: { problemStates: [done('x', '2026-09-17')] }, leetcodeSnapshot: lc() }, options);
  const rows = summarizeOverviewStages([{ id: 'a', label: 'Stage 1', recordedDate: null }, { id: 'b', label: 'Stage 2', recordedDate: '2026-09-17' }], bundle, options);
  assert.equal(rows[0].technical, null);
  assert.equal(rows[1].technical, 0);
  const inverted = summarizeOverviewStages([{ id: 'a', label: 'Stage 1', recordedDate: '2026-09-18' }, { id: 'b', label: 'Stage 2', recordedDate: '2026-09-17' }], bundle, options);
  assert.equal(inverted[0].applications, null);
  const edited = summarizeOverviewStages([{ id: 'a', label: 'Stage 1', recordedDate: '2026-09-16' }, { id: 'b', label: 'Stage 2', recordedDate: '2026-09-18' }], bundle, options);
  assert.equal(edited[0].technical, 1);
});

test('unlinked, partial and genuinely empty LeetCode data stay distinguishable', () => {
  const unlinked = buildOverviewActivity({ leetcodeSnapshot: {} }, options);
  assert.equal(unlinked.totals.leetcode, null);
  assert.equal(unlinked.today.counts.leetcode, null);
  const empty = buildOverviewActivity({ leetcodeSnapshot: lc([], { coverage: {} }) }, options);
  assert.equal(empty.totals.leetcode, 0);
  assert.equal(empty.today.counts.leetcode, 0);
  const partial = buildOverviewActivity({ stages, leetcodeSnapshot: lc([ac('1', '2026-09-18')], { stats: { solved: 118 }, coverage: {} }) }, options);
  assert.equal(partial.totals.leetcode, 118);
  assert.equal(partial.today.counts.leetcode, null);
  assert.equal(partial.days.find(day => day.day === '2026-09-18').counts.leetcode, 1);
  assert.equal(partial.stageRows[0].leetcode, null);
  assert.equal(partial.stageRows[1].leetcode, 1);
  assert.equal(partial.stageRows[2].leetcode, 0, 'an empty same-day interval is mathematically zero');
  assert.match(partial.statusNote, /仅含已同步/);
});

test('unknown application years count cumulatively but cannot earn daily or Stage credit', () => {
  const model = buildOverviewActivity({ applications: [submitted('unknown', '9/19'), submitted('known', '9/19', 2026),
    submitted('invalid', '2/29', 2026), submitted('future', '2026-09-20')], stages }, options);
  assert.equal(model.totals.applications, 4);
  assert.equal(model.today.counts.applications, 1);
  assert.equal(model.stageRows[1].applications, 1);
});

test('local time conversion and future timestamps cannot create premature activity', () => {
  const model = buildOverviewActivity({ legacyState: { problemStates: [
    { problemId: 'local', completed: true, completedAt: '2026-09-20T01:00:00Z' },
    { problemId: 'future', completed: true, completedAt: '2026-09-21T01:00:00Z' },
  ] }, leetcodeSnapshot: lc([ac('1', '2026-09-20', 'two-sum', '01:00')]) }, {
    today: '2026-09-19', now: '2026-09-20T02:00:00Z', timeZone: 'America/Los_Angeles',
  });
  assert.equal(model.today.counts.technical, 1);
  assert.equal(model.today.counts.leetcode, 1);
  assert.equal(model.totals.technical, 1);
});

test('owner changes, read conflicts and QA cannot leak other-account training or cloud data', () => {
  const personal = { ownerId: 'old', snapshot: { data: { activities: [activity('behavioral', 'b1', 'private')] } }, legacyState: { problemStates: [done('private-tech', '2026-09-19')] } };
  const other = { ownerId: 'new', personal, leetcode: { ownerId: 'old', enabled: true, data: lc([ac('1', '2026-09-19')]) },
    tracker: { ownerId: 'old', applications: [submitted('private', '2026-09-19')] } };
  assert.deepEqual(resolveOverviewActivity(other, options).totals, { applications: null, technical: null, behavioral: null, experiences: null, leetcode: null, mock: null });
  const own = { ...other, ownerId: 'old' };
  assert.equal(resolveOverviewActivity(own, options).totals.technical, 1);
  assert.equal(resolveOverviewActivity({ ...own, namespace: 'qa', tracker: { ownerId: 'old', applications: [] } }, options).totals.technical, null);
  const conflict = { ...personal, snapshot: { ...personal.snapshot, conflict: true } };
  assert.equal(resolveOverviewActivity({ ...own, personal: conflict }, options).totals.behavioral, null);
  assert.equal(resolveOverviewActivity({ ...own, tracker: { ...own.tracker, syncError: 'blocked' } }, options).totals.applications, null);
});

test('old Behavioral answers retain their date while experience reads remain explicit', () => {
  let state = { activities: [], behavioralAnswers: [{ id: 'answer', text: 'My own experience', updatedAt: stamp('2026-09-18') }] };
  state = completeBehavioralPractice(state, { id: 'answer' }, stamp('2026-09-19'));
  state = completeBehavioralPractice(state, { id: 'answer' }, stamp('2026-09-19', '13:00'));
  state = markExperienceRead(state, 'read-note', stamp('2026-09-18'));
  state = markExperienceRead(state, 'read-note', stamp('2026-09-19'));
  const model = buildOverviewActivity({ personalState: state, legacyState: { interviewExperiences: [{ id: 'written-note' }] } }, options);
  assert.equal(model.totals.behavioral, 1);
  assert.equal(model.today.counts.behavioral, 0);
  assert.equal(model.days.find(day => day.day === '2026-09-18').counts.behavioral, 1);
  assert.equal(model.totals.experiences, 1);
});

test('strict ISO application instants use the viewer day while ambiguous date text is never guessed', () => {
  const model = buildOverviewActivity({ applications: [submitted('iso', '2026-09-20T01:00:00Z'),
    submitted('ambiguous', 'September 19 2026'), submitted('no-zone', '2026-09-19T12:00:00')] }, {
    today: '2026-09-19', now: '2026-09-20T02:00:00Z', timeZone: 'America/Los_Angeles',
  });
  assert.equal(model.totals.applications, 3);
  assert.equal(model.today.counts.applications, 1);
});

test('initial cloud load does not present an empty local snapshot as a confirmed zero', () => {
  const input = { ownerId: 'user', personal: { ownerId: 'user', snapshot: { data: {} }, cloudExpected: true, cloud: { phase: 'syncing' } },
    tracker: { ownerId: 'user', applications: [] } };
  const loading = resolveOverviewActivity(input, options);
  assert.equal(loading.totals.technical, null);
  assert.equal(loading.totals.behavioral, null);
  assert.equal(loading.totals.applications, null);
  const confirmed = resolveOverviewActivity({ ...input, personal: { ...input.personal, cloud: { phase: 'synced' } } }, options);
  assert.equal(confirmed.totals.technical, 0);
  assert.equal(confirmed.totals.applications, 0);
  const cached = resolveOverviewActivity({ ...input, personal: { ...input.personal, cloud: { phase: 'error' },
    legacyState: { problemStates: [done('cached', '2026-09-19')] } } }, options);
  assert.equal(cached.totals.technical, 1);
  assert.match(cached.statusNote, /尚未同步完成/);
});

test('a failed LeetCode refresh preserves verified cached numbers with a clear status', () => {
  const model = resolveOverviewActivity({ ownerId: 'user', personal: { ownerId: 'user', snapshot: { data: {} } },
    tracker: { ownerId: 'user', applications: [] },
    leetcode: { ownerId: 'user', enabled: true, phase: 'error', data: lc([ac('cached', '2026-09-19')]) } }, options);
  assert.equal(model.totals.leetcode, 1);
  assert.equal(model.today.counts.leetcode, 1);
  assert.match(model.statusNote, /暂未刷新/);
});
