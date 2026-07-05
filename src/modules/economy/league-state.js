/**
 * League state normalization + merge (state layer only; the /league page
 * consumes it through src/modules/economy/index.js).
 */

import { DEFAULT_LEAGUE_TIER, isLeagueTier } from './catalog.js';

const HISTORY_LIMIT = 52;

/** ISO-8601 week key, e.g. "2026-W27". Deterministic, UTC-anchored on local date. */
export function isoWeekKey(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);
  const safe = Number.isFinite(parsed?.getTime?.()) ? parsed : new Date();
  const target = new Date(Date.UTC(safe.getFullYear(), safe.getMonth(), safe.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + firstDayNumber) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeHistoryEntry(raw) {
  if (!raw || typeof raw !== "object" || !raw.weekKey) return null;
  return {
    weekKey: String(raw.weekKey),
    tier: isLeagueTier(raw.tier) ? raw.tier : DEFAULT_LEAGUE_TIER,
    rank: Math.max(0, Math.round(Number(raw.rank) || 0)),
    movement: ["up", "down", "stay"].includes(raw.movement) ? raw.movement : "stay"
  };
}

export function normalizeLeagueState(rawLeague = {}) {
  const raw = rawLeague && typeof rawLeague === "object" ? rawLeague : {};
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .map(normalizeHistoryEntry)
    .filter(Boolean)
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0))
    .slice(-HISTORY_LIMIT);
  return {
    tier: isLeagueTier(raw.tier) ? raw.tier : DEFAULT_LEAGUE_TIER,
    weekKey: typeof raw.weekKey === "string" ? raw.weekKey : "",
    history
  };
}

/** Cloud merge: the side with the newer ISO weekKey wins tier/weekKey; history unions by weekKey. */
export function mergeLeagueState(remoteLeague, localLeague) {
  const remote = normalizeLeagueState(remoteLeague);
  const local = normalizeLeagueState(localLeague);
  const byWeek = new Map();
  [...remote.history, ...local.history].forEach((entry) => {
    byWeek.set(entry.weekKey, entry);
  });
  const history = [...byWeek.values()]
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0))
    .slice(-HISTORY_LIMIT);
  // ISO week keys ("2026-W05") compare correctly as zero-padded strings.
  const newer = local.weekKey >= remote.weekKey ? local : remote;
  return {
    tier: newer.tier,
    weekKey: newer.weekKey,
    history
  };
}
