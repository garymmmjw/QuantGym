import test from 'node:test';
import assert from 'node:assert/strict';
import { initialReview, reviewState, reviewStatus, reviewSummary, filterReviewProblems, previewReview, drawDueReview } from '../src/features/leetcode/leetcodeReviewModel.js';
import { createLeetCodeClient } from '../src/features/leetcode/leetcodeClient.js';

const NOW = Date.parse('2026-09-11T14:30:00Z');
const DAY = 86400000;
const item = (slug, accepted = null) => ({ slug, lastAcceptedAt: accepted });
const scheduled = (slug, offset, extra = {}) => ({ slug, review: { ...initialReview(item(slug)), version: 1, repetitions: 2, intervalDays: 6, source: 'review', nextReviewAt: new Date(NOW + offset).toISOString(), ...extra } });

test('known accepted instants seed one day later; unknown history stays undated', () => {
  const known = item('two-sum', '2026-09-10T09:30:00-05:00');
  assert.equal(initialReview(known).nextReviewAt, '2026-09-11T14:30:00.000Z');
  assert.equal(reviewStatus(known, NOW), 'due');
  for (const value of [null, '', 'invalid', '2026-09-11', '2026-09-11T14:30:00']) {
    const unknown = item('unknown', value);
    assert.equal(initialReview(unknown).nextReviewAt, null);
    assert.equal(reviewStatus(unknown, NOW), 'uninitialized');
    assert.equal(previewReview(unknown, 'good', NOW).intervalDays, 1);
  }
  assert.equal(previewReview(known, 'good', NOW).intervalDays, 6);
});

test('SM-2 recalled sequence uses 1, 6, 15, 38 days and previous ease factor', () => {
  let problem = item('repeat');
  const intervals = [];
  for (let i = 0; i < 4; i += 1) {
    const next = previewReview(problem, 'good', NOW + i * DAY);
    intervals.push(next.intervalDays);
    problem = { ...problem, review: { ...reviewState(problem), ...next, version: i + 1 } };
  }
  assert.deepEqual(intervals, [1, 6, 15, 38]);
  const easy = scheduled('easy', DAY, { easeFactor: 2.6, repetitions: 2, intervalDays: 6 });
  assert.deepEqual(previewReview(easy, 'easy', NOW), {
    intervalDays: 16, nextReviewAt: '2026-09-27T14:30:00.000Z', repetitions: 3, easeFactor: 2.7,
  });
  assert.equal(previewReview(easy, 'hard', NOW).easeFactor, 2.46);
});

test('forgotten recall resets interval and repetition while ease has a floor', () => {
  const existing = scheduled('forgotten', DAY, { repetitions: 12, intervalDays: 100, easeFactor: 1.4 });
  const next = previewReview(existing, 'again', NOW);
  assert.deepEqual(next, { intervalDays: 1, nextReviewAt: '2026-09-12T14:30:00.000Z', repetitions: 0, easeFactor: 1.3 });
  const recovered = { ...existing, review: { ...existing.review, ...next } };
  assert.equal(previewReview(recovered, 'good', NOW + DAY).intervalDays, 1);
  assert.throws(() => previewReview(existing, 'injected', NOW), /Invalid review rating/);
  assert.throws(() => previewReview(existing, 'good', NaN), /Invalid review time/);
});

test('manual schedule is preserved when a new accepted submission arrives', () => {
  const manual = { ...scheduled('manual', 4 * DAY), lastAcceptedAt: '2026-09-11T14:29:00Z' };
  assert.equal(reviewState(manual), manual.review);
  assert.equal(reviewStatus(manual, NOW), 'upcoming');
  assert.equal(reviewState({ ...manual, review: { ...manual.review, easeFactor: NaN } }).source, 'accepted');
});

