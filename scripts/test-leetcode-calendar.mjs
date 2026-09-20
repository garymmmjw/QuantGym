import test from "node:test";
import assert from "node:assert/strict";
import { collectLeetCodeActivities, leetcodeDailySummary, leetcodeProblemUrl, leetcodeSubmissionDay } from "../src/features/personal/calendar/leetcodeCalendar.js";
import { buildDailySummaries, summarizeActivities } from "../src/features/personal/calendar/calendarModel.js";

const submission = (id, submittedAt, problemSlug = "two-sum") => ({ id, submittedAt, problemSlug, title: "两数之和", titleEn: "Two Sum", status: "AC" });
const snapshot = (submissions = [], extra = {}) => ({ connection: { site: "cn", username: "fixture" }, submissions, syncedSubmissions: submissions, ...extra });

test("accepted submission instants follow the selected local time zone across a date boundary", () => {
  assert.equal(leetcodeSubmissionDay("2026-09-11T01:00:00Z", "America/Chicago"), "2026-09-10");
  assert.equal(leetcodeSubmissionDay("2026-09-11T01:00:00Z", "Asia/Shanghai"), "2026-09-11");
  assert.equal(leetcodeSubmissionDay("2026-09-11T00:30:00+08:00", "UTC"), "2026-09-10");
});

test("nearby accepted attempts count once while raw accepted submissions remain separate", () => {
  const records = collectLeetCodeActivities(snapshot([
    submission("1", "2026-09-11T01:00:00Z"),
    submission("1", "2026-09-11T01:00:00Z"),
    submission("2", "2026-09-11T02:00:00Z"),
    submission("3", "2026-09-11T03:00:00Z", "three-sum"),
    submission("4", "2026-09-12T01:00:00Z")
  ]), { timeZone: "UTC" });
  assert.equal(records.activities.length, 3);
  assert.deepEqual(leetcodeDailySummary(records, "2026-09-11"), { solved: 2, acceptedSubmissions: 3, sourceSubmissions: null });
  assert.equal(leetcodeDailySummary(records, "2026-09-12").solved, 1);
  assert.equal(records.activities.find((item) => item.id.endsWith("2026-09-11:two-sum")).completedAt, "2026-09-11T01:00:00Z");
});

test("the same problem counts again at the inclusive three-hour boundary measured from the last counted attempt", () => {
  const input = snapshot([
    submission('first', '2026-09-11T00:00:00Z'),
    submission('too-soon', '2026-09-11T02:59:59Z'),
    submission('boundary', '2026-09-11T03:00:00Z'),
    submission('still-too-soon', '2026-09-11T05:59:59Z'),
    { ...submission('next-boundary', '2026-09-11T06:00:00Z'), frontendId: '1' },
    submission('independent', '2026-09-11T01:00:00Z', 'three-sum'),
  ]);
  const before = structuredClone(input);
  const records = collectLeetCodeActivities(input, { timeZone: 'UTC' });
  assert.deepEqual(leetcodeDailySummary(records, '2026-09-11'), { solved: 4, acceptedSubmissions: 6, sourceSubmissions: null });
  const twoSum = records.activities.find(item => item.problemSlug === 'two-sum');
  assert.equal(twoSum.count, 3, 'one compact row can represent three counted solves');
  assert.equal(twoSum.submissionCount, 5);
  assert.equal(twoSum.frontendId, '1');
  assert.equal(twoSum.completedAt, '2026-09-11T06:00:00Z');
  assert.equal(summarizeActivities(records.activities).totalQuestions, 4, 'total must sum counted solves, not activity rows');
  assert.deepEqual(input, before, 'sync history stays read-only');
  const reversed = collectLeetCodeActivities(snapshot([...input.syncedSubmissions].reverse()), { timeZone: 'UTC' });
  assert.deepEqual(reversed, records, 'API ordering cannot affect greedy chronological selection');
});

