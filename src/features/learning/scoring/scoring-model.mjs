/**
 * Offline, deterministic port of the captured public scoring functions.
 * No authentication, storage, network, timers, analytics, or account mutation.
 * See RULES.md for provenance, source quirks and deliberately unknown behavior.
 */
import { TOPICS, B, K_SRC, MIN_EVIDENCE, LEVEL_TARGET, ROLE_REL, MACRO, RATE,
  INTRINSIC, GAMMA, CROSS_MASS, TAG_TOPIC, ROLE_CORE, TOPIC_LABELS } from './scoring-constants.mjs';
export * from './scoring-constants.mjs';

export const CAPTURED_AT = Date.UTC(2026, 9, 15);
export const OFFER_BAR_TARGET = 75;
export const XP_TABLE = Object.freeze({ easy: 10, medium: 25, hard: 50 });
export const ELO_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const LESSON_XP = 20;
export const LESSON_XP_BONUS_CAP = 100;
export const SOURCE_LESSON_LIMIT = 60;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const sigmoid = x => 1 / (1 + Math.exp(-x));
export const calibrate = theta => ((theta || 0) - 0.105) / 0.490;
export const thetaToRating = theta => Math.round(1200 + 300 * calibrate(theta));
// Algebraic inverse for the local simulator, not a separate source formula.
export const ratingToTheta = rating => 0.105 + 0.490 * (rating - 1200) / 300;
export const masteryOf = theta => clamp((theta + 1.15) / 2.1, 0, 1);
export const blendWeight = (now = CAPTURED_AT) => clamp(
  (now - Date.UTC(2026, 8, 29)) / (Date.UTC(2026, 10, 1) - Date.UTC(2026, 8, 29)), 0, 1);

export function newState() {
  return { theta: Object.fromEntries(TOPICS.map(t => [t, 0])), nObs: Object.fromEntries(TOPICS.map(t => [t, 0])) };
}
function copyState(st) {
  const out = newState();
  Object.assign(out.theta, st?.theta);
  Object.assign(out.nObs, st?.nObs);
  return out;
}
function observeMutable(st, o) {
  const topic = o.topic;
  if (!Object.hasOwn(st.theta, topic)) return st;
  const weight = o.weight !== undefined ? o.weight : 1;
  const c = o.c || 0;
  const k = weight * (K_SRC[o.source] || 0.3) / Math.sqrt(1 + (st.nObs[topic] || 0));
  const p = c + (1 - c) * sigmoid(st.theta[topic] - o.b);
  st.theta[topic] += k * (o.x - p);
  if (o.source !== 'selfrate' && o.source !== 'status') st.nObs[topic] += weight;
  return st;
}
export function observe(state, observation) {
  return observeMutable(copyState(state), observation);
}
export const uncertainty = (state, topic) => 1 / Math.sqrt(1 + (state.nObs[topic] || 0));
export function secondaryTopics(tags, primary) {
  return [...new Set((tags || []).map(t => TAG_TOPIC[t]).filter(t => t && t !== primary))];
}
export function skillOf(thetaMap, relevanceMap, nObs) {
  let num = 0, den = 0;
  for (const topic of TOPICS) {
    if (typeof thetaMap[topic] !== 'number') continue;
    // Preserve implementation (including null => 1 => below MIN_EVIDENCE).
    const n = nObs ? (nObs[topic] || 0) : 1;
    if (n < MIN_EVIDENCE) continue;
    const rel = typeof relevanceMap?.[topic] === 'number' ? relevanceMap[topic] : 1;
    num += rel * masteryOf(thetaMap[topic]); den += rel;
  }
  return den > 0 ? num / den : 0;
}

export function relevance(opts = {}) {
  const prefs = opts.prefs || {};
  const role = ROLE_REL[prefs.role || 'unsure'] || ROLE_REL.unsure;
  const firms = prefs.targetFirms || prefs.firms || [];
  let firmMix = null;
  if (firms.length) {
    const counts = {}; let total = 0;
    for (const p of opts.problemsIndex || []) {
      if (Array.isArray(p.co) && p.co.some(c => firms.includes(c))) {
        counts[p.c] = (counts[p.c] || 0) + 1; total++;
      }
    }
    if (total >= 10) firmMix = Object.fromEntries(TOPICS.map(t => [t, (counts[t] || 0) / total]));
  }
  const targets = prefs.targets || [], rel = {}; let max = 0;
  for (const t of TOPICS) {
    let r = GAMMA * (INTRINSIC[t] ?? 0.5) + (1 - GAMMA) * (role[t] || 0);
    if (firmMix) r = 0.6 * r + 0.4 * (firmMix[t] * TOPICS.length);
    if (targets.includes(t)) r += 0.5;
    r += 0.05; rel[t] = r; max = Math.max(max, r);
  }
  for (const t of TOPICS) rel[t] /= max || 1;
  return rel;
}

