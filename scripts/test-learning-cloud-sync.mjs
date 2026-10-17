import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningCloudSync, LearningCloudConflictError } from '../src/features/learning/learningCloudSync.mjs';
import { mergeLearnProgress, mergeLegacyTrainingProfile } from '../src/features/learning/learningCloudMerge.mjs';
import { learningStorageKey } from '../src/features/learning/learningStore.mjs';
import { normalizeProgress, completeLocalLesson, uncompleteLocalLesson } from '../src/features/learning/lessonProgress.mjs';
import { createTrainingProfile, submitTrainingAttempt, updateTrainingPreferences, validateTrainingProfile } from '../src/features/learning/scoring/training-system.mjs';

const clone = value => structuredClone(value), now = Date.UTC(2026, 9, 16);
const lessons = ['lec-example-one', 'lec-example-two'];
const sources = { library: { lessons: lessons.map(id => ({ id })) },
  problemsIndex: [{ id: 900, di: 14, c: 'expectation', d: 'medium', tg: [], co: [] }, { id: 901, di: 15, c: 'probability', d: 'hard', tg: [], co: [] }] };
const problem = { id: 'quantvault-14', source: 'quantvault', quantvault: { id: 900, displayId: 14 } };
const secondProblem = { id: 'quantvault-15', source: 'quantvault', quantvault: { id: 901, displayId: 15 } };
const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) }; };
const complete = (base, index = 0, bonus = 0) => completeLocalLesson(base, lessons[index], bonus, now).progress;
function fixture() {
  const records = new Map();
  let offline = false, lostAck = false, falseAck = false;
  const state = user => clone(records.get(user) || { version: 1, revision: 0, updatedAt: null, data: null });
  const client = (user = 'alice', storage = memory(), extra = {}) => createLearningCloudSync({ userId: user, sources, storage, scope: 'https://api.example.test/api', now: () => now,
    load: async () => { if (offline) throw Error('offline'); return state(user); },
    save: async input => {
      if (offline) throw Error('offline');
      const prior = state(user);
      if (input.baseRevision !== prior.revision) return { ...prior, status: 409, error: 'conflict' };
      if (falseAck) { falseAck = false; return prior; }
      const next = { version: 1, revision: prior.revision + 1, updatedAt: new Date(now + prior.revision).toISOString(), data: clone(input.data) };
      records.set(user, next);
      if (lostAck) { lostAck = false; throw Error('connection lost after commit'); }
      return clone(next);
    }, ...extra });
  return { client, state, records, offline: value => { offline = value; }, loseAck: () => { lostAck = true; }, badAck: () => { falseAck = true; } };
}

test('independent browsers hydrate one account while another account starts empty', async () => {
  const f = fixture(), a = f.client();
  const initial = await a.initialize();
  await a.saveLearn({ ...complete(initial.learnProgress), renderer: { 'slide-one': '4' }, notes: [{ text: 'Remember', at: '2026-10-16' }] }, initial.learnProgress);
  await a.submitAttempt(problem, { eventId: 'session-one', x: 1, h: true });
  await a.updatePreferences({ role: 'qr' }, a.getSnapshot().profile.prefs);
  const restored = await f.client().initialize();
  assert.equal(restored.learnProgress.xp, 20);
  assert.equal(restored.learnProgress.renderer['slide-one'], '4');
  assert.equal(restored.profile.events[0].h, true);
  assert.equal(restored.profile.prefs.role, 'qr');
  assert.equal(restored.profile.solvedHistory['900'].xpAwarded, 25);
  const other = await f.client('bob').initialize();
  assert.equal(other.learnProgress.xp, 0); assert.equal(other.profile.events.length, 0);
  assert.notEqual(other.revision, restored.revision);
});

