import { STATUS_META } from './dataModel.js';

const MAX_OPERATIONS = 100000;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const compareOps = (a, b) => a.clock - b.clock || compareText(a.id, b.id);
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const serialized = value => JSON.stringify(canonical(value));
const clone = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error(`投递同步数据无效：${message}`); };
const requireValue = (condition, message) => { if (!condition) fail(message); };
const text = (value, max, empty = false) => typeof value === 'string' && value.length <= max && (empty || Boolean(value.trim())) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
const validId = value => text(value, 200);
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const eventDate = value => {
  if (isoDate(value)) return true;
  if (typeof value !== 'string' || !/^\d{1,2}\/\d{1,2}$/.test(value)) return false;
  const [month, day] = value.split('/').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
};
const timestamp = value => value === null || (text(value, 100) && isoDate(value.slice(0, 10))
  && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) && Number.isFinite(Date.parse(value)));
const fieldRules = {
  application: {
    company: value => text(value, 120), role: value => text(value, 400),
    prepPhase: value => text(value, 200, true), season: value => text(value, 20, true),
  },
  event: {
    type: value => typeof value === 'string' && own(STATUS_META, value), date: eventDate,
    year: value => value === null || (Number.isInteger(value) && value >= 1 && value <= 9999),
    dueDate: value => value === '' || isoDate(value),
    dueTime: value => value === '' || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)),
  },
  stage: {
    label: value => text(value, 40), description: value => text(value, 200, true),
    recordedDate: value => value === null || isoDate(value),
    trackerImportDate: value => value === null || isoDate(value),
    createdAt: timestamp, capturedAt: timestamp, updatedAt: timestamp,
  },
};
const labelKey = value => value.trim().toLocaleLowerCase('en-US');

