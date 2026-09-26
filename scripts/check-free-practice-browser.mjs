import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { installFreePracticeFixture } from './lib/free-practice-browser-fixture.mjs';
import { problemNoteStorageKey } from '../src/features/problems/problemNotes.js';

const output = new URL('../artifacts/free-practice/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const libraryOnly = process.argv.includes('--library-only');
const purpleOnly = process.argv.includes('--purple-only');
const purpleMobileOnly = process.argv.includes('--purple-mobile-only');
const progressOnly = process.argv.includes('--progress-only');
assert.ok([libraryOnly, purpleOnly, purpleMobileOnly, progressOnly].filter(Boolean).length <= 1, 'Choose only one targeted check mode');
const previousSummary = libraryOnly
  ? await fs.readFile(new URL('summary.json', output), 'utf8').then(JSON.parse).catch(() => null)
  : null;
const base = process.env.FREE_PRACTICE_QA_URL || 'http://127.0.0.1:5176';
// Reviewed source data can stay outside the public release checkout.
const bankFile = (source, name) => process.env.FREE_PRACTICE_QA_BANKS_DIR
  ? path.resolve(process.env.FREE_PRACTICE_QA_BANKS_DIR, source, name)
  : new URL(`../data/question-banks/${source}/${name}`, import.meta.url);
const purpleMetadata = JSON.parse(await fs.readFile(bankFile('question-bank', 'metadata.json'), 'utf8'));
const expectedCounts = { purple: purpleMetadata.problemCount, quantguide: 1201, xiaohongshu: 878, onepoint3acres: 618, glassdoor: 316 };
const sources = { purple: 'question-bank', quantguide: 'quantguide', xiaohongshu: 'interview-xiaohongshu', onepoint3acres: 'interview-onepoint3acres', glassdoor: 'interview-glassdoor' };
const records = new Map();
for (const [bank, source] of Object.entries(sources)) {
  const file = JSON.parse(await fs.readFile(bankFile(source, 'problems.json'), 'utf8'));
  records.set(bank, new Map(file.problems.map(problem => [problem.id, problem])));
}
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
const account = { id: purpleOnly ? 'local:purple-refresh-qa' : 'local:free-practice-qa', provider: 'local', cloudLinked: true, emailVerified: true, name: 'Practice QA', email: 'practice-qa@example.invalid', country: 'china', region: '上海', graduationTerm: '2027-09', createdAt: '2026-09-20T00:00:00.000Z' };
const legacyNote = 'Legacy purple-book note: check the posterior before each flip.';
const noteStorageKey = problemNoteStorageKey(account.id, 'catalog-problem-013');
const initialProblemStates = purpleOnly ? [{ problemId: 'catalog-problem-013', completed: true, favorite: true, lastPracticedAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-01T12:00:00.000Z' }] : [];
await installFreePracticeFixture(context, { base, accounts: [account], problems: [...records.values()].flatMap(bank => [...bank.values()]), initialStates: { [account.id]: { problemStates: initialProblemStates } } });
await context.addInitScript(({ account, purpleOnly, legacyNote, noteStorageKey }) => {
  if (!localStorage.getItem('quantMemoryBoard.auth.v1')) {
    localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: account.id, lastAuthenticatedAt: new Date().toISOString() }));
    localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh', sidebarCollapsed: false }));
    localStorage.setItem(`quantgym.ui.onboarded.v1:${account.id}`, '1');
    if (purpleOnly) {
      localStorage.setItem(`quantMemoryBoard.userState.v1.${account.id}`, JSON.stringify({
        problemStates: [{ problemId: 'catalog-problem-013', completed: true, favorite: true, lastPracticedAt: '2026-09-01T12:00:00.000Z', updatedAt: '2026-09-01T12:00:00.000Z' }],
      }));
      localStorage.setItem(noteStorageKey, legacyNote);
    }
  }
}, { account, purpleOnly, legacyNote, noteStorageKey });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
const checks = [];
const screenshots = [];
const layoutChecks = [];
page.on('pageerror', error => errors.push(error.message));
const urlParam = key => new URL(page.url()).searchParams.get(key);
const rowIds = () => page.locator('.fp-question-row').evaluateAll(rows => rows.map(row => row.dataset.problemId));
const directory = () => page.locator('.fp-group[data-group-id]').first().waitFor();
const detail = () => page.locator('#problemDetail .qg-detail-title').waitFor();
const savedPersonalState = problemId => page.evaluate(({ accountId, problemId }) => {
  const state = JSON.parse(localStorage.getItem(`quantMemoryBoard.userState.v1.${accountId}`) || '{}');
  return (state.problemStates || []).find(item => item.problemId === problemId) || {};
}, { accountId: account.id, problemId });
const noOverflow = async label => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
const screenshot = async name => {
  await page.screenshot({ path: new URL(name, output).pathname, fullPage: true });
  screenshots.push(name);
};
const go = async params => {
  await page.goto(`${base}/problems${params ? `?${new URLSearchParams(params)}` : ''}`);
  await page.locator('[data-free-practice-root]').waitFor();
  if (params?.question) await detail();
  else if (params?.bank) await directory();
  else await page.locator('[data-bank-card="purple"] [data-bank-count]').waitFor();
};
const waitParam = async (key, value) => {
  await page.waitForFunction(({ key, value }) => new URL(location.href).searchParams.get(key) === value, { key, value });
  // Router history updates ahead of React's committed view. Wait for the
  // selected control as well before reading the corresponding question list.
  if (key === 'group') await page.locator(`.fp-group[data-group-id="${value}"].is-active`).waitFor();
  if (key === 'section') await page.locator(`[data-section-id="${value}"].is-active`).waitFor();
  if (key === 'page') await page.waitForFunction(value => document.querySelector('.fp-pagination select')?.value === value, value);
  if (key === 'difficulty' || key === 'status') {
    const index = key === 'difficulty' ? 0 : 1;
    await page.waitForFunction(({ index, value }) => document.querySelectorAll('.fp-filter-controls select')[index]?.value === value, { index, value });
  }
  if (key === 'bank') await page.locator('.fp-question-row').first().waitFor();
};
const assertRowsFromBank = async bank => {
  const ids = await rowIds();
  assert.ok(ids.length > 0, `${bank}: expected visible questions`);
  assert.ok(ids.every(id => records.get(bank).has(id)), `${bank}: a question came from another source`);
  assert.ok(ids.length <= 20, 'Pages should contain at most 20 questions');
  return ids;
};
const check = async (name, run) => {
  if (libraryOnly && !name.startsWith('library ') && name !== 'no browser runtime errors') return;
  if (purpleOnly && !name.startsWith('purple refresh ') && name !== 'no browser runtime errors') return;
  if (purpleMobileOnly && name !== 'purple refresh mobile provenance and mathematical answer fit the viewport' && name !== 'no browser runtime errors') return;
  if (progressOnly && !['question detail reveals hints and answers, saves notes and persists practice outcome/bookmark', 'recording an unpracticed question preserves its next question after refresh', 'purple refresh stable ID retains existing completion, bookmark and notes', 'no browser runtime errors'].includes(name)) return;
  try {
    await run();
    checks.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, status: 'fail', error: error.message, url: page.url() });
    console.error(`FAIL ${name}: ${error.message}`);
    await screenshot(`failure-${checks.length}.png`).catch(() => {});
  }
};

