import test from "node:test";
import assert from "node:assert/strict";
import { createProblemCatalogSyncController } from "../src/modules/problems/catalogSync.js";
import { createProblemsRuntimeBundle } from "../src/modules/problems/runtimeBundle.js";

function harness({ runtime = false } = {}) {
  let session = "owner-a:token-a";
  let state = { problems: [], problemStates: [{ problemId: "completed", completed: true }] };
  const requests = [];
  const saved = [];
  const rendered = [];
  const pending = () => new Promise((resolve, reject) => requests.push({ resolve, reject }));
  const deps = {
    getState: () => state, getSessionKey: () => session,
    requestCatalog: pending, cloudApi: () => pending().then(problems => ({ problems })),
    getUserCatalogProblems: problems => problems.filter(problem => problem.visibility === "user"),
    mergeProblems: (owned, catalog) => [...owned, ...catalog],
    saveState: () => saved.push(session), renderProblems: () => rendered.push(session)
  };
  const controller = runtime ? createProblemsRuntimeBundle(deps).runtime.getCatalogSyncController() : createProblemCatalogSyncController(deps);
  return { controller, requests, saved, rendered, get state() { return state; },
    switchSession: (next, nextState = { problems: [], problemStates: [] }) => { session = next; state = nextState; },
    replaceState: next => { state = next; } };
}

const memberQuestion = { id: "member-only", source: "question-bank" };
const freeQuestion = { id: "free", source: "quantguide" };
const sent = () => Promise.resolve();

test("a late member catalog cannot write into another account through the runtime wiring", async () => {
  const h = harness({ runtime: true });
  const first = h.controller.refresh();
  await sent();
  h.switchSession("owner-b:token-b");
  h.requests[0].resolve([memberQuestion]);
  assert.equal((await first).discarded, true);
  assert.deepEqual(h.state.problems, []);
  assert.deepEqual(h.saved, []);
  assert.deepEqual(h.rendered, []);
});

test("token changes for the same account reject a pending response", async () => {
  const h = harness();
  const pending = h.controller.refresh();
  await sent();
  h.switchSession("owner-a:token-replaced", h.state);
  h.requests[0].resolve([memberQuestion]);
  assert.equal((await pending).discarded, true);
  assert.deepEqual(h.saved, []);
});

test("a new account starts its own request instead of sharing another account's in-flight response", async () => {
  const h = harness();
  const first = h.controller.refresh();
  await sent();
  h.switchSession("owner-b:token-b");
  const second = h.controller.refresh();
  await sent();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve([freeQuestion]);
  await second;
  h.requests[0].resolve([memberQuestion]);
  assert.equal((await first).discarded, true);
  assert.deepEqual(h.state.problems, [freeQuestion]);
  assert.deepEqual(h.saved, ["owner-b:token-b"]);
});

test("an older forced refresh cannot restore member questions after a newer response", async () => {
  const h = harness();
  const first = h.controller.refresh();
  await sent();
  const second = h.controller.refresh(true);
  await sent();
  h.requests[1].resolve([freeQuestion]);
  await second;
  h.requests[0].resolve([memberQuestion]);
  assert.equal((await first).discarded, true);
  assert.deepEqual(h.state.problems, [freeQuestion]);
  assert.equal(h.saved.length, 1);
});

test("finishing an old request does not clear the newer pending request or defeat deduplication", async () => {
  const h = harness();
  const first = h.controller.refresh();
  await sent();
  const second = h.controller.refresh(true);
  await sent();
  h.requests[0].resolve([memberQuestion]);
  await first;
  assert.equal(h.controller.isRefreshing(), true);
  assert.equal(h.controller.refresh(), second);
  h.requests[1].resolve([freeQuestion]);
  await second;
  assert.equal(h.controller.isRefreshing(), false);
});

test("ordinary state changes within one session keep the response and preserve owned questions and progress", async () => {
  const h = harness();
  const pending = h.controller.refresh();
  await sent();
  const owned = { id: "new-owned", visibility: "user" };
  const progress = [{ problemId: "done-while-loading", completed: true }];
  h.replaceState({ problems: [owned], problemStates: progress });
  h.requests[0].resolve([freeQuestion]);
  assert.equal((await pending).changed, true);
  assert.deepEqual(h.state.problems, [owned, freeQuestion]);
  assert.deepEqual(h.state.problemStates, progress);
});

test("an empty newer response still invalidates an older in-flight catalog", async () => {
  const h = harness();
  const first = h.controller.refresh();
  await sent();
  const second = h.controller.refresh(true);
  await sent();
  h.requests[1].resolve([]);
  await second;
  h.requests[0].resolve([memberQuestion]);
  assert.equal((await first).discarded, true);
  assert.deepEqual(h.state.problems, []);
});
