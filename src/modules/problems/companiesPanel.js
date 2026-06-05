import { escapeHtml } from "../../lib/text.js";

export function renderProblemCompanyPanel(options = {}) {
  const elements = options.elements || {};
  if (!elements.problemCompanyList) return;
  const companies = options.companies || [];
  const getStats = options.getStats || (() => ({ total: 0, percent: 0 }));
  const tierWeight = options.tierWeight || (() => 5);
  const t = options.t || ((key) => key);
  const entries = companies
    .map((company) => ({
      company,
      stats: getStats(company)
    }))
    .filter((entry) => entry.stats.total > 0)
    .sort((left, right) => (
      tierWeight(left.company.tier) - tierWeight(right.company.tier)
      || right.stats.total - left.stats.total
      || left.company.name.localeCompare(right.company.name)
    ));

  if (elements.problemCompanyTitle) elements.problemCompanyTitle.textContent = options.isEnglish ? "Prepare by Company" : "按公司刷题";
  if (elements.problemCompanySummary) {
    const tagged = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
    elements.problemCompanySummary.textContent = options.isEnglish
      ? `${entries.length} firms · ${tagged} tagged questions from real interview sources`
      : `${entries.length} 家公司 · ${tagged} 道真实题源标注题`;
  }
  if (elements.problemCompanyClearBtn) {
    elements.problemCompanyClearBtn.classList.toggle("hidden", options.activeCompany === "all");
    elements.problemCompanyClearBtn.innerHTML = `<i data-lucide="rotate-ccw"></i>${escapeHtml(t("allCompanies"))}`;
  }

  elements.problemCompanyList.innerHTML = "";
  entries.forEach(({ company, stats }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `problem-company-card${options.activeCompany === company.slug ? " active" : ""}`;
    card.dataset.problemCompany = company.slug;
    card.style.setProperty("--company-color", company.color);
    card.style.setProperty("--company-accent", company.accent);
    card.setAttribute("aria-pressed", String(options.activeCompany === company.slug));

    const mark = options.createMark?.(company, "small") || document.createElement("span");
    const main = document.createElement("span");
    main.className = "problem-company-main";
    main.innerHTML = `
      <strong>${escapeHtml(company.name)}</strong>
      <small>Tier ${escapeHtml(company.tier)} · ${escapeHtml(company.focus.slice(0, 2).join(" / "))}</small>
    `;
    const count = document.createElement("span");
    count.className = "problem-company-count";
    count.innerHTML = `
      <b>${escapeHtml(String(stats.total))}</b>
      <small>${escapeHtml(t("companyQuestions"))}</small>
    `;
    const progress = document.createElement("span");
    progress.className = "problem-company-progress";
    progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

    card.append(mark, main, count, progress);
    elements.problemCompanyList.appendChild(card);
  });
}
