export function renderOverviewSummary(elements = {}, summary = {}, options = {}) {
  const locale = options.locale || "zh-CN";
  const formatScore = options.formatScore || ((value) => String(value ?? ""));
  const now = summary.now || new Date();
  if (elements.todayLine) {
    elements.todayLine.textContent = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(now);
  }

  if (elements.totalXp) elements.totalXp.textContent = formatScore(summary.score);
  if (elements.rankName) elements.rankName.textContent = summary.rank || "";
  if (elements.entryCount) elements.entryCount.textContent = String(summary.entryCount ?? 0);
  if (elements.weeklyXp) elements.weeklyXp.textContent = String(summary.weeklyXp ?? 0);
  if (elements.streakCount) elements.streakCount.textContent = String(summary.streak ?? 0);
  if (elements.commandStreakCount) elements.commandStreakCount.textContent = String(summary.streak ?? 0);
  return summary;
}
