import {
  createProblemDetailNavigationView,
  renderProblemDetailView
} from './detail.js';
import {
  getProblemDetailNavigation,
  getProblemNavigationSequence,
  isProblemDetailBlockRevealed,
  resetProblemDetailReveals,
  revealProblemDetailBlock
} from './navigation.js';
import {
  requestDeleteProblemComment,
  requestProblemComment,
  requestProblemLike
} from './social.js';
import {
  runProblemCommentAction,
  runProblemDeleteCommentAction,
  runProblemLikeAction
} from './socialActions.js';
import {
  getProblemDetailOpenState,
  getProblemDetailReturnState
} from './viewState.js';

export function createProblemDetailController(deps = {}) {
  const {
    elements,
    documentRef,
    windowRef,
    detailState,
    socialState,
    getProblems,
    getFilteredProblems,
    getViewMode,
    compareProblems,
    isCatalogProblem,
    renderProblems,
    refreshSocial,
    canUseCloud,
    cloudApi,
    getLanguage,
    t,
    getDisplayTitle,
    formatCategory,
    formatTag,
    getMediaMarkdown,
    getPersonalState,
    getSocial,
    selectForInterview,
    toggleCompleted,
    toggleSaved,
    emptyBlock,
    formatDate,
    renderRichText,
    scheduleMathTypeset,
    refreshIcons
  } = deps;
  const revealState = new Set();

  function resetReveals() {
    resetProblemDetailReveals(revealState);
  }

  function getNavigationSequence() {
    return getProblemNavigationSequence(getFilteredProblems(), {
      viewMode: getViewMode(),
      compare: compareProblems
    });
  }

  function getDetailNavigation(problemId) {
    return getProblemDetailNavigation(problemId, {
      sequence: getNavigationSequence(),
      fallbackSequence: getProblems().filter(isCatalogProblem)
    });
  }

  function createNavigation(problem) {
    return createProblemDetailNavigationView({
      navigation: getDetailNavigation(problem.id),
      isEnglish: getLanguage() === "en",
      openProblemDetail: open
    });
  }

  function render(problem) {
    renderProblemDetailView({
      container: elements.problemDetail,
      problem,
      isEnglish: getLanguage() === "en",
      t,
      getDisplayTitle,
      formatCategory,
      formatTag,
      getMediaMarkdown,
      getPersonalState,
      getSocial,
      socialNotice: socialState.getNotice(),
      createNavigation,
      returnToList,
      selectForInterview,
      toggleCompleted,
      toggleSaved,
      isBlockRevealed,
      revealBlock,
      toggleLike,
      postComment,
      deleteComment,
      emptyBlock,
      formatDate,
      renderRichText,
      scheduleMathTypeset,
      refreshIcons
    });
  }

  function open(problemId) {
    const problem = getProblems().find((item) => item.id === problemId && isCatalogProblem(item));
    if (!problem) return;
    const nextState = getProblemDetailOpenState(detailState.getDetailId(), problemId);
    if (nextState.resetReveals) resetReveals();
    detailState.setDetailId(nextState.detailId);
    socialState.setNotice("");
    elements.problemList.classList.add("hidden");
    elements.problemRanking.classList.add("hidden");
    elements.problemDetail.classList.remove("hidden");
    render(problem);
    refreshSocial(problemId);
    const stickyOffset = (documentRef.querySelector(".topbar")?.getBoundingClientRect().height || 0) + 14;
    const detailTop = elements.problemDetail.getBoundingClientRect().top + windowRef.scrollY - stickyOffset;
    windowRef.scrollTo({ top: Math.max(0, detailTop), behavior: "smooth" });
  }

  function returnToList() {
    const nextState = getProblemDetailReturnState(detailState.getDetailId());
    detailState.setDetailId(nextState.detailId);
    if (nextState.resetReveals) resetReveals();
    elements.problemDetail.classList.add("hidden");
    elements.problemList.classList.remove("hidden");
    renderProblems();
  }

  function isBlockRevealed(problemId, blockKey) {
    return isProblemDetailBlockRevealed(revealState, problemId, blockKey);
  }

  function revealBlock(problemId, blockKey) {
    revealProblemDetailBlock(revealState, problemId, blockKey);
  }

  async function toggleLike(problemId) {
    const result = await runProblemLikeAction({
      currentSocial: socialState.getSocial(),
      problemId,
      canUseCloud: canUseCloud(),
      requestLike: (id) => requestProblemLike(cloudApi, id),
      t
    });
    socialState.setSocial(result.social);
    socialState.setNotice(result.notice);
    renderProblems();
  }

  async function postComment(problemId, text) {
    const result = await runProblemCommentAction({
      currentSocial: socialState.getSocial(),
      problemId,
      text,
      canUseCloud: canUseCloud(),
      requestComment: (id, content) => requestProblemComment(cloudApi, id, content),
      t
    });
    socialState.setSocial(result.social);
    socialState.setNotice(result.notice);
    renderProblems();
  }

  async function deleteComment(problemId, commentId) {
    const message = t("deleteCommentConfirm");
    if (!windowRef.confirm(message) || !canUseCloud()) return;
    const result = await runProblemDeleteCommentAction({
      currentSocial: socialState.getSocial(),
      problemId,
      commentId,
      requestDelete: (id, targetCommentId) => requestDeleteProblemComment(cloudApi, id, targetCommentId),
      t
    });
    socialState.setSocial(result.social);
    socialState.setNotice(result.notice);
    renderProblems();
  }

  return {
    getNavigationSequence,
    getDetailNavigation,
    createNavigation,
    resetReveals,
    isBlockRevealed,
    revealBlock,
    open,
    returnToList,
    render,
    toggleLike,
    postComment,
    deleteComment
  };
}
