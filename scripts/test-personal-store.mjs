import test from "node:test";
import assert from "node:assert/strict";
import { createPersonalState, createPersonalStore, mergePersonalData, personalStorageKey, validatePersonalData } from "../src/features/personal/personalStore.js";
import { createTrial, persistTrialTransition, transitionTrial } from "../src/features/personal/mental/mentalEngine.js";
import { createDailySession, updateDailyAnswer, completeDailyQuestion, getDailyProgress } from "../src/features/personal/daily/dailyEngine.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
const addActivity = (id) => (state) => ({ ...state, activities: [...state.activities, { id, kind: "quant", count: 1, completedAt: "2026-09-09T12:00:00Z" }] });

test("no-op timers do not write storage, but still catch up with another tab", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  const initial = store.getSnapshot();
  store.update((state) => state);
  assert.equal(storage.values.size, 0);
  assert.equal(store.getSnapshot(), initial);
  const other = createPersonalStore({ ownerId: "a", storage });
  other.update(addActivity("elsewhere"));
  const saved = storage.getItem(personalStorageKey("a"));
  store.update((state) => state);
  assert.equal(store.getSnapshot().data.activities[0].id, "elsewhere");
  assert.equal(storage.getItem(personalStorageKey("a")), saved);
});

test("personal records and active answers are isolated by account and survive reload", () => {
  const storage = memoryStorage();
  const alice = createPersonalStore({ ownerId: "alice", storage });
  alice.update((state) => ({ ...addActivity("a")(state), activeTrial: { ...createTrial({}, { id: "private-a" }), currentAnswer: "23" } }));
  assert.equal(createPersonalStore({ ownerId: "bob", storage }).getSnapshot().data.activeTrial, null);
  const restored = createPersonalStore({ ownerId: "alice", storage }).getSnapshot();
  assert.equal(restored.data.activeTrial.currentAnswer, "23");
  assert.equal(restored.data.activities.length, 1);
});

test("quota failure preserves the durable copy and live unsaved work, then retries", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  store.update(addActivity("first"));
  const prior = storage.getItem(personalStorageKey("a"));
  const realWrite = storage.setItem;
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(store.update(addActivity("second")).ok, false);
  assert.equal(store.getSnapshot().data.activities.length, 2);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(storage.getItem(personalStorageKey("a")), prior);
  assert.equal(JSON.parse(store.exportBackup()).data.activities.length, 2);
  storage.setItem = realWrite;
  assert.equal(store.retry().ok, true);
  assert.equal(createPersonalStore({ ownerId: "a", storage }).getSnapshot().data.activities.length, 2);
});

test("a second tab uses the latest durable state instead of replacing another tab's record", () => {
  const storage = memoryStorage();
  const first = createPersonalStore({ ownerId: "a", storage });
  const second = createPersonalStore({ ownerId: "a", storage });
  first.update(addActivity("first"));
  second.update(addActivity("second"));
  assert.deepEqual(second.getSnapshot().data.activities.map((row) => row.id), ["first", "second"]);
});

test("corrupt saved data is never replaced by an empty initial state", () => {
  const storage = memoryStorage();
  storage.setItem(personalStorageKey("a"), "{broken");
  const store = createPersonalStore({ ownerId: "a", storage });
  assert.match(store.getSnapshot().error, /^read:/);
  assert.equal(store.update(addActivity("unsaved")).ok, false);
  assert.equal(storage.getItem(personalStorageKey("a")), "{broken");
  assert.equal(store.getSnapshot().data.activities.length, 1);
});

test("restore is additive, preserves newer local answers, and rejects a different account", () => {
  const storage = memoryStorage();
  const first = createPersonalStore({ ownerId: "a", storage });
  first.update(addActivity("old"));
  const backup = first.exportBackup();
  first.update((state) => ({ ...state, activities: [{ ...state.activities[0], count: 7 }, { id: "new", kind: "quant", count: 2, completedAt: "2026-09-09T12:00:00Z" }] }));
  assert.equal(first.restoreBackup(backup).ok, true);
  assert.equal(first.getSnapshot().data.activities.length, 2);
  assert.equal(first.getSnapshot().data.activities.find((row) => row.id === "old").count, 7);
  assert.throws(() => createPersonalStore({ ownerId: "b", storage }).restoreBackup(backup), /different account/);
  assert.throws(() => first.restoreBackup('{"format":"quantgym-personal-prep","version":1,"ownerId":"a","data":{}}'));
  assert.equal(first.getSnapshot().data.activities.length, 2);
});

