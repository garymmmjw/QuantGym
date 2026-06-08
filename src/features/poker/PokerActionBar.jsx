export function PokerActionBar({ table, actions }) {
  const hud = table?.hud;
  const actionState = table?.actions;
  if (!hud || !actionState) return null;

  return (
    <section className="poker-bottom-hud">
      <div id="pokerGamePrompt" className="game-prompt poker-game-prompt">
        <span>
          <b className="poker-viewer-badge">{hud.viewerBadge}</b>
          {hud.onlineLabel} · {hud.status} · hand <b>#{hud.handNumber}</b> · {hud.activeCount} active
          {hud.spectatorCount ? ` · ${hud.spectatorCount} watching` : ""}
        </span>
        <span>{hud.stageLabel} · pot {hud.pot} · current bet {hud.currentBet}</span>
        <small>{hud.hint}</small>
        {hud.coach ? <small className="poker-coach-line">{hud.coach}</small> : null}
      </div>
      <div className="poker-action-panel">
        <div id="pokerTurnPrompt" className="poker-turn-prompt">{actionState.turnPrompt}</div>
        <label className="poker-raise-control">
          Raise to
          <input
            id="pokerRaiseInput"
            type="number"
            min={actionState.minRaiseTo}
            max={actionState.maxRaiseTo}
            step={actionState.raiseStep}
            disabled={!actionState.canRaise}
            value={actionState.raiseInput}
            onChange={(event) => actions.setRaiseAmount?.(event.target.value)}
          />
        </label>
        <div className="poker-action-grid">
          <button type="button" data-poker-action="call" disabled={!actionState.canCall} onClick={() => actions.submitAction?.("call")}>
            {actionState.callLabel}
          </button>
          <button type="button" data-poker-action="raise" disabled={!actionState.canRaise} onClick={() => actions.submitAction?.("raise")}>
            {actionState.raiseLabel}
          </button>
          <button type="button" data-poker-action="allin" disabled={!actionState.canAllIn} onClick={() => actions.submitAction?.("allin")}>
            All-in
          </button>
          <button type="button" data-poker-action="fold" disabled={!actionState.canFold} onClick={() => actions.submitAction?.("fold")}>
            Fold
          </button>
        </div>
        <div className="poker-quick-bets" aria-label="Quick bet sizes">
          <button type="button" data-poker-quick-bet="half" disabled={actionState.quickBetsDisabled} onClick={() => actions.applyQuickBet?.("half")}>1/2 pot</button>
          <button type="button" data-poker-quick-bet="twothirds" disabled={actionState.quickBetsDisabled} onClick={() => actions.applyQuickBet?.("twothirds")}>2/3 pot</button>
          <button type="button" data-poker-quick-bet="pot" disabled={actionState.quickBetsDisabled} onClick={() => actions.applyQuickBet?.("pot")}>Pot</button>
          <button type="button" data-poker-quick-bet="allin" disabled={actionState.quickBetsDisabled} onClick={() => actions.applyQuickBet?.("allin")}>All-in</button>
        </div>
        <div className="game-actions">
          <button
            id="nextPokerGameBtn"
            className="secondary-button compact"
            type="button"
            disabled={table.lobby?.nextHand?.disabled}
            onClick={() => actions.nextHand?.()}
          >
            {table.lobby?.nextHand?.label || "Next hand"}
          </button>
        </div>
        <div id="pokerGameFeedback" className="game-feedback">{table.feedback}</div>
      </div>
    </section>
  );
}
