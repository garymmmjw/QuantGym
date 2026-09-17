import { STATUS_META } from './dataModel.js';

// Keep the same key and migrate on the next successful save. Earlier tabs reject
// v3 envelopes instead of dropping deletion tombstones and resurrecting events.
const VERSION = 3;
const UPDATED_EVENT = 'quantgym:tracker-updated';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => JSON.parse(JSON.stringify(value));
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function trackerStorageKey(ownerId, namespace = '') {
  if (!validText(ownerId, 300) || ownerId === 'guest') throw new Error('请先登录，再保存投递记录。');
  return `quantgym.tracker.v1:${encodeURIComponent(ownerId)}${namespace ? `:${namespace}` : ''}`;
}

function validDate(value, partial = false) {
  if (typeof value !== 'string') return false;
  if (partial && /^\d{1,2}\/\d{1,2}$/.test(value)) {
    const [month, day] = value.split('/').map(Number);
    return month >= 1 && month <= 12 && day >= 1 && day <= [31,29,31,30,31,30,31,31,30,31,30,31][month - 1];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateApplications(applications) {
  if (!Array.isArray(applications) || applications.length > 10000) throw new Error('投递记录格式无效。');
  const ids = new Set();
  return applications.map(application => {
    if (!object(application) || !validText(application.id, 200) || ids.has(application.id)) throw new Error('申请编号缺失或重复。');
    ids.add(application.id);
    if (!validText(application.company, 120) || !validText(application.role, 400)) throw new Error('每份申请都需要有效的公司和岗位名称。');
    if (application.prepPhase != null && (typeof application.prepPhase !== 'string' || application.prepPhase.length > 200)) throw new Error('申请的 Stage 编号无效。');
    if (!Array.isArray(application.events) || application.events.length < 1 || application.events.length > 1000) throw new Error('每份申请都需要投递进展记录。');
    const eventIds = new Set();
    const events = application.events.map(event => {
      if (!object(event) || !validText(event.id, 200) || eventIds.has(event.id) || !Object.hasOwn(STATUS_META, event.type)) throw new Error('申请进展格式无效。');
      eventIds.add(event.id);
      const dueDate = event.dueDate ?? '';
      const dueTime = event.dueTime ?? '';
      if (!validDate(event.date, true) || (dueDate !== '' && !validDate(dueDate))) throw new Error('申请进展的日期无效。');
      if (typeof dueTime !== 'string' || (dueTime !== '' && (!dueDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)))) throw new Error('截止时间无效，请先填写截止日期，再填写小时和分钟。');
      if (event.year != null && (!Number.isInteger(event.year) || event.year < 1 || event.year > 9999)) throw new Error('申请进展的年份无效。');
      return { id: event.id, type: event.type, date: event.date, dueDate, dueTime, ...(event.year ? { year: event.year } : {}) };
    });
    if (events[0].type !== 'submitted') throw new Error('第一条进展应为投递记录。');
    return { id: application.id, company: application.company.trim(), role: application.role.trim(), prepPhase: application.prepPhase || '', season: String(application.season || '').slice(0, 20), events };
  });
}

export function validateTrackerImport(payload) {
  if (!object(payload)) throw new Error('请选择有效的投递记录文件。');
  const applications = validateApplications(payload.applications);
  const stages = payload.stages || [];
  if (!Array.isArray(stages) || stages.length > 1000) throw new Error('Stage 记录格式无效。');
  const ids = new Set();
  const labels = new Set();
  const normalizedStages = stages.map(stage => {
    if (!object(stage) || !validText(stage.id, 200) || ids.has(stage.id)) throw new Error('Stage 编号缺失或重复。');
    if (!validText(stage.label, 40) || labels.has(stage.label.trim().toLowerCase())) throw new Error('Stage 名称缺失或重复。');
    if (stage.description != null && (typeof stage.description !== 'string' || stage.description.length > 200)) throw new Error('Stage 描述最多 200 个字符。');
    if (stage.recordedDate != null && !validDate(stage.recordedDate)) throw new Error('Stage 的记录日期无效。');
    const importedIds = stage.importedIds || [];
    if (!Array.isArray(importedIds) || importedIds.some(id => !validText(id, 200) || id === stage.id || ids.has(id)) || new Set(importedIds).size !== importedIds.length) throw new Error('Stage 的历史编号无效或重复。');
    ids.add(stage.id);
    importedIds.forEach(id => ids.add(id));
    labels.add(stage.label.trim().toLowerCase());
    return { id: stage.id, label: stage.label.trim(), description: stage.description || '', recordedDate: stage.recordedDate || null, importedIds };
  });
  return { applications: applications.map(application => {
    const stage = normalizedStages.find(item => item.importedIds.includes(application.prepPhase));
    return stage ? {...application, prepPhase:stage.id} : application;
  }), stages: normalizedStages };
}

function validateDeletedEvents(deletedEvents, applications) {
  if (!Array.isArray(deletedEvents) || deletedEvents.length > 10000) throw new Error('已删除进展的记录格式无效，原始数据已保留。');
  const ids = new Set();
  const targets = new Set();
  return deletedEvents.map(item => {
    if (!object(item) || !validText(item.id, 200) || ids.has(item.id) || !validText(item.applicationId, 200)) throw new Error('已删除进展的编号无效，原始数据已保留。');
    const application = applications.find(row => row.id === item.applicationId);
    const target = JSON.stringify([item.applicationId, item.event?.id]);
    if (!application || targets.has(target) || application.events.some(event => event.id === item.event?.id)) throw new Error('已删除进展与现有记录不匹配，原始数据已保留。');
    if (!Array.isArray(item.order) || item.order.length < 2 || item.order.length > 11000
      || item.order.some(id => !validText(id, 200)) || new Set(item.order).size !== item.order.length
      || item.order[0] !== application.events[0].id || item.order.indexOf(item.event?.id) < 1) throw new Error('已删除进展的顺序无效，原始数据已保留。');
    const event = validateApplications([{ ...application, events: [application.events[0], item.event] }])[0].events[1];
    ids.add(item.id);
    targets.add(target);
    return { id: item.id, applicationId: item.applicationId, event, order: [...item.order] };
  });
}

function restoredEventIndex(originalOrder, eventId, currentOrder) {
  const originalIndex = originalOrder.indexOf(eventId);
  const followingId = originalOrder.slice(originalIndex + 1).find(id => currentOrder.includes(id));
  const previousId = originalOrder.slice(0, originalIndex).findLast(id => currentOrder.includes(id));
  return followingId ? currentOrder.indexOf(followingId) : currentOrder.indexOf(previousId) + 1;
}

function frozenSnapshot(applications, error = '') {
  const value = copy({ applications, error });
  value.applications.forEach(application => {
    application.events.forEach(Object.freeze);
    Object.freeze(application.events);
    Object.freeze(application);
  });
  Object.freeze(value.applications);
  return Object.freeze(value);
}

export function createTrackerStore({ ownerId, namespace = '', storage = globalThis.localStorage, eventTarget = globalThis.window } = {}) {
  const key = trackerStorageKey(ownerId, namespace);
  const listeners = new Set();
  let snapshot = frozenSnapshot([]);
  let signature = JSON.stringify(snapshot);
  function publish(applications, error = '') {
    const nextSignature = JSON.stringify({ applications, error });
    if (nextSignature === signature) return;
    signature = nextSignature;
    snapshot = frozenSnapshot(applications, error);
    [...listeners].forEach(listener => listener());
  }
  function read() {
    if (!storage?.getItem || !storage?.setItem) throw new Error('此浏览器暂时无法保存投递记录。');
    const raw = storage.getItem(key);
    if (raw === null) return { applications: [], deletedEvents: [] };
    let envelope;
    try { envelope = JSON.parse(raw); } catch { throw new Error('投递记录无法读取，原始数据已保留。'); }
    if (!object(envelope) || ![1, 2, VERSION].includes(envelope.version) || envelope.ownerId !== ownerId) throw new Error('投递记录的账户或版本不匹配，原始数据已保留。');
    const applications = validateApplications(envelope.applications);
    const deletedEvents = validateDeletedEvents(envelope.version === VERSION ? envelope.deletedEvents : [], applications);
    return { applications, deletedEvents };
  }
  function refresh() {
    try { publish(read().applications); } catch (error) { publish(snapshot.applications, error.message); }
    return snapshot;
  }
  function mutate(update) {
    let latest;
    try {
      latest = read();
      const next = validateApplications(update(latest.applications, latest.deletedEvents));
      const deletedEvents = validateDeletedEvents(latest.deletedEvents, next);
      storage.setItem(key, JSON.stringify({ version: VERSION, ownerId, applications: next, deletedEvents }));
      publish(next);
    } catch (error) {
      publish(latest?.applications || snapshot.applications, error.message || '保存失败，请检查浏览器存储空间。');
      throw error;
    }
    try {
      const EventClass = eventTarget?.CustomEvent || globalThis.CustomEvent;
      if (EventClass) eventTarget?.dispatchEvent?.(new EventClass(UPDATED_EVENT, { detail: { key } }));
    } catch { /* Persistence succeeded even if another tab cannot be notified. */ }
  }
  function onStorage(event) { if ((event.key === key || event.key === null) && (!event.storageArea || event.storageArea === storage)) refresh(); }
  function onUpdated(event) { if (event.detail?.key === key) refresh(); }
  function attach() { eventTarget?.addEventListener?.('storage', onStorage); eventTarget?.addEventListener?.(UPDATED_EVENT, onUpdated); eventTarget?.addEventListener?.('focus', refresh); }
  function detach() { eventTarget?.removeEventListener?.('storage', onStorage); eventTarget?.removeEventListener?.(UPDATED_EVENT, onUpdated); eventTarget?.removeEventListener?.('focus', refresh); }
  refresh();
  return {
    key, getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!listeners.size) { attach(); refresh(); }
      listeners.add(listener);
      return () => { listeners.delete(listener); if (!listeners.size) detach(); };
    },
    refresh,
    addApplication(application) {
      mutate(applications => {
        if (applications.some(item => item.id === application.id)) throw new Error('这份申请已存在。');
        return [...applications, application];
      });
    },
    updateApplication(application) {
      const incoming = validateApplications([application])[0];
      mutate((applications, deletedEvents) => {
        const latest = applications.find(item => item.id === incoming.id);
        if (!latest) throw new Error('没有找到这份申请，请刷新后重试。');
        // Forms can stay open while another tab records progress. There is no
        // event replacement here, so retain durable events and append only
        // genuinely new IDs from the submitted form.
        const eventIds = new Set(latest.events.map(event => event.id));
        const removedIds = new Set(deletedEvents.filter(item => item.applicationId === incoming.id).map(item => item.event.id));
        const events = [...latest.events, ...incoming.events.filter(event => !eventIds.has(event.id) && !removedIds.has(event.id))];
        return applications.map(item => item.id === incoming.id ? {...incoming, events} : item);
      });
    },
    updateEvent(applicationId, eventId, changes = {}) {
      mutate(applications => {
        if (!object(changes)) throw new Error('请填写有效的进展信息。');
        const application = applications.find(item => item.id === applicationId);
        if (!application) throw new Error('没有找到这份申请，请刷新后重试。');
        const index = application.events.findIndex(event => event.id === eventId);
        if (index < 0) throw new Error('没有找到这条进展，请刷新后重试。');
        const existing = application.events[index];
        const edited = { ...existing };
        for (const field of ['type', 'date', 'year', 'dueDate', 'dueTime']) {
          if (Object.hasOwn(changes, field)) edited[field] = changes[field];
        }
        if (index === 0 && edited.type !== 'submitted') throw new Error('第一条进展应为投递记录。');
        if (index > 0 && edited.type === 'submitted') throw new Error('后续进展不能改为投递记录。');
        // Yearless imports may correct their month/day without guessing a year.
        // Full-date records retain a full date; an ISO correction owns its year.
        const changedDate = Object.hasOwn(changes, 'date') && edited.date !== existing.date;
        const legacyDate = /^\d{1,2}\/\d{1,2}$/.test(existing.date);
        if (!validDate(edited.date, legacyDate)) throw new Error('请填写有效的发生日期。');
        if (/^\d{4}-\d{2}-\d{2}$/.test(edited.date)) edited.year = Number(edited.date.slice(0, 4));
        else if ((Object.hasOwn(changes, 'year') || changedDate) && edited.year != null) {
          const [month, day] = edited.date.split('/');
          const dated = `${String(edited.year).padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          if (!validDate(dated)) throw new Error('申请进展的年份或日期无效。');
        }
        if (Object.hasOwn(changes, 'dueDate') && (edited.dueDate === '' || edited.dueDate == null)) {
          edited.dueDate = '';
          edited.dueTime = '';
        }
        const events = application.events.map((event, eventIndex) => eventIndex === index ? edited : event);
        return applications.map(item => item.id === applicationId ? { ...item, events } : item);
      });
    },
    updateEventDeadline(applicationId, eventId, changes = {}) {
      mutate(applications => {
        const application = applications.find(item => item.id === applicationId);
        if (!application) throw new Error('没有找到这份申请，请刷新后重试。');
        if (!application.events.some(event => event.id === eventId)) throw new Error('没有找到这条进展，请刷新后重试。');
        const events = application.events.map(event => {
          if (event.id !== eventId) return event;
          const hasDate = Object.hasOwn(changes, 'dueDate');
          const dueDate = hasDate ? changes.dueDate ?? '' : event.dueDate;
          const dueTime = hasDate && dueDate === '' ? '' : Object.hasOwn(changes, 'dueTime') ? changes.dueTime ?? '' : event.dueTime;
          return { ...event, dueDate, dueTime };
        });
        return applications.map(item => item.id === applicationId ? { ...item, events } : item);
      });
    },
    deleteEvent(applicationId, eventId) {
      let token;
      mutate((applications, deletedEvents) => {
        const application = applications.find(item => item.id === applicationId);
        if (!application) throw new Error('没有找到这份申请，请刷新后重试。');
        const index = application.events.findIndex(event => event.id === eventId);
        if (index < 0) throw new Error('没有找到这条进展，请刷新后重试。');
        if (index === 0) throw new Error('首次投递记录不能删除。');
        const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        // Include already-deleted neighbors so a later undo still knows where
        // they belong when another tab restores them first. New events stay in
        // their current order after the restored historical anchors.
        const order = application.events.map(event => event.id);
        for (const removed of deletedEvents.filter(item => item.applicationId === applicationId)) {
          order.splice(restoredEventIndex(removed.order, removed.event.id, order), 0, removed.event.id);
        }
        deletedEvents.push({ id, applicationId, event: application.events[index], order });
        token = Object.freeze({ scope: key, id });
        return applications.map(item => item.id === applicationId ? { ...item, events: item.events.filter(event => event.id !== eventId) } : item);
      });
      return token;
    },
    restoreEvent(token) {
      mutate((applications, deletedEvents) => {
        if (!object(token) || token.scope !== key || !validText(token.id, 200)) throw new Error('无法在此账户恢复这条记录。');
        const removedIndex = deletedEvents.findIndex(item => item.id === token.id);
        if (removedIndex < 0) throw new Error('这条记录已恢复，或撤销操作已失效。');
        const removed = deletedEvents[removedIndex];
        const application = applications.find(item => item.id === removed.applicationId);
        if (!application) throw new Error('没有找到这份申请，请刷新后重试。');
        if (application.events.some(event => event.id === removed.event.id)) throw new Error('这条进展已存在，现有内容已保留。');
        const insertAt = restoredEventIndex(removed.order, removed.event.id, application.events.map(event => event.id));
        const events = [...application.events.slice(0, insertAt), removed.event, ...application.events.slice(insertAt)];
        deletedEvents.splice(removedIndex, 1);
        return applications.map(item => item.id === application.id ? { ...item, events } : item);
      });
    },
    mergeApplications(imports) {
      const valid = validateApplications(imports);
      let added = 0;
      mutate(applications => {
        const ids = new Set(applications.map(item => item.id));
        const incoming = valid.filter(item => !ids.has(item.id));
        added = incoming.length;
        return [...applications, ...incoming];
      });
      return added;
    },
    dispose() { detach(); listeners.clear(); },
  };
}

// Validate the entire file first. Existing rows and stage metadata always win.
export function importTrackerPayload({ payload, trackerStore, stageStore }) {
  const validated = validateTrackerImport(payload);
  const existing = stageStore.refresh();
  if (existing.error) throw new Error(existing.error);
  const applicationSnapshot = trackerStore.refresh();
  if (applicationSnapshot.error) throw new Error(applicationSnapshot.error);
  try {
    stageStore.ensureStages(validated.stages.map(stage => ({...stage, trackerImportDate:stage.recordedDate})));
    for (const stage of validated.stages) {
      const matched = stageStore.getSnapshot().stages.find(item => item.id === stage.id);
      const preserved = existing.stages.some(item => item.id === stage.id || item.importedIds?.includes(stage.id) || item.label.trim().toLowerCase() === stage.label.toLowerCase());
      // A interrupted import can resume its own pending date without changing a
      // stage that was already recorded or created separately by this account.
      const pending = matched?.recordedDate === null && matched?.trackerImportDate === stage.recordedDate;
      if ((!preserved || pending) && stage.recordedDate) stageStore.updateStage(stage.id, { recordedDate: stage.recordedDate, trackerImportDate:null });
    }
    return trackerStore.mergeApplications(validated.applications);
  } catch (error) {
    throw new Error(`导入尚未完成，已保存的记录会保留。请重试；${error.message || '浏览器保存失败。'}`);
  }
}
