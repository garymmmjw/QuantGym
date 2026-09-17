import test from "node:test";
import assert from "node:assert/strict";
import { createCareerStageStore, getCurrentStage, getSavedQuestionCount, localDateKey, nextStageLabel, sortCareerStages, stageStorageKey } from "../src/features/careerStages/stageStore.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
const input = (label, recordedDate = "2026-09-17") => ({ label, description: "Resume ready", recordedDate });
const defaults = [{ id: "stage-1", label: "Stage 1", description: "Initial" }, { id: "stage-2", label: "Stage 2", description: "Resume ready" }];

test("imported stages preserve ids and unknown dates; metadata reads and re-imports remain stable", () => {
  const storage = memoryStorage();
  const store = createCareerStageStore({ ownerId: "alice", storage, defaults });
  assert.deepEqual(store.getSnapshot().stages.map((stage) => [stage.id, stage.recordedDate]), [["stage-1", null], ["stage-2", null]]);
  assert.throws(() => store.updateStage("stage-1", { description: "Edited" }), /日期/);
  const saved = store.updateStage("stage-2", { recordedDate: "2026-09-17", extra: { kept: true } });
  const initial = store.getSnapshot();
  storage.setItem("quantMemoryBoard.userState.v1.alice", JSON.stringify({ problemStates: [{ problemId: "p1", completed: true }] }));
  store.ensureStages(defaults);
  store.refresh();
  assert.equal(store.getSnapshot(), initial);
  assert.equal(store.getSnapshot().stages[1].recordedDate, "2026-09-17");
  assert.throws(() => { saved.recordedDate = "2026-09-18"; }, TypeError);
  assert.throws(() => { saved.extra.kept = false; }, TypeError);
  const reloaded = createCareerStageStore({ ownerId: "alice", storage, defaults });
  assert.deepEqual(reloaded.getSnapshot().stages[1], saved);
});

test("homepage-first stage creation is preserved when matching tracker defaults are imported later", () => {
  const storage = memoryStorage();
  const home = createCareerStageStore({ ownerId: "alice", storage });
  const saved = home.addStage(input("stage 1"));
  const tracker = createCareerStageStore({ ownerId: "alice", storage, defaults });
  const snapshot = tracker.getSnapshot();
  assert.equal(snapshot.error, "");
  assert.equal(snapshot.stages.length, 2);
  assert.deepEqual(snapshot.stages[0], { ...saved, importedIds: [defaults[0].id] });
  assert.notEqual(snapshot.stages[0].id, defaults[0].id);
  assert.equal(snapshot.stages[1].id, defaults[1].id);
  assert.equal(Object.hasOwn(snapshot.stages[1], "solvedCount"), false);
  assert.equal(snapshot.stages[1].recordedDate, null);
  tracker.ensureStages(defaults);
  assert.equal(tracker.getSnapshot(), snapshot);
});

test("import aliases preserve application references and prevent duplicate defaults after a milestone rename", () => {
  const storage = memoryStorage();
  const home = createCareerStageStore({ ownerId: "alice", storage });
  const saved = home.addStage(input("Stage 1"));
  home.ensureStages(defaults);
  const aliased = home.getSnapshot().stages.find((stage) => stage.id === saved.id);
  assert.deepEqual(aliased.importedIds, ["stage-1"]);
  const renamed = home.updateStage(saved.id, { label: "Applications ready" });
  assert.deepEqual(renamed.importedIds, ["stage-1"]);
  const tracker = createCareerStageStore({ ownerId: "alice", storage, defaults });
  assert.equal(tracker.getSnapshot().error, "");
  assert.equal(tracker.getSnapshot().stages.length, 2);
  assert.deepEqual(tracker.getSnapshot().stages.find((stage) => stage.importedIds?.includes("stage-1")), renamed);
  const initial = tracker.getSnapshot();
  tracker.ensureStages(defaults);
  assert.equal(tracker.getSnapshot(), initial);
  tracker.ensureStages([{ id: "source-v2", label: "Applications ready" }]);
  assert.deepEqual(tracker.getSnapshot().stages[0].importedIds, ["stage-1", "source-v2"]);
  assert.equal(tracker.getSnapshot().stages[0].recordedDate, saved.recordedDate);
  assert.equal(tracker.getSnapshot().stages[0].createdAt, saved.createdAt);
});

