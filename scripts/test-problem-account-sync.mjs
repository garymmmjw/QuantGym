import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProblemStates } from '../src/modules/problems/data.js';
import { mergeProblemPersonalFields, nextProblemFieldTime, normalizeProblemNote } from '../src/modules/problems/personalFields.js';
import { getProblemSavedToggle } from '../src/modules/problems/mutations.js';
import { createProblemProvider } from '../src/modules/problems/provider.js';
import { createProblemPersonalStateController } from '../src/modules/problems/personalStateController.js';
import { createProblemsPageApi } from '../src/app/services/problemsPageApi.js';
import { createPageApiDeps } from '../src/app/createAppContext/createPageApiDeps.js';
import { mergeRecordsById } from '../src/state/data.js';
import { problemNoteStorageKey, readOwnedProblemNotes } from '../src/features/problems/problemNotes.js';

const T = Date.parse('2026-10-16T12:00:00.000Z');
const iso = offset => new Date(T + offset).toISOString();
const problem = { id: 'quantvault-14', source: 'quantvault', bookSlug: 'quantvault', quantvault: { id: 900, displayId: 14 } };
const clone = value => structuredClone(value);
const merge = (...rows) => mergeProblemStates(rows.map(row => [row]), { mergeRecordsById: (...lists) => mergeRecordsById(lists) })[0];
const session = { id: 'session-fixture', startedAt: iso(0), elapsedMs: 1000, timerStartedAt: iso(1000), answerViewed: false, hintViewed: false };
function memory(entries = []) {
  const values = new Map(entries);
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), values };
}

test('a later timer checkpoint cannot overwrite independently newer note and bookmark edits in either arrival order', () => {
  const staleTimer = { problemId: problem.id, note: 'old', noteUpdatedAt: iso(0), favorite: false,
    favoriteUpdatedAt: iso(0), updatedAt: iso(30000), freePracticeSession: session };
  const edits = { problemId: problem.id, note: 'my derivation', noteUpdatedAt: iso(2000), favorite: true,
    favoriteUpdatedAt: iso(1000), lastFavoriteAt: iso(1000), updatedAt: iso(2000) };
  for (const rows of [[edits, staleTimer], [staleTimer, edits]]) {
    const result = merge(...rows);
    assert.equal(result.note, 'my derivation'); assert.equal(result.noteUpdatedAt, iso(2000));
    assert.equal(result.favorite, true); assert.equal(result.favoriteUpdatedAt, iso(1000));
    assert.equal(result.freePracticeSession.id, session.id); assert.equal(result.updatedAt, iso(30000));
  }
});

test('cleared notes and bookmarks remain explicit tombstones when an older browser returns', () => {
  const stale = { problemId: problem.id, note: 'restorable old note', noteUpdatedAt: iso(0), favorite: true,
    favoriteUpdatedAt: iso(0), lastFavoriteAt: iso(0), updatedAt: iso(60000) };
  const deleted = { problemId: problem.id, note: '', noteUpdatedAt: iso(1000), favorite: false,
    favoriteUpdatedAt: iso(1000), lastFavoriteAt: '', updatedAt: iso(1000) };
  for (const rows of [[deleted, stale], [stale, deleted]]) {
    const result = merge(...rows);
    assert.equal(result.note, ''); assert.ok(Object.hasOwn(result, 'note'));
    assert.equal(result.noteUpdatedAt, iso(1000)); assert.equal(result.favorite, false);
    assert.equal(result.favoriteUpdatedAt, iso(1000)); assert.equal(result.lastFavoriteAt, '');
    assert.equal(merge(result, stale).note, ''); assert.equal(merge(stale, result).favorite, false);
  }
});

test('note and bookmark changes use separate clocks, including clocks ahead of wall time', () => {
  const first = { problemId: problem.id, note: 'newer note', noteUpdatedAt: iso(9000), favorite: true,
    favoriteUpdatedAt: iso(1000), updatedAt: iso(9000) };
  const second = { problemId: problem.id, note: 'older note', noteUpdatedAt: iso(2000), favorite: false,
    favoriteUpdatedAt: iso(10000), updatedAt: iso(10000) };
  for (const rows of [[first, second], [second, first]]) {
    const result = merge(...rows);
    assert.equal(result.note, 'newer note'); assert.equal(result.noteUpdatedAt, iso(9000));
    assert.equal(result.favorite, false); assert.equal(result.favoriteUpdatedAt, iso(10000));
  }
  assert.equal(nextProblemFieldTime(iso(10000), T), iso(10001));
  const toggled = getProblemSavedToggle(second, { nowIso: () => iso(0) });
  assert.equal(toggled.favorite, true); assert.equal(toggled.favoriteUpdatedAt, iso(10001));
  assert.equal(toggled.lastFavoriteAt, iso(10001));
});

