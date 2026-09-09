import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { getJobTimestamp } from "./jobDates.js";

const FILTERS = ["all", "internship", "fulltime"];

/* Design (QuantGym 求职.dc.html) shows 全部/实习/全职 in Chinese. The zh i18n
   dictionary now carries the same values; keep this local map as a fidelity
   guarantee (the dictionary file is owned by another workstream). */
const ZH_FILTER_LABELS = { all: "全部", internship: "实习", fulltime: "全职" };

/* Per-company brand colors for the logo tile (design: j.c values). */
const COMPANY_BRAND_COLORS = {
  "jane street": "#1b1a38",
  "citadel securities": "#0b6ea8",
  optiver: "#e0562e",
  imc: "#c8102e",
  drw: "#2f9be0",
  "jump trading": "#5b5ff5",
  hrt: "#7161f2",
  "hudson river trading": "#7161f2"
};

function companyBrandColor(company = "") {
  return COMPANY_BRAND_COLORS[String(company).trim().toLowerCase()] || "";
}

function companyAbbr(company = "") {
  const words = String(company).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) {
    const word = words[0];
    // Acronyms (IMC, DRW, HRT) keep up to 3 letters; word names take 2 (Optiver → OP).
    const size = word === word.toUpperCase() ? 3 : 2;
    return word.slice(0, size).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function atsDomain(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function JobsPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.jobs;
  const [filter, setFilter] = useState("all");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onJobsUpdated = () => setRevision((v) => v + 1);
    window.addEventListener("quantgym:jobs-updated", onJobsUpdated);
    return () => window.removeEventListener("quantgym:jobs-updated", onJobsUpdated);
  }, []);

  const jobs = useMemo(() => {
    return api.getJobs()
      .filter((job) => filter === "all" || job.type === filter)
      .sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
  }, [api, filter, revision]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".jobs-section", [jobs, filter]);

  const isZh = (appServices.getLanguage?.() || "zh") !== "en";
  const filterLabel = (value) => {
    if (isZh) return ZH_FILTER_LABELS[value] || value;
    return value === "all" ? t("allJobs") : value === "internship" ? t("internship") : t("fulltime");
  };

  return (
    <section className="jobs-section qg-support-page qg-jobs-page">
      <div className="section-heading jobs-header">
        <div className="jobs-header-copy">
          <span className="jobs-kicker">JOBS · 职位</span>
          <h2>
            求职 <span className="jobs-title-accent">Jobs</span>
          </h2>
          <small id="jobsSummary">查看岗位原始链接，保存到自己的申请清单。</small>
        </div>
        <div className="view-tabs" role="tablist" aria-label={t("jobsFilterAria")}>
          {FILTERS.map((value) => (
            <button
              key={value}
              className={`tab${filter === value ? " active" : ""}`}
              type="button"
              data-job-filter={value}
              aria-pressed={filter === value}
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
            >
              {filterLabel(value)}
            </button>
          ))}
          <button
            id="refreshJobsBtn"
            className="icon-button ghost"
            type="button"
            title={t("refreshJobs")}
            aria-label={t("refreshJobs")}
            onClick={() => api.refresh(true)}
          >
            <i data-lucide="refresh-cw" />
          </button>
        </div>
      </div>
      <div className="jobs-layout">
      <div id="jobsList" className="jobs-list">
        {!jobs.length ? <EmptyState title={t("searchEmpty")} /> : jobs.map((job) => {
          const domain = atsDomain(job.url);
          const isFulltime = job.type === "fulltime";
          const brandColor = companyBrandColor(job.company);
          return (
            <article
              key={job.id}
              className="job-card content-card problem-card"
              data-job-id={job.id}
              tabIndex={0}
              role="link"
              aria-label={`${t("applyNow")}: ${job.company} ${job.title}`}
              onClick={(event) => {
                if (event.target.closest("a")) return;
                pageApi.openExternalUrl?.(job.url);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                pageApi.openExternalUrl?.(job.url);
              }}
            >
              <div className="job-card-body">
                <div
                  className="job-logo"
                  aria-hidden="true"
                  style={brandColor ? { background: brandColor } : undefined}
                >
                  {companyAbbr(job.company)}
                </div>
                <div className="job-main">
                  <div className="job-title-row">
                    <span className="job-company">{job.company}</span>
                    <span className={`job-type-badge${isFulltime ? " fulltime" : ""}`}>
                      {filterLabel(isFulltime ? "fulltime" : "internship")}
                    </span>
                  </div>
                  <h3 className="job-title">{job.title}</h3>
                  <div className="job-meta">
                    <span className="job-location">
                      <i data-lucide="map-pin" />
                      {job.location}
                    </span>
                    <span className="job-posted">· {pageApi.formatNewsDate?.(job.postedAt) || job.postedAt}</span>
                  </div>
                  <div className="job-tags">
                    {job.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="job-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="job-actions">
                  {domain ? <span className="job-ats">via {domain}</span> : null}
                  <a
                    className="content-card-link job-apply-btn"
                    href={pageApi.safeExternalUrl?.(job.url) || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    投递
                  </a>
                  <Link className="job-save-btn" to={`/applications?${new URLSearchParams({company:job.company || '',role:job.title || '',location:job.location || '',url:pageApi.safeExternalUrl?.(job.url) || ''}).toString()}`}>加入申请追踪</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="jobs-side prep-jobs-note"><h3>我的申请追踪</h3><p>保存感兴趣的岗位，记录投递、OA 和面试进度。截止日期会显示在今日工作台。</p><Link to="/applications">打开申请追踪 →</Link></aside>
      </div>
    </section>
  );
}
