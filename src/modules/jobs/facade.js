export function createJobsFacade(deps = {}) {
  const getRuntime = () => deps.getRuntime?.() || null;

  return {
    maybeAutoRefresh() {
      return getRuntime()?.maybeRefresh?.();
    },
    refresh(showStatus = false) {
      return getRuntime()?.refresh?.(showStatus) || Promise.resolve([]);
    }
  };
}
