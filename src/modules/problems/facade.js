export function createProblemsFacade(deps = {}) {
  const getBrowserController = () => deps.getBrowserController?.() || null;
  const getLeetcodeHotController = () => deps.getLeetcodeHotController?.() || null;
  const getCaptureController = () => deps.getCaptureController?.() || null;
  const getRuntime = () => deps.getRuntime?.() || null;

  return {
    refreshCatalog(force = false) {
      return getRuntime()?.refreshCatalog(force);
    },
    refreshSocial(problemId = "") {
      return getRuntime()?.refreshSocial(problemId);
    },
    getBrowserMatches(options = {}) {
      return getBrowserController()?.getMatches(options) || [];
    },
    getSearchOptions() {
      return getBrowserController()?.getSearchOptions() || {};
    },
    openFromSearch(problemId) {
      return getBrowserController()?.openFromSearch(problemId);
    },
    render(options = {}) {
      return getBrowserController()?.render(options);
    },
    renderCompanyPanel(problems) {
      return getBrowserController()?.renderCompanyPanel(problems);
    },
    renderViewTabs() {
      return getBrowserController()?.renderViewTabs();
    },
    renderRanking(problems) {
      return getBrowserController()?.renderRanking(problems);
    },
    renderLeetcodeHot100() {
      return getLeetcodeHotController()?.render();
    },
    isLeetcodeHotExpanded() {
      return getLeetcodeHotController()?.isExpanded?.() || false;
    },
    setLeetcodeHotExpanded(expanded) {
      return getLeetcodeHotController()?.setExpanded?.(expanded);
    },
    toggleLeetcodeHotPanel() {
      return getLeetcodeHotController()?.togglePanel();
    },
    consumeIncomingCapture() {
      return getCaptureController()?.consumeIncoming();
    },
    consumePendingCapture() {
      return getCaptureController()?.consumePending();
    }
  };
}
