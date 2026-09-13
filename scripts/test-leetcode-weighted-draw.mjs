import test from 'node:test';
import assert from 'node:assert/strict';
import { drawReviewProblem, reviewDrawWeights, reviewPool } from '../src/features/leetcode/leetcodeModel.js';
import { drawDueReview, initialReview } from '../src/features/leetcode/leetcodeReviewModel.js';

const NOW = Date.parse('2026-09-13T12:00:00Z');
const DAY = 86400000;
const at = days => new Date(NOW - days * DAY).toISOString();
const problem = (slug, days = 0, reviewCount = 0) => ({ slug, lastAcceptedAt: at(days), review: { reviewCount } });
const accepted = (slug, id, days = 0) => ({ id, problemSlug: slug, status: 'AC', submittedAt: at(days) });
const countsFromDraws = (problems, options, samples = 1200) => {
  const counts = Object.fromEntries(problems.map(row => [row.slug, 0]));
  for (let index = 0; index < samples; index += 1) {
    counts[drawReviewProblem(problems, '', () => (index + 0.5) / samples, options).slug] += 1;
  }
  return counts;
};

test('older practice has a strictly higher weight and observed draw share at equal frequency', () => {
  const problems = [problem('recent', 0), problem('week', 7), problem('month', 30)];
  const rows = reviewDrawWeights(problems, { now: NOW });
  assert.ok(rows[0].weight < rows[1].weight && rows[1].weight < rows[2].weight);
  const counts = countsFromDraws(problems, { now: NOW });
  assert.ok(counts.recent > 0 && counts.recent < counts.week && counts.week < counts.month);
  const adjacent = reviewDrawWeights([problem('earlier', 1 + 1 / DAY), problem('later', 1)], { now: NOW });
  assert.ok(adjacent[0].weight > adjacent[1].weight, 'recency is continuous, not truncated to a calendar day');
});

test('fewer known completions has a higher probability; saved reviews also reduce it', () => {
  const problems = [problem('once'), problem('four-times')];
  const submissions = [accepted('once', 'once-1'), ...Array.from({ length: 4 }, (_, index) => accepted('four-times', `four-${index}`))];
  const options = { now: NOW, submissions };
  const rows = reviewDrawWeights(problems, options);
  assert.deepEqual(rows.map(row => row.knownAcceptedCount), [1, 4]);
  assert.deepEqual(countsFromDraws(problems, options, 1200), { once: 800, 'four-times': 400 });
  const reviewed = reviewDrawWeights([problem('once'), problem('reviewed', 0, 3)], { now: NOW });
  assert.equal(reviewed[0].weight, 2 * reviewed[1].weight);
});

test('latest accepted or explicit review timestamp wins, regardless of the source ordering', () => {
  const input = problem('active', 30, 1);
  input.review.lastReviewedAt = at(4);
  let [row] = reviewDrawWeights([input], { now: NOW, submissions: [accepted('active', 'one', 12)] });
  assert.equal(row.lastPracticedAt, at(4));
  assert.equal(row.elapsedDays, 4);
  [row] = reviewDrawWeights([input], { now: NOW, submissions: [accepted('active', 'new', 1), accepted('active', 'old', 12)] });
  assert.equal(row.lastPracticedAt, at(1));
  assert.equal(row.knownAcceptedCount, 2);
  [row] = reviewDrawWeights([{ ...input, lastAcceptedAt: at(0) }], { now: NOW, submissions: [accepted('active', 'old', 12)] });
  assert.equal(row.elapsedDays, 0);
});

test('completed Coding OA attempts update both frequency and recency only for the active linked profile', () => {
  const connection = { username: 'fixture-user', linkedAt: at(90) };
  const session = (id, slug = 'practiced', days = 0) => ({ id, kind: 'coding', status: 'completed', completedAt: at(days),
    question: { id: slug, slug, source: 'leetcode', ...connection } });
  const saved = session('done');
  const ignored = [saved, { ...saved }, { ...session('draft'), status: 'active' },
    { ...session('tech'), kind: 'tech' }, { ...session('no-date'), completedAt: null },
    { ...session('other-user'), question: { ...saved.question, username: 'other-user' } },
    { ...session('old-link'), question: { ...saved.question, linkedAt: at(100) } },
    { ...session('other-source'), question: { ...saved.question, source: 'question-bank' } }, null];
  const problems = [problem('practiced', 30), problem('untouched', 30)];
  const options = { now: NOW, practiceSessions: ignored, connection };
  const rows = reviewDrawWeights(problems, options);
  assert.equal(rows[0].codingOACount, 1);
  assert.equal(rows[0].lastPracticedAt, at(0));
  assert.equal(rows[0].elapsedDays, 0);
  assert.equal(rows[1].codingOACount, 0);
  assert.ok(rows[0].weight < rows[1].weight);
  assert.ok(countsFromDraws(problems, options).untouched > countsFromDraws(problems, options).practiced);
  assert.equal(reviewDrawWeights(problems, { ...options, connection: null })[0].codingOACount, 0);
  assert.equal(reviewDrawWeights(problems, { ...options, connection: { ...connection, username: 'different' } })[0].codingOACount, 0);
  const completed = [session('first', 'practiced', 7), session('second', 'practiced', 2)];
  const [latest] = reviewDrawWeights(problems, { now: NOW, practiceSessions: completed, connection });
  assert.equal(latest.codingOACount, 2);
  assert.equal(latest.lastPracticedAt, at(2));
});

