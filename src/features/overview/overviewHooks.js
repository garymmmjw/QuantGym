import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { locationDefs } from "../../prep-data.js";
import {
  getCountryLabel,
  getRegionLabel,
  normalizeCountry,
  normalizeRegionForCountry
} from "../../modules/account/data.js";

export function useOverviewPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const api = usePageApi("overview");
  const [revision, setRevision] = useState(0);
  const language = api?.getLanguage?.() || appServices.getLanguage?.() || "zh";
  const isEnglish = language === "en";

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const summary = useMemo(() => {
    void revision;
    void userState.skills;
    void userState.entries;
    return api?.getSummary?.() || { score: 0, rank: "", entryCount: 0, weeklyXp: 0, streak: 0 };
  }, [api, revision, userState.entries, userState.skills]);

  const tickerNews = useMemo(() => {
    void revision;
    void userState.news;
    return api?.getTickerNews?.() || [];
  }, [api, revision, userState.news]);

  const todayPlan = useMemo(() => {
    void revision;
    void userState.prepPlan;
    void userState.studyPlan;
    return api?.getTodayPlan?.() || null;
  }, [api, revision, userState.prepPlan, userState.studyPlan]);

  const problemProgress = useMemo(() => {
    void revision;
    void userState.problems;
    void userState.problemStates;
    return api?.getProblemProgress?.() || [];
  }, [api, revision, userState.problemStates, userState.problems]);

  const dailyXpBars = useMemo(() => {
    void revision;
    void userState.entries;
    return api?.getDailyXpBars?.() || [];
  }, [api, revision, userState.entries]);

  const heatmap = useMemo(() => {
    void revision;
    void userState.entries;
    return api?.getContributionHeatmap?.() || null;
  }, [api, revision, userState.entries]);

  const leaderboard = useMemo(() => {
    void revision;
    void userState.leaderboard;
    return api?.getLeaderboardView?.() || {
      settings: { metric: "overall", scope: "global", country: "china", region: "" },
      metricOptions: [],
      rows: [],
      scopeSummary: {}
    };
  }, [api, revision, userState.leaderboard]);

  const countryOptions = useMemo(
    () => Object.keys(locationDefs).map((key) => ({
      value: key,
      label: getCountryLabel(key, isEnglish ? "en" : "zh")
    })),
    [isEnglish]
  );

  const regionOptions = useMemo(() => {
    const country = normalizeCountry(leaderboard.settings.country);
    return locationDefs[country].regions.map((region) => ({
      value: region,
      label: getRegionLabel(region, isEnglish ? "en" : "zh")
    }));
  }, [isEnglish, leaderboard.settings.country]);

  const updateLeaderboard = useCallback((patch) => {
    api?.updateLeaderboardSettings?.(patch);
    bump();
  }, [api, bump]);

  const refreshLeaderboard = useCallback(async () => {
    await api?.refreshLeaderboard?.(true);
    bump();
  }, [api, bump]);

  const generateTodayStudyPlan = useCallback(() => {
    api?.generateTodayStudyPlan?.();
    bump();
  }, [api, bump]);

  const openModule = useCallback((moduleId) => {
    api?.switchModule?.(moduleId);
  }, [api]);

  const focusNews = useCallback((id) => {
    const targetId = String(id || "").trim();
    if (!targetId) return;
    const windowRef = globalThis.window;
    if (windowRef) {
      windowRef.__quantgymPendingNewsFocusId = targetId;
      const FocusEvent = windowRef.CustomEvent || CustomEvent;
      const dispatchFocus = () => windowRef.dispatchEvent?.(new FocusEvent("quantgym:news-focus", {
        detail: { id: targetId }
      }));
      dispatchFocus();
      windowRef.setTimeout?.(dispatchFocus, 240);
      windowRef.setTimeout?.(dispatchFocus, 900);
      windowRef.setTimeout?.(dispatchFocus, 1600);
    }
    api?.focusNewsItem?.(targetId);
    api?.switchModule?.("news");
  }, [api]);

  const refreshIcons = useCallback((options) => {
    pageApi?.refreshIcons?.(options);
  }, [pageApi]);

  useEffect(() => {
    api?.startHeroTypewriter?.();
    api?.initHeroInteractions?.();
    refreshIcons({ root: document.querySelector(".overview-page") || document });
  }, [api, refreshIcons]);

  useEffect(() => {
    const handleLeaderboardUpdate = () => bump();
    window.addEventListener("quantgym:leaderboard-updated", handleLeaderboardUpdate);
    return () => window.removeEventListener("quantgym:leaderboard-updated", handleLeaderboardUpdate);
  }, [bump]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(api?.refreshLeaderboard?.(false))
      .then(() => {
        if (!cancelled) bump();
      })
      .catch(() => {
        if (!cancelled) bump();
      });
    return () => {
      cancelled = true;
    };
  }, [api, bump]);

  return {
    t: api?.t || appServices.t || ((key) => key),
    summary,
    tickerNews,
    todayPlan,
    problemProgress,
    dailyXpBars,
    heatmap,
    leaderboard,
    countryOptions,
    regionOptions,
    updateLeaderboard,
    refreshLeaderboard,
    generateTodayStudyPlan,
    openModule,
    focusNews,
    formatScore: api?.formatScore || ((value) => String(value)),
    hashStringToHue: api?.hashStringToHue || (() => 0),
    getInitials: api?.getInitials || ((name) => String(name || "Q").slice(0, 1)),
    normalizeCountry,
    normalizeRegionForCountry,
    refreshIcons
  };
}
