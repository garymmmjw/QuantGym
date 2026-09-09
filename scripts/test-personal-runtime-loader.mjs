import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntimeScript } from '../src/app/runtimeScriptLoader.js';

function environment() {
  const nodes = [], timers = new Map(), cleared = [];
  let nextId = 0;
  const documentRef = { createElement(tag) {
    assert.equal(tag, 'script');
    return { removed: false, remove() { this.removed = true; } };
  }, head: { append(node) { nodes.push(node); } } };
  return { nodes, timers, cleared, options: { documentRef, timeoutMs: 1234,
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
    clearTimer(id) { cleared.push(id); timers.delete(id); },
  } };
}

test('runtime script success preserves execution order and releases timeout/error handlers', async () => {
  const fixture = environment();
  const pending = loadRuntimeScript('/data/problem-catalog.js', fixture.options);
  const script = fixture.nodes[0];
  assert.equal(script.src, '/data/problem-catalog.js');
  assert.equal(script.async, false);
  assert.equal([...fixture.timers.values()][0].delay, 1234);
  script.onload();
  assert.equal(await pending, true);
  assert.equal(script.removed, false);
  assert.equal(script.onload, null);
  assert.equal(script.onerror, null);
  assert.equal(fixture.timers.size, 0);
  assert.deepEqual(fixture.cleared, [1]);
});

test('runtime load errors remove the failed script and reject explicitly so the caller can retry', async () => {
  const fixture = environment();
  const pending = loadRuntimeScript('/missing.js', fixture.options);
  const script = fixture.nodes[0];
  script.onerror();
  await assert.rejects(pending, /runtime_unavailable/);
  assert.equal(script.removed, true);
  assert.equal(fixture.timers.size, 0);
  const retry = loadRuntimeScript('/missing.js', fixture.options);
  assert.equal(fixture.nodes.length, 2);
  fixture.nodes[1].onload();
  assert.equal(await retry, true);
});

test('runtime timeout removes the stalled script and a late load cannot change its outcome', async () => {
  const fixture = environment();
  const pending = loadRuntimeScript('/stalled.js', fixture.options);
  const script = fixture.nodes[0], lateLoad = script.onload;
  [...fixture.timers.values()][0].callback();
  await assert.rejects(pending, /runtime_timeout/);
  lateLoad();
  assert.equal(script.removed, true);
  assert.equal(script.onload, null);
  assert.equal(script.onerror, null);
  assert.deepEqual(fixture.cleared, [1]);
});
