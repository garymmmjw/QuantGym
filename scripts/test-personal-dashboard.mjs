import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardModel } from '../src/features/personal/dashboard/dashboardModel.js';
import { createPersonalState } from '../src/features/personal/personalStore.js';
import { createTrial, transitionTrial } from '../src/features/personal/mental/mentalEngine.js';
import { createDailySession } from '../src/features/personal/daily/dailyEngine.js';
import { saveApplication, setApplicationArchived } from '../src/features/personal/applications/applicationModel.js';

const now = new Date(2026, 8, 9, 12, 0, 0);
function day(offset) { const date = new Date(now); date.setDate(date.getDate() + offset); return date.toISOString(); }
const mathSettings = { durationSeconds: 10, operations: ['add'], ranges: { add: { minA: 2, maxA: 2, minB: 3, maxB: 3 } } };
function trial(id, correct, offset = -1, settings = mathSettings, abort = false) {
  const start = Date.parse(day(offset));
  let value = createTrial(settings, { id, now: start });
  for (let count = 0; count < correct; count += 1) value = transitionTrial(value, { type: 'input', value: String(value.currentQuestion.answer) }, start + (count + 1) * 100);
  return transitionTrial(value, { type: abort ? 'abort' : 'tick' }, start + (abort ? 2000 : settings.durationSeconds * 1000));
}
const session = (id, offset) => createDailySession({ mentalEnabled: false, techSource: 'practice', techCount: 1, codingCount: 0, behavioralCount: 0 }, { id, startedAt: day(offset) });

test('the empty dashboard has zero actual work, no fake opportunities, and no personal best', () => {
  const model = getDashboardModel(createPersonalState(), {}, now);
  assert.equal(model.today, '2026-09-09');
  assert.equal(model.week.length, 7);
  assert.ok(model.week.every(item => item.totalQuestions === 0 && item.activityCount === 0));
  assert.equal(model.weekActiveDays, 0);
  assert.equal(model.todaySummary.totalQuestions, 0);
  assert.equal(model.activeSession, null);
  assert.deepEqual(model.dailyProgress, { completed: 0, total: 0, complete: false });
  assert.deepEqual(model.dueReviews, []);
  assert.deepEqual(model.applications, []);
  assert.deepEqual(model.upcoming, []);
  assert.equal(model.latestTrial, null);
  assert.equal(model.mentalBest, null);
});

test('today and week totals count real activities once, including linked mental trials and dated legacy records', () => {
  const finished = trial('today-trial', 3, 0);
  const state = { ...createPersonalState(), trials: [finished], activities: [
    { id: 'quant-today', kind: 'quant', count: 2, completedAt: day(0) },
    { id: 'mental:today-trial', kind: 'mental', trialId: finished.id, count: 3, completedAt: finished.completedAt },
    { id: 'quant-yesterday', kind: 'quant', count: 4, completedAt: day(-1) },
    { id: 'outside-week', kind: 'tech', count: 100, completedAt: day(-8) },
  ] };
  const legacy = { problems: [{ id: 'coding-1', category: 'coding' }, { id: 'undated-1', category: 'math' }],
    problemStates: [{ problemId: 'coding-1', completed: true, completedAt: day(0) }, { problemId: 'undated-1', completed: true }],
    skills: { mentalMath: { xp: 1000000 } }, interviewHistory: [{ score: 100 }],
  };
  const model = getDashboardModel(state, legacy, now);
  assert.equal(model.todaySummary.quant, 2);
  assert.equal(model.todaySummary.mental, 3);
  assert.equal(model.todaySummary.mentalTrials, 1);
  assert.equal(model.todaySummary.coding, 1);
  assert.equal(model.todaySummary.tech, 0);
  assert.equal(model.todaySummary.totalQuestions, 6);
  assert.equal(model.week.reduce((sum, item) => sum + item.totalQuestions, 0), 10);
  assert.equal(model.weekActiveDays, 2);
});

test('mental personal best compares only complete trials matching the latest complete trial settings', () => {
  const latest = trial('latest', 2, 0);
  const best = trial('same-settings-best', 5, -3);
  const differentDuration = trial('other-duration', 7, -2, { ...mathSettings, durationSeconds: 20 });
  const differentRange = trial('other-range', 8, -2, { ...mathSettings, ranges: { add: { minA: 10, maxA: 10, minB: 20, maxB: 20 } } });
  const abandoned = trial('abandoned', 9, 1, mathSettings, true);
  const state = { ...createPersonalState(), mentalSettings: differentDuration.settings, trials: [differentDuration, abandoned, best, latest, differentRange] };
  const before = JSON.stringify(state);
  const model = getDashboardModel(state, {}, now);
  assert.equal(model.latestTrial.id, 'latest');
  assert.equal(model.mentalBest, 5);
  assert.equal(JSON.stringify(state), before);
});

test('continue training selects the newest active session even when a backup array is unsorted', () => {
  const older = session('older', -3), latest = session('latest', -1);
  const state = { ...createPersonalState(), dailySessions: [latest, older] };
  const model = getDashboardModel(state, {}, now);
  assert.equal(model.activeSession.id, 'latest');
  assert.deepEqual(model.dailyProgress, { completed: 0, total: 1, complete: false });
});

test('only actual difficult completed answers appear as due reviews, and a future review removes them from today', () => {
  const practice = session('real-practice', -1);
  const question = practice.questions[0];
  practice.answers[question.id] = { text: 'Saved answer needing review', completedAt: day(-1), selfAssessment: 'review' };
  const state = { ...createPersonalState(), dailySessions: [practice] };
  assert.equal(getDashboardModel(state, {}, now).dueReviews.length, 1);
  state.reviewEvents = [{ id: 'reviewed', questionKey: question.id, reviewedAt: day(0), rating: 'good', note: '' }];
  assert.equal(getDashboardModel(state, {}, now).dueReviews.length, 0);
});

test('upcoming applications expose the actual deadline or action kind and omit archived and rejected entries', () => {
  let state = createPersonalState();
  state = saveApplication(state, null, { company: 'Real opportunity', role: 'Quant researcher', deadline: '2026-09-10', nextAction: 'Phone interview', nextActionDate: '2026-09-15' }, { newApplicationId: 'upcoming', now: day(0) });
  state = saveApplication(state, null, { company: 'Rejected opportunity', role: 'Trader', deadline: '2026-09-08', status: 'rejected' }, { newApplicationId: 'rejected', now: day(0) });
  state = saveApplication(state, null, { company: 'Archived opportunity', role: 'Trader', deadline: '2026-09-07' }, { newApplicationId: 'archived', now: day(0) });
  state = setApplicationArchived(state, 'archived', true);
  const model = getDashboardModel(state, {}, now);
  assert.equal(model.applications.length, 2);
  assert.equal(model.upcoming.length, 1);
  assert.equal(model.upcoming[0].id, 'upcoming');
  assert.equal(model.upcoming[0].upcomingDate, '2026-09-10');
  assert.equal(model.upcoming[0].upcomingKind, 'deadline');
  assert.equal(model.upcoming[0].nextActionDate, '2026-09-15');
  assert.equal(model.upcoming[0].overdue, false);
});
