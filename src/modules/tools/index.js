import { listen } from '../../ui/events.js';

export function createToolsModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      document.querySelectorAll("[data-drill]").forEach((button) => {
        bind(button, "click", () => {
          document.querySelectorAll("[data-drill]").forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
          deps.setDrillMode?.(button.dataset.drill);
          deps.startDrillSession?.();
        });
      });

      bind(els.drillForm, "submit", (event) => {
        event.preventDefault();
        const selected = event.submitter?.dataset?.drillOption;
        if (selected) deps.checkDrill?.(selected);
      });

      bind(els.startDrillSessionBtn, "click", () => deps.startDrillSession?.());
      bind(els.skipDrillBtn, "click", () => deps.skipDrill?.());
      bind(els.nextDrillBtn, "click", () => deps.advanceDrillQuestion?.());

      bind(els.drillOptions, "click", (event) => {
        const button = event.target.closest("[data-drill-option]");
        if (!button) return;
        deps.checkDrill?.(button.dataset.drillOption);
      });

      bind(els.submitMarketQuoteBtn, "click", () => deps.submitMarketQuote?.());
      bind(els.nextMarketGameBtn, "click", () => deps.newMarketGame?.(true));
    },

    render() {
      deps.render?.();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
