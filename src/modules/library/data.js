import {
  matchesNormalizedText,
  normalizeSearchFields,
  normalizeSearchQuery
} from '../../lib/text.js';

export function getLibraryEntries(catalog = []) {
  return (Array.isArray(catalog) ? catalog : [])
    .filter((entry) => entry && entry.id !== "question-bank")
    .map((entry) => ({
      ...entry,
      kind: entry.kind === "questionSet" ? "questionSet" : "book",
      problemCount: Math.max(0, Number(entry.problemCount || 0))
    }));
}

export function normalizeLibraryKindFilter(value = "all") {
  return ["book", "questionSet"].includes(value) ? value : "all";
}

export function createLibraryFilterState(initialState = {}) {
  let state = {
    kind: normalizeLibraryKindFilter(initialState.kind),
    query: normalizeSearchQuery(initialState.query || "")
  };
  const snapshot = () => ({ ...state });

  return {
    getState() {
      return snapshot();
    },
    getKind() {
      return state.kind;
    },
    setKind(value) {
      state = { ...state, kind: normalizeLibraryKindFilter(value) };
      return state.kind;
    },
    getQuery() {
      return state.query;
    },
    setQuery(value) {
      state = { ...state, query: normalizeSearchQuery(value || "") };
      return state.query;
    }
  };
}

export function getLibraryTitle(entry = {}, preferEnglish = true) {
  if (preferEnglish) return entry.titleEn || entry.titleZh || entry.id;
  return entry.titleZh || entry.titleEn || entry.id;
}

export function getLibrarySubtitle(entry = {}, preferEnglish = true) {
  return preferEnglish ? (entry.titleZh || entry.category || "") : (entry.titleEn || entry.category || "");
}

export function getLibrarySearchText(entry = {}) {
  return normalizeSearchFields([
    entry.id,
    entry.kind,
    entry.titleZh,
    entry.titleEn,
    entry.sourceSlug,
    entry.category,
    entry.language,
    Array.isArray(entry.tags) ? entry.tags.join(" ") : ""
  ]);
}

export function getVisibleLibraryEntries(entries = [], options = {}) {
  const kindFilter = ["book", "questionSet"].includes(options.kindFilter) ? options.kindFilter : "all";
  const query = normalizeSearchQuery(options.query || "");
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => kindFilter === "all" || entry.kind === kindFilter)
    .filter((entry) => !query || matchesNormalizedText(getLibrarySearchText(entry), query));
}

export function getLibrarySourceLabel(sourceSlug, entries = [], preferEnglish = true) {
  const entry = (Array.isArray(entries) ? entries : []).find((item) => item.sourceSlug === sourceSlug);
  return entry ? getLibraryTitle(entry, preferEnglish) : sourceSlug;
}
