import { applyGameResult } from './entries.js';

export function createSkillsGameResultController(deps = {}) {
  function record(game, score, detail) {
    applyGameResult(deps.getState?.(), {
      game,
      score,
      detail,
      makeId: deps.makeId,
      normalizeGameRecords: deps.normalizeGameRecords,
      skillDefs: deps.skillDefs,
      nowIso: deps.nowIso || (() => new Date().toISOString())
    });
    deps.saveState?.();
    deps.renderSummary?.();
  }

  return {
    record
  };
}
