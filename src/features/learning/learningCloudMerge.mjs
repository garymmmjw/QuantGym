import { normalizeProgress } from './lessonProgress.mjs';
import { validateLearnProgress } from './progressValidation.mjs';
import { createTrainingProfile, validateTrainingProfile, submitTrainingAttempt, updateTrainingPreferences } from './scoring/training-system.mjs';

const clone = value => structuredClone(value);
const own = (object, key) => Object.hasOwn(object, key);
const canonical = value => value === undefined ? 'undefined' : JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const learningValuesEqual = (a, b) => canonical(a) === canonical(b);
export class LearningCloudConflictError extends Error {
  constructor(message = '另一设备同时修改了这项记录，请重新载入后重试。') { super(message); this.name = 'LearningCloudConflictError'; this.code = 'LEARNING_CONFLICT'; }
}
function field(base, next, remote, name) {
  if (learningValuesEqual(next, base)) return clone(remote);
  if (learningValuesEqual(remote, base) || learningValuesEqual(remote, next)) return clone(next);
  throw new LearningCloudConflictError(`另一设备同时修改了${name}，已保留云端记录，请重新载入后重试。`);
}
function mapFields(base = {}, next = {}, remote = {}, name) {
  const merged = {};
  for (const key of new Set([...Object.keys(remote), ...Object.keys(next), ...Object.keys(base)])) {
    const result = field(base[key], next[key], remote[key], name);
    if (result !== undefined) merged[key] = result;
  }
  return merged;
}
function setValues(base = [], next = [], remote = []) {
  const b = new Set(base), n = new Set(next), r = new Set(remote);
  return [...new Set([...remote, ...next, ...base])].filter(key => n.has(key) !== b.has(key) ? n.has(key) : r.has(key));
}
function sequence(base, next, remote, name) {
  if (learningValuesEqual(next, base)) return clone(remote);
  if (learningValuesEqual(remote, base) || learningValuesEqual(remote, next)) return clone(next);
  // These records have no operation IDs. Identical observations may be two
  // genuine calibration answers, or one retried request after a lost response.
  // Neither concatenating nor deduplicating can safely infer the user's intent.
  throw new LearningCloudConflictError(`另一设备同时修改了${name}，请重新载入后重试。`);
}
const knownXp = progress => Object.values(progress.awards).reduce((sum, award) => sum + (award.xpAwarded ?? 0), 0);
const unknownIds = progress => Object.keys(progress.awards).filter(id => progress.awards[id].migrated);

/** Apply the iframe's change against its own last acknowledged input snapshot.
 * Never use the merged server return as that baseline: the iframe has not seen
 * the extra remote fields, so a later snapshot would otherwise delete them. */
export function mergeLearnProgress(baseValue, nextValue, remoteValue, { lessonIds = [] } = {}) {
  const base = validateLearnProgress(baseValue, lessonIds), next = validateLearnProgress(nextValue, lessonIds);
  const remote = validateLearnProgress(remoteValue, lessonIds);
  for (const [id, award] of Object.entries(base.awards)) {
    if (!own(next.awards, id) || !learningValuesEqual(award, next.awards[id])) throw Error('永久课程奖励不能删除或修改。');
  }
  if (!learningValuesEqual(unknownIds(base).sort(), unknownIds(next).sort()) || next.xp - knownXp(next) !== base.xp - knownXp(base)) {
    throw Error('旧课程 XP 不能由课件重新分配。');
  }
  const awards = clone(remote.awards); let xp = remote.xp;
  for (const [id, award] of Object.entries(next.awards)) if (!own(awards, id)) { awards[id] = clone(award); xp += award.xpAwarded ?? 0; }
  const renderer = mapFields(base.renderer, next.renderer, remote.renderer, '同一课件的位置或答题状态');
  return validateLearnProgress({
    completed: setValues(base.completed, next.completed, remote.completed), awards, xp,
    days: [...new Set([...remote.days, ...next.days])], notes: sequence(base.notes, next.notes, remote.notes, '课程笔记'),
    ...((base.renderer || next.renderer || remote.renderer) ? { renderer } : {}),
  }, lessonIds);
}

/** First import from this browser. Existing cloud awards take precedence for a
 * repeated lesson, and any raw pre-cloud record is retained by the coordinator. */
