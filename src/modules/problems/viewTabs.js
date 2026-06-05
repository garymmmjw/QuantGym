import { escapeHtml } from "../../lib/text.js";

export function renderProblemViewTabs(options = {}) {
  const {
    root = document,
    elements = {},
    viewMode = "all",
    sourceFilter = "all",
    socialNotice = "",
    isEnglish = false,
    getSourceLabel = (value) => value
  } = options;

  root.querySelectorAll("[data-problem-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.problemView === viewMode);
  });

  const sourceActive = Boolean(sourceFilter && sourceFilter !== "all");
  if (elements.problemSourceFilterClearBtn) {
    elements.problemSourceFilterClearBtn.classList.toggle("hidden", !sourceActive);
    elements.problemSourceFilterClearBtn.innerHTML = `<i data-lucide="rotate-ccw"></i>${escapeHtml(isEnglish ? "All sources" : "全部题源")}`;
  }

  if (elements.problemInteractionStatus) {
    const sourceText = sourceActive
      ? (isEnglish ? `Source: ${getSourceLabel(sourceFilter)}` : `题源：${getSourceLabel(sourceFilter)}`)
      : "";
    elements.problemInteractionStatus.textContent = [sourceText, socialNotice].filter(Boolean).join(" · ");
  }
}
