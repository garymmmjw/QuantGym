import { escapeHtml } from "../../lib/text.js";
import { difficultyClass, normalizeDifficultyFilter } from "./format.js";

export function getProblemThemeEntries(problems = [], options = {}) {
  const skillDefs = options.skillDefs || {};
  const normalizeCategory = options.normalizeCategory || ((category) => category);
  return Object.keys(skillDefs)
    .map((key) => ({
      key,
      label: skillDefs[key].name,
      count: problems.filter((problem) => normalizeCategory(problem.category) === key).length
    }))
    .filter((item) => item.count > 0);
}

export function renderProblemThemeFilter(options = {}) {
  const elements = options.elements || {};
  if (!elements.problemThemeFilter) return;
  const problems = options.problems || [];
  const entries = [
    { key: "all", label: options.isEnglish ? "All themes" : "全部主题", count: problems.length },
    ...(options.themeEntries || [])
  ];
  elements.problemThemeFilter.innerHTML = "";
  entries.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `problem-theme-chip${options.activeTheme === item.key ? " active" : ""}`;
    button.dataset.problemTheme = item.key;
    button.innerHTML = `<span>${escapeHtml(item.label)}</span><small>${escapeHtml(String(item.count))}</small>`;
    elements.problemThemeFilter.appendChild(button);
  });
  if (elements.problemThemeSummary) {
    const active = entries.find((item) => item.key === options.activeTheme) || entries[0];
    elements.problemThemeSummary.textContent = `${active.label} · ${active.count} ${options.isEnglish ? "problems" : "题"}`;
  }
}

export function renderProblemDifficultyFilter(options = {}) {
  const elements = options.elements || {};
  if (!elements.problemDifficultyFilter) return;
  const problems = options.problems || [];
  const activeTheme = options.activeTheme || "all";
  const normalizeCategory = options.normalizeCategory || ((category) => category);
  const themeProblems = problems.filter((problem) => (
    !activeTheme || activeTheme === "all" || normalizeCategory(problem.category) === activeTheme
  ));
  const entries = [
    { key: "all", label: options.t?.("problemDifficultyAll") || "All", count: themeProblems.length },
    { key: "easy", label: "Easy", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "easy").length },
    { key: "medium", label: "Medium", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "medium").length },
    { key: "hard", label: "Hard", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "hard").length }
  ];
  elements.problemDifficultyFilter.querySelectorAll("[data-problem-difficulty]").forEach((button) => {
    const key = normalizeDifficultyFilter(button.dataset.problemDifficulty);
    const entry = entries.find((item) => item.key === key);
    button.classList.toggle("active", key === options.activeDifficulty);
    button.innerHTML = `${escapeHtml(entry?.label || button.textContent.trim())}<small>${escapeHtml(String(entry?.count || 0))}</small>`;
    button.setAttribute("aria-pressed", String(key === options.activeDifficulty));
    button.title = options.isEnglish ? `${entry?.count || 0} problems` : `${entry?.count || 0} 题`;
  });
}

export function buildProblemProgressItems(options = {}) {
  const problems = options.problems || [];
  const activeTheme = options.activeTheme || "all";
  const normalizeCategory = options.normalizeCategory || ((category) => category);
  const getCompletionCount = options.getCompletionCount || (() => 0);
  const hot = options.getHotStats?.() || { done: 0, total: 0 };
  const activeThemeProblems = problems.filter((problem) => normalizeCategory(problem.category) === activeTheme);
  const themeEntries = (options.themeEntries || [])
    .map((item) => {
      const themeProblems = problems.filter((problem) => normalizeCategory(problem.category) === item.key);
      return {
        key: item.key,
        label: item.label,
        done: getCompletionCount(themeProblems),
        total: themeProblems.length
      };
    })
    .sort((left, right) => right.total - left.total);

  const items = [
    {
      key: "all",
      label: options.isEnglish ? "All problems" : "全部题库",
      done: getCompletionCount(problems),
      total: problems.length
    },
    {
      key: "leetcode-hot",
      label: "LeetCode Hot 100",
      done: hot.done,
      total: hot.total
    }
  ];

  if (activeTheme !== "all") {
    items.push({
      key: "active-theme",
      label: `${options.isEnglish ? "Current theme" : "当前主题"} · ${options.formatCategory?.(activeTheme) || activeTheme}`,
      done: getCompletionCount(activeThemeProblems),
      total: activeThemeProblems.length
    });
  }

  themeEntries.slice(0, activeTheme === "all" ? 3 : 2).forEach((item) => items.push(item));
  return items.filter((item) => item.total > 0);
}

