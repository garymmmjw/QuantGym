import { createStore } from "./store.js";

export function createAppStore(initialState = {}) {
  const store = createStore({
    appPrefs: initialState.appPrefs || {},
    community: initialState.community || {},
    cloudConfig: initialState.cloudConfig || {}
  });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    actions: {
      patch(patch = {}) {
        return store.setState(patch);
      },
      setCloudConfig(config = {}) {
        return store.setState({ cloudConfig: { ...store.getState().cloudConfig, ...config } });
      }
    }
  };
}
