import test from "node:test";
import assert from "node:assert/strict";
import { initShellSliceImpl } from "../src/app/createAppContext/slices/impl/initShellSlice.impl.js";
import { createProblemsFacade } from "../src/modules/problems/facade.js";
import { createProblemsRuntimeBundle } from "../src/modules/problems/runtimeBundle.js";
import { createAccountAuthBundle } from "../src/app/accountAuthBundle.js";
import { createCloudRuntime } from "../src/api/cloudRuntime.js";
import { getUserCatalogProblems, isCatalogProblem, mergeProblems } from "../src/modules/problems/data.js";
import { isDisabledProblemId, isDisabledProblemSource } from "../src/modules/problems/format.js";

const noop = () => {};
const question = (id, source, visibility = "private") => ({
  id, source, visibility, bookSlug: source, titleEn: `Fixture ${id}`, promptEn: "Fixture question."
});

function harness(t, signedIn = true) {
  const documentRef = { createElement: () => ({}), getElementById: () => ({}) };
  const windowRef = { scrollTo: noop };
  for (const [key, value] of Object.entries({ document: documentRef, window: windowRef })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  const user = signedIn ? { id: "fixture-owner", cloudLinked: true, name: "Fixture" } : null;
  const appState = { currentUser: user, auth: {}, cloudConfig: { endpoint: "https://fixture.invalid/api", token: "fixture-token", userId: user?.id || "" } };
  const userQuestion = { ...question("user-own", "question-bank", "user"), ownerUserId: "fixture-owner" };
  const userState = { value: {
    problems: [question("quantguide-stale", "quantguide"), userQuestion],
    problemStates: [{ problemId: "quantguide-stale", completed: true }]
  } };
  const rows = [
    question("public-book", "green-book", "public"),
    question("purple-new", "question-bank"), question("quantguide-new", "quantguide"),
    question("xiaohongshu-new", "interview-xiaohongshu"),
    question("onepoint-new", "interview-onepoint3acres"), question("glassdoor-new", "interview-glassdoor")
  ];
  const calls = { requests: [], saved: [], rendered: 0, social: 0 };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.requests.push({ url, authorization: options.headers.Authorization });
    return { ok: true, json: async () => ({ problems: rows }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  // Only unrelated shell widgets are stubbed. Run the actual slice return,
  // account bundle, problem facade, runtime, catalog filter/merge and HTTP client.
  const widget = new Proxy({}, { get: () => noop });
  const shared = { createProblemsFacade };
  for (const name of [
    "createJobsFacade", "createOverviewFacade", "createInterviewFacade", "createPageLifecycle",
    "createAppShellController", "createProblemPaginationController", "createProblemPersonalStateController",
    "createProblemCatalogMutationController", "createProblemCaptureController", "createProblemViewportCaptureController",
    "createPlanningActivityBundle", "createAppCommunityControllerBundle"
  ]) shared[name] = () => widget;
  const refs = {};
  const ctx = {
    options: {}, __sliceRefs: refs, appState, userState, interviewRuntime: { state: {} },
    userStateActivityHooks: {}, communityActivityHooks: {},
    getCurrentUser: () => user, getGoogleClientId: () => "", loadState: () => userState.value,
    saveState: options => calls.saved.push({ options, ids: userState.value.problems.map(row => row.id) }),
    t: key => key
  };
  Object.assign(ctx, initShellSliceImpl(shared, ctx));
  refs.problemBrowserController = { render: () => { calls.rendered++; } };
  const cloud = createCloudRuntime({ getConfig: () => appState.cloudConfig, getCurrentUser: () => user });
  refs.problemsRuntime = createProblemsRuntimeBundle({
    getState: () => userState.value, cloudApi: cloud.request,
    getUserCatalogProblems, mergeProblems, isCatalogProblem, isDisabledProblemSource, isDisabledProblemId,
    saveState: ctx.saveState, renderProblems: ctx.renderProblems
  }).runtime;
  const refreshSocial = refs.problemsRuntime.refreshSocial;
  refs.problemsRuntime.refreshSocial = (...args) => { calls.social++; return refreshSocial(...args); };
  const account = createAccountAuthBundle({ ...ctx, elements: ctx.els, documentRef, windowRef });
  return { ctx, account, userState, calls, rows };
}

test("authenticated session uses the real shell exports to refresh private catalog and replace stale cached rows", async t => {
  const h = harness(t);
  h.account.renderSession();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.requests, [{ url: "https://fixture.invalid/api/problems", authorization: "Bearer fixture-token" }]);
  assert.deepEqual(h.userState.value.problems.map(row => row.id).sort(), ["user-own", ...h.rows.map(row => row.id)].sort());
  assert.equal(h.userState.value.problems.find(row => row.id === "purple-new").visibility, "private");
  assert.equal(h.calls.saved.length, 1);
  assert.deepEqual(h.calls.saved[0].options, { sync: false, checkIn: false });
  assert.equal(h.calls.rendered, 2, "catalog and social refreshes both reach the browser facade");
  assert.equal(h.calls.social, 1);
  assert.deepEqual(h.userState.value.problemStates, [{ problemId: "quantguide-stale", completed: true }]);
});

test("signed-out session does not request an authenticated catalog", async t => {
  const h = harness(t, false);
  h.account.renderSession();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.requests.length, 0);
  assert.equal(h.calls.saved.length, 0);
});
