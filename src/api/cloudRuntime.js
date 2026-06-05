import {
  canUseCloud,
  cloudApi,
  getCloudApiBase,
  getLlmRequestHeaders,
  loadCloudConfig,
  saveCloudConfig
} from './cloud.js';

export function createCloudRuntime(options = {}) {
  const {
    storageKey = "",
    defaultEndpoint = "",
    getConfig = () => ({}),
    getCurrentUser = () => null
  } = options;

  function loadConfig() {
    return loadCloudConfig(storageKey, defaultEndpoint);
  }

  function saveConfig() {
    saveCloudConfig(storageKey, getConfig());
  }

  function getApiBase() {
    return getCloudApiBase(getConfig(), defaultEndpoint);
  }

  function canUse() {
    return canUseCloud(getConfig(), getCurrentUser());
  }

  function getRequestHeaders() {
    return getLlmRequestHeaders(getConfig());
  }

  function request(path, requestOptions = {}) {
    return cloudApi(path, {
      ...requestOptions,
      config: getConfig(),
      defaultEndpoint
    });
  }

  return {
    canUse,
    getApiBase,
    getRequestHeaders,
    loadConfig,
    request,
    saveConfig
  };
}