export function ratingBand(theta, evidence) {
  const band = theta >= 0.6 ? { label: 'Strong', cls: 'good', color: '#16a34a' }
    : theta >= 0.15 ? { label: 'Solid', cls: 'ok', color: '#2563eb' }
    : theta >= -0.3 ? { label: 'Developing', cls: 'mid', color: '#d97706' }
    : { label: 'Needs work', cls: 'bad', color: '#e0533d' };
  return { ...band, displayLabel: evidence !== undefined && evidence < 4 ? 'Few solved' : band.label };
}
export function readinessZone(pct) {
  return pct >= 80 ? { word: 'Interview-sharp', color: '#16a34a' }
    : pct >= 65 ? { word: 'Interview-ready', color: '#16a34a' }
    : pct >= 45 ? { word: 'Getting there', color: '#2563eb' }
    : pct >= 25 ? { word: 'Building up', color: '#d97706' }
    : { word: 'Early days', color: '#e0533d' };
}

/** Bind previously captured difficulty data; never loads anything itself. */
export function createScoringModel({ difficultyV1 = null, difficultyV2 = null } = {}) {
  const b1 = { ...((difficultyV1 && difficultyV1.b) || difficultyV1 || {}) };
  const b2 = difficultyV2?.b ? { ...difficultyV2.b } : null;
  const c2 = { ...(difficultyV2?.c || {}) };
  const hintCredit = typeof difficultyV2?._meta?.hintCredit === 'number' ? difficultyV2._meta.hintCredit : 0.6;
  const hasV2 = () => !!b2;
  const diffB = (d, di) => typeof b1[di] === 'number' ? b1[di] : (B[d] ?? 0);
  const diffB2 = (d, di) => typeof b2?.[di] === 'number' ? b2[di] : diffB(d, di);
  const guessC2 = di => typeof c2[di] === 'number' ? c2[di] : 0;

  function buildStateCore(opts = {}, v2 = false) {
    const idx = Object.fromEntries((opts.problemsIndex || []).map(p => [p.id, p]));
    const st = newState(), prefs = opts.prefs || {};
    for (const [macro, value] of Object.entries(prefs.rate || {})) {
      const r = RATE[value];
      if (r) for (const topic of MACRO[macro] || []) observeMutable(st, { topic, b: r.b, c: 0, x: r.x, source: 'selfrate' });
    }
    for (const o of prefs.calibration || []) observeMutable(st, {
      topic: o.topic, b: o.b !== undefined ? o.b : diffB(o.diff), c: o.c || 0, x: o.x, source: 'onboarding',
    });
    const progress = opts.progress || {}, history = opts.solvedHistory || {}, attempts = opts.attempts || {};
    const ids = {};
    for (const map of [progress, history, attempts]) for (const key of Object.keys(map)) ids[key] = true;
    const normalize = v => !v ? '' : typeof v === 'string' ? v : typeof v === 'object' ? (v.solved ? 'solved' : v.attempted ? 'attempted' : '') : '';
    for (const id of Object.keys(ids)) {
      const p = idx[+id] || idx[id], h = history[id] || {};
      const topic = p?.c || h.category;
      if (!topic || !Object.hasOwn(st.theta, topic)) continue;
      const d = p?.d || h.diff || 'medium';
      const status = normalize(progress[id]) || normalize(h.status) || (history[id] ? 'solved' : '');
      const ax = attempts[id];
      let x = ax ? (ax.x === 1 || ax.x === 0 ? ax.x : null) : status === 'solved' ? 1 : status === 'attempted' ? 0 : null;
      if (x === null) continue;
      const b = v2 ? diffB2(d, p && p.di) : diffB(d, p && p.di);
      let c = 0;
      if (v2 && ax) {
        c = guessC2(p && p.di);
        x = typeof ax.pc === 'number' ? clamp(ax.pc, 0, 1) : x;
        if (ax.h && x > 0) x *= hintCredit;
      }
      observeMutable(st, { topic, b, c, x, source: ax ? 'solve' : 'status' });
      const secondary = secondaryTopics(p && p.tg, topic);
      for (const t of secondary) observeMutable(st, { topic: t, b, c: 0, x, source: 'solve', weight: CROSS_MASS / secondary.length });
    }
    return st;
  }
  function buildState(opts = {}) {
    if (opts.model === 'v1' || !b2) return buildStateCore(opts, false);
    if (opts.model === 'v2') return buildStateCore(opts, true);
    const weight = blendWeight(opts.now);
    if (weight <= 0) return buildStateCore(opts, false);
    if (weight >= 1) return buildStateCore(opts, true);
    const first = buildStateCore(opts, false), second = buildStateCore(opts, true), out = newState();
    for (const topic of TOPICS) {
      out.theta[topic] = (1 - weight) * first.theta[topic] + weight * second.theta[topic];
      out.nObs[topic] = second.nObs[topic];
    }
    return out;
  }
  function priorities(opts = {}) {
    const st = opts.state || buildState(opts), rel = relevance(opts);
    const target = LEVEL_TARGET[opts.prefs?.level] ?? 0.3;
    return TOPICS.map(topic => {
      const gap = Math.max(0, target - st.theta[topic]), u = uncertainty(st, topic);
      return { topic, theta: st.theta[topic], rel: rel[topic], gap, u, need: rel[topic] * (gap + 0.15 * u), n: st.nObs[topic] };
    }).sort((a, b) => b.need - a.need).map((row, i) => ({ ...row, priority: i + 1 }));
  }
  function readinessDetails(opts, state) {
    const skill = skillOf(state.theta, relevance(opts), state.nObs);
    const assessmentCount = opts.prefs?.calibration?.length || 0;
    const progressCount = Object.keys(opts.progress || {}).length;
    const tau = opts.tau !== undefined ? opts.tau : 130;
    const base = 0.72 * (assessmentCount / (assessmentCount + 2));
    const grind = progressCount / (progressCount + tau);
    const engagement = base + (1 - base) * grind;
    return { readiness: clamp(Math.round(skill * engagement * 100), 2, 99), skill, engagement, assessmentCount, progressCount };
  }
  function readiness(opts = {}) {
    if (!b2 || opts.model === 'v1') return readinessDetails(opts, opts.state || buildStateCore(opts, false)).readiness;
    const r2 = readinessDetails(opts, buildStateCore(opts, true)).readiness;
    if (opts.model === 'v2') return r2;
    const r1 = readinessDetails(opts, buildStateCore(opts, false)).readiness, weight = blendWeight(opts.now);
    return Math.round((1 - weight) * r1 + weight * Math.max(r1, r2));
  }
  function computeOfferBar(opts = {}) {
    const state = opts.state || buildState(opts), score = readiness(opts);
    const rel = relevance(opts), core = ROLE_CORE[opts.prefs?.role] || {};
    const topics = TOPICS.map(topic => {
      const theta = state.theta[topic] || 0, evidence = state.nObs[topic] || 0, band = ratingBand(theta, evidence);
      return { topic, label: TOPIC_LABELS[topic], theta, rating: thetaToRating(theta), evidence, n: evidence,
        band, mastery: masteryOf(theta), evidenced: evidence >= MIN_EVIDENCE, assessed: evidence > 0,
        relevance: rel[topic], isCore: !!core[topic], isFocus: !!core[topic] && band.cls !== 'good',
        barPercent: clamp(Math.round((theta + 1.2) / 2.4 * 100), 5, 100) };
    });
    return { readiness: score, target: OFFER_BAR_TARGET, zone: readinessZone(score), topics, state,
      priorities: priorities({ ...opts, state }),
      diagnostics: readinessDetails(opts, state),
      modelInfo: { requested: opts.model || 'rollout', hasV1: Object.keys(b1).length > 0, hasV2: !!b2,
        blendWeight: blendWeight(opts.now), asOf: opts.now ?? CAPTURED_AT,
        externalStateUsedForReadiness: !!opts.state && (!b2 || opts.model === 'v1'),
        serverVerified: false } };
  }
  return Object.freeze({ newState, observe, relevance, priorities, buildStateCore, buildState, readiness,
    computeOfferBar, diffB, diffB2, guessC2, hasV2, skillOf, uncertainty, calibrate, blendWeight });
}

