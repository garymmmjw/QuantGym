import { normalizeProblemCompanies as normalizeProblemCompaniesValue } from './data.js';

export function createCompaniesDataAdapter(deps = {}) {
  return {
    normalizeProblemCompanies(raw = {}, tags = [], source = "") {
      return normalizeProblemCompaniesValue(raw, tags, source, {
        companyDefs: deps.companyDefs || [],
        parseTags: deps.parseTags
      });
    }
  };
}
