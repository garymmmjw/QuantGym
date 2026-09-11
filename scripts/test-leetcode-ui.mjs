import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_LEETCODE, prepareHistory } from '../src/features/leetcode/leetcodeModel.js';
import { createLeetCodeClient } from '../src/features/leetcode/leetcodeClient.js';

const problem = (slug, difficulty = 1, title = slug) => ({ slug, difficulty, title, titleEn: title, frontendId: '12' });
const history = () => ({ site: 'cn', username: 'fixture-user', problems: [problem('two-sum')], submissions: [{ id: 'submission-1', problemSlug: 'two-sum', title: 'Two Sum', submittedAt: '2026-09-11T01:00:00Z', status: 'AC' }] });
const connected = (username = 'fixture-user') => ({ ...EMPTY_LEETCODE, connection: { site: 'cn', username, profileUrl: `https://leetcode.cn/u/${username}/`, lastSyncedAt: new Date().toISOString() }, stats: { solved: 1, totalSubmissions: 3 }, problems: [problem('two-sum')], submissions: [] });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('history metadata rejects nested credential/code objects and malformed identities', () => {
  for (const [collection, field] of [['problems', 'title'], ['problems', 'titleEn'], ['submissions', 'frontendId'], ['submissions', 'submittedAt']]) {
    const input = history(); input[collection][0][field] = { cookie: 'nested-secret' };
    assert.throws(() => prepareHistory(input), /invalid_import/);
  }
  for (const field of ['username', 'site']) {
    const input = history(); input[field] = field === 'username' ? 'https://leetcode.cn/u/fixture-user/' : 'com';
    assert.throws(() => prepareHistory(input), /invalid_import/);
  }
});

test('history requires explicit accepted timestamped records and bounded row counts', () => {
  for (const overrides of [{ status: 'WA' }, { submittedAt: '2026-09-11' }, { submittedAt: '2026-09-11T01:00:00' }, { submittedAt: 'invalid' }, { submittedAt: '2026-02-30T12:00:00Z' }, { submittedAt: '2025-02-29T12:00:00Z' }, { id: '../invalid' }]) {
    const input = history(); Object.assign(input.submissions[0], overrides);
    assert.throws(() => prepareHistory(input), /invalid_import/);
  }
  assert.throws(() => prepareHistory({ ...history(), problems: [], submissions: [] }), /invalid_import/);
  assert.throws(() => prepareHistory({ ...history(), problems: Array(20000).fill(problem('two-sum')) }), /invalid_import/);
});

test('malformed responses never replace already loaded records', async () => {
  let malformed = false;
  const client = createLeetCodeClient({ endpoint: 'http://fixture.test/api', token: 'A', fetchImpl: async () => json(malformed ? { unexpected: true } : connected()) });
  await client.reload(); malformed = true; await client.reload();
  assert.equal(client.getSnapshot().data.connection.username, 'fixture-user');
  assert.equal(client.getSnapshot().phase, 'error');
});

test('history permits actual leap-day instants and preserves time-zone offset for calendar bucketing', () => {
  const input = history(); input.submissions[0].submittedAt = '2024-02-29T23:30:00-06:00';
  assert.equal(prepareHistory(input).submissions[0].submittedAt, '2024-02-29T23:30:00-06:00');
});
