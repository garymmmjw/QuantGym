import { listen } from '../../ui/events.js';

export function createNewsModule(deps = {}) {
  let mounted = false;
  let activeDetailId = "";
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getTopicFilter = () => deps.getTopicFilter?.() || "all";
  const getSourceFilter = () => deps.getSourceFilter?.() || "all";
  const isEnglish = () => deps.getLanguage?.() === "en";
  const text = (key, params) => deps.t?.(key, params) || key;
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const getAllNews = () => deps.sortNews?.(deps.getNews?.() || []) || [];
  const getFilteredNews = (allNews = getAllNews()) => allNews.filter((item) => (
    deps.matchesTopic?.(item, getTopicFilter()) && deps.matchesSourceFilter?.(item, getSourceFilter())
  ));
  const sourceTypeOf = (item) => deps.normalizeSourceType?.(item.sourceType || deps.inferSourceType?.(item)) || "news";
  const addTag = (container, label, variant = "") => deps.addTag?.(container, label, variant);

  const updateFilterButtons = () => {
    document.querySelectorAll("[data-news-topic]").forEach((button) => {
      button.classList.toggle("active", button.dataset.newsTopic === getTopicFilter());
    });
    document.querySelectorAll("[data-news-source-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.newsSourceFilter === getSourceFilter());
    });
  };

  const renderTicker = () => {
    const els = getElements();
    if (!els.newsTickerTrack) return;
    els.newsTickerTrack.innerHTML = "";
    const news = getAllNews().slice(0, 8);
    if (!news.length) {
      const empty = document.createElement("button");
      empty.className = "news-ticker-item";
      empty.type = "button";
      empty.textContent = text("newsTickerEmpty");
      els.newsTickerTrack.appendChild(empty);
      return;
    }

    [...news, ...news].forEach((item) => {
      const button = document.createElement("button");
      button.className = "news-ticker-item";
      button.type = "button";
      button.addEventListener("click", () => deps.focusItem?.(item.id));

      const source = document.createElement("span");
      source.textContent = item.source || "News";
      const title = document.createElement("strong");
      title.textContent = isEnglish() ? item.title || item.titleZh : item.titleZh || item.title;
      button.append(source, title);
      els.newsTickerTrack.appendChild(button);
    });
  };

  const renderIntelligence = (allNews = getAllNews()) => {
    const els = getElements();
    updateFilterButtons();
    if (els.newsIntelTitle) els.newsIntelTitle.textContent = text("newsIntelTitle");
    if (els.newsSocialHint) els.newsSocialHint.textContent = text("newsSocialHint");
    if (els.newsIntelSummary) {
      const syncText = deps.getSyncError?.()
        ? text("newsApiUnavailable")
        : deps.getFetchedAt?.()
          ? `API ${deps.formatTimeOnly?.(deps.getFetchedAt())}`
          : text("newsDefaultSubtitle");
      els.newsIntelSummary.textContent = `${text("newsIntelSummary")} - ${syncText}`;
    }
    if (!els.newsIntelStats) return;
    els.newsIntelStats.innerHTML = "";
    const stats = [
      { label: text("newsSavedCount"), value: allNews.length },
      { label: text("newsAutoCount"), value: allNews.filter((item) => deps.matchesSourceFilter?.(item, "news")).length },
      { label: text("newsOfficialCount"), value: allNews.filter((item) => deps.matchesSourceFilter?.(item, "official")).length },
      { label: text("newsSocialCount"), value: allNews.filter((item) => deps.matchesSourceFilter?.(item, "social")).length },
      { label: text("newsReadCount"), value: allNews.filter((item) => item.readAt).length }
    ];
    stats.forEach((stat) => {
      const node = document.createElement("span");
      node.className = "news-intel-stat";
      node.innerHTML = `<strong>${deps.escapeHtml?.(String(stat.value))}</strong><small>${deps.escapeHtml?.(stat.label)}</small>`;
      els.newsIntelStats.appendChild(node);
    });
  };

  const openDetail = (id) => {
    const els = getElements();
    const item = (deps.getNews?.() || []).find((newsItem) => newsItem.id === id);
    if (!item) return;
    activeDetailId = id;
    renderDetail(item);
    els.newsList.classList.add("hidden");
    els.newsDetail.classList.remove("hidden");
    els.newsDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    deps.refreshIcons?.();
  };

  const renderDetail = (item) => {
    const els = getElements();
    const sourceType = sourceTypeOf(item);
    els.newsDetailReadBadge.classList.toggle("hidden", !item.readAt);
    els.newsDetailMeta.textContent = [
      deps.formatNewsDate?.(item.publishedAt || item.createdAt),
      item.source || deps.inferSource?.(item.sourceUrl),
      deps.getSourceTypeLabel?.(sourceType),
      deps.getVerificationLabel?.(sourceType, item.sourceUrl)
    ]
      .filter(Boolean)
      .join(" - ");
    els.newsDetailTitle.textContent = item.titleZh || item.title;
    els.newsDetailSummary.textContent = item.summary;
    els.newsDetailInsight.textContent = item.insight || text("newsFallbackInsight");
    els.newsDetailPills.innerHTML = "";
    const sourcePill = document.createElement("span");
    sourcePill.className = "pill";
    sourcePill.textContent = deps.getSourceTypeLabel?.(sourceType) || "";
    els.newsDetailPills.appendChild(sourcePill);
    deps.normalizeSkills?.(item.skills).forEach((key) => {
      const skill = deps.skillDefs?.[key];
      if (!skill) return;
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = skill.name;
      els.newsDetailPills.appendChild(pill);
    });
    (item.tags || []).slice(0, 6).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "pill muted-pill";
      pill.textContent = tag;
      els.newsDetailPills.appendChild(pill);
    });
    els.newsDetailLink.classList.toggle("hidden", !item.sourceUrl);
    els.newsDetailLink.href = deps.safeExternalUrl?.(item.sourceUrl) || "#";
    els.newsDetailLink.textContent = text("newsOpenOriginal");
  };

  const render = () => {
    const els = getElements();
    els.newsList = els.newsList || document.getElementById("newsList");
    els.newsUpdatedAt = els.newsUpdatedAt || document.getElementById("newsUpdatedAt");
    if (!els.newsList) return;
    try {
      renderTicker();
      els.newsList.innerHTML = "";
      const allNews = getAllNews();
      const news = getFilteredNews(allNews);
      renderIntelligence(allNews);
      const latest = allNews[0]?.publishedAt || allNews[0]?.createdAt || "";
      if (els.newsUpdatedAt) {
        const filteredText = news.length === allNews.length
          ? ""
          : ` - ${text("newsShowing")} ${news.length}`;
        const latestText = latest
          ? `${text("newsSavedCount")} ${allNews.length} - ${text("newsLatest")} ${deps.formatNewsDate?.(latest)}${filteredText}`
          : text("newsDefaultSubtitle");
        const syncText = deps.getSyncError?.()
          ? ` - ${text("newsApiUnavailable")}`
          : deps.getFetchedAt?.()
            ? ` - API ${deps.formatTimeOnly?.(deps.getFetchedAt())}`
            : "";
        els.newsUpdatedAt.textContent = `${latestText}${syncText}`;
      }

      if (!allNews.length) {
        els.newsList.appendChild(deps.emptyBlock?.(text("newsNoItems")) || document.createTextNode(""));
        return;
      }

      if (!news.length) {
        els.newsList.appendChild(deps.emptyBlock?.(text("newsNoFilterItems")) || document.createTextNode(""));
        return;
      }

      news.forEach((item) => {
        const card = document.createElement("article");
        const sourceType = sourceTypeOf(item);
        card.className = `news-card content-card problem-card news-source-${sourceType}${item.readAt ? " read" : ""}`;
        card.dataset.newsId = item.id;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", item.titleZh || item.title || "News");
        card.addEventListener("click", (event) => {
          if (event.target.closest("a")) return;
          openDetail(item.id);
        });
        card.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openDetail(item.id);
        });

        const meta = document.createElement("div");
        meta.className = "problem-meta";
        addTag(meta, deps.formatNewsDate?.(item.publishedAt || item.createdAt), "source");
        addTag(meta, item.source || deps.inferSource?.(item.sourceUrl), "topic");
        addTag(meta, deps.getSourceTypeLabel?.(sourceType), sourceType === "official" ? "skill" : "source");
        addTag(meta, deps.getVerificationLabel?.(sourceType, item.sourceUrl), deps.isSocialSource?.(sourceType) ? "score" : "source");
        if (item.readAt) addTag(meta, text("newsReadCount"), "score");

        const title = document.createElement("h3");
        title.textContent = item.titleZh || item.title;

        const summary = document.createElement("p");
        summary.className = "problem-prompt";
        summary.textContent = item.summary;

        const impact = document.createElement("div");
        impact.className = "content-card-note";
        const impactLabel = document.createElement("strong");
        impactLabel.textContent = text("newsImpact");
        const impactText = document.createElement("span");
        impactText.textContent = item.insight || text("newsFallbackInsight");
        impact.append(impactLabel, impactText);

        const pills = document.createElement("div");
        pills.className = "problem-meta";
        deps.normalizeSkills?.(item.skills).forEach((key) => {
          const skill = deps.skillDefs?.[key];
          if (skill) addTag(pills, skill.name, "skill");
        });
        (item.tags || []).slice(0, 4).forEach((tag) => {
          addTag(pills, tag, "source");
        });

        const actions = document.createElement("div");
        actions.className = "problem-card-footer";
        if (item.sourceUrl) {
          const link = document.createElement("a");
          link.className = "content-card-link";
          link.href = deps.safeExternalUrl?.(item.sourceUrl) || "#";
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = text("newsOpenOriginal");
          link.addEventListener("click", (event) => event.stopPropagation());
          const icon = document.createElement("i");
          icon.setAttribute("data-lucide", "external-link");
          actions.append(link, icon);
        } else {
          const footerText = document.createElement("span");
          footerText.textContent = text("viewFullProblem");
          const icon = document.createElement("i");
          icon.setAttribute("data-lucide", "chevron-right");
          actions.append(footerText, icon);
        }

        card.append(meta, title, summary, impact, pills, actions);
        els.newsList.appendChild(card);
      });
      deps.refreshIcons?.();
    } catch (error) {
      els.newsList.innerHTML = "";
      els.newsList.appendChild(deps.emptyBlock?.(`News render failed: ${error.message || "unknown"}`) || document.createTextNode(""));
    }
  };

  const closeDetail = () => {
    const els = getElements();
    const readId = activeDetailId;
    activeDetailId = "";
    if (readId) deps.markRead?.(readId, { render: false });
    els.newsDetail.classList.add("hidden");
    els.newsList.classList.remove("hidden");
    deps.renderSummary?.();
    deps.renderLeaderboard?.();
    renderTicker();
    render();
    deps.refreshIcons?.();
    window.setTimeout(() => deps.focusItem?.(readId, false), 60);
  };

  const setTopicFilter = (value) => {
    const next = deps.normalizeTopicFilter?.(value);
    if (next === getTopicFilter()) return;
    deps.setTopicFilter?.(next);
    if (activeDetailId) closeDetail();
    else render();
  };

  const setSourceFilter = (value) => {
    const next = deps.normalizeSourceFilter?.(value);
    if (next === getSourceFilter()) return;
    deps.setSourceFilter?.(next);
    if (activeDetailId) closeDetail();
    else render();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.addNewsBtn, "click", () => {
        els.newsForm?.classList.toggle("hidden");
        if (!els.newsForm?.classList.contains("hidden")) els.newsTitle?.focus();
      });

      bind(els.refreshNewsBtn, "click", () => {
        deps.refresh?.(true);
      });

      bind(els.newsTopicFilter, "click", (event) => {
        const button = event.target.closest("[data-news-topic]");
        if (!button) return;
        setTopicFilter(button.dataset.newsTopic);
      });

      bind(els.newsSourceFilter, "click", (event) => {
        const button = event.target.closest("[data-news-source-filter]");
        if (!button) return;
        setSourceFilter(button.dataset.newsSourceFilter);
      });

      bind(els.newsForm, "submit", (event) => {
        event.preventDefault();
        deps.addFromForm?.();
      });

      bind(els.newsBackBtn, "click", closeDetail);
    },

    render,
    renderTicker,
    closeDetail,

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
