import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, validatePersonalData, mergePersonalData, createPersonalStore } from '../src/features/personal/personalStore.js';
import { APPLICATION_DEFAULTS, getApplications, getUpcomingApplications, saveApplication, setApplicationArchived,
  createApplicationEvent, appendApplicationEvent, isApplicationDate, isSafeApplicationUrl, validateApplicationEvent } from '../src/features/personal/applications/applicationModel.js';

const time = '2026-09-09T12:00:00.000Z';
const later = '2026-09-09T12:01:00.000Z';
function example() {
  return saveApplication(createPersonalState(), null, { ...APPLICATION_DEFAULTS, company: 'Actual Company', role: 'Quant Research Intern', location: 'Chicago' }, { now: time, newApplicationId: 'application-1', eventId: 'event-1' });
}
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a fresh account starts with no invented applications or review events', () => {
  const state = createPersonalState();
  assert.deepEqual(getApplications(state), []);
  assert.deepEqual(state.reviewEvents, []);
  assert.deepEqual(state.applicationEvents, []);
});

test('creation stores only supplied nondefault changes and derives a complete application', () => {
  const state = example();
  assert.deepEqual(state.applicationEvents[0].changes, { company: 'Actual Company', role: 'Quant Research Intern', location: 'Chicago' });
  const row = getApplications(state)[0];
  assert.equal(row.status, 'wishlist');
  assert.equal(row.archived, false);
  assert.equal(row.createdAt, time);
  assert.equal(row.notes, '');
});

test('editing diffs the form opening snapshot and preserves another device unrelated edits', () => {
  const state = example();
  const baseline = getApplications(state)[0];
  const remote = saveApplication(state, baseline.id, { location: 'New York' }, { now: later, eventId: 'remote' });
  const staleForm = Object.fromEntries(Object.keys(APPLICATION_DEFAULTS).map(field => [field, baseline[field]]));
  staleForm.company = 'Updated Company';
  const saved = saveApplication(remote, baseline.id, staleForm, { baseline, now: later, eventId: 'local' });
  assert.deepEqual(saved.applicationEvents.at(-1).changes, { company: 'Updated Company' });
  assert.equal(getApplications(saved)[0].company, 'Updated Company');
  assert.equal(getApplications(saved)[0].location, 'New York');
});

test('concurrent field edits union in either direction and do not overwrite one another', () => {
  const base = example();
  const first = saveApplication(base, 'application-1', { status: 'applied' }, { now: later, eventId: 'first' });
  const second = saveApplication(base, 'application-1', { notes: 'Follow up with recruiter' }, { now: later, eventId: 'second' });
  const merged = mergePersonalData(first, second);
  assert.deepEqual(merged.applicationEvents, mergePersonalData(second, first).applicationEvents);
  assert.equal(merged.applicationEvents.length, 3);
  assert.equal(getApplications(merged)[0].status, 'applied');
  assert.equal(getApplications(merged)[0].notes, 'Follow up with recruiter');
});

test('same field events use chronology then id deterministically even when input order changes', () => {
  const a = createApplicationEvent('a', { status: 'applied' }, { id: 'a', now: later });
  const b = createApplicationEvent('a', { status: 'interview' }, { id: 'b', now: later });
  assert.equal(getApplications({ applicationEvents: [b, a] })[0].status, 'interview');
  assert.deepEqual(getApplications({ applicationEvents: [b, a] }), getApplications({ applicationEvents: [a, b] }));
});

test('archive and undo append events; even same-millisecond actions apply in user order', () => {
  const original = example();
  const archived = setApplicationArchived(original, 'application-1', true, { now: time, eventId: 'z-archive' });
  assert.equal(getApplications(archived).length, 0);
  assert.equal(getApplications(archived, { includeArchived: true })[0].archived, true);
  const restored = setApplicationArchived(archived, 'application-1', false, { now: time, eventId: 'a-undo' });
  assert.equal(getApplications(restored).length, 1);
  assert.equal(restored.applicationEvents.length, 3);
  assert.ok(Date.parse(restored.applicationEvents.at(-1).createdAt) > Date.parse(archived.applicationEvents.at(-1).createdAt));
  assert.equal(original.applicationEvents.length, 1);
});

test('an unchanged save creates no event', () => {
  const state = example();
  assert.equal(saveApplication(state, 'application-1', { company: 'Actual Company' }), state);
});

test('real civil dates support leap years and reject rollovers, zero year, and timestamps', () => {
  for (const date of ['2024-02-29', '2026-09-09', '2026-12-31']) assert.equal(isApplicationDate(date), true, date);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '0000-01-01', '2026-9-9', '2026-09-09T12:00:00Z', null]) assert.equal(isApplicationDate(date), false, date);
});

