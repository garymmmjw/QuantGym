export function createPokerPlayerController(deps = {}) {
  const {
    createPlayer = () => ({}),
    demoPlayerNames = [],
    elements = {},
    getDefaultPlayerName = () => "You",
    getHero = () => null,
    getOnlinePlayerName = () => "Player",
    isHost = () => false,
    isOnlineRoom = () => false,
    makeGameRound = () => null,
    makeId = () => `${Date.now()}`,
    normalizePlayerName = (value) => String(value || ""),
    randomInt = (min, max) => Math.floor((min + max) / 2),
    recordLedger = () => {},
    renderGame = () => {},
    sendOnlineCommand = () => {},
    state = {},
    addLog = () => {}
  } = deps;

  function getGame() {
    if (!state.game) state.game = makeGameRound();
    return state.game;
  }

  function canRegister(game) {
    if (!game || game.isPaused || game.handActive) return false;
    return true;
  }

  function getNextOpenSeat(game) {
    const occupied = new Set((game?.players || []).map((player) => player.seat));
    for (let seat = 0; seat < (game?.seatCount || 0); seat += 1) {
      if (!occupied.has(seat)) return seat;
    }
    return null;
  }

  function takeSeat(seat = null, renderAfter = true) {
    const game = getGame();
    if (isOnlineRoom(game)) {
      if (getHero(game)) {
        game.feedback = "You are already seated at this table.";
        if (renderAfter) renderGame();
        return;
      }
      if (getNextOpenSeat(game) == null) {
        game.feedback = "Table is full. You are watching until a seat opens.";
        if (renderAfter) renderGame();
        return;
      }
      sendOnlineCommand("takeSeat", {
        seat: Number.isInteger(seat) ? seat : undefined,
        name: getOnlinePlayerName()
      });
      return;
    }
    if (!canRegister(game)) {
      game.feedback = "Take a seat between hands.";
      if (renderAfter) renderGame();
      return;
    }
    const targetSeat = Number.isInteger(seat) ? seat : getNextOpenSeat(game);
    if (targetSeat == null) {
      game.feedback = "No open seats at this table.";
      if (renderAfter) renderGame();
      return;
    }
    const isHero = !getHero(game);
    const rawName = elements.pokerPlayerNameInput?.value || (isHero ? getDefaultPlayerName() : `Guest ${game.players.length + 1}`);
    const name = uniqueName(game, rawName);
    addHumanToGame(game, { id: isHero ? "hero" : `human-${makeId()}`, name, seat: targetSeat, isHero });
    game.feedback = `${name} took seat ${targetSeat + 1}.`;
    addLog(game, game.feedback);
    if (renderAfter) renderGame();
  }

  function addHumanToGame(game, options = {}) {
    const seat = Number.isInteger(options.seat) ? options.seat : getNextOpenSeat(game);
    if (seat == null) return null;
    const player = createPlayer({
      id: options.id,
      name: options.name,
      type: "human",
      seat,
      stack: game.startingStack,
      isHero: Boolean(options.isHero)
    });
    player.isHost = player.id === game.hostPlayerId || (!game.players.length && Boolean(options.isHero));
    if (player.isHost) game.hostPlayerId = player.id;
    game.players.push(player);
    recordLedger(game, {
      type: "BUY_IN",
      playerId: player.id,
      playerName: player.name,
      amount: player.buyIn,
      note: "Player buy-in"
    });
    sortPlayers(game);
    return player;
  }

  function addBot(renderAfter = true, seat = null) {
    const game = getGame();
    if (isOnlineRoom(game)) {
      game.feedback = "Demo players are local-only. Invite another logged-in player for online rooms.";
      if (renderAfter) renderGame();
      return;
    }
    if (!canRegister(game)) {
      game.feedback = "Demo players can join between hands, not mid-hand.";
      if (renderAfter) renderGame();
      return;
    }
    if (!isHost(game)) {
      game.feedback = "Only the host can add demo players.";
      if (renderAfter) renderGame();
      return;
    }
    const player = addBotToGame(game, seat);
    game.feedback = player ? `${player.name} joined seat ${player.seat + 1}.` : "No open seats for another demo player.";
    if (player) addLog(game, game.feedback);
    if (renderAfter) renderGame();
  }

  function addBotToGame(game, seat = null) {
    const targetSeat = Number.isInteger(seat) ? seat : getNextOpenSeat(game);
    if (targetSeat == null) return null;
    const usedNames = new Set(game.players.map((player) => player.name));
    const name = demoPlayerNames.find((demoName) => !usedNames.has(demoName)) || `Demo ${game.players.length + 1}`;
    const player = createPlayer({
      id: `bot-${makeId()}`,
      name,
      type: "bot",
      seat: targetSeat,
      stack: game.startingStack
    });
    game.players.push(player);
    recordLedger(game, {
      type: "BUY_IN",
      playerId: player.id,
      playerName: player.name,
      amount: player.buyIn,
      note: "Demo player buy-in"
    });
    sortPlayers(game);
    return player;
  }

  function fillBots(renderAfter = true) {
    const game = getGame();
    if (isOnlineRoom(game)) {
      game.feedback = "Demo players are local-only. Invite another logged-in player for online rooms.";
      if (renderAfter) renderGame();
      return;
    }
    if (!isHost(game)) {
      game.feedback = "Only the host can fill demo seats.";
      if (renderAfter) renderGame();
      return;
    }
    const added = fillBotsForGame(game, game.seatCount);
    game.feedback = added
      ? `Added ${added} demo player${added > 1 ? "s" : ""}.`
      : "Table is already full.";
    if (renderAfter) renderGame();
  }

  function fillBotsForGame(game, targetCount = game.seatCount) {
    let added = 0;
    while (game.players.length < Math.min(targetCount, game.seatCount) && getNextOpenSeat(game) != null) {
      if (!addBotToGame(game)) break;
      added += 1;
    }
    return added;
  }

  function handleSeatClick(event) {
    const button = event.target.closest("[data-poker-seat-action]");
    if (!button || !state.game) return;
    const seat = Number(button.dataset.seat);
    const action = button.dataset.pokerSeatAction;
    if (action === "sit") {
      takeSeat(Number.isInteger(seat) ? seat : null);
      return;
    }
    if (action === "bot") {
      addBot(true, Number.isInteger(seat) ? seat : null);
      return;
    }
    if (action === "remove") {
      removePlayer(button.dataset.playerId);
    }
  }

  function removePlayer(playerId) {
    const game = state.game;
    if (!game || !canRegister(game)) return;
    const player = game.players.find((item) => item.id === playerId);
    if (!player) return;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("leaveSeat", { playerId });
      return;
    }
    if (!player.isHero && !isHost(game)) {
      game.feedback = "Only the host can remove another player.";
      renderGame();
      return;
    }
    recordLedger(game, {
      type: "CASH_OUT",
      playerId: player.id,
      playerName: player.name,
      amount: player.stack,
      note: "Left seat"
    });
    player.cashOut = Math.max(player.cashOut || 0, player.stack);
    game.players = game.players.filter((item) => item.id !== playerId);
    if (player.isHero && game.players[0]) game.players[0].isHero = true;
    if (player.id === game.hostPlayerId && game.players[0]) {
      game.hostPlayerId = game.players[0].id;
      game.players[0].isHost = true;
    }
    game.feedback = `${player.name} left the room.`;
    addLog(game, game.feedback);
    renderGame();
  }

  function uniqueName(game, rawName) {
    const base = normalizePlayerName(rawName);
    const used = new Set(game.players.map((player) => player.name.toLowerCase()));
    if (!used.has(base.toLowerCase())) return base;
    for (let index = 2; index <= 99; index += 1) {
      const candidate = `${base} ${index}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
    return `${base} ${randomInt(100, 999)}`;
  }

  function sortPlayers(game) {
    game.players.sort((a, b) => a.seat - b.seat);
  }

  return {
    addBot,
    addBotToGame,
    addHumanToGame,
    canRegister,
    fillBots,
    fillBotsForGame,
    getNextOpenSeat,
    handleSeatClick,
    removePlayer,
    sortPlayers,
    takeSeat,
    uniqueName
  };
}
