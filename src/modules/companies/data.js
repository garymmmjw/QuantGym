export function companyKey(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeCompanyTierFilter(value = "all") {
  const key = String(value || "all").toLowerCase();
  return ["s", "a", "b"].includes(key) ? key : "all";
}

export function createCompanyTierFilterState(initialValue = "all") {
  let tier = normalizeCompanyTierFilter(initialValue);
  return {
    getTier() {
      return tier;
    },
    setTier(value) {
      tier = normalizeCompanyTierFilter(value);
      return tier;
    }
  };
}

export function getCompanyAliases(company) {
  if (!company) return [];
  return [company.name, company.short, ...(company.aliases || [])].filter(Boolean);
}

export function getCompanyDef(value, companyDefs = []) {
  const key = companyKey(value);
  if (!key) return null;
  return (Array.isArray(companyDefs) ? companyDefs : []).find((company) => (
    company.slug === value
    || getCompanyAliases(company).some((alias) => companyKey(alias) === key)
  )) || null;
}

export function normalizeProblemCompanies(raw = {}, tags = [], source = "", deps = {}) {
  const {
    companyDefs = [],
    parseTags = (value) => Array.isArray(value) ? value.map(String).filter(Boolean) : String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean)
  } = deps;
  const explicitValues = [
    raw.company,
    raw.firm,
    raw.employer,
    raw.sourceCompany,
    ...(Array.isArray(raw.companies) ? raw.companies : parseTags(raw.companies || ""))
  ];
  const textHints = [
    ...explicitValues,
    ...(Array.isArray(tags) ? tags : []),
    source
  ].filter(Boolean);
  const companies = [];
  textHints.forEach((value) => {
    const company = getCompanyDef(value, companyDefs);
    if (!company || companies.includes(company.name)) return;
    companies.push(company.name);
  });
  return companies;
}

export function getProblemCompanies(problem = {}, deps = {}) {
  const { companyDefs = [], parseTags, cache } = deps;
  const cacheKey = String(problem.id || "");
  const cached = cacheKey ? cache?.get(cacheKey) : null;
  if (cached?.source === problem) return cached.companies;
  const companies = Array.isArray(problem.companies) ? problem.companies : [];
  const defs = companies
    .map((company) => getCompanyDef(company, companyDefs))
    .filter(Boolean);
  const resolved = defs.length
    ? [...new Map(defs.map((company) => [company.slug, company])).values()]
    : normalizeProblemCompanies(problem, problem.tags || [], problem.source || "", { companyDefs, parseTags })
      .map((company) => getCompanyDef(company, companyDefs))
      .filter(Boolean);
  if (cacheKey) cache?.set(cacheKey, { source: problem, companies: resolved });
  return resolved;
}

export function problemMatchesCompany(problem, companySlug = "all", deps = {}) {
  if (!companySlug || companySlug === "all") return true;
  return getProblemCompanies(problem, deps).some((company) => company.slug === companySlug);
}

export function getCompanyProblemStats(company, problems = [], deps = {}) {
  const {
    problemMatches = (problem, slug) => problemMatchesCompany(problem, slug, deps),
    getCompletionCount = () => 0,
    getPersonalState = () => ({})
  } = deps;
  const scoped = (Array.isArray(problems) ? problems : []).filter((problem) => problemMatches(problem, company.slug));
  const completed = getCompletionCount(scoped);
  const scored = scoped
    .map((problem) => Number(getPersonalState(problem.id).lastScore))
    .filter((score) => Number.isFinite(score));
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : null;
  return {
    total: scoped.length,
    completed,
    averageScore,
    percent: Math.round((completed / Math.max(scoped.length, 1)) * 100)
  };
}

export function companyTierWeight(tier = "") {
  return { S: 0, A: 1, B: 2 }[String(tier).toUpperCase()] ?? 5;
}

export function getCompanyJobs(company, jobs = [], deps = {}) {
  const normalizeJobs = deps.normalizeJobs || ((items) => Array.isArray(items) ? items : []);
  const aliases = getCompanyAliases(company).map(companyKey);
  return normalizeJobs(jobs).filter((job) => aliases.includes(companyKey(job.company)));
}
