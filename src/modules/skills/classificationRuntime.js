import {
  analyzeEntry as analyzeEntryValue,
  createLogClassificationRequester,
  getClassifyEndpoint,
  normalizeClassification as normalizeClassificationValue
} from './classification.js';
import { createClassificationPreviewController } from './classificationPreview.js';

export function createSkillsClassificationRuntime(deps = {}) {
  let logClassificationRequester = null;
  let classificationPreviewController = null;

  function getLogClassificationRequester() {
    if (!logClassificationRequester) {
      logClassificationRequester = createLogClassificationRequester({
        getEndpoint: () => getClassifyEndpoint(deps.getEndpoint?.() || ""),
        getHeaders: deps.getHeaders,
        getModel: deps.getModel,
        getDuration: deps.getDuration,
        getDifficulty: deps.getDifficulty,
        getSkillLabels: () => Object.fromEntries(
          Object.entries(deps.skillDefs || {}).map(([key, def]) => [key, def.name])
        )
      });
    }
    return logClassificationRequester;
  }

  function analyzeEntry(text) {
    return analyzeEntryValue(text, {
      skillDefs: deps.skillDefs || {},
      duration: Number(deps.getDuration?.() || 0),
      lowestSkillKey: deps.getLowestSkillKey?.()
    });
  }

  function normalizeClassification(remote, fallback) {
    return normalizeClassificationValue(remote, fallback, {
      skillDefs: deps.skillDefs || {},
      normalizeCategory: deps.normalizeCategory,
      clampNumber: deps.clampNumber
    });
  }

  async function classifyEntry(text) {
    const local = analyzeEntry(text);
    try {
      const remote = await getLogClassificationRequester().request(text, local);
      return normalizeClassification(remote, local);
    } catch {
      return local;
    }
  }

  function getClassificationPreviewController() {
    if (!classificationPreviewController) {
      classificationPreviewController = createClassificationPreviewController({
        analyzeEntry,
        classifyEntry,
        documentRef: deps.documentRef || globalThis.document,
        elements: deps.elements || {},
        skillDefs: deps.skillDefs || {},
        windowRef: deps.windowRef || globalThis.window
      });
    }
    return classificationPreviewController;
  }

  return {
    analyzeEntry,
    classifyEntry,
    getClassificationPreviewController,
    getLogClassificationRequester,
    resetPreviewCache() {
      getClassificationPreviewController().resetCache();
    },
    schedulePreview() {
      getClassificationPreviewController().schedule();
    },
    updatePreview() {
      getClassificationPreviewController().update();
    }
  };
}
