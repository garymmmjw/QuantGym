import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeetCodeClient } from '../src/features/leetcode/leetcodeClient.js';
import { EMPTY_LEETCODE } from '../src/features/leetcode/leetcodeModel.js';

const connection = { username: 'fixture-user', linkedAt: '2026-09-10T00:00:00.000Z' };
const card = { problemSlug: 'two-sum', drawnAt: '2026-09-20T12:00:00.000Z', baselineCompletedAt: '2026-09-19T11:00:00.000Z' };
const command = { ...connection, problemSlug: 'two-sum', eventId: 'a03e75f4-085f-4cf5-b681-30f48bf00ec0' };
const response = (reviewBackpack = []) => ({ ...EMPTY_LEETCODE, connection, problems: [{ slug: 'two-sum' }], reviewBackpack });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clientFor = fetchImpl => createLeetCodeClient({ endpoint: 'https://fixture.test/api', userId: 'owner', token: 'fixture-token', fetchImpl });

test('a drawn card becomes visible only after the bound server save succeeds', async () => {
  const requests = [];
  let release;
  const client = clientFor(async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/backpack')) await new Promise(resolve => { release = resolve; });
    return json(response(url.endsWith('/backpack') ? [card] : []));
  });
  await client.reload();
  const pending = client.addReviewCard(command);
  assert.equal(client.getSnapshot().phase, 'backpacking');
  assert.deepEqual(client.getSnapshot().data.reviewBackpack, []);
  assert.equal(requests.at(-1).url, 'https://fixture.test/api/leetcode/backpack');
  assert.equal(requests.at(-1).options.method, 'POST');
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer fixture-token');
  assert.deepEqual(JSON.parse(requests.at(-1).options.body), command);
  release();
  const result = await pending;
  assert.equal(result.error, null);
  assert.deepEqual(result.data.reviewBackpack, [card]);
  assert.equal(client.getSnapshot().phase, 'ready');
});

test('reload and fresh clients read the server backpack without sharing another account cache', async () => {
  let saved = [];
  const fetchImpl = async (url, options) => {
    if (options.headers.Authorization === 'Bearer second-token') return json({ ...response(), connection: { ...connection, username: 'second-user' } });
    if (url.endsWith('/backpack')) saved = [card];
    return json(response(saved));
  };
  const first = clientFor(fetchImpl);
  await first.reload();
  await first.addReviewCard(command);
  const refreshed = clientFor(fetchImpl);
  assert.deepEqual(refreshed.getSnapshot().data.reviewBackpack, []);
  await refreshed.reload();
  assert.deepEqual(refreshed.getSnapshot().data.reviewBackpack, [card]);
  const other = createLeetCodeClient({ endpoint: 'https://fixture.test/api', userId: 'other-owner', token: 'second-token', fetchImpl });
  await other.reload();
  assert.deepEqual(other.getSnapshot().data.reviewBackpack, []);
  assert.deepEqual(first.getSnapshot().data.reviewBackpack, [card]);
});

test('failed saves retain acknowledged cards and can retry the same event without rewriting its identity', async () => {
  let failure = true;
  const writes = [];
  const client = clientFor(async (url, options) => {
    if (url.endsWith('/backpack')) {
      writes.push(JSON.parse(options.body));
      if (failure) return json({ error: 'temporarily_unavailable' }, 503);
    }
    return json(response([card]));
  });
  await client.reload();
  const before = client.getSnapshot().data;
  const failed = await client.addReviewCard(command);
  assert.equal(failed.data, null);
  assert.equal(failed.error.status, 503);
  assert.equal(client.getSnapshot().data, before);
  failure = false;
  const saved = await client.addReviewCard(command);
  assert.equal(saved.error, null);
  assert.deepEqual(saved.data.reviewBackpack, [card]);
  assert.deepEqual(writes, [command, command]);
});

test('a replay may acknowledge a card that has already been completed without resurrecting it', async () => {
  const client = clientFor(async url => json(response(url.endsWith('/backpack') ? [] : [card])));
  await client.reload();
  const result = await client.addReviewCard(command);
  assert.equal(result.error, null);
  assert.deepEqual(result.data.reviewBackpack, []);
});

