import test from 'node:test';
import assert from 'node:assert/strict';
import { overviewActivityChartFailures } from './overview-activity-smoke-contract.mjs';

const chart = (month, mode, ranges, today = `${month}-15`) => ({
  month, mode, today, monthControl: month, modeControl: mode,
  metrics: [{ label: '活跃分', pressed: 'true' }, { label: '完成量', pressed: 'false' }],
  buckets: ranges.map(([first, last]) => {
    const start = `${month}-${String(first).padStart(2, '0')}`;
    return { start, end: `${month}-${String(last).padStart(2, '0')}`, disabled: start > today };
  }),
});

test('daily smoke contract requires every day of 28/29/30/31-day months', () => {
  for (const [month, length] of [['2026-02', 28], ['2024-02', 29], ['2026-04', 30], ['2026-01', 31]]) {
    const input = chart(month, 'day', Array.from({ length }, (_, index) => [index + 1, index + 1]));
    assert.deepEqual(overviewActivityChartFailures(input), []);
    input.buckets.pop();
    assert.ok(overviewActivityChartFailures(input).some(failure => failure.includes(`Expected ${length}`)));
  }
});

test('weekly smoke contract requires 4/5/6 Monday-based buckets clipped to the selected month', () => {
  for (const [month, ranges] of [
    ['2021-02', [[1, 7], [8, 14], [15, 21], [22, 28]]],
    ['2026-09', [[1, 6], [7, 13], [14, 20], [21, 27], [28, 30]]],
    ['2020-08', [[1, 2], [3, 9], [10, 16], [17, 23], [24, 30], [31, 31]]],
  ]) assert.deepEqual(overviewActivityChartFailures(chart(month, 'week', ranges)), []);
});

test('wrong dates, enabled future buckets and unsynchronized controls fail the contract', () => {
  const valid = chart('2026-09', 'week', [[1, 6], [7, 13], [14, 20], [21, 27], [28, 30]]);
  for (const mutate of [
    value => { value.buckets[0].start = '2026-08-31'; },
    value => { value.buckets[3].disabled = false; },
    value => { value.modeControl = 'day'; },
    value => { value.monthControl = '2026-08'; },
    value => { value.metrics[1].pressed = 'true'; },
    value => { value.month = '2026-13'; },
  ]) {
    const input = structuredClone(valid);
    mutate(input);
    assert.ok(overviewActivityChartFailures(input).length);
  }
});
