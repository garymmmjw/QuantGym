export function normalizeCloudLeaderboardRows(rows = [], deps = {}) {
  const normalizeAccount = deps.normalizeAccount || ((value) => value || {});
  const normalizeSkills = deps.normalizeSkills || ((value) => value || {});
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const account = normalizeAccount({
        id: row.id,
        name: row.name,
        country: row.country,
        region: row.region,
        picture: row.picture
      });
      return {
        id: String(account.id || "").trim(),
        name: String(account.name || "Quant").trim() || "Quant",
        country: account.country,
        region: account.region,
        picture: String(account.picture || ""),
        skills: normalizeSkills(row.skills || {}),
        updatedAt: String(row.updatedAt || "")
      };
    })
    .filter((row) => row.id);
}

export function getLeaderboardScore(skills = {}, metric = "overall", deps = {}) {
  if (metric === "overall") return deps.calculateQuantScore?.(skills) ?? 0;
  return deps.getSkillScore?.(skills?.[metric] || 0) ?? 0;
}

export function getLeaderboardMetricOptions(skillDefs = {}, text = (key) => key) {
  return [
    ["overall", text("leaderboardOverall")],
    ...Object.entries(skillDefs).map(([key, def]) => [key, def.name])
  ];
}

export function makeLeaderboardRow(profile = {}, metric = "overall", source = "cloud", deps = {}) {
  const normalizeAccount = deps.normalizeAccount || ((value) => value || {});
  const normalizeSkills = deps.normalizeSkills || ((value) => value || {});
  const account = normalizeAccount(profile);
  const skills = normalizeSkills(profile.skills || {});
  const score = getLeaderboardScore(skills, metric, deps);
  return {
    id: String(account.id || "").trim(),
    name: String(account.name || account.email || "Quant").trim() || "Quant",
    country: account.country,
    region: account.region,
    picture: String(account.picture || ""),
    locationLabel: `${deps.getCountryLabel?.(account.country) || account.country} · ${deps.getRegionLabel?.(account.region) || account.region}`,
    score,
    rank: metric === "overall" ? deps.getRank?.(score) || "" : deps.getLeaderboardMetricLabel?.(metric) || "",
    isCurrent: deps.currentUserId === account.id,
    source,
    updatedAt: profile.updatedAt || ""
  };
}

export function compareLeaderboardRows(a, b) {
  return b.score - a.score
    || Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    || a.name.localeCompare(b.name);
}

export function filterLeaderboardRows(rows = [], settings = {}) {
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (settings.scope === "global") return true;
    if (settings.scope === "country") return row.country === settings.country;
    return row.country === settings.country && row.region === settings.region;
  });
}

export function keepCurrentLeaderboardRow(rows = [], limit = 10) {
  if (!Number.isFinite(limit) || limit <= 0 || rows.length <= limit) return rows;
  const currentIndex = rows.findIndex((row) => row.isCurrent);
  if (currentIndex < 0 || currentIndex < limit) return rows.slice(0, limit);
  return [...rows.slice(0, limit - 1), rows[currentIndex]];
}

export function mergeLeaderboardRows(...rowGroups) {
  const byId = new Map();
  rowGroups.flat().forEach((row) => {
    if (!row?.id) return;
    const previous = byId.get(row.id) || {};
    const preferExistingCloud = previous.source === "cloud" && row.source === "local" && !row.isCurrent;
    const merged = preferExistingCloud ? { ...row, ...previous } : { ...previous, ...row };
    byId.set(row.id, {
      ...merged,
      isCurrent: Boolean(previous.isCurrent || row.isCurrent)
    });
  });
  return [...byId.values()];
}

export function getLeaderboardRowsForSettings(settings = {}, options = {}) {
  const normalized = options.normalizeLeaderboardSettings?.(settings) || settings;
  const metric = normalized.metric || "overall";
  const baseRows = options.getAllLeaderboardRows?.(metric) || [];
  const merged = filterLeaderboardRows(baseRows, normalized)
    .sort(compareLeaderboardRows)
    .map((row, index) => ({ ...row, place: index + 1 }));
  return keepCurrentLeaderboardRow(merged, options.limit ?? 10);
}

export function getLeaderboardSourceStatus(options = {}) {
  if (options.forcedStatus) return options.forcedStatus;
  if (options.loading) return "loading";
  if (Number(options.cloudRowCount || 0) > 0) return "cloud";
  if (options.error) return "error";
  return "local";
}

export function getLeaderboardSourceLabelKey(status = "local") {
  if (status === "loading") return "leaderboardLoading";
  if (status === "cloud") return "leaderboardCloudLive";
  if (status === "error") return "leaderboardUnavailable";
  return "leaderboardLocalOnly";
}

