import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Isolated DOM fixture: no account, application bootstrap, or API requests.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Real, privately supplied catalogs are optional and are never embedded here.
const realQuestionPath = process.env.QUANTGYM_RICH_TEXT_REAL_QUESTIONS;
let server, browser, page, baseUrl;
const errors = [];

async function realQuestions() {
  const data = JSON.parse(await readFile(realQuestionPath, 'utf8'));
  return (Array.isArray(data) ? data : data.questions || data.problems).map(question => ({
    ...question, promptZh: question.promptZh ?? question.prompt,
    explanation: question.explanation ?? question.reference,
  }));
}

before(async () => {
  server = await createServer({
    root, configFile: false, appType: 'custom', logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, open: false },
  });
  server.middlewares.use('/rich-text-test', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/src/styles/playful-precision-tokens.css"><style>body{display:block;margin:0;padding:16px;min-width:0}#fixture{display:grid;grid-template-columns:minmax(0,1fr);width:100%;min-width:0}#output{min-width:0}</style></head><body><main id="fixture"><div id="output"></div></main></body></html>');
  });
  await server.listen();
  baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1000, height: 800 }, serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === baseUrl || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/mathjax@3/es5/'))) return route.continue();
    return route.abort();
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}/rich-text-test`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { window.renderer = await import('/src/modules/interview/richText.js'); });
}, { timeout: 30000 });

after(async () => {
  await browser?.close();
  await server?.close();
});

async function render(text, { blocks = false } = {}) {
  return page.evaluate(({ text, blocks }) => {
    const output = document.getElementById('output');
    window.MathJax?.typesetClear?.([output]);
    output.textContent = '';
    if (blocks) {
      output.classList.add('rich-text');
      window.renderer.renderRichTextBlocks(output, text);
    } else window.renderer.renderRichText(output, text);
    return {
      text: output.textContent,
      tags: [...output.children].map(child => child.tagName),
      code: [...output.querySelectorAll('pre > code')].map(code => ({ text: code.textContent, language: code.className })),
      inline: [...output.querySelectorAll('p > code')].map(code => code.textContent),
      unsafeElements: output.querySelectorAll('script, iframe, img, svg').length,
    };
  }, { text, blocks });
}

test('fenced Python preserves indentation, empty lines, tabs, comparison signs, and literal TeX', async () => {
  const code = 'def smaller(x):\n\tif x < 3 and x <= 2:\n        return "<tag> & \\sum_1^n $$ \\sqrt{x}\\n"\n\n    return "\u00a0"\n';
  const text = ['Before `inline`.', '', '```python', code + '```', '', '## After', '- one', '- two'].join('\n');
  const result = await render(text.replace(/\n/g, '\r\n'));
  assert.deepEqual(result.code, [{ text: code, language: 'language-python' }]);
  assert.deepEqual(result.tags, ['P', 'PRE', 'H5', 'UL']);
  assert.deepEqual(result.inline, ['inline']);
  assert.equal(result.unsafeElements, 0);
  const normalized = await page.evaluate(text => window.renderer.normalizeRichTextContent(text), text);
  assert.ok(normalized.includes('```python\n' + code + '```'));
});

test('code contents and a hostile language label stay inert text', async () => {
  const code = '<img src=x onerror="window.codeExecuted=true">\n<script>window.codeExecuted=true</script>\n[link](https://example.invalid/picture.png) **bold** `inline`\n';
  const result = await render('```"><img src=x onerror=window.codeExecuted=true>\n' + code + '```');
  assert.deepEqual(result.code, [{ text: code, language: '' }]);
  assert.equal(result.unsafeElements, 0);
  assert.equal(await page.evaluate(() => Boolean(window.codeExecuted)), false);
  assert.equal(await page.locator('#output pre a, #output pre strong, #output pre [onerror]').count(), 0);
});

test('long and tilde fences support embedded shorter fences and an unfinished final block', async () => {
  const result = await render('````python\n```\nx < 2\n````\n~~~text\n  kept\n~~~~\n```python\n    unfinished < 1');
  assert.deepEqual(result.code, [
    { text: '```\nx < 2\n', language: 'language-python' },
    { text: '  kept\n', language: 'language-text' },
    { text: '    unfinished < 1', language: 'language-python' },
  ]);
  assert.deepEqual(result.tags, ['PRE', 'PRE', 'PRE']);
});

