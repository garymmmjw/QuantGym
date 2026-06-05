export function createPokerRuntime() {
  return {
    state: {
      game: null,
      selectedPreflopHand: "AKs",
      selectedPanelTab: "chat",
      online: {
        roomCode: "",
        revision: 0,
        ws: null,
        connected: false,
        connecting: false,
        applying: false,
        lastError: "",
        reconnectTimer: 0
      }
    }
  };
}
