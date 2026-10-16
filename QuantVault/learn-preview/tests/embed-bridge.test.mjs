import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearnBridge, createRendererStorage, installEmbeddedNavigation } from '../src/embed-bridge.mjs';

function host() {
  const listeners = new Map(), documentListeners = new Map(), messages = [];
  const parent = { postMessage(message, origin) { messages.push({ message, origin }); } };
  const win = {
    parent, location: { origin: 'http://127.0.0.1:5188', href: 'http://127.0.0.1:5188/learn-embed/?lecture=l1', search: '?lecture=l1' },
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener(type) { listeners.delete(type); },
    document: { addEventListener(type, callback) { documentListeners.set(type, callback); }, removeEventListener(type) { documentListeners.delete(type); } },
  };
  const receive = (data, overrides = {}) => listeners.get('message')?.({ origin: win.location.origin, source: parent, data, ...overrides });
  return { win, parent, messages, receive, documentListeners };
}

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
    let prevented = false;
    const click = href => h.documentListeners.get('click')({
      target: { closest: () => ({ getAttribute: () => href }) },
      preventDefault() { prevented = true; }, stopImmediatePropagation() {},
    });
    click('?problem=14&fromPractice=lesson-14');
    assert.ok(prevented);
    assert.deepEqual(h.messages.at(-1).message, { type: 'qg-learn-navigate', displayId: '14', lessonId: 'lesson-14' });
    click('?view=assessment');
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
    h.receive({ type: 'qg-learn-save-error', error: 'fake' }, { source: {} });
    h.receive({ type: 'qg-learn-save-error', error: 'Storage full' });
    assert.deepEqual(errors, ['Storage full']);
  } finally { bridge.destroy(); }
});
