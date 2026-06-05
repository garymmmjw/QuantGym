import {
  getCurrentLanguage,
  getLocale,
  loadAppPrefs,
  normalizeLanguage,
  saveAppPrefs,
  syncLanguageToUrl,
  textMatchesI18nKeys,
  toggleSidebarPreference,
  translate
} from './preferences.js';

export function createPreferencesRuntime(options = {}) {
  const storageKey = options.storageKey || "";
  const getPrefs = () => options.getPrefs?.() || {};
  const setPrefs = (prefs) => options.setPrefs?.(prefs);

  function languageDeps(extra = {}) {
    return {
      defaultLanguage: options.defaultLanguage,
      supportedLanguages: options.supportedLanguages,
      ...extra
    };
  }

  function load() {
    return loadAppPrefs(storageKey, languageDeps({
      location: options.location,
      navigator: options.navigator
    }));
  }

  function save() {
    saveAppPrefs(storageKey, getPrefs());
  }

  function normalize(language) {
    return normalizeLanguage(language, languageDeps());
  }

  function syncToUrl(language) {
    syncLanguageToUrl(language, languageDeps({
      window: options.windowRef
    }));
  }

  function getLanguage() {
    return getCurrentLanguage(getPrefs(), languageDeps());
  }

  function getCurrentLocale() {
    return getLocale(getLanguage(), languageDeps());
  }

  function t(key, params = {}) {
    return translate(key, params, languageDeps({
      fallbackLanguage: options.fallbackLanguage || options.defaultLanguage,
      i18n: options.i18n,
      language: getLanguage()
    }));
  }

  function matchesKeys(text, keys = []) {
    return textMatchesI18nKeys(text, keys, {
      i18n: options.i18n,
      supportedLanguages: options.supportedLanguages
    });
  }

  function setLanguage(language, setOptions = {}) {
    const nextLanguage = normalize(language);
    setPrefs({
      ...getPrefs(),
      language: nextLanguage
    });
    save();
    if (setOptions.updateUrl !== false) syncToUrl(nextLanguage);
    options.applySidebarState?.();
    options.applyLanguage?.();
    options.renderAll?.();
    return nextLanguage;
  }

  function toggleSidebar() {
    const nextPrefs = toggleSidebarPreference(getPrefs());
    setPrefs(nextPrefs);
    save();
    options.applySidebarState?.();
    return nextPrefs;
  }

  return {
    getLanguage,
    getLocale: getCurrentLocale,
    load,
    matchesKeys,
    normalizeLanguage: normalize,
    save,
    setLanguage,
    syncLanguageToUrl: syncToUrl,
    t,
    toggleSidebar
  };
}