test("midnight does not reset the interval and raw accepted attempts survive a zero-credit day", () => {
  const first = submission('previous-day', '2026-09-11T23:30:00Z');
  const nearby = submission('next-day', '2026-09-12T00:10:00Z');
  const limited = collectLeetCodeActivities(snapshot([nearby, first]), { timeZone: 'UTC' });
  assert.deepEqual(leetcodeDailySummary(limited, '2026-09-12'), { solved: 0, acceptedSubmissions: 1, sourceSubmissions: null });
  assert.equal(limited.activities.filter(item => item.dayKey === '2026-09-12').length, 0);
  const records = collectLeetCodeActivities(snapshot([nearby, first,
    submission('one-second-short', '2026-09-12T02:29:59Z'),
    submission('three-hours', '2026-09-12T02:30:00Z'),
  ]), { timeZone: 'UTC' });
  assert.deepEqual(leetcodeDailySummary(records, '2026-09-12'), { solved: 1, acceptedSubmissions: 3, sourceSubmissions: null });
  assert.equal(summarizeActivities(records.activities).totalQuestions, 2);
});

test("three-hour qualification uses absolute time while credited days follow the viewer time zone", () => {
  const input = snapshot([
    submission('dst-first', '2025-11-02T01:00:00-05:00'),
    submission('dst-repeat', '2025-11-02T01:00:00-06:00'),
    submission('dst-three-hours', '2025-11-02T03:00:00-06:00'),
  ]);
  for (const timeZone of ['America/Chicago', 'Asia/Shanghai', 'UTC']) {
    const records = collectLeetCodeActivities(input, { timeZone });
    assert.equal(summarizeActivities(records.activities).totalQuestions, 2, timeZone);
    assert.deepEqual(leetcodeDailySummary(records, '2025-11-02'), { solved: 2, acceptedSubmissions: 3, sourceSubmissions: null });
  }
  const acrossDate = snapshot([submission('a', '2026-09-11T23:00:00Z'), submission('b', '2026-09-12T02:00:00Z')]);
  const utc = collectLeetCodeActivities(acrossDate, { timeZone: 'UTC' });
  const chicago = collectLeetCodeActivities(acrossDate, { timeZone: 'America/Chicago' });
  assert.deepEqual(utc.activities.map(item => [item.dayKey, item.count]), [['2026-09-12', 1], ['2026-09-11', 1]]);
  assert.deepEqual(chicago.activities.map(item => [item.dayKey, item.count]), [['2026-09-11', 2]]);
  assert.equal(buildDailySummaries(utc.activities, '2026-09-12', 2).reduce((sum, day) => sum + day.totalQuestions, 0), 2);
});

test("duplicate submission identities cannot inflate raw attempts or counted solves", () => {
  const duplicate = submission('same-id', '2026-09-11T00:00:00Z');
  const input = snapshot([duplicate, { ...duplicate },
    submission('', '2026-09-11T03:00:00Z'),
    submission('', '2026-09-10T22:00:00-05:00'),
    { ...submission('different', '2026-09-11T06:00:00Z'), frontendId: '1' },
  ]);
  const records = collectLeetCodeActivities(input, { timeZone: 'UTC' });
  assert.deepEqual(leetcodeDailySummary(records, '2026-09-11'), { solved: 3, acceptedSubmissions: 3, sourceSubmissions: null });
});

test("future and pre-2000 ACs are discarded before deduplication and chronological repeat selection", () => {
  const now = Date.parse('2026-09-14T12:00:00Z');
  const records = collectLeetCodeActivities(snapshot([
    submission('current', '2026-09-15T11:00:00Z'),
    submission('past', '1999-12-31T23:59:59Z'),
    submission('past', '2026-09-14T09:00:00Z'),
    submission('current', '2026-09-14T12:00:00Z'),
    submission('future-boundary', '2026-09-14T12:00:00.001Z', 'three-sum'),
    submission('lower-boundary', '2000-01-01T00:00:00Z', 'four-sum'),
  ]), { timeZone: 'UTC', now });
  assert.deepEqual(leetcodeDailySummary(records, '2026-09-14'), { solved: 2, acceptedSubmissions: 2, sourceSubmissions: null });
  assert.equal(records.activities.find(item => item.problemSlug === 'two-sum').count, 2);
  assert.equal(leetcodeDailySummary(records, '2000-01-01').solved, 1);
  assert.equal(leetcodeDailySummary(records, '2026-09-15').acceptedSubmissions, 0);
  assert.equal(records.activities.some(item => item.problemSlug === 'three-sum'), false);
});

