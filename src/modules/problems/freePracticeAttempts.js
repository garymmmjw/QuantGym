export const FREE_PRACTICE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FREE_PRACTICE_OUTCOMES = Object.freeze(['correct', 'idea_wrong', 'wrong']);
const outcomes = new Set(FREE_PRACTICE_OUTCOMES);

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const timestamp = value => {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  if (typeof value === 'string' && !value.trim()) return NaN;
  const result = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(result) && Math.abs(result) <= 8.64e15 ? result : NaN;
};
const iso = value => new Date(value).toISOString();
const validId = value => typeof value === 'string' && value.trim() && value.trim().length <= 512 ? value.trim() : '';
const seconds = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const nowValue = value => {
  if (typeof value !== 'number' || !Number.isFinite(timestamp(value))) throw new TypeError('nowMs must be a finite timestamp.');
  return value;
};

function normalizeAttempt(value) {
  if (!isObject(value) || !validId(value.id) || !outcomes.has(value.outcome)) return null;
  const started = timestamp(value.startedAt), recorded = timestamp(value.recordedAt);
  if (!Number.isFinite(started) || !Number.isFinite(recorded) || started > recorded) return null;
  const updated = timestamp(value.updatedAt);
  return {
    id: validId(value.id), startedAt: iso(started), recordedAt: iso(recorded),
    updatedAt: iso(Number.isFinite(updated) ? Math.max(recorded, updated) : recorded),
    outcome: value.outcome,
    elapsedSeconds: value.elapsedSeconds === undefined ? seconds((recorded - started) / 1000) : seconds(value.elapsedSeconds),
    answerViewed: value.answerViewed === true, hintViewed: value.hintViewed === true
  };
}

export function normalizeFreePracticeSession(value) {
  if (!isObject(value) || !validId(value.id) || !Number.isFinite(timestamp(value.startedAt))) return null;
  return { id: validId(value.id), startedAt: iso(timestamp(value.startedAt)),
    answerViewed: value.answerViewed === true, hintViewed: value.hintViewed === true };
}

function leafRecords(value) {
  const parent = normalizeAttempt(value);
  if (!parent) return [];
  const leaves = Array.isArray(value.syncRecords) ? value.syncRecords.map(normalizeAttempt).filter(Boolean) : [];
  // A merged group is a view of its leaves, not another result. Keeping the
  // original leaves makes out-of-order/incremental cloud merges lossless.
  return leaves.some(leaf => leaf.id === parent.id) ? leaves : [parent];
}

function latestResult(left, right) {
  const difference = timestamp(left.updatedAt) - timestamp(right.updatedAt);
  if (difference) return difference > 0 ? left : right;
  return compareText(left.outcome, right.outcome) >= 0 ? left : right;
}

function sameId(left, right) {
  const earliest = timestamp(left.recordedAt) < timestamp(right.recordedAt) ? left
    : timestamp(left.recordedAt) > timestamp(right.recordedAt) ? right
      : left.elapsedSeconds <= right.elapsedSeconds ? left : right;
  const latest = latestResult(left, right);
  return { ...latest, id: left.id,
    startedAt: iso(Math.min(timestamp(left.startedAt), timestamp(right.startedAt))),
    recordedAt: earliest.recordedAt, elapsedSeconds: earliest.elapsedSeconds,
    answerViewed: left.answerViewed || right.answerViewed, hintViewed: left.hintViewed || right.hintViewed };
}

const chronological = (left, right) => timestamp(left.recordedAt) - timestamp(right.recordedAt) || compareText(left.id, right.id);

function collapseGroup(records) {
  const anchor = records[0];
  const latest = records.reduce(latestResult);
  const result = { ...anchor, outcome: latest.outcome, updatedAt: latest.updatedAt,
    startedAt: iso(Math.min(...records.map(record => timestamp(record.startedAt)))),
    answerViewed: records.some(record => record.answerViewed), hintViewed: records.some(record => record.hintViewed) };
  if (records.length > 1) result.syncRecords = records.map(record => ({ ...record }));
  return result;
}

export function mergeFreePracticeAttempts(lists = []) {
  const byId = new Map();
  for (const raw of Array.isArray(lists) ? lists.flat() : []) {
    for (const record of leafRecords(raw)) {
      byId.set(record.id, byId.has(record.id) ? sameId(byId.get(record.id), record) : record);
    }
  }
  const ordered = [...byId.values()].sort(chronological);
  const groups = [];
  let current = [];
  for (const record of ordered) {
    if (current.length && timestamp(record.recordedAt) >= timestamp(current[0].recordedAt) + FREE_PRACTICE_WINDOW_MS) {
      groups.push(collapseGroup(current));
      current = [];
    }
    current.push(record);
  }
  if (current.length) groups.push(collapseGroup(current));
  return groups;
}

export function normalizeFreePracticeAttempts(value) {
  return mergeFreePracticeAttempts([Array.isArray(value) ? value : []]);
}

