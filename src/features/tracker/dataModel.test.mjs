import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineDateTime, filterApplications, formatDeadline, getCurrentDeadline, getCurrentDeadlineEvent, groupApplications, sortApplications } from './dataModel.js';

const stages = [
  { id: 's1', label: 'Stage 1' },
  { id: 's2', label: 'Stage 2', importedIds: ['old-s2'] },
  { id: 's3', label: 'Stage 3' },
];
const app = (id, date, prepPhase = 's2', company = id) => ({
  id, company, role: 'Research Intern', prepPhase,
  events: [{ id: `${id}-submitted`, type: 'submitted', date, year: null }],
});
const ids = rows => rows.map(row => row.id);
const display = (rows, order) => groupApplications(sortApplications(rows, order), stages);

test('recent is the default: latest submission leads its Stage and latest Stage leads the table', () => {
  const rows = [app('app-001', '09/10', 's1'), app('app-002', '09/13'), app('app-003', '9/16')];
  const result = display(rows);
  assert.deepEqual(result.map(group => group.stage.id), ['s2', 's1', 's3']);
  assert.deepEqual(ids(result[0].applications), ['app-003', 'app-002']);
  assert.deepEqual(ids(result[1].applications), ['app-001']);
  assert.equal(result[2].applications.length, 0);
});

test('same-day new applications lead yearless imports and later progress does not alter submission order', () => {
  const rows = [app('app-001', '9/16'), app('app-002', '09/16'), app('new-uuid', '2026-09-16')];
  rows[0].events.push({ id: 'interview', type: 'interview', date: '2026-10-01' });
  assert.deepEqual(ids(sortApplications(rows)), ['new-uuid', 'app-002', 'app-001']);
});

test('sort choices change both group order and rows, and switching back restores recent order', () => {
  const rows = [app('app-001', '09/10', 's1', 'Alpha'), app('app-002', '09/13', 's2', 'Beta'), app('app-003', '09/16', 's2', 'Zulu')];
  assert.deepEqual(display(rows, 'original').map(group => group.stage.id), ['s1', 's2', 's3']);
  const byCompany = display(rows, 'company');
  assert.deepEqual(byCompany.map(group => group.stage.id), ['s1', 's2', 's3']);
  assert.deepEqual(ids(byCompany[1].applications), ['app-002', 'app-003']);
  assert.deepEqual(ids(display(rows, 'recent')[0].applications), ['app-003', 'app-002']);
});

test('newest application in an earlier numbered Stage can move that group above later Stages', () => {
  const result = display([app('a', '2026-09-20', 's1'), app('b', '2026-09-19', 's2')]);
  assert.deepEqual(result.map(group => group.stage.id), ['s1', 's2', 's3']);
});

test('filters, aliases and unassigned applications keep the selected ordering', () => {
  const rows = [app('a', '2026-09-15', 's1'), app('b', '2026-09-17', 'old-s2'), app('c', '2026-09-18', '')];
  rows[0].events.push({ id: 'oa-a', type: 'oa_received', date: '2026-09-19' });
  rows[2].events.push({ id: 'oa-c', type: 'oa_received', date: '2026-09-19' });
  const result = groupApplications(filterApplications(sortApplications(rows), { status: 'oa' }), stages);
  assert.deepEqual(result.filter(group => group.applications.length).map(group => group.stage.id), ['', 's1']);
  assert.deepEqual(ids(display(rows)[1].applications), ['b']);
});

test('mixed yearless and complete dates have one consistent order without changing source dates', () => {
  const rows = [app('a', '2025-12-31'), app('b', '6/1'), app('c', '2026-01-02')];
  const before = structuredClone(rows);
  for (const input of [rows, [rows[0], rows[2], rows[1]], [...rows].reverse()]) {
    assert.deepEqual(ids(sortApplications(input)), ['b', 'c', 'a']);
  }
  assert.deepEqual(rows, before);
  assert.equal(rows[1].events[0].year, null);
});

test('complete dates honor explicit years and invalid dates stay last', () => {
  const rows = [app('a', '2025-12-31'), app('b', '2026-01-01'), app('bad', '2026-02-30'), app('partial', '02/01')];
  rows[3].events[0].year = 2026;
  assert.deepEqual(ids(sortApplications(rows)), ['partial', 'b', 'a', 'bad']);
});

test('only the latest progress can carry the current deadline', () => {
  const row = app('a', '2026-09-17');
  const oa = { id: 'oa', type: 'oa_received', date: '2026-09-17', dueDate: '2026-09-19', dueTime: '14:30' };
  row.events.push(oa);
  assert.equal(getCurrentDeadlineEvent(row), oa);
  assert.equal(getCurrentDeadline(row), '2026-09-19');
  row.events.push({ id: 'done', type: 'oa_completed', date: '2026-09-18', dueDate: '' });
  assert.equal(getCurrentDeadlineEvent(row), null);
  assert.equal(getCurrentDeadline(row), '');
  assert.equal(getCurrentDeadlineEvent({ events: [] }), null);
});

test('deadline formatting preserves entered minutes and never invents a time for old dates', () => {
  const event = { dueDate: '2026-09-19', dueTime: '00:05' };
  assert.equal(formatDeadline(event), '09/19 00:05');
  assert.equal(formatDeadline(event, { fullDate: true }), '2026.09.19 00:05');
  assert.equal(deadlineDateTime(event), '2026-09-19T00:05');
  const legacy = { dueDate: '2026-09-19' };
  assert.equal(formatDeadline(legacy), '09/19');
  assert.equal(formatDeadline(legacy, { fullDate: true }), '2026.09.19');
  assert.equal(deadlineDateTime(legacy), '2026-09-19');
  assert.equal(formatDeadline(null), '');
  assert.equal(deadlineDateTime({ dueDate: '', dueTime: '12:30' }), '');
});
