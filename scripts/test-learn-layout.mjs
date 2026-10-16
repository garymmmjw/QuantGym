import test from 'node:test';
import assert from 'node:assert/strict';
import { learnFrameHeight, learnScrollTarget } from '../src/features/learning/learnLayout.mjs';

test('frame accepts natural growth and shrinking but rejects invalid resize payloads', () => {
  assert.equal(learnFrameHeight(18000), 18000);
  assert.equal(learnFrameHeight(602.5), 603);
  for (const value of [NaN, Infinity, -1, 0, '800', 250001]) assert.equal(learnFrameHeight(value), null);
});

test('topic and slide targets scroll the host with its sticky header and mobile navigation accounted for', () => {
  const view = { frameTop: -1600, pageY: 2000, viewportHeight: 800, topInset: 62, bottomInset: 76 };
  assert.equal(learnScrollTarget(view, { top: 2400 }), 2726);
  assert.equal(learnScrollTarget(view, { top: 1650, onlyIfAbove: true }), 1976);
  assert.equal(learnScrollTarget(view, { top: 1700, onlyIfAbove: true }), null);
  assert.equal(learnScrollTarget(view, { top: 1800, bottom: 2100, block: 'nearest' }), null);
  assert.equal(learnScrollTarget(view, { top: 2200, bottom: 2400, block: 'nearest' }), 2088);
  assert.equal(learnScrollTarget(view, { top: NaN }), null);
});
