import { PokerCard } from "./PokerCard.jsx";

export function PokerSeatGrid({ seats = [], onSit, onAddBot, onRemove }) {
  return (
    <div id="pokerSeatGrid" className="poker-seat-grid">
      {seats.map((seat) => {
        if (seat.empty) {
          return (
            <div key={`seat-${seat.seatIndex}`} className="poker-seat empty">
              <span className="poker-seat-number">{seat.seatNumber}</span>
              <div className="poker-seat-top">
                <strong>SIT</strong>
                <span>Open seat</span>
              </div>
              <div className="poker-empty-seat-actions">
                <button type="button" disabled={!seat.canSit} onClick={() => onSit?.(seat.seatIndex)}>SIT</button>
                <button type="button" disabled={!seat.canBot} onClick={() => onAddBot?.(seat.seatIndex)}>DEMO</button>
              </div>
              <small>{seat.hint}</small>
            </div>
          );
        }
        const className = [
          "poker-seat",
          seat.type === "human" ? "human" : "bot",
          seat.isTurn ? "active" : "",
          seat.folded ? "folded" : "",
          seat.allIn ? "all-in" : "",
          seat.eliminated ? "eliminated" : ""
        ].filter(Boolean).join(" ");
        return (
          <div key={seat.id} className={className}>
            <div className="poker-seat-top">
              <strong>{seat.name}</strong>
              <span>{seat.badges.length ? seat.badges.join(" · ") : (seat.type === "human" ? "Player" : "Demo")}</span>
            </div>
            <div className="poker-hole-cards">
              {seat.holeCards.map((hole, index) => (
                <PokerCard
                  key={`${seat.id}-card-${index}`}
                  card={hole.revealed ? hole.card : null}
                  back={!hole.revealed}
                  dealIndex={hole.dealIndex}
                />
              ))}
            </div>
            <div className="poker-seat-stack">
              <span>{seat.stack}</span>
              <span>Bet {seat.currentBet}</span>
            </div>
            <small>{seat.lastAction}</small>
            {seat.canRemove ? (
              <button type="button" onClick={() => onRemove?.(seat.id)}>Remove</button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
