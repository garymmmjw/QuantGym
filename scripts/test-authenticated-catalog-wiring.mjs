import test from "node:test";
import assert from "node:assert/strict";
import { initShellSliceImpl } from "../src/app/createAppContext/slices/impl/initShellSlice.impl.js";
import { initRuntimeSliceImpl } from "../src/app/createAppContext/slices/impl/initRuntimeSlice.impl.js";
import * as appImports from "../src/app/createAppContext/sharedImports.js";
import { createProblemsFacade } from "../src/modules/problems/facade.js";
import { createProblemsRuntimeBundle } from "../src/modules/problems/runtimeBundle.js";
import { createAccountAuthBundle } from "../src/app/accountAuthBundle.js";

const noop = () => {};
const question = (id, source, visibility = "private") => ({
  id, source, visibility, bookSlug: source, titleEn: `Fixture ${id}`, promptEn: "Fixture question."
});

function harness(t, signedIn = true) {
  const documentRef = { createElement: () => ({}), getElementById: () => ({}) };
  const windowRef = { scrollTo: noop, addEventListener: noop, location: new URL("https://fixture.invalid/problems") };
  const storage = new Map();
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
  for (const [key, value] of Object.entries({ document: documentRef, window: windowRef, history: {}, localStorage })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  const user = signedIn ? { id: "fixture-owner", cloudLinked: true, name: "Fixture" } : null;
  localStorage.setItem("fixture.auth", JSON.stringify({ accounts: user ? [user] : [], currentUserId: user?.id || "" }));
  localStorage.setItem("fixture.cloud", JSON.stringify({ endpoint: "https://fixture.invalid/api", token: "fixture-token", userId: user?.id || "" }));
  const userQuestion = { ...question("user-own", "question-bank", "user"), ownerUserId: "fixture-owner" };
  localStorage.setItem("fixture.state.fixture-owner", JSON.stringify({
    problems: [question("quantguide-stale", "quantguide"), userQuestion],
    problemStates: [{ problemId: "quantguide-stale", completed: true }]
  }));
  const rows = [
    question("public-book", "green-book", "public"),
    question("purple-new", "question-bank"), question("quantguide-new", "quantguide"),
    question("xiaohongshu-new", "interview-xiaohongshu"),
    question("onepoint-new", "interview-onepoint3acres"), question("glassdoor-new", "interview-glassdoor")
  ];
  const calls = { requests: [], notified: [], rendered: 0, social: 0 };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.requests.push({ url, authorization: options.headers.Authorization });
    return { ok: true, json: async () => ({ problems: rows }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  // Use the entire real runtime slice, including its provider exports,
  // normalization, storage serialization and React-facing domain stores.
  const refs = {};
  const runtimeImports = {
    ...appImports, AUTH_KEY: "fixture.auth", CLOUD_CONFIG_KEY: "fixture.cloud", USER_STATE_PREFIX: "fixture.state",
    catalogProblems: [rows[0]], getRuntimeCatalogProblems: () => [rows[0]],
    seedJobs: [], seedCourses: [], seedNews: []
  };
  const ctx = { options: {}, __sliceRefs: refs };
  Object.assign(ctx, initRuntimeSliceImpl(runtimeImports, ctx));
  for (const key of ["getUserCatalogProblems", "mergeProblems", "normalizeProblemState", "mergeProblemStates"]) {
    assert.equal(typeof ctx[key], "function", `Runtime must export provider method ${key}`);
  }
  const unsubscribe = ctx.domainStores.userStateStore.subscribe(snapshot => calls.notified.push(snapshot.value.problems.map(row => row.id)));
  t.after(unsubscribe);

  // Stub unrelated visual shell widgets only. The runtime/save/store methods
  // passed into the account and catalog controllers are the actual slice exports.
  const widget = new Proxy({}, { get: () => noop });
  const shared = { createProblemsFacade };
  for (const name of [
    "createJobsFacade", "createOverviewFacade", "createInterviewFacade", "createPageLifecycle",
    "createAppShellController", "createProblemPaginationController", "createProblemPersonalStateController",
    "createProblemCatalogMutationController", "createProblemCaptureController", "createProblemViewportCaptureController",
    "createPlanningActivityBundle", "createAppCommunityControllerBundle"
  ]) shared[name] = () => widget;
  ctx.interviewRuntime = { state: {} };
  Object.assign(ctx, initShellSliceImpl(shared, ctx));
  refs.problemBrowserController = { render: () => { calls.rendered++; } };
  refs.problemsRuntime = createProblemsRuntimeBundle({
    getState: () => ctx.userState.value, cloudApi: ctx.cloudApi,
    getUserCatalogProblems: ctx.getUserCatalogProblems, mergeProblems: ctx.mergeProblems,
    isCatalogProblem: ctx.isCatalogProblem, isDisabledProblemSource: ctx.isDisabledProblemSource,
    isDisabledProblemId: appImports.isDisabledProblemId,
    saveState: ctx.saveState, renderProblems: ctx.renderProblems, clearProblemLookupCaches: ctx.clearProblemLookupCaches
  }).runtime;
  const refreshSocial = refs.problemsRuntime.refreshSocial;
  refs.problemsRuntime.refreshSocial = (...args) => { calls.social++; return refreshSocial(...args); };
  const account = createAccountAuthBundle({ ...ctx, getGoogleClientId: appImports.getGoogleClientIdValue, elements: ctx.els, documentRef, windowRef });
  return { ctx, account, userState: ctx.userState, calls, rows, storage };
}

test("authenticated session uses the real shell exports to refresh private catalog and replace stale cached rows", async t => {
  const h = harness(t);
  h.account.renderSession();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.requests, [{ url: "https://fixture.invalid/api/problems", authorization: "Bearer fixture-token" }]);
  assert.deepEqual(h.userState.value.problems.map(row => row.id).sort(), ["user-own", ...h.rows.map(row => row.id)].sort());
  assert.equal(h.userState.value.problems.find(row => row.id === "purple-new").visibility, "private");
  const persisted = JSON.parse(h.storage.get("fixture.state.fixture-owner"));
  assert.deepEqual(persisted.problems.map(row => row.id), ["user-own"], "real serializer preserves user questions without persisting downloaded catalogs");
  assert.equal(persisted.problemStates.find(row => row.problemId === "quantguide-stale").completed, true);
  const expectedIds = ["user-own", ...h.rows.map(row => row.id)].sort();
  assert.deepEqual(h.calls.notified.at(-1).sort(), expectedIds, "React subscribers receive the refreshed catalog");
  assert.deepEqual(h.ctx.domainStores.userStateStore.getState().value.problems.map(row => row.id).sort(), expectedIds);
  assert.equal(h.calls.rendered, 2, "catalog and social refreshes both reach the browser facade");
  assert.equal(h.calls.social, 1);
  assert.equal(h.userState.value.problemStates.find(row => row.problemId === "quantguide-stale").completed, true);
});

test("signed-out session does not request an authenticated catalog", async t => {
  const h = harness(t, false);
  h.account.renderSession();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.requests.length, 0);
  assert.deepEqual(JSON.parse(h.storage.get("fixture.state.fixture-owner")).problems.map(row => row.id), ["quantguide-stale", "user-own"]);
});