test('legacy migration retains exact backup, permanent XP and does not reimport after uncompletion', async () => {
  const f = fixture(), storage = memory(), legacy = complete(normalizeProgress());
  let profile = createTrainingProfile({ id: 'old-profile', now: now - 1000 });
  profile = submitTrainingAttempt(profile, { problemId: 900, eventId: 'legacy-one', x: 1, now }, sources).profile;
  const raw = JSON.stringify(legacy);
  storage.setItem(learningStorageKey('alice'), raw);
  storage.setItem(learningStorageKey('alice', 'training'), JSON.stringify(profile));
  const a = f.client('alice', storage), migrated = await a.initialize();
  assert.equal(migrated.learnProgress.xp, 20); assert.equal(migrated.profile.events.length, 1);
  const backup = [...storage.values.entries()].find(([key]) => key.endsWith(':legacy-backup'));
  assert.equal(JSON.parse(backup[1]).learn, raw);
  await a.saveLearn(uncompleteLocalLesson(migrated.learnProgress, lessons[0]), migrated.learnProgress);
  const restored = await f.client('alice', storage).initialize();
  assert.deepEqual(restored.learnProgress.completed, []); assert.equal(restored.learnProgress.xp, 20);
  assert.equal(restored.profile.events.length, 1);
});

test('simultaneous devices CAS-rebase independent lessons and retain remote additions on third iframe write', async () => {
  const f = fixture(), a = f.client(), b = f.client();
  const [sa, sb] = await Promise.all([a.initialize(), b.initialize()]);
  const firstInput = { ...complete(sa.learnProgress, 0), renderer: { one: '2' } };
  const secondInput = { ...complete(sb.learnProgress, 1), renderer: { two: '3' } };
  const outcomes = await Promise.all([a.saveLearn(firstInput, sa.learnProgress), b.saveLearn(secondInput, sb.learnProgress)]);
  assert.deepEqual(outcomes.map(x => x.status), ['saved', 'saved']);
  const thirdInput = { ...secondInput, renderer: { two: '4' } };
  await b.saveLearn(thirdInput, secondInput); // Baseline is ACKed input, not merged server output.
  const restored = f.state('alice').data.learn;
  assert.equal(restored.xp, 40); assert.equal(restored.completed.length, 2);
  assert.deepEqual(restored.renderer, { one: '2', two: '4' });
});

test('same-lesson concurrent completions get only one award, and uncompletion stays reversible', async () => {
  const f = fixture(), a = f.client(), b = f.client();
  const [sa, sb] = await Promise.all([a.initialize(), b.initialize()]);
  await Promise.all([a.saveLearn(complete(sa.learnProgress), sa.learnProgress), b.saveLearn(complete(sb.learnProgress), sb.learnProgress)]);
  assert.equal(f.state('alice').data.learn.xp, 20);
  const current = (await b.refresh()).learnProgress;
  const undone = uncompleteLocalLesson(current, lessons[0]);
  await b.saveLearn(undone, current);
  await a.saveLearn({ ...complete(sa.learnProgress), renderer: { one: '7' } }, complete(sa.learnProgress));
  assert.deepEqual(f.state('alice').data.learn.completed, []); assert.equal(f.state('alice').data.learn.xp, 20);
});

test('same renderer field conflict returns latest state without overwriting either hidden field', async () => {
  const f = fixture(), a = f.client(), b = f.client();
  const [sa, sb] = await Promise.all([a.initialize(), b.initialize()]);
  await a.saveLearn({ ...sa.learnProgress, renderer: { one: '3' } }, sa.learnProgress);
  const result = await b.saveLearn({ ...sb.learnProgress, renderer: { one: '7' } }, sb.learnProgress);
  assert.equal(result.status, 'conflict'); assert.equal(result.progress.renderer.one, '3');
  assert.equal(f.state('alice').data.learn.renderer.one, '3');
});

test('lost acknowledgement retries are idempotent for course awards and scoring event IDs', async () => {
  const f = fixture(), a = f.client(), initial = await a.initialize(), next = complete(initial.learnProgress);
  f.loseAck(); await assert.rejects(a.saveLearn(next, initial.learnProgress), /lost/);
  assert.equal(a.getSnapshot().learnProgress.xp, 0);
  assert.equal((await a.saveLearn(next, initial.learnProgress)).status, 'saved');
  assert.equal(f.state('alice').data.learn.xp, 20);
  f.loseAck(); await assert.rejects(a.submitAttempt(problem, { eventId: 'lost-score', x: 1 }), /lost/);
  const result = await a.submitAttempt(problem, { eventId: 'lost-score', x: 1 });
  assert.equal(result.duplicate, true); assert.equal(result.deltaXp, 0);
  assert.equal(f.state('alice').data.training.events.length, 1);
});

