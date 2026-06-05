export function normalizeRouteSegment(value = "") {
  return decodeURIComponent(String(value || ""))
    .trim()
    .replace(/^#/, "")
    .replace(/^\//, "")
    .split(/[/?&]/)[0]
    .trim()
    .toLowerCase();
}
