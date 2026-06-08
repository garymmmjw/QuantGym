export function createPokerPanelView(deps = {}) {
  const {
    documentRef = globalThis.document,
    elements = {},
    escapeHtml = (value) => String(value || ""),
    formatNumber = (value) => String(value),
    getActivePlayers = () => [],
    getDefaultSettings = () => ({}),
    getHero = () => null,
    getLedgerRows = () => [],
    getSelectedTab = () => "chat",
    getSpectators = () => [],
    isHost = () => false,
    isRegistering = () => false,
    isSpectator = () => false,
    state = {}
  } = deps;

  function renderTabs() {
    if (state.reactTable !== false) return;
    documentRef.querySelectorAll?.("[data-poker-panel-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.pokerPanelTab === getSelectedTab());
    });
  }

  function renderRightPanel(game) {
    if (state.reactTable !== false) return;
    if (!elements.pokerPanelContent) return;
    const tab = getSelectedTab() || "chat";
    if (tab === "history") {
      elements.pokerPanelContent.innerHTML = renderHistoryPanel(game);
      return;
    }
    if (tab === "players") {
      elements.pokerPanelContent.innerHTML = renderPlayersPanel(game);
      return;
    }
    if (tab === "ledger") {
      elements.pokerPanelContent.innerHTML = renderLedgerPanel(game);
      return;
    }
    if (tab === "settings") {
      elements.pokerPanelContent.innerHTML = renderSettingsPanel(game);
      return;
    }
    elements.pokerPanelContent.innerHTML = renderChatPanel(game);
  }

  function renderChatPanel(game) {
    const messages = (game.chat || []).slice(-40);
    const canChat = !isSpectator(game) || game.settings?.spectatorChat !== false;
    return `
      <div class="poker-panel-stack">
        <div class="poker-panel-title">
          <strong>Room chat</strong>
          <span>${escapeHtml(String(messages.length))} messages</span>
        </div>
        <div class="poker-chat-feed">
          ${messages.length ? messages.map((item) => `
            <div class="poker-chat-message">
              <span>${escapeHtml(item.author || "Player")}</span>
              <p>${escapeHtml(item.message || "")}</p>
            </div>
          `).join("") : `<div class="poker-empty-state">No messages yet.</div>`}
        </div>
        <form class="poker-chat-form" data-poker-chat-form>
          <input name="message" type="text" maxlength="360" placeholder="${canChat ? "Type a message" : "Chat disabled"}" ${canChat ? "" : "disabled"}>
          <button class="primary-button compact" type="submit" ${canChat ? "" : "disabled"}>Send</button>
        </form>
      </div>
    `;
  }

  function renderHistoryPanel(game) {
    const hands = game.handHistory || [];
    return `
      <div class="poker-panel-stack">
        <div class="poker-panel-title">
          <strong>Hand history</strong>
          <span>${escapeHtml(String(hands.length))} saved</span>
        </div>
        <div class="poker-history-list">
          ${hands.length ? hands.map((hand) => `
            <article class="poker-history-item">
              <header>
                <strong>#${escapeHtml(String(hand.handNumber))} · ${escapeHtml(hand.blinds || "")}</strong>
                <span>${escapeHtml(hand.board?.join(" ") || "No board")}</span>
              </header>
              <p>${escapeHtml(hand.result || "")}</p>
              <details>
                <summary>Actions</summary>
                <div>
                  ${(hand.actions || []).map((action) => `<span>${escapeHtml(action.line || "")}</span>`).join("") || "<span>No action log.</span>"}
                </div>
              </details>
            </article>
          `).join("") : `<div class="poker-empty-state">Hands will appear here after they finish.</div>`}
        </div>
      </div>
    `;
  }

  function renderPlayersPanel(game) {
    const host = isHost(game);
    const hero = getHero(game);
    const unit = Math.max(game.bigBlind * 100, game.startingStack);
    const spectators = getSpectators(game);
    return `
      <div class="poker-panel-stack">
        <div class="poker-panel-title">
          <strong>Players</strong>
          <span>${escapeHtml(String(getActivePlayers(game).length))} active</span>
        </div>
        <div class="poker-player-list">
          ${game.players.map((player) => {
            const canManageSelf = player.id === hero?.id || player.isHero;
            const canRemove = isRegistering(game) && (host || canManageSelf);
            const status = player.sittingOut ? "Sitting out" : player.stack <= 0 ? "Needs buy-in" : player.inHand ? "In hand" : "Ready";
            return `
              <article class="poker-player-row">
                <div>
                  <strong>${escapeHtml(player.name)}</strong>
                  <span>Seat ${escapeHtml(String(player.seat + 1))} · ${escapeHtml(player.type === "bot" ? "Demo" : player.isHost ? "Host" : "Player")} · ${escapeHtml(status)}</span>
                </div>
                <b>${escapeHtml(formatNumber(player.stack))}</b>
                <div class="poker-player-actions">
                  ${canManageSelf ? `
                    <button type="button" data-poker-player-action="${player.sittingOut ? "back" : "sitout"}" data-player-id="${escapeHtml(player.id)}">${player.sittingOut ? "Back" : "Sit out"}</button>
                    <button type="button" data-poker-player-action="rebuy" data-player-id="${escapeHtml(player.id)}">Rebuy</button>
                  ` : ""}
                  ${host ? `
                    <button type="button" data-poker-player-action="addstack" data-delta="${escapeHtml(String(unit))}" data-player-id="${escapeHtml(player.id)}">+100BB</button>
                    <button type="button" data-poker-player-action="removestack" data-delta="${escapeHtml(String(unit))}" data-player-id="${escapeHtml(player.id)}">-100BB</button>
                  ` : ""}
                  ${canRemove ? `<button type="button" data-poker-player-action="remove" data-player-id="${escapeHtml(player.id)}">Leave</button>` : ""}
                </div>
              </article>
            `;
          }).join("") || `<div class="poker-empty-state">No seated players.</div>`}
        </div>
        <div class="poker-panel-title compact">
          <strong>Spectators</strong>
          <span>${escapeHtml(String(spectators.length))} watching</span>
        </div>
        <div class="poker-player-list spectator-list">
          ${spectators.length ? spectators.map((spectator) => `
            <article class="poker-player-row spectator">
              <div>
                <strong>${escapeHtml(spectator.name)}</strong>
                <span>${escapeHtml(spectator.isHero ? "You are watching" : "Watching")} · ${escapeHtml(spectator.connected ? "Live" : "Away")}</span>
              </div>
              <b>VIEW</b>
            </article>
          `).join("") : `<div class="poker-empty-state">No spectators right now.</div>`}
        </div>
      </div>
    `;
  }

  function renderLedgerPanel(game) {
    const rows = getLedgerRows(game);
    return `
      <div class="poker-panel-stack">
        <div class="poker-panel-title">
          <strong>Session ledger</strong>
          <span>Play money</span>
        </div>
        <div class="poker-ledger-table">
          <div class="poker-ledger-head">
            <span>Player</span><span>Buy-in</span><span>Stack</span><span>Net</span>
          </div>
          ${rows.length ? rows.map(({ player, buyIn, stack, net }) => `
            <div class="poker-ledger-row">
              <span>${escapeHtml(player.name)}</span>
              <span>${escapeHtml(formatNumber(buyIn))}</span>
              <span>${escapeHtml(formatNumber(stack))}</span>
              <strong class="${net >= 0 ? "positive" : "negative"}">${net >= 0 ? "+" : ""}${escapeHtml(formatNumber(net))}</strong>
            </div>
          `).join("") : `<div class="poker-empty-state">No ledger rows yet.</div>`}
        </div>
        <div class="poker-ledger-events">
          ${(game.ledger || []).slice(-8).reverse().map((event) => `
            <span>${escapeHtml(event.type)} · ${escapeHtml(event.playerName || "Room")} · ${event.amount >= 0 ? "+" : ""}${escapeHtml(formatNumber(event.amount))}</span>
          `).join("") || `<span>No ledger events yet.</span>`}
        </div>
      </div>
    `;
  }

  function renderSettingsPanel(game) {
    const settings = game.settings || getDefaultSettings(game.bigBlind);
    const host = isHost(game);
    const disabled = host && !game.handActive ? "" : "disabled";
    return `
      <form class="poker-settings-form" data-poker-settings-form>
        <div class="poker-panel-title">
          <strong>Table settings</strong>
          <span>${host ? game.handActive ? "Between hands only" : "Host" : "Host only"}</span>
        </div>
        <label>Room name<input name="roomName" type="text" maxlength="40" value="${escapeHtml(settings.roomName || "")}" ${disabled}></label>
        <div class="poker-settings-grid">
          <label>Small blind<input name="smallBlind" type="number" min="1" step="1" value="${escapeHtml(String(settings.smallBlind || game.smallBlind))}" ${disabled}></label>
          <label>Big blind<input name="bigBlind" type="number" min="2" step="1" value="${escapeHtml(String(settings.bigBlind || game.bigBlind))}" ${disabled}></label>
          <label>Starting stack<input name="startingStack" type="number" min="100" step="10" value="${escapeHtml(String(settings.startingStack || game.startingStack))}" ${disabled}></label>
          <label>Max players<input name="maxPlayers" type="number" min="2" max="10" step="1" value="${escapeHtml(String(settings.maxPlayers || game.seatCount))}" ${disabled}></label>
          <label>Turn seconds<input name="decisionTimeLimit" type="number" min="10" max="180" step="5" value="${escapeHtml(String(settings.decisionTimeLimit || 30))}" ${disabled}></label>
        </div>
        <label class="poker-check-row"><input name="allowSpectators" type="checkbox" ${settings.allowSpectators !== false ? "checked" : ""} ${disabled}>Allow spectators</label>
        <label class="poker-check-row"><input name="spectatorChat" type="checkbox" ${settings.spectatorChat !== false ? "checked" : ""} ${disabled}>Spectator chat</label>
        <label class="poker-check-row"><input name="autoStartNextHand" type="checkbox" ${settings.autoStartNextHand ? "checked" : ""} ${disabled}>Auto-start next hand</label>
        <label class="poker-check-row"><input name="autoIncreaseBlinds" type="checkbox" ${settings.autoIncreaseBlinds ? "checked" : ""} ${disabled}>Auto-increase blinds</label>
        <button class="primary-button compact" type="submit" ${disabled}>Save settings</button>
      </form>
    `;
  }

  return {
    renderChatPanel,
    renderHistoryPanel,
    renderLedgerPanel,
    renderPlayersPanel,
    renderRightPanel,
    renderSettingsPanel,
    renderTabs
  };
}
