import {
  POKER_HAND_NAMES,
  POKER_RANKS,
  POKER_SUITS
} from '../../constants.js';
import { clampNumber } from '../../lib/number.js';
import { randomInt } from '../../lib/random.js';

export const POKER_MATRIX_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
export const POKER_POSITION_LABELS = {
  utg: "UTG",
  hj: "HJ",
  co: "CO",
  btn: "Button",
  sb: "Small Blind",
  bb: "BB vs BTN"
};

export function getPreflopStrategyForCards(cards, position = "btn") {
  const handKey = getStartingHandKey(cards);
  return handKey ? getPreflopStrategyForHand(handKey, position) : getPreflopStrategyForHand("72o", position);
}

export function getMatrixHandKey(rowIndex, colIndex) {
  const high = POKER_MATRIX_RANKS[Math.min(rowIndex, colIndex)];
  const low = POKER_MATRIX_RANKS[Math.max(rowIndex, colIndex)];
  if (rowIndex === colIndex) return `${high}${low}`;
  return `${high}${low}${colIndex > rowIndex ? "s" : "o"}`;
}

export function getStartingHandKey(cards) {
  if (!cards || cards.length < 2) return "";
  const [a, b] = [...cards].sort((left, right) => right.value - left.value);
  if (a.rank === b.rank) return `${a.rank}${b.rank}`;
  return `${a.rank}${b.rank}${a.suit === b.suit ? "s" : "o"}`;
}

export function getStartingHandScore(handKey) {
  const parsed = parseStartingHandKey(handKey);
  if (!parsed) return 0;
  const { high, low, pair, suited, gap } = parsed;
  let score = high * 4 + low * 2 - gap * 4;
  if (pair) score += 38 + high * 2.2;
  if (suited) score += 8;
  if (gap <= 1) score += 7;
  if (gap === 2) score += 3;
  if (high === 14) score += 8;
  if (suited && high === 14) score += 6;
  if (suited && high <= 9 && gap <= 1) score += 9;
  if (!suited && high < 12 && gap > 2) score -= 10;
  return clampNumber(Math.round(score), 0, 100);
}

export function getPreflopStrategyForHand(handKey, position = "btn") {
  const score = getStartingHandScore(handKey);
  const parsed = parseStartingHandKey(handKey);
  const thresholds = {
    utg: { open: 78, mix: 70 },
    hj: { open: 72, mix: 64 },
    co: { open: 64, mix: 55 },
    btn: { open: 52, mix: 42 },
    sb: { open: 58, mix: 47 },
    bb: { open: 45, mix: 34 }
  };
  const limits = thresholds[position] || thresholds.btn;
  if (position === "bb") {
    if (score >= 78) {
      return {
        tier: "raise",
        code: "3B",
        label: "3-bet or defend",
        frequency: 90,
        description: "Strong enough to 3-bet for value often; flat sometimes to keep dominated hands in."
      };
    }
    if (score >= limits.open) {
      return {
        tier: "defend",
        code: "DEF",
        label: "Defend",
        frequency: clampNumber(score, 45, 78),
        description: "Continue versus a button open. Prefer call with playable suited and connected hands."
      };
    }
    if (score >= limits.mix) {
      return {
        tier: "mix",
        code: "MIX",
        label: "Mix defend",
        frequency: 35,
        description: "Borderline defend. Continue more versus small opens or passive opponents; fold versus larger sizing."
      };
    }
    return {
      tier: "fold",
      code: "F",
      label: "Fold",
      frequency: 0,
      description: "Too weak to defend profitably at 100BB without a clear exploit."
    };
  }
  const premiumBroadway = ["AKs", "AKo", "AQs", "AQo", "AJs"].includes(handKey);
  if (score >= 84 || (parsed?.pair && parsed.high >= 11) || premiumBroadway) {
    return {
      tier: "raise",
      code: "R",
      label: "Open raise",
      frequency: 100,
      description: "Pure open at 100BB. Continue aggressively versus 3-bets depending on position and sizing."
    };
  }
  if (score >= limits.open) {
    return {
      tier: "open",
      code: "R",
      label: "Open raise",
      frequency: 85,
      description: "Profitable open in this position. Use 2.0-2.5BB sizing and keep postflop plan simple."
    };
  }
  if (score >= limits.mix) {
    return {
      tier: "mix",
      code: "MIX",
      label: "Mix open",
      frequency: 40,
      description: "Open some frequency, especially at softer tables or when blinds overfold. Otherwise fold."
    };
  }
  return {
    tier: "fold",
    code: "F",
    label: "Fold",
    frequency: 0,
    description: "Default fold in this position at 100BB. Save chips for better blockers, pairs, suited aces, and connected hands."
  };
}

export function parseStartingHandKey(handKey) {
  const text = String(handKey || "");
  if (text.length < 2) return null;
  const rankValue = (rank) => POKER_RANKS.indexOf(rank) + 2;
  const first = text[0];
  const second = text[1];
  const firstValue = rankValue(first);
  const secondValue = rankValue(second);
  if (firstValue < 2 || secondValue < 2) return null;
  const high = Math.max(firstValue, secondValue);
  const low = Math.min(firstValue, secondValue);
  return {
    high,
    low,
    pair: first === second,
    suited: text.endsWith("s"),
    offsuit: text.endsWith("o"),
    gap: Math.abs(high - low)
  };
}

