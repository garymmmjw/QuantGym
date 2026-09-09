import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createTrial, transitionTrial, mentalSettingsKey } from '../src/features/personal/mental/mentalEngine.js';
import { getAttemptHistory, formatAttemptSettings, exportAttemptHistoryCsv, formatCsvCell } from '../src/features/personal/mental/attemptHistory.js';

const start = Date.parse('2026-09-09T12:00:00Z');
const settings = { durationSeconds: 120, operations: ['add'], ranges: { add: { minA: 2, maxA: 12, minB: 2, maxB: 12 } } };
const largerRange = { ...settings, ranges: { add: { minA: 2, maxA: 999, minB: 2, maxB: 12 } } };
function active(id, at = start, score = 0, config = settings) {
  let trial = createTrial(config, { id, now: at, rng: () => .5 });
  for (let index = 1; index <= score; index += 1) trial = transitionTrial(trial, { type: 'input', value: String(trial.currentQuestion.answer) }, at + index * 10, () => .5);
  return trial;
}
function completed(id, at = start, score = 0, config = settings) {
  const trial = active(id, at, score, config);
  return transitionTrial(trial, { type: 'tick' }, Date.parse(trial.deadlineAt));
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

test('empty history has no fabricated points, settings or personal records', () => {
  const result = getAttemptHistory([], { currentSettings: settings });
  assert.deepEqual(result.points, []);
  assert.deepEqual(result.allPoints, []);
  assert.deepEqual(result.settingsOptions, []);
  assert.equal(result.totalCount, 0);
  assert.equal(result.filteredCount, 0);
  assert.equal(result.emptyReason, 'no-history');
  assert.equal(result.personalBests.bestCorrect, null);
  assert.equal(result.personalBests.trialCount, 0);
  assert.deepEqual(result.xDomain, [0, 1]);
  assert.equal(result.yMax, 1);
});

test('a single zero-score completed trial remains one point with a zero record and no invented mean', () => {
  const trial = completed('zero');
  const result = getAttemptHistory([trial], { currentSettings: settings });
  assert.equal(result.points.length, 1);
  assert.equal(result.points[0].score, 0);
  assert.equal(result.points[0].ordinal, 1);
  assert.equal(result.points[0].x, 1);
  assert.equal(result.points[0].meanMs, null);
  assert.equal(result.points[0].timestamp, start);
  assert.equal(result.points[0].trial, trial);
  assert.equal(result.personalBests.bestCorrect, 0);
  assert.deepEqual(result.xDomain, [1, 1]);
  assert.equal(result.emptyReason, null);
});

test('active and aborted trials never enter the curve, setting choices or personal records', () => {
  const ongoing = active('active', start, 200, largerRange);
  const aborted = transitionTrial(active('aborted', start, 150, largerRange), { type: 'abort' }, start + 3000);
  const result = getAttemptHistory([ongoing, aborted, completed('done', start, 3)], { currentSettings: settings });
  assert.deepEqual(result.points.map(point => [point.id, point.score]), [['done', 3]]);
  assert.equal(result.totalCount, 1);
  assert.equal(result.personalBests.bestCorrect, 3);
  assert.equal(result.settingsOptions.length, 1);
});

test('chronological order uses absolute start time then binary id, regardless of input order or timezone spelling', () => {
  const first = completed('first', start - 1000, 2);
  const a = completed('a', start, 1), b = completed('b', start, 4);
  a.startedAt = '2026-09-09T07:00:00-05:00';
  const result = getAttemptHistory([b, a, first]);
  assert.deepEqual(result.points.map(point => point.id), ['first', 'a', 'b']);
  assert.deepEqual(result.points.map(point => point.ordinal), [1, 2, 3]);
  assert.deepEqual(getAttemptHistory([first, a, b]).points, result.points);
});

test('duplicate ids prefer the fuller completed result deterministically and count only once', () => {
  const old = completed('same', start, 1), newer = completed('same', start, 4);
  const result = getAttemptHistory([old, newer, newer, active('same')], { currentSettings: settings });
  assert.equal(result.points.length, 1);
  assert.equal(result.points[0].score, 4);
  assert.equal(result.personalBests.trialCount, 1);
  assert.deepEqual(result.points, getAttemptHistory([newer, old], { currentSettings: settings }).points);
  const tie = { ...newer, optionalNote: 'different serial order' };
  assert.deepEqual(getAttemptHistory([newer, tie]).points, getAttemptHistory([tie, newer]).points);
});

test('range differences create distinct settings filters even when time and operations match', () => {
  const first = completed('small', start, 2), second = completed('large', start + 1000, 8, largerRange);
  const result = getAttemptHistory([first, second], { currentSettings: settings });
  assert.equal(result.settingsOptions.length, 2);
  assert.notEqual(result.points[0].settingsKey, result.points[1].settingsKey);
  assert.match(result.points[0].settingsLabel, /A 2–12/);
  assert.match(result.points[1].settingsLabel, /A 2–999/);
  assert.equal(result.settingsOptions.find(option => option.value === mentalSettingsKey(largerRange)).bestCorrect, 8);
  assert.deepEqual(getAttemptHistory([first, second], { settingsFilter: 'current', currentSettings: settings }).points.map(point => point.id), ['small']);
  assert.deepEqual(getAttemptHistory([first, second], { settingsFilter: mentalSettingsKey(largerRange) }).points.map(point => point.id), ['large']);
});

test('equivalent operation order and unused ranges keep the same settings group', () => {
  const a = { ...settings, operations: ['multiply', 'add'] };
  const b = { ...settings, operations: ['add', 'multiply'], ranges: { ...settings.ranges, divide: { minA: 1, maxA: 9000, minB: 1, maxB: 9000 } } };
  const result = getAttemptHistory([completed('a', start, 1, a), completed('b', start + 1000, 1, b)]);
  assert.equal(result.settingsOptions.length, 1);
  assert.equal(result.settingsOptions[0].count, 2);
});

test('settings labels distinguish division divisor and quotient ranges in both languages', () => {
  const division = { durationSeconds: 60, operations: ['divide'], ranges: { divide: { minA: 3, maxA: 12, minB: 4, maxB: 24 } } };
  assert.equal(formatAttemptSettings(division), '60 秒 · ÷ 除数 3–12 / 商 4–24');
  assert.equal(formatAttemptSettings(division, 'en'), '60s · ÷ divisor 3–12 / quotient 4–24');
});

test('filtering never renumbers full-history ordinals and distinguishes empty search from empty history', () => {
  const trials = [completed('first', start - 1000, 1), completed('different', start, 2, largerRange), completed('third', start + 1000, 3)];
  const result = getAttemptHistory(trials, { settingsFilter: 'current', currentSettings: settings });
  assert.deepEqual(result.points.map(point => point.ordinal), [1, 3]);
  assert.deepEqual(result.points.map(point => point.x), [1, 3]);
  assert.equal(result.totalCount, 3);
  assert.equal(result.filteredCount, 2);
  const empty = getAttemptHistory(trials, { settingsFilter: 'unknown-key' });
  assert.equal(empty.totalCount, 3);
  assert.equal(empty.emptyReason, 'no-match');
  assert.equal(empty.filteredCount, 0);
});

test('personal records remain same-settings over all dates independently of the mixed or exact filtered curve', () => {
  const oldBest = completed('old-best', start - 120 * 86400000, 10);
  const newer = completed('newer', start, 3);
  const incomparable = completed('different-settings', start, 500, largerRange);
  for (const settingsFilter of ['all', 'current', mentalSettingsKey(largerRange)]) {
    const result = getAttemptHistory([oldBest, newer, incomparable], { currentSettings: settings, settingsFilter, timeRange: 'last30days', now: start });
    assert.equal(result.personalBests.bestCorrect, 10);
    assert.equal(result.personalBests.trialCount, 2);
    assert.equal(result.recordSettingsKey, mentalSettingsKey(settings));
  }
});

test('calendar windows include the first local midnight and all of today, but exclude adjacent days', () => {
  const now = new Date(2026, 8, 9, 12).getTime();
  const first = new Date(2026, 7, 11).getTime(), end = new Date(2026, 8, 10).getTime();
  const trials = [completed('before', first - 1), completed('first-midnight', first), completed('last-millisecond', end - 1), completed('tomorrow', end)];
  const result = getAttemptHistory(trials, { timeRange: 'last30days', now });
  assert.deepEqual(result.points.map(point => point.id), ['first-midnight', 'last-millisecond']);
  assert.deepEqual(result.points.map(point => point.ordinal), [2, 3]);
  assert.deepEqual(result.window, { startMs: first, endMs: end });
  assert.equal(result.points[0].dateKey, '2026-08-11');
  assert.equal(result.points[1].dateKey, '2026-09-09');
  const ninety = getAttemptHistory([], { timeRange: 'last90days', now });
  assert.equal(ninety.window.startMs, new Date(2026, 5, 12).getTime());
});

test('local-day windows handle spring and autumn DST without assuming every day lasts 24 hours', () => {
  const moduleUrl = new URL('../src/features/personal/mental/attemptHistory.js', import.meta.url).href;
  const source = `import {getAttemptHistory} from ${JSON.stringify(moduleUrl)};
    const dates = [new Date(2026,2,10,12),new Date(2026,10,3,12),new Date(2026,3,7,12)];
    const result=dates.map(now=>{const {window}=getAttemptHistory([],{timeRange:'last30days',now});return {hours:(window.endMs-window.startMs)/3600000,startHour:new Date(window.startMs).getHours(),endHour:new Date(window.endMs).getHours()};});
    process.stdout.write(JSON.stringify(result));`;
  const run = timezone => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8', env: { ...process.env, TZ: timezone } }));
  const chicago = run('America/Chicago');
  assert.equal(chicago[0].hours, 719);
  assert.equal(chicago[1].hours, 721);
  const sydney = run('Australia/Sydney');
  assert.equal(sydney[2].hours, 721);
  for (const result of [...chicago, ...sydney, ...run('UTC')]) {
    assert.equal(result.startHour, 0);
    assert.equal(result.endHour, 0);
  }
  assert.ok(run('UTC').every(result => result.hours === 720));
});

test('date axis uses exact start timestamps while attempt axis preserves discrete ordinals', () => {
  const trials = [completed('a', start), completed('b', start + 3600000)];
  const date = getAttemptHistory(trials, { xAxis: 'date' });
  assert.deepEqual(date.points.map(point => point.x), [start, start + 3600000]);
  assert.deepEqual(date.xDomain, [start, start + 3600000]);
  assert.deepEqual(date.points.map(point => point.ordinal), [1, 2]);
  assert.deepEqual(getAttemptHistory(trials).points.map(point => point.x), [1, 2]);
});

test('hundreds of attempts and scores over 100 remain full-fidelity without sampling or clipping', () => {
  const trials = Array.from({ length: 250 }, (_, index) => completed(`attempt-${index}`, start + index * 60000, index === 249 ? 350 : index % 3));
  const result = getAttemptHistory(trials, { currentSettings: settings });
  assert.equal(result.totalCount, 250);
  assert.equal(result.points.length, 250);
  assert.equal(result.points.at(-1).ordinal, 250);
  assert.equal(result.points.at(-1).score, 350);
  assert.equal(result.points.at(-1).meanMs, 10);
  assert.equal(result.yMax, 350);
  assert.equal(result.personalBests.bestCorrect, 350);
  assert.equal(result.personalBests.trialCount, 250);
});

test('reading frozen history does not mutate records, question arrays or settings', () => {
  const trials = deepFreeze([completed('a', start, 2), completed('b', start + 1000, 1, largerRange)]);
  const before = JSON.stringify(trials);
  const result = getAttemptHistory(trials, { currentSettings: deepFreeze(structuredClone(settings)) });
  exportAttemptHistoryCsv(result.points);
  assert.equal(JSON.stringify(trials), before);
});

test('invalid dates or scores cannot create a misleading plot point and invalid filter modes are explicit', () => {
  const trial = completed('valid');
  const result = getAttemptHistory([trial, null, { ...trial, id: 'bad-date', startedAt: 'invalid' }, { ...trial, id: 'negative', correct: -1 }, { ...trial, id: 'nan', correct: NaN }]);
  assert.deepEqual(result.points.map(point => point.id), ['valid']);
  assert.throws(() => getAttemptHistory([], { xAxis: 'unknown' }), /x-axis/);
  assert.throws(() => getAttemptHistory([], { timeRange: 'unknown' }), /time range/);
  assert.throws(() => getAttemptHistory([], { timeRange: 'last30days', now: 'invalid' }), /date/);
});

test('CSV cell formatting escapes quotes, commas, newlines and spreadsheet formula prefixes', () => {
  assert.equal(formatCsvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const value of ['=1+1', '+cmd', '-1+2', '@SUM(A1:A2)', '  =1+1', '\t=1+1', '\r=1+1', '\nplain']) assert.ok(formatCsvCell(value).startsWith('"\''), value);
  assert.equal(formatCsvCell(0), '"0"');
  assert.equal(formatCsvCell(-2), '"-2"');
  assert.equal(formatCsvCell(null), '""');
  assert.equal(formatCsvCell('2026-09-09'), '"2026-09-09"');
});

test('CSV exports only filtered points with dates, full settings, score, mean and completion status', () => {
  const result = getAttemptHistory([completed('=malicious-id', start, 0), completed('other-range', start + 1000, 3, largerRange)], { settingsFilter: 'current', currentSettings: settings });
  const csv = exportAttemptHistoryCsv(result.points, { language: 'en' });
  assert.ok(csv.startsWith('\uFEFF"Attempt","Trial ID"'));
  assert.ok(csv.includes('"\'=malicious-id"'));
  assert.ok(csv.includes('"2026-09-09T12:00:00.000Z"'));
  assert.ok(csv.includes('"120"'));
  assert.ok(csv.includes('"\'+ A 2–12 / B 2–12"'));
  assert.ok(csv.includes('"0","","Completed"'));
  assert.ok(!csv.includes('other-range'));
  assert.ok(csv.endsWith('\r\n'));
  const chinese = exportAttemptHistoryCsv(result.points, { includeBom: false });
  assert.ok(chinese.startsWith('"完整试次序号"'));
  assert.ok(chinese.includes('"完整完成"'));
  assert.equal(exportAttemptHistoryCsv([], { includeBom: false }).split('\r\n').length, 2);
});
