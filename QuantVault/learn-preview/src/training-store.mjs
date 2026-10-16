import {createTrainingProfile, validateTrainingProfile} from './scoring/training-system.mjs';
import {normalizeProgress} from './local-progress.mjs';

export const LEARN_KEY = 'qvl-progress-v1';
export const trainingKey = mode => `qvl-training-${mode === 'demo' ? 'demo' : 'personal'}-v1`;
export const recoveryKey = mode => trainingKey(mode).replace('-v1', '-previous-v1');
// A raw rescue package is deliberately a different format/key from a validated
// backup. Corrupt strings stay recoverable without pretending they are profiles.
export const rawRecoveryKey = mode => trainingKey(mode).replace('-v1', '-raw-recovery-v1');
const MAX_BYTES = 10000000;
const forbidden = new Set(['prototype', ...Object.getOwnPropertyNames(Object.prototype)]);
function safe(value, depth = 0) {
  if (depth > 12) throw Error('备份的嵌套层级过多。');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object') throw Error('备份包含无效数据。');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw Error('备份格式无效。');
  if (Object.getOwnPropertySymbols(value).length) throw Error('备份包含非 JSON 字段。');
  for (const key of Object.keys(value)) {
    if (forbidden.has(key)) throw Error('备份包含不支持的字段。');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw Error('备份包含非 JSON 字段。');
    safe(descriptor.value, depth + 1);
  }
}
export function parseBackupText(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES) throw Error('备份须为小于 10 MB 的 JSON 文本。');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw Error('无法读取 JSON，请检查备份是否完整。'); }
  safe(parsed);
  return parsed;
}
export function validateLearnProgress(raw, lessonIds = []) {
  safe(raw);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('课程进度格式无效。');
  const allowed = new Set(lessonIds);
  const validId = id => typeof id === 'string' && /^lec-[a-z0-9][a-z0-9-]{2,48}$/.test(id) && (!allowed.size || allowed.has(id));
  for (const key of Object.keys(raw)) if (!['completed', 'awards', 'xp', 'days', 'notes'].includes(key)) throw Error('课程进度包含不支持的字段。');
  const p = normalizeProgress(raw);
  if (!Array.isArray(raw.completed) || raw.completed.some(id => !validId(id)) || raw.completed.length > 1000 || new Set(raw.completed).size !== raw.completed.length) throw Error('课程完成列表无效。');
  if (!Number.isInteger(raw.xp) || raw.xp < 0 || raw.xp > 120000) throw Error('课程 XP 无效。');
  if (raw.awards !== undefined && (!raw.awards || typeof raw.awards !== 'object' || Array.isArray(raw.awards))) throw Error('课程奖励记录无效。');
  if (Object.keys(p.awards).length > 1000) throw Error('课程奖励记录过多。');
  let sumKnown = 0, migratedCount = 0;
  for (const [id, award] of Object.entries(p.awards)) {
    if (!validId(id) || !award || typeof award !== 'object' || Array.isArray(award)) throw Error('课程奖励记录无效。');
    const migrated = award.migrated === true && award.xpAwarded === null;
    if (migrated) {
      if (Object.keys(award).some(k => !['migrated', 'xpAwarded'].includes(k))) throw Error('旧课程奖励格式无效。');
      migratedCount++;
    } else {
      if (Object.keys(award).some(k => !['completedAt', 'xpAwarded'].includes(k)) || !Number.isInteger(award.xpAwarded) || award.xpAwarded < 20 || award.xpAwarded > 120 || typeof award.completedAt !== 'string' || !Number.isFinite(Date.parse(award.completedAt))) throw Error('课程奖励格式无效。');
      sumKnown += award.xpAwarded;
    }
  }
  // Legacy migration preserves the aggregate but has no per-lesson amounts.
  // Accept only its defensible range; never manufacture historical bonuses or
  // silently truncate a suspicious legacy total. Raw recovery retains failures.
  if (raw.xp < sumKnown || raw.xp > sumKnown + 120 * migratedCount) throw Error('课程 XP 与永久奖励记录不一致。');
  if (!Array.isArray(raw.days) || raw.days.length > 10000 || raw.days.some(day => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day)) throw Error('课程学习日期无效。');
  if (!Array.isArray(raw.notes) || raw.notes.length > 10000 || JSON.stringify(raw.notes).length > 2000000) throw Error('课程笔记过多或格式无效。');
  return structuredClone(p);
}
export function readLearnProgress(storage, lessonIds = []) {
  const text = storage.getItem(LEARN_KEY);
  return text === null ? normalizeProgress() : validateLearnProgress(parseBackupText(text), lessonIds);
}
export function readTrainingProfile(storage, mode, sources, fallback) {
  const text = storage.getItem(trainingKey(mode));
  return text === null ? (fallback || createTrainingProfile()) : validateTrainingProfile(parseBackupText(text), sources);
}
export function saveTrainingProfile(storage, mode, profile, sources) {
  const checked = validateTrainingProfile(profile, sources);
  storage.setItem(trainingKey(mode), JSON.stringify(checked));
  return checked;
}
export function createBackup(profile, learnProgress = null) {
  return {format: 'quantvault-local-training', version: 1, exportedAt: new Date().toISOString(), profile, learnProgress};
}
export function validateBackup(text, sources, lessonIds = []) {
  const value = parseBackupText(text);
  if (!value || value.format !== 'quantvault-local-training' || value.version !== 1 || Object.keys(value).some(k => !['format','version','exportedAt','profile','learnProgress'].includes(k))) throw Error('这不是受支持的训练备份。');
  return createBackup(validateTrainingProfile(value.profile, sources), value.learnProgress == null ? null : validateLearnProgress(value.learnProgress, lessonIds));
}
// Each operation preserves a recoverable prior snapshot. If either storage
// write fails, restore the old values; never turn a write failure into success.
export function applyBackup(storage, mode, backup, sources, lessonIds = [], fallback) {
  safe(backup);
  const checked = validateBackup(JSON.stringify(backup), sources, lessonIds);
  if (mode === 'demo' && checked.learnProgress !== null) throw Error('示例空间只接受不含个人课程记录的备份。');
  const key = trainingKey(mode), oldTraining = storage.getItem(key), oldLearn = mode === 'demo' ? null : storage.getItem(LEARN_KEY);
  let previousProfile, previousLearn = null;
  const validationErrors = [];
  try { previousProfile = validateTrainingProfile(oldTraining === null ? (fallback || createTrainingProfile()) : parseBackupText(oldTraining), sources); }
  catch (error) { validationErrors.push({record: 'training', message: error.message}); }
  if (mode !== 'demo') {
    try { previousLearn = oldLearn === null ? normalizeProgress() : validateLearnProgress(parseBackupText(oldLearn), lessonIds); }
    catch (error) { validationErrors.push({record: 'learn', message: error.message}); }
  }
  if (validationErrors.length) {
    // Persist rescue data BEFORE touching either active key. A rescue-write
    // failure aborts the import, keeping the original bytes at their old keys.
    storage.setItem(rawRecoveryKey(mode), JSON.stringify({format: 'quantvault-local-training-raw-recovery', version: 1,
      capturedAt: new Date().toISOString(), mode: mode === 'demo' ? 'demo' : 'personal',
      trainingKey: key, learnKey: mode === 'demo' ? null : LEARN_KEY, oldTraining, oldLearn, validationErrors}));
    if (validationErrors.some(error => error.record === 'learn') && checked.learnProgress === null) {
      throw Error('原课程记录已保存在原始恢复包中；此备份不含课程记录，无法修复损坏的课程存档。请导入含课程记录的完整备份。');
    }
  } else {
    storage.setItem(recoveryKey(mode), JSON.stringify(createBackup(previousProfile, previousLearn)));
  }
  const writes = [[key, JSON.stringify(checked.profile), oldTraining]];
  if (mode !== 'demo' && checked.learnProgress !== null) writes.push([LEARN_KEY, JSON.stringify(checked.learnProgress), oldLearn]);
  try {
    for (const [target, value] of writes) storage.setItem(target, value);
  } catch (error) {
    let rollbackFailed = false;
    for (const [k, , value] of writes) {
      try { if (value === null) storage.removeItem(k); else storage.setItem(k, value); } catch { rollbackFailed = true; }
    }
    throw Error(rollbackFailed ? '保存失败，自动回滚也未完成。上一个状态已留在恢复备份中；请先导出再继续。' : `保存失败，原记录已保留。${error.message}`);
  }
  return checked.profile;
}
