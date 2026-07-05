import { EmptyState } from "../../components/common/EmptyState.jsx";
import { getNewsTopicKey } from "./newsViewModel.js";

const TOPIC_TONES = {
  quantFirms: "tone-firms",
  marketStructure: "tone-market",
  aiInfra: "tone-tech",
  recruiting: "tone-hire"
};

function topicLabelFor(t, topicKey) {
  const labels = {
    quantFirms: t("newsTopicQuantFirms") || "公司",
    marketStructure: t("newsTopicMarketStructure") || "市场结构",
    aiInfra: t("newsTopicAiInfra") || "AI/算力",
    recruiting: t("newsTopicRecruiting") || "求职/社群"
  };
  return labels[topicKey] || "";
}

export function NewsList({
  t,
  items,
  emptyAllLabel,
  emptyFilterLabel,
  hasAnyItems,
  getItemTitle,
  getItemSourceType,
  getSourceTypeLabel,
  formatNewsDate,
  inferSource,
  onOpen
}) {
  if (!hasAnyItems) {
    return <EmptyState title={emptyAllLabel} />;
  }
  if (!items.length) {
    return <EmptyState title={emptyFilterLabel} />;
  }

  const [featured, ...rest] = items;
  const featuredTitle = featured ? getItemTitle(featured) : "";
  const featuredSourceType = featured ? getItemSourceType(featured) : "";
  const featuredTopicLabel = featured
    ? topicLabelFor(t, getNewsTopicKey(featured)) || getSourceTypeLabel(featuredSourceType)
    : "";
  const featuredSourceName = featured
    ? featured.source || inferSource?.(featured.sourceUrl) || getSourceTypeLabel(featuredSourceType)
    : "";

  return (
    <div id="newsList" className="news-list">
      {featured ? (
        <article
          key={featured.id}
          className={`news-featured news-source-${featuredSourceType}${featured.readAt ? " read" : ""}`}
          data-news-id={featured.id}
          tabIndex={0}
          role="button"
          aria-label={featuredTitle}
          onClick={(event) => {
            if (event.target.closest("a")) return;
            onOpen(featured.id);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onOpen(featured.id);
          }}
        >
          <div className="news-featured-glow" aria-hidden="true" />
          <div className="news-featured-body">
            <span className="news-featured-kicker">
              {`${featuredTopicLabel} · 头条`}
            </span>
            <h3 className="news-featured-title">{featuredTitle}</h3>
            <p className="news-featured-summary">{featured.summary}</p>
            <div className="news-featured-meta">
              <span className="news-featured-src">{featuredSourceName}</span>
              <span className="news-featured-time">{formatNewsDate?.(featured.publishedAt || featured.createdAt)}</span>
            </div>
          </div>
        </article>
      ) : null}
      {rest.map((item) => {
        const sourceType = getItemSourceType(item);
        const title = getItemTitle(item);
        const topicKey = getNewsTopicKey(item);
        const catLabel = topicLabelFor(t, topicKey) || getSourceTypeLabel(sourceType);
        const sourceName = item.source || inferSource?.(item.sourceUrl) || getSourceTypeLabel(sourceType);
        return (
          <article
            key={item.id}
            className={`news-card news-source-${sourceType}${item.readAt ? " read" : ""}`}
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
            <div className="news-card-meta">
              <span className={`news-cat-tag ${TOPIC_TONES[topicKey] || "tone-other"}`}>{catLabel}</span>
              <span className="news-src">{sourceName}</span>
              <span className="news-time">{formatNewsDate?.(item.publishedAt || item.createdAt)}</span>
            </div>
            <h3 className="news-card-title">{title}</h3>
            <p className="news-card-summary">{item.summary}</p>
          </article>
        );
      })}
    </div>
  );
}
