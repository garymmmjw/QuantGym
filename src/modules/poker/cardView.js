export function isRedCard(card) {
  return card?.suit === "h" || card?.suit === "d";
}

export function cardLabel(card) {
  if (!card) return "";
  return `${card.rank}${card.suitSymbol || card.suit}`;
}

export function formatCardView(card) {
  if (!card) return null;
  const rank = card.rank === "T" ? "10" : card.rank;
  return {
    rank,
    suit: card.suit,
    suitSymbol: card.suitSymbol,
    isRed: isRedCard(card),
    label: cardLabel(card)
  };
}

export function formatBoardCards(board = [], slots = 5) {
  const cards = [...board];
  while (cards.length < slots) cards.push(null);
  return cards.map((card) => formatCardView(card));
}
