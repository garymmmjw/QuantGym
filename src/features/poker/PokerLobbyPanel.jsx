const PANEL_TABS = ["chat", "history", "players", "ledger", "settings"];

function PokerPanelContent({ panel, actions }) {
  if (!panel || panel.empty) {
    return <div className="poker-empty-state">No room data.</div>;
  }

  if (panel.tab === "chat") {
    return (
      <div className="poker-panel-stack">
        <div className="poker-panel-title">
          <strong>{panel.title}</strong>
          <span>{panel.countLabel}</span>
        </div>
        <div className="poker-chat-feed">
          {panel.messages.length
            ? panel.messages.map((item) => (
              <div key={item.id || `${item.author}-${item.message}`} className="poker-chat-message">
                <span>{item.author}</span>
                <p>{item.message}</p>
              </div>
            ))
            : <div className="poker-empty-state">No messages yet.</div>}
        </div>
        <form
          className="poker-chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("message");
            const value = input?.value || "";
            if (!value.trim()) return;
            actions.sendChat?.(value);
            if (input) input.value = "";
          }}
        >
          <input
            name="message"
            type="text"
            maxLength={360}
            placeholder={panel.canChat ? "Type a message" : "Chat disabled"}
            disabled={!panel.canChat}
          />
          <button className="primary-button compact" type="submit" disabled={!panel.canChat}>Send</button>
        </form>
      </div>
    );
  }

  if (panel.tab === "history") {
    return (
      <div className="poker-panel-stack">
        <div className="poker-panel-title">
          <strong>{panel.title}</strong>
          <span>{panel.countLabel}</span>
        </div>
        <div className="poker-history-list">
          {panel.hands.length
            ? panel.hands.map((hand) => (
              <article key={hand.handNumber} className="poker-history-item">
                <header>
                  <strong>#{hand.handNumber} · {hand.blinds}</strong>
                  <span>{hand.board}</span>
                </header>
                <p>{hand.result}</p>
                <details>
                  <summary>Actions</summary>
                  <div>
                    {hand.actions.length
                      ? hand.actions.map((line, index) => <span key={index}>{line}</span>)
                      : <span>No action log.</span>}
                  </div>
                </details>
              </article>
            ))
            : <div className="poker-empty-state">Hands will appear here after they finish.</div>}
        </div>
      </div>
    );
  }

  if (panel.tab === "players") {
    return (
      <div className="poker-panel-stack">
        <div className="poker-panel-title">
          <strong>{panel.title}</strong>
          <span>{panel.countLabel}</span>
        </div>
        <div className="poker-player-list">
          {panel.players.length
            ? panel.players.map((player) => (
              <article key={player.id} className="poker-player-row">
                <div>
                  <strong>{player.name}</strong>
                  <span>Seat {player.seat} · {player.role} · {player.status}</span>
                </div>
                <b>{player.stack}</b>
                <div className="poker-player-actions">
                  {player.actions.canManageSelf ? (
                    <>
                      <button
                        type="button"
                        onClick={() => actions.handlePlayerAction?.(player.id, player.sittingOut ? "back" : "sitout")}
                      >
                        {player.sittingOut ? "Back" : "Sit out"}
                      </button>
                      <button type="button" onClick={() => actions.handlePlayerAction?.(player.id, "rebuy")}>Rebuy</button>
                    </>
                  ) : null}
                  {player.actions.canHostAdjust ? (
                    <>
                      <button
                        type="button"
                        onClick={() => actions.handlePlayerAction?.(player.id, "addstack", { delta: player.actions.stackDelta })}
                      >
                        +100BB
                      </button>
                      <button
                        type="button"
                        onClick={() => actions.handlePlayerAction?.(player.id, "removestack", { delta: player.actions.stackDelta })}
                      >
                        -100BB
                      </button>
                    </>
                  ) : null}
                  {player.actions.canRemove ? (
                    <button type="button" onClick={() => actions.handlePlayerAction?.(player.id, "remove")}>Leave</button>
                  ) : null}
                </div>
              </article>
            ))
            : <div className="poker-empty-state">No seated players.</div>}
        </div>
        <div className="poker-panel-title compact">
          <strong>Spectators</strong>
          <span>{panel.spectators.length} watching</span>
        </div>
        <div className="poker-player-list spectator-list">
          {panel.spectators.length
            ? panel.spectators.map((spectator) => (
              <article key={spectator.id} className="poker-player-row spectator">
                <div>
                  <strong>{spectator.name}</strong>
                  <span>{spectator.label} · {spectator.connected ? "Live" : "Away"}</span>
                </div>
                <b>VIEW</b>
              </article>
            ))
            : <div className="poker-empty-state">No spectators right now.</div>}
        </div>
      </div>
    );
  }

  if (panel.tab === "ledger") {
    return (
      <div className="poker-panel-stack">
        <div className="poker-panel-title">
          <strong>{panel.title}</strong>
          <span>{panel.subtitle}</span>
        </div>
        <div className="poker-ledger-table">
          <div className="poker-ledger-head">
            <span>Player</span><span>Buy-in</span><span>Stack</span><span>Net</span>
          </div>
          {panel.rows.length
            ? panel.rows.map((row) => (
              <div key={row.name} className="poker-ledger-row">
                <span>{row.name}</span>
                <span>{row.buyIn}</span>
                <span>{row.stack}</span>
                <strong className={row.netRaw >= 0 ? "positive" : "negative"}>
                  {row.netRaw >= 0 ? "+" : ""}{row.net}
                </strong>
              </div>
            ))
            : <div className="poker-empty-state">No ledger rows yet.</div>}
        </div>
        <div className="poker-ledger-events">
          {panel.events.length
            ? panel.events.map((event, index) => (
              <span key={index}>{event.type} · {event.playerName} · {event.amountLabel}</span>
            ))
            : <span>No ledger events yet.</span>}
        </div>
      </div>
    );
  }

  const values = panel.values || {};
  return (
    <form
      className="poker-settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!panel.editable) return;
        const form = event.currentTarget;
        actions.applySettings?.({
          roomName: form.elements.namedItem("roomName")?.value,
          smallBlind: Number(form.elements.namedItem("smallBlind")?.value),
          bigBlind: Number(form.elements.namedItem("bigBlind")?.value),
          startingStack: Number(form.elements.namedItem("startingStack")?.value),
          maxPlayers: Number(form.elements.namedItem("maxPlayers")?.value),
          decisionTimeLimit: Number(form.elements.namedItem("decisionTimeLimit")?.value),
          allowSpectators: form.elements.namedItem("allowSpectators")?.checked,
          spectatorChat: form.elements.namedItem("spectatorChat")?.checked,
          autoStartNextHand: form.elements.namedItem("autoStartNextHand")?.checked,
          autoIncreaseBlinds: form.elements.namedItem("autoIncreaseBlinds")?.checked
        });
      }}
    >
      <div className="poker-panel-title">
        <strong>{panel.title}</strong>
        <span>{panel.subtitle}</span>
      </div>
      <label>Room name<input name="roomName" type="text" maxLength={40} defaultValue={values.roomName} disabled={!panel.editable} /></label>
      <div className="poker-settings-grid">
        <label>Small blind<input name="smallBlind" type="number" min="1" step="1" defaultValue={values.smallBlind} disabled={!panel.editable} /></label>
        <label>Big blind<input name="bigBlind" type="number" min="2" step="1" defaultValue={values.bigBlind} disabled={!panel.editable} /></label>
        <label>Starting stack<input name="startingStack" type="number" min="100" step="10" defaultValue={values.startingStack} disabled={!panel.editable} /></label>
        <label>Max players<input name="maxPlayers" type="number" min="2" max="10" step="1" defaultValue={values.maxPlayers} disabled={!panel.editable} /></label>
        <label>Turn seconds<input name="decisionTimeLimit" type="number" min="10" max="180" step="5" defaultValue={values.decisionTimeLimit} disabled={!panel.editable} /></label>
      </div>
      <label className="poker-check-row"><input name="allowSpectators" type="checkbox" defaultChecked={values.allowSpectators} disabled={!panel.editable} />Allow spectators</label>
      <label className="poker-check-row"><input name="spectatorChat" type="checkbox" defaultChecked={values.spectatorChat} disabled={!panel.editable} />Spectator chat</label>
      <label className="poker-check-row"><input name="autoStartNextHand" type="checkbox" defaultChecked={values.autoStartNextHand} disabled={!panel.editable} />Auto-start next hand</label>
      <label className="poker-check-row"><input name="autoIncreaseBlinds" type="checkbox" defaultChecked={values.autoIncreaseBlinds} disabled={!panel.editable} />Auto-increase blinds</label>
      <button className="primary-button compact" type="submit" disabled={!panel.editable}>Save settings</button>
    </form>
  );
}

