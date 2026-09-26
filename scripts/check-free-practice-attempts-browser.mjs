import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { installFreePracticeFixture } from './lib/free-practice-browser-fixture.mjs';

const output = new URL('../artifacts/free-practice-attempts/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const base = process.env.FREE_PRACTICE_QA_URL || 'http://127.0.0.1:5176';
const stopOnFailure = process.argv.includes('--stop-on-failure');
const accountIds = ['local:practice-attempts-qa-a', 'local:practice-attempts-qa-b'];
const accounts = accountIds.map((id, index) => ({ id, provider: 'local', cloudLinked: true, emailVerified: true, name: `Attempt QA ${index + 1}`, email: `attempts-qa-${index + 1}@example.invalid`, country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-20T00:00:00.000Z' }));
// Local file overrides keep licensed question content outside the release tree.
const purplePath = process.env.FREE_PRACTICE_QA_PURPLE || new URL('../data/question-banks/question-bank/problems.json', import.meta.url);
const source = JSON.parse(await fs.readFile(purplePath, 'utf8'));
const purpleProblems = Array.isArray(source) ? source : source.problems;
assert.ok(Array.isArray(purpleProblems), 'The Purple Book fixture must contain a problem array');
if (process.env.FREE_PRACTICE_QA_PURPLE) assert.equal(purpleProblems.length, 140, 'Expected the reviewed 140-question Purple Book');
const problems = new Map(purpleProblems.map(problem => [problem.id, problem]));
const catalogPath = process.env.FREE_PRACTICE_QA_CATALOG;
const catalogFile = catalogPath ? JSON.parse(await fs.readFile(catalogPath, 'utf8')) : null;
const catalog = catalogFile ? (Array.isArray(catalogFile) ? catalogFile : catalogFile.problems) : null;
assert.ok(catalog === null || Array.isArray(catalog), 'The catalog fixture must contain a problem array');
const bankSources = { purple: 'question-bank', quantguide: 'quantguide', xiaohongshu: 'interview-xiaohongshu', onepoint3acres: 'interview-onepoint3acres', glassdoor: 'interview-glassdoor' };
const expectedCounts = catalog ? Object.fromEntries(Object.entries(bankSources).map(([bank, source]) => [bank, catalog.filter(problem => problem.source === source).length])) : null;
let catalogResponses = 0;
const ids = ['catalog-problem-001', 'catalog-problem-002', 'catalog-problem-003'];
assert.ok(ids.every(id => problems.has(id)), 'Expected stable purple-book questions');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
await installFreePracticeFixture(context, { base, accounts, problems: catalog || purpleProblems });
if (catalog) {
  const catalogScript = `window.quantProblemCatalog = ${JSON.stringify(catalog)};`;
  await context.route('**/data/problem-catalog.js*', async route => {
    catalogResponses++;
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: catalogScript });
  });
}
await context.addInitScript(accounts => {
  if (!localStorage.getItem('quantMemoryBoard.auth.v1')) {
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts, currentUserId: accounts[0].id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    for (const account of accounts) localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
  }
}, accounts);
const page = await context.newPage();
await page.clock.install({ time: new Date('2026-09-20T12:00:00.000Z') });
page.setDefaultTimeout(15000);
const errors = [];
const checks = [];
const screenshots = [];
const evidence = {};
page.on('pageerror', error => errors.push(error.message));
let currentAccountId = accountIds[0];

const screenshot = async name => {
  await page.screenshot({ path: new URL(name, output).pathname, fullPage: true });
  screenshots.push(name);
};
// Member verification can refresh the complete external catalog on navigation.
const detail = () => page.locator('#problemDetail .qg-detail-title').waitFor({ timeout: 30000 });
const open = async (id, extra = {}) => {
  await page.goto(`${base}/problems?${new URLSearchParams({ bank: 'purple', question: id, ...extra })}`);
  await detail();
};
const readState = async (problemId, accountId = currentAccountId) => page.evaluate(({ problemId, accountId }) => {
  const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
  return (state.problemStates || []).find(item => item.problemId === problemId) || {};
}, { problemId, accountId });
const matchingStates = async (problemId, accountId = currentAccountId) => page.evaluate(({ problemId, accountId }) => {
  const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
  return (state.problemStates || []).filter(item => item.problemId === problemId);
}, { problemId, accountId });
const attempts = async (problemId, accountId = currentAccountId) => (await readState(problemId, accountId)).freePracticeAttempts || [];
const waitForAttemptCount = async (problemId, count) => page.waitForFunction(({ problemId, accountId, count }) => {
  const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
  const row = (state.problemStates || []).find(item => item.problemId === problemId);
  return (row?.freePracticeAttempts || []).length === count;
}, { problemId, accountId: currentAccountId, count });
const switchAccount = async accountId => {
  await page.evaluate(accountId => {
    const auth = JSON.parse(localStorage.getItem('quantMemoryBoard.auth.v1'));
    auth.currentUserId = accountId;
    auth.lastAuthenticatedAt = new Date().toISOString();
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify(auth));
  }, accountId);
  currentAccountId = accountId;
  await page.reload();
  await detail();
};
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile page has horizontal overflow');
const timer = () => page.locator('[data-free-practice-timer]');
const countLabel = () => page.locator('[data-free-practice-attempt-count]');
const outcomeButton = outcome => page.locator(`button[data-practice-outcome="${outcome}"]`);
const selectedOutcome = async () => page.locator('button[data-practice-outcome][aria-pressed="true"]').getAttribute('data-practice-outcome');
const timerSeconds = text => String(text).match(/\d+(?::\d+)+/)?.[0].split(':').reduce((seconds, segment) => seconds * 60 + Number(segment), 0) || 0;
const assertVisibleCount = async count => {
  await page.waitForFunction(count => {
    const text = document.querySelector('[data-free-practice-attempt-count]')?.textContent || '';
    return Number(text.match(/\d+/)?.[0]) === count;
  }, count);
};
const waitForOutcome = async (problemId, outcome, count) => {
  await waitForAttemptCount(problemId, count);
  await page.waitForFunction(({ problemId, accountId, outcome }) => {
    const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
    const row = (state.problemStates || []).find(item => item.problemId === problemId);
    return row?.freePracticeAttempts?.at(-1)?.outcome === outcome;
  }, { problemId, accountId: currentAccountId, outcome });
  await page.locator(`button[data-practice-outcome="${outcome}"][aria-pressed="true"]`).waitFor();
  await page.locator('[data-practice-cooldown]').waitFor();
  await assertVisibleCount(count);
};
const check = async (name, run) => {
  if (stopOnFailure && checks.some(item => item.status === 'fail')) return;
  try {
    await run();
    checks.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, status: 'fail', error: error.message, url: page.url() });
    console.error(`FAIL ${name}: ${error.message}`);
    const problemId = new URL(page.url()).searchParams.get('question');
    const snapshot = {
      check: name, problemId, accountId: currentAccountId,
      state: problemId ? await readState(problemId).catch(() => null) : null,
      matchingStates: problemId ? await matchingStates(problemId).catch(() => null) : [],
      ui: await page.evaluate(() => ({ now: new Date().toISOString(), timer: document.querySelector('[data-free-practice-timer]')?.textContent, count: document.querySelector('[data-free-practice-attempt-count]')?.textContent, outcomes: [...document.querySelectorAll('[data-practice-outcome]')].map(element => ({ outcome: element.dataset.practiceOutcome, pressed: element.getAttribute('aria-pressed') })), cooldown: document.querySelector('[data-practice-cooldown]')?.textContent || null })).catch(() => null),
      runtimeErrors: [...errors],
    };
    (evidence.failures ||= []).push(snapshot);
    console.error(JSON.stringify(snapshot));
    await screenshot(`failure-${checks.length}.png`).catch(() => {});
  }
};

