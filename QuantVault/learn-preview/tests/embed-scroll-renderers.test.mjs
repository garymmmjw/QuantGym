import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from '@babel/parser';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
function namedFunction(source, name) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) found.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] }));
  assert.equal(found.length, 1, `one ${name}`);
  return source.slice(found[0].start, found[0].end);
}
// Evaluate only the pure patch function. Do not run the content exporter or
// mutate generated assets as part of these behavior checks.
const patch = vm.runInNewContext(`(${namedFunction(read('../scripts/sync-local-content.mjs'), 'patchEmbeddedScroll')})`);
const slides = patch(read('../../captures/learn-2026-10-15/assets/slide-viewer.js'), 'slides');
const cards = patch(read('../../captures/learn-2026-10-15/assets/compare-cards.js'), 'cards');
const run = (source, name, context) => {
  const scope = vm.createContext(context);
  vm.runInContext(namedFunction(source, name), scope);
  vm.runInContext(`${name}()`, scope);
  return scope;
};

test('embedded slide turns delegate visibility decisions to the host, while widget re-renders stay still', () => {
  const calls = [], content = {};
  const context = {
    suppressSlideScroll: false,
    document: { getElementById: id => id === 'sv-content' ? content : null },
    window: { QGLearnEmbed: { scrollToElement: (...args) => calls.push(args) } },
    getComputedStyle: () => { throw Error('Child viewport must not decide visibility'); },
  };
  run(slides, 'maybeScrollToSlideTop', context);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], content);
  assert.equal(calls[0][1].onlyIfAbove, true);
  assert.equal(calls[0][1].behavior, 'instant');
  calls.length = 0;
  const scope = run(slides, 'maybeScrollToSlideTop', { ...context, suppressSlideScroll: true });
  assert.equal(calls.length, 0);
  assert.equal(scope.suppressSlideScroll, false);
});

test('independent slide preview retains its native page scroll behavior', () => {
  const calls = [];
  run(slides, 'maybeScrollToSlideTop', {
    suppressSlideScroll: false,
    document: { getElementById: id => id === 'sv-content' ? { getBoundingClientRect: () => ({ top: -200 }) } : null, querySelector: () => null },
    window: { scrollY: 200, scrollTo: options => calls.push(options) },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].top, 0);
});

test('embedded slide counters do not drag the host page toward a TOC item', () => {
  for (const embedded of [true, false]) {
    let nativeCalls = 0;
    run(slides, 'updateChrome', {
      current: 0, slides: [{}], data: { id: 'session' },
      localStorage: { setItem() {} }, window: embedded ? { QGLearnEmbed: {} } : {},
      document: { querySelectorAll: () => [], getElementById: () => null,
        querySelector: () => ({ scrollIntoView() { nativeCalls++; } }) },
    });
    assert.equal(nativeCalls, embedded ? 0 : 1);
  }
});

test('embedded card navigation uses host viewport; standalone cards still scroll natively', () => {
  const calls = [], root = { getBoundingClientRect: () => ({ top: -100 }) };
  run(cards, 'toDeckTop', { root, window: { QGLearnEmbed: { scrollToElement: (...args) => calls.push(args) } } });
  assert.equal(calls[0][0], root);
  assert.equal(calls[0][1].onlyIfAbove, true);
  const native = [];
  run(cards, 'toDeckTop', { root, document: { querySelector: () => null }, window: { scrollY: 400, scrollTo: options => native.push(options) } });
  assert.equal(native[0].top, 292);
});

test('card answer feedback remains visible through a nearest-position host request', () => {
  for (const embedded of [true, false]) {
    const hostCalls = []; let nativeCalls = 0;
    const feedback = { scrollIntoView() { nativeCalls++; } };
    const root = { innerHTML: '', querySelector: selector => selector === '.cc-feedback' ? feedback : null };
    run(cards, 'paint', { root, opts: {}, data: {}, view: 'deck', justAnswered: true,
      headerBar: () => '', card: () => '', setTimeout: callback => callback(),
      window: embedded ? { QGLearnEmbed: { scrollToElement: (...args) => hostCalls.push(args) } } : {},
    });
    assert.equal(nativeCalls, embedded ? 0 : 1);
    assert.equal(hostCalls.length, embedded ? 1 : 0);
    if (embedded) assert.equal(hostCalls[0][1].block, 'nearest');
  }
});

