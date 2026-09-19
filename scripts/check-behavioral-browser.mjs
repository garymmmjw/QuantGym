import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { BEHAVIORAL_PREP_QUESTIONS } from '../src/features/personal/behavioral/questions.js';

const output = new URL('../artifacts/behavioral/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const base = process.env.BEHAVIORAL_QA_URL || 'http://127.0.0.1:5176';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const account = { id: 'local:behavioral-qa', provider: 'local', name: 'Behavioral QA', email: 'behavioral-qa@quantgym.local', country: 'china', region: '上海', graduationTerm: '2027-09', passwordHash: '6246e686ac437c36bc94b6bd3b6cf9e578267cad791c8b2c1ea13e286b011f92', createdAt: '2026-09-19T00:00:00.000Z' };
await context.addInitScript(account => {
  if (!localStorage.getItem('quantMemoryBoard.auth.v1')) {
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  }
}, account);
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page has horizontal overflow');
const choose = async label => {
  await page.locator('.bp-question').filter({ hasText: label }).click();
  await page.waitForFunction(title => document.querySelector('#bp-question-title')?.textContent === title, BEHAVIORAL_PREP_QUESTIONS.find(question => question.label === label).title);
};
const readAnswer = () => page.locator('#bp-answer').inputValue();
try {
  await page.goto(`${base}/behavioral`);
  await page.locator('#bp-answer').waitFor();
  assert.equal(await readAnswer(), BEHAVIORAL_PREP_QUESTIONS.at(-1).answer);
  assert.equal(await page.locator('.bp-section').count(), 2);
  assert.equal(await page.locator('.bp-question').count(), 6);
  assert.ok(await page.locator('[data-module-tab="behavioral-interview"]').first().isVisible());
  await noOverflow();
  await page.screenshot({ path: new URL('desktop.png', output).pathname, fullPage: true });
  await choose('Quick introduction');
  assert.equal(await readAnswer(), '');
  await page.locator('#bp-answer').fill('My real project taught me to explain assumptions clearly.');
  await choose('Why BofA?');
  await page.locator('#bp-answer').fill(`${BEHAVIORAL_PREP_QUESTIONS.at(-1).answer}\n\nMy personal revision.`);
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  assert.ok((await readAnswer()).endsWith('My personal revision.'), JSON.stringify({ url: page.url(), answer: await readAnswer(), stored: await page.evaluate(() => localStorage.getItem('quantgym.personal-prep.v1:local%3Abehavioral-qa')) }));
  await choose('Quick introduction');
  assert.equal(await readAnswer(), 'My real project taught me to explain assumptions clearly.');
  await choose('Your strength');
  assert.equal(await readAnswer(), '');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#bp-question-title')?.textContent === 'Tell me about yourself.');
  assert.equal(await readAnswer(), 'My real project taught me to explain assumptions clearly.');
  await choose('Why BofA?');
  await page.locator('#bp-answer').fill('');
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  assert.equal(await readAnswer(), '', 'Clearing the sample must not revive it');
  await page.locator('#bp-answer').fill(BEHAVIORAL_PREP_QUESTIONS.at(-1).answer);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制回答', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), BEHAVIORAL_PREP_QUESTIONS.at(-1).answer);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: new URL('mobile.png', output).pathname, fullPage: true });
  await choose('Showing leadership');
  await page.locator('#bp-answer').fill('A leadership example drafted on mobile.');
  await page.reload();
  await page.locator('#bp-answer').waitFor();
  assert.equal(await readAnswer(), 'A leadership example drafted on mobile.');
  await page.goto(`${base}/behavioral?lang=en&question=bofa-why`);
  await page.getByText('My answer in English', { exact: true }).waitFor();
  await noOverflow();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(() => document.documentElement.setAttribute('data-qg-theme', 'dark'));
  await page.screenshot({ path: new URL('dark.png', output).pathname, fullPage: true });
  assert.deepEqual(errors, []);
  const summary = { status: 'pass', checks: ['two sections and six questions', 'BofA initial answer', 'sidebar navigation', 'separate answer drafts', 'refresh persistence', 'back navigation', 'explicit clearing', 'clipboard copy', 'mobile editing and layout', 'English labels', 'dark layout', 'no runtime errors'] };
  await fs.writeFile(new URL('summary.json', output), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), runtimeErrors: errors, body: (await page.locator('body').innerText()).slice(0, 1600) }));
  await page.screenshot({ path: new URL('failure.png', output).pathname, fullPage: true });
  throw error;
} finally {
  await browser.close();
}