test('wrong-account, stale-link and unacknowledged saves cannot replace the loaded backpack', async () => {
  const legacy = response(); delete legacy.reviewBackpack;
  for (const bad of [legacy, { ...response(), connection: { ...connection, username: 'foreign' } },
    { ...response(), connection: { ...connection, linkedAt: '2026-09-20T00:00:00.000Z' } }, { ...response(), connection: null }]) {
    const client = clientFor(async url => json(url.endsWith('/backpack') ? bad : response([card])));
    await client.reload();
    const previous = client.getSnapshot().data;
    const result = await client.addReviewCard(command);
    assert.equal(result.data, null);
    assert.match(result.error.message, /invalid_backpack_response/);
    assert.equal(client.getSnapshot().data, previous);
  }
});

test('old API reads default to an empty backpack; valid entries are normalized and disconnect clears them', async () => {
  let payload = response(); delete payload.reviewBackpack;
  const client = clientFor(async () => json(payload));
  await client.reload();
  assert.deepEqual(client.getSnapshot().data.reviewBackpack, []);
  payload = response([{ ...card, extra: 'not-forwarded' }, { problemSlug: 'unknown-date', drawnAt: card.drawnAt, baselineCompletedAt: null }]);
  await client.reload();
  assert.deepEqual(client.getSnapshot().data.reviewBackpack, [card, { problemSlug: 'unknown-date', drawnAt: card.drawnAt, baselineCompletedAt: null }]);
  payload = { ...EMPTY_LEETCODE, reviewBackpack: [card] };
  await client.disconnect();
  assert.deepEqual(client.getSnapshot().data.reviewBackpack, []);
});

test('invalid backpack records preserve the last good snapshot instead of inventing pending dates', async () => {
  let payload = response([card]);
  const client = clientFor(async () => json(payload));
  await client.reload();
  const previous = client.getSnapshot().data;
  for (const invalid of [null, {}, [card, card], [{ ...card, problemSlug: '../bad' }],
    [{ ...card, drawnAt: '2026-02-30T12:00:00Z' }], [{ ...card, drawnAt: '2026-09-20' }],
    [{ ...card, baselineCompletedAt: undefined }], [{ ...card, baselineCompletedAt: 'not-a-time' }],
    [{ ...card, baselineCompletedAt: '2026-09-20T12:00:00.001Z' }]]) {
    payload = response(invalid);
    assert.equal(await client.reload(), null);
    assert.equal(client.getSnapshot().data, previous);
    assert.equal(client.getSnapshot().error.message, 'invalid_response');
  }
});

test('draw requests wait for an in-flight read and serialize concurrent saves', async () => {
  const requests = [];
  let releaseRead, releaseFirst;
  const secondCard = { ...card, problemSlug: 'binary-search' };
  const secondCommand = { ...command, problemSlug: secondCard.problemSlug, eventId: '4370a7d8-a36c-4153-8d44-0ebd0daacb37' };
  const client = clientFor(async (url, options) => {
    requests.push({ url, body: options.body && JSON.parse(options.body) });
    if (options.method === 'GET') {
      await new Promise(resolve => { releaseRead = resolve; });
      return json(response());
    }
    if (JSON.parse(options.body).problemSlug === card.problemSlug) {
      await new Promise(resolve => { releaseFirst = resolve; });
      return json(response([card]));
    }
    return json(response([card, secondCard]));
  });
  const read = client.reload();
  const first = client.addReviewCard(command);
  const second = client.addReviewCard(secondCommand);
  assert.equal(requests.length, 1);
  releaseRead(); await read; await Promise.resolve();
  assert.equal(requests.length, 2);
  releaseFirst();
  assert.equal((await first).error, null);
  assert.equal((await second).error, null);
  assert.deepEqual(requests.slice(1).map(request => request.body), [command, secondCommand]);
  assert.deepEqual(client.getSnapshot().data.reviewBackpack, [card, secondCard]);
});
