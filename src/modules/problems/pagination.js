import { escapeHtml } from "../../lib/text.js";

export function createProblemPaginationState(initialPage = 1) {
  let page = clampProblemPage(initialPage, Number.MAX_SAFE_INTEGER) || 1;
  return {
    getPage() {
      return page;
    },
    setPage(nextPage) {
      const normalized = clampProblemPage(nextPage, Number.MAX_SAFE_INTEGER);
      if (normalized) page = normalized;
      return page;
    },
    reset() {
      page = 1;
      return page;
    }
  };
}

export function clampProblemPage(rawPage, rawTotalPages) {
  const totalPages = Math.max(1, Number(rawTotalPages || 1));
  const nextPage = Number(rawPage);
  if (!Number.isFinite(nextPage)) return null;
  return Math.min(Math.max(1, Math.round(nextPage)), totalPages);
}

export function getProblemPaginationClickPage(event, currentPage = 1) {
  const button = event?.target?.closest?.("[data-problem-page]");
  if (!button) return null;
  const totalPages = Math.max(1, Number(button.dataset.totalPages || 1));
  const target = button.dataset.problemPage;
  const nextPage = target === "prev"
    ? Number(currentPage || 1) - 1
    : target === "next"
      ? Number(currentPage || 1) + 1
      : Number(target);
  return clampProblemPage(nextPage, totalPages);
}

export function getProblemPaginationJumpInput(event) {
  const form = event?.target?.closest?.("[data-problem-page-jump]");
  if (form) return form.querySelector("[data-problem-page-input]");
  return event?.target?.closest?.("[data-problem-page-input]") || null;
}

export function getProblemPaginationInputPage(input) {
  if (!input) return null;
  return clampProblemPage(input.value, input.dataset.totalPages);
}

export function hideProblemPagination(elements = {}) {
  elements.problemPagination?.classList.add("hidden");
  elements.loadMoreProblemsBtn?.classList.add("hidden");
}

export function renderProblemPagination({
  elements = {},
  totalProblems = 0,
  page = 1,
  pageSize = 24,
  isEnglish = false
} = {}) {
  if (!elements.problemPagination) return page;
  const total = Math.max(0, Number(totalProblems || 0));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, Number(page || 1)), totalPages);
  if (total <= pageSize) {
    hideProblemPagination(elements);
    return currentPage;
  }

  const pages = getPaginationWindow(currentPage, totalPages);
  elements.problemPagination.innerHTML = "";

  const summary = document.createElement("span");
  summary.className = "problem-pagination-summary";
  summary.textContent = isEnglish
    ? `Page ${currentPage} / ${totalPages} · ${total} problems`
    : `第 ${currentPage} / ${totalPages} 页 · 共 ${total} 题`;
  elements.problemPagination.appendChild(summary);
  elements.problemPagination.appendChild(createProblemPageButton("prev", isEnglish ? "Previous" : "上一页", "chevron-left", totalPages, currentPage <= 1));

  pages.forEach((item) => {
    if (item === "gap") {
      const gap = document.createElement("span");
      gap.className = "problem-pagination-gap";
      gap.textContent = "...";
      elements.problemPagination.appendChild(gap);
      return;
    }
    elements.problemPagination.appendChild(createProblemPageButton(String(item), String(item), "", totalPages, false, item === currentPage));
  });

  elements.problemPagination.appendChild(createProblemPageButton("next", isEnglish ? "Next" : "下一页", "chevron-right", totalPages, currentPage >= totalPages));

  const jump = document.createElement("form");
  jump.className = "problem-pagination-jump";
  jump.dataset.problemPageJump = "true";
  jump.noValidate = true;
  const pageValue = String(currentPage);
  const totalPageValue = String(totalPages);
  jump.innerHTML = `
    <label>
      <span>${escapeHtml(isEnglish ? "Go to" : "前往")}</span>
      <input data-problem-page-input data-total-pages="${escapeHtml(totalPageValue)}" type="number" min="1" max="${escapeHtml(totalPageValue)}" value="${escapeHtml(pageValue)}" inputmode="numeric" aria-label="${escapeHtml(isEnglish ? "Page number" : "页码")}">
      <span>${escapeHtml(isEnglish ? "page" : "页")}</span>
    </label>
    <button class="problem-page-button compact" type="submit">${escapeHtml(isEnglish ? "Go" : "跳转")}</button>
  `;
  elements.problemPagination.appendChild(jump);
  elements.problemPagination.classList.remove("hidden");
  elements.loadMoreProblemsBtn?.classList.add("hidden");
  return currentPage;
}

export function getPaginationWindow(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((left, right) => left - right);
  return visible.flatMap((item, index) => {
    if (index === 0 || item - visible[index - 1] <= 1) return [item];
    return ["gap", item];
  });
}

function createProblemPageButton(page, label, icon, totalPages, disabled = false, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `problem-page-button${active ? " active" : ""}`;
  button.dataset.problemPage = page;
  button.dataset.totalPages = String(totalPages);
  button.disabled = disabled;
  button.setAttribute("aria-current", active ? "page" : "false");
  button.innerHTML = icon ? `<i data-lucide="${icon}"></i><span>${escapeHtml(label)}</span>` : escapeHtml(label);
  return button;
}
