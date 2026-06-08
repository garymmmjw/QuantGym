import { useCallback } from "react";
import { useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useSettingsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const currentUser = useAuthStore((state) => state.currentUser);
  const auth = useAuthStore((state) => state.auth);
  const currentLanguage = useAppStore((state) => state.appPrefs?.language || appServices.getLanguage?.() || "zh");
  const cloudConfig = useAppStore((state) => state.cloudConfig);
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
