import { dayKey } from "../lib/date.js";

export function hasCheckedInOnDate(checkIns = [], date = new Date()) {
  const target = dayKey(date);
  return (Array.isArray(checkIns) ? checkIns : []).some((item) => dayKey(item.date) === target);
}

export function markActivityCheckIn(state = {}, options = {}) {
  const {
    enabled = true,
    displayedStreak = 0,
    getStreak = () => Number(state.streakCount || 0),
    now = new Date()
  } = options;
  if (!enabled || hasCheckedInOnDate(state.checkIns, now)) return null;
  const previousStreak = Number(displayedStreak);
  const previous = Number.isFinite(previousStreak) ? previousStreak : getStreak();
  const today = dayKey(now);
  const nextCheckIns = (Array.isArray(state.checkIns) ? state.checkIns : []).filter((item) => dayKey(item.date) !== today);
  state.checkIns = [
    ...nextCheckIns,
    {
      id: `checkin-${today}`,
      date: now.toISOString(),
      source: "activity"
    }
  ];
  state.streakCount = getStreak();
  return { previous, next: state.streakCount, day: today };
}
