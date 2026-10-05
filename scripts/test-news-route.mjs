import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import test from "node:test";

// Run the actual server in an isolated project with no .env and an RSS fixture.
// The safe transport itself has a separate DNS/connection security test suite.
test("full proxy routes enforce news auth and contract while health and interview remain available", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quantgym-news-route-"));
  const proxy = path.join(directory, "llm-proxy");
  await fs.mkdir(proxy);
  for (const name of ["server.mjs", "news-service.mjs"]) await fs.copyFile(new URL(`../llm-proxy/${name}`, import.meta.url), path.join(proxy, name));
  const marker = path.join(directory, "rss-calls.txt");
  await fs.writeFile(path.join(proxy, "news-fetch.mjs"), `import fs from "node:fs/promises";
let calls = 0;
export async function fetchPublicRss(url, options) {
  if ("headers" in options || "authorization" in options) throw new Error("Credential forwarding");
  await fs.appendFile(${JSON.stringify(marker)}, "rss\\n");
  calls += 1;
  if (calls === 2) return "<item>".repeat(Math.floor(512 * 1024 / 6));
  if (calls === 3) return "<item>" + "<title>".repeat(70000) + "</item>";
  return '<rss><channel><item><title>İstanbul 中文 Jane Street market making &#999999999999999;</title><link>https://example.com/story</link><source>İstanbul News</source><description>Quant trading market news</description></item><item><title>Jane Street bad link</title><link>javascript:alert(1)</link></item></channel></rss>';
}`);
  const auth = http.createServer((req, res) => {
    assert.equal(req.url, "/api/account");
    res.writeHead(req.headers.authorization === "Bearer valid" ? 200 : 401);
    res.end("private account details");
  });
  auth.listen(0, "127.0.0.1"); await once(auth, "listening");
  const child = spawn(process.execPath, [path.join(proxy, "server.mjs")], {
    cwd: directory,
    env: { PORT: "0", LLM_PROXY_HOST: "127.0.0.1", LLM_AUTH_API_BASE: `http://127.0.0.1:${auth.address().port}/api`, OPENAI_API_KEY: "", NEWS_RSS_FEEDS: "https://example.com/rss", LLM_ALLOWED_ORIGINS: "http://fixture.test" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, "exit"); }
    auth.closeAllConnections(); await new Promise((resolve) => auth.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Proxy startup timed out: ${stderr}`)), 5000);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/LLM proxy listening on (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    child.once("exit", () => { clearTimeout(timeout); reject(new Error(`Proxy exited: ${stderr}`)); });
  });
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
  assert.equal((await fetch(`${base}/news`)).status, 401);
  await assert.rejects(fs.readFile(marker), { code: "ENOENT" });
  const headers = { Authorization: "Bearer valid", "Content-Type": "application/json", Origin: "http://fixture.test" };
  for (const body of ['{"feeds":["http://127.0.0.1/"]}', '{"query":"free form"}', '{']) {
    assert.equal((await fetch(`${base}/news`, { method: "POST", headers, body })).status, 400);
  }
  await assert.rejects(fs.readFile(marker), { code: "ENOENT" });
  const response = await fetch(`${base}/news`, { method: "POST", headers, body: '{"topic":"all","max":12}' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://fixture.test");
  const news = await response.json();
  assert.equal(news.items.length, 1);
  assert.equal(news.items[0].sourceUrl, "https://example.com/story");
  assert.ok(news.items[0].title.includes("\uFFFD"));
  assert.ok(news.items[0].title.startsWith("İstanbul 中文 Jane Street"));
  assert.equal(news.items[0].source, "İstanbul News");
  assert.equal((await fs.readFile(marker, "utf8")).trim(), "rss");
  // Near-limit malformed RSS must not monopolize the proxy event loop.
  for (const topic of ["quantFirms", "marketStructure"]) {
    const malformedRss = await fetch(`${base}/news?topic=${topic}`, { headers, signal: AbortSignal.timeout(2000) });
    assert.equal(malformedRss.status, 200);
    assert.equal((await malformedRss.json()).items.length, 0);
  }
  assert.equal((await fetch(`${base}/interview`, { method: "POST", headers, body: "{}" })).status, 500);
  const malformedStatus = await new Promise((resolve, reject) => {
    const req = http.request(base, { path: "//[", headers: { Host: "[" } }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
    req.on("error", reject); req.end();
  });
  assert.equal(malformedStatus, 400);
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
  assert.equal(stderr, "");
});
