import test from "node:test";
import assert from "node:assert/strict";
import { createPersonalState, createPersonalStore, mergePersonalData, personalStorageKey, validatePersonalData } from "../src/features/personal/personalStore.js";
import { createTrial, persistTrialTransition, transitionTrial } from "../src/features/personal/mental/mentalEngine.js";
import { createDailySession, updateDailyAnswer, completeDailyQuestion, getDailyProgress } from "../src/features/personal/daily/dailyEngine.js";
import { createReasoningTrial, transitionReasoningTrial, persistReasoningTransition, cancelTrialPreparation } from "../src/features/personal/mental/reasoningEngine.js";

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

const reasoningStart = Date.parse("2026-09-10T12:00:00Z");
function reasoningFixture(trainer = "sequence", trialId = `saved-${trainer}`, preparationSeconds = 0) {
  return createReasoningTrial({ trainer, durationSeconds: 30, difficulty: "medium", ...(trainer === "sequence" ? { sequenceType: "mixed" } : {}) },
    { id: trialId, now: reasoningStart, rng: () => 0.2, preparationSeconds });
}
const reasoningState = (trial) => persistReasoningTransition(createPersonalState(), trial);
const feedbackFor = (trial, value = trial.currentQuestion.answer) => transitionReasoningTrial(trial, { type: "submit", value }, reasoningStart + 1000);

test("old math backups and explicit math trainer settings remain valid", () => {
  const old = createTrial({}, { now: reasoningStart, id: "old-math" });
  const explicit = { ...old, settings: { ...old.settings, trainer: "math" } };
  for (const activeTrial of [old, explicit]) {
    assert.equal(validatePersonalData({ ...createPersonalState(), activeTrial }).activeTrial, activeTrial);
  }
  assert.throws(() => validatePersonalData({ ...createPersonalState(), mentalSettings: reasoningFixture().settings }), /mental settings/);
});

test("sequence and pattern preparation, drafts, and feedback survive durable reload and private backup restore", () => {
  for (const trainer of ["sequence", "pattern"]) {
    const storage = memoryStorage();
    const store = createPersonalStore({ ownerId: "reasoning-owner", storage });
    const preparing = reasoningFixture(trainer, `preparing-${trainer}`, 5);
    assert.equal(store.update(() => reasoningState(preparing)).ok, true);
    assert.deepEqual(createPersonalStore({ ownerId: "reasoning-owner", storage }).getSnapshot().data.activeTrial, preparing);
    assert.equal(store.update((state) => cancelTrialPreparation(state, preparing.id, reasoningStart + 2000)).ok, true);
    assert.equal(store.getSnapshot().data.activeTrial, null);
    assert.equal(store.getSnapshot().data.trials.length, 0);
    assert.equal(store.getSnapshot().data.activities.length, 0);

    const running = reasoningFixture(trainer);
    const drafted = transitionReasoningTrial(running, { type: "input", value: trainer === "pattern" ? "A" : "-17" }, reasoningStart + 500);
    assert.equal(store.update(() => reasoningState(drafted)).ok, true);
    assert.deepEqual(createPersonalStore({ ownerId: "reasoning-owner", storage }).getSnapshot().data.activeTrial, drafted);
    const feedback = feedbackFor(drafted);
    assert.equal(store.update(() => reasoningState(feedback)).ok, true);
    const backup = store.exportBackup();
    const restored = createPersonalStore({ ownerId: "reasoning-owner", storage: memoryStorage() });
    assert.equal(restored.restoreBackup(backup).ok, true);
    assert.deepEqual(restored.getSnapshot().data.activeTrial, feedback);
    assert.equal(restored.getSnapshot().data.activeTrial.currentQuestion, null);
    assert.equal(restored.getSnapshot().data.activeTrial.feedbackQuestionId, feedback.questions[0].id);
    assert.throws(() => createPersonalStore({ ownerId: "different-owner", storage: memoryStorage() }).restoreBackup(backup), /different account/);
  }
});

