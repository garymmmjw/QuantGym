import test from "node:test";
import assert from "node:assert/strict";
import { createLeetCodeClient } from "../src/features/leetcode/leetcodeClient.js";
import { EMPTY_LEETCODE, drawReviewProblem, normalizeProfile, prepareHistory, problemUrl, reviewPool } from "../src/features/leetcode/leetcodeModel.js";
import { buildOverviewActivity } from "../src/features/overview/activityMetrics.js";
import { buildActivityChart } from "../src/features/overview/activityChartModel.js";

const linked = (username) => ({ ...EMPTY_LEETCODE, connection: { username, lastSyncedAt: new Date().toISOString() }, stats: { solved: 1 }, problems: [{ slug: "two-sum", title: "Two Sum" }] });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; };

test("verified account submissions stay separate from imported history and clear on disconnect", async () => {
  const imported = { id: "import-1", problemSlug: "two-sum", status: "AC", submittedAt: "2026-09-14T12:00:00Z" };
  const synced = { ...imported, id: "sync-1", problemSlug: "valid-parentheses" };
  let payload = { ...linked("fixture-profile"), submissions: [imported] };
  delete payload.syncedSubmissions;
  const client = createLeetCodeClient({ endpoint: "https://api.example.test/api", token: "fixture", fetchImpl: async () => response(payload) });
  await client.reload();
  assert.deepEqual(client.getSnapshot().data.syncedSubmissions, []);
  assert.deepEqual(client.getSnapshot().data.importedSubmissions, []);
  assert.deepEqual(client.getSnapshot().data.submissions, [imported]);
  payload = { ...payload, syncedSubmissions: [synced], importedSubmissions: [imported] };
  await client.sync();
  assert.deepEqual(client.getSnapshot().data.syncedSubmissions, [synced]);
  assert.deepEqual(client.getSnapshot().data.importedSubmissions, [imported]);
  payload = { ...EMPTY_LEETCODE, syncedSubmissions: [synced], importedSubmissions: [imported] };
  await client.disconnect();
  assert.deepEqual(client.getSnapshot().data.syncedSubmissions, []);
  assert.deepEqual(client.getSnapshot().data.importedSubmissions, []);
});

test('history coverage survives sanitization without forwarding extra fields', () => {
  const base = { username: 'fixture-profile', problems: [{ slug: 'two-sum' }],
    submissions: [{ id: '1', problemSlug: 'two-sum', submittedAt: '2026-09-11T12:00:00Z', status: 'AC' }] };
  const coverage = { problemsComplete: true, submissionsComplete: true, complete: true, skippedRecords: 0, reason: '' };
  const payload = prepareHistory({ ...base, capturedAt: '2026-09-12T12:00:00Z', coverage: { ...coverage, cookie: 'discard' } });
  assert.deepEqual(payload.coverage, coverage);
  assert.equal(payload.capturedAt, '2026-09-12T12:00:00Z');
  assert.equal(JSON.stringify(payload).includes('discard'), false);
  assert.equal(prepareHistory(base).coverage, undefined);
  for (const invalid of [{ complete: 'yes' }, { submissionsComplete: false }, { skippedRecords: 1 }, { reason: 'partial' }, { skippedRecords: -1 }]) {
    assert.throws(() => prepareHistory({ ...base, capturedAt: '2026-09-12T12:00:00Z', coverage: { ...coverage, ...invalid } }), /invalid_import/);
  }
  for (const capturedAt of ['2026-09-12', '2026-02-30T12:00:00Z', 'invalid']) {
    assert.throws(() => prepareHistory({ ...base, capturedAt, coverage }), /invalid_import/);
  }
});

test('private first-solve bounds remain optional, validated, and cleared when disconnected', async () => {
  const valid = { problemSlug: 'two-sum', after: '2026-09-01T00:00:00Z', by: '2026-09-20T10:00:00+08:00' };
  let payload = { ...linked('fixture') };
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', fetchImpl: async () => response(payload) });
  await client.reload();
  assert.deepEqual(client.getSnapshot().data.personalFirstSolveBounds, []);
  payload = { ...payload, personalFirstSolveBounds: [valid] };
  await client.reload();
  const preserved = client.getSnapshot().data;
  assert.deepEqual(preserved.personalFirstSolveBounds, [valid]);
  for (const bounds of [null, {}, [null], [{ ...valid, problemSlug: '../account' }], [{ ...valid, after: '2026-09-01' }],
    [{ ...valid, after: '2026-02-30T00:00:00Z' }], [{ ...valid, after: '2026-09-01T24:00:00Z' }],
    [{ ...valid, after: valid.by }], [{ ...valid, after: '2026-09-21T00:00:00Z' }]]) {
    payload = { ...payload, personalFirstSolveBounds: bounds };
    assert.equal(await client.reload(), null);
    assert.equal(client.getSnapshot().data, preserved, 'invalid proof must not replace the last good snapshot');
  }
  payload = { ...EMPTY_LEETCODE, personalFirstSolveBounds: [valid] };
  await client.disconnect();
  assert.deepEqual(client.getSnapshot().data.personalFirstSolveBounds, []);
});

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