test('offline writes preserve the acknowledged cache and no hidden queue replays them later', async () => {
  const f = fixture(), storage = memory(), a = f.client('alice', storage), initial = await a.initialize();
  const cached = storage.getItem(learningStorageKey('alice'));
  f.offline(true); await assert.rejects(a.saveLearn(complete(initial.learnProgress), initial.learnProgress), /offline/);
  assert.equal(storage.getItem(learningStorageKey('alice')), cached);
  f.offline(false); await a.refresh(); assert.equal(f.state('alice').data.learn.xp, 0);
  await a.saveLearn(complete(initial.learnProgress), initial.learnProgress); assert.equal(f.state('alice').data.learn.xp, 20);
});

test('account switch while a load is pending cannot write or publish another account state', async () => {
  const f = fixture(); let active = true, release, writes = 0, updates = 0;
  const a = f.client('alice', memory(), { isActive: () => active, onChange: () => updates++,
    load: () => new Promise(resolve => { release = resolve; }), save: async () => { writes++; } });
  const pending = a.initialize(); await Promise.resolve(); active = false; release(f.state('alice'));
  await assert.rejects(pending, { code: 'LEARNING_INACTIVE' }); assert.equal(writes, 0); assert.equal(updates, 0);
});

test('same event across devices is idempotent; distinct answers share one first-solve and 30-day ledger', async () => {
  const f = fixture(), a = f.client(), b = f.client(); await Promise.all([a.initialize(), b.initialize()]);
  const both = await Promise.all([a.submitAttempt(problem, { eventId: 'same', x: 1 }), b.submitAttempt(problem, { eventId: 'same', x: 1 })]);
  assert.equal(both.filter(result => result.duplicate).length, 1);
  await Promise.all([a.submitAttempt(problem, { eventId: 'second', x: 0 }), b.submitAttempt(secondProblem, { eventId: 'third', x: 1 })]);
  const profile = f.state('alice').data.training;
  assert.equal(profile.events.length, 3); assert.equal(profile.events.find(e => e.id === 'second').abilityFrozen, true);
  assert.equal(Object.values(profile.solvedHistory).reduce((sum, e) => sum + e.xpAwarded, 0), 75);
  validateTrainingProfile(profile, sources);
  await assert.rejects(a.submitAttempt(problem, { eventId: 'same', x: 0 }), /different submission/);
});

test('branching legacy scoring ledgers replay chronological events and never sum duplicate XP', () => {
  const initial = createTrainingProfile({ id: 'legacy', now: now - 1000 });
  const local = submitTrainingAttempt(initial, { problemId: 900, eventId: 'local-first', x: 1, now }, sources).profile;
  const remote = submitTrainingAttempt(initial, { problemId: 900, eventId: 'remote-second', x: 0, now: now + 1 }, sources).profile;
  const merged = mergeLegacyTrainingProfile(local, remote, sources);
  assert.deepEqual(merged.events.map(e => e.id), ['local-first', 'remote-second']);
  assert.equal(merged.events[1].abilityFrozen, true); assert.equal(merged.solvedHistory['900'].xpAwarded, 25);
  assert.equal(merged.attempts['900'].x, 1); validateTrainingProfile(merged, sources);
  assert.equal(mergeLegacyTrainingProfile(local, merged, sources).events.length, 2);
});

test('independent settings merge, same setting and ambiguous calibration edits conflict explicitly', async () => {
  const f = fixture(), a = f.client(), b = f.client(), [sa, sb] = await Promise.all([a.initialize(), b.initialize()]);
  await Promise.all([a.updatePreferences({ role: 'qr' }, sa.profile.prefs), b.updatePreferences({ targetFirms: ['Example'] }, sb.profile.prefs)]);
  assert.equal(f.state('alice').data.training.prefs.role, 'qr');
  assert.deepEqual(f.state('alice').data.training.prefs.targetFirms, ['Example']);
  await assert.rejects(b.updatePreferences({ role: 'qt' }, sb.profile.prefs), LearningCloudConflictError);
  const base = b.getSnapshot().profile.prefs;
  await a.updatePreferences({ calibration: [{ topic: 'expectation', x: 1 }] }, base);
  await assert.rejects(b.updatePreferences({ calibration: [{ topic: 'probability', x: 0 }] }, base), LearningCloudConflictError);
});