test("malformed reasoning settings, references and nested puzzle content cannot overwrite valid records", () => {
  const store = createPersonalStore({ ownerId: "reasoning-owner", storage: memoryStorage() });
  store.update(() => reasoningState(reasoningFixture()));
  const before = store.exportBackup();
  const invalid = [];
  const bad = (trainer, mutate) => {
    const trial = structuredClone(reasoningFixture(trainer));
    mutate(trial);
    invalid.push(trial);
  };
  bad("sequence", (trial) => { trial.settings.durationSeconds = 9; });
  bad("sequence", (trial) => { trial.settings.difficulty = "expert"; });
  bad("sequence", (trial) => { trial.settings.sequenceType = "symbols"; });
  bad("sequence", (trial) => { trial.currentQuestion.tokens[0] = { unsafe: true }; });
  bad("sequence", (trial) => { trial.currentQuestion.answer = 12; });
  bad("sequence", (trial) => { trial.currentQuestion.explanation = {}; });
  bad("sequence", (trial) => { trial.currentQuestion.kind = "pattern"; });
  bad("sequence", (trial) => { trial.currentQuestion = null; });
  bad("sequence", (trial) => { trial.feedbackQuestionId = "nonexistent"; });
  bad("sequence", (trial) => { trial.dailySessionId = "unrelated-daily"; });
  bad("pattern", (trial) => { trial.currentQuestion.grid[0] = null; });
  bad("pattern", (trial) => { trial.currentQuestion.grid[8] = trial.currentQuestion.grid[0]; });
  bad("pattern", (trial) => { trial.currentQuestion.options.pop(); });
  bad("pattern", (trial) => { trial.currentQuestion.options[1].id = "A"; });
  bad("pattern", (trial) => { trial.currentQuestion.options[1].cell = trial.currentQuestion.options[0].cell; });
  bad("pattern", (trial) => { trial.currentQuestion.options[0].cell.positions = [0, 0]; });
  bad("pattern", (trial) => { trial.currentQuestion.answer = "Z"; });
  const badFeedback = feedbackFor(reasoningFixture());
  invalid.push({ ...badFeedback, feedbackQuestionId: "not-the-last-question" });
  invalid.push({ ...badFeedback, questions: [{ ...badFeedback.questions[0], outcome: "unexpected" }] });
  for (const trial of invalid) {
    assert.throws(() => store.restoreBackup(backupWith(store, reasoningState(trial))), /Invalid/);
    assert.deepEqual(JSON.parse(store.exportBackup()).data, JSON.parse(before).data);
  }
});

test("failed writes preserve a new-module feedback answer in memory and keep its previous durable draft", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "reasoning-owner", storage });
  const running = reasoningFixture("pattern");
  store.update(() => reasoningState(running));
  const durable = storage.getItem(personalStorageKey("reasoning-owner"));
  const write = storage.setItem;
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  const feedback = feedbackFor(running);
  assert.equal(store.update(() => reasoningState(feedback)).ok, false);
  assert.deepEqual(store.getSnapshot().data.activeTrial, feedback);
  assert.equal(storage.getItem(personalStorageKey("reasoning-owner")), durable);
  assert.deepEqual(JSON.parse(store.exportBackup()).data.activeTrial, feedback);
  storage.setItem = write;
  assert.equal(store.retry().ok, true);
  assert.deepEqual(createPersonalStore({ ownerId: "reasoning-owner", storage }).getSnapshot().data.activeTrial, feedback);
});