export function mergeLegacyLearnProgress(localValue, remoteValue, { lessonIds = [] } = {}) {
  const local = validateLearnProgress(localValue, lessonIds), remote = validateLearnProgress(remoteValue, lessonIds);
  for (const [id, award] of Object.entries(local.awards)) {
    if (own(remote.awards, id) && !!award.migrated !== !!remote.awards[id].migrated) {
      throw new LearningCloudConflictError('同一课程包含旧版汇总奖励和逐课奖励，无法安全重新分配 XP；本浏览器原记录已保留。');
    }
  }
  const awards = { ...clone(local.awards), ...clone(remote.awards) };
  const localUnknown = unknownIds(local), remoteUnknown = unknownIds(remote);
  const localResidual = local.xp - knownXp(local), remoteResidual = remote.xp - knownXp(remote);
  let residual = remoteResidual;
  if (!localUnknown.length || !localResidual) { /* no aggregate left to import */ }
  else if (!remoteUnknown.length && localUnknown.every(id => !own(remote.awards, id))) residual += localResidual;
  else if (learningValuesEqual([...localUnknown].sort(), [...remoteUnknown].sort())) residual = Math.max(localResidual, remoteResidual);
  else if (localUnknown.every(id => !own(remote.awards, id)) && remoteUnknown.every(id => !own(local.awards, id))) residual += localResidual;
  else throw new LearningCloudConflictError('两份旧课程奖励有重叠但缺少逐课分数，无法安全合并；本浏览器原记录已保留。');
  const empty = normalizeProgress();
  const renderer = mapFields({}, local.renderer, remote.renderer, '同一课件的位置或答题状态');
  const notes = [...clone(remote.notes)];
  for (const note of local.notes) if (!notes.some(existing => learningValuesEqual(existing, note))) notes.push(clone(note));
  return validateLearnProgress({ ...empty, awards, xp: knownXp({ awards }) + residual,
    completed: [...new Set([...remote.completed, ...local.completed])], days: [...new Set([...remote.days, ...local.days])], notes,
    ...((local.renderer || remote.renderer) ? { renderer } : {}),
  }, lessonIds);
}

export function mergeTrainingPreferences(base, patch, remote) {
  // Validate the patch before interpreting keys (including prototype-shaped
  // keys), using the same domain validator as ordinary preference writes.
  const temporary = { ...createTrainingProfile({ now: 0, id: 'preferences' }), prefs: clone(base) };
  const next = updateTrainingPreferences(temporary, patch, { now: 0 }).prefs, out = clone(remote);
  for (const key of Object.keys(patch)) {
    if (key === 'rate') out.rate = mapFields(base.rate, next.rate, remote.rate, '自评');
    else if (key === 'targets' || key === 'targetFirms') out[key] = setValues(base[key], next[key], remote[key]);
    else if (key === 'calibration') out.calibration = sequence(base.calibration, next.calibration, remote.calibration, '校准记录');
    else out[key] = field(base[key], next[key], remote[key], '评分设置');
  }
  return out;
}
const eventInput = event => ({ problemId: event.problemId, x: event.x, h: event.h, reveal: event.reveal, ...(own(event, 'pc') ? { pc: event.pc } : {}) });

/** Replay only when two independent pre-cloud event ledgers need joining. Input
 * event IDs are stable; derived XP, 30-day freezes and progress are recomputed. */
export function mergeLegacyTrainingProfile(localValue, remoteValue, sources = {}) {
  const local = validateTrainingProfile(localValue, sources), remote = validateTrainingProfile(remoteValue, sources);
  const defaults = createTrainingProfile({ now: 0, id: 'defaults' }).prefs;
  const prefs = mergeTrainingPreferences(defaults, local.prefs, remote.prefs);
  const events = new Map(remote.events.map(event => [event.id, event]));
  let added = false;
  for (const event of local.events) {
    const existing = events.get(event.id);
    if (existing && !learningValuesEqual(eventInput(existing), eventInput(event))) throw new LearningCloudConflictError('同一答题记录包含不同答案，本浏览器原记录已保留。');
    if (!existing) { events.set(event.id, event); added = true; }
  }
  const updatedAt = Math.max(local.updatedAt, remote.updatedAt);
  if (!added) return updateTrainingPreferences(remote, prefs, { now: updatedAt });
  let profile = createTrainingProfile({ id: remote.id, now: Math.min(local.createdAt, remote.createdAt) });
  profile = updateTrainingPreferences(profile, prefs, { now: profile.createdAt });
  // Stable sort retains cloud order for equal timestamps; appended local events
  // use their existing ledger order. No derived fields are copied across forks.
  for (const event of [...events.values()].sort((a, b) => a.at - b.at)) {
    profile = submitTrainingAttempt(profile, { ...eventInput(event), eventId: event.id, now: event.at }, sources).profile;
  }
  profile.updatedAt = updatedAt;
  return validateTrainingProfile(profile, sources);
}
