/**
 * Pure explanation/simulation layer over the captured public scoring model.
 * Inputs are local DTOs. No auth code, storage, network, or account mutation.
 */
import {
  TOPICS, B, K_SRC, INTRINSIC, ROLE_REL, GAMMA, CROSS_MASS,
  CAPTURED_AT, ELO_COOLDOWN_MS, sigmoid, thetaToRating, masteryOf,
  secondaryTopics, createScoringModel, recordAttempt,
} from './scoring-model.mjs';

const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
const finite = (name, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
};
const point = (theta, nObs) => ({ theta, nObs, evidence: nObs, rating: thetaToRating(theta), mastery: masteryOf(theta) });
const clone = value => structuredClone(value);

/** One observation, not an append-to-history operation or a readiness formula. */
export function traceAnswerUpdate({ theta, nObs, b, c = 0, x, source = 'solve', weight = 1 }) {
  for (const [name, value] of Object.entries({ theta, nObs, b, c, x, weight })) finite(name, value);
  if (nObs < 0 || weight < 0 || c < 0 || c > 1 || x < 0 || x > 1) throw new RangeError('Invalid evidence, weight, guessing floor, or outcome.');
  const sourceK = K_SRC[source] || 0.3;
  const p = c + (1 - c) * sigmoid(theta - b);
  const k = weight * sourceK / Math.sqrt(1 + (nObs || 0));
  const deltaTheta = k * (x - p);
  const evidenceDelta = source === 'selfrate' || source === 'status' ? 0 : weight;
  return { p, k, K: k, effectiveX: x, deltaTheta, sourceK, source, weight, b, c,
    evidenceDelta, before: point(theta, nObs), after: point(theta + deltaTheta, nObs + evidenceDelta) };
}

function itemNumber(map, displayId) {
  return displayId !== undefined && displayId !== null && typeof map?.[displayId] === 'number';
}

/**
 * Resolve a real graded attempt as buildStateCore does. An absent/invalid
 * attempt returns eligible:false; it is not silently invented from completion.
 * Full-map simulation below still preserves the source's status-only fallback.
 * modelVersion is deliberately v1 or v2: rollout blends two rebuilt states,
 * rather than assigning one blended b/c/x to an observation.
 */
export function resolveProblemObservation({ problem, attempt, modelVersion = 'v1', difficultyV1 = null, difficultyV2 = null }) {
  if (!problem || typeof problem !== 'object') throw new TypeError('problem must be a problem-index object.');
  if (modelVersion !== 'v1' && modelVersion !== 'v2') throw new RangeError('Resolve v1 and v2 separately; rollout is a blend of states.');
  const model = createScoringModel({ difficultyV1, difficultyV2 });
  const hasV2 = model.hasV2(), effectiveVersion = modelVersion === 'v2' && hasV2 ? 'v2' : 'v1';
  const isV2 = effectiveVersion === 'v2', displayId = problem.di, difficulty = problem.d || 'medium';
  const first = difficultyV1?.b || difficultyV1 || {};
  const bSource = isV2 && itemNumber(difficultyV2?.b, displayId) ? 'fitted-v2'
    : itemNumber(first, displayId) ? 'fitted-v1'
      : Object.hasOwn(B, difficulty) ? 'authored-label' : 'unknown-label-zero';
  const b = isV2 ? model.diffB2(difficulty, displayId) : model.diffB(difficulty, displayId);
  const rawX = attempt?.x === 0 || attempt?.x === 1 ? attempt.x : null;
  const partialProvided = typeof attempt?.pc === 'number';
  const hintProvided = !!attempt?.h;
  const hintCredit = typeof difficultyV2?._meta?.hintCredit === 'number' ? difficultyV2._meta.hintCredit : 0.6;
  const beforeHint = isV2 && partialProvided ? clamp(attempt.pc, 0, 1) : rawX;
  const hintApplied = isV2 && hintProvided && beforeHint > 0;
  const effectiveX = rawX === null ? null : hintApplied ? beforeHint * hintCredit : beforeHint;
  const c = isV2 && attempt ? model.guessC2(displayId) : 0;
  const topicKnown = TOPICS.includes(problem.c);
  const eligible = topicKnown && rawX !== null;
  const source = attempt ? 'solve' : 'status';
  const notes = [];
  if (!topicKnown) notes.push('The primary topic is outside the 17-topic model; the source skips this problem.');
  if (rawX === null) notes.push('No valid graded x=0|1 was supplied. No graded observation is invented.');
  if (modelVersion === 'v2' && !hasV2) notes.push('No V2 b map is available; the public model falls back to V1, including ignoring hint/partial-credit/guessing adjustments.');
  if (!isV2 && (partialProvided || hintProvided)) notes.push('V1 uses the binary x and ignores pc/h and item guessing floors.');
  if (attempt?.r === 'reveal') notes.push('The reveal marker is retained in the attempt ledger; it does not independently alter x, b, c, or K.');
  const observation = eligible ? { topic: problem.c, b, c, x: effectiveX, source, weight: 1 } : null;
  const secondary = eligible ? secondaryTopics(problem.tg, problem.c) : [];
  const secondaryObservations = secondary.map(topic => ({ topic, b, c: 0, x: effectiveX, source: 'solve', weight: CROSS_MASS / secondary.length }));
  return {
    eligible, topic: problem.c, problemId: problem.id, displayId,
    requestedModelVersion: modelVersion, modelVersion: effectiveVersion, hasV2,
    difficulty, b, c, rawX, effectiveX, source, bSource,
    cSource: !isV2 ? 'ignored-v1' : itemNumber(difficultyV2?.c, displayId) ? 'fitted-v2' : 'zero-missing',
    applications: {
      partialCredit: { provided: partialProvided, applied: eligible && isV2 && partialProvided, raw: attempt?.pc ?? null, valueBeforeHint: beforeHint },
      hint: { provided: hintProvided, applied: eligible && hintApplied, multiplier: isV2 ? hintCredit : 1 },
      guessing: { applied: eligible && isV2, value: c, primaryOnly: true },
    },
    observation, secondaryObservations, notes,
  };
}

