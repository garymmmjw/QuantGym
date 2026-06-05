import { requestJson } from '../../api/client.js';
import { stableSlugId } from '../../lib/id.js';
import { parseTags as parseTagsValue } from '../../lib/text.js';
import { inferSourceFromUrl } from '../../lib/url.js';

export function normalizeNewsItem(raw, options = {}) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const title = cleanNewsText(raw?.title || "");
  const titleZh = cleanNewsText(raw?.titleZh || title);
  const summary = cleanNewsText(raw?.summary || raw?.description || "");
  const publishedAt = String(raw?.publishedAt || raw?.date || raw?.createdAt || new Date().toISOString()).trim();
  const parseTags = options.parseTags || parseTagsValue;
  const tags = parseTags(raw?.tags || "");
  const inferredSkill = inferNewsSkill(`${title} ${titleZh} ${summary} ${tags.join(" ")}`);
  const normalizeSkills = options.normalizeSkills || ((value) => Array.isArray(value) ? value : parseTagsValue(value));
  const skills = normalizeSkills(raw?.skills || raw?.skill || raw?.primarySkill || inferredSkill);
  const stableId = options.stableId || defaultStableNewsId;
  const makeId = options.makeId || (() => Math.random().toString(36).slice(2));
  const id = raw?.id || stableId(titleZh || title || sourceUrl || makeId(), sourceUrl);
  const sourceType = normalizeNewsSourceType(raw?.sourceType || raw?.type || raw?.platform || inferNewsSourceType({ ...raw, sourceUrl }));
  return {
    id,
    title,
    titleZh,
    source: cleanNewsSource(raw?.source, sourceUrl, {
      inferSource: options.inferSource
    }),
    sourceType,
    sourceUrl,
    publishedAt,
    tags,
    skills,
    summary,
    insight: cleanNewsText(raw?.insight || raw?.takeaway || ""),
    readAt: raw?.readAt || "",
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

export function mergeNews(seed = [], saved = [], options = {}) {
  const byId = new Map();
  [...seed, ...saved].forEach((item) => {
    const normalized = normalizeNewsItem(item, options);
    if (isLowQualityNews(normalized)) return;
    const key = newsDedupeKey(normalized);
    const previous = byId.get(key);
    byId.set(key, previous ? mergeDuplicateNews(previous, normalized, options) : normalized);
  });
  return sortNews([...byId.values()]);
}

export function normalizeNewsSourceType(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases = {
    rss: "rss",
    feed: "rss",
    news: "news",
    media: "news",
    article: "news",
    official: "official",
    company: "official",
    announcement: "official",
    linkedin: "linkedin",
    linkedinsignal: "linkedin",
    xiaohongshu: "xiaohongshu",
    rednote: "xiaohongshu",
    xhs: "xiaohongshu",
    social: "social",
    manual: "manual"
  };
  return aliases[key] || "news";
}

export function inferNewsSourceType(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const source = String(raw?.source || "").toLowerCase();
  let host = "";
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }
  const text = `${host} ${source}`.toLowerCase();
  if (/linkedin\.com/.test(text)) return "linkedin";
  if (/xiaohongshu\.com|xhslink\.com|rednote/.test(text)) return "xiaohongshu";
  if (/janestreet\.com|citadel(?:securities)?\.com|optiver\.com|imc\.com|jumptrading\.com|hudsonrivertrading\.com|twosigma\.com|deshaw\.com|virtu\.com|drw\.com|flowtraders\.com|nasdaq\.com|nyse\.com|cmegroup\.com|sec\.gov/.test(text)) {
    return "official";
  }
  if (/rss|feed|google news|news\.google\.com/.test(text)) return "rss";
  if (!sourceUrl && /linkedin|小红书|xiaohongshu|rednote|social/.test(text)) return "social";
  if (!sourceUrl && /manual|手动/.test(text)) return "manual";
  return "news";
}

export function isSocialNewsType(sourceType) {
  return ["linkedin", "xiaohongshu", "social", "manual"].includes(normalizeNewsSourceType(sourceType));
}

export function cleanNewsText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanNewsSource(value, sourceUrl = "", options = {}) {
  const inferSource = options.inferSource || inferSourceFromUrl;
  const inferred = inferSource(sourceUrl);
  const source = cleanNewsText(value || inferred || "Market News");
  const sourceAliases = {
    "news.google.com": "Google News",
    "m.investing.com": "Investing.com",
    "investing.com": "Investing.com",
    "www.msn.com": "MSN",
    "msn.com": "MSN"
  };
  if (sourceAliases[source.toLowerCase()]) return sourceAliases[source.toLowerCase()];
  const hasLatinOrCjk = /[A-Za-z\u4e00-\u9fa5]/.test(source);
  if (!hasLatinOrCjk) return inferred && inferred !== "manual" ? inferred : "Market News";
  if (source.length > 34) return `${source.slice(0, 31).trim()}...`;
  return source;
}

export function canonicalNewsTitle(value) {
  return cleanNewsText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b(stock|shares?)\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim();
}

export function newsDedupeKey(item) {
  const title = canonicalNewsTitle(item.titleZh || item.title);
  if (title) return `title:${title}`;
  return `id:${item.id}`;
}

export function mergeDuplicateNews(previous, next, options = {}) {
  const newer = newsTime(next) > newsTime(previous) ? next : previous;
  const older = newer === next ? previous : next;
  const latestIso = options.latestIso || ((a, b) => b || a || "");
  return {
    ...older,
    ...newer,
    id: older.id || newer.id,
    tags: [...new Set([...(older.tags || []), ...(newer.tags || [])])].slice(0, 8),
    skills: [...new Set([...(older.skills || []), ...(newer.skills || [])])],
    summary: (newer.summary || "").length >= (older.summary || "").length ? newer.summary : older.summary,
    insight: newer.insight || older.insight || "",
    readAt: older.readAt || newer.readAt || "",
    updatedAt: latestIso(older.updatedAt, newer.updatedAt)
  };
}

