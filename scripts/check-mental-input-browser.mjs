import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createPersonalState, personalStorageKey } from '../src/features/personal/personalStore.js';
import { createTrial } from '../src/features/personal/mental/mentalEngine.js';

const baseUrl = process.env.MENTAL_QA_URL || 'http://127.0.0.1:5176';
const ownerId = 'local:mental-input-qa';
const storageKey = personalStorageKey(ownerId);
const endpoint = 'https://mental-input-fixture.invalid/api';
const account = { id: ownerId, provider: 'local', cloudLinked: true, emailVerified: true,
  name: 'Mental Input QA', email: 'mental-input-qa@example.invalid', country: 'china',
  region: '上海', graduationTerm: '2027-09', createdAt: '2026-06-17T00:00:00.000Z' };
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const failures = [];
async function check(name, answer, run, options = {}) {
  if (process.env.MENTAL_QA_FILTER && !name.includes(process.env.MENTAL_QA_FILTER)) return;
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const seed = createPersonalState();
  const operator = answer < 0 ? 'subtract' : 'add';
  seed.activeTrial = createTrial({ durationSeconds: 120, operations: [operator],
    ranges: { [operator]: { minA: 0, maxA: 0, minB: Math.abs(answer), maxB: Math.abs(answer) } },
  }, { now: Date.now(), id: name });
  for (let index = 0; index < (options.historyTrials || 0); index++) {
    const now = Date.now() - (index + 1) * 86400000;
    const trial = createTrial(seed.activeTrial.settings, { now, id: `history-${index}` });
    trial.status = 'completed';
    trial.completedAt = trial.deadlineAt;
    trial.correct = 100;
    trial.questions = Array.from({ length: 100 }, (_, questionIndex) => ({
      ...trial.currentQuestion, id: `q${questionIndex + 1}`, index: questionIndex + 1,
      completedAt: trial.deadlineAt, elapsedMs: 1200, outcome: 'correct', submittedAnswer: String(answer),
    }));
    trial.currentQuestion = null;
    trial.currentAnswer = '';
    seed.trials.push(trial);
  }
  if (options.startFromSetup) {
    seed.mentalSettings = seed.activeTrial.settings;
    seed.activeTrial = null;
  }
  // Test the real UI with an isolated account and intercepted API requests,
  // including when baseUrl points to the deployed static assets.
  let remote = { version: 1, revision: 1, data: seed, updatedAt: new Date().toISOString() };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.origin === new URL(baseUrl).origin && url.pathname === '/config.js') {
      return route.fulfill({ contentType: 'application/javascript', body: `window.QUANTGYM_CONFIG = ${JSON.stringify({ cloudApiEndpoint: endpoint, googleLoginEnabled: false })};` });
    }
    if (url.origin === new URL(endpoint).origin || url.pathname.startsWith('/api/')) {
      if (method === 'OPTIONS') return json({});
      if (url.pathname === '/api/personal-prep') {
        if (method === 'PUT') remote = { ...remote, revision: remote.revision + 1, data: request.postDataJSON().data, updatedAt: new Date().toISOString() };
        return json(remote);
      }
      if (url.pathname === '/api/account') return json({ account });
      return json({ account, state: {}, problemStates: [], problems: [], community: { posts: [] }, syncedAt: new Date().toISOString() });
    }
    if (url.origin === new URL(baseUrl).origin && ['GET', 'HEAD'].includes(method)) return route.continue();
    return route.abort();
  });
  await context.addInitScript(({ seed, ownerId, storageKey, account, endpoint }) => {
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem('quantMemoryBoard.auth.v1', JSON.stringify({ accounts: [account], currentUserId: ownerId, lastAuthenticatedAt: new Date().toISOString() }));
      localStorage.setItem('quantMemoryBoard.cloud.v1', JSON.stringify({ endpoint, token: 'isolated-fixture-not-a-real-credential', userId: ownerId }));
      localStorage.setItem('quantMemoryBoard.preferences.v1', JSON.stringify({ language: 'zh' }));
      localStorage.setItem(`quantgym.ui.onboarded.v1:${ownerId}`, '1');
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, ownerId, updatedAt: new Date().toISOString(), data: seed }));
    }
  }, { seed, ownerId, storageKey, account, endpoint });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.clock.install();
    await page.goto(`${baseUrl}/tools?trainer=math`, { waitUntil: 'domcontentloaded' });
    const input = page.locator('.pm-focus .pm-answer');
    if (options.startFromSetup) {
      await page.locator('[data-pm-start]').click();
      await page.locator('.pm-preparation').waitFor();
      assert.equal(await page.evaluate(() => document.fullscreenElement === document.documentElement), true);
      await page.clock.runFor(5100);
    }
    await input.waitFor();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    if (options.cpuRate) {
      const session = await context.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: options.cpuRate });
    }
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).data, storageKey);
    await run({ page, input, read });
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error.stack}`);
    console.error((await page.locator('body').innerText()).slice(0,1200));
  } finally {
    await context.close();
  }
}

try {
  await check('rapid keyboard after fullscreen countdown preserves answers and deletions', 12, async ({ page, input, read }) => {
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    await page.keyboard.type('1212121212', { delay: 0 });
    await page.keyboard.type('98', { delay: 0 });
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('12', { delay: 0 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type('12', { delay: 0 });
    assert.equal((await read()).activeTrial.correct, 7);
    assert.equal(await input.inputValue(), '');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
  }, { startFromSetup: true });
  await check('rapid queued keyboard events preserve input across question transitions', 12, async ({ page, input, read }) => {
    await input.focus();
    const session = await page.context().newCDPSession(page);
    const keys = [...'1298', 'Backspace', 'Backspace', ...'12', 'Backspace', ...'121212'];
    // Browser-level trusted events arrive without waiting for each prior event's
    // rendering work. This models keys queued while a slower device is busy.
    const events = keys.flatMap(key => {
      const digit = /^\d$/.test(key);
      const code = digit ? `Digit${key}` : key;
      const windowsVirtualKeyCode = digit ? key.charCodeAt(0) : 8;
      return [
        { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(digit ? { text: key, unmodifiedText: key } : {}) },
        { type: 'keyUp', key, code, windowsVirtualKeyCode },
      ];
    });
    await Promise.all(events.map(event => session.send('Input.dispatchKeyEvent', event)));
    const state = await read();
    assert.equal(state.activeTrial.correct, 5);
    assert.equal(await input.inputValue(), '');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
  }, { historyTrials: 100, cpuRate: 4 });
  await check('rapid keyboard uninterrupted answers retain every next-question first digit', 12, async ({ page, input, read }) => {
    await input.focus();
    await page.keyboard.type('1212121212', { delay: 0 });
    assert.equal((await read()).activeTrial.correct, 5);
    assert.equal(await input.inputValue(), '');
    await page.keyboard.type('12', { delay: 0 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type('12', { delay: 0 });
    assert.equal((await read()).activeTrial.correct, 7);
    assert.equal(await input.inputValue(), '');
  });
  await check('rapid keyboard with substantial history preserves digits and repeated deletions', 12, async ({ page, input, read }) => {
    await input.focus();
    await page.keyboard.type('987654321', { delay: 0 });
    for (let press = 0; press < 9; press++) await page.keyboard.press('Backspace');
    await page.keyboard.type('1212121212', { delay: 0 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type('12', { delay: 0 });
    const state = await read();
    assert.equal(state.activeTrial.correct, 6);
    assert.equal(state.trials.length, 100);
    assert.equal(state.trials[0].questions.length, 100);
    assert.equal(await input.inputValue(), '');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
  }, { historyTrials: 100, cpuRate: 4 });
  await check('rapid keyboard digits and repeated Backspace preserve the current answer', 1234, async ({ page, input, read }) => {
    await input.focus();
    await page.keyboard.type('987654321');
    assert.equal(await input.inputValue(), '987654321');
    await page.keyboard.down('Backspace');
    for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.down('Backspace');
    await page.keyboard.up('Backspace');
    assert.equal(await input.inputValue(), '9876');
    assert.equal((await read()).activeTrial.currentAnswer, '9876');
    for (let press = 0; press < 6; press++) await page.keyboard.press('Backspace');
    assert.equal(await input.inputValue(), '');
    assert.equal((await read()).activeTrial.currentAnswer, '');
    await page.keyboard.type('1234');
    assert.equal((await read()).activeTrial.correct, 1);
  });
  await check('rapid keyboard answers retain following digits and deletions after advancing', 12, async ({ page, input, read }) => {
    await input.focus();
    // No locator or state reads between keystrokes: later input must reach the
    // newly mounted question even while React is processing the previous one.
    for (let round = 0; round < 8; round++) {
      await page.keyboard.type('1298');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('12');
      await page.keyboard.press('Backspace');
    }
    const trial = (await read()).activeTrial;
    assert.equal(trial.correct, 16);
    assert.equal(trial.questions.length, 16);
    assert.equal(await input.inputValue(), '');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    assert.ok(trial.questions.every(question => question.submittedAnswer === '12'));
  });
  await check('rapid keyboard middle edits preserve the caret and selected range', 9876, async ({ page, input, read }) => {
    await input.focus();
    await page.keyboard.type('1357');
    for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('2');
    assert.equal(await input.inputValue(), '12357');
    assert.equal(await input.evaluate(element => element.selectionStart), 2);
    await page.keyboard.press('Backspace');
    assert.equal(await input.inputValue(), '1357');
    assert.equal(await input.evaluate(element => element.selectionStart), 1);
    await page.keyboard.press('Delete');
    assert.equal(await input.inputValue(), '157');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.type('42');
    assert.equal(await input.inputValue(), '142');
    assert.equal((await read()).activeTrial.currentAnswer, '142');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('9876');
    assert.equal((await read()).activeTrial.correct, 1);
  });
  await check('rapid mobile deletion input events preserve editing and answer advancement', 12, async ({ page, input, read }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await input.fill('991');
    const edit = async (value, inputType, data = null) => input.evaluate((element, event) => {
      element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, ...event }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, event.value);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, ...event }));
    }, { value, inputType, data });
    await edit('99', 'deleteContentBackward');
    await edit('9', 'deleteContentBackward');
    await edit('', 'deleteContentBackward');
    assert.equal(await input.inputValue(), '');
    assert.equal((await read()).activeTrial.currentAnswer, '');
    await edit('1', 'insertText', '1');
    await edit('12', 'insertText', '2');
    assert.equal((await read()).activeTrial.correct, 1);
    await edit('', 'deleteContentBackward');
    await edit('1', 'insertText', '1');
    assert.equal(await input.inputValue(), '1');
    await edit('', 'deleteContentForward');
    assert.equal(await input.inputValue(), '');
    await edit('12', 'insertFromPaste', '12');
    assert.equal((await read()).activeTrial.correct, 2);
  });
  await check('partial input survives timer ticks and correct answers count once', 12, async ({ page, input, read }) => {
    for (let count = 1; count <= 5; count++) {
      await input.pressSequentially('1');
      await page.clock.runFor(300);
      assert.equal(await input.inputValue(), '1');
      await input.pressSequentially('2');
      await input.press('Enter');
      assert.equal((await read()).activeTrial.correct, count);
      assert.equal(await input.inputValue(), '');
    }
  });
  await check('Enter preserves partial digits for correction', 12, async ({ input, read }) => {
    await input.pressSequentially('1');
    await input.press('Enter');
    await input.pressSequentially('2');
    assert.equal((await read()).activeTrial.correct, 1);
    assert.equal((await read()).activeTrial.questions[0].submittedAnswer, '12');
  });
  await check('held digit does not answer consecutive questions', 5, async ({ page, input, read }) => {
    await input.focus();
    await page.keyboard.down('5');
    await page.keyboard.down('5');
    await page.keyboard.down('5');
    await page.keyboard.up('5');
    assert.equal((await read()).activeTrial.correct, 1);
    await page.keyboard.press('5');
    assert.equal((await read()).activeTrial.correct, 2);
  });
  await check('held Enter records one incorrect submission', 12, async ({ page, input, read }) => {
    await input.pressSequentially('9');
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    assert.equal((await read()).activeTrial.currentQuestion.mistakes.length, 1);
  });
  await check('composition is committed before checking the answer', 12, async ({ page, input, read }) => {
    const composingElement = await input.elementHandle();
    await input.dispatchEvent('compositionstart');
    await input.evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '12');
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '12', inputType: 'insertCompositionText', isComposing: true }));
    });
    await page.clock.runFor(300);
    assert.equal((await read()).activeTrial.correct, 0);
    assert.equal(await input.inputValue(), '12');
    await input.dispatchEvent('compositionend', { data: '12' });
    // Some input methods emit a final input event after compositionend. It still
    // belongs to the old element/question and must not solve the next one.
    await composingElement.evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '12');
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '12', inputType: 'insertText' }));
    });
    assert.equal((await read()).activeTrial.correct, 1);
    assert.equal(await input.inputValue(), '');
  });
  await check('full-width IME digits count once after composition commits', 12, async ({ input, read }) => {
    await input.dispatchEvent('compositionstart');
    await input.evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '１２');
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '１２', inputType: 'insertCompositionText', isComposing: true }));
    });
    assert.equal((await read()).activeTrial.correct, 0);
    await input.dispatchEvent('compositionend', { data: '１２' });
    assert.equal((await read()).activeTrial.correct, 1);
    assert.equal((await read()).activeTrial.questions[0].submittedAnswer, '12');
    assert.equal(await input.inputValue(), '');
  });
  await check('Escape cancels IME composition without ending the trial', 12, async ({ page, input, read }) => {
    await input.dispatchEvent('compositionstart');
    await input.dispatchEvent('keydown', { key: 'Escape', code: 'Escape', isComposing: true, bubbles: true });
    assert.equal((await read()).activeTrial?.status, 'active');
    // Some input methods omit isComposing on the cancellation keystroke.
    await input.dispatchEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
    assert.equal((await read()).activeTrial?.status, 'active');
    await input.dispatchEvent('compositionend', { data: '' });
    await input.pressSequentially('12');
    assert.equal((await read()).activeTrial.correct, 1);
    await page.keyboard.press('Escape');
    assert.equal((await read()).activeTrial, null);
    assert.equal((await read()).trials[0].status, 'aborted');
  });
  await check('pasted negative answers accept a mathematical minus sign', -12, async ({ input, read }) => {
    await input.fill('−１２');
    assert.equal((await read()).activeTrial.correct, 1);
    assert.equal((await read()).activeTrial.questions[0].submittedAnswer, '-12');
    assert.equal(await input.inputValue(), '');
  });
  await check('negative answers retain their sign and keyboard focus after advancing', -12, async ({ page, input, read }) => {
    await input.pressSequentially('-1');
    await page.clock.runFor(300);
    assert.equal(await input.inputValue(), '-1');
    await input.pressSequentially('2');
    assert.equal((await read()).activeTrial.correct, 1);
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    await page.keyboard.type('-12');
    assert.equal((await read()).activeTrial.correct, 2);
  });
  await check('empty answers do not score zero and completed trials persist once', 0, async ({ page, input, read }) => {
    await input.press('Enter');
    assert.equal((await read()).activeTrial.correct, 0);
    await input.pressSequentially('0');
    assert.equal((await read()).activeTrial.correct, 1);
    await page.clock.runFor(121000);
    const state = await read();
    assert.equal(state.activeTrial, null);
    assert.equal(state.trials.length, 1);
    assert.equal(state.trials[0].correct, 1);
    assert.equal(state.activities.length, 1);
    assert.equal(state.activities[0].count, 1);
  });
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], 'Mental input regressions');
