import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearnBridge, createRendererStorage, installEmbeddedNavigation, installEmbeddedRendererNavigation } from '../src/embed-bridge.mjs';

function host() {
  const listeners = new Map(), documentListeners = new Map(), messages = [];
  const parent = { postMessage(message, origin) { messages.push({ message, origin }); } };
  const win = {
    parent, location: new URL('http://127.0.0.1:5188/learn-embed/?lecture=l1'),
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener(type) { listeners.delete(type); },
    document: { addEventListener(type, callback) { documentListeners.set(type, callback); }, removeEventListener(type) { documentListeners.delete(type); } },
  };
  const receive = (data, overrides = {}) => listeners.get('message')?.({ origin: win.location.origin, source: parent, data, ...overrides });
  return { win, parent, messages, receive, documentListeners, listeners };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const saves = h => h.messages.filter(item => item.message.type === 'qg-learn-progress').map(item => item.message);
const navigations = h => h.messages.filter(item => item.message.type === 'qg-learn-navigate').map(item => item.message);
const ack = (h, request = saves(h).at(-1)) => h.receive({ type: 'qg-learn-saved', requestId: request.requestId });
const anchorClick = (h, href) => {
  let prevented = false;
  h.documentListeners.get('click')({ target: { closest: selector => selector === 'a[href]' ? { getAttribute: () => href, hasAttribute: () => false } : null },
    preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  return prevented;
};

test('embedded handshake accepts only the authenticated same-origin parent', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    assert.deepEqual(h.messages[0], { message: { type: 'qg-learn-ready' }, origin: h.win.location.origin });
    h.receive({ type: 'qg-learn-init', userId: 'attacker', progress: { xp: 900 } }, { origin: 'https://wrong.example' });
    h.receive({ type: 'qg-learn-init', userId: 'attacker', progress: { xp: 900 } }, { source: {} });
    assert.equal(bridge.userId, null);
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: { xp: 50, completed: ['l0'] } });
    assert.deepEqual(await bridge.ready, { userId: 'vip' });
    assert.equal(bridge.readProgress().xp, 50);
    h.receive({ type: 'qg-learn-init', userId: 'other', progress: { xp: 999 } });
    assert.equal(bridge.userId, 'vip');
    const copy = bridge.readProgress(); copy.xp = 500;
    assert.equal(bridge.readProgress().xp, 50);
  } finally { bridge.destroy(); }
});

test('resource requests are correlated and reject host errors without fetching static exports', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} });
    const response = bridge.request('library');
    await Promise.resolve();
    const request = h.messages.at(-1).message;
    assert.equal(request.resource, 'library');
    h.receive({ type: 'qg-learn-response', requestId: request.requestId, payload: { lessons: ['wrong'] } }, { source: {} });
    h.receive({ type: 'qg-learn-response', requestId: request.requestId, payload: { lessons: ['l1'] } });
    assert.deepEqual(await response, { lessons: ['l1'] });
    const denied = bridge.request('problem', { rawId: '541' });
    await Promise.resolve();
    assert.equal(h.messages.at(-1).message.rawId, '541');
    h.receive({ type: 'qg-learn-response', requestId: h.messages.at(-1).message.requestId, error: 'VIP access required' });
    await assert.rejects(denied, /VIP access required/);
    await assert.rejects(bridge.request('private/problems.json'), /Unsupported/);
  } finally { bridge.destroy(); }
});

test('completion and renderer drafts share parent-owned progress without browser storage', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: { xp: 50, completed: ['l1'] } });
    await bridge.ready;
    const storage = createRendererStorage(bridge);
    storage.setItem('qvl-code-l1-3', 'def f(): return 1');
    assert.equal(storage.getItem('qvl-code-l1-3'), 'def f(): return 1');
    assert.equal(bridge.readProgress().xp, 50);
    assert.equal(h.messages.at(-1).message.type, 'qg-learn-progress');
    assert.deepEqual(h.messages.at(-1).message.progress.completed, ['l1']);
    storage.removeItem('qvl-code-l1-3');
    assert.equal(storage.getItem('qvl-code-l1-3'), null);
  } finally { bridge.destroy(); }
});

