import { normalizeSearchQuery } from '../../lib/text.js';
import {
  getLibraryEntries,
  getLibrarySearchText,
  getLibrarySourceLabel,
  getLibrarySubtitle,
  getLibraryTitle
} from './data.js';
import {
  getLibraryPracticeNavigation,
  getVisibleLibraryEntriesForState
} from './navigation.js';

export function createLibraryProvider(deps = {}) {
  function getEntries() {
    return getLibraryEntries(deps.catalog || []);
  }

  function getTitle(entry, preferEnglish = deps.getLanguage?.() === "en") {
    return getLibraryTitle(entry, preferEnglish);
  }

  function getSubtitle(entry, preferEnglish = deps.getLanguage?.() === "en") {
    return getLibrarySubtitle(entry, preferEnglish);
  }

  function getSearchText(entry) {
    return getLibrarySearchText(entry);
  }

  function getVisibleEntries() {
    const filters = deps.getFilterState?.() || {};
    const query = filters.query || normalizeSearchQuery(deps.getSearchValue?.() || "");
    return getVisibleLibraryEntriesForState({
      catalog: deps.catalog || [],
      kindFilter: filters.kind,
      query
    });
  }

  function getSourceLabel(sourceSlug) {
    return getLibrarySourceLabel(sourceSlug, getEntries(), deps.getLanguage?.() === "en");
  }

  function openPractice(sourceSlug) {
    const route = getLibraryPracticeNavigation({
      sourceSlug,
      problems: deps.getProblems?.() || [],
      isCatalogProblem: deps.isCatalogProblem
    });
    if (!route.ok) return false;
    deps.applyProblemNavigationFilters?.(route.filters);
    deps.resetProblemPagination?.();
    deps.clearProblemSearch?.();
    deps.closeReader?.();
    deps.switchModule?.("problems");
    deps.renderProblems?.();
    return true;
  }

  return {
    getEntries,
    getSearchText,
    getSourceLabel,
    getSubtitle,
    getTitle,
    getVisibleEntries,
    openPractice
  };
}
