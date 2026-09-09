import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalStore } from '../src/features/personal/personalStore.js';
import { getApplications, saveApplication } from '../src/features/personal/applications/applicationModel.js';
import { createApplicationDraft, persistApplicationDraft, persistApplicationArchive } from '../src/features/personal/applications/applicationDraft.js';

function fixture() {
  const values = new Map();
  let fail = false, writes = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, value) { writes += 1; if (fail) throw new Error('quota'); values.set(key, value); } };
  return { store: createPersonalStore({ ownerId: 'application-owner', storage }), storage, fail: value => { fail = value; }, writes: () => writes };
}
const form = () => createApplicationDraft({ prefill: { company: 'Actual company', role: 'Quant researcher', deadline: '2026-09-12', nextActionDate: '2026-09-09', notes: 'Prepare an example' } });

test('a failed creation keeps the form and dates; an unchanged retry persists exactly one application and event', () => {
  const { store, storage, fail, writes } = fixture();
  const draft = form();
  fail(true);
  const first = persistApplicationDraft(store.update, draft);
  assert.equal(first.ok, false);
  assert.equal(store.getSnapshot().dirty, true);
  assert.deepEqual(first.draft.values, draft.values);
  assert.equal(first.draft.id, draft.newApplicationId);
  const event = store.getSnapshot().data.applicationEvents[0];
  assert.deepEqual(getApplications(createPersonalStore({ ownerId: 'application-owner', storage }).getSnapshot().data), []);
  fail(false);
  const retried = persistApplicationDraft(store.update, first.draft);
  assert.equal(retried.ok, true);
  assert.equal(writes(), 2);
  assert.equal(store.getSnapshot().dirty, false);
  assert.deepEqual(store.getSnapshot().data.applicationEvents, [event]);
  const reloaded = getApplications(createPersonalStore({ ownerId: 'application-owner', storage }).getSnapshot().data);
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].deadline, '2026-09-12');
  assert.equal(reloaded[0].nextActionDate, '2026-09-09');
  assert.equal(reloaded[0].notes, 'Prepare an example');
});

test('repeated submission of the same opening draft uses its stable application identity', () => {
  const { store } = fixture();
  const draft = form();
  assert.equal(persistApplicationDraft(store.update, draft).ok, true);
  assert.equal(persistApplicationDraft(store.update, draft).ok, true);
  assert.equal(getApplications(store.getSnapshot().data).length, 1);
  assert.equal(store.getSnapshot().data.applicationEvents.length, 1);
});

test('editing after a failed save adds only the new changes and preserves unrelated merged fields', () => {
  const { store, fail } = fixture();
  const created = persistApplicationDraft(store.update, form());
  const draft = createApplicationDraft({ application: getApplications(store.getSnapshot().data)[0] });
  draft.values.notes = 'First draft';
  fail(true);
  const attempted = persistApplicationDraft(store.update, draft);
  assert.equal(attempted.ok, false);
  store.update(state => saveApplication(state, created.draft.id, { location: 'New York' }));
  const edited = { ...attempted.draft, values: { ...attempted.draft.values, notes: 'Revised draft' } };
  fail(false);
  assert.equal(persistApplicationDraft(store.update, edited).ok, true);
  const state = store.getSnapshot().data;
  const application = getApplications(state)[0];
  assert.equal(application.notes, 'Revised draft');
  assert.equal(application.location, 'New York');
  assert.equal(application.deadline, '2026-09-12');
  assert.deepEqual(state.applicationEvents.at(-1).changes, { notes: 'Revised draft' });
});

test('failed archive and restore retry the durable write without duplicating immutable events', () => {
  const { store, storage, fail } = fixture();
  const created = persistApplicationDraft(store.update, form());
  for (const archived of [true, false]) {
    fail(true);
    assert.equal(persistApplicationArchive(store.update, created.draft.id, archived).ok, false);
    const events = store.getSnapshot().data.applicationEvents;
    assert.equal(getApplications(store.getSnapshot().data, { includeArchived: true })[0].archived, archived);
    fail(false);
    assert.equal(persistApplicationArchive(store.update, created.draft.id, archived).ok, true);
    assert.deepEqual(store.getSnapshot().data.applicationEvents, events);
    const reloaded = createPersonalStore({ ownerId: 'application-owner', storage });
    assert.equal(getApplications(reloaded.getSnapshot().data, { includeArchived: true })[0].archived, archived);
  }
  assert.equal(store.getSnapshot().data.applicationEvents.length, 3);
});

test('validation errors keep the original draft and never attempt storage writes', () => {
  const { store, writes } = fixture();
  const draft = form();
  draft.values.deadline = '2026-02-30';
  const before = structuredClone(draft);
  assert.throws(() => persistApplicationDraft(store.update, draft), /date/);
  assert.deepEqual(draft, before);
  assert.equal(writes(), 0);
  assert.equal(getApplications(store.getSnapshot().data).length, 0);
});