test("wrong answers and next-question advancement cannot regress to an older reasoning snapshot", () => {
  for (const trainer of ["sequence", "pattern"]) {
    const running = reasoningFixture(trainer);
    const wrongValue = trainer === "pattern" ? running.currentQuestion.options.find((option) => option.id !== running.currentQuestion.answer).id : "999999";
    const feedback = feedbackFor(running, wrongValue);
    assert.equal(feedback.questions[0].outcome, "wrong");
    const next = transitionReasoningTrial(feedback, { type: "next" }, reasoningStart + 2000, () => 0.4);
    for (const [older, newer] of [[running, feedback], [feedback, next]]) {
      for (const merged of [mergePersonalData(reasoningState(older), reasoningState(newer)), mergePersonalData(reasoningState(newer), reasoningState(older))]) {
        assert.deepEqual(merged.activeTrial, newer);
        assert.equal(merged.activities.length, 0);
      }
    }
  }
});

test("new-module terminal trials never revive from an old active copy and rebuild the correct activity kind", () => {
  for (const trainer of ["sequence", "pattern"]) {
    const running = reasoningFixture(trainer);
    const feedback = feedbackFor(running);
    const finished = transitionReasoningTrial(feedback, { type: "tick" }, reasoningStart + 30000);
    const completed = { ...reasoningState(finished), activities: [] };
    for (const merged of [mergePersonalData(reasoningState(running), completed), mergePersonalData(completed, reasoningState(feedback))]) {
      assert.equal(merged.activeTrial, null);
      assert.deepEqual(merged.trials, [finished]);
      assert.equal(merged.activities.length, 1);
      assert.equal(merged.activities[0].id, `${trainer}:${finished.id}`);
      assert.equal(merged.activities[0].kind, trainer);
      assert.equal(merged.activities[0].count, 1);
      assert.equal(mergePersonalData(merged, completed).activities.length, 1);
    }
  }
});

test("completed math, sequence and pattern histories merge without crossing activity modules", () => {
  const math = createTrial({ durationSeconds: 10 }, { id: "math-history", now: reasoningStart });
  let merged = persistTrialTransition(createPersonalState(), transitionTrial(math, { type: "tick" }, reasoningStart + 10000));
  for (const trainer of ["sequence", "pattern"]) {
    const done = transitionReasoningTrial(feedbackFor(reasoningFixture(trainer)), { type: "tick" }, reasoningStart + 30000);
    merged = mergePersonalData(merged, reasoningState(done));
  }
  assert.equal(merged.trials.length, 3);
  assert.deepEqual(merged.activities.map((entry) => entry.kind).sort(), ["mental", "pattern", "sequence"]);
  assert.deepEqual(merged.activities.map((entry) => entry.id).sort(), ["mental:math-history", "pattern:saved-pattern", "sequence:saved-sequence"]);
});

test("same-id trial modules cannot be confused in active or completed backup merges", () => {
  const sequence = reasoningFixture("sequence", "collision");
  const pattern = reasoningFixture("pattern", "collision");
  const sequenceDone = transitionReasoningTrial(sequence, { type: "tick" }, reasoningStart + 30000);
  const patternDone = transitionReasoningTrial(pattern, { type: "tick" }, reasoningStart + 30000);
  for (const [left, right] of [[sequence, pattern], [sequenceDone, patternDone], [sequence, patternDone], [sequenceDone, pattern]]) {
    assert.throws(() => mergePersonalData(reasoningState(left), reasoningState(right)), /conflicting trial modules/);
    assert.throws(() => mergePersonalData(reasoningState(right), reasoningState(left)), /conflicting trial modules/);
  }
});

