import { activateGlobalSearchResult, createGlobalSearchController } from './globalSearch.js';

export function createGlobalSearchRuntime(deps = {}) {
  const controller = createGlobalSearchController({
    elements: deps.elements,
    buildResults: deps.buildResults,
    activateResult: activate,
    emptyLabel: deps.emptyLabel
  });

  function clear() {
    controller.clear();
  }

  function activate(index) {
    return activateGlobalSearchResult(controller, index, {
      documentRef: deps.documentRef,
      windowRef: deps.windowRef,
      clear,
      switchModule: deps.switchModule,
      openProblem: deps.openProblem,
      setCompanyTier: deps.setCompanyTier,
      setRadarHover: deps.setRadarHover,
      focusNews: deps.focusNews
    });
  }

  return {
    render() {
      controller.render();
    },
    schedule() {
      controller.schedule();
    },
    hide() {
      controller.hide();
    },
    clear,
    handleKeydown(event) {
      controller.handleKeydown(event);
    },
    setComposing(value) {
      controller.setComposing(value);
    }
  };
}
