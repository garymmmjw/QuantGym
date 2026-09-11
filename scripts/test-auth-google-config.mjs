import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuth, loadAuth } from '../src/state/auth.js';

const deployedId = 'deployed-fixture.apps.googleusercontent.com';
const options = { defaultGoogleClientId: deployedId };

test('new browser uses the deployed Google client ID', () => {
  assert.equal(normalizeAuth({}, options).googleClientId, deployedId);
});

test('historically saved empty ID adopts the deployed Google client ID', () => {
  assert.equal(normalizeAuth({ googleClientId: '' }, options).googleClientId, deployedId);
});

test('historically saved whitespace ID adopts the deployed Google client ID', () => {
  assert.equal(normalizeAuth({ googleClientId: ' \n\t ' }, options).googleClientId, deployedId);
});

test('nonempty saved override retains precedence and is trimmed', () => {
  const savedId = 'custom-fixture.apps.googleusercontent.com';
  assert.equal(normalizeAuth({ googleClientId: ` ${savedId} ` }, options).googleClientId, savedId);
});

test('missing deployment ID does not invent an enabled Google configuration', () => {
  for (const raw of [{}, { googleClientId: '' }, { googleClientId: '  ' }]) {
    assert.equal(normalizeAuth(raw).googleClientId, '');
  }
});

test('loading an old empty-ID profile keeps its account and session intact without writing storage', () => {
  const previousStorage = globalThis.localStorage;
  const account = { id: 'local:fixture', email: 'fixture@example.test', provider: 'local' };
  const saved = { accounts: [account], currentUserId: account.id, googleClientId: '', lastAuthenticatedAt: '2026-09-01T12:00:00Z' };
  const calls = [];
  globalThis.localStorage = {
    getItem(key) { calls.push(['read', key]); return JSON.stringify(saved); },
    setItem() { throw new Error('Normalization must not write storage'); }
  };
  try {
    const loaded = loadAuth('fixture.auth', options);
    assert.equal(loaded.googleClientId, deployedId);
    assert.deepEqual(loaded.accounts, [account]);
    assert.equal(loaded.currentUserId, account.id);
    assert.equal(loaded.lastAuthenticatedAt, saved.lastAuthenticatedAt);
    assert.deepEqual(calls, [['read', 'fixture.auth']]);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
