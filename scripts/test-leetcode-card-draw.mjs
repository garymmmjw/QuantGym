import test from 'node:test';
import assert from 'node:assert/strict';
import { drawReviewCards, getReviewCardHistories, getReviewCardHistory, sortProblemsByLastCompletion } from '../src/features/leetcode/leetcodeCardDrawModel.js';
import { reviewPool } from '../src/features/leetcode/leetcodeModel.js';

const now = Date.parse('2026-09-20T12:00:00Z');
const day = 86400000;
const at = days => new Date(now - days * day).toISOString();
const connection = { username: 'fixture', linkedAt: at(90) };
const accepted = (id, problemSlug, days) => ({ id, problemSlug, submittedAt: at(days), status: 'AC' });
const practice = (id, slug, days) => ({ id, kind: 'coding', status: 'completed', completedAt: at(days),
  question: { id: slug, slug, source: 'leetcode', ...connection } });

test('card history uses the latest actual accepted or completed Coding OA record without counting recall ratings', () => {
  const problem = { slug: 'two-sum', lastAcceptedAt: at(8), review: { lastReviewedAt: at(4), reviewCount: 1 } };
  const options = { now, connection, submissions: [accepted('older', 'two-sum', 6), accepted('newer', 'two-sum', 2)],
    practiceSessions: [practice('completed', 'two-sum', 1)] };
  const before = structuredClone({ problem, options });
  assert.deepEqual(getReviewCardHistory(problem, options), { lastPracticedAt: at(1), elapsedDays: 1 });
  assert.deepEqual(getReviewCardHistory(problem, { ...options, practiceSessions: [] }), { lastPracticedAt: at(2), elapsedDays: 2 });
  assert.deepEqual(getReviewCardHistory(problem, { now }), { lastPracticedAt: at(8), elapsedDays: 8 });
  assert.deepEqual(getReviewCardHistory({ ...problem, lastAcceptedAt: at(0) }, options), { lastPracticedAt: at(0), elapsedDays: 0 });
  assert.deepEqual({ problem, options }, before, 'drawing history never records another practice or changes the schedule');
});

test('a recall rating alone never creates or advances a completion time', () => {
  const problem = { slug: 'two-sum', review: { lastReviewedAt: at(0), reviewCount: 12, nextReviewAt: at(-1) } };
  assert.deepEqual(getReviewCardHistory(problem, { now }), { lastPracticedAt: null, elapsedDays: null });
  assert.deepEqual(getReviewCardHistory(problem, { now, submissions: [accepted('older', 'two-sum', 6)] }),
    { lastPracticedAt: at(6), elapsedDays: 6 });
});

test('future and malformed records cannot hide valid older completions from any accepted source', () => {
  const problem = { slug: 'two-sum', lastAcceptedAt: at(-1), review: { lastReviewedAt: at(0) } };
  const submissions = [accepted('same-ac', 'two-sum', -1), accepted('same-ac', 'two-sum', 3),
    { ...accepted('bad-date', 'two-sum', 0), submittedAt: '2026-02-30T12:00:00Z' },
    { ...accepted('failed', 'two-sum', 0), status: 'WA' }];
  const practiceSessions = [practice('same-session', 'two-sum', -2), practice('same-session', 'two-sum', 2),
    { ...practice('bad-session', 'two-sum', 0), completedAt: 'not-a-date' }];
  assert.deepEqual(getReviewCardHistory(problem, { now, submissions }), { lastPracticedAt: at(3), elapsedDays: 3 });
  assert.deepEqual(getReviewCardHistory(problem, { now, submissions, practiceSessions, connection }),
    { lastPracticedAt: at(2), elapsedDays: 2 });
  assert.deepEqual(getReviewCardHistory({ ...problem, lastAcceptedAt: at(10) }, {
    now, submissions: [accepted('future-only', 'two-sum', -1)], practiceSessions: [practice('future-only', 'two-sum', -1)], connection,
  }), { lastPracticedAt: at(10), elapsedDays: 10 });
});

