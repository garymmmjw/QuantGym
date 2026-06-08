export function PokerCard({ card, className = "", dealIndex, back = false }) {
  if (back || !card) {
    return (
      <span
        className={`poker-card back dealt${className ? ` ${className}` : ""}`}
        style={{ "--deal-index": dealIndex }}
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={`poker-card ${card.isRed ? "red" : "black"} dealt${className ? ` ${className}` : ""}`}
      style={{ "--deal-index": dealIndex }}
      aria-label={card.label}
    >
      <span className="poker-card-rank">{card.rank}</span>
      <span className="poker-card-suit">{card.suitSymbol}</span>
    </span>
  );
}
