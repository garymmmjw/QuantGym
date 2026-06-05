import { listen } from '../../ui/events.js';

export function createOverviewModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const renderProblemProgress = () => {
    const els = getElements();
    const problems = deps.getCatalogProblems?.() || [];
    const items = deps.buildProblemProgressItems?.(problems) || [];
    deps.renderProgressGroup?.(els.overviewProblemProgress, items.slice(0, 4));
  };

  const renderXpBars = () => {
    const els = getElements();
    if (!els.overviewXpBars) return;
    const series = deps.getDailyXpSeries?.(7) || [];
    const maxXp = Math.max(20, ...series.map((item) => item.xp));
    els.overviewXpBars.innerHTML = "";
    series.forEach((item) => {
      const bar = document.createElement("div");
      bar.className = "daily-xp-bar";
      bar.style.setProperty("--h", `${Math.max(8, Math.round((item.xp / maxXp) * 100))}%`);
      bar.innerHTML = `<strong>${escape(item.xp)}</strong><i></i><span>${escape(item.label)}</span>`;
      els.overviewXpBars.appendChild(bar);
    });
  };

  const renderContributionHeatmap = () => {
    const els = getElements();
    if (!els.overviewContributionHeatmap) return;
    const heatmap = deps.buildRecentContributionHeatmap?.(12);
    if (!heatmap) return;
    els.overviewContributionHeatmap.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "contribution-heatmap-grid";
    grid.style.gridTemplateRows = "repeat(7, var(--heatmap-cell-size))";
    grid.style.gridAutoColumns = "var(--heatmap-cell-size)";
    grid.style.setProperty("--weeks", String(heatmap.weekCount));

    heatmap.days.forEach((day) => {
      const cell = document.createElement("span");
      cell.className = [
        "contribution-heatmap-cell",
        `level-${day.future ? 0 : day.level}`,
        day.future ? "is-future" : "",
        day.key === deps.dayKey?.(new Date()) ? "is-today" : ""
      ].filter(Boolean).join(" ");
      cell.style.setProperty("--v", String(day.level));
      const completedLabel = text("streakCompleted");
      cell.title = !day.future
        ? `${deps.formatDate?.(day.key)} - ${day.xp} XP - ${Math.floor(day.completed)} ${completedLabel}`
        : "";
      grid.appendChild(cell);
    });

    const labels = document.createElement("div");
    labels.className = "contribution-month-labels";
    labels.style.gridTemplateColumns = `repeat(${heatmap.weekCount}, var(--heatmap-cell-size))`;
    heatmap.labels.forEach((month) => {
      const label = document.createElement("span");
      label.textContent = month.label;
      label.style.gridColumn = `${month.startWeek + 1} / span ${Math.min(month.weekSpan, heatmap.weekCount - month.startWeek)}`;
      labels.appendChild(label);
    });

    const summary = document.createElement("div");
    summary.className = "contribution-range-label";
    summary.textContent = `${text("streakLast12Weeks")} - ${deps.formatDate?.(heatmap.startKey)} - ${deps.formatDate?.(heatmap.endKey)}`;
    els.overviewContributionHeatmap.append(grid, labels, summary);
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.overviewCommunityExpandBtn, "click", () => {
        deps.openCommunity?.();
      });

      bind(els.overviewCommunityForm, "submit", (event) => {
        event.preventDefault();
        deps.addCommunityPost?.("overview");
      });

      bind(els.overviewCommunityMedia, "change", (event) => {
        deps.handleCommunityMedia?.("overview", event);
      });

      bind(els.refreshLeaderboardBtn, "click", () => deps.refreshLeaderboard?.(true));

      [
        els.leaderboardMetricSelect,
        els.leaderboardScopeSelect,
        els.leaderboardCountrySelect,
        els.leaderboardRegionSelect
      ].forEach((select) => {
        bind(select, "change", () => deps.updateLeaderboardSettings?.());
      });
    },

    render() {
      deps.renderTicker?.();
      deps.renderSummary?.();
      deps.renderLeaderboard?.();
      deps.renderTodayPlan?.();
      deps.renderCommunity?.();
      renderProblemProgress();
      renderXpBars();
      renderContributionHeatmap();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
