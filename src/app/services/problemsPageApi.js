import { leetcodeHot100 } from "../../constants.js";
import {
  buildProblemProgressItems,
  getProblemCollectionClickResult,
  getProblemCollectionEntries,
  getProblemThemeEntries
} from "../../modules/problems/collections.js";
import { getProblemFilterScopes } from "../../modules/problems/filters.js";
import {
  cleanProblemTagValue,
  difficultyClass,
  formatProblemCardPreview,
  getLocalizedProblemField,
  normalizeDifficultyFilter
} from "../../modules/problems/format.js";
import { getProblemFilterActionState } from "../../modules/problems/filterState.js";
import { getProblemEmptyText, getProblemListPage } from "../../modules/problems/list.js";
import { getProblemDetailNavigation } from "../../modules/problems/navigation.js";
import {
  compareProblemsByPopularity,
  getProblemPopularityScore
} from "../../modules/problems/ranking.js";
import {
  createProblemSearchRecord,
  getProblemBrowserMatches as getProblemBrowserMatchesForState
} from "../../modules/problems/search.js";
import { getProblemBrowserViewState } from "../../modules/problems/viewState.js";

export function createProblemsPageApi(deps = {}) {
  let searchQuery = "";
  let leetcodeHotExpanded = Boolean(deps.isLeetcodeHotExpanded?.());
  let chromeCache = null;

  function getState() {
    return deps.getState?.() || deps.userState?.value || {};
  }

  function getProblems() {
    const stateProblems = getState().problems;
    if (Array.isArray(stateProblems) && stateProblems.length) return stateProblems;
    const catalogProblems = deps.getCatalogProblems?.();
    return Array.isArray(catalogProblems) ? catalogProblems : [];
  }

  function getLeetcodeHotItems() {
    const runtimeWindow = globalThis.window || {};
    const runtimeHot = globalThis.leetcodeHot100 || runtimeWindow.leetcodeHot100;
    const runtimeItems = Array.isArray(runtimeHot?.problems) ? runtimeHot.problems : [];
    if (runtimeItems.length) return runtimeItems;
    if (Array.isArray(deps.leetcodeHotItems) && deps.leetcodeHotItems.length) return deps.leetcodeHotItems;
    if (Array.isArray(leetcodeHot100) && leetcodeHot100.length) return leetcodeHot100;
    return [];
  }

  function getLeetcodeHotStats(hotItems = getLeetcodeHotItems()) {
    const stats = deps.getLeetcodeHotCompletionStats?.() || {};
    return {
      done: Math.max(0, Number(stats.done || 0)),
      total: Math.max(0, Number(stats.total || 0)) || hotItems.length || 100
    };
  }

  function isLeetcodeHotExpanded() {
    return leetcodeHotExpanded || Boolean(deps.isLeetcodeHotExpanded?.());
  }

  function setLeetcodeHotExpanded(value) {
    leetcodeHotExpanded = Boolean(value);
    deps.setLeetcodeHotExpanded?.(leetcodeHotExpanded);
    chromeCache = null;
    return leetcodeHotExpanded;
  }

  function getSearchOptions() {
    return {
      cache: deps.problemSearchRecordCache,
      tagLabels: deps.problemTagLabels,
      getCompanies: deps.getProblemCompanies,
      getCompanyAliases: deps.getCompanyAliases,
      getDisplayTitle: getProblemTitle
    };
  }

  function nowMs() {
    return deps.windowRef?.performance?.now?.()
      || globalThis.performance?.now?.()
      || Date.now();
  }

  function prewarmSearchIndex(options = {}) {
    const problems = getProblems();
    const total = problems.length;
    const budgetMs = Math.max(1, Number(options.budgetMs || 6));
    const maxItems = Math.max(1, Number(options.maxItems || 180));
    const startedAt = nowMs();
    const searchOptions = getSearchOptions();
    let index = Math.max(0, Number(options.startIndex || 0));
    let processed = 0;

    while (index < total && processed < maxItems && nowMs() - startedAt < budgetMs) {
      const problem = problems[index];
      index += 1;
      if (deps.isCatalogProblem?.(problem) ?? true) {
        createProblemSearchRecord(problem, searchOptions);
      }
      processed += 1;
    }

    return {
      done: index >= total,
      nextIndex: index,
      processed,
      total
    };
  }

  function getMatches(options = {}) {
    const filters = deps.getProblemFilterState?.() || {};
    return getProblemBrowserMatchesForState({
      problems: getProblems(),
      query: searchQuery,
      forceAllView: Boolean(options.forceAllView),
      viewMode: filters.viewMode,
      filters: {
        source: filters.source,
        company: filters.company,
        theme: filters.theme,
        difficulty: filters.difficulty
      },
      predicates: {
        isCatalogProblem: deps.isCatalogProblem,
        matchesSource: deps.problemMatchesSource,
        matchesCompany: deps.problemMatchesCompany,
        matchesTheme: deps.problemMatchesTheme,
        matchesDifficulty: deps.problemMatchesDifficulty
      },
      getPersonalState: deps.getProblemPersonalState,
      isEnglish: deps.getLanguage?.() === "en",
      locale: deps.getLocale?.(),
      searchOptions: getSearchOptions()
    });
  }

  function openDetailInModel(problemId) {
    if (deps.setProblemDetailId && getProblems().some((problem) => problem.id === problemId && (deps.isCatalogProblem?.(problem) ?? true))) {
      deps.setProblemDetailId(problemId);
      return true;
    }
    deps.openProblemDetail?.(problemId);
    return false;
  }

  function getProblemTitle(problem, isEnglish) {
    return deps.getProblemDisplayTitle?.(problem, isEnglish)
      || (isEnglish ? problem?.titleEn || problem?.titleZh : problem?.titleZh || problem?.titleEn)
      || deps.t?.("problemTitle")
      || "题目";
  }

  function syncElements() {
    deps.rebindElements?.();
    const els = deps.elements || {};
    if (els.problemSearch) els.problemSearch.value = searchQuery;
  }

  function sync(options = {}) {
    syncElements();
    if (options.legacyRender) {
      deps.renderProblems?.({
        reactList: options.reactList !== false,
        reactRanking: options.reactRanking !== false,
        reactDetail: options.reactDetail !== false,
        reactChrome: options.reactChrome !== false,
        reactPagination: options.reactPagination !== false,
        ...options
      });
    }
    deps.refreshIcons?.();
  }

  function buildChrome(filters, isEnglish, t) {
    const state = getState();
    const problems = getProblems();
    const catalogProblems = problems.filter((problem) => deps.isCatalogProblem?.(problem) ?? true);
    const scopes = getProblemFilterScopes(problems, {
      source: filters.source,
      company: filters.company
    }, {
      isCatalogProblem: deps.isCatalogProblem,
      matchesSource: deps.problemMatchesSource,
      matchesCompany: deps.problemMatchesCompany
    });
    const themeProblems = scopes.companyProblems;
    const themeEntryOptions = {
      skillDefs: deps.skillDefs,
      normalizeCategory: deps.normalizeCategory
    };
    const buildThemeEntries = deps.getProblemThemeEntries || getProblemThemeEntries;
    const themeEntries = [
      { key: "all", label: isEnglish ? "All themes" : "全部主题", count: themeProblems.length },
      ...buildThemeEntries(scopes.sourceProblems, themeEntryOptions)
    ];
    const activeTheme = themeEntries.find((item) => item.key === filters.theme) || themeEntries[0];
    const activeThemeProblems = themeProblems.filter((problem) => (
      deps.problemMatchesTheme?.(problem, filters.theme) ?? (!filters.theme || filters.theme === "all" || problem.category === filters.theme)
    ));
    const difficultyEntries = [
      { key: "all", label: t?.("problemDifficultyAll") || "All", count: activeThemeProblems.length },
      { key: "easy", label: "Easy", count: activeThemeProblems.filter((p) => difficultyClass(p.difficulty) === "easy").length },
      { key: "medium", label: "Medium", count: activeThemeProblems.filter((p) => difficultyClass(p.difficulty) === "medium").length },
      { key: "hard", label: "Hard", count: activeThemeProblems.filter((p) => difficultyClass(p.difficulty) === "hard").length }
    ].map((entry) => ({
      ...entry,
      title: isEnglish ? `${entry.count} problems` : `${entry.count} 题`
    }));
    const sourceActive = Boolean(filters.source && filters.source !== "all");
    const socialNotice = deps.getProblemSocialNotice?.() || "";
    const sourceText = sourceActive
      ? (isEnglish ? `Source: ${deps.getProblemSourceLabel?.(filters.source)}` : `题源：${deps.getProblemSourceLabel?.(filters.source)}`)
      : "";
    const hotItems = getLeetcodeHotItems();
    const getHotStats = () => getLeetcodeHotStats(hotItems);
    const collectionEntryOptions = {
      problems: catalogProblems,
      isEnglish,
      normalizeCategory: deps.normalizeCategory,
      matchesSource: deps.problemMatchesSource,
      getCompletionCount: deps.getProblemCompletionCount,
      getHotStats
    };
    const buildCollectionEntries = deps.getProblemCollectionEntries || getProblemCollectionEntries;
    const collectionEntries = buildCollectionEntries(collectionEntryOptions);
    const leetcodeExpanded = isLeetcodeHotExpanded();
    const doneIds = deps.normalizeLeetcodeHot100Done?.(state.leetcodeHot100Done, hotItems) || state.leetcodeHot100Done || [];
    const progressItemOptions = {
      problems: scopes.sourceProblems,
      activeTheme: filters.theme,
      isEnglish,
      normalizeCategory: deps.normalizeCategory,
      formatCategory: deps.formatCategoryLabel,
      getCompletionCount: deps.getProblemCompletionCount,
      getHotStats,
      themeEntries: themeEntries.slice(1)
    };
    const buildProgressItems = deps.buildProblemProgressItems || buildProblemProgressItems;
    const progressItems = buildProgressItems(progressItemOptions).slice(0, 8);
    const companies = deps.companyDefs || [];
    const tierWeight = deps.companyTierWeight || (() => 5);
    const companyEntries = companies
      .map((company) => ({
        company: {
          ...company,
          focus: (company.focus || []).slice(0, 2)
        },
        stats: deps.getCompanyProblemStats?.(company, scopes.sourceProblems) || { total: 0, percent: 0 }
      }))
      .filter((entry) => entry.stats.total > 0)
      .sort((left, right) => (
        tierWeight(left.company.tier) - tierWeight(right.company.tier)
        || right.stats.total - left.stats.total
        || left.company.name.localeCompare(right.company.name)
      ));
    const taggedTotal = companyEntries.reduce((sum, entry) => sum + entry.stats.total, 0);

    return {
      toolbar: {
        interactionStatus: [sourceText, socialNotice].filter(Boolean).join(" · "),
        showSourceClear: sourceActive
      },
      collections: {
        entries: collectionEntries,
        leetcodeExpanded,
        leetcode: {
          items: hotItems,
          doneIds: Array.isArray(doneIds) ? doneIds : [],
          emptyText: isEnglish ? "Hot 100 data is not available." : "Hot 100 数据暂不可用。"
        }
      },
      theme: {
        entries: themeEntries,
        active: filters.theme || "all",
        summary: `${activeTheme?.label || ""} · ${activeTheme?.count || 0} ${isEnglish ? "problems" : "题"}`
      },
      difficulty: {
        entries: difficultyEntries,
        active: normalizeDifficultyFilter(filters.difficulty)
      },
      companies: {
        title: isEnglish ? "Prepare by Company" : "按公司刷题",
        summary: isEnglish
          ? `${companyEntries.length} firms · ${taggedTotal} tagged questions from real interview sources`
          : `${companyEntries.length} 家公司 · ${taggedTotal} 道真实题源标注题`,
        entries: companyEntries,
        activeCompany: filters.company || "all",
        showClear: filters.company && filters.company !== "all"
      },
      progress: progressItems
    };
  }

  function getChromeSignature(filters = {}, isEnglish = false, t = null) {
    const state = getState();
    return {
      problems: getProblems(),
      problemStates: state.problemStates,
      leetcodeHot100Done: state.leetcodeHot100Done,
      hotItems: getLeetcodeHotItems(),
      companyDefs: deps.companyDefs,
      skillDefs: deps.skillDefs,
      source: filters.source || "all",
      company: filters.company || "all",
      theme: filters.theme || "all",
      difficulty: filters.difficulty || "all",
      leetcodeExpanded: isLeetcodeHotExpanded(),
      socialNotice: deps.getProblemSocialNotice?.() || "",
      isEnglish,
      t
    };
  }

  function isSameChromeSignature(left, right) {
    return Boolean(left && right)
      && left.problems === right.problems
      && left.problemStates === right.problemStates
      && left.leetcodeHot100Done === right.leetcodeHot100Done
      && left.hotItems === right.hotItems
      && left.companyDefs === right.companyDefs
      && left.skillDefs === right.skillDefs
      && left.source === right.source
      && left.company === right.company
      && left.theme === right.theme
      && left.difficulty === right.difficulty
      && left.leetcodeExpanded === right.leetcodeExpanded
      && left.socialNotice === right.socialNotice
      && left.isEnglish === right.isEnglish
      && left.t === right.t;
  }

  function getChrome(filters, isEnglish, t) {
    const signature = getChromeSignature(filters, isEnglish, t);
    if (chromeCache && isSameChromeSignature(chromeCache.signature, signature)) {
      return chromeCache.chrome;
    }
    const chrome = buildChrome(filters, isEnglish, t);
    chromeCache = { signature, chrome };
    return chrome;
  }

  function withChrome(view, filters, isEnglish, t) {
    const chrome = getChrome(filters, isEnglish, t);
    if (view.mode === "list" && view.list) {
      const { totalProblems, totalPages, page, pageSize } = view.list;
      view.list.pagination = {
        visible: totalProblems > pageSize,
        page,
        totalPages,
        totalProblems,
        pageSize,
        summary: isEnglish
          ? `Page ${page} / ${totalPages} · ${totalProblems} problems`
          : `第 ${page} / ${totalPages} 页 · 共 ${totalProblems} 题`
      };
    }
    return { ...view, chrome };
  }

  function buildDetailModel(problem, isEnglish, navigation = null) {
    const personal = deps.getProblemPersonalState?.(problem.id) || {};
    const social = deps.getProblemSocial?.(problem.id) || { comments: [], likeCount: 0, liked: false };
    const detailNavigation = navigation || {};
    const titleZh = String(problem.titleZh || "").trim();
    const titleEn = String(problem.titleEn || "").trim();
    const title = isEnglish
      ? deps.getProblemDisplayTitle?.(problem, true) || titleEn || titleZh
      : titleZh && titleEn && cleanProblemTagValue(titleZh) !== cleanProblemTagValue(titleEn)
        ? `${titleZh} / ${titleEn}`
        : titleZh || titleEn;

    const meta = [
      deps.formatCategoryLabel?.(problem.category) || problem.category,
      problem.difficulty,
      ...(problem.tags || []).slice(0, 5).map((tag) => deps.formatProblemTag?.(tag) || tag)
    ].filter(Boolean);

    const questionContent = [
      (isEnglish ? problem.promptEn || problem.promptZh : problem.promptZh || problem.promptEn) || deps.t?.("noPrompt"),
      deps.getProblemMediaMarkdown?.(problem, "prompt")
    ].filter(Boolean).join("\n\n");

    const hintContent = getLocalizedProblemField(problem, "hint", isEnglish) || deps.t?.("noHint");
    const answerParts = [
      getLocalizedProblemField(problem, "answer", isEnglish),
      getLocalizedProblemField(problem, "explanation", isEnglish),
      deps.getProblemMediaMarkdown?.(problem, "answer")
    ].filter(Boolean);
    const answerContent = answerParts.length ? answerParts.join("\n\n") : deps.t?.("noAnswer");

    return {
      id: problem.id,
      title,
      meta,
      question: questionContent,
      hint: hintContent,
      answer: answerContent,
      hintRevealed: Boolean(deps.isProblemDetailBlockRevealed?.(problem.id, "hint")),
      answerRevealed: Boolean(deps.isProblemDetailBlockRevealed?.(problem.id, "answer")),
      completed: Boolean(personal.completed),
      favorite: Boolean(personal.favorite),
      social: {
        liked: Boolean(social.liked),
        likeCount: Number(social.likeCount || 0),
        comments: Array.isArray(social.comments) ? social.comments : []
      },
      socialNotice: deps.getProblemSocialNotice?.() || "",
      navigation: {
        index: detailNavigation.index ?? -1,
        total: detailNavigation.total ?? 0,
        previousId: detailNavigation.previous?.id || "",
        nextId: detailNavigation.next?.id || ""
      }
    };
  }

  function getViewModel() {
    const isEnglish = deps.getLanguage?.() === "en";
    const t = deps.t;
    const filters = deps.getProblemFilterState?.() || {};
    const problems = getProblems();
    const viewState = getProblemBrowserViewState({
      selectedDetailId: deps.getProblemDetailId?.() || "",
      problems,
      viewMode: filters.viewMode,
      isCatalogProblem: deps.isCatalogProblem
    });
    const matches = getMatches();

    if (viewState.mode === "detail" && viewState.selected) {
      const navigation = getProblemDetailNavigation(viewState.selected.id, {
        sequence: matches,
        fallbackSequence: problems.filter((problem) => deps.isCatalogProblem?.(problem) ?? true)
      });
      return withChrome({
        mode: "detail",
        filters,
        list: null,
        ranking: null,
        detail: buildDetailModel(viewState.selected, isEnglish, navigation),
        isEnglish,
        t
      }, filters, isEnglish, t);
    }

    if (viewState.mode === "ranking") {
      const ranked = [...matches]
        .sort((left, right) => compareProblemsByPopularity(left, right, {
          getSocial: (problemId) => deps.getProblemSocial?.(problemId) || {},
          getTitle: (problem) => getProblemTitle(problem, isEnglish),
          locale: deps.getLocale?.() || "en"
        }))
        .slice(0, 50)
        .map((problem) => {
          const social = deps.getProblemSocial?.(problem.id) || {};
          return {
            id: problem.id,
            title: getProblemTitle(problem, isEnglish),
            meta: `${deps.formatCategoryLabel?.(problem.category) || problem.category} · ${problem.difficulty}`,
            social: {
              likeCount: Number(social.likeCount || 0),
              commentCount: Number(social.commentCount || 0)
            },
            popularity: getProblemPopularityScore(social)
          };
        });

      return withChrome({
        mode: "ranking",
        filters,
        list: null,
        ranking: {
          items: ranked,
          emptyText: ranked.length ? "" : t?.("problemEmpty")
        },
        detail: null,
        isEnglish,
        t
      }, filters, isEnglish, t);
    }

    const page = deps.getProblemPage?.() || 1;
    const pageSize = Math.max(1, Number(deps.problemPageSize || 24));
    const listPage = getProblemListPage(matches, {
      viewMode: filters.viewMode,
      page,
      pageSize,
      getPersonalState: (problemId) => deps.getProblemPersonalState?.(problemId) || {}
    });

    const items = listPage.visibleProblems.map((problem) => {
      const personal = deps.getProblemPersonalState?.(problem.id) || {};
      const social = deps.getProblemSocial?.(problem.id) || {};
      const tags = (problem.tags || [])
        .filter((tag) => !deps.isHiddenProblemTag?.(tag)
          && cleanProblemTagValue(tag) !== cleanProblemTagValue(problem.bookName))
        .slice(0, 2)
        .map((tag) => deps.formatProblemTag?.(tag) || tag);

      return {
        id: problem.id,
        title: getProblemTitle(problem, isEnglish),
        preview: formatProblemCardPreview(deps.getProblemExcerptText?.(problem, isEnglish) || ""),
        bookName: problem.bookName || "",
        companies: (deps.getProblemCompanies?.(problem) || []).slice(0, 2),
        category: deps.formatCategoryLabel?.(problem.category) || problem.category,
        difficulty: problem.difficulty,
        difficultyClass: difficultyClass(problem.difficulty),
        tags,
        completed: Boolean(personal.completed),
        favorite: Boolean(personal.favorite),
        likeCount: Number(social.likeCount || 0),
        commentCount: Number(social.commentCount || 0),
        lastScore: personal.lastScore
      };
    });

    return withChrome({
      mode: "list",
      filters,
      list: {
        items,
        emptyText: listPage.totalProblems
          ? ""
          : getProblemEmptyText({
            emptyKind: listPage.emptyKind,
            isEnglish,
            t
          }),
        totalProblems: listPage.totalProblems,
        totalPages: listPage.totalPages,
        page: listPage.page,
        pageSize
      },
      ranking: null,
      detail: null,
      isEnglish,
      t
    }, filters, isEnglish, t);
  }

  return {
    getSearchQuery: () => searchQuery,
    getSearchDebounceMs: () => Math.max(0, Number(deps.searchDebounceMs ?? 140)),
    getViewModel,
    prewarmSearchIndex,

    mountRichText(node, text) {
      deps.renderRichText?.(node, text);
      deps.scheduleMathTypeset?.(node);
    },

    setSearchQuery(value) {
      searchQuery = String(value || "");
      syncElements();
      deps.setProblemPage?.(1);
      deps.setProblemDetailId?.("");
      return searchQuery;
    },

    handleSearchKeydown(event) {
      syncElements();
      if (event?.key === "Enter") {
        const firstMatch = getMatches({ forceAllView: true })[0];
        if (firstMatch) {
          event.preventDefault?.();
          openDetailInModel(firstMatch.id);
        }
      } else {
        deps.handleProblemSearchKeydown?.(event);
      }
      sync();
    },

    applyFilterAction(action) {
      const result = getProblemFilterActionState(deps.getProblemFilterState?.() || {}, action);
      if (deps.setProblemFilterState) {
        deps.setProblemFilterState(result.state);
      } else {
        deps.applyProblemFilterAction?.(action);
      }
      if (result.resetPagination) deps.setProblemPage?.(1);
      if (result.returnToList) deps.setProblemDetailId?.("");
      sync();
    },

    handleCollectionClick(event) {
      const button = event?.currentTarget || event?.target?.closest?.("[data-problem-collection]");
      const collectionId = button?.dataset?.problemCollection || "";
      const result = getProblemCollectionClickResult(collectionId, getViewModel().chrome?.collections?.entries || [], {
        leetcodeExpanded: isLeetcodeHotExpanded()
      });
      if (!result.ok) return;
      if (result.mode === "leetcode") {
        setLeetcodeHotExpanded(result.leetcodeExpanded);
      } else if (deps.setProblemFilterState) {
        deps.setProblemFilterState(result.filters);
        deps.setProblemPage?.(1);
        deps.setProblemDetailId?.("");
        searchQuery = "";
        syncElements();
      } else {
        deps.handleProblemCollectionClick?.(event);
      }
      sync();
    },

    openDetail(problemId) {
      openDetailInModel(problemId);
      sync();
    },

    returnToList() {
      if (deps.setProblemDetailId) {
        deps.setProblemDetailId("");
      } else {
        deps.returnToProblemList?.();
      }
      sync();
    },

    toggleCompleted(problemId) {
      deps.toggleProblemCompleted?.(problemId);
      sync();
    },

    toggleSaved(problemId) {
      deps.toggleProblemSaved?.(problemId);
      sync();
    },

    revealBlock(problemId, blockKey) {
      deps.revealProblemDetailBlock?.(problemId, blockKey);
      sync();
    },

    toggleLike(problemId) {
      deps.toggleProblemLike?.(problemId);
      sync();
    },

    postComment(problemId, text) {
      deps.postProblemComment?.(problemId, text);
      sync();
    },

    deleteComment(problemId, commentId) {
      deps.deleteProblemComment?.(problemId, commentId);
      sync();
    },

    selectForInterview(problemId) {
      deps.selectProblemForInterview?.(problemId);
      sync();
    },

    toggleLeetcodeHotDone(problemId) {
      const state = getState();
      const hotItems = getLeetcodeHotItems();
      const validIds = new Set(hotItems.map((item) => item.id));
      if (!validIds.has(problemId)) return;
      const done = new Set(deps.normalizeLeetcodeHot100Done?.(state.leetcodeHot100Done, hotItems) || []);
      if (done.has(problemId)) done.delete(problemId);
      else done.add(problemId);
      state.leetcodeHot100Done = [...done];
      state.skills = {
        ...(state.skills || {}),
        leetcode: Math.max(Number(state.skills?.leetcode || 0), Math.min(100, state.leetcodeHot100Done.length))
      };
      deps.saveState?.();
      sync();
    },

    addFromForm(payload) {
      if (payload && typeof payload === "object") {
        deps.addProblemFromPayload?.(payload);
      } else {
        deps.addProblemFromForm?.();
      }
      sync();
    },

    importJson(raw) {
      if (typeof raw === "string") {
        deps.importProblemJsonText?.(raw);
      } else {
        deps.importProblemJson?.();
      }
      sync();
    },

    handlePagination(event) {
      if (event.type === "submit") deps.handleProblemPaginationSubmit?.(event);
      else if (event.type === "change") deps.handleProblemPaginationChange?.(event);
      else if (event.type === "keydown") deps.handleProblemPaginationKeydown?.(event);
      else deps.handleProblemPaginationClick?.(event);
      sync();
    },

    sync
  };
}
