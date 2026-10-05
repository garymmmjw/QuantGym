import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { installFreePracticeFixture } from './lib/free-practice-browser-fixture.mjs';

const base = process.env.FREE_PRACTICE_QA_URL || 'http://127.0.0.1:5176';
const output = new URL('../artifacts/free-practice-timer/', import.meta.url);
const ids = ['timer-fixture-question-1', 'timer-fixture-question-2'];
const accounts = ['active', 'recovery'].map(suffix => ({
  id: `local:timer-fixture-${suffix}`, name: `Timer ${suffix}`, provider: 'local',
  cloudLinked: true, emailVerified: true, email: `timer-${suffix}@example.invalid`,
  country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-01T00:00:00.000Z',
}));
const problems = ids.map((id, index) => ({
  id, source: 'question-bank', bookSlug: 'question-bank', visibility: 'private',
  titleZh: `计时测试题 ${index + 1}`, titleEn: `Timer fixture ${index + 1}`,
  promptZh: '一加一等于多少？', promptEn: 'What is one plus one?',
  answer: '2', explanation: '1 + 1 = 2.', category: 'probabilityExpectation', difficulty: 'Easy',
  practiceTaxonomy: { chapterId: 'timer-chapter', chapterZh: '计时测试', chapterEn: 'Timer tests',
    chapterOrder: 1, sectionId: 'timer-section', sectionZh: '练习', sectionEn: 'Exercises', sectionOrder: 1, questionOrder: index + 1 },
}));
const old = '2026-09-01T12:00:00.000Z';
const initialStates = { [accounts[1].id]: { problemStates: [
  { problemId: ids[0], updatedAt: old, freePracticeSession: { id: 'legacy-timer', startedAt: old, answerViewed: true } },
  { problemId: ids[1], updatedAt: old, freePracticeSession: { id: 'interrupted-timer', startedAt: old, elapsedMs: 45000, timerStartedAt: old } },
] } };
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
await installFreePracticeFixture(context, { base, accounts, problems, initialStates });
await context.addInitScript(({ accounts, initialStates }) => {
  if (localStorage.getItem('quantMemoryBoard.auth.v1')) return;
  localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts, currentUserId: accounts[0].id, lastAuthenticatedAt: new Date().toISOString() }));
  localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
  for (const account of accounts) {
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
    localStorage.setItem(`quantMemoryBoard.userState.v1.${account.id}`, JSON.stringify(initialStates[account.id] || { problemStates: [] }));
  }
}, { accounts, initialStates });
const page = await context.newPage();
await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
page.setDefaultTimeout(15000);
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
let accountId = accounts[0].id;
const timer = () => page.locator('[data-free-practice-timer]');
const detail = async id => {
  await page.waitForFunction(id => new URL(location.href).searchParams.get('question') === id, id);
  await page.locator('#problemDetail .qg-detail-title').filter({ hasText: problems.find(problem => problem.id === id).titleZh }).waitFor();
  await timer().waitFor();
};
const readState = id => page.evaluate(({ id, accountId }) => {
  const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
  return state.problemStates?.find(row => row.problemId === id) || {};
}, { id, accountId });
const seconds = async () => (await timer().innerText()).match(/\d+(?::\d+)+/)[0].split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
const near = (actual, expected, reason) => assert.ok(Math.abs(actual - expected) <= 3, `${reason}: expected about ${expected}s, got ${actual}s`);
const advance = async seconds => page.clock.fastForward(seconds * 1000);
const paused = async id => {
  await page.waitForFunction(({ id, accountId }) => {
    const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
    return state.problemStates?.find(row => row.problemId === id)?.freePracticeSession?.timerStartedAt === null;
  }, { id, accountId });
  const session = (await readState(id)).freePracticeSession;
  assert.ok(session, 'Leaving an unfinished question must preserve its session');
  assert.equal(session.timerStartedAt, null, 'A question outside the active view must be paused');
  return session.elapsedMs;
};
const setVisibility = hidden => page.evaluate(hidden => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
const check = async (name, run) => {
  await run();
  checks.push({ name, status: 'pass' });
  console.log(`PASS ${name}`);
};

try {
  await check('opening a question counts active time', async () => {
    await page.goto(`${base}/problems?bank=purple&question=${ids[0]}`);
    await detail(ids[0]);
    near(await seconds(), 0, 'New session');
    await advance(12);
    near(await seconds(), 12, 'Visible question');
  });

  await check('returning to the list pauses; reopening resumes without the away gap', async () => {
    await page.locator('.fp-reading-nav > button').click();
    await page.locator(`.fp-question-row[data-problem-id="${ids[0]}"]`).waitFor();
    const elapsed = await paused(ids[0]);
    await advance(300);
    assert.equal(await paused(ids[0]), elapsed);
    await page.locator(`.fp-question-row[data-problem-id="${ids[0]}"]`).click();
    await detail(ids[0]);
    near(await seconds(), elapsed / 1000, 'Reopened question');
    await advance(7);
    near(await seconds(), elapsed / 1000 + 7, 'Resumed question');
  });

  await check('next and previous count only the selected question', async () => {
    await page.locator('.fp-reading-nav > div button').last().click();
    await detail(ids[1]);
    const firstElapsed = await paused(ids[0]);
    near(await seconds(), 0, 'Second question starts independently');
    await advance(19);
    assert.equal(await paused(ids[0]), firstElapsed);
    await page.locator('.fp-reading-nav > div button').first().click();
    await detail(ids[0]);
    near(await seconds(), firstElapsed / 1000, 'Previous question resumes');
    near((await paused(ids[1])) / 1000, 19, 'Second question pauses');
  });

  await check('navigating to another route pauses the question', async () => {
    await page.locator('[data-module-tab="overview"]').click();
    await page.waitForURL(url => url.pathname !== '/problems');
    await timer().waitFor({ state: 'detached' });
    const elapsed = await paused(ids[0]);
    await advance(300);
    assert.equal(await paused(ids[0]), elapsed);
    await page.goBack();
    await detail(ids[0]);
    near(await seconds(), elapsed / 1000, 'Returning from another route');
  });

  await check('a hidden tab pauses and becoming visible resumes', async () => {
    await setVisibility(true);
    const elapsed = await paused(ids[0]);
    await advance(180);
    assert.equal(await paused(ids[0]), elapsed);
    await setVisibility(false);
    await advance(8);
    near(await seconds(), elapsed / 1000 + 8, 'Visible after a hidden interval');
  });

  await check('pagehide and pageshow exclude time outside the active page', async () => {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    const elapsed = await paused(ids[0]);
    await advance(180);
    assert.equal(await paused(ids[0]), elapsed);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await advance(6);
    near(await seconds(), elapsed / 1000 + 6, 'Page restored from cache');
  });

  await check('reload preserves active duration and an outcome freezes it', async () => {
    const before = await seconds();
    await page.reload();
    await detail(ids[0]);
    near(await seconds(), before, 'Reloaded session');
    await advance(9);
    await page.locator('[data-practice-outcome="correct"]').click();
    await page.locator('[data-practice-outcome="correct"][aria-pressed="true"]').waitFor();
    const state = await readState(ids[0]);
    assert.equal(state.freePracticeAttempts.length, 1);
    assert.equal(state.freePracticeSession, null);
    near(state.freePracticeAttempts[0].elapsedSeconds, before + 9, 'Recorded active duration');
    const recorded = await seconds();
    await advance(300);
    assert.equal(await seconds(), recorded, 'The completed attempt must remain frozen');
    await page.screenshot({ path: new URL('completed-timer.png', output).pathname, fullPage: true });
  });

  await check('legacy and interrupted sessions do not count time spent away', async () => {
    accountId = accounts[1].id;
    await page.evaluate(accountId => {
      const auth = JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1'));
      localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ ...auth, currentUserId: accountId, lastAuthenticatedAt: new Date().toISOString() }));
    }, accountId);
    await page.reload();
    await detail(ids[0]);
    near(await seconds(), 0, 'Legacy session with an old wall-clock start');
    await page.locator('.fp-reading-nav > div button').last().click();
    await detail(ids[1]);
    near(await seconds(), 45, 'Interrupted session keeps only its saved active duration');
    await advance(5);
    near(await seconds(), 50, 'Interrupted session resumes normally');
  });

  assert.deepEqual(errors, [], 'Browser runtime errors');
} catch (error) {
  checks.push({ name: 'timer regression', status: 'fail', error: error.message, url: page.url() });
  console.error(error);
  await page.screenshot({ path: new URL('failure.png', output).pathname, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  const summary = { status: process.exitCode ? 'fail' : 'pass', base, checks, runtimeErrors: errors };
  await fs.writeFile(new URL('summary.json', output), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  await browser.close();
}
