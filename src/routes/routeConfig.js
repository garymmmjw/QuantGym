import { MODULE_MANIFEST } from "../modules/manifest.js";

/** Full React pages: no createBridgePage, PartialBridgeContent, or ReactPageShell. */
export const REACT_PAGE_IDS = new Set([
  "overview",
  "plan",
  "skills",
  "interview",
  "problems",
  "tools",
  "poker",
  "experiences",
  "news",
  "community",
  "messages",
  "network",
  "resume",
  "jobs",
  "companies",
  "library",
  "courses",
  "memory",
  "settings",
  "account",
  "pk"
]);

/** Bridge pages: still use legacy partial HTML or ReactPageShell portal. */
export const BRIDGE_PAGE_IDS = new Set([]);

export const routeConfig = MODULE_MANIFEST.map((module) => ({
  id: module.id,
  path: module.path,
  protected: module.protected,
  mode: REACT_PAGE_IDS.has(module.id)
    ? "react"
    : BRIDGE_PAGE_IDS.has(module.id)
      ? "bridge"
      : "legacy"
}));

export function getRouteMode(id = "") {
  const route = routeConfig.find((entry) => entry.id === id);
  return route?.mode || "legacy";
}

export function isReactRoute(id = "") {
  return REACT_PAGE_IDS.has(id);
}

export function isBridgeRoute(id = "") {
  return BRIDGE_PAGE_IDS.has(id);
}

export function getRouteModuleId(pathname = "/") {
  const normalized = String(pathname || "/").replace(/\/+$/, "") || "/";
  const match = routeConfig.find((route) => route.path === normalized);
  return match?.id || "overview";
}

export function getModulePath(moduleId = "overview") {
  const match = routeConfig.find((route) => route.id === moduleId);
  return match?.path || "/";
}

export function countRouteModes() {
  const counts = { legacy: 0, bridge: 0, react: 0 };
  for (const route of routeConfig) {
    counts[route.mode] = (counts[route.mode] || 0) + 1;
  }
  return counts;
}
