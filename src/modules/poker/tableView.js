import {
  POKER_MIN_PLAYERS,
  POKER_STARTING_STACK_BB
} from './model.js';

export function createPokerTableView(deps = {}) {
  const {
    documentRef = globalThis.document,
    elements = {},
    escapeHtml = (value) => String(value || ""),
    formatNumber = (value) => String(value),
    getActivePlayers = () => [],
    getBlindSeats = () => ({}),
    getCurrentPlayer = () => null,
    getHero = () => null,
    getHeroPreflopCoach = () => "",
    getInviteLink = () => "",
    getMinimumRaiseTo = () => 0,
    getNextOpenSeat = () => null,
    getOnlineLabel = () => "Local",
    getDefaultPlayerName = () => "You",
    getSpectators = () => [],
    getStageLabel = (stage) => stage || "",
    getToCall = () => 0,
    getViewerModeLabel = () => "LOCAL",
    isHost = () => false,
    isOnlineRoom = () => false,
    isRegistering = () => false,
    isSpectator = () => false,
    makeGameRound = () => null,
    persistRoom = () => {},
    refreshIcons = () => {},
    renderPanelTabs = () => {},
    renderPreflopChart = () => {},
    renderRightPanel = () => {},
    state = {}
  } = deps;

  function renderGame() {
    if (state.reactTable !== false) {
      if (state.game && !state.game.online) persistRoom(state.game);
      notifyReactPokerUpdate();
      refreshIcons();
      return;
    }
    if (!elements.pokerGamePrompt) return;
    if (!state.game) state.game = makeGameRound();
    const game = state.game;
    const hero = getHero(game);
    const livePlayers = getActivePlayers(game);
    const spectatorCount = getSpectators(game).length;

    if (elements.pokerModeSelect && elements.pokerModeSelect.value !== game.mode) {
      elements.pokerModeSelect.value = ["private", "demo"].includes(game.mode) ? game.mode : "private";
    }
    if (elements.pokerGameScore) elements.pokerGameScore.textContent = hero ? String(Math.round(hero.stack)) : "0";
    if (elements.pokerPlayerCount) elements.pokerPlayerCount.textContent = `${game.players.length}/${game.seatCount}${spectatorCount ? ` · ${spectatorCount} watching` : ""}`;
    if (elements.pokerRoomCode) elements.pokerRoomCode.textContent = game.roomCode;
    if (elements.pokerStageText) elements.pokerStageText.textContent = getStageLabel(game.stage);
    if (elements.pokerBlindText) elements.pokerBlindText.textContent = `${game.smallBlind} / ${game.bigBlind}`;
    renderTournamentStats(game);
    if (elements.pokerPot) elements.pokerPot.textContent = `Pot ${game.pot}`;
    renderRoomControls(game);
    renderSeats(game);
    renderBoard(game);
    renderActions(game);
    renderLobby(game);
    renderLog(game);
    renderPanelTabs();
    renderRightPanel(game);
    renderPreflopChart();

    const active = getCurrentPlayer(game);
    const toCall = active ? getToCall(game, active) : 0;
    const coach = getHeroPreflopCoach(game);
    elements.pokerGamePrompt.innerHTML = `
      <span><b class="poker-viewer-badge">${escapeHtml(getViewerModeLabel(game))}</b>${escapeHtml(getOnlineLabel(game))} · ${escapeHtml(game.isPaused ? "Paused" : getStatusLabel(game))} · hand <b>#${escapeHtml(String(game.handNumber || 0))}</b> · ${escapeHtml(String(livePlayers.length))} active${spectatorCount ? ` · ${escapeHtml(String(spectatorCount))} watching` : ""}</span>
      <span>${escapeHtml(getStageLabel(game.stage))} · pot ${escapeHtml(String(game.pot))} · current bet ${escapeHtml(String(game.currentBet))}</span>
      <small>${escapeHtml(getTableHint(game, active, toCall))}</small>
      ${coach ? `<small class="poker-coach-line">${escapeHtml(coach)}</small>` : ""}
    `;
    if (elements.pokerGameFeedback) elements.pokerGameFeedback.textContent = game.feedback || "";
    if (!game.online) persistRoom(game);
    refreshIcons();
  }

  function notifyReactPokerUpdate() {
    const windowRef = documentRef?.defaultView || globalThis.window;
    const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
    if (!windowRef?.dispatchEvent || !CustomEventCtor) return;
    windowRef.dispatchEvent(new CustomEventCtor("quantgym:poker-updated"));
  }

  function renderTournamentStats(game) {
    const livePlayers = getActivePlayers(game);
    const averageStack = livePlayers.length
      ? Math.round(livePlayers.reduce((sum, player) => sum + player.stack, 0) / livePlayers.length)
      : 0;
    const leader = [...game.players]
      .filter((player) => !player.eliminated)
      .sort((a, b) => b.stack - a.stack)[0];
    if (elements.pokerLevelText) elements.pokerLevelText.textContent = `${game.smallBlind} / ${game.bigBlind}`;
    if (elements.pokerNextLevelText) elements.pokerNextLevelText.textContent = `#${game.handNumber || 0}`;
    if (elements.pokerAverageStackText) elements.pokerAverageStackText.textContent = formatNumber(averageStack);
    if (elements.pokerLeaderText) {
      elements.pokerLeaderText.textContent = leader ? `${leader.name} · ${formatNumber(leader.stack)}` : "No leader yet";
    }
  }

  function getTableHint(game, active, toCall) {
    if (isSpectator(game)) {
      if (getNextOpenSeat(game) != null && isRegistering(game)) return "You are watching. An open seat is available between hands.";
      return "You are watching this table. Player hole cards stay hidden until showdown.";
    }
    if (game.isPaused) return "The host paused this room. Resume before dealing or acting.";
    if (game.status === "registering") return "Seat at least two active players, then start the first cash hand.";
    if (game.handComplete) return "Hand finished. The host can deal the next hand when ready.";
    if (!active) return "Table is resolving automatic actions.";
    return `Action on ${active.name}${toCall ? `, call ${toCall}` : ", check is available"}.`;
  }

  function renderRoomControls(game) {
    const canRegister = isRegistering(game);
    const activeCount = getActivePlayers(game).length;
    const host = isHost(game);
    const online = isOnlineRoom(game);
    const hero = getHero(game);
    const spectator = isSpectator(game);
    if (elements.pokerRoomLinkInput) elements.pokerRoomLinkInput.value = getInviteLink(game);
    if (elements.pokerPlayerNameInput && !elements.pokerPlayerNameInput.value) elements.pokerPlayerNameInput.value = getDefaultPlayerName();
    const hasOpenSeat = getNextOpenSeat(game) != null;
    if (elements.pokerTakeSeatBtn) {
      const alreadySeatedOnline = online && Boolean(hero);
      elements.pokerTakeSeatBtn.disabled = alreadySeatedOnline || !canRegister || !hasOpenSeat;
      elements.pokerTakeSeatBtn.textContent = alreadySeatedOnline ? "SEATED" : hasOpenSeat ? "TAKE SEAT" : spectator ? "WATCHING" : "FULL";
    }
    if (elements.pokerAddBotBtn) elements.pokerAddBotBtn.disabled = online || !canRegister || !hasOpenSeat || !host;
    if (elements.pokerFillBotsBtn) elements.pokerFillBotsBtn.disabled = online || !canRegister || !hasOpenSeat || !host;
    if (elements.pokerStartTournamentBtn) {
      elements.pokerStartTournamentBtn.disabled = game.isPaused || (game.handActive && !game.handComplete) || activeCount < POKER_MIN_PLAYERS || !host;
      const label = game.handActive && !game.handComplete
        ? "Hand running"
        : activeCount < POKER_MIN_PLAYERS ? "Need 2 players" : "Start hand";
      elements.pokerStartTournamentBtn.innerHTML = `<i data-lucide="play"></i>${label}`;
    }
    if (elements.pokerPauseBtn) elements.pokerPauseBtn.disabled = !host || game.isPaused || game.status === "registering";
    if (elements.pokerResumeBtn) elements.pokerResumeBtn.disabled = !host || !game.isPaused;
    if (elements.pokerExportBtn) elements.pokerExportBtn.disabled = !game.players.length;
  }

  function renderLobby(game) {
    if (elements.pokerLobbySummary) {
      const avgStack = game.players.length
        ? Math.round(game.players.reduce((sum, player) => sum + player.stack, 0) / game.players.length)
        : 0;
      const waiting = game.players.filter((player) => player.sittingOut || player.stack <= 0).length;
      const watching = getSpectators(game).length;
      elements.pokerLobbySummary.textContent = `${getStatusLabel(game)} · avg ${avgStack} · ${POKER_STARTING_STACK_BB}BB start${waiting ? ` · ${waiting} waiting` : ""}${watching ? ` · ${watching} watching` : ""}`;
    }
    if (!elements.pokerLobbyList) return;
    elements.pokerLobbyList.innerHTML = "";
    game.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .forEach((player) => {
        const row = documentRef.createElement("div");
        row.className = `poker-lobby-row ${player.eliminated ? "eliminated" : ""}`;
        row.innerHTML = `
          <span>Seat ${escapeHtml(String(player.seat + 1))}</span>
          <strong>${escapeHtml(player.name)}</strong>
          <small>${escapeHtml(player.type === "bot" ? "Demo" : player.isHero ? "You" : "Player")}</small>
          <b>${escapeHtml(String(Math.round(player.stack)))}</b>
        `;
        elements.pokerLobbyList.appendChild(row);
      });
    getSpectators(game).forEach((spectator) => {
      const row = documentRef.createElement("div");
      row.className = `poker-lobby-row spectator ${spectator.connected ? "" : "muted"}`;
      row.innerHTML = `
        <span>Watch</span>
        <strong>${escapeHtml(spectator.name)}</strong>
        <small>${spectator.isHero ? "You" : "Spectator"}</small>
        <b>${spectator.connected ? "Live" : "Away"}</b>
      `;
      elements.pokerLobbyList.appendChild(row);
    });
  }

  function getStatusLabel(game) {
    if (game.isPaused) return "Paused";
    if (game.status === "running") return game.handActive ? "In hand" : "Between hands";
    return "Open room";
  }

  function renderSeats(game) {
    if (!elements.pokerSeatGrid) return;
    elements.pokerSeatGrid.innerHTML = "";
    const playersBySeat = new Map(game.players.map((player) => [player.seat, player]));
    for (let seatIndex = 0; seatIndex < game.seatCount; seatIndex += 1) {
      const player = playersBySeat.get(seatIndex);
      const seat = documentRef.createElement("div");
      if (!player) {
        seat.className = "poker-seat empty";
        const canSit = isRegistering(game) && (!isOnlineRoom(game) || !getHero(game));
        const sitDisabled = canSit ? "" : "disabled";
        const botDisabled = !isOnlineRoom(game) && isRegistering(game) && isHost(game) ? "" : "disabled";
        seat.innerHTML = `
          <span class="poker-seat-number">${escapeHtml(String(seatIndex + 1))}</span>
          <div class="poker-seat-top">
            <strong>SIT</strong>
            <span>Open seat</span>
          </div>
          <div class="poker-empty-seat-actions">
            <button type="button" data-poker-seat-action="sit" data-seat="${escapeHtml(String(seatIndex))}" ${sitDisabled}>SIT</button>
            <button type="button" data-poker-seat-action="bot" data-seat="${escapeHtml(String(seatIndex))}" ${botDisabled}>DEMO</button>
          </div>
          <small>${canSit ? "Ready for player" : "Join next hand"}</small>
        `;
        elements.pokerSeatGrid.appendChild(seat);
        continue;
      }
      const index = game.players.indexOf(player);
      const isTurn = index === game.actionIndex && game.handActive && !game.handComplete;
      seat.className = [
        "poker-seat",
        player.type === "human" ? "human" : "bot",
        isTurn ? "active" : "",
        player.folded ? "folded" : "",
        player.allIn ? "all-in" : "",
        player.eliminated || (player.stack <= 0 && !player.inHand) ? "eliminated" : ""
      ].filter(Boolean).join(" ");
      const badges = [];
      if (index === game.dealerIndex) badges.push("D");
      if (game.handActive) {
        const blindSeats = getBlindSeats(game);
        if (index === blindSeats.small) badges.push("SB");
        if (index === blindSeats.big) badges.push("BB");
      }
      if (player.allIn) badges.push("ALL-IN");
      if (player.folded) badges.push("FOLD");
      if (player.sittingOut) badges.push("SIT OUT");
      if (player.stack <= 0 && !player.inHand) badges.push("NEEDS BUY-IN");
      const removeButton = isRegistering(game) && (isHost(game) || player.isHero)
        ? `<button type="button" data-poker-seat-action="remove" data-player-id="${escapeHtml(player.id)}">Remove</button>`
        : "";
      seat.innerHTML = `
        <div class="poker-seat-top">
          <strong>${escapeHtml(player.name)}</strong>
          <span>${badges.map(escapeHtml).join(" · ") || escapeHtml(player.type === "human" ? "Player" : "Demo")}</span>
        </div>
        <div class="poker-hole-cards">${renderHoleCards(game, player)}</div>
        <div class="poker-seat-stack">
          <span>${escapeHtml(String(Math.max(0, Math.round(player.stack))))}</span>
          <span>Bet ${escapeHtml(String(Math.round(player.currentBet || 0)))}</span>
        </div>
        <small>${escapeHtml(player.lastAction || (player.inHand ? "Waiting" : "Registered"))}</small>
        ${removeButton}
      `;
      elements.pokerSeatGrid.appendChild(seat);
    }
  }

  function renderHoleCards(game, player) {
    const shouldReveal = player.cardsVisible || player.isHero || game.handComplete || game.stage === "showdown";
    const cards = player.cards.length ? player.cards : [null, null];
    return cards.map((card, index) => {
      const style = `style="--deal-index:${index}"`;
      return shouldReveal && card
        ? cardHtml(card, { className: "dealt", style })
        : `<span class="poker-card back dealt" ${style}>?</span>`;
    }).join("");
  }

  function renderBoard(game) {
    if (!elements.pokerBoard) return;
    elements.pokerBoard.innerHTML = "";
    const cards = [...game.board];
    while (cards.length < 5) cards.push(null);
    cards.forEach((card, index) => {
      if (card) {
        elements.pokerBoard.insertAdjacentHTML("beforeend", cardHtml(card, {
          className: "dealt",
          style: `style="--deal-index:${index + 2}"`
        }));
        return;
      }
      const slot = documentRef.createElement("span");
      slot.className = "poker-card empty";
      elements.pokerBoard.appendChild(slot);
    });
  }

  function renderActions(game) {
    const active = getCurrentPlayer(game);
    const hero = getHero(game);
    const canAct = Boolean(active && active.type === "human" && (active.isHero || active.id === hero?.id) && game.status === "running" && game.handActive && !game.handComplete && !game.isPaused);
    const toCall = active ? getToCall(game, active) : 0;
    const minRaiseTo = active ? getMinimumRaiseTo(game, active) : 0;
    const maxRaiseTo = active ? active.currentBet + active.stack : 0;
    const canRaise = Boolean(canAct && maxRaiseTo >= minRaiseTo && minRaiseTo > game.currentBet);
    documentRef.querySelectorAll?.("[data-poker-action]").forEach((button) => {
      const action = button.dataset.pokerAction;
      button.disabled = !canAct || (action === "raise" && !canRaise) || (action === "allin" && (!active || active.stack <= 0));
      if (action === "call") button.textContent = toCall ? `Call ${toCall}` : "Check";
      if (action === "raise") button.textContent = game.currentBet ? "Raise" : "Bet";
      if (action === "allin") button.textContent = "All-in";
    });
    if (elements.pokerRaiseInput) {
      elements.pokerRaiseInput.disabled = !canRaise;
      elements.pokerRaiseInput.min = String(minRaiseTo);
      elements.pokerRaiseInput.max = String(maxRaiseTo);
      elements.pokerRaiseInput.step = String(game.bigBlind);
      if (canRaise && (!Number(elements.pokerRaiseInput.value) || Number(elements.pokerRaiseInput.value) < minRaiseTo || Number(elements.pokerRaiseInput.value) > maxRaiseTo)) {
        elements.pokerRaiseInput.value = String(Math.min(maxRaiseTo, minRaiseTo));
      }
    }
    documentRef.querySelectorAll?.("[data-poker-quick-bet]").forEach((button) => {
      button.disabled = !canRaise;
    });
    if (elements.pokerTurnPrompt) {
      elements.pokerTurnPrompt.textContent = canAct
        ? active.isHero || active.id === "hero"
          ? "YOUR TURN"
          : `${active.name} to act`
        : isSpectator(game)
          ? getNextOpenSeat(game) == null ? "WATCHING · TABLE FULL" : "WATCHING · SEAT AVAILABLE"
        : game.status === "registering"
          ? "Room open. Seat players or add demo players."
          : game.isPaused
            ? "Room paused."
            : game.handComplete
              ? "Hand complete."
              : "Demo players are acting...";
    }
    if (elements.nextPokerGameBtn) {
      const activeCount = getActivePlayers(game).length;
      elements.nextPokerGameBtn.disabled = Boolean(game.isPaused || (game.handActive && !game.handComplete) || activeCount < POKER_MIN_PLAYERS || !isHost(game));
      elements.nextPokerGameBtn.textContent = game.status === "registering" ? "Start hand" : "Next hand";
    }
  }

  function renderLog(game) {
    if (!elements.pokerLog) return;
    elements.pokerLog.innerHTML = "";
    game.log.slice(-9).reverse().forEach((line) => {
      const row = documentRef.createElement("div");
      row.textContent = line;
      elements.pokerLog.appendChild(row);
    });
  }

  function cardLabel(card) {
    return `${card.rank}${card.suitSymbol}`;
  }

  function cardHtml(card, options = {}) {
    const extraClass = options.className ? ` ${options.className}` : "";
    const style = options.style ? ` ${options.style}` : "";
    const rank = card.rank === "T" ? "10" : card.rank;
    return `
      <span class="poker-card ${isRedCard(card) ? "red" : "black"}${extraClass}"${style} aria-label="${escapeHtml(cardLabel(card))}">
        <span class="poker-card-rank">${escapeHtml(rank)}</span>
        <span class="poker-card-suit">${escapeHtml(card.suitSymbol)}</span>
      </span>
    `;
  }

  function isRedCard(card) {
    return card?.suit === "h" || card?.suit === "d";
  }

  return {
    getStatusLabel,
    getTableHint,
    renderActions,
    renderBoard,
    renderGame,
    renderLobby,
    renderLog,
    renderRoomControls,
    renderSeats,
    renderTournamentStats
  };
}
