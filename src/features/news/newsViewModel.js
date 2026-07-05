import {
  inferNewsSourceType,
  isSocialNewsType,
  newsMatchesSourceFilter,
  newsMatchesTopic,
  normalizeNewsSourceType,
  sortNews
} from "../../modules/news/data.js";

export function filterNewsItems(items = [], filters = {}) {
  const sorted = sortNews(items);
  return sorted.filter((item) => (
    newsMatchesTopic(item, filters.topic || "all")
    && newsMatchesSourceFilter(item, filters.source || "all")
  ));
}

export function getNewsSourceType(item = {}, inferSourceType = inferNewsSourceType) {
  return normalizeNewsSourceType(item.sourceType || inferSourceType(item));
}

const NEWS_TOPIC_ORDER = ["quantFirms", "marketStructure", "aiInfra", "recruiting"];

export function getNewsTopicKey(item = {}) {
  return NEWS_TOPIC_ORDER.find((topic) => newsMatchesTopic(item, topic)) || "";
}

export function isSocialNewsSource(sourceType) {
  return isSocialNewsType(sourceType);
}

export function buildNewsStats(items = [], labels = {}) {
  return [
    { label: labels.saved || "Saved", value: items.length },
    { label: labels.auto || "News/RSS", value: items.filter((item) => newsMatchesSourceFilter(item, "news")).length },
    { label: labels.official || "Official", value: items.filter((item) => newsMatchesSourceFilter(item, "official")).length },
    { label: labels.social || "Social", value: items.filter((item) => newsMatchesSourceFilter(item, "social")).length },
    { label: labels.read || "Read", value: items.filter((item) => item.readAt).length }
  ];
}