function fieldsFor(kind, fields) {
  requireValue(object(fields) && Object.keys(fields).length > 0, '修改字段缺失');
  for (const [key, value] of Object.entries(fields)) {
    requireValue(own(fieldRules[kind], key) && fieldRules[kind][key](value), `不支持的 ${kind}.${key}`);
  }
  return clone(fields);
}
function idList(value, { min = 0, max = 11000 } = {}) {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max
    && value.every(validId) && new Set(value).size === value.length, '记录顺序或别名无效');
  return [...value];
}
function completeEvent(event) {
  requireValue(object(event) && validId(event.id), '进展缺少编号');
  requireValue(Object.keys(event).every(key => key === 'id' || own(fieldRules.event, key)), '进展包含未知字段');
  const fields = fieldsFor('event', Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id')));
  requireValue(own(fields, 'type') && own(fields, 'date'), '进展缺少类型或日期');
  const next = { id: event.id, ...fields, dueDate: fields.dueDate ?? '', dueTime: fields.dueTime ?? '' };
  requireValue(!next.dueTime || next.dueDate, '截止时间缺少日期');
  return next;
}

export function validateTrackerOperations(operations) {
  requireValue(Array.isArray(operations) && operations.length <= MAX_OPERATIONS, '操作列表过大或格式错误');
  const byId = new Map();
  const deletionTargets = new Map();
  for (const input of operations) {
    requireValue(object(input) && validId(input.id) && Number.isSafeInteger(input.clock) && input.clock >= 0, '操作编号或时钟无效');
    const op = { id: input.id, clock: input.clock, kind: input.kind };
    const allowed = ['id', 'clock', 'kind'];
    if (input.kind === 'stage') {
      requireValue(validId(input.stageId), 'Stage 编号无效');
      op.stageId = input.stageId;
      op.fields = fieldsFor('stage', input.fields);
      allowed.push('stageId', 'fields', 'aliases');
      if (own(input, 'aliases')) {
        op.aliases = idList(input.aliases, { max: 1000 }).sort(compareText);
        requireValue(!op.aliases.includes(op.stageId), 'Stage 别名不能指向自身');
      }
    } else {
      requireValue(validId(input.applicationId), '申请编号无效');
      op.applicationId = input.applicationId;
      allowed.push('applicationId');
      if (input.kind === 'application') {
        op.fields = fieldsFor('application', input.fields);
        allowed.push('fields');
      } else {
        requireValue(validId(input.eventId), '进展编号无效');
        op.eventId = input.eventId;
        allowed.push('eventId');
        if (input.kind === 'event') {
          op.fields = fieldsFor('event', input.fields);
          allowed.push('fields', 'order');
          if (own(input, 'order')) {
            op.order = idList(input.order, { min: 1 });
            requireValue(op.order.includes(op.eventId), '顺序缺少进展编号');
          }
        } else if (input.kind === 'delete' || input.kind === 'restore') {
          requireValue(validId(input.deleteId), '删除操作编号无效');
          op.deleteId = input.deleteId;
          const target = serialized([op.applicationId, op.eventId]);
          requireValue(!deletionTargets.has(op.deleteId) || deletionTargets.get(op.deleteId) === target, '同一删除编号对应不同进展');
          deletionTargets.set(op.deleteId, target);
          allowed.push('deleteId');
          if (input.kind === 'delete') {
            op.event = completeEvent(input.event);
            op.order = idList(input.order, { min: 2 });
            requireValue(op.event.id === op.eventId && op.event.type !== 'submitted' && op.order.indexOf(op.eventId) > 0, '不能删除首次投递');
            allowed.push('event', 'order');
          }
        } else fail('未知操作类型');
      }
    }
    requireValue(Object.keys(input).every(key => allowed.includes(key)), '操作包含未知字段');
    const previous = byId.get(op.id);
    requireValue(!previous || serialized(previous) === serialized(op), '同一操作编号包含不同内容');
    byId.set(op.id, op);
  }
  return [...byId.values()].sort(compareOps);
}

export function mergeTrackerOperations(first = [], second = []) {
  const merged = new Map();
  for (const op of [...validateTrackerOperations(first), ...validateTrackerOperations(second)]) {
    requireValue(!merged.has(op.id) || serialized(merged.get(op.id)) === serialized(op), '同一操作编号包含不同内容');
    merged.set(op.id, op);
  }
  return validateTrackerOperations([...merged.values()]);
}

// Null/empty legacy defaults must not replace known data from another device.
// Explicit edits have positive clocks and can still intentionally clear fields.
function chooseField(previous, op, value) {
  if (!previous) return { op, value };
  if (previous.op.clock === 0 && op.clock === 0) {
    const known = item => item !== null && item !== '';
    if (known(previous.value) !== known(value)) return known(value) ? { op, value } : previous;
  }
  return compareOps(previous.op, op) < 0 ? { op, value } : previous;
}
function assignFields(target, op, fields = op.fields) {
  for (const [key, value] of Object.entries(fields)) target.set(key, chooseField(target.get(key), op, value));
}
const valuesOf = registers => Object.fromEntries([...registers].map(([key, entry]) => [key, entry.value]));

function projectStages(ops) {
  const stageOps = ops.filter(op => op.kind === 'stage');
  const parents = new Map();
  const ensure = id => { if (!parents.has(id)) parents.set(id, id); };
  const root = id => { ensure(id); let current = id; while (parents.get(current) !== current) current = parents.get(current); return current; };
  const unite = (a, b) => { const x = root(a), y = root(b); if (x !== y) parents.set(compareText(x, y) > 0 ? x : y, compareText(x, y) < 0 ? x : y); };
  const initialLabels = new Map();
  const registers = new Map();
  for (const op of stageOps) {
    ensure(op.stageId);
    for (const alias of op.aliases || []) unite(op.stageId, alias);
    if (!registers.has(op.stageId)) registers.set(op.stageId, new Map());
    assignFields(registers.get(op.stageId), op);
    if (op.clock === 0 && own(op.fields, 'label') && own(op.fields, 'recordedDate') && !initialLabels.has(op.stageId)) initialLabels.set(op.stageId, labelKey(op.fields.label));
  }
  // Stable creation-name equivalence keeps independently migrated default IDs
  // together even after one device renames its copy before reconnecting.
  for (const labels of [initialLabels, new Map([...registers].map(([id, fields]) => [id, fields.has('label') ? labelKey(fields.get('label').value) : null]))]) {
    const owners = new Map();
    for (const [id, label] of labels) if (label) {
      if (owners.has(label)) unite(id, owners.get(label));
      else owners.set(label, id);
    }
  }
  const groups = new Map();
  for (const op of stageOps) {
    const id = root(op.stageId);
    if (!groups.has(id)) groups.set(id, { fields: new Map(), first: op });
    assignFields(groups.get(id).fields, op);
  }
  const aliases = new Map([...parents.keys()].map(id => [id, root(id)]));
  const stages = [...groups].map(([id, group]) => {
    const fields = valuesOf(group.fields);
    requireValue(text(fields.label, 40), 'Stage 缺少名称');
    return { id, description: '', recordedDate: null, ...fields,
      importedIds: [...aliases].filter(([alias, target]) => target === id && alias !== id).map(([alias]) => alias).sort(compareText), first: group.first };
  }).sort((a, b) => compareOps(a.first, b.first) || compareText(a.id, b.id)).map(({ first, ...stage }) => stage);
  return { stages, aliases };
}

function eventOrder(events, orders, firstId) {
  const edges = new Map([...events.keys()].map(id => [id, new Set()]));
  const incoming = new Map([...events.keys()].map(id => [id, 0]));
  for (const order of orders) {
    const present = order.filter(id => events.has(id));
    for (let index = 1; index < present.length; index += 1) {
      const from = present[index - 1], to = present[index];
      if (!edges.get(from).has(to)) { edges.get(from).add(to); incoming.set(to, incoming.get(to) + 1); }
    }
  }
  const remaining = new Set(events.keys()), result = [];
  const preference = (a, b) => a === firstId ? -1 : b === firstId ? 1 : compareOps(events.get(a).first, events.get(b).first) || compareText(a, b);
  while (remaining.size) {
    const ready = [...remaining].filter(id => incoming.get(id) === 0).sort(preference);
    // Conflicting legacy orders are resolved deterministically without losing an event.
    const next = result.length === 0 ? firstId : ready[0] || [...remaining].sort(preference)[0];
    remaining.delete(next); result.push(next);
    for (const target of edges.get(next)) incoming.set(target, incoming.get(target) - 1);
  }
  return result;
}

export function projectTrackerOperations(operations = []) {
  const ops = validateTrackerOperations(operations);
  const { stages, aliases } = projectStages(ops);
  const applications = new Map();
  for (const op of ops) {
    if (op.kind === 'stage') continue;
    if (!applications.has(op.applicationId)) applications.set(op.applicationId, { fields: new Map(), events: new Map(), orders: [], deletes: new Map(), restores: new Map(), first: op });
    const app = applications.get(op.applicationId);
    if (op.kind === 'application') assignFields(app.fields, op);
    else if (op.kind === 'restore') {
      const key = serialized([op.eventId, op.deleteId]);
      if (!app.restores.has(key) || compareOps(app.restores.get(key), op) < 0) app.restores.set(key, op);
    } else {
      if (!app.events.has(op.eventId)) app.events.set(op.eventId, { fields: new Map(), first: op, initialType: null });
      const event = app.events.get(op.eventId);
      event.initialType ||= op.kind === 'event' ? op.fields.type : op.event.type;
      if (op.kind === 'event') assignFields(event.fields, op);
      else {
        const key = serialized([op.eventId, op.deleteId]);
        const prior = app.deletes.get(key);
        requireValue(!prior || serialized(prior.event) === serialized(op.event) && serialized(prior.order) === serialized(op.order), '同一删除编号对应不同记录');
        if (!prior || compareOps(prior, op) < 0) app.deletes.set(key, op);
        // The delete payload is recovery data, not a new field edit.
        for (const [field, value] of Object.entries(op.event)) if (field !== 'id' && !event.fields.has(field)) event.fields.set(field, { op: { ...op, clock: 0 }, value });
      }
      if (op.order) app.orders.push(op.order);
    }
  }
  const projected = [], deletedEvents = [];
  for (const [id, app] of [...applications].sort((a, b) => compareOps(a[1].first, b[1].first) || compareText(a[0], b[0]))) {
    const fields = valuesOf(app.fields);
    requireValue(text(fields.company, 120) && text(fields.role, 400), '申请缺少公司或岗位');
    const firstEvents = [...app.events].filter(([, event]) => event.initialType === 'submitted');
    requireValue(firstEvents.length === 1, '申请必须保留唯一首次投递');
    const firstId = firstEvents[0][0];
    const events = new Map([...app.events].map(([eventId, value]) => {
      const data = valuesOf(value.fields);
      if (eventId === firstId) data.type = 'submitted';
      if (!data.dueDate) data.dueTime = '';
      // A full date determines its year; an independent legacy year edit cannot
      // make an ISO event internally inconsistent after concurrent field edits.
      if (isoDate(data.date) && data.year != null) data.year = Number(data.date.slice(0, 4));
      else if (data.year === null) delete data.year;
      return [eventId, completeEvent({ id: eventId, ...data })];
    }));
    const submitted = [...events.values()].filter(event => event.type === 'submitted');
    requireValue(submitted.length === 1, '申请必须保留唯一首次投递');
    const order = eventOrder(app.events, app.orders, submitted[0].id);
    const activeByEvent = new Map();
    for (const [key, deletion] of app.deletes) {
      const restoration = app.restores.get(key);
      if (restoration && compareOps(restoration, deletion) > 0) continue;
      requireValue(deletion.eventId !== submitted[0].id, '不能删除首次投递');
      const prior = activeByEvent.get(deletion.eventId);
      if (!prior || compareOps(prior, deletion) < 0) activeByEvent.set(deletion.eventId, deletion);
    }
    for (const [eventId, deletion] of activeByEvent) deletedEvents.push({ id: deletion.deleteId, applicationId: id, event: events.get(eventId), order: [...order] });
    projected.push({ id, company: fields.company.trim(), role: fields.role.trim(), prepPhase: aliases.get(fields.prepPhase) || fields.prepPhase || '', season: fields.season || '',
      events: order.filter(eventId => !activeByEvent.has(eventId)).map(eventId => events.get(eventId)) });
  }
  return { applications: projected, deletedEvents, stages };
}

function snapshotData(snapshot = {}) {
  requireValue(object(snapshot), '快照无效');
  const { applications = [], deletedEvents = [], stages = [] } = snapshot;
  requireValue(Array.isArray(applications) && applications.length <= 10000 && Array.isArray(stages) && stages.length <= 1000
    && Array.isArray(deletedEvents) && deletedEvents.length <= 10000, '快照列表无效');
  const appIds = new Set(), stageIds = new Set(), deletionIds = new Set();
  for (const app of applications) {
    requireValue(object(app) && validId(app.id) && !appIds.has(app.id), '申请编号缺失或重复'); appIds.add(app.id);
    fieldsFor('application', { company: app.company, role: app.role, prepPhase: app.prepPhase || '', season: app.season || '' });
    requireValue(Array.isArray(app.events) && app.events.length >= 1 && app.events.length <= 1000, '进展列表无效');
    const events = app.events.map(completeEvent);
    requireValue(events[0].type === 'submitted' && events.slice(1).every(event => event.type !== 'submitted') && new Set(events.map(event => event.id)).size === events.length, '进展编号重复或首次投递无效');
  }
  for (const stage of stages) {
    requireValue(object(stage) && validId(stage.id) && !stageIds.has(stage.id), 'Stage 编号缺失或重复'); stageIds.add(stage.id);
    fieldsFor('stage', { label: stage.label, description: stage.description || '', recordedDate: stage.recordedDate ?? null });
    if (stage.importedIds) idList(stage.importedIds, { max: 1000 });
  }
  for (const deleted of deletedEvents) {
    requireValue(object(deleted) && validId(deleted.id) && !deletionIds.has(deleted.id) && appIds.has(deleted.applicationId), '删除记录无效'); deletionIds.add(deleted.id);
    const app = applications.find(item => item.id === deleted.applicationId);
    const event = completeEvent(deleted.event);
    const order = idList(deleted.order, { min: 2 });
    requireValue(event.type !== 'submitted' && !app.events.some(item => item.id === event.id) && order[0] === app.events[0].id && order.indexOf(event.id) > 0, '删除记录与申请不一致');
  }
  return { applications, deletedEvents, stages };
}

function baselineId(op) {
  // Four independent 32-bit hashes give deterministic compact content IDs.
  // Any collision is still rejected by immutable-ID validation, never overwritten.
  const value = serialized(op), seeds = [2166136261, 2246822519, 3266489917, 668265263];
  const digest = seeds.map(seed => {
    let hash = seed;
    for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619) >>> 0;
    return hash.toString(16).padStart(8, '0');
  }).join('');
  return `migration-${digest}`;
}
const appFields = app => ({ company: app.company, role: app.role, prepPhase: app.prepPhase || '', season: app.season || '' });
const eventFields = event => Object.fromEntries(Object.entries({ type: event.type, date: event.date, year: event.year ?? null, dueDate: event.dueDate || '', dueTime: event.dueTime || '' }));
const stageFields = stage => Object.fromEntries(Object.entries({ label: stage.label, description: stage.description || '', recordedDate: stage.recordedDate ?? null,
  ...Object.fromEntries(['createdAt', 'capturedAt', 'updatedAt', 'trackerImportDate'].filter(key => own(stage, key)).map(key => [key, stage[key]])) }));