export function getLeaderboardScopeSummaryViewModel(options = {}) {
  const {
    settings = {},
    rows = [],
    language = "zh",
    forcedStatus = "",
    loading = false,
    cloudRowCount = 0,
    error = "",
    text = (key) => key,
    getLeaderboardMetricLabel = (metric) => metric || "",
    getScopeLabel = () => "",
    getSourceStatus = getLeaderboardSourceStatus,
    getSourceLabelKey = getLeaderboardSourceLabelKey
  } = options;
  const status = getSourceStatus({
    forcedStatus,
    loading,
    cloudRowCount,
    error
  });
  return {
    metricLabel: getLeaderboardMetricLabel(settings.metric),
    location: getScopeLabel(settings),
    rowCount: rows.length,
    userLabel: language === "en" ? "users" : "位用户",
    sourceText: text(getSourceLabelKey(status))
  };
}

export function getLeaderboardScopeLabel(settings = {}, options = {}) {
  if (settings.scope === "global") return options.globalLabel || "";
  const getCountryLabel = options.getCountryLabel || ((country) => country || "");
  const getRegionLabel = options.getRegionLabel || ((region) => region || "");
  if (settings.scope === "country") return getCountryLabel(settings.country);
  return `${getCountryLabel(settings.country)} · ${getRegionLabel(settings.region)}`;
}

export function getRegionRankViewModel(options = {}) {
  const {
    settings = {},
    currentUser = null,
    defaultCountry = "china",
    getDefaultRegion = () => "",
    getRowsForSettings = () => [],
    getLeaderboardMetricLabel = () => "",
    getCountryLabel = (country) => country || "",
    getRegionLabel = (region) => region || "",
    limit = 50
  } = options;
  const metric = settings.metric || "overall";
  const country = currentUser?.country || defaultCountry;
  const region = currentUser?.region || getDefaultRegion(country);
  const rows = getRowsForSettings({
    ...settings,
    scope: "region",
    country,
    region,
    metric
  }, limit);
  const place = rows.findIndex((row) => row.id === currentUser?.id) + 1;
  const rank = place > 0 ? place : 1;
  const metricLabel = metric === "overall" ? "" : ` · ${getLeaderboardMetricLabel(metric)}`;
  return {
    rank,
    locationLabel: `${getCountryLabel(country)} · ${getRegionLabel(region)}`,
    metricLabel,
    rows
  };
}

export function readLeaderboardSettingsForm(elements = {}, options = {}) {
  const normalizeCountry = options.normalizeCountry || ((country) => country || "");
  const normalizeRegionForCountry = options.normalizeRegionForCountry || ((region) => region || "");
  const normalizeLeaderboardSettings = options.normalizeLeaderboardSettings || ((settings) => settings);
  const currentUser = options.currentUser || null;
  const country = normalizeCountry(elements.leaderboardCountrySelect?.value || currentUser?.country);
  const region = normalizeRegionForCountry(elements.leaderboardRegionSelect?.value, country);
  return normalizeLeaderboardSettings({
    metric: elements.leaderboardMetricSelect?.value || "overall",
    scope: elements.leaderboardScopeSelect?.value || "global",
    country,
    region
  });
}

export function leaderboardSnapshotKey(settings = {}) {
  return `qg.leaderboard.ranks.${settings.metric || "overall"}.${settings.scope || "global"}.${settings.country || ""}.${settings.region || ""}`;
}

export function computeLeaderboardRankChanges(rows = [], settings = {}, storage = globalThis.localStorage) {
  const key = leaderboardSnapshotKey(settings);
  let previous = {};
  try {
    previous = JSON.parse(storage?.getItem?.(key) || "{}") || {};
  } catch {
    previous = {};
  }
  const changes = {};
  const next = {};
  rows.forEach((row, index) => {
    const place = row.place || index + 1;
    next[row.id] = place;
    const prior = previous[row.id];
    changes[row.id] = Number.isFinite(prior) ? prior - place : null;
  });
  try {
    storage?.setItem?.(key, JSON.stringify(next));
  } catch {
    /* storage unavailable: arrows simply do not persist */
  }
  return changes;
}

export function buildLeaderboardTrend(delta) {
  const trend = document.createElement("span");
  trend.className = "leaderboard-trend";
  if (delta === null) {
    trend.classList.add("new");
    trend.textContent = "·";
    return trend;
  }
  if (delta > 0) {
    trend.classList.add("up");
    trend.innerHTML = `<i data-lucide="arrow-up-right"></i><b>+${delta}</b>`;
  } else if (delta < 0) {
    trend.classList.add("down");
    trend.innerHTML = `<i data-lucide="arrow-down-right"></i><b>${delta}</b>`;
  } else {
    trend.classList.add("flat");
    trend.textContent = "—";
  }
  return trend;
}
