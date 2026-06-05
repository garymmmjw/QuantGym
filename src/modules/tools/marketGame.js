import { escapeHtml } from '../../lib/text.js';
import { randomChoice, randomInt } from '../../lib/random.js';

export function makeMarketGameRound(options = {}) {
  const fairValue = options.fairValue ?? randomInt(82, 118);
  const volatility = options.volatility ?? randomChoice([1.5, 2, 2.5, 3.5, 4]);
  const news = options.news || randomChoice(["thin book", "fast tape", "wide client flow", "quiet auction", "late imbalance"]);
  return {
    id: options.id || "",
    fairValue,
    volatility,
    news,
    score: Number(options.previousScore || 0),
    quoted: false,
    feedback: ""
  };
}

export function scoreMarketQuote(game, bid, ask, options = {}) {
  if (!game) return { changed: false };
  if (game.quoted) {
    game.feedback = "Round already scored. Start a new market.";
    return { changed: true, scored: false, alreadyQuoted: true };
  }
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid >= ask) {
    game.feedback = "Bid must be below ask.";
    return { changed: true, scored: false, invalid: true };
  }
  const formatNumber = options.formatNumber || ((value) => String(value));
  const fair = game.fairValue;
  const mid = (bid + ask) / 2;
  const width = ask - bid;
  const centerPenalty = Math.abs(mid - fair) * 2.2;
  const widthPenalty = Math.max(0, width - game.volatility * 2.2);
  const score = Math.round(20 - centerPenalty - widthPenalty + Math.max(0, game.volatility * 2 - width));
  game.score = Number(game.score || 0) + score;
  game.quoted = true;
  game.feedback = `Round ${score >= 0 ? "+" : ""}${score}. Mid ${formatNumber(mid)}, width ${formatNumber(width)}, fair ${fair}.`;
  return {
    changed: true,
    scored: true,
    score,
    bid,
    ask,
    fair,
    detail: `Market making quote ${bid}/${ask}; fair ${fair}`
  };
}

export function renderMarketGameView(els = {}, game = null) {
  if (!game || !els.marketGamePrompt) return;
  if (els.marketGameScore) els.marketGameScore.textContent = String(Math.round(game.score || 0));
  els.marketGamePrompt.innerHTML = `
    <span>Indicative fair: <b>${escapeHtml(String(game.fairValue))}</b></span>
    <span>Vol: ${escapeHtml(String(game.volatility))} · ${escapeHtml(game.news)}</span>
    <small>Quote a two-sided market. Tight and centered quotes score best; crossed markets are rejected.</small>
  `;
  if (els.marketBidInput && !game.quoted) els.marketBidInput.value = String(Math.round(game.fairValue - game.volatility));
  if (els.marketAskInput && !game.quoted) els.marketAskInput.value = String(Math.round(game.fairValue + game.volatility));
  if (els.marketGameFeedback) els.marketGameFeedback.textContent = game.feedback || "";
}