test('legacy snapshots cannot erase explicit personal fields and exact bookmark ties keep removal', () => {
  const explicit = { note: '', noteUpdatedAt: iso(0), favorite: false, favoriteUpdatedAt: iso(0), lastFavoriteAt: '' };
  const oldClient = { note: 'old browser', favorite: true, updatedAt: iso(1000000) };
  assert.deepEqual(mergeProblemPersonalFields(explicit, oldClient), explicit);
  assert.deepEqual(mergeProblemPersonalFields(oldClient, explicit), explicit);
  const simultaneous = { favorite: true, favoriteUpdatedAt: iso(0), lastFavoriteAt: iso(0) };
  assert.equal(mergeProblemPersonalFields(explicit, simultaneous).favorite, false);
  assert.equal(mergeProblemPersonalFields(simultaneous, explicit).favorite, false);
});

function fixture(t, { fallback = false } = {}) {
  let now = T;
  t.mock.method(Date, 'now', () => now);
  const appState = { currentUser: { id: 'alice' } };
  const userState = { value: { problems: [problem], problemStates: [] } };
  const saves = [], updates = [], network = [];
  const saveState = options => saves.push({ options, owner: appState.currentUser?.id, rows: clone(userState.value.problemStates) });
  const provider = createProblemProvider({ getState: () => userState.value, mergeRecordsById: (...lists) => mergeRecordsById(lists) });
  const controller = createProblemPersonalStateController({ getState: () => userState.value,
    normalizeProblemState: provider.normalizeProblemState, mergeProblemStates: provider.mergeProblemStates,
    nowIso: () => new Date(now).toISOString(), saveState });
  const deps = createPageApiDeps({ appState, userState, saveState, domainStores: {}, authStateRuntime: { save() {} },
    updateProblemState: fallback ? undefined : (id, patch) => { updates.push(clone(patch)); return controller.update(id, patch); },
    toggleProblemSaved: controller.toggleSaved,
    flushCloudSync: async () => { network.push('flush'); return { ok: true }; },
    cloudSyncController: { refresh: async () => { network.push('refresh'); return { ok: true }; } },
  });
  const api = createProblemsPageApi(deps);
  return { api, controller, appState, userState, saves, updates, network, at: value => { now = T + value; },
    personal: () => userState.value.problemStates.find(item => item.problemId === problem.id) };
}

test('real page dependencies expose cloud flush/refresh and note saving uses the real personal-state controller', async t => {
  const f = fixture(t);
  assert.equal(f.api.saveNote(problem.id, 'First note', 'alice'), true);
  assert.equal(f.personal().note, 'First note'); assert.equal(f.personal().noteUpdatedAt, iso(0));
  assert.deepEqual(Object.keys(f.updates[0]).sort(), ['note', 'noteUpdatedAt']);
  assert.deepEqual(f.saves[0].options, { checkIn: false });
  assert.equal(f.api.saveNote(problem.id, 'First note', 'alice'), true); assert.equal(f.saves.length, 1);
  assert.deepEqual(await f.api.flushPractice(), { ok: true });
  assert.deepEqual(await f.api.refreshPractice(), { ok: true });
  assert.deepEqual(f.network, ['flush', 'refresh']);
});

test('note edits, timer checkpoints, bookmark toggles and clears all queue persistence without losing another field', t => {
  const f = fixture(t);
  f.api.saveNote(problem.id, 'Before timer', 'alice');
  const started = f.api.startPractice(problem.id);
  assert.ok(started.sessionId);
  f.at(1000); f.api.toggleSaved(problem.id);
  assert.equal(f.personal().favorite, true);
  f.at(2000); f.api.saveNote(problem.id, 'Revised derivation', 'alice');
  f.at(12000); f.api.checkpointPractice(problem.id, started.sessionId);
  assert.equal(f.personal().note, 'Revised derivation'); assert.equal(f.personal().noteUpdatedAt, iso(2000));
  assert.equal(f.personal().favorite, true); assert.equal(f.personal().favoriteUpdatedAt, iso(1000));
  assert.equal(f.personal().freePracticeSession.elapsedMs, 12000);
  assert.deepEqual(f.saves.at(-1).options, { checkIn: false }, 'A timer checkpoint is eligible for cloud upload');
  f.at(13000); f.api.saveNote(problem.id, '', 'alice');
  f.at(14000); f.api.toggleSaved(problem.id);
  f.at(15000); f.api.pausePractice(problem.id, started.sessionId);
  assert.equal(f.personal().note, ''); assert.equal(f.personal().favorite, false);
  assert.equal(f.personal().freePracticeSession.timerStartedAt, null);
  assert.equal(f.userState.value.problemStates.length, 1);
  assert.equal(f.saves.length, 8);
  assert.ok(f.saves.every(save => save.options?.sync !== false));
});

