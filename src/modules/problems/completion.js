/** Local problem completion is an explicit action; LeetCode uses its linked account. */
export function isLeetcodeCatalogProblem(problem = {}) {
  const category = String(problem.category || '').trim().toLowerCase();
  if (category === 'leetcode' || /^leetcode[-:]/i.test(String(problem.id || ''))) return true;
  if ([problem.source, problem.sourceType].some(value => /^leetcode(?:[-_ ](?:cn|com))?$/i.test(String(value || '').trim()))) return true;
  const sourceUrl = problem.sourceUrl || problem.url || '';
  if (typeof sourceUrl !== 'string' || !/^https?:\/\//i.test(sourceUrl)) return false;
  try {
    const url = new URL(sourceUrl);
    return /^(?:www\.)?leetcode\.(?:cn|com)$/i.test(url.hostname) && url.pathname.startsWith('/problems/');
  } catch {
    return false;
  }
}

export function isTrainerCatalogProblem(problem = {}) {
  const category = String(problem.category || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  return ['mentalmath', 'mental', 'sequence', 'pattern'].includes(category)
    || String(problem.source || '').trim().toLowerCase() === 'trainer';
}

export function countsTowardProblemTotal(problem = {}) {
  return !isLeetcodeCatalogProblem(problem) && !isTrainerCatalogProblem(problem);
}

export function hasExplicitProblemCompletion(state = {}) {
  return state?.completed === true && typeof state.completedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(state.completedAt)
    && Number.isFinite(Date.parse(state.completedAt));
}
