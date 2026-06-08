import { PokerCard } from "./PokerCard.jsx";

export function PokerBoard({ board = [] }) {
  return (
    <div id="pokerBoard" className="poker-board" aria-label="Community cards">
      {board.map((card, index) => (
        card
          ? <PokerCard key={`board-${index}`} card={card} dealIndex={index + 2} />
          : <span key={`board-empty-${index}`} className="poker-card empty" />
      ))}
    </div>
  );
}
