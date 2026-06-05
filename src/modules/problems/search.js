import {
  matchesNormalizedText,
  normalizeSearchFields,
  normalizeSearchQuery
} from "../../lib/text.js";

export function getProblemTagSearchText(tags = [], tagLabels = {}) {
  return (Array.isArray(tags) ? tags : [])
    .flatMap((tag) => {
      const label = tagLabels[String(tag)] || {};
      return [tag, label.zh, label.en];
    })
    .filter(Boolean)
    .join(" ");
}

export function createProblemSearchRecord(problem, options = {}) {
  const cacheKey = String(problem?.id || "");
  const cache = options.cache;
  const cached = cacheKey && cache?.get(cacheKey);
  if (cached?.source === problem) return cached;

  const getCompanies = options.getCompanies || (() => []);
  const getCompanyAliases = options.getCompanyAliases || ((company) => [company?.name, company?.short, ...(company?.aliases || [])].filter(Boolean));
  const getDisplayTitle = options.getDisplayTitle || ((item, isEn) => (isEn ? item?.titleEn : item?.titleZh) || item?.titleEn || item?.titleZh || "");

  const companies = getCompanies(problem);
  const companyText = companies.map((company) => getCompanyAliases(company).join(" ")).join(" ");
  const tagText = getProblemTagSearchText(problem?.tags, options.tagLabels);
  const titleEn = getDisplayTitle(problem, true);
  const titleZh = getDisplayTitle(problem, false);
  const titleText = normalizeSearchFields([titleEn, titleZh, problem?.titleEn, problem?.titleZh]);
  const promptText = normalizeSearchFields([problem?.promptEn, problem?.promptZh]);
  const metaText = normalizeSearchFields([
    problem?.category,
    problem?.difficulty,
    problem?.source,
    problem?.sourceType,
    problem?.bookSlug,
    problem?.bookName,
    companyText,
    tagText,
    Array.isArray(problem?.tags) ? problem.tags.join(" ") : ""
  ]);
  const searchText = normalizeSearchFields([
    titleText,
    promptText,
    problem?.answer,
    problem?.answerEn,
    problem?.answerZh,
    problem?.explanation,
    problem?.explanationEn,
    problem?.explanationZh,
    metaText
  ]);
  const record = {
    source: problem,
    searchText,
    titleText,
    promptText,
    metaText,
    titleEn,
    titleZh: titleZh || titleEn
  };
  if (cacheKey) cache?.set(cacheKey, record);
  return record;
}

export function getProblemSearchFields(problem, options = {}) {
  const searchRecord = createProblemSearchRecord(problem, options);
  return [searchRecord.searchText];
}

export function scoreProblemSearchRecord(searchRecord, normalizedQuery) {
  const query = normalizeSearchQuery(normalizedQuery);
  if (!query) return 20;
  const tokens = query.split(/\s+/).filter(Boolean);

  if (searchRecord.titleText === query) return 0;
  if (searchRecord.titleText.includes(query)) return 1;
  if (tokens.every((token) => searchRecord.titleText.includes(token))) return 2;
  if (searchRecord.promptText.includes(query)) return 5;
  if (tokens.every((token) => searchRecord.promptText.includes(token))) return 7;
  if (tokens.every((token) => searchRecord.metaText.includes(token))) return 10;
  return 20;
}

export function scoreProblemSearchMatch(problem, normalizedQuery, options = {}) {
  return scoreProblemSearchRecord(createProblemSearchRecord(problem, options), normalizedQuery);
}

export function getProblemBrowserMatches(options = {}) {
  const query = normalizeSearchQuery(options.query || "");
  const filters = options.filters || {};
  const predicates = options.predicates || {};
  let problems = (options.problems || [])
    .filter((problem) => predicates.isCatalogProblem?.(problem) ?? true)
    .filter((problem) => predicates.matchesSource?.(problem, filters.source) ?? true)
    .filter((problem) => predicates.matchesCompany?.(problem, filters.company) ?? true)
    .filter((problem) => predicates.matchesTheme?.(problem, filters.theme) ?? true)
    .filter((problem) => predicates.matchesDifficulty?.(problem, filters.difficulty) ?? true);

  if (query) {
    const searchOptions = options.searchOptions || {};
    const isEnglish = Boolean(options.isEnglish);
    const locale = options.locale || "en";
    problems = problems
      .map((problem) => ({
        problem,
        searchRecord: createProblemSearchRecord(problem, searchOptions)
      }))
      .filter(({ searchRecord }) => matchesNormalizedText(searchRecord.searchText, query))
      .sort((left, right) => (
        scoreProblemSearchRecord(left.searchRecord, query) - scoreProblemSearchRecord(right.searchRecord, query)
        || (isEnglish ? left.searchRecord.titleEn : left.searchRecord.titleZh).localeCompare(
          isEnglish ? right.searchRecord.titleEn : right.searchRecord.titleZh,
          locale
        )
      ))
      .map(({ problem }) => problem);
  }

  if (!options.forceAllView && options.viewMode === "saved") {
    problems = problems.filter((problem) => options.getPersonalState?.(problem.id)?.favorite);
  }
  return problems;
}
