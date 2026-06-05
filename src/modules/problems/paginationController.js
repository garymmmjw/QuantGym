import {
  createProblemPaginationState,
  getProblemPaginationClickPage,
  getProblemPaginationInputPage,
  getProblemPaginationJumpInput,
  hideProblemPagination as hideProblemPaginationView,
  renderProblemPagination as renderProblemPaginationView
} from './pagination.js';

export function createProblemPaginationController(deps) {
  const {
    elements,
    pageSize,
    getLanguage,
    renderProblems
  } = deps;
  const state = createProblemPaginationState(1);

  function goToPage(nextPage) {
    if (!nextPage) return;
    state.setPage(nextPage);
    renderProblems({ resultsOnly: true });
    elements.problemList?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return {
    getPage() {
      return state.getPage();
    },
    setPage(nextPage) {
      return state.setPage(nextPage);
    },
    reset() {
      return state.reset();
    },
    hide() {
      hideProblemPaginationView(elements);
    },
    handleClick(event) {
      const nextPage = getProblemPaginationClickPage(event, state.getPage());
      if (!nextPage) return;
      goToPage(nextPage);
    },
    handleSubmit(event) {
      const input = getProblemPaginationJumpInput(event);
      if (!input) return;
      event.preventDefault();
      goToPage(getProblemPaginationInputPage(input));
    },
    handleChange(event) {
      const input = getProblemPaginationJumpInput(event);
      if (!input) return;
      goToPage(getProblemPaginationInputPage(input));
    },
    handleKeydown(event) {
      if (event.key !== "Enter") return;
      const input = getProblemPaginationJumpInput(event);
      if (!input) return;
      event.preventDefault();
      goToPage(getProblemPaginationInputPage(input));
    },
    render(totalProblems) {
      state.setPage(renderProblemPaginationView({
        elements,
        totalProblems,
        page: state.getPage(),
        pageSize,
        isEnglish: getLanguage() === "en"
      }));
    }
  };
}
