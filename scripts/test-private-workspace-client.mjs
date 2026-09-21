import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperienceShareController } from '../src/modules/experiences/shareController.js';
import { publishExperienceRecord } from '../src/modules/experiences/share.js';
import { problemNoteStorageKey } from '../src/features/problems/problemNotes.js';
import { PRIVATE_WORKSPACES } from '../src/modules/privacyPolicy.js';

test('private experience publication is refused before loading or mutating community data', () => {
  assert.equal(PRIVATE_WORKSPACES, true);
  const calls = [];
  const deps = Object.fromEntries(['getRecords', 'loadCommunity', 'getCommunity', 'setCommunity', 'getCurrentUser', 'setRecords',
    'saveCommunity', 'saveState', 'setCommunityFilter', 'renderExperiences', 'switchModule', 'renderCommunity']
    .map(name => [name, () => { calls.push(name); throw new Error(`Unexpected private-data access: ${name}`); }]));
  const controller = createExperienceShareController(deps);
  assert.deepEqual(controller.publish('own-record'), { ok: false, code: 'privateWorkspace', message: '面经仅对本人可见，无法分享到社群。' });
  assert.deepEqual(calls, []);
});

test('direct legacy publication cannot construct a public copy or alter historical sharing metadata', () => {
  const record = Object.freeze({ id: 'own-record', summary: 'Private interview notes', sharedPostId: 'old-public-post', sharedAt: '2026-09-01' });
  const records = Object.freeze([record]);
  const community = Object.freeze({ posts: Object.freeze([{ id: 'old-public-post', text: 'Historical post' }]) });
  const result = publishExperienceRecord({ records, recordId: record.id, community, currentUser: { id: 'owner' } });
  assert.deepEqual(result, { ok: false, code: 'privateWorkspace' });
  assert.equal(records[0], record);
  assert.equal(record.sharedPostId, 'old-public-post');
  assert.equal(community.posts[0].text, 'Historical post');
});

test('late legacy community callbacks preserve the owner’s saved experience records', () => {
  const records = [{ id: 'own-record', summary: 'Private interview notes', sharedPostId: 'old-public-post' }];
  const controller = createExperienceShareController({ getRecords: () => records,
    setRecords() { throw new Error('Historical metadata must not be rewritten.'); },
    saveState() { throw new Error('Late community callbacks must not persist a different account.'); } });
  assert.equal(controller.clearForPost('old-public-post'), records);
  assert.equal(records[0].sharedPostId, 'old-public-post');
});


test('problem note keys require an account and keep identical problem IDs separate for A and B', () => {
  const problemId = 'technical:question / 1';
  const alice = problemNoteStorageKey('alice', problemId);
  const bob = problemNoteStorageKey('bob', problemId);
  assert.notEqual(alice, bob);
  assert.equal(alice, 'quantgym.problemNote.v2:alice:technical%3Aquestion%20%2F%201');
  assert.equal(problemNoteStorageKey('alice:bob', 'question'), 'quantgym.problemNote.v2:alice%3Abob:question');
  for (const ownerId of [undefined, null, '', 'guest', 0]) assert.equal(problemNoteStorageKey(ownerId, problemId), '');
  assert.equal(problemNoteStorageKey('alice', ''), '');
});

test('account note lookup never claims an unowned legacy note or another account’s note', () => {
  const legacyKey = 'quantgym.problemNote.fixture-problem';
  const saved = new Map([[legacyKey, 'Unowned older draft'], [problemNoteStorageKey('alice', 'fixture-problem'), 'Alice private draft']]);
  const reads = [];
  const storage = { getItem(key) { reads.push(key); return saved.get(key) || ''; } };
  const aliceKey = problemNoteStorageKey('alice', 'fixture-problem');
  const bobKey = problemNoteStorageKey('bob', 'fixture-problem');
  assert.equal(storage.getItem(aliceKey), 'Alice private draft');
  assert.equal(storage.getItem(bobKey), '');
  assert.equal(reads.includes(legacyKey), false);
  assert.equal(saved.get(legacyKey), 'Unowned older draft');
  assert.equal(saved.size, 2);
});
