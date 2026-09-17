// Hide unfinished feature entry points while keeping their routes and data intact.
// Remove an ID here when that feature is ready to appear in the main app again.
export const PAUSED_MODULE_IDS = new Set([
  "pk",
  "interview",
  "news",
  "community",
  "messages",
  "network",
  "resume",
  "jobs",
  "companies",
  "courses",
  "library",
  "memory"
]);

export function isModuleVisible(moduleId) {
  return !PAUSED_MODULE_IDS.has(String(moduleId || "").trim());
}
