import { normalizeProgress } from './lessonProgress.mjs';
import { parseBackupText, validateLearnProgress } from './progressValidation.mjs';
import { learningStorageKey, resolveWengProblem } from './learningStore.mjs';
import { createTrainingProfile, validateTrainingProfile, submitTrainingAttempt, updateTrainingPreferences } from './scoring/training-system.mjs';
import { learningValuesEqual, LearningCloudConflictError, mergeLearnProgress, mergeLegacyLearnProgress,
  mergeTrainingPreferences, mergeLegacyTrainingProfile } from './learningCloudMerge.mjs';

const clone = value => structuredClone(value);
const own = (object, key) => Object.hasOwn(object, key);
export { LearningCloudConflictError } from './learningCloudMerge.mjs';

/** A controller belongs to one authenticated account AND API destination. All
 * writes require the network, use compare-and-swap, and update cache only after
 * server acknowledgement. There is deliberately no hidden offline write queue. */
export function createLearningCloudSync({ userId, sources = {}, load, save, storage = globalThis.localStorage,
  scope = 'default', isActive = () => true, onChange = () => {}, now = Date.now, maxRetries = 5 } = {}) {
  const learnKey = learningStorageKey(userId), trainingKey = learningStorageKey(userId, 'training');
  if (typeof load !== 'function' || typeof save !== 'function') throw TypeError('Cloud load/save functions are required.');
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw TypeError('Browser storage is unavailable.');
  const markerKey = `${learnKey}:cloud:${encodeURIComponent(scope)}:migration`;
  const backupKey = `${learnKey}:cloud:${encodeURIComponent(scope)}:legacy-backup`;
  const lessonIds = sources.library?.lessons?.map(lesson => lesson.id) || sources.lessonIds || [];
  const options = { lessonIds };
  let closed = false, initialized = false, snapshot = null, queue = Promise.resolve(), minimumRevision = 0;
  const startedAt = now(), defaultProfile = createTrainingProfile({ now: startedAt, id: `cloud-${startedAt}` });
  function guard() {
    if (closed || !isActive()) { const error = Error('账号已切换或页面已关闭，本次操作已停止。'); error.code = 'LEARNING_INACTIVE'; throw error; }
  }
  function run(action) {
    const task = queue.then(async () => { guard(); return action(); });
    queue = task.catch(() => {});
    return task;
  }
  function checkedData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !['learn', 'training'].includes(key)) || !own(data, 'learn') || !own(data, 'training')) throw Error('云端学习档案格式无效，未覆盖本地记录。');
    return {
      learn: data.learn === null ? normalizeProgress() : validateLearnProgress(data.learn, lessonIds),
      training: data.training === null ? clone(defaultProfile) : validateTrainingProfile(data.training, sources),
    };
  }
  function checkedEnvelope(value) {
    if (!value || value.version !== 1 || !Number.isInteger(value.revision) || value.revision < 0 || value.revision > 2147483647 || !own(value, 'data') || !own(value, 'updatedAt')) throw Error('云端学习档案响应无效，未覆盖本地记录。');
    return { version: 1, revision: value.revision, updatedAt: value.updatedAt,
      data: value.data === null ? null : checkedData(value.data),
      needsDefaults: value.data === null || value.data.learn === null || value.data.training === null };
  }
  function verifyCurrent(envelope) {
    if (envelope.revision < minimumRevision || (minimumRevision > 0 && envelope.needsDefaults)) {
      throw Error('云端记录版本回退或缺失，已停止保存以保护学习档案，请重新登录后重试。');
    }
    return envelope;
  }
  async function readRemote() { guard(); const value = await load(); guard(); return verifyCurrent(checkedEnvelope(value)); }
  async function writeRemote(envelope, data) {
    guard(); let value;
    try { value = await save({ version: 1, baseRevision: envelope.revision, data: clone(data) }); }
    catch (error) {
      guard();
      if (error?.status !== 409 && error?.response?.status !== 409) throw error;
      value = error.data || error.payload || error.body || error.response?.data;
      if (!value) throw error;
      const current = verifyCurrent(checkedEnvelope(value));
      if (current.revision <= envelope.revision) throw Error('云端冲突响应版本无效，未确认保存。');
      return { conflict: true, envelope: current };
    }
    guard();
    const current = verifyCurrent(checkedEnvelope(value));
    const conflict = value?.status === 409 || !!value?.error;
    if (conflict) {
      if (current.revision <= envelope.revision) throw Error('云端冲突响应版本无效，未确认保存。');
    } else if (current.revision !== envelope.revision + 1 || current.needsDefaults || !learningValuesEqual(current.data, data)) {
      throw Error('云端未确认完整保存，请保留页面后重试。');
    }
    return { conflict, envelope: current };
  }
  function publish(envelope) {
    guard();
    verifyCurrent(envelope);
    const data = envelope.data || checkedData({ learn: null, training: null });
    const next = { learnProgress: clone(data.learn), profile: clone(data.training), revision: envelope.revision, updatedAt: envelope.updatedAt, cacheWarning: '' };
    // Cache failure does not turn an acknowledged cloud write into a failed one.
    // The migration marker is stored first, so a partial cache write can never
    // cause previously migrated completion to be imported again next visit.
    minimumRevision = Math.max(minimumRevision, envelope.revision);
    try {
      storage.setItem(markerKey, JSON.stringify({ version: 1, complete: true, revision: minimumRevision }));
      storage.setItem(learnKey, JSON.stringify(data.learn)); storage.setItem(trainingKey, JSON.stringify(data.training));
    }
    catch { next.cacheWarning = '云端已保存，但此浏览器的本地缓存无法更新。'; }
    const changed = !learningValuesEqual(snapshot, next);
    snapshot = next;
    if (changed) onChange(clone(snapshot));
    return clone(snapshot);
  }
  function readMigration() {
    const raw = storage.getItem(markerKey);
    if (raw === null) return { complete: false, pending: false };
    const marker = parseBackupText(raw);
    const revision = marker?.complete === true ? marker.revision : marker?.baseRevision;
    if (marker?.version !== 1 || typeof marker.complete !== 'boolean' || !Number.isInteger(revision) || revision < 0) throw Error('本浏览器迁移标记无效，原记录仍保留。');
    minimumRevision = Math.max(minimumRevision, revision);
    return { complete: marker.complete, pending: !marker.complete, baseRevision: revision };
  }
  function readLegacy() {
    const learn = storage.getItem(learnKey), training = storage.getItem(trainingKey);
    const records = { learn: learn === null ? null : validateLearnProgress(parseBackupText(learn), lessonIds),
      training: training === null ? null : validateTrainingProfile(parseBackupText(training), sources) };
    // Preserve the exact original bytes once. They remain recoverable even when
    // a conflict needs manual reconciliation, and are never uploaded verbatim.
    if ((learn !== null || training !== null) && storage.getItem(backupKey) === null) {
      try { storage.setItem(backupKey, JSON.stringify({ version: 1, learn, training })); }
      catch { throw Error('浏览器空间不足，无法保留迁移前备份；原记录未修改，请释放空间后重试。'); }
    }
    return records;
  }
  function finishMigration(envelope) {
    guard();
    try { storage.setItem(markerKey, JSON.stringify({ version: 1, complete: true, revision: envelope.revision })); }
    catch { throw Error('云端记录已安全保存，但浏览器无法记录迁移状态，请释放浏览器空间后重试。'); }
  }
  function migrationPending(revision) {
    guard();
    try { storage.setItem(markerKey, JSON.stringify({ version: 1, complete: false, baseRevision: revision })); }
    catch { throw Error('无法保存迁移状态，原记录未修改，请释放浏览器空间后重试。'); }
  }
  async function initializeInternal() {
    if (initialized) return clone(snapshot);
    const migration = readMigration(), migrated = migration.complete, legacy = migrated ? { learn: null, training: null } : readLegacy();
    let remote = await readRemote();
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const current = remote.data || checkedData({ learn: null, training: null });
      const candidate = remote.data === null ? {
        learn: legacy.learn || current.learn, training: legacy.training || current.training,
      } : {
        learn: legacy.learn ? mergeLegacyLearnProgress(legacy.learn, current.learn, options) : current.learn,
        training: legacy.training ? mergeLegacyTrainingProfile(legacy.training, current.training, sources) : current.training,
      };
      if (migration.pending && remote.revision > migration.baseRevision && !learningValuesEqual(candidate, current)) {
        throw new LearningCloudConflictError('旧记录迁移时连接中断，云端随后又有更新，无法确定哪些修改已保存；原始记录和迁移备份均已保留，请先核对记录。');
      }
      if (!remote.needsDefaults && learningValuesEqual(candidate, current)) {
        if (!migrated) finishMigration(remote);
        initialized = true; return publish(remote);
      }
      if (!migrated) migrationPending(remote.revision);
      const saved = await writeRemote(remote, candidate);
      if (saved.conflict) {
        remote = saved.envelope;
        // A definite 409 means this write was not applied. A later attempt can
        // rebase safely; only an unknown outcome retains the older checkpoint.
        if (!migrated) migrationPending(remote.revision);
        migration.baseRevision = remote.revision;
        continue;
      }
      if (!migrated) finishMigration(saved.envelope);
      initialized = true; return publish(saved.envelope);
    }
    throw new LearningCloudConflictError('其他设备正在频繁保存，请稍后重新载入。本浏览器原记录仍保留。');
  }
  async function mutate(operation) {
    await initializeInternal();
    let remote = await readRemote();
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const current = remote.data || checkedData({ learn: null, training: null });
      let proposed;
      try { proposed = operation(current); }
      catch (error) { if (error instanceof LearningCloudConflictError) publish(remote); throw error; }
      if (!remote.needsDefaults && learningValuesEqual(proposed.data, current)) { publish(remote); return proposed.result; }
      const saved = await writeRemote(remote, proposed.data);
      if (saved.conflict) { remote = saved.envelope; continue; }
      publish(saved.envelope); return proposed.result;
    }
    publish(remote);
    throw new LearningCloudConflictError('其他设备正在频繁保存，请稍后重试。');
  }
  return {
    initialize: () => run(initializeInternal),
    refresh: () => run(async () => { await initializeInternal(); return publish(await readRemote()); }),
    getSnapshot: () => snapshot ? clone(snapshot) : null,
    drain: () => queue,
    close: () => { closed = true; },
    saveLearn(nextValue, baseValue) {
      const next = validateLearnProgress(nextValue, lessonIds), base = validateLearnProgress(baseValue, lessonIds);
      return run(async () => {
        try {
          return await mutate(current => {
            const progress = mergeLearnProgress(base, next, current.learn, options);
            return { data: { ...current, learn: progress }, result: { status: 'saved', progress } };
          });
        } catch (error) {
          if (error instanceof LearningCloudConflictError && snapshot) return { status: 'conflict', progress: clone(snapshot.learnProgress), error: error.message };
          throw error;
        }
      });
    },
    submitAttempt(problem, answer) {
      const submission = clone(answer), entry = resolveWengProblem(problem, sources.problemsIndex);
      return run(() => mutate(current => {
        const { profile, result } = submitTrainingAttempt(current.training,
          { ...submission, problemId: entry.id, now: Math.max(now(), current.training.updatedAt) }, sources);
        return { data: { ...current, training: profile }, result };
      }));
    },
    updatePreferences(patchValue, basePrefsValue) {
      const patch = clone(patchValue), capturedBase = basePrefsValue ? clone(basePrefsValue) : snapshot ? clone(snapshot.profile.prefs) : null;
      return run(() => mutate(current => {
        const prefs = mergeTrainingPreferences(capturedBase || current.training.prefs, patch, current.training.prefs);
        const profile = updateTrainingPreferences(current.training, prefs, { now: Math.max(now(), current.training.updatedAt) });
        return { data: { ...current, training: profile }, result: profile };
      }));
    },
  };
}