test('lost-ACK sequence followed by another device append conflicts instead of duplicating evidence or notes', async () => {
  const f = fixture(), a = f.client(), b = f.client(), initial = await a.initialize(); await b.initialize();
  const observation = { topic: 'expectation', x: 1 }, second = { topic: 'probability', x: 0 };
  f.loseAck(); await assert.rejects(a.updatePreferences({ calibration: [observation] }, initial.profile.prefs), /lost/);
  const current = (await b.refresh()).profile.prefs;
  await b.updatePreferences({ calibration: [...current.calibration, second] }, current);
  await assert.rejects(a.updatePreferences({ calibration: [observation] }, initial.profile.prefs), LearningCloudConflictError);
  assert.equal(f.state('alice').data.training.prefs.calibration.length, 2);
  const base = normalizeProgress(), local = { ...base, notes: ['one'] }, remote = { ...base, notes: ['one', 'two'] };
  assert.throws(() => mergeLearnProgress(base, local, remote), LearningCloudConflictError);
});

test('migration lost-ACK retries recover exactly once when no conflicting field changed', async () => {
  const f = fixture(), storage = memory(); storage.setItem(learningStorageKey('alice'), JSON.stringify(complete(normalizeProgress())));
  let profile = createTrainingProfile({ now: now - 1, id: 'legacy-calibration' });
  profile = updateTrainingPreferences(profile, { calibration: [{ topic: 'expectation', x: 1 }] }, { now });
  storage.setItem(learningStorageKey('alice', 'training'), JSON.stringify(profile));
  f.loseAck(); await assert.rejects(f.client('alice', storage).initialize(), /lost/);
  const restored = await f.client('alice', storage).initialize();
  assert.equal(restored.learnProgress.xp, 20); assert.equal(restored.profile.prefs.calibration.length, 1);
});

test('invalid local backup is preserved, and fake successful save cannot mark migration complete', async () => {
  const f = fixture(), bad = memory(); bad.setItem(learningStorageKey('alice'), '{broken');
  await assert.rejects(f.client('alice', bad).initialize(), /JSON/); assert.equal(bad.getItem(learningStorageKey('alice')), '{broken');
  const storage = memory(); f.badAck(); await assert.rejects(f.client('alice', storage).initialize(), /未确认/);
  const marker = [...storage.values.entries()].find(([key]) => key.endsWith(':migration'));
  assert.equal(JSON.parse(marker[1]).complete, false);
});

test('migration with lost ACK cannot resurrect a completion subsequently undone on another device', async () => {
  const f = fixture(), storage = memory();
  storage.setItem(learningStorageKey('alice'), JSON.stringify(complete(normalizeProgress())));
  f.loseAck(); await assert.rejects(f.client('alice', storage).initialize(), /lost/);
  const b = f.client(), current = await b.initialize();
  await b.saveLearn(uncompleteLocalLesson(current.learnProgress, lessons[0]), current.learnProgress);
  await assert.rejects(f.client('alice', storage).initialize(), LearningCloudConflictError);
  assert.deepEqual(f.state('alice').data.learn.completed, []);
  assert.equal(f.state('alice').data.learn.xp, 20);
  assert.deepEqual(JSON.parse(storage.getItem(learningStorageKey('alice'))).completed, [lessons[0]]);
});

test('cloud disappearance and revision rollback never silently recreate empty records', async () => {
  const f = fixture(), storage = memory(), a = f.client('alice', storage); await a.initialize();
  f.records.delete('alice'); await assert.rejects(a.refresh(), /回退或缺失/);
  await assert.rejects(f.client('alice', storage).initialize(), /回退或缺失/);
  assert.equal(f.records.has('alice'), false);
});

test('sequential calls keep every independent event even with different clocks', async () => {
  const f = fixture(), a = f.client('alice', memory(), { now: () => now + 100000 }), b = f.client();
  await a.initialize(); await b.initialize();
  const results = await Promise.all([b.submitAttempt(problem, { eventId: 'clock-one', x: 1 }), b.submitAttempt(secondProblem, { eventId: 'clock-two', x: 0 })]);
  assert.equal(results.length, 2); const profile = f.state('alice').data.training;
  assert.equal(profile.events.length, 2); assert.equal(profile.events[0].at, now + 100000);
});
