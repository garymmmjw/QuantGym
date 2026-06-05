import { listen } from '../../ui/events.js';

export function createSettingsModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const render = () => {
    const els = getElements();
    const currentUser = deps.getCurrentUser?.();
    if (!currentUser || !els.settingsForm) return;
    els.settingsLanguageSelect.value = deps.getLanguage?.() || "zh";
    deps.renderCountries?.(els.settingsCountrySelect, currentUser.country);
    deps.renderRegions?.(els.settingsRegionSelect, currentUser.country, currentUser.region);
    const llmConfig = deps.getLlmConfig?.() || {};
    els.settingsLlmEndpointInput.value = llmConfig.endpoint || "";
    els.settingsLlmModelInput.value = llmConfig.model || "";
    const cloudConfig = deps.getCloudConfig?.() || {};
    if (els.settingsCloudApiInput) {
      els.settingsCloudApiInput.value = cloudConfig.endpoint || deps.defaultCloudApiEndpoint || "";
    }
    const auth = deps.getAuth?.() || {};
    els.settingsGoogleClientIdInput.value = auth.googleClientId || "";
    deps.renderCloudStatus?.();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.settingsForm, "submit", (event) => {
        event.preventDefault();
        deps.save?.();
      });

      bind(els.syncCloudBtn, "click", () => {
        deps.syncCloud?.();
      });

      bind(els.settingsLanguageSelect, "change", () => {
        deps.setLanguage?.(els.settingsLanguageSelect.value);
      });

      bind(els.settingsCountrySelect, "change", () => {
        deps.renderRegions?.(els.settingsRegionSelect, els.settingsCountrySelect.value);
      });

      bind(els.exportBtn, "click", () => deps.exportState?.());
      bind(els.importInput, "change", (event) => deps.importState?.(event));
      bind(els.resetBtn, "click", () => deps.resetState?.());
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
