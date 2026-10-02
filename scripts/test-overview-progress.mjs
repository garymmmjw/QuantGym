import assert from 'node:assert/strict';
import test from 'node:test';
import { createOverviewPageApi } from '../src/app/services/overviewPageApi.js';

const PAST = '2020-01-01T12:00:00.000Z';
const FUTURE = '2999-01-01T12:00:00.000Z';
const problem = (id, category = 'probability', extra = {}) => ({ id, category, ...extra });
const completed = problemId => ({ problemId, completed: true, completedAt: PAST });
const attempt = (id, recordedAt = PAST, outcome = 'correct') => ({
  id, startedAt: recordedAt, recordedAt, updatedAt: recordedAt,
  outcome, elapsedSeconds: 10, answerViewed: false, hintViewed: false
});

function withState(problems, problemStates = [], extra = {}) {
  return createOverviewPageApi({ getState: () => ({ problems, problemStates }), ...extra });
}

test('overview reads saved completions when the legacy completion helper is not exposed', () => {
  const api = withState([problem('done'), problem('new')], [completed('done')]);
  const [all] = api.getProblemProgress();
  assert.equal(all.key, 'all');
  assert.equal(all.done, 1);
  assert.equal(all.total, 2);
  assert.equal(all.percent, 50);
  assert.equal(all.percentLabel, '50');
});

test('overview preserves the personal-state accessor binding and prefers its current records', () => {
  const deps = {
    records: new Map([['done', completed('done')]]),
    getCatalogProblems: () => [problem('done'), problem('new')],
    getState: () => ({ problemStates: [] }),
    getProblemPersonalState(id) { return this.records.get(id) || {}; }
  };
  const api = createOverviewPageApi(deps);
  assert.equal(api.getProblemProgress()[0].done, 1);
  deps.records = new Map();
  assert.equal(api.getProblemProgress()[0].done, 0);
});

test('overview counts attempted questions once across outcomes and repeated practice', () => {
  const api = withState(
    [problem('correct'), problem('idea'), problem('wrong'), problem('favorite'), problem('future')],
    [
      { problemId: 'correct', freePracticeAttempts: [attempt('first'), attempt('repeat', '2020-01-03T12:00:00.000Z')] },
      { problemId: 'idea', freePracticeAttempts: [attempt('idea', PAST, 'idea_wrong')] },
      { problemId: 'wrong', freePracticeAttempts: [attempt('wrong', PAST, 'wrong')] },
      { problemId: 'favorite', favorite: true, lastViewedAt: PAST, freePracticeSession: { id: 'active', startedAt: PAST } },
      { problemId: 'future', freePracticeAttempts: [attempt('future', FUTURE)] }
    ]
  );
  const [all] = api.getProblemProgress();
  assert.equal(all.done, 3);
  assert.equal(all.total, 5);
  assert.equal(all.percent, 60);
});

test('duplicate catalog entries do not inflate either the numerator or denominator', () => {
  const api = withState(
    [problem('done'), problem('done'), problem('new'), problem('new')],
    [completed('done')]
  );
  for (const row of api.getProblemProgress()) {
    assert.equal(row.done, 1);
    assert.equal(row.total, 2);
    assert.equal(row.percent, 50);
  }
});

test('LeetCode questions are excluded by metadata from totals and category rows', () => {
  const problems = [
    problem('regular'), problem('lc-category', 'leetcode'),
    problem('lc-source', 'coding', { source: 'leetcode' }),
    problem('lc-url', 'coding', { sourceUrl: 'https://leetcode.cn/problems/two-sum/' }),
    problem('leetcode-prefixed', 'coding')
  ];
  const rows = withState(problems, problems.map(item => completed(item.id))).getProblemProgress();
  assert.equal(rows[0].done, 1);
  assert.equal(rows[0].total, 1);
  assert.deepEqual(rows.map(row => row.key), ['all', 'probability']);
});

test('overview always shows all questions followed by the two largest categories', () => {
  const problems = [problem('c', 'coding'), problem('d1', 'derivatives'), problem('d2', 'derivatives'),
    problem('p1'), problem('p2'), problem('p3')];
  const api = withState(problems, [completed('d1'), completed('p1')], {
    buildProblemProgressItems: () => [{ key: 'custom', label: 'Custom collection', done: 999, total: 999 }],
    getProblemThemeEntries: () => [{ key: 'probability', label: '概率 / 期望' }, { key: 'derivatives', label: '期权 / 衍生品' }]
  });
  const rows = api.getProblemProgress();
  assert.deepEqual(rows.map(row => [row.key, row.done, row.total]), [
    ['all', 2, 6], ['probability', 1, 3], ['derivatives', 1, 2]
  ]);
  assert.deepEqual(rows.map(row => row.label), ['全部题库', '概率 / 期望', '期权 / 衍生品']);
  assert.deepEqual(rows.map(row => row.accentIndex), [0, 1, 2]);
});

test('zero, small, fractional and full completion retain accurate bar widths and labels', () => {
  for (const { done, total, label } of [
    { done: 0, total: 4580, label: '0' },
    { done: 1, total: 4580, label: '<0.1' },
    { done: 1, total: 3, label: '33.3' },
    { done: 1, total: 1, label: '100' },
    { done: 9999, total: 10000, label: '99.9' }
  ]) {
    const problems = Array.from({ length: total }, (_, index) => problem(`q-${index}`));
    const records = problems.slice(0, done).map(item => completed(item.id));
    const [all] = withState(problems, records).getProblemProgress();
    assert.equal(all.done, done);
    assert.equal(all.total, total);
    assert.equal(all.percent, done / total * 100);
    assert.equal(all.percentLabel, label);
  }
});

test('replacing the account state recomputes progress without keeping a stale completion map', () => {
  const problems = [problem('one'), problem('two')];
  let state = { problems, problemStates: [completed('one')] };
  const api = createOverviewPageApi({ getState: () => state });
  assert.equal(api.getProblemProgress()[0].done, 1);
  state = { problems, problemStates: [completed('one'), completed('two')] };
  assert.equal(api.getProblemProgress()[0].done, 2);
  state = { problems, problemStates: [] };
  assert.equal(api.getProblemProgress()[0].done, 0);
});

test('empty and LeetCode-only catalogs expose no misleading progress row', () => {
  assert.deepEqual(withState([]).getProblemProgress(), []);
  assert.deepEqual(withState([problem('leetcode-one', 'leetcode')], [completed('leetcode-one')]).getProblemProgress(), []);
});
