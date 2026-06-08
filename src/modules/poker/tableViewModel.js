import { formatBoardCards, formatCardView } from "./cardView.js";
import { POKER_MIN_PLAYERS } from "./model.js";

export function getPokerStatusLabel(game) {
  if (game.isPaused) return "Paused";
  if (game.status === "running") return game.handActive ? "In hand" : "Between hands";
  return "Open room";
}

export function getPokerTableHint(game, active, toCall, helpers = {}) {
  const {
    getNextOpenSeat = () => null,
    isRegistering = () => false,
    isSpectator = () => false
  } = helpers;
  if (isSpectator(game)) {
    if (getNextOpenSeat(game) != null && isRegistering(game)) {
      return "You are watching. An open seat is available between hands.";
    }
    return "You are watching this table. Player hole cards stay hidden until showdown.";
  }
  if (game.isPaused) return "The host paused this room. Resume before dealing or acting.";
  if (game.status === "registering") return "Seat at least two active players, then start the first cash hand.";
  if (game.handComplete) return "Hand finished. The host can deal the next hand when ready.";
  if (!active) return "Table is resolving automatic actions.";
  return `Action on ${active.name}${toCall ? `, call ${toCall}` : ", check is available"}.`;
}

function buildSeatBadges(game, player, playerIndex, getBlindSeats) {
  const badges = [];
  if (playerIndex === game.dealerIndex) badges.push("D");
  if (game.handActive) {
    const blindSeats = getBlindSeats(game);
    if (playerIndex === blindSeats.small) badges.push("SB");
    if (playerIndex === blindSeats.big) badges.push("BB");
  }
  if (player.allIn) badges.push("ALL-IN");
  if (player.folded) badges.push("FOLD");
  if (player.sittingOut) badges.push("SIT OUT");
  if (player.stack <= 0 && !player.inHand) badges.push("NEEDS BUY-IN");
  return badges;
}

function buildHoleCards(game, player) {
  const shouldReveal = player.cardsVisible || player.isHero || game.handComplete || game.stage === "showdown";
  const cards = player.cards?.length ? player.cards : [null, null];
  return cards.map((card, index) => ({
    dealIndex: index,
    revealed: Boolean(shouldReveal && card),
    card: shouldReveal && card ? formatCardView(card) : null
  }));
}

export function buildPokerSeatGrid(game, helpers = {}) {
  const {
    getBlindSeats = () => ({}),
    getHero = () => null,
    getNextOpenSeat = () => null,
    isHost = () => false,
    isOnlineRoom = () => false,
    isRegistering = () => false
  } = helpers;

  const seats = [];
  const playersBySeat = new Map((game.players || []).map((player) => [player.seat, player]));
  for (let seatIndex = 0; seatIndex < game.seatCount; seatIndex += 1) {
    const player = playersBySeat.get(seatIndex);
    if (!player) {
      const canSit = isRegistering(game) && (!isOnlineRoom(game) || !getHero(game));
      const canBot = !isOnlineRoom(game) && isRegistering(game) && isHost(game);
      seats.push({
        seatIndex,
        seatNumber: seatIndex + 1,
        empty: true,
        canSit,
        canBot,
        hint: canSit ? "Ready for player" : "Join next hand"
      });
      continue;
    }
    const playerIndex = game.players.indexOf(player);
    const isTurn = playerIndex === game.actionIndex && game.handActive && !game.handComplete;
    const canRemove = isRegistering(game) && (isHost(game) || player.isHero);
    seats.push({
      seatIndex,
      seatNumber: seatIndex + 1,
      empty: false,
      id: player.id,
      name: player.name,
      type: player.type,
      isHero: Boolean(player.isHero),
      isTurn,
      folded: Boolean(player.folded),
      allIn: Boolean(player.allIn),
      sittingOut: Boolean(player.sittingOut),
      eliminated: Boolean(player.eliminated || (player.stack <= 0 && !player.inHand)),
      badges: buildSeatBadges(game, player, playerIndex, getBlindSeats),
      holeCards: buildHoleCards(game, player),
      stack: Math.max(0, Math.round(player.stack)),
      currentBet: Math.round(player.currentBet || 0),
      lastAction: player.lastAction || (player.inHand ? "Waiting" : "Registered"),
      canRemove
    });
  }
  return seats;
}

