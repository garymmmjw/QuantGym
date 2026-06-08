import { getDefaultPokerSettings } from "../../modules/poker/model.js";
import { getPokerPanelViewModel } from "../../modules/poker/panelViewModel.js";
import { buildPokerTableViewModel } from "../../modules/poker/tableViewModel.js";

function buildTableHelpers(deps) {
  return {
    formatNumber: deps.formatNumber,
    getActivePlayers: (game) => deps.getPokerActivePlayers?.(game) || [],
    getBlindSeats: (game) => deps.getPokerBlindSeats?.(game) || {},
    getCurrentPlayer: (game) => deps.getCurrentPokerPlayer?.(game) || null,
    getDefaultPlayerName: () => deps.getDefaultPokerPlayerName?.() || "You",
    getHero: (game) => deps.getPokerHero?.(game) || null,
    getHeroPreflopCoach: (game) => deps.getPokerHeroPreflopCoach?.(game) || "",
    getInviteLink: (game) => deps.getPokerInviteLink?.(game) || "",
    getLedgerRows: (game) => deps.getPokerLedgerRows?.(game) || [],
    getMinimumRaiseTo: (game, player) => deps.getMinimumPokerRaiseTo?.(game, player) || 0,
    getNextOpenSeat: (game) => deps.getNextOpenPokerSeat?.(game) ?? null,
    getOnlineLabel: (game) => deps.getPokerOnlineLabel?.(game) || "Local",
    getSpectators: (game) => deps.getPokerSpectators?.(game) || [],
    getStageLabel: (stage) => deps.getPokerStageLabel?.(stage) || stage,
    getToCall: (game, player) => deps.getPokerToCall?.(game, player) || 0,
    getViewerModeLabel: (game) => deps.getPokerViewerModeLabel?.(game) || "LOCAL",
    isHost: (game) => deps.isPokerHost?.(game) || false,
    isOnlineRoom: (game) => deps.isPokerOnlineRoom?.(game) || false,
    isRegistering: (game) => deps.canPokerRegister?.(game) || false,
    isSpectator: (game) => deps.isPokerSpectator?.(game) || false
  };
}

export function createPokerPageApi(deps = {}) {
  let revision = 0;

  function bumpRevision() {
    revision += 1;
    return revision;
  }

  function sync(options = {}) {
    const reactTable = options.reactTable !== false;
    if (deps.pokerState) deps.pokerState.reactTable = reactTable;
    deps.rebindElements?.();
    if (!deps.pokerState?.game) deps.loadInitialPokerGame?.();
    if (!reactTable) deps.renderPokerGame?.();
    deps.renderPokerPreflopChart?.();
    deps.refreshIcons?.();
    bumpRevision();
  }

  function afterAction() {
    sync({ reactTable: true });
  }

  function getViewModel() {
    const game = deps.pokerState?.game || null;
    const runtime = deps.pokerState || {};
    const helpers = buildTableHelpers(deps);
    const panelHelpers = {
      formatNumber: deps.formatNumber,
      getActivePlayers: helpers.getActivePlayers,
      getDefaultSettings: (bigBlind) => deps.getDefaultPokerSettings?.(bigBlind) || getDefaultPokerSettings(bigBlind),
      getHero: helpers.getHero,
      getLedgerRows: helpers.getLedgerRows,
      getSpectators: helpers.getSpectators,
      isHost: helpers.isHost,
      isRegistering: helpers.isRegistering,
      isSpectator: helpers.isSpectator
    };
    const table = buildPokerTableViewModel(game, runtime, helpers);
    const panelTab = runtime.selectedPanelTab || "chat";
    return {
      mounted: true,
      revision,
      game: game
        ? {
            id: game.id,
            mode: game.mode,
            roomCode: game.roomCode,
            blindsText: `${game.smallBlind} / ${game.bigBlind}`,
            playerName: runtime.playerName ?? helpers.getDefaultPlayerName(),
            panelTab,
            table,
            panel: getPokerPanelViewModel(game, panelTab, panelHelpers)
          }
        : null
    };
  }

  return {
    mount() {
      document.body.classList.add("is-poker-module");
      if (deps.pokerState) {
        deps.pokerState.reactTable = true;
        if (!deps.pokerState.selectedPanelTab) deps.pokerState.selectedPanelTab = "chat";
      }
      sync({ reactTable: true });
    },

    unmount() {
      document.body.classList.remove("is-poker-module");
    },

    sync,
    getViewModel,
    getRevision: () => revision,

    setPanelTab: (tab) => {
      if (deps.pokerState) deps.pokerState.selectedPanelTab = tab || "chat";
      afterAction();
    },

    setPlayerName: (name) => {
      if (deps.pokerState) deps.pokerState.playerName = String(name || "");
      bumpRevision();
    },

    setMode: (mode) => {
      deps.setPokerMode?.(mode);
      afterAction();
    },

    setRaiseAmount: (amount) => {
      deps.setPokerRaiseAmount?.(amount);
      bumpRevision();
    },

    submitAction: (action) => { deps.submitPokerAction?.(action); afterAction(); },
    applyQuickBet: (size) => { deps.applyPokerQuickBet?.(size); afterAction(); },
    takeSeat: (name) => { deps.takePokerSeat?.(name); afterAction(); },
    sitAtSeat: (seat, name) => { deps.sitPokerAtSeat?.(seat, name); afterAction(); },
    addBotAtSeat: (seat) => { deps.addPokerBotAtSeat?.(seat); afterAction(); },
    addBot: () => { deps.addPokerBot?.(true); afterAction(); },
    fillBots: () => { deps.fillPokerBots?.(true); afterAction(); },
    removePlayer: (playerId) => { deps.removePokerPlayer?.(playerId); afterAction(); },
    startTournament: () => { deps.startPokerTournament?.(true); afterAction(); },
    resetTournament: () => { deps.resetPokerTournament?.(true); afterAction(); },
    matchTournament: () => { deps.matchPokerTournament?.(true); afterAction(); },
    pauseGame: () => { deps.pausePokerGame?.(true); afterAction(); },
    resumeGame: () => { deps.resumePokerGame?.(true); afterAction(); },
    copyRoomLink: () => { deps.copyPokerRoomLink?.(); afterAction(); },
    exportSession: () => { deps.exportPokerSession?.(); afterAction(); },
    nextHand: () => { deps.nextPokerHand?.(true); afterAction(); },
    sendChat: (message) => { deps.sendPokerChat?.(message); afterAction(); },
    applySettings: (values) => { deps.applyPokerSettings?.(values); afterAction(); },
    handlePlayerAction: (playerId, action, options) => {
      deps.handlePokerPlayerAction?.(playerId, action, options);
      afterAction();
    },

    handlePreflopMatrixClick: (event) => { deps.handlePokerPreflopMatrixClick?.(event); afterAction(); },
    switchModule: deps.switchModule
  };
}
