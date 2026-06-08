import { useAppServicesContext } from "./AppServicesContext.jsx";

export function usePageApi(moduleId = "") {
  const appServices = useAppServicesContext();
  if (!moduleId) return appServices.pageApi || {};
  return appServices.pageApi?.[moduleId] || null;
}

export function useAppServices() {
  return useAppServicesContext();
}
