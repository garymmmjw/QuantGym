import { reviewPool } from "./leetcodeModel.js";

const DAY = 86400000;
const MAX_INTERVAL = 36500;
const quality = Object.freeze({ again: 1, hard: 3, good: 4, easy: 5 });
const validTime = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const clock = (now) => {
  const value = Number(now instanceof Date ? now.getTime() : now);
  if (!Number.isFinite(value)) throw new TypeError("Invalid review time");
  return value;
};

// Older snapshots still have useful accepted timestamps, but an import without
// timestamps cannot establish a historical review date.
export function initialReview(problem = {}) {
  const accepted = validTime(problem.lastAcceptedAt) ? problem.lastAcceptedAt : null;
  return {
    version: 0, source: accepted ? "accepted" : "unknown",
    anchorAt: accepted, lastReviewedAt: null,
    nextReviewAt: accepted ? new Date(Date.parse(accepted) + DAY).toISOString() : null,
    repetitions: accepted ? 1 : 0, intervalDays: accepted ? 1 : 0,
    easeFactor: 2.5, reviewCount: 0, lapses: 0, lastRating: null,
  };
}

export function reviewState(problem = {}) {
  const review = problem.review;
  if (!review || !Number.isInteger(review.version) || review.version < 0
    || !Number.isInteger(review.repetitions) || review.repetitions < 0
    || !Number.isFinite(review.easeFactor) || review.easeFactor < 1.3
    || !Number.isInteger(review.intervalDays) || review.intervalDays < 0 || review.intervalDays > MAX_INTERVAL
    || review.nextReviewAt != null && !validTime(review.nextReviewAt)) return initialReview(problem);
  return review;
}

export function reviewStatus(problem, now = Date.now()) {
  const due = reviewState(problem).nextReviewAt;
  return !due ? "uninitialized" : Date.parse(due) <= clock(now) ? "due" : "upcoming";
}

export function reviewSummary(problems, now = Date.now()) {
  const time = clock(now);
  return reviewPool(problems).reduce((result, problem) => {
    const status = reviewStatus(problem, time);
    if (status === "due") result.due += 1;
    else if (status === "uninitialized") result.uninitialized += 1;
    else if (Date.parse(reviewState(problem).nextReviewAt) <= time + 7 * DAY) result.upcoming7Days += 1;
    return result;
  }, { due: 0, uninitialized: 0, upcoming7Days: 0 });
}

export function filterReviewProblems(problems, status = "all", now = Date.now()) {
  const time = clock(now);
  const rank = { due: 0, uninitialized: 1, upcoming: 2 };
  return reviewPool(problems).filter((problem) => status === "all" || reviewStatus(problem, time) === status)
    .sort((left, right) => {
      const leftStatus = reviewStatus(left, time), rightStatus = reviewStatus(right, time);
      return rank[leftStatus] - rank[rightStatus]
        || (Date.parse(reviewState(left).nextReviewAt) || 0) - (Date.parse(reviewState(right).nextReviewAt) || 0)
        || String(left.frontendId || left.slug).localeCompare(String(right.frontendId || right.slug), "en", { numeric: true });
    });
}

// This is a display-only SM-2 preview. The authenticated API independently
// computes and persists the result using its own clock; clients cannot set dueAt.
export function previewReview(problem, rating, now = Date.now()) {
  if (!Object.hasOwn(quality, rating)) throw new TypeError("Invalid review rating");
  const state = reviewState(problem), q = quality[rating];
  const repetitions = q < 3 ? 0 : state.repetitions + 1;
  const intervalDays = q < 3 || repetitions === 1 ? 1 : repetitions === 2 ? 6
    : Math.min(MAX_INTERVAL, Math.max(1, Math.ceil(state.intervalDays * state.easeFactor)));
  const easeFactor = Math.round(Math.max(1.3, state.easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)) * 1e8) / 1e8;
  return { intervalDays, nextReviewAt: new Date(clock(now) + intervalDays * DAY).toISOString(), repetitions, easeFactor };
}

export function drawDueReview(problems, previousSlug = "", random = Math.random, now = Date.now()) {
  const sorted = filterReviewProblems(problems, "all", now);
  const due = sorted.filter((problem) => reviewStatus(problem, now) === "due");
  if (due.length) return due.find((problem) => problem.slug !== previousSlug) || due[0];
  const uninitialized = sorted.filter((problem) => reviewStatus(problem, now) === "uninitialized");
  const candidates = uninitialized.length > 1 ? uninitialized.filter((problem) => problem.slug !== previousSlug) : uninitialized;
  if (!candidates.length) return null;
  const value = Number(random());
  return candidates[Math.floor(Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 0.9999999999999999) * candidates.length)];
}
