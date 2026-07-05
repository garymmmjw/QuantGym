import { useMemo, useState } from "react";
import { useNewsPageModel } from "./newsHooks.js";
import { buildNewsStats } from "./newsViewModel.js";
import { NewsFilters } from "./NewsFilters.jsx";
import { NewsForm } from "./NewsForm.jsx";
import { NewsList } from "./NewsList.jsx";
import { NewsDetail } from "./NewsDetail.jsx";
import { useAppServices } from "../../stores/usePageApi.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

function sourceAbbr(name) {
  const words = String(name || "").trim().split(/[\s/·]+/).filter(Boolean);
  if (!words.length) return "N";
  if (words.length >= 2) return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  return words[0].slice(0, 1).toUpperCase();
}

export function NewsPageContent() {
  const model = useNewsPageModel();
  const appServices = useAppServices();
  const [searchQuery, setSearchQuery] = useState("");
  const [subscribedSources, setSubscribedSources] = useState(() => new Set());

  useScopedRefreshIcons(appServices.services?.refreshIcons, ".news-section", [
    model.filteredNews,
    model.detailItem,
    model.showForm,
    model.topicFilter,
    model.sourceFilter
  ]);

  const stats = buildNewsStats(model.allNews, {
    saved: model.t("newsSavedCount"),
    auto: model.t("newsAutoCount"),
    official: model.t("newsOfficialCount"),
    social: model.t("newsSocialCount"),
    read: model.t("newsReadCount")
  });

  const latest = model.allNews[0]?.publishedAt || model.allNews[0]?.createdAt || "";
  const filteredText = model.filteredNews.length === model.allNews.length
    ? ""
    : ` - ${model.t("newsShowing")} ${model.filteredNews.length}`;
  const latestText = latest
    ? `${model.t("newsSavedCount")} ${model.allNews.length} - ${model.t("newsLatest")} ${model.formatNewsDate?.(latest)}${filteredText}`
    : model.t("newsDefaultSubtitle");
  const syncText = model.syncError
    ? ` - ${model.t("newsApiUnavailable")}`
    : model.fetchedAt
      ? ` - API ${model.formatTimeOnly?.(model.fetchedAt)}`
      : "";

  const visibleNews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return model.filteredNews;
    return model.filteredNews.filter((item) => [
      item.title,
      item.titleZh,
      item.summary,
      item.source,
      ...(item.tags || [])
    ].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [model.filteredNews, searchQuery]);

  const hotSources = useMemo(() => {
    const map = new Map();
    model.allNews.forEach((item) => {
      const name = item.source || model.inferSource?.(item.sourceUrl) || "News";
      const entry = map.get(name) || { name, count: 0, typeLabel: "" };
      entry.count += 1;
      if (!entry.typeLabel) {
        entry.typeLabel = model.getSourceTypeLabel(model.getItemSourceType(item)) || "";
      }
      map.set(name, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [model.allNews, model.inferSource, model.getSourceTypeLabel, model.getItemSourceType]);

  const toggleSourceFollow = (name) => {
    setSubscribedSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const zh = !model.isEnglish;
  const tagline = zh
    ? "量化圈要闻 · 做市 / 招聘 / 监管 / 宏观 · 每日更新"
    : "Quant wire · Market making / Hiring / Regulation / Macro · Updated daily";

  const handleAdd = (item) => {
    model.addFromForm(item);
  };

  return (
    <section className="news-section qg-support-page qg-news-page">
      <div className="section-heading">
        <div className="news-heading-main">
          <span className="news-heading-kicker">
            <span className="news-heading-kicker-dot" aria-hidden="true" />
            COMMUNITY · Quant Wire
          </span>
          <h2>
            {zh ? "新闻" : "Quant"} <span className="news-title-accent">News</span>
          </h2>
          <p className="news-heading-tagline">{tagline}</p>
          <small id="newsUpdatedAt" className="news-heading-meta">{`${latestText}${syncText}`}</small>
        </div>
        <div className="news-heading-side">
          <div className="news-search">
            <i data-lucide="search" aria-hidden="true" />
            <input
              id="newsSearchInput"
              type="search"
              placeholder={zh ? "搜索要闻 / 机构…" : "Search news / firms…"}
              aria-label={zh ? "搜索要闻" : "Search news"}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="problem-actions">
            <button id="addNewsBtn" className="icon-button ghost" type="button" title={model.t("newsAdd")} aria-label={model.t("newsAdd")} onClick={() => model.setShowForm((v) => !v)}>
              <i data-lucide="file-plus-2" />
            </button>
            <button id="refreshNewsBtn" className="icon-button ghost" type="button" title={model.t("refreshNews")} aria-label={model.t("refreshNews")} onClick={model.refreshNews}>
              <i data-lucide="refresh-cw" />
            </button>
          </div>
        </div>
      </div>

      <NewsFilters
        t={model.t}
        topicFilter={model.topicFilter}
        sourceFilter={model.sourceFilter}
        onTopicChange={model.setTopicFilter}
        onSourceChange={model.setSourceFilter}
      />

      {/* Legacy intel board kept in the DOM (hidden) so its ids stay resolvable. */}
      <div className="news-intel-board" aria-label={model.t("newsIntelAria")} aria-hidden="true">
        <div className="news-intel-copy">
          <strong id="newsIntelTitle">{model.t("newsIntelTitle")}</strong>
          <span id="newsIntelSummary">{model.t("newsIntelSummary")}</span>
        </div>
        <div id="newsIntelStats" className="news-intel-stats">
          {stats.map((stat) => (
            <span key={stat.label} className="news-intel-stat">
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>
        <p id="newsSocialHint" className="news-social-hint">{model.t("newsSocialHint")}</p>
      </div>

      <div className="news-body-grid">
        <div className="news-feed-col">
          {model.showForm ? (
            <NewsForm
              t={model.t}
              onSubmit={handleAdd}
              onCancel={() => model.setShowForm(false)}
            />
          ) : null}

          {model.detailItem ? (
            <NewsDetail
              t={model.t}
              item={model.detailItem}
              getItemTitle={model.getItemTitle}
              getItemSourceType={model.getItemSourceType}
              getSourceTypeLabel={model.getSourceTypeLabel}
              getVerificationLabel={model.getVerificationLabel}
              formatNewsDate={model.formatNewsDate}
              inferSource={model.inferSource}
              safeExternalUrl={model.safeExternalUrl}
              normalizeSkills={model.normalizeSkills}
              skillDefs={model.skillDefs}
              onBack={model.closeDetail}
            />
          ) : (
            <NewsList
              t={model.t}
              items={visibleNews}
              hasAnyItems={model.allNews.length > 0}
              emptyAllLabel={model.t("newsNoItems")}
              emptyFilterLabel={model.t("newsNoFilterItems")}
              getItemTitle={model.getItemTitle}
              getItemSourceType={model.getItemSourceType}
              getSourceTypeLabel={model.getSourceTypeLabel}
              getVerificationLabel={model.getVerificationLabel}
              formatNewsDate={model.formatNewsDate}
              inferSource={model.inferSource}
              safeExternalUrl={model.safeExternalUrl}
              normalizeSkills={model.normalizeSkills}
              skillDefs={model.skillDefs}
              onOpen={model.openDetail}
            />
          )}
        </div>

        <aside className="news-side-col" aria-label={zh ? "新闻侧栏" : "News sidebar"}>
          {hotSources.length > 0 ? (
            <div className="news-side-panel news-sources-panel">
              <div className="news-side-title">{zh ? "热门来源" : "Top Sources"}</div>
              <div className="news-source-list">
                {hotSources.map((source, index) => {
                  const isOn = subscribedSources.has(source.name);
                  return (
                    <div key={source.name} className="news-source-row">
                      <div className={`news-source-logo tone-${index % 5}`}>{sourceAbbr(source.name)}</div>
                      <div className="news-source-info">
                        <div className="news-source-name">{source.name}</div>
                        <div className="news-source-sub">
                          {zh ? `${source.count} 篇 · ${source.typeLabel}` : `${source.count} · ${source.typeLabel}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`news-follow-btn${isOn ? " is-on" : ""}`}
                        aria-pressed={isOn}
                        onClick={() => toggleSourceFollow(source.name)}
                      >
                        {isOn ? (zh ? "已订阅" : "Following") : (zh ? "订阅" : "Follow")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="news-side-panel news-digest-panel">
            <div className="news-digest-head">
              <img src="/assets/generated/playful-precision/reward-lightning.webp" alt="" />
              <div className="news-digest-title">{zh ? "今日速读" : "Daily Digest"}</div>
            </div>
            <p className="news-digest-copy">
              {zh
                ? `3 分钟看完今日 ${model.allNews.length} 条要闻的 AI 摘要，读完 +10 XP。`
                : `A 3-minute AI digest of today's ${model.allNews.length} stories. Finish for +10 XP.`}
            </p>
            <button type="button" className="news-digest-btn">
              {zh ? "生成今日速读 →" : "Generate digest →"}
            </button>
          </div>

          <div className="news-side-panel news-drill-panel">
            <div className="news-side-title">{zh ? "关联题库" : "Related Drills"}</div>
            <div className="news-drill-list">
              <a className="news-drill-row" href="/problems">
                <span className="news-drill-dot dot-orange" aria-hidden="true" />
                <span className="news-drill-name">{zh ? "Optiver 速算轮真题" : "Optiver mental-math round"}</span>
                <span className="news-drill-go">{zh ? "去练 ›" : "Drill ›"}</span>
              </a>
              <a className="news-drill-row" href="/problems">
                <span className="news-drill-dot dot-brand" aria-hidden="true" />
                <span className="news-drill-name">{zh ? "波动率与对冲专题" : "Volatility & hedging set"}</span>
                <span className="news-drill-go">{zh ? "去练 ›" : "Drill ›"}</span>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