export function calculateLevel(xp) {
  // Equivalent to the source loop for finite numbers; reject infinite/corrupt input safely.
  const total = Number.isFinite(Number(xp)) ? Math.max(0, Number(xp) || 0) : 0;
  const level = total < 1000 ? 1 + Math.floor(total / 100) : 11 + Math.floor((total - 1000) / 250);
  const currentXP = total < 1000 ? total % 100 : (total - 1000) % 250;
  const nextLevelXP = level <= 10 ? 100 : 250;
  return { level, currentXP, nextLevelXP, percent: Math.floor(currentXP / nextLevelXP * 100) };
}
export function lessonReward(bonusXp) {
  const parsed = parseInt(bonusXp, 10);
  const bonus = Number.isFinite(parsed) ? clamp(parsed, 0, LESSON_XP_BONUS_CAP) : 0;
  return { base: LESSON_XP, bonus, total: LESSON_XP + bonus };
}
export function problemReward(difficulty, { alreadyAwarded = false } = {}) {
  return alreadyAwarded ? 0 : XP_TABLE[difficulty] || 0;
}
export function popQuizScore(correct, total) {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || correct < 0 || total < 0 || correct > total) {
    throw new RangeError('Quiz counts must be integers with 0 <= correct <= total.');
  }
  const percent = total ? Math.round(100 * correct / total) : 0;
  const bonus = Math.round(80 * correct / Math.max(1, total)) + (correct === total ? 20 : 0);
  return { correct, total, percent, bonus, label: percent === 100 ? 'Perfect run!' : percent >= 70 ? 'Solid.' : 'Round two?' };
}

