#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createPersonalState, personalStorageKey, validatePersonalData } from '../src/features/personal/personalStore.js';
import { createTrial, normalizeMentalSettings, transitionTrial } from '../src/features/personal/mental/mentalEngine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'artifacts/mental-redesign');
fs.mkdirSync(output, { recursive: true });
const baseUrl = process.env.MENTAL_QA_URL || 'http://localhost:5176';
const ownerId = 'local:mental-redesign-qa';
const storageKey = personalStorageKey(ownerId);
const account = { id: ownerId, provider: 'local', name: 'Mental Design QA', email: 'mental-redesign-qa@quantgym.local', country: 'china', region: '上海', graduationTerm: '2027-09', passwordHash: '6246e686ac437c36bc94b6bd3b6cf9e578267cad791c8b2c1ea13e286b011f92', createdAt: '2026-06-17T00:00:00.000Z' };
const seed = createPersonalState();
seed.mentalSettings = normalizeMentalSettings({ durationSeconds: 10 });
for (let index = 0; index < 3; index++) {
  const at = Date.now() - (index + 1) * 86400000;
  let trial = createTrial({ ...seed.mentalSettings, durationSeconds: index === 0 ? 10 : 120 }, { now: at, id: `mental-redesign-seed-${index}` });
  for (let answer = 0; answer < 4 + index; answer++) trial = transitionTrial(trial, { type: 'input', value: String(trial.currentQuestion.answer) }, at + (answer + 1) * 900);
  seed.trials.push(transitionTrial(trial, { type: 'tick' }, Date.parse(trial.deadlineAt)));
}
validatePersonalData(seed);
const summary = { baseUrl, account: ownerId, startedAt: new Date().toISOString(), checks: [], screenshots: [], runtimeErrors: [], responseErrors: [], ignoredExternalErrors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
const contexts = [];

async function makePage(options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 1000 }, deviceScaleFactor: 1, locale: 'zh-CN', isMobile: options.mobile || false, hasTouch: options.mobile || false, reducedMotion: options.reducedMotion || 'no-preference' });
  contexts.push(context);
  await context.addInitScript(({ account, storageKey, seed, denyFullscreen }) => {
    if (!localStorage.getItem('quantMemoryBoard.auth.v1')) {
      localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
      localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
      localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, ownerId: account.id, updatedAt: new Date().toISOString(), data: seed }));
    }
    if (denyFullscreen) Element.prototype.requestFullscreen = () => Promise.reject(new DOMException('QA fullscreen denial', 'NotAllowedError'));
  }, { account, storageKey, seed, denyFullscreen: options.denyFullscreen || false });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => summary.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) summary.responseErrors.push({ status: response.status(), url: response.url() }); });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (/GSI_LOGGER|ERR_CONNECTION_REFUSED|status of 403|google|ERR_TIMED_OUT/.test(message.text())) summary.ignoredExternalErrors.push(message.text());
    else summary.runtimeErrors.push(message.text());
  });
  await page.clock.install();
  await page.goto(`${baseUrl}/tools`, { waitUntil: 'domcontentloaded' });
  await page.locator('.pm-module-gallery').waitFor();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
  return page;
}
async function capture(page, name, fullPage = false) {
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage, animations: 'disabled' });
  summary.screenshots.push(filename);
}
async function check(name, fn) {
  process.stdout.write(`${name}\n`);
  const details = await fn();
  summary.checks.push({ name, status: 'passed', ...(details || {}) });
}
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).data, storageKey);
const noOverflow = async page => {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.width + 1, JSON.stringify(dimensions));
  return dimensions;
};
async function openModule(page, kind) {
  await page.locator(`.pm-module-card-${kind}`).click();
  await page.locator('.pm-module-layout').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('trainer'), kind);
}
async function startPractice(page) {
  await page.locator('[data-pm-start]').click();
  await page.locator('.pm-focus').waitFor();
  await page.clock.runFor(100);
}
async function finishPreparation(page) {
  await page.clock.runFor(5100);
  await page.locator('.pm-focus .pm-arena').waitFor();
}
async function exitChecks(page) {
  await page.locator('.pm-focus').waitFor({ state: 'detached' });
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  assert.equal((await stored(page)).activeTrial, null);
}

