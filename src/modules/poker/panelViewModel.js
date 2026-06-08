export function getPokerPanelViewModel(game, tab = "chat", helpers = {}) {
  const {
    escapeHtml = (value) => String(value || ""),
    formatNumber = (value) => String(value),
    getActivePlayers = () => [],
    getDefaultSettings = () => ({}),
    getHero = () => null,
    getLedgerRows = () => [],
    getSpectators = () => [],
    isHost = () => false,
    isRegistering = () => false,
    isSpectator = () => false
  } = helpers;

  if (!game) return { tab, empty: true };

  if (tab === "history") {
    const hands = game.handHistory || [];
    return {
      tab: "history",
      title: "Hand history",
      countLabel: `${hands.length} saved`,
      hands: hands.map((hand) => ({
        handNumber: hand.handNumber,
        blinds: hand.blinds || "",
        board: (hand.board || []).join(" ") || "No board",
        result: hand.result || "",
        actions: (hand.actions || []).map((action) => action.line || "")
      }))
    };
  }

  if (tab === "players") {
    const host = isHost(game);
    const hero = getHero(game);
    const unit = Math.max(game.bigBlind * 100, game.startingStack);
    const spectators = getSpectators(game);
    return {
      tab: "players",
      title: "Players",
      countLabel: `${getActivePlayers(game).length} active`,
      players: (game.players || []).map((player) => {
        const canManageSelf = player.id === hero?.id || player.isHero;
        const canRemove = isRegistering(game) && (host || canManageSelf);
        const status = player.sittingOut
          ? "Sitting out"
          : player.stack <= 0
            ? "Needs buy-in"
            : player.inHand
              ? "In hand"
              : "Ready";
        return {
          id: player.id,
          name: player.name,
          seat: player.seat + 1,
          role: player.type === "bot" ? "Demo" : player.isHost ? "Host" : "Player",
          status,
          stack: formatNumber(player.stack),
          stackRaw: player.stack,
          sittingOut: Boolean(player.sittingOut),
          actions: {
            canManageSelf,
            canRemove,
            canHostAdjust: host,
            rebuyDelta: game.startingStack,
            stackDelta: unit
          }
        };
      }),
      spectators: spectators.map((spectator) => ({
        id: spectator.id,
        name: spectator.name,
        label: spectator.isHero ? "You are watching" : "Watching",
        connected: Boolean(spectator.connected)
      }))
    };
  }

  if (tab === "ledger") {
    const rows = getLedgerRows(game);
    return {
      tab: "ledger",
      title: "Session ledger",
      subtitle: "Play money",
      rows: rows.map(({ player, buyIn, stack, net }) => ({
        name: player.name,
        buyIn: formatNumber(buyIn),
        stack: formatNumber(stack),
        net: formatNumber(net),
        netRaw: net
      })),
      events: (game.ledger || []).slice(-8).reverse().map((event) => ({
        type: event.type,
        playerName: event.playerName || "Room",
        amount: event.amount,
        amountLabel: `${event.amount >= 0 ? "+" : ""}${formatNumber(event.amount)}`
      }))
    };
  }

  if (tab === "settings") {
    const settings = game.settings || getDefaultSettings(game.bigBlind);
    const host = isHost(game);
    const editable = host && !game.handActive;
    return {
      tab: "settings",
      title: "Table settings",
      subtitle: host ? (game.handActive ? "Between hands only" : "Host") : "Host only",
      editable,
      values: {
        roomName: settings.roomName || "",
        smallBlind: settings.smallBlind || game.smallBlind,
        bigBlind: settings.bigBlind || game.bigBlind,
        startingStack: settings.startingStack || game.startingStack,
        maxPlayers: settings.maxPlayers || game.seatCount,
        decisionTimeLimit: settings.decisionTimeLimit || 30,
        allowSpectators: settings.allowSpectators !== false,
        spectatorChat: settings.spectatorChat !== false,
        autoStartNextHand: Boolean(settings.autoStartNextHand),
        autoIncreaseBlinds: Boolean(settings.autoIncreaseBlinds)
      }
    };
  }

  const messages = (game.chat || []).slice(-40);
  const canChat = !isSpectator(game) || game.settings?.spectatorChat !== false;
  return {
    tab: "chat",
    title: "Room chat",
    countLabel: `${messages.length} messages`,
    canChat,
    messages: messages.map((item) => ({
      id: item.id,
      author: item.author || "Player",
      message: item.message || "",
      createdAt: item.createdAt
    }))
  };
}
