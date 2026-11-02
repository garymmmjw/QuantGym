#!/usr/bin/env node
// Isolated browser regression check. Start Vite first, or set BASE_URL.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = (process.env.BASE_URL || 'http://127.0.0.1:5176').replace(/\/$/, '');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'This check must use a local server.');
const output = path.join(root, 'artifacts/tracker-column-widths');
const ownerId = 'local:tracker-column-widths-browser-fixture';
const trackerKey = `quantgym.tracker.v1:${encodeURIComponent(ownerId)}:qa`;
const widthsKey = `quantgym.tracker.column-widths.v1:${encodeURIComponent(ownerId)}:qa`;
const stageKey = `quantgym.career-stages.v1:${encodeURIComponent(ownerId)}:qa`;
const endpoint = 'https://tracker-width-fixture.invalid/api';
const account = { id: ownerId, provider: 'local', cloudLinked: true, name: 'Tracker Width QA', email: 'tracker-width@example.invalid',
  country: 'china', region: '上海', graduationTerm: '2027-09', passwordHash: 'fixture-not-a-real-password', createdAt: '2026-01-01T00:00:00Z' };
const applications = ['Capstone', 'Time Seventeen', 'Aquatic', 'Schonfeld', 'A deliberately long company name for ellipsis'].map((company, index) => ({
  id: `width-application-${index}`, company, role: index === 1 ? 'Quant Intern' : 'Summer 2027 Quantitative Research Intern', prepPhase: 'width-stage', season: '',
  events: (index === 0 ? ['submitted', 'oa_received', 'oa_completed', 'interview', 'interview_completed', 'interview'] : ['submitted']).map((type, eventIndex) => ({
    id: `width-event-${index}-${eventIndex}`, type, date: `2026-11-${String(Math.max(1, 2 - index)).padStart(2, '0')}`, year: 2026,
    dueDate: index === 0 && eventIndex === 5 ? '2026-11-09' : '', dueTime: index === 0 && eventIndex === 5 ? '18:00' : '',
    ...(type.startsWith('interview') ? { interviewRound: 'Superday' } : {}),
  })),
}));
const defaults = { company: 190, role: 285, 'event-0': 160, 'event-1': 240, 'event-2': 240, 'event-3': 240, 'event-4': 240, 'event-5': 240, update: 130, deadline: 160 };
const summary = { startedAt: new Date().toISOString(), isolation: 'Fresh Chromium context, fictional account, QA tracker namespace, all non-local requests intercepted.', checks: [], screenshots: [], runtimeErrors: [], localResponseErrors: [] };
let browser, page;

function closeTo(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1, `${label}: expected ${expected}px, received ${actual}px`);
}
async function measure() {
  return page.evaluate(() => ({
    columns: Object.fromEntries([...document.querySelectorAll('.qt-progress-table thead th[data-column-id]')].map(th => [th.dataset.columnId, th.getBoundingClientRect().width])),
    total: document.querySelector('.qt-progress-table').getBoundingClientRect().width,
  }));
}
async function expectWidths(expected) {
  await page.waitForFunction(values => Object.entries(values).every(([id, width]) => {
    const th = document.querySelector(`.qt-progress-table thead th[data-column-id="${id}"]`);
    return th && Math.abs(th.getBoundingClientRect().width - width) < 1;
  }), expected);
  const actual = await measure();
  assert.deepEqual(Object.keys(actual.columns), Object.keys(expected));
  for (const [id, width] of Object.entries(expected)) closeTo(actual.columns[id], width, id);
  closeTo(actual.total, Object.values(expected).reduce((sum, width) => sum + width, 0), 'table total');
  return actual;
}
const handle = id => page.locator(`.qt-progress-table thead th[data-column-id="${id}"] .qt-column-resizer`);
async function drag(id, delta) {
  const resizer = handle(id);
  await resizer.scrollIntoViewIfNeeded();
  const box = await resizer.boundingBox();
  assert.ok(box && box.width >= 4 && box.height >= 24, `${id} needs a usable resize target`);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: 8 });
  await page.mouse.up();
}
async function screenshot(name) {
  const target = path.join(output, name);
  await page.screenshot({ path: target, fullPage: true });
  summary.screenshots.push(path.relative(root, target));
}
async function check(name, action) {
  await action();
  summary.checks.push(name);
  console.log(`PASS ${name}`);
}

