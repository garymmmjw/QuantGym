import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Use a public production build (for example `vite preview --port 5178`).
// Licensed question content is read from a local path and returned only to
// this isolated browser's mocked API; it is never written into the build.
const base = new URL(process.env.QA_URL || 'http://127.0.0.1:5178').origin;
assert.ok(process.env.PRIVATE_CATALOG, 'Set PRIVATE_CATALOG to a local problem-catalog.json path');
const payload = JSON.parse(await fs.readFile(process.env.PRIVATE_CATALOG, 'utf8'));
const catalog = Array.isArray(payload) ? payload : payload.problems;
assert.ok(Array.isArray(catalog), 'PRIVATE_CATALOG must contain a problem array');
const banks = {
  purple: 'question-bank', quantguide: 'quantguide', xiaohongshu: 'interview-xiaohongshu',
  onepoint3acres: 'interview-onepoint3acres', glassdoor: 'interview-glassdoor'
};
const expected = Object.fromEntries(Object.entries(banks).map(([id, source]) => [id, catalog.filter(problem => problem.source === source).length]));
assert.deepEqual(expected, { purple: 140, quantguide: 1201, xiaohongshu: 878, onepoint3acres: 618, glassdoor: 316 });
const output = new URL('../artifacts/authenticated-catalog/', import.meta.url);
await fs.mkdir(output, { recursive: true });

const account = {
  id: 'local:authenticated-catalog-browser-qa', provider: 'local', cloudLinked: true,
  name: 'Catalog Browser QA', email: 'catalog-browser-qa@quantgym.local', country: 'china',
  region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-20T00:00:00Z'
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
const startedAt = Date.now();
const report = { status: 'running', base, expected, requests: [], blockedWrites: [], runtimeErrors: [], screenshots: [] };
let releaseCatalog;
const catalogGate = new Promise(resolve => { releaseCatalog = resolve; });
await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  // Never transmit writes, synthetic credentials, or user-state payloads to a server.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    report.blockedWrites.push({ method, path: url.pathname });
    return route.abort();
  }
  if (url.pathname.startsWith('/api/')) {
    report.requests.push({ method, path: url.pathname, atMs: Date.now() - startedAt });
    let result = {};
    if (url.pathname === '/api/problems') {
      await catalogGate;
      result = { problems: catalog };
    } else if (url.pathname === '/api/account') result = { account };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
  }
  return route.continue();
});
await context.addInitScript(({ account, base }) => {
  localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint: `${base}/api`, userId: account.id, token: 'isolated-fixture-not-a-real-credential' }));
  localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
  localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
}, { account, base });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => report.runtimeErrors.push(error.message));
const cardCounts = () => page.locator('[data-bank-card]').evaluateAll(cards => Object.fromEntries(cards.map(card => [
  card.dataset.bankCard, Number(card.querySelector('[data-bank-count]')?.textContent.replace(/,/g, '') || 0)
])));
const screenshot = async name => {
  await page.screenshot({ path: new URL(name, output).pathname, fullPage: true });
  report.screenshots.push(name);
};

try {
  await page.goto(`${base}/problems`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-bank-card="purple"]').waitFor();
  report.initialCounts = await cardCounts();
  assert.deepEqual(report.initialCounts, Object.fromEntries(Object.keys(banks).map(id => [id, 0])), 'The public static catalog must not contain these private banks');
  report.initialVisibleAtMs = Date.now() - startedAt;
  report.staticCatalogCount = await page.evaluate(() => window.quantProblemCatalog?.length || 0);
  assert.ok(report.requests.some(request => request.method === 'GET' && request.path === '/api/problems'), 'Authentication must request the catalog through the real runtime wiring');
  await screenshot('before-api-response.png');

  // Release only after React has visibly committed the empty five-bank page.
  // No click, navigation, reload, or direct state injection can cause a rerender.
  report.apiReleasedAtMs = Date.now() - startedAt;
  releaseCatalog();
  await page.waitForFunction(expected => Object.entries(expected).every(([id, count]) => {
    const text = document.querySelector(`[data-bank-card="${id}"] [data-bank-count]`)?.textContent || '';
    return Number(text.replace(/,/g, '')) === count;
  }), expected, { timeout: 15000 });
  report.updatedAtMs = Date.now() - startedAt;
  report.finalCounts = await cardCounts();
  assert.deepEqual(report.finalCounts, expected);
  assert.deepEqual(report.runtimeErrors, []);
  report.staticCatalogCountAfter = await page.evaluate(() => window.quantProblemCatalog?.length || 0);
  assert.equal(report.staticCatalogCountAfter, report.staticCatalogCount, 'The static catalog must remain untouched');
  await screenshot('after-api-response.png');
  report.status = 'pass';
} catch (error) {
  report.status = 'fail';
  report.error = error.message;
  report.url = page.url();
  report.finalCounts = await cardCounts().catch(() => null);
  await screenshot('failure.png').catch(() => {});
  process.exitCode = 1;
} finally {
  releaseCatalog();
  await fs.writeFile(new URL('summary.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}