try {
  const page = await makePage();
  await check('Three large gallery modules; hover grows current and shrinks siblings', async () => {
    assert.equal(await page.locator('.pm-module-card').count(), 3);
    assert.equal(await page.locator('.pm-setup').count(), 0);
    await capture(page, 'gallery-desktop');
    const before = await page.locator('.pm-module-card-math').boundingBox();
    await page.locator('.pm-module-card-math').hover();
    await page.clock.runFor(400);
    const hover = await page.locator('.pm-module-card-math').boundingBox();
    const sibling = await page.locator('.pm-module-card-sequence').evaluate(element => getComputedStyle(element).transform);
    assert.ok(hover.width > before.width, `Expected hover growth: ${before.width} -> ${hover.width}`);
    assert.ok(Number(sibling.match(/matrix\(([^,]+)/)?.[1]) < 1, sibling);
    await capture(page, 'gallery-hover');
    await page.locator('.pm-module-card-sequence').hover();
    await page.clock.runFor(400);
    const moved = await page.locator('.pm-module-card-math').evaluate(element => getComputedStyle(element).transform);
    assert.ok(Number(moved.match(/matrix\(([^,]+)/)?.[1]) < 1, moved);
    return { height: before.height, hoverWidth: hover.width, normalWidth: before.width };
  });
  await check('Math setup left, history right; settings and keyboard remain accessible', async () => {
    await openModule(page, 'math');
    const setup = await page.locator('.pm-setup').boundingBox();
    const history = await page.locator('.pm-module-history').boundingBox();
    assert.ok(history.x > setup.x + setup.width - 1);
    assert.equal(await page.locator('.pm-history tbody tr').count(), 3);
    await page.locator('.pm-duration input').fill('10');
    await page.locator('.pm-range-settings summary').click();
    await page.getByRole('spinbutton', { name: 'add A 最小值' }).fill('1');
    await page.getByRole('spinbutton', { name: 'add A 最大值' }).fill('99');
    await page.locator('.pm-range-settings summary').click();
    await page.locator('.pm-range-settings summary').focus();
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, type: document.activeElement.type, hidden: !!document.activeElement.closest('details:not([open]) .pm-range-grid') }));
    assert.equal(focus.hidden, false);
    await page.locator('.pm-workspace-heading h2').focus();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'math-setup-desktop', true);
    await page.locator('.pm-module-back').click();
    await page.locator('.pm-module-gallery').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('trainer'), null);
    await openModule(page, 'math');
    return { setup, history, nextKeyboardFocus: focus };
  });
  await check('Cancellation during preparation exits fullscreen without saving a trial', async () => {
    const count = (await stored(page)).trials.length;
    await startPractice(page);
    await capture(page, 'countdown-desktop');
    await page.keyboard.press('Escape');
    await exitChecks(page);
    assert.equal((await stored(page)).trials.length, count);
  });
  await check('Math answer advances; timed completion saves and automatically exits fullscreen', async () => {
    await startPractice(page);
    const nativeFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    await finishPreparation(page);
    assert.equal(await page.locator('.pm-focus .pm-module-history').count(), 0);
    const trial = (await stored(page)).activeTrial;
    await page.locator('.pm-focus .pm-answer').fill(String(trial.currentQuestion.answer));
    assert.equal((await stored(page)).activeTrial.correct, 1);
    assert.equal(await page.locator('.pm-focus .pm-answer').inputValue(), '');
    await capture(page, 'math-focus-desktop');
    await page.clock.runFor(10100);
    await exitChecks(page);
    const record = (await stored(page)).trials.find(item => item.id === trial.id);
    assert.equal(record.status, 'completed');
    assert.equal(record.correct, 1);
    await page.locator('.pm-session-result').waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, 'math-complete-desktop', true);
    return { nativeFullscreen, savedTrialId: record.id };
  });
  await check('History selection and setting reuse; reload keeps saved records', async () => {
    const historyRows = page.locator('.pm-history tbody tr');
    await historyRows.last().getByRole('button').click();
    await page.getByRole('button', { name: /使用该次设置/ }).click();
    assert.equal(await page.locator('.pm-duration input').inputValue(), '120');
    const count = (await stored(page)).trials.length;
    await page.clock.resume();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-pm-start]').waitFor();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    assert.equal((await stored(page)).trials.length, count);
    await page.locator('.pm-duration input').fill('10');
  });
  await check('Escape during active math saves early ending and exits', async () => {
    await startPractice(page);
    await finishPreparation(page);
    const id = (await stored(page)).activeTrial.id;
    await page.keyboard.press('Escape');
    await exitChecks(page);
    assert.equal((await stored(page)).trials.find(trial => trial.id === id).status, 'aborted');
  });
  for (const kind of ['sequence', 'pattern']) {
    await check(`${kind}: settings, full-screen question, answer feedback, next, automatic return`, async () => {
      await page.locator('.pm-module-back').click();
      await openModule(page, kind);
      await page.locator('.pm-duration input').fill('10');
      await page.getByLabel('难度', { exact: true }).selectOption('easy');
      if (kind === 'sequence') await page.getByLabel('序列类型', { exact: true }).selectOption('letters');
      await capture(page, `${kind}-setup-desktop`, true);
      await startPractice(page);
      await finishPreparation(page);
      const trial = (await stored(page)).activeTrial;
      await capture(page, `${kind}-focus-desktop`);
      if (kind === 'sequence') {
        await page.locator('.pm-reasoning-answer input').fill(trial.currentQuestion.answer);
        const answerSize = await page.locator('.pm-reasoning-answer input').evaluate(element => ({ height: element.clientHeight, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) }));
        assert.ok(answerSize.height >= answerSize.fontSize * 1.4, JSON.stringify(answerSize));
        await capture(page, 'sequence-answer-desktop');
      } else {
        await page.getByRole('button', { name: new RegExp(`^选项 ${trial.currentQuestion.answer}：`) }).click();
      }
      await page.getByRole('button', { name: /提交答案/ }).click();
      await page.locator('.pm-reasoning-feedback').waitFor();
      assert.equal((await stored(page)).activeTrial.correct, 1);
      await page.getByRole('button', { name: /下一题/ }).click();
      await page.clock.runFor(10100);
      await exitChecks(page);
      assert.equal((await stored(page)).trials.find(item => item.id === trial.id).status, 'completed');
      assert.equal(await page.locator('.pm-history tbody tr').count(), 1);
    });
  }
  await check('Fullscreen denial still provides immersive practice and clean automatic return', async () => {
    const denied = await makePage({ denyFullscreen: true });
    await openModule(denied, 'math');
    await startPractice(denied);
    assert.equal(await denied.evaluate(() => !!document.fullscreenElement), false);
    await finishPreparation(denied);
    await capture(denied, 'fullscreen-fallback');
    await denied.clock.runFor(10100);
    await exitChecks(denied);
  });
  await check('Mobile gallery, setup, and question fit viewport without horizontal overflow', async () => {
    const mobile = await makePage({ viewport: { width: 390, height: 844 }, mobile: true });
    const gallery = await noOverflow(mobile);
    await capture(mobile, 'gallery-mobile', true);
    await openModule(mobile, 'math');
    const setup = await noOverflow(mobile);
    await capture(mobile, 'math-setup-mobile', true);
    await startPractice(mobile);
    await finishPreparation(mobile);
    const math = await noOverflow(mobile);
    await capture(mobile, 'math-focus-mobile');
    await mobile.clock.runFor(10100);
    await exitChecks(mobile);
    await mobile.locator('.pm-module-back').click();
    await openModule(mobile, 'pattern');
    await mobile.locator('.pm-duration input').fill('10');
    await startPractice(mobile);
    await finishPreparation(mobile);
    const pattern = await noOverflow(mobile);
    const overlay = await mobile.evaluate(() => {
      const element = document.querySelector('.pm-focus');
      const rect = element.getBoundingClientRect();
      const corners = [[1, 1], [innerWidth - 1, 1], [1, innerHeight - 1], [innerWidth - 1, innerHeight - 1]].map(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.pm-focus')));
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, corners };
    });
    assert.deepEqual(overlay.corners, [true, true, true, true]);
    await capture(mobile, 'pattern-focus-mobile');
    await mobile.locator('.pm-focus').evaluate(element => { element.scrollTop = element.scrollHeight; });
    const exitButton = await mobile.locator('.pm-focus-exit').boundingBox();
    assert.ok(exitButton.y >= 0 && exitButton.y + exitButton.height <= 844, JSON.stringify(exitButton));
    await capture(mobile, 'pattern-focus-mobile-scrolled');
    await mobile.clock.runFor(10100);
    await exitChecks(mobile);
    return { gallery, setup, math, pattern, overlay };
  });
  await check('Reduced motion disables gallery scale animation', async () => {
    const reduced = await makePage({ reducedMotion: 'reduce' });
    await reduced.locator('.pm-module-card-math').hover();
    await reduced.clock.runFor(400);
    assert.equal(await reduced.locator('.pm-module-card-math').evaluate(element => getComputedStyle(element).transform), 'none');
  });
  assert.deepEqual(summary.runtimeErrors, []);
  assert.deepEqual(summary.responseErrors, []);
  summary.status = 'passed';
} catch (error) {
  summary.status = 'failed';
  summary.failure = error.stack || error.message;
  summary.diagnostics = await Promise.all(contexts.flatMap(context => context.pages()).map(async page => ({ url: page.url(), body: (await page.locator('body').innerText()).slice(-5000) })));
  process.exitCode = 1;
} finally {
  summary.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
}
