import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  DEFAULT_DAILY_SETTINGS, normalizeDailySettings, hasDailySections, dailyBudgetSeconds,
  selectDailyQuestions, createDailySession, getLibraryTechQuestions, getDailyProgress,
  updateDailyAnswer, setDailyQuestionTimer, getQuestionElapsed, completeDailyQuestion,
  completeDailyMental, preferredDailySession, localDateKey,
} from '../src/features/personal/daily/dailyEngine.js';
import { CODING_QUESTIONS, TECH_QUESTIONS, BEHAVIORAL_QUESTIONS } from '../src/features/personal/daily/questionBank.js';

const start = '2026-09-09T12:00:00.000Z';
const later = '2026-09-09T12:02:00.000Z';
const options = { id: 'test-session', dateKey: '2026-09-09', startedAt: start };
const oneTech = { ...DEFAULT_DAILY_SETTINGS, mentalEnabled: false, techCount: 1, codingCount: 0, behavioralCount: 0 };
const stateFor = settings => ({ dailySessions: [createDailySession(settings, options)], activities: [], trials: [] });
const writeAnswer = (state, id, patch = { text: 'My reasoning', selfAssessment: 'independent' }) => updateDailyAnswer(state, 'test-session', id, patch);

test('default daily routine is 120 seconds + 3 tech + 3 coding + 1 behavioral', () => {
  assert.deepEqual(normalizeDailySettings(), DEFAULT_DAILY_SETTINGS);
  assert.deepEqual(normalizeDailySettings(null), DEFAULT_DAILY_SETTINGS);
  assert.equal(dailyBudgetSeconds(DEFAULT_DAILY_SETTINGS), 80 * 60);
  const session = createDailySession({}, options);
  assert.equal(session.questions.length, 7);
  assert.deepEqual(getDailyProgress(session), { total: 8, completed: 0, complete: false });
});

test('counts and budgets stay within bounds, and every section can be disabled', () => {
  const normalized = normalizeDailySettings({ mentalSeconds: -100, techCount: 100, codingCount: -2, behavioralCount: NaN, techMinutes: Infinity, codingMinutes: 9000 });
  assert.equal(normalized.mentalSeconds, 30);
  assert.equal(normalized.techCount, 8);
  assert.equal(normalized.codingCount, 0);
  assert.equal(normalized.behavioralCount, 1);
  assert.equal(normalized.techMinutes, 5);
  assert.equal(normalized.codingMinutes, 120);
  const disabled = { mentalEnabled: false, techCount: 0, codingCount: 0, behavioralCount: 0 };
  assert.equal(hasDailySections(disabled), false);
  assert.throws(() => createDailySession(disabled, options), /at least one/);
});

test('seeded selections are stable, distinct, and support all counts through eight', () => {
  const first = selectDailyQuestions({}, 'seed-a');
  assert.deepEqual(selectDailyQuestions({}, 'seed-a'), first);
  assert.notDeepEqual(selectDailyQuestions({}, 'seed-b'), first);
  const max = selectDailyQuestions({ techCount: 8, codingCount: 8, behavioralCount: 8 }, 'all');
  assert.equal(max.length, 24);
  assert.equal(new Set(max.map(question => question.id)).size, 24);
  assert.ok(TECH_QUESTIONS.length >= 12 && CODING_QUESTIONS.length >= 8 && BEHAVIORAL_QUESTIONS.length >= 8);
});

test('existing library contributes only usable tech questions and safe source URLs', () => {
  const valid = { id: 'legacy-1', category: 'probability', titleZh: '均匀分布', promptZh: '给定独立均匀分布样本，如何推导其中最小值的期望并验证结果？', answer: 'Integrate the survival function.', sourceUrl: 'javascript:alert(1)' };
  const problems = [valid, { ...valid }, { ...valid, id: 'same-prompt' }, { ...valid, id: 'coding', category: 'leetcode' }, { ...valid, id: 'missing', answer: '' }, { ...valid, id: 'image', promptZh: '![](https://example.com/problem.png) the problem' }];
  assert.equal(getLibraryTechQuestions(problems).length, 1);
  assert.equal(getLibraryTechQuestions(problems)[0].sourceUrl, '');
  const session = createDailySession({}, { ...options, problems });
  assert.equal(session.questions[0].id, 'library-tech-legacy-1');
  assert.equal(session.questions.filter(question => question.kind === 'tech').length, 3);
  valid.promptZh = 'changed after the session began';
  assert.notEqual(session.questions[0].prompt, valid.promptZh);
  assert.equal(createDailySession({ techSource: 'practice' }, { ...options, problems }).questions.some(question => question.source === 'library'), false);
});

