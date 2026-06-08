import { useEffect } from "react";
import { useAppServices } from "../stores/usePageApi.js";

/** Keeps sidebar/nav module state aligned with the active React route. */
export function useSyncModuleRoute(moduleId) {
  const appServices = useAppServices();

  useEffect(() => {
    appServices.services?.switchModule?.(moduleId, { updateRoute: false });
  }, [appServices, moduleId]);
}
