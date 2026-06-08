import { createPokerActionController } from '../modules/poker/actionController.js';
import { createPokerHandFlowController } from '../modules/poker/handFlowController.js';
import {
  createPokerPlayer,
  getDefaultPokerSettings,
  getPokerSingleTableCode,
  normalizePokerPlayerName,
  normalizePokerRoomCode,
  POKER_DEMO_PLAYER_NAMES
} from '../modules/poker/model.js';
import { createPokerOnlineController } from '../modules/poker/onlineController.js';
import { createPokerPanelView } from '../modules/poker/panelView.js';
import { createPokerPreflopView } from '../modules/poker/preflopView.js';
import { createPokerPlayerController } from '../modules/poker/playerController.js';
import { createPokerRoomController } from '../modules/poker/roomController.js';
import { createPokerTableView } from '../modules/poker/tableView.js';

export function createPokerControllerBundle(deps = {}) {
  const {
    appState,
    canUseCloud,
    cloudApi,
    documentRef: document,
    elements: els,
    escapeHtml,
    formatNumber,
    getCloudApiBase,
    makeId,
    pokerState,
    randomInt,
    recordGameResult,
    routingMode,
    refreshIcons,
    windowRef: window
  } = deps;

  const pokerRoomController = createPokerRoomController({
    canUseOnline: () => canUsePokerOnline(),
    documentRef: document,
    elements: els,
    ensureOnlineRoom: (...args) => ensurePokerOnlineRoom(...args),
    getCurrentUser: () => appState.currentUser,
    getSingleTableCode: getPokerSingleTableCode,
    makeGameRound: () => makePokerGameRound(),
    normalizePlayerName: normalizePokerPlayerName,
    normalizeRoomCode: normalizePokerRoomCode,
    renderGame: () => renderPokerGame(),
    routingMode,
    state: pokerState,
    windowRef: window
  });
  const getDefaultPokerPlayerName = pokerRoomController.getDefaultPlayerName;
  const loadInitialPokerGame = pokerRoomController.loadInitialGame;
  const getPokerRoomCodeFromUrl = pokerRoomController.getRoomCodeFromUrl;
  const hydratePokerGame = pokerRoomController.hydrateGame;
  const persistPokerRoom = pokerRoomController.persistRoom;
  const setPokerRoomUrl = pokerRoomController.setRoomUrl;
  const getPokerInviteLink = pokerRoomController.getInviteLink;
  const copyPokerRoomLink = pokerRoomController.copyRoomLink;

  const pokerOnlineController = createPokerOnlineController({
    canUseCloud,
    cloudApi,
    elements: els,
    getApiBase: getCloudApiBase,
    getCloudToken: () => appState.cloudConfig.token,
    getCurrentUser: () => appState.currentUser,
    getDefaultSettings: getDefaultPokerSettings,
    getRoomCodeFromUrl: () => getPokerRoomCodeFromUrl(),
    getSingleTableCode: getPokerSingleTableCode,
    hydrateGame: (raw) => hydratePokerGame(raw),
    normalizePlayerName: normalizePokerPlayerName,
    normalizeRoomCode: normalizePokerRoomCode,
    renderGame: () => renderPokerGame(),
    setRoomUrl: (game, mode) => setPokerRoomUrl(game, mode),
    state: pokerState,
    windowRef: window
  });
  const canUsePokerOnline = pokerOnlineController.canUseOnline;
  const isPokerOnlineRoom = pokerOnlineController.isOnlineRoom;
  const getPokerOnlineLabel = pokerOnlineController.getLabel;
  const getPokerOnlinePlayerName = pokerOnlineController.getPlayerName;
  const ensurePokerOnlineRoom = pokerOnlineController.ensureRoom;
  const closePokerWebSocket = pokerOnlineController.closeWebSocket;
  const sendPokerOnlineCommand = pokerOnlineController.sendCommand;

  const pokerHandFlowController = createPokerHandFlowController({
    elements: els,
    getCurrentUser: () => appState.currentUser,
    isOnlineRoom: (game) => isPokerOnlineRoom(game),
    makeId,
    recordGameResult,
    renderGame: () => renderPokerGame(),
    sendOnlineCommand: (command, payload) => sendPokerOnlineCommand(command, payload),
    sortPlayers: (game) => sortPokerPlayers(game),
    startTournament: (renderAfter) => startPokerTournament(renderAfter),
    state: pokerState
  });
  const addPokerLog = pokerHandFlowController.addLog;
  const continuePokerHand = pokerHandFlowController.continueHand;
  const getCurrentPokerPlayer = pokerHandFlowController.getCurrentPlayer;
  const getMinimumPokerRaiseTo = pokerHandFlowController.getMinimumRaiseTo;
  const getPokerActivePlayers = pokerHandFlowController.getActivePlayers;
  const getPokerBlindSeats = pokerHandFlowController.getBlindSeats;
  const getPokerHero = pokerHandFlowController.getHero;
  const getPokerLedgerRows = pokerHandFlowController.getLedgerRows;
  const getPokerPositionForPlayer = pokerHandFlowController.getPositionForPlayer;
  const getPokerSpectators = pokerHandFlowController.getSpectators;
  const getPokerStageLabel = pokerHandFlowController.getStageLabel;
  const getPokerToCall = pokerHandFlowController.getToCall;
  const getPokerViewerModeLabel = pokerHandFlowController.getViewerModeLabel;
  const isPokerHost = pokerHandFlowController.isHost;
  const isPokerSpectator = pokerHandFlowController.isSpectator;
  const recordPokerLedger = pokerHandFlowController.recordLedger;
  const startNextPokerHand = pokerHandFlowController.startNextHand;
  const performPokerHandAction = pokerHandFlowController.submitAction;

  const pokerPanelView = createPokerPanelView({
    documentRef: document,
    elements: els,
    escapeHtml,
    formatNumber,
    getActivePlayers: getPokerActivePlayers,
    getDefaultSettings: getDefaultPokerSettings,
    getHero: getPokerHero,
    getLedgerRows: getPokerLedgerRows,
    getSelectedTab: () => pokerState.selectedPanelTab,
    getSpectators: getPokerSpectators,
    isHost: isPokerHost,
    isRegistering: (game) => canPokerRegister(game),
    isSpectator: isPokerSpectator,
    state: pokerState
  });
  const renderPokerPanelTabs = pokerPanelView.renderTabs;
  const renderPokerRightPanel = pokerPanelView.renderRightPanel;

  const pokerPreflopView = createPokerPreflopView({
    documentRef: document,
    elements: els,
    escapeHtml,
    getHero: getPokerHero,
    getPositionForPlayer: getPokerPositionForPlayer,
    getSelectedHand: () => pokerState.selectedPreflopHand,
    setSelectedHand(handKey) {
      pokerState.selectedPreflopHand = handKey;
    }
  });
  const renderPokerPreflopChart = pokerPreflopView.renderChart;
  const handlePokerPreflopMatrixClick = pokerPreflopView.handleMatrixClick;
  const getPokerHeroPreflopCoach = pokerPreflopView.getHeroCoach;

  const pokerPlayerController = createPokerPlayerController({
    addLog: (game, line) => addPokerLog(game, line),
    createPlayer: createPokerPlayer,
    demoPlayerNames: POKER_DEMO_PLAYER_NAMES,
    elements: els,
    getDefaultPlayerName: () => getDefaultPokerPlayerName(),
    getHero: getPokerHero,
    getOnlinePlayerName: getPokerOnlinePlayerName,
    isHost: isPokerHost,
    isOnlineRoom: isPokerOnlineRoom,
    makeGameRound: () => makePokerGameRound(),
    makeId,
    normalizePlayerName: normalizePokerPlayerName,
    randomInt,
    recordLedger: (game, entry) => recordPokerLedger(game, entry),
    renderGame: () => renderPokerGame(),
    sendOnlineCommand: (command, payload) => sendPokerOnlineCommand(command, payload),
    state: pokerState
  });
  const canPokerRegister = pokerPlayerController.canRegister;
  const getNextOpenPokerSeat = pokerPlayerController.getNextOpenSeat;
  const takePokerSeat = pokerPlayerController.takeSeat;
  const addPokerHumanToGame = pokerPlayerController.addHumanToGame;
  const addPokerBot = pokerPlayerController.addBot;
  const fillPokerBots = pokerPlayerController.fillBots;
  const fillPokerBotsForGame = pokerPlayerController.fillBotsForGame;
  const handlePokerSeatClick = pokerPlayerController.handleSeatClick;
  const removePokerPlayer = pokerPlayerController.removePlayer;
  const sortPokerPlayers = pokerPlayerController.sortPlayers;

  const pokerTableView = createPokerTableView({
    documentRef: document,
    elements: els,
    escapeHtml,
    formatNumber,
    getActivePlayers: getPokerActivePlayers,
    getBlindSeats: getPokerBlindSeats,
    getCurrentPlayer: getCurrentPokerPlayer,
    getDefaultPlayerName: () => getDefaultPokerPlayerName(),
    getHero: getPokerHero,
    getHeroPreflopCoach: getPokerHeroPreflopCoach,
    getInviteLink: getPokerInviteLink,
    getMinimumRaiseTo: getMinimumPokerRaiseTo,
    getNextOpenSeat: getNextOpenPokerSeat,
    getOnlineLabel: getPokerOnlineLabel,
    getSpectators: getPokerSpectators,
    getStageLabel: getPokerStageLabel,
    getToCall: getPokerToCall,
    getViewerModeLabel: getPokerViewerModeLabel,
    isHost: isPokerHost,
    isOnlineRoom: isPokerOnlineRoom,
    isRegistering: canPokerRegister,
    isSpectator: isPokerSpectator,
    makeGameRound: () => makePokerGameRound(),
    persistRoom: persistPokerRoom,
    refreshIcons,
    renderPanelTabs: renderPokerPanelTabs,
    renderPreflopChart: renderPokerPreflopChart,
    renderRightPanel: renderPokerRightPanel,
    state: pokerState
  });
  const renderPokerGame = pokerTableView.renderGame;

  const pokerActionController = createPokerActionController({
    addBot: (renderAfter, seat) => addPokerBot(renderAfter, seat),
    addHumanToGame: (game, options) => addPokerHumanToGame(game, options),
    addLog: (game, line) => addPokerLog(game, line),
    canUseOnline: () => canUsePokerOnline(),
    closeWebSocket: () => closePokerWebSocket(),
    continueHand: (game) => continuePokerHand(game),
    copyRoomLink: () => copyPokerRoomLink(),
    elements: els,
    ensureOnlineRoom: (options) => ensurePokerOnlineRoom(options),
    fillBots: (renderAfter) => fillPokerBots(renderAfter),
    fillBotsForGame: (game, count) => fillPokerBotsForGame(game, count),
    getActivePlayers: (game) => getPokerActivePlayers(game),
    getCurrentPlayer: (game) => getCurrentPokerPlayer(game),
    getDefaultPlayerName: () => getDefaultPokerPlayerName(),
    getDefaultSettings: getDefaultPokerSettings,
    getHero: (game) => getPokerHero(game),
    getMinimumRaiseTo: (game, player) => getMinimumPokerRaiseTo(game, player),
    handleSeatClick: (event) => handlePokerSeatClick(event),
    isHost: (game, player) => isPokerHost(game, player),
    isOnlineRoom: (game) => isPokerOnlineRoom(game),
    makeId,
    recordLedger: (game, entry) => recordPokerLedger(game, entry),
    removePlayer: (playerId) => removePokerPlayer(playerId),
    renderGame: () => renderPokerGame(),
    sendOnlineCommand: (command, payload) => sendPokerOnlineCommand(command, payload),
    setRoomUrl: (game, mode) => setPokerRoomUrl(game, mode),
    startNextHand: (game) => startNextPokerHand(game),
    state: pokerState,
    submitAction: (action) => performPokerHandAction(action),
    takeSeat: (seat, renderAfter) => takePokerSeat(seat, renderAfter),
    windowRef: window
  });
  const makePokerGameRound = pokerActionController.makeGameRound;
  const handlePokerDocumentClick = pokerActionController.handleDocumentClick;
  const handlePokerDocumentSubmit = pokerActionController.handleDocumentSubmit;
  const resetPokerTournament = pokerActionController.resetTournament;
  const startPokerTournament = pokerActionController.startTournament;
  const matchPokerTournament = pokerActionController.matchTournament;
  const nextPokerHand = pokerActionController.newGame;
  const pausePokerGame = pokerActionController.pauseGame;
  const resumePokerGame = pokerActionController.resumeGame;
  const exportPokerSession = pokerActionController.exportSession;
  const submitPokerAction = pokerActionController.submitAction;
  const applyPokerQuickBet = pokerActionController.applyQuickBet;
  const setPokerRaiseAmount = pokerActionController.setRaiseAmount;
  const sendPokerChat = pokerActionController.sendChat;
  const applyPokerSettings = pokerActionController.applySettings;
  const handlePokerPlayerAction = pokerActionController.handlePlayerAction;
  const getPokerMode = pokerActionController.getMode;
  const setPokerMode = pokerActionController.setMode;

  return {
    addPokerBot,
    addPokerBotAtSeat: (seat) => addPokerBot(true, seat),
    applyPokerQuickBet,
    applyPokerSettings,
    canPokerRegister,
    copyPokerRoomLink,
    exportPokerSession,
    fillPokerBots,
    getPokerActivePlayers,
    getPokerBlindSeats,
    getCurrentPokerPlayer,
    getDefaultPokerPlayerName,
    getMinimumPokerRaiseTo,
    getPokerHero,
    getPokerHeroPreflopCoach,
    getPokerInviteLink: getPokerInviteLink,
    getPokerLedgerRows,
    getPokerMode,
    getPokerOnlineLabel: getPokerOnlineLabel,
    getPokerSpectators,
    getPokerStageLabel,
    getPokerToCall,
    getPokerViewerModeLabel,
    getNextOpenPokerSeat,
    handlePokerDocumentClick,
    handlePokerDocumentSubmit,
    handlePokerPlayerAction,
    handlePokerPreflopMatrixClick,
    isPokerHost,
    isPokerOnlineRoom,
    isPokerSpectator,
    loadInitialPokerGame,
    makePokerGameRound,
    matchPokerTournament,
    nextPokerHand,
    pausePokerGame,
    removePokerPlayer,
    renderPokerGame,
    renderPokerPreflopChart,
    resetPokerTournament,
    resumePokerGame,
    sendPokerChat,
    setPokerMode,
    setPokerRaiseAmount,
    sitPokerAtSeat: (seat, name) => takePokerSeat(seat, true, { name }),
    startPokerTournament,
    submitPokerAction,
    takePokerSeat: (name) => takePokerSeat(null, true, { name })
  };
}
