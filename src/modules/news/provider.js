import {
  getNewsEndpoint,
  isSocialNewsType,
  isLowQualityNews,
  normalizeNewsItem,
  normalizeNewsSourceType,
  requestNewsFromApi,
  sortNews
} from './data.js';
import {
  applyNewsReadReward,
  upsertNewsItems
} from './mutations.js';
import { getNewsQueriesForTopic } from './sync.js';
import { normalizeNewsSkills as normalizeNewsSkillsValue } from '../problems/data.js';

export function createNewsProvider(deps = {}) {
  const windowRef = deps.windowRef || globalThis.window;
  const documentRef = deps.documentRef || globalThis.document;
  const text = (key) => deps.t?.(key) || key;

  function normalizeSkills(value) {
    if (deps.normalizeNewsSkills) return deps.normalizeNewsSkills(value);
    return normalizeNewsSkillsValue(value, {
      parseTags: deps.parseTags,
      skillDefs: deps.skillDefs
    });
  }

  function getSourceTypeLabel(sourceType) {
    const type = normalizeNewsSourceType(sourceType);
    const labels = {
      rss: "newsSourceNews",
      news: "newsSourceNews",
      official: "newsSourceOfficial",
      linkedin: "newsSourceLinkedIn",
      xiaohongshu: "newsSourceXiaohongshu",
      social: "newsSourceSocial",
      manual: "newsSourceManual"
    };
    return text(labels[type] || "newsSourceNews");
  }

  function getVerificationLabel(sourceType, sourceUrl = "") {
    const type = normalizeNewsSourceType(sourceType);
    if (isSocialNewsType(type)) return text("newsNeedsVerify");
    return sourceUrl ? text("newsVerified") : text("newsSourceManual");
  }

  function normalizeItem(raw = {}) {
    return normalizeNewsItem(raw, {
      parseTags: deps.parseTags,
      normalizeSkills,
      stableId: deps.stableId,
      makeId: deps.makeId,
      inferSource: deps.inferSource
    });
  }

  function getEndpoint() {
    return getNewsEndpoint(deps.getEndpointBase?.() || deps.defaultEndpoint);
  }

  function getQueriesForTopic(topic) {
    return getNewsQueriesForTopic(topic, {
      topicPacks: deps.topicPacks,
      normalizeTopic: deps.normalizeTopic
    });
  }

  async function requestFromApi() {
    const filters = deps.getFilters?.() || {};
    const topic = deps.normalizeTopic?.(filters.topic);
    return requestNewsFromApi({
      endpoint: getEndpoint(),
      normalizeItem,
      topic,
      queries: getQueriesForTopic(filters.topic)
    });
  }

  function upsert(items, options = {}) {
    const state = deps.getState?.() || {};
    state.news = upsertNewsItems(state.news, items, {
      normalizeItem,
      isLowQuality: isLowQualityNews,
      sortNews
    });
    deps.saveState?.({ checkIn: options.checkIn !== false });
    return state.news;
  }

  function addFromForm() {
    const elements = deps.elements || {};
    const selectedSourceType = normalizeNewsSourceType(elements.newsSourceType?.value || "news");
    const item = normalizeItem({
      title: elements.newsTitle?.value,
      titleZh: elements.newsTitle?.value,
      source: elements.newsSource?.value || getSourceTypeLabel(selectedSourceType),
      sourceType: selectedSourceType,
      sourceUrl: elements.newsUrl?.value,
      publishedAt: new Date().toISOString(),
      tags: deps.parseTags?.(elements.newsTags?.value),
      skills: [elements.newsPrimarySkill?.value],
      summary: elements.newsSummary?.value,
      insight: elements.newsInsight?.value,
      createdAt: new Date().toISOString()
    });

    if (!item.titleZh || !item.summary) return false;
    upsert([item]);
    elements.newsForm?.reset?.();
    elements.newsForm?.classList?.add?.("hidden");
    deps.renderAll?.();
    return true;
  }

  function markRead(id, options = {}) {
    const shouldRender = options.render !== false;
    const state = deps.getState?.() || {};
    const result = applyNewsReadReward(state, id, {
      normalizeSkills,
      skillDefs: deps.skillDefs,
      makeId: deps.makeId,
      xpPerSkill: deps.xpPerSkill ?? 8,
      entryPrefix: deps.entryPrefix || "阅读新闻："
    });
    if (!result.changed) return result;

    deps.saveState?.();
    if (shouldRender) deps.renderAll?.();
    return result;
  }

  function focusItem(id, shouldSwitch = true) {
    if (shouldSwitch) deps.switchModule?.("news");
    windowRef.setTimeout?.(() => {
      const card = documentRef.querySelector?.(`[data-news-id="${id}"]`);
      if (!card) return;
      card.scrollIntoView?.({ behavior: "smooth", block: "center" });
      card.classList?.add?.("spotlight");
      windowRef.setTimeout?.(() => card.classList?.remove?.("spotlight"), 900);
    }, 80);
  }

  return {
    addFromForm,
    getEndpoint,
    getQueriesForTopic,
    getSourceTypeLabel,
    getVerificationLabel,
    focusItem,
    markRead,
    normalizeItem,
    normalizeSkills,
    requestFromApi,
    upsert
  };
}
