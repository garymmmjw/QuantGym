import { useRef, useState } from "react";
import { useCompaniesPageModel } from "./companiesHooks.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { getCompanyProfile } from "./companyProfiles.js";

const TIERS = ["all", "s", "a", "b"];

export function CompaniesPageContent() {
  const model = useCompaniesPageModel();
  const [selectedSlug, setSelectedSlug] = useState("");
  const [savedSlugs, setSavedSlugs] = useState([]);
  const detailRef = useRef(null);

  useScopedRefreshIcons(model.refreshIcons, ".companies-section", [model.entries, model.tierFilter, selectedSlug]);

  const zh = !model.isEnglish;
  const entries = model.entries;
  const selectedEntry = entries.find((entry) => entry.company.slug === selectedSlug) || entries[0] || null;

  const selectCompany = (slug) => {
    setSelectedSlug(slug);
    if (typeof window !== "undefined" && window.innerWidth <= 960) {
      window.setTimeout(() => {
        const el = detailRef.current;
        if (!el) return;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 70,
          behavior: "smooth"
        });
      }, 80);
    }
  };

  const toggleSaved = (slug) => {
    setSavedSlugs((current) => (
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    ));
  };

  const renderDetail = ({ company, jobs }) => {
    const profile = getCompanyProfile(company.slug) || {};
    const heroColor = profile.heroColor || company.color;
    const tagline = (zh ? profile.taglineZh : profile.taglineEn) || company.type;
    const about = zh ? (profile.aboutZh || company.summaryZh) : company.summaryEn;
    const founded = profile.founded || "—";
    const hq = (zh ? profile.hqZh : profile.hqEn) || company.locations?.[0] || "—";
    const topics = zh
      ? (profile.topicsZh || company.focus.slice(0, 4))
      : company.focus.slice(0, 4);
    const rounds = profile.rounds || [];
    const resources = profile.resources || [];
    const saved = savedSlugs.includes(company.slug);

    return (
      <article
        className="company-detail-panel"
        ref={detailRef}
        data-company-detail={company.slug}
        style={{ "--company-color": heroColor, "--company-accent": company.accent }}
      >
        <header className="company-detail-hero">
          <div className="company-hero-top">
            <span className="company-hero-logo" aria-hidden="true">{company.short}</span>
            <div className="company-hero-id">
              <h3 className="company-hero-name">{company.name}</h3>
              <p className="company-hero-tagline">{tagline}</p>
            </div>
            <div className="company-hero-actions">
              <button
                type="button"
                className={`company-save-btn${saved ? " is-saved" : ""}`}
                aria-pressed={saved}
                onClick={() => toggleSaved(company.slug)}
              >
                {saved ? (zh ? "✓ 已收藏" : "✓ Saved") : (zh ? "＋ 收藏" : "+ Save")}
              </button>
              <button
                type="button"
                className="company-site-btn"
                data-company-careers={company.website}
                onClick={() => model.openCareers?.(company.website)}
              >
                {model.t("companyCareers")}
              </button>
            </div>
          </div>
          <div className="company-hero-stats">
            <div>
              <strong>{founded}</strong>
              <span>{zh ? "成立" : "Founded"}</span>
            </div>
            <div>
              <strong>{hq}</strong>
              <span>{zh ? "总部" : "HQ"}</span>
            </div>
            <div>
              <strong>{jobs.length}</strong>
              <span>{zh ? "在招职位" : "Open roles"}</span>
            </div>
            {Number.isFinite(profile.match) ? (
              <div className="is-match">
                <strong>{profile.match}%</strong>
                <span>{zh ? "匹配度" : "Match"}</span>
              </div>
            ) : null}
          </div>
        </header>
        <div className="company-detail-body">
          <p className="company-about">{about}</p>
          {rounds.length ? (
            <div className="company-rounds">
              <div className="company-block-title">{zh ? "面试风格" : "Interview style"}</div>
              <div className="company-round-list">
                {rounds.map((round, index) => (
                  <div className="company-round-row" key={round.zh}>
                    <span className="company-round-num">{index + 1}</span>
                    <span className="company-round-name">{zh ? round.zh : round.en}</span>
                    <span className="company-round-tag">{zh ? round.tagZh : round.tagEn}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="company-topics-resources">
            <div>
              <div className="company-block-title">{zh ? "高频考点" : "Hot topics"}</div>
              <div className="company-topic-chips">
                {topics.map((topic) => <span key={topic}>{topic}</span>)}
              </div>
            </div>
            {resources.length ? (
              <div>
                <div className="company-block-title">{zh ? "关联资源" : "Related resources"}</div>
                <div className="company-resource-list">
                  {resources.map((resource, index) => (
                    <button
                      type="button"
                      className="company-resource-row"
                      key={resource.zh}
                      onClick={() => model.openModule?.(resource.module)}
                    >
                      <span className={`company-resource-dot${index % 2 ? " is-brand" : ""}`} aria-hidden="true" />
                      <span className="company-resource-label">{zh ? resource.zh : resource.en}</span>
                      <span className="company-resource-arrow" aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="company-detail-cta-row">
            <button
              type="button"
              className="company-jobs-cta"
              onClick={() => model.openModule?.("jobs")}
            >
              {zh ? `查看 ${jobs.length} 个在招职位 →` : `View ${jobs.length} open roles →`}
            </button>
            <button
              type="button"
              className="company-practice-link"
              data-company-practice={company.slug}
              onClick={() => model.practiceCompany?.(company.slug)}
            >
              <i data-lucide="target" />
              {model.t("companyPractice")}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="companies-section qg-support-page qg-companies-page">
      <div className="section-heading companies-header">
        <div>
          <span className="companies-kicker">{model.isEnglish ? "JOBS · Company profiles" : "JOBS · 公司档案"}</span>
          <h2 id="companiesPageTitle">
            {model.t("companies")} <span className="companies-title-en">Companies</span>
          </h2>
          <small id="companiesSummary">
            {zh
              ? "头部做市商 & 基金档案 · 面试风格 / 高频考点 / 在招职位一目了然"
              : "Top market maker & fund profiles · interview style, hot topics, and open roles at a glance"}
          </small>
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
      <div id="companyOverviewList" className="company-master-grid">
        {!entries.length ? (
          <EmptyState title={model.t("searchEmpty")} />
        ) : (
          <>
            <nav className="company-list-nav" aria-label={model.isEnglish ? "Company list" : "公司列表"}>
              {entries.map(({ company, jobs }) => {
                const profile = getCompanyProfile(company.slug) || {};
                const active = selectedEntry?.company.slug === company.slug;
                const focusLabel = zh ? (profile.focusZh || company.type) : company.type;
                return (
                  <button
                    key={company.slug}
                    type="button"
                    className={`company-list-row${active ? " active" : ""}`}
                    data-company-card={company.slug}
                    aria-pressed={active}
                    style={{ "--company-color": profile.heroColor || company.color, "--company-accent": company.accent }}
                    onClick={() => selectCompany(company.slug)}
                  >
                    <span className="company-list-logo" aria-hidden="true">{company.short}</span>
                    <span className="company-list-main">
                      <span className="company-list-name">{company.name}</span>
                      <span className="company-list-sub">
                        {zh ? `${focusLabel} · ${jobs.length} 在招` : `${focusLabel} · ${jobs.length} open`}
                      </span>
                    </span>
                    <span className="company-list-arrow" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </nav>
            {selectedEntry ? renderDetail(selectedEntry) : null}
          </>
        )}
      </div>
    </section>
  );
}