test('card history excludes foreign connections, drafts, unrelated problems and failed submissions', () => {
  const problem = { slug: 'two-sum', lastAcceptedAt: at(10) };
  const valid = practice('valid', 'two-sum', 3);
  const options = { now, connection, submissions: [accepted('other', 'other-problem', 0), { ...accepted('failed', 'two-sum', 0), status: 'WA' }],
    practiceSessions: [valid, { ...practice('draft', 'two-sum', 0), status: 'active' },
      { ...practice('foreign', 'two-sum', 0), question: { ...valid.question, username: 'other-user' } },
      { ...practice('old-link', 'two-sum', 0), question: { ...valid.question, linkedAt: at(120) } },
      practice('other', 'other-problem', 0)] };
  assert.deepEqual(getReviewCardHistory(problem, options), { lastPracticedAt: at(3), elapsedDays: 3 });
  assert.deepEqual(getReviewCardHistory(problem, { ...options, connection: null }), { lastPracticedAt: at(10), elapsedDays: 10 });
});

test('missing, malformed and future practice times remain unknown, while offsets preserve the exact instant', () => {
  const unknown = { lastPracticedAt: null, elapsedDays: null };
  for (const problem of [null, { slug: '../unsafe' }, { slug: 'no-date' }, { slug: 'bad', lastAcceptedAt: '2026-02-30T12:00:00Z' },
    { slug: 'day-only', lastAcceptedAt: '2026-09-19' }, { slug: 'future', lastAcceptedAt: at(-1) }]) {
    assert.deepEqual(getReviewCardHistory(problem, { now }), unknown);
  }
  assert.deepEqual(getReviewCardHistory({ slug: 'offset', lastAcceptedAt: '2026-09-20T07:00:00-05:00' }, { now: new Date(now) }),
    { lastPracticedAt: at(0), elapsedDays: 0 });
  assert.throws(() => getReviewCardHistory({ slug: 'valid' }, { now: NaN }), /Invalid review draw time/);
});

test('batch completion history preserves exact per-problem completions, unknowns and connection isolation', () => {
  const problems = [
    { slug: 'accepted', lastAcceptedAt: at(8), review: { lastReviewedAt: at(0) } },
    { slug: 'coding', lastAcceptedAt: at(10) },
    { slug: 'unknown', review: { lastReviewedAt: at(0) } },
    { slug: 'future', lastAcceptedAt: at(-1) },
    { slug: 'malformed', lastAcceptedAt: '2026-02-30T12:00:00Z' },
  ];
  const options = { now, connection,
    submissions: [accepted('same-ac', 'accepted', -1), accepted('same-ac', 'accepted', 3),
      accepted('future-fallback', 'future', 4), { ...accepted('failed', 'unknown', 0), status: 'WA' }],
    practiceSessions: [practice('valid-coding', 'coding', 2),
      { ...practice('foreign', 'accepted', 0), question: { ...practice('foreign', 'accepted', 0).question, username: 'foreign' } },
      { ...practice('old-link', 'unknown', 0), question: { ...practice('old-link', 'unknown', 0).question, linkedAt: at(120) } }],
  };
  const before = structuredClone({ problems, options });
  const histories = getReviewCardHistories([...problems, problems[0], null, { slug: '../invalid' }], options);
  assert.deepEqual([...histories], [
    ['accepted', { lastPracticedAt: at(3), elapsedDays: 3 }],
    ['coding', { lastPracticedAt: at(2), elapsedDays: 2 }],
    ['unknown', { lastPracticedAt: null, elapsedDays: null }],
    ['future', { lastPracticedAt: at(4), elapsedDays: 4 }],
    ['malformed', { lastPracticedAt: null, elapsedDays: null }],
  ]);
  for (const problem of problems) assert.deepEqual(histories.get(problem.slug), getReviewCardHistory(problem, options));
  assert.deepEqual(getReviewCardHistories(problems, { ...options, connection: null }).get('coding'),
    { lastPracticedAt: at(10), elapsedDays: 10 });
  assert.deepEqual(getReviewCardHistories(null, { now }), new Map());
  assert.deepEqual({ problems, options }, before);
});

