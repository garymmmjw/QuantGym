import { createStore } from './store.js';

export function createAppRuntime(initialState = {}) {
  const state = {
    appPrefs: initialState.appPrefs || {},
    auth: initialState.auth || {},
    community: initialState.community || {},
    currentUser: initialState.currentUser || null,
    cloudConfig: initialState.cloudConfig || {}
  };
  const store = createStore(state);

  function notify() {
    store.setState(state);
    return store.getState();
  }

  return {
    notify,
    state,
    store,
    subscribe: store.subscribe
  };
}
