// Disposable local account API + browser; RSS responses are intercepted fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'qg-news-browser-'));
const output = path.join(root, 'artifacts/news-security-browser');
await fs.mkdir(output, { recursive: true });
const probe = net.createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const apiOrigin = `http://127.0.0.1:${port}`;
const endpoint = `${apiOrigin}/api`;
const newsOrigin = 'https://news-fixture.example';
const newsEndpoint = `${newsOrigin}/news`;
const story = {
  id: 'fixture-news-security', title: 'Jane Street market making browser fixture',
  titleZh: 'Jane Street 做市新闻测试', source: 'Fixture News', sourceType: 'news',
  sourceUrl: 'https://example.com/quant-news-fixture',
  publishedAt: '2099-01-01T00:00:00Z', summary: 'A disposable story for news refresh checks.',
  tags: ['Jane Street', 'market making'], skills: ['market']
};
await fs.writeFile(path.join(temporary, 'catalog.json'), '[]');
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('QUANTGYM_') && key !== 'DATABASE_URL'));
Object.assign(environment, {
  PYTHONDONTWRITEBYTECODE: '1', QUANTGYM_HOST: '127.0.0.1', PORT: String(port),
  QUANTGYM_DB: path.join(temporary, 'fixture.sqlite'), QUANTGYM_DB_BACKEND: 'sqlite',
  QUANTGYM_PROBLEM_CATALOG: path.join(temporary, 'catalog.json'),
  QUANTGYM_JOBS_CATALOG: path.join(temporary, 'catalog.json'),
  QUANTGYM_MEDIA_ROOT: path.join(temporary, 'media'),
  QUANTGYM_REQUIRE_EMAIL_VERIFICATION: '0', QUANTGYM_REQUIRE_INVITE_CODE: '0'
});
let serverLog = '';
const api = spawn(process.env.QUANTGYM_TEST_PYTHON || 'python3', ['api-server/server.py'], {
  cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe']
});
api.stdout.on('data', value => { serverLog += value; });
api.stderr.on('data', value => { serverLog += value; });
let vite, browser, page;
const checks = [], errors = [], newsRequests = [];
let newsStatus = 200;
const request = async (route, options = {}) => {
  const response = await fetch(`${endpoint}${route}`, {
    method: options.body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const payload = await response.json();
  assert.ok(response.ok, `${route}: ${response.status}`);
  return payload;
};
const check = async (name, action) => { await action(); checks.push(name); console.log(`PASS ${name}`); };
try {
  for (let attempt = 0; ; attempt++) {
    try { await request('/health'); break; }
    catch (error) {
      if (attempt >= 100 || api.exitCode !== null) throw new Error(`Fixture API did not start: ${serverLog}`, { cause: error });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const session = await request('/auth/register', { body: {
    password: 'NewsBrowserFixture1234', account: { name: 'News fixture', email: 'news@example.invalid', provider: 'local' }
  } });
  const account = { ...session.account, cloudLinked: true, emailVerified: true };
  vite = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === base && url.pathname === '/config.js') return route.fulfill({
      contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, llmEndpoint: `${newsOrigin}/interview`, googleLoginEnabled: false })};`
    });
    if (url.origin === newsOrigin && url.pathname === '/news') {
      const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const sent = req.postDataJSON();
      const authorization = await req.headerValue('authorization');
      newsRequests.push({ sent, authenticated: authorization === `Bearer ${session.token}` });
      if (newsStatus === 0) return route.abort('failed');
      return route.fulfill({ status: newsStatus, headers, contentType: 'application/json', body: JSON.stringify(newsStatus === 200
        ? { fetchedAt: new Date().toISOString(), count: 1, items: [story], sources: ['Fixture News'], errors: [] }
        : { error: 'Fixture unavailable' }) });
    }
    if (url.origin === base || url.origin === apiOrigin) return route.continue();
    return route.abort();
  });
  await context.addInitScript(({ account, endpoint, token }) => {
    if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token, userId: account.id }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  }, { account, endpoint, token: session.token });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  const item = page.locator('[data-news-id="fixture-news-security"]');
  const status = page.locator('#newsUpdatedAt');
  const refresh = async () => {
    const response = page.waitForResponse(value => value.url() === newsEndpoint && value.request().method() === 'POST');
    await page.locator('#refreshNewsBtn').click();
    await response;
  };
  await page.goto(`${base}/news`);
  await page.locator('#refreshNewsBtn').waitFor();
  await check('authenticated refresh sends only topic/max and displays returned news', async () => {
    await refresh();
    await item.waitFor();
    assert.ok(newsRequests.length > 0);
    assert.ok(newsRequests.every(value => value.authenticated));
    assert.deepEqual(Object.keys(newsRequests[0].sent).sort(), ['max', 'topic']);
    assert.equal(newsRequests[0].sent.topic, 'all');
    await page.screenshot({ path: path.join(output, 'desktop-news.png'), animations: 'disabled' });
  });
  await check('topic filtering requests the selected server-defined topic', async () => {
    await page.locator('[data-news-topic="quantFirms"]').click();
    await refresh();
    assert.equal(newsRequests.at(-1).sent.topic, 'quantFirms');
    await item.waitFor();
  });
  for (const [code, message] of [[401, '请重新登录后刷新新闻'], [429, '刷新过于频繁'], [503, '新闻暂时无法刷新']]) {
    await check(`${code} shows useful feedback and preserves saved stories`, async () => {
      newsStatus = code;
      await refresh();
      await status.filter({ hasText: message }).waitFor();
      const box = await status.boundingBox();
      assert.ok(box && box.width > 20 && box.height > 20, 'Failure feedback must be visibly rendered, not clipped to a screen-reader-only node');
      assert.equal(await status.evaluate(element => getComputedStyle(element).clip), 'auto');
      assert.equal(await item.count(), 1);
    });
  }
  await check('mobile error message and saved news fit the viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await status.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await item.count(), 1);
    await page.screenshot({ path: path.join(output, 'mobile-news-error.png'), animations: 'disabled' });
  });
  await check('a successful retry clears the error without duplicating saved news', async () => {
    newsStatus = 200;
    await refresh();
    await status.filter({ hasText: 'API' }).waitFor();
    assert.equal(await item.count(), 1);
    assert.doesNotMatch(await status.textContent(), /暂时无法|过于频繁|重新登录/);
    assert.equal(await status.evaluate(element => element.classList.contains('has-sync-error')), false);
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify({ checks, errors, requests: newsRequests, backend: 'disposable SQLite account API; intercepted RSS responses', externalWrites: false }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message, errors, newsRequests }));
  if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await vite?.close();
  if (api.exitCode === null) {
    const exited = once(api, 'exit');
    api.kill('SIGTERM');
    const forceStop = setTimeout(() => api.kill('SIGKILL'), 2000);
    await exited;
    clearTimeout(forceStop);
  }
  await fs.writeFile(path.join(output, 'api-fixture.log'), serverLog);
  await fs.rm(temporary, { recursive: true, force: true });
}