test("invalid or dateless timestamps and non-accepted submissions cannot create solved activity", () => {
  const records = collectLeetCodeActivities(snapshot([
    submission("1", "2026-02-30T01:00:00Z"),
    submission("2", "2026-09-11"),
    submission("3", "2026-09-11T01:00:00"),
    submission("4", "invalid"),
    { ...submission("5", "2026-09-11T01:00:00Z"), status: "WA" }
  ]));
  assert.equal(records.activities.length, 0);
  assert.equal(leetcodeSubmissionDay("2026-09-11T01:00:00Z", "Invalid/Zone"), "");
});

test("the mixed legacy submissions array cannot masquerade as explicit personal history", () => {
  const imported = [submission("manual-ac", "2026-09-11T01:00:00Z")];
  assert.equal(collectLeetCodeActivities({ connection: { site: 'cn', username: 'fixture' }, submissions: imported }).activities.length, 0);
  assert.equal(collectLeetCodeActivities(snapshot(imported, { syncedSubmissions: [] })).activities.length, 0);
  const records = collectLeetCodeActivities(snapshot(imported, { syncedSubmissions: [submission('real-ac', '2026-09-11T02:00:00Z', 'three-sum')] }), { timeZone: 'UTC' });
  assert.deepEqual(records.activities.map(item => item.problemSlug), ['three-sum']);
  assert.equal(leetcodeDailySummary(records, '2026-09-11').solved, 1);
});

test("historical heatmap buckets stay on their source date and never become solved problems", () => {
  const records = collectLeetCodeActivities(snapshot([], {
    calendar: [{ date: "2026-09-11", submissions: 9 }, { date: "2026-09-11", submissions: 9 }, { date: "2026-02-30", submissions: 4 }],
    coverage: { calendarTimeZone: "UTC", historyComplete: false }
  }), { timeZone: "America/Chicago" });
  assert.equal(records.calendarTimeZone, "UTC");
  assert.deepEqual(records.calendarDays, [{ dayKey: "2026-09-11", submissions: 9 }]);
  assert.deepEqual(leetcodeDailySummary(records, "2026-09-11"), { solved: null, acceptedSubmissions: 0, sourceSubmissions: 9 });
  assert.equal(records.activities.length, 0);
});

test("missing coverage keeps empty solved counts unknown; only explicitly complete history permits zero", () => {
  const partial = collectLeetCodeActivities(snapshot());
  assert.equal(partial.historyComplete, false);
  assert.equal(partial.calendarTimeZone, null);
  assert.equal(leetcodeDailySummary(partial, "2026-09-11").solved, null);
  const complete = collectLeetCodeActivities(snapshot([], { coverage: { historyComplete: true } }));
  assert.equal(leetcodeDailySummary(complete, "2026-09-11").solved, 0);
});

test("unlinked snapshots and arbitrary external problem URLs are ignored", () => {
  assert.equal(collectLeetCodeActivities({ submissions: [submission("1", "2026-09-11T01:00:00Z")] }).activities.length, 0);
  assert.equal(leetcodeProblemUrl("cn", "two-sum"), "https://leetcode.cn/problems/two-sum/");
  for (const value of ["//evil.example", "../other", "two-sum?next=evil", "https://evil.example", "a/b", ""]) assert.equal(leetcodeProblemUrl("cn", value), "");
  assert.equal(leetcodeProblemUrl("unexpected", "two-sum"), "");
});

