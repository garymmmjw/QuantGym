import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineDateTime, filterApplications, formatDeadline, getApplicationView, getCurrentDeadline, getCurrentDeadlineEvent, getProgressColumnCount, getSummary, groupApplications, sortApplications } from './dataModel.js';

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

test('received milestones count each application once and preserve separate current outcomes', () => {
  const withProgress = (id, types) => {
    const row = app(id, '2026-09-17');
    row.events.push(...types.map((type, index) => ({ id: `${id}-${index}`, type, date: '2026-09-17' })));
    return row;
  };
  const rows = [
    withProgress('waiting', []),
    withProgress('oa', ['oa_received', 'oa_received', 'oa_completed']),
    withProgress('interview', ['oa_received', 'interview', 'interview']),
    withProgress('offer', ['oa_received', 'interview', 'offer']),
    withProgress('rejected', ['oa_received', 'interview', 'rejected']),
    withProgress('withdrawn', ['oa_received', 'withdrawn']),
    withProgress('direct-offer', ['offer']),
    withProgress('direct-rejection', ['rejected']),
  ];
  const before = structuredClone(rows);
  const summary = getSummary(rows);
  assert.deepEqual(summary, { total: 8, ddl: 0, awaiting: 1, oa: 1, interview: 1, offer: 2, rejected: 2, closed: 3, receivedOa: 5, receivedInterview: 3 });
  for (const [mode, key, expected] of [
    ['received-oa', 'receivedOa', ['oa', 'interview', 'offer', 'rejected', 'withdrawn']],
    ['received-interview', 'receivedInterview', ['interview', 'offer', 'rejected']],
    ['rejected', 'rejected', ['rejected', 'direct-rejection']],
    ['offer', 'offer', ['offer', 'direct-offer']],
    ['closed', 'closed', ['rejected', 'withdrawn', 'direct-rejection']],
  ]) {
    const view = getApplicationView(rows, stages, mode);
    assert.equal(view.applications.length, summary[key]);
    assert.deepEqual(ids(view.applications).sort(), [...expected].sort());
  }
  assert.deepEqual(ids(filterApplications(rows, { status: 'oa' })), ['oa']);
  assert.deepEqual(ids(filterApplications(rows, { status: 'interview' })), ['interview']);
  assert.deepEqual(rows, before);
});

test('progress columns expose every event and remain shared across applications with different histories', () => {
  const short = app('short', '2026-09-17');
  const long = app('long', '2026-09-16');
  long.events.push(...['oa_received', 'oa_completed', 'interview', 'offer'].map((type, index) => ({ id: `e-${index}`, type, date: '2026-09-17' })));
  assert.equal(getProgressColumnCount([]), 2);
  assert.equal(getProgressColumnCount([short]), 2);
  assert.equal(getProgressColumnCount([short, long]), 5);
  long.events.push({ id: 'e-next', type: 'interview', date: '2026-09-18' });
  assert.equal(getProgressColumnCount([short, long]), 6);
});

test('DDL view lists all current deadlines across Stages and ignores completed historical deadlines', () => {
  const dated = app('dated', '2026-09-14', 's1');
  dated.events.push({ id: 'dated-oa', type: 'oa_received', date: '2026-09-16', dueDate: '2026-09-19' });
  const timed = app('timed', '2026-09-17', 's2');
  timed.events.push({ id: 'timed-interview', type: 'interview', date: '2026-09-17', dueDate: '2026-09-20', dueTime: '14:30' });
  const completed = app('completed', '2026-09-18', 's3');
  completed.events.push({ id: 'old-oa', type: 'oa_received', date: '2026-09-18', dueDate: '2026-09-19' }, { id: 'done', type: 'oa_completed', date: '2026-09-18' });
  const rows = [dated, timed, completed, app('waiting', '2026-09-19')];
  const result = getApplicationView(rows, stages, 'ddl');
  assert.equal(getSummary(rows).ddl, 2);
  assert.equal(result.groups, null);
  assert.deepEqual(ids(result.applications), ['dated', 'timed']);
  assert.deepEqual(ids(getApplicationView(rows, stages, 'awaiting').applications), ['waiting']);
  const cleared = { ...timed, events: timed.events.map(event => ({ ...event, dueDate: '', dueTime: '' })) };
  assert.equal(getApplicationView([completed, cleared], stages, 'ddl').applications.length, 0);
});

test('DDL urgency orders days and clock times, keeps date-only deadlines first that day, and preserves recent ties', () => {
  const deadlineApp = (id, submitted, dueDate, dueTime = '') => {
    const row = app(id, submitted);
    row.events.push({ id: `${id}-oa`, type: 'oa_received', date: submitted, dueDate, dueTime });
    return row;
  };
  const rows = [
    deadlineApp('late', '2026-09-17', '2026-09-19', '18:00'),
    deadlineApp('morning-old', '2026-09-13', '2026-09-19', '09:30'),
    deadlineApp('next-year', '2026-09-17', '2027-01-01', '00:00'),
    deadlineApp('overdue', '2026-09-16', '2026-09-16', '08:00'),
    deadlineApp('date-only', '2026-09-14', '2026-09-19'),
    deadlineApp('morning-new', '2026-09-16', '2026-09-19', '09:30'),
    deadlineApp('midnight', '2026-09-15', '2026-09-19', '00:00'),
    deadlineApp('earlier-day', '2026-09-17', '2026-09-18', '23:59'),
  ];
  const before = structuredClone(rows);
  const recent = ids(getApplicationView(rows, stages).applications);
  assert.deepEqual(ids(getApplicationView(rows, stages, 'ddl').applications), [
    'overdue', 'earlier-day', 'date-only', 'midnight', 'morning-new', 'morning-old', 'late', 'next-year',
  ]);
  assert.deepEqual(ids(getApplicationView(rows, stages).applications), recent);
  assert.deepEqual(rows, before);
  rows[0].events.at(-1).dueDate = '2026-09-15';
  assert.equal(getApplicationView(rows, stages, 'ddl').applications[0].id, 'late');
  assert.equal(getApplicationView(rows, stages, 'ddl').groups, null);
});

test('company view sorts globally without Stages and preserves separate roles at the same company', () => {
  const rows = [app('zulu', '2026-09-17', 's1', 'Zulu'), app('alpha-qr', '2026-09-15', 's2', 'Alpha'), app('alpha-qt', '2026-09-16', 's1', 'Alpha')];
  rows[2].role = 'Trading Intern';
  const original = structuredClone(rows);
  const company = getApplicationView(rows, stages, 'company');
  assert.equal(company.groups, null);
  assert.deepEqual(ids(company.applications), ['alpha-qr', 'alpha-qt', 'zulu']);
  assert.equal(company.applications[1].role, 'Trading Intern');
  const all = getApplicationView(rows, stages);
  assert.deepEqual(ids(all.applications), ['zulu', 'alpha-qt', 'alpha-qr']);
  assert.deepEqual(all.groups.filter(group => group.applications.length).map(group => group.stage.id), ['s1', 's2']);
  assert.deepEqual(rows, original);
});

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
