import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLeetCodeProgress, summarizeLeetCodeRange } from '../src/features/leetcode/leetcodeProgress.js';

const now = '2026-09-20T18:00:00Z';
const options = { now, timeZone: 'UTC' };
const row = (id, problemSlug, submittedAt) => ({ id, problemSlug, submittedAt, status: 'AC' });
const snapshot = (extra = {}) => ({ connection: { site: 'cn', username: 'fixture', lastSyncedAt: '2026-09-20T12:00:00Z' },
  syncedSubmissions: [], importedSubmissions: [], syncedLifetimeSolvedCount: 0, coverage: {}, ...extra });

test('complete private history separates first solved problems from counted repeats without changing trusted fields', () => {
  const input = snapshot({ syncedLifetimeSolvedCount: 2,
    syncedSubmissions: [row('repeat', 'one', '2026-09-19T15:00:00Z')],
    importedSubmissions: [row('first', 'one', '2026-09-12T12:00:00Z'), row('second', 'two', '2026-09-19T12:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-20T13:00:00Z' } });
  const before = structuredClone(input);
  const progress = summarizeLeetCodeProgress(input, options);
  assert.equal(progress.newTotal, 2);
  assert.equal(progress.total, 3);
  assert.equal(progress.complete, false, 'the captured snapshot cannot certify activity after its cutoff');
  assert.equal(progress.newStatus, 'ready');
  assert.equal(progress.countStatus, 'partial');
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19'), {
    leetcodeNew: 1, leetcode: 2, leetcodeNewStatus: 'ready', leetcodeCountStatus: 'ready',
  });
  assert.deepEqual(input, before);
});

test('profile distinct total is a floor while partial history cannot establish first-completion dates', () => {
  const progress = summarizeLeetCodeProgress(snapshot({ syncedLifetimeSolvedCount: 85,
    importedSubmissions: [row('a', 'one', '2026-09-19T12:00:00Z'), row('b', 'one', '2026-09-19T15:00:00Z')] }), options);
  assert.equal(progress.newTotal, 85);
  assert.equal(progress.total, 86);
  assert.equal(progress.missingDates, 84);
  assert.equal(progress.complete, false);
  assert.equal(progress.newStatus, 'ready');
  assert.equal(progress.countStatus, 'partial');
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19'), {
    leetcodeNew: null, leetcode: 2, leetcodeNewStatus: 'partial', leetcodeCountStatus: 'partial',
  });
});

test('later refreshes preserve closed Stage accuracy while retaining known newer work as partial', () => {
  const progress = summarizeLeetCodeProgress(snapshot({
    connection: { site: 'cn', username: 'fixture', lastSyncedAt: now }, syncedLifetimeSolvedCount: 3,
    importedSubmissions: [row('old', 'one', '2026-09-19T12:00:00Z'), row('before-cutoff', 'two', '2026-09-20T11:00:00Z')],
    syncedSubmissions: [row('later', 'three', '2026-09-20T17:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-20T12:00:00Z' },
  }), options);
  assert.equal(progress.complete, false);
  assert.equal(progress.newTotal, 3);
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19'), {
    leetcodeNew: 1, leetcode: 1, leetcodeNewStatus: 'ready', leetcodeCountStatus: 'ready',
  });
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-19', '2026-09-20'), {
    leetcodeNew: 1, leetcode: 2, leetcodeNewStatus: 'partial', leetcodeCountStatus: 'partial',
  });
});

test('fresh sync timestamps alone do not downgrade a historically closed Stage', () => {
  const progress = summarizeLeetCodeProgress(snapshot({ connection: { site: 'cn', username: 'fixture', lastSyncedAt: now },
    syncedLifetimeSolvedCount: 1, importedSubmissions: [row('old', 'one', '2026-09-19T12:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-20T12:00:00Z' } }), options);
  assert.equal(progress.complete, false);
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19').leetcodeNewStatus, 'ready');
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-19', '2026-09-20').leetcodeNew, 0);
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-19', '2026-09-20').leetcodeNewStatus, 'partial');
});

test('missing, future or invalid complete-import cutoffs cannot certify first completions', () => {
  for (const personalHistoryCompleteThrough of [undefined, 'invalid', '2026-02-30T12:00:00Z', '2026-09-21T12:00:00Z']) {
    const progress = summarizeLeetCodeProgress(snapshot({ syncedLifetimeSolvedCount: 1,
      importedSubmissions: [row('old', 'one', '2026-09-19T12:00:00Z')],
      coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough } }), options);
    assert.equal(progress.complete, false);
    assert.equal(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19').leetcodeNew, null);
  }
});

test('an imported distinct count above a stale profile is retained as a known lower bound', () => {
  const progress = summarizeLeetCodeProgress(snapshot({ syncedLifetimeSolvedCount: 1,
    importedSubmissions: [row('a', 'one', '2026-09-19T12:00:00Z'), row('b', 'two', '2026-09-19T15:00:00Z')] }), options);
  assert.equal(progress.newTotal, 2);
  assert.equal(progress.total, 2);
  assert.equal(progress.newStatus, 'partial');
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-20', '2026-09-19').leetcode, null);
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-19', '2026-09-19').leetcodeNew, 0);
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19', false).leetcodeNewStatus, 'unavailable');
});

test('a supposedly complete export contradicted by an earlier profile cannot certify historical Stage firsts', () => {
  const progress = summarizeLeetCodeProgress(snapshot({ syncedLifetimeSolvedCount: 85,
    importedSubmissions: [row('known', 'one', '2026-09-19T12:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-20T13:00:00Z' } }), options);
  assert.equal(progress.newTotal, 85);
  assert.equal(progress.complete, false);
  assert.equal(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-19').leetcodeNew, null);
  assert.equal(summarizeLeetCodeRange(progress, '2026-02-30', '2026-09-19').leetcodeCountStatus, 'unavailable');
});

test('a stale complete snapshot never certifies a later Stage even before another public refresh', () => {
  const progress = summarizeLeetCodeProgress(snapshot({
    connection: { site: 'cn', username: 'fixture', lastSyncedAt: '2026-09-18T12:00:00Z' },
    syncedLifetimeSolvedCount: 1, importedSubmissions: [row('old', 'one', '2026-09-17T12:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-18T13:00:00Z' },
  }), options);
  assert.equal(progress.newTotal, 1);
  assert.equal(progress.newStatus, 'ready', 'the profile still supplies a known distinct total');
  assert.equal(progress.total, 1);
  assert.equal(progress.countStatus, 'partial');
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-19', '2026-09-20'), {
    leetcodeNew: null, leetcode: null, leetcodeNewStatus: 'partial', leetcodeCountStatus: 'partial',
  });
  assert.deepEqual(summarizeLeetCodeRange({ ...progress, complete: true }, '2026-09-19', '2026-09-20'), {
    leetcodeNew: null, leetcode: null, leetcodeNewStatus: 'partial', leetcodeCountStatus: 'partial',
  }, 'an aggregate completeness flag cannot bypass a dated cutoff');
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-13', '2026-09-17'), {
    leetcodeNew: 1, leetcode: 1, leetcodeNewStatus: 'ready', leetcodeCountStatus: 'ready',
  });
  assert.deepEqual(summarizeLeetCodeRange(progress, '2026-09-17', '2026-09-18'), {
    leetcodeNew: 0, leetcode: 0, leetcodeNewStatus: 'partial', leetcodeCountStatus: 'partial',
  }, 'the captured portion of the cutoff day can show recorded zero without claiming the full day');
});
