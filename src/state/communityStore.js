import { createStore } from "./store.js";

export function createCommunityStore(initialState = {}) {
  const store = createStore({ value: initialState.value || { posts: [], comments: [] } });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    actions: {
      replace(next = {}) {
        return store.setState({ value: next }, { replace: true });
      }
    }
  };
}
