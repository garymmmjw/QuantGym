import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTrackerOperations, mergeTrackerOperations, projectTrackerOperations, migrateTrackerOperations, diffTrackerOperations } from './trackerSyncModel.js';

const copy = value => structuredClone(value);
const event = (id, type = 'submitted', date = '2026-09-13') => ({ id, type, date, dueDate: '', dueTime: '' });
const stage = (id, label = 'Stage 1') => ({ id, label, description: 'Ready', recordedDate: '2026-09-13', importedIds: [] });
const application = (id = 'app-1') => ({ id, company: 'Company', role: 'Quant Research', prepPhase: 'stage-1', season: '2027', events: [event(`${id}-submitted`)] });
const snapshot = () => ({ applications: [application()], deletedEvents: [], stages: [stage('stage-1')] });
const apply = (base, before, after) => mergeTrackerOperations(base, diffTrackerOperations(before, after, base));

test('legacy migration is immutable, idempotent, keeps order and fills no guessed dates', () => {
  const original = snapshot();
  original.applications = [application('z-first'), application('a-second')];
  original.applications[0].events.push(event('older-oa', 'oa_received', '9/14'));
  original.stages = [stage('z-first', 'Resume'), stage('a-second', 'Applying')];
  original.stages[0].recordedDate = null;
  original.stages[0].trackerImportDate = '2026-09-13';
  const before = copy(original), ops = migrateTrackerOperations(original);
  assert.ok(ops.every(op => op.clock === 0));
  assert.deepEqual(migrateTrackerOperations(original, ops), ops);
  assert.deepEqual(original, before);
  const output = projectTrackerOperations(ops);
  assert.deepEqual(output.applications.map(item => item.id), ['z-first', 'a-second']);
  assert.deepEqual(output.stages.map(item => item.id), ['z-first', 'a-second']);
  assert.equal(output.stages[0].recordedDate, null);
  assert.equal(output.stages[0].trackerImportDate, '2026-09-13');
  assert.equal(output.applications[0].events[1].date, '9/14');
  assert.equal(output.applications[0].events[1].year, undefined);
});

test('migration cannot overwrite existing fields or later edits but imports new entities', () => {
  const before = snapshot(), base = migrateTrackerOperations(before), after = copy(before);
  after.applications[0].company = 'Edited company';
  after.stages[0].description = '';
  const updated = apply(base, before, after), legacy = copy(before);
  legacy.applications[0].role = 'Stale role';
  legacy.applications.push(application('new-application'));
  const result = projectTrackerOperations(migrateTrackerOperations(legacy, updated));
  assert.equal(result.applications[0].company, 'Edited company');
  assert.equal(result.applications[0].role, before.applications[0].role);
  assert.equal(result.stages[0].description, '');
  assert.equal(result.applications.length, 2);
});

test('concurrent edits to different application and event fields survive in either merge order', () => {
  const before = snapshot(), base = migrateTrackerOperations(before), left = copy(before), right = copy(before);
  left.applications[0].company = 'Left company';
  left.applications[0].events[0].dueDate = '2026-09-20';
  right.applications[0].role = 'Right role';
  right.applications[0].events[0].date = '2026-09-14';
  const a = diffTrackerOperations(before, left, base), b = diffTrackerOperations(before, right, base);
  const one = mergeTrackerOperations(mergeTrackerOperations(base, a), b);
  const two = mergeTrackerOperations(mergeTrackerOperations(base, b), a);
  assert.deepEqual(one, two);
  const result = projectTrackerOperations(one).applications[0];
  assert.equal(result.company, 'Left company');
  assert.equal(result.role, 'Right role');
  assert.equal(result.events[0].date, '2026-09-14');
  assert.equal(result.events[0].dueDate, '2026-09-20');
});

test('same-clock same-field edits use operation IDs as a deterministic tie break', () => {
  const base = migrateTrackerOperations(snapshot());
  const a = { id: 'edit-a', clock: 1, kind: 'application', applicationId: 'app-1', fields: { role: 'First' } };
  const b = { ...a, id: 'edit-b', fields: { role: 'Second' } };
  assert.equal(projectTrackerOperations([...base, b, a]).applications[0].role, 'Second');
  assert.equal(projectTrackerOperations([...base, a, b, a]).applications[0].role, 'Second');
  assert.throws(() => mergeTrackerOperations([a], [{ ...a, fields: { role: 'Tampered' } }]), /同一操作编号/);
});

test('concurrent appends retain both events, causal order and yearless original order', () => {
  const before = snapshot();
  before.applications[0].events.push(event('oa', 'oa_received', '12/31'));
  const base = migrateTrackerOperations(before), a = copy(before), b = copy(before);
  a.applications[0].events.push(event('interview', 'interview', '1/2'));
  b.applications[0].events.push(event('offer', 'offer', '1/1'));
  const merged = mergeTrackerOperations(apply(base, before, a), apply(base, before, b));
  const ids = projectTrackerOperations(merged).applications[0].events.map(item => item.id);
  assert.deepEqual(ids.slice(0, 2), ['app-1-submitted', 'oa']);
  assert.deepEqual(ids.slice(2).sort(), ['interview', 'offer']);
  assert.equal(new Set(ids).size, 4);
});