export function buildPokerLobbyControls(game, helpers = {}) {
  const {
    getActivePlayers = () => [],
    getDefaultPlayerName = () => "You",
    getHero = () => null,
    getInviteLink = () => "",
    getNextOpenSeat = () => null,
    isHost = () => false,
    isOnlineRoom = () => false,
    isRegistering = () => false,
    isSpectator = () => false
  } = helpers;

  const canRegister = isRegistering(game);
  const activeCount = getActivePlayers(game).length;
  const host = isHost(game);
  const online = isOnlineRoom(game);
  const hero = getHero(game);
  const spectator = isSpectator(game);
  const hasOpenSeat = getNextOpenSeat(game) != null;
  const alreadySeatedOnline = online && Boolean(hero);

  const takeSeatLabel = alreadySeatedOnline
    ? "SEATED"
    : hasOpenSeat
      ? "TAKE SEAT"
      : spectator
        ? "WATCHING"
        : "FULL";

  const startLabel = game.handActive && !game.handComplete
    ? "Hand running"
    : activeCount < POKER_MIN_PLAYERS
      ? "Need 2 players"
      : "Start hand";

  const avgStack = game.players.length
    ? Math.round(game.players.reduce((sum, player) => sum + player.stack, 0) / game.players.length)
    : 0;
  const waiting = game.players.filter((player) => player.sittingOut || player.stack <= 0).length;
  const watching = (game.spectators || []).length;

  return {
    roomLink: getInviteLink(game),
    defaultPlayerName: getDefaultPlayerName(),
    mode: game.mode,
    lobbySummary: `${getPokerStatusLabel(game)} · avg ${avgStack} · 100BB start${waiting ? ` · ${waiting} waiting` : ""}${watching ? ` · ${watching} watching` : ""}`,
    takeSeat: {
      disabled: alreadySeatedOnline || !canRegister || !hasOpenSeat,
      label: takeSeatLabel
    },
    addBot: {
      disabled: online || !canRegister || !hasOpenSeat || !host
    },
    fillBots: {
      disabled: online || !canRegister || !hasOpenSeat || !host
    },
    startHand: {
      disabled: Boolean(game.isPaused || (game.handActive && !game.handComplete) || activeCount < POKER_MIN_PLAYERS || !host),
      label: startLabel
    },
    pause: {
      disabled: !host || game.isPaused || game.status === "registering"
    },
    resume: {
      disabled: !host || !game.isPaused
    },
    exportSession: {
      disabled: !game.players.length
    },
    nextHand: {
      disabled: Boolean(game.isPaused || (game.handActive && !game.handComplete) || activeCount < POKER_MIN_PLAYERS || !host),
      label: game.status === "registering" ? "Start hand" : "Next hand"
    }
  };
}

export function buildPokerHudPrompt(game, helpers = {}) {
  const {
    formatNumber = (value) => String(value),
    getActivePlayers = () => [],
    getCurrentPlayer = () => null,
    getHeroPreflopCoach = () => "",
    getOnlineLabel = () => "Local",
    getSpectators = () => [],
    getStageLabel = (stage) => stage || "",
    getTableHint = getPokerTableHint,
    getToCall = () => 0,
    getViewerModeLabel = () => "LOCAL",
    isSpectator = () => false,
    getNextOpenSeat = () => null
  } = helpers;

  const livePlayers = getActivePlayers(game);
  const spectatorCount = getSpectators(game).length;
  const active = getCurrentPlayer(game);
  const toCall = active ? getToCall(game, active) : 0;
  const coach = getHeroPreflopCoach(game);

  return {
    viewerBadge: getViewerModeLabel(game),
    onlineLabel: getOnlineLabel(game),
    status: game.isPaused ? "Paused" : getPokerStatusLabel(game),
    handNumber: game.handNumber || 0,
    activeCount: livePlayers.length,
    spectatorCount,
    stageLabel: getStageLabel(game.stage),
    pot: game.pot,
    currentBet: game.currentBet,
    hint: getTableHint(game, active, toCall, helpers),
    coach: coach || ""
  };
}

