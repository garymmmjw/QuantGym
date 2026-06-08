import { createStore } from "./store.js";

export function createAuthStore(initialState = {}) {
  const store = createStore({
    auth: initialState.auth || {},
    currentUser: initialState.currentUser || null
  });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    actions: {
      setCurrentUser(user = null) {
        return store.setState({ currentUser: user });
      },
      patchAuth(patch = {}) {
        return store.setState({ auth: { ...store.getState().auth, ...patch } });
      }
    }
  };
}
