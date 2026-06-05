export function makeId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function stableSlugId(prefix, title, sourceUrl, options = {}) {
  const limit = Number(options.limit || 90);
  const base = `${title}|${sourceUrl}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${prefix}-${base.slice(0, limit) || options.fallback || makeId()}`;
}

export function stableProblemId(title, sourceUrl, options = {}) {
  return stableSlugId("problem", title, sourceUrl, { ...options, limit: 80 });
}

export function stableNewsId(title, sourceUrl, options = {}) {
  return stableSlugId("news", title, sourceUrl, { ...options, limit: 90 });
}

export function stableCourseId(title, sourceUrl, options = {}) {
  return stableSlugId("course", title, sourceUrl, { ...options, limit: 90 });
}
