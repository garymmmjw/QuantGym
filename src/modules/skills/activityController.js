import { getLowestSkillKey } from './classification.js';
import {
  applyClassifiedLogEntry,
  undoLatestSkillEntry
} from './entries.js';

export function createSkillsActivityController(deps = {}) {
  const elements = deps.elements || {};
  const getState = deps.getState || (() => ({}));
  const getRuntime = deps.getRuntime || (() => null);

  async function addEntry() {
    const text = elements.logText?.value?.trim() || "";
    if (!text) {
      if (elements.analysisPreview) elements.analysisPreview.textContent = "先写一点内容。";
      elements.logText?.focus?.();
      return;
    }

    if (elements.analysisPreview) elements.analysisPreview.textContent = "AI 分类中...";
    const result = await classifyEntry(text);
    const difficulty = Number(elements.difficultyInput?.value || 1);
    applyClassifiedLogEntry(getState(), {
      classification: result,
      difficulty,
      id: deps.makeId?.(),
      date: deps.nowIso?.() || new Date().toISOString(),
      text,
      duration: Number(elements.durationInput?.value || 0),
      skillDefs: deps.skillDefs || {}
    });

    deps.saveState?.();
    getClassificationPreviewController().resetCache();
    if (elements.logText) elements.logText.value = "";
    if (elements.durationInput) elements.durationInput.value = "";
    deps.renderAll?.();
  }

  async function classifyEntry(text) {
    return getRuntime()?.classifyEntry(text);
  }

  function analyzeEntry(text) {
    return getRuntime()?.analyzeEntry(text);
  }

  function getClassificationPreviewController() {
    return getRuntime()?.getClassificationPreviewController();
  }

  function updatePreview() {
    getClassificationPreviewController()?.update();
  }

  function scheduleClassificationPreview() {
    getClassificationPreviewController()?.schedule();
  }

  function fillSampleEntry() {
    const samples = Array.isArray(deps.sampleEntries) ? deps.sampleEntries : [];
    if (!samples.length) return;
    const index = Math.floor(Math.random() * samples.length);
    if (elements.logText) elements.logText.value = samples[index];
    if (elements.durationInput) elements.durationInput.value = "45";
    updatePreview();
  }

  function getLowestSkill() {
    return getLowestSkillKey(getState().skills, deps.skillDefs || {});
  }

  function undoLatestEntry() {
    const result = undoLatestSkillEntry(getState(), {
      skillDefs: deps.skillDefs || {}
    });
    if (!result.changed) return;
    deps.saveState?.();
    deps.renderAll?.();
  }

  return {
    addEntry,
    analyzeEntry,
    classifyEntry,
    fillSampleEntry,
    getClassificationPreviewController,
    getLowestSkill,
    scheduleClassificationPreview,
    undoLatestEntry,
    updatePreview
  };
}
