import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalState, createPersonalStore, mergePersonalData, validatePersonalData } from '../src/features/personal/personalStore.js';
import { createPracticeSession, editPracticeSession, setPracticeTimer, completePracticeSession, practiceElapsed, drawTechnicalQuestion, validatePracticeSession } from '../src/features/personal/practice/practiceModel.js';
import { collectCalendarActivities, summarizeActivities } from '../src/features/personal/calendar/calendarModel.js';

const now = '2026-09-13T10:00:00.000Z';
const later = '2026-09-13T10:01:00.000Z';
const question = { id: 'purple-1', source: 'question-bank', title: '概率练习', prompt: 'A fixture question with sufficient text.', reference: 'Fixture reference.' };
const coding = { id: 'two-sum', slug: 'two-sum', source: 'leetcode', title: '两数之和', url: 'https://leetcode.cn/problems/two-sum/', username: 'practice-fixture', linkedAt: now };
const session = (id = 'fixture-1', kind = 'tech') => createPracticeSession(kind, kind === 'tech' ? question : coding, { id, now });
const stateWith = (...sessions) => ({ ...createPersonalState(), practiceSessions: sessions });
const finish = (state, id) => completePracticeSession(editPracticeSession(state, id, { text: 'My reasoning', selfAssessment: 'independent' }, later), id, later);

test('single-question draws and drafts never create daily rounds or completed activity', () => {
  const original = stateWith(session());
  const draft = editPracticeSession(original, 'fixture-1', { text: 'A draft' }, later);
  assert.equal(draft.practiceSessions[0].text, 'A draft');
  assert.equal(original.practiceSessions[0].text, '');
  assert.equal(draft.activities.length, 0);
  assert.equal(draft.dailySessions.length, 0);
  assert.equal(completePracticeSession(draft, 'fixture-1'), draft);
  assert.equal(validatePersonalData(draft).practiceSessions.length, 1);
});

test('timers retain elapsed time across pauses/reloads and only one practice timer runs', () => {
  let data = setPracticeTimer(stateWith(session(), session('fixture-2', 'coding')), 'fixture-1', true, now);
  data = validatePersonalData(JSON.parse(JSON.stringify(data)));
  assert.equal(practiceElapsed(data.practiceSessions[0], Date.parse(later)), 60);
  data = setPracticeTimer(data, 'fixture-2', true, later);
  assert.equal(data.practiceSessions[0].elapsedSeconds, 60);
  assert.equal(data.practiceSessions[0].timerStartedAt, null);
  assert.equal(data.practiceSessions[1].timerStartedAt, later);
  data = setPracticeTimer(data, 'fixture-2', false, '2026-09-13T10:01:30Z');
  assert.equal(data.practiceSessions[1].elapsedSeconds, 30);
});

test('explicit technical completion counts once while local Coding OA review only preserves practice history', () => {
  let data = stateWith(session(), session('fixture-2', 'coding'));
  data = finish(data, 'fixture-1');
  data = finish(data, 'fixture-2');
  assert.equal(completePracticeSession(data, 'fixture-2'), data);
  const summary = summarizeActivities(collectCalendarActivities(data).activities);
  assert.equal(summary.tech, 1);
  assert.equal(summary.coding, 0);
  assert.equal(summary.codingReviews, 1);
  assert.equal(summary.daily, 0);
  assert.equal(summary.totalQuestions, 1);
  assert.equal(data.practiceSessions.every(s => s.status === 'completed' && !s.timerStartedAt), true);
});

test('finished work survives older snapshots in both directions and rebuilds missing calendar entries', () => {
  const draft = stateWith(session());
  const done = { ...finish(draft, 'fixture-1'), activities: [] };
  for (const data of [mergePersonalData(draft, done), mergePersonalData(done, draft)]) {
    assert.equal(data.practiceSessions[0].status, 'completed');
    assert.equal(data.activities[0].id, 'practice:fixture-1');
    assert.equal(data.activities.length, 1);
  }
  const older = createPersonalState(); delete older.practiceSessions;
  assert.equal(mergePersonalData(older, done).practiceSessions.length, 1);
});

test('newer drafts win regardless of merge direction; removed activity stays removed', () => {
  const initial = stateWith(session());
  const recent = editPracticeSession(initial, 'fixture-1', { text: 'More recent draft' }, later);
  for (const data of [mergePersonalData(initial, recent), mergePersonalData(recent, initial)]) assert.equal(data.practiceSessions[0].text, 'More recent draft');
  const done = finish(initial, 'fixture-1');
  const removed = { ...done, activities: [], removedActivityIds: ['practice:fixture-1'] };
  assert.equal(mergePersonalData(done, removed).activities.length, 0);
});