test("dirty work cannot overwrite newer data saved in another tab", () => {
  const storage = memoryStorage();
  const first = createPersonalStore({ ownerId: "a", storage });
  const second = createPersonalStore({ ownerId: "a", storage });
  first.update(addActivity("baseline"));
  const write = storage.setItem;
  storage.setItem = () => { throw new Error("full"); };
  first.update(addActivity("unsaved"));
  storage.setItem = write;
  second.update(addActivity("other-tab"));
  assert.equal(first.retry().ok, false);
  assert.equal(first.getSnapshot().conflict, true);
  const saved = createPersonalStore({ ownerId: "a", storage }).getSnapshot().data;
  assert.ok(saved.activities.some((row) => row.id === "other-tab"));
  assert.ok(!saved.activities.some((row) => row.id === "unsaved"));
  assert.ok(first.getSnapshot().data.activities.some((row) => row.id === "unsaved"));
});

test("restoring an old active trial cannot revive or overwrite its finished result", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  const now = Date.parse("2026-09-09T12:00:00Z");
  let trial = createTrial({ durationSeconds: 10 }, { id: "same-trial", now, rng: () => 0 });
  store.update((state) => ({ ...state, activeTrial: trial }));
  const older = store.exportBackup();
  trial = transitionTrial(trial, { type: "input", value: String(trial.currentQuestion.answer) }, now + 1000);
  trial = transitionTrial(trial, { type: "tick" }, now + 10000);
  store.update((state) => persistTrialTransition(state, trial));
  assert.equal(store.getSnapshot().data.trials[0].correct, 1);
  assert.equal(store.restoreBackup(older).ok, true);
  assert.equal(store.getSnapshot().data.activeTrial, null);
  assert.equal(store.getSnapshot().data.trials[0].correct, 1);
  assert.equal(store.getSnapshot().data.activities[0].count, 1);
});

function dailyFixture() {
  return createDailySession({ mentalEnabled: false, techCount: 2, codingCount: 0, behavioralCount: 0 }, { id: "daily", startedAt: "2026-09-09T12:00:00Z" });
}
function backupWith(store, data) {
  return JSON.stringify({ ...JSON.parse(store.exportBackup()), data });
}

test("restoring newer daily completions keeps session progress and calendar events consistent", () => {
  const store = createPersonalStore({ ownerId: "a", storage: memoryStorage() });
  const session = dailyFixture();
  store.update((state) => ({ ...state, dailySessions: [session] }));
  let newer = { ...createPersonalState(), dailySessions: [session] };
  for (const question of session.questions) {
    newer = updateDailyAnswer(newer, session.id, question.id, { text: "Completed on another device", selfAssessment: "independent" });
    newer = completeDailyQuestion(newer, session.id, question.id, "2026-09-09T12:05:00Z");
  }
  store.restoreBackup(backupWith(store, newer));
  const restored = store.getSnapshot().data;
  assert.equal(restored.dailySessions[0].status, "completed");
  assert.equal(getDailyProgress(restored.dailySessions[0]).completed, 2);
  assert.equal(restored.activities.filter((item) => item.kind === "daily").length, 1);
  assert.equal(restored.activities.filter((item) => item.kind === "tech").length, 2);
});

test("daily restore preserves local completed answers and combines drafts without dropping local fields", () => {
  const store = createPersonalStore({ ownerId: "a", storage: memoryStorage() });
  const session = dailyFixture();
  const [first, second] = session.questions;
  let local = { ...createPersonalState(), dailySessions: [session] };
  local = updateDailyAnswer(local, session.id, first.id, { text: "Local complete answer", selfAssessment: "independent" });
  local = completeDailyQuestion(local, session.id, first.id, "2026-09-09T12:02:00Z");
  local = updateDailyAnswer(local, session.id, second.id, { text: "Local draft" });
  store.update(() => local);
  let restored = { ...createPersonalState(), dailySessions: [session] };
  restored = updateDailyAnswer(restored, session.id, first.id, { text: "Older draft" });
  restored = updateDailyAnswer(restored, session.id, second.id, { text: "Other draft", selfAssessment: "with-help", reviewed: true });
  store.restoreBackup(backupWith(store, restored));
  const answers = store.getSnapshot().data.dailySessions[0].answers;
  assert.equal(answers[first.id].text, "Local complete answer");
  assert.ok(answers[first.id].completedAt);
  assert.equal(answers[second.id].text, "Local draft");
  assert.equal(answers[second.id].selfAssessment, "with-help");
  assert.equal(answers[second.id].reviewed, true);
});

