import { getLeaderboardScopeSummaryViewModel } from "../../modules/overview/leaderboard.js";
import {
  buildRecentContributionHeatmap as buildRecentContributionHeatmapFallback,
  getDailyXpSeries as getDailyXpSeriesFallback
} from "../../modules/overview/data.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getStateList(deps, key) {
  return safeArray(deps.getState?.()?.[key]);
}

function getOverviewCatalogProblems(deps) {
  const catalogProblems = safeArray(deps.getCatalogProblems?.());
  if (catalogProblems.length) return catalogProblems;
  const stateProblems = getStateList(deps, "problems");
  if (!stateProblems.length) return [];
  const isCatalogProblem = deps.isCatalogProblem || (() => true);
  return stateProblems.filter((problem) => {
    try {
      return isCatalogProblem(problem);
    } catch {
      return true;
    }
  });
}

function getFallbackProblemProgressItems(deps, problems) {
  const isEnglish = deps.getLanguage?.() === "en";
  const getCompletionCount = deps.getProblemCompletionCount || (() => 0);
  const normalizeCategory = deps.normalizeCategory || ((category) => category || "uncategorized");
  const formatCategory = deps.formatCategoryLabel || ((category) => category || "Other");
  const hot = deps.getLeetcodeHotCompletionStats?.() || { done: 0, total: 0 };
  const themeLabels = new Map(
    safeArray(deps.getProblemThemeEntries?.(problems))
      .map((item) => [item.key, item.label])
  );
  const labelForCategory = (key) => (
    themeLabels.get(key)
    || deps.skillDefs?.[key]?.name
    || formatCategory(key)
    || key
  );
  const groups = new Map();

  problems.forEach((problem) => {
    const key = normalizeCategory(problem.category);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(problem);
  });

  const categoryItems = [...groups.entries()]
    .map(([key, groupProblems]) => ({
      key,
      label: labelForCategory(key),
      done: getCompletionCount(groupProblems),
      total: groupProblems.length
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 2);

  return [
    {
      key: "all",
      label: isEnglish ? "All problems" : "全部题库",
      done: getCompletionCount(problems),
      total: problems.length
    },
    {
      key: "leetcode-hot",
      label: "LeetCode Hot 100",
      done: hot.done || 0,
      total: hot.total || 100
    },
    ...categoryItems
  ].filter((item) => Number(item.total || 0) > 0);
}

export function createOverviewPageApi(deps = {}) {
  function getSettings() {
    return deps.normalizeLeaderboardSettings?.(deps.getRawLeaderboardSettings?.()) || {};
  }

  function getSummary() {
    const score = deps.getQuantScore?.() || 0;
    return {
      score,
      rank: deps.getRank?.(score) || "",
      entryCount: deps.getEntryCount?.() || 0,
      weeklyXp: deps.getWeeklyXp?.() || 0,
      streak: deps.getStreak?.() || 0
    };
  }

  function getTodayPlan() {
    const state = deps.getState?.() || {};
    const prepPlan = deps.normalizePrepPlan?.(state.prepPlan);
    const plan = prepPlan
      ? deps.buildTodayStudyPlan?.()
      : deps.normalizeStudyPlan?.(state.studyPlan);
    if (!plan) return null;
    return {
      summary: plan.summary || deps.t?.("planGenerated") || "",
      items: (plan.items || []).slice(0, 4),
      prepPlanActive: Boolean(prepPlan)
    };
  }

  function getTickerNews() {
    const news = (deps.getState?.().news || []).slice(0, 8);
    const isEnglish = deps.getLanguage?.() === "en";
    return news.map((item) => ({
      id: item.id,
      source: item.source || "News",
      title: isEnglish ? item.title || item.titleZh : item.titleZh || item.title
    }));
  }

  function getProblemProgress() {
    const problems = getOverviewCatalogProblems(deps);
    let items = safeArray(deps.buildProblemProgressItems?.(problems));
    if (!items.length && problems.length) {
      items = getFallbackProblemProgressItems(deps, problems);
    }
    return items.slice(0, 4).map((item, index) => ({
      ...item,
      percent: Math.round((Number(item.done || 0) / Math.max(Number(item.total || 0), 1)) * 100),
      accentIndex: index
    }));
  }

  function getDailyXpBars() {
    let series = safeArray(deps.getDailyXpSeries?.(7));
    if (!series.length) {
      series = getDailyXpSeriesFallback({
        days: 7,
        entries: getStateList(deps, "entries"),
        locale: deps.getLocale?.()
      });
    }
    const maxXp = Math.max(20, ...series.map((item) => item.xp));
    return series.map((item) => ({
      ...item,
      height: Math.max(8, Math.round((item.xp / maxXp) * 100))
    }));
  }

  function getContributionHeatmap() {
    let heatmap = deps.buildRecentContributionHeatmap?.(12);
    if (!heatmap?.days?.length) {
      const today = new Date();
      heatmap = buildRecentContributionHeatmapFallback({
        weekCount: 12,
        today,
        locale: deps.getLocale?.(),
        entries: getStateList(deps, "entries"),
        problemStates: getStateList(deps, "problemStates"),
        leetcodeHot100Done: getStateList(deps, "leetcodeHot100Done"),
        normalizeLeetcodeHot100Done: deps.normalizeLeetcodeHot100Done
      });
    }
    if (!heatmap) return null;
    const todayKey = deps.dayKey?.(new Date());
    const completedLabel = deps.t?.("streakCompleted") || "";
    return {
      ...heatmap,
      todayKey,
      completedLabel,
      startLabel: deps.formatDate?.(heatmap.startKey) || heatmap.startKey,
      endLabel: deps.formatDate?.(heatmap.endKey) || heatmap.endKey,
      days: heatmap.days.map((day) => ({
        ...day,
        title: !day.future
          ? `${deps.formatDate?.(day.key)} - ${day.xp} XP - ${Math.floor(day.completed)} ${completedLabel}`
          : ""
      }))
    };
  }

  function getLeaderboardView() {
    deps.refreshLeaderboardCloud?.(false);
    const settings = getSettings();
    const rows = deps.keepCurrentLeaderboardRow?.(
      deps.getLeaderboardRowsForSettings?.(settings, 10) || [],
      10
    ) || [];
    const changes = deps.computeLeaderboardRankChanges?.(rows, settings) || {};
    const cloudSnapshot = deps.getCloudSnapshot?.() || {};
    const scopeSummary = getLeaderboardScopeSummaryViewModel({
      settings,
      rows,
      language: deps.getLanguage?.(),
      loading: cloudSnapshot.loading,
      cloudRowCount: cloudSnapshot.rowCount,
      error: cloudSnapshot.error,
      text: deps.t,
      getLeaderboardMetricLabel: deps.getLeaderboardMetricLabel,
      getScopeLabel: deps.getLeaderboardScopeText
    });
    return {
      settings,
      metricOptions: deps.getLeaderboardMetricOptions?.() || [],
      rows: rows.map((row, index) => ({
        ...row,
        place: row.place || index + 1,
        trend: changes[row.id] ?? null
      })),
      scopeSummary
    };
  }

  return {
    getSummary,
    getTickerNews,
    getTodayPlan,
    getProblemProgress,
    getDailyXpBars,
    getContributionHeatmap,
    getLeaderboardView,

    generateTodayStudyPlan() {
      deps.generateTodayStudyPlan?.();
      deps.userStateRuntime?.store?.setState?.(deps.getState?.());
      return getTodayPlan();
    },

    updateLeaderboardSettings(patch = {}) {
      const current = getSettings();
      const country = patch.country !== undefined
        ? deps.normalizeCountry?.(patch.country)
        : current.country;
      const region = patch.region !== undefined
        ? deps.normalizeRegionForCountry?.(patch.region, country)
        : current.region;
      const next = deps.normalizeLeaderboardSettings?.({
        ...current,
        ...patch,
        country,
        region
      });
      deps.setRawLeaderboardSettings?.(next);
      deps.saveState?.();
      deps.userStateRuntime?.store?.setState?.(deps.getState?.());
      return getLeaderboardView();
    },

    async refreshLeaderboard(force = true) {
      await deps.refreshLeaderboardCloud?.(force);
      deps.userStateRuntime?.store?.setState?.(deps.getState?.());
      return getLeaderboardView();
    },

    startHeroTypewriter: () => deps.startHeroTypewriter?.(),
    initHeroInteractions: () => deps.initHeroInteractions?.(),
    switchModule: deps.switchModule,
    focusNewsItem(id, shouldSwitch = true) {
      const targetId = String(id || "").trim();
      if (!targetId) return undefined;
      if (deps.focusNewsItem) return deps.focusNewsItem(targetId, shouldSwitch);
      return deps.newsFacade?.focusItem?.(targetId, shouldSwitch);
    },
    t: deps.t,
    getLanguage: deps.getLanguage,
    formatScore: deps.formatScore,
    formatDate: deps.formatDate,
    hashStringToHue: deps.hashStringToHue,
    getInitials: deps.getInitials
  };
}
