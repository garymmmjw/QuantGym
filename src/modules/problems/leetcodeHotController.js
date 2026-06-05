import {
  createLeetcodeHotPanelState,
  renderLeetcodeHotPanel
} from './leetcodeHot.js';
import { toggleLeetcodeHotDoneState } from './progress.js';

export function createLeetcodeHotController(deps = {}) {
  const panelState = createLeetcodeHotPanelState(Boolean(deps.initialExpanded));
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const getItems = () => deps.items || [];
  const normalizeDoneIds = (ids) => deps.normalizeDoneIds?.(ids) || [];

  function render() {
    const state = getState();
    const done = new Set(normalizeDoneIds(state.leetcodeHot100Done));
    deps.renderProblemCollectionGrid?.();
    renderLeetcodeHotPanel({
      elements: getElements(),
      items: getItems(),
      doneIds: done,
      expanded: panelState.isExpanded(),
      isEnglish: deps.getLanguage?.() === "en",
      t: deps.t,
      emptyBlock: deps.emptyBlock,
      toggleDone
    });
    deps.refreshIcons?.();
  }

  function toggleDone(problemId) {
    const state = getState();
    const next = toggleLeetcodeHotDoneState({
      problemId,
      doneIds: state.leetcodeHot100Done,
      hotItems: getItems(),
      currentLeetcodeSkill: state.skills?.leetcode,
      normalizeDoneIds
    });
    if (!next) return null;
    state.leetcodeHot100Done = next.doneIds;
    if (!state.skills) state.skills = {};
    state.skills.leetcode = next.leetcodeSkill;
    deps.saveState?.();
    render();
    deps.renderSummary?.();
    deps.renderProblemCompletionDashboard?.();
    deps.renderSkills?.();
    return next;
  }

  function togglePanel() {
    panelState.toggle();
    render();
    return panelState.isExpanded();
  }

  return {
    isExpanded: panelState.isExpanded,
    render,
    setExpanded: panelState.setExpanded,
    toggleDone,
    togglePanel
  };
}