let firstAttempt;
let stoppedTimer;
try {
  await check('opening starts a timer; revealing the answer does not record an attempt', async () => {
    await open(ids[0]);
    await timer().waitFor();
    await assertVisibleCount(0);
    assert.equal((await attempts(ids[0])).length, 0);
    assert.equal(await page.locator('button[data-practice-outcome]').count(), 3);
    assert.equal(await page.locator('button[data-practice-outcome][aria-pressed="true"]').count(), 0);
    const initialSeconds = timerSeconds(await timer().innerText());
    await page.clock.fastForward(65000);
    await page.waitForFunction(minimum => {
      const text = document.querySelector('[data-free-practice-timer]')?.textContent || '';
      const seconds = text.match(/\d+(?::\d+)+/)?.[0].split(':').reduce((value, segment) => value * 60 + Number(segment), 0) || 0;
      return seconds >= minimum;
    }, initialSeconds + 65);
    const sessionBeforeAnswer = (await readState(ids[0])).freePracticeSession;
    assert.ok(sessionBeforeAnswer, 'An active timer session must be persisted');
    await page.locator('[data-practice-show-answer]').click();
    await page.locator('.qg-block-answer.is-unlocked').waitFor();
    assert.equal((await attempts(ids[0])).length, 0);
    await assertVisibleCount(0);
    const timerBeforeReload = timerSeconds(await timer().innerText());
    await page.reload();
    await detail();
    await timer().waitFor();
    assert.ok(timerSeconds(await timer().innerText()) >= timerBeforeReload, 'Reload must resume the same timer');
    assert.equal((await attempts(ids[0])).length, 0);
    evidence.timerBeforeAnswer = sessionBeforeAnswer;
    await screenshot('desktop-timer-answer.png');
  });

  await check('each of the three outcomes creates exactly one attempt on its question', async () => {
    for (const [index, outcome] of ['correct', 'idea_wrong', 'wrong'].entries()) {
      await open(ids[index]);
      await assertVisibleCount(0);
      const before = await readState(ids[index]);
      await outcomeButton(outcome).click();
      await waitForOutcome(ids[index], outcome, 1);
      const after = await readState(ids[index]);
      assert.equal((await matchingStates(ids[index])).length, 1, 'Each problem must retain exactly one personal-state row');
      assert.equal(Boolean(after.completed), Boolean(before.completed), 'Practice results must not rewrite legacy completion');
      assert.equal(Number(after.interviewCount || 0), Number(before.interviewCount || 0), 'Practice must not increment interview counts');
      const saved = (await attempts(ids[index]))[0];
      assert.ok(Number.isFinite(Date.parse(saved.recordedAt)), 'The attempt needs an immutable recording time');
      if (index === 0) firstAttempt = saved;
    }
    evidence.initialOutcomes = await Promise.all(ids.map(async problemId => ({ problemId, attempts: await attempts(problemId) })));
  });

  await check('changing outcomes within 24 hours revises the same attempt without changing recordedAt', async () => {
    assert.ok(firstAttempt, 'Initial attempt must have succeeded');
    await open(ids[0]);
    await page.clock.fastForward(2 * 60 * 60 * 1000);
    for (const outcome of ['idea_wrong', 'wrong']) {
      await outcomeButton(outcome).click();
      await waitForOutcome(ids[0], outcome, 1);
      const [record] = await attempts(ids[0]);
      assert.equal(record.recordedAt, firstAttempt.recordedAt);
      assert.equal(record.id, firstAttempt.id);
    }
    stoppedTimer = await timer().innerText();
    evidence.revisedAttempt = (await attempts(ids[0]))[0];
    await screenshot('desktop-revised-result.png');
  });

  await check('refresh preserves the selected outcome, frozen timer and count', async () => {
    await page.reload();
    await detail();
    await outcomeButton('wrong').waitFor();
    assert.equal(await selectedOutcome(), 'wrong');
    await assertVisibleCount(1);
    assert.equal(await timer().innerText(), stoppedTimer);
    assert.equal((await attempts(ids[0]))[0].recordedAt, firstAttempt.recordedAt);
  });

  await check('after 24 hours selection clears without counting; the next choice records attempt two', async () => {
    const recordedAt = Date.parse(firstAttempt.recordedAt);
    const now = await page.evaluate(() => Date.now());
    const almostExpired = recordedAt + 24 * 60 * 60 * 1000 - 60000;
    assert.ok(almostExpired > now);
    await page.clock.fastForward(almostExpired - now);
    assert.equal(await selectedOutcome(), 'wrong');
    assert.equal((await attempts(ids[0])).length, 1);
    await page.clock.fastForward(62000);
    await page.waitForFunction(() => document.querySelectorAll('button[data-practice-outcome][aria-pressed="true"]').length === 0);
    assert.equal(await page.locator('[data-practice-cooldown]').count(), 0);
    await assertVisibleCount(1);
    assert.equal((await attempts(ids[0])).length, 1, 'Expiration alone must not count as a new practice attempt');
    await page.clock.fastForward(10000);
    await outcomeButton('correct').click();
    await waitForOutcome(ids[0], 'correct', 2);
    const records = await attempts(ids[0]);
    assert.equal(records[0].recordedAt, firstAttempt.recordedAt);
    assert.ok(Date.parse(records[1].recordedAt) - recordedAt >= 24 * 60 * 60 * 1000);
    assert.notEqual(records[1].id, records[0].id);
    evidence.afterExpiry = records;
    await screenshot('desktop-second-attempt.png');
  });

  await check('question and account histories stay separate in the same browser context', async () => {
    assert.equal((await attempts(ids[1], accountIds[0])).length, 1);
    assert.equal((await attempts(ids[2], accountIds[0])).length, 1);
    await open(ids[1]);
    await assertVisibleCount(1);
    assert.equal((await attempts(ids[0])).length, 2);
    await open(ids[0]);
    await switchAccount(accountIds[1]);
    await assertVisibleCount(0);
    assert.equal(await page.locator('button[data-practice-outcome][aria-pressed="true"]').count(), 0);
    assert.equal((await attempts(ids[0])).length, 0);
    await outcomeButton('wrong').click();
    await waitForOutcome(ids[0], 'wrong', 1);
    await open(ids[1]);
    await assertVisibleCount(0);
    assert.equal((await attempts(ids[1])).length, 0);
    await open(ids[0]);
    await switchAccount(accountIds[0]);
    await assertVisibleCount(2);
    assert.equal(await selectedOutcome(), 'correct');
    assert.equal((await attempts(ids[0], accountIds[1])).length, 1);
    assert.equal((await attempts(ids[1], accountIds[1])).length, 0);
    evidence.accountCounts = await Promise.all(accountIds.map(async accountId => ({ accountId, counts: await Promise.all(ids.map(async problemId => ({ problemId, count: (await attempts(problemId, accountId)).length }))) })));
  });

  await check('notes, bookmarks, chapter navigation and library bank entry continue to work with practice results', async () => {
    if (catalog) {
      await page.goto(`${base}/problems`);
      await page.locator('[data-bank-card="purple"] [data-bank-count]').waitFor();
      assert.equal(await page.locator('[data-bank-card]').count(), 5);
      const actualCounts = await page.locator('[data-bank-card]').evaluateAll(cards => Object.fromEntries(cards.map(card => [card.dataset.bankCard, Number(card.querySelector('[data-bank-count]').textContent.replace(/,/g, ''))])));
      assert.deepEqual(actualCounts, expectedCounts);
      assert.equal(actualCounts.purple, purpleProblems.length);
      await screenshot('release-bank-directory.png');
      const visitedBanks = [];
      for (const [bank, source] of Object.entries(bankSources)) {
        await page.locator(`[data-bank-card="${bank}"] .fp-bank-open`).click();
        await page.locator('.fp-group[data-group-id]').first().waitFor();
        await page.locator('.fp-question-row').first().waitFor();
        assert.equal(new URL(page.url()).searchParams.get('bank'), bank);
        const rowIds = await page.locator('.fp-question-row').evaluateAll(rows => rows.map(row => row.dataset.problemId));
        const expectedIds = new Set(catalog.filter(problem => problem.source === source).map(problem => problem.id));
        assert.ok(rowIds.length > 0 && rowIds.length <= 20);
        assert.ok(rowIds.every(id => expectedIds.has(id)), `${bank}: all rows must belong to this source`);
        visitedBanks.push({ bank, total: actualCounts[bank], visibleRows: rowIds.length, groups: await page.locator('.fp-group[data-group-id]').count() });
        await page.locator('.fp-breadcrumbs button').first().click();
        await page.locator('[data-bank-card="purple"]').waitFor();
      }
      evidence.bankDirectory = { actualCounts, visitedBanks };
    }
    await page.goto(`${base}/library`);
    const libraryCard = page.locator('.library-card[data-library-id="quantguide"]');
    await libraryCard.waitFor();
    await libraryCard.locator('.library-practice-btn').click();
    await page.waitForFunction(() => location.pathname === '/problems' && new URL(location.href).searchParams.get('bank') === 'quantguide');
    await page.locator('.fp-question-row').first().waitFor();
    assert.equal(await page.locator('.fp-header h1').innerText(), '蓝宝书');
    assert.equal(await page.locator('.fp-group[data-group-id]').count(), 5);
    evidence.libraryNavigation = { pathname: new URL(page.url()).pathname, bank: new URL(page.url()).searchParams.get('bank'), groups: 5 };
    await screenshot('release-library-practice.png');
    const taxonomy = problems.get(ids[0]).practiceTaxonomy;
    await open(ids[0], { group: taxonomy.chapterId, section: taxonomy.sectionId });
    await page.locator('.qg-detail-notes').fill('Attempt QA: preserve this note independently of my result.');
    if (!await page.locator('.qg-detail-bookmark.active').count()) await page.locator('.qg-detail-bookmark').click();
    await page.locator('.qg-detail-bookmark.active').waitFor();
    await page.reload();
    await detail();
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), 'Attempt QA: preserve this note independently of my result.');
    assert.equal(await page.locator('.qg-detail-bookmark.active').count(), 1);
    await assertVisibleCount(2);
    await page.locator('.fp-reading-nav button').last().click();
    await page.waitForFunction(first => new URL(location.href).searchParams.get('question') !== first, ids[0]);
    await detail();
    const navigated = new URL(page.url()).searchParams;
    assert.equal(navigated.get('group'), taxonomy.chapterId);
    assert.equal(navigated.get('section'), taxonomy.sectionId);
    assert.equal(problems.get(navigated.get('question')).practiceTaxonomy.sectionId, taxonomy.sectionId);
    const nextProblem = problems.get(navigated.get('question'));
    await page.waitForFunction(title => document.querySelector('#problemDetail .qg-detail-title')?.textContent === title, nextProblem.titleZh || nextProblem.titleEn);
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), '');
    await page.locator('.fp-reading-nav button').first().click();
    await page.locator('.fp-question-row').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('section'), taxonomy.sectionId);
    assert.equal(new URL(page.url()).searchParams.get('question'), null);
  });

  await check('timer, count and result choices fit the mobile viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(ids[0]);
    await assertVisibleCount(2);
    await noOverflow();
    const bounds = await page.locator('[data-free-practice-timer], [data-free-practice-attempt-count], button[data-practice-outcome]').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const textOverflows = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const textRect of range.getClientRects()) {
          if (textRect.left < rect.left - 1 || textRect.right > rect.right + 1) textOverflows.push({ text: walker.currentNode.textContent, left: textRect.left, right: textRect.right });
        }
      }
      return { text: element.textContent, left: rect.left, right: rect.right, width: rect.width, height: rect.height, textOverflows };
    }));
    assert.ok(bounds.every(rect => rect.left >= -1 && rect.right <= 391 && rect.width > 0 && rect.height > 0), JSON.stringify(bounds));
    assert.ok(bounds.every(rect => !rect.textOverflows.length), `Result text must fit within each control: ${JSON.stringify(bounds)}`);
    await page.locator('[data-practice-show-answer]').click();
    await page.locator('.qg-block-answer.is-unlocked').waitFor();
    assert.equal((await attempts(ids[0])).length, 2);
    await screenshot('mobile-attempt-results.png');
    evidence.mobileBounds = bounds;
  });

  await check('no browser runtime errors', async () => assert.deepEqual(errors, []));
  const summary = { status: checks.every(item => item.status === 'pass') ? 'pass' : 'fail', base, fixture: { catalogInjected: Boolean(catalog), catalogCount: catalog?.length || null, catalogResponses, purpleCount: purpleProblems.length }, checks, screenshots, runtimeErrors: errors, evidence };
  await fs.writeFile(new URL('summary.json', output), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (summary.status !== 'pass') process.exitCode = 1;
} finally {
  await browser.close();
}
