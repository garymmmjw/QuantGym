import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { addBehavioralQuestion, updateBehavioralQuestion, deleteBehavioralQuestion, getBehavioralQuestions,
  getBehavioralAnswer, mergeBehavioralQuestions } from '../src/features/personal/behavioral/questions.js';
import { saveBehavioralAnswer } from '../src/features/personal/completionActivities.js';

const now = '2026-09-19T12:00:00.000Z';
const later = '2026-09-20T12:00:00.000Z';
const draft = (id, text, updatedAt = now) => ({ id, text, updatedAt });
const withAnswers = (...answers) => ({ ...createPersonalState(), behavioralAnswers: answers });
function memoryStorage() {
  const saved = new Map();
  return { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
}
const create = (state, id, title = 'My own question') => addBehavioralQuestion(state, title, now, { id });

test('new accounts start without shared questions or example answers', () => {
  const state = createPersonalState();
  assert.deepEqual(getBehavioralQuestions(state), []);
  assert.deepEqual(validatePersonalData(state).behavioralQuestions, []);
  assert.equal(getBehavioralAnswer({ id: 'bofa-why', answer: 'Never show this shared sample' }), '');
});

test('question and answer creation, rename, deletion and reload stay within their account', () => {
  const storage = memoryStorage();
  const alice = createPersonalStore({ ownerId: 'alice', storage });
  alice.update(state => create(state, 'my-question', ' My first question\nWhat did I learn? '));
  let question = getBehavioralQuestions(alice.getSnapshot().data)[0];
  assert.equal(question.title, 'My first question\nWhat did I learn?');
  alice.update(state => saveBehavioralAnswer(state, question, 'My private answer', now));
  alice.update(state => updateBehavioralQuestion(state, question.id, 'A revised personal question', later));
  const reloaded = createPersonalStore({ ownerId: 'alice', storage });
  const bob = createPersonalStore({ ownerId: 'bob', storage });
  assert.equal(getBehavioralQuestions(reloaded.getSnapshot().data)[0].title, 'A revised personal question');
  assert.equal(getBehavioralAnswer(question, reloaded.getSnapshot().data.behavioralAnswers), 'My private answer');
  assert.equal(reloaded.getSnapshot().data.activities.length, 1);
  assert.deepEqual(getBehavioralQuestions(bob.getSnapshot().data), []);
  assert.deepEqual(bob.getSnapshot().data.behavioralAnswers, []);
  assert.throws(() => bob.restoreBackup(alice.exportBackup()), /different account/);
  reloaded.update(state => deleteBehavioralQuestion(state, question.id, later));
  const deleted = createPersonalStore({ ownerId: 'alice', storage }).getSnapshot().data;
  assert.deepEqual(getBehavioralQuestions(deleted), []);
  assert.equal(deleted.behavioralQuestions[0].deletedAt, '2026-09-20T12:00:00.001Z');
  assert.equal(getBehavioralAnswer(question, deleted.behavioralAnswers), 'My private answer');
  assert.equal(deleted.activities.length, 1, 'private history remains intact after hiding the question');
});

test('legacy recovery includes only this account’s saved answers, including explicit clears', () => {
  const legacy = withAnswers(draft('bofa-why', ''), draft('general-introduction', 'My real experience.'), draft('unknown-id', 'Own draft'));
  delete legacy.behavioralQuestions;
  const migrated = validatePersonalData(legacy);
  assert.deepEqual(migrated.behavioralAnswers, legacy.behavioralAnswers);
  assert.deepEqual(migrated.behavioralQuestions.map(row => row.title), ['Why Bank of America?', 'Tell me about yourself.', 'Recovered question']);
  assert.equal(getBehavioralAnswer({ id: 'bofa-why' }, migrated.behavioralAnswers), '');
  assert.equal(migrated.behavioralQuestions.every(row => row.updatedAt === '1970-01-01T00:00:00.000Z'), true);
  const storage = memoryStorage();
  storage.setItem('quantgym.personal-prep.v1:legacy-owner', JSON.stringify({ version: 1, ownerId: 'legacy-owner', data: legacy }));
  assert.deepEqual(createPersonalStore({ ownerId: 'legacy-owner', storage }).getSnapshot().data, migrated);
  assert.deepEqual(getBehavioralQuestions(createPersonalStore({ ownerId: 'other', storage }).getSnapshot().data), []);
  const restored = createPersonalStore({ ownerId: 'legacy-owner', storage: memoryStorage() });
  restored.restoreBackup(createPersonalStore({ ownerId: 'legacy-owner', storage }).exportBackup());
  assert.deepEqual(getBehavioralQuestions(restored.getSnapshot().data), getBehavioralQuestions(migrated));
});

test('long historical answer identifiers remain backed up without blocking the new library', () => {
  const legacy = withAnswers(draft('a'.repeat(201), 'Existing answer'));
  const migrated = validatePersonalData(legacy);
  assert.deepEqual(migrated.behavioralAnswers, legacy.behavioralAnswers);
  assert.deepEqual(migrated.behavioralQuestions, []);
});

test('distinct device questions and deterministic equal-time edits converge in either order', () => {
  const first = create(createPersonalState(), 'one');
  const second = create(createPersonalState(), 'two');
  const left = updateBehavioralQuestion(first, 'one', 'First device title', later);
  const right = updateBehavioralQuestion(first, 'one', 'Second device title', later);
  const a = mergePersonalData(mergePersonalData(left, second), right);
  const b = mergePersonalData(mergePersonalData(right, second), left);
  assert.deepEqual(a.behavioralQuestions, b.behavioralQuestions);
  assert.deepEqual(a.behavioralQuestions.map(row => row.id), ['one', 'two']);
  assert.equal(a.behavioralQuestions[0].title, 'Second device title');
});

test('question tombstones beat newer stale edits and old-client title recovery permanently', () => {
  const original = validatePersonalData(withAnswers(draft('bofa-why', 'Private text')));
  const renamed = updateBehavioralQuestion(original, 'bofa-why', 'A private question', now);
  const deleted = deleteBehavioralQuestion(renamed, 'bofa-why', later);
  const stale = updateBehavioralQuestion(renamed, 'bofa-why', 'A later offline edit', '2026-10-01T00:00:00.000Z');
  const oldClient = withAnswers(draft('bofa-why', 'Old device answer', '2026-10-02T00:00:00.000Z'));
  delete oldClient.behavioralQuestions;
  for (const merged of [mergePersonalData(deleted, stale), mergePersonalData(stale, deleted), mergePersonalData(deleted, oldClient), mergePersonalData(oldClient, deleted)]) {
    assert.deepEqual(getBehavioralQuestions(merged), []);
    assert.equal(merged.behavioralQuestions[0].deletedAt, later);
  }
  assert.equal(mergePersonalData(renamed, oldClient).behavioralQuestions[0].title, 'A private question');
  assert.equal(updateBehavioralQuestion(deleted, 'bofa-why', 'Cannot restore', later), deleted);
  assert.throws(() => create(deleted, 'bofa-why'), /duplicate/);
});

test('concurrent answers merge and a newer explicit clear beats a stale answer', () => {
  const first = withAnswers(draft('bofa-why', '', later), draft('general-strength', 'Evidence of my strength.'));
  const second = withAnswers(draft('bofa-why', 'Stale answer'), draft('general-conflict', 'A real disagreement.'));
  const merged = mergePersonalData(first, second);
  assert.deepEqual(merged.behavioralAnswers, mergePersonalData(second, first).behavioralAnswers);
  assert.equal(merged.behavioralAnswers.length, 3);
  assert.equal(merged.behavioralAnswers.find(answer => answer.id === 'bofa-why').text, '');
});

test('older backups cannot remove personal questions or answers', () => {
  const legacy = createPersonalState();
  delete legacy.behavioralAnswers;
  delete legacy.behavioralQuestions;
  assert.deepEqual(validatePersonalData(legacy).behavioralQuestions, []);
  const current = create(withAnswers(draft('mine', 'Current answer')), 'second', 'Question with no answer yet');
  for (const merged of [mergePersonalData(legacy, current), mergePersonalData(current, legacy)]) {
    assert.deepEqual(merged.behavioralAnswers, current.behavioralAnswers);
    assert.equal(merged.behavioralQuestions.length, 2);
  }
});

test('invalid question fields, dates, duplicates and answers cannot replace saved data', () => {
  const valid = create(createPersonalState(), 'id').behavioralQuestions[0];
  const patches = [{ id: '' }, { id: '\ud800' }, { title: '\udfff' }, { id: ' bad ' }, { id: 'x'.repeat(201) }, { title: '\n ' }, { title: 'x'.repeat(4001) },
    { createdAt: '2026-09-21T00:00:00Z' }, { updatedAt: 'not-a-date' }, { updatedAt: '2026-02-30T00:00:00Z' },
    { createdAt: '0000-01-01T00:00:00Z' }, { updatedAt: '2026-09-20T00:00:00+03:99' },
    { deletedAt: '2026-09-20T00:00:00Z' }, { deletedAt: '2026-09-18T00:00:00Z' }, { answer: 'Unexpected field' }];
  for (const patch of patches) assert.throws(() => validatePersonalData({ ...createPersonalState(), behavioralQuestions: [{ ...valid, ...patch }] }), /behavioral question/);
  for (const rows of [null, {}, [valid, valid]]) assert.throws(() => validatePersonalData({ ...createPersonalState(), behavioralQuestions: rows }), /behavioral question/);
  for (const invalid of [null, {}, [draft('a', 3)], [draft('a', 'x', 'invalid')], [draft('a', 'x'.repeat(20001))], [draft('a', 'x'), draft('a', 'y')]]) {
    assert.throws(() => validatePersonalData({ ...createPersonalState(), behavioralAnswers: invalid }), /behavioral answers/);
  }
  assert.throws(() => create(createPersonalState(), 'id', '  '), /title/);
});

test('question merge uses millisecond time and UTF-16 deterministic tie breaks', () => {
  const base = create(createPersonalState(), 'id').behavioralQuestions[0];
  const rows = [{ ...base, title: '😀', updatedAt: '2026-09-19T12:00:00.000900Z' },
    { ...base, title: '\uE000', updatedAt: '2026-09-19T12:00:00.000100Z' }];
  assert.equal(mergeBehavioralQuestions([rows[0]], [rows[1]])[0].title, '\uE000');
  assert.deepEqual(mergeBehavioralQuestions([rows[0]], [rows[1]]), mergeBehavioralQuestions([rows[1]], [rows[0]]));
});


test('an older same-account tab omitting question records cannot discard a local title or deletion', () => {
  const storage = memoryStorage();
  const alice = createPersonalStore({ ownerId: 'alice', storage });
  alice.update(state => create(state, 'private-question', 'A title that never reached the cloud'));
  const stale = createPersonalState();
  delete stale.behavioralQuestions;
  storage.setItem('quantgym.personal-prep.v1:alice', JSON.stringify({ version: 1, ownerId: 'alice', data: stale }));
  assert.equal(alice.update(state => state).ok, true);
  assert.equal(getBehavioralQuestions(createPersonalStore({ ownerId: 'alice', storage }).getSnapshot().data)[0].title, 'A title that never reached the cloud');
  assert.equal(getBehavioralQuestions(alice.getSnapshot().data)[0].title, 'A title that never reached the cloud');
  alice.update(state => deleteBehavioralQuestion(state, 'private-question', later));
  storage.setItem('quantgym.personal-prep.v1:alice', JSON.stringify({ version: 1, ownerId: 'alice', data: create(createPersonalState(), 'private-question', 'Old active title') }));
  const unsubscribe = alice.subscribe(() => {});
  assert.deepEqual(getBehavioralQuestions(alice.getSnapshot().data), []);
  assert.equal(alice.getSnapshot().dirty, false);
  assert.deepEqual(getBehavioralQuestions(createPersonalStore({ ownerId: 'alice', storage }).getSnapshot().data), []);
  unsubscribe();
});


test('unknown legacy identifiers cannot inherit titles from JavaScript object properties', () => {
  const recovered = validatePersonalData(withAnswers(draft('constructor', 'Own text'), draft('__proto__', ''), draft('toString', 'Other text')));
  assert.deepEqual(recovered.behavioralQuestions.map(question => question.title), ['Recovered question', 'Recovered question', 'Recovered question']);
});


test('failed automatic storage reconciliation stays dirty and keeps its deletion recoverable', () => {
  const saved = memoryStorage();
  let fail = false;
  const storage = { getItem: saved.getItem, setItem(key, value) { if (fail) throw new Error('Quota exceeded'); saved.setItem(key, value); } };
  let notify;
  const eventTarget = { addEventListener(_type, listener) { notify = listener; }, removeEventListener() {} };
  const alice = createPersonalStore({ ownerId: 'alice', storage, eventTarget });
  alice.update(state => create(state, 'private-question'));
  const oldRaw = saved.getItem('quantgym.personal-prep.v1:alice');
  alice.update(state => deleteBehavioralQuestion(state, 'private-question', later));
  const unsubscribe = alice.subscribe(() => {});
  saved.setItem('quantgym.personal-prep.v1:alice', oldRaw);
  fail = true;
  notify({ key: 'quantgym.personal-prep.v1:alice' });
  assert.deepEqual(getBehavioralQuestions(alice.getSnapshot().data), []);
  assert.equal(alice.getSnapshot().dirty, true);
  assert.match(alice.getSnapshot().error, /^write:Quota exceeded/);
  assert.equal(saved.getItem('quantgym.personal-prep.v1:alice'), oldRaw, 'failed repair does not pretend to replace the durable copy');
  assert.equal(JSON.parse(alice.exportBackup()).data.behavioralQuestions[0].deletedAt, later);
  fail = false;
  assert.equal(alice.retry().ok, true);
  assert.equal(alice.getSnapshot().dirty, false);
  assert.deepEqual(getBehavioralQuestions(createPersonalStore({ ownerId: 'alice', storage }).getSnapshot().data), []);
  unsubscribe();
});

test('no-op updates surface a failed reconciliation write instead of reporting saved', () => {
  const saved = memoryStorage();
  let fail = false;
  const storage = { getItem: saved.getItem, setItem(key, value) { if (fail) throw new Error('Quota exceeded'); saved.setItem(key, value); } };
  const alice = createPersonalStore({ ownerId: 'alice', storage });
  alice.update(state => create(state, 'private-question', 'Never uploaded'));
  saved.setItem('quantgym.personal-prep.v1:alice', JSON.stringify({ version: 1, ownerId: 'alice', data: createPersonalState() }));
  fail = true;
  assert.equal(alice.update(state => state).ok, false);
  assert.equal(alice.getSnapshot().dirty, true);
  assert.match(alice.getSnapshot().error, /^write:Quota exceeded/);
  assert.equal(getBehavioralQuestions(alice.getSnapshot().data)[0].title, 'Never uploaded');
  fail = false;
  assert.equal(alice.retry().ok, true);
  assert.equal(getBehavioralQuestions(createPersonalStore({ ownerId: 'alice', storage }).getSnapshot().data)[0].title, 'Never uploaded');
});