test('batch completion history scans accepted and Coding OA ledgers a bounded number of times for a large pool', () => {
  const problems = Array.from({ length: 1000 }, (_, index) => ({ slug: `problem-${index}` }));
  let acceptedReads = 0, completedReads = 0;
  const submissions = Array.from({ length: 5000 }, (_, index) => ({
    id: `accepted-${index}`, problemSlug: `problem-${index % problems.length}`, status: 'AC',
    get submittedAt() { acceptedReads += 1; return at(2 + Math.floor(index / problems.length)); },
  }));
  const practiceSessions = problems.map(({ slug }, index) => ({ ...practice(`coding-${index}`, slug, 1),
    get completedAt() { completedReads += 1; return at(1); },
  }));
  const histories = getReviewCardHistories(problems, { now, connection, submissions, practiceSessions });
  assert.equal(histories.size, problems.length);
  for (const { slug } of problems) assert.deepEqual(histories.get(slug), { lastPracticedAt: at(1), elapsedDays: 1 });
  assert.ok(acceptedReads <= submissions.length * 4, `accepted records were read ${acceptedReads} times`);
  assert.ok(completedReads <= practiceSessions.length * 4, `Coding OA records were read ${completedReads} times`);
});

test('completion sorting compares actual instants, keeps ties stable and unknowns last without mutating the pool', () => {
  const problems = ['unknown', 'tie-first', 'oldest', 'newest', 'tie-second', 'missing'].map((slug, index) => ({
    slug, frontendId: String(index + 1), lastAcceptedAt: at(index),
  }));
  const completionHistory = new Map([
    ['unknown', null], ['tie-first', '2026-09-20T03:00:00-07:00'],
    ['oldest', '2026-09-20T10:30:00+02:00'], ['newest', '2026-09-20T09:30:00-02:00'],
    ['tie-second', '2026-09-20T10:00:00Z'],
  ]);
  const before = structuredClone(problems);
  const sorted = sortProblemsByLastCompletion(problems, completionHistory);
  assert.deepEqual(sorted.map(problem => problem.slug), ['newest', 'tie-first', 'tie-second', 'oldest', 'unknown', 'missing']);
  assert.notEqual(sorted, problems);
  assert.ok(sorted.every(problem => problems.includes(problem)), 'sorting preserves each original problem object');
  assert.deepEqual(problems, before);
});

test('the displayed AC and Coding OA completion history orders the whole pool before search, difficulty and pagination', () => {
  const problems = [
    { slug: 'practice-a', title: 'Practice A', difficulty: 1, lastAcceptedAt: at(10) },
    { slug: 'practice-b', title: 'Practice B', difficulty: 1, lastAcceptedAt: at(1) },
    { slug: 'practice-c', title: 'Practice C', difficulty: 2, lastAcceptedAt: at(0) },
    { slug: 'practice-d', title: 'Practice D', difficulty: 1, lastAcceptedAt: at(12) },
    { slug: 'practice-e', title: 'Practice E', difficulty: 1, lastAcceptedAt: at(15), review: { lastReviewedAt: at(0) } },
    { slug: 'other-problem', title: 'Other', difficulty: 1, lastAcceptedAt: at(.25) },
  ];
  const completionHistory = new Map([...getReviewCardHistories(problems, {
    now, connection, submissions: [accepted('a', 'practice-a', 4), accepted('d', 'practice-d', 2)],
    practiceSessions: [practice('b', 'practice-b', .5)],
  })].map(([slug, history]) => [slug, history.lastPracticedAt]));
  const sorted = sortProblemsByLastCompletion(problems, completionHistory);
  assert.deepEqual(sorted.map(problem => problem.slug), ['practice-c', 'other-problem', 'practice-b', 'practice-d', 'practice-a', 'practice-e']);
  const filtered = reviewPool(sorted, '1', 'practice');
  assert.deepEqual(filtered.slice(0, 2).map(problem => problem.slug), ['practice-b', 'practice-d']);
  assert.deepEqual(filtered.slice(2, 4).map(problem => problem.slug), ['practice-a', 'practice-e']);
  assert.equal(completionHistory.get(filtered[0].slug), at(.5), 'the first displayed date is the completed Coding OA time');
});

