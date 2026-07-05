import { useCallback, useEffect, useMemo, useState } from "react";
import { useLibraryPageModel } from "./libraryHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

// Design taxonomy (QuantGym 资料库.dc.html): every shelf item is one of
// 有题册 / 教材 / 趣题集, derived from the real catalog metadata.
const DESIGN_KIND_PILL_KEYS = {
  problems: "libKindProblems",
  textbook: "libKindTextbook",
  puzzle: "libKindPuzzle"
};

function deriveDesignKind(entry) {
  const category = (entry.category || "").toLowerCase();
  if (category.includes("puzzle")) return "puzzle";
  if (entry.kind === "questionSet" || category.includes("interview")) return "problems";
  return "textbook";
}

function LibraryCard({ entry, labels, onAction, t }) {
  const designKind = deriveDesignKind(entry);
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
        <span className={`library-kind-pill kind-${designKind}`}>{t(DESIGN_KIND_PILL_KEYS[designKind])}</span>
        {entry.progress > 0 ? (
          <span className="library-cover-progress" aria-hidden="true">
            <span className="library-cover-progress-fill" style={{ width: `${Math.min(100, entry.progress)}%` }} />
          </span>
        ) : null}
      </button>
      <div className="library-card-copy">
        <h3>{entry.title}</h3>
        <p>{entry.subtitle}</p>
        <div className="library-card-meta">
          <span>{entry.category}</span>
          <span>{entry.language}</span>
        </div>
      </div>
      <div className="library-card-actions">
        <span className={`library-card-stat${entry.progress > 0 ? " has-progress" : ""}`}>
          {entry.progress > 0
            ? t("libContinueReading", { percent: Math.min(100, entry.progress) })
            : entry.problemCount > 0
              ? `${entry.problemCount} ${labels.problems || t("libKindProblems")}`
              : entry.readable
                ? t("libReadOnline")
                : ""}
        </span>
        {entry.readable ? (
          <button className="secondary-button compact library-read-btn" type="button" onClick={() => onAction(entry.id, "read")}>
            <i data-lucide="book-open" />
            {labels.read}
          </button>
        ) : null}
        {entry.practicable ? (
          <button className="secondary-button compact library-practice-btn" type="button" onClick={() => onAction(entry.id, "practice")}>
            <i data-lucide="list-checks" />
            {t("libGoPractice")}
          </button>
        ) : null}
        {!entry.readable && !entry.practicable ? (
          <span className="library-card-note">{labels.referenceOnly}</span>
        ) : null}
      </div>
    </article>
  );
}

// User decision #8: the PDF renders in a cross-origin iframe, so the app can
// never observe the real page — reading position is declared by the user here
// (「我读到第 N 页」for books with a page count in the catalog, a percent
// slider otherwise). Copy explicitly says it is hand-marked, never automatic.
function ReaderProgressControl({ reader, onSave, t }) {
  const pageCount = reader.pageCount > 0 ? reader.pageCount : 0;
  const savedPercent = Math.min(100, Math.max(0, reader.progress?.percent || 0));
  const savedPage = reader.progress?.page || 0;
  const [pageValue, setPageValue] = useState(() => {
    if (savedPage > 0) return String(savedPage);
    if (savedPercent > 0 && pageCount > 0) {
      return String(Math.max(1, Math.round((savedPercent / 100) * pageCount)));
    }
    return "";
  });
  const [percentValue, setPercentValue] = useState(savedPercent);

  if (pageCount > 0) {
    return (
      <footer className="library-reader-progress" data-progress-mode="page">
        <span className="library-reader-progress-label">{t("libReaderMarkLabel")}</span>
        <span className="library-reader-progress-pages">
          {t("libReaderPagePrefix")}
          <input
            className="library-reader-progress-page-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={pageCount}
            value={pageValue}
            aria-label={t("libReaderPageAria", { total: pageCount })}
            onChange={(event) => {
              setPageValue(event.target.value);
              const parsed = Math.floor(Number(event.target.value));
              if (!Number.isFinite(parsed) || parsed < 1) return;
              onSave({ page: Math.min(pageCount, parsed) });
            }}
            onBlur={() => {
              const parsed = Math.floor(Number(pageValue));
              if (!Number.isFinite(parsed) || parsed < 1) {
                setPageValue(savedPage > 0 ? String(savedPage) : "");
                return;
              }
              setPageValue(String(Math.min(pageCount, parsed)));
            }}
          />
          {t("libReaderPageSuffix", { total: pageCount })}
        </span>
        <span className="library-reader-progress-note">{t("libReaderNote")}</span>
      </footer>
    );
  }

  return (
    <footer className="library-reader-progress" data-progress-mode="percent">
      <span className="library-reader-progress-label">{t("libReaderMarkLabel")}</span>
      <input
        className="library-reader-progress-slider"
        type="range"
        min={0}
        max={100}
        step={1}
        value={percentValue}
        aria-label={t("libReaderPercentAria")}
        style={{ "--qg-progress-pct": `${percentValue}%` }}
        onChange={(event) => {
          const next = Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0)));
          setPercentValue(next);
          onSave({ percent: next });
        }}
      />
      <span className="library-reader-progress-readout">{percentValue}%</span>
      <span className="library-reader-progress-note">{t("libReaderNote")}</span>
    </footer>
  );
}

