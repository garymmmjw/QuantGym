export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeSearchQuery(query) {
  return String(query || "").normalize("NFKC").trim().toLowerCase();
}

export function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/[,，#\s]+/).map((item) => item.trim()).filter(Boolean);
}

export function normalizeSearchFields(fields) {
  return normalizeSearchQuery((Array.isArray(fields) ? fields : [fields]).filter(Boolean).join(" "));
}

function getSearchTokens(normalizedQuery) {
  return normalizeSearchQuery(normalizedQuery).split(/\s+/).filter(Boolean);
}

export function matchesNormalizedText(normalizedText, normalizedQuery) {
  const tokens = getSearchTokens(normalizedQuery);
  if (!tokens.length) return true;
  return tokens.every((token) => normalizedText.includes(token));
}

export function matchesQuery(fields, normalizedQuery) {
  return matchesNormalizedText(normalizeSearchFields(fields), normalizedQuery);
}

export function hashStringToHue(value) {
  return String(value || "").split("").reduce((hash, char) => (
    (hash * 31 + char.charCodeAt(0)) % 360
  ), 0);
}
