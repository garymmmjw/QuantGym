import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateLegacyState } from '../src/state/persistence.js';
import { createUserStateRuntime } from '../src/state/userStateRuntime.js';
import { createProblemNoteStore, LEGACY_NOTE_PREFIX } from '../src/features/problems/problemNotes.js';
import { ownedStorageKey, getLocalRecovery, clearLocalRecovery, restoreLocalRecoveryBackup } from '../src/state/localRecovery.js';
import { createInterviewSessionLifecycleController } from '../src/modules/interview/sessionLifecycleController.js';
import { createInterviewResultsController } from '../src/modules/interview/resultsController.js';
import { createInterviewAnswerController } from '../src/modules/interview/answerController.js';
import { adoptLegacyInterviews, getRecoveredInterviews, INTERVIEW_LEGACY_KEYS } from '../src/modules/interview/legacyRecovery.js';
import { loadInterviewHistory, readInterviewSessionSnapshot, writeInterviewSessionSnapshot } from '../src/modules/interview/session.js';

class MemoryStorage {
  values = new Map(); fail = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail === true || this.fail === key) throw new Error('QuotaExceededError'); this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
function storages(t) {
  const original = { localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
  t.after(() => { Object.assign(globalThis, original); for (const item of getLocalRecovery()) clearLocalRecovery(item.ownerId, item.key); });
  return { local: globalThis.localStorage, session: globalThis.sessionStorage };
}
const freshSession = id => ({ id, phase: 'onboarding', completed: false, currentIndex: -1, questions: [], questionResults: [], sessionConfig: {} });
function interview(owner = 'A') {
  let ownerId = owner, listener, answerDraft = 'private unsent answer', resets = 0, clearedTimers = 0;
  const state = { language: 'zh', session: freshSession('session-A'), messages: [{ id: 'm1', role: 'user', text: 'private transcript' }] };
  const runtime = {};
  const controller = createInterviewSessionLifecycleController({
    storageKey: 'legacy-session', resumeStorageKey: 'legacy-resume', getOwnerId: () => ownerId,
    getInterviewState: () => state, getRuntimeState: () => runtime,
    getAnswerDraft: () => answerDraft, setAnswerDraft: text => { answerDraft = text; },
    subscribeOwner: callback => { listener = callback; return () => { listener = null; }; },
    clearTimers: () => { clearedTimers += 1; }, windowRef: { confirm: () => true },
    resetInterview: () => { resets += 1; state.session = null; state.messages = []; },
  });
  return { state, controller, get ownerId() { return ownerId; }, get answerDraft() { return answerDraft; }, get resets() { return resets; }, get clearedTimers() { return clearedTimers; }, switchOwner(next) { ownerId = next; listener?.(); } };
}

test('legacy migration write failure preserves the exact original and reports failure', t => {
  const { local } = storages(t);
  const raw = '{"ownerId":"A","entries":[{"id":"one"}]}';
  local.setItem('legacy', raw); local.fail = 'user-A';
  const result = migrateLegacyState('A', { legacyKey: 'legacy', userStateKey: id => `user-${id}` });
  assert.equal(result.ok, false);
  assert.equal(local.getItem('legacy'), raw);
  assert.equal(local.getItem('user-A'), null);
});

test('valid owned migration verifies new storage and keeps its original recovery source', t => {
  const { local } = storages(t);
  const raw = '{"ownerId":"A","entries":[1]}';
  local.setItem('legacy', raw);
  assert.equal(migrateLegacyState('A', { legacyKey: 'legacy', userStateKey: id => `user-${id}` }).ok, true);
  assert.equal(local.getItem('legacy'), raw);
  assert.deepEqual(JSON.parse(local.getItem('user-A')).entries, [1]);
});

test('unowned and corrupt legacy records never get silently assigned or deleted on login', t => {
  const { local } = storages(t);
  for (const raw of ['{"entries":["unknown owner"]}', '{invalid']) {
    local.setItem('legacy', raw);
    assert.equal(migrateLegacyState('B', { legacyKey: 'legacy', userStateKey: id => `user-${id}` }).ok, false);
    assert.equal(local.getItem('legacy'), raw);
    assert.equal(local.getItem('user-B'), null);
  }
});

test('normal state write failure returns false and restores only that owner’s working copy after switching', t => {
  storages(t);
  let owner = { id: 'runtime-A' }, failed = true;
  const runtime = createUserStateRuntime({ entries: [{ id: 'unsaved' }] }, {
    getCurrentUser: () => owner, writeUserState: () => !failed,
    loadUserState: () => ({ entries: [] }), createBaseState: () => ({ entries: [] }),
  });
  assert.equal(runtime.save(), false);
  assert.equal(getLocalRecovery().find(item => item.ownerId === owner.id)?.key, 'user-state');
  owner = { id: 'runtime-B' }; runtime.loadCurrent();
  assert.deepEqual(runtime.state.value.entries, []);
  owner = { id: 'runtime-A' }; runtime.loadCurrent();
  assert.deepEqual(runtime.state.value.entries, [{ id: 'unsaved' }]);
  failed = false;
  assert.equal(runtime.save(), true);
  assert.equal(getLocalRecovery().some(item => item.ownerId === owner.id), false);
});

test('same problem notes are separated by account; unowned legacy note stays hidden and intact', t => {
  const { local } = storages(t);
  local.setItem(`${LEGACY_NOTE_PREFIX}note-isolation`, 'old private note');
  const a = createProblemNoteStore({ ownerId: 'note-A', problemId: 'note-isolation', storage: local });
  const b = createProblemNoteStore({ ownerId: 'note-B', problemId: 'note-isolation', storage: local });
  assert.equal(a.get().value, ''); assert.equal(b.get().value, '');
  assert.equal(a.get().legacyAvailable, true);
  assert.equal(a.save('A answer'), true); assert.equal(b.save('B answer'), true);
  assert.equal(createProblemNoteStore({ ownerId: 'note-A', problemId: 'note-isolation', storage: local }).get().value, 'A answer');
  assert.equal(JSON.parse(local.getItem(b.key)).text, 'B answer');
  assert.equal(local.getItem(`${LEGACY_NOTE_PREFIX}note-isolation`), 'old private note');
});

test('failed note save retains current text across reopening and preserves the prior durable copy', t => {
  const { local } = storages(t);
  const options = { ownerId: 'note-quota-A', problemId: 'note-quota', storage: local };
  const note = createProblemNoteStore(options);
  note.save('saved'); local.fail = true;
  assert.equal(note.save('new unsaved text'), false);
  assert.equal(createProblemNoteStore(options).get().value, 'new unsaved text');
  assert.equal(JSON.parse(local.getItem(note.key)).text, 'saved');
  local.fail = false;
  const recovery = getLocalRecovery().find(item => item.ownerId === options.ownerId);
  assert.equal(recovery.backup.text, 'new unsaved text');
  assert.equal(recovery.retry(), true);
  assert.equal(JSON.parse(local.getItem(note.key)).text, 'new unsaved text');
});

test('malformed owned note is preserved rather than overwritten by a new edit', t => {
  const { local } = storages(t);
  const key = ownedStorageKey(`${LEGACY_NOTE_PREFIX}note-corrupt`, 'note-corrupt-A');
  local.setItem(key, '{invalid');
  const note = createProblemNoteStore({ ownerId: 'note-corrupt-A', problemId: 'note-corrupt', storage: local });
  assert.equal(note.save('replacement draft'), false);
  assert.equal(local.getItem(key), '{invalid');
  assert.equal(note.get().value, 'replacement draft');
});

test('choosing keep-and-exit on quota failure does not reset live interview or destroy the old snapshot', t => {
  const { local, session } = storages(t);
  const value = interview('exit-A');
  value.controller.persistSnapshot();
  const previous = local.getItem(ownedStorageKey('legacy-resume', 'exit-A'));
  value.state.messages.push({ id: 'new', role: 'user', text: 'latest answer' });
  local.fail = true;
  assert.equal(value.controller.exit(), false);
  assert.equal(value.resets, 0);
  assert.equal(value.state.messages.at(-1).text, 'latest answer');
  assert.equal(local.getItem(ownedStorageKey('legacy-resume', 'exit-A')), previous);
  assert.match(session.getItem(ownedStorageKey('legacy-session', 'exit-A')), /latest answer/);
  local.fail = false;
  assert.equal(value.controller.exit(), true);
  assert.equal(value.resets, 1);
  assert.match(local.getItem(ownedStorageKey('legacy-resume', 'exit-A')), /latest answer/);
});

test('account switch clears active transcript, input and timers; each account resumes only its own draft', t => {
  storages(t);
  const value = interview('switch-A');
  value.controller.persistSnapshot();
  value.switchOwner('switch-B');
  assert.equal(value.state.session, null); assert.deepEqual(value.state.messages, []);
  assert.equal(value.answerDraft, ''); assert.ok(value.clearedTimers > 0);
  assert.equal(value.controller.hasDurable(), false);
  assert.equal(value.controller.restoreSnapshot(), false);
  value.state.session = freshSession('session-B');
  value.state.messages = [{ role: 'user', text: 'B answer' }];
  value.controller.persistSnapshot();
  value.switchOwner('switch-A');
  assert.equal(value.controller.resumeDurable(), true);
  assert.equal(value.state.messages[0].text, 'private transcript');
  assert.equal(value.answerDraft, 'private unsent answer');
});

test('failed owner-switch save remains recoverable only by its owner in the same tab', t => {
  const { local, session } = storages(t);
  const value = interview('switch-quota-A');
  local.fail = true; session.fail = true;
  value.switchOwner('switch-quota-B');
  assert.equal(value.state.session, null);
  assert.equal(value.controller.hasDurable(), false);
  assert.equal(getLocalRecovery().filter(item => item.ownerId === 'switch-quota-B').length, 0);
  value.switchOwner('switch-quota-A');
  assert.equal(value.controller.resumeDurable(), true);
  assert.equal(value.state.messages[0].text, 'private transcript');
});

test('global and mismatched-owner interviews cannot be restored; raw copies stay untouched', t => {
  const { local, session } = storages(t);
  const raw = JSON.stringify({ ownerId: 'other-owner', session: freshSession('old'), messages: [{ text: 'old secret' }] });
  local.setItem('legacy-resume', raw); session.setItem('legacy-session', raw);
  local.setItem(ownedStorageKey('legacy-resume', 'restore-B'), raw);
  const value = interview('restore-B'); value.state.session = null; value.state.messages = [];
  assert.equal(value.controller.restoreSnapshot(), false);
  assert.equal(value.controller.hasDurable(), false);
  assert.equal(local.getItem('legacy-resume'), raw);
  assert.equal(session.getItem('legacy-session'), raw);
});

test('failed session snapshot write and corrupt read preserve their existing source', t => {
  const { session } = storages(t);
  const raw = JSON.stringify({ ownerId: 'A', session: freshSession('old') });
  session.setItem('key', raw); session.fail = true;
  assert.equal(writeInterviewSessionSnapshot('key', { ownerId: 'A', session: freshSession('new') }), false);
  assert.equal(session.getItem('key'), raw);
  session.fail = false; session.setItem('key', '{bad');
  assert.equal(readInterviewSessionSnapshot('key'), null);
  assert.equal(session.getItem('key'), '{bad');
});

test('history save failure keeps finished session and recovery entry, then retry saves exactly once', t => {
  const { local } = storages(t);
  const ownerId = 'history-A', historyKey = ownedStorageKey('history', ownerId);
  const state = { language: 'zh', session: { ...freshSession('finished'), questionResults: [{ score: 85 }], questions: [{ id: 'q1' }] }, messages: [] };
  let persisted = 0;
  const controller = createInterviewResultsController({
    getOwnerId: () => ownerId, getInterviewState: () => state, historyStorageKey: historyKey,
    sessionStorageKey: ownedStorageKey('session', ownerId), formatCategory: value => value || 'technical',
    appendMessage: (role, text) => state.messages.push({ role, text }), persistSnapshot: () => { persisted += 1; },
  });
  local.fail = historyKey;
  controller.complete();
  assert.equal(state.session.completed, true);
  assert.equal(state.session.historyPending, true);
  assert.ok(persisted > 0);
  const recovery = getLocalRecovery().find(item => item.ownerId === ownerId && item.key === 'interview-history');
  assert.ok(recovery); assert.equal(recovery.backup.id, 'finished');
  local.fail = false;
  assert.equal(recovery.retry(), true); assert.equal(recovery.retry(), true);
  assert.equal(state.session.historyPending, false);
  assert.equal(loadInterviewHistory(historyKey).length, 1);
  assert.equal(loadInterviewHistory(ownedStorageKey('history', 'history-B')).length, 0);
});

test('feedback arriving after account switch does not modify the new account session or practice history', async t => {
  storages(t);
  let finish, ownerId = 'request-A', records = 0;
  const response = new Promise(resolve => { finish = resolve; });
  const state = { language: 'zh', session: { ...freshSession('request-session-A'), currentIndex: 0, questions: [{ id: 'q' }] }, messages: [] };
  const controller = createInterviewAnswerController({
    getOwnerId: () => ownerId, getInterviewState: () => state,
    requestFeedback: () => response, normalizeFeedback: value => ({ text: value }),
    appendMessage: (role, text) => state.messages.push({ role, text }), recordPractice: () => { records += 1; },
  });
  const request = controller.submitPractice({ id: 'q' }, { text: 'A private answer' });
  ownerId = 'request-B'; state.session = freshSession('request-session-B'); state.messages = [];
  finish('A private feedback'); await request;
  assert.equal(records, 0);
  assert.deepEqual(state.messages, []);
  assert.equal(state.session.answeredCurrent, undefined);
});

test('legacy note adoption requires an explicit choice and appends once without deleting either source', t => {
  const { local } = storages(t);
  const problemId = 'note-adoption';
  local.setItem(`${LEGACY_NOTE_PREFIX}${problemId}`, 'my old note');
  const note = createProblemNoteStore({ ownerId: 'adopt-note-A', problemId, storage: local });
  note.save('my current note');
  assert.equal(note.adoptLegacy(), false);
  assert.equal(note.get().value, 'my current note');
  assert.equal(note.adoptLegacy(true), true);
  assert.match(note.get().value, /my current note/); assert.match(note.get().value, /my old note/);
  const adopted = note.get().value;
  note.adoptLegacy(true);
  assert.equal(note.get().value, adopted);
  assert.equal(local.getItem(`${LEGACY_NOTE_PREFIX}${problemId}`), 'my old note');
});

test('explicit legacy interview adoption merges histories and archives drafts without changing current progress or raw sources', t => {
  const { local, session } = storages(t);
  const ownerId = 'adopt-interview-A';
  const oldRaw = JSON.stringify({ session: freshSession('old-draft'), messages: [{ text: 'old owned answer' }] });
  const oldHistory = JSON.stringify([{ average: 75, date: '2026-01-01' }]);
  local.setItem(INTERVIEW_LEGACY_KEYS.history, oldHistory);
  session.setItem(INTERVIEW_LEGACY_KEYS.session, oldRaw);
  const currentKey = ownedStorageKey(INTERVIEW_LEGACY_KEYS.durable, ownerId);
  const currentRaw = JSON.stringify({ ownerId, session: freshSession('current') });
  local.setItem(currentKey, currentRaw);
  const historyKey = ownedStorageKey(INTERVIEW_LEGACY_KEYS.history, ownerId);
  local.setItem(historyKey, JSON.stringify([{ id: 'recent', ownerId, average: 90 }]));
  assert.equal(adoptLegacyInterviews({ ownerId }).ok, false);
  assert.equal(getRecoveredInterviews(ownerId).length, 0);
  assert.equal(adoptLegacyInterviews({ ownerId, confirmed: true }).ok, true);
  assert.equal(adoptLegacyInterviews({ ownerId, confirmed: true }).ok, true);
  assert.equal(loadInterviewHistory(historyKey).length, 2);
  assert.equal(getRecoveredInterviews(ownerId).length, 1);
  assert.equal(getRecoveredInterviews('someone-else').length, 0);
  assert.equal(local.getItem(currentKey), currentRaw);
  assert.equal(local.getItem(INTERVIEW_LEGACY_KEYS.history), oldHistory);
  assert.equal(session.getItem(INTERVIEW_LEGACY_KEYS.session), oldRaw);
});

test('failed adoption keeps legacy data intact and does not replace the current account draft', t => {
  const { local } = storages(t);
  const raw = JSON.stringify({ session: freshSession('old') });
  local.setItem(INTERVIEW_LEGACY_KEYS.durable, raw); local.fail = true;
  assert.equal(adoptLegacyInterviews({ ownerId: 'adoption-quota', confirmed: true }).ok, false);
  assert.equal(local.getItem(INTERVIEW_LEGACY_KEYS.durable), raw);
  assert.equal(getRecoveredInterviews('adoption-quota').length, 0);
});

test('opening a recovered interview first archives the current unsent draft and rejects other owners', t => {
  storages(t);
  const value = interview('open-recovery-A');
  const recovered = { ownerId: 'open-recovery-A', session: freshSession('recovered'), messages: [{ text: 'recovered answer' }], answerDraft: 'recovered unsent draft' };
  assert.equal(value.controller.openRecovered({ ...recovered, ownerId: 'other' }), false);
  assert.equal(value.controller.openRecovered(recovered), true);
  assert.equal(value.state.session.id, 'recovered');
  assert.equal(value.answerDraft, 'recovered unsent draft');
  const currentBackup = getRecoveredInterviews('open-recovery-A').find(item => item.session.id === 'session-A');
  assert.equal(currentBackup.answerDraft, 'private unsent answer');
  assert.equal(currentBackup.messages[0].text, 'private transcript');
});

test('same-owner recovery import appends notes, deduplicates history and archives the incoming draft', t => {
  const { local } = storages(t);
  const ownerId = 'file-owner-A';
  const noteKey = ownedStorageKey('quantgym.problemNote.file-problem', ownerId);
  local.setItem(noteKey, JSON.stringify({ ownerId, text: 'current text' }));
  const file = { type: 'quantgym-local-recovery', version: 1, ownerId, records: [
    { key: noteKey, backup: { ownerId, problemId: 'file-problem', text: 'backup text' } },
    { key: 'interview-history', backup: { ownerId, id: 'result1', average: 80 } },
    { key: 'interview-draft', backup: { ownerId, session: freshSession('imported'), messages: [], answerDraft: 'file draft' } },
  ] };
  assert.equal(restoreLocalRecoveryBackup(ownerId, file, local).ok, true);
  assert.equal(restoreLocalRecoveryBackup(ownerId, file, local).ok, true);
  assert.match(JSON.parse(local.getItem(noteKey)).text, /current text/);
  assert.equal(JSON.parse(local.getItem(noteKey)).text.split('backup text').length, 2);
  assert.equal(loadInterviewHistory(ownedStorageKey(INTERVIEW_LEGACY_KEYS.history, ownerId)).length, 1);
  assert.equal(getRecoveredInterviews(ownerId).length, 1);
});

test('recovery import rejects wrong accounts and arbitrary storage keys before writing anything', t => {
  const { local } = storages(t);
  const file = { type: 'quantgym-local-recovery', version: 1, ownerId: 'file-owner', records: [{ key: 'auth', backup: { currentUserId: 'bad' } }] };
  assert.equal(restoreLocalRecoveryBackup('another-owner', file, local).ok, false);
  assert.equal(restoreLocalRecoveryBackup('file-owner', file, local).ok, false);
  assert.equal(local.values.size, 0);
});

test('whole-state backup conflicts preserve the current state and report the unapplied backup', t => {
  const { local } = storages(t);
  const ownerId = 'file-state-owner';
  const key = `quantMemoryBoard.userState.v1.${ownerId}`;
  const current = JSON.stringify({ entries: [{ id: 'current' }] });
  local.setItem(key, current);
  const result = restoreLocalRecoveryBackup(ownerId, { type: 'quantgym-local-recovery', version: 1, ownerId, records: [{ key: 'user-state', backup: { entries: [{ id: 'backup' }] } }] }, local);
  assert.equal(result.ok, true); assert.equal(result.conflicts, 1);
  assert.equal(result.restored, 0); assert.equal(local.getItem(key), current);
});

test('a pending history save recreates visible recovery after reloading the durable completed session', t => {
  const { local } = storages(t);
  const ownerId = 'reload-pending-A';
  const historyKey = ownedStorageKey('history-reload', ownerId);
  const entry = { id: 'completed-before-reload', ownerId, average: 90 };
  const snapshot = { ownerId, session: { ...freshSession(entry.id), completed: true, historyPending: true, pendingHistoryEntry: entry }, messages: [] };
  const durableKey = ownedStorageKey('durable-reload', ownerId);
  local.setItem(durableKey, JSON.stringify(snapshot));
  local.fail = historyKey;
  const state = { session: null, messages: [], language: 'zh' };
  let results;
  const lifecycle = createInterviewSessionLifecycleController({
    storageKey: 'session-reload', resumeStorageKey: 'durable-reload',
    getOwnerId: () => ownerId, getInterviewState: () => state, getRuntimeState: () => ({}),
    retryPendingHistory: () => results.retryPendingHistory(), windowRef: {},
  });
  results = createInterviewResultsController({
    getOwnerId: () => ownerId, getInterviewState: () => state, historyStorageKey: historyKey,
    persistSnapshot: () => lifecycle.persistSnapshot(),
  });
  assert.equal(lifecycle.restoreSnapshot(), true);
  const recovery = getLocalRecovery().find(item => item.ownerId === ownerId && item.key === 'interview-history');
  assert.ok(recovery);
  local.fail = false;
  assert.equal(recovery.retry(), true);
  assert.equal(loadInterviewHistory(historyKey).length, 1);
  assert.equal(JSON.parse(local.getItem(durableKey)).session.historyPending, false);
});
