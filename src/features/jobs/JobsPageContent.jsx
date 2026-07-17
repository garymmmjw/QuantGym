import { useEffect, useMemo, useState } from "react";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { getJobTimestamp } from "./jobDates.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

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

/* Static tracker rail from the design (投递追踪 demo board). */
const TRACKER_GROUPS = [
  {
    title: "想投",
    dot: "#c3c2d8",
    items: [
      { company: "HRT", abbr: "HRT", color: "#7161f2", stage: "官网 · 未开放", pill: "待投", pillColor: "#8988a8", pillBg: "#f2f1fb" }
    ]
  },
  {
    title: "已投",
    dot: "#5b5ff5",
    items: [
      { company: "Jane Street", abbr: "JS", color: "#1b1a38", stage: "OA 待发", pill: "已投", pillColor: "#5b5ff5", pillBg: "#eef0ff" },
      { company: "DRW", abbr: "DRW", color: "#2f9be0", stage: "简历筛选", pill: "已投", pillColor: "#5b5ff5", pillBg: "#eef0ff" }
    ]
  },
  {
    title: "面试中",
    dot: "#ff9f2e",
    items: [
      { company: "Optiver", abbr: "OP", color: "#e0562e", stage: "速算轮 · 明天", pill: "面试", pillColor: "#b3610a", pillBg: "#fff3dd" }
    ]
  },
  {
    title: "Offer",
    dot: "#16a06a",
    items: [
      { company: "IMC", abbr: "IMC", color: "#c8102e", stage: "Superday 通过", pill: "Offer", pillColor: "#0f9d63", pillBg: "#e3f7ee" }
    ]
  }
];

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
          <small id="jobsSummary">头部做市商 &amp; 对冲基金职位 · 直连官方 ATS · 投递全程追踪</small>
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
                  <button type="button" className="job-save-btn" onClick={(event) => event.stopPropagation()}>
                    收藏
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="jobs-side" aria-label="投递追踪">
        <div className="jobs-tracker">
          <div className="jobs-tracker-head">
            <div className="jobs-tracker-title">投递追踪</div>
            <span className="jobs-tracker-total">12 家 · 本季</span>
          </div>
          <div className="jobs-tracker-groups">
            {TRACKER_GROUPS.map((group) => (
              <div className="jobs-tracker-group" key={group.title}>
                <div className="jobs-tracker-group-head">
                  <span className="jobs-tracker-dot" style={{ background: group.dot }} aria-hidden="true" />
                  <span className="jobs-tracker-group-title">{group.title}</span>
                  <span className="jobs-tracker-count">{group.items.length}</span>
                </div>
                <div className="jobs-tracker-items">
                  {group.items.map((item) => (
                    <div className="jobs-tracker-item" key={`${group.title}-${item.company}`}>
                      <div className="jobs-tracker-logo" style={{ background: item.color }} aria-hidden="true">
                        {item.abbr}
                      </div>
                      <div className="jobs-tracker-item-main">
                        <div className="jobs-tracker-item-company">{item.company}</div>
                        <div className="jobs-tracker-item-stage">{item.stage}</div>
                      </div>
                      <span
                        className="jobs-tracker-pill"
                        style={{ color: item.pillColor, background: item.pillBg }}
                      >
                        {item.pill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="jobs-match-banner">
          <QuantyImage asset="trophy" size="small" />
          <div>
            <div className="jobs-match-kicker">匹配度最高</div>
            <div className="jobs-match-copy">
              你的画像与 <span className="jobs-match-accent">Optiver 速算轮</span> 匹配度 92% — 先去 Mental Math 冲一把。
            </div>
          </div>
        </div>
      </aside>
      </div>
    </section>
  );
}
