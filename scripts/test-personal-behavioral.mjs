import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { BEHAVIORAL_PREP_QUESTIONS, getBehavioralAnswer } from '../src/features/personal/behavioral/questions.js';

const draft = (id, text, updatedAt = '2026-09-19T12:00:00.000Z') => ({ id, text, updatedAt });
const withAnswers = (...answers) => ({ ...createPersonalState(), behavioralAnswers: answers });

test('edits and explicit clearing survive reload and account-specific backup restore', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const first = createPersonalStore({ ownerId: 'behavioral-a', storage });
  first.update(() => withAnswers(draft('bofa-why', ''), draft('general-introduction', 'My real experience.')));
  const reload = createPersonalStore({ ownerId: 'behavioral-a', storage });
  assert.equal(getBehavioralAnswer(BEHAVIORAL_PREP_QUESTIONS.at(-1), reload.getSnapshot().data.behavioralAnswers), '');
  assert.equal(reload.getSnapshot().data.behavioralAnswers[1].text, 'My real experience.');
  const other = createPersonalStore({ ownerId: 'behavioral-b', storage });
  assert.deepEqual(other.getSnapshot().data.behavioralAnswers, []);
  assert.throws(() => other.restoreBackup(first.exportBackup()), /different account/);
  const restored = createPersonalStore({ ownerId: 'behavioral-a', storage: { getItem: () => null, setItem() {} } });
  restored.restoreBackup(first.exportBackup());
  assert.deepEqual(restored.getSnapshot().data.behavioralAnswers, reload.getSnapshot().data.behavioralAnswers);
});

test('concurrent edits to different questions merge and a newer clear beats a stale answer', () => {
  const first = withAnswers(draft('bofa-why', '', '2026-09-19T13:00:00.000Z'), draft('general-strength', 'Evidence of my strength.'));
  const second = withAnswers(draft('bofa-why', 'Stale BofA answer'), draft('general-conflict', 'A real disagreement.'));
  const merged = mergePersonalData(first, second);
  assert.deepEqual(merged.behavioralAnswers, mergePersonalData(second, first).behavioralAnswers);
  assert.equal(merged.behavioralAnswers.length, 3);
  assert.equal(merged.behavioralAnswers.find(answer => answer.id === 'bofa-why').text, '');
});

test('older backups remain readable and cannot remove new behavioral answers', () => {
  const legacy = createPersonalState();
  delete legacy.behavioralAnswers;
  assert.deepEqual(validatePersonalData(legacy).behavioralAnswers, []);
  const current = withAnswers(draft('bofa-why', 'Current answer'));
  assert.deepEqual(mergePersonalData(legacy, current).behavioralAnswers, current.behavioralAnswers);
  assert.deepEqual(mergePersonalData(current, legacy).behavioralAnswers, current.behavioralAnswers);
});

test('corrupt drafts cannot replace saved answers', () => {
  for (const invalid of [null, {}, [draft('a', 3)], [draft('a', 'x', 'invalid')], [draft('a', 'x'.repeat(20001))], [draft('a', 'x'), draft('a', 'y')]]) {
    assert.throws(() => validatePersonalData({ ...createPersonalState(), behavioralAnswers: invalid }), /behavioral answers/);
  }
});
