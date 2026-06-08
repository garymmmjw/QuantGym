import { createStore } from "./store.js";

export function createUserStateStore(initialState = {}) {
  const store = createStore({ value: initialState.value || {} });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    actions: {
      replace(next = {}) {
        return store.setState({ value: next }, { replace: true });
      },
      patch(patch = {}) {
        const current = store.getState().value || {};
        return store.setState({ value: { ...current, ...patch } });
      }
    }
  };
}
