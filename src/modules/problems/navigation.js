export function getProblemNavigationSequence(problems = [], options = {}) {
  const sequence = Array.isArray(problems) ? problems : [];
  if (options.viewMode === "ranking" && typeof options.compare === "function") {
    return [...sequence].sort(options.compare);
  }
  return sequence;
}

export function getCompanyProblemNavigation(company) {
  if (!company?.slug) return { ok: false };
  return {
    ok: true,
    filters: {
      company: company.slug,
      source: "all",
      viewMode: "all",
      detailId: ""
    }
  };
}

export function getProblemSearchNavigation() {
  return {
    ok: true,
    filters: {
      detailId: "",
      viewMode: "all",
      company: "all",
      source: "all"
    }
  };
}

export function getProblemDetailNavigation(problemId, options = {}) {
  let sequence = Array.isArray(options.sequence) ? options.sequence : [];
  let index = sequence.findIndex((item) => item.id === problemId);
  if (index < 0) {
    sequence = Array.isArray(options.fallbackSequence) ? options.fallbackSequence : [];
    index = sequence.findIndex((item) => item.id === problemId);
  }
  return {
    index,
    total: sequence.length,
    previous: index > 0 ? sequence[index - 1] : null,
    next: index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null
  };
}

export function resetProblemDetailReveals(revealState) {
  revealState?.clear?.();
}

export function getProblemDetailRevealKey(problemId, blockKey) {
  return `${problemId}:${blockKey}`;
}

export function isProblemDetailBlockRevealed(revealState, problemId, blockKey) {
  return Boolean(revealState?.has?.(getProblemDetailRevealKey(problemId, blockKey)));
}

export function revealProblemDetailBlock(revealState, problemId, blockKey) {
  revealState?.add?.(getProblemDetailRevealKey(problemId, blockKey));
}