test('successive edits in the same clock millisecond have distinct increasing revisions', () => {
  const original = stateWith(session());
  const first = editPracticeSession(original, 'fixture-1', { text: 'first' }, now);
  const second = editPracticeSession(first, 'fixture-1', { text: 'second' }, now);
  assert.ok(Date.parse(second.practiceSessions[0].updatedAt) > Date.parse(first.practiceSessions[0].updatedAt));
  assert.equal(mergePersonalData(first, second).practiceSessions[0].text, 'second');
});

test('question or LeetCode identity cannot change under the same session ID', () => {
  const initial = stateWith(session('fixture-code', 'coding'));
  const changed = structuredClone(initial);
  changed.practiceSessions[0].question.username = 'another-profile';
  assert.throws(() => mergePersonalData(initial, changed), /Conflicting practice question/);
  assert.throws(() => validatePracticeSession({ ...session(), question: { ...session().question, source: 'green-book' } }), /source/);
  const unsafe = session('fixture-code', 'coding'); unsafe.question.url = 'https://evil.example/two-sum/';
  assert.throws(() => validatePracticeSession(unsafe), /source/);
  assert.throws(() => validatePracticeSession({ ...session(), elapsedSeconds: Infinity }), /Invalid/);
});

test('private drafts and completions persist through the real store and do not cross accounts', () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value) };
  const a = createPersonalStore({ ownerId: 'user-a', storage });
  a.update(() => finish(stateWith(session()), 'fixture-1'));
  const reloaded = createPersonalStore({ ownerId: 'user-a', storage });
  assert.equal(reloaded.getSnapshot().data.practiceSessions[0].text, 'My reasoning');
  assert.equal(createPersonalStore({ ownerId: 'user-b', storage }).getSnapshot().data.practiceSessions.length, 0);
});

test('technical draw uses only Purple Book and avoids immediate repeats', () => {
  const rows = [question, { ...question, id: 'purple-2' }, { ...question, id: 'other', source: 'green-book' }];
  assert.equal(drawTechnicalQuestion(rows, 'purple-1', () => 0).id, 'purple-2');
  assert.equal(drawTechnicalQuestion([], '', () => 0), null);
  assert.equal(drawTechnicalQuestion([question], 'purple-1', () => 1).id, 'purple-1');
});

test('new practice snapshots retain original numbering and source answers independently of later catalog edits', () => {
  const provenance = { version: 1, originalNumber: '2.3', chapter: 'Probability', section: 'Conditioning', sourcePage: '18', pdfPage: 22,
    edition: 'Fixture edition', sourceHashSHA256: 'a'.repeat(64), sourceUrl: 'https://drive.google.com/file/d/fixture/view',
    answerStatus: 'corrected', sourceReference: 'Original fixture answer.', reviewNotes: 'Fixture correction.' };
  const current = { ...question, provenance, reference: 'Reviewed fixture answer.' };
  const old = session('old-source');
  const created = createPracticeSession('tech', current, { id: 'new-source', now });
  const snapshot = structuredClone(created);
  provenance.originalNumber = '3.9';
  provenance.sourceReference = 'Later source text.';
  current.reference = 'Later reasoning.';
  assert.deepEqual(created, snapshot);
  const state = stateWith(old, created);
  const restored = validatePersonalData(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.practiceSessions, [old, snapshot]);
  assert.deepEqual(mergePersonalData(stateWith(old), restored).practiceSessions.find(item => item.id === 'new-source'), snapshot);
  assert.equal(created.question.reference, 'Reviewed fixture answer.');
  assert.equal(created.question.provenance.sourceReference, 'Original fixture answer.');
});

test('missing source answers remain usable only when explicitly labelled and never create an answer', () => {
  const missing = { ...question, reference: '', provenance: { version: 1, originalNumber: '练习 3.1', answerStatus: 'missing' } };
  const created = createPracticeSession('tech', missing, { id: 'missing-reference', now });
  assert.equal(created.question.reference, '');
  assert.equal(created.question.referenceEn, '');
  assert.equal(finish(stateWith(created), created.id).practiceSessions[0].status, 'completed');
  for (const status of ['source', 'reviewed', 'corrected', 'supplemented']) {
    assert.throws(() => createPracticeSession('tech', { ...missing, provenance: { version: 1, answerStatus: status } }, { id: 'invalid', now }), /source/);
  }
  assert.throws(() => createPracticeSession('tech', { ...question, reference: '' }, { id: 'invalid', now }), /source/);
});

test('practice metadata matches cloud validation and cannot be attached to Coding OA', () => {
  for (const provenance of [null, {}, { version: 2 }, { version: 1, pdfPage: true }, { version: 1, sourcePage: 2 }, { version: 1, unexpected: 'field' }]) {
    assert.throws(() => createPracticeSession('tech', { ...question, provenance }, { id: 'invalid', now }), /provenance|Purple Book/);
  }
  assert.throws(() => createPracticeSession('coding', { ...coding, provenance: { version: 1 } }, { id: 'invalid', now }), /provenance/);
  assert.throws(() => createPracticeSession('tech', { ...question, unexpected: 'not-a-snapshot-field' }, { id: 'invalid', now }), /question/);
});
