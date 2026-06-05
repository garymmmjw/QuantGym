export function createNewsFacade(deps = {}) {
  const getProvider = () => deps.getProvider?.() || null;
  const getRuntime = () => deps.getRuntime?.() || null;

  return {
    getSourceTypeLabel(...args) {
      return getProvider()?.getSourceTypeLabel(...args) || "";
    },
    getVerificationLabel(...args) {
      return getProvider()?.getVerificationLabel(...args) || "";
    },
    focusItem(...args) {
      return getProvider()?.focusItem(...args);
    },
    addFromForm() {
      return getProvider()?.addFromForm();
    },
    upsert(items, options = {}) {
      return getProvider()?.upsert(items, options);
    },
    markRead(id, options = {}) {
      return getProvider()?.markRead(id, options);
    },
    maybeAutoRefresh() {
      return getRuntime()?.maybeRefresh?.();
    },
    refresh(showStatus = false) {
      return getRuntime()?.refresh?.(showStatus) || Promise.resolve([]);
    }
  };
}
