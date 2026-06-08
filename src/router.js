import { normalizeRouteSegment } from './lib/route.js';
import {
  getDefaultModuleId,
  getStage2Path,
  getManifestRouteModules,
  getModuleDefinition
} from './modules/manifest.js';

export const DEFAULT_ROUTE_MODULE = getDefaultModuleId();

const ROUTE_ALIASES = new Map([
  ["", DEFAULT_ROUTE_MODULE],
  ["/", DEFAULT_ROUTE_MODULE],
  ["home", DEFAULT_ROUTE_MODULE],
  ["dashboard", DEFAULT_ROUTE_MODULE]
]);

export function getAvailableRouteModules(root = document) {
  const domModules = new Set(
    [...root.querySelectorAll("[data-module-view]")]
      .map((view) => normalizeRouteModule(view.dataset.moduleView))
      .filter(Boolean)
  );
  const manifestModules = getManifestRouteModules();
  return new Set([...domModules].filter((id) => manifestModules.has(id)));
}

export function getCurrentRouteModule(availableModules = getAvailableRouteModules()) {
  return resolveRouteModule(window.location.hash, availableModules);
}

export function getPathRouteModule(pathname = window.location.pathname) {
  const normalized = normalizePathname(pathname);
  const match = [...getManifestRouteModules()].find((id) => normalizePathname(getStage2Path(id)) === normalized);
  return match || DEFAULT_ROUTE_MODULE;
}

export function resolveRouteModule(value = "", availableModules = getAvailableRouteModules()) {
  const normalized = normalizeRouteModule(value);
  const aliased = ROUTE_ALIASES.get(normalized) || normalized;
  if (availableModules.has(aliased)) return aliased;
  if (getModuleDefinition(aliased)) return getDefaultModuleId();
  return DEFAULT_ROUTE_MODULE;
}

export function writeRouteModule(moduleName, options = {}) {
  const nextModule = normalizeRouteModule(moduleName) || DEFAULT_ROUTE_MODULE;
  const nextHash = `#${encodeURIComponent(nextModule)}`;
  if (window.location.hash === nextHash) return;

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
  if (options.replace) window.history.replaceState(null, "", nextUrl);
  else window.history.pushState(null, "", nextUrl);
}

export function initHashRouter(options = {}) {
  const onRouteChange = typeof options.onRouteChange === "function" ? options.onRouteChange : () => {};
  const getAvailableModules = typeof options.getAvailableModules === "function"
    ? options.getAvailableModules
    : getAvailableRouteModules;

  const notify = () => {
    onRouteChange(getCurrentRouteModule(getAvailableModules()));
  };

  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);

  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
  };
}

function normalizeRouteModule(value = "") {
  return normalizeRouteSegment(value);
}

function normalizePathname(pathname = "/") {
  const normalized = String(pathname || "/").replace(/\/+$/, "") || "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
