import {
  buildCloudSyncBody,
  createCloudSyncController
} from '../api/cloudSync.js';
import { sanitizeAccountForCloud } from '../api/cloud.js';
import { createLeaderboardCloudController } from '../modules/overview/leaderboardCloud.js';
import { createSettingsController } from '../modules/settings/controller.js';

export function createSyncSettingsBundle(deps = {}) {
  const {
    appState,
    appendInterviewMessage,
    canUseCloud,
    CLOUD_SYNC_DEBOUNCE_MS,
    cloudApi,
    cloudStatePayload,
    DEFAULT_CLOUD_API_ENDPOINT,
    DEFAULT_LLM_ENDPOINT,
    elements: els,
    flushCloudSync,
    formatDate,
    getCurrentUser,
    getUserCatalogProblems,
    invalidateLeaderboardCloud,
    LEADERBOARD_CLOUD_REFRESH_MS,
    llmConfigRuntime,
    normalizeCloudLeaderboardRows,
    normalizeCountry,
    normalizeLanguage,
    normalizeLeaderboardSettings,
    normalizeLlmModel,
    normalizeRegionForCountry,
    queueCloudSync,
    renderAll,
    renderGoogleClientInput,
    renderLeaderboardLoading,
    renderLeaderboardSettled,
    saveAppPrefs,
    saveAuth,
    saveCloudConfig,
    saveLlmConfigToStorage,
    saveState,
    switchModule,
    syncStores,
    syncLanguageToUrl,
    t,
    userState
  } = deps;

  let settingsController = null;

  const leaderboardCloudController = createLeaderboardCloudController({
    cloudApi,
    normalizeRows: normalizeCloudLeaderboardRows,
    refreshMs: LEADERBOARD_CLOUD_REFRESH_MS,
    renderLoading: renderLeaderboardLoading,
    onSettled: renderLeaderboardSettled
  });

  const cloudSyncController = createCloudSyncController({
    defaultDelay: CLOUD_SYNC_DEBOUNCE_MS,
    getCurrentUser: () => appState.currentUser,
    getConfig: () => appState.cloudConfig,
    canUseCloud,
    cloudApi,
    buildBody(dirty) {
      return buildCloudSyncBody(dirty, {
        state: userState.value,
        community: appState.community,
        currentUser: appState.currentUser,
        cloudStatePayload,
        getUserCatalogProblems,
        sanitizeAccount: sanitizeAccountForCloud
      });
    },
    onSuccess(result, dirty) {
      appState.cloudConfig.lastSyncAt = result.syncedAt || new Date().toISOString();
      appState.cloudConfig.lastError = "";
      saveCloudConfig();
      settingsController?.renderCloudStatus?.();
      if (dirty.state || dirty.account) invalidateLeaderboardCloud({ refresh: true });
    },
    onError(error) {
      appState.cloudConfig.lastError = error.message || "Cloud sync failed";
      saveCloudConfig();
      settingsController?.renderCloudStatus?.();
    }
  });

  settingsController = createSettingsController({
    elements: els,
    getAppState: () => appState,
    getUserState: () => userState.value,
    llmConfigRuntime,
    defaultLlmEndpoint: DEFAULT_LLM_ENDPOINT,
    defaultCloudEndpoint: DEFAULT_CLOUD_API_ENDPOINT,
    normalizeLanguage,
    normalizeCountry,
    normalizeRegionForCountry,
    normalizeLlmModel,
    normalizeLeaderboardSettings,
    saveAppPrefs,
    syncLanguageToUrl,
    saveLlmConfigToStorage,
    saveCloudConfig,
    saveAuth,
    getCurrentUser,
    saveState,
    syncStores,
    queueCloudSync,
    invalidateLeaderboardCloud,
    renderGoogleClientInput,
    renderAll,
    switchModule,
    appendInterviewMessage,
    getSyncController: () => cloudSyncController,
    flushCloudSync,
    t,
    formatDate
  });

  return {
    cloudSyncController,
    getCloudStatusText: settingsController.getCloudStatusText,
    leaderboardCloudController,
    renderCloudStatus: settingsController.renderCloudStatus,
    saveLlmConfig: settingsController.saveLlmConfig,
    saveSettings: settingsController.saveSettings,
    saveSettingsFromValues: settingsController.saveSettingsFromValues,
    syncCloudNow: settingsController.syncCloudNow,
    updateLlmConfigFromControls: settingsController.updateLlmConfigFromControls
  };
}
