import { escapeHtml } from "../../lib/text.js";
import { escapeAttribute } from "../../lib/url.js";

export function createLeetcodeHotPanelState(initialExpanded = false) {
  let expanded = Boolean(initialExpanded);
  return {
    isExpanded() {
      return expanded;
    },
    setExpanded(value) {
      expanded = Boolean(value);
      return expanded;
    },
    toggle() {
      expanded = !expanded;
      return expanded;
    }
  };
}

export function renderLeetcodeHotPanel(options = {}) {
  const elements = options.elements || {};
  if (!elements.leetcodeHotList) return;
  const t = options.t || ((key) => key);
  const items = options.items || [];
  const done = new Set(options.doneIds || []);
  const total = items.length || 100;
  const doneCount = done.size;

  if (elements.leetcodeHotTitle) elements.leetcodeHotTitle.textContent = t("leetcodeHotTitle");
  if (elements.leetcodeHotSummary) elements.leetcodeHotSummary.textContent = t("leetcodeHotSummary");
  if (elements.leetcodeHotProgressLabel) elements.leetcodeHotProgressLabel.textContent = t("leetcodeHotProgressLabel");
  if (elements.leetcodeHotProgressText) elements.leetcodeHotProgressText.textContent = `${doneCount} / ${total}`;
  if (elements.leetcodeHotProgressFill) {
    elements.leetcodeHotProgressFill.style.width = `${Math.round((doneCount / Math.max(total, 1)) * 100)}%`;
  }

  const panel = elements.leetcodeHotList.closest(".leetcode-hot-panel");
  panel?.classList.toggle("is-expanded", Boolean(options.expanded));

  if (elements.leetcodeHotToggleBtn) {
    elements.leetcodeHotToggleBtn.setAttribute("aria-expanded", String(Boolean(options.expanded)));
    elements.leetcodeHotToggleBtn.innerHTML = `<i data-lucide="${options.expanded ? "chevron-up" : "list-checks"}"></i>${escapeHtml(t(options.expanded ? "leetcodeHotCollapse" : "leetcodeHotManage"))}`;
  }
  if (elements.leetcodeHotPlanLink) {
    elements.leetcodeHotPlanLink.title = t("leetcodeHotOpen");
    elements.leetcodeHotPlanLink.setAttribute("aria-label", t("leetcodeHotOpen"));
    elements.leetcodeHotPlanLink.innerHTML = '<i data-lucide="external-link"></i>';
  }

  elements.leetcodeHotList.innerHTML = "";
  elements.leetcodeHotList.classList.toggle("hidden", !options.expanded);
  if (!options.expanded) return;

  if (!items.length) {
    elements.leetcodeHotList.appendChild(options.emptyBlock?.(options.isEnglish ? "Hot 100 data is not available." : "Hot 100 数据暂不可用。") || document.createTextNode(""));
    return;
  }

  items.forEach((item) => {
    const isDone = done.has(item.id);
    const card = document.createElement("article");
    card.className = `leetcode-hot-item${isDone ? " is-done" : ""}`;
    card.innerHTML = `
      <button class="leetcode-hot-done" type="button" data-leetcode-hot-toggle="${escapeHtml(item.id)}" aria-label="${escapeHtml(isDone ? t("leetcodeHotUndo") : t("leetcodeHotMarkDone"))}">
        <i data-lucide="${isDone ? "check" : "circle"}"></i>
      </button>
      <div class="leetcode-hot-main">
        <strong>${escapeHtml(item.number)}. ${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.topic)} · ${escapeHtml(item.difficulty)}${isDone ? ` · ${escapeHtml(t("leetcodeHotDone"))}` : ""}</span>
      </div>
      <a class="leetcode-hot-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${t("leetcodeHotOpen")}: ${item.title}`)}">
        <i data-lucide="external-link"></i>
      </a>
    `;
    elements.leetcodeHotList.appendChild(card);
  });

  elements.leetcodeHotList.querySelectorAll("[data-leetcode-hot-toggle]").forEach((button) => {
    button.addEventListener("click", () => options.toggleDone?.(button.dataset.leetcodeHotToggle));
  });
}
