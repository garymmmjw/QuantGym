import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Use a public production build (for example `vite preview --port 5178`).
// Licensed question content is read from a local path and returned only to
// this isolated browser's mocked API; it is never written into the build.
const base = new URL(process.env.QA_URL || 'http://127.0.0.1:5178').origin;
const legacyCache = process.argv.includes('--legacy-cache');
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
const retiredIds = ['quantguide-relatively-prime-coins', 'quantguide-always-profit-i', 'quantguide-points-on-a-circle-i'];
const activeId = catalog.find(problem => problem.source === 'quantguide').id;
assert.ok(retiredIds.every(id => !catalog.some(problem => problem.id === id)), 'Retired fixture IDs must be absent from the current catalog');
const historyIds = [activeId, ...retiredIds];
const legacyNote = id => `Synthetic migration note for ${id}`;
const recordedAt = '2026-09-01T12:01:00.000Z';
const historyRows = historyIds.map(problemId => ({
  problemId, note: legacyNote(problemId), favorite: true, completed: true, completedAt: recordedAt,
  interviewCount: 2, scoreHistory: [{ id: `score-${problemId}`, score: 81, createdAt: recordedAt }],
  freePracticeAttempts: [{ id: `attempt-${problemId}`, startedAt: '2026-09-01T12:00:00.000Z', recordedAt,
    updatedAt: recordedAt, outcome: 'correct', elapsedSeconds: 60, answerViewed: true, hintViewed: false }],
  lastPracticedAt: recordedAt, updatedAt: recordedAt
}));
// These are synthetic contents under the real catalog's stable IDs. The old
// normalizer incorrectly persisted this class of unowned rows as user content.
const legacyRows = [...catalog.filter(problem => problem.source === 'quantguide').map(problem => problem.id), ...retiredIds].map(id => ({
  id, source: 'quantguide', sourceType: 'platform', bookSlug: 'quantguide',
  quantguide: { id: `synthetic-upstream-${id}`, slug: id.replace(/^quantguide-/, '') },
  visibility: 'user', ownerUserId: '', titleEn: `Synthetic cached catalog row ${id}`,
  promptEn: 'Synthetic cache fixture: what is one plus one?', answer: 'Two.',
  category: 'probabilityExpectation', difficulty: 'Easy', createdAt: recordedAt, updatedAt: recordedAt
}));
const ownedRow = {
  id: 'user-authenticated-catalog-browser-qa', source: 'manual', sourceType: 'question-bank',
  visibility: 'user', ownerUserId: account.id, titleEn: 'Synthetic personal question',
  promptEn: 'Synthetic personal fixture: what is two plus two?', answer: 'Four.',
  category: 'probabilityExpectation', difficulty: 'Easy', createdAt: recordedAt, updatedAt: recordedAt
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
const startedAt = Date.now();
const report = { status: 'running', base, mode: legacyCache ? 'legacy-cache' : 'empty-cache', expected, requests: [], blockedWrites: [], runtimeErrors: [], screenshots: [] };
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
await context.addInitScript(({ account, base, legacyCache, legacyRows, historyRows, ownedRow }) => {
  localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint: `${base}/api`, userId: account.id, token: 'isolated-fixture-not-a-real-credential' }));
  localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
  localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  const stateKey = `quantMemoryBoard.userState.v1.${account.id}`;
  if (legacyCache && !localStorage.getItem(stateKey)) {
    localStorage.setItem(stateKey, JSON.stringify({ problems: [...legacyRows, ownedRow], problemStates: historyRows }));
    for (const row of historyRows) localStorage.setItem(`quantgym.problemNote.${row.problemId}`, row.note);
  }
}, { account, base, legacyCache, legacyRows, historyRows, ownedRow });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => report.runtimeErrors.push(error.message));
const cardCounts = () => page.locator('[data-bank-card]').evaluateAll(cards => Object.fromEntries(cards.map(card => [
  card.dataset.bankCard, Number(card.querySelector('[data-bank-count]')?.textContent.replace(/,/g, '') || 0)
])));
const screenshot = async name => {
  if (legacyCache) name = `legacy-${name}`;
  await page.screenshot({ path: new URL(name, output).pathname, fullPage: true });
  report.screenshots.push(name);
};

try {
  await page.goto(`${base}/problems`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-bank-card="purple"]').waitFor();
  report.initialCounts = await cardCounts();
  const initialExpected = Object.fromEntries(Object.keys(banks).map(id => [id, legacyCache && id === 'quantguide' ? 1204 : 0]));
  assert.deepEqual(report.initialCounts, initialExpected, 'The initial page must show only the seeded cache, before the authenticated response');
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
  if (legacyCache) {
    const readPersonal = () => page.evaluate(({ accountId, historyIds }) => {
      const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
      return {
        savedProblems: (state.problems || []).map(problem => ({ id: problem.id, source: problem.source, ownerUserId: problem.ownerUserId })),
        history: (state.problemStates || []).filter(row => historyIds.includes(row.problemId)),
        notes: Object.fromEntries(historyIds.map(id => [id, localStorage.getItem(`quantgym.problemNote.${id}`)]))
      };
    }, { accountId: account.id, historyIds });
    const checkPersonal = async () => {
      const personal = await readPersonal();
      assert.ok(personal.savedProblems.some(problem => problem.id === ownedRow.id && problem.ownerUserId === account.id), 'Genuine personal questions must remain saved');
      assert.ok(!personal.savedProblems.some(problem => legacyRows.some(row => row.id === problem.id)), 'Canonical unowned catalog copies must no longer be serialized as personal questions');
      for (const expectedRow of historyRows) {
        const actual = personal.history.find(row => row.problemId === expectedRow.problemId);
        assert.ok(actual, `History must survive for ${expectedRow.problemId}`);
        for (const field of ['note', 'favorite', 'completed', 'completedAt', 'interviewCount', 'scoreHistory', 'freePracticeAttempts', 'lastPracticedAt']) {
          assert.deepEqual(actual[field], expectedRow[field], `${expectedRow.problemId}: preserve ${field}`);
        }
        assert.equal(personal.notes[expectedRow.problemId], expectedRow.note);
      }
      return { personalQuestions: personal.savedProblems.map(problem => problem.id), historyIds: personal.history.map(row => row.problemId), preservedNotes: Object.keys(personal.notes).length };
    };
    report.migration = { retiredIds, preserved: await checkPersonal() };
    await page.goto(`${base}/problems?${new URLSearchParams({ bank: 'quantguide', question: activeId })}`);
    await page.locator('#problemDetail .qg-detail-notes').waitFor();
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), legacyNote(activeId));
    assert.equal(await page.locator('.qg-detail-bookmark.active').count(), 1);
    assert.equal((await page.locator('[data-free-practice-attempt-count]').textContent()).trim(), '1');
    for (const question of retiredIds) {
      await page.goto(`${base}/problems?${new URLSearchParams({ bank: 'quantguide', question })}`);
      await page.waitForFunction(() => Number(document.querySelector('.fp-header-stats strong')?.textContent.replace(/,/g, '')) === 1201);
      await page.getByRole('heading', { name: '暂时找不到这道题', exact: true }).waitFor();
      assert.equal(await page.locator('#problemDetail .qg-detail-title').count(), 0);
    }
    report.migration.afterReload = await checkPersonal();
    assert.deepEqual(report.runtimeErrors, []);
  }
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
  await fs.writeFile(new URL(legacyCache ? 'legacy-summary.json' : 'summary.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}
