export const MENTAL_OPERATORS = ['add', 'subtract', 'multiply', 'divide'];

export const DEFAULT_MENTAL_SETTINGS = {
  durationSeconds: 120,
  operations: [...MENTAL_OPERATORS],
  ranges: {
    add: { minA: 2, maxA: 100, minB: 2, maxB: 100 },
    subtract: { minA: 2, maxA: 100, minB: 2, maxB: 100 },
    multiply: { minA: 2, maxA: 12, minB: 2, maxB: 100 },
    divide: { minA: 2, maxA: 12, minB: 2, maxB: 100 },
  },
};

function integer(value, fallback, min, max) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return fallback;
  return Math.min(max, Math.max(min, Math.round(Number(value))));
}

export function normalizeMentalSettings(input = {}) {
  input = input && typeof input === 'object' ? input : {};
  const selected = MENTAL_OPERATORS.filter((op) => input.operations?.includes(op));
  const ranges = {};
  for (const op of MENTAL_OPERATORS) {
    const fallback = DEFAULT_MENTAL_SETTINGS.ranges[op];
    const raw = input.ranges?.[op] || {};
    const minA = integer(raw.minA, fallback.minA, op === 'divide' ? 1 : 0, 9999);
    const maxA = integer(raw.maxA, fallback.maxA, op === 'divide' ? 1 : 0, 9999);
    const minB = integer(raw.minB, fallback.minB, 0, 9999);
    const maxB = integer(raw.maxB, fallback.maxB, 0, 9999);
    ranges[op] = {
      minA: Math.min(minA, maxA), maxA: Math.max(minA, maxA),
      minB: Math.min(minB, maxB), maxB: Math.max(minB, maxB),
    };
  }
  return {
    durationSeconds: integer(input.durationSeconds, 120, 10, 3600),
    operations: selected.length ? selected : [...MENTAL_OPERATORS],
    ranges,
  };
}

export function mentalSettingsKey(input) {
  const settings = normalizeMentalSettings(input);
  return JSON.stringify({ durationSeconds: settings.durationSeconds,
    operations: settings.operations,
    ranges: settings.operations.map((op) => [op, settings.ranges[op]]),
  });
}

function randomInt(min, max, rng) {
  const sample = Math.max(0, Math.min(1 - Number.EPSILON, Number(rng()) || 0));
  return min + Math.floor(sample * (max - min + 1));
}

function questionKey(question) {
  return `${question.operator}:${question.a}:${question.b}`;
}

function makeQuestion(operator, first, second, index, now) {
  const a = operator === 'divide' ? first * second : first;
  const b = operator === 'divide' ? first : second;
  const answer = operator === 'add' ? a + b : operator === 'subtract' ? a - b : operator === 'multiply' ? a * b : second;
  return { id: `q${index}`, index, operator, a, b, answer,
    startedAt: new Date(now).toISOString(), completedAt: null, elapsedMs: null,
    outcome: null, submittedAnswer: null, mistakes: [],
  };
}

