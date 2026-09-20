import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalStore } from '../personal/personalStore.js';
import { createPersonalCloudSync } from '../personal/personalCloud.js';
import { createTrackerSyncBridge, getTrackerWorkspace } from './trackerSyncBridge.js';
import { createTrackerStore, trackerStorageKey } from './trackerStore.js';
import { createCareerStageStore } from '../careerStages/stageStore.js';

const ownerId = 'alice';
const memoryStorage = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const app = (id = 'app-1') => ({ id, company: 'Test Company', role: 'Quant Research', prepPhase: '', season: '', events: [
  { id: `submit-${id}`, type: 'submitted', date: '9/16', dueDate: '', dueTime: '' },
  { id: `oa-${id}`, type: 'oa_received', date: '2026-09-17', dueDate: '2026-09-22', dueTime: '18:00' },
] });
function device(storage = memoryStorage(), id = ownerId) {
  const personalStore = createPersonalStore({ ownerId: id, storage });
  const bridge = createTrackerSyncBridge({ ownerId: id, personalStore, storage });
  bridge.start();
  return { ...bridge, personalStore, storage };
}
const flush = () => new Promise(resolve => queueMicrotask(resolve));
function transfer(from, to) {
  to.personalStore.mergeFromCloud(from.personalStore.getSnapshot().data);
}
const state = device => device.trackerStore.readSyncState();
function seed(storage) { createTrackerStore({ ownerId, storage }).addApplication(app()); }

test('migrates the old desktop cache, preserves its backup, and downloads to an empty phone', () => {
  const storage = memoryStorage(); seed(storage);
  const original = storage.getItem(trackerStorageKey(ownerId));
  const stageStore = createCareerStageStore({ ownerId, storage });
  stageStore.addStage({ label: 'Stage 1', description: 'Ready', recordedDate: '2026-08-21' });
  const desktop = device(storage), phone = device();
  assert.equal(desktop.getSnapshot().error, '');
  transfer(desktop, phone);
  assert.deepEqual(state(phone), state(desktop));
  assert.deepEqual(phone.stageStore.readSyncState(), desktop.stageStore.readSyncState());
  assert.equal(storage.getItem(`${trackerStorageKey(ownerId)}:before-cloud-sync`), original);
  const count = desktop.personalStore.getSnapshot().data.careerTrackerOperations.length;
  desktop.stop(); desktop.start();
  assert.equal(desktop.personalStore.getSnapshot().data.careerTrackerOperations.length, count);
});

test('offline additions and independent edits on both devices converge', async () => {
  const storage = memoryStorage(); seed(storage);
  const a = device(storage), b = device(); transfer(a, b);
  a.trackerStore.updateApplication({ ...a.trackerStore.getSnapshot().applications[0], company: 'New Company' });
  b.trackerStore.updateApplication({ ...b.trackerStore.getSnapshot().applications[0], role: 'New Role' });
  a.trackerStore.addApplication(app('desktop'));
  b.trackerStore.addApplication(app('phone'));
  await flush(); transfer(a, b); transfer(b, a);
  assert.deepEqual(state(a), state(b));
  assert.equal(state(a).applications.length, 3);
  const merged = state(a).applications.find(item => item.id === 'app-1');
  assert.equal(merged.company, 'New Company'); assert.equal(merged.role, 'New Role');
});

test('delete wins over a stale phone edit and undo survives subsequent sync', async () => {
  const storage = memoryStorage(); seed(storage);
  const a = device(storage), b = device(); transfer(a, b);
  const token = a.trackerStore.deleteEvent('app-1', 'oa-app-1');
  b.trackerStore.updateEventDeadline('app-1', 'oa-app-1', { dueDate: '2026-09-25', dueTime: '12:00' });
  await flush(); transfer(a, b); transfer(b, a);
  assert.equal(state(b).applications[0].events.length, 1);
  a.trackerStore.restoreEvent(token); await flush(); transfer(a, b); transfer(b, a);
  assert.deepEqual(state(a), state(b));
  assert.equal(state(b).applications[0].events[1].id, 'oa-app-1');
  assert.equal(state(b).deletedEvents.length, 0);
});

test('new writes are durable in the journal before a failed cache write', async () => {
  const storage = memoryStorage(); const a = device(storage);
  const set = storage.setItem;
  storage.setItem = (key, raw) => { if (key === trackerStorageKey(ownerId)) throw new Error('cache full'); set(key, raw); };
  assert.throws(() => a.trackerStore.addApplication(app()), /cache full/);
  assert.ok(a.personalStore.getSnapshot().data.careerTrackerOperations.length > 0);
  a.stop(); storage.setItem = set;
  const recovered = device(storage); await flush();
  assert.equal(state(recovered).applications[0].company, 'Test Company');
});

test('corrupt legacy records block migration without replacing the source', () => {
  const storage = memoryStorage(); storage.setItem(trackerStorageKey(ownerId), '{broken');
  const a = device(storage);
  assert.match(a.getSnapshot().error, /无法读取/);
  assert.equal(storage.getItem(trackerStorageKey(ownerId)), '{broken');
  assert.throws(() => a.trackerStore.addApplication(app()));
});

test('account and QA namespace records never enter a different account journal', () => {
  const storage = memoryStorage(); seed(storage);
  const bob = device(storage, 'bob');
  assert.deepEqual(state(bob).applications, []);
  const workspace = getTrackerWorkspace({ ownerId, namespace: 'qa', storage, personalStore: bob.personalStore });
  workspace.trackerStore.addApplication(app('qa'));
  assert.deepEqual(bob.personalStore.getSnapshot().data.careerTrackerOperations, []);
  assert.equal(createTrackerStore({ ownerId, storage }).getSnapshot().applications.length, 1);
});

test('revisioned cloud sync uploads legacy desktop records and an independent phone reads them', async () => {
  let data = null, revision = 0;
  const fetchImpl = async (_url, options) => {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      if (body.baseRevision !== revision) return new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 });
      data = structuredClone(body.data); revision += 1;
    }
    return new Response(JSON.stringify({ version: 1, revision, data, updatedAt: '2026-09-19T18:00:00Z' }), { status: 200 });
  };
  const storage = memoryStorage(); seed(storage);
  const desktop = device(storage), phone = device();
  const cloud = d => createPersonalCloudSync({ store: d.personalStore, ownerId, storage: d.storage, fetchImpl,
    config: { endpoint: 'https://example.test/api', token: 'fixture-token', userId: ownerId } });
  const desktopCloud = cloud(desktop), phoneCloud = cloud(phone);
  await desktopCloud.sync(); await phoneCloud.sync();
  assert.equal(revision, 1); assert.deepEqual(state(phone), state(desktop));
  phone.trackerStore.updateEventDeadline('app-1', 'oa-app-1', { dueDate: '2026-09-26', dueTime: '14:00' });
  await flush(); await phoneCloud.sync(); await desktopCloud.sync();
  assert.equal(state(desktop).applications[0].events[1].dueTime, '14:00');
  assert.deepEqual(state(phone), state(desktop));
});
