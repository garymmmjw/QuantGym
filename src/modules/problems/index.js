import { listen } from '../../ui/events.js';

export function createProblemsModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.problemSearch, "compositionstart", () => {
        deps.setSearchComposing?.(true);
      });

      bind(els.problemSearch, "compositionend", () => {
        deps.setSearchComposing?.(false);
        deps.handleSearchInput?.();
      });

      bind(els.problemSearch, "input", () => {
        deps.handleSearchInput?.();
      });

      bind(els.problemSearch, "keydown", (event) => {
        deps.handleSearchKeydown?.(event);
      });

      bind(els.problemThemeFilter, "click", (event) => {
        const button = event.target.closest("[data-problem-theme]");
        if (!button) return;
        deps.setThemeFilter?.(button.dataset.problemTheme || "all");
      });

      bind(els.problemDifficultyFilter, "click", (event) => {
        const button = event.target.closest("[data-problem-difficulty]");
        if (!button) return;
        deps.setDifficultyFilter?.(button.dataset.problemDifficulty || "all");
      });

      bind(els.problemCompanyList, "click", (event) => {
        const button = event.target.closest("[data-problem-company]");
        if (!button) return;
        deps.setCompanyFilter?.(button.dataset.problemCompany || "all");
      });

      bind(els.problemCompanyClearBtn, "click", () => {
        deps.clearCompanyFilter?.();
      });

      bind(els.problemSourceFilterClearBtn, "click", () => {
        deps.clearSourceFilter?.();
      });

      bind(els.problemCollectionGrid, "click", (event) => {
        deps.handleCollectionClick?.(event);
      });

      bind(els.leetcodeHotToggleBtn, "click", () => {
        deps.toggleLeetcodeHot?.();
      });

      bind(els.addProblemBtn, "click", () => {
        els.problemForm?.classList.toggle("hidden");
        if (!els.problemForm?.classList.contains("hidden")) els.problemTitleEn?.focus();
      });

      bind(els.problemForm, "submit", (event) => {
        event.preventDefault();
        deps.addFromForm?.();
      });

      bind(els.problemImportForm, "submit", (event) => {
        event.preventDefault();
        deps.importJson?.();
      });

      document.querySelectorAll("[data-problem-view]").forEach((button) => {
        bind(button, "click", () => {
          deps.setViewMode?.(button.dataset.problemView || "all");
        });
      });

      bind(els.problemPagination, "click", (event) => {
        deps.handlePaginationClick?.(event);
      });

      bind(els.problemPagination, "submit", (event) => {
        deps.handlePaginationSubmit?.(event);
      });

      bind(els.problemPagination, "change", (event) => {
        deps.handlePaginationChange?.(event);
      });

      bind(els.problemPagination, "keydown", (event) => {
        deps.handlePaginationKeydown?.(event);
      });

      els.loadMoreProblemsBtn?.classList.add("hidden");
    },

    render() {
      deps.render?.();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
