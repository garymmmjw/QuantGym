import test from "node:test";
import assert from "node:assert/strict";
import { clearMathTypeset, createMathTypesetScheduler } from "../src/ui/mathTypeset.js";

const node = name => ({ name, isConnected: true });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function settle() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}
function runtime(math) {
  let nextId = 0;
  const timers = new Map();
  const windowRef = {
    MathJax: math,
    setTimeout(callback) { const id = nextId++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  return {
    windowRef,
    timers,
    fire() {
      const entry = timers.entries().next().value;
      assert.ok(entry, "A scheduled timer should exist");
      timers.delete(entry[0]);
      entry[1]();
    }
  };
}

test("batches all roots, deduplicates repeats and descendants, and never requests a page-wide typeset", async () => {
  const calls = [];
  const root = node("question");
  const child = node("inline equation");
  const answer = node("answer");
  root.contains = target => target === child;
  const clock = runtime({ typesetPromise: async roots => calls.push(roots) });
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  for (const item of [root, child, answer, root]) assert.equal(scheduler.schedule(item), true);
  assert.equal(clock.timers.size, 1);
  clock.fire();
  await settle();
  assert.deepEqual(calls, [[root, answer]]);
  assert.equal(scheduler.isPending(), false);
  assert.equal(clock.timers.size, 0);
});

test("retains roots until the late CDN API and startup promise are ready", async () => {
  const clock = runtime();
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  const question = node("question");
  const hint = node("hint");
  const answer = node("answer");
  const startup = deferred();
  const calls = [];
  scheduler.schedule(question);
  clock.fire();
  assert.equal(clock.timers.size, 1);
  scheduler.schedule(hint);
  clock.windowRef.MathJax = { startup: { promise: startup.promise }, typesetPromise: async roots => calls.push(roots) };
  clock.fire();
  scheduler.schedule(answer);
  await settle();
  assert.equal(scheduler.isPending(), true);
  assert.deepEqual(calls, []);
  startup.resolve();
  await settle();
  assert.deepEqual(calls, [[question, hint, answer]]);
  assert.equal(scheduler.isPending(), false);
});

test("serializes in-flight batches and shares the startup queue across scheduler instances", async () => {
  const firstDone = deferred();
  const calls = [];
  let active = 0;
  let maxActive = 0;
  const clock = runtime({
    async typesetPromise(roots) {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push(roots.map(root => root.name));
      if (calls.length === 1) await firstDone.promise;
      active -= 1;
    }
  });
  const first = createMathTypesetScheduler({ windowRef: clock.windowRef });
  const second = createMathTypesetScheduler({ windowRef: clock.windowRef });
  first.schedule(node("first"));
  clock.fire();
  await settle();
  first.schedule(node("next content"));
  second.schedule(node("other module"));
  clock.fire();
  await settle();
  assert.deepEqual(calls, [["first"]]);
  firstDone.resolve();
  await settle();
  clock.fire();
  await settle();
  assert.deepEqual(calls, [["first"], ["other module"], ["next content"]]);
  assert.equal(maxActive, 1);
  assert.equal(first.isPending(), false);
  assert.equal(second.isPending(), false);
});

test("drops detached content while waiting and typesets only its connected replacement", async () => {
  const startup = deferred();
  const calls = [];
  const clock = runtime({ startup: { promise: startup.promise }, typesetPromise: async roots => calls.push(roots) });
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  const old = node("old question");
  const current = node("new question");
  scheduler.schedule(old);
  clock.fire();
  old.isConnected = false;
  scheduler.schedule(current);
  startup.resolve();
  await settle();
  assert.deepEqual(calls, [[current]]);
  assert.equal(scheduler.schedule(old), false);
});

test("disposal cancels ready polling, including a timer whose ID is zero", () => {
  const clock = runtime();
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  scheduler.schedule(node("question"));
  assert.equal(clock.timers.has(0), true);
  scheduler.dispose();
  assert.equal(clock.timers.size, 0);
  assert.equal(scheduler.isPending(), false);
  assert.equal(scheduler.schedule(node("later")), false);
});

test("disposal during startup prevents typesetting and cannot schedule another batch", async () => {
  const startup = deferred();
  const calls = [];
  const clock = runtime({ startup: { promise: startup.promise }, typesetPromise: async roots => calls.push(roots) });
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  scheduler.schedule(node("question"));
  clock.fire();
  scheduler.dispose();
  startup.resolve();
  await settle();
  assert.deepEqual(calls, []);
  assert.equal(clock.timers.size, 0);
  assert.equal(scheduler.isPending(), false);
});

test("disposal during typesetting clears the finished batch and discards pending roots", async () => {
  const finished = deferred();
  const calls = [];
  const cleared = [];
  const clock = runtime({
    async typesetPromise(roots) { calls.push(roots); await finished.promise; },
    typesetClear: roots => cleared.push(roots)
  });
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  const old = node("old question");
  scheduler.schedule(old);
  clock.fire();
  await settle();
  scheduler.schedule(node("pending"));
  scheduler.dispose();
  assert.deepEqual(cleared, []);
  finished.resolve();
  await settle();
  assert.deepEqual(calls, [[old]]);
  assert.deepEqual(cleared, [[old]]);
  assert.equal(clock.timers.size, 0);
});

test("unmount cleanup waits for the shared typesetting queue and clears only its own content", async () => {
  const finished = deferred();
  const cleared = [];
  const old = node("old question");
  const windowRef = { MathJax: { startup: { promise: finished.promise }, typesetClear: roots => cleared.push(roots) } };
  clearMathTypeset(old, { windowRef });
  await settle();
  assert.deepEqual(cleared, []);
  finished.resolve();
  await windowRef.MathJax.startup.promise;
  assert.deepEqual(cleared, [[old]]);
});

test("a failed typeset does not block later content", async () => {
  let calls = 0;
  const clock = runtime({ async typesetPromise() { if (++calls === 1) throw new Error("Malformed formula"); } });
  const scheduler = createMathTypesetScheduler({ windowRef: clock.windowRef });
  scheduler.schedule(node("bad content"));
  clock.fire();
  await settle();
  scheduler.schedule(node("next content"));
  clock.fire();
  await settle();
  assert.equal(calls, 2);
  assert.equal(scheduler.isPending(), false);
});
