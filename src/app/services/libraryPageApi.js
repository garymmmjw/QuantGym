import {
  formatPdfEmbedUrl,
  getLibraryReaderMeta,
  resolveLibraryReaderUrl,
  toReaderUrl
} from "../../modules/library/readerAccess.js";
import { getLibraryPracticeNavigation } from "../../modules/library/navigation.js";
import { probePdfUrl } from "../../modules/library/readerProbe.js";

export function createLibraryPageApi(deps = {}) {
  let reader = { open: false };

  function isEnglish() {
    return deps.getLanguage?.() === "en";
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
    const continueReading = entries.filter((entry) => hasRead(entry)).slice(0, 7);
    const labels = getLabels();
    const bookCount = allEntries.filter((entry) => entry.kind === "book").length;
    const setCount = allEntries.filter((entry) => entry.kind === "questionSet").length;

    const mapEntry = (entry, compact = false) => ({
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
      cardActionLabel: hasRead(entry) ? labels.read : labels.practice
    });

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
        return { ok: true, external: true, view: getViewModel() };
      }

      const title = getTitle(entry);
      const meta = getLibraryReaderMeta(entry, deps.getLanguage?.());
      reader = {
        open: true,
        isOpening: true,
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