test("complementary daily completions merge into one completed session", () => {
  const store = createPersonalStore({ ownerId: "a", storage: memoryStorage() });
  const session = dailyFixture();
  const partial = (index) => {
    let state = { ...createPersonalState(), dailySessions: [session] };
    const questionId = session.questions[index].id;
    state = updateDailyAnswer(state, session.id, questionId, { text: `Answer ${index}`, selfAssessment: "independent" });
    return completeDailyQuestion(state, session.id, questionId, `2026-09-09T12:0${index + 1}:00Z`);
  };
  store.update(() => partial(0));
  store.restoreBackup(backupWith(store, partial(1)));
  assert.equal(store.getSnapshot().data.dailySessions[0].status, "completed");
  assert.equal(store.getSnapshot().data.activities.filter((item) => item.kind === "daily").length, 1);
  store.restoreBackup(backupWith(store, partial(1)));
  assert.equal(store.getSnapshot().data.activities.filter((item) => item.kind === "daily").length, 1);
});

test("malformed nested backups are rejected without changing memory or the durable copy", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  store.update(addActivity("safe"));
  const before = storage.getItem(personalStorageKey("a"));
  const snapshot = store.getSnapshot();
  const malformed = [
    { ...createPersonalState(), dailySessions: [{ id: "bad", status: "active" }] },
    { ...createPersonalState(), activeTrial: { id: "bad", status: "active" } },
    { ...createPersonalState(), trials: [{ id: "bad", status: "completed", questions: "wrong" }] },
    { ...createPersonalState(), activities: [{ id: "bad", kind: "mental", count: 3, completedAt: "invalid" }] },
    { ...createPersonalState(), activities: [{ id: "bad", kind: "quant", count: 3, completedAt: "2026-09-09T12:00:00Z", note: { cannotRender: true } }] },
    { ...createPersonalState(), mentalSettings: { operations: {} } },
    { ...createPersonalState(), dailySettings: { mentalEnabled: true } }
  ];
  const badAnswer = dailyFixture();
  badAnswer.answers[badAnswer.questions[0].id] = { text: { bad: true } };
  malformed.push({ ...createPersonalState(), dailySessions: [badAnswer] });
  for (const data of malformed) {
    assert.throws(() => store.restoreBackup(backupWith(store, data)), /Invalid/);
    assert.equal(storage.getItem(personalStorageKey("a")), before);
    assert.equal(store.getSnapshot(), snapshot);
  }
});

test("reconnecting a cached store catches up with missed writes before display and export", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  const unsubscribe = store.subscribe(() => {});
  unsubscribe();
  const other = createPersonalStore({ ownerId: "a", storage });
  other.update(addActivity("other-tab"));
  store.subscribe(() => {});
  assert.equal(store.getSnapshot().data.activities[0].id, "other-tab");
  assert.equal(JSON.parse(store.exportBackup()).data.activities[0].id, "other-tab");
});

test("reconnecting dirty work only creates a conflict when the durable state actually changed", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "a", storage });
  store.update(addActivity("saved"));
  const write = storage.setItem;
  storage.setItem = () => { throw new Error("quota"); };
  store.update(addActivity("unsaved"));
  const unsubscribe = store.subscribe(() => {});
  assert.equal(store.getSnapshot().conflict, false);
  unsubscribe();
  storage.setItem = write;
  const other = createPersonalStore({ ownerId: "a", storage });
  other.update(addActivity("other-tab"));
  store.subscribe(() => {});
  assert.equal(store.getSnapshot().conflict, true);
  assert.ok(store.getSnapshot().data.activities.some((item) => item.id === "unsaved"));
  assert.ok(!store.getSnapshot().data.activities.some((item) => item.id === "other-tab"));
});