test('application links allow only safe absolute HTTP(S) URLs', () => {
  for (const url of ['', 'https://careers.example.org/role?q=quant', 'http://example.org']) assert.equal(isSafeApplicationUrl(url), true);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '/relative', '//example.com', 'file:///tmp/a', 'https://user:password@example.com', 'https://example.com:bad', 'https://exa mple.com', ' https://example.com']) assert.equal(isSafeApplicationUrl(url), false, url);
});

test('invalid and unknown application fields reject rather than being silently dropped', () => {
  for (const changes of [{ status: 'made-up' }, { archived: 'yes' }, { company: '' }, { role: ' ' }, { unknown: 'value' }, { deadline: '2026-02-30' }, { nextActionDate: 'tomorrow' }, { url: 'javascript:alert(1)' }, { notes: 'a'.repeat(20001) }]) {
    assert.throws(() => createApplicationEvent('a', changes, { now: time, id: 'bad' }));
  }
  assert.throws(() => validateApplicationEvent({ ...createApplicationEvent('a', { status: 'applied' }, { now: time }), unexpected: true }));
  assert.throws(() => saveApplication(createPersonalState(), null, { company: 'Only company' }));
});

test('event ids are immutable, identical retries are idempotent, and collisions are explicit', () => {
  const state = example();
  assert.equal(appendApplicationEvent(state, state.applicationEvents[0]), state);
  const bad = { ...state.applicationEvents[0], changes: { company: 'Collision' } };
  assert.throws(() => appendApplicationEvent(state, bad), /Conflicting/);
  assert.throws(() => mergePersonalData(state, { ...createPersonalState(), applicationEvents: [bad] }), /conflicting/);
});

test('upcoming applications sort actionable dates and omit archived or terminal records', () => {
  let state = example();
  state = saveApplication(state, 'application-1', { nextAction: 'Complete OA', nextActionDate: '2026-09-12', deadline: '2026-09-10' }, { now: later });
  state = saveApplication(state, null, { company: 'Second', role: 'Trading', deadline: '2026-09-08' }, { now: later, newApplicationId: 'second' });
  state = saveApplication(state, null, { company: 'Third', role: 'Research', deadline: '2026-09-07', status: 'rejected' }, { now: later });
  const upcoming = getUpcomingApplications(state, '2026-09-09');
  assert.deepEqual(upcoming.map(row => row.upcomingDate), ['2026-09-08', '2026-09-10']);
  assert.equal(upcoming[0].overdue, true);
  assert.equal(upcoming[1].upcomingKind, 'deadline');
  assert.throws(() => getUpcomingApplications(state, '2026-02-30'));
});

test('old version-one backup and cloud payloads receive default event collections', () => {
  const old = createPersonalState();
  delete old.applicationEvents;
  delete old.reviewEvents;
  const loaded = validatePersonalData(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(loaded.applicationEvents, []);
  assert.deepEqual(loaded.reviewEvents, []);
  const newer = example();
  newer.reviewEvents = [{ id: 'review-1', questionKey: 'question-1', reviewedAt: time, rating: 'good', note: 'Remember the conditioning step.' }];
  assert.deepEqual(mergePersonalData(old, newer).applicationEvents, newer.applicationEvents);
  assert.deepEqual(mergePersonalData(newer, old).reviewEvents, newer.reviewEvents);
  assert.throws(() => validatePersonalData({ ...old, unknownFutureField: [] }), /unknown/);
});

test('new events persist in account backups, restore additively, and stay isolated', () => {
  const storage = memoryStorage();
  const alice = createPersonalStore({ ownerId: 'alice', storage });
  alice.update(() => example());
  const backup = alice.exportBackup();
  alice.update(state => saveApplication(state, 'application-1', { status: 'oa' }, { now: later }));
  alice.restoreBackup(backup);
  assert.equal(getApplications(alice.getSnapshot().data)[0].status, 'oa');
  const restored = createPersonalStore({ ownerId: 'alice', storage });
  assert.equal(getApplications(restored.getSnapshot().data)[0].status, 'oa');
  const bob = createPersonalStore({ ownerId: 'bob', storage });
  assert.deepEqual(getApplications(bob.getSnapshot().data), []);
  assert.throws(() => bob.restoreBackup(backup), /different account/);
});

test('review events merge as an immutable deterministic union with strict validation', () => {
  const first = { id: 'a', questionKey: 'q', reviewedAt: later, rating: 'again', note: '' };
  const second = { id: 'b', questionKey: 'q', reviewedAt: later, rating: 'good', note: 'Solved' };
  const a = { ...createPersonalState(), reviewEvents: [first] }, b = { ...createPersonalState(), reviewEvents: [second] };
  assert.deepEqual(mergePersonalData(a, b).reviewEvents, [first, second]);
  assert.deepEqual(mergePersonalData(b, a).reviewEvents, [first, second]);
  assert.throws(() => mergePersonalData(a, { ...a, reviewEvents: [{ ...first, note: 'mutated' }] }), /conflicting/);
  assert.throws(() => validatePersonalData({ ...a, reviewEvents: [{ ...first, rating: 'bad' }] }));
});
