import { PokerActionBar } from "./PokerActionBar.jsx";
import { PokerLobbyPanel } from "./PokerLobbyPanel.jsx";
import { PokerPreflopMatrix } from "./PokerPreflopMatrix.jsx";
import { PokerTable } from "./PokerTable.jsx";
import { PokerTournamentStrip } from "./PokerTournamentStrip.jsx";
import { usePokerPageModel } from "./pokerHooks.js";

export function PokerPageContent() {
  const model = usePokerPageModel();
  const game = model.view.game;

  return (
    <section className="poker-room-section">
      <div className="poker-now-shell">
        <div className="poker-now-brand">POKER <span>GYM</span></div>
        <div className="poker-now-room-meta">
          <small>OWNER: GARY</small>
          <strong>NLH ~ <span id="pokerBlindText">{game?.blindsText || "10 / 20"}</span></strong>
          <em id="pokerRoomCode">{game?.roomCode || "QG"}</em>
          <button id="pokerLeaveTableBtn" className="poker-leave-table-button" type="button" onClick={() => model.openModule("tools")}>
            <i data-lucide="log-out" />
            <span>Leave table</span>
          </button>
        </div>

        <PokerTournamentStrip tournament={game?.table?.tournament} />

        <aside className="poker-side-rail left" aria-label="Poker table options">
          <button type="button" title="Options" aria-label="Options"><i data-lucide="menu" /><span>OPTIONS</span></button>
          <button type="button" title="Leave table" aria-label="Leave table" onClick={() => model.openModule("tools")}>
            <i data-lucide="log-out" /><span>LEAVE TABLE</span>
          </button>
          <button type="button" title="Away" aria-label="Away"><i data-lucide="person-standing" /></button>
        </aside>

        <aside className="poker-side-rail right" aria-label="Poker table media controls">
          <button type="button" title="Sound" aria-label="Sound"><i data-lucide="volume-2" /></button>
          <button type="button" title="Pause" aria-label="Pause" onClick={() => model.actions.pauseGame?.()}><i data-lucide="pause" /></button>
          <button type="button" title="Stop" aria-label="Stop"><i data-lucide="square" /></button>
          <button className="poker-side-burst" type="button" title="Table energy" aria-label="Table energy"><i data-lucide="sparkles" /></button>
        </aside>

        <PokerTable table={game?.table} actions={model.actions} />
        <PokerLobbyPanel game={game} actions={model.actions} />
        <PokerActionBar table={game?.table} actions={model.actions} />
      </div>

      <PokerPreflopMatrix
        position={model.view.preflop?.position}
        selectedHand={model.view.preflop?.selectedHand}
        onPositionChange={model.actions.setPreflopPosition}
        onHandSelect={model.actions.setPreflopHand}
      />
    </section>
  );
}
