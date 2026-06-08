import { useEffect } from "react";
import { useCompaniesPageModel } from "./companiesHooks.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { CompanyMark } from "../../components/common/CompanyMark.jsx";

const TIERS = ["all", "s", "a", "b"];

export function CompaniesPageContent() {
  const model = useCompaniesPageModel();

  useEffect(() => {
    model.refreshIcons?.();
  });

  return (
    <section className="companies-section">
      <div className="section-heading">
        <div>
          <h2 id="companiesPageTitle">{model.t("companies")}</h2>
          <small id="companiesSummary">{model.summary}</small>
        </div>
        <div id="companyTierFilter" className="segmented" role="tablist" aria-label={model.t("companyTierFilterAria")}>
          {TIERS.map((tier) => (
            <button
              key={tier}
              className={`segment${model.tierFilter === tier ? " active" : ""}`}
              type="button"
              data-company-tier={tier}
              aria-pressed={model.tierFilter === tier}
              aria-selected={model.tierFilter === tier}
              onClick={() => model.setTierFilter(tier)}
            >
              {tier === "all" ? model.t("allCompanies") : `Tier ${tier.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>
      <div id="companyOverviewList" className="company-overview-list">
        {!model.entries.length ? (
          <EmptyState title={model.t("searchEmpty")} />
        ) : model.entries.map(({ company, stats, jobs }) => {
          const summary = model.isEnglish ? company.summaryEn : company.summaryZh;
          return (
            <article
              key={company.slug}
              className="company-overview-card"
              data-company-card={company.slug}
              style={{ "--company-color": company.color, "--company-accent": company.accent }}
            >
              <div className="company-watermark">{company.short}</div>
              <div className="company-card-head">
                <div className="company-card-identity">
                  <CompanyMark company={company} />
                  <div>
                    <h3>{company.name}</h3>
                    <small>{model.formatCompanyMeta?.(company)}</small>
                  </div>
                </div>
                <div className="company-question-count">
                  <strong>{stats.total}</strong>
                  <span>{model.t("companyQuestions")}</span>
                </div>
              </div>
              <p className="company-summary">{summary}</p>
              <div className="company-focus-list">
                {company.focus.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="company-detail-grid">
                <span><b>{stats.completed}/{stats.total}</b><small>{model.t("companyProgress")}</small></span>
                <span><b>{jobs.length}</b><small>{model.getOpenRolesLabel?.()}</small></span>
                <span><b>{company.locations.slice(0, 2).join(" / ")}</b><small>{model.getLocationsLabel?.()}</small></span>
              </div>
              <div className="company-progress-track">
                <i style={{ width: `${stats.percent}%` }} />
              </div>
              <div className="company-card-actions">
                <button
                  className="primary-button compact"
                  type="button"
                  data-company-practice={company.slug}
                  onClick={() => model.practiceCompany?.(company.slug)}
                >
                  <i data-lucide="target" />
                  {model.t("companyPractice")}
                </button>
                <button
                  className="secondary-button compact"
                  type="button"
                  data-company-careers={company.website}
                  onClick={() => model.openCareers?.(company.website)}
                >
                  <i data-lucide="external-link" />
                  {model.t("companyCareers")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
