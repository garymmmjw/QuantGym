import { drawReviewProblem, reviewDrawWeights, reviewPool } from './leetcodeModel.js';

/**
 * Read the latest completion: accepted submissions or completed Coding OA.
 * Recall ratings are not completions and must not advance the displayed time.
 * Inputs come from the current account's snapshot and personal practice store;
 * the shared model also checks Coding OA's exact LeetCode connection binding.
 * The existing return names stay compatible with the card UI. Invalid/future
 * records are removed before aggregation so they cannot hide an older completion.
 */
export function getReviewCardHistories(problems, { now = Date.now(), ...history } = {}) {
  const time = Number(now instanceof Date ? now.getTime() : now);
  const inPast = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= time;
  const completedProblems = (Array.isArray(problems) ? problems : []).map(problem => problem && typeof problem === 'object'
    ? { ...problem, review: undefined, lastAcceptedAt: inPast(problem.lastAcceptedAt) ? problem.lastAcceptedAt : null }
    : problem);
  // Keep the shared model's strict timestamp, AC, question and account-binding
  // checks. Pre-filtering future records also preserves earlier duplicate IDs.
  // Aggregate the input ledgers once for the whole pool, not once per table row.
  const rows = reviewDrawWeights(completedProblems, { ...history, now,
    submissions: (Array.isArray(history.submissions) ? history.submissions : []).filter(item => inPast(item?.submittedAt)),
    practiceSessions: (Array.isArray(history.practiceSessions) ? history.practiceSessions : []).filter(item => inPast(item?.completedAt)),
  });
  return new Map(rows.map(row => [row.problem.slug, { lastPracticedAt: row.lastPracticedAt, elapsedDays: row.elapsedDays }]));
}

export function getReviewCardHistory(problem, options) {
  return getReviewCardHistories([problem], options).get(problem?.slug) ?? { lastPracticedAt: null, elapsedDays: null };
}

/**
 * Draw original problem objects without replacement, using the existing weights.
 * The previous problem is avoided while another candidate remains. Small pools
 * may include it last, but never duplicate cards to fill a five-card hand.
 */
export function drawReviewCards(problems, {
  count = 5, previousSlug = '', random = Math.random, now = Date.now(), ...history
} = {}) {
  if (!Number.isSafeInteger(count) || count < 0) throw new TypeError('Invalid review card count');
  let remaining = reviewPool(problems);
  const limit = Math.min(5, count, remaining.length);
  const cards = [];
  for (let index = 0; index < limit; index += 1) {
    const problem = drawReviewProblem(remaining, previousSlug, random, { ...history, now });
    if (!problem) break;
    cards.push(problem);
    remaining = remaining.filter(candidate => candidate.slug !== problem.slug);
  }
  return cards;
}
