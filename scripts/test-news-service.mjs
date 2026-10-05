import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import test from "node:test";
import { createNewsHandler, createNewsSessionAuthenticator, parseNewsRequest } from "../llm-proxy/news-service.mjs";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const item = (id = "1") => ({ id, title: `Jane Street trading ${id}`, sourceUrl: `https://example.com/${id}`, publishedAt: "2026-01-01T00:00:00.000Z" });
async function fixture(t, options = {}) {
  const calls = [];
  const handler = createNewsHandler({
    fetchRss: async (url, settings) => { calls.push({ url, settings }); return "rss"; },
    parseRssItems: () => [item()],
    feeds: "https://example.com/rss",
    ...options
  });
  const server = http.createServer((req, res) => handler(req, res, new URL(req.url, "http://fixture.invalid")));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  async function request(path = "/news", { body, method = "GET", headers = {} } = {}) {
    const response = await fetch(`${url}${path}`, { method, headers, ...(body !== undefined ? { body } : {}) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { url, server, calls, request };
}
function pendingFetch(aborts) {
  return (_url, { signal }) => new Promise((_resolve, reject) => {
    const cancel = () => { aborts.push(true); reject(signal.reason); };
    if (signal.aborted) cancel(); else signal.addEventListener("abort", cancel, { once: true });
  });
}
async function until(predicate) {
  for (let n = 0; n < 100; n += 1) { if (predicate()) return; await wait(5); }
  assert.fail("Timed out waiting for fixture state");
}

test("news request accepts only the bounded server topic API", () => {
  assert.deepEqual(parseNewsRequest({}, new URLSearchParams()), { topic: "all", max: 12 });
  assert.deepEqual(parseNewsRequest({ topic: "aiInfra", max: 30 }, new URLSearchParams()), { topic: "aiInfra", max: 30 });
  for (const payload of [null, [], "rss", { feeds: ["http://127.0.0.1"] }, { q: "hi" }, { query: "hi" }, { queries: [] }, { topic: "__proto__" }, { topic: null }, { max: null }, { max: 0 }, { max: 31 }, { max: 1.5 }, { max: true }, { max: "1junk" }]) {
    assert.throws(() => parseNewsRequest(payload, new URLSearchParams()), { status: 400 });
  }
  for (const query of ["feed=http://127.0.0.1", "feeds=x", "q=x", "query=x", "queries=x", "topic=all&topic=all", "max=1&max=2", "max=0", "max=9999999999"]) {
    assert.throws(() => parseNewsRequest({}, new URLSearchParams(query)), { status: 400 });
  }
  assert.throws(() => parseNewsRequest({ topic: "all" }, new URLSearchParams("topic=all")), { status: 400 });
});

test("HTTP news rejects dangerous inputs and malformed JSON without invoking RSS", async (t) => {
  const f = await fixture(t);
  for (const body of ['{"feeds":["http://127.0.0.1:9999"]}', '{"queries":["unbounded"]}', '{"max":999}', '{', 'null', '[]']) {
    assert.equal((await f.request("/news", { method: "POST", body })).status, 400);
  }
  assert.equal((await f.request("/news?feeds=https://example.com/rss")).status, 400);
  assert.equal((await f.request("/news", { method: "DELETE" })).status, 405);
  assert.equal(f.calls.length, 0);
});

test("body limit rejects declared and streamed overflows; slow bodies release admission", async (t) => {
  const f = await fixture(t, { limits: { maxBodyBytes: 80, bodyTimeoutMs: 35, requestConcurrency: 1 } });
  assert.equal((await f.request("/news", { method: "POST", body: "x".repeat(81) })).status, 413);
  const send = async (chunks, finish) => new Promise((resolve, reject) => {
    const req = http.request(`${f.url}/news`, { method: "POST", headers: { "Transfer-Encoding": "chunked" } }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
    req.on("error", reject);
    for (const chunk of chunks) req.write(chunk);
    if (finish) req.end();
  });
  assert.equal(await send(["x".repeat(41), "y".repeat(41)], true), 413);
  assert.equal(await send(['{"topic":'], false), 408);
  assert.equal((await f.request()).status, 200);
  assert.equal(f.calls.length, 1);
});

test("authenticated HTTP returns bounded news and does not pass credentials to transport", async (t) => {
  let auth = 0;
  const f = await fixture(t, {
    authenticate: async (req) => { assert.equal(req.headers.authorization, "Bearer valid"); auth += 1; },
    parseRssItems: () => [
      ...Array.from({ length: 70 }, (_, n) => ({ ...item(String(n)), title: "Jane Street ".repeat(100), summary: "x".repeat(10000), tags: Array(20).fill("x".repeat(1000)) })),
      { ...item("bad"), sourceUrl: "javascript:alert(1)" }
    ]
  });
  const result = await f.request("/news?max=2", { headers: { Authorization: "Bearer valid", Cookie: "secret=true" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.count, 2);
  assert.equal(result.body.items.length, 2);
  assert.equal(result.body.items[0].title.length, 320);
  assert.equal(result.body.items[0].summary.length, 600);
  assert.equal(result.body.items[0].tags.length, 5);
  assert.equal(result.body.items[0].tags[0].length, 120);
  assert.equal(auth, 1);
  assert.deepEqual(Object.keys(f.calls[0].settings).sort(), ["allowedHosts", "maxBytes", "maxRedirects", "signal", "timeoutMs"]);
  assert.deepEqual([...f.calls[0].settings.allowedHosts].sort(), ["example.com", "news.google.com"]);
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("news session validation preserves 401/403/503 and never follows redirects", async (t) => {
  const authServer = http.createServer((req, res) => {
    const token = req.headers.authorization;
    const status = token === "Bearer valid" ? 200 : token === "Bearer forbidden" ? 403 : token === "Bearer redirect" ? 302 : token === "Bearer failed" ? 500 : 401;
    res.writeHead(status, { Location: "http://127.0.0.1:1/must-not-request" });
    res.end("private account information");
  });
  authServer.listen(0, "127.0.0.1"); await once(authServer, "listening");
  t.after(() => { authServer.closeAllConnections(); return new Promise((resolve) => authServer.close(resolve)); });
  const f = await fixture(t, { authenticate: createNewsSessionAuthenticator(`http://127.0.0.1:${authServer.address().port}/api`) });
  for (const [token, expected] of [["", 401], ["bad", 401], ["expired", 401], ["forbidden", 403], ["redirect", 503], ["failed", 503], ["valid", 200]]) {
    const response = await f.request("/news", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    assert.equal(response.status, expected, token);
    assert.ok(!JSON.stringify(response.body).includes("private account information"));
  }
  assert.equal(f.calls.length, 1);
});

test("authentication disconnect cancels its fetch and frees the auth admission slot", async (t) => {
  let attempts = 0;
  let aborted = 0;
  const f = await fixture(t, { limits: { authConcurrency: 1 }, authenticate: createNewsSessionAuthenticator("https://auth.example/api", async (_url, { signal }) => {
    attempts += 1;
    if (attempts > 1) return new Response("ok");
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => { aborted += 1; reject(signal.reason); }, { once: true }));
  }) });
  const req = http.get(`${f.url}/news`, { headers: { Authorization: "Bearer first" } }); req.on("error", () => {});
  await until(() => attempts === 1);
  assert.equal((await f.request("/news", { headers: { Authorization: "Bearer second" } })).status, 503);
  req.destroy();
  await until(() => aborted === 1);
  assert.equal((await f.request("/news", { headers: { Authorization: "Bearer second" } })).status, 200);
});

test("coalesced topic fetch survives one subscriber disconnect and serves cached maxima", async (t) => {
  let resolveRss;
  let calls = 0;
  let aborted = false;
  const f = await fixture(t, { fetchRss: (_url, { signal }) => {
    calls += 1;
    signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    return new Promise((resolve) => { resolveRss = resolve; });
  }, parseRssItems: () => [item("1"), item("2"), item("3")] });
  const first = http.get(`${f.url}/news?max=1`); first.on("error", () => {});
  await until(() => calls === 1);
  const second = f.request("/news?max=2");
  await wait(25);
  first.destroy(); await wait(25);
  assert.equal(aborted, false);
  resolveRss("xml");
  assert.equal((await second).body.items.length, 2);
  assert.equal((await f.request("/news?max=3")).body.items.length, 3);
  assert.equal(calls, 1);
});

test("disconnect of all subscribers aborts upstream and does not cache cancellation", async (t) => {
  const aborts = [];
  let calls = 0;
  const f = await fixture(t, { fetchRss: (...args) => { calls += 1; return calls === 1 ? pendingFetch(aborts)(...args) : Promise.resolve("rss"); } });
  const req = http.get(`${f.url}/news`); req.on("error", () => {});
  await until(() => calls === 1);
  req.destroy();
  await until(() => aborts.length === 1);
  assert.equal((await f.request()).status, 200);
  assert.equal(calls, 2);
});

test("deadline aborts upstream, responds 503, and caches failure briefly", async (t) => {
  const aborts = [];
  let calls = 0;
  let time = 100000;
  const f = await fixture(t, { fetchRss: (...args) => { calls += 1; return pendingFetch(aborts)(...args); }, limits: { deadlineMs: 30, negativeCacheMs: 100 }, now: () => time });
  const result = await f.request();
  assert.equal(result.status, 503);
  assert.ok(Number(result.headers.get("retry-after")) > 0);
  assert.equal(aborts.length, 1);
  assert.equal((await f.request()).status, 503);
  assert.equal(calls, 1);
  time += 101;
  assert.equal((await f.request()).status, 503);
  assert.equal(calls, 2);
});

test("all failed sources are negatively cached across topics without leaking target details", async (t) => {
  let calls = 0;
  const f = await fixture(t, { fetchRss: async () => { calls += 1; throw new Error("Internal 169.254.169.254 secret"); } });
  const result = await f.request();
  assert.equal(result.status, 503);
  assert.equal((await f.request()).status, 503);
  assert.equal((await f.request("/news?topic=aiInfra")).status, 503);
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result.body).includes("169.254"));
});

test("partial feed failure keeps normal content and only returns sanitized errors", async (t) => {
  const f = await fixture(t, { feeds: "https://example.com/rss,https://other.example/rss", fetchRss: async (url) => {
    if (url.includes("other")) throw new Error("secret internal hostname");
    return "rss";
  } });
  const result = await f.request();
  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 1);
  assert.equal(result.body.errors.length, 1);
  assert.deepEqual(result.body.errors[0], { source: "Configured source 2", message: "News source is temporarily unavailable" });
});

test("global and session limits cannot be bypassed with spoofed forwarding headers", async (t) => {
  const f = await fixture(t, { limits: { sessionPerMinute: 2 } });
  assert.equal((await f.request()).status, 200);
  assert.equal((await f.request("/news", { headers: { "X-Forwarded-For": "1.2.3.4" } })).status, 200);
  const limited = await f.request("/news", { headers: { "X-Forwarded-For": "9.8.7.6" } });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  const g = await fixture(t, { authenticate: async () => {}, limits: { globalPerMinute: 2 } });
  for (const token of ["one", "two"]) assert.equal((await g.request("/news", { headers: { Authorization: `Bearer ${token}` } })).status, 200);
  assert.equal((await g.request("/news", { headers: { Authorization: "Bearer three" } })).status, 429);
});

test("session limiter caps identity storage and expires inactive buckets", async (t) => {
  let time = 100000;
  const f = await fixture(t, { authenticate: async () => {}, limits: { maxSessionBuckets: 1 }, now: () => time });
  assert.equal((await f.request("/news", { headers: { Authorization: "Bearer one" } })).status, 200);
  assert.equal((await f.request("/news", { headers: { Authorization: "Bearer two" } })).status, 429);
  time += 60001;
  assert.equal((await f.request("/news", { headers: { Authorization: "Bearer two" } })).status, 200);
});

test("aggregate RSS concurrency and request admission stay bounded across topics", async (t) => {
  let active = 0;
  let peak = 0;
  const f = await fixture(t, { feeds: "", limits: { sourceConcurrency: 3, fetchConcurrency: 2 }, fetchRss: async () => {
    active += 1; peak = Math.max(peak, active); await wait(8); active -= 1; return "rss";
  } });
  const results = await Promise.all(["all", "quantFirms", "marketStructure", "aiInfra", "recruiting"].map((topic) => f.request(`/news?topic=${topic}`)));
  assert.ok(results.every((result) => result.status === 200));
  assert.equal(peak, 2);
  const aborts = [];
  const g = await fixture(t, { limits: { requestConcurrency: 1, deadlineMs: 40 }, fetchRss: pendingFetch(aborts) });
  const first = g.request();
  await wait(10);
  assert.equal((await g.request("/news?topic=aiInfra")).status, 503);
  assert.equal((await first).status, 503);
});

test("invalid or excessive server feeds fail closed without transport calls", async (t) => {
  for (const feeds of ["http://example.com/rss", "https://user:password@example.com/rss", "https://example.com:444/rss", Array.from({ length: 9 }, (_, n) => `https://source${n}.example/rss`).join(",")]) {
    const f = await fixture(t, { feeds });
    assert.equal((await f.request()).status, 503);
    assert.equal(f.calls.length, 0);
  }
});


test("aggregate deadline preserves completed healthy sources and accounts for queued sources", async (t) => {
  const aborts = [];
  let calls = 0;
  const f = await fixture(t, {
    feeds: "https://healthy.example/rss,https://stalled.example/rss,https://queued.example/rss",
    limits: { deadlineMs: 30, sourceConcurrency: 1 },
    fetchRss: (url, options) => {
      calls += 1;
      return url.includes("healthy") ? Promise.resolve("rss") : pendingFetch(aborts)(url, options);
    }
  });
  const result = await f.request();
  assert.equal(result.status, 200);
  assert.equal(result.body.items[0].title, item().title);
  assert.equal(result.body.errors.length, 2);
  assert.equal(aborts.length, 1);
  assert.equal(calls, 2);
  assert.equal((await f.request()).body.items[0].title, item().title);
  assert.equal(calls, 2);
});


test("disconnect during a slow POST body releases request admission", async (t) => {
  const f = await fixture(t, { limits: { requestConcurrency: 1 } });
  const req = http.request(`${f.url}/news`, { method: "POST", headers: { "Transfer-Encoding": "chunked" } });
  req.on("error", () => {});
  req.write('{"topic":');
  await wait(20);
  req.destroy();
  await wait(20);
  assert.equal((await f.request()).status, 200);
});
