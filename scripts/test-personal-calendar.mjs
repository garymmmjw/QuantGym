import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { addLocalDays, buildDailySummaries, collectCalendarActivities, createManualActivity, dayRange, formatCalendarQuestionTitle, localDayKey, parseLocalDay, recordManualActivity, summarizeActivities } from "../src/features/personal/calendar/calendarModel.js";
import { createTrial, persistTrialTransition, transitionTrial } from "../src/features/personal/mental/mentalEngine.js";
import { createReasoningTrial, persistReasoningTransition, transitionReasoningTrial } from "../src/features/personal/mental/reasoningEngine.js";

const modelUrl = new URL("../src/features/personal/calendar/calendarModel.js", import.meta.url).href;
const at = "2026-09-08T16:00:00.000Z";

test("civil dates reject invalid dates instead of rolling into another month", () => {
  assert.equal(parseLocalDay("2026-02-29"), null);
  assert.equal(parseLocalDay("2026-13-01"), null);
  assert.equal(parseLocalDay("not a date"), null);
  assert.equal(localDayKey("2026-02-30T10:00:00Z"), "");
  assert.equal(localDayKey("2028-02-29"), "2028-02-29");
  assert.equal(localDayKey(null), "");
  assert.equal(localDayKey(undefined), "");
  assert.equal(localDayKey(""), "");
});

