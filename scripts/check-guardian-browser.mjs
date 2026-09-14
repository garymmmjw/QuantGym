import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.GUARDIAN_WEB_URL || 'http://127.0.0.1:5176';
const output = new URL('../artifacts/guardian/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Chicago' });
const errors = [];
const session = { token: 'fixture-guardian-token', expiresAt: new Date(Date.now() + 3600000).toISOString(), student: { name: '测试同学' } };
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
let goals = [{ id: 'fixture-goal', title: '每天向前一步', targetCount: 10, progress: 3, startDate: date, endDate: date, timeZone: 'America/Chicago', reward: '周末一起看电影', status: 'active', createdAt: new Date().toISOString(), notificationStatus: null }];
let reminderCalls = 0;
let reminder = { lastSentAt: null, nextAllowedAt: null, status: null };
await context.route('**/api/guardian/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  const body = request.postDataJSON();
  if (path !== '/api/guardian/session') assert.equal(request.headers().authorization, `Bearer ${session.token}`);
  let data;
  let status = 200;
  if (path === '/api/guardian/session') {
    if (request.method() === 'DELETE') data = { ok: true };
    else if (body.code === 'valid-fixture-code') data = session;
    else { status = 401; data = { error: 'Invalid guardian code' }; }
  } else if (path === '/api/guardian/dashboard') {
    data = { student: session.student, date, timeZone: 'America/Chicago', summary: { todayCount: 3, totalCount: 58, datedCount: 3, undatedLeetcodeCount: 55, leetcodeLifetimeSolvedCount: 56, activeDays: 1, completedGoals: 1 }, questions: [{ id: 'q1', title: '抛硬币的期望次数', titleEn: 'Coin flips', kind: 'tech', problemNumber: '4.2', count: 1, completedAt: new Date().toISOString(), source: 'manual' }, { id: 'q2', title: 'Two Sum', kind: 'coding', problemNumber: '1', count: 1, completedAt: new Date().toISOString(), source: 'leetcode' }, { id: 'math-session', title: 'Mental Math', kind: 'mental', count: 1, completedCount: 58, isSummary: true, completedAt: new Date().toISOString(), source: 'automatic' }], goals, emailConfigured: true, reminder, syncedAt: new Date().toISOString(), countingNote: 'Mental Math 每次训练计入总数 1 题，明细显示完成题数；LeetCode 按账户同步记录统计。' };
  } else if (path === '/api/guardian/goals') {
    const goal = { ...body, id: 'new-goal', status: 'active', progress: 0, createdAt: new Date().toISOString() };
    goals = [goal, ...goals];
    data = { goal };
  } else if (path.startsWith('/api/guardian/goals/')) {
    goals = goals.map(goal => goal.id === path.split('/').at(-1) ? { ...goal, status: 'cancelled' } : goal);
    data = { goal: goals.find(goal => goal.id === path.split('/').at(-1)) };
  } else if (path === '/api/guardian/reminders') {
    reminderCalls += 1;
    assert.deepEqual(Object.keys(body), ['message']);
    reminder = { ...reminder, status: 'pending', nextAllowedAt: new Date(Date.now() + 3600000).toISOString() };
    data = { notification: { id: 'mail-fixture', status: 'pending', createdAt: new Date().toISOString() }, nextAllowedAt: reminder.nextAllowedAt };
  } else throw new Error(`Unexpected guardian route ${path}`);
  await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/login`);
  await page.getByText('我是监护人', { exact: false }).click();
  await page.locator('#guardianAccessCode').fill('invalid-fixture');
  await page.getByRole('button', { name: '进入监护人系统', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '监护码无效' }).waitFor();
  await page.locator('#guardianAccessCode').fill('valid-fixture-code');
  await page.getByRole('button', { name: '进入监护人系统', exact: true }).click();
  await page.waitForURL('**/guardian');
  await page.locator('.guardian-question-table strong').filter({ hasText: '抛硬币的期望次数' }).waitFor();
  assert.equal(await page.locator('.guardian-question-table tbody tr').count(), 3, '58 math questions occupy one summary row');
  assert.equal(await page.locator('.guardian-stat-featured strong').innerText(), '3', '58 math questions plus two regular questions add only 3 to today');
  assert.equal(await page.locator('.guardian-stat strong').nth(1).innerText(), '58', 'lifetime LeetCode history is included without duplicating known problems');
  assert.match(await page.locator('.guardian-history-note').innerText(), /56.*55/);
  await page.getByText('完成了 58 道', { exact: true }).waitFor();
  assert.deepEqual(await page.locator('.guardian-problem-number').allTextContents(), ['题号 4.2 · ', '题号 1 · ']);
  assert.equal(await page.locator('#appShell').count(), 0, 'guardian must not render student shell');
  assert.equal(await page.locator('#loginForm').count(), 0);
  await page.screenshot({ path: new URL('dashboard-desktop.png', output).pathname, fullPage: true });
  const storage = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(sessionStorage))));
  assert.ok(!storage.includes('valid-fixture-code'), 'shared access code must not persist');
  await page.reload();
  await page.locator('.guardian-question-table strong').filter({ hasText: '抛硬币的期望次数' }).waitFor();
  await page.getByRole('button', { name: '设置目标', exact: true }).click();
  await page.locator('[name=title]').fill('一周挑战');
  await page.locator('[name=targetCount]').fill('25');
  await page.locator('[name=reward]').fill('一本喜欢的书');
  await page.getByRole('button', { name: '保存目标', exact: true }).click();
  await page.getByRole('heading', { name: '一周挑战', exact: true }).waitFor();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: '一周挑战', exact: true }) }).getByRole('button', { name: '取消目标' }).click();
  await page.getByRole('button', { name: '确认取消', exact: true }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: '一周挑战', exact: true }) }).getByText('已取消', { exact: true }).waitFor();
  await page.locator('#guardian-reminder-message').fill('今天也加油！');
  await page.getByRole('button', { name: '发送邮件提醒', exact: true }).click();
  await page.getByText('提醒已加入发送队列', { exact: false }).waitFor();
  assert.equal(reminderCalls, 1);
  assert.ok(await page.getByRole('button', { name: '请稍后再发送', exact: true }).isDisabled());
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile has horizontal overflow');
  await page.screenshot({ path: new URL('dashboard-mobile.png', output).pathname, fullPage: true });
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await page.getByRole('heading', { name: '进入监护人空间', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: '进入监护人空间', exact: true }).waitFor();
  await page.screenshot({ path: new URL('entry-mobile.png', output).pathname, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'pass', checks: ['login code error', 'code entry navigation', 'guardian token isolation', 'no student shell', 'tab session survives reload', 'shared code not persisted', 'create and cancel goal', 'reminder recipient restriction and cooldown', 'mobile width', 'logout clears session'], screenshots: output.pathname, reminderCalls }));
} finally { await browser.close(); }
