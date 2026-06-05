import { listen } from '../../ui/events.js';

export function createPokerModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const bind = (node, eventName, handler, options) => {
    disposers.push(listen(node, eventName, handler, options));
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(document, "click", (event) => deps.handleDocumentClick?.(event), true);
      bind(document, "submit", (event) => deps.handleDocumentSubmit?.(event), true);

      bind(els.pokerModeSelect, "change", () => deps.resetTournament?.(true));
      bind(els.pokerPreflopPositionSelect, "change", () => deps.renderPreflopChart?.());
      bind(els.pokerPreflopMatrix, "click", (event) => deps.handlePreflopMatrixClick?.(event));
    },

    render() {
      document.body.classList.add("is-poker-module");
      if (!deps.hasGame?.()) deps.loadInitialGame?.();
      deps.renderGame?.();
    },

    unmount() {
      document.body.classList.remove("is-poker-module");
    },

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
      document.body.classList.remove("is-poker-module");
    }
  };
}
