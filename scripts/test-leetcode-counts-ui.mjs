import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithOxc } from 'vite';

const require = createRequire(import.meta.url);
async function componentModule(path, replacements = {}) {
  const url = new URL(path, import.meta.url);
  const source = (await readFile(url, 'utf8')).replace(/^import ['"].*\.css['"];?$/gm, '');
  let { code } = await transformWithOxc(source, fileURLToPath(url), { jsx: { runtime: 'automatic' } });
  const imports = { react: pathToFileURL(require.resolve('react')).href,
    'lucide-react': pathToFileURL(require.resolve('lucide-react')).href,
    'react/jsx-runtime': pathToFileURL(require.resolve('react/jsx-runtime')).href, ...replacements };
  for (const [dependency, target] of Object.entries(imports)) for (const quote of ['"', "'"]) {
    code = code.replaceAll(`from ${quote}${dependency}${quote}`, `from ${quote}${target}${quote}`);
  }
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const countsUrl = await componentModule('../src/features/careerStages/LeetCodeCounts.jsx');
const { LeetCodeCounts } = await import(countsUrl);
const stagesUrl = await componentModule('../src/features/careerStages/OverviewCareerStage.jsx', {
  './LeetCodeCounts.jsx': countsUrl,
  './stagePractice.js': new URL('../src/features/careerStages/stagePractice.js', import.meta.url).href,
});
const { OverviewCareerStage } = await import(stagesUrl);

test('new questions and total completions have separate labels and units, including confirmed zero', () => {
  const html = renderToStaticMarkup(createElement(LeetCodeCounts, {
    newCount: 0, totalCount: 85, newStatus: 'ready', totalStatus: 'ready',
  }));
  assert.match(html, /aria-label="新完成：0 题"/);
  assert.match(html, /aria-label="总完成：85 次"/);
  assert.doesNotMatch(html, /aria-label="[^"]*至少|≥/);
});

test('partial positive records carry a lower bound while missing first-solve dates stay unknown', () => {
  const html = renderToStaticMarkup(createElement(LeetCodeCounts, {
    newCount: null, totalCount: 85, newStatus: 'partial', totalStatus: 'partial', layout: 'inline',
  }));
  assert.match(html, /aria-label="新完成：暂无法确认"/);
  assert.match(html, /aria-label="总完成：至少 85 次"/);
  assert.match(html, /≥/);
  assert.doesNotMatch(html, /新完成：0|总完成：0/);
});

test('unavailable and malformed values never render a fabricated zero or invalid number', () => {
  for (const value of [undefined, null, -1, NaN, Infinity, 1.5]) {
    const html = renderToStaticMarkup(createElement(LeetCodeCounts, {
      newCount: value, totalCount: value, newStatus: 'ready', totalStatus: 'partial',
    }));
    assert.equal((html.match(/暂无法确认/g) || []).length, 4);
    assert.doesNotMatch(html, /NaN|Infinity|aria-label="[^"]*至少|≥/);
  }
  const unavailable = renderToStaticMarkup(createElement(LeetCodeCounts, { newCount: 71, totalCount: 85 }));
  assert.doesNotMatch(unavailable, />71<|>85</);
});

test('partial Stage totals are provisional while confirmed first solves remain a lower bound', () => {
  const html = renderToStaticMarkup(createElement(LeetCodeCounts, {
    newCount: 2, totalCount: 4, newStatus: 'partial', totalStatus: 'partial', scope: 'stage',
  }));
  assert.match(html, /aria-label="新完成：至少 2 题"/);
  assert.match(html, /aria-label="总完成：4 次，已记录次数，补齐历史后可能重新归属"/);
  assert.doesNotMatch(html, /总完成：至少/);
  assert.equal((html.match(/≥/g) || []).length, 1);
});

test('Stage overview retains the other training columns while exposing both LeetCode counts', () => {
  const html = renderToStaticMarkup(createElement(OverviewCareerStage, { rows: [{
    id: 'stage-1', label: 'Stage 1', isCurrent: true, periodStart: '2026-09-01', periodEnd: '2026-09-19',
    applications: 12, leetcodeNew: 34, leetcode: 51, leetcodeNewStatus: 'ready', leetcodeCountStatus: 'partial',
    technical: 7, behavioral: 3, mentalMathAverage: 12.5,
  }] }));
  for (const label of ['Applications', 'Tech', 'Behavioral', 'Mental Math']) assert.ok(html.includes(label));
  assert.match(html, /aria-current="step"/);
  assert.match(html, /aria-label="新完成：34 题"/);
  assert.match(html, /aria-label="总完成：51 次，已记录次数，补齐历史后可能重新归属"/);
  assert.doesNotMatch(html, /≥/);
  assert.match(html, />12\.5</);
  assert.doesNotMatch(html, /<(?:button|a)\b/, 'Overview Stage remains read-only');
});

test('shared Stage table exposes editing only when requested and passes the displayed row', () => {
  const rows = [
    { id: 'older', label: 'Stage 8', isCurrent: false, periodStart: '2026-08-21', periodEnd: '2026-09-13' },
    { id: 'current', label: 'Current preparation', description: 'Resume prepared', isCurrent: true, periodStart: '2026-09-13', periodEnd: '2026-09-20' },
  ];
  const before = structuredClone(rows);
  const clicked = [];
  const tree = OverviewCareerStage({ rows, onEdit: row => clicked.push(row) });
  const buttons = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object' || !node.props) return;
    if (node.type === 'button') buttons.push(node);
    visit(node.props.children);
  }
  visit(tree);
  assert.deepEqual(buttons.map(button => button.props['aria-label']), ['编辑 Current preparation', '编辑 Stage 8']);
  assert.equal(buttons[0].props.title, 'Resume prepared');
  buttons[0].props.onClick();
  assert.equal(clicked[0], rows[1]);
  assert.deepEqual(rows, before, 'rendering does not reorder or mutate source rows');
  const html = renderToStaticMarkup(tree);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  assert.doesNotMatch(html, /当前阶段/);
  const readOnly = renderToStaticMarkup(createElement(OverviewCareerStage, { rows }));
  assert.doesNotMatch(readOnly, /<(?:button|a)\b/);
});
