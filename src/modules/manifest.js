/** @typedef {import('./manifest.js').ModuleDefinition} ModuleDefinition */

/**
 * @typedef {Object} ModuleDefinition
 * @property {string} id
 * @property {string} hash
 * @property {string} path
 * @property {string} labelKey
 * @property {string} navGroup
 * @property {boolean} protected
 * @property {number} stage2Priority
 * @property {boolean} [navTab] - appears in sidebar nav tabs
 */

export const MODULE_MANIFEST = [
  { id: "overview", hash: "#overview", path: "/", labelKey: "overview", navGroup: "overview", protected: true, stage2Priority: 20, navTab: true },
  { id: "calendar", hash: "#calendar", path: "/calendar", labelKey: "calendar", navGroup: "career", protected: true, stage2Priority: 23, navTab: true },
  { id: "technical-interview", hash: "#technical-interview", path: "/technical-interview", labelKey: "technicalInterview", navGroup: "training", protected: true, stage2Priority: 25, navTab: true },
  { id: "behavioral-interview", hash: "#behavioral-interview", path: "/behavioral-interview", labelKey: "behavioralInterview", navGroup: "training", protected: true, stage2Priority: 27, navTab: true },
  { id: "leetcode", hash: "#leetcode", path: "/leetcode", labelKey: "leetcode", navGroup: "training", protected: true, stage2Priority: 24, navTab: true },
  { id: "plan", hash: "#plan", path: "/plan", labelKey: "plan", navGroup: "growth", protected: true, stage2Priority: 18, navTab: true },
  { id: "skills", hash: "#skills", path: "/skills", labelKey: "skills", navGroup: "growth", protected: true, stage2Priority: 17, navTab: true },
  { id: "league", hash: "#league", path: "/league", labelKey: "league", navGroup: "growth", protected: true, stage2Priority: 21, navTab: true },
  { id: "interview", hash: "#interview", path: "/interview", labelKey: "interview", navGroup: "training", protected: true, stage2Priority: 16, navTab: true },
  { id: "problems", hash: "#problems", path: "/problems", labelKey: "problems", navGroup: "resources", protected: true, stage2Priority: 15, navTab: true },
  { id: "tools", hash: "#tools", path: "/tools", labelKey: "tools", navGroup: "training", protected: true, stage2Priority: 14, navTab: true },
  { id: "experiences", hash: "#experiences", path: "/experiences", labelKey: "experiences", navGroup: "resources", protected: true, stage2Priority: 13, navTab: true },
  { id: "news", hash: "#news", path: "/news", labelKey: "news", navGroup: "social", protected: true, stage2Priority: 12, navTab: true },
  { id: "community", hash: "#community", path: "/community", labelKey: "community", navGroup: "social", protected: true, stage2Priority: 11, navTab: true },
  { id: "messages", hash: "#messages", path: "/messages", labelKey: "messages", navGroup: "social", protected: true, stage2Priority: 10, navTab: true },
  { id: "network", hash: "#network", path: "/network", labelKey: "network", navGroup: "social", protected: true, stage2Priority: 9, navTab: true },
  { id: "tracker", hash: "#tracker", path: "/tracker", labelKey: "applicationTracker", navGroup: "career", protected: true, stage2Priority: 26, navTab: true },
  { id: "resume", hash: "#resume", path: "/resume", labelKey: "resume", navGroup: "career", protected: true, stage2Priority: 8, navTab: true },
  { id: "jobs", hash: "#jobs", path: "/jobs", labelKey: "jobs", navGroup: "career", protected: true, stage2Priority: 7, navTab: true },
  { id: "companies", hash: "#companies", path: "/companies", labelKey: "companies", navGroup: "career", protected: true, stage2Priority: 6, navTab: true },
  { id: "library", hash: "#library", path: "/library", labelKey: "library", navGroup: "resources", protected: true, stage2Priority: 5, navTab: true },
  { id: "courses", hash: "#courses", path: "/courses", labelKey: "courses", navGroup: "resources", protected: true, stage2Priority: 4, navTab: true },
  { id: "memory", hash: "#memory", path: "/memory", labelKey: "memory", navGroup: "resources", protected: true, stage2Priority: 3, navTab: true },
  { id: "settings", hash: "#settings", path: "/settings", labelKey: "settings", navGroup: "utility", protected: true, stage2Priority: 2, navTab: false },
  { id: "account", hash: "#account", path: "/account", labelKey: "account", navGroup: "utility", protected: true, stage2Priority: 19, navTab: false },
  { id: "pk", hash: "#pk", path: "/pk", labelKey: "pk", navGroup: "training", protected: true, stage2Priority: 0, navTab: false }
];

const manifestById = new Map(MODULE_MANIFEST.map((entry) => [entry.id, entry]));

export function getModuleDefinition(id = "") {
  return manifestById.get(String(id || "").trim()) || null;
}

export function getModuleIds() {
  return MODULE_MANIFEST.map((entry) => entry.id);
}

export function getDefaultModuleId() {
  return "overview";
}

export function isProtectedModule(id = "") {
  const entry = getModuleDefinition(id);
  return entry ? entry.protected : true;
}

export function getStage2Path(id = "") {
  const entry = getModuleDefinition(id);
  return entry?.path || "/";
}

export function getManifestRouteModules() {
  return new Set(getModuleIds());
}

export function getNavTabModuleIds() {
  return MODULE_MANIFEST.filter((entry) => entry.navTab).map((entry) => entry.id);
}
