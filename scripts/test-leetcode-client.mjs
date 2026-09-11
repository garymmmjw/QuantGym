import test from "node:test";
import assert from "node:assert/strict";
import { createLeetCodeClient } from "../src/features/leetcode/leetcodeClient.js";
import { EMPTY_LEETCODE, drawReviewProblem, normalizeProfile, prepareHistory, problemUrl, reviewPool } from "../src/features/leetcode/leetcodeModel.js";

const linked = (username) => ({ ...EMPTY_LEETCODE, connection: { username, lastSyncedAt: new Date().toISOString() }, stats: { solved: 1 }, problems: [{ slug: "two-sum", title: "Two Sum" }] });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; };

test("each cloud account keeps its own cached snapshot and sends only its own bearer token", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return response(linked(options.headers.Authorization)); };
  const first = createLeetCodeClient({ endpoint: "https://api.example.test/api/", token: "fixture-a", fetchImpl });
  const second = createLeetCodeClient({ endpoint: "https://api.example.test/api", token: "fixture-b", fetchImpl });
  await first.reload();
  assert.equal(second.getSnapshot().data.connection, null);
  await second.reload();
  assert.equal(first.getSnapshot().data.connection.username, "Bearer fixture-a");
  assert.equal(second.getSnapshot().data.connection.username, "Bearer fixture-b");
  assert.equal(calls[0].url, "https://api.example.test/api/leetcode");
  assert.equal(calls[0].options.cache, "no-store");
});

test("initial GET finishes before a connection write and cannot replace its newer result", async () => {
  const get = deferred();
  const methods = [];
  const client = createLeetCodeClient({ endpoint: "https://api.example.test/api", token: "fixture", fetchImpl: async (url, options) => {
    methods.push(options.method);
    if (options.method === "GET") return get.promise;
    return response(linked(JSON.parse(options.body).username));
  } });
  const loading = client.reload();
  const connecting = client.connect("next-profile");
  assert.deepEqual(methods, ["GET"]);
  get.resolve(response(EMPTY_LEETCODE));
  await Promise.all([loading, connecting]);
  assert.deepEqual(methods, ["GET", "POST"]);
  assert.equal(client.getSnapshot().data.connection.username, "next-profile");
});

test("upstream failure preserves last good stats; successful disconnect clears cached data", async () => {
  const client = createLeetCodeClient({ endpoint: "https://api.example.test/api", token: "fixture", fetchImpl: async (url, options) => {
    if (options.method === "DELETE") return response(EMPTY_LEETCODE);
    if (url.endsWith("/sync")) return response({ error: "unavailable" }, 502);
    return response(linked("fixture-profile"));
  } });
  await client.reload();
  assert.equal(await client.sync(), null);
  assert.equal(client.getSnapshot().error.status, 502);
  assert.equal(client.getSnapshot().data.stats.solved, 1);
  await client.disconnect();
  assert.equal(client.getSnapshot().data.connection, null);
  assert.deepEqual(client.getSnapshot().data.problems, []);
});

test("automatic wake only refreshes linked stale snapshots and is throttled between visits", async () => {
  let count = 0;
  let clock = Date.now();
  const client = createLeetCodeClient({ endpoint: "https://api.example.test/api", token: "fixture", now: () => clock, fetchImpl: async () => { count++; return response(EMPTY_LEETCODE); } });
  await client.wake(); await client.wake();
  assert.equal(count, 1);
  clock += 31000;
  await client.wake();
  assert.equal(count, 2);
});

test("profile links and problem destinations reject arbitrary hosts and retain CN slugs", () => {
  assert.equal(normalizeProfile("https://leetcode.cn/u/my-profile/"), "my-profile");
  for (const value of ["https://leetcode.cn.evil.test/u/me/", "http://leetcode.cn/u/me/", "https://x@leetcode.cn/u/me/", "javascript:alert(1)"]) assert.equal(normalizeProfile(value), "");
  assert.equal(problemUrl("c32eOV"), "https://leetcode.cn/problems/c32eOV/");
  for (const value of ["../settings", "//evil.test", "foo?token=bar", "x#h", "a/b"]) assert.equal(problemUrl(value), "");
});

test("random review deduplicates, follows filters, avoids immediate repeats and handles empty/one-item pools", () => {
  const problems = [{ slug: "two-sum", difficulty: 1 }, { slug: "two-sum", difficulty: 1 }, { slug: "valid-parentheses", title: "Valid Parentheses", difficulty: 1 }, { slug: "median", difficulty: 3 }];
  assert.equal(reviewPool(problems).length, 3);
  assert.equal(reviewPool(problems, "1", "parentheses").length, 1);
  assert.equal(drawReviewProblem(problems, "two-sum", () => 0).slug, "valid-parentheses");
  assert.equal(drawReviewProblem([], "", () => 0), null);
  assert.equal(drawReviewProblem([problems[0]], "two-sum").slug, "two-sum");
});

test("history import sends metadata scalars only, validates identity and rejects invalid nested values", () => {
  const payload = { username: "fixture-profile", site: "cn", cookie: "discard", problems: [{ slug: "c32eOV", title: "题目", frontendId: "面试题 01.01", difficulty: "Easy", code: "discard" }], submissions: [{ id: 123, problemSlug: "c32eOV", submittedAt: "2026-09-01T12:00:00Z", status: "AC", code: "discard" }] };
  const clean = prepareHistory(payload);
  assert.equal(clean.problems[0].difficulty, 1);
  assert.equal(clean.problems[0].frontendId, "面试题 01.01");
  assert.equal(JSON.stringify(clean).includes("discard"), false);
  for (const title of [{ cookie: "private" }, ["code"], true]) {
    assert.throws(() => prepareHistory({ ...payload, problems: [{ ...payload.problems[0], title }] }));
  }
  assert.throws(() => prepareHistory({ ...payload, username: {} }));
  assert.throws(() => prepareHistory({ ...payload, problems: [], submissions: [] }));
  assert.throws(() => prepareHistory({ ...payload, submissions: [{ ...payload.submissions[0], status: "WA" }] }));
});
