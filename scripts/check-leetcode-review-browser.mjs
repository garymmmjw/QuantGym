#!/usr/bin/env node
/** Isolated UI regression checks. All API traffic and external origins are fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { initialReview, reviewStatus } from '../src/features/leetcode/leetcodeReviewModel.js';
import { createPersonalState } from '../src/features/personal/personalStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'artifacts/leetcode-review');
fs.mkdirSync(output, { recursive: true });
const baseUrl = 'http://127.0.0.1:5211';
const endpoint = 'https://leetcode-review-fixture.invalid/api';
const now = Date.parse('2026-09-11T14:30:00.000Z');
const day = 86400000;
const iso = value => new Date(value).toISOString();
const clone = value => structuredClone(value);
const ownerId = 'local:leetcode-review-browser-fixture';
const account = { id: ownerId, provider: 'local', name: 'Review QA', cloudLinked: true, emailVerified: true, email: 'review-qa@example.invalid', country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: iso(now), passwordHash: 'fixture-device-hash-not-a-real-password' };

function problem(slug, title, frontendId, difficulty, dueOffset) {
  const row = { slug, title, titleEn: slug.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), frontendId: String(frontendId), difficulty, firstAcceptedAt: dueOffset == null ? null : iso(now - 8 * day), lastAcceptedAt: dueOffset == null ? null : iso(now - 4 * day), source: dueOffset == null ? 'import' : 'public' };
  row.review = dueOffset == null ? initialReview(row) : { ...initialReview(row), version: 2, source: 'review', anchorAt: row.lastAcceptedAt, lastReviewedAt: iso(now - 6 * day), nextReviewAt: iso(now + dueOffset), reviewCount: 2, intervalDays: 6, repetitions: 2, easeFactor: 2.5, lapses: 0, lastRating: 'good' };
  row.review.status = reviewStatus(row, now);
  return row;
}
function fixtureData(mode = 'connected', problemSlugs = null) {
  const data = {
    connection: { username: 'review-fixture-user', site: 'cn', displayName: 'Review Fixture', profileUrl: 'https://leetcode.cn/u/review-fixture-user/', linkedAt: '2026-09-01T00:00:00.000Z', lastSyncedAt: iso(now) },
    stats: { solved: 37, easy: 15, medium: 17, hard: 5, totalSubmissions: 127, acceptedSubmissions: 63 },
    submissions: [{ id: 'fixture-submission-1', problemSlug: 'two-sum', submittedAt: iso(now - 4 * day), status: 'AC' }],
    calendar: [{ date: '2026-09-07', count: 1, acceptedCount: 1, distinctSolved: 1 }],
    problems: [problem('future-problem', '未来复习题', 500, 3, 3 * day), problem('binary-tree-level-order-traversal', '二叉树的层序遍历', 102, 2, -day), problem('two-sum', '两数之和', 1, 1, -3 * day), problem('reverse-linked-list', '反转链表', 206, 1, -2 * day), problem('imported-without-date', '历史导入题', 999, null, null), ...Array.from({ length: 30 }, (_, index) => problem(`practice-${index + 1}`, `练习题 ${String(index + 1).padStart(2, '0')}`, 1001 + index, index % 3 + 1, index < 4 ? null : (index + 1) * day))],
    coverage: { problemPoolComplete: false, recentOnly: true },
    // Deliberately retain legacy schedules in data: the new UI must not expose them.
    reviewPolicy: { algorithm: 'sm2', version: 1, generatedAt: iso(now) },
    reviewBackpack: [],
  };
  if (problemSlugs) data.problems = data.problems.filter(row => problemSlugs.includes(row.slug));
  data.stats.solved = data.problems.length;
  for (const [difficulty, key] of [[1, 'easy'], [2, 'medium'], [3, 'hard']]) data.stats[key] = data.problems.filter(row => (row.difficulty || 1) === difficulty).length;
  data.submissions = data.problems.filter(row => row.lastAcceptedAt).map((row, index) => ({ id: `fixture-ac-${index}`, problemSlug: row.slug, submittedAt: row.lastAcceptedAt, status: 'AC' }));
  if (mode === 'empty' || mode === 'disconnected') {
    data.problems = []; data.submissions = []; data.calendar = [];
    data.stats = { solved: 0, easy: 0, medium: 0, hard: 0, totalSubmissions: 0 };
  }
  if (mode === 'disconnected') { data.connection = null; data.stats = null; }
  return data;
}
fs.writeFileSync(path.join(output, 'snapshot-fixture.json'), JSON.stringify(fixtureData(), null, 2) + '\n');
const summary = { startedAt: new Date().toISOString(), fixtureClock: iso(now), isolation: 'Fresh headless Chromium contexts; service workers blocked; every API and external request fulfilled locally.', checks: [], screenshots: [], runtimeErrors: [], unexpectedLocalResponses: [], interceptedExternalOrigins: [], contexts: [] };
const contexts = [];
let server;
let browser;
let currentPage;

async function makePage({ name = 'desktop', viewport = { width: 1440, height: 1000 }, mobile = false, dark = false, reducedMotion = 'no-preference', language = 'zh', mode = 'connected', problemSlugs = null } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: language === 'en' ? 'en-US' : 'zh-CN', timezoneId: 'America/Chicago', isMobile: mobile, hasTouch: mobile, colorScheme: dark ? 'dark' : 'light', reducedMotion, serviceWorkers: 'block' });
  contexts.push(context);
  const fixture = { data: fixtureData(mode, problemSlugs), requestLog: [], reviews: [], backpackRequests: [], backpackEvents: new Map(), failNextBackpack: false, clock: now, getCount: 0, personal: createPersonalState(), revision: 1 };
  const contextSummary = { name, reviewRequests: [], backpackRequests: fixture.backpackRequests, externalLinks: [], unrelatedMockWrites: [] };
  summary.contexts.push(contextSummary);
  await context.addInitScript(({ account, endpoint, now, dark, language }) => {
    if (!localStorage.getItem('quantMemoryBoard.auth.v1')) {
      localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date(now).toISOString() }));
      localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language, sidebarCollapsed: false }));
      localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: 'fixture-cloud-token-not-valid-anywhere', userId: account.id, lastSyncAt: new Date(now).toISOString(), lastError: '' }));
      localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
      localStorage.setItem('quantgym.ui.theme.v1', dark ? 'dark' : 'light');
    }
  }, { account, endpoint, now, dark, language });
  const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': baseUrl, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS' } });
  const lastAccepted = slug => fixture.data.submissions.filter(row => row.problemSlug === slug && row.status === 'AC'
    && Date.parse(row.submittedAt) <= fixture.clock).map(row => row.submittedAt).sort().at(-1) || null;
  const reconcile = () => {
    fixture.data.reviewBackpack = fixture.data.reviewBackpack.filter(entry => {
      const latest = lastAccepted(entry.problemSlug);
      return !(latest && latest >= entry.drawnAt && (!entry.baselineCompletedAt || latest > entry.baselineCompletedAt));
    });
    return fixture.data;
  };
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseUrl) {
      if (url.pathname === '/config.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, llmEndpoint: 'https://llm-review-fixture.invalid/interview', googleLoginEnabled: false })};` });
      return route.continue();
    }
    if (request.url().startsWith(endpoint)) {
      const requestPath = url.pathname.slice('/api'.length);
      const method = request.method();
      fixture.requestLog.push({ path: requestPath, method });
      if (method === 'OPTIONS') return fulfill(route, {});
      if (requestPath === '/leetcode' && method === 'GET') { fixture.getCount++; return fulfill(route, reconcile()); }
      if (requestPath === '/leetcode/backpack' && method === 'POST') {
        const body = request.postDataJSON();
        fixture.backpackRequests.push(clone(body));
        if (body.username !== fixture.data.connection?.username || body.linkedAt !== fixture.data.connection?.linkedAt) return fulfill(route, { error: 'connection_changed' }, 409);
        if (!fixture.data.problems.some(problem => problem.slug === body.problemSlug)) return fulfill(route, { error: 'unknown_problem' }, 404);
        const previous = fixture.backpackEvents.get(body.eventId);
        if (previous && JSON.stringify(previous) !== JSON.stringify(body)) return fulfill(route, { error: 'event_conflict' }, 409);
        if (fixture.failNextBackpack) { fixture.failNextBackpack = false; return fulfill(route, { error: 'fixture_save_failed' }, 503); }
        reconcile();
        if (!previous) {
          if (!fixture.data.reviewBackpack.some(entry => entry.problemSlug === body.problemSlug)) fixture.data.reviewBackpack.push({ problemSlug: body.problemSlug, drawnAt: iso(fixture.clock), baselineCompletedAt: lastAccepted(body.problemSlug) });
          fixture.backpackEvents.set(body.eventId, clone(body));
        }
        return fulfill(route, fixture.data);
      }
      if (requestPath === '/leetcode/review' && method === 'POST') {
        const body = request.postDataJSON();
        fixture.reviews.push(clone(body)); contextSummary.reviewRequests.push(clone(body));
        return fulfill(route, { error: 'The card-only UI must never save review feedback.' }, 400);
      }
      if (requestPath === '/leetcode/connect' && method === 'POST') {
        fixture.data = fixtureData('connected', problemSlugs);
        const username = request.postDataJSON().username;
        fixture.data.connection = { ...fixture.data.connection, username, profileUrl: `https://leetcode.cn/u/${username}/` };
        return fulfill(route, fixture.data);
      }
      if (requestPath === '/leetcode/sync') return fulfill(route, reconcile());
      if (!['GET', 'HEAD'].includes(method)) contextSummary.unrelatedMockWrites.push({ path: requestPath, method });
      if (requestPath === '/account') return fulfill(route, { account: { ...account, passwordHash: undefined } });
      if (requestPath === '/sync') return fulfill(route, { account: { ...account, passwordHash: undefined }, state: {}, problemStates: [], community: { posts: [] }, syncedAt: iso(now) });
      if (requestPath === '/personal-prep') {
        if (method === 'PUT') { fixture.personal = clone(request.postDataJSON().data); fixture.revision++; }
        return fulfill(route, { version: 1, revision: fixture.revision, data: fixture.personal, updatedAt: iso(now) });
      }
      return fulfill(route, { problems: [], jobs: [], news: [], leaderboard: [], profiles: [], community: { posts: [] }, state: {}, syncedAt: iso(now) });
    }
    if (url.hostname === 'leetcode.cn' && url.pathname.startsWith('/problems/')) {
      contextSummary.externalLinks.push(request.url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><title>Mock LeetCode problem</title><body><h1>Isolated LeetCode destination fixture</h1></body></html>' });
    }
    summary.interceptedExternalOrigins.push(url.origin);
    if (request.resourceType() === 'script') return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (request.resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return fulfill(route, {});
  });
  const page = await context.newPage(); currentPage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => summary.runtimeErrors.push({ context: name, error: error.message }));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) summary.unexpectedLocalResponses.push({ context: name, status: response.status(), url: response.url() }); });
  await page.clock.setFixedTime(new Date(now));
  await page.goto(`${baseUrl}/leetcode`, { waitUntil: 'domcontentloaded' });
  if (mode === 'disconnected') await page.locator('#lc-profile-url').waitFor();
  else {
    await page.locator('.lc-review-entry').waitFor();
    if (fixture.data.problems.length) await page.locator('.lc-library-list .lc-problem-row').first().waitFor();
  }
  return { page, fixture, context };
}
const selectedTitle = page => page.locator('.lc-revealed-card h3');
const rows = page => page.locator('.lc-library-list .lc-problem-row');
const difficultyFilter = page => page.locator('select.lc-difficulty-filter');
const row = (page, name) => rows(page).filter({ has: page.getByText(name, { exact: true }) });
async function assertNoScheduling(page) {
  assert.equal(await page.locator('[data-review-rating], .lc-recall, .lc-review-saved, .lc-problem-due, .lc-review-filters').count(), 0);
  assert.equal(await difficultyFilter(page).count(), 1, 'difficulty uses one native select');
  assert.doesNotMatch(await page.locator('.lc-page').textContent(), /待复习|逾期|未到期|待首次复习|复习安排|按到期复习|下次复习|复习已保存|回忆程度|SM-?2|Review schedule|Review next due|Next review|Recall rating|Upcoming|Overdue/);
}
async function capture(page, name, locator) {
  const file = `${name}.png`;
  if (locator) await locator.screenshot({ path: path.join(output, file), animations: 'disabled' });
  else await page.screenshot({ path: path.join(output, file), animations: 'disabled' });
  summary.screenshots.push(file);
}
async function check(name, action) {
  process.stdout.write(name + '\n');
  const details = await action();
  summary.checks.push({ name, status: 'passed', ...(details || {}) });
}
async function noOverflow(page) {
  const value = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(value.document <= value.viewport + 1, JSON.stringify(value));
  return value;
}
async function waitForDraw(page) {
  await selectedTitle(page).waitFor();
  await page.locator('.lc-card-draw[aria-busy="false"]').waitFor();
}
async function drawRandom(page, en = false) {
  await page.locator('.lc-review-entry').click();
  await page.locator('dialog.lc-draw-dialog[open]').waitFor();
  await waitForDraw(page);
  await page.getByRole('button', { name: en ? 'Keep this card' : '收好卡片', exact: true }).waitFor();
}
async function keepCard(page, en = false) {
  await page.getByRole('button', { name: en ? 'Keep this card' : '收好卡片', exact: true }).click();
  await page.locator('.lc-draw-dialog').waitFor({ state: 'detached' });
}
try {
  server = await createServer({ root, server: { host: '127.0.0.1', port: 5211, strictPort: true, open: false }, logLevel: 'error' });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
  const desktop = await makePage();
  const { page, fixture } = desktop;
  const originalRemote = clone(fixture.data);
  await check('The compact default view exposes one review entry and no permanent draw workspace', async () => {
    await assertNoScheduling(page);
    assert.equal(await page.locator('.lc-review-workspace, .lc-memory-review, .lc-card-draw, .lc-draw-dialog').count(), 0);
    assert.equal(await page.locator('.lc-review-entry').innerText(), '复习一下');
    assert.equal(await page.getByRole('combobox', { name: '按难度筛选', exact: true }).count(), 1);
    assert.deepEqual(await difficultyFilter(page).locator('option').evaluateAll(options => options.map(option => option.value)), ['all', '1', '2', '3']);
    assert.equal(await difficultyFilter(page).inputValue(), 'all');
    assert.equal(await page.locator('.lc-library table, .lc-library-tabs, .lc-row-review').count(), 0);
    await capture(page, 'desktop-overview');
  });
  await check('The whole problem row is a native external link for pointer and Enter, with no draw or API write', async () => {
    const search = page.getByLabel('搜索已通过题目', { exact: true });
    await search.fill('两数之和');
    const target = row(page, '两数之和');
    assert.equal(await target.evaluate(element => element.tagName), 'A');
    assert.equal(await target.getAttribute('href'), 'https://leetcode.cn/problems/two-sum/');
    assert.equal(await target.getAttribute('target'), '_blank');
    const rel = (await target.getAttribute('rel')).split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
    assert.equal(await target.locator('a, button').count(), 0, 'one link owns the complete row');
    const writesBefore = fixture.requestLog.filter(request => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method));
    for (const action of ['pointer', 'keyboard']) {
      const popupPromise = page.waitForEvent('popup');
      if (action === 'pointer') await target.locator('.lc-problem-id').click();
      else { await target.focus(); await page.keyboard.press('Enter'); }
      const popup = await popupPromise;
      await popup.waitForURL('https://leetcode.cn/problems/two-sum/', { waitUntil: 'domcontentloaded' });
      await popup.close();
    }
    assert.deepEqual(fixture.requestLog.filter(request => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)), writesBefore);
    assert.equal(fixture.backpackRequests.length, 0);
    assert.equal(await page.locator('.lc-draw-dialog').count(), 0);
    assert.deepEqual(fixture.data, originalRemote);
    await search.fill('');
  });
  await check('Opening the dialog draws and saves exactly one card, and reload restores its backpack entry', async () => {
    await drawRandom(page);
    const title = await selectedTitle(page).innerText();
    const selected = fixture.data.problems.find(problem => problem.title === title);
    assert.ok(selected);
    assert.equal(fixture.backpackRequests.length, 1);
    assert.equal(fixture.backpackRequests[0].problemSlug, selected.slug);
    assert.equal(fixture.data.reviewBackpack.length, 1);
    assert.deepEqual({ ...fixture.data, reviewBackpack: [] }, originalRemote, 'a draw changes only the backpack, never ACs, stats, or review schedules');
    const saved = clone(fixture.data.reviewBackpack);
    await capture(page, 'desktop-selected-card', page.locator('.lc-draw-dialog'));
    await keepCard(page);
    assert.equal(await page.locator('.lc-backpack-card').count(), 1);
    await page.getByLabel('搜索已通过题目', { exact: true }).fill(title);
    assert.equal(await row(page, title).getAttribute('href'), `https://leetcode.cn/problems/${selected.slug}/`);
    assert.equal(await row(page, title).locator('button').count(), 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.lc-backpack-card').waitFor();
    assert.deepEqual(fixture.data.reviewBackpack, saved);
    assert.equal(fixture.backpackRequests.length, 1, 'reload must not draw or write again');
    await assertNoScheduling(page);
    assert.equal(fixture.reviews.length, 0);
  });
  await check('Difficulty filters, bilingual search, pages and empty-filter reset retain their original data', async () => {
    const search = page.getByLabel('搜索已通过题目', { exact: true });
    await search.fill('');
    await difficultyFilter(page).selectOption('all');
    assert.equal(await rows(page).count(), 20);
    const pagination = page.getByRole('navigation', { name: '题目分页' });
    await pagination.getByRole('button', { name: '下一页', exact: true }).click();
    assert.equal(await rows(page).count(), 15);
    assert.ok(await pagination.getByRole('button', { name: '下一页', exact: true }).isDisabled());
    for (const [query, title] of [['练习题 30', '练习题 30'], ['206', '反转链表'], ['Two Sum', '两数之和']]) {
      await search.fill(query);
      assert.equal(await rows(page).count(), 1);
      assert.equal(await rows(page).locator('strong').innerText(), title);
    }
    await search.fill('');
    for (const difficulty of [1, 2, 3]) {
      await difficultyFilter(page).selectOption(String(difficulty));
      assert.equal(await difficultyFilter(page).inputValue(), String(difficulty));
      assert.equal(await rows(page).count(), fixture.data.problems.filter(problem => problem.difficulty === difficulty).length);
      assert.equal(await rows(page).locator(`.lc-difficulty:not(.lc-difficulty-${difficulty})`).count(), 0);
    }
    await search.fill('no-matching-problem-fixture');
    await page.locator('.lc-list-empty').waitFor();
    assert.equal(await page.locator('.lc-draw-dialog').count(), 0);
    await page.getByRole('button', { name: '重置筛选', exact: true }).click();
    assert.equal(await search.inputValue(), '');
    assert.equal(await difficultyFilter(page).inputValue(), 'all');
    assert.equal(await rows(page).count(), 20);
    assert.equal(fixture.reviews.length, 0);
  });
  await check('Single-problem draws preserve both known and unknown completion dates through reload', async () => {
    for (const [slug, title, completedAt] of [['two-sum', '两数之和', iso(now - 4 * day)], ['imported-without-date', '历史导入题', null]]) {
      // Constrain the server fixture instead of relying on a removed row action
      // or forcing production random selection to return a particular problem.
      const { page: history, fixture: historyFixture } = await makePage({ name: `completion-${slug}`, problemSlugs: [slug] });
      assert.equal(await rows(history).count(), 1);
      await drawRandom(history);
      assert.equal(await selectedTitle(history).innerText(), title);
      assert.equal(historyFixture.backpackRequests.length, 1);
      assert.equal(historyFixture.backpackRequests[0].problemSlug, slug);
      if (completedAt) assert.equal(await history.locator('.lc-revealed-card time').getAttribute('datetime'), completedAt);
      else {
        assert.equal(await history.locator('.lc-revealed-card time').count(), 0);
        assert.match(await history.locator('.lc-revealed-card').innerText(), /暂无时间记录/);
      }
      await keepCard(history);
      assert.equal(historyFixture.data.reviewBackpack[0].baselineCompletedAt, completedAt);
      assert.ok(await history.locator('.lc-review-entry').isDisabled(), 'a pending single-card pool cannot draw that card again');
      assert.equal(await row(history, title).locator('.lc-last-completed time').count(), completedAt ? 1 : 0);
      await history.reload({ waitUntil: 'domcontentloaded' });
      await history.locator('.lc-backpack-card').waitFor();
      assert.equal(await history.locator('.lc-backpack-card').count(), 1);
      assert.equal(historyFixture.backpackRequests.length, 1);
      assert.equal(historyFixture.data.reviewBackpack[0].baselineCompletedAt, completedAt);
      await capture(history, `desktop-backpack-${slug}`);
    }
  });
  await check('A failed automatic save retries the same event, then only a newer completion removes that card', async () => {
    const { page: retry, fixture: retryFixture } = await makePage({ name: 'save-retry', problemSlugs: ['two-sum'] });
    retryFixture.failNextBackpack = true;
    await retry.locator('.lc-review-entry').click();
    await waitForDraw(retry);
    await retry.locator('.lc-draw-save-state [role="alert"]').waitFor();
    assert.equal(retryFixture.data.reviewBackpack.length, 0);
    await retry.getByRole('button', { name: '重试保存', exact: true }).click();
    await retry.getByRole('button', { name: '收好卡片', exact: true }).waitFor();
    assert.equal(retryFixture.backpackRequests.length, 2);
    assert.deepEqual(retryFixture.backpackRequests[0], retryFixture.backpackRequests[1]);
    await keepCard(retry);
    const baseline = clone(retryFixture.data.reviewBackpack[0]);
    await retry.getByRole('button', { name: '刷新同步', exact: true }).click();
    await retry.locator('.lc-backpack-card').waitFor();
    assert.deepEqual(retryFixture.data.reviewBackpack, [baseline]);
    retryFixture.data.submissions.push({ id: 'older-import', problemSlug: 'two-sum', status: 'AC', submittedAt: iso(now - day) });
    await retry.getByRole('button', { name: '刷新同步', exact: true }).click();
    await retry.getByRole('button', { name: '刷新同步', exact: true }).waitFor();
    assert.deepEqual(retryFixture.data.reviewBackpack, [baseline], 'older imported history is not a new completion');
    retryFixture.clock = now + 60000;
    await retry.clock.setFixedTime(new Date(retryFixture.clock));
    retryFixture.data.submissions.push({ id: 'new-completion', problemSlug: 'two-sum', status: 'AC', submittedAt: iso(retryFixture.clock) });
    retryFixture.data.problems.find(problem => problem.slug === 'two-sum').lastAcceptedAt = iso(retryFixture.clock);
    await retry.getByRole('button', { name: '刷新同步', exact: true }).click();
    await retry.locator('.lc-backpack').waitFor({ state: 'detached' });
    assert.deepEqual(retryFixture.data.reviewBackpack, []);
    assert.ok(await retry.locator('.lc-review-entry').isEnabled(), 'a genuinely completed card can be drawn again');
    assert.equal(await row(retry, '两数之和').locator('time').getAttribute('datetime'), iso(retryFixture.clock));
    assert.equal(retryFixture.reviews.length, 0);
  });
  await check('Empty pools cannot draw, and connecting an account does not open a draw until requested', async () => {
    const { page: empty } = await makePage({ name: 'empty', mode: 'empty' });
    assert.equal(await empty.locator('.lc-card-draw, .lc-draw-dialog').count(), 0);
    assert.ok(await empty.locator('.lc-review-entry').isDisabled());
    await empty.locator('.lc-list-empty').waitFor();
    await assertNoScheduling(empty);
    await capture(empty, 'empty-pool');
    const { page: disconnected, fixture: disconnectedFixture } = await makePage({ name: 'disconnected', mode: 'disconnected' });
    assert.equal(await disconnected.locator('.lc-review-entry').count(), 0);
    await disconnected.locator('#lc-profile-url').fill('review-fixture-user');
    await disconnected.getByRole('button', { name: '关联并同步', exact: true }).click();
    await rows(disconnected).first().waitFor();
    assert.equal(await disconnected.locator('.lc-draw-dialog').count(), 0);
    await drawRandom(disconnected);
    assert.equal(disconnectedFixture.backpackRequests.length, 1);
    assert.equal(disconnectedFixture.reviews.length, 0);
    await keepCard(disconnected);
  });
  await check('Mobile 390px and 320px fit the modal, saved backpack and filtered list', async () => {
    const details = [];
    for (const width of [390, 320]) {
      const { page: mobile, fixture: mobileFixture } = await makePage({ name: `mobile-${width}`, viewport: { width, height: 844 }, mobile: true });
      details.push(await noOverflow(mobile));
      await drawRandom(mobile);
      await noOverflow(mobile);
      await capture(mobile, `mobile-${width}-selected`, mobile.locator('.lc-draw-dialog'));
      await keepCard(mobile);
      await difficultyFilter(mobile).selectOption('1');
      await mobile.getByLabel('搜索已通过题目', { exact: true }).fill('两数之和');
      assert.equal(await row(mobile, '两数之和').locator('.lc-last-completed time').getAttribute('datetime'), iso(now - 4 * day));
      await assertNoScheduling(mobile); await noOverflow(mobile);
      assert.equal(mobileFixture.backpackRequests.length, 1);
      assert.equal(mobileFixture.reviews.length, 0);
      await capture(mobile, `mobile-${width}-library`);
    }
    return { viewports: details };
  });
  await check('Dark reduced-motion dialog keeps keyboard focus inside and restores it on Escape', async () => {
    const { page: dark, fixture: darkFixture } = await makePage({ name: 'dark-reduced-motion', dark: true, reducedMotion: 'reduce' });
    assert.equal(await dark.locator('html').getAttribute('data-qg-theme'), 'dark');
    await drawRandom(dark);
    assert.equal(await dark.locator('.lc-card-journey.is-moving').count(), 0);
    await dark.keyboard.press('Tab');
    assert.equal(await dark.locator('.lc-draw-dialog').evaluate(dialog => dialog.contains(document.activeElement)), true);
    await dark.keyboard.press('Shift+Tab');
    assert.equal(await dark.locator('.lc-draw-dialog').evaluate(dialog => dialog.contains(document.activeElement)), true);
    await assertNoScheduling(dark); await noOverflow(dark);
    await capture(dark, 'dark-reduced-motion-cards', dark.locator('.lc-draw-dialog'));
    await dark.keyboard.press('Escape');
    await dark.locator('.lc-draw-dialog').waitFor({ state: 'detached' });
    assert.equal(await dark.locator('.lc-review-entry').evaluate(element => document.activeElement === element), true);
    assert.equal(darkFixture.backpackRequests.length, 1);
    assert.equal(darkFixture.reviews.length, 0);
  });
  await check('Closing before a card is revealed cancels its pending animation and makes no save', async () => {
    const { page: canceled, fixture: canceledFixture } = await makePage({ name: 'cancel-draw' });
    await canceled.locator('.lc-review-entry').click();
    await canceled.getByRole('button', { name: '关闭抽卡', exact: true }).click();
    // The full automatic timeline lasts 540ms + 1560ms.
    await canceled.waitForTimeout(2400);
    assert.equal(await canceled.locator('.lc-draw-dialog').count(), 0);
    assert.equal(canceledFixture.backpackRequests.length, 0);
    assert.deepEqual(canceledFixture.data.reviewBackpack, []);
  });
  await check('English difficulty controls, draw confirmation and backpack remain accessible', async () => {
    const { page: english, fixture: englishFixture } = await makePage({ name: 'english', language: 'en' });
    assert.equal(await english.getByRole('combobox', { name: 'Filter difficulty', exact: true }).count(), 1);
    await difficultyFilter(english).selectOption('1');
    assert.equal(await rows(english).locator('.lc-difficulty:not(.lc-difficulty-1)').count(), 0);
    await drawRandom(english, true);
    assert.ok((await selectedTitle(english).innerText()).length > 0);
    await assertNoScheduling(english); await noOverflow(english);
    await keepCard(english, true);
    assert.equal(await english.locator('.lc-backpack-card').count(), 1);
    assert.equal(englishFixture.reviews.length, 0);
    await capture(english, 'english-backpack');
  });
  for (const context of summary.contexts) assert.deepEqual(context.reviewRequests, [], `${context.name} must not submit review feedback`);
  assert.deepEqual(summary.runtimeErrors, []);
  assert.deepEqual(summary.unexpectedLocalResponses, []);
  summary.status = 'passed';
} catch (error) {
  summary.status = 'failed'; summary.failure = { message: error.message, stack: error.stack };
  if (currentPage && !currentPage.isClosed()) {
    await capture(currentPage, 'failure').catch(() => {});
    fs.writeFileSync(path.join(output, 'failure-dom.txt'), await currentPage.locator('body').innerText().catch(() => 'unavailable'));
  }
  process.exitCode = 1;
} finally {
  summary.interceptedExternalOrigins = [...new Set(summary.interceptedExternalOrigins)];
  summary.finishedAt = new Date().toISOString();
  if (summary.status === 'passed') for (const filename of ['failure.png', 'failure-dom.txt']) fs.rmSync(path.join(output, filename), { force: true });
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  await browser?.close();
  await server?.close();
}
console.log(JSON.stringify({ status: summary.status, passedChecks: summary.checks.length, failure: summary.failure?.message, summary: path.join(output, 'summary.json') }));