test("cloud and backup merges preserve activity deletion tombstones in either direction", () => {
  const older = addActivity("manual:deleted")(createPersonalState());
  const deleted = { ...createPersonalState(), removedActivityIds: ["manual:deleted"] };
  for (const combined of [mergePersonalData(deleted, older), mergePersonalData(older, deleted)]) {
    assert.equal(combined.activities.length, 0);
    assert.deepEqual(combined.removedActivityIds, ["manual:deleted"]);
    assert.equal(mergePersonalData(combined, older).activities.length, 0);
  }
  const store = createPersonalStore({ ownerId: "a", storage: memoryStorage() });
  store.update(() => deleted);
  store.mergeFromCloud(older);
  assert.equal(store.getSnapshot().data.activities.length, 0);
  assert.equal(older.activities.length, 1, "merge must not mutate its input");
});

test("older version-one records may omit tombstones, but malformed tombstones are rejected", () => {
  const older = createPersonalState();
  delete older.removedActivityIds;
  assert.deepEqual(validatePersonalData(older).removedActivityIds, []);
  assert.throws(() => validatePersonalData({ ...older, removedActivityIds: [null] }), /removed activity/);
  assert.throws(() => validatePersonalData({ ...older, removedActivityIds: {} }), /removed activity/);
});

test("a completed cloud trial removes a stale local active copy in either merge direction", () => {
  const now = Date.parse("2026-09-09T12:00:00Z");
  const active = createTrial({ durationSeconds: 10 }, { id: "same", now });
  const stale = { ...createPersonalState(), activeTrial: active };
  const done = persistTrialTransition(stale, transitionTrial(active, { type: "tick" }, now + 10000));
  assert.equal(mergePersonalData(stale, done).activeTrial, null);
  assert.equal(mergePersonalData(done, stale).activeTrial, null);
  assert.equal(mergePersonalData(stale, done).trials.length, 1);
});

test("a background device's stale completion cannot lower the finished trial or its activity score", () => {
  const now = Date.parse("2026-09-09T12:00:00Z");
  const original = createTrial({ durationSeconds: 10 }, { id: "shared-trial", now, rng: () => 0 });
  let progressed = original;
  for (let index = 1; index <= 3; index += 1) {
    progressed = transitionTrial(progressed, { type: "input", value: String(progressed.currentQuestion.answer) }, now + index * 1000, () => 0);
  }
  const newer = persistTrialTransition(createPersonalState(), transitionTrial(progressed, { type: "tick" }, now + 10000));
  const stale = persistTrialTransition(createPersonalState(), transitionTrial(original, { type: "tick" }, now + 15000));
  const before = JSON.stringify(newer);
  for (const merged of [mergePersonalData(stale, newer), mergePersonalData(newer, stale)]) {
    assert.equal(merged.trials.length, 1);
    assert.equal(merged.trials[0].correct, 3);
    assert.deepEqual(merged.trials[0].questions, newer.trials[0].questions);
    assert.equal(merged.activities.find((entry) => entry.id === "mental:shared-trial").count, 3);
    assert.equal(mergePersonalData(merged, stale).trials[0].correct, 3);
    assert.equal(merged.activeTrial, null);
  }
  assert.equal(JSON.stringify(newer), before);
});

test("same-id active trial merges retain the most progressed complete snapshot in either direction", () => {
  const now = Date.parse("2026-09-09T12:00:00Z");
  const original = createTrial({ durationSeconds: 10 }, { id: "shared-active", now, rng: () => 0 });
  let answered = transitionTrial(original, { type: "input", value: String(original.currentQuestion.answer) }, now + 1000, () => 0);
  answered = transitionTrial(answered, { type: "skip" }, now + 2000, () => 0);
  const stale = { ...createPersonalState(), activeTrial: original };
  const newer = { ...createPersonalState(), activeTrial: answered };
  for (const merged of [mergePersonalData(stale, newer), mergePersonalData(newer, stale)]) {
    assert.deepEqual(merged.activeTrial, answered);
    assert.equal(merged.activeTrial.correct, 1);
    assert.equal(merged.trials.length, 0);
    assert.equal(merged.activities.length, 0);
  }
  const skipped = transitionTrial(original, { type: "skip" }, now + 1000, () => 0);
  assert.deepEqual(mergePersonalData(stale, { ...newer, activeTrial: skipped }).activeTrial, skipped);
});
