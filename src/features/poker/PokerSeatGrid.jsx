import { PokerCard } from "./PokerCard.jsx";

export function PokerSeatGrid({ seats = [], onSit, onAddBot, onRemove, skinOwned = false }) {
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
        /* 鲨鱼牌手皮肤 (shop cosmetic): only the local player's seats — never
           the demo bots — get the mascot entrance avatar, and only when owned. */
        const hasSkin = skinOwned && seat.type === "human";
        const className = [
          "poker-seat",
          seat.type === "human" ? "human" : "bot",
          seat.isTurn ? "active" : "",
          seat.folded ? "folded" : "",
          seat.allIn ? "all-in" : "",
          seat.eliminated ? "eliminated" : "",
          hasSkin ? "qg-poker-skin" : ""
        ].filter(Boolean).join(" ");
        return (
          <div key={seat.id} className={className}>
            {hasSkin ? (
              <img
                className="qg-poker-skin-ava"
                src="/assets/generated/playful-precision/mascot-poker.png"
                alt=""
                aria-hidden="true"
                draggable="false"
                loading="lazy"
              />
            ) : null}
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
