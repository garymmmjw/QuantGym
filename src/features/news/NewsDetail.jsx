import { Tag } from "../../components/common/Tag.jsx";

export function NewsDetail({
  t,
  item,
  getItemTitle,
  getItemSourceType,
  getSourceTypeLabel,
  getVerificationLabel,
  formatNewsDate,
  inferSource,
  safeExternalUrl,
  normalizeSkills,
  skillDefs,
  onBack
}) {
  if (!item) return null;
  const sourceType = getItemSourceType(item);
  const title = getItemTitle(item);

  return (
    <article id="newsDetail" className="news-detail">
      <div className="news-detail-header">
        <button id="newsBackBtn" className="icon-button ghost" type="button" title={t("newsBack")} aria-label={t("newsBack")} onClick={onBack}>
          <i data-lucide="arrow-left" />
        </button>
        <span id="newsDetailReadBadge" className={`read-badge${item.readAt ? "" : " hidden"}`}>
          {t("newsReadBadge") || "已读"}
        </span>
      </div>
      <div id="newsDetailMeta" className="news-detail-meta">
        {[
          formatNewsDate?.(item.publishedAt || item.createdAt),
          item.source || inferSource?.(item.sourceUrl),
          getSourceTypeLabel(sourceType),
          getVerificationLabel(sourceType, item.sourceUrl)
        ].filter(Boolean).join(" - ")}
      </div>
      <h2 id="newsDetailTitle">{title}</h2>
      <p id="newsDetailSummary">{item.summary}</p>
      <div className="news-impact">
        <strong>{t("newsImpact")}</strong>
        <span id="newsDetailInsight">{item.insight || t("newsFallbackInsight")}</span>
      </div>
      <div id="newsDetailPills" className="pill-row">
        <Tag label={getSourceTypeLabel(sourceType)} />
        {normalizeSkills?.(item.skills).map((key) => {
          const skill = skillDefs[key];
          return skill ? <Tag key={key} label={skill.name} /> : null;
        })}
        {(item.tags || []).slice(0, 6).map((tag) => <Tag key={tag} label={tag} variant="muted-pill" />)}
      </div>
      {item.sourceUrl ? (
        <a id="newsDetailLink" className="news-link" href={safeExternalUrl?.(item.sourceUrl) || "#"} target="_blank" rel="noreferrer">
          {t("newsOpenOriginal")}
        </a>
      ) : null}
    </article>
  );
}
