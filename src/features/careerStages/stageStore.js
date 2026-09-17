const VERSION = 1;
const PREFIX = "quantgym.career-stages.v1:";
const UPDATED_EVENT = "quantgym:career-stages-updated";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const cleanLabel = (value) => typeof value === "string" ? value.trim() : "";
const labelKey = (value) => cleanLabel(value).toLocaleLowerCase("en-US");
const validCount = (value) => Number.isSafeInteger(value) && value >= 0;

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function copy(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { throw new Error("Stage 内容无法保存，请检查填写内容。"); }
}

function browserStorage() {
  try { return globalThis.localStorage; }
  catch { return null; }
}

export function stageStorageKey(ownerId = "guest", namespace = "") {
  if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("无法识别当前账户，请重新登录。");
  if (typeof namespace !== "string") throw new Error("Stage 存储空间无效。");
  return `${PREFIX}${encodeURIComponent(ownerId)}${namespace ? `:${namespace}` : ""}`;
}

export function localDateKey(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error("日期无效。");
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nextStageLabel(stages = []) {
  let highest = 0;
  for (const stage of stages) {
    const match = cleanLabel(stage?.label).match(/^stage\s*(\d+)$/i);
    const value = match ? Number(match[1]) : 0;
    if (Number.isSafeInteger(value) && value > highest) highest = value;
  }
  let next = highest < Number.MAX_SAFE_INTEGER ? highest + 1 : 1;
  const labels = new Set(stages.map((stage) => labelKey(stage?.label)));
  while (labels.has(labelKey(`Stage ${next}`))) next += 1;
  return `Stage ${next}`;
}

export function sortCareerStages(stages = []) {
  // Numbered stages follow their stage number, independently of record dates.
  // Custom names have no numeric order, so keep their insertion order afterward.
  return stages.map((stage, index) => {
    const match = cleanLabel(stage?.label).match(/^stage\s*(\d+)$/i);
    return { stage, index, number: match ? BigInt(match[1]) : null };
  }).sort((a, b) => {
    if (a.number !== null && b.number !== null) return a.number < b.number ? -1 : a.number > b.number ? 1 : a.index - b.index;
    if (a.number !== null) return -1;
    if (b.number !== null) return 1;
    return a.index - b.index;
  }).map(({ stage }) => stage);
}

export function getCurrentStage(stages = []) {
  return sortCareerStages(stages).at(-1) || null;
}

function validateStage(stage, { allowUnknown = false } = {}) {
  if (!object(stage) || typeof stage.id !== "string" || !stage.id.trim()) throw new Error("Stage 记录缺少有效编号。");
  if (!cleanLabel(stage.label) || stage.label.length > 40) throw new Error("请填写 Stage 名称，最多 40 个字符。");
  if (typeof stage.description !== "string" || stage.description.length > 200) throw new Error("阶段描述最多 200 个字符。");
  const unknown = allowUnknown && stage.recordedDate === null;
  if (!unknown && !validDate(stage.recordedDate)) throw new Error("请填写有效的记录日期。");
  // Older records may contain manual counts. Keep them readable, but new writes
  // omit these fields because displayed counts come from practice history.
  if (stage.solvedCount != null && !validCount(stage.solvedCount)) throw new Error("已保存的 Stage 刷题数无效。");
  for (const field of ["createdAt", "capturedAt", "updatedAt"]) {
    if (stage[field] != null && (typeof stage[field] !== "string" || !Number.isFinite(Date.parse(stage[field])))) {
      throw new Error("Stage 记录中的保存时间无效。");
    }
  }
  if (stage.countSource != null && typeof stage.countSource !== "string") throw new Error("Stage 刷题数来源无效。");
  if (stage.importedIds != null && (!Array.isArray(stage.importedIds)
    || stage.importedIds.some((id) => typeof id !== "string" || !id.trim())
    || new Set(stage.importedIds).size !== stage.importedIds.length)) throw new Error("Stage 导入编号无效。");
  return stage;
}

function validateStages(stages) {
  if (!Array.isArray(stages)) throw new Error("Stage 数据格式无效。");
  const ids = new Set();
  const labels = new Set();
  for (const stage of stages) {
    validateStage(stage, { allowUnknown: true });
    const stageIds = [stage.id, ...(stage.importedIds || [])];
    if (new Set(stageIds).size !== stageIds.length || stageIds.some((id) => ids.has(id))) throw new Error("Stage 编号重复，请检查已保存的数据。");
    if (labels.has(labelKey(stage.label))) throw new Error("这个 Stage 名称已存在，请使用其他名称。");
    stageIds.forEach((id) => ids.add(id));
    labels.add(labelKey(stage.label));
  }
  return stages;
}

function parseEnvelope(raw, ownerId) {
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch { throw new Error("已保存的 Stage 数据无法读取，原始数据已保留。"); }
  if (!object(envelope) || envelope.version !== VERSION || envelope.ownerId !== ownerId) {
    throw new Error("Stage 数据的账户或版本不匹配，原始数据已保留。");
  }
  validateStages(envelope.stages);
  return envelope;
}

function createId() {
  return `stage-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}

// A stage stores preparation metadata; practice counts are derived separately.
export function createCareerStageStore({ ownerId = "guest", namespace = "", storage = browserStorage(), eventTarget = globalThis.window, defaults = [] } = {}) {
  const key = stageStorageKey(ownerId, namespace);
  const listeners = new Set();
  let snapshot = freeze({ stages: [], error: "" });
  let snapshotSignature = JSON.stringify(snapshot);
  let disposed = false;

  function publish(stages, error = "") {
    const next = { stages, error };
    const signature = JSON.stringify(next);
    if (signature === snapshotSignature) return;
    snapshotSignature = signature;
    snapshot = freeze(next);
    for (const listener of [...listeners]) listener();
  }

  function read() {
    if (!storage?.getItem || !storage?.setItem) throw new Error("浏览器暂时无法保存 Stage，请检查存储权限后重试。");
    let raw;
    try { raw = storage.getItem(key); }
    catch { throw new Error("暂时无法读取 Stage，原始数据已保留，请重试。"); }
    return raw === null ? { version: VERSION, ownerId, stages: [] } : parseEnvelope(raw, ownerId);
  }

  function refresh() {
    if (disposed) return snapshot;
    try { publish(read().stages); }
    catch (error) { publish(snapshot.stages, error.message); }
    return snapshot;
  }

  function notifySaved() {
    if (!eventTarget?.dispatchEvent) return;
    try {
      const CustomEventClass = eventTarget.CustomEvent || globalThis.CustomEvent;
      const event = CustomEventClass
        ? new CustomEventClass(UPDATED_EVENT, { detail: { key } })
        : Object.assign(new Event(UPDATED_EVENT), { detail: { key } });
      eventTarget.dispatchEvent(event);
    } catch { /* Storage was already saved; event delivery must not report a failed save. */ }
  }

  function mutate(updater) {
    if (disposed) throw new Error("Stage 页面已关闭，请重新打开后操作。");
    let latest;
    try { latest = read(); }
    catch (error) { publish(snapshot.stages, error.message); throw error; }
    const next = updater(latest.stages);
    validateStages(next.stages);
    if (next.stages === latest.stages) {
      publish(latest.stages);
      return next.result;
    }
    const envelope = copy({ ...latest, version: VERSION, ownerId, stages: next.stages });
    try { storage.setItem(key, JSON.stringify(envelope)); }
    catch {
      const error = new Error("Stage 未能保存，请检查浏览器存储空间后重试。");
      publish(latest.stages, error.message);
      throw error;
    }
    publish(envelope.stages);
    notifySaved();
    return next.result?.id ? snapshot.stages.find((stage) => stage.id === next.result.id) : next.result;
  }

  function ensureStages(imports = []) {
    if (!Array.isArray(imports)) throw new Error("待导入的 Stage 数据格式无效。");
    return mutate((stages) => {
      const merged = [...stages];
      let changed = false;
      for (const item of imports) {
        if (!object(item) || typeof item.id !== "string" || !item.id.trim()) throw new Error("待导入的 Stage 缺少有效编号。");
        if (merged.some((stage) => stage.id === item.id || stage.importedIds?.includes(item.id))) continue;
        // A milestone may have been created on the homepage before the tracker
        // imports its defaults. Keep its metadata and remember the source id so
        // application links and future imports survive an explicit rename.
        const matchedIndex = merged.findIndex((stage) => labelKey(stage.label) === labelKey(item.label));
        if (matchedIndex !== -1) {
          const existing = merged[matchedIndex];
          merged[matchedIndex] = { ...existing, importedIds: [...(existing.importedIds || []), item.id] };
          changed = true;
          continue;
        }
        const stage = {
          ...copy(item), label: cleanLabel(item.label), description: cleanLabel(item.description),
          recordedDate: null, capturedAt: null,
          createdAt: new Date().toISOString()
        };
        delete stage.solvedCount;
        delete stage.countSource;
        validateStage(stage, { allowUnknown: true });
        merged.push(stage);
        changed = true;
      }
      return { stages: changed ? merged : stages, result: undefined };
    });
  }

  function addStage(input) {
    if (!object(input)) throw new Error("请填写 Stage 信息。");
    return mutate((stages) => {
      const now = new Date().toISOString();
      const stage = {
        ...copy(input), id: createId(), label: cleanLabel(input.label), description: cleanLabel(input.description),
        recordedDate: input.recordedDate, createdAt: now, capturedAt: now
      };
      delete stage.solvedCount;
      delete stage.countSource;
      validateStage(stage);
      return { stages: [...stages, stage], result: stage };
    });
  }

  function updateStage(id, patch) {
    if (!object(patch)) throw new Error("请填写要修改的 Stage 信息。");
    return mutate((stages) => {
      const existing = stages.find((stage) => stage.id === id);
      if (!existing) throw new Error("没有找到这个 Stage，请刷新后重试。");
      const stage = { ...existing, ...copy(patch), id: existing.id, createdAt: existing.createdAt, capturedAt: existing.capturedAt,
        updatedAt: new Date().toISOString() };
      if (own(patch, "label")) stage.label = cleanLabel(patch.label);
      if (own(patch, "description")) stage.description = cleanLabel(patch.description);
      if (own(patch, "recordedDate")) stage.recordedDate = patch.recordedDate;
      delete stage.solvedCount;
      delete stage.countSource;
      validateStage(stage);
      if (!stage.capturedAt) stage.capturedAt = stage.updatedAt;
      return { stages: stages.map((value) => value.id === id ? stage : value), result: stage };
    });
  }

  function onStorage(event) {
    if ((event.key === key || event.key === null) && (!event.storageArea || event.storageArea === storage)) refresh();
  }
  function onUpdated(event) { if (event.detail?.key === key) refresh(); }
  function attachEvents() {
    eventTarget?.addEventListener?.("storage", onStorage);
    eventTarget?.addEventListener?.(UPDATED_EVENT, onUpdated);
    eventTarget?.addEventListener?.("focus", refresh);
  }
  function detachEvents() {
    eventTarget?.removeEventListener?.("storage", onStorage);
    eventTarget?.removeEventListener?.(UPDATED_EVENT, onUpdated);
    eventTarget?.removeEventListener?.("focus", refresh);
  }
  refresh();
  if (defaults.length) {
    try { ensureStages(defaults); }
    catch (error) { publish(snapshot.stages, error.message); }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      // React StrictMode may discard a constructed store or replay cleanup.
      // Only subscribed stores own browser listeners; a replay can reconnect.
      if (!listeners.size) {
        disposed = false;
        attachEvents();
        refresh();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) detachEvents();
      };
    },
    ensureStages, addStage, updateStage, refresh,
    dispose() {
      disposed = true;
      listeners.clear();
      detachEvents();
    }
  };
}

export function getSavedQuestionCount({ ownerId, storage = browserStorage(), namespace = "" } = {}) {
  // Preview QA must never consult a real user's progress.
  if (namespace || !ownerId || ownerId === "guest" || typeof ownerId !== "string") return null;
  try {
    const raw = storage?.getItem(`quantMemoryBoard.userState.v1.${ownerId}`);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!object(state) || !Array.isArray(state.problemStates)
      || state.problemStates.some((item) => !object(item) || typeof item.problemId !== "string" || !item.problemId.trim()
        || (item.completed != null && typeof item.completed !== "boolean"))) return null;
    return new Set(state.problemStates.filter((item) => item.completed === true).map((item) => item.problemId)).size;
  } catch { return null; }
}
