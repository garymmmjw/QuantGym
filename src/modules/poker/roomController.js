import {
  hydratePokerGame as hydratePokerGameModel,
  POKER_LAST_ROOM_KEY,
  POKER_ROOM_STORAGE_PREFIX,
  POKER_SINGLE_TABLE_CODE
} from './model.js';

export function createPokerRoomController(deps = {}) {
  const {
    canUseOnline = () => false,
    documentRef = globalThis.document,
    elements = {},
    ensureOnlineRoom = async () => false,
    getCurrentUser = () => null,
    getSingleTableCode = (value) => value,
    makeGameRound = () => null,
    normalizePlayerName = (value) => String(value || ""),
    normalizeRoomCode = (value) => String(value || ""),
    renderGame = () => {},
    state = {},
    windowRef = globalThis.window || globalThis
  } = deps;

  const getStorage = () => windowRef.localStorage || globalThis.localStorage;
  const getNavigator = () => windowRef.navigator || globalThis.navigator;

  function getDefaultPlayerName() {
    return normalizePlayerName(getCurrentUser()?.name || "You");
  }

  function loadInitialGame() {
    const fromUrl = getRoomCodeFromUrl();
    if (fromUrl && canUseOnline()) {
      const game = makeGameRound();
      if (!game) return null;
      game.roomCode = getSingleTableCode(fromUrl);
      game.online = true;
      game.feedback = "Joining online poker room...";
      state.game = game;
      ensureOnlineRoom({ roomCode: game.roomCode, force: true });
      return game;
    }

    const storedCode = getSingleTableCode(fromUrl || safeStorageGet(POKER_LAST_ROOM_KEY));
    const stored = loadRoomFromStorage(storedCode);
    const game = stored || makeGameRound();
    if (!game) return null;
    if (game.mode !== "demo") game.roomCode = POKER_SINGLE_TABLE_CODE;
    state.game = game;
    setRoomUrl(game, "replace");
    if (!fromUrl && canUseOnline() && game.mode !== "demo") ensureOnlineRoom({ force: true });
    return game;
  }

  function getRoomCodeFromUrl() {
    try {
      const parsed = new URL(windowRef.location.href);
      return normalizeRoomCode(parsed.searchParams.get("pokerRoom") || "");
    } catch {
      return "";
    }
  }

  function safeStorageGet(key) {
    try {
      return getStorage()?.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function safeStorageSet(key, value) {
    try {
      getStorage()?.setItem(key, value);
    } catch {
      // Local file previews may disable storage; the room still works in memory.
    }
  }

  function loadRoomFromStorage(roomCode) {
    const code = normalizeRoomCode(roomCode);
    if (!code) return null;
    try {
      const raw = getStorage()?.getItem(`${POKER_ROOM_STORAGE_PREFIX}${code}`);
      if (!raw) return null;
      return hydrateGame(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function hydrateGame(raw) {
    return hydratePokerGameModel(raw, {
      currentUserId: getCurrentUser()?.id || "",
      defaultPlayerName: getDefaultPlayerName()
    });
  }

  function persistRoom(game) {
    if (!game?.roomCode) return;
    game.updatedAt = new Date().toISOString();
    safeStorageSet(POKER_LAST_ROOM_KEY, game.roomCode);
    safeStorageSet(`${POKER_ROOM_STORAGE_PREFIX}${game.roomCode}`, JSON.stringify(game));
  }

  function setRoomUrl(game, mode = "replace") {
    if (!game?.roomCode) return;
    try {
      const url = new URL(windowRef.location.href);
      url.searchParams.set("pokerRoom", game.roomCode);
      url.hash = "poker";
      if (mode === "push") windowRef.history.pushState(null, "", url.toString());
      else windowRef.history.replaceState(null, "", url.toString());
    } catch {
      // File previews without History support can keep the in-memory room.
    }
  }

  function getInviteLink(game) {
    const url = new URL(windowRef.location.href);
    url.searchParams.set("pokerRoom", game?.roomCode || "QG");
    url.hash = "poker";
    return url.toString();
  }

  async function copyRoomLink() {
    if (!state.game) state.game = makeGameRound();
    const link = getInviteLink(state.game);
    try {
      await getNavigator()?.clipboard?.writeText(link);
      state.game.feedback = "Room link copied. Share it with players before starting.";
    } catch {
      elements.pokerRoomLinkInput?.select();
      documentRef.execCommand?.("copy");
      state.game.feedback = "Room link selected for copying.";
    }
    renderGame();
  }

  return {
    copyRoomLink,
    getDefaultPlayerName,
    getInviteLink,
    getRoomCodeFromUrl,
    hydrateGame,
    loadInitialGame,
    loadRoomFromStorage,
    persistRoom,
    safeStorageGet,
    safeStorageSet,
    setRoomUrl
  };
}
