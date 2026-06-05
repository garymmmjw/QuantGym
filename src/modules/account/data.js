import { DEFAULT_GRADUATION_TERM } from '../../constants.js';
import { locationDefs, regionEnLabels } from '../../prep-data.js';
import { skillDefs } from '../../skills.js';

export function normalizeGraduationTerm(value) {
  const term = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(term) ? term : DEFAULT_GRADUATION_TERM;
}

export function normalizeCountry(country) {
  const key = String(country || "").trim();
  const aliases = {
    cn: "china",
    china: "china",
    "中国": "china",
    us: "unitedStates",
    usa: "unitedStates",
    "u.s.": "unitedStates",
    "united states": "unitedStates",
    unitedStates: "unitedStates",
    "美国": "unitedStates",
    uk: "unitedKingdom",
    gb: "unitedKingdom",
    britain: "unitedKingdom",
    "united kingdom": "unitedKingdom",
    unitedKingdom: "unitedKingdom",
    "英国": "unitedKingdom",
    sg: "singapore",
    singapore: "singapore",
    "新加坡": "singapore"
  };
  return locationDefs[key] ? key : aliases[key] || "china";
}

export function inferCountryFromRegion(region) {
  const value = String(region || "").trim();
  if (!value) return "china";
  if (locationDefs.china.regions.includes(value) || value === "Shanghai") return "china";
  if (locationDefs.unitedStates.regions.includes(value)) return "unitedStates";
  if (locationDefs.unitedKingdom.regions.includes(value)) return "unitedKingdom";
  if (locationDefs.singapore.regions.includes(value)) return "singapore";
  return "china";
}

export function getDefaultRegion(country) {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry === "china") return "上海";
  if (normalizedCountry === "unitedStates") return "California";
  if (normalizedCountry === "unitedKingdom") return "Greater London";
  if (normalizedCountry === "singapore") return "Central Region";
  return locationDefs[normalizedCountry].regions[0];
}

export function normalizeRegionForCountry(region, country) {
  const normalizedCountry = normalizeCountry(country);
  const regions = locationDefs[normalizedCountry].regions;
  const aliases = {
    Shanghai: "上海",
    Beijing: "北京",
    Guangdong: "广东",
    Zhejiang: "浙江",
    Jiangsu: "江苏",
    "New York State": "New York",
    "Washington DC": "District of Columbia",
    London: "Greater London"
  };
  const raw = String(region || "").trim();
  const value = aliases[raw] || raw;
  return regions.includes(value) ? value : getDefaultRegion(normalizedCountry);
}

export function normalizeAccount(account = {}) {
  const country = normalizeCountry(account.country || inferCountryFromRegion(account.region));
  return {
    ...account,
    country,
    region: normalizeRegionForCountry(account.region, country),
    graduationTerm: normalizeGraduationTerm(account.graduationTerm)
  };
}

export function getCountryLabel(country, language = "zh") {
  const def = locationDefs[normalizeCountry(country)];
  return language === "en" ? def.nameEn || def.name : def.name;
}

export function getRegionLabel(region, language = "zh") {
  if (language === "en") return regionEnLabels[region] || region;
  return region;
}

export function renderCountryOptions(select, selectedCountry = "china", options = {}) {
  if (!select) return;
  const language = options.language || "zh";
  const selected = normalizeCountry(selectedCountry);
  select.innerHTML = "";
  Object.entries(locationDefs).forEach(([key]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = getCountryLabel(key, language);
    option.selected = key === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

export function renderRegionOptions(select, country = "china", selectedRegion = "", options = {}) {
  if (!select) return;
  const language = options.language || "zh";
  const normalizedCountry = normalizeCountry(country);
  const selected = normalizeRegionForCountry(selectedRegion, normalizedCountry);
  select.innerHTML = "";
  locationDefs[normalizedCountry].regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = getRegionLabel(region, language);
    option.selected = region === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

export function getInitials(value = "") {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "Q";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export function defaultLeaderboardSettings(currentUser = null) {
  const country = currentUser?.country || "china";
  const region = currentUser?.region || getDefaultRegion(country);
  return {
    scope: "global",
    country: normalizeCountry(country),
    region: normalizeRegionForCountry(region, country),
    metric: "overall"
  };
}

export function normalizeLeaderboardSettings(settings = {}, currentUser = null) {
  const fallback = defaultLeaderboardSettings(currentUser);
  const country = normalizeCountry(settings.country || fallback.country);
  const metric = settings.metric && (settings.metric === "overall" || skillDefs[settings.metric]) ? settings.metric : fallback.metric;
  const scope = ["global", "country", "region"].includes(settings.scope) ? settings.scope : fallback.scope;
  return {
    scope,
    country,
    region: normalizeRegionForCountry(settings.region || fallback.region, country),
    metric
  };
}