test('note saves reject a stale account callback and migration cannot overwrite a newer note or a clear tombstone', t => {
  const f = fixture(t);
  assert.equal(f.api.saveNote(problem.id, 'Imported note', 'alice', { migrate: true }), true);
  const imported = clone(f.personal());
  assert.equal(f.api.saveNote(problem.id, 'Other browser backup', 'alice', { migrate: true }), false);
  assert.deepEqual(f.personal(), imported);
  f.at(1000); f.api.saveNote(problem.id, '', 'alice');
  assert.equal(f.api.saveNote(problem.id, 'Resurrected backup', 'alice', { migrate: true }), false);
  assert.equal(f.personal().note, '');
  const before = clone(f.userState.value), saved = f.saves.length;
  f.appState.currentUser = { id: 'bob' };
  for (const owner of ['alice', '', 'guest']) assert.equal(f.api.saveNote(problem.id, 'must not leak', owner), false);
  assert.deepEqual(f.userState.value, before); assert.equal(f.saves.length, saved);
  f.appState.currentUser = null;
  assert.equal(f.api.saveNote(problem.id, 'signed out', 'bob'), false);
});

test('fallback notes preserve practice records, enforce length, and advance a future note clock', t => {
  const f = fixture(t, { fallback: true });
  f.userState.value.problemStates = [{ problemId: problem.id, favorite: true, favoriteUpdatedAt: iso(10),
    freePracticeSession: session, note: 'old', noteUpdatedAt: iso(10000) }];
  const untouched = clone(f.personal());
  f.api.saveNote(problem.id, 'x'.repeat(20001), 'alice');
  assert.equal(f.personal().note.length, 20000); assert.equal(f.personal().noteUpdatedAt, iso(10001));
  assert.equal(f.personal().favorite, untouched.favorite); assert.deepEqual(f.personal().freePracticeSession, untouched.freePracticeSession);
  assert.equal(f.updates.length, 0); assert.equal(f.saves.length, 1);
});

test('UTF-16 note limits never split an emoji into a server-rejected surrogate', t => {
  const cut = `${'a'.repeat(19999)}🙂`, exact = `${'a'.repeat(19998)}🙂`;
  assert.equal(normalizeProblemNote(cut), 'a'.repeat(19999));
  assert.equal(normalizeProblemNote(exact), exact);
  const f = fixture(t);
  assert.equal(f.api.saveNote(problem.id, cut, 'alice'), true);
  assert.equal(f.personal().note.length, 19999);
  assert.doesNotThrow(() => encodeURIComponent(f.personal().note));
  const merged = mergeProblemPersonalFields({}, { note: cut, noteUpdatedAt: iso(0) });
  assert.equal(merged.note, f.personal().note);
  assert.doesNotThrow(() => encodeURIComponent(merged.note));
});

test('owned note migration reads only exact account-scoped keys and never claims unscoped or other-account notes', () => {
  const owner = 'google:alice / 中文', other = `${owner}:other`;
  const validKey = problemNoteStorageKey(owner, problem.id), otherKey = problemNoteStorageKey(other, problem.id);
  const storage = memory([
    ['quantgym.problemNote:quantvault-14', 'unscoped-secret'], ['quantgym.problemNote.v1:quantvault-14', 'legacy-secret'],
    [otherKey, 'other-person-secret'], [validKey, 'mine'],
    [problemNoteStorageKey(owner, 'question/with:punctuation'), 'also mine'],
    [problemNoteStorageKey(owner, 'cleared'), ''],
    [`quantgym.problemNote.v2:${encodeURIComponent(owner)}:%not-encoded`, 'damaged'],
  ]);
  const before = [...storage.values];
  assert.deepEqual(readOwnedProblemNotes(storage, owner), [
    { problemId: problem.id, text: 'mine' }, { problemId: 'question/with:punctuation', text: 'also mine' },
  ]);
  assert.deepEqual(readOwnedProblemNotes(storage, other), [{ problemId: problem.id, text: 'other-person-secret' }]);
  for (const invalidOwner of ['', 'guest', null]) assert.deepEqual(readOwnedProblemNotes(storage, invalidOwner), []);
  assert.deepEqual([...storage.values], before, 'Migration discovery never deletes original browser backups');
});
