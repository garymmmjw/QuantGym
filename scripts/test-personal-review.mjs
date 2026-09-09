import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { appendReviewEvent, buildDailyQuestionUrl, createReviewEvent, getReviewQueue, nextReviewDate, validateReviewEvent } from '../src/features/personal/review/reviewEngine.js';
import { completeDailyQuestion, createDailySession, resolveDailyDeepLink, selectDailyQuestions, updateDailyAnswer } from '../src/features/personal/daily/dailyEngine.js';
import { createPersonalState, createPersonalStore, mergePersonalData } from '../src/features/personal/personalStore.js';

const completedAt = '2026-09-09T12:00:00.000Z';
function practice({ id = 'session', questionKey = 'stable-question', assessment = 'review', at = completedAt } = {}) {
  const session = createDailySession({ mentalEnabled: false, techCount: 1, codingCount: 0, behavioralCount: 0 }, { id, startedAt: new Date(Date.parse(at) - 60000).toISOString() });
  session.questions[0] = { ...session.questions[0], id: questionKey, title: `Saved question ${id}`, prompt: 'Saved original prompt with a complete question.' };
  let state = { ...createPersonalState(), dailySessions: [session] };
  state = updateDailyAnswer(state, id, questionKey, { text: `Original answer ${id}`, selfAssessment: assessment });
  return completeDailyQuestion(state, id, questionKey, at);
}

test('new accounts and independent or unfinished answers do not get invented review tasks', () => {
  assert.deepEqual(getReviewQueue({}, completedAt), []);
  assert.deepEqual(getReviewQueue(practice({ assessment: 'independent' }), completedAt), []);
  const unfinished = practice();
  delete unfinished.dailySessions[0].answers['stable-question'].completedAt;
  assert.deepEqual(getReviewQueue(unfinished, completedAt), []);
});

test('a completed difficult answer is due immediately with its saved question and answer', () => {
  const state = practice({ assessment: 'with-help' });
  const [item] = getReviewQueue(state, completedAt);
  assert.equal(item.questionKey, 'stable-question');
  assert.equal(item.due, true);
  assert.equal(item.dueAt, completedAt);
  assert.equal(item.reviewCount, 0);
  assert.equal(item.lastReview, null);
  assert.equal(item.question, state.dailySessions[0].questions[0]);
  assert.equal(item.answer.text, 'Original answer session');
});

test('repeat appearances deduplicate by stable question id and select the latest difficult attempt', () => {
  const older = practice({ id: 'old' });
  const newer = practice({ id: 'new', at: '2026-09-10T12:00:00Z' });
  const snapshot = { ...older, dailySessions: [...newer.dailySessions, ...older.dailySessions] };
  const [item] = getReviewQueue(snapshot, '2026-09-11T12:00:00Z');
  assert.equal(getReviewQueue(snapshot).length, 1);
  assert.equal(item.session.id, 'new');
  assert.equal(item.question.title, 'Saved question new');
  assert.equal(item.answer.text, 'Original answer new');
});

test('again, good, and easy schedule the next local calendar date by one, three, and seven days', () => {
  const start = new Date(2026, 8, 9, 17, 30).toISOString();
  for (const [rating, offset] of [['again', 1], ['good', 3], ['easy', 7]]) {
    const due = new Date(nextReviewDate(start, rating));
    assert.equal(due.getFullYear(), 2026);
    assert.equal(due.getMonth(), 8);
    assert.equal(due.getDate(), 9 + offset);
    assert.equal(due.getHours(), 0);
  }
});