test('course routes survive parent refresh and question/assessment links leave the iframe', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} });
    await bridge.ready;
    const remove = installEmbeddedNavigation(h.win, bridge);
    assert.deepEqual(h.messages.at(-1).message, { type: 'qg-learn-route', query: 'lecture=l1' });
    assert.ok(anchorClick(h, '?problem=14&fromPractice=lesson-14'));
    await tick();
    assert.deepEqual(h.messages.at(-1).message, { type: 'qg-learn-navigate', displayId: '14', lessonId: 'lesson-14' });
    anchorClick(h, '?view=assessment');
    await tick();
    assert.deepEqual(h.messages.at(-1).message, { type: 'qg-learn-navigate', view: 'readiness' });
    remove();
  } finally { bridge.destroy(); }
});

test('directly opened renderer cannot initialize or request course data', async () => {
  const h = host(); h.win.parent = h.win;
  const bridge = createLearnBridge(h.win);
  try {
    await assert.rejects(bridge.ready, /QuantGym/);
    await assert.rejects(bridge.request('library'), /QuantGym/);
    assert.equal(h.messages.length, 0);
  } finally { bridge.destroy(); }
});

test('storage errors from the verified parent are visible instead of silently claiming a save', async () => {
  const h = host(), errors = [];
  const bridge = createLearnBridge(h.win, { onSaveError: error => errors.push(error) });
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} });
    await bridge.ready;
    bridge.writeProgress({ xp: 20 });
    const requestId = saves(h).at(-1).requestId;
    h.receive({ type: 'qg-learn-save-error', error: 'fake' }, { source: {} });
    h.receive({ type: 'qg-learn-save-error', requestId, error: 'Storage full' });
    assert.deepEqual(errors, ['Storage full']);
  } finally { bridge.destroy(); }
});

test('rapid input stays optimistic and navigation waits for every correlated durable acknowledgement', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: { xp: 0, completed: [] } });
    await bridge.ready;
    bridge.writeProgress({ xp: 20, completed: ['l1'] });
    const first = saves(h)[0];
    bridge.writeProgress({ xp: 20, completed: ['l1'], renderer: { position: '3' } });
    bridge.writeProgress({ xp: 20, completed: ['l1'], renderer: { position: '4' } });
    assert.equal(saves(h).length, 1, 'Only one input snapshot is in flight');
    const leaving = bridge.navigate({ displayId: '14' });
    h.receive({ type: 'qg-learn-saved', requestId: first.requestId }, { source: {} });
    h.receive({ type: 'qg-learn-saved', requestId: 'unknown' });
    await tick(); assert.equal(navigations(h).length, 0);
    ack(h, first);
    assert.equal(saves(h).length, 2);
    assert.equal(saves(h)[1].progress.renderer.position, '4');
    assert.equal(bridge.hasPendingProgress, true);
    ack(h, first); // An old acknowledgement cannot confirm the newer edit.
    await tick(); assert.equal(navigations(h).length, 0);
    ack(h);
    await leaving;
    assert.deepEqual(navigations(h), [{ type: 'qg-learn-navigate', displayId: '14' }]);
    assert.equal(bridge.hasPendingProgress, false);
    assert.deepEqual(bridge.readProgress().renderer, { position: '4' });
    assert.deepEqual(h.messages.filter(item => item.message.type === 'qg-learn-save-status').map(item => item.message.pending), [true, true, false]);
    h.receive({ type: 'qg-learn-saved' }); // Unsolicited legacy replies are inert.
  } finally { bridge.destroy(); }
});

test('failed save blocks navigation, retains the newest input and can retry without another edit', async () => {
  const h = host(), errors = [], bridge = createLearnBridge(h.win, { onSaveError: message => errors.push(message) });
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
    const progress = { xp: 20, completed: ['l1'], renderer: { answer: 'kept answer' } };
    bridge.writeProgress(progress);
    const leaving = bridge.navigate({ query: 'practice=l1' });
    const rejected = assert.rejects(leaving, /offline/);
    h.receive({ type: 'qg-learn-save-error', requestId: saves(h)[0].requestId, error: 'offline' });
    await rejected;
    assert.equal(navigations(h).length, 0); assert.deepEqual(bridge.readProgress(), progress);
    assert.equal(bridge.hasPendingProgress, true); assert.deepEqual(errors, ['offline']);
    const retry = bridge.retrySave();
    assert.equal(saves(h).length, 2);
    assert.deepEqual(saves(h)[1].progress, progress);
    assert.notEqual(saves(h)[0].requestId, saves(h)[1].requestId);
    ack(h); await retry;
    assert.equal(navigations(h).length, 0, 'Retrying save does not unexpectedly leave the lesson');
    await bridge.navigate({ query: 'practice=l1' });
    assert.equal(navigations(h).length, 1);
  } finally { bridge.destroy(); }
});

