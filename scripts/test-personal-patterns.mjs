import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generatePatternQuestion, validatePatternCell, patternCellKey, describePatternCell, PATTERN_FAMILIES, PATTERN_DIFFICULTIES } from '../src/features/personal/mental/patternQuestions.js';

const NOW = '2026-09-10T12:34:56.789Z';
const mod = (value, size) => ((value % size) + size) % size;
const shapes = ['circle', 'triangle', 'square'];
const fills = ['outline', 'solid', 'striped'];
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function questionFor(family, difficulty, seed) {
  const random = seeded(seed);
  let first = true;
  return generatePatternQuestion({ difficulty }, { now: NOW, index: seed + 1, rng: () => {
    if (first) { first = false; return (PATTERN_FAMILIES.indexOf(family) + 0.5) / PATTERN_FAMILIES.length; }
    return random();
  } });
}

// Solve only from the eight visible cells. Do not use generator internals or
// trust its stored answer when checking that the options have one solution.
function visibleRuleMatches(question, candidate) {
  const grid = question.grid;
  const fillStep = fills.indexOf(grid[1].fill) - fills.indexOf(grid[0].fill);
  const expectedFill = fills[mod(fills.indexOf(grid[7].fill) + fillStep, 3)];
  if (candidate.fill !== expectedFill) return false;
  if (question.family === 'rotation') return candidate.shape === 'arrow'
    && candidate.rotation === mod(grid[7].rotation + grid[1].rotation - grid[0].rotation, 360)
    && JSON.stringify(candidate.positions) === JSON.stringify(grid[7].positions);
  if (question.family === 'count') return candidate.shape === 'circle' && candidate.rotation === 0
    && candidate.positions.length === grid[7].positions.length + grid[1].positions.length - grid[0].positions.length;
  if (question.family === 'shape-cycle') return candidate.shape === shapes[mod(shapes.indexOf(grid[7].shape) + shapes.indexOf(grid[1].shape) - shapes.indexOf(grid[0].shape), 3)]
    && candidate.rotation === 0 && JSON.stringify(candidate.positions) === '[4]';
  if (question.family === 'position') {
    const expectedColumn = mod(grid[7].positions[0] % 3 + grid[1].positions[0] % 3 - grid[0].positions[0] % 3, 3);
    return candidate.shape === grid[7].shape && candidate.positions.length === 1
      && candidate.positions[0] === Math.floor(grid[7].positions[0] / 3) * 3 + expectedColumn
      && candidate.rotation === mod(grid[7].rotation + grid[1].rotation - grid[0].rotation, 360);
  }
  const expected = Array.from({ length: 9 }, (_, position) => position).filter(position => question.family === 'union'
    ? grid[6].positions.includes(position) || grid[7].positions.includes(position)
    : grid[6].positions.includes(position) !== grid[7].positions.includes(position));
  return candidate.shape === 'circle' && candidate.rotation === 0 && JSON.stringify(candidate.positions) === JSON.stringify(expected);
}

test('all 18 family/difficulty combinations have exactly one independently solved option across 2,160 seeds', () => {
  for (const family of PATTERN_FAMILIES) for (const difficulty of PATTERN_DIFFICULTIES) for (let seed = 1; seed <= 120; seed += 1) {
    const question = questionFor(family, difficulty, seed);
    const context = `${family}/${difficulty}/${seed}`;
    assert.equal(question.family, family, context);
    assert.equal(question.grid.length, 9, context);
    assert.equal(question.grid[8], null, context);
    question.grid.slice(0, 8).forEach(validatePatternCell);
    assert.deepEqual(question.options.map(option => option.id), ['A', 'B', 'C', 'D', 'E', 'F'], context);
    assert.equal(new Set(question.options.map(option => patternCellKey(option.cell))).size, 6, context);
    const solutions = question.options.filter(option => visibleRuleMatches(question, option.cell));
    assert.equal(solutions.length, 1, context);
    assert.equal(solutions[0].id, question.answer, context);
  }
});

