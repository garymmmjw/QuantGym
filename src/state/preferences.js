export function normalizeLlmModel(model, options = {}) {
  const defaultModel = options.defaultModel || "";
  const modelOptions = Array.isArray(options.modelOptions) ? options.modelOptions : [];
  const value = String(model || "").trim();
  return modelOptions.includes(value) ? value : defaultModel;
}

export function loadLlmConfig(key, options = {}) {
  const {
    defaultEndpoint = "",
    defaultModel = "",
    modelOptions = []
  } = options;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { endpoint: defaultEndpoint, model: defaultModel };
    const parsed = JSON.parse(raw);
    const storedModel = parsed.defaultsVersion
      ? parsed.model
      : (parsed.model === "gpt-5" ? defaultModel : parsed.model);
    return {
      endpoint: parsed.endpoint || defaultEndpoint,
      model: normalizeLlmModel(storedModel, { defaultModel, modelOptions })
    };
  } catch {
    return { endpoint: defaultEndpoint, model: defaultModel };
  }
}

export function saveLlmConfig(key, config = {}, options = {}) {
  const {
    defaultEndpoint = "",
    defaultModel = "",
    defaultsVersion = "",
    modelOptions = []
  } = options;
  const normalized = {
    endpoint: config.endpoint || defaultEndpoint,
    model: normalizeLlmModel(config.model, { defaultModel, modelOptions }),
    defaultsVersion
  };
  try {
    localStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    /* storage unavailable */
  }
  return normalized;
}

export function buildLlmRuntimeConfig(current = {}, values = {}, options = {}) {
  const normalizeModel = options.normalizeModel || ((model) => model || "");
  return {
    endpoint: String(values.endpoint ?? "").trim() || current.endpoint || options.defaultEndpoint || "",
    model: normalizeModel(values.model || current.model)
  };
}

function getSupportedLanguages(options = {}) {
  return Array.isArray(options.supportedLanguages) ? options.supportedLanguages : [];
}

function getDefaultLanguage(options = {}) {
  return options.defaultLanguage || getSupportedLanguages(options)[0] || "zh";
}

export function normalizeLanguage(language, options = {}) {
  const supportedLanguages = getSupportedLanguages(options);
  const value = String(language || "").toLowerCase().trim();
  return supportedLanguages.includes(value) ? value : getDefaultLanguage(options);
}

export function getUrlLanguage(options = {}) {
  const supportedLanguages = getSupportedLanguages(options);
  const location = options.location || globalThis.location;
  if (!location) return "";
  const queryLanguage = new URLSearchParams(location.search || "").get("lang");
  if (supportedLanguages.includes(String(queryLanguage || "").toLowerCase())) {
    return normalizeLanguage(queryLanguage, options);
  }
  const localeSegment = String(location.pathname || "")
    .split("/")
    .filter(Boolean)
    .find((segment) => supportedLanguages.includes(String(segment || "").toLowerCase()));
  return localeSegment
    ? normalizeLanguage(localeSegment, options)
    : "";
}

export function getBrowserLanguage(options = {}) {
  const navigatorRef = options.navigator || globalThis.navigator || {};
  const browserLanguages = Array.isArray(navigatorRef.languages) && navigatorRef.languages.length
    ? navigatorRef.languages
    : [navigatorRef.language];
  const preferred = browserLanguages
    .map((language) => String(language || "").toLowerCase())
    .find((language) => language.startsWith("zh") || language.startsWith("en"));
  return preferred?.startsWith("en") ? "en" : getDefaultLanguage(options);
}

export function getInitialLanguage(storedLanguage = "", options = {}) {
  return normalizeLanguage(getUrlLanguage(options) || storedLanguage || getBrowserLanguage(options), options);
}

export function syncLanguageToUrl(language, options = {}) {
  const windowRef = options.window || globalThis.window || {};
  const locationRef = options.location || windowRef.location || globalThis.location;
  const historyRef = options.history || windowRef.history || globalThis.history;
  if (!historyRef?.replaceState || !/^https?:$/.test(locationRef?.protocol || "")) return;
  const nextLanguage = normalizeLanguage(language, options);
  const url = new URL(locationRef.href);
  const supportedLanguages = getSupportedLanguages(options);
  const segments = url.pathname.split("/").filter(Boolean);
  const localeIndex = segments.findIndex((segment) => supportedLanguages.includes(String(segment || "").toLowerCase()));
  if (localeIndex >= 0) {
    segments[localeIndex] = nextLanguage;
    url.pathname = `/${segments.join("/")}`;
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", nextLanguage);
  }
  historyRef.replaceState({}, "", url);
}

export function loadAppPrefs(key, options = {}) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      language: getInitialLanguage(parsed.language, options),
      sidebarCollapsed: parsed.sidebarCollapsed === true
    };
  } catch {
    return { language: getInitialLanguage("", options), sidebarCollapsed: false };
  }
}

export function saveAppPrefs(key, appPrefs = {}) {
  try {
    localStorage.setItem(key, JSON.stringify(appPrefs));
    return true;
  } catch {
    return false;
  }
}

export function toggleSidebarPreference(appPrefs = {}) {
  return {
    ...appPrefs,
    sidebarCollapsed: appPrefs.sidebarCollapsed !== true
  };
}

export function getCurrentLanguage(appPrefs = {}, options = {}) {
  return normalizeLanguage(appPrefs.language, options);
}

export function getLocale(language, options = {}) {
  return normalizeLanguage(language, options) === "en" ? "en-US" : "zh-CN";
}

export function translate(key, params = {}, options = {}) {
  const language = normalizeLanguage(options.language, options);
  const dictionary = options.i18n || {};
  const fallbackLanguage = options.fallbackLanguage || getDefaultLanguage(options);
  const template = dictionary[language]?.[key] || dictionary[fallbackLanguage]?.[key] || key;
  return Object.entries(params).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value ?? ""))
  ), template);
}

export function textMatchesI18nKeys(text, keys = [], options = {}) {
  const value = String(text || "").trim();
  const dictionary = options.i18n || {};
  return keys.some((key) => getSupportedLanguages(options).some((language) => dictionary[language]?.[key] === value));
}