const includesSession = (attempts, session) => Boolean(session && attempts.some(attempt => attempt.id === session.id
  || attempt.syncRecords?.some(record => record.id === session.id)));

export function getFreePracticeStatus(state = {}, nowMs) {
  const now = nowValue(nowMs);
  const attempts = normalizeFreePracticeAttempts(state?.freePracticeAttempts);
  const latestAttempt = attempts.at(-1) || null;
  const expires = latestAttempt ? timestamp(latestAttempt.recordedAt) + FREE_PRACTICE_WINDOW_MS : null;
  // A clock moving backwards must not create a second result for a saved window.
  const canRevise = Boolean(latestAttempt && now < expires);
  const normalizedSession = normalizeFreePracticeSession(state?.freePracticeSession);
  const session = !canRevise && !includesSession(attempts, normalizedSession) ? normalizedSession : null;
  return {
    selectedOutcome: canRevise ? latestAttempt.outcome : null,
    canRevise, windowExpiresAt: expires === null ? null : iso(expires), windowExpiresAtMs: expires,
    attemptCount: attempts.length, latestAttempt,
    elapsedSeconds: canRevise ? latestAttempt.elapsedSeconds : session ? seconds((now - timestamp(session.startedAt)) / 1000) : 0,
    isRunning: Boolean(session), sessionId: session?.id || null,
    answerViewed: canRevise ? latestAttempt.answerViewed : Boolean(session?.answerViewed),
    hintViewed: canRevise ? latestAttempt.hintViewed : Boolean(session?.hintViewed)
  };
}

function newSessionId(state, now, requested, attempts) {
  const ids = new Set(attempts.flatMap(attempt => [attempt.id, ...(attempt.syncRecords || []).map(record => record.id)]));
  const base = validId(requested) || `free-${String(state?.problemId || 'problem').slice(0, 350)}-${now}`;
  let result = base, suffix = 0;
  while (ids.has(result)) result = `${base.slice(0, 450)}-${now}-${++suffix}`;
  return result;
}

export function startFreePractice(state = {}, nowMs, id) {
  const now = nowValue(nowMs), attempts = normalizeFreePracticeAttempts(state?.freePracticeAttempts);
  const status = getFreePracticeStatus(state, now);
  if (status.canRevise) return { ...state, freePracticeAttempts: attempts, freePracticeSession: null };
  const existing = normalizeFreePracticeSession(state?.freePracticeSession);
  const session = existing && !includesSession(attempts, existing) ? existing : {
    id: newSessionId(state, now, id, attempts), startedAt: iso(now), answerViewed: false, hintViewed: false
  };
  return { ...state, freePracticeAttempts: attempts, freePracticeSession: session };
}

function changeLatest(attempts, changes) {
  const latest = attempts.at(-1);
  const updated = { ...latest, ...changes };
  if (latest.syncRecords) {
    updated.syncRecords = latest.syncRecords.map(record => record.id === latest.id ? { ...record, ...changes } : { ...record });
  }
  return mergeFreePracticeAttempts([attempts.slice(0, -1), [updated]]);
}

export function recordFreePracticeOutcome(state = {}, outcome, nowMs, id) {
  if (!outcomes.has(outcome)) throw new TypeError('Invalid free-practice outcome.');
  const now = nowValue(nowMs), status = getFreePracticeStatus(state, now);
  if (status.canRevise) {
    const attempts = normalizeFreePracticeAttempts(state?.freePracticeAttempts);
    return { ...state, freePracticeAttempts: changeLatest(attempts, { outcome, updatedAt: iso(Math.max(now, timestamp(status.latestAttempt.updatedAt))) }), freePracticeSession: null };
  }
  const started = startFreePractice(state, now, id), session = started.freePracticeSession;
  const attempt = { id: session.id, startedAt: iso(Math.min(now, timestamp(session.startedAt))),
    recordedAt: iso(now), updatedAt: iso(now), outcome,
    elapsedSeconds: seconds((now - timestamp(session.startedAt)) / 1000), answerViewed: session.answerViewed, hintViewed: session.hintViewed };
  return { ...started, freePracticeAttempts: mergeFreePracticeAttempts([started.freePracticeAttempts, [attempt]]), freePracticeSession: null };
}

export function markFreePracticeReveal(state = {}, block, nowMs) {
  if (!['answer', 'hint'].includes(block)) throw new TypeError('Invalid free-practice reveal block.');
  const now = nowValue(nowMs), field = `${block}Viewed`, status = getFreePracticeStatus(state, now);
  if (status.canRevise) {
    const attempts = normalizeFreePracticeAttempts(state?.freePracticeAttempts);
    // Reveals merge monotonically with OR. They must not advance the result's
    // edit timestamp: a stale tab opening an answer must not undo a newer grade.
    const changes = status[field] ? {} : { [field]: true };
    return { ...state, freePracticeAttempts: changeLatest(attempts, changes), freePracticeSession: null };
  }
  const started = startFreePractice(state, now);
  return { ...started, freePracticeSession: { ...started.freePracticeSession, [field]: true } };
}