export function generateMentalQuestion(input, index = 1, now = Date.now(), rng = Math.random, previousQuestions = []) {
  const settings = normalizeMentalSettings(input);
  const pools = settings.operations.map((operator) => {
    const range = settings.ranges[operator];
    return { operator, range, widthB: range.maxB - range.minB + 1,
      size: (range.maxA - range.minA + 1) * (range.maxB - range.minB + 1) };
  });
  const total = pools.reduce((count, pool) => count + pool.size, 0);
  const seen = new Set(previousQuestions.map(questionKey));
  // Once a small configured pool is exhausted, a repeat is unavoidable. Still
  // keep the next question different from the one the user just answered.
  const excluded = seen.size >= total
    ? new Set(total > 1 && previousQuestions.length ? [questionKey(previousQuestions.at(-1))] : []) : seen;
  const sample = () => {
    const pool = pools[randomInt(0, pools.length - 1, rng)];
    return makeQuestion(pool.operator,
      randomInt(pool.range.minA, pool.range.maxA, rng),
      randomInt(pool.range.minB, pool.range.maxB, rng), index, now);
  };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const question = sample();
    if (!excluded.has(questionKey(question))) return question;
  }
  // A deterministic walk guarantees an unused expression even with a fixed RNG
  // or a nearly exhausted range, without enumerating a potentially huge pool.
  const start = randomInt(0, total - 1, rng);
  for (let offset = 0; offset <= Math.min(excluded.size, total - 1); offset += 1) {
    let slot = (start + offset) % total;
    for (const pool of pools) {
      if (slot >= pool.size) { slot -= pool.size; continue; }
      const first = pool.range.minA + Math.floor(slot / pool.widthB);
      const second = pool.range.minB + slot % pool.widthB;
      const question = makeQuestion(pool.operator, first, second, index, now);
      if (!excluded.has(questionKey(question))) return question;
      break;
    }
  }
  // The one-expression range is intentionally playable for repeated practice.
  return sample();
}

export function createTrial(settings, { now = Date.now(), id, dailySessionId = null, rng = Math.random, preparationSeconds = 0 } = {}) {
  const normalized = normalizeMentalSettings(settings);
  const startsAt = now + Math.max(0, Math.min(5, Number(preparationSeconds) || 0)) * 1000;
  const trialId = id || globalThis.crypto?.randomUUID?.() || `trial-${now}-${Math.random().toString(36).slice(2)}`;
  return { id: trialId, status: 'active', settings: normalized, settingsKey: mentalSettingsKey(normalized),
    dailySessionId, startedAt: new Date(startsAt).toISOString(),
    deadlineAt: new Date(startsAt + normalized.durationSeconds * 1000).toISOString(),
    completedAt: null, correct: 0, questions: [],
    currentQuestion: generateMentalQuestion(normalized, 1, startsAt, rng), currentAnswer: '',
  };
}

export function remainingTrialMs(trial, now = Date.now()) {
  if (!trial || trial.status !== 'active') return 0;
  return Math.max(0, Date.parse(trial.deadlineAt) - now);
}

function closeQuestion(question, outcome, value, now) {
  return { ...question, outcome, submittedAnswer: value || null,
    completedAt: new Date(now).toISOString(),
    elapsedMs: Math.max(0, now - Date.parse(question.startedAt)),
  };
}

export function normalizeMentalAnswer(raw) {
  const value = String(raw ?? '').trim()
    .replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xff10))
    .replace(/[−－]/g, '-');
  return /^-?\d*$/.test(value) && value.length <= 12 ? value : null;
}