test('individual completions preserve each inclusive three-hour solve while grouped calendar rows stay compact', () => {
  const records = collectLeetCodeActivities(snapshot([
    submission('a', '2026-09-11T00:00:00Z'),
    submission('ignored', '2026-09-11T02:59:59Z'),
    submission('b', '2026-09-11T03:00:00Z'),
    submission('c', '2026-09-11T06:00:00Z'),
    submission('different', '2026-09-11T01:00:00Z', 'three-sum'),
  ]), { timeZone: 'UTC' });
  assert.deepEqual(records.completions.map(item => item.submissionId), ['a', 'different', 'b', 'c']);
  assert.equal(new Set(records.completions.map(item => item.id)).size, 4);
  assert.ok(records.completions.every(item => item.count === 1 && item.source === 'leetcode' && item.kind === 'coding' && item.status === 'AC'));
  assert.deepEqual(records.completions.filter(item => item.problemSlug === 'two-sum').map(item => item.completedAt), [
    '2026-09-11T00:00:00Z', '2026-09-11T03:00:00Z', '2026-09-11T06:00:00Z',
  ]);
  assert.equal(records.activities.length, 2);
  assert.equal(records.activities.find(item => item.problemSlug === 'two-sum').count, 3);
  assert.equal(records.completions.length, records.activities.reduce((sum, item) => sum + item.count, 0));
});

test('completion qualification runs across midnight and ignored ACs do not move its anchor', () => {
  const records = collectLeetCodeActivities(snapshot([
    submission('start', '2026-09-11T23:00:00Z'),
    submission('midnight', '2026-09-12T00:00:00Z'),
    submission('near-boundary', '2026-09-12T01:59:59Z'),
    submission('boundary', '2026-09-12T02:00:00Z'),
    submission('too-soon-again', '2026-09-12T04:59:59Z'),
    submission('second-boundary', '2026-09-12T05:00:00Z'),
  ]), { timeZone: 'UTC' });
  assert.deepEqual(records.completions.map(item => [item.submissionId, item.dayKey]), [
    ['start', '2026-09-11'], ['boundary', '2026-09-12'], ['second-boundary', '2026-09-12'],
  ]);
  assert.equal(leetcodeDailySummary(records, '2026-09-12').acceptedSubmissions, 5);
  assert.equal(leetcodeDailySummary(records, '2026-09-12').solved, 2);
});

test('completion IDs and chronological selection are stable under duplicate delivery, input ordering and local-zone changes', () => {
  const one = submission('one', '2026-09-11T01:00:00Z');
  const two = submission('two', '2026-09-11T04:00:00Z');
  const input = snapshot([two, one, { ...two }, submission('near', '2026-09-11T03:00:00Z'), { ...one }]);
  const before = structuredClone(input);
  const utc = collectLeetCodeActivities(input, { timeZone: 'UTC' });
  const shuffled = collectLeetCodeActivities(snapshot([...input.syncedSubmissions].reverse()), { timeZone: 'UTC' });
  const local = collectLeetCodeActivities(input, { timeZone: 'America/Los_Angeles' });
  assert.deepEqual(utc.completions, shuffled.completions);
  assert.deepEqual(utc.completions.map(item => item.id), local.completions.map(item => item.id));
  assert.deepEqual(utc.completions.map(item => item.submissionId), ['one', 'two']);
  assert.deepEqual(local.completions.map(item => item.dayKey), ['2026-09-10', '2026-09-10']);
  assert.deepEqual(input, before);
  const noIds = collectLeetCodeActivities(snapshot([
    submission('', '2026-09-11T01:00:00Z'), submission('', '2026-09-11T04:00:00Z'),
  ]), { timeZone: 'UTC' });
  assert.equal(new Set(noIds.completions.map(item => item.id)).size, 2);
});

test('completion events reject unverified, invalid, future and repeated submission identities', () => {
  const now = Date.parse('2026-09-12T12:00:00Z');
  const valid = submission('valid', '2026-09-12T12:00:00Z');
  const input = snapshot([
    submission('valid', '2026-09-12T12:00:00.001Z'),
    submission('invalid-date', '2026-02-30T01:00:00Z'),
    submission('no-zone', '2026-09-12T01:00:00'),
    submission('date-only', '2026-09-12'),
    submission('old', '1999-12-31T23:59:59Z'),
    { ...submission('wa', '2026-09-12T01:00:00Z'), status: 'WA' },
    valid, { ...valid },
  ], { submissions: [submission('import', '2026-09-12T01:00:00Z', 'imported-problem')],
    calendar: [{ date: '2026-09-12', submissions: 900 }] });
  const records = collectLeetCodeActivities(input, { now, timeZone: 'UTC' });
  assert.deepEqual(records.completions.map(item => item.submissionId), ['valid']);
  assert.deepEqual(collectLeetCodeActivities({ connection: input.connection, submissions: [valid] }).completions, []);
  assert.deepEqual(collectLeetCodeActivities({}).completions, []);
  assert.deepEqual(collectLeetCodeActivities(input, { now: 'invalid' }).completions, []);
});

