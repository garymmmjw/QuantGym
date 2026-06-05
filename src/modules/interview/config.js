import { clampNumber } from '../../lib/number.js';
import {
  interviewDifficultyDefs,
  interviewFocusDefs,
  interviewModeDefs,
  interviewPersonaDefs
} from './defs.js';

export function normalizeInterviewSessionConfig(raw = {}, options = {}) {
  const focusDefs = options.focusDefs || interviewFocusDefs;
  const modeDefs = options.modeDefs || interviewModeDefs;
  const difficultyDefs = options.difficultyDefs || interviewDifficultyDefs;
  const personaDefs = options.personaDefs || interviewPersonaDefs;
  const focusKey = focusDefs[raw.focusKey] ? raw.focusKey : "mixed";
  const mode = modeDefs[raw.mode] ? raw.mode : "practice";
  const difficulty = difficultyDefs[raw.difficulty] ? raw.difficulty : "adaptive";
  const persona = personaDefs[raw.persona] ? raw.persona : "neutral";
  const defaultQuestionCount = options.defaultQuestionCount || 3;
  const questionCount = Math.round(clampNumber(raw.questionCount || defaultQuestionCount, 1, 12));
  const durationMinutes = Math.round(clampNumber(raw.durationMinutes || 0, 0, 90));
  const focus = focusDefs[focusKey] || focusDefs.mixed || {};
  const currentSource = options.currentSource === "pdf" ? "pdf" : "full";

  return {
    language: raw.language === "en" ? "en" : "zh",
    mode,
    focusKey,
    focusTags: [focusKey, ...(focus.categories || [])],
    difficulty,
    questionCount: durationMinutes ? 0 : questionCount,
    durationMinutes,
    persona,
    ttsEnabled: raw.ttsEnabled !== false,
    source: raw.source === "pdf" || currentSource === "pdf" ? "pdf" : "full"
  };
}

export function getInterviewTypeForConfig(config = {}, options = {}) {
  const focusDefs = options.focusDefs || interviewFocusDefs;
  return focusDefs[config.focusKey]?.type || options.fallbackType || "oa";
}
