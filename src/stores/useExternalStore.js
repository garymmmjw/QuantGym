import { useSyncExternalStore } from "react";

export function useExternalStore(store, selector = (state) => state) {
  if (!store?.subscribe || !store?.getState) return selector({});
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
