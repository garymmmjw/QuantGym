import { createContext, useContext } from "react";
import { useExternalStore } from "./useExternalStore.js";

const AppServicesContext = createContext(null);

export function AppServicesProvider({ appServices, children }) {
  const value = appServices;
  return (
    <AppServicesContext.Provider value={value}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServicesContext() {
  const value = useContext(AppServicesContext);
  if (!value) throw new Error("useAppServicesContext must be used within AppServicesProvider");
  return value;
}

export function useAppStore(selector = (state) => state) {
  const appServices = useAppServicesContext();
  const store = appServices.stores?.appStore;
  if (!store?.subscribe || !store?.getState) {
    throw new Error("appStore is not wired in createAppContext");
  }
  return useExternalStore(store, selector);
}

export function useAuthStore(selector = (state) => state) {
  const appServices = useAppServicesContext();
  const store = appServices.stores?.authStore;
  if (!store?.subscribe || !store?.getState) {
    throw new Error("authStore is not wired in createAppContext");
  }
  return useExternalStore(store, selector);
}

export function useUserStateStore(selector = (state) => state) {
  const appServices = useAppServicesContext();
  const store = appServices.stores?.userStateStore;
  if (!store?.subscribe || !store?.getState) {
    throw new Error("userStateStore is not wired in createAppContext");
  }
  return useExternalStore(store, selector);
}
