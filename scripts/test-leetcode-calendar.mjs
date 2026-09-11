import test from "node:test";
import assert from "node:assert/strict";
import { collectLeetCodeActivities, leetcodeDailySummary, leetcodeProblemUrl, leetcodeSubmissionDay } from "../src/features/personal/calendar/leetcodeCalendar.js";

const submission = (id, submittedAt, problemSlug = "two-sum") => ({ id, submittedAt, problemSlug, title: "两数之和", titleEn: "Two Sum", status: "AC" });
const snapshot = (submissions = [], extra = {}) => ({ connection: { site: "cn", username: "fixture" }, submissions, ...extra });

test("accepted submission instants follow the selected local time zone across a date boundary", () => {
  assert.equal(leetcodeSubmissionDay("2026-09-11T01:00:00Z", "America/Chicago"), "2026-09-10");
  assert.equal(leetcodeSubmissionDay("2026-09-11T01:00:00Z", "Asia/Shanghai"), "2026-09-11");
  assert.equal(leetcodeSubmissionDay("2026-09-11T00:30:00+08:00", "UTC"), "2026-09-10");
});

test("same problem is counted once per local day while accepted attempts remain separate", () => {
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
  assert.equal(records.activities.find((item) => item.id.endsWith("2026-09-11:two-sum")).completedAt, "2026-09-11T02:00:00Z");
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