/** A transparent decomposition of the exact relevance function, not skill weights. */
export function roleWeightBreakdown({ prefs = {}, problemsIndex = [] } = {}) {
  const requestedRole = prefs.role || 'unsure';
  const role = Object.hasOwn(ROLE_REL, requestedRole) ? requestedRole : 'unsure';
  const roleMap = ROLE_REL[role], firms = prefs.targetFirms || prefs.firms || [], targets = prefs.targets || [];
  const counts = {}; let firmMatchedCount = 0;
  for (const problem of problemsIndex) {
    if (Array.isArray(problem.co) && problem.co.some(company => firms.includes(company))) {
      counts[problem.c] = (counts[problem.c] || 0) + 1;
      firmMatchedCount++;
    }
  }
  const firmMixApplied = firms.length > 0 && firmMatchedCount >= 10;
  const topics = TOPICS.map(topic => {
    const intrinsic = INTRINSIC[topic] ?? 0.5, rawRole = roleMap[topic] || 0;
    const rawBlend = GAMMA * intrinsic + (1 - GAMMA) * rawRole;
    const firmMix = firmMixApplied ? (counts[topic] || 0) / firmMatchedCount : null;
    const firmScaled = firmMixApplied ? firmMix * TOPICS.length : 0;
    const afterFirmMix = firmMixApplied ? 0.6 * rawBlend + 0.4 * firmScaled : rawBlend;
    const targetBoost = targets.includes(topic) ? 0.5 : 0, floor = 0.05;
    return { topic, intrinsic, rawRole, rawBlend, firmCount: counts[topic] || 0,
      firmMix, firmScaled, afterFirmMix, targetBoost, floor, unnormalized: afterFirmMix + targetBoost + floor };
  });
  const normalization = Math.max(...topics.map(topic => topic.unnormalized)) || 1;
  for (const topic of topics) {
    topic.normalization = normalization;
    topic.final = topic.normalizedRel = topic.unnormalized / normalization;
  }
  return { role, requestedRole, topics, relevance: Object.fromEntries(topics.map(topic => [topic.topic, topic.final])),
    firmMatchedCount, firmMixApplied, normalization,
    constants: { intrinsicWeight: GAMMA, roleWeight: 1 - GAMMA, firmThreshold: 10, baseMixWeight: 0.6, firmMixWeight: 0.4, topicCount: TOPICS.length, targetBoost: 0.5, floor: 0.05 } };
}

function replayOrder(input) {
  const ids = {};
  for (const map of [input.progress || {}, input.solvedHistory || {}, input.attempts || {}]) {
    for (const id of Object.keys(map)) ids[id] = true;
  }
  // This exactly follows JS object-key enumeration in the captured calculator:
  // integer-like keys first, ascending; other keys in insertion order. Not time.
  return Object.keys(ids);
}

/**
 * Apply the attempt ledger's 30-day rule, then replay all original input maps.
 * Progress follows the captured solveRecordResult producer: correct promotes to
 * solved; wrong sets attempted only when getStatus is empty. A frozen graded
 * attempt does not stop this branch. Like Auth.getStatus, a truthy progress value
 * is returned unchanged (including legacy objects); input.localStatuses is an
 * optional snapshot of its UID-scoped local fallback. updateProgress:false
 * models recordAttempt alone. Requested progress writes are assumed successful;
 * saveStatus's 3-second guard, XP, history and persistence are outside this helper.
 */
