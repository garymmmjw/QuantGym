import { POKER_BLIND_LEVELS } from '../../constants.js';
import { makeId } from '../../lib/id.js';
import { clampNumber } from '../../lib/number.js';

export const POKER_TABLE_SEATS = 10;
export const POKER_STARTING_STACK_BB = 100;
export const POKER_MIN_PLAYERS = 2;
export const POKER_ROOM_STORAGE_PREFIX = "quantgym.pokerRoom.v1.";
export const POKER_LAST_ROOM_KEY = "quantgym.pokerRoom.last.v1";
export const POKER_SINGLE_TABLE_CODE = "QG-MAIN";
export const POKER_DEMO_PLAYER_NAMES = ["Ivy Demo", "Max Demo", "Rio Demo", "Nova Demo", "Kai Demo", "Vega Demo", "Mina Demo", "Theo Demo", "Luna Demo", "Axel Demo"];

export function getDefaultPokerSettings(bigBlind = POKER_BLIND_LEVELS[0].big) {
  const smallBlind = Math.max(1, Math.round(bigBlind / 2));
  return {
    roomName: "Private cash table",
    smallBlind,
    bigBlind,
    ante: 0,
    startingStack: bigBlind * POKER_STARTING_STACK_BB,
    maxPlayers: POKER_TABLE_SEATS,
    decisionTimeLimit: 30,
    allowSpectators: true,
    spectatorChat: true,
    autoStartNextHand: false,
    autoIncreaseBlinds: false
  };
}

export function makePokerRoomCode() {
  return POKER_SINGLE_TABLE_CODE;
}

export function normalizePokerPlayerName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 18) || "Player";
}

export function createPokerPlayer({ id, name, type = "human", seat, stack, isHero = false }) {
  const normalizedStack = Math.max(0, Math.round(Number(stack || POKER_BLIND_LEVELS[0].big * POKER_STARTING_STACK_BB)));
  return {
    id: id || `${type}-${makeId()}`,
    name: normalizePokerPlayerName(name),
    type,
    isHero,
    seat,
    stack: normalizedStack,
    buyIn: normalizedStack,
    cashOut: 0,
    connected: true,
    sittingOut: false,
    sitOutNextHand: false,
    isHost: false,
    cards: [],
    currentBet: 0,
    committed: 0,
    inHand: false,
    folded: false,
    allIn: false,
    acted: false,
    eliminated: false,
    lastAction: "Registered"
  };
}

export function normalizePokerRoomCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

export function getPokerSingleTableCode(value = "") {
  const normalized = normalizePokerRoomCode(value);
  return normalized === "DEMO" ? normalized : POKER_SINGLE_TABLE_CODE;
}

