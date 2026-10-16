/**
 * Standalone local training domain. This is a product policy, not an account
 * clone: stable V2 (explicit V1 fallback), full-answer completion, one-time XP,
 * immutable profiles and strict JSON import. Audited source ports stay intact.
 * No storage, authentication, network, or dated rollout is used here.
 */
import {
  TOPICS, ROLE_REL, LEVEL_TARGET, MACRO, RATE, XP_TABLE, ELO_COOLDOWN_MS,
  createScoringModel, recordAttempt, calculateLevel, moduleStats, orderModules, calibrate,
} from './scoring-model.mjs';
import { roleWeightBreakdown } from './answer-engine.mjs';

export const TRAINING_SCHEMA_VERSION = 1;
export const TRAINING_RECORD_LIMIT = 10000;
const forbidden = new Set(['prototype', ...Object.getOwnPropertyNames(Object.prototype)]);
const clone = value => structuredClone(value);
const own = (value, key) => Object.hasOwn(value, key);
export class TrainingValidationError extends TypeError {
  constructor(message) { super(message); this.name = 'TrainingValidationError'; }
}
const fail = message => { throw new TrainingValidationError(message); };
function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${path} must be a plain object.`);
}
function shape(value, required, optional, path) {
  object(value, path);
  for (const key of required) if (!own(value, key)) fail(`${path}.${key} is required.`);
  for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) fail(`${path}.${key} is not supported.`);
}
function number(value, lo, hi, path, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi || (integer && !Number.isInteger(value))) {
    fail(`${path} must be ${integer ? 'an integer' : 'a finite number'} in [${lo}, ${hi}].`);
  }
}
function text(value, path, max = 128) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) fail(`${path} must be a nonempty string of at most ${max} characters.`);
}
function identifier(value, path) {
  text(value, path);
  if (forbidden.has(value) || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) fail(`${path} contains an unsafe identifier.`);
}
function timestamp(value, path) { number(value, 0, 8640000000000000, path, true); }
function choice(value, choices, path) { if (!choices.includes(value)) fail(`${path} must be one of: ${choices.join(', ')}.`); }
function list(value, max, path) {
  if (!Array.isArray(value) || value.length > max) fail(`${path} must be an array with at most ${max} entries.`);
}
function uniqueStrings(value, choices, max, path) {
  list(value, max, path);
  const seen = new Set();
  for (const item of value) {
    text(item, path, 120);
    if (choices) choice(item, choices, path);
    if (seen.has(item)) fail(`${path} must not contain duplicates.`);
    seen.add(item);
  }
}
// Reject prototype-shaped keys and non-JSON values anywhere before cloning.
function safeJson(value, path = 'profile', depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > 350000 || depth > 12) fail(`${path} exceeds the supported import size or depth.`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) fail(`${path} must be finite.`); return; }
  if (typeof value === 'string') { if (value.length > 2000) fail(`${path} is too long.`); return; }
  if (typeof value !== 'object') fail(`${path} contains a non-JSON value.`);
  if (!Array.isArray(value)) object(value, path);
  if (Object.getOwnPropertySymbols(value).length) fail(`${path} contains non-JSON symbol keys.`);
  if (Array.isArray(value) && Object.keys(value).length !== value.length) fail(`${path} must be a dense JSON array.`);
  for (const key of Object.keys(value)) {
    if (forbidden.has(key)) fail(`${path}.${key} is not allowed.`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !own(descriptor, 'value')) fail(`${path}.${key} must not be an accessor.`);
    safeJson(descriptor.value, `${path}.${key}`, depth + 1, budget);
  }
}
function validatePrefs(prefs) {
  shape(prefs, ['role', 'level', 'rate', 'targets', 'targetFirms', 'calibration'], [], 'prefs');
  choice(prefs.role, Object.keys(ROLE_REL), 'prefs.role');
  choice(prefs.level, Object.keys(LEVEL_TARGET), 'prefs.level');
  object(prefs.rate, 'prefs.rate');
  for (const [key, value] of Object.entries(prefs.rate)) {
    choice(key, Object.keys(MACRO), 'prefs.rate key'); choice(value, Object.keys(RATE), `prefs.rate.${key}`);
  }
  uniqueStrings(prefs.targets, TOPICS, TOPICS.length, 'prefs.targets');
  uniqueStrings(prefs.targetFirms, null, 100, 'prefs.targetFirms');
  list(prefs.calibration, 1000, 'prefs.calibration');
  prefs.calibration.forEach((item, i) => {
    const path = `prefs.calibration[${i}]`;
    shape(item, ['topic', 'x'], ['b', 'c', 'diff'], path);
    choice(item.topic, TOPICS, `${path}.topic`); number(item.x, 0, 1, `${path}.x`);
    if (own(item, 'b')) number(item.b, -20, 20, `${path}.b`);
    if (own(item, 'c')) number(item.c, 0, 1, `${path}.c`);
    if (own(item, 'diff')) choice(item.diff, Object.keys(XP_TABLE), `${path}.diff`);
  });
}
function problemKey(value) {
  if (typeof value === 'number') number(value, 1, Number.MAX_SAFE_INTEGER, 'problemId', true);
  else identifier(value, 'problemId');
  return String(value);
}
function indexMap(problemsIndex) {
  if (problemsIndex === undefined) return null;
  list(problemsIndex, TRAINING_RECORD_LIMIT, 'problemsIndex');
  const map = new Map();
  for (const problem of problemsIndex) {
    object(problem, 'problem'); const key = problemKey(problem.id);
    if (map.has(key)) fail(`Duplicate problem id ${key}.`);
    map.set(key, problem);
  }
  return map;
}
function knownKey(key, index, path) {
  identifier(key, path);
  if (index && !index.has(key)) fail(`${path} refers to an unknown problem.`);
}
function mapRecords(value, index, path, visitor) {
  object(value, path);
  if (Object.keys(value).length > TRAINING_RECORD_LIMIT) fail(`${path} exceeds ${TRAINING_RECORD_LIMIT} records.`);
  for (const [key, entry] of Object.entries(value)) { knownKey(key, index, `${path}.${key}`); visitor(entry, `${path}.${key}`, key); }
}
function fullAnswer(input) { return input.x === 1 && (!own(input, 'pc') || input.pc === 1) && !input.reveal; }
function validateSubmission(input, path = 'submission') {
  choice(input.x, [0, 1], `${path}.x`);
  if (typeof input.h !== 'boolean' || typeof input.reveal !== 'boolean') fail(`${path}.h and reveal must be booleans.`);
  if (own(input, 'pc')) {
    number(input.pc, 0, 1, `${path}.pc`);
    if (input.x !== (input.pc === 1 ? 1 : 0)) fail(`${path}: x must equal 1 only when partial-credit score is 1.`);
  }
  if (input.reveal && (input.x !== 0 || (own(input, 'pc') && input.pc !== 0))) fail(`${path}: revealing an answer requires x=0 and no positive partial credit.`);
}

/** Strict import: returns a detached profile, or throws; never silently resets. */
export function validateTrainingProfile(raw, { problemsIndex } = {}) {
  safeJson(raw);
  shape(raw, ['schemaVersion', 'id', 'createdAt', 'updatedAt', 'prefs', 'progress', 'attempts', 'solvedHistory', 'events'], [], 'profile');
  if (raw.schemaVersion !== TRAINING_SCHEMA_VERSION) fail('Unsupported training profile schemaVersion.');
  identifier(raw.id, 'profile.id'); timestamp(raw.createdAt, 'createdAt'); timestamp(raw.updatedAt, 'updatedAt');
  if (raw.updatedAt < raw.createdAt) fail('updatedAt must not precede createdAt.');
  validatePrefs(raw.prefs);
  const index = indexMap(problemsIndex);
  mapRecords(raw.progress, index, 'progress', (entry, path) => choice(entry, ['solved', 'attempted'], path));
  mapRecords(raw.attempts, index, 'attempts', (entry, path) => {
    shape(entry, ['x', 'at'], ['h', 'pc', 'r'], path);
    choice(entry.x, [0, 1], `${path}.x`); timestamp(entry.at, `${path}.at`);
    if (entry.at < raw.createdAt || entry.at > raw.updatedAt) fail(`${path}.at is outside the profile timeline.`);
    if (own(entry, 'h')) choice(entry.h, [1], `${path}.h`);
    if (own(entry, 'pc')) number(entry.pc, 0, 1, `${path}.pc`);
    if (own(entry, 'r')) choice(entry.r, ['reveal'], `${path}.r`);
  });
  mapRecords(raw.solvedHistory, index, 'solvedHistory', (entry, path, key) => {
    shape(entry, ['firstSolvedAt', 'xpAwarded', 'category', 'diff'], [], path);
    timestamp(entry.firstSolvedAt, `${path}.firstSolvedAt`);
    if (entry.firstSolvedAt < raw.createdAt || entry.firstSolvedAt > raw.updatedAt) fail(`${path}.firstSolvedAt is outside the profile timeline.`);
    choice(entry.category, TOPICS, `${path}.category`); choice(entry.diff, Object.keys(XP_TABLE), `${path}.diff`);
    if (entry.xpAwarded !== XP_TABLE[entry.diff]) fail(`${path}.xpAwarded does not match difficulty.`);
    if (index && (index.get(key).c !== entry.category || index.get(key).d !== entry.diff)) fail(`${path} does not match the problem index.`);
    if (raw.progress[key] !== 'solved') fail(`${path} requires solved progress.`);
  });
  list(raw.events, TRAINING_RECORD_LIMIT, 'events');
  const ids = new Set(), awards = new Map(), replayedAttempts = {}, replayedProgress = {}; let lastAt = raw.createdAt;
  raw.events.forEach((event, i) => {
    const path = `events[${i}]`;
    shape(event, ['id', 'problemId', 'x', 'h', 'reveal', 'at', 'outcome', 'abilityFrozen', 'deltaXp', 'progressBefore', 'progressAfter', 'readinessBefore', 'readinessAfter', 'effectiveModel'], ['pc'], path);
    identifier(event.id, `${path}.id`); knownKey(event.problemId, index, `${path}.problemId`);
    if (ids.has(event.id)) fail(`${path}.id is duplicated.`); ids.add(event.id);
    validateSubmission(event, path); timestamp(event.at, `${path}.at`);
    if (event.at < lastAt || event.at > raw.updatedAt) fail(`${path}.at is outside chronological profile order.`); lastAt = event.at;
    choice(event.outcome, ['recorded', 'frozen', 're-evaluated'], `${path}.outcome`);
    if (event.abilityFrozen !== (event.outcome === 'frozen')) fail(`${path}.abilityFrozen does not match outcome.`);
    choice(event.deltaXp, [0, 10, 25, 50], `${path}.deltaXp`);
    choice(event.progressBefore, ['', 'solved', 'attempted'], `${path}.progressBefore`);
    choice(event.progressAfter, ['solved', 'attempted'], `${path}.progressAfter`);
    number(event.readinessBefore, 2, 99, `${path}.readinessBefore`, true);
    number(event.readinessAfter, 2, 99, `${path}.readinessAfter`, true);
    choice(event.effectiveModel, ['v1', 'v2'], `${path}.effectiveModel`);
    const replay = recordAttempt(own(replayedAttempts, event.problemId) ? { [event.problemId]: replayedAttempts[event.problemId] } : {}, event.problemId, event.x,
      { now: event.at, extra: { h: event.h, ...(own(event, 'pc') ? { pc: event.pc } : {}), ...(event.reveal ? { r: 'reveal' } : {}) } });
    if (event.outcome !== replay.outcome) fail(`${path}.outcome does not match the 30-day ledger.`);
    replayedAttempts[event.problemId] = replay.attempts[event.problemId];
    const oldProgress = replayedProgress[event.problemId] || '';
    if (fullAnswer(event)) replayedProgress[event.problemId] = 'solved';
    else if (!oldProgress) replayedProgress[event.problemId] = 'attempted';
    if (event.progressBefore !== oldProgress || event.progressAfter !== replayedProgress[event.problemId]) fail(`${path} has inconsistent completion history.`);
    const shouldAward = fullAnswer(event) && !awards.has(event.problemId);
    if (shouldAward !== (event.deltaXp > 0)) fail(`${path} has inconsistent first-solve XP.`);
    if (event.deltaXp > 0) {
      if (!fullAnswer(event) || awards.has(event.problemId)) fail(`${path} contains duplicate or ineligible XP.`);
      const history = raw.solvedHistory[event.problemId];
      if (!history || history.xpAwarded !== event.deltaXp || history.firstSolvedAt !== event.at) fail(`${path} has no matching XP ledger entry.`);
      awards.set(event.problemId, event.deltaXp);
    }
  });
  for (const key of Object.keys(raw.solvedHistory)) if (!awards.has(key)) fail(`solvedHistory.${key} has no matching award event.`);
  for (const [field, replayed] of [['attempts', replayedAttempts], ['progress', replayedProgress]]) {
    if (Object.keys(raw[field]).length !== Object.keys(replayed).length) fail(`${field} does not match the event ledger.`);
    for (const [key, entry] of Object.entries(replayed)) {
      if (!own(raw[field], key)) fail(`${field}.${key} is missing from the event ledger.`);
      if (typeof entry === 'string') { if (raw[field][key] !== entry) fail(`${field}.${key} does not match the event ledger.`); }
      else if (Object.keys(entry).length !== Object.keys(raw[field][key]).length || Object.entries(entry).some(([name, value]) => raw[field][key][name] !== value)) fail(`${field}.${key} does not match the event ledger.`);
    }
  }
  return clone(raw);
}

export function createTrainingProfile({ now = Date.now(), id = `training-${now}` } = {}) {
  timestamp(now, 'now'); identifier(id, 'id');
  return { schemaVersion: TRAINING_SCHEMA_VERSION, id, createdAt: now, updatedAt: now,
    prefs: { role: 'unsure', level: 'undergrad', rate: {}, targets: [], targetFirms: [], calibration: [] },
    progress: {}, attempts: {}, solvedHistory: {}, events: [] };
}
export function updateTrainingPreferences(profile, patch, { now = Date.now() } = {}) {
  const next = validateTrainingProfile(profile);
  safeJson(patch, 'patch'); shape(patch, [], ['role', 'level', 'rate', 'targets', 'targetFirms', 'calibration'], 'patch');
  timestamp(now, 'now'); if (now < next.updatedAt) fail('now must not precede the profile update.');
  // Each supplied preference field replaces that field; an empty rate map clears self-ratings.
  next.prefs = { ...next.prefs, ...clone(patch) }; validatePrefs(next.prefs); next.updatedAt = now;
  return next;
}

function modelContext(profile, { problemsIndex = [], difficultyV1 = null, difficultyV2 = null, now = Date.now() } = {}) {
  const engine = createScoringModel({ difficultyV1, difficultyV2 });
  const effectiveModel = engine.hasV2() ? 'v2' : 'v1';
  const bar = engine.computeOfferBar({ prefs: profile.prefs, progress: profile.progress, attempts: profile.attempts,
    solvedHistory: profile.solvedHistory, problemsIndex, model: effectiveModel, now });
  bar.modelInfo = { requested: 'v2', effectiveModel, hasV1: bar.modelInfo.hasV1, hasV2: engine.hasV2(), asOf: now,
    fallbackReason: engine.hasV2() ? null : 'V2 fitted difficulty map is unavailable; using V1 fitted values or authored difficulty labels.',
    datedRollout: false, externalStateUsedForReadiness: false, serverVerified: false };
  return { engine, bar, effectiveModel };
}
const sumProblemXp = profile => Object.values(profile.solvedHistory).reduce((sum, entry) => sum + entry.xpAwarded, 0);

/**
 * Product rule: only full non-revealed success completes a problem / earns XP.
 * Hints retain full XP; partial/revealed outcomes never downgrade a prior solve.
 * Every graded submission still follows the audited 30-day attempt ledger.
 */
export function submitTrainingAttempt(profile, submission, options = {}) {
  safeJson(submission, 'submission');
  shape(submission, ['problemId', 'x', 'eventId'], ['h', 'pc', 'reveal', 'now'], 'submission');
  const now = submission.now ?? Date.now(); timestamp(now, 'now');
  const next = validateTrainingProfile(profile, { problemsIndex: options.problemsIndex });
  const index = indexMap(options.problemsIndex);
  if (!index) fail('problemsIndex is required to submit a training answer.');
  const key = problemKey(submission.problemId), problem = index.get(key);
  if (!problem) fail(`Unknown problem ${key}.`);
  choice(problem.c, TOPICS, 'problem category'); choice(problem.d, Object.keys(XP_TABLE), 'problem difficulty');
  identifier(submission.eventId, 'eventId');
  const answer = { x: submission.x, h: submission.h ?? false, reveal: submission.reveal ?? false,
    ...(own(submission, 'pc') ? { pc: submission.pc } : {}) };
  validateSubmission(answer);
  const previous = next.events.find(event => event.id === submission.eventId);
  if (previous) {
    if (previous.problemId !== key || previous.x !== answer.x || previous.h !== answer.h || previous.reveal !== answer.reveal
      || own(previous, 'pc') !== own(answer, 'pc') || previous.pc !== answer.pc) fail('eventId already belongs to a different submission.');
    const { bar } = modelContext(next, { ...options, now });
    return { profile: next, result: { outcome: 'duplicate', duplicate: true, abilityFrozen: previous.abilityFrozen,
      deltaXp: 0, problemXp: sumProblemXp(next), progressBefore: next.progress[key] || '', progressAfter: next.progress[key] || '',
      barBefore: bar, barAfter: clone(bar), event: clone(previous) } };
  }
  if (now < next.updatedAt) fail('now must not precede the profile update.');
  if (next.events.length >= TRAINING_RECORD_LIMIT) fail(`Event log reached ${TRAINING_RECORD_LIMIT} entries; export and start a new profile.`);
  const before = modelContext(next, { ...options, now });
  const recorded = recordAttempt(next.attempts, key, answer.x, { now,
    extra: { h: answer.h, ...(own(answer, 'pc') ? { pc: answer.pc } : {}), ...(answer.reveal ? { r: 'reveal' } : {}) } });
  next.attempts = recorded.attempts;
  const progressBefore = next.progress[key] || '';
  const complete = fullAnswer(answer);
  if (complete) next.progress[key] = 'solved';
  else if (!progressBefore) next.progress[key] = 'attempted';
  let deltaXp = 0;
  if (complete && !own(next.solvedHistory, key)) {
    deltaXp = XP_TABLE[problem.d];
    next.solvedHistory[key] = { firstSolvedAt: now, xpAwarded: deltaXp, category: problem.c, diff: problem.d };
  }
  next.updatedAt = now;
  const after = modelContext(next, { ...options, now });
  const event = { id: submission.eventId, problemId: key, ...answer, at: now, outcome: recorded.outcome,
    abilityFrozen: recorded.outcome === 'frozen', deltaXp, progressBefore, progressAfter: next.progress[key],
    readinessBefore: before.bar.readiness, readinessAfter: after.bar.readiness, effectiveModel: after.effectiveModel };
  next.events.push(event);
  return { profile: next, result: { outcome: recorded.outcome, duplicate: false, abilityFrozen: event.abilityFrozen,
    deltaXp, problemXp: sumProblemXp(next), progressBefore, progressAfter: next.progress[key],
    barBefore: before.bar, barAfter: after.bar, event: clone(event) } };
}

function recommend(profile, problemsIndex, engine, bar, now, downloadedProblemIds) {
  const allowed = downloadedProblemIds === undefined ? null : new Set(downloadedProblemIds.map(id => problemKey(id)));
  const buckets = new Map(TOPICS.map(topic => [topic, []]));
  for (const problem of problemsIndex) {
    const key = String(problem.id);
    if ((allowed && !allowed.has(key)) || !buckets.has(problem.c) || profile.progress[key] === 'solved' || own(profile.solvedHistory, key)) continue;
    const b = engine.hasV2() ? engine.diffB2(problem.d, problem.di) : engine.diffB(problem.d, problem.di);
    const abilityFrozen = !!profile.attempts[key] && now - profile.attempts[key].at < ELO_COOLDOWN_MS;
    buckets.get(problem.c).push({ id: problem.id, problemId: problem.id, di: problem.di,
      title: problem.t || problem.title || `Problem ${problem.di ?? problem.id}`, topic: problem.c, difficulty: problem.d,
      b, distance: Math.abs(b - (calibrate(bar.state.theta[problem.c]) - 1)), abilityFrozen });
  }
  const out = [];
  // Standalone recommendation policy: prioritize topics; within each topic put
  // answers able to update ability first, then closest fitted difficulty. Fill
  // from further topics if an earlier topic has no downloaded unsolved content.
  for (const row of bar.priorities) {
    const candidates = buckets.get(row.topic).sort((a, b) => Number(a.abilityFrozen) - Number(b.abilityFrozen) || a.distance - b.distance || String(a.id).localeCompare(String(b.id)));
    out.push(...candidates.slice(0, Math.min(2, 6 - out.length)));
    if (out.length >= 6) break;
  }
  return out;
}
function streakFromEvents(events, now) {
  const day = timestampValue => new Date(timestampValue).toISOString().slice(0, 10);
  const days = [...new Set(events.map(event => day(event.at)))].sort();
  let longest = 0, run = 0, last = null;
  for (const date of days) { const time = Date.parse(`${date}T00:00:00Z`); run = last !== null && time - last === 86400000 ? run + 1 : 1; longest = Math.max(longest, run); last = time; }
  let cursor = Date.parse(`${day(now)}T00:00:00Z`), current = 0;
  const set = new Set(days); if (!set.has(day(cursor))) cursor -= 86400000;
  while (set.has(day(cursor))) { current++; cursor -= 86400000; }
  return { current, longest, activeDays: days.length, lastActivityDate: days.at(-1) || null, timezone: 'UTC' };
}
export function buildTrainingReport(profile, { problemsIndex = [], difficultyV1 = null, difficultyV2 = null, modules = [],
  learnXp = 0, learnCompleted = 0, now = Date.now(), downloadedProblemIds } = {}) {
  timestamp(now, 'now'); number(learnXp, 0, Number.MAX_SAFE_INTEGER, 'learnXp', true); number(learnCompleted, 0, TRAINING_RECORD_LIMIT, 'learnCompleted', true);
  const checked = validateTrainingProfile(profile, { problemsIndex });
  if (downloadedProblemIds !== undefined) list(downloadedProblemIds, TRAINING_RECORD_LIMIT, 'downloadedProblemIds');
  const { engine, bar, effectiveModel } = modelContext(checked, { problemsIndex, difficultyV1, difficultyV2, now });
  const moduleList = Array.isArray(modules) ? modules : modules?.modules;
  list(moduleList, 1000, 'modules');
  const orderedModules = Array.isArray(modules) ? moduleList : orderModules(modules, checked.prefs.role);
  const problemXp = sumProblemXp(checked), totalXp = problemXp + learnXp;
  number(totalXp, 0, Number.MAX_SAFE_INTEGER, 'totalXp', true);
  return { bar, roleWeights: roleWeightBreakdown({ prefs: checked.prefs, problemsIndex }),
    moduleProgress: orderedModules.map(module => ({ id: module.id, title: module.title || module.name || module.id, ...clone(moduleStats(module, checked.progress)) })),
    problemXp, learnXp, totalXp, level: calculateLevel(totalXp), learnCompleted,
    solvedCount: Object.values(checked.progress).filter(status => status === 'solved').length,
    attemptedCount: Object.keys(checked.progress).length,
    needsReviewCount: Object.values(checked.progress).filter(status => status === 'attempted').length,
    priorities: bar.priorities, recommendations: recommend(checked, problemsIndex, engine, bar, now, downloadedProblemIds),
    recentEvents: clone(checked.events.slice(-20).reverse()), eventCount: checked.events.length,
    streak: streakFromEvents(checked.events, now), modelInfo: { ...bar.modelInfo, effectiveModel },
    policy: { version: 1, completion: 'full-non-revealed-answer', problemXp: 'one-time-per-problem', abilityCooldownDays: 30,
      recommendations: 'unsolved-downloaded-first-by-topic-priority-and-fitted-difficulty', attemptedCountIncludesSolved: true,
      learnAffectsAbility: false, datedRollout: false } };
}
