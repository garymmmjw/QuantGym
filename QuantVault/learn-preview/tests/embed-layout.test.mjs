import test from 'node:test';
import assert from 'node:assert/strict';
import { installEmbeddedLayout, measureLearnDocument } from '../src/embed-layout.mjs';

test('natural document size can shrink after leaving a long map, independent of iframe viewport', () => {
  const document = { body: { getBoundingClientRect: () => ({ height: 851.2 }), scrollHeight: 22000 }, documentElement: { clientHeight: 22000 } };
  assert.equal(measureLearnDocument(document), 852);
});

test('layout reports content and width changes once, then stops after navigation', () => {
  let height = 800, nextFrame = null;
  const callbacks = [], reports = [], events = new Map();
  class Observer { constructor(cb) { callbacks.push(cb); } observe() {} disconnect() {} }
  const body = { getBoundingClientRect: () => ({ height }) };
  const win = { document: { body, getElementById: () => ({}), addEventListener() {}, removeEventListener() {} },
    ResizeObserver: Observer, MutationObserver: Observer,
    requestAnimationFrame(cb) { nextFrame = cb; return 1; }, cancelAnimationFrame() { nextFrame = null; },
    addEventListener(name, fn) { events.set(name, fn); }, removeEventListener(name) { events.delete(name); } };
  const flush = () => { const cb = nextFrame; nextFrame = null; cb?.(); };
  const stop = installEmbeddedLayout(win, { reportLayout: size => reports.push(size) });
  flush();
  height = 18000; callbacks[0](); callbacks[1](); flush();
  callbacks[0](); flush();
  height = 600; events.get('resize')(); flush();
  assert.deepEqual(reports, [800, 18000, 600]);
  stop(); height = 1200; callbacks[0](); flush();
  assert.deepEqual(reports, [800, 18000, 600]);
});
