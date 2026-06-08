import { POKER_BLIND_LEVELS } from '../../constants.js';
import { clampNumber } from '../../lib/number.js';
import { randomChoice, randomInt } from '../../lib/random.js';
import {
  comparePokerHands,
  createPokerDeck,
  dealPokerHoleCards,
  drawPokerCard,
  evaluatePokerHand,
  getPreflopStrategyForCards,
  getStartingHandKey,
  getStartingHandScore,
  shufflePokerDeck
} from './engine.js';

export function createPokerHandFlowController(deps = {}) {
  const {
    elements = {},
    getCurrentUser = () => null,
    isOnlineRoom = () => false,
    makeId = () => `${Date.now()}`,
    recordGameResult = () => {},
    renderGame = () => {},
    sendOnlineCommand = () => {},
    sortPlayers = () => {},
    startTournament = () => {},
    state = {},
    nowIso = () => new Date().toISOString()
  } = deps;

  function startNextHand(game) {
    if (!game) return;
    if (game.isPaused) {
      game.feedback = "Resume the room before dealing.";
      return;
    }
    if (game.status !== "running") {
      startTournament(false);
      return;
    }
    sortPlayers(game);
    maybeIncreaseBlinds(game);
    game.players.forEach((player) => {
      if (player.sitOutNextHand) {
        player.sittingOut = true;
        player.sitOutNextHand = false;
      }
      player.eliminated = false;
      player.cards = [];
      player.currentBet = 0;
      player.committed = 0;
      player.inHand = !player.sittingOut && player.stack > 0;
      player.folded = false;
      player.allIn = false;
      player.acted = false;
      player.lastAction = player.sittingOut ? "Sitting out" : player.stack > 0 ? "In hand" : "Needs buy-in";
    });
    const livePlayers = getActivePlayers(game);
    if (livePlayers.length <= 1) {
      game.handActive = false;
      game.handComplete = true;
      game.stage = "waiting";
      game.feedback = "Need at least two active seated players to deal.";
      addLog(game, game.feedback);
      return;
    }
    game.handNumber += 1;
    game.dealSerial += 1;
    game.currentHandLog = [];
    game.stage = "preflop";
    game.board = [];
    game.deck = shufflePokerDeck(createPokerDeck());
    game.pot = 0;
    game.currentBet = 0;
    game.minRaise = game.bigBlind;
    game.showdown = null;
    game.handActive = true;
    game.handComplete = false;
    game.heroStackAtHandStart = getHero(game)?.stack || 0;
    game.dealerIndex = nextSeatWithStack(game, game.dealerIndex);
    const blindSeats = getBlindSeats(game);
    dealPokerHoleCards(game);
    postBlind(game, blindSeats.small, game.smallBlind, "small blind");
    postBlind(game, blindSeats.big, game.bigBlind, "big blind");
    game.actionIndex = nextActionSeat(game, blindSeats.big);
    addLog(game, `Hand #${game.handNumber}: blinds ${game.smallBlind}/${game.bigBlind}.`);
    game.feedback = `${game.players[game.dealerIndex]?.name || "Dealer"} has the button.`;
    continueHand(game);
  }

  function submitAction(action) {
    const game = state.game;
    if (!game || !action || game.handComplete || game.isPaused) return;
    const player = getCurrentPlayer(game);
    const hero = getHero(game);
    if (!player || player.type !== "human" || (!player.isHero && player.id !== hero?.id)) return;
    const raiseTo = action === "raise"
      ? Number(state.raiseInput ?? elements.pokerRaiseInput?.value ?? 0)
      : 0;
    if (isOnlineRoom(game)) {
      sendOnlineCommand("action", { action, raiseTo });
      return;
    }
    performAction(game, game.actionIndex, action, raiseTo);
    continueHand(game);
    renderGame();
  }

  function continueHand(game) {
    let guard = 0;
    while (game.handActive && !game.handComplete && !game.isPaused && guard < 80) {
      guard += 1;
      const contenders = getContenders(game);
      if (contenders.length <= 1) {
        awardPot(game, contenders[0], "Everyone else folded.");
        break;
      }
      const eligible = getEligiblePlayers(game);
      if (!eligible.length) {
        runBoardToShowdown(game);
        break;
      }
      if (isBettingRoundComplete(game)) {
        advanceStreet(game);
        continue;
      }
      if (!isActionSeat(game, game.actionIndex)) {
        game.actionIndex = nextActionSeat(game, game.actionIndex);
        continue;
      }
      const player = game.players[game.actionIndex];
      if (player.type === "human") break;
      const botDecision = chooseBotAction(game, player);
      performAction(game, game.actionIndex, botDecision.action, botDecision.raiseTo);
    }
    if (guard >= 80) {
      game.feedback = "Poker engine paused after too many automatic actions. Start a new hand.";
      game.handComplete = true;
      game.handActive = false;
    }
  }

  function performAction(game, playerIndex, action, raiseTo = 0) {
    const player = game.players[playerIndex];
    if (!player || !player.inHand || player.folded || player.allIn) return;
    const toCall = getToCall(game, player);
    if (action === "fold") {
      player.folded = true;
      player.acted = true;
      player.lastAction = "Fold";
      addLog(game, `${player.name} folds.`);
      game.actionIndex = nextActionSeat(game, playerIndex);
      return;
    }
    if (action === "allin") {
      raiseTo = player.currentBet + player.stack;
      action = raiseTo > game.currentBet ? "raise" : "call";
    }
    if (action === "raise") {
      const previousBet = game.currentBet;
      const maxTotal = player.currentBet + player.stack;
      const minTotal = getMinimumRaiseTo(game, player);
      if (maxTotal <= previousBet && previousBet > 0) {
        action = "call";
      } else {
        const targetTotal = Math.min(maxTotal, Math.max(minTotal, Math.round(Number(raiseTo || minTotal))));
        const paid = commitChips(player, targetTotal - player.currentBet);
        if (targetTotal > previousBet) {
          const raiseSize = targetTotal - previousBet;
          game.currentBet = targetTotal;
          const isFullRaise = previousBet <= 0 ? raiseSize >= game.bigBlind : raiseSize >= game.minRaise;
          if (isFullRaise) game.minRaise = Math.max(game.bigBlind, raiseSize);
          game.players.forEach((other) => {
            if (other.inHand && !other.folded && !other.allIn && other.id !== player.id && other.currentBet < game.currentBet) other.acted = false;
          });
        }
        player.acted = true;
        player.lastAction = player.allIn ? `All-in ${player.currentBet}` : previousBet ? `Raise to ${player.currentBet}` : `Bet ${player.currentBet}`;
        game.pot += paid;
        const verb = player.allIn ? "is all-in for" : previousBet ? "raises to" : "bets";
        addLog(game, `${player.name} ${verb} ${player.currentBet}.`);
        game.actionIndex = nextActionSeat(game, playerIndex);
        return;
      }
    }
    const paid = commitChips(player, toCall);
    game.pot += paid;
    player.acted = true;
    player.lastAction = toCall ? `Call ${paid}` : "Check";
    addLog(game, toCall ? `${player.name} calls ${paid}${player.allIn ? " and is all-in" : ""}.` : `${player.name} checks.`);
    game.actionIndex = nextActionSeat(game, playerIndex);
  }

  function commitChips(player, amount) {
    const paid = Math.min(Math.max(0, Math.round(Number(amount || 0))), player.stack);
    player.stack -= paid;
    player.currentBet += paid;
    player.committed += paid;
    if (player.stack <= 0) {
      player.stack = 0;
      player.allIn = true;
    }
    return paid;
  }

  function advanceStreet(game) {
    if (game.stage === "river") {
      showdownHand(game);
      return;
    }
    game.stage = game.stage === "preflop" ? "flop" : game.stage === "flop" ? "turn" : "river";
    game.dealSerial += 1;
    const cardsToDeal = game.stage === "flop" ? 3 : 1;
    for (let index = 0; index < cardsToDeal; index += 1) {
      const card = drawPokerCard(game);
      if (card) game.board.push(card);
    }
    resetStreetBets(game);
    game.actionIndex = nextActionSeat(game, game.dealerIndex);
    addLog(game, `${getStageLabel(game.stage)}: ${game.board.map(cardLabel).join(" ")}.`);
  }

  function runBoardToShowdown(game) {
    while (game.stage !== "river") advanceStreet(game);
    showdownHand(game);
  }

  function showdownHand(game) {
    const contenders = getContenders(game);
    const results = contenders.map((player) => ({
      player,
      hand: evaluatePokerHand([...player.cards, ...game.board])
    }));
    results.sort((a, b) => comparePokerHands(b.hand, a.hand));
    const pots = buildPots(game.players);
    const awardLines = [];
    const winnerIds = new Set();
    pots.forEach((pot, potIndex) => {
      const eligible = results.filter((result) => pot.eligibleIds.includes(result.player.id));
      eligible.sort((a, b) => comparePokerHands(b.hand, a.hand));
      const best = eligible[0]?.hand;
      const winners = eligible.filter((result) => best && comparePokerHands(result.hand, best) === 0);
      if (!winners.length || pot.amount <= 0) return;
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      winners.forEach((result) => {
        result.player.stack += share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        winnerIds.add(result.player.id);
      });
      const label = potIndex === 0 ? "main pot" : `side pot ${potIndex}`;
      awardLines.push(`${winners.map((result) => result.player.name).join(", ")} wins ${pot.amount} ${label}`);
    });
    const top = results[0]?.hand;
    const bestName = top ? `${top.name} (${top.cards.map(cardLabel).join(" ")})` : "best hand";
    game.showdown = { winners: [...winnerIds], results, pots };
    finishHand(game, `${awardLines.join(". ")} with ${bestName}.`);
  }

  function buildPots(players) {
    const levels = [...new Set(players
      .map((player) => Math.round(player.committed || 0))
      .filter((amount) => amount > 0))]
      .sort((a, b) => a - b);
    let previous = 0;
    return levels.map((level) => {
      const contributors = players.filter((player) => (player.committed || 0) >= level);
      const amount = (level - previous) * contributors.length;
      previous = level;
      return {
        amount,
        eligibleIds: contributors
          .filter((player) => player.inHand && !player.folded)
          .map((player) => player.id)
      };
    }).filter((pot) => pot.amount > 0 && pot.eligibleIds.length);
  }

  function awardPot(game, winner, reason = "") {
    if (winner) winner.stack += game.pot;
    finishHand(game, `${winner?.name || "Nobody"} wins ${game.pot}. ${reason}`.trim());
  }

  function finishHand(game, message) {
    game.feedback = message;
    game.handComplete = true;
    game.handActive = false;
    game.stage = game.showdown ? "showdown" : game.stage;
    game.actionIndex = -1;
    game.handsPlayed += 1;
    game.players.forEach((player) => {
      player.eliminated = false;
      if (player.stack <= 0) player.lastAction = "Needs buy-in";
    });
    addLog(game, message);
    archiveHand(game, message);
    recordHandResult(game, message);
  }

  function recordHandResult(game, message) {
    if (game.recordedHandId === `${game.id}:${game.handNumber}`) return;
    game.recordedHandId = `${game.id}:${game.handNumber}`;
    const hero = getHero(game);
    if (!hero) return;
    const chipDelta = hero.stack - game.heroStackAtHandStart;
    const score = clampNumber(Math.round(chipDelta / Math.max(game.bigBlind, 1)), -24, 36);
    recordGameResult("poker", score, `Poker hand #${game.handNumber}: ${message} Hero ${chipDelta >= 0 ? "+" : ""}${chipDelta} chips`);
  }

  function chooseBotAction(game, player) {
    const toCall = getToCall(game, player);
    const preflopPlan = !game.board.length ? getPreflopStrategyForCards(player.cards, getPositionForPlayer(game, game.players.indexOf(player))) : null;
    const strength = getDecisionStrength(game, player) + randomInt(-8, 8);
    const potOddsPressure = toCall ? (toCall / Math.max(game.pot + toCall, 1)) * 100 : 0;
    if (toCall > 0) {
      if (preflopPlan?.tier === "fold" && toCall > game.bigBlind * 0.5) return { action: "fold" };
      if (strength < 28 + potOddsPressure * 0.8 && toCall > game.bigBlind * 0.5) return { action: "fold" };
      if ((strength > 76 || preflopPlan?.tier === "raise") && player.stack > toCall + game.bigBlind * 2) {
        return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise * randomChoice([1, 2, 3])) };
      }
      return { action: "call" };
    }
    if ((strength > 72 || preflopPlan?.tier === "raise") && player.stack > game.bigBlind * 2) {
      return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * randomChoice([2, 3, 4])) };
    }
    if (strength > 58 && Math.random() < 0.2 && player.stack > game.bigBlind * 2) {
      return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * 2) };
    }
    return { action: "call" };
  }

  function getDecisionStrength(game, player) {
    if (!game.board.length) return estimatePreflopStrength(player.cards);
    const evaluated = evaluatePokerHand([...player.cards, ...game.board]);
    const base = evaluated.rank * 12 + (evaluated.tiebreakers[0] || 0) * 1.4;
    const boardPressure = game.board.length < 5 ? 6 : 0;
    return clampNumber(Math.round(base + boardPressure), 0, 100);
  }

  function estimatePreflopStrength(cards) {
    const handKey = getStartingHandKey(cards);
    return handKey ? getStartingHandScore(handKey) : 0;
  }

  function postBlind(game, playerIndex, amount, label) {
    const player = game.players[playerIndex];
    if (!player) return;
    const paid = commitChips(player, amount);
    player.acted = false;
    player.lastAction = `${label} ${paid}`;
    game.currentBet = Math.max(game.currentBet, player.currentBet);
    game.pot += paid;
    addLog(game, `${player.name} posts ${label} ${paid}.`);
  }

  function resetStreetBets(game) {
    game.currentBet = 0;
    game.minRaise = game.bigBlind;
    game.players.forEach((player) => {
      player.currentBet = 0;
      player.acted = false;
    });
  }

  function maybeIncreaseBlinds(game) {
    if (!game.settings?.autoIncreaseBlinds) return;
    if (game.handsPlayed > 0 && game.handsPlayed % game.blindInterval === 0 && game.levelIncreasedAt !== game.handsPlayed) {
      game.level = Math.min(POKER_BLIND_LEVELS.length - 1, game.level + 1);
      game.levelIncreasedAt = game.handsPlayed;
      const level = POKER_BLIND_LEVELS[game.level];
      game.smallBlind = level.small;
      game.bigBlind = level.big;
      game.minRaise = level.big;
      addLog(game, `Blinds increase to ${game.smallBlind}/${game.bigBlind}.`);
    }
  }

  function getLivePlayers(game) {
    return getActivePlayers(game);
  }

  function getActivePlayers(game) {
    return (game?.players || []).filter((player) => !player.sittingOut && player.stack > 0);
  }

  function isHost(game, player = getHero(game)) {
    if (!game || !player) return false;
    return player.isHost || player.id === game.hostPlayerId;
  }

  function getPositionForPlayer(game, playerIndex) {
    const player = game.players[playerIndex];
    if (!player || game.dealerIndex < 0) return "btn";
    const liveIndexes = game.players
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.sittingOut && item.stack > 0)
      .map(({ index }) => index);
    const heroOrder = liveIndexes.indexOf(playerIndex);
    const dealerOrder = liveIndexes.indexOf(game.dealerIndex);
    if (heroOrder < 0 || dealerOrder < 0) return "btn";
    const count = liveIndexes.length;
    const relative = (heroOrder - dealerOrder + count) % count;
    if (count === 2) return relative === 0 ? "sb" : "bb";
    if (relative === 0) return "btn";
    if (relative === 1) return "sb";
    if (relative === 2) return "bb";
    const early = ["utg", "hj", "co"];
    return early[Math.max(0, early.length - (count - relative))] || "co";
  }

  function getBlindSeats(game) {
    const liveCount = getActivePlayers(game).length;
    if (liveCount === 2) {
      return {
        small: game.dealerIndex,
        big: nextSeatWithStack(game, game.dealerIndex)
      };
    }
    const small = nextSeatWithStack(game, game.dealerIndex);
    return {
      small,
      big: nextSeatWithStack(game, small)
    };
  }

  function nextSeatWithStack(game, fromIndex) {
    for (let step = 1; step <= game.players.length; step += 1) {
      const index = (fromIndex + step + game.players.length) % game.players.length;
      if (!game.players[index].sittingOut && game.players[index].stack > 0) return index;
    }
    return 0;
  }

  function nextActionSeat(game, fromIndex) {
    for (let step = 1; step <= game.players.length; step += 1) {
      const index = (fromIndex + step + game.players.length) % game.players.length;
      if (isActionSeat(game, index)) return index;
    }
    return -1;
  }

  function isActionSeat(game, index) {
    const player = game.players[index];
    return Boolean(player && player.inHand && !player.folded && !player.allIn && player.stack > 0);
  }

  function getContenders(game) {
    return game.players.filter((player) => player.inHand && !player.folded);
  }

  function getEligiblePlayers(game) {
    return game.players.filter((player) => player.inHand && !player.folded && !player.allIn && player.stack > 0);
  }

  function isBettingRoundComplete(game) {
    const eligible = getEligiblePlayers(game);
    if (!eligible.length) return true;
    return eligible.every((player) => player.acted && player.currentBet === game.currentBet);
  }

  function getToCall(game, player) {
    return Math.max(0, game.currentBet - (player?.currentBet || 0));
  }

  function getMinimumRaiseTo(game, player) {
    if (!player) return 0;
    if (game.currentBet <= 0) return Math.min(player.stack, game.bigBlind);
    return Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise);
  }

  function getCurrentPlayer(game) {
    return game.players[game.actionIndex] || null;
  }

  function getHero(game) {
    const currentUser = getCurrentUser();
    if (!game) return null;
    if (game.online) {
      return game.players.find((player) => player.isHero || player.userId === currentUser?.id) || null;
    }
    return game.players.find((player) => player.isHero || player.id === "hero") || game.players[0] || null;
  }

  function getSpectators(game) {
    return (game?.spectators || []).filter((spectator) => spectator && spectator.userId);
  }

  function getHeroSpectator(game) {
    const currentUser = getCurrentUser();
    if (!game?.online) return null;
    return getSpectators(game).find((spectator) => spectator.isHero || spectator.userId === currentUser?.id) || null;
  }

  function isSpectator(game) {
    if (!isOnlineRoom(game)) return false;
    if (getHero(game)) return false;
    return game.viewerRole === "spectator" || Boolean(getHeroSpectator(game));
  }

  function getViewerModeLabel(game) {
    if (!isOnlineRoom(game)) return "LOCAL";
    if (isHost(game)) return "HOST";
    if (getHero(game)) return "PLAYER";
    if (isSpectator(game)) return "WATCHING";
    return "GUEST";
  }

  function getStageLabel(stage) {
    const labels = {
      waiting: "Waiting",
      preflop: "Preflop",
      flop: "Flop",
      turn: "Turn",
      river: "River",
      showdown: "Showdown"
    };
    return labels[stage] || "Hand";
  }

  function archiveHand(game, message) {
    if (!game || !game.handNumber) return;
    const handId = `${game.id}:${game.handNumber}`;
    if (game.archivedHandId === handId) return;
    game.archivedHandId = handId;
    const entry = {
      id: handId,
      handNumber: game.handNumber,
      createdAt: nowIso(),
      blinds: `${game.smallBlind}/${game.bigBlind}`,
      stage: game.stage,
      buttonSeat: Number.isInteger(game.dealerIndex) ? game.players[game.dealerIndex]?.seat + 1 : null,
      board: game.board.map(cardLabel),
      pot: game.pot,
      result: message,
      actions: [...(game.currentHandLog || [])],
      showdown: game.showdown
        ? {
          winners: game.showdown.winners,
          pots: game.showdown.pots,
          results: (game.showdown.results || []).map((item) => ({
            playerId: item.player.id,
            playerName: item.player.name,
            hand: item.hand?.name || ""
          }))
        }
        : null
    };
    game.handHistory = [entry, ...(game.handHistory || [])].slice(0, 80);
  }

  function recordLedger(game, entry = {}) {
    if (!game) return;
    const amount = Math.round(Number(entry.amount || 0));
    game.ledger = [
      ...(game.ledger || []),
      {
        id: makeId(),
        createdAt: nowIso(),
        type: entry.type || "ADJUSTMENT",
        playerId: entry.playerId || "",
        playerName: entry.playerName || "",
        amount,
        note: entry.note || ""
      }
    ].slice(-200);
  }

  function getLedgerRows(game) {
    return (game?.players || [])
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((player) => {
        const buyIn = Math.round(Number(player.buyIn || 0));
        const cashOut = Math.round(Number(player.cashOut || 0));
        const stack = Math.round(Number(player.stack || 0));
        const net = cashOut + stack - buyIn;
        return {
          player,
          buyIn,
          cashOut,
          stack,
          net
        };
      });
  }

  function addLog(game, line) {
    if (!line) return;
    game.log = [...(game.log || []), line].slice(-24);
    if (game.handActive || game.handNumber) {
      game.currentHandLog = [
        ...(game.currentHandLog || []),
        {
          at: nowIso(),
          stage: game.stage,
          line
        }
      ].slice(-120);
    }
    game.feedback = line;
  }

  function cardLabel(card) {
    return `${card.rank}${card.suitSymbol}`;
  }

  return {
    addLog,
    advanceStreet,
    archiveHand,
    awardPot,
    buildPots,
    cardLabel,
    chooseBotAction,
    commitChips,
    continueHand,
    estimatePreflopStrength,
    finishHand,
    getActivePlayers,
    getBlindSeats,
    getContenders,
    getCurrentPlayer,
    getDecisionStrength,
    getEligiblePlayers,
    getHero,
    getHeroSpectator,
    getLedgerRows,
    getLivePlayers,
    getMinimumRaiseTo,
    getPositionForPlayer,
    getSpectators,
    getStageLabel,
    getToCall,
    getViewerModeLabel,
    isActionSeat,
    isBettingRoundComplete,
    isHost,
    isSpectator,
    maybeIncreaseBlinds,
    nextActionSeat,
    nextSeatWithStack,
    performAction,
    postBlind,
    recordHandResult,
    recordLedger,
    resetStreetBets,
    runBoardToShowdown,
    showdownHand,
    startNextHand,
    submitAction
  };
}
