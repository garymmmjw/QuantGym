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
  const done = new Set();
  const total = items.length || 100;
  const doneCount = done.size;

  if (elements.leetcodeHotTitle) elements.leetcodeHotTitle.textContent = t("leetcodeHotTitle");
  if (elements.leetcodeHotSummary) elements.leetcodeHotSummary.textContent = options.isEnglish ? "Completion comes from your linked LeetCode account." : "完成进度以关联的力扣账号为准。";
  if (elements.leetcodeHotProgressLabel) elements.leetcodeHotProgressLabel.textContent = t("leetcodeHotProgressLabel");
  if (elements.leetcodeHotProgressText) elements.leetcodeHotProgressText.textContent = options.isEnglish ? "View on LeetCode page" : "请前往力扣页查看";
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
      <a class="leetcode-hot-done" href="/leetcode" aria-label="${options.isEnglish ? "View synced LeetCode progress" : "查看力扣同步进度"}">
        <i data-lucide="refresh-cw"></i>
      </a>
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

}
