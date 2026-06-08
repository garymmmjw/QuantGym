import { EmptyState } from "../../components/common/EmptyState.jsx";
import { getPaginationWindow } from "../../modules/problems/pagination.js";

function CompanyMark({ company, initials }) {
  return (
    <span
      className="company-mark small"
      style={{ "--company-color": company.color, "--company-accent": company.accent }}
      aria-hidden="true"
    >
      {company.short || initials?.(company.name) || ""}
    </span>
  );
}

export function ProblemCollectionGrid({ entries = [], filters = {}, leetcodeExpanded, isEnglish, onCollectionClick }) {
  const modeLabel = (entry) => {
    if (entry.mode === "leetcode") return "Featured list";
    if (entry.mode === "source") return "Source set";
    return "Topic set";
  };

  return entries.map((entry) => {
    const percent = Math.round((entry.done / Math.max(entry.total, 1)) * 100);
    const active = entry.mode === "leetcode"
      ? leetcodeExpanded
      : entry.mode === "source"
        ? filters.source === entry.sourceSlug
        : filters.theme === entry.theme;

    return (
      <button
        key={entry.id}
        type="button"
        className={`problem-collection-card accent-${entry.accent}${active ? " active" : ""}`}
        data-problem-collection={entry.id}
        style={{ "--value": `${percent}%` }}
        onClick={onCollectionClick}
      >
        <span className="problem-collection-art"><span><i data-lucide={entry.icon} /></span></span>
        <span className="problem-collection-copy">
          <em>{modeLabel(entry)}</em>
          <strong>{entry.title}</strong>
          <small>{entry.description}</small>
        </span>
        <span className="problem-collection-bottom">
          <span><strong>{entry.done}</strong> / {entry.total}</span>
          <small>{isEnglish ? "completed" : "完成进度"}</small>
          <i aria-hidden="true"><span /></i>
        </span>
        <span className="problem-collection-go" aria-hidden="true"><i data-lucide="arrow-up-right" /></span>
      </button>
    );
  });
}

