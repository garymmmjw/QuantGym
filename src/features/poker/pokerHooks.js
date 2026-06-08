import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageApi } from "../../stores/usePageApi.js";

export function usePokerPageModel() {
  const api = usePageApi("poker");
  const pageApi = usePageApi();
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const view = useMemo(() => {
    void revision;
    return api?.getViewModel?.() || { mounted: true };
  }, [api, revision]);

  useEffect(() => {
    api?.mount?.();
    bump();
    return () => api?.unmount?.();
  }, [api, bump]);

  useEffect(() => {
    pageApi?.refreshIcons?.();
  }, [pageApi, revision, view.revision]);

  useEffect(() => {
    window.addEventListener("quantgym:poker-updated", bump);
    return () => window.removeEventListener("quantgym:poker-updated", bump);
  }, [bump]);

  useEffect(() => {
    const game = view.game?.table;
    if (!game) return undefined;
    const handActive = view.game?.table?.actions?.canAct;
    if (!handActive) return undefined;
    const id = window.setInterval(() => bump(), 1000);
    return () => window.clearInterval(id);
  }, [bump, view.game?.table?.actions?.canAct, view.revision]);

  const wrap = useCallback((fn) => (...args) => {
    const result = fn?.(...args);
    if (result && typeof result.finally === "function") result.finally(bump);
    bump();
    return result;
  }, [bump]);

  const actions = useMemo(() => ({
    setPanelTab: wrap((tab) => api?.setPanelTab?.(tab)),
    setPlayerName: wrap((name) => api?.setPlayerName?.(name)),
    setMode: wrap((mode) => api?.setMode?.(mode)),
    setRaiseAmount: wrap((amount) => api?.setRaiseAmount?.(amount)),
    submitAction: wrap((action) => api?.submitAction?.(action)),
    applyQuickBet: wrap((size) => api?.applyQuickBet?.(size)),
    takeSeat: wrap((name) => api?.takeSeat?.(name)),
    sitAtSeat: wrap((seat) => api?.sitAtSeat?.(seat, view.game?.playerName)),
    addBotAtSeat: wrap((seat) => api?.addBotAtSeat?.(seat)),
    addBot: wrap(() => api?.addBot?.()),
    fillBots: wrap(() => api?.fillBots?.()),
    removePlayer: wrap((playerId) => api?.removePlayer?.(playerId)),
    startTournament: wrap(() => api?.startTournament?.()),
    resetTournament: wrap(() => api?.resetTournament?.()),
    matchTournament: wrap(() => api?.matchTournament?.()),
    pauseGame: wrap(() => api?.pauseGame?.()),
    resumeGame: wrap(() => api?.resumeGame?.()),
    copyRoomLink: wrap(() => api?.copyRoomLink?.()),
    exportSession: wrap(() => api?.exportSession?.()),
    nextHand: wrap(() => api?.nextHand?.()),
    sendChat: wrap((message) => api?.sendChat?.(message)),
    applySettings: wrap((values) => api?.applySettings?.(values)),
    handlePlayerAction: wrap((playerId, action, options) => api?.handlePlayerAction?.(playerId, action, options))
  }), [api, bump, view.game?.playerName, wrap]);

  return {
    view,
    actions,
    openModule: (moduleId) => api?.switchModule?.(moduleId),
    handlePreflopClick: wrap((event) => api?.handlePreflopMatrixClick?.(event))
  };
}
