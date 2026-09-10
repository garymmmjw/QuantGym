import { normalizeMentalSettings, mentalSettingsKey, summarizeTrial } from './mentalEngine.js';

export const TRAINER_LABELS = { math: 'Math Trainer', sequence: 'Sequence Trainer', pattern: 'Pattern Trainer' };
export function trainerKind(input) {
  const settings = input?.settings || input;
  return ['sequence', 'pattern'].includes(settings?.trainer) ? settings.trainer : 'math';
}
export const difficultyLabel = (difficulty, language = 'zh') => ({ easy: language === 'en' ? 'Easy' : '基础', medium: language === 'en' ? 'Medium' : '进阶', hard: language === 'en' ? 'Hard' : '挑战' })[difficulty] || difficulty;
export const sequenceTypeLabel = (type, language = 'zh') => ({ numbers: language === 'en' ? 'Numbers' : '数字', letters: language === 'en' ? 'Letters' : '字母', mixed: language === 'en' ? 'Numbers + letters' : '数字 + 字母' })[type] || type;
export function normalizeTrainingSettings(input = {}) {
  input = input || {};
  const trainer = trainerKind(input);
  if (trainer === 'math') return normalizeMentalSettings(input);
  const value = Number(input.durationSeconds);
  return { trainer,
    durationSeconds: input.durationSeconds === '' || input.durationSeconds == null || !Number.isFinite(value) ? 300 : Math.min(3600, Math.max(10, Math.round(value))),
    difficulty: ['easy', 'medium', 'hard'].includes(input.difficulty) ? input.difficulty : 'medium',
    ...(trainer === 'sequence' ? { sequenceType: ['numbers', 'letters', 'mixed'].includes(input.sequenceType) ? input.sequenceType : 'mixed' } : {}),
  };
}
export function trainingSettingsKey(input) {
  const settings = normalizeTrainingSettings(input);
  return trainerKind(settings) === 'math' ? mentalSettingsKey(settings) : JSON.stringify(settings);
}
export function getTrainingBests(trials = [], input) {
  const key = trainingSettingsKey(input);
  const matching = trials.filter(trial => trial.status === 'completed' && trainingSettingsKey(trial.settings) === key);
  const summaries = matching.map(summarizeTrial);
  const minimum = values => values.reduce((best, value) => value == null ? best : best == null ? value : Math.min(best, value), null);
  return { trialCount: matching.length,
    bestCorrect: matching.length ? matching.reduce((best, trial) => Math.max(best, trial.correct), 0) : null,
    fastestMs: minimum(summaries.map(summary => summary.fastestMs)),
    bestMeanMs: minimum(summaries.map(summary => summary.meanMs)),
  };
}