test('automatic sync starts at exactly five minutes and treats missing or malformed sync times as stale', async () => {
  const clock = Date.parse('2026-09-20T12:00:00Z');
  for (const [lastSyncedAt, shouldSync] of [
    [new Date(clock - 299999).toISOString(), false], [new Date(clock - 300000).toISOString(), true],
    [undefined, true], [null, true], ['', true], ['not-a-date', true],
  ]) {
    const calls = [];
    const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', now: () => clock,
      fetchImpl: async (url, options) => {
        calls.push(options.method);
        return response({ ...linked('fixture'), connection: { username: 'fixture', lastSyncedAt } });
      } });
    await client.wake();
    assert.deepEqual(calls, shouldSync ? ['GET', 'POST'] : ['GET'], `lastSyncedAt=${lastSyncedAt}`);
  }
});

test('concurrent automatic and manual refreshes share a pending sync instead of queuing duplicates', async () => {
  const get = deferred();
  const calls = [];
  const stale = { ...linked('fixture'), connection: { username: 'fixture', lastSyncedAt: '2026-09-01T00:00:00Z' } };
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', now: () => Date.parse('2026-09-20T00:00:00Z'),
    fetchImpl: async (url, options) => { calls.push(options.method); return options.method === 'GET' ? get.promise : response(stale); } });
  const automatic = client.wake();
  const duplicate = client.wake();
  const manual = client.sync();
  const secondManual = client.sync();
  get.resolve(response(stale));
  await Promise.all([automatic, duplicate, manual, secondManual]);
  assert.deepEqual(calls, ['GET', 'POST']);
  assert.equal(client.getSnapshot().phase, 'ready');
});

test('a failed upstream sync retry actually retries POST and retains the last good records on another failure', async () => {
  const calls = [];
  let syncFailure = true;
  const saved = { ...linked('fixture'), connection: { username: 'fixture', lastSyncedAt: '2026-09-01T00:00:00Z' } };
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture',
    fetchImpl: async (url, options) => {
      calls.push(options.method);
      return options.method === 'POST' && syncFailure ? response({ error: 'unavailable' }, 502)
        : response(options.method === 'POST' ? { ...saved, stats: { solved: 2 } } : saved);
    } });
  await client.wake();
  await client.retry();
  assert.deepEqual(calls, ['GET', 'POST', 'POST']);
  assert.equal(client.getSnapshot().phase, 'error');
  assert.equal(client.getSnapshot().data.stats.solved, 1);
  syncFailure = false;
  await client.retry();
  assert.deepEqual(calls, ['GET', 'POST', 'POST', 'POST']);
  assert.equal(client.getSnapshot().phase, 'ready');
  assert.equal(client.getSnapshot().data.stats.solved, 2);
});

test('GET failures only retry GET, unconnected accounts never auto-sync, and failed wakes share the throttle', async () => {
  let clock = 0;
  let fail = true;
  const calls = [];
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', now: () => clock,
    fetchImpl: async (url, options) => { calls.push(options.method); return fail ? response({ error: 'unavailable' }, 503) : response(EMPTY_LEETCODE); } });
  await client.wake();
  await client.wake();
  clock = 29999;
  await client.wake();
  assert.deepEqual(calls, ['GET']);
  clock = 30000;
  await client.wake();
  assert.deepEqual(calls, ['GET', 'GET']);
  fail = false;
  await client.retry();
  assert.deepEqual(calls, ['GET', 'GET', 'GET']);
  assert.equal(client.getSnapshot().data.connection, null);
  clock += 60000;
  await client.wake();
  assert.deepEqual(calls, ['GET', 'GET', 'GET', 'GET']);

  let failRead = false;
  const linkedCalls = [];
  const linkedClient = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture',
    fetchImpl: async (url, options) => {
      linkedCalls.push(options.method);
      return failRead ? response({ error: 'unavailable' }, 502) : response({ ...linked('fixture'), connection: { username: 'fixture', lastSyncedAt: '' } });
    } });
  await linkedClient.reload();
  failRead = true;
  await linkedClient.reload();
  failRead = false;
  await linkedClient.retry();
  assert.deepEqual(linkedCalls, ['GET', 'GET', 'GET'], 'retrying a failed read must not become an upstream write');
});

