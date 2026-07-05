/**
 * Training-coin core: normalization/migration, earning (tied to real XP
 * writes) and the reward-shop purchase flow. Entry point: ../economy/index.js.
 */

import { dayKey } from '../../lib/date.js';
import { getTotalXp, normalizeSkills } from '../skills/data.js';
import { SHOP_ITEMS, getShopItem } from './catalog.js';
import { normalizeLeagueState } from './league-state.js';

const FROZEN_DAYS_LIMIT = 400;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampCount(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function normalizeBonusXp(value) {
  return clampCount(value);
}

export function normalizeFrozenDays(rawDays) {
  const keys = (Array.isArray(rawDays) ? rawDays : [])
    .map((value) => (typeof value === "string" && DAY_KEY_RE.test(value) ? value : dayKey(value)))
    .filter((key) => DAY_KEY_RE.test(key));
  return [...new Set(keys)].sort().slice(-FROZEN_DAYS_LIMIT);
}

function normalizeOwned(rawOwned) {
  const raw = rawOwned && typeof rawOwned === "object" ? rawOwned : {};
  const owned = {};
  SHOP_ITEMS.forEach((item) => {
    if (!item.stackable && raw[item.id]) owned[item.id] = true;
  });
  return owned;
}

/** Slice-level normalization (no migration side effects). */
export function normalizeEconomySlice(rawEconomy = {}) {
  const raw = rawEconomy && typeof rawEconomy === "object" ? rawEconomy : {};
  return {
    coins: clampCount(raw.coins),
    coinsGrantedForLegacyXp: Boolean(raw.coinsGrantedForLegacyXp),
    freezeCards: clampCount(raw.freezeCards),
    frozenDays: normalizeFrozenDays(raw.frozenDays),
    owned: normalizeOwned(raw.owned),
    league: normalizeLeagueState(raw.league),
    bonusXpLog: normalizeBonusXpLog(raw.bonusXpLog)
  };
}

/** Dated daily-bonus log entries: [{ date: ISO, xp: number }], deduped by day, capped. */
export function normalizeBonusXpLog(rawLog) {
  if (!Array.isArray(rawLog)) return [];
  const byDay = new Map();
  rawLog.forEach((item) => {
    const date = typeof item === "string" ? item : item?.date;
    const xp = typeof item === "string" ? 50 : Number(item?.xp || 0);
    if (!date || !Number.isFinite(xp) || xp <= 0) return;
    const day = String(date).slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { date: String(date), xp });
  });
  return [...byDay.values()].slice(-120);
}

/**
 * Normalize/migrate the economy slice of a raw userState value.
 * One-time legacy grant: users with pre-economy XP get coins = round(totalXp/2),
 * marked with `coinsGrantedForLegacyXp` so it never re-runs.
 */
export function normalizeEconomy(rawState = {}) {
  const economy = normalizeEconomySlice(rawState?.economy);
  if (!economy.coinsGrantedForLegacyXp) {
    const legacyCoins = Math.round(getTotalXp(normalizeSkills(rawState?.skills || {})) / 2);
    economy.coins = Math.max(economy.coins, clampCount(legacyCoins));
    economy.coinsGrantedForLegacyXp = true;
  }
  return economy;
}

/** Mutating accessor: guarantees state.economy exists (no legacy grant here — that is normalize-time). */
export function ensureEconomy(state) {
  if (!state.economy || typeof state.economy !== "object" || Array.isArray(state.economy)) {
    state.economy = normalizeEconomySlice({});
  } else {
    if (!Number.isFinite(Number(state.economy.coins))) state.economy.coins = 0;
    if (!Number.isFinite(Number(state.economy.freezeCards))) state.economy.freezeCards = 0;
    if (!Array.isArray(state.economy.frozenDays)) state.economy.frozenDays = [];
    if (!state.economy.owned || typeof state.economy.owned !== "object") state.economy.owned = {};
    if (!state.economy.league || typeof state.economy.league !== "object") {
      state.economy.league = normalizeLeagueState({});
    }
  }
  return state.economy;
}

/** Coins earned for an XP gain (design rule). Pure. */
export function coinsForXp(xpGain = 0) {
  return xpGain > 0 ? Math.max(1, Math.round(xpGain / 2)) : 0;
}

/** Award coins alongside a real XP write. Mutates state.economy, returns coins granted. */
export function awardCoinsForXp(state, xpGain, meta = {}) {
  if (!state || typeof state !== "object") return 0;
  const granted = coinsForXp(Number(xpGain) || 0);
  if (granted <= 0) return 0;
  const economy = ensureEconomy(state);
  economy.coins = clampCount(economy.coins) + granted;
  if (meta && typeof meta === "object" && meta.onGrant) meta.onGrant(granted, economy.coins);
  return granted;
}

/**
 * Spend coins on a shop item.
 * Returns { ok:true, item, coins, freezeCards, owned } on success, or
 * { ok:false, reason: "unknown-item" | "already-owned" | "insufficient-coins", missingCoins? }.
 */
export function purchaseShopItem(state, itemId) {
  if (!state || typeof state !== "object") return { ok: false, reason: "invalid-state" };
  const item = getShopItem(itemId);
  if (!item) return { ok: false, reason: "unknown-item" };
  const economy = ensureEconomy(state);
  if (!item.stackable && economy.owned[item.id]) {
    return { ok: false, reason: "already-owned", item };
  }
  const coins = clampCount(economy.coins);
  if (coins < item.price) {
    return { ok: false, reason: "insufficient-coins", item, missingCoins: item.price - coins };
  }
  economy.coins = coins - item.price;
  if (item.stackable) {
    economy.freezeCards = clampCount(economy.freezeCards) + 1;
  } else {
    economy.owned = { ...economy.owned, [item.id]: true };
  }
  return {
    ok: true,
    item,
    coins: economy.coins,
    freezeCards: economy.freezeCards,
    owned: economy.owned
  };
}
