#!/usr/bin/env node
/** Isolated UI regression checks. All API traffic and external origins are fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { initialReview, previewReview, reviewState, reviewStatus } from '../src/features/leetcode/leetcodeReviewModel.js';

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
const account = { id: ownerId, provider: 'local', name: 'Review QA', email: 'review-qa@example.invalid', country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: iso(now), passwordHash: 'fixture-device-hash-not-a-real-password' };

function problem(slug, title, frontendId, difficulty, dueOffset) {
  const row = { slug, title, titleEn: slug.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), frontendId: String(frontendId), difficulty, firstAcceptedAt: dueOffset == null ? null : iso(now - 8 * day), lastAcceptedAt: dueOffset == null ? null : iso(now - 4 * day), source: dueOffset == null ? 'import' : 'public' };
  row.review = dueOffset == null ? initialReview(row) : { ...initialReview(row), version: 2, source: 'review', anchorAt: row.lastAcceptedAt, lastReviewedAt: iso(now - 6 * day), nextReviewAt: iso(now + dueOffset), reviewCount: 2, intervalDays: 6, repetitions: 2, easeFactor: 2.5, lapses: 0, lastRating: 'good' };
  row.review.status = reviewStatus(row, now);
  return row;
}
function fixtureData() {
  return {
    connection: { username: 'review-fixture-user', site: 'cn', displayName: 'Review Fixture', profileUrl: 'https://leetcode.cn/u/review-fixture-user/', linkedAt: '2026-09-01T00:00:00.000Z', lastSyncedAt: iso(now) },
    stats: { solved: 37, easy: 15, medium: 17, hard: 5, totalSubmissions: 127, acceptedSubmissions: 63 },
    submissions: [{ id: 'fixture-submission-1', problemSlug: 'two-sum', submittedAt: iso(now - 4 * day), status: 'AC' }],
    calendar: [{ date: '2026-09-07', count: 1, acceptedCount: 1, distinctSolved: 1 }],
    problems: [problem('future-problem', '未来复习题', 500, 3, 3 * day), problem('binary-tree-level-order-traversal', '二叉树的层序遍历', 102, 2, -day), problem('two-sum', '两数之和', 1, 1, -3 * day), problem('reverse-linked-list', '反转链表', 206, 1, -2 * day), problem('imported-without-date', '历史导入题', 999, null, null), ...Array.from({ length: 30 }, (_, index) => problem(`practice-${index + 1}`, `练习题 ${String(index + 1).padStart(2, '0')}`, 1001 + index, index % 3 + 1, index < 4 ? null : (index + 1) * day))],
    coverage: { problemPoolComplete: false, recentOnly: true },
    reviewPolicy: { algorithm: 'sm2', version: 1, generatedAt: iso(now) },
  };
}
fs.writeFileSync(path.join(output, 'snapshot-fixture.json'), JSON.stringify(fixtureData(), null, 2) + '\n');
const summary = { startedAt: new Date().toISOString(), fixtureClock: iso(now), isolation: 'Fresh headless Chromium contexts; service workers blocked; every API and external request fulfilled locally.', checks: [], screenshots: [], runtimeErrors: [], unexpectedLocalResponses: [], interceptedExternalOrigins: [], contexts: [] };
const contexts = [];
let server;
let browser;
let currentPage;

async function makePage({ name = 'desktop', viewport = { width: 1440, height: 1000 }, mobile = false, dark = false, reducedMotion = 'no-preference', language = 'zh' } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: language === 'en' ? 'en-US' : 'zh-CN', timezoneId: 'America/Chicago', isMobile: mobile, hasTouch: mobile, colorScheme: dark ? 'dark' : 'light', reducedMotion, serviceWorkers: 'block' });
  contexts.push(context);
  const fixture = { data: fixtureData(), requestLog: [], reviews: [], events: new Map(), nextMode: 'success', release: null, getCount: 0 };
  const contextSummary = { name, reviewRequests: [], externalLinks: [], unrelatedMockWrites: [] };
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
  function applyReview(body) {
    const row = fixture.data.problems.find(item => item.slug === body.problemSlug);
    assert.ok(row, 'Fixture received unknown problem');
    const previous = reviewState(row);
    row.review = { ...previous, ...previewReview(row, body.rating, now), version: previous.version + 1, source: 'review', status: 'upcoming', anchorAt: previous.anchorAt || iso(now), lastReviewedAt: iso(now), reviewCount: previous.reviewCount + 1, lapses: previous.lapses + (body.rating === 'again' ? 1 : 0), lastRating: body.rating };
    const snapshot = clone(fixture.data);
    fixture.events.set(body.eventId, snapshot);
    return snapshot;
  }
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
      if (requestPath === '/leetcode' && method === 'GET') { fixture.getCount++; return fulfill(route, fixture.data); }
      if (requestPath === '/leetcode/review' && method === 'POST') {
        const body = request.postDataJSON();
        fixture.reviews.push(clone(body)); contextSummary.reviewRequests.push(clone(body));
        assert.deepEqual(Object.keys(body).sort(), ['eventId', 'expectedVersion', 'linkedAt', 'problemSlug', 'rating', 'username'].sort());
        assert.equal(body.username, fixture.data.connection.username);
        assert.equal(body.linkedAt, fixture.data.connection.linkedAt);
        if (fixture.events.has(body.eventId)) return fulfill(route, fixture.events.get(body.eventId));
        const row = fixture.data.problems.find(item => item.slug === body.problemSlug);
        const mode = fixture.nextMode; fixture.nextMode = 'success';
        if (mode === 'conflict') {
          row.review = { ...row.review, version: row.review.version + 1, source: 'review', reviewCount: row.review.reviewCount + 1, nextReviewAt: iso(now + 4 * day), lastReviewedAt: iso(now), lastRating: 'hard', status: 'upcoming' };
          return fulfill(route, { error: 'review_version_conflict' }, 409);
        }
        if (body.expectedVersion !== row.review.version) return fulfill(route, { error: 'review_version_conflict' }, 409);
        if (mode === 'delay') await new Promise(resolve => { fixture.release = resolve; fixture.delayStarted?.(); });
        const snapshot = applyReview(body);
        if (mode === 'ambiguous') return fulfill(route, { error: 'fixture_response_lost_after_commit' }, 503);
        return fulfill(route, snapshot);
      }
      if (requestPath === '/leetcode/sync') return fulfill(route, fixture.data);
      if (!['GET', 'HEAD'].includes(method)) contextSummary.unrelatedMockWrites.push({ path: requestPath, method });
      if (requestPath === '/account') return fulfill(route, { account: { ...account, passwordHash: undefined } });
      if (requestPath === '/sync') return fulfill(route, { account: { ...account, passwordHash: undefined }, state: {}, problemStates: [], community: { posts: [] }, syncedAt: iso(now) });
      if (requestPath === '/personal-prep') return fulfill(route, { version: 1, revision: 0, data: null, updatedAt: null });
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
  await page.locator('.lc-memory-review').waitFor();
  await page.locator('.lc-problem-list li').first().waitFor();
  return { page, fixture, context };
}
const selectedTitle = page => page.locator('.lc-drawn-problem h3');
const reviewFilter = (page, name) => page.getByRole('group', { name: '按复习状态筛选', exact: true }).getByRole('button', { name, exact: true });
const difficultyFilter = (page, name) => page.getByRole('group', { name: '按难度筛选', exact: true }).getByRole('button', { name, exact: true });
const row = (page, name) => page.locator('.lc-problem-list li').filter({ has: page.getByRole('button', { name: `复习 ${name}`, exact: true }) });
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
async function selectProblem(page, name) {
  await page.getByLabel('搜索已通过题目', { exact: true }).fill(name);
  await page.getByRole('button', { name: `复习 ${name}`, exact: true }).click();
  await selectedTitle(page).filter({ hasText: name }).waitFor();
}

try {
  server = await createServer({ root, server: { host: '127.0.0.1', port: 5211, strictPort: true, open: false }, logLevel: 'error' });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
  const desktop = await makePage();
  const { page, fixture } = desktop;
  const statistics = await page.locator('.lc-overview').innerText();
  const originalRemoteStats = JSON.stringify({ stats: fixture.data.stats, submissions: fixture.data.submissions, calendar: fixture.data.calendar });
  await check('Earliest due problem is selected first; opening and random selection never record feedback', async () => {
    assert.equal(await page.locator('.lc-problem-list li').first().locator('strong').innerText(), '两数之和');
    await capture(page, 'desktop-overview');
    await page.getByRole('button', { name: '开始复习', exact: false }).click();
    assert.equal(await selectedTitle(page).innerText(), '两数之和');
    const external = page.getByRole('link', { name: /去力扣挑战/ });
    assert.equal(await external.getAttribute('href'), 'https://leetcode.cn/problems/two-sum/');
    const popupPromise = page.waitForEvent('popup'); await external.click();
    const popup = await popupPromise; await popup.waitForURL('https://leetcode.cn/problems/two-sum/', { waitUntil: 'domcontentloaded' });
    assert.equal(popup.url(), 'https://leetcode.cn/problems/two-sum/'); await popup.close();
    assert.equal(fixture.reviews.length, 0);
    await page.getByRole('button', { name: '随机换一道', exact: true }).click();
    assert.equal(fixture.reviews.length, 0);
    await selectProblem(page, '两数之和');
    await page.getByLabel('搜索已通过题目', { exact: true }).fill('');
    await capture(page, 'desktop-selected-review', page.locator('.lc-memory-review'));
    return { earliestSlug: 'two-sum', reviewPostsBeforeRating: fixture.reviews.length };
  });
  await check('Acknowledged review updates its date and due filter without changing LeetCode statistics', async () => {
    await reviewFilter(page, '待复习').click();
    assert.equal(await page.locator('.lc-problem-list li').count(), 3);
    fixture.nextMode = 'delay';
    const delayedRequest = new Promise(resolve => { fixture.delayStarted = resolve; });
    await page.locator('[data-review-rating="good"]').click();
    await delayedRequest;
    await page.locator('.lc-recall[aria-busy="true"]').waitFor();
    assert.equal(await page.locator('.lc-review-saved').count(), 0);
    assert.equal(fixture.data.problems.find(item => item.slug === 'two-sum').review.version, 2);
    assert.ok(await page.locator('[data-review-rating="again"]').isDisabled());
    fixture.release();
    await page.getByText('复习已保存', { exact: true }).waitFor();
    const record = fixture.data.problems.find(item => item.slug === 'two-sum').review;
    assert.equal(await page.locator('.lc-review-saved time').getAttribute('datetime'), record.nextReviewAt);
    assert.equal(record.nextReviewAt, '2026-09-26T14:30:00.000Z');
    assert.equal(await page.locator('.lc-problem-list li').count(), 2);
    assert.equal(await page.locator('.lc-overview').innerText(), statistics);
    assert.equal(JSON.stringify({ stats: fixture.data.stats, submissions: fixture.data.submissions, calendar: fixture.data.calendar }), originalRemoteStats);
    await capture(page, 'desktop-review-confirmed', page.locator('.lc-memory-review'));
    return { confirmedNextReviewAt: record.nextReviewAt, remoteReviewCount: record.reviewCount };
  });
  await check('Reload restores acknowledged schedule from GET and keeps due-first, search and pagination', async () => {
    const gets = fixture.getCount; await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.lc-memory-review').waitFor();
    assert.ok(fixture.getCount > gets);
    await reviewFilter(page, '未到期').click();
    await selectProblem(page, '两数之和');
    assert.equal(await page.locator('.lc-drawn-problem .lc-problem-due time').getAttribute('datetime'), '2026-09-26T14:30:00.000Z');
    await page.getByLabel('搜索已通过题目', { exact: true }).fill('');
    await reviewFilter(page, '全部').click();
    assert.equal(await page.locator('.lc-problem-list li').count(), 20);
    await page.getByRole('navigation', { name: '题目分页' }).getByRole('button', { name: '下一页', exact: true }).click();
    assert.equal(await page.locator('.lc-problem-list li').count(), 15);
    await page.getByLabel('搜索已通过题目', { exact: true }).fill('练习题 30');
    assert.equal(await page.locator('.lc-problem-list li').count(), 1);
    assert.equal(await page.locator('.lc-problem-list strong').innerText(), '练习题 30');
    await page.getByLabel('搜索已通过题目', { exact: true }).fill('');
    await difficultyFilter(page, '简单').click();
    assert.equal(await page.locator('.lc-problem-list .lc-difficulty:not(.lc-difficulty-1)').count(), 0);
    await difficultyFilter(page, '全部').click();
    await reviewFilter(page, '待复习').click();
    assert.equal(await page.locator('.lc-problem-list li').count(), 2);
    assert.equal(await page.locator('.lc-problem-list li').first().locator('strong').innerText(), '反转链表');
    return { persistedGets: fixture.getCount, pages: 2 };
  });
  await check('Unknown imported completion history stays undated until the first explicit rating', async () => {
    const { page: unknown, fixture: unknownFixture } = await makePage({ name: 'unknown-history' });
    await reviewFilter(unknown, '待首次复习').click();
    assert.equal(await unknown.locator('.lc-problem-list li').count(), 5);
    await selectProblem(unknown, '历史导入题');
    assert.match(await unknown.locator('.lc-drawn-problem').innerText(), /没有可靠的通过时间/);
    assert.equal(await unknown.locator('.lc-drawn-problem .lc-problem-due time').count(), 0);
    assert.match(await unknown.locator('.lc-drawn-problem .lc-problem-due').innerText(), /尚未安排时间/);
    assert.equal(unknownFixture.reviews.length, 0);
    await capture(unknown, 'undated-history', unknown.locator('.lc-memory-review'));
    await unknown.locator('[data-review-rating="good"]').click();
    await unknown.getByText('复习已保存', { exact: true }).waitFor();
    assert.equal(await unknown.locator('.lc-review-saved time').getAttribute('datetime'), '2026-09-12T14:30:00.000Z');
    assert.equal(unknownFixture.data.problems.find(item => item.slug === 'imported-without-date').lastAcceptedAt, null);
  });
  await check('Ambiguous save failure retains one event ID on retry and cannot double-record', async () => {
    const { page: retry, fixture: retryFixture } = await makePage({ name: 'ambiguous-retry' });
    await retry.getByRole('button', { name: '开始复习', exact: false }).click();
    retryFixture.nextMode = 'ambiguous';
    await retry.locator('[data-review-rating="hard"]').click();
    await retry.getByRole('button', { name: '重试保存', exact: true }).waitFor();
    assert.equal(await retry.locator('.lc-review-saved').count(), 0);
    assert.ok(await retry.locator('[data-review-rating="easy"]').isDisabled());
    assert.equal(retryFixture.reviews.length, 1);
    const eventId = retryFixture.reviews[0].eventId;
    await capture(retry, 'retry-unconfirmed', retry.locator('.lc-memory-review'));
    await retry.getByRole('button', { name: '重试保存', exact: true }).click();
    await retry.getByText('复习已保存', { exact: true }).waitFor();
    assert.equal(retryFixture.reviews.length, 2);
    assert.equal(retryFixture.reviews[1].eventId, eventId);
    assert.deepEqual(retryFixture.reviews[0], retryFixture.reviews[1]);
    assert.equal(retryFixture.data.problems.find(item => item.slug === 'two-sum').review.reviewCount, 3);
    return { requests: 2, recordedReviews: 1, reusedEventId: true };
  });
  await check('409 requires refreshed progress before a fresh rating uses the new version', async () => {
    const { page: conflict, fixture: conflictFixture } = await makePage({ name: 'version-conflict' });
    await conflict.getByRole('button', { name: '开始复习', exact: false }).click();
    conflictFixture.nextMode = 'conflict';
    await conflict.locator('[data-review-rating="easy"]').click();
    await conflict.getByRole('button', { name: '刷新复习进度', exact: true }).waitFor();
    assert.equal(await conflict.locator('.lc-review-saved').count(), 0);
    const oldRequest = clone(conflictFixture.reviews[0]);
    const gets = conflictFixture.getCount;
    await capture(conflict, 'conflict-unconfirmed', conflict.locator('.lc-memory-review'));
    await conflict.getByRole('button', { name: '刷新复习进度', exact: true }).click();
    await conflict.getByText('已读取最新进度，请重新确认回忆程度。', { exact: true }).waitFor();
    assert.ok(conflictFixture.getCount > gets);
    assert.equal(await conflict.locator('.lc-drawn-problem .lc-problem-due time').getAttribute('datetime'), '2026-09-15T14:30:00.000Z');
    await conflict.locator('[data-review-rating="good"]').click();
    await conflict.getByText('复习已保存', { exact: true }).waitFor();
    assert.equal(conflictFixture.reviews[1].expectedVersion, oldRequest.expectedVersion + 1);
    assert.notEqual(conflictFixture.reviews[1].eventId, oldRequest.eventId);
    return { refreshedBeforeRetry: true, changedExpectedVersion: true };
  });
  await check('Mobile 390px fits overview, review choices and filtered problem list', async () => {
    const { page: mobile } = await makePage({ name: 'mobile-390', viewport: { width: 390, height: 844 }, mobile: true });
    const overview = await noOverflow(mobile); await capture(mobile, 'mobile-overview');
    await mobile.getByRole('button', { name: '开始复习', exact: false }).click();
    const selected = await noOverflow(mobile);
    await capture(mobile, 'mobile-review', mobile.locator('.lc-memory-review'));
    await reviewFilter(mobile, '待复习').click();
    const list = await noOverflow(mobile);
    await capture(mobile, 'mobile-filtered-list', mobile.locator('.lc-problems'));
    assert.equal(await mobile.locator('.lc-recall-options button').count(), 4);
    return { overview, selected, list };
  });
  await check('Dark theme and reduced motion preserve accessible review controls', async () => {
    const { page: dark } = await makePage({ name: 'dark-reduced-motion', dark: true, reducedMotion: 'reduce' });
    assert.equal(await dark.locator('html').getAttribute('data-qg-theme'), 'dark');
    assert.equal(await dark.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    await dark.getByRole('button', { name: '开始复习', exact: false }).click();
    await dark.locator('[data-review-rating="again"]').focus();
    await dark.keyboard.press('Tab');
    const focus = await dark.locator('[data-review-rating="hard"]').evaluate(element => ({ focused: document.activeElement === element, outlineStyle: getComputedStyle(element).outlineStyle, outlineWidth: getComputedStyle(element).outlineWidth }));
    assert.equal(focus.focused, true); assert.notEqual(focus.outlineStyle, 'none');
    await noOverflow(dark);
    await capture(dark, 'dark-reduced-motion-review', dark.locator('.lc-memory-review'));
    return focus;
  });
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
