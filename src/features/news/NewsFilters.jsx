const TOPIC_OPTIONS = ["all", "quantFirms", "marketStructure", "aiInfra", "recruiting"];
const SOURCE_OPTIONS = ["all", "news", "official", "social"];

export function NewsFilters({
  t,
  topicFilter,
  sourceFilter,
  onTopicChange,
  onSourceChange
}) {
  const topicLabels = {
    all: t("newsTopicAll") || "全部",
    quantFirms: t("newsTopicQuantFirms") || "公司",
    marketStructure: t("newsTopicMarketStructure") || "市场结构",
    aiInfra: t("newsTopicAiInfra") || "AI/算力",
    recruiting: t("newsTopicRecruiting") || "求职/社群"
  };
  const sourceLabels = {
    all: t("newsSourceAll") || "全部来源",
    news: t("newsSourceNews") || "新闻/RSS",
    official: t("newsSourceOfficial") || "官方",
    social: t("newsSourceSocial") || "社交线索"
  };

  return (
    <div className="news-filter-row">
      <div id="newsTopicFilter" className="segmented news-topic-filter" role="tablist" aria-label={t("newsTopicFilterAria")}>
        {TOPIC_OPTIONS.map((topic) => (
          <button
            key={topic}
            className={`segment${topicFilter === topic ? " active" : ""}`}
            type="button"
            data-news-topic={topic}
            aria-selected={topicFilter === topic}
            onClick={() => onTopicChange(topic)}
          >
            {topicLabels[topic] || topic}
          </button>
        ))}
      </div>
      <div id="newsSourceFilter" className="segmented news-source-filter" role="tablist" aria-label={t("newsSourceFilterAria")}>
        {SOURCE_OPTIONS.map((source) => (
          <button
            key={source}
            className={`segment${sourceFilter === source ? " active" : ""}`}
            type="button"
            data-news-source-filter={source}
            aria-selected={sourceFilter === source}
            onClick={() => onSourceChange(source)}
          >
            {sourceLabels[source] || source}
          </button>
        ))}
      </div>
    </div>
  );
}
