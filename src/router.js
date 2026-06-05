import { normalizeRouteSegment } from './lib/route.js';

export const DEFAULT_ROUTE_MODULE = "overview";

const ROUTE_ALIASES = new Map([
  ["", DEFAULT_ROUTE_MODULE],
  ["/", DEFAULT_ROUTE_MODULE],
  ["home", DEFAULT_ROUTE_MODULE],
  ["dashboard", DEFAULT_ROUTE_MODULE]
]);

export function getAvailableRouteModules(root = document) {
  return new Set(
    [...root.querySelectorAll("[data-module-view]")]
      .map((view) => normalizeRouteModule(view.dataset.moduleView))
      .filter(Boolean)
  );
}

export function getCurrentRouteModule(availableModules = getAvailableRouteModules()) {
  return resolveRouteModule(window.location.hash, availableModules);
}

export function resolveRouteModule(value = "", availableModules = getAvailableRouteModules()) {
  const normalized = normalizeRouteModule(value);
  const aliased = ROUTE_ALIASES.get(normalized) || normalized;
  return availableModules.has(aliased) ? aliased : DEFAULT_ROUTE_MODULE;
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