test('explicit imported history merges by submission ID with public precedence and one shared repeat clock', () => {
  const input = snapshot([
    submission('public', '2026-09-12T02:00:00Z'),
    { ...submission('rejected', '2026-09-12T12:00:00Z', 'not-solved'), status: 'WA' },
  ], { importedSubmissions: [
    submission('old', '2026-09-11T23:00:00Z'),
    submission('near', '2026-09-12T00:00:00Z'),
    submission('public', '2026-09-01T00:00:00Z', 'conflicting-import'),
    submission('rejected', '2026-09-12T12:00:00Z', 'not-solved'),
    submission('repeat', '2026-09-12T05:00:00Z'),
    submission('repeat', '2026-09-12T05:00:00Z'),
  ] });
  const before = structuredClone(input);
  const records = collectLeetCodeActivities(input, { timeZone: 'UTC' });
  assert.deepEqual(records.completions.map(item => [item.submissionId, item.submissionSource]), [
    ['old', 'import'], ['public', 'public'], ['repeat', 'import'],
  ]);
  assert.deepEqual(records.firstCompletions.map(item => item.submissionId), ['old']);
  assert.equal(leetcodeDailySummary(records, '2026-09-12').solved, 2);
  assert.equal(leetcodeDailySummary(records, '2026-09-12').acceptedSubmissions, 3);
  assert.deepEqual(input, before);
  assert.deepEqual(collectLeetCodeActivities({ ...input, importedSubmissions: [...input.importedSubmissions].reverse() }, { timeZone: 'UTC' }), records);
});

test('complete private import metadata never promotes the public coverage or trusted submission list', () => {
  const input = snapshot([], { importedSubmissions: [submission('old', '2026-09-11T12:00:00Z')],
    coverage: { historyComplete: false, personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-12T12:00:00Z' } });
  const records = collectLeetCodeActivities(input, { timeZone: 'UTC', now: '2026-09-12T12:00:00Z' });
  assert.equal(records.historyComplete, true);
  assert.equal(records.historyCompleteThroughDay, '2026-09-12');
  assert.equal(input.coverage.historyComplete, false);
  assert.deepEqual(input.syncedSubmissions, []);
  assert.equal(leetcodeDailySummary(records, '2026-09-10').solved, 0);
});

test('private calendar coverage proves zero only before its cutoff day and survives later public refreshes', () => {
  const input = snapshot([], { connection: { site: 'cn', username: 'fixture', lastSyncedAt: '2026-09-18T12:00:00Z' },
    importedSubmissions: [submission('old', '2026-09-17T12:00:00Z')],
    coverage: { personalHistoryComplete: true, personalHistoryCompleteThrough: '2026-09-18T13:00:00Z' } });
  for (const lastSyncedAt of ['2026-09-18T12:00:00Z', '2026-09-20T12:00:00Z']) {
    const records = collectLeetCodeActivities({ ...input, connection: { ...input.connection, lastSyncedAt } }, { timeZone: 'UTC', now: '2026-09-20T13:00:00Z' });
    assert.equal(leetcodeDailySummary(records, '2026-09-16').solved, 0);
    assert.equal(leetcodeDailySummary(records, '2026-09-17').solved, 1);
    assert.equal(leetcodeDailySummary(records, '2026-09-18').solved, null);
    assert.equal(leetcodeDailySummary(records, '2026-09-19').solved, null);
    assert.equal(leetcodeDailySummary(records, '2026-09-20').solved, null);
  }
});
