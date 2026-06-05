import { listen } from '../../ui/events.js';

export function createPlanModule(deps = {}) {
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

      bind(els.prepPlanSetupForm, "submit", (event) => {
        event.preventDefault();
        deps.create?.();
      });

      bind(els.editPrepPlanBtn, "click", () => {
        deps.edit?.();
      });

      bind(els.prepPlanDashboard, "click", (event) => {
        deps.handleAction?.(event);
      });

      bind(els.prepPlanDashboard, "submit", (event) => {
        if (!event.target.matches("#prepDiagnosticForm")) return;
        event.preventDefault();
        deps.submitDiagnostic?.(event.target);
      });
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
