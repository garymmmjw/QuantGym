import { renderOverviewSummary } from './summary.js';

export function createOverviewSummaryController(deps = {}) {
  function render() {
    const score = deps.getQuantScore?.() || 0;
    const streak = deps.getStreak?.() || 0;
    renderOverviewSummary(deps.elements || {}, {
      now: deps.now?.() || new Date(),
      score,
      rank: deps.getRank?.(score) || "",
      entryCount: deps.getEntryCount?.() || 0,
      weeklyXp: deps.getWeeklyXp?.() || 0,
      streak
    }, {
      locale: deps.getLocale?.() || "zh-CN",
      formatScore: deps.formatScore
    });
    deps.updateUnreadMessageBadge?.();
    deps.updateCheckInPill?.();
    deps.renderRegionRank?.();
  }

  return { render };
}
