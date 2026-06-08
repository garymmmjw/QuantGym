import { Tag } from "../../components/common/Tag.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { isSocialNewsSource } from "./newsViewModel.js";

export function NewsList({
  t,
  items,
  emptyAllLabel,
  emptyFilterLabel,
  hasAnyItems,
  getItemTitle,
  getItemSourceType,
  getSourceTypeLabel,
  getVerificationLabel,
  formatNewsDate,
  inferSource,
  safeExternalUrl,
  normalizeSkills,
  skillDefs,
  onOpen
}) {
  if (!hasAnyItems) {
    return <EmptyState title={emptyAllLabel} />;
  }
  if (!items.length) {
    return <EmptyState title={emptyFilterLabel} />;
  }

  return (
    <div id="newsList" className="news-list">
      {items.map((item) => {
        const sourceType = getItemSourceType(item);
        const title = getItemTitle(item);
        return (
          <article
            key={item.id}
            className={`news-card content-card problem-card news-source-${sourceType}${item.readAt ? " read" : ""}`}
            data-news-id={item.id}
            tabIndex={0}
            role="button"
            aria-label={title}
            onClick={(event) => {
              if (event.target.closest("a")) return;
              onOpen(item.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onOpen(item.id);
            }}
          >
            <div className="problem-meta">
              <Tag label={formatNewsDate?.(item.publishedAt || item.createdAt)} variant="source" />
              <Tag label={item.source || inferSource?.(item.sourceUrl)} variant="topic" />
              <Tag label={getSourceTypeLabel(sourceType)} variant={sourceType === "official" ? "skill" : "source"} />
              <Tag
                label={getVerificationLabel(sourceType, item.sourceUrl)}
                variant={isSocialNewsSource(sourceType) ? "score" : "source"}
              />
              {item.readAt ? <Tag label={t("newsReadCount")} variant="score" /> : null}
            </div>
            <h3>{title}</h3>
            <p className="problem-prompt">{item.summary}</p>
            <div className="content-card-note">
              <strong>{t("newsImpact")}</strong>
              <span>{item.insight || t("newsFallbackInsight")}</span>
            </div>
            <div className="problem-meta">
              {normalizeSkills?.(item.skills).map((key) => {
                const skill = skillDefs[key];
                return skill ? <Tag key={key} label={skill.name} variant="skill" /> : null;
              })}
              {(item.tags || []).slice(0, 4).map((tag) => <Tag key={tag} label={tag} variant="source" />)}
            </div>
            <div className="problem-card-footer">
              {item.sourceUrl ? (
                <>
                  <a
                    className="content-card-link"
                    href={safeExternalUrl?.(item.sourceUrl) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {t("newsOpenOriginal")}
                  </a>
                  <i data-lucide="external-link" />
                </>
              ) : (
                <>
                  <span>{t("viewFullProblem")}</span>
                  <i data-lucide="chevron-right" />
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