try {
  await fs.mkdir(output, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN', timezoneId: 'America/Chicago',
    hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(({ account, endpoint, applications, trackerKey, stageKey }) => {
    if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: 'fixture-token-not-valid-anywhere', userId: account.id }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
    localStorage.setItem('quantgym.ui.theme.v1', 'light');
    localStorage.setItem(trackerKey, JSON.stringify({ version: 3, ownerId: account.id, applications, deletedEvents: [] }));
    localStorage.setItem(stageKey, JSON.stringify({ version: 1, ownerId: account.id, stages: [{ id: 'width-stage', label: 'Stage 4', description: '', recordedDate: '2026-10-01', importedIds: [] }] }));
  }, { account, endpoint, applications, trackerKey, stageKey });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) {
      if (url.pathname === '/config.js') return route.fulfill({ contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
      return route.continue();
    }
    if (url.href.startsWith(endpoint)) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ account, state: {}, problemStates: [], jobs: [], news: [], problems: [], leaderboard: [], community: { posts: [] }, syncedAt: new Date().toISOString() }) });
    if (request.resourceType() === 'script') return route.fulfill({ contentType: 'application/javascript', body: '' });
    if (request.resourceType() === 'stylesheet') return route.fulfill({ contentType: 'text/css', body: '' });
    return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => summary.runtimeErrors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(`${base}/`) && response.status() >= 400) summary.localResponseErrors.push({ url: response.url(), status: response.status() });
  });
  await page.goto(`${base}/tracker?qa=column-widths`, { waitUntil: 'domcontentloaded' });
  await page.locator('.qt-application-row').first().waitFor();

  await check('default widths preserve company names with six long progress columns', async () => {
    await expectWidths(defaults);
    const names = await page.locator('.qt-company-name').evaluateAll(elements => elements.map(el => ({
      text: el.textContent.trim(), title: el.getAttribute('title'), height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el).lineHeight), whiteSpace: getComputedStyle(el).whiteSpace,
      clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
    })));
    assert.equal(names.length, applications.length);
    for (const name of names) {
      assert.equal(name.title, name.text);
      assert.equal(name.whiteSpace, 'nowrap');
      assert.ok(name.height <= name.lineHeight + 1, `${name.text} must stay on one line`);
      if (name.text.length < 20) assert.ok(name.scrollWidth <= name.clientWidth + 1, `${name.text} should fit the default column`);
    }
    assert.ok((await measure()).columns.company >= 180);
    assert.equal(await page.getByRole('separator').count(), Object.keys(defaults).length);
    await screenshot('desktop-default.png');
  });

  const resized = { ...defaults, company: 275, role: 330, update: 155, deadline: 130 };
  await check('dragging a column changes only that column and the total table width', async () => {
    const before = await measure();
    await drag('company', 85);
    const after = await expectWidths({ ...defaults, company: resized.company });
    closeTo(after.total - before.total, 85, 'total width increase');
    await drag('role', 45);
    await expectWidths({ ...defaults, company: resized.company, role: resized.role });
    await drag('update', 25);
    await expectWidths({ ...defaults, company: resized.company, role: resized.role, update: resized.update });
    await drag('deadline', -30);
    await expectWidths(resized);
  });

  await check('filters, search, compact view and reload preserve user column widths', async () => {
    await page.getByRole('button', { name: '按公司', exact: true }).click();
    await expectWidths(resized);
    await page.getByRole('searchbox', { name: '搜索公司或岗位' }).fill('Capstone');
    await page.waitForFunction(() => document.querySelectorAll('.qt-application-row').length === 1);
    await expectWidths(resized);
    await page.getByRole('button', { name: '清空搜索', exact: true }).click();
    await page.getByRole('button', { name: '切换为紧凑视图', exact: true }).click();
    await expectWidths(resized);
    await page.getByRole('button', { name: '切换为表格视图', exact: true }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.qt-application-row').first().waitFor();
    await expectWidths(resized);
    await page.locator('.qt-table-scroll').evaluate(el => { el.scrollLeft = 0; });
    await screenshot('desktop-resized.png');
  });

  const expanded = { ...resized };
  delete expanded.update; delete expanded.deadline;
  Object.assign(expanded, { 'event-6': 240, update: resized.update, deadline: resized.deadline });
  await check('a newly added progress column does not shift saved update or deadline widths', async () => {
    await page.evaluate(key => {
      const data = JSON.parse(localStorage.getItem(key));
      data.applications[0].events.push({ id: 'width-extra-event', type: 'custom', customLabel: 'Additional follow-up meeting', date: '2026-11-02', year: 2026, dueDate: '', dueTime: '' });
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('quantgym:tracker-updated', { detail: { key } }));
    }, trackerKey);
    await expectWidths(expanded);
  });

  await check('double-click and keyboard resizing are independent, clamped and resettable', async () => {
    await handle('company').dblclick();
    expanded.company = defaults.company;
    await expectWidths(expanded);
    await handle('role').focus();
    await page.keyboard.press('ArrowRight');
    expanded.role += 10;
    await expectWidths(expanded);
    await page.keyboard.press('Shift+ArrowLeft');
    expanded.role -= 50;
    await expectWidths(expanded);
    await page.keyboard.press('Home');
    expanded.role = defaults.role;
    await expectWidths(expanded);
    const minimum = Number(await handle('company').getAttribute('aria-valuemin'));
    assert.ok(minimum > 0 && minimum < defaults.company, 'Company minimum must be available to keyboard users.');
    await handle('company').focus();
    for (let step = 0; step < 25; step += 1) await page.keyboard.press('ArrowLeft');
    expanded.company = minimum;
    await expectWidths(expanded);
    await page.keyboard.press('Home');
    expanded.company = defaults.company;
    await expectWidths(expanded);
  });

  await check('Escape and cancelled touch drags restore widths, saved preferences and the cursor', async () => {
    const before = await page.evaluate(key => ({ saved: localStorage.getItem(key), cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }), widthsKey);
    await handle('company').scrollIntoViewIfNeeded();
    let box = await handle('company').boundingBox();
    let x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 5 });
    await expectWidths({ ...expanded, company: expanded.company + 60 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expectWidths(expanded);
    assert.deepEqual(await page.evaluate(key => ({ saved: localStorage.getItem(key), cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }), widthsKey), before);

    box = await handle('company').boundingBox();
    x = box.x + box.width / 2; y = box.y + box.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 40, y }] });
    await expectWidths({ ...expanded, company: expanded.company + 40 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await cdp.detach();
    await expectWidths(expanded);
    assert.deepEqual(await page.evaluate(key => ({ saved: localStorage.getItem(key), cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }), widthsKey), before);
  });

  await check('narrow screens keep column widths and scroll within the table', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.qt-table-scroll').evaluate(el => { el.scrollLeft = 0; });
    await expectWidths(expanded);
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector('.qt-table-scroll');
      const company = document.querySelector('.qt-company-cell');
      const before = company.getBoundingClientRect().left;
      scroller.scrollLeft = 400;
      return { tableScroll: scroller.scrollLeft, scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth,
        bodyWidth: document.documentElement.scrollWidth, viewport: window.innerWidth, stickyDelta: company.getBoundingClientRect().left - before };
    });
    assert.ok(overflow.scrollWidth > overflow.clientWidth);
    assert.ok(overflow.tableScroll > 0);
    assert.ok(overflow.bodyWidth <= overflow.viewport + 1, 'Table must not make the entire page scroll horizontally.');
    closeTo(overflow.stickyDelta, 0, 'frozen company column');
    await page.locator('.qt-table-scroll').evaluate(el => { el.scrollLeft = 0; });
    await screenshot('mobile-default.png');
  });

  await check('touch dragging resizes a column on a narrow screen', async () => {
    await handle('company').scrollIntoViewIfNeeded();
    const box = await handle('company').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 30, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    expanded.company += 30;
    await expectWidths(expanded);
    await screenshot('mobile-resized.png');
  });

  await check('reset-all restores every default and remains reset after reload', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: '恢复默认列宽', exact: true }).click();
    const allDefaults = { ...defaults };
    delete allDefaults.update; delete allDefaults.deadline;
    Object.assign(allDefaults, { 'event-6': 240, update: defaults.update, deadline: defaults.deadline });
    await expectWidths(allDefaults);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectWidths(allDefaults);
  });

  await check('malformed saved widths fall back safely and oversized valid widths are clamped', async () => {
    const allDefaults = { ...defaults };
    delete allDefaults.update; delete allDefaults.deadline;
    Object.assign(allDefaults, { 'event-6': 240, update: defaults.update, deadline: defaults.deadline });
    await page.evaluate(key => localStorage.setItem(key, '{broken json'), widthsKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectWidths(allDefaults);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ company: -20, role: '400', 'event-0': null, deadline: 999999, 'not-a-column': 1500 })), widthsKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await handle('deadline').waitFor();
    const maximum = Number(await handle('deadline').getAttribute('aria-valuemax'));
    assert.ok(maximum >= defaults.deadline && maximum < 999999);
    await expectWidths({ ...allDefaults, deadline: maximum });
    await page.getByRole('button', { name: '恢复默认列宽', exact: true }).click();
    await expectWidths(allDefaults);
    assert.deepEqual(summary.runtimeErrors, []);
    assert.deepEqual(summary.localResponseErrors, []);
  });
  summary.status = 'passed';
} catch (error) {
  summary.status = 'failed';
  summary.failure = error.stack || String(error);
  if (page) summary.lastMeasurement = await measure().catch(() => null);
  if (page) await screenshot('failure.png').catch(() => {});
  process.exitCode = 1;
  console.error(error);
} finally {
  summary.finishedAt = new Date().toISOString();
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await browser?.close();
  console.log(`Tracker column check: ${summary.status}; ${summary.checks.length} checks. Evidence: ${output}`);
}
