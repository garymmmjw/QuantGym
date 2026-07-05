import { useCallback } from "react";
import { useAppStore, useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

const EMPTY_LIST = [];

export function useSettingsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const currentUser = useAuthStore((state) => state.currentUser);
  const auth = useAuthStore((state) => state.auth);
  const currentLanguage = useAppStore((state) => state.appPrefs?.language || appServices.getLanguage?.() || "zh");
  const cloudConfig = useAppStore((state) => state.cloudConfig);
  const trainingEntries = useUserStateStore((state) => state.value?.entries || EMPTY_LIST);
  const noteResources = useUserStateStore((state) => state.value?.resources || EMPTY_LIST);
  const t = appServices.t || ((key) => key);

  const save = useCallback((form) => {
    return appServices.saveSettingsFromValues?.(form);
  }, [appServices]);

  return {
    t,
    currentUser,
    currentLanguage,
    cloudConfig: cloudConfig || appServices.appState?.cloudConfig || {},
    auth: auth || appServices.appState?.auth || {},
    trainingEntries,
    noteResources,
    getLanguage: appServices.getLanguage,
    getLlmConfig: appServices.getLlmConfig,
    getCloudConfig: appServices.getCloudConfig,
    getAuth: () => auth || appServices.appState?.auth || {},
    defaultCloudApiEndpoint: appServices.defaultCloudApiEndpoint,
    renderCountries: appServices.renderCountryOptions,
    renderRegions: appServices.renderRegionOptions,
    renderCloudStatus: appServices.renderCloudStatus,
    getCloudStatusText: appServices.getCloudStatusText,
    setLanguage: appServices.setLanguage,
    save,
    syncCloud: appServices.syncCloudNow,
    exportState: appServices.exportState,
    importState: appServices.importState,
    resetState: appServices.resetState,
    logout: appServices.logout
  };
}