test('reload keeps exact question snapshots, drafts, settings and session preference', () => {
  let state = stateFor({});
  const id = state.dailySessions[0].questions[0].id;
  state = writeAnswer(state, id, { text: 'Draft survives', codeLanguage: 'cpp' });
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restored, state);
  assert.equal(preferredDailySession(restored.dailySessions).answers[id].text, 'Draft survives');
  assert.deepEqual(restored.dailySessions[0].questions, state.dailySessions[0].questions);
  assert.match(localDateKey(new Date(2026, 8, 9)), /^2026-09-09$/);
});

test('empty answers and missing self-review cannot complete or generate events', () => {
  let state = stateFor(oneTech);
  const id = state.dailySessions[0].questions[0].id;
  assert.equal(completeDailyQuestion(state, 'test-session', id, later), state);
  state = writeAnswer(state, id, { text: '   ', selfAssessment: 'independent' });
  assert.equal(completeDailyQuestion(state, 'test-session', id, later), state);
  state = stateFor(oneTech);
  state = writeAnswer(state, id, { text: 'Some answer' });
  assert.equal(completeDailyQuestion(state, 'test-session', id, later), state);
  assert.equal(state.activities.length, 0);
});

test('answer patch cannot forge completion metadata or invalid self-grades', () => {
  const state = stateFor(oneTech);
  const id = state.dailySessions[0].questions[0].id;
  assert.equal(writeAnswer(state, id, { completedAt: later, elapsedSeconds: 100, selfAssessment: 'correct' }), state);
  assert.equal(updateDailyAnswer(state, 'test-session', 'unknown-id', { text: 'answer' }), state);
});

test('question timers pause, resume and recover elapsed time after a reload', () => {
  let state = stateFor(oneTech);
  const id = state.dailySessions[0].questions[0].id;
  state = setDailyQuestionTimer(state, 'test-session', id, true, start);
  assert.equal(getQuestionElapsed(JSON.parse(JSON.stringify(state.dailySessions[0].answers[id])), Date.parse(later)), 120);
  state = setDailyQuestionTimer(state, 'test-session', id, false, later);
  assert.equal(getQuestionElapsed(state.dailySessions[0].answers[id], Date.parse(later) + 90000), 120);
  state = setDailyQuestionTimer(state, 'test-session', id, true, later);
  assert.equal(getQuestionElapsed(state.dailySessions[0].answers[id], Date.parse(later) + 3000), 123);
});

test('starting another question pauses the previous question timer', () => {
  let state = stateFor({ ...oneTech, techCount: 2 });
  const [a, b] = state.dailySessions[0].questions;
  state = setDailyQuestionTimer(state, 'test-session', a.id, true, start);
  state = setDailyQuestionTimer(state, 'test-session', b.id, true, later);
  assert.equal(state.dailySessions[0].answers[a.id].timerStartedAt, null);
  assert.equal(state.dailySessions[0].answers[a.id].elapsedSeconds, 120);
  assert.equal(state.dailySessions[0].answers[b.id].timerStartedAt, later);
});

test('finishing a question records one self-assessment and finishing the routine records one daily event', () => {
  let state = stateFor(oneTech);
  const id = state.dailySessions[0].questions[0].id;
  state = writeAnswer(state, id);
  state = setDailyQuestionTimer(state, 'test-session', id, true, start);
  state = completeDailyQuestion(state, 'test-session', id, later);
  assert.equal(state.dailySessions[0].status, 'completed');
  assert.equal(state.dailySessions[0].answers[id].elapsedSeconds, 120);
  assert.equal(state.dailySessions[0].answers[id].timerStartedAt, null);
  assert.deepEqual(state.activities.map(item => item.kind), ['tech', 'daily']);
  assert.equal(state.activities[0].selfAssessment, 'independent');
  assert.equal(state.activities[1].sessionId, 'test-session');
  assert.equal(completeDailyQuestion(state, 'test-session', id, later), state);
  assert.equal(writeAnswer(state, id, { text: 'cannot silently revise a completed answer' }), state);
});