export function LibraryPageContent() {
  const model = useLibraryPageModel();
  const { view, t } = model;
  const { labels, reader } = view;
  const { closeReader } = model;

  // Design filter chips work on the derived kinds (有题册/教材/趣题集), while
  // the store keeps its own "all" filter so no real data gets hidden upstream.
  const [designKindFilter, setDesignKindFilter] = useState("all");
  const [activeEntryId, setActiveEntryId] = useState("");
  // Shelf entrance (design lbRise) plays once per route mount: `.is-entering`
  // stays on the section only for the entrance window, so filter switches or
  // store refreshes that remount cards never replay the animation.
  const [shelfEntered, setShelfEntered] = useState(false);

  const allEntries = useMemo(
    () => [...(view.books || []), ...(view.questionSets || [])],
    [view]
  );

  const shelfHasEntries = allEntries.length > 0;

  useEffect(() => {
    if (shelfEntered || !shelfHasEntries) return undefined;
    // 280ms rise + max 400ms nth-child stagger, plus buffer.
    const timer = window.setTimeout(() => setShelfEntered(true), 900);
    return () => window.clearTimeout(timer);
  }, [shelfEntered, shelfHasEntries]);

  const shelfEntries = useMemo(
    () => (designKindFilter === "all"
      ? allEntries
      : allEntries.filter((entry) => deriveDesignKind(entry) === designKindFilter)),
    [allEntries, designKindFilter]
  );

  const shelfIsEmpty = shelfEntries.length === 0;
  const readerEntry = useMemo(
    () => allEntries.find((entry) => entry.id === activeEntryId) || null,
    [allEntries, activeEntryId]
  );

  const onCardAction = useCallback((entryId, action) => {
    setActiveEntryId(entryId);
    return model.handleAction(entryId, action);
  }, [model.handleAction]);

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
      if (event.key === "Escape" && reader.open) closeReader();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeReader, reader.open]);

  useScopedRefreshIcons(model.refreshIcons, ".library-section", [view, designKindFilter]);
  useScopedRefreshIcons(model.refreshIcons, ".library-reader-overlay", [reader.open]);

  return (
    <>
      {model.alertMessage ? (
        <p className="library-alert" role="status">{model.alertMessage}</p>
      ) : null}

      <section
        className={`library-section qg-support-page qg-library-page${shelfEntered ? "" : " is-entering"}`}
        aria-labelledby="libraryPageTitle"
      >
        <header className="library-topbar library-header">
          <div className="library-header-copy">
            <span className="library-kicker">{t("libKicker", { count: view.stats.bookCount + view.stats.setCount })}</span>
            <h1 id="libraryPageTitle">{t("libTitle")} <span className="library-title-en">Library</span></h1>
            <p>{t("libSubtitle")}</p>
          </div>
          <label className="library-search">
            <i data-lucide="search" />
            <input
              id="librarySearch"
              type="search"
              placeholder={t("libSearchPlaceholder")}
              value={view.query}
              onChange={(event) => model.setQuery(event.target.value)}
            />
          </label>
        </header>

        <div id="libraryKindTabs" className="library-kind-tabs" role="tablist" aria-label={t("libKindTabsAria")}>
          {[
            ["all", t("libKindAll")],
            ["problems", t("libKindProblems")],
            ["textbook", t("libKindTextbook")],
            ["puzzle", t("libKindPuzzleSet")]
          ].map(([kind, label]) => (
            <button
              key={kind}
              className={`library-chip${designKindFilter === kind ? " active" : ""}`}
              type="button"
              data-library-kind={kind}
              aria-selected={designKindFilter === kind}
              onClick={() => setDesignKindFilter(kind)}
            >
              {label}
            </button>
          ))}
        </div>

        <div id="libraryStats" className="library-stats" aria-live="polite" hidden>
          <span><strong>{view.stats.bookCount}</strong><small>{labels.books}</small></span>
          <span><strong>{view.stats.setCount}</strong><small>{labels.sets}</small></span>
          <span><strong>{view.stats.totalProblems}</strong><small>{labels.linkedProblems}</small></span>
        </div>

        <section
          className={`library-continue${view.continueReading.length ? " qg-has-progress" : ""}`}
          aria-labelledby="libraryContinueTitle"
          hidden={view.continueReading.length === 0}
        >
          <div className="library-block-heading">
            <div>
              <span className="rank-label">READING</span>
              <h2 id="libraryContinueTitle">{t("libContinueTitle")}</h2>
            </div>
          </div>
          <div id="libraryContinueShelf" className="library-cover-rail">
            {view.continueReading.length
              ? view.continueReading.map((entry) => (
                <LibraryCard key={entry.id} entry={entry} labels={labels} onAction={onCardAction} t={t} />
              ))
              : <p className="library-empty-inline">{labels.empty}</p>}
          </div>
        </section>

        <div className="library-shelf">
          <section className="library-block" aria-labelledby="libraryBookTitle">
            <h2 id="libraryBookTitle" className="library-block-label">{t("libBooksTitle")}</h2>
            <div id="libraryBookGrid" className="library-grid">
              {shelfEntries.map((entry) => (
                <LibraryCard key={entry.id} entry={entry} labels={labels} onAction={onCardAction} t={t} />
              ))}
            </div>
          </section>

          <section className="library-block" aria-labelledby="libraryQuestionTitle" hidden={true}>
            <h2 id="libraryQuestionTitle" className="library-block-label">{t("libQuestionSetsTitle")}</h2>
            <div id="libraryQuestionGrid" className="library-grid question-grid" />
          </section>
        </div>

        <div className={`library-empty-state${shelfIsEmpty ? "" : " hidden"}`}>
          <img src="/assets/generated/playful-precision/mascot-search.png" alt="" className="library-empty-mascot" loading="lazy" />
          <p id="libraryEmpty" className="library-empty">
            {view.query ? t("libEmptyQuery", { query: view.query }) : t("libEmptyGeneric")}
          </p>
          <p className="library-empty-hint">{t("libEmptyHint")}</p>
        </div>
      </section>

      <section
        id="libraryReaderOverlay"
        className={`library-reader-overlay${reader.open ? "" : " hidden"}${reader.isOpening ? " is-opening" : ""}`}
        aria-label={t("libReaderOverlayAria")}
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
              {reader.coverUrl ? (
                <img className="library-reader-cover" src={reader.coverUrl} alt="" aria-hidden="true" />
              ) : null}
              <div className="library-reader-heading">
                <h3 id="libraryReaderTitle">{reader.title || t("libReaderDefaultTitle")}</h3>
                <span id="libraryReaderMeta" className="rank-label">{reader.meta || "PDF"}</span>
              </div>
            </div>
            <div className="library-reader-actions">
              {readerEntry?.practicable ? (
                <button
                  className="library-reader-drill"
                  type="button"
                  onClick={() => {
                    model.closeReader();
                    model.handleAction(readerEntry.id, "practice");
                  }}
                >
                  {t("libReaderGoPractice")}
                </button>
              ) : null}
              <a
                id="libraryReaderOpenNew"
                className="secondary-button compact"
                href={reader.openUrl || "#"}
                target="_blank"
                rel="noreferrer"
              >
                <i data-lucide="external-link" />
                {labels.openNew || t("libReaderOpenNew")}
              </a>
              <button
                id="libraryReaderClose"
                className="icon-button ghost"
                type="button"
                title={t("libReaderCloseTitle")}
                aria-label={t("libReaderCloseAria")}
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
              title={t("libReaderOverlayAria")}
              src={reader.embedUrl || "about:blank"}
            />
          </div>
          {reader.open && reader.entryId ? (
            <ReaderProgressControl
              key={reader.entryId}
              reader={reader}
              onSave={(progress) => model.setReadingProgress(reader.entryId, progress)}
              t={t}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