const entityKey = op => serialized([op.kind, op.applicationId || op.stageId, op.eventId || '']);

export function migrateTrackerOperations(snapshot, existingOperations = []) {
  const data = snapshotData(snapshot), existing = validateTrackerOperations(existingOperations);
  const covered = new Map();
  for (const op of existing) if (op.fields) {
    const key = entityKey(op);
    if (!covered.has(key)) covered.set(key, new Set());
    Object.keys(op.fields).forEach(field => covered.get(key).add(field));
  }
  const added = [];
  const add = (details, position = 0) => {
    const op = { clock: 0, ...details };
    if (op.fields) {
      const known = covered.get(entityKey(op)) || new Set();
      op.fields = Object.fromEntries(Object.entries(op.fields).filter(([field]) => !known.has(field)));
      if (!Object.keys(op.fields).length) {
        if (op.kind !== 'stage') return;
        const knownAliases = new Set(existing.filter(item => item.kind === 'stage' && item.stageId === op.stageId).flatMap(item => item.aliases || []));
        op.aliases = (op.aliases || []).filter(alias => !knownAliases.has(alias));
        if (!op.aliases.length) return;
        const label = existing.filter(item => item.kind === 'stage' && item.stageId === op.stageId && own(item.fields, 'label')).at(-1)?.fields.label;
        op.fields = { label: label || details.fields.label };
      }
    }
    added.push({ id: `migration-${op.kind}-${String(position).padStart(6, '0')}-${baselineId(op).slice(10)}`, ...op });
  };
  for (const [position, app] of data.applications.entries()) {
    add({ kind: 'application', applicationId: app.id, fields: appFields(app) }, position);
    app.events.forEach((event, index) => add({ kind: 'event', applicationId: app.id, eventId: event.id, fields: eventFields(event), order: app.events.slice(Math.max(0, index - 1), index + 1).map(item => item.id) }));
  }
  for (const deleted of data.deletedEvents) if (!existing.some(op => op.kind === 'delete' && op.applicationId === deleted.applicationId && op.eventId === deleted.event.id && op.deleteId === deleted.id)) {
    add({ kind: 'delete', applicationId: deleted.applicationId, eventId: deleted.event.id, deleteId: deleted.id, event: deleted.event, order: deleted.order });
  }
  for (const [position, stage] of data.stages.entries()) add({ kind: 'stage', stageId: stage.id, fields: stageFields(stage), ...(stage.importedIds?.length ? { aliases: stage.importedIds } : {}) }, position);
  return mergeTrackerOperations(existing, added);
}