test('empty fences, two-space openers, and prose following a code block retain their boundaries', async () => {
  const result = await render('- before\n  ```python\n    x = 1\n  ```\n- after\n```\n```\nLast paragraph.');
  assert.deepEqual(result.tags, ['UL', 'PRE', 'UL', 'PRE', 'P']);
  assert.deepEqual(result.code, [{ text: '    x = 1\n', language: 'language-python' }, { text: '', language: '' }]);
});

test('the interview question-card body and the block renderer use the same safe code path', async () => {
  const prompt = 'Explain this:\n```python\n    x = y < 5\n```\n- Finish here.';
  const direct = await render(prompt, { blocks: true });
  assert.deepEqual(direct.tags, ['P', 'PRE', 'UL']);
  const card = await render('# Q1/3 · Coding\n\n**Comparison**\n\n' + prompt);
  assert.deepEqual(card.tags, ['SECTION']);
  assert.deepEqual(card.code, direct.code);
  assert.equal(await page.locator('.interview-prompt-body > pre').count(), 1);
});

test('all four real algorithm answers retain their exact Python source without mobile overflow', { skip: !realQuestionPath }, async () => {
  const algorithms = (await realQuestions()).filter(question => question.explanation.includes('```python'));
  assert.deepEqual(algorithms.map(question => question.provenance.originalNumber), ['6.3.1', '6.3.2', '6.3.3', '6.3.4']);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const question of algorithms) {
    const expected = [...question.explanation.matchAll(/^```python\n([\s\S]*?)^```[ \t]*$/gm)].map(match => match[1]);
    const result = await render(question.explanation);
    assert.deepEqual(result.code.map(code => code.text), expected, question.id);
    assert.equal(result.unsafeElements, 0, question.id);
    const dimensions = await page.evaluate(() => {
      const pre = document.querySelector('#output pre');
      return { viewport: innerWidth, document: document.documentElement.scrollWidth,
        pre: pre.getBoundingClientRect().width, whiteSpace: getComputedStyle(pre).whiteSpace,
        overflow: getComputedStyle(pre).overflowX, focusable: pre.tabIndex };
    });
    assert.ok(dimensions.document <= dimensions.viewport + 1, `${question.id}: ${JSON.stringify(dimensions)}`);
    assert.ok(dimensions.pre <= dimensions.viewport - 30);
    assert.equal(dimensions.whiteSpace, 'pre');
    assert.equal(dimensions.overflow, 'auto');
    assert.equal(dimensions.focusable, 0);
  }
  await page.evaluate(() => { document.documentElement.dataset.qgTheme = 'dark'; });
  const colors = await page.evaluate(() => {
    const pre = document.querySelector('#output pre');
    return { background: getComputedStyle(pre).backgroundColor, foreground: getComputedStyle(pre.querySelector('code')).color };
  });
  assert.deepEqual(colors, { background: 'rgb(27, 26, 48)', foreground: 'rgb(241, 240, 251)' });
  await page.evaluate(() => { delete document.documentElement.dataset.qgTheme; });
});

test('real MathJax renders adjacent formulas while leaving fenced and inline code untouched', { timeout: 30000 }, async () => {
  const code = 'value = "$x^2$"\nif x < 2:\n    latex = "\\[\\sqrt{2}\\]"\n';
  await render('$x^2$ outside. `literal $y^2$`\n\n```python\n' + code + '```\n\n$z^2$ after.');
  await page.evaluate(() => {
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['\\[', '\\]'], ['$$', '$$']],
        macros: { E: '\\mathbb{E}', Prob: '\\mathbb{P}', Var: '\\mathrm{Var}', Cov: '\\mathrm{Cov}',
          Unif: '\\operatorname{Unif}', Bin: '\\operatorname{Bin}', dd: '\\mathrm{d}', R: '\\mathbb{R}', N: '\\mathbb{N}' },
      },
      startup: { typeset: false },
    };
  });
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js' });
  await page.evaluate(async () => {
    await window.MathJax.startup.promise;
    await window.MathJax.typesetPromise([document.getElementById('output')]);
  });
  assert.equal(await page.locator('#output mjx-container').count(), 2);
  assert.equal(await page.locator('#output pre mjx-container').count(), 0);
  assert.equal(await page.locator('#output pre code').textContent(), code);
  assert.equal(await page.locator('#output p > code').textContent(), 'literal $y^2$');
  assert.deepEqual(errors, []);
});

