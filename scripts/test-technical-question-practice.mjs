import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { recordFreePracticeOutcome, FREE_PRACTICE_WINDOW_MS as DAY } from '../src/modules/problems/freePracticeAttempts.js';
import { getFreePracticeActivities } from '../src/modules/problems/practiceActivity.js';
import { collectCalendarActivities, localDayKey, summarizeActivities } from '../src/features/personal/calendar/calendarModel.js';
import { collectStagePractice, summarizeStagePractice } from '../src/features/careerStages/stagePractice.js';
import { getSavedQuestionCount } from '../src/features/careerStages/stageStore.js';
import { buildOverviewActivity } from '../src/features/overview/activityMetrics.js';
import { getProblemCompletionCount } from '../src/modules/problems/progress.js';
import { getContributionStatsByDay } from '../src/modules/overview/data.js';

const at = new Date(2026, 8, 20, 12).getTime();
const end = at + DAY * 3;
const stamp = time => new Date(time).toISOString();
const attempted = (id, outcome = 'wrong', time = at) => ({ problemId: id, ...recordFreePracticeOutcome({}, outcome, time, `${id}:${time}`) });
const legacy = records => ({ problemStates: records, problems: records.map(record => ({ id: record.problemId, category: 'probabilityExpectation' })) });
const model = state => buildOverviewActivity({ legacyState: state }, { today: localDayKey(at), now: end });

test('every submitted outcome updates technical tasks, calendar, overview and Stage without requiring a legacy completed flag', () => {
  const state = legacy([attempted('wrong'), attempted('idea', 'idea_wrong'), attempted('correct', 'correct')]);
  const activities = collectCalendarActivities({}, state).activities;
  assert.equal(summarizeActivities(activities).tech, 3);
  assert.equal(model(state).today.counts.technical, 3);
  assert.equal(model(state).totals.technical, 3);
  const stages = [{ id: 'first', label: 'Stage 1', recordedDate: localDayKey(at - DAY) }];
  assert.equal(summarizeStagePractice(stages, collectStagePractice({}, state), { today: localDayKey(at) })[0].questionCount, 3);
  assert.equal(getProblemCompletionCount(state.problems, id => state.problemStates.find(record => record.problemId === id)), 3);
  assert.equal(getContributionStatsByDay({ ...state, today: new Date(end) }).get(localDayKey(at)).completed, 3);
  assert.equal(getSavedQuestionCount({ ownerId: 'alice', storage: { getItem: () => JSON.stringify(state) } }), 3);
});

test('viewing, ongoing timers, invalid records and future submissions do not complete a question', () => {
  const state = legacy([{ problemId: 'open', freePracticeSession: { id: 'draft', startedAt: stamp(at), answerViewed: true } },
    { problemId: 'broken', freePracticeAttempts: [{ id: 'bad', recordedAt: stamp(at), outcome: 'incorrect' }] }, attempted('future', 'correct', end + DAY)]);
  assert.deepEqual(getFreePracticeActivities(state, { now: end }), []);
  assert.equal(model(state).today.counts.technical, 0);
});

test('24-hour revisions and cloud duplicates stay one attempt at the original completion time', () => {
  const first = attempted('q1');
  const revised = { ...first, ...recordFreePracticeOutcome(first, 'correct', at + 5000) };
  const simultaneous = attempted('q1', 'idea_wrong', at + 1000);
  const state = legacy([revised, simultaneous]);
  const activities = getFreePracticeActivities(state, { now: end });
  assert.equal(activities.length, 1);
  assert.equal(activities[0].completedAt, stamp(at));
  assert.equal(activities[0].outcome, 'correct');
  assert.equal(model(state).totals.technical, 1);
});

test('cross-day practice remains daily activity while lifetime and Stage technical totals count distinct questions', () => {
  const first = attempted('q1');
  const repeated = { ...first, ...recordFreePracticeOutcome(first, 'correct', at + DAY + 1000) };
  const state = legacy([repeated]);
  const projection = buildOverviewActivity({ legacyState: state }, { today: localDayKey(at + DAY), now: end });
  assert.equal(getFreePracticeActivities(state, { now: end }).length, 2);
  assert.equal(projection.today.counts.technical, 1);
  assert.equal(projection.totals.technical, 1);
  assert.equal(collectStagePractice({}, state).records.length, 2);
});

test('legacy completion mirrors do not count again and LeetCode remains owned by verified submissions', () => {
  const first = attempted('q1');
  const state = legacy([{ ...first, completed: true, completedAt: stamp(at + 4000) }, attempted('leetcode-two-sum')]);
  state.problems[1].category = 'leetcode';
  const personal = { activities: [{ id: 'legacy', kind: 'tech', problemId: 'q1', count: 1, completedAt: stamp(at + 4000) }],
    practiceSessions: [{ id: 'old', kind: 'tech', status: 'completed', question: { id: 'q1' }, text: 'Saved answer', selfAssessment: 'independent', completedAt: stamp(at) }] };
  const collected = collectCalendarActivities(personal, state);
  assert.equal(summarizeActivities(collected.activities).totalQuestions, 1);
  const projection = buildOverviewActivity({ personalState: personal, legacyState: state }, { today: localDayKey(at), now: end });
  assert.equal(projection.totals.technical, 1);
  assert.equal(projection.totals.leetcode, null);
});

test('legacy Technical Interview route forwards the full question selection and keeps the AI mock separate', () => {
  const page = fs.readFileSync(new URL('../src/pages/TechnicalInterviewPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /pathname: '\/problems'/);
  assert.match(page, /search: location\.search/);
  assert.match(fs.readFileSync(new URL('../src/pages/InterviewPage.jsx', import.meta.url), 'utf8'), /InterviewPageContent/);
});
