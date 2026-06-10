import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

const EMPTY_PROBLEM_FORM = {
  titleEn: "",
  titleZh: "",
  category: "leetcode",
  difficulty: "Easy",
  tags: "",
  sourceUrl: "",
  promptEn: "",
  promptZh: "",
  answer: "",
  explanation: ""
};

export function useProblemsPageModel() {
  const appServices = useAppServices();
  const api = usePageApi("problems");
  const pageApi = usePageApi();
  const formatDate = pageApi?.formatDate;
  const userState = useUserStateStore((state) => state.value || {});
  const [searchQuery, setSearchQueryState] = useState(() => api?.getSearchQuery?.() || "");
  const [revision, setRevision] = useState(0);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [problemForm, setProblemForm] = useState(EMPTY_PROBLEM_FORM);
  const [importJson, setImportJson] = useState("");
  const searchTimerRef = useRef(0);
  const latestSearchQueryRef = useRef(searchQuery);
  const iconTimerRef = useRef(0);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const clearSearchTimer = useCallback(() => {
    if (!searchTimerRef.current) return;
    window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = 0;
  }, []);

  const commitSearchQuery = useCallback((value, options = {}) => {
    const nextValue = String(value || "");
    latestSearchQueryRef.current = nextValue;
    clearSearchTimer();
    api?.setSearchQuery?.(nextValue);
    if (options.bump !== false) bump();
  }, [api, bump, clearSearchTimer]);

  const refreshProblemIcons = useCallback(() => {
    if (iconTimerRef.current || !pageApi?.refreshIcons) return;
    iconTimerRef.current = window.setTimeout(() => {
      iconTimerRef.current = 0;
      const root = document.querySelector(".problem-section") || document.getElementById("appShell") || document;
      pageApi.refreshIcons({ root });
    }, 0);
  }, [pageApi]);

  const view = useMemo(() => {
    void revision;
    void userState.problems;
    void userState.problemStates;
    void userState.leetcodeHot100Done;
    void userState.skills;
    return api?.getViewModel?.() || {
      mode: "list",
      filters: { viewMode: "all" },
      list: { items: [], emptyText: "", totalProblems: 0, totalPages: 1, page: 1, pageSize: 24 },
      ranking: null,
      detail: null,
      isEnglish: false,
      t: appServices.t || ((key) => key)
    };
  }, [api, appServices.t, revision, userState.leetcodeHot100Done, userState.problemStates, userState.problems, userState.skills]);

  useEffect(() => {
    api?.sync?.();
    refreshProblemIcons();
  }, [api, refreshProblemIcons, revision, userState.leetcodeHot100Done, userState.problems, userState.problemStates, userState.skills]);

  useEffect(() => () => {
    clearSearchTimer();
    if (iconTimerRef.current) window.clearTimeout(iconTimerRef.current);
  }, [clearSearchTimer]);

  useEffect(() => {
    latestSearchQueryRef.current = api?.getSearchQuery?.() || "";
    setSearchQueryState(latestSearchQueryRef.current);
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let nextIndex = 0;

    const schedule = (delay = 120) => {
      timer = window.setTimeout(run, delay);
    };

    const run = () => {
      if (cancelled) return;
      const result = api?.prewarmSearchIndex?.({
        startIndex: nextIndex,
        budgetMs: 6,
        maxItems: 220
      });
      if (!result || result.done) return;
      nextIndex = result.nextIndex;
      schedule(32);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [api, userState.problems]);

  useEffect(() => {
    const handleProblemOpen = (event) => {
      const problemId = String(event?.detail?.problemId || "");
      if (!problemId) return;
      clearSearchTimer();
      const nextQuery = api?.getSearchQuery?.() || "";
      latestSearchQueryRef.current = nextQuery;
      setSearchQueryState(nextQuery);
      api?.openDetail?.(problemId);
      bump();
    };
    window.addEventListener("quantgym:problem-open", handleProblemOpen);
    return () => window.removeEventListener("quantgym:problem-open", handleProblemOpen);
  }, [api, bump, clearSearchTimer]);

  const setSearchQuery = useCallback((value) => {
    const nextValue = String(value || "");
    setSearchQueryState(nextValue);
    latestSearchQueryRef.current = nextValue;
    clearSearchTimer();
    const debounceMs = Math.max(0, Number(api?.getSearchDebounceMs?.() ?? 140));
    if (!debounceMs) {
      commitSearchQuery(nextValue);
      return;
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = 0;
      commitSearchQuery(latestSearchQueryRef.current);
    }, debounceMs);
  }, [api, clearSearchTimer, commitSearchQuery]);

  const handleSearchKeydown = useCallback((event) => {
    if (event?.key !== "Enter") return;
    commitSearchQuery(latestSearchQueryRef.current, { bump: false });
    api?.handleSearchKeydown?.(event);
    bump();
  }, [api, bump, commitSearchQuery]);

  const applyFilter = useCallback((action) => {
    api?.applyFilterAction?.(action);
    bump();
  }, [api, bump]);

  return {
    view,
    searchQuery,
    setSearchQuery,
    showProblemForm,
    setShowProblemForm,
    showImportForm,
    setShowImportForm,
    problemForm,
    setProblemForm,
    importJson,
    setImportJson,
    handleSearchKeydown,
    applyFilter,
    handleCollectionClick: (event) => { api?.handleCollectionClick?.(event); bump(); },
    handlePagination: (event) => { api?.handlePagination?.(event); bump(); },
    submitProblemForm: (event) => {
      event?.preventDefault?.();
      api?.addFromForm?.(problemForm);
      setProblemForm(EMPTY_PROBLEM_FORM);
      setShowProblemForm(false);
      bump();
    },
    submitImportJson: (event) => {
      event?.preventDefault?.();
      api?.importJson?.(importJson);
      setImportJson("");
      setShowImportForm(false);
      bump();
    },
    openProblem: (problemId) => { api?.openDetail?.(problemId); bump(); },
    returnToList: () => { api?.returnToList?.(); bump(); },
    toggleCompleted: (problemId) => { api?.toggleCompleted?.(problemId); bump(); },
    toggleSaved: (problemId) => { api?.toggleSaved?.(problemId); bump(); },
    revealBlock: (problemId, blockKey) => { api?.revealBlock?.(problemId, blockKey); bump(); },
    toggleLike: (problemId) => { api?.toggleLike?.(problemId); bump(); },
    postComment: (problemId, text) => { api?.postComment?.(problemId, text); bump(); },
    deleteComment: (problemId, commentId) => { api?.deleteComment?.(problemId, commentId); bump(); },
    selectForInterview: (problemId) => { api?.selectForInterview?.(problemId); bump(); },
    toggleLeetcodeHotDone: (problemId) => { api?.toggleLeetcodeHotDone?.(problemId); bump(); },
    mountRichText: (node, text) => api?.mountRichText?.(node, text),
    formatDate,
    getInitials: pageApi?.getInitials,
    t: view.t || appServices.t || ((key) => key)
  };
}
