import { generateSequenceQuestion } from './sequenceQuestions.js';
import { generatePatternQuestion } from './patternQuestions.js';
import { normalizeTrainingSettings, trainerKind, trainingSettingsKey } from './trainingSettings.js';

const iso = value => new Date(value).toISOString();
const questionFor = (settings, options) => trainerKind(settings) === 'pattern' ? generatePatternQuestion(settings, options) : generateSequenceQuestion(settings, options);
export function createReasoningTrial(input, { now = Date.now(), id, rng = Math.random, preparationSeconds = 5 } = {}) {
  const settings = normalizeTrainingSettings(input);
  if (trainerKind(settings) === 'math') throw new Error('Choose a sequence or pattern trainer.');
  const started = now + Math.max(0, Math.min(5, Number(preparationSeconds) || 0)) * 1000;
  return { id: id || globalThis.crypto?.randomUUID?.() || `reasoning-${now}-${Math.random().toString(36).slice(2)}`,
    status: 'active', settings, settingsKey: trainingSettingsKey(settings), dailySessionId: null,
    startedAt: iso(started), deadlineAt: iso(started + settings.durationSeconds * 1000), completedAt: null,
    correct: 0, questions: [], currentQuestion: questionFor(settings, { index: 1, now: started, rng }), currentAnswer: '', feedbackQuestionId: null,
  };
}
function closeQuestion(question, outcome, value, at) {
  return { ...question, outcome, submittedAnswer: value || null, completedAt: iso(at), elapsedMs: Math.max(0, at - Date.parse(question.startedAt)) };
}
export function normalizeReasoningAnswer(value) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^[+-]?\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? String(Number(text)) : text;
}
export function transitionReasoningTrial(trial, action, now = Date.now(), rng = Math.random) {
  if (!trial || trial.status !== 'active' || trainerKind(trial) === 'math' || now < Date.parse(trial.startedAt)) return trial;
  const deadline = Date.parse(trial.deadlineAt);
  if (now >= deadline || action.type === 'abort') {
    const expired = now >= deadline;
    const at = expired ? deadline : now;
    return { ...trial, status: expired ? 'completed' : 'aborted', completedAt: iso(at),
      questions: trial.currentQuestion ? [...trial.questions, closeQuestion(trial.currentQuestion, expired ? 'timeout' : 'aborted', trial.currentAnswer, at)] : trial.questions,
      currentQuestion: null, currentAnswer: '', feedbackQuestionId: null,
    };
  }
  if (action.type === 'tick') return trial;
  if (action.type === 'next') {
    if (trial.currentQuestion || !trial.feedbackQuestionId) return trial;
    return { ...trial, feedbackQuestionId: null, currentAnswer: '', currentQuestion: questionFor(trial.settings, { index: trial.questions.length + 1, now, rng }) };
  }
  if (!trial.currentQuestion) return trial;
  if (action.type === 'input') {
    const value = String(action.value ?? '').toUpperCase();
    if (!/^[A-Z0-9+\- ]{0,24}$/.test(value) || value === trial.currentAnswer) return trial;
    return { ...trial, currentAnswer: value };
  }
  if (!['submit', 'skip'].includes(action.type)) return trial;
  const value = normalizeReasoningAnswer(action.value ?? trial.currentAnswer);
  if (action.type === 'submit') {
    if (!/^(?:[+-]?\d+|[A-Z]+)$/.test(value) || value.length > 24) return trial;
    if (trainerKind(trial) === 'pattern' && !trial.currentQuestion.options.some(option => option.id === value)) return trial;
  }
  const outcome = action.type === 'skip' ? 'skipped' : value === normalizeReasoningAnswer(trial.currentQuestion.answer) ? 'correct' : 'wrong';
  const question = closeQuestion(trial.currentQuestion, outcome, value, Math.max(now, Date.parse(trial.currentQuestion.startedAt)));
  return { ...trial, correct: trial.correct + (outcome === 'correct' ? 1 : 0), questions: [...trial.questions, question],
    currentQuestion: null, currentAnswer: '', feedbackQuestionId: question.id,
  };
}
export function persistReasoningTransition(state, trial) {
  if (trial.status === 'active') return { ...state, activeTrial: trial };
  const kind = trainerKind(trial);
  const activity = { id: `${kind}:${trial.id}`, kind, count: trial.correct, completedAt: trial.completedAt, trialId: trial.id, dailySessionId: null };
  return { ...state, activeTrial: null, trials: [trial, ...(state.trials || []).filter(entry => entry.id !== trial.id)],
    activities: [...(state.activities || []).filter(entry => entry.id !== activity.id), activity],
  };
}
/** Cancel only during preparation; stale clicks must not erase a trial that has started. */
export function cancelTrialPreparation(state, trialId, now = Date.now()) {
  return state.activeTrial?.id === trialId && state.activeTrial.status === 'active' && now < Date.parse(state.activeTrial.startedAt)
    ? { ...state, activeTrial: null, removedActivityIds: [...new Set([...(state.removedActivityIds || []), `cancel-preparation:${trialId}`])] } : state;
}