export function diffTrackerOperations(beforeSnapshot, afterSnapshot, existingOperations = []) {
  const before = snapshotData(beforeSnapshot), after = snapshotData(afterSnapshot), existing = validateTrackerOperations(existingOperations);
  const clock = existing.reduce((highest, op) => Math.max(highest, op.clock), 0) + 1;
  requireValue(Number.isSafeInteger(clock), '同步时钟已超出范围');
  const added = [];
  const add = details => added.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, clock, ...details });
  const changed = (prior, next) => Object.fromEntries(Object.entries(next).filter(([key, value]) => !prior || serialized(prior[key]) !== serialized(value)));
  for (const app of after.applications) {
    const prior = before.applications.find(item => item.id === app.id);
    const fields = changed(prior && appFields(prior), appFields(app));
    if (Object.keys(fields).length) add({ kind: 'application', applicationId: app.id, fields });
    app.events.forEach((event, index) => {
      const priorEvent = prior?.events.find(item => item.id === event.id);
      const restored = before.deletedEvents.find(item => item.applicationId === app.id && item.event.id === event.id);
      const fields = changed(priorEvent ? eventFields(priorEvent) : restored ? eventFields(restored.event) : null, eventFields(event));
      if (Object.keys(fields).length) add({ kind: 'event', applicationId: app.id, eventId: event.id, fields, ...(!priorEvent && !restored ? { order: app.events.slice(Math.max(0, index - 1), index + 1).map(item => item.id) } : {}) });
      if (restored && !after.deletedEvents.some(item => item.id === restored.id)) add({ kind: 'restore', applicationId: app.id, eventId: event.id, deleteId: restored.id });
    });
  }
  for (const deleted of after.deletedEvents) if (!before.deletedEvents.some(item => item.id === deleted.id)) {
    add({ kind: 'delete', applicationId: deleted.applicationId, eventId: deleted.event.id, deleteId: deleted.id, event: deleted.event, order: deleted.order });
  }
  for (const stage of after.stages) {
    const prior = before.stages.find(item => item.id === stage.id);
    const fields = changed(prior && stageFields(prior), stageFields(stage));
    const aliases = (stage.importedIds || []).filter(id => !prior?.importedIds?.includes(id));
    if (Object.keys(fields).length || aliases.length) add({ kind: 'stage', stageId: stage.id, fields: Object.keys(fields).length ? fields : { label: stage.label }, ...(aliases.length ? { aliases } : {}) });
  }
  return validateTrackerOperations(added);
}
