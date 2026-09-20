import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildActivityChart } from '../src/features/overview/activityChartModel.js';
import { collectOverviewRecords, ACTIVITY_WEIGHTS } from '../src/features/overview/activityMetrics.js';

const options = { month: '2026-09', today: '2026-09-20' };
const zeroCounts = { applications: 0, leetcode: 0, technical: 0, behavioral: 0, mentalMath: 0 };
const missingCounts = Object.fromEntries(Object.keys(zeroCounts).map(kind => [kind, null]));
const record = (kind, key, day, extra = {}) => ({ kind, key, day, ...extra });
const bundle = (records = [], extra = {}) => ({ records, sources: { personal: true, applications: true, leetcode: true },
  personalComplete: true, applicationsComplete: true, leetcodeComplete: true,
  leetcodeProgress: { complete: true, completions: [], firstCompletions: [], calendar: {} }, ...extra });

test('month days are complete civil dates, with future days separate from confirmed zero', () => {
  const result = buildActivityChart(bundle(), options);
  assert.equal(result.buckets.length, 30);
  assert.equal(result.buckets[0].key, '2026-09-01');
  assert.equal(result.buckets.at(-1).key, '2026-09-30');
  assert.deepEqual(result.buckets[19].counts, zeroCounts);
  assert.equal(result.buckets[19].value, 0);
  assert.equal(result.buckets[19].future, false);
  assert.deepEqual(result.buckets[20].counts, missingCounts);
  assert.equal(result.buckets[20].value, null);
  assert.equal(result.buckets[20].future, true);
  assert.equal(result.partial, false, 'future dates do not make observed data partial');
  assert.deepEqual(result.totals, zeroCounts);
  assert.equal(result.totalValue, 0);
  assert.equal(result.axisMax, 1);
});

test('five daily kinds keep the established weights and count Mental Math trials instead of correct-answer scores', () => {
  const rows = Object.keys(ACTIVITY_WEIGHTS).map(kind => record(kind, 'shared-id', '2026-09-19', { score: 90, count: 900 }));
  const score = buildActivityChart(bundle(rows), options);
  const count = buildActivityChart(bundle(rows), { ...options, metric: 'count' });
  assert.deepEqual(score.totals, { applications: 1, leetcode: 1, technical: 1, behavioral: 1, mentalMath: 1 });
  assert.equal(score.totalValue, 32);
  assert.equal(score.buckets[18].value, 32);
  assert.equal(count.totalValue, 5);
  assert.equal(count.buckets[18].value, 5);
  assert.equal(score.axisMax, 40);
  assert.equal(count.axisMax, 5);
});

test('weekly buckets sum deduplicated daily counts, allowing the same Tech question to count on another day', () => {
  const rows = [record('technical', 'same', '2026-09-14'), record('technical', 'same', '2026-09-14'),
    record('technical', 'same', '2026-09-15'), record('behavioral', 'same', '2026-09-15'),
    record('leetcode', 'attempt-one', '2026-09-15'), record('leetcode', 'attempt-two', '2026-09-15')];
  const input = bundle(rows);
  const before = structuredClone(input);
  const daily = buildActivityChart(input, options);
  const weekly = buildActivityChart(input, { ...options, granularity: 'week' });
  assert.deepEqual(weekly.totals, daily.totals);
  assert.equal(weekly.totalValue, daily.totalValue);
  assert.equal(weekly.totalValue, 40);
  assert.equal(weekly.buckets.find(item => item.start === '2026-09-14').counts.technical, 2);
  assert.equal(weekly.buckets.find(item => item.start === '2026-09-14').counts.leetcode, 2);
  assert.equal(daily.buckets[13].counts.technical, 1);
  assert.deepEqual(input, before);
  assert.deepEqual(buildActivityChart(bundle([...rows].reverse()), options), daily);
});

