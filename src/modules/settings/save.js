export function readSettingsForm(elements = {}, defaults = {}) {
  return {
    language: elements.settingsLanguageSelect?.value || defaults.language || "zh",
    country: elements.settingsCountrySelect?.value || defaults.country || "china",
    region: elements.settingsRegionSelect?.value || defaults.region || "",
    llmEndpoint: elements.settingsLlmEndpointInput?.value?.trim() || defaults.llmEndpoint || "",
    llmModel: elements.settingsLlmModelInput?.value || defaults.llmModel || "",
    googleClientId: elements.settingsGoogleClientIdInput?.value?.trim() || "",
    cloudEndpoint: elements.settingsCloudApiInput?.value?.trim() || defaults.cloudEndpoint || ""
  };
}

export function buildSettingsSaveResult(options = {}) {
  const values = options.values || {};
  const currentUser = options.currentUser || {};
  const normalizeLanguage = options.normalizeLanguage || ((value) => value || "zh");
  const normalizeCountry = options.normalizeCountry || ((value) => value || "china");
  const normalizeRegionForCountry = options.normalizeRegionForCountry || ((region) => region || "");
  const normalizeLlmModel = options.normalizeLlmModel || ((model) => model || "");
  const normalizeLeaderboardSettings = options.normalizeLeaderboardSettings || ((settings) => settings || {});
  const now = options.now || new Date().toISOString();
  const language = normalizeLanguage(values.language);
  const country = normalizeCountry(values.country);
  const region = normalizeRegionForCountry(values.region, country);
  const previousCloudEndpoint = options.cloudConfig?.endpoint || "";

  return {
    appPrefs: {
      ...(options.appPrefs || {}),
      language
    },
    llmConfig: {
      endpoint: values.llmEndpoint || options.defaultLlmEndpoint || "",
      model: normalizeLlmModel(values.llmModel)
    },
    cloudConfig: {
      ...(options.cloudConfig || {}),
      endpoint: values.cloudEndpoint || options.defaultCloudEndpoint || ""
    },
    auth: {
      ...(options.auth || {}),
      googleClientId: values.googleClientId || "",
      accounts: (options.auth?.accounts || []).map((account) => (
        account.id === currentUser.id ? { ...account, country, region, updatedAt: now } : account
      ))
    },
    leaderboard: normalizeLeaderboardSettings({
      ...(options.leaderboard || {}),
      country,
      region
    }),
    language,
    country,
    region,
    cloudEndpointChanged: previousCloudEndpoint !== (values.cloudEndpoint || options.defaultCloudEndpoint || "")
  };
}
