import { dayKey, shiftDate } from '../../lib/date.js';

export function getDailyXpSeries(options = {}) {
  const {
    days = 7,
    entries = [],
    today = new Date(),
    locale = "zh-CN"
  } = options;
  const totals = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const key = dayKey(entry.date);
    totals.set(key, (totals.get(key) || 0) + Number(entry.totalXp || 0));
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
      xp: totals.get(key) || 0
    };
  });
}

export function getContributionStatsByDay(options = {}) {
  const {
    entries = [],
    problemStates = [],
    leetcodeHot100Done = [],
    normalizeLeetcodeHot100Done = (items) => Array.isArray(items) ? items : [],
    today = new Date()
  } = options;
  const xpByDay = new Map();
  const completedByDay = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const key = dayKey(entry.date);
    xpByDay.set(key, (xpByDay.get(key) || 0) + Number(entry.totalXp || 0));
  });
  (Array.isArray(problemStates) ? problemStates : []).forEach((item) => {
    if (!item.completedAt) return;
    const key = dayKey(item.completedAt);
    completedByDay.set(key, (completedByDay.get(key) || 0) + 1);
  });
  const hotDoneCount = normalizeLeetcodeHot100Done(leetcodeHot100Done).length;
  if (hotDoneCount) {
    const key = dayKey(today);
    completedByDay.set(key, (completedByDay.get(key) || 0) + Math.min(5, Math.ceil(hotDoneCount / 20)));
  }
  const keys = new Set([...xpByDay.keys(), ...completedByDay.keys()]);
  return new Map([...keys].map((key) => {
    const xp = xpByDay.get(key) || 0;
    const completed = completedByDay.get(key) || 0;
    const level = Math.min(5, Math.max(0, Math.ceil(xp / 24) + Math.ceil(completed)));
    return [key, { xp, completed, level }];
  }));
}

export function getContributionSeries(options = {}) {
  const {
    days = 35,
    today = new Date(),
    statsByDay = getContributionStatsByDay(options)
  } = options;
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    return { key, date, ...(statsByDay.get(key) || { xp: 0, completed: 0, level: 0 }) };
  });
}

export function buildRecentContributionHeatmap(options = {}) {
  const {
    weekCount = 12,
    today = new Date(),
    locale = "zh-CN",
    statsByDay = getContributionStatsByDay(options)
  } = options;
  const alignedEnd = shiftDate(today, 6 - today.getDay());
  const alignedStart = shiftDate(alignedEnd, -(weekCount * 7 - 1));
  const days = [];
  for (let cursor = new Date(alignedStart); cursor <= alignedEnd; cursor = shiftDate(cursor, 1)) {
    const key = dayKey(cursor);
    const stats = statsByDay.get(key) || { xp: 0, completed: 0, level: 0 };
    days.push({
      key,
      date: new Date(cursor),
      future: cursor > today,
      ...stats
    });
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });
  const labelsByMonth = new Map();
  days.forEach((day, index) => {
    const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (labelsByMonth.has(monthKey)) return;
    labelsByMonth.set(monthKey, {
      label: monthFormatter.format(day.date),
      startWeek: Math.floor(index / 7),
      weekSpan: 1
    });
  });
  const labels = [...labelsByMonth.values()].map((label, index, allLabels) => {
    const next = allLabels[index + 1];
    return {
      ...label,
      weekSpan: Math.max(1, (next?.startWeek ?? weekCount) - label.startWeek)
    };
  });
  return {
    days,
    labels,
    weekCount,
    startKey: dayKey(alignedStart),
    endKey: dayKey(today)
  };
}

export function buildMonthlyContributionHeatmap(options = {}) {
  const monthCount = options.monthCount ?? 4;
  return buildRecentContributionHeatmap({
    ...options,
    weekCount: Math.max(8, monthCount * 4)
  });
}
