import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { calculateQuantScore, getRank, getSkillScore } from "../../modules/skills/data.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function entryTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

// Rewind the current skill XP map to what it was before `cutoff`
// by removing the gains of every training entry recorded since then.
function skillsBefore(skills, entries, cutoff) {
  const snapshot = { ...skills };
  entries.forEach((entry) => {
    if (entryTime(entry?.date) < cutoff) return;
    Object.entries(entry?.gains || {}).forEach(([key, gain]) => {
      if (snapshot[key] == null) return;
      snapshot[key] = Math.max(0, Number(snapshot[key] || 0) - Number(gain || 0));
    });
  });
  return snapshot;
}

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

  const weekly = useMemo(() => {
    void revision;
    const skills = userState.skills || {};
    const entries = Array.isArray(userState.entries) ? userState.entries : [];
    const now = Date.now();
    const currentScore = calculateQuantScore(skills);
    const trend = [3, 2, 1, 0].map((weeksAgo) => ({
      label: weeksAgo === 0 ? "本周" : weeksAgo === 1 ? "上周" : `${weeksAgo}周前`,
      score: weeksAgo === 0
        ? currentScore
        : calculateQuantScore(skillsBefore(skills, entries, now - weeksAgo * WEEK_MS))
    }));
    const lastWeekSkills = skillsBefore(skills, entries, now - WEEK_MS);
    const deltas = Object.fromEntries(Object.keys(skills).map((key) => [
      key,
      getSkillScore(Number(skills[key] || 0)) - getSkillScore(Number(lastWeekSkills[key] || 0))
    ]));
    return {
      trend,
      deltas,
      weeklyDelta: Math.round(currentScore - calculateQuantScore(lastWeekSkills))
    };
  }, [revision, userState.entries, userState.skills]);

  const tier = useMemo(() => getRank(summary.score || 0), [summary.score]);

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

  const refreshIcons = useCallback((options) => {
    pageApi?.refreshIcons?.(options);
  }, [pageApi]);

  useEffect(() => {
    api?.bindRadar?.();
    api?.drawRadar?.("");
  }, [api]);

  return {
    t,
    summary,
    cards,
    weekly,
    tier,
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
