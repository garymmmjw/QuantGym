import assert from 'node:assert/strict';
import test from 'node:test';
import { createOverviewPageApi } from '../src/app/services/overviewPageApi.js';
import { mergeProblems, normalizeCategory, normalizeProblem } from '../src/modules/problems/data.js';

const PAST = '2020-01-01T12:00:00.000Z';
const FUTURE = '2999-01-01T12:00:00.000Z';
const problem = (id, category = 'probability', extra = {}) => ({ id, category, source: 'quantguide', ...extra });
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

test('overview includes all five question-page banks and excludes other library sources and their practice', () => {
  const bankSources = ['quantguide', 'interview-xiaohongshu', 'interview-onepoint3acres', 'interview-glassdoor', 'question-bank'];
  const librarySources = ['green-book', 'yellow-book', 'red-book', 'hull-derivatives', 'stefanica-fe-math',
    'quantitative-primer', 'dudeney-puzzles', 'linalg-primer', 'probability-stochastic-10',
    'stat110-strategic-practice', 'stanford-msande214-hw3', 'probabilitycourse-solved-samples',
    'boyd-cvxbook-additional-exercises', 'etheridge-finmath-problem-sheets'];
  const bankProblems = bankSources.map(source => problem(`bank-${source}`, 'probability', { source }));
  const libraryProblems = librarySources.map(source => problem(`library-${source}`, 'option', { source }));
  const records = [completed(bankProblems[0].id),
    { problemId: bankProblems[1].id, freePracticeAttempts: [attempt('bank-attempt')] },
    ...libraryProblems.map((item, index) => index % 2 ? completed(item.id)
      : { problemId: item.id, freePracticeAttempts: [attempt(`library-attempt-${index}`)] })];
  const rows = withState([...bankProblems, ...libraryProblems], records).getProblemProgress();
  assert.deepEqual(rows.map(({ key, done, total }) => ({ key, done, total })), [
    { key: 'all', done: 2, total: 5 }, { key: 'probability', done: 2, total: 5 }
  ]);
  assert.equal(rows[0].percent, 40);
});

test('a bank-looking book slug or missing source cannot admit an unrelated question', () => {
  const problems = [problem('bank'),
    problem('missing-source', 'probability', { source: undefined, bookSlug: 'quantguide' }),
    problem('empty-source', 'probability', { source: '', bookSlug: 'question-bank' }),
    problem('library-source', 'probability', { source: 'green-book', bookSlug: 'interview-glassdoor' }),
    problem('unknown-source', 'probability', { source: 'new-library-source' })];
  const [all] = withState(problems, problems.map(item => completed(item.id))).getProblemProgress();
  assert.equal(all.done, 1);
  assert.equal(all.total, 1);
});

test('a duplicate outside the five banks cannot replace an included question', () => {
  const problems = [problem('same-id', 'probability'),
    problem('same-id', 'option', { source: 'hull-derivatives' })];
  const rows = withState(problems, [completed('same-id')]).getProblemProgress();
  assert.deepEqual(rows.map(({ key, done, total }) => ({ key, done, total })), [
    { key: 'all', done: 1, total: 1 }, { key: 'probability', done: 1, total: 1 }
  ]);
});

test('category ranking uses only the five banks, independent of library navigation and list filters', () => {
  const problems = [problem('p1'), problem('p2'), problem('p3'),
    problem('b1', 'behavioral'), problem('b2', 'behavioral'), problem('o1', 'option'),
    ...Array.from({ length: 10 }, (_, index) => problem(`library-${index}`, 'option', { source: 'hull-derivatives' }))];
  let filters = { source: 'all', theme: 'all', viewMode: 'all' };
  const api = withState(problems, [completed('b1'), completed('library-0')], {
    getProblemFilterState: () => filters
  });
  const expected = [['all', 1, 6], ['probability', 0, 3], ['behavioral', 1, 2]];
  const progress = () => api.getProblemProgress().map(({ key, done, total }) => [key, done, total]);
  assert.deepEqual(progress(), expected);
  filters = { source: 'hull-derivatives', theme: 'option', viewMode: 'favorites' };
  assert.deepEqual(progress(), expected);
  filters = { source: 'interview-xiaohongshu', theme: 'behavioral', viewMode: 'all' };
  assert.deepEqual(progress(), expected);
});