test('Monday weeks clip both ends to the selected month and exclude adjacent-month or future records', () => {
  const result = buildActivityChart(bundle([
    record('applications', 'before', '2026-08-31'), record('applications', 'inside', '2026-09-01'),
    record('applications', 'later', '2026-09-21'), record('applications', 'after', '2026-10-01'),
  ]), { ...options, granularity: 'week' });
  assert.deepEqual(result.buckets.map(item => [item.start, item.end]), [
    ['2026-09-01', '2026-09-06'], ['2026-09-07', '2026-09-13'], ['2026-09-14', '2026-09-20'],
    ['2026-09-21', '2026-09-27'], ['2026-09-28', '2026-09-30'],
  ]);
  assert.equal(result.totalValue, 2);
  assert.equal(result.totals.applications, 1);
  assert.equal(result.buckets[3].future, true);
  assert.equal(result.buckets[3].value, null);
  const midweek = buildActivityChart(bundle(), { ...options, today: '2026-09-16', granularity: 'week' });
  assert.equal(midweek.buckets[2].future, false);
  assert.equal(midweek.buckets[2].value, 0);
  assert.equal(midweek.buckets[2].partial, false);
});

test('unavailable, incomplete, and confirmed-empty sources remain distinguishable', () => {
  const unavailable = buildActivityChart({}, options);
  assert.deepEqual(unavailable.totals, missingCounts);
  assert.equal(unavailable.totalValue, null);
  assert.equal(unavailable.buckets[0].value, null);
  assert.equal(unavailable.partial, true);
  const input = bundle([record('technical', 'known', '2026-09-10'), record('applications', 'must-not-leak', '2026-09-10')], {
    sources: { personal: true, applications: false, leetcode: false }, personalComplete: false,
  });
  const partial = buildActivityChart(input, options);
  assert.deepEqual(partial.totals, { applications: null, leetcode: null, technical: 1, behavioral: null, mentalMath: null });
  assert.equal(partial.buckets[0].value, null);
  assert.equal(partial.buckets[9].value, 10);
  assert.equal(partial.buckets[9].partial, true);
  assert.equal(partial.totalValue, 10);
  const knownZero = buildActivityChart(bundle([], { sources: { personal: true, applications: false, leetcode: false } }), options);
  assert.equal(knownZero.totalValue, 0);
  assert.equal(knownZero.partial, true);
  assert.deepEqual(knownZero.totals, { applications: null, leetcode: null, technical: 0, behavioral: 0, mentalMath: 0 });
});

test('LeetCode daily readiness uses the existing cutoff rule without distributing undated profile totals', () => {
  const source = collectOverviewRecords({ leetcodeSnapshot: {
    connection: { site: 'cn', username: 'fixture', lastSyncedAt: '2026-09-20T18:00:00Z' }, syncedLifetimeSolvedCount: 85,
    syncedSubmissions: [], importedSubmissions: [{ id: 'one', problemSlug: 'one', status: 'AC', submittedAt: '2026-09-17T12:00:00Z' }],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-18T13:00:00Z' },
  } }, { now: '2026-09-20T18:00:00Z', timeZone: 'UTC' });
  const result = buildActivityChart(source, options);
  assert.equal(result.buckets[15].counts.leetcode, 0);
  assert.equal(result.buckets[15].partial, false);
  assert.equal(result.buckets[16].counts.leetcode, 1);
  assert.equal(result.buckets[17].counts.leetcode, 0);
  assert.equal(result.buckets[17].partial, true, 'the cutoff day only has a recorded portion');
  assert.equal(result.buckets[18].counts.leetcode, null);
  assert.equal(result.buckets[18].partial, true);
  assert.equal(result.totals.leetcode, 1, 'the profile floor of 85 has no dated chart credit');
  assert.equal(result.totalValue, 5);
});