test('set puzzles visibly establish union versus XOR in both complete rows', () => {
  for (const family of ['union', 'xor']) for (const difficulty of PATTERN_DIFFICULTIES) for (let seed = 1; seed <= 40; seed += 1) {
    const { grid } = questionFor(family, difficulty, seed);
    for (const start of [0, 3]) {
      const left = grid[start].positions, right = grid[start + 1].positions;
      assert.ok(left.some(position => right.includes(position)), 'overlap must demonstrate cancellation or retention');
      const expected = Array.from({ length: 9 }, (_, index) => index).filter(position => family === 'union'
        ? left.includes(position) || right.includes(position) : left.includes(position) !== right.includes(position));
      assert.deepEqual(grid[start + 2].positions, expected);
      assert.ok(expected.length > 0);
    }
  }
});

test('every hard puzzle changes two visible attributes, including both in the completed rows', () => {
  for (const family of PATTERN_FAMILIES) {
    const question = questionFor(family, 'hard', 45);
    for (const start of [0, 3]) {
      const row = question.grid.slice(start, start + 3);
      const varying = ['shape', 'fill', 'rotation', 'positions'].filter(field => new Set(row.map(cell => JSON.stringify(cell[field]))).size > 1);
      assert.ok(varying.length >= 2, family);
    }
    assert.match(question.explanation, /同时/);
    assert.match(question.explanationEn, /At the same time|Independently/);
  }
});

test('symmetric shapes cannot masquerade as visually different rotation choices', () => {
  const base = { shape: 'circle', fill: 'outline', rotation: 0, positions: [4] };
  for (const shape of ['circle', 'square']) for (const rotation of [90, 180, 270]) assert.throws(() => validatePatternCell({ ...base, shape, rotation }));
  for (const shape of ['triangle', 'arrow']) assert.equal(new Set([0, 90, 180, 270].map(rotation => patternCellKey({ ...base, shape, rotation }))).size, 4);
  for (const invalid of [{ ...base, positions: [] }, { ...base, positions: [4, 4] }, { ...base, positions: [5, 1] }, { ...base, positions: [9] }, { ...base, positions: [1.5] }, { ...base, shape: 'hidden' }, { ...base, fill: 'invisible' }, { ...base, extra: true }]) assert.throws(() => validatePatternCell(invalid));
});

test('constant and boundary random values terminate with six visible options', () => {
  for (const difficulty of PATTERN_DIFFICULTIES) for (const value of [0, 1 / 6, 0.5, 5 / 6, 1, -1, NaN, Infinity]) {
    const question = generatePatternQuestion({ difficulty }, { now: NOW, rng: () => value });
    assert.equal(question.options.length, 6);
    assert.equal(new Set(question.options.map(option => patternCellKey(option.cell))).size, 6);
    assert.equal(question.options.filter(option => visibleRuleMatches(question, option.cell)).length, 1);
  }
});

test('question snapshots contain the attempt contract and remain independent', () => {
  const first = generatePatternQuestion({ difficulty: 'hard' }, { index: 8, now: NOW, rng: seeded(19) });
  const next = generatePatternQuestion({ difficulty: 'hard' }, { index: 8, now: NOW, rng: seeded(19) });
  assert.deepEqual(first, next);
  assert.equal(first.id, 'q8');
  assert.equal(first.kind, 'pattern');
  assert.equal(first.startedAt, NOW);
  for (const field of ['completedAt', 'elapsedMs', 'outcome', 'submittedAnswer']) assert.equal(first[field], null);
  assert.deepEqual(first.mistakes, []);
  assert.equal(typeof first.explanation, 'string');
  assert.equal(typeof first.explanationEn, 'string');
  first.grid[0].positions.push(8);
  assert.notDeepEqual(first, next);
  assert.equal(generatePatternQuestion({ difficulty: 'unknown' }).difficulty, 'medium');
  assert.throws(() => generatePatternQuestion({}, { index: 0 }));
  assert.throws(() => generatePatternQuestion({}, { now: 'invalid' }));
});

