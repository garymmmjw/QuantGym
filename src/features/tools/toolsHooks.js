import { useCallback, useEffect, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useToolsPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const api = usePageApi("tools");
  const [viewState, setViewState] = useState(() => (
    api?.getViewModel?.() || { drill: {}, records: {}, leaderboard: [], market: {} }
  ));
  const [drillCount, setDrillCount] = useState(20);
  const [drillDuration, setDrillDuration] = useState(1500);

  const refreshView = useCallback((nextView) => {
    setViewState(nextView || api?.getViewModel?.() || { drill: {}, records: {}, leaderboard: [], market: {} });
  }, [api]);

  useEffect(() => {
    refreshView();
  }, [refreshView, userState.mentalMathRecords, userState.skills]);

  useEffect(() => {
    if (!viewState.drill?.running) return undefined;
    const timer = window.setInterval(() => {
      refreshView(api?.tickDrillTimer?.());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [api, refreshView, viewState.drill?.running]);

  const startSession = useCallback(() => {
    api?.setDrillCount?.(drillCount);
    api?.setDrillDuration?.(drillDuration);
    refreshView(api?.startDrillSession?.({ count: drillCount, durationSeconds: drillDuration }));
  }, [api, drillCount, drillDuration, refreshView]);

  const setMode = useCallback((mode) => {
    refreshView(api?.setDrillMode?.(mode));
  }, [api, refreshView]);

  const checkAnswer = useCallback(async (value) => {
    const result = api?.checkDrill?.(value);
    refreshView(result?.view);
    if (result?.advance) {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      refreshView(api?.advanceDrillQuestion?.({ countSkip: false }));
    }
  }, [api, refreshView]);

  const skip = useCallback(async () => {
    const result = api?.skipDrill?.();
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
    refreshView(api?.submitMarketQuote?.());
    pageApi?.refreshIcons?.({ root: document.querySelector(".mental-math-section") || document });
  }, [api, pageApi, refreshView]);

  const newMarket = useCallback(() => {
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
    openPoker: () => api?.openPoker?.(),
    t: api?.t || appServices.t || ((key) => key),
    refreshIcons: (options) => pageApi?.refreshIcons?.(options)
  };
}
