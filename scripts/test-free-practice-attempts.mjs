import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FREE_PRACTICE_WINDOW_MS as DAY, getFreePracticeStatus, startFreePractice,
  recordFreePracticeOutcome, markFreePracticeReveal, mergeFreePracticeAttempts,
  normalizeFreePracticeAttempts, normalizeFreePracticeSession
} from '../src/modules/problems/freePracticeAttempts.js';

const T = Date.parse('2026-09-20T12:00:00Z');
const date = time => new Date(time).toISOString();
function attempt(id, at, outcome = 'correct', extra = {}) {
  return { id, startedAt: date(at - 10000), recordedAt: date(at), updatedAt: date(at), outcome,
    elapsedSeconds: 10, answerViewed: false, hintViewed: false, ...extra };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('opening and refreshing retain one active timer, without recording an attempt', () => {
  const state = startFreePractice({ problemId: 'q1', favorite: true }, T, 'session-1');
  const refreshed = startFreePractice(JSON.parse(JSON.stringify(state)), T + 3500, 'ignored-new-id');
  assert.equal(refreshed.freePracticeSession.id, 'session-1');
  assert.equal(refreshed.freePracticeSession.startedAt, date(T));
  assert.equal(refreshed.favorite, true);
  assert.equal(getFreePracticeStatus(refreshed, T + 3599).elapsedSeconds, 3);
  assert.equal(getFreePracticeStatus(refreshed, T + 3599).attemptCount, 0);
  assert(getFreePracticeStatus(refreshed, T + 3599).isRunning);
});

test('viewing an answer or hint is allowed and never records a result', () => {
  let state = startFreePractice({ problemId: 'q1' }, T, 's');
  state = markFreePracticeReveal(state, 'answer', T + 1000);
  state = markFreePracticeReveal(state, 'hint', T + 2000);
  assert.equal(state.freePracticeAttempts.length, 0);
  assert.equal(getFreePracticeStatus(state, T + 2500).selectedOutcome, null);
  assert.equal(state.freePracticeSession.answerViewed, true);
  assert.equal(state.freePracticeSession.hintViewed, true);
});

test('all three outcomes each create exactly one counted attempt and stop its timer', () => {
  for (const outcome of ['correct', 'idea_wrong', 'wrong']) {
    const started = startFreePractice({ problemId: 'q' }, T, `s-${outcome}`);
    const state = recordFreePracticeOutcome(started, outcome, T + 19250, 'not-the-session-id');
    assert.equal(state.freePracticeAttempts.length, 1);
    assert.equal(state.freePracticeAttempts[0].id, `s-${outcome}`);
    assert.equal(state.freePracticeAttempts[0].elapsedSeconds, 19);
    assert.equal(state.freePracticeAttempts[0].recordedAt, date(T + 19250));
    assert.equal(state.freePracticeSession, null);
    const status = getFreePracticeStatus(state, T + 50000);
    assert.equal(status.selectedOutcome, outcome);
    assert.equal(status.elapsedSeconds, 19);
    assert.equal(status.isRunning, false);
  }
});

test('editing repeatedly preserves the first recorded timestamp, duration, and 24-hour deadline', () => {
  let state = recordFreePracticeOutcome(startFreePractice({}, T, 's'), 'wrong', T + 5000);
  const anchor = T + 5000;
  state = recordFreePracticeOutcome(state, 'idea_wrong', anchor + 2 * 3600000);
  state = recordFreePracticeOutcome(state, 'correct', anchor + DAY - 1);
  assert.equal(state.freePracticeAttempts.length, 1);
  assert.equal(state.freePracticeAttempts[0].recordedAt, date(anchor));
  assert.equal(state.freePracticeAttempts[0].elapsedSeconds, 5);
  assert.equal(state.freePracticeAttempts[0].outcome, 'correct');
  assert.equal(getFreePracticeStatus(state, anchor + DAY - 1).windowExpiresAtMs, anchor + DAY);
  assert.equal(getFreePracticeStatus(state, anchor + DAY).selectedOutcome, null);
  assert.equal(getFreePracticeStatus(state, anchor + DAY).canRevise, false);
});

test('at exactly 24 hours a new outcome creates another record, without erasing history', () => {
  const previous = recordFreePracticeOutcome(startFreePractice({}, T, 'old'), 'wrong', T + 4000);
  const expiry = T + 4000 + DAY;
  const opened = startFreePractice(previous, expiry, 'new');
  assert.equal(getFreePracticeStatus(opened, expiry).selectedOutcome, null);
  assert.equal(opened.freePracticeSession.startedAt, date(expiry));
  const next = recordFreePracticeOutcome(opened, 'correct', expiry + 9000);
  assert.equal(next.freePracticeAttempts.length, 2);
  assert.deepEqual(next.freePracticeAttempts[0], previous.freePracticeAttempts[0]);
  assert.equal(next.freePracticeAttempts[1].elapsedSeconds, 9);
  const direct = recordFreePracticeOutcome(previous, 'idea_wrong', expiry, 'direct');
  assert.equal(direct.freePracticeAttempts.length, 2);
  assert.equal(direct.freePracticeAttempts[1].elapsedSeconds, 0);
});

test('answer reveal after recording keeps the same attempt and never extends its window', () => {
  const state = { freePracticeAttempts: [attempt('s', T)] };
  const revealed = markFreePracticeReveal(state, 'answer', T + DAY - 1);
  assert.equal(revealed.freePracticeAttempts.length, 1);
  assert.equal(revealed.freePracticeAttempts[0].answerViewed, true);
  assert.equal(revealed.freePracticeAttempts[0].recordedAt, date(T));
  assert.equal(getFreePracticeStatus(revealed, T + DAY).selectedOutcome, null);
  const fresh = markFreePracticeReveal(revealed, 'hint', T + DAY);
  assert.equal(fresh.freePracticeAttempts.length, 1);
  assert.equal(fresh.freePracticeSession.answerViewed, false);
  assert.equal(fresh.freePracticeSession.hintViewed, true);
});

test('revealing in a stale tab cannot overwrite a newer outcome during sync', () => {
  const state = { freePracticeAttempts: [attempt('s', T, 'correct')] };
  const edited = recordFreePracticeOutcome(state, 'wrong', T + 1000);
  const staleReveal = markFreePracticeReveal(state, 'answer', T + 2000);
  const [merged] = mergeFreePracticeAttempts([edited.freePracticeAttempts, staleReveal.freePracticeAttempts]);
  assert.equal(merged.outcome, 'wrong');
  assert.equal(merged.answerViewed, true);
  assert.equal(merged.updatedAt, date(T + 1000));
});

test('same-ID cloud merges take the newest result but cannot move the first window or duration', () => {
  const original = attempt('s', T, 'wrong');
  const later = attempt('s', T + 30000, 'correct', { updatedAt: date(T + 50000), elapsedSeconds: 99, answerViewed: true });
  const [merged] = mergeFreePracticeAttempts([[original], [later]]);
  assert.equal(merged.recordedAt, original.recordedAt);
  assert.equal(merged.elapsedSeconds, 10);
  assert.equal(merged.outcome, 'correct');
  assert.equal(merged.answerViewed, true);
  assert.deepEqual(mergeFreePracticeAttempts([[later], [original]]), [merged]);
});

test('different devices collapse into fixed 24-hour windows, including exact-boundary records', () => {
  const a = attempt('a', T, 'wrong'), b = attempt('b', T + DAY - 1, 'correct'), c = attempt('c', T + DAY, 'idea_wrong');
  const merged = mergeFreePracticeAttempts([[c, b], [a]]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'a');
  assert.equal(merged[0].outcome, 'correct');
  assert.equal(merged[0].recordedAt, date(T));
  assert.equal(merged[0].syncRecords.length, 2);
  assert.equal(merged[1].id, 'c');
});

test('incremental out-of-order merges retain evidence needed to recover the next window', () => {
  const a = attempt('a', T), b = attempt('b', T + 23 * 3600000, 'wrong'), c = attempt('c', T + 25 * 3600000, 'idea_wrong');
  const simultaneous = mergeFreePracticeAttempts([[a, b, c]]);
  const firstLate = mergeFreePracticeAttempts([[b], [c]]);
  assert.equal(firstLate.length, 1);
  const incremental = mergeFreePracticeAttempts([firstLate, [a]]);
  assert.deepEqual(incremental, simultaneous);
  assert.deepEqual(mergeFreePracticeAttempts([simultaneous, [a, b, c]]), simultaneous);
  assert.equal(incremental.length, 2);
  assert.equal(incremental[1].id, 'c');
});

test('editing and revealing a merged result updates its leaf without reopening discarded session IDs', () => {
  const attempts = mergeFreePracticeAttempts([[attempt('a', T, 'wrong'), attempt('b', T + 1000, 'correct')]]);
  let state = { freePracticeAttempts: attempts, freePracticeSession: { id: 'b', startedAt: date(T), answerViewed: false, hintViewed: false } };
  state = recordFreePracticeOutcome(state, 'idea_wrong', T + 2000);
  state = markFreePracticeReveal(state, 'answer', T + 3000);
  assert.equal(state.freePracticeAttempts.length, 1);
  assert.equal(state.freePracticeAttempts[0].outcome, 'idea_wrong');
  assert(state.freePracticeAttempts[0].answerViewed);
  assert.equal(state.freePracticeSession, null);
  assert.deepEqual(mergeFreePracticeAttempts([attempts, state.freePracticeAttempts]), state.freePracticeAttempts);
  const stale = { ...state, freePracticeSession: { id: 'b', startedAt: date(T) } };
  assert.equal(getFreePracticeStatus(stale, T + DAY).isRunning, false);
  assert.notEqual(startFreePractice(stale, T + DAY, 'b').freePracticeSession.id, 'b');
});

test('normalization rejects corrupt entries while retaining an unbounded valid history', () => {
  const history = Array.from({ length: 600 }, (_, i) => attempt(`s-${i}`, T + i * DAY));
  const normalized = normalizeFreePracticeAttempts([...history, null, {}, { ...history[0], id: 'bad', outcome: 'maybe' }, { ...history[0], id: 'bad-date', startedAt: 'invalid' }]);
  assert.equal(normalized.length, 600);
  assert.equal(normalized.at(-1).id, 's-599');
  assert.equal(normalizeFreePracticeSession({ id: 'x', startedAt: 'bad' }), null);
  assert.equal(normalizeFreePracticeSession(null), null);
  assert.deepEqual(normalizeFreePracticeAttempts(undefined), []);
});

test('all operations preserve unrelated state and do not mutate frozen inputs', () => {
  const state = freeze({ problemId: 'q', completed: true, completedAt: 'old', favorite: true, interviewCount: 7,
    updatedAt: 'saved-elsewhere', scoreHistory: [{ id: 'score' }], freePracticeAttempts: [] });
  const started = startFreePractice(state, T, 's');
  const revealed = markFreePracticeReveal(freeze(started), 'answer', T + 1000);
  const recorded = recordFreePracticeOutcome(freeze(revealed), 'correct', T + 5000);
  const edited = recordFreePracticeOutcome(freeze(recorded), 'wrong', T + 10000);
  for (const key of ['completed', 'completedAt', 'favorite', 'interviewCount', 'updatedAt', 'scoreHistory']) assert.deepEqual(edited[key], state[key]);
  assert.deepEqual(state.freePracticeAttempts, []);
  assert.equal(edited.freePracticeAttempts.length, 1);
  assert.throws(() => recordFreePracticeOutcome(state, 'maybe', T), /Invalid/);
  assert.throws(() => markFreePracticeReveal(state, 'unknown', T), /Invalid/);
  assert.throws(() => getFreePracticeStatus(state, NaN), /timestamp/);
});
