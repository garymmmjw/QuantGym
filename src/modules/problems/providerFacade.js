export function createProblemProviderFacade(deps = {}) {
  function requireProvider() {
    const provider = deps.getProvider?.();
    if (!provider) throw new Error("Problem provider is not initialized");
    return provider;
  }

  function isEnglish(isEn) {
    return isEn === undefined ? deps.getLanguage?.() === "en" : isEn;
  }

  return {
    getDataDeps() {
      return requireProvider().getDataDeps();
    },
    getUserCatalogProblems(problems) {
      return requireProvider().getUserCatalogProblems(problems);
    },
    mergeProblems(seed, saved) {
      return requireProvider().mergeProblems(seed, saved);
    },
    normalizeLeetcodeHot100Done(value) {
      return requireProvider().normalizeLeetcodeHot100Done(value);
    },
    normalizeProblemState(raw = {}) {
      return requireProvider().normalizeProblemState(raw);
    },
    mergeProblemStates(...lists) {
      return requireProvider().mergeProblemStates(...lists);
    },
    problemStatesFromFavorites(favorites) {
      return requireProvider().problemStatesFromFavorites(favorites);
    },
    getCatalogProblems() {
      return requireProvider().getCatalogProblems();
    },
    isProblemCompleted(problemId) {
      return requireProvider().isProblemCompleted(problemId);
    },
    getProblemCompletionCount(problems) {
      const provider = requireProvider();
      return provider.getProblemCompletionCount(problems === undefined ? provider.getCatalogProblems() : problems);
    },
    getLeetcodeHotCompletionStats() {
      return requireProvider().getLeetcodeHotCompletionStats();
    },
    getProblemDisplayTitle(problem, isEn) {
      return requireProvider().getProblemDisplayTitle(problem, isEnglish(isEn));
    },
    getProblemExcerptText(problem, isEn) {
      return requireProvider().getProblemExcerptText(problem, isEnglish(isEn));
    },
    formatProblemTag(tag) {
      return requireProvider().formatProblemTag(tag);
    },
    isHiddenProblemTag(tag) {
      return requireProvider().isHiddenProblemTag(tag);
    },
    isDisabledProblemSource(problem) {
      return requireProvider().isDisabledProblemSource(problem);
    },
    isCatalogProblem(problem) {
      return requireProvider().isCatalogProblem(problem);
    },
    normalizeProblem(raw) {
      return requireProvider().normalizeProblem(raw);
    },
    isUserProblem(problem) {
      return requireProvider().isUserProblem(problem);
    },
    normalizeCategory(category) {
      return requireProvider().normalizeCategory(category);
    },
    formatCategoryLabel(category) {
      return requireProvider().formatCategoryLabel(category);
    },
    getProblemMediaMarkdown(problem, scope = "all") {
      return requireProvider().getProblemMediaMarkdown(problem, scope);
    }
  };
}