test('a partial or unrelated mental trial never satisfies the mental section', () => {
  const state = stateFor({ mentalEnabled: true, techCount: 0, codingCount: 0, behavioralCount: 0 });
  const trial = { id: 'trial-1', dailySessionId: 'test-session', completedAt: later };
  assert.equal(completeDailyMental(state, 'test-session', { ...trial, status: 'aborted' }, later), state);
  assert.equal(completeDailyMental(state, 'test-session', { ...trial, status: 'active' }, later), state);
  assert.equal(completeDailyMental(state, 'test-session', { ...trial, dailySessionId: 'other', status: 'completed' }, later), state);
  assert.equal(completeDailyMental(state, 'test-session', { ...trial, dailySessionId: undefined, status: 'completed' }, later), state);
});

test('mental-only daily sessions complete once without duplicating the trainer activity', () => {
  let state = stateFor({ mentalEnabled: true, techCount: 0, codingCount: 0, behavioralCount: 0 });
  const trial = { id: 'trial-1', dailySessionId: 'test-session', status: 'completed', completedAt: later, correct: 8 };
  state.activities = [{ id: 'mental:trial-1', kind: 'mental', count: 8, completedAt: later }];
  state = completeDailyMental(state, 'test-session', trial, later);
  assert.equal(state.dailySessions[0].status, 'completed');
  assert.equal(state.dailySessions[0].mentalTrialId, 'trial-1');
  assert.deepEqual(state.activities.map(item => item.kind), ['mental', 'daily']);
  assert.equal(completeDailyMental(state, 'test-session', trial, later), state);
});

test('other questions can finish before mental math; the entire session waits for mental completion', () => {
  let state = stateFor({ ...oneTech, mentalEnabled: true });
  const id = state.dailySessions[0].questions[0].id;
  state = completeDailyQuestion(writeAnswer(state, id), 'test-session', id, later);
  assert.equal(state.dailySessions[0].status, 'active');
  assert.equal(state.activities.filter(item => item.kind === 'daily').length, 0);
  state = completeDailyMental(state, 'test-session', { id: 'trial-1', status: 'completed', dailySessionId: 'test-session', completedAt: later }, later);
  assert.equal(state.dailySessions[0].status, 'completed');
  assert.equal(state.activities.filter(item => item.kind === 'daily').length, 1);
});

test('draft editing preserves other sessions and all unrelated shared state', () => {
  let state = { ...stateFor(oneTech), marker: { untouched: true }, activeTrial: { id: 'ongoing' } };
  state.dailySessions.push(createDailySession({}, { ...options, id: 'second-session' }));
  const other = state.dailySessions[1];
  const marker = state.marker;
  state = writeAnswer(state, state.dailySessions[0].questions[0].id);
  assert.equal(state.dailySessions[1], other);
  assert.equal(state.marker, marker);
  assert.deepEqual(state.activeTrial, { id: 'ongoing' });
});

test('all JavaScript coding references solve the stated examples and important edge cases', () => {
  const cases = [
    ['coding-target-pair', 'targetPair', [[[4, 2, 7, 2], 4], [1, 3]], [[[1, 3], 8], []], [[[], 1], []]],
    ['coding-best-segment', 'maximumSum', [[[-3, 4, -1, 2, -6, 3]], 5], [[[-5, -2, -8]], -2], [[[0]], 0]],
    ['coding-merge-windows', 'mergeIntervals', [[[[5, 8], [1, 3], [3, 6], [10, 11]]], [[1, 8], [10, 11]]], [[[]], []]],
    ['coding-distinct-window', 'longestDistinct', [['abcaefbb'], 5], [[''], 0], [['aa'], 1]],
    ['coding-rolling-average', 'movingAverages', [[[2, 5, 8, 3], 2], [3.5, 6.5, 5.5]], [[[-2], 1], [-2]]],
    ['coding-balanced-brackets', 'balancedBrackets', [['{[()]}'], true], [['([)]'], false], [[''], true], [[')'], false]],
    ['coding-first-match', 'firstMatch', [[[1, 2, 2, 2, 5], 2], 1], [[[], 3], -1], [[[1, 3], 2], -1]],
    ['coding-fewest-coins', 'fewestCoins', [[[1, 3, 4], 6], 2], [[[2, 4], 3], -1], [[[3], 0], 0]],
  ];
  for (const [id, fn, ...examples] of cases) {
    const question = CODING_QUESTIONS.find(item => item.id === id);
    assert.ok(question.examples.length >= 2 && question.constraints.length >= 2);
    for (const language of ['python', 'javascript', 'cpp']) assert.ok(question.solutions[language].length > 70);
    for (const [args, expected] of examples) {
      const actual = vm.runInNewContext(`${question.solutions.javascript}\nJSON.stringify(${fn}(...input))`, { input: args }, { timeout: 1000 });
      assert.deepEqual(JSON.parse(actual), expected, id);
    }
  }
});
