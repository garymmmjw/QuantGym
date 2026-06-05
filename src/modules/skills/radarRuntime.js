import { createSkillRadarController } from './radar.js';

export function createSkillRadarRuntime(deps = {}) {
  let radarController = null;

  function getRadarController() {
    if (!radarController) {
      radarController = createSkillRadarController({
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
    }
    return radarController;
  }

  return {
    clearHover() {
      getRadarController().clearHover();
    },
    draw(highlightKey, options = {}) {
      getRadarController().draw(highlightKey, options);
    },
    focusFirst() {
      getRadarController().focusFirst();
    },
    getHoverKey() {
      return getRadarController().getHoverKey();
    },
    getRadarController,
    handleMove(event) {
      getRadarController().handleMove(event);
    },
    setHover(skillKey, event) {
      getRadarController().setHover(skillKey, event);
    },
    updateLegendHighlight(skillKey) {
      getRadarController().updateLegendHighlight(skillKey);
    }
  };
}