test('duplicates, failed submissions and malformed metadata never inflate accepted counts', () => {
  const valid = accepted('two-sum', 'same', 7);
  const submissions = [valid, { ...valid }, { ...accepted('two-sum', 'failed'), status: 'WA' },
    { ...accepted('two-sum', 'invalid-date'), submittedAt: 'invalid' },
    { ...accepted('two-sum', 'invalid-civil-date'), submittedAt: '2026-02-30T12:00:00Z' },
    { ...accepted('two-sum', 'date-only'), submittedAt: '2026-09-13' },
    { ...accepted('two-sum', 'no-zone'), submittedAt: '2026-09-13T12:00:00' },
    accepted('two-sum', ''), accepted('two-sum', { secret: true }), accepted('unrelated', 'other'), null];
  const [row] = reviewDrawWeights([problem('two-sum', 30)], { now: NOW, submissions });
  assert.equal(row.knownAcceptedCount, 1);
  assert.equal(row.lastPracticedAt, at(7));
  for (const count of [-1, NaN, Infinity, '5', 2.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(reviewDrawWeights([problem('malformed', 0, count)], { now: NOW })[0].reviewCount, 0);
  }
});

test('unknown dates remain undated with a neutral median weight, and future time cannot produce negative age', () => {
  const problems = [problem('recent', 1), problem('older', 9), { slug: 'unknown' }];
  const rows = reviewDrawWeights(problems, { now: NOW });
  assert.equal(rows[2].lastPracticedAt, null);
  assert.equal(rows[2].elapsedDays, null);
  assert.equal(rows[2].weight, reviewDrawWeights([problem('median', 5)], { now: NOW })[0].weight);
  assert.deepEqual(countsFromDraws([{ slug: 'unknown-a' }, { slug: 'unknown-b' }], { now: NOW }, 100), { 'unknown-a': 50, 'unknown-b': 50 });
  const [future] = reviewDrawWeights([problem('future', -100)], { now: new Date(NOW) });
  assert.equal(future.elapsedDays, 0);
  assert.ok(Number.isFinite(future.weight) && future.weight > 0);
  assert.throws(() => reviewDrawWeights(problems, { now: NaN }), /Invalid review draw time/);
});

test('the shared draw remains filter-compatible, non-mutating and safe at random boundaries', () => {
  const problems = [{ ...problem('first', 100), difficulty: 1 }, { ...problem('second'), difficulty: 2 }, { ...problem('third'), difficulty: 1 }];
  const submissions = [accepted('first', 'first-1', 100)];
  const before = JSON.stringify({ problems, submissions });
  const pool = reviewPool([...problems, problems[0], { slug: '../unsafe' }], '1');
  assert.equal(drawReviewProblem(pool, 'first', () => 0, { now: NOW, submissions }), problems[2]);
  assert.equal(drawReviewProblem(pool, '', () => 0, { now: NOW }), problems[0]);
  for (const random of [() => 1, () => 2]) assert.equal(drawReviewProblem(pool, '', random, { now: NOW }), problems[2]);
  for (const random of [() => -1, () => NaN, () => Infinity]) assert.equal(drawReviewProblem(pool, '', random, { now: NOW }), problems[0]);
  assert.equal(drawReviewProblem([problems[0]], 'first', () => 1, { now: NOW }), problems[0]);
  assert.equal(drawReviewProblem([], '', () => { throw new Error('must not draw'); }, { now: NOW }), null);
  assert.equal(drawReviewProblem(null, '', () => 0, { now: NOW }), null);
  assert.equal(JSON.stringify({ problems, submissions }), before);
});

test('timezones resolve to the same instant and large histories retain finite positive weights', () => {
  const rows = reviewDrawWeights([
    { slug: 'offset', lastAcceptedAt: '2026-09-13T07:00:00-05:00' },
    { slug: 'utc', lastAcceptedAt: '2026-09-13T12:00:00Z' },
    { slug: 'old', lastAcceptedAt: '2000-01-01T00:00:00Z', review: { reviewCount: Number.MAX_SAFE_INTEGER } },
  ], { now: NOW });
  assert.equal(rows[0].weight, rows[1].weight);
  assert.equal(rows[0].lastPracticedAt, rows[1].lastPracticedAt);
  assert.ok(rows.every(row => Number.isFinite(row.weight) && row.weight > 0));
});

test('weighted random practice does not change the separate earliest-due SM-2 action', () => {
  const old = problem('earliest', 60, 100);
  old.review = { ...initialReview(old), nextReviewAt: at(20), reviewCount: 100 };
  const recent = problem('recent', 2);
  recent.review = { ...initialReview(recent), nextReviewAt: at(1) };
  assert.equal(drawDueReview([recent, old], '', () => 0.99, NOW), old);
});