test('a five-card hand is distinct, preserves original objects and avoids the previous problem when alternatives suffice', () => {
  const pool = Array.from({ length: 7 }, (_, index) => ({ slug: `problem-${index}`, frontendId: String(index), lastAcceptedAt: at(index) }));
  const before = structuredClone(pool);
  const cards = drawReviewCards([...pool, pool[0], { slug: '../invalid' }], { now, previousSlug: 'problem-0', random: () => 0 });
  assert.equal(cards.length, 5);
  assert.equal(new Set(cards.map(problem => problem.slug)).size, 5);
  assert.ok(cards.every(problem => pool.includes(problem) && problem.slug !== 'problem-0'));
  assert.deepEqual(pool, before);
});

test('sparse pools stay sparse and reuse the previous problem only after all alternatives', () => {
  const first = { slug: 'first' }, second = { slug: 'second' };
  assert.deepEqual(drawReviewCards([first, second, first], { now, previousSlug: 'first', random: () => 0 }), [second, first]);
  assert.deepEqual(drawReviewCards([first], { now, previousSlug: 'first', random: () => 1 }), [first]);
  const never = () => { throw new Error('An empty draw must not consume random values'); };
  assert.deepEqual(drawReviewCards(null, { now, random: never }), []);
  assert.deepEqual(drawReviewCards([], { now, random: never }), []);
  assert.deepEqual(drawReviewCards([first], { now, count: 0, random: never }), []);
});

test('requested hand size stays bounded and random boundary values cannot duplicate cards', () => {
  const pool = Array.from({ length: 9 }, (_, index) => ({ slug: `problem-${index}` }));
  assert.equal(drawReviewCards(pool, { now, count: 2 }).length, 2);
  for (const value of [-1, 0, 1, 2, NaN, Infinity]) {
    const cards = drawReviewCards(pool, { now, count: 100, random: () => value });
    assert.equal(cards.length, 5);
    assert.equal(new Set(cards.map(problem => problem.slug)).size, 5);
  }
  for (const count of [-1, 1.5, NaN, Infinity, '5']) {
    assert.throws(() => drawReviewCards(pool, { now, count }), /Invalid review card count/);
  }
});

test('the first card still favors older, less frequently practiced problems', () => {
  const pool = [{ slug: 'recent', lastAcceptedAt: at(0) }, { slug: 'old', lastAcceptedAt: at(30) }];
  const counts = { recent: 0, old: 0 };
  for (let index = 0; index < 600; index += 1) {
    const [card] = drawReviewCards(pool, { now, count: 1, random: () => (index + .5) / 600 });
    counts[card.slug] += 1;
  }
  assert.ok(counts.recent > 0 && counts.old > counts.recent);
  const equalDates = pool.map(problem => ({ ...problem, lastAcceptedAt: at(10) }));
  const submissions = [accepted('recent-1', 'recent', 10), ...Array.from({ length: 9 }, (_, index) => accepted(`old-${index}`, 'old', 10))];
  const frequent = { recent: 0, old: 0 };
  for (let index = 0; index < 600; index += 1) {
    const [card] = drawReviewCards(equalDates, { now, count: 1, submissions, random: () => (index + .5) / 600 });
    frequent[card.slug] += 1;
  }
  assert.ok(frequent.old > 0 && frequent.recent > frequent.old);
});
