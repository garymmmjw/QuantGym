import test from 'node:test';
import assert from 'node:assert/strict';
import { changedFormFields, deadlineFormChanges, stageFormChanges } from './formChanges.js';
import { createTrackerSyncBridge } from './trackerSyncBridge.js';
import { createPersonalStore } from '../personal/personalStore.js';

const ownerId = 'form-owner';
const app = { id: 'application', company: 'Original Company', role: 'Original Role', prepPhase: '', season: '', events: [{ id: 'submitted', type: 'submitted', date: '2026-09-16', dueDate: '', dueTime: '' }] };
function device() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const personalStore = createPersonalStore({ ownerId, storage });
  const bridge = createTrackerSyncBridge({ ownerId, personalStore, storage });
  bridge.start();
  return { ...bridge, personalStore };
}
const flush = () => new Promise(resolve => queueMicrotask(resolve));
const transfer = (from, to) => to.personalStore.mergeFromCloud(from.personalStore.getSnapshot().data);

test('saving a stale detail form edits only its changed field after a remote company change', async () => {
  const laptop = device(), phone = device();
  laptop.trackerStore.addApplication(app);
  await flush(); transfer(laptop, phone);
  const opening = { company: app.company, role: app.role, prepPhase: app.prepPhase };
  phone.trackerStore.updateApplication({ ...phone.trackerStore.getSnapshot().applications[0], company: 'Phone Company' });
  await flush(); transfer(phone, laptop);
  const latest = laptop.trackerStore.getSnapshot().applications[0];
  laptop.trackerStore.updateApplication({ ...latest, ...changedFormFields(opening, { ...opening, role: 'Laptop Role' }) });
  await flush(); transfer(laptop, phone);
  for (const current of [laptop, phone]) {
    assert.equal(current.trackerStore.getSnapshot().applications[0].company, 'Phone Company');
    assert.equal(current.trackerStore.getSnapshot().applications[0].role, 'Laptop Role');
  }
});

test('a Stage description form preserves a newer remote name and date', async () => {
  const laptop = device(), phone = device();
  const created = laptop.stageStore.addStage({ label: 'Stage 1', description: 'Original', recordedDate: '2026-09-13' });
  await flush(); transfer(laptop, phone);
  const opening = { label: created.label, description: created.description, recordedDate: created.recordedDate };
  phone.stageStore.updateStage(created.id, { label: 'Stage 2', recordedDate: '2026-09-14' });
  await flush(); transfer(phone, laptop);
  const patch = changedFormFields(opening, { ...opening, description: 'Edited on laptop' });
  laptop.stageStore.updateStage(created.id, patch);
  await flush(); transfer(laptop, phone);
  assert.deepEqual(patch, { description: 'Edited on laptop' });
  for (const current of [laptop, phone]) {
    const stage = current.stageStore.getSnapshot().stages[0];
    assert.equal(stage.label, 'Stage 2');
    assert.equal(stage.recordedDate, '2026-09-14');
    assert.equal(stage.description, 'Edited on laptop');
  }
});

test('confirming an imported Stage supplies its displayed required date', async () => {
  const current = device();
  current.stageStore.ensureStages([{ id: 'imported', label: 'Stage 1', description: 'Imported' }]);
  await flush();
  const opening = { label: 'Stage 1', description: 'Imported', recordedDate: '2026-09-19' };
  current.stageStore.updateStage('imported', stageFormChanges(opening, { ...opening, description: 'Description only' }, current.stageStore.getSnapshot().stages[0]));
  await flush();
  assert.equal(current.stageStore.getSnapshot().stages[0].recordedDate, '2026-09-19');
  assert.equal(current.stageStore.getSnapshot().stages[0].description, 'Description only');
});

test('an imported Stage form preserves a date supplied by another device while open', async () => {
  const laptop = device(), phone = device();
  laptop.stageStore.ensureStages([{ id: 'imported', label: 'Stage 1', description: 'Imported' }]);
  await flush(); transfer(laptop, phone);
  const opening = { label: 'Stage 1', description: 'Imported', recordedDate: '2026-09-19' };
  phone.stageStore.updateStage('imported', { recordedDate: '2026-09-13' });
  await flush(); transfer(phone, laptop);
  const patch = stageFormChanges(opening, { ...opening, description: 'Edited on laptop' }, laptop.stageStore.getSnapshot().stages[0]);
  assert.deepEqual(patch, { description: 'Edited on laptop' });
  laptop.stageStore.updateStage('imported', patch);
  await flush(); transfer(laptop, phone);
  for (const current of [laptop, phone]) {
    assert.equal(current.stageStore.getSnapshot().stages[0].recordedDate, '2026-09-13');
    assert.equal(current.stageStore.getSnapshot().stages[0].description, 'Edited on laptop');
  }
});

test('changing a deadline date preserves a time edited remotely while the form is open', async () => {
  const laptop = device(), phone = device();
  const opening = { dueDate: '2026-09-22', dueTime: '18:00' };
  laptop.trackerStore.addApplication({ ...app, events: [{ ...app.events[0], ...opening }] });
  await flush(); transfer(laptop, phone);
  phone.trackerStore.updateEventDeadline(app.id, 'submitted', { dueTime: '09:30' });
  await flush(); transfer(phone, laptop);
  laptop.trackerStore.updateEventDeadline(app.id, 'submitted', deadlineFormChanges(opening, { ...opening, dueDate: '2026-09-23' }));
  await flush(); transfer(laptop, phone);
  for (const current of [laptop, phone]) {
    const event = current.trackerStore.getSnapshot().applications[0].events[0];
    assert.equal(event.dueDate, '2026-09-23');
    assert.equal(event.dueTime, '09:30');
  }
});

test('clearing a deadline also clears a remotely changed time', async () => {
  const laptop = device(), phone = device();
  const opening = { dueDate: '2026-09-22', dueTime: '18:00' };
  laptop.trackerStore.addApplication({ ...app, events: [{ ...app.events[0], ...opening }] });
  await flush(); transfer(laptop, phone);
  phone.trackerStore.updateEventDeadline(app.id, 'submitted', { dueTime: '09:30' });
  await flush(); transfer(phone, laptop);
  laptop.trackerStore.updateEventDeadline(app.id, 'submitted', deadlineFormChanges(opening, { dueDate: '', dueTime: '' }));
  await flush(); transfer(laptop, phone);
  for (const current of [laptop, phone]) {
    const event = current.trackerStore.getSnapshot().applications[0].events[0];
    assert.equal(event.dueDate, '');
    assert.equal(event.dueTime, '');
  }
});
