import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { filterNewsItems, getNewsSourceType } from "./newsViewModel.js";

export function useNewsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const filterState = appServices.newsFilterState;
  const [topicFilter, setTopicFilterState] = useState(() => filterState?.getTopic?.() || "all");
  const [sourceFilter, setSourceFilterState] = useState(() => filterState?.getSource?.() || "all");
  const [detailId, setDetailId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newsRevision, setNewsRevision] = useState(0);

  useEffect(() => {
    const onNewsUpdated = () => setNewsRevision((value) => value + 1);
    window.addEventListener("quantgym:news-updated", onNewsUpdated);
    return () => window.removeEventListener("quantgym:news-updated", onNewsUpdated);
  }, []);

  const t = appServices.t || ((key) => key);
  const language = appServices.getLanguage?.() || "zh";
  const isEnglish = language === "en";
  const skillDefs = appServices.skillDefs || {};

  const allNews = useMemo(() => userState.news || [], [userState.news, newsRevision]);

  useEffect(() => {
    const focusNewsId = (rawId) => {
      const id = String(rawId || "").trim();
      if (!id) return;
      if (!allNews.some((item) => item.id === id)) return;
      setDetailId(id);
    };

    focusNewsId(window.__quantgymPendingNewsFocusId);
    const onNewsFocus = (event) => focusNewsId(event.detail?.id);
    window.addEventListener("quantgym:news-focus", onNewsFocus);
    return () => window.removeEventListener("quantgym:news-focus", onNewsFocus);
  }, [allNews]);

  const filteredNews = useMemo(
    () => filterNewsItems(allNews, { topic: topicFilter, source: sourceFilter }),
    [allNews, topicFilter, sourceFilter]
  );
  const detailItem = useMemo(
    () => allNews.find((item) => item.id === detailId) || null,
    [allNews, detailId]
  );

  useEffect(() => {
    if (!detailId || !detailItem) return;
    if (window.__quantgymPendingNewsFocusId !== detailId) return undefined;
    const clearPendingFocus = window.setTimeout(() => {
      if (window.__quantgymPendingNewsFocusId === detailId) {
        window.__quantgymPendingNewsFocusId = "";
      }
    }, 1600);
    return () => window.clearTimeout(clearPendingFocus);
  }, [detailId, detailItem]);

  const setTopicFilter = useCallback((value) => {
    const next = appServices.normalizeNewsTopicFilter?.(value) || value;
    filterState?.setTopic?.(next);
    setTopicFilterState(next);
    setDetailId("");
  }, [filterState, appServices]);

  const setSourceFilter = useCallback((value) => {
    const next = appServices.normalizeNewsSourceFilter?.(value) || value;
    filterState?.setSource?.(next);
    setSourceFilterState(next);
    setDetailId("");
  }, [filterState, appServices]);

  const openDetail = useCallback((id) => {
    setDetailId(id);
  }, []);

  const closeDetail = useCallback(() => {
    if (detailId) appServices.newsFacade?.markRead?.(detailId, { render: false });
    const readId = detailId;
    setDetailId("");
    appServices.services?.renderSummary?.();
    appServices.services?.renderLeaderboard?.();
    appServices.services?.renderNewsTicker?.();
    if (readId) window.setTimeout(() => appServices.newsFacade?.focusItem?.(readId, false), 60);
  }, [detailId, appServices]);

  const refreshNews = useCallback(() => {
    appServices.newsFacade?.refresh?.(true);
  }, [appServices]);

  const addFromForm = useCallback((item) => {
    appServices.newsFacade?.upsert?.([item]);
    appServices.services?.renderAll?.();
    setShowForm(false);
  }, [appServices]);

  const getSourceTypeLabel = useCallback(
    (sourceType) => appServices.newsFacade?.getSourceTypeLabel?.(sourceType) || "",
    [appServices]
  );

  const getVerificationLabel = useCallback(
    (sourceType, sourceUrl) => appServices.newsFacade?.getVerificationLabel?.(sourceType, sourceUrl) || "",
    [appServices]
  );

  const getItemTitle = useCallback((item) => (
    isEnglish ? item.title || item.titleZh : item.titleZh || item.title
  ), [isEnglish]);

  const getItemSourceType = useCallback(
    (item) => getNewsSourceType(item, appServices.inferNewsSourceType),
    [appServices]
  );

  return {
    t,
    isEnglish,
    skillDefs,
    allNews,
    filteredNews,
    detailItem,
    detailId,
    topicFilter,
    sourceFilter,
    showForm,
    setShowForm,
    setTopicFilter,
    setSourceFilter,
    openDetail,
    closeDetail,
    refreshNews,
    addFromForm,
    getSourceTypeLabel,
    getVerificationLabel,
    getItemTitle,
    getItemSourceType,
    syncError: userState.newsSyncError || "",
    fetchedAt: userState.newsFetchedAt || "",
    formatNewsDate: appServices.formatNewsDate,
    formatTimeOnly: appServices.formatTimeOnly,
    inferSource: appServices.inferSource,
    safeExternalUrl: appServices.safeExternalUrl,
    normalizeSkills: appServices.normalizeNewsSkills,
    focusNewsItem: (id) => appServices.newsFacade?.focusItem?.(id)
  };
}
