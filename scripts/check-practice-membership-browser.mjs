import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createPersonalState, personalStorageKey } from '../src/features/personal/personalStore.js';
import { normalizeDailySettings } from '../src/features/personal/daily/dailyEngine.js';

const base = process.env.PRACTICE_MEMBERSHIP_QA_URL || 'http://127.0.0.1:5176';
const endpoint = 'https://practice-membership-fixture.invalid/api';
const account = { id: 'local:practice-membership-qa', name: 'Practice QA', provider: 'local', cloudLinked: true, emailVerified: true, email: 'practice@example.invalid', country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-20T00:00:00Z' };
const sources = ['quantguide', 'interview-xiaohongshu', 'interview-onepoint3acres', 'interview-glassdoor', 'question-bank'];
const problems = (await Promise.all(sources.map(async source => {
  const file = process.env.FREE_PRACTICE_QA_BANKS_DIR ? path.join(process.env.FREE_PRACTICE_QA_BANKS_DIR, source, 'problems.json') : new URL(`../data/question-banks/${source}/problems.json`, import.meta.url);
  const bank = JSON.parse(await fs.readFile(file, 'utf8'));
  return bank.problems.slice(0, 3);
}))).flat();
const purpleId = problems.find(problem => problem.source === 'question-bank').id;
const publicQuestion = problems.find(problem => problem.source === 'quantguide');
const output = new URL('../artifacts/practice-membership/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
let isMember = false;
let failNextCatalog = false;
const members = [];
let syncedState = { problems, problemStates: [] };
let personal = createPersonalState();
personal.dailySettings = normalizeDailySettings({ mentalEnabled: false, techCount: 1, behavioralCount: 0 });
let personalRevision = 1;
const errors = [];
const checks = [];
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  if (url.origin === new URL(base).origin && url.pathname === '/config.js') return route.fulfill({ contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
  if (url.origin === new URL(endpoint).origin || url.pathname.startsWith('/api/')) {
    const available = problems.filter(problem => isMember || problem.source !== 'question-bank');
    if (request.method() === 'OPTIONS') return json({});
    if (url.pathname === '/api/problems' && failNextCatalog) {
      failNextCatalog = false;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture catalog temporarily unavailable' }) });
    }
    if (url.pathname === '/api/membership') return json({ isMember: isMember || account.isAdmin === true });
    if (url.pathname === '/api/admin/memberships') {
      if (request.method() === 'POST') members.push({ email: request.postDataJSON().email, updatedAt: new Date().toISOString() });
      return json({ memberships: members });
    }
    if (url.pathname.startsWith('/api/admin/memberships/') && request.method() === 'DELETE') {
      const email = decodeURIComponent(url.pathname.split('/').at(-1));
      members.splice(members.findIndex(member => member.email === email), 1);
      return json({ email });
    }
    if (url.pathname === '/api/personal-prep') {
      if (request.method() === 'PUT') { personal = request.postDataJSON().data; personalRevision += 1; }
      return json({ version: 1, revision: personalRevision, data: personal, updatedAt: new Date().toISOString() });
    }
    if (url.pathname === '/api/sync' && request.method() === 'POST') {
      const body = request.postDataJSON();
      syncedState = { ...syncedState, ...body.state, problemStates: body.problemStates || syncedState.problemStates };
    }
    if (url.pathname === '/api/account') return json({ account });
    return json({ account, problems: available, state: { ...syncedState, problems: available }, problemStates: syncedState.problemStates, community: { posts: [] }, syncedAt: new Date().toISOString() });
  }
  if ((url.origin === new URL(base).origin || ['unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) && ['GET', 'HEAD'].includes(request.method())) return route.continue();
  return route.abort();
});
await context.addInitScript(({ account, endpoint, problems, personal, personalKey }) => {
  if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
  localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: 'isolated-fixture-token', userId: account.id }));
  localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
  localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  localStorage.setItem(`quantMemoryBoard.userState.v1.${account.id}`, JSON.stringify({ problems, problemStates: [] }));
  localStorage.setItem(personalKey, JSON.stringify({ version: 1, ownerId: account.id, updatedAt: new Date().toISOString(), data: personal }));
}, { account, endpoint, problems, personal, personalKey: personalStorageKey(account.id) });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => errors.push(error.message));
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
try {
  await check('one card grid, renamed collections, unique symbols, member collection last', async () => {
    await page.goto(`${base}/problems`);
    await page.locator('[data-bank-card="purple"]').waitFor();
    await page.waitForFunction(() => Boolean(window.lucide));
    await page.evaluate(() => window.lucide.createIcons());
    assert.deepEqual(await page.locator('[data-bank-card]').evaluateAll(cards => cards.map(card => card.dataset.bankCard)), ['quantguide', 'xiaohongshu', 'onepoint3acres', 'glassdoor', 'purple']);
    assert.deepEqual(await page.locator('.fp-bank-copy h3').allTextContents(), ['蓝宝书', '红宝书', '种田秘籍', '绿宝书', '葵花宝典']);
    assert.deepEqual(await page.locator('.fp-bank-copy p').allTextContents(), ['量化面试精选题', '小红书面经', '一亩三分地面经', 'Glassdoor 面经', '量化面试进阶题集']);
    assert.equal(await page.locator('.fp-book-grid > .fp-bank-featured').count(), 5);
    assert.equal(await page.locator('.fp-home-section-title, .fp-bank-kind, .fp-interview-banks').count(), 0);
    assert.equal(new Set(await page.locator('.fp-bank-icon svg').evaluateAll(icons => icons.map(icon => icon.innerHTML))).size, 5);
    assert.match(await page.locator('[data-bank-card="purple"]').innerText(), /会员专享/);
    await noOverflow();
    await page.screenshot({ path: new URL('desktop-question-banks.png', output).pathname, fullPage: true });
  });
  await check('member protection covers stale cached question and misleading bank URL', async () => {
    await page.goto(`${base}/problems?bank=quantguide&question=${encodeURIComponent(purpleId)}`);
    await page.locator('.fp-member-access, .fp-empty').waitFor();
    assert.equal(await page.locator('#problemDetail, .fp-question-row').count(), 0);
    await page.goto(`${base}/problems?bank=purple&question=${encodeURIComponent(purpleId)}`);
    await page.locator('.fp-member-access').waitFor();
    await page.screenshot({ path: new URL('member-access.png', output).pathname, fullPage: true });
  });
  await check('membership grant retries a failed catalog load and revocation hides content', async () => {
    isMember = true;
    failNextCatalog = true;
    await page.getByRole('button', { name: '重新检查权限' }).click();
    await page.getByText('暂时无法确认会员权限，请稍后重试。', { exact: true }).waitFor();
    assert.equal(await page.locator('#problemDetail').count(), 0);
    await page.getByRole('button', { name: '重新检查权限' }).click();
    await page.locator('#problemDetail .qg-detail-title').waitFor();
    isMember = false;
    await page.evaluate(() => window.dispatchEvent(new Event('quantgym:membership-changed')));
    await page.locator('.fp-member-access').waitFor();
    assert.equal(await page.locator('#problemDetail, .fp-question-row').count(), 0);
  });
  await check('mobile and dark layout keep the same grid and access state', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/problems`);
    await page.locator('[data-bank-card="purple"]').waitFor();
    await noOverflow();
    await page.screenshot({ path: new URL('mobile-question-banks.png', output).pathname, fullPage: true });
    await page.evaluate(() => document.documentElement.setAttribute('data-qg-theme', 'dark'));
    await page.screenshot({ path: new URL('mobile-dark-question-banks.png', output).pathname, fullPage: true });
  });
  await check('recorded question result automatically completes daily technical goal once', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/overview`);
    await page.locator('.overview-daily-tasks').waitFor();
    assert.equal(await page.locator('.overview-daily-tasks a[href="/problems"].is-done').count(), 0);
    await page.goto(`${base}/problems?bank=quantguide&question=${encodeURIComponent(publicQuestion.id)}`);
    await page.locator('[data-practice-outcome="wrong"]').click();
    await page.locator('[data-practice-outcome="correct"]').click();
    assert.equal(await page.locator('[data-free-practice-attempt-count]').innerText(), '1');
    await page.goto(`${base}/overview`);
    await page.locator('.overview-daily-tasks a[href="/problems"].is-done').waitFor();
    await page.screenshot({ path: new URL('daily-goal-complete.png', output).pathname, fullPage: true });
  });
  await check('question identity overrides conflicting bank URL and old technical route redirects', async () => {
    await page.goto(`${base}/problems?bank=purple&question=${encodeURIComponent(publicQuestion.id)}`);
    await page.locator('#problemDetail .qg-detail-title').waitFor();
    assert.equal(await page.locator('.fp-header h1').innerText(), '蓝宝书');
    await page.goto(`${base}/technical-interview?bank=quantguide&question=${encodeURIComponent(publicQuestion.id)}`);
    await page.locator('[data-free-practice-root]').waitFor();
    assert.equal(new URL(page.url()).pathname, '/problems');
    assert.equal(new URL(page.url()).searchParams.get('question'), publicQuestion.id);
  });
  await check('administrator can add, search and remove a membership email', async () => {
    account.isAdmin = true;
    account.subscriptionTier = 'admin';
    await page.evaluate(account => {
      const auth = JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1'));
      auth.accounts = auth.accounts.map(value => value.id === account.id ? { ...value, ...account } : value);
      localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify(auth));
    }, account);
    await page.goto(`${base}/account?section=memberships`);
    await page.getByRole('heading', { name: '会员邮箱名单', exact: true }).waitFor();
    await page.getByRole('textbox', { name: '会员邮箱', exact: true }).fill('NEW-MEMBER@example.invalid');
    await page.getByRole('button', { name: '添加会员', exact: true }).click();
    await page.getByText('new-member@example.invalid', { exact: true }).waitFor();
    assert.equal(members[0].email, 'new-member@example.invalid');
    await page.getByRole('searchbox', { name: '搜索会员邮箱', exact: true }).fill('new-member');
    await page.screenshot({ path: new URL('admin-memberships.png', output).pathname, fullPage: true });
    await page.getByRole('button', { name: '移除会员', exact: true }).click();
    await page.getByText('没有匹配的会员邮箱。', { exact: true }).waitFor();
    assert.equal(members.length, 0);
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('summary.json', output), JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: new URL('failure.png', output).pathname, fullPage: true });
  console.error((await page.locator('body').innerText()).slice(0, 2400));
  throw error;
} finally { await browser.close(); }