test("add and edit require real calendar days and never accept manually supplied counts", () => {
  const store = createCareerStageStore({ storage: memoryStorage() });
  const first = store.addStage(input("Stage 1"));
  assert.equal(Object.hasOwn(first, "solvedCount"), false);
  assert.equal(store.addStage(input("Leap", "2028-02-29")).recordedDate, "2028-02-29");
  for (const date of ["", null, undefined, "2026-02-29", "2026-09-31", "2026-13-01", "9/17", "2026-09-17T00:00:00Z"]) {
    assert.throws(() => store.addStage({ ...input("Invalid"), recordedDate: date }), /日期/);
    assert.throws(() => store.updateStage(first.id, { recordedDate: date }), /日期/);
  }
  const suppliedCounts = [0, 50, -1, 1.5, "0", null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];
  for (const [index, count] of suppliedCounts.entries()) {
    const added = store.addStage({ ...input(`Ignored count ${index}`), solvedCount: count, countSource: "manual" });
    const edited = store.updateStage(added.id, { solvedCount: count, countSource: "manual" });
    for (const stage of [added, edited]) {
      assert.equal(Object.hasOwn(stage, "solvedCount"), false);
      assert.equal(Object.hasOwn(stage, "countSource"), false);
    }
  }
  assert.equal(store.getSnapshot().stages.length, 2 + suppliedCounts.length);
});

test("valid legacy counts remain readable until editing clears their obsolete manual fields", () => {
  const storage = memoryStorage();
  const legacy = { ...input("Stage 2"), id: "legacy", solvedCount: 50, countSource: "manual", extra: { preserve: true } };
  const undated = { ...input("Stage 1"), id: "undated", recordedDate: null, solvedCount: null, countSource: "unknown" };
  storage.setItem(stageStorageKey(), JSON.stringify({ version: 1, ownerId: "guest", stages: [undated, legacy], extraEnvelope: true }));
  const store = createCareerStageStore({ storage });
  assert.equal(store.getSnapshot().error, "");
  assert.deepEqual(store.getSnapshot().stages, [undated, legacy]);
  const edited = store.updateStage("legacy", { description: "Updated without supplying a count" });
  assert.equal(edited.recordedDate, "2026-09-17");
  assert.equal(Object.hasOwn(edited, "solvedCount"), false);
  assert.equal(Object.hasOwn(edited, "countSource"), false);
  assert.deepEqual(edited.extra, { preserve: true });
  assert.equal(store.getSnapshot().stages[0].solvedCount, null);
  assert.equal(JSON.parse(storage.getItem(stageStorageKey())).extraEnvelope, true);
  assert.throws(() => store.updateStage("undated", { description: "Needs a date" }), /日期/);
  const dated = store.updateStage("undated", { recordedDate: "2026-09-16" });
  assert.equal(dated.recordedDate, "2026-09-16");
  assert.equal(Object.hasOwn(dated, "solvedCount"), false);
  assert.equal(createCareerStageStore({ storage }).getSnapshot().error, "");
});

test("labels are trimmed, bounded, unique ignoring case; explicit corrections preserve record identity", () => {
  const storage = memoryStorage();
  const store = createCareerStageStore({ storage });
  const saved = store.addStage(input("  Stage 1  "));
  assert.equal(saved.label, "Stage 1");
  for (const label of ["", "   ", "x".repeat(41), "stage 1"]) assert.throws(() => store.addStage(input(label)));
  assert.throws(() => store.addStage({ ...input("Long"), description: "x".repeat(201) }), /200/);
  const revised = store.updateStage(saved.id, { id: "replaced", createdAt: "2020-01-01T00:00:00Z", capturedAt: "2020-01-01T00:00:00Z", solvedCount: 12, custom: "preserve" });
  assert.equal(revised.id, saved.id);
  assert.equal(revised.createdAt, saved.createdAt);
  assert.equal(revised.capturedAt, saved.capturedAt);
  assert.equal(Object.hasOwn(revised, "solvedCount"), false);
  assert.throws(() => store.updateStage(saved.id, { recordedDate: null }), /日期/);
  assert.equal(store.updateStage(saved.id, { description: "New" }).custom, "preserve");
});

test("accounts and QA namespaces remain isolated, including question count reads", () => {
  const storage = memoryStorage();
  const alice = createCareerStageStore({ ownerId: "alice:person", storage });
  alice.addStage(input("Stage 1"));
  const qa = createCareerStageStore({ ownerId: "alice:person", namespace: "qa", storage });
  qa.addStage(input("QA"));
  assert.equal(createCareerStageStore({ ownerId: "bob", storage }).getSnapshot().stages.length, 0);
  assert.equal(alice.getSnapshot().stages[0].label, "Stage 1");
  assert.equal(qa.getSnapshot().stages[0].label, "QA");
  assert.equal(stageStorageKey("alice:person"), "quantgym.career-stages.v1:alice%3Aperson");
  storage.setItem("quantMemoryBoard.userState.v1.alice:person", JSON.stringify({ problemStates: [{ problemId: "a", completed: true }] }));
  assert.equal(getSavedQuestionCount({ ownerId: "alice:person", storage, namespace: "qa" }), null);
  assert.equal(getSavedQuestionCount({ ownerId: "alice:person", storage }), 1);
  assert.equal(getSavedQuestionCount({ ownerId: "bob", storage }), null);
});