test('UTC intervals stay exact across DST and maximum intervals are bounded', () => {
  const beforeFallBack = Date.parse('2026-11-01T00:30:00-05:00');
  const preview = previewReview(item('dst'), 'good', beforeFallBack);
  assert.equal(Date.parse(preview.nextReviewAt) - beforeFallBack, DAY);
  assert.equal(preview.nextReviewAt, '2026-11-02T05:30:00.000Z');
  assert.equal(previewReview(scheduled('bounded', DAY, { intervalDays: 36000, repetitions: 20 }), 'easy', NOW).intervalDays, 36500);
});

test('due-first filters sort stably without changing input; counts respect exact boundaries', () => {
  const problems = [scheduled('future', 7 * DAY), item('unknown'), scheduled('today', 0), scheduled('old', -DAY), scheduled('later', 7 * DAY + 1)];
  const original = JSON.stringify(problems);
  assert.deepEqual(filterReviewProblems(problems, 'all', NOW).map(p => p.slug), ['old', 'today', 'unknown', 'future', 'later']);
  assert.deepEqual(filterReviewProblems(problems, 'due', NOW).map(p => p.slug), ['old', 'today']);
  assert.deepEqual(reviewSummary([...problems, problems[0], { slug: '../unsafe' }], NOW), { due: 2, uninitialized: 1, upcoming7Days: 1 });
  assert.equal(JSON.stringify(problems), original);
  assert.equal(drawDueReview(problems, '', Math.random, NOW).slug, 'old');
  assert.equal(drawDueReview(problems, 'old', Math.random, NOW).slug, 'today');
  assert.equal(drawDueReview([scheduled('future', DAY)], '', Math.random, NOW), null);
  assert.equal(drawDueReview([item('a'), item('b')], 'a', () => NaN, NOW).slug, 'b');
});

const connection = { username: 'review-user', linkedAt: '2026-09-10T00:00:00Z' };
const command = { ...connection, problemSlug: 'two-sum', rating: 'good', eventId: '03f76ec6-0ae6-4a4a-8ecf-9c5b7bd3b591', expectedVersion: 0 };
const response = (version = 0) => ({ connection, submissions: [], problems: [{ ...item('two-sum'), review: { ...initialReview(item('two-sum')), version } }] });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('review client submits explicit grade and displays only acknowledged state', async () => {
  const requests = [];
  let release;
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', fetchImpl: async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/review')) await new Promise(resolve => { release = resolve; });
    return json(response(url.endsWith('/review') ? 1 : 0));
  } });
  await client.reload();
  const result = client.recordReview(command);
  assert.equal(client.getSnapshot().phase, 'reviewing');
  assert.equal(client.getSnapshot().data.problems[0].review.version, 0);
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), command);
  assert.equal(requests.at(-1).options.method, 'POST');
  release();
  const saved = await result;
  assert.equal(saved.error, null);
  assert.equal(saved.data.problems[0].review.version, 1);
  assert.equal(client.getSnapshot().phase, 'ready');
});

test('review failures preserve history and return the error from that operation', async () => {
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', fetchImpl: async url => url.endsWith('/review') ? json({ error: 'version_conflict' }, 409) : json(response()) });
  await client.reload();
  const failed = client.recordReview(command);
  const refresh = client.reload();
  const result = await failed; await refresh;
  assert.equal(result.data, null);
  assert.equal(result.error.status, 409);
  assert.equal(client.getSnapshot().data.problems[0].review.version, 0);
});

test('unacknowledged or wrong-connection review responses never replace loaded records', async () => {
  for (const bad of [response(0), { ...response(1), connection: { ...connection, username: 'other-user' } }, { ...response(1), connection: { ...connection, linkedAt: '2026-09-11T00:00:00Z' } }]) {
    const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', fetchImpl: async url => json(url.endsWith('/review') ? bad : response()) });
    await client.reload();
    const result = await client.recordReview(command);
    assert.equal(result.data, null);
    assert.match(result.error.message, /invalid_review_response/);
    assert.equal(client.getSnapshot().data.problems[0].review.version, 0);
    assert.equal(client.getSnapshot().data.connection.username, connection.username);
  }
});