export function transitionTrial(trial, action, now = Date.now(), rng = Math.random) {
  if (!trial || trial.status !== 'active' || (trial.settings?.trainer && trial.settings.trainer !== 'math') || now < Date.parse(trial.startedAt)) return trial;
  const deadline = Date.parse(trial.deadlineAt);
  // The deadline wins even when the page was asleep or an answer arrives on its boundary.
  if (now >= deadline || action.type === 'abort') {
    const expired = now >= deadline;
    const end = expired ? deadline : Math.max(Date.parse(trial.startedAt), now);
    const outcome = expired ? 'timeout' : 'aborted';
    return { ...trial, status: expired ? 'completed' : 'aborted', completedAt: new Date(end).toISOString(),
      questions: trial.currentQuestion ? [...trial.questions, closeQuestion(trial.currentQuestion, outcome, trial.currentAnswer, end)] : trial.questions,
      currentQuestion: null, currentAnswer: '',
    };
  }
  if (action.type === 'tick') return trial;
  const current = trial.currentQuestion;
  if (!current) return trial;
  // An input/submit/skip captured for a resolved question must never affect its
  // successor, even when both questions happen to have the same answer.
  if (action.questionId != null && action.questionId !== current.id) return trial;
  const eventAt = Math.max(Date.parse(current.startedAt), now);
  if (action.type === 'input' || action.type === 'submit') {
    // Chinese keyboards can commit full-width digits, and copied negative
    // answers often use a mathematical minus. Canonicalize only these integer
    // characters; decimals, exponents and expressions still remain invalid.
    const value = normalizeMentalAnswer(action.value ?? trial.currentAnswer);
    if (value === null) return trial;
    const completeValue = /^-?\d+$/.test(value);
    if (completeValue && Number(value) === current.answer) {
      return { ...trial, correct: trial.correct + 1,
        questions: [...trial.questions, closeQuestion(current, 'correct', value, eventAt)],
        currentQuestion: generateMentalQuestion(trial.settings, current.index + 1, eventAt, rng, [...trial.questions, current]), currentAnswer: '',
      };
    }
    if (action.type === 'submit' && completeValue) {
      return { ...trial, currentAnswer: value, currentQuestion: { ...current,
        mistakes: [...current.mistakes, { value, submittedAt: new Date(eventAt).toISOString(), elapsedMs: eventAt - Date.parse(current.startedAt) }],
      } };
    }
    return value === trial.currentAnswer ? trial : { ...trial, currentAnswer: value };
  }
  if (action.type === 'skip') {
    return { ...trial, questions: [...trial.questions, closeQuestion(current, 'skipped', trial.currentAnswer, eventAt)],
      currentQuestion: generateMentalQuestion(trial.settings, current.index + 1, eventAt, rng, [...trial.questions, current]), currentAnswer: '',
    };
  }
  return trial;
}

export function summarizeTrial(trial) {
  const questions = Array.isArray(trial?.questions) ? trial.questions : [];
  const correctQuestions = questions.filter((q) => q.outcome === 'correct' && Number.isFinite(q.elapsedMs));
  const times = correctQuestions.map((q) => q.elapsedMs);
  return { correct: trial?.correct || 0,
    skipped: questions.filter((q) => q.outcome === 'skipped').length,
    unfinished: questions.filter((q) => q.outcome === 'timeout' || q.outcome === 'aborted').length,
    mistakes: questions.reduce((total, q) => total + (q.mistakes?.length || 0), 0) + (trial?.currentQuestion?.mistakes?.length || 0),
    meanMs: times.length ? times.reduce((total, time) => total + time, 0) / times.length : null,
    fastestMs: times.length ? Math.min(...times) : null,
  };
}

export function getPersonalBests(trials = [], settings) {
  const key = mentalSettingsKey(settings);
  const matching = trials.filter((trial) => trial.status === 'completed' && (!trial.settings?.trainer || trial.settings.trainer === 'math') && mentalSettingsKey(trial.settings) === key);
  const summaries = matching.map(summarizeTrial);
  const means = summaries.map((s) => s.meanMs).filter((n) => n != null);
  const fastest = summaries.map((s) => s.fastestMs).filter((n) => n != null);
  return { trialCount: matching.length,
    bestCorrect: matching.length ? Math.max(...matching.map((trial) => trial.correct || 0)) : null,
    fastestMs: fastest.length ? Math.min(...fastest) : null,
    bestMeanMs: means.length ? Math.min(...means) : null,
  };
}

export function persistTrialTransition(state, trial) {
  if (trial.status === 'active') return { ...state, activeTrial: trial };
  const existingTrials = state.trials || [];
  const activity = { id: `mental:${trial.id}`, kind: 'mental', count: trial.correct,
    completedAt: trial.completedAt, trialId: trial.id, dailySessionId: trial.dailySessionId,
  };
  return { ...state, activeTrial: null,
    trials: [trial, ...existingTrials.filter((entry) => entry.id !== trial.id)],
    activities: [...(state.activities || []).filter((entry) => entry.id !== activity.id), activity],
  };
}
