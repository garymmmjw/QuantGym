import { listen } from '../../ui/events.js';

export function createCompaniesModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const getTierFilter = () => deps.getTierFilter?.() || "all";
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const tierWeight = (tier = "") => (
    deps.companyTierWeight?.(tier) ?? ({ S: 0, A: 1, B: 2 }[String(tier).toUpperCase()] ?? 5)
  );
  const createMark = (company) => {
    const mark = deps.createCompanyMark?.(company);
    if (mark) return mark;
    const fallback = document.createElement("div");
    fallback.className = "company-mark";
    fallback.style.setProperty("--company-color", company.color);
    fallback.style.setProperty("--company-accent", company.accent);
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = company.short || company.name?.slice(0, 2) || "";
    return fallback;
  };

  const render = () => {
    const els = getElements();
    if (!els.companyOverviewList) return;
    const tierFilter = getTierFilter();
    const isEn = deps.getLanguage?.() === "en";

    document.querySelectorAll("[data-company-tier]").forEach((button) => {
      const tier = button.dataset.companyTier || "all";
      button.classList.toggle("active", tier === tierFilter);
      button.setAttribute("aria-pressed", String(tier === tierFilter));
    });

    const problems = deps.getCatalogProblems?.() || [];
    const entries = (deps.companyDefs || [])
      .map((company) => ({
        company,
        stats: deps.getCompanyProblemStats?.(company, problems) || { total: 0, completed: 0, percent: 0 },
        jobs: deps.getCompanyJobs?.(company) || []
      }))
      .filter((entry) => tierFilter === "all" || entry.company.tier.toLowerCase() === tierFilter)
      .sort((left, right) => (
        tierWeight(left.company.tier) - tierWeight(right.company.tier)
        || right.stats.total - left.stats.total
        || left.company.name.localeCompare(right.company.name)
      ));

    if (els.companiesPageTitle) els.companiesPageTitle.textContent = text("companies");
    if (els.companiesSummary) {
      const questionCount = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
      els.companiesSummary.textContent = deps.formatSummary?.(entries.length, questionCount) || "";
    }

    els.companyOverviewList.innerHTML = "";
    if (!entries.length) {
      els.companyOverviewList.appendChild(deps.emptyBlock?.(text("searchEmpty")) || document.createTextNode(""));
      return;
    }

    entries.forEach(({ company, stats, jobs }) => {
      const summary = isEn ? company.summaryEn : company.summaryZh;
      const card = document.createElement("article");
      card.className = "company-overview-card";
      card.dataset.companyCard = company.slug;
      card.style.setProperty("--company-color", company.color);
      card.style.setProperty("--company-accent", company.accent);

      const head = document.createElement("div");
      head.className = "company-card-head";
      const identity = document.createElement("div");
      identity.className = "company-card-identity";
      identity.appendChild(createMark(company));
      const titleWrap = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = company.name;
      const meta = document.createElement("small");
      meta.textContent = deps.formatCompanyMeta?.(company) || `Tier ${company.tier} - ${company.type}`;
      titleWrap.append(title, meta);
      identity.appendChild(titleWrap);
      const count = document.createElement("div");
      count.className = "company-question-count";
      count.innerHTML = `<strong>${escape(stats.total)}</strong><span>${escape(text("companyQuestions"))}</span>`;
      head.append(identity, count);

      const copy = document.createElement("p");
      copy.className = "company-summary";
      copy.textContent = summary;

      const focus = document.createElement("div");
      focus.className = "company-focus-list";
      company.focus.slice(0, 4).forEach((item) => {
        const chip = document.createElement("span");
        chip.textContent = item;
        focus.appendChild(chip);
      });

      const detail = document.createElement("div");
      detail.className = "company-detail-grid";
      detail.innerHTML = `
        <span><b>${escape(stats.completed)}/${escape(stats.total)}</b><small>${escape(text("companyProgress"))}</small></span>
        <span><b>${escape(jobs.length)}</b><small>${escape(deps.getOpenRolesLabel?.() || "open roles")}</small></span>
        <span><b>${escape(company.locations.slice(0, 2).join(" / "))}</b><small>${escape(deps.getLocationsLabel?.() || "locations")}</small></span>
      `;

      const progress = document.createElement("div");
      progress.className = "company-progress-track";
      progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

      const actions = document.createElement("div");
      actions.className = "company-card-actions";
      const practice = document.createElement("button");
      practice.type = "button";
      practice.className = "primary-button compact";
      practice.dataset.companyPractice = company.slug;
      practice.innerHTML = `<i data-lucide="target"></i>${escape(text("companyPractice"))}`;
      const careers = document.createElement("button");
      careers.type = "button";
      careers.className = "secondary-button compact";
      careers.dataset.companyCareers = company.website;
      careers.innerHTML = `<i data-lucide="external-link"></i>${escape(text("companyCareers"))}`;
      actions.append(practice, careers);

      const watermark = document.createElement("div");
      watermark.className = "company-watermark";
      watermark.textContent = company.short;

      card.append(watermark, head, copy, focus, detail, progress, actions);
      els.companyOverviewList.appendChild(card);
    });
    deps.refreshIcons?.();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.companyTierFilter, "click", (event) => {
        const button = event.target.closest("[data-company-tier]");
        if (!button) return;
        deps.setTierFilter?.(button.dataset.companyTier || "all");
        render();
      });

      bind(els.companyOverviewList, "click", (event) => {
        const practice = event.target.closest("[data-company-practice]");
        if (practice) {
          deps.practice?.(practice.dataset.companyPractice);
          return;
        }

        const careers = event.target.closest("[data-company-careers]");
        if (careers) deps.openCareers?.(careers.dataset.companyCareers);
      });
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