export function isLowQualityNews(item) {
  const id = String(item?.id || "");
  if (!id.startsWith("api-news-")) return false;
  const text = `${item.title || ""} ${item.titleZh || ""} ${item.summary || ""} ${item.source || ""}`.toLowerCase();
  if (/trading bot|stock trading bot|crypto trading bot|best ai trading|for beginners|platforms? in 2026|mexc/.test(text)) return true;
  if (/jane street|citadel|two sigma|squarepoint|optiver|imc|hudson river|jump trading|tower research/.test(text)) return false;
  return !/market making|electronic trading|options?|volatility|derivatives?|exchange|hedge fund|coreweave|gpu|liquidity|order book/.test(text);
}

export function inferNewsSkill(text) {
  const lower = String(text || "").toLowerCase();
  if (/ai|gpu|cloud|coreweave|model|deep|transformer|算力|模型/.test(lower)) return "deepLearning";
  if (/option|vol|volatility|波动|期权|greeks/.test(lower)) return "option";
  if (/data|feature|machine learning|ml|机器学习/.test(lower)) return "machineLearning";
  if (/stat|regression|估计|统计/.test(lower)) return "statistics";
  if (/leetcode|system|系统|latency|低延迟/.test(lower)) return "leetcode";
  return "market";
}

export function sortNews(news = []) {
  return [...news].sort((a, b) => newsTime(b) - newsTime(a));
}

export function newsTime(item) {
  const value = new Date(item?.publishedAt || item?.createdAt || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function normalizeNewsTopicFilter(value, topicPacks = {}) {
  const key = String(value || "all").trim();
  return topicPacks[key] ? key : "all";
}

export function normalizeNewsSourceFilter(value, sourceFilters = []) {
  const key = String(value || "all").trim();
  return sourceFilters.includes(key) ? key : "all";
}

export function createNewsFilterState(initialState = {}, options = {}) {
  const normalizeTopic = options.normalizeTopic || ((value) => normalizeNewsTopicFilter(value, options.topicPacks || {}));
  const normalizeSource = options.normalizeSource || ((value) => normalizeNewsSourceFilter(value, options.sourceFilters || []));
  let state = {
    topic: normalizeTopic(initialState.topic || "all"),
    source: normalizeSource(initialState.source || "all")
  };
  const snapshot = () => ({ ...state });

  return {
    getState() {
      return snapshot();
    },
    getTopic() {
      return state.topic;
    },
    setTopic(value) {
      state = { ...state, topic: normalizeTopic(value) };
      return state.topic;
    },
    getSource() {
      return state.source;
    },
    setSource(value) {
      state = { ...state, source: normalizeSource(value) };
      return state.source;
    }
  };
}

export function newsMatchesTopic(item = {}, topic = "all") {
  if (!topic || topic === "all") return true;
  const text = [
    item.title,
    item.titleZh,
    item.source,
    item.summary,
    item.insight,
    ...(item.tags || []),
    ...(item.skills || [])
  ].join(" ").toLowerCase();
  const matchers = {
    quantFirms: /jane street|citadel|optiver|imc|jump trading|two sigma|de shaw|d\.e\. shaw|hudson river|hrt|tower research|virtu|drw|flow traders|five rings/,
    marketStructure: /market making|market maker|electronic trading|liquidity|order book|exchange|options?|volatility|derivatives?|execution|sec|cme|nasdaq|nyse/,
    aiInfra: /\bai\b|artificial intelligence|gpu|coreweave|cloud|machine learning|deep learning|model|infrastructure|low latency|算力|模型/,
    recruiting: /intern|internship|graduate|new grad|campus|career|recruiting|job|offer|linkedin|xiaohongshu|小红书|social/
  };
  return (matchers[topic] || /./).test(text);
}

export function newsMatchesSourceFilter(item = {}, sourceFilter = "all") {
  if (!sourceFilter || sourceFilter === "all") return true;
  const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
  if (sourceFilter === "news") return sourceType === "news" || sourceType === "rss";
  if (sourceFilter === "official") return sourceType === "official";
  if (sourceFilter === "social") return isSocialNewsType(sourceType);
  return true;
}

export function getNewsEndpoint(endpoint, fallback = "http://127.0.0.1:8787/news") {
  const value = String(endpoint || "").trim();
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/(interview|classify-log)\/?$/, "/news");
    if (!url.pathname.endsWith("/news")) url.pathname = "/news";
    url.search = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

export async function requestNewsFromApi(options = {}) {
  const {
    endpoint,
    fetchImpl = globalThis.fetch,
    max = 24,
    normalizeItem = (item) => item,
    queries = [],
    topic = "all"
  } = options;
  if (!endpoint) throw new Error("Missing news endpoint");
  let data;
  try {
    data = await requestJson(endpoint, {
      method: "POST",
      body: { max, topic, queries },
      auth: false,
      fetchImpl
    });
  } catch (error) {
    if (error?.status) throw new Error(`News API ${error.status}`);
    throw error;
  }
  const items = Array.isArray(data) ? data : data.items || data.news || [];
  return items.map(normalizeItem);
}

function defaultStableNewsId(title, sourceUrl) {
  return stableSlugId("news", title, sourceUrl, { limit: 90, fallback: "item" });
}