function deletedFixture(deleteId = 'delete-one') {
  const before = snapshot();
  before.applications[0].events.push(event('oa', 'oa_received'), event('interview', 'interview'));
  const after = copy(before);
  after.applications[0].events.splice(1, 1);
  after.deletedEvents.push({ id: deleteId, applicationId: 'app-1', event: before.applications[0].events[1], order: before.applications[0].events.map(item => item.id) });
  return { before, after };
}

test('deletion dominates a concurrent or later ordinary edit, and explicit undo restores the original slot', () => {
  const { before, after } = deletedFixture(), base = migrateTrackerOperations(before);
  const edited = copy(before); edited.applications[0].events[1].dueDate = '2026-09-23';
  let merged = mergeTrackerOperations(apply(base, before, after), apply(base, before, edited));
  const removed = projectTrackerOperations(merged);
  assert.deepEqual(removed.applications[0].events.map(item => item.id), ['app-1-submitted', 'interview']);
  assert.equal(removed.deletedEvents[0].id, 'delete-one');
  const restored = copy(removed);
  restored.applications[0].events.splice(1, 0, restored.deletedEvents[0].event);
  restored.deletedEvents = [];
  merged = apply(merged, removed, restored);
  const output = projectTrackerOperations(merged);
  assert.deepEqual(output.applications[0].events.map(item => item.id), ['app-1-submitted', 'oa', 'interview']);
  assert.equal(output.applications[0].events[1].dueDate, '2026-09-23');
  assert.deepEqual(output.deletedEvents, []);
  assert.deepEqual(projectTrackerOperations(mergeTrackerOperations(merged, base)), output);
});

test('undo acknowledges one delete ID and cannot cancel an unseen concurrent deletion', () => {
  const { before, after } = deletedFixture(), base = migrateTrackerOperations(before);
  const other = copy(after); other.deletedEvents[0].id = 'delete-two';
  const merged = mergeTrackerOperations(apply(base, before, after), apply(base, before, other));
  const projected = projectTrackerOperations(merged);
  assert.equal(projected.deletedEvents.length, 1);
  const token = projected.deletedEvents[0].id, restored = copy(projected);
  restored.applications[0].events.splice(1, 0, restored.deletedEvents[0].event);
  restored.deletedEvents = [];
  const once = projectTrackerOperations(apply(merged, projected, restored));
  assert.equal(once.deletedEvents.length, 1);
  assert.notEqual(once.deletedEvents[0].id, token);
  assert.equal(once.applications[0].events.some(item => item.id === 'oa'), false);
});

test('migrated deletion tombstones and explicit restores remain idempotent', () => {
  const { after } = deletedFixture();
  const ops = migrateTrackerOperations(after), projected = projectTrackerOperations(ops);
  assert.deepEqual(migrateTrackerOperations(after, ops), ops);
  assert.equal(projected.deletedEvents[0].id, 'delete-one');
  const restored = copy(projected);
  restored.applications[0].events.splice(1, 0, restored.deletedEvents[0].event); restored.deletedEvents = [];
  const updated = apply(ops, projected, restored);
  assert.equal(projectTrackerOperations(migrateTrackerOperations(after, updated)).deletedEvents.length, 0);
});

test('same-name Stage IDs and explicit aliases converge, retain real metadata and rewrite application links', () => {
  const first = snapshot(), second = snapshot();
  first.stages = [{ ...stage('stage-z'), importedIds: ['old-stage'], createdAt: '2026-09-13T01:00:00Z' }];
  first.applications[0].prepPhase = 'old-stage';
  second.stages = [{ ...stage('stage-a'), description: '', recordedDate: null }];
  second.applications = [application('app-2')]; second.applications[0].prepPhase = 'stage-a';
  const a = migrateTrackerOperations(first), b = migrateTrackerOperations(second);
  const result = projectTrackerOperations(mergeTrackerOperations(a, b));
  assert.equal(result.stages.length, 1);
  assert.equal(result.stages[0].recordedDate, '2026-09-13');
  assert.equal(result.stages[0].description, 'Ready');
  assert.ok(result.applications.every(app => app.prepPhase === result.stages[0].id));
  assert.deepEqual(new Set([result.stages[0].id, ...result.stages[0].importedIds]), new Set(['stage-a', 'stage-z', 'old-stage']));
});

test('a migrated Stage rename survives the other device first uploading its old default name', () => {
  const first = snapshot(), a = migrateTrackerOperations(first), renamed = copy(first);
  renamed.stages[0].label = 'Applications ready';
  const updated = apply(a, first, renamed), second = snapshot();
  second.stages[0].id = 'independent-stage'; second.applications[0].prepPhase = 'independent-stage';
  const output = projectTrackerOperations(mergeTrackerOperations(updated, migrateTrackerOperations(second)));
  assert.equal(output.stages.length, 1);
  assert.equal(output.stages[0].label, 'Applications ready');
});