export function PokerLobbyPanel({ game, actions }) {
  const lobby = game?.table?.lobby;
  const panel = game?.panel;
  const panelTab = game?.panelTab || "chat";

  return (
    <aside className="poker-lobby-panel">
      <div className="poker-lobby-head">
        <strong>LOG / LEDGER</strong>
        <span id="pokerLobbySummary">{lobby?.lobbySummary || "Open room · 100BB starting stack"}</span>
      </div>
      <div className="poker-match-bar">
        <select
          id="pokerModeSelect"
          aria-label="Poker match mode"
          value={game?.mode || "private"}
          onChange={(event) => actions.setMode?.(event.target.value)}
        >
          <option value="private">Private table</option>
          <option value="demo">Local demo table</option>
        </select>
        <button id="pokerMatchBtn" className="secondary-button compact" type="button" onClick={() => actions.matchTournament?.()}>
          <i data-lucide="shuffle" />New
        </button>
        <button id="resetPokerGameBtn" className="secondary-button compact" type="button" onClick={() => actions.resetTournament?.()}>
          <i data-lucide="rotate-ccw" />Reset
        </button>
      </div>
      <label className="poker-room-link">
        Room link
        <div>
          <input id="pokerRoomLinkInput" type="text" readOnly value={lobby?.roomLink || ""} />
          <button id="pokerCopyLinkBtn" className="secondary-button compact" type="button" onClick={() => actions.copyRoomLink?.()}>
            <i data-lucide="copy" />
          </button>
        </div>
      </label>
      <div className="poker-seat-form">
        <label>
          Player
          <input
            id="pokerPlayerNameInput"
            type="text"
            placeholder="Your table name"
            value={game?.playerName || ""}
            onChange={(event) => actions.setPlayerName?.(event.target.value)}
          />
        </label>
        <button
          id="pokerTakeSeatBtn"
          className="primary-button compact"
          type="button"
          disabled={lobby?.takeSeat?.disabled}
          onClick={() => actions.takeSeat?.(game?.playerName)}
        >
          {lobby?.takeSeat?.label || "JOIN"}
        </button>
      </div>
      <div className="poker-lobby-actions">
        <button id="pokerAddBotBtn" className="secondary-button compact" type="button" disabled={lobby?.addBot?.disabled} onClick={() => actions.addBot?.()}>
          <i data-lucide="user-plus" />Demo
        </button>
        <button id="pokerFillBotsBtn" className="secondary-button compact" type="button" disabled={lobby?.fillBots?.disabled} onClick={() => actions.fillBots?.()}>
          <i data-lucide="users-round" />Fill demo
        </button>
        <button id="pokerStartTournamentBtn" className="primary-button compact" type="button" disabled={lobby?.startHand?.disabled} onClick={() => actions.startTournament?.()}>
          <i data-lucide="play" />{lobby?.startHand?.label || "Start"}
        </button>
      </div>
      <div className="poker-host-controls" aria-label="Host controls">
        <button id="pokerPauseBtn" className="secondary-button compact" type="button" disabled={lobby?.pause?.disabled} onClick={() => actions.pauseGame?.()}>
          <i data-lucide="pause" />Pause
        </button>
        <button id="pokerResumeBtn" className="secondary-button compact" type="button" disabled={lobby?.resume?.disabled} onClick={() => actions.resumeGame?.()}>
          <i data-lucide="play" />Resume
        </button>
        <button id="pokerExportBtn" className="secondary-button compact" type="button" disabled={lobby?.exportSession?.disabled} onClick={() => actions.exportSession?.()}>
          <i data-lucide="download" />Export
        </button>
      </div>
      <div className="poker-panel-tabs" role="tablist" aria-label="Poker room panel">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={panelTab === tab ? "active" : ""}
            data-poker-panel-tab={tab}
            aria-selected={panelTab === tab}
            onClick={() => actions.setPanelTab?.(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div id="pokerPanelContent" className="poker-panel-content">
        <PokerPanelContent panel={panel} actions={actions} />
      </div>
      <p className="poker-compliance-note">Play-money only. Chips have no monetary value; no deposits, withdrawals, rake, or real-money settlement.</p>
    </aside>
  );
}
