import { createSkillsActivityController } from './activityController.js';
import { createSkillsClassificationRuntime } from './classificationRuntime.js';
import { createSkillsGameResultController } from './gameResultController.js';
import { createSkillRadarRuntime } from './radarRuntime.js';

export function createSkillsControllerBundle(deps = {}) {
  let activityController = null;

  const classificationRuntime = createSkillsClassificationRuntime({
    elements: deps.elements,
    documentRef: deps.documentRef,
    windowRef: deps.windowRef,
    skillDefs: deps.skillDefs,
    getEndpoint: deps.getEndpoint,
    getHeaders: deps.getHeaders,
    getModel: deps.getModel,
    getDuration: deps.getDuration,
    getDifficulty: deps.getDifficulty,
    getLowestSkillKey: () => activityController?.getLowestSkill() || "",
    normalizeCategory: deps.normalizeCategory,
    clampNumber: deps.clampNumber
  });

  activityController = createSkillsActivityController({
    elements: deps.elements,
    getState: deps.getState,
    getRuntime: () => classificationRuntime,
    skillDefs: deps.skillDefs,
    sampleEntries: deps.sampleEntries,
    makeId: deps.makeId,
    saveState: deps.saveState,
    renderAll: deps.renderAll,
    nowIso: deps.nowIso
  });

  const gameResultController = createSkillsGameResultController({
    getState: deps.getState,
    makeId: deps.makeId,
    normalizeGameRecords: deps.normalizeGameRecords,
    skillDefs: deps.skillDefs,
    saveState: deps.saveState,
    renderSummary: deps.renderSummary,
    nowIso: deps.nowIso
  });

  const skillRadarRuntime = createSkillRadarRuntime({
    elements: deps.elements,
    skillDefs: deps.skillDefs,
    getSkills: deps.getSkills,
    getSkillScore: deps.getSkillScore,
    getPracticeStats: deps.getPracticeStats,
    t: deps.t,
    escapeHtml: deps.escapeHtml,
    documentRef: deps.documentRef,
    performanceRef: deps.performanceRef,
    requestAnimationFrame: deps.requestAnimationFrame,
    cancelAnimationFrame: deps.cancelAnimationFrame
  });

  return {
    addEntry: activityController.addEntry,
    fillSampleEntry: activityController.fillSampleEntry,
    updatePreview: activityController.updatePreview,
    scheduleClassificationPreview: activityController.scheduleClassificationPreview,
    undoLatestEntry: activityController.undoLatestEntry,
    recordGameResult: gameResultController.record,
    skillRadarRuntime
  };
}