test('accessible descriptions distinguish fill, direction, count and internal positions without color', () => {
  const cell = { shape: 'arrow', fill: 'striped', rotation: 90, positions: [0, 8] };
  assert.match(describePatternCell(cell), /2 个条纹箭头，朝右；位置：左上、右下/);
  assert.match(describePatternCell(cell, 'en'), /2 striped arrows, pointing right; positions: top left, bottom right/);
  const question = questionFor('rotation', 'hard', 2);
  assert.equal(new Set(question.options.map(option => describePatternCell(option.cell))).size, 6);
});

let componentPromise;
function loadComponent() {
  componentPromise ||= (async () => {
    const { transformWithOxc } = await import('vite');
    const require = createRequire(import.meta.url);
    const filename = fileURLToPath(new URL('../src/features/personal/mental/PatternPuzzle.jsx', import.meta.url));
    const source = (await readFile(filename, 'utf8')).replace("import './patternPuzzle.css';", '');
    let { code } = await transformWithOxc(source, filename, { jsx: { runtime: 'automatic' } });
    for (const dependency of ['react', 'react/jsx-runtime']) for (const quote of ["'", '"']) code = code.replaceAll(`from ${quote}${dependency}${quote}`, `from ${quote}${pathToFileURL(require.resolve(dependency)).href}${quote}`);
    for (const quote of ["'", '"']) code = code.replaceAll(`${quote}./patternQuestions.js${quote}`, `${quote}${new URL('../src/features/personal/mental/patternQuestions.js', import.meta.url).href}${quote}`);
    return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).PatternPuzzle;
  })();
  return componentPromise;
}

test('SVG view renders eight known cells, six focusable options and distinct stripe definitions', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const PatternPuzzle = await loadComponent();
  const question = questionFor('rotation', 'hard', 12);
  const markup = renderToStaticMarkup(createElement(PatternPuzzle, { question, selectedAnswer: 'B', language: 'en' }));
  assert.equal((markup.match(/<svg /g) || []).length, 14);
  assert.equal((markup.match(/<button /g) || []).length, 6);
  assert.equal((markup.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(markup, /Missing cell, bottom right/);
  assert.doesNotMatch(markup, /disabled=""|Correct answer:/);
  const patternIds = [...markup.matchAll(/<pattern id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(patternIds.length > 1);
  assert.equal(new Set(patternIds).size, patternIds.length);
  for (const match of markup.matchAll(/translate\((\d+) (\d+)\) rotate\((\d+)\)/g)) {
    assert.ok([20, 50, 80].includes(Number(match[1])) && [20, 50, 80].includes(Number(match[2])));
    assert.ok([0, 90, 180, 270].includes(Number(match[3])));
  }
});

test('feedback keeps the submitted answer visible and identifies the correct option without relying on color', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const PatternPuzzle = await loadComponent();
  const original = questionFor('count', 'easy', 7);
  const wrong = original.options.find(option => option.id !== original.answer).id;
  const question = { ...original, submittedAnswer: wrong };
  const markup = renderToStaticMarkup(createElement(PatternPuzzle, { question, selectedAnswer: original.answer, showAnswer: true, language: 'en' }));
  assert.match(markup, new RegExp(`Correct answer: ${original.answer} · Your choice: ${wrong}`));
  assert.match(markup, /ppuzzle-wrong/);
  assert.match(markup, /ppuzzle-correct/);
  assert.match(markup, /✓/);
  assert.match(markup, /×/);
  assert.equal((markup.match(/disabled=""/g) || []).length, 6);
  const unchanged = renderToStaticMarkup(createElement(PatternPuzzle, { question: original, disabled: true }));
  assert.equal((unchanged.match(/disabled=""/g) || []).length, 6);
  assert.doesNotMatch(unchanged, /ppuzzle-explanation/);
});
