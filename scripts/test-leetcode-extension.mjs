import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const popupSource = fs.readFileSync(new URL("../browser-extension/popup.js", import.meta.url), "utf8");
const bridgeSource = fs.readFileSync(new URL("../browser-extension/quantgym-bridge.js", import.meta.url), "utf8");
let checks = 0;
const question = (id, slug = `problem-${id}`) => ({ frontendId: String(id), titleSlug: slug, title: `Problem ${id}`, translatedTitle: `题目 ${id}`, difficulty: "MEDIUM", code: "must-not-export", cookie: "must-not-export" });
const submission = (id, frontendId = "1") => ({ id: String(id), frontendId, status: "AC", timestamp: "1789080312", code: "must-not-export" });
function popupContext(fetch) {
  return vm.createContext({
    document: { getElementById: () => ({ addEventListener() {} }), addEventListener() {} },
    location: { protocol: "https:", hostname: "leetcode.cn" },
    URL, Map, Set, Date, AbortController, TextEncoder, fetch,
    setTimeout: (callback, ms) => ms === 150 ? setTimeout(callback, 0) : setTimeout(callback, ms),
    clearTimeout
  });
}
async function runPage({ problemPages, submissionPages, finalUser, failure, signedIn = true } = {}) {
  let identityCalls = 0;
  let problemCalls = 0;
  let submissionCalls = 0;
  const bodies = [];
  const context = popupContext(async (url, init) => {
    assert.equal(url, "/graphql/");
    assert.equal(init.credentials, "include");
    assert.deepEqual(Object.keys(init.headers), ["Content-Type"]);
    const body = JSON.parse(init.body);
    bodies.push(body);
    assert.doesNotMatch(body.query, /\b(code|cookie|token)\b/i);
    if (failure) await failure(body);
    let data;
    if (body.query.includes("QuantGymIdentity")) {
      identityCalls += 1;
      data = { userStatus: { isSignedIn: signedIn, username: "funny-edisonuln", userSlug: identityCalls > 1 && finalUser ? finalUser : "funny-edisonuln" } };
    } else if (body.query.includes("QuantGymSolved")) {
      const pages = problemPages || [{ totalNum: 2, questions: [question(1), question(2)] }];
      data = { userProgressQuestionList: pages[Math.min(problemCalls++, pages.length - 1)] };
    } else {
      const pages = submissionPages || [{ hasNext: true, lastKey: "a", submissions: [submission(10), submission(11)] }, { hasNext: false, lastKey: null, submissions: [submission(11), submission(12, "2")] }];
      data = { submissionList: pages[Math.min(submissionCalls++, pages.length - 1)] };
    }
    return { ok: true, json: async () => ({ data }) };
  });
  vm.runInContext(popupSource, context);
  const result = await context.readLeetcodeHistoryFromPage();
  return { result: JSON.parse(JSON.stringify(result)), context, bodies, identityCalls };
}

const full = await runPage();
assert.equal(full.result.ok, true);
assert.equal(full.identityCalls, 2);
assert.equal(full.result.payload.problems.length, 2);
assert.equal(full.result.payload.submissions.length, 3);
assert.equal(full.result.payload.submissions[2].problemSlug, "problem-2");
assert.equal(full.result.payload.submissions[0].submittedAt, "2026-09-10T22:45:12.000Z");
assert.equal(full.result.payload.coverage.complete, true);
assert.doesNotMatch(JSON.stringify(full.result), /must-not-export/);
assert.equal(full.bodies.filter((body) => body.query.includes("QuantGymSubmissions"))[1].variables.lastKey, "a");
checks += 1;

const pages = await runPage({ problemPages: [{ totalNum: 2, questions: [question(1)] }, { totalNum: 2, questions: [question(2)] }] });
assert.equal(pages.result.payload.coverage.complete, true);
assert.equal(pages.bodies.filter((body) => body.query.includes("QuantGymSolved"))[1].variables.filters.skip, 1);
checks += 1;

const switched = await runPage({ finalUser: "another-user" });
assert.equal(switched.result.ok, false);
assert.match(switched.result.error, /账号已切换/);
assert.equal(switched.result.payload, undefined);
const signedOut = await runPage({ signedIn: false });
assert.equal(signedOut.result.ok, false);
assert.equal(signedOut.bodies.length, 1);
checks += 1;

const duplicated = await runPage({ submissionPages: [{ hasNext: true, lastKey: "same", submissions: [submission(10)] }, { hasNext: true, lastKey: "same", submissions: [submission(11)] }] });
assert.equal(duplicated.result.ok, true);
assert.equal(duplicated.result.payload.coverage.complete, false);
assert.match(duplicated.result.payload.coverage.reason, /游标重复/);
const stalled = await runPage({ submissionPages: [{ hasNext: true, lastKey: null, submissions: [submission(10)] }] });
assert.equal(stalled.result.payload.coverage.complete, false);
assert.match(stalled.result.payload.coverage.reason, /分页重复/);
checks += 1;

const malformed = await runPage({ submissionPages: [{ hasNext: false, submissions: [submission(10), submission(11, "999"), { ...submission(12), timestamp: "garbage" }, { ...submission(13), status: "WA" }] }] });
assert.equal(malformed.result.payload.submissions.length, 1);
assert.equal(malformed.result.payload.coverage.skippedRecords, 3);
assert.equal(malformed.result.payload.coverage.complete, false);
checks += 1;

