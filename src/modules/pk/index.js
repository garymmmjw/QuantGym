import { listen } from '../../ui/events.js';

export function createPkModule(deps = {}) {
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

      bind(els.startPkBtn, "click", () => deps.start?.());
      bind(els.pkRevealBtn, "click", () => deps.reveal?.());
      bind(els.pkForm, "submit", (event) => {
        event.preventDefault();
        deps.submit?.();
      });
    },

    render() {},

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