test('local due dates survive DST boundaries and year rollover', () => {
  const moduleUrl = new URL('../src/features/personal/review/reviewEngine.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { nextReviewDate } from ${JSON.stringify(moduleUrl)};
    for (const [start, expected] of [['2026-03-07T23:30:00-06:00', '2026-3-8'], ['2026-10-31T23:30:00-05:00', '2026-11-1'], ['2026-12-31T23:30:00-06:00', '2027-1-1']]) {
      const due = new Date(nextReviewDate(start, 'again'));
      assert.equal([due.getFullYear(), due.getMonth()+1, due.getDate()].join('-'), expected);
      assert.equal(due.getHours(), 0);
    }
  `], { env: { ...process.env, TZ: 'America/Chicago' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('only the latest valid review event controls due date, independent of cloud array order', () => {
  const state = practice();
  const first = createReviewEvent('stable-question', 'again', 'First note', { id: 'first', now: '2026-09-09T13:00:00Z' });
  const last = createReviewEvent('stable-question', 'easy', 'Later note', { id: 'last', now: '2026-09-10T13:00:00Z' });
  state.reviewEvents = [last, first, last];
  const [item] = getReviewQueue(state, '2026-09-11T12:00:00Z');
  assert.equal(item.lastReview.id, 'last');
  assert.equal(item.reviewCount, 2);
  assert.equal(item.due, false);
  assert.equal(item.dueAt, nextReviewDate(last.reviewedAt, 'easy'));
  assert.equal(getReviewQueue(state, item.dueAt)[0].due, true);
});

test('a new difficult answer restarts the schedule without deleting prior review events', () => {
  const old = practice();
  const event = createReviewEvent('stable-question', 'easy', 'Past review', { id: 'past', now: '2026-09-09T13:00:00Z' });
  const latest = practice({ id: 'next-session', at: '2026-09-10T12:00:00Z' });
  const state = { ...latest, dailySessions: [...old.dailySessions, ...latest.dailySessions], reviewEvents: [event] };
  const [item] = getReviewQueue(state, '2026-09-10T13:00:00Z');
  assert.equal(item.due, true);
  assert.equal(item.lastReview, null);
  assert.equal(state.reviewEvents.length, 1);
});

test('equal-millisecond review events use the same binary id ordering as persisted cloud events', () => {
  const state = practice();
  state.reviewEvents = [
    { id: 'a', questionKey: 'stable-question', rating: 'easy', note: '', reviewedAt: '2026-09-09T13:00:00.000001Z' },
    { id: 'Z', questionKey: 'stable-question', rating: 'again', note: '', reviewedAt: '2026-09-09T13:00:00.000002Z' },
  ];
  assert.equal(getReviewQueue(state, '2026-09-10T12:00:00Z')[0].lastReview.id, 'a');
  assert.equal(getReviewQueue(state, '2026-09-10T12:00:00Z')[0].lastReview.rating, 'easy');
});

test('append-only reviews leave original answers and completion totals untouched and retries are idempotent', () => {
  const state = practice();
  const serialized = JSON.stringify(state);
  const event = createReviewEvent('stable-question', 'good', 'Fresh recall', { id: 'review-once', now: '2026-09-09T13:00:00Z' });
  const next = appendReviewEvent(state, event);
  assert.equal(next.dailySessions, state.dailySessions);
  assert.equal(next.activities, state.activities);
  assert.equal(next.trials, state.trials);
  assert.equal(next.reviewEvents.length, 1);
  assert.equal(appendReviewEvent(next, event), next);
  assert.equal(JSON.stringify(state), serialized);
});

test('reviews persist through the real store and backups and merge once across devices', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const store = createPersonalStore({ ownerId: 'review-user', storage });
  store.update(() => practice());
  const event = createReviewEvent('stable-question', 'good', 'My new recall', { id: 'persist', now: '2026-09-09T13:00:00Z' });
  assert.equal(store.update(state => appendReviewEvent(state, event)).ok, true);
  const restored = createPersonalStore({ ownerId: 'review-user', storage }).getSnapshot().data;
  assert.equal(restored.reviewEvents[0].note, 'My new recall');
  assert.equal(restored.dailySessions[0].answers['stable-question'].text, 'Original answer session');
  assert.equal(mergePersonalData(restored, restored).reviewEvents.length, 1);
  store.restoreBackup(store.exportBackup());
  assert.equal(store.getSnapshot().data.reviewEvents.length, 1);
});

test('review events reject unknown fields, malformed dates, nontext notes and invalid ratings', () => {
  const valid = { id: 'review', questionKey: 'question', reviewedAt: completedAt, rating: 'good', note: '' };
  assert.equal(validateReviewEvent(valid), valid);
  for (const patch of [{ id: '' }, { questionKey: '' }, { reviewedAt: '2026-02-30T12:00:00Z' }, { reviewedAt: '2026-09-09' }, { reviewedAt: '2026-09-09T12:00:00' }, { rating: 'unknown' }, { rating: ['good'] }, { note: {} }, { note: 'x'.repeat(20001) }, { privateField: 'unexpected' }]) {
    assert.throws(() => validateReviewEvent({ ...valid, ...patch }), /Invalid review/);
  }
});

test('saved review links encode ids safely and resolve the exact historical item', () => {
  const state = practice({ id: 'session/a&b', questionKey: 'library-tech-x?y=1' });
  const link = buildDailyQuestionUrl('session/a&b', 'library-tech-x?y=1');
  const result = resolveDailyDeepLink(state.dailySessions, link.slice(link.indexOf('?')));
  assert.deepEqual(result, { sessionId: 'session/a&b', questionId: 'library-tech-x?y=1', missingSession: false, missingQuestion: false });
  assert.equal(getReviewQueue(state)[0].href, link);
  assert.equal(resolveDailyDeepLink(state.dailySessions, '?session=missing&question=x').missingSession, true);
  assert.equal(resolveDailyDeepLink(state.dailySessions, '?session=session%2Fa%26b&question=missing').missingQuestion, true);
});

function libraryQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `library-${index}`, category: 'probability', titleEn: `Question ${index}`, promptEn: `A unique probability interview question number ${index}, with enough context to solve.`, answer: `The complete reasoning and answer for question ${index}.` }));
}

test('new sessions avoid the last three sessions’ library questions when fresh questions exist', () => {
  const settings = { mentalEnabled: false, techCount: 3, codingCount: 0, behavioralCount: 0 };
  const problems = libraryQuestions(9);
  const old = createDailySession(settings, { id: 'old', startedAt: completedAt, problems });
  const before = JSON.stringify(old);
  const next = createDailySession(settings, { id: 'next', startedAt: '2026-09-10T12:00:00Z', problems, priorSessions: [old] });
  const oldIds = new Set(old.questions.map(question => question.id));
  assert.equal(next.questions.length, 3);
  assert.ok(next.questions.every(question => !oldIds.has(question.id)));
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(selectDailyQuestions(settings, 'stable', problems, [old]), selectDailyQuestions(settings, 'stable', problems, [old]));
});

test('small libraries still fill the configured count without duplicate ids', () => {
  const settings = { mentalEnabled: false, techCount: 3, codingCount: 0, behavioralCount: 0 };
  const problems = libraryQuestions(2);
  const old = createDailySession(settings, { id: 'old', startedAt: completedAt, problems });
  const next = createDailySession(settings, { id: 'next', startedAt: '2026-09-10T12:00:00Z', problems, priorSessions: [old] });
  assert.equal(next.questions.length, 3);
  assert.equal(new Set(next.questions.map(question => question.id)).size, 3);
  assert.equal(next.questions.filter(question => question.source === 'library').length, 2);
});