export function simulateRecordedAnswer({ input = {}, problemId, x, extra = {}, now = CAPTURED_AT,
  difficultyV1 = null, difficultyV2 = null, updateProgress = true }) {
  finite('now', now);
  if (problemId === null || problemId === undefined) throw new TypeError('problemId is required.');
  const beforeInput = clone(input);
  const discardedExternalState = Object.hasOwn(beforeInput, 'state');
  delete beforeInput.state;
  beforeInput.now = now;
  const key = String(problemId);
  const index = Object.fromEntries((beforeInput.problemsIndex || []).map(problem => [problem.id, problem]));
  const problem = index[+key] || index[key];
  if (!problem) throw new RangeError('problemId must be an internal id in input.problemsIndex.');
  const updatedInput = clone(beforeInput), beforeAttempts = beforeInput.attempts || {};
  const recorded = recordAttempt(beforeAttempts, problemId, x, { now, extra });
  updatedInput.attempts = clone(recorded.attempts);
  const validX = x === 0 || x === 1;
  const previousProgress = beforeInput.progress?.[key];
  const statusBefore = previousProgress || beforeInput.localStatuses?.[key] || '';
  const statusAction = !validX || !updateProgress ? null
    : x === 1 && statusBefore !== 'solved' ? 'solved'
      : x === 0 && !statusBefore ? 'attempted' : null;
  if (statusAction) {
    updatedInput.progress = { ...(updatedInput.progress || {}), [key]: statusAction };
  }
  const model = createScoringModel({ difficultyV1, difficultyV2 });
  const reports = snapshot => Object.fromEntries(['v1', 'v2', 'rollout'].map(version => {
    const report = model.computeOfferBar({ ...snapshot, now, model: version });
    report.modelInfo.effectiveModel = version === 'v1' || !model.hasV2() ? 'v1' : version;
    return [version, report];
  }));
  const before = reports(beforeInput), after = reports(updatedInput);
  const attemptChanged = recorded.outcome === 'recorded' || recorded.outcome === 're-evaluated';
  const nextProgress = updatedInput.progress?.[key];
  const progressChanged = JSON.stringify(previousProgress) !== JSON.stringify(nextProgress);
  const previousAttempt = beforeAttempts[key] || null, nextAttempt = updatedInput.attempts[key] || null;
  const previousAt = previousAttempt?.at || 0;
  const notes = [
    'Each report rebuilds state from prefs/calibration, progress, solvedHistory and attempts. No external theta/state is added.',
    'Replacing one attempt replays the full map in JS object-key order, not timestamp order; the overall delta is not one extra observation appended to the old state.',
    'Progress follows solveRecordResult: a correct result promotes to solved; a wrong result marks attempted only if getStatus is empty. Graded-attempt freezing does not stop that branch.',
    'Requested progress writes are assumed successful. The 3-second saveStatus guard, solved-history/XP side effects, authentication and server persistence are not simulated.',
  ];
  if (recorded.outcome === 'frozen') notes.push('The stored graded attempt is frozen. A new progress key may still raise engagement/readiness; frozen does not mean every displayed score is frozen.');
  if (recorded.outcome === 're-evaluated') notes.push('The old attempt entry was replaced after 30 days; its evidence was not accumulated as a second entry.');
  if (!validX) notes.push('Invalid binary outcome: neither attempt nor progress was changed.');
  return {
    outcome: recorded.outcome, updatedInput, before, after,
    attemptChanged, progressChanged, discardedExternalState,
    progressPolicy: updateProgress ? 'source-solve-result' : 'unchanged',
    statusBefore: clone(statusBefore), statusAction,
    attemptBefore: clone(previousAttempt), attemptAfter: clone(nextAttempt),
    progressBefore: previousProgress ?? null, progressAfter: nextProgress ?? null,
    progressKeyAdded: !Object.hasOwn(beforeInput.progress || {}, key) && Object.hasOwn(updatedInput.progress || {}, key),
    cooldown: { durationMs: ELO_COOLDOWN_MS, previousAt: previousAttempt ? previousAt : null,
      eligibleAt: previousAttempt ? previousAt + ELO_COOLDOWN_MS : null,
      remainingMs: previousAttempt ? Math.max(0, previousAt + ELO_COOLDOWN_MS - now) : 0 },
    replayOrder: { before: replayOrder(beforeInput), after: replayOrder(updatedInput) },
    resolved: Object.fromEntries(['v1', 'v2'].map(modelVersion => [modelVersion,
      resolveProblemObservation({ problem, attempt: nextAttempt, modelVersion, difficultyV1, difficultyV2 })])),
    changes: Object.fromEntries(['v1', 'v2', 'rollout'].map(version => [version, {
      abilityChanged: TOPICS.some(topic => before[version].state.theta[topic] !== after[version].state.theta[topic]
        || before[version].state.nObs[topic] !== after[version].state.nObs[topic]),
      readinessDelta: after[version].readiness - before[version].readiness,
      progressCountDelta: after[version].diagnostics.progressCount - before[version].diagnostics.progressCount,
    }])), notes,
  };
}
