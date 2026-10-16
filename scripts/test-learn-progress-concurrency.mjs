import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearnProgressWriter } from '../src/features/learning/learnProgressWriter.mjs';
import { readLearnProgress, saveLearnProgress } from '../src/features/learning/learningStore.mjs';
import { completeLocalLesson } from '../src/features/learning/lessonProgress.mjs';

function exclusiveLocks() {
  const queues = new Map();
  return { request(name, action) {
    const task = (queues.get(name) || Promise.resolve()).then(action);
    queues.set(name, task.catch(() => {}));
    return task;
  } };
}
function fixture() {
  const data = new Map(), userId = 'local-vip';
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const lessonIds = ['lec-q-prob-slides-03', 'lec-q-prob-slides-04'];
  const options = { storage, lessonIds }, locks = exclusiveLocks();
  const read = () => readLearnProgress(userId, options);
  const save = value => saveLearnProgress(userId, value, options);
  const client = (overrides = {}) => createLearnProgressWriter({ userId, initialProgress: read(), read, save, locks, isActive: () => true, ...overrides });
  return { userId, read, client, locks, lessonIds };
}
const complete = (progress, lesson) => completeLocalLesson(progress, lesson, 0, Date.UTC(2026, 9, 16)).progress;

test('stale tab cannot erase another tab’s completion or XP; its queued writes stay closed', async () => {
  const f = fixture(), a = f.client(), b = f.client(), initial = f.read();
  const completed = complete(initial, f.lessonIds[0]);
  assert.equal((await b.submit(completed)).status, 'saved');
  const staleTurn = a.submit({ ...initial, renderer: { 'sv-pos-session-3': '4' } });
  const laterStaleTurn = a.submit({ ...initial, renderer: { 'sv-pos-session-3': '5' } });
  assert.equal((await staleTurn).status, 'conflict');
  assert.equal((await laterStaleTurn).status, 'inactive');
  assert.deepEqual(f.read().completed, [f.lessonIds[0]]);
  assert.equal(f.read().xp, 20);
  assert.equal(f.read().renderer, undefined);
  // A new iframe initializes from the preserved record and can continue.
  const reloaded = f.client();
  assert.equal((await reloaded.submit({ ...f.read(), renderer: { 'sv-pos-session-3': '4' } })).status, 'saved');
  assert.equal(f.read().xp, 20);
  assert.deepEqual(f.read().completed, [f.lessonIds[0]]);
});

test('one iframe queues consecutive writes and advances its confirmed snapshot', async () => {
  const f = fixture(), a = f.client();
  const first = complete(f.read(), f.lessonIds[0]);
  const second = { ...first, renderer: { 'sv-pos-session-3': '4' } };
  const result = await Promise.all([a.submit(first), a.submit(second)]);
  assert.deepEqual(result.map(x => x.status), ['saved', 'saved']);
  assert.equal(f.read().xp, 20);
  assert.equal(f.read().renderer['sv-pos-session-3'], '4');
});

test('simultaneous tabs serialize compare-and-save instead of silently replacing one result', async () => {
  const f = fixture(), a = f.client(), b = f.client(), initial = f.read();
  const result = await Promise.all([a.submit(complete(initial, f.lessonIds[0])), b.submit(complete(initial, f.lessonIds[1]))]);
  assert.deepEqual(result.map(x => x.status), ['saved', 'conflict']);
  assert.deepEqual(f.read().completed, [f.lessonIds[0]]);
  assert.equal(f.read().xp, 20);
});

test('account switch or iframe disposal while waiting for a lock cannot save', async () => {
  const f = fixture();
  let release, active = true;
  const blocker = f.locks.request(`quantgym:learning:write:${f.userId}`, () => new Promise(resolve => { release = resolve; }));
  await Promise.resolve();
  const a = f.client({ isActive: () => active });
  const pending = a.submit(complete(f.read(), f.lessonIds[0]));
  await Promise.resolve();
  active = false;
  release(); await blocker;
  assert.equal((await pending).status, 'inactive');
  assert.equal(f.read().xp, 0);
  assert.deepEqual(f.read().completed, []);
});

test('unsupported locking does not fall back to an unsafe write', async () => {
  const f = fixture(), a = f.client({ locks: undefined });
  await assert.rejects(a.submit(complete(f.read(), f.lessonIds[0])), /Chrome/);
  assert.equal(f.read().xp, 0);
});
