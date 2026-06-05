import {
  buildLlmRuntimeConfig,
  loadLlmConfig,
  normalizeLlmModel,
  saveLlmConfig
} from './preferences.js';

export function createLlmConfigRuntime(options = {}) {
  const deps = {
    defaultEndpoint: options.defaultEndpoint || "",
    defaultModel: options.defaultModel || "",
    defaultsVersion: options.defaultsVersion || "",
    modelOptions: Array.isArray(options.modelOptions) ? options.modelOptions : []
  };
  let config = loadLlmConfig(options.storageKey, deps);

  function normalizeModel(model) {
    return normalizeLlmModel(model, deps);
  }

  function save() {
    config = saveLlmConfig(options.storageKey, config, deps);
    return config;
  }

  function build(values = {}, buildOptions = {}) {
    config = buildLlmRuntimeConfig(buildOptions.useCurrent === false ? {} : config, values, {
      defaultEndpoint: buildOptions.defaultEndpoint || "",
      normalizeModel
    });
    return save();
  }

  return {
    get() {
      return config;
    },
    set(nextConfig = {}) {
      config = {
        endpoint: nextConfig.endpoint || deps.defaultEndpoint,
        model: normalizeModel(nextConfig.model)
      };
      return config;
    },
    save,
    build,
    normalizeModel
  };
}
