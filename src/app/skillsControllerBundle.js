import { createSkillsControllerBundle } from '../modules/skills/controllerBundle.js';

export function createAppSkillsControllerBundle(deps = {}) {
  const {
    clampNumber,
    documentRef: document,
    elements: els,
    escapeHtml,
    getLlmConfig,
    getLlmRequestHeaders,
    getSkillPracticeStats,
    getSkillScore,
    makeId,
    normalizeCategory,
    normalizeGameRecords,
    normalizeLlmModel,
    renderAll,
    renderSummary,
    sampleEntries,
    saveState,
    skillDefs,
    t,
    userState,
    windowRef: window
  } = deps;

  return createSkillsControllerBundle({
    elements: els,
    documentRef: document,
    windowRef: window,
    skillDefs,
    getEndpoint: () => getLlmConfig().endpoint || "",
    getHeaders: getLlmRequestHeaders,
    getModel: () => normalizeLlmModel(getLlmConfig().model),
    getDuration: () => els.durationInput?.value,
    getDifficulty: () => els.difficultyInput?.value,
    normalizeCategory,
    clampNumber,
    getState: () => userState.value,
    sampleEntries,
    makeId,
    saveState,
    renderAll,
    normalizeGameRecords,
    renderSummary,
    getSkills() {
      return userState.value.skills;
    },
    getSkillScore,
    getPracticeStats: getSkillPracticeStats,
    t,
    escapeHtml,
    performanceRef: performance,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    nowIso: () => new Date().toISOString()
  });
}
