import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppServicesContext } from "../stores/AppServicesContext.jsx";
import { getModulePath, getRouteModuleId } from "./routeConfig.js";

const HASH_ALIASES = new Map([
  ["", "overview"],
  ["home", "overview"],
  ["dashboard", "overview"]
]);

function readHashModule() {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function normalizeHashModule(value = "") {
  const trimmed = String(value || "").trim().toLowerCase();
  return HASH_ALIASES.get(trimmed) || trimmed;
}

export function HashCompatRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const appServices = useAppServicesContext();

  useEffect(() => {
    function navigateToModule(moduleId, options = {}) {
      const targetPath = getModulePath(moduleId);
      const nextUrl = `${targetPath}${window.location.search}`;
      if (window.location.pathname === targetPath) {
        if (window.location.hash) window.history.replaceState(null, "", nextUrl);
        return;
      }
      navigate(nextUrl, { replace: Boolean(options.replace) });
    }

    function redirectHashRoute() {
      if (!window.location.hash) return;
      const hashModule = normalizeHashModule(readHashModule());
      if (!hashModule) return;
      navigateToModule(hashModule, { replace: true });
    }

    function handleModuleNavigation(event) {
      const moduleId = event?.detail?.moduleId;
      if (!moduleId) return;
      navigateToModule(moduleId, { replace: event.detail.replace });
    }

    redirectHashRoute();
    window.addEventListener("hashchange", redirectHashRoute);
    window.addEventListener("quantgym:navigate-module", handleModuleNavigation);
    return () => {
      window.removeEventListener("hashchange", redirectHashRoute);
      window.removeEventListener("quantgym:navigate-module", handleModuleNavigation);
    };
  }, [navigate]);

  useEffect(() => {
    if (!appServices.appState?.currentUser) return undefined;
    const moduleId = getRouteModuleId(location.pathname);
    if (moduleId) {
      appServices.services?.switchModule?.(moduleId, { updateRoute: false });
    }
    return undefined;
  }, [appServices, location.pathname]);

  return null;
}
