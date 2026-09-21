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
    elements = {},
    documentRef = globalThis.document,
    windowRef = globalThis.window,
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

  function isFreePracticePage() {
    return Boolean(documentRef?.querySelector?.("[data-free-practice-root]"));
  }

  function renderProblemBrowser() {
    if (typeof renderProblems === "function") renderProblems();
  }

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
    if (isFreePracticePage() || !elements.problemDetail) return;
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
    if (isFreePracticePage()) {
      const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
      if (windowRef?.dispatchEvent && CustomEventCtor) {
        windowRef.dispatchEvent(new CustomEventCtor("quantgym:problem-open", {
          detail: { problemId, source: "detail" }
        }));
      }
      refreshSocial?.(problemId);
      return;
    }
    elements.problemList?.classList.add("hidden");
    elements.problemRanking?.classList.add("hidden");
    elements.problemDetail?.classList.remove("hidden");
    render(problem);
    refreshSocial?.(problemId);
    const detailBounds = elements.problemDetail?.getBoundingClientRect?.();
    if (!detailBounds || !windowRef?.scrollTo) return;
    const stickyOffset = (documentRef?.querySelector?.(".topbar")?.getBoundingClientRect().height || 0) + 14;
    const detailTop = detailBounds.top + (windowRef.scrollY || 0) - stickyOffset;
    windowRef.scrollTo({ top: Math.max(0, detailTop), behavior: "smooth" });
  }

  function returnToList() {
    const nextState = getProblemDetailReturnState(detailState.getDetailId());
    detailState.setDetailId(nextState.detailId);
    if (nextState.resetReveals) resetReveals();
    if (!isFreePracticePage()) {
      elements.problemDetail?.classList.add("hidden");
      elements.problemList?.classList.remove("hidden");
    }
    renderProblemBrowser();
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
    renderProblemBrowser();
    return result;
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
    renderProblemBrowser();
    return result;
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
    renderProblemBrowser();
    return result;
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
