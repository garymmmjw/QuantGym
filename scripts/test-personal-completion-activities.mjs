import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { completeBehavioralPractice, hasExplicitCompletion, hasPersonalBehavioralAnswer, markExperienceRead, retainExplicitCompletionActivities } from '../src/features/personal/completionActivities.js';
import { BEHAVIORAL_PREP_QUESTIONS } from '../src/features/personal/behavioral/questions.js';

const question = BEHAVIORAL_PREP_QUESTIONS.at(-1);
const morning = new Date(2026, 8, 19, 9);
const afternoon = new Date(2026, 8, 19, 16);
const tomorrow = new Date(2026, 8, 20, 9);
const ownAnswer = (text = 'I led a real research project and explained its limitations.') => ({
  ...createPersonalState(), behavioralAnswers: [{ id: question.id, text, updatedAt: morning.toISOString() }],
});
function storage() {
  const rows = new Map();
  return { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value) };
}

test('behavioral confirmation requires a personal answer and rejects built-in or whitespace-only examples', () => {
  for (const state of [createPersonalState(), ownAnswer(' \n '), ownAnswer(question.answer), ownAnswer(`\n ${question.answer.replace(/\n/g, ' ')} `)]) {
    assert.equal(hasPersonalBehavioralAnswer(state, question), false);
    assert.throws(() => completeBehavioralPractice(state, question, morning), /own answer/);
    assert.deepEqual(state.activities, []);
  }
  const state = ownAnswer();
  assert.equal(hasPersonalBehavioralAnswer(state, question), true);
  assert.equal(state.activities.length, 0, 'saving a draft does not complete the question');
});

test('one behavioral question counts once per local day, while next-day practice is a new event', () => {
  const first = completeBehavioralPractice(ownAnswer(), question, morning);
  assert.equal(completeBehavioralPractice(first, question, afternoon), first);
  assert.equal(hasExplicitCompletion(first, 'behavioral', question.id, afternoon), true);
  assert.equal(hasExplicitCompletion(first, 'behavioral', question.id, tomorrow), false);
  const second = completeBehavioralPractice(first, question, tomorrow);
  assert.equal(second.activities.length, 2);
  assert.equal(second.activities[0].sourceId, question.id);
  assert.equal(second.activities[0].questionId, question.id);
  assert.equal(second.activities[0].dateKey, '2026-09-19');
  assert.equal(second.activities[0].completedAt, morning.toISOString());
  assert.equal(second.activities[0].count, 1);
  assert.equal('text' in second.activities[0], false, 'activity metadata never copies a private answer');
  validatePersonalData(second);
});

test('experience reading counts only its first explicit confirmation, across days and after reload', () => {
  const first = markExperienceRead(createPersonalState(), 'fixture-experience', morning);
  assert.equal(markExperienceRead(first, 'fixture-experience', tomorrow), first);
  assert.equal(hasExplicitCompletion(first, 'experience-read', 'fixture-experience', tomorrow), true);
  const second = markExperienceRead(first, 'other-experience', tomorrow);
  assert.equal(second.activities.length, 2);
  assert.equal(second.activities[0].sourceId, 'fixture-experience');
  assert.deepEqual(validatePersonalData(JSON.parse(JSON.stringify(second))).activities, second.activities);
});

test('completion records persist and remain isolated by owner', () => {
  const saved = storage();
  const alice = createPersonalStore({ ownerId: 'fixture-alice', storage: saved });
  alice.update(() => completeBehavioralPractice(ownAnswer(), question, morning));
  alice.update(state => markExperienceRead(state, 'fixture-experience', morning));
  const reload = createPersonalStore({ ownerId: 'fixture-alice', storage: saved });
  const bob = createPersonalStore({ ownerId: 'fixture-bob', storage: saved });
  assert.equal(reload.getSnapshot().data.activities.length, 2);
  assert.deepEqual(bob.getSnapshot().data.activities, []);
  assert.throws(() => bob.restoreBackup(alice.exportBackup()), /different account/);
});

test('concurrent tabs re-read saved state and do not duplicate confirmations or lose other records', () => {
  const saved = storage();
  const a = createPersonalStore({ ownerId: 'fixture-alice', storage: saved });
  a.update(() => ownAnswer());
  const b = createPersonalStore({ ownerId: 'fixture-alice', storage: saved });
  a.update(state => completeBehavioralPractice(state, question, morning));
  b.update(state => completeBehavioralPractice(state, question, afternoon));
  a.update(state => markExperienceRead(state, 'fixture-experience', morning));
  b.update(state => markExperienceRead(state, 'other-experience', afternoon));
  const reload = createPersonalStore({ ownerId: 'fixture-alice', storage: saved });
  assert.equal(reload.getSnapshot().data.activities.length, 3);
});

test('concurrent same-day device confirmations merge to the first timestamp in either order', () => {
  const a = markExperienceRead(completeBehavioralPractice(ownAnswer(), question, morning), 'fixture-experience', morning);
  const b = markExperienceRead(completeBehavioralPractice(ownAnswer(), question, afternoon), 'fixture-experience', tomorrow);
  const first = mergePersonalData(a, b), second = mergePersonalData(b, a);
  assert.deepEqual(first.activities, second.activities);
  assert.equal(first.activities.length, 2);
  assert.equal(first.activities.every(activity => activity.completedAt === morning.toISOString()), true);
});

test('old snapshots cannot discard explicit confirmations and removal markers cannot resurrect them', () => {
  const current = markExperienceRead(completeBehavioralPractice(ownAnswer(), question, morning), 'fixture-experience', morning);
  assert.equal(retainExplicitCompletionActivities(createPersonalState(), current).activities.length, 2);
  const id = current.activities[0].id;
  const deleted = { ...current, activities: current.activities.filter(activity => activity.id !== id), removedActivityIds: [id] };
  const result = retainExplicitCompletionActivities(createPersonalState(), current, deleted);
  assert.equal(result.activities.some(activity => activity.id === id), false);
  assert.equal(result.removedActivityIds.includes(id), true);
});

test('invalid new event metadata is rejected before replacing saved state', () => {
  const good = markExperienceRead(createPersonalState(), 'fixture-experience', morning);
  const event = good.activities[0];
  for (const patch of [{ count: 5 }, { sourceId: '' }, { id: 'unrelated-id' }, { source: 'manual' }, { completedAt: 'yesterday' }, { dateKey: '2026-02-30' }, { text: 'private answer' }]) {
    assert.throws(() => validatePersonalData({ ...good, activities: [{ ...event, ...patch }] }));
  }
  assert.equal(hasExplicitCompletion(good, 'experience-read', null, morning), false);
});

test('failed persistence keeps a recoverable completion and retry saves it exactly once', () => {
  const saved = storage();
  let fail = false;
  const store = createPersonalStore({ ownerId: 'fixture-alice', storage: {
    getItem: saved.getItem, setItem(key, value) { if (fail) throw new Error('fixture quota'); saved.setItem(key, value); },
  } });
  store.update(() => ownAnswer());
  fail = true;
  assert.equal(store.update(state => completeBehavioralPractice(state, question, morning)).ok, false);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().data.activities.length, 1);
  fail = false;
  assert.equal(store.retry().ok, true);
  assert.equal(createPersonalStore({ ownerId: 'fixture-alice', storage: saved }).getSnapshot().data.activities.length, 1);
});