test("date navigation handles month ends, leap years, and both year boundaries", () => {
  assert.equal(addLocalDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addLocalDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addLocalDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addLocalDays("2028-02-29", 1), "2028-03-01");
  assert.equal(addLocalDays("2026-01-31", 7), "2026-02-07");
  assert.deepEqual(dayRange("2027-01-03", 7), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(addLocalDays("invalid", 1), "");
  assert.deepEqual(dayRange("invalid"), []);
});

test("local timestamp bucketing and date arithmetic survive DST in several time zones", () => {
  for (const [zone, expectedDay] of [["America/Chicago", "2026-09-07"], ["Asia/Shanghai", "2026-09-08"], ["Europe/Berlin", "2026-09-08"]]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import { localDayKey, addLocalDays, dayRange, createManualActivity } from ${JSON.stringify(modelUrl)};
      assert.equal(localDayKey('2026-09-08T02:00:00Z'), ${JSON.stringify(expectedDay)});
      for (const key of ['2026-03-07', '2026-03-08', '2026-03-09', '2026-10-31', '2026-11-01', '2026-11-02']) {
        assert.equal(localDayKey(key), key);
        assert.equal(addLocalDays(addLocalDays(key, 1), -1), key);
        assert.equal(localDayKey(createManualActivity({ kind: 'tech', count: 1, dateKey: key }).completedAt), key);
      }
      assert.deepEqual(dayRange('2026-03-10', 4), ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
      assert.deepEqual(dayRange('2026-11-03', 4), ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
    `], { encoding: "utf8", env: { ...process.env, TZ: zone } });
    assert.equal(result.status, 0, `${zone}: ${result.stderr}`);
  }
});

test("new accounts produce only empty statistics", () => {
  const { activities, undatedLegacyCount } = collectCalendarActivities();
  assert.deepEqual(activities, []);
  assert.equal(undatedLegacyCount, 0);
  const days = buildDailySummaries([], "2026-09-08");
  assert.equal(days.length, 7);
  assert.ok(days.every((day) => day.totalQuestions === 0 && day.activityCount === 0 && day.daily === 0));
});

test("event ids and linked trial/session records are counted only once", () => {
  const event = { id: "mental:t1", kind: "mental", count: 25, completedAt: at, trialId: "t1" };
  const state = {
    activities: [event, event, { id: "daily:s1:complete", kind: "daily", count: 1, completedAt: at, dailySessionId: "s1" }],
    trials: [{ id: "t1", status: "completed", correct: 25, completedAt: at }],
    dailySessions: [{ id: "s1", status: "completed", completedAt: at }]
  };
  const { activities } = collectCalendarActivities(state);
  assert.equal(activities.length, 2);
  const summary = summarizeActivities(activities);
  assert.equal(summary.mental, 25);
  assert.equal(summary.mentalTrials, 1);
  assert.equal(summary.daily, 1);
  assert.equal(summary.totalQuestions, 1);
});

test("fallbacks include finished and early-ended trials but exclude active trials and unfinished daily mocks", () => {
  const { activities } = collectCalendarActivities({
    trials: [
      { id: "done", status: "completed", correct: 8, completedAt: at },
      { id: "stopped", status: "aborted", correct: 3, completedAt: at },
      { id: "running", status: "active", correct: 100, completedAt: at },
      { id: "undated", status: "completed", correct: 100 }
    ],
    dailySessions: [{ id: "running", status: "active" }, { id: "done", status: "completed", completedAt: at }]
  });
  const summary = summarizeActivities(activities);
  assert.equal(summary.mental, 11);
  assert.equal(summary.mentalTrials, 2);
  assert.equal(summary.daily, 1);
});

test("individual daily mock questions count in their section and the full set is separate", () => {
  const { activities } = collectCalendarActivities({ activities: [
    { id: "daily:s1:tech1", kind: "tech", count: 1, completedAt: at },
    { id: "daily:s1:tech2", kind: "tech", count: 1, completedAt: at },
    { id: "daily:s1:coding1", kind: "coding", count: 1, completedAt: at },
    { id: "daily:s1:behavior1", kind: "behavioral", count: 1, completedAt: at },
    { id: "daily:s1", kind: "daily", count: 1, completedAt: at }
  ] });
  const summary = summarizeActivities(activities);
  assert.equal(summary.tech, 2);
  assert.equal(summary.coding, 1);
  assert.equal(summary.behavioral, 1);
  assert.equal(summary.daily, 1);
  assert.equal(summary.totalQuestions, 4);
});

test("legacy completion dates are imported without assigning undated totals to today", () => {
  const legacyState = {
    problems: [{ id: "code", category: "leetcode" }, { id: "behavior", category: "behavioral" }],
    problemStates: [
      { problemId: "quant", completed: true, completedAt: at },
      { problemId: "code", completed: true, completedAt: at },
      { problemId: "behavior", completed: true, completedAt: at },
      { problemId: "undated", completed: true, updatedAt: at },
      { problemId: "uncompleted", completed: false, completedAt: at }
    ],
    leetcodeHot100Done: ["undated", "also-undated"]
  };
  const snapshot = JSON.stringify(legacyState);
  const result = collectCalendarActivities({}, legacyState);
  const summary = summarizeActivities(result.activities);
  assert.equal(summary.quant, 1);
  assert.equal(summary.coding, 0);
  assert.equal(summary.codingReviews, 1);
  assert.equal(summary.behavioral, 1);
  assert.equal(result.undatedLegacyCount, 1);
  assert.equal(JSON.stringify(legacyState), snapshot, "history must remain read-only");
});

test("legacy mental records use their original date and count both correct and wrong finished answers", () => {
  const { activities, undatedLegacyCount } = collectCalendarActivities({}, {
    mentalMathRecords: [
      { id: "old", createdAt: "2025-03-09T15:30:00Z", correct: 14, incorrect: 3, skipped: 3, score: 900, total: 20 },
      { id: "undated", correct: 80, updatedAt: at }
    ]
  });
  assert.equal(activities.length, 1);
  assert.equal(activities[0].count, 17);
  assert.equal(activities[0].correctCount, 14);
  assert.equal(activities[0].dayKey, localDayKey("2025-03-09T15:30:00Z"));
  assert.equal(summarizeActivities(activities).mentalTrials, 1);
  assert.equal(undatedLegacyCount, 1);
});

test("an all-wrong legacy math session counts once while configured, skipped, and unanswered questions do not", () => {
  const legacy = { mentalMathRecords: [
    { id: 'all-wrong', createdAt: at, correct: 0, incorrect: 5, total: 20, skipped: 15 },
    { id: 'only-skipped', createdAt: at, correct: 0, incorrect: 0, total: 100, skipped: 100 },
  ] };
  const before = structuredClone(legacy);
  const { activities } = collectCalendarActivities({}, legacy);
  const summary = summarizeActivities(activities);
  assert.equal(summary.totalQuestions, 1);
  assert.equal(summary.mental, 5);
  assert.equal(summary.mentalCorrect, 0);
  assert.equal(activities.find(activity => activity.id === 'legacy:mental:all-wrong').count, 5);
  assert.deepEqual(legacy, before);
});

test("a linked legacy math activity uses original finished counts without counting the same session twice", () => {
  const legacy = { mentalMathRecords: [{ id: 'all-wrong', createdAt: at, correct: 0, incorrect: 5, total: 10 }] };
  const references = [
    { id: 'legacy:mental:all-wrong' },
    { id: 'mental:all-wrong', trialId: 'all-wrong' },
    { id: 'migrated-record', legacyId: 'all-wrong' },
    { id: 'migrated-record', sourceId: 'all-wrong' },
  ];
  for (const reference of references) {
    const { activities } = collectCalendarActivities({ activities: [{ ...reference, kind: 'mental', source: 'legacy', count: 0, completedAt: at }] }, legacy);
    assert.equal(activities.length, 1);
    assert.equal(activities[0].count, 5);
    assert.equal(activities[0].correctCount, 0);
    assert.equal(summarizeActivities(activities).totalQuestions, 1);
  }
  const aliases = references.map(reference => ({ ...reference, kind: 'mental', source: 'legacy', count: 0, completedAt: at }));
  assert.equal(summarizeActivities(collectCalendarActivities({ activities: aliases }, legacy).activities).totalQuestions, 1);
  const modern = { activities: aliases, trials: [{ id: 'all-wrong', status: 'completed', completedAt: at, questions: [] }] };
  assert.equal(summarizeActivities(collectCalendarActivities(modern, legacy).activities).totalQuestions, 0, 'modern detailed questions override stale legacy mirrors');
});

test("interview scores, evaluations, entry dates and XP never substitute for explicit completion", () => {
  const { activities } = collectCalendarActivities({}, {
    problems: [{ id: "behavior", category: "behavioral" }, { id: "code", category: "leetcode" }],
    entries: [
      { id: "tech", problemId: "quant", date: at, interviewScore: null },
      { id: "code", problemId: "code", date: at, interviewScore: 80 },
      { id: "behavior", problemId: "behavior", date: at, interviewEvaluation: "Completed" },
      { id: "xp", date: at, totalXp: 100 },
      { id: "unrelated", problemId: "quant", date: at, totalXp: 10 }
    ],
    interviewReports: [{ questionCount: 99, date: at }]
  });
  const summary = summarizeActivities(activities);
  assert.equal(summary.tech, 0);
  assert.equal(summary.coding, 0);
  assert.equal(summary.codingReviews, 0);
  assert.equal(summary.behavioral, 0);
  assert.equal(summary.totalQuestions, 0);
  assert.equal(activities.length, 0);
});

test("explicit references prevent importing the same legacy activity twice", () => {
  const { activities } = collectCalendarActivities({ activities: [
    { id: "event", sourceId: "e1", kind: "tech", count: 1, completedAt: at },
    { id: "quant-event", problemId: "q1", kind: "quant", count: 1, completedAt: at }
  ] }, {
    entries: [{ id: "e1", problemId: "q1", interviewScore: 90, date: at, completed: true, completedAt: at }],
    problemStates: [{ problemId: "q1", completed: true, completedAt: at }]
  });
  assert.equal(activities.length, 2);
});

test("manual mental entries count once while preserving correct questions without inventing trials or speed records", () => {
  const activity = createManualActivity({ kind: "mental", count: "12", dateKey: "2026-09-08", note: "  Offline practice  " }, { id: "a", now: at });
  assert.equal(activity.id, "manual:a");
  assert.equal(activity.source, "manual");
  assert.equal(activity.note, "Offline practice");
  assert.equal(localDayKey(activity.completedAt), "2026-09-08");
  const { activities } = collectCalendarActivities({ activities: [activity] });
  assert.equal(summarizeActivities(activities).mental, 12);
  assert.equal(summarizeActivities(activities).mentalTrials, 0);
  assert.equal(summarizeActivities(activities).totalQuestions, 1);
});

test("manual records reject invalid counts, dates, retired coding practice, or a fabricated daily completion", () => {
  const valid = { kind: "tech", count: 3, dateKey: "2026-09-08" };
  for (const count of [0, -1, 1.5, Infinity, NaN, 10001, "text"]) assert.throws(() => createManualActivity({ ...valid, count }), /invalid_count/);
  assert.throws(() => createManualActivity({ ...valid, dateKey: "2026-02-30" }), /invalid_date/);
  assert.throws(() => createManualActivity({ ...valid, kind: "daily" }), /invalid_kind/);
  assert.throws(() => createManualActivity({ ...valid, kind: "coding" }), /invalid_kind/);
});

test("retrying a manual save updates one entry even when a failed write already changed memory", () => {
  const activity = createManualActivity({ kind: "quant", count: 3, dateKey: "2026-09-08" }, { id: "retry", now: at });
  const initial = { trials: [], activities: [{ id: "auto", kind: "tech", count: 1, completedAt: at }] };
  const failedWriteMemory = recordManualActivity(initial, activity);
  const retry = recordManualActivity(failedWriteMemory, activity);
  assert.equal(retry.activities.length, 2);
  assert.equal(summarizeActivities(retry.activities).quant, 3);
  const correctedRetry = recordManualActivity(retry, { ...activity, count: 4 });
  assert.equal(correctedRetry.activities.length, 2);
  assert.equal(summarizeActivities(correctedRetry.activities).quant, 4);
  assert.equal(initial.activities.length, 1);
  assert.equal(correctedRetry.trials, initial.trials);
});

test("seven-day aggregation excludes out-of-range records without changing history", () => {
  const state = { activities: [
    { id: "old", kind: "quant", count: 100, completedAt: "2026-08-01" },
    { id: "first", kind: "quant", count: 3, completedAt: "2026-09-02" },
    { id: "last", kind: "coding", count: 2, completedAt: "2026-09-08" },
    { id: "future", kind: "tech", count: 100, completedAt: "2026-09-09" }
  ] };
  const { activities } = collectCalendarActivities(state);
  const days = buildDailySummaries(activities, "2026-09-08");
  assert.equal(days.length, 7);
  assert.equal(days[0].quant, 3);
  assert.equal(days[6].coding, 2);
  assert.equal(days.reduce((sum, day) => sum + day.totalQuestions, 0), 5);
  assert.equal(activities.length, 4);
});

test("sequence and pattern events and fallback histories have separate question and trial totals", () => {
  const sequence = { id: "sequence:seq-one", kind: "sequence", trialId: "seq-one", count: 3, completedAt: at };
  const pattern = { id: "pattern:pat-one", kind: "pattern", trialId: "pat-one", count: 2, completedAt: at };
  const { activities } = collectCalendarActivities({
    activities: [sequence, pattern],
    trials: [
      { id: "seq-one", settings: { trainer: "sequence" }, status: "completed", correct: 3, completedAt: at },
      { id: "pat-one", settings: { trainer: "pattern" }, status: "completed", correct: 2, completedAt: at },
      { id: "seq-aborted", settings: { trainer: "sequence" }, status: "aborted", correct: 1, completedAt: at },
      { id: "pat-zero", settings: { trainer: "pattern" }, status: "completed", correct: 0, completedAt: at },
      { id: "seq-running", settings: { trainer: "sequence" }, status: "active", correct: 99, completedAt: at },
      { id: "math-old", status: "completed", correct: 8, completedAt: at },
      { id: "math-explicit", settings: { trainer: "math" }, status: "completed", correct: 4, completedAt: at },
    ],
  });
  assert.equal(activities.length, 6);
  assert.deepEqual(activities.map((item) => item.id).sort(), ["mental:math-explicit", "mental:math-old", "pattern:pat-one", "pattern:pat-zero", "sequence:seq-aborted", "sequence:seq-one"]);
  const summary = summarizeActivities(activities);
  assert.equal(summary.mental, 12);
  assert.equal(summary.mentalTrials, 2);
  assert.equal(summary.sequence, 4);
  assert.equal(summary.sequenceTrials, 2);
  assert.equal(summary.pattern, 2);
  assert.equal(summary.patternTrials, 2);
  assert.equal(summary.totalQuestions, 5);
  const day = buildDailySummaries(activities, localDayKey(at), 1)[0];
  assert.equal(day.sequence, 4);
  assert.equal(day.pattern, 2);
});

test("reasoning manual entries add correct answers without inventing timed trials", () => {
  for (const kind of ["sequence", "pattern"]) {
    const entry = createManualActivity({ kind, count: 4, dateKey: "2026-09-08" }, { id: kind, now: at });
    const { activities } = collectCalendarActivities({ activities: [entry] });
    const summary = summarizeActivities(activities);
    assert.equal(summary[kind], 4);
    assert.equal(summary[`${kind}Trials`], 0);
    assert.equal(summary.mental, 0);
    assert.equal(summary.mentalTrials, 0);
  }
});

test("reasoning links cannot suppress dated legacy math records with the same external ID", () => {
  const { activities } = collectCalendarActivities({ activities: [
    { id: "sequence:shared", kind: "sequence", trialId: "shared", count: 2, completedAt: at },
  ] }, { mentalMathRecords: [{ id: "shared", createdAt: at, correct: 7 }] });
  const summary = summarizeActivities(activities);
  assert.equal(summary.sequence, 2);
  assert.equal(summary.mental, 7);
  assert.equal(summary.activityCount, 2);
});

test("completed totals include one per trainer session and explicit non-LeetCode coding while excluding manual LeetCode counts", () => {
  const raw = { activities: [
    { id: 'mental:done', kind: 'mental', count: 100, completedAt: at },
    { id: 'sequence:done', kind: 'sequence', count: 30, completedAt: at },
    { id: 'pattern:done', kind: 'pattern', count: 20, completedAt: at },
    { id: 'manual:lc', kind: 'coding', source: 'manual', count: 12, completedAt: at },
    { id: 'practice:lc', kind: 'coding', source: 'standalone', count: 1, completedAt: at },
    { id: 'daily:code', kind: 'coding', source: 'daily', count: 1, completedAt: at },
    { id: 'manual:tech', kind: 'tech', source: 'manual', count: 2, completedAt: at },
  ] };
  const before = structuredClone(raw);
  const { activities } = collectCalendarActivities(raw);
  const summary = summarizeActivities(activities);
  assert.equal(summary.mental, 100);
  assert.equal(summary.sequence, 30);
  assert.equal(summary.pattern, 20);
  assert.equal(summary.codingReviews, 13);
  assert.equal(summary.coding, 1);
  assert.equal(summary.tech, 2);
  assert.equal(summary.totalQuestions, 6);
  assert.equal(buildDailySummaries(activities, localDayKey(at), 1)[0].totalQuestions, 6);
  assert.deepEqual(raw, before, 'changing the counting rule does not delete practice history');
});

test("an active or missing standalone practice session cannot be counted as explicitly completed", () => {
  const { activities } = collectCalendarActivities({
    activities: [
      { id: 'practice:draw-only', kind: 'tech', source: 'standalone', count: 1, completedAt: at },
      { id: 'practice:missing', kind: 'tech', source: 'standalone', count: 1, completedAt: at },
      { id: 'practice:done', kind: 'tech', source: 'standalone', count: 1, completedAt: at },
    ],
    practiceSessions: [{ id: 'draw-only', status: 'active' }, { id: 'done', status: 'completed' }],
  });
  assert.equal(summarizeActivities(activities).totalQuestions, 1);
  assert.equal(summarizeActivities(activities).tech, 1);
  assert.equal(activities.length, 3, 'draft and orphan history is retained without credit');
});

test("legacy and linked calendar records include trainers and share LeetCode exclusions", () => {
  const problems = [
    { id: 'math', category: 'mentalMath' },
    { id: 'sequence', category: 'sequence' },
    { id: 'pattern', category: 'pattern' },
    { id: 'trainer', category: 'probabilityExpectation', source: 'trainer' },
    { id: 'source-lc', category: 'coding', source: 'leetcode' },
    { id: 'source-type-lc', sourceType: 'leetcode' },
    { id: 'url-lc', category: 'coding', sourceUrl: 'https://leetcode.com/problems/two-sum/' },
    { id: 'ordinary-code', category: 'coding' },
  ];
  const problemStates = [...problems, { id: 'leetcode-old-slug' }].map(problem => ({ problemId: problem.id, completed: true, completedAt: at }));
  const legacy = { problems, problemStates };
  const summary = summarizeActivities(collectCalendarActivities({}, legacy).activities);
  assert.equal(summary.totalQuestions, 5);
  assert.equal(summary.coding, 1);
  assert.equal(summary.codingReviews, 4);
  assert.equal(summary.mental, 2);
  assert.equal(summary.sequence, 1);
  assert.equal(summary.pattern, 1);
  const linked = collectCalendarActivities({ activities: [
    { id: 'linked-math', problemId: 'math', kind: 'quant', count: 1, completedAt: at },
    { id: 'linked-lc', problemId: 'source-lc', kind: 'coding', count: 1, completedAt: at },
  ] }, { problems });
  assert.equal(summarizeActivities(linked.activities).totalQuestions, 1);
  assert.equal(summarizeActivities(linked.activities).mental, 1);
});

test("legacy completion requires strict true and a zoned completion timestamp", () => {
  const rows = [
    { problemId: 'confirmed', completed: true, completedAt: at, date: '2020-01-01T00:00:00Z' },
    { problemId: 'string', completed: 'true', completedAt: at },
    { problemId: 'number', completed: 1, completedAt: at },
    { problemId: 'date-only', completed: true, completedAt: '2026-09-08' },
    { problemId: 'unconfirmed', completed: false, completedAt: at },
    { problemId: 'missing-time', completed: true, date: at },
  ];
  for (const field of ['problemStates', 'entries']) {
    const { activities } = collectCalendarActivities({}, { [field]: rows });
    assert.equal(summarizeActivities(activities).totalQuestions, 1);
    assert.equal(activities.length, 1);
    assert.equal(activities[0].problemId, 'confirmed');
    assert.equal(activities[0].completedAt, at);
  }
});

test("catalog and interview mirrors of the same completion count once even with different timezone strings", () => {
  const { activities } = collectCalendarActivities({}, {
    problemStates: [{ problemId: 'same-question', completed: true, completedAt: at }],
    entries: [
      { id: 'mirror', problemId: 'same-question', completed: true, completedAt: '2026-09-08T11:00:00-05:00' },
      { id: 'later-repeat', problemId: 'same-question', completed: true, completedAt: '2026-09-08T17:00:00Z' },
      { id: 'duplicate-later', problemId: 'same-question', completed: true, completedAt: '2026-09-08T17:00:00.000Z' },
    ],
  });
  assert.equal(activities.length, 2);
  assert.equal(summarizeActivities(activities).totalQuestions, 2);
  assert.deepEqual(activities.map(item => item.id).sort(), ['legacy:interview:later-repeat', 'legacy:problem:same-question']);
});

test("Mental Math counts finished questions during a trial without counting wrong attempts or unfinished questions", () => {
  const start = Date.parse(at), rng = () => 0.4;
  let trial = createTrial({ durationSeconds: 120 }, { now: start, id: 'math-live', rng });
  const summary = () => summarizeActivities(collectCalendarActivities({ activeTrial: trial }).activities);
  assert.equal(summary().totalQuestions, 0, 'drawing a question is not completion');
  const wrong = String(trial.currentQuestion.answer + 1);
  trial = transitionTrial(trial, { type: 'submit', value: wrong }, start + 1000, rng);
  trial = transitionTrial(trial, { type: 'submit', value: wrong }, start + 2000, rng);
  assert.equal(trial.currentQuestion.mistakes.length, 2);
  assert.equal(summary().totalQuestions, 0);
  trial = transitionTrial(trial, { type: 'input', value: String(trial.currentQuestion.answer) }, start + 3000, rng);
  assert.equal(summary().totalQuestions, 1);
  assert.equal(summary().mentalCorrect, 1);
  assert.equal(summary().mentalTrials, 0, 'an in-progress trial is not a finished trial');
  trial = transitionTrial(trial, { type: 'skip' }, start + 4000, rng);
  trial = transitionTrial(trial, { type: 'abort' }, start + 5000, rng);
  const state = persistTrialTransition({ activities: [], trials: [] }, trial);
  const { activities } = collectCalendarActivities(state, { mentalMathRecords: [{ id: trial.id, createdAt: trial.completedAt, correct: 1 }] });
  assert.equal(activities.length, 1);
  assert.equal(summarizeActivities(activities).totalQuestions, 1);
  assert.equal(summarizeActivities(activities).mentalCorrect, 1);
  assert.equal(summarizeActivities(activities).mentalTrials, 1);
});

test("sequence and pattern wrong answers finish one question while repeated submit and skipped questions do not add more", () => {
  for (const kind of ['sequence', 'pattern']) {
    const start = Date.parse(at), rng = () => 0.4;
    let trial = createReasoningTrial({ trainer: kind, durationSeconds: 120 }, { now: start, id: `${kind}-live`, preparationSeconds: 0, rng });
    const wrong = kind === 'pattern' ? trial.currentQuestion.options.find(option => option.id !== trial.currentQuestion.answer).id : '999999';
    trial = transitionReasoningTrial(trial, { type: 'submit', value: wrong }, start + 1000, rng);
    assert.equal(trial.questions[0].outcome, 'wrong');
    trial = transitionReasoningTrial(trial, { type: 'submit', value: wrong }, start + 2000, rng);
    let summary = summarizeActivities(collectCalendarActivities({ activeTrial: trial }).activities);
    assert.equal(summary.totalQuestions, 1);
    assert.equal(summary[`${kind}Correct`], 0);
    trial = transitionReasoningTrial(trial, { type: 'next' }, start + 3000, rng);
    trial = transitionReasoningTrial(trial, { type: 'submit', value: String(trial.currentQuestion.answer) }, start + 4000, rng);
    trial = transitionReasoningTrial(trial, { type: 'next' }, start + 5000, rng);
    trial = transitionReasoningTrial(trial, { type: 'skip' }, start + 6000, rng);
    trial = transitionReasoningTrial(trial, { type: 'next' }, start + 7000, rng);
    trial = transitionReasoningTrial(trial, { type: 'tick' }, Date.parse(trial.deadlineAt), rng);
    const state = persistReasoningTransition({ trials: [], activities: [] }, trial);
    const before = structuredClone(state);
    const { activities } = collectCalendarActivities(state);
    summary = summarizeActivities(activities);
    assert.equal(state.activities[0].count, 1, 'stored correct-answer performance remains intact');
    assert.equal(activities.length, 1);
    assert.equal(summary.totalQuestions, 1);
    assert.equal(summary[kind], 2);
    assert.equal(summary[`${kind}Correct`], 1);
    assert.equal(summary[`${kind}Trials`], 1);
    assert.deepEqual(state, before, 'derived completion counts never rewrite persisted stats');
  }
});

test("detailed trainer questions are authoritative, deduplicated, and grouped into one row for 58 finished questions", () => {
  const questions = Array.from({ length: 58 }, (_, index) => ({ id: `q-${index}`, outcome: index % 2 ? 'wrong' : 'correct', completedAt: at, expression: 'private expression' }));
  const trial = { id: 'fifty-eight', settings: { trainer: 'sequence' }, status: 'completed', completedAt: at, correct: 999,
    questions: [...questions, questions[0], { id: 'open', outcome: 'wrong' }, { id: 'skip', outcome: 'skipped', completedAt: at }, { id: 'timeout', outcome: 'timeout', completedAt: at }] };
  const state = { trials: [trial], activities: [{ id: 'sequence:fifty-eight', trialId: trial.id, kind: 'sequence', count: 999, completedAt: at }] };
  const { activities } = collectCalendarActivities(state);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].count, 58);
  assert.equal(activities[0].correctCount, 29);
  assert.equal(summarizeActivities(activities).totalQuestions, 1);
  assert.ok(!JSON.stringify(activities).includes('private expression'));
  for (const status of ['completed', 'active']) {
    const empty = { id: 'empty', status, completedAt: at, questions: [], correct: 100 };
    const result = collectCalendarActivities({ trials: [empty], activities: [{ id: 'mental:empty', kind: 'mental', trialId: 'empty', count: 100, completedAt: at }] },
      { mentalMathRecords: [{ id: 'empty', createdAt: at, correct: 100 }] });
    assert.equal(summarizeActivities(result.activities).totalQuestions, 0, `${status} detail cannot fall back to stale aggregates`);
  }
});

test("a trainer session crossing midnight counts once on the latest finished question date", () => {
  const first = new Date(2026, 8, 8, 23, 59, 58).toISOString();
  const second = new Date(2026, 8, 9, 0, 0, 2).toISOString();
  const { activities } = collectCalendarActivities({ trials: [{ id: 'overnight', settings: { trainer: 'pattern' }, status: 'completed', completedAt: second,
    questions: [{ id: 'before', outcome: 'correct', completedAt: first }, { id: 'after', outcome: 'wrong', completedAt: second }] }] });
  assert.equal(activities.length, 1);
  assert.equal(activities[0].completedAt, second);
  assert.equal(activities[0].count, 2);
  const days = buildDailySummaries(activities, localDayKey(second), 2);
  assert.deepEqual(days.map(day => [day.totalQuestions, day.patternCorrect, day.patternTrials]), [[0, 0, 0], [1, 1, 1]]);
  assert.equal(summarizeActivities(activities).patternTrials, 1);
  const endedAfterMidnight = collectCalendarActivities({ trials: [{ id: 'stopped-later', status: 'aborted', completedAt: second,
    questions: [{ id: 'last-finished', outcome: 'correct', completedAt: first }, { id: 'unfinished', outcome: 'aborted', completedAt: second }] }] }).activities;
  assert.equal(endedAfterMidnight[0].completedAt, first, 'stopping an unfinished question does not move completion to the next day');
  assert.deepEqual(buildDailySummaries(endedAfterMidnight, localDayKey(second), 2).map(day => day.totalQuestions), [1, 0]);
});

test("Technical Interview calendar titles use the original question number without inventing an index", () => {
  const { activities } = collectCalendarActivities({
    activities: [{ id: 'practice:technical', kind: 'tech', source: 'standalone', count: 1, completedAt: at, questionId: 'tech-question', title: '条件概率', titleEn: 'Conditional probability' }],
    practiceSessions: [{ id: 'technical', status: 'completed', question: { id: 'tech-question', provenance: { originalNumber: '4.12' } } }],
  }, { problems: [{ id: 'tech-question', provenance: { originalNumber: '99' } }] });
  assert.equal(activities[0].questionNumber, '4.12');
  assert.equal(formatCalendarQuestionTitle(activities[0]), '4.12 · 条件概率');
  assert.equal(formatCalendarQuestionTitle(activities[0], 'en'), '4.12 · Conditional probability');
  assert.equal(formatCalendarQuestionTitle({ title: 'Unnumbered' }), 'Unnumbered');
  assert.equal(formatCalendarQuestionTitle({ questionNumber: '4.12', title: '4.12 Existing number' }), '4.12 Existing number');
});
