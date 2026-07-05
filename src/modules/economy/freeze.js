/**
 * Streak-freeze cards: bridge missed days on the first activity of a day.
 * Rule (economy design §3): if N days are missing between the last activity
 * and today and freezeCards >= N, consume N cards and record the missing
 * dates in economy.frozenDays (honest calendar marking). If the cards are
 * not enough, the streak resets normally and nothing is consumed.
 */

import { dayKey, dateOrNull } from '../../lib/date.js';
import { ensureEconomy, normalizeFrozenDays } from './coins.js';

function dayKeyToDate(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function diffInDays(fromKey, toKey) {
  return Math.round((dayKeyToDate(toKey) - dayKeyToDate(fromKey)) / 86400000);
}

function collectActivityDayKeys(state = {}) {
  const days = new Set();
  (Array.isArray(state.entries) ? state.entries : []).forEach((entry) => {
    const key = dayKey(entry?.date);
    if (key) days.add(key);
  });
  (Array.isArray(state.checkIns) ? state.checkIns : []).forEach((item) => {
    const key = dayKey(item?.date);
    if (key) days.add(key);
  });
  (Array.isArray(state.economy?.frozenDays) ? state.economy.frozenDays : []).forEach((item) => {
    const key = dayKey(item);
    if (key) days.add(key);
  });
  return days;
}

function streakEndingAt(days, endKey) {
  let streak = 0;
  const cursor = dayKeyToDate(endKey);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const NO_GAP = Object.freeze({ applied: false, broken: false, usedCards: 0, missedDays: 0, bridgedDays: [] });

/**
 * Consume freeze cards to bridge missed days; call on the first activity of a day
 * BEFORE writing today's check-in. Mutates state.economy on success.
 *
 * Returns:
 *   { applied: true,  usedCards: N, bridgedDays: [...], freezeCardsLeft, priorStreak }
 *   { applied: false, broken: true, missedDays: N, streakLost, priorStreak } — cards insufficient
 *   { applied: false, broken: false, missedDays: 0 } — no gap to bridge
 */
export function applyStreakFreeze(state, deps = {}) {
  if (!state || typeof state !== "object") return { ...NO_GAP };
  const now = deps.now instanceof Date ? deps.now : dateOrNull(deps.now) || new Date();
  const todayKey = dayKey(now);
  const days = collectActivityDayKeys(state);
  // Note: today's entry may already be in state.entries when this runs (the
  // XP write happens before the check-in). Only days strictly BEFORE today
  // matter for the gap; once bridged, frozenDays make re-runs a no-op.

  let lastKey = "";
  days.forEach((key) => {
    if (key < todayKey && key > lastKey) lastKey = key;
  });
  if (!lastKey) return { ...NO_GAP };

  const missedDays = diffInDays(lastKey, todayKey) - 1;
  if (missedDays <= 0) return { ...NO_GAP };

  const priorStreak = streakEndingAt(days, lastKey);
  const economy = ensureEconomy(state);
  const freezeCards = Math.max(0, Math.round(Number(economy.freezeCards) || 0));

  if (freezeCards < missedDays) {
    return {
      applied: false,
      broken: true,
      usedCards: 0,
      missedDays,
      bridgedDays: [],
      priorStreak,
      streakLost: priorStreak
    };
  }

  const bridgedDays = [];
  const cursor = dayKeyToDate(lastKey);
  for (let index = 0; index < missedDays; index += 1) {
    cursor.setDate(cursor.getDate() + 1);
    bridgedDays.push(dayKey(cursor));
  }
  economy.freezeCards = freezeCards - missedDays;
  economy.frozenDays = normalizeFrozenDays([...economy.frozenDays, ...bridgedDays]);

  return {
    applied: true,
    broken: false,
    usedCards: missedDays,
    missedDays,
    bridgedDays,
    freezeCardsLeft: economy.freezeCards,
    priorStreak
  };
}
