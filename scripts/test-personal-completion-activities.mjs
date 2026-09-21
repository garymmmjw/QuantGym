import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { completeBehavioralPractice, hasExplicitCompletion, hasPersonalBehavioralAnswer, markExperienceRead, retainExplicitCompletionActivities, saveBehavioralAnswer } from '../src/features/personal/completionActivities.js';
import { collectCalendarActivities } from '../src/features/personal/calendar/calendarModel.js';

const question = { id: 'bofa-why', title: 'Why this company?', answer: 'An explicitly saved personal answer.' };
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

test('each changed nonempty answer counts once, including multiple edits to the same question/day', () => {
  const empty = saveBehavioralAnswer(createPersonalState(), question, ' \n ', morning);
  assert.deepEqual(empty.activities, []);
  const first = saveBehavioralAnswer(empty, question, 'My first answer', morning);
  const second = saveBehavioralAnswer(first, question, 'My revised answer', afternoon);
  const third = saveBehavioralAnswer(second, question, 'My first answer', tomorrow);
  assert.equal(first.activities.length, 1);
  assert.equal(second.activities.length, 2);
  assert.equal(third.activities.length, 3, 'reverting to an earlier answer is still a new editing session');
  assert.equal(new Set(third.activities.map(row => row.id)).size, 3);
  assert.equal(third.activities.every(row => row.source === 'answer-edit'), true, 'new edits remain readable by legacy clients');
  assert.equal(collectCalendarActivities(third).activities.length, 3);
  assert.deepEqual(third.activities.map(row => row.completedAt), [morning, afternoon, tomorrow].map(date => date.toISOString()));
  assert.equal(third.activities.some(row => 'text' in row), false);
  validatePersonalData(third);
});

test('automatic saves in one editing session share an event; identical and whitespace-only edits do not add one', () => {
  const edit = { editId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' };
  const first = saveBehavioralAnswer(createPersonalState(), question, 'M', morning, edit);
  const final = saveBehavioralAnswer(first, question, 'My complete answer', afternoon, edit);
  assert.equal(final.activities.length, 1);
  assert.equal(final.activities[0].id, first.activities[0].id);
  assert.equal(final.activities[0].completedAt, morning.toISOString());
  assert.equal(final.behavioralAnswers[0].text, 'My complete answer');
  assert.equal(saveBehavioralAnswer(final, question, 'My complete answer', tomorrow), final);
  const whitespace = saveBehavioralAnswer(final, question, ' My complete answer  ', tomorrow);
  assert.equal(whitespace.activities.length, 1);
  assert.equal(whitespace.behavioralAnswers[0].text, ' My complete answer  ');
});

test('editing an old saved BofA answer preserves its historical credit and records the new edit', () => {
  const revised = saveBehavioralAnswer(ownAnswer(), question, 'Updated next day', tomorrow);
  assert.equal(revised.activities.length, 2);
  assert.equal(revised.activities[0].completedAt, morning.toISOString());
  assert.equal(revised.activities[1].completedAt, tomorrow.toISOString());
  assert.equal(revised.behavioralAnswers[0].updatedAt, tomorrow.toISOString());
  assert.equal(collectCalendarActivities(revised).activities.length, 2, 'the saved-answer fallback must not add a third copy');
  validatePersonalData(revised);
});

test('clearing preserves historical work without new credit; rewriting later adds one', () => {
  const cleared = saveBehavioralAnswer(ownAnswer(), question, ' \n ', tomorrow);
  assert.equal(cleared.activities.length, 1);
  assert.equal(cleared.activities[0].completedAt, morning.toISOString());
  const rewritten = saveBehavioralAnswer(cleared, question, 'Rewritten after clearing', tomorrow);
  assert.equal(rewritten.activities.length, 2);
  assert.equal(collectCalendarActivities(rewritten).activities.length, 2);
  const clearedAgain = saveBehavioralAnswer(rewritten, question, '', tomorrow);
  assert.deepEqual(clearedAgain.activities, rewritten.activities);
});

test('independent edits merge across devices while a retry of the same editing event stays singular', () => {
  const edit = { editId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' };
  const first = saveBehavioralAnswer(createPersonalState(), question, 'First device', morning, edit);
  const retried = saveBehavioralAnswer(createPersonalState(), question, 'First device', afternoon, edit);
  const later = saveBehavioralAnswer(createPersonalState(), question, 'Second device', tomorrow);
  const a = mergePersonalData(mergePersonalData(first, retried), later);
  const b = mergePersonalData(later, mergePersonalData(retried, first));
  assert.deepEqual(collectCalendarActivities(a).activities, collectCalendarActivities(b).activities);
  assert.equal(a.activities.length, 2);
  assert.equal(a.activities.find(row => row.id === first.activities[0].id).completedAt, morning.toISOString());
  assert.equal(a.behavioralAnswers[0].text, 'Second device');
});

test('removed events stay removed without blocking future independent edits of the same answer', () => {
  const edit = { editId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' };
  const first = saveBehavioralAnswer(createPersonalState(), question, 'My answer', morning, edit);
  const deleted = { ...first, activities: [], removedActivityIds: [first.activities[0].id] };
  const replay = saveBehavioralAnswer(deleted, question, 'Continued deleted edit', afternoon, edit);
  assert.equal(replay.activities.length, 0);
  assert.equal(collectCalendarActivities(replay).activities.length, 0);
  const revised = saveBehavioralAnswer(replay, question, 'A new editing session', tomorrow);
  assert.equal(revised.activities.length, 1);
  assert.equal(collectCalendarActivities(revised).activities.length, 1);
  const merged = mergePersonalData(first, revised);
  assert.equal(collectCalendarActivities(merged).activities.length, 1);
  assert.equal(merged.removedActivityIds.includes(first.activities[0].id), true);
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

test('answer-edit events reject malformed identities, mismatched questions and private answer text', () => {
  const good = saveBehavioralAnswer(createPersonalState(), question, 'My answer', morning);
  const event = good.activities[0];
  for (const patch of [{ count: 5 }, { sourceId: '' }, { id: 'unrelated-id' }, { questionId: 'another-question' },
    { id: `behavioral:explicit:${encodeURIComponent(question.id)}:2026-09-19` },
    { completedAt: 'yesterday' }, { dateKey: '2026-02-30' }, { text: 'private answer' }]) {
    assert.throws(() => validatePersonalData({ ...good, activities: [{ ...event, ...patch }] }));
  }
  assert.equal(retainExplicitCompletionActivities(createPersonalState(), good).activities.length, 1);
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