export function evaluatePokerHand(cards) {
  const sorted = [...cards].filter(Boolean).sort((a, b) => b.value - a.value);
  const groups = new Map();
  sorted.forEach((card) => {
    if (!groups.has(card.value)) groups.set(card.value, []);
    groups.get(card.value).push(card);
  });
  const groupsByCount = [...groups.entries()]
    .map(([value, valueCards]) => ({ value: Number(value), cards: valueCards, count: valueCards.length }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flushCards = POKER_SUITS
    .map((suit) => sorted.filter((card) => card.suit === suit.key))
    .find((suitedCards) => suitedCards.length >= 5);
  const straightHigh = findPokerStraightHigh([...groups.keys()].map(Number));
  const straightFlushHigh = flushCards ? findPokerStraightHigh([...new Set(flushCards.map((card) => card.value))]) : 0;
  if (straightFlushHigh) return buildPokerEval(8, [straightFlushHigh], straightCards(sorted, straightFlushHigh, flushCards?.[0]?.suit));
  const quads = groupsByCount.find((group) => group.count === 4);
  if (quads) {
    const kicker = sorted.find((card) => card.value !== quads.value);
    return buildPokerEval(7, [quads.value, kicker?.value || 0], [...quads.cards, kicker].filter(Boolean));
  }
  const trips = groupsByCount.filter((group) => group.count >= 3);
  const pairs = groupsByCount.filter((group) => group.count >= 2 && group.value !== trips[0]?.value);
  if (trips.length && (pairs.length || trips.length > 1)) {
    const pairGroup = pairs[0] || trips[1];
    return buildPokerEval(6, [trips[0].value, pairGroup.value], [...trips[0].cards.slice(0, 3), ...pairGroup.cards.slice(0, 2)]);
  }
  if (flushCards) return buildPokerEval(5, flushCards.slice(0, 5).map((card) => card.value), flushCards.slice(0, 5));
  if (straightHigh) return buildPokerEval(4, [straightHigh], straightCards(sorted, straightHigh));
  if (trips.length) {
    const kickers = sorted.filter((card) => card.value !== trips[0].value).slice(0, 2);
    return buildPokerEval(3, [trips[0].value, ...kickers.map((card) => card.value)], [...trips[0].cards.slice(0, 3), ...kickers]);
  }
  const madePairs = groupsByCount.filter((group) => group.count >= 2);
  if (madePairs.length >= 2) {
    const topPairs = madePairs.slice(0, 2);
    const kicker = sorted.find((card) => !topPairs.some((pair) => pair.value === card.value));
    return buildPokerEval(2, [topPairs[0].value, topPairs[1].value, kicker?.value || 0], [...topPairs[0].cards.slice(0, 2), ...topPairs[1].cards.slice(0, 2), kicker].filter(Boolean));
  }
  if (madePairs.length === 1) {
    const kickers = sorted.filter((card) => card.value !== madePairs[0].value).slice(0, 3);
    return buildPokerEval(1, [madePairs[0].value, ...kickers.map((card) => card.value)], [...madePairs[0].cards.slice(0, 2), ...kickers]);
  }
  return buildPokerEval(0, sorted.slice(0, 5).map((card) => card.value), sorted.slice(0, 5));
}

export function buildPokerEval(rank, tiebreakers, cards) {
  return {
    rank,
    name: POKER_HAND_NAMES[rank] || "Hand",
    tiebreakers,
    cards: cards.filter(Boolean).slice(0, 5)
  };
}

export function comparePokerHands(a, b) {
  if ((a?.rank || 0) !== (b?.rank || 0)) return (a?.rank || 0) - (b?.rank || 0);
  const left = a?.tiebreakers || [];
  const right = b?.tiebreakers || [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

export function findPokerStraightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const run = unique.slice(index, index + 5);
    if (run.every((value, runIndex) => runIndex === 0 || value === run[runIndex - 1] - 1)) return run[0] === 1 ? 5 : run[0];
  }
  return 0;
}

export function straightCards(cards, high, suit = "") {
  const values = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  return values.map((value) => cards.find((card) => card.value === value && (!suit || card.suit === suit))).filter(Boolean);
}

export function createPokerDeck() {
  return POKER_SUITS.flatMap((suit) => POKER_RANKS.map((rank, index) => ({
    rank,
    value: index + 2,
    suit: suit.key,
    suitSymbol: suit.symbol,
    id: `${rank}${suit.key}`
  })));
}

export function shufflePokerDeck(deck) {
  const cards = [...deck];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

export function drawPokerCard(game) {
  return game.deck.pop();
}

export function dealPokerHoleCards(game) {
  for (let round = 0; round < 2; round += 1) {
    game.players.forEach((player) => {
      if (player.inHand) player.cards.push(drawPokerCard(game));
    });
  }
}
