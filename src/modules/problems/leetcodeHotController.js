import {
  createLeetcodeHotPanelState,
  renderLeetcodeHotPanel
} from './leetcodeHot.js';

export function createLeetcodeHotController(deps = {}) {
  const panelState = createLeetcodeHotPanelState(Boolean(deps.initialExpanded));
  const getElements = () => deps.elements || {};
  const getItems = () => deps.items || [];

  function render() {
    const done = new Set();
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

  function toggleDone() {
    return null;
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
