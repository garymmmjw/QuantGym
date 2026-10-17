import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningStateApi } from '../src/features/learning/learningStateApi.mjs';
import { createCloudLearnProgressWriter } from '../src/features/learning/learnProgressWriter.mjs';
import { getCloudSessionStatus } from '../src/state/cloudSessionStatus.js';

const credentials = { userId: 'learning-user', token: 'test-only-session', baseUrl: 'https://example.invalid/api' };
const envelope = { version: 1, revision: 3, data: { learn: null, training: null }, updatedAt: '2026-10-16T00:00:00Z' };
test('real learning transport scopes GET/PUT to captured credentials and exposes CAS envelope', async () => {
  const calls = [];
  const api = createLearningStateApi({ ...credentials, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(envelope), { status: options.method === 'GET' ? 200 : 409 });
  } });
  assert.deepEqual(await api.load(), envelope);
  const body = { version: 1, baseRevision: 1, data: envelope.data };
  assert.equal((await api.save(body)).status, 409);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.url, 'https://example.invalid/api/learning/state');
    assert.equal(call.options.headers.Authorization, 'Bearer test-only-session');
    assert.equal(call.options.cache, 'no-store');
    assert.equal(call.options.credentials, 'omit');
  }
  assert.deepEqual(JSON.parse(calls[1].options.body), body);
});
test('late response after account change is discarded and cannot invalidate the new session', async () => {
  let active = true;
  const api = createLearningStateApi({ ...credentials, isActive: () => active, fetchImpl: async () => {
    active = false;
    return new Response('{}', { status: 401 });
  } });
  await assert.rejects(api.load(), error => error.name === 'AbortError');
  assert.notEqual(getCloudSessionStatus({ ...credentials, endpoint: credentials.baseUrl }).phase, 'expired');
});
test('401 from the active session reaches the existing account reauthentication state', async () => {
  const api = createLearningStateApi({ ...credentials, token: 'expired-test-session', fetchImpl: async () => new Response('{}', { status: 401 }) });
  await assert.rejects(api.load(), error => error.status === 401);
  assert.equal(getCloudSessionStatus({ ...credentials, token: 'expired-test-session', endpoint: credentials.baseUrl }).phase, 'expired');
});
test('cloud writer queues durable saves and uses prior input instead of invisible merged fields', async () => {
  const bases = [], initial = { completed: [] }, first = { completed: ['one'] }, second = { completed: ['one', 'two'] };
  const writer = createCloudLearnProgressWriter({ initialProgress: initial, isActive: () => true,
    save: async (input, baseline) => { bases.push(structuredClone(baseline)); return { status: 'saved', progress: { ...input, fromOtherDevice: true } }; } });
  const a = writer.submit(first), b = writer.submit(second);
  assert.equal(writer.hasPending(), true);
  await Promise.all([a, b]); await writer.flush();
  assert.deepEqual(bases, [initial, first]);
  assert.equal(writer.hasPending(), false);
});
test('failed cloud save prevents navigation flush until an explicit retry is acknowledged', async () => {
  let fail = true;
  const writer = createCloudLearnProgressWriter({ initialProgress: {}, isActive: () => true,
    save: async input => { if (fail) throw Error('offline'); return { status: 'saved', progress: input }; } });
  await assert.rejects(writer.submit({ lesson: 1 }), /offline/);
  await assert.rejects(writer.flush(), /offline/);
  fail = false;
  assert.equal((await writer.submit({ lesson: 1 })).status, 'saved');
  await writer.flush();
});