const partial = await runPage({ failure: (body) => { if (body.query.includes("QuantGymSubmissions")) throw Object.assign(new Error("timeout"), { name: "AbortError" }); } });
assert.equal(partial.result.ok, true);
assert.equal(partial.result.payload.coverage.complete, false);
assert.match(partial.result.payload.coverage.reason, /超时/);
assert.equal(partial.identityCalls, 2);
checks += 1;

const empty = await runPage({ problemPages: [{ totalNum: 0, questions: [] }], submissionPages: [{ hasNext: false, submissions: [] }] });
assert.equal(empty.result.payload.coverage.complete, true);
assert.equal(empty.result.payload.problems.length, 0);
checks += 1;

const countBound = await runPage({
  problemPages: [{ totalNum: 19500, questions: Array.from({ length: 19500 }, (_, index) => question(index + 1)) }],
  submissionPages: [{ hasNext: false, submissions: Array.from({ length: 1000 }, (_, index) => submission(index + 1)) }]
});
assert.equal(countBound.result.payload.problems.length + countBound.result.payload.submissions.length, 20000);
assert.equal(countBound.result.payload.coverage.complete, false);
assert.match(countBound.result.payload.coverage.reason, /20,000/);
const sizeBound = await runPage({
  problemPages: [{ totalNum: 6000, questions: Array.from({ length: 6000 }, (_, index) => ({ ...question(index + 1), title: "x".repeat(300), translatedTitle: "题".repeat(300) })) }],
  submissionPages: [{ hasNext: false, submissions: [] }]
});
assert.equal(sizeBound.result.ok, true);
assert.equal(sizeBound.result.payload.coverage.complete, false);
assert.match(sizeBound.result.payload.coverage.reason, /文件大小/);
assert.ok(Buffer.byteLength(JSON.stringify(sizeBound.result.payload)) < 5 * 1024 * 1024);
checks += 1;

for (const target of ["https://beta.quantgym.app/tools?x=1", "https://quantgym.app", "https://www.quantgym.app", "http://localhost:5176/tools", "http://127.0.0.1:5176/"]) {
  assert.equal(full.context.leetcodeTargetUrl(target), `${new URL(target).origin}/leetcode`);
}
for (const target of ["https://evil.test/", "https://quantgym.app.evil.test/", "https://quantgym.app:444/", "https://user:pass@quantgym.app/", "http://quantgym.app/", "javascript:alert(1)"]) {
  assert.throws(() => full.context.leetcodeTargetUrl(target));
}
assert.equal(full.context.isLeetcodeCnUrl("https://leetcode.cn/problems/two-sum/"), true);
assert.equal(full.context.isLeetcodeCnUrl("https://leetcode.cn.evil.test/"), false);
checks += 1;

function createBridge(href = "https://beta.quantgym.app/leetcode") {
  const messages = [];
  const pageListeners = [];
  const runtimeListeners = [];
  const location = new URL(href);
  const window = {
    location,
    addEventListener: (type, listener) => pageListeners.push(listener),
    postMessage: (message, origin) => { messages.push({ message, origin }); }
  };
  const context = vm.createContext({ window, URL, chrome: { runtime: { id: "collector-id", onMessage: { addListener: (listener) => runtimeListeners.push(listener) } } } });
  vm.runInContext(bridgeSource, context);
  const page = (data, extra = {}) => pageListeners.forEach((listener) => listener({ source: window, origin: location.origin, data, ...extra }));
  const send = (message, senderId = "collector-id") => {
    let response;
    runtimeListeners[0](message, { id: senderId }, (value) => { response = value; });
    return response;
  };
  return { messages, page, send, context, runtimeListeners };
}
const bridge = createBridge();
const transfer = { type: "quantgym:leetcode-history", transferId: "transfer-1", payload: full.result.payload };
assert.equal(bridge.send(transfer).status, "queued");
assert.equal(bridge.messages.at(-1).message.type, "quantgym:leetcode-awaiting");
bridge.page({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ready" }, { origin: "https://evil.test" });
assert.equal(bridge.messages.filter((m) => m.message.type === transfer.type).length, 0);
bridge.page({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ready" });
assert.equal(bridge.messages.at(-1).message.transferId, "transfer-1");
assert.equal(bridge.messages.at(-1).message.payload.username, "funny-edisonuln");
bridge.page({ source: "quantgym-leetcode-page", type: "quantgym:leetcode-ack", transferId: "transfer-1" });
assert.equal(bridge.send({ type: "quantgym:leetcode-status", transferId: "transfer-1" }).status, "received");
const sentCount = bridge.messages.length;
assert.equal(bridge.send(transfer).status, "received");
assert.equal(bridge.messages.length, sentCount);
vm.runInContext(bridgeSource, bridge.context);
assert.equal(bridge.runtimeListeners.length, 1);
assert.equal(bridge.send({ ...transfer, transferId: "transfer-2" }, "other-extension").ok, false);
assert.equal(createBridge("https://evil.test/leetcode").send(transfer).ok, false);
assert.equal(createBridge("https://beta.quantgym.app/tools").send(transfer).ok, false);
assert.equal(createBridge("http://localhost:5176/leetcode").send(transfer).ok, true);
checks += 1;

console.log(JSON.stringify({ status: "pass", checks, source: fileURLToPath(new URL("../browser-extension/popup.js", import.meta.url)) }, null, 2));
