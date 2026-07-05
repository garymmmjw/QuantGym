import {
  formatPdfEmbedUrl,
  getLibraryReaderMeta,
  resolveLibraryReaderUrl,
  toReaderUrl
} from "../../modules/library/readerAccess.js";
import { getLibraryPracticeNavigation } from "../../modules/library/navigation.js";
import { probePdfUrl } from "../../modules/library/readerProbe.js";

// User decision #8 — self-reported reading progress. The PDF renders inside a
// cross-origin iframe, so the app cannot observe the real page number; the
// reader footer instead lets the user declare "我读到第 N 页 / x%". Records live
// in localStorage keyed by user id + entry id and never pretend to be
// automatic tracking.
const LIBRARY_PROGRESS_KEY_PREFIX = "qgLibraryProgress";

export function createLibraryPageApi(deps = {}) {
  let reader = { open: false };

  function isEnglish() {
    return deps.getLanguage?.() === "en";
  }

  function getProgressStorage() {
    try {
      return (deps.windowRef || globalThis.window)?.localStorage || null;
    } catch {
      return null;
    }
  }

  function getProgressUserId() {
    return deps.appState?.currentUser?.id || "guest";
  }

  function progressStorageKey(entryId) {
    return `${LIBRARY_PROGRESS_KEY_PREFIX}:${getProgressUserId()}:${entryId}`;
  }

  function clampPercent(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(100, Math.max(0, Math.round(num)));
  }

  function getEntryPageCount(entry) {
    const count = Number(entry?.pageCount ?? entry?.pages ?? 0);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }

  function readProgressRecord(entryId) {
    const storage = getProgressStorage();
    if (!storage || !entryId) return null;
    try {
      const raw = storage.getItem(progressStorageKey(entryId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const page = Math.floor(Number(parsed.page));
      const updatedAt = Number(parsed.updatedAt);
      return {
        percent: clampPercent(parsed.percent),
        page: Number.isFinite(page) && page > 0 ? page : 0,
        updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0
      };
    } catch {
      return null;
    }
  }

  function writeProgressRecord(entryId, record) {
    const storage = getProgressStorage();
    if (!storage || !entryId) return null;
    try {
      storage.setItem(progressStorageKey(entryId), JSON.stringify(record));
      return record;
    } catch {
      return null;
    }
  }

  // Reader opened => remember "最近阅读" time while keeping whatever position
  // the user has declared so far.
  function touchProgressRecord(entryId) {
    const existing = readProgressRecord(entryId);
    return writeProgressRecord(entryId, {
      percent: existing?.percent || 0,
      page: existing?.page || 0,
      updatedAt: Date.now()
    });
  }

  function getLabels() {
    const en = isEnglish();
    return {
      book: en ? "Book" : "书籍",
      questionSet: en ? "Question Set" : "题单",
      read: en ? "Read" : "阅读",
      practice: en ? "Practice" : "练题",
      referenceOnly: en ? "Reference only" : "仅作资料入口",
      empty: en ? "No matching items." : "没有匹配内容。",
      books: en ? "Books" : "本书籍",
      sets: en ? "Sets" : "份题单",
      linkedProblems: en ? "Linked Problems" : "关联题目",
      problems: en ? "problems" : "题",
      openNew: en ? "Open" : "新窗口"
    };
  }

  function getTitle(entry) {
    return deps.getLibraryTitle?.(entry, isEnglish()) || entry.titleEn || entry.titleZh || entry.id;
  }

  function getSubtitle(entry) {
    return deps.getLibrarySubtitle?.(entry, isEnglish()) || entry.category || "";
  }

  function getKindLabel(entry) {
    const labels = getLabels();
    return entry.kind === "questionSet" ? labels.questionSet : labels.book;
  }

  function hasRead(entry) {
    return Boolean(entry.readUrl || entry.readAssetId);
  }

  function hasPractice(entry) {
    return Boolean(entry.sourceSlug && entry.problemCount > 0);
  }

  function dispatchModuleNavigation(moduleId) {
    const windowRef = deps.windowRef || globalThis.window;
    const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
    if (!windowRef?.dispatchEvent || !CustomEventCtor) return;
    windowRef.dispatchEvent(new CustomEventCtor("quantgym:navigate-module", {
      detail: { moduleId, replace: false }
    }));
  }

  function openPracticeEntry(entry) {
    if (!entry?.sourceSlug) return false;

    const route = getLibraryPracticeNavigation({
      sourceSlug: entry.sourceSlug,
      problems: deps.getCatalogProblems?.() || [],
      isCatalogProblem: deps.isCatalogProblem
    });

    const filters = route.ok
      ? route.filters
      : {
        source: entry.sourceSlug,
        company: "all",
        theme: "all",
        difficulty: "all",
        viewMode: "all",
        detailId: ""
      };

    if (deps.setProblemFilterState) {
      deps.setProblemFilterState(filters);
      deps.setProblemPage?.(1);
      deps.setProblemDetailId?.("");
      deps.setProblemSearchQuery?.("");
      if (deps.elements?.problemSearch) deps.elements.problemSearch.value = "";
      dispatchModuleNavigation("problems");
      deps.switchModule?.("problems");
      deps.renderProblems?.();
      return true;
    }

    deps.openLibraryPractice?.(entry.sourceSlug);
    return route.ok;
  }

  function getViewModel() {
    const allEntries = deps.getLibraryEntries?.() || [];
    const entries = deps.getVisibleLibraryEntries?.() || [];
    const books = entries.filter((entry) => entry.kind === "book");
    const questionSets = entries.filter((entry) => entry.kind === "questionSet");
    // 继续阅读 = entries this user actually opened/marked (real localStorage
    // records), most recent first — not just "everything readable".
    const continueReading = entries
      .map((entry) => ({ entry, record: readProgressRecord(entry.id) }))
      .filter(({ entry, record }) => hasRead(entry) && record && record.updatedAt > 0)
      .sort((a, b) => b.record.updatedAt - a.record.updatedAt)
      .slice(0, 7)
      .map(({ entry }) => entry);
    const labels = getLabels();
    const bookCount = allEntries.filter((entry) => entry.kind === "book").length;
    const setCount = allEntries.filter((entry) => entry.kind === "questionSet").length;

    const mapEntry = (entry, compact = false) => {
      const record = readProgressRecord(entry.id);
      return {
        id: entry.id,
        kind: entry.kind,
        compact,
        title: getTitle(entry),
        subtitle: getSubtitle(entry),
        kindLabel: getKindLabel(entry),
        coverUrl: entry.coverUrl || "assets/generated/brand-q-mark.webp?v=premium-system-2",
        category: entry.category || "Quant",
        language: entry.language || "EN + ZH",
        problemCount: entry.problemCount || 0,
        readable: hasRead(entry),
        practicable: hasPractice(entry),
        defaultAction: hasRead(entry) ? "read" : "practice",
        cardActionLabel: hasRead(entry) ? labels.read : labels.practice,
        // Self-reported progress (user decision #8): percent 0-100 declared by
        // the user in the reader footer; 0 means "no declared position yet".
        progress: record?.percent || 0,
        progressPage: record?.page || 0,
        pageCount: getEntryPageCount(entry),
        lastReadAt: record?.updatedAt || 0
      };
    };

    return {
      kindFilter: deps.libraryFilterState?.getKind?.() || "all",
      query: deps.libraryFilterState?.getQuery?.() || "",
      stats: {
        bookCount,
        setCount,
        totalProblems: deps.getTotalProblems?.() || 0
      },
      labels,
      continueReading: continueReading.map((entry) => mapEntry(entry, true)),
      books: books.map((entry) => mapEntry(entry, false)),
      questionSets: questionSets.map((entry) => mapEntry(entry, false)),
      isEmpty: entries.length === 0,
      reader
    };
  }

  return {
    getViewModel,

    setQuery(value) {
      deps.libraryFilterState?.setQuery?.(value);
      return getViewModel();
    },

    setKindFilter(value) {
      deps.libraryFilterState?.setKind?.(value);
      return getViewModel();
    },

    async openReader(entryId) {
      const entry = (deps.getLibraryEntries?.() || []).find((item) => item.id === entryId);
      if (!entry) return { ok: false, view: getViewModel() };
      if (!hasRead(entry)) {
        if (hasPractice(entry)) {
          return { ok: openPracticeEntry(entry), view: getViewModel() };
        }
        return { ok: false, view: getViewModel() };
      }

      if (entry.readType === "external") {
        window.open(toReaderUrl(entry.readUrl), "_blank", "noopener,noreferrer");
        // External reads still count as "最近阅读" for the continue rail.
        touchProgressRecord(entry.id);
        return { ok: true, external: true, view: getViewModel() };
      }

      const title = getTitle(entry);
      const meta = getLibraryReaderMeta(entry, deps.getLanguage?.());
      reader = {
        open: true,
        isOpening: true,
        entryId: entry.id,
        pageCount: getEntryPageCount(entry),
        progress: readProgressRecord(entry.id) || { percent: 0, page: 0, updatedAt: 0 },
        title,
        meta,
        coverUrl: entry.coverUrl || "",
        readType: entry.readType || "pdf",
        openUrl: "#",
        embedUrl: "about:blank"
      };

      try {
        const url = await resolveLibraryReaderUrl(entry, {
          language: deps.getLanguage?.(),
          canUseCloud: deps.canUseCloud,
          cloudApi: deps.cloudApi,
          getCloudApiBase: deps.getCloudApiBase
        });
        if (entry.readType === "pdf") {
          await probePdfUrl(url, { language: deps.getLanguage?.() });
        }
        reader = {
          ...reader,
          isOpening: false,
          openUrl: url,
          embedUrl: entry.readType === "pdf" ? formatPdfEmbedUrl(url) : url
        };
        // Successful open => record "最近阅读" timestamp (position stays as the
        // user last declared it).
        const touched = touchProgressRecord(entry.id);
        if (touched) reader = { ...reader, progress: touched };
      } catch (error) {
        reader = { open: false };
        return {
          ok: false,
          message: error?.message || (isEnglish() ? "Unable to open this PDF." : "暂时无法打开这本 PDF。"),
          view: getViewModel()
        };
      }

      return { ok: true, view: getViewModel() };
    },

    closeReader() {
      reader = { open: false };
      return getViewModel();
    },

    // User declares "我读到第 N 页" (books with a page count) or a percent
    // (everything else). Persists to localStorage under user id + entry id.
    setReadingProgress(entryId, { percent, page } = {}) {
      const entry = (deps.getLibraryEntries?.() || []).find((item) => item.id === entryId);
      if (!entry) return { ok: false, view: getViewModel() };
      const pageCount = getEntryPageCount(entry);
      let nextPage = 0;
      let nextPercent = clampPercent(percent);
      const parsedPage = Math.floor(Number(page));
      if (pageCount > 0 && Number.isFinite(parsedPage) && parsedPage > 0) {
        nextPage = Math.min(pageCount, parsedPage);
        nextPercent = clampPercent((nextPage / pageCount) * 100);
      }
      const record = writeProgressRecord(entryId, {
        percent: nextPercent,
        page: nextPage,
        updatedAt: Date.now()
      });
      if (!record) return { ok: false, view: getViewModel() };
      if (reader.open && reader.entryId === entryId) {
        reader = { ...reader, progress: record };
      }
      return { ok: true, progress: record, view: getViewModel() };
    },

    getReadingProgress(entryId) {
      return readProgressRecord(entryId);
    },

    openPractice(sourceSlug) {
      const entry = (deps.getLibraryEntries?.() || []).find((item) => item.sourceSlug === sourceSlug);
      return openPracticeEntry(entry || { sourceSlug });
    },

    async handleCardAction(entryId, action) {
      const entry = (deps.getLibraryEntries?.() || []).find((item) => item.id === entryId);
      if (!entry) return { ok: false, view: getViewModel() };
      if (action === "practice" || (!hasRead(entry) && hasPractice(entry))) {
        return { ok: openPracticeEntry(entry), view: getViewModel() };
      }
      return this.openReader(entryId);
    }
  };
}