test('migration can discover aliases after all Stage fields are already covered', () => {
  const before = snapshot(), base = migrateTrackerOperations(before), later = copy(before);
  later.stages[0].importedIds = ['legacy-stage'];
  const migrated = migrateTrackerOperations(later, base);
  assert.ok(projectTrackerOperations(migrated).stages[0].importedIds.includes('stage-1') || projectTrackerOperations(migrated).stages[0].id === 'stage-1');
  assert.deepEqual(new Set(projectTrackerOperations(migrated).stages.flatMap(item => [item.id, ...item.importedIds])), new Set(['stage-1', 'legacy-stage']));
  assert.deepEqual(migrateTrackerOperations(later, migrated), migrated);
});

test('creating a new stage with a name released by an earlier rename does not merge their identities', () => {
  const before = snapshot(), base = migrateTrackerOperations(before), renamed = copy(before);
  renamed.stages[0].label = 'Applications ready';
  const renamedOps = apply(base, before, renamed), next = copy(renamed);
  next.stages.push(stage('new-stage', 'Stage 1'));
  const result = projectTrackerOperations(apply(renamedOps, renamed, next));
  assert.equal(result.stages.length, 2);
  assert.deepEqual(new Set(result.stages.map(item => item.label)), new Set(['Stage 1', 'Applications ready']));
});

test('merging identical large logs checks capacity after deduplication', () => {
  const operations = Array.from({ length: 50001 }, (_, index) => ({ id: `patch-${index}`, clock: index + 1, kind: 'application', applicationId: 'app', fields: { role: 'Same role' } }));
  assert.equal(mergeTrackerOperations(operations, operations).length, operations.length);
});

test('concurrent deadline changes never leave a clock time without its date; ISO year metadata stays consistent', () => {
  const before = snapshot(); before.applications[0].events[0] = { ...before.applications[0].events[0], year: 2026, dueDate: '2026-09-20', dueTime: '12:00' };
  const base = migrateTrackerOperations(before), clear = copy(before), time = copy(before);
  clear.applications[0].events[0].dueDate = ''; clear.applications[0].events[0].dueTime = '';
  time.applications[0].events[0].dueTime = '15:00';
  const merged = mergeTrackerOperations(apply(base, before, clear), apply(base, before, time));
  const output = projectTrackerOperations(merged).applications[0].events[0];
  assert.equal(output.dueDate, ''); assert.equal(output.dueTime, ''); assert.equal(output.year, 2026);
  assert.equal(projectTrackerOperations([...base, { id: 'year-edit', clock: 2, kind: 'event', applicationId: 'app-1', eventId: 'app-1-submitted', fields: { year: 2025 } }]).applications[0].events[0].year, 2026);
});

test('first submission type is immutable and malformed operations cannot enter the log', () => {
  const base = migrateTrackerOperations(snapshot());
  const edit = { id: 'edit', clock: 1, kind: 'event', applicationId: 'app-1', eventId: 'app-1-submitted', fields: { type: 'interview' } };
  assert.equal(projectTrackerOperations([...base, edit]).applications[0].events[0].type, 'submitted');
  for (const op of [
    { ...edit, clock: -1 }, { ...edit, clock: Number.MAX_SAFE_INTEGER + 1 },
    { ...edit, fields: { date: '0000-01-01' } }, { ...edit, fields: { date: '2026-02-30' } },
    { ...edit, fields: { dueTime: '25:00' } }, { ...edit, fields: { note: 'unsupported' } },
    { ...edit, ownerId: 'other-user' }, { ...edit, id: '\ud800' },
  ]) assert.throws(() => validateTrackerOperations([op]), /无效/);
  for (const invalid of ['2026-09-19T24:00:00Z', '2026-09-19T12:00:00.1234567Z', '0000-01-01T00:00:00Z']) {
    assert.throws(() => validateTrackerOperations([{ id: 'stage', clock: 1, kind: 'stage', stageId: 'stage-1', fields: { updatedAt: invalid } }]), /无效/);
  }
  assert.throws(() => validateTrackerOperations([{ id: 'delete', clock: 2, kind: 'delete', applicationId: 'app-1', eventId: 'app-1-submitted', deleteId: 'delete-id', event: snapshot().applications[0].events[0], order: ['app-1-submitted', 'other'] }]), /首次投递/);
});

test('diff emits only changed fields at a higher logical clock and leaves its inputs unchanged', () => {
  const before = snapshot(), base = migrateTrackerOperations(before), after = copy(before);
  after.applications[0].company = 'Changed';
  const copies = [copy(before), copy(after), copy(base)];
  const added = diffTrackerOperations(before, after, base);
  assert.equal(added.length, 1); assert.equal(added[0].clock, 1);
  assert.deepEqual(added[0].fields, { company: 'Changed' });
  assert.deepEqual([before, after, base], copies);
  assert.deepEqual(diffTrackerOperations(after, after, mergeTrackerOperations(base, added)), []);
});