test('multiline display delimiters keep aligned/cases rows and row spacing together beside code', async () => {
  const aligned = '\\begin{aligned}\na&=b+c\\\\[4pt]\nd&=e\n\\end{aligned}';
  const cases = '\\begin{cases}\n1,&x<0,\\\\\n\n0,&x\\geq0.\n\\end{cases}';
  const code = 'literal = "\\[ not math \\] $$ also not math $$"\n';
  const input = 'Before $$' + aligned + '$$ after.\n\n```python\n' + code + '```\n\n\\[' + cases + '\\]\n\n`literal \\[ code \\]` and `$$code$$`.';
  for (const blocks of [false, true]) {
    const result = await render(input, { blocks });
    assert.equal(result.code[0].text, code);
    const raw = await page.locator('#output .rich-math-display').allTextContents();
    assert.deepEqual(raw, [`\\[${aligned}\\]`, `\\[${cases}\\]`]);
    await page.evaluate(() => window.MathJax.typesetPromise([document.getElementById('output')]));
    assert.equal(await page.locator('#output .rich-math-display > mjx-container[display="true"]').count(), 2);
    assert.equal(await page.locator('#output mjx-merror, #output [data-mjx-error]').count(), 0);
    assert.equal(await page.locator('#output pre code').textContent(), code);
    assert.equal(await page.locator('#output pre mjx-container, #output p > code mjx-container').count(), 0);
  }
});

test('all 16 real questions with TeX environments render complete prompt, answer, and source-reference blocks', { timeout: 60000, skip: !realQuestionPath }, async () => {
  const fieldsOf = question => ({ promptZh: question.promptZh, explanation: question.explanation,
    sourceReference: question.provenance.sourceReference, reviewNotes: question.provenance.reviewNotes });
  const questions = (await realQuestions()).filter(question => Object.values(fieldsOf(question)).some(value => value?.includes('\\begin{')));
  assert.deepEqual(questions.map(question => question.provenance.originalNumber), [
    '1.1.1', '1.1.8', '1.1.16', '1.6.2', '1.6.3', '2.2.1', '2.2.5', '2.2.6',
    '2.3.1', '2.3.2', '2.3.3', '4.2.2', '5.0.2', '6.1.4', '6.1.5', 'A.13',
  ]);
  let environments = 0;
  for (const question of questions) {
    for (const [field, content] of Object.entries(fieldsOf(question))) {
      if (!content) continue;
      const label = `${question.provenance.originalNumber} ${field}`;
      await render(content);
      const blocks = await page.locator('#output .rich-math-display').allTextContents();
      const sourceBegins = [...content.matchAll(/\\begin\{([^}]+)\}/g)];
      // An inline pmatrix may legitimately stay inside a paragraph. Every
      // display block must keep its own begin/end pairs, however.
      for (const block of blocks) {
        const begins = [...block.matchAll(/\\begin\{([^}]+)\}/g)].map(match => match[1]).sort();
        const ends = [...block.matchAll(/\\end\{([^}]+)\}/g)].map(match => match[1]).sort();
        assert.deepEqual(begins, ends, `${label}: environment must never cross DOM block boundaries`);
      }
      environments += sourceBegins.length;
      await page.evaluate(() => window.MathJax.typesetPromise([document.getElementById('output')]));
      const mathErrors = await page.locator('#output mjx-merror, #output [data-mjx-error]').allTextContents();
      assert.deepEqual(mathErrors, [], label);
      assert.equal(await page.locator('#output .rich-math-display > mjx-container[display="true"]').count(), blocks.length, label);
    }
  }
  assert.ok(environments >= 30, `Covered ${environments} actual environments`);
  assert.deepEqual(errors, []);
});
