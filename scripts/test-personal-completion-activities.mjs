import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { completeBehavioralPractice, hasExplicitCompletion, hasPersonalBehavioralAnswer, markExperienceRead, retainExplicitCompletionActivities, saveBehavioralAnswer } from '../src/features/personal/completionActivities.js';
import { collectCalendarActivities } from '../src/features/personal/calendar/calendarModel.js';
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

test('behavioral preparation requires a persisted nonempty answer, without comparing its content to a template', () => {
  for (const state of [createPersonalState(), ownAnswer(' \n ')]) {
    assert.equal(hasPersonalBehavioralAnswer(state, question), false);
    assert.throws(() => completeBehavioralPractice(state, question, morning), /own answer/);
    assert.deepEqual(state.activities, []);
  }
  const state = ownAnswer();
  assert.equal(hasPersonalBehavioralAnswer(state, question), true);
  assert.equal(hasPersonalBehavioralAnswer(ownAnswer(question.answer), question), true);
  assert.equal(collectCalendarActivities(state).activities.length, 1, 'old saved answers count without a separate confirmation');
});

test('one behavioral question keeps its original answer date across later confirmations', () => {
  const first = completeBehavioralPractice(ownAnswer(), question, morning);
  assert.equal(completeBehavioralPractice(first, question, afternoon), first);
  assert.equal(hasExplicitCompletion(first, 'behavioral', question.id, afternoon), true);
  assert.equal(hasExplicitCompletion(first, 'behavioral', question.id, tomorrow), false);
  const second = completeBehavioralPractice(first, question, tomorrow);
  assert.equal(second, first);
  assert.equal(second.activities.length, 1);
  assert.equal(second.activities[0].sourceId, question.id);
  assert.equal(second.activities[0].questionId, question.id);
  assert.equal(second.activities[0].dateKey, '2026-09-19');
  assert.equal(second.activities[0].completedAt, morning.toISOString());
  assert.equal(second.activities[0].count, 1);
  assert.equal('text' in second.activities[0], false, 'activity metadata never copies a private answer');
  validatePersonalData(second);
});

test('saving the first nonempty answer records preparation atomically and later edits never create daily repeats', () => {
  const empty = saveBehavioralAnswer(createPersonalState(), question, ' \n ', morning);
  assert.deepEqual(empty.activities, []);
  const first = saveBehavioralAnswer(empty, question, 'My first answer', morning);
  assert.equal(first.activities.length, 1);
  assert.equal(first.activities[0].completedAt, morning.toISOString());
  const later = saveBehavioralAnswer(first, question, 'My revised answer', tomorrow);
  assert.deepEqual(later.activities, first.activities);
  assert.equal(later.behavioralAnswers[0].updatedAt, tomorrow.toISOString());
  assert.equal(later.behavioralAnswers[0].text, 'My revised answer');
  assert.equal(collectCalendarActivities(later).activities[0].completedAt, morning.toISOString());
  validatePersonalData(later);
});

test('editing an old saved answer materializes its known historical date before replacing its text', () => {
  const revised = saveBehavioralAnswer(ownAnswer(), question, 'Updated next day', tomorrow);
  assert.equal(revised.activities.length, 1);
  assert.equal(revised.activities[0].completedAt, morning.toISOString());
  assert.equal(revised.behavioralAnswers[0].updatedAt, tomorrow.toISOString());
  const clearedOld = saveBehavioralAnswer(ownAnswer(), question, '', tomorrow);
  assert.deepEqual(clearedOld.activities, revised.activities, 'clearing retains the historical preparation already represented by the old answer');
  const cleared = saveBehavioralAnswer(revised, question, '', tomorrow);
  assert.deepEqual(cleared.activities, revised.activities);
  const rewritten = saveBehavioralAnswer(cleared, question, 'A different answer', tomorrow);
  assert.deepEqual(rewritten.activities, revised.activities);
});

test('directly clearing and rewriting an old answer preserves exactly one preparation on its original date', () => {
  const original = ownAnswer();
  assert.deepEqual(original.activities, []);
  const cleared = saveBehavioralAnswer(original, question, ' \n ', tomorrow);
  assert.equal(cleared.behavioralAnswers[0].text, ' \n ');
  assert.equal(cleared.activities.length, 1);
  const rewritten = saveBehavioralAnswer(cleared, question, 'Rewritten after clearing', tomorrow);
  const calendar = collectCalendarActivities(rewritten).activities;
  assert.equal(rewritten.activities.length, 1);
  assert.equal(calendar.length, 1);
  assert.equal(calendar[0].completedAt, morning.toISOString());
  assert.equal(calendar[0].count, 1);
  validatePersonalData(rewritten);
});

test('concurrent first answers on different days converge to one calendar record at the earliest completion', () => {
  const first = saveBehavioralAnswer(createPersonalState(), question, 'First device', morning);
  const later = saveBehavioralAnswer(createPersonalState(), question, 'Second device', tomorrow);
  const a = mergePersonalData(first, later), b = mergePersonalData(later, first);
  const calendar = collectCalendarActivities(a).activities;
  assert.deepEqual(calendar, collectCalendarActivities(b).activities);
  assert.equal(calendar.length, 1);
  assert.equal(calendar[0].completedAt, morning.toISOString());
  assert.equal(a.behavioralAnswers[0].text, 'Second device');
  assert.equal(saveBehavioralAnswer(a, question, 'Later revision', tomorrow).activities.length, 2, 'existing historical events are kept, without creating another');
});

test('saved answers and later edits cannot revive explicitly removed preparation records', () => {
  const first = saveBehavioralAnswer(createPersonalState(), question, 'My answer', morning);
  const deleted = { ...first, activities: [], removedActivityIds: [first.activities[0].id] };
  const revised = saveBehavioralAnswer(deleted, question, 'Another edit', tomorrow);
  assert.deepEqual(revised.activities, []);
  assert.deepEqual(collectCalendarActivities(revised).activities, []);
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
