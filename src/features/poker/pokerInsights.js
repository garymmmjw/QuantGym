import {
  POKER_POSITION_LABELS,
  comparePokerHands,
  createPokerDeck,
  evaluatePokerHand,
  getPreflopStrategyForHand,
  getStartingHandKey
} from "../../modules/poker/engine.js";

const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

const HAND_NAMES_ZH = ["高牌", "一对", "两对", "三条", "顺子", "同花", "葫芦", "四条", "同花顺"];

const VALUE_NAMES = {
  14: "Aces",
  13: "Kings",
  12: "Queens",
  11: "Jacks",
  10: "Tens",
  9: "Nines",
  8: "Eights",
  7: "Sevens",
  6: "Sixes",
  5: "Fives",
  4: "Fours",
  3: "Threes",
  2: "Twos"
};

function toRawCard(view) {
  if (!view || !view.rank || !view.suit) return null;
  const rank = view.rank === "10" ? "T" : view.rank;
  const value = RANK_ORDER.indexOf(rank) + 2;
  if (value < 2) return null;
  return { rank, value, suit: view.suit };
}

export function getHeroCardViews(table) {
  const heroSeat = (table?.seats || []).find((seat) => !seat.empty && seat.isHero);
  if (!heroSeat) return [];
  return (heroSeat.holeCards || [])
    .filter((hole) => hole.revealed && hole.card)
    .map((hole) => hole.card);
}

export function getBoardCardViews(table) {
  return (table?.board || []).filter(Boolean);
}

/* --- Equity (Monte Carlo vs random opponent ranges, cached per hand state) --- */
let equityCache = { key: "", value: null };

export function estimateHeroEquity(heroViews, boardViews, opponentCount) {
  const hero = (heroViews || []).map(toRawCard).filter(Boolean);
  if (hero.length < 2) return null;
  const board = (boardViews || []).map(toRawCard).filter(Boolean);
  const opponents = Math.min(Math.max(Number(opponentCount) || 1, 1), 8);
  const key = `${hero.map((c) => c.rank + c.suit).join("")}|${board.map((c) => c.rank + c.suit).join("")}|${opponents}`;
  if (equityCache.key === key) return equityCache.value;

  const known = new Set([...hero, ...board].map((card) => card.rank + card.suit));
  const deck = createPokerDeck().filter((card) => !known.has(card.rank + card.suit));
  const need = opponents * 2 + (5 - board.length);
  const trials = 160;
  let score = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const pool = [...deck];
    for (let index = 0; index < need; index += 1) {
      const swap = index + Math.floor(Math.random() * (pool.length - index));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    const drawn = pool.slice(0, need);
    const fullBoard = [...board, ...drawn.slice(opponents * 2)];
    const heroEval = evaluatePokerHand([...hero, ...fullBoard]);
    let lost = false;
    let ties = 1;
    for (let opp = 0; opp < opponents; opp += 1) {
      const villEval = evaluatePokerHand([drawn[opp * 2], drawn[opp * 2 + 1], ...fullBoard]);
      const cmp = comparePokerHands(heroEval, villEval);
      if (cmp < 0) { lost = true; break; }
      if (cmp === 0) ties += 1;
    }
    if (!lost) score += 1 / ties;
  }
  const value = Math.round((score / trials) * 100);
  equityCache = { key, value };
  return value;
}

export function getPotOdds(pot, toCall) {
  const call = Number(toCall) || 0;
  const potSize = Number(pot) || 0;
  if (call <= 0) return null;
  return Math.round((call / (potSize + call)) * 100);
}

/* --- Hero made-hand description + strength bucket --- */
export function getHeroHandInsight(heroViews, boardViews) {
  const hero = (heroViews || []).map(toRawCard).filter(Boolean);
  if (hero.length < 2) return null;
  const board = (boardViews || []).map(toRawCard).filter(Boolean);
  const result = evaluatePokerHand([...hero, ...board]);
  if (!result) return null;
  const zh = HAND_NAMES_ZH[result.rank] || "高牌";
  const tie = result.tiebreakers || [];
  let detail = result.name || "";
  if (result.rank === 2 && tie.length >= 2) {
    detail = `${VALUE_NAMES[tie[0]] || ""} & ${VALUE_NAMES[tie[1]] || ""}`;
  } else if ([1, 3, 7].includes(result.rank) && tie.length >= 1) {
    detail = VALUE_NAMES[tie[0]] || detail;
  } else if (result.rank === 6 && tie.length >= 2) {
    detail = `${VALUE_NAMES[tie[0]] || ""} full of ${VALUE_NAMES[tie[1]] || ""}`;
  } else if (result.rank === 0 && tie.length >= 1) {
    detail = `${(VALUE_NAMES[tie[0]] || "").replace(/s$/, "")} high`;
  }
  const strength = result.rank >= 4 ? "极强" : result.rank >= 2 ? "强" : result.rank === 1 ? "中" : "弱";
  return {
    label: `${zh} · ${detail}`.trim(),
    strength,
    rank: result.rank
  };
}

/* --- GTO coach card: real preflop-catalog strategy for the hero hand
       (falls back to the solver panel's selected hand) --- */
export function getCoachModel(preflop, heroViews) {
  const heroRaw = (heroViews || []).map(toRawCard).filter(Boolean);
  const liveKey = heroRaw.length === 2 ? getStartingHandKey(heroRaw) : "";
  const handKey = liveKey || preflop?.selectedHand || "AKs";
  const position = preflop?.position || "btn";
  const strategy = getPreflopStrategyForHand(handKey, position) || {};
  const raise = ["raise", "open", "mix"].includes(strategy.tier) ? (strategy.frequency || 0) : 0;
  const call = strategy.tier === "defend" ? (strategy.frequency || 0) : 0;
  const fold = Math.max(0, 100 - raise - call);
  const primary = raise >= call && raise >= fold ? "raise" : call >= fold ? "call" : "fold";
  return {
    handKey,
    positionLabel: POKER_POSITION_LABELS[position] || position.toUpperCase(),
    label: strategy.label || "",
    description: strategy.description || "",
    fold,
    call,
    raise,
    primary
  };
}
