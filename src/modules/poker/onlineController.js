export function createPokerOnlineController(deps = {}) {
  const {
    cloudApi = async () => ({}),
    elements = {},
    getApiBase = () => "",
    getCloudToken = () => "",
    getCurrentUser = () => null,
    getDefaultSettings = () => ({}),
    getRoomCodeFromUrl = () => "",
    getSingleTableCode = (value) => value,
    hydrateGame = (value) => value,
    normalizePlayerName = (value) => String(value || ""),
    normalizeRoomCode = (value) => String(value || ""),
    canUseCloud = () => false,
    renderGame = () => {},
    setRoomUrl = () => {},
    state = {},
    windowRef = globalThis.window || globalThis
  } = deps;

  const getGame = () => state.game || null;
  const getOnlineState = () => state.online || {};
  const getWebSocketCtor = () => windowRef.WebSocket || globalThis.WebSocket;

  function canUseOnline() {
    return Boolean(canUseCloud() && getWebSocketCtor());
  }

  function isOnlineRoom(game = getGame()) {
    return Boolean(game?.online);
  }

  function getLabel(game = getGame()) {
    const online = getOnlineState();
    if (!isOnlineRoom(game)) return "Local";
    if (online.connected && online.roomCode === game.roomCode) return "Online";
    if (online.connecting) return "Connecting";
    if (!canUseCloud()) return "Login required";
    return online.lastError ? "Offline fallback" : "Online ready";
  }

  function getPlayerName() {
    const currentUser = getCurrentUser() || {};
    return normalizePlayerName(elements.pokerPlayerNameInput?.value || currentUser.name || currentUser.email || "Player");
  }

  function getWebSocketUrl(roomCode) {
    const url = new URL(`${getApiBase()}/poker/ws/${encodeURIComponent(roomCode)}`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", getCloudToken());
    return url.toString();
  }

  async function ensureRoom(options = {}) {
    const game = getGame();
    const online = getOnlineState();
    if (!game || game.mode === "demo" || !canUseOnline()) return false;
    const urlRoomCode = getRoomCodeFromUrl();
    const targetCode = getSingleTableCode(options.roomCode || urlRoomCode || game.roomCode);
    if (!options.force && online.connecting) return true;
    if (!options.force && online.connected && online.roomCode === targetCode) return true;

    online.connecting = true;
    online.lastError = "";
    game.online = true;
    game.feedback = targetCode ? "Connecting to online poker room..." : "Creating online poker room...";
    renderGame();

    try {
      const body = {
        playerName: getPlayerName(),
        settings: game.settings || getDefaultSettings(game.bigBlind)
      };
      const shouldJoinExisting = !options.create && targetCode && (urlRoomCode || online.roomCode === targetCode);
      const result = shouldJoinExisting
        ? await cloudApi(`/poker/rooms/${encodeURIComponent(targetCode)}/join`, { method: "POST", body })
        : await cloudApi("/poker/rooms", { method: "POST", body });
      applyRoom(result.room, { replaceUrl: true });
      openWebSocket(result.room.code);
      return true;
    } catch (error) {
      online.lastError = error.message || "Poker online connection failed";
      online.connected = false;
      if (state.game) {
        state.game.online = false;
        state.game.feedback = `${online.lastError}. Local table is still available.`;
        renderGame();
      }
      return false;
    } finally {
      online.connecting = false;
    }
  }

  function applyRoom(room, options = {}) {
    if (!room?.state) return;
    const game = hydrateGame({
      ...room.state,
      online: true,
      roomCode: room.code || room.state.roomCode,
      participant: room.participant || null
    });
    if (!game) return;

    const online = getOnlineState();
    online.applying = true;
    online.roomCode = room.code || game.roomCode;
    online.revision = Number(room.revision || 0);
    state.game = game;
    if (options.replaceUrl !== false) setRoomUrl(game, "replace");
    renderGame();
    online.applying = false;
  }

  function openWebSocket(roomCode) {
    const code = normalizeRoomCode(roomCode);
    const online = getOnlineState();
    const WebSocketCtor = getWebSocketCtor();
    if (!code || !canUseOnline() || !WebSocketCtor) return;
    if (online.ws && online.roomCode === code && [WebSocketCtor.CONNECTING, WebSocketCtor.OPEN].includes(online.ws.readyState)) return;
    closeWebSocket();
    online.roomCode = code;

    try {
      const socket = new WebSocketCtor(getWebSocketUrl(code));
      online.ws = socket;
      socket.addEventListener("open", () => {
        online.connected = true;
        online.connecting = false;
        online.lastError = "";
        renderGame();
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "room" || message.type === "ack") applyRoom(message.room, { replaceUrl: true });
          if (message.type === "error" && state.game) {
            state.game.feedback = message.error || "Poker command failed.";
            renderGame();
          }
        } catch {
          // Ignore malformed socket messages; the next room broadcast will recover state.
        }
      });
      socket.addEventListener("close", () => {
        online.connected = false;
        if (state.game?.online && canUseOnline()) {
          windowRef.clearTimeout?.(online.reconnectTimer);
          online.reconnectTimer = windowRef.setTimeout?.(() => ensureRoom({ roomCode: code, force: true }), 1800) || 0;
        }
        renderGame();
      });
      socket.addEventListener("error", () => {
        online.lastError = "Poker socket disconnected";
        online.connected = false;
        renderGame();
      });
    } catch (error) {
      online.lastError = error.message || "Poker socket failed";
      online.connected = false;
    }
  }

  function closeWebSocket() {
    const online = getOnlineState();
    windowRef.clearTimeout?.(online.reconnectTimer);
    if (online.ws) {
      try {
        online.ws.close();
      } catch {
        // Socket may already be closed.
      }
    }
    online.ws = null;
    online.connected = false;
  }

  async function sendCommand(command, payload = {}) {
    const game = getGame();
    const online = getOnlineState();
    const WebSocketCtor = getWebSocketCtor();
    if (!isOnlineRoom(game) || !canUseCloud()) return false;
    const message = { type: "command", command, payload };
    try {
      if (WebSocketCtor && online.ws?.readyState === WebSocketCtor.OPEN) {
        online.ws.send(JSON.stringify(message));
      } else {
        const result = await cloudApi(`/poker/rooms/${encodeURIComponent(game.roomCode)}/commands`, {
          method: "POST",
          body: { command, payload }
        });
        applyRoom(result.room, { replaceUrl: true });
      }
      return true;
    } catch (error) {
      online.lastError = error.message || "Poker command failed";
      game.feedback = online.lastError;
      renderGame();
      return true;
    }
  }

  return {
    applyRoom,
    canUseOnline,
    closeWebSocket,
    ensureRoom,
    getLabel,
    getPlayerName,
    getWebSocketUrl,
    isOnlineRoom,
    openWebSocket,
    sendCommand
  };
}
