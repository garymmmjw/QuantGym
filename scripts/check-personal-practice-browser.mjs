#!/usr/bin/env node
/** Real page/component checks with isolated accounts and entirely intercepted API traffic. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { createPersonalState } from '../src/features/personal/personalStore.js';
import { initialReview } from '../src/features/leetcode/leetcodeReviewModel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recoveryOnly = process.argv.includes('--recovery-only');
const catalogOnly = process.argv.includes('--technical-catalog-only');
const output = path.join(root, 'artifacts/personal-practice', ...(recoveryOnly ? ['recovery'] : catalogOnly ? ['catalog'] : []));
fs.mkdirSync(output, { recursive: true });
const port = recoveryOnly ? 5214 : 5213, baseUrl = `http://127.0.0.1:${port}`;
const endpoint = 'https://personal-practice-fixture.invalid/api';
const now = Date.parse('2026-09-13T12:00:00Z'), iso = time => new Date(time).toISOString();
const ownerId = 'local:personal-practice-browser-fixture';
const account = { id: ownerId, provider: 'local', name: 'Practice QA', email: 'practice-qa@example.invalid', country: 'china', region: '上海',
  graduationTerm: '2027-09', createdAt: '2026-01-01T00:00:00Z', updatedAt: iso(now), passwordHash: 'fixture-not-a-real-password' };
const connection = { username: 'practice-fixture-user', linkedAt: '2026-08-01T00:00:00Z', site: 'cn',
  displayName: 'Practice Fixture', profileUrl: 'https://leetcode.cn/u/practice-fixture-user/', lastSyncedAt: iso(now) };
const problems = [['two-sum', '两数之和', '1'], ['valid-parentheses', '有效的括号', '20']].map(([slug, title, frontendId]) => {
  const row = { slug, title, titleEn: slug, frontendId, difficulty: 1, lastAcceptedAt: iso(now - 30 * 86400000) };
  return { ...row, review: initialReview(row) };
});
const leetcode = { connection, problems, submissions: problems.map((row, index) => ({ id: `fixture-ac-${index}`, problemSlug: row.slug, status: 'AC', submittedAt: row.lastAcceptedAt })),
  syncedSubmissions: problems.map((row, index) => ({ id: `fixture-ac-${index}`, problemSlug: row.slug, status: 'AC', submittedAt: row.lastAcceptedAt })),
  stats: { solved: 2, easy: 2, medium: 0, hard: 0, totalSubmissions: 5 }, calendar: [], coverage: { problemPoolComplete: true }, reviewPolicy: { algorithm: 'sm2', version: 1, generatedAt: iso(now) } };
const technical = [
  { id: 'purple-probability-fixture', title: '硬币与概率', titleEn: 'Coin probability', prompt: '一枚公平硬币连续投掷两次，两次均为正面的概率是多少？', promptEn: 'What is the probability of two heads in two fair coin tosses?', reference: '两次投掷独立，因此概率为 $\\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4}$。', referenceEn: 'Independent tosses give probability 1/4.', source: 'question-bank', sourceLabel: '紫皮书' },
  { id: 'purple-expectation-fixture', title: '骰子期望', titleEn: 'Dice expectation', prompt: '掷一枚公平的六面骰子，点数的期望是多少？', promptEn: 'What is the expected value of a fair six-sided die?', reference: '期望为 (1 + 2 + 3 + 4 + 5 + 6) / 6 = 3.5。', referenceEn: 'The expectation is 3.5.', source: 'question-bank', sourceLabel: '紫皮书' },
];
const legacyActivity = { id: 'legacy-mental-preserved', kind: 'mental', count: 9, source: 'manual', note: 'Earlier training fixture', completedAt: iso(now - 86400000) };
const legacyDaily = { id: 'legacy-daily-preserved', status: 'completed', startedAt: iso(now - 5 * 86400000), completedAt: iso(now - 5 * 86400000 + 60000), dateKey: '2026-09-08',
  settings: { mentalEnabled: false, mentalSeconds: 120, techSource: 'library', techCount: 1, codingCount: 0, behavioralCount: 0, techMinutes: 5, codingMinutes: 20, behavioralMinutes: 3 },
  questions: [{ id: 'legacy-question', kind: 'tech', title: 'Earlier question', prompt: 'Legacy fixture prompt.', budgetSeconds: 300 }],
  answers: { 'legacy-question': { text: 'Preserved earlier answer.', selfAssessment: 'independent', elapsedSeconds: 60, completedAt: iso(now - 5 * 86400000 + 60000) } } };
const freshRemote = () => ({ envelope: { version: 1, revision: 1, data: { ...createPersonalState(), activities: [structuredClone(legacyActivity)], dailySessions: [structuredClone(legacyDaily)] }, updatedAt: iso(now) }, writes: [], requests: [], reviewWrites: [] });
const summary = { startedAt: new Date().toISOString(), isolation: 'Fresh headless contexts; mock-only accounts; every API/application external request intercepted. Only the existing public MathJax script/font CDN is allowed for formula rendering.', checks: [], screenshots: [], runtimeErrors: [], unexpectedLocalResponses: [] };
const contexts = [];
let browser, server, currentPage;

async function makePage({ name = 'desktop', pathname = '/coding-oa', viewport = { width: 1440, height: 1000 }, mobile = false, dark = false, remote = freshRemote(), linked = true, technicalError = false, technicalQuestions = technical, technicalSupplements = {} } = {}) {
  const context = await browser.newContext({ viewport, locale: 'zh-CN', timezoneId: 'America/Chicago', deviceScaleFactor: 1, isMobile: mobile,
    hasTouch: mobile, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
  contexts.push(context);
  await context.addInitScript(({ account, endpoint, now, dark }) => {
    Math.random = () => 0.4;
    if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date(now).toISOString() }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: 'fixture-token-not-valid-anywhere', userId: account.id, lastSyncAt: new Date(now).toISOString(), lastError: '' }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
    localStorage.setItem('quantgym.ui.theme.v1', dark ? 'dark' : 'light');
  }, { account, endpoint, now, dark });
  const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body),
    headers: { 'access-control-allow-origin': baseUrl, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS' } });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.origin === baseUrl) {
      if (url.pathname === '/config.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, llmEndpoint: 'https://llm-practice-fixture.invalid/interview', googleLoginEnabled: false })};` });
      return route.continue();
    }
    if (request.url().startsWith(endpoint)) {
      const requestPath = url.pathname.slice('/api'.length);
      remote.requests.push({ path: requestPath, method });
      if (method === 'OPTIONS') return fulfill(route, {});
      if (requestPath === '/personal-prep') {
        if (method === 'GET') return fulfill(route, remote.envelope);
        if (method === 'PUT') {
          const body = request.postDataJSON();
          if (body.baseRevision !== remote.envelope.revision) return fulfill(route, { error: 'fixture-revision-conflict' }, 409);
          remote.writes.push(structuredClone(body));
          remote.envelope = { version: 1, revision: remote.envelope.revision + 1, data: body.data, updatedAt: iso(now) };
          return fulfill(route, remote.envelope);
        }
      }
      if (requestPath === '/leetcode' || requestPath === '/leetcode/sync') return fulfill(route, linked ? leetcode : { connection: null, stats: null, submissions: [], problems: [], calendar: [], coverage: {} });
      if (requestPath === '/leetcode/review') { remote.reviewWrites.push(request.postDataJSON()); return fulfill(route, { error: 'unexpected-review-write' }, 500); }
      if (requestPath === '/practice/technical/questions') return technicalError ? fulfill(route, { error: 'fixture-unavailable' }, 503) : fulfill(route, { source: 'question-bank', questions: technicalQuestions, ...technicalSupplements });
      if (requestPath === '/account') return fulfill(route, { account: { ...account, passwordHash: undefined } });
      if (requestPath === '/sync') return fulfill(route, { account: { ...account, passwordHash: undefined }, state: {}, problemStates: [], community: { posts: [] }, syncedAt: iso(now) });
      return fulfill(route, { problems: [], jobs: [], news: [], leaderboard: [], profiles: [], community: { posts: [] }, state: {}, syncedAt: iso(now) });
    }
    if (url.hostname === 'leetcode.cn' && url.pathname.startsWith('/problems/')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture LeetCode problem</title><h1>Isolated LeetCode problem fixture</h1>' });
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/mathjax@3/es5/')) return route.continue();
    if (request.resourceType() === 'script') return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (request.resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return fulfill(route, {});
  });
  const page = await context.newPage(); currentPage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => summary.runtimeErrors.push({ context: name, error: error.message }));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) summary.unexpectedLocalResponses.push({ context: name, status: response.status(), url: response.url() }); });
  await page.clock.setFixedTime(new Date(now));
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: pathname === '/technical-interview' ? 'Technical Interview' : pathname === '/leetcode' ? 'LeetCode' : 'Coding OA', exact: true }).waitFor();
  return { page, remote, context };
}

async function waitFor(predicate, label) {
  const deadline = Date.now() + 15000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error(`Timed out: ${label}`); await new Promise(resolve => setTimeout(resolve, 75)); }
}
async function capture(page, name) {
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), animations: 'disabled', fullPage: false });
  summary.screenshots.push(filename);
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(sizes.content <= sizes.viewport + 1, JSON.stringify(sizes));
  return sizes;
}
async function check(name, action) {
  if (recoveryOnly && !name.startsWith('Storage quota')) return;
  if (catalogOnly && !name.startsWith('Systematic Purple Book')) return;
  process.stdout.write(`${name}\n`); const details = await action(); summary.checks.push({ name, status: 'passed', ...(details || {}) });
}

try {
  server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true, open: false }, logLevel: 'error' });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
  const { page, remote } = await makePage();
  await check('Personal menu exposes both independent modules and no Daily Mock entry', async () => {
    assert.ok(await page.getByRole('link', { name: 'Coding OA', exact: true }).count() > 0);
    assert.ok(await page.getByRole('link', { name: 'Technical Interview', exact: true }).count() > 0);
    assert.equal(await page.getByRole('link', { name: /Daily Mock|每日模拟/i }).count(), 0);
    await noOverflow(page); await capture(page, 'coding-desktop-ready');
    for (const pathname of ['/daily-mock', '/#daily-mock']) {
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(`${baseUrl}/coding-oa`);
      await page.getByRole('heading', { level: 1, name: 'Coding OA', exact: true }).waitFor();
    }
  });
  await check('Coding OA draws only from solved history, opens LeetCode safely, and restores a draft after reload', async () => {
    await page.getByRole('button', { name: '抽取一道题', exact: true }).click();
    await page.getByRole('heading', { name: '两数之和', exact: true }).waitFor();
    assert.equal((remote.envelope.data.practiceSessions || []).filter(item => item.status === 'completed').length, 0);
    const launch = page.getByRole('link', { name: /力扣/ }).filter({ hasText: /挑战|做题|练习/ }).first();
    assert.equal(await launch.getAttribute('href'), 'https://leetcode.cn/problems/two-sum/');
    const popupPromise = page.waitForEvent('popup'); await launch.click();
    const popup = await popupPromise; await popup.waitForURL('https://leetcode.cn/problems/two-sum/'); await popup.close();
    await page.getByRole('button', { name: '开始计时', exact: true }).click();
    const answer = page.getByRole('textbox', { name: '你的代码与复盘', exact: true });
    await answer.fill('def two_sum(nums, target):\n    # fixture answer: hash map, O(n) time\n    return []');
    assert.ok(await page.getByRole('button', { name: '保存复盘', exact: true }).isDisabled());
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.match(await answer.inputValue(), /fixture answer/);
    assert.equal(remote.reviewWrites.length, 0);
    await capture(page, 'coding-desktop-draft');
  });
  await check('Completing Coding OA saves exactly one private attempt and calendar activity', async () => {
    await page.getByRole('radio', { name: '独立完成', exact: true }).check();
    await page.getByRole('button', { name: '保存复盘', exact: true }).click();
    await waitFor(() => remote.envelope.data.practiceSessions?.some(item => item.kind === 'coding' && item.status === 'completed'), 'Coding OA cloud save');
    const completed = remote.envelope.data.practiceSessions.filter(item => item.kind === 'coding' && item.status === 'completed');
    assert.equal(completed.length, 1);
    assert.equal(completed[0].question.slug, 'two-sum');
    assert.equal(completed[0].question.username, connection.username);
    assert.equal(completed[0].question.linkedAt, connection.linkedAt);
    assert.equal(remote.envelope.data.activities.filter(item => item.id === `practice:${completed[0].id}`).length, 1);
    assert.deepEqual(remote.envelope.data.dailySessions, [legacyDaily]);
    assert.deepEqual(remote.envelope.data.activities.find(item => item.id === legacyActivity.id), legacyActivity);
    assert.equal(remote.reviewWrites.length, 0);
    await capture(page, 'coding-desktop-completed');
    return { completedCodingAttempts: completed.length, activityCount: remote.envelope.data.activities.length };
  });
  await check('LeetCode opened first on another device restores Coding OA history and applies it to weighted draws', async () => {
    const fresh = await makePage({ name: 'new-device-leetcode', pathname: '/leetcode', remote });
    await fresh.page.locator('.lc-memory-review').waitFor();
    await waitFor(() => remote.requests.filter(item => item.path === '/personal-prep' && item.method === 'GET').length >= 2, 'personal history fetched on LeetCode');
    await fresh.page.getByRole('button', { name: '随机抽一道', exact: true }).click();
    assert.equal(await fresh.page.locator('.lc-drawn-problem h3').innerText(), '有效的括号');
    assert.equal(remote.reviewWrites.length, 0);
    assert.equal(remote.envelope.data.practiceSessions.filter(item => item.status === 'completed').length, 1);
    assert.equal(await fresh.page.locator('.lc-solved-total strong').innerText(), '2');
    await capture(fresh.page, 'leetcode-cloud-weighted');
  });
  await check('Technical Interview draws purple-book questions and independently saves an answer', async () => {
    currentPage = page;
    await page.goto(`${baseUrl}/technical-interview`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '抽取一道题', exact: true }).click();
    await page.getByRole('heading', { name: '硬币与概率', exact: true }).waitFor();
    await page.getByText(technical[0].prompt, { exact: true }).waitFor();
    assert.equal(await page.locator('.practice-reference').getAttribute('open'), null);
    await page.locator('.practice-reference summary').click();
    await page.locator('.practice-reference mjx-container').waitFor();
    await page.getByRole('textbox', { name: '你的思路与回答', exact: true }).fill('两次投掷相互独立，概率相乘，结果为四分之一。');
    await page.getByRole('radio', { name: '独立完成', exact: true }).check();
    assert.equal(remote.envelope.data.activities.filter(item => item.kind === 'tech').length, 0, 'drawing and reviewing a reference do not mark the question complete');
    await page.getByRole('button', { name: '我做完了', exact: true }).click();
    await waitFor(() => remote.envelope.data.practiceSessions?.some(item => item.kind === 'tech' && item.status === 'completed'), 'Technical Interview cloud save');
    assert.equal(remote.envelope.data.practiceSessions.filter(item => item.status === 'completed').length, 2);
    const saved = remote.envelope.data.practiceSessions.find(item => item.kind === 'tech' && item.status === 'completed');
    assert.equal(saved.question.source, 'question-bank');
    assert.equal(saved.question.id, technical[0].id);
    assert.equal(saved.question.reference, technical[0].reference);
    await capture(page, 'technical-desktop-completed');
    await page.getByRole('button', { name: '再抽一道', exact: true }).click();
    await page.getByRole('heading', { name: '骰子期望', exact: true }).waitFor();
    assert.equal(remote.envelope.data.activities.filter(item => item.kind === 'tech').length, 1);
  });
  await check('Systematic Purple Book catalog filters original numbers, selects questions, and preserves source snapshots', async () => {
    const source = { version: 1, chapter: '第一章 概率', section: '独立试验', sourcePage: '18', pdfPage: 22, edition: '浏览器测试版本',
      sourceHashSHA256: 'a'.repeat(64), sourceUrl: 'https://drive.google.com/file/d/fixture-source/view', answerStatus: 'corrected',
      sourceReference: '原书答案对照测试。', reviewNotes: '勘误说明测试：明确独立性假设。' };
    const catalog = [
      { ...technical[0], provenance: { ...source, originalNumber: '1.1' } },
      { ...technical[1], provenance: { ...source, originalNumber: '1.2', section: '期望', answerStatus: 'source' } },
      { ...technical[1], id: 'missing-answer-fixture', title: '线性代数练习', prompt: '请推导这道测试练习。', reference: '', referenceEn: '',
        provenance: { version: 1, originalNumber: '2.1', chapter: '第二章 线性代数', section: '特征值', sourcePage: '39', pdfPage: 43, answerStatus: 'missing' } },
    ];
    const fixture = await makePage({ name: 'systematic-technical', pathname: '/technical-interview', technicalQuestions: catalog });
    const view = fixture.page;
    await view.locator('.practice-catalog > summary').click();
    await view.getByLabel('章节', { exact: true }).selectOption('第二章 线性代数');
    await view.getByLabel('小节', { exact: true }).selectOption('特征值');
    await view.getByRole('searchbox', { name: '查找题目', exact: true }).fill('2.1');
    assert.equal(await view.locator('.practice-catalog-list > li').count(), 1);
    await noOverflow(view); await capture(view, 'technical-catalog-filtered');
    await view.getByRole('button', { name: '练习 2.1 线性代数练习', exact: true }).click();
    await view.getByRole('heading', { level: 2, name: '线性代数练习', exact: true }).waitFor();
    assert.equal(await view.locator('.practice-catalog').getAttribute('open'), null);
    assert.equal(await view.locator('.practice-provenance').getByText('原书未附答案', { exact: true }).count(), 1);
    await view.getByText('查看答案说明', { exact: true }).click();
    await view.getByText('原书未附本题答案。你可以先记录自己的推导。', { exact: true }).waitFor();
    await view.getByRole('textbox', { name: '你的思路与回答', exact: true }).fill('没有原书答案的题目仍能保存推导。');
    await waitFor(() => fixture.remote.envelope.data.practiceSessions?.some(item => item.question.id === 'missing-answer-fixture'), 'missing-answer draft saved');
    await view.locator('.practice-catalog > summary').click();
    await view.getByLabel('章节', { exact: true }).selectOption('第一章 概率');
    assert.equal(await view.getByLabel('小节', { exact: true }).inputValue(), '');
    await view.getByRole('searchbox', { name: '查找题目', exact: true }).fill('1.1');
    assert.equal(await view.locator('.practice-catalog-list > li').count(), 1);
    await view.clock.setFixedTime(new Date(now + 1000));
    await view.getByRole('button', { name: '随机练习当前范围 ↗', exact: true }).click();
    await view.getByRole('heading', { level: 2, name: '硬币与概率', exact: true }).waitFor();
    assert.equal(await view.locator('.practice-catalog').getAttribute('open'), null);
    await view.locator('.practice-reference > summary').click();
    await view.getByText('整理后的参考解答', { exact: true }).waitFor();
    await view.getByText('勘误说明测试：明确独立性假设。', { exact: true }).waitFor();
    await view.getByText('对照原书答案', { exact: true }).click();
    await view.getByText('原书答案对照测试。', { exact: true }).waitFor();
    await waitFor(() => fixture.remote.envelope.data.practiceSessions?.some(item => item.question.id === technical[0].id), 'provenance saved');
    const stored = structuredClone(fixture.remote.envelope.data.practiceSessions.find(item => item.question.id === technical[0].id).question);
    assert.deepEqual(stored.provenance, catalog[0].provenance);
    await noOverflow(view); await capture(view, 'technical-provenance-reference');
    catalog[0].provenance = { ...catalog[0].provenance, originalNumber: '9.9', reviewNotes: '后续版本的说明。' };
    catalog[0].reference = '后续版本的答案。';
    await view.reload({ waitUntil: 'domcontentloaded' });
    await view.locator('.practice-provenance').getByText('原书题号 1.1', { exact: true }).waitFor();
    assert.equal(await view.getByText('后续版本的答案。', { exact: true }).count(), 0);
    assert.deepEqual(fixture.remote.envelope.data.practiceSessions.find(item => item.question.id === technical[0].id).question, stored);
    assert.equal(fixture.remote.envelope.data.activities.filter(item => item.kind === 'tech').length, 0);
    await view.setViewportSize({ width: 390, height: 844 });
    await view.locator('.practice-catalog > summary').click();
    await view.getByRole('searchbox', { name: '查找题目', exact: true }).fill('不存在的题号');
    await view.getByText('没有匹配的题目，试试其他章节或更短的关键词。', { exact: true }).waitFor();
    assert.ok(await view.getByRole('button', { name: '从筛选范围抽题', exact: true }).isDisabled());
    await view.getByRole('button', { name: '清除筛选', exact: true }).click();
    await noOverflow(view); await capture(view, 'technical-catalog-mobile');
    return { catalogQuestions: catalog.length, oldSnapshotsPreserved: true, fabricatedCompletedAttempts: 0 };
  });
  await check('Training calendar shows the new independent attempts while retaining earlier history', async () => {
    await page.goto(`${baseUrl}/calendar`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: '训练日历', level: 1, exact: true }).waitFor();
    await page.getByText('硬币与概率', { exact: true }).waitFor();
    await page.getByText('两数之和', { exact: true }).waitFor();
    assert.deepEqual(remote.envelope.data.dailySessions, [legacyDaily]);
    assert.deepEqual(remote.envelope.data.activities.find(item => item.id === legacyActivity.id), legacyActivity);
    await noOverflow(page); await capture(page, 'calendar-independent-attempts');
  });
  await check('Systematic Purple Book appendix stays separate from random draws and opens official problem links', async () => {
    // Synthetic private API additions keep this public test independent of any book content.
    const technicalSupplements = {
      sourceMetadata: { title: 'Fixture book', author: 'Fixture author', edition: 'Fixture edition', pdfPageCount: 12,
        sourceUrl: 'https://drive.google.com/file/d/fixture/view' },
      readingList: [
        { id: 'fixture-first', label: 'Fixture section one', questions: [{ frontendId: '32', titleZh: '最长有效括号',
          slug: 'longest-valid-parentheses', url: 'https://leetcode.cn/problems/longest-valid-parentheses/', sourcePage: '11', pdfPage: 11 }] },
        { id: 'fixture-second', label: 'Fixture section two', questions: [{ frontendId: '20', titleZh: '有效的括号',
          slug: 'valid-parentheses', url: 'https://leetcode.cn/problems/valid-parentheses/', sourcePage: '12', pdfPage: 12 }] },
      ],
    };
    const fixture = await makePage({ name: 'private-reading-list', pathname: '/technical-interview', technicalSupplements });
    const view = fixture.page;
    await view.locator('.practice-reading-list > summary').waitFor();
    assert.equal(await view.locator('.practice-reading-list').getAttribute('open'), null);
    assert.match(await view.locator('.practice-source-credit').innerText(), /Fixture author.*Fixture edition/);
    assert.equal(await view.locator('.practice-source').innerText(), '紫皮书 · 2 道题');
    assert.match(await view.locator('.practice-start small').innerText(), /2 道题/);
    await view.locator('.practice-reading-list > summary').click();
    assert.equal(await view.locator('.practice-reading-content li a').count(), 2);
    assert.equal(await view.locator('.practice-reading-content').getByText(/Hard|Medium|Easy/).count(), 0);
    const link = view.getByRole('link', { name: '打开力扣 32. 最长有效括号', exact: true });
    assert.equal(await link.getAttribute('href'), 'https://leetcode.cn/problems/longest-valid-parentheses/');
    await waitFor(() => fixture.remote.envelope.data.activities.some(item => item.id === 'daily:legacy-daily-preserved:complete'), 'existing daily history normalization');
    const beforeLink = structuredClone(fixture.remote.envelope.data);
    const writesBeforeLink = fixture.remote.writes.length;
    const popupPromise = view.waitForEvent('popup'); await link.click();
    const popup = await popupPromise; await popup.waitForURL('https://leetcode.cn/problems/longest-valid-parentheses/'); await popup.close();
    assert.equal(fixture.remote.envelope.data.practiceSessions.length, 0);
    assert.equal(fixture.remote.reviewWrites.length, 0);
    assert.deepEqual(fixture.remote.envelope.data, beforeLink);
    assert.equal(fixture.remote.writes.length, writesBeforeLink);
    await noOverflow(view); await capture(view, 'technical-appendix-desktop');
    await view.setViewportSize({ width: 390, height: 844 });
    await view.locator('.practice-reading-list > summary').scrollIntoViewIfNeeded();
    await noOverflow(view); await capture(view, 'technical-appendix-mobile');
    return { recommendationCount: 2, availablePracticeQuestions: 2, writesFromOpeningLink: fixture.remote.writes.length - writesBeforeLink };
  });
  await check('Mobile and dark mode retain readable independent practice controls without overflow', async () => {
    for (const pathname of ['/coding-oa', '/technical-interview']) {
      const name = pathname.slice(1);
      const mobile = await makePage({ name: `mobile-${name}`, pathname, mobile: true, viewport: { width: 390, height: 844 }, dark: pathname === '/technical-interview' });
      await mobile.page.getByRole('button', { name: '抽取一道题', exact: true }).click();
      const input = mobile.page.getByRole('textbox', { name: pathname === '/coding-oa' ? '你的代码与复盘' : '你的思路与回答', exact: true });
      await input.waitFor(); await input.fill('移动端输入测试');
      if (pathname === '/technical-interview') {
        const colors = await input.evaluate(element => ({ foreground: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        }).reduce((value, channel, index) => value + channel * [0.2126, 0.7152, 0.0722][index], 0);
        const values = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => a - b);
        assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `Dark answer contrast: ${JSON.stringify(colors)}`);
      }
      await noOverflow(mobile.page); await capture(mobile.page, `mobile-${name}`);
      await input.focus(); await mobile.page.keyboard.press('Tab');
      assert.notEqual(await mobile.page.evaluate(() => document.activeElement?.tagName), 'BODY');
    }
  });
  await check('An unlinked Coding OA account shows connection guidance instead of fabricated questions', async () => {
    const unlinked = await makePage({ name: 'unlinked-coding', linked: false });
    await unlinked.page.getByText('先关联 LeetCode 账号，再从你做过的题目中抽取。', { exact: true }).waitFor();
    assert.equal(await unlinked.page.getByRole('link', { name: /管理 LeetCode 题库/ }).getAttribute('href'), '/leetcode');
    assert.equal(await unlinked.page.getByRole('button', { name: '抽取一道题', exact: true }).isEnabled().catch(() => false), false);
    assert.equal((unlinked.remote.envelope.data.practiceSessions || []).length, 0);
    await capture(unlinked.page, 'coding-unlinked');
  });
  await check('Storage quota failure keeps the answer visible and reports recovery instead of claiming a save', async () => {
    const quota = await makePage({ name: 'storage-quota' });
    await quota.page.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.restoreFixtureStorage = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('quantgym.personal-prep.v1:')) throw new DOMException('Fixture quota reached', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await quota.page.getByRole('button', { name: '抽取一道题', exact: true }).click();
    const answer = quota.page.getByRole('textbox', { name: '你的代码与复盘', exact: true });
    await answer.fill('Quota fixture answer stays visible.');
    await quota.page.getByRole('radio', { name: '独立完成', exact: true }).check();
    await quota.page.getByRole('button', { name: '保存复盘', exact: true }).click();
    await quota.page.getByText('当前作答暂存在本页，请按上方提示重试保存或导出备份。', { exact: true }).waitFor();
    assert.equal(await answer.inputValue(), 'Quota fixture answer stays visible.');
    assert.equal(await quota.page.getByText('已记录本题自评，训练日历已更新。', { exact: true }).count(), 0);
    await capture(quota.page, 'coding-storage-recovery');
    await quota.page.evaluate(() => window.restoreFixtureStorage());
    await quota.page.getByRole('button', { name: '重试保存', exact: true }).click();
    await waitFor(() => quota.remote.envelope.data.practiceSessions?.some(item => item.status === 'completed'), 'recovered private cloud save');
    assert.equal(quota.remote.envelope.data.practiceSessions.filter(item => item.status === 'completed').length, 1);
    assert.equal(quota.remote.reviewWrites.length, 0);
  });
  await check('Unavailable Purple Book API offers retry and does not substitute fallback questions', async () => {
    const unavailable = await makePage({ name: 'technical-unavailable', pathname: '/technical-interview', technicalError: true });
    await unavailable.page.getByText('题库暂时未能加载，已保存的练习仍可继续。', { exact: false }).waitFor();
    assert.ok(await unavailable.page.getByRole('button', { name: '抽取一道题', exact: true }).isDisabled());
    await unavailable.page.locator('.practice-notice').getByRole('button', { name: '重试', exact: true }).click();
    await waitFor(() => unavailable.remote.requests.filter(item => item.path === '/practice/technical/questions').length >= 2, 'technical retry');
    assert.equal((unavailable.remote.envelope.data.practiceSessions || []).length, 0);
    await capture(unavailable.page, 'technical-source-unavailable');
  });
  assert.deepEqual(summary.runtimeErrors, []);
  assert.deepEqual(summary.unexpectedLocalResponses, []);
  summary.status = 'passed';
} catch (error) {
  summary.status = 'failed'; summary.failure = { message: error.message, stack: error.stack }; process.exitCode = 1;
  if (currentPage && !currentPage.isClosed()) {
    await capture(currentPage, 'failure').catch(() => {});
    fs.writeFileSync(path.join(output, 'failure-dom.txt'), await currentPage.locator('body').innerText().catch(() => 'unavailable'));
  }
} finally {
  summary.finishedAt = new Date().toISOString();
  if (summary.status === 'passed') for (const filename of ['failure.png', 'failure-dom.txt']) fs.rmSync(path.join(output, filename), { force: true });
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  await browser?.close(); await server?.close();
}
console.log(JSON.stringify({ status: summary.status, passedChecks: summary.checks.length, failure: summary.failure?.message, summary: path.join(output, 'summary.json') }));
