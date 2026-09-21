import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPrivateImage, privateMediaRequest } from '../src/features/account/privateMedia.js';

const config = { endpoint: 'https://api.example.test/api', userId: 'alice', token: 'fixture-alice-token' };

test('only the current account sends credentials to its configured media endpoint', async () => {
  let calls = 0;
  const result = await fetchPrivateImage('https://api.example.test/api/media/file-1', config, 'alice', {
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.example.test/api/media/file-1');
      assert.equal(options.headers.Authorization, 'Bearer fixture-alice-token');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.redirect, 'error');
      return { ok: true, blob: async () => new Blob(['fixture'], { type: 'image/png' }) };
    }
  });
  assert.equal(result.blob.type, 'image/png');
  const blocked = await fetchPrivateImage('https://api.example.test/api/media/file-1', config, 'bob', {
    fetchImpl: async () => { throw new Error('Wrong owner must not send a request'); }
  });
  assert.deepEqual(blocked, { source: '' });
  assert.equal(calls, 1);
});

test('external avatars and lookalike paths never receive account credentials', async () => {
  for (const source of ['https://api.example.test/api/media-mirror/file-1', '/assets/avatar.png', 'data:image/png;base64,AA==']) {
    assert.equal(privateMediaRequest(source, config, 'alice'), null);
    assert.deepEqual(await fetchPrivateImage(source, config, 'alice', {
      fetchImpl: async () => { throw new Error('Do not send credentials'); }
    }), { source });
  }
});

test('missing or changed endpoints never make a private media URL public', async () => {
  for (const source of ['https://other.example/api/media/file-1', 'https://api.example.test.evil.test/api/media/file-1', '/api/media/file-1']) {
    assert.deepEqual(privateMediaRequest(source), { blocked: true });
  }
  assert.deepEqual(await fetchPrivateImage('https://old.example/api/media/file-1', config, 'alice', {
    fetchImpl: async () => { throw new Error('A stale endpoint must never receive credentials'); }
  }), { source: '' });
});

test('expired sessions and non-image responses cannot become image URLs', async () => {
  const source = 'https://api.example.test/api/media/file-1';
  assert.deepEqual(privateMediaRequest(source, { ...config, token: '' }, 'alice'), { blocked: true });
  await assert.rejects(fetchPrivateImage(source, config, 'alice', { fetchImpl: async () => ({ ok: false }) }));
  await assert.rejects(fetchPrivateImage(source, config, 'alice', { fetchImpl: async () => ({ ok: true, blob: async () => new Blob(['private document'], { type: 'text/html' }) }) }));
});