test("two stale tabs merge additions and corrections against current storage", () => {
  const storage = memoryStorage();
  const one = createCareerStageStore({ storage });
  const two = createCareerStageStore({ storage });
  const first = one.addStage(input("Stage 1"));
  const second = two.addStage(input("Stage 2"));
  one.updateStage(first.id, { description: "Edited" });
  two.updateStage(second.id, { recordedDate: "2026-09-18" });
  const stages = createCareerStageStore({ storage }).getSnapshot().stages;
  assert.equal(stages.length, 2);
  assert.equal(stages[0].description, "Edited");
  assert.equal(stages[1].recordedDate, "2026-09-18");
  assert.throws(() => one.addStage(input("STAGE 2")), /已存在/);
});

test("write failure throws, keeps the durable state, and never reports an unsaved stage as saved", () => {
  const storage = memoryStorage();
  const store = createCareerStageStore({ storage });
  const first = store.addStage(input("Stage 1"));
  const before = storage.getItem(stageStorageKey());
  const write = storage.setItem;
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.throws(() => store.addStage(input("Stage 2")), /未能保存/);
  assert.equal(storage.getItem(stageStorageKey()), before);
  assert.deepEqual(store.getSnapshot().stages.map((stage) => stage.id), [first.id]);
  assert.match(store.getSnapshot().error, /未能保存/);
  storage.setItem = write;
  store.addStage(input("Stage 2"));
  assert.equal(store.getSnapshot().error, "");
});

test("corrupt, wrong-account and invalid persisted records cannot be silently overwritten", () => {
  for (const raw of ["{broken", "null", JSON.stringify({ version: 1, ownerId: "other", stages: [] }), JSON.stringify({ version: 1, ownerId: "guest", stages: [{ ...input("Bad"), id: "bad", solvedCount: -1 }] }), JSON.stringify({ version: 1, ownerId: "guest", stages: [{ ...input("Bad", "2026-02-29"), id: "bad" }] })]) {
    const storage = memoryStorage();
    storage.setItem(stageStorageKey(), raw);
    const store = createCareerStageStore({ storage, defaults });
    assert.ok(store.getSnapshot().error);
    assert.throws(() => store.addStage(input("Stage 3")));
    assert.equal(storage.getItem(stageStorageKey()), raw);
  }
  const storage = memoryStorage();
  const store = createCareerStageStore({ storage });
  store.addStage(input("Stage 1"));
  storage.setItem(stageStorageKey(), "corrupt-after-load");
  store.refresh();
  assert.equal(store.getSnapshot().stages.length, 1);
  assert.throws(() => store.updateStage(store.getSnapshot().stages[0].id, { solvedCount: 100 }));
  assert.equal(storage.getItem(stageStorageKey()), "corrupt-after-load");
});

test("same-window events, storage events and focus refresh only the matching scope; dispose removes listeners", () => {
  const storage = memoryStorage();
  const events = new EventTarget();
  const one = createCareerStageStore({ ownerId: "alice", storage, eventTarget: events });
  const two = createCareerStageStore({ ownerId: "alice", storage, eventTarget: events });
  const other = createCareerStageStore({ ownerId: "bob", storage, eventTarget: events });
  let notified = 0;
  const unsubscribe = two.subscribe(() => { notified += 1; });
  one.addStage(input("Stage 1"));
  assert.equal(two.getSnapshot().stages.length, 1);
  assert.equal(other.getSnapshot().stages.length, 0);
  assert.equal(notified, 1);
  const external = createCareerStageStore({ ownerId: "alice", storage });
  external.addStage(input("Stage 2"));
  events.dispatchEvent(Object.assign(new Event("storage"), { key: stageStorageKey("alice"), storageArea: storage }));
  assert.equal(two.getSnapshot().stages.length, 2);
  external.addStage(input("Stage 3"));
  events.dispatchEvent(new Event("focus"));
  assert.equal(two.getSnapshot().stages.length, 3);
  unsubscribe();
  two.dispose();
  one.addStage(input("Stage 4"));
  assert.equal(two.getSnapshot().stages.length, 3);
  assert.throws(() => two.addStage(input("Closed")), /已关闭/);
  const resubscribed = two.subscribe(() => {});
  assert.equal(two.getSnapshot().stages.length, 4);
  one.addStage(input("Stage 5"));
  assert.equal(two.getSnapshot().stages.length, 5);
  resubscribed();
  two.dispose();
});