let reviewedQuestionId;
try {
  await check('five source cards and exact inventory counts', async () => {
    await go();
    await page.waitForFunction(expected => Object.entries(expected).every(([bank, count]) => Number(document.querySelector(`[data-bank-card="${bank}"] [data-bank-count]`)?.textContent?.replaceAll(',', '')) === count), expectedCounts);
    assert.equal(await page.locator('[data-bank-card]').count(), 5);
    for (const [bank, count] of Object.entries(expectedCounts)) {
      assert.equal(Number((await page.locator(`[data-bank-card="${bank}"] [data-bank-count]`).innerText()).replaceAll(',', '')), count);
    }
    await noOverflow('Desktop home');
    await screenshot('desktop-home.png');
    await page.locator('[data-bank-card="purple"] .fp-bank-open').click();
    await waitParam('bank', 'purple');
    await assertRowsFromBank('purple');
  });

  await check('purple book chapter, section and bounded previous/next navigation', async () => {
    await go({ bank: 'purple' });
    assert.equal(await page.locator('.fp-group[data-group-id]').count(), 7);
    await page.locator('[data-group-id="purple-chapter-2"]').click();
    const sections = page.locator('.fp-subgroups [data-section-id]');
    await sections.first().waitFor();
    const sectionItems = await sections.evaluateAll(elements => elements.map(element => ({ id: element.dataset.sectionId, count: Number(element.lastElementChild.textContent) })));
    const selection = sectionItems.find(section => section.count >= 2);
    assert.ok(selection, 'Chapter 2 needs a section with multiple questions');
    await page.locator(`[data-section-id="${selection.id}"]`).click();
    await waitParam('section', selection.id);
    const ids = await assertRowsFromBank('purple');
    assert.ok(ids.every(id => records.get('purple').get(id).practiceTaxonomy.sectionId === selection.id));
    assert.equal(await page.locator('.fp-list-heading > span').innerText(), `${selection.count} 道题`);
    await screenshot('desktop-purple-section.png');
    await page.locator('.fp-question-row').first().click();
    await detail();
    assert.equal(urlParam('question'), ids[0]);
    assert.equal(await page.locator('.fp-reading-nav button').nth(1).isDisabled(), true);
    await page.locator('.fp-reading-nav button').nth(2).click();
    await waitParam('question', ids[1]);
    await detail();
    assert.equal(urlParam('section'), selection.id);
    assert.equal(urlParam('group'), 'purple-chapter-2');
    await page.goBack();
    await waitParam('question', ids[0]);
    await detail();
    await page.locator('.fp-reading-nav button').first().click();
    await page.locator('.fp-question-row').first().waitFor();
    assert.equal(urlParam('question'), null);
    assert.deepEqual(await rowIds(), ids);
    if (ids.length === selection.count) {
      await page.locator('.fp-question-row').last().click();
      await detail();
      assert.equal(await page.locator('.fp-reading-nav button').nth(2).isDisabled(), true, 'Last question must not advance into another section');
    }
  });

  await check('QuantGuide original topics, search URL persistence and difficulty filter', async () => {
    await go({ bank: 'quantguide' });
    const groups = await page.locator('.fp-group[data-group-id]').evaluateAll(elements => elements.map(element => element.dataset.groupId));
    assert.deepEqual(groups, ['probability', 'brainteasers', 'finance', 'statistics', 'pure-math']);
    await page.locator('[data-group-id="probability"]').click();
    await waitParam('group', 'probability');
    const firstIds = await assertRowsFromBank('quantguide');
    assert.ok(firstIds.every(id => records.get('quantguide').get(id).quantguide.topic === 'probability'));
    await page.locator('#problemSearch').fill('coin');
    await waitParam('q', 'coin');
    const searchedIds = await rowIds();
    assert.ok(searchedIds.length > 0 && searchedIds.every(id => {
      const problem = records.get('quantguide').get(id);
      return [problem.titleZh, problem.titleEn, problem.promptZh, problem.promptEn, ...(problem.tags || []), ...(problem.companies || [])].join(' ').toLowerCase().includes('coin');
    }));
    await page.reload();
    await directory();
    assert.equal(await page.locator('#problemSearch').inputValue(), 'coin');
    assert.deepEqual(await rowIds(), searchedIds);
    await page.locator('#problemSearch').fill('');
    await page.getByRole('combobox', { name: '难度', exact: true }).selectOption('Easy');
    await waitParam('difficulty', 'Easy');
    assert.ok((await assertRowsFromBank('quantguide')).every(id => records.get('quantguide').get(id).difficulty.toLowerCase() === 'easy'));
    await page.reload();
    await directory();
    assert.equal(await page.getByRole('combobox', { name: '难度', exact: true }).inputValue(), 'Easy');
  });

  await check('twenty-question pagination preserves page on reload and resets for search', async () => {
    await go({ bank: 'quantguide' });
    const first = await rowIds();
    assert.equal(first.length, 20);
    await page.locator('.fp-pagination button').last().click();
    await waitParam('page', '2');
    const second = await rowIds();
    assert.equal(second.length, 20);
    assert.ok(second.every(id => !first.includes(id)));
    await page.reload();
    await directory();
    assert.deepEqual(await rowIds(), second);
    await page.locator('#problemSearch').fill('coin');
    await waitParam('q', 'coin');
    assert.equal(urlParam('page'), null);
    assert.equal(await page.getByRole('combobox', { name: '跳转页码', exact: true }).inputValue(), '1');
  });

  await check('each interview company directory filters its own source and includes unknown', async () => {
    for (const bank of ['xiaohongshu', 'onepoint3acres', 'glassdoor']) {
      await go({ bank });
      await page.locator('[data-group-id="unknown"]').click();
      await waitParam('group', 'unknown');
      await assertRowsFromBank(bank);
      assert.equal(await page.locator('.fp-list-heading h2').innerText(), '公司未明确');
      await page.getByRole('searchbox', { name: '搜索公司', exact: true }).fill('SIG');
      const sig = page.locator('.fp-group[data-group-id="company-sig"]');
      await sig.waitFor();
      await sig.click();
      await waitParam('group', 'company-sig');
      const ids = await assertRowsFromBank(bank);
      assert.ok(ids.every(id => records.get(bank).get(id).companies.some(company => /\bSIG\b|Susquehanna/i.test(company))));
      await screenshot(`desktop-${bank}-company.png`);
    }
  });

  await check('question detail reveals hints and answers, saves notes and persists practice outcome/bookmark', async () => {
    await go({ bank: 'quantguide', group: 'probability' });
    reviewedQuestionId = (await rowIds())[0];
    await page.locator('.fp-question-row').first().click();
    await detail();
    assert.ok((await page.locator('.qg-block-question').innerText()).trim().length > 20);
    for (const block of ['hint', 'answer']) {
      const section = page.locator(`.qg-block-${block}`);
      await section.locator('.problem-lock-overlay button').click();
      await page.locator(`.qg-block-${block}.is-unlocked`).waitFor();
      assert.equal(await section.locator('.problem-lock-overlay').count(), 0);
    }
    await page.locator('.qg-detail-notes').fill('Practice QA: define the sample space before calculating.');
    await page.locator('[data-practice-outcome="correct"]').click();
    await page.locator('[data-practice-outcome="correct"][aria-pressed="true"]').waitFor();
    await page.locator('.qg-detail-bookmark').click();
    await page.locator('.qg-detail-bookmark.active').waitFor();
    await page.reload();
    await detail();
    assert.equal(urlParam('question'), reviewedQuestionId);
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), 'Practice QA: define the sample space before calculating.');
    assert.equal(await page.locator('[data-practice-outcome="correct"][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('.qg-detail-bookmark.active').count(), 1);
    await screenshot('desktop-question-detail.png');
    await page.locator('.fp-reading-nav button').first().click();
    await page.getByRole('combobox', { name: '进度', exact: true }).selectOption('completed');
    await waitParam('status', 'completed');
    assert.deepEqual(await rowIds(), [reviewedQuestionId]);
    await page.getByRole('combobox', { name: '进度', exact: true }).selectOption('saved');
    await waitParam('status', 'saved');
    assert.deepEqual(await rowIds(), [reviewedQuestionId]);
    await page.getByRole('combobox', { name: '进度', exact: true }).selectOption('unfinished');
    await waitParam('status', 'unfinished');
    assert.ok(!(await rowIds()).includes(reviewedQuestionId));
  });

  await check('mathematical question renders actual MathJax output', async () => {
    const mathematical = [...records.get('purple').values()].find(problem => /\$|\\\(/.test(`${problem.promptEn || ''} ${problem.promptZh || ''}`));
    assert.ok(mathematical, 'Expected a mathematical purple-book question');
    await go({ bank: 'purple', question: mathematical.id });
    await page.locator('#problemDetail mjx-container').first().waitFor({ timeout: 30000 });
    assert.ok(await page.locator('#problemDetail mjx-container').count() > 0);
    await screenshot('desktop-math-rendering.png');
  });

  await check('recording an unpracticed question preserves its next question after refresh', async () => {
    await go({ bank: 'quantguide', group: 'probability', status: 'unfinished' });
    const ids = await rowIds();
    assert.ok(ids.length >= 2);
    await page.locator('.fp-question-row').first().click();
    await detail();
    await page.locator('[data-practice-outcome="correct"]').click();
    await page.locator('[data-practice-outcome="correct"][aria-pressed="true"]').waitFor();
    await page.reload();
    await detail();
    assert.equal(urlParam('question'), ids[0]);
    assert.equal(await page.locator('.fp-reading-nav button').nth(2).isDisabled(), false);
    await page.locator('.fp-reading-nav button').nth(2).click();
    await waitParam('question', ids[1]);
    assert.equal(urlParam('group'), 'probability');
    assert.equal(urlParam('status'), 'unfinished');
  });

  await check('390px mobile home, company directory and question have no horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go();
    await noOverflow('Mobile home');
    await screenshot('mobile-home.png');
    await go({ bank: 'xiaohongshu', group: 'company-sig' });
    await assertRowsFromBank('xiaohongshu');
    await noOverflow('Mobile company directory');
    await screenshot('mobile-company.png');
    await page.locator('.fp-question-row').first().click();
    await detail();
    await noOverflow('Mobile detail');
    await screenshot('mobile-detail.png');
    await page.locator('.qg-detail-notes').fill('A mobile note saved in the same question.');
    await page.reload();
    await detail();
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), 'A mobile note saved in the same question.');
  });

  await check('English labels and dark theme render without horizontal overflow', async () => {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await go({ lang: 'en' });
    await page.getByRole('heading', { name: 'Questions', exact: true }).waitFor();
    await noOverflow('English home');
    await screenshot('english-home.png');
    await go({ bank: 'quantguide', group: 'probability', lang: 'en' });
    await page.getByRole('searchbox', { name: 'Search this bank', exact: true }).waitFor();
    await page.evaluate(() => document.documentElement.setAttribute('data-qg-theme', 'dark'));
    await noOverflow('Dark directory');
    await screenshot('dark-directory.png');
    await page.locator('.fp-question-row').first().click();
    await detail();
    await noOverflow('Dark detail');
    await screenshot('dark-detail.png');
  });

  await check('library QuantGuide practice button opens the correct source bank', async () => {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto(`${base}/library`);
    const card = page.locator('.library-card[data-library-id="quantguide"]');
    await card.waitFor();
    await card.locator('.library-practice-btn').click();
    await waitParam('bank', 'quantguide');
    await directory();
    assert.equal(new URL(page.url()).pathname, '/problems');
    assert.equal(await page.locator('.fp-header h1').innerText(), '蓝宝书');
    assert.equal(await page.locator('.fp-group[data-group-id]').count(), 5);
    await assertRowsFromBank('quantguide');
    await screenshot('desktop-library-practice.png');
  });

  await check('purple refresh reviewed edition has exactly 140 questions and correct chapter counts', async () => {
    assert.equal(purpleMetadata.problemCount, 140, 'This release must be the reviewed 140-question edition');
    assert.equal(purpleMetadata.mainProblemCount, 118);
    assert.equal(purpleMetadata.appendixExerciseCount, 22);
    assert.equal(records.get('purple').size, 140);
    assert.deepEqual(purpleMetadata.practiceChapters.map(chapter => chapter.problemCount), [47, 24, 4, 8, 7, 28, 22]);
    await go();
    await page.waitForFunction(() => document.querySelector('[data-bank-card="purple"] [data-bank-count]')?.textContent === '140');
    await screenshot('purple-v14-home.png');
    await page.locator('[data-bank-card="purple"] .fp-bank-open').click();
    await waitParam('bank', 'purple');
    const chapterCounts = await page.locator('.fp-group[data-group-id]').evaluateAll(elements => elements.map(element => Number(element.lastElementChild.textContent)));
    assert.deepEqual(chapterCounts, [47, 24, 4, 8, 7, 28, 22]);
    await noOverflow('Updated purple directory');
    await screenshot('purple-v14-chapters.png');
  });

  await check('purple refresh new original question 1.1.15 is searchable with source page', async () => {
    const added = records.get('purple').get('catalog-problem-107');
    assert.equal(added?.provenance.originalNumber, '1.1.15');
    assert.equal(String(added.provenance.sourcePage), '24');
    await go({ bank: 'purple', q: '1.1.15' });
    await page.locator('.fp-question-row[data-problem-id="catalog-problem-107"]').waitFor();
    assert.deepEqual(await rowIds(), ['catalog-problem-107']);
    assert.match(await page.locator('.fp-row-topic').innerText(), /1\.1\.15/);
    await page.locator('.fp-question-row').click();
    await detail();
    const reference = page.locator('.fp-source-reference[data-original-number="1.1.15"]');
    await reference.waitFor();
    assert.match(await reference.innerText(), /24/);
    assert.match(await page.locator('.qg-block-question').innerText(), /红球/);
    await screenshot('purple-v14-new-question.png');
  });

  await check('purple refresh A.8 uses HT and clearly marks the supplementary answer', async () => {
    const exercise = records.get('purple').get('catalog-exercise-008');
    assert.equal(exercise?.provenance.originalNumber, 'A.8');
    assert.equal(exercise.provenance.answerStatus, 'supplemented');
    await go({ bank: 'purple', question: exercise.id });
    await page.locator('.fp-source-reference[data-original-number="A.8"]').waitFor();
    const prompt = (await page.locator('.qg-block-question').textContent()).replace(/\s+/g, '');
    assert.ok(prompt.includes('HT') && !prompt.includes('HTT'), 'A.8 prompt must use HT, not the old HTT sequence');
    assert.ok(!(await page.locator('.qg-problem-detail-head').innerText()).includes('HTT'), 'Old English title must not reintroduce HTT');
    await page.locator('.qg-block-answer .problem-lock-overlay button').click();
    await page.locator('.qg-block-answer.is-unlocked').waitFor();
    const provenance = page.locator('.fp-answer-provenance[data-answer-status="supplemented"]');
    await provenance.waitFor();
    assert.match(await provenance.innerText(), /补充解答/);
    assert.match(await page.locator('.qg-block-answer').innerText(), /4/);
    await screenshot('purple-v14-appendix-ht.png');
  });

  await check('purple refresh original 1.1.13 shows corrected expectation and rendered mathematics', async () => {
    const corrected = records.get('purple').get('catalog-problem-013');
    assert.equal(corrected?.provenance.originalNumber, '1.1.13');
    assert.equal(corrected.provenance.answerStatus, 'corrected');
    assert.match(corrected.explanation, /47\.5572746565/);
    await go({ bank: 'purple', question: corrected.id });
    await page.locator('.fp-source-reference[data-original-number="1.1.13"]').waitFor();
    await page.locator('.qg-block-answer .problem-lock-overlay button').click();
    await page.locator('.qg-block-answer.is-unlocked').waitFor();
    await page.locator('.fp-answer-provenance[data-answer-status="corrected"]').waitFor();
    assert.match(await page.locator('.fp-answer-provenance[data-answer-status="corrected"]').innerText(), /订正解答/);
    await page.locator('.qg-block-answer mjx-container').first().waitFor({ timeout: 30000 });
    assert.ok((await page.locator('.qg-block-answer').textContent()).replace(/\s+/g, '').includes('47.5572746565'));
    await screenshot('purple-v14-corrected-math.png');
  });

  await check('purple refresh stable ID retains existing completion, bookmark and notes', async () => {
    if (!purpleOnly) {
      await page.evaluate(({ accountId, legacyNote, noteStorageKey }) => {
        const key = `quantMemoryBoard.userState.v1.${accountId}`;
        const state = JSON.parse(localStorage.getItem(key) || '{}');
        state.problemStates ||= [];
        const previous = state.problemStates.find(item => item.problemId === 'catalog-problem-013');
        if (previous) Object.assign(previous, { completed: true, favorite: true });
        else state.problemStates.push({ problemId: 'catalog-problem-013', completed: true, favorite: true, updatedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem(noteStorageKey, legacyNote);
      }, { accountId: account.id, legacyNote, noteStorageKey });
    }
    await go({ bank: 'purple', question: 'catalog-problem-013' });
    assert.equal((await savedPersonalState('catalog-problem-013')).completed, true);
    assert.equal(await page.locator('.qg-detail-bookmark.active').count(), 1);
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), legacyNote);
    await page.reload();
    await detail();
    assert.equal(urlParam('question'), 'catalog-problem-013');
    assert.equal((await savedPersonalState('catalog-problem-013')).completed, true);
    assert.equal(await page.locator('.qg-detail-bookmark.active').count(), 1);
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), legacyNote);
    await screenshot('purple-v14-preserved-progress.png');
  });

  await check('purple refresh mobile provenance and mathematical answer fit the viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go({ bank: 'purple', question: 'catalog-problem-107' });
    await page.locator('.fp-source-reference[data-original-number="1.1.15"]').waitFor();
    await page.locator('.qg-block-answer .problem-lock-overlay button').click();
    await page.locator('.qg-block-answer mjx-container').first().waitFor({ timeout: 30000 });
    await noOverflow('Updated purple mobile detail');
    const layout = await page.locator('.qg-block-answer').evaluate(block => {
      const blockRect = block.getBoundingClientRect();
      const css = getComputedStyle(block);
      const contentLeft = blockRect.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft);
      const contentRight = blockRect.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight);
      const rectOf = node => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width }; };
      const boxes = [...block.querySelectorAll('.problem-detail-body, .rich-text, .rich-text > p')].map(node => ({ tag: node.tagName, className: node.className, ...rectOf(node) }));
      const rich = block.querySelector('.rich-text');
      const walker = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT);
      const proseOverflows = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim() || node.parentElement.closest('mjx-container')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.left < contentLeft - 1 || rect.right > contentRight + 1) proseOverflows.push({ text: node.textContent.slice(0, 24), left: rect.left, right: rect.right });
        }
      }
      const math = [...block.querySelectorAll('mjx-container[display="true"]')].map(node => {
        node.scrollLeft = 0;
        const result = { ...rectOf(node), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflowX: getComputedStyle(node).overflowX, start: rectOf(node.querySelector('mjx-math')) };
        node.scrollLeft = node.scrollWidth;
        result.reachableScrollLeft = node.scrollLeft;
        result.end = rectOf(node.querySelector('mjx-math'));
        node.scrollLeft = 0;
        return result;
      });
      return { contentLeft, contentRight, gridColumns: css.gridTemplateColumns, boxes, proseOverflows, math };
    });
    layoutChecks.push(layout);
    assert.ok(layout.boxes.every(box => box.left >= layout.contentLeft - 1 && box.right <= layout.contentRight + 1), `Rich-text boxes overflow the answer card: ${JSON.stringify(layout)}`);
    assert.deepEqual(layout.proseOverflows, [], 'Wrapped prose must stay inside the answer card, even when the article clips overflow');
    assert.ok(layout.math.length > 0);
    for (const math of layout.math) {
      assert.ok(math.right <= layout.contentRight + 1 && math.left >= layout.contentLeft - 1, 'The formula scrollport must fit inside the answer card');
      assert.ok(['auto', 'scroll'].includes(math.overflowX));
      if (math.scrollWidth > math.clientWidth + 1) {
        assert.ok(math.reachableScrollLeft > 0, 'An oversized formula must scroll horizontally');
        assert.ok(math.start.left >= math.left - 1, 'The beginning of a formula must be reachable');
        assert.ok(math.end.right <= math.right + 1, 'The end of a formula must be reachable');
      }
    }
    assert.ok(layout.math.some(math => math.scrollWidth > math.clientWidth + 1), 'This boxed formula should exercise the local horizontal scroll path');
    assert.equal(await page.locator('.qg-detail-notes').inputValue(), '');
    await screenshot('purple-v14-mobile.png');
    await page.locator('.qg-block-answer mjx-container[display="true"]').evaluateAll(elements => elements.forEach(element => { element.scrollLeft = element.scrollWidth; }));
    await page.locator('.qg-block-answer').screenshot({ path: new URL('purple-v14-mobile-formula-end.png', output).pathname });
    screenshots.push('purple-v14-mobile-formula-end.png');
  });

  await check('no browser runtime errors', async () => assert.deepEqual(errors, []));
  const combinedChecks = [...(previousSummary?.checks || []).filter(prior => !checks.some(current => current.name === prior.name)), ...checks];
  const runtimeErrors = [...(previousSummary?.runtimeErrors || []), ...errors];
  const summary = { status: combinedChecks.every(check => check.status === 'pass') && !runtimeErrors.length ? 'pass' : 'fail', base, mode: progressOnly ? 'progress-only' : purpleMobileOnly ? 'purple-mobile-only' : purpleOnly ? 'purple-only' : libraryOnly ? 'library-only' : 'full', expectedCounts, purpleEdition: purpleMetadata.edition, checks: combinedChecks, screenshots: [...new Set([...(previousSummary?.screenshots || []), ...screenshots])], layoutChecks, runtimeErrors };
  await fs.writeFile(new URL(progressOnly ? 'progress-summary.json' : purpleMobileOnly ? 'purple-mobile-summary.json' : purpleOnly ? 'purple-summary.json' : 'summary.json', output), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (summary.status !== 'pass') process.exitCode = 1;
} finally {
  await browser.close();
}
