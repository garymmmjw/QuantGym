import { createStore } from "./store.js";

export function createPreferencesStore(initialState = {}) {
  const store = createStore({
    language: initialState.language || "zh",
    sidebarCollapsed: Boolean(initialState.sidebarCollapsed)
  });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    actions: {
      setLanguage(language = "zh") {
        return store.setState({ language });
      },
      setSidebarCollapsed(collapsed = false) {
        return store.setState({ sidebarCollapsed: Boolean(collapsed) });
      }
    }
  };
}