export function renderProgressGroup(container, items = []) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item, index) => {
    const percent = Math.round((Number(item.done || 0) / Math.max(Number(item.total || 0), 1)) * 100);
    const row = document.createElement("div");
    row.className = "effect-progress-row";
    row.style.setProperty("--value", String(percent));
    row.style.setProperty("--accent-index", String(index));
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(String(item.done))} / ${escapeHtml(String(item.total))}</span>
      </div>
      <i aria-hidden="true"><span></span></i>
    `;
    container.appendChild(row);
  });
}

export function getProblemCollectionEntries(options = {}) {
  const problems = options.problems || [];
  const isEnglish = Boolean(options.isEnglish);
  const normalizeCategory = options.normalizeCategory || ((category) => category);
  const getCompletionCount = options.getCompletionCount || (() => 0);
  const matchesSource = options.matchesSource || (() => false);
  const bySource = (sourceSlug) => problems.filter((problem) => matchesSource(problem, sourceSlug));
  const byTheme = (theme) => problems.filter((problem) => normalizeCategory(problem.category) === theme);
  const sourceEntry = (id, sourceSlug, titleZh, titleEn, descriptionZh, descriptionEn, icon, accent) => {
    const sourceProblems = bySource(sourceSlug);
    return {
      id,
      mode: "source",
      sourceSlug,
      icon,
      accent,
      title: isEnglish ? titleEn : titleZh,
      description: isEnglish ? descriptionEn : descriptionZh,
      total: sourceProblems.length,
      done: getCompletionCount(sourceProblems)
    };
  };
  const themeEntry = (id, theme, titleZh, titleEn, descriptionZh, descriptionEn, icon, accent) => {
    const themeProblems = byTheme(theme);
    return {
      id,
      mode: "theme",
      theme,
      icon,
      accent,
      title: isEnglish ? titleEn : titleZh,
      description: isEnglish ? descriptionEn : descriptionZh,
      total: themeProblems.length,
      done: getCompletionCount(themeProblems)
    };
  };
  const hot = options.getHotStats?.() || { done: 0, total: 0 };
  return [
    {
      id: "leetcode-hot",
      mode: "leetcode",
      icon: "heart",
      accent: "violet",
      title: "LeetCode Hot 100",
      description: isEnglish ? "Top 100 liked study plan with completion tracking." : "官方 Top 100 liked 题单，跳转原题并记录完成。",
      total: hot.total,
      done: hot.done
    },
    sourceEntry("quantguide", "quantguide", "QuantGuide 题库", "QuantGuide Bank", "1200+ 高频 quant 面试题，适合日常主线刷题。", "1200+ quant interview prompts for the daily grind.", "sparkles", "indigo"),
    sourceEntry("stat110", "stat110-strategic-practice", "Stat 110 概率练习", "Stat 110 Practice", "Harvard 概率战略练习，按题单进入题库。", "Harvard probability practice sheets linked into the bank.", "dice-5", "emerald"),
    sourceEntry("hull-derivatives", "hull-derivatives", "Hull 衍生品", "Hull Derivatives", "期权、期货、Greek、对冲与风险中性定价。", "Options, futures, Greeks, hedging, and risk-neutral pricing.", "line-chart", "rose"),
    themeEntry("probability-core", "probabilityExpectation", "概率 / 期望核心", "Probability Core", "所有概率、期望、分布、条件概率相关题。", "All probability, expectation, distribution, and conditioning problems.", "sigma", "blue"),
    themeEntry("optimization-pack", "optimization", "优化题包", "Optimization Pack", "凸优化、线性规划、组合优化和投资组合题。", "Convex optimization, LP, modeling, and portfolio problems.", "network", "amber")
  ].filter((entry) => entry.total > 0);
}

export function getProblemCollectionClickResult(collectionId = "", entries = [], options = {}) {
  const entry = (Array.isArray(entries) ? entries : [])
    .find((item) => item.id === collectionId);
  if (!entry) return { ok: false };

  if (entry.mode === "leetcode") {
    return {
      ok: true,
      mode: "leetcode",
      leetcodeExpanded: !options.leetcodeExpanded
    };
  }

  const isSource = entry.mode === "source";
  return {
    ok: true,
    mode: isSource ? "source" : "theme",
    filters: {
      viewMode: "all",
      company: "all",
      difficulty: "all",
      detailId: "",
      source: isSource ? entry.sourceSlug : "all",
      theme: isSource ? "all" : entry.theme
    }
  };
}

export function renderProblemCollectionGrid(options = {}) {
  const container = options.container;
  if (!container) return;
  container.innerHTML = "";
  (options.entries || []).forEach((entry) => {
    const percent = Math.round((entry.done / Math.max(entry.total, 1)) * 100);
    const active = entry.mode === "leetcode"
      ? options.leetcodeExpanded
      : entry.mode === "source"
        ? options.activeSource === entry.sourceSlug
        : options.activeTheme === entry.theme;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `problem-collection-card accent-${entry.accent}${active ? " active" : ""}`;
    card.dataset.problemCollection = entry.id;
    card.style.setProperty("--value", String(percent));
    card.innerHTML = `
      <span class="problem-collection-art"><span><i data-lucide="${entry.icon}"></i></span></span>
      <span class="problem-collection-copy">
        <em>${escapeHtml(entry.mode === "leetcode" ? "Featured list" : entry.mode === "source" ? "Source set" : "Topic set")}</em>
        <strong>${escapeHtml(entry.title)}</strong>
        <small>${escapeHtml(entry.description)}</small>
      </span>
      <span class="problem-collection-bottom">
        <span><strong>${escapeHtml(String(entry.done))}</strong> / ${escapeHtml(String(entry.total))}</span>
        <small>${escapeHtml(options.isEnglish ? "completed" : "完成进度")}</small>
        <i aria-hidden="true"><span></span></i>
      </span>
      <span class="problem-collection-go" aria-hidden="true"><i data-lucide="arrow-up-right"></i></span>
    `;
    container.appendChild(card);
  });
}