test("unsubscribed construction leaks no listeners and StrictMode cleanup replay reconnects one listener set", () => {
  const storage = memoryStorage();
  const active = new Map();
  const events = {
    addEventListener(type, listener) { if (!active.has(type)) active.set(type, new Set()); active.get(type).add(listener); },
    removeEventListener(type, listener) { active.get(type)?.delete(listener); }
  };
  const listenerCount = () => [...active.values()].reduce((sum, listeners) => sum + listeners.size, 0);
  createCareerStageStore({ storage, eventTarget: events });
  const store = createCareerStageStore({ storage, eventTarget: events });
  assert.equal(listenerCount(), 0);
  const first = store.subscribe(() => {});
  const second = store.subscribe(() => {});
  assert.equal(listenerCount(), 3);
  first();
  assert.equal(listenerCount(), 3);
  second();
  store.dispose();
  assert.equal(listenerCount(), 0);
  createCareerStageStore({ storage }).addStage(input("Stage 1"));
  const replay = store.subscribe(() => {});
  assert.equal(listenerCount(), 3);
  assert.equal(store.getSnapshot().stages[0].label, "Stage 1");
  store.addStage(input("Stage 2"));
  replay();
  store.dispose();
  assert.equal(listenerCount(), 0);
});

test("saved question count distinguishes unknown from zero and deduplicates completed problem ids", () => {
  const storage = memoryStorage();
  const key = "quantMemoryBoard.userState.v1.alice";
  assert.equal(getSavedQuestionCount({ ownerId: "alice", storage }), null);
  storage.setItem(key, JSON.stringify({ problemStates: [] }));
  assert.equal(getSavedQuestionCount({ ownerId: "alice", storage }), 0);
  storage.setItem(key, JSON.stringify({ problemStates: [{ problemId: "a", completed: true }, { problemId: "a", completed: true }, { problemId: "b", completed: false }, { problemId: "c", completed: true }] }));
  assert.equal(getSavedQuestionCount({ ownerId: "alice", storage }), 2);
  for (const raw of ["bad", "null", "{}", '{"problemStates":[{"problemId":"a","completed":"yes"}]}']) {
    storage.setItem(key, raw);
    assert.equal(getSavedQuestionCount({ ownerId: "alice", storage }), null);
  }
});

test("numbered stages always sort naturally and current is the last stage regardless of dates or import order", () => {
  const stages = [
    { id: "ten", label: "Stage 10", recordedDate: "2026-09-15" },
    { id: "two", label: "stage2", recordedDate: "2026-09-19" },
    { id: "one", label: "Stage 1", recordedDate: "2026-09-20" },
    { id: "nine", label: "STAGE 9", recordedDate: null }
  ];
  const originalOrder = [...stages];
  assert.deepEqual(sortCareerStages(stages).map((stage) => stage.id), ["one", "two", "nine", "ten"]);
  assert.deepEqual(stages, originalOrder);
  assert.equal(getCurrentStage(stages).id, "ten");
  assert.equal(getCurrentStage([...stages].reverse()).id, "ten");
  const imported = defaults.map((stage) => ({ ...stage, recordedDate: null }));
  assert.equal(getCurrentStage(imported.reverse()).id, "stage-2");
  assert.equal(getCurrentStage([]), null);
});

test("custom stage labels retain insertion order after numbered stages and numeric ties are stable", () => {
  const stages = [{ label: "Resume" }, { label: "Stage 02" }, { label: "Stage 1" }, { label: "Applying" }, { label: "stage 2" }];
  assert.deepEqual(sortCareerStages(stages).map((stage) => stage.label), ["Stage 1", "Stage 02", "stage 2", "Resume", "Applying"]);
  assert.equal(getCurrentStage(stages).label, "Applying");
});

test("next stage labels and local date helpers are stable", () => {
  assert.equal(nextStageLabel(defaults), "Stage 3");
  assert.equal(nextStageLabel([{ label: "stage 8" }, { label: "Applications" }]), "Stage 9");
  assert.equal(localDateKey(new Date(2026, 8, 17, 23, 59)), "2026-09-17");
});
