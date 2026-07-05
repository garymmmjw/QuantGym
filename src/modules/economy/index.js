/**
 * QuantGym economy — 训练币 / 连胜冻结卡 / 奖励商店 / 联赛段位.
 *
 * API CONTRACT (implemented). Consumers (league page, shop UI, cosmetics
 * surfaces, feedback layer) must only use this surface. All state lives
 * inside the per-user userState value under `economy` (plus top-level
 * `bonusXp`) and is normalized by `normalizeEconomy` from normalizeState.
 *
 * State shape (persisted, cloud-synced with the rest of userState):
 *   economy: {
 *     coins: number,                    // 训练币 balance
 *     coinsGrantedForLegacyXp: boolean, // one-time migration marker
 *     freezeCards: number,              // stackable streak-freeze cards
 *     frozenDays: string[],             // ISO dates bridged by freeze cards
 *     owned: { [itemId]: true },        // one-time shop cosmetics
 *     league: {
 *       tier: "intern" | "analyst" | "trader" | "pm",
 *       weekKey: string,                // ISO week the standings refer to
 *       history: Array<{ weekKey, tier, rank, movement }>
 *     }
 *   }
 *
 * Earning rule (from design qg-state.js): coins += max(1, round(xpGain / 2))
 * applied on every REAL XP write. Daily all-clear bonus: +50 XP (real,
 * tracked in state.bonusXp so it does not pollute the skill radar).
 *
 * Cloud merge strategy (see mergeCloudState in src/state/data.js):
 * coins/freezeCards/bonusXp take max, owned/frozenDays union, league picks
 * the newer weekKey side.
 */

import { getTotalXp, normalizeSkills } from '../skills/data.js';
import {
  awardCoinsForXp as awardCoinsForXpImpl,
  coinsForXp as coinsForXpImpl,
  ensureEconomy,
  normalizeBonusXp,
  normalizeBonusXpLog,
  normalizeEconomy as normalizeEconomyImpl,
  normalizeEconomySlice,
  normalizeFrozenDays,
  purchaseShopItem as purchaseShopItemImpl
} from './coins.js';
import { applyStreakFreeze as applyStreakFreezeImpl } from './freeze.js';
import { isoWeekKey, mergeLeagueState, normalizeLeagueState } from './league-state.js';

export { SHOP_ITEMS, LEAGUE_TIERS, DEFAULT_LEAGUE_TIER, getShopItem } from './catalog.js';
export {
  ensureEconomy,
  normalizeBonusXp,
  normalizeEconomySlice,
  normalizeFrozenDays,
  isoWeekKey,
  normalizeLeagueState,
  mergeLeagueState
};

/** Normalize/migrate the economy slice of a raw userState value. */
export function normalizeEconomy(rawState = {}) {
  return normalizeEconomyImpl(rawState);
}

/** Coins earned for an XP gain (design rule). Pure. */
export function coinsForXp(xpGain = 0) {
  return coinsForXpImpl(xpGain);
}

/** Award coins alongside a real XP write. Mutates state.economy, returns coins granted. */
export function awardCoinsForXp(state, xpGain, meta = {}) {
  return awardCoinsForXpImpl(state, xpGain, meta);
}

/** Spend coins on a shop item. Returns { ok, reason?, state fields changed }. */
export function purchaseShopItem(state, itemId) {
  return purchaseShopItemImpl(state, itemId);
}

/** True when the user owns a one-time cosmetic. */
export function isItemOwned(state, itemId) {
  return Boolean(state?.economy?.owned?.[itemId]);
}

/** Consume freeze cards to bridge missed days; called on first activity of a day. */
export function applyStreakFreeze(state, deps = {}) {
  return applyStreakFreezeImpl(state, deps);
}

/** Total XP including bonus XP (level/league surfaces must use this). */
export function getEffectiveTotalXp(state, deps = {}) {
  const baseXp = typeof deps.getTotalXp === "function"
    ? Math.max(0, Number(deps.getTotalXp(state) || 0))
    : getTotalXp(normalizeSkills(state?.skills || {}));
  return baseXp + normalizeBonusXp(state?.bonusXp);
}

/**
 * Cloud merge for the economy slice.
 * - coins / freezeCards are SPENDABLE balances → last-writer-wins by updatedAt
 *   (a spend must survive a merge with a stale snapshot; `max` would silently
 *   refund spent balances and let cosmetics be bought for free across devices).
 *   Falls back to `max` only when neither timestamp is provided.
 * - owned / frozenDays are monotonic (only ever grow) → union.
 * - bonusXp / bonusXpLog only grow → max / union. league → newer weekKey.
 */
export function mergeEconomy(remoteEconomy, localEconomy, options = {}) {
  const remote = normalizeEconomySlice(remoteEconomy);
  const local = normalizeEconomySlice(localEconomy);
  const { remoteUpdatedAt, localUpdatedAt } = options;
  const hasStamps = Boolean(remoteUpdatedAt) || Boolean(localUpdatedAt);
  // Tie or missing one side → prefer local (the device performing the merge).
  const localIsNewer = String(localUpdatedAt || "") >= String(remoteUpdatedAt || "");
  const newer = localIsNewer ? local : remote;
  return {
    coins: hasStamps ? newer.coins : Math.max(remote.coins, local.coins),
    coinsGrantedForLegacyXp: remote.coinsGrantedForLegacyXp || local.coinsGrantedForLegacyXp,
    freezeCards: hasStamps ? newer.freezeCards : Math.max(remote.freezeCards, local.freezeCards),
    frozenDays: normalizeFrozenDays([...remote.frozenDays, ...local.frozenDays]),
    owned: { ...remote.owned, ...local.owned },
    league: mergeLeagueState(remote.league, local.league),
    bonusXpLog: normalizeBonusXpLog([...(remote.bonusXpLog || []), ...(local.bonusXpLog || [])])
  };
}