test('shared visible lifecycle handles pageshow, visibility, focus, online and minute checks with complete cleanup', async () => {
  class WindowEvents extends EventTarget {
    timers = new Map();
    nextTimer = 0;
    setInterval(callback, delay) { const id = ++this.nextTimer; this.timers.set(id, { callback, delay }); return id; }
    clearInterval(id) { this.timers.delete(id); }
    tick() { for (const timer of this.timers.values()) timer.callback(); }
  }
  const eventTarget = new WindowEvents();
  const visibilityTarget = new EventTarget();
  visibilityTarget.visibilityState = 'hidden';
  let clock = Date.parse('2026-09-20T12:00:00Z');
  let syncedAt = clock - 300000;
  const calls = [];
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', eventTarget, visibilityTarget, now: () => clock,
    fetchImpl: async (url, options) => {
      calls.push(options.method);
      if (options.method === 'POST') syncedAt = clock;
      return response({ ...linked('fixture'), connection: { username: 'fixture', lastSyncedAt: new Date(syncedAt).toISOString() } });
    } });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const first = client.retain();
  const second = client.retain();
  assert.equal(eventTarget.timers.size, 1);
  assert.equal([...eventTarget.timers.values()][0].delay, 60000);
  for (const event of ['focus', 'online', 'pageshow']) eventTarget.dispatchEvent(new Event(event));
  eventTarget.tick();
  await flush();
  assert.deepEqual(calls, [], 'a hidden document must not refresh');
  visibilityTarget.visibilityState = 'visible';
  visibilityTarget.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.deepEqual(calls, ['GET', 'POST']);
  for (const event of ['focus', 'online', 'pageshow']) {
    clock += 30000;
    eventTarget.dispatchEvent(new Event(event));
    visibilityTarget.dispatchEvent(new Event('visibilitychange'));
    await flush();
  }
  assert.deepEqual(calls, ['GET', 'POST', 'GET', 'GET', 'GET']);
  clock = syncedAt + 300000;
  eventTarget.tick();
  await flush();
  assert.deepEqual(calls.slice(-2), ['GET', 'POST']);
  first(); first();
  assert.equal(eventTarget.timers.size, 1);
  second();
  assert.equal(eventTarget.timers.size, 0);
  const stoppedCount = calls.length;
  clock += 30000;
  for (const event of ['focus', 'online', 'pageshow']) eventTarget.dispatchEvent(new Event(event));
  visibilityTarget.dispatchEvent(new Event('visibilitychange'));
  await flush();
  assert.equal(calls.length, stoppedCount);
  const restored = client.retain();
  await flush();
  assert.equal(calls.length, stoppedCount + 1, 'remounting resumes the lifecycle');
  restored();
});

test('a shared refreshed snapshot propagates new completions to Overview, Stage and the activity chart', async () => {
  const clock = Date.parse('2026-09-20T12:00:00Z');
  const submission = { id: 'new-ac', problemSlug: 'two-sum', status: 'AC', submittedAt: '2026-09-20T11:00:00Z' };
  const baseline = { ...EMPTY_LEETCODE, connection: { username: 'fixture', site: 'cn', lastSyncedAt: '2026-09-19T12:00:00Z' }, stats: { solved: 0 }, syncedLifetimeSolvedCount: 0 };
  const refreshed = { ...baseline, connection: { ...baseline.connection, lastSyncedAt: new Date(clock).toISOString() },
    stats: { solved: 1 }, syncedLifetimeSolvedCount: 1, syncedSubmissions: [submission] };
  const client = createLeetCodeClient({ endpoint: 'https://fixture.test/api', token: 'fixture', now: () => clock,
    fetchImpl: async (url, options) => response(options.method === 'POST' ? refreshed : baseline) });
  const observed = [];
  const unsubscribe = client.subscribe(() => {
    if (client.getSnapshot().phase !== 'ready') return;
    const activity = buildOverviewActivity({ leetcodeSnapshot: client.getSnapshot().data,
      stages: [{ id: 'stage-1', label: 'Stage 1', recordedDate: '2026-09-19' }] }, { now: clock, today: '2026-09-20', timeZone: 'UTC' });
    observed.push({ total: activity.totals.leetcode, stage: activity.stageRows[0].leetcode,
      chart: buildActivityChart(activity.recordBundle, { month: '2026-09', today: '2026-09-20' }).totals.leetcode });
  });
  await client.wake();
  unsubscribe();
  assert.deepEqual(observed, [{ total: 0, stage: 0, chart: 0 }, { total: 1, stage: 1, chart: 1 }]);
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
