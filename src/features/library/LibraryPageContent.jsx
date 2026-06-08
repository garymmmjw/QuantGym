import { useEffect } from "react";
import { useLibraryPageModel } from "./libraryHooks.js";

function LibraryCard({ entry, labels, onAction }) {
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onAction(entry.id, entry.defaultAction);
  };

  return (
    <article
      className={`library-card${entry.compact ? " compact" : ""}${entry.kind === "questionSet" ? " question-set" : ""}`}
      data-library-id={entry.id}
      tabIndex={0}
      role="button"
      aria-label={`${entry.cardActionLabel}: ${entry.title}`}
      onKeyDown={handleKeyDown}
    >
      <button
        className="library-cover-button"
        type="button"
        data-library-id={entry.id}
        onClick={() => onAction(entry.id, entry.defaultAction)}
      >
        <img src={entry.coverUrl} alt={entry.title} loading="lazy" />
        <span>{entry.kindLabel}</span>
      </button>
      <div className="library-card-copy">
        <h3>{entry.title}</h3>
        <p>{entry.subtitle}</p>
        <div className="library-card-meta">
          <span>{entry.category}</span>
          <span>{entry.language}</span>
          {entry.problemCount ? <span>{entry.problemCount} {labels.problems}</span> : null}
        </div>
      </div>
      <div className="library-card-actions">
        {entry.readable ? (
          <button className="secondary-button compact" type="button" onClick={() => onAction(entry.id, "read")}>
            <i data-lucide="book-open" />
            {labels.read}
          </button>
        ) : null}
        {entry.practicable ? (
          <button className="secondary-button compact" type="button" onClick={() => onAction(entry.id, "practice")}>
            <i data-lucide="list-checks" />
            {labels.practice}
          </button>
        ) : null}
        {!entry.readable && !entry.practicable ? (
          <span className="library-card-note">{labels.referenceOnly}</span>
        ) : null}
      </div>
    </article>
  );
}

export function LibraryPageContent() {
  const model = useLibraryPageModel();
  const { view } = model;
  const { labels, reader } = view;

  useEffect(() => {
    if (reader.open) {
      document.body.classList.add("library-reader-open");
    } else {
      document.body.classList.remove("library-reader-open");
    }
    return () => document.body.classList.remove("library-reader-open");
  }, [reader.open]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && reader.open) model.closeReader();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [model, reader.open]);

  return (
    <>
      {model.alertMessage ? (
        <p className="library-alert" role="status">{model.alertMessage}</p>
      ) : null}

      <section className="library-section" aria-labelledby="libraryPageTitle">
        <header className="library-topbar">
          <label className="library-search">
            <i data-lucide="search" />
            <input
              id="librarySearch"
              type="search"
              placeholder="搜索书籍、题单、题源"
              value={view.query}
              onChange={(event) => model.setQuery(event.target.value)}
            />
          </label>
          <div id="libraryKindTabs" className="library-kind-tabs" role="tablist" aria-label="书城内容类型">
            {[
              ["all", "全部"],
              ["book", "书籍"],
              ["questionSet", "题单"]
            ].map(([kind, label]) => (
              <button
                key={kind}
                className={`library-chip${view.kindFilter === kind ? " active" : ""}`}
                type="button"
                data-library-kind={kind}
                aria-selected={view.kindFilter === kind}
                onClick={() => model.setKindFilter(kind)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="library-hero-row">
          <div className="library-reading-card">
            <span className="rank-label">本周阅读</span>
            <strong>0<span> 分钟</span></strong>
            <div className="library-week-bars" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
            <small>一 二 三 四 五 六 日</small>
          </div>
          <div id="libraryStats" className="library-stats" aria-live="polite">
            <span><strong>{view.stats.bookCount}</strong><small>{labels.books}</small></span>
            <span><strong>{view.stats.setCount}</strong><small>{labels.sets}</small></span>
            <span><strong>{view.stats.totalProblems}</strong><small>{labels.linkedProblems}</small></span>
          </div>
        </div>

        <section className="library-continue" aria-labelledby="libraryContinueTitle">
          <div className="library-block-heading">
            <div>
              <span className="rank-label">READING</span>
              <h2 id="libraryContinueTitle">继续阅读</h2>
            </div>
          </div>
          <div id="libraryContinueShelf" className="library-cover-rail">
            {view.continueReading.length
              ? view.continueReading.map((entry) => (
                <LibraryCard key={entry.id} entry={entry} labels={labels} onAction={model.handleAction} />
              ))
              : <p className="library-empty-inline">{labels.empty}</p>}
          </div>
        </section>

        <section className="library-block" aria-labelledby="libraryBookTitle">
          <div className="library-block-heading">
            <div>
              <span className="rank-label">BOOKS</span>
              <h2 id="libraryBookTitle">书籍</h2>
            </div>
          </div>
          <div id="libraryBookGrid" className="library-grid">
            {view.books.map((entry) => (
              <LibraryCard key={entry.id} entry={entry} labels={labels} onAction={model.handleAction} />
            ))}
          </div>
        </section>

        <section className="library-block" aria-labelledby="libraryQuestionTitle">
          <div className="library-block-heading">
            <div>
              <span className="rank-label">QUESTION SETS</span>
              <h2 id="libraryQuestionTitle">题单</h2>
            </div>
          </div>
          <div id="libraryQuestionGrid" className="library-grid question-grid">
            {view.questionSets.map((entry) => (
              <LibraryCard key={entry.id} entry={entry} labels={labels} onAction={model.handleAction} />
            ))}
          </div>
        </section>

        <p id="libraryEmpty" className={`library-empty${view.isEmpty ? "" : " hidden"}`}>
          {labels.empty}
        </p>
      </section>

      <section
        id="libraryReaderOverlay"
        className={`library-reader-overlay${reader.open ? "" : " hidden"}${reader.isOpening ? " is-opening" : ""}`}
        aria-label="PDF 阅读器"
        aria-modal="true"
        role="dialog"
        style={reader.coverUrl ? { "--reader-cover": `url("${reader.coverUrl}")` } : undefined}
        data-reader-type={reader.readType || "pdf"}
        onClick={(event) => {
          if (event.target === event.currentTarget) model.closeReader();
        }}
      >
        <div className="library-reader-shell">
          <header className="library-reader-header">
            <div className="library-reader-titlebar">
              <span className="library-reader-mark" aria-hidden="true"><i data-lucide="book-open" /></span>
              <div>
                <span id="libraryReaderMeta" className="rank-label">{reader.meta || "PDF"}</span>
                <h3 id="libraryReaderTitle">{reader.title || "阅读"}</h3>
              </div>
            </div>
            <div className="library-reader-actions">
              <a
                id="libraryReaderOpenNew"
                className="secondary-button compact"
                href={reader.openUrl || "#"}
                target="_blank"
                rel="noreferrer"
              >
                <i data-lucide="external-link" />
                {labels.openNew || "新窗口"}
              </a>
              <button
                id="libraryReaderClose"
                className="icon-button ghost"
                type="button"
                title="关闭"
                aria-label="关闭阅读器"
                onClick={model.closeReader}
              >
                <i data-lucide="x" />
              </button>
            </div>
          </header>
          <div className="library-reader-stage">
            <iframe
              id="libraryReaderFrame"
              className="library-reader-frame"
              title="PDF 阅读器"
              src={reader.embedUrl || "about:blank"}
            />
          </div>
        </div>
      </section>
    </>
  );
}
