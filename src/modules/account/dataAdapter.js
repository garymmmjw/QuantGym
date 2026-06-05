import {
  defaultLeaderboardSettings as defaultLeaderboardSettingsValue,
  getCountryLabel as getCountryLabelValue,
  getDefaultRegion as getDefaultRegionValue,
  getInitials as getInitialsValue,
  getRegionLabel as getRegionLabelValue,
  inferCountryFromRegion as inferCountryFromRegionValue,
  normalizeAccount as normalizeAccountValue,
  normalizeCountry as normalizeCountryValue,
  normalizeGraduationTerm as normalizeGraduationTermValue,
  normalizeLeaderboardSettings as normalizeLeaderboardSettingsValue,
  normalizeRegionForCountry as normalizeRegionForCountryValue,
  renderCountryOptions as renderCountryOptionsValue,
  renderRegionOptions as renderRegionOptionsValue
} from './data.js';

export function createAccountDataAdapter(deps = {}) {
  const getLanguage = () => deps.getLanguage?.() || "zh";
  const getCurrentUser = () => deps.getCurrentUser?.() || null;

  return {
    normalizeAccount(account = {}) {
      return normalizeAccountValue(account);
    },

    normalizeGraduationTerm(value) {
      return normalizeGraduationTermValue(value);
    },

    normalizeCountry(country) {
      return normalizeCountryValue(country);
    },

    inferCountryFromRegion(region) {
      return inferCountryFromRegionValue(region);
    },

    normalizeRegionForCountry(region, country) {
      return normalizeRegionForCountryValue(region, country);
    },

    getDefaultRegion(country) {
      return getDefaultRegionValue(country);
    },

    getCountryLabel(country) {
      return getCountryLabelValue(country, getLanguage());
    },

    getRegionLabel(region) {
      return getRegionLabelValue(region, getLanguage());
    },

    renderCountryOptions(select, selectedCountry = "china") {
      renderCountryOptionsValue(select, selectedCountry, {
        language: getLanguage()
      });
    },

    renderRegionOptions(select, country = "china", selectedRegion = "") {
      renderRegionOptionsValue(select, country, selectedRegion, {
        language: getLanguage()
      });
    },

    defaultLeaderboardSettings() {
      return defaultLeaderboardSettingsValue(getCurrentUser());
    },

    normalizeLeaderboardSettings(settings = {}) {
      return normalizeLeaderboardSettingsValue(settings, getCurrentUser());
    },

    getInitials(value) {
      return getInitialsValue(value);
    }
  };
}
