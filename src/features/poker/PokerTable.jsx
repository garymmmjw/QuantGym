import { PokerBoard } from "./PokerBoard.jsx";
import { PokerSeatGrid } from "./PokerSeatGrid.jsx";

export function PokerTable({ table, actions }) {
  if (!table) return null;
  return (
    <section className="poker-table-panel">
      <div className="poker-table" id="pokerTable">
        <div className="poker-table-meta">
          <span id="pokerStageText">{table.stageLabel}</span>
          <span id="pokerPlayerCount">{table.playerCountLabel}</span>
        </div>
        <div id="pokerPot" className="poker-pot">{table.potLabel}</div>
        <PokerBoard board={table.board} />
        <div className="poker-table-watermark">No Limit Texas Hold&apos;em</div>
        <PokerSeatGrid
          seats={table.seats}
          onSit={actions.sitAtSeat}
          onAddBot={actions.addBotAtSeat}
          onRemove={actions.removePlayer}
        />
      </div>
    </section>
  );
}
