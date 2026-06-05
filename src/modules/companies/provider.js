import {
  companyKey,
  companyTierWeight,
  getCompanyAliases,
  getCompanyDef,
  getCompanyJobs,
  getCompanyProblemStats,
  getProblemCompanies,
  normalizeProblemCompanies,
  problemMatchesCompany
} from './data.js';

export function createCompaniesProvider(deps = {}) {
  const getCompanyDeps = () => ({
    companyDefs: deps.companyDefs || [],
    parseTags: deps.parseTags,
    cache: deps.cache
  });

  function getDef(value) {
    return getCompanyDef(value, deps.companyDefs || []);
  }

  function normalizeCompanies(raw = {}, tags = [], source = "") {
    return normalizeProblemCompanies(raw, tags, source, {
      companyDefs: deps.companyDefs || [],
      parseTags: deps.parseTags
    });
  }

  function getProblemCompanyDefs(problem = {}) {
    return getProblemCompanies(problem, getCompanyDeps());
  }

  function matchesProblemCompany(problem, companySlug = deps.getCompanyFilter?.()) {
    return problemMatchesCompany(problem, companySlug, getCompanyDeps());
  }

  function getProblemStats(company, problems = deps.getCatalogProblems?.() || []) {
    return getCompanyProblemStats(company, problems, {
      problemMatches: (problem, slug) => matchesProblemCompany(problem, slug),
      getCompletionCount: deps.getCompletionCount,
      getPersonalState: deps.getPersonalState
    });
  }

  function getJobs(company) {
    return getCompanyJobs(company, deps.getJobs?.() || [], {
      normalizeJobs: deps.normalizeJobs
    });
  }

  return {
    companyKey,
    companyTierWeight,
    getAliases: getCompanyAliases,
    getDef,
    getJobs,
    getProblemCompanies: getProblemCompanyDefs,
    getProblemStats,
    matchesProblemCompany,
    normalizeCompanies
  };
}