test('course topic helper sends embedded anchors to the host and preserves standalone anchors', () => {
  const app = read('../src/App.jsx');
  for (const embedded of [true, false]) {
    const hostCalls = []; let nativeCalls = 0;
    const element = { scrollIntoView() { nativeCalls++; } };
    const scope = vm.createContext({ window: embedded ? { QGLearnEmbed: { scrollToElement: (...args) => hostCalls.push(args) } } : {}, element });
    vm.runInContext(namedFunction(app, 'scrollLearnElement'), scope);
    vm.runInContext("scrollLearnElement(element, {behavior:'smooth',block:'start'})", scope);
    assert.equal(hostCalls.length, embedded ? 1 : 0);
    assert.equal(nativeCalls, embedded ? 0 : 1);
  }
});

test('embedded topic selection is explicit; standalone viewport observation is preserved', () => {
  const app = read('../src/App.jsx');
  const changes = [], pills = ['probability', 'statistics'].map(topic => ({
    dataset: { topic }, classList: { toggle: (className, active) => changes.push({ topic, active }) },
  }));
  const scope = vm.createContext({ document: { querySelectorAll: () => pills } });
  vm.runInContext(namedFunction(app, 'activateMapTopic'), scope);
  vm.runInContext("activateMapTopic('statistics')", scope);
  assert.deepEqual(changes, [{ topic: 'probability', active: false }, { topic: 'statistics', active: true }]);
  for (const embedded of [true, false]) {
    const observed = [], activated = [], units = [{ id: 'unit-probability' }];
    let callback;
    const context = vm.createContext({ window: embedded ? { QGLearnEmbed: {} } : {},
      body: { querySelectorAll: () => units }, activateMapTopic: id => activated.push(id),
      IntersectionObserver: class { constructor(handler) { callback = handler; } observe(unit) { observed.push(unit); } },
    });
    vm.runInContext(namedFunction(app, 'observeMapTopics'), context);
    vm.runInContext('observeMapTopics(body)', context);
    assert.equal(observed.length, embedded ? 0 : 1);
    if (!embedded) { callback([{ isIntersecting: true, target: units[0] }]); assert.deepEqual(activated, ['probability']); }
  }
});

test('opening embedded formulas and contents brings each panel header into view', () => {
  for (const embedded of [true, false]) {
    const calls = [], header = {}, overlay = { style: {}, querySelector: () => header };
    const context = { formulaOverlayVisible: false, window: embedded ? { QGLearnEmbed: { scrollToElement: (...args) => calls.push(args) } } : {},
      document: { getElementById: id => id === 'sv-formulas' ? overlay : null, body: { style: {} } }, runKatex() {},
    };
    const scope = run(slides, 'toggleFormulas', context);
    assert.equal(calls.length, embedded ? 1 : 0);
    if (embedded) { assert.equal(calls[0][0], header); assert.equal(calls[0][1].block, 'start'); }
    vm.runInContext('toggleFormulas()', scope);
    assert.equal(calls.length, embedded ? 1 : 0, 'closing a panel must not scroll');

    calls.length = 0;
    const toc = { classList: { toggle() {} }, querySelector: () => header }, scrim = { style: {} };
    run(slides, 'toggleToc', { tocVisible: false, window: context.window,
      document: { getElementById: id => id === 'sv-toc' ? toc : scrim },
    });
    assert.equal(calls.length, embedded ? 1 : 0);
    if (embedded) { assert.equal(calls[0][0], header); assert.equal(calls[0][1].block, 'nearest'); }
  }
});

test('choosing an embedded contents entry closes the natural-flow panel before showing and locating its slide', () => {
  for (const embedded of [true, false]) {
    const order = [], content = {};
    const scope = vm.createContext({ tocVisible: true,
      window: embedded ? { QGLearnEmbed: { scrollToElement(element, options) {
        assert.equal(element, content); assert.equal(options.block, 'start');
        assert.equal(options.onlyIfAbove, undefined); order.push('locate');
      } } } : {},
      document: { getElementById: () => content },
      toggleToc() { order.push('close'); },
      goToSlide(index) { assert.equal(index, 12); order.push('render'); },
    });
    vm.runInContext(namedFunction(slides, 'selectTocSlide'), scope);
    vm.runInContext('selectTocSlide(12)', scope);
    assert.deepEqual(order, embedded ? ['close', 'render', 'locate'] : ['render']);
  }
  // Other navigation controls continue to use their original entry point.
  assert.ok(slides.includes('data-idx="${i}" onclick="SlideViewer.selectTocSlide(${i})"'));
  assert.ok(slides.includes('onclick="SlideViewer.goToSlide(${i})"></span>'));
});

test('renderer source drift fails the patch instead of silently dropping scrolling behavior', () => {
  assert.throws(() => patch('function unrelated() {}', 'slides'), /boundary changed/);
  assert.throws(() => patch('function unrelated() {}', 'cards'), /boundary changed/);
});