test('chart uses qualifying LeetCode completion IDs without restarting the three-hour rule at midnight', () => {
  const source = collectOverviewRecords({ leetcodeSnapshot: {
    connection: { site: 'cn', username: 'fixture', lastSyncedAt: '2026-09-20T18:00:00Z' }, syncedLifetimeSolvedCount: 1,
    syncedSubmissions: [
      { id: 'first', problemSlug: 'one', status: 'AC', submittedAt: '2026-09-18T23:00:00Z' },
      { id: 'ignored', problemSlug: 'one', status: 'AC', submittedAt: '2026-09-19T00:00:00Z' },
      { id: 'repeat', problemSlug: 'one', status: 'AC', submittedAt: '2026-09-19T02:00:00Z' },
    ], coverage: { historyComplete: true },
  } }, { now: '2026-09-20T18:00:00Z', timeZone: 'UTC' });
  const result = buildActivityChart(source, options);
  assert.equal(result.buckets[17].counts.leetcode, 1);
  assert.equal(result.buckets[18].counts.leetcode, 1);
  assert.equal(result.totals.leetcode, 2);
  assert.equal(result.totalValue, 10);
});

test('invalid, dateless, non-chart and future records cannot affect chart values or the axis', () => {
  const result = buildActivityChart(bundle([
    record('applications', 'undated', ''), record('applications', 'bad-date', '2026-09-31'),
    record('technical', '', '2026-09-10'), record('experiences', 'read', '2026-09-10'),
    record('mentalMath', 'future', '2026-09-21', { score: 10000 }), record('technical', 'valid', '2026-09-10'),
    record('technical', 42, '2026-09-10'), null,
  ]), options);
  assert.equal(result.totalValue, 10);
  assert.equal(result.axisMax, 10);
  assert.equal(result.totals.mentalMath, 0);
});

test('month ends include leap days and keep week/date generation stable across DST zones', () => {
  for (const [month, length] of [['2025-02', 28], ['2024-02', 29], ['2026-04', 30], ['2026-12', 31]]) {
    const chart = buildActivityChart(bundle(), { month, today: '2026-12-31' });
    assert.equal(chart.buckets.length, length);
    assert.equal(chart.buckets.at(-1).end, `${month}-${length}`);
  }
  const url = new URL('../src/features/overview/activityChartModel.js', import.meta.url).href;
  const outputs = [];
  for (const TZ of ['America/Los_Angeles', 'Asia/Shanghai', 'Europe/Berlin']) {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { buildActivityChart } from ${JSON.stringify(url)};
      process.stdout.write(JSON.stringify(['2026-03', '2026-11'].map(month => buildActivityChart({}, {month, today:'2026-12-31', granularity:'week'}).buckets.map(({start,end})=>[start,end]))));
    `], { encoding: 'utf8', env: { ...process.env, TZ } });
    assert.equal(run.status, 0, run.stderr);
    outputs.push(run.stdout);
  }
  assert.equal(new Set(outputs).size, 1);
});

test('a wholly future month is unobserved rather than an empty or unsynced month', () => {
  const result = buildActivityChart(bundle([record('technical', 'future', '2026-10-01')]), { ...options, month: '2026-10', granularity: 'week' });
  assert.equal(result.buckets.every(item => item.future && item.value === null && !item.partial), true);
  assert.deepEqual(result.totals, missingCounts);
  assert.equal(result.totalValue, null);
  assert.equal(result.partial, false);
  assert.equal(result.axisMax, 1);
});

test('invalid chart controls are rejected instead of silently shifting a month or score basis', () => {
  for (const month of ['2026-13', '2026-00', '2026-2', '0000-01', 'not-a-month']) {
    assert.throws(() => buildActivityChart(bundle(), { ...options, month }), RangeError);
  }
  for (const patch of [{ today: '2026-02-30' }, { today: '2026-09-20T12:00:00Z' }, { granularity: 'year' }, { metric: 'xp' }]) {
    assert.throws(() => buildActivityChart(bundle(), { ...options, ...patch }), RangeError);
  }
  assert.equal(buildActivityChart(bundle(), { today: options.today }).month, '2026-09');
});
