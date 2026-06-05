export function renderLeaderboardList(container, rows = [], options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!rows.length) {
    const emptyNode = options.createEmpty?.();
    if (emptyNode) container.appendChild(emptyNode);
    return;
  }

  const changes = options.changes || {};
  rows.forEach((row, index) => {
    const rankPosition = row.place || index + 1;
    const item = document.createElement("div");
    item.className = `leaderboard-item${row.isCurrent ? " current" : ""}`;

    const place = document.createElement("strong");
    place.className = `leaderboard-rank ${getMedalClass(rankPosition)}`;
    place.textContent = String(rankPosition);

    const avatar = document.createElement("span");
    avatar.className = "leaderboard-avatar";
    avatar.style.setProperty("--avatar-hue", String(options.hashStringToHue?.(row.id || row.name) ?? 0));
    if (row.picture) {
      avatar.classList.add("has-image");
      const image = document.createElement("img");
      image.src = row.picture;
      image.alt = "";
      image.loading = "lazy";
      avatar.appendChild(image);
    } else {
      avatar.textContent = options.getInitials?.(row.name) || "";
    }

    const identity = document.createElement("div");
    identity.className = "leaderboard-identity";
    const name = document.createElement("span");
    name.textContent = row.isCurrent ? `${row.name} · ${options.currentUserLabel || ""}` : row.name;
    const rankMeta = document.createElement("small");
    rankMeta.textContent = [row.rank, row.locationLabel].filter(Boolean).join(" · ");
    identity.append(name, rankMeta);

    const score = document.createElement("b");
    score.className = "leaderboard-score";
    const scoreValue = document.createElement("span");
    scoreValue.textContent = options.formatScore?.(row.score) || String(row.score || 0);
    const scoreUnit = document.createElement("small");
    scoreUnit.textContent = options.scoreUnitLabel || "";
    score.append(scoreValue, scoreUnit);

    const trend = options.buildTrend?.(changes[row.id]) || document.createElement("span");
    item.append(place, avatar, identity, score, trend);
    container.appendChild(item);
  });

  options.refreshIcons?.();
}

export function renderLeaderboardControls(elements = {}, options = {}) {
  const metricSelect = elements.leaderboardMetricSelect;
  if (!metricSelect) return;
  const settings = options.settings || {};
  renderLeaderboardMetricOptions(metricSelect, options.metricOptions || [], settings.metric);
  elements.leaderboardScopeSelect.value = settings.scope;
  options.renderCountryOptions?.(elements.leaderboardCountrySelect, settings.country);
  options.renderRegionOptions?.(elements.leaderboardRegionSelect, settings.country, settings.region);

  const isGlobal = settings.scope === "global";
  const isCountry = settings.scope === "country";
  const countryControl = elements.leaderboardCountrySelect.closest("label");
  const regionControl = elements.leaderboardRegionSelect.closest("label");
  countryControl?.classList.toggle("hidden", isGlobal);
  regionControl?.classList.toggle("hidden", isGlobal || isCountry);
  elements.leaderboardCountrySelect.disabled = isGlobal;
  elements.leaderboardRegionSelect.disabled = isGlobal || isCountry;
}

export function renderLeaderboardMetricOptions(select, options = [], selected = "overall") {
  if (!select) return;
  select.innerHTML = "";
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    select.appendChild(option);
  });
}

export function renderLeaderboardScopeSummary(container, options = {}) {
  if (!container) return;
  container.textContent = `${options.metricLabel || ""} · ${options.location || ""} · ${options.rowCount || 0} ${options.userLabel || ""} · ${options.sourceText || ""}`;
}

export function renderRegionRank(elements = {}, options = {}) {
  if (!elements.regionRankText || !elements.regionMedal) return;
  const rank = options.rank || 1;
  elements.regionRankText.textContent = `${options.locationLabel || ""}${options.metricLabel || ""} #${rank}`;
  elements.regionMedal.textContent = String(rank);
  elements.regionMedal.className = `medal ${getMedalClass(rank)}`;
}

function getMedalClass(rankPosition) {
  if (rankPosition === 1) return "gold";
  if (rankPosition === 2) return "silver";
  if (rankPosition === 3) return "bronze";
  return "plain";
}