/** Pure first-attempt ledger; authentication/persistence intentionally belong to neither function. */
export function recordAttempt(attempts, id, x, { now = CAPTURED_AT, extra = {} } = {}) {
  const out = { ...(attempts || {}) };
  if (x !== 0 && x !== 1) return { attempts: out, outcome: null };
  const key = String(id), prev = out[key];
  if (prev && now - (prev.at || 0) < ELO_COOLDOWN_MS) return { attempts: out, outcome: 'frozen' };
  const entry = { x, at: now };
  if (extra.h) entry.h = 1;
  if (typeof extra.pc === 'number' && Number.isFinite(extra.pc)) entry.pc = clamp(Math.round(extra.pc * 1000) / 1000, 0, 1);
  if (extra.r === 'reveal') entry.r = 'reveal';
  out[key] = entry;
  return { attempts: out, outcome: prev ? 're-evaluated' : 'recorded' };
}

export const isValidLessonId = id => typeof id === 'string' && /^lec-[a-z0-9][a-z0-9-]{2,48}$/.test(id);
export function creditLesson(ledger, id, bonusXp, { now = CAPTURED_AT, maxLessons = SOURCE_LESSON_LIMIT } = {}) {
  const learnProgress = { ...(ledger || {}) };
  // The captured source checks the cap BEFORE checking duplicate credit.
  if (!isValidLessonId(id) || Object.keys(learnProgress).length >= maxLessons) return { learnProgress, result: { error: 'rejected' } };
  if (Object.hasOwn(learnProgress, id)) return { learnProgress, result: { alreadyEarned: true, base: 20, bonus: 0, total: 0 } };
  const reward = lessonReward(bonusXp);
  learnProgress[id] = { completedAt: new Date(now).toISOString(), xpAwarded: reward.total };
  return { learnProgress, result: { ...reward, awarded: reward.total } };
}

const isoDay = now => new Date(now).toISOString().slice(0, 10);
export function updateStreak(streak, now = CAPTURED_AT) {
  const out = { current: 0, longest: 0, lastActivityDate: null, ...streak };
  const today = isoDay(now);
  if (out.lastActivityDate === today) return out;
  out.current = out.lastActivityDate === isoDay(now - 86400000) ? out.current + 1 : 1;
  out.longest = Math.max(out.longest, out.current);
  out.lastActivityDate = today;
  return out;
}
/** Caller supplies the displayed calendar day; no implicit machine timezone. */
export function activeDaysStreak(days, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today || '')) throw new TypeError('today must be YYYY-MM-DD');
  const set = new Set(days || []);
  let cursor = Date.parse(today + 'T12:00:00Z');
  if (!Number.isFinite(cursor)) throw new TypeError('Invalid calendar date');
  if (!set.has(isoDay(cursor))) cursor -= 86400000;
  let n = 0;
  while (set.has(isoDay(cursor))) { n++; cursor -= 86400000; }
  return n;
}
export function deriveStreak(doc, { today } = {}) {
  const stored = doc?.streak?.current || 0;
  if (!doc?.activeDays?.length) return stored;
  return Math.max(stored, activeDaysStreak(doc.activeDays, today));
}

export function moduleStats(module, progress = {}) {
  const problems = module.problems || [], done = problems.filter(p => progress[p.id] === 'solved').length;
  return { done, total: problems.length, next: problems.find(p => progress[p.id] !== 'solved') || problems[0] || null,
    pct: problems.length ? Math.round(done / problems.length * 100) : 0 };
}
export function orderModules(doc, role = 'unsure') {
  const modules = doc?.modules || [], byId = Object.fromEntries(modules.map(m => [m.id, m]));
  const order = doc?.roleOrder?.[role] || modules.map(m => m.id);
  const out = order.map(id => byId[id]).filter(Boolean);
  return [...out, ...modules.filter(m => !out.includes(m))];
}
export function lessonCompletionStats(lessonIds, completed = []) {
  const doneSet = new Set(completed), done = lessonIds.filter(id => doneSet.has(id)).length;
  return { done, total: lessonIds.length, pct: lessonIds.length ? Math.round(done / lessonIds.length * 100) : 0 };
}

export default createScoringModel;