test('state fallback applies bank scope after catalog eligibility and reflects incremental loading', () => {
  let state = { problems: [], problemStates: [completed('bank')] };
  const api = createOverviewPageApi({
    getState: () => state,
    getCatalogProblems: () => [],
    isCatalogProblem: item => item.visibility !== 'user'
  });
  assert.deepEqual(api.getProblemProgress(), []);
  state = { ...state, problems: [problem('library', 'option', { source: 'hull-derivatives' })] };
  assert.deepEqual(api.getProblemProgress(), []);
  state = { ...state, problems: [...state.problems, problem('bank'), problem('user', 'probability', { visibility: 'user' })] };
  assert.deepEqual(api.getProblemProgress().map(({ key, done, total }) => [key, done, total]), [
    ['all', 1, 1], ['probability', 1, 1]
  ]);
  state = { problems: [], problemStates: [] };
  assert.deepEqual(api.getProblemProgress(), []);
});

test('catalog accessor takes precedence and recomputes the bank scope as catalog data changes', () => {
  let catalog = [problem('library', 'option', { source: 'hull-derivatives' })];
  const api = withState([problem('state-only')], [completed('bank'), completed('state-only')], {
    getCatalogProblems: () => catalog
  });
  assert.deepEqual(api.getProblemProgress(), []);
  catalog = [...catalog, problem('bank')];
  assert.equal(api.getProblemProgress()[0].total, 1);
  assert.equal(api.getProblemProgress()[0].done, 1);
  catalog = [...catalog, problem('new-bank', 'probability', { source: 'interview-onepoint3acres' })];
  assert.equal(api.getProblemProgress()[0].total, 2);
  assert.equal(api.getProblemProgress()[0].done, 1);
  catalog = [];
  assert.equal(api.getProblemProgress()[0].total, 1);
  assert.equal(api.getProblemProgress()[0].done, 1);
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

test('overview always shows all included bank questions followed by the two largest categories', () => {
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
    { done: 0, total: 2940, label: '0' },
    { done: 1, total: 2940, label: '<0.1' },
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

test('empty, library-only and LeetCode-only catalogs expose no misleading progress row', () => {
  assert.deepEqual(withState([]).getProblemProgress(), []);
  assert.deepEqual(withState([problem('library', 'probability', { source: 'green-book' })], [completed('library')]).getProblemProgress(), []);
  assert.deepEqual(withState([problem('leetcode-one', 'leetcode')], [completed('leetcode-one')]).getProblemProgress(), []);
});

test('explicit and inferred behavioral questions retain their category during catalog normalization', () => {
  const explicit = normalizeProblem({
    id: 'explicit-behavioral', category: 'behavioral', prompt: 'Explain your approach to a probability project.', createdAt: PAST
  });
  const inferred = normalizeProblem({
    id: 'inferred-behavioral', prompt: 'Tell me about a time you resolved a conflict.', createdAt: PAST
  });
  assert.deepEqual([explicit.category, inferred.category], ['behavioral', 'behavioral']);
  assert.equal(normalizeCategory('behavioral'), 'behavioral');
});

test('behavioral aliases remain stable through repeated normalization and catalog merges', () => {
  const raw = ['behavioral', 'behavior', 'behavioral_fit', 'fit'].map((category, index) => ({
    id: `behavioral-alias-${index}`, category, source: 'interview-glassdoor',
    visibility: 'private', createdAt: PAST
  }));
  const first = mergeProblems([], raw);
  assert.deepEqual(first.map(item => item.category), raw.map(() => 'behavioral'));
  assert.deepEqual(first.map(item => normalizeProblem(item)), first);
  assert.deepEqual(mergeProblems(first, raw), first);
  assert.deepEqual(mergeProblems(first, first), first);
});

test('behavioral progress has an English label without a supplied category formatter', () => {
  const rows = withState([problem('behavioral', 'behavioral')], [], { getLanguage: () => 'en' }).getProblemProgress();
  assert.equal(rows.find(row => row.key === 'behavioral').label, 'Behavioral / Fit');
});

test('audited catalog metadata yields 2940 bank questions, 1212 probability and 298 behavioral questions', () => {
  // Source/category aggregates verified on 2026-10-02. Generated rows contain
  // no real question IDs, titles, prompts, answers, URLs, or private content.
  const sourceCategoryCounts = {
    'question-bank': { probabilityExpectation: 94, statistics: 14, optimization: 7, algebra: 14, linearAlgebra: 3, calculus: 4, leetcode: 4 },
    'green-book': { mentalMath: 34, probabilityExpectation: 70, market: 6, calculus: 10, complexNumbers: 1, algebra: 1, statistics: 11, linearAlgebra: 1, leetcode: 24, option: 25 },
    'yellow-book': { option: 29, mentalMath: 17, probabilityExpectation: 44, statistics: 15, cppProgramming: 4, complexNumbers: 1, algebra: 3, calculus: 7, linearAlgebra: 4, market: 1, leetcode: 28 },
    'red-book': { option: 93, probabilityExpectation: 38, statistics: 16, leetcode: 44, calculus: 9, algebra: 2, linearAlgebra: 1, cppProgramming: 6, mentalMath: 11, market: 22 },
    'hull-derivatives': { option: 430, market: 272, statistics: 30, probabilityExpectation: 31 },
    'stefanica-fe-math': { statistics: 22, option: 7, market: 4, probabilityExpectation: 2 },
    'quantitative-primer': { probabilityExpectation: 11, statistics: 15, pandasNumpy: 4, leetcode: 7, mentalMath: 2, machineLearning: 2 },
    'dudeney-puzzles': { mentalMath: 65, probabilityExpectation: 8, leetcode: 50 },
    'linalg-primer': { statistics: 13, market: 5 },
    'probability-stochastic-10': { probabilityExpectation: 10 },
    quantguide: { optimization: 47, probabilityExpectation: 713, mentalMath: 91, algebra: 111, option: 77, statistics: 101, linearAlgebra: 15, calculus: 22, market: 22, complexNumbers: 2 },
    'stat110-strategic-practice': { probabilityExpectation: 184 },
    'stanford-msande214-hw3': { optimization: 4, market: 1 },
    'probabilitycourse-solved-samples': { probabilityExpectation: 13, statistics: 3 },
    'boyd-cvxbook-additional-exercises': { optimization: 10 },
    'etheridge-finmath-problem-sheets': { option: 5, probabilityExpectation: 5 },
    'interview-glassdoor': { leetcode: 26, behavioral: 144, statistics: 22, cppProgramming: 15, mentalMath: 16, option: 12, systemsNetworking: 4, machineLearning: 9, probabilityExpectation: 14, systemDesign: 2, optimization: 2, market: 40, pandasNumpy: 2, calculus: 2, enterpriseTools: 1, linearAlgebra: 3, algebra: 1, dataEngineering: 1 },
    'interview-onepoint3acres': { mentalMath: 25, probabilityExpectation: 194, optimization: 13, leetcode: 108, statistics: 56, market: 30, linearAlgebra: 17, machineLearning: 48, behavioral: 76, algebra: 14, option: 12, deepLearning: 4, calculus: 3, cppProgramming: 11, systemDesign: 2, dataEngineering: 2, systemsNetworking: 1, pandasNumpy: 2 },
    'interview-xiaohongshu': { market: 129, algebra: 15, probabilityExpectation: 197, statistics: 84, behavioral: 78, optimization: 10, mentalMath: 57, option: 33, cppProgramming: 13, linearAlgebra: 10, leetcode: 75, machineLearning: 83, deepLearning: 77, pandasNumpy: 10, dataEngineering: 3, calculus: 1, assessment: 1, aiEngineering: 2 }
  };
  const metadata = Object.entries(sourceCategoryCounts).flatMap(([source, categories]) => (
    Object.entries(categories).flatMap(([category, count]) => Array.from({ length: count }, (_, index) => ({
      id: `synthetic-${source}-${category}-${index}`, source, category, createdAt: PAST
    })))
  ));
  assert.equal(metadata.length, 4946);
  assert.equal(new Set(metadata.map(item => item.id)).size, 4946);
  assert.equal(metadata.filter(item => item.category === 'behavioral').length, 298);
  assert.equal(metadata.filter(item => item.category === 'leetcode').length, 366);
  const catalog = mergeProblems([], metadata);
  const rows = withState(catalog, [], { normalizeCategory }).getProblemProgress();
  assert.deepEqual(rows.map(({ key, total }) => ({ key, total })), [
    { key: 'all', total: 2940 },
    { key: 'probabilityExpectation', total: 1212 },
    { key: 'behavioral', total: 298 }
  ]);
  assert.equal(rows.find(row => row.key === 'behavioral').label, '行为面');
});
