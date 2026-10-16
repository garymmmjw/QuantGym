const ROUTE_KEYS = new Set(['track', 'topic', 'lecture', 'practice']);

/** Only course navigation is accepted from the isolated lesson renderer. */
export function lessonQuery(input = '') {
  const clean = new URLSearchParams();
  const params = new URLSearchParams(String(input).replace(/^\?/, ''));
  for (const key of ROUTE_KEYS) {
    const value = params.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,160}$/.test(value)) clean.set(key, value);
  }
  return clean.toString();
}

export function lessonProblem(records, rawId) {
  if (!/^\d+$/.test(String(rawId))) return null;
  const p = records.find(p => p.source === 'quantvault' && String(p.quantvault?.id) === String(rawId));
  if (!p) return null;
  return {
    id: p.quantvault.displayId, raw_id: p.quantvault.id,
    title: p.titleEn || p.titleZh, prompt: p.promptEn || p.promptZh,
    solution: p.explanation || p.answer, answer: p.answer, hints: p.hints || [],
    topic: p.quantvault.categorySlug, category: p.quantvault.categorySlug,
    difficulty: p.difficulty, companies: p.companies || []
  };
}

export function questionHref(records, displayId, lessonId = '') {
  if (!/^\d+$/.test(String(displayId))) return null;
  const p = records.find(p => p.source === 'quantvault' && String(p.quantvault?.displayId) === String(displayId));
  if (!p) return null;
  const params = new URLSearchParams({ bank: 'quantvault', question: p.id, from: 'learn' });
  if (/^[a-zA-Z0-9_-]{1,160}$/.test(lessonId)) params.set('lesson', lessonId);
  return `/problems?${params}`;
}
