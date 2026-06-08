import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useSkillsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const api = usePageApi("skills");
  const t = appServices.t || ((key) => key);
  const [hoverKey, setHoverKey] = useState("");
  const [revision, setRevision] = useState(0);

  const summary = useMemo(() => {
    void revision;
    void userState.skills;
    void userState.entries;
    return api?.getSummary?.() || {
      score: 0,
      practiceCount: 0,
      averageScore: null,
      weakestLabel: "-"
    };
  }, [api, revision, userState.entries, userState.skills]);

  const cards = useMemo(() => {
    void revision;
    void userState.skills;
    return api?.getSkillCards?.() || [];
  }, [api, revision, userState.skills]);

  const activeSkill = useMemo(() => (
    cards.find((item) => item.key === hoverKey) || null
  ), [cards, hoverKey]);

  const bindRadar = useCallback((canvas) => {
    api?.bindRadar?.();
    if (canvas) api?.drawRadar?.(hoverKey || api?.getRadarHoverKey?.() || "");
  }, [api, hoverKey]);

  const setHover = useCallback((key) => {
    setHoverKey(key);
    api?.drawRadar?.(key);
  }, [api]);

  const clearHover = useCallback(() => {
    setHoverKey("");
    api?.clearHover?.();
  }, [api]);

  const handleRadarMove = useCallback((event) => {
    api?.handleRadarMove?.(event);
    setHoverKey(api?.getRadarHoverKey?.() || "");
  }, [api]);

  useEffect(() => {
    const handleSkillFocus = (event) => {
      const key = String(event?.detail?.skillKey || "");
      if (!key) return;
      setHover(key);
    };
    window.addEventListener("quantgym:skill-focus", handleSkillFocus);
    return () => window.removeEventListener("quantgym:skill-focus", handleSkillFocus);
  }, [setHover]);

  const refreshIcons = useCallback(() => {
    pageApi?.refreshIcons?.();
  }, [appServices]);

  useEffect(() => {
    api?.bindRadar?.();
    api?.drawRadar?.("");
  });

  return {
    t,
    summary,
    cards,
    hoverKey,
    activeSkill,
    bindRadar,
    setHover,
    clearHover,
    handleRadarMove,
    focusFirstSkill: () => {
      const firstKey = cards[0]?.key || "";
      if (firstKey) setHover(firstKey);
    },
    updateLegendHighlight: (key) => api?.updateLegendHighlight?.(key),
    formatScore: api?.formatScore || ((value) => String(value)),
    refreshIcons,
    bump: () => setRevision((value) => value + 1)
  };
}
