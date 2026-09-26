import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRACTICE_BANKS, getPracticeBank, getBankProblems, getBankGroups,
  matchesBankGroup, getPracticeCompanies, getBankStats,
} from '../src/features/problems/practiceBanks.js';

const question = (id, source, extra = {}) => ({ id, source, ...extra });

test('the five source entrances do not absorb other books or interview sources', () => {
  assert.deepEqual(PRACTICE_BANKS.map((bank) => bank.id), ['quantguide', 'xiaohongshu', 'onepoint3acres', 'glassdoor', 'purple']);
  const rows = PRACTICE_BANKS.map((bank) => question(bank.id, bank.source));
  rows.push(question('wechat', 'interview-wechat'), question('green', 'green-book', { bookSlug: 'question-bank' }));
  for (const bank of PRACTICE_BANKS) {
    assert.equal(getPracticeBank(rows.find((row) => row.id === bank.id)), bank);
    assert.deepEqual(getBankProblems(rows, bank.id).map((row) => row.id), [bank.id]);
    assert.equal(rows.filter((row) => matchesBankGroup(row, bank.id)).length, 1);
  }
  assert.equal(getPracticeBank(rows.at(-1)), null);
  assert.deepEqual(getBankGroups(rows, 'missing'), []);
});

test('company aliases merge spelling variations while related businesses stay separate', () => {
  const companies = getPracticeCompanies({ companies: ['SIG', 'Susquehanna International Group (SIG)', 'D. E. Shaw', 'D.E. Shaw', 'Squarepoint', 'Squarepoint Capital'] });
  assert.equal(companies.length, 3);
  assert.deepEqual(companies.map((item) => item.name), ['D.E. Shaw', 'SIG', 'Squarepoint Capital']);
  const boundaries = getPracticeCompanies({ companies: ['Citadel', 'Citadel Securities', 'Point72', 'Cubist (Point72)', 'ByteDance', 'TikTok'] });
  assert.equal(boundaries.length, 6);
  const sigId = getPracticeCompanies({ companies: ['SIG'] })[0].id;
  const otherSource = question('other', 'interview-glassdoor', { companies: ['SIG'] });
  assert.equal(matchesBankGroup(otherSource, 'xiaohongshu', sigId), false);
});

test('generic, school, empty and malformed company tags become the unknown group', () => {
  for (const companies of [undefined, [], [''], ['Unknown / General'], ['Unspecified Quant Private Fund', 'Hedge Fund'], ['MIT Sloan MFin', 'UCLA MFE'], [null, 7]]) {
    assert.deepEqual(getPracticeCompanies({ companies }), [{ id: 'unknown', name: '公司未明确' }]);
  }
  assert.equal(getPracticeCompanies({ companies: ['Hedge Fund', 'Citadel'] }).length, 1);
  const rows = [question('unknown', 'interview-xiaohongshu'), question('citadel', 'interview-xiaohongshu', { companies: ['Citadel'] })];
  assert.equal(getBankGroups(rows, 'xiaohongshu', { isEnglish: true }).at(-1).label, 'Company unspecified');
  assert.equal(matchesBankGroup(rows[0], 'xiaohongshu', 'unknown'), true);
});

test('a multi-company question shares its ID and completion without duplicating bank totals', () => {
  const shared = question('shared', 'interview-xiaohongshu', { companies: ['SIG', 'Jane Street', 'Susquehanna International Group (SIG)'] });
  const next = question('next', 'interview-xiaohongshu', { companies: ['SIG'] });
  const rows = [shared, shared, next];
  const states = [{ problemId: 'shared', completed: true }, { problemId: 'unrelated', completed: true }];
  assert.equal(getBankProblems(rows, 'xiaohongshu')[0], shared);
  assert.deepEqual(getBankStats(rows, states, 'xiaohongshu'), { total: 2, completed: 1, nextProblemId: 'next' });
  const groups = getBankGroups(rows, 'xiaohongshu', { problemStates: states });
  assert.deepEqual(groups.map(({ label, count, completed }) => ({ label, count, completed })), [
    { label: 'SIG', count: 2, completed: 1 }, { label: 'Jane Street', count: 1, completed: 1 },
  ]);
  for (const group of groups) assert.equal(matchesBankGroup(shared, 'xiaohongshu', group.id), true);
  assert.deepEqual(shared.companies, ['SIG', 'Jane Street', 'Susquehanna International Group (SIG)']);
});

