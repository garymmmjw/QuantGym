/** Invoked by test-learning-state-api.py against its disposable real API.
 * Only synthetic users/tokens enter this process through its environment. */
import assert from 'node:assert/strict';
import { createLearningCloudSync } from '../src/features/learning/learningCloudSync.mjs';
import { createLearningStateApi } from '../src/features/learning/learningStateApi.mjs';
import { completeLocalLesson } from '../src/features/learning/lessonProgress.mjs';
import { validateTrainingProfile } from '../src/features/learning/scoring/training-system.mjs';

const config = JSON.parse(process.env.QUANTGYM_LEARNING_HTTP_FIXTURE || 'null');
assert.ok(config?.endpoint?.startsWith('http://127.0.0.1:'), 'A disposable local HTTP fixture is required.');
assert.notEqual(config.tokenA, config.tokenB, 'Device sessions must be independent.');
const lessonIds = ['lec-q-prob-slides-01', 'lec-q-prob-slides-02', 'lec-q-prob-slides-03', 'lec-q-prob-slides-04'];
const sources = {
  library: { lessons: lessonIds.map(id => ({ id })) },
  problemsIndex: [{ id: 42, di: 142, c: 'expectation', d: 'medium', co: ['Synthetic Capital'], t: [] }],
};
const problem = { source: 'quantvault', id: 'quantvault-142', quantvault: { id: 42, displayId: 142 } };
let clock = 1792080000000;
const now = () => ++clock;
function memoryStorage() {
  const records = new Map();
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), records };
}

// Hold two completed real GETs until both devices have read one revision. Their
// following PUTs then exercise the actual database's competing CAS writes.
let gate = null, conflicts = 0;
function armRace() {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  gate = { remaining: 2, waiting, release };
}
async function realFetch(url, options) {
  const response = await fetch(url, options);
  if (response.status === 409) conflicts++;
  if (options.method === 'GET' && gate) {
    const current = gate;
    current.remaining--;
    if (current.remaining === 0) { gate = null; current.release(); }
    await current.waiting;
  }
  return response;
}
function client(userId, token, storage = memoryStorage()) {
  const api = createLearningStateApi({ userId, token, baseUrl: config.endpoint, fetchImpl: realFetch });
  const sync = createLearningCloudSync({ userId, sources, ...api, storage, scope: config.endpoint, now });
  return { sync, api, storage };
}
function completed(base, lessonId) {
  return completeLocalLesson(base, lessonId, 0, now()).progress;
}

const a = client(config.userId, config.tokenA);
const b = client(config.userId, config.tokenB);
const other = client(config.otherUserId, config.otherToken);
try {
  const initial = await a.sync.initialize();
  assert.equal(initial.learnProgress.xp, 0);
  assert.equal(initial.profile.events.length, 0);
  const first = completed(initial.learnProgress, lessonIds[0]);
  first.renderer = { [`slide:${lessonIds[0]}`]: 3, [`quiz:${lessonIds[0]}`]: { submitted: true, answers: [1, 0] } };
  first.notes = [{ lessonId: lessonIds[0], text: '来自第一台设备的笔记' }];
  assert.equal((await a.sync.saveLearn(first, initial.learnProgress)).status, 'saved');
  const answer = { eventId: 'weng-http-first-attempt', x: 1, h: true, reveal: false };
  const result = await a.sync.submitAttempt(problem, answer);
  assert.equal(result.deltaXp, 25);
  await a.sync.updatePreferences({ role: 'qr', targets: ['expectation'], targetFirms: ['Synthetic Capital'],
    rate: { prob: 'strong' }, calibration: [{ topic: 'expectation', x: 1, diff: 'medium' }] });

  // Device B has no local records and a distinct authenticated session.
  assert.equal(b.storage.records.size, 0);
  const restored = await b.sync.initialize();
  const current = a.sync.getSnapshot();
  assert.deepEqual(restored.learnProgress, current.learnProgress);
  assert.deepEqual(restored.profile, current.profile);
  assert.equal(restored.profile.events[0].h, true);
  assert.equal(restored.profile.solvedHistory['42'].xpAwarded, 25);
  assert.equal(restored.profile.prefs.role, 'qr');
  validateTrainingProfile(restored.profile, sources);

  const aBase = a.sync.getSnapshot().learnProgress;
  const bBase = b.sync.getSnapshot().learnProgress;
  armRace();
  const pair = await Promise.all([
    a.sync.saveLearn(completed(aBase, lessonIds[1]), aBase),
    b.sync.saveLearn(completed(bBase, lessonIds[2]), bBase),
  ]);
  assert.deepEqual(pair.map(item => item.status), ['saved', 'saved']);
  assert.ok(conflicts >= 1, 'The test must exercise a real server 409, not only serial writes.');
  await Promise.all([a.sync.refresh(), b.sync.refresh()]);
  const merged = a.sync.getSnapshot().learnProgress;
  assert.equal(merged.xp, 60);
  assert.deepEqual(new Set(merged.completed), new Set(lessonIds.slice(0, 3)));
  assert.deepEqual(merged.renderer, first.renderer);
  assert.deepEqual(merged.notes, first.notes);

  // Concurrent completion of the same new course awards its XP only once.
  const sameA = a.sync.getSnapshot().learnProgress, sameB = b.sync.getSnapshot().learnProgress;
  armRace();
  const repeated = await Promise.all([
    a.sync.saveLearn(completed(sameA, lessonIds[3]), sameA),
    b.sync.saveLearn(completed(sameB, lessonIds[3]), sameB),
  ]);
  assert.deepEqual(repeated.map(item => item.status), ['saved', 'saved']);
  await a.sync.refresh();
  assert.equal(a.sync.getSnapshot().learnProgress.xp, 80);
  assert.equal(Object.keys(a.sync.getSnapshot().learnProgress.awards).length, 4);

  // A second session retry of the same immutable answer is also idempotent.
  assert.equal((await b.sync.submitAttempt(problem, answer)).duplicate, true);
  assert.equal(b.sync.getSnapshot().profile.events.length, 1);
  assert.equal(b.sync.getSnapshot().profile.solvedHistory['42'].xpAwarded, 25);

  const otherInitial = await other.sync.initialize();
  assert.equal(otherInitial.learnProgress.xp, 0);
  assert.equal(otherInitial.profile.events.length, 0);
  assert.equal(otherInitial.profile.prefs.role, 'unsure');
  await other.sync.saveLearn(completed(otherInitial.learnProgress, lessonIds[0]), otherInitial.learnProgress);
  await other.sync.updatePreferences({ role: 'qd' });
  const ownerStored = await a.api.load(), otherStored = await other.api.load();
  assert.equal(ownerStored.data.learn.xp, 80);
  assert.equal(ownerStored.data.training.prefs.role, 'qr');
  assert.equal(ownerStored.data.training.events.length, 1);
  assert.equal(otherStored.data.learn.xp, 20);
  assert.equal(otherStored.data.training.prefs.role, 'qd');
  assert.equal(otherStored.data.training.events.length, 0);
  console.log('Real HTTP learning sync passed: independent sessions restore, concurrent CAS merges, XP deduplication, scoring preferences and account isolation.');
} finally {
  a.sync.close(); b.sync.close(); other.sync.close();
}
