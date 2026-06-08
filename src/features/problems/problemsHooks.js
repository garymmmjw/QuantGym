import { useCallback, useEffect, useMemo, useState } from "react";
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

  const bump = useCallback(() => setRevision((value) => value + 1), []);

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
    pageApi?.refreshIcons?.();
  }, [api, pageApi, revision, userState.leetcodeHot100Done, userState.problems, userState.problemStates, userState.skills]);

  const setSearchQuery = useCallback((value) => {
    setSearchQueryState(value);
    api?.setSearchQuery?.(value);
    bump();
  }, [api, bump]);

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
    handleSearchKeydown: (event) => { api?.handleSearchKeydown?.(event); bump(); },
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