test("different active trial IDs involving a new module reject merging without discarding either saved copy", () => {
  const storage = memoryStorage();
  const store = createPersonalStore({ ownerId: "reasoning-owner", storage });
  const first = reasoningFixture("sequence", "active-sequence");
  const second = reasoningFixture("pattern", "active-pattern");
  store.update(() => reasoningState(first));
  const before = storage.getItem(personalStorageKey("reasoning-owner"));
  assert.throws(() => store.mergeFromCloud(reasoningState(second)), /Finish the current trial/);
  assert.deepEqual(store.getSnapshot().data.activeTrial, first);
  assert.equal(storage.getItem(personalStorageKey("reasoning-owner")), before);
  assert.deepEqual(second.currentQuestion, reasoningFixture("pattern", "active-pattern").currentQuestion);
  const math = createTrial({}, { now: reasoningStart, id: "active-math" });
  for (const [left, right] of [[first, math], [math, first]]) {
    assert.throws(() => mergePersonalData({ ...createPersonalState(), activeTrial: left }, { ...createPersonalState(), activeTrial: right }), /Finish the current trial/);
  }
});

test("preparation cancellation markers suppress untouched snapshots in either merge direction without creating history", () => {
  for (const trainer of ["math", "sequence", "pattern"]) {
    const preparing = trainer === "math"
      ? createTrial({}, { id: "cancel-math", now: reasoningStart, preparationSeconds: 5 })
      : reasoningFixture(trainer, `cancel-${trainer}`, 5);
    const older = { ...createPersonalState(), activeTrial: preparing };
    const cancelled = { ...createPersonalState(), removedActivityIds: [`cancel-preparation:${preparing.id}`] };
    for (const merged of [mergePersonalData(older, cancelled), mergePersonalData(cancelled, older)]) {
      assert.equal(merged.activeTrial, null);
      assert.equal(merged.trials.length, 0);
      assert.equal(merged.activities.length, 0);
      assert.deepEqual(merged.removedActivityIds, cancelled.removedActivityIds);
      assert.equal(mergePersonalData(merged, older).activeTrial, null);
    }
  }
});

test("preparation cancellation never deletes drafts, mistakes, resolved questions or completed records", () => {
  const original = reasoningFixture();
  const marker = { ...createPersonalState(), removedActivityIds: [`cancel-preparation:${original.id}`] };
  const drafted = transitionReasoningTrial(original, { type: "input", value: "123" }, reasoningStart + 500);
  const wrong = feedbackFor(original, "999999");
  const skipped = transitionReasoningTrial(original, { type: "skip" }, reasoningStart + 1000);
  const correct = feedbackFor(original);
  const finished = transitionReasoningTrial(correct, { type: "tick" }, reasoningStart + 30000);
  for (const trial of [drafted, wrong, skipped, correct, finished]) {
    for (const merged of [mergePersonalData(marker, reasoningState(trial)), mergePersonalData(reasoningState(trial), marker)]) {
      if (trial.status === "active") assert.deepEqual(merged.activeTrial, trial);
      else {
        assert.deepEqual(merged.trials, [trial]);
        assert.equal(merged.activities[0].count, 1);
      }
    }
  }
  const math = createTrial({}, { id: "math-mistake", now: reasoningStart });
  const withMistake = transitionTrial(math, { type: "submit", value: String(math.currentQuestion.answer + 1) }, reasoningStart + 500);
  const clearedDraft = transitionTrial(withMistake, { type: "input", value: "" }, reasoningStart + 1000);
  const mathMarker = { ...createPersonalState(), removedActivityIds: ["cancel-preparation:math-mistake"] };
  assert.deepEqual(mergePersonalData(mathMarker, { ...createPersonalState(), activeTrial: clearedDraft }).activeTrial, clearedDraft);
});

test("a cancellation marker can discard an old preparation while retaining a different active trial", () => {
  const cancelled = reasoningFixture("sequence", "cancelled-pending", 5);
  const retained = reasoningFixture("pattern", "new-pattern", 5);
  const current = { ...reasoningState(retained), removedActivityIds: ["cancel-preparation:cancelled-pending"] };
  for (const merged of [mergePersonalData(current, reasoningState(cancelled)), mergePersonalData(reasoningState(cancelled), current)]) {
    assert.deepEqual(merged.activeTrial, retained);
    assert.equal(merged.trials.length, 0);
    assert.equal(merged.activities.length, 0);
  }
});
