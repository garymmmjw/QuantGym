import { useCallback, useEffect, useRef, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { getMentalMathXpGain } from "../../modules/tools/session.js";

export function useToolsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const api = usePageApi("tools");
  const t = api?.t || appServices.t || ((key) => key);
  const [viewState, setViewState] = useState(() => (
    api?.getViewModel?.() || { drill: {}, records: {}, leaderboard: [], market: {} }
  ));
  const [drillCount, setDrillCount] = useState(12);
  const [drillDuration, setDrillDuration] = useState(1500);

  // Presentation-only session chrome (design replica): streak counter,
  // completion ("本局完成") phase and market-game round/log bookkeeping.
  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const [donePhase, setDonePhase] = useState(false);
  const [doneStats, setDoneStats] = useState(null);
  const prevDrillRef = useRef({ running: false, completed: false });
  const [marketRound, setMarketRound] = useState(1);
  const [marketLog, setMarketLog] = useState([]);

  const refreshView = useCallback((nextView) => {
    const view = nextView || api?.getViewModel?.() || { drill: {}, records: {}, leaderboard: [], market: {} };
    const drill = view.drill || {};
    const prev = prevDrillRef.current;
    if (prev.running && drill.completed && !prev.completed) {
      const record = (view.records?.rows || [])[0];
      setDoneStats({
        accuracy: record?.accuracy ?? drill.status?.accuracy ?? 0,
        correct: record?.correct ?? 0,
        total: record?.total ?? drill.count ?? 0,
        score: record?.score ?? drill.status?.score ?? 0,
        xp: getMentalMathXpGain(record || { correct: 0, score: drill.status?.score ?? 0 }),
        best: bestStreakRef.current
      });
      setDonePhase(true);
    }
    prevDrillRef.current = { running: Boolean(drill.running), completed: Boolean(drill.completed) };
    setViewState(view);
  }, [api]);

  useEffect(() => {
    refreshView();
  }, [refreshView, userState.mentalMathRecords, userState.skills]);

  // Keep the idle drill placeholder (第 x / n 题) in sync with the selected 题量.
  useEffect(() => {
    const current = api?.getViewModel?.()?.drill;
    if (current && !current.running && !current.completed && current.count !== drillCount) {
      refreshView(api?.setDrillCount?.(drillCount));
    }
  }, [api, drillCount, refreshView]);

  useEffect(() => {
    if (!viewState.drill?.running) return undefined;
    const timer = window.setInterval(() => {
      refreshView(api?.tickDrillTimer?.());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [api, refreshView, viewState.drill?.running]);

  const startSession = useCallback(() => {
    streakRef.current = 0;
    bestStreakRef.current = 0;
    setStreak(0);
    setDonePhase(false);
    setDoneStats(null);
    api?.setDrillCount?.(drillCount);
    api?.setDrillDuration?.(drillDuration);
    refreshView(api?.startDrillSession?.({ count: drillCount, durationSeconds: drillDuration }));
  }, [api, drillCount, drillDuration, refreshView]);

  const setMode = useCallback((mode) => {
    refreshView(api?.setDrillMode?.(mode));
  }, [api, refreshView]);

  const checkAnswer = useCallback(async (value) => {
    const result = api?.checkDrill?.(value);
    const picked = (result?.view?.drill?.options || []).find((option) => option.selected);
    if (picked) {
      const nextStreak = picked.correct ? streakRef.current + 1 : 0;
      streakRef.current = nextStreak;
      bestStreakRef.current = Math.max(bestStreakRef.current, nextStreak);
      setStreak(nextStreak);
    }
    refreshView(result?.view);
    if (result?.advance) {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      refreshView(api?.advanceDrillQuestion?.({ countSkip: false }));
    }
  }, [api, refreshView]);

  const skip = useCallback(async () => {
    const result = api?.skipDrill?.();
    streakRef.current = 0;
    setStreak(0);
    refreshView(result?.view);
    if (result?.advance) {
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      refreshView(api?.advanceDrillQuestion?.({ countSkip: false }));
    }
  }, [api, refreshView]);

  const advance = useCallback(() => {
    refreshView(api?.advanceDrillQuestion?.({ countSkip: false }));
  }, [api, refreshView]);

  const submitMarket = useCallback(() => {
    const before = api?.getViewModel?.()?.market || {};
    const nextView = api?.submitMarketQuote?.();
    const after = nextView?.market || {};
    if (!before.quoted && after.quoted) {
      const pts = Math.round((Number(after.score) || 0) - (Number(before.score) || 0));
      setMarketLog((log) => [{
        id: `mg-${Date.now()}-${log.length}`,
        name: t("toolsMarketLogName", { fair: before.fairValue, news: before.news || "" }),
        pts,
        ok: pts > 0
      }, ...log].slice(0, 8));
    }
    refreshView(nextView);
    pageApi?.refreshIcons?.({ root: document.querySelector(".mental-math-section") || document });
  }, [api, pageApi, refreshView, t]);

  const newMarket = useCallback(() => {
    setMarketRound((round) => round + 1);
    refreshView(api?.newMarketGame?.());
  }, [api, refreshView]);

  const setMarketField = useCallback((field, value) => {
    refreshView(api?.setMarketQuote?.(field, value));
  }, [api, refreshView]);

  return {
    view: viewState,
    drillCount,
    setDrillCount,
    drillDuration,
    setDrillDuration,
    startSession,
    setMode,
    checkAnswer,
    skip,
    advance,
    submitMarket,
    newMarket,
    setMarketField,
    streak,
    done: donePhase && doneStats ? doneStats : null,
    dismissDone: () => setDonePhase(false),
    marketRound,
    marketLog,
    openPoker: () => api?.openPoker?.(),
    t,
    refreshIcons: (options) => pageApi?.refreshIcons?.(options)
  };
}
