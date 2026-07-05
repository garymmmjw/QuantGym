import { useState } from "react";

function bilingualCallLabel(label) {
  if (!label) return label;
  if (label.startsWith("Call")) return `跟注 ${label}`;
  if (label === "Check") return "过牌 Check";
  return label;
}

function bilingualRaiseLabel(label, amount, canRaise) {
  const zh = label === "Bet" ? "下注" : "加注";
  return canRaise && amount ? `${zh} ${label} ${amount}` : `${zh} ${label || "Raise"}`;
}

function feedbackTone(text) {
  if (!text) return "";
  if (/wins\s+\d|wins the pot/i.test(text)) return "good";
  if (/only the host|need at least|resume the room|finish the current|between hands|paused/i.test(text)) return "ok";
  return "";
}

export function PokerActionBar({ table, actions }) {
  const [activeChip, setActiveChip] = useState(null);
  const hud = table?.hud;
  const actionState = table?.actions;
  if (!hud || !actionState) return null;

  const applyChip = (size) => {
    setActiveChip(size);
    if (size === "third") {
      const pot = Number(hud.pot) || 0;
      const bigBlind = Number(actionState.raiseStep) || 0;
      const currentBet = Number(hud.currentBet) || 0;
      const potSized = Math.round(Math.max(pot, bigBlind) / 3);
      const target = currentBet > 0 ? currentBet + potSized : Math.max(bigBlind, potSized);
      const amount = Math.min(
        actionState.maxRaiseTo || target,
        Math.max(actionState.minRaiseTo || 0, target)
      );
      actions.setRaiseAmount?.(amount);
      return;
    }
    actions.applyQuickBet?.(size);
  };

  const setAmount = (value) => {
    setActiveChip(null);
    actions.setRaiseAmount?.(value);
  };

  const chipClass = (size) => (activeChip === size ? "active" : "");

  return (
    <section id="pokerActionBar" className="poker-bottom-hud">
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
        <div className="poker-action-grid">
          <button type="button" data-poker-action="fold" disabled={!actionState.canFold} onClick={() => actions.submitAction?.("fold")}>
            弃牌 Fold
          </button>
          <button type="button" data-poker-action="call" disabled={!actionState.canCall} onClick={() => actions.submitAction?.("call")}>
            {bilingualCallLabel(actionState.callLabel)}
          </button>
          <button type="button" data-poker-action="raise" disabled={!actionState.canRaise} onClick={() => actions.submitAction?.("raise")}>
            {bilingualRaiseLabel(actionState.raiseLabel, actionState.raiseInput, actionState.canRaise)}
          </button>
          <button type="button" data-poker-action="allin" disabled={!actionState.canAllIn} onClick={() => actions.submitAction?.("allin")}>
            全下 All-in
          </button>
        </div>
        <div className="qg-poker-betrow">
          <div className="poker-quick-bets" aria-label="Quick bet sizes">
            <button type="button" data-poker-quick-bet="third" className={chipClass("third")} disabled={actionState.quickBetsDisabled} onClick={() => applyChip("third")}>⅓ 底池</button>
            <button type="button" data-poker-quick-bet="half" className={chipClass("half")} disabled={actionState.quickBetsDisabled} onClick={() => applyChip("half")}>½ 底池</button>
            <button type="button" data-poker-quick-bet="twothirds" className={chipClass("twothirds")} disabled={actionState.quickBetsDisabled} onClick={() => applyChip("twothirds")}>⅔ 底池</button>
            <button type="button" data-poker-quick-bet="pot" className={chipClass("pot")} disabled={actionState.quickBetsDisabled} onClick={() => applyChip("pot")}>Pot</button>
            <button type="button" data-poker-quick-bet="allin" className={chipClass("allin")} disabled={actionState.quickBetsDisabled} onClick={() => applyChip("allin")}>All-in</button>
          </div>
          <label className="poker-raise-control">
            <span className="qg-poker-raise-label">Raise to</span>
            <input
              type="range"
              className="qg-poker-bet-range"
              aria-label="Raise amount slider"
              min={actionState.minRaiseTo}
              max={Math.max(actionState.maxRaiseTo, actionState.minRaiseTo)}
              step={actionState.raiseStep || 1}
              disabled={!actionState.canRaise}
              value={actionState.raiseInput}
              onChange={(event) => setAmount(event.target.value)}
            />
            <input
              id="pokerRaiseInput"
              type="number"
              aria-label="Raise to"
              min={actionState.minRaiseTo}
              max={actionState.maxRaiseTo}
              step={actionState.raiseStep}
              disabled={!actionState.canRaise}
              value={actionState.raiseInput}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
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
        <div id="pokerGameFeedback" className={`game-feedback ${feedbackTone(table.feedback)}`.trim()}>{table.feedback}</div>
      </div>
    </section>
  );
}
