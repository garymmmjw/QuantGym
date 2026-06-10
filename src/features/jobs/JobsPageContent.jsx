import { useEffect, useMemo, useState } from "react";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { Tag } from "../../components/common/Tag.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const FILTERS = ["all", "internship", "fulltime"];

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
    const jobTime = (job) => new Date(job?.postedAt || job?.createdAt || 0).getTime();
    return api.getJobs()
      .filter((job) => filter === "all" || job.type === filter)
      .sort((a, b) => jobTime(b) - jobTime(a));
  }, [api, filter, revision]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".jobs-section", [jobs, filter]);

  return (
    <section className="jobs-section">
      <div className="section-heading">
        <div>
          <h2>{t("jobsModule")}</h2>
          <small id="jobsSummary">{t("jobsSummary")}</small>
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
              {value === "all" ? t("allJobs") : value === "internship" ? t("internship") : t("fulltime")}
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
      <div id="jobsList" className="jobs-list">
        {!jobs.length ? <EmptyState title={t("searchEmpty")} /> : jobs.map((job) => (
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
            <h3>{job.title}</h3>
            <div className="problem-meta">
              <Tag label={job.type === "fulltime" ? t("fulltime") : t("internship")} variant={`difficulty ${job.type === "fulltime" ? "medium" : "easy"}`} />
              <Tag label={job.company} variant="topic" />
              <Tag label={pageApi.formatNewsDate?.(job.postedAt || job.createdAt)} variant="source" />
            </div>
            <div className="problem-prompt">{api.formatPrompt?.(job)}</div>
            <div className="problem-meta">
              {job.tags.slice(0, 4).map((tag) => <Tag key={tag} label={tag} variant="skill" />)}
            </div>
            <div className="problem-card-footer">
              <a className="content-card-link" href={pageApi.safeExternalUrl?.(job.url) || "#"} target="_blank" rel="noreferrer">{t("applyNow")}</a>
              <i data-lucide="external-link" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
