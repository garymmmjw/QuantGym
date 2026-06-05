import {
  formatCategoryLabel as formatCategoryLabelValue,
  getUserCatalogProblems as getUserCatalogProblemsValue,
  isCatalogProblem as isCatalogProblemValue,
  isUserProblem as isUserProblemValue,
  mergeProblems as mergeProblemsValue,
  mergeProblemStates as mergeProblemStatesValue,
  normalizeCategory as normalizeCategoryValue,
  normalizeLeetcodeHot100Done as normalizeLeetcodeHot100DoneValue,
  normalizeProblem as normalizeProblemValue,
  normalizeProblemState as normalizeProblemStateValue,
  problemStatesFromFavorites as problemStatesFromFavoritesValue
} from './data.js';
import {
  formatProblemTag as formatProblemTagValue,
  getProblemDisplayTitle as getProblemDisplayTitleValue,
  getProblemExcerptText as getProblemExcerptTextValue,
  getProblemMediaMarkdown as getProblemMediaMarkdownValue,
  isDisabledProblemSource as isDisabledProblemSourceValue,
  isHiddenProblemTag as isHiddenProblemTagValue
} from './format.js';
import {
  getCatalogProblems as getCatalogProblemsValue,
  getLeetcodeHotCompletionStats as getLeetcodeHotCompletionStatsValue,
  getProblemCompletionCount as getProblemCompletionCountValue,
  isProblemCompleted as isProblemCompletedValue
} from './progress.js';

export function createProblemProvider(deps = {}) {
  const getState = () => deps.getState?.() || {};
  const getSkillDefs = () => deps.skillDefs || {};

  function getDataDeps() {
    return {
      makeId: deps.makeId,
      stableId: deps.stableId,
      inferSource: deps.inferSource,
      parseTags: deps.parseTags,
      exerciseTitleOverrides: deps.exerciseTitleOverrides,
      normalizeProblemCompanies: deps.normalizeProblemCompanies,
      skillDefs: getSkillDefs(),
      isDisabledProblemSource,
      mergeRecordsById: deps.mergeRecordsById,
      latestIso: deps.latestIso
    };
  }

  function normalizeProblem(raw) {
    return normalizeProblemValue(raw, getDataDeps());
  }

  function isUserProblem(problem) {
    return isUserProblemValue(problem, getDataDeps());
  }

  function isCatalogProblem(problem) {
    return isCatalogProblemValue(problem, getDataDeps());
  }

  function getUserCatalogProblems(problems) {
    return getUserCatalogProblemsValue(problems, getDataDeps());
  }

  function mergeProblems(seed, saved) {
    return mergeProblemsValue(seed, saved, getDataDeps());
  }

  function normalizeProblemState(raw = {}) {
    return normalizeProblemStateValue(raw, getDataDeps());
  }

  function mergeProblemStates(...lists) {
    return mergeProblemStatesValue(lists, getDataDeps());
  }

  function problemStatesFromFavorites(favorites) {
    return problemStatesFromFavoritesValue(favorites, getDataDeps());
  }

  function normalizeLeetcodeHot100Done(value) {
    return normalizeLeetcodeHot100DoneValue(value, deps.leetcodeHot100 || []);
  }

  function getCatalogProblems() {
    return getCatalogProblemsValue(getState().problems, isCatalogProblem);
  }

  function isProblemCompleted(problemId) {
    return isProblemCompletedValue(problemId, deps.getPersonalState);
  }

  function getProblemCompletionCount(problems = getCatalogProblems()) {
    return getProblemCompletionCountValue(problems, deps.getPersonalState);
  }

  function getLeetcodeHotCompletionStats() {
    return getLeetcodeHotCompletionStatsValue(
      normalizeLeetcodeHot100Done(getState().leetcodeHot100Done),
      deps.leetcodeHot100 || []
    );
  }

  function normalizeCategory(category) {
    return normalizeCategoryValue(category, getSkillDefs());
  }

  function formatCategoryLabel(category) {
    return formatCategoryLabelValue(category, getSkillDefs());
  }

  function getProblemDisplayTitle(problem, isEn = deps.getLanguage?.() === "en") {
    return getProblemDisplayTitleValue(problem, {
      isEnglish: isEn,
      formatCategory: formatCategoryLabel,
      t: deps.t
    });
  }

  function getProblemExcerptText(problem, isEn = deps.getLanguage?.() === "en") {
    return getProblemExcerptTextValue(problem, {
      isEnglish: isEn,
      t: deps.t
    });
  }

  function formatProblemTag(tag) {
    return formatProblemTagValue(tag, {
      tagLabels: deps.tagLabels,
      isEnglish: deps.getLanguage?.() === "en"
    });
  }

  function isHiddenProblemTag(tag) {
    return isHiddenProblemTagValue(tag);
  }

  function isDisabledProblemSource(problem) {
    return isDisabledProblemSourceValue(problem, {
      disabledSources: deps.disabledSources,
      disabledBookNames: deps.disabledBookNames,
      parseTags: deps.parseTags
    });
  }

  function getProblemMediaMarkdown(problem, scope = "all") {
    return getProblemMediaMarkdownValue(problem, {
      scope,
      isSafeUrl: deps.isSafeRichMediaUrl
    });
  }

  return {
    formatCategoryLabel,
    formatProblemTag,
    getCatalogProblems,
    getDataDeps,
    getLeetcodeHotCompletionStats,
    getProblemCompletionCount,
    getProblemDisplayTitle,
    getProblemExcerptText,
    getProblemMediaMarkdown,
    getUserCatalogProblems,
    isCatalogProblem,
    isDisabledProblemSource,
    isHiddenProblemTag,
    isProblemCompleted,
    isUserProblem,
    mergeProblemStates,
    mergeProblems,
    normalizeCategory,
    normalizeLeetcodeHot100Done,
    normalizeProblem,
    normalizeProblemState,
    problemStatesFromFavorites
  };
}