export function ProblemLeetcodeHotList({ items = [], doneIds = [], expanded, isEnglish, t, emptyText, onToggleDone }) {
  if (!expanded) return null;
  if (!items.length) return emptyText ? <EmptyState title={emptyText} /> : null;

  return items.map((item) => {
    const isDone = doneIds.includes(item.id);
    return (
      <article key={item.id} className={`leetcode-hot-item${isDone ? " is-done" : ""}`}>
        <button
          className="leetcode-hot-done"
          type="button"
          data-leetcode-hot-toggle={item.id}
          aria-label={isDone ? t("leetcodeHotUndo") : t("leetcodeHotMarkDone")}
          onClick={() => onToggleDone(item.id)}
        >
          <i data-lucide={isDone ? "check" : "circle"} />
        </button>
        <div className="leetcode-hot-main">
          <strong>{item.number}. {item.title}</strong>
          <span>
            {item.topic} · {item.difficulty}
            {isDone ? ` · ${t("leetcodeHotDone")}` : ""}
          </span>
        </div>
        <a
          className="leetcode-hot-link"
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${t("leetcodeHotOpen")}: ${item.title}`}
        >
          <i data-lucide="external-link" />
        </a>
      </article>
    );
  });
}

export function ProblemFilterPanel({ chrome, onApplyFilter }) {
  if (!chrome) return null;
  const { theme, difficulty } = chrome;

  return (
    <>
      <div className="problem-theme-heading">
        <strong>标签筛选</strong>
        <span id="problemThemeSummary">{theme.summary}</span>
      </div>
      <div id="problemThemeFilter" className="problem-theme-filter" role="listbox" aria-label="题目主题筛选">
        {theme.entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`problem-theme-chip${theme.active === entry.key ? " active" : ""}`}
            data-problem-theme={entry.key}
            onClick={() => onApplyFilter({ type: "theme", value: entry.key })}
          >
            <span>{entry.label}</span>
            <small>{entry.count}</small>
          </button>
        ))}
      </div>
      <div className="problem-difficulty-filter" id="problemDifficultyFilter" role="tablist" aria-label="题目难度筛选">
        {difficulty.entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`segment${difficulty.active === entry.key ? " active" : ""}`}
            data-problem-difficulty={entry.key}
            aria-pressed={difficulty.active === entry.key}
            title={entry.title}
            onClick={() => onApplyFilter({ type: "difficulty", value: entry.key })}
          >
            {entry.label}
            <small>{entry.count}</small>
          </button>
        ))}
      </div>
    </>
  );
}

export function ProblemCompanyPanel({ chrome, getInitials, t, onApplyFilter }) {
  if (!chrome) return null;

  return (
    <>
      <div className="problem-company-heading">
        <div>
          <span className="rank-label">FIRMS</span>
          <h3 id="problemCompanyTitle">{chrome.title}</h3>
          <p id="problemCompanySummary">{chrome.summary}</p>
        </div>
        <button
          id="problemCompanyClearBtn"
          className={`secondary-button compact${chrome.showClear ? "" : " hidden"}`}
          type="button"
          onClick={() => onApplyFilter({ type: "clearCompany" })}
        >
          <i data-lucide="rotate-ccw" />
          {t("allCompanies")}
        </button>
      </div>
      <div id="problemCompanyList" className="problem-company-list" aria-label="公司题库">
        {chrome.entries.map(({ company, stats }) => (
          <button
            key={company.slug}
            type="button"
            className={`problem-company-card${chrome.activeCompany === company.slug ? " active" : ""}`}
            data-problem-company={company.slug}
            style={{ "--company-color": company.color, "--company-accent": company.accent }}
            aria-pressed={chrome.activeCompany === company.slug}
            onClick={() => onApplyFilter({ type: "company", value: company.slug })}
          >
            <CompanyMark company={company} initials={getInitials} />
            <span className="problem-company-main">
              <strong>{company.name}</strong>
              <small>Tier {company.tier} · {company.focus.join(" / ")}</small>
            </span>
            <span className="problem-company-count">
              <b>{stats.total}</b>
              <small>{t("companyQuestions")}</small>
            </span>
            <span className="problem-company-progress">
              <i style={{ width: `${stats.percent}%` }} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

export function ProblemCompletionPanel({ items = [] }) {
  return items.map((item, index) => {
    const percent = Math.round((Number(item.done || 0) / Math.max(Number(item.total || 0), 1)) * 100);
    return (
      <div
        key={item.key}
        className="effect-progress-row"
        style={{ "--value": `${percent}%`, "--accent-index": String(index) }}
      >
        <div>
          <strong>{item.label}</strong>
          <span>{item.done} / {item.total}</span>
        </div>
        <i aria-hidden="true"><span /></i>
      </div>
    );
  });
}

export function ProblemPaginationNav({ pagination, isEnglish, onNavigate }) {
  if (!pagination?.visible) return null;
  const pages = getPaginationWindow(pagination.page, pagination.totalPages);

  return (
    <>
      <span className="problem-pagination-summary">{pagination.summary}</span>
      <button
        type="button"
        className="problem-page-button"
        data-problem-page="prev"
        data-total-pages={pagination.totalPages}
        disabled={pagination.page <= 1}
        onClick={onNavigate}
      >
        <i data-lucide="chevron-left" />
        <span>{isEnglish ? "Previous" : "上一页"}</span>
      </button>
      {pages.map((item, index) => (
        item === "gap" ? (
          <span key={`gap-${index}`} className="problem-pagination-gap">...</span>
        ) : (
          <button
            key={item}
            type="button"
            className={`problem-page-button${item === pagination.page ? " active" : ""}`}
            data-problem-page={String(item)}
            data-total-pages={pagination.totalPages}
            aria-current={item === pagination.page ? "page" : "false"}
            onClick={onNavigate}
          >
            {item}
          </button>
        )
      ))}
      <button
        type="button"
        className="problem-page-button"
        data-problem-page="next"
        data-total-pages={pagination.totalPages}
        disabled={pagination.page >= pagination.totalPages}
        onClick={onNavigate}
      >
        <i data-lucide="chevron-right" />
        <span>{isEnglish ? "Next" : "下一页"}</span>
      </button>
      <form className="problem-pagination-jump" data-problem-page-jump="true" noValidate onSubmit={onNavigate}>
        <label>
          <span>{isEnglish ? "Go to" : "前往"}</span>
          <input
            data-problem-page-input
            data-total-pages={pagination.totalPages}
            type="number"
            min="1"
            max={pagination.totalPages}
            defaultValue={pagination.page}
            inputMode="numeric"
            aria-label={isEnglish ? "Page number" : "页码"}
            onKeyDown={onNavigate}
          />
          <span>{isEnglish ? "page" : "页"}</span>
        </label>
        <button className="problem-page-button compact" type="submit">{isEnglish ? "Go" : "跳转"}</button>
      </form>
    </>
  );
}