test('Practice click runs completion handler before waiting for save and opening the practice page', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
    installEmbeddedNavigation(h.win, bridge);
    assert.ok(anchorClick(h, '?practice=l1'));
    // The captured inline click handler runs after document capture and before
    // the default navigation microtask, just as trackPracticeClick banks XP.
    bridge.writeProgress({ xp: 20, completed: ['l1'] });
    await tick(); assert.equal(navigations(h).length, 0);
    ack(h); await tick();
    assert.deepEqual(navigations(h), [{ type: 'qg-learn-navigate', query: 'practice=l1' }]);
  } finally { bridge.destroy(); }
});

test('embedded Next Lesson buttons bank completion and wait instead of assigning location immediately', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  let rendered = false, originalNavigation = false;
  h.win.SlideViewer = { render() { rendered = true; }, handleComplete() { originalNavigation = true; },
    bankXp() { bridge.writeProgress({ xp: 20, completed: ['l1'] }); } };
  const originalRender = h.win.SlideViewer.render, originalComplete = h.win.SlideViewer.handleComplete;
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
    const remove = installEmbeddedRendererNavigation(h.win, bridge);
    h.win.SlideViewer.render({}, {}, { nextUrl: '?lecture=l2', mapUrl: '?track=quant' });
    assert.equal(rendered, true);
    const leaving = h.win.SlideViewer.handleComplete('next');
    await tick(); assert.equal(navigations(h).length, 0); assert.equal(originalNavigation, false);
    ack(h); await leaving;
    assert.deepEqual(navigations(h), [{ type: 'qg-learn-navigate', query: 'lecture=l2' }]);
    remove(); assert.equal(h.win.SlideViewer.render, originalRender); assert.equal(h.win.SlideViewer.handleComplete, originalComplete);
  } finally { bridge.destroy(); }
});

test('outer navigation flush waits for coalesced input and unload warns only while records are pending', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
    bridge.writeProgress({ renderer: { code: 'first' } });
    bridge.writeProgress({ renderer: { code: 'latest' } });
    h.receive({ type: 'qg-learn-flush', requestId: 'outer-navigation' });
    let warned = false;
    h.listeners.get('beforeunload')({ preventDefault() { warned = true; } }); assert.equal(warned, true);
    ack(h); await tick();
    assert.equal(h.messages.some(item => item.message.type === 'qg-learn-flushed'), false);
    ack(h); await tick();
    assert.deepEqual(h.messages.at(-1).message, { type: 'qg-learn-flushed', requestId: 'outer-navigation' });
    warned = false;
    h.listeners.get('beforeunload')({ preventDefault() { warned = true; } }); assert.equal(warned, false);
  } finally { bridge.destroy(); }
});

test('save timeout preserves the input and a retry uses a fresh request id', async () => {
  const h = host(), bridge = createLearnBridge(h.win, { saveTimeoutMs: 15 });
  try {
    h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
    bridge.writeProgress({ notes: [{ text: 'keep this note' }] });
    const old = saves(h)[0];
    await assert.rejects(bridge.flushProgress(), /保存确认超时/);
    assert.equal(bridge.readProgress().notes[0].text, 'keep this note');
    const retry = bridge.retrySave();
    ack(h, old); assert.equal(bridge.hasPendingProgress, true);
    ack(h); await retry; assert.equal(bridge.hasPendingProgress, false);
  } finally { bridge.destroy(); }
});

test('destroying a reader rejects pending flush and never emits late navigation', async () => {
  const h = host(), bridge = createLearnBridge(h.win);
  h.receive({ type: 'qg-learn-init', userId: 'vip', progress: {} }); await bridge.ready;
  bridge.writeProgress({ xp: 20 });
  const rejected = assert.rejects(bridge.navigate({ view: 'readiness' }), /closed/);
  bridge.destroy(); await rejected;
  ack(h); await tick();
  assert.equal(navigations(h).length, 0);
  assert.equal(h.listeners.has('beforeunload'), false);
});
