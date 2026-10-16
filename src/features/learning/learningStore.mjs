import { normalizeProgress, completeLocalLesson, uncompleteLocalLesson } from './lessonProgress.mjs';
import { parseBackupText, validateLearnProgress } from './progressValidation.mjs';
import { createTrainingProfile, validateTrainingProfile, submitTrainingAttempt, updateTrainingPreferences, buildTrainingReport } from './scoring/training-system.mjs';

export const LEARNING_CHANGED_EVENT = 'quantgym:learning-progress-changed';
const storageOf = options => options?.storage || globalThis.localStorage;
export function learningStorageKey(userId, kind = 'learn') {
  if (typeof userId !== 'string' || !userId.trim()) throw Error('请先登录再保存学习记录。');
  if (!['learn', 'training'].includes(kind)) throw Error('Unknown learning record.');
  return `quantgym:learning:v1:${encodeURIComponent(userId)}:${kind}`;
}
function notify(userId) {
  if (globalThis.window && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent(LEARNING_CHANGED_EVENT, { detail: { userId } }));
}
export function readLearnProgress(userId, options = {}) {
  const text = storageOf(options).getItem(learningStorageKey(userId));
  return text === null ? normalizeProgress() : validateLearnProgress(parseBackupText(text), options.lessonIds || []);
}
export function saveLearnProgress(userId, progress, options = {}) {
  const checked = validateLearnProgress(progress, options.lessonIds || []);
  storageOf(options).setItem(learningStorageKey(userId), JSON.stringify(checked));
  notify(userId);
  return checked;
}
export function completeLearnLesson(userId, lessonId, bonus = 0, options = {}) {
  const { progress, result } = completeLocalLesson(readLearnProgress(userId, options), lessonId, bonus, options.now ?? Date.now());
  if (result.error) throw Error('课程标识无效，未保存完成记录。');
  return { progress: saveLearnProgress(userId, progress, options), result };
}
export function uncompleteLearnLesson(userId, lessonId, options = {}) {
  return saveLearnProgress(userId, uncompleteLocalLesson(readLearnProgress(userId, options), lessonId), options);
}
export function readTrainingProfile(userId, sources = {}, options = {}) {
  const text = storageOf(options).getItem(learningStorageKey(userId, 'training'));
  return text === null ? createTrainingProfile({ now: options.now ?? Date.now(), id: `local-${options.now ?? Date.now()}` })
    : validateTrainingProfile(parseBackupText(text), sources);
}
export function saveTrainingProfile(userId, profile, sources = {}, options = {}) {
  const checked = validateTrainingProfile(profile, sources);
  storageOf(options).setItem(learningStorageKey(userId, 'training'), JSON.stringify(checked));
  notify(userId);
  return checked;
}
/** The scoring ledger uses source INTERNAL ids; fitted difficulty uses DISPLAY ids. */
export function resolveWengProblem(problem, problemsIndex = []) {
  if (problem?.source !== 'quantvault') throw Error('该题不属于翁家宝典。');
  const raw = problem.quantvault?.id, display = problem.quantvault?.displayId;
  const entry = problemsIndex.find(item => String(item.id) === String(raw));
  if (!entry || String(entry.di) !== String(display) || problem.id !== `quantvault-${display}`) throw Error('题目编号映射不一致，未写入评分。');
  return entry;
}
export function submitWengAttempt(userId, problem, answer, sources, options = {}) {
  const entry = resolveWengProblem(problem, sources.problemsIndex);
  const profile = readTrainingProfile(userId, sources, options);
  const { profile: next, result } = submitTrainingAttempt(profile, { ...answer, problemId: entry.id, now: options.now ?? Date.now() }, sources);
  saveTrainingProfile(userId, next, sources, options);
  return result;
}
export function saveTrainingPreferences(userId, patch, sources, options = {}) {
  const next = updateTrainingPreferences(readTrainingProfile(userId, sources, options), patch, { now: options.now ?? Date.now() });
  return saveTrainingProfile(userId, next, sources, options);
}
export function readLearningReport(userId, sources, options = {}) {
  const profile = readTrainingProfile(userId, sources, options), learnProgress = readLearnProgress(userId, options);
  return { profile, learnProgress, report: buildTrainingReport(profile, { ...sources, learnXp: learnProgress.xp, learnCompleted: learnProgress.completed.length, now: options.now ?? Date.now() }) };
}
