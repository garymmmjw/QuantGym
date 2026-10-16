import { normalizeProgress } from './lessonProgress.mjs';

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
  for (const key of Object.keys(raw)) if (!['completed', 'awards', 'xp', 'days', 'notes', 'renderer'].includes(key)) throw Error('课程进度包含不支持的字段。');
  if (raw.renderer !== undefined && (!raw.renderer || typeof raw.renderer !== 'object' || Array.isArray(raw.renderer) || Object.keys(raw.renderer).length > 10000 || JSON.stringify(raw.renderer).length > 4000000)) throw Error('课程交互存档过大或格式无效。');
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
