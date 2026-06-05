export function createOverviewFacade(deps = {}) {
  const getHeroCoachController = () => deps.getHeroCoachController?.() || null;
  const getSummaryController = () => deps.getSummaryController?.() || null;
  const getLeaderboardController = () => deps.getLeaderboardController?.() || null;

  return {
    startHeroTypewriter() {
      return getHeroCoachController()?.startTypewriter?.();
    },
    renderSummary() {
      return getSummaryController()?.render?.();
    },
    invalidateLeaderboard(options = {}) {
      return getLeaderboardController()?.invalidate(options);
    },
    refreshLeaderboard(force = false) {
      return getLeaderboardController()?.refresh(force) || Promise.resolve([]);
    }
  };
}
