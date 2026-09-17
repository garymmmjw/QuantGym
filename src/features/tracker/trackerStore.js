import { STATUS_META } from './dataModel.js';

// Keep the same key so date-only records migrate on their next successful save.
// Old v1 tabs reject v2 envelopes instead of rewriting away deadline clock times.
const VERSION = 2;
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
    if (raw === null) return [];
    let envelope;
    try { envelope = JSON.parse(raw); } catch { throw new Error('投递记录无法读取，原始数据已保留。'); }
    if (!object(envelope) || ![1, VERSION].includes(envelope.version) || envelope.ownerId !== ownerId) throw new Error('投递记录的账户或版本不匹配，原始数据已保留。');
    return validateApplications(envelope.applications);
  }
  function refresh() {
    try { publish(read()); } catch (error) { publish(snapshot.applications, error.message); }
    return snapshot;
  }
  function mutate(update) {
    let latest;
    try {
      latest = read();
      const next = validateApplications(update(latest));
      storage.setItem(key, JSON.stringify({ version: VERSION, ownerId, applications: next }));
      publish(next);
    } catch (error) {
      publish(latest || snapshot.applications, error.message || '保存失败，请检查浏览器存储空间。');
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
      mutate(applications => {
        const latest = applications.find(item => item.id === incoming.id);
        if (!latest) throw new Error('没有找到这份申请，请刷新后重试。');
        // Forms can stay open while another tab records progress. There is no
        // event replacement here, so retain durable events and append only
        // genuinely new IDs from the submitted form.
        const eventIds = new Set(latest.events.map(event => event.id));
        const events = [...latest.events, ...incoming.events.filter(event => !eventIds.has(event.id))];
        return applications.map(item => item.id === incoming.id ? {...incoming, events} : item);
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