export function hydratePokerGame(raw, options = {}) {
  if (!raw || typeof raw !== "object") return null;
  const currentUserId = options.currentUserId || "";
  const defaultPlayerName = options.defaultPlayerName || "You";
  const nowIso = typeof options.nowIso === "function" ? options.nowIso : () => new Date().toISOString();
  const defaultSettings = getDefaultPokerSettings(Number(raw.bigBlind || raw.settings?.bigBlind || POKER_BLIND_LEVELS[0].big));
  const settings = {
    ...defaultSettings,
    ...(raw.settings || {})
  };
  settings.smallBlind = Math.max(1, Math.round(Number(settings.smallBlind || defaultSettings.smallBlind)));
  settings.bigBlind = Math.max(settings.smallBlind + 1, Math.round(Number(settings.bigBlind || defaultSettings.bigBlind)));
  settings.ante = Math.max(0, Math.round(Number(settings.ante || 0)));
  settings.startingStack = Math.max(settings.bigBlind * 20, Math.round(Number(settings.startingStack || defaultSettings.startingStack)));
  settings.maxPlayers = clampNumber(Math.round(Number(settings.maxPlayers || POKER_TABLE_SEATS)), POKER_MIN_PLAYERS, POKER_TABLE_SEATS);
  settings.decisionTimeLimit = clampNumber(Math.round(Number(settings.decisionTimeLimit || 30)), 10, 180);
  const game = {
    id: raw.id || makeId(),
    mode: raw.mode === "demo" ? "demo" : "private",
    roomCode: normalizePokerRoomCode(raw.roomCode) || makePokerRoomCode(),
    createdAt: raw.createdAt || nowIso(),
    updatedAt: raw.updatedAt || nowIso(),
    version: 2,
    online: Boolean(raw.online),
    hostPlayerId: raw.hostPlayerId || "hero",
    hostUserId: raw.hostUserId || "",
    isPaused: Boolean(raw.isPaused),
    settings,
    status: raw.status === "running" ? "running" : "registering",
    seatCount: settings.maxPlayers,
    startingStack: settings.startingStack,
    players: [],
    spectators: Array.isArray(raw.spectators) ? raw.spectators : [],
    viewerRole: raw.viewerRole || raw.participant?.role || "",
    viewer: raw.viewer && typeof raw.viewer === "object" ? raw.viewer : raw.participant || null,
    dealerIndex: Number.isInteger(raw.dealerIndex) ? raw.dealerIndex : -1,
    handNumber: Math.max(0, Math.round(Number(raw.handNumber || 0))),
    handsPlayed: Math.max(0, Math.round(Number(raw.handsPlayed || 0))),
    blindInterval: Math.max(1, Math.round(Number(raw.blindInterval || 3))),
    level: Math.max(0, Math.round(Number(raw.level || 0))),
    levelIncreasedAt: Number.isFinite(Number(raw.levelIncreasedAt)) ? Number(raw.levelIncreasedAt) : -1,
    smallBlind: settings.smallBlind,
    bigBlind: settings.bigBlind,
    ante: settings.ante,
    stage: raw.stage || "waiting",
    board: Array.isArray(raw.board) ? raw.board : [],
    deck: Array.isArray(raw.deck) ? raw.deck : [],
    pot: Math.max(0, Math.round(Number(raw.pot || 0))),
    currentBet: Math.max(0, Math.round(Number(raw.currentBet || 0))),
    minRaise: Math.max(settings.bigBlind, Math.round(Number(raw.minRaise || settings.bigBlind))),
    actionIndex: Number.isInteger(raw.actionIndex) ? raw.actionIndex : -1,
    handActive: Boolean(raw.handActive),
    handComplete: raw.handComplete !== false,
    tournamentOver: false,
    heroStackAtHandStart: Math.max(0, Math.round(Number(raw.heroStackAtHandStart || settings.startingStack))),
    showdown: raw.showdown || null,
    dealSerial: Math.max(0, Math.round(Number(raw.dealSerial || 0))),
    feedback: raw.feedback || "Room restored.",
    log: Array.isArray(raw.log) ? raw.log.slice(-24) : [],
    currentHandLog: Array.isArray(raw.currentHandLog) ? raw.currentHandLog.slice(-120) : [],
    handHistory: Array.isArray(raw.handHistory) ? raw.handHistory.slice(-80) : [],
    ledger: Array.isArray(raw.ledger) ? raw.ledger.slice(-200) : [],
    chat: Array.isArray(raw.chat) ? raw.chat.slice(-160) : []
  };
  const players = Array.isArray(raw.players) ? raw.players : [];
  game.players = players
    .map((item) => ({
      ...createPokerPlayer({
        id: item.id,
        name: item.name,
        type: item.type === "bot" ? "bot" : "human",
        seat: Number.isInteger(item.seat) ? item.seat : getNextHydratedPokerSeat(game.players, settings.maxPlayers),
        stack: item.stack,
        isHero: Boolean(item.isHero)
      }),
      ...item,
      cards: Array.isArray(item.cards) ? item.cards : [],
      currentBet: Math.max(0, Math.round(Number(item.currentBet || 0))),
      committed: Math.max(0, Math.round(Number(item.committed || 0))),
      buyIn: Math.max(0, Math.round(Number(item.buyIn ?? item.stack ?? settings.startingStack))),
      cashOut: Math.max(0, Math.round(Number(item.cashOut || 0))),
      connected: item.connected !== false,
      sittingOut: Boolean(item.sittingOut),
      sitOutNextHand: Boolean(item.sitOutNextHand),
      isHost: Boolean(item.isHost || item.id === (raw.hostPlayerId || "hero")),
      stack: Math.max(0, Math.round(Number(item.stack || 0)))
    }))
    .filter((player, index, all) => Number.isInteger(player.seat) && player.seat >= 0 && player.seat < settings.maxPlayers && all.findIndex((item) => item.id === player.id) === index);
  if (!game.online && !game.players.some((player) => player.isHero)) {
    if (game.players[0]) {
      game.players[0].isHero = true;
    } else {
      const fallbackPlayer = createPokerPlayer({
        id: "hero",
        name: defaultPlayerName,
        seat: 0,
        stack: settings.startingStack,
        isHero: true
      });
      fallbackPlayer.isHost = true;
      game.hostPlayerId = fallbackPlayer.id;
      game.players.push(fallbackPlayer);
    }
  }
  game.players.forEach((player) => {
    player.isHost = player.id === game.hostPlayerId;
  });
  game.spectators = (Array.isArray(raw.spectators) ? raw.spectators : [])
    .map((item) => ({
      id: item.id || `spectator-${item.userId || makeId()}`,
      userId: item.userId || "",
      name: normalizePokerPlayerName(item.name || "Spectator"),
      connected: item.connected !== false,
      joinedAt: item.joinedAt || "",
      lastSeenAt: item.lastSeenAt || "",
      isHero: Boolean(item.isHero || (game.online && item.userId && item.userId === currentUserId))
    }))
    .filter((item, index, all) => item.userId && all.findIndex((other) => other.userId === item.userId) === index);
  if (game.online && !game.viewerRole) {
    const viewerPlayer = game.players.find((player) => player.isHero || player.userId === currentUserId);
    const viewerSpectator = game.spectators.find((spectator) => spectator.isHero || spectator.userId === currentUserId);
    game.viewerRole = viewerPlayer?.isHost ? "host" : viewerPlayer ? "player" : viewerSpectator ? "spectator" : "guest";
    game.viewer = viewerPlayer || viewerSpectator || game.viewer;
  }
  sortPokerModelPlayers(game);
  return game;
}

function getNextHydratedPokerSeat(players, seatCount) {
  const occupied = new Set(players.map((player) => player.seat));
  for (let seat = 0; seat < seatCount; seat += 1) {
    if (!occupied.has(seat)) return seat;
  }
  return null;
}

function sortPokerModelPlayers(game) {
  game.players.sort((a, b) => a.seat - b.seat);
}
