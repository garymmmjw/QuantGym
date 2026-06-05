import { POKER_BLIND_LEVELS } from '../../constants.js';
import { downloadJsonFile } from '../../lib/files.js';
import { clampNumber } from '../../lib/number.js';
import {
  getDefaultPokerSettings as getDefaultPokerSettingsModel,
  makePokerRoomCode,
  POKER_MIN_PLAYERS,
  POKER_STARTING_STACK_BB,
  POKER_TABLE_SEATS
} from './model.js';

export function createPokerActionController(deps = {}) {
  const {
    addBot = () => {},
    addHumanToGame = () => {},
    addLog = () => {},
    canUseOnline = () => false,
    closeWebSocket = () => {},
    continueHand = () => {},
    copyRoomLink = () => {},
    elements = {},
    ensureOnlineRoom = () => {},
    fillBots = () => {},
    fillBotsForGame = () => {},
    getActivePlayers = () => [],
    getCurrentPlayer = () => null,
    getDefaultPlayerName = () => "You",
    getDefaultSettings = getDefaultPokerSettingsModel,
    getHero = () => null,
    getMinimumRaiseTo = () => 0,
    handleSeatClick = () => {},
    isHost = () => false,
    isOnlineRoom = () => false,
    makeId = () => `${Date.now()}`,
    nowIso = () => new Date().toISOString(),
    recordLedger = () => {},
    removePlayer = () => {},
    renderGame = () => {},
    sendOnlineCommand = () => {},
    setRoomUrl = () => {},
    startNextHand = () => {},
    state = {},
    takeSeat = () => {},
    windowRef = globalThis.window || globalThis
  } = deps;

  function makeGameRound() {
    return createTournament(getMode());
  }

  function getMode() {
    const value = elements.pokerModeSelect?.value || "private";
    if (value === "match" || value === "bots" || value === "local") return "demo";
    return ["private", "demo"].includes(value) ? value : "private";
  }

  function createTournament(mode = "private") {
    const base = POKER_BLIND_LEVELS[0];
    const settings = {
      ...getDefaultSettings(base.big),
      smallBlind: base.small,
      bigBlind: base.big
    };
    const game = {
      id: makeId(),
      mode,
      roomCode: makePokerRoomCode(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      version: 2,
      hostPlayerId: "hero",
      isPaused: false,
      settings,
      status: "registering",
      seatCount: settings.maxPlayers,
      startingStack: settings.startingStack,
      players: [],
      spectators: [],
      dealerIndex: -1,
      handNumber: 0,
      handsPlayed: 0,
      blindInterval: 3,
      level: 0,
      levelIncreasedAt: -1,
      smallBlind: settings.smallBlind,
      bigBlind: settings.bigBlind,
      ante: settings.ante,
      stage: "waiting",
      board: [],
      deck: [],
      pot: 0,
      currentBet: 0,
      minRaise: settings.bigBlind,
      actionIndex: -1,
      handActive: false,
      handComplete: true,
      tournamentOver: false,
      heroStackAtHandStart: settings.startingStack,
      showdown: null,
      dealSerial: 0,
      feedback: "Private cash table created. Share the link, take seats, then start a hand.",
      log: [],
      currentHandLog: [],
      handHistory: [],
      ledger: [],
      chat: []
    };
    addHumanToGame(game, {
      id: "hero",
      name: getDefaultPlayerName(),
      seat: 0,
      isHero: true
    });
    if (mode === "demo") fillBotsForGame(game, 6);
    addLog(game, `Room ${game.roomCode} opened with ${POKER_STARTING_STACK_BB}BB play-money stacks.`);
    return game;
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!isElement(target)) return;
    const pokerRoot = target.closest('[data-module-view="poker"]');
    if (!pokerRoot) return;
    const actionButton = target.closest("[data-poker-action]");
    if (actionButton) {
      stopEvent(event);
      sendAction(actionButton.dataset.pokerAction);
      return;
    }
    const quickButton = target.closest("[data-poker-quick-bet]");
    if (quickButton) {
      stopEvent(event);
      applyQuickBet(quickButton.dataset.pokerQuickBet);
      return;
    }
    const panelTab = target.closest("[data-poker-panel-tab]");
    if (panelTab) {
      stopEvent(event);
      state.selectedPanelTab = panelTab.dataset.pokerPanelTab || "chat";
      renderGame();
      return;
    }
    const seatAction = target.closest("[data-poker-seat-action]");
    if (seatAction) {
      stopEvent(event);
      handleSeatClick({ target: seatAction });
      return;
    }
    const playerPanelAction = target.closest("[data-poker-player-action]");
    if (playerPanelAction) {
      stopEvent(event);
      handlePanelClick({ target: playerPanelAction });
      return;
    }
    const id = target.closest("button")?.id;
    if (!id) return;
    const handlers = {
      nextPokerGameBtn: () => newGame(true),
      resetPokerGameBtn: () => resetTournament(true),
      pokerMatchBtn: () => matchTournament(true),
      pokerCopyLinkBtn: () => copyRoomLink(),
      pokerTakeSeatBtn: () => takeSeat(),
      pokerAddBotBtn: () => addBot(true),
      pokerFillBotsBtn: () => fillBots(true),
      pokerStartTournamentBtn: () => startTournament(true),
      pokerPauseBtn: () => pauseGame(true),
      pokerResumeBtn: () => resumeGame(true),
      pokerExportBtn: () => exportSession()
    };
    if (!handlers[id]) return;
    stopEvent(event);
    handlers[id]();
  }

  function handleDocumentSubmit(event) {
    const target = event.target;
    if (!isElement(target)) return;
    if (!target.closest('[data-module-view="poker"]')) return;
    if (!target.closest("#pokerPanelContent")) return;
    stopEvent(event);
    handlePanelSubmit(event);
  }

  function handlePanelSubmit(event) {
    const chatForm = event.target.closest("[data-poker-chat-form]");
    if (chatForm) {
      event.preventDefault?.();
      sendChat(chatForm);
      return;
    }
    const settingsForm = event.target.closest("[data-poker-settings-form]");
    if (settingsForm) {
      event.preventDefault?.();
      applySettings(settingsForm);
    }
  }

  function handlePanelClick(event) {
    const button = event.target.closest("[data-poker-player-action]");
    if (!button || !state.game) return;
    const action = button.dataset.pokerPlayerAction;
    const playerId = button.dataset.playerId;
    if (action === "remove") {
      removePlayer(playerId);
      return;
    }
    if (action === "sitout") {
      setPlayerSittingOut(playerId, true);
      return;
    }
    if (action === "back") {
      setPlayerSittingOut(playerId, false);
      return;
    }
    if (action === "rebuy") {
      adjustStack(playerId, state.game.startingStack, "Rebuy");
      return;
    }
    if (action === "addstack") {
      adjustStack(playerId, Number(button.dataset.delta || state.game.startingStack), "Host add chips");
      return;
    }
    if (action === "removestack") {
      adjustStack(playerId, -Number(button.dataset.delta || state.game.startingStack), "Host remove chips");
    }
  }

  function sendChat(form) {
    const game = state.game;
    if (!game) return;
    const input = form.elements?.message;
    const message = String(input?.value || "").trim().slice(0, 360);
    if (!message) return;
    if (isOnlineRoom(game)) {
      if (input) input.value = "";
      sendOnlineCommand("chat", { message });
      return;
    }
    const author = getHero(game)?.name || "Spectator";
    game.chat = [
      ...(game.chat || []),
      {
        id: makeId(),
        author,
        message,
        createdAt: nowIso()
      }
    ].slice(-160);
    if (input) input.value = "";
    renderGame();
  }

  function applySettings(form) {
    const game = state.game;
    if (!game) return;
    if (!isHost(game)) {
      game.feedback = "Only the host can change table settings.";
      renderGame();
      return;
    }
    if (game.handActive) {
      game.feedback = "Change table settings between hands.";
      renderGame();
      return;
    }
    const data = createFormData(form);
    const occupiedMaxSeat = game.players.reduce((max, player) => Math.max(max, player.seat + 1), POKER_MIN_PLAYERS);
    const smallBlind = Math.max(1, Math.round(Number(data.get("smallBlind") || game.smallBlind)));
    const bigBlind = Math.max(smallBlind + 1, Math.round(Number(data.get("bigBlind") || game.bigBlind)));
    const maxPlayers = clampNumber(Math.round(Number(data.get("maxPlayers") || game.seatCount)), occupiedMaxSeat, POKER_TABLE_SEATS);
    const startingStack = Math.max(bigBlind * 20, Math.round(Number(data.get("startingStack") || game.startingStack)));
    const settings = {
      roomName: String(data.get("roomName") || "Private cash table").trim().slice(0, 40) || "Private cash table",
      smallBlind,
      bigBlind,
      startingStack,
      maxPlayers,
      decisionTimeLimit: clampNumber(Math.round(Number(data.get("decisionTimeLimit") || 30)), 10, 180),
      allowSpectators: data.get("allowSpectators") === "on",
      spectatorChat: data.get("spectatorChat") === "on",
      autoStartNextHand: data.get("autoStartNextHand") === "on",
      autoIncreaseBlinds: data.get("autoIncreaseBlinds") === "on"
    };
    if (isOnlineRoom(game)) {
      sendOnlineCommand("settings", { settings });
      return;
    }
    game.settings = {
      ...(game.settings || getDefaultSettings(bigBlind)),
      ...settings
    };
    game.smallBlind = smallBlind;
    game.bigBlind = bigBlind;
    game.minRaise = bigBlind;
    game.startingStack = startingStack;
    game.seatCount = maxPlayers;
    game.feedback = "Table settings saved.";
    addLog(game, game.feedback);
    renderGame();
  }

  function setPlayerSittingOut(playerId, shouldSitOut) {
    const game = state.game;
    const player = game?.players.find((item) => item.id === playerId);
    if (!game || !player) return;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("sitOut", { playerId, sittingOut: Boolean(shouldSitOut) });
      return;
    }
    const isSelf = player.isHero || player.id === getHero(game)?.id;
    if (!isSelf && !isHost(game)) {
      game.feedback = "Only the host can manage another player.";
      renderGame();
      return;
    }
    if (game.handActive && player.inHand && shouldSitOut) {
      player.sitOutNextHand = true;
      player.lastAction = "Sit out next hand";
      game.feedback = `${player.name} will sit out next hand.`;
    } else {
      player.sittingOut = Boolean(shouldSitOut);
      player.sitOutNextHand = false;
      player.lastAction = player.sittingOut ? "Sitting out" : "Ready";
      game.feedback = `${player.name} is ${player.sittingOut ? "sitting out" : "back"}.`;
    }
    addLog(game, game.feedback);
    renderGame();
  }

  function adjustStack(playerId, delta, note = "Stack adjustment") {
    const game = state.game;
    const player = game?.players.find((item) => item.id === playerId);
    const amount = Math.round(Number(delta || 0));
    if (!game || !player || !amount) return;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("adjustStack", { playerId, delta: amount, note });
      return;
    }
    const isSelfRebuy = player.isHero && amount > 0 && note === "Rebuy";
    if (!isSelfRebuy && !isHost(game)) {
      game.feedback = "Only the host can adjust stacks.";
      renderGame();
      return;
    }
    if (game.handActive) {
      game.feedback = "Adjust stacks between hands.";
      renderGame();
      return;
    }
    if (amount > 0) {
      player.stack += amount;
      player.buyIn = Math.round(Number(player.buyIn || 0)) + amount;
      player.sittingOut = false;
    } else {
      const removed = Math.min(player.stack, Math.abs(amount));
      player.stack -= removed;
      player.cashOut = Math.round(Number(player.cashOut || 0)) + removed;
    }
    recordLedger(game, {
      type: amount > 0 ? "BUY_IN" : "CASH_OUT",
      playerId: player.id,
      playerName: player.name,
      amount,
      note
    });
    game.feedback = `${player.name} stack adjusted ${amount > 0 ? "+" : ""}${amount}.`;
    addLog(game, game.feedback);
    renderGame();
  }

  function pauseGame(renderAfter = true) {
    const game = state.game;
    if (!game) return;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("pause");
      return;
    }
    if (!isHost(game)) {
      game.feedback = "Only the host can pause the room.";
    } else {
      game.isPaused = true;
      game.feedback = "Room paused by host.";
      addLog(game, game.feedback);
    }
    if (renderAfter) renderGame();
  }

  function resumeGame(renderAfter = true) {
    const game = state.game;
    if (!game) return;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("resume");
      return;
    }
    if (!isHost(game)) {
      game.feedback = "Only the host can resume the room.";
    } else {
      game.isPaused = false;
      game.feedback = "Room resumed by host.";
      addLog(game, game.feedback);
      continueHand(game);
    }
    if (renderAfter) renderGame();
  }

  function applyQuickBet(size) {
    const game = state.game;
    const active = game ? getCurrentPlayer(game) : null;
    if (!game || !active || active.type !== "human" || game.isPaused) return;
    const maxTotal = active.currentBet + active.stack;
    const minTotal = getMinimumRaiseTo(game, active);
    if (!maxTotal || maxTotal < minTotal) return;
    let target = minTotal;
    if (size === "allin") {
      target = maxTotal;
    } else {
      const multiplier = size === "half" ? 0.5 : size === "twothirds" ? 0.67 : 1;
      const potSized = Math.round(Math.max(game.pot, game.bigBlind) * multiplier);
      target = game.currentBet > 0
        ? game.currentBet + Math.max(game.minRaise, potSized)
        : Math.max(game.bigBlind, potSized);
    }
    if (elements.pokerRaiseInput) {
      elements.pokerRaiseInput.value = String(Math.min(maxTotal, Math.max(minTotal, Math.round(target))));
      elements.pokerRaiseInput.focus();
    }
  }

  function exportSession() {
    const game = state.game;
    if (!game) return;
    const exportedAt = nowIso();
    const payload = {
      version: 1,
      exportedAt,
      roomCode: game.roomCode,
      mode: game.mode,
      playMoneyOnly: true,
      settings: game.settings,
      players: game.players.map((player) => ({
        id: player.id,
        name: player.name,
        type: player.type === "bot" ? "demo" : "player",
        seat: player.seat,
        stack: player.stack,
        buyIn: player.buyIn,
        cashOut: player.cashOut,
        net: player.cashOut + player.stack - player.buyIn
      })),
      handHistory: game.handHistory || [],
      ledger: game.ledger || [],
      chat: game.chat || [],
      log: game.log || []
    };
    downloadJsonFile(payload, `quantgym-poker-${game.roomCode}-${exportedAt.slice(0, 10)}.json`);
    game.feedback = "Session export prepared.";
    renderGame();
  }

  function matchTournament(renderAfter = true) {
    closeWebSocket();
    state.game = makeGameRound();
    if (canUseOnline() && state.game.mode !== "demo") {
      state.game.online = true;
      state.game.feedback = "Creating online private table...";
      if (renderAfter) renderGame();
      ensureOnlineRoom({ force: true, create: true });
      return;
    }
    setRoomUrl(state.game, "replace");
    state.game.feedback = state.game.mode === "demo"
      ? "New local demo table created."
      : "New private table created. Share the room link when ready.";
    if (renderAfter) renderGame();
  }

  function newGame(renderAfter = true) {
    if (!state.game) {
      resetTournament(false);
    } else if (isOnlineRoom(state.game)) {
      sendOnlineCommand(state.game.status === "registering" ? "startHand" : "nextHand");
      return;
    } else if (state.game.status === "registering") {
      startTournament(false);
    } else if (state.game.handActive && !state.game.handComplete) {
      state.game.feedback = "Finish the current hand before dealing the next one.";
    } else {
      startNextHand(state.game);
    }
    if (renderAfter) renderGame();
  }

  function resetTournament(renderAfter = true) {
    closeWebSocket();
    state.game = makeGameRound();
    if (canUseOnline() && state.game.mode !== "demo") {
      state.game.online = true;
      state.game.feedback = "Creating online private table...";
      if (renderAfter) renderGame();
      ensureOnlineRoom({ force: true, create: true });
      return;
    }
    setRoomUrl(state.game, "replace");
    if (renderAfter) renderGame();
  }

  function startTournament(renderAfter = true) {
    const game = state.game || makeGameRound();
    state.game = game;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("startHand");
      return;
    }
    if (game.isPaused) {
      game.feedback = "Resume the room before starting a hand.";
      if (renderAfter) renderGame();
      return;
    }
    if (!isHost(game)) {
      game.feedback = "Only the host can start the next hand.";
      if (renderAfter) renderGame();
      return;
    }
    if (game.mode === "demo" && getActivePlayers(game).length < POKER_MIN_PLAYERS) {
      fillBotsForGame(game, POKER_MIN_PLAYERS);
    }
    if (getActivePlayers(game).length < POKER_MIN_PLAYERS) {
      game.feedback = "Need at least two active seated players to start a hand.";
      if (renderAfter) renderGame();
      return;
    }
    if (game.status !== "running") {
      game.status = "running";
      game.feedback = "Cash table started. Shuffle up and deal.";
      addLog(game, "Cash table started.");
    }
    if (!game.handActive && game.handComplete) startNextHand(game);
    if (renderAfter) renderGame();
  }

  function sendAction(action) {
    deps.submitAction?.(action);
  }

  function createFormData(form) {
    const FormDataCtor = windowRef?.FormData || globalThis.FormData;
    return new FormDataCtor(form);
  }

  function stopEvent(event) {
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  function isElement(value) {
    const ElementCtor = windowRef?.Element || globalThis.Element;
    return ElementCtor ? value instanceof ElementCtor : Boolean(value?.closest);
  }

  return {
    adjustStack,
    applyQuickBet,
    applySettings,
    createTournament,
    exportSession,
    getMode,
    handleDocumentClick,
    handleDocumentSubmit,
    handlePanelClick,
    handlePanelSubmit,
    makeGameRound,
    matchTournament,
    newGame,
    pauseGame,
    resetTournament,
    resumeGame,
    sendChat,
    setPlayerSittingOut,
    startTournament
  };
}