test('purple-book sections stay scoped to their chapters and follow original numbering', () => {
  const purple = (id, chapterOrder, questionOrder) => question(id, 'question-bank', {
    practiceTaxonomy: { chapterId: `ch-${chapterOrder}`, chapterZh: `第${chapterOrder}章`, chapterEn: `Chapter ${chapterOrder}`, chapterOrder, sectionId: 'exercises', sectionZh: '练习', sectionEn: 'Exercises', sectionOrder: 1, questionOrder },
  });
  const rows = [purple('ch2-q1', 2, 1), purple('ch1-q10', 1, '10'), purple('ch1-q2', 1, '2')];
  assert.deepEqual(getBankProblems(rows, 'purple').map((row) => row.id), ['ch1-q2', 'ch1-q10', 'ch2-q1']);
  const groups = getBankGroups(rows, 'purple', { isEnglish: true, problemStates: [{ problemId: 'ch1-q2', completed: true }] });
  assert.deepEqual(groups.map((group) => [group.label, group.count, group.completed]), [['Chapter 1', 2, 1], ['Chapter 2', 1, 0]]);
  assert.notEqual(groups[0].children[0].id, groups[1].children[0].id);
  assert.equal(matchesBankGroup(rows[0], 'purple', groups[0].id, groups[0].children[0].id), false);
  assert.equal(matchesBankGroup(rows[0], 'purple', 'all', groups[0].children[0].id), false);
  assert.equal(matchesBankGroup(rows[2], 'purple', groups[0].id, groups[0].children[0].id), true);
  assert.deepEqual(rows.map((row) => row.id), ['ch2-q1', 'ch1-q10', 'ch1-q2']);
  const fullyScoped = question('scoped', 'question-bank', { practiceTaxonomy: { chapterId: 'purple-chapter-2', sectionId: 'purple-chapter-2-section-3' } });
  assert.equal(getBankGroups([fullyScoped], 'purple')[0].children[0].id, 'purple-chapter-2-section-3');
});

test('QuantGuide keeps the original topic over the local skill category and sorts orderId numerically', () => {
  const rows = [
    question('ten', 'quantguide', { category: 'probabilityExpectation', quantguide: { topic: 'pure math', orderId: '10' } }),
    question('two', 'quantguide', { category: 'market', quantguide: { topic: 'probability', orderId: '2' } }),
    question('missing', 'quantguide', { category: 'statistics' }),
    question('unsupported', 'quantguide', { quantguide: { topic: 'unmapped topic' } }),
    ...['brainteasers', 'finance', 'statistics'].map((topic, index) => question(topic, 'quantguide', { quantguide: { topic, orderId: index + 11 } })),
  ];
  const groups = getBankGroups(rows, 'quantguide');
  assert.deepEqual(groups.map((group) => group.id), ['probability', 'brainteasers', 'finance', 'statistics', 'pure-math', 'unknown']);
  assert.equal(groups.at(-1).count, 2);
  assert.equal(matchesBankGroup(rows[0], 'quantguide', 'pure-math'), true);
  assert.equal(matchesBankGroup(rows[0], 'quantguide', 'probability'), false);
  assert.equal(getBankProblems(rows, 'quantguide')[0].id, 'two');
  assert.equal(getBankStats(rows, [{ problemId: 'two', completed: true }], 'quantguide').nextProblemId, 'ten');
});

test('empty and completed banks have no next question; the latest saved completion wins', () => {
  assert.deepEqual(getBankStats([], [], 'purple'), { total: 0, completed: 0, nextProblemId: null });
  const rows = [question('one', 'quantguide')];
  const states = [
    { problemId: 'one', completed: true, lastPracticedAt: '2026-09-20T12:00:00Z' },
    { problemId: 'one', completed: false, lastPracticedAt: '2026-09-19T12:00:00Z' },
  ];
  assert.deepEqual(getBankStats(rows, states, 'quantguide'), { total: 1, completed: 1, nextProblemId: null });
});

test('every valid practice outcome counts the question as practiced without setting legacy completion', () => {
  const stamp = '2026-09-20T12:00:00.000Z';
  const rows = ['correct', 'idea_wrong', 'wrong'].map(id => question(id, 'quantguide'));
  const states = rows.map(row => ({ problemId: row.id, completed: false, freePracticeAttempts: [{
    id: `attempt-${row.id}`, startedAt: stamp, recordedAt: stamp, updatedAt: stamp,
    outcome: row.id, elapsedSeconds: 0,
  }] }));
  assert.deepEqual(getBankStats(rows, states, 'quantguide'), { total: 3, completed: 3, nextProblemId: null });
  assert.ok(states.every(state => !state.completed));
  assert.equal(getBankStats(rows, [{ problemId: 'wrong', freePracticeAttempts: [{}] }], 'quantguide').completed, 0);
});