export function buildPokerTableViewModel(game, runtime = {}, helpers = {}) {
  if (!game) return null;

  const {
    formatNumber = (value) => String(value),
    getActivePlayers = () => [],
    getCurrentPlayer = () => null,
    getMinimumRaiseTo = () => 0,
    getToCall = () => 0,
    isSpectator = () => false,
    getNextOpenSeat = () => null
  } = helpers;

  const active = getCurrentPlayer(game);
  const hero = helpers.getHero?.(game) || null;
  const canAct = Boolean(
    active
    && active.type === "human"
    && (active.isHero || active.id === hero?.id)
    && game.status === "running"
    && game.handActive
    && !game.handComplete
    && !game.isPaused
  );
  const toCall = active ? getToCall(game, active) : 0;
  const minRaiseTo = active ? getMinimumRaiseTo(game, active) : 0;
  const maxRaiseTo = active ? active.currentBet + active.stack : 0;
  const canRaise = Boolean(canAct && maxRaiseTo >= minRaiseTo && minRaiseTo > game.currentBet);

  const raiseInput = Number(runtime.raiseInput ?? minRaiseTo);
  const normalizedRaise = canRaise
    ? Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseInput || minRaiseTo))
    : minRaiseTo;

  const turnPrompt = canAct
    ? (active.isHero || active.id === "hero" ? "YOUR TURN" : `${active.name} to act`)
    : isSpectator(game)
      ? (getNextOpenSeat(game) == null ? "WATCHING · TABLE FULL" : "WATCHING · SEAT AVAILABLE")
      : game.status === "registering"
        ? "Room open. Seat players or add demo players."
        : game.isPaused
          ? "Room paused."
          : game.handComplete
            ? "Hand complete."
            : "Demo players are acting...";

  const livePlayers = getActivePlayers(game);
  const averageStack = livePlayers.length
    ? Math.round(livePlayers.reduce((sum, player) => sum + player.stack, 0) / livePlayers.length)
    : 0;
  const leader = [...(game.players || [])]
    .filter((player) => !player.eliminated)
    .sort((a, b) => b.stack - a.stack)[0];

  return {
    stageLabel: helpers.getStageLabel?.(game.stage) || game.stage,
    playerCountLabel: `${game.players.length}/${game.seatCount}${(game.spectators || []).length ? ` · ${game.spectators.length} watching` : ""}`,
    potLabel: `Pot ${game.pot}`,
    board: formatBoardCards(game.board),
    seats: buildPokerSeatGrid(game, helpers),
    hud: buildPokerHudPrompt(game, helpers),
    tournament: {
      blinds: `${game.smallBlind} / ${game.bigBlind}`,
      hand: `#${game.handNumber || 0}`,
      averageStack: formatNumber(averageStack),
      leader: leader ? `${leader.name} · ${formatNumber(leader.stack)}` : "No leader yet"
    },
    lobby: buildPokerLobbyControls(game, helpers),
    actions: {
      canAct,
      toCall,
      minRaiseTo,
      maxRaiseTo,
      canRaise,
      canCall: canAct,
      canFold: canAct,
      canAllIn: Boolean(canAct && active && active.stack > 0),
      callLabel: toCall ? `Call ${toCall}` : "Check",
      raiseLabel: game.currentBet ? "Raise" : "Bet",
      turnPrompt,
      raiseInput: normalizedRaise,
      raiseStep: game.bigBlind,
      quickBetsDisabled: !canRaise
    },
    feedback: game.feedback || ""
  };
}
