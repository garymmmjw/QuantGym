import {
  getSettingsCloudStatusText,
  renderSettingsCloudStatus,
  syncSettingsCloudNow
} from './cloudStatus.js';
import {
  buildSettingsSaveResult,
  readSettingsForm
} from './save.js';

export function createSettingsController(deps = {}) {
  const getAppState = () => deps.getAppState?.() || {};
  const getUserState = () => deps.getUserState?.() || {};
  const getElements = () => deps.elements || {};

  function saveLlmConfig() {
    updateLlmConfigFromControls({
      defaultEndpoint: deps.defaultLlmEndpoint,
      useCurrent: false
    });
    deps.appendInterviewMessage?.("system", deps.t?.("llmSaved"));
  }

  function updateLlmConfigFromControls(options = {}) {
    const elements = getElements();
    return deps.llmConfigRuntime?.build?.({
      endpoint: options.endpoint ?? elements.llmEndpointInput?.value,
      model: options.model ?? elements.llmModelInput?.value
    }, {
      useCurrent: options.useCurrent !== false,
      defaultEndpoint: options.defaultEndpoint || ""
    });
  }

  function syncCloudNow() {
    const appState = getAppState();
    return syncSettingsCloudNow(getElements(), appState.cloudConfig, {
      currentUser: appState.currentUser,
      getSyncController: deps.getSyncController,
      flushSync: deps.flushCloudSync,
      getStatusText: getCloudStatusText,
      t: deps.t
    });
  }

  function renderCloudStatus() {
    const appState = getAppState();
    return renderSettingsCloudStatus(getElements(), appState.cloudConfig, {
      currentUser: appState.currentUser,
      inFlight: Boolean(deps.getSyncController?.()?.isInFlight?.()),
      t: deps.t,
      formatDate: deps.formatDate
    });
  }

  function getCloudStatusText() {
    const appState = getAppState();
    return getSettingsCloudStatusText(appState.cloudConfig, {
      currentUser: appState.currentUser,
      inFlight: Boolean(deps.getSyncController?.()?.isInFlight?.()),
      t: deps.t,
      formatDate: deps.formatDate
    });
  }

  function saveSettings() {
    const appState = getAppState();
    const userState = getUserState();
    const elements = getElements();
    if (!appState.currentUser) return false;
    const result = buildSettingsSaveResult({
      values: readSettingsForm(elements, {
        llmEndpoint: deps.defaultLlmEndpoint,
        cloudEndpoint: deps.defaultCloudEndpoint
      }),
      currentUser: appState.currentUser,
      appPrefs: appState.appPrefs,
      auth: appState.auth,
      cloudConfig: appState.cloudConfig,
      leaderboard: userState.leaderboard,
      defaultLlmEndpoint: deps.defaultLlmEndpoint,
      defaultCloudEndpoint: deps.defaultCloudEndpoint,
      normalizeLanguage: deps.normalizeLanguage,
      normalizeCountry: deps.normalizeCountry,
      normalizeRegionForCountry: deps.normalizeRegionForCountry,
      normalizeLlmModel: deps.normalizeLlmModel,
      normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings
    });

    appState.appPrefs = result.appPrefs;
    deps.saveAppPrefs?.();
    deps.syncLanguageToUrl?.(appState.appPrefs.language);
    deps.llmConfigRuntime?.set?.(result.llmConfig);
    appState.auth = result.auth;
    appState.cloudConfig = result.cloudConfig;
    deps.saveLlmConfigToStorage?.();
    deps.saveCloudConfig?.();
    deps.saveAuth?.();
    appState.currentUser = deps.getCurrentUser?.();
    userState.leaderboard = result.leaderboard;
    deps.saveState?.();
    deps.queueCloudSync?.("account", 0);
    if (result.cloudEndpointChanged) deps.invalidateLeaderboardCloud?.({ clear: true, refresh: true });
    deps.renderGoogleClientInput?.();
    deps.renderAll?.();
    deps.switchModule?.("settings");
    if (elements.settingsMessage) {
      elements.settingsMessage.textContent = `${deps.t?.("settingsSaved")} ${getCloudStatusText()}`;
    }
    return true;
  }

  return {
    getCloudStatusText,
    renderCloudStatus,
    saveLlmConfig,
    saveSettings,
    syncCloudNow,
    updateLlmConfigFromControls
  };
}
