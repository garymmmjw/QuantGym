import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Isolated synthetic accounts and intercepted API requests; never use real users.
const output = new URL('../artifacts/behavioral/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const base = (process.env.BEHAVIORAL_QA_URL || 'http://127.0.0.1:5176').replace(/\/$/, '');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Behavioral QA requires a local preview.');
const endpoint = 'https://behavioral-fixture.invalid/api';
const accounts = ['a', 'b'].map(suffix => ({ id: `local:behavioral-qa-${suffix}`, provider: 'local', cloudLinked: true,
  name: `Behavioral QA ${suffix}`, email: `behavioral-qa-${suffix}@example.invalid`, emailVerified: true,
  country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-19T00:00:00.000Z' }));
const tokenFor = account => `isolated-behavioral-fixture-${account.id}`;
const remote = new Map(accounts.map(account => [account.id, { version: 1, revision: 0, data: null, updatedAt: null }]));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body),
  headers: { 'access-control-allow-origin': base, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' } });
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url()), method = request.method();
  if (url.origin === base && url.pathname === '/config.js') return route.fulfill({ status: 200, contentType: 'application/javascript',
    body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
  if (url.origin === new URL(endpoint).origin || url.pathname.startsWith('/api/')) {
    if (method === 'OPTIONS') return fulfill(route, {});
    const account = accounts.find(item => request.headers().authorization === `Bearer ${tokenFor(item)}`);
    if (!account) return fulfill(route, { error: 'Fixture authentication required' }, 401);
    const pathname = url.pathname.slice('/api'.length);
    if (pathname === '/personal-prep') {
      const envelope = remote.get(account.id);
      if (method === 'GET') return fulfill(route, envelope);
      if (method === 'PUT') {
        const body = request.postDataJSON();
        if (body.baseRevision !== envelope.revision) return fulfill(route, { ...envelope, error: 'Fixture revision conflict' }, 409);
        const saved = { version: 1, revision: envelope.revision + 1, data: body.data, updatedAt: new Date().toISOString() };
        remote.set(account.id, saved);
        return fulfill(route, saved);
      }
    }
    if (pathname === '/account') return fulfill(route, { account });
    if (pathname === '/sync') return fulfill(route, { account, state: {}, problemStates: [], community: { posts: [] }, syncedAt: new Date().toISOString() });
    return fulfill(route, { problems: [], jobs: [], news: [], leaderboard: [], profiles: [], community: { posts: [] }, state: {} });
  }
  if (url.origin === base && ['GET', 'HEAD'].includes(method)) return route.continue();
  return route.abort();
});
await context.addInitScript(({ accounts, endpoint }) => {
  if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
  const account = accounts[0];
  localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts, currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: `isolated-behavioral-fixture-${account.id}`, userId: account.id }));
  localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
  for (const item of accounts) localStorage.setItem(`quantgym.ui.onboarded.v1:${item.id}`, '1');
}, { accounts, endpoint });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page has horizontal overflow');
const choose = async title => {
  await page.locator('.bp-question').filter({ hasText: title }).click();
  assert.equal(await page.locator('#bp-question-title').innerText(), title);
};
const readAnswer = () => page.locator('#bp-answer').inputValue();
const readPersonal = account => page.evaluate(id => JSON.parse(localStorage.getItem(`quantgym.personal-prep.v1:${encodeURIComponent(id)}`) || 'null')?.data, account.id);
const createQuestion = async (title, answer = '') => {
  await page.locator('.bp-heading').getByRole('button', { name: '添加问题', exact: true }).click();
  const form = page.locator('.bp-question-form');
  assert.equal(await form.locator('[type="submit"]').isEnabled(), false);
  await form.locator('#bp-question-input').fill(title);
  if (answer) await form.locator('#bp-initial-answer').fill(answer);
  await form.locator('[type="submit"]').click();
  await page.locator('#bp-answer').waitFor();
  assert.equal(await page.locator('#bp-question-title').innerText(), title);
};
const switchAccount = async account => {
  await page.evaluate(({ account, endpoint }) => {
    const auth = JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1'));
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ ...auth, currentUserId: account.id }));
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: `isolated-behavioral-fixture-${account.id}`, userId: account.id }));
  }, { account, endpoint });
  await page.reload();
  await page.getByRole('heading', { name: 'Behavioral Interview', exact: true }).waitFor();
};
try {
  await page.goto(`${base}/behavioral-interview`);
  await page.getByRole('heading', { name: '从你的第一个问题开始', exact: true }).waitFor();
  assert.equal(await page.locator('.bp-question').count(), 0);
  assert.equal(await page.locator('#bp-answer').count(), 0);
  assert.ok(!(await page.locator('.behavioral-prep').innerText()).includes('Bank of America'));
  await noOverflow();
  await page.screenshot({ path: new URL('empty.png', output).pathname, fullPage: true });

  const firstTitle = 'My project decision\nWhat did I learn?', secondTitle = 'My second private question';
  await createQuestion(firstTitle, 'My real project taught me to explain assumptions clearly.');
  assert.equal(await readAnswer(), 'My real project taught me to explain assumptions clearly.');
  assert.equal(new URL(page.url()).searchParams.has('question'), false, 'Personal question navigation stays out of the URL.');
  await createQuestion(secondTitle);
  assert.equal(await readAnswer(), '');
  assert.equal(await page.locator('.bp-question').count(), 2);
  await page.getByRole('button', { name: '编辑问题', exact: true }).click();
  await page.locator('#bp-question-input').fill('My revised second question');
  await page.getByRole('button', { name: '保存修改', exact: true }).click();
  assert.equal(await page.locator('#bp-question-title').innerText(), 'My revised second question');
  await choose(firstTitle);
  await page.locator('#bp-answer').fill('My private revision.');
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  await choose(firstTitle);
  assert.equal(await readAnswer(), 'My private revision.');
  await page.locator('#bp-answer').fill('');
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  await choose(firstTitle);
  assert.equal(await readAnswer(), '', 'A cleared answer must stay empty.');
  await page.locator('#bp-answer').fill('My own answer for the clipboard.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制回答', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'My own answer for the clipboard.');
  await noOverflow();
  await page.screenshot({ path: new URL('desktop.png', output).pathname, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: new URL('mobile.png', output).pathname, fullPage: true });
  const beforeDelete = await readPersonal(accounts[0]);
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.locator('.bp-delete-confirm').getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.locator('.bp-question').count(), 2);
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  assert.equal(await page.locator('.bp-question').count(), 1);
  const afterDelete = await readPersonal(accounts[0]);
  assert.equal(afterDelete.activities.length, beforeDelete.activities.length, 'Deleting a question keeps practice history.');
  assert.ok(afterDelete.behavioralQuestions.find(item => item.title === firstTitle).deletedAt);
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  assert.equal(await page.locator('.bp-question').count(), 1, 'Deleted questions stay hidden after reload.');

  await switchAccount(accounts[1]);
  await page.getByRole('heading', { name: '从你的第一个问题开始', exact: true }).waitFor();
  await createQuestion('Only the second account can see this', 'Second account answer');
  await switchAccount(accounts[0]);
  await page.locator('#bp-answer').waitFor();
  assert.equal(await page.locator('.bp-question').count(), 1);
  assert.equal(await page.locator('#bp-question-title').innerText(), 'My revised second question');
  assert.equal(await readAnswer(), '');
  assert.ok(!(await page.locator('.behavioral-prep').innerText()).includes('Only the second account'));
  await page.goto(`${base}/behavioral-interview?lang=en`);
  await page.getByText('My answer', { exact: true }).waitFor();
  await noOverflow();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(() => document.documentElement.setAttribute('data-qg-theme', 'dark'));
  await page.screenshot({ path: new URL('dark.png', output).pathname, fullPage: true });
  assert.deepEqual(errors, []);
  const summary = { status: 'pass', checks: ['fresh account empty', 'private question creation with optional answer', 'multiline question editing', 'private navigation without URL data', 'separate autosaved answers', 'reload persistence', 'explicit clearing', 'clipboard copy', 'delete cancellation and durable tombstone', 'practice history retained', 'same-browser account isolation', 'mobile layout', 'English labels', 'dark layout', 'no runtime errors'] };
  await fs.writeFile(new URL('summary.json', output), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), runtimeErrors: errors, body: (await page.locator('body').innerText()).slice(0, 1600) }));
  await page.screenshot({ path: new URL('failure.png', output).pathname, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
